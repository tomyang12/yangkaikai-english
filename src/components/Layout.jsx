import { Outlet, NavLink, useLocation } from 'react-router-dom';
import useLocalData from '../hooks/useLocalData';

const navItems = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/error-book', label: '错词本', icon: '📖' },
  { to: '/report', label: '学习报告', icon: '📊' },
];

export default function Layout() {
  const { data } = useLocalData();
  const location = useLocation();

  const isStudyPage = location.pathname !== '/' && location.pathname !== '/error-book' && location.pathname !== '/report';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-teal-50 flex flex-col">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-emerald-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2 no-underline">
            <span className="text-2xl">📚</span>
            <span className="text-lg font-bold text-emerald-700 tracking-wide">杨凯凯学英语</span>
          </NavLink>

          {!isStudyPage && (
            <div className="flex items-center gap-2 bg-amber-50 rounded-full px-3 py-1 border border-amber-200">
              <span className="text-amber-500 text-lg">⭐</span>
              <span className="font-bold text-amber-600">{data.totalPoints || 0}</span>
            </div>
          )}
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 pb-20 md:pb-6">
        <Outlet />
      </main>

      {/* 底部导航栏（移动端） */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-emerald-100 shadow-lg">
        <div className="flex justify-around items-center h-16">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 no-underline transition-colors min-w-[64px] py-1 rounded-xl ${
                  isActive ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-500'
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
