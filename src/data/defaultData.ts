/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task, Milestone, TeamMember, Risk, ActivityLog } from '../types';

export const INITIAL_BRIN_TASKS: Task[] = [
  {
    id: 'TSK-001',
    wbs: '1.0',
    name: 'Fase Inisiasi & Perencanaan Strategis Master Control Plan BRIN',
    status: 'In Progress',
    priority: 'Urgent',
    progress: 80,
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    duration: 30,
    assignees: ['madeflora.com@gmail.com', 'mcp.lead@brin.go.id'],
    predecessors: [],
    budget: 75000000,
    actualCost: 55000000,
    riskLevel: 'Medium',
    notes: 'Inisiasi integrasi paket riset dan fasilitas laboratorium BRIN',
    attachmentUrl: '',
    subtasks: [
      { id: 'SUB-001', title: 'Penyusunan KAK & RAB Terpadu', completed: true, priority: 'High' },
      { id: 'SUB-002', title: 'Kajian Legalitas & DIPA Anggaran 2026', completed: true, priority: 'High' },
      { id: 'SUB-003', title: 'Finalisasi Matriks Risiko Proyek', completed: false, priority: 'Urgent' }
    ],
    checklists: [
      {
        id: 'CHK-GRP-1',
        title: 'Kelengkapan Administrasi Inisiasi',
        items: [
          { id: 'CHK-1', title: 'SK Tim Kerja MCP BRIN', completed: true },
          { id: 'CHK-2', title: 'Draft MoU Konsortium Riset', completed: true },
          { id: 'CHK-3', title: 'Persetujuan Pejabat Pembuat Komitmen', completed: false }
        ]
      }
    ]
  },
  {
    id: 'TSK-002',
    wbs: '1.1',
    name: 'Penyusunan Kerangka Kerja (TOR & RAB Master Control Plan)',
    status: 'Completed',
    priority: 'High',
    progress: 100,
    startDate: '2026-07-01',
    endDate: '2026-07-15',
    duration: 15,
    assignees: ['mcp.lead@brin.go.id'],
    predecessors: [],
    budget: 30000000,
    actualCost: 28000000,
    riskLevel: 'Low',
    notes: 'Selesai disahkan oleh Pejabat Komitmen BRIN',
    attachmentUrl: '',
    subtasks: [],
    checklists: []
  },
  {
    id: 'TSK-003',
    wbs: '1.2',
    name: 'Analisis Risiko & Pemetaan Stakeholder Riset',
    status: 'In Progress',
    priority: 'Urgent',
    progress: 60,
    startDate: '2026-07-16',
    endDate: '2026-07-31',
    duration: 15,
    assignees: ['madeflora.com@gmail.com'],
    predecessors: ['TSK-002'],
    budget: 45000000,
    actualCost: 27000000,
    riskLevel: 'High',
    notes: 'Identifikasi potensi hambatan rantai pasok komoditas pengadaan laboratorium',
    attachmentUrl: '',
    subtasks: [],
    checklists: []
  },
  {
    id: 'TSK-004',
    wbs: '2.0',
    name: 'Fase Pengadaan Peralatan & Fasilitas Laboratorium Terpadu',
    status: 'In Progress',
    priority: 'High',
    progress: 35,
    startDate: '2026-08-01',
    endDate: '2026-10-15',
    duration: 75,
    assignees: ['mcp.logistics@brin.go.id'],
    predecessors: ['TSK-001'],
    budget: 250000000,
    actualCost: 85000000,
    riskLevel: 'High',
    notes: 'Proses lelang elektronik dan verifikasi spesifikasi teknis',
    attachmentUrl: '',
    subtasks: [
      { id: 'SUB-201', title: 'Riset Vendor Alat Presisi Tinggi', completed: true, priority: 'Normal' },
      { id: 'SUB-202', title: 'Penerbitan Dokumen Kontrak Pengadaan', completed: false, priority: 'Urgent' }
    ],
    checklists: []
  },
  {
    id: 'TSK-005',
    wbs: '2.1',
    name: 'Pengadaan Spektrometer & Sensor Presisi',
    status: 'In Progress',
    priority: 'Urgent',
    progress: 40,
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    duration: 30,
    assignees: ['mcp.logistics@brin.go.id'],
    predecessors: ['TSK-003'],
    budget: 150000000,
    actualCost: 60000000,
    riskLevel: 'High',
    notes: 'Pengiriman impor komponen sensor membutuhkan clearance pabean khusus',
    attachmentUrl: '',
    subtasks: [],
    checklists: []
  },
  {
    id: 'TSK-006',
    wbs: '3.0',
    name: 'Pengujian, Kalibrasi & Validasi Output Riset',
    status: 'To Do',
    priority: 'Normal',
    progress: 0,
    startDate: '2026-10-16',
    endDate: '2026-12-15',
    duration: 60,
    assignees: ['madeflora.com@gmail.com'],
    predecessors: ['TSK-004'],
    budget: 100000000,
    actualCost: 0,
    riskLevel: 'Medium',
    notes: 'Pengujian integrasi sistem sesuai standar ISO/IEC 17025',
    attachmentUrl: '',
    subtasks: [],
    checklists: []
  }
];

