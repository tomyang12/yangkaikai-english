const BADGE_DEFS = [
  { id: 'first_learn', name: '初次学习', icon: '🌱', desc: '完成第一次练习' },
  { id: 'dictation_master', name: '默写达人', icon: '📝', desc: '累计默写正确100个单词' },
  { id: 'perfect_score', name: '百发百中', icon: '🎯', desc: '单次默写全部正确（≥8词）' },
  { id: 'streak_7', name: '连续打卡7天', icon: '🔥', desc: '连续7天有学习记录' },
  { id: 'challenge_king', name: '闯关王', icon: '🏆', desc: '通过6个单元的闯关测验' },
  { id: 'scholar', name: '学霸', icon: '📚', desc: '学完一册书所有单元' },
];

export function checkAndAwardBadges(data) {
  const newBadges = [];
  const existing = data.badges || [];

  for (const badge of BADGE_DEFS) {
    if (existing.includes(badge.id)) continue;
    let earned = false;

    switch (badge.id) {
      case 'first_learn':
        earned = (data.stats?.totalWordsPracticed || 0) > 0;
        break;
      case 'dictation_master':
        earned = (data.stats?.totalCorrect || 0) >= 100;
        break;
      case 'perfect_score':
        // 由外部传入是否触发
        break;
      case 'streak_7':
        earned = (data.stats?.totalDays || 0) >= 7;
        break;
      case 'challenge_king': {
        const passed = Object.values(data.challengeStatus || {}).filter(s => s.passed).length;
        earned = passed >= 6;
        break;
      }
      case 'scholar': {
        const allPassed = Object.values(data.challengeStatus || {}).every(s => s.passed);
        const total = Object.keys(data.challengeStatus || {}).length;
        earned = total >= 6 && allPassed;
        break;
      }
    }

    if (earned) {
      newBadges.push(badge);
    }
  }

  return {
    data: { ...data, badges: [...existing, ...newBadges.map(b => b.id)] },
    newBadges,
  };
}

export { BADGE_DEFS };
