import React, { useState, useEffect } from 'react';
import { Event, User } from '../types';
import { Calendar, Users, Check, X, Search, Plus, Trash, UserCheck, Landmark, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUserByPhoneNumber } from '../lib/firebase';

interface EventFormProps {
  onSubmit: (event: Omit<Event, 'id' | 'createdAt'>) => void;
  onClose: () => void;
  initialEvent?: Event;
  prefilledDate?: string;
  currentUser: User;
}

export default function EventForm({ onSubmit, onClose, initialEvent, prefilledDate, currentUser }: EventFormProps) {
  const isTempleUser = currentUser.role === 'temple_team';
  const defaultEventType = initialEvent?.eventType || (isTempleUser ? 'temple' : 'potluck');
  
  const [eventType, setEventType] = useState<'potluck' | 'temple'>(defaultEventType);
  const [title, setTitle] = useState(initialEvent?.title || (isTempleUser ? 'Temple Seva' : ''));
  const [theme, setTheme] = useState(initialEvent?.theme || (isTempleUser ? 'Devotion Group' : ''));
  const [date, setDate] = useState(initialEvent?.date || prefilledDate || '');
  const [time, setTime] = useState(initialEvent?.time || '');
  const [guestsInput, setGuestsInput] = useState(initialEvent?.guestsCount ? String(initialEvent.guestsCount) : '10');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [formError, setFormError] = useState<string | null>(null);
  
  // Invitation System States
  const [invitedPhones, setInvitedPhones] = useState<string[]>(initialEvent?.invitedPhones || []);
  const [invitedNames, setInvitedNames] = useState<Record<string, string>>({}); // phone -> name cache
  const [phoneInput, setPhoneInput] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupSuccess, setLookupSuccess] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // Load human names for pre-existing invited phone numbers
  useEffect(() => {
    const loadInvitedNames = async () => {
      const details: Record<string, string> = {};
      for (const phone of invitedPhones) {
        try {
          const usr = await getUserByPhoneNumber(phone);
          if (usr) {
            details[phone] = usr.name;
          } else {
            details[phone] = 'Registered User';
          }
        } catch {
          details[phone] = 'Registered User';
        }
      }
      setInvitedNames(details);
    };
    if (invitedPhones.length > 0) {
      loadInvitedNames();
    }
  }, []);

  const handleAddInvitee = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setLookupSuccess(null);
    const cleanedPhone = phoneInput.trim();
    if (!cleanedPhone) return;

    if (invitedPhones.includes(cleanedPhone)) {
      setLookupError('This phone number is already added.');
      return;
    }

    setSearching(true);
    try {
      const foundUser = await getUserByPhoneNumber(cleanedPhone);
      if (foundUser) {
        setInvitedPhones(prev => [...prev, cleanedPhone]);
        setInvitedNames(prev => ({ ...prev, [cleanedPhone]: foundUser.name }));
        setPhoneInput('');
        setLookupSuccess(`Added ${foundUser.name} successfully!`);
        setTimeout(() => setLookupSuccess(null), 3000);
      } else {
        setLookupError('Phone number not found in database. Ask them to sign up first!');
      }
    } catch (err: any) {
      setLookupError('Error validating phone number. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleRemoveInvitee = (phone: string) => {
    setInvitedPhones(prev => prev.filter(p => p !== phone));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const finalTitle = eventType === 'temple' ? 'Temple Seva' : title.trim();
    if (!finalTitle) {
      setFormError('Please enter a title for the gathering.');
      return;
    }
    if (!date || !time) {
      setFormError('Please select both a date and time.');
      return;
    }

    const trimmedGuests = guestsInput.trim();
    if (!trimmedGuests) {
      setFormError(
        eventType === 'temple'
          ? 'Please enter the number of Volunteers Needed!'
          : 'Please enter the number of Expected Guests!'
      );
      return;
    }

    const parsedCount = parseInt(trimmedGuests.replace(/\D/g, ''), 10);
    if (isNaN(parsedCount) || parsedCount <= 0) {
      setFormError(
        eventType === 'temple'
          ? 'Please enter a valid number of Volunteers Needed (must be greater than 0)!'
          : 'Please enter a valid number of Expected Guests (must be greater than 0)!'
      );
      return;
    }

    onSubmit({
      title: finalTitle,
      type: eventType === 'temple' ? 'Temple Event' : 'Fancy Potluck',
      date,
      time,
      guestsCount: parsedCount,
      theme: eventType === 'temple' ? currentUser.name : (theme.trim() || 'Summer Celebration'),
      description,
      eventType,
      creatorId: currentUser.id,
      creatorPhone: currentUser.phoneNumber,
      invitedPhones,
    });
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#FAF9F6] border border-neutral-200 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col"
        id="event-form-container"
      >
        {/* Header */}
        <div className={`px-6 py-5 border-b flex items-center justify-between rounded-t-3xl sticky top-0 z-10 bg-white ${
          eventType === 'temple' ? 'border-amber-100' : 'border-rose-100'
        }`}>
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-xl text-xl border ${
              eventType === 'temple' 
                ? 'bg-amber-50 border-amber-100 text-amber-700' 
                : 'bg-rose-50 border-rose-100 text-rose-600'
            }`}>
              {eventType === 'temple' ? '🕌' : '🌸'}
            </span>
            <div>
              <h2 className="font-sans font-semibold text-lg text-neutral-800" id="form-heading">
                {initialEvent ? 'Edit Specifications' : 'Plan a Cohesive Event'}
              </h2>
              <p className="text-xs text-neutral-500">
                {eventType === 'temple' 
                  ? 'Coordinate devotional kitchen menu offering lists with temple teams' 
                  : 'Design gorgeous culinary creations & select guest menus'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
            id="close-form-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Wrapper */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">

          {/* Form Error Banner */}
          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-2xl flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-red-600 shrink-0"></span>
              <span>⚠️ {formError}</span>
            </motion.div>
          )}

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Template Render block */}
            {eventType === 'temple' ? (
              /* TEMPLE TEMPLATE */
              <div className="space-y-5 animate-in fade-in duration-200">

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Calendar size={12} className="text-neutral-400" /> Service Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-xl text-neutral-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-xl text-neutral-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Users size={12} className="text-neutral-400" /> Volunteers Needed
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={guestsInput}
                      onChange={(e) => {
                        setGuestsInput(e.target.value.replace(/\D/g, ''));
                        if (formError) setFormError(null);
                      }}
                      placeholder="e.g., 10"
                      className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-xl text-neutral-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-xs font-semibold text-center"
                      required
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* POTLUCK TEMPLATE */
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5">
                      Gathering Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Sisterhood Sunday Brunch, Backyard Dinner"
                      className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-neutral-800 text-sm focus:outline-hidden focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5">
                      What Event / Theme It's For
                    </label>
                    <input
                      type="text"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      placeholder="e.g., Summer Bash, Holiday Feast, Baby Shower"
                      className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-neutral-800 text-sm focus:outline-hidden focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Calendar size={12} className="text-neutral-400" /> Event Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-xl text-neutral-800 focus:outline-hidden focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-xl text-neutral-800 focus:outline-hidden focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Users size={12} className="text-neutral-400" /> Expected Guests
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={guestsInput}
                      onChange={(e) => {
                        setGuestsInput(e.target.value.replace(/\D/g, ''));
                        if (formError) setFormError(null);
                      }}
                      placeholder="e.g., 10"
                      className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-xl text-neutral-800 focus:outline-hidden focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all text-xs font-semibold text-center"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* General Description / Details */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5">
                Event Description & Preparation Vision
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={eventType === 'temple' 
                  ? 'e.g., Complete Prasad guidelines. Remember to use separate clean utensils. No onions or garlic.' 
                  : 'e.g., A relaxed, colorful afternoon gathering. We want light appetizers, finger-foods, and refreshing summer drinks.'}
                className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-neutral-800 text-xs focus:outline-hidden focus:ring-1 transition-all h-20 resize-none"
              />
            </div>

            {/* INVITATION SECTION WITH SEARCH BY PHONE NUMBER */}
            <div className={`p-5 rounded-2xl border ${
              eventType === 'temple' 
                ? 'bg-amber-50/15 border-amber-200/50' 
                : 'bg-rose-50/15 border-rose-200/50'
            }`}>
              <h3 className="font-sans font-semibold text-neutral-800 text-xs uppercase tracking-wider mb-2">
                {eventType === 'temple' ? 'Select Team Members' : 'Invite Guests'}
              </h3>
              <p className="text-[11px] text-neutral-500 mb-3.5 leading-relaxed">
                {eventType === 'temple'
                  ? 'Add temple team volunteers to this service. They will instantly see this seva on their dashboard to contribute food items.'
                  : 'Invite guests by their registered phone numbers. They can edit and add to the shared dish planner.'}
              </p>

              {/* Invitation input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(e.target.value);
                      setLookupError(null);
                    }}
                    placeholder="Enter phone number (e.g. 5551234567)"
                    className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddInvitee}
                  disabled={searching || !phoneInput.trim()}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer transition shadow-3xs hover:shadow-2xs flex items-center gap-1.5 ${
                    eventType === 'temple'
                      ? 'bg-amber-700 hover:bg-amber-800 text-white disabled:bg-neutral-300'
                      : 'bg-[#C88A8A] hover:bg-[#B57878] text-white disabled:bg-neutral-300'
                  }`}
                >
                  {searching ? 'Checking...' : (
                    <>
                      <Plus size={14} /> Add
                    </>
                  )}
                </button>
              </div>

              {/* Lookup Alert box */}
              {lookupError && (
                <div className="mt-2 text-[11px] text-red-600 font-semibold flex items-center gap-1.5 bg-red-50/50 border border-red-100 rounded-lg p-2 animate-in fade-in slide-in-from-top-1">
                  <span className="w-1 h-1 bg-red-600 rounded-full shrink-0" />
                  <span>{lookupError}</span>
                </div>
              )}
              {lookupSuccess && (
                <div className="mt-2 text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 bg-emerald-50/50 border border-emerald-100 rounded-lg p-2 animate-in fade-in slide-in-from-top-1">
                  <span className="w-1 h-1 bg-emerald-600 rounded-full shrink-0" />
                  <span>{lookupSuccess}</span>
                </div>
              )}

              {/* Invited List display */}
              <div className="mt-4 space-y-2">
                <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  {eventType === 'temple' ? `Chosen Team Volunteers (${invitedPhones.length})` : `Invited Guests (${invitedPhones.length})`}
                </span>
                {invitedPhones.length === 0 ? (
                  <p className="text-[10px] text-neutral-400 italic">No one invited yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {invitedPhones.map((phone) => (
                      <span
                        key={phone}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-neutral-250 rounded-xl text-xs font-medium text-neutral-700 shadow-3xs"
                      >
                        <UserCheck size={12} className={eventType === 'temple' ? 'text-amber-600' : 'text-[#C88A8A]'} />
                        <span>{invitedNames[phone] || 'Registered User'} ({phone})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInvitee(phone)}
                          className="p-0.5 text-neutral-400 hover:text-red-500 rounded-full transition cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3 bg-[#FAF9F6] py-2 sticky bottom-0 z-10">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-600 text-xs font-semibold transition cursor-pointer"
                id="cancel-event-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-6 py-2.5 font-semibold rounded-xl text-xs uppercase tracking-wider transition shadow-sm flex items-center gap-1.5 cursor-pointer ${
                  eventType === 'temple'
                    ? 'bg-neutral-900 hover:bg-neutral-800 text-amber-100'
                    : 'bg-[#C88A8A] hover:bg-[#B57878] text-white'
                }`}
                id="submit-event-btn"
              >
                <Check size={14} />
                {initialEvent ? 'Save Specifications' : 'Create & Share Event'}
              </button>
            </div>
          </form>

        </div>
      </motion.div>
    </div>
  );
}
