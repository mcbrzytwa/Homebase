/**
 * ============================================================================
 * CCAT OPERATING SYSTEM v2.0 - GOOGLE APPS SCRIPT
 * ============================================================================
 * 
 * Redesigned CCAT OS with:
 * 1. Sprint Rollover, Archive & Satellite Distribution (preserved)
 * 2. Simplified OKR Tracking (no RACI/approval/timeline from OKRs)
 * 3. Revised Satellite Workbooks (Production, Curator, Internal Stakeholders,
 *    Director ML, Director MI, Technical Director, Advisory Committee, OKRs)
 * 4. One-Way Sync: Satellites → Master RACI Tab
 * 5. Granola Meeting Notes → Auto-Populate Satellite Trackers
 * 6. Action Item Distribution from Internal Stakeholders to other satellites
 * 7. FY2027 Timeline Satellite (Q4 2026 included)
 * 8. Satellite Tracker Archive Access (previous sprints)
 * 9. Sprint Deck Update Push
 * 10. Stakeholder Communication: Meeting summaries + tracker links
 *
 * Advisory Network functionality has been removed from active code.
 * Legacy sheets are preserved for reference.
 * 
 * ============================================================================
 */


// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Your email for notifications
  notificationEmail: 'YOUR_EMAIL@example.com', // <-- CHANGE THIS
  
  // Claude API key (for Granola notes processing)
  claudeApiKey: '', // <-- Set via Script Properties: CLAUDE_API_KEY
  claudeModel: 'claude-sonnet-4-20250514',
  
  // Master spreadsheet sheet names
  sheets: {
    homeBase: '🏛️ Home Base',
    sprintPlanning: '🗓️ Sprint Planning',
    sprintTemplate: '⏱️ Sprint Template',
    okrs: '🎯 Objectives and Key Results',
    masterRaci: '📋 Master RACI Tracker',
    satelliteConfig: '⚙️ Satellite Config',
    timelineConfig: '📅 FY2027 Timeline',
    fullYearTimeline: '📅 Full Year Timeline',
    next4Weeks: '📅 Next 4 Weeks',
    sprintDeckData: '📊 Sprint Deck Data',
    meetingLog: '📝 Meeting Log',
  },
  
  // Satellite check-in types — REVISED
  // Production & Curator keep their existing satellite links
  // IT has been repurposed as Internal Stakeholders
  // CHANEL, Deans-Provost, Facilities removed
  // New: Director ML, Director MI, Technical Director
  checkIns: [
    { name: 'Production', templateSheet: 'Production Sync Template', activeSheet: 'Production Sync ', title: 'CCAT Production Check-In', type: 'checkin', owner: 'Richard Lonsdorf', preserveLink: true },
    { name: 'Curator', templateSheet: 'Curator Check-In Template', activeSheet: 'Curator Check-In', title: 'CCAT Curator Check-In', type: 'checkin', owner: 'Lumi Tan', preserveLink: true, legacyName: 'Student Life' },
    { name: 'Internal Stakeholders', templateSheet: 'Internal Stakeholders Template', activeSheet: 'Internal Stakeholders Check-In', title: 'Internal Stakeholders Check-In', type: 'checkin', owner: 'All Directors', preserveLink: true, legacyName: 'IT' },
    { name: 'Director ML', templateSheet: 'Director ML Template', activeSheet: 'Director ML Check-In', title: 'Director ML Check-In', type: 'checkin', owner: 'TBD (Director, ML)', preserveLink: false },
    { name: 'Director MI', templateSheet: 'Director MI Template', activeSheet: 'Director MI Check-In', title: 'Director MI Check-In', type: 'checkin', owner: 'TBD (Director, MI)', preserveLink: false },
    { name: 'Technical Director', templateSheet: 'Technical Director Template', activeSheet: 'Technical Director Check-In', title: 'Technical Director Check-In', type: 'checkin', owner: 'TBD (Technical Director)', preserveLink: false },
    { name: 'Advisory Committee', templateSheet: 'Advisory Committee', activeSheet: 'Advisory Committee', title: 'Advisory Committee Meetings', type: 'checkin', owner: 'Committee', preserveLink: false },
    { name: 'OKRs', templateSheet: null, activeSheet: '🎯 Objectives and Key Results', title: 'CCAT 2026 Objectives and Key Results', type: 'okr', owner: 'ED', preserveLink: false },
  ],
  
  // Category emoji mapping
  categoryEmojis: {
    'Event': '🎪',
    'Update': '💬',
    'Comms': '📣',
    'Key Milestone': '⭐'
  },
  
  // OKR sheet column indices (1-indexed) — simplified, no RACI columns needed from OKRs
  okrColumns: {
    type: 1,
    description: 2,
    priority: 16,
    planningAssumption: 17,
    status: 18,
    confidence: 19,
    fixedDeadline: 20,
    category: 21,
    dependencies: 26
  },
  
  // Dropdown options for OKR fields
  dropdownOptions: {
    priority: ['P0', 'P1', 'P2', 'P3'],
    planningAssumption: ['Q1', 'Q2', 'Q3', 'Q4', 'Q1, Q2', 'Q2, Q3', 'Q3, Q4', 'Q1, Q2, Q3', 'Q2, Q3, Q4', 'Q1, Q2, Q3, Q4'],
    status: ['Not Started', 'In Progress', 'Complete', 'Blocked'],
    confidence: ['High', 'Medium', 'Low'],
    category: ['Event', 'Update', 'Comms', 'Key Milestone'],
    actionStatus: ['Not Started', 'In Progress', 'Complete', 'Blocked', 'Pending', 'Carried Over']
  },
  
  // FY2027 Timeline: Q4 FY2026 (Apr-Jun 2026) + full FY2027 (Jul 2026 - Jun 2027)
  // CalArts fiscal year runs Jul 1 - Jun 30
  fy2027Timeline: {
    label: 'FY2027 Timeline (incl. Q4 FY2026)',
    quarters: [
      { name: 'Q4 FY2026', months: ['Apr 2026', 'May 2026', 'Jun 2026'], color: '#F3E5F5' },
      { name: 'Q1 FY2027', months: ['Jul 2026', 'Aug 2026', 'Sep 2026'], color: '#E3F2FD' },
      { name: 'Q2 FY2027', months: ['Oct 2026', 'Nov 2026', 'Dec 2026'], color: '#E8F5E9' },
      { name: 'Q3 FY2027', months: ['Jan 2027', 'Feb 2027', 'Mar 2027'], color: '#FFF3E0' },
      { name: 'Q4 FY2027', months: ['Apr 2027', 'May 2027', 'Jun 2027'], color: '#F3E5F5' },
    ]
  },
  
  // Colors for quarter shading (calendar year, for OKR sheet)
  quarterColors: {
    'Q1': '#E3F2FD',
    'Q2': '#E8F5E9',
    'Q3': '#FFF3E0',
    'Q4': '#F3E5F5'
  },
  
  // Sprint cadence (2-week sprints)
  sprintCadence: {
    durationWeeks: 2,
    ceremonies: [
      { name: 'Sprint Planning → Push to IS', dayOffset: 0, description: 'ED sprint planning, push to internal stakeholders EOD' },
      { name: 'External Kick-Off (Chanel)', dayOffset: 2, description: 'Sprint kick-off with external stakeholders' },
      { name: 'Internal Sync', dayOffset: 11, description: 'Bi-weekly internal stakeholder sync (all directors)' },
    ]
  },

  // Protected range for satellite header (rows 1-5)
  satelliteProtectedRows: 5
};


// ============================================================================
// MENU SETUP
// ============================================================================

/**
 * Creates the custom menu when the spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('🎛️ CCAT System')
    .addItem('🔄 New Sprint (Rollover & Push)', 'newSprintRollover')
    .addItem('🔁 Sync All Satellites → Master', 'syncAllSatellitesToMaster')
    .addItem('🎯 Sync OKR Satellite Only', 'syncOKRSatelliteOnly')
    .addSeparator()
    .addSubMenu(ui.createMenu('📋 RACI & Trackers')
      .addItem('📋 Refresh Master RACI', 'refreshMasterRACI')
      .addItem('📤 Distribute Action Items from Internal Stakeholders', 'distributeFromInternalStakeholders'))
    .addSeparator()
    .addSubMenu(ui.createMenu('📅 Timelines')
      .addItem('📅 View Full Year Timeline', 'navToFullYearTimeline')
      .addItem('📅 View Next 4 Weeks', 'navToNext4Weeks')
      .addSeparator()
      .addItem('🔄 Refresh Full Year Timeline', 'refreshFullYearTimeline')
      .addItem('🔄 Refresh Next 4 Weeks', 'refreshNext4Weeks'))
    .addSeparator()
    .addSubMenu(ui.createMenu('📝 Meeting Notes (Granola)')
      .addItem('📥 Process Granola Notes for Satellite', 'processGranolaNotes')
      .addItem('📋 View Meeting Log', 'navToMeetingLog')
      .addItem('🔄 Sync Meeting Log from Calendar', 'syncMeetingLogFromCalendar'))
    .addSeparator()
    .addSubMenu(ui.createMenu('📊 Sprint Deck')
      .addItem('📊 Generate Sprint Deck Data', 'generateSprintDeckData')
      .addItem('📧 Send Sprint Summary Email', 'sendSprintSummaryEmail'))
    .addSeparator()
    .addSubMenu(ui.createMenu('📧 Communication')
      .addItem('📧 Send Meeting Summary to Participants', 'sendMeetingSummaryToParticipants')
      .addItem('📝 Update Config Email', 'promptForEmail'))
    .addSeparator()
    .addSubMenu(ui.createMenu('🗄️ Archives')
      .addItem('📅 View Archived Sprints', 'viewArchivedSprints')
      .addItem('📋 View Satellite Tracker Archive', 'viewSatelliteTrackerArchive')
      .addItem('📊 Generate Archive Report', 'generateArchiveReport'))
    .addSeparator()
    .addItem('🗺️ View System Map', 'showSystemMap')
    .addSeparator()
    .addSubMenu(ui.createMenu('⚙️ Setup')
      .addItem('🚀 Initial Setup (Create Satellites)', 'initialSetup')
      .addItem('🔧 Fix Formula References', 'fixFormulaReferences')
      .addItem('📅 Setup Timelines (Full Year + 4 Weeks)', 'setupTimelines')
      .addItem('📅 Setup FY2027 Timeline Satellite', 'setupTimelineSatellite')
      .addItem('📝 Update Config Email', 'promptForEmail'))
    .addToUi();
  
  // Build navigation menus
  buildNavigationMenus_(ui);
}


function buildNavigationMenus_(ui) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 📑 SHEETS NAVIGATION MENU
  const sheetsMenu = ui.createMenu('📑 Sheets');
  
  // Core sheets
  sheetsMenu.addItem('🏛️ Home Base', 'navToHomeBase');
  sheetsMenu.addItem('🗂️ OS Legend', 'navToOSLegend');
  sheetsMenu.addItem('🎯 OKRs', 'navToOKRs');
  sheetsMenu.addItem('📋 Master RACI Tracker', 'navToMasterRACI');
  sheetsMenu.addItem('📅 Full Year Timeline', 'navToFullYearTimeline');
  sheetsMenu.addItem('📅 Next 4 Weeks', 'navToNext4Weeks');
  sheetsMenu.addItem('📅 FY2027 Timeline (Legacy)', 'navToTimeline');
  sheetsMenu.addSeparator();
  
  // Sprint sheets
  sheetsMenu.addItem('🗓️ Sprint Planning', 'navToSprintPlanning');
  sheetsMenu.addItem('⏱️ Sprint Template', 'navToSprintTemplate');
  
  // Find current sprint sheets dynamically
  const sheets = ss.getSheets();
  const sprintSheets = sheets.filter(s => /^Sprint \d+$/.test(s.getName()));
  if (sprintSheets.length > 0) {
    sheetsMenu.addSeparator();
    sprintSheets.sort((a, b) => {
      const numA = parseInt(a.getName().replace('Sprint ', ''));
      const numB = parseInt(b.getName().replace('Sprint ', ''));
      return numB - numA;
    });
    sprintSheets.slice(0, 3).forEach((sheet, index) => {
      sheetsMenu.addItem('📅 ' + sheet.getName(), 'navToSprint' + (index + 1));
    });
  }
  
  sheetsMenu.addSeparator();
  
  // Check-in sheets submenu
  const checkInSubMenu = ui.createMenu('🧭 Check-Ins');
  checkInSubMenu.addItem('Production (Richard Lonsdorf)', 'navToProductionSync');
  checkInSubMenu.addItem('Curator (Lumi Tan)', 'navToCurator');
  checkInSubMenu.addItem('Internal Stakeholders', 'navToInternalStakeholders');
  checkInSubMenu.addItem('Director ML', 'navToDirectorML');
  checkInSubMenu.addItem('Director MI', 'navToDirectorMI');
  checkInSubMenu.addItem('Technical Director', 'navToTechnicalDirector');
  checkInSubMenu.addItem('Advisory Committee', 'navToAdvisory');
  
  sheetsMenu.addSubMenu(checkInSubMenu);
  sheetsMenu.addSeparator();
  
  // System sheets
  sheetsMenu.addItem('📊 Sprint Deck Data', 'navToSprintDeckData');
  sheetsMenu.addItem('📝 Meeting Log', 'navToMeetingLog');
  sheetsMenu.addItem('⚙️ Satellite Config', 'navToSatelliteConfig');
  
  // Legacy sheets (Advisory Network - preserved for reference)
  sheetsMenu.addSeparator();
  const legacyMenu = ui.createMenu('📦 Legacy (Reference Only)');
  legacyMenu.addItem('🤝 Advisory Network', 'navToAdvisoryNetwork');
  legacyMenu.addItem('💬 Conversation Log', 'navToConversationLog');
  legacyMenu.addItem('📊 Network Dashboard', 'navToNetworkDashboard');
  sheetsMenu.addSubMenu(legacyMenu);
  
  sheetsMenu.addToUi();
  
  // 📡 SATELLITES NAVIGATION MENU
  const satellitesMenu = ui.createMenu('📡 Satellites');
  
  satellitesMenu.addItem('🎛️ Production (Richard Lonsdorf)', 'openSatelliteProduction');
  satellitesMenu.addItem('🎨 Curator (Lumi Tan)', 'openSatelliteCurator');
  satellitesMenu.addItem('👥 Internal Stakeholders', 'openSatelliteInternalStakeholders');
  satellitesMenu.addSeparator();
  satellitesMenu.addItem('🎬 Director ML (TBD)', 'openSatelliteDirectorML');
  satellitesMenu.addItem('🖥️ Director MI (TBD)', 'openSatelliteDirectorMI');
  satellitesMenu.addItem('🔧 Technical Director (TBD)', 'openSatelliteTechnicalDirector');
  satellitesMenu.addSeparator();
  satellitesMenu.addItem('👥 Advisory Committee', 'openSatelliteAdvisory');
  satellitesMenu.addItem('🎯 OKRs (View Only)', 'openSatelliteOKRs');
  satellitesMenu.addItem('📅 FY2027 Timeline', 'openSatelliteTimeline');
  satellitesMenu.addSeparator();
  satellitesMenu.addItem('📋 View All Satellite Links', 'navToSatelliteConfig');
  
  satellitesMenu.addToUi();
}


// ============================================================================
// SHEET NAVIGATION FUNCTIONS
// ============================================================================

function navToHomeBase() { navigateToSheet_('🏛️ Home Base'); }
function navToOSLegend() { navigateToSheet_('🗂️ OS Legend'); }
function navToOKRs() { navigateToSheet_('🎯 Objectives and Key Results'); }
function navToMasterRACI() { navigateToSheet_('📋 Master RACI Tracker'); }
function navToTimeline() { navigateToSheet_('📅 FY2027 Timeline'); }
function navToFullYearTimeline() { navigateToSheet_('📅 Full Year Timeline'); }
function navToNext4Weeks() { navigateToSheet_('📅 Next 4 Weeks'); }
function navToSprintPlanning() { navigateToSheet_('🗓️ Sprint Planning'); }
function navToSprintTemplate() { navigateToSheet_('⏱️ Sprint Template'); }
function navToProductionSync() { navigateToSheet_('Production Sync '); }
function navToCurator() { navigateToSheet_('Curator Check-In'); }
function navToInternalStakeholders() { navigateToSheet_('Internal Stakeholders Check-In'); }
function navToDirectorML() { navigateToSheet_('Director ML Check-In'); }
function navToDirectorMI() { navigateToSheet_('Director MI Check-In'); }
function navToTechnicalDirector() { navigateToSheet_('Technical Director Check-In'); }
function navToAdvisory() { navigateToSheet_('Advisory Committee'); }
function navToSprintDeckData() { navigateToSheet_('📊 Sprint Deck Data'); }
function navToMeetingLog() { navigateToSheet_('📝 Meeting Log'); }
function navToSatelliteConfig() { navigateToSheet_('⚙️ Satellite Config'); }

// Legacy navigation (preserved for reference)
function navToAdvisoryNetwork() { navigateToSheet_('🤝 Advisory Network'); }
function navToConversationLog() { navigateToSheet_('💬 Conversation Log'); }
function navToNetworkDashboard() { navigateToSheet_('📊 Network Dashboard'); }

// Dynamic sprint navigation (most recent 3)
function navToSprint1() { navigateToRecentSprint_(0); }
function navToSprint2() { navigateToRecentSprint_(1); }
function navToSprint3() { navigateToRecentSprint_(2); }

function navigateToSheet_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    ss.setActiveSheet(sheet);
    sheet.getRange('A1').activate();
  } else {
    SpreadsheetApp.getUi().alert('Sheet "' + sheetName + '" not found.\n\nIt may not have been created yet. Try running Initial Setup.');
  }
}

function navigateToRecentSprint_(index) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const sprintSheets = sheets.filter(s => /^Sprint \d+$/.test(s.getName()));
  if (sprintSheets.length > 0) {
    sprintSheets.sort((a, b) => {
      return parseInt(b.getName().replace('Sprint ', '')) - parseInt(a.getName().replace('Sprint ', ''));
    });
    if (index < sprintSheets.length) {
      ss.setActiveSheet(sprintSheets[index]);
      sprintSheets[index].getRange('A1').activate();
    }
  }
}


// ============================================================================
// SATELLITE OPEN FUNCTIONS
// ============================================================================

function openSatelliteProduction() { openSatelliteByName_('Production'); }
function openSatelliteCurator() { openSatelliteByName_('Curator'); }
function openSatelliteInternalStakeholders() { openSatelliteByName_('Internal Stakeholders'); }
function openSatelliteDirectorML() { openSatelliteByName_('Director ML'); }
function openSatelliteDirectorMI() { openSatelliteByName_('Director MI'); }
function openSatelliteTechnicalDirector() { openSatelliteByName_('Technical Director'); }
function openSatelliteAdvisory() { openSatelliteByName_('Advisory Committee'); }
function openSatelliteOKRs() { openSatelliteByName_('OKRs'); }
function openSatelliteTimeline() { openSatelliteByName_('FY2027 Timeline'); }

function openSatelliteByName_(checkInName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  
  if (!configSheet) {
    SpreadsheetApp.getUi().alert(
      '⚙️ Setup Required',
      'Satellite workbooks have not been created yet.\n\nPlease run: 🎛️ CCAT System → ⚙️ Setup → 🚀 Initial Setup',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }
  
  const data = configSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === checkInName) {
      const url = data[i][2];
      if (url) {
        const html = '<script>window.open("' + url + '", "_blank"); google.script.host.close();</script>' +
          '<p>Opening satellite workbook...</p><p>If it doesn\'t open automatically, <a href="' + url + '" target="_blank">click here</a>.</p>';
        const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(300).setHeight(100);
        SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Opening ' + checkInName + ' Satellite');
        return;
      } else {
        SpreadsheetApp.getUi().alert('❌ Satellite Not Found', 'The "' + checkInName + '" satellite hasn\'t been created yet.', SpreadsheetApp.getUi().ButtonSet.OK);
        return;
      }
    }
  }
  
  SpreadsheetApp.getUi().alert('Satellite not found in configuration.');
}


// ============================================================================
// INITIAL SETUP
// ============================================================================

function initialSetup() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '🚀 Initial Setup',
    'This will:\n\n' +
    '1. Create a configuration sheet to store satellite workbook IDs\n' +
    '2. Create satellite workbooks for each check-in type:\n' +
    '   - Production (Richard Lonsdorf)\n' +
    '   - Curator (Lumi Tan)\n' +
    '   - Internal Stakeholders\n' +
    '   - Director ML (TBD)\n' +
    '   - Director MI (TBD)\n' +
    '   - Technical Director (TBD)\n' +
    '   - Advisory Committee\n' +
    '   - OKRs (view only)\n' +
    '3. Create Master RACI Tracker sheet\n' +
    '4. Create Meeting Notes Log sheet\n' +
    '5. Create Sprint Deck Data sheet\n\n' +
    'Existing Production and Curator satellites will be preserved.\n\n' +
    'This may take a few minutes. Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    ss.toast('Creating configuration sheet...', '⚙️ Setup', -1);
    createConfigSheet_();
    
    ss.toast('Creating satellite workbooks...', '⚙️ Setup', -1);
    createSatelliteWorkbooks_();
    
    ss.toast('Creating Master RACI Tracker...', '⚙️ Setup', -1);
    createMasterRACISheet_();
    
    ss.toast('Creating Meeting Notes Log...', '⚙️ Setup', -1);
    createMeetingLogSheet_();
    
    ss.toast('Creating Sprint Deck Data sheet...', '⚙️ Setup', -1);
    createSprintDeckDataSheet_();

    ss.toast('Creating Full Year Timeline...', '⚙️ Setup', -1);
    createFullYearTimelineSheet_(ss);

    ss.toast('Creating Next 4 Weeks Timeline...', '⚙️ Setup', -1);
    createNext4WeeksSheet_(ss);

    ss.toast('Fixing formula references...', '⚙️ Setup', -1);
    fixFormulaReferences();

    ss.toast('Setup complete!', '✅ Success', 5);

    ui.alert(
      '✅ Setup Complete!',
      'All satellite workbooks have been created.\n\n' +
      'Check the "⚙️ Satellite Config" sheet for links to each workbook.\n\n' +
      'Next steps:\n' +
      '1. Share each satellite workbook with the appropriate stakeholders\n' +
      '2. Update your notification email in Setup > Update Config Email\n' +
      '3. Run "Setup FY2027 Timeline Satellite" to create the timeline\n' +
      '4. Run "Sync Meeting Log from Calendar" to pull calendar events',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    ui.alert('❌ Setup Error', 'An error occurred: ' + error.message, ui.ButtonSet.OK);
    console.error(error);
  }
}


function createConfigSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  
  if (!configSheet) {
    configSheet = ss.insertSheet(CONFIG.sheets.satelliteConfig);
  } else {
    configSheet.clear();
  }
  
  const headers = [['Check-In Type', 'Satellite Workbook ID', 'Satellite URL', 'Last Sync', 'Status', 'Owner']];
  configSheet.getRange(1, 1, 1, 6).setValues(headers);
  configSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');
  
  const checkInData = CONFIG.checkIns.map(c => [c.name, '', '', '', 'Not Created', c.owner || '']);
  configSheet.getRange(2, 1, checkInData.length, 6).setValues(checkInData);
  
  configSheet.setColumnWidth(1, 180);
  configSheet.setColumnWidth(2, 320);
  configSheet.setColumnWidth(3, 400);
  configSheet.setColumnWidth(4, 160);
  configSheet.setColumnWidth(5, 100);
  configSheet.setColumnWidth(6, 150);
  
  const sheetCount = ss.getNumSheets();
  ss.setActiveSheet(configSheet);
  ss.moveActiveSheet(sheetCount);
}


function createSatelliteWorkbooks_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  const masterFolder = DriveApp.getFileById(ss.getId()).getParents().next();
  
  let satelliteFolder;
  const folderIterator = masterFolder.getFoldersByName('CCAT Satellite Check-Ins');
  if (folderIterator.hasNext()) {
    satelliteFolder = folderIterator.next();
  } else {
    satelliteFolder = masterFolder.createFolder('CCAT Satellite Check-Ins');
  }
  
  CONFIG.checkIns.forEach((checkIn, index) => {
    const row = index + 2;
    const existingId = configSheet.getRange(row, 2).getValue();
    
    // Skip if already created
    if (existingId) {
      configSheet.getRange(row, 5).setValue('Exists');
      return;
    }
    
    // For satellites that should preserve their links (Production, Curator, Internal Stakeholders),
    // check if they exist under legacy names in the config
    if (checkIn.preserveLink && checkIn.legacyName) {
      const legacyId = findLegacySatelliteId_(ss, checkIn.legacyName);
      if (legacyId) {
        configSheet.getRange(row, 2).setValue(legacyId);
        try {
          const legacySat = SpreadsheetApp.openById(legacyId);
          configSheet.getRange(row, 3).setValue(legacySat.getUrl());
          configSheet.getRange(row, 4).setValue(new Date());
          configSheet.getRange(row, 5).setValue('Migrated');
          
          // Rename the satellite workbook
          const satName = 'CCAT Check-In — ' + checkIn.name;
          legacySat.rename(satName);
          
          // Update the sheet title
          const checkInSheet = legacySat.getSheetByName('Check-In');
          if (checkInSheet) {
            checkInSheet.getRange('A1').setValue(checkIn.title);
          }
        } catch (e) {
          console.error('Could not migrate legacy satellite: ' + e.message);
        }
        return;
      }
    }
    
    // Handle OKR satellite
    if (checkIn.type === 'okr') {
      const satellite = SpreadsheetApp.create('CCAT — ' + checkIn.name);
      const satelliteId = satellite.getId();
      DriveApp.getFileById(satelliteId).moveTo(satelliteFolder);
      setupOKRSatellite_(satellite, checkIn, ss);
      configSheet.getRange(row, 2).setValue(satelliteId);
      configSheet.getRange(row, 3).setValue(satellite.getUrl());
      configSheet.getRange(row, 4).setValue(new Date());
      configSheet.getRange(row, 5).setValue('Created');
      Utilities.sleep(1000);
      return;
    }
    
    // Create new check-in satellite
    const satelliteName = 'CCAT Check-In — ' + checkIn.name;
    const satellite = SpreadsheetApp.create(satelliteName);
    const satelliteId = satellite.getId();
    DriveApp.getFileById(satelliteId).moveTo(satelliteFolder);
    
    setupSatelliteWorkbook_(satellite, checkIn, ss.getId());
    
    configSheet.getRange(row, 2).setValue(satelliteId);
    configSheet.getRange(row, 3).setValue(satellite.getUrl());
    configSheet.getRange(row, 4).setValue(new Date());
    configSheet.getRange(row, 5).setValue('Created');
    
    Utilities.sleep(1000);
  });
}


/**
 * Finds a satellite ID from a legacy name in the existing config
 */
