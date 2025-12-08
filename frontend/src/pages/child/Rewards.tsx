import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Gift, Star, Lock, Loader2, ShoppingBag, Sparkles } from 'lucide-react';
import { rewardApi, Reward } from '../../api/client';

const REWARD_EMOJIS: { [key: string]: string } = {
  gaming: '🎮',
  screen: '📱',
  movie: '🎬',
  ice: '🍦',
  pizza: '🍕',
  dinner: '🍽️',
  trip: '🚗',
  money: '💵',
  allowance: '💵',
  toy: '🧸',
  game: '🎮',
  treat: '🍭',
  party: '🎉',
  sleep: '🌙',
  late: '🌙',
};

function getRewardEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(REWARD_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return '🎁';
}

export default function Rewards() {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const pointsBalance = user?.pointsBalance || 0;

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      const res = await rewardApi.getAll(false);
      if (res.data.success) {
        setRewards(res.data.data || []);
      }
    } catch (err) {
      setError('Failed to load rewards');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-chomper-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold flex items-center gap-2">
        <ShoppingBag className="w-7 h-7 text-chomper-500" />
        Rewards Shop
      </h1>

      {/* Points balance card */}
      <div className="card p-6 bg-gradient-to-r from-chomper-500 to-purple-500 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">Your Points</p>
            <div className="flex items-center gap-2 mt-1">
              <Star className="w-8 h-8 fill-yellow-300 text-yellow-300" />
              <span className="text-4xl font-bold">{pointsBalance.toLocaleString()}</span>
            </div>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <Gift className="w-8 h-8" />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
      )}

      {rewards.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">🎁</div>
          <h2 className="text-xl font-semibold mb-2">No Rewards Yet</h2>
          <p className="text-gray-500">
            Ask your parents to add some rewards for you to earn!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Available Rewards
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {rewards.map((reward) => {
              const canAfford = pointsBalance >= reward.pointCost;
              const pointsNeeded = reward.pointCost - pointsBalance;

              return (
                <div
                  key={reward.id}
                  className={`card p-5 transition-all ${canAfford ? 'hover:shadow-lg hover:scale-[1.02] cursor-pointer border-2 border-transparent hover:border-chomper-300' : 'opacity-70'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${canAfford ? 'bg-gradient-to-br from-chomper-100 to-chomper-200' : 'bg-gray-100'}`}>
                      {getRewardEmoji(reward.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{reward.name}</h3>
                      {reward.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                          {reward.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <div className={`flex items-center gap-1 font-bold ${canAfford ? 'text-chomper-600' : 'text-gray-400'}`}>
                          <Star className={`w-5 h-5 ${canAfford ? 'fill-current' : ''}`} />
                          {reward.pointCost.toLocaleString()} pts
                        </div>

                        {canAfford ? (
                          <button className="btn btn-primary btn-sm flex items-center gap-1">
                            <Gift className="w-4 h-4" />
                            Redeem
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400 text-sm">
                            <Lock className="w-4 h-4" />
                            {pointsNeeded.toLocaleString()} more
                          </div>
                        )}
                      </div>

                      {reward.quantityAvailable !== null && (
                        <p className="text-xs text-gray-400 mt-2">
                          {reward.quantityAvailable} available
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tip card */}
      <div className="card p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <p className="text-sm text-yellow-800">
            <strong>Tip:</strong> Complete your chores to earn more points and unlock bigger rewards!
          </p>
        </div>
      </div>
    </div>
  );
}
