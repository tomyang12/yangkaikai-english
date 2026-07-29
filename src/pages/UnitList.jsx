import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useLocalData from '../hooks/useLocalData';

const gradeNames = {
  '3a': '三年级上册',
  '3b': '三年级下册',
  '4a': '四年级上册',
  '4b': '四年级下册',
};

const gradeEmojis = {
  '3a': '🌱',
  '3b': '🌿',
  '4a': '🌳',
  '4b': '🌴',
};

// 动态导入词库数据
const dataModules = {
  '3a': () => import('../data/grade3a.json'),
  '3b': () => import('../data/grade3b.json'),
  '4a': () => import('../data/grade4a.json'),
  '4b': () => import('../data/grade4b.json'),
};

function getStarDisplay(stars) {
  if (!stars || stars === 0) return '⬜';
  return '⭐'.repeat(stars);
}

export default function UnitList() {
  const { gradeTerm } = useParams();
  const navigate = useNavigate();
  const { data } = useLocalData();

  const [gradeData, setGradeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loader = dataModules[gradeTerm];
    if (!loader) {
      setError(`未找到册别: ${gradeTerm}`);
      setLoading(false);
      return;
    }

    setLoading(true);
    loader()
      .then(mod => {
        setGradeData(mod.default || mod);
        setLoading(false);
      })
      .catch(err => {
        console.error('加载词库失败:', err);
        setError('加载词库失败，请稍后再试');
        setLoading(false);
      });
  }, [gradeTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-4xl animate-bounce mb-3">📚</div>
          <p className="text-emerald-600 font-medium">正在加载词库...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-20 gap-4">
        <div className="text-4xl">😢</div>
        <p className="text-red-500 font-medium">{error}</p>
        <Link
          to="/"
          className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors no-underline"
        >
          返回首页
        </Link>
      </div>
    );
  }

  if (!gradeData || !gradeData.units) {
    return (
      <div className="flex flex-col items-center py-20 gap-4">
        <div className="text-4xl">📭</div>
        <p className="text-gray-500 font-medium">暂无数据</p>
        <Link
          to="/"
          className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors no-underline"
        >
          返回首页
        </Link>
      </div>
    );
  }

  const gradeName = gradeNames[gradeTerm] || gradeData.gradeName || gradeTerm;
  const emoji = gradeEmojis[gradeTerm] || '📖';

  return (
    <div>
      {/* 顶部返回和标题 */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/"
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors no-underline text-lg"
        >
          ←
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{emoji}</span>
            <h1 className="text-xl md:text-2xl font-bold text-emerald-700">
              {gradeName}
            </h1>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            共 {gradeData.units.length} 个单元
          </p>
        </div>
      </div>

      {/* 单元卡片列表 */}
      <div className="grid gap-3 md:gap-4">
        {gradeData.units.map((unit) => {
          const progress = data.progress?.[unit.id] || {};
          const challenge = data.challengeStatus?.[unit.id];
          const prevUnitId = unit.order > 1
            ? gradeData.units.find(u => u.order === unit.order - 1)?.id
            : null;
          const prevPassed = unit.order === 1 || data.challengeStatus?.[prevUnitId]?.passed;

          const wordCount = unit.words?.length || 0;
          const learnedCount = progress.learnedCount || 0;
          const progressPercent = wordCount > 0 ? Math.round((learnedCount / wordCount) * 100) : 0;

          return (
            <button
              key={unit.id}
              onClick={() => navigate(`/${gradeTerm}/${unit.id}`)}
              className="group relative bg-white rounded-2xl border border-emerald-100 p-4 md:p-5 text-left transition-all duration-300 hover:shadow-lg hover:border-emerald-300 active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                      {unit.name}
                    </span>
                    <span className="text-sm text-gray-500 truncate">
                      {unit.theme}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span>📝 {wordCount} 词</span>
                    {learnedCount > 0 && <span>✅ 已学 {learnedCount}</span>}
                  </div>

                  {/* 学习进度条 */}
                  {progressPercent > 0 && (
                    <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* 闯关状态 */}
                <div className="flex items-center gap-2 ml-3">
                  {!prevPassed ? (
                    <span className="text-lg" title="上一单元闯关未通过">🔒</span>
                  ) : challenge?.passed ? (
                    <span className="text-lg" title={`${challenge.stars || 0}星通过`}>
                      {getStarDisplay(challenge.stars)}
                    </span>
                  ) : (
                    <span className="text-lg opacity-50">⬜</span>
                  )}
                  <span className="text-emerald-400 group-hover:translate-x-1 transition-transform text-lg">→</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
