/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Task, 
  Milestone, 
  TeamMember, 
  Risk, 
  ActivityLog, 
  MCPProject,
  TaskStatus,
  RiskLevel,
  MilestoneStatus,
  RiskStatus
} from '../types';

// Standard sheet names
const SHEETS = {
  CONFIG: '_mcp_config_',
  TASKS: 'tasks',
  MILESTONES: 'milestones',
  TEAM: 'team_members',
  RISKS: 'risks',
  LOGS: 'activity_log'
};

// Help helper to call APIs with retries for transient 5xx or rate limit errors
async function apiFetch(url: string, accessToken: string, options: RequestInit = {}, retries = 3) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const errText = await response.text();
        console.error(`API Error on URL ${url} (Attempt ${attempt + 1}/${retries + 1}):`, errText);
        
        let detailedMsg = errText;
        let activationUrl = '';

        try {
          const parsed = JSON.parse(errText);
          if (parsed.error?.message) {
            detailedMsg = parsed.error.message;
          }
          if (parsed.error?.details) {
            for (const detail of parsed.error.details) {
              if (detail.metadata?.activationUrl) {
                activationUrl = detail.metadata.activationUrl;
              }
              if (detail.links) {
                for (const link of detail.links) {
                  if (link.url) activationUrl = link.url;
                }
              }
            }
          }
        } catch {
          // ignore JSON parse error
        }

        // If activationUrl not found in details, check if there is a URL in message
        if (!activationUrl) {
          const urlMatch = detailedMsg.match(/https:\/\/(console\.developers\.google\.com|console\.cloud\.google\.com)\/[^\s'"]+/);
          if (urlMatch) {
            activationUrl = urlMatch[0];
          } else if (detailedMsg.includes('drive.googleapis.com') || detailedMsg.includes('Google Drive API')) {
            activationUrl = 'https://console.developers.google.com/apis/api/drive.googleapis.com/overview';
          } else if (detailedMsg.includes('sheets.googleapis.com') || detailedMsg.includes('Google Sheets API')) {
            activationUrl = 'https://console.developers.google.com/apis/api/sheets.googleapis.com/overview';
          }
        }

        const err: any = new Error(`Google API Error (${response.status}): ${detailedMsg}`);
        err.status = response.status;
        err.rawResponse = errText;
        if (activationUrl) err.activationUrl = activationUrl;

        // Retry on 5xx server errors or 429 rate limit errors if attempts remain
        if ((response.status >= 500 || response.status === 429) && attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          continue;
        }

        throw err;
      }
      return await response.json();
    } catch (e: any) {
      lastError = e;
      if ((!e.status || e.status >= 500 || e.status === 429) && attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}

/**
 * Shares a Google Drive file/spreadsheet so that anyone with the link can edit it,
 * allowing multi-user collaboration across different Google accounts.
 */
export async function shareFileWithAnyone(accessToken: string, fileId: string): Promise<boolean> {
  try {
    await apiFetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        role: 'writer',
        type: 'anyone'
      })
    });
    return true;
  } catch (err) {
    console.warn(`Could not set public permissions on file ${fileId}:`, err);
    return false;
  }
}

/**
 * Creates an enterprise-styled Google Drive folder for project attachments
 */
export async function initializeDriveFolder(accessToken: string, projectName: string): Promise<string> {
  const metadata = {
    name: `MCP Attachments - ${projectName}`,
    mimeType: 'application/vnd.google-apps.folder',
    description: `Media storage and attachments folder for Master Control Plan (MCP): ${projectName}. Do not delete.`
  };

  const data = await apiFetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', accessToken, {
    method: 'POST',
    body: JSON.stringify(metadata)
  });

  // Automatically make attachments folder accessible to anyone with link
  await shareFileWithAnyone(accessToken, data.id);

  return data.id;
}

/**
 * Creates and formats an enterprise-grade Google Sheet with visual styles, freeze frames, and schemas
 */
