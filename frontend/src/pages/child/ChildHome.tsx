import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { choreApi, Chore } from '../../api/client';
import { Star, Trophy, Gift, CheckCircle, Clock, XCircle, ChevronRight, Sparkles } from 'lucide-react';

export default function ChildHome() {
  const { user } = useAuth();
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChores();
  }, []);

  const loadChores = async () => {
    try {
      const response = await choreApi.getMy();
      if (response.data.data) {
        setChores(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load chores:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingChores = chores.filter(c => c.status === 'PENDING');
  const completedChores = chores.filter(c => c.status === 'COMPLETED');
  const rejectedChores = chores.filter(c => c.status === 'REJECTED');
  const verifiedChores = chores.filter(c => c.status === 'VERIFIED');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'VERIFIED':
        return <Sparkles className="w-5 h-5 text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-chomper-100 flex items-center justify-center text-3xl">
            {user?.avatarPreset || '😊'}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">
              Hi, {user?.name}! 👋
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

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-yellow-600">{pendingChores.length}</div>
          <div className="text-sm text-gray-600">To Do</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{completedChores.length}</div>
          <div className="text-sm text-gray-600">Awaiting Approval</div>
        </div>
        {rejectedChores.length > 0 && (
          <div className="card p-4 text-center col-span-2 bg-red-50 border-red-200">
            <div className="text-3xl font-bold text-red-600">{rejectedChores.length}</div>
            <div className="text-sm text-red-600">Need to Redo</div>
          </div>
        )}
      </div>

      {/* Priority: Rejected chores first */}
      {rejectedChores.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            Need to Redo
          </h2>
          <div className="space-y-2">
            {rejectedChores.slice(0, 3).map((chore) => (
              <Link 
                key={chore.id} 
                to="/child/chores"
                className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                {getStatusIcon(chore.status)}
                <div className="flex-1">
                  <h3 className="font-medium">{chore.name}</h3>
                  {chore.verificationNotes && (
                    <p className="text-sm text-red-600">"{chore.verificationNotes}"</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-chomper-600">
                  <Star className="w-4 h-4" />
                  <span className="font-bold">{chore.pointValue}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Today's chores */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            📅 Today's Chores
          </h2>
          <Link to="/child/chores" className="text-chomper-600 text-sm font-medium">
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="card p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-chomper-500 border-t-transparent mx-auto"></div>
          </div>
        ) : pendingChores.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
            <p className="text-gray-600">
              {verifiedChores.length > 0 
                ? `Great job! You've completed ${verifiedChores.length} chore${verifiedChores.length !== 1 ? 's' : ''} today!`
                : 'No chores assigned yet. Check back later!'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingChores.slice(0, 5).map((chore) => (
              <Link 
                key={chore.id} 
                to="/child/chores"
                className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                {getStatusIcon(chore.status)}
                <div className="flex-1">
                  <h3 className="font-medium">{chore.name}</h3>
                  {chore.dueDate && (
                    <p className="text-sm text-gray-500">
                      Due: {new Date(chore.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-chomper-600">
                  <Star className="w-4 h-4" />
                  <span className="font-bold">{chore.pointValue}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link 
          to="/child/chores"
          className="card p-6 text-center hover:shadow-md transition-shadow"
        >
          <Trophy className="w-10 h-10 mx-auto text-chomper-500 mb-2" />
          <span className="font-semibold">My Chores</span>
          {pendingChores.length > 0 && (
            <span className="block text-sm text-gray-500">
              {pendingChores.length} to do
            </span>
          )}
        </Link>

        <Link 
          to="/child/rewards"
          className="card p-6 text-center hover:shadow-md transition-shadow"
        >
          <Gift className="w-10 h-10 mx-auto text-green-500 mb-2" />
          <span className="font-semibold">Rewards</span>
          <span className="block text-sm text-gray-500">
            {user?.pointsBalance || 0} pts available
          </span>
        </Link>
      </div>
    </div>
  );
}
