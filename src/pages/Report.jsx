import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { BADGE_DEFS } from '../utils/badge';
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

const dataModules = {
  '3a': () => import('../data/grade3a.json'),
  '3b': () => import('../data/grade3b.json'),
  '4a': () => import('../data/grade4a.json'),
  '4b': () => import('../data/grade4b.json'),
};

export default function Report() {
  const { data } = useLocalData();
  const stats = data.stats || {};
  const progress = data.progress || {};
  const challengeStatus = data.challengeStatus || {};
  const badges = data.badges || [];
  const totalPoints = data.totalPoints || 0;

  const totalWords = stats.totalWordsPracticed || 0;
  const totalCorrect = stats.totalCorrect || 0;
  const totalWrong = stats.totalWrong || 0;
  const accuracy = totalWords > 0 ? Math.round((totalCorrect / totalWords) * 100) : 0;
  const totalDays = stats.totalDays || 0;
  const errorCount = (data.errorWords || []).length;

  const [wordCounts, setWordCounts] = useState({});

  useEffect(() => {
    // 加载所有词库获取每个单元的单词数量
    const loadAll = async () => {
      const counts = {};
      for (const gt of Object.keys(dataModules)) {
        try {
          const mod = await dataModules[gt]();
          const gradeData = mod.default || mod;
          (gradeData.units || []).forEach(u => {
            counts[u.id] = (u.words || []).length;
          });
        } catch (e) {
          // ignore
        }
      }
      setWordCounts(counts);
    };
    loadAll();
  }, []);

  // 单元进度
  const gradeTerms = ['3a', '3b', '4a', '4b'];
  const unitProgress = [];

  for (const gt of gradeTerms) {
    const units = [];
    for (const [unitId, p] of Object.entries(progress)) {
      if (unitId.startsWith(gt)) {
        units.push({ unitId, ...p });
      }
    }
    if (units.length > 0) {
      unitProgress.push({ gradeTerm: gt, units });
    }
  }

  // 闯关统计
  const totalChallenges = Object.keys(challengeStatus).length;
  const passedChallenges = Object.values(challengeStatus).filter(s => s.passed).length;
  const totalStars = Object.values(challengeStatus).reduce((sum, s) => sum + (s.stars || 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-emerald-700 mb-1">学习报告</h1>
      <p className="text-sm text-gray-400 mb-6">记录你的学习成长</p>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 text-center">
          <div className="text-2xl mb-1">📅</div>
          <div className="text-2xl font-bold text-emerald-700">{totalDays}</div>
          <div className="text-xs text-gray-400">学习天数</div>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 text-center">
          <div className="text-2xl mb-1">📝</div>
          <div className="text-2xl font-bold text-sky-600">{totalWords}</div>
          <div className="text-xs text-gray-400">练习单词</div>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 text-center">
          <div className="text-2xl mb-1">🎯</div>
          <div className="text-2xl font-bold text-amber-600">{accuracy}%</div>
          <div className="text-xs text-gray-400">正确率</div>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 text-center">
          <div className="text-2xl mb-1">⭐</div>
          <div className="text-2xl font-bold text-rose-600">{totalPoints}</div>
          <div className="text-xs text-gray-400">总积分</div>
        </div>
      </div>

      {/* 闯关统计 */}
      {totalChallenges > 0 && (
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 mb-6">
          <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span>🏆</span> 闯关记录
          </h3>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-emerald-600">{passedChallenges}/{totalChallenges}</div>
              <div className="text-xs text-gray-400">已通过</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-amber-600">{totalStars}</div>
              <div className="text-xs text-gray-400">总星星</div>
            </div>
            <div className="flex-1">
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: `${totalChallenges > 0 ? (passedChallenges / totalChallenges) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 错词统计 */}
      {errorCount > 0 && (
        <div className="bg-red-50 rounded-2xl border border-red-100 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-red-600">📖 错词本</span>
              <p className="text-sm text-red-500 mt-0.5">还有 {errorCount} 个单词需要复习</p>
            </div>
            <Link
              to="/error-book"
              className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors no-underline"
            >
              去复习 →
            </Link>
          </div>
        </div>
      )}

      {/* 徽章展示 */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span>🏅</span> 徽章
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {BADGE_DEFS.map((badge) => {
            const earned = badges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`rounded-2xl border p-3 text-center transition-all ${
                  earned
                    ? 'bg-white border-amber-300 shadow-sm'
                    : 'bg-gray-50 border-gray-200 opacity-40'
                }`}
              >
                <div className={`text-2xl mb-1 ${earned ? '' : 'grayscale'}`}>
                  {badge.icon}
                </div>
                <div className={`text-xs font-medium ${earned ? 'text-gray-700' : 'text-gray-400'}`}>
                  {badge.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 各单元进度 */}
      {unitProgress.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-700 mb-3">📊 学习进度</h3>
          <div className="space-y-4">
            {unitProgress.map(({ gradeTerm, units }) => (
              <div key={gradeTerm}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{gradeEmojis[gradeTerm] || '📖'}</span>
                  <span className="text-sm font-medium text-gray-600">
                    {gradeNames[gradeTerm] || gradeTerm}
                  </span>
                </div>
                <div className="space-y-2">
                  {units.map((unit) => {
                    const learnedCount = unit.learnedCount || 0;
                    const challenge = challengeStatus[unit.unitId];
                    const wordCount = wordCounts[unit.unitId] || 12;
                    const percent = wordCount > 0 ? Math.min(100, Math.round((learnedCount / wordCount) * 100)) : 0;

                    return (
                      <div key={unit.unitId} className="bg-white rounded-xl border border-gray-100 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {unit.unitId.replace(/^\d\w-/, 'Unit ')}
                          </span>
                          <div className="flex items-center gap-2 text-xs">
                            {challenge?.passed && (
                              <span className="text-amber-500">{'⭐'.repeat(challenge.stars || 0)}</span>
                            )}
                            <span className="text-gray-400">{percent}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              percent >= 80 ? 'bg-emerald-400' : percent >= 40 ? 'bg-amber-400' : 'bg-gray-300'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {totalWords === 0 && (
        <div className="flex flex-col items-center py-12 gap-4">
          <div className="text-5xl">📚</div>
          <p className="text-gray-500 text-center">还没有学习记录，快去开始学习吧！</p>
          <Link
            to="/"
            className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-medium hover:bg-emerald-600 transition-colors no-underline"
          >
            开始学习 →
          </Link>
        </div>
      )}
    </div>
  );
}
