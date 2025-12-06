import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { choreApi, Chore } from '../../api/client';
import { Star, Trophy, Target, TrendingUp, Calendar, Award } from 'lucide-react';

export default function Stats() {
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

  const verifiedChores = chores.filter(c => c.status === 'VERIFIED');
  const totalPointsEarned = verifiedChores.reduce((sum, c) => sum + c.pointValue, 0);
  const pendingChores = chores.filter(c => c.status === 'PENDING').length;
  const completedCount = verifiedChores.length;

  // Simple streak calculation (consecutive days with verified chores)
  const calculateStreak = () => {
    if (verifiedChores.length === 0) return 0;
    
    const sortedDates = verifiedChores
      .filter(c => c.verifiedAt)
      .map(c => new Date(c.verifiedAt!).toDateString())
      .filter((date, i, arr) => arr.indexOf(date) === i) // unique dates
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    if (sortedDates.length === 0) return 0;
    
    let streak = 1;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    // Check if most recent is today or yesterday
    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
      return 0; // Streak broken
    }
    
    for (let i = 1; i < sortedDates.length; i++) {
      const current = new Date(sortedDates[i - 1]).getTime();
      const prev = new Date(sortedDates[i]).getTime();
      const diffDays = (current - prev) / 86400000;
      
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const streak = calculateStreak();

  // Achievements
  const achievements = [
    { 
      id: 'first_chore', 
      name: 'First Steps', 
      description: 'Complete your first chore', 
      icon: '🎯',
      unlocked: completedCount >= 1 
    },
    { 
      id: 'five_chores', 
      name: 'Getting Started', 
      description: 'Complete 5 chores', 
      icon: '⭐',
      unlocked: completedCount >= 5 
    },
    { 
      id: 'ten_chores', 
      name: 'Helper Hero', 
      description: 'Complete 10 chores', 
      icon: '🦸',
      unlocked: completedCount >= 10 
    },
    { 
      id: 'fifty_points', 
      name: 'Point Collector', 
      description: 'Earn 50 points total', 
      icon: '💰',
      unlocked: totalPointsEarned >= 50 
    },
    { 
      id: 'hundred_points', 
      name: 'Super Saver', 
      description: 'Earn 100 points total', 
      icon: '🏆',
      unlocked: totalPointsEarned >= 100 
    },
    { 
      id: 'streak_3', 
      name: 'On a Roll', 
      description: '3-day chore streak', 
      icon: '🔥',
      unlocked: streak >= 3 
    },
    { 
      id: 'streak_7', 
      name: 'Week Warrior', 
      description: '7-day chore streak', 
      icon: '💪',
      unlocked: streak >= 7 
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-chomper-500 border-t-transparent mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">My Stats</h1>

      {/* Main stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <Star className="w-8 h-8 mx-auto text-yellow-500 fill-yellow-500 mb-2" />
          <div className="text-2xl font-bold text-yellow-600">{user?.pointsBalance || 0}</div>
          <div className="text-sm text-gray-600">Points Balance</div>
        </div>
        
        <div className="card p-4 text-center">
          <TrendingUp className="w-8 h-8 mx-auto text-green-500 mb-2" />
          <div className="text-2xl font-bold text-green-600">{totalPointsEarned}</div>
          <div className="text-sm text-gray-600">Total Earned</div>
        </div>

        <div className="card p-4 text-center">
          <Trophy className="w-8 h-8 mx-auto text-chomper-500 mb-2" />
          <div className="text-2xl font-bold text-chomper-600">{completedCount}</div>
          <div className="text-sm text-gray-600">Chores Done</div>
        </div>

        <div className="card p-4 text-center">
          <Calendar className="w-8 h-8 mx-auto text-orange-500 mb-2" />
          <div className="text-2xl font-bold text-orange-600">{streak}</div>
          <div className="text-sm text-gray-600">Day Streak 🔥</div>
        </div>
      </div>

      {/* Progress to next milestone */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Next milestone: 100 pts earned</span>
          <span className="text-sm text-gray-500">{totalPointsEarned}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-chomper-400 to-chomper-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((totalPointsEarned / 100) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Achievements */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Award className="w-5 h-5" />
            Achievements
          </h2>
          <span className="text-sm text-gray-500">
            {unlockedCount}/{achievements.length} unlocked
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`card p-4 text-center transition-all ${
                achievement.unlocked
                  ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200'
                  : 'opacity-50 grayscale'
              }`}
            >
              <div className="text-3xl mb-2">{achievement.icon}</div>
              <h3 className="font-medium text-sm">{achievement.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{achievement.description}</p>
              {achievement.unlocked && (
                <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full">
                  Unlocked!
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent completions */}
      {verifiedChores.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Completions</h2>
          <div className="space-y-2">
            {verifiedChores.slice(0, 5).map((chore) => (
              <div key={chore.id} className="card p-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  ✓
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{chore.name}</h3>
                  {chore.verifiedAt && (
                    <p className="text-xs text-gray-500">
                      {new Date(chore.verifiedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-chomper-600 text-sm">
                  <Star className="w-3 h-3" />
                  <span className="font-bold">+{chore.pointValue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
