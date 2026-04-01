/**
 * ============================================================================
 * CCAT OPERATING SYSTEM v2.0 - GOOGLE APPS SCRIPT
 * ============================================================================
 * 
 * Redesigned CCAT OS with:
 * 1. Sprint Rollover, Archive & Satellite Distribution (preserved)
 * 2. Simplified OKR Tracking (no RACI/approval/timeline from OKRs)
 * 3. Revised Satellite Workbooks (Production, Curator, Internal Stakeholders,
 *    Director ML, Director MI, Technical Director, OKRs)
 * 4. One-Way Sync: Satellites → Master RACI Tab
 * 5. Granola Meeting Notes → Auto-Populate Satellite Trackers
 * 6. Action Item Distribution from Internal Stakeholders to other satellites
 * 7. Full Year Timeline with milestone tracking
 * 8. Next 6 Sprints — near-term sprint-based planning view
 * 9. Satellite Tracker Archive Access (previous sprints)
 * 10. Sprint Deck Update Push
 * 11. Stakeholder Communication: Meeting summaries + tracker links
 * 12. README tab with system documentation and how-tos
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
    fullYearTimeline: '📅 Full Year Timeline',
    next4Weeks: '📅 Next 4 Weeks',
    next6Sprints: '📅 Next 6 Sprints',
    readme: '📖 README',
    sprintDeckData: '📊 Sprint Deck Data',
    meetingLog: '📝 Meeting Log',
    timelineChangeLog: '📅 Timeline Change Log',
  },
  
  // Satellite check-in types
  // To add a new satellite: add an entry here with type 'checkin', then run Initial Setup.
  // The system will automatically create its workbook, sync sheet, nav menu entry, etc.
  // Fields: name (unique key), activeSheet (tab name in master), title (workbook title),
  //         type ('checkin' or 'okr'), owner (display name), preserveLink (keep existing satellite ID)
  checkIns: [
    { name: 'Production', activeSheet: 'Production Sync ', title: 'CCAT Production Check-In', type: 'checkin', owner: 'Richard Lonsdorf', preserveLink: true, legacyName: 'Production' },
    { name: 'Curator', activeSheet: 'Curator Check-In', title: 'CCAT Curator Check-In', type: 'checkin', owner: 'Lumi Tan', preserveLink: true, legacyName: 'Student Life' },
    { name: 'Internal Stakeholders', activeSheet: 'Internal Stakeholders Check-In', title: 'Internal Stakeholders Check-In', type: 'checkin', owner: 'All Directors', preserveLink: true, legacyName: 'IT' },
    { name: 'Advancement', activeSheet: 'Advancement Check-In', title: 'CCAT Advancement Check-In', type: 'checkin', owner: 'Katie', preserveLink: false },
    { name: 'ED', activeSheet: 'ED Check-In', title: 'CCAT ED Check-In', type: 'checkin', owner: 'maryclarebrzytwa', preserveLink: false },
    { name: 'Director ML', activeSheet: 'Director ML Check-In', title: 'Director ML Check-In', type: 'checkin', owner: 'TBD (Director, ML)', preserveLink: false },
    { name: 'Director MI', activeSheet: 'Director MI Check-In', title: 'Director MI Check-In', type: 'checkin', owner: 'TBD (Director, MI)', preserveLink: false },
    { name: 'Technical Director', activeSheet: 'Technical Director Check-In', title: 'Technical Director Check-In', type: 'checkin', owner: 'TBD (Technical Director)', preserveLink: false },
    { name: 'OKRs', activeSheet: '🎯 Objectives and Key Results', title: 'CCAT 2026 Objectives and Key Results', type: 'okr', owner: 'ED', preserveLink: false },
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
    actionStatus: ['Not Started', 'In Progress', 'Complete', 'Blocked', 'Pending', 'Carried Over'],
    sprintDueDate: ['This Sprint', 'Next Sprint', '2 Sprints Out', '3 Sprints Out', '4 Sprints Out', '5 Sprints Out'],
    raciFunctions: ["President's Office", 'Advancement', 'Production', 'Curator', 'ED', 'CHANEL', 'Provost', 'BB6', 'Research'],
    raciPeople: ['Katie', 'Andreas', 'Kari', 'Lumi', 'Richard', 'MC', 'Kiara', 'Ravi', 'Irene', 'Yana']
  },

  // Maps person names (lowercase) to their RACI function/department.
  // Used to auto-assign the Role column when a name appears in RACI data.
  nameToFunction: {
    'katie': 'Advancement',
    'andreas': 'Advancement',
    'kari': 'Advancement',
    'lumi': 'Curator',
    'richard': 'Production',
    'mc': 'ED',
    'maryclarebrzytwa': 'ED',
    'maryclare': 'ED',
    'kiara': "President's Office",
    'ravi': "President's Office",
    'irene': 'CHANEL',
    'yana': 'CHANEL'
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
      .addItem('📝 Process Notes → RACI Draft', 'processNotesToRACIDraft')
      .addItem('📤 Push RACI → All Satellites', 'pushRACIToSatellites')
      .addItem('🔄 Sync Satellite Statuses → RACI', 'syncSatelliteStatusesToRACI')
      .addSeparator()
      .addItem('📋 Refresh Master RACI (rebuild)', 'refreshMasterRACI')
      .addItem('📤 Distribute Action Items from Internal Stakeholders', 'distributeFromInternalStakeholders')
      .addSeparator()
      .addItem('🗓️ View Milestone Staging', 'navToMilestoneStaging')
      .addItem('🚀 Push Approved Milestones to Timelines', 'pushApprovedMilestones'))
    .addSeparator()
    .addSubMenu(ui.createMenu('📅 Timelines')
      .addItem('📅 View Full Year Timeline', 'navToFullYearTimeline')
      .addItem('📅 View Next 6 Sprints', 'navToNext6Sprints')
      .addItem('📅 View Next 4 Weeks', 'navToNext4Weeks')
      .addSeparator()
      .addItem('🔄 Refresh Full Year Timeline', 'refreshFullYearTimeline')
      .addItem('🔄 Refresh Next 6 Sprints', 'refreshNext6Sprints')
      .addItem('🔄 Refresh Next 4 Weeks', 'refreshNext4Weeks')
      .addSeparator()
      .addItem('📋 View Timeline Change Log', 'navToTimelineChangeLog'))
    .addSeparator()
    .addSubMenu(ui.createMenu('📝 Meeting Notes (Granola)')
      .addItem('📥 Process Granola Notes for Satellite', 'processGranolaNotes')
      .addItem('📋 View Meeting Log', 'navToMeetingLog')
      .addItem('🔄 Sync Meeting Log from Calendar', 'syncMeetingLogFromCalendar'))
    .addSeparator()
    .addSubMenu(ui.createMenu('📊 Sprint Deck')
      .addItem('🎬 Generate Sprint Deck (Google Slides)', 'launchSprintDeckWizard')
      .addItem('📊 Generate Sprint Deck Data (Sheet)', 'generateSprintDeckData')
      .addItem('📧 Send Sprint Summary Email', 'sendSprintSummaryEmail'))
    .addSeparator()
    .addSubMenu(ui.createMenu('📧 Communication')
      .addItem('📧 Send Meeting Summary to Participants', 'sendMeetingSummaryToParticipants')
      .addItem('📝 Update Config Email', 'promptForEmail'))
    .addSeparator()
    .addSubMenu(ui.createMenu('🗄️ Archives')
      .addItem('📅 View Archived Sprints', 'viewArchivedSprints')
      .addItem('📋 View Satellite Tracker Archive', 'viewSatelliteTrackerArchive')
      .addItem('📊 Generate Archive Report', 'generateArchiveReport')
      .addSeparator()
      .addItem('📚 Push Archives to Satellites', 'pushArchiveToExistingSatellite')
      .addItem('🔄 Sync Archives to All Satellites', 'syncArchivesToAllSatellites'))
    .addSeparator()
    .addItem('🗺️ View System Map', 'showSystemMap')
    .addSeparator()
    .addSubMenu(ui.createMenu('⚙️ Setup')
      .addItem('🚀 Initial Setup (Create Satellites)', 'initialSetup')
      .addItem('🔄 Reformat Existing Satellites to v2', 'reformatExistingSatellites')
      .addItem('🔧 Fix Formula References', 'fixFormulaReferences')
      .addItem('📅 Setup Timelines (Full Year + 4 Weeks + 6 Sprints)', 'setupTimelines')
      .addItem('📝 Update Config Email', 'promptForEmail')
      .addSeparator()
      .addItem('⏱️ Enable Auto Due-Date Conversion (satellites)', 'createSprintDateConversionTrigger')
      .addItem('❌ Disable Auto Due-Date Conversion', 'removeSprintDateConversionTrigger'))
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
  sheetsMenu.addItem('📖 README', 'navToReadme');
  sheetsMenu.addItem('🎯 OKRs', 'navToOKRs');
  sheetsMenu.addItem('📋 Master RACI Tracker', 'navToMasterRACI');
  sheetsMenu.addItem('📅 Full Year Timeline', 'navToFullYearTimeline');
  sheetsMenu.addItem('📅 Next 4 Weeks', 'navToNext4Weeks');
  sheetsMenu.addItem('📅 Next 6 Sprints', 'navToNext6Sprints');
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
  checkInSubMenu.addItem('Advancement (Katie)', 'navToAdvancement');
  checkInSubMenu.addItem('ED (maryclarebrzytwa)', 'navToED');
  checkInSubMenu.addItem('Director ML', 'navToDirectorML');
  checkInSubMenu.addItem('Director MI', 'navToDirectorMI');
  checkInSubMenu.addItem('Technical Director', 'navToTechnicalDirector');
  
  sheetsMenu.addSubMenu(checkInSubMenu);
  sheetsMenu.addSeparator();
  
  // System sheets
  sheetsMenu.addItem('📊 Sprint Deck Data', 'navToSprintDeckData');
  sheetsMenu.addItem('📝 Meeting Log', 'navToMeetingLog');
  sheetsMenu.addItem('⚙️ Satellite Config', 'navToSatelliteConfig');
  
  sheetsMenu.addToUi();
  
  // 📡 SATELLITES NAVIGATION MENU
  const satellitesMenu = ui.createMenu('📡 Satellites');
  
  satellitesMenu.addItem('🎛️ Production (Richard Lonsdorf)', 'openSatelliteProduction');
  satellitesMenu.addItem('🎨 Curator (Lumi Tan)', 'openSatelliteCurator');
  satellitesMenu.addItem('👥 Internal Stakeholders', 'openSatelliteInternalStakeholders');
  satellitesMenu.addItem('📈 Advancement (Katie)', 'openSatelliteAdvancement');
  satellitesMenu.addItem('👔 ED (maryclarebrzytwa)', 'openSatelliteED');
  satellitesMenu.addSeparator();
  satellitesMenu.addItem('🎬 Director ML (TBD)', 'openSatelliteDirectorML');
  satellitesMenu.addItem('🖥️ Director MI (TBD)', 'openSatelliteDirectorMI');
  satellitesMenu.addItem('🔧 Technical Director (TBD)', 'openSatelliteTechnicalDirector');
  satellitesMenu.addSeparator();
  satellitesMenu.addItem('🎯 OKRs (View Only)', 'openSatelliteOKRs');
  satellitesMenu.addSeparator();
  satellitesMenu.addItem('📋 View All Satellite Links', 'navToSatelliteConfig');
  
  satellitesMenu.addToUi();
}


// ============================================================================
// SHEET NAVIGATION FUNCTIONS
// ============================================================================

function navToHomeBase() { navigateToSheet_('🏛️ Home Base'); }
function navToReadme() { navigateToSheet_('📖 README'); }
function navToOKRs() { navigateToSheet_('🎯 Objectives and Key Results'); }
function navToMasterRACI() { navigateToSheet_('📋 Master RACI Tracker'); }
function navToFullYearTimeline() { navigateToSheet_('📅 Full Year Timeline'); }
function navToNext6Sprints() { navigateToSheet_('📅 Next 6 Sprints'); }
function navToTimelineChangeLog() { navigateToSheet_('📅 Timeline Change Log'); }
function navToSprintPlanning() { navigateToSheet_('🗓️ Sprint Planning'); }
function navToSprintTemplate() { navigateToSheet_('⏱️ Sprint Template'); }
function navToProductionSync() { navigateToSheet_('Production Sync '); }
function navToCurator() { navigateToSheet_('Curator Check-In'); }
function navToNext4Weeks() { navigateToSheet_('📅 Next 4 Weeks'); }
function navToInternalStakeholders() { navigateToSheet_('Internal Stakeholders Check-In'); }
function navToAdvancement() { navigateToSheet_('Advancement Check-In'); }
function navToED() { navigateToSheet_('ED Check-In'); }
function navToDirectorML() { navigateToSheet_('Director ML Check-In'); }
function navToDirectorMI() { navigateToSheet_('Director MI Check-In'); }
function navToTechnicalDirector() { navigateToSheet_('Technical Director Check-In'); }
function navToSprintDeckData() { navigateToSheet_('📊 Sprint Deck Data'); }
function navToMeetingLog() { navigateToSheet_('📝 Meeting Log'); }
function navToSatelliteConfig() { navigateToSheet_('⚙️ Satellite Config'); }

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
function openSatelliteAdvancement() { openSatelliteByName_('Advancement'); }
function openSatelliteED() { openSatelliteByName_('ED'); }
function openSatelliteDirectorML() { openSatelliteByName_('Director ML'); }
function openSatelliteDirectorMI() { openSatelliteByName_('Director MI'); }
function openSatelliteTechnicalDirector() { openSatelliteByName_('Technical Director'); }
function openSatelliteOKRs() { openSatelliteByName_('OKRs'); }

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
        // Try to open directly to the Check-In sheet
        let targetUrl = url;
        try {
          const satSS = SpreadsheetApp.openByUrl(url);
          const checkInSheet = satSS.getSheetByName('Check-In');
          if (checkInSheet) {
            targetUrl = url + '#gid=' + checkInSheet.getSheetId();
          }
        } catch (e) { /* fallback to base URL */ }
        const html = '<script>window.open("' + targetUrl + '", "_blank"); google.script.host.close();</script>' +
          '<p>Opening satellite workbook...</p><p>If it doesn\'t open automatically, <a href="' + targetUrl + '" target="_blank">click here</a>.</p>';
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

    ss.toast('Creating Timeline Change Log...', '⚙️ Setup', -1);
    createTimelineChangeLogSheet_(ss);

    ss.toast('Creating Full Year Timeline...', '⚙️ Setup', -1);
    createFullYearTimelineSheet_(ss);

    ss.toast('Creating Next 6 Sprints Timeline...', '⚙️ Setup', -1);
    createNext6SprintsSheet_(ss);

    ss.toast('Creating README...', '⚙️ Setup', -1);
    createReadmeSheet_(ss);

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
      '3. Run "Sync Meeting Log from Calendar" to pull calendar events',
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
    // first check if they exist under legacy names in the config, then prompt user for URL
    if (checkIn.preserveLink) {
      let existingSatId = null;

      // Try legacy name lookup first
      if (checkIn.legacyName) {
        existingSatId = findLegacySatelliteId_(ss, checkIn.legacyName);
      }

      // If not found via legacy, prompt the user for the existing satellite URL
      if (!existingSatId) {
        const ui = SpreadsheetApp.getUi();
        const promptResult = ui.prompt(
          '🔗 Existing Satellite — ' + checkIn.name,
          'This satellite is marked to preserve its existing link.\n\n' +
          'Please paste the URL of the existing "' + checkIn.name + '" satellite workbook.\n' +
          'The URL will stay the same and the workbook will be reformatted to the new layout.\n\n' +
          'Leave blank or click Cancel to create a new workbook instead.',
          ui.ButtonSet.OK_CANCEL
        );
        if (promptResult.getSelectedButton() === ui.Button.OK && promptResult.getResponseText().trim()) {
          const url = promptResult.getResponseText().trim();
          // Extract spreadsheet ID from URL (handles /d/ID/ pattern)
          const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (idMatch) {
            existingSatId = idMatch[1];
          } else {
            // Treat the whole input as an ID
            existingSatId = url;
          }
        }
      }

      if (existingSatId) {
        configSheet.getRange(row, 2).setValue(existingSatId);
        try {
          const legacySat = SpreadsheetApp.openById(existingSatId);
          configSheet.getRange(row, 3).setValue(legacySat.getUrl());
          configSheet.getRange(row, 4).setValue(new Date());
          configSheet.getRange(row, 5).setValue('Migrated');

          // Rename the satellite workbook
          const satName = 'CCAT Check-In — ' + checkIn.name;
          legacySat.rename(satName);

          // Reformat the satellite to v2 layout (preserves URL, repopulates data)
          reformatSatelliteToV2_(existingSatId, checkIn, ss.getId());
        } catch (e) {
          console.error('Could not migrate satellite: ' + e.message);
          configSheet.getRange(row, 5).setValue('Migration Error: ' + e.message);
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
    ['RACI', '', '', '', '', ''],
    ['Role', 'Responsible', 'Accountable', 'Consulted', 'Informed', ''],
    ["President's Office", '', '', '', '', ''],
    ['Advancement', '', '', '', '', ''],
    ['Production', '', '', '', '', ''],
    ['Curator', '', '', '', '', ''],
    ['ED', '', '', '', '', ''],
    ['CHANEL', '', '', '', '', ''],
    ['Provost', '', '', '', '', ''],
    ['BB6', '', '', '', '', ''],
    ['Research', '', '', '', '', ''],
    ['Parking Lot', '', '', '', '', ''],
    ['Item', 'Owner', 'Notes', 'Link', '', ''],
  ];

  sheet.getRange(1, 1, headerData.length, 6).setValues(headerData);

  // Format header section
  sheet.getRange('A1:F1').merge().setFontSize(16).setFontWeight('bold').setBackground('#1a73e8').setFontColor('white');
  sheet.getRange('A2:F3').setBackground('#e8f0fe');
  sheet.getRange('A4:F4').setBackground('#f0f7ff');
  sheet.getRange('A5:F5').setBackground('#fff3cd').setFontStyle('italic');

  // Format section headers (Agenda=9, Decisions=20, Actions=29, RACI=41, Parking=52)
  [9, 20, 29, 41, 52].forEach(row => {
    sheet.getRange(row, 1, 1, 6).setFontWeight('bold').setBackground('#f1f3f4');
  });

  // Format table headers
  [10, 21, 30, 42, 53].forEach(row => {
    sheet.getRange(row, 1, 1, 6).setFontWeight('bold').setBackground('#e8eaed');
  });

  // Set column widths
  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 120);

  // Add dropdowns (with RACI row positions)
  addCheckInDropdowns_(sheet, {
    agendaHeaderRow: 10,
    decisionsSectionRow: 20,
    decisionsHeaderRow: 21,
    actionsSectionRow: 29,
    actionsHeaderRow: 30,
    raciHeaderRow: 42,
    parkingSectionRow: 52,
  });
  
  // Protection for header rows
  const protection = sheet.getRange('A1:F5').protect();
  protection.setDescription('Sprint info synced from Master - Do not edit');
  protection.setWarningOnly(true);
  
  satellite.addEditor(Session.getActiveUser().getEmail());

  // Store master reference in satellite's document properties
  const satProps = PropertiesService.getDocumentProperties();
  satProps.setProperty('MASTER_ID', masterId);
  satProps.setProperty('CHECK_IN_TYPE', checkIn.name);

  // Push satellite script (archive viewer menu)
  pushSatelliteScript_(satellite, checkIn.name, masterId);
}


/**
 * Reformats an existing satellite workbook's Check-In sheet to the v2 layout.
 * Preserves the spreadsheet ID/URL so collaborators keep the same link.
 * Called during migration of legacy satellites and available as a standalone action.
 */
function reformatSatelliteToV2_(satelliteId, checkIn, masterId) {
  const satellite = SpreadsheetApp.openById(satelliteId);
  let sheet = satellite.getSheetByName('Check-In');

  if (!sheet) {
    // If no Check-In sheet exists, use the first sheet and rename it
    sheet = satellite.getSheets()[0];
    sheet.setName('Check-In');
  }

  const master = SpreadsheetApp.openById(masterId);
  const sprintInfo = getCurrentSprintInfo_(master);

  // ── Extract existing data before clearing ──
  const existingData = extractSatelliteData_(sheet);

  // Clear the entire sheet to start fresh with v2 layout
  sheet.clear();
  sheet.clearFormats();
  sheet.clearConditionalFormatRules();

  // Remove any existing merges
  const merges = sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).getMergedRanges();
  merges.forEach(m => m.breakApart());

  // Remove any existing data validations
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearDataValidations();

  // Build v2 layout with repopulated data
  const MIN_AGENDA = 9;
  const MIN_DECISIONS = 7;
  const MIN_ACTIONS = 10;
  const MIN_RACI = 5;
  const MIN_PARKING = 5;

  const agendaRows = padRows_(existingData.agenda, MIN_AGENDA, 5);
  const decisionRows = padRows_(existingData.decisions, MIN_DECISIONS, 5);
  const actionRows = padRows_(existingData.actions, MIN_ACTIONS, 6);
  const raciRows = padRows_(existingData.raci, MIN_RACI, 5);
  const parkingRows = padRows_(existingData.parking, MIN_PARKING, 4);

  const headerData = [
    [checkIn.title, '', '', '', '', ''],
    ['Sprint:', sprintInfo.name, 'Dates:', sprintInfo.dates, '', ''],
    ['Intent:', sprintInfo.intent, '', '', '', ''],
    ['Owner:', checkIn.owner || '', '', '', '', ''],
    ['⚠️ Rows 1-5 synced from Master. Edit below only.', '', '', '', '', ''],
    ['Meeting Outcomes (today)', existingData.meetingOutcome || '[What must be true when this meeting ends]', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['Agenda', '', '', '', '', ''],
    ['Topic', 'Owner', 'Prep / Notes', 'Link', 'Priority', ''],
  ];

  // Add agenda rows
  agendaRows.forEach(r => headerData.push(padTo6_(r)));

  // Decisions section
  headerData.push(['Decisions', '', '', '', '', '']);
  headerData.push(['Decision', 'Owner', 'Impact', 'Follow-up', 'Link', '']);
  decisionRows.forEach(r => headerData.push(padTo6_(r)));

  // Action Items section
  headerData.push(['Action Items', '', '', '', '', '']);
  headerData.push(['Task', 'Owner', 'Due Date', 'Status', 'Link', 'Satellite Source']);
  actionRows.forEach(r => headerData.push(padTo6_(r)));

  // RACI section (always included in v2 layout)
  headerData.push(['RACI', '', '', '', '', '']);
  headerData.push(['Role', 'Responsible', 'Accountable', 'Consulted', 'Informed', '']);
  raciRows.forEach(r => headerData.push(padTo6_(r)));

  // Parking Lot section
  headerData.push(['Parking Lot', '', '', '', '', '']);
  headerData.push(['Item', 'Owner', 'Notes', 'Link', '', '']);
  parkingRows.forEach(r => headerData.push(padTo6_(r)));

  sheet.getRange(1, 1, headerData.length, 6).setValues(headerData);

  // Calculate dynamic section row positions
  const agendaSectionRow = 9;
  const agendaHeaderRow = 10;
  const decisionsSectionRow = agendaHeaderRow + agendaRows.length + 1;
  const decisionsHeaderRow = decisionsSectionRow + 1;
  const actionsSectionRow = decisionsHeaderRow + decisionRows.length + 1;
  const actionsHeaderRow = actionsSectionRow + 1;
  const raciSectionRow = actionsHeaderRow + actionRows.length + 1;
  const raciHeaderRow = raciSectionRow + 1;
  const parkingSectionRow = raciHeaderRow + raciRows.length + 1;
  const parkingHeaderRow = parkingSectionRow + 1;

  // Format header section
  sheet.getRange('A1:F1').merge().setFontSize(16).setFontWeight('bold').setBackground('#1a73e8').setFontColor('white');
  sheet.getRange('A2:F3').setBackground('#e8f0fe');
  sheet.getRange('A4:F4').setBackground('#f0f7ff');
  sheet.getRange('A5:F5').setBackground('#fff3cd').setFontStyle('italic');

  // Format section headers
  const sectionHeaderRows = [agendaSectionRow, decisionsSectionRow, actionsSectionRow, raciSectionRow, parkingSectionRow];
  sectionHeaderRows.forEach(row => {
    sheet.getRange(row, 1, 1, 6).setFontWeight('bold').setBackground('#f1f3f4');
  });

  // Format table headers
  const tableHeaderRows = [agendaHeaderRow, decisionsHeaderRow, actionsHeaderRow, raciHeaderRow, parkingHeaderRow];
  tableHeaderRows.forEach(row => {
    sheet.getRange(row, 1, 1, 6).setFontWeight('bold').setBackground('#e8eaed');
  });

  // Set column widths
  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 120);

  // Add dropdowns with dynamic row positions
  addCheckInDropdowns_(sheet, {
    agendaHeaderRow: agendaHeaderRow,
    decisionsSectionRow: decisionsSectionRow,
    decisionsHeaderRow: decisionsHeaderRow,
    actionsSectionRow: actionsSectionRow,
    actionsHeaderRow: actionsHeaderRow,
    raciHeaderRow: raciHeaderRow,
    parkingSectionRow: parkingSectionRow,
  });

  // Protection for header rows
  const protection = sheet.getRange('A1:F5').protect();
  protection.setDescription('Sprint info synced from Master - Do not edit');
  protection.setWarningOnly(true);

  // Store master reference in satellite's document properties
  const satProps = PropertiesService.getDocumentProperties();
  satProps.setProperty('MASTER_ID', masterId);
  satProps.setProperty('CHECK_IN_TYPE', checkIn.name);

  // Ensure archive sheet exists
  pushSatelliteScript_(satellite, checkIn.name, masterId);
}


/**
 * Extracts existing data from a satellite sheet by finding section headers.
 * Works with both old-format and v2-format sheets.
 * Looks for sections: Agenda, Decisions, Action Items, RACI, Parking Lot
 */
function extractSatelliteData_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), 6);
  if (lastRow < 1) return { agenda: [], decisions: [], actions: [], raci: [], parking: [], meetingOutcome: '' };

  const allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  // Find section start rows by scanning column A for keywords
  let agendaStart = -1, decisionsStart = -1, actionsStart = -1, raciStart = -1, parkingStart = -1;
  let meetingOutcome = '';

  for (let i = 0; i < allData.length; i++) {
    const cellA = String(allData[i][0]).trim().toLowerCase();
    const cellB = String(allData[i][1]).trim();

    if (cellA === 'meeting outcomes (today)' || cellA === 'meeting outcomes' || cellA.indexOf('meeting outcome') === 0) {
      meetingOutcome = cellB;
    } else if (cellA === 'agenda') {
      agendaStart = i;
    } else if (cellA === 'decisions') {
      decisionsStart = i;
    } else if (cellA === 'action items' || cellA === 'action item') {
      actionsStart = i;
    } else if (cellA === 'raci') {
      raciStart = i;
    } else if (cellA === 'parking lot') {
      parkingStart = i;
    }
  }

  // All section start indices for boundary detection
  const allSections = [agendaStart, decisionsStart, actionsStart, raciStart, parkingStart];

  // Helper: extract data rows between a section header and the next section
  function extractSection(startIdx, colCount) {
    if (startIdx < 0) return [];
    // Skip the section title row and the column header row (2 rows)
    const dataStart = startIdx + 2;
    // Find the end: next section or end of data
    let endIdx = allData.length;
    allSections.forEach(s => {
      if (s > startIdx && s < endIdx) endIdx = s;
    });

    const rows = [];
    for (let i = dataStart; i < endIdx; i++) {
      const row = allData[i].slice(0, colCount);
      // Only include rows that have at least one non-empty cell
      if (row.some(cell => String(cell).trim() !== '')) {
        rows.push(row);
      }
    }
    return rows;
  }

  return {
    meetingOutcome: meetingOutcome,
    agenda: extractSection(agendaStart, 5),       // Topic, Owner, Prep/Notes, Link, Priority
    decisions: extractSection(decisionsStart, 5),  // Decision, Owner, Impact, Follow-up, Link
    actions: extractSection(actionsStart, 6),       // Task, Owner, Due Date, Status, Link, Source
    raci: extractSection(raciStart, 5),             // Role, Responsible, Accountable, Consulted, Informed
    parking: extractSection(parkingStart, 4),       // Item, Owner, Notes, Link
  };
}


