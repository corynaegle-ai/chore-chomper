import { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LogOut, Home, Users, ClipboardList, Gift, Settings, Menu, X, 
  RefreshCw, Copy, Check
} from 'lucide-react';

// Sub-pages
import DashboardHome from './DashboardHome';
import ChildrenPage from './ChildrenPage';
import ChoresPage from './ChoresPage';
import VerifyChores from './VerifyChores';

export default function ParentDashboard() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyFamilyCode = () => {
    if (user?.family?.inviteCode) {
      navigator.clipboard.writeText(user.family.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navItems = [
    { to: '/parent', icon: Home, label: 'Dashboard', end: true },
    { to: '/parent/children', icon: Users, label: 'Children' },
    { to: '/parent/chores', icon: ClipboardList, label: 'Chores' },
    { to: '/parent/verify', icon: RefreshCw, label: 'Verify' },
    { to: '/parent/rewards', icon: Gift, label: 'Rewards' },
    { to: '/parent/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🦷</span>
              <span className="text-xl font-display font-bold text-chomper-600">
                ChoreChomper
              </span>
            </div>
            
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                      isActive
                        ? 'bg-chomper-100 text-chomper-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <span className="text-xs text-gray-500">Code:</span>
                <span className="font-mono font-bold text-chomper-600">
                  {user?.family?.inviteCode}
                </span>
                <button onClick={copyFamilyCode} className="p-1 hover:bg-gray-200 rounded">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                </button>
              </div>
              
              <span className="hidden lg:block text-gray-600">{user?.name}</span>
              
              <button onClick={logout} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100" title="Logout">
                <LogOut className="w-5 h-5" />
              </button>

              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t bg-white px-4 py-2">
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink key={to} to={to} end={end} onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `block px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${isActive ? 'bg-chomper-100 text-chomper-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/children" element={<ChildrenPage />} />
          <Route path="/chores" element={<ChoresPage />} />
          <Route path="/verify" element={<VerifyChores />} />
          <Route path="/rewards" element={<div className="card p-8 text-center text-gray-500">Rewards coming soon!</div>} />
          <Route path="/settings" element={<div className="card p-8 text-center text-gray-500">Settings coming soon!</div>} />
          <Route path="*" element={<Navigate to="/parent" replace />} />
        </Routes>
      </main>
    </div>
  );
}
