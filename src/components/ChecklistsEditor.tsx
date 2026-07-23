import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  UserPlus, 
  ChevronDown, 
  ChevronUp,
  X,
  Check,
  User
} from 'lucide-react';
import { ChecklistGroup, ChecklistItem, TeamMember } from '../types';

interface ChecklistsEditorProps {
  checklists: ChecklistGroup[];
  onChange: (checklists: ChecklistGroup[]) => void;
  teamMembers?: TeamMember[];
  className?: string;
}

export default function ChecklistsEditor({
  checklists = [],
  onChange,
  teamMembers = [],
  className = ''
}: ChecklistsEditorProps) {
  const [hideCompleted, setHideCompleted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  
  // State for adding new item per group
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({});
  const [newItemAssignees, setNewItemAssignees] = useState<Record<string, string>>({});
  const [addingGroupIds, setAddingGroupIds] = useState<Record<string, boolean>>({});

  // Ensure there is at least one group if user starts interacting
  const activeChecklists = checklists.length > 0 ? checklists : [];

  // Total counts across all checklists
  const allItems = activeChecklists.flatMap(g => g.items || []);
  const openCount = allItems.filter(i => !i.completed).length;
  const completedCount = allItems.filter(i => i.completed).length;
  const totalCount = allItems.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAddChecklistGroup = () => {
    const newGroup: ChecklistGroup = {
      id: 'cl-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: 'Checklist',
      items: []
    };
    onChange([...activeChecklists, newGroup]);
  };

  const handleRemoveChecklistGroup = (groupId: string) => {
    const updated = activeChecklists.filter(g => g.id !== groupId);
    onChange(updated);
  };

  const handleUpdateGroupTitle = (groupId: string, newTitle: string) => {
    const updated = activeChecklists.map(g => 
      g.id === groupId ? { ...g, title: newTitle } : g
    );
    onChange(updated);
  };

  const handleToggleItem = (groupId: string, itemId: string) => {
    const updated = activeChecklists.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        items: g.items.map(item => 
          item.id === itemId ? { ...item, completed: !item.completed } : item
        )
      };
    });
    onChange(updated);
  };

  const handleRemoveItem = (groupId: string, itemId: string) => {
    const updated = activeChecklists.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        items: g.items.filter(item => item.id !== itemId)
      };
    });
    onChange(updated);
  };

  const handleUpdateItem = (groupId: string, itemId: string, updates: Partial<ChecklistItem>) => {
    const updated = activeChecklists.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        items: g.items.map(item => 
          item.id === itemId ? { ...item, ...updates } : item
        )
      };
    });
    onChange(updated);
  };

  const handleAddItem = (groupId: string) => {
    const title = (newItemTitles[groupId] || '').trim();
    if (!title) return;

    const newItem: ChecklistItem = {
      id: 'cli-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title,
      completed: false,
      assignee: newItemAssignees[groupId] || undefined
    };

    const updated = activeChecklists.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        items: [...g.items, newItem]
      };
    });

    onChange(updated);

    // Reset inputs for this group
    setNewItemTitles(prev => ({ ...prev, [groupId]: '' }));
    setNewItemAssignees(prev => ({ ...prev, [groupId]: '' }));
  };

  return (
    <div className={`space-y-3 font-sans ${className}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 cursor-pointer select-none group"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-slate-800 transition-colors" />
          ) : (
            <ChevronUp className="h-4 w-4 text-slate-500 group-hover:text-slate-800 transition-colors" />
          )}
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
            Checklists
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {openCount} open
          </span>
          {/* Mini progress bar */}
          <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden ml-1">
            <div 
              className="h-full bg-slate-800 transition-all duration-300" 
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {activeChecklists.length === 0 && (
          <button
            type="button"
            onClick={handleAddChecklistGroup}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add checklist
          </button>
        )}
      </div>

      {/* Main Container when expanded */}
      {isExpanded && (
        <div className="space-y-3">
          {activeChecklists.length === 0 ? (
            <div 
              onClick={handleAddChecklistGroup}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-indigo-50/20"
            >
              <p className="text-xs text-slate-500 font-medium">No checklist added yet.</p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 mt-1">
                <Plus className="h-3.5 w-3.5" />
                Click to add a Checklist
              </span>
            </div>
          ) : (
            activeChecklists.map((group) => {
              const visibleItems = hideCompleted 
                ? group.items.filter(i => !i.completed)
                : group.items;

              return (
                <div 
                  key={group.id} 
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3"
                >
                  {/* Group Card Header */}
                  <div className="flex items-center justify-between group/hdr">
                    <input
                      type="text"
                      value={group.title}
                      onChange={e => handleUpdateGroupTitle(group.id, e.target.value)}
                      className="text-xs font-extrabold text-slate-800 bg-transparent focus:outline-none focus:bg-slate-50 focus:ring-1 focus:ring-indigo-300 rounded px-1.5 py-0.5"
                      placeholder="Checklist Title"
                    />
                    {activeChecklists.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistGroup(group.id)}
                        className="text-slate-300 hover:text-rose-500 opacity-0 group-hover/hdr:opacity-100 transition-all p-1"
                        title="Delete this checklist"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Checklist Items List */}
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const assignedMember = teamMembers.find(m => m.email === item.assignee);

                      return (
                        <div 
                          key={item.id}
                          className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 group transition-colors"
                        >
                          {/* Left: Checkbox & Item Title */}
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleItem(group.id, item.id)}
                              className="flex-shrink-0 transition-transform active:scale-95"
                            >
                              {item.completed ? (
                                <div className="h-4 w-4 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-xs">
                                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="h-4 w-4 rounded-full border border-slate-300 hover:border-slate-500 transition-colors" />
                              )}
                            </button>

                            <input
                              type="text"
                              value={item.title}
                              onChange={e => handleUpdateItem(group.id, item.id, { title: e.target.value })}
                              className={`text-xs font-medium w-full bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-300 rounded px-1.5 py-0.5 ${
                                item.completed 
                                  ? 'line-through text-slate-400' 
                                  : 'text-slate-700'
                              }`}
                            />
                          </div>

                          {/* Right: Assignee & Delete */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Assignee button / select */}
                            <div className="relative flex items-center">
                              <select
                                value={item.assignee || ''}
                                onChange={e => handleUpdateItem(group.id, item.id, { assignee: e.target.value })}
                                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                                title={assignedMember ? `Assigned to ${assignedMember.name}` : 'Assign member'}
                              >
                                <option value="">Unassigned</option>
                                {teamMembers.map(m => (
                                  <option key={m.email} value={m.email}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>

                              {assignedMember ? (
                                <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                                  <img 
                                    src={assignedMember.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${assignedMember.email}`} 
                                    alt={assignedMember.name}
                                    className="h-3.5 w-3.5 rounded-full"
                                  />
                                  <span className="max-w-[70px] truncate">{assignedMember.name.split(' ')[0]}</span>
                                </div>
                              ) : (
                                <button 
                                  type="button"
                                  className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Delete item */}
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(group.id, item.id)}
                              className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                              title="Delete item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add item row inside card */}
                    <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Plus className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="Add item"
                          value={newItemTitles[group.id] || ''}
                          onChange={e => setNewItemTitles(prev => ({ ...prev, [group.id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddItem(group.id);
                            }
                          }}
                          className="text-xs font-medium text-slate-700 placeholder-slate-400 w-full bg-transparent focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Assignee select for new item */}
                        <div className="relative flex items-center">
                          <select
                            value={newItemAssignees[group.id] || ''}
                            onChange={e => setNewItemAssignees(prev => ({ ...prev, [group.id]: e.target.value }))}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                            title="Assign member before adding"
                          >
                            <option value="">Unassigned</option>
                            {teamMembers.map(m => (
                              <option key={m.email} value={m.email}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                          
                          {newItemAssignees[group.id] ? (
                            <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                              <span className="max-w-[70px] truncate">
                                {teamMembers.find(m => m.email === newItemAssignees[group.id])?.name.split(' ')[0]}
                              </span>
                            </div>
                          ) : (
                            <button 
                              type="button"
                              className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Add button if user has typed something */}
                        {newItemTitles[group.id]?.trim() && (
                          <button
                            type="button"
                            onClick={() => handleAddItem(group.id)}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-0.5 bg-indigo-50 rounded"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Card Footer Actions */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1 px-1">
            <button
              type="button"
              onClick={() => setHideCompleted(!hideCompleted)}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors"
            >
              {hideCompleted ? (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Show completed ({completedCount})
                </>
              ) : (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Hide completed
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleAddChecklistGroup}
              className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 transition-colors font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Add checklist
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
