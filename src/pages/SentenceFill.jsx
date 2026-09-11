import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { checkAnswer, shuffle } from '../utils/practice';
import useLocalData from '../hooks/useLocalData';
import useSpeech from '../hooks/useSpeech';

const dataModules = {
  '3a': () => import('../data/grade3a.json'),
  '3b': () => import('../data/grade3b.json'),
  '4a': () => import('../data/grade4a.json'),
  '4b': () => import('../data/grade4b.json'),
};

// 将句子按目标词拆成前/后两段（用于内嵌挖空输入框）
function splitSentence(sentence, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = sentence.match(new RegExp(escaped, 'i'));
  if (!m) return null;
  const idx = m.index;
  return [sentence.slice(0, idx), sentence.slice(idx + word.length)];
}

export default function SentenceFill() {
  const { gradeTerm, unitId } = useParams();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const { data, addErrorWord, updateProgress, updateStatsData, addPoints } = useLocalData();
  const { speak, supported: speechSupported } = useSpeech();

  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState(null); // null | 'correct' | 'wrong'
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState([]);
  const [unitName, setUnitName] = useState('');
  const [showTranslation, setShowTranslation] = useState(false);

  useEffect(() => {
    const loader = dataModules[gradeTerm];
    if (!loader) { setLoading(false); return; }
    loader().then(mod => {
      const gradeData = mod.default || mod;
      const unit = gradeData.units?.find(u => u.id === unitId);
      if (unit && unit.words) {
        // 只保留配有例句的单词
        const withSentences = unit.words.filter(w => w.sentences && w.sentences.length >= 1);
        setWords(shuffle(withSentences));
        setUnitName(`${unit.name}: ${unit.theme}`);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [gradeTerm, unitId]);

  // 每题开始聚焦输入框
  useEffect(() => {
    if (inputRef.current && !completed && !result) {
      inputRef.current.focus();
    }
  }, [currentIndex, completed, result]);

  const currentWord = words[currentIndex];
  const sentence = currentWord?.sentences?.[0];
  const extra = currentWord?.sentences?.[1];
  const parts = sentence ? splitSentence(sentence.en, currentWord.english) : null;
  const isLastWord = currentIndex >= words.length - 1;

  const goNext = useCallback(() => {
    setShowTranslation(false);
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserInput('');
      setResult(null);
    } else {
      setCompleted(true);
      const correctCount = results.filter(r => r.correct).length;
      const total = results.length;
      updateStatsData(correctCount, total - correctCount);
      updateProgress(unitId, {
        sentenceCompleted: true,
        sentenceScore: total > 0 ? Math.round((correctCount / total) * 100) : 0,
        lastStudied: new Date().toISOString(),
      });
      addPoints(correctCount * 2);
    }
  }, [currentIndex, words.length, results, unitId, updateStatsData, updateProgress, addPoints]);

  const handleSubmit = useCallback(() => {
    if (!currentWord || !userInput.trim() || result) return;
    const isCorrect = checkAnswer(userInput, currentWord.english);
    setResult(isCorrect ? 'correct' : 'wrong');
    setResults(prev => [...prev, { word: currentWord, correct: isCorrect }]);
    if (!isCorrect) {
      addErrorWord(currentWord);
    }
    // 朗读完整句子加深语感
    if (speechSupported) speak(sentence.en);
    if (isCorrect) {
      setTimeout(() => goNext(), 2600);
    }
  }, [currentWord, userInput, result, addErrorWord, goNext, sentence, speechSupported, speak]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (completed) return;
      if (result === 'wrong') {
        goNext();
      } else if (result === 'correct') {
        goNext();
      } else {
        handleSubmit();
      }
    }
  };

  const restart = () => {
    setWords(shuffle(words));
    setCurrentIndex(0);
    setUserInput('');
    setResult(null);
    setCompleted(false);
    setResults([]);
    setShowTranslation(false);
  };

  const goToErrorPractice = () => {
    navigate('/error-book');
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
          <h2 className="text-2xl font-bold text-sky-700 mb-2">句子填空完成！</h2>
          <div className="flex justify-center gap-6 text-lg">
            <span className="text-emerald-600 font-bold">✅ {correctCount}</span>
            <span className="text-red-500 font-bold">❌ {total - correctCount}</span>
          </div>
          <p className="text-gray-500 mt-1">正确率 {percent}%</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={percent >= 80 ? '#0ea5e9' : percent >= 60 ? '#f59e0b' : '#ef4444'}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${percent * 2.51} 251`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-gray-700">{percent}%</span>
            </div>
          </div>
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
          <button onClick={restart} className="w-full py-3 bg-sky-500 text-white rounded-2xl font-medium hover:bg-sky-600 transition-colors cursor-pointer">
            再来一次 🔄
          </button>
          {wrongWords.length > 0 && (
            <button onClick={goToErrorPractice} className="w-full py-3 bg-amber-500 text-white rounded-2xl font-medium hover:bg-amber-600 transition-colors cursor-pointer">
              错词专项练习 📝
            </button>
          )}
          <Link to={`/${gradeTerm}/${unitId}`} className="w-full py-3 bg-white border-2 border-sky-200 text-sky-700 rounded-2xl font-medium text-center hover:bg-sky-50 transition-colors no-underline">
            返回
          </Link>
        </div>
      </div>
    );
  }

  if (!currentWord || !parts) {
    return (
      <div className="flex flex-col items-center py-20 gap-4">
        <div className="text-4xl">📭</div>
        <p className="text-gray-500">本单元暂无句子练习</p>
        <Link to={`/${gradeTerm}`} className="text-sky-600 no-underline">返回</Link>
      </div>
    );
  }

  const progress = words.length > 0 ? ((currentIndex + (result ? 1 : 0)) / words.length) * 100 : 0;

  return (
    <div className="max-w-md mx-auto">
      <Link to={`/${gradeTerm}/${unitId}`} className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 mb-4 no-underline text-sm font-medium">
        ← 返回
      </Link>

      <h2 className="text-sm text-gray-400 text-center mb-1">{unitName}</h2>
      <p className="text-xs text-gray-300 text-center mb-4">句子填空模式</p>

      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6 overflow-hidden">
        <div className="h-full bg-sky-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* 题目卡片：挖空句子 */}
      <div className="bg-white rounded-2xl border-2 border-sky-200 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-400 text-xs">把句子补充完整</p>
          {speechSupported && (
            <button
              onClick={() => speak(sentence.en)}
              className="text-xl hover:scale-110 transition-transform cursor-pointer"
              title="朗读句子"
            >🔊</button>
          )}
        </div>

        <p className="text-lg md:text-xl leading-loose text-gray-800">
          {parts[0]}
          <input
            ref={inputRef}
            type="text"
            value={result ? currentWord.english : userInput}
            readOnly={!!result}
            onChange={(e) => { if (!result) setUserInput(e.target.value); }}
            onKeyDown={handleKeyDown}
            autoComplete="off" autoCorrect="off" spellCheck={false}
            style={{ width: `${Math.max(currentWord.english.length + 3, 8)}ch` }}
            className={`inline-block mx-1 px-2 py-0.5 text-center rounded-lg border-b-4 outline-none transition-colors ${
              result === 'correct' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' :
              result === 'wrong' ? 'border-red-400 bg-red-50 text-red-700' :
              'border-sky-300 bg-sky-50 focus:border-sky-500 text-sky-700'
            }`}
          />
          {parts[1]}
        </p>

        {/* 词义提示 */}
        <p className="text-sm text-gray-400 mt-4 text-center">
          💡 空格处填：<span className="text-sky-600 font-bold">{currentWord.chinese}</span>
        </p>

        {/* 翻译开关 */}
        {!result && (
          <div className="text-center mt-4">
            <button
              onClick={() => setShowTranslation(!showTranslation)}
              className="text-xs px-4 py-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              {showTranslation ? '隐藏翻译 🙈' : '看句子翻译 👀'}
            </button>
            {showTranslation && (
              <p className="text-sm text-gray-500 mt-2 animate-pulse">{sentence.cn}</p>
            )}
          </div>
        )}
      </div>

      {/* 判定结果 */}
      {result === 'correct' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center mb-4">
          <p className="text-emerald-600 font-bold text-lg">✅ 太棒了！</p>
          <p className="text-emerald-500 text-sm">{sentence.en} · {sentence.cn}</p>
        </div>
      )}

      {result === 'wrong' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center mb-4">
          <p className="text-red-600 font-bold text-lg mb-1">❌ 再想想看</p>
          <p className="text-gray-500 text-sm mb-1">正确答案：</p>
          <p className="text-red-700 font-bold text-xl">{currentWord.english}</p>
          <p className="text-gray-600 text-sm mt-2">{sentence.en}</p>
          <p className="text-gray-500 text-sm">{sentence.cn}</p>
          <button onClick={goNext} className="mt-3 px-6 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors cursor-pointer">
            {isLastWord ? '查看成绩 →' : '下一题 →'}
          </button>
        </div>
      )}

      {/* 举一反三：拓展例句 */}
      {result && extra && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-amber-600 font-bold text-sm">🌟 举一反三 · 这个词还会这样用</p>
            {speechSupported && (
              <button
                onClick={() => speak(extra.en)}
                className="text-lg hover:scale-110 transition-transform cursor-pointer"
                title="朗读拓展句"
              >🔊</button>
            )}
          </div>
          <p className="text-gray-800 text-base">{extra.en}</p>
          <p className="text-gray-500 text-sm mt-1">{extra.cn}</p>
          <p className="text-amber-500 text-xs mt-2">—— {currentWord.english} · {currentWord.chinese}</p>
        </div>
      )}

      {!result && (
        <button onClick={handleSubmit} disabled={!userInput.trim()} className="w-full py-3 bg-sky-500 text-white rounded-2xl font-medium hover:bg-sky-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
          确认 (Enter)
        </button>
      )}

      <p className="text-center text-xs text-gray-300 mt-4">
        {currentIndex + 1} / {words.length} · Enter 提交
      </p>
    </div>
  );
}