export async function initializeSpreadsheet(
  accessToken: string, 
  projectName: string, 
  projectDesc: string,
  folderId: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  
  // 1. Create a blank spreadsheet
  const createMetadata = {
    properties: {
      title: `Master Control Plan (MCP) - ${projectName}`
    }
  };

  const sheetData = await apiFetch('https://sheets.googleapis.com/v4/spreadsheets', accessToken, {
    method: 'POST',
    body: JSON.stringify(createMetadata)
  });

  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // Automatically make spreadsheet database accessible to anyone with link for multi-user collaboration
  await shareFileWithAnyone(accessToken, spreadsheetId);

  // 2. We need to format the spreadsheet:
  // - Rename Sheet1 to _mcp_config_
  // - Add tasks, milestones, team_members, risks, activity_log sheets
  // - Set up nice styling (frozen headers, bold text, gray background for headers, custom widths)
  
  const currentSheetId = sheetData.sheets[0].properties.sheetId;

  const batchRequests = [
    // Rename default sheet to _mcp_config_
    {
      updateSheetProperties: {
        properties: {
          sheetId: currentSheetId,
          title: SHEETS.CONFIG,
          gridProperties: { hideGridlines: false }
        },
        fields: 'title,gridProperties.hideGridlines'
      }
    },
    // Add tasks sheet
    { addSheet: { properties: { title: SHEETS.TASKS, gridProperties: { hideGridlines: false, frozenRowCount: 1 } } } },
    // Add milestones sheet
    { addSheet: { properties: { title: SHEETS.MILESTONES, gridProperties: { hideGridlines: false, frozenRowCount: 1 } } } },
    // Add team_members sheet
    { addSheet: { properties: { title: SHEETS.TEAM, gridProperties: { hideGridlines: false, frozenRowCount: 1 } } } },
    // Add risks sheet
    { addSheet: { properties: { title: SHEETS.RISKS, gridProperties: { hideGridlines: false, frozenRowCount: 1 } } } },
    // Add activity_log sheet
    { addSheet: { properties: { title: SHEETS.LOGS, gridProperties: { hideGridlines: false, frozenRowCount: 1 } } } }
  ];

  const updateResult = await apiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ requests: batchRequests })
  });

  // Extract sheet IDs for styling
  const sheetsInfo = updateResult.replies;
  const sheetIds: Record<string, number> = {
    [SHEETS.CONFIG]: currentSheetId,
    [SHEETS.TASKS]: sheetsInfo[1].addSheet.properties.sheetId,
    [SHEETS.MILESTONES]: sheetsInfo[2].addSheet.properties.sheetId,
    [SHEETS.TEAM]: sheetsInfo[3].addSheet.properties.sheetId,
    [SHEETS.RISKS]: sheetsInfo[4].addSheet.properties.sheetId,
    [SHEETS.LOGS]: sheetsInfo[5].addSheet.properties.sheetId,
  };

  // 3. Write Headers and Initial Config values
  const nowStr = new Date().toISOString();
  const configValues = [
    ['Key', 'Value'],
    ['project_name', projectName],
    ['project_description', projectDesc],
    ['folder_id', folderId],
    ['created_at', nowStr],
    ['updated_at', nowStr]
  ];

  const taskHeaders = [[
    'ID', 'WBS', 'Task Name', 'Status', 'Progress (%)', 'Start Date', 'End Date', 
    'Duration (Days)', 'Assignees', 'Predecessors', 'Budget', 'Actual Cost', 'Risk Level', 'Notes', 'Attachment URL', 'Priority', 'Subtasks', 'Checklists'
  ]];

  const milestoneHeaders = [[
    'ID', 'Milestone Name', 'Target Date', 'Status', 'Notes'
  ]];

  const teamHeaders = [[
    'Email', 'Name', 'Role', 'Avatar URL'
  ]];

  const riskHeaders = [[
    'ID', 'Risk Title', 'Probability (1-5)', 'Impact (1-5)', 'Mitigation Plan', 'Status'
  ]];

  const logHeaders = [[
    'Timestamp', 'User', 'Action', 'Details'
  ]];

  // Write all headers in parallel
  await Promise.all([
    writeSheetValues(accessToken, spreadsheetId, `'${SHEETS.CONFIG}'!A1`, configValues),
    writeSheetValues(accessToken, spreadsheetId, `'${SHEETS.TASKS}'!A1`, taskHeaders),
    writeSheetValues(accessToken, spreadsheetId, `'${SHEETS.MILESTONES}'!A1`, milestoneHeaders),
    writeSheetValues(accessToken, spreadsheetId, `'${SHEETS.TEAM}'!A1`, teamHeaders),
    writeSheetValues(accessToken, spreadsheetId, `'${SHEETS.RISKS}'!A1`, riskHeaders),
    writeSheetValues(accessToken, spreadsheetId, `'${SHEETS.LOGS}'!A1`, logHeaders)
  ]);

  // Seed default admin team member if desired
  const defaultTeam = [
    ['madeflora.id@gmail.com', 'Made Flora', 'Project Director', 'https://api.dicebear.com/7.x/adventurer/svg?seed=MadeFlora']
  ];
  await writeSheetValues(accessToken, spreadsheetId, `'${SHEETS.TEAM}'!A2`, defaultTeam);

  // Seed default active log
  const defaultLog = [
    [nowStr, 'System Init', 'Database Created', `Master Control Plan initialized for ${projectName}`]
  ];
  await writeSheetValues(accessToken, spreadsheetId, `'${SHEETS.LOGS}'!A2`, defaultLog);

  // 4. Style headers to look super professional (Enterprise Dark Theme Headers)
  const styleRequests: any[] = [];

  // Style helper for header rows
  Object.keys(sheetIds).forEach(sheetName => {
    const sId = sheetIds[sheetName];
    // Formatter for top row header
    styleRequests.push({
      repeatCell: {
        range: {
          sheetId: sId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: sheetName === SHEETS.TASKS ? 15 : sheetName === SHEETS.MILESTONES ? 5 : sheetName === SHEETS.RISKS ? 6 : 4
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.11, green: 0.16, blue: 0.24 }, // Dark Navy Blue (#1c283c)
            textFormat: {
              foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 }, // White
              bold: true,
              fontSize: 10,
              fontFamily: 'Arial'
            },
            alignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            borders: {
              bottom: { style: 'DOUBLE', color: { red: 0.8, green: 0.8, blue: 0.8 } }
            }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,alignment,verticalAlignment,borders)'
      }
    });

    // Auto-resize columns or set specific sizes
    styleRequests.push({
      autoResizeDimensions: {
        dimensions: {
          sheetId: sId,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: 15
        }
      }
    });
  });

  await apiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ requests: styleRequests })
  });

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Reads data from a single sheet range with error resilience
 */
