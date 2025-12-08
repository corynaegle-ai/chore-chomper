import Mascot from '../../components/Mascot';
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

interface Child {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarPreset: string | null;
}

const AVATAR_PRESETS: Record<string, string> = {
  cat: '🐱',
  dog: '🐕',
  bunny: '🐰',
  bear: '🐻',
  panda: '🐼',
  lion: '🦁',
  tiger: '🐯',
  unicorn: '🦄',
  dragon: '🐲',
  robot: '🤖',
};

const STORAGE_KEY = 'chorechomper_family_code';

export default function ChildLogin() {
  const { childLogin } = useAuth();
  const [searchParams] = useSearchParams();
  const [familyCode, setFamilyCode] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'code' | 'select' | 'pin'>('code');
  const [familyName, setFamilyName] = useState('');
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [initializing, setInitializing] = useState(true);

  // On mount, check URL param or localStorage for saved family code
  useEffect(() => {
    const init = async () => {
      // Priority: URL param > localStorage
      const urlCode = searchParams.get('family')?.toUpperCase().slice(0, 6);
      const savedCode = localStorage.getItem(STORAGE_KEY);
      const codeToUse = urlCode || savedCode;

      if (codeToUse && codeToUse.length === 6) {
        setFamilyCode(codeToUse);
        // Try to fetch children automatically
        try {
          const response = await api.get(`/auth/family-children/${codeToUse}`);
          const { familyName: name, children: kids } = response.data.data;
          
          if (kids.length > 0) {
            setFamilyName(name);
            setChildren(kids);
            setStep('select');
            // Save to localStorage if it came from URL
            if (urlCode) {
              localStorage.setItem(STORAGE_KEY, urlCode);
            }
          }
        } catch (error) {
          // Invalid saved code, clear it
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setInitializing(false);
    };

    init();
  }, [searchParams]);

  const handleCodeSubmit = async () => {
    if (familyCode.length !== 6) return;
    
    setIsLoading(true);
    try {
      const response = await api.get(`/auth/family-children/${familyCode}`);
      const { familyName: name, children: kids } = response.data.data;
      
      if (kids.length === 0) {
        toast.error('No kids found in this family yet!');
        return;
      }
      
      setFamilyName(name);
      setChildren(kids);
      setStep('select');
      // Save family code for next time
      localStorage.setItem(STORAGE_KEY, familyCode);
    } catch (error: any) {
      toast.error('Family not found. Check your code!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChildSelect = (child: Child) => {
    setSelectedChild(child);
    setStep('pin');
  };

  const handlePinPress = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      
      if (newPin.length === 4) {
        handleLogin(newPin);
      }
    }
  };

  const handlePinDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleLogin = async (finalPin: string) => {
    setIsLoading(true);
    try {
      await childLogin(familyCode, finalPin);
      toast.success(`Welcome back, ${selectedChild?.name}! 🎉`);
    } catch (error: any) {
      toast.error('Wrong PIN! Try again.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'pin') {
      setStep('select');
      setPin('');
      setSelectedChild(null);
    } else if (step === 'select') {
      setStep('code');
      setChildren([]);
      setFamilyName('');
    }
  };

  const handleDifferentFamily = () => {
    localStorage.removeItem(STORAGE_KEY);
    setFamilyCode('');
    setFamilyName('');
    setChildren([]);
    setSelectedChild(null);
    setPin('');
    setStep('code');
  };

  const getAvatar = (child: Child) => {
    if (child.avatarUrl) {
      return <img src={child.avatarUrl} alt={child.name} className=w-16 h-16 rounded-full object-cover />;
    }
    if (child.avatarPreset && AVATAR_PRESETS[child.avatarPreset]) {
      return <span className=text-5xl>{AVATAR_PRESETS[child.avatarPreset]}</span>;
    }
    return <span className=text-5xl>👤</span>;
  };

  // Show loading while checking for saved code
  if (initializing) {
    return (
      <div className=min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-blue-100 to-purple-100>
        <div className=text-center>
          <Mascot size=xl animate />
          <p className=mt-4 text-gray-600>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className=min-h-screen flex flex-col justify-center py-12 px-4 bg-gradient-to-br from-green-100 via-blue-100 to-purple-100>
      <div className=mx-auto w-full max-w-sm>
        <div className=text-center mb-8>
          <Mascot size=xl animate />
          <h1 className=mt-4 text-4xl font-display font-bold text-chomper-600>
            Hi there!
          </h1>
        </div>

        <div className=bg-white py-8 px-6 shadow-xl rounded-2xl>
          {step === 'code' && (
            <>
              <h2 className=text-xl font-semibold text-center mb-6>
                Enter your Family Code
              </h2>
              
              <input
                type=text
                value={familyCode}
                onChange={(e) => setFamilyCode(e.target.value.toUpperCase().slice(0, 6))}
                className=w-full text-center text-3xl font-mono tracking-widest input py-4 uppercase
                placeholder=ABC123
                maxLength={6}
                autoFocus
              />
              
              <p className=mt-2 text-sm text-gray-500 text-center>
                Ask a parent for your family code!
              </p>
              
              <button
                onClick={handleCodeSubmit}
                disabled={familyCode.length !== 6 || isLoading}
                className=w-full mt-6 btn-primary btn-lg text-xl disabled:opacity-50
              >
                {isLoading ? 'Looking...' : 'Next →'}
              </button>
            </>
          )}

          {step === 'select' && (
            <>
              <div className=flex justify-between items-center mb-4>
                <button
                  onClick={handleBack}
                  className=text-gray-500 hover:text-gray-700
                >
                  ← Back
                </button>
                <button
                  onClick={handleDifferentFamily}
                  className=text-sm text-chomper-600 hover:text-chomper-700
                >
                  Different family?
                </button>
              </div>
              
              <h2 className=text-xl font-semibold text-center mb-2>
                Who are you?
              </h2>
              <p className=text-sm text-gray-500 text-center mb-6>
                {familyName} Family
              </p>
              
              <div className=space-y-3>
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => handleChildSelect(child)}
                    className=w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-chomper-400 hover:bg-chomper-50 transition-all
                  >
                    <div className=flex-shrink-0 w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden>
                      {getAvatar(child)}
                    </div>
                    <span className=text-xl font-semibold text-gray-800>
                      {child.name}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'pin' && (
            <>
              <button
                onClick={handleBack}
                className=text-gray-500 hover:text-gray-700 mb-4
              >
                ← Back
              </button>
              
              <div className=text-center mb-6>
                <div className=inline-flex items-center justify-center w-20 h-20 rounded-full bg-chomper-100 mb-3>
                  {selectedChild && getAvatar(selectedChild)}
                </div>
                <h2 className=text-xl font-semibold>
                  Hi, {selectedChild?.name}!
                </h2>
                <p className=text-gray-500>Enter your PIN</p>
              </div>
              
              {/* PIN display */}
              <div className=flex justify-center gap-3 mb-8>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-14 h-14 rounded-full border-4 flex items-center justify-center text-2xl transition-all ${
                      pin.length > i
                        ? 'bg-chomper-500 border-chomper-500 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {pin.length > i ? '●' : ''}
                  </div>
                ))}
              </div>
              
              {/* Number pad */}
              <div className=grid grid-cols-3 gap-3>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePinPress(num.toString())}
                    disabled={isLoading}
                    className=h-16 text-2xl font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors
                  >
                    {num}
                  </button>
                ))}
                <div></div>
                <button
                  onClick={() => handlePinPress('0')}
                  disabled={isLoading}
                  className=h-16 text-2xl font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors
                >
                  0
                </button>
                <button
                  onClick={handlePinDelete}
                  disabled={isLoading || pin.length === 0}
                  className=h-16 text-xl rounded-xl bg-red-100 hover:bg-red-200 active:bg-red-300 transition-colors disabled:opacity-50
                >
                  ⌫
                </button>
              </div>
              
              {isLoading && (
                <div className=mt-6 text-center>
                  <div className=inline-block animate-spin rounded-full h-8 w-8 border-4 border-chomper-500 border-t-transparent></div>
                </div>
              )}
            </>
          )}
        </div>

        <div className=mt-6 text-center>
          <Link
            to=/login
            className=text-gray-600 hover:text-gray-800
          >
            👨‍👩‍👧‍👦 Parent? Login here
          </Link>
        </div>
      </div>
    </div>
  );
}
