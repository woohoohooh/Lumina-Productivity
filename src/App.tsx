/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  Plus, 
  GripVertical, 
  CheckCircle2, 
  Circle, 
  Tag, 
  User as UserIcon, 
  MoreHorizontal,
  ChevronRight,
  X,
  Search,
  Filter,
  LayoutList,
  Calendar,
  Settings,
  Loader2,
  Bell,
  Moon,
  Sun,
  HelpCircle,
  LogOut,
  LayoutDashboard,
  CheckSquare,
  Clock,
  Star,
  Hash,
  ChevronDown,
  MoreVertical,
  ArrowRight
} from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { ProjectState, Group, Task, User, Priority } from './types';

// --- Initial Data ---
const generateMinimalDataset = (): ProjectState => {
  const users: User[] = [
    { id: 'u1', name: 'John Doe' },
    { id: 'u2', name: 'Jane Smith' },
    { id: 'u3', name: 'Alex Johnson' },
  ];

  const groups: Group[] = [
    { id: 'g1', title: 'Today', taskIds: ['t1', 't2', 't3'] },
    { id: 'g2', title: 'Upcoming', taskIds: ['t4', 't5'] },
    { id: 'g3', title: 'Backlog', taskIds: ['t6'] },
  ];

  const tasks: Record<string, Task> = {
    't1': { id: 't1', globalId: 1, title: 'Refactor authentication flow', completed: false, priority: 'High', tags: ['Dev'], groupId: 'g1', assigneeId: 'u1' },
    't2': { id: 't2', globalId: 2, title: 'Design new landing page', completed: true, priority: 'Medium', tags: ['Design'], groupId: 'g1', assigneeId: 'u2' },
    't3': { id: 't3', globalId: 3, title: 'Update documentation', completed: false, priority: 'Low', tags: ['Docs'], groupId: 'g1', assigneeId: 'u3' },
    't4': { id: 't4', globalId: 4, title: 'Client meeting', completed: false, priority: 'Critical', tags: ['Meeting'], groupId: 'g2', assigneeId: 'u1' },
    't5': { id: 't5', globalId: 5, title: 'Bug fixes (v1.2)', completed: false, priority: 'High', tags: ['Dev'], groupId: 'g2', assigneeId: 'u2' },
    't6': { id: 't6', globalId: 6, title: 'Explore new icons', completed: false, priority: 'Low', tags: ['Design'], groupId: 'g3', assigneeId: 'u3' },
  };

  return {
    id: 'p1',
    title: 'Lumina Tasks',
    nextGlobalId: 7,
    users,
    groups,
    tasks
  };
};

const INITIAL_STATE: ProjectState = generateMinimalDataset();

// --- Components ---

interface SortableItemProps {
  id: string;
  children?: React.ReactNode;
  className?: string;
}

const SortableItem = ({ id, children, className }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-center gap-2", className)}>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4 text-slate-400" />
      </div>
      {children}
    </div>
  );
};

interface TaskItemProps {
  key?: React.Key;
  taskId: string;
  state: ProjectState;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  isSelected: boolean;
}

