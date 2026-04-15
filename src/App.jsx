import React, { useState, useEffect, useMemo } from 'react';
import Grid from './components/Grid';
import Legend from './components/Legend';
import { validatePuzzle, CLUE_TYPES } from './logic/puzzleEngine';

const App = () => {
  const gridSize = 6;
  const [zones, setZones] = useState([]);
  const [isWon, setIsWon] = useState(false);

  // Daily puzzle clues based on the reference image colors/positions
  const clues = useMemo(() => [
    { x: 0, y: 0, type: CLUE_TYPES.SQUARE, color: 'orange', id: 1 },
    { x: 5, y: 0, type: CLUE_TYPES.SQUARE, value: 9, color: 'green', id: 2 },
    { x: 2, y: 2, type: CLUE_TYPES.TALL, value: 3, color: 'purple', id: 3 },
    { x: 3, y: 3, type: CLUE_TYPES.SQUARE, value: 9, color: 'red', id: 4 },
    { x: 0, y: 5, type: CLUE_TYPES.TALL, value: 8, color: 'blue', id: 5 },
    { x: 5, y: 5, type: CLUE_TYPES.TALL, color: 'gold', id: 6 },
  ], []);

  useEffect(() => {
    if (validatePuzzle(gridSize, clues, zones)) {
      setIsWon(true);
    } else {
      setIsWon(false);
    }
  }, [zones, clues, gridSize]);

  const handleUndo = () => {
    setZones(prev => prev.slice(0, -1));
  };

  const handleReset = () => {
    setZones([]);
    setIsWon(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[450px] bg-white rounded-2xl border border-patches-border p-6 flex flex-col items-center shadow-lg relative overflow-hidden">

        <div className="mb-6 w-full">
          <Grid
            gridSize={gridSize}
            clues={clues}
            zones={zones}
            setZones={setZones}
          />
        </div>

        <div className="flex gap-3 w-full mb-6">
          <button
            onClick={handleUndo}
            disabled={zones.length === 0}
            className="w-full py-3 px-4 bg-[#f0f0f0] text-patches-clue rounded-full font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#e0e0e0] transition-colors"
          >
            Undo
          </button>
        </div>

        <Legend />

        {isWon && (
          <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center animate-in fade-in duration-300 z-10 px-6 text-center">
            <div className="w-16 h-16 bg-patches-green rounded-full flex items-center justify-center mb-4 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Great job!</h2>
            <p className="text-patches-clue mb-6">You've solved today's puzzle.</p>
            <button
              onClick={handleReset}
              className="bg-black text-white px-8 py-3 rounded-full font-bold hover:opacity-80 transition-opacity"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