function findLegacySatelliteId_(ss, legacyName) {
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  if (!configSheet) return null;
  
  const data = configSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === legacyName && data[i][1]) {
      return data[i][1];
    }
  }
  return null;
}


function setupSatelliteWorkbook_(satellite, checkIn, masterId) {
  const sheet = satellite.getSheets()[0];
  sheet.setName('Check-In');
  
  const master = SpreadsheetApp.openById(masterId);
  const sprintInfo = getCurrentSprintInfo_(master);
  
  const headerData = [
    [checkIn.title, '', '', '', '', ''],
    ['Sprint:', sprintInfo.name, 'Dates:', sprintInfo.dates, '', ''],
    ['Intent:', sprintInfo.intent, '', '', '', ''],
    ['Owner:', checkIn.owner || '', '', '', '', ''],
    ['⚠️ Rows 1-5 synced from Master. Edit below only.', '', '', '', '', ''],
    ['Meeting Outcomes (today)', '[What must be true when this meeting ends]', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['Agenda', '', '', '', '', ''],
    ['Topic', 'Owner', 'Prep / Notes', 'Link', 'Priority', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['Decisions', '', '', '', '', ''],
    ['Decision', 'Owner', 'Impact', 'Follow-up', 'Link', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['Action Items', '', '', '', '', ''],
    ['Task', 'Owner', 'Due Date', 'Status', 'Link', 'Satellite Source'],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['Parking Lot', '', '', '', '', ''],
    ['Item', 'Owner', 'Notes', 'Link', '', ''],
  ];
  
  sheet.getRange(1, 1, headerData.length, 6).setValues(headerData);
  
  // Format header section
  sheet.getRange('A1:F1').merge().setFontSize(16).setFontWeight('bold').setBackground('#1a73e8').setFontColor('white');
  sheet.getRange('A2:F3').setBackground('#e8f0fe');
  sheet.getRange('A4:F4').setBackground('#f0f7ff');
  sheet.getRange('A5:F5').setBackground('#fff3cd').setFontStyle('italic');
  
  // Format section headers
  [9, 20, 29, 41].forEach(row => {
    sheet.getRange(row, 1, 1, 6).setFontWeight('bold').setBackground('#f1f3f4');
  });
  
  // Format table headers
  [10, 21, 30, 42].forEach(row => {
    sheet.getRange(row, 1, 1, 6).setFontWeight('bold').setBackground('#e8eaed');
  });
  
  // Set column widths
  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 120);
  
  // Add dropdowns
  addCheckInDropdowns_(sheet);
  
  // Protection for header rows
  const protection = sheet.getRange('A1:F5').protect();
  protection.setDescription('Sprint info synced from Master - Do not edit');
  protection.setWarningOnly(true);
  
  satellite.addEditor(Session.getActiveUser().getEmail());
  PropertiesService.getDocumentProperties().setProperty('MASTER_ID', masterId);
  PropertiesService.getDocumentProperties().setProperty('CHECK_IN_TYPE', checkIn.name);
}


function addCheckInDropdowns_(sheet) {
  // Status dropdown for Action Items (Column D, rows 31-40)
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.dropdownOptions.actionStatus, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('D31:D40').setDataValidation(statusRule);
  
  // Priority dropdown for Agenda items (Column E, rows 11-19)
  const priorityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.dropdownOptions.priority, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange('E11:E19').setDataValidation(priorityRule);
  
  // Impact dropdown for Decisions (Column C, rows 22-28)
  const impactRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['High', 'Medium', 'Low'], true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange('C22:C28').setDataValidation(impactRule);
  
  // Due Date for Action Items (Column C, rows 31-40)
  const dateRule = SpreadsheetApp.newDataValidation()
    .requireDate()
    .setAllowInvalid(true)
    .build();
  sheet.getRange('C31:C40').setDataValidation(dateRule);
  sheet.getRange('C31:C40').setNumberFormat('mmm d, yyyy');
}


function setupOKRSatellite_(satellite, checkIn, masterSS) {
  const sheet = satellite.getSheets()[0];
  sheet.setName('OKRs');
  
  const masterOKRSheet = masterSS.getSheetByName(CONFIG.sheets.okrs);
  if (!masterOKRSheet) {
    throw new Error('OKR sheet not found in master');
  }
  
  const sourceData = masterOKRSheet.getDataRange();
  const numRows = sourceData.getNumRows();
  const numCols = sourceData.getNumColumns();
  
  const values = sourceData.getValues();
  sheet.getRange(1, 1, numRows, numCols).setValues(values);
  
  const backgrounds = sourceData.getBackgrounds();
  const fontColors = sourceData.getFontColors();
  const fontWeights = sourceData.getFontWeights();
  
  const targetRange = sheet.getRange(1, 1, numRows, numCols);
  targetRange.setBackgrounds(backgrounds);
  targetRange.setFontColors(fontColors);
  targetRange.setFontWeights(fontWeights);
  
  for (let col = 1; col <= numCols; col++) {
    sheet.setColumnWidth(col, masterOKRSheet.getColumnWidth(col));
  }
  
  sheet.insertRowBefore(1);
  sheet.getRange('A1').setValue('📡 CCAT OKR Satellite View — Synced from Master (Read Only)');
  sheet.getRange('A1:Z1').merge();
  sheet.getRange('A1').setBackground('#fff3cd').setFontWeight('bold').setFontStyle('italic');
  
  sheet.insertRowAfter(1);
  sheet.getRange('A2').setValue('Last synced: ' + new Date().toLocaleString());
  sheet.getRange('A2').setFontColor('#666666').setFontStyle('italic');
  
  PropertiesService.getDocumentProperties().setProperty('MASTER_ID', masterSS.getId());
  PropertiesService.getDocumentProperties().setProperty('SATELLITE_TYPE', 'okr');
}


function createMasterRACISheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let raciSheet = ss.getSheetByName(CONFIG.sheets.masterRaci);
  
  if (!raciSheet) {
    raciSheet = ss.insertSheet(CONFIG.sheets.masterRaci);
  } else {
    raciSheet.clear();
  }
  
  const headers = [
    'Satellite Source', 'Task / Action Item', 'Owner', 'Due Date', 'Status',
    'Priority', 'Sprint', 'Decision Context', 'Last Updated'
  ];
  raciSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  raciSheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#1a73e8')
    .setFontColor('white');
  
  raciSheet.setColumnWidth(1, 160);
  raciSheet.setColumnWidth(2, 350);
  raciSheet.setColumnWidth(3, 130);
  raciSheet.setColumnWidth(4, 110);
  raciSheet.setColumnWidth(5, 100);
  raciSheet.setColumnWidth(6, 70);
  raciSheet.setColumnWidth(7, 90);
  raciSheet.setColumnWidth(8, 250);
  raciSheet.setColumnWidth(9, 130);
  
  raciSheet.setFrozenRows(1);
  
  // Status dropdown
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.dropdownOptions.actionStatus, true)
    .build();
  raciSheet.getRange('E2:E500').setDataValidation(statusRule);
  
  return raciSheet;
}


function createMeetingLogSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // Remove old sheet if it exists with old name
  const oldSheet = ss.getSheetByName('📝 Meeting Notes Log');
  if (oldSheet) {
    ss.deleteSheet(oldSheet);
  }
  if (ss.getSheetByName(CONFIG.sheets.meetingLog)) return;

  const sheet = ss.insertSheet(CONFIG.sheets.meetingLog);
  const headers = ['Date', 'Time', 'Meeting Title', 'Satellite', 'Participants', 'Calendar Link', 'Granola Summary Link', 'Action Items', 'Status'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');

  sheet.setColumnWidth(1, 110);
  sheet.setColumnWidth(2, 80);
  sheet.setColumnWidth(3, 250);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 250);
  sheet.setColumnWidth(6, 200);
  sheet.setColumnWidth(7, 200);
  sheet.setColumnWidth(8, 80);
  sheet.setColumnWidth(9, 100);
  sheet.setFrozenRows(1);
}


function createSprintDeckDataSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.sheets.sprintDeckData);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.sheets.sprintDeckData);
  } else {
    sheet.clear();
  }
  
  // This sheet provides structured data for linking to Google Slides sprint deck
  sheet.getRange('A1').setValue('📊 SPRINT DECK DATA');
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold');
  sheet.getRange('A2').setValue('Auto-generated for Sprint Deck linking. Do not edit manually.');
  sheet.getRange('A2').setFontStyle('italic').setFontColor('#666666');
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 300);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 200);
  sheet.setColumnWidth(5, 200);
  
  return sheet;
}


// ============================================================================
// SPRINT MANAGEMENT (PRESERVED FROM v1)
// ============================================================================

