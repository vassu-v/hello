import React from 'react';
import { CLUE_TYPES } from '../logic/puzzleEngine';

const Cell = ({ x, y, clue, isOccupied, isDrawing, onMouseDown, onMouseEnter, onMouseUp }) => {
  const getClueDisplay = (clue) => {
    if (!clue) return null;
    switch (clue.type) {
      case CLUE_TYPES.NUMBER:
        return <span className="text-xl font-bold">{clue.value}</span>;
      case CLUE_TYPES.SQUARE:
        return <div className="w-6 h-6 border-2 border-white/80 rounded-sm" title="Square" />;
      case CLUE_TYPES.TALL:
        return <div className="w-4 h-8 border-2 border-white/80 rounded-sm" title="Tall" />;
      case CLUE_TYPES.WIDE:
        return <div className="w-8 h-4 border-2 border-white/80 rounded-sm" title="Wide" />;
      case CLUE_TYPES.ANY:
        return <div className="w-6 h-6 border-2 border-dashed border-white/50 rounded-sm" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`
        w-16 h-16 border border-white/10 flex items-center justify-center relative select-none cursor-pointer
        ${isOccupied ? 'bg-blueprint-accent/30' : 'hover:bg-white/5'}
        ${isDrawing ? 'bg-blueprint-accent/50' : ''}
      `}
      onMouseDown={() => onMouseDown(x, y)}
      onMouseEnter={() => onMouseEnter(x, y)}
      onMouseUp={onMouseUp}
    >
      {getClueDisplay(clue)}
      <div className="absolute top-0 left-0 text-[8px] text-white/20 p-0.5">{x},{y}</div>
    </div>
  );
};

export default Cell;
