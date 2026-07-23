/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Calendar, Clock, AlertTriangle, Paperclip } from 'lucide-react';
import { Task, TeamMember } from '../types';

interface GanttChartProps {
  tasks: Task[];
  teamMembers: TeamMember[];
}

export default function GanttChart({ tasks, teamMembers }: GanttChartProps) {
  
  // Sort tasks by WBS
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => a.wbs.localeCompare(b.wbs, undefined, { numeric: true, sensitivity: 'base' }));
  }, [tasks]);

  // Determine Gantt Chart Timeline Limits (Earliest Start, Latest End)
  const timelineBounds = useMemo(() => {
    let minDate = new Date();
    minDate.setDate(minDate.getDate() - 7); // Default start 1 week ago
    
    let maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // Default end 1 month from now

    let hasValidDates = false;

    tasks.forEach(t => {
      if (t.startDate) {
        const start = new Date(t.startDate);
        if (!hasValidDates || start < minDate) {
          minDate = start;
          hasValidDates = true;
        }
      }
      if (t.endDate) {
        const end = new Date(t.endDate);
        if (!hasValidDates || end > maxDate) {
          maxDate = end;
          hasValidDates = true;
        }
      }
    });

    // Pad limits slightly for spacing
    minDate = new Date(minDate.getTime() - 3 * 24 * 60 * 60 * 1000); // Pad 3 days before
    maxDate = new Date(maxDate.getTime() + 5 * 24 * 60 * 60 * 1000); // Pad 5 days after

    return { minDate, maxDate };
  }, [tasks]);

  // Compute scale timeline ticks (Weekly intervals)
  const timelineTicks = useMemo(() => {
    const ticks: Date[] = [];
    let current = new Date(timelineBounds.minDate);
    
    // Set to start of week (Monday)
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    current.setDate(diff);

    while (current <= timelineBounds.maxDate) {
      ticks.push(new Date(current));
      current.setDate(current.getDate() + 7); // Increment 1 week
    }

    return ticks;
  }, [timelineBounds]);

  const totalDays = useMemo(() => {
    const { minDate, maxDate } = timelineBounds;
    return Math.max(1, (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
  }, [timelineBounds]);

  // Calculations for positioning Gantt timeline bars
  const getBarPosition = (startDateStr: string, endDateStr: string) => {
    if (!startDateStr || !endDateStr) return { left: 0, width: 0 };

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const chartMin = timelineBounds.minDate;

    const leftDiffDays = (start.getTime() - chartMin.getTime()) / (1000 * 60 * 60 * 24);
    const durationDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const leftPct = (leftDiffDays / totalDays) * 100;
    const widthPct = (durationDays / totalDays) * 100;

    return {
      left: `${Math.max(0, Math.min(100, leftPct))}%`,
      width: `${Math.max(0.5, Math.min(100 - leftPct, widthPct))}%`
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-500 border-emerald-600';
      case 'In Progress': return 'bg-blue-500 border-blue-600';
      default: return 'bg-slate-400 border-slate-500';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      
      {/* Header Info */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm text-slate-800">Project Master Timeline (Gantt Chart)</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Chronological sequencing, predecessors tracking, and durations breakdown</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-mono font-bold">
          <span className="flex items-center gap-1.5 text-slate-500"><span className="h-2.5 w-2.5 bg-slate-400 rounded-sm"></span> To Do</span>
          <span className="flex items-center gap-1.5 text-blue-600"><span className="h-2.5 w-2.5 bg-blue-500 rounded-sm"></span> In Progress</span>
          <span className="flex items-center gap-1.5 text-emerald-600"><span className="h-2.5 w-2.5 bg-emerald-500 rounded-sm"></span> Completed</span>
        </div>
      </div>

      {/* Gantt Grid Panel */}
      <div className="flex flex-row overflow-x-auto">
        
        {/* Left Side: Frozen Tasks Details Pane (w-1/3 or fixed width) */}
        <div className="w-[320px] flex-shrink-0 border-r border-slate-200 bg-white">
          
          {/* Header Row */}
          <div className="h-10 bg-slate-900 border-b border-slate-800 text-white flex items-center px-4 text-[10px] uppercase font-mono tracking-wider font-bold">
            <span className="w-16">WBS</span>
            <span className="flex-1 truncate">Task Name</span>
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-slate-150 text-xs font-semibold text-slate-700">
            {sortedTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No tasks loaded</div>
            ) : (
              sortedTasks.map(t => (
                <div key={t.id} className="h-11 flex items-center px-4 hover:bg-slate-50/50 transition-all">
                  <span className="w-16 font-mono font-bold text-slate-400 text-xs">{t.wbs}</span>
                  <div className="flex-1 truncate pr-2">
                    <span className="text-slate-800 block truncate font-bold text-[11.5px]" title={t.name}>
                      {t.name}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <span>{t.id}</span>
                      <span>•</span>
                      <span>{t.duration} Days</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Timeline Visuals Pane */}
        <div className="flex-1 min-w-[700px] bg-slate-50/10 relative">
          
          {/* Chronological Header Ticks */}
          <div className="h-10 bg-slate-900 border-b border-slate-850 text-white flex flex-row relative">
            {timelineTicks.map((tick, idx) => {
              const leftPct = ((tick.getTime() - timelineBounds.minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
              return (
                <div 
                  key={idx}
                  className="absolute top-0 bottom-0 border-l border-white/10 text-[9px] font-bold font-mono pl-1.5 pt-2 text-slate-300"
                  style={{ left: `${leftPct}%` }}
                >
                  {tick.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              );
            })}
          </div>

          {/* Grid Rows with bars */}
          <div className="divide-y divide-slate-200/80 relative">
            
            {/* Background Grid Lines helper */}
            <div className="absolute inset-0 flex flex-row pointer-events-none">
              {timelineTicks.map((tick, idx) => {
                const leftPct = ((tick.getTime() - timelineBounds.minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
                return (
                  <div 
                    key={idx} 
                    className="absolute top-0 bottom-0 border-l border-slate-200/60"
                    style={{ left: `${leftPct}%` }}
                  />
                );
              })}
            </div>

            {/* Bars */}
            {sortedTasks.length === 0 ? (
              <div className="h-28 flex items-center justify-center text-slate-400 text-xs">No timelines to render</div>
            ) : (
              sortedTasks.map(t => {
                const hasDates = t.startDate && t.endDate;
                const { left, width } = getBarPosition(t.startDate, t.endDate);
                
                return (
                  <div key={t.id} className="h-11 relative flex items-center">
                    
                    {hasDates ? (
                      <div 
                        className={`absolute h-6 rounded-lg border shadow-sm group hover:ring-2 hover:ring-slate-900 hover:ring-offset-1 cursor-pointer transition-all ${getStatusColor(t.status)}`}
                        style={{ left, width }}
                      >
                        {/* Progress inside bar */}
                        <div 
                          className="h-full bg-white/20 rounded-l-lg transition-all"
                          style={{ width: `${t.progress}%` }}
                        />

                        {/* Hover Details Card Popup */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white rounded-xl p-3 shadow-2xl border border-slate-800 z-30 w-52 opacity-0 group-hover:opacity-100 transition-opacity duration-350 pointer-events-none text-[10px] space-y-1">
                          <h5 className="font-bold text-[11px] border-b border-slate-800 pb-1 mb-1 truncate text-white">{t.name}</h5>
                          <p className="flex justify-between text-slate-400"><span>WBS:</span> <strong className="text-white">{t.wbs}</strong></p>
                          <p className="flex justify-between text-slate-400"><span>Span:</span> <strong className="text-white">{t.startDate} to {t.endDate}</strong></p>
                          <p className="flex justify-between text-slate-400"><span>Duration:</span> <strong className="text-white">{t.duration} Days</strong></p>
                          <p className="flex justify-between text-slate-400"><span>Completed:</span> <strong className="text-white">{t.progress}%</strong></p>
                          <p className="flex justify-between text-slate-400"><span>Status:</span> <strong className="text-white">{t.status}</strong></p>
                          {t.predecessors.length > 0 && (
                            <p className="flex justify-between text-slate-400"><span>Predecessors:</span> <strong className="text-white">{t.predecessors.join(', ')}</strong></p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="absolute left-4 text-[10px] text-slate-400 italic">
                        Missing Start/End Date constraints
                      </div>
                    )}

                  </div>
                );
              })
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
