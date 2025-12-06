import { useAuth } from '../../context/AuthContext';
import { Gift, Star, Lock, ShoppingCart } from 'lucide-react';

// Placeholder rewards - will be dynamic when rewards API is built
const placeholderRewards = [
  { id: '1', name: 'Extra Screen Time (30 min)', points: 50, icon: '📱' },
  { id: '2', name: 'Pick What\'s for Dinner', points: 75, icon: '🍕' },
  { id: '3', name: 'Stay Up 30 Minutes Late', points: 100, icon: '🌙' },
  { id: '4', name: 'Movie Night Pick', points: 150, icon: '🎬' },
  { id: '5', name: 'Trip to Ice Cream Shop', points: 200, icon: '🍦' },
  { id: '6', name: '$5 Allowance', points: 500, icon: '💵' },
];

export default function Rewards() {
  const { user } = useAuth();
  const pointsBalance = user?.pointsBalance || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Rewards</h1>

      {/* Points balance card */}
      <div className="card p-6 bg-gradient-to-r from-chomper-500 to-purple-500 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">Your Points</p>
            <div className="flex items-center gap-2 mt-1">
              <Star className="w-8 h-8 fill-yellow-300 text-yellow-300" />
              <span className="text-4xl font-bold">{pointsBalance}</span>
            </div>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <Gift className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Coming soon notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🚧</span>
          <div>
            <p className="font-medium text-yellow-800">Rewards Shop Coming Soon!</p>
            <p className="text-sm text-yellow-700 mt-1">
              Your parents will be able to add custom rewards for you to redeem with your points.
              Keep doing your chores to save up!
            </p>
          </div>
        </div>
      </div>

      {/* Sample rewards (preview) */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Sample Rewards Preview
        </h2>
        <div className="space-y-3">
          {placeholderRewards.map((reward) => {
            const canAfford = pointsBalance >= reward.points;
            return (
              <div
                key={reward.id}
                className={`card p-4 flex items-center gap-4 ${
                  canAfford ? 'hover:shadow-md' : 'opacity-60'
                }`}
              >
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
                  {reward.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{reward.name}</h3>
                  <div className="flex items-center gap-1 text-chomper-600">
                    <Star className="w-4 h-4" />
                    <span className="font-bold">{reward.points} pts</span>
                  </div>
                </div>
                {canAfford ? (
                  <button
                    disabled
                    className="btn-primary opacity-50 cursor-not-allowed"
                  >
                    Soon
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-gray-400">
                    <Lock className="w-4 h-4" />
                    <span className="text-sm">{reward.points - pointsBalance} more</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
