import { useNavigate } from 'react-router-dom';

const grades = [
  { id: '3a', name: '三年级上册', desc: 'PEP新版·6个单元·164词', emoji: '🌱', color: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  { id: '3b', name: '三年级下册', desc: 'PEP新版·6个单元·约150词', emoji: '🌿', color: 'from-sky-400 to-blue-500', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  { id: '4a', name: '四年级上册', desc: 'PEP新版·6个单元·约150词', emoji: '🌳', color: 'from-teal-400 to-cyan-500', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  { id: '4b', name: '四年级下册', desc: 'PEP新版·6个单元·约150词', emoji: '🌴', color: 'from-cyan-400 to-blue-500', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center">
      {/* 标题区域 */}
      <div className="text-center py-8 md:py-12">
        <div className="text-5xl mb-3">📚</div>
        <h1 className="text-3xl md:text-4xl font-bold text-emerald-700 mb-2">
          杨凯凯学英语
        </h1>
        <p className="text-emerald-500 text-sm md:text-base">
          人教版PEP（2024新版）· 小学英语词库
        </p>
      </div>

      {/* 年级卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 w-full max-w-2xl">
        {grades.map((grade) => (
          <button
            key={grade.id}
            onClick={() => navigate(`/${grade.id}`)}
            className={`group relative overflow-hidden rounded-2xl border-2 ${grade.border} ${grade.bg} p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] cursor-pointer`}
          >
            {/* 装饰背景 */}
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${grade.color} opacity-10 rounded-bl-3xl group-hover:opacity-20 transition-opacity`} />

            <div className="relative z-10">
              <div className="text-3xl mb-3">{grade.emoji}</div>
              <h2 className={`text-xl font-bold ${grade.text} mb-1`}>
                {grade.name}
              </h2>
              <p className="text-gray-500 text-sm">{grade.desc}</p>
            </div>

            {/* 点击提示 */}
            <div className={`absolute bottom-3 right-3 ${grade.text} opacity-0 group-hover:opacity-100 transition-opacity text-lg`}>
              →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
