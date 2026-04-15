/**
 * Progression Logic for Blueprint
 *
 * Handles daily streaks and city growth.
 */

export const getProgression = () => {
  const data = localStorage.getItem('blueprint_progression');
  return data ? JSON.parse(data) : {
    totalSolved: 0,
    currentStreak: 0,
    lastSolvedDate: null,
    unlockedDistricts: []
  };
};

export const recordSolve = (districtId) => {
  const prog = getProgression();
  const today = new Date().toISOString().split('T')[0];

  if (prog.lastSolvedDate === today) return prog;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (prog.lastSolvedDate === yesterdayStr) {
    prog.currentStreak += 1;
  } else {
    prog.currentStreak = 1;
  }

  prog.totalSolved += 1;
  prog.lastSolvedDate = today;
  if (!prog.unlockedDistricts.includes(districtId)) {
    prog.unlockedDistricts.push(districtId);
  }

  localStorage.setItem('blueprint_progression', JSON.stringify(prog));
  return prog;
};