const TaskItem = ({ taskId, state, onToggle, onSelect, isSelected }: TaskItemProps) => {
  const task = state.tasks[taskId];
  if (!task) return null;

  return (
    <SortableItem id={taskId} className="group">
      <div 
        onClick={() => onSelect(taskId)}
        className={cn(
          "flex-1 flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 cursor-pointer",
          isSelected 
            ? "bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-200 dark:ring-indigo-800" 
            : "hover:bg-slate-50 dark:hover:bg-slate-900"
        )}
      >
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onToggle(taskId);
          }}
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
            task.completed 
              ? "bg-indigo-500 border-indigo-500 text-white" 
              : "border-slate-200 dark:border-slate-700 hover:border-indigo-400"
          )}
        >
          {task.completed && <CheckCircle2 className="w-4 h-4" />}
        </button>
        
        <div className="flex-1">
          <h4 className={cn(
            "text-sm font-medium transition-all duration-300",
            task.completed ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-200"
          )}>
            {task.title}
          </h4>
          <div className="flex items-center gap-3 mt-1">
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              task.priority === 'Critical' && "text-rose-500",
              task.priority === 'High' && "text-orange-500",
              task.priority === 'Medium' && "text-blue-500",
              task.priority === 'Low' && "text-slate-400",
            )}>
              {task.priority}
            </span>
            {task.tags.map(tag => (
              <span key={tag} className="text-[10px] text-slate-400 flex items-center gap-1">
                <Hash className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex -space-x-2">
          {state.users.find(u => u.id === task.assigneeId) && (
            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-400">
              {state.users.find(u => u.id === task.assigneeId)?.name.charAt(0)}
            </div>
          )}
        </div>
      </div>
    </SortableItem>
  );
};

export default function App() {
  const [state, setState] = useState<ProjectState>(INITIAL_STATE);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTask = useCallback((taskId: string) => {
    setState(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: { ...prev.tasks[taskId], completed: !prev.tasks[taskId].completed }
      }
    }));
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const activeId = active.id as string;
      const overId = over.id as string;

      const activeTask = state.tasks[activeId];
      const overTask = state.tasks[overId];

      if (activeTask && overTask && activeTask.groupId === overTask.groupId) {
        const group = state.groups.find(g => g.id === activeTask.groupId);
        if (group) {
          const oldIndex = group.taskIds.indexOf(activeId);
          const newIndex = group.taskIds.indexOf(overId);
          
          setState(prev => ({
            ...prev,
            groups: prev.groups.map(g => 
              g.id === group.id 
                ? { ...g, taskIds: arrayMove(g.taskIds, oldIndex, newIndex) } 
                : g
            )
          }));
        }
      }
    }
  };

  const addTask = (groupId: string) => {
    const newId = `t${Math.random().toString(36).substr(2, 9)}`;
    const newTask: Task = {
      id: newId,
      globalId: state.nextGlobalId,
      title: 'New Task',
      completed: false,
      priority: 'Medium',
      tags: [],
      groupId
    };

    setState(prev => ({
      ...prev,
      nextGlobalId: prev.nextGlobalId + 1,
      tasks: { ...prev.tasks, [newId]: newTask },
      groups: prev.groups.map(g => g.id === groupId ? { ...g, taskIds: [newId, ...g.taskIds] } : g)
    }));
    setSelectedTaskId(newId);
  };

  const filteredGroups = useMemo(() => {
    return state.groups.map(group => ({
      ...group,
      taskIds: group.taskIds.filter(id => {
        const task = state.tasks[id];
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === 'all' || 
                          (activeTab === 'completed' && task.completed) || 
                          (activeTab === 'active' && !task.completed);
        return matchesSearch && matchesTab;
      })
    }));
  }, [state, searchQuery, activeTab]);

  const selectedTask = selectedTaskId ? state.tasks[selectedTaskId] : null;

  return (
    <div className="flex h-screen bg-white dark:bg-[#0a0a0a] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-100 dark:border-slate-900 flex flex-col p-6 shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h1 className="font-display font-bold text-xl tracking-tight dark:text-white">Lumina</h1>
        </div>

        <nav className="flex-1 space-y-1">
          <button 
            onClick={() => setActiveTab('all')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200",
              activeTab === 'all' ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('active')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200",
              activeTab === 'active' ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
            )}
          >
            <Clock className="w-4 h-4" />
            Active Tasks
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200",
              activeTab === 'completed' ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
            )}
          >
            <CheckCircle2 className="w-4 h-4" />
            Completed
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-200">
            <Star className="w-4 h-4" />
            Starred
          </button>
        </nav>

        <div className="mt-auto pt-6 space-y-1">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-200"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-200">
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <div className="flex items-center gap-3 px-4 py-6 border-t border-slate-100 dark:border-slate-900 mt-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">John Doe</p>
              <p className="text-[10px] text-slate-500 truncate">Pro Plan</p>
            </div>
            <LogOut className="w-4 h-4 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0a0a0a]">
        <header className="h-20 flex items-center justify-between px-10 shrink-0">
          <div className="flex-1 max-w-xl relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search tasks, projects..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none dark:text-white"
            />
          </div>
          <div className="flex items-center gap-4 ml-8">
            <button className="p-3 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl transition-all">
              <Bell className="w-5 h-5" />
            </button>
            <button className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all">
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-10">
            <header className="space-y-1">
              <h2 className="text-3xl font-display font-bold tracking-tight dark:text-white">Good morning, John</h2>
              <p className="text-slate-500 text-sm">You have {Object.values(state.tasks).filter((t: any) => !t.completed).length} tasks remaining for today.</p>
            </header>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div className="space-y-8">
                {filteredGroups.map(group => (
                  <section key={group.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-lg dark:text-white">{group.title}</h3>
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-500 rounded-full text-[10px] font-bold">
                          {group.taskIds.length}
                        </span>
                      </div>
                      <button 
                        onClick={() => addTask(group.id)}
                        className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <SortableContext items={group.taskIds} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {group.taskIds.map(taskId => (
                          <TaskItem 
                            key={taskId} 
                            taskId={taskId} 
                            state={state} 
                            onToggle={toggleTask}
                            onSelect={setSelectedTaskId}
                            isSelected={selectedTaskId === taskId}
                          />
                        ))}
                        {group.taskIds.length === 0 && (
                          <div className="py-8 border-2 border-dashed border-slate-100 dark:border-slate-900 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                            <p className="text-xs">No tasks found</p>
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </section>
                ))}
              </div>
            </DndContext>
          </div>
        </div>
      </main>

      {/* Details Panel */}
      <AnimatePresence>
        {selectedTask && (
          <motion.aside 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-96 border-l border-slate-100 dark:border-slate-900 bg-white dark:bg-[#0a0a0a] flex flex-col shrink-0 z-20"
          >
            <header className="h-20 flex items-center justify-between px-8 border-b border-slate-50 dark:border-slate-900">
              <h3 className="font-display font-bold text-lg dark:text-white">Task Details</h3>
              <button 
                onClick={() => setSelectedTaskId(null)}
                className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => toggleTask(selectedTask.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      selectedTask.completed 
                        ? "bg-emerald-500 text-white" 
                        : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-indigo-500 hover:text-white"
                    )}
                  >
                    {selectedTask.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    {selectedTask.completed ? 'Completed' : 'Mark Complete'}
                  </button>
                  <button className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all">
                    <Star className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all ml-auto">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                <input 
                  type="text" 
                  value={selectedTask.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setState(prev => ({
                      ...prev,
                      tasks: { ...prev.tasks, [selectedTask.id]: { ...prev.tasks[selectedTask.id], title: newTitle } }
                    }));
                  }}
                  className="w-full text-2xl font-display font-bold bg-transparent border-none focus:ring-0 p-0 dark:text-white"
                />
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assignee</label>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
                        {state.users.find(u => u.id === selectedTask.assigneeId)?.name.charAt(0) || '?'}
                      </div>
                      <span className="text-xs font-medium dark:text-slate-300">
                        {state.users.find(u => u.id === selectedTask.assigneeId)?.name || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Priority</label>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        selectedTask.priority === 'Critical' && "bg-rose-500",
                        selectedTask.priority === 'High' && "bg-orange-500",
                        selectedTask.priority === 'Medium' && "bg-blue-500",
                        selectedTask.priority === 'Low' && "bg-slate-400",
                      )} />
                      <span className="text-xs font-medium dark:text-slate-300">{selectedTask.priority}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</label>
                  <textarea 
                    placeholder="Add a more detailed description..."
                    className="w-full h-40 p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none resize-none dark:text-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-medium flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                    <button className="px-3 py-1 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 rounded-full text-xs font-medium hover:border-indigo-500 hover:text-indigo-500 transition-all">
                      + Add Tag
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <footer className="p-8 border-t border-slate-50 dark:border-slate-900">
              <button className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-4 rounded-2xl text-sm font-bold hover:opacity-90 transition-all">
                Save Changes
                <ArrowRight className="w-4 h-4" />
              </button>
            </footer>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
