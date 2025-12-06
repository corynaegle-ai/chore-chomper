import { useAuth } from '../../context/AuthContext';
import { LogOut, Users, ClipboardList, Gift, Settings } from 'lucide-react';

export default function ParentDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🦷</span>
              <span className="text-xl font-display font-bold text-chomper-600">
                ChoreChomper
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                Hi, {user?.name}!
              </span>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to {user?.family?.name}!
          </h1>
          <p className="mt-2 text-gray-600">
            Family Code: <span className="font-mono font-bold text-chomper-600">{user?.family?.inviteCode}</span>
            <span className="text-sm ml-2">(Share with other parents to join)</span>
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Children</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <ClipboardList className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Chores</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <ClipboardList className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Needs Verification</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Gift className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Reward Requests</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Getting started */}
        <div className="card p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">🚀 Let's Get Started!</h2>
          <p className="text-gray-600 mb-6">
            You're all set up! Here's what to do next:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="text-3xl mb-3">👶</div>
              <h3 className="font-semibold mb-2">1. Add Children</h3>
              <p className="text-sm text-gray-600">
                Create accounts for your kids with their own PINs.
              </p>
            </div>
            
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="text-3xl mb-3">📝</div>
              <h3 className="font-semibold mb-2">2. Create Chores</h3>
              <p className="text-sm text-gray-600">
                Set up recurring or one-time chores with point values.
              </p>
            </div>
            
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="text-3xl mb-3">🎁</div>
              <h3 className="font-semibold mb-2">3. Add Rewards</h3>
              <p className="text-sm text-gray-600">
                Create rewards your kids can earn with their points.
              </p>
            </div>
          </div>
          
          <p className="mt-8 text-sm text-gray-500">
            Full dashboard features coming soon! This is the Phase 1 foundation.
          </p>
        </div>
      </main>
    </div>
  );
}
