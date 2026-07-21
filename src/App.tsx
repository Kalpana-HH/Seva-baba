import React, { useState, useEffect } from 'react';
import { Event, FoodItem, Task, User } from './types';
import EventCard from './components/EventCard';
import EventForm from './components/EventForm';
import FoodList from './components/FoodList';
import ShoppingList from './components/ShoppingList';
import TimelineTracker from './components/TimelineTracker';
import AuthScreen from './components/AuthScreen';
import SettingsModal from './components/SettingsModal';
import { Plus, ChevronLeft, Calendar, Users, Utensils, ShoppingBag, ClipboardList, Heart, Edit3, Grid, Settings } from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import { 
  subscribeToCollection, 
  saveDocument, 
  saveDocumentsBatch, 
  deleteDocument, 
  deleteDocumentsByField,
  isFirebaseConfigured
} from './lib/firebase';

// Default gorgeous seed data for welcoming users on first visit
const DEFAULT_EVENT: Event = {
  id: 'default-sisterhood-brunch',
  title: 'Sunday Sisterhood Brunch',
  type: 'Brunch',
  date: '2026-08-16',
  time: '11:00',
  guestsCount: 12,
  theme: 'Blush & Blooms Garden',
  description: 'A cozy Sunday backyard garden gathering to celebrate achievements, share stories, and catch up over warm recipes and sparkling rose water teas.',
  createdAt: new Date().toISOString()
};

const DEFAULT_FOODS: FoodItem[] = [
  {
    id: 'food-1',
    eventId: 'default-sisterhood-brunch',
    name: 'Fresh Peach & Basil Salad',
    category: 'Appetizer',
    quantity: 15,
    unit: 'cups',
    assignedTo: 'Host',
    notes: 'Drizzle with light raspberry vinaigrette'
  },
  {
    id: 'food-2',
    eventId: 'default-sisterhood-brunch',
    name: 'Mini Caprese Frittata Bites',
    category: 'Main',
    quantity: 24,
    unit: 'bites',
    assignedTo: 'Sarah',
    notes: 'Sarah is bringing these warm in a woven basket'
  },
  {
    id: 'food-3',
    eventId: 'default-sisterhood-brunch',
    name: 'Lemon Rosemary Scones with Butter',
    category: 'Side',
    quantity: 16,
    unit: 'mini scones',
    assignedTo: 'Elena',
    notes: 'Elena will pick up fresh from the local corner bakery'
  },
  {
    id: 'food-4',
    eventId: 'default-sisterhood-brunch',
    name: 'Gluten-Free Almond Berry Cake',
    category: 'Dessert',
    quantity: 12,
    unit: 'slices',
    assignedTo: 'Host',
    notes: 'Garnish with powdered sugar and organic lavender petals'
  },
  {
    id: 'food-5',
    eventId: 'default-sisterhood-brunch',
    name: 'Rose Hibiscus Sparkling Mocktail',
    category: 'Drink',
    quantity: 3,
    unit: 'pitchers',
    assignedTo: 'Maya',
    notes: 'Garnish with organic mint sprigs and sliced strawberries'
  }
];

const DEFAULT_TASKS: Task[] = [
  { id: 'task-1', eventId: 'default-sisterhood-brunch', title: 'Send gorgeous digital watercolor invitations', timelineStage: '1 week before', completed: true },
  { id: 'task-2', eventId: 'default-sisterhood-brunch', title: 'Confirm RSVP count and final event arrangements', timelineStage: '1 week before', completed: true },
  { id: 'task-3', eventId: 'default-sisterhood-brunch', title: 'Clean patio seating & wipe hosting tables', timelineStage: '3 days before', completed: false },
  { id: 'task-4', eventId: 'default-sisterhood-brunch', title: 'Gather small ceramic vases & cut garden greenery', timelineStage: '3 days before', completed: false },
  { id: 'task-5', eventId: 'default-sisterhood-brunch', title: 'Pre-chill waters, white tea bags, and berry reductions', timelineStage: '1 day before', completed: false },
  { id: 'task-6', eventId: 'default-sisterhood-brunch', title: 'Assemble fresh peach & salad bowls', timelineStage: 'Morning of', completed: false },
  { id: 'task-7', eventId: 'default-sisterhood-brunch', title: 'Turn on soft instrumental jazz acoustics playlist', timelineStage: 'During event', completed: false }
];

