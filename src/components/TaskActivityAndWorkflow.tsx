/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  SlidersHorizontal, 
  Plus, 
  ChevronDown, 
  Sparkles, 
  AtSign, 
  Paperclip, 
  MoreHorizontal, 
  Mic, 
  Send, 
  CheckCircle2, 
  Clock, 
  ListTodo, 
  ArrowRight, 
  User, 
  FileText,
  X,
  MessageSquare,
  ShieldAlert,
  CheckSquare,
  Calendar
} from 'lucide-react';
import { TaskStatus, TaskActivityItem, TeamMember, ChecklistGroup, SubtaskItem, AgendaItem } from '../types';
import ChecklistsEditor from './ChecklistsEditor';
import SubtasksEditor from './SubtasksEditor';
import AgendaEditor from './AgendaEditor';

interface TaskActivityAndWorkflowProps {
  status: TaskStatus;
  onStatusChange: (newStatus: TaskStatus) => void;
  activities: TaskActivityItem[];
  onAddActivity: (item: TaskActivityItem) => void;
  teamMembers: TeamMember[];
  currentUserName?: string;
  subtasks?: SubtaskItem[];
  onSubtasksChange?: (subtasks: SubtaskItem[]) => void;
  checklists?: ChecklistGroup[];
  onChecklistsChange?: (checklists: ChecklistGroup[]) => void;
  agendas?: AgendaItem[];
  onAgendasChange?: (agendas: AgendaItem[]) => void;
  taskTitle?: string;
  taskStartDate?: string;
  taskEndDate?: string;
  accessToken?: string | null;
  summaryContent?: React.ReactNode;
}

const STAGES: { key: TaskStatus; label: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string; dotColor: string }[] = [
  {
    key: 'To Do',
    label: 'To Do',
    icon: <ListTodo className="h-4 w-4" />,
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
    dotColor: 'bg-slate-400'
  },
  {
    key: 'In Progress',
    label: 'In Progress',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-400',
    dotColor: 'bg-blue-500'
  },
  {
    key: 'Completed',
    label: 'Complete',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-400',
    dotColor: 'bg-emerald-500'
  }
];

