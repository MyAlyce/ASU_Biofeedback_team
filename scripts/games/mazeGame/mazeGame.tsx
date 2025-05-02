import React, { useState, useEffect } from 'react';

type Position = {
  row: number;
  col: number;
};

const maze = [
  ['#', '#', '#', '#', '#'],
  ['#', '.', '.', '.', '#'],
  ['#', '.', '#', '.', '#'],
  ['#', '.', '#', '.', '#'],
  ['#', '#', '#', '#', '#']
];

const startPosition: Position = { row: 1, col: 1 };

const App: React.FC = () => {
  const [playerPos, setPlayerPos] = useState<Position>(startPosition);

  const movePlayer = (direction: string) => {
    const { row, col } = playerPos;
    let newRow = row;
    let newCol = col;

    if (direction === 'ArrowUp') newRow--;
    else if (direction === 'ArrowDown') newRow++;
    else if (direction === 'ArrowLeft') newCol--;
    else if (direction === 'ArrowRight') newCol++;

    if (
      maze[newRow] &&
      maze[newRow][newCol] &&
      maze[newRow][newCol] === '.'
    ) {
      setPlayerPos({ row: newRow, col: newCol });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => movePlayer(e.key);
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPos]);

  return (
    <div>
      <h2>Maze Game</h2>
      <div style={{ fontFamily: 'monospace', lineHeight: '1.5em' }}>
        {maze.map((row, rowIndex) => (
          <div key={rowIndex}>
            {row.map((cell, colIndex) => {
              const isPlayer = rowIndex === playerPos.row && colIndex === playerPos.col;
              return <span key={colIndex}>{isPlayer ? 'P' : cell}</span>;
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