function getCurrentSprintInfo_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  const planningSheet = ss.getSheetByName(CONFIG.sheets.sprintPlanning);
  
  let sprintName = '';
  let sprintDates = '';
  let sprintIntent = '';
  
  if (planningSheet) {
    sprintName = planningSheet.getRange('B4').getValue() || 'Sprint 1';
    sprintDates = planningSheet.getRange('B5').getValue() || '';
    sprintIntent = planningSheet.getRange('B6').getValue() || '';
  }
  
  if (!sprintName || sprintName === 'Sprint ') {
    const sheets = ss.getSheets();
    const sprintSheets = sheets.filter(s => /^Sprint \d+$/.test(s.getName()));
    if (sprintSheets.length > 0) {
      const latestSprint = sprintSheets.sort((a, b) => {
        return parseInt(b.getName().replace('Sprint ', '')) - parseInt(a.getName().replace('Sprint ', ''));
      })[0];
      sprintName = latestSprint.getName();
      sprintIntent = latestSprint.getRange('A7').getValue() || '';
    }
  }
  
  return { name: sprintName, dates: sprintDates, intent: sprintIntent };
}


function newSprintRollover() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const currentSprint = getCurrentSprintInfo_(ss);
  const sprintNameStr = String(currentSprint.name || 'Sprint 0');
  const currentNum = parseInt(sprintNameStr.replace(/[^0-9]/g, '')) || 0;
  const newNum = currentNum + 1;
  const newSprintName = 'Sprint ' + newNum;
  
  const response = ui.prompt(
    '🔄 New Sprint Rollover',
    'Current: ' + currentSprint.name + '\n\nNew sprint will be: ' + newSprintName + '\n\nEnter the sprint dates (e.g., "Mar 16 - Mar 27, 2026"):',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const newDates = response.getResponseText();
  
  const intentResponse = ui.prompt(
    '🎯 Sprint Intent',
    'Enter the intent/goal for ' + newSprintName + ':',
    ui.ButtonSet.OK_CANCEL
  );
  if (intentResponse.getSelectedButton() !== ui.Button.OK) return;
  const newIntent = intentResponse.getResponseText();
  
  try {
    ss.toast('Archiving satellite trackers...', '🔄 Sprint Rollover', -1);
    archiveSatelliteTrackers_(ss, String(currentSprint.name || 'Sprint 0'));
    
    ss.toast('Capturing current agenda items for rollover...', '🔄 Sprint Rollover', -1);
    const rolledOverAgendas = captureCurrentAgendas_(ss);
    
    ss.toast('Archiving current sprint...', '🔄 Sprint Rollover', -1);
    archiveCurrentSprint_(ss, String(currentSprint.name || 'Sprint 0'));
    
    ss.toast('Creating new sprint sheet...', '🔄 Sprint Rollover', -1);
    createNewSprintSheet_(ss, newSprintName, newDates, newIntent);
    
    ss.toast('Updating Sprint Planning...', '🔄 Sprint Rollover', -1);
    updateSprintPlanning_(ss, newSprintName, newDates, newIntent);
    
    ss.toast('Updating check-in sheets with rolled over items...', '🔄 Sprint Rollover', -1);
    updateMasterCheckInSheets_(ss, newSprintName, newDates, newIntent, rolledOverAgendas);
    
    ss.toast('Syncing to satellite workbooks...', '🔄 Sprint Rollover', -1);
    pushToAllSatellites_(newSprintName, newDates, newIntent, rolledOverAgendas);
    
    ss.toast('Sprint rollover complete!', '✅ Success', 5);
    
    ui.alert(
      '✅ Sprint Rollover Complete!',
      newSprintName + ' has been created and pushed to all satellites.\n\n' +
      'Previous sprint "' + currentSprint.name + '" has been archived.\n' +
      'Satellite tracker snapshots saved to archive.',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    ui.alert('❌ Error', 'Sprint rollover failed: ' + error.message, ui.ButtonSet.OK);
    console.error(error);
  }
}


function archiveCurrentSprint_(ss, sprintName) {
  const sheet = ss.getSheetByName(sprintName);
  if (!sheet) return;
  
  const archiveName = '📁 ' + sprintName + ' (Archived)';
  sheet.setName(archiveName);
  const sheetCount = ss.getNumSheets();
  ss.setActiveSheet(sheet);
  ss.moveActiveSheet(sheetCount);
  sheet.hideSheet();
}


function captureCurrentAgendas_(ss) {
  const agendas = {};
  
  CONFIG.checkIns.forEach(checkIn => {
    if (checkIn.type === 'okr') return;
    
    const sheet = ss.getSheetByName(checkIn.activeSheet);
    if (!sheet) return;
    
    // Capture agenda items (rows 11-19)
    const agendaRange = sheet.getRange('A11:F19');
    const agendaData = agendaRange.getValues();
    const nonEmptyAgenda = agendaData.filter(row => row.some(cell => cell !== '' && cell !== null));
    
    // Capture incomplete action items (rows 31-40)
    const actionRange = sheet.getRange('A31:F40');
    const actionData = actionRange.getValues();
    const incompleteActions = actionData.filter(row => {
      const hasContent = row.some(cell => cell !== '' && cell !== null);
      const status = String(row[3] || '').toLowerCase().trim();
      const isComplete = status === 'done' || status === 'complete' || status === 'completed';
      return hasContent && !isComplete;
    });
    
    // Capture decisions (rows 22-28)
    const decisionsRange = sheet.getRange('A22:F28');
    const decisionsData = decisionsRange.getValues();
    const nonEmptyDecisions = decisionsData.filter(row => row.some(cell => cell !== '' && cell !== null));
    
    agendas[checkIn.name] = {
      agenda: nonEmptyAgenda,
      actions: incompleteActions,
      decisions: nonEmptyDecisions
    };
  });
  
  return agendas;
}


function createNewSprintSheet_(ss, sprintName, dates, intent) {
  const template = ss.getSheetByName(CONFIG.sheets.sprintTemplate);
  if (!template) throw new Error('Sprint Template sheet not found');
  
  const newSheet = template.copyTo(ss);
  newSheet.setName(sprintName);
  newSheet.getRange('A4').setValue(sprintName);
  newSheet.getRange('C3').setValue(dates);
  newSheet.getRange('A7').setValue(intent);
  
  const planningSheet = ss.getSheetByName(CONFIG.sheets.sprintPlanning);
  const planningIndex = planningSheet.getIndex();
  ss.setActiveSheet(newSheet);
  ss.moveActiveSheet(planningIndex + 1);
  newSheet.showSheet();
}


function updateSprintPlanning_(ss, sprintName, dates, intent) {
  const sheet = ss.getSheetByName(CONFIG.sheets.sprintPlanning);
  if (!sheet) return;
  sheet.getRange('B4').setValue(sprintName);
  sheet.getRange('B5').setValue(dates);
  sheet.getRange('B6').setValue(intent);
}


function updateMasterCheckInSheets_(ss, sprintName, dates, intent, rolledOverAgendas) {
  rolledOverAgendas = rolledOverAgendas || {};
  
  CONFIG.checkIns.forEach(checkIn => {
    if (checkIn.type === 'okr') return;
    
    const sheet = ss.getSheetByName(checkIn.activeSheet);
    if (!sheet) return;
    
    sheet.getRange('B2').setValue(sprintName);
    sheet.getRange('D2').setValue(dates);
    sheet.getRange('B3').setValue(intent);
    
    const rollover = rolledOverAgendas[checkIn.name] || { agenda: [], actions: [], decisions: [] };
    
    // Clear and repopulate agenda items (rows 11-19)
    sheet.getRange('A11:F19').clearContent();
    if (rollover.agenda.length > 0) {
      const markedAgenda = rollover.agenda.map((row, index) => {
        if (index === 0 && row[0]) {
          return ['📌 [Rolled Over] ' + row[0], row[1], row[2], row[3], row[4], row[5] || ''];
        }
        return row.length >= 6 ? row : [...row, ...Array(6 - row.length).fill('')];
      });
      const agendaRows = Math.min(markedAgenda.length, 9);
      sheet.getRange(11, 1, agendaRows, 6).setValues(markedAgenda.slice(0, 9));
    }
    
    // Clear decisions
    sheet.getRange('A22:F28').clearContent();
    
    // Clear and repopulate incomplete action items (rows 31-40)
    sheet.getRange('A31:F40').clearContent();
    if (rollover.actions.length > 0) {
      const markedActions = rollover.actions.map(row => {
        return ['⏳ [Carried Over] ' + row[0], row[1], row[2], 'Carried Over', row[4] || '', row[5] || ''];
      });
      const actionRows = Math.min(markedActions.length, 10);
      sheet.getRange(31, 1, actionRows, 6).setValues(markedActions.slice(0, 10));
    }
  });
}


function pushToAllSatellites_(sprintName, dates, intent, rolledOverAgendas) {
  rolledOverAgendas = rolledOverAgendas || {};
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  if (!configSheet) return;
  
  const data = configSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const checkInName = data[i][0];
    const satelliteId = data[i][1];
    if (!satelliteId) continue;
    
    const checkIn = CONFIG.checkIns.find(c => c.name === checkInName);
    if (!checkIn) continue;
    
    try {
      if (checkIn.type === 'okr') {
        syncOKRToSatellite_(ss, satelliteId);
        configSheet.getRange(i + 1, 4).setValue(new Date());
        configSheet.getRange(i + 1, 5).setValue('Synced');
        continue;
      }
      
      const satellite = SpreadsheetApp.openById(satelliteId);
      const sheet = satellite.getSheetByName('Check-In');
      if (!sheet) continue;
      
      // Update sprint info
      sheet.getRange('A1').setValue(checkIn.title);
      sheet.getRange('B2').setValue(sprintName);
      sheet.getRange('D2').setValue(dates);
      sheet.getRange('B3').setValue(intent);
      sheet.getRange('B4').setValue(checkIn.owner || '');
      
      const rollover = rolledOverAgendas[checkInName] || { agenda: [], actions: [], decisions: [] };
      
      // Clear and repopulate agenda items
      sheet.getRange('A11:F19').clearContent();
      if (rollover.agenda.length > 0) {
        const markedAgenda = rollover.agenda.map((row, index) => {
          const r = row.length >= 6 ? row : [...row, ...Array(6 - row.length).fill('')];
          if (index === 0 && r[0]) {
            return ['📌 [Rolled Over] ' + r[0], r[1], r[2], r[3], r[4], r[5]];
          }
          return r;
        });
        const agendaRows = Math.min(markedAgenda.length, 9);
        sheet.getRange(11, 1, agendaRows, 6).setValues(markedAgenda.slice(0, 9));
      }
      
      // Clear decisions
      sheet.getRange('A22:F28').clearContent();
      
      // Clear and repopulate incomplete action items
      sheet.getRange('A31:F40').clearContent();
      if (rollover.actions.length > 0) {
        const markedActions = rollover.actions.map(row => {
          return ['⏳ [Carried Over] ' + row[0], row[1], row[2], 'Carried Over', row[4] || '', row[5] || ''];
        });
        const actionRows = Math.min(markedActions.length, 10);
        sheet.getRange(31, 1, actionRows, 6).setValues(markedActions.slice(0, 10));
      }
      
      configSheet.getRange(i + 1, 4).setValue(new Date());
      configSheet.getRange(i + 1, 5).setValue('Synced');
      
    } catch (error) {
      console.error('Failed to sync ' + data[i][0] + ': ' + error.message);
      configSheet.getRange(i + 1, 5).setValue('Sync Error');
    }
  }
}


// ============================================================================
// ONE-WAY SYNC: SATELLITES → MASTER RACI
// ============================================================================

/**
 * Syncs all satellite workbooks TO master RACI (one-way: satellite → master)
 * When satellite trackers get updated, those updates flow to the master.
 */
function syncAllSatellitesToMaster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  
  if (!configSheet) {
    SpreadsheetApp.getUi().alert('Please run Initial Setup first.');
    return;
  }
  
  ss.toast('Syncing satellites to master...', '🔁 Sync', -1);
  
  const data = configSheet.getDataRange().getValues();
  let syncCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const checkInName = data[i][0];
    const satelliteId = data[i][1];
    if (!satelliteId) continue;
    
    try {
      const checkIn = CONFIG.checkIns.find(c => c.name === checkInName);
      if (!checkIn) continue;
      
      if (checkIn.type === 'okr') {
        syncOKRToSatellite_(ss, satelliteId);
        configSheet.getRange(i + 1, 4).setValue(new Date());
        configSheet.getRange(i + 1, 5).setValue('Synced');
        syncCount++;
        continue;
      }
      
      // Pull action items from satellite into master check-in sheet
      const satellite = SpreadsheetApp.openById(satelliteId);
      const satSheet = satellite.getSheetByName('Check-In');
      if (!satSheet) continue;
      
      const masterSheet = ss.getSheetByName(checkIn.activeSheet);
      if (!masterSheet) continue;
      
      // Sync editable sections FROM satellite TO master (one-way)
      // Agenda (rows 11-19)
      const agendaData = satSheet.getRange('A11:F19').getValues();
      masterSheet.getRange('A11:F19').setValues(agendaData);
      
      // Decisions (rows 22-28)
      const decisionsData = satSheet.getRange('A22:F28').getValues();
      masterSheet.getRange('A22:F28').setValues(decisionsData);
      
      // Action Items (rows 31-40)
      const actionData = satSheet.getRange('A31:F40').getValues();
      masterSheet.getRange('A31:F40').setValues(actionData);
      
      configSheet.getRange(i + 1, 4).setValue(new Date());
      configSheet.getRange(i + 1, 5).setValue('Synced');
      syncCount++;
      
    } catch (error) {
      console.error('Sync failed for ' + checkInName + ': ' + error.message);
      configSheet.getRange(i + 1, 5).setValue('Error');
    }
  }
  
  // After syncing all satellites, refresh the master RACI
  refreshMasterRACI();
  
  ss.toast('Synced ' + syncCount + ' satellite workbooks and refreshed Master RACI', '✅ Sync Complete', 5);
}


/**
 * Syncs OKR data FROM master TO the OKR satellite (one-way push, read-only)
 */
function syncOKRToSatellite_(masterSS, satelliteId) {
  const satellite = SpreadsheetApp.openById(satelliteId);
  const satSheet = satellite.getSheetByName('OKRs');
  if (!satSheet) return;
  
  const masterOKRSheet = masterSS.getSheetByName(CONFIG.sheets.okrs);
  if (!masterOKRSheet) return;
  
  // Clear existing data except satellite header rows
  const satLastRow = satSheet.getLastRow();
  const lastCol = satSheet.getLastColumn();
  if (satLastRow > 2) {
    satSheet.getRange(3, 1, satLastRow - 2, Math.max(lastCol, 30)).clear();
  }
  
  // Copy fresh data from master
  const sourceData = masterOKRSheet.getDataRange();
  const numRows = sourceData.getNumRows();
  const numCols = sourceData.getNumColumns();
  
  const values = sourceData.getValues();
  satSheet.getRange(3, 1, numRows, numCols).setValues(values);
  
  const backgrounds = sourceData.getBackgrounds();
  const fontColors = sourceData.getFontColors();
  const fontWeights = sourceData.getFontWeights();
  
  const targetRange = satSheet.getRange(3, 1, numRows, numCols);
  targetRange.setBackgrounds(backgrounds);
  targetRange.setFontColors(fontColors);
  targetRange.setFontWeights(fontWeights);
  
  satSheet.getRange('A2').setValue('Last synced: ' + new Date().toLocaleString() + ' | Read-Only View');
}


function syncOKRSatelliteOnly() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  
  if (!configSheet) {
    SpreadsheetApp.getUi().alert('Please run Initial Setup first.');
    return;
  }
  
  ss.toast('Syncing OKR satellite...', '🎯 OKR Sync', -1);
  
  const data = configSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'OKRs' && data[i][1]) {
      try {
        syncOKRToSatellite_(ss, data[i][1]);
        configSheet.getRange(i + 1, 4).setValue(new Date());
        configSheet.getRange(i + 1, 5).setValue('Synced');
        ss.toast('OKR satellite synced successfully!', '✅ Complete', 5);
        return;
      } catch (error) {
        SpreadsheetApp.getUi().alert('Error syncing OKR satellite: ' + error.message);
        return;
      }
    }
  }
  
  SpreadsheetApp.getUi().alert('OKR satellite not found. Please run Initial Setup.');
}


// ============================================================================
// MASTER RACI TRACKER
// ============================================================================

/**
 * Refreshes the Master RACI tab by pulling action items from all satellite check-in sheets.
 * This aggregates all action items across satellites into one master view.
 */
