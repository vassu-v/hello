import React from 'react';
import { CLUE_TYPES } from '../logic/puzzleEngine';

const Legend = () => {
  return (
    <div className="flex flex-wrap gap-6 justify-center p-6 bg-blueprint-dark/30 rounded-lg border border-white/5">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 border-2 border-white/80 rounded-sm" />
        <span className="text-sm text-white/70">Square</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-8 border-2 border-white/80 rounded-sm" />
        <span className="text-sm text-white/70">Tall Rectangle</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-4 border-2 border-white/80 rounded-sm" />
        <span className="text-sm text-white/70">Wide Rectangle</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 border-2 border-dashed border-white/50 rounded-sm" />
        <span className="text-sm text-white/70">Any Shape</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold">#</span>
        <span className="text-sm text-white/70">Area Size</span>
      </div>
    </div>
  );
};

export default Legend;
