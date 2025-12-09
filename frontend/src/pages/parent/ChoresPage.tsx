import { useEffect, useState } from 'react';
import { Plus, X, Loader2, Trash2, Edit2, Zap } from 'lucide-react';
import { choreApi, userApi, Chore, User } from '../../api/client';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  VERIFIED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function ChoresPage() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [children, setChildren] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    name: '', description: '', assignedToId: '', pointValue: 10, dueDate: '',
    isAvailable: false, isBonus: false
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [choresRes, childrenRes] = await Promise.all([
        choreApi.getAll(),
        userApi.getChildren(),
      ]);
      if (choresRes.data.success) setChores(choresRes.data.data || []);
      if (childrenRes.data.success) setChildren(childrenRes.data.data || []);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setFormData({ 
      name: '', description: '', assignedToId: '', pointValue: 10, dueDate: '',
      isAvailable: false, isBonus: false
    });
    setEditingChore(null);
    setShowModal(true);
    setError('');
  };

  const openEditModal = (chore: Chore) => {
    const isAvailable = !chore.assignedTo;
    setFormData({
      name: chore.name,
      description: chore.description || '',
      assignedToId: chore.assignedTo?.id || '',
      pointValue: chore.pointValue,
      dueDate: chore.dueDate ? new Date(chore.dueDate).toISOString().split('T')[0] : '',
      isAvailable,
      isBonus: chore.isBonus || false
    });
    setEditingChore(chore);
    setShowModal(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.isAvailable && !formData.assignedToId) {
      setError('Please select a child or make the chore available to all');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        assignedToId: formData.isAvailable ? undefined : formData.assignedToId,
        pointValue: formData.pointValue,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        isBonus: formData.isBonus
      };

      if (editingChore) {
        await choreApi.update(editingChore.id, {
          ...payload,
          assignedToId: formData.isAvailable ? null : formData.assignedToId
        });
      } else {
        await choreApi.create(payload);
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save chore');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (chore: Chore) => {
    if (!confirm(`Delete "${chore.name}"?`)) return;
    try {
      await choreApi.delete(chore.id);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete');
    }
  };

  const filteredChores = chores.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'available') return !c.assignedTo;
    return c.status === filter;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-chomper-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Chores</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input flex-1 sm:flex-none">
            <option value="all">All Chores</option>
            <option value="available">Available (Bonus)</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Awaiting Review</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Chore
          </button>
        </div>
      </div>

      {filteredChores.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-semibold mb-2">No chores yet</h2>
          <p className="text-gray-500 mb-4">Create your first chore to assign to your children!</p>
          <button onClick={openAddModal} className="btn btn-primary">Create First Chore</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-600">Chore</th>
                  <th className="text-left p-4 font-medium text-gray-600">Assigned To</th>
                  <th className="text-left p-4 font-medium text-gray-600">Points</th>
                  <th className="text-left p-4 font-medium text-gray-600">Due</th>
                  <th className="text-left p-4 font-medium text-gray-600">Status</th>
                  <th className="text-right p-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredChores.map((chore) => (
                  <tr key={chore.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {chore.isBonus && (
                          <span className="text-xs bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded font-bold">
                            <Zap className="w-3 h-3 inline" />
                          </span>
                        )}
                        <div>
                          <p className="font-medium">{chore.name}</p>
                          {chore.description && <p className="text-sm text-gray-500 truncate max-w-xs">{chore.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {chore.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{chore.assignedTo.avatarPreset || '👤'}</span>
                          <span>{chore.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700">
                          Available to all
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-medium text-chomper-600">{chore.pointValue}</td>
                    <td className="p-4 text-sm text-gray-500">
                      {chore.dueDate ? new Date(chore.dueDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[chore.status]}`}>
                        {chore.status === 'COMPLETED' ? 'REVIEW' : chore.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        {(chore.status === 'PENDING' || chore.status === 'REJECTED') && (
                          <>
                            <button onClick={() => openEditModal(chore)} className="p-2 hover:bg-gray-100 rounded">
                              <Edit2 className="w-4 h-4 text-gray-500" />
                            </button>
                            <button onClick={() => handleDelete(chore)} className="p-2 hover:bg-red-50 rounded">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingChore ? 'Edit Chore' : 'Add Chore'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Chore Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full" placeholder="e.g., Make bed" required />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full" rows={2} placeholder="Extra details..." />
              </div>

              {/* Available to all checkbox */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked, assignedToId: '' })}
                    className="w-4 h-4 text-chomper-600 rounded focus:ring-chomper-500"
                  />
                  <div>
                    <span className="font-medium text-gray-800 flex items-center gap-1">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      Available to all children
                    </span>
                    <p className="text-xs text-gray-500">Kids can claim this chore for bonus points</p>
                  </div>
                </label>
              </div>

              {/* Bonus badge (only when available) */}
              {formData.isAvailable && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.isBonus}
                    onChange={(e) => setFormData({ ...formData, isBonus: e.target.checked })}
                    className="w-4 h-4 text-yellow-500 rounded focus:ring-yellow-400"
                  />
                  <span className="text-sm">Mark as <span className="font-bold text-yellow-600">BONUS</span> chore (highlighted for kids)</span>
                </label>
              )}

              {/* Assignee dropdown (hidden when available) */}
              {!formData.isAvailable && (
                <div>
                  <label className="block text-sm font-medium mb-1">Assign To</label>
                  <select value={formData.assignedToId} onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                    className="input w-full" required={!formData.isAvailable}>
                    <option value="">Select a child</option>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>{child.avatarPreset} {child.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Points</label>
                  <input type="number" value={formData.pointValue} onChange={(e) => setFormData({ ...formData, pointValue: parseInt(e.target.value) || 0 })}
                    className="input w-full" min={0} max={1000} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="input w-full" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingChore ? 'Save Changes' : 'Create Chore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
