import React from 'react';

const DistrictView = ({ progression }) => {
  const { totalSolved, currentStreak } = progression;

  return (
    <div className="w-full max-w-md bg-blueprint-dark/40 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-xs uppercase tracking-widest text-white/50 mb-1">City Map Status</h3>
          <p className="text-2xl font-light">The Lost Metropolis</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-blueprint-accent">{currentStreak}</p>
          <p className="text-[10px] uppercase tracking-tighter text-white/50">Day Streak</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-4">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className={`
              aspect-square rounded border border-white/10 flex items-center justify-center
              ${i < totalSolved ? 'bg-blueprint-accent/20 border-blueprint-accent/50 shadow-inner' : 'bg-black/20'}
            `}
          >
            {i < totalSolved && (
              <div className="w-2 h-2 bg-blueprint-accent rounded-full animate-pulse" />
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-center text-white/40 italic">
        {totalSolved < 10 ? `${10 - totalSolved} more districts to reach Hamlet status` : 'City core fully restored.'}
      </p>
    </div>
  );
};

export default DistrictView;
