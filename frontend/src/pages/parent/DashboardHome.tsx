import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ClipboardList, Gift, AlertCircle, TrendingUp, RefreshCw } from 'lucide-react';
import { familyApi, choreApi, FamilyStats, Chore } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState<FamilyStats | null>(null);
  const [pendingVerification, setPendingVerification] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, pendingRes] = await Promise.all([
        familyApi.getStats(),
        choreApi.getPendingVerification(),
      ]);
      if (statsRes.data.success) setStats(statsRes.data.data as FamilyStats);
      if (pendingRes.data.success) setPendingVerification(pendingRes.data.data as Chore[]);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-chomper-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
        <p className="text-gray-600">{user?.family?.name} Dashboard</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/parent/children" className="card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Children</p>
              <p className="text-2xl font-bold">{stats?.children || 0}</p>
            </div>
          </div>
        </Link>

        <Link to="/parent/chores" className="card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-100 rounded-lg">
              <ClipboardList className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Chores</p>
              <p className="text-2xl font-bold">{stats?.chores.pending || 0}</p>
            </div>
          </div>
        </Link>

        <Link to="/parent/verify" className="card p-5 hover:shadow-md transition-shadow relative">
          {(stats?.chores.awaitingVerification || 0) > 0 && (
            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {stats?.chores.awaitingVerification}
            </span>
          )}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 rounded-lg">
              <RefreshCw className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Needs Review</p>
              <p className="text-2xl font-bold">{stats?.chores.awaitingVerification || 0}</p>
            </div>
          </div>
        </Link>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold">{stats?.chores.completed || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Verification Section */}
      {pendingVerification.length > 0 && (
        <div className="card">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-lg">🔔 Chores Awaiting Your Review</h2>
            <Link to="/parent/verify" className="text-sm text-chomper-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y">
            {pendingVerification.slice(0, 5).map((chore) => (
              <div key={chore.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg">
                    {chore.assignedTo.avatarPreset || '👤'}
                  </div>
                  <div>
                    <p className="font-medium">{chore.name}</p>
                    <p className="text-sm text-gray-500">
                      {chore.assignedTo.name} • {chore.pointValue} pts
                    </p>
                  </div>
                </div>
                <Link
                  to="/parent/verify"
                  className="btn btn-primary btn-sm"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {stats?.children === 0 && (
        <div className="card p-6 bg-gradient-to-r from-chomper-50 to-blue-50 border-chomper-200">
          <h2 className="text-xl font-bold mb-2">🚀 Get Started</h2>
          <p className="text-gray-600 mb-4">Add your first child to start assigning chores!</p>
          <Link to="/parent/children" className="btn btn-primary">
            Add Child
          </Link>
        </div>
      )}
    </div>
  );
}