export const INITIAL_BRIN_MILESTONES: Milestone[] = [
  {
    id: 'MLS-001',
    name: 'Persetujuan Dokumen TOR & RAB Master Control Plan',
    date: '2026-07-15',
    status: 'Achieved',
    notes: 'Dokumen disahkan oleh Koordinator Tim MCP BRIN'
  },
  {
    id: 'MLS-002',
    name: 'Kick-off Pengadaan Alat Laboratorium Terpadu',
    date: '2026-08-01',
    status: 'Pending',
    notes: 'Pembukaan paket pengadaan via LPSE'
  },
  {
    id: 'MLS-003',
    name: 'Laporan Progres Evaluasi Mid-Year BRIN 2026',
    date: '2026-09-30',
    status: 'Pending',
    notes: 'Presentasi hasil pengujian parsial ke Dewan Pengarah'
  }
];

export const INITIAL_BRIN_TEAM: TeamMember[] = [
  {
    email: 'madeflora.com@gmail.com',
    name: 'Made Flora',
    role: 'Project Director / Lead Manager',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=madeflora'
  },
  {
    email: 'mcp.lead@brin.go.id',
    name: 'Dr. Ahmad Sutrisno',
    role: 'Koordinator Riset BRIN',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ahmad'
  },
  {
    email: 'mcp.logistics@brin.go.id',
    name: 'Siti Rahmawati, M.Sc.',
    role: 'Manajer Pengadaan & Logistik',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=siti'
  }
];

export const INITIAL_BRIN_RISKS: Risk[] = [
  {
    id: 'RSK-001',
    title: 'Keterlambatan Pengadaan Peralatan Import Laboratorium',
    probability: 4,
    impact: 4,
    mitigation: 'Melakukan percepatan dokumen perizinan impor & pre-order vendor terverifikasi',
    status: 'Active'
  },
  {
    id: 'RSK-002',
    title: 'Perubahan Regulasi DIPA & Penyesuaian Pagu Anggaran',
    probability: 2,
    impact: 5,
    mitigation: 'Penyediaan cadangan alokasi prioritas WBS dan penyesuaian jadwal eksekusi',
    status: 'Mitigated'
  },
  {
    id: 'RSK-003',
    title: 'Mismatch Spesifikasi Sensor Pengujian Teknis',
    probability: 3,
    impact: 3,
    mitigation: 'Uji independen sampel di laboratorium pembanding sebelum serah terima',
    status: 'Active'
  }
];

export const INITIAL_BRIN_LOGS: ActivityLog[] = [
  {
    timestamp: new Date().toISOString(),
    user: 'System Init',
    action: 'Master Control Plan Initialized',
    details: 'Initial database set up for BRIN Master Control Plan Project'
  }
];