function refreshMasterRACI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let raciSheet = ss.getSheetByName(CONFIG.sheets.masterRaci);
  
  if (!raciSheet) {
    raciSheet = createMasterRACISheet_();
  }
  
  ss.toast('Refreshing Master RACI Tracker...', '📋 RACI', -1);
  
  const sprintInfo = getCurrentSprintInfo_(ss);
  
  // Clear existing data (keep headers)
  const lastRow = raciSheet.getLastRow();
  if (lastRow > 1) {
    raciSheet.getRange(2, 1, lastRow - 1, 9).clearContent();
  }
  
  const allActions = [];
  
  CONFIG.checkIns.forEach(checkIn => {
    if (checkIn.type === 'okr') return;
    
    const sheet = ss.getSheetByName(checkIn.activeSheet);
    if (!sheet) return;
    
    // Pull action items (rows 31-40)
    const actionData = sheet.getRange('A31:F40').getValues();
    
    actionData.forEach(row => {
      if (!row[0] || String(row[0]).trim() === '') return;
      
      allActions.push([
        checkIn.name,             // Satellite Source
        row[0],                   // Task
        row[1],                   // Owner
        row[2],                   // Due Date
        row[3] || 'Not Started',  // Status
        row[4] || '',             // Priority/Link
        sprintInfo.name,          // Sprint
        '',                       // Decision Context
        new Date()                // Last Updated
      ]);
    });
    
    // Also pull decisions as context
    const decisionsData = sheet.getRange('A22:F28').getValues();
    decisionsData.forEach(row => {
      if (!row[0] || String(row[0]).trim() === '') return;
      
      // Add decisions that have follow-ups as action items
      if (row[3] && String(row[3]).trim() !== '') {
        allActions.push([
          checkIn.name,
          '↳ Follow-up: ' + row[3],
          row[1],
          '',
          'Not Started',
          '',
          sprintInfo.name,
          'Decision: ' + row[0],
          new Date()
        ]);
      }
    });
  });
  
  // Write all actions to master RACI
  if (allActions.length > 0) {
    raciSheet.getRange(2, 1, allActions.length, 9).setValues(allActions);
    
    // Color-code by satellite source
    const sourceColors = {};
    const colorPalette = ['#E3F2FD', '#E8F5E9', '#FFF3E0', '#F3E5F5', '#FCE4EC', '#E0F7FA', '#FFF9C4'];
    let colorIndex = 0;
    
    for (let i = 0; i < allActions.length; i++) {
      const source = allActions[i][0];
      if (!sourceColors[source]) {
        sourceColors[source] = colorPalette[colorIndex % colorPalette.length];
        colorIndex++;
      }
      raciSheet.getRange(i + 2, 1).setBackground(sourceColors[source]);
    }
  }
  
  ss.toast('Master RACI updated with ' + allActions.length + ' items from all satellites', '✅ Complete', 5);
}


// ============================================================================
// GRANOLA MEETING NOTES → AUTO-POPULATE SATELLITE TRACKERS
// ============================================================================

/**
 * Processes Granola meeting notes and auto-populates the appropriate satellite tracker.
 * Uses Claude API to extract action items, decisions, and agenda topics from the notes.
 */
function processGranolaNotes() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Build satellite options for the dialog
  const checkInNames = CONFIG.checkIns
    .filter(c => c.type === 'checkin')
    .map(c => c.name + ' (' + c.owner + ')');
  
  const html = buildGranolaInputDialog_(checkInNames);
  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(600).setHeight(500);
  ui.showModalDialog(htmlOutput, '📝 Process Granola Meeting Notes');
}


function buildGranolaInputDialog_(checkInNames) {
  let optionsHtml = '';
  checkInNames.forEach(name => {
    optionsHtml += '<option value="' + name.split(' (')[0] + '">' + name + '</option>';
  });
  
  return '<!DOCTYPE html><html><head>' +
    '<style>' +
    'body { font-family: Arial, sans-serif; padding: 15px; }' +
    'select, textarea, button { width: 100%; margin: 8px 0; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }' +
    'textarea { height: 200px; font-family: monospace; font-size: 12px; }' +
    'button { background: #1a73e8; color: white; border: none; cursor: pointer; font-size: 14px; }' +
    'button:hover { background: #1557b0; }' +
    'label { font-weight: bold; display: block; margin-top: 12px; }' +
    '.hint { color: #666; font-size: 11px; margin-top: 2px; }' +
    'input[type="text"] { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin: 8px 0; }' +
    '</style></head><body>' +
    '<label>Which satellite check-in?</label>' +
    '<select id="satellite">' + optionsHtml + '</select>' +
    '<label>Participants (comma-separated emails)</label>' +
    '<input type="text" id="participants" placeholder="e.g., richard@calarts.edu, lumi@calarts.edu" />' +
    '<p class="hint">Used for sending meeting summaries after processing.</p>' +
    '<label>Paste Granola meeting notes below:</label>' +
    '<textarea id="notes" placeholder="Paste the full Granola meeting transcript/notes here..."></textarea>' +
    '<p class="hint">Granola notes will be processed by Claude to extract action items, decisions, and agenda topics.</p>' +
    '<button onclick="submitNotes()">📥 Process Notes</button>' +
    '<script>' +
    'function submitNotes() {' +
    '  var satellite = document.getElementById("satellite").value;' +
    '  var notes = document.getElementById("notes").value;' +
    '  var participants = document.getElementById("participants").value;' +
    '  if (!notes.trim()) { alert("Please paste meeting notes"); return; }' +
    '  document.querySelector("button").disabled = true;' +
    '  document.querySelector("button").textContent = "Processing...";' +
    '  google.script.run.withSuccessHandler(function(result) {' +
    '    alert(result); google.script.host.close();' +
    '  }).withFailureHandler(function(err) {' +
    '    alert("Error: " + err.message); document.querySelector("button").disabled = false;' +
    '    document.querySelector("button").textContent = "📥 Process Notes";' +
    '  }).processGranolaNotesForSatellite(satellite, notes, participants);' +
    '}' +
    '</script></body></html>';
}


/**
 * Server-side handler: processes Granola notes for a specific satellite
 */
function processGranolaNotesForSatellite(satelliteName, granolaText, participantsStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get Claude API key
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY') || CONFIG.claudeApiKey;
  if (!apiKey) {
    throw new Error('Claude API key not configured. Set CLAUDE_API_KEY in Script Properties.');
  }
  
  // Find the check-in config
  const checkIn = CONFIG.checkIns.find(c => c.name === satelliteName);
  if (!checkIn) throw new Error('Satellite "' + satelliteName + '" not found in config.');
  
  // Call Claude to extract structured data from Granola notes
  const extracted = extractMeetingData_(apiKey, granolaText, satelliteName, checkIn.owner);
  
  // Populate the satellite tracker in master
  const sheet = ss.getSheetByName(checkIn.activeSheet);
  if (!sheet) throw new Error('Master sheet "' + checkIn.activeSheet + '" not found.');
  
  // Populate agenda items
  if (extracted.agenda && extracted.agenda.length > 0) {
    const agendaRows = Math.min(extracted.agenda.length, 9);
    for (let i = 0; i < agendaRows; i++) {
      const a = extracted.agenda[i];
      sheet.getRange(11 + i, 1, 1, 6).setValues([[
        a.topic || '', a.owner || '', a.notes || '', a.link || '', a.priority || '', ''
      ]]);
    }
  }
  
  // Populate decisions
  if (extracted.decisions && extracted.decisions.length > 0) {
    const decRows = Math.min(extracted.decisions.length, 7);
    for (let i = 0; i < decRows; i++) {
      const d = extracted.decisions[i];
      sheet.getRange(22 + i, 1, 1, 6).setValues([[
        d.decision || '', d.owner || '', d.impact || '', d.followUp || '', d.link || '', ''
      ]]);
    }
  }
  
  // Populate action items
  if (extracted.actionItems && extracted.actionItems.length > 0) {
    const actRows = Math.min(extracted.actionItems.length, 10);
    for (let i = 0; i < actRows; i++) {
      const a = extracted.actionItems[i];
      sheet.getRange(31 + i, 1, 1, 6).setValues([[
        a.task || '', a.owner || '', a.dueDate || '', a.status || 'Not Started', a.link || '', satelliteName
      ]]);
    }
  }
  
  // Push to satellite workbook
  pushToSingleSatellite_(ss, satelliteName);
  
  // Refresh master RACI
  refreshMasterRACI();
  
  // Log the meeting
  logMeeting_(ss, satelliteName, participantsStr, granolaText, extracted);
  
  // Store participants and summary for later email sending
  const props = PropertiesService.getDocumentProperties();
  props.setProperty('LAST_MEETING_SATELLITE', satelliteName);
  props.setProperty('LAST_MEETING_PARTICIPANTS', participantsStr);
  props.setProperty('LAST_MEETING_SUMMARY', extracted.summary || '');
  
  const actionCount = extracted.actionItems ? extracted.actionItems.length : 0;
  const decisionCount = extracted.decisions ? extracted.decisions.length : 0;
  
  return 'Meeting notes processed!\n\n' +
    '• ' + actionCount + ' action items extracted\n' +
    '• ' + decisionCount + ' decisions recorded\n' +
    '• Satellite tracker updated\n' +
    '• Master RACI refreshed\n\n' +
    'Use "Send Meeting Summary to Participants" to email attendees.';
}


/**
 * Calls Claude API to extract structured meeting data from Granola notes
 */
function extractMeetingData_(apiKey, granolaText, satelliteName, owner) {
  const prompt = 'You are extracting structured meeting data from Granola meeting notes for the "' + satelliteName + '" check-in (owner: ' + owner + ').\n\n' +
    'Extract the following from these meeting notes and return as JSON:\n' +
    '1. "summary": A 2-3 sentence executive summary of the meeting\n' +
    '2. "agenda": Array of {topic, owner, notes, priority} - topics discussed\n' +
    '3. "decisions": Array of {decision, owner, impact, followUp} - decisions made\n' +
    '4. "actionItems": Array of {task, owner, dueDate, status} - action items assigned\n' +
    '5. "participants": Array of names of people who participated\n\n' +
    'For priority use P0-P3 (P0=critical). For impact use High/Medium/Low.\n' +
    'For status default to "Not Started". For dueDate use format like "Mar 15, 2026" or leave empty.\n' +
    'Return ONLY valid JSON, no markdown.\n\n' +
    '--- MEETING NOTES ---\n' + granolaText;
  
  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify({
      model: CONFIG.claudeModel,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  const result = JSON.parse(response.getContentText());
  const text = result.content[0].text;
  
  // Parse JSON from Claude's response
  try {
    return JSON.parse(text);
  } catch (e) {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Could not parse Claude response as JSON');
  }
}


/**
 * Pushes data to a single satellite workbook
 */
function pushToSingleSatellite_(ss, satelliteName) {
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  if (!configSheet) return;
  
  const data = configSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] !== satelliteName || !data[i][1]) continue;
    
    const checkIn = CONFIG.checkIns.find(c => c.name === satelliteName);
    if (!checkIn || checkIn.type === 'okr') continue;
    
    try {
      const satellite = SpreadsheetApp.openById(data[i][1]);
      const satSheet = satellite.getSheetByName('Check-In');
      if (!satSheet) continue;
      
      const masterSheet = ss.getSheetByName(checkIn.activeSheet);
      if (!masterSheet) continue;
      
      // Push all editable sections from master to satellite
      satSheet.getRange('A11:F19').setValues(masterSheet.getRange('A11:F19').getValues());
      satSheet.getRange('A22:F28').setValues(masterSheet.getRange('A22:F28').getValues());
      satSheet.getRange('A31:F40').setValues(masterSheet.getRange('A31:F40').getValues());
      
      configSheet.getRange(i + 1, 4).setValue(new Date());
      configSheet.getRange(i + 1, 5).setValue('Synced');
    } catch (error) {
      console.error('Push failed for ' + satelliteName + ': ' + error.message);
    }
    break;
  }
}


function logMeeting_(ss, satelliteName, participants, notes, extracted) {
  let logSheet = ss.getSheetByName(CONFIG.sheets.meetingLog);
  if (!logSheet) {
    createMeetingLogSheet_();
    logSheet = ss.getSheetByName(CONFIG.sheets.meetingLog);
  }

  const actionCount = extracted.actionItems ? extracted.actionItems.length : 0;
  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const timeStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'h:mm a');

  logSheet.appendRow([
    dateStr,
    timeStr,
    satelliteName + ' Check-In',
    satelliteName,
    participants || '',
    '',
    extracted.summary || '',
    actionCount,
    '✅ Processed'
  ]);
}


// ============================================================================
// ACTION ITEM DISTRIBUTION FROM INTERNAL STAKEHOLDERS
// ============================================================================

/**
 * After an Internal Stakeholders meeting, distribute action items to the
 * appropriate satellite trackers based on owner assignments.
 * 
 * e.g., if an action item is assigned to Lumi Tan → push to Curator satellite
 *       if assigned to Richard Lonsdorf → push to Production satellite
 */
function distributeFromInternalStakeholders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  const isSheet = ss.getSheetByName('Internal Stakeholders Check-In');
  if (!isSheet) {
    ui.alert('Internal Stakeholders Check-In sheet not found.');
    return;
  }
  
  // Build owner → satellite mapping
  const ownerMap = {};
  CONFIG.checkIns.forEach(c => {
    if (c.type === 'checkin' && c.owner && c.name !== 'Internal Stakeholders' && c.name !== 'Advisory Committee') {
      // Map owner names to satellite names
      const names = c.owner.split(',').map(n => n.trim().toLowerCase());
      names.forEach(name => {
        ownerMap[name] = c.name;
      });
    }
  });
  
  // Also add known name mappings
  ownerMap['lumi tan'] = 'Curator';
  ownerMap['lumi'] = 'Curator';
  ownerMap['richard lonsdorf'] = 'Production';
  ownerMap['richard'] = 'Production';
  
  // Read action items from Internal Stakeholders sheet
  const actionData = isSheet.getRange('A31:F40').getValues();
  
  const distributed = {};
  const unmatched = [];
  
  actionData.forEach(row => {
    if (!row[0] || String(row[0]).trim() === '') return;
    
    const owner = String(row[1] || '').trim().toLowerCase();
    let targetSatellite = null;
    
    // Try to match owner to a satellite
    for (const [key, sat] of Object.entries(ownerMap)) {
      if (owner.includes(key) || key.includes(owner)) {
        targetSatellite = sat;
        break;
      }
    }
    
    if (targetSatellite) {
      if (!distributed[targetSatellite]) {
        distributed[targetSatellite] = [];
      }
      distributed[targetSatellite].push(row);
    } else if (owner) {
      unmatched.push(row);
    }
  });
  
  // Distribute to each satellite
  let totalDistributed = 0;
  
  Object.entries(distributed).forEach(([satName, items]) => {
    const checkIn = CONFIG.checkIns.find(c => c.name === satName);
    if (!checkIn) return;
    
    const targetSheet = ss.getSheetByName(checkIn.activeSheet);
    if (!targetSheet) return;
    
    // Find next empty action item row in target (rows 31-40)
    const existingActions = targetSheet.getRange('A31:A40').getValues();
    let nextRow = 31;
    for (let i = 0; i < existingActions.length; i++) {
      if (!existingActions[i][0] || String(existingActions[i][0]).trim() === '') {
        nextRow = 31 + i;
        break;
      }
      if (i === existingActions.length - 1) {
        nextRow = 31 + i + 1;
      }
    }
    
    items.forEach(item => {
      if (nextRow > 40) return; // Don't exceed action items area
      
      targetSheet.getRange(nextRow, 1, 1, 6).setValues([[
        '📤 [From IS] ' + item[0],
        item[1],
        item[2],
        item[3] || 'Not Started',
        item[4] || '',
        'Internal Stakeholders'
      ]]);
      nextRow++;
      totalDistributed++;
    });
    
    // Push to satellite workbook
    pushToSingleSatellite_(ss, satName);
  });
  
  // Refresh master RACI
  refreshMasterRACI();
  
  let message = totalDistributed + ' action item(s) distributed to satellite trackers:\n\n';
  Object.entries(distributed).forEach(([sat, items]) => {
    message += '• ' + sat + ': ' + items.length + ' item(s)\n';
  });
  
  if (unmatched.length > 0) {
    message += '\n⚠️ ' + unmatched.length + ' item(s) could not be matched to a satellite (unknown owner).';
  }
  
  ui.alert('📤 Distribution Complete', message, ui.ButtonSet.OK);
}


// ============================================================================
// FY2027 TIMELINE SATELLITE
// ============================================================================

/**
 * Creates and configures the FY2027 Timeline satellite workbook.
 * Timeline covers Q4 FY2026 (Apr-Jun 2026) through Q4 FY2027 (Apr-Jun 2027).
 * Dates from each satellite's check-in can be mapped against this timeline.
 */
function setupTimelineSatellite() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '📅 Setup FY2027 Timeline',
    'This will create:\n\n' +
    '1. A "📅 FY2027 Timeline" sheet in your master workbook\n' +
    '2. A satellite workbook for the timeline (shareable)\n\n' +
    'The timeline covers Q4 FY2026 (Apr-Jun 2026) through Q4 FY2027 (Apr-Jun 2027).\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    ss.toast('Creating FY2027 Timeline...', '📅 Setup', -1);
    
    // Create timeline sheet in master
    createTimelineSheet_(ss);
    
    // Create timeline satellite
    createTimelineSatelliteWorkbook_(ss);
    
    ss.toast('FY2027 Timeline created!', '✅ Complete', 5);
    
    ui.alert(
      '✅ Timeline Created',
      'The FY2027 Timeline has been set up.\n\n' +
      'Use "Update FY2027 Timeline" to populate it with dates from your satellite check-ins.\n' +
      'The timeline data also feeds into the Sprint Deck.',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    ui.alert('❌ Error', error.message, ui.ButtonSet.OK);
    console.error(error);
  }
}


function createTimelineSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.sheets.timelineConfig);
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(CONFIG.sheets.timelineConfig);
  }
  
  const timeline = CONFIG.fy2027Timeline;
  
  // Title
  sheet.getRange('A1').setValue('📅 ' + timeline.label);
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold');
  sheet.getRange('A2').setValue('Last updated: ' + new Date().toLocaleString());
  sheet.getRange('A2').setFontStyle('italic').setFontColor('#666');
  
  // Build header row with months
  let col = 2;
  const monthHeaders = ['Milestone / Item'];
  const quarterRow = [''];
  
  timeline.quarters.forEach(q => {
    quarterRow.push(q.name, '', '');
    q.months.forEach(m => {
      monthHeaders.push(m);
    });
  });
  
  // Row 4: Quarter headers (merged)
  sheet.getRange(4, 1, 1, monthHeaders.length).setValues([[''].concat(Array(monthHeaders.length - 1).fill(''))]);
  col = 2;
  timeline.quarters.forEach(q => {
    sheet.getRange(4, col, 1, 3).merge().setValue(q.name);
    sheet.getRange(4, col, 1, 3).setBackground(q.color).setFontWeight('bold').setHorizontalAlignment('center');
    col += 3;
  });
  
  // Row 5: Month headers
  sheet.getRange(5, 1, 1, monthHeaders.length).setValues([monthHeaders]);
  sheet.getRange(5, 1, 1, monthHeaders.length).setFontWeight('bold').setBackground('#e8eaed');
  
  // Add satellite sections
  let currentRow = 6;
  
  CONFIG.checkIns.forEach(checkIn => {
    if (checkIn.type === 'okr') return;
    
    sheet.getRange(currentRow, 1).setValue('▶ ' + checkIn.name + ' (' + checkIn.owner + ')');
    sheet.getRange(currentRow, 1, 1, monthHeaders.length).setFontWeight('bold').setBackground('#f5f5f5');
    currentRow++;
    
    // Add 5 empty rows for milestones per satellite
    for (let i = 0; i < 5; i++) {
      currentRow++;
    }
    
    currentRow++; // Spacer
  });
  
  // Format columns
  sheet.setColumnWidth(1, 250);
  for (let c = 2; c <= monthHeaders.length; c++) {
    sheet.setColumnWidth(c, 90);
  }
  
  sheet.setFrozenRows(5);
  sheet.setFrozenColumns(1);
  
  return sheet;
}


function createTimelineSatelliteWorkbook_(ss) {
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  if (!configSheet) return;
  
  // Check if timeline satellite already exists in config
  const data = configSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'FY2027 Timeline' && data[i][1]) return;
  }
  
  const masterFolder = DriveApp.getFileById(ss.getId()).getParents().next();
  let satelliteFolder;
  const folderIterator = masterFolder.getFoldersByName('CCAT Satellite Check-Ins');
  if (folderIterator.hasNext()) {
    satelliteFolder = folderIterator.next();
  } else {
    satelliteFolder = masterFolder.createFolder('CCAT Satellite Check-Ins');
  }
  
  const satellite = SpreadsheetApp.create('CCAT — FY2027 Timeline');
  DriveApp.getFileById(satellite.getId()).moveTo(satelliteFolder);
  
  // Copy timeline data from master to satellite
  const masterTimeline = ss.getSheetByName(CONFIG.sheets.timelineConfig);
  if (masterTimeline) {
    const satSheet = satellite.getSheets()[0];
    satSheet.setName('FY2027 Timeline');
    
    const sourceData = masterTimeline.getDataRange();
    const values = sourceData.getValues();
    const backgrounds = sourceData.getBackgrounds();
    const fontWeights = sourceData.getFontWeights();
    
    satSheet.getRange(1, 1, values.length, values[0].length).setValues(values);
    satSheet.getRange(1, 1, values.length, values[0].length).setBackgrounds(backgrounds);
    satSheet.getRange(1, 1, values.length, values[0].length).setFontWeights(fontWeights);
    
    for (let c = 1; c <= values[0].length; c++) {
      satSheet.setColumnWidth(c, masterTimeline.getColumnWidth(c));
    }
  }
  
  // Add to config
  const newRow = configSheet.getLastRow() + 1;
  configSheet.getRange(newRow, 1, 1, 6).setValues([[
    'FY2027 Timeline',
    satellite.getId(),
    satellite.getUrl(),
    new Date(),
    'Created',
    'Shared'
  ]]);
}


/**
 * Updates the FY2027 Timeline by mapping dates from satellite check-in action items.
 * Also pushes to the timeline satellite and sprint deck data.
 */
function updateFY2027Timeline() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const timelineSheet = ss.getSheetByName(CONFIG.sheets.timelineConfig);
  
  if (!timelineSheet) {
    SpreadsheetApp.getUi().alert('Timeline sheet not found. Run "Setup FY2027 Timeline" first.');
    return;
  }
  
  ss.toast('Updating FY2027 Timeline...', '📅 Timeline', -1);
  
  // Rebuild the timeline with current data from satellites
  createTimelineSheet_(ss);
  
  // Now populate with actual dates from satellite action items
  const timeline = CONFIG.fy2027Timeline;
  const allMonths = [];
  timeline.quarters.forEach(q => {
    q.months.forEach(m => allMonths.push(m));
  });
  
  let currentRow = 6;
  
  CONFIG.checkIns.forEach(checkIn => {
    if (checkIn.type === 'okr') return;
    
    currentRow++; // Skip satellite header row
    
    const sheet = ss.getSheetByName(checkIn.activeSheet);
    if (!sheet) {
      currentRow += 6; // Skip empty rows + spacer
      return;
    }
    
    // Get action items with due dates
    const actionData = sheet.getRange('A31:F40').getValues();
    let itemRow = 0;
    
    actionData.forEach(row => {
      if (!row[0] || !row[2] || itemRow >= 5) return;
      
      const dueDate = new Date(row[2]);
      if (isNaN(dueDate.getTime())) return;
      
      const monthStr = dueDate.toLocaleString('default', { month: 'short' }) + ' ' + dueDate.getFullYear();
      const monthIndex = allMonths.findIndex(m => m === monthStr);
      
      if (monthIndex >= 0) {
        timelineSheet.getRange(currentRow + itemRow, 1).setValue(row[0]);
        const emoji = CONFIG.categoryEmojis[row[4]] || '📌';
        timelineSheet.getRange(currentRow + itemRow, 2 + monthIndex).setValue(emoji);
        timelineSheet.getRange(currentRow + itemRow, 2 + monthIndex)
          .setBackground('#FFFFFF')
          .setFontSize(14)
          .setHorizontalAlignment('center');
        itemRow++;
      }
    });
    
    currentRow += 6; // Move past item rows + spacer
  });
  
  // Sync timeline to satellite
  syncTimelineToSatellite_(ss);
  
  ss.toast('FY2027 Timeline updated!', '✅ Complete', 5);
}


function syncTimelineToSatellite_(ss) {
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  if (!configSheet) return;
  
  const data = configSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'FY2027 Timeline' && data[i][1]) {
      try {
        const satellite = SpreadsheetApp.openById(data[i][1]);
        const satSheet = satellite.getSheetByName('FY2027 Timeline');
        if (!satSheet) return;
        
        const masterSheet = ss.getSheetByName(CONFIG.sheets.timelineConfig);
        if (!masterSheet) return;
        
        satSheet.clear();
        const sourceData = masterSheet.getDataRange();
        const values = sourceData.getValues();
        const backgrounds = sourceData.getBackgrounds();
        const fontWeights = sourceData.getFontWeights();
        
        satSheet.getRange(1, 1, values.length, values[0].length).setValues(values);
        satSheet.getRange(1, 1, values.length, values[0].length).setBackgrounds(backgrounds);
        satSheet.getRange(1, 1, values.length, values[0].length).setFontWeights(fontWeights);
        
        configSheet.getRange(i + 1, 4).setValue(new Date());
        configSheet.getRange(i + 1, 5).setValue('Synced');
      } catch (error) {
        console.error('Timeline sync error: ' + error.message);
      }
      break;
    }
  }
}


// ============================================================================
// FULL YEAR TIMELINE + NEXT 4 WEEKS
// ============================================================================

/**
 * Setup both timelines from the Setup menu
 */
function setupTimelines() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  ss.toast('Creating timelines...', '📅 Setup', -1);
  createFullYearTimelineSheet_(ss);
  createNext4WeeksSheet_(ss);
  ss.toast('Timelines created!', '✅ Complete', 5);
  ui.alert('✅ Timelines Created', 'Both "Full Year Timeline" and "Next 4 Weeks" sheets have been created with milestones pre-populated.\n\nItems marked with ⏳ have TBD dates (placed on estimated month).', ui.ButtonSet.OK);
}

/**
 * Creates the Full Year Timeline sheet with high-level milestones.
 * Pre-populated from the Yana Peel deck + internal stakeholder meeting context.
 * TBD dates are marked with ⏳ prefix.
 */
function createFullYearTimelineSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.sheets.fullYearTimeline);
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(CONFIG.sheets.fullYearTimeline);
  }

  // Title
  sheet.getRange('A1').setValue('📅 CCAT Full Year Timeline (FY2027)');
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold');
  sheet.getRange('A2').setValue('Last updated: ' + new Date().toLocaleString() + '  |  ⏳ = Date is TBD (placed at estimated month)');
  sheet.getRange('A2').setFontStyle('italic').setFontColor('#666');

  // Months: Mar 2026 through Jun 2027 (16 months)
  const months = [
    'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026',
    'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026',
    'Nov 2026', 'Dec 2026', 'Jan 2027', 'Feb 2027',
    'Mar 2027', 'Apr 2027', 'May 2027', 'Jun 2027'
  ];

  // Quarter labels mapping
  const quarterMap = {
    'Mar 2026': 'Q3 FY2026', 'Apr 2026': 'Q4 FY2026', 'May 2026': 'Q4 FY2026', 'Jun 2026': 'Q4 FY2026',
    'Jul 2026': 'Q1 FY2027', 'Aug 2026': 'Q1 FY2027', 'Sep 2026': 'Q1 FY2027',
    'Oct 2026': 'Q2 FY2027', 'Nov 2026': 'Q2 FY2027', 'Dec 2026': 'Q2 FY2027',
    'Jan 2027': 'Q3 FY2027', 'Feb 2027': 'Q3 FY2027', 'Mar 2027': 'Q3 FY2027',
    'Apr 2027': 'Q4 FY2027', 'May 2027': 'Q4 FY2027', 'Jun 2027': 'Q4 FY2027'
  };

  const quarterColors = {
    'Q3 FY2026': '#E0E0E0', 'Q4 FY2026': '#F3E5F5',
    'Q1 FY2027': '#E3F2FD', 'Q2 FY2027': '#E8F5E9',
    'Q3 FY2027': '#FFF3E0', 'Q4 FY2027': '#F3E5F5'
  };

  // Row 4: Quarter headers (merged)
  let col = 2;
  const quarters = ['Q3 FY2026', 'Q4 FY2026', 'Q1 FY2027', 'Q2 FY2027', 'Q3 FY2027', 'Q4 FY2027'];
  const qWidths = [1, 3, 3, 3, 3, 3];
  quarters.forEach((q, i) => {
    sheet.getRange(4, col, 1, qWidths[i]).merge().setValue(q);
    sheet.getRange(4, col, 1, qWidths[i]).setBackground(quarterColors[q]).setFontWeight('bold').setHorizontalAlignment('center');
    col += qWidths[i];
  });

  // Row 5: Month headers
  const headerRow = ['Category'].concat(months);
  sheet.getRange(5, 1, 1, headerRow.length).setValues([headerRow]);
  sheet.getRange(5, 1, 1, headerRow.length).setFontWeight('bold').setBackground('#e8eaed');

  // Apply month background colors
  for (let c = 0; c < months.length; c++) {
    const qColor = quarterColors[quarterMap[months[c]]];
    sheet.getRange(5, c + 2).setBackground(qColor);
  }

  // ---- PRE-POPULATED MILESTONES FROM YANA DECK + TRANSCRIPT ----
  // Each milestone: [category, monthIndex (0-based in months array), label, isTBD]
  const milestones = [
    // HIRING
    { cat: '👥 Hiring', items: [
      { month: 0, label: 'Phase 1: Internal JD Approval (By Mar 13)', tbd: false },
      { month: 0, label: 'Phase 2: Finalize & Post JDs (By Mar 20)', tbd: false },
      { month: 0, label: 'Phase 3: Open Search Window (Mar 20 – Apr 27)', tbd: false },
      { month: 1, label: 'Phase 3 continues (Mar 20 – Apr 27)', tbd: false },
      { month: 1, label: 'Phase 4: Close Search (Week of Apr 28)', tbd: false },
      { month: 2, label: 'Phase 5: Interviews (May 12 – May 23)', tbd: false },
      { month: 2, label: '⏳ Directors of ML + Moving Image Appointed', tbd: true },
      { month: 3, label: '⏳ Full Team in Place', tbd: true },
    ]},
    // ADVISORY COMMS
    { cat: '📣 Advisory Committee Comms', items: [
      { month: 0, label: 'Comms 1: Broad Thank-You / Readout w/ JD Links (Mar 24)', tbd: false },
      { month: 1, label: 'Comms 2: Individual Formal AC Invitations (Apr 7–14)', tbd: false },
      { month: 3, label: '⏳ Advisory Committee Established', tbd: true },
    ]},
    // BUDGET & GOVERNANCE
    { cat: '💰 Budget & Governance', items: [
      { month: 0, label: 'Dedicated Budget Meeting (Financial deep-dive w/ Chanel)', tbd: false },
      { month: 0, label: 'Budget Refinement (Advancement + ED)', tbd: false },
      { month: 1, label: '⏳ Budget Proposal for Speaker Series + Visiting Artists', tbd: true },
    ]},
    // BUILDING & FACILITIES
    { cat: '🏗️ Building (BB6)', items: [
      { month: 0, label: 'BB6 Equipment Plan (ED + IT)', tbd: false },
      { month: 0, label: 'Itemized Equipment List (Deliverable)', tbd: false },
      { month: 0, label: 'Facilities / IT Status Meeting for Advancement', tbd: false },
      { month: 0, label: 'Mar 24: Architect Visit to CalArts', tbd: false },
      { month: 2, label: '⏳ BB6 Construction Handover (End of May target)', tbd: true },
      { month: 3, label: 'BB6 Complete (Hard Deadline)', tbd: false },
    ]},
    // EVENTS & PROGRAMMING
    { cat: '🎪 Events & Programming', items: [
      { month: 1, label: 'Apr 9: Mashinka Firenzi Hakopian (Speaker Series #2)', tbd: false },
      { month: 1, label: 'Apr 9: IDEA Grant Event — Algorithmic Justice in the Wild', tbd: false },
      { month: 4, label: '⏳ Orientation Event (Speaker Series #3) — Open House + Demos', tbd: true },
      { month: 5, label: '⏳ Faculty/Staff Open House & Center Walkthrough', tbd: true },
      { month: 5, label: '⏳ Ribbon Cutting / Center Launch', tbd: true },
      { month: 6, label: '⏳ Fall Programming with Visiting Artists', tbd: true },
    ]},
    // CURATION & RESEARCH
    { cat: '🎨 Curation & Research', items: [
      { month: 1, label: '⏳ Lumi LA Visit — Studio Visits + Budget/Curation Model', tbd: true },
      { month: 2, label: '⏳ Research Agendas Defined', tbd: true },
      { month: 2, label: '⏳ Faculty Fellow Selection Begins', tbd: true },
      { month: 3, label: '⏳ Discovery Tour (ED + Curator)', tbd: true },
      { month: 3, label: '⏳ Fellowship Framework Launched', tbd: true },
      { month: 6, label: '⏳ Research Agenda Launch', tbd: true },
      { month: 6, label: '⏳ Year 2 Research + Artist Program Revealed', tbd: true },
    ]},
    // COMMUNICATIONS & REPORTING
    { cat: '📣 Reporting & Deliverables', items: [
      { month: 0, label: 'Tech Notes + Takeaways Shared with Yana, Ravi, Provost', tbd: false },
      { month: 0, label: 'Mar 27: Presentation to Yana Peel', tbd: false },
      { month: 0, label: 'Due Mar 20: Advisory Committee Proposal (names, expectations, engagement, comms)', tbd: false },
      { month: 0, label: 'Due Mar 20: Preliminary Plan for MC/Lumi Discovery Tour', tbd: false },
      { month: 0, label: 'Due Mar 20: Fall Programming with Artists Plan', tbd: false },
      { month: 4, label: '⏳ Full Team Announcement', tbd: true },
      { month: 12, label: '⏳ Symposium and White Paper (CCAT Major Contribution)', tbd: true },
    ]},
    // ACADEMIC CALENDAR
    { cat: '🎓 Academic Calendar', items: [
      { month: 2, label: 'May 15: CalArts Graduation', tbd: false },
      { month: 5, label: '⏳ New Student Orientation (Mid-Aug → Early Sep)', tbd: true },
      { month: 5, label: '⏳ Faculty In-Service Days (Early Aug)', tbd: true },
    ]},
  ];

  let currentRow = 7;

  milestones.forEach(section => {
    // Section header
    sheet.getRange(currentRow, 1, 1, headerRow.length).setBackground('#333333').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.getRange(currentRow, 1).setValue(section.cat);
    currentRow++;

    section.items.forEach(item => {
      sheet.getRange(currentRow, 1).setValue(item.label);
      if (item.tbd) {
        sheet.getRange(currentRow, 1).setFontColor('#9C27B0');
      }
      // Place marker in the correct month column
      const markerCol = item.month + 2;
      if (markerCol <= headerRow.length) {
        const marker = item.tbd ? '⏳' : '✅';
        sheet.getRange(currentRow, markerCol).setValue(marker).setHorizontalAlignment('center').setFontSize(12);
        // Light highlight across that cell
        const bgColor = item.tbd ? '#F3E5F5' : '#C8E6C9';
        sheet.getRange(currentRow, markerCol).setBackground(bgColor);
      }
      currentRow++;
    });

    currentRow++; // Spacer between sections
  });

  // Format
  sheet.setColumnWidth(1, 380);
  for (let c = 2; c <= headerRow.length; c++) {
    sheet.setColumnWidth(c, 75);
  }
  sheet.setFrozenRows(5);
  sheet.setFrozenColumns(1);

  return sheet;
}


/**
 * Refresh Full Year Timeline — redraws with latest data
 */
function refreshFullYearTimeline() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('Refreshing Full Year Timeline...', '📅 Timeline', -1);
  createFullYearTimelineSheet_(ss);
  ss.toast('Full Year Timeline refreshed!', '✅ Complete', 5);
}


/**
 * Creates the Next 4 Weeks timeline sheet with granular weekly view.
 * Pre-populated with near-term tasks from transcript context.
 */
function createNext4WeeksSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.sheets.next4Weeks);
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(CONFIG.sheets.next4Weeks);
  }

  const today = new Date();
  // Generate 4 weeks of Monday dates starting from this week
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday of current week

  const weeks = [];
  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(startOfWeek);
    weekStart.setDate(startOfWeek.getDate() + (w * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Friday
    const label = (weekStart.getMonth() + 1) + '/' + weekStart.getDate() + ' - ' + (weekEnd.getMonth() + 1) + '/' + weekEnd.getDate();
    weeks.push({ start: weekStart, end: weekEnd, label: label });
  }

  // Get current sprint info to label the 2-week blocks
  const sprintInfo = getCurrentSprintInfo_(ss);
  const sprintNameStr = String(sprintInfo.name || 'Sprint 1');
  const currentSprintNum = parseInt(sprintNameStr.replace(/[^0-9]/g, '')) || 1;

  // Title
  sheet.getRange('A1').setValue('📅 Next 4 Weeks — Detailed View');
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold');
  sheet.getRange('A2').setValue('Generated: ' + today.toLocaleString() + '  |  ⏳ = TBD date  |  Run "Refresh Next 4 Weeks" to update');
  sheet.getRange('A2').setFontStyle('italic').setFontColor('#666');

  // Row 3: Sprint labels spanning 2 weeks each
  // Current sprint covers weeks 0-1, next sprint covers weeks 2-3
  const sprintLabelRow = ['', '', ''];
  sprintLabelRow.push('Sprint ' + currentSprintNum);
  sprintLabelRow.push('');
  sprintLabelRow.push('Sprint ' + (currentSprintNum + 1));
  sprintLabelRow.push('');
  sheet.getRange(3, 1, 1, sprintLabelRow.length).setValues([sprintLabelRow]);
  // Merge sprint labels across their 2 week columns
  sheet.getRange(3, 4, 1, 2).merge().setHorizontalAlignment('center').setFontWeight('bold')
    .setBackground('#C9A227').setFontColor('#000000').setFontSize(11);
  sheet.getRange(3, 6, 1, 2).merge().setHorizontalAlignment('center').setFontWeight('bold')
    .setBackground('#4285F4').setFontColor('#FFFFFF').setFontSize(11);

  // Row 4: Week headers
  const headerRow = ['Task / Milestone', 'Owner', 'Status'];
  weeks.forEach(w => headerRow.push('Week of ' + w.label));
  sheet.getRange(4, 1, 1, headerRow.length).setValues([headerRow]);
  sheet.getRange(4, 1, 1, headerRow.length).setFontWeight('bold').setBackground('#1a73e8').setFontColor('#FFFFFF');

  // Pre-populated near-term items (Sprint 3: Mar 14-27, Sprint 4: Mar 28 - Apr 10)
  // Week 0 = Mar 14-20, Week 1 = Mar 21-27, Week 2 = Mar 28 - Apr 3, Week 3 = Apr 4-10
  const nearTermItems = [
    { section: '⏱️ Sprint Ceremonies', items: [
      { task: 'Sprint 3: Sprint Planning → Push to Internal Stakeholders (Mon EOD)', owner: 'ED', status: 'Not Started', week: 0 },
      { task: 'Sprint 3: External Kick-Off with Chanel (Wed)', owner: 'ED + Team', status: 'Not Started', week: 0 },
      { task: 'Sprint 3: Internal Sync — Bi-weekly IS Meeting (Fri)', owner: 'All Directors', status: 'Not Started', week: 1 },
      { task: 'Sprint 4: Sprint Planning → Push to Internal Stakeholders (Mon EOD)', owner: 'ED', status: 'Not Started', week: 2 },
      { task: 'Sprint 4: External Kick-Off with Chanel (Wed)', owner: 'ED + Team', status: 'Not Started', week: 2 },
      { task: 'Sprint 4: Internal Sync — Bi-weekly IS Meeting (Fri)', owner: 'All Directors', status: 'Not Started', week: 3 },
    ]},
    { section: '📋 DELIVERABLES DUE Fri Mar 20 (before Yana presentation)', items: [
      { task: 'Advisory Committee Proposal: names, expectations, engagement model, comms plan', owner: 'ED', status: 'Not Started', week: 0 },
      { task: 'Preliminary Plan for MC/Lumi Discovery Tour', owner: 'ED + Lumi', status: 'Not Started', week: 0 },
      { task: 'Fall Programming with Artists Plan', owner: 'ED + Lumi', status: 'Not Started', week: 0 },
      { task: 'Prepare Sprint Deck update for Yana presentation', owner: 'ED', status: 'Not Started', week: 0 },
      { task: 'Add speaker series recommendation to deck (2 models)', owner: 'ED', status: 'Not Started', week: 0 },
    ]},
    { section: '👥 Hiring Pipeline', items: [
      { task: 'Phase 2: Finalize & Post JDs (By Mar 20)', owner: 'ED', status: 'In Progress', week: 0 },
      { task: 'Phase 3: Open Search Window begins Mar 20', owner: 'ED', status: 'Not Started', week: 0 },
      { task: 'Comms 1: Broad Thank-You / Readout with JD Links (Mar 24)', owner: 'ED', status: 'Not Started', week: 1 },
      { task: 'Phase 3: Search Window open (ongoing through Apr 27)', owner: 'ED', status: 'Not Started', week: 2 },
    ]},
    { section: '🏗️ Building & Key Dates', items: [
      { task: 'BB6 Equipment Plan finalization', owner: 'ED + IT', status: 'In Progress', week: 0 },
      { task: 'Itemized Equipment List (Deliverable)', owner: 'ED', status: 'In Progress', week: 0 },
      { task: '🏛️ Mar 24: Architect Visit to CalArts', owner: 'ED + Andreas', status: 'Confirmed', week: 1 },
      { task: '📣 Mar 27: Presentation to Yana Peel', owner: 'ED + Katie', status: 'Confirmed', week: 1 },
    ]},
    { section: '🎪 Apr 9 Event (Speaker Series #2)', items: [
      { task: 'Confirm main gallery space (Lund Theater sound resolution)', owner: 'Richard', status: 'In Progress', week: 0 },
      { task: 'Reach out to Steve Lamb (Art School) for student interviewer', owner: 'Richard', status: 'Not Started', week: 0 },
      { task: 'Get proposal from John Threat (IDEA event details)', owner: 'Alex Jacoby', status: 'In Progress', week: 0 },
      { task: 'Book Nico for filming + Raphael for photos + ECO team', owner: 'Richard', status: 'Not Started', week: 0 },
      { task: 'Revise budget (CCAT absorbs full stage cost, no cost-sharing with IDEA)', owner: 'Richard', status: 'Not Started', week: 0 },
      { task: 'Confirm Mashinka studio visit / campus walkthrough', owner: 'Richard', status: 'Not Started', week: 1 },
      { task: 'Create survey/QR feedback mechanism for attendees', owner: 'Richard', status: 'Not Started', week: 1 },
      { task: 'Comms 2: Individual Formal AC Invitations (Apr 7–14)', owner: 'ED', status: 'Not Started', week: 3 },
      { task: '🎪 EVENT DAY: Apr 9 — Mashinka Talk 4:30pm + IDEA Roundtable 6pm', owner: 'All', status: 'Upcoming', week: 3 },
    ]},
    { section: '🎨 Curation', items: [
      { task: '⏳ Lumi LA visit — studio visits + curation model deep-dive', owner: 'Lumi + ED', status: 'Planning', week: 2 },
      { task: 'Budget proposal for visiting artists + speaker series', owner: 'ED', status: 'Not Started', week: 2 },
      { task: 'Research art/tech residency models (ongoing)', owner: 'Lumi', status: 'In Progress', week: 0 },
      { task: 'Send Michael Langan event recording to Lumi', owner: 'Richard', status: 'Not Started', week: 0 },
    ]},
    { section: '🏫 Internal', items: [
      { task: 'Investigate Alan Chen AI Symposium history + relevance', owner: 'ED', status: 'Not Started', week: 1 },
      { task: 'Technology Group Synthesis and Next Steps', owner: 'ED', status: 'In Progress', week: 0 },
      { task: 'Richard + Lumi meeting with Anthony (Student Services) re: orientation', owner: 'Richard + Lumi', status: 'Not Started', week: 1 },
      { task: 'Facilities / IT Status Meeting for Advancement', owner: 'IT + ED', status: 'Not Started', week: 1 },
    ]},
  ];

  let currentRow = 6;

  nearTermItems.forEach(section => {
    sheet.getRange(currentRow, 1, 1, headerRow.length).setBackground('#333333').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.getRange(currentRow, 1).setValue(section.section);
    currentRow++;

    section.items.forEach(item => {
      sheet.getRange(currentRow, 1).setValue(item.task);
      sheet.getRange(currentRow, 2).setValue(item.owner);
      sheet.getRange(currentRow, 3).setValue(item.status);

      // Color status cell
      const statusColors = { 'Complete': '#C8E6C9', 'In Progress': '#BBDEFB', 'Not Started': '#F5F5F5', 'Blocked': '#FFCDD2', 'Planning': '#FFF9C4', 'Upcoming': '#E1BEE7', 'Confirmed': '#DCEDC8' };
      sheet.getRange(currentRow, 3).setBackground(statusColors[item.status] || '#F5F5F5');

      // Place marker in correct week column
      if (item.week >= 0 && item.week < 4) {
        const marker = item.task.startsWith('⏳') ? '⏳' : (item.task.includes('EVENT DAY') ? '🎪' : '◆');
        sheet.getRange(currentRow, 4 + item.week).setValue(marker).setHorizontalAlignment('center');
        sheet.getRange(currentRow, 4 + item.week).setBackground('#E8EAF6');
      }

      // TBD items in purple
      if (item.task.startsWith('⏳')) {
        sheet.getRange(currentRow, 1).setFontColor('#9C27B0');
      }

      currentRow++;
    });

    currentRow++; // Spacer
  });

  // Also pull any action items from satellite check-ins with due dates in next 4 weeks
  currentRow++;
  sheet.getRange(currentRow, 1, 1, headerRow.length).setBackground('#1a73e8').setFontColor('#FFFFFF').setFontWeight('bold');
  sheet.getRange(currentRow, 1).setValue('📋 Action Items from Satellite Trackers (auto-pulled)');
  currentRow++;

  const weeksEnd = new Date(weeks[3].end);
  CONFIG.checkIns.forEach(checkIn => {
    if (checkIn.type === 'okr') return;
    const checkSheet = ss.getSheetByName(checkIn.activeSheet);
    if (!checkSheet) return;

    const actions = checkSheet.getRange('A31:F40').getValues();
    actions.forEach(row => {
      if (!row[0] || String(row[0]).trim() === '') return;
      const dueDate = row[2] ? new Date(row[2]) : null;
      if (!dueDate || isNaN(dueDate.getTime())) return;
      if (dueDate < today || dueDate > weeksEnd) return;

      sheet.getRange(currentRow, 1).setValue(row[0] + ' [' + checkIn.name + ']');
      sheet.getRange(currentRow, 2).setValue(row[1] || '');
      sheet.getRange(currentRow, 3).setValue(row[3] || 'Not Started');

      // Find which week
      for (let w = 0; w < 4; w++) {
        if (dueDate >= weeks[w].start && dueDate <= weeks[w].end) {
          sheet.getRange(currentRow, 4 + w).setValue('◆').setHorizontalAlignment('center').setBackground('#E8EAF6');
          break;
        }
      }
      currentRow++;
    });
  });

  // Format
  sheet.setColumnWidth(1, 420);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 100);
  for (let c = 4; c <= headerRow.length; c++) {
    sheet.setColumnWidth(c, 120);
  }
  sheet.setFrozenRows(4);
  sheet.setFrozenColumns(1);

  return sheet;
}


/**
 * Refresh Next 4 Weeks timeline
 */
function refreshNext4Weeks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('Refreshing Next 4 Weeks...', '📅 Timeline', -1);
  createNext4WeeksSheet_(ss);
  ss.toast('Next 4 Weeks refreshed!', '✅ Complete', 5);
}


// ============================================================================
// MEETING LOG — CALENDAR INTEGRATION
// ============================================================================

/**
 * Syncs the Meeting Log from the user's Google Calendar.
 * Pulls CCAT-related meetings from the last 30 days and next 30 days.
 * Shows calendar event link + link to Granola summary if available.
 */
function syncMeetingLogFromCalendar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  ss.toast('Syncing meetings from calendar...', '📝 Meeting Log', -1);

  let logSheet = ss.getSheetByName(CONFIG.sheets.meetingLog);
  if (!logSheet) {
    createMeetingLogSheet_();
    logSheet = ss.getSheetByName(CONFIG.sheets.meetingLog);
  }

  // Clear existing data (keep headers)
  const lastRow = logSheet.getLastRow();
  if (lastRow > 1) {
    logSheet.getRange(2, 1, lastRow - 1, 9).clear();
  }

  // Get calendar events — last 30 days to next 30 days
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - 30);
  const endDate = new Date(now);
  endDate.setDate(now.getDate() + 30);

  const calendar = CalendarApp.getDefaultCalendar();
  const events = calendar.getEvents(startDate, endDate);

  // CCAT-related keywords for filtering
  const ccatKeywords = ['ccat', 'chanel', 'sprint', 'check-in', 'checkin', 'sync', 'stakeholder',
    'production', 'curator', 'lumi', 'richard', 'internal stakeholders', 'director',
    'advisory', 'okr', 'timeline', 'budget', 'bb6', 'facilities'];

  // Satellite name mapping for auto-detection
  const satelliteKeywords = {
    'Production': ['production', 'richard lonsdorf', 'richard'],
    'Curator': ['curator', 'lumi tan', 'lumi', 'student life'],
    'Internal Stakeholders': ['internal stakeholder', 'all directors', 'team meeting', 'is check-in', 'is sync'],
    'Director ML': ['director ml', 'machine learning'],
    'Director MI': ['director mi', 'moving image'],
    'Technical Director': ['technical director', 'tech director'],
    'Advisory Committee': ['advisory'],
    'OKRs': ['okr', 'objectives'],
  };

  const rows = [];

  events.forEach(event => {
    const title = event.getTitle() || '';
    const titleLower = title.toLowerCase();
    const desc = (event.getDescription() || '').toLowerCase();

    // Check if this is a CCAT-related meeting
    const isCCAT = ccatKeywords.some(kw => titleLower.includes(kw) || desc.includes(kw));
    if (!isCCAT) return;

    const eventDate = event.getStartTime();
    const dateStr = Utilities.formatDate(eventDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(eventDate, Session.getScriptTimeZone(), 'h:mm a');

    // Detect satellite
    let satellite = '';
    for (const [satName, keywords] of Object.entries(satelliteKeywords)) {
      if (keywords.some(kw => titleLower.includes(kw))) {
        satellite = satName;
        break;
      }
    }

    // Get participants
    const guests = event.getGuestList(true);
    const participants = guests.map(g => g.getEmail()).join(', ');

    // Calendar event link
    const calendarLink = 'https://calendar.google.com/calendar/event?eid=' + Utilities.base64Encode(event.getId());

    // Check for Granola link in description
    let granolaLink = '';
    const descFull = event.getDescription() || '';
    const granolaMatch = descFull.match(/https:\/\/[^\s"<>]*granola[^\s"<>]*/i);
    if (granolaMatch) {
      granolaLink = granolaMatch[0];
    }

    // Check for meeting summary in document properties
    const props = PropertiesService.getDocumentProperties();
    const summaryKey = 'MEETING_SUMMARY_' + dateStr + '_' + satellite;
    const savedSummary = props.getProperty(summaryKey);
    if (savedSummary && !granolaLink) {
      granolaLink = savedSummary;
    }

    // Count action items if this satellite has been processed
    let actionCount = '';
    const checkIn = CONFIG.checkIns.find(c => c.name === satellite);
    if (checkIn && checkIn.type === 'checkin') {
      const checkSheet = ss.getSheetByName(checkIn.activeSheet);
      if (checkSheet) {
        const actions = checkSheet.getRange('A31:A40').getValues();
        const count = actions.filter(r => r[0] && String(r[0]).trim()).length;
        if (count > 0) actionCount = count;
      }
    }

    // Status: past = completed, today = today, future = upcoming
    let status = '📅 Upcoming';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDay = new Date(eventDate);
    eventDay.setHours(0, 0, 0, 0);
    if (eventDay < today) status = '✅ Past';
    else if (eventDay.getTime() === today.getTime()) status = '🔴 Today';

    rows.push([dateStr, timeStr, title, satellite, participants, calendarLink, granolaLink, actionCount, status]);
  });

  // Sort by date descending (most recent first)
  rows.sort((a, b) => new Date(b[0]) - new Date(a[0]));

  if (rows.length > 0) {
    logSheet.getRange(2, 1, rows.length, 9).setValues(rows);

    // Make links clickable
    for (let r = 0; r < rows.length; r++) {
      if (rows[r][5]) {
        logSheet.getRange(r + 2, 6).setFormula('=HYPERLINK("' + rows[r][5] + '", "📅 Open")');
      }
      if (rows[r][6]) {
        logSheet.getRange(r + 2, 7).setFormula('=HYPERLINK("' + rows[r][6] + '", "📝 Notes")');
      }
    }

    // Color-code status
    for (let r = 0; r < rows.length; r++) {
      const status = rows[r][8];
      if (status === '✅ Past') logSheet.getRange(r + 2, 9).setBackground('#C8E6C9');
      else if (status === '🔴 Today') logSheet.getRange(r + 2, 9).setBackground('#FFCDD2');
      else logSheet.getRange(r + 2, 9).setBackground('#BBDEFB');
    }
  }

  ss.toast(rows.length + ' CCAT meetings found!', '✅ Complete', 5);

  if (rows.length === 0) {
    ui.alert('📝 No Meetings Found', 'No CCAT-related meetings found in your calendar for the past/next 30 days.\n\nMake sure your meeting titles include CCAT-related keywords (e.g., "CCAT", "check-in", "sprint", satellite names, etc.)', ui.ButtonSet.OK);
  }
}


