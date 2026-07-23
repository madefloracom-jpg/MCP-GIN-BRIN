/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  AlertTriangle,
  ClipboardList,
  CheckCircle,
  HelpCircle,
  Clock,
  ListCheck,
  ChevronDown,
  ChevronUp,
  X,
  MessageSquare,
  Activity
} from 'lucide-react';
import { Task, TaskStatus, TeamMember, TaskActivityItem } from '../types';
import SubtasksEditor from './SubtasksEditor';
import TaskActivityAndWorkflow from './TaskActivityAndWorkflow';

interface KanbanBoardProps {
  tasks: Task[];
  teamMembers: TeamMember[];
  onUpdateTask: (task: Task) => void;
}

const COLUMNS: TaskStatus[] = ['To Do', 'In Progress', 'Completed'];

export default function KanbanBoard({ tasks, teamMembers, onUpdateTask }: KanbanBoardProps) {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [activityModalTask, setActivityModalTask] = useState<Task | null>(null);
  
  // Categorize tasks into columns
  const columnsData = useMemo(() => {
    const data: Record<string, { tasks: Task[]; budget: number }> = {
      'To Do': { tasks: [], budget: 0 },
      'In Progress': { tasks: [], budget: 0 },
      'Completed': { tasks: [], budget: 0 }
    };

    tasks.forEach(t => {
      const statusKey = (t.status === 'Not Started' || !t.status) ? 'To Do' : t.status;
      if (data[statusKey] !== undefined) {
        data[statusKey].tasks.push(t);
        data[statusKey].budget += t.budget || 0;
      } else {
        // Fallback for unknown status
        data['To Do'].tasks.push(t);
        data['To Do'].budget += t.budget || 0;
      }
    });

    // Sort tasks in each column by WBS code
    COLUMNS.forEach(col => {
      data[col].tasks.sort((a, b) => a.wbs.localeCompare(b.wbs, undefined, { numeric: true, sensitivity: 'base' }));
    });

    return data;
  }, [tasks]);

  // Handle shifting cards left/right
  const shiftStatus = (task: Task, direction: 'left' | 'right') => {
    const currentIndex = COLUMNS.indexOf(task.status);
    let nextIndex = currentIndex;
    
    if (direction === 'left' && currentIndex > 0) {
      nextIndex = currentIndex - 1;
    } else if (direction === 'right' && currentIndex < COLUMNS.length - 1) {
      nextIndex = currentIndex + 1;
    }

    if (nextIndex !== currentIndex && nextIndex !== -1) {
      const nextStatus = COLUMNS[nextIndex];
      const newAct: TaskActivityItem = {
        id: 'act_shift_' + Date.now(),
        type: 'status_change',
        user: 'You',
        timestamp: 'Just now',
        fromStatus: task.status,
        toStatus: nextStatus
      };

      onUpdateTask({
        ...task,
        status: nextStatus,
        progress: nextStatus === 'Completed' ? 100 : task.progress,
        activities: [newAct, ...(task.activities || [])]
      });
    }
  };

  const getHeaderIcon = (status: TaskStatus) => {
    switch (status) {
      case 'To Do':
      case 'Not Started': return <ClipboardList className="h-4 w-4 text-slate-400" />;
      case 'In Progress': return <Clock className="h-4 w-4 text-blue-500 animate-spin" style={{ animationDuration: '4s' }} />;
      case 'Completed': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      default: return <ClipboardList className="h-4 w-4 text-slate-400" />;
    }
  };

  const getHeaderColor = (status: TaskStatus) => {
    switch (status) {
      case 'To Do':
      case 'Not Started': return 'border-t-slate-400 bg-slate-100/60 text-slate-800';
      case 'In Progress': return 'border-t-blue-500 bg-blue-50/40 text-blue-900';
      case 'Completed': return 'border-t-emerald-500 bg-emerald-50/40 text-emerald-900';
      default: return 'border-t-slate-400 bg-slate-100/60 text-slate-800';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-x-auto pb-4">
      
      {COLUMNS.map((colName) => {
        const { tasks: colTasks, budget: colBudget } = columnsData[colName];
        return (
          <div 
            key={colName}
            className="flex flex-col rounded-xl bg-slate-50 border border-slate-200 min-h-[60vh] max-h-[75vh]"
          >
            {/* Column Header */}
            <div className={`p-4 border-t-2 rounded-t-xl border-b border-slate-200/60 flex items-center justify-between ${getHeaderColor(colName)}`}>
              <div className="flex items-center gap-2 min-w-0">
                {getHeaderIcon(colName)}
                <h3 className="font-bold text-xs truncate">{colName}</h3>
                <span className="bg-slate-200/80 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono">
                  {colTasks.length}
                </span>
              </div>
            </div>

            {/* Cards Scroller */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {colTasks.length === 0 ? (
                <div className="h-28 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-[10px] text-center px-4 font-medium">
                  Drop tasks here or change status to populate
                </div>
              ) : (
                colTasks.map(t => (
                  <div 
                    key={t.id}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition-all group flex flex-col gap-2.5"
                  >
                    {/* Title and WBS */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                        {t.wbs}
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {t.priority && (
                          <span className={`text-[8px] rounded px-1.5 py-0.5 border font-bold ${
                            t.priority === 'Urgent' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            t.priority === 'High' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            t.priority === 'Normal' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {t.priority === 'Urgent' ? '🔥 Urgent' :
                             t.priority === 'High' ? '⚠️ High' :
                             t.priority === 'Normal' ? '⚡ Normal' : '🌱 Low'}
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="font-bold text-[11.5px] text-slate-800 leading-normal line-clamp-2">
                      {t.name}
                    </h4>

                    {/* Progress details */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
                        <span>Progress</span>
                        <span>{t.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${colName === 'Completed' ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                          style={{ width: `${t.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Metadata indicators */}
                    <div className="flex items-center justify-between text-[9px] text-slate-500 font-medium font-mono pt-1 border-t border-slate-50">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        Deadline: {t.endDate ? t.endDate : '--/--'}
                      </span>

                      {/* Subtask & Activity badge buttons */}
                      {(() => {
                        const subs = t.subtasks || [];
                        const subCompleted = subs.filter(s => s.completed).length;

                        const activitiesCount = t.activities?.length || 0;
                        const isExpanded = expandedCardId === t.id;

                        return (
                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            {/* Activity Badge button */}
                            <button
                              type="button"
                              onClick={() => setActivityModalTask(t)}
                              className={`flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded border transition-all ${
                                activitiesCount > 0 
                                  ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-2xs' 
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                              title="Open Task Activity & Workflow Panel"
                            >
                              <MessageSquare className="h-3 w-3 text-indigo-300" />
                              <span>{activitiesCount === 0 ? '+ Activity' : `${activitiesCount} Act`}</span>
                            </button>

                            {/* Subtask Badge if present */}
                            {subs.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedCardId(isExpanded ? null : t.id)}
                                className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition-all"
                                title="Toggle Subtasks"
                              >
                                <ListCheck className="h-3 w-3 text-indigo-500" />
                                <span>{subCompleted}/{subs.length}</span>
                                {isExpanded ? (
                                  <ChevronUp className="h-2.5 w-2.5 ml-0.5" />
                                ) : (
                                  <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Inline Expandable Editors for Subtasks & Activity */}
                    {expandedCardId === t.id && (
                      <div className="pt-3 border-t border-slate-100 space-y-4">
                        <SubtasksEditor
                          subtasks={t.subtasks || []}
                          onChange={updatedSubs => onUpdateTask({ ...t, subtasks: updatedSubs })}
                          teamMembers={teamMembers}
                        />

                        <div className="pt-3 border-t border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                              <Activity className="h-3.5 w-3.5 text-indigo-600" />
                              Workflow Activity & Communication
                            </span>
                            <button 
                              type="button" 
                              onClick={() => setActivityModalTask(t)}
                              className="text-[10px] text-indigo-600 hover:underline font-semibold"
                            >
                              Full View &rarr;
                            </button>
                          </div>
                          <TaskActivityAndWorkflow
                            status={t.status}
                            onStatusChange={(newStat) => {
                              const act: TaskActivityItem = {
                                id: 'act_' + Date.now(),
                                type: 'status_change',
                                user: 'You',
                                timestamp: 'Just now',
                                fromStatus: t.status,
                                toStatus: newStat
                              };
                              onUpdateTask({
                                ...t,
                                status: newStat,
                                progress: newStat === 'Completed' ? 100 : t.progress,
                                activities: [act, ...(t.activities || [])]
                              });
                            }}
                            activities={t.activities || []}
                            onAddActivity={(item) => {
                              onUpdateTask({
                                ...t,
                                activities: [item, ...(t.activities || [])]
                              });
                            }}
                            checklists={t.checklists || []}
                            onChecklistsChange={(updatedCls) => {
                              onUpdateTask({
                                ...t,
                                checklists: updatedCls
                              });
                            }}
                            teamMembers={teamMembers}
                            currentUserName="You"
                          />
                        </div>
                      </div>
                    )}

                    {/* Assignees list & Shifting buttons */}
                    <div className="flex items-center justify-between pt-1">
                      
                      {/* Avatar stack */}
                      <div className="flex items-center -space-x-1.5">
                        {t.assignees.length === 0 ? (
                          <span className="text-[8px] text-slate-400">Unassigned</span>
                        ) : (
                          t.assignees.slice(0, 3).map((email, idx) => {
                            const m = teamMembers.find(mem => mem.email === email);
                            return (
                              <img 
                                key={idx}
                                src={m?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${email}`}
                                alt={m?.name || email}
                                title={m?.name || email}
                                className="h-4.5 w-4.5 rounded-full ring-2 ring-white object-cover"
                              />
                            );
                          })
                        )}
                        {t.assignees.length > 3 && (
                          <span className="text-[8px] font-bold text-slate-500 bg-slate-100 h-4.5 w-4.5 rounded-full flex items-center justify-center border border-white">
                            +{t.assignees.length - 3}
                          </span>
                        )}
                      </div>

                      {/* Transition controls */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button 
                          onClick={() => shiftStatus(t, 'left')}
                          disabled={colName === COLUMNS[0]}
                          className="p-1 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded disabled:opacity-30 disabled:hover:bg-slate-50 transition-all border border-slate-200/50"
                          title="Move Status Left"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </button>
                        <button 
                          onClick={() => shiftStatus(t, 'right')}
                          disabled={colName === COLUMNS[COLUMNS.length - 1]}
                          className="p-1 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded disabled:opacity-30 disabled:hover:bg-slate-50 transition-all border border-slate-200/50"
                          title="Move Status Right"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>

                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}

      {/* ================= WORKFLOW ACTIVITY MODAL ================= */}
      {activityModalTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded border border-slate-300/60">
                      {activityModalTask.wbs}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900">{activityModalTask.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Workflow Pipeline Stage, Execution Progress & Activity Communication Feed</p>
                </div>
              </div>
              <button 
                onClick={() => setActivityModalTask(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: Task Context & Quick Controls */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Workflow Task Summary</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                        <span className="text-slate-400 block text-[10px] font-medium">Status Stage</span>
                        <span className="font-bold text-slate-800 text-xs mt-0.5 block">{activityModalTask.status}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                        <span className="text-slate-400 block text-[10px] font-medium">Progress</span>
                        <span className="font-bold text-slate-800 text-xs mt-0.5 block">{activityModalTask.progress}%</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                        <span className="text-slate-400 block text-[10px] font-medium">Priority</span>
                        <span className="font-bold text-slate-800 text-xs mt-0.5 block">{activityModalTask.priority || 'Normal'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                        <span className="text-slate-400 block text-[10px] font-medium">Target Completion</span>
                        <span className="font-bold text-slate-800 text-xs mt-0.5 block">{activityModalTask.endDate || '-'}</span>
                      </div>
                    </div>
                    {activityModalTask.notes && (
                      <div className="pt-2 border-t border-slate-200/60">
                        <span className="text-slate-400 block text-[10px] font-medium">Scope / Engineering Details</span>
                        <p className="text-xs text-slate-700 mt-1 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200/60">{activityModalTask.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Subtasks editor in modal */}
                  <SubtasksEditor
                    subtasks={activityModalTask.subtasks || []}
                    onChange={(updatedSubs) => {
                      const updated = { ...activityModalTask, subtasks: updatedSubs };
                      setActivityModalTask(updated);
                      onUpdateTask(updated);
                    }}
                    teamMembers={teamMembers}
                  />
                </div>

                {/* Right Column: Workflow Pipeline & Activity Feed */}
                <div className="lg:col-span-6">
                  <TaskActivityAndWorkflow
                    status={activityModalTask.status}
                    onStatusChange={(newStat) => {
                      const act: TaskActivityItem = {
                        id: 'act_' + Date.now(),
                        type: 'status_change',
                        user: 'You',
                        timestamp: 'Just now',
                        fromStatus: activityModalTask.status,
                        toStatus: newStat
                      };
                      const updated = {
                        ...activityModalTask,
                        status: newStat,
                        progress: newStat === 'Completed' ? 100 : activityModalTask.progress,
                        activities: [act, ...(activityModalTask.activities || [])]
                      };
                      setActivityModalTask(updated);
                      onUpdateTask(updated);
                    }}
                    activities={activityModalTask.activities || []}
                    onAddActivity={(item) => {
                      const updated = {
                        ...activityModalTask,
                        activities: [item, ...(activityModalTask.activities || [])]
                      };
                      setActivityModalTask(updated);
                      onUpdateTask(updated);
                    }}
                    checklists={activityModalTask.checklists || []}
                    onChecklistsChange={(updatedCls) => {
                      const updated = {
                        ...activityModalTask,
                        checklists: updatedCls
                      };
                      setActivityModalTask(updated);
                      onUpdateTask(updated);
                    }}
                    teamMembers={teamMembers}
                    currentUserName="You"
                  />
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setActivityModalTask(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-xs"
              >
                Close Panel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
