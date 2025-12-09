import { useEffect, useState } from 'react';
import { Loader2, Zap, Clock, Star, CheckCircle } from 'lucide-react';
import { choreApi, Chore } from '../../api/client';
import toast from 'react-hot-toast';

export default function AvailableChores() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<Chore | null>(null);

  useEffect(() => {
    loadAvailableChores();
  }, []);

  const loadAvailableChores = async () => {
    try {
      const res = await choreApi.getAvailable();
      if (res.data.success) {
        setChores(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load available chores');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (chore: Chore) => {
    setClaimingId(chore.id);
    try {
      const res = await choreApi.claim(chore.id);
      if (res.data.success) {
        toast.success(res.data.message || `You claimed "${chore.name}"!`);
        setShowConfirm(null);
        setChores(prev => prev.filter(c => c.id !== chore.id));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to claim chore');
    } finally {
      setClaimingId(null);
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
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-4 py-2 rounded-full text-sm font-bold mb-2">
          <Zap className="w-4 h-4" />
          Bonus Chores
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Available Chores</h1>
        <p className="text-gray-500 text-sm mt-1">
          Claim extra chores to earn more points!
        </p>
      </div>

      {chores.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">✨</div>
          <h2 className="text-xl font-semibold mb-2">All caught up!</h2>
          <p className="text-gray-500">
            No bonus chores available right now. Check back later!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {chores.map((chore) => (
            <div
              key={chore.id}
              className={`card p-4 border-2 transition-all ${
                chore.isBonus
                  ? 'border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50'
                  : 'border-gray-100 hover:border-chomper-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {chore.isBonus && (
                      <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold">
                        BONUS
                      </span>
                    )}
                    <h3 className="font-semibold text-gray-800 truncate">
                      {chore.name}
                    </h3>
                  </div>

                  {chore.description && (
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                      {chore.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-yellow-600 font-bold">
                      <Star className="w-4 h-4 fill-yellow-400" />
                      {chore.pointValue} pts
                    </div>

                    {chore.category && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${chore.category.color}20`,
                          color: chore.category.color,
                        }}
                      >
                        {chore.category.icon} {chore.category.name}
                      </span>
                    )}

                    {chore.dueDate && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-3 h-3" />
                        {new Date(chore.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setShowConfirm(chore)}
                  disabled={claimingId === chore.id}
                  className="flex-shrink-0 btn btn-primary px-4 py-2"
                >
                  {claimingId === chore.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Claim'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-chomper-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-chomper-600" />
            </div>
            
            <h3 className="text-xl font-bold mb-2">Claim this chore?</h3>
            <p className="text-gray-500 mb-4">
              You'll earn <span className="font-bold text-yellow-600">{showConfirm.pointValue} points</span> when you complete it!
            </p>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-6 text-left">
              <p className="font-semibold">{showConfirm.name}</p>
              {showConfirm.description && (
                <p className="text-sm text-gray-500">{showConfirm.description}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 btn border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleClaim(showConfirm)}
                disabled={claimingId === showConfirm.id}
                className="flex-1 btn btn-primary"
              >
                {claimingId === showConfirm.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Yes, Claim It!'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
