import React, { useState } from 'react';
import { Event, FoodItem, User } from '../types';
import { Plus, Trash2, Edit2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FoodListProps {
  event: Event;
  foodItems: FoodItem[];
  onAddFood: (item: Omit<FoodItem, 'id' | 'eventId'>) => void;
  onDeleteFood: (id: string) => void;
  onUpdateFood: (id: string, item: Partial<FoodItem>) => void;
  currentUser?: User;
}

const CATEGORIES = ['Appetizer', 'Main', 'Side', 'Dessert', 'Drink', 'Other'] as const;

export default function FoodList({ event, foodItems, onAddFood, onDeleteFood, onUpdateFood, currentUser }: FoodListProps) {
  const isTemple = event.eventType === 'temple' || currentUser?.role === 'temple_team';

  // Manual Entry Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('Main');
  const [assignedTo, setAssignedTo] = useState(currentUser?.name || 'Host');
  const [notes, setNotes] = useState('');

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<typeof CATEGORIES[number]>('Main');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddFood({
      name: name.trim(),
      category: isTemple ? 'Main' : category,
      quantity: 1,
      unit: '',
      assignedTo: assignedTo.trim() || 'Host',
      notes: notes.trim(),
    });

    // Reset Form
    setName('');
    setNotes('');
  };

  const startEditing = (item: FoodItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditAssignedTo(item.assignedTo);
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    onUpdateFood(id, {
      name: editName.trim(),
      category: isTemple ? 'Main' : editCategory,
      assignedTo: editAssignedTo.trim() || 'Host',
      notes: editNotes.trim(),
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6" id="food-list-container">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#EBE7DF] rounded-3xl p-5 shadow-xs">
        <div>
          <h2 className="font-sans font-medium text-lg text-neutral-800">
            {isTemple ? 'Planned Temple Food & Offerings' : 'Planned Food & Drinks'}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">Define your menu items and food details for {event.guestsCount} guests.</p>
        </div>
      </div>

      {/* Adding Form + Items Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Standard Input Form */}
        <div className="bg-white border border-[#EBE7DF] rounded-3xl p-5 shadow-xs h-fit">
          <h3 className="font-sans font-semibold text-neutral-800 text-sm mb-4">Add Menu Item</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Dish/Drink Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isTemple ? "e.g. Sabudana Khichdi, Kheer, Sweet Rice" : "e.g. Lavender Shortbread, Lemonade"}
                className="w-full px-4 py-2.5 bg-[#FAF9F6] border border-[#EBE7DF] rounded-xl text-xs text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-[#C88A8A] transition-all"
                required
                id="food-name-input"
              />
            </div>

            <div className={`grid ${isTemple ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
              {!isTemple && (
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-[#FAF9F6] border border-[#EBE7DF] rounded-xl text-xs text-neutral-800 focus:outline-hidden"
                    id="food-category-select"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Who is Bringing?</label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Host or Volunteer Name"
                  className="w-full px-3 py-2.5 bg-[#FAF9F6] border border-[#EBE7DF] rounded-xl text-xs text-neutral-800 focus:outline-hidden"
                  id="food-assignee-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Notes / Prep Tips / Quantity</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes / Prep Tips / Quantity (e.g., 2 trays, 15 servings, bring warm in crockpot)"
                className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#EBE7DF] rounded-xl text-xs text-neutral-800 placeholder-neutral-400 focus:outline-hidden resize-none h-20"
                id="food-notes-textarea"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#C88A8A] hover:bg-[#B57878] text-white font-medium rounded-xl text-xs transition flex items-center justify-center gap-1 cursor-pointer shadow-xs mt-2"
              id="add-item-submit-btn"
            >
              <Plus size={14} /> Add Item to Menu
            </button>
          </form>
        </div>

        {/* 2. Planned Items List */}
        <div className="lg:col-span-2 bg-white border border-[#EBE7DF] rounded-3xl p-5 shadow-xs flex flex-col min-h-[350px]">
          <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
            <h3 className="font-sans font-semibold text-neutral-800 text-sm">Menu Overview</h3>
            <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-wide">
              {foodItems.length} items entered
            </span>
          </div>

          {foodItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 my-auto">
              <div className="p-4 bg-[#FAF9F6] rounded-full text-neutral-300">
                <HelpCircle size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-neutral-600">No dishes entered yet</p>
                <p className="text-[11px] text-neutral-400 max-w-sm">
                  Add items manually using the form to build your shared menu list!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
              <AnimatePresence initial={false}>
                {foodItems.map((item) => {
                  const isEditing = editingId === item.id;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`border rounded-2xl p-3.5 transition-all ${
                        isEditing 
                          ? 'border-[#C88A8A] bg-[#FDF6F6]' 
                          : 'border-[#F0EFE9] bg-[#FAF9F6]/40 hover:bg-[#FAF9F6]'
                      }`}
                      id={`food-item-row-${item.id}`}
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className={`grid ${isTemple ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="px-3 py-1.5 bg-white border border-[#EBE7DF] rounded-lg text-xs"
                              placeholder="Dish/Drink Name"
                              id={`edit-item-name-${item.id}`}
                            />
                            {!isTemple && (
                              <select
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value as any)}
                                className="px-3 py-1.5 bg-white border border-[#EBE7DF] rounded-lg text-xs"
                                id={`edit-item-category-${item.id}`}
                              >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            )}
                          </div>
                          
                          <div>
                            <input
                              type="text"
                              value={editAssignedTo}
                              onChange={(e) => setEditAssignedTo(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-[#EBE7DF] rounded-lg text-xs"
                              placeholder="Assigned to"
                              id={`edit-item-assignee-${item.id}`}
                            />
                          </div>

                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-[#EBE7DF] rounded-lg text-xs h-14 resize-none"
                            placeholder="Notes / Prep Tips / Quantity"
                            id={`edit-item-notes-${item.id}`}
                          />

                          <div className="flex justify-end gap-2 text-xs">
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1 border border-[#EBE7DF] rounded-lg hover:bg-neutral-100 text-neutral-600 transition"
                              id={`cancel-edit-${item.id}`}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="px-3 py-1 bg-[#C88A8A] text-white rounded-lg hover:bg-[#B57878] transition"
                              id={`save-edit-${item.id}`}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-[150px] space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-neutral-800">{item.name}</span>
                              {!isTemple && (
                                <span className="text-[9px] bg-neutral-100 text-neutral-500 border border-neutral-200 px-1.5 py-0.5 rounded-md font-medium uppercase font-sans">
                                  {item.category}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500 font-medium">
                              <span className="text-neutral-600">Assigned: <span className="font-semibold text-neutral-800">{item.assignedTo}</span></span>
                            </div>

                            {item.notes && (
                              <p className="text-[10px] text-neutral-600 bg-white/80 px-2.5 py-1.5 rounded-lg border border-neutral-100 mt-1.5 leading-relaxed">
                                <span className="font-semibold text-neutral-500">Notes / Prep Tips / Quantity: </span>
                                {item.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => startEditing(item)}
                              className="p-1.5 hover:bg-neutral-200/50 text-neutral-500 rounded-lg transition cursor-pointer"
                              title="Edit item"
                              id={`edit-item-row-${item.id}-btn`}
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => onDeleteFood(item.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg transition cursor-pointer border border-rose-100/40"
                              title="Delete item"
                              id={`delete-item-row-${item.id}-btn`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
