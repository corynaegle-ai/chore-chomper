import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const registerSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    familyName: z.string().min(1, 'Family name is required'),
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const { register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      await registerUser(data.email, data.password, data.name, data.familyName);
      toast.success('Welcome to ChoreChomper! 🦷');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Registration failed');
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
          <p className="mt-2 text-gray-600">Start your family's chore adventure!</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10">
          <h2 className="text-2xl font-semibold text-center mb-6">Create Account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Your Name
              </label>
              <input
                {...register('name')}
                type="text"
                className={`mt-1 input ${errors.name ? 'input-error' : ''}`}
                placeholder="Mom, Dad, etc."
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="familyName" className="block text-sm font-medium text-gray-700">
                Family Name
              </label>
              <input
                {...register('familyName')}
                type="text"
                className={`mt-1 input ${errors.familyName ? 'input-error' : ''}`}
                placeholder="The Smith Family"
              />
              {errors.familyName && (
                <p className="mt-1 text-sm text-red-600">{errors.familyName.message}</p>
              )}
            </div>

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
                autoComplete="new-password"
                className={`mt-1 input ${errors.password ? 'input-error' : ''}`}
                placeholder="At least 8 characters"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                {...register('confirmPassword')}
                type="password"
                autoComplete="new-password"
                className={`mt-1 input ${errors.confirmPassword ? 'input-error' : ''}`}
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary btn-lg"
            >
              {isLoading ? 'Creating Account...' : 'Create Family Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-chomper-600 hover:text-chomper-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
