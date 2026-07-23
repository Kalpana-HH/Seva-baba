import React from 'react';
import { motion } from 'motion/react';
import { Calendar, CheckCircle2, Bell, Users, ArrowRight, ShieldCheck } from 'lucide-react';
import Logo from './Logo';

interface CalendarConsentModalProps {
  userName: string;
  onRespond: (consent: boolean) => void;
}

export default function CalendarConsentModal({ userName, onRespond }: CalendarConsentModalProps) {
  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white border border-[#EBE7DF] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6"
        id="calendar-consent-modal"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-rose-50 border border-rose-100 text-[#C88A8A] rounded-2xl text-2xl shadow-3xs">
            <Calendar size={28} />
          </div>
          <div className="space-y-1">
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-neutral-900">
              Welcome, {userName}! 🌸
            </h2>
            <p className="text-xs text-neutral-500 font-medium leading-relaxed">
              Would you like to automatically sync your created events & Sevas directly to your Google Calendar?
            </p>
          </div>
        </div>

        {/* Benefits list */}
        <div className="bg-[#FAF9F6] border border-[#EBE7DF] rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
              <CheckCircle2 size={14} />
            </div>
            <div className="space-y-0.5 text-xs">
              <strong className="text-neutral-800 font-semibold block">Automatic Event Sync</strong>
              <p className="text-neutral-500 text-[11px] leading-normal">
                Gatherings and Sevas you create will instantly generate Google Calendar invites.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-1 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
              <Bell size={14} />
            </div>
            <div className="space-y-0.5 text-xs">
              <strong className="text-neutral-800 font-semibold block">Stay On Track</strong>
              <p className="text-neutral-500 text-[11px] leading-normal">
                Receive standard Google Calendar reminders before your gathering starts.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-1 bg-rose-100 text-[#C88A8A] rounded-lg shrink-0 mt-0.5">
              <Users size={14} />
            </div>
            <div className="space-y-0.5 text-xs">
              <strong className="text-neutral-800 font-semibold block">Guest & Team Invitations</strong>
              <p className="text-neutral-500 text-[11px] leading-normal">
                Invited friends or Seva team members can easily add event details to their own calendars.
              </p>
            </div>
          </div>
        </div>

        {/* Choice Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={() => onRespond(true)}
            className="w-full py-3 px-4 bg-[#C88A8A] hover:bg-[#B57878] text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            id="calendar-consent-yes-btn"
          >
            <span>Yes, Enable Calendar Sync</span>
            <ArrowRight size={14} />
          </button>

          <button
            type="button"
            onClick={() => onRespond(false)}
            className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 border border-neutral-250 text-neutral-600 text-xs font-semibold rounded-xl transition cursor-pointer"
            id="calendar-consent-no-btn"
          >
            No, Thanks (Keep Disabled)
          </button>
        </div>

        {/* Settings Note */}
        <p className="text-[10px] text-neutral-400 text-center flex items-center justify-center gap-1">
          <ShieldCheck size={12} className="text-neutral-400" />
          <span>You can change this anytime in your Account Settings.</span>
        </p>
      </motion.div>
    </div>
  );
}
