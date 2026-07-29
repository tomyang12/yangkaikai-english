import { useState, useEffect } from 'react';

const ADMIN_PASSWORD = 'ykenglish2026';

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [gradeTerm, setGradeTerm] = useState('3a');
  const [units, setUnits] = useState([]);
  const [words, setWords] = useState({});
  const [selectedUnit, setSelectedUnit] = useState('');
  const [editingWord, setEditingWord] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // 新单词表单
  const [newWord, setNewWord] = useState({ english: '', chinese: '', unitId: '', order: 1 });

  useEffect(() => {
    if (!authed) return;
    loadWordBank();
  }, [authed, gradeTerm]);

  function loadWordBank() {
    const data = JSON.parse(localStorage.getItem(`wordbank_${gradeTerm}`) || 'null');
    if (data) {
      setUnits(data.units || []);
      const wordMap = {};
      (data.units || []).forEach(u => {
        (u.words || []).forEach(w => { wordMap[w.id] = w; });
      });
      setWords(wordMap);
    } else {
      setUnits([]);
      setWords({});
    }
  }

  function saveWordBank(data) {
    localStorage.setItem(`wordbank_${gradeTerm}`, JSON.stringify(data));
    loadWordBank();
  }

  function handleLogin(e) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      setError('');
    } else {
      setError('密码错误');
    }
  }

  function handleAddWord() {
    if (!newWord.english || !newWord.chinese || !selectedUnit) return;
    const data = JSON.parse(localStorage.getItem(`wordbank_${gradeTerm}`) || JSON.stringify({ gradeTerm, gradeName: '', units: [] }));
    const unit = data.units.find(u => u.id === selectedUnit);
    if (!unit) return;

    // 检查重复
    if (unit.words.some(w => w.english.toLowerCase() === newWord.english.toLowerCase())) {
      alert('该单词在本单元已存在');
      return;
    }

    const wordId = `${selectedUnit}-w${String(unit.words.length + 1).padStart(2, '0')}`;
    unit.words.push({
      id: wordId,
      english: newWord.english.trim(),
      chinese: newWord.chinese.trim(),
      order: unit.words.length + 1,
    });
    unit.wordCount = unit.words.length;
    saveWordBank(data);
    setNewWord({ english: '', chinese: '', unitId: '', order: 1 });
    setShowAddForm(false);
  }

  function handleEditWord(word) {
    setEditingWord({ ...word });
  }

  function handleSaveEdit() {
    const data = JSON.parse(localStorage.getItem(`wordbank_${gradeTerm}`));
    for (const unit of data.units) {
      const idx = unit.words.findIndex(w => w.id === editingWord.id);
      if (idx !== -1) {
        unit.words[idx] = { ...editingWord };
        break;
      }
    }
    saveWordBank(data);
    setEditingWord(null);
  }

  function handleDeleteWord(wordId) {
    if (!confirm('确定要删除这个单词吗？')) return;
    const data = JSON.parse(localStorage.getItem(`wordbank_${gradeTerm}`));
    for (const unit of data.units) {
      unit.words = unit.words.filter(w => w.id !== wordId);
      unit.wordCount = unit.words.length;
    }
    saveWordBank(data);
  }

  function handleInitWordBank() {
    // 从静态JSON加载到localStorage供后台编辑
    const gradeNames = { '3a': '三年级上册', '3b': '三年级下册', '4a': '四年级上册', '4b': '四年级下册' };
    import(`../data/grade${gradeTerm}.json`).then(mod => {
      const data = mod.default || mod;
      data.gradeTerm = gradeTerm;
      data.gradeName = gradeNames[gradeTerm];
      localStorage.setItem(`wordbank_${gradeTerm}`, JSON.stringify(data));
      loadWordBank();
      alert('词库已从静态数据初始化到后台！');
    });
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-emerald-700 mb-6 text-center">管理员登录</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入管理员密码"
              className="w-full px-4 py-3 rounded-xl border-2 border-emerald-200 focus:border-emerald-500 focus:outline-none text-lg mb-4"
              autoFocus
            />
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl text-lg font-medium hover:bg-emerald-700 transition-colors">
              登录
            </button>
          </form>
        </div>
      </div>
    );
  }

  const currentUnitWords = selectedUnit && units.find(u => u.id === selectedUnit)?.words || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">📋 词库管理后台</h1>
          <div className="flex gap-4">
            <select value={gradeTerm} onChange={e => { setGradeTerm(e.target.value); setSelectedUnit(''); }} className="px-4 py-2 border rounded-lg">
              <option value="3a">三年级上册</option>
              <option value="3b">三年级下册</option>
              <option value="4a">四年级上册</option>
              <option value="4b">四年级下册</option>
            </select>
            <button onClick={handleInitWordBank} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
              初始化词库
            </button>
            <button onClick={() => setAuthed(false)} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm">
              退出
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 flex gap-4">
        {/* 单元列表 */}
        <div className="w-48 shrink-0">
          <h2 className="font-semibold text-gray-700 mb-2">单元列表</h2>
          <div className="space-y-1">
            {units.map(u => (
              <button
                key={u.id}
                onClick={() => setSelectedUnit(u.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedUnit === u.id ? 'bg-emerald-100 text-emerald-700 font-medium' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                {u.name}: {u.theme}
              </button>
            ))}
          </div>
        </div>

        {/* 单词列表 */}
        <div className="flex-1">
          {selectedUnit ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-700">
                  {units.find(u => u.id === selectedUnit)?.name} — {units.find(u => u.id === selectedUnit)?.theme}
                  <span className="text-gray-400 ml-2">({currentUnitWords.length}词)</span>
                </h2>
                <button onClick={() => setShowAddForm(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
                  + 新增单词
                </button>
              </div>

              {showAddForm && (
                <div className="bg-emerald-50 rounded-xl p-4 mb-4">
                  <h3 className="font-medium text-emerald-800 mb-3">新增单词</h3>
                  <div className="flex gap-2 flex-wrap">
                    <input placeholder="英文单词" value={newWord.english} onChange={e => setNewWord({ ...newWord, english: e.target.value })} className="px-3 py-2 border rounded-lg flex-1 min-w-[150px]" />
                    <input placeholder="中文释义" value={newWord.chinese} onChange={e => setNewWord({ ...newWord, chinese: e.target.value })} className="px-3 py-2 border rounded-lg flex-1 min-w-[150px]" />
                    <button onClick={handleAddWord} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">确认添加</button>
                    <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">取消</button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">ID</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">英文</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">中文</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">排序</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentUnitWords.map(w => (
                      <tr key={w.id} className="border-t hover:bg-gray-50">
                        {editingWord && editingWord.id === w.id ? (
                          <>
                            <td className="px-4 py-2 text-sm text-gray-400">{w.id}</td>
                            <td className="px-4 py-2"><input value={editingWord.english} onChange={e => setEditingWord({ ...editingWord, english: e.target.value })} className="px-2 py-1 border rounded w-full" /></td>
                            <td className="px-4 py-2"><input value={editingWord.chinese} onChange={e => setEditingWord({ ...editingWord, chinese: e.target.value })} className="px-2 py-1 border rounded w-full" /></td>
                            <td className="px-4 py-2"><input type="number" value={editingWord.order} onChange={e => setEditingWord({ ...editingWord, order: parseInt(e.target.value) })} className="px-2 py-1 border rounded w-16" /></td>
                            <td className="px-4 py-2 text-right">
                              <button onClick={handleSaveEdit} className="text-emerald-600 hover:text-emerald-800 mr-2">保存</button>
                              <button onClick={() => setEditingWord(null)} className="text-gray-400 hover:text-gray-600">取消</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2 text-sm text-gray-400">{w.id}</td>
                            <td className="px-4 py-2 font-medium text-gray-800">{w.english}</td>
                            <td className="px-4 py-2 text-gray-600">{w.chinese}</td>
                            <td className="px-4 py-2 text-sm text-gray-400">{w.order}</td>
                            <td className="px-4 py-2 text-right">
                              <button onClick={() => handleEditWord(w)} className="text-blue-600 hover:text-blue-800 mr-3 text-sm">编辑</button>
                              <button onClick={() => handleDeleteWord(w.id)} className="text-red-500 hover:text-red-700 text-sm">删除</button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    {currentUnitWords.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无单词，点击"新增单词"添加</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-4">📋</p>
              <p>请从左侧选择一个单元</p>
              <p className="text-sm mt-2">或点击"初始化词库"从静态数据加载</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
