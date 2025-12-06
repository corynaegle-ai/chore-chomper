import { useAuth } from '../../context/AuthContext';
import { Star, Gift, Trophy, LogOut } from 'lucide-react';

export default function ChildDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
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
            
            <button
              onClick={logout}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Profile card */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-chomper-100 flex items-center justify-center text-3xl">
              {user?.avatarPreset || '😊'}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-display font-bold">
                Hi, {user?.name}!
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span className="text-xl font-bold text-yellow-600">
                  {user?.pointsBalance || 0} points
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Today's chores */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            📅 Today's Chores
          </h2>
          
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold mb-2">No chores yet!</h3>
            <p className="text-gray-600">
              Ask your parents to add some chores for you.
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-4">
          <button className="card p-6 text-center hover:shadow-md transition-shadow">
            <Trophy className="w-10 h-10 mx-auto text-chomper-500 mb-2" />
            <span className="font-semibold">My Chores</span>
          </button>
          
          <button className="card p-6 text-center hover:shadow-md transition-shadow">
            <Gift className="w-10 h-10 mx-auto text-green-500 mb-2" />
            <span className="font-semibold">Rewards</span>
          </button>
        </div>

        {/* Coming soon notice */}
        <div className="mt-8 p-4 bg-yellow-50 rounded-xl border border-yellow-200 text-center">
          <p className="text-sm text-yellow-800">
            🚧 More features coming soon! This is the Phase 1 foundation.
          </p>
        </div>
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex justify-around py-3">
            <button className="flex flex-col items-center gap-1 px-4 py-2 text-chomper-600">
              <Trophy className="w-6 h-6" />
              <span className="text-xs font-medium">Chores</span>
            </button>
            <button className="flex flex-col items-center gap-1 px-4 py-2 text-gray-400">
              <Gift className="w-6 h-6" />
              <span className="text-xs font-medium">Rewards</span>
            </button>
            <button className="flex flex-col items-center gap-1 px-4 py-2 text-gray-400">
              <Star className="w-6 h-6" />
              <span className="text-xs font-medium">Stats</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
