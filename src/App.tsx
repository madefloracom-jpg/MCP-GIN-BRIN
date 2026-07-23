/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getAccessToken, 
  setCachedAccessToken 
} from './lib/firebase';
import { 
  fetchProjectData, 
  saveProjectData,
  shareFileWithAnyone
} from './lib/googleApi';
import { 
  Task, 
  Milestone, 
  TeamMember, 
  Risk, 
  ActivityLog, 
  TaskStatus, 
  RiskLevel
} from './types';
import { 
  Loader2, 
  TrendingUp, 
  ShieldCheck, 
  Database, 
  CloudRain, 
  Sparkles, 
  Lock,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Subcomponents
import { applyWbsRollups } from './lib/rollup';
import firebaseConfig from '../firebase-applet-config.json';
import SetupWizard from './components/SetupWizard';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import SpreadsheetGrid from './components/SpreadsheetGrid';
import KanbanBoard from './components/KanbanBoard';
import GanttChart from './components/GanttChart';
import RiskMatrix from './components/RiskMatrix';
import DocumentManager from './components/DocumentManager';

export default function App() {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginErrorMsg, setLoginErrorMsg] = useState<string | null>(null);
  const [showManualToken, setShowManualToken] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Control Plan Database state
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});

  // Loading and Syncer state
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('dashboard');

  // Switch / Create New Control Plan state
  const [isSwitchingProject, setIsSwitchingProject] = useState(false);

  // Custom confirmation dialog state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Default Master Control Plan Google Sheet ID & Drive Folder ID
  const DEFAULT_SPREADSHEET_ID = '1HKqMhFXy2cE0xgUQsBzKNwzUgwsEL9mupVctKseQGnU';
  const DEFAULT_DRIVE_FOLDER_ID = '1xzgKGg892wvoCZIyxifeFty_d4rRsy_a';

  // Load project configuration from local storage or URL search params on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSheetId = urlParams.get('sheetId') || urlParams.get('sid');

    const activeSheetId = urlSheetId || localStorage.getItem('mcp_spreadsheet_id') || DEFAULT_SPREADSHEET_ID;
    const activeFolderId = localStorage.getItem('mcp_folder_id') || DEFAULT_DRIVE_FOLDER_ID;
    const savedProjectName = localStorage.getItem('mcp_project_name') || 'BRIN Master Control Plan';

    setSpreadsheetId(activeSheetId);
    setFolderId(activeFolderId);
    localStorage.setItem('mcp_spreadsheet_id', activeSheetId);
    localStorage.setItem('mcp_folder_id', activeFolderId);

    if (savedProjectName) setProjectName(savedProjectName);

    // Initialize Firebase Auth listener
    initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setCachedAccessToken(token);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
      }
    );
  }, []);

  // Auto register logged-in user in team members state
  useEffect(() => {
    if (user?.email) {
      setTeamMembers(prev => {
        if (!prev.some(m => m.email === user.email)) {
          return [
            {
              email: user.email,
              name: user.displayName || user.email.split('@')[0],
              role: 'Project Lead',
              avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.email)}`
            },
            ...prev
          ];
        }
        return prev;
      });
    }
  }, [user]);

  // Sync URL search params when spreadsheetId changes
  useEffect(() => {
    if (spreadsheetId) {
      const url = new URL(window.location.href);
      if (url.searchParams.get('sheetId') !== spreadsheetId) {
        url.searchParams.set('sheetId', spreadsheetId);
        window.history.replaceState(null, '', url.toString());
      }
    }
  }, [spreadsheetId]);

  // Fetch spreadsheet data once authenticated & spreadsheetId is set
  const loadDatabaseValues = useCallback(async (token: string, sheetId: string) => {
    setIsLoadingData(true);
    try {
      const data = await fetchProjectData(token, sheetId);
      setTasks(applyWbsRollups(data.tasks));
      setMilestones(data.milestones);
      
      let effectiveTeam = data.teamMembers || [];
      if (user?.email && !effectiveTeam.some(m => m.email === user.email)) {
        effectiveTeam = [
          {
            email: user.email,
            name: user.displayName || user.email.split('@')[0],
            role: 'Project Lead',
            avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.email)}`
          },
          ...effectiveTeam
        ];
      }
      setTeamMembers(effectiveTeam);
      
      setRisks(data.risks);
      setLogs(data.logs);
      setConfig(data.config);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to load database values:', err);
      const errMsg = err.message || String(err);
      const isDriveDisabled = errMsg.includes('drive.googleapis.com') || errMsg.includes('Google Drive API') || errMsg.includes('Drive API');
      const isSheetsDisabled = errMsg.includes('sheets.googleapis.com') || errMsg.includes('Google Sheets API') || errMsg.includes('Sheets API');
      const isDisabled = isDriveDisabled || isSheetsDisabled || errMsg.includes('SERVICE_DISABLED') || errMsg.includes('has not been used');
      const isPermissionDenied = errMsg.includes('403') || errMsg.includes('404') || errMsg.includes('permission') || errMsg.includes('Permission') || errMsg.includes('does not have permission');

      if (isDisabled) {
        const defaultUrl = isDriveDisabled 
          ? 'https://console.developers.google.com/apis/api/drive.googleapis.com/overview'
          : 'https://console.developers.google.com/apis/api/sheets.googleapis.com/overview';
        const activationUrl = err.activationUrl || defaultUrl;
        const apiTitle = isDriveDisabled ? 'Google Drive API Belum Diaktifkan' : 'Google Sheets API Belum Diaktifkan';
        
        setConfirmState({
          isOpen: true,
          title: apiTitle,
          message: `${apiTitle} di Google Cloud Console pada Project Anda.\n\nLangkah Mengatasi:\n1. Klik "Aktifkan API Sekarang" di bawah ini.\n2. Klik tombol [ENABLE / AKTIFKAN] di Google Developers Console.\n3. Tunggu 1-2 menit agar perubahan aktif, lalu muat ulang halaman.`,
          onConfirm: () => {
            window.open(activationUrl, '_blank');
            setConfirmState(prev => ({ ...prev, isOpen: false }));
          }
        });
      } else if (isPermissionDenied) {
        setConfirmState({
          isOpen: true,
          title: 'Izin Akses Google Sheet Ditolak',
          message: `Akun Google Anda (${user?.email || 'saat ini'}) belum memiliki izin akses ke Spreadsheet Google Drive ini.\n\nLangkah Penyelesaian:\n1. Minta Pemilik Proyek / Pembuat Sheet untuk membagikan file Google Sheet di Drive ke email Anda (${user?.email}) dengan peran Editor.\n2. Atau minta pemilik membuka aplikasi ini dan klik "Bagikan Link & Akses Proyek" di menu samping.\n3. Klik "Buka Google Sheet" untuk meminta akses langsung ke pemilik file.`,
          onConfirm: () => {
            window.open(`https://docs.google.com/spreadsheets/d/${sheetId}`, '_blank');
            setConfirmState(prev => ({ ...prev, isOpen: false }));
          }
        });
      } else {
        alert(`Gagal Membaca Database Google Sheet: ${errMsg}`);
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (accessToken && spreadsheetId) {
      loadDatabaseValues(accessToken, spreadsheetId);
    }
  }, [accessToken, spreadsheetId, loadDatabaseValues]);

  // Google Sign In trigger
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      const errMsg = err.message || String(err);
      if (err.code === 'auth/popup-closed-by-user' || errMsg.includes('popup-closed-by-user') || errMsg.includes('popup_closed_by_user')) {
        // User closed the Google Sign-in popup intentionally; ignore gracefully
        return;
      }
      setLoginErrorMsg(errMsg);
      if (err.code === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain')) {
        const currentDomain = window.location.hostname;
        setConfirmState({
          isOpen: true,
          title: 'Domain Vercel Perlu Konfigurasi Firebase Mandiri',
          message: `Domain "${currentDomain}" ditolak oleh Firebase karena Project bawaan AI Studio (master-control-plan-brin-gin) dikelola secara otomatis.\n\nSolusi jika di-deploy di Vercel:\n1. Buat/Gunakan Firebase Project pribadi Anda di https://console.firebase.google.com\n2. Tambahkan "${currentDomain}" ke Authorized Domains di Firebase Console Anda.\n3. Masukkan API Key & Config Firebase Anda ke Environment Variables di Vercel (VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, dll).\n\nAtau gunakan URL bawaan AI Studio yang sudah siap pakai tanpa kendala login.`,
          onConfirm: () => {
            window.open(`https://console.firebase.google.com/`, '_blank');
            setConfirmState(prev => ({ ...prev, isOpen: false }));
          }
        });
      } else if (errMsg.includes('403') || errMsg.includes('access_denied') || errMsg.includes('testing') || errMsg.includes('unverified')) {
        setConfirmState({
          isOpen: true,
          title: 'Akses Google OAuth Dibatasi (Error 403 / Access Denied)',
          message: `Google OAuth pada project "${firebaseConfig.projectId}" saat ini berstatus Testing / Belum Diverifikasi oleh Google.\n\nCara Mengatasi:\n1. Buka Google Cloud Console (APIs & Services -> OAuth consent screen).\n2. Di bagian "Test Users" (Penguji), tambahkan email Google Anda (${user?.email || 'email Anda'}).\n3. Atau ubah Publishing Status dari "Testing" menjadi "In Production".\n\nAtau gunakan opsi "Access Token Manual" pada halaman login.`,
          onConfirm: () => {
            window.open(`https://console.cloud.google.com/apis/credentials/consent`, '_blank');
            setConfirmState(prev => ({ ...prev, isOpen: false }));
          }
        });
      } else {
        alert(`Sign in failed: ${errMsg}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Google Log Out trigger
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
    setSpreadsheetId(null);
    setFolderId(null);
    setProjectName('');
    localStorage.removeItem('mcp_spreadsheet_id');
    localStorage.removeItem('mcp_folder_id');
    localStorage.removeItem('mcp_project_name');
  };

  // Save changes to Google Sheets database
  const saveDatabaseValues = async (
    updatedTasks: Task[],
    updatedMilestones: Milestone[],
    updatedTeam: TeamMember[],
    updatedRisks: Risk[],
    updatedLogs: ActivityLog[]
  ) => {
    if (!accessToken || !spreadsheetId) return;
    setIsSyncing(true);
    try {
      await saveProjectData(accessToken, spreadsheetId, {
        tasks: updatedTasks,
        milestones: updatedMilestones,
        teamMembers: updatedTeam,
        risks: updatedRisks,
        logs: updatedLogs
      });
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Database Sync Failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper to log changes
  const addLogEntry = (action: string, details: string) => {
    const newLog: ActivityLog = {
      timestamp: new Date().toISOString(),
      user: user?.displayName || user?.email?.split('@')[0] || 'Unknown',
      action,
      details
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    return updatedLogs;
  };

  // Setup wizard callback
  const handleProjectConnected = (sheetId: string, foldId: string, projName: string) => {
    localStorage.setItem('mcp_spreadsheet_id', sheetId);
    localStorage.setItem('mcp_folder_id', foldId);
    localStorage.setItem('mcp_project_name', projName);
    
    setSpreadsheetId(sheetId);
    setFolderId(foldId);
    setProjectName(projName);
  };

  const handleShareProject = async () => {
    if (!spreadsheetId || !accessToken) return;
    try {
      await shareFileWithAnyone(accessToken, spreadsheetId);
      if (folderId) {
        await shareFileWithAnyone(accessToken, folderId);
      }
      
      const shareUrl = `${window.location.origin}${window.location.pathname}?sheetId=${spreadsheetId}`;
      await navigator.clipboard.writeText(shareUrl);
      
      setConfirmState({
        isOpen: true,
        title: 'Akses Google Sheet Dibuka & Link Disalin',
        message: `Izin akses Google Sheet telah diatur ke "Siapa saja yang memiliki link dapat mengedit".\n\nLink Aplikasi Proyek:\n${shareUrl}\n\n(Link sudah disalin ke clipboard Anda). Bagikan link ini ke pengguna/tim lain agar dapat langsung terhubung!`,
        onConfirm: () => setConfirmState(prev => ({ ...prev, isOpen: false }))
      });
    } catch (err: any) {
      console.error('Failed to share project:', err);
      alert(`Gagal membagikan akses: ${err.message}`);
    }
  };

  // ================= TASK MUTATIONS =================
  const handleAddTask = (newTaskData: Omit<Task, 'id'>) => {
    const randomId = 'TSK-' + Math.floor(1000 + Math.random() * 9000);

    // Auto assign current user if assignees list is empty
    let updatedAssignees = newTaskData.assignees || [];
    if (updatedAssignees.length === 0 && user?.email) {
      updatedAssignees = [user.email];
    }

    const newTask: Task = { 
      ...newTaskData, 
      id: randomId,
      assignees: updatedAssignees 
    };
    
    // Auto register active user & task assignees to teamMembers
    let updatedTeam = [...teamMembers];
    if (user?.email && !updatedTeam.some(m => m.email === user.email)) {
      updatedTeam.unshift({
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        role: 'Project Lead',
        avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.email)}`
      });
    }
    updatedAssignees.forEach(email => {
      if (!updatedTeam.some(m => m.email === email)) {
        updatedTeam.push({
          email,
          name: email.split('@')[0],
          role: 'Team Member',
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(email)}`
        });
      }
    });

    setTeamMembers(updatedTeam);
    
    const rolledUpTasks = applyWbsRollups([...tasks, newTask]);
    setTasks(rolledUpTasks);
    
    const updatedLogs = addLogEntry('Task Created', `Initiated task "${newTask.name}" with ID ${randomId}.`);
    saveDatabaseValues(rolledUpTasks, milestones, updatedTeam, risks, updatedLogs);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    let updatedAssignees = updatedTask.assignees || [];
    if (updatedAssignees.length === 0 && user?.email) {
      updatedAssignees = [user.email];
    }
    const finalTask = { ...updatedTask, assignees: updatedAssignees };

    // Auto register active user & task assignees to teamMembers
    let updatedTeam = [...teamMembers];
    if (user?.email && !updatedTeam.some(m => m.email === user.email)) {
      updatedTeam.unshift({
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        role: 'Project Lead',
        avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.email)}`
      });
    }
    updatedAssignees.forEach(email => {
      if (!updatedTeam.some(m => m.email === email)) {
        updatedTeam.push({
          email,
          name: email.split('@')[0],
          role: 'Team Member',
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(email)}`
        });
      }
    });

    setTeamMembers(updatedTeam);

    const updatedTasks = tasks.map(t => t.id === finalTask.id ? finalTask : t);
    const rolledUpTasks = applyWbsRollups(updatedTasks);
    setTasks(rolledUpTasks);

    const updatedLogs = addLogEntry('Task Modified', `Updated parameters of task "${finalTask.name}" (${finalTask.id}).`);
    saveDatabaseValues(rolledUpTasks, milestones, updatedTeam, risks, updatedLogs);
  };

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    setConfirmState({
      isOpen: true,
      title: 'Hapus Tugas',
      message: `Apakah Anda yakin ingin menghapus tugas "${taskToDelete?.name || taskId}"? Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: () => {
        const remainingTasks = tasks.filter(t => t.id !== taskId);
        const rolledUpTasks = applyWbsRollups(remainingTasks);
        setTasks(rolledUpTasks);

        const updatedLogs = addLogEntry('Task Deleted', `Removed task "${taskToDelete?.name || taskId}" from schedule.`);
        saveDatabaseValues(rolledUpTasks, milestones, teamMembers, risks, updatedLogs);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // ================= RISK MUTATIONS =================
  const handleAddRisk = (newRiskData: Omit<Risk, 'id'>) => {
    const randomId = 'RSK-' + Math.floor(1000 + Math.random() * 9000);
    const newRisk: Risk = { ...newRiskData, id: randomId };

    const updatedRisks = [...risks, newRisk];
    setRisks(updatedRisks);

    const updatedLogs = addLogEntry('Risk Logged', `Logged threat threat "${newRisk.title}" with ID ${randomId}.`);
    saveDatabaseValues(tasks, milestones, teamMembers, updatedRisks, updatedLogs);
  };

  const handleUpdateRisk = (updatedRisk: Risk) => {
    const updatedRisks = risks.map(r => r.id === updatedRisk.id ? updatedRisk : r);
    setRisks(updatedRisks);

    const updatedLogs = addLogEntry('Risk Modified', `Updated status/mitigation of risk "${updatedRisk.title}" to ${updatedRisk.status}.`);
    saveDatabaseValues(tasks, milestones, teamMembers, updatedRisks, updatedLogs);
  };

  const handleDeleteRisk = (riskId: string) => {
    const riskToDelete = risks.find(r => r.id === riskId);
    setConfirmState({
      isOpen: true,
      title: 'Hapus Risiko',
      message: `Apakah Anda yakin ingin menghapus risiko "${riskToDelete?.title || riskId}"? Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: () => {
        const updatedRisks = risks.filter(r => r.id !== riskId);
        setRisks(updatedRisks);

        const updatedLogs = addLogEntry('Risk Deleted', `Removed threat "${riskToDelete?.title || riskId}" from register.`);
        saveDatabaseValues(tasks, milestones, teamMembers, updatedRisks, updatedLogs);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // ================= TEAM RESOURCE MUTATIONS =================
  const handleAddTeamMember = (newMember: TeamMember) => {
    const updatedTeam = [...teamMembers, newMember];
    setTeamMembers(updatedTeam);

    const updatedLogs = addLogEntry('Resource Added', `Added team member "${newMember.name}" with role ${newMember.role}.`);
    saveDatabaseValues(tasks, milestones, updatedTeam, risks, updatedLogs);
  };

  const handleDeleteTeamMember = (email: string) => {
    const memberToDelete = teamMembers.find(m => m.email === email);
    setConfirmState({
      isOpen: true,
      title: 'Hapus Akses Tim',
      message: `Apakah Anda yakin ingin menghapus akses database untuk "${memberToDelete?.name || email}"?`,
      onConfirm: () => {
        const updatedTeam = teamMembers.filter(m => m.email !== email);
        setTeamMembers(updatedTeam);

        const updatedLogs = addLogEntry('Resource Revoked', `Removed team member "${memberToDelete?.name || email}" from project team.`);
        saveDatabaseValues(tasks, milestones, updatedTeam, risks, updatedLogs);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // ================= DOCUMENT ATTACHMENT MUTATIONS =================
  const handleLinkAttachmentToTask = (taskId: string, attachmentUrl: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, attachmentUrl };
      }
      return t;
    });
    setTasks(updatedTasks);
    saveDatabaseValues(updatedTasks, milestones, teamMembers, risks, logs);
  };

  // Manual pull/sync
  const handleManualSync = () => {
    if (accessToken && spreadsheetId) {
      loadDatabaseValues(accessToken, spreadsheetId);
    }
  };

  // Login/Onboarding layout
  if (needsAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        
        {/* Subtle grid visualizer lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>

        {/* Dynamic lights */}
        <div className="absolute top-0 left-1/4 h-72 w-72 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 h-72 w-72 bg-emerald-500/5 rounded-full blur-3xl"></div>

        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 relative shadow-2xl">
          
          <div className="flex flex-col items-center text-center">
            
            {/* App Branding Logo */}
            <div className="h-14 w-14 bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700/80 rounded-xl flex items-center justify-center shadow-lg mb-6">
              <Database className="h-7 w-7 text-emerald-400" />
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-white font-sans">Master Control Plan</h1>
            <span className="text-[10px] uppercase font-mono font-black text-emerald-400 tracking-widest mt-1.5">Enterprise Dashboard Engine</span>
            
            <p className="text-slate-400 text-xs mt-4 leading-relaxed">
              Plan schedules, monitor earned value metrics, analyze risk heatmaps, and coordinate with teams using direct <strong>Google Drive & Google Sheets</strong> authorization bounds.
            </p>

            <div className="w-full border-t border-slate-800/80 my-6"></div>

            {/* Google Sign-in button */}
            <button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 active:scale-[0.99] disabled:opacity-50 font-bold py-3.5 px-5 rounded-lg transition-all shadow-xl cursor-pointer"
            >
              {isLoggingIn ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
              ) : (
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5 flex-shrink-0">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
              )}
              Sign in with Google Workspace
            </button>

            {/* Error 403 / Access Denied Notice */}
            {loginErrorMsg && (loginErrorMsg.includes('403') || loginErrorMsg.includes('access_denied') || loginErrorMsg.includes('testing')) && (
              <div className="w-full text-left bg-amber-950/70 border border-amber-500/50 rounded-xl p-4 my-4 text-xs text-amber-200 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>Error 403: Google OAuth Dibatasi</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-300/90">
                  Aplikasi Google OAuth saat ini dalam mode <strong>Testing</strong>.
                </p>
                <div className="text-[11px] space-y-1 text-amber-200 font-mono bg-amber-950/90 p-2.5 rounded-lg border border-amber-800/60">
                  <p className="font-sans font-bold text-amber-400 mb-1">Langkah Penyelesaian (Google Cloud Console):</p>
                  <p>1. Buka link OAuth Consent Screen di bawah.</p>
                  <p>2. Scroll ke bagian <strong>Test Users (Penguji)</strong>.</p>
                  <p>3. Klik <strong>+ ADD USERS</strong> lalu masukkan email Anda (<code>madeflora.com@gmail.com</code>).</p>
                  <p>4. Klik Save dan coba login kembali.</p>
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <a 
                    href="https://console.cloud.google.com/apis/credentials/consent" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-center text-[11px] transition-all shadow-sm"
                  >
                    Buka Google Cloud OAuth Consent Screen ↗
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowManualToken(!showManualToken)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] transition-all font-semibold"
                  >
                    {showManualToken ? 'Sembunyikan Access Token Input' : 'Gunakan Google Access Token Manual (Bypass)'}
                  </button>
                </div>
              </div>
            )}

            {/* Toggle button if no login error yet */}
            {(!loginErrorMsg || (!loginErrorMsg.includes('403') && !loginErrorMsg.includes('access_denied'))) && (
              <button
                type="button"
                onClick={() => setShowManualToken(!showManualToken)}
                className="mt-3 text-[11px] text-slate-400 hover:text-slate-200 underline underline-offset-2 transition-all"
              >
                {showManualToken ? 'Sembunyikan Access Token Manual' : 'Punya Google Access Token? Masuk Manual'}
              </button>
            )}

            {/* Manual Token Entry Box */}
            {showManualToken && (
              <div className="w-full text-left bg-slate-800/90 border border-slate-700 rounded-xl p-4 mt-3 space-y-2.5 shadow-lg">
                <label className="block text-[11px] font-bold text-slate-200">
                  Google Access Token (Bearer Token):
                </label>
                <input
                  type="password"
                  value={manualTokenInput}
                  onChange={(e) => setManualTokenInput(e.target.value)}
                  placeholder="ya29.a0A..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 leading-normal">
                  Masukkan OAuth Access Token sementara dari Google OAuth Playground (Scope: Sheets & Drive) atau Google Cloud CLI.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!manualTokenInput.trim()) return;
                    const dummyUser = { email: 'madeflora.com@gmail.com', displayName: 'Workspace Owner' };
                    setUser(dummyUser);
                    setAccessToken(manualTokenInput.trim());
                    setCachedAccessToken(manualTokenInput.trim());
                    setNeedsAuth(false);
                  }}
                  disabled={!manualTokenInput.trim()}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-md"
                >
                  Masuk dengan Access Token
                </button>
              </div>
            )}

            {/* Workspace disclaimer */}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-5">
              <Lock className="h-3 w-3" />
              Secure Oauth 2.0 Auth Protocol
            </div>

          </div>

        </div>
      </div>
    );
  }

  // Onboarding Wizard if no Spreadsheet linked or user requested project switch
  if (!spreadsheetId || isSwitchingProject) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <SetupWizard 
          accessToken={accessToken!} 
          onProjectConnected={(sid, fid, name) => {
            setIsSwitchingProject(false);
            handleProjectConnected(sid, fid, name);
          }} 
          onCancel={spreadsheetId ? () => setIsSwitchingProject(false) : undefined}
        />
      </div>
    );
  }

  // Loader spinner when fetching spreadsheet values
  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900 mb-2" />
        <p className="text-xs font-semibold text-slate-700">Syncing Master Control Database...</p>
        <p className="text-[10px] text-slate-400 mt-1">Reading schema structures and metrics from Google Sheets...</p>
      </div>
    );
  }

  // Primary Application View Render Layout
  return (
    <div className="min-h-screen bg-slate-50 flex flex-row overflow-hidden font-sans text-slate-800">
      
      {/* Sidebar Navigation & Control Panel */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        spreadsheetId={spreadsheetId}
        projectName={projectName}
        teamMembers={teamMembers}
        logs={logs}
        onAddTeamMember={handleAddTeamMember}
        onDeleteTeamMember={handleDeleteTeamMember}
        isSyncing={isSyncing}
        onManualSync={handleManualSync}
        lastSyncTime={lastSyncTime}
        onSwitchProject={() => setIsSwitchingProject(true)}
        onShareProject={handleShareProject}
      />

      {/* Main Panel views content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        
        {/* Sync Status Banner */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-200/60">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {activeTab === 'dashboard' && 'Dashboard Progress Proyek'}
              {activeTab === 'grid' && 'Spreadsheet Table Register'}
              {activeTab === 'kanban' && 'Workflow Pipeline'}
              {activeTab === 'gantt' && 'Predecessor Timeline Grid'}
              {activeTab === 'risks' && 'Risk & Mitigation Registry'}
              {activeTab === 'docs' && 'Secure Project Attachment Store'}
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {activeTab === 'dashboard' && 'Pemantauan real-time progress fisik, milestone, dan laju jadwal pekerjaan'}
              {activeTab === 'grid' && 'WBS categorized spreadsheet cells inline editor'}
              {activeTab === 'kanban' && 'Workflow stage pipelines and resource loading'}
              {activeTab === 'gantt' && 'Weekly chronological project milestones Gantt schedule'}
              {activeTab === 'risks' && '5x5 hazard analysis matrices register'}
              {activeTab === 'docs' && 'Direct Drive folders and linkers dashboard'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isSyncing && (
              <span className="text-[10px] bg-amber-500/10 text-amber-700 border border-amber-500/20 px-3 py-1.5 rounded-lg font-mono font-bold flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
                Auto-Saving Sheets
              </span>
            )}
            {lastSyncTime && !isSyncing && (
              <span className="text-[10px] bg-white text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200/80 font-mono font-bold">
                Saved: {lastSyncTime}
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Views Navigation Canvas */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'dashboard' && (
              <DashboardView 
                tasks={tasks}
                milestones={milestones}
                teamMembers={teamMembers}
              />
            )}

            {activeTab === 'grid' && (
              <SpreadsheetGrid 
                tasks={tasks}
                teamMembers={teamMembers}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                accessToken={accessToken}
              />
            )}

            {activeTab === 'kanban' && (
              <KanbanBoard 
                tasks={tasks}
                teamMembers={teamMembers}
                onUpdateTask={handleUpdateTask}
                accessToken={accessToken}
              />
            )}

            {activeTab === 'gantt' && (
              <GanttChart 
                tasks={tasks}
                teamMembers={teamMembers}
              />
            )}

            {activeTab === 'risks' && (
              <RiskMatrix 
                risks={risks}
                onAddRisk={handleAddRisk}
                onUpdateRisk={handleUpdateRisk}
                onDeleteRisk={handleDeleteRisk}
              />
            )}

            {activeTab === 'docs' && (
              <DocumentManager 
                accessToken={accessToken!}
                folderId={folderId!}
                tasks={tasks}
                onLinkAttachmentToTask={handleLinkAttachmentToTask}
                onAddLog={addLogEntry}
              />
            )}
          </motion.div>
        </AnimatePresence>

      </main>

      {/* Custom Confirmation Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999]">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-sm overflow-hidden transform transition-all">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-50 text-rose-600 mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-black text-slate-900 mb-2">{confirmState.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{confirmState.message}</p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex flex-row gap-3 justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmState.onConfirm}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md active:scale-[0.98]"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
