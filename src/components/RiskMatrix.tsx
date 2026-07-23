/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  AlertOctagon, 
  Plus, 
  Trash2, 
  Check, 
  ShieldCheck, 
  RefreshCw, 
  ChevronRight, 
  Sparkles,
  HelpCircle,
  X
} from 'lucide-react';
import { Risk, RiskStatus } from '../types';

interface RiskMatrixProps {
  risks: Risk[];
  onAddRisk: (risk: Omit<Risk, 'id'>) => void;
  onUpdateRisk: (risk: Risk) => void;
  onDeleteRisk: (riskId: string) => void;
}

export default function RiskMatrix({ risks, onAddRisk, onUpdateRisk, onDeleteRisk }: RiskMatrixProps) {
  const [selectedCell, setSelectedCell] = useState<{ p: number; i: number } | null>(null);
  
  // Add Risk Form state
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProb, setNewProb] = useState(2);
  const [newImpact, setNewImpact] = useState(2);
  const [newMitigation, setNewMitigation] = useState('');

  // 5x5 Matrix counters
  const matrixStats = useMemo(() => {
    const stats: Record<string, number> = {};
    // Seed matrix counters
    for (let p = 1; p <= 5; p++) {
      for (let i = 1; i <= 5; i++) {
        stats[`${p}-${i}`] = 0;
      }
    }
    // Populate stats
    risks.forEach(r => {
      const key = `${r.probability || 1}-${r.impact || 1}`;
      if (stats[key] !== undefined) stats[key]++;
    });
    return stats;
  }, [risks]);

  // Filtered risks based on matrix click
  const filteredRisks = useMemo(() => {
    if (!selectedCell) return risks;
    return risks.filter(r => r.probability === selectedCell.p && r.impact === selectedCell.i);
  }, [risks, selectedCell]);

  // Determine hazard level color coding for cells
  const getCellBgClass = (p: number, i: number, isSelected: boolean) => {
    const score = p * i;
    let base = '';
    
    if (score >= 12) {
      base = 'bg-red-500/20 text-red-700 border-red-300 hover:bg-red-500/30'; // Critical Red
    } else if (score >= 5) {
      base = 'bg-amber-500/20 text-amber-700 border-amber-300 hover:bg-amber-500/30'; // Caution Amber
    } else {
      base = 'bg-emerald-500/20 text-emerald-700 border-emerald-300 hover:bg-emerald-500/30'; // Low Green
    }

    if (isSelected) {
      return `${base} ring-4 ring-slate-900 ring-offset-1 border-slate-900 scale-[1.03] z-10`;
    }
    return base;
  };

  const handleCellClick = (p: number, i: number) => {
    if (selectedCell?.p === p && selectedCell?.i === i) {
      setSelectedCell(null); // Toggle filter off
    } else {
      setSelectedCell({ p, i });
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddRisk({
      title: newTitle,
      probability: newProb,
      impact: newImpact,
      mitigation: newMitigation,
      status: 'Active'
    });

    setNewTitle('');
    setNewProb(2);
    setNewImpact(2);
    setNewMitigation('');
    setIsAdding(false);
  };

  const handleStatusChange = (risk: Risk, status: RiskStatus) => {
    onUpdateRisk({ ...risk, status });
  };

  const getRiskLabel = (score: number) => {
    if (score >= 12) return { text: 'HIGH EXPOSURE', bg: 'bg-red-100 text-red-800 border-red-200' };
    if (score >= 5) return { text: 'MEDIUM', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
    return { text: 'LOW', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 5x5 Heatmap Controller Panel */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-800">Probability & Impact Matrix</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Click cells below to filter risks by quadrant severity</p>
        </div>

        {/* Matrix Grid Canvas */}
        <div className="my-6">
          <div className="flex flex-col">
            
            {/* Heatmap top axis header */}
            <div className="flex flex-row items-center">
              <span className="text-[10px] font-mono font-bold text-slate-400 rotate-270 w-8 text-center -ml-2">IMPACT</span>
              
              <div className="flex-1 grid grid-cols-5 gap-1.5 text-center text-[10px] font-mono font-bold text-slate-400 pb-1.5">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>

            {/* Matrix Body Rows */}
            {/* Rows are Impact index descending (Y-axis 5 to 1) */}
            <div className="flex flex-row">
              {/* Y Axis indicators */}
              <div className="w-8 flex flex-col justify-between text-[10px] font-mono font-bold text-slate-400 py-1.5 text-center">
                <span>5</span>
                <span>4</span>
                <span>3</span>
                <span>2</span>
                <span>1</span>
              </div>

              {/* Grid block cells */}
              <div className="flex-1 flex flex-col gap-1.5">
                {[5, 4, 3, 2, 1].map(y => (
                  <div key={y} className="grid grid-cols-5 gap-1.5 h-11">
                    {[1, 2, 3, 4, 5].map(x => {
                      const count = matrixStats[`${x}-${y}`] || 0;
                      const isSelected = selectedCell?.p === x && selectedCell?.i === y;
                      return (
                        <button 
                          key={x}
                          onClick={() => handleCellClick(x, y)}
                          className={`rounded-lg border-2 font-black text-xs flex flex-col items-center justify-center relative cursor-pointer transition-all duration-300 ${getCellBgClass(x, y, isSelected)}`}
                          title={`Probability ${x} x Impact ${y}`}
                        >
                          {count > 0 && (
                            <span className="text-slate-950 text-[13px]">{count}</span>
                          )}
                          <span className="text-[8px] font-mono opacity-50 absolute bottom-0.5 right-1">{x}x{y}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom X-Axis Label */}
            <div className="text-center text-[10px] font-mono font-bold text-slate-400 pt-3.5 ml-8">
              PROBABILITY
            </div>

          </div>
        </div>

        {/* Legend */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-red-400/30 border border-red-400 rounded"></span> P&times;I &ge; 12 High (Mitigate Immediately)</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-amber-400/30 border border-amber-400 rounded"></span> P&times;I 5-10 Medium (Track closely)</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-emerald-400/30 border border-emerald-400 rounded"></span> P&times;I 1-4 Low (Acknowledge)</span>
          </div>
        </div>
      </div>

      {/* Risk Register table list */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
        
        {/* Header line */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-800">Risk & Issue Control Register</h3>
              {selectedCell && (
                <span className="bg-slate-900 text-white font-mono text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
                  Filtering {selectedCell.p}x{selectedCell.i}
                  <X className="h-2.5 w-2.5 cursor-pointer hover:text-red-400" onClick={() => setSelectedCell(null)} />
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Threat evaluations, trigger points, and responsive actions</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-md animate-none"
          >
            <Plus className="h-3.5 w-3.5" /> Register Risk
          </button>
        </div>

        {/* Scrollable Risk Register rows */}
        <div className="flex-1 overflow-y-auto max-h-[360px] pr-1.5 space-y-3.5">
          {filteredRisks.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No registered risk entries matching filter criteria. Click matrix block or add a threat log.
            </div>
          ) : (
            filteredRisks.map(r => {
              const score = r.probability * r.impact;
              const lvl = getRiskLabel(score);
              return (
                <div 
                  key={r.id} 
                  className={`p-4 border rounded-xl shadow-xs transition-all flex flex-col md:flex-row gap-4 items-start justify-between ${
                    r.status === 'Closed' ? 'bg-slate-50/50 opacity-60 border-slate-100' : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border">
                        {r.id}
                      </span>
                      <h4 className="font-bold text-xs text-slate-800">{r.title}</h4>
                      <span className={`px-1.5 py-0.5 rounded font-black text-[8px] uppercase tracking-wider border ${lvl.bg}`}>
                        {lvl.text} (P&times;I = {score})
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <strong className="text-slate-800 block text-[10px] uppercase font-mono tracking-wider mb-0.5 text-slate-400">Mitigation Strategy:</strong>
                      {r.mitigation || 'No mitigation plan formulated yet.'}
                    </p>
                  </div>

                  {/* Actions & controls inside risk block */}
                  <div className="flex flex-row md:flex-col items-end gap-2 self-stretch justify-between md:justify-start">
                    
                    {/* Status badge and actions */}
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleStatusChange(r, 'Active')}
                        className={`px-2 py-1 rounded text-[9px] font-bold border transition-all ${
                          r.status === 'Active' 
                            ? 'bg-red-50 text-red-700 border-red-100 font-bold' 
                            : 'bg-transparent text-slate-400 border-slate-200 hover:text-slate-600'
                        }`}
                      >
                        Active
                      </button>
                      <button 
                        onClick={() => handleStatusChange(r, 'Mitigated')}
                        className={`px-2 py-1 rounded text-[9px] font-bold border transition-all ${
                          r.status === 'Mitigated' 
                            ? 'bg-amber-50 text-amber-700 border-amber-100 font-bold' 
                            : 'bg-transparent text-slate-400 border-slate-200 hover:text-slate-600'
                        }`}
                      >
                        Mitigated
                      </button>
                      <button 
                        onClick={() => handleStatusChange(r, 'Closed')}
                        className={`px-2 py-1 rounded text-[9px] font-bold border transition-all ${
                          r.status === 'Closed' 
                            ? 'bg-slate-900 text-white border-slate-900 font-bold' 
                            : 'bg-transparent text-slate-400 border-slate-200 hover:text-slate-600'
                        }`}
                      >
                        Closed
                      </button>
                    </div>

                    <button 
                      onClick={() => onDeleteRisk(r.id)}
                      className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all"
                      title="Delete risk log"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* ================= REGISTER RISK MODAL ================= */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <h3 className="font-bold text-sm text-slate-900">Register Project Threat</h3>
              <button onClick={() => setIsAdding(false)} className="p-1 text-slate-400 hover:text-slate-900 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Risk Title / Code</label>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={e => setNewTitle(e.target.value)} 
                  placeholder="e.g. Concrete mix supply delayed"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Probability (1-5)</label>
                  <select 
                    value={newProb} 
                    onChange={e => setNewProb(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="1">1 - Improbable</option>
                    <option value="2">2 - Remote</option>
                    <option value="3">3 - Occasional</option>
                    <option value="4">4 - Probable</option>
                    <option value="5">5 - Frequent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Impact Severity (1-5)</label>
                  <select 
                    value={newImpact} 
                    onChange={e => setNewImpact(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="1">1 - Negligible</option>
                    <option value="2">2 - Minor</option>
                    <option value="3">3 - Moderate</option>
                    <option value="4">4 - Critical</option>
                    <option value="5">5 - Catastrophic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Responsive Mitigation Plan</label>
                <textarea 
                  value={newMitigation} 
                  onChange={e => setNewMitigation(e.target.value)} 
                  placeholder="Formulate mitigation action points, secondary sourcing, triggers or early indicators..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-md"
                >
                  Add Risk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