async function readSheetValues(accessToken: string, spreadsheetId: string, range: string): Promise<any[][]> {
  try {
    const data = await apiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, accessToken);
    return data.values || [];
  } catch (err: any) {
    console.warn(`Warning: failed to read range ${range}:`, err);
    if (err.status >= 400) {
      console.error(`Error reading range ${range}, returning empty array fallback.`);
      return [];
    }
    throw err;
  }
}

/**
 * Reads multiple sheet ranges efficiently using batchGet with single-quoted sheet ranges
 */
async function fetchBatchSheetValues(
  accessToken: string,
  spreadsheetId: string,
  ranges: string[]
): Promise<Record<string, any[][]>> {
  const queryRanges = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${queryRanges}`;

  try {
    const data = await apiFetch(url, accessToken);
    const result: Record<string, any[][]> = {};
    if (data.valueRanges && Array.isArray(data.valueRanges)) {
      data.valueRanges.forEach((vr: any, index: number) => {
        const key = ranges[index];
        result[key] = vr.values || [];
      });
    }
    return result;
  } catch (err: any) {
    console.warn('batchGet failed, falling back to individual readSheetValues:', err);
    const result: Record<string, any[][]> = {};
    await Promise.all(
      ranges.map(async (range) => {
        result[range] = await readSheetValues(accessToken, spreadsheetId, range);
      })
    );
    return result;
  }
}

/**
 * Writes data to a sheet range
 */
async function writeSheetValues(accessToken: string, spreadsheetId: string, range: string, values: any[][]) {
  return apiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, accessToken, {
    method: 'PUT',
    body: JSON.stringify({ values })
  });
}

/**
 * Clears data in a sheet range
 */
async function clearSheetValues(accessToken: string, spreadsheetId: string, range: string) {
  return apiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`, accessToken, {
    method: 'POST'
  });
}

