import { useState } from 'react';
import { Mail, Lock, User, ChefHat, GraduationCap, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth, type UserRole } from '../lib/AuthContext';

export default function LoginScreen() {
  const { login, signup, loginWithGoogle, error, clearError } = useAuth();

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsLoading(true);
    try {
      if (isSignup) {
        await signup(email, password, name, role);
      } else {
        await login(email, password);
      }
    } catch {
      // Error is handled by context
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    clearError();
    setIsLoading(true);
    try {
      await loginWithGoogle(role);
    } catch {
      // Error handled by context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand/20 rounded-full blur-[120px] -mt-60 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/8 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand rounded-2xl mb-4 shadow-lg shadow-brand/40">
            <span className="text-3xl">🍽️</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">FunctionalCanteen</h1>
          <p className="text-sm text-slate-400">
            {isSignup ? 'Create your account to get started' : 'Welcome back! Sign in to continue'}
          </p>
        </div>

        {/* Role Selector (shown on signup AND login with Google) */}
        {(isSignup || true) && (
          <div className="mb-6">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3 text-center">I am a</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200",
                  role === 'student'
                    ? "border-brand-light bg-brand/20 shadow-lg shadow-brand/10"
                    : "border-slate-800 bg-[#18181B] hover:border-slate-700"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                  role === 'student' ? "bg-brand text-white" : "bg-slate-800 text-slate-400"
                )}>
                  <GraduationCap size={22} />
                </div>
                <div>
                   <div className={cn("text-sm font-bold", role === 'student' ? "text-brand-text" : "text-white")}>Student</div>
                  <div className="text-[10px] text-slate-500">Browse & order food</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('vendor')}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200",
                  role === 'vendor'
                    ? "border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/10"
                    : "border-slate-800 bg-[#18181B] hover:border-slate-700"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                  role === 'vendor' ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-400"
                )}>
                  <ChefHat size={22} />
                </div>
                <div>
                  <div className={cn("text-sm font-bold", role === 'vendor' ? "text-sky-500" : "text-white")}>Vendor</div>
                  <div className="text-[10px] text-slate-500">Manage orders & menu</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name (signup only) */}
          {isSignup && (
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required={isSignup}
                className="w-full bg-[#18181B] border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-muted/50 transition-colors"
              />
            </div>
          )}

          {/* Email */}
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-[#18181B] border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-muted/50 transition-colors"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-[#18181B] border border-slate-800 rounded-xl py-3.5 pl-12 pr-12 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-muted/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2",
              isLoading
                ? "bg-slate-800 text-slate-500 cursor-wait"
                : role === 'vendor'
                  ? "bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/20"
                  : "bg-brand hover:bg-brand-light text-white shadow-lg shadow-brand/20"
            )}
          >
            {isLoading ? (
              <span className="animate-pulse">Processing...</span>
            ) : (
              <>
                {isSignup ? 'Create Account' : 'Sign In'} <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-800"></div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-slate-800"></div>
        </div>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogle}
          disabled={isLoading}
          className="w-full bg-[#18181B] border border-slate-800 hover:bg-slate-900 text-white font-medium py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Toggle Login/Signup */}
        <div className="text-center mt-6">
          <p className="text-sm text-slate-500">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsSignup(!isSignup); clearError(); }}
              className="text-brand-text font-bold hover:text-brand-muted transition-colors"
            >
              {isSignup ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-[10px] text-slate-600">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