// ============================================================================
// SPRINT DECK UPDATE
// ============================================================================

/**
 * Generates structured data for the Sprint Deck (Google Slides).
 * This sheet provides tables that can be linked/embedded in the deck.
 * Includes: Sprint info, RACI summary, timeline snapshot, OKR status.
 */
function generateSprintDeckData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  ss.toast('Generating Sprint Deck data...', '📊 Deck', -1);
  
  let deckSheet = ss.getSheetByName(CONFIG.sheets.sprintDeckData);
  if (!deckSheet) {
    deckSheet = createSprintDeckDataSheet_();
  }
  deckSheet.clear();
  
  const sprintInfo = getCurrentSprintInfo_(ss);
  let currentRow = 1;
  
  // ---- SECTION 1: SPRINT INFO ----
  deckSheet.getRange(currentRow, 1).setValue('📊 SPRINT DECK DATA');
  deckSheet.getRange(currentRow, 1).setFontSize(16).setFontWeight('bold');
  currentRow++;
  deckSheet.getRange(currentRow, 1).setValue('Generated: ' + new Date().toLocaleString());
  deckSheet.getRange(currentRow, 1).setFontStyle('italic').setFontColor('#666');
  currentRow += 2;
  
  deckSheet.getRange(currentRow, 1).setValue('SPRINT INFO');
  deckSheet.getRange(currentRow, 1, 1, 2).setBackground('#000000').setFontColor('#FFFFFF').setFontWeight('bold');
  currentRow++;
  deckSheet.getRange(currentRow, 1, 3, 2).setValues([
    ['Sprint:', sprintInfo.name],
    ['Dates:', sprintInfo.dates],
    ['Intent:', sprintInfo.intent]
  ]);
  currentRow += 4;
  
  // ---- SECTION 2: OKR STATUS SUMMARY ----
  const okrSheet = ss.getSheetByName(CONFIG.sheets.okrs);
  let statusCounts = { 'Not Started': 0, 'In Progress': 0, 'Complete': 0, 'Blocked': 0 };
  let priorityCounts = { 'P0': 0, 'P1': 0, 'P2': 0, 'P3': 0 };
  
  if (okrSheet) {
    const data = okrSheet.getDataRange().getValues();
    const cols = CONFIG.okrColumns;
    
    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      const status = row[cols.status - 1];
      const priority = row[cols.priority - 1];
      if (status && statusCounts.hasOwnProperty(status)) statusCounts[status]++;
      if (priority && priorityCounts.hasOwnProperty(priority)) priorityCounts[priority]++;
    }
  }
  
  deckSheet.getRange(currentRow, 1).setValue('OKR STATUS');
  deckSheet.getRange(currentRow, 1, 1, 2).setBackground('#000000').setFontColor('#FFFFFF').setFontWeight('bold');
  currentRow++;
  deckSheet.getRange(currentRow, 1, 4, 2).setValues([
    ['✅ Complete', statusCounts['Complete']],
    ['🔄 In Progress', statusCounts['In Progress']],
    ['⏸️ Not Started', statusCounts['Not Started']],
    ['🚫 Blocked', statusCounts['Blocked']]
  ]);
  currentRow += 5;
  
  deckSheet.getRange(currentRow, 1).setValue('PRIORITY BREAKDOWN');
  deckSheet.getRange(currentRow, 1, 1, 2).setBackground('#000000').setFontColor('#FFFFFF').setFontWeight('bold');
  currentRow++;
  deckSheet.getRange(currentRow, 1, 4, 2).setValues([
    ['P0 (Critical)', priorityCounts['P0']],
    ['P1 (High)', priorityCounts['P1']],
    ['P2 (Medium)', priorityCounts['P2']],
    ['P3 (Low)', priorityCounts['P3']]
  ]);
  currentRow += 5;
  
  // ---- SECTION 3: RACI SUMMARY BY SATELLITE ----
  deckSheet.getRange(currentRow, 1).setValue('ACTION ITEMS BY SATELLITE');
  deckSheet.getRange(currentRow, 1, 1, 5).setBackground('#1a73e8').setFontColor('#FFFFFF').setFontWeight('bold');
  currentRow++;
  deckSheet.getRange(currentRow, 1, 1, 5).setValues([['Satellite', 'Total Items', 'Complete', 'In Progress', 'Blocked']]);
  deckSheet.getRange(currentRow, 1, 1, 5).setFontWeight('bold').setBackground('#e8eaed');
  currentRow++;
  
  CONFIG.checkIns.forEach(checkIn => {
    if (checkIn.type === 'okr') return;
    
    const sheet = ss.getSheetByName(checkIn.activeSheet);
    if (!sheet) return;
    
    const actions = sheet.getRange('A31:D40').getValues();
    let total = 0, complete = 0, inProgress = 0, blocked = 0;
    
    actions.forEach(row => {
      if (!row[0] || String(row[0]).trim() === '') return;
      total++;
      const status = String(row[3] || '').toLowerCase();
      if (status === 'complete' || status === 'done') complete++;
      else if (status === 'in progress') inProgress++;
      else if (status === 'blocked') blocked++;
    });
    
    if (total > 0) {
      deckSheet.getRange(currentRow, 1, 1, 5).setValues([[
        checkIn.name, total, complete, inProgress, blocked
      ]]);
      currentRow++;
    }
  });
  
  currentRow += 2;
  
  // ---- SECTION 4: TIMELINE SNAPSHOT ----
  deckSheet.getRange(currentRow, 1).setValue('FY2027 TIMELINE SNAPSHOT');
  deckSheet.getRange(currentRow, 1, 1, 5).setBackground('#C9A227').setFontColor('#000000').setFontWeight('bold');
  currentRow++;
  
  const timelineSheet = ss.getSheetByName(CONFIG.sheets.timelineConfig);
  if (timelineSheet) {
    // Copy a compact version of the timeline
    const timelineData = timelineSheet.getDataRange().getValues();
    if (timelineData.length > 3) {
      for (let r = 3; r < Math.min(timelineData.length, 30); r++) {
        const row = timelineData[r];
        if (row[0] && String(row[0]).trim() !== '') {
          deckSheet.getRange(currentRow, 1, 1, Math.min(row.length, 16)).setValues([row.slice(0, 16)]);
          currentRow++;
        }
      }
    }
  } else {
    deckSheet.getRange(currentRow, 1).setValue('Timeline not configured. Run Setup → Setup FY2027 Timeline.');
    currentRow++;
  }
  
  currentRow += 2;
  
  // ---- SECTION 5: KEY ACTION ITEMS ----
  deckSheet.getRange(currentRow, 1).setValue('KEY ACTION ITEMS (THIS SPRINT)');
  deckSheet.getRange(currentRow, 1, 1, 5).setBackground('#000000').setFontColor('#FFFFFF').setFontWeight('bold');
  currentRow++;
  deckSheet.getRange(currentRow, 1, 1, 5).setValues([['Task', 'Owner', 'Due', 'Status', 'Source']]);
  deckSheet.getRange(currentRow, 1, 1, 5).setFontWeight('bold').setBackground('#e8eaed');
  currentRow++;
  
  // Pull top action items from master RACI
  const raciSheet = ss.getSheetByName(CONFIG.sheets.masterRaci);
  if (raciSheet) {
    const raciData = raciSheet.getDataRange().getValues();
    let itemCount = 0;
    
    for (let r = 1; r < raciData.length && itemCount < 15; r++) {
      const row = raciData[r];
      if (!row[1] || String(row[1]).trim() === '') continue;
      
      const status = String(row[4] || '');
      if (status.toLowerCase() === 'complete') continue;
      
      deckSheet.getRange(currentRow, 1, 1, 5).setValues([[
        row[1], // Task
        row[2], // Owner
        row[3], // Due
        row[4], // Status
        row[0]  // Source
      ]]);
      
      // Color by status
      if (status.toLowerCase() === 'blocked') {
        deckSheet.getRange(currentRow, 4).setBackground('#f4c7c3');
      } else if (status.toLowerCase() === 'in progress') {
        deckSheet.getRange(currentRow, 4).setBackground('#c6efce');
      }
      
      currentRow++;
      itemCount++;
    }
  }
  
  // Format columns
  deckSheet.setColumnWidth(1, 300);
  deckSheet.setColumnWidth(2, 150);
  deckSheet.setColumnWidth(3, 120);
  deckSheet.setColumnWidth(4, 120);
  deckSheet.setColumnWidth(5, 150);
  
  ss.toast('Sprint Deck data generated!', '✅ Complete', 5);
  
  ui.alert(
    '📊 Sprint Deck Data Ready',
    'The "' + CONFIG.sheets.sprintDeckData + '" sheet has been updated.\n\n' +
    'To embed in Google Slides:\n' +
    '1. Open your Sprint Update deck\n' +
    '2. Insert → Chart → From Sheets\n' +
    '3. Select this workbook and the data tables\n' +
    '4. Tables auto-update when you regenerate this data\n\n' +
    'We can work together on the formatting and layout next!',
    ui.ButtonSet.OK
  );
}


function sendSprintSummaryEmail() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  let email = PropertiesService.getDocumentProperties().getProperty('NOTIFICATION_EMAIL');
  if (!email || email === 'YOUR_EMAIL@example.com') {
    const response = ui.prompt('📧 Email Required', 'Enter your email:', ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() !== ui.Button.OK) return;
    email = response.getResponseText();
    PropertiesService.getDocumentProperties().setProperty('NOTIFICATION_EMAIL', email);
  }
  
  ss.toast('Sending sprint summary...', '📧 Email', -1);
  
  const sprintInfo = getCurrentSprintInfo_(ss);
  
  const subject = '📊 CCAT ' + sprintInfo.name + ' Status Summary';
  
  let body = '<h2>🏛️ CCAT Sprint Status Summary</h2>' +
    '<p><strong>Sprint:</strong> ' + sprintInfo.name + '</p>' +
    '<p><strong>Dates:</strong> ' + sprintInfo.dates + '</p>' +
    '<p><strong>Intent:</strong> ' + sprintInfo.intent + '</p>' +
    '<h3>📋 Action Items by Satellite</h3><ul>';
  
  CONFIG.checkIns.forEach(checkIn => {
    if (checkIn.type === 'okr') return;
    const sheet = ss.getSheetByName(checkIn.activeSheet);
    if (!sheet) return;
    
    const actions = sheet.getRange('A31:D40').getValues();
    let total = 0, complete = 0;
    actions.forEach(row => {
      if (!row[0]) return;
      total++;
      if (String(row[3] || '').toLowerCase().includes('complete')) complete++;
    });
    
    if (total > 0) {
      body += '<li><strong>' + checkIn.name + '</strong>: ' + complete + '/' + total + ' complete</li>';
    }
  });
  
  body += '</ul><hr><p><a href="' + ss.getUrl() + '">Open CCAT Home Base</a></p>';
  
  MailApp.sendEmail({ to: email, subject: subject, htmlBody: body });
  ss.toast('Summary sent to ' + email, '✅ Sent', 5);
}


// ============================================================================
// STAKEHOLDER COMMUNICATION
// ============================================================================

/**
 * Sends meeting summary (from Granola notes) to all participants.
 * Includes a link to their relevant satellite tracker.
 */
function sendMeetingSummaryToParticipants() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getDocumentProperties();
  
  const lastSatellite = props.getProperty('LAST_MEETING_SATELLITE');
  const lastParticipants = props.getProperty('LAST_MEETING_PARTICIPANTS');
  const lastSummary = props.getProperty('LAST_MEETING_SUMMARY');
  
  if (!lastSatellite || !lastParticipants) {
    ui.alert(
      '📧 No Recent Meeting',
      'No recent meeting notes have been processed.\n\n' +
      'Process Granola notes first using:\n🎛️ CCAT System → 📝 Meeting Notes → 📥 Process Granola Notes',
      ui.ButtonSet.OK
    );
    return;
  }
  
  // Get satellite URL
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  let satelliteUrl = '';
  if (configSheet) {
    const data = configSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === lastSatellite) {
        satelliteUrl = data[i][2] || '';
        break;
      }
    }
  }
  
  const response = ui.alert(
    '📧 Send Meeting Summary',
    'Send summary for the ' + lastSatellite + ' meeting to:\n' +
    lastParticipants + '\n\n' +
    'Include link to satellite tracker.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  const checkIn = CONFIG.checkIns.find(c => c.name === lastSatellite);
  const sprintInfo = getCurrentSprintInfo_(ss);
  
  // Build meeting summary from satellite data
  const masterSheet = ss.getSheetByName(checkIn ? checkIn.activeSheet : '');
  let actionItemsHtml = '';
  let decisionsHtml = '';
  
  if (masterSheet) {
    // Get action items
    const actions = masterSheet.getRange('A31:D40').getValues();
    actions.forEach(row => {
      if (row[0] && String(row[0]).trim()) {
        actionItemsHtml += '<li><strong>' + row[0] + '</strong>' +
          (row[1] ? ' — ' + row[1] : '') +
          (row[2] ? ' (Due: ' + row[2] + ')' : '') +
          ' [' + (row[3] || 'Not Started') + ']</li>';
      }
    });
    
    // Get decisions
    const decisions = masterSheet.getRange('A22:D28').getValues();
    decisions.forEach(row => {
      if (row[0] && String(row[0]).trim()) {
        decisionsHtml += '<li><strong>' + row[0] + '</strong>' +
          (row[1] ? ' — Owner: ' + row[1] : '') +
          (row[2] ? ' (Impact: ' + row[2] + ')' : '') + '</li>';
      }
    });
  }
  
  const subject = '📋 Meeting Summary: ' + lastSatellite + ' Check-In (' + sprintInfo.name + ')';
  
  const htmlBody = '<div style="font-family: Arial, sans-serif; max-width: 700px;">' +
    '<h2 style="color: #1a73e8;">📋 ' + lastSatellite + ' Check-In Summary</h2>' +
    '<p><strong>Sprint:</strong> ' + sprintInfo.name + ' | <strong>Date:</strong> ' + new Date().toLocaleDateString() + '</p>' +
    (lastSummary ? '<div style="background: #e8f0fe; padding: 12px; border-radius: 8px; margin: 16px 0;"><strong>Summary:</strong> ' + lastSummary + '</div>' : '') +
    (decisionsHtml ? '<h3>✅ Decisions Made</h3><ul>' + decisionsHtml + '</ul>' : '') +
    (actionItemsHtml ? '<h3>📋 Action Items</h3><ul>' + actionItemsHtml + '</ul>' : '') +
    (satelliteUrl ? '<p style="margin-top: 20px;"><strong>📡 Your Tracker:</strong> <a href="' + satelliteUrl + '">' + lastSatellite + ' Satellite Workbook</a></p>' : '') +
    '<hr><p style="color: #666; font-size: 12px;">Sent by CCAT Operating System | <a href="' + ss.getUrl() + '">Home Base</a></p>' +
    '</div>';
  
  // Send to all participants
  const participants = lastParticipants.split(',').map(e => e.trim()).filter(e => e);
  
  participants.forEach(email => {
    try {
      MailApp.sendEmail({ to: email, subject: subject, htmlBody: htmlBody });
    } catch (error) {
      console.error('Failed to send to ' + email + ': ' + error.message);
    }
  });
  
  ss.toast('Meeting summary sent to ' + participants.length + ' participant(s)', '✅ Sent', 5);
  
  ui.alert(
    '✅ Summary Sent',
    'Meeting summary for ' + lastSatellite + ' sent to:\n' + participants.join('\n') +
    '\n\nIncludes link to their satellite tracker.',
    ui.ButtonSet.OK
  );
}


// ============================================================================
// SATELLITE TRACKER ARCHIVE
// ============================================================================

/**
 * Archives satellite tracker snapshots before sprint rollover.
 * Stores a snapshot of each satellite's action items, decisions, and agenda.
 */
function archiveSatelliteTrackers_(ss, sprintName) {
  let archiveSheet = ss.getSheetByName('📚 Satellite Tracker Archive');
  if (!archiveSheet) {
    archiveSheet = ss.insertSheet('📚 Satellite Tracker Archive');
    const headers = ['Sprint', 'Satellite', 'Section', 'Content', 'Owner', 'Status', 'Date Archived'];
    archiveSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    archiveSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');
    archiveSheet.setFrozenRows(1);
    archiveSheet.setColumnWidth(1, 90);
    archiveSheet.setColumnWidth(2, 140);
    archiveSheet.setColumnWidth(3, 100);
    archiveSheet.setColumnWidth(4, 350);
    archiveSheet.setColumnWidth(5, 120);
    archiveSheet.setColumnWidth(6, 100);
    archiveSheet.setColumnWidth(7, 120);
  }
  
  const today = new Date();
  
  CONFIG.checkIns.forEach(checkIn => {
    if (checkIn.type !== 'checkin') return;
    
    const sheet = ss.getSheetByName(checkIn.activeSheet);
    if (!sheet) return;
    
    // Archive agenda items
    const agendaData = sheet.getRange('A11:F19').getValues();
    agendaData.forEach(row => {
      if (row[0] && String(row[0]).trim()) {
        archiveSheet.appendRow([sprintName, checkIn.name, 'Agenda', row[0], row[1], '', today]);
      }
    });
    
    // Archive decisions
    const decisions = sheet.getRange('A22:F28').getValues();
    decisions.forEach(row => {
      if (row[0] && String(row[0]).trim()) {
        archiveSheet.appendRow([sprintName, checkIn.name, 'Decision', row[0], row[1], row[2], today]);
      }
    });
    
    // Archive action items
    const actions = sheet.getRange('A31:F40').getValues();
    actions.forEach(row => {
      if (row[0] && String(row[0]).trim()) {
        archiveSheet.appendRow([sprintName, checkIn.name, 'Action Item', row[0], row[1], row[3], today]);
      }
    });
  });
}


