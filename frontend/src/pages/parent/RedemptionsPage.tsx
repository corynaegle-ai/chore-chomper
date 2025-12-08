import { useEffect, useState } from 'react';
import { Check, X, Gift, Loader2, Star, Clock, CheckCircle, XCircle, Package } from 'lucide-react';
import { redemptionApi, Redemption } from '../../api/client';

const REWARD_EMOJIS: { [key: string]: string } = {
  gaming: '🎮', screen: '📱', movie: '🎬', ice: '🍦', pizza: '🍕',
  dinner: '🍽️', trip: '🚗', money: '💵', allowance: '💵', toy: '🧸',
  game: '🎮', treat: '🍭', party: '🎉', sleep: '🌙', late: '🌙',
};

function getRewardEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(REWARD_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return '🎁';
}

type Tab = 'pending' | 'approved' | 'rejected' | 'fulfilled';

export default function RedemptionsPage() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('pending');

  useEffect(() => { loadRedemptions(); }, []);

  const loadRedemptions = async () => {
    try {
      const res = await redemptionApi.getAll();
      if (res.data.success) setRedemptions(res.data.data || []);
    } catch (err) {
      setError('Failed to load redemptions');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setProcessing(id);
    setError('');
    setSuccess('');

    try {
      const res = await redemptionApi.review(id, { status });
      if (res.data.success) {
        setSuccess(res.data.message || `Redemption ${status.toLowerCase()}`);
        loadRedemptions();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to process');
    } finally {
      setProcessing(null);
    }
  };

  const handleFulfill = async (id: string) => {
    setProcessing(id);
    setError('');

    try {
      const res = await redemptionApi.fulfill(id);
      if (res.data.success) {
        setSuccess(res.data.message || 'Reward fulfilled!');
        loadRedemptions();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fulfill');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-chomper-500" /></div>;
  }

  const filterByStatus = (status: Tab) => {
    if (status === 'pending') return redemptions.filter(r => r.status === 'PENDING');
    if (status === 'approved') return redemptions.filter(r => r.status === 'APPROVED');
    if (status === 'rejected') return redemptions.filter(r => r.status === 'REJECTED');
    return redemptions.filter(r => r.status === 'FULFILLED');
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'pending', label: 'Pending', icon: <Clock className="w-4 h-4" />, color: 'yellow' },
    { key: 'approved', label: 'Approved', icon: <CheckCircle className="w-4 h-4" />, color: 'blue' },
    { key: 'fulfilled', label: 'Fulfilled', icon: <Package className="w-4 h-4" />, color: 'green' },
    { key: 'rejected', label: 'Rejected', icon: <XCircle className="w-4 h-4" />, color: 'red' },
  ];

  const pendingCount = filterByStatus('pending').length;
  const approvedCount = filterByStatus('approved').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="w-7 h-7 text-chomper-500" />
          Reward Requests
        </h1>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm flex items-center gap-2"><Check className="w-5 h-5" />{success}</div>}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 bg-yellow-50 border border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
              <p className="text-sm text-yellow-600">Pending Approval</p>
            </div>
          </div>
        </div>
        <div className="card p-4 bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{approvedCount}</p>
              <p className="text-sm text-blue-600">Ready to Fulfill</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-white shadow text-chomper-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {tab.icon}
            {tab.label}
            {tab.key === 'pending' && pendingCount > 0 && (
              <span className="ml-1 bg-yellow-400 text-yellow-900 text-xs px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Redemption List */}
      <div className="space-y-3">
        {filterByStatus(activeTab).length === 0 ? (
          <div className="card p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">{activeTab === 'pending' ? '✨' : activeTab === 'fulfilled' ? '🎉' : '📭'}</div>
            <p>No {activeTab} requests</p>
          </div>
        ) : (
          filterByStatus(activeTab).map((redemption) => (
            <div key={redemption.id} className="card p-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-chomper-100 to-chomper-200 flex items-center justify-center text-3xl">
                  {getRewardEmoji(redemption.reward?.name || '')}
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{redemption.reward?.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                    <span className="font-medium text-chomper-600">{redemption.child?.name}</span>
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {redemption.pointsSpent} pts
                    </span>
                    <span>{new Date(redemption.requestedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {redemption.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleReview(redemption.id, 'REJECTED')}
                        disabled={processing === redemption.id}
                        className="btn btn-sm text-red-600 hover:bg-red-50"
                      >
                        {processing === redemption.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleReview(redemption.id, 'APPROVED')}
                        disabled={processing === redemption.id}
                        className="btn btn-primary btn-sm flex items-center gap-1"
                      >
                        {processing === redemption.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Approve</>}
                      </button>
                    </>
                  )}
                  {redemption.status === 'APPROVED' && (
                    <button
                      onClick={() => handleFulfill(redemption.id)}
                      disabled={processing === redemption.id}
                      className="btn btn-primary btn-sm flex items-center gap-1"
                    >
                      {processing === redemption.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Package className="w-4 h-4" /> Mark Fulfilled</>}
                    </button>
                  )}
                  {redemption.status === 'FULFILLED' && (
                    <span className="text-green-600 flex items-center gap-1 text-sm font-medium">
                      <CheckCircle className="w-5 h-5" /> Completed
                    </span>
                  )}
                  {redemption.status === 'REJECTED' && (
                    <span className="text-red-500 flex items-center gap-1 text-sm">
                      <XCircle className="w-5 h-5" /> Rejected
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
