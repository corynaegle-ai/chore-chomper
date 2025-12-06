import { useEffect, useState } from 'react';
import { Check, X, Loader2, MessageSquare, Image, AlertCircle } from 'lucide-react';
import { choreApi, Chore } from '../../api/client';

export default function VerifyChores() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadChores(); }, []);

  const loadChores = async () => {
    try {
      const res = await choreApi.getPendingVerification();
      if (res.data.success) setChores(res.data.data || []);
    } catch (err) {
      setError('Failed to load chores');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (choreId: string, approved: boolean) => {
    setVerifying(choreId);
    setError('');
    setSuccess('');
    
    try {
      const res = await choreApi.verify(choreId, {
        approved,
        feedback: feedback[choreId] || undefined,
      });
      if (res.data.success) {
        setSuccess(res.data.message || (approved ? 'Chore approved!' : 'Chore sent back'));
        setChores(chores.filter(c => c.id !== choreId));
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to verify');
    } finally {
      setVerifying(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-chomper-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Verify Completed Chores</h1>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5" /> {success}
        </div>
      )}

      {chores.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-semibold mb-2">All caught up!</h2>
          <p className="text-gray-500">No chores waiting for verification.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {chores.map((chore) => (
            <div key={chore.id} className="card overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">
                    {chore.assignedTo.avatarPreset || '👤'}
                  </div>
                  <div>
                    <h3 className="font-semibold">{chore.name}</h3>
                    <p className="text-sm text-gray-500">
                      {chore.assignedTo.name} • {chore.pointValue} pts
                    </p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Completed {chore.completedAt ? new Date(chore.completedAt).toLocaleDateString() : 'recently'}
                </div>
              </div>

              <div className="p-4 space-y-4">
                {chore.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Description</p>
                    <p className="text-gray-700">{chore.description}</p>
                  </div>
                )}

                {chore.completionNotes && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-700 mb-1">
                      <MessageSquare className="w-4 h-4" /> Child's Notes
                    </div>
                    <p className="text-blue-800">{chore.completionNotes}</p>
                  </div>
                )}

                {chore.photoUrl && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
                      <Image className="w-4 h-4" /> Photo Proof
                    </p>
                    <img src={chore.photoUrl} alt="Chore proof" className="rounded-lg max-h-64 object-contain bg-gray-100" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Feedback (optional)
                  </label>
                  <textarea
                    value={feedback[chore.id] || ''}
                    onChange={(e) => setFeedback({ ...feedback, [chore.id]: e.target.value })}
                    className="input w-full"
                    rows={2}
                    placeholder="Leave a note for your child..."
                  />
                </div>
              </div>

              <div className="p-4 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={() => handleVerify(chore.id, false)}
                  disabled={verifying === chore.id}
                  className="btn flex-1 bg-red-100 text-red-700 hover:bg-red-200 flex items-center justify-center gap-2"
                >
                  {verifying === chore.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <X className="w-4 h-4" /> Needs Redo
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleVerify(chore.id, true)}
                  disabled={verifying === chore.id}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {verifying === chore.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Approve
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
