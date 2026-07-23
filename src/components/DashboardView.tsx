/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Users,
  Clock,
  ArrowUpRight,
  Flag
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Cell, 
  Pie 
} from 'recharts';
import { Task, Milestone, TeamMember } from '../types';

interface DashboardViewProps {
  tasks: Task[];
  milestones: Milestone[];
  teamMembers: TeamMember[];
}

export default function DashboardView({ tasks, milestones, teamMembers }: DashboardViewProps) {
  const today = useMemo(() => new Date(), []);

  // 1. Core Progress Calculations
  const progressMetrics = useMemo(() => {
    const totalTasks = tasks.length;
    if (totalTasks === 0) {
      return {
        avgProgress: 0,
        completedCount: 0,
        completedPct: 0,
        inProgressCount: 0,
        notStartedCount: 0,
        totalMilestones: 0,
        achievedMilestones: 0,
        milestonePct: 0,
        spi: 1.0
      };
    }

    let sumProgress = 0;
    let completedCount = 0;
    let inProgressCount = 0;
    let notStartedCount = 0;

    tasks.forEach(t => {
      sumProgress += t.progress || 0;
      if (t.status === 'Completed') completedCount++;
      else if (t.status === 'In Progress') inProgressCount++;
      else if (t.status === 'Not Started') notStartedCount++;
      else notStartedCount++;
    });

    const avgProgress = totalTasks > 0 ? Math.round(sumProgress / totalTasks) : 0;
    const completedPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    // Milestone metrics
    const totalMilestones = milestones.length;
    const achievedMilestones = milestones.filter(m => m.status === 'Achieved').length;
    const milestonePct = totalMilestones > 0 ? Math.round((achievedMilestones / totalMilestones) * 100) : 0;

    // Schedule Performance Index (SPI) - derived from schedule progress rate
    let totalPlannedProgress = 0;
    let totalEarnedProgress = 0;

    tasks.forEach(t => {
      totalEarnedProgress += t.progress || 0;
      
      if (t.startDate && t.endDate) {
        const start = new Date(t.startDate).getTime();
        const end = new Date(t.endDate).getTime();
        const now = today.getTime();

        if (now >= end) {
          totalPlannedProgress += 100;
        } else if (now <= start) {
          totalPlannedProgress += 0;
        } else {
          const totalDays = end - start;
          const elapsed = now - start;
          totalPlannedProgress += (elapsed / totalDays) * 100;
        }
      } else {
        if (t.status === 'Completed') totalPlannedProgress += 100;
        else if (t.status === 'In Progress') totalPlannedProgress += 50;
      }
    });

    const spi = totalPlannedProgress > 0 ? (totalEarnedProgress / totalPlannedProgress) : 1.0;

    return {
      avgProgress,
      completedCount,
      completedPct,
      inProgressCount,
      notStartedCount,
      totalMilestones,
      achievedMilestones,
      milestonePct,
      spi
    };
  }, [tasks, milestones, today]);

  // 2. S-Curve Progress Data (Target Progress vs Actual Progress)
  const sCurveProgressData = useMemo(() => {
    let minTime = Infinity;
    let maxTime = -Infinity;

    tasks.forEach(t => {
      if (t.startDate) {
        const d = new Date(t.startDate).getTime();
        if (d < minTime) minTime = d;
      }
      if (t.endDate) {
        const d = new Date(t.endDate).getTime();
        if (d > maxTime) maxTime = d;
      }
    });

    if (minTime === Infinity || maxTime === -Infinity) {
      const now = new Date();
      minTime = now.getTime() - 15 * 24 * 60 * 60 * 1000;
      maxTime = now.getTime() + 15 * 24 * 60 * 60 * 1000;
    }

    if (maxTime <= minTime) {
      maxTime = minTime + 30 * 24 * 60 * 60 * 1000;
    }

    const steps = 10;
    const dataPoints = [];
    const stepMs = (maxTime - minTime) / (steps - 1);

    for (let i = 0; i < steps; i++) {
      const dTime = minTime + i * stepMs;
      const d = new Date(dTime);
      
      let totalPlannedProgress = 0;
      let totalActualProgress = 0;
      let count = 0;

      tasks.forEach(t => {
        if (!t.startDate || !t.endDate) return;
        count++;
        const start = new Date(t.startDate).getTime();
        const end = new Date(t.endDate).getTime();
        const currentProgress = t.progress || 0;

        // Planned target progress
        let plannedPct = 0;
        if (dTime >= end) {
          plannedPct = 100;
        } else if (dTime <= start) {
          plannedPct = 0;
        } else {
          plannedPct = ((dTime - start) / (end - start)) * 100;
        }
        totalPlannedProgress += plannedPct;

        // Interpolated actual progress up to today
        let actualPct = 0;
        const todayTime = today.getTime();
        if (dTime <= start) {
          actualPct = 0;
        } else if (dTime >= todayTime) {
          actualPct = currentProgress;
        } else {
          const totalElapsed = todayTime - start;
          if (totalElapsed > 0) {
            const fraction = (dTime - start) / totalElapsed;
            actualPct = currentProgress * Math.min(1, fraction);
          } else {
            actualPct = currentProgress;
          }
        }
        totalActualProgress += actualPct;
      });

      const avgPlanned = count > 0 ? Math.round(totalPlannedProgress / count) : 0;
      const avgActual = count > 0 ? Math.round(totalActualProgress / count) : 0;

      const isPastOrToday = dTime <= today.getTime() + 24 * 60 * 60 * 1000;

      dataPoints.push({
        date: d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
        'Target Progress (%)': avgPlanned,
        ...(isPastOrToday ? { 'Aktual Progress (%)': avgActual } : {})
      });
    }

    return dataPoints;
  }, [tasks, today]);

  // 3. Task Status Distribution Pie Data
  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {
      'To Do': 0,
      'In Progress': 0,
      'Completed': 0
    };
    tasks.forEach(t => {
      const statusKey = (t.status === 'Not Started' || !t.status) ? 'To Do' : t.status;
      if (counts[statusKey] !== undefined) counts[statusKey]++;
      else counts['To Do']++;
    });
    return Object.keys(counts).map(status => ({
      name: status,
      value: counts[status]
    })).filter(item => item.value > 0);
  }, [tasks]);

  const PIE_COLORS: Record<string, string> = {
    'To Do': '#94a3b8',        // Slate Gray
    'Not Started': '#94a3b8',  // Slate Gray
    'In Progress': '#3b82f6',  // Blue
    'Completed': '#10b981'     // Emerald Green
  };

  const INDO_STATUS_NAMES: Record<string, string> = {
    'To Do': 'To Do (Belum Mulai)',
    'Not Started': 'Belum Mulai',
    'In Progress': 'Dalam Pengerjaan',
    'Completed': 'Selesai'
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Dynamic Overall Progress Banner Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 rounded-xl text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          <div className="space-y-2">
            <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono uppercase tracking-widest px-2.5 py-1 rounded border border-blue-500/30 font-bold">
              Executive Progress Summary
            </span>
            <h2 className="text-xl md:text-2xl font-black tracking-tight">Kinerja Ketercapaian Fisik Proyek</h2>
            <p className="text-slate-300 text-xs max-w-xl leading-relaxed">
              Pemantauan real-time terhadap penyelesaian paket kerja (WBS), pencapaian milestone penting, serta analisis hambatan jadwal proyek secara objektif.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 backdrop-blur-sm">
            {/* Visual Circular Progress indicator */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="32" 
                  cy="32" 
                  r="28" 
                  className="stroke-slate-800" 
                  strokeWidth="6" 
                  fill="transparent" 
                />
                <circle 
                  cx="32" 
                  cy="32" 
                  r="28" 
                  className="stroke-blue-500 transition-all duration-500" 
                  strokeWidth="6" 
                  fill="transparent" 
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressMetrics.avgProgress / 100)}`}
                />
              </svg>
              <span className="absolute text-sm font-black font-mono text-white">{progressMetrics.avgProgress}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Progress</span>
              <span className="text-lg font-extrabold text-blue-400 block mt-0.5">{progressMetrics.avgProgress}% Selesai</span>
              <span className="text-[10px] text-slate-400 block">Rata-rata kumulatif seluruh tugas</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Progress Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Physical Progress Percentage */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Rerata Progress</span>
            <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">{progressMetrics.avgProgress}%</span>
            <span className="text-[10px] text-slate-500 block mt-0.5 truncate">Fisik pekerjaan terealisasi</span>
          </div>
        </div>

        {/* Task Completion Counts */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tugas Terselesaikan</span>
            <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
              {progressMetrics.completedCount} / {tasks.length}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
              {progressMetrics.completedPct}% dari total tugas
            </span>
          </div>
        </div>

        {/* Tasks In Progress */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-lg">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Dalam Pengerjaan</span>
            <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
              {progressMetrics.inProgressCount} Tugas
            </span>
            <span className="text-[10px] text-sky-600 font-semibold block mt-0.5">
              Sedang berjalan aktif
            </span>
          </div>
        </div>

        {/* Milestone Achievement Counts */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Flag className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Milestone Tercapai</span>
            <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
              {progressMetrics.achievedMilestones} / {progressMetrics.totalMilestones}
            </span>
            <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">
              {progressMetrics.milestonePct}% milestone dicapai
            </span>
          </div>
        </div>

      </div>

      {/* 3. Schedule Performance Index (SPI) Info Box */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg flex-shrink-0 ${
            progressMetrics.spi >= 1.0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50/80 text-rose-600'
          }`}>
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Indeks Kinerja Jadwal / Schedule Performance Index (SPI)
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Mengukur efisiensi waktu proyek dengan membandingkan progress aktual yang dicapai dengan target rencana.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg">
          <div className="text-right">
            <span className="text-[9px] text-slate-400 font-bold uppercase block">Nilai SPI</span>
            <span className={`text-lg font-black ${progressMetrics.spi >= 1.0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {progressMetrics.spi.toFixed(2)}
            </span>
          </div>
          <div className="h-8 border-l border-slate-200"></div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase block">Status Kecepatan</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded border block mt-0.5 ${
              progressMetrics.spi >= 1.0 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {progressMetrics.spi >= 1.0 ? 'Sesuai / Lebih Cepat' : 'Terlambat/Lambat'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. S-Curve and Status Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* S-Curve (Target vs Actual) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800">S-Curve Progress Fisik Pekerjaan</h3>
              <p className="text-xs text-slate-500 mt-0.5">Perbandingan kronologis target kumulatif (%) dengan realisasi aktual (%)</p>
            </div>
            <div className="flex gap-4 text-[10px] font-mono font-bold">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2.5 w-2.5 bg-slate-400 rounded-full"></span> Target Rencana
              </span>
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="h-2.5 w-2.5 bg-blue-500 rounded-full"></span> Realisasi Progress
              </span>
            </div>
          </div>

          <div className="h-72 w-full mt-2">
            {sCurveProgressData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Tambahkan tanggal mulai & selesai pada tugas untuk memuat S-Curve
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sCurveProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff' }}
                    labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Target Progress (%)" 
                    stroke="#94a3b8" 
                    strokeWidth={2} 
                    strokeDasharray="4 4"
                    fillOpacity={1} 
                    fill="url(#colorTarget)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Aktual Progress (%)" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorActual)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Task Status Allocation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 mb-1">Alokasi Status Pekerjaan</h3>
            <p className="text-[11px] text-slate-500">Penyebaran status seluruh item pekerjaan saat ini</p>
          </div>
          
          <div className="h-44 w-full relative flex items-center justify-center">
            {statusPieData.length === 0 ? (
              <div className="text-slate-400 text-xs">Belum ada tugas ditambahkan</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff' }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Custom legend */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-2">
            {statusPieData.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[10px] text-slate-600 font-semibold">
                <span 
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: PIE_COLORS[entry.name as keyof typeof PIE_COLORS] }}
                ></span>
                <span className="truncate">
                  {INDO_STATUS_NAMES[entry.name as keyof typeof INDO_STATUS_NAMES]} ({entry.value})
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
