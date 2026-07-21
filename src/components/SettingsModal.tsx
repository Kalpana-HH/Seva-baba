import React, { useState } from 'react';
import { User } from '../types';
import { X, Save, Lock, Phone, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsModalProps {
  currentUser: User;
  onClose: () => void;
  onSave: (updatedUser: User) => Promise<void>;
}

export default function SettingsModal({ currentUser, onClose, onSave }: SettingsModalProps) {
  const isTempleUser = currentUser.role === 'temple_team';
  const [name, setName] = useState(currentUser.name);
  const [password, setPassword] = useState(currentUser.password);
  const [phoneNumber, setPhoneNumber] = useState(currentUser.phoneNumber);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmedName = name.trim();
    const trimmedPhone = phoneNumber.trim();

    if (!trimmedName) {
      setError(isTempleUser ? 'Team Name is required' : 'Username is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    if (!trimmedPhone) {
      setError('Phone number is required');
      return;
    }

    setLoading(true);
    try {
      const updatedUser: User = {
        ...currentUser,
        name: trimmedName,
        password,
        phoneNumber: trimmedPhone,
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
                Update credentials & profile information
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
              ✓ Changes saved successfully!
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

          {/* Phone Number Field */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Phone size={12} /> Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-neutral-800 text-xs focus:outline-hidden focus:ring-1 focus:ring-neutral-400 transition-all"
              placeholder="e.g., 2222222222"
              required
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Lock size={12} /> Password
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-neutral-800 text-xs focus:outline-hidden focus:ring-1 focus:ring-neutral-400 transition-all font-mono"
              placeholder="Your secure password"
              required
            />
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
