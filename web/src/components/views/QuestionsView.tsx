import React, { useState } from 'react';
import { useQuestions } from '../../hooks/useQuestions';
import { useAuth } from '../../contexts/AuthContext';
import { Check, Info, Zap, Target } from 'lucide-react';

interface QuestionsViewProps {
  onNext: () => void;
}

const QuestionsView: React.FC<QuestionsViewProps> = ({ onNext }) => {
  const { profile } = useAuth();
  const {
    currentQuestion,
    loading,
    error,
    submitAnswer,
    answeredToday,
    setAnsweredToday,
    dailyGoal,
    setToast
  } = useQuestions();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSelect = async (optionId: string) => {
    if (isTransitioning || !currentQuestion) return;

    setSelectedOption(optionId);
    setIsTransitioning(true);

    const questionId = currentQuestion.id;

    try {
      // ⚡ Bolt Optimization: background the submission (Optimistic UI)
      // We don't await this to keep the UI snappy.
      submitAnswer(questionId, optionId);

      // ⚡ Bolt Optimization: Reduced artificial delay from 1200ms to 800ms
      // Keep the "checked" state visible for a moment to provide feedback
      setTimeout(() => {
        setIsTransitioning(false);

        // ⚡ Bolt Optimization: Immediate progress update
        const nextCount = answeredToday + 1;
        setAnsweredToday(nextCount);

        if (nextCount === dailyGoal) {
          setToast({ message: "Daily Goal Reached! 🚀", type: "success" });
        }

        onNext();
        setSelectedOption(null);
      }, 800);
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setIsTransitioning(false);
      setToast({ message: "Failed to save answer. Please try again.", type: "error" });
    }
  };

  if (loading && !currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        <p className="mt-4 text-gray-400">Finding the perfect question...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-xl text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const progress = (answeredToday / dailyGoal) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Daily Questions</h1>
          <p className="text-gray-400">Building your digital twin, one choice at a time</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-xl flex items-center gap-3">
            <Zap className="w-5 h-5 text-orange-500" />
            <div>
              <div className="text-xl font-bold text-orange-500 leading-tight">7</div>
              <div className="text-[10px] text-orange-500/70 uppercase tracking-wider font-semibold">day streak</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold text-pink-500 leading-tight">
              {answeredToday}/{dailyGoal}
            </div>
            <div className="text-[10px] text-pink-500/70 uppercase tracking-wider font-semibold">Today's Progress</div>
          </div>
        </div>
      </header>

      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-6">
          <span className="px-3 py-1 bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-full text-xs font-medium">
            {currentQuestion.dimension?.name || 'General'}
          </span>
          <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-xs font-medium">
            Scenario
          </span>
          <div className="flex ml-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Target
                key={star}
                className={`w-4 h-4 ${star <= (currentQuestion.impact_score || 3) ? 'text-yellow-500' : 'text-gray-700'}`}
                fill={star <= (currentQuestion.impact_score || 3) ? 'currentColor' : 'none'}
              />
            ))}
          </div>
          <span className="ml-auto text-xs text-gray-500 font-mono">
            {answeredToday + 1} of {dailyGoal}
          </span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-8 leading-tight">
          {currentQuestion.text}
        </h2>

        <div className="grid gap-4">
          {currentQuestion.options?.map((option, index) => {
            const isSelected = selectedOption === option.id;
            const letter = String.fromCharCode(65 + index);

            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                disabled={isTransitioning}
                className={`
                  group relative flex items-center p-6 rounded-xl border-2 transition-all duration-300 text-left
                  ${isSelected
                    ? 'bg-primary-500/10 border-primary-500 text-white'
                    : 'bg-gray-800/40 border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-800/60'}
                  ${isTransitioning && !isSelected ? 'opacity-50 grayscale-[0.5]' : ''}
                `}
              >
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center mr-6 font-bold transition-colors
                  ${isSelected ? 'bg-primary-500 text-white' : 'bg-gray-700 text-gray-400 group-hover:bg-gray-600'}
                `}>
                  {isSelected ? <Check className="w-5 h-5" /> : letter}
                </div>

                <div className="flex-1">
                  <p className="font-medium text-lg">{option.text}</p>
                </div>

                <div className={`
                  opacity-0 transition-opacity duration-300
                  ${isSelected ? 'opacity-100' : 'group-hover:opacity-100'}
                `}>
                  <Info className="w-5 h-5 text-gray-500" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <footer className="flex items-center justify-center gap-8 text-gray-500 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Anonymous Identity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span>End-to-End Encrypted</span>
        </div>
      </footer>
    </div>
  );
};

export default QuestionsView;
