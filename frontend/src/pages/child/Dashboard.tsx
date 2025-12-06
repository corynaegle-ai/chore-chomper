import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Trophy, Gift, Star, LogOut, Home } from 'lucide-react';
import MyChores from './MyChores';
import Rewards from './Rewards';
import Stats from './Stats';
import ChildHome from './ChildHome';

export default function ChildDashboard() {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/child', icon: Home, label: 'Home', end: true },
    { to: '/child/chores', icon: Trophy, label: 'Chores' },
    { to: '/child/rewards', icon: Gift, label: 'Rewards' },
    { to: '/child/stats', icon: Star, label: 'Stats' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🦷</span>
              <span className="font-display font-bold text-chomper-600">
                ChoreChomper
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Points badge */}
              <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1.5 rounded-full">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-yellow-700">
                  {user?.pointsBalance || 0}
                </span>
              </div>

              <button
                onClick={logout}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <Routes>
          <Route index element={<ChildHome />} />
          <Route path="chores" element={<MyChores />} />
          <Route path="rewards" element={<Rewards />} />
          <Route path="stats" element={<Stats />} />
          <Route path="*" element={<Navigate to="/child" replace />} />
        </Routes>
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex justify-around py-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'text-chomper-600 bg-chomper-50'
                      : 'text-gray-400 hover:text-gray-600'
                  }`
                }
              >
                <item.icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