/**
 * Pads an array of rows to at least minRows with empty rows of colCount columns.
 */
function padRows_(rows, minRows, colCount) {
  const result = rows.slice();
  while (result.length < minRows) {
    result.push(new Array(colCount).fill(''));
  }
  return result;
}


/**
 * Pads a row array to exactly 6 columns (our standard column count).
 */
function padTo6_(row) {
  const result = row.slice(0, 6);
  while (result.length < 6) {
    result.push('');
  }
  return result;
}


/**
 * Menu-callable function to reformat existing Curator and Production satellites
 * to the v2 layout, preserving their URLs/IDs.
 */
function reformatExistingSatellites() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);

  if (!configSheet) {
    ui.alert('⚙️ Setup Required', 'Please run Initial Setup first.', ui.ButtonSet.OK);
    return;
  }

  const response = ui.alert(
    '🔄 Reformat Existing Satellites',
    'This will reformat all existing satellite workbooks to the current v2 layout.\n\n' +
    'The spreadsheet URLs will NOT change — collaborators keep their same links.\n\n' +
    'Any existing content in the Check-In sheet will be replaced with the new format.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  const masterId = ss.getId();
  const data = configSheet.getDataRange().getValues();
  let reformatted = 0;

  for (let i = 1; i < data.length; i++) {
    const checkInName = data[i][0];
    const satelliteId = data[i][1];
    if (!satelliteId) continue;

    const checkIn = CONFIG.checkIns.find(c => c.name === checkInName || c.legacyName === checkInName || c.legacyName === checkInName);
    if (!checkIn || checkIn.type === 'okr') continue;

    try {
      ss.toast('Reformatting ' + checkInName + '...', '🔄 Reformat', -1);
      reformatSatelliteToV2_(satelliteId, checkIn, masterId);
      configSheet.getRange(i + 1, 4).setValue(new Date());
      configSheet.getRange(i + 1, 5).setValue('Reformatted');
      reformatted++;
    } catch (error) {
      console.error('Failed to reformat ' + checkInName + ': ' + error.message);
      configSheet.getRange(i + 1, 5).setValue('Reformat Error');
    }
  }

  ss.toast('Reformatted ' + reformatted + ' satellite workbooks', '✅ Done', 5);
  ui.alert('✅ Reformat Complete', reformatted + ' satellite workbooks have been reformatted to the v2 layout.\n\nAll URLs remain the same.', ui.ButtonSet.OK);
}


function addCheckInDropdowns_(sheet, sectionRows) {
  // Default row positions for fixed v2 layout (used by setupSatelliteWorkbook_)
  const agendaDataStart = (sectionRows && sectionRows.agendaHeaderRow ? sectionRows.agendaHeaderRow : 10) + 1;
  const agendaDataEnd = (sectionRows && sectionRows.decisionsSectionRow ? sectionRows.decisionsSectionRow : 20) - 1;
  const decisionsDataStart = (sectionRows && sectionRows.decisionsHeaderRow ? sectionRows.decisionsHeaderRow : 21) + 1;
  const decisionsDataEnd = (sectionRows && sectionRows.actionsSectionRow ? sectionRows.actionsSectionRow : 29) - 1;
  const actionsDataStart = (sectionRows && sectionRows.actionsHeaderRow ? sectionRows.actionsHeaderRow : 30) + 1;
  const actionsDataEnd = (sectionRows && sectionRows.parkingSectionRow ? sectionRows.parkingSectionRow : 41) - 1;

  // Status dropdown for Action Items (Column D)
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.dropdownOptions.actionStatus, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(actionsDataStart, 4, actionsDataEnd - actionsDataStart + 1, 1).setDataValidation(statusRule);

  // Priority dropdown for Agenda items (Column E)
  const priorityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.dropdownOptions.priority, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(agendaDataStart, 5, agendaDataEnd - agendaDataStart + 1, 1).setDataValidation(priorityRule);

  // Impact dropdown for Decisions (Column C)
  const impactRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['High', 'Medium', 'Low'], true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(decisionsDataStart, 3, decisionsDataEnd - decisionsDataStart + 1, 1).setDataValidation(impactRule);

  // Due Date for Action Items (Column C) — sprint-relative options + free text
  const dueDateRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.dropdownOptions.sprintDueDate, true)
    .setAllowInvalid(true)  // allows manual date entry too
    .build();
  sheet.getRange(actionsDataStart, 3, actionsDataEnd - actionsDataStart + 1, 1).setDataValidation(dueDateRule);

  // RACI dropdowns (Columns B-E: Responsible, Accountable, Consulted, Informed)
  // Uses person names; multi-select is handled by onEdit append logic
  if (sectionRows && sectionRows.raciHeaderRow && sectionRows.raciHeaderRow > 0) {
    const raciDataStart = sectionRows.raciHeaderRow + 1;
    const raciDataEnd = (sectionRows.parkingSectionRow || raciDataStart + 5) - 1;
    const raciRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(CONFIG.dropdownOptions.raciPeople, true)
      .setAllowInvalid(true)  // allows comma-separated multi-select values
      .build();
    for (let col = 2; col <= 5; col++) {
      sheet.getRange(raciDataStart, col, raciDataEnd - raciDataStart + 1, 1).setDataValidation(raciRule);
    }
  }
}


/**
 * Scans a check-in sheet (master sync or satellite) for section header rows and
 * returns the data-row boundaries for each section.  Works with both fixed and
 * dynamically-expanded layouts.
 *
 * Returns: { agenda: {start, end}, decisions: {start, end},
 *            actions: {start, end}, raci: {start, end}, parking: {start, end} }
 * start/end are 1-indexed row numbers for the DATA rows (after the column-header row).
 * If a section is not found, its entry is null.
 */
function getSectionBoundaries_(sheet) {
  const lastRow = Math.max(sheet.getLastRow(), 1);
  const col = sheet.getRange(1, 1, lastRow, 1).getValues();

  const sections = [];
  for (let i = 0; i < col.length; i++) {
    const v = String(col[i][0]).trim().toLowerCase();
    if (v === 'agenda') sections.push({ key: 'agenda', row: i + 1 });
    else if (v === 'decisions') sections.push({ key: 'decisions', row: i + 1 });
    else if (v === 'action items' || v === 'action item') sections.push({ key: 'actions', row: i + 1 });
    else if (v === 'raci') sections.push({ key: 'raci', row: i + 1 });
    else if (v === 'parking lot') sections.push({ key: 'parking', row: i + 1 });
  }

  const result = {};
  for (let s = 0; s < sections.length; s++) {
    const headerRow = sections[s].row + 1;          // column-header row (e.g. "Topic | Owner | ...")
    const dataStart = headerRow + 1;                 // first data row
    const nextSectionRow = (s + 1 < sections.length) ? sections[s + 1].row : lastRow + 1;
    const dataEnd = nextSectionRow - 1;              // last data row before next section header
    result[sections[s].key] = { start: dataStart, end: dataEnd, sectionRow: sections[s].row, headerRow: headerRow };
  }

  // Fill in any missing sections as null
  ['agenda', 'decisions', 'actions', 'raci', 'parking'].forEach(k => {
    if (!result[k]) result[k] = null;
  });

  return result;
}


/**
 * Reads data rows from a section identified by getSectionBoundaries_.
 * Returns a 2D array of values (6 columns).
 */
function readSectionData_(sheet, bounds) {
  if (!bounds || bounds.start > bounds.end) return [];
  return sheet.getRange(bounds.start, 1, bounds.end - bounds.start + 1, 6).getValues();
}


/**
 * Writes data rows into a section, inserting or deleting rows as needed so the
 * section is exactly `rows.length` data rows (minimum `minRows`).
 * Returns the number of rows inserted (positive) or deleted (negative) so the
 * caller can adjust downstream positions.
 */
function writeSectionData_(sheet, bounds, rows, minRows) {
  minRows = minRows || 0;
  const targetCount = Math.max(rows.length, minRows);
  const currentCount = bounds.end - bounds.start + 1;
  const delta = targetCount - currentCount;

  if (delta > 0) {
    // Insert rows at the end of the section (before the next section header)
    sheet.insertRowsAfter(bounds.end, delta);
  } else if (delta < 0) {
    // Delete excess rows from end of section
    sheet.deleteRows(bounds.end + delta + 1, -delta);
  }

  // Clear data and stale validation so programmatic writes always succeed
  const dataRange = sheet.getRange(bounds.start, 1, targetCount, 6);
  dataRange.clearContent().clearDataValidations();

  // Write data
  if (rows.length > 0) {
    const padded = rows.map(r => {
      const a = Array.isArray(r) ? r.slice(0, 6) : [r];
      while (a.length < 6) a.push('');
      return a;
    });
    sheet.getRange(bounds.start, 1, padded.length, 6).setValues(padded);
  }

  // Re-apply status dropdown on column D (Action Items) with allowInvalid
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.dropdownOptions.actionStatus, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(bounds.start, 4, targetCount, 1).setDataValidation(statusRule);

  return delta;
}


/**
 * Organizes RACI rows by function/department.
 * 1. Scans columns B-E for person names and auto-fills the Role column (A)
 *    with the matching function from CONFIG.nameToFunction.
 * 2. Sorts rows so they are grouped by function in the order defined in
 *    CONFIG.dropdownOptions.raciFunctions.
 * 3. Ensures every function has at least one row (empty placeholder).
 *
 * Input: 2D array of RACI rows [Role, Responsible, Accountable, Consulted, Informed, ...]
 * Returns: organized 2D array.
 */
function organizeRACIByFunction_(raciRows) {
  const nameMap = CONFIG.nameToFunction;
  const functionOrder = CONFIG.dropdownOptions.raciFunctions;

  // Build buckets: one per function, preserving order
  const buckets = {};
  functionOrder.forEach(fn => { buckets[fn] = []; });
  const unmatched = [];

  // Process each row: auto-assign Role based on names in B-E
  raciRows.forEach(row => {
    const r = Array.isArray(row) ? row.slice() : [row];
    while (r.length < 5) r.push('');

    // Try to determine function from names in columns B-E (indices 1-4)
    let assignedFunction = String(r[0]).trim(); // existing Role value

    if (!assignedFunction || !functionOrder.some(fn => fn === assignedFunction)) {
      // Role is empty or not a known function — infer from names
      for (let col = 1; col <= 4; col++) {
        const cellVal = String(r[col]).trim().toLowerCase();
        if (!cellVal) continue;

        // Check each known name against the cell (supports "Katie Smith" or just "katie")
        for (const [name, fn] of Object.entries(nameMap)) {
          if (cellVal.indexOf(name) !== -1) {
            assignedFunction = fn;
            break;
          }
        }
        if (assignedFunction && functionOrder.some(fn => fn === assignedFunction)) break;
      }
    }

    // Place into the correct bucket
    if (assignedFunction && buckets[assignedFunction]) {
      r[0] = assignedFunction;
      buckets[assignedFunction].push(r);
    } else if (r.slice(1).some(c => String(c).trim() !== '')) {
      // Has content but no function match — keep in unmatched
      unmatched.push(r);
    }
    // Skip completely empty rows
  });

  // Build result: functions in order, each with at least one row
  const result = [];
  functionOrder.forEach(fn => {
    if (buckets[fn].length > 0) {
      buckets[fn].forEach(r => result.push(r));
    } else {
      // Empty placeholder row for this function
      result.push([fn, '', '', '', '', '']);
    }
  });

  // Append any unmatched rows at the end
  unmatched.forEach(r => result.push(r));

  return result;
}


/**
 * onEdit trigger: handles two behaviors:
 * 1. Sprint-relative due dates → converts to actual date (2nd Thursday)
 * 2. RACI multi-select → appends new dropdown pick to existing comma-separated value
 */
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const val = e.value;
  if (!val) return;

  const col = e.range.getColumn();

  // --- Sprint-relative due date conversion (column C, Action Items) ---
  if (col === 3 && CONFIG.dropdownOptions.sprintDueDate.indexOf(val) !== -1) {
    const sprintOffsetMap = {
      'This Sprint': 0, 'Next Sprint': 1, '2 Sprints Out': 2,
      '3 Sprints Out': 3, '4 Sprints Out': 4, '5 Sprints Out': 5
    };
    const offset = sprintOffsetMap[val];
    if (offset === undefined) return;

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    const targetSprintStart = new Date(startOfWeek);
    targetSprintStart.setDate(startOfWeek.getDate() + (offset * 14));
    const secondThursday = new Date(targetSprintStart);
    secondThursday.setDate(targetSprintStart.getDate() + 10);

    e.range.setValue(secondThursday);
    e.range.setNumberFormat('MMM d, yyyy');
    return;
  }

  // --- RACI multi-select append (columns B-E, person name dropdown) ---
  if (col >= 2 && col <= 5 && CONFIG.dropdownOptions.raciPeople.indexOf(val) !== -1) {
    // Check if this cell is in a RACI section by scanning for the RACI header above
    const bounds = getSectionBoundaries_(sheet);
    if (!bounds.raci) return;
    const row = e.range.getRow();
    if (row < bounds.raci.start || row > bounds.raci.end) return;

    // Append to existing value instead of replacing
    const oldVal = e.oldValue || '';
    if (oldVal) {
      // Check if the name is already in the list
      const existing = oldVal.split(',').map(s => s.trim());
      if (existing.indexOf(val) === -1) {
        e.range.setValue(oldVal + ', ' + val);
      } else {
        // Name already present — restore old value (toggle off not supported)
        e.range.setValue(oldVal);
      }
    }
    // If oldVal is empty, the single selection stands as-is
  }
}


/**
 * Polls all satellite spreadsheets and handles:
 * 1. Sprint-relative due dates → converts to actual dates (2nd Thursday)
 * 2. RACI multi-select → detects when a dropdown pick replaced a multi-value
 *    and restores the append behavior by tracking previous RACI snapshots.
 *
 * This is needed because the Hub's onEdit trigger cannot fire on satellite edits.
 * Run this on a short time-based trigger (every 1–5 minutes).
 */
function convertSprintDatesInSatellites() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  if (!configSheet) return;

  const sprintOffsetMap = {
    'This Sprint': 0, 'Next Sprint': 1, '2 Sprints Out': 2,
    '3 Sprints Out': 3, '4 Sprints Out': 4, '5 Sprints Out': 5
  };
  const peopleList = CONFIG.dropdownOptions.raciPeople;
  const props = PropertiesService.getScriptProperties();

  const data = configSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const satelliteId = data[i][1];
    if (!satelliteId) continue;

    try {
      const satellite = SpreadsheetApp.openById(satelliteId);
      const sheet = satellite.getSheetByName('Check-In');
      if (!sheet) continue;

      const bounds = getSectionBoundaries_(sheet);

      // --- 1. Sprint due date conversion ---
      if (bounds.actions) {
        const startRow = bounds.actions.start;
        const endRow = bounds.actions.end;
        if (endRow >= startRow) {
          const range = sheet.getRange(startRow, 3, endRow - startRow + 1, 1);
          const values = range.getValues();
          for (let r = 0; r < values.length; r++) {
            const val = String(values[r][0]).trim();
            if (sprintOffsetMap[val] !== undefined) {
              const offset = sprintOffsetMap[val];
              const today = new Date();
              const startOfWeek = new Date(today);
              startOfWeek.setDate(today.getDate() - today.getDay() + 1);
              const targetSprintStart = new Date(startOfWeek);
              targetSprintStart.setDate(startOfWeek.getDate() + (offset * 14));
              const secondThursday = new Date(targetSprintStart);
              secondThursday.setDate(targetSprintStart.getDate() + 10);
              const cell = sheet.getRange(startRow + r, 3);
              cell.setValue(secondThursday);
              cell.setNumberFormat('MMM d, yyyy');
            }
          }
        }
      }

      // --- 2. RACI multi-select append ---
      if (bounds.raci) {
        const rStart = bounds.raci.start;
        const rEnd = bounds.raci.end;
        if (rEnd >= rStart) {
          const numRows = rEnd - rStart + 1;
          // Read RACI columns B-E (cols 2-5)
          const raciRange = sheet.getRange(rStart, 2, numRows, 4);
          const raciValues = raciRange.getValues();

          // Load previous snapshot for this satellite
          const snapshotKey = 'raci_snapshot_' + satelliteId;
          let prevSnapshot = null;
          try {
            const stored = props.getProperty(snapshotKey);
            if (stored) prevSnapshot = JSON.parse(stored);
          } catch (_) { /* ignore parse errors */ }

          let changed = false;

          if (prevSnapshot && prevSnapshot.length === raciValues.length) {
            for (let r = 0; r < raciValues.length; r++) {
              for (let c = 0; c < 4; c++) {
                const curr = String(raciValues[r][c]).trim();
                const prev = String(prevSnapshot[r][c]).trim();

                if (curr === prev) continue;

                // If the current value is a single known person name AND the
                // previous value contained content (was not empty), the dropdown
                // likely replaced a multi-value. Append instead.
                if (prev && prev !== curr && peopleList.indexOf(curr) !== -1) {
                  const existingNames = prev.split(',').map(s => s.trim());
                  if (existingNames.indexOf(curr) === -1) {
                    // Append
                    const merged = prev + ', ' + curr;
                    raciValues[r][c] = merged;
                    changed = true;
                  } else {
                    // Already present — restore previous
                    raciValues[r][c] = prev;
                    changed = true;
                  }
                }
              }
            }
          }

          if (changed) {
            raciRange.setValues(raciValues);
          }

          // Save current state as snapshot for next poll
          props.setProperty(snapshotKey, JSON.stringify(raciValues));
        }
      }

    } catch (err) {
      console.error('Satellite poll failed for ' + data[i][0] + ': ' + err.message);
    }
  }
}

/**
 * Creates a trigger that runs convertSprintDatesInSatellites every 5 minutes.
 */
function createSprintDateConversionTrigger() {
  // Remove any existing trigger for this function
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'convertSprintDatesInSatellites') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('convertSprintDatesInSatellites')
    .timeBased()
    .everyMinutes(5)
    .create();

  SpreadsheetApp.getUi().alert('✅ Sprint date conversion trigger created (runs every 5 minutes)');
}

/**
 * Removes the sprint date conversion trigger.
 */
function removeSprintDateConversionTrigger() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'convertSprintDatesInSatellites') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  SpreadsheetApp.getUi().alert('✅ Sprint date conversion trigger removed');
}


/**
 * Pushes a standalone Apps Script to a satellite workbook.
 * This gives the satellite its own menu with archive viewer.
 * Uses the Apps Script API to create a bound script project.
 *
 * Since we can't directly create bound scripts programmatically,
 * we instead create an "Archive" sheet in the satellite that
 * pulls archived data from the master, and add a simple onOpen menu.
 */
function pushSatelliteScript_(satellite, checkInName, masterId) {
  // Create an Archive sheet in the satellite
  let archiveSheet = satellite.getSheetByName('📚 Sprint Archives');
  if (!archiveSheet) {
    archiveSheet = satellite.insertSheet('📚 Sprint Archives');
  }
  archiveSheet.clear();

  // Header
  archiveSheet.getRange('A1').setValue('📚 Sprint Archives — ' + checkInName);
  archiveSheet.getRange('A1').setFontSize(14).setFontWeight('bold');
  archiveSheet.getRange('A2').setValue('Archives are synced from the master workbook during sprint rollover.');
  archiveSheet.getRange('A2').setFontStyle('italic').setFontColor('#666');
  archiveSheet.getRange('A3').setValue('Last synced: ' + new Date().toLocaleString());

  const headers = ['Sprint', 'Section', 'Content', 'Owner', 'Status', 'Date Archived'];
  archiveSheet.getRange(5, 1, 1, headers.length).setValues([headers]);
  archiveSheet.getRange(5, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');

  archiveSheet.setColumnWidth(1, 90);
  archiveSheet.setColumnWidth(2, 100);
  archiveSheet.setColumnWidth(3, 350);
  archiveSheet.setColumnWidth(4, 130);
  archiveSheet.setColumnWidth(5, 100);
  archiveSheet.setColumnWidth(6, 120);
  archiveSheet.setFrozenRows(5);

  // Hide the archive sheet by default (users will unhide via the tab)
  // Actually, leave it visible so they can click to it
}


/**
 * Syncs archived sprint data from master to a specific satellite's Archive sheet.
 * Called during sprint rollover and can also be run manually.
 */
function syncArchiveToSatellite_(ss, satelliteId, checkInName) {
  try {
    const satellite = SpreadsheetApp.openById(satelliteId);
    let archiveSheet = satellite.getSheetByName('📚 Sprint Archives');
    if (!archiveSheet) {
      archiveSheet = satellite.insertSheet('📚 Sprint Archives');
      const headers = ['Sprint', 'Section', 'Content', 'Owner', 'Status', 'Date Archived'];
      archiveSheet.getRange(5, 1, 1, headers.length).setValues([headers]);
      archiveSheet.getRange(5, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');
      archiveSheet.setFrozenRows(5);
    }

    // Pull this satellite's archive data from master
    const masterArchive = ss.getSheetByName('📚 Satellite Tracker Archive');
    if (!masterArchive) return;

    const data = masterArchive.getDataRange().getValues();
    const satRows = [];
    for (let r = 1; r < data.length; r++) {
      if (data[r][1] === checkInName) {
        // [Sprint, Section, Content, Owner, Status, Date Archived]
        satRows.push([data[r][0], data[r][2], data[r][3], data[r][4], data[r][5], data[r][6]]);
      }
    }

    // Clear old data (keep header)
    const lastRow = archiveSheet.getLastRow();
    if (lastRow > 5) {
      archiveSheet.getRange(6, 1, lastRow - 5, 6).clear();
    }

    // Write filtered data
    if (satRows.length > 0) {
      archiveSheet.getRange(6, 1, satRows.length, 6).setValues(satRows);

      // Color-code by sprint for readability
      let currentSprint = '';
      let colorToggle = false;
      for (let r = 0; r < satRows.length; r++) {
        if (satRows[r][0] !== currentSprint) {
          currentSprint = satRows[r][0];
          colorToggle = !colorToggle;
        }
        if (colorToggle) {
          archiveSheet.getRange(6 + r, 1, 1, 6).setBackground('#F5F5F5');
        }
      }
    }

    // Update header
    archiveSheet.getRange('A1').setValue('📚 Sprint Archives — ' + checkInName);
    archiveSheet.getRange('A1').setFontSize(14).setFontWeight('bold');
    archiveSheet.getRange('A2').setValue(satRows.length + ' archived items from previous sprints');
    archiveSheet.getRange('A3').setValue('Last synced: ' + new Date().toLocaleString());

    // Set column widths
    archiveSheet.setColumnWidth(1, 90);
    archiveSheet.setColumnWidth(2, 100);
    archiveSheet.setColumnWidth(3, 350);
    archiveSheet.setColumnWidth(4, 130);
    archiveSheet.setColumnWidth(5, 100);
    archiveSheet.setColumnWidth(6, 120);

  } catch (error) {
    console.error('Archive sync to satellite failed for ' + checkInName + ': ' + error.message);
  }
}


/**
 * Pushes archive data to ALL satellite workbooks.
 * Can be run manually or is called during sprint rollover.
 */
function syncArchivesToAllSatellites() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  if (!configSheet) return;

  ss.toast('Syncing archives to satellites...', '📚 Archives', -1);

  const data = configSheet.getDataRange().getValues();
  let synced = 0;

  for (let i = 1; i < data.length; i++) {
    const name = data[i][0];
    const id = data[i][1];
    if (!id) continue;

    const checkIn = CONFIG.checkIns.find(c => c.name === name || c.legacyName === name);
    if (!checkIn || checkIn.type === 'okr') continue;

    syncArchiveToSatellite_(ss, id, name);
    synced++;
  }

  ss.toast(synced + ' satellite archives synced!', '✅ Complete', 5);
}


/**
 * Pushes archive sheet to a specific satellite (e.g. Curator).
 * Use this to add the archive feature to existing satellites that were created before this update.
 */
function pushArchiveToExistingSatellite() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  if (!configSheet) {
    ui.alert('Run Initial Setup first.');
    return;
  }

  const data = configSheet.getDataRange().getValues();
  const satellites = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][1]) {
      const checkIn = CONFIG.checkIns.find(c => c.name === data[i][0] || c.legacyName === data[i][0]);
      if (checkIn && checkIn.type === 'checkin') {
        satellites.push({ name: data[i][0], id: data[i][1] });
      }
    }
  }

  if (satellites.length === 0) {
    ui.alert('No satellites found.');
    return;
  }

  // Build HTML picker
  let html = '<style>body{font-family:Arial;padding:15px} button{margin:5px;padding:8px 16px;cursor:pointer;border:1px solid #ddd;border-radius:4px;background:#f5f5f5} button:hover{background:#e0e0e0} .all{background:#1a73e8;color:white;border:none} .all:hover{background:#1557b0}</style>';
  html += '<h3>Push Archive Sheet to Satellite</h3>';
  html += '<p>This adds a "📚 Sprint Archives" sheet to the satellite with archived data from previous sprints.</p>';
  html += '<button class="all" onclick="google.script.run.withSuccessHandler(done).syncArchivesToAllSatellites()">Push to ALL Satellites</button><hr>';
  satellites.forEach(s => {
    html += '<button onclick="google.script.run.withSuccessHandler(done).pushArchiveToSatelliteByName(\'' + s.name.replace(/'/g, "\\'") + '\')">' + s.name + '</button> ';
  });
  html += '<script>function done(){alert("Archive synced!");google.script.host.close()}</script>';

  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(400).setHeight(300);
  ui.showModalDialog(htmlOutput, '📚 Push Archives to Satellites');
}


/**
 * Push archive to a single satellite by name (called from UI)
 */
