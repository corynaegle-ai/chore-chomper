import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, Gift, Star, Eye, EyeOff } from 'lucide-react';
import { rewardApi, Reward } from '../../api/client';

const REWARD_ICONS = [
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '🍦', label: 'Ice Cream' },
  { emoji: '🎬', label: 'Movie' },
  { emoji: '🛍️', label: 'Shopping' },
  { emoji: '📱', label: 'Screen Time' },
  { emoji: '🎉', label: 'Party' },
  { emoji: '🍕', label: 'Pizza' },
  { emoji: '🎁', label: 'Gift' },
  { emoji: '⭐', label: 'Special' },
  { emoji: '🏆', label: 'Trophy' },
  { emoji: '🎨', label: 'Art' },
  { emoji: '🚗', label: 'Trip' },
];

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pointCost: 100,
    imageUrl: '',
    quantityAvailable: null as number | null,
    isActive: true,
  });

  useEffect(() => { loadRewards(); }, [showInactive]);

  const loadRewards = async () => {
    try {
      const res = await rewardApi.getAll(showInactive);
      if (res.data.success) setRewards(res.data.data || []);
    } catch (err) {
      setError('Failed to load rewards');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      description: '',
      pointCost: 100,
      imageUrl: '',
      quantityAvailable: null,
      isActive: true,
    });
    setEditingReward(null);
    setShowModal(true);
    setError('');
  };

  const openEditModal = (reward: Reward) => {
    setFormData({
      name: reward.name,
      description: reward.description || '',
      pointCost: reward.pointCost,
      imageUrl: reward.imageUrl || '',
      quantityAvailable: reward.quantityAvailable ?? null,
      isActive: reward.isActive,
    });
    setEditingReward(reward);
    setShowModal(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Reward name is required');
      return;
    }
    if (formData.pointCost < 1) {
      setError('Point cost must be at least 1');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        pointCost: formData.pointCost,
        imageUrl: formData.imageUrl.trim() || undefined,
        quantityAvailable: formData.quantityAvailable,
        isActive: formData.isActive,
      };

      if (editingReward) {
        await rewardApi.update(editingReward.id, payload);
      } else {
        await rewardApi.create(payload);
      }
      setShowModal(false);
      loadRewards();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save reward');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reward: Reward) => {
    const redemptionCount = reward._count?.redemptions || 0;
    const message = redemptionCount > 0
      ? `"${reward.name}" has ${redemptionCount} redemption(s). It will be deactivated instead of deleted.`
      : `Delete "${reward.name}"?`;

    if (!confirm(message)) return;

    try {
      await rewardApi.delete(reward.id);
      loadRewards();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete reward');
    }
  };

  const toggleActive = async (reward: Reward) => {
    try {
      await rewardApi.update(reward.id, { isActive: !reward.isActive });
      loadRewards();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update reward');
    }
  };

  const getRewardEmoji = (name: string) => {
    const lower = name.toLowerCase();
    for (const item of REWARD_ICONS) {
      if (lower.includes(item.label.toLowerCase())) return item.emoji;
    }
    return '🎁';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-chomper-500" /></div>;
  }

  const activeRewards = rewards.filter(r => r.isActive);
  const inactiveRewards = rewards.filter(r => !r.isActive);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Rewards</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`btn btn-sm flex items-center gap-1 ${showInactive ? 'btn-secondary' : ''}`}
          >
            {showInactive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showInactive ? 'Hide Inactive' : 'Show Inactive'}
          </button>
          <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Reward
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      {rewards.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">🎁</div>
          <h2 className="text-xl font-semibold mb-2">No rewards yet</h2>
          <p className="text-gray-500 mb-4">Create rewards for your kids to redeem with their points!</p>
          <button onClick={openAddModal} className="btn btn-primary">Create Your First Reward</button>
        </div>
      ) : (
        <>
          {/* Active Rewards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeRewards.map((reward) => (
              <div key={reward.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-chomper-100 to-chomper-200 flex items-center justify-center text-3xl">
                      {getRewardEmoji(reward.name)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{reward.name}</h3>
                      <div className="flex items-center gap-1 text-chomper-600 font-medium">
                        <Star className="w-4 h-4 fill-current" />
                        {reward.pointCost.toLocaleString()} pts
                      </div>
                    </div>
                  </div>
                </div>

                {reward.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{reward.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  {reward.quantityAvailable !== null && (
                    <span className="flex items-center gap-1">
                      <Gift className="w-4 h-4" />
                      {reward.quantityAvailable} left
                    </span>
                  )}
                  {reward._count?.redemptions !== undefined && reward._count.redemptions > 0 && (
                    <span>{reward._count.redemptions} redeemed</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => openEditModal(reward)} className="btn btn-secondary btn-sm flex-1 flex items-center justify-center gap-1">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleDelete(reward)} className="btn btn-sm text-red-600 hover:bg-red-50 flex items-center justify-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Inactive Rewards */}
          {showInactive && inactiveRewards.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-500 mb-4">Inactive Rewards</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inactiveRewards.map((reward) => (
                  <div key={reward.id} className="card p-5 opacity-60 bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center text-3xl grayscale">
                          {getRewardEmoji(reward.name)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-gray-600">{reward.name}</h3>
                          <div className="flex items-center gap-1 text-gray-500 font-medium">
                            <Star className="w-4 h-4" />
                            {reward.pointCost.toLocaleString()} pts
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleActive(reward)} className="btn btn-secondary btn-sm flex-1">
                        Reactivate
                      </button>
                      <button onClick={() => openEditModal(reward)} className="btn btn-sm">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingReward ? 'Edit Reward' : 'Add Reward'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Reward Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  placeholder="e.g., Extra Screen Time, Ice Cream Trip"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full h-20 resize-none"
                  placeholder="Optional details about the reward..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Point Cost *</label>
                <input
                  type="number"
                  value={formData.pointCost}
                  onChange={(e) => setFormData({ ...formData, pointCost: parseInt(e.target.value) || 0 })}
                  className="input w-full"
                  min="1"
                  max="100000"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">How many points needed to redeem this reward</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Quantity Available</label>
                <input
                  type="number"
                  value={formData.quantityAvailable ?? ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    quantityAvailable: e.target.value ? parseInt(e.target.value) : null
                  })}
                  className="input w-full"
                  min="0"
                  placeholder="Leave empty for unlimited"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited availability</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Image URL (optional)</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="input w-full"
                  placeholder="https://..."
                />
              </div>

              {editingReward && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium">Active (visible to children)</label>
                </div>
              )}

              {/* Preview */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">Preview</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-chomper-100 to-chomper-200 flex items-center justify-center text-2xl">
                    {getRewardEmoji(formData.name || 'Reward')}
                  </div>
                  <div>
                    <div className="font-medium">{formData.name || 'Reward Name'}</div>
                    <div className="flex items-center gap-1 text-sm text-chomper-600">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {formData.pointCost.toLocaleString()} points
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingReward ? 'Save Changes' : 'Create Reward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
