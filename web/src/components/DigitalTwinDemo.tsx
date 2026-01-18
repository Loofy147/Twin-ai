import React, { useState, useEffect } from 'react';
import {
  Brain,
  Activity,
  TrendingUp,
  Clock,
  Users,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Zap,
  Shield,
  Heart
} from 'lucide-react';

const DigitalTwinSimulator = () => {
  const [trainingStep, setTrainingStep] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const [reward, setReward] = useState(0);
  const [totalReward, setTotalReward] = useState(0);
  const [learnedPatterns, setLearnedPatterns] = useState([]);
  const [currentScenario, setCurrentScenario] = useState(null);
  const [agentDecision, setAgentDecision] = useState(null);
  const [agentReasoning, setAgentReasoning] = useState("");

  // Simulated State
  const [state, setState] = useState({
    energy: 0.8,
    cognitiveLoad: 0.2,
    timeAvailable: 480, // minutes
    relationships: [
      { name: 'Sarah Martinez', strength: 0.85, priority: 0.9, daysSince: 2 },
      { name: 'John Chen', strength: 0.6, priority: 0.7, daysSince: 14 }
    ],
    projects: [
      { name: 'Q4 Strategy Report', progress: 0.4, priority: 0.9, deadline: 5 },
      { name: 'Website Redesign', progress: 0.7, priority: 0.5, deadline: 20 }
    ]
  });

  const scenarios = [
    {
      id: 1,
      context: 'Monday Morning, 8:00 AM',
      situation: 'You have high energy and a 4-hour block before your first meeting. Sarah needs urgent help with a client issue, but your Q4 Report is due in 5 days.',
      options: [
        {
          id: 'A',
          text: 'Help Sarah for 1 hour, then deep work on Report',
          valueAlign: 0.9,
          goalProgress: 0.8,
          relBoost: 0.9
        },
        {
          id: 'B',
          text: 'Focus entirely on Q4 Report for 4 hours',
          valueAlign: 0.6,
          goalProgress: 1.0,
          relBoost: 0.2
        },
        {
          id: 'C',
          text: 'Help Sarah for 4 hours',
          valueAlign: 0.8,
          goalProgress: 0.1,
          relBoost: 1.0
        }
      ],
      optimalChoice: 'A'
    },
    {
      id: 2,
      context: 'Friday Afternoon, 4:00 PM',
      situation: 'Your energy is low (20%). You have a recurring networking call scheduled, but you feel exhausted. You have not spoken to John in 14 days.',
      options: [
        {
          id: 'A',
          text: 'Take the call despite low energy',
          valueAlign: 0.4,
          goalProgress: 0.3,
          relBoost: 0.6
        },
        {
          id: 'B',
          text: 'Cancel call, rest for 1 hour, then quick message to John',
          valueAlign: 0.9,
          goalProgress: 0.2,
          relBoost: 0.8
        },
        {
          id: 'C',
          text: 'Push through and work on Website Redesign',
          valueAlign: 0.3,
          goalProgress: 0.5,
          relBoost: 0.1
        }
      ],
      optimalChoice: 'B'
    },
    {
      id: 3,
      context: 'Deadline Crisis: Project Due Tomorrow',
      situation: 'Your Q4 Strategy Report is due tomorrow and is only 40% complete. Energy is moderate (50%). A friend invites you to a last-minute dinner.',
      options: [
        {
          id: 'A',
          text: 'Go to dinner (2 hours)',
          valueAlign: 0.7,
          goalProgress: 0.0,
          relBoost: 0.9
        },
        {
          id: 'B',
          text: 'Deep work on Report (4 hours)',
          valueAlign: 0.5,
          goalProgress: 1.0,
          relBoost: 0.1
        },
        {
          id: 'C',
          text: 'Work for 2 hours, then quick 30min dinner',
          valueAlign: 0.8,
          goalProgress: 0.6,
          relBoost: 0.5
        }
      ],
      optimalChoice: 'B'
    }
  ];

  const startTraining = () => {
    setIsTraining(true);
    runIteration();
  };

  const runIteration = () => {
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    setCurrentScenario(scenario);
    setAgentDecision(null);

    // Agent "thinks"
    setTimeout(() => {
      // Simulate agent learning: becomes more accurate over time
      const accuracy = Math.min(0.9, 0.3 + (trainingStep * 0.05));
      const chosenId = Math.random() < accuracy
        ? scenario.optimalChoice
        : scenario.options[Math.floor(Math.random() * scenario.options.length)].id;

      const decision = scenario.options.find(o => o.id === chosenId);
      setAgentDecision(decision);

      // Generate Reasoning
      let reasoning = "";
      if (decision.id === scenario.optimalChoice) {
        if (scenario.id === 1) reasoning = "Prioritizing high-impact deep work while maintaining key relationship with Sarah.";
        else if (scenario.id === 2) reasoning = "Protecting low energy to avoid burnout, using async communication for John.";
        else if (scenario.id === 3) reasoning = "Strict focus on critical deadline; socializing deferred to post-deadline.";
      } else {
        reasoning = "Suboptimal choice: misalignment between current energy and task urgency.";
      }
      setAgentReasoning(reasoning);

      // Calculate reward
      const r = decision.id === scenario.optimalChoice ? 1.0 : -0.5;
      setReward(r);
      setTotalReward(prev => prev + r);
      setTrainingStep(prev => prev + 1);

      // Add patterns as they emerge
      if (trainingStep === 5) {
        setLearnedPatterns(prev => [...prev, { pattern: 'Values relationships over pure productivity when energy is high', confidence: 0.82 }]);
      } else if (trainingStep === 10) {
        setLearnedPatterns(prev => [...prev, { pattern: 'Prioritizes rest and asynchronous communication when energy < 30%', confidence: 0.91 }]);
      }

      if (trainingStep < 20 && isTraining) {
        setTimeout(runIteration, 2000);
      } else {
        setIsTraining(false);
      }
    }, 1500);
  };

  const selectOption = (option) => {
    if (isTraining) return;
    setAgentDecision(option);
    const r = option.id === currentScenario.optimalChoice ? 1.0 : -0.5;
    setReward(r);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
              Digital Twin RL Trainer
            </h1>
            <p className="text-slate-400 mt-2">Training agent policy based on your learned preferences</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={startTraining}
              disabled={isTraining}
              className={`px-6 py-3 rounded-full font-bold transition-all ${
                isTraining
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20'
              }`}
            >
              {isTraining ? 'Training in Progress...' : 'Start RL Training'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10">
            <div className="text-slate-400 text-sm mb-1">Training Steps</div>
            <div className="text-4xl font-bold text-blue-400">{trainingStep}</div>
            <div className="text-xs text-blue-300 mt-2">Simulation iterations</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10">
            <div className="text-slate-400 text-sm mb-1">Mean Reward</div>
            <div className="text-4xl font-bold text-green-400">
              {trainingStep > 0 ? (totalReward / trainingStep).toFixed(2) : '0.00'}
            </div>
            <div className="text-xs text-green-300 mt-2">Policy alignment score</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10">
            <div className="text-slate-400 text-sm mb-1">Model Accuracy</div>
            <div className="text-4xl font-bold text-purple-400">
              {Math.min(98, (30 + (trainingStep * 5))).toFixed(0)}%
            </div>
            <div className="text-xs text-purple-300 mt-2">Twin similarity index</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10">
            <div className="text-slate-400 text-sm mb-1">Patterns Learned</div>
            <div className="text-4xl font-bold text-yellow-400">{learnedPatterns.length}</div>
            <div className="text-xs text-purple-300 mt-2">Behavioral insights</div>
          </div>
        </div>

        {/* Current Scenario */}
        {currentScenario && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-bold">Current Scenario</h2>
            </div>

            <div className="bg-white/5 p-4 rounded-lg mb-4">
              <div className="text-sm text-purple-200 mb-2">Context</div>
              <div className="text-lg">{currentScenario.context}</div>
            </div>

            <div className="bg-white/5 p-4 rounded-lg mb-4">
              <div className="text-sm text-purple-200 mb-2">Situation</div>
              <div className="text-lg">{currentScenario.situation}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {currentScenario.options.map(option => (
                <button
                  key={option.id}
                  onClick={() => selectOption(option)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    agentDecision?.id === option.id
                      ? 'border-yellow-400 bg-yellow-400/20'
                      : option.id === currentScenario.optimalChoice
                      ? 'border-green-400/50 bg-white/5 hover:bg-white/10'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="font-semibold mb-2">{option.text}</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-purple-300">Value</div>
                      <div className="font-bold">{(option.valueAlign * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-purple-300">Goal</div>
                      <div className="font-bold">{(option.goalProgress * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-purple-300">Rel</div>
                      <div className="font-bold">{(option.relBoost * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                  {option.id === currentScenario.optimalChoice && (
                    <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Optimal choice
                    </div>
                  )}
                </button>
              ))}
            </div>

            {agentDecision && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${
                  agentDecision.id === currentScenario.optimalChoice
                    ? 'bg-green-500/20 border-2 border-green-400'
                    : 'bg-orange-500/20 border-2 border-orange-400'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      <span className="font-bold">Agent Decision:</span>
                      <span>{agentDecision.text}</span>
                    </div>
                    <div className="font-bold text-2xl">
                      Reward: {reward.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-sm text-white/80">
                    {agentDecision.id === currentScenario.optimalChoice
                      ? '✓ Agent chose optimally! Learning successful.'
                      : '⚠ Suboptimal choice - agent will learn from this.'}
                  </div>
                </div>

                <div className="bg-blue-900/30 border border-blue-500/30 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-1 text-blue-300 text-sm font-bold uppercase tracking-wider">
                    <Zap className="w-4 h-4" />
                    Agent Reasoning
                  </div>
                  <div className="text-blue-100 italic">
                    "{agentReasoning}"
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Learned Patterns */}
        {learnedPatterns.length > 0 && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-green-400" />
              <h2 className="text-2xl font-bold">Learned Behavioral Patterns</h2>
            </div>

            <div className="space-y-3">
              {learnedPatterns.map((pattern, idx) => (
                <div key={idx} className="bg-white/5 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">{pattern.pattern}</div>
                    <div className="text-sm text-green-400">
                      {(pattern.confidence * 100).toFixed(0)}% confidence
                    </div>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pattern.confidence * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current State */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-bold">Personal State</h3>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Energy</span>
                  <span>{(state.energy * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-green-400 h-2 rounded-full"
                    style={{ width: `${state.energy * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Cognitive Load</span>
                  <span>{(state.cognitiveLoad * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-orange-400 h-2 rounded-full"
                    style={{ width: `${state.cognitiveLoad * 100}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-white/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Available Time: {state.timeAvailable} min</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-purple-400" />
              <h3 className="text-xl font-bold">Relationships</h3>
            </div>

            <div className="space-y-3">
              {state.relationships.map((rel, idx) => (
                <div key={idx} className="bg-white/5 p-3 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">{rel.name}</span>
                    <span className="text-sm text-purple-300">
                      {rel.daysSince} days ago
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <div className="flex-1">
                      <div className="text-white/60">Strength</div>
                      <div className="font-bold">{(rel.strength * 100).toFixed(0)}%</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-white/60">Priority</div>
                      <div className="font-bold">{(rel.priority * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Briefcase className="w-6 h-6 text-yellow-400" />
              <h3 className="text-xl font-bold">Projects</h3>
            </div>

            <div className="space-y-3">
              {state.projects.map((proj, idx) => (
                <div key={idx} className="bg-white/5 p-3 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm">{proj.name}</span>
                    <span className="text-xs text-yellow-300">
                      {proj.deadline}d left
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full"
                        style={{ width: `${proj.progress * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-white/60">
                    Priority: {(proj.priority * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalTwinSimulator;
