/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderOpen, 
  ExternalLink, 
  Copy, 
  Check, 
  Link, 
  Grid, 
  List,
  Paperclip,
  Trash2,
  FileText,
  AlertCircle,
  UploadCloud,
  Loader2,
  Trash,
  RefreshCw,
  Plus,
  Lock,
  FileUp,
  CloudLightning
} from 'lucide-react';
import { Task, DriveFile } from '../types';
import { uploadFileToDrive, deleteDriveFile, listDriveFolderFiles, extractDriveId } from '../lib/googleApi';

const PROJECT_FOLDER_ID = '1xzgKGg892wvoCZIyxifeFty_d4rRsy_a';

interface DocumentManagerProps {
  accessToken: string;
  folderId: string;
  tasks: Task[];
  syncedDocuments?: DriveFile[];
  deletedDocIds?: string[];
  onAddDocument?: (doc: DriveFile | DriveFile[]) => void;
  onSyncDriveDocuments?: (docs: DriveFile[]) => void;
  onDeleteDocument?: (docId: string, webViewLink?: string) => void;
  onLinkAttachmentToTask: (taskId: string, attachmentUrl: string) => void;
  onAddLog: (action: string, details: string) => void;
  onReauthenticate?: () => Promise<string | null>;
}

export default function DocumentManager({ 
  accessToken,
  folderId,
  tasks = [],
  deletedDocIds = [],
  onAddDocument,
  onDeleteDocument,
  onLinkAttachmentToTask,
  onAddLog,
  onReauthenticate
}: DocumentManagerProps) {
  const [embedLayout, setEmbedLayout] = useState<'list' | 'grid'>('list');
  const [targetTaskId, setTargetTaskId] = useState<string>('');
  const [pastedUrl, setPastedUrl] = useState<string>('');
  
  // File Listing State (from Google Drive API)
  const [apiFiles, setApiFiles] = useState<any[]>([]);
  const [isListingLoading, setIsListingLoading] = useState<boolean>(false);
  const [listingError, setListingError] = useState<string | null>(null);

  // Filter apiFiles against deletedDocIds
  const filteredApiFiles = React.useMemo(() => {
    if (!deletedDocIds || deletedDocIds.length === 0) return apiFiles;
    return apiFiles.filter(file => {
      const fileDriveId = file.id;
      const fileUrl = file.webViewLink;
      
      const isDeleted = deletedDocIds.some(deletedId => {
        if (!deletedId) return false;
        if (deletedId === fileDriveId || deletedId === fileUrl) return true;
        
        // Extract IDs for deep comparison
        const extractedFileId = extractDriveId(fileDriveId) || fileDriveId;
        const extractedDeletedId = extractDriveId(deletedId) || deletedId;
        return extractedFileId === extractedDeletedId;
      });
      return !isDeleted;
    });
  }, [apiFiles, deletedDocIds]);

  // Uploading States
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deletion States
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Toast Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeFolderId = folderId || PROJECT_FOLDER_ID;

  // Retrieve files using Drive API when accessToken is available
  const fetchDriveApiFiles = async (tokenToUse?: string) => {
    const currentToken = tokenToUse || accessToken;
    if (!currentToken) return;

    setIsListingLoading(true);
    setListingError(null);
    try {
      const files = await listDriveFolderFiles(currentToken, activeFolderId);
      setApiFiles(files || []);
    } catch (err: any) {
      console.error('Error listing Drive API files:', err);
      setListingError(err.message || 'Gagal memuat daftar berkas melalui API.');
    } finally {
      setIsListingLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchDriveApiFiles();
    }
  }, [accessToken, activeFolderId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleUploadFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Handles actual file upload using googleApi
  const handleUploadFile = async (file: File) => {
    let tokenToUse = accessToken;
    
    if (!tokenToUse && onReauthenticate) {
      setUploadProgressMsg('Menghubungkan ke Google Account...');
      const newToken = await onReauthenticate();
      if (newToken) {
        tokenToUse = newToken;
      }
    }

    if (!tokenToUse) {
      showToast('Otorisasi akun Google diperlukan untuk mengunggah berkas.');
      return;
    }

    setIsUploading(true);
    setUploadProgressMsg(`Mengunggah "${file.name}" ke Google Drive...`);

    try {
      const result = await uploadFileToDrive(tokenToUse, activeFolderId, file);
      
      // Save newly uploaded document info locally to synced cache
      if (onAddDocument) {
        onAddDocument({
          id: result.fileId,
          name: result.fileName,
          webViewLink: result.webViewLink,
          mimeType: file.type || 'application/octet-stream',
          size: file.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : undefined,
          createdTime: new Date().toISOString()
        });
      }

      onAddLog('Upload Berkas', `Mengunggah berkas "${file.name}" langsung ke Google Drive.`);
      showToast(`Berkas "${file.name}" berhasil diunggah!`);

      // Pre-fill the Link Attachment input form for ease of use
      setPastedUrl(result.webViewLink);

      // Refresh list
      fetchDriveApiFiles(tokenToUse);
    } catch (err: any) {
      // Auto-retry once on authorization expiration
      const isAuthError = err.status === 401 || err.status === 403 || 
                          String(err.message).includes('401') || String(err.message).includes('403') || 
                          String(err.message).toLowerCase().includes('token');

      if (isAuthError && onReauthenticate) {
        try {
          setUploadProgressMsg('Sesi login kedaluwarsa. Memperbarui otorisasi Google...');
          const newToken = await onReauthenticate();
          if (newToken) {
            setUploadProgressMsg('Mengunggah ulang berkas Anda...');
            const retryResult = await uploadFileToDrive(newToken, activeFolderId, file);
            
            if (onAddDocument) {
              onAddDocument({
                id: retryResult.fileId,
                name: retryResult.fileName,
                webViewLink: retryResult.webViewLink,
                mimeType: file.type || 'application/octet-stream',
                size: file.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : undefined,
                createdTime: new Date().toISOString()
              });
            }

            onAddLog('Upload Berkas', `Mengunggah berkas "${file.name}" langsung ke Google Drive setelah perpanjangan sesi.`);
            showToast(`Berkas "${file.name}" berhasil diunggah!`);
            setPastedUrl(retryResult.webViewLink);
            fetchDriveApiFiles(newToken);
            return;
          }
        } catch (retryErr: any) {
          console.error('File upload retry failure:', retryErr);
          showToast(`Gagal mengunggah berkas (Otorisasi Gagal): ${retryErr.message || 'Kesalahan API'}`);
          return;
        }
      }

      console.error('File upload failure:', err);
      showToast(`Gagal mengunggah berkas: ${err.message || 'Kesalahan API'}`);
    } finally {
      setIsUploading(false);
      setUploadProgressMsg('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handles file deletion using API and updates state
  const handleDeleteFile = async (fileId: string, fileName: string, webViewLink: string) => {
    let tokenToUse = accessToken;
    if (!tokenToUse && onReauthenticate) {
      const newToken = await onReauthenticate();
      if (newToken) tokenToUse = newToken;
    }

    if (!tokenToUse) {
      showToast('Otorisasi Google diperlukan untuk menghapus berkas.');
      return;
    }

    setIsDeletingId(fileId);
    try {
      await deleteDriveFile(tokenToUse, fileId, activeFolderId);
      
      // Call prop deletion to clear links and synced state
      if (onDeleteDocument) {
        onDeleteDocument(fileId, webViewLink);
      }

      onAddLog('Hapus Berkas', `Menghapus berkas "${fileName}" dari folder Google Drive.`);
      showToast(`Berkas "${fileName}" berhasil dihapus.`);

      // Refresh list
      fetchDriveApiFiles(tokenToUse);
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.warn('Google Drive API deletion failed, falling back to local hide:', err);
      
      // Fallback: Even if Google API fails (e.g. permission restriction), we hide/unlink it locally!
      if (onDeleteDocument) {
        onDeleteDocument(fileId, webViewLink);
      }
      
      onAddLog('Sembunyikan Berkas', `Melepas/menyembunyikan berkas "${fileName}" dari workspace.`);
      showToast(`Berkas "${fileName}" dilepas dari tampilan karena keterbatasan hak akses Google Drive.`);
      
      // Refresh list
      fetchDriveApiFiles(tokenToUse);
      setDeleteConfirmId(null);
    } finally {
      setIsDeletingId(null);
    }
  };

  // Filter tasks that can accept attachments
  const validTasks = React.useMemo(() => {
    return tasks.filter(t => t && t.id);
  }, [tasks]);

  // Extract all currently active task attachments to display in an elegant table/list
  const activeAttachments = React.useMemo(() => {
    const list: Array<{ taskId: string; taskName: string; wbs: string; url: string; fileName: string }> = [];
    tasks.forEach(t => {
      if (t.attachmentUrl && t.attachmentUrl.trim() !== '') {
        let derivedName = 'Berkas Google Drive';
        list.push({
          taskId: t.id,
          taskName: t.name,
          wbs: t.wbs,
          url: t.attachmentUrl,
          fileName: derivedName
        });
      }
    });
    return list;
  }, [tasks]);

  const handleLinkFileToTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTaskId || !pastedUrl.trim()) return;

    const urlToLink = pastedUrl.trim();
    const task = tasks.find(t => t.id === targetTaskId);
    const taskName = task ? task.name : targetTaskId;

    onLinkAttachmentToTask(targetTaskId, urlToLink);
    onAddLog('Link Attachment', `Menghubungkan berkas ke tugas [${task?.wbs || ''}] ${taskName}.`);

    setPastedUrl('');
    setTargetTaskId('');

    showToast(`Berkas berhasil ditautkan ke tugas "${taskName}"!`);
  };

  const handleQuickLink = (fileUrl: string) => {
    setPastedUrl(fileUrl);
    showToast('Tautan berkas disalin ke formulir tautan tugas di bawah!');
    const formElement = document.getElementById('task-linker-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleUnlink = (taskId: string, taskName: string) => {
    onLinkAttachmentToTask(taskId, '');
    onAddLog('Unlink Attachment', `Melepas tautan berkas dari tugas ${taskName}.`);
    showToast(`Tautan berkas pada "${taskName}" telah dilepas.`);
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleTriggerReauth = async () => {
    if (onReauthenticate) {
      const token = await onReauthenticate();
      if (token) {
        fetchDriveApiFiles(token);
        showToast('Google OAuth berhasil terhubung!');
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-150">
          <div>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Penyimpanan Dokumen Google Drive</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <p className="text-xs text-slate-500">
                Folder Resmi: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">{activeFolderId}</code>
              </p>
              {accessToken ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                  <Check className="h-3 w-3" /> API Google OAuth Aktif
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleTriggerReauth}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-bold cursor-pointer transition-all"
                >
                  <Lock className="h-3 w-3" /> Klik untuk Hubungkan Google Drive API
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-100 p-1 rounded-lg flex items-center border border-slate-200">
              <button
                type="button"
                onClick={() => setEmbedLayout('list')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  embedLayout === 'list' 
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Daftar
              </button>
              <button
                type="button"
                onClick={() => setEmbedLayout('grid')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  embedLayout === 'grid' 
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="h-3.5 w-3.5" />
                Grid
              </button>
            </div>

            <a
              href={`https://drive.google.com/drive/folders/${activeFolderId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Buka Google Drive
            </a>
          </div>
        </div>

        {/* Real-time Document Management Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-1">
          
          {/* Main Embedded Drive View */}
          <div className="xl:col-span-2 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800">
              <span className="font-medium flex items-center gap-1.5">
                <CloudLightning className="h-4 w-4 text-blue-600" />
                Penjelajah Folder Google Drive interaktif terintegrasi langsung di bawah ini.
              </span>
            </div>

            {/* Embedded Drive Frame */}
            <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
              <iframe
                key={`drive-embed-${embedLayout}`}
                src={`https://drive.google.com/embeddedfolderview?id=${activeFolderId}#${embedLayout}`}
                className="w-full h-[480px] border-0"
                title="Google Drive Live Folder"
              />
            </div>
          </div>

          {/* Upload and Delete Control Panel */}
          <div className="space-y-4">
            
            {/* Direct Upload Area */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <UploadCloud className="h-4 w-4 text-blue-600" />
                  Unggah Berkas Baru
                </h3>
                {isUploading && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-600 font-bold animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" /> Sedang Mengunggah
                  </span>
                )}
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`border-2 border-dashed rounded-lg p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-2 ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50/60' 
                    : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
                
                {isUploading ? (
                  <div className="py-4 space-y-2 flex flex-col items-center">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                    <p className="text-[11px] font-semibold text-blue-700 max-w-[200px] leading-snug">
                      {uploadProgressMsg}
                    </p>
                  </div>
                ) : (
                  <>
                    <FileUp className="h-8 w-8 text-slate-400" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-700">Tarik berkas Anda di sini</p>
                      <p className="text-[10px] text-slate-400">atau klik untuk menelusuri komputer</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Folder Files API View / Deletion list */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-[280px]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  <span className="font-bold text-xs text-slate-800">Daftar Berkas & Aksi Hapus</span>
                </div>
                <button
                  type="button"
                  onClick={() => accessToken && fetchDriveApiFiles()}
                  disabled={!accessToken || isListingLoading}
                  className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 rounded-md hover:bg-slate-50 transition-all cursor-pointer"
                  title="Segarkan daftar berkas"
                >
                  <RefreshCw className={`h-3 w-3 ${isListingLoading ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              </div>

              {!accessToken ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-2">
                  <Lock className="h-6 w-6 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-700">Google API Belum Terkoneksi</span>
                  <p className="text-[10px] text-slate-400 leading-normal max-w-[200px]">
                    Hubungkan akun Google Drive Anda untuk melihat berkas secara terprogram dan menghapusnya.
                  </p>
                  <button
                    type="button"
                    onClick={handleTriggerReauth}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[10px] shadow-sm cursor-pointer transition-all mt-1"
                  >
                    Hubungkan API Sekarang
                  </button>
                </div>
              ) : isListingLoading && filteredApiFiles.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                  <span className="text-[10px] text-slate-500 mt-2 font-medium">Memuat berkas...</span>
                </div>
              ) : listingError ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-rose-600 space-y-1">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-[10px] font-bold">Kesalahan Memuat Berkas</span>
                  <p className="text-[9px] leading-relaxed text-rose-500">{listingError}</p>
                </div>
              ) : filteredApiFiles.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-slate-400 space-y-1">
                  <FolderOpen className="h-6 w-6 text-slate-300" />
                  <span className="text-[10px] font-semibold text-slate-600">Folder Kosong</span>
                  <p className="text-[9px] text-slate-400 leading-normal max-w-[180px]">
                    Gunakan panel atas untuk mengunggah atau drag-and-drop dokumen pertama Anda.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {filteredApiFiles.map(file => (
                    <div 
                      key={file.id} 
                      className="p-2 border border-slate-100 bg-slate-50/50 rounded-lg hover:bg-slate-100/60 transition-all flex items-center justify-between gap-2 text-[10px]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-700 truncate" title={file.name}>
                          {file.name}
                        </div>
                        <p className="text-[8px] text-slate-400 mt-0.5">
                          MIME: {file.mimeType.split('/').pop()} {file.size ? `• ${file.size}` : ''}
                        </p>
                      </div>

                      {deleteConfirmId === file.id ? (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file.id, file.name, file.webViewLink)}
                            disabled={isDeletingId === file.id}
                            className="px-2 py-0.5 bg-rose-600 text-white hover:bg-rose-700 rounded text-[9px] font-bold transition-all border border-rose-600 cursor-pointer shadow-xs"
                          >
                            {isDeletingId === file.id ? 'Menghapus...' : 'Ya, Hapus'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            disabled={isDeletingId === file.id}
                            className="px-1.5 py-0.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded text-[9px] font-medium transition-all border border-slate-200 cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleQuickLink(file.webViewLink)}
                            className="px-1.5 py-0.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded text-[9px] font-bold transition-all border border-blue-100 cursor-pointer"
                            title="Tautkan berkas ini ke tugas di bawah"
                          >
                            Tautkan
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(file.id)}
                            className="p-1 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded border border-rose-100 transition-all cursor-pointer"
                            title="Hapus berkas dari Google Drive"
                          >
                            <Trash className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Linking & Attachments Panel */}
      <div id="task-linker-form" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Link Form Panel */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-fit space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Paperclip className="h-4 w-4 text-blue-600" />
              Tautkan Berkas ke Tugas
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-medium">
              Salin tautan berkas dari folder Google Drive di atas, atau klik tombol <strong>"Tautkan"</strong> pada daftar berkas, lalu kaitkan dengan tugas Master Control Plan.
            </p>
          </div>

          <form onSubmit={handleLinkFileToTaskSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">Pilih Tugas / Kegiatan:</label>
              <select
                required
                value={targetTaskId}
                onChange={e => setTargetTaskId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">-- Pilih Tugas Target --</option>
                {validTasks.map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.wbs}] {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">Tautan Berkas Google Drive:</label>
              <input
                type="url"
                required
                placeholder="https://drive.google.com/file/d/..."
                value={pastedUrl}
                onChange={e => setPastedUrl(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-[9px] text-slate-400 font-medium">
                Tip: Pastikan akses diatur agar dapat diakses oleh publik/tim BRIN.
              </p>
            </div>

            <button
              type="submit"
              disabled={!targetTaskId || !pastedUrl.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-1"
            >
              <Link className="h-3.5 w-3.5" />
              Tautkan ke Kegiatan
            </button>
          </form>
        </div>

        {/* Linked Attachments List */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-800">Daftar Lampiran Terhubung ({activeAttachments.length})</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Semua dokumen Google Drive yang saat ini ditautkan ke kegiatan Master Control Plan.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[360px] space-y-2.5 pr-1 min-h-[220px]">
            {activeAttachments.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center space-y-2">
                <Paperclip className="h-7 w-7 text-slate-350" />
                <span className="text-xs font-bold text-slate-600">Belum Ada Lampiran Terhubung</span>
                <p className="text-[10px] text-slate-400 max-w-xs leading-normal">
                  Gunakan formulir di sebelah kiri untuk menautkan tautan dokumen Google Drive ke tugas atau kegiatan proyek.
                </p>
              </div>
            ) : (
              activeAttachments.map(att => (
                <div 
                  key={att.taskId} 
                  className="p-3 border border-slate-150 bg-slate-50/40 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg flex-shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-150">
                          {att.wbs}
                        </span>
                        <h4 className="font-bold text-xs text-slate-800 truncate max-w-sm" title={att.taskName}>
                          {att.taskName}
                        </h4>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-1 max-w-xs sm:max-w-md font-mono" title={att.url}>
                        {att.url}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button 
                      onClick={() => copyToClipboard(att.url, att.taskId)}
                      className="p-1.5 bg-white text-slate-600 hover:bg-slate-900 hover:text-white rounded-lg transition-all border border-slate-200 cursor-pointer"
                      title="Salin tautan"
                    >
                      {copiedId === att.taskId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                    <a 
                      href={att.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-1.5 bg-white text-slate-600 hover:bg-slate-900 hover:text-white rounded-lg transition-all border border-slate-200 flex items-center justify-center"
                      title="Buka Berkas"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button 
                      onClick={() => handleUnlink(att.taskId, att.taskName)}
                      className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-lg transition-all border border-rose-200 cursor-pointer"
                      title="Hapus Tautan"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 z-50 animate-bounce border border-slate-800">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
