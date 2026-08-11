/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  Upload, 
  Paperclip, 
  Trash2, 
  ExternalLink, 
  Copy, 
  FileText, 
  Image, 
  FileSpreadsheet, 
  FileArchive, 
  File, 
  Loader2, 
  Check, 
  Search,
  Link,
  ChevronDown,
  X,
  AlertTriangle
} from 'lucide-react';
import { uploadFileToDrive, listDriveFolderFiles, deleteDriveFile } from '../lib/googleApi';
import { Task, DriveFile } from '../types';

interface DocumentManagerProps {
  accessToken: string;
  folderId: string;
  tasks: Task[];
  syncedDocuments?: DriveFile[];
  onAddDocument?: (doc: DriveFile | DriveFile[]) => void;
  onDeleteDocument?: (docId: string, webViewLink?: string) => void;
  onLinkAttachmentToTask: (taskId: string, attachmentUrl: string) => void;
  onAddLog: (action: string, details: string) => void;
}

export function extractDriveId(str?: string): string {
  if (!str) return '';
  const clean = str.trim();
  const dMatch = clean.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) return dMatch[1];
  const idMatch = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];
  return clean;
}

export function isSameDriveFile(a: DriveFile, b: DriveFile): boolean {
  if (!a || !b) return false;
  const idA = extractDriveId(a.id) || extractDriveId(a.webViewLink);
  const idB = extractDriveId(b.id) || extractDriveId(b.webViewLink);
  if (idA && idB && idA === idB) return true;
  if (a.webViewLink && b.webViewLink && a.webViewLink === b.webViewLink) return true;
  if (a.name && b.name && a.name === b.name && (a.size === b.size || a.mimeType === b.mimeType)) return true;
  return false;
}

export function isDeletedDriveFile(doc: DriveFile, deletedKeys: Set<string>): boolean {
  if (!doc) return false;
  const docId = doc.id;
  const webLink = doc.webViewLink;
  const driveId = extractDriveId(docId) || extractDriveId(webLink);

  if (docId && deletedKeys.has(docId)) return true;
  if (webLink && deletedKeys.has(webLink)) return true;
  if (driveId && deletedKeys.has(driveId)) return true;

  for (const k of deletedKeys) {
    if (docId && (docId.includes(k) || k.includes(docId))) return true;
    if (webLink && (webLink.includes(k) || k.includes(webLink))) return true;
    if (driveId && (driveId.includes(k) || k.includes(driveId))) return true;
  }
  return false;
}

