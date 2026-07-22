import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User } from '../types';
import { registerUser, loginUser, resetUserPassword, getFirebaseStatus } from '../lib/firebase';
import { sendAutomatedEmail, buildWelcomeEmailHtml, buildLoginAlertEmailHtml, buildPasswordResetEmailHtml } from '../lib/email';
import { User as UserIcon, Lock, ArrowRight, Phone, Compass, Landmark, KeyRound, ArrowLeft, Check, Mail } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [role, setRole] = useState<'member' | 'temple_team'>('member');
  const { configured, healthy } = getFirebaseStatus();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password || (!isLogin && !email.trim())) {
      setError("Please fill out all required fields.");
      return;
    }

    setError(null);
    setResetSuccess(null);
    setLoading(true);

    try {
      let user: User;
      if (isLogin) {
        user = await loginUser(name, password, role);
        // Send login alert email if email is present
        if (user.email && user.email.includes('@')) {
          sendAutomatedEmail({
            to: user.email,
            subject: `Security Alert: Successful Sign-In to GatherCraft Planner`,
            html: buildLoginAlertEmailHtml(user.name)
          }).catch(err => console.warn('Login email failed:', err));
        }
      } else {
        user = await registerUser(name, email, password, role);
        // Send welcome email upon registration
        if (user.email && user.email.includes('@')) {
          sendAutomatedEmail({
            to: user.email,
            subject: `Welcome to GatherCraft Planner, ${user.name}!`,
            html: buildWelcomeEmailHtml(user.name, user.email, user.role)
          }).catch(err => console.warn('Welcome email failed:', err));
        }
      }
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || "Database error: can't process auth request");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in Username, Email Address, and New Password.");
      return;
    }

    setError(null);
    setResetSuccess(null);
    setLoading(true);

    try {
      await resetUserPassword(name, email, password, role);
      setResetSuccess("Password reset successfully! You can now log in with your new password.");

      if (email.trim().includes('@')) {
        sendAutomatedEmail({
          to: email.trim(),
          subject: `Password Reset Confirmation - GatherCraft Planner`,
          html: buildPasswordResetEmailHtml(name, email)
        }).catch(err => console.warn('Reset email failed:', err));
      }

      setTimeout(() => {
        setIsForgotPassword(false);
        setIsLogin(true);
        setResetSuccess(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Could not reset password. Please verify your username and email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-neutral-800 flex flex-col justify-center items-center p-4 font-sans selection:bg-[#C88A8A]/20 selection:text-neutral-900" id="auth-screen-root">
      
      {/* Decorative center card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-white border border-[#EBE7DF] rounded-3xl p-8 sm:p-10 shadow-lg flex flex-col space-y-6"
        id="auth-card"
      >
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <span className="inline-block p-4 bg-[#FAF3F3] border border-[#F6EBEB] text-[#C88A8A] rounded-2xl text-3xl shadow-2xs">
            {role === 'temple_team' ? '🕌' : '🌸'}
          </span>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900 tracking-tight pt-2">
            Gather Planner
          </h1>
          <p className="text-xs text-neutral-500 max-w-xs mx-auto">
            {role === 'temple_team' 
              ? 'Devotional volunteer team coordination & temple food planning'
              : 'Plan intimate culinary celebrations and menus with simplicity and grace'}
          </p>
        </div>

        {/* Role Selection Tabs */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-center mb-1">
            Access Portal
          </label>
          <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-1.5 rounded-2xl border border-neutral-150">
            <button
              type="button"
              onClick={() => {
                setRole('member');
                setError(null);
                setResetSuccess(null);
              }}
              className={`flex flex-col items-center gap-1 py-2.5 px-3 rounded-xl transition cursor-pointer text-center ${
                role === 'member'
                  ? 'bg-white text-[#C88A8A] border border-[#F5E6E6] shadow-sm font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800 border border-transparent'
              }`}
            >
              <Compass size={16} />
              <span className="text-[11px]">Member Access</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('temple_team');
                setError(null);
                setResetSuccess(null);
              }}
              className={`flex flex-col items-center gap-1 py-2.5 px-3 rounded-xl transition cursor-pointer text-center ${
                role === 'temple_team'
                  ? 'bg-neutral-900 text-amber-100 border border-neutral-850 shadow-sm font-semibold'
                  : 'text-neutral-500 hover:text-neutral-850 border border-transparent'
              }`}
            >
              <Landmark size={16} />
              <span className="text-[11px]">Temple Team Access</span>
            </button>
          </div>
        </div>

        {role === 'temple_team' && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-center space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
            <p className="text-[9px] text-amber-800 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
              ⚠️ Leadership Notice
            </p>
            <p className="text-[10px] text-amber-950 font-medium leading-relaxed">
              Only the team leader should log in using the Temple Team credentials.
            </p>
          </div>
        )}

        {/* Firebase Environment Status */}
        {(!configured || !healthy) && (
          <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-4 text-center space-y-2 animate-in fade-in duration-200" id="firebase-status-notice">
            <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
              <span>⚠️ Local Sandbox Mode</span>
            </p>
            <p className="text-[11px] text-neutral-600 leading-relaxed font-medium">
              {!configured ? (
                <>
                  Firebase is not configured on this environment (e.g., Vercel). Data is temporarily saved <strong>locally to this browser</strong>.
                  <span className="block mt-1 text-[10px] text-neutral-500">
                    To log in, please click <strong>Sign Up</strong> first to create an account, or configure the Firebase environment variables in your deployment dashboard.
                  </span>
                </>
              ) : (
                <>
                  Could not reach the database. Running in <strong>local offline fallback</strong> mode.
                  <span className="block mt-1 text-[10px] text-neutral-500">
                    Your changes will save to this browser's local storage. You must <strong>Sign Up</strong> if your account was not created locally yet.
                  </span>
                </>
              )}
            </p>
          </div>
        )}

        {!isForgotPassword ? (
          <>
            {/* Tab Selector (Log In vs Create Account) */}
            <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 shadow-3xs" id="auth-tabs">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setError(null);
                  setResetSuccess(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  isLogin
                    ? role === 'temple_team' 
                      ? 'bg-neutral-900 text-amber-100 shadow-3xs font-bold'
                      : 'bg-white text-[#C88A8A] shadow-3xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
                id="auth-tab-login"
              >
                {role === 'temple_team' ? 'Team Login' : 'Member Login'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError(null);
                  setResetSuccess(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  !isLogin
                    ? role === 'temple_team'
                      ? 'bg-neutral-900 text-amber-100 shadow-3xs font-bold'
                      : 'bg-white text-[#C88A8A] shadow-3xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
                id="auth-tab-signup"
              >
                {role === 'temple_team' ? 'Team Sign Up' : 'Member Sign Up'}
              </button>
            </div>

            {/* Error Alert Box */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-2xl text-xs font-semibold flex flex-col gap-2"
                id="auth-error-alert"
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>
                  <span className="leading-relaxed">{error}</span>
                </div>

                {/* Smart Action Buttons */}
                {error === "User not found" && isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setError(null);
                    }}
                    className="mt-1 self-start px-3 py-1.5 bg-red-600 text-white text-[11px] font-bold rounded-lg hover:bg-red-700 transition cursor-pointer shadow-3xs flex items-center gap-1.5"
                  >
                    <span>✨ Switch to Sign Up tab</span>
                    <ArrowRight size={12} />
                  </button>
                )}

                {error === "Password wrong" && isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError(null);
                    }}
                    className="mt-1 self-start px-3 py-1.5 bg-neutral-900 text-white text-[11px] font-bold rounded-lg hover:bg-neutral-800 transition cursor-pointer shadow-3xs flex items-center gap-1.5"
                  >
                    <KeyRound size={12} />
                    <span>Forgot password? Reset it here</span>
                  </button>
                )}
              </motion.div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5">
                  {isLogin 
                    ? role === 'temple_team' ? 'Team Name / Email' : 'Username / Email'
                    : role === 'temple_team' ? 'Team Name' : 'Username'
                  }
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400">
                    <UserIcon size={15} />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isLogin
                      ? role === 'temple_team' ? "Team Name or Email" : "Username or Email"
                      : role === 'temple_team' ? "e.g., Sunday Seva Squad" : "Enter your username or name"
                    }
                    className="w-full pl-10 pr-4 py-3 bg-white border border-[#EBE7DF] rounded-xl text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-[#C88A8A] focus:border-[#C88A8A] text-sm transition-all"
                    required
                    id="auth-name-input"
                  />
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400">
                      <Mail size={15} />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-[#EBE7DF] rounded-xl text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-[#C88A8A] focus:border-[#C88A8A] text-sm transition-all"
                      required
                      id="auth-email-input"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1 pl-1">
                    Used for automated event notifications & sign-up updates.
                  </p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider">
                    Password
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError(null);
                        setResetSuccess(null);
                      }}
                      className="text-[11px] text-[#C88A8A] hover:underline font-medium cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400">
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-[#EBE7DF] rounded-xl text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-[#C88A8A] focus:border-[#C88A8A] text-sm transition-all"
                    required
                    id="auth-password-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 text-xs font-semibold rounded-xl uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-6 ${
                  role === 'temple_team'
                    ? 'bg-neutral-900 hover:bg-neutral-800 text-amber-100 disabled:bg-neutral-300'
                    : 'bg-[#C88A8A] hover:bg-[#B57878] disabled:bg-neutral-300 text-white'
                }`}
                id="auth-submit-button"
              >
                {loading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>{isLogin ? 'Log In' : 'Sign Up'}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          /* Forgot Password View */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError(null);
                  setResetSuccess(null);
                }}
                className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1 cursor-pointer font-medium"
              >
                <ArrowLeft size={14} /> Back to Login
              </button>
              <span className="text-xs font-bold text-neutral-800">Reset Password</span>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-2xl text-xs font-semibold">
                ⚠️ {error}
              </div>
            )}

            {resetSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <Check size={16} className="text-emerald-600 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5">
                  {role === 'temple_team' ? 'Team Name or Username' : 'Username'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400">
                    <UserIcon size={15} />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter account name"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-[#EBE7DF] rounded-xl text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-[#C88A8A] text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400">
                    <Mail size={15} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter registered email"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-[#EBE7DF] rounded-xl text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-[#C88A8A] text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400">
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-[#EBE7DF] rounded-xl text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-[#C88A8A] text-sm"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 text-xs font-semibold rounded-xl uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-4 ${
                  role === 'temple_team'
                    ? 'bg-neutral-900 hover:bg-neutral-800 text-amber-100 disabled:bg-neutral-300'
                    : 'bg-[#C88A8A] hover:bg-[#B57878] disabled:bg-neutral-300 text-white'
                }`}
              >
                {loading ? 'Updating...' : 'Set New Password'}
              </button>
            </form>
          </div>
        )}

        <div className="text-center pt-2 border-t border-neutral-100 space-y-2">
          <p className="text-[10px] text-neutral-400 font-mono">
            Securely synchronized cloud & offline storage
          </p>
        </div>
      </motion.div>
    </div>
  );
}

