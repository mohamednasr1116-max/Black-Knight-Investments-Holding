import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Lock, Mail, ArrowRight, ShieldCheck, UserPlus, User as UserIcon, ArrowLeft } from 'lucide-react';
import { translations } from '../utils/translations';

interface LoginProps {
  onLogin: (user: User) => void;
  onSignup: (user: User) => void;
  users: User[];
  language?: 'en' | 'ar';
}

const Login: React.FC<LoginProps> = ({ onLogin, onSignup, users, language = 'en' }) => {
  const t = translations[language];
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Simulate API network delay
    setTimeout(() => {
      if (isLoginMode) {
        // --- LOGIN LOGIC ---
        const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

        if (foundUser) {
          onLogin(foundUser);
        } else {
            // Fallback check for initial setup just in case storage failed
            if (email === 'admin@company.com' && password === 'admin') {
               onLogin({
                   id: 'fallback-admin',
                   name: 'System Admin',
                   email: 'admin@company.com',
                   role: UserRole.ADMIN,
                   password: 'admin'
               });
            } else {
                setError('Invalid email or password');
                setIsLoading(false);
            }
        }
      } else {
        // --- SIGNUP LOGIC ---
        const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            setError('User with this email already exists.');
            setIsLoading(false);
            return;
        }

        const newUser: User = {
            id: Date.now().toString(),
            name,
            email,
            password,
            role: UserRole.ADMIN, // Default to Admin for self-signup so they can use the app
            avatar: ''
        };

        onSignup(newUser);
        setSuccess('Account created successfully! Logging in...');
        setTimeout(() => onLogin(newUser), 1000);
      }
    }, 800);
  };

  const toggleMode = () => {
      setIsLoginMode(!isLoginMode);
      setError('');
      setSuccess('');
      // Keep email/password for convenience, or clear if preferred
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full blur-3xl"></div>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 z-10 relative transition-all duration-300">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
             <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t.login.title}</h1>
          <p className="text-slate-500 mt-2">
              {isLoginMode ? t.login.subtitle : t.login.createAccount}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg text-center animate-pulse">
              {error}
            </div>
          )}
           {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm rounded-lg text-center">
              {success}
            </div>
          )}
          
          {!isLoginMode && (
            <div className="space-y-2 animate-fadeIn">
                <label className="text-sm font-medium text-slate-700">{t.login.fullName}</label>
                <div className="relative">
                <UserIcon className="absolute start-3 top-3 w-5 h-5 text-slate-400" />
                <input 
                    type="text" 
                    required={!isLoginMode}
                    className="w-full ps-10 pe-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">{t.login.email}</label>
            <div className="relative">
              <Mail className="absolute start-3 top-3 w-5 h-5 text-slate-400" />
              <input 
                type="email" 
                required
                className="w-full ps-10 pe-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">{t.login.password}</label>
            <div className="relative">
              <Lock className="absolute start-3 top-3 w-5 h-5 text-slate-400" />
              <input 
                type="password" 
                required
                className="w-full ps-10 pe-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : isLoginMode ? (
              <>
                {t.login.signIn} <ArrowRight className="w-5 h-5 rtl:rotate-180" />
              </>
            ) : (
              <>
                {t.login.createAccount} <UserPlus className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button 
                onClick={toggleMode}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center justify-center gap-2 mx-auto"
            >
                {isLoginMode ? (
                    <>{t.login.newHere}</>
                ) : (
                    <><ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t.login.back}</>
                )}
            </button>
        </div>
        
        {isLoginMode && (
             <div className="mt-4 text-center">
                <p className="text-xs text-slate-400">
                    {t.login.defaultLogin}: admin@company.com / admin
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Login;