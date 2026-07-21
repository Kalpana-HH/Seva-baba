import React, { useState, useEffect } from 'react';
import { FoodItem, Event } from '../types';
import { ShoppingBag, Copy, CheckSquare, Square, ClipboardCheck, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ShoppingListProps {
  event: Event;
  foodItems: FoodItem[];
}

export default function ShoppingList({ event, foodItems }: ShoppingListProps) {
  // Store ticked state in local state, persistent with localStorage key based on eventId
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`shopping_list_checked_${event.id}`);
    if (saved) {
      setCheckedItems(JSON.parse(saved));
    } else {
      setCheckedItems({});
    }
  }, [event.id]);

  const toggleCheck = (itemId: string) => {
    const nextState = { ...checkedItems, [itemId]: !checkedItems[itemId] };
    setCheckedItems(nextState);
    localStorage.setItem(`shopping_list_checked_${event.id}`, JSON.stringify(nextState));
  };

  const getGroupedItems = () => {
    const groups: Record<string, FoodItem[]> = {
      'Appetizers': [],
      'Mains': [],
      'Sides': [],
      'Desserts': [],
      'Drinks': [],
      'Other': [],
    };

    foodItems.forEach((item) => {
      switch (item.category) {
        case 'Appetizer': groups['Appetizers'].push(item); break;
        case 'Main': groups['Mains'].push(item); break;
        case 'Side': groups['Sides'].push(item); break;
        case 'Dessert': groups['Desserts'].push(item); break;
        case 'Drink': groups['Drinks'].push(item); break;
        default: groups['Other'].push(item);
      }
    });

    // Remove empty groups
    return Object.fromEntries(Object.entries(groups).filter(([_, items]) => items.length > 0));
  };

  const grouped = getGroupedItems();
  const totalItems = foodItems.length;
  const checkedCount = Object.keys(checkedItems).filter(id => checkedItems[id] && foodItems.some(i => i.id === id)).length;
  const percentComplete = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  const copyToClipboard = () => {
    if (foodItems.length === 0) return;
    
    let text = `🛒 SHOPPING LIST FOR: ${event.title.toUpperCase()}\n`;
    text += `📅 Date: ${event.date} | Guest Count: ${event.guestsCount}\n`;
    text += `=========================================\n\n`;

    Object.entries(grouped).forEach(([category, items]) => {
      text += `■ ${category.toUpperCase()}\n`;
      items.forEach((item) => {
        text += `  [ ] ${item.name} — ${item.quantity} ${item.unit} (For: ${item.assignedTo})\n`;
        if (item.notes) {
          text += `      Notes: ${item.notes}\n`;
        }
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6" id="shopping-list-panel">
      {/* Overview Block */}
      <div className="bg-white border border-[#EBE7DF] rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[#C88A8A]"><ShoppingBag size={20} /></span>
            <h2 className="font-sans font-medium text-lg text-neutral-800">Catering Grocery Checklist</h2>
          </div>
          <p className="text-xs text-neutral-500 max-w-xl leading-relaxed">
            All your menu items and catering ingredients automatically collated into a tidy check-off list, grouped by culinary course.
          </p>

          {/* Progress Bar */}
          {totalItems > 0 && (
            <div className="pt-2 max-w-xs space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-neutral-400 uppercase">
                <span>Progress</span>
                <span>{checkedCount} / {totalItems} bought ({percentComplete}%)</span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden border border-neutral-200">
                <div 
                  className="bg-[#C88A8A] h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${percentComplete}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {totalItems > 0 && (
          <button
            onClick={copyToClipboard}
            className="px-5 py-3 bg-neutral-800 hover:bg-neutral-900 text-white font-medium rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
            id="copy-shopping-list-btn"
          >
            {copied ? (
              <>
                <ClipboardCheck size={14} className="text-emerald-400" />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy Grocery List
              </>
            )}
          </button>
        )}
      </div>

      {totalItems === 0 ? (
        <div className="bg-white border border-[#EBE7DF] rounded-3xl p-10 text-center flex flex-col items-center justify-center space-y-3">
          <div className="p-4 bg-[#FAF9F6] rounded-full text-neutral-300">
            <ShoppingBag size={32} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-neutral-600">Your shopping list is empty</p>
            <p className="text-[11px] text-neutral-400 max-w-sm">
              Add food items, drinks, and appetizers to your menu on the <span className="font-semibold text-neutral-500">Planned Food</span> tab to generate your automatic checklists.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="bg-white border border-[#EBE7DF] rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                <h3 className="font-sans font-semibold text-xs text-[#8A5A5A] uppercase tracking-wider">{category}</h3>
                <span className="font-mono text-[9px] text-neutral-400 bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#EBE7DF] font-semibold">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="space-y-2.5">
                {items.map((item) => {
                  const isChecked = checkedItems[item.id] || false;
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleCheck(item.id)}
                      className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                        isChecked 
                          ? 'bg-neutral-50 border-neutral-200 opacity-60' 
                          : 'bg-[#FAF9F6]/40 border-[#F0EFE9] hover:bg-[#FAF9F6]'
                      }`}
                      id={`shopping-item-${item.id}`}
                    >
                      <button className="text-neutral-400 hover:text-[#C88A8A] shrink-0 mt-0.5 transition">
                        {isChecked ? (
                          <CheckSquare size={16} className="text-[#C88A8A]" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>

                      <div className="flex-1 space-y-0.5">
                        <p className={`text-xs font-semibold text-neutral-800 ${isChecked ? 'line-through text-neutral-400' : ''}`}>
                          {item.name}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-neutral-400 font-medium">
                          <span className="text-[#C88A8A] font-mono font-semibold">
                            Buy: {item.quantity} {item.unit}
                          </span>
                          <span>•</span>
                          <span>Brought by: {item.assignedTo}</span>
                        </div>

                        {item.notes && !isChecked && (
                          <p className="text-[10px] text-neutral-400 italic mt-1 line-clamp-1">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
