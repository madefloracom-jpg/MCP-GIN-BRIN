import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  UserPlus, 
  Flag, 
  ChevronDown,
  X
} from 'lucide-react';
import { SubtaskItem, TaskPriority, TeamMember } from '../types';

interface SubtasksEditorProps {
  subtasks: SubtaskItem[];
  onChange: (subtasks: SubtaskItem[]) => void;
  teamMembers?: TeamMember[];
  className?: string;
}

export default function SubtasksEditor({
  subtasks = [],
  onChange,
  teamMembers = [],
  className = ''
}: SubtasksEditorProps) {
  const activeMembers = teamMembers || [];
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority | ''>('');

  const openCount = subtasks.filter(s => !s.completed).length;
  const completedCount = subtasks.filter(s => s.completed).length;

  const handleToggle = (id: string) => {
    const updated = subtasks.map(s => 
      s.id === id ? { ...s, completed: !s.completed } : s
    );
    onChange(updated);
  };

  const handleRemove = (id: string) => {
    const updated = subtasks.filter(s => s.id !== id);
    onChange(updated);
  };

  const handleUpdateSubtask = (id: string, updates: Partial<SubtaskItem>) => {
    const updated = subtasks.map(s => 
      s.id === id ? { ...s, ...updates } : s
    );
    onChange(updated);
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const newItem: SubtaskItem = {
      id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: newTitle.trim(),
      completed: false,
      assignee: newAssignee || undefined,
      priority: newPriority || undefined
    };
    onChange([...subtasks, newItem]);
    setNewTitle('');
    setNewAssignee('');
    setNewPriority('');
    setIsAdding(false);
  };

  const getPriorityBadgeClass = (priority?: TaskPriority | string) => {
    switch (priority) {
      case 'Urgent': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'High': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Normal': return 'text-sky-600 bg-sky-50 border-sky-200';
      case 'Low': return 'text-slate-600 bg-slate-50 border-slate-200';
      default: return 'text-slate-400 border-transparent';
    }
  };

  return (
    <div className={`space-y-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Subtasks
          </h4>
          <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {openCount} open {completedCount > 0 && `• ${completedCount} done`}
          </span>
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Subtask
          </button>
        )}
      </div>

      {/* Subtasks List */}
      {subtasks.length > 0 && (
        <div className="divide-y divide-slate-100">
          {subtasks.map((st) => {
            const assigneeMember = activeMembers.find(m => m.email === st.assignee);
            return (
              <div 
                key={st.id} 
                className="py-2 flex items-center justify-between gap-2 group hover:bg-slate-50/80 rounded-lg px-2 transition-colors"
              >
                {/* Left: Checkbox & Title */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(st.id)}
                    className="text-slate-400 hover:text-emerald-600 transition-colors flex-shrink-0"
                  >
                    {st.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-50" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-300 hover:text-slate-500" />
                    )}
                  </button>
                  <input
                    type="text"
                    value={st.title}
                    onChange={e => handleUpdateSubtask(st.id, { title: e.target.value })}
                    className={`text-xs font-medium w-full bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-300 rounded px-1.5 py-0.5 ${
                      st.completed ? 'line-through text-slate-400' : 'text-slate-700'
                    }`}
                  />
                </div>

                {/* Right controls: Assignee, Priority, Delete */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Assignee selector */}
                  <select
                    value={st.assignee || ''}
                    onChange={e => handleUpdateSubtask(st.id, { assignee: e.target.value })}
                    className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 cursor-pointer focus:outline-none max-w-[110px] truncate"
                  >
                    <option value="">Unassigned</option>
                    {activeMembers.map(m => (
                      <option key={m.email} value={m.email}>
                        {m.name}
                      </option>
                    ))}
                  </select>

                  {/* Priority selector */}
                  <select
                    value={st.priority || ''}
                    onChange={e => handleUpdateSubtask(st.id, { priority: e.target.value as TaskPriority | '' })}
                    className={`text-[10px] border rounded px-1.5 py-0.5 font-semibold cursor-pointer focus:outline-none ${getPriorityBadgeClass(st.priority)}`}
                  >
                    <option value="" className="bg-white text-slate-400">Clear</option>
                    <option value="Urgent" className="bg-white text-rose-600 font-bold">🔥 Urgent</option>
                    <option value="High" className="bg-white text-amber-600 font-bold">⚠️ High</option>
                    <option value="Normal" className="bg-white text-sky-600 font-medium">⚡ Normal</option>
                    <option value="Low" className="bg-white text-slate-600 font-normal">🌱 Low</option>
                  </select>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(st.id)}
                    className="text-slate-300 hover:text-rose-600 transition-colors p-1 opacity-0 group-hover:opacity-100"
                    title="Remove subtask"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline Add Form */}
      {isAdding ? (
        <div className="bg-slate-50 border border-indigo-100 rounded-xl p-2.5 space-y-2 mt-2">
          <div className="flex items-center gap-2">
            <Circle className="h-4 w-4 text-slate-300 flex-shrink-0" />
            <input
              type="text"
              placeholder="Add subtask title..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              autoFocus
              className="text-xs w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 font-medium"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Assignee select */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px]">
                <UserPlus className="h-3 w-3 text-slate-400" />
                <select
                  value={newAssignee}
                  onChange={e => setNewAssignee(e.target.value)}
                  className="bg-transparent focus:outline-none text-slate-600 font-medium cursor-pointer"
                >
                  <option value="">Assignee</option>
                  {activeMembers.map(m => (
                    <option key={m.email} value={m.email}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority select */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px]">
                <Flag className="h-3 w-3 text-slate-400" />
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as TaskPriority | '')}
                  className="bg-transparent focus:outline-none text-slate-600 font-medium cursor-pointer"
                >
                  <option value="">Priority</option>
                  <option value="Urgent">🔥 Urgent</option>
                  <option value="High">⚠️ High</option>
                  <option value="Normal">⚡ Normal</option>
                  <option value="Low">🌱 Low</option>
                </select>
              </div>
            </div>

            {/* Submit & Cancel */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setNewTitle('');
                }}
                className="px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newTitle.trim()}
                className="px-3 py-1 text-[10px] font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg transition-colors"
              >
                Save ↵
              </button>
            </div>
          </div>
        </div>
      ) : (
        subtasks.length === 0 && (
          <p className="text-[11px] text-slate-400 italic text-center py-2">
            No subtasks added yet.
          </p>
        )
      )}
    </div>
  );
}