/**
 * Fetches the entire project database from Google Sheets
 */
export async function fetchProjectData(accessToken: string, spreadsheetId: string): Promise<{
  config: Record<string, string>;
  tasks: Task[];
  milestones: Milestone[];
  teamMembers: TeamMember[];
  risks: Risk[];
  logs: ActivityLog[];
}> {
  const configRange = `'${SHEETS.CONFIG}'!A:B`;
  const tasksRange = `'${SHEETS.TASKS}'!A:O`;
  const milestonesRange = `'${SHEETS.MILESTONES}'!A:E`;
  const teamRange = `'${SHEETS.TEAM}'!A:D`;
  const risksRange = `'${SHEETS.RISKS}'!A:F`;
  const logsRange = `'${SHEETS.LOGS}'!A:D`;

  const batchResult = await fetchBatchSheetValues(accessToken, spreadsheetId, [
    configRange,
    tasksRange,
    milestonesRange,
    teamRange,
    risksRange,
    logsRange
  ]);

  const configRaw = batchResult[configRange] || [];
  const tasksRaw = batchResult[tasksRange] || [];
  const milestonesRaw = batchResult[milestonesRange] || [];
  const teamRaw = batchResult[teamRange] || [];
  const risksRaw = batchResult[risksRange] || [];
  const logsRaw = batchResult[logsRange] || [];

  // Parse config key-value pairs
  const config: Record<string, string> = {};
  configRaw.forEach((row, i) => {
    if (i === 0) return; // skip header
    if (row[0] && row[1] !== undefined) {
      config[row[0]] = row[1];
    }
  });

  // Parse tasks
  const tasks: Task[] = [];
  tasksRaw.forEach((row, i) => {
    if (i === 0) return; // skip header
    if (!row[0]) return; // skip empty rows
    
    // Parse assignees (can be comma-separated or JSON)
    let assignees: string[] = [];
    if (row[8]) {
      try {
        if (row[8].startsWith('[')) {
          assignees = JSON.parse(row[8]);
        } else {
          assignees = row[8].split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      } catch {
        assignees = row[8].split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    // Parse predecessors
    let predecessors: string[] = [];
    if (row[9]) {
      predecessors = row[9].split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    tasks.push({
      id: row[0],
      wbs: row[1] || '1.0',
      name: row[2] || 'Untitled Task',
      status: (row[3] as TaskStatus) || 'To Do',
      progress: Math.max(0, Math.min(100, Number(row[4]) || 0)),
      startDate: row[5] || '',
      endDate: row[6] || '',
      duration: Number(row[7]) || 1,
      assignees,
      predecessors,
      budget: Number(row[10]) || 0,
      actualCost: Number(row[11]) || 0,
      riskLevel: (row[12] as RiskLevel) || 'Low',
      notes: row[13] || '',
      attachmentUrl: row[14] || '',
      priority: (row[15] as any) || '',
      subtasks: (() => {
        try {
          return row[16] ? JSON.parse(row[16]) : [];
        } catch {
          return [];
        }
      })(),
      checklists: (() => {
        try {
          return row[17] ? JSON.parse(row[17]) : [];
        } catch {
          return [];
        }
      })()
    });
  });

  // Parse milestones
  const milestones: Milestone[] = [];
  milestonesRaw.forEach((row, i) => {
    if (i === 0) return; // skip header
    if (!row[0]) return;
    milestones.push({
      id: row[0],
      name: row[1] || 'Untitled Milestone',
      date: row[2] || '',
      status: (row[3] as MilestoneStatus) || 'Pending',
      notes: row[4] || ''
    });
  });

  // Parse team members
  const teamMembers: TeamMember[] = [];
  teamRaw.forEach((row, i) => {
    if (i === 0) return; // skip header
    if (!row[0]) return;
    teamMembers.push({
      email: row[0],
      name: row[1] || 'Unknown',
      role: row[2] || 'Team Member',
      avatarUrl: row[3] || `https://api.dicebear.com/7.x/adventurer/svg?seed=${row[0]}`
    });
  });

  // Parse risks
  const risks: Risk[] = [];
  risksRaw.forEach((row, i) => {
    if (i === 0) return; // skip header
    if (!row[0]) return;
    risks.push({
      id: row[0],
      title: row[1] || 'Untitled Risk',
      probability: Math.max(1, Math.min(5, Number(row[2]) || 1)),
      impact: Math.max(1, Math.min(5, Number(row[3]) || 1)),
      mitigation: row[4] || '',
      status: (row[5] as RiskStatus) || 'Active'
    });
  });

  // Parse logs
  const logs: ActivityLog[] = [];
  logsRaw.forEach((row, i) => {
    if (i === 0) return; // skip header
    if (!row[0]) return;
    logs.push({
      timestamp: row[0],
      user: row[1] || 'System',
      action: row[2] || '',
      details: row[3] || ''
    });
  });

  return { config, tasks, milestones, teamMembers, risks, logs };
}

/**
 * Overwrites spreadsheet database with local project changes
 */
export async function saveProjectData(
  accessToken: string,
  spreadsheetId: string,
  data: {
    tasks: Task[];
    milestones: Milestone[];
    teamMembers: TeamMember[];
    risks: Risk[];
    logs: ActivityLog[];
  }
): Promise<void> {
  // Overwrite is safer by:
  // 1. Clearing existing cells from row 2 onwards
  // 2. Writing the new content block
  
  // Format Tasks rows
  const taskRows = data.tasks.map(t => [
    t.id,
    t.wbs,
    t.name,
    t.status,
    t.progress,
    t.startDate,
    t.endDate,
    t.duration,
    JSON.stringify(t.assignees),
    t.predecessors.join(','),
    t.budget,
    t.actualCost,
    t.riskLevel,
    t.notes,
    t.attachmentUrl,
    t.priority || '',
    JSON.stringify(t.subtasks || []),
    JSON.stringify(t.checklists || [])
  ]);

  // Format Milestones rows
  const milestoneRows = data.milestones.map(m => [
    m.id,
    m.name,
    m.date,
    m.status,
    m.notes
  ]);

  // Format Team members rows
  const teamRows = data.teamMembers.map(t => [
    t.email,
    t.name,
    t.role,
    t.avatarUrl
  ]);

  // Format Risks rows
  const riskRows = data.risks.map(r => [
    r.id,
    r.title,
    r.probability,
    r.impact,
    r.mitigation,
    r.status
  ]);

  // Format Logs rows (slice to latest 500 records to keep Sheet fast)
  const sortedLogs = [...data.logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const trimmedLogs = sortedLogs.slice(0, 500);
  const logRows = trimmedLogs.map(l => [
    l.timestamp,
    l.user,
    l.action,
    l.details
  ]);

  // Clear older values starting from row 2 up to column index 15 and row index 1500 to keep it clean
  await Promise.all([
    clearSheetValues(accessToken, spreadsheetId, `'${SHEETS.TASKS}'!A2:R1500`),
    clearSheetValues(accessToken, spreadsheetId, `'${SHEETS.MILESTONES}'!A2:E500`),
    clearSheetValues(accessToken, spreadsheetId, `'${SHEETS.TEAM}'!A2:D200`),
    clearSheetValues(accessToken, spreadsheetId, `'${SHEETS.RISKS}'!A2:F500`),
    clearSheetValues(accessToken, spreadsheetId, `'${SHEETS.LOGS}'!A2:D1000`)
  ]);

  // Write new values
  await Promise.all([
    taskRows.length > 0 ? writeSheetValues(accessToken, spreadsheetId, `'${SHEETS.TASKS}'!A2`, taskRows) : Promise.resolve(),
    milestoneRows.length > 0 ? writeSheetValues(accessToken, spreadsheetId, `'${SHEETS.MILESTONES}'!A2`, milestoneRows) : Promise.resolve(),
    teamRows.length > 0 ? writeSheetValues(accessToken, spreadsheetId, `'${SHEETS.TEAM}'!A2`, teamRows) : Promise.resolve(),
    riskRows.length > 0 ? writeSheetValues(accessToken, spreadsheetId, `'${SHEETS.RISKS}'!A2`, riskRows) : Promise.resolve(),
    logRows.length > 0 ? writeSheetValues(accessToken, spreadsheetId, `'${SHEETS.LOGS}'!A2`, logRows) : Promise.resolve(),
    // Update config sheet update timestamp
    writeSheetValues(accessToken, spreadsheetId, `'${SHEETS.CONFIG}'!B6`, [[new Date().toISOString()]])
  ]);
}

/**
 * Searches for Google Spreadsheets inside the user's Drive ordered by recent modification
 */
export async function searchMcpSpreadsheets(accessToken: string): Promise<Array<{ id: string; name: string; createdTime: string; modifiedTime?: string }>> {
  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const data = await apiFetch(`https://www.googleapis.com/drive/v3/files?q=${query}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name,createdTime,modifiedTime)&orderBy=modifiedTime desc`, accessToken);
  return data.files || [];
}

/**
 * Uploads a file directly to the project's Google Drive attachments folder using a secure Base64 multipart chunk
 */
export async function uploadFileToDrive(
  accessToken: string, 
  folderId: string, 
  file: File
): Promise<{ fileId: string; fileName: string; webViewLink: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const commaIndex = dataUrl.indexOf(',');
        const base64Data = commaIndex !== -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;

        const boundary = 'MCP_MULTIPART_BOUNDARY_MARKER_999';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelim = `\r\n--${boundary}--`;

        let uploadSuccess = false;
        let responseData: any = null;
        let lastErrorMsg = '';

        // Attempt 1: Upload directly into the shared project folderId
        if (folderId) {
          try {
            const metadata = {
              name: file.name,
              parents: [folderId]
            };

            const multipartBody = 
              delimiter +
              'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
              JSON.stringify(metadata) +
              delimiter +
              `Content-Type: ${file.type || 'application/octet-stream'}\r\n` +
              'Content-Transfer-Encoding: base64\r\n\r\n' +
              base64Data +
              closeDelim;

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
              },
              body: multipartBody
            });

            if (response.ok) {
              responseData = await response.json();
              uploadSuccess = true;
            } else {
              const errText = await response.text().catch(() => '');
              try {
                const parsed = JSON.parse(errText);
                if (parsed.error?.message) lastErrorMsg = parsed.error.message;
              } catch {
                lastErrorMsg = errText || response.statusText;
              }
              console.warn(`Attempt 1 upload to folder ${folderId} failed (${response.status}):`, lastErrorMsg);
            }
          } catch (e: any) {
            console.warn(`Attempt 1 upload exception:`, e);
            lastErrorMsg = e.message || String(e);
          }
        }

        // Attempt 2 Fallback: If folder upload failed (e.g., 404 or 403 because folder belongs to another user),
        // upload directly to the current user's Drive root and share publicly so all collaborators can access it.
        if (!uploadSuccess) {
          console.info('Attempting fallback upload directly to user Google Drive root...');
          const fallbackMetadata = {
            name: file.name
          };

          const fallbackBody = 
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(fallbackMetadata) +
            delimiter +
            `Content-Type: ${file.type || 'application/octet-stream'}\r\n` +
            'Content-Transfer-Encoding: base64\r\n\r\n' +
            base64Data +
            closeDelim;

          const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: fallbackBody
          });

          if (!response.ok) {
            const errText = await response.text().catch(() => '');
            let detailedMsg = errText || lastErrorMsg;
            try {
              const parsed = JSON.parse(errText);
              if (parsed.error?.message) detailedMsg = parsed.error.message;
            } catch {}

            const err: any = new Error(`Gagal Upload ke Drive (${response.status}): ${detailedMsg}`);
            err.status = response.status;
            if (detailedMsg.includes('drive.googleapis.com') || detailedMsg.includes('Google Drive API')) {
              err.activationUrl = 'https://console.developers.google.com/apis/api/drive.googleapis.com/overview';
            }
            throw err;
          }

          responseData = await response.json();
        }

        // Share uploaded file so all project collaborators can view/download
        if (responseData && responseData.id) {
          await shareFileWithAnyone(accessToken, responseData.id);
        }

        resolve({
          fileId: responseData.id,
          fileName: responseData.name,
          webViewLink: responseData.webViewLink
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas dari komputer.'));
    reader.readAsDataURL(file);
  });
}