function pushArchiveToSatelliteByName(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  if (!configSheet) return;

  const data = configSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name && data[i][1]) {
      syncArchiveToSatellite_(ss, data[i][1], name);
      return;
    }
  }
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
    'Satellite Source', 'Task / Action Item', '📊', 'Owner', 'Due Date', 'Status',
    'Priority', 'Sprint', 'Decision Context', 'Last Updated'
  ];
  raciSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  raciSheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#1a73e8')
    .setFontColor('white');

  raciSheet.setColumnWidth(1, 160);
  raciSheet.setColumnWidth(2, 350);
  raciSheet.setColumnWidth(3, 35);   // 📊 Deck checkbox — narrow
  raciSheet.setColumnWidth(4, 130);
  raciSheet.setColumnWidth(5, 110);
  raciSheet.setColumnWidth(6, 100);
  raciSheet.setColumnWidth(7, 70);
  raciSheet.setColumnWidth(8, 90);
  raciSheet.setColumnWidth(9, 250);
  raciSheet.setColumnWidth(10, 130);

  raciSheet.setFrozenRows(1);

  // Checkbox validation for Deck column (Col C = column 3)
  const checkboxRule = SpreadsheetApp.newDataValidation()
    .requireCheckbox()
    .setAllowInvalid(false)
    .build();
  raciSheet.getRange('C2:C500').setDataValidation(checkboxRule);

  // Status dropdown (Col F = column 6, shifted from old Col E)
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.dropdownOptions.actionStatus, true)
    .setAllowInvalid(true)
    .build();
  raciSheet.getRange('F2:F500').setDataValidation(statusRule);
  
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

    ss.toast('Pushing archives to satellites...', '🔄 Sprint Rollover', -1);
    syncArchivesToAllSatellites();

    ss.toast('Sprint rollover complete!', '✅ Success', 5);

    const deckResponse = ui.alert(
      '✅ Sprint Rollover Complete!',
      newSprintName + ' has been created and pushed to all satellites.\n\n' +
      'Previous sprint "' + currentSprint.name + '" has been archived.\n' +
      'Satellite tracker snapshots saved to archive.\n\n' +
      'Would you like to generate the Sprint Deck now?',
      ui.ButtonSet.YES_NO
    );

    if (deckResponse === ui.Button.YES) {
      launchSprintDeckWizard();
    }
    
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
    
    const bounds = getSectionBoundaries_(sheet);

    // Capture agenda items
    const agendaData = bounds.agenda ? readSectionData_(sheet, bounds.agenda) : [];
    const nonEmptyAgenda = agendaData.filter(row => row.some(cell => cell !== '' && cell !== null));

    // Capture incomplete action items
    const actionData = bounds.actions ? readSectionData_(sheet, bounds.actions) : [];
    const incompleteActions = actionData.filter(row => {
      const hasContent = row.some(cell => cell !== '' && cell !== null);
      const status = String(row[3] || '').toLowerCase().trim();
      const isComplete = status === 'done' || status === 'complete' || status === 'completed';
      return hasContent && !isComplete;
    });

    // Capture decisions
    const decisionsData = bounds.decisions ? readSectionData_(sheet, bounds.decisions) : [];
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
    const bounds = getSectionBoundaries_(sheet);

    // Clear and repopulate agenda items (auto-expands)
    if (bounds.agenda) {
      const markedAgenda = rollover.agenda.map((row, index) => {
        if (index === 0 && row[0]) {
          return ['📌 [Rolled Over] ' + row[0], row[1], row[2], row[3], row[4], row[5] || ''];
        }
        return row.length >= 6 ? row : [...row, ...Array(6 - row.length).fill('')];
      });
      writeSectionData_(sheet, bounds.agenda, markedAgenda, 9);
    }

    // Clear decisions (reset to minimum)
    const bounds2 = getSectionBoundaries_(sheet);
    if (bounds2.decisions) {
      writeSectionData_(sheet, bounds2.decisions, [], 7);
    }

    // Clear and repopulate incomplete action items (auto-expands)
    const bounds3 = getSectionBoundaries_(sheet);
    if (bounds3.actions) {
      const markedActions = rollover.actions.map(row => {
        return ['⏳ [Carried Over] ' + row[0], row[1], row[2], 'Carried Over', row[4] || '', row[5] || ''];
      });
      writeSectionData_(sheet, bounds3.actions, markedActions, 10);
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
    
    const checkIn = CONFIG.checkIns.find(c => c.name === checkInName || c.legacyName === checkInName || c.legacyName === checkInName);
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
      const satBounds = getSectionBoundaries_(sheet);

      // Clear and repopulate agenda items (auto-expands)
      if (satBounds.agenda) {
        const markedAgenda = rollover.agenda.map((row, index) => {
          const r = row.length >= 6 ? row : [...row, ...Array(6 - row.length).fill('')];
          if (index === 0 && r[0]) {
            return ['📌 [Rolled Over] ' + r[0], r[1], r[2], r[3], r[4], r[5]];
          }
          return r;
        });
        writeSectionData_(sheet, satBounds.agenda, markedAgenda, 9);
      }

      // Clear decisions (reset to minimum)
      const satBounds2 = getSectionBoundaries_(sheet);
      if (satBounds2.decisions) {
        writeSectionData_(sheet, satBounds2.decisions, [], 7);
      }

      // Clear and repopulate incomplete action items (auto-expands)
      const satBounds3 = getSectionBoundaries_(sheet);
      if (satBounds3.actions) {
        const markedActions = rollover.actions.map(row => {
          return ['⏳ [Carried Over] ' + row[0], row[1], row[2], 'Carried Over', row[4] || '', row[5] || ''];
        });
        writeSectionData_(sheet, satBounds3.actions, markedActions, 10);
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
      const checkIn = CONFIG.checkIns.find(c => c.name === checkInName || c.legacyName === checkInName || c.legacyName === checkInName);
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
      
      let masterSheet = ss.getSheetByName(checkIn.activeSheet);
      if (!masterSheet) {
        // Auto-create master check-in tab from Sprint Template
        const template = ss.getSheetByName(CONFIG.sheets.sprintTemplate);
        if (template) {
          masterSheet = template.copyTo(ss);
          masterSheet.setName(checkIn.activeSheet);
          masterSheet.getRange('A1').setValue(checkIn.title);
          masterSheet.getRange('B4').setValue(checkIn.owner || '');
        } else {
          continue;
        }
      }

      // Sync editable sections FROM satellite TO master (dynamic boundaries)
      const satBounds = getSectionBoundaries_(satSheet);
      const masterBounds = getSectionBoundaries_(masterSheet);

      if (satBounds.agenda && masterBounds.agenda) {
        const data = readSectionData_(satSheet, satBounds.agenda);
        writeSectionData_(masterSheet, masterBounds.agenda, data, 9);
      }
      const masterBounds2 = getSectionBoundaries_(masterSheet);
      if (satBounds.decisions && masterBounds2.decisions) {
        const data = readSectionData_(satSheet, satBounds.decisions);
        writeSectionData_(masterSheet, masterBounds2.decisions, data, 7);
      }
      const masterBounds3 = getSectionBoundaries_(masterSheet);
      if (satBounds.actions && masterBounds3.actions) {
        const data = readSectionData_(satSheet, satBounds.actions);
        writeSectionData_(masterSheet, masterBounds3.actions, data, 10);
      }
      const masterBounds4 = getSectionBoundaries_(masterSheet);
      if (satBounds.raci && masterBounds4.raci) {
        const rawRaci = readSectionData_(satSheet, satBounds.raci);
        const organizedRaci = organizeRACIByFunction_(rawRaci);
        writeSectionData_(masterSheet, masterBounds4.raci, organizedRaci, 5);
        // Also write organized data back to the satellite
        const satBoundsRefresh = getSectionBoundaries_(satSheet);
        if (satBoundsRefresh.raci) {
          writeSectionData_(satSheet, satBoundsRefresh.raci, organizedRaci, 5);
        }
      }
      const masterBounds5 = getSectionBoundaries_(masterSheet);
      if (satBounds.parking && masterBounds5.parking) {
        const data = readSectionData_(satSheet, satBounds.parking);
        writeSectionData_(masterSheet, masterBounds5.parking, data, 5);
      }

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

  // Always recreate the sheet from scratch to avoid stale data validation issues
  const existing = ss.getSheetByName(CONFIG.sheets.masterRaci);
  if (existing) {
    ss.deleteSheet(existing);
  }
  const raciSheet = createMasterRACISheet_();

  ss.toast('Refreshing Master RACI Tracker...', '📋 RACI', -1);

  const sprintInfo = getCurrentSprintInfo_(ss);
  
  const allActions = [];
  
  CONFIG.checkIns.forEach(checkIn => {
    if (checkIn.type === 'okr') return;

    // Read from the satellite workbook's Check-In sheet (not Hub tabs)
    const sheet = getSatelliteCheckInSheet_(checkIn.name);
    if (!sheet) return;

    // Pull action items (dynamic boundaries)
    const bounds = getSectionBoundaries_(sheet);
    const actionData = bounds.actions ? readSectionData_(sheet, bounds.actions) : [];

    actionData.forEach(row => {
      if (!row[0] || String(row[0]).trim() === '') return;

      allActions.push([
        checkIn.name,             // Satellite Source
        row[0],                   // Task
        false,                    // 📊 Deck (unchecked by default)
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
    const decisionsData = bounds.decisions ? readSectionData_(sheet, bounds.decisions) : [];
    decisionsData.forEach(row => {
      if (!row[0] || String(row[0]).trim() === '') return;

      // Add decisions that have follow-ups as action items
      if (row[3] && String(row[3]).trim() !== '') {
        allActions.push([
          checkIn.name,
          '↳ Follow-up: ' + row[3],
          false,                    // 📊 Deck
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
    raciSheet.getRange(2, 1, allActions.length, 10).setValues(allActions);
    
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
  const checkIn = CONFIG.checkIns.find(c => c.name === satelliteName || c.legacyName === satelliteName);
  if (!checkIn) throw new Error('Satellite "' + satelliteName + '" not found in config.');
  
  // Call Claude to extract structured data from Granola notes
  const extracted = extractMeetingData_(apiKey, granolaText, satelliteName, checkIn.owner);
  
  // Populate the satellite tracker in master (auto-create if missing)
  let sheet = ss.getSheetByName(checkIn.activeSheet);
  if (!sheet) {
    // Create the master check-in tab from the Sprint Template
    const template = ss.getSheetByName(CONFIG.sheets.sprintTemplate);
    if (template) {
      sheet = template.copyTo(ss);
      sheet.setName(checkIn.activeSheet);
      sheet.getRange('A1').setValue(checkIn.title);
      sheet.getRange('B4').setValue(checkIn.owner || '');
    } else {
      throw new Error('Master sheet "' + checkIn.activeSheet + '" not found and no Sprint Template to create it from.');
    }
  }

  // Use dynamic section boundaries so we can expand if items exceed default rows
  const bounds = getSectionBoundaries_(sheet);

  // Populate agenda items (auto-expands if > default rows)
  if (extracted.agenda && extracted.agenda.length > 0 && bounds.agenda) {
    const agendaData = extracted.agenda.map(a => [
      a.topic || '', a.owner || '', a.notes || '', a.link || '', a.priority || '', ''
    ]);
    writeSectionData_(sheet, bounds.agenda, agendaData, 9);
  }

  // Re-read boundaries after potential row insertion
  const bounds2 = getSectionBoundaries_(sheet);

  // Populate decisions (auto-expands if > default rows)
  if (extracted.decisions && extracted.decisions.length > 0 && bounds2.decisions) {
    const decData = extracted.decisions.map(d => [
      d.decision || '', d.owner || '', d.impact || '', d.followUp || '', d.link || '', ''
    ]);
    writeSectionData_(sheet, bounds2.decisions, decData, 7);
  }

  // Re-read boundaries after potential row insertion
  const bounds3 = getSectionBoundaries_(sheet);

  // Populate action items (auto-expands if > default rows)
  if (extracted.actionItems && extracted.actionItems.length > 0 && bounds3.actions) {
    const actData = extracted.actionItems.map(a => [
      a.task || '', a.owner || '', a.dueDate || '', a.status || 'Not Started', a.link || '', satelliteName
    ]);
    writeSectionData_(sheet, bounds3.actions, actData, 10);
  }
  
  // Push to satellite workbook
  pushToSingleSatellite_(ss, satelliteName);
  
  // Refresh master RACI
  refreshMasterRACI();
  
  // Log the meeting
  logMeeting_(ss, satelliteName, participantsStr, granolaText, extracted);
  
  // Update timelines from extracted milestones/dates
  let timelineCount = 0;
  if (extracted.timelineUpdates && extracted.timelineUpdates.length > 0) {
    timelineCount = updateTimelinesFromMeeting_(ss, extracted.timelineUpdates, satelliteName);
  }

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
    '• ' + timelineCount + ' timeline update(s) logged\n' +
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
    '5. "participants": Array of names of people who participated\n' +
    '6. "timelineUpdates": Array of timeline milestones, deadlines, or date changes discussed. Each item:\n' +
    '   {milestone, date, category, owner, changeType, details}\n' +
    '   - milestone: Short name of the milestone or deliverable\n' +
    '   - date: Target date in "Mon DD, YYYY" format (e.g. "Mar 24, 2026"). If no firm date, use first of the estimated month and set isTBD to true\n' +
    '   - isTBD: boolean, true if no firm date was committed (just discussed/estimated)\n' +
    '   - category: One of "Hiring", "Budget", "Building", "Events", "Curation", "Communications", "Academic", "Other"\n' +
    '   - owner: Who is responsible\n' +
    '   - changeType: "new" (new milestone), "moved" (date changed), "completed", "cancelled"\n' +
    '   - details: Brief context about why this was added/changed (what was said in the meeting)\n\n' +
    'For priority use P0-P3 (P0=critical). For impact use High/Medium/Low.\n' +
    'For status default to "Not Started". For dueDate use format like "Mar 15, 2026" or leave empty.\n' +
    'For timelineUpdates, capture ANY dates, deadlines, milestones, events, or scheduling changes discussed.\n' +
    'If someone says "let\'s push that to May" or "we need this by the 20th", capture it.\n' +
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
    
    const checkIn = CONFIG.checkIns.find(c => c.name === satelliteName || c.legacyName === satelliteName);
    if (!checkIn || checkIn.type === 'okr') continue;
    
    try {
      const satellite = SpreadsheetApp.openById(data[i][1]);
      const satSheet = satellite.getSheetByName('Check-In');
      if (!satSheet) continue;
      
      const masterSheet = ss.getSheetByName(checkIn.activeSheet);
      if (!masterSheet) continue;

      // Push all editable sections from master to satellite using dynamic boundaries
      const masterBounds = getSectionBoundaries_(masterSheet);
      const satBounds = getSectionBoundaries_(satSheet);

      if (masterBounds.agenda && satBounds.agenda) {
        const data = readSectionData_(masterSheet, masterBounds.agenda);
        writeSectionData_(satSheet, satBounds.agenda, data, 9);
      }
      // Re-read satellite bounds after possible row changes
      const satBounds2 = getSectionBoundaries_(satSheet);
      if (masterBounds.decisions && satBounds2.decisions) {
        const data = readSectionData_(masterSheet, masterBounds.decisions);
        writeSectionData_(satSheet, satBounds2.decisions, data, 7);
      }
      const satBounds3 = getSectionBoundaries_(satSheet);
      if (masterBounds.actions && satBounds3.actions) {
        const data = readSectionData_(masterSheet, masterBounds.actions);
        writeSectionData_(satSheet, satBounds3.actions, data, 10);
      }

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

  // Open the Internal Stakeholders satellite workbook
  const isSheet = getSatelliteCheckInSheet_('Internal Stakeholders');
  if (!isSheet) {
    ui.alert('Internal Stakeholders satellite not found.\n\nMake sure it is listed in the ⚙️ Satellite Config sheet.');
    return;
  }

  // Build owner → satellite mapping
  const ownerMap = {};
  CONFIG.checkIns.forEach(c => {
    if (c.type === 'checkin' && c.owner && c.name !== 'Internal Stakeholders') {
      const names = c.owner.split(',').map(n => n.trim().toLowerCase());
      names.forEach(name => { ownerMap[name] = c.name; });
    }
  });

  // Also map known person names to satellite names
  const functionToSatellite = {
    'Advancement': 'Advancement', 'Production': 'Production', 'Curator': 'Curator',
    'ED': 'ED', "President's Office": null, 'CHANEL': null,
    'Provost': null, 'BB6': null, 'Research': null
  };
  Object.entries(CONFIG.nameToFunction).forEach(([name, fn]) => {
    const sat = functionToSatellite[fn];
    if (sat) ownerMap[name] = sat;
  });

  // Read action items from Internal Stakeholders satellite
  const isBounds = getSectionBoundaries_(isSheet);
  const actionData = isBounds.actions ? readSectionData_(isSheet, isBounds.actions) : [];

  const distributed = {};
  const unmatched = [];

  actionData.forEach(row => {
    if (!row[0] || String(row[0]).trim() === '') return;

    const owner = String(row[1] || '').trim().toLowerCase();
    let targetSatellite = null;

    for (const [key, sat] of Object.entries(ownerMap)) {
      if (owner.includes(key) || key.includes(owner)) {
        targetSatellite = sat;
        break;
      }
    }

    if (targetSatellite) {
      if (!distributed[targetSatellite]) distributed[targetSatellite] = [];
      distributed[targetSatellite].push(row);
    } else if (owner) {
      unmatched.push(row);
    }
  });

  // Distribute to each target satellite workbook
  let totalDistributed = 0;

  Object.entries(distributed).forEach(([satName, items]) => {
    const targetSheet = getSatelliteCheckInSheet_(satName);
    if (!targetSheet) return;

    const targetBounds = getSectionBoundaries_(targetSheet);
    if (!targetBounds.actions) return;

    const existingActions = readSectionData_(targetSheet, targetBounds.actions);
    const newActions = existingActions.filter(r => r.some(c => String(c).trim() !== ''));
    items.forEach(item => {
      newActions.push([
        '📤 [From IS] ' + item[0],
        item[1],
        item[2],
        item[3] || 'Not Started',
        item[4] || '',
        'Internal Stakeholders'
      ]);
      totalDistributed++;
    });
    writeSectionData_(targetSheet, targetBounds.actions, newActions, 10);
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


// ============================================================================
// FULL YEAR TIMELINE + NEXT 6 SPRINTS
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
  createNext6SprintsSheet_(ss);
  ss.toast('Timelines created!', '✅ Complete', 5);
  ui.alert('✅ Timelines Created', '"Full Year Timeline", "Next 4 Weeks", and "Next 6 Sprints" sheets have been created with milestones pre-populated.\n\nItems marked with ⏳ have TBD dates (placed on estimated month).', ui.ButtonSet.OK);
}

/**
 * Creates the Full Year Timeline sheet with high-level milestones.
 * Pre-populated from the Yana Peel deck + internal stakeholder meeting context.
 * TBD dates are marked with ⏳ prefix.
 */
function createFullYearTimelineSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.sheets.fullYearTimeline);

  // Read existing statuses AND deck flags before clearing (keyed by milestone label)
  const savedStatuses = {};
  const savedDeckFlags = {};
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    for (let r = 0; r < data.length; r++) {
      const label = String(data[r][0] || '').trim();
      const deckVal = data[r][1]; // Col B = Deck checkbox
      const status = String(data[r][2] || '').trim(); // Col C = Status
      if (label && (status === 'Complete' || status === 'Behind')) {
        savedStatuses[label] = status;
      }
      if (label && deckVal === true) {
        savedDeckFlags[label] = true;
      }
    }
    sheet.clear();
  } else {
    sheet = ss.insertSheet(CONFIG.sheets.fullYearTimeline);
  }

  // Title
  sheet.getRange('A1').setValue('📅 CCAT Full Year Timeline (FY2027)');
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold');
  sheet.getRange('A2').setValue('Last updated: ' + new Date().toLocaleString() + '  |  ✅ = Complete  |  🔴 = Behind Schedule  |  ⏳ = TBD  |  📊 = Show in Deck');
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

  // Row 4: Quarter headers (merged) — start at col 4 (after Category + Deck + Status)
  let col = 4;
  const quarters = ['Q3 FY2026', 'Q4 FY2026', 'Q1 FY2027', 'Q2 FY2027', 'Q3 FY2027', 'Q4 FY2027'];
  const qWidths = [1, 3, 3, 3, 3, 3];
  quarters.forEach((q, i) => {
    sheet.getRange(4, col, 1, qWidths[i]).merge().setValue(q);
    sheet.getRange(4, col, 1, qWidths[i]).setBackground(quarterColors[q]).setFontWeight('bold').setHorizontalAlignment('center');
    col += qWidths[i];
  });

  // Row 5: Month headers — Col A=Category, Col B=📊, Col C=Status, Col D+=months
  const headerRow = ['Category', '📊', 'Status'].concat(months);
  sheet.getRange(5, 1, 1, headerRow.length).setValues([headerRow]);
  sheet.getRange(5, 1, 1, headerRow.length).setFontWeight('bold').setBackground('#e8eaed');

  // Apply month background colors (months now start at col 4)
  for (let c = 0; c < months.length; c++) {
    const qColor = quarterColors[quarterMap[months[c]]];
    sheet.getRange(5, c + 4).setBackground(qColor);
  }

  // Checkbox validation for Deck column
  const checkboxRule = SpreadsheetApp.newDataValidation()
    .requireCheckbox()
    .setAllowInvalid(false)
    .build();

  // ---- PRE-POPULATED MILESTONES ----
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

  const statusValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Complete', 'Behind', ''], true)
    .setAllowInvalid(false)
    .build();

  milestones.forEach(section => {
    // Section header
    sheet.getRange(currentRow, 1, 1, headerRow.length).setBackground('#333333').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.getRange(currentRow, 1).setValue(section.cat);
    currentRow++;

    section.items.forEach(item => {
      // Look up saved status and deck flag (persisted across refreshes)
      const status = savedStatuses[item.label] || '';
      const isComplete = status === 'Complete';
      const isBehind = status === 'Behind';

      // Column A: label
      sheet.getRange(currentRow, 1).setValue(item.label);
      if (isComplete) {
        sheet.getRange(currentRow, 1).setFontColor('#2E7D32');
      } else if (isBehind) {
        sheet.getRange(currentRow, 1).setFontColor('#B71C1C');
      } else if (item.tbd) {
        sheet.getRange(currentRow, 1).setFontColor('#9C27B0');
      }

      // Column B: 📊 Deck checkbox (restored from saved data)
      const deckCell = sheet.getRange(currentRow, 2);
      deckCell.setDataValidation(checkboxRule).setHorizontalAlignment('center');
      if (savedDeckFlags[item.label]) {
        deckCell.setValue(true);
      }

      // Column C: Status dropdown (restored from saved data)
      const statusCell = sheet.getRange(currentRow, 3);
      statusCell.setDataValidation(statusValidation).setHorizontalAlignment('center').setFontSize(10);
      if (status) {
        statusCell.setValue(status);
        statusCell.setBackground(isComplete ? '#C8E6C9' : '#FFCDD2');
        statusCell.setFontColor(isComplete ? '#2E7D32' : '#B71C1C');
        statusCell.setFontWeight('bold');
      }

      // Place marker in the correct month column (col D = month 0, so month + 4)
      const markerCol = item.month + 4;
      if (markerCol <= headerRow.length) {
        let marker, bgColor;
        if (isComplete) {
          marker = '✅';
          bgColor = '#C8E6C9';
        } else if (isBehind) {
          const behindDateMatch = item.label.match(/(?:By\s+)?((?:Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})/i);
          marker = behindDateMatch ? behindDateMatch[1] : '🚨';
          bgColor = '#FFCDD2';
        } else if (item.tbd) {
          marker = '⏳';
          bgColor = '#F3E5F5';
        } else {
          const dateMatch = item.label.match(/(?:By\s+)?((?:Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})/i);
          marker = dateMatch ? dateMatch[1] : '🎯';
          bgColor = '#E3F2FD';
        }
        const cell = sheet.getRange(currentRow, markerCol);
        cell.setValue(marker).setHorizontalAlignment('center').setBackground(bgColor);
        cell.setFontSize(marker.length <= 3 ? 12 : 9);
        if (isBehind) {
          cell.setFontWeight('bold').setFontColor('#B71C1C');
        } else if (marker !== '⏳' && marker !== '✅' && marker !== '🎯') {
          cell.setFontWeight('bold').setFontColor('#1565C0');
        }
      }
      currentRow++;
    });

    currentRow++; // Spacer between sections
  });

  // Format
  sheet.setColumnWidth(1, 380);
  sheet.setColumnWidth(2, 35);   // 📊 Deck checkbox — narrow
  sheet.setColumnWidth(3, 90);   // Status column
  for (let c = 4; c <= headerRow.length; c++) {
    sheet.setColumnWidth(c, 85);
  }
  sheet.setFrozenRows(5);
  sheet.setFrozenColumns(3);  // Freeze Category + Deck + Status

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
 * Creates the Next 6 Sprints timeline sheet.
 * Shows a sprint-based planning view covering the current sprint + 5 upcoming sprints.
 * Each sprint is a column (2-week block). Auto-pulls action items from satellites.
 */
function createNext6SprintsSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.sheets.next6Sprints);
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(CONFIG.sheets.next6Sprints);
  }

  const today = new Date();

  // Get current sprint info
  const sprintInfo = getCurrentSprintInfo_(ss);
  const sprintNameStr = String(sprintInfo.name || 'Sprint 1');
  const currentSprintNum = parseInt(sprintNameStr.replace(/[^0-9]/g, '')) || 1;

  // Calculate sprint date ranges (2 weeks each, starting from Monday of current week)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday of current week

  const sprints = [];
  for (let s = 0; s < 6; s++) {
    const sprintStart = new Date(startOfWeek);
    sprintStart.setDate(startOfWeek.getDate() + (s * 14));
    const sprintEnd = new Date(sprintStart);
    sprintEnd.setDate(sprintStart.getDate() + 13);
    const label = (sprintStart.getMonth() + 1) + '/' + sprintStart.getDate() + ' – ' +
                  (sprintEnd.getMonth() + 1) + '/' + sprintEnd.getDate();
    sprints.push({
      num: currentSprintNum + s,
      start: sprintStart,
      end: sprintEnd,
      label: label
    });
  }

  // Title
  sheet.getRange('A1').setValue('📅 Next 6 Sprints — Planning View');
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold');
  sheet.getRange('A2').setValue('Generated: ' + today.toLocaleString() + '  |  ⏳ = TBD date  |  Run "Refresh Next 6 Sprints" to update');
  sheet.getRange('A2').setFontStyle('italic').setFontColor('#666');

  // Row 3: Sprint headers — Col A=Task, B=📊, C=Owner, D=Status, E-J=Sprints
  const headerRow = ['Task / Milestone', '📊', 'Owner', 'Status'];
  const sprintColors = ['#C9A227', '#4285F4', '#0F9D58', '#AB47BC', '#FF7043', '#26A69A'];
  const sprintFontColors = ['#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'];

  sprints.forEach(sp => {
    headerRow.push('Sprint ' + sp.num + '\n' + sp.label);
  });

  sheet.getRange(3, 1, 1, headerRow.length).setValues([headerRow]);
  sheet.getRange(3, 1, 1, 4).setFontWeight('bold').setBackground('#1a73e8').setFontColor('#FFFFFF');
  sprints.forEach((sp, i) => {
    sheet.getRange(3, 5 + i).setFontWeight('bold').setBackground(sprintColors[i]).setFontColor(sprintFontColors[i])
      .setHorizontalAlignment('center').setWrap(true).setFontSize(10);
  });

  sheet.setRowHeight(3, 50);

  // Checkbox validation for Deck column
  const checkboxRule = SpreadsheetApp.newDataValidation()
    .requireCheckbox()
    .setAllowInvalid(false)
    .build();

  let currentRow = 5;
  const statusColors = { 'Complete': '#C8E6C9', 'In Progress': '#BBDEFB', 'Not Started': '#F5F5F5', 'Blocked': '#FFCDD2', 'Planning': '#FFF9C4', 'Upcoming': '#E1BEE7', 'Confirmed': '#DCEDC8' };

  // ---- Auto-pull action items from satellite check-in trackers ----
  sheet.getRange(currentRow, 1, 1, headerRow.length).setBackground('#1a73e8').setFontColor('#FFFFFF').setFontWeight('bold');
  sheet.getRange(currentRow, 1).setValue('📋 Action Items from Satellite Trackers (auto-pulled)');
  currentRow++;

  const sprintsEnd = new Date(sprints[5].end);

  CONFIG.checkIns.forEach(checkIn => {
    if (checkIn.type === 'okr') return;
    const checkSheet = ss.getSheetByName(checkIn.activeSheet);
    if (!checkSheet) return;

    const checkBounds = getSectionBoundaries_(checkSheet);
    const actions = checkBounds.actions ? readSectionData_(checkSheet, checkBounds.actions) : [];
    let hasItems = false;

    actions.forEach(row => {
      if (!row[0] || String(row[0]).trim() === '') return;
      const dueDate = row[2] ? new Date(row[2]) : null;
      if (!dueDate || isNaN(dueDate.getTime())) return;
      if (dueDate < today || dueDate > sprintsEnd) return;

      if (!hasItems) {
        sheet.getRange(currentRow, 1, 1, headerRow.length).setBackground('#424242').setFontColor('#FFFFFF').setFontWeight('bold');
        sheet.getRange(currentRow, 1).setValue('▶ ' + checkIn.name + ' (' + checkIn.owner + ')');
        currentRow++;
        hasItems = true;
      }

      sheet.getRange(currentRow, 1).setValue(row[0]);
      sheet.getRange(currentRow, 2).setDataValidation(checkboxRule).setHorizontalAlignment('center'); // 📊 Deck checkbox
      sheet.getRange(currentRow, 3).setValue(row[1] || '');  // Owner (shifted to col C)
      const status = row[3] || 'Not Started';
      sheet.getRange(currentRow, 4).setValue(status);  // Status (shifted to col D)
      sheet.getRange(currentRow, 4).setBackground(statusColors[status] || '#F5F5F5');

      // Place marker in correct sprint column (sprints now at col E-J = 5-10)
      for (let s = 0; s < 6; s++) {
        if (dueDate >= sprints[s].start && dueDate <= sprints[s].end) {
          const marker = row[0].toString().startsWith('⏳') ? '⏳' : '◆';
          sheet.getRange(currentRow, 5 + s).setValue(marker).setHorizontalAlignment('center').setBackground('#E8EAF6');
          break;
        }
      }

      if (row[0].toString().startsWith('⏳')) {
        sheet.getRange(currentRow, 1).setFontColor('#9C27B0');
      }

      currentRow++;
    });

    if (hasItems) currentRow++; // Spacer after satellite section
  });

  // ---- Empty rows for manual entry ----
  currentRow++;
  sheet.getRange(currentRow, 1, 1, headerRow.length).setBackground('#333333').setFontColor('#FFFFFF').setFontWeight('bold');
  sheet.getRange(currentRow, 1).setValue('✏️ Manual Entries (add your own items below)');
  currentRow++;
  for (let i = 0; i < 10; i++) {
    sheet.getRange(currentRow, 2).setDataValidation(checkboxRule).setHorizontalAlignment('center'); // 📊 checkbox
    sheet.getRange(currentRow, 4).setBackground('#F5F5F5');  // Status col (shifted)
    currentRow++;
  }

  // Format
  sheet.setColumnWidth(1, 420);
  sheet.setColumnWidth(2, 35);   // 📊 Deck checkbox — narrow
  sheet.setColumnWidth(3, 150);  // Owner
  sheet.setColumnWidth(4, 100);  // Status
  for (let c = 5; c <= headerRow.length; c++) {
    sheet.setColumnWidth(c, 130);
  }
  sheet.setFrozenRows(3);
  sheet.setFrozenColumns(2);  // Freeze Task + Deck

  return sheet;
}


/**
 * Refresh Next 6 Sprints timeline
 */
function refreshNext6Sprints() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('Refreshing Next 6 Sprints...', '📅 Timeline', -1);
  createNext6SprintsSheet_(ss);
  ss.toast('Next 6 Sprints refreshed!', '✅ Complete', 5);
}


// ============================================================================
// NEXT 4 WEEKS — NEAR-TERM MILESTONE & ACTION ITEM VIEW
// ============================================================================

/**
 * Creates or refreshes the Next 4 Weeks sheet.
 * Shows a week-by-week view of upcoming milestones (from Full Year Timeline)
 * and action items (from satellite check-in trackers) within a 4-week window.
 */
function createNext4WeeksSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.sheets.next4Weeks);
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(CONFIG.sheets.next4Weeks);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate 4 weeks starting from Monday of current week
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);

  const weeks = [];
  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(startOfWeek);
    weekStart.setDate(startOfWeek.getDate() + (w * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const label = (weekStart.getMonth() + 1) + '/' + weekStart.getDate() + ' – ' +
                  (weekEnd.getMonth() + 1) + '/' + weekEnd.getDate();
    weeks.push({ start: weekStart, end: weekEnd, label: label });
  }

  const fourWeeksEnd = weeks[3].end;

  // Title
  sheet.getRange('A1').setValue('📅 Next 4 Weeks — Upcoming Milestones & Actions');
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold');
  sheet.getRange('A2').setValue('Generated: ' + today.toLocaleString() + '  |  🎯 = Confirmed  |  ⏳ = TBD  |  ◆ = Action Item  |  Run "Refresh Next 4 Weeks" to update');
  sheet.getRange('A2').setFontStyle('italic').setFontColor('#666');

  // Row 4: Headers
  const weekColors = ['#C9A227', '#4285F4', '#0F9D58', '#AB47BC'];
  const weekFontColors = ['#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF'];
  const headerRow = ['Item', 'Owner', 'Source', 'Status'];
  weeks.forEach(w => headerRow.push('Week of\n' + w.label));

  sheet.getRange(4, 1, 1, headerRow.length).setValues([headerRow]);
  sheet.getRange(4, 1, 1, 4).setFontWeight('bold').setBackground('#1a73e8').setFontColor('#FFFFFF');
  weeks.forEach((w, i) => {
    sheet.getRange(4, 5 + i).setFontWeight('bold').setBackground(weekColors[i]).setFontColor(weekFontColors[i])
      .setHorizontalAlignment('center').setWrap(true).setFontSize(10);
  });
  sheet.setRowHeight(4, 50);

  const statusColors = { 'Complete': '#C8E6C9', 'In Progress': '#BBDEFB', 'Not Started': '#F5F5F5', 'Blocked': '#FFCDD2', 'Planning': '#FFF9C4', 'Upcoming': '#E1BEE7', 'Confirmed': '#DCEDC8' };
  let currentRow = 6;

  // ---- SECTION 1: Full Year Timeline Milestones ----
  sheet.getRange(currentRow, 1, 1, headerRow.length).setBackground('#1a73e8').setFontColor('#FFFFFF').setFontWeight('bold');
  sheet.getRange(currentRow, 1).setValue('🎯 Milestones from Full Year Timeline');
  currentRow++;

  const fytSheet = ss.getSheetByName(CONFIG.sheets.fullYearTimeline);
  if (fytSheet) {
    const fytData = fytSheet.getDataRange().getValues();
    // Row 5 (index 4) has month headers; col 0=Category, col 1=📊 Deck, col 2=Status, col 3+=months
    const monthHeaders = fytData[4] || [];
    // Parse month headers to date ranges (start from col 3)
    const monthDates = [];
    for (let c = 3; c < monthHeaders.length; c++) {
      const mStr = String(monthHeaders[c]).trim();
      if (mStr) {
        const parsed = new Date(mStr + ' 1');
        if (!isNaN(parsed.getTime())) {
          const monthEnd = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0);
          monthDates.push({ col: c, start: parsed, end: monthEnd, label: mStr });
        }
      }
    }

    let currentCategory = '';
    for (let r = 6; r < fytData.length; r++) {
      const row = fytData[r];
      const cellA = String(row[0] || '').trim();
      const cellC = String(row[2] || '').trim(); // Status column (shifted to col C)

      // Detect category headers (dark bg rows with emoji prefix, no status or markers)
      if (cellA && !cellC && !row.slice(3).some(c => String(c).trim() !== '')) {
        if (/^[^\w\s]/.test(cellA) && cellA.length > 2) {
          currentCategory = cellA;
          continue;
        }
      }

      if (!cellA) continue;

      // Find which month column has a marker (col 3+ in data)
      let markerMonth = null;
      for (let c = 3; c < row.length; c++) {
        const val = String(row[c]).trim();
        // Markers can be: ✅, ⏳, 🎯, 🚨, or a date string like "Mar 13"
        if (val === '🎯' || val === '⏳' || val === '✅' || val === '🚨' ||
            /^(?:Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$/i.test(val)) {
          const md = monthDates.find(m => m.col === c);
          if (md) {
            // Normalize: use status column to determine effective marker
            let effectiveMarker = val;
            if (cellC === 'Complete') effectiveMarker = '✅';
            else if (cellC === 'Behind') effectiveMarker = '🚨';
            markerMonth = { date: md, marker: effectiveMarker };
          }
          break;
        }
      }

      if (!markerMonth) continue;

      // Check if this month overlaps with our 4-week window
      if (markerMonth.date.end < startOfWeek || markerMonth.date.start > fourWeeksEnd) continue;

      // Place in correct week column(s)
      sheet.getRange(currentRow, 1).setValue(cellA);
      if (cellA.startsWith('⏳')) {
        sheet.getRange(currentRow, 1).setFontColor('#9C27B0');
      }
      sheet.getRange(currentRow, 3).setValue(currentCategory || 'Timeline');
      const fytStatus = markerMonth.marker === '✅' ? 'Complete' : markerMonth.marker === '🚨' ? 'Behind' : 'Upcoming';
      sheet.getRange(currentRow, 4).setValue(fytStatus);
      sheet.getRange(currentRow, 4).setBackground(fytStatus === 'Complete' ? statusColors['Complete'] : fytStatus === 'Behind' ? statusColors['Blocked'] : statusColors['Upcoming']);

      // For milestones with specific dates in their label, try to place in exact week
      const dateMatch = cellA.match(/(?:Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i) ||
                        cellA.match(/(\d{1,2})\/(\d{1,2})/);
      let placed = false;
      if (dateMatch) {
        const tryDate = new Date(dateMatch[0] + ', 2026');
        if (!isNaN(tryDate.getTime())) {
          for (let w = 0; w < 4; w++) {
            if (tryDate >= weeks[w].start && tryDate <= weeks[w].end) {
              sheet.getRange(currentRow, 5 + w).setValue(markerMonth.marker).setHorizontalAlignment('center').setBackground('#E8EAF6');
              placed = true;
              break;
            }
          }
        }
      }
      // If no specific date, spread across all overlapping weeks in that month
      if (!placed) {
        for (let w = 0; w < 4; w++) {
          if (weeks[w].end >= markerMonth.date.start && weeks[w].start <= markerMonth.date.end) {
            sheet.getRange(currentRow, 5 + w).setValue(markerMonth.marker).setHorizontalAlignment('center')
              .setBackground(markerMonth.marker === '⏳' ? '#F3E5F5' : '#E8EAF6');
          }
        }
      }

      currentRow++;
    }
  }

  currentRow++;

  // ---- SECTION 2: Action Items from Satellite Trackers ----
  sheet.getRange(currentRow, 1, 1, headerRow.length).setBackground('#1a73e8').setFontColor('#FFFFFF').setFontWeight('bold');
  sheet.getRange(currentRow, 1).setValue('📋 Action Items from Satellite Trackers');
  currentRow++;

  CONFIG.checkIns.forEach(checkIn => {
    if (checkIn.type === 'okr') return;
    const checkSheet = ss.getSheetByName(checkIn.activeSheet);
    if (!checkSheet) return;

    const checkBounds = getSectionBoundaries_(checkSheet);
    const actions = checkBounds.actions ? readSectionData_(checkSheet, checkBounds.actions) : [];
    let hasItems = false;

    actions.forEach(row => {
      if (!row[0] || String(row[0]).trim() === '') return;
      const dueDate = row[2] ? new Date(row[2]) : null;
      if (!dueDate || isNaN(dueDate.getTime())) return;
      if (dueDate < today || dueDate > fourWeeksEnd) return;

      if (!hasItems) {
        sheet.getRange(currentRow, 1, 1, headerRow.length).setBackground('#424242').setFontColor('#FFFFFF').setFontWeight('bold');
        sheet.getRange(currentRow, 1).setValue('▶ ' + checkIn.name + ' (' + checkIn.owner + ')');
        currentRow++;
        hasItems = true;
      }

      sheet.getRange(currentRow, 1).setValue(row[0]);
      sheet.getRange(currentRow, 2).setValue(row[1] || '');
      sheet.getRange(currentRow, 3).setValue(checkIn.name);
      const status = row[3] || 'Not Started';
      sheet.getRange(currentRow, 4).setValue(status);
      sheet.getRange(currentRow, 4).setBackground(statusColors[status] || '#F5F5F5');

      if (row[0].toString().startsWith('⏳')) {
        sheet.getRange(currentRow, 1).setFontColor('#9C27B0');
      }

      // Place marker in correct week column
      for (let w = 0; w < 4; w++) {
        if (dueDate >= weeks[w].start && dueDate <= weeks[w].end) {
          const marker = row[0].toString().startsWith('⏳') ? '⏳' : '◆';
          sheet.getRange(currentRow, 5 + w).setValue(marker).setHorizontalAlignment('center').setBackground('#E8EAF6');
          break;
        }
      }

      currentRow++;
    });

    if (hasItems) currentRow++;
  });

  // ---- Empty rows for manual entry ----
  currentRow++;
  sheet.getRange(currentRow, 1, 1, headerRow.length).setBackground('#333333').setFontColor('#FFFFFF').setFontWeight('bold');
  sheet.getRange(currentRow, 1).setValue('✏️ Manual Entries (add your own items below)');
  currentRow++;
  for (let i = 0; i < 10; i++) {
    sheet.getRange(currentRow, 4).setBackground('#F5F5F5');
    currentRow++;
  }

  // Format
  sheet.setColumnWidth(1, 420);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 160);
  sheet.setColumnWidth(4, 100);
  for (let c = 5; c <= headerRow.length; c++) {
    sheet.setColumnWidth(c, 130);
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
// README — SYSTEM DOCUMENTATION (UPDATED)
// Replace the existing createReadmeSheet_ function with this one.
// ============================================================================

function createReadmeSheet_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.sheets.readme);
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(CONFIG.sheets.readme);
  }

  const gold    = '#C9A227';
  const darkBg  = '#1a1a2e';
  const sectionBg = '#16213e';
  const headerBg  = '#0f3460';
  const textColor = '#e0e0e0';
  const white   = '#FFFFFF';

  sheet.getRange(1, 1, 120, 6).setBackground(darkBg).setFontColor(textColor).setFontFamily('Arial');

  let row = 1;

  // ── helpers ────────────────────────────────────────────────────────────────
  function addSection(title) {
    sheet.getRange(row, 1, 1, 6).merge()
      .setBackground(headerBg).setFontColor(gold)
      .setFontSize(14).setFontWeight('bold').setValue(title);
    row++;
  }

  function addSubSection(title) {
    sheet.getRange(row, 1, 1, 6).merge()
      .setBackground(sectionBg).setFontColor(white)
      .setFontSize(11).setFontWeight('bold').setValue('  ' + title);
    row++;
  }

  function addLine(text) {
    sheet.getRange(row, 1, 1, 6).merge().setValue('  ' + text).setWrap(true);
    row++;
  }

  function addBlank() { row++; }

  function addDivider() {
    sheet.getRange(row, 1, 1, 6).merge()
      .setBackground('#0D3B54').setValue('').setFontSize(2);
    row++;
  }

  // ── TITLE ──────────────────────────────────────────────────────────────────
  sheet.getRange(row, 1, 1, 6).merge()
    .setValue('📖 CCAT Operating System — README')
    .setFontSize(20).setFontWeight('bold').setFontColor(gold).setHorizontalAlignment('center');
  row += 2;

  sheet.getRange(row, 1, 1, 6).merge()
    .setValue('How this system works and how to do everything in it. Last updated: ' + new Date().toLocaleDateString())
    .setFontStyle('italic').setFontColor('#aaa').setHorizontalAlignment('center');
  row += 3;


  // ── ARCHITECTURE OVERVIEW ──────────────────────────────────────────────────
  addSection('🗺️  System Architecture');
  addLine('CCAT OS is a hub-and-spoke system. You work in the master spreadsheet (Home Base); stakeholders work in their own Satellite workbooks. Data flows in one direction: Satellites → Home Base.');
  addBlank();
  addLine('Core concepts:');
  addLine('  🏛️  Home Base  — Master control. The ED\'s workspace. Contains all tabs below.');
  addLine('  📡  Satellites  — Individual Google Sheets shared with each stakeholder (Production, Curator, Internal Stakeholders, Advancement, ED, Director ML, Director MI, Technical Director). Each has a "Check-In" tab and a "📚 Sprint Archives" tab.');
  addLine('  ⏱️  Sprints  — 2-week execution cycles. Sprint Rollover archives the old sprint and pushes the new one to all satellites, carrying over incomplete action items.');
  addLine('  📋  Master RACI  — Your single view of all action items across every satellite. The primary place where you validate, assign, and track work.');
  addLine('  📝  Granola / Meeting Notes  — Claude AI processes meeting transcripts. Action items land in Master RACI as [DRAFT] for your review; milestones land in Milestone Staging.');
  addLine('  📅  Timelines  — Three views: Full Year (16-month milestone map), Next 6 Sprints (12-week action view), Next 4 Weeks (near-term detail).');
  addLine('  📊  Sprint Deck  — Auto-generated Google Slides presentation rebuilt from live data each sprint.');
  addBlank();
  addDivider();
  addBlank();


  // ── CORE WORKFLOW ──────────────────────────────────────────────────────────
  addSection('🔄  Core Weekly Workflow');
  addLine('1.  Hold meetings → copy Granola transcript');
  addLine('2.  Run  📝 Process Notes → RACI Draft  — action items appear in Master RACI as [DRAFT]; milestones appear in Milestone Staging');
  addLine('3.  Review Master RACI — edit owners, delete anything wrong, change [DRAFT] status to "Not Started" to approve');
  addLine('4.  Run  📤 Push RACI → All Satellites  — approved items are written to each stakeholder\'s satellite tracker');
  addLine('5.  Stakeholders update their status / add new items in their satellite');
  addLine('6.  Run  🔄 Sync Satellite Statuses → RACI  — pulls status updates back to Master RACI without wiping your data');
  addLine('7.  For milestones: open 📋 Milestone Staging, set Timeline Target column (4-Week / 6-Sprint / Year), set Status to "Approved", then run  🚀 Push Approved Milestones');
  addLine('8.  Every 2 weeks: run  🔄 New Sprint (Rollover & Push)  to start a new sprint');
  addBlank();
  addDivider();
  addBlank();


  // ── RACI WORKFLOW IN DETAIL ────────────────────────────────────────────────
  addSection('📋  RACI & Trackers — Detailed Guide');

  addSubSection('Step 1 — Process Notes → RACI Draft');
  addLine('Menu: 🎛️ CCAT System → 📋 RACI & Trackers → 📝 Process Notes → RACI Draft');
  addLine('1. Choose which satellite meeting the notes are from');
  addLine('2. Paste the Granola transcript');
  addLine('3. Claude extracts action items, decision follow-ups, and milestones');
  addLine('4. Action items land in Master RACI highlighted yellow with status "[DRAFT — Validate]"');
  addLine('5. Milestones land in the 📋 Milestone Staging sheet');
  addBlank();

  addSubSection('Step 2 — Validate in Master RACI');
  addLine('Open the "📋 Master RACI Tracker" tab (Sheets menu → Master RACI Tracker)');
  addLine('• Yellow rows = [DRAFT], not yet pushed to anyone');
  addLine('• Edit the Owner column — the function/department is auto-shown in parentheses');
  addLine('• Delete any rows that shouldn\'t be pushed');
  addLine('• Change Status from "[DRAFT — Validate]" to "Not Started" to approve a row');
  addLine('• The 📊 checkbox in column C flags an item to appear in the Sprint Deck');
  addBlank();

  addSubSection('Step 3 — Push RACI → All Satellites');
  addLine('Menu: 🎛️ CCAT System → 📋 RACI & Trackers → 📤 Push RACI → All Satellites');
  addLine('• Pushes every approved row (status ≠ [DRAFT]) to the correct satellite\'s Action Items section');
  addLine('• Matches by satellite name in the Source column');
  addLine('• Skips duplicates — if the task already exists in that satellite it won\'t be added twice');
  addBlank();

  addSubSection('Step 4 — Stakeholders Update Their Satellites');
  addLine('Stakeholders open their satellite workbook (same link every sprint — URL never changes)');
  addLine('• They can update Status: Not Started / In Progress / Complete / Blocked');
  addLine('• They can add new action items in the Action Items section');
  addLine('• They edit their RACI section (columns B–E). Selecting a name appends to the cell — multi-select is supported');
  addLine('• Due Date column accepts "This Sprint", "Next Sprint", "2 Sprints Out" etc. — auto-converts to real dates every 5 min');
  addBlank();

  addSubSection('Step 5 — Sync Satellite Statuses → RACI (Non-Destructive)');
  addLine('Menu: 🎛️ CCAT System → 📋 RACI & Trackers → 🔄 Sync Satellite Statuses → RACI');
  addLine('• Matches each satellite\'s action items to existing RACI rows by task text');
  addLine('• Updates the Status and Last Updated columns only — your edits to Owner, Due Date, etc. are preserved');
  addLine('• [DRAFT] rows are never touched by this sync');
  addLine('• New items found in satellites (that aren\'t in RACI yet) are appended in blue');
  addLine('• This is the safe, routine sync. "Refresh Master RACI (rebuild)" is a nuclear option — it wipes and rebuilds the whole sheet');
  addBlank();

  addSubSection('Distribute Action Items from Internal Stakeholders');
  addLine('Menu: 🎛️ CCAT System → 📋 RACI & Trackers → 📤 Distribute Action Items from IS');
  addLine('• After an Internal Stakeholders meeting, reads all action items from the IS satellite');
  addLine('• Matches the Owner name to the correct satellite (e.g. "Richard" → Production, "Lumi" → Curator)');
  addLine('• Pushes those items directly to the target satellite — bypasses the RACI validation step');
  addLine('• Use this for quick distribution after the IS weekly meeting');
  addBlank();
  addDivider();
  addBlank();


  // ── MILESTONES & TIMELINES ─────────────────────────────────────────────────
  addSection('📅  Milestone Staging & Timelines — Detailed Guide');

  addSubSection('Milestone Staging Sheet');
  addLine('Any time you run "Process Notes → RACI Draft", milestones mentioned in the meeting are extracted and placed here with status "Pending Review".');
  addLine('Columns:');
  addLine('  Milestone  — what was discussed');
  addLine('  Date  — Claude\'s best estimate. Edit if wrong.');
  addLine('  Is TBD  — Yes if no firm date was given');
  addLine('  Category  — Hiring / Budget / Building / Events / Curation / Communications / Academic / Other');
  addLine('  Owner  — who\'s responsible');
  addLine('  Source Meeting  — which satellite check-in this came from');
  addLine('  Timeline Target  — YOU fill this in: 4-Week, 6-Sprint, Year, or Skip');
  addLine('  Status  — set to "Approved" when ready to push; becomes "Pushed" automatically');
  addLine('  Notes  — context from the meeting');
  addBlank();

  addSubSection('Pushing Milestones to Timelines');
  addLine('1. Open 📋 Milestone Staging (Sheets menu, or RACI & Trackers → View Milestone Staging)');
  addLine('2. Review each row. Edit Milestone text, Date, Category as needed');
  addLine('3. Set the Timeline Target dropdown: 4-Week / 6-Sprint / Year');
  addLine('4. Change Status to "Approved"');
  addLine('5. Run: 🎛️ CCAT System → 📋 RACI & Trackers → 🚀 Push Approved Milestones to Timelines');
  addLine('6. Pushed rows turn green. The milestone appears in the timeline\'s Manual Entries section.');
  addBlank();

  addSubSection('Three Timeline Views');
  addLine('📅 Full Year Timeline — 16-month milestone map (Mar 2026 – Jun 2027). Pre-populated with hiring, budget, facilities, events, curation, comms, and academic milestones. Items with ⏳ have TBD dates; 🎯 = confirmed. The Status column (Complete / Behind) persists across refreshes. The 📊 checkbox flags an item for the Sprint Deck.');
  addLine('  → Refresh: 🎛️ CCAT System → 📅 Timelines → 🔄 Refresh Full Year Timeline');
  addBlank();
  addLine('📅 Next 6 Sprints — Sprint-by-sprint planning view (12 weeks). Auto-pulls action items from all check-in tabs that have due dates within the window. Has a Manual Entries section at the bottom for ad-hoc items. The 📊 checkbox filters which items appear in the Sprint Deck.');
  addLine('  → Refresh: 🎛️ CCAT System → 📅 Timelines → 🔄 Refresh Next 6 Sprints');
  addBlank();
  addLine('📅 Next 4 Weeks — Week-by-week detail. Pulls milestones from the Full Year Timeline AND action items from all check-in tabs that fall within 4 weeks. Has a Manual Entries section.');
  addLine('  → Refresh: 🎛️ CCAT System → 📅 Timelines → 🔄 Refresh Next 4 Weeks');
  addBlank();
  addLine('📅 Timeline Change Log — Automatic log of every timeline modification made by the system (from Granola processing). View via: 🎛️ CCAT System → 📅 Timelines → 📋 View Timeline Change Log');
  addBlank();
  addDivider();
  addBlank();


  // ── SPRINT MANAGEMENT ─────────────────────────────────────────────────────
  addSection('⏱️  Sprint Management');

  addSubSection('Launching a New Sprint');
  addLine('Menu: 🎛️ CCAT System → 🔄 New Sprint (Rollover & Push)');
  addLine('1. You\'ll be prompted for the new sprint dates and intent');
  addLine('2. The system archives satellite tracker snapshots (saved to 📚 Satellite Tracker Archive)');
  addLine('3. Current sprint sheet is renamed and hidden');
  addLine('4. New sprint sheet is created from the Sprint Template');
  addLine('5. Sprint Planning tab (B4–B6) is updated');
  addLine('6. All check-in tabs in Home Base are updated with the new sprint info');
  addLine('7. All satellites are pushed: new sprint header + carried-over incomplete action items (marked ⏳ [Carried Over])');
  addLine('8. Archives are synced to all satellite workbooks');
  addLine('9. You\'re offered to generate the Sprint Deck immediately');
  addBlank();

  addSubSection('Carryover Logic');
  addLine('Incomplete action items (any status that is not "Complete", "Done", or "Completed") are automatically carried forward into the new sprint, marked with ⏳ [Carried Over] and status set to "Carried Over". Completed items are archived and do not carry over.');
  addBlank();
  addDivider();
  addBlank();


  // ── MEETING NOTES (GRANOLA) ───────────────────────────────────────────────
  addSection('📝  Meeting Notes (Granola)');
  addLine('CCAT OS uses Claude AI to extract structured data from Granola meeting transcripts. There are two entry points:');
  addBlank();
  addLine('① Process Notes → RACI Draft  (new, recommended)');
  addLine('   Menu: 🎛️ CCAT System → 📋 RACI & Trackers → 📝 Process Notes → RACI Draft');
  addLine('   Action items → Master RACI as [DRAFT]  |  Milestones → Milestone Staging');
  addLine('   Nothing is pushed to any satellite until you validate and run the push step.');
  addBlank();
  addLine('② Process Granola Notes for Satellite  (legacy, direct push)');
  addLine('   Menu: 🎛️ CCAT System → 📝 Meeting Notes → 📥 Process Granola Notes for Satellite');
  addLine('   Extracts action items and writes them directly to the satellite check-in tab, then refreshes Master RACI. Skips the RACI validation step. Useful for quick single-satellite updates.');
  addBlank();
  addLine('Calendar Sync:');
  addLine('   Menu: 🎛️ CCAT System → 📝 Meeting Notes → 🔄 Sync Meeting Log from Calendar');
  addLine('   Pulls CCAT-related calendar events (last 30 days / next 30 days) into the 📝 Meeting Log tab. Detects satellite from event title keywords. Links to Granola notes if found in event description.');
  addBlank();
  addDivider();
  addBlank();


  // ── SPRINT DECK ───────────────────────────────────────────────────────────
  addSection('📊  Sprint Deck');
  addLine('The Sprint Deck is a Google Slides presentation generated from live data. It uses the same URL every sprint — the previous deck is archived as a copy before rebuilding.');
  addBlank();
  addLine('Generating the deck:');
  addLine('   Menu: 🎛️ CCAT System → 📊 Sprint Deck → 🎬 Generate Sprint Deck (Google Slides)');
  addLine('   A 4-step wizard walks you through:');
  addLine('     Step 1: Milestones achieved — pre-checked from Full Year Timeline + completed RACI items');
  addLine('     Step 2: What\'s next — priorities for the upcoming sprint');
  addLine('     Step 3: Communications & risks — key messages and blockers');
  addLine('     Step 4: Review & generate — lists all slides to be created');
  addBlank();
  addLine('Slides generated:');
  addLine('   1. Title slide  2. Sprint intent + OKR velocity  3. Milestones achieved  4. Sprint priorities');
  addLine('   5. Communications & risks  6. Next 6 Sprints table  7. Full Year Timeline table  8. Looking Ahead (quarter summary)');
  addBlank();
  addLine('Controlling what appears in the deck:');
  addLine('   • In Master RACI: check the 📊 column (col C) to include an action item');
  addLine('   • In Full Year Timeline: check the 📊 column (col B) to include a milestone');
  addLine('   • In Next 6 Sprints: check the 📊 column (col B) to include a sprint item');
  addLine('   • If NO items are flagged, all items appear. If ANY are flagged, only flagged items appear.');
  addBlank();
  addLine('Other options:');
  addLine('   📊 Generate Sprint Deck Data (Sheet)  — creates a 📊 Sprint Deck Data tab for manual embedding in Slides');
  addLine('   📧 Send Sprint Summary Email  — emails a status summary to your configured notification address');
  addBlank();
  addDivider();
  addBlank();


  // ── COMMUNICATION ─────────────────────────────────────────────────────────
  addSection('📧  Communication');
  addLine('After processing Granola notes, the system stores the last meeting\'s satellite, participants, and summary.');
  addLine('Menu: 🎛️ CCAT System → 📧 Communication → 📧 Send Meeting Summary to Participants');
  addLine('• Sends an email to all participants with the summary, decisions, action items, and a link to their satellite workbook');
  addLine('• Only works after running "Process Granola Notes for Satellite" (the legacy path stores participants)');
  addLine('• For the new Process Notes → RACI Draft path, participants are not collected yet — add this manually in a future update');
  addBlank();
  addLine('Update your notification email: 🎛️ CCAT System → 📧 Communication → 📝 Update Config Email');
  addBlank();
  addDivider();
  addBlank();


  // ── SATELLITES ────────────────────────────────────────────────────────────
  addSection('📡  Satellite Workbooks');
  addLine('Each satellite is a separate Google Spreadsheet. The URL never changes — reformatting and rollover preserve the same ID.');
  addBlank();
  addLine('Current satellites:');
  addLine('  🎛️ Production  — Richard Lonsdorf');
  addLine('  🎨 Curator  — Lumi Tan');
  addLine('  👥 Internal Stakeholders  — All Directors');
  addLine('  📈 Advancement  — Katie');
  addLine('  👔 ED  — maryclarebrzytwa');
  addLine('  🎬 Director ML  — TBD');
  addLine('  🖥️ Director MI  — TBD');
  addLine('  🔧 Technical Director  — TBD');
  addLine('  🎯 OKRs  — Read-only view (push only, no stakeholder edits)');
  addBlank();
  addLine('Each Check-In satellite has these sections (in order):');
  addLine('  Row 1–5: Sprint header (synced from master — read only)');
  addLine('  Meeting Outcomes: what must be true when the meeting ends');
  addLine('  Agenda: Topic | Owner | Prep/Notes | Link | Priority');
  addLine('  Decisions: Decision | Owner | Impact | Follow-up | Link');
  addLine('  Action Items: Task | Owner | Due Date | Status | Link | Satellite Source');
  addLine('  RACI: Role | Responsible | Accountable | Consulted | Informed');
  addLine('  Parking Lot: Item | Owner | Notes | Link');
  addLine('  📚 Sprint Archives tab: read-only archive of previous sprint data');
  addBlank();
  addLine('Opening a satellite: 📡 Satellites menu → select the satellite name');
  addLine('Viewing all satellite links: 📑 Sheets → ⚙️ Satellite Config');
  addBlank();
  addLine('Reformatting existing satellites to v2 layout (preserves URL):');
  addLine('  Menu: 🎛️ CCAT System → ⚙️ Setup → 🔄 Reformat Existing Satellites to v2');
  addBlank();
  addLine('Adding a new satellite:');
  addLine('  1. In the script editor, add an entry to CONFIG.checkIns');
  addLine('  2. Set: name, activeSheet, title, type: "checkin", owner, preserveLink: false');
  addLine('  3. Run: 🎛️ CCAT System → ⚙️ Setup → 🚀 Initial Setup');
  addBlank();
  addDivider();
  addBlank();


  // ── ARCHIVES ──────────────────────────────────────────────────────────────
  addSection('🗄️  Archives');
  addLine('📅 Sprint Archives  — Sprint sheets are renamed and hidden during rollover. View them via 🎛️ CCAT System → 🗄️ Archives → 📅 View Archived Sprints.');
  addBlank();
  addLine('📚 Satellite Tracker Archive  — A snapshot of every satellite\'s action items, decisions, and agenda is taken before each sprint rollover. Stored in the "📚 Satellite Tracker Archive" tab in Home Base, and also synced to each satellite\'s "📚 Sprint Archives" tab.');
  addLine('  View: 🎛️ CCAT System → 🗄️ Archives → 📋 View Satellite Tracker Archive  (filterable by sprint or satellite)');
  addLine('  Push to satellites: 🎛️ CCAT System → 🗄️ Archives → 📚 Push Archives to Satellites');
  addBlank();
  addLine('📊 Generate Archive Report  — Creates a sprint timeline summary sheet: 🎛️ CCAT System → 🗄️ Archives → 📊 Generate Archive Report');
  addBlank();
  addDivider();
  addBlank();


  // ── OKRs ──────────────────────────────────────────────────────────────────
  addSection('🎯  OKRs');
  addLine('The OKR tab ("🎯 Objectives and Key Results") is managed manually by the ED. The system does not auto-populate it from meeting notes.');
  addLine('OKR columns used by the system: Type (A), Description (B), Priority (P), Planning Assumption (Q), Status (R), Confidence (S), Fixed Deadline (T), Category (U), Dependencies (Z).');
  addLine('Status options: Not Started / In Progress / Complete / Blocked');
  addLine('Priority options: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)');
  addLine('Planning Assumption: which quarter(s) this OKR spans (Q1–Q4 or combinations)');
  addBlank();
  addLine('OKR Satellite (read-only):');
  addLine('  The OKR tab is pushed to a read-only satellite workbook. Stakeholders can view but not edit.');
  addLine('  Sync: 🎛️ CCAT System → 🎯 Sync OKR Satellite Only');
  addBlank();
  addLine('OKR data feeds into: Sprint Deck (velocity / status slides), Sprint Deck Data sheet, generateSprintDeckData function.');
  addBlank();
  addDivider();
  addBlank();


  // ── AUTOMATION TRIGGERS ───────────────────────────────────────────────────
  addSection('⚙️  Automation Triggers');
  addLine('Sprint-relative due date conversion:');
  addLine('  Satellite Action Items support "This Sprint", "Next Sprint", etc. in the Due Date column. A trigger converts these to real dates (2nd Thursday of the target sprint) every 5 minutes.');
  addLine('  Enable: 🎛️ CCAT System → ⚙️ Setup → ⏱️ Enable Auto Due-Date Conversion');
  addLine('  Disable: 🎛️ CCAT System → ⚙️ Setup → ❌ Disable Auto Due-Date Conversion');
  addBlank();
  addLine('RACI multi-select (satellites):');
  addLine('  Because Home Base\'s onEdit trigger can\'t fire on satellite edits, the same 5-minute trigger also handles RACI appending. If a stakeholder picks a name from the dropdown, it appends to the existing comma-separated value instead of replacing it.');
  addBlank();
  addLine('Hourly satellite sync (optional):');
  addLine('  You can set up an hourly trigger that runs "Sync All Satellites → Master" automatically.');
  addLine('  Enable: in the script editor, run createHourlySyncTrigger()');
  addLine('  Disable: run removeHourlySyncTrigger()');
  addBlank();
  addDivider();
  addBlank();


  // ── QUICK REFERENCE ───────────────────────────────────────────────────────
  addSection('⚡  Quick Reference — Common Tasks');
  addLine('Process meeting notes (new workflow): RACI & Trackers → 📝 Process Notes → RACI Draft');
  addLine('Push RACI to satellites:             RACI & Trackers → 📤 Push RACI → All Satellites');
  addLine('Pull satellite statuses back:         RACI & Trackers → 🔄 Sync Satellite Statuses → RACI');
  addLine('Push milestones to timelines:         RACI & Trackers → 🚀 Push Approved Milestones');
  addLine('Start a new sprint:                   🔄 New Sprint (Rollover & Push)');
  addLine('Generate sprint deck:                 Sprint Deck → 🎬 Generate Sprint Deck (Google Slides)');
  addLine('Refresh a timeline:                   Timelines → 🔄 Refresh [timeline name]');
  addLine('Open a satellite:                     📡 Satellites → [satellite name]');
  addLine('View satellite tracker archive:       Archives → 📋 View Satellite Tracker Archive');
  addLine('Sync OKR satellite:                   🎯 Sync OKR Satellite Only');
  addLine('Reformat satellites to v2:            Setup → 🔄 Reformat Existing Satellites to v2');
  addLine('Fix check-in sprint headers:          Setup → 🔧 Fix Formula References');
  addBlank();

  // Format
  sheet.setColumnWidth(1, 950);
  for (let c = 2; c <= 6; c++) sheet.setColumnWidth(c, 5);
  sheet.setFrozenRows(1);

  return sheet;
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
    'Advancement': ['advancement', 'katie'],
    'ED': ['ed check-in', 'executive director', 'maryclarebrzytwa'],
    'Director ML': ['director ml', 'machine learning'],
    'Director MI': ['director mi', 'moving image'],
    'Technical Director': ['technical director', 'tech director'],
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
    const checkIn = CONFIG.checkIns.find(c => c.name === satellite || c.legacyName === satellite);
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
// TIMELINE CHANGE LOG & AUTO-UPDATE FROM MEETINGS
// ============================================================================

/**
 * Creates the Timeline Change Log sheet for tracking all timeline modifications.
 */
function createTimelineChangeLogSheet_(ss) {
  if (ss.getSheetByName(CONFIG.sheets.timelineChangeLog)) return;

  const sheet = ss.insertSheet(CONFIG.sheets.timelineChangeLog);
  const headers = ['Date', 'Source Meeting', 'Change Type', 'Milestone', 'Previous Date', 'New Date', 'Is TBD', 'Category', 'Owner', 'Details', 'Changed By'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');

  sheet.setColumnWidth(1, 110);
  sheet.setColumnWidth(2, 170);
  sheet.setColumnWidth(3, 90);
  sheet.setColumnWidth(4, 280);
  sheet.setColumnWidth(5, 110);
  sheet.setColumnWidth(6, 110);
  sheet.setColumnWidth(7, 60);
  sheet.setColumnWidth(8, 110);
  sheet.setColumnWidth(9, 130);
  sheet.setColumnWidth(10, 350);
  sheet.setColumnWidth(11, 100);
  sheet.setFrozenRows(1);
}


/**
 * Processes timeline updates extracted from a meeting by Claude.
 * Compares against existing Full Year Timeline entries,
 * updates both timelines, and logs all changes.
 *
 * @param {Spreadsheet} ss - Active spreadsheet
 * @param {Array} timelineUpdates - Array from Claude: [{milestone, date, isTBD, category, owner, changeType, details}]
 * @param {string} sourceMeeting - Which satellite meeting this came from
 * @returns {number} Number of changes processed
 */
function updateTimelinesFromMeeting_(ss, timelineUpdates, sourceMeeting) {
  // Ensure change log exists
  createTimelineChangeLogSheet_(ss);
  const logSheet = ss.getSheetByName(CONFIG.sheets.timelineChangeLog);

  // Read existing Full Year Timeline to find matches
  const fullYearSheet = ss.getSheetByName(CONFIG.sheets.fullYearTimeline);
  let existingMilestones = [];
  if (fullYearSheet) {
    const data = fullYearSheet.getDataRange().getValues();
    for (let r = 6; r < data.length; r++) {
      if (data[r][0] && String(data[r][0]).trim() && !String(data[r][0]).startsWith('👥') &&
          !String(data[r][0]).startsWith('💰') && !String(data[r][0]).startsWith('🏗') &&
          !String(data[r][0]).startsWith('🎪') && !String(data[r][0]).startsWith('🎨') &&
          !String(data[r][0]).startsWith('📣') && !String(data[r][0]).startsWith('🎓')) {
        // Find which month column has a marker (months start at col D = index 3)
        let markerCol = -1;
        for (let c = 3; c < data[r].length; c++) {
          if (data[r][c] && String(data[r][c]).trim()) {
            markerCol = c;
            break;
          }
        }
        existingMilestones.push({
          row: r + 1,
          label: String(data[r][0]).trim(),
          markerCol: markerCol,
        });
      }
    }
  }

  const months = [
    'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026',
    'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026',
    'Nov 2026', 'Dec 2026', 'Jan 2027', 'Feb 2027',
    'Mar 2027', 'Apr 2027', 'May 2027', 'Jun 2027'
  ];

  const changeLogColors = {
    'new': '#C8E6C9',
    'moved': '#FFF9C4',
    'completed': '#BBDEFB',
    'cancelled': '#FFCDD2'
  };

  let changesProcessed = 0;
  const dateNow = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

  timelineUpdates.forEach(update => {
    if (!update.milestone) return;

    // Parse the target date to find which month column
    let targetMonthIndex = -1;
    let dateStr = update.date || '';
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        const monthStr = parsed.toLocaleString('default', { month: 'short' }) + ' ' + parsed.getFullYear();
        targetMonthIndex = months.findIndex(m => m === monthStr);
      }
    }

    // Try to find an existing milestone that matches (fuzzy match on label)
    const updateLabelClean = update.milestone.toLowerCase().replace(/[⏳✅🎯🎪📣🏛️]/g, '').trim();
    let matched = existingMilestones.find(em => {
      const existingClean = em.label.toLowerCase().replace(/[⏳✅🎯🎪📣🏛️]/g, '').trim();
      // Check for substantial overlap
      return existingClean.includes(updateLabelClean) || updateLabelClean.includes(existingClean) ||
        levenshteinSimilarity_(existingClean, updateLabelClean) > 0.6;
    });

    let previousDate = '';
    let changeType = update.changeType || 'new';

    if (matched && matched.markerCol >= 0) {
      // Existing milestone found — get its current month
      previousDate = months[matched.markerCol - 1] || '';

      if (changeType === 'moved' || (targetMonthIndex >= 0 && matched.markerCol - 1 !== targetMonthIndex)) {
        changeType = 'moved';
        // Update the Full Year Timeline: clear old marker, place new one
        if (fullYearSheet) {
          fullYearSheet.getRange(matched.row, matched.markerCol + 1).clear();
          if (targetMonthIndex >= 0) {
            const isTBD = update.isTBD !== false;
            const marker = isTBD ? '⏳' : '🎯';
            const bgColor = isTBD ? '#F3E5F5' : '#E3F2FD';
            fullYearSheet.getRange(matched.row, targetMonthIndex + 2).setValue(marker)
              .setHorizontalAlignment('center').setFontSize(12).setBackground(bgColor);
            // Update label if it gained/lost TBD
            const currentLabel = fullYearSheet.getRange(matched.row, 1).getValue();
            if (isTBD && !String(currentLabel).startsWith('⏳')) {
              fullYearSheet.getRange(matched.row, 1).setValue('⏳ ' + currentLabel).setFontColor('#9C27B0');
            } else if (!isTBD && String(currentLabel).startsWith('⏳')) {
              fullYearSheet.getRange(matched.row, 1).setValue(String(currentLabel).replace(/^⏳\s*/, '')).setFontColor(null);
            }
          }
        }
      } else if (changeType === 'completed') {
        if (fullYearSheet) {
          fullYearSheet.getRange(matched.row, 1).setFontColor('#4CAF50');
          if (matched.markerCol >= 0) {
            fullYearSheet.getRange(matched.row, matched.markerCol + 1).setValue('✅')
              .setBackground('#C8E6C9');
          }
        }
      }
    } else if (changeType === 'new' && targetMonthIndex >= 0 && fullYearSheet) {
      // New milestone — find the right section and add it
      addMilestoneToFullYear_(fullYearSheet, update, targetMonthIndex, months);
    }

    // Log the change
    const newDate = targetMonthIndex >= 0 ? months[targetMonthIndex] + (dateStr ? ' (' + dateStr + ')' : '') : dateStr;
    logSheet.appendRow([
      dateNow,
      sourceMeeting + ' Check-In',
      changeType,
      update.milestone,
      previousDate,
      newDate,
      update.isTBD ? 'Yes' : 'No',
      update.category || '',
      update.owner || '',
      update.details || '',
      'Auto (Granola)'
    ]);

    // Color the change type cell
    const lastRow = logSheet.getLastRow();
    const color = changeLogColors[changeType] || '#F5F5F5';
    logSheet.getRange(lastRow, 3).setBackground(color);

    changesProcessed++;
  });

  // Update the timestamp on Full Year Timeline
  if (fullYearSheet) {
    fullYearSheet.getRange('A2').setValue('Last updated: ' + new Date().toLocaleString() + '  |  ⏳ = Date is TBD  |  Auto-updated from ' + sourceMeeting + ' meeting');
  }

  return changesProcessed;
}


/**
 * Adds a new milestone row to the Full Year Timeline in the appropriate category section.
 */
function addMilestoneToFullYear_(sheet, update, monthIndex, months) {
  const categoryMap = {
    'Hiring': '👥 Hiring',
    'Budget': '💰 Budget',
    'Building': '🏗️ Building',
    'Events': '🎪 Events',
    'Curation': '🎨 Curation',
    'Communications': '📣 Reporting',
    'Academic': '🎓 Academic',
  };

  const targetSection = categoryMap[update.category] || '';
  const data = sheet.getDataRange().getValues();

  // Find the section and its last item row
  let insertRow = -1;
  let inSection = false;
  for (let r = 6; r < data.length; r++) {
    const cellVal = String(data[r][0] || '').trim();
    if (targetSection && cellVal.includes(targetSection)) {
      inSection = true;
      continue;
    }
    if (inSection) {
      // Check if we've hit the next section header (dark background) or empty spacer
      if (cellVal === '' || (cellVal.startsWith('👥') || cellVal.startsWith('💰') || cellVal.startsWith('🏗') ||
          cellVal.startsWith('🎪') || cellVal.startsWith('🎨') || cellVal.startsWith('📣') || cellVal.startsWith('🎓'))) {
        insertRow = r + 1; // Insert before the spacer/next section
        break;
      }
    }
  }

  // If we didn't find a section, append at the bottom
  if (insertRow < 0) {
    insertRow = sheet.getLastRow() + 1;
  }

  // Insert a new row
  sheet.insertRowBefore(insertRow);

  const isTBD = update.isTBD !== false;
  const label = (isTBD ? '⏳ ' : '') + update.milestone;
  sheet.getRange(insertRow, 1).setValue(label);
  if (isTBD) {
    sheet.getRange(insertRow, 1).setFontColor('#9C27B0');
  }

  const marker = isTBD ? '⏳' : '🎯';
  const bgColor = isTBD ? '#F3E5F5' : '#E3F2FD';
  sheet.getRange(insertRow, monthIndex + 2).setValue(marker)
    .setHorizontalAlignment('center').setFontSize(12).setBackground(bgColor);
}


/**
 * Simple Levenshtein-based similarity score (0 to 1) for fuzzy milestone matching.
 */
function levenshteinSimilarity_(s1, s2) {
  if (s1 === s2) return 1;
  const len1 = s1.length, len2 = s2.length;
  if (!len1 || !len2) return 0;

  const matrix = [];
  for (let i = 0; i <= len1; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= len2; j++) { matrix[0][j] = j; }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return 1 - (matrix[len1][len2] / maxLen);
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
  deckSheet.getRange(currentRow, 1).setValue('FULL YEAR TIMELINE SNAPSHOT');
  deckSheet.getRange(currentRow, 1, 1, 5).setBackground('#C9A227').setFontColor('#000000').setFontWeight('bold');
  currentRow++;

  const timelineSheet = ss.getSheetByName(CONFIG.sheets.fullYearTimeline);
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
    deckSheet.getRange(currentRow, 1).setValue('Timeline not created yet. Run Setup → Setup Timelines.');
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
      
      const status = String(row[5] || '');  // Col F = Status (shifted for 📊 Deck col)
      if (status.toLowerCase() === 'complete') continue;

      deckSheet.getRange(currentRow, 1, 1, 5).setValues([[
        row[1], // Task
        row[3], // Owner (shifted)
        row[4], // Due (shifted)
        row[5], // Status (shifted)
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
  
  const checkIn = CONFIG.checkIns.find(c => c.name === lastSatellite || c.legacyName === lastSatellite);
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
    
    // Archive using dynamic section boundaries
    const archBounds = getSectionBoundaries_(sheet);

    // Archive agenda items
    const agendaData = archBounds.agenda ? readSectionData_(sheet, archBounds.agenda) : [];
    agendaData.forEach(row => {
      if (row[0] && String(row[0]).trim()) {
        archiveSheet.appendRow([sprintName, checkIn.name, 'Agenda', row[0], row[1], '', today]);
      }
    });

    // Archive decisions
    const decisions = archBounds.decisions ? readSectionData_(sheet, archBounds.decisions) : [];
    decisions.forEach(row => {
      if (row[0] && String(row[0]).trim()) {
        archiveSheet.appendRow([sprintName, checkIn.name, 'Decision', row[0], row[1], row[2], today]);
      }
    });

    // Archive action items
    const actions = archBounds.actions ? readSectionData_(sheet, archBounds.actions) : [];
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

/**
 * Opens a satellite workbook by check-in name and returns its Check-In sheet.
 * Looks up the spreadsheet ID from the Satellite Config tab.
 * Returns null if not found.
 */
function getSatelliteCheckInSheet_(checkInName) {
  const satellites = getSatelliteIds_();
  const match = satellites.find(s => s.name === checkInName);
  if (!match) return null;
  try {
    const satellite = SpreadsheetApp.openById(match.id);
    return satellite.getSheetByName('Check-In') || null;
  } catch (err) {
    console.error('Could not open satellite "' + checkInName + '": ' + err.message);
    return null;
  }
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
    '<div class="box system"><div class="emoji">📅</div><h3>Full Year Timeline</h3><p>Milestone View</p></div>' +
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
    '<div class="box timeline"><div class="emoji">🎯</div><h3>OKR Satellite</h3><p>Read-Only View</p><span class="sync-indicator sync-push">← Push Only</span></div>' +
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


// ============================================================================
// SPRINT DECK WIZARD — Google Slides Generation
// ============================================================================

/**
 * Launches the Sprint Deck Wizard — a multi-step dialog that collects user
 * input (milestones achieved, what's next, communications) and then generates
 * a Google Slides presentation.
 *
 * The deck is created/updated at the same URL every sprint. Before rebuilding,
 * a timestamped copy is archived.
 */
function launchSprintDeckWizard() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sprintInfo = getCurrentSprintInfo_(ss);

  // Gather pre-populated data for the dialog
  const milestonesSuggested = gatherPlannedMilestones_(ss);
  const actionSummary = gatherActionSummary_(ss);

  const html = buildSprintDeckWizardHtml_(sprintInfo, milestonesSuggested, actionSummary);
  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(720).setHeight(700);
  ui.showModalDialog(htmlOutput, '🎬 Sprint Deck Wizard — ' + sprintInfo.name);
}


/**
 * Gathers planned milestones from the Full Year Timeline that fall in the
 * current sprint's date range. These become the "did we achieve this?" prompts.
 */
function gatherPlannedMilestones_(ss) {
  const milestones = [];
  const sprintInfo = getCurrentSprintInfo_(ss);

  // Get milestones from Full Year Timeline
  // New columns: [0]=Category, [1]=📊 Deck, [2]=Status, [3+]=months
  const fytSheet = ss.getSheetByName(CONFIG.sheets.fullYearTimeline);
  if (fytSheet) {
    const data = fytSheet.getDataRange().getValues();
    let currentCat = '';
    for (let r = 6; r < data.length; r++) {
      const label = String(data[r][0] || '').trim();
      const status = String(data[r][2] || '').trim();  // Col C = Status
      if (!label) continue;

      // Category headers have no status and no markers
      if (!status && !data[r].slice(3).some(c => String(c).trim() !== '')) {
        if (/^[^\w\s]/.test(label) && label.length > 2) {
          currentCat = label;
          continue;
        }
      }

      // Check for markers in month columns (now start at index 3)
      for (let c = 3; c < data[r].length; c++) {
        const val = String(data[r][c]).trim();
        if (val && val !== '') {
          milestones.push({
            label: label,
            category: currentCat,
            status: status,
            marker: val,
            inDeck: data[r][1] === true  // Col B = 📊 Deck flag
          });
          break;
        }
      }
    }
  }

  // Also get completed action items from this sprint's RACI
  // New columns: [0]=Satellite, [1]=Task, [2]=📊 Deck, [3]=Owner, [4]=Due, [5]=Status
  const raciSheet = ss.getSheetByName(CONFIG.sheets.masterRaci);
  if (raciSheet) {
    const raciData = raciSheet.getDataRange().getValues();
    for (let r = 1; r < raciData.length; r++) {
      const task = String(raciData[r][1] || '').trim();
      const statusVal = String(raciData[r][5] || '').toLowerCase();  // Col F = Status
      if (task && (statusVal === 'complete' || statusVal === 'done')) {
        milestones.push({
          label: task,
          category: '📋 Completed Action Items',
          status: 'Complete',
          marker: '✅',
          inDeck: raciData[r][2] === true  // Col C = 📊 Deck flag
        });
      }
    }
  }

  return milestones;
}


/**
 * Gathers action item summary by satellite for the deck.
 */
function gatherActionSummary_(ss) {
  const summary = [];
  CONFIG.checkIns.forEach(checkIn => {
    if (checkIn.type === 'okr') return;
    const sheet = ss.getSheetByName(checkIn.activeSheet);
    if (!sheet) return;

    const bounds = getSectionBoundaries_(sheet);
    if (!bounds.actions) return;

    const actions = readSectionData_(sheet, bounds.actions);
    let total = 0, complete = 0, inProgress = 0, blocked = 0;
    actions.forEach(row => {
      if (!row[0] || String(row[0]).trim() === '') return;
      total++;
      const s = String(row[3] || '').toLowerCase();
      if (s === 'complete' || s === 'done') complete++;
      else if (s === 'in progress') inProgress++;
      else if (s === 'blocked') blocked++;
    });
    if (total > 0) {
      summary.push({ name: checkIn.name, owner: checkIn.owner, total: total, complete: complete, inProgress: inProgress, blocked: blocked });
    }
  });
  return summary;
}


/**
 * Builds the multi-step wizard HTML dialog.
 */
function buildSprintDeckWizardHtml_(sprintInfo, milestones, actionSummary) {
  // Build milestone checkboxes grouped by category
  const categories = {};
  milestones.forEach(m => {
    const cat = m.category || 'Other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(m);
  });

  let milestonesHtml = '';
  for (const [cat, items] of Object.entries(categories)) {
    milestonesHtml += '<div class="cat-label">' + cat + '</div>';
    items.forEach((item, i) => {
      const checked = item.status === 'Complete' ? ' checked' : '';
      const id = 'ms_' + cat.replace(/[^a-zA-Z0-9]/g, '') + '_' + i;
      milestonesHtml += '<label class="cb-label"><input type="checkbox" id="' + id + '" value="' +
        item.label.replace(/"/g, '&quot;') + '"' + checked + '> ' + item.label + '</label>';
    });
  }

  let summaryHtml = '';
  actionSummary.forEach(s => {
    summaryHtml += '<tr><td>' + s.name + '</td><td>' + s.total + '</td><td>' + s.complete + '</td><td>' + s.inProgress + '</td><td>' + s.blocked + '</td></tr>';
  });

  return '<!DOCTYPE html><html><head><style>' +
    'body { font-family: "Google Sans", Arial, sans-serif; padding: 0; margin: 0; font-size: 13px; }' +
    '.step { display: none; padding: 16px; }' +
    '.step.active { display: block; }' +
    'h2 { font-size: 16px; margin: 0 0 12px 0; color: #1a73e8; }' +
    'h3 { font-size: 14px; margin: 8px 0 6px 0; }' +
    '.cat-label { font-weight: bold; margin: 10px 0 4px 0; color: #333; font-size: 12px; }' +
    '.cb-label { display: block; margin: 2px 0; padding: 3px 0; font-size: 12px; }' +
    '.cb-label:hover { background: #f0f4ff; }' +
    'textarea { width: 100%; height: 100px; margin: 6px 0; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; font-size: 12px; box-sizing: border-box; }' +
    'input[type="text"] { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin: 6px 0; box-sizing: border-box; }' +
    '.btn-row { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #eee; background: #fafafa; position: sticky; bottom: 0; }' +
    '.btn { padding: 8px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; }' +
    '.btn-primary { background: #1a73e8; color: white; }' +
    '.btn-primary:hover { background: #1557b0; }' +
    '.btn-secondary { background: #e8eaed; color: #333; }' +
    '.btn-secondary:hover { background: #d2d5d9; }' +
    '.ms-list { max-height: 200px; overflow-y: auto; border: 1px solid #eee; padding: 8px; border-radius: 4px; }' +
    '.progress { display: flex; gap: 4px; padding: 10px 16px; background: #f8f9fa; border-bottom: 1px solid #eee; }' +
    '.dot { width: 10px; height: 10px; border-radius: 50%; background: #ddd; }' +
    '.dot.active { background: #1a73e8; }' +
    '.dot.done { background: #0f9d58; }' +
    'table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 8px 0; }' +
    'th, td { padding: 4px 8px; border: 1px solid #ddd; text-align: left; }' +
    'th { background: #e8eaed; font-weight: bold; }' +
    '.hint { color: #666; font-size: 11px; margin: 2px 0 8px 0; }' +
    '</style></head><body>' +

    // Progress dots
    '<div class="progress">' +
    '<div class="dot active" id="dot0"></div>' +
    '<div class="dot" id="dot1"></div>' +
    '<div class="dot" id="dot2"></div>' +
    '<div class="dot" id="dot3"></div>' +
    '</div>' +

    // STEP 0: Milestones Achieved
    '<div class="step active" id="step0">' +
    '<h2>Step 1: Milestones Achieved This Sprint</h2>' +
    '<p class="hint">Check off milestones completed during ' + sprintInfo.name + '. Add any unlisted achievements below.</p>' +
    '<div class="ms-list">' + (milestonesHtml || '<p style="color:#999">No milestones found for this period.</p>') + '</div>' +
    '<h3>Additional achievements (one per line):</h3>' +
    '<textarea id="extraMilestones" placeholder="e.g., Secured keynote speaker for fall event\nCompleted BB6 equipment procurement"></textarea>' +
    '</div>' +

    // STEP 1: What's Next
    '<div class="step" id="step1">' +
    '<h2>Step 2: What\'s Next</h2>' +
    '<p class="hint">Key priorities and focus areas for the upcoming sprint.</p>' +
    '<textarea id="whatsNext" style="height:150px" placeholder="e.g.,\n- Finalize JD postings and open search\n- Complete budget deep-dive with Chanel\n- Prepare for Yana presentation (Mar 27)"></textarea>' +
    '<h3>Current Action Item Summary:</h3>' +
    '<table><tr><th>Satellite</th><th>Total</th><th>Done</th><th>Active</th><th>Blocked</th></tr>' +
    summaryHtml +
    '</table>' +
    '</div>' +

    // STEP 2: Communications
    '<div class="step" id="step2">' +
    '<h2>Step 3: Communications & Updates</h2>' +
    '<p class="hint">Key messages, announcements, or stakeholder communications.</p>' +
    '<textarea id="communications" style="height:120px" placeholder="e.g.,\n- Email sent to Provost with tech assessment findings\n- Yana briefed on hiring timeline\n- Katie aligned on advancement budget ask"></textarea>' +
    '<h3>Risks / Blockers:</h3>' +
    '<textarea id="risks" style="height:80px" placeholder="e.g.,\n- BB6 construction timeline at risk if permits delayed\n- Director ML search may need extended window"></textarea>' +
    '</div>' +

    // STEP 3: Confirm & Generate
    '<div class="step" id="step3">' +
    '<h2>Step 4: Review & Generate Deck</h2>' +
    '<p>The deck will include these slides:</p>' +
    '<ol style="font-size:12px; line-height:1.8">' +
    '<li><strong>Title Slide</strong> — ' + sprintInfo.name + ' (' + sprintInfo.dates + ')</li>' +
    '<li><strong>Sprint Intent & OKR Status</strong></li>' +
    '<li><strong>Milestones Achieved</strong> — your selections from Step 1</li>' +
    '<li><strong>What\'s Next</strong> — your input from Step 2</li>' +
    '<li><strong>Communications & Risks</strong> — Step 3 input</li>' +
    '<li><strong>Action Items by Satellite</strong></li>' +
    '<li><strong>Next 6 Sprints Timeline</strong></li>' +
    '<li><strong>Full Year Timeline</strong></li>' +
    '</ol>' +
    '<p class="hint">The existing deck will be archived as a copy before rebuilding. The URL stays the same.</p>' +
    '<div id="genStatus" style="display:none; padding: 12px; background: #e8f5e9; border-radius: 4px; margin-top: 8px; font-weight: bold;"></div>' +
    '</div>' +

    // Navigation buttons
    '<div class="btn-row">' +
    '<button class="btn btn-secondary" id="btnBack" onclick="prevStep()" style="display:none">Back</button>' +
    '<div style="flex:1"></div>' +
    '<button class="btn btn-primary" id="btnNext" onclick="nextStep()">Next →</button>' +
    '</div>' +

    '<script>' +
    'var currentStep = 0;' +
    'var totalSteps = 4;' +

    'function updateUI() {' +
    '  for (var i = 0; i < totalSteps; i++) {' +
    '    document.getElementById("step" + i).className = i === currentStep ? "step active" : "step";' +
    '    var dot = document.getElementById("dot" + i);' +
    '    dot.className = i < currentStep ? "dot done" : (i === currentStep ? "dot active" : "dot");' +
    '  }' +
    '  document.getElementById("btnBack").style.display = currentStep > 0 ? "" : "none";' +
    '  if (currentStep === totalSteps - 1) {' +
    '    document.getElementById("btnNext").textContent = "🎬 Generate Deck";' +
    '  } else {' +
    '    document.getElementById("btnNext").textContent = "Next →";' +
    '  }' +
    '}' +

    'function nextStep() {' +
    '  if (currentStep < totalSteps - 1) {' +
    '    currentStep++;' +
    '    updateUI();' +
    '  } else {' +
    '    generateDeck();' +
    '  }' +
    '}' +

    'function prevStep() {' +
    '  if (currentStep > 0) { currentStep--; updateUI(); }' +
    '}' +

    'function generateDeck() {' +
    '  var btn = document.getElementById("btnNext");' +
    '  btn.disabled = true;' +
    '  btn.textContent = "Generating...";' +
    '  var status = document.getElementById("genStatus");' +
    '  status.style.display = "block";' +
    '  status.textContent = "Creating deck... this may take 30-60 seconds.";' +

    '  var achieved = [];' +
    '  var checkboxes = document.querySelectorAll(".ms-list input[type=checkbox]:checked");' +
    '  for (var i = 0; i < checkboxes.length; i++) { achieved.push(checkboxes[i].value); }' +
    '  var extra = document.getElementById("extraMilestones").value;' +
    '  if (extra.trim()) {' +
    '    extra.split("\\n").forEach(function(line) { if (line.trim()) achieved.push(line.trim()); });' +
    '  }' +

    '  var payload = {' +
    '    achieved: achieved,' +
    '    whatsNext: document.getElementById("whatsNext").value,' +
    '    communications: document.getElementById("communications").value,' +
    '    risks: document.getElementById("risks").value' +
    '  };' +

    '  google.script.run' +
    '    .withSuccessHandler(function(url) {' +
    '      status.innerHTML = "✅ Deck generated! <a href=\\"" + url + "\\" target=\\"_blank\\">Open Deck →</a>";' +
    '      btn.textContent = "Done";' +
    '    })' +
    '    .withFailureHandler(function(err) {' +
    '      status.style.background = "#fce4ec";' +
    '      status.textContent = "Error: " + err.message;' +
    '      btn.disabled = false;' +
    '      btn.textContent = "🎬 Retry";' +
    '    })' +
    '    .generateSprintDeckSlides(JSON.stringify(payload));' +
    '}' +
    '</script></body></html>';
}


/**
 * Server-side handler: generates (or regenerates) the sprint deck as Google Slides.
 * Archives the old deck as a copy, clears the original, and rebuilds all slides.
 *
 * @param {string} payloadJson - JSON with achieved, whatsNext, communications, risks
 * @returns {string} URL of the generated deck
 */
function generateSprintDeckSlides(payloadJson) {
  const payload = JSON.parse(payloadJson);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sprintInfo = getCurrentSprintInfo_(ss);
  const props = PropertiesService.getScriptProperties();

  // ---- Get or create the deck ----
  let deckId = props.getProperty('SPRINT_DECK_ID');
  let deck;

  if (deckId) {
    try {
      deck = SlidesApp.openById(deckId);

      // Archive the old deck as a copy before rebuilding
      const archiveName = 'CCAT Sprint Deck — ' + sprintInfo.name + ' (Archived ' +
        Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') + ')';
      DriveApp.getFileById(deckId).makeCopy(archiveName);

      // Clear all existing slides
      const slides = deck.getSlides();
      for (let i = slides.length - 1; i >= 0; i--) {
        slides[i].remove();
      }
    } catch (e) {
      // Deck was deleted or inaccessible — create a new one
      deckId = null;
    }
  }

  if (!deckId) {
    deck = SlidesApp.create('CCAT Sprint Deck — ' + sprintInfo.name);
    deckId = deck.getId();
    props.setProperty('SPRINT_DECK_ID', deckId);

    // Move to same folder as the spreadsheet
    try {
      const folder = DriveApp.getFileById(ss.getId()).getParents().next();
      DriveApp.getFileById(deckId).moveTo(folder);
    } catch (e) { /* fine if folder move fails */ }

    // Remove default blank slide
    const defaultSlides = deck.getSlides();
    if (defaultSlides.length > 0) defaultSlides[0].remove();
  }

  // Update deck title
  deck.setName('CCAT Sprint Deck — ' + sprintInfo.name);

  // ---- Build slides ----

  // 1. Title Slide
  buildTitleSlide_(deck, sprintInfo);

  // 2. Sprint Divider + OKR Velocity
  buildIntentOKRSlide_(deck, ss, sprintInfo);

  // 3. Milestones & OKRs Achieved
  buildMilestonesSlide_(deck, payload.achieved || [], ss);

  // 4. Sprint Priorities (What's Next)
  buildWhatsNextSlide_(deck, payload.whatsNext || '');

  // 5. Communications & Risks
  buildCommunicationsSlide_(deck, payload.communications || '', payload.risks || '');

  // 6. Next 6 Sprints Timeline (full table)
  buildNext6SprintsSlide_(deck, ss);

  // 7. Full Year Timeline (detailed table)
  buildFullYearTimelineTableSlide_(deck, ss);

  // 8. Looking Ahead (quarter summary)
  buildFullYearTimelineSlide_(deck, ss);

  return deck.getUrl();
}


// ---- CalArts Design System Constants ----
var CA = {
  darkTeal:   '#0D3B54',   // Dark teal background (title/divider slides)
  teal:       '#4DBCD0',   // Primary brand accent
  navy:       '#2B3A67',   // Navy accent (card bars, headers)
  coral:      '#C75B4A',   // Coral/red accent
  orange:     '#E8873D',   // Orange accent
  purple:     '#7B5EA7',   // Purple accent
  green:      '#3D8B6E',   // Green accent
  cardGray:   '#EFEFEF',   // Card background
  bgWhite:    '#FFFFFF',   // Content slide background
  textDark:   '#1A1A1A',   // Primary text
  textMid:    '#555555',   // Secondary text
  textLight:  '#999999',   // Tertiary text
  line:       '#4DBCD0',   // Accent line under titles
  font:       'Arial',     // CalArts uses clean sans-serif
};

// Accent colors for card top-bars, cycling through brand palette
var CA_ACCENTS = [CA.navy, CA.teal, CA.coral, CA.orange, CA.purple, CA.green];


// ---- Slide Builder Helpers ----

/**
 * Adds CalArts branding: teal "CalArts" bottom-right of every slide.
 */
function addCalArtsBranding_(slide) {
  var brand = slide.insertTextBox('CalArts', 600, 490, 100, 25);
  brand.getText().getTextStyle()
    .setFontSize(14).setBold(true).setForegroundColor(CA.teal).setFontFamily(CA.font);
  brand.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
}


/**
 * Adds the standard CalArts content-slide header:
 * bold dark title + teal accent line underneath.
 */
function addSlideHeader_(slide, title) {
  var titleBox = slide.insertTextBox(title, 50, 28, 620, 45);
  titleBox.getText().getTextStyle()
    .setFontSize(26).setBold(true).setForegroundColor(CA.textDark).setFontFamily(CA.font);

  // Teal accent line
  var line = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 50, 73, 620, 3);
  line.getFill().setSolidFill(CA.teal);
  line.getBorder().setTransparent();
}


/**
 * Creates a section divider slide (dark teal bg, numbered, title, subtitle).
 */
function buildDividerSlide_(deck, number, title, subtitle) {
  var slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CA.darkTeal);

  // Section number in teal
  if (number) {
    var numBox = slide.insertTextBox(number, 50, 140, 200, 40);
    numBox.getText().getTextStyle()
      .setFontSize(16).setItalic(true).setForegroundColor(CA.teal).setFontFamily(CA.font);
  }

  // Title
  var titleBox = slide.insertTextBox(title, 50, 185, 620, 60);
  titleBox.getText().getTextStyle()
    .setFontSize(32).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(CA.font);

  // Subtitle
  if (subtitle) {
    var subBox = slide.insertTextBox(subtitle, 50, 255, 620, 35);
    subBox.getText().getTextStyle()
      .setFontSize(13).setItalic(true).setForegroundColor(CA.teal).setFontFamily(CA.font);
  }

  addCalArtsBranding_(slide);
  return slide;
}


// ============================================================================
// SLIDE BUILDERS — CalArts Style
// ============================================================================

function buildTitleSlide_(deck, sprintInfo) {
  var slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CA.darkTeal);

  // Main title
  var title = slide.insertTextBox('CHANEL Center for\nArtists and Technology', 50, 80, 500, 90);
  title.getText().getTextStyle()
    .setFontSize(30).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(CA.font);

  // Sprint label
  var sprintLabel = slide.insertTextBox(sprintInfo.name + ' Update', 50, 185, 400, 35);
  sprintLabel.getText().getTextStyle()
    .setFontSize(16).setForegroundColor(CA.teal).setFontFamily(CA.font);

  // Teal accent line
  var line = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 50, 225, 300, 3);
  line.getFill().setSolidFill(CA.teal);
  line.getBorder().setTransparent();

  // Dates
  var dates = slide.insertTextBox(sprintInfo.dates, 50, 240, 400, 30);
  dates.getText().getTextStyle()
    .setFontSize(13).setForegroundColor('#AACDD8').setFontFamily(CA.font);

  // Intent
  if (sprintInfo.intent) {
    var intent = slide.insertTextBox('"' + sprintInfo.intent + '"', 50, 280, 500, 50);
    intent.getText().getTextStyle()
      .setFontSize(12).setItalic(true).setForegroundColor('#8BBBC9').setFontFamily(CA.font);
  }

  // Bottom info line
  var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM yyyy');
  var infoLine = slide.insertTextBox('Presentation for CHANEL Arts & Culture  ·  ' + dateStr, 50, 470, 400, 20);
  infoLine.getText().getTextStyle()
    .setFontSize(9).setForegroundColor('#7AABB8').setFontFamily(CA.font);

  addCalArtsBranding_(slide);
}


function buildIntentOKRSlide_(deck, ss, sprintInfo) {
  // Section divider first
  var sprintNum = String(sprintInfo.name || '').replace(/[^0-9]/g, '') || '1';
  buildDividerSlide_(deck, '', 'Sprint ' + sprintNum + ' — In Motion',
    sprintInfo.dates + '  ·  ' + (sprintInfo.intent || ''));

  // OKR Velocity slide
  var slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CA.bgWhite);
  addSlideHeader_(slide, 'OKR Velocity');

  // Sprint subtitle
  var sub = slide.insertTextBox(sprintInfo.name + ' Key Results Completed', 50, 85, 400, 20);
  sub.getText().getTextStyle()
    .setFontSize(10).setItalic(true).setForegroundColor(CA.teal).setFontFamily(CA.font);

  // OKR Status
  var okrSheet = ss.getSheetByName(CONFIG.sheets.okrs);
  var okrRows = [];

  if (okrSheet) {
    var data = okrSheet.getDataRange().getValues();
    var cols = CONFIG.okrColumns;
    for (var i = 3; i < data.length; i++) {
      var kr = String(data[i][cols.keyResult - 1] || '').trim();
      var status = String(data[i][cols.status - 1] || '').trim();
      var priority = String(data[i][cols.priority - 1] || '').trim();
      if (kr) {
        okrRows.push({ kr: kr, status: status, priority: priority });
      }
    }
  }

  if (okrRows.length === 0) {
    var noOkrs = slide.insertTextBox('No OKRs configured yet.', 50, 120, 620, 30);
    noOkrs.getText().getTextStyle().setFontSize(14).setForegroundColor(CA.textLight).setItalic(true).setFontFamily(CA.font);
    addCalArtsBranding_(slide);
    return;
  }

  // Display OKRs in a grid with status badges (like the screenshot)
  var yPos = 115;
  var colWidth = 310;
  var rowH = 55;
  var maxRows = 8;

  okrRows.slice(0, maxRows).forEach(function(okr, idx) {
    var col = idx % 2;
    var row = Math.floor(idx / 2);
    var x = 50 + col * (colWidth + 15);
    var y = yPos + row * (rowH + 8);

    // Card background
    var card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, colWidth, rowH);
    card.getFill().setSolidFill(CA.cardGray);
    card.getBorder().setTransparent();

    // Status badge
    var badgeColor, badgeText;
    var sl = okr.status.toLowerCase();
    if (sl === 'complete' || sl === 'done') {
      badgeColor = CA.teal; badgeText = 'COMPLETE';
    } else if (sl === 'in progress') {
      badgeColor = CA.navy; badgeText = 'IN PROGRESS';
    } else if (sl === 'blocked') {
      badgeColor = CA.coral; badgeText = 'BLOCKED';
    } else {
      badgeColor = CA.textLight; badgeText = 'NOT STARTED';
    }

    // Priority badge
    var priBadge = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + 5, y + 5, 28, 16);
    priBadge.getFill().setSolidFill(CA.navy);
    priBadge.getBorder().setTransparent();
    priBadge.getText().setText(okr.priority || 'P2');
    priBadge.getText().getTextStyle().setFontSize(7).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(CA.font);
    priBadge.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Status badge
    var statusBadge = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + 38, y + 5, 65, 16);
    statusBadge.getFill().setSolidFill(badgeColor);
    statusBadge.getBorder().setTransparent();
    statusBadge.getText().setText(badgeText);
    statusBadge.getText().getTextStyle().setFontSize(7).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(CA.font);
    statusBadge.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // KR text
    var krText = slide.insertTextBox(okr.kr.substring(0, 80), x + 5, y + 24, colWidth - 10, 28);
    krText.getText().getTextStyle().setFontSize(8).setForegroundColor(CA.textDark).setFontFamily(CA.font);
  });

  // Summary line at bottom
  var complete = okrRows.filter(function(o) { return o.status.toLowerCase() === 'complete' || o.status.toLowerCase() === 'done'; }).length;
  var inProg = okrRows.filter(function(o) { return o.status.toLowerCase() === 'in progress'; }).length;
  var blocked = okrRows.filter(function(o) { return o.status.toLowerCase() === 'blocked'; }).length;
  var summaryText = 'Key Results: ' + okrRows.length + ' Total  ·  Completed: ' + complete +
    '  ·  In Progress: ' + inProg + '  ·  Blocked: ' + blocked;
  var summaryBox = slide.insertTextBox(summaryText, 50, 470, 500, 18);
  summaryBox.getText().getTextStyle().setFontSize(8).setForegroundColor(CA.textMid).setFontFamily(CA.font);

  addCalArtsBranding_(slide);
}


function buildMilestonesSlide_(deck, achieved, ss) {
  // Gather completed OKRs
  var completedOKRs = [];
  if (ss) {
    var okrSheet = ss.getSheetByName(CONFIG.sheets.okrs);
    if (okrSheet) {
      var okrData = okrSheet.getDataRange().getValues();
      var cols = CONFIG.okrColumns;
      for (var i = 3; i < okrData.length; i++) {
        var kr = String(okrData[i][cols.keyResult - 1] || '').trim();
        var st = String(okrData[i][cols.status - 1] || '').toLowerCase();
        if (kr && (st === 'complete' || st === 'done')) {
          completedOKRs.push(kr);
        }
      }
    }
  }

  var slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CA.bgWhite);
  addSlideHeader_(slide, 'Milestones & OKRs Achieved');

  var hasAchieved = achieved.length > 0;
  var hasOKRs = completedOKRs.length > 0;

  if (!hasAchieved && !hasOKRs) {
    var noItems = slide.insertTextBox('No milestones or OKRs marked as achieved this sprint.', 50, 110, 620, 30);
    noItems.getText().getTextStyle().setFontSize(14).setForegroundColor(CA.textLight).setItalic(true).setFontFamily(CA.font);
    addCalArtsBranding_(slide);
    return;
  }

  // Left column: Milestones achieved (cards)
  var leftWidth = hasOKRs ? 340 : 620;
  var rightX = 400;

  if (hasAchieved) {
    var msLabel = slide.insertTextBox('Sprint Milestones', 50, 88, leftWidth, 22);
    msLabel.getText().getTextStyle().setFontSize(12).setBold(true).setForegroundColor(CA.navy).setFontFamily(CA.font);

    var maxCards = hasOKRs ? 5 : 6;
    var items = achieved.slice(0, maxCards);
    var cardW = hasOKRs ? 300 : Math.min(200, (620 / Math.min(items.length, 3)) - 10);
    var cardH = hasOKRs ? 52 : (items.length <= 3 ? 260 : 130);

    if (hasOKRs) {
      // Compact list layout for left column when OKRs present
      items.forEach(function(milestone, idx) {
        var y = 115 + idx * (cardH + 6);

        var card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 50, y, cardW, cardH);
        card.getFill().setSolidFill(CA.cardGray);
        card.getBorder().setTransparent();

        var accent = CA_ACCENTS[idx % CA_ACCENTS.length];
        var bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 50, y, 4, cardH);
        bar.getFill().setSolidFill(accent);
        bar.getBorder().setTransparent();

        var checkBox = slide.insertTextBox('✅', 60, y + 5, 20, 18);
        checkBox.getText().getTextStyle().setFontSize(10).setFontFamily(CA.font);

        var textBox = slide.insertTextBox(milestone, 82, y + 5, cardW - 40, cardH - 10);
        textBox.getText().getTextStyle().setFontSize(9).setForegroundColor(CA.textDark).setFontFamily(CA.font);
      });

      if (achieved.length > maxCards) {
        var moreBox = slide.insertTextBox('+ ' + (achieved.length - maxCards) + ' more', 50, 115 + maxCards * 58, 200, 18);
        moreBox.getText().getTextStyle().setFontSize(9).setItalic(true).setForegroundColor(CA.textMid).setFontFamily(CA.font);
      }
    } else {
      // Card grid layout when no OKRs
      var perRow = Math.min(items.length, 3);
      items.forEach(function(milestone, idx) {
        var col = idx % perRow;
        var row = Math.floor(idx / perRow);
        var x = 50 + col * (cardW + 10);
        var y = 115 + row * (cardH + 10);

        var card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, cardW, cardH);
        card.getFill().setSolidFill(CA.cardGray);
        card.getBorder().setTransparent();

        var accent = CA_ACCENTS[idx % CA_ACCENTS.length];
        var topBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, cardW, 4);
        topBar.getFill().setSolidFill(accent);
        topBar.getBorder().setTransparent();

        var checkBox = slide.insertTextBox('✅', x + 8, y + 12, 25, 20);
        checkBox.getText().getTextStyle().setFontSize(12).setFontFamily(CA.font);

        var textBox = slide.insertTextBox(milestone, x + 8, y + 35, cardW - 16, cardH - 45);
        textBox.getText().getTextStyle().setFontSize(9).setForegroundColor(CA.textDark).setFontFamily(CA.font);
      });
    }
  }

  // Right column: Completed OKRs
  if (hasOKRs) {
    var okrLabel = slide.insertTextBox('OKRs Completed', rightX, 88, 280, 22);
    okrLabel.getText().getTextStyle().setFontSize(12).setBold(true).setForegroundColor(CA.teal).setFontFamily(CA.font);

    completedOKRs.slice(0, 6).forEach(function(okr, idx) {
      var y = 115 + idx * 52;

      var card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, rightX, y, 280, 46);
      card.getFill().setSolidFill(CA.cardGray);
      card.getBorder().setTransparent();

      var sideBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, rightX, y, 4, 46);
      sideBar.getFill().setSolidFill(CA.teal);
      sideBar.getBorder().setTransparent();

      var badge = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, rightX + 10, y + 5, 65, 14);
      badge.getFill().setSolidFill(CA.teal);
      badge.getBorder().setTransparent();
      badge.getText().setText('COMPLETE');
      badge.getText().getTextStyle().setFontSize(6).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(CA.font);
      badge.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

      var okrText = slide.insertTextBox(okr.substring(0, 70), rightX + 10, y + 22, 260, 20);
      okrText.getText().getTextStyle().setFontSize(8).setForegroundColor(CA.textDark).setFontFamily(CA.font);
    });

    if (completedOKRs.length > 6) {
      var moreOKR = slide.insertTextBox('+ ' + (completedOKRs.length - 6) + ' more OKRs completed', rightX, 115 + 6 * 52, 280, 18);
      moreOKR.getText().getTextStyle().setFontSize(9).setItalic(true).setForegroundColor(CA.textMid).setFontFamily(CA.font);
    }
  }

  addCalArtsBranding_(slide);
}