export default function DocumentManager({ 
  accessToken, 
  folderId, 
  tasks, 
  syncedDocuments = [],
  onAddDocument,
  onDeleteDocument,
  onLinkAttachmentToTask,
  onAddLog
}: DocumentManagerProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [deletedKeys, setDeletedKeys] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('mcp_deleted_docs');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<DriveFile | null>(null);
  const [deleteError, setDeleteError] = useState<any>(null);
  const [linkSuccessToast, setLinkSuccessToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<any>(null);
  const [listError, setListError] = useState<any>(null);

  // Task linking helper state
  const [selectedFileToLink, setSelectedFileToLink] = useState<DriveFile | null>(null);
  const [targetTaskId, setTargetTaskId] = useState<string>('');

  const markKeyDeleted = (key: string) => {
    if (!key) return;
    setDeletedKeys(prev => {
      const next = new Set(prev);
      const driveId = extractDriveId(key);
      next.add(key);
      if (driveId) next.add(driveId);
      try {
        localStorage.setItem('mcp_deleted_docs', JSON.stringify(Array.from(next)));
      } catch (e) {
        console.warn('Failed to save deleted docs to localStorage:', e);
      }
      return next;
    });
  };

  useEffect(() => {
    fetchFolderFiles();
  }, [folderId, accessToken]);

  const fetchFolderFiles = async () => {
    setIsLoading(true);
    setListError(null);
    try {
      if (accessToken && folderId) {
        const driveFiles = await listDriveFolderFiles(accessToken, folderId);
        const validDriveFiles = driveFiles.filter(f => !isDeletedDriveFile(f, deletedKeys));
        setFiles(validDriveFiles);

        // Only sync drive files to Firestore if syncedDocuments is completely uninitialized
        if (validDriveFiles.length > 0 && (!syncedDocuments || syncedDocuments.length === 0) && onAddDocument) {
          onAddDocument(validDriveFiles);
        }
      } else {
        setFiles([]);
      }
    } catch (err: any) {
      console.error('Failed to list files:', err);
      setListError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const targetFile = fileList[0];

    setIsUploading(true);
    setUploadError(null);

    let driveResult: { fileId: string; fileName: string; webViewLink: string } | null = null;

    if (accessToken && folderId) {
      try {
        driveResult = await uploadFileToDrive(accessToken, folderId, targetFile);
      } catch (err: any) {
        console.warn('Google Drive upload error, falling back to local/synced attachment:', err);
        setUploadError(err);
      }
    }

    try {
      const docId = driveResult?.fileId || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const docName = driveResult?.fileName || targetFile.name;
      const webViewLink = driveResult?.webViewLink || (driveResult?.fileId ? `https://drive.google.com/file/d/${driveResult.fileId}/view` : URL.createObjectURL(targetFile));

      const newDoc: DriveFile = {
        id: docId,
        name: docName,
        mimeType: targetFile.type || 'application/octet-stream',
        webViewLink: webViewLink,
        size: String(targetFile.size),
        createdTime: new Date().toISOString()
      };

      // Add to local state immediately
      setFiles(prev => [newDoc, ...prev.filter(f => !isSameDriveFile(f, newDoc))]);

      // Sync across team via Firestore & localStorage mcp_cache
      if (onAddDocument) {
        onAddDocument(newDoc);
      }

      onAddLog('Document Upload', `Uploaded file "${docName}" to project attachments.`);
    } catch (err: any) {
      console.error('Upload handling error:', err);
      setUploadError(err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Extract all task attachments and activity attachments from tasks prop
  const taskAttachments: DriveFile[] = React.useMemo(() => {
    const result: DriveFile[] = [];
    (tasks || []).forEach(t => {
      if (t.attachmentUrl && t.attachmentUrl.trim() !== '') {
        const lower = t.attachmentUrl.toLowerCase();
        let mime = 'application/octet-stream';
        if (lower.includes('.pdf')) mime = 'application/pdf';
        else if (lower.includes('.png') || lower.includes('.jpg') || lower.includes('.jpeg')) mime = 'image/png';
        else if (lower.includes('spreadsheet') || lower.includes('.csv') || lower.includes('.xlsx')) mime = 'application/vnd.google-apps.spreadsheet';

        result.push({
          id: `task-att-${t.id}`,
          name: `[${t.wbs}] ${t.name} (Lampiran Tugas)`,
          mimeType: mime,
          webViewLink: t.attachmentUrl,
          size: 'Task Link',
          createdTime: new Date().toISOString()
        });
      }

      if (t.activities && Array.isArray(t.activities)) {
        t.activities.forEach(act => {
          if (act.attachmentUrl && act.attachmentUrl.trim() !== '') {
            result.push({
              id: `act-att-${act.id}`,
              name: act.attachmentName || `[${t.wbs}] Lampiran Aktivitas`,
              mimeType: 'application/octet-stream',
              webViewLink: act.attachmentUrl,
              size: 'Aktivitas',
              createdTime: act.timestamp || new Date().toISOString()
            });
          }
          if (act.attachments && Array.isArray(act.attachments)) {
            act.attachments.forEach((att, idx) => {
              if (att.url && att.url.trim() !== '') {
                result.push({
                  id: `act-att-${act.id}-${idx}`,
                  name: att.name || `[${t.wbs}] Lampiran Aktivitas #${idx + 1}`,
                  mimeType: 'application/octet-stream',
                  webViewLink: att.url,
                  size: 'Aktivitas',
                  createdTime: act.timestamp || new Date().toISOString()
                });
              }
            });
          }
        });
      }
    });
    return result;
  }, [tasks]);

  // Combine files from Firestore (syncedDocuments), task attachments, and Drive API with strict deduplication
  const allFiles = React.useMemo(() => {
    const list: DriveFile[] = [];

    const addIfUnique = (doc: DriveFile) => {
      if (!doc || isDeletedDriveFile(doc, deletedKeys)) return;
      const exists = list.some(item => isSameDriveFile(item, doc));
      if (!exists) {
        list.push(doc);
      }
    };

    // 1. Primary source: Synced documents from Firestore (SSOT for all users)
    (syncedDocuments || []).forEach(sd => addIfUnique(sd));

    // 2. Secondary source: Task attachments
    taskAttachments.forEach(ta => addIfUnique(ta));

    // 3. Tertiary source: Files from Drive API (only if syncedDocuments is uninitialized)
    if (!syncedDocuments || syncedDocuments.length === 0) {
      files.forEach(f => addIfUnique(f));
    }

    return list;
  }, [files, syncedDocuments, taskAttachments, deletedKeys]);

  const filteredFiles = allFiles.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderDriveErrorNotice = (err: any) => {
    if (!err) return null;
    const errMsg = typeof err === 'string' ? err : (err.message || String(err));
    const isDriveDisabled = errMsg.includes('drive.googleapis.com') || errMsg.includes('Google Drive API') || errMsg.includes('Drive API');
    const isDisabled = isDriveDisabled || errMsg.includes('SERVICE_DISABLED') || errMsg.includes('has not been used');
    const isPermissionDenied = errMsg.includes('403') || errMsg.includes('permission') || errMsg.includes('Permission');

    const activationUrl = err?.activationUrl || 'https://console.developers.google.com/apis/api/drive.googleapis.com/overview';

    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs shadow-xs space-y-2.5 my-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-bold text-amber-900 text-sm block mb-1">
              {isDisabled ? 'Google Drive API Belum Diaktifkan' : 'Gagal Mengakses Google Drive'}
            </span>
            <p className="text-amber-800 leading-relaxed font-mono text-[11px] bg-amber-100/70 p-2 rounded-lg border border-amber-200/80 break-words max-h-32 overflow-y-auto">
              {errMsg}
            </p>
          </div>
        </div>

        {isDisabled ? (
          <div className="pt-2 border-t border-amber-200/80 space-y-2">
            <p className="text-amber-900 text-xs font-medium">
              Layanan <strong className="font-bold">Google Drive API</strong> belum diaktifkan pada Google Cloud Console project ini.
            </p>
            <a
              href={activationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow-xs transition-all text-xs"
            >
              Aktifkan Google Drive API Sekarang
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <p className="text-[11px] text-amber-700 italic">
              *Setelah tombol [ENABLE] diklik di Google Console, tunggu 1-2 menit lalu coba upload kembali.
            </p>
          </div>
        ) : isPermissionDenied ? (
          <div className="pt-2 border-t border-amber-200/80 space-y-2">
            <p className="text-amber-900 text-xs font-medium">
              Akun Google yang digunakan belum memiliki izin tulis/baca ke folder Google Drive ini.
            </p>
            <p className="text-[11px] text-amber-800">
              Minta pemilik folder untuk membagikan akses folder (ID: <code className="font-mono bg-amber-100 px-1 rounded">{folderId}</code>) dengan peran Editor ke email Anda.
            </p>
          </div>
        ) : null}
      </div>
    );
  };

  const executeDeleteFile = async () => {
    if (!fileToDelete) return;
    const fileId = fileToDelete.id;
    const fileName = fileToDelete.name;
    const webViewLink = fileToDelete.webViewLink;

    setDeletingFileId(fileId);
    setDeleteError(null);
    setUploadError(null);

    // Track in deletedKeys & localStorage to guarantee it vanishes from UI list permanently
    if (fileId) markKeyDeleted(fileId);
    if (webViewLink) markKeyDeleted(webViewLink);
    const driveId = extractDriveId(fileId) || extractDriveId(webViewLink);
    if (driveId) markKeyDeleted(driveId);

    // Remove from local files state immediately
    setFiles(prev => prev.filter(f => !isSameDriveFile(f, fileToDelete)));

    // Remove from App state & Firestore & localStorage mcp_cache
    if (onDeleteDocument) {
      onDeleteDocument(fileId, webViewLink);
    }

    try {
      const isVirtualId = fileId.startsWith('doc-') || fileId.startsWith('task-att-') || fileId.startsWith('act-att-');
      if (!isVirtualId && accessToken) {
        await deleteDriveFile(accessToken, fileId, folderId);
      }
      onAddLog('Document Delete', `Menghapus berkas "${fileName}" dari lampiran proyek.`);
      setFileToDelete(null);
    } catch (err: any) {
      console.warn('Drive deletion warning (file removed from local/synced storage):', err);
      setFileToDelete(null);
    } finally {
      setDeletingFileId(null);
    }
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleLinkFileToTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFileToLink || !targetTaskId) return;

    onLinkAttachmentToTask(targetTaskId, selectedFileToLink.webViewLink);
    onAddLog('Link Attachment', `Linked file "${selectedFileToLink.name}" to task "${targetTaskId}".`);
    
    setSelectedFileToLink(null);
    setTargetTaskId('');
    setLinkSuccessToast(`Berkas "${selectedFileToLink.name}" berhasil ditautkan ke tugas.`);
    setTimeout(() => setLinkSuccessToast(null), 3500);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
    if (mimeType.includes('image')) return <Image className="h-6 w-6 text-blue-500" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('csv')) return <FileSpreadsheet className="h-6 w-6 text-emerald-500" />;
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar')) return <FileArchive className="h-6 w-6 text-purple-500" />;
    return <File className="h-6 w-6 text-slate-500" />;
  };

  const formatBytes = (bytesStr?: string) => {
    if (!bytesStr) return 'Unknown size';
    const bytes = parseInt(bytesStr);
    if (isNaN(bytes)) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Upload Panel */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-fit">
        <div>
          <h3 className="font-bold text-sm text-slate-800">Drive Cloud Storage</h3>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Upload file attachments to Google Drive folder</p>
        </div>

        {uploadError && renderDriveErrorNotice(uploadError)}

        {/* Upload Button Component */}
        <div className="my-6">
          <label className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isUploading 
              ? 'bg-slate-50/50 border-slate-300 pointer-events-none' 
              : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50/20'
          }`}>
            <input 
              type="file" 
              onChange={handleFileUpload} 
              className="hidden" 
              disabled={isUploading}
            />
            
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 text-slate-900 animate-spin mb-3" />
                <span className="text-xs font-bold text-slate-800">Uploading File to Drive</span>
                <span className="text-[10px] text-slate-400 mt-1">Authenticating chunk stream...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="p-3 bg-slate-100 text-slate-600 rounded-xl mb-3">
                  <Upload className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-slate-800">Select Document To Upload</span>
                <span className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                  Files upload directly to the specific Drive folder and become linkable to tasks.
                </span>
              </div>
            )}
          </label>
        </div>

        {/* Drive Info Badge */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
          <FolderOpen className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
          <div className="text-[10px] leading-relaxed text-slate-600 font-semibold">
            <span className="text-slate-900 block font-bold mb-0.5">Control Storage Location</span>
            ID: <span className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[9px] text-slate-700">{folderId}</span>
            <p className="mt-1">
              Documents are shared based on user Drive access credentials to preserve enterprise confidentiality bounds.
            </p>
          </div>
        </div>
      </div>

      {/* Attachments List */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
        
        {/* Search header */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pb-4 border-b border-slate-200 mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-800">Uploaded Attachments ({files.length})</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Manage references, specifications, sheets and images</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-250 px-3 py-1.5 rounded-lg w-full sm:w-48 text-xs">
            <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <input 
              type="text" 
              placeholder="Filter by name..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-[11px] text-slate-800 focus:outline-none bg-transparent"
            />
          </div>
        </div>

        {listError && renderDriveErrorNotice(listError)}

        {/* Files grid scroll area */}
        <div className="flex-1 overflow-y-auto max-h-[380px] space-y-3.5 pr-1">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin mb-3 text-slate-600" />
              <p className="text-xs font-semibold">Listing folder contents...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              No files uploaded under this project folder. Upload a file on the left panel to populate list.
            </div>
          ) : (
            filteredFiles.map(f => (
              <div 
                key={f.id} 
                className="p-3.5 border border-slate-200 bg-white rounded-xl hover:shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    {getFileIcon(f.mimeType)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-800 truncate" title={f.name}>
                      {f.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {formatBytes(f.size)} • {new Date(f.createdTime).toLocaleDateString(undefined, { dateStyle: 'short' })}
                    </p>
                  </div>
                </div>

                {/* Operations */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button 
                    onClick={() => setSelectedFileToLink(f)}
                    className="p-1.5 bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white rounded-lg transition-all text-[10px] font-bold flex items-center gap-1 border border-slate-200"
                    title="Link document to task"
                  >
                    <Link className="h-3 w-3" /> Link Task
                  </button>
                  <button 
                    onClick={() => copyToClipboard(f.webViewLink, f.id)}
                    className="p-1.5 bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white rounded-lg transition-all border border-slate-200"
                    title="Copy URL"
                  >
                    {copiedId === f.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                  <a 
                    href={f.webViewLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-1.5 bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white rounded-lg transition-all border border-slate-200"
                    title="Open in Google Drive"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <button 
                    onClick={() => { setDeleteError(null); setFileToDelete(f); }}
                    disabled={deletingFileId === f.id}
                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-lg transition-all disabled:opacity-50"
                    title="Hapus berkas"
                  >
                    {deletingFileId === f.id ? (
                      <Loader2 className="h-3 w-3 animate-spin text-rose-600" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* ================= LINK SUCCESS TOAST ================= */}
      {linkSuccessToast && (
        <div className="fixed bottom-5 right-5 bg-emerald-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 z-50 animate-bounce">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{linkSuccessToast}</span>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/70">
              <div className="flex items-center gap-2 text-rose-700">
                <Trash2 className="h-4 w-4 text-rose-600" />
                <h3 className="font-bold text-sm">Hapus Berkas</h3>
              </div>
              <button 
                onClick={() => { setFileToDelete(null); setDeleteError(null); }} 
                className="p-1 text-slate-400 hover:text-slate-900 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus berkas ini dari folder Google Drive proyek?
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-2xs">
                  {getFileIcon(fileToDelete.mimeType)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-slate-900 block truncate">{fileToDelete.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {formatBytes(fileToDelete.size)} • {fileToDelete.createdTime ? new Date(fileToDelete.createdTime).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>

              {deleteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold block mb-0.5">Gagal Menghapus Berkas</span>
                    <p className="text-[11px] font-mono break-words">{typeof deleteError === 'string' ? deleteError : (deleteError.message || String(deleteError))}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => { setFileToDelete(null); setDeleteError(null); }}
                  disabled={deletingFileId === fileToDelete.id}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  onClick={executeDeleteFile}
                  disabled={deletingFileId === fileToDelete.id}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
                >
                  {deletingFileId === fileToDelete.id ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      Ya, Hapus Berkas
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= LINK FILE TO TASK MODAL ================= */}
      {selectedFileToLink && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-sm">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <h3 className="font-bold text-sm text-slate-900">Link Document To Task</h3>
              <button onClick={() => setSelectedFileToLink(null)} className="p-1 text-slate-400 hover:text-slate-900 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLinkFileToTaskSubmit} className="p-5 space-y-4">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">Document Selected:</span>
                <span className="font-bold text-xs text-slate-800 block truncate">{selectedFileToLink.name}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Task Target</label>
                <select 
                  value={targetTaskId} 
                  onChange={e => setTargetTaskId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                  required
                >
                  <option value="">-- Choose Control Task --</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>
                      [{t.wbs}] {t.name.length > 32 ? t.name.slice(0, 30) + '...' : t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setSelectedFileToLink(null)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-md"
                >
                  Link Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