const DEFAULT_TEMPLE_EVENT: Event = {
  id: 'default-temple-seva',
  title: 'Sunday Temple Seva',
  type: 'Temple Event',
  date: '2026-08-16',
  time: '08:00',
  guestsCount: 15,
  theme: 'Shri Krishna Bhakti Team',
  description: 'Devotional kitchen seva for Sunday Evening Feast. Please ensure strict cleanliness. No onions or garlic. All ingredients must be fresh and offered with pure devotion.',
  createdAt: new Date().toISOString(),
  eventType: 'temple'
};

const DEFAULT_TEMPLE_FOODS: FoodItem[] = [
  {
    id: 't-food-1',
    eventId: 'default-temple-seva',
    name: 'Saffron Badam Kheer (Rice Pudding)',
    category: 'Dessert',
    quantity: 100,
    unit: 'servings',
    assignedTo: 'Shri Krishna Bhakti Team',
    notes: 'To be prepared in the main temple kitchen. Milk, saffron, almonds, and basmati rice.'
  },
  {
    id: 't-food-2',
    eventId: 'default-temple-seva',
    name: 'Mixed Vegetable Subji (No Onion/Garlic)',
    category: 'Main',
    quantity: 150,
    unit: 'portions',
    assignedTo: 'Ramesh Patel',
    notes: 'Potatoes, cauliflower, peas, and fresh paneer cubes with traditional spices.'
  },
  {
    id: 't-food-3',
    eventId: 'default-temple-seva',
    name: 'Jeera Rice & Ghee',
    category: 'Side',
    quantity: 20,
    unit: 'kg',
    assignedTo: 'Sita Devi',
    notes: 'Using premium long-grain Basmati rice and pure Desi ghee.'
  }
];