/**
 * View satellite tracker archive with filter by satellite or sprint
 */
function viewSatelliteTrackerArchive() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  let archiveSheet = ss.getSheetByName('📚 Satellite Tracker Archive');
  
  if (!archiveSheet) {
    ui.alert('No archive found. Archives are created automatically during sprint rollover.');
    return;
  }
  
  // Build HTML viewer
  const data = archiveSheet.getDataRange().getValues();
  
  // Get unique sprints and satellites
  const sprints = [...new Set(data.slice(1).map(r => r[0]).filter(Boolean))];
  const satellites = [...new Set(data.slice(1).map(r => r[1]).filter(Boolean))];
  
  let html = '<style>' +
    'body { font-family: Arial, sans-serif; padding: 15px; }' +
    'select { padding: 6px; margin: 5px; }' +
    'table { border-collapse: collapse; width: 100%; margin-top: 10px; }' +
    'th, td { padding: 6px 10px; border: 1px solid #ddd; text-align: left; font-size: 12px; }' +
    'th { background: #1a73e8; color: white; }' +
    '.filter-row { margin-bottom: 10px; }' +
    '</style>' +
    '<h3>📚 Satellite Tracker Archive</h3>' +
    '<div class="filter-row">' +
    '<label>Sprint: </label><select id="sprintFilter"><option value="">All</option>';
  
  sprints.forEach(s => { html += '<option value="' + s + '">' + s + '</option>'; });
  html += '</select>';
  
  html += ' <label>Satellite: </label><select id="satFilter"><option value="">All</option>';
  satellites.forEach(s => { html += '<option value="' + s + '">' + s + '</option>'; });
  html += '</select>';
  
  html += ' <button onclick="filterTable()">Filter</button></div>';
  
  html += '<table id="archiveTable"><tr><th>Sprint</th><th>Satellite</th><th>Section</th><th>Content</th><th>Owner</th><th>Status</th></tr>';
  
  for (let i = 1; i < data.length; i++) {
    html += '<tr data-sprint="' + data[i][0] + '" data-sat="' + data[i][1] + '">';
    for (let c = 0; c < 6; c++) {
      html += '<td>' + (data[i][c] || '') + '</td>';
    }
    html += '</tr>';
  }
  
  html += '</table>';
  html += '<script>' +
    'function filterTable() {' +
    '  var sprint = document.getElementById("sprintFilter").value;' +
    '  var sat = document.getElementById("satFilter").value;' +
    '  var rows = document.querySelectorAll("#archiveTable tr[data-sprint]");' +
    '  rows.forEach(function(row) {' +
    '    var show = true;' +
    '    if (sprint && row.dataset.sprint !== sprint) show = false;' +
    '    if (sat && row.dataset.sat !== sat) show = false;' +
    '    row.style.display = show ? "" : "none";' +
    '  });' +
    '}' +
    '</script>';
  
  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(800).setHeight(500);
  ui.showModalDialog(htmlOutput, '📚 Satellite Tracker Archive');
}


// ============================================================================
// ARCHIVE MANAGEMENT (PRESERVED/ENHANCED)
// ============================================================================

function viewArchivedSprints() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  const sheets = ss.getSheets();
  const archivedSprints = sheets.filter(s => {
    const name = s.getName();
    return /^Sprint \d+$/.test(name) || /^📁/.test(name);
  });
  
  archivedSprints.sort((a, b) => {
    const numA = parseInt(a.getName().replace(/[^0-9]/g, '')) || 0;
    const numB = parseInt(b.getName().replace(/[^0-9]/g, '')) || 0;
    return numB - numA;
  });
  
  if (archivedSprints.length === 0) {
    ui.alert('No archived sprints found.');
    return;
  }
  
  let html = '<style>' +
    'body { font-family: Arial, sans-serif; padding: 10px; }' +
    '.sprint { padding: 8px; margin: 5px 0; background: #f5f5f5; border-radius: 4px; cursor: pointer; }' +
    '.sprint:hover { background: #e0e0e0; }' +
    '.hidden { color: #999; font-style: italic; }' +
    '.current { background: #e8f5e9; border-left: 4px solid #4caf50; }' +
    '</style>' +
    '<h3>📅 Sprint Archive</h3><p>Click a sprint to navigate to it:</p>';
  
  archivedSprints.forEach((sheet, index) => {
    const name = sheet.getName();
    const isHidden = sheet.isSheetHidden();
    const isCurrent = index === 0 && !isHidden;
    
    html += '<div class="sprint ' + (isHidden ? 'hidden' : '') + ' ' + (isCurrent ? 'current' : '') + '" ' +
      'onclick="google.script.run.navigateToSheet_(\'' + name.replace(/'/g, "\\'") + '\'); google.script.host.close();">' +
      name + (isHidden ? ' (hidden)' : '') + (isCurrent ? ' ← Current' : '') + '</div>';
  });
  
  html += '<br><button onclick="google.script.host.close()">Close</button>';
  
  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(350).setHeight(400);
  ui.showModalDialog(htmlOutput, '🗄️ Archived Sprints');
}


function generateArchiveReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('Generating archive report...', '📊 Report', -1);
  
  const sheets = ss.getSheets();
  const sprintSheets = sheets.filter(s => /^Sprint \d+$/.test(s.getName()) || /^📁/.test(s.getName()));
  
  let reportSheet = ss.getSheetByName('📊 Sprint Archive Report');
  if (reportSheet) {
    reportSheet.clear();
  } else {
    reportSheet = ss.insertSheet('📊 Sprint Archive Report');
  }
  
  reportSheet.getRange('A1').setValue('📊 CCAT Sprint Archive Report');
  reportSheet.getRange('A1').setFontSize(16).setFontWeight('bold');
  reportSheet.getRange('A2').setValue('Generated: ' + new Date().toLocaleString());
  reportSheet.getRange('A2').setFontStyle('italic').setFontColor('#666');
  
  let currentRow = 4;
  
  reportSheet.getRange(currentRow, 1).setValue('SUMMARY');
  reportSheet.getRange(currentRow, 1, 1, 3).setBackground('#1a73e8').setFontColor('white').setFontWeight('bold');
  currentRow++;
  reportSheet.getRange(currentRow, 1, 2, 2).setValues([
    ['Total Sprints:', sprintSheets.length],
    ['Active Satellites:', CONFIG.checkIns.filter(c => c.type === 'checkin').length]
  ]);
  currentRow += 4;
  
  reportSheet.getRange(currentRow, 1).setValue('SPRINT TIMELINE');
  reportSheet.getRange(currentRow, 1, 1, 4).setBackground('#1a73e8').setFontColor('white').setFontWeight('bold');
  currentRow++;
  reportSheet.getRange(currentRow, 1, 1, 4).setValues([['Sprint', 'Dates', 'Intent', 'Status']]);
  reportSheet.getRange(currentRow, 1, 1, 4).setFontWeight('bold').setBackground('#e8eaed');
  currentRow++;
  
  sprintSheets.forEach(sheet => {
    const name = sheet.getName();
    const isHidden = sheet.isSheetHidden();
    let dates = '', intent = '';
    try {
      dates = sheet.getRange('D2').getValue() || sheet.getRange('C3').getValue() || '';
      intent = sheet.getRange('B3').getValue() || sheet.getRange('A7').getValue() || '';
    } catch (e) {}
    
    reportSheet.getRange(currentRow, 1, 1, 4).setValues([[
      name, dates, String(intent).substring(0, 100), isHidden ? 'Archived' : 'Active'
    ]]);
    currentRow++;
  });
  
  reportSheet.setColumnWidth(1, 180);
  reportSheet.setColumnWidth(2, 150);
  reportSheet.setColumnWidth(3, 400);
  reportSheet.setColumnWidth(4, 80);
  
  ss.setActiveSheet(reportSheet);
  ss.toast('Archive report generated!', '✅ Complete', 5);
}


// ============================================================================
// FIX FORMULA REFERENCES
// ============================================================================

function fixFormulaReferences() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('Fixing formula references...', '🔧 Fix', -1);
  
  const sprintInfo = getCurrentSprintInfo_(ss);
  
  CONFIG.checkIns.forEach(checkIn => {
    if (checkIn.type === 'okr') return;
    
    const template = ss.getSheetByName(checkIn.templateSheet);
    if (template) {
      template.getRange('B2').setValue(sprintInfo.name);
      template.getRange('D2').setValue(sprintInfo.dates);
      template.getRange('B3').setValue(sprintInfo.intent);
    }
    
    const active = ss.getSheetByName(checkIn.activeSheet);
    if (active) {
      active.getRange('B2').setValue(sprintInfo.name);
      active.getRange('D2').setValue(sprintInfo.dates);
      active.getRange('B3').setValue(sprintInfo.intent);
    }
  });
  
  ss.toast('Formula references fixed!', '✅ Complete', 5);
}


// ============================================================================
// EMAIL / NOTIFICATION UTILITIES
// ============================================================================

function promptForEmail() {
  const ui = SpreadsheetApp.getUi();
  const currentEmail = PropertiesService.getDocumentProperties().getProperty('NOTIFICATION_EMAIL') || '(not set)';
  
  const response = ui.prompt(
    '📝 Update Notification Email',
    'Current email: ' + currentEmail + '\n\nEnter new email address:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() === ui.Button.OK) {
    const newEmail = response.getResponseText();
    PropertiesService.getDocumentProperties().setProperty('NOTIFICATION_EMAIL', newEmail);
    SpreadsheetApp.getUi().alert('✅ Email Updated', 'Notifications will be sent to: ' + newEmail, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}


// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getSatelliteIds_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  if (!configSheet) return [];
  
  const data = configSheet.getDataRange().getValues();
  const ids = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][1]) {
      ids.push({ name: data[i][0], id: data[i][1] });
    }
  }
  return ids;
}


// ============================================================================
// INSTALLABLE TRIGGERS
// ============================================================================

function createHourlySyncTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'syncAllSatellitesToMaster') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  ScriptApp.newTrigger('syncAllSatellitesToMaster')
    .timeBased()
    .everyHours(1)
    .create();
  
  SpreadsheetApp.getUi().alert('✅ Hourly sync trigger created');
}

function removeHourlySyncTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'syncAllSatellitesToMaster') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  SpreadsheetApp.getUi().alert('✅ Hourly sync trigger removed');
}


// ============================================================================
// SYSTEM MAP VISUALIZATION (UPDATED)
// ============================================================================

function showSystemMap() {
  const html = HtmlService.createHtmlOutput(getSystemMapHtml_())
    .setWidth(900)
    .setHeight(700);
  SpreadsheetApp.getUi().showModalDialog(html, '🗺️ CCAT Operating System Map v2.0');
}

function getSystemMapHtml_() {
  return '<!DOCTYPE html><html><head><style>' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: "Segoe UI", Arial, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 20px; min-height: 100%; }' +
    'h1 { text-align: center; margin-bottom: 10px; color: #C9A227; font-size: 24px; }' +
    '.subtitle { text-align: center; color: #aaa; margin-bottom: 25px; font-size: 12px; }' +
    '.container { display: flex; flex-direction: column; gap: 20px; }' +
    '.row { display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; }' +
    '.box { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 15px; min-width: 130px; text-align: center; transition: all 0.3s ease; }' +
    '.box:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,0.3); border-color: #C9A227; }' +
    '.box.master { background: linear-gradient(135deg, #C9A227 0%, #8B6914 100%); border: none; min-width: 200px; }' +
    '.box.master h3 { color: #000; } .box.master p { color: #333; }' +
    '.box.satellite { background: rgba(30, 136, 229, 0.2); border-color: #1e88e5; }' +
    '.box.system { background: rgba(156, 39, 176, 0.2); border-color: #9c27b0; }' +
    '.box.timeline { background: rgba(76, 175, 80, 0.2); border-color: #4caf50; }' +
    '.box.tbd { opacity: 0.6; border-style: dashed; }' +
    '.box h3 { font-size: 13px; margin-bottom: 5px; color: #fff; }' +
    '.box p { font-size: 10px; color: #aaa; line-height: 1.4; }' +
    '.box .emoji { font-size: 24px; margin-bottom: 8px; }' +
    '.arrow-down { text-align: center; color: #C9A227; font-size: 20px; margin: 5px 0; }' +
    '.section-label { background: rgba(201, 162, 39, 0.2); color: #C9A227; padding: 5px 15px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 10px auto; display: inline-block; }' +
    '.flow-section { text-align: center; margin: 10px 0; }' +
    '.sync-indicator { display: inline-block; font-size: 9px; padding: 2px 6px; border-radius: 10px; margin-top: 5px; }' +
    '.sync-one-way { background: rgba(255, 152, 0, 0.3); color: #ffb74d; }' +
    '.sync-push { background: rgba(76, 175, 80, 0.3); color: #81c784; }' +
    '.legend { display: flex; justify-content: center; gap: 20px; margin-top: 15px; flex-wrap: wrap; }' +
    '.legend-item { display: flex; align-items: center; gap: 8px; font-size: 10px; color: #aaa; }' +
    '.legend-color { width: 14px; height: 14px; border-radius: 4px; }' +
    '.legend-color.gold { background: #C9A227; } .legend-color.blue { background: #1e88e5; } .legend-color.green { background: #4caf50; } .legend-color.purple { background: #9c27b0; }' +
    '</style></head><body>' +
    '<h1>🗺️ CCAT Operating System v2.0</h1>' +
    '<p class="subtitle">Hub-and-Spoke Architecture | One-Way Sync | Granola-Powered</p>' +
    '<div class="container">' +
    
    // ED Control Layer
    '<div class="flow-section"><span class="section-label">ED Control Layer</span></div>' +
    '<div class="row">' +
    '<div class="box master"><div class="emoji">🏛️</div><h3>HOME BASE</h3><p>Master Control Station<br>Single Source of Truth</p></div>' +
    '</div>' +
    '<div class="arrow-down">↓ ↑</div>' +
    '<div class="row">' +
    '<div class="box system"><div class="emoji">🎯</div><h3>OKRs</h3><p>Strategy & Outcomes</p></div>' +
    '<div class="box system"><div class="emoji">⏱️</div><h3>Sprints</h3><p>Bi-Weekly Execution</p></div>' +
    '<div class="box system"><div class="emoji">📋</div><h3>Master RACI</h3><p>All Action Items</p></div>' +
    '<div class="box system"><div class="emoji">📅</div><h3>FY2027 Timeline</h3><p>Milestone View</p></div>' +
    '<div class="box system"><div class="emoji">📊</div><h3>Sprint Deck</h3><p>Auto-Generated</p></div>' +
    '</div>' +
    
    // Sync Layer
    '<div class="flow-section"><span class="section-label">Satellite → Master (One-Way Sync)</span></div>' +
    
    // Active Satellites
    '<div class="flow-section"><span class="section-label">Active Stakeholder Satellites</span></div>' +
    '<div class="row">' +
    '<div class="box satellite"><div class="emoji">🎛️</div><h3>Production</h3><p>Richard Lonsdorf</p><span class="sync-indicator sync-one-way">→ Master</span></div>' +
    '<div class="box satellite"><div class="emoji">🎨</div><h3>Curator</h3><p>Lumi Tan</p><span class="sync-indicator sync-one-way">→ Master</span></div>' +
    '<div class="box satellite"><div class="emoji">👥</div><h3>Internal Stakeholders</h3><p>All Directors</p><span class="sync-indicator sync-one-way">→ Master</span></div>' +
    '</div>' +
    
    // New/TBD Satellites
    '<div class="row">' +
    '<div class="box satellite tbd"><div class="emoji">🎬</div><h3>Director ML</h3><p>TBD</p><span class="sync-indicator sync-one-way">→ Master</span></div>' +
    '<div class="box satellite tbd"><div class="emoji">🖥️</div><h3>Director MI</h3><p>TBD</p><span class="sync-indicator sync-one-way">→ Master</span></div>' +
    '<div class="box satellite tbd"><div class="emoji">🔧</div><h3>Technical Director</h3><p>TBD</p><span class="sync-indicator sync-one-way">→ Master</span></div>' +
    '</div>' +
    
    '<div class="row">' +
    '<div class="box satellite"><div class="emoji">👥</div><h3>Advisory Committee</h3><p>Committee</p><span class="sync-indicator sync-one-way">→ Master</span></div>' +
    '<div class="box timeline"><div class="emoji">🎯</div><h3>OKR Satellite</h3><p>Read-Only View</p><span class="sync-indicator sync-push">← Push Only</span></div>' +
    '<div class="box timeline"><div class="emoji">📅</div><h3>Timeline Satellite</h3><p>FY2027 View</p><span class="sync-indicator sync-push">← Push Only</span></div>' +
    '</div>' +
    
    // Granola Integration
    '<div class="flow-section"><span class="section-label">Meeting Intelligence</span></div>' +
    '<div class="row">' +
    '<div class="box system"><div class="emoji">📝</div><h3>Granola Notes</h3><p>AI Meeting Notes<br>→ Auto-Populate Trackers</p></div>' +
    '<div class="box system"><div class="emoji">📧</div><h3>Comms</h3><p>Meeting Summaries<br>→ Participants + Links</p></div>' +
    '</div>' +
    
    // Legend
    '<div class="legend">' +
    '<div class="legend-item"><div class="legend-color gold"></div><span>Master (ED Only)</span></div>' +
    '<div class="legend-item"><div class="legend-color purple"></div><span>System Sheets</span></div>' +
    '<div class="legend-item"><div class="legend-color blue"></div><span>Check-In Satellites</span></div>' +
    '<div class="legend-item"><div class="legend-color green"></div><span>View-Only Satellites</span></div>' +
    '</div>' +
    '</div></body></html>';
}
