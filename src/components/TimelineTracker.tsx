import React, { useState, useEffect } from 'react';
import { Task, Event } from '../types';
import { ClipboardList, Plus, Trash2, CheckCircle, Circle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TimelineTrackerProps {
  event: Event;
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'eventId'>) => void;
  onDeleteTask: (id: string) => void;
  onToggleTask: (id: string) => void;
}

const STAGES = [
  { value: '1 week before', label: '1 Week Before', color: 'text-neutral-500 bg-neutral-100' },
  { value: '3 days before', label: '3 Days Before', color: 'text-[#C88A8A] bg-[#FDF6F6]' },
  { value: '1 day before', label: '1 Day Before', color: 'text-amber-700 bg-amber-50' },
  { value: 'Morning of', label: 'Morning Of', color: 'text-emerald-700 bg-emerald-50' },
  { value: 'During event', label: 'During Gathering', color: 'text-[#8A5A5A] bg-[#FAF3F3]' },
] as const;

export default function TimelineTracker({ event, tasks, onAddTask, onDeleteTask, onToggleTask }: TimelineTrackerProps) {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskStage, setTaskStage] = useState<typeof STAGES[number]['value']>('1 day before');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    onAddTask({
      title: taskTitle.trim(),
      timelineStage: taskStage,
      completed: false,
    });

    setTaskTitle('');
  };

  // Group tasks by timeline stage
  const getTasksByStage = (stage: string) => {
    return tasks.filter(t => t.timelineStage === stage);
  };

  return (
    <div className="space-y-6" id="timeline-tracker-panel">
      {/* Overview Block */}
      <div className="bg-white border border-[#EBE7DF] rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[#C88A8A]"><ClipboardList size={20} /></span>
            <h2 className="font-sans font-medium text-lg text-neutral-800">Hosting Preparation Timeline</h2>
          </div>
          <p className="text-xs text-neutral-500 max-w-xl leading-relaxed">
            Stay beautifully organized. Check off hosting and culinary prep tasks structured sequentially from one week prior up to the active gathering.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* 1. Add Task Form (Left bar) */}
        <div className="bg-white border border-[#EBE7DF] rounded-3xl p-5 shadow-xs h-fit">
          <h3 className="font-sans font-semibold text-neutral-800 text-sm mb-4">Add Preparation Task</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Task Title</label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Chill champagne, Arrange roses"
                className="w-full px-4 py-2.5 bg-[#FAF9F6] border border-[#EBE7DF] rounded-xl text-xs text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-[#C88A8A] transition-all"
                required
                id="task-title-input"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Timeline Stage</label>
              <select
                value={taskStage}
                onChange={(e) => setTaskStage(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-[#FAF9F6] border border-[#EBE7DF] rounded-xl text-xs text-neutral-800 focus:outline-hidden"
                id="task-stage-select"
              >
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#C88A8A] hover:bg-[#B57878] text-white font-medium rounded-xl text-xs transition flex items-center justify-center gap-1 cursor-pointer shadow-xs mt-2"
              id="add-task-submit-btn"
            >
              <Plus size={14} /> Add Prep Task
            </button>
          </form>

          {/* Quick tips box */}
          <div className="mt-5 bg-[#FAF9F6] rounded-2xl p-4 border border-[#F2EFE9] text-[11px] text-neutral-500 space-y-2 leading-relaxed">
            <p className="font-semibold text-neutral-700 flex items-center gap-1"><Clock size={12} className="text-[#C88A8A]" /> Hostess Secret</p>
            <p>Do 80% of prep work 1 day before. On the morning of, focus entirely on small assembly touches, fresh flowers, and setting a relaxing background playlist.</p>
          </div>
        </div>

        {/* 2. Structured Timeline Board (Right bar - spans 3 cols) */}
        <div className="lg:col-span-3 space-y-5">
          {STAGES.map((stage) => {
            const stageTasks = getTasksByStage(stage.value);
            const completedTasks = stageTasks.filter(t => t.completed).length;
            const totalTasks = stageTasks.length;
            
            return (
              <div
                key={stage.value}
                className="bg-white border border-[#EBE7DF] rounded-3xl p-5 shadow-xs space-y-3.5"
                id={`timeline-stage-${stage.value.replace(/\s+/g, '-')}`}
              >
                {/* Header of Stage */}
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${stage.color}`}>
                      {stage.label}
                    </span>
                  </div>
                  
                  {totalTasks > 0 && (
                    <span className="font-mono text-[9px] text-neutral-400 font-semibold uppercase">
                      {completedTasks} / {totalTasks} Completed
                    </span>
                  )}
                </div>

                {stageTasks.length === 0 ? (
                  <p className="text-[10px] text-neutral-400 italic py-1 px-1">
                    No active tasks scheduled for this phase. Add some on the left!
                  </p>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {stageTasks.map((task) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          onClick={() => onToggleTask(task.id)}
                          className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition duration-150 cursor-pointer ${
                            task.completed
                              ? 'bg-neutral-50 border-neutral-200 opacity-60'
                              : 'bg-[#FAF9F6]/40 border-[#F0EFE9] hover:bg-[#FAF9F6]'
                          }`}
                          id={`task-row-${task.id}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-neutral-400 hover:text-[#C88A8A] transition">
                              {task.completed ? (
                                <CheckCircle size={15} className="text-[#C88A8A]" />
                              ) : (
                                <Circle size={15} />
                              )}
                            </span>
                            <span className={`text-xs text-neutral-700 font-medium ${task.completed ? 'line-through text-neutral-400' : ''}`}>
                              {task.title}
                            </span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // prevent toggling task
                              onDeleteTask(task.id);
                            }}
                            className="p-1 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-100/40 rounded-lg transition cursor-pointer"
                            title="Delete task"
                            id={`delete-task-btn-${task.id}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
