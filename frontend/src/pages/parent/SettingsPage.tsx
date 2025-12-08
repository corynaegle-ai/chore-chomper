import { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, Loader2, Save, TestTube, Check, User, Phone } from 'lucide-react';
import { api } from '../../api/client';

interface NotificationPreferences {
  sms: boolean;
  email: boolean;
  push: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
}

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    sms: true,
    email: true,
    push: false,
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prefsRes, profileRes] = await Promise.all([
        api.get('/notifications/preferences'),
        api.get('/users/me'),
      ]);
      setPreferences(prefsRes.data.data);
      setProfile(profileRes.data.data);
      setPhoneNumber(profileRes.data.data.phoneNumber || '');
    } catch (error) {
      console.error('Failed to load settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      await api.put('/notifications/preferences', preferences);
      setMessage({ type: 'success', text: 'Notification preferences saved!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const savePhoneNumber = async () => {
    try {
      setSavingPhone(true);
      await api.put('/users/me', { phoneNumber: phoneNumber || null });
      setMessage({ type: 'success', text: 'Phone number updated!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save phone:', error);
      setMessage({ type: 'error', text: 'Failed to save phone number' });
    } finally {
      setSavingPhone(false);
    }
  };

  const sendTestNotification = async (channel: 'email' | 'sms') => {
    if (channel === 'sms' && !phoneNumber) {
      setMessage({ type: 'error', text: 'Please add a phone number first' });
      return;
    }
    try {
      setTesting(channel);
      await api.post('/notifications/test', { channel: channel.toUpperCase() });
      setMessage({ type: 'success', text: \`Test \${channel} sent! Check your \${channel === 'email' ? 'inbox' : 'phone'}.\` });
      setTimeout(() => setMessage(null), 5000);
    } catch (error: any) {
      console.error('Failed to send test:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error?.message || \`Failed to send test \${channel}\` 
      });
    } finally {
      setTesting(null);
    }
  };

  const togglePreference = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Bell className="w-6 h-6 text-primary-500" />
        Settings
      </h1>

      {message && (
        <div className={\`p-4 rounded-lg \${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}\`}>
          {message.text}
        </div>
      )}

      {/* Profile Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Profile
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="input bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone Number
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="input flex-1"
              />
              <button
                onClick={savePhoneNumber}
                disabled={savingPhone}
                className="btn-primary px-4"
              >
                {savingPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Required for SMS notifications</p>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Preferences
        </h2>
        
        <p className="text-sm text-gray-600 mb-4">
          Choose how you want to receive notifications about chore completions, reward requests, and more.
        </p>

        <div className="space-y-4">
          {/* Email Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-gray-500">{profile?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => togglePreference('email')}
                className={\`relative w-12 h-6 rounded-full transition-colors \${preferences.email ? 'bg-primary-500' : 'bg-gray-300'}\`}
              >
                <span className={\`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform \${preferences.email ? 'translate-x-6' : ''}\`} />
              </button>
              <button
                onClick={() => sendTestNotification('email')}
                disabled={testing === 'email' || !preferences.email}
                className="btn-secondary text-xs py-1 px-2"
              >
                {testing === 'email' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Test'}
              </button>
            </div>
          </div>

          {/* SMS Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-gray-500">{phoneNumber || 'No phone number set'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => togglePreference('sms')}
                disabled={!phoneNumber}
                className={\`relative w-12 h-6 rounded-full transition-colors \${preferences.sms && phoneNumber ? 'bg-primary-500' : 'bg-gray-300'}\`}
              >
                <span className={\`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform \${preferences.sms && phoneNumber ? 'translate-x-6' : ''}\`} />
              </button>
              <button
                onClick={() => sendTestNotification('sms')}
                disabled={testing === 'sms' || !preferences.sms || !phoneNumber}
                className="btn-secondary text-xs py-1 px-2"
              >
                {testing === 'sms' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Test'}
              </button>
            </div>
          </div>

          {/* Push Toggle (Coming Soon) */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg opacity-50">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-purple-500" />
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-gray-500">Coming soon</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                disabled
                className="relative w-12 h-6 rounded-full bg-gray-300 cursor-not-allowed"
              >
                <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full" />
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={savePreferences}
          disabled={saving}
          className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Preferences
            </>
          )}
        </button>
      </div>

      {/* Notification Types Info */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">What You'll Be Notified About</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            When a child completes a chore (needs verification)
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            When a child requests a reward redemption
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Chore reminders (for overdue chores)
          </li>
        </ul>
      </div>
    </div>
  );
}
