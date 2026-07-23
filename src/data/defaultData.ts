/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task, Milestone, TeamMember, Risk, ActivityLog } from '../types';

export const INITIAL_BRIN_TASKS: Task[] = [
  {
    id: 'TSK-5947',
    wbs: '1.1',
    name: 'Persiapan Pengumpulan Data',
    status: 'Completed',
    priority: 'Urgent',
    progress: 100,
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    duration: 30,
    assignees: ['madeflora.com@gmail.com'],
    predecessors: [],
    budget: 25000000,
    actualCost: 25000000,
    riskLevel: 'Low',
    notes: 'Persiapan instrumen dan verifikasi metode pengumpulan data lapangan',
    attachmentUrl: '',
    subtasks: [
      { id: 'SUB-5947-1', title: 'Penyusunan KAK & Pedoman Lapangan', completed: true, priority: 'High' },
      { id: 'SUB-5947-2', title: 'Verifikasi Tim Observer', completed: true, priority: 'Normal' }
    ],
    checklists: [
      {
        id: 'CHK-GRP-1',
        title: 'Kelengkapan Dokumen Inisiasi',
        items: [
          { id: 'CHK-1', title: 'Surat Tugas Tim BRIN', completed: true },
          { id: 'CHK-2', title: 'Formulir Kuesioner Terverifikasi', completed: true }
        ]
      }
    ]
  },
  {
    id: 'TSK-1333',
    wbs: '1.2',
    name: 'Analisis Kebijakan dan Regulasi',
    status: 'In Progress',
    priority: 'High',
    progress: 50,
    startDate: '2026-05-01',
    endDate: '2026-05-31',
    duration: 31,
    assignees: ['madeflora.com@gmail.com'],
    predecessors: ['TSK-5947'],
    budget: 40000000,
    actualCost: 20000000,
    riskLevel: 'Medium',
    notes: 'Kajian komparatif regulasi dan penyusunan rekomendasi kebijakan',
    attachmentUrl: '',
    subtasks: [
      { id: 'SUB-1333-1', title: 'Review Regulasi Sektor Terkait', completed: true, priority: 'High' },
      { id: 'SUB-1333-2', title: 'Drafting Naskah Akademik', completed: false, priority: 'Urgent' }
    ],
    checklists: []
  }
];

export const INITIAL_BRIN_MILESTONES: Milestone[] = [
  {
    id: 'MLS-001',
    name: 'Persetujuan Dokumen TOR & RAB Master Control Plan',
    date: '2026-04-30',
    status: 'Achieved',
    notes: 'Dokumen disahkan oleh Koordinator Tim MCP BRIN'
  },
  {
    id: 'MLS-002',
    name: 'Penerbitan Draft Naskah Rekomendasi Kebijakan',
    date: '2026-05-31',
    status: 'Pending',
    notes: 'Penyampaian laporan kajian ke instansi pembina'
  }
];

export const INITIAL_BRIN_TEAM: TeamMember[] = [
  {
    email: 'madeflora.com@gmail.com',
    name: 'Made Flora',
    role: 'Project Director / Lead Manager',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=madeflora'
  }
];

export const INITIAL_BRIN_RISKS: Risk[] = [
  {
    id: 'RSK-001',
    title: 'Keterlambatan Respon Stakeholder Lapangan',
    probability: 3,
    impact: 4,
    mitigation: 'Melakukan koordinasi resmi dengan instansi daerah dan fasilitasi digital',
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
