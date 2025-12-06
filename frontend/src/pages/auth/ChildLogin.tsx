import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function ChildLogin() {
  const { childLogin } = useAuth();
  const [familyCode, setFamilyCode] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'code' | 'pin'>('code');

  const handleCodeSubmit = () => {
    if (familyCode.length === 6) {
      setStep('pin');
    }
  };

  const handlePinPress = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      
      // Auto-submit when PIN is complete
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
      toast.success('Welcome back! 🎉');
    } catch (error: any) {
      toast.error('Oops! Wrong code or PIN. Try again!');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('code');
    setPin('');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 bg-gradient-to-br from-green-100 via-blue-100 to-purple-100">
      <div className="mx-auto w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-7xl animate-bounce-slow">🦷</span>
          <h1 className="mt-4 text-4xl font-display font-bold text-chomper-600">
            Hi there!
          </h1>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl">
          {step === 'code' ? (
            <>
              <h2 className="text-xl font-semibold text-center mb-6">
                Enter your Family Code
              </h2>
              
              <input
                type="text"
                value={familyCode}
                onChange={(e) => setFamilyCode(e.target.value.toUpperCase().slice(0, 6))}
                className="w-full text-center text-3xl font-mono tracking-widest input py-4 uppercase"
                placeholder="ABC123"
                maxLength={6}
                autoFocus
              />
              
              <p className="mt-2 text-sm text-gray-500 text-center">
                Ask a parent for your family code!
              </p>
              
              <button
                onClick={handleCodeSubmit}
                disabled={familyCode.length !== 6}
                className="w-full mt-6 btn-primary btn-lg text-xl"
              >
                Next →
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleBack}
                className="text-gray-500 hover:text-gray-700 mb-4"
              >
                ← Back
              </button>
              
              <h2 className="text-xl font-semibold text-center mb-4">
                Enter your PIN
              </h2>
              
              {/* PIN display */}
              <div className="flex justify-center gap-3 mb-8">
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
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePinPress(num.toString())}
                    disabled={isLoading}
                    className="h-16 text-2xl font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors touch-target"
                  >
                    {num}
                  </button>
                ))}
                <div></div>
                <button
                  onClick={() => handlePinPress('0')}
                  disabled={isLoading}
                  className="h-16 text-2xl font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors touch-target"
                >
                  0
                </button>
                <button
                  onClick={handlePinDelete}
                  disabled={isLoading || pin.length === 0}
                  className="h-16 text-xl rounded-xl bg-red-100 hover:bg-red-200 active:bg-red-300 transition-colors touch-target disabled:opacity-50"
                >
                  ⌫
                </button>
              </div>
              
              {isLoading && (
                <div className="mt-6 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-chomper-500 border-t-transparent"></div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-gray-600 hover:text-gray-800"
          >
            👨‍👩‍👧‍👦 Parent? Login here
          </Link>
        </div>
      </div>
    </div>
  );
}