function buildWhatsNextSlide_(deck, whatsNext) {
  var slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CA.bgWhite);
  addSlideHeader_(slide, 'Sprint Priorities');

  if (!whatsNext.trim()) {
    var noItems = slide.insertTextBox('No priorities specified.', 50, 110, 620, 30);
    noItems.getText().getTextStyle().setFontSize(14).setForegroundColor(CA.textLight).setItalic(true).setFontFamily(CA.font);
    addCalArtsBranding_(slide);
    return;
  }

  // Two-column layout with teal bullet squares (like slide 8)
  var lines = whatsNext.split('\n').filter(function(l) { return l.trim(); });
  var midpoint = Math.ceil(lines.length / 2);
  var col1Lines = lines.slice(0, midpoint);
  var col2Lines = lines.slice(midpoint);

  // Column headers
  var leftHeader = slide.insertTextBox('Key Priorities', 50, 90, 280, 22);
  leftHeader.getText().getTextStyle().setFontSize(12).setBold(true).setForegroundColor(CA.navy).setFontFamily(CA.font);

  if (col2Lines.length > 0) {
    var rightHeader = slide.insertTextBox('Additional Focus', 380, 90, 280, 22);
    rightHeader.getText().getTextStyle().setFontSize(12).setBold(true).setForegroundColor(CA.navy).setFontFamily(CA.font);
  }

  // Render bullet items with teal squares
  function renderBulletList(items, startX, startY) {
    items.forEach(function(item, i) {
      item = item.trim().replace(/^[-•*]\s*/, '');
      var y = startY + i * 36;

      // Teal bullet square
      var bullet = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, startX, y + 3, 10, 10);
      bullet.getFill().setSolidFill(CA.teal);
      bullet.getBorder().setTransparent();

      // Text
      var text = slide.insertTextBox(item, startX + 18, y, 280, 32);
      text.getText().getTextStyle().setFontSize(10).setForegroundColor(CA.textDark).setFontFamily(CA.font);
    });
  }

  renderBulletList(col1Lines, 50, 118);
  if (col2Lines.length > 0) {
    renderBulletList(col2Lines, 380, 118);
  }

  addCalArtsBranding_(slide);
}


