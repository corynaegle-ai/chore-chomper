import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, Tag } from 'lucide-react';
import { categoryApi, Category } from '../../api/client';

const COLOR_PRESETS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#78716c', '#000000',
];

const ICON_PRESETS = [
  { icon: 'bed', label: '🛏️' },
  { icon: 'kitchen', label: '🍳' },
  { icon: 'bathroom', label: '🚿' },
  { icon: 'laundry', label: '🧺' },
  { icon: 'garden', label: '🌱' },
  { icon: 'car', label: '🚗' },
  { icon: 'pet', label: '🐕' },
  { icon: 'trash', label: '🗑️' },
  { icon: 'dishes', label: '🍽️' },
  { icon: 'vacuum', label: '🧹' },
  { icon: 'homework', label: '📚' },
  { icon: 'general', label: '✨' },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({ name: '', color: '#6366f1', icon: 'general' });

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      const res = await categoryApi.getAll();
      if (res.data.success) setCategories(res.data.data || []);
    } catch (err) {
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setFormData({ name: '', color: '#6366f1', icon: 'general' });
    setEditingCategory(null);
    setShowModal(true);
    setError('');
  };

  const openEditModal = (category: Category) => {
    setFormData({ name: category.name, color: category.color, icon: category.icon || 'general' });
    setEditingCategory(category);
    setShowModal(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        await categoryApi.update(editingCategory.id, {
          name: formData.name.trim(),
          color: formData.color,
          icon: formData.icon,
        });
      } else {
        await categoryApi.create({
          name: formData.name.trim(),
          color: formData.color,
          icon: formData.icon,
        });
      }
      setShowModal(false);
      loadCategories();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    const choreCount = category._count?.chores || 0;
    const templateCount = category._count?.choreTemplates || 0;
    const total = choreCount + templateCount;
    
    const message = total > 0 
      ? `Delete "${category.name}"? ${total} item(s) will become uncategorized.`
      : `Delete "${category.name}"?`;
    
    if (!confirm(message)) return;
    
    try {
      await categoryApi.delete(category.id);
      loadCategories();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete category');
    }
  };

  const getIconLabel = (iconName: string) => {
    const preset = ICON_PRESETS.find(p => p.icon === iconName);
    return preset?.label || '✨';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-chomper-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Categories</h1>
        <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      {categories.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">🏷️</div>
          <h2 className="text-xl font-semibold mb-2">No categories yet</h2>
          <p className="text-gray-500 mb-4">Create categories to organize your chores!</p>
          <button onClick={openAddModal} className="btn btn-primary">Create Your First Category</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div key={category.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    {getIconLabel(category.icon)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                      <span className="text-xs text-gray-500">{category.color}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  {category._count?.chores || 0} chores
                </span>
              </div>

              <div className="flex gap-2">
                <button onClick={() => openEditModal(category)} className="btn btn-secondary btn-sm flex-1 flex items-center justify-center gap-1">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => handleDelete(category)} className="btn btn-sm text-red-600 hover:bg-red-50 flex items-center justify-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full" 
                  placeholder="e.g., Bedroom, Kitchen, Outdoor"
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_PRESETS.map((preset) => (
                    <button 
                      key={preset.icon} 
                      type="button" 
                      onClick={() => setFormData({ ...formData, icon: preset.icon })}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                        formData.icon === preset.icon 
                          ? 'ring-2 ring-chomper-500' 
                          : 'hover:bg-gray-100'
                      }`}
                      style={{ 
                        backgroundColor: formData.icon === preset.icon ? formData.color + '20' : undefined 
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button 
                      key={color} 
                      type="button" 
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">Preview</p>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: formData.color + '20' }}
                  >
                    {getIconLabel(formData.icon)}
                  </div>
                  <span className="font-medium">{formData.name || 'Category Name'}</span>
                  <div className="w-3 h-3 rounded-full ml-auto" style={{ backgroundColor: formData.color }} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
