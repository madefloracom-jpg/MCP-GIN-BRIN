/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task } from '../types';

/**
 * Checks if a task is a parent task (has sub-tasks under its WBS).
 * A task with WBS "1.1" is a parent if another task has WBS starting with "1.1.".
 */
export function isParentTask(taskWbs: string, allTasks: Task[]): boolean {
  if (!taskWbs) return false;
  const prefix = taskWbs + '.';
  return allTasks.some(t => t.wbs && t.wbs.startsWith(prefix));
}

/**
 * Gets immediate direct children of a parent task.
 * Direct children are those starting with `parentWbs + '.'` with no other intermediate task.
 */
export function getDirectChildren(parentWbs: string, allTasks: Task[]): Task[] {
  if (!parentWbs) return [];
  const prefix = parentWbs + '.';
  return allTasks.filter(c => {
    if (!c.wbs || !c.wbs.startsWith(prefix)) return false;
    
    // Check if there is an intermediate task in allTasks
    const isIndirect = allTasks.some(i => 
      i.wbs &&
      i.wbs !== parentWbs && 
      i.wbs !== c.wbs && 
      c.wbs.startsWith(i.wbs + '.') && 
      i.wbs.startsWith(prefix)
    );
    return !isIndirect;
  });
}

/**
 * Bottom-up recursive rollup computation for hierarchical WBS tasks.
 * Auto-schedules parent tasks based on their child tasks.
 */
export function applyWbsRollups(tasks: Task[]): Task[] {
  if (!tasks || tasks.length === 0) return [];

  // Create a deep copy of tasks to avoid mutating state directly
  const tasksCopy = tasks.map(t => ({ ...t }));
  
  // Create a map for quick lookup
  const taskMap = new Map<string, Task>();
  tasksCopy.forEach(t => taskMap.set(t.id, t));

  // Determine WBS depth of each task to compute bottom-up
  // Tasks with deeper WBS (e.g. 1.1.1.1) are processed first
  const sortedByDepth = [...tasksCopy].sort((a, b) => {
    const depthA = (a.wbs || '').split('.').length;
    const depthB = (b.wbs || '').split('.').length;
    return depthB - depthA;
  });

  // Keep track of which tasks are parents
  const parentWbsSet = new Set<string>();
  tasksCopy.forEach(t => {
    if (t.wbs) {
      tasksCopy.forEach(other => {
        if (other.id !== t.id && other.wbs && other.wbs.startsWith(t.wbs + '.')) {
          parentWbsSet.add(t.wbs);
        }
      });
    }
  });

  // Process bottom-up
  sortedByDepth.forEach(tempTask => {
    if (!tempTask.wbs || !parentWbsSet.has(tempTask.wbs)) {
      // Leaf task, keep its own values
      return;
    }

    const currentAllTasks = Array.from(taskMap.values());
    const directChildren = getDirectChildren(tempTask.wbs, currentAllTasks);

    if (directChildren.length > 0) {
      // It's a parent! Roll up metrics.
      let minStartMs = Infinity;
      let maxEndMs = -Infinity;
      let totalBudget = 0;
      let totalActualCost = 0;
      let totalProgress = 0;
      let progressCount = 0;

      directChildren.forEach(c => {
        // Handle start date
        if (c.startDate) {
          const sTime = new Date(c.startDate).getTime();
          if (!isNaN(sTime) && sTime < minStartMs) {
            minStartMs = sTime;
          }
        }
        
        // Handle end date
        if (c.endDate) {
          const eTime = new Date(c.endDate).getTime();
          if (!isNaN(eTime) && eTime > maxEndMs) {
            maxEndMs = eTime;
          }
        }

        // Handle numeric aggregates
        totalBudget += Number(c.budget) || 0;
        totalActualCost += Number(c.actualCost) || 0;

        // Handle progress average
        totalProgress += Number(c.progress) || 0;
        progressCount++;
      });

      const updatedTask = taskMap.get(tempTask.id)!;

      // 1. Roll up dates (Auto-scheduling)
      if (minStartMs !== Infinity) {
        updatedTask.startDate = new Date(minStartMs).toISOString().split('T')[0];
      }
      if (maxEndMs !== -Infinity) {
        updatedTask.endDate = new Date(maxEndMs).toISOString().split('T')[0];
      }

      // 2. Roll up duration
      if (minStartMs !== Infinity && maxEndMs !== -Infinity) {
        const duration = Math.max(1, Math.ceil((maxEndMs - minStartMs) / (1000 * 60 * 60 * 24)));
        updatedTask.duration = duration;
      }

      // 3. Roll up budget and actual costs
      updatedTask.budget = totalBudget;
      updatedTask.actualCost = totalActualCost;

      // 4. Roll up progress
      const avgProgress = progressCount > 0 ? Math.round(totalProgress / progressCount) : 0;
      updatedTask.progress = avgProgress;

      // 5. Roll up logical status
      if (avgProgress === 100) {
        updatedTask.status = 'Completed';
      } else if (avgProgress === 0) {
        updatedTask.status = 'To Do';
      } else {
        updatedTask.status = 'In Progress';
      }
    }
  });

  // Map back to original order of tasks
  return tasks.map(orig => taskMap.get(orig.id) || orig);
}