function buildCommunicationsSlide_(deck, communications, risks) {
  var slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CA.bgWhite);
  addSlideHeader_(slide, 'Communications & Risks');

  var yPos = 95;

  // Communications section
  if (communications.trim()) {
    var commLabel = slide.insertTextBox('Communications', 50, yPos, 300, 22);
    commLabel.getText().getTextStyle().setFontSize(13).setBold(true).setForegroundColor(CA.navy).setFontFamily(CA.font);
    yPos += 28;

    var commLines = communications.split('\n').filter(function(l) { return l.trim(); });
    commLines.forEach(function(line, i) {
      line = line.trim().replace(/^[-•]\s*/, '');

      var bullet = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 50, yPos + 3, 8, 8);
      bullet.getFill().setSolidFill(CA.teal);
      bullet.getBorder().setTransparent();

      var text = slide.insertTextBox(line, 66, yPos, 600, 20);
      text.getText().getTextStyle().setFontSize(10).setForegroundColor(CA.textDark).setFontFamily(CA.font);
      yPos += 24;
    });
    yPos += 12;
  }

  // Risks section
  if (risks.trim()) {
    var riskLabel = slide.insertTextBox('Risks & Blockers', 50, yPos, 300, 22);
    riskLabel.getText().getTextStyle().setFontSize(13).setBold(true).setForegroundColor(CA.coral).setFontFamily(CA.font);
    yPos += 28;

    var riskLines = risks.split('\n').filter(function(l) { return l.trim(); });
    riskLines.forEach(function(line) {
      line = line.trim().replace(/^[-•]\s*/, '');

      var bullet = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 50, yPos + 3, 8, 8);
      bullet.getFill().setSolidFill(CA.coral);
      bullet.getBorder().setTransparent();

      var text = slide.insertTextBox(line, 66, yPos, 600, 20);
      text.getText().getTextStyle().setFontSize(10).setForegroundColor(CA.textDark).setFontFamily(CA.font);
      yPos += 24;
    });
  }

  // Status badges at bottom (like the ON TRACK / ON BUDGET badges in slide 4)
  if (risks.trim()) {
    var riskLines2 = risks.split('\n').filter(function(l) { return l.trim(); });
    if (riskLines2.length > 0) {
      var badge = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 50, 455, 100, 22);
      badge.getFill().setSolidFill(CA.coral);
      badge.getBorder().setTransparent();
      badge.getText().setText(riskLines2.length + ' RISK' + (riskLines2.length > 1 ? 'S' : ''));
      badge.getText().getTextStyle().setFontSize(8).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(CA.font);
      badge.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    }
  }

  if (!communications.trim() && !risks.trim()) {
    var noItems = slide.insertTextBox('No communications or risks noted.', 50, 110, 620, 30);
    noItems.getText().getTextStyle().setFontSize(14).setForegroundColor(CA.textLight).setItalic(true).setFontFamily(CA.font);
  }

  addCalArtsBranding_(slide);
}


