import { useEffect, useState } from 'react';
import { Plus, Edit2, KeyRound, Trash2, X, Loader2 } from 'lucide-react';
import { userApi, User } from '../../api/client';

const AVATAR_PRESETS = ['👦', '👧', '🧒', '👶', '🦸', '🧙', '🦊', '🐱', '🐶', '🦄', '🐸', '🐼'];

export default function ChildrenPage() {
  const [children, setChildren] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingChild, setEditingChild] = useState<User | null>(null);
  const [showPinReset, setShowPinReset] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({ name: '', pin: '', confirmPin: '', avatarPreset: '👦', phoneNumber: '' });
  const [newPin, setNewPin] = useState('');

  useEffect(() => { loadChildren(); }, []);

  const loadChildren = async () => {
    try {
      const res = await userApi.getChildren();
      if (res.data.success) setChildren(res.data.data || []);
    } catch (err) {
      setError('Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setFormData({ name: '', pin: '', confirmPin: '', avatarPreset: '👦', phoneNumber: '' });
    setEditingChild(null);
    setShowModal(true);
    setError('');
  };

  const openEditModal = (child: User) => {
    setFormData({ name: child.name, pin: '', confirmPin: '', avatarPreset: child.avatarPreset || '👦', phoneNumber: child.phoneNumber || '' });
    setEditingChild(child);
    setShowModal(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!editingChild && formData.pin !== formData.confirmPin) {
      setError('PINs do not match');
      return;
    }
    if (!editingChild && formData.pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    setSaving(true);
    try {
      if (editingChild) {
        await userApi.update(editingChild.id, {
          name: formData.name,
          avatarPreset: formData.avatarPreset,
          phoneNumber: formData.phoneNumber || undefined,
        });
      } else {
        await userApi.createChild({
          name: formData.name,
          pin: formData.pin,
          avatarPreset: formData.avatarPreset,
          phoneNumber: formData.phoneNumber || undefined,
        });
      }
      setShowModal(false);
      loadChildren();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePinReset = async (childId: string) => {
    if (newPin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    setSaving(true);
    try {
      await userApi.resetPin(childId, newPin);
      setShowPinReset(null);
      setNewPin('');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to reset PIN');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (child: User) => {
    if (!confirm(`Remove ${child.name} from your family? This cannot be undone.`)) return;
    try {
      await userApi.deactivate(child.id);
      loadChildren();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to remove child');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-chomper-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Children</h1>
        <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Child
        </button>
      </div>

      {children.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">👶</div>
          <h2 className="text-xl font-semibold mb-2">No children yet</h2>
          <p className="text-gray-500 mb-4">Add your first child to get started with chores!</p>
          <button onClick={openAddModal} className="btn btn-primary">Add Your First Child</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <div key={child.id} className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                    {child.avatarPreset || '👤'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{child.name}</h3>
                    <p className="text-sm text-gray-500">{child.phoneNumber || 'No phone'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
                <span className="text-sm text-gray-600">Points Balance</span>
                <span className="text-xl font-bold text-chomper-600">{child.pointsBalance}</span>
              </div>

              <div className="flex gap-2">
                <button onClick={() => openEditModal(child)} className="btn btn-secondary btn-sm flex-1 flex items-center justify-center gap-1">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => setShowPinReset(child.id)} className="btn btn-secondary btn-sm flex items-center justify-center gap-1">
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDeactivate(child)} className="btn btn-sm text-red-600 hover:bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* PIN Reset inline */}
              {showPinReset === child.id && (
                <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm font-medium mb-2">Reset PIN for {child.name}</p>
                  <div className="flex gap-2">
                    <input type="password" placeholder="New PIN" value={newPin} onChange={(e) => setNewPin(e.target.value)}
                      className="input flex-1" maxLength={6} />
                    <button onClick={() => handlePinReset(child.id)} disabled={saving} className="btn btn-primary btn-sm">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </button>
                    <button onClick={() => { setShowPinReset(null); setNewPin(''); }} className="btn btn-secondary btn-sm">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingChild ? 'Edit Child' : 'Add Child'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full" required />
              </div>

              {!editingChild && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">PIN (for login)</label>
                    <input type="password" value={formData.pin} onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                      className="input w-full" placeholder="4-6 digits" maxLength={6} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Confirm PIN</label>
                    <input type="password" value={formData.confirmPin} onChange={(e) => setFormData({ ...formData, confirmPin: e.target.value })}
                      className="input w-full" maxLength={6} required />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Phone (optional)</label>
                <input type="tel" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="input w-full" placeholder="For notifications" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Avatar</label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_PRESETS.map((avatar) => (
                    <button key={avatar} type="button" onClick={() => setFormData({ ...formData, avatarPreset: avatar })}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${formData.avatarPreset === avatar ? 'bg-chomper-100 ring-2 ring-chomper-500' : 'bg-gray-100 hover:bg-gray-200'}`}>
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingChild ? 'Save Changes' : 'Add Child'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
