import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { shuffle } from '../utils/practice';
import useLocalData from '../hooks/useLocalData';
import useSpeech from '../hooks/useSpeech';

const dataModules = {
  '3a': () => import('../data/grade3a.json'),
  '3b': () => import('../data/grade3b.json'),
  '4a': () => import('../data/grade4a.json'),
  '4b': () => import('../data/grade4b.json'),
};

const SECTIONS = [
  { key: 'listening', label: '一、听力题', icon: '🎧', desc: '听发音，选出中文意思', count: 5, per: 6 },
  { key: 'choice', label: '二、单选题', icon: '🔤', desc: '选出正确的一项', count: 5, per: 6 },
  { key: 'judge', label: '三、判断题', icon: '⚖️', desc: '判断中英文意思是否相符', count: 5, per: 4 },
  { key: 'reading', label: '四、阅读理解', icon: '📖', desc: '读短文，回答问题', count: 2, per: 10 },
];

const TOTAL = SECTIONS.reduce((s, x) => s + x.count * x.per, 0); // 100

// 从词池中抽 n 个不同的词（池不够时允许跨组复用，但同组内不重复）
function pickWords(pool, n) {
  const shuffled = shuffle(pool);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

// 干扰项：优先同单元，不够时从备用池补
function distract(correct, pool, toText, backup = []) {
  const opts = new Set([correct]);
  const candidates = shuffle(pool.filter(w => toText(w) !== correct));
  for (const w of candidates) {
    if (opts.size >= 4) break;
    opts.add(toText(w));
  }
  if (opts.size < 4) {
    for (const t of shuffle(backup.map(toText))) {
      if (opts.size >= 4) break;
      opts.add(t);
    }
  }
  return shuffle([...opts]);
}

// 组卷：听力 + 单选 + 判断 + 阅读
function buildPaper(words, reading, allWordsBackup) {
  const qs = [];
  const en = w => w.english;
  const cn = w => w.chinese;

  // 一、听力：听单词选中文（不显示拼写）
  const listenWords = pickWords(words, SECTIONS[0].count);
  listenWords.forEach((w) => {
    qs.push({
      type: 'listening', word: w,
      prompt: '🎧 听发音，选出它的中文意思',
      speakText: w.english,
      options: distract(w.chinese, words, cn, allWordsBackup),
      answer: w.chinese,
    });
  });

  // 二、单选：英选汉 / 汉选英 交替
  const choiceWords = pickWords(words, SECTIONS[1].count);
  choiceWords.forEach((w, i) => {
    const en2cn = i % 2 === 0;
    qs.push({
      type: 'choice', word: w,
      prompt: en2cn ? w.english : w.chinese,
      promptMode: en2cn ? 'en2cn' : 'cn2en',
      options: en2cn
        ? distract(w.chinese, words, cn, allWordsBackup)
        : distract(w.english, words, en, allWordsBackup),
      answer: en2cn ? w.chinese : w.english,
    });
  });

  // 三、判断：一半正确搭配、一半错误搭配
  const judgeWords = pickWords(words, SECTIONS[2].count);
  judgeWords.forEach((w, i) => {
    const other = words.find(x => x.id !== w.id && x.chinese !== w.chinese);
    const isRight = i % 2 === 0 || !other; // 词池无其他词时强制正确搭配
    const shown = isRight ? w.chinese : other.chinese;
    qs.push({
      type: 'judge', word: w,
      prompt: w.english,
      shownChinese: shown,
      options: ['✓ 相符', '✗ 不相符'],
      answer: isRight ? '✓ 相符' : '✗ 不相符',
    });
  });

  // 四、阅读理解
  reading?.questions?.forEach((q) => {
    qs.push({
      type: 'reading', word: null,
      prompt: q.q,
      passage: reading,
      options: shuffle(q.options),
      answer: q.answer,
    });
  });

  return qs;
}

export default function UnitTest() {
  const { gradeTerm, unitId } = useParams();
  const { data, addErrorWord, updateProgress, updateStatsData, addPoints } = useLocalData();
  const { speak, supported: speechSupported } = useSpeech();

  const [unitInfo, setUnitInfo] = useState(null);
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('intro'); // intro | testing | result
  const [paper, setPaper] = useState([]);
  const [answers, setAnswers] = useState({}); // {index: chosen}
  const [current, setCurrent] = useState(0);
  const [gradeInfo, setGradeInfo] = useState({ score: 0, detail: [] });
  const bestScore = data.progress?.[unitId]?.testScore;

  useEffect(() => {
    const loader = dataModules[gradeTerm];
    if (!loader) { setLoading(false); return; }
    Promise.all([
      loader().then(mod => {
        const gradeData = mod.default || mod;
        return gradeData.units?.find(u => u.id === unitId) || null;
      }),
      import('../data/readings.json').then(mod => {
        const all = mod.default || mod;
        return all[unitId] || null;
      }),
    ]).then(([unit, rd]) => {
      setUnitInfo(unit);
      setReading(rd);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [gradeTerm, unitId]);

  // 听力题进入时自动朗读
  const q = paper[current];
  useEffect(() => {
    if (phase === 'testing' && q?.type === 'listening' && speechSupported) {
      const t = setTimeout(() => speak(q.speakText), 350);
      return () => clearTimeout(t);
    }
  }, [current, phase, q, speechSupported, speak]);

  const startTest = useCallback(() => {
    if (!unitInfo?.words?.length) return;
    // 备用干扰池：同教材所有词
    const backupPool = [];
    const built = buildPaper(unitInfo.words, reading, backupPool);
    setPaper(built);
    setAnswers({});
    setCurrent(0);
    setPhase('testing');
  }, [unitInfo, reading]);

  const submit = useCallback(() => {
    const unanswered = paper.filter((_, i) => answers[i] === undefined).length;
    if (unanswered > 0 && !window.confirm(`还有 ${unanswered} 题没做，确定交卷吗？`)) return;

    // 按大题判分
    let idx = 0, score = 0, correctTotal = 0;
    const detail = SECTIONS.map(sec => {
      let correct = 0;
      for (let i = 0; i < sec.count; i++, idx++) {
        const item = paper[idx];
        if (answers[idx] === item.answer) { correct++; score += sec.per; }
      }
      correctTotal += correct;
      return { ...sec, correct, max: sec.count };
    });

    const wrongItems = paper.filter((item, i) => answers[i] !== item.answer);
    wrongItems.forEach(item => { if (item.word) addErrorWord(item.word); });
    updateStatsData(correctTotal, paper.length - correctTotal);
    updateProgress(unitId, {
      testCompleted: true,
      testScore: score,
      testDate: new Date().toISOString(),
      lastStudied: new Date().toISOString(),
    });
    addPoints(Math.round(score / 10));
    setGradeInfo({ score, detail });
    setPhase('result');
  }, [paper, answers, unitId, addErrorWord, updateStatsData, updateProgress, addPoints]);

  const choose = (opt) => {
    if (answers[current] !== undefined) return; // 已答锁定
    setAnswers(prev => ({ ...prev, [current]: opt }));
  };

  const isLast = current >= paper.length - 1;
  const answeredCount = Object.keys(answers).length;

  // ===== 读取中 =====
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce">📚</div>
      </div>
    );
  }

  if (!unitInfo) {
    return (
      <div className="flex flex-col items-center py-20 gap-4">
        <div className="text-4xl">😢</div>
        <p className="text-red-500 font-medium">未找到该单元</p>
        <Link to="/" className="px-4 py-2 bg-emerald-500 text-white rounded-xl no-underline">返回首页</Link>
      </div>
    );
  }

  const unitName = `${unitInfo.name}: ${unitInfo.theme}`;

  // ===== 成绩单 =====
  if (phase === 'result') {
    const s = gradeInfo.score;
    const emoji = s >= 90 ? '🎉' : s >= 80 ? '🌟' : s >= 60 ? '💪' : '📚';
    const comment = s >= 90 ? '太优秀了，你是单词小达人！' :
      s >= 80 ? '很棒！再练练就更稳了' :
      s >= 60 ? '及格啦，错题要复习哦' : '别灰心，先背单词再来挑战！';
    const wrong = paper
      .map((item, i) => ({ item, i }))
      .filter(({ item, i }) => answers[i] !== item.answer);

    return (
      <div className="max-w-md mx-auto py-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">{emoji}</div>
          <h2 className="text-2xl font-bold text-violet-700 mb-1">单元测试成绩单</h2>
          <p className="text-sm text-gray-400">{unitName}</p>
        </div>

        {/* 分数圆环 */}
        <div className="flex justify-center mb-6">
          <div className="relative w-28 h-28">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={s >= 80 ? '#8b5cf6' : s >= 60 ? '#f59e0b' : '#ef4444'}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${s * 2.51} 251`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-800">{s}</span>
              <span className="text-[10px] text-gray-400">满分 {TOTAL}</span>
            </div>
          </div>
        </div>
        <p className="text-center text-gray-600 font-medium mb-6">{comment}</p>

        {/* 分项得分 */}
        <div className="bg-white rounded-2xl border border-violet-100 p-4 mb-4">
          <h3 className="font-bold text-gray-700 mb-3 text-sm">📊 分项得分</h3>
          <div className="space-y-2">
            {gradeInfo.detail.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{d.icon} {d.label.replace(/^[一二三四]、/, '')}</span>
                <span className="font-medium">
                  <span className={d.correct === d.count ? 'text-emerald-600' : 'text-amber-600'}>
                    {d.correct * d.per} 分
                  </span>
                  <span className="text-gray-300"> / {d.count * d.per}（{d.correct}/{d.count} 题）</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 错题回顾 */}
        {wrong.length > 0 && (
          <div className="bg-white rounded-2xl border border-red-100 p-4 mb-6">
            <h3 className="font-bold text-red-600 mb-3 text-sm">❌ 错题回顾（{wrong.length} 题）</h3>
            <div className="space-y-3">
              {wrong.map(({ item, i }) => (
                <div key={i} className="p-3 bg-red-50 rounded-xl">
                  <p className="text-sm text-gray-700 mb-1">
                    {item.type === 'listening' && '🎧 '}
                    {item.type === 'reading' && '📖 '}
                    {item.prompt}
                    {item.type === 'judge' && <span className="text-gray-400"> · {item.shownChinese}</span>}
                  </p>
                  <p className="text-xs text-red-500">你的答案：{answers[i] || '未作答'}</p>
                  <p className="text-xs text-emerald-600 font-medium">正确答案：{item.answer}</p>
                  {item.word && (
                    <p className="text-xs text-gray-400 mt-1">
                      📌 {item.word.english} · {item.word.chinese}（已加入错题本）
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button onClick={startTest} className="w-full py-3 bg-violet-500 text-white rounded-2xl font-medium hover:bg-violet-600 transition-colors cursor-pointer">
            再考一次 🔄
          </button>
          {wrong.some(({ item }) => item.word) && (
            <Link to="/error-book" className="w-full py-3 bg-amber-500 text-white rounded-2xl font-medium text-center hover:bg-amber-600 transition-colors no-underline">
              错词专项练习 📝
            </Link>
          )}
          <Link to={`/${gradeTerm}/${unitId}`} className="w-full py-3 bg-white border-2 border-violet-200 text-violet-700 rounded-2xl font-medium text-center hover:bg-violet-50 transition-colors no-underline">
            返回
          </Link>
        </div>
      </div>
    );
  }

  // ===== 考试说明页 =====
  if (phase === 'intro') {
    return (
      <div className="max-w-md mx-auto py-8">
        <Link to={`/${gradeTerm}/${unitId}`} className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-700 mb-4 no-underline text-sm font-medium">
          ← 返回
        </Link>
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🧪</div>
          <h2 className="text-2xl font-bold text-violet-700">单元测试</h2>
          <p className="text-sm text-gray-400 mt-1">{unitName}</p>
          {bestScore !== undefined && (
            <p className="text-xs text-amber-600 mt-1">🏅 历史最好成绩：{bestScore} 分</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-violet-100 p-5 mb-6">
          <p className="text-sm font-bold text-gray-700 mb-3">📝 试卷结构（满分 {TOTAL} 分）</p>
          <div className="space-y-3">
            {SECTIONS.map((sec) => (
              <div key={sec.key} className="flex items-center gap-3">
                <span className="text-xl">{sec.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {sec.label}
                    <span className="text-gray-400 font-normal"> · {sec.count}题×{sec.per}分</span>
                  </p>
                  <p className="text-xs text-gray-400">{sec.desc}</p>
                </div>
                <span className="text-xs text-violet-400 font-medium">{sec.count * sec.per}分</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100">
            💡 答案提交后不可修改，全部作答后点「交卷」自动打分。听力题会自动播放发音，可点 🔊 重听。
          </p>
        </div>

        <button onClick={startTest} disabled={!unitInfo.words?.length} className="w-full py-3.5 bg-violet-500 text-white rounded-2xl font-bold text-lg hover:bg-violet-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
          开始考试 →
        </button>
      </div>
    );
  }

  // ===== 答题中 =====
  const sec = SECTIONS.find(s => paper[current]?.type === s.key) || {};
  const secIndex = SECTIONS.indexOf(sec);
  const firstQofSec = paper.reduce((acc, item, i) => (item.type === sec.key && acc === -1 ? i : acc), -1);
  const qNumInSec = current - firstQofSec + 1;
  const progress = ((current + (answers[current] !== undefined ? 1 : 0)) / paper.length) * 100;

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-between mb-3">
        <Link to={`/${gradeTerm}/${unitId}`} className="text-violet-600 hover:text-violet-700 no-underline text-sm font-medium">← 退出</Link>
        <span className="text-xs text-gray-400">
          第 {secIndex + 1} 部分 · {sec.label?.replace(/^[一二三四]、/, '')} · {qNumInSec}/{sec.count}
        </span>
      </div>
      <h2 className="text-sm text-gray-400 text-center mb-1">{unitName} · 单元测试</h2>

      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-5 overflow-hidden">
        <div className="h-full bg-violet-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* 阅读短文 */}
      {q?.passage && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-amber-600 font-bold text-sm">📖 {q.passage.title}</p>
            {speechSupported && (
              <button onClick={() => speak(q.passage.text)} className="text-lg hover:scale-110 transition-transform cursor-pointer" title="朗读短文">🔊</button>
            )}
          </div>
          <p className="text-gray-800 text-base leading-relaxed">{q.passage.text}</p>
        </div>
      )}

      {/* 题目卡片 */}
      <div className="bg-white rounded-2xl border-2 border-violet-200 p-6 mb-4">
        {/* 听力题：发音区 */}
        {q?.type === 'listening' && (
          <div className="text-center mb-4">
            <button
              onClick={() => speak(q.speakText)}
              className="w-16 h-16 rounded-full bg-violet-500 text-white text-3xl shadow-lg hover:bg-violet-600 hover:scale-105 transition-all cursor-pointer active:scale-95"
              title="点击重听"
            >🔊</button>
            <p className="text-xs text-gray-400 mt-2">点喇叭可重听</p>
          </div>
        )}

        <p className={`mb-5 ${q?.type === 'choice' && q.promptMode === 'en2cn' ? 'text-2xl font-bold text-center text-gray-800' : 'text-base font-medium text-center text-gray-800'}`}>
          {q?.type === 'judge' ? (
            <>
              <span className="text-2xl font-bold text-violet-700 mr-2">{q.prompt}</span>
              <span className="text-gray-500">的意思是「{q.shownChinese}」</span>
            </>
          ) : (
            q?.prompt
          )}
        </p>

        {/* 选项 */}
        <div className="space-y-2.5">
          {q?.options.map((opt, i) => {
            const selected = answers[current] === opt;
            return (
              <button
                key={i}
                onClick={() => choose(opt)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                  selected
                    ? 'border-violet-500 bg-violet-50 text-violet-700 font-bold'
                    : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/40 text-gray-700'
                }`}
              >
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mr-3 font-bold ${
                  selected ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{'ABCD'[i]}</span>
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* 答题卡 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-4">
        <div className="flex flex-wrap gap-1.5 justify-center">
          {paper.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                i === current ? 'bg-violet-500 text-white' :
                answers[i] !== undefined ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
              }`}
            >{i + 1}</button>
          ))}
        </div>
      </div>

      {/* 导航按钮 */}
      <div className="flex gap-3">
        {current > 0 && (
          <button onClick={() => setCurrent(current - 1)} className="flex-1 py-3 bg-white border-2 border-violet-200 text-violet-600 rounded-2xl font-medium hover:bg-violet-50 transition-colors cursor-pointer">
            上一题
          </button>
        )}
        {!isLast ? (
          <button onClick={() => setCurrent(current + 1)} disabled={answers[current] === undefined} className="flex-[2] py-3 bg-violet-500 text-white rounded-2xl font-medium hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
            下一题 →
          </button>
        ) : (
          <button onClick={submit} className="flex-[2] py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-2xl font-bold hover:opacity-90 transition-all cursor-pointer">
            交卷 · 自动打分（{answeredCount}/{paper.length}）
          </button>
        )}
      </div>

      <p className="text-center text-xs text-gray-300 mt-4">
        已答 {answeredCount} / {paper.length} 题 · 交卷后自动评分
      </p>
    </div>
  );
}
