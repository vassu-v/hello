import React from 'react';
import { CLUE_TYPES } from '../logic/puzzleEngine';

const Legend = () => {
  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-lg border border-patches-border shadow-sm w-full max-w-sm">
      <p className="text-sm font-medium text-center text-patches-clue mb-2">Complete each shape to fill the grid</p>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 justify-items-start px-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-patches-clue/20 border border-patches-clue/30 rounded-[4px]" />
          <span className="text-sm text-patches-clue">Square</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-6 bg-patches-clue/20 border border-patches-clue/30 rounded-[4px]" />
          <span className="text-sm text-patches-clue">Tall rectangle</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-4 bg-patches-clue/20 border border-patches-clue/30 rounded-[4px]" />
          <span className="text-sm text-patches-clue">Wide rectangle</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-dotted border-patches-clue/40 rounded-[4px] bg-transparent" />
          <span className="text-sm text-patches-clue">Any of the above</span>
        </div>
      </div>
      <p className="text-xs text-patches-clue/80 text-center mt-2">If a shape has a number, it must be that size.</p>
    </div>
  );
};

export default Legend;
