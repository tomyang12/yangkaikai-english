import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { checkAnswer, getDistractors, shuffle, calcChallengeResult } from '../utils/practice';
import useSpeech from '../hooks/useSpeech';
import useLocalData from '../hooks/useLocalData';

const dataModules = {
  '3a': () => import('../data/grade3a.json'),
  '3b': () => import('../data/grade3b.json'),
  '4a': () => import('../data/grade4a.json'),
  '4b': () => import('../data/grade4b.json'),
};

export default function Challenge() {
  const { gradeTerm, unitId } = useParams();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const { speak, supported: speechSupported } = useSpeech();
  const { data, addErrorWord, updateChallengeStatus, updateStatsData, addPoints, updateProgress } = useLocalData();

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [options, setOptions] = useState([]);
  const [result, setResult] = useState(null);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState([]);
  const [unitName, setUnitName] = useState('');
  const [allWords, setAllWords] = useState([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showChinese, setShowChinese] = useState(false);

  // 检查是否已解锁
  useEffect(() => {
    if (loading) return;
    const loader = dataModules[gradeTerm];
    if (!loader) return;

    loader().then(mod => {
      const gradeData = mod.default || mod;
      const unit = gradeData.units?.find(u => u.id === unitId);
      if (!unit) return;

      const prevUnitOrder = (unit.order || 1) - 1;
      if (prevUnitOrder > 0) {
        const prevUnit = gradeData.units?.find(u => u.order === prevUnitOrder);
        if (prevUnit && !data.challengeStatus?.[prevUnit.id]?.passed) {
          setLoading(false);
          return;
        }
      }
    });
  }, [gradeTerm, unitId, loading, data.challengeStatus]);

  // 生成题目
  useEffect(() => {
    const loader = dataModules[gradeTerm];
    if (!loader) { setLoading(false); return; }
    loader().then(mod => {
      const gradeData = mod.default || mod;
      const unit = gradeData.units?.find(u => u.id === unitId);
      if (!unit || !unit.words) {
        setLoading(false);
        return;
      }

      setAllWords(unit.words);
      setUnitName(`${unit.name}: ${unit.theme}`);

      const words = shuffle(unit.words);
      const total = words.length;
      const dictationCount = Math.round(total * 0.4);
      const listeningCount = Math.round(total * 0.2);
      const en2cnCount = Math.round(total * 0.2);
      const cn2enCount = total - dictationCount - listeningCount - en2cnCount;

      let idx = 0;
      const qs = [];

      // 默写 40%
      for (let i = 0; i < dictationCount && idx < words.length; i++, idx++) {
        qs.push({ type: 'dictation', word: words[idx] });
      }
      // 听写 20%
      for (let i = 0; i < listeningCount && idx < words.length; i++, idx++) {
        qs.push({ type: 'listening', word: words[idx] });
      }
      // 英选汉 20%
      for (let i = 0; i < en2cnCount && idx < words.length; i++, idx++) {
        const distractors = getDistractors(unit.words, words[idx], 3, 'chinese');
        const opts = shuffle([words[idx].chinese, ...distractors]);
        qs.push({ type: 'en2cn', word: words[idx], options: opts });
      }
      // 汉选英 20%
      for (let i = 0; i < cn2enCount && idx < words.length; i++, idx++) {
        const distractors = getDistractors(unit.words, words[idx], 3, 'english');
        const opts = shuffle([words[idx].english, ...distractors]);
        qs.push({ type: 'cn2en', word: words[idx], options: opts });
      }

      setQuestions(shuffle(qs));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [gradeTerm, unitId]);

  // 生成选择题选项
  useEffect(() => {
    const q = questions[currentIndex];
    if (!q || (q.type !== 'en2cn' && q.type !== 'cn2en')) return;
    setOptions(q.options || []);
  }, [currentIndex, questions]);

  // 自动播放听写
  useEffect(() => {
    const q = questions[currentIndex];
    if (!q || q.type !== 'listening' || loading || completed || !speechSupported) return;
    const timer = setTimeout(() => speak(q.word.english), 300);
    return () => clearTimeout(timer);
  }, [currentIndex, questions, loading, completed, speechSupported, speak]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [currentIndex]);

  const currentQ = questions[currentIndex];

  const handleSubmit = useCallback(() => {
    if (!currentQ || result) return;

    if (currentQ.type === 'dictation' || currentQ.type === 'listening') {
      if (!userInput.trim()) return;
      const isCorrect = checkAnswer(userInput, currentQ.word.english);
      setResult(isCorrect ? 'correct' : 'wrong');
      setCorrectAnswer(currentQ.word.english);
      setResults(prev => [...prev, { word: currentQ.word, correct: isCorrect }]);
      if (!isCorrect) addErrorWord(currentQ.word);
      if (isCorrect) setTimeout(() => advanceWord(), 1000);
    }
  }, [currentQ, userInput, result, addErrorWord]);

  const handleChoiceSelect = useCallback((option) => {
    if (!currentQ || result) return;

    setSelectedOption(option);
    const correctVal = currentQ.type === 'en2cn' ? currentQ.word.chinese : currentQ.word.english;
    const isCorrect = option === correctVal;

    setResult(isCorrect ? 'correct' : 'wrong');
    setCorrectAnswer(correctVal);
    setResults(prev => [...prev, { word: currentQ.word, correct: isCorrect }]);

    if (!isCorrect) addErrorWord(currentQ.word);

    setTimeout(() => advanceWord(), isCorrect ? 1000 : 2000);
  }, [currentQ, result, addErrorWord]);

  const advanceWord = useCallback(() => {
    setUserInput('');
    setSelectedOption(null);
    setResult(null);
    setCorrectAnswer('');
    setShowChinese(false);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      const correctCount = results.filter(r => r.correct).length;
      const total = questions.length;
      const wrongCount = total - correctCount;

      const { score, stars, passed } = calcChallengeResult(correctCount, total);

      updateStatsData(correctCount, wrongCount);
      updateChallengeStatus(unitId, {
        passed,
        stars,
        score,
        completedAt: new Date().toISOString(),
      });
      updateProgress(unitId, {
        challengeCompleted: true,
        challengeStars: stars,
        lastStudied: new Date().toISOString(),
      });

      if (passed) {
        addPoints(score);
      }

      setCompleted(true);
    }
  }, [currentIndex, questions.length, results, unitId, updateStatsData, updateChallengeStatus, updateProgress, addPoints]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (result === 'wrong') {
        advanceWord();
      } else {
        handleSubmit();
      }
    }
  };

  const restart = () => {
    const words = shuffle(allWords);
    const total = words.length;
    const dictationCount = Math.round(total * 0.4);
    const listeningCount = Math.round(total * 0.2);
    const en2cnCount = Math.round(total * 0.2);
    const cn2enCount = total - dictationCount - listeningCount - en2cnCount;

    let idx = 0;
    const qs = [];
    for (let i = 0; i < dictationCount && idx < words.length; i++, idx++) {
      qs.push({ type: 'dictation', word: words[idx] });
    }
    for (let i = 0; i < listeningCount && idx < words.length; i++, idx++) {
      qs.push({ type: 'listening', word: words[idx] });
    }
    for (let i = 0; i < en2cnCount && idx < words.length; i++, idx++) {
      const distractors = getDistractors(allWords, words[idx], 3, 'chinese');
      qs.push({ type: 'en2cn', word: words[idx], options: shuffle([words[idx].chinese, ...distractors]) });
    }
    for (let i = 0; i < cn2enCount && idx < words.length; i++, idx++) {
      const distractors = getDistractors(allWords, words[idx], 3, 'english');
      qs.push({ type: 'cn2en', word: words[idx], options: shuffle([words[idx].english, ...distractors]) });
    }

    setQuestions(shuffle(qs));
    setCurrentIndex(0);
    setUserInput('');
    setSelectedOption(null);
    setResult(null);
    setCorrectAnswer('');
    setCompleted(false);
    setResults([]);
  };

  const handleReplay = () => {
    if (currentQ && speechSupported) speak(currentQ.word.english);
    else if (currentQ) setShowChinese(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce">📚</div>
      </div>
    );
  }

  // 完成界面
  if (completed) {
    const correctCount = results.filter(r => r.correct).length;
    const total = questions.length;
    const { score, stars, passed } = calcChallengeResult(correctCount, total);
    const wrongWords = results.filter(r => !r.correct);

    return (
      <div className="max-w-md mx-auto py-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">
            {stars === 3 ? '🏆' : stars === 2 ? '🌟' : stars === 1 ? '⭐' : '💪'}
          </div>
          <h2 className="text-2xl font-bold text-emerald-700 mb-2">
            {passed ? '闯关成功！' : '闯关失败'}
          </h2>
          <div className="flex justify-center items-center gap-2 mb-2">
            <span className="text-2xl">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
          </div>
          <div className="flex justify-center gap-6 text-lg mb-1">
            <span className="text-emerald-600 font-bold">✅ {correctCount}</span>
            <span className="text-red-500 font-bold">❌ {total - correctCount}</span>
          </div>
          <p className="text-gray-500">得分 {score} 分</p>
          {passed && <p className="text-emerald-600 font-bold mt-1">+{score} 积分 ⭐</p>}
        </div>

        {/* 题型分析 */}
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 mb-6">
          <h3 className="font-bold text-gray-700 mb-2">题型分析</h3>
          {['dictation', 'listening', 'en2cn', 'cn2en'].map(type => {
            const typeResults = results.filter((r, i) => {
              const q = questions[i];
              return q?.type === type;
            });
            const typeCorrect = typeResults.filter(r => r.correct).length;
            const typeTotal = typeResults.length;
            if (typeTotal === 0) return null;
            const typeNames = { dictation: '默写', listening: '听写', en2cn: '英选汉', cn2en: '汉选英' };
            return (
              <div key={type} className="flex items-center justify-between py-1 text-sm">
                <span>{typeNames[type]}</span>
                <span className={typeCorrect === typeTotal ? 'text-emerald-600' : 'text-gray-500'}>
                  {typeCorrect}/{typeTotal}
                </span>
              </div>
            );
          })}
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

  if (!currentQ) {
    return (
      <div className="flex flex-col items-center py-20 gap-4">
        <div className="text-4xl">📭</div>
        <p className="text-gray-500">暂无题目</p>
        <Link to={`/${gradeTerm}`} className="text-emerald-600 no-underline">返回</Link>
      </div>
    );
  }

  const progress = ((currentIndex + (result ? 1 : 0)) / questions.length) * 100;
  const typeNames = { dictation: '默写', listening: '听写', en2cn: '英选汉', cn2en: '汉选英' };
  const typeColors = { dictation: 'bg-sky-100 text-sky-700', listening: 'bg-purple-100 text-purple-700', en2cn: 'bg-amber-100 text-amber-700', cn2en: 'bg-rose-100 text-rose-700' };

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link to={`/${gradeTerm}/${unitId}`} className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 no-underline text-sm font-medium">
          ← 返回
        </Link>
        <button
          onClick={() => setShowExitConfirm(true)}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
        >
          退出测验
        </button>
      </div>

      {/* 退出确认 */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">确定要退出吗？</h3>
            <p className="text-sm text-gray-500 mb-4">退出后当前进度不会保存</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                继续答题
              </button>
              <button
                onClick={() => navigate(`/${gradeTerm}/${unitId}`)}
                className="flex-1 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors cursor-pointer"
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 题目标签 */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${typeColors[currentQ.type]}`}>
          {typeNames[currentQ.type]}
        </span>
        <span className="text-xs text-gray-400">{currentIndex + 1}/{questions.length}</span>
      </div>

      {/* 进度条 */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6 overflow-hidden">
        <div className="h-full bg-rose-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* 默写/听写题型 */}
      {(currentQ.type === 'dictation' || currentQ.type === 'listening') && (
        <>
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 mb-4 text-center">
            <p className="text-gray-400 text-xs mb-2">
              {currentQ.type === 'dictation' ? '请写出对应的英文单词' : '请听发音，写出单词'}
            </p>
            <p className="text-2xl md:text-3xl font-bold text-gray-800">
              {currentQ.type === 'dictation' ? currentQ.word.chinese : (
                speechSupported ? '🔊 请听发音' : currentQ.word.chinese
              )}
            </p>
            {currentQ.type === 'listening' && (
              <button
                onClick={handleReplay}
                className="mt-3 flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-purple-100 text-2xl hover:bg-purple-200 transition-colors cursor-pointer"
              >
                {speechSupported ? '🔊' : '👁️'}
              </button>
            )}
            {currentQ.type === 'listening' && showChinese && (
              <p className="text-xl text-purple-700 mt-2">{currentQ.word.chinese}</p>
            )}
          </div>

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
            className={`w-full px-5 py-4 text-xl text-center rounded-2xl border-2 outline-none transition-colors mb-4 ${
              result === 'correct' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' :
              result === 'wrong' ? 'border-red-400 bg-red-50 text-red-700' :
              'border-gray-200 bg-white focus:border-rose-400'
            }`}
          />

          {result === 'correct' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center mb-4">
              <p className="text-emerald-600 font-bold">✅ 正确！{currentQ.word.english}</p>
            </div>
          )}
          {result === 'wrong' && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center mb-4">
              <p className="text-red-600 font-bold">❌ 正确答案：{correctAnswer}</p>
              <button onClick={advanceWord} className="mt-2 px-6 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors cursor-pointer">
                下一题 →
              </button>
            </div>
          )}
          {!result && (
            <button
              onClick={handleSubmit}
              disabled={!userInput.trim()}
              className="w-full py-3 bg-rose-500 text-white rounded-2xl font-medium hover:bg-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              确认 (Enter)
            </button>
          )}
        </>
      )}

      {/* 选择题题型 */}
      {(currentQ.type === 'en2cn' || currentQ.type === 'cn2en') && (
        <>
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 mb-6 text-center">
            <p className="text-gray-400 text-xs mb-2">
              {currentQ.type === 'en2cn' ? '选出正确的中文意思' : '选出正确的英文单词'}
            </p>
            <p className="text-2xl md:text-3xl font-bold text-gray-800">
              {currentQ.type === 'en2cn' ? currentQ.word.english : currentQ.word.chinese}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 mb-4">
            {options.map((option, idx) => {
              const correctVal = currentQ.type === 'en2cn' ? currentQ.word.chinese : currentQ.word.english;
              let btnClass = 'bg-white border-gray-200 hover:border-rose-400';

              if (result && option === correctVal) {
                btnClass = 'bg-emerald-50 border-emerald-400 text-emerald-700';
              } else if (result && option === selectedOption && option !== correctVal) {
                btnClass = 'bg-red-50 border-red-400 text-red-700';
              } else if (result) {
                btnClass = 'bg-white border-gray-200 opacity-50';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleChoiceSelect(option)}
                  disabled={!!result}
                  className={`w-full px-5 py-4 rounded-2xl border-2 text-left font-medium transition-all duration-200 cursor-pointer ${btnClass} ${
                    !result ? 'active:scale-[0.98]' : ''
                  }`}
                >
                  <span className="text-gray-400 text-xs mr-2">{String.fromCharCode(65 + idx)}.</span>
                  {option}
                </button>
              );
            })}
          </div>

          {result === 'correct' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
              <p className="text-emerald-600 font-bold">✅ 正确！</p>
            </div>
          )}
          {result === 'wrong' && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center">
              <p className="text-red-600 font-bold">❌ 正确答案：{correctAnswer}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