function buildActionItemsSlide_(deck, ss) {
  var slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CA.bgWhite);
  addSlideHeader_(slide, 'Action Items by Satellite');

  var summary = gatherActionSummary_(ss);

  if (summary.length === 0) {
    var noItems = slide.insertTextBox('No action items tracked.', 50, 110, 620, 30);
    noItems.getText().getTextStyle().setFontSize(14).setForegroundColor(CA.textLight).setItalic(true).setFontFamily(CA.font);
    addCalArtsBranding_(slide);
    return;
  }

  // Table
  var headers = ['Satellite', 'Owner', 'Total', 'Done', 'Active', 'Blocked'];
  var colWidths = [140, 120, 65, 65, 65, 65];
  var colXs = [];
  var xPos = 50;
  colWidths.forEach(function(w) { colXs.push(xPos); xPos += w; });

  var yPos = 100;
  var rowHeight = 30;

  // Header row
  headers.forEach(function(h, i) {
    var cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, colXs[i], yPos, colWidths[i], rowHeight);
    cell.getFill().setSolidFill(CA.navy);
    cell.getBorder().setTransparent();
    cell.getText().setText(h);
    cell.getText().getTextStyle().setFontSize(10).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(CA.font);
    cell.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });
  yPos += rowHeight;

  // Data rows
  summary.forEach(function(s, rowIdx) {
    var bgColor = rowIdx % 2 === 0 ? '#FFFFFF' : CA.cardGray;
    var vals = [s.name, s.owner, String(s.total), String(s.complete), String(s.inProgress), String(s.blocked)];
    vals.forEach(function(v, i) {
      var cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, colXs[i], yPos, colWidths[i], rowHeight);
      cell.getFill().setSolidFill(bgColor);
      cell.getBorder().getLineFill().setSolidFill('#E0E0E0');
      cell.getBorder().setWeight(0.5);
      cell.getText().setText(v);
      cell.getText().getTextStyle().setFontSize(10).setForegroundColor(CA.textDark).setFontFamily(CA.font);
      cell.getText().getParagraphStyle().setParagraphAlignment(i >= 2 ? SlidesApp.ParagraphAlignment.CENTER : SlidesApp.ParagraphAlignment.START);

      if (i === 5 && parseInt(v) > 0) {
        cell.getFill().setSolidFill('#FFEBEE');
        cell.getText().getTextStyle().setBold(true).setForegroundColor(CA.coral);
      }
      if (i === 3 && parseInt(v) > 0) {
        cell.getText().getTextStyle().setForegroundColor(CA.green);
      }
    });
    yPos += rowHeight;
  });

  // Totals row
  var totals = summary.reduce(function(acc, s) {
    acc.total += s.total; acc.complete += s.complete; acc.inProgress += s.inProgress; acc.blocked += s.blocked;
    return acc;
  }, { total: 0, complete: 0, inProgress: 0, blocked: 0 });

  var totalVals = ['TOTAL', '', String(totals.total), String(totals.complete), String(totals.inProgress), String(totals.blocked)];
  totalVals.forEach(function(v, i) {
    var cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, colXs[i], yPos, colWidths[i], rowHeight);
    cell.getFill().setSolidFill(CA.darkTeal);
    cell.getBorder().setTransparent();
    cell.getText().setText(v);
    cell.getText().getTextStyle().setFontSize(10).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(CA.font);
    cell.getText().getParagraphStyle().setParagraphAlignment(i >= 2 ? SlidesApp.ParagraphAlignment.CENTER : SlidesApp.ParagraphAlignment.START);
  });

  addCalArtsBranding_(slide);
}


