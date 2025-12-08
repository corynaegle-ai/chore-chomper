import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Gift, Star, Lock, Loader2, ShoppingBag, Sparkles, Check, Clock, History } from 'lucide-react';
import { rewardApi, redemptionApi, Reward, Redemption } from '../../api/client';

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
  const { user, refreshUser } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const pointsBalance = user?.pointsBalance || 0;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rewardsRes, redemptionsRes] = await Promise.all([
        rewardApi.getAll(false),
        redemptionApi.getAll(),
      ]);
      if (rewardsRes.data.success) setRewards(rewardsRes.data.data || []);
      if (redemptionsRes.data.success) setRedemptions(redemptionsRes.data.data || []);
    } catch (err) {
      setError('Failed to load rewards');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (reward: Reward) => {
    if (pointsBalance < reward.pointCost) return;
    
    setRedeeming(reward.id);
    setError('');
    setSuccess('');

    try {
      const res = await redemptionApi.request({ rewardId: reward.id });
      if (res.data.success) {
        setSuccess(res.data.message || `Requested "${reward.name}"! Waiting for parent approval.`);
        await refreshUser();
        loadData();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to redeem reward');
    } finally {
      setRedeeming(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-chomper-500" />
      </div>
    );
  }

  const pendingRedemptions = redemptions.filter(r => r.status === 'PENDING');
  const pastRedemptions = redemptions.filter(r => r.status !== 'PENDING');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <ShoppingBag className="w-7 h-7 text-chomper-500" />
          Rewards Shop
        </h1>
        {redemptions.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn btn-secondary btn-sm flex items-center gap-1"
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Show Shop' : 'My Requests'}
          </button>
        )}
      </div>

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

      {success && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm flex items-center gap-2">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Pending Requests */}
      {pendingRedemptions.length > 0 && !showHistory && (
        <div className="card p-4 bg-yellow-50 border border-yellow-200">
          <h3 className="font-semibold flex items-center gap-2 text-yellow-800 mb-3">
            <Clock className="w-5 h-5" />
            Waiting for Approval ({pendingRedemptions.length})
          </h3>
          <div className="space-y-2">
            {pendingRedemptions.map((r) => (
              <div key={r.id} className="flex items-center gap-3 bg-white p-3 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center text-xl">
                  {getRewardEmoji(r.reward?.name || '')}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{r.reward?.name}</p>
                  <p className="text-sm text-gray-500">{r.pointsSpent} pts</p>
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showHistory ? (
        /* Redemption History */
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Redemption History</h2>
          {redemptions.length === 0 ? (
            <p className="text-gray-500">No redemptions yet</p>
          ) : (
            <div className="space-y-3">
              {redemptions.map((r) => (
                <div key={r.id} className="card p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${r.status === 'APPROVED' || r.status === 'FULFILLED' ? 'bg-green-100' : r.status === 'REJECTED' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                    {getRewardEmoji(r.reward?.name || '')}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{r.reward?.name}</p>
                    <p className="text-sm text-gray-500">{r.pointsSpent} pts • {new Date(r.requestedAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${r.status === 'FULFILLED' ? 'bg-green-100 text-green-700' : r.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' : r.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {r.status === 'FULFILLED' ? 'Received!' : r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Rewards Shop */
        <>
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
                  const isRedeeming = redeeming === reward.id;

                  return (
                    <div
                      key={reward.id}
                      className={`card p-5 transition-all ${canAfford ? 'hover:shadow-lg border-2 border-transparent hover:border-chomper-300' : 'opacity-70'}`}
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
                              <button
                                onClick={() => handleRedeem(reward)}
                                disabled={isRedeeming}
                                className="btn btn-primary btn-sm flex items-center gap-1"
                              >
                                {isRedeeming ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Gift className="w-4 h-4" />
                                    Redeem
                                  </>
                                )}
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
        </>
      )}

      {/* Tip card */}
      {!showHistory && (
        <div className="card p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <p className="text-sm text-yellow-800">
              <strong>Tip:</strong> Complete your chores to earn more points and unlock bigger rewards!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
