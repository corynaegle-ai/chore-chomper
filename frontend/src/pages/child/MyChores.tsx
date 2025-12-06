import { useEffect, useState } from 'react';
import { choreApi, Chore } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { 
  Star, Clock, CheckCircle, XCircle, Sparkles, 
  AlertCircle, Camera, Send, ChevronDown, ChevronUp
} from 'lucide-react';

type ChoreFilter = 'all' | 'PENDING' | 'COMPLETED' | 'REJECTED' | 'VERIFIED';

export default function MyChores() {
  const { refreshUser } = useAuth();
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ChoreFilter>('all');
  const [expandedChore, setExpandedChore] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    loadChores();
  }, []);

  const loadChores = async () => {
    try {
      const response = await choreApi.getMy();
      if (response.data.data) {
        setChores(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load chores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (choreId: string) => {
    setCompleting(choreId);
    try {
      const notes = completionNotes[choreId];
      await choreApi.complete(choreId, { notes });
      await loadChores();
      await refreshUser();
      setExpandedChore(null);
      setCompletionNotes((prev) => {
        const next = { ...prev };
        delete next[choreId];
        return next;
      });
    } catch (error: any) {
      console.error('Failed to complete chore:', error);
      alert(error.response?.data?.error?.message || 'Failed to complete chore');
    } finally {
      setCompleting(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'VERIFIED':
        return <Sparkles className="w-5 h-5 text-green-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'To Do';
      case 'COMPLETED':
        return 'Waiting for Approval';
      case 'REJECTED':
        return 'Need to Redo';
      case 'VERIFIED':
        return 'Completed! ✓';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'VERIFIED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredChores = filter === 'all' 
    ? chores 
    : chores.filter(c => c.status === filter);

  const filterCounts = {
    all: chores.length,
    PENDING: chores.filter(c => c.status === 'PENDING').length,
    COMPLETED: chores.filter(c => c.status === 'COMPLETED').length,
    REJECTED: chores.filter(c => c.status === 'REJECTED').length,
    VERIFIED: chores.filter(c => c.status === 'VERIFIED').length,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">My Chores</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {[
          { value: 'all' as ChoreFilter, label: 'All', count: filterCounts.all },
          { value: 'PENDING' as ChoreFilter, label: 'To Do', count: filterCounts.PENDING },
          { value: 'REJECTED' as ChoreFilter, label: 'Redo', count: filterCounts.REJECTED },
          { value: 'COMPLETED' as ChoreFilter, label: 'Pending', count: filterCounts.COMPLETED },
          { value: 'VERIFIED' as ChoreFilter, label: 'Done', count: filterCounts.VERIFIED },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === tab.value
                ? 'bg-chomper-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Chores list */}
      {loading ? (
        <div className="card p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-chomper-500 border-t-transparent mx-auto"></div>
        </div>
      ) : filteredChores.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-5xl mb-4">
            {filter === 'VERIFIED' ? '🏆' : filter === 'PENDING' ? '🎉' : '📋'}
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {filter === 'VERIFIED' 
              ? 'No completed chores yet' 
              : filter === 'PENDING'
              ? 'All caught up!'
              : 'No chores here'}
          </h3>
          <p className="text-gray-600">
            {filter === 'PENDING' 
              ? 'You have no pending chores right now.' 
              : 'Check other categories or wait for new chores.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredChores.map((chore) => (
            <div
              key={chore.id}
              className={`card overflow-hidden transition-shadow ${
                chore.status === 'REJECTED' ? 'border-red-300 bg-red-50/50' : ''
              }`}
            >
              {/* Main row */}
              <div
                className="p-4 flex items-center gap-3 cursor-pointer"
                onClick={() => setExpandedChore(expandedChore === chore.id ? null : chore.id)}
              >
                {getStatusIcon(chore.status)}
                <div className="flex-1">
                  <h3 className="font-medium">{chore.name}</h3>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${getStatusColor(chore.status)}`}>
                    {getStatusText(chore.status)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-chomper-600">
                    <Star className="w-4 h-4" />
                    <span className="font-bold">{chore.pointValue}</span>
                  </div>
                  {expandedChore === chore.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {expandedChore === chore.id && (
                <div className="px-4 pb-4 border-t bg-gray-50/50">
                  <div className="pt-4 space-y-3">
                    {chore.description && (
                      <p className="text-sm text-gray-600">{chore.description}</p>
                    )}

                    {chore.dueDate && (
                      <p className="text-sm text-gray-500">
                        📅 Due: {new Date(chore.dueDate).toLocaleDateString()}
                      </p>
                    )}

                    {chore.category && (
                      <p className="text-sm">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-xs"
                          style={{ backgroundColor: chore.category.color + '20', color: chore.category.color }}
                        >
                          {chore.category.icon} {chore.category.name}
                        </span>
                      </p>
                    )}

                    {/* Rejection feedback */}
                    {chore.status === 'REJECTED' && chore.verificationNotes && (
                      <div className="bg-red-100 border border-red-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-red-800">Parent feedback:</p>
                            <p className="text-red-700 text-sm">"{chore.verificationNotes}"</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Complete button for PENDING or REJECTED chores */}
                    {(chore.status === 'PENDING' || chore.status === 'REJECTED') && (
                      <div className="space-y-3 pt-2">
                        <textarea
                          placeholder="Add a note (optional)"
                          value={completionNotes[chore.id] || ''}
                          onChange={(e) => setCompletionNotes((prev) => ({
                            ...prev,
                            [chore.id]: e.target.value,
                          }))}
                          className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Photo upload would go here
                              alert('Photo upload coming soon!');
                            }}
                            className="flex-1 btn-secondary flex items-center justify-center gap-2"
                          >
                            <Camera className="w-4 h-4" />
                            Add Photo
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleComplete(chore.id);
                            }}
                            disabled={completing === chore.id}
                            className="flex-1 btn-primary flex items-center justify-center gap-2"
                          >
                            {completing === chore.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                {chore.status === 'REJECTED' ? 'Resubmit' : 'Done!'}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Waiting message for COMPLETED chores */}
                    {chore.status === 'COMPLETED' && (
                      <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 text-center">
                        <p className="text-blue-800 text-sm">
                          ⏳ Waiting for a parent to verify this chore...
                        </p>
                      </div>
                    )}

                    {/* Success message for VERIFIED chores */}
                    {chore.status === 'VERIFIED' && (
                      <div className="bg-green-100 border border-green-200 rounded-lg p-3 text-center">
                        <p className="text-green-800">
                          🎉 Great job! You earned <strong>{chore.pointValue} points</strong>!
                        </p>
                        {chore.verificationNotes && (
                          <p className="text-green-700 text-sm mt-1">"{chore.verificationNotes}"</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
