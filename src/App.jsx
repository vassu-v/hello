import React, { useState, useEffect, useMemo } from 'react';
import Grid from './components/Grid';
import Legend from './components/Legend';
import DistrictView from './components/DistrictView';
import { validatePuzzle, CLUE_TYPES } from './logic/puzzleEngine';
import { getProgression, recordSolve } from './logic/progression';

const App = () => {
  const gridSize = 5;
  const [zones, setZones] = useState([]);
  const [isWon, setIsWon] = useState(false);
  const [progression, setProgression] = useState(getProgression());

  // Static daily puzzle for MVP
  const clues = useMemo(() => [
    { x: 0, y: 0, type: CLUE_TYPES.SQUARE, value: 4 },
    { x: 4, y: 0, type: CLUE_TYPES.NUMBER, value: 9 },
    { x: 2, y: 2, type: CLUE_TYPES.TALL, value: 3 },
    { x: 3, y: 3, type: CLUE_TYPES.WIDE, value: 9 },
    { x: 0, y: 4, type: CLUE_TYPES.ANY, value: 8 },
  ], []);

  useEffect(() => {
    if (validatePuzzle(gridSize, clues, zones)) {
      if (!isWon) {
        setIsWon(true);
        const newProg = recordSolve('district-01');
        setProgression(newProg);
      }
    } else {
      setIsWon(false);
    }
  }, [zones, clues, gridSize, isWon]);

  const handleReset = () => {
    setZones([]);
    setIsWon(false);
  };

  return (
    <div className="min-h-screen w-full bg-blueprint-base text-white font-sans p-8 flex flex-col items-center">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-light tracking-widest uppercase mb-2">Blueprint</h1>
        <p className="text-blueprint-accent/80 font-mono text-sm tracking-tight">
          District 01: The Outpost • 5x5 Site Survey
        </p>
      </header>

      <main className="flex flex-col items-center gap-8 max-w-2xl w-full">
        <div className="relative">
          <Grid
            gridSize={gridSize}
            clues={clues}
            zones={zones}
            setZones={setZones}
          />

          {isWon && (
            <div className="absolute inset-0 bg-blueprint-accent/90 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 z-10">
              <h2 className="text-4xl font-bold mb-4">Construction Complete!</h2>
              <p className="mb-6 opacity-90 text-center px-8">The Outpost has been successfully drafted. Progress saved to City Map.</p>
              <button
                onClick={handleReset}
                className="bg-white text-blueprint-base px-8 py-3 rounded font-bold hover:bg-blueprint-light transition-colors"
              >
                Draft Next District
              </button>
            </div>
          )}
        </div>

        <Legend />

        <DistrictView progression={progression} />

        <div className="flex gap-4">
          <button
            onClick={handleReset}
            className="px-6 py-2 border border-white/20 rounded hover:bg-white/5 transition-colors text-sm"
          >
            Clear Draft
          </button>
          <button
            className="px-6 py-2 border border-white/20 rounded hover:bg-white/5 transition-colors text-sm opacity-50 cursor-not-allowed"
          >
            Request Survey Hint
          </button>
        </div>
      </main>

      {/* Decorative Blueprint Lines */}
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute top-1/4 left-0 w-full h-px bg-white" />
        <div className="absolute top-3/4 left-0 w-full h-px bg-white" />
        <div className="absolute top-0 left-1/4 h-full w-px bg-white" />
        <div className="absolute top-0 left-3/4 h-full w-px bg-white" />
      </div>
    </div>
  );
};

export default App;
