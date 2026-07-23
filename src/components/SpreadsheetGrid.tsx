/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Eye, 
  Filter, 
  Download, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Paperclip,
  CheckCircle2,
  Calendar,
  X,
  UserPlus
} from 'lucide-react';
import { Task, TaskStatus, RiskLevel, TaskPriority, TeamMember, SubtaskItem, ChecklistGroup, TaskActivityItem } from '../types';
import { isParentTask } from '../lib/rollup';
import SubtasksEditor from './SubtasksEditor';
import ChecklistsEditor from './ChecklistsEditor';
import TaskActivityAndWorkflow from './TaskActivityAndWorkflow';

interface SpreadsheetGridProps {
  tasks: Task[];
  teamMembers: TeamMember[];
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function SpreadsheetGrid({ 
  tasks, 
  teamMembers, 
  onAddTask, 
  onUpdateTask, 
  onDeleteTask 
}: SpreadsheetGridProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');

  // Modal / Editor State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New task form fields
  const [newWbs, setNewWbs] = useState('1.1');
  const [newName, setNewName] = useState('');
  const [newStatus, setNewStatus] = useState<TaskStatus>('To Do');
  const [newPriority, setNewPriority] = useState<TaskPriority | ''>('');
  const [newProgress, setNewProgress] = useState(0);
  const [newStart, setNewStart] = useState(new Date().toISOString().split('T')[0]);
  const [newEnd, setNewEnd] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [newBudget, setNewBudget] = useState(1000);
  const [newActual, setNewActual] = useState(0);
  const [newAssignees, setNewAssignees] = useState<string[]>([]);
  const [newNotes, setNewNotes] = useState('');
  const [newPredecessors, setNewPredecessors] = useState<string[]>([]);
  const [newSubtasks, setNewSubtasks] = useState<SubtaskItem[]>([]);
  const [newChecklists, setNewChecklists] = useState<ChecklistGroup[]>([]);
  const [newActivities, setNewActivities] = useState<TaskActivityItem[]>([
    {
      id: 'act_init_' + Date.now(),
      type: 'status_change',
      user: 'You',
      timestamp: 'Just now',
      fromStatus: 'To Do',
      toStatus: 'To Do'
    }
  ]);

  // Filter tasks based on Search and Dropdowns
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || 
                          t.wbs.includes(search) || 
                          t.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All' 
        || t.status === statusFilter 
        || (statusFilter === 'To Do' && t.status === 'Not Started')
        || (statusFilter === 'Not Started' && t.status === 'To Do');
      const matchPriority = priorityFilter === 'All' 
        || (priorityFilter === 'None' && (!t.priority || (t.priority as string) === '')) 
        || (t.priority as string) === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    }).sort((a, b) => {
      // Sort hierarchically by WBS
      return a.wbs.localeCompare(b.wbs, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [tasks, search, statusFilter, priorityFilter]);

  const isEditingParent = useMemo(() => {
    if (!editingTask) return false;
    return isParentTask(editingTask.wbs, tasks);
  }, [editingTask, tasks]);

  // Handle opening Edit Modal
  const openEditModal = (task: Task) => {
    const existingActs = task.activities && task.activities.length > 0
      ? task.activities
      : [
          {
            id: 'act_init_' + task.id,
            type: 'status_change' as const,
            user: 'You',
            timestamp: 'Created',
            fromStatus: 'To Do' as TaskStatus,
            toStatus: (task.status === 'Not Started' ? 'To Do' : task.status)
          }
        ];

    setEditingTask({ ...task, activities: existingActs });
    setIsEditModalOpen(true);
  };

  // Handle saving Edited Task
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask) {
      // Calculate duration
      const start = new Date(editingTask.startDate);
      const end = new Date(editingTask.endDate);
      const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      onUpdateTask({ ...editingTask, duration });
      setIsEditModalOpen(false);
      setEditingTask(null);
    }
  };

  // Handle Add Task Submission
  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    // Calculate duration
    const start = new Date(newStart);
    const end = new Date(newEnd);
    const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    onAddTask({
      wbs: newWbs,
      name: newName,
      status: newStatus,
      priority: newPriority,
      progress: Number(newProgress) || 0,
      startDate: newStart,
      endDate: newEnd,
      duration,
      assignees: newAssignees,
      predecessors: newPredecessors,
      budget: Number(newBudget) || 0,
      actualCost: Number(newActual) || 0,
      riskLevel: 'Low',
      notes: newNotes,
      attachmentUrl: '',
      subtasks: newSubtasks,
      checklists: newChecklists,
      activities: newActivities
    });

    // Reset form
    setNewName('');
    setNewWbs('1.1');
    setNewStatus('To Do');
    setNewPriority('');
    setNewProgress(0);
    setNewBudget(1000);
    setNewActual(0);
    setNewAssignees([]);
    setNewNotes('');
    setNewPredecessors([]);
    setNewSubtasks([]);
    setNewChecklists([]);
    setNewActivities([
      {
        id: 'act_init_' + Date.now(),
        type: 'status_change',
        user: 'You',
        timestamp: 'Just now',
        fromStatus: 'To Do',
        toStatus: 'To Do'
      }
    ]);
    setIsAddModalOpen(false);
  };

  // Toggle assignee list
  const toggleAssignee = (email: string, isEditing: boolean) => {
    if (isEditing && editingTask) {
      const current = editingTask.assignees || [];
      const updated = current.includes(email)
        ? current.filter(e => e !== email)
        : [...current, email];
      setEditingTask({ ...editingTask, assignees: updated });
    } else {
      setNewAssignees(prev => 
        prev.includes(email) 
          ? prev.filter(e => e !== email) 
          : [...prev, email]
      );
    }
  };

  // Helper for status badge styles
  const getStatusBadgeClass = (status: TaskStatus) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // Helper for priority badge styles
  const getPriorityBadgeClass = (priority?: TaskPriority | string | null) => {
    switch (priority) {
      case 'Urgent': return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
      case 'High': return 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
      case 'Normal': return 'bg-sky-50 text-sky-700 border-sky-200 font-semibold';
      case 'Low': return 'bg-slate-50 text-slate-600 border-slate-200 font-medium';
      default: return 'bg-slate-50 text-slate-400 border-slate-200 font-normal italic';
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Filtering Header Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-1 w-full md:w-auto items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl">
          <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <input 
            type="text"
            placeholder="Search tasks by title, code, or WBS..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs text-slate-800 focus:outline-none bg-transparent"
          />
        </div>

        <div className="flex flex-wrap w-full md:w-auto gap-3 items-center">
          
          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-600">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent focus:outline-none pr-1.5 font-medium cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-600">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select 
              value={priorityFilter} 
              onChange={e => setPriorityFilter(e.target.value)}
              className="bg-transparent focus:outline-none pr-1.5 font-medium cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">🔥 Urgent</option>
              <option value="High">⚠️ High</option>
              <option value="Normal">⚡ Normal</option>
              <option value="Low">🌱 Low</option>
              <option value="None">Clear / Tanpa Priority</option>
            </select>
          </div>

          {/* Add Task Button */}
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 active:scale-[0.98] transition-all shadow-md ml-auto md:ml-0"
          >
            <Plus className="h-4 w-4" />
            New Task
          </button>

        </div>
      </div>

      {/* Grid Container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
            <thead>
              <tr className="bg-slate-900 text-white border-b border-slate-200 text-[10px] uppercase font-mono tracking-wider font-semibold">
                <th className="w-[8%] px-3 py-3.5 text-center">WBS</th>
                <th className="w-[32%] px-4 py-3.5">Task Description</th>
                <th className="w-[12%] px-3 py-3.5">Status</th>
                <th className="w-[13%] px-3 py-3.5">Priority</th>
                <th className="w-[14%] px-3 py-3.5">Progress</th>
                <th className="w-[11%] px-3 py-3.5">Timeline</th>
                <th className="w-[10%] px-3 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No control tasks found matching query. Add a task to initialize.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const isParent = isParentTask(t.wbs, tasks);
                  const depth = (t.wbs || '').split('.').length;
                  return (
                    <tr key={t.id} className={`hover:bg-slate-50/50 transition-colors ${isParent ? 'bg-indigo-50/10 border-l-4 border-l-indigo-500' : ''}`}>
                      
                      {/* WBS Row */}
                      <td className="px-3 py-4 text-center font-mono font-bold text-slate-500">
                        {t.wbs}
                      </td>

                      {/* Description & Assignees */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1 min-w-0" style={{ paddingLeft: `${(depth - 1) * 16}px` }}>
                          <span className={`text-[12px] truncate flex items-center gap-1 min-w-0 ${isParent ? 'font-black text-slate-900' : 'font-bold text-slate-800'}`} title={t.name}>
                            {isParent && (
                              <span className="inline-flex items-center bg-indigo-100 text-indigo-800 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-indigo-200 mr-1 flex-shrink-0 tracking-wider">
                                ROLLUP
                              </span>
                            )}
                            <span className="truncate">{t.name}</span>
                          </span>
                          
                          {/* Task metadata row */}
                          <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-400 mt-0.5">
                            <span className="font-mono bg-slate-100 text-slate-500 px-1 py-0.5 rounded text-[9px]">{t.id}</span>
                            {t.predecessors.length > 0 && (
                              <span className="bg-slate-50 border border-slate-200 px-1 py-0.5 rounded text-[9px] text-slate-500">
                                Pre: {t.predecessors.join(', ')}
                              </span>
                            )}
                          
                          {/* Render Assignee Avatar stack */}
                          {t.assignees.length > 0 && (
                            <div className="flex items-center -space-x-1.5 ml-1">
                              {t.assignees.map((email, index) => {
                                const member = teamMembers.find(m => m.email === email);
                                return (
                                  <img 
                                    key={index}
                                    src={member?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${email}`}
                                    alt={member?.name || email}
                                    title={member?.name || email}
                                    className="h-4.5 w-4.5 rounded-full ring-2 ring-white object-cover"
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="px-3 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getStatusBadgeClass(t.status)}`}>
                        {t.status}
                      </span>
                    </td>

                    {/* Priority Selector Cell */}
                    <td className="px-3 py-4">
                      <select 
                        value={t.priority || ''} 
                        onChange={e => {
                          const p = e.target.value as TaskPriority | '';
                          onUpdateTask({ ...t, priority: p });
                        }}
                        className={`px-2 py-1 rounded text-[10px] border cursor-pointer focus:outline-none transition-all ${getPriorityBadgeClass(t.priority)}`}
                      >
                        <option value="" className="bg-white text-slate-400 font-normal">Clear (Tanpa Priority)</option>
                        <option value="Urgent" className="bg-white text-rose-700 font-bold">🔥 Urgent</option>
                        <option value="High" className="bg-white text-amber-700 font-bold">⚠️ High</option>
                        <option value="Normal" className="bg-white text-sky-700 font-semibold">⚡ Normal</option>
                        <option value="Low" className="bg-white text-slate-600 font-medium">🌱 Low</option>
                      </select>
                    </td>

                    {/* Progress slider bar */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span>{t.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${t.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                            style={{ width: `${t.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Timeline dates */}
                    <td className="px-4 py-4 font-mono text-[10px] text-slate-500">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>{t.startDate}</span>
                        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>{t.endDate}</span>
                      </div>
                    </td>

                    {/* Actions bar */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {t.attachmentUrl && (
                          <a 
                            href={t.attachmentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-all"
                            title="Open Drive Document"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button 
                          onClick={() => openEditModal(t)}
                          className="p-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-all"
                          title="Edit task parameters"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => onDeleteTask(t.id)}
                          className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all"
                          title="Delete control task"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= ADD TASK MODAL ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-20">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Create New Control Task</h3>
                <p className="text-xs text-slate-500 mt-0.5">Definisikan parameter pekerjaan, tim penanggung jawab, serta alur workflow & aktivitas</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-900 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddTaskSubmit} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: Task Form Parameters */}
                <div className="lg:col-span-7 space-y-4">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WBS Code</label>
                      <input 
                        type="text" 
                        value={newWbs} 
                        onChange={e => setNewWbs(e.target.value)} 
                        placeholder="e.g. 1.1 or 2.3.1"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Task Title</label>
                      <input 
                        type="text" 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)} 
                        placeholder="e.g. Concrete slab foundations pouring"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                      <select 
                        value={newStatus} 
                        onChange={e => {
                          const stat = e.target.value as TaskStatus;
                          setNewStatus(stat);
                          if (stat === 'Completed') setNewProgress(100);
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                        <span>Priority</span>
                        {newPriority && (
                          <button 
                            type="button" 
                            onClick={() => setNewPriority('')}
                            className="text-[10px] text-rose-600 hover:underline normal-case font-normal"
                          >
                            Clear Priority
                          </button>
                        )}
                      </label>
                      <select 
                        value={newPriority} 
                        onChange={e => setNewPriority(e.target.value as TaskPriority | '')}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      >
                        <option value="">-- Clear (Tanpa Priority) --</option>
                        <option value="Urgent">🔥 Urgent</option>
                        <option value="High">⚠️ High</option>
                        <option value="Normal">⚡ Normal</option>
                        <option value="Low">🌱 Low</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Progress (%)</label>
                      <input 
                        type="number" 
                        min="0" max="100" 
                        value={newProgress} 
                        onChange={e => setNewProgress(Number(e.target.value))} 
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                      <input 
                        type="date" 
                        value={newStart} 
                        onChange={e => setNewStart(e.target.value)} 
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                      <input 
                        type="date" 
                        value={newEnd} 
                        onChange={e => setNewEnd(e.target.value)} 
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Assignees selector list */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                      <UserPlus className="h-3.5 w-3.5" />
                      Assign Team Resources
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      {teamMembers.length === 0 ? (
                        <span className="text-[10px] text-slate-400">No team members registered. Please add team members in the side panel first.</span>
                      ) : (
                        teamMembers.map(m => {
                          const isAssigned = newAssignees.includes(m.email);
                          return (
                            <div 
                              key={m.email}
                              onClick={() => toggleAssignee(m.email, false)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 cursor-pointer transition-all ${
                                isAssigned 
                                  ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <img src={m.avatarUrl} alt={m.name} className="h-4 w-4 rounded-full" />
                              <span className="text-[10px] font-semibold">{m.name}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Predecessor link helper */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Predecessor WBS or ID (Comma-separated)</label>
                    <input 
                      type="text" 
                      value={newPredecessors.join(',')} 
                      onChange={e => setNewPredecessors(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} 
                      placeholder="e.g. WBS_1, WBS_2 or task code values"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes / Scope details</label>
                    <textarea 
                      value={newNotes} 
                      onChange={e => setNewNotes(e.target.value)} 
                      placeholder="Detail work scopes, engineering bounds, or compliance factors..."
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none"
                    />
                  </div>

                  {/* Subtasks Section */}
                  <SubtasksEditor
                    subtasks={newSubtasks}
                    onChange={setNewSubtasks}
                    teamMembers={teamMembers}
                  />

                  {/* Checklists Section */}
                  <ChecklistsEditor
                    checklists={newChecklists}
                    onChange={setNewChecklists}
                    teamMembers={teamMembers}
                  />

                </div>

                {/* Right Column: Workflow Pipeline & Activity Communication Feed */}
                <div className="lg:col-span-5">
                  <TaskActivityAndWorkflow
                    status={newStatus}
                    onStatusChange={(stat) => {
                      setNewStatus(stat);
                      if (stat === 'Completed') setNewProgress(100);
                    }}
                    activities={newActivities}
                    onAddActivity={(item) => setNewActivities(prev => [item, ...prev])}
                    teamMembers={teamMembers}
                    currentUserName="You"
                    checklists={newChecklists}
                    onChecklistsChange={setNewChecklists}
                  />
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-md"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT TASK MODAL ================= */}
      {isEditModalOpen && editingTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-20">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Modify Control Task: {editingTask.id}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Edit parameter pekerjaan, alur status workflow, dan diskusi komunikasi aktivitas</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-900 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: Form Parameters */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {isEditingParent && (
                    <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 text-[11px] p-3 rounded-xl flex items-start gap-2.5 leading-relaxed">
                      <AlertTriangle className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Summary Rollup Task (Auto-Scheduled):</span> This task is a parent WBS element. Start/end dates, duration, progress, and status are automatically calculated from its direct sub-tasks.
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WBS Code</label>
                      <input 
                        type="text" 
                        value={editingTask.wbs} 
                        onChange={e => setEditingTask({ ...editingTask, wbs: e.target.value })} 
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Task Title</label>
                      <input 
                        type="text" 
                        value={editingTask.name} 
                        onChange={e => setEditingTask({ ...editingTask, name: e.target.value })} 
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                      <select 
                        value={editingTask.status === 'Not Started' ? 'To Do' : editingTask.status} 
                        onChange={e => {
                          const stat = e.target.value as TaskStatus;
                          setEditingTask({ 
                            ...editingTask, 
                            status: stat, 
                            progress: stat === 'Completed' ? 100 : editingTask.progress 
                          });
                        }}
                        disabled={isEditingParent}
                        className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-xs ${isEditingParent ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                        <span>Priority</span>
                        {editingTask.priority && (
                          <button 
                            type="button" 
                            onClick={() => setEditingTask({ ...editingTask, priority: '' })}
                            className="text-[10px] text-rose-600 hover:underline normal-case font-normal"
                          >
                            Clear Priority
                          </button>
                        )}
                      </label>
                      <select 
                        value={editingTask.priority || ''} 
                        onChange={e => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority | '' })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      >
                        <option value="">-- Clear (Tanpa Priority) --</option>
                        <option value="Urgent">🔥 Urgent</option>
                        <option value="High">⚠️ High</option>
                        <option value="Normal">⚡ Normal</option>
                        <option value="Low">🌱 Low</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Progress (%)</label>
                      <input 
                        type="number" 
                        min="0" max="100" 
                        value={editingTask.progress} 
                        onChange={e => setEditingTask({ ...editingTask, progress: Number(e.target.value) })} 
                        disabled={isEditingParent}
                        className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono ${isEditingParent ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                      <input 
                        type="date" 
                        value={editingTask.startDate} 
                        onChange={e => setEditingTask({ ...editingTask, startDate: e.target.value })} 
                        disabled={isEditingParent}
                        className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono ${isEditingParent ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                      <input 
                        type="date" 
                        value={editingTask.endDate} 
                        onChange={e => setEditingTask({ ...editingTask, endDate: e.target.value })} 
                        disabled={isEditingParent}
                        className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono ${isEditingParent ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Assignees edit stack */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                      <UserPlus className="h-3.5 w-3.5" />
                      Assign Team Resources
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      {teamMembers.length === 0 ? (
                        <span className="text-[10px] text-slate-400">No team members registered.</span>
                      ) : (
                        teamMembers.map(m => {
                          const isAssigned = (editingTask.assignees || []).includes(m.email);
                          return (
                            <div 
                              key={m.email}
                              onClick={() => toggleAssignee(m.email, true)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 cursor-pointer transition-all ${
                                isAssigned 
                                  ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <img src={m.avatarUrl} alt={m.name} className="h-4 w-4 rounded-full" />
                              <span className="text-[10px] font-semibold">{m.name}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Predecessor WBS or ID (Comma-separated)</label>
                    <input 
                      type="text" 
                      value={editingTask.predecessors.join(',')} 
                      onChange={e => setEditingTask({ ...editingTask, predecessors: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} 
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes / Scope details</label>
                    <textarea 
                      value={editingTask.notes} 
                      onChange={e => setEditingTask({ ...editingTask, notes: e.target.value })} 
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none"
                    />
                  </div>

                  {/* Subtasks Section */}
                  <SubtasksEditor
                    subtasks={editingTask.subtasks || []}
                    onChange={subs => setEditingTask({ ...editingTask, subtasks: subs })}
                    teamMembers={teamMembers}
                  />

                  {/* Checklists Section */}
                  <ChecklistsEditor
                    checklists={editingTask.checklists || []}
                    onChange={cls => setEditingTask({ ...editingTask, checklists: cls })}
                    teamMembers={teamMembers}
                  />

                </div>

                {/* Right Column: Workflow Pipeline & Activity Feed */}
                <div className="lg:col-span-5">
                  <TaskActivityAndWorkflow
                    status={editingTask.status}
                    onStatusChange={(stat) => setEditingTask({
                      ...editingTask,
                      status: stat,
                      progress: stat === 'Completed' ? 100 : editingTask.progress
                    })}
                    activities={editingTask.activities || []}
                    onAddActivity={(item) => setEditingTask({
                      ...editingTask,
                      activities: [item, ...(editingTask.activities || [])]
                    })}
                    checklists={editingTask.checklists || []}
                    onChecklistsChange={(cls) => setEditingTask({
                      ...editingTask,
                      checklists: cls
                    })}
                    teamMembers={teamMembers}
                    currentUserName="You"
                  />
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
