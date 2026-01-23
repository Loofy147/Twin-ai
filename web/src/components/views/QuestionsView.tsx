import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Flame, Star, CheckCircle, Flag, HelpCircle, Trophy, MessageSquare, Target, Zap, Heart, Eye, Shield, Loader2
} from 'lucide-react';
import { Toast } from '../common/Toast';
import { useQuestions } from '../../hooks/useQuestions';
import { useAuth } from '../../contexts/AuthContext';

// BOLT OPTIMIZATION: Hoisted constants outside the component to avoid recreation on every render
const STAR_ARRAY = [...Array(5)];

const MOCK_QUESTIONS = [
  {
    id: 1,
    text: "You have 2 hours of free time on Saturday morning. You:",
    type: "choice",
    dimension: "Time Management",
    difficulty: 2,
    options: [
      { id: 'A', text: "Plan a structured learning session", weight: 1.0, aspect: "planning", icon: Target },
      { id: 'B', text: "See what feels right in the moment", weight: 0.8, aspect: "spontaneity", icon: Zap },
      { id: 'C', text: "Catch up on rest and relaxation", weight: 0.6, aspect: "flexibility", icon: Heart },
      { id: 'D', text: "Don't have a preference", weight: 0, aspect: "indifferent", icon: Eye }
    ]
  },
  {
    id: 2,
    text: "A colleague takes credit for your idea in a meeting. You:",
    type: "scenario",
    dimension: "Communication",
    difficulty: 3,
    options: [
      { id: 'A', text: "Address it directly right there", weight: 1.0, aspect: "direct", icon: MessageSquare },
      { id: 'B', text: "Bring it up privately afterward", weight: 0.8, aspect: "diplomatic", icon: Shield },
      { id: 'C', text: "Let it go this time", weight: 0.4, aspect: "passive", icon: Heart },
      { id: 'D', text: "Don't care about credit", weight: 0, aspect: "indifferent", icon: Eye }
    ]
  }
];

export const QuestionsView: React.FC = () => {
  const { user } = useAuth();
  const { questions: dbQuestions, loading, error, submitAnswer } = useQuestions(10, user?.id);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [answeredToday, setAnsweredToday] = useState(0);
  const [streak] = useState(7);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info' | 'warning'} | null>(null);
  const dailyGoal = 10;

  // BOLT OPTIMIZATION: Memoize questions choice to avoid logic on every render
  const questions = useMemo(() => dbQuestions.length > 0 ? dbQuestions : MOCK_QUESTIONS, [dbQuestions]);

  // BOLT OPTIMIZATION: Memoized handleAnswer with reduced dependencies via functional updates
  const handleAnswer = useCallback(async (option: any) => {
    if (!option) return;

    setSelectedOption(option);

    const startTime = Date.now();
    const currentQuestion = questions[currentQuestionIdx];

    // Attempt real submission if using DB questions
    if (dbQuestions.length > 0 && user && currentQuestion) {
      await submitAnswer({
        profile_id: user.id,
        question_id: currentQuestion.id,
        answer_option_id: option.id,
        response_time_ms: Date.now() - startTime,
        confidence_level: 1.0
      });
    }

    setTimeout(() => {
      setAnsweredToday(prev => prev + 1);

      if (answeredToday + 1 === dailyGoal) {
        setToast({ type: 'success', message: '🎉 Daily goal completed! +50 XP' });
      }

      setCurrentQuestionIdx(prev => {
        if (prev < questions.length - 1) {
          setSelectedOption(null);
          return prev + 1;
        }
        return prev;
      });
    }, 1200);
  }, [currentQuestionIdx, dbQuestions.length, questions, user, submitAnswer, dailyGoal]);

  const question = questions[currentQuestionIdx];
  const progress = (answeredToday / dailyGoal) * 100;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Loading your personalized questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-4xl font-black text-white mb-2">Daily Questions</h2>
              <p className="text-slate-400">Building your digital twin, one choice at a time</p>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl">
                <Flame className="w-5 h-5 text-orange-400" />
                <div>
                  <div className="text-2xl font-black text-orange-400">{streak}</div>
                  <div className="text-xs text-orange-300">day streak</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
                  {answeredToday}/{dailyGoal}
                </div>
                <div className="text-sm text-slate-400">Today's Progress</div>
              </div>
            </div>
          </div>

          <div
            className="relative w-full bg-slate-800/50 rounded-full h-4 overflow-hidden border border-slate-700/50"
            // PALETTE: Progress bar accessibility - WCAG 1.3.1 (AA)
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Daily question progress"
          >
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 transition-all duration-1000 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className={`relative transition-all duration-700 ${selectedOption ? 'scale-95 opacity-75' : 'scale-100 opacity-100'}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl opacity-50"></div>

          <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-2xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="px-4 py-2 bg-purple-500/20 rounded-xl border border-purple-500/30">
                  <span className="text-purple-300 font-bold text-sm">{question.dimension}</span>
                </div>
                <div className="px-4 py-2 bg-pink-500/20 rounded-xl border border-pink-500/30">
                  <span className="text-pink-300 font-bold text-sm capitalize">{question.type}</span>
                </div>
                <div className="flex items-center space-x-1">
                  {STAR_ARRAY.map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < question.difficulty ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
                  ))}
                </div>
              </div>

              <div className="text-slate-400 text-sm">
                {currentQuestionIdx + 1} of {questions.length}
              </div>
            </div>

            <div className="mb-10">
              <h3 className="text-3xl font-bold text-white leading-relaxed">
                {question.text}
              </h3>
            </div>

            <div className="space-y-3">
              {(question.options || []).map((option: any, idx: number) => {
                const OptionIcon = option.icon || MessageSquare;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleAnswer(option)}
                    disabled={selectedOption !== null}
                    // PALETTE: Screen reader users can identify selected option - WCAG 4.1.2 (A)
                    aria-pressed={selectedOption?.id === option.id}
                    className={`w-full p-6 rounded-2xl border-2 text-left transition-all duration-500 ${
                      selectedOption?.id === option.id
                        ? 'border-purple-500 bg-gradient-to-r from-purple-500/20 to-pink-500/20 scale-[1.02] shadow-2xl'
                        : 'border-slate-600/50 bg-slate-800/30 hover:border-purple-500/50 hover:bg-slate-700/40'
                    } ${selectedOption && selectedOption.id !== option.id ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-5">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                          selectedOption?.id === option.id
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                            : 'bg-slate-700/50 text-slate-300'
                        }`}>
                          {option.id}
                        </div>
                        <OptionIcon className={`w-6 h-6 ${selectedOption?.id === option.id ? 'text-purple-400' : 'text-slate-500'}`} />
                        <span className="text-lg font-medium text-white">{option.text}</span>
                      </div>
                      {selectedOption?.id === option.id && (
                        <CheckCircle className="w-7 h-7 text-purple-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button className="text-slate-400 hover:text-white transition-colors text-sm font-medium flex items-center space-x-2">
                <Flag className="w-4 h-4" />
                <span>Skip this question</span>
              </button>
              <button className="text-slate-400 hover:text-white transition-colors text-sm font-medium flex items-center space-x-2">
                <HelpCircle className="w-4 h-4" />
                <span>Why this question?</span>
              </button>
            </div>
          </div>
        </div>

        {answeredToday > 0 && answeredToday % 5 === 0 && (
          <div className="mt-8 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6 flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-green-300 font-bold text-lg">Milestone Reached!</div>
              <div className="text-green-200/80">You've answered {answeredToday} questions today!</div>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};
