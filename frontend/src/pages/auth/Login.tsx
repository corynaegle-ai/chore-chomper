import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-chomper-50 to-purple-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <span className="text-6xl">🦷</span>
          <h1 className="mt-4 text-4xl font-display font-bold text-chomper-600">
            ChoreChomper
          </h1>
          <p className="mt-2 text-gray-600">Chomp through chores, earn rewards!</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10">
          <h2 className="text-2xl font-semibold text-center mb-6">Parent Login</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className={`mt-1 input ${errors.email ? 'input-error' : ''}`}
                placeholder="parent@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                className={`mt-1 input ${errors.password ? 'input-error' : ''}`}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary btn-lg"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <Link
              to="/register"
              className="w-full btn-secondary btn-lg flex justify-center"
            >
              Create Family Account
            </Link>

            <div className="text-center">
              <Link
                to="/child-login"
                className="text-chomper-600 hover:text-chomper-700 font-medium"
              >
                🧒 I'm a kid! Let me in →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
