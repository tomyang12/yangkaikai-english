// 判对错：大小写不敏感、trim处理
export function checkAnswer(userInput, correctWord, variants = []) {
  const input = userInput.trim().toLowerCase();
  const correct = correctWord.trim().toLowerCase();
  const allAccepted = [correct, ...variants.map(v => v.trim().toLowerCase())];
  return allAccepted.includes(input);
}

// 从同单元随机抽取N个干扰项（排除正确答案）
export function getDistractors(words, correctWord, count = 3, field = 'chinese') {
  const pool = words.filter(w => w.english !== correctWord.english);
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(w => w[field]);
}

// 随机打乱数组
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 计算闯关得分和星级
export function calcChallengeResult(correct, total) {
  const score = Math.round((correct / total) * 100);
  let stars = 0;
  if (score >= 90) stars = 3;
  else if (score >= 70) stars = 2;
  else if (score >= 50) stars = 1;
  return { score, stars, passed: stars >= 1 };
}