function buildNext6SprintsSlide_(deck, ss) {
  var slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CA.bgWhite);
  addSlideHeader_(slide, 'Next 6 Sprints — Planning View');

  var n6Sheet = ss.getSheetByName(CONFIG.sheets.next6Sprints);
  if (!n6Sheet) {
    var noData = slide.insertTextBox('Next 6 Sprints sheet not created yet.\nRun Setup → Setup Timelines.', 50, 110, 620, 50);
    noData.getText().getTextStyle().setFontSize(14).setForegroundColor(CA.textLight).setFontFamily(CA.font);
    addCalArtsBranding_(slide);
    return;
  }

  var data = n6Sheet.getDataRange().getValues();
  if (data.length < 4) { addCalArtsBranding_(slide); return; }

  // Check if ANY rows have 📊 Deck checked — if so, filter to only those
  var anyDeckFlagged = data.slice(3).some(function(row) { return row[1] === true; });

  // Sprint column headers (row 3, cols E-J = index 4-9, after 📊 Deck col)
  var sprintHeaders = [];
  for (var c = 4; c <= 9 && c < data[2].length; c++) {
    sprintHeaders.push(String(data[2][c] || '').replace(/\n/g, ' '));
  }

  var colWidths2 = [190, 65];
  sprintHeaders.forEach(function() { colWidths2.push(62); });

  var colXs2 = [];
  var x2 = 30;
  colWidths2.forEach(function(w) { colXs2.push(x2); x2 += w; });

  var y2 = 90;
  var rh = 19;

  // Header row with sprint colors
  var hdrVals = ['Task / Milestone', 'Status'].concat(sprintHeaders.map(function(h, i) {
    return h.replace(/Sprint \d+ /, 'S');
  }));
  hdrVals.forEach(function(h, i) {
    var hdrColor = i >= 2 ? CA_ACCENTS[(i - 2) % CA_ACCENTS.length] : CA.darkTeal;
    var cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, colXs2[i], y2, colWidths2[i], rh);
    cell.getFill().setSolidFill(hdrColor);
    cell.getBorder().setTransparent();
    cell.getText().setText(h);
    cell.getText().getTextStyle().setFontSize(7).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(CA.font);
    cell.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });
  y2 += rh;

  // Data rows
  var rowCount = 0;
  for (var r = 3; r < data.length && rowCount < 18; r++) {
    var task = String(data[r][0] || '').trim();
    if (!task) continue;

    // New indices: [1]=📊 Deck, [3]=Status, [4-9]=Sprints
    var hasMarkers = data[r].slice(4, 10).some(function(c2) { return String(c2).trim() !== ''; });
    var statusVal = String(data[r][3] || '').trim();  // Col D = Status
    var inDeck = data[r][1] === true;  // Col B = 📊 Deck

    if (!hasMarkers && !statusVal) {
      // Section header row
      var headerCell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, colXs2[0], y2, x2 - colXs2[0], rh);
      headerCell.getFill().setSolidFill(CA.darkTeal);
      headerCell.getBorder().setTransparent();
      headerCell.getText().setText(task);
      headerCell.getText().getTextStyle().setFontSize(7).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(CA.font);
      y2 += rh;
      rowCount++;
      continue;
    }

    // Skip items not flagged for deck (if ANY items are flagged, filter to only those)
    if (anyDeckFlagged && !inDeck) continue;

    var bgColor = rowCount % 2 === 0 ? '#FFFFFF' : CA.cardGray;

    var taskCell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, colXs2[0], y2, colWidths2[0], rh);
    taskCell.getFill().setSolidFill(bgColor);
    taskCell.getBorder().setTransparent();
    taskCell.getText().setText(task.substring(0, 40));
    taskCell.getText().getTextStyle().setFontSize(7).setForegroundColor(CA.textDark).setFontFamily(CA.font);

    var statusCell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, colXs2[1], y2, colWidths2[1], rh);
    statusCell.getFill().setSolidFill(bgColor);
    statusCell.getBorder().setTransparent();
    statusCell.getText().setText(statusVal);
    statusCell.getText().getTextStyle().setFontSize(7).setForegroundColor(CA.textMid).setFontFamily(CA.font);

    for (var mc = 0; mc < sprintHeaders.length; mc++) {
      var val = String(data[r][mc + 4] || '').trim();  // Sprints now at index 4+
      var markerCell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, colXs2[mc + 2], y2, colWidths2[mc + 2], rh);
      var mBg = bgColor;
      if (val === '◆') mBg = '#D4EDDA';
      else if (val === '⏳') mBg = '#E8D5F0';
      markerCell.getFill().setSolidFill(mBg);
      markerCell.getBorder().setTransparent();
      if (val) {
        markerCell.getText().setText(val);
        markerCell.getText().getTextStyle().setFontSize(8).setForegroundColor(CA.textDark).setFontFamily(CA.font);
        markerCell.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      }
    }

    y2 += rh;
    rowCount++;
  }

  addCalArtsBranding_(slide);
}


/**
 * Full Year Timeline as a detailed month-by-month table slide.
 */
function buildFullYearTimelineTableSlide_(deck, ss) {
  var slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CA.bgWhite);
  addSlideHeader_(slide, 'Full Year Timeline (FY2027)');

  var fytSheet = ss.getSheetByName(CONFIG.sheets.fullYearTimeline);
  if (!fytSheet) {
    var noData = slide.insertTextBox('Full Year Timeline not created.\nRun Setup → Setup Timelines.', 50, 110, 620, 50);
    noData.getText().getTextStyle().setFontSize(14).setForegroundColor(CA.textLight).setFontFamily(CA.font);
    addCalArtsBranding_(slide);
    return;
  }

  var data = fytSheet.getDataRange().getValues();
  if (data.length < 6) { addCalArtsBranding_(slide); return; }

  // Check if ANY rows have 📊 Deck checked — if so, filter to only those
  var anyDeckFlagged = data.slice(6).some(function(row) { return row[1] === true; });

  // Month headers from row 5 (index 4), cols D+ (index 3+, after 📊 Deck col)
  var months = [];
  for (var c = 3; c < data[4].length && c < 19; c++) {
    var mStr = String(data[4][c] || '').trim();
    if (mStr) months.push(mStr.replace(/ 20\d\d/, '').substring(0, 3));
  }

  // Quarter groupings for colored header bands
  var qColors = [CA.navy, CA.navy, CA.navy,
    CA.teal, CA.teal, CA.teal,
    CA.coral, CA.coral, CA.coral,
    CA.orange, CA.orange, CA.orange,
    CA.purple, CA.purple, CA.purple, CA.purple];

  // Layout
  var catWidth = 130;
  var monthWidth = Math.floor((690 - catWidth) / months.length);
  var startX = 15;
  var y = 82;
  var rh = 15;

  // Month header row
  var catHdr = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, startX, y, catWidth, rh + 2);
  catHdr.getFill().setSolidFill(CA.darkTeal);
  catHdr.getBorder().setTransparent();
  catHdr.getText().setText('Category');
  catHdr.getText().getTextStyle().setFontSize(6).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(CA.font);

  months.forEach(function(m, i) {
    var hColor = qColors[i] || CA.navy;
    var cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, startX + catWidth + i * monthWidth, y, monthWidth, rh + 2);
    cell.getFill().setSolidFill(hColor);
    cell.getBorder().setTransparent();
    cell.getText().setText(m);
    cell.getText().getTextStyle().setFontSize(6).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(CA.font);
    cell.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });
  y += rh + 2;

  // Data rows — new indices: [0]=Category, [1]=📊 Deck, [2]=Status, [3+]=months
  var rowCount = 0;
  for (var r = 6; r < data.length && rowCount < 24; r++) {
    var label = String(data[r][0] || '').trim();
    if (!label) continue;

    var inDeck = data[r][1] === true;  // Col B = 📊 Deck
    var status = String(data[r][2] || '').trim();  // Col C = Status
    var hasMarkers = data[r].slice(3).some(function(c2) { return String(c2).trim() !== ''; });

    // Section header
    if (!status && !hasMarkers && /^[^\w\s]/.test(label)) {
      var totalWidth = catWidth + months.length * monthWidth;
      var secCell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, startX, y, totalWidth, rh);
      secCell.getFill().setSolidFill(CA.darkTeal);
      secCell.getBorder().setTransparent();
      secCell.getText().setText(label);
      secCell.getText().getTextStyle().setFontSize(5).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(CA.font);
      y += rh;
      rowCount++;
      continue;
    }

    // Filter: if any items are deck-flagged, only show those
    if (anyDeckFlagged && !inDeck) continue;

    // Data row
    var isComplete = status === 'Complete';
    var isBehind = status === 'Behind';
    var bgColor = isComplete ? '#E8F5E9' : isBehind ? '#FFEBEE' : (rowCount % 2 === 0 ? '#FFFFFF' : CA.cardGray);

    // Label
    var labelCell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, startX, y, catWidth, rh);
    labelCell.getFill().setSolidFill(bgColor);
    labelCell.getBorder().setTransparent();
    labelCell.getText().setText(label.substring(0, 32));
    labelCell.getText().getTextStyle().setFontSize(5).setFontFamily(CA.font);
    labelCell.getText().getTextStyle().setForegroundColor(isComplete ? CA.green : isBehind ? CA.coral : CA.textDark);

    // Month markers (now start at index 3)
    for (var mc = 0; mc < months.length; mc++) {
      var val = String(data[r][mc + 3] || '').trim();
      var mCell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, startX + catWidth + mc * monthWidth, y, monthWidth, rh);

      var mBg = bgColor;
      if (val === '✅') mBg = '#C8E6C9';
      else if (val === '⏳') mBg = '#E8D5F0';
      else if (val === '🚨') mBg = '#FFCDD2';
      else if (val && val !== '') mBg = '#D6EAF8';

      mCell.getFill().setSolidFill(mBg);
      mCell.getBorder().setTransparent();
      if (val) {
        var displayVal = val.length > 4 ? val.substring(0, 3) : val;
        mCell.getText().setText(displayVal);
        mCell.getText().getTextStyle().setFontSize(5).setForegroundColor(CA.textDark).setFontFamily(CA.font);
        mCell.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      }
    }

    y += rh;
    rowCount++;
  }

  addCalArtsBranding_(slide);
}


function buildFullYearTimelineSlide_(deck, ss) {
  // "Looking Ahead" style slide with quarter badges
  var slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CA.bgWhite);
  addSlideHeader_(slide, 'Looking Ahead');

  var fytSheet = ss.getSheetByName(CONFIG.sheets.fullYearTimeline);
  if (!fytSheet) {
    var noData = slide.insertTextBox('Full Year Timeline not created.\nRun Setup → Setup Timelines.', 50, 110, 620, 50);
    noData.getText().getTextStyle().setFontSize(14).setForegroundColor(CA.textLight).setFontFamily(CA.font);
    addCalArtsBranding_(slide);
    return;
  }

  var data = fytSheet.getDataRange().getValues();
  if (data.length < 6) { addCalArtsBranding_(slide); return; }

  // Check if ANY rows have 📊 Deck checked
  var anyDeckFlagged = data.slice(6).some(function(row) { return row[1] === true; });

  // Quarter-based layout (like slide 9) — group milestones by quarter
  var quarterGroups = {};
  var quarterOrder = ['Q3 FY2026', 'Q4 FY2026', 'Q1 FY2027', 'Q2 FY2027', 'Q3 FY2027', 'Q4 FY2027'];
  var quarterLabels = {
    'Q3 FY2026': 'Mar 2026', 'Q4 FY2026': 'Apr–Jun 2026',
    'Q1 FY2027': 'Jul–Sep 2026', 'Q2 FY2027': 'Oct–Dec 2026',
    'Q3 FY2027': 'Jan–Mar 2027', 'Q4 FY2027': 'Spring 2027'
  };
  var quarterBadgeColors = [CA.navy, CA.teal, CA.coral, CA.orange, CA.purple, CA.green];

  // Month-to-quarter mapping
  var monthToQuarter = {
    'Mar 2026': 'Q3 FY2026',
    'Apr 2026': 'Q4 FY2026', 'May 2026': 'Q4 FY2026', 'Jun 2026': 'Q4 FY2026',
    'Jul 2026': 'Q1 FY2027', 'Aug 2026': 'Q1 FY2027', 'Sep 2026': 'Q1 FY2027',
    'Oct 2026': 'Q2 FY2027', 'Nov 2026': 'Q2 FY2027', 'Dec 2026': 'Q2 FY2027',
    'Jan 2027': 'Q3 FY2027', 'Feb 2027': 'Q3 FY2027', 'Mar 2027': 'Q3 FY2027',
    'Apr 2027': 'Q4 FY2027', 'May 2027': 'Q4 FY2027', 'Jun 2027': 'Q4 FY2027'
  };

  // Month headers from row 5 (index 4) — months now start at col D (index 3)
  var monthHeaders = [];
  for (var c = 3; c < data[4].length; c++) {
    var mStr = String(data[4][c] || '').trim();
    if (mStr) monthHeaders.push({ col: c, month: mStr });
  }

  // Scan data rows and group milestones by quarter
  // New indices: [0]=Category, [1]=📊 Deck, [2]=Status, [3+]=months
  for (var r = 6; r < data.length; r++) {
    var label = String(data[r][0] || '').trim();
    var inDeck = data[r][1] === true;  // Col B = 📊 Deck
    var status = String(data[r][2] || '').trim();  // Col C = Status
    if (!label) continue;

    var hasMarkers = data[r].slice(3).some(function(c2) { return String(c2).trim() !== ''; });
    if (!hasMarkers) continue; // Skip section headers

    // Filter: if any items are deck-flagged, only show those
    if (anyDeckFlagged && !inDeck) continue;

    // Find which month column has a marker
    for (var mc2 = 3; mc2 < data[r].length; mc2++) {
      var val = String(data[r][mc2] || '').trim();
      if (!val) continue;
      var mh = monthHeaders.find(function(m) { return m.col === mc2; });
      if (!mh) continue;
      var quarter = monthToQuarter[mh.month];
      if (!quarter) continue;
      if (!quarterGroups[quarter]) quarterGroups[quarter] = [];
      quarterGroups[quarter].push({
        label: label,
        status: status,
        marker: val
      });
      break;
    }
  }

  // Render quarter rows (like the "Looking Ahead" slide with colored badges)
  var yPos = 95;
  var leftMargin = 50;

  quarterOrder.forEach(function(q, qIdx) {
    var items = quarterGroups[q] || [];
    if (items.length === 0) return;

    var badgeColor = quarterBadgeColors[qIdx % quarterBadgeColors.length];

    // Quarter badge
    var badge = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, leftMargin, yPos, 65, 20);
    badge.getFill().setSolidFill(badgeColor);
    badge.getBorder().setTransparent();
    badge.getText().setText(quarterLabels[q] || q);
    badge.getText().getTextStyle().setFontSize(7).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(CA.font);
    badge.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // "Looking Ahead" label
    var qLabel = slide.insertTextBox(q, leftMargin + 72, yPos, 80, 20);
    qLabel.getText().getTextStyle().setFontSize(8).setBold(true).setForegroundColor(CA.textDark).setFontFamily(CA.font);

    // Milestone items (up to 3 per quarter, condensed)
    var milestoneTexts = items.slice(0, 4).map(function(item) {
      var prefix = item.status === 'Complete' ? '✅ ' : item.status === 'Behind' ? '🔴 ' : '';
      return prefix + item.label;
    });

    var itemsText = milestoneTexts.join('   ·   ');
    var milestonesBox = slide.insertTextBox(itemsText, leftMargin + 155, yPos, 500, 20);
    var mStyle = milestonesBox.getText().getTextStyle();
    mStyle.setFontSize(8).setForegroundColor(CA.textDark).setFontFamily(CA.font);

    if (items.length > 4) {
      var moreText = slide.insertTextBox('+ ' + (items.length - 4) + ' more', leftMargin + 155, yPos + 16, 200, 14);
      moreText.getText().getTextStyle().setFontSize(7).setItalic(true).setForegroundColor(CA.textLight).setFontFamily(CA.font);
      yPos += 14;
    }

    yPos += 32;
  });

  addCalArtsBranding_(slide);
}
// ============================================================================
// RACI WORKFLOW ADDON — Paste at the bottom of code.gs
// ============================================================================
//
// NEW FLOW:
//   1. Process Notes → RACI Draft
//      Granola notes → Claude → action items land in Master RACI as [DRAFT]
//      Milestones land in a separate "📋 Milestone Staging" sheet
//
//   2. You validate in Master RACI: edit owner, change [DRAFT] to blank or delete rows
//
//   3. Push RACI → Satellites
//      Reads all RACI rows where Source column = a known satellite name and
//      status is NOT [DRAFT] — pushes each item to that satellite's Action Items
//
//   4. Satellites update their status / add new items
//
//   5. Sync Satellite Statuses → RACI (non-destructive)
//      Matches existing RACI rows by task text, updates STATUS column only.
//      Does NOT rebuild or wipe the RACI (unlike the old refreshMasterRACI)
//
//   6. Milestone Staging → tag each item 4-Week / 6-Sprint / Year  → push
//
// INSTALL:
//   a) Paste this entire file at the bottom of code.gs
//   b) In onOpen(), replace the existing RACI & Trackers submenu block with:
//
//     .addSubMenu(ui.createMenu('📋 RACI & Trackers')
//       .addItem('📝 Process Notes → RACI Draft', 'processNotesToRACIDraft')
//       .addItem('📤 Push RACI → All Satellites', 'pushRACIToSatellites')
//       .addItem('🔄 Sync Satellite Statuses → RACI', 'syncSatelliteStatusesToRACI')
//       .addSeparator()
//       .addItem('📋 Refresh Master RACI (rebuild)', 'refreshMasterRACI')
//       .addItem('📤 Distribute Action Items from Internal Stakeholders', 'distributeFromInternalStakeholders')
//       .addSeparator()
//       .addItem('🗓️ View Milestone Staging', 'navToMilestoneStaging')
//       .addItem('🚀 Push Approved Milestones to Timelines', 'pushApprovedMilestones'))
//
// ============================================================================

var MILESTONE_STAGING_SHEET = '📋 Milestone Staging';

// Column positions in Master RACI (1-indexed, matching createMasterRACISheet_)
// A=Satellite Source, B=Task, C=📊, D=Owner, E=Due Date, F=Status, G=Priority,
// H=Sprint, I=Decision Context, J=Last Updated
var RACI_COL = {
  source:   1,
  task:     2,
  deck:     3,
  owner:    4,
  dueDate:  5,
  status:   6,
  priority: 7,
  sprint:   8,
  context:  9,
  updated:  10
};

// Status value used to flag unvalidated rows
var DRAFT_STATUS = '[DRAFT — Validate]';


// ============================================================================
// STEP 1: Process Notes → Master RACI (Draft) + Milestone Staging
// ============================================================================

function processNotesToRACIDraft() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const checkInNames = CONFIG.checkIns
    .filter(c => c.type === 'checkin')
    .map(c => c.name + ' (' + c.owner + ')');

  const html = buildProcessNotesDialog_(checkInNames);
  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(620).setHeight(520);
  ui.showModalDialog(htmlOutput, '📝 Process Notes → RACI Draft');
}


function buildProcessNotesDialog_(checkInNames) {
  let optionsHtml = checkInNames.map(n =>
    `<option value="${n.split(' (')[0]}">${n}</option>`
  ).join('');

  return `<!DOCTYPE html><html><head>
<style>
  body { font-family: Arial, sans-serif; padding: 16px; font-size: 13px; }
  label { font-weight: bold; display: block; margin-top: 12px; }
  select, textarea, input { width: 100%; padding: 8px; border: 1px solid #ddd;
    border-radius: 4px; margin: 6px 0; box-sizing: border-box; }
  textarea { height: 180px; font-family: monospace; font-size: 11px; }
  .hint { color: #888; font-size: 11px; margin: 0 0 6px 0; }
  button { background: #1a73e8; color: white; border: none; padding: 10px 20px;
    border-radius: 4px; cursor: pointer; font-size: 13px; width: 100%; margin-top: 12px; }
  button:hover { background: #1557b0; }
  button:disabled { background: #aaa; cursor: default; }
</style></head><body>
  <label>Which satellite meeting?</label>
  <select id="satellite">${optionsHtml}</select>

  <label>Paste Granola / meeting notes:</label>
  <p class="hint">Claude will extract action items → Master RACI (as DRAFT) and milestones → Milestone Staging.</p>
  <textarea id="notes" placeholder="Paste the full meeting transcript or notes here…"></textarea>

  <button id="btn" onclick="submit()">📥 Process Notes → RACI Draft</button>

<script>
function submit() {
  const satellite = document.getElementById('satellite').value;
  const notes = document.getElementById('notes').value.trim();
  if (!notes) { alert('Please paste meeting notes first.'); return; }
  const btn = document.getElementById('btn');
  btn.disabled = true;
  btn.textContent = '⏳ Processing with Claude… (30-60 sec)';
  google.script.run
    .withSuccessHandler(msg => { alert(msg); google.script.host.close(); })
    .withFailureHandler(err => {
      alert('Error: ' + err.message);
      btn.disabled = false;
      btn.textContent = '📥 Process Notes → RACI Draft';
    })
    .processNotesToRACIDraftServer(satellite, notes);
}
</script></body></html>`;
}


