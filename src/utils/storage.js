const STORAGE_KEY = 'ykenglish_data';

const defaultData = {
  progress: {},
  errorWords: [],
  errorCorrectCount: {},
  challengeStatus: {},
  totalPoints: 0,
  badges: [],
  settings: {
    soundEnabled: true,
    selectedGradeTerm: '3a',
  },
  stats: {
    totalDays: 0,
    lastActiveDate: null,
    totalWordsPracticed: 0,
    totalCorrect: 0,
    totalWrong: 0,
  },
};

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(defaultData));
    return { ...JSON.parse(JSON.stringify(defaultData)), ...JSON.parse(raw) };
  } catch {
    return JSON.parse(JSON.stringify(defaultData));
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('localStorage 不可用，学习进度无法保存', e);
  }
}

export function updateStats(data, correct, wrong) {
  const today = new Date().toISOString().split('T')[0];
  const stats = { ...data.stats };
  stats.totalWordsPracticed = (stats.totalWordsPracticed || 0) + correct + wrong;
  stats.totalCorrect = (stats.totalCorrect || 0) + correct;
  stats.totalWrong = (stats.totalWrong || 0) + wrong;

  if (stats.lastActiveDate !== today) {
    stats.totalDays = (stats.totalDays || 0) + 1;
    stats.lastActiveDate = today;
  }
  return { ...data, stats };
}

export function clearAllData() {
  localStorage.removeItem(STORAGE_KEY);
}
