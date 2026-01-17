// web/src/components/QuestionAnswering.tsx
import React, { useState, useEffect } from 'react';

interface Question {
    id: number;
    text: string;
    metadata: string;
}

const QuestionAnswering: React.FC = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answeredCount, setAnsweredCount] = useState(0);

    // Mock fetching questions from the engine
    useEffect(() => {
        // In a real app, this would call the backend/engine
        const mockQuestions = [
            { id: 1, text: "Between freedom and security, which matters more to you?", metadata: JSON.stringify({ options: ["Freedom", "Security", "Both", "None"] }) },
            { id: 2, text: "Do you prefer working alone or in a team?", metadata: JSON.stringify({ options: ["Alone", "Team", "Depends"] }) },
        ];
        setQuestions(mockQuestions);
    }, []);

    const handleAnswer = (option: string) => {
        console.log(`Answered question ${questions[currentIndex].id} with ${option}`);
        setAnsweredCount(prev => prev + 1);
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    if (questions.length === 0) return <div>Loading questions...</div>;
    if (answeredCount >= 10) return <div>Great job! You've answered your 10 questions for today.</div>;

    const currentQuestion = questions[currentIndex];
    const options = JSON.parse(currentQuestion.metadata).options || [];

    return (
        <div className="question-answering">
            <h3>Question {currentIndex + 1}</h3>
            <p className="question-text">{currentQuestion.text}</p>
            <div className="options">
                {options.map((option: any, idx: number) => (
                    <button key={idx} onClick={() => typeof option === 'string' ? handleAnswer(option) : handleAnswer(option.text)}>
                        {typeof option === 'string' ? option : option.text}
                    </button>
                ))}
            </div>
            <div className="progress">
                Progress: {answeredCount} / 10
            </div>
        </div>
    );
};

export default QuestionAnswering;
