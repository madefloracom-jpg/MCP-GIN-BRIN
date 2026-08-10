/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { Task, Milestone, TeamMember, Risk, ActivityLog, DriveFile } from '../types';

export interface ProjectCloudData {
  tasks: Task[];
  milestones: Milestone[];
  teamMembers: TeamMember[];
  risks: Risk[];
  logs: ActivityLog[];
  documents?: DriveFile[];
  lastUpdated?: string;
  updatedBy?: string;
}

/**
 * Saves project data to Cloud Firestore for real-time multi-user team synchronization.
 */
export async function saveToFirestore(
  sheetId: string,
  data: ProjectCloudData,
  updatedByEmail?: string
): Promise<void> {
  if (!sheetId) return;
  try {
    const docRef = doc(db, 'mcp_projects', sheetId);
    const payload = {
      ...data,
      lastUpdated: new Date().toISOString(),
      updatedBy: updatedByEmail || 'Unknown User'
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.warn('Firestore save notice:', err);
  }
}

/**
 * Fetches the latest project data from Cloud Firestore.
 */
export async function fetchFromFirestore(sheetId: string): Promise<ProjectCloudData | null> {
  if (!sheetId) return null;
  try {
    const docRef = doc(db, 'mcp_projects', sheetId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as ProjectCloudData;
    }
  } catch (err) {
    console.warn('Firestore fetch notice:', err);
  }
  return null;
}

/**
 * Subscribes to real-time project updates from Cloud Firestore.
 */
export function subscribeToFirestore(
  sheetId: string,
  onData: (data: ProjectCloudData) => void
): () => void {
  if (!sheetId) return () => {};
  try {
    const docRef = doc(db, 'mcp_projects', sheetId);
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          onData(snap.data() as ProjectCloudData);
        }
      },
      (err) => {
        console.warn('Firestore real-time listener notice:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to Firestore:', err);
    return () => {};
  }
}
