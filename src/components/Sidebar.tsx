/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BarChart3, 
  TableProperties, 
  Kanban, 
  Milestone, 
  FolderOpen, 
  Users, 
  History, 
  LogOut, 
  Database, 
  RefreshCw,
  Plus,
  Trash2,
  Settings,
  X,
  ShieldCheck,
  ExternalLink,
  FolderPlus,
  Share2,
  Check
} from 'lucide-react';
import { TeamMember, ActivityLog } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
  spreadsheetId: string;
  projectName: string;
  teamMembers: TeamMember[];
  logs: ActivityLog[];
  onAddTeamMember: (member: TeamMember) => void;
  onDeleteTeamMember: (email: string) => void;
  isSyncing: boolean;
  onManualSync: () => void;
  lastSyncTime: string | null;
  onSwitchProject?: () => void;
  onShareProject?: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  spreadsheetId,
  projectName,
  teamMembers,
  logs,
  onAddTeamMember,
  onDeleteTeamMember,
  isSyncing,
  onManualSync,
  lastSyncTime,
  onSwitchProject,
  onShareProject
}: SidebarProps) {
  const activeMembers = teamMembers || [];
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Project Manager');
  const [isCopied, setIsCopied] = useState(false);

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: BarChart3 },
    { id: 'grid', label: 'Spreadsheet Grid', icon: TableProperties },
    { id: 'kanban', label: 'Workflow Board', icon: Kanban },
    { id: 'gantt', label: 'Gantt Scheduler', icon: Milestone },
    { id: 'docs', label: 'Drive Attachments', icon: FolderOpen }
  ];

  const handleAddTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) return;

    onAddTeamMember({
      email: newEmail,
      name: newName,
      role: newRole,
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(newName)}`
    });

    setNewEmail('');
    setNewName('');
    setNewRole('Project Manager');
    setIsTeamModalOpen(false);
  };

  return (
    <aside className="w-[280px] bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 flex-shrink-0">
      
      {/* Top Banner & Project name */}
      <div className="flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-sm flex-shrink-0">
              {projectName ? projectName.charAt(0).toUpperCase() : 'M'}
            </div>
            <div className="min-w-0">
              <span className="text-[9px] text-blue-400 font-mono uppercase tracking-widest font-bold">Workspace Hub</span>
              <h2 className="text-sm font-bold text-white mt-0.5 truncate" title={projectName}>
                {projectName || 'Master Control Plan'}
              </h2>
            </div>
          </div>
          {onSwitchProject && (
            <button
              onClick={onSwitchProject}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all flex-shrink-0 ml-1"
              title="Buat Proyek Baru / Ganti Control Plan"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sync Status bar */}
        <div className="px-6 py-3 bg-slate-950/30 border-b border-slate-800 flex items-center justify-between text-[10px] font-mono">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className={`h-2 w-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></span>
            {isSyncing ? 'Syncing to Sheets...' : 'Connected'}
          </span>
          <button 
            onClick={onManualSync} 
            disabled={isSyncing}
            className={`p-1 bg-slate-800 hover:bg-slate-700 hover:text-white rounded transition-all disabled:opacity-40 flex items-center gap-1 ${isSyncing ? 'animate-spin' : ''}`}
            title="Force Google Sheets Synchronizer"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>

        {/* Menu Navigation */}
        <nav className="p-4 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-sm font-bold' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Middle Options: Logs & Team Management links */}
      <div className="px-4 space-y-1.5 border-t border-slate-800/60 pt-4 pb-4">
        
        {/* Team Manager trigger */}
        <button 
          onClick={() => setIsTeamModalOpen(true)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-white px-3 py-2.5 hover:bg-slate-800 rounded-lg transition-all"
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            Control Resources
          </span>
          <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono">
            {activeMembers.length}
          </span>
        </button>

        {/* Database Logs trigger */}
        <button 
          onClick={() => setIsLogModalOpen(true)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-white px-3 py-2.5 hover:bg-slate-800 rounded-lg transition-all"
        >
          <span className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            Audit Logs Registry
          </span>
          <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono">
            {logs.length}
          </span>
        </button>

        {/* Link to actual Google Sheet */}
        <a 
          href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 px-3 py-2.5 hover:bg-emerald-950/20 rounded-lg transition-all border border-emerald-900/30"
        >
          <span className="flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-500" />
            Buka Google Sheet
          </span>
          <ExternalLink className="h-3 w-3 text-emerald-500" />
        </a>

        {/* Share Project & Grant Permissions button for Multi-user */}
        {onShareProject && (
          <button 
            type="button"
            onClick={() => {
              onShareProject();
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 3000);
            }}
            className="w-full flex items-center justify-between text-[11px] font-bold text-blue-400 hover:text-blue-300 px-3 py-2.5 hover:bg-blue-950/30 rounded-lg transition-all border border-blue-800/40"
          >
            <span className="flex items-center gap-2">
              {isCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4 text-blue-400" />}
              {isCopied ? 'Link Disalin & Akses Dibuka!' : 'Bagikan Link & Akses Proyek'}
            </span>
          </button>
        )}

      </div>

      {/* User Session Footer */}
      <div className="p-4 bg-slate-950/30 border-t border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <img 
            src={user?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.email || 'System'}`} 
            alt={user?.displayName || 'User avatar'} 
            className="h-8 w-8 rounded-full ring-2 ring-slate-800 object-cover"
          />
          <div className="min-w-0">
            <h4 className="font-bold text-[11.5px] text-white truncate">{user?.displayName || 'Active Account'}</h4>
            <p className="text-[9px] text-slate-500 truncate mt-0.5" title={user?.email}>{user?.email || 'Email address'}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 hover:text-rose-400 text-slate-400 rounded-lg transition-all"
          title="Sign Out Session"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ================= RESOURCE MANAGEMENT MODAL ================= */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md text-slate-800">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <h3 className="font-bold text-sm text-slate-900">Manage Project Resources</h3>
              <button onClick={() => setIsTeamModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-900 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              
              {/* List of team members */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Registered Resources ({activeMembers.length})</h4>
                {activeMembers.map(m => (
                  <div key={m.email} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={m.avatarUrl} alt={m.name} className="h-7 w-7 rounded-full bg-slate-200" />
                      <div className="min-w-0">
                        <h5 className="font-bold text-xs text-slate-800 truncate">{m.name}</h5>
                        <p className="text-[9px] text-slate-400 truncate">{m.email} • {m.role}</p>
                      </div>
                    </div>
                    {/* Cannot delete default administrator for security */}
                    {m.email !== 'madeflora.id@gmail.com' && (
                      <button 
                        onClick={() => onDeleteTeamMember(m.email)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                        title="Delete resource"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add resource form */}
              <form onSubmit={handleAddTeamSubmit} className="border-t border-slate-100 pt-4 space-y-3.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Add Resource</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Display Name</label>
                    <input 
                      type="text" 
                      value={newName} 
                      onChange={e => setNewName(e.target.value)} 
                      placeholder="e.g. Flora Made"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={newEmail} 
                      onChange={e => setNewEmail(e.target.value)} 
                      placeholder="e.g. client@example.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Organizational Role</label>
                  <select 
                    value={newRole} 
                    onChange={e => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <option value="Project Director">Project Director</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Civil Engineer">Civil Engineer</option>
                    <option value="Architect">Architect</option>
                    <option value="Quantity Surveyor">Quantity Surveyor</option>
                    <option value="Site Supervisor">Site Supervisor</option>
                    <option value="Sub-Contractor">Sub-Contractor</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="h-4 w-4" /> Add Resource to Database
                </button>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* ================= DATABASE AUDIT LOGS MODAL ================= */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-xl text-slate-800 max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <h3 className="font-bold text-sm text-slate-900">Database Synchronization Logs</h3>
              <button onClick={() => setIsLogModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-900 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3 font-medium">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Database Operations Chronological Trail ({logs.length})</h4>
              
              {logs.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-12">No database operations logged.</p>
              ) : (
                logs.map((l, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-[9px] font-mono font-bold text-slate-400">
                      <span>{new Date(l.timestamp).toLocaleString()}</span>
                      <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono uppercase">{l.user}</span>
                    </div>
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      {l.action}
                    </div>
                    <p className="text-slate-500 leading-normal pl-5">{l.details}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </aside>
  );
}
