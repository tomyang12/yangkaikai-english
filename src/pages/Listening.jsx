import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { checkAnswer, shuffle } from '../utils/practice';
import useSpeech from '../hooks/useSpeech';
import useLocalData from '../hooks/useLocalData';

const dataModules = {
  '3a': () => import('../data/grade3a.json'),
  '3b': () => import('../data/grade3b.json'),
  '4a': () => import('../data/grade4a.json'),
  '4b': () => import('../data/grade4b.json'),
};

export default function Listening() {
  const { gradeTerm, unitId } = useParams();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const { speak, supported: speechSupported } = useSpeech();
  const { addErrorWord, updateProgress, updateStatsData, addPoints } = useLocalData();

  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState(null);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState([]);
  const [unitName, setUnitName] = useState('');
  const [useFallback, setUseFallback] = useState(false);
  const [showChinese, setShowChinese] = useState(false);

  useEffect(() => {
    const loader = dataModules[gradeTerm];
    if (!loader) { setLoading(false); return; }
    loader().then(mod => {
      const gradeData = mod.default || mod;
      const unit = gradeData.units?.find(u => u.id === unitId);
      if (unit && unit.words) {
        setWords(shuffle(unit.words));
        setUnitName(`${unit.name}: ${unit.theme}`);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [gradeTerm, unitId]);

  // 自动播放发音
  useEffect(() => {
    if (!loading && words.length > 0 && !completed && speechSupported) {
      const timer = setTimeout(() => {
        speak(words[currentIndex].english);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, currentIndex, words, completed, speechSupported, speak]);

  // 发音失败时降级
  useEffect(() => {
    if (!speechSupported && !loading && !completed) {
      setUseFallback(true);
      setShowChinese(true);
    }
  }, [speechSupported, loading, completed]);

  useEffect(() => {
    if (inputRef.current && !completed) {
      inputRef.current.focus();
    }
  }, [currentIndex, completed]);

  const currentWord = words[currentIndex];

  const handleSubmit = useCallback(() => {
    if (!currentWord || !userInput.trim() || result) return;

    const isCorrect = checkAnswer(userInput, currentWord.english);
    setResult(isCorrect ? 'correct' : 'wrong');
    setCorrectAnswer(currentWord.english);
    setResults(prev => [...prev, { word: currentWord, correct: isCorrect }]);

    if (!isCorrect) {
      addErrorWord(currentWord);
    }

    if (isCorrect) {
      setTimeout(() => advanceWord(), 1500);
    }
  }, [currentWord, userInput, result, addErrorWord]);

  const advanceWord = useCallback(() => {
    setUserInput('');
    setResult(null);
    setCorrectAnswer('');
    setShowChinese(false);

    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      const correctCount = results.filter(r => r.correct).length;
      const wrongCount = results.length - correctCount;
      updateStatsData(correctCount, wrongCount);
      updateProgress(unitId, {
        listeningCompleted: true,
        lastStudied: new Date().toISOString(),
      });
      addPoints(correctCount * 2);
      setCompleted(true);
    }
  }, [currentIndex, words.length, results, unitId, updateStatsData, updateProgress, addPoints]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (completed) return;
      if (result === 'wrong') {
        advanceWord();
      } else {
        handleSubmit();
      }
    }
  };

  const handleReplay = () => {
    if (currentWord && speechSupported) {
      speak(currentWord.english);
    } else if (currentWord && !speechSupported) {
      setShowChinese(true);
    }
  };

  const restart = () => {
    setWords(shuffle(words));
    setCurrentIndex(0);
    setUserInput('');
    setResult(null);
    setCorrectAnswer('');
    setCompleted(false);
    setResults([]);
    setShowChinese(false);
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
          <div className="text-5xl mb-3">{percent >= 90 ? '🎉' : percent >= 60 ? '💪' : '🎧'}</div>
          <h2 className="text-2xl font-bold text-emerald-700 mb-2">听写完成！</h2>
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
          {wrongWords.length > 0 && (
            <button onClick={() => navigate('/error-book')} className="w-full py-3 bg-amber-500 text-white rounded-2xl font-medium hover:bg-amber-600 transition-colors cursor-pointer">
              错词专项练习 📝
            </button>
          )}
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

  const progress = ((currentIndex + (result ? 1 : 0)) / words.length) * 100;

  return (
    <div className="max-w-md mx-auto">
      <Link to={`/${gradeTerm}/${unitId}`} className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 mb-4 no-underline text-sm font-medium">
        ← 返回
      </Link>

      <h2 className="text-sm text-gray-400 text-center mb-1">{unitName}</h2>
      <p className="text-xs text-gray-300 text-center mb-4">
        {useFallback ? '听写模式（降级：看中文写英文）' : '听写模式'}
      </p>

      {/* 进度条 */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6 overflow-hidden">
        <div className="h-full bg-purple-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* 音频播放区域 */}
      <div className="bg-white rounded-2xl border-2 border-purple-200 p-6 mb-4 text-center">
        <p className="text-gray-400 text-xs mb-3">
          {speechSupported ? '请听发音，写出单词' : '请写出对应的英文单词'}
        </p>
        <div className="flex items-center justify-center gap-4 mb-2">
          <button
            onClick={handleReplay}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 text-3xl hover:bg-purple-200 transition-colors cursor-pointer"
            title="重新播放"
          >
            {speechSupported ? '🔊' : '👁️'}
          </button>
        </div>
        {!speechSupported && !showChinese && (
          <p className="text-xs text-amber-500">你的浏览器不支持语音播放，点击👁️查看中文</p>
        )}
        {showChinese && (
          <p className="text-xl md:text-2xl font-bold text-purple-700 mt-2">
            {currentWord.chinese}
          </p>
        )}
      </div>

      {/* 输入框 */}
      <div className="mb-4">
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={(e) => { if (!result || result === 'wrong') setUserInput(e.target.value); }}
          onKeyDown={handleKeyDown}
          placeholder="输入英文单词..."
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={`w-full px-5 py-4 text-xl text-center rounded-2xl border-2 outline-none transition-colors ${
            result === 'correct' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' :
            result === 'wrong' ? 'border-red-400 bg-red-50 text-red-700' :
            'border-gray-200 bg-white focus:border-purple-400'
          }`}
        />
      </div>

      {/* 结果反馈 */}
      {result === 'correct' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center mb-4">
          <p className="text-emerald-600 font-bold text-lg">✅ 正确！</p>
          <p className="text-emerald-500 text-sm">{currentWord.english}</p>
        </div>
      )}

      {result === 'wrong' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center mb-4">
          <p className="text-red-600 font-bold text-lg mb-1">❌ 不对哦</p>
          <p className="text-gray-500 text-sm mb-1">正确答案：</p>
          <p className="text-red-700 font-bold text-xl">{correctAnswer}</p>
          <button
            onClick={advanceWord}
            className="mt-3 px-6 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors cursor-pointer"
          >
            下一词 →
          </button>
        </div>
      )}

      {!result && (
        <button
          onClick={handleSubmit}
          disabled={!userInput.trim()}
          className="w-full py-3 bg-purple-500 text-white rounded-2xl font-medium hover:bg-purple-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          确认 (Enter)
        </button>
      )}

      <p className="text-center text-xs text-gray-300 mt-4">
        {currentIndex + 1} / {words.length} · Enter 提交
      </p>
    </div>
  );
}