/**
 * Server-side handler called by the dialog.
 * Extracts action items + milestones via Claude, writes drafts to Master RACI
 * and Milestone Staging. Does NOT touch any satellite or check-in sheet.
 */
function processNotesToRACIDraftServer(satelliteName, granolaText) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY') || CONFIG.claudeApiKey;
  if (!apiKey) throw new Error('CLAUDE_API_KEY not configured in Script Properties.');

  const checkIn = CONFIG.checkIns.find(c => c.name === satelliteName || c.legacyName === satelliteName);
  if (!checkIn) throw new Error('Satellite "' + satelliteName + '" not found in CONFIG.');

  // ── Call Claude ────────────────────────────────────────────────────────────
  const extracted = extractMeetingDataForRACI_(apiKey, granolaText, satelliteName, checkIn.owner);
  if (!extracted || extracted.error) throw new Error(extracted ? extracted.error : 'Claude extraction failed.');

  const sprintInfo = getCurrentSprintInfo_(ss);

  // ── Write action items to Master RACI as DRAFT ─────────────────────────────
  let raciSheet = ss.getSheetByName(CONFIG.sheets.masterRaci);
  if (!raciSheet) {
    createMasterRACISheet_();
    raciSheet = ss.getSheetByName(CONFIG.sheets.masterRaci);
  }

  const actionItems = extracted.actionItems || [];
  const decisions   = extracted.decisions || [];
  const now = new Date();

  // Append action items
  actionItems.forEach(item => {
    const owner = item.owner || '';
    const fn    = inferFunction_(owner);
    raciSheet.appendRow([
      satelliteName,                         // A: Source
      item.task || '',                       // B: Task
      false,                                 // C: 📊 Deck (unchecked)
      owner + (fn ? ' (' + fn + ')' : ''),  // D: Owner + Function
      item.dueDate || '',                    // E: Due Date
      DRAFT_STATUS,                          // F: Status — marks as unvalidated
      item.priority || '',                   // G: Priority
      sprintInfo.name,                       // H: Sprint
      '',                                    // I: Context
      now                                    // J: Last Updated
    ]);
  });

  // Append decisions that have follow-ups
  decisions.forEach(d => {
    if (!d.followUp) return;
    const owner = d.owner || '';
    const fn    = inferFunction_(owner);
    raciSheet.appendRow([
      satelliteName,
      '↳ Follow-up: ' + d.followUp,
      false,
      owner + (fn ? ' (' + fn + ')' : ''),
      '',
      DRAFT_STATUS,
      '',
      sprintInfo.name,
      'Decision: ' + (d.decision || ''),
      now
    ]);
  });

  // Apply DRAFT highlight to new rows
  const lastRow  = raciSheet.getLastRow();
  const newRows  = actionItems.length + decisions.filter(d => d.followUp).length;
  const firstNew = lastRow - newRows + 1;
  if (newRows > 0) {
    raciSheet.getRange(firstNew, RACI_COL.status, newRows, 1)
      .setBackground('#FFF9C4').setFontColor('#E65100').setFontWeight('bold');
  }

  // ── Write milestones to Milestone Staging ─────────────────────────────────
  const milestones = extracted.timelineUpdates || [];
  let milestoneCount = 0;
  if (milestones.length > 0) {
    milestoneCount = writeMilestonesToStaging_(ss, milestones, satelliteName);
  }

  // ── Log the meeting ────────────────────────────────────────────────────────
  logMeeting_(ss, satelliteName, '', granolaText, extracted);

  return (
    '✅ Done!\n\n' +
    '• ' + actionItems.length + ' action item(s) added to Master RACI as [DRAFT]\n' +
    '• ' + decisions.filter(d => d.followUp).length + ' decision follow-up(s) added\n' +
    '• ' + milestoneCount + ' milestone(s) added to Milestone Staging\n\n' +
    'Next steps:\n' +
    '1. Review the Master RACI tab — edit owners, delete rows you don\'t want\n' +
    '2. Change status from [DRAFT — Validate] to "Not Started" (or any real status) to approve\n' +
    '3. Run RACI & Trackers → Push RACI → All Satellites\n\n' +
    'For milestones: open "📋 Milestone Staging", set the Timeline column, then run\n' +
    '"Push Approved Milestones to Timelines".'
  );
}


/**
 * Claude prompt tuned for RACI-first extraction (no satellite routing needed).
 */
function extractMeetingDataForRACI_(apiKey, granolaText, satelliteName, owner) {
  const prompt =
    `You are extracting structured data from meeting notes for the "${satelliteName}" check-in (owner: ${owner}).\n\n` +
    `Return ONLY valid JSON with this structure — no markdown, no extra text:\n\n` +
    `{\n` +
    `  "summary": "2-3 sentence executive summary",\n` +
    `  "actionItems": [\n` +
    `    { "task": "what needs to be done", "owner": "person's name", "dueDate": "Mon DD YYYY or empty", "priority": "P0/P1/P2/P3", "notes": "any context" }\n` +
    `  ],\n` +
    `  "decisions": [\n` +
    `    { "decision": "what was decided", "owner": "who owns it", "followUp": "any follow-up action required or empty" }\n` +
    `  ],\n` +
    `  "timelineUpdates": [\n` +
    `    {\n` +
    `      "milestone": "short milestone name",\n` +
    `      "date": "Mon DD, YYYY (best estimate, use 1st of month if only month known)",\n` +
    `      "isTBD": true or false,\n` +
    `      "category": "one of: Hiring / Budget / Building / Events / Curation / Communications / Academic / Other",\n` +
    `      "owner": "who is responsible",\n` +
    `      "changeType": "new / moved / completed / cancelled",\n` +
    `      "details": "brief context from the meeting"\n` +
    `    }\n` +
    `  ]\n` +
    `}\n\n` +
    `Guidelines:\n` +
    `- Capture ALL action items including implicit ones ("X will send Y by Friday")\n` +
    `- For timelineUpdates, capture ANY dates, deadlines, scheduling changes, or milestones mentioned\n` +
    `- Use people's first names for owner fields\n` +
    `- If no firm date was given, set isTBD: true and estimate the month\n\n` +
    `--- MEETING NOTES ---\n${granolaText}`;

  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: CONFIG.claudeModel,
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const result = JSON.parse(response.getContentText());
  const text = result.content[0].text.trim();

  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse Claude response: ' + text.substring(0, 200));
  }
}


/**
 * Looks up a person's function/department from CONFIG.nameToFunction.
 * Returns empty string if not found.
 */
function inferFunction_(name) {
  if (!name) return '';
  const key = name.toLowerCase().trim();
  for (const [n, fn] of Object.entries(CONFIG.nameToFunction)) {
    if (key.includes(n) || n.includes(key)) return fn;
  }
  return '';
}


// ============================================================================
// STEP 3: Push validated RACI rows → Satellites
// ============================================================================

/**
 * Reads Master RACI rows where status ≠ DRAFT_STATUS, matches the source
 * satellite, and appends each item to that satellite's Action Items section
 * (only if not already present by task text — prevents duplicates).
 *
 * A row is considered "validated" if its Status column is anything other than
 * DRAFT_STATUS (or blank — blank means it was deleted/skipped).
 */
function pushRACIToSatellites() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const ui  = SpreadsheetApp.getUi();

  const raciSheet = ss.getSheetByName(CONFIG.sheets.masterRaci);
  if (!raciSheet) {
    ui.alert('Master RACI not found. Run RACI & Trackers → Refresh Master RACI first.');
    return;
  }

  const lastRow = raciSheet.getLastRow();
  if (lastRow < 2) {
    ui.alert('Master RACI is empty.');
    return;
  }

  const confirm = ui.alert(
    '📤 Push RACI → Satellites',
    'This will push all validated RACI rows (status ≠ [DRAFT]) to their satellite trackers.\n\n' +
    'Duplicate tasks (matched by text) will be skipped.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  ss.toast('Pushing RACI items to satellite workbooks…', '📤 Push', -1);

  const data = raciSheet.getRange(2, 1, lastRow - 1, 10).getValues();

  // Group validated rows by source satellite
  const bySatellite = {};
  data.forEach(row => {
    const source  = String(row[RACI_COL.source  - 1] || '').trim();
    const task    = String(row[RACI_COL.task    - 1] || '').trim();
    const status  = String(row[RACI_COL.status  - 1] || '').trim();
    if (!source || !task) return;
    if (status === DRAFT_STATUS || status === '') return;   // skip drafts and blanks

    if (!bySatellite[source]) bySatellite[source] = [];
    bySatellite[source].push({
      task:    task,
      owner:   String(row[RACI_COL.owner   - 1] || ''),
      dueDate: row[RACI_COL.dueDate - 1],
      status:  status,
      priority: String(row[RACI_COL.priority - 1] || ''),
      context: String(row[RACI_COL.context  - 1] || '')
    });
  });

  if (Object.keys(bySatellite).length === 0) {
    ui.alert('No validated rows found.\n\nChange the Status of RACI rows from "[DRAFT — Validate]" to any real status (e.g. "Not Started") to mark them as approved for pushing.');
    return;
  }

  // Get satellite IDs
  const satellites = getSatelliteIds_();
  const satMap = {};
  satellites.forEach(s => { satMap[s.name] = s.id; });

  let totalPushed = 0;
  let totalSkipped = 0;
  const report = [];

  Object.entries(bySatellite).forEach(([satName, items]) => {
    const satId = satMap[satName];
    if (!satId) {
      report.push('⚠️ ' + satName + ': satellite not found in config');
      return;
    }

    try {
      const satellite = SpreadsheetApp.openById(satId);
      const satSheet  = satellite.getSheetByName('Check-In');
      if (!satSheet) {
        report.push('⚠️ ' + satName + ': no Check-In sheet');
        return;
      }

      const bounds = getSectionBoundaries_(satSheet);
      if (!bounds.actions) {
        report.push('⚠️ ' + satName + ': no Action Items section found');
        return;
      }

      // Read existing action items to detect duplicates
      const existing = readSectionData_(satSheet, bounds.actions);
      const existingTasks = new Set(
        existing.map(r => String(r[0] || '').trim().toLowerCase()).filter(Boolean)
      );

      // Build new rows list (existing + new non-duplicates)
      const newRows = existing.filter(r => r.some(c => String(c).trim() !== ''));
      let pushed = 0;
      let skipped = 0;

      items.forEach(item => {
        const taskKey = item.task.toLowerCase();
        if (existingTasks.has(taskKey)) {
          skipped++;
          return;
        }
        newRows.push([
          item.task,
          // Strip the "(Function)" suffix from owner if present for cleanliness
          item.owner.replace(/\s*\([^)]+\)$/, ''),
          item.dueDate instanceof Date ? item.dueDate : (item.dueDate || ''),
          item.status,
          '',           // Link column
          'Master RACI' // Satellite Source column (col F in v2 satellite layout)
        ]);
        existingTasks.add(taskKey);
        pushed++;
      });

      writeSectionData_(satSheet, bounds.actions, newRows, 10);
      totalPushed  += pushed;
      totalSkipped += skipped;
      report.push('✅ ' + satName + ': ' + pushed + ' pushed, ' + skipped + ' skipped (already present)');

    } catch (err) {
      report.push('❌ ' + satName + ': ' + err.message);
      console.error('Push failed for ' + satName + ': ' + err.message);
    }
  });

  ss.toast('Push complete!', '✅ Done', 5);

  ui.alert(
    '📤 Push Complete',
    totalPushed + ' item(s) pushed, ' + totalSkipped + ' skipped.\n\n' +
    report.join('\n'),
    ui.ButtonSet.OK
  );
}


// ============================================================================
// STEP 5: Non-destructive status sync — Satellites → Master RACI
// ============================================================================

/**
 * For each satellite, reads its current action item statuses and updates
 * the matching rows in Master RACI. Matching is done by task text (case-insensitive,
 * with "[DRAFT]" / "↳ Follow-up:" prefixes stripped).
 *
 * DOES NOT rebuild or clear the RACI — only updates the Status and Last Updated
 * columns of rows that already exist.
 *
 * New items found in satellites (not yet in RACI) are appended as new rows.
 */
function syncSatelliteStatusesToRACI() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const ui  = SpreadsheetApp.getUi();

  const raciSheet = ss.getSheetByName(CONFIG.sheets.masterRaci);
  if (!raciSheet) {
    ui.alert('Master RACI not found. Run Refresh Master RACI first.');
    return;
  }

  ss.toast('Syncing satellite statuses to Master RACI…', '🔄 Sync', -1);

  const lastRow = raciSheet.getLastRow();
  const raciData = lastRow > 1
    ? raciSheet.getRange(2, 1, lastRow - 1, 10).getValues()
    : [];

  // Build index: normalized task text → sheet row number (2-indexed)
  const taskIndex = {};
  raciData.forEach((row, i) => {
    const raw = String(row[RACI_COL.task - 1] || '');
    const key = normalizeTask_(raw);
    if (key) taskIndex[key] = i + 2;  // 1-indexed sheet row
  });

  const satellites  = getSatelliteIds_();
  const sprintInfo  = getCurrentSprintInfo_(ss);
  const now         = new Date();

  let updated   = 0;
  let newItems  = 0;
  const newRows = [];

  satellites.forEach(sat => {
    const checkIn = CONFIG.checkIns.find(c => c.name === sat.name || c.legacyName === sat.name);
    if (!checkIn || checkIn.type === 'okr') return;

    try {
      const satellite = SpreadsheetApp.openById(sat.id);
      const satSheet  = satellite.getSheetByName('Check-In');
      if (!satSheet) return;

      const bounds  = getSectionBoundaries_(satSheet);
      const actions = bounds.actions ? readSectionData_(satSheet, bounds.actions) : [];

      actions.forEach(row => {
        const task = String(row[0] || '').trim();
        if (!task) return;

        const key    = normalizeTask_(task);
        const status = String(row[3] || 'Not Started').trim();
        const owner  = String(row[1] || '').trim();
        const due    = row[2];

        if (taskIndex[key]) {
          // Found a matching row — update status + last updated only
          const sheetRow = taskIndex[key];
          const currentStatus = String(raciSheet.getRange(sheetRow, RACI_COL.status).getValue()).trim();

          // Don't overwrite a DRAFT status — the user hasn't validated it yet
          if (currentStatus !== DRAFT_STATUS && currentStatus !== status) {
            raciSheet.getRange(sheetRow, RACI_COL.status).setValue(status);
            raciSheet.getRange(sheetRow, RACI_COL.updated).setValue(now);

            // Color the status cell based on value
            colorStatusCell_(raciSheet.getRange(sheetRow, RACI_COL.status), status);
            updated++;
          }
        } else {
          // New item from satellite — append to batch
          newRows.push([
            sat.name,
            task,
            false,
            owner,
            due,
            status,
            '',
            sprintInfo.name,
            '← From satellite',
            now
          ]);
          taskIndex[key] = -1; // mark as seen (avoid duplicates within same sync)
          newItems++;
        }
      });

    } catch (err) {
      console.error('Status sync failed for ' + sat.name + ': ' + err.message);
    }
  });

  // Append new items (rows that exist in satellites but not in RACI)
  if (newRows.length > 0) {
    const startRow = raciSheet.getLastRow() + 1;
    raciSheet.getRange(startRow, 1, newRows.length, 10).setValues(newRows);
    // Mark new satellite-sourced rows with a light blue background
    raciSheet.getRange(startRow, 1, newRows.length, 10).setBackground('#E3F2FD');
    newRows.forEach((_, i) => {
      colorStatusCell_(raciSheet.getRange(startRow + i, RACI_COL.status), String(newRows[i][5]));
    });
  }

  ss.toast(updated + ' status(es) updated, ' + newItems + ' new item(s) added', '✅ Sync Complete', 6);

  ui.alert(
    '🔄 Sync Complete',
    updated + ' existing RACI row(s) had their status updated from satellite data.\n' +
    newItems + ' new item(s) from satellites appended to Master RACI.\n\n' +
    'DRAFT rows were not touched.',
    ui.ButtonSet.OK
  );
}


/**
 * Normalizes a task string for fuzzy matching:
 * lowercases, strips emoji prefixes, strips "[Carried Over]" / "[DRAFT]" markers.
 */
function normalizeTask_(raw) {
  return raw
    .toLowerCase()
    .replace(/^[⏳📌📤✅🔴⚠️↳•\-\s]+/, '')
    .replace(/^\[.*?\]\s*/, '')
    .replace(/^(carried over|from is|draft.*validate)\s*/i, '')
    .trim();
}


/**
 * Applies background + font color to a status cell based on its value.
 */
function colorStatusCell_(cell, status) {
  const s = String(status).toLowerCase();
  if (s === 'complete' || s === 'done') {
    cell.setBackground('#C8E6C9').setFontColor('#2E7D32');
  } else if (s === 'in progress') {
    cell.setBackground('#BBDEFB').setFontColor('#1565C0');
  } else if (s === 'blocked') {
    cell.setBackground('#FFCDD2').setFontColor('#B71C1C');
  } else if (s === 'not started') {
    cell.setBackground('#F5F5F5').setFontColor('#555555');
  } else if (s === 'carried over' || s === 'pending') {
    cell.setBackground('#FFF9C4').setFontColor('#E65100');
  } else if (s.includes('draft')) {
    cell.setBackground('#FFF9C4').setFontColor('#E65100').setFontWeight('bold');
  } else {
    cell.setBackground(null).setFontColor(null).setFontWeight('normal');
  }
}


// ============================================================================
// MILESTONE STAGING SHEET
// ============================================================================

function navToMilestoneStaging() {
  navigateToSheet_(MILESTONE_STAGING_SHEET);
}


/**
 * Creates (or verifies) the Milestone Staging sheet.
 * Columns: Milestone | Date | Is TBD | Category | Owner | Source Meeting |
 *          Timeline Target | Status | Notes
 */
function ensureMilestoneStagingSheet_(ss) {
  let sheet = ss.getSheetByName(MILESTONE_STAGING_SHEET);
  if (sheet) return sheet;

  sheet = ss.insertSheet(MILESTONE_STAGING_SHEET);

  const headers = [
    'Milestone', 'Date', 'Is TBD', 'Category', 'Owner',
    'Source Meeting', 'Timeline Target', 'Status', 'Notes'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#1a73e8')
    .setFontColor('white');

  // Timeline Target dropdown
  const timelineRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['4-Week', '6-Sprint', 'Year', 'Skip'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('G2:G500').setDataValidation(timelineRule);

  // Status dropdown
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pending Review', 'Approved', 'Pushed', 'Skip'], true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange('H2:H500').setDataValidation(statusRule);

  // Category dropdown
  const catRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Hiring', 'Budget', 'Building', 'Events', 'Curation', 'Communications', 'Academic', 'Other'], true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange('D2:D500').setDataValidation(catRule);

  sheet.setColumnWidth(1, 320);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 65);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 120);
  sheet.setColumnWidth(6, 160);
  sheet.setColumnWidth(7, 110);
  sheet.setColumnWidth(8, 120);
  sheet.setColumnWidth(9, 280);
  sheet.setFrozenRows(1);

  return sheet;
}


/**
 * Writes an array of timeline updates (from Claude) to the Milestone Staging sheet.
 * Returns the number of rows added.
 */
function writeMilestonesToStaging_(ss, updates, sourceMeeting) {
  const sheet = ensureMilestoneStagingSheet_(ss);
  let added = 0;

  updates.forEach(u => {
    if (!u.milestone) return;
    sheet.appendRow([
      u.milestone,                          // A: Milestone
      u.date || '',                         // B: Date
      u.isTBD ? 'Yes' : 'No',              // C: Is TBD
      u.category || 'Other',               // D: Category
      u.owner || '',                        // E: Owner
      sourceMeeting,                        // F: Source Meeting
      '',                                   // G: Timeline Target (user fills this)
      'Pending Review',                     // H: Status
      u.details || ''                       // I: Notes / context
    ]);
    added++;
  });

  // Highlight new rows light yellow
  if (added > 0) {
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow - added + 1, 1, added, 9).setBackground('#FFFDE7');
  }

  return added;
}


// ============================================================================
// STEP 6: Push Approved Milestones → Timelines
// ============================================================================

/**
 * Reads Milestone Staging rows where Status = "Approved" and Timeline Target
 * is set. Pushes each to the appropriate timeline and marks the row as "Pushed".
 */
function pushApprovedMilestones() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const ui  = SpreadsheetApp.getUi();

  const stagingSheet = ss.getSheetByName(MILESTONE_STAGING_SHEET);
  if (!stagingSheet) {
    ui.alert('Milestone Staging sheet not found.\n\nProcess some notes first using RACI & Trackers → Process Notes → RACI Draft.');
    return;
  }

  const lastRow = stagingSheet.getLastRow();
  if (lastRow < 2) {
    ui.alert('No milestones in the staging sheet yet.');
    return;
  }

  const data = stagingSheet.getRange(2, 1, lastRow - 1, 9).getValues();

  // Filter to approved rows
  const approved = data.map((row, i) => ({ row, sheetRow: i + 2 }))
    .filter(({ row }) => String(row[7] || '').trim() === 'Approved');

  if (approved.length === 0) {
    ui.alert('No rows are marked "Approved".\n\nSet the Status column to "Approved" for milestones you want to push, and set the Timeline Target (4-Week / 6-Sprint / Year).');
    return;
  }

  const confirm = ui.alert(
    '🚀 Push Approved Milestones',
    approved.length + ' approved milestone(s) will be pushed to their target timelines.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  ss.toast('Pushing milestones to timelines…', '🚀 Push', -1);

  let yearCount   = 0;
  let sprintCount = 0;
  let weekCount   = 0;

  approved.forEach(({ row, sheetRow }) => {
    const milestone = String(row[0] || '').trim();
    const date      = row[1];
    const isTBD     = String(row[2] || '').toLowerCase() === 'yes';
    const category  = String(row[3] || 'Other').trim();
    const owner     = String(row[4] || '').trim();
    const target    = String(row[6] || '').trim();
    const notes     = String(row[8] || '').trim();

    if (!milestone || !target || target === 'Skip') return;

    const update = {
      milestone: milestone,
      date:      date instanceof Date ? formatDateForClaude_(date) : String(date || ''),
      isTBD:     isTBD,
      category:  category,
      owner:     owner,
      changeType: 'new',
      details:   notes
    };

    try {
      if (target === 'Year') {
        // Push to Full Year Timeline
        const months = getFullYearMonths_();
        const fytSheet = ss.getSheetByName(CONFIG.sheets.fullYearTimeline);
        if (fytSheet) {
          addMilestoneToFullYear_(fytSheet, update, getMonthIndexForDate_(date, months), months);
          yearCount++;
        }
      }

      if (target === '6-Sprint') {
        // Add to Next 6 Sprints Manual Entries section
        addMilestoneToNext6Sprints_(ss, update);
        sprintCount++;
      }

      if (target === '4-Week') {
        // Add to Next 4 Weeks Manual Entries section
        addMilestoneToNext4Weeks_(ss, update);
        weekCount++;
      }

      // Mark as Pushed
      stagingSheet.getRange(sheetRow, 8).setValue('Pushed');
      stagingSheet.getRange(sheetRow, 1, 1, 9).setBackground('#E8F5E9');

    } catch (err) {
      console.error('Failed to push milestone "' + milestone + '": ' + err.message);
      stagingSheet.getRange(sheetRow, 8).setValue('Error: ' + err.message.substring(0, 50));
    }
  });

  ss.toast('Milestones pushed!', '✅ Done', 5);

  ui.alert(
    '✅ Milestones Pushed',
    yearCount   + ' → Full Year Timeline\n' +
    sprintCount + ' → Next 6 Sprints\n' +
    weekCount   + ' → Next 4 Weeks\n\n' +
    'Pushed rows are now highlighted green in Milestone Staging.',
    ui.ButtonSet.OK
  );
}


/**
 * Appends a milestone to the Next 6 Sprints sheet's Manual Entries section.
 */
function addMilestoneToNext6Sprints_(ss, update) {
  const sheet = ss.getSheetByName(CONFIG.sheets.next6Sprints);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  const data    = sheet.getRange(1, 1, lastRow, 1).getValues();

  // Find the Manual Entries section
  let insertRow = -1;
  for (let r = data.length - 1; r >= 0; r--) {
    const val = String(data[r][0] || '').trim();
    if (val.includes('Manual Entries')) {
      insertRow = r + 2; // Row after the Manual Entries header
      break;
    }
  }

  if (insertRow < 0) {
    // No manual entries section — just append
    insertRow = lastRow + 1;
  }

  // Insert a row and write the milestone (Task=col1, 📊=col2, Owner=col3, Status=col4)
  sheet.insertRowBefore(insertRow);
  sheet.getRange(insertRow, 1).setValue((update.isTBD ? '⏳ ' : '') + update.milestone);
  sheet.getRange(insertRow, 3).setValue(update.owner || '');
  sheet.getRange(insertRow, 4).setValue('Not Started');
  sheet.getRange(insertRow, 1).setFontColor(update.isTBD ? '#9C27B0' : null);
}


/**
 * Appends a milestone to the Next 4 Weeks sheet's Manual Entries section.
 */
function addMilestoneToNext4Weeks_(ss, update) {
  const sheet = ss.getSheetByName(CONFIG.sheets.next4Weeks);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  const data    = sheet.getRange(1, 1, lastRow, 1).getValues();

  let insertRow = -1;
  for (let r = data.length - 1; r >= 0; r--) {
    const val = String(data[r][0] || '').trim();
    if (val.includes('Manual Entries')) {
      insertRow = r + 2;
      break;
    }
  }
  if (insertRow < 0) insertRow = lastRow + 1;

  sheet.insertRowBefore(insertRow);
  sheet.getRange(insertRow, 1).setValue((update.isTBD ? '⏳ ' : '') + update.milestone);
  sheet.getRange(insertRow, 2).setValue(update.owner || '');
  sheet.getRange(insertRow, 3).setValue('Manual');
  sheet.getRange(insertRow, 4).setValue('Not Started');
  sheet.getRange(insertRow, 1).setFontColor(update.isTBD ? '#9C27B0' : null);
}


// ============================================================================
// HELPERS
// ============================================================================

/**
 * Returns the 16-month array used by the Full Year Timeline.
 */
function getFullYearMonths_() {
  return [
    'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026',
    'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026',
    'Nov 2026', 'Dec 2026', 'Jan 2027', 'Feb 2027',
    'Mar 2027', 'Apr 2027', 'May 2027', 'Jun 2027'
  ];
}


/**
 * Converts a Date or date string to the "Mon DD, YYYY" format Claude uses.
 */
function formatDateForClaude_(date) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return String(date || '');
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'MMM d, yyyy');
  } catch (e) {
    return String(date || '');
  }
}


/**
 * Given a date and the months array, returns the 0-based index into that array.
 * Returns -1 if not found.
 */
function getMonthIndexForDate_(date, months) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return -1;
    const monthStr = Utilities.formatDate(d, Session.getScriptTimeZone(), 'MMM yyyy');
    return months.indexOf(monthStr);
  } catch (e) {
    return -1;
  }
}