/**
 * List files within the project's Google Drive attachments folder
 */
export async function listDriveFolderFiles(
  accessToken: string, 
  folderId: string
): Promise<Array<{ id: string; name: string; mimeType: string; webViewLink: string; size?: string; createdTime: string }>> {
  if (!folderId) return [];

  try {
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const data = await apiFetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name,mimeType,webViewLink,size,createdTime)&orderBy=name`, 
      accessToken
    );
    return data.files || [];
  } catch (err) {
    console.warn(`Could not list files for folder ${folderId}:`, err);
    return [];
  }
}

/**
 * Deletes a file from Google Drive with fallbacks for shared files (permanent delete -> trash -> remove parent)
 */
export async function deleteDriveFile(accessToken: string, fileId: string, folderId?: string): Promise<void> {
  const authHeaders = { 
    'Authorization': `Bearer ${accessToken}`
  };

  // 1. Try permanent DELETE with supportsAllDrives=true
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
      method: 'DELETE',
      headers: authHeaders
    });
    if (response.ok || response.status === 204 || response.status === 404) return;
  } catch (e) {
    console.warn('Permanent delete failed, attempting fallback...', e);
  }

  // 2. Fallback: Remove file from parent folder (works best for shared files where user isn't creator)
  if (folderId) {
    try {
      const removeParentResp = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?removeParents=${encodeURIComponent(folderId)}&supportsAllDrives=true`,
        {
          method: 'PATCH',
          headers: authHeaders
        }
      );
      if (removeParentResp.ok || removeParentResp.status === 404) return;
    } catch (e) {
      console.warn('Remove parent fallback failed...', e);
    }
  }

  // 3. Fallback: Try moving to trash
  try {
    const trashResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
      method: 'PATCH',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ trashed: true })
    });
    if (trashResp.ok || trashResp.status === 404) return;
  } catch (e) {
    console.warn('Trash fallback failed...', e);
  }

  // 4. Final check to parse exact error if all methods fail
  const finalResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
    method: 'DELETE',
    headers: authHeaders
  });

  if (finalResp.ok || finalResp.status === 204 || finalResp.status === 404) return;

  const errText = await finalResp.text().catch(() => '');
  let detailedMsg = errText || finalResp.statusText;
  try {
    const parsed = JSON.parse(errText);
    if (parsed.error?.message) detailedMsg = parsed.error.message;
  } catch {}

  throw new Error(`Gagal menghapus file dari Drive: ${detailedMsg}`);
}
