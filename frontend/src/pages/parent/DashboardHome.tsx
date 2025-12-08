import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ClipboardList, Gift, AlertCircle, TrendingUp, RefreshCw, Link2, Copy, Check, Share2 } from 'lucide-react';
import { familyApi, choreApi, FamilyStats, Chore } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState<FamilyStats | null>(null);
  const [pendingVerification, setPendingVerification] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const familyLoginLink = user?.family?.inviteCode 
    ? `${window.location.origin}/child-login?family=${user.family.inviteCode}`
    : '';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, pendingRes] = await Promise.all([
        familyApi.getStats(),
        choreApi.getPendingVerification(),
      ]);
      if (statsRes.data.success) setStats(statsRes.data.data as FamilyStats);
      if (pendingRes.data.success) setPendingVerification(pendingRes.data.data as Chore[]);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const copyFamilyLink = async () => {
    try {
      await navigator.clipboard.writeText(familyLoginLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = familyLoginLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const shareFamilyLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ChoreChomper Family Login',
          text: `Join our family on ChoreChomper! Use this link to log in:`,
          url: familyLoginLink,
        });
      } catch (err) {
        // User cancelled or share failed, fall back to copy
        copyFamilyLink();
      }
    } else {
      copyFamilyLink();
    }
  };

  if (loading) {
    return (
      <div className=flex items-center justify-center h-64>
        <div className=animate-spin rounded-full h-8 w-8 border-2 border-chomper-500 border-t-transparent></div>
      </div>
    );
  }

  return (
    <div className=space-y-6>
      {/* Welcome */}
      <div>
        <h1 className=text-2xl font-bold text-gray-900>Welcome back, {user?.name}!</h1>
        <p className=text-gray-600>{user?.family?.name} Dashboard</p>
      </div>

      {error && (
        <div className=bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2>
          <AlertCircle className=w-5 h-5 /> {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className=grid grid-cols-2 lg:grid-cols-4 gap-4>
        <Link to=/parent/children className=card p-5 hover:shadow-md transition-shadow>
          <div className=flex items-center gap-3>
            <div className=p-2.5 bg-blue-100 rounded-lg>
              <Users className=w-5 h-5 text-blue-600 />
            </div>
            <div>
              <p className=text-sm text-gray-500>Children</p>
              <p className=text-2xl font-bold>{stats?.children || 0}</p>
            </div>
          </div>
        </Link>

        <Link to=/parent/chores className=card p-5 hover:shadow-md transition-shadow>
          <div className=flex items-center gap-3>
            <div className=p-2.5 bg-yellow-100 rounded-lg>
              <ClipboardList className=w-5 h-5 text-yellow-600 />
            </div>
            <div>
              <p className=text-sm text-gray-500>Active Chores</p>
              <p className=text-2xl font-bold>{stats?.chores.pending || 0}</p>
            </div>
          </div>
        </Link>

        <Link to=/parent/verify className=card p-5 hover:shadow-md transition-shadow relative>
          {(stats?.chores.awaitingVerification || 0) > 0 && (
            <span className=absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full>
              {stats?.chores.awaitingVerification}
            </span>
          )}
          <div className=flex items-center gap-3>
            <div className=p-2.5 bg-orange-100 rounded-lg>
              <RefreshCw className=w-5 h-5 text-orange-600 />
            </div>
            <div>
              <p className=text-sm text-gray-500>Needs Review</p>
              <p className=text-2xl font-bold>{stats?.chores.awaitingVerification || 0}</p>
            </div>
          </div>
        </Link>

        <div className=card p-5>
          <div className=flex items-center gap-3>
            <div className=p-2.5 bg-green-100 rounded-lg>
              <TrendingUp className=w-5 h-5 text-green-600 />
            </div>
            <div>
              <p className=text-sm text-gray-500>Completed</p>
              <p className=text-2xl font-bold>{stats?.chores.completed || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Family Login Link Card */}
      <div className=card p-5 bg-gradient-to-r from-purple-50 to-chomper-50 border-purple-200>
        <div className=flex items-start gap-3>
          <div className=p-2.5 bg-purple-100 rounded-lg flex-shrink-0>
            <Link2 className=w-5 h-5 text-purple-600 />
          </div>
          <div className=flex-1 min-w-0>
            <h3 className=font-semibold text-gray-900 mb-1>Kids Login Link</h3>
            <p className=text-sm text-gray-600 mb-3>
              Share this link with your kids so they can easily log in without remembering the family code.
            </p>
            <div className=flex flex-col sm:flex-row gap-2>
              <div className=flex-1 bg-white rounded-lg px-3 py-2 border border-gray-200 overflow-hidden>
                <p className=text-sm font-mono text-gray-700 truncate>{familyLoginLink}</p>
              </div>
              <div className=flex gap-2>
                <button
                  onClick={copyFamilyLink}
                  className=flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors
                >
                  {linkCopied ? (
                    <>
                      <Check className=w-4 h-4 text-green-600 />
                      <span className=text-sm text-green-600>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className=w-4 h-4 text-gray-600 />
                      <span className=text-sm>Copy</span>
                    </>
                  )}
                </button>
                <button
                  onClick={shareFamilyLink}
                  className=flex items-center gap-2 px-4 py-2 bg-chomper-500 text-white rounded-lg hover:bg-chomper-600 transition-colors
                >
                  <Share2 className=w-4 h-4 />
                  <span className=text-sm>Share</span>
                </button>
              </div>
            </div>
            <p className=text-xs text-gray-500 mt-2>
              💡 Tip: Save this as a bookmark or home screen shortcut on your kids' devices!
            </p>
          </div>
        </div>
      </div>

      {/* Pending Verification Section */}
      {pendingVerification.length > 0 && (
        <div className=card>
          <div className=p-4 border-b flex justify-between items-center>
            <h2 className=font-semibold text-lg>🔔 Chores Awaiting Your Review</h2>
            <Link to=/parent/verify className=text-sm text-chomper-600 hover:underline>
              View all →
            </Link>
          </div>
          <div className=divide-y>
            {pendingVerification.slice(0, 5).map((chore) => (
              <div key={chore.id} className=p-4 flex items-center justify-between>
                <div className=flex items-center gap-3>
                  <div className=w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg>
                    {chore.assignedTo.avatarPreset || '👤'}
                  </div>
                  <div>
                    <p className=font-medium>{chore.name}</p>
                    <p className=text-sm text-gray-500>
                      {chore.assignedTo.name} • {chore.pointValue} pts
                    </p>
                  </div>
                </div>
                <Link
                  to=/parent/verify
                  className=btn btn-primary btn-sm
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {stats?.children === 0 && (
        <div className=card p-6 bg-gradient-to-r from-chomper-50 to-blue-50 border-chomper-200>
          <h2 className=text-xl font-bold mb-2>🚀 Get Started</h2>
          <p className=text-gray-600 mb-4>Add your first child to start assigning chores!</p>
          <Link to=/parent/children className=btn btn-primary>
            Add Child
          </Link>
        </div>
      )}
    </div>
  );
}
