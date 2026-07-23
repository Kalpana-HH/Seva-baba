import React, { useState } from 'react';
import { motion } from 'motion/react';
import { resetUserPassword } from '../lib/firebase';
import { sendAutomatedEmail, buildPasswordResetEmailHtml } from '../lib/email';
import { KeyRound, Lock, Eye, EyeOff, Check, AlertCircle, ArrowRight } from 'lucide-react';

interface ResetPasswordModalProps {
  email: string;
  name: string;
  role: 'member' | 'temple_team';
  onComplete: () => void;
}

export default function ResetPasswordModal({ email, name, role, onComplete }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await resetUserPassword(name, email, newPassword, role);
      setSuccess(true);

      // Send confirmation email
      sendAutomatedEmail({
        to: email,
        subject: `Password Reset Confirmation - The Menu Crew`,
        html: buildPasswordResetEmailHtml(name, email)
      }).catch(err => console.warn('Confirmation email failed:', err));

      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update password. Please verify account details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#FAF9F6] border border-neutral-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6"
        id="reset-password-modal"
      >
        <div className="text-center space-y-2">
          <span className="inline-block p-3.5 bg-[#FAF3F3] border border-[#F6EBEB] text-[#C88A8A] rounded-2xl text-2xl shadow-2xs">
            🔒
          </span>
          <h2 className="font-serif text-xl font-semibold text-neutral-900">
            Set Your New Password
          </h2>
          <p className="text-xs text-neutral-500">
            Resetting password for <strong>{name}</strong> ({email})
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={15} className="text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold text-center space-y-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700">
              <Check size={20} />
            </div>
            <p className="text-sm font-bold">Password Updated Successfully!</p>
            <p className="text-[11px] text-emerald-700">
              Redirecting you to log in with your new password...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <KeyRound size={12} /> New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400">
                  <Lock size={15} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full pl-10 pr-10 py-3 bg-white border border-[#EBE7DF] rounded-xl text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-[#C88A8A] text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Lock size={12} /> Confirm New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400">
                  <Lock size={15} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-10 pr-10 py-3 bg-white border border-[#EBE7DF] rounded-xl text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-[#C88A8A] text-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#C88A8A] hover:bg-[#B57878] text-white text-xs font-semibold rounded-xl uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-4"
              id="reset-password-submit-btn"
            >
              {loading ? (
                <span>Updating Password...</span>
              ) : (
                <>
                  <span>Save New Password & Log In</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
