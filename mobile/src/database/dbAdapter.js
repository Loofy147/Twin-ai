// mobile/src/database/dbAdapter.js
// Universal adapter for React Native and Node.js with production optimizations

const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

// ENHANCED: Database Configuration
const DB_CONFIG = {
  name: 'twin-ai.db',
  location: 'default',
  // Enable WAL mode for better concurrency
  createFromLocation: '~twin-ai.db',
  // Encryption for production
  key: process.env.DB_ENCRYPTION_KEY || null
};

// ENHANCED: Connection Pool for Node.js
class ConnectionPool {
  constructor(maxConnections = 5) {
    this.maxConnections = maxConnections;
    this.connections = [];
    this.available = [];
    this.waiting = [];
  }

  async getConnection() {
    if (this.available.length > 0) {
      return this.available.pop();
    }

    if (this.connections.length < this.maxConnections) {
      const conn = this.createConnection();
      this.connections.push(conn);
      return conn;
    }

    // Wait for available connection
    return new Promise(resolve => {
      this.waiting.push(resolve);
    });
  }

  releaseConnection(conn) {
    const nextWaiting = this.waiting.shift();
    if (nextWaiting) {
      nextWaiting(conn);
    } else {
      this.available.push(conn);
    }
  }

  createConnection() {
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(__dirname, 'twin-ai.db');

    const db = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : null
    });

    // ENHANCED: Enable optimizations
    db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    db.pragma('synchronous = NORMAL'); // Balance safety and performance
    db.pragma('cache_size = 10000'); // 10MB cache
    db.pragma('temp_store = MEMORY'); // Store temp tables in memory
    db.pragma('mmap_size = 2147483648'); // 2GB memory-mapped I/O
    db.pragma('page_size = 4096'); // Optimal page size

    return db;
  }

  close() {
    this.connections.forEach(conn => conn.close());
    this.connections = [];
    this.available = [];
  }
}

// ENHANCED: Query Logger
class QueryLogger {
  constructor(enabled = process.env.NODE_ENV === 'development') {
    this.enabled = enabled;
    this.queries = [];
    this.slowQueryThreshold = 100; // ms
  }

  log(query, duration, params = []) {
    if (!this.enabled) return;

    const entry = {
      query,
      duration,
      params,
      timestamp: new Date().toISOString(),
      slow: duration > this.slowQueryThreshold
    };

    this.queries.push(entry);

    // Keep only last 1000 queries
    if (this.queries.length > 1000) {
      this.queries.shift();
    }

    if (entry.slow) {
      console.warn(`[SLOW QUERY] ${duration}ms: ${query.substring(0, 100)}...`);
    }
  }

  getStats() {
    if (this.queries.length === 0) return null;

    const durations = this.queries.map(q => q.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const slowQueries = this.queries.filter(q => q.slow).length;

    return {
      total: this.queries.length,
      avgDuration: Math.round(avg),
      slowQueries,
      slowPercentage: ((slowQueries / this.queries.length) * 100).toFixed(2)
    };
  }

  clear() {
    this.queries = [];
  }
}

// ENHANCED: Database Wrapper with Retry Logic
class DatabaseWrapper {
  constructor(db) {
    this.db = db;
    this.logger = new QueryLogger();
    this.maxRetries = 3;
    this.retryDelay = 100; // ms
  }

  executeWithRetry(operation, operationName) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = operation();
        const duration = Date.now() - startTime;

