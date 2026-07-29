import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { checkAnswer, getDistractors, shuffle } from '../utils/practice';
import useSpeech from '../hooks/useSpeech';
import useLocalData from '../hooks/useLocalData';

const dataModules = {
  '3a': () => import('../data/grade3a.json'),
  '3b': () => import('../data/grade3b.json'),
  '4a': () => import('../data/grade4a.json'),
  '4b': () => import('../data/grade4b.json'),
};

export default function Choice() {
  const { gradeTerm, unitId } = useParams();
  const { speak, supported: speechSupported } = useSpeech();
  const { addErrorWord, updateProgress, updateStatsData, addPoints } = useLocalData();

  const [allWords, setAllWords] = useState([]);
  const [practiceWords, setPracticeWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [result, setResult] = useState(null); // 'correct' | 'wrong'
  const [correctOption, setCorrectOption] = useState('');
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState([]);
  const [unitName, setUnitName] = useState('');
  const [mode, setMode] = useState('en2cn'); // 'en2cn' | 'cn2en'

  useEffect(() => {
    const loader = dataModules[gradeTerm];
    if (!loader) { setLoading(false); return; }
    loader().then(mod => {
      const gradeData = mod.default || mod;
      const unit = gradeData.units?.find(u => u.id === unitId);
      if (unit && unit.words) {
        setAllWords(unit.words);
        setPracticeWords(shuffle(unit.words));
        setUnitName(`${unit.name}: ${unit.theme}`);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [gradeTerm, unitId]);

  // 生成选项
  useEffect(() => {
    if (!practiceWords.length) return;
    const currentWord = practiceWords[currentIndex];
    if (!currentWord) return;

    const field = mode === 'en2cn' ? 'chinese' : 'english';
    const correctField = mode === 'en2cn' ? 'english' : 'chinese';
    const correctValue = currentWord[field];
    const distractorField = mode === 'en2cn' ? 'chinese' : 'english';
    const distractors = getDistractors(allWords, currentWord, 3, distractorField);

    const allOptions = shuffle([correctValue, ...distractors]);
    setOptions(allOptions);
    setSelectedOption(null);
    setResult(null);
    setCorrectOption(correctValue);
  }, [practiceWords, currentIndex, mode, allWords]);

  const currentWord = practiceWords[currentIndex];

  const handleSelect = useCallback((option) => {
    if (result) return;

    setSelectedOption(option);
    const isCorrect = mode === 'en2cn'
      ? option === currentWord.chinese
      : option === currentWord.english;

    setResult(isCorrect ? 'correct' : 'wrong');

    if (!isCorrect) {
      addErrorWord(currentWord);
    }

    setResults(prev => [...prev, { word: currentWord, correct: isCorrect }]);

    // 1.5秒后自动下一题
    setTimeout(() => {
      if (currentIndex < practiceWords.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        setResult(null);
      } else {
        const correctCount = [...results, { word: currentWord, correct: isCorrect }].filter(r => r.correct).length;
        const total = practiceWords.length;
        updateStatsData(correctCount, total - correctCount);
        updateProgress(unitId, {
          choiceCompleted: true,
          lastStudied: new Date().toISOString(),
        });
        addPoints(correctCount * 2);
        setCompleted(true);
      }
    }, isCorrect ? 1000 : 2000);
  }, [result, currentWord, mode, currentIndex, practiceWords.length, results, addErrorWord, unitId, updateStatsData, updateProgress, addPoints]);

  const handleSpeak = (e) => {
    e.stopPropagation();
    if (currentWord) speak(currentWord.english);
  };

  const restart = () => {
    setPracticeWords(shuffle(allWords));
    setCurrentIndex(0);
    setSelectedOption(null);
    setResult(null);
    setCompleted(false);
    setResults([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce">📚</div>
      </div>
    );
  }

  if (completed) {
    const correctCount = results.filter(r => r.correct).length;
    const total = results.length;
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const wrongWords = results.filter(r => !r.correct);

    return (
      <div className="max-w-md mx-auto py-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{percent >= 90 ? '🎉' : percent >= 60 ? '💪' : '📚'}</div>
          <h2 className="text-2xl font-bold text-emerald-700 mb-2">选择题完成！</h2>
          <div className="flex justify-center gap-6 text-lg">
            <span className="text-emerald-600 font-bold">✅ {correctCount}</span>
            <span className="text-red-500 font-bold">❌ {total - correctCount}</span>
          </div>
          <p className="text-gray-500 mt-1">正确率 {percent}%</p>
        </div>

        {wrongWords.length > 0 && (
          <div className="bg-white rounded-2xl border border-red-100 p-4 mb-6">
            <h3 className="font-bold text-red-600 mb-3">需要复习的单词：</h3>
            <div className="space-y-2">
              {wrongWords.map((w, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded-xl">
                  <span className="font-medium text-gray-800">{w.word.english}</span>
                  <span className="text-sm text-gray-500">{w.word.chinese}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button onClick={restart} className="w-full py-3 bg-emerald-500 text-white rounded-2xl font-medium hover:bg-emerald-600 transition-colors cursor-pointer">
            再来一次 🔄
          </button>
          <Link to={`/${gradeTerm}/${unitId}`} className="w-full py-3 bg-white border-2 border-emerald-200 text-emerald-700 rounded-2xl font-medium text-center hover:bg-emerald-50 transition-colors no-underline">
            返回
          </Link>
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

  const progress = ((currentIndex + (result ? 1 : 0)) / practiceWords.length) * 100;

  return (
    <div className="max-w-md mx-auto">
      <Link to={`/${gradeTerm}/${unitId}`} className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 mb-4 no-underline text-sm font-medium">
        ← 返回
      </Link>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm text-gray-400">{unitName}</h2>
        <button
          onClick={() => setMode(mode === 'en2cn' ? 'cn2en' : 'en2cn')}
          className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors cursor-pointer"
        >
          {mode === 'en2cn' ? '英→中' : '中→英'}
        </button>
      </div>

      {/* 进度条 */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6 overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* 题目 */}
      <div className="bg-white rounded-2xl border-2 border-amber-200 p-6 mb-6 text-center">
        <p className="text-gray-400 text-xs mb-2">
          {mode === 'en2cn' ? '选出正确的中文意思' : '选出正确的英文单词'}
        </p>
        <div className="flex items-center justify-center gap-3 mb-1">
          <p className="text-2xl md:text-3xl font-bold text-gray-800">
            {mode === 'en2cn' ? currentWord.english : currentWord.chinese}
          </p>
          {mode === 'en2cn' && speechSupported && (
            <button
              onClick={handleSpeak}
              className="text-xl hover:scale-110 transition-transform cursor-pointer"
              title="发音"
            >
              🔊
            </button>
          )}
        </div>
      </div>

      {/* 选项 */}
      <div className="grid grid-cols-1 gap-3 mb-4">
        {options.map((option, idx) => {
          let btnClass = 'bg-white border-gray-200 hover:border-amber-400 hover:bg-amber-50';

          if (result && option === correctOption) {
            btnClass = 'bg-emerald-50 border-emerald-400 text-emerald-700';
          } else if (result && option === selectedOption && option !== correctOption) {
            btnClass = 'bg-red-50 border-red-400 text-red-700';
          } else if (result) {
            btnClass = 'bg-white border-gray-200 opacity-50';
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(option)}
              disabled={!!result}
              className={`w-full px-5 py-4 rounded-2xl border-2 text-left font-medium transition-all duration-200 cursor-pointer ${btnClass} ${
                !result ? 'active:scale-[0.98]' : ''
              }`}
            >
              <span className="text-gray-400 text-xs mr-2">
                {String.fromCharCode(65 + idx)}.
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {/* 反馈 */}
      {result === 'correct' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
          <p className="text-emerald-600 font-bold">✅ 正确！</p>
        </div>
      )}

      {result === 'wrong' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center">
          <p className="text-red-600 font-bold">❌ 正确答案：{correctOption}</p>
        </div>
      )}

      <p className="text-center text-xs text-gray-300 mt-4">
        {currentIndex + 1} / {practiceWords.length}
      </p>
    </div>
  );
}
