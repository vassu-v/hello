import React from 'react';
import { CLUE_TYPES } from '../logic/puzzleEngine';

const Cell = ({ x, y, clue, isOccupied, zoneColor, isDrawing, onMouseDown, onMouseEnter, onMouseUp }) => {
  const getColorClass = (color) => {
    switch (color) {
      case 'orange': return 'bg-patches-orange';
      case 'purple': return 'bg-patches-purple';
      case 'green': return 'bg-patches-green';
      case 'blue': return 'bg-patches-blue';
      case 'red': return 'bg-patches-red';
      case 'gold': return 'bg-patches-gold';
      default: return 'bg-patches-blue';
    }
  };

  const getClueDisplay = (clue) => {
    if (!clue) return null;

    const colorBg = getColorClass(clue.color);

    return (
      <div className={`
        w-[44px] h-[44px] rounded-[6px] flex items-center justify-center text-white text-xl font-bold select-none
        ${colorBg}
      `}>
        {clue.value || (
          clue.type === CLUE_TYPES.SQUARE ? null :
          <div className={`w-3 h-5 border-2 border-white rounded-[2px] ${clue.type === CLUE_TYPES.WIDE ? 'rotate-90' : ''}`} />
        )}
      </div>
    );
  };

  return (
    <div
      className={`
        w-full aspect-square border-[0.5px] border-patches-border/50 flex items-center justify-center relative select-none cursor-pointer
        ${isOccupied ? getColorClass(zoneColor) : 'bg-transparent'}
        ${isDrawing ? 'bg-black/10' : ''}
      `}
      onMouseDown={() => onMouseDown(x, y)}
      onMouseEnter={() => onMouseEnter(x, y)}
      onMouseUp={onMouseUp}
    >
      {/* Visual background for occupied zones with slightly rounded inner look */}
      {isOccupied && (
        <div className={`absolute inset-[1px] rounded-[3px] ${getColorClass(zoneColor)} shadow-sm`} />
      )}

      {/* The clue content sits on top */}
      <div className="relative z-10 pointer-events-none">
        {getClueDisplay(clue)}
      </div>
    </div>
  );
};

export default Cell;
