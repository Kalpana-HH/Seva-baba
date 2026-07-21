import React from 'react';
import { Event, FoodItem } from '../types';
import { Calendar, Users, Eye, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface EventCardProps {
  key?: React.Key;
  event: Event;
  foodItems: FoodItem[];
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function EventCard({ event, foodItems, onOpen, onEdit, onDelete }: EventCardProps) {
  const [isConfirming, setIsConfirming] = React.useState(false);
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isTemple = event.eventType === 'temple';

  // Calculate some food statistics
  const totalDishes = foodItems.length;
  const categories = Array.from(new Set(foodItems.map(item => item.category)));

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        whileHover={{ y: -3 }}
        className={`bg-white border hover:shadow-md transition-all duration-300 flex flex-col justify-between ${
          isTemple 
            ? 'border-amber-200 hover:border-amber-400 bg-linear-to-b from-white to-amber-50/20 rounded-3xl p-5 shadow-xs' 
            : 'border-[#EBE7DF] hover:border-[#C88A8A] rounded-3xl p-5 shadow-xs'
        }`}
        id={`event-card-${event.id}`}
      >
        <div className="space-y-4">
          {/* Top Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className={`w-12 h-12 border flex items-center justify-center text-2xl shadow-2xs rounded-2xl ${
                isTemple 
                  ? 'bg-amber-50 border-amber-100 text-amber-700' 
                  : 'bg-[#FAF3F3] border-[#F6EBEB] text-[#C88A8A]'
              }`}>
                {isTemple ? '🕌' : '🍳'}
              </span>
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isTemple 
                    ? 'bg-amber-100/70 text-amber-800 border-amber-200' 
                    : 'bg-[#FDF6F6] text-[#C88A8A] border-[#FBEAEA]'
                }`}>
                  {isTemple ? 'Temple Devotional' : 'Fancy Potluck'}
                </span>
                <h3 className="font-sans font-semibold text-neutral-800 text-base mt-1 line-clamp-1" title={event.title}>
                  {event.title}
                </h3>
              </div>
            </div>
          </div>

          {/* Theme or Team Name banner */}
          {(event.theme || event.eventType) && (
            <div className={`text-xs px-3 py-1.5 rounded-xl border ${
              isTemple 
                ? 'bg-amber-50/40 border-amber-100/60 text-amber-900/80' 
                : 'bg-rose-50/40 border-rose-100/40 text-rose-900/80'
            }`}>
              <span className="font-semibold">{isTemple ? 'Team Name: ' : 'Theme: '}</span>
              <span>{event.theme || 'Standard'}</span>
            </div>
          )}

          {/* Info Rows */}
          <div className="space-y-2.5 pt-1 text-xs text-neutral-600">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-neutral-400 shrink-0" />
              <span>{formattedDate} at {event.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={14} className="text-neutral-400 shrink-0" />
              <span>
                {isTemple 
                  ? `${event.guestsCount} volunteers needed` 
                  : `${event.guestsCount} beloved guests`}
              </span>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2 border-l border-neutral-200 pl-2.5">
              {event.description}
            </p>
          )}

          {/* Food Planning Status */}
          <div className={`border rounded-2xl p-3.5 flex items-center justify-between text-xs ${
            isTemple 
              ? 'bg-amber-50/30 border-amber-150' 
              : 'bg-[#FAF9F6] border-[#EBE7DF]'
          }`}>
            <div className="space-y-0.5">
              <p className="font-medium text-neutral-700">{isTemple ? 'Temple Menu Offerings' : 'Potluck Food & Quantities'}</p>
              <p className="text-[10px] text-neutral-400 font-mono">
                {totalDishes === 0 
                  ? 'No offerings listed' 
                  : `${categories.join(', ')}`}
              </p>
            </div>
            <span className="px-2.5 py-1 bg-white border border-neutral-200 rounded-lg font-mono text-[10px] font-semibold text-neutral-600">
              {totalDishes} items
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 pt-5 mt-4 border-t border-neutral-100">
          <button
            onClick={onOpen}
            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 font-medium rounded-xl text-xs transition cursor-pointer ${
              isTemple 
                ? 'bg-amber-600/10 hover:bg-amber-600/20 text-amber-700' 
                : 'bg-[#C88A8A]/10 hover:bg-[#C88A8A]/20 text-[#C88A8A]'
            }`}
            id={`open-btn-${event.id}`}
          >
            <Eye size={14} />
            {isTemple ? 'Manage Menu' : 'Plan Menu'}
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onEdit}
              className="p-2 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 rounded-xl transition cursor-pointer"
              title="Edit event details"
              id={`edit-btn-${event.id}`}
            >
              <Pencil size={14} />
            </button>
            
            {isConfirming ? (
              <div className="flex items-center gap-1 bg-rose-50/80 border border-rose-200 rounded-xl p-1 animate-in fade-in zoom-in duration-150">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                    setIsConfirming(false);
                  }}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-[10px] transition cursor-pointer shadow-2xs"
                  title="Yes, delete this event"
                  id={`confirm-delete-btn-${event.id}`}
                >
                  Delete
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsConfirming(false);
                  }}
                  className="px-2 py-1 bg-white border border-neutral-200 text-neutral-600 font-medium rounded-lg text-[10px] hover:bg-neutral-50 transition cursor-pointer"
                  title="Cancel deletion"
                  id={`cancel-delete-btn-${event.id}`}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsConfirming(true);
                }}
                className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-100 cursor-pointer"
                title="Delete gathering"
                id={`delete-btn-${event.id}`}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
