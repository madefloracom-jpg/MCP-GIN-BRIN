/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FolderPlus, 
  FileSpreadsheet, 
  Database, 
  Users, 
  Settings, 
  History, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  Search,
  Check,
  X,
  Link2,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  initializeDriveFolder, 
  initializeSpreadsheet, 
  searchMcpSpreadsheets 
} from '../lib/googleApi';

interface SetupWizardProps {
  accessToken: string;
  onProjectConnected: (spreadsheetId: string, folderId: string, name: string) => void;
  onCancel?: () => void;
}

function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export default function SetupWizard({ accessToken, onProjectConnected, onCancel }: SetupWizardProps) {
  const [mode, setMode] = useState<'create' | 'connect'>('create');
  const [projectName, setProjectName] = useState('BRIN Master Control Plan 2026');
  const [projectDesc, setProjectDesc] = useState('Perencanaan fase 1, pelacakan jadwal, log keuangan, dan pengendalian risiko proyek.');
  
  // Create project status
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [initError, setInitError] = useState<string | null>(null);

  // Search existing projects state
  const [isSearching, setIsSearching] = useState(false);
  const [existingProjects, setExistingProjects] = useState<Array<{ id: string; name: string; createdTime: string; modifiedTime?: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const DEFAULT_SPREADSHEET_ID = '1HKqMhFXy2cE0xgUQsBzKNwzUgwsEL9mupVctKseQGnU';
  const DEFAULT_DRIVE_FOLDER_ID = '1xzgKGg892wvoCZIyxifeFty_d4rRsy_a';
  const [manualUrlOrId, setManualUrlOrId] = useState(DEFAULT_SPREADSHEET_ID);
  const [connectError, setConnectError] = useState<any>(null);
  const [searchError, setSearchError] = useState<any>(null);

  // Search spreadsheets on mount and when connecting tab active
  useEffect(() => {
    if (mode === 'connect') {
      fetchExistingProjects();
    }
  }, [mode]);

  const fetchExistingProjects = async () => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const sheets = await searchMcpSpreadsheets(accessToken);
      setExistingProjects(sheets);
    } catch (err: any) {
      console.error('Failed to search spreadsheets:', err);
      setSearchError(err);
    } finally {
      setIsSearching(false);
    }
  };

  const steps = [
    { label: 'Secure Drive Folder', icon: FolderPlus, desc: 'Creating folder "MCP Attachments" for file storage.' },
    { label: 'Control Spreadsheet', icon: FileSpreadsheet, desc: 'Instantiating new database spreadsheet in Google Drive.' },
    { label: 'Database Configurations', icon: Settings, desc: 'Injecting metadata schema, tables, and system variables.' },
    { label: 'Enterprise Styling', icon: Sparkles, desc: 'Formatting sheet headers, freezing rows, setting double borders.' },
    { label: 'Team Registration', icon: Users, desc: 'Registering administrative access control records.' },
    { label: 'Audit Log Ingestion', icon: History, desc: 'Writing initial database seed rows and validation logs.' }
  ];

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setIsInitializing(true);
    setInitError(null);
    setActiveStep(0);

    try {
      // Step 1: Create Drive Folder
      const folderId = await initializeDriveFolder(accessToken, projectName);
      setActiveStep(1);

      // Step 2, 3, 4, 5, 6: Initialize spreadsheet
      const { spreadsheetId } = await initializeSpreadsheet(accessToken, projectName, projectDesc, folderId);
      setActiveStep(6);

      setTimeout(() => {
        onProjectConnected(spreadsheetId, folderId, projectName);
      }, 800);

    } catch (err: any) {
      console.error('Initialization Error:', err);
      setInitError(err.message || 'An unexpected error occurred during database setup.');
      setIsInitializing(false);
    }
  };

  const handleConnectProject = async (overrideId?: string) => {
    const targetSheetId = overrideId || selectedSheetId || extractSpreadsheetId(manualUrlOrId);
    if (!targetSheetId) return;

    setIsSearching(true);
    setConnectError(null);
    try {
      let name = '';
      const selected = existingProjects.find(p => p.id === targetSheetId);
      if (selected) {
        name = selected.name.replace('Master Control Plan (MCP) - ', '');
      }

      let folderId = '';
      let projectNameFromConfig = '';

      try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/_mcp_config_!A:B`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.ok) {
          const data = await response.json();
          const rows = data.values || [];
          rows.forEach((row: string[]) => {
            if (row[0] === 'project_name' && row[1]) projectNameFromConfig = row[1];
            if (row[0] === 'folder_id' && row[1]) folderId = row[1];
          });
        }
      } catch {
        // ignore config fetch error
      }

      if (projectNameFromConfig) {
        name = projectNameFromConfig;
      }

      if (!name) {
        try {
          const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}?fields=properties.title`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (metaRes.ok) {
            const meta = await metaRes.json();
            if (meta.properties?.title) {
              name = meta.properties.title.replace('Master Control Plan (MCP) - ', '');
            }
          }
        } catch {
          // ignore metadata error
        }
      }

      if (!name) name = 'Connected Control Plan';

      if (!folderId) {
        folderId = DEFAULT_DRIVE_FOLDER_ID;
      }

      onProjectConnected(targetSheetId, folderId, name);
    } catch (err: any) {
      console.error('Connect Error:', err);
      setConnectError(err);
    } finally {
      setIsSearching(false);
    }
  };

  const renderApiErrorNotice = (err: any, onRetry?: () => void) => {
    if (!err) return null;
    const errMsg = typeof err === 'string' ? err : (err.message || String(err));
    const isDriveDisabled = errMsg.includes('drive.googleapis.com') || errMsg.includes('Google Drive API') || errMsg.includes('Drive API');
    const isSheetsDisabled = errMsg.includes('sheets.googleapis.com') || errMsg.includes('Google Sheets API') || errMsg.includes('Sheets API');
    const isDisabled = isDriveDisabled || isSheetsDisabled || errMsg.includes('SERVICE_DISABLED') || errMsg.includes('has not been used');

    const activationUrl = err?.activationUrl || (
      isDriveDisabled 
        ? 'https://console.developers.google.com/apis/api/drive.googleapis.com/overview'
        : 'https://console.developers.google.com/apis/api/sheets.googleapis.com/overview'
    );

    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs shadow-xs space-y-2.5 my-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-bold text-amber-900 text-sm block mb-1">
              {isDisabled ? 'Google API Belum Diaktifkan di Cloud Console' : 'Gagal Terhubung ke Google Workspace'}
            </span>
            <p className="text-amber-800 leading-relaxed font-mono text-[11px] bg-amber-100/70 p-2 rounded-lg border border-amber-200/80 break-words max-h-32 overflow-y-auto">
              {errMsg}
            </p>
          </div>
        </div>

        {isDisabled && (
          <div className="pt-2 border-t border-amber-200/80 space-y-2">
            <p className="text-amber-900 text-xs font-medium">
              Layanan <strong className="font-bold">{isDriveDisabled ? 'Google Drive API' : 'Google Sheets API'}</strong> belum aktif pada Project Google Cloud yang digunakan oleh akun/aplikasi ini.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={activationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow-xs transition-all text-xs"
              >
                Aktifkan {isDriveDisabled ? 'Google Drive API' : 'Google Sheets API'} Sekarang
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="px-3.5 py-2 bg-white hover:bg-amber-100/80 border border-amber-300 text-amber-900 rounded-lg font-bold transition-all text-xs"
                >
                  Coba Lagi / Pindai
                </button>
              )}
            </div>
            <p className="text-[11px] text-amber-700 italic">
              *Setelah mengklik [ENABLE] di Google Console, harap tunggu 1–2 menit agar propagasi API selesai, lalu klik "Coba Lagi / Pindai".
            </p>
          </div>
        )}
      </div>
    );
  };

  const filteredProjects = existingProjects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex items-center justify-center min-h-[85vh] p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-8 relative">
          <div className="absolute right-6 top-6 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-mono font-medium flex items-center gap-1.5 animate-pulse-slow">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            Google Workspace Database
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Master Control Plan (MCP)</h1>
          <p className="text-slate-400 mt-1.5 text-sm max-w-xl">
            Sistem manajemen proyek terpadu: penjadwalan WBS, estimasi biaya, matriks risiko, dan direktori lampiran langsung tersinkronkan ke Google Workspace.
          </p>
        </div>

        {/* Loading overlay when initializing */}
        {isInitializing ? (
          <div className="p-8 md:p-12">
            <div className="flex flex-col items-center justify-center mb-8">
              <Loader2 className="h-10 w-10 text-slate-800 animate-spin mb-3" />
              <h2 className="text-lg font-semibold text-slate-900">Mempersiapkan Workspace Proyek</h2>
              <p className="text-sm text-slate-500 mt-1">Membuat tabel Google Sheets dan folder penyimpanan Google Drive...</p>
            </div>

            <div className="space-y-4 max-w-xl mx-auto">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isCompleted = activeStep > idx;
                const isActive = activeStep === idx;
                return (
                  <div 
                    key={idx}
                    className={`flex items-start gap-4 p-3.5 rounded-xl border transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                        : isActive 
                          ? 'bg-slate-50 border-slate-300 shadow-sm text-slate-900 scale-[1.01]' 
                          : 'bg-transparent border-slate-100 text-slate-400'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isCompleted ? 'bg-emerald-100 text-emerald-600' : isActive ? 'bg-slate-200 text-slate-700 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                      {isCompleted ? <Check className="h-4.5 w-4.5" /> : <Icon className="h-4.5 w-4.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm flex items-center gap-2">
                        {step.label}
                        {isActive && <span className="text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded uppercase font-mono tracking-wider animate-pulse">Running</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {initError && renderApiErrorNotice(initError)}
          </div>
        ) : (
          <div>
            {/* Mode Switch Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              <button 
                type="button"
                onClick={() => setMode('create')}
                className={`flex-1 py-4 px-4 text-center text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${
                  mode === 'create' 
                    ? 'border-slate-900 text-slate-900 bg-white shadow-xs' 
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                <FolderPlus className="h-4 w-4" />
                Buat Control Plan Baru
              </button>
              <button 
                type="button"
                onClick={() => setMode('connect')}
                className={`flex-1 py-4 px-4 text-center text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${
                  mode === 'connect' 
                    ? 'border-slate-900 text-slate-900 bg-white shadow-xs' 
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Hubungkan Sheet Yang Ada
              </button>
            </div>

            {/* Content body */}
            <div className="p-8">
              {mode === 'create' ? (
                <form onSubmit={handleCreateProject} className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-slate-800">Nama Control Plan / Proyek Baru</label>
                      <span className="text-[11px] font-mono text-slate-500">Wajib Diisi</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={projectName}
                        onChange={e => setProjectName(e.target.value)}
                        placeholder="Contoh: Pembangunan Fasilitas Riset BRIN 2026"
                        className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all font-semibold text-sm text-slate-900 bg-white pr-10 shadow-xs"
                        required
                        autoFocus
                      />
                      {projectName && (
                        <button
                          type="button"
                          onClick={() => setProjectName('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
                          title="Hapus teks"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Nama ini akan digunakan sebagai nama Spreadsheet Google Sheets dan Folder Google Drive Anda.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-2">Deskripsi Proyek (Opsional)</label>
                    <textarea 
                      value={projectDesc}
                      onChange={e => setProjectDesc(e.target.value)}
                      placeholder="Jelaskan ringkasan lingkup kerja, ruang lingkup WBS, atau pemilik proyek..."
                      rows={3}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-sm text-slate-800 resize-none bg-white shadow-xs"
                    />
                  </div>

                  <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-200/80">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Otomatisasi Google Workspace yang akan dibuat:
                    </h4>
                    <ul className="text-xs text-slate-600 space-y-1.5 ml-1">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                        Spreadsheet Google Sheets baru dengan 6 tab tabel terstruktur (WBS, Milestones, Tim, Risiko, Logs).
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                        Format tampilan profesional (header berwarna, pembatas tabel, dan aturan progres).
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                        Folder khusus penyimpanan lampiran dokumen di Google Drive.
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-center gap-3">
                    {onCancel && (
                      <button 
                        type="button"
                        onClick={onCancel}
                        className="px-5 py-3.5 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm transition-all"
                      >
                        Batal
                      </button>
                    )}
                    <button 
                      type="submit"
                      disabled={!projectName.trim()}
                      className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed active:scale-[0.99] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
                    >
                      Buat Control Plan & Database Workspace
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  {(connectError || searchError) && renderApiErrorNotice(connectError || searchError, fetchExistingProjects)}

                  {/* Multi-user tip */}
                  <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-blue-950 text-xs flex items-start gap-2.5">
                    <Users className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold text-blue-900 block">Ingin Terhubung ke Control Plan Milik Rekan / Akun Lain?</span>
                      <p className="text-[11px] text-blue-800 leading-relaxed">
                        Pastikan pemilik file di Google Drive telah membagikan hak akses (<em>Editor</em>) ke akun Google Anda atau mengklik tombol <strong>"Bagikan Link & Akses Proyek"</strong> di sidebar mereka. Lalu tempelkan link/ID Spreadsheet di bawah ini.
                      </p>
                    </div>
                  </div>

                  {/* Manual Link/ID Input */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Link2 className="h-3.5 w-3.5 text-blue-600" />
                        Tempel URL / ID Google Sheet Langsung
                      </label>
                      <button
                        type="button"
                        onClick={() => setManualUrlOrId(DEFAULT_SPREADSHEET_ID)}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline"
                      >
                        Gunakan ID Default
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={manualUrlOrId}
                        onChange={e => setManualUrlOrId(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/1HKqMhFX... / ID Spreadsheet"
                        className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
                      />
                      <button
                        type="button"
                        disabled={!manualUrlOrId.trim() || isSearching}
                        onClick={() => handleConnectProject(extractSpreadsheetId(manualUrlOrId))}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1.5 flex-shrink-0"
                      >
                        Hubungkan Link
                      </button>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-slate-200 w-full"></div>
                    <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute">Atau Pilih Dari Google Drive</span>
                  </div>

                  {/* Drive Search Bar */}
                  <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-xs">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Cari Spreadsheet di Google Drive Anda..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full text-sm text-slate-800 focus:outline-none bg-transparent font-medium"
                    />
                    <button
                      type="button"
                      onClick={fetchExistingProjects}
                      className="text-xs text-blue-600 font-semibold hover:underline flex-shrink-0 ml-1"
                    >
                      Pindai Ulang
                    </button>
                  </div>

                  {isSearching ? (
                    <div className="py-10 flex flex-col items-center justify-center text-slate-400">
                      <Loader2 className="h-8 w-8 animate-spin mb-3 text-slate-600" />
                      <p className="text-sm font-medium">Memindai Spreadsheet di Google Drive...</p>
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <div className="py-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-center px-4">
                      <FileSpreadsheet className="h-10 w-10 text-slate-300 mb-2" />
                      <p className="text-sm font-bold text-slate-700">Tidak Ada Spreadsheet Ditemukan</p>
                      <p className="text-xs mt-1 text-slate-500 max-w-sm">
                        Anda dapat membuat Control Plan baru di tab "Buat Control Plan Baru" atau menempelkan link Google Sheet di atas.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                      {filteredProjects.map((p) => {
                        const isSelected = selectedSheetId === p.id;
                        const displayDate = p.modifiedTime || p.createdTime;
                        return (
                          <div 
                            key={p.id}
                            onClick={() => setSelectedSheetId(p.id)}
                            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                              isSelected 
                                ? 'border-slate-900 bg-slate-50/90 shadow-xs' 
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={`p-2 rounded-lg ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                <FileSpreadsheet className="h-4.5 w-4.5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-xs text-slate-800 truncate">{p.name}</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                                  Diperbarui: {displayDate ? new Date(displayDate).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                                </p>
                              </div>
                            </div>
                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300'
                            }`}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    {onCancel && (
                      <button 
                        type="button"
                        onClick={onCancel}
                        className="px-5 py-3.5 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm transition-all"
                      >
                        Batal
                      </button>
                    )}
                    <button 
                      type="button"
                      disabled={!selectedSheetId || isSearching}
                      onClick={() => handleConnectProject()}
                      className={`flex-1 py-3.5 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                        selectedSheetId && !isSearching
                          ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-[0.99]'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
                      }`}
                    >
                      Hubungkan Control Plan Yang Dipilih
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

