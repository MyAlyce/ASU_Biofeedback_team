import React, { useEffect, useRef, useState } from 'react';
import { resetHEGScore, subscribeHEGPlayback, unsubscribeHEGPlayback } from '../scripts/connect';

const HEGscore: React.FC = () => {
  const currentRef = useRef<HTMLSpanElement | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [subscriptionId, setSubscriptionId] = useState<number | null>(null);

  // Subscribe to HEG data
  useEffect(() => {
    const sub = subscribeHEGPlayback((data) => {
      const score = Number(data.hegScore[0]);
      setScores(prevScores => [...prevScores, score]);

      if (currentRef.current) {
        currentRef.current.innerText = score.toFixed(2);
      }
    });

    setSubscriptionId(sub);

    return () => {
      unsubscribeHEGPlayback(sub);
    };
  }, []);

  const handleReset = () => {
    resetHEGScore();
    setScores([]);
    if (currentRef.current) {
      currentRef.current.innerText = '';
    }
  };

  const averageScore = scores.length > 0
    ? (scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(2)
    : '0.00';

  const highScore = scores.length > 0
    ? Math.max(...scores).toFixed(2)
    : '0.00';

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
      <p>
        <strong>Current Score:</strong> <span ref={currentRef}></span>
        <button onClick={handleReset} style={{ marginLeft: '1rem' }}>Reset</button>
      </p>

      <p><strong>High Score:</strong> {highScore}</p>
      <p><strong>Average Score:</strong> {averageScore}</p>

      <div>
        <strong>Score History:</strong>
        <ul style={{ maxHeight: '120px', overflowY: 'scroll', paddingLeft: '1.2rem' }}>
          {scores.map((score, index) => (
            <li key={index}>{score.toFixed(2)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default HEGscore;
