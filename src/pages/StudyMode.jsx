import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useLocalData from '../hooks/useLocalData';

const dataModules = {
  '3a': () => import('../data/grade3a.json'),
  '3b': () => import('../data/grade3b.json'),
  '4a': () => import('../data/grade4a.json'),
  '4b': () => import('../data/grade4b.json'),
};

const modes = [
  { key: 'flashcards', label: '背诵模式', icon: '📇', desc: '翻卡片记单词', color: 'from-emerald-400 to-teal-500' },
  { key: 'dictation', label: '默写模式', icon: '✍️', desc: '看中文写英文', color: 'from-sky-400 to-blue-500' },
  { key: 'listening', label: '听写模式', icon: '🎧', desc: '听发音写单词', color: 'from-purple-400 to-pink-500' },
  { key: 'choice', label: '选择题模式', icon: '🔤', desc: '看英文选中文', color: 'from-amber-400 to-orange-500' },
  { key: 'sentence', label: '句子填空', icon: '📝', desc: '补全句子学用法', color: 'from-cyan-400 to-sky-500' },
  { key: 'test', label: '单元测试', icon: '🧪', desc: '听力·单选·判断·阅读，自动打分', color: 'from-violet-400 to-purple-600' },
  { key: 'challenge', label: '闯关测验', icon: '🏆', desc: '混合题型大挑战', color: 'from-rose-400 to-red-500' },
];

export default function StudyMode() {
  const { gradeTerm, unitId } = useParams();
  const navigate = useNavigate();
  const { data } = useLocalData();

  const [unitInfo, setUnitInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prevUnitId, setPrevUnitId] = useState(null);

  useEffect(() => {
    const loader = dataModules[gradeTerm];
    if (!loader) {
      setLoading(false);
      return;
    }

    loader().then(mod => {
      const gradeData = mod.default || mod;
      const unit = gradeData.units?.find(u => u.id === unitId);
      setUnitInfo(unit || null);

      // 找前一单元
      if (unit && unit.order > 1) {
        const prev = gradeData.units?.find(u => u.order === unit.order - 1);
        setPrevUnitId(prev?.id || null);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [gradeTerm, unitId]);

  // 检查闯关是否锁定
  const challengeLocked = prevUnitId
    ? !data.challengeStatus?.[prevUnitId]?.passed
    : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce mb-3">📚</div>
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

  // 检查闯关解锁状态（已在 useEffect 中处理）

  return (
    <div>
      {/* 返回和标题 */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={`/${gradeTerm}`}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors no-underline text-lg"
        >
          ←
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-emerald-700">
            {unitInfo.name}: {unitInfo.theme}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {unitInfo.words?.length || 0} 个单词 · 选择学习模式
          </p>
        </div>
      </div>

      {/* 模式入口 */}
      <div className="grid gap-3 md:gap-4">
        {modes.map((mode) => {
          const isChallenge = mode.key === 'challenge';
          const locked = isChallenge && challengeLocked;

          return (
            <button
              key={mode.key}
              onClick={() => { if (!locked) navigate(`/${gradeTerm}/${unitId}/${mode.key}`); }}
              disabled={locked}
              className={`group relative bg-white rounded-2xl border p-4 md:p-5 text-left transition-all duration-300 hover:shadow-lg active:scale-[0.98] cursor-pointer ${
                locked
                  ? 'border-gray-200 opacity-60 cursor-not-allowed'
                  : 'border-emerald-100 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${mode.color} text-white text-2xl shadow-md ${locked ? 'opacity-50' : ''}`}>
                  {locked ? '🔒' : mode.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800 text-base md:text-lg">
                      {mode.label}
                    </h3>
                    {isChallenge && !locked && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        挑战
                      </span>
                    )}
                    {locked && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                        需先通过上一单元
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{locked ? '通过前一单元闯关后解锁' : mode.desc}</p>
                </div>
                <span className="text-emerald-400 group-hover:translate-x-1 transition-transform text-lg">→</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