        this.logger.log(operationName, duration);
        return result;
      } catch (error) {
        lastError = error;

        // Don't retry on certain errors
        if (error.code === 'SQLITE_CONSTRAINT' || error.code === 'SQLITE_MISMATCH') {
          throw error;
        }

        if (attempt < this.maxRetries) {
          console.warn(`[DB] Retry ${attempt}/${this.maxRetries} for ${operationName}:`, error.message);
          // BOLT: For better-sqlite3 (synchronous), we skip the async delay to maintain
          // transaction integrity.
        }
      }
    }

    console.error(`[DB] All retries failed for ${operationName}:`, lastError);
    throw lastError;
  }

  prepare(sql) {
    const stmt = this.db.prepare(sql);

    return {
      run: (...params) => this.executeWithRetry(
        () => stmt.run(...params),
        `run: ${sql.substring(0, 50)}...`
      ),
      get: (...params) => this.executeWithRetry(
        () => stmt.get(...params),
        `get: ${sql.substring(0, 50)}...`
      ),
      all: (...params) => this.executeWithRetry(
        () => stmt.all(...params),
        `all: ${sql.substring(0, 50)}...`
      )
    };
  }

  transaction(fn) {
    return (...args) => {
      return this.executeWithRetry(
        () => {
          const transaction = this.db.transaction(fn);
          return transaction(...args);
        },
        'transaction'
      );
    };
  }

  exec(sql) {
    return this.executeWithRetry(
      () => this.db.exec(sql),
      `exec: ${sql.substring(0, 50)}...`
    );
  }

  pragma(pragma, value) {
    if (value !== undefined) {
      return this.db.pragma(`${pragma} = ${value}`);
    }
    return this.db.pragma(pragma);
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  getStats() {
    return this.logger.getStats();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ENHANCED: React Native Database Wrapper
class ReactNativeDBWrapper {
  constructor(SQLite, dbConfig) {
    this.db = null;
    this.SQLite = SQLite;
    this.config = dbConfig;
    this.queryQueue = [];
    this.isProcessing = false;
    this.logger = new QueryLogger();
  }

  async open() {
    return new Promise((resolve, reject) => {
      this.db = this.SQLite.openDatabase(
        this.config,
        () => {
          console.log('[RN DB] Database opened successfully');
          // Enable WAL mode for better concurrency
          this.exec('PRAGMA journal_mode = WAL;');
          this.exec('PRAGMA synchronous = NORMAL;');
          resolve();
        },
        error => {
          console.error('[RN DB] Failed to open database:', error);
          reject(error);
        }
      );
    });
  }

  exec(sql) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not open'));
        return;
      }

      const startTime = Date.now();

      this.db.executeSql(
        sql,
        [],
        (tx, results) => {
          const duration = Date.now() - startTime;
          this.logger.log(sql, duration);
          resolve(results);
        },
        (tx, error) => {
          console.error('[RN DB] Exec error:', error);
          reject(error);
        }
      );
    });
  }

  prepare(sql) {
    return {
      run: (...params) => this.run(sql, params),
      get: (...params) => this.get(sql, params),
      all: (...params) => this.all(sql, params)
    };
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not open'));
        return;
      }

      const startTime = Date.now();

      this.db.executeSql(
        sql,
        params,
        (tx, results) => {
          const duration = Date.now() - startTime;
          this.logger.log(sql, duration, params);
          resolve({
            lastInsertRowid: results.insertId,
            changes: results.rowsAffected
          });
        },
        (tx, error) => {
          console.error('[RN DB] Run error:', error, { sql, params });
          reject(error);
        }
      );
    });
  }

  async get(sql, params = []) {
    const results = await this.all(sql, params);
    return results[0] || null;
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not open'));
        return;
      }

      const startTime = Date.now();

      this.db.executeSql(
        sql,
        params,
        (tx, results) => {
          const duration = Date.now() - startTime;
          this.logger.log(sql, duration, params);

          const rows = [];
          for (let i = 0; i < results.rows.length; i++) {
            rows.push(results.rows.item(i));
          }
          resolve(rows);
        },
        (tx, error) => {
          console.error('[RN DB] All error:', error, { sql, params });
          reject(error);
        }
      );
    });
  }

  transaction(fn) {
    return async (...args) => {
      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(new Error('Database not open'));
          return;
        }

        this.db.transaction(
          tx => {
            try {
              // Create transaction wrapper
              const txWrapper = {
                prepare: (sql) => ({
                  run: (...params) => new Promise((res, rej) => {
                    tx.executeSql(sql, params, (_, results) => res(results), (_, err) => rej(err));
                  })
                })
              };

              const result = fn(txWrapper)(...args);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          },
          error => {
            console.error('[RN DB] Transaction error:', error);
            reject(error);
          },
          () => {
            console.log('[RN DB] Transaction completed');
          }
        );
      });
    };
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  getStats() {
    return this.logger.getStats();
  }
}

// ENHANCED: Initialize Database
let dbInstance;
let pool;

function initializeDatabase() {
  if (isReactNative) {
    const SQLite = require('react-native-sqlite-storage');
    SQLite.enablePromise(true);
    SQLite.DEBUG(process.env.NODE_ENV === 'development');

    dbInstance = new ReactNativeDBWrapper(SQLite, DB_CONFIG);

    // Open database asynchronously
    dbInstance.open().catch(error => {
      console.error('[RN DB] Failed to initialize:', error);
    });

  } else {
    // Node.js environment
    pool = new ConnectionPool(5);
    const conn = pool.createConnection();
    dbInstance = new DatabaseWrapper(conn);

    console.log('[Node DB] Database initialized with connection pool');
    console.log('[Node DB] WAL mode:', dbInstance.pragma('journal_mode'));
  }

  return dbInstance;
}

// ENHANCED: Health Check
async function healthCheck() {
  try {
    const result = await dbInstance.prepare('SELECT 1 as test').get();
    return result && result.test === 1;
  } catch (error) {
    console.error('[DB] Health check failed:', error);
    return false;
  }
}

// ENHANCED: Backup Database (Node.js only)
function backupDatabase(backupPath) {
  if (isReactNative) {
    console.warn('[RN DB] Backup not supported in React Native');
    return false;
  }

  try {
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(__dirname, 'twin-ai.db');

    const sourceDb = new Database(dbPath, { readonly: true });
    const backupDb = new Database(backupPath);

    sourceDb.backup(backupDb);

    sourceDb.close();
    backupDb.close();

    console.log(`[Node DB] Backup created: ${backupPath}`);
    return true;
  } catch (error) {
    console.error('[Node DB] Backup failed:', error);
    return false;
  }
}

// ENHANCED: Optimize Database
function optimizeDatabase() {
  try {
    console.log('[DB] Running optimization...');

    // Analyze tables for query planner
    dbInstance.exec('ANALYZE');

    // Vacuum to reclaim space (can be slow)
    dbInstance.exec('VACUUM');

    // Update statistics
    dbInstance.pragma('optimize');

    console.log('[DB] Optimization complete');
    return true;
  } catch (error) {
    console.error('[DB] Optimization failed:', error);
    return false;
  }
}

// Export the database instance
const db = initializeDatabase();

module.exports = db;

// Export utility functions
module.exports.healthCheck = healthCheck;
module.exports.backupDatabase = backupDatabase;
module.exports.optimizeDatabase = optimizeDatabase;
module.exports.getStats = () => db.getStats();
module.exports.close = () => {
  if (pool) pool.close();
  if (db) db.close();
};
