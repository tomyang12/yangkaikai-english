import { useState, useCallback } from 'react';
import { loadData, saveData, updateStats } from '../utils/storage';

export default function useLocalData() {
  const [data, setData] = useState(() => loadData());

  const updateData = useCallback((updater) => {
    setData(prev => {
      const newData = typeof updater === 'function' ? updater(prev) : updater;
      saveData(newData);
      return newData;
    });
  }, []);

  const addErrorWord = useCallback((word) => {
    setData(prev => {
      const exists = prev.errorWords.find(w => w.id === word.id);
      let errorWords;
      if (!exists) {
        errorWords = [...prev.errorWords, word];
      } else {
        errorWords = prev.errorWords;
      }
      const errorCorrectCount = { ...prev.errorCorrectCount };
      const newData = { ...prev, errorWords, errorCorrectCount };
      saveData(newData);
      return newData;
    });
  }, []);

  const recordErrorCorrect = useCallback((wordId, isCorrect) => {
    setData(prev => {
      const errorCorrectCount = { ...prev.errorCorrectCount };
      if (!errorCorrectCount[wordId]) {
        errorCorrectCount[wordId] = { correct: 0, wrong: 0 };
      }
      if (isCorrect) {
        errorCorrectCount[wordId].correct += 1;
      } else {
        errorCorrectCount[wordId].wrong += 1;
      }
      const newData = { ...prev, errorCorrectCount };
      saveData(newData);
      return newData;
    });
  }, []);

  const updateProgress = useCallback((unitId, progressData) => {
    setData(prev => {
      const progress = { ...prev.progress };
      progress[unitId] = { ...progress[unitId], ...progressData };
      const newData = { ...prev, progress };
      saveData(newData);
      return newData;
    });
  }, []);

  const updateChallengeStatus = useCallback((unitId, status) => {
    setData(prev => {
      const challengeStatus = { ...prev.challengeStatus };
      challengeStatus[unitId] = status;
      const newData = { ...prev, challengeStatus };
      saveData(newData);
      return newData;
    });
  }, []);

  const addPoints = useCallback((points) => {
    setData(prev => {
      const newData = { ...prev, totalPoints: (prev.totalPoints || 0) + points };
      saveData(newData);
      return newData;
    });
  }, []);

  const updateStatsData = useCallback((correct, wrong) => {
    setData(prev => {
      const newData = updateStats(prev, correct, wrong);
      saveData(newData);
      return newData;
    });
  }, []);

  return {
    data,
    updateData,
    addErrorWord,
    recordErrorCorrect,
    updateProgress,
    updateChallengeStatus,
    addPoints,
    updateStatsData,
  };
}
