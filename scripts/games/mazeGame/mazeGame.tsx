// MazeGame.tsx
import React, { useState, useEffect } from 'react';
import './mazeGame.css';

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

export const MazeGame: React.FC = () => {
  const [playerPos, setPlayerPos] = useState<Position>(startPosition);

  const movePlayer = (direction: string) => {
    const { row, col } = playerPos;
    let newRow = row;
    let newCol = col;

    if (direction === 'ArrowUp') newRow--;
    else if (direction === 'ArrowDown') newRow++;
    else if (direction === 'ArrowLeft') newCol--;
    else if (direction === 'ArrowRight') newCol++;

    if (maze[newRow]?.[newCol] === '.') {
      setPlayerPos({ row: newRow, col: newCol });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => movePlayer(e.key);
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPos]);

  return (
    <div className="maze-container">
      {maze.map((row, rowIndex) => (
        <div key={rowIndex} className="maze-row">
          {row.map((cell, colIndex) => {
            const isPlayer = rowIndex === playerPos.row && colIndex === playerPos.col;
            const cellClass = isPlayer
              ? "player"
              : cell === "#"
              ? "wall"
              : "path";

            return (
              <div key={colIndex} className={`maze-cell ${cellClass}`}>
                {isPlayer ? 'P' : ''}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