export default function TaskActivityAndWorkflow({
  status,
  onStatusChange,
  activities = [],
  onAddActivity,
  teamMembers,
  currentUserName = 'You',
  subtasks,
  onSubtasksChange,
  checklists,
  onChecklistsChange,
  agendas,
  onAgendasChange,
  taskTitle = 'Task Discussion',
  taskStartDate,
  taskEndDate,
  accessToken,
  summaryContent
}: TaskActivityAndWorkflowProps) {
  const activeMembers = teamMembers || [];
  // Active Tab state
  const [activeTab, setActiveTab] = useState<'activity' | 'subtasks' | 'checklists' | 'agenda'>('activity');
  const [internalSubtasks, setInternalSubtasks] = useState<SubtaskItem[]>([]);
  const [internalChecklists, setInternalChecklists] = useState<ChecklistGroup[]>([]);
  const [internalAgendas, setInternalAgendas] = useState<AgendaItem[]>([]);

  const effectiveSubtasks = subtasks !== undefined ? subtasks : internalSubtasks;
  const effectiveChecklists = checklists !== undefined ? checklists : internalChecklists;
  const effectiveAgendas = agendas !== undefined ? agendas : internalAgendas;

  const handleSubtasksChange = (updated: SubtaskItem[]) => {
    if (onSubtasksChange) {
      onSubtasksChange(updated);
    } else {
      setInternalSubtasks(updated);
    }
  };

  const handleChecklistsChange = (updated: ChecklistGroup[]) => {
    if (onChecklistsChange) {
      onChecklistsChange(updated);
    } else {
      setInternalChecklists(updated);
    }
  };

  const handleAgendasChange = (updated: AgendaItem[]) => {
    if (onAgendasChange) {
      onAgendasChange(updated);
    } else {
      setInternalAgendas(updated);
    }
  };

  const totalSubtasksCount = effectiveSubtasks.length;
  const completedSubtasksCount = effectiveSubtasks.filter(s => s.completed).length;

  const allClItems = effectiveChecklists.flatMap(g => g.items || []);
  const completedClCount = allClItems.filter(i => i.completed).length;
  const totalClCount = allClItems.length;

  const totalAgendasCount = effectiveAgendas.length;

  // Comment input state
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState<'Comment' | 'Internal Note'>('Comment');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [filterType, setFilterType] = useState<'All' | 'Comments' | 'Status'>('All');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  // Normalize current status (legacy fallback)
  const activeStatus: TaskStatus = status === 'Not Started' ? 'To Do' : status;

  // Handle stage change from workflow pipeline
  const handleStageClick = (newStatus: TaskStatus) => {
    if (newStatus === activeStatus) return;

    // Log the status change activity
    const newLog: TaskActivityItem = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: 'status_change',
      user: currentUserName,
      timestamp: '1 min',
      fromStatus: activeStatus,
      toStatus: newStatus
    };

    onStatusChange(newStatus);
    onAddActivity(newLog);
  };

  // Handle posting comment
  const handlePostComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim() && attachedFiles.length === 0) return;

    const newComment: TaskActivityItem = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: 'comment',
      user: currentUserName,
      timestamp: 'Just now',
      text: commentText.trim(),
      isInternalNote: commentType === 'Internal Note',
      attachments: attachedFiles.map(name => ({ name, url: '#' }))
    };

    onAddActivity(newComment);
    setCommentText('');
    setAttachedFiles([]);
    setShowMentionMenu(false);
  };

  // AI draft assistant helper
  const handleAiDraft = () => {
    setIsAiGenerating(true);
    setTimeout(() => {
      const aiSuggestions = [
        "Updated team on technical progress. Work proceeds on schedule.",
        "Verified engineering prerequisites and risk factor mitigations.",
        "Awaiting structural review sign-off from senior lead."
      ];
      const randomSuggestion = aiSuggestions[Math.floor(Math.random() * aiSuggestions.length)];
      setCommentText(prev => prev ? `${prev} ${randomSuggestion}` : randomSuggestion);
      setIsAiGenerating(false);
    }, 600);
  };

  // File upload simulation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const names = Array.from(e.target.files).map((f: File) => f.name);
      setAttachedFiles(prev => [...prev, ...names]);
    }
  };

  // Filtered activities
  const filteredActivities = activities.filter(act => {
    if (filterType === 'Comments' && act.type !== 'comment') return false;
    if (filterType === 'Status' && act.type !== 'status_change') return false;
    if (!searchQuery) return true;

    const q = searchQuery.toLowerCase();
    if (act.text && act.text.toLowerCase().includes(q)) return true;
    if (act.user && act.user.toLowerCase().includes(q)) return true;
    if (act.fromStatus && act.fromStatus.toLowerCase().includes(q)) return true;
    if (act.toStatus && act.toStatus.toLowerCase().includes(q)) return true;
    return false;
  });

  const pipelineCard = (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs h-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            Workflow Pipeline
          </span>
          {totalSubtasksCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('subtasks')}
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer"
              title="View & Edit Task Subtasks"
            >
              <ListTodo className="h-3 w-3" />
              <span>Subtasks {completedSubtasksCount}/{totalSubtasksCount}</span>
            </button>
          )}
          {totalClCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('checklists')}
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer"
              title="View & Edit Task Checklists"
            >
              <CheckSquare className="h-3 w-3" />
              <span>Checklists {completedClCount}/{totalClCount}</span>
            </button>
          )}
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          Click step to update status
        </span>
      </div>

      {/* Pipeline Step Bar */}
      <div className="relative flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-200/80">
        {STAGES.map((stage, idx) => {
          const isActive = activeStatus === stage.key;
          const isPassed = STAGES.findIndex(s => s.key === activeStatus) > idx;

          return (
            <React.Fragment key={stage.key}>
              <button
                type="button"
                onClick={() => handleStageClick(stage.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all relative z-10 cursor-pointer ${
                  isActive 
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-300 ring-2 ring-blue-500/20' 
                    : isPassed
                      ? 'bg-slate-200/60 text-slate-700 hover:bg-slate-200'
                      : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${isActive ? stage.dotColor : isPassed ? 'bg-slate-600' : 'bg-slate-300'}`}></span>
                <span>{stage.label}</span>
                {isActive && (
                  <span className="ml-1 text-[9px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-bold uppercase">
                    Current
                  </span>
                )}
              </button>

              {idx < STAGES.length - 1 && (
                <div className="flex items-center justify-center text-slate-300">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      
      {/* 1. TOP SECTION: Task Form Parameters / Summary (Full Width) */}
      {summaryContent && (
        <div className="w-full">
          {summaryContent}
        </div>
      )}

      {/* 2. MIDDLE SECTION: Workflow Pipeline (Full Width, directly below Task Form Parameters) */}
      <div className="w-full">
        {pipelineCard}
      </div>

      {/* 3. BOTTOM SECTION: TAB containing Activity, Subtasks, Checklists, Agenda (Full Width) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col w-full">
        
        {/* Header Tabs */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'activity'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
              <span>Activity</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700">
                {activities.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('subtasks')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'subtasks'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListTodo className="h-3.5 w-3.5 text-blue-600" />
              <span>Subtasks</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${totalSubtasksCount > 0 && completedSubtasksCount === totalSubtasksCount ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                {totalSubtasksCount > 0 ? `${completedSubtasksCount}/${totalSubtasksCount}` : '0'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('checklists')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'checklists'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
              <span>Checklists</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${totalClCount > 0 && completedClCount === totalClCount ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                {totalClCount > 0 ? `${completedClCount}/${totalClCount}` : '0'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'agenda'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              <span>Agenda</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${totalAgendasCount > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'}`}>
                {totalAgendasCount}
              </span>
            </button>
          </div>

          {activeTab === 'activity' && (
            <div className="flex items-center gap-2 text-slate-500">
              {/* Search Button */}
              <button 
                type="button" 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors ${isSearchOpen ? 'text-blue-600 bg-blue-50' : ''}`}
                title="Search Activity"
              >
                <Search className="h-4 w-4" />
              </button>

              {/* Bell notification indicator */}
              <button 
                type="button" 
                className="p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors relative"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 text-[9px] font-bold text-slate-600">0</span>
              </button>

              {/* Filter Toggle */}
              <button 
                type="button" 
                onClick={() => {
                  if (filterType === 'All') setFilterType('Comments');
                  else if (filterType === 'Comments') setFilterType('Status');
                  else setFilterType('All');
                }}
                className={`p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors flex items-center gap-1 ${filterType !== 'All' ? 'text-blue-600 bg-blue-50 font-bold text-[10px]' : ''}`}
                title="Filter Activities"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {filterType !== 'All' && <span>{filterType}</span>}
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: SUBTASKS VIEW */}
        {activeTab === 'subtasks' && (
          <div className="p-4 bg-white min-h-[220px]">
            <SubtasksEditor
              subtasks={effectiveSubtasks}
              onChange={handleSubtasksChange}
              teamMembers={teamMembers}
              className="border-0 shadow-none p-0 bg-transparent"
            />
          </div>
        )}

        {/* TAB 2: CHECKLISTS VIEW */}
        {activeTab === 'checklists' && (
          <div className="p-4 bg-white min-h-[220px]">
            <ChecklistsEditor
              checklists={effectiveChecklists}
              onChange={handleChecklistsChange}
              teamMembers={teamMembers}
            />
          </div>
        )}

        {/* TAB 3: AGENDA VIEW */}
        {activeTab === 'agenda' && (
          <div className="p-4 bg-white min-h-[220px]">
            <AgendaEditor
              agendas={effectiveAgendas}
              onChange={handleAgendasChange}
              teamMembers={teamMembers}
              taskTitle={taskTitle}
              taskStartDate={taskStartDate}
              taskEndDate={taskEndDate}
              accessToken={accessToken}
              className="border-0 shadow-none p-0 bg-transparent"
            />
          </div>
        )}

        {/* TAB 2: ACTIVITY FEED & COMMENTS VIEW */}
        {activeTab === 'activity' && (
          <>
            {/* Search Input Bar (if open) */}
        {isSearchOpen && (
          <div className="px-4 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search comments or activity..."
              className="w-full text-xs bg-transparent focus:outline-none"
              autoFocus
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Activity Feed Timeline */}
        <div className="p-5 max-h-[280px] min-h-[140px] overflow-y-auto space-y-3 bg-white">
          
          {/* Quick Checklists Summary Bar inside Activity Feed */}
          {totalClCount > 0 && (
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/70 space-y-2 mb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">Task Checklists</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                    {completedClCount}/{totalClCount} ({Math.round((completedClCount/totalClCount)*100)}%)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('checklists')}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  Edit All Checklists →
                </button>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${(completedClCount / totalClCount) * 100}%` }}
                />
              </div>

              {/* Quick toggle list (up to 3 items) */}
              <div className="space-y-1 pt-1">
                {allClItems.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => {
                        const updated = effectiveChecklists.map(g => ({
                          ...g,
                          items: (g.items || []).map(i => i.id === item.id ? { ...i, completed: e.target.checked } : i)
                        }));
                        handleChecklistsChange(updated);
                      }}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className={`truncate ${item.completed ? 'line-through text-slate-400' : 'font-medium text-slate-800'}`}>
                      {item.title}
                    </span>
                  </div>
                ))}
                {allClItems.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('checklists')}
                    className="text-[10px] text-slate-500 hover:text-slate-700 font-medium pt-0.5"
                  >
                    + {allClItems.length - 3} more checklist items...
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Agenda Summary Box (if present) */}
          {totalAgendasCount > 0 && (
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span>Agenda & Google Kalender ({totalAgendasCount})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('agenda')}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                >
                  Atur Agenda →
                </button>
              </div>

              <div className="space-y-1.5 pt-0.5">
                {effectiveAgendas.slice(0, 2).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs bg-white px-2.5 py-1.5 rounded-lg border border-blue-100 shadow-2xs">
                    <div className="truncate font-semibold text-slate-800 pr-2">
                      {item.title}
                    </div>
                    <div className="shrink-0 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {item.date} {item.startTime && `(${item.startTime})`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              <MessageSquare className="h-6 w-6 mx-auto mb-1.5 text-slate-300" />
              Belum ada aktivitas. Ubah status atau tulis komentar pertama.
            </div>
          ) : (
            filteredActivities.map((act) => {
              if (act.type === 'status_change') {
                return (
                  <div key={act.id} className="flex items-center justify-between text-xs text-slate-600 py-1 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-400 font-bold">•</span>
                      <span><strong className="text-slate-800">{act.user}</strong> changed status from</span>
                      
                      {/* From status badge */}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700">
                        <span className={`h-2 w-2 rounded-xs ${act.fromStatus === 'Completed' ? 'bg-emerald-500' : act.fromStatus === 'In Progress' ? 'bg-blue-500' : 'bg-slate-400'}`}></span>
                        {act.fromStatus === 'Completed' ? 'Complete' : act.fromStatus || 'To Do'}
                      </span>

                      <span>to</span>

                      {/* To status badge */}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700">
                        <span className={`h-2 w-2 rounded-xs ${act.toStatus === 'Completed' ? 'bg-emerald-500' : act.toStatus === 'In Progress' ? 'bg-blue-500' : 'bg-slate-400'}`}></span>
                        {act.toStatus === 'Completed' ? 'Complete' : act.toStatus || 'To Do'}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap ml-2">
                      {act.timestamp}
                    </span>
                  </div>
                );
              }

              // Comment activity
              return (
                <div key={act.id} className={`p-3 rounded-xl border text-xs space-y-1.5 ${act.isInternalNote ? 'bg-amber-50/60 border-amber-200/70' : 'bg-slate-50/80 border-slate-200/80'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px]">
                        {act.user.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-800">{act.user}</span>
                      {act.isInternalNote && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 flex items-center gap-1">
                          <ShieldAlert className="h-2.5 w-2.5" /> Internal Note
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{act.timestamp}</span>
                  </div>

                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap pl-7">
                    {act.text}
                  </p>

                  {/* Attachments if any */}
                  {act.attachments && act.attachments.length > 0 && (
                    <div className="pl-7 pt-1 flex flex-wrap gap-1.5">
                      {act.attachments.map((file, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono">
                          <Paperclip className="h-3 w-3 text-slate-400" /> {file.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ================= COMMENT INPUT BOX ================= */}
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all p-3 space-y-2">
            
            {/* Mention menu popup */}
            {showMentionMenu && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-2 max-h-36 overflow-y-auto space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">Mention Team Member</div>
                {activeMembers.map(m => (
                  <button
                    key={m.email}
                    type="button"
                    onClick={() => {
                      setCommentText(prev => `${prev} @${m.name} `);
                      setShowMentionMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg text-left text-xs"
                  >
                    <img src={m.avatarUrl} alt={m.name} className="h-4 w-4 rounded-full" />
                    <span className="font-semibold text-slate-800">{m.name}</span>
                    <span className="text-[10px] text-slate-400">({m.role})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Attached files chips */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-1 border-b border-slate-100">
                {attachedFiles.map((name, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-mono border border-blue-100">
                    <Paperclip className="h-3 w-3" />
                    {name}
                    <button 
                      type="button" 
                      onClick={() => setAttachedFiles(attachedFiles.filter((_, i) => i !== idx))}
                      className="ml-1 text-blue-400 hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Textarea */}
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handlePostComment(e);
                }
              }}
              placeholder="Write a comment... (Enter to send)"
              rows={2}
              className="w-full text-xs text-slate-800 placeholder-slate-400 resize-none focus:outline-none bg-transparent"
            />

            {/* Control Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100/80">
              
              {/* Left Side Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                
                {/* Plus Button */}
                <button
                  type="button"
                  onClick={() => setShowMentionMenu(!showMentionMenu)}
                  className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                  title="Add attachment or mention"
                >
                  <Plus className="h-4 w-4" />
                </button>

                {/* Dropdown Selector: Comment v */}
                <div className="relative">
                  <select
                    value={commentType}
                    onChange={e => setCommentType(e.target.value as any)}
                    className="appearance-none bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-xs py-1 pl-2.5 pr-6 rounded-lg border-0 cursor-pointer focus:outline-none"
                  >
                    <option value="Comment">Comment</option>
                    <option value="Internal Note">Internal Note</option>
                  </select>
                  <ChevronDown className="h-3 w-3 text-slate-500 absolute right-1.5 top-2 pointer-events-none" />
                </div>

                {/* AI Polish Button */}
                <button
                  type="button"
                  onClick={handleAiDraft}
                  disabled={isAiGenerating}
                  className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors relative group"
                  title="Generate AI Draft"
                >
                  <Sparkles className={`h-4 w-4 ${isAiGenerating ? 'animate-spin' : ''}`} />
                </button>

                {/* Mention Button */}
                <button
                  type="button"
                  onClick={() => setShowMentionMenu(!showMentionMenu)}
                  className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Mention user"
                >
                  <AtSign className="h-4 w-4" />
                </button>

                {/* File Attachment Upload */}
                <label className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                  <Paperclip className="h-4 w-4" />
                  <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                </label>

                {/* User Tag */}
                <button
                  type="button"
                  onClick={() => setShowMentionMenu(!showMentionMenu)}
                  className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  title="User tag"
                >
                  <User className="h-4 w-4" />
                </button>

                {/* More options */}
                <button
                  type="button"
                  className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  title="More options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

              </div>

              {/* Right Side Buttons */}
              <div className="flex items-center gap-1.5">
                
                {/* Voice Note / Mic Button */}
                <button
                  type="button"
                  onClick={() => setIsRecording(!isRecording)}
                  className={`p-1.5 rounded-lg transition-colors ${isRecording ? 'text-rose-600 bg-rose-50 animate-pulse' : 'text-slate-500 hover:bg-slate-100'}`}
                  title={isRecording ? 'Stop Recording' : 'Voice comment'}
                >
                  <Mic className="h-4 w-4" />
                </button>

                {/* Send Button */}
                <button
                  type="button"
                  onClick={handlePostComment}
                  disabled={!commentText.trim() && attachedFiles.length === 0}
                  className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                    commentText.trim() || attachedFiles.length > 0 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs' 
                      : 'text-slate-300 bg-slate-100 cursor-not-allowed'
                  }`}
                  title="Send Comment"
                >
                  <Send className="h-4 w-4" />
                </button>

              </div>

            </div>

          </div>
        </div>
          </>
        )}

      </div>

    </div>
  );
}
