import React, { useState } from 'react';
import Cell from './Cell';
import { doZonesOverlap } from '../logic/puzzleEngine';

const Grid = ({ gridSize, clues, zones, setZones }) => {
  const [drawingStart, setDrawingStart] = useState(null);
  const [drawingCurrent, setDrawingCurrent] = useState(null);

  const handleMouseDown = (x, y) => {
    const existingIndex = zones.findIndex(z =>
      x >= Math.min(z.x1, z.x2) && x <= Math.max(z.x1, z.x2) &&
      y >= Math.min(z.y1, z.y2) && y <= Math.max(z.y1, z.y2)
    );

    if (existingIndex >= 0) {
      const newZones = [...zones];
      newZones.splice(existingIndex, 1);
      setZones(newZones);
    } else {
      setDrawingStart({ x, y });
      setDrawingCurrent({ x, y });
    }
  };

  const handleMouseEnter = (x, y) => {
    if (drawingStart) {
      setDrawingCurrent({ x, y });
    }
  };

  const handleMouseUp = () => {
    if (drawingStart && drawingCurrent) {
      const x1 = Math.min(drawingStart.x, drawingCurrent.x);
      const y1 = Math.min(drawingStart.y, drawingCurrent.y);
      const x2 = Math.max(drawingStart.x, drawingCurrent.x);
      const y2 = Math.max(drawingStart.y, drawingCurrent.y);

      // Find which clue this zone belongs to
      const clue = clues.find(c => c.x >= x1 && c.x <= x2 && c.y >= y1 && c.y <= y2);

      const newZone = {
        x1, y1, x2, y2,
        color: clue ? clue.color : 'blue',
        id: Date.now()
      };

      const overlaps = zones.some(z => doZonesOverlap(newZone, z));

      if (!overlaps) {
        setZones([...zones, newZone]);
      }
    }
    setDrawingStart(null);
    setDrawingCurrent(null);
  };

  const getCellData = (x, y) => {
    const zone = zones.find(z => x >= z.x1 && x <= z.x2 && y >= z.y1 && y <= z.y2);
    return {
      isOccupied: !!zone,
      zoneColor: zone ? zone.color : null
    };
  };

  const isCellDrawing = (x, y) => {
    if (!drawingStart || !drawingCurrent) return false;
    const x1 = Math.min(drawingStart.x, drawingCurrent.x);
    const x2 = Math.max(drawingStart.x, drawingCurrent.x);
    const y1 = Math.min(drawingStart.y, drawingCurrent.y);
    const y2 = Math.max(drawingStart.y, drawingCurrent.y);
    return x >= x1 && x <= x2 && y >= y1 && y <= y2;
  };

  const cells = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const clue = clues.find(c => c.x === x && c.y === y);
      const { isOccupied, zoneColor } = getCellData(x, y);
      cells.push(
        <Cell
          key={`${x}-${y}`}
          x={x}
          y={y}
          clue={clue}
          isOccupied={isOccupied}
          zoneColor={zoneColor}
          isDrawing={isCellDrawing(x, y)}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseUp={handleMouseUp}
        />
      );
    }
  }

  return (
    <div
      className="grid gap-0 border-[0.5px] border-patches-border/50 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] w-full max-w-[400px] aspect-square"
      style={{
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
      }}
      onMouseLeave={handleMouseUp}
    >
      {cells}
    </div>
  );
};

export default Grid;
