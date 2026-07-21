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
  // Manual Entry Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('Main');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState('servings');
  const [assignedTo, setAssignedTo] = useState(currentUser?.name || 'Host');
  const [notes, setNotes] = useState('');

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<typeof CATEGORIES[number]>('Main');
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [editUnit, setEditUnit] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Quick select common units
  const commonUnits = ['servings', 'pieces', 'cups', 'lbs', 'bottles', 'cans', 'pans', 'liters'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || quantity === '' || quantity <= 0) return;

    onAddFood({
      name: name.trim(),
      category,
      quantity,
      unit,
      assignedTo: assignedTo.trim() || 'Host',
      notes: notes.trim(),
    });

    // Reset Form
    setName('');
    setQuantity('');
    setNotes('');
  };

  const startEditing = (item: FoodItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditQuantity(item.quantity);
    setEditUnit(item.unit);
    setEditAssignedTo(item.assignedTo);
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim() || editQuantity <= 0) return;
    onUpdateFood(id, {
      name: editName.trim(),
      category: editCategory,
      quantity: editQuantity,
      unit: editUnit,
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
          <h2 className="font-sans font-medium text-lg text-neutral-800">Planned Food & Drinks</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Define your menu items and catering quantities for {event.guestsCount} guests.</p>
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
                placeholder="e.g. Lavender Shortbread, Lemonade"
                className="w-full px-4 py-2.5 bg-[#FAF9F6] border border-[#EBE7DF] rounded-xl text-xs text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-[#C88A8A] transition-all"
                required
                id="food-name-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
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

              <div>
                <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Quantity</label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 15"
                  className="w-full px-3 py-2.5 bg-[#FAF9F6] border border-[#EBE7DF] rounded-xl text-xs text-neutral-800 placeholder-neutral-400 focus:outline-hidden"
                  required
                  id="food-quantity-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="servings, pieces..."
                  list="units-list"
                  className="w-full px-3 py-2.5 bg-[#FAF9F6] border border-[#EBE7DF] rounded-xl text-xs text-neutral-800 focus:outline-hidden"
                  id="food-unit-input"
                />
                <datalist id="units-list">
                  {commonUnits.map(u => <option key={u} value={u} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Who is Bringing?</label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Host or Guest Name"
                  className="w-full px-3 py-2.5 bg-[#FAF9F6] border border-[#EBE7DF] rounded-xl text-xs text-neutral-800 focus:outline-hidden"
                  id="food-assignee-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Notes / Preparation Tips</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Garnish with fresh organic mint, keep chilled"
                className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#EBE7DF] rounded-xl text-xs text-neutral-800 placeholder-neutral-400 focus:outline-hidden resize-none h-16"
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="px-3 py-1.5 bg-white border border-[#EBE7DF] rounded-lg text-xs"
                              id={`edit-item-name-${item.id}`}
                            />
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value as any)}
                              className="px-3 py-1.5 bg-white border border-[#EBE7DF] rounded-lg text-xs"
                              id={`edit-item-category-${item.id}`}
                            >
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="number"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(parseFloat(e.target.value) || 0)}
                              className="px-3 py-1.5 bg-white border border-[#EBE7DF] rounded-lg text-xs text-center"
                              id={`edit-item-qty-${item.id}`}
                            />
                            <input
                              type="text"
                              value={editUnit}
                              onChange={(e) => setEditUnit(e.target.value)}
                              className="px-3 py-1.5 bg-white border border-[#EBE7DF] rounded-lg text-xs"
                              id={`edit-item-unit-${item.id}`}
                            />
                            <input
                              type="text"
                              value={editAssignedTo}
                              onChange={(e) => setEditAssignedTo(e.target.value)}
                              className="px-3 py-1.5 bg-white border border-[#EBE7DF] rounded-lg text-xs"
                              placeholder="Assigned to"
                              id={`edit-item-assignee-${item.id}`}
                            />
                          </div>

                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-[#EBE7DF] rounded-lg text-xs h-12 resize-none"
                            placeholder="Add notes..."
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
                              <span className="text-[9px] bg-neutral-100 text-neutral-500 border border-neutral-200 px-1.5 py-0.5 rounded-md font-medium uppercase font-sans">
                                {item.category}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500 font-medium">
                              <span className="text-neutral-700 bg-amber-50 text-amber-800 border border-amber-100 px-1.5 py-0.5 rounded-md font-mono text-[10px]">
                                Quantity: {item.quantity} {item.unit}
                              </span>
                              <span>•</span>
                              <span className="text-neutral-600">Assigned: <span className="font-semibold text-neutral-800">{item.assignedTo}</span></span>
                            </div>

                            {item.notes && (
                              <p className="text-[10px] text-neutral-400 italic bg-white/70 px-2.5 py-1.5 rounded-lg border border-neutral-100 mt-1.5 leading-relaxed">
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
