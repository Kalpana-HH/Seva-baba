import React, { useState } from 'react';
import { User } from '../types';
import { X, Save, User as UserIcon, KeyRound, Mail, Send, Check, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { sendAutomatedEmail, buildPasswordResetLinkEmailHtml } from '../lib/email';

interface SettingsModalProps {
  currentUser: User;
  onClose: () => void;
  onSave: (updatedUser: User) => Promise<void>;
}

export default function SettingsModal({ currentUser, onClose, onSave }: SettingsModalProps) {
  const isTempleUser = currentUser.role === 'temple_team';
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email || '');
  const [autoSyncCalendar, setAutoSyncCalendar] = useState(currentUser.autoSyncGoogleCalendar ?? false);
  
  // Password reset via email state
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSendResetEmail = async () => {
    const targetEmail = email.trim() || currentUser.email || '';
    if (!targetEmail) {
      setError('Please enter a valid email address to receive the password reset link.');
      return;
    }

    setSendingReset(true);
    setError(null);
    setResetSent(false);

    try {
      const resetLink = `${window.location.origin}${window.location.pathname}?action=reset-password&email=${encodeURIComponent(targetEmail)}&name=${encodeURIComponent(name || currentUser.name)}&role=${encodeURIComponent(currentUser.role)}`;
      
      await sendAutomatedEmail({
        to: targetEmail,
        subject: `Reset Your The Menu Crew Password`,
        html: buildPasswordResetLinkEmailHtml(name || currentUser.name, targetEmail, resetLink)
      });

      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch password reset email. Please try again.');
    } finally {
      setSendingReset(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError(isTempleUser ? 'Team Name is required' : 'Username is required');
      return;
    }
    if (!trimmedEmail) {
      setError('Email address is required');
      return;
    }

    setLoading(true);
    try {
      const updatedUser: User = {
        ...currentUser,
        name: trimmedName,
        email: trimmedEmail,
        autoSyncGoogleCalendar: autoSyncCalendar,
      };
      await onSave(updatedUser);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#FAF9F6] border border-neutral-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
        id="settings-modal"
      >
        {/* Header */}
        <div className={`px-6 py-5 border-b flex items-center justify-between bg-white ${
          isTempleUser ? 'border-amber-100' : 'border-rose-100'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className={`p-2 rounded-xl text-lg border ${
              isTempleUser 
                ? 'bg-amber-50 border-amber-100 text-amber-700' 
                : 'bg-rose-50 border-rose-100 text-[#C88A8A]'
            }`}>
              ⚙️
            </span>
            <div>
              <h2 className="font-sans font-semibold text-neutral-800 text-sm">
                Account Settings
              </h2>
              <p className="text-[10px] text-neutral-500">
                Update profile details & password security
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
            id="close-settings-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3 rounded-xl text-xs font-semibold text-center">
              ✓ Profile changes saved successfully!
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <UserIcon size={12} /> {isTempleUser ? 'Team Name' : 'Username'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-neutral-800 text-xs focus:outline-hidden focus:ring-1 focus:ring-neutral-400 transition-all"
              placeholder={isTempleUser ? "e.g., Sunday Seva Squad" : "e.g., Jane Doe"}
              required
            />
          </div>

          {/* Email Address Field */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Mail size={12} /> Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-neutral-800 text-xs focus:outline-hidden focus:ring-1 focus:ring-neutral-400 transition-all"
              placeholder="e.g., name@example.com"
              required
            />
          </div>

          {/* Google Calendar Integration Section */}
          <div className="pt-3 border-t border-neutral-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar size={12} /> Google Calendar Auto-Sync
              </label>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                autoSyncCalendar 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-neutral-100 text-neutral-500 border-neutral-200'
              }`}>
                {autoSyncCalendar ? '🟢 Active' : '⚪ Disabled'}
              </span>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-neutral-800">
                    Auto-sync created events
                  </p>
                  <p className="text-[11px] text-neutral-500 leading-normal">
                    Automatically send new gatherings & Sevas to your Google Calendar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAutoSyncCalendar(!autoSyncCalendar)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    autoSyncCalendar ? 'bg-[#C88A8A]' : 'bg-neutral-300'
                  }`}
                  role="switch"
                  aria-checked={autoSyncCalendar}
                  id="settings-calendar-toggle-btn"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      autoSyncCalendar ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Password Reset Section */}
          <div className="pt-3 border-t border-neutral-200/60 space-y-2">
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
              <KeyRound size={12} /> Security & Password
            </label>
            
            {resetSent ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>Password Reset Link Dispatched!</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  A reset link has been emailed to <strong>{email}</strong>. Open the email and click the button to set your new password.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-neutral-200 rounded-xl p-3.5 space-y-2">
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Need to change your password? We will send a secure password reset link directly to your email address.
                </p>
                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  disabled={sendingReset}
                  className="w-full py-2 px-3 bg-[#FAF3F3] hover:bg-[#F5E6E6] border border-[#F0D5D5] text-[#9D5D5D] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  id="settings-send-reset-link-btn"
                >
                  <Send size={13} />
                  <span>{sendingReset ? 'Sending Reset Link...' : 'Email Me a Password Reset Link'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-600 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 font-semibold rounded-xl text-xs uppercase tracking-wider transition shadow-xs flex items-center gap-1.5 cursor-pointer text-white ${
                isTempleUser
                  ? 'bg-amber-700 hover:bg-amber-800'
                  : 'bg-[#C88A8A] hover:bg-[#B57878]'
              }`}
            >
              <Save size={13} />
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
