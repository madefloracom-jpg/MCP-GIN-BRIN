/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TaskStatus = 'To Do' | 'Not Started' | 'In Progress' | 'Completed';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type TaskPriority = 'Urgent' | 'High' | 'Normal' | 'Low';
export type MilestoneStatus = 'Pending' | 'Achieved' | 'Missed';
export type RiskStatus = 'Active' | 'Mitigated' | 'Closed';

export interface SubtaskItem {
  id: string;
  title: string;
  completed: boolean;
  assignee?: string;
  priority?: TaskPriority | '';
}

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  assignee?: string;
}

export interface ChecklistGroup {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface AgendaItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  location?: string;
  notes?: string;
  attendees?: string[];
  googleEventId?: string;
  googleEventLink?: string;
  syncedAt?: string;
}

export interface TaskActivityItem {
  id: string;
  type: 'comment' | 'internal_note' | 'status_change' | 'attachment' | 'ai_summary';
  user: string;
  userAvatar?: string;
  userRole?: string;
  timestamp: string;
  content?: string;
  text?: string;
  fromStatus?: TaskStatus;
  toStatus?: TaskStatus;
  attachmentName?: string;
  attachmentUrl?: string;
  attachments?: { name: string; url?: string }[];
  isInternalNote?: boolean;
}

export interface Task {
  id: string;
  wbs: string;
  name: string;
  status: TaskStatus;
  priority?: TaskPriority | '' | null;
  progress: number; // 0 - 100
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  duration: number; // days
  assignees: string[]; // List of team member emails
  predecessors: string[]; // List of task IDs
  budget: number;
  actualCost: number;
  riskLevel: RiskLevel;
  notes: string;
  attachmentUrl: string;
  subtasks?: SubtaskItem[];
  checklists?: ChecklistGroup[];
  agendas?: AgendaItem[];
  activities?: TaskActivityItem[];
}

export interface Milestone {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  status: MilestoneStatus;
  notes: string;
}

export interface TeamMember {
  email: string;
  name: string;
  role: string;
  avatarUrl: string;
}

export interface Risk {
  id: string;
  title: string;
  probability: number; // 1-5
  impact: number; // 1-5
  mitigation: string;
  status: RiskStatus;
}

export interface ActivityLog {
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface MCPProject {
  id: string;
  name: string;
  description: string;
  spreadsheetId: string;
  folderId: string;
  createdAt: string;
  updatedAt: string;
}
