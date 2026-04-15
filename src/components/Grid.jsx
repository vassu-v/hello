import React, { useState, useEffect } from 'react';
import Cell from './Cell';
import { doZonesOverlap } from '../logic/puzzleEngine';

const Grid = ({ gridSize, clues, zones, setZones, onComplete }) => {
  const [drawingStart, setDrawingStart] = useState(null);
  const [drawingCurrent, setDrawingCurrent] = useState(null);

  const handleMouseDown = (x, y) => {
    // Check if clicking on an existing zone to delete it
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
      const newZone = {
        x1: Math.min(drawingStart.x, drawingCurrent.x),
        y1: Math.min(drawingStart.y, drawingCurrent.y),
        x2: Math.max(drawingStart.x, drawingCurrent.x),
        y2: Math.max(drawingStart.y, drawingCurrent.y),
        id: Date.now()
      };

      // Check for overlaps with existing zones
      const overlaps = zones.some(z => doZonesOverlap(newZone, z));

      if (!overlaps) {
        setZones([...zones, newZone]);
      }
    }
    setDrawingStart(null);
    setDrawingCurrent(null);
  };

  const isCellOccupied = (x, y) => {
    return zones.some(z =>
      x >= z.x1 && x <= z.x2 && y >= z.y1 && y <= z.y2
    );
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
      cells.push(
        <Cell
          key={`${x}-${y}`}
          x={x}
          y={y}
          clue={clue}
          isOccupied={isCellOccupied(x, y)}
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
      className="grid gap-0 border-2 border-white/20 bg-blueprint-dark/50"
      style={{
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        width: 'fit-content'
      }}
      onMouseLeave={handleMouseUp}
    >
      {cells}
    </div>
  );
};

export default Grid;