const DEFAULT_TEMPLE_TASKS: Task[] = [
  { id: 't-task-1', eventId: 'default-temple-seva', title: 'Clean and sanitize the holy kitchen (seva preparation)', timelineStage: '1 week before', completed: true },
  { id: 't-task-2', eventId: 'default-temple-seva', title: 'Procure pure ingredients and fresh vegetables from wholesale', timelineStage: '3 days before', completed: true },
  { id: 't-task-3', eventId: 'default-temple-seva', title: 'Boil and reduce milk for the Saffron Kheer', timelineStage: '1 day before', completed: false },
  { id: 't-task-4', eventId: 'default-temple-seva', title: 'Chop and prep vegetables with chanting devotional songs', timelineStage: 'Morning of', completed: false },
  { id: 't-task-5', eventId: 'default-temple-seva', title: 'Offer Prasadam to the Deities (Bhog offering)', timelineStage: 'During event', completed: false }
];

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('gather_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Global registries state
  const [events, setEvents] = useState<Event[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Navigation / Modal state
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<'food' | 'shopping' | 'timeline'>('food');
  const [prefilledDate, setPrefilledDate] = useState<string | undefined>(undefined);
  const [dbError, setDbError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSaveSettings = async (updatedUser: User) => {
    await saveDocument<User>('users', 'gather_users_local', updatedUser);
    setCurrentUser(updatedUser);
    localStorage.setItem('gather_user', JSON.stringify(updatedUser));
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('gather_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('gather_user');
  };

  // Set up Firebase Real-Time Synchronization with LocalStorage backup
  useEffect(() => {
    if (!currentUser) return;

    const isTempleUser = currentUser.role === 'temple_team';
    const initialEvents = isTempleUser ? [DEFAULT_TEMPLE_EVENT] : [DEFAULT_EVENT];
    const initialFoods = isTempleUser ? DEFAULT_TEMPLE_FOODS : DEFAULT_FOODS;
    const initialTasks = isTempleUser ? DEFAULT_TEMPLE_TASKS : DEFAULT_TASKS;

    const unsubEvents = subscribeToCollection<Event>('events', 'gather_events', initialEvents, setEvents);
    const unsubFoods = subscribeToCollection<FoodItem>('foods', 'gather_foods', initialFoods, setFoodItems);
    const unsubTasks = subscribeToCollection<Task>('tasks', 'gather_tasks', initialTasks, setTasks);

    return () => {
      unsubEvents();
      unsubFoods();
      unsubTasks();
    };
  }, [currentUser]);

  // Event Operations
  const handleCreateOrUpdateEvent = async (formData: Omit<Event, 'id' | 'createdAt'>) => {
    if (editingEvent) {
      const updated: Event = {
        ...editingEvent,
        ...formData
      };
      await saveDocument<Event>('events', 'gather_events', updated);
      setEditingEvent(null);
      setFormOpen(false); // Close ONLY on editing an existing event
    } else {
      const newEvent: Event = {
        ...formData,
        id: `event-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      await saveDocument<Event>('events', 'gather_events', newEvent);

      // Seed core template tasks for the brand new event
      const newTemplateTasks: Task[] = [
        { id: `task-t1-${Date.now()}`, eventId: newEvent.id, title: 'Send invitation details to guests', timelineStage: '1 week before', completed: false },
        { id: `task-t2-${Date.now()}`, eventId: newEvent.id, title: 'Plan core menu items', timelineStage: '1 week before', completed: false },
        { id: `task-t3-${Date.now()}`, eventId: newEvent.id, title: 'Clean main hosting rooms & dining areas', timelineStage: '3 days before', completed: false },
        { id: `task-t4-${Date.now()}`, eventId: newEvent.id, title: 'Make-ahead early culinary recipes', timelineStage: '1 day before', completed: false },
        { id: `task-t5-${Date.now()}`, eventId: newEvent.id, title: 'Chill drinks & assemble remaining food items', timelineStage: 'Morning of', completed: false },
        { id: `task-t6-${Date.now()}`, eventId: newEvent.id, title: 'Breathe, smile, and welcome guests with a beverage', timelineStage: 'During event', completed: false }
      ];
      await saveDocumentsBatch<Task>('tasks', 'gather_tasks', newTemplateTasks);
      setFormOpen(false); // Close the popup when a new event is added successfully
    }
    setPrefilledDate(undefined);
  };

  const handleDeleteEvent = async (id: string) => {
    const targetEvent = events.find(e => e.id === id);
    if (targetEvent && targetEvent.eventType === 'temple' && currentUser?.role !== 'temple_team') {
      alert("You do not have permission to delete this event. If you do not wish to attend, please contact the team leader.");
      return;
    }
    await deleteDocument('events', 'gather_events', id);
    await deleteDocumentsByField('foods', 'gather_foods', 'eventId', id);
    await deleteDocumentsByField('tasks', 'gather_tasks', 'eventId', id);
    if (selectedEventId === id) {
      setSelectedEventId(null);
    }
  };

  const handleEditEventClick = (event: Event) => {
    setEditingEvent(event);
    setFormOpen(true);
  };

  // Food Operations
  const handleAddFood = async (item: Omit<FoodItem, 'id' | 'eventId'>) => {
    if (!selectedEventId) return;
    const newFood: FoodItem = {
      ...item,
      id: `food-${Date.now()}`,
      eventId: selectedEventId
    };
    await saveDocument<FoodItem>('foods', 'gather_foods', newFood);
  };

  const handleAddMultiFood = async (items: Omit<FoodItem, 'id' | 'eventId'>[]) => {
    if (!selectedEventId) return;
    const newFoods: FoodItem[] = items.map((item, index) => ({
      ...item,
      id: `food-${Date.now()}-${index}`,
      eventId: selectedEventId
    }));
    await saveDocumentsBatch<FoodItem>('foods', 'gather_foods', newFoods);
  };

  const handleDeleteFood = async (id: string) => {
    await deleteDocument('foods', 'gather_foods', id);
  };

  const handleUpdateFood = async (id: string, updatedFields: Partial<FoodItem>) => {
    const item = foodItems.find(f => f.id === id);
    if (item) {
      const updated = { ...item, ...updatedFields };
      await saveDocument<FoodItem>('foods', 'gather_foods', updated);
    }
  };

  // Task Operations
  const handleAddTask = async (taskForm: Omit<Task, 'id' | 'eventId'>) => {
    if (!selectedEventId) return;
    const newTask: Task = {
      ...taskForm,
      id: `task-${Date.now()}`,
      eventId: selectedEventId
    };
    await saveDocument<Task>('tasks', 'gather_tasks', newTask);
  };

  const handleDeleteTask = async (id: string) => {
    await deleteDocument('tasks', 'gather_tasks', id);
  };

  const handleToggleTask = async (id: string) => {
    const item = tasks.find(t => t.id === id);
    if (item) {
      const updated = { ...item, completed: !item.completed };
      await saveDocument<Task>('tasks', 'gather_tasks', updated);
    }
  };

  if (!currentUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Derive active context
  const isTempleUser = currentUser.role === 'temple_team';

  const visibleEvents = events.filter(ev => {
    if (!currentUser) return false;
    
    // Show correct default preseeded event so layout is beautiful initially
    if (ev.id === 'default-sisterhood-brunch' || ev.id === 'default-temple-seva') {
      if (isTempleUser && ev.id === 'default-sisterhood-brunch') return false;
      if (!isTempleUser && ev.id === 'default-temple-seva') return false;
      return true;
    }

    // Strict privacy boundary: An event is ONLY visible to the current user/team if:
    // 1. The user/team created it (creatorId or creatorPhone matches)
    // 2. OR, the user/team is invited (invitedPhones includes user's phone number)
    const isOwnerOrInvited = ev.creatorId === currentUser.id || 
                             ev.creatorPhone === currentUser.phoneNumber ||
                             (ev.invitedPhones && ev.invitedPhones.includes(currentUser.phoneNumber));

    return isOwnerOrInvited;
  });

  const activeEvent = visibleEvents.find(e => e.id === selectedEventId);
  const activeEventFoods = foodItems.filter(f => f.eventId === selectedEventId);
  const activeEventTasks = tasks.filter(t => t.eventId === selectedEventId);

  return (
    <div className={`min-h-screen text-neutral-800 flex flex-col font-sans transition-colors duration-300 ${
      isTempleUser 
        ? 'bg-[#FAF9F0] selection:bg-amber-200/50 selection:text-amber-900' 
        : 'bg-[#FAF9F6] selection:bg-[#C88A8A]/20 selection:text-neutral-900'
    }`} id="app-root-div">

      
      {/* 1. Header Banner */}
      <header className="bg-white border-b border-[#EBE7DF] sticky top-0 z-30" id="main-app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedEventId(null)}>
            {isTempleUser ? (
              <div className="w-8 h-8 bg-amber-600 rounded-xl flex items-center justify-center text-white font-medium text-lg shadow-sm">
                🕌
              </div>
            ) : (
              <div className="w-8 h-8 bg-[#C88A8A] rounded-xl flex items-center justify-center text-white font-medium text-lg shadow-sm">
                ✨
              </div>
            )}
            <div>
              <span className="font-serif font-semibold text-neutral-900 tracking-wide">
                {isTempleUser ? 'Temple Seva' : 'Gather & Grace'}
              </span>
              <span className={`text-[10px] uppercase font-bold tracking-widest block font-sans ${
                isTempleUser ? 'text-amber-700' : 'text-[#C88A8A]'
              }`}>
                {isTempleUser ? 'Kitchen & Volunteer Portal' : "Women's Event Planner"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isTempleUser ? (
              <span className="text-xs text-neutral-600 font-medium font-sans hidden sm:inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full shadow-3xs">
                <span className="text-amber-700 font-bold">🕌 Active Team:</span>
                <strong>{currentUser.name}</strong>
              </span>
            ) : (
              <span className="text-xs text-neutral-500 font-medium font-sans hidden sm:inline-flex items-center gap-1.5 bg-[#FAF9F6] border border-[#EBE7DF] px-3.5 py-1.5 rounded-full shadow-3xs">
                <Heart size={12} className="text-[#C88A8A] fill-[#C88A8A]" />
                Welcome, <strong>{currentUser.name}</strong>
              </span>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 font-sans cursor-pointer px-2.5 py-1.5 rounded-xl hover:bg-neutral-50 transition flex items-center gap-1"
              id="settings-btn"
              title="Account Settings"
            >
              <Settings size={14} />
              <span>Settings</span>
            </button>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-neutral-400 hover:text-neutral-700 font-sans cursor-pointer px-2.5 py-1.5 rounded-xl hover:bg-neutral-50 transition"
              id="logout-btn"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {dbError && (
        <div className="bg-red-50 border-b border-red-200 text-red-900 px-4 py-3 text-xs font-semibold flex items-center justify-between gap-4" id="db-error-banner">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            <span>{dbError}</span>
          </div>
          <button 
            onClick={() => setDbError(null)}
            className="text-red-700 hover:text-red-900 font-sans text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded hover:bg-red-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Main Content Canvas */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <AnimatePresence mode="wait">
          {!selectedEventId ? (
            
            // VIEW A: EVENTS DASHBOARD
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
              id="dashboard-view-div"
            >
              {/* Welcome Jumbotron */}
              {isTempleUser ? (
                <div className="bg-white border border-amber-200 rounded-3xl p-6 sm:p-8 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden bg-gradient-to-b from-white to-amber-50/20">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/30 rounded-full filter blur-xl opacity-50 -z-0"></div>
                  
                  <div className="space-y-2 relative z-10 text-center sm:text-left">
                    <h1 className="font-serif text-2xl sm:text-3xl text-neutral-900 font-medium leading-tight">
                      Seva is an act of <span className="text-amber-700 italic">pure devotion</span>.
                    </h1>
                    <p className="text-xs sm:text-sm text-neutral-500 max-w-xl">
                      Coordinate sacred seva preparations, organize devotional seva teams, and make sure pure offerings are planned and distributed with reverence.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingEvent(null);
                      setFormOpen(true);
                      setPrefilledDate(undefined);
                    }}
                    className="w-full sm:w-auto px-5 py-3 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-xl transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                    id="create-new-seva-btn"
                  >
                    <Plus size={16} />
                    Plan New Seva
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-[#EBE7DF] rounded-3xl p-6 sm:p-8 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#FDF6F6] rounded-full filter blur-xl opacity-50 -z-0"></div>
                  
                  <div className="space-y-2 relative z-10 text-center sm:text-left">
                    <h1 className="font-serif text-2xl sm:text-3xl text-neutral-900 font-medium leading-tight">
                      Hosting is an act of <span className="text-[#C88A8A] italic">grace</span>.
                    </h1>
                    <p className="text-xs sm:text-sm text-neutral-500 max-w-xl">
                      Create beautiful, memorable gatherings for your sisters, mothers, friends, and community. Plan full menus, track who brings what, and calculate ingredients effortlessly.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingEvent(null);
                      setFormOpen(true);
                      setPrefilledDate(undefined);
                    }}
                    className="w-full sm:w-auto px-5 py-3 bg-[#C88A8A] hover:bg-[#B57878] text-white text-xs font-semibold rounded-xl transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                    id="create-new-event-btn"
                  >
                    <Plus size={16} />
                    Plan New Gathering
                  </button>
                </div>
              )}

              {/* Events Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#EBE7DF]/60 pb-3">
                  <h2 className="font-serif font-semibold text-lg text-neutral-900 px-1">
                    {isTempleUser ? 'Active Temple Sevas' : 'Your Upcoming Gatherings'}
                  </h2>
                </div>
                
                {visibleEvents.length === 0 ? (
                  isTempleUser ? (
                    <div className="bg-white border border-amber-100 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4">
                      <span className="text-4xl">🕌</span>
                      <div className="space-y-1">
                        <p className="font-serif font-medium text-neutral-800">No active Temple Seva scheduled</p>
                        <p className="text-xs text-neutral-400 max-w-sm">
                          Tap "Plan New Seva" to schedule a kitchen service and organize pure food offerings with your volunteers!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-[#EBE7DF] rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4">
                      <span className="text-4xl">🌸</span>
                      <div className="space-y-1">
                        <p className="font-serif font-medium text-neutral-800">Your calendar is clear</p>
                        <p className="text-xs text-neutral-400 max-w-sm">
                          Tap "Plan New Gathering" to create your first beautiful event and coordinate dishes with your friends!
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                      {visibleEvents.map((ev) => (
                        <EventCard
                          key={ev.id}
                          event={ev}
                          foodItems={foodItems.filter(f => f.eventId === ev.id)}
                          onOpen={() => {
                            setSelectedEventId(ev.id);
                            setActiveTab('food'); // Default to planned food list
                          }}
                          onEdit={() => handleEditEventClick(ev)}
                          onDelete={() => handleDeleteEvent(ev.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>

          ) : (
            
            // VIEW B: ACTIVE GATHERING PLANNER ROOM
            <motion.div
              key="planner"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
              id="gathering-room-div"
            >
              {/* Back button and title card */}
              <div className={`flex flex-wrap items-center justify-between gap-3 bg-white border rounded-3xl p-5 shadow-2xs ${
                isTempleUser ? 'border-amber-100 bg-gradient-to-r from-white to-amber-50/10' : 'border-[#EBE7DF]'
              }`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedEventId(null)}
                    className={`p-2 border rounded-xl transition cursor-pointer ${
                      isTempleUser 
                        ? 'border-amber-150 text-amber-700 hover:bg-amber-50' 
                        : 'border-[#EBE7DF] text-neutral-500 hover:bg-neutral-100'
                    }`}
                    id="back-to-dashboard-btn"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-md ${
                        isTempleUser 
                          ? 'bg-amber-50 text-amber-700 border-amber-100' 
                          : 'bg-[#FDF6F6] text-[#C88A8A] border-[#FBEAEA]'
                      }`}>
                        {isTempleUser ? 'Temple Seva' : activeEvent?.type}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {activeEvent?.date && new Date(activeEvent.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <h1 className="font-serif text-lg sm:text-xl text-neutral-900 font-semibold">{activeEvent?.title}</h1>
                  </div>
                </div>

                {/* Edit event specifications card */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-mono border ${
                    isTempleUser 
                      ? 'bg-amber-50/50 border-amber-100 text-amber-800' 
                      : 'bg-[#FAF9F6] border-[#F2EFE9] text-neutral-500'
                  }`}>
                    <Users size={12} className={isTempleUser ? 'text-amber-500' : 'text-neutral-400'} />
                    {isTempleUser ? `${activeEvent?.guestsCount} volunteers needed` : `${activeEvent?.guestsCount} guests`}
                  </span>

                  <button
                    onClick={() => activeEvent && handleEditEventClick(activeEvent)}
                    className={`px-3.5 py-1.5 border rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                      isTempleUser 
                        ? 'border-amber-150 hover:bg-amber-50 text-amber-700' 
                        : 'border-[#EBE7DF] hover:bg-neutral-100 text-neutral-600'
                    }`}
                    id="edit-active-event-btn"
                  >
                    <Edit3 size={13} /> {isTempleUser ? 'Edit Seva Specs' : 'Edit specs'}
                  </button>
                </div>
              </div>

              {/* Event Room Menu Tabs */}
              <div className="flex border-b border-[#EBE7DF] overflow-x-auto gap-1 scrollbar-thin" id="gathering-tabs-nav">
                <button
                  onClick={() => setActiveTab('food')}
                  className={`px-4 sm:px-6 py-3 text-xs font-medium border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'food'
                      ? isTempleUser
                        ? 'border-amber-600 text-amber-700 font-bold'
                        : 'border-[#C88A8A] text-[#C88A8A] font-semibold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-800'
                  }`}
                  id="tab-btn-food"
                >
                  <Utensils size={14} className={isTempleUser ? 'text-amber-600' : 'text-[#C88A8A]'} />
                  {isTempleUser ? 'Menu' : 'Planned Food'}
                </button>

                {!isTempleUser && (
                  <>
                    <button
                      onClick={() => setActiveTab('shopping')}
                      className={`px-4 sm:px-6 py-3 text-xs font-medium border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'shopping'
                          ? 'border-[#C88A8A] text-[#C88A8A] font-semibold'
                          : 'border-transparent text-neutral-500 hover:text-neutral-800'
                      }`}
                      id="tab-btn-shopping"
                    >
                      <ShoppingBag size={14} className="text-[#C88A8A]" />
                      Shopping Checklist
                    </button>

                    <button
                      onClick={() => setActiveTab('timeline')}
                      className={`px-4 sm:px-6 py-3 text-xs font-medium border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'timeline'
                          ? 'border-[#C88A8A] text-[#C88A8A] font-semibold'
                          : 'border-transparent text-neutral-500 hover:text-neutral-800'
                      }`}
                      id="tab-btn-timeline"
                    >
                      <ClipboardList size={14} className="text-[#C88A8A]" />
                      Hosting Timeline
                    </button>
                  </>
                )}
              </div>

              {/* Active Tab Panel */}
              <div className="pt-2">
                {activeEvent && (
                  <AnimatePresence mode="wait">
                    {activeTab === 'food' && (
                      <motion.div
                        key="food-panel"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <FoodList
                          event={activeEvent}
                          foodItems={activeEventFoods}
                          onAddFood={handleAddFood}
                          onDeleteFood={handleDeleteFood}
                          onUpdateFood={handleUpdateFood}
                          currentUser={currentUser}
                        />
                      </motion.div>
                    )}

                    {activeTab === 'shopping' && (
                      <motion.div
                        key="shopping-panel"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <ShoppingList
                          event={activeEvent}
                          foodItems={activeEventFoods}
                        />
                      </motion.div>
                    )}

                    {activeTab === 'timeline' && (
                      <motion.div
                        key="timeline-panel"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <TimelineTracker
                          event={activeEvent}
                          tasks={activeEventTasks}
                          onAddTask={handleAddTask}
                          onDeleteTask={handleDeleteTask}
                          onToggleTask={handleToggleTask}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 3. Global Elegant Footer */}
      <footer className="bg-white border-t border-[#EBE7DF] py-6 mt-12 text-center" id="main-app-footer">
        <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold flex items-center justify-center gap-1">
          {isTempleUser ? (
            <>
              Made with devotion for sacred temples & pure menu offerings.
            </>
          ) : (
            <>
              Made with <Heart size={10} className="text-[#C88A8A] fill-[#C88A8A] animate-pulse" /> for warm, cohesive tables & gatherings.
            </>
          )}
        </p>
      </footer>

      {/* 4. Overlay Event Modal Form & Settings Modal */}
      <AnimatePresence>
        {formOpen && (
          <EventForm
            onSubmit={handleCreateOrUpdateEvent}
            onClose={() => {
              setFormOpen(false);
              setEditingEvent(null);
              setPrefilledDate(undefined);
            }}
            initialEvent={editingEvent || undefined}
            prefilledDate={prefilledDate}
            currentUser={currentUser}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <SettingsModal
            currentUser={currentUser}
            onClose={() => setSettingsOpen(false)}
            onSave={handleSaveSettings}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
