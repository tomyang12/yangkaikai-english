import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import useSpeech from '../hooks/useSpeech';
import useLocalData from '../hooks/useLocalData';

const dataModules = {
  '3a': () => import('../data/grade3a.json'),
  '3b': () => import('../data/grade3b.json'),
  '4a': () => import('../data/grade4a.json'),
  '4b': () => import('../data/grade4b.json'),
};

export default function Flashcards() {
  const { gradeTerm, unitId } = useParams();
  const { speak, supported: speechSupported } = useSpeech();
  const { updateProgress, updateStatsData, addPoints } = useLocalData();

  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [unitName, setUnitName] = useState('');

  useEffect(() => {
    const loader = dataModules[gradeTerm];
    if (!loader) { setLoading(false); return; }
    loader().then(mod => {
      const gradeData = mod.default || mod;
      const unit = gradeData.units?.find(u => u.id === unitId);
      if (unit) {
        setWords(unit.words || []);
        setUnitName(`${unit.name}: ${unit.theme}`);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [gradeTerm, unitId]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (currentIndex < words.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setIsFlipped(false);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
          setIsFlipped(false);
        }
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, words.length]);

  const currentWord = words[currentIndex];
  const progress = words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0;

  const nextWord = useCallback(() => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      // 完成
      setCompleted(true);
      updateProgress(unitId, { learnedCount: words.length, lastStudied: new Date().toISOString() });
      updateStatsData(words.length, 0);
      addPoints(10);
    }
  }, [currentIndex, words.length, unitId, updateProgress, updateStatsData, addPoints]);

  const prevWord = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const handleSpeak = (e) => {
    e.stopPropagation();
    if (currentWord) speak(currentWord.english);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce">📚</div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center py-12 gap-6">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-bold text-emerald-700">背诵完成！</h2>
        <p className="text-gray-500">你已学完本单元全部 {words.length} 个单词</p>
        <p className="text-emerald-600 font-bold text-lg">+10 积分 ⭐</p>
        <div className="flex gap-3">
          <Link
            to={`/${gradeTerm}/${unitId}`}
            className="px-6 py-3 bg-white border-2 border-emerald-300 text-emerald-700 rounded-2xl font-medium hover:bg-emerald-50 transition-colors no-underline"
          >
            返回
          </Link>
          <button
            onClick={() => { setCurrentIndex(0); setIsFlipped(false); setCompleted(false); }}
            className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-medium hover:bg-emerald-600 transition-colors cursor-pointer"
          >
            再来一次
          </button>
        </div>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="flex flex-col items-center py-20 gap-4">
        <div className="text-4xl">📭</div>
        <p className="text-gray-500">暂无单词</p>
        <Link to={`/${gradeTerm}`} className="text-emerald-600 no-underline">返回</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      {/* 返回 */}
      <Link
        to={`/${gradeTerm}/${unitId}`}
        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 mb-4 no-underline text-sm font-medium"
      >
        ← 返回
      </Link>

      {/* 单元信息 */}
      <h2 className="text-sm text-gray-400 text-center mb-2">{unitName}</h2>

      {/* 进度 */}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <span>{currentIndex + 1} / {words.length}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-6 overflow-hidden">
        <div
          className="h-full bg-emerald-400 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 卡片 */}
      <div
        className="relative w-full aspect-[3/4] cursor-pointer mb-6"
        style={{ perspective: '1000px' }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* 正面 - 英文 */}
          <div
            className="absolute inset-0 bg-white rounded-3xl border-2 border-emerald-200 shadow-lg flex flex-col items-center justify-center p-6"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-4xl md:text-5xl font-bold text-gray-800 text-center mb-6">
              {currentWord.english}
            </p>
            {speechSupported && (
              <button
                onClick={handleSpeak}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-2xl hover:bg-emerald-200 transition-colors cursor-pointer"
                title="点击发音"
              >
                🔊
              </button>
            )}
            <p className="absolute bottom-4 text-xs text-gray-300">点击翻转 →</p>
          </div>

          {/* 背面 - 中文 */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl border-2 border-emerald-200 shadow-lg flex flex-col items-center justify-center p-6"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-3xl md:text-4xl font-bold text-emerald-700 text-center">
              {currentWord.chinese}
            </p>
            <p className="absolute bottom-4 text-xs text-gray-300">点击翻转 ←</p>
          </div>
        </div>
      </div>

      {/* 导航按钮 */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={prevWord}
          disabled={currentIndex === 0}
          className="flex-1 py-3 rounded-2xl border-2 border-emerald-200 text-emerald-600 font-medium hover:bg-emerald-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          ← 上一个
        </button>
        <span className="text-sm text-gray-400">空格翻卡</span>
        <button
          onClick={nextWord}
          className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors cursor-pointer"
        >
          {currentIndex < words.length - 1 ? '下一个 →' : '完成 🎉'}
        </button>
      </div>

      <p className="text-center text-xs text-gray-300 mt-4">
        提示：点击卡片翻转 | ← → 方向键翻页 | 空格键翻转
      </p>
    </div>
  );
}
