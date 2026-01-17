// web/src/components/IntegrationManager.tsx
import React, { useState } from 'react';

const IntegrationManager: React.FC = () => {
    const [integrations, setIntegrations] = useState({
        google: { enabled: false, status: 'disconnected', lastSync: null },
        contacts: { enabled: false, status: 'disconnected', lastSync: null }
    });

    const handleConnect = (key: string) => {
        setIntegrations(prev => ({
            ...prev,
            [key]: { enabled: true, status: 'connected', lastSync: new Date() }
        }));
    };

    return (
        <div className="integration-manager">
            <h2>Manage Integrations</h2>
            <div className="grid">
                <div className="card">
                    <h3>Google Account</h3>
                    <p>Sync Drive & Calendar</p>
                    <button onClick={() => handleConnect('google')}>
                        {integrations.google.enabled ? 'Connected' : 'Connect Google'}
                    </button>
                    {integrations.google.lastSync && (
                        <span>Last sync: {integrations.google.lastSync.toLocaleTimeString()}</span>
                    )}
                </div>
                <div className="card">
                    <h3>Mobile Contacts</h3>
                    <p>Sync people you know</p>
                    <button onClick={() => handleConnect('contacts')}>
                        {integrations.contacts.enabled ? 'Connected' : 'Connect Contacts'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IntegrationManager;
