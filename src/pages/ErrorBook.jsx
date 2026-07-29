import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { checkAnswer, shuffle, getDistractors } from '../utils/practice';
import useLocalData from '../hooks/useLocalData';
import useSpeech from '../hooks/useSpeech';

export default function ErrorBook() {
  const navigate = useNavigate();
  const { data, addErrorWord, recordErrorCorrect, updateData, addPoints, updateStatsData } = useLocalData();
  const { speak, supported: speechSupported } = useSpeech();

  const [practiceMode, setPracticeMode] = useState(null); // null | 'dictation' | 'choice'
  const [practiceWords, setPracticeWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [options, setOptions] = useState([]);
  const [result, setResult] = useState(null);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  const errorWords = data.errorWords || [];

  const startPractice = (mode) => {
    const words = shuffle(errorWords);
    setPracticeMode(mode);
    setPracticeWords(words);
    setCurrentIndex(0);
    setUserInput('');
    setResult(null);
    setCorrectAnswer('');
    setCompleted(false);
    setResults([]);
    setSelectedOption(null);

    if (mode === 'choice' && words.length > 0) {
      // 生成选择题选项
      const word = words[0];
      const allPool = data.errorWords || [];
      const distractors = getDistractors(allPool, word, Math.min(3, allPool.length - 1), 'chinese');
      setOptions(shuffle([word.chinese, ...distractors]));
    }
  };

  const currentWord = practiceWords[currentIndex];

  const handleDictationSubmit = () => {
    if (!currentWord || !userInput.trim() || result) return;
    const isCorrect = checkAnswer(userInput, currentWord.english);
    setResult(isCorrect ? 'correct' : 'wrong');
    setCorrectAnswer(currentWord.english);
    setResults(prev => [...prev, { word: currentWord, correct: isCorrect }]);
    recordErrorCorrect(currentWord.id, isCorrect);

    if (isCorrect) {
      setTimeout(() => advanceWord(), 1500);
    }
  };

  const handleChoiceSelect = (option) => {
    if (!currentWord || result) return;
    setSelectedOption(option);
    const isCorrect = option === currentWord.chinese;
    setResult(isCorrect ? 'correct' : 'wrong');
    setCorrectAnswer(currentWord.chinese);
    setResults(prev => [...prev, { word: currentWord, correct: isCorrect }]);
    recordErrorCorrect(currentWord.id, isCorrect);

    setTimeout(() => advanceWord(), isCorrect ? 1000 : 2000);
  };

  const advanceWord = () => {
    if (currentIndex < practiceWords.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setUserInput('');
      setResult(null);
      setCorrectAnswer('');
      setSelectedOption(null);

      if (practiceMode === 'choice' && practiceWords.length > 0) {
        const word = practiceWords[nextIdx];
        const allPool = data.errorWords || [];
        const distractors = getDistractors(allPool, word, Math.min(3, allPool.length - 1), 'chinese');
        setOptions(shuffle([word.chinese, ...distractors]));
      }
    } else {
      const correctCount = results.filter(r => r.correct).length;
      const wrongCount = results.length - correctCount;
      updateStatsData(correctCount, wrongCount);
      addPoints(correctCount * 3);
      setCompleted(true);
    }
  };

  const removeErrorWord = (wordId) => {
    updateData(prev => {
      const errorWords = prev.errorWords.filter(w => w.id !== wordId);
      return { ...prev, errorWords };
    });
  };

  // 练习完成界面
  if (practiceMode && completed) {
    const correctCount = results.filter(r => r.correct).length;
    const total = results.length;
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    return (
      <div className="max-w-md mx-auto py-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{percent >= 90 ? '🎉' : '💪'}</div>
          <h2 className="text-2xl font-bold text-emerald-700 mb-2">练习完成！</h2>
          <p className="text-gray-500">正确率 {percent}%</p>
        </div>
        <div className="flex flex-col gap-3">
          <button onClick={() => startPractice(practiceMode)} className="w-full py-3 bg-emerald-500 text-white rounded-2xl font-medium hover:bg-emerald-600 transition-colors cursor-pointer">
            再来一次 🔄
          </button>
          <button onClick={() => setPracticeMode(null)} className="w-full py-3 bg-white border-2 border-emerald-200 text-emerald-700 rounded-2xl font-medium hover:bg-emerald-50 transition-colors cursor-pointer">
            返回错词本
          </button>
        </div>
      </div>
    );
  }

  // 练习中
  if (practiceMode && currentWord) {
    const progress = ((currentIndex + (result ? 1 : 0)) / practiceWords.length) * 100;

    return (
      <div className="max-w-md mx-auto">
        <button onClick={() => setPracticeMode(null)} className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 mb-4 no-underline text-sm font-medium cursor-pointer">
          ← 返回错词本
        </button>

        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6 overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        {practiceMode === 'dictation' && (
          <>
            <div className="bg-white rounded-2xl border-2 border-emerald-200 p-6 mb-4 text-center">
              <p className="text-gray-400 text-xs mb-2">请写出对应的英文单词</p>
              <p className="text-2xl font-bold text-emerald-700">{currentWord.chinese}</p>
            </div>
            <input
              type="text"
              value={userInput}
              onChange={(e) => { if (!result || result === 'wrong') setUserInput(e.target.value); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (result === 'wrong') advanceWord();
                  else handleDictationSubmit();
                }
              }}
              placeholder="输入英文单词..."
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className={`w-full px-5 py-4 text-xl text-center rounded-2xl border-2 outline-none mb-4 ${
                result === 'correct' ? 'border-emerald-400 bg-emerald-50' :
                result === 'wrong' ? 'border-red-400 bg-red-50' :
                'border-gray-200 bg-white focus:border-emerald-400'
              }`}
            />
            {result === 'correct' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center mb-4">
                <p className="text-emerald-600 font-bold">✅ 正确！{currentWord.english}</p>
              </div>
            )}
            {result === 'wrong' && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center mb-4">
                <p className="text-red-600 font-bold">❌ 正确答案：{correctAnswer}</p>
                <button onClick={advanceWord} className="mt-2 px-6 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors cursor-pointer">
                  下一词 →
                </button>
              </div>
            )}
            {!result && (
              <button onClick={handleDictationSubmit} disabled={!userInput.trim()} className="w-full py-3 bg-emerald-500 text-white rounded-2xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                确认 (Enter)
              </button>
            )}
          </>
        )}

        {practiceMode === 'choice' && (
          <>
            <div className="bg-white rounded-2xl border-2 border-amber-200 p-6 mb-6 text-center">
              <p className="text-gray-400 text-xs mb-2">选出正确的中文意思</p>
              <div className="flex items-center justify-center gap-3">
                <p className="text-2xl font-bold text-gray-800">{currentWord.english}</p>
                {speechSupported && (
                  <button onClick={() => speak(currentWord.english)} className="text-xl cursor-pointer">🔊</button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 mb-4">
              {options.map((option, idx) => {
                let btnClass = 'bg-white border-gray-200 hover:border-amber-400';
                if (result && option === correctAnswer) btnClass = 'bg-emerald-50 border-emerald-400 text-emerald-700';
                else if (result && option === selectedOption && option !== correctAnswer) btnClass = 'bg-red-50 border-red-400 text-red-700';
                else if (result) btnClass = 'bg-white border-gray-200 opacity-50';

                return (
                  <button key={idx} onClick={() => handleChoiceSelect(option)} disabled={!!result}
                    className={`w-full px-5 py-4 rounded-2xl border-2 text-left font-medium transition-all cursor-pointer ${btnClass}`}>
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

  // 错词列表界面
  return (
    <div>
      <h1 className="text-2xl font-bold text-emerald-700 mb-1">错词本</h1>
      <p className="text-sm text-gray-400 mb-6">收集你做错的单词，反复练习直到掌握</p>

      {errorWords.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-4">
          <div className="text-6xl">🌟</div>
          <h3 className="text-xl font-bold text-gray-700">还没有错词哦</h3>
          <p className="text-gray-400 text-center max-w-xs">
            太棒了！继续保持，做错的单词会自动收集到这里。去做些练习吧！
          </p>
          <Link
            to="/"
            className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-medium hover:bg-emerald-600 transition-colors no-underline"
          >
            去学习 →
          </Link>
        </div>
      ) : (
        <>
          {/* 练习按钮 */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => startPractice('dictation')}
              className="flex-1 py-3 bg-sky-500 text-white rounded-2xl font-medium hover:bg-sky-600 transition-colors cursor-pointer"
            >
              ✍️ 默写练习
            </button>
            <button
              onClick={() => startPractice('choice')}
              className="flex-1 py-3 bg-amber-500 text-white rounded-2xl font-medium hover:bg-amber-600 transition-colors cursor-pointer"
            >
              🔤 选择练习
            </button>
          </div>

          {/* 错词列表 */}
          <div className="space-y-2">
            {errorWords.map((word) => (
              <div
                key={word.id}
                className="flex items-center justify-between bg-white rounded-2xl border border-red-100 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 text-lg">{word.english}</span>
                    {speechSupported && (
                      <button onClick={() => speak(word.english)} className="text-lg hover:scale-110 transition-transform cursor-pointer">
                        🔊
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{word.chinese}</p>
                </div>
                <button
                  onClick={() => removeErrorWord(word.id)}
                  className="ml-3 px-3 py-1.5 text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  title="已掌握，移除"
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
