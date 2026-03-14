/**
 * ============================================================================
 * CCAT OPERATING SYSTEM - GOOGLE APPS SCRIPT
 * ============================================================================
 * 
 * This script automates sprint management for CCAT's operating system.
 * 
 * FEATURES:
 * 1. Sprint Rollover & Archive
 * 2. Satellite Workbook Creation & Two-Way Sync
 * 3. OKR Timeline Population (Quarter Shading + Milestone Emojis)
 * 4. RACI Task List Generation by Stakeholder
 * 5. Status Summary Email Notifications
 * 6. Fix #REF! and #ERROR! issues
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your CCAT Home Base Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire script
 * 4. Click Save
 * 5. Run the onOpen() function once to create the menu
 * 6. Refresh your spreadsheet - you'll see a "🎛️ CCAT System" menu
 * 
 * FIRST TIME SETUP:
 * - Run "⚙️ Initial Setup" from the menu to create satellite workbooks
 * - Grant necessary permissions when prompted
 * 
 * ============================================================================
 */

// ============================================================================
// CONFIGURATION - EDIT THESE VALUES AS NEEDED
// ============================================================================

const CONFIG = {
  // Your email for notifications
  notificationEmail: 'YOUR_EMAIL@example.com', // <-- CHANGE THIS
  
  // Master spreadsheet sheet names
  sheets: {
    homeBase: '🏛️ Home Base',
    sprintPlanning: '🗓️ Sprint Planning',
    sprintTemplate: '⏱️ Sprint Template',
    okrs: '🎯 Objectives and Key Results',
    raciTaskList: '📋 RACI by Stakeholder', // Will be created
    satelliteConfig: '⚙️ Satellite Config', // Will be created
    okrChangeLog: '📝 OKR Change Log', // Will be created - tracks stakeholder changes
    advisoryNetwork: '🤝 Advisory Network',
    conversationLog: '💬 Conversation Log',
    networkDashboard: '📊 Network Dashboard',
    docActivity: '📄 Doc Activity',

  },
  
  // Check-in types and their corresponding sheets
  checkIns: [
    { name: 'Production', templateSheet: 'Production Sync Template', activeSheet: 'Production Sync ', title: 'CCAT Production Check-In', type: 'checkin' },
    { name: 'Funder (CHANEL)', templateSheet: 'Funder Check-In Template', activeSheet: ' Funder Check-In', title: 'CHANEL Funder Check-In', type: 'checkin' },
    { name: 'Deans-Provost', templateSheet: 'Deans-Provost Check-In Template', activeSheet: ' Deans-Provost Check-In', title: 'Deans / Provost Check-In', type: 'checkin' },
    { name: 'Facilities', templateSheet: 'Facilities Check-In Template', activeSheet: 'Facilities Check-In', title: 'Facilities Check-In', type: 'checkin' },
    { name: 'IT', templateSheet: 'IT Check-In Template', activeSheet: 'IT Check-In', title: 'IT Check-In', type: 'checkin' },
    { name: 'Student Life', templateSheet: 'Student Life Check-In Template', activeSheet: ' Student Life Check-In', title: 'Student Union Check-Ins', type: 'checkin' },
    { name: 'Advisory Committee', templateSheet: 'Advisory Committee', activeSheet: 'Advisory Committee', title: 'Advisory Committee Meetings', type: 'checkin' },
    { name: 'OKRs', templateSheet: null, activeSheet: '🎯 Objectives and Key Results', title: 'CCAT 2026 Objectives and Key Results', type: 'okr' },
    { name: 'Advancement Input', templateSheet: null, activeSheet: null, title: 'CCAT Advancement — Contact Submissions', type: 'advancement' },
  ],
  
  // Category emoji mapping
  categoryEmojis: {
    'Event': '🎪',
    'Update': '💬',
    'Comms': '📣',
    'Key Milestone': '⭐'
  },
  
  // Quarter to month mapping (1-indexed columns in OKR sheet)
  // Based on analysis: Col 28=Jan, 29=Feb, 30=Mar, 31=Apr, 32=May, 33=Jun, 34=Jul, 35=Aug, 36=Sep, 37=Oct, 38=Nov, 39=Dec
  quarterMonths: {
    'Q1': [28, 29, 30],      // January, February, March
    'Q2': [31, 32, 33],      // April, May, June
    'Q3': [34, 35, 36],      // July, August, September
    'Q4': [37, 38, 39]       // October, November, December
  },
  
  // Month column mapping (1-indexed)
  monthColumns: {
    1: 28,  // January
    2: 29,  // February
    3: 30,  // March
    4: 31,  // April
    5: 32,  // May
    6: 33,  // June
    7: 34,  // July
    8: 35,  // August
    9: 36,  // September
    10: 37, // October
    11: 38, // November
    12: 39  // December
  },
  
  // OKR sheet column indices (1-indexed)
  okrColumns: {
    type: 1,              // A - KR1, KR2, Objective, etc.
    description: 2,       // B - Description text
    priority: 16,         // P - Priority (P0-P3)
    planningAssumption: 17, // Q - Planning Assumption (Q1, Q2, etc.)
    status: 18,           // R - Status
    confidence: 19,       // S - Confidence
    fixedDeadline: 20,    // T - Fixed Deadline
    category: 21,         // U - Category (if fixed deadline)
    responsible: 22,      // V - Responsible
    accountable: 23,      // W - Accountable
    consulted: 24,        // X - Consulted
    informed: 25,         // Y - Informed
    dependencies: 26      // Z - Dependencies
  },
  
  // Dropdown options for OKR fields
  dropdownOptions: {
    priority: ['P0', 'P1', 'P2', 'P3'],
    planningAssumption: ['Q1', 'Q2', 'Q3', 'Q4', 'Q1, Q2', 'Q2, Q3', 'Q3, Q4', 'Q1, Q2, Q3', 'Q2, Q3, Q4', 'Q1, Q2, Q3, Q4'],
    status: ['Not Started', 'In Progress', 'Complete', 'Blocked'],
    confidence: ['High', 'Medium', 'Low'],
    category: ['Event', 'Update', 'Comms', 'Key Milestone']
  },
  
  // Colors for quarter shading
  quarterColors: {
    'Q1': '#E3F2FD', // Light blue
    'Q2': '#E8F5E9', // Light green
    'Q3': '#FFF3E0', // Light orange
    'Q4': '#F3E5F5'  // Light purple
   },
  contactConfig: {
    institutionTypes: ['University', 'Museum', 'Game Company', 'Tech Company', 'Studio', 'Research Lab', 'Non-Profit', 'Government', 'Other'],
    industries: ['Technology', 'Gaming', 'Film/TV', 'Education', 'Arts/Culture', 'Research', 'Government', 'Non-Profit', 'Other'],
    regions: ['Los Angeles', 'California', 'West Coast', 'East Coast', 'Midwest', 'South', 'International', 'Remote'],
    calArtsConnections: ['Alumni', 'Parent', 'Board Member', 'Partner Organization', 'Previous Collaborator', 'Faculty Connection', 'None'],
    contactSources: ['Faculty Referral', 'Personal Network', 'Advancement Team', 'Conference', 'LinkedIn', 'Email Introduction', 'Cold Outreach', 'Other'],
    potentialRoles: ['Advisory Committee', 'Visiting Lecturer', 'Potential Hire', 'Fellow', 'Collaborator', 'Funder', 'General Network'],
    statuses: ['Active', 'Pending', 'On Hold', 'Inactive', 'Converted'],
    actionNeeded: ['ED Review Needed', 'ED Approval Needed', 'ED Follow-up Needed', 'No ED Action']
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
  
  // Build the main menu
  const mainMenu = ui.createMenu('🎛️ CCAT System')
    .addItem('🔄 New Sprint (Rollover & Push)', 'newSprintRollover')
    .addItem('🔁 Sync All Satellites', 'syncAllSatellites')
    .addItem('🎯 Sync OKR Satellite Only', 'syncOKRSatelliteOnly')
    .addSeparator()
    .addItem('🎯 Update OKR Timeline', 'updateOKRTimeline')
    .addItem('📋 Generate RACI Task List', 'generateRACITaskList')
    .addSeparator()
    .addSubMenu(ui.createMenu('📊 Bi-Weekly Update')
      .addItem('📊 Generate Summary Sheet', 'generateBiWeeklySummary')
      .addItem('📧 Send Pre-Read Email', 'sendStatusSummary'))
    .addSeparator()
 .addSubMenu(ui.createMenu('🤝 Advisory Network')
      .addItem('👀 View Contact Database', 'navToAdvisoryNetwork')
      .addItem('➕ Add New Contact', 'showEnhancedAddContactDialog')
      .addItem('📞 Log Contact Call', 'showContactDictationDialog')
      .addItem('📋 View Call Reports', 'showCallReportsList')
      .addItem('💬 View Conversation Log', 'navToConversationLog')
      .addItem('👁️ View Contact Details', 'showContactDetailPopup')
      .addItem('📊 View Network Dashboard', 'navToNetworkDashboard')
      .addSeparator()
      .addItem('🔁 Sync Advancement Submissions', 'syncAdvancementInput')
      .addItem('📧 Open Advancement Satellite', 'openSatelliteAdvancement')
      .addSeparator()
      .addItem('📁 Open Call Reports Folder', 'openCallReportsFolder')
      .addSeparator()
.addItem('📞 Log Contact Call (Enhanced)', 'showContactDictationDialog')
.addItem('⚙️ Setup Advancement Satellite v2', 'setupAdvancementSatelliteV2')
.addItem('🔄 Sync to Advancement', 'syncToAdvancementSatellite_')
     .addItem('⚙️ Setup Contact Reports', 'setupContactReportSystem'))
    .addSubMenu(ui.createMenu('✅ OKR Change Approval')
      .addItem('📋 View Pending Changes', 'viewPendingOKRChanges')
      .addItem('✅ Approve All & Sync', 'approveAllOKRChanges')
      .addItem('✅ Approve Selected Changes', 'approveSelectedOKRChanges')
      .addItem('❌ Reject Selected Changes', 'rejectSelectedOKRChanges')
      .addItem('🗑️ Clear Change Log', 'clearOKRChangeLog'))
    .addSeparator()
    .addSubMenu(ui.createMenu('🗄️ Archives')
      .addItem('📅 View Archived Sprints', 'viewArchivedSprints')
      .addItem('📋 View Check-In History', 'viewCheckInHistory')
      .addItem('📊 Generate Archive Report', 'generateArchiveReport'))
    .addSeparator()
    .addItem('📄 Doc Activity Dashboard', 'generateDocActivityDashboard')
    .addItem('🗺️ View System Map', 'showSystemMap')
    .addSeparator()
    .addSubMenu(ui.createMenu('⚙️ Setup')
      .addItem('🚀 Initial Setup (Create Satellites)', 'initialSetup')
      .addItem('🔧 Fix Formula References', 'fixFormulaReferences')
      .addItem('📝 Update Config Email', 'promptForEmail')
      .addItem('📝 Setup OKR Change Tracking', 'setupOKRChangeTracking'))
    .addToUi();

  // Build navigation menu for internal sheets
  buildNavigationMenus_(ui);
}
 




function buildNavigationMenus_(ui) {
   const ss = SpreadsheetApp.getActiveSpreadsheet();
  
 
  // 📑 SHEETS NAVIGATION MENU
  // =========================================================================
  const sheetsMenu = ui.createMenu('📑 Sheets');
  
  // Core sheets
  sheetsMenu.addItem('🏛️ Home Base', 'navToHomeBase');
  sheetsMenu.addItem('🗂️ OS Legend', 'navToOSLegend');
  sheetsMenu.addItem('🎯 OKRs', 'navToOKRs');
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
      return numB - numA; // Most recent first
    });
    // Add most recent sprints (up to 3)
    sprintSheets.slice(0, 3).forEach((sheet, index) => {
      sheetsMenu.addItem(`📅 ${sheet.getName()}`, `navToSprint${index + 1}`);
    });
  }
  
  sheetsMenu.addSeparator();
  
  // Check-in sheets submenu
  const checkInSubMenu = ui.createMenu('🧭 Check-Ins');
  checkInSubMenu.addItem('Production Sync', 'navToProductionSync');
  checkInSubMenu.addItem('Funder (CHANEL)', 'navToFunderCheckIn');
  checkInSubMenu.addItem('Deans-Provost', 'navToDeansProvost');
  checkInSubMenu.addItem('Facilities', 'navToFacilities');
  checkInSubMenu.addItem('IT', 'navToIT');
  checkInSubMenu.addItem('Student Life', 'navToStudentLife');
  checkInSubMenu.addItem('Advisory Committee', 'navToAdvisory');
  
  sheetsMenu.addSubMenu(checkInSubMenu);
  sheetsMenu.addSeparator();
  
  // System sheets
  sheetsMenu.addItem('📋 RACI by Stakeholder', 'navToRACIList');
  // Advisory Network submenu
  const networkSubMenu = ui.createMenu('🤝 Advisory Network');
  networkSubMenu.addItem('Contact Database', 'navToAdvisoryNetwork');
  networkSubMenu.addItem('Conversation Log', 'navToConversationLog');
  networkSubMenu.addItem('Network Dashboard', 'navToNetworkDashboard');
  sheetsMenu.addSubMenu(networkSubMenu);
  
  sheetsMenu.addSeparator();
  sheetsMenu.addItem('📊 Bi-Weekly Summary', 'navToBiWeeklySummary');
  sheetsMenu.addItem('📝 OKR Change Log', 'navToOKRChangeLog');
  sheetsMenu.addItem('📄 Doc Activity', 'navToDocActivity');
  sheetsMenu.addItem('⚙️ Satellite Config', 'navToSatelliteConfig');

  sheetsMenu.addToUi();
  
  // =========================================================================
  // 📡 SATELLITES NAVIGATION MENU
  // =========================================================================
  const satellitesMenu = ui.createMenu('📡 Satellites');
  
  // Add satellite links
  satellitesMenu.addItem('🎛️ Production Sync', 'openSatelliteProduction');
  satellitesMenu.addItem('💰 Funder (CHANEL)', 'openSatelliteFunder');
  satellitesMenu.addItem('🎓 Deans-Provost', 'openSatelliteDeansProvost');
  satellitesMenu.addItem('🏗️ Facilities', 'openSatelliteFacilities');
  satellitesMenu.addItem('💻 IT', 'openSatelliteIT');
  satellitesMenu.addItem('🎒 Student Life', 'openSatelliteStudentLife');
  satellitesMenu.addItem('👥 Advisory Committee', 'openSatelliteAdvisory');
  satellitesMenu.addSeparator();
  satellitesMenu.addItem('🎯 OKRs (View Only)', 'openSatelliteOKRs');
  satellitesMenu.addSeparator();
  satellitesMenu.addItem('📋 View All Satellite Links', 'navToSatelliteConfig');
  satellitesMenu.addItem('📋 Get Satellite Tracking Script', 'getSatelliteOnEditScript');
  
  satellitesMenu.addToUi();
}


// ============================================================================
// SHEET NAVIGATION FUNCTIONS
// ============================================================================
function navToAdvisoryNetwork() { navigateToSheet_('🤝 Advisory Network'); }
function navToConversationLog() { navigateToSheet_('💬 Conversation Log'); }
function navToNetworkDashboard() { navigateToSheet_('📊 Network Dashboard'); }
function openSatelliteAdvancement() { openSatelliteByName_('Advancement Input'); }
function navToHomeBase() { navigateToSheet_('🏛️ Home Base'); }
function navToOSLegend() { navigateToSheet_('🗂️ OS Legend'); }
function navToOKRs() { navigateToSheet_('🎯 Objectives and Key Results'); }
function navToSprintPlanning() { navigateToSheet_('🗓️ Sprint Planning'); }
function navToSprintTemplate() { navigateToSheet_('⏱️ Sprint Template'); }
function navToProductionSync() { navigateToSheet_('Production Sync '); }
function navToFunderCheckIn() { navigateToSheet_(' Funder Check-In'); }
function navToDeansProvost() { navigateToSheet_(' Deans-Provost Check-In'); }
function navToFacilities() { navigateToSheet_('Facilities Check-In'); }
function navToIT() { navigateToSheet_('IT Check-In'); }
function navToStudentLife() { navigateToSheet_(' Student Life Check-In'); }
function navToAdvisory() { navigateToSheet_('Advisory Committee'); }
function navToRACIList() { navigateToSheet_('📋 RACI by Stakeholder'); }
function navToBiWeeklySummary() { navigateToSheet_('📊 Bi-Weekly Summary'); }
function navToOKRChangeLog() { navigateToSheet_('📝 OKR Change Log'); }
function navToSatelliteConfig() { navigateToSheet_('⚙️ Satellite Config'); }

// Dynamic sprint navigation (most recent 3)
function navToSprint1() { navigateToRecentSprint_(0); }
function navToSprint2() { navigateToRecentSprint_(1); }
function navToSprint3() { navigateToRecentSprint_(2); }

/**
 * Navigates to a specific sheet by name
 */
function navigateToSheet_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  if (sheet) {
    ss.setActiveSheet(sheet);
    sheet.getRange('A1').activate();
  } else {
    SpreadsheetApp.getUi().alert(`Sheet "${sheetName}" not found.\n\nIt may not have been created yet. Try running Initial Setup.`);
  }
}

/**
 * Navigates to a recent sprint sheet by index (0 = most recent)
 */
function navigateToRecentSprint_(index) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const sprintSheets = sheets.filter(s => /^Sprint \d+$/.test(s.getName()));
  
  if (sprintSheets.length > 0) {
    sprintSheets.sort((a, b) => {
      const numA = parseInt(a.getName().replace('Sprint ', ''));
      const numB = parseInt(b.getName().replace('Sprint ', ''));
      return numB - numA;
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
function openSatelliteFunder() { openSatelliteByName_('Funder (CHANEL)'); }
function openSatelliteDeansProvost() { openSatelliteByName_('Deans-Provost'); }
function openSatelliteFacilities() { openSatelliteByName_('Facilities'); }
function openSatelliteIT() { openSatelliteByName_('IT'); }
function openSatelliteStudentLife() { openSatelliteByName_('Student Life'); }
function openSatelliteAdvisory() { openSatelliteByName_('Advisory Committee'); }
function openSatelliteOKRs() { openSatelliteByName_('OKRs'); }

/**
 * Opens a satellite workbook by its check-in name
 */
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
      const url = data[i][2]; // Column C has the URL
      
      if (url) {
        // Open in new tab using HTML service
        const html = `
          <script>
            window.open('${url}', '_blank');
            google.script.host.close();
          </script>
          <p>Opening satellite workbook...</p>
          <p>If it doesn't open automatically, <a href="${url}" target="_blank">click here</a>.</p>
        `;
        const htmlOutput = HtmlService.createHtmlOutput(html)
          .setWidth(300)
          .setHeight(100);
        SpreadsheetApp.getUi().showModalDialog(htmlOutput, `Opening ${checkInName} Satellite`);
        return;
      } else {
        SpreadsheetApp.getUi().alert(
          '❌ Satellite Not Found',
          `The "${checkInName}" satellite workbook hasn't been created yet.\n\nPlease run Initial Setup first.`,
          SpreadsheetApp.getUi().ButtonSet.OK
        );
        return;
      }
    }
  }
  
  SpreadsheetApp.getUi().alert('Satellite not found in configuration.');
}


// ============================================================================
// INITIAL SETUP
// ============================================================================

/**
 * Runs the complete initial setup process
 */
function initialSetup() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '🚀 Initial Setup',
    'This will:\n\n' +
    '1. Create a configuration sheet to store satellite workbook IDs\n' +
    '2. Create 7 satellite workbooks (one per check-in type)\n' +
    '3. Set up two-way sync triggers\n' +
    '4. Fix existing formula references\n' +
    '5. Create the RACI Task List sheet\n\n' +
    'This may take a few minutes. Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    // Step 1: Create config sheet
    SpreadsheetApp.getActiveSpreadsheet().toast('Creating configuration sheet...', '⚙️ Setup', -1);
    createConfigSheet_();
    
    // Step 2: Create satellite workbooks
    SpreadsheetApp.getActiveSpreadsheet().toast('Creating satellite workbooks...', '⚙️ Setup', -1);
    createSatelliteWorkbooks_();
    
    // Step 3: Fix formula references
    SpreadsheetApp.getActiveSpreadsheet().toast('Fixing formula references...', '⚙️ Setup', -1);
    fixFormulaReferences();
    
    // Step 4: Create RACI sheet
    SpreadsheetApp.getActiveSpreadsheet().toast('Creating RACI Task List sheet...', '⚙️ Setup', -1);
    createRACISheet_();
    
    // Step 5: Initial OKR timeline update
    SpreadsheetApp.getActiveSpreadsheet().toast('Updating OKR timeline...', '⚙️ Setup', -1);
    updateOKRTimeline();
    
    SpreadsheetApp.getActiveSpreadsheet().toast('Setup complete!', '✅ Success', 5);
    
    ui.alert(
      '✅ Setup Complete!',
      'All satellite workbooks have been created.\n\n' +
      'Check the "⚙️ Satellite Config" sheet for links to each workbook.\n\n' +
      'Next steps:\n' +
      '1. Share each satellite workbook with the appropriate stakeholders\n' +
      '2. Update your notification email in Setup > Update Config Email',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    ui.alert('❌ Setup Error', 'An error occurred: ' + error.message, ui.ButtonSet.OK);
    console.error(error);
  }
}


/**
 * Creates the configuration sheet to store satellite workbook IDs
 */
function createConfigSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  
  if (!configSheet) {
    configSheet = ss.insertSheet(CONFIG.sheets.satelliteConfig);
  } else {
    configSheet.clear();
  }
  
  // Set up headers
  const headers = [['Check-In Type', 'Satellite Workbook ID', 'Satellite URL', 'Last Sync', 'Status']];
  configSheet.getRange(1, 1, 1, 5).setValues(headers);
  configSheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');
  
  // Add check-in types
  const checkInData = CONFIG.checkIns.map(c => [c.name, '', '', '', 'Not Created']);
  configSheet.getRange(2, 1, checkInData.length, 5).setValues(checkInData);
  
  // Format
  configSheet.setColumnWidth(1, 180);
  configSheet.setColumnWidth(2, 320);
  configSheet.setColumnWidth(3, 400);
  configSheet.setColumnWidth(4, 160);
  configSheet.setColumnWidth(5, 100);
  
  // Move to end
  const sheetCount = ss.getNumSheets();
  ss.setActiveSheet(configSheet);
  ss.moveActiveSheet(sheetCount);
}


/**
 * Creates all satellite workbooks
 */
function createSatelliteWorkbooks_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  const masterFolder = DriveApp.getFileById(ss.getId()).getParents().next();
  
  // Create a subfolder for satellites
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
    
    // Create new spreadsheet
    const satelliteName = `CCAT Check-In — ${checkIn.name}`;
    const satellite = SpreadsheetApp.create(satelliteName);
    const satelliteId = satellite.getId();
    
    // Move to folder
    const file = DriveApp.getFileById(satelliteId);
    file.moveTo(satelliteFolder);
    
    // Set up the satellite workbook based on type
     if (checkIn.type === 'okr') {
      setupOKRSatellite_(satellite, checkIn, ss);
    } else if (checkIn.type === 'advancement') {
      setupAdvancementSatellite_(satellite, ss.getId());
    } else {
      setupSatelliteWorkbook_(satellite, checkIn, ss.getId());
    }
    
    // Update config sheet
    configSheet.getRange(row, 2).setValue(satelliteId);
    configSheet.getRange(row, 3).setValue(satellite.getUrl());
    configSheet.getRange(row, 4).setValue(new Date());
    configSheet.getRange(row, 5).setValue('Created');
    
    // Small delay to avoid rate limits
    Utilities.sleep(1000);
  });
}


/**
 * Sets up a single satellite workbook
 */
function setupSatelliteWorkbook_(satellite, checkIn, masterId) {
  const sheet = satellite.getSheets()[0];
  sheet.setName('Check-In');
  
  // Get master spreadsheet for current sprint info
  const master = SpreadsheetApp.openById(masterId);
  const sprintInfo = getCurrentSprintInfo_(master);
  
  // Set up header section (protected)
  const headerData = [
    [checkIn.title, '', '', '', ''],
    ['Sprint:', sprintInfo.name, 'Dates:', sprintInfo.dates, ''],
    ['Intent:', sprintInfo.intent, '', '', ''],
    ['', '', '', '', ''],
    ['⚠️ Rows 1-5 are synced from Master. Edit below only.', '', '', '', ''],
    ['Meeting Outcomes (today)', '[What must be true when this meeting ends]', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['Agenda', '', '', '', ''],
    ['Topic', 'Owner', 'Prep / Notes', 'Link', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['Decisions', '', '', '', ''],
    ['Decision', 'Owner', 'Impact', 'Follow-up', 'Link'],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['Action Items', '', '', '', ''],
    ['Task', 'Owner', 'Due Date', 'Status', 'Link'],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['RACI', '', '', '', ''],
    ['Role', 'Responsible', 'Accountable', 'Consulted', 'Informed'],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['Parking Lot', '', '', '', ''],
    ['Item', 'Owner', 'Notes', 'Link', ''],
  ];
  
  sheet.getRange(1, 1, headerData.length, 5).setValues(headerData);
  
  // Format header section
  sheet.getRange('A1:E1').merge().setFontSize(16).setFontWeight('bold').setBackground('#1a73e8').setFontColor('white');
  sheet.getRange('A2:E3').setBackground('#e8f0fe');
  sheet.getRange('A5:E5').setBackground('#fff3cd').setFontStyle('italic');
  
  // Format section headers
  const sectionRows = [9, 20, 29, 38, 45];
  sectionRows.forEach(row => {
    sheet.getRange(row, 1, 1, 5).setFontWeight('bold').setBackground('#f1f3f4');
  });
  
  // Format table headers
  const tableHeaderRows = [10, 21, 30, 39, 46];
  tableHeaderRows.forEach(row => {
    sheet.getRange(row, 1, 1, 5).setFontWeight('bold').setBackground('#e8eaed');
  });
  
  // Set column widths
  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 100);
  
  // Add dropdown chips for Action Items section
  addCheckInDropdowns_(sheet);
  
  // Add protection to header rows (1-5)
  const protection = sheet.getRange('A1:E5').protect();
  protection.setDescription('Sprint info synced from Master - Do not edit');
  protection.setWarningOnly(true); // Will be set to strict after sharing
  
  // Store master ID in document properties for sync
  satellite.addEditor(Session.getActiveUser().getEmail());
  PropertiesService.getDocumentProperties().setProperty('MASTER_ID', masterId);
  PropertiesService.getDocumentProperties().setProperty('CHECK_IN_TYPE', checkIn.name);
  
  // Create onEdit trigger for this satellite
  createSatelliteTrigger_(satellite);
}


/**
 * Adds dropdown chips to check-in satellite sheets
 * @param {Sheet} sheet - The check-in sheet to add dropdowns to
 */
function addCheckInDropdowns_(sheet) {
  // Status dropdown for Action Items (Column D, rows 31-37)
  const statusOptions = ['Not Started', 'In Progress', 'Complete', 'Blocked', 'Pending'];
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(statusOptions, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('D31:D37').setDataValidation(statusRule);
  
  // Priority dropdown for Agenda items (add a Priority column F)
  // First, add Priority header to Agenda section
  sheet.getRange('F10').setValue('Priority');
  sheet.getRange('F10').setFontWeight('bold').setBackground('#e8eaed');
  
  const priorityOptions = ['P0', 'P1', 'P2', 'P3'];
  const priorityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(priorityOptions, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange('F11:F19').setDataValidation(priorityRule);
  
  // Impact dropdown for Decisions (Column C, rows 22-28)
  const impactOptions = ['High', 'Medium', 'Low'];
  const impactRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(impactOptions, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange('C22:C28').setDataValidation(impactRule);
  
  // Due Date validation for Action Items (Column C, rows 31-37) - date picker
  const dateRule = SpreadsheetApp.newDataValidation()
    .requireDate()
    .setAllowInvalid(true)
    .build();
  sheet.getRange('C31:C37').setDataValidation(dateRule);
  sheet.getRange('C31:C37').setNumberFormat('mmm d, yyyy');
  
  // Widen column F for Priority
  sheet.setColumnWidth(6, 80);
}


/**
 * Creates an installable onEdit trigger for a satellite workbook
 */
function createSatelliteTrigger_(satellite) {
  // Note: We'll use a time-based trigger instead since installable triggers
  // can't be created programmatically for other spreadsheets in the same script
  // The sync will happen via the master's "Sync All Satellites" function
}


/**
 * Sets up the OKR satellite workbook with a copy of the OKR sheet
 */
function setupOKRSatellite_(satellite, checkIn, masterSS) {
  const sheet = satellite.getSheets()[0];
  sheet.setName('OKRs');
  
  // Get the OKR data from master
  const masterOKRSheet = masterSS.getSheetByName(CONFIG.sheets.okrs);
  if (!masterOKRSheet) {
    throw new Error('OKR sheet not found in master');
  }
  
  // Copy all data from master OKR sheet
  const sourceData = masterOKRSheet.getDataRange();
  const numRows = sourceData.getNumRows();
  const numCols = sourceData.getNumColumns();
  
  // Copy values
  const values = sourceData.getValues();
  sheet.getRange(1, 1, numRows, numCols).setValues(values);
  
  // Copy formatting (backgrounds, fonts, etc.)
  const backgrounds = sourceData.getBackgrounds();
  const fontColors = sourceData.getFontColors();
  const fontWeights = sourceData.getFontWeights();
  const fontStyles = sourceData.getFontStyles();
  const horizontalAlignments = sourceData.getHorizontalAlignments();
  
  const targetRange = sheet.getRange(1, 1, numRows, numCols);
  targetRange.setBackgrounds(backgrounds);
  targetRange.setFontColors(fontColors);
  targetRange.setFontWeights(fontWeights);
  targetRange.setFontStyles(fontStyles);
  targetRange.setHorizontalAlignments(horizontalAlignments);
  
  // Copy column widths
  for (let col = 1; col <= numCols; col++) {
    const width = masterOKRSheet.getColumnWidth(col);
    sheet.setColumnWidth(col, width);
  }
  
  // Copy row heights
  for (let row = 1; row <= Math.min(numRows, 100); row++) {
    const height = masterOKRSheet.getRowHeight(row);
    sheet.setRowHeight(row, height);
  }
  
  // Add a header row indicating this is a satellite view
  sheet.insertRowBefore(1);
  sheet.getRange('A1').setValue('📡 CCAT OKR Satellite View — Synced from Master | ✏️ You can edit: Fixed Deadlines & Dependencies');
  sheet.getRange('A1:Z1').merge();
  sheet.getRange('A1').setBackground('#fff3cd').setFontWeight('bold').setFontStyle('italic');
  
  // Add last synced timestamp
  sheet.insertRowAfter(1);
  sheet.getRange('A2').setValue('Last synced: ' + new Date().toLocaleString());
  sheet.getRange('A2').setFontColor('#666666').setFontStyle('italic');
  
  // Add dropdowns ONLY for Fixed Deadline (date) and Dependencies (KR list)
  // All other fields remain read-only for stakeholders
  addOKRStakeholderDropdowns_(sheet, numRows, 2);
  
  // Highlight the editable columns so stakeholders know what they can change
  highlightEditableOKRColumns_(sheet, numRows, 2);
  
  // Store master ID for syncing
  PropertiesService.getDocumentProperties().setProperty('MASTER_ID', masterSS.getId());
  PropertiesService.getDocumentProperties().setProperty('SATELLITE_TYPE', 'okr');
}


/**
 * Adds dropdown data validations ONLY for stakeholder-editable fields in OKR satellite
 * Stakeholders can edit: Fixed Deadlines (dates) and Dependencies (KR dropdown)
 * @param {Sheet} sheet - The sheet to add dropdowns to
 * @param {number} numDataRows - Number of data rows
 * @param {number} rowOffset - Row offset (for satellite headers)
 */
function addOKRStakeholderDropdowns_(sheet, numDataRows, rowOffset) {
  rowOffset = rowOffset || 0;
  const startRow = 4 + rowOffset; // Start after header rows
  const endRow = numDataRows + rowOffset;
  
  if (endRow < startRow) return;
  
  const cols = CONFIG.okrColumns;
  
  // Fixed Deadline - Date picker (Column T + offset = 20)
  const dateRule = SpreadsheetApp.newDataValidation()
    .requireDate()
    .setAllowInvalid(true)
    .setHelpText('Enter a deadline date (e.g., Mar 15, 2026)')
    .build();
  sheet.getRange(startRow, cols.fixedDeadline, endRow - startRow + 1, 1).setDataValidation(dateRule);
  sheet.getRange(startRow, cols.fixedDeadline, endRow - startRow + 1, 1).setNumberFormat('mmm d, yyyy');
  
  // Dependencies dropdown - populate with KR numbers from the sheet
  const krNumbers = extractKRNumbers_(sheet, startRow, endRow, rowOffset);
  if (krNumbers.length > 0) {
    const dependencyRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(krNumbers, true)
      .setAllowInvalid(true) // Allow multiple or custom entries
      .setHelpText('Select a KR this item depends on')
      .build();
    sheet.getRange(startRow, cols.dependencies, endRow - startRow + 1, 1).setDataValidation(dependencyRule);
  }
}


/**
 * Highlights the editable columns in OKR satellite so stakeholders know what they can edit
 * @param {Sheet} sheet - The sheet
 * @param {number} numDataRows - Number of data rows
 * @param {number} rowOffset - Row offset
 */
function highlightEditableOKRColumns_(sheet, numDataRows, rowOffset) {
  const cols = CONFIG.okrColumns;
  const headerRow = 3 + rowOffset; // The header row in the data
  
  // Add visual indicator to editable column headers
  // Fixed Deadline header
  const deadlineHeader = sheet.getRange(headerRow, cols.fixedDeadline);
  deadlineHeader.setBackground('#E8F5E9'); // Light green = editable
  deadlineHeader.setNote('✏️ EDITABLE: Stakeholders can update deadlines');
  
  // Dependencies header  
  const depHeader = sheet.getRange(headerRow, cols.dependencies);
  depHeader.setBackground('#E8F5E9'); // Light green = editable
  depHeader.setNote('✏️ EDITABLE: Stakeholders can set dependencies');
  
  // Add light green background to editable data cells
  const startRow = 4 + rowOffset;
  const endRow = numDataRows + rowOffset;
  
  if (endRow >= startRow) {
    sheet.getRange(startRow, cols.fixedDeadline, endRow - startRow + 1, 1).setBackground('#F1F8E9');
    sheet.getRange(startRow, cols.dependencies, endRow - startRow + 1, 1).setBackground('#F1F8E9');
  }
}


/**
 * Adds dropdown data validations to OKR sheet columns (MASTER SHEET ONLY - for ED use)
 * @param {Sheet} sheet - The sheet to add dropdowns to
 * @param {number} numDataRows - Number of data rows
 * @param {number} rowOffset - Row offset (for satellite headers)
 */
function addOKRDropdowns_(sheet, numDataRows, rowOffset) {
  rowOffset = rowOffset || 0;
  const startRow = 4 + rowOffset; // Start after header rows (row 3 is typically headers in OKR sheet)
  const endRow = numDataRows + rowOffset;
  
  if (endRow < startRow) return;
  
  const cols = CONFIG.okrColumns;
  const options = CONFIG.dropdownOptions;
  
  // Priority dropdown (P0-P3)
  const priorityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(options.priority, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(startRow, cols.priority, endRow - startRow + 1, 1).setDataValidation(priorityRule);
  
  // Planning Assumption dropdown (Q1, Q2, etc.)
  const planningRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(options.planningAssumption, true)
    .setAllowInvalid(true) // Allow custom combinations
    .build();
  sheet.getRange(startRow, cols.planningAssumption, endRow - startRow + 1, 1).setDataValidation(planningRule);
  
  // Status dropdown
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(options.status, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(startRow, cols.status, endRow - startRow + 1, 1).setDataValidation(statusRule);
  
  // Confidence dropdown
  const confidenceRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(options.confidence, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(startRow, cols.confidence, endRow - startRow + 1, 1).setDataValidation(confidenceRule);
  
  // Category dropdown (for milestones)
  const categoryRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(options.category, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(startRow, cols.category, endRow - startRow + 1, 1).setDataValidation(categoryRule);
  
  // Fixed Deadline - Date picker
  const dateRule = SpreadsheetApp.newDataValidation()
    .requireDate()
    .setAllowInvalid(true)
    .build();
  sheet.getRange(startRow, cols.fixedDeadline, endRow - startRow + 1, 1).setDataValidation(dateRule);
  sheet.getRange(startRow, cols.fixedDeadline, endRow - startRow + 1, 1).setNumberFormat('mmm d, yyyy');
  
  // Dependencies dropdown - populate with KR numbers from the sheet
  const krNumbers = extractKRNumbers_(sheet, startRow, endRow, rowOffset);
  if (krNumbers.length > 0) {
    const dependencyRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(krNumbers, true)
      .setAllowInvalid(true) // Allow multiple or custom entries
      .build();
    sheet.getRange(startRow, cols.dependencies, endRow - startRow + 1, 1).setDataValidation(dependencyRule);
  }
}


/**
 * Extracts KR numbers from the OKR sheet for the dependencies dropdown
 * @param {Sheet} sheet - The sheet to extract from
 * @param {number} startRow - Start row
 * @param {number} endRow - End row  
 * @param {number} rowOffset - Row offset for satellite headers
 * @returns {string[]} Array of KR identifiers
 */
function extractKRNumbers_(sheet, startRow, endRow, rowOffset) {
  const krNumbers = [];
  const typeCol = CONFIG.okrColumns.type;
  
  // Get all values in the type column
  const typeRange = sheet.getRange(startRow, typeCol, endRow - startRow + 1, 1);
  const typeValues = typeRange.getValues();
  
  for (let i = 0; i < typeValues.length; i++) {
    const value = String(typeValues[i][0] || '').trim();
    
    // Match KR patterns like "KR1", "KR2", "KR10", etc.
    if (/^KR\d+$/i.test(value)) {
      krNumbers.push(value.toUpperCase());
    }
  }
  
  // Sort KR numbers numerically
  krNumbers.sort((a, b) => {
    const numA = parseInt(a.replace('KR', ''));
    const numB = parseInt(b.replace('KR', ''));
    return numA - numB;
  });
  
  // Add "None" option at the beginning
  krNumbers.unshift('None');
  
  return krNumbers;
}


// ============================================================================
// SPRINT MANAGEMENT
// ============================================================================

/**
 * Gets current sprint information from the master spreadsheet
 */
function getCurrentSprintInfo_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  
  // Try to get from Sprint Planning sheet first
  const planningSheet = ss.getSheetByName(CONFIG.sheets.sprintPlanning);
  
  let sprintName = '';
  let sprintDates = '';
  let sprintIntent = '';
  
  if (planningSheet) {
    sprintName = planningSheet.getRange('B4').getValue() || 'Sprint 1';
    sprintDates = planningSheet.getRange('B5').getValue() || '';
    sprintIntent = planningSheet.getRange('B6').getValue() || '';
  }
  
  // Fallback: try to find the most recent Sprint N sheet
  if (!sprintName || sprintName === 'Sprint ') {
    const sheets = ss.getSheets();
    const sprintSheets = sheets.filter(s => /^Sprint \d+$/.test(s.getName()));
    if (sprintSheets.length > 0) {
      const latestSprint = sprintSheets.sort((a, b) => {
        const numA = parseInt(a.getName().replace('Sprint ', ''));
        const numB = parseInt(b.getName().replace('Sprint ', ''));
        return numB - numA;
      })[0];
      
      sprintName = latestSprint.getName();
      sprintIntent = latestSprint.getRange('A7').getValue() || '';
    }
  }
  
  return {
    name: sprintName,
    dates: sprintDates,
    intent: sprintIntent
  };
}


/**
 * Main function: Creates new sprint and pushes to all satellites
 */
function newSprintRollover() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get current sprint info
  const currentSprint = getCurrentSprintInfo_(ss);
  
  // Ensure sprint name is a string and extract number
  const sprintNameStr = String(currentSprint.name || 'Sprint 0');
  const currentNum = parseInt(sprintNameStr.replace(/[^0-9]/g, '')) || 0;
  const newNum = currentNum + 1;
  const newSprintName = `Sprint ${newNum}`;
  
  // Prompt for new sprint details
  const response = ui.prompt(
    '🔄 New Sprint Rollover',
    `Current: ${currentSprint.name}\n\nNew sprint will be: ${newSprintName}\n\nEnter the sprint dates (e.g., "Feb 3 - Feb 14, 2026"):`,
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
    ss.toast('Capturing current agenda items for rollover...', '🔄 Sprint Rollover', -1);
    
    // Step 0: Capture current agenda items from all check-in sheets BEFORE clearing
    const rolledOverAgendas = captureCurrentAgendas_(ss);
    
    ss.toast('Archiving current sprint...', '🔄 Sprint Rollover', -1);
    
    // Step 1: Archive current sprint sheet
    archiveCurrentSprint_(ss, String(currentSprint.name || 'Sprint 0'));
    
    // Step 2: Create new sprint sheet from template
    ss.toast('Creating new sprint sheet...', '🔄 Sprint Rollover', -1);
    createNewSprintSheet_(ss, newSprintName, newDates, newIntent);
    
    // Step 3: Update Sprint Planning sheet
    ss.toast('Updating Sprint Planning...', '🔄 Sprint Rollover', -1);
    updateSprintPlanning_(ss, newSprintName, newDates, newIntent);
    
    // Step 4: Update check-in sheets in master WITH rolled over agendas
    ss.toast('Updating check-in sheets with rolled over items...', '🔄 Sprint Rollover', -1);
    updateMasterCheckInSheets_(ss, newSprintName, newDates, newIntent, rolledOverAgendas);
    
    // Step 5: Push to all satellites WITH rolled over agendas
    ss.toast('Syncing to satellite workbooks...', '🔄 Sprint Rollover', -1);
    pushToAllSatellites_(newSprintName, newDates, newIntent, rolledOverAgendas);
    
    ss.toast('Sprint rollover complete!', '✅ Success', 5);
    
    ui.alert(
      '✅ Sprint Rollover Complete!',
      `${newSprintName} has been created and pushed to all satellites.\n\n` +
      `Previous sprint "${currentSprint.name}" has been archived.`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    ui.alert('❌ Error', 'Sprint rollover failed: ' + error.message, ui.ButtonSet.OK);
    console.error(error);
  }
}


/**
 * Archives the current sprint sheet
 */
function archiveCurrentSprint_(ss, sprintName) {
  const sheet = ss.getSheetByName(sprintName);
  if (!sheet) return;
  
  // Rename to indicate archived
  const archiveName = `📁 ${sprintName} (Archived)`;
  sheet.setName(archiveName);
  
  // Move to end
  const sheetCount = ss.getNumSheets();
  ss.setActiveSheet(sheet);
  ss.moveActiveSheet(sheetCount);
  
  // Hide the sheet
  sheet.hideSheet();
}


/**
 * Captures current agenda items from all check-in sheets for rollover
 * Returns an object keyed by check-in name with agenda data
 */
function captureCurrentAgendas_(ss) {
  const agendas = {};
  
  CONFIG.checkIns.forEach(checkIn => {
    // Skip OKR satellite - it doesn't have agenda items
    if (checkIn.type === 'okr') return;
    
    const sheet = ss.getSheetByName(checkIn.activeSheet);
    if (!sheet) return;
    
    // Capture agenda items (rows 11-18, columns A-E)
    // Only capture rows that have content
    const agendaRange = sheet.getRange('A11:E18');
    const agendaData = agendaRange.getValues();
    const nonEmptyAgenda = agendaData.filter(row => row.some(cell => cell !== '' && cell !== null));
    
    // Capture action items that are NOT marked as "done" or "complete" (rows 31-37)
    const actionRange = sheet.getRange('A31:E37');
    const actionData = actionRange.getValues();
    const incompleteActions = actionData.filter(row => {
      const hasContent = row.some(cell => cell !== '' && cell !== null);
      const status = String(row[3] || '').toLowerCase().trim();
      const isComplete = status === 'done' || status === 'complete' || status === 'completed';
      return hasContent && !isComplete;
    });
    
    // Capture decisions (rows 22-27) - these roll over for reference
    const decisionsRange = sheet.getRange('A22:E27');
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


/**
 * Creates a new sprint sheet from template
 */
function createNewSprintSheet_(ss, sprintName, dates, intent) {
  const template = ss.getSheetByName(CONFIG.sheets.sprintTemplate);
  if (!template) {
    throw new Error('Sprint Template sheet not found');
  }
  
  // Duplicate template
  const newSheet = template.copyTo(ss);
  newSheet.setName(sprintName);
  
  // Update sprint info
  newSheet.getRange('A4').setValue(sprintName);
  newSheet.getRange('C3').setValue(dates);
  newSheet.getRange('A7').setValue(intent);
  
  // Move after Sprint Planning
  const planningSheet = ss.getSheetByName(CONFIG.sheets.sprintPlanning);
  const planningIndex = planningSheet.getIndex();
  ss.setActiveSheet(newSheet);
  ss.moveActiveSheet(planningIndex + 1);
  
  // Show the sheet
  newSheet.showSheet();
}


/**
 * Updates the Sprint Planning sheet with new sprint info
 */
function updateSprintPlanning_(ss, sprintName, dates, intent) {
  const sheet = ss.getSheetByName(CONFIG.sheets.sprintPlanning);
  if (!sheet) return;
  
  sheet.getRange('B4').setValue(sprintName);
  sheet.getRange('B5').setValue(dates);
  sheet.getRange('B6').setValue(intent);
}


/**
 * Updates all check-in sheets in the master workbook
 * Now includes rolled over agenda items from previous sprint
 */
function updateMasterCheckInSheets_(ss, sprintName, dates, intent, rolledOverAgendas) {
  rolledOverAgendas = rolledOverAgendas || {};
  
  CONFIG.checkIns.forEach(checkIn => {
    // Skip OKR satellite - it's handled separately
    if (checkIn.type === 'okr') return;
    
    const sheet = ss.getSheetByName(checkIn.activeSheet);
    if (!sheet) return;
    
    // Update sprint info (B2, D2, B3)
    sheet.getRange('B2').setValue(sprintName);
    sheet.getRange('D2').setValue(dates);
    sheet.getRange('B3').setValue(intent);
    
    // Get rolled over data for this check-in
    const rollover = rolledOverAgendas[checkIn.name] || { agenda: [], actions: [], decisions: [] };
    
    // Clear and repopulate agenda items (rows 11-18)
    sheet.getRange('A11:E18').clearContent();
    if (rollover.agenda.length > 0) {
      // Add a marker to show these are rolled over
      const markedAgenda = rollover.agenda.map((row, index) => {
        if (index === 0 && row[0]) {
          return ['📌 [Rolled Over] ' + row[0], row[1], row[2], row[3], row[4]];
        }
        return row;
      });
      const agendaRows = Math.min(markedAgenda.length, 8);
      sheet.getRange(11, 1, agendaRows, 5).setValues(markedAgenda.slice(0, 8));
    }
    
    // Clear decisions (we keep these fresh each sprint, but log for reference)
    sheet.getRange('A22:E27').clearContent();
    
    // Clear and repopulate incomplete action items (rows 31-37)
    sheet.getRange('A31:E37').clearContent();
    if (rollover.actions.length > 0) {
      // Mark incomplete actions as carried over
      const markedActions = rollover.actions.map(row => {
        return ['⏳ [Carried Over] ' + row[0], row[1], row[2], 'Pending', row[4]];
      });
      const actionRows = Math.min(markedActions.length, 7);
      sheet.getRange(31, 1, actionRows, 5).setValues(markedActions.slice(0, 7));
    }
  });
}


/**
 * Pushes sprint info to all satellite workbooks
 * Now includes rolled over agenda items from previous sprint
 */
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
    
    // Find the matching check-in config
    const checkIn = CONFIG.checkIns.find(c => c.name === checkInName);
    if (!checkIn) continue;
    
    try {
      // Handle OKR satellite differently
      if (checkIn.type === 'okr') {
        syncOKRSatellite_(ss, satelliteId);
        configSheet.getRange(i + 1, 4).setValue(new Date());
        configSheet.getRange(i + 1, 5).setValue('Synced');
        continue;
      }
      
      const satellite = SpreadsheetApp.openById(satelliteId);
      const sheet = satellite.getSheetByName('Check-In');
      if (!sheet) continue;
      
      // Update sprint info
      sheet.getRange('B2').setValue(sprintName);
      sheet.getRange('D2').setValue(dates);
      sheet.getRange('B3').setValue(intent);
      
      // Get rolled over data for this check-in
      const rollover = rolledOverAgendas[checkInName] || { agenda: [], actions: [], decisions: [] };
      
      // Clear and repopulate agenda items (rows 11-19)
      sheet.getRange('A11:E19').clearContent();
      if (rollover.agenda.length > 0) {
        const markedAgenda = rollover.agenda.map((row, index) => {
          if (index === 0 && row[0]) {
            return ['📌 [Rolled Over] ' + row[0], row[1], row[2], row[3], row[4]];
          }
          return row;
        });
        const agendaRows = Math.min(markedAgenda.length, 9);
        sheet.getRange(11, 1, agendaRows, 5).setValues(markedAgenda.slice(0, 9));
      }
      
      // Clear decisions
      sheet.getRange('A22:E28').clearContent();
      
      // Clear and repopulate incomplete action items (rows 31-37)
      sheet.getRange('A31:E37').clearContent();
      if (rollover.actions.length > 0) {
        const markedActions = rollover.actions.map(row => {
          return ['⏳ [Carried Over] ' + row[0], row[1], row[2], 'Pending', row[4]];
        });
        const actionRows = Math.min(markedActions.length, 7);
        sheet.getRange(31, 1, actionRows, 5).setValues(markedActions.slice(0, 7));
      }
      
      // Update sync timestamp in config
      configSheet.getRange(i + 1, 4).setValue(new Date());
      configSheet.getRange(i + 1, 5).setValue('Synced');
      
    } catch (error) {
      console.error(`Failed to sync ${data[i][0]}: ${error.message}`);
      configSheet.getRange(i + 1, 5).setValue('Sync Error');
    }
  }
}


// ============================================================================
// TWO-WAY SYNC
// ============================================================================

/**
 * Syncs all satellite workbooks back to master
 */
function syncAllSatellites() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  
  if (!configSheet) {
    SpreadsheetApp.getUi().alert('Please run Initial Setup first.');
    return;
  }
  
  ss.toast('Syncing satellites...', '🔁 Sync', -1);
  
  const data = configSheet.getDataRange().getValues();
  let syncCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const checkInName = data[i][0];
    const satelliteId = data[i][1];
    if (!satelliteId) continue;
    
    try {
      // Find the matching check-in config
      const checkIn = CONFIG.checkIns.find(c => c.name === checkInName);
      if (!checkIn) continue;
      
      // Handle OKR satellite differently (push from master TO satellite)
      if (checkIn.type === 'okr') {
        syncOKRSatellite_(ss, satelliteId);
        configSheet.getRange(i + 1, 4).setValue(new Date());
        configSheet.getRange(i + 1, 5).setValue('Synced');
        syncCount++;
        continue;
      }
      
      // Get satellite data
      const satellite = SpreadsheetApp.openById(satelliteId);
      const satSheet = satellite.getSheetByName('Check-In');
      if (!satSheet) continue;
      
      // Get master sheet
      const masterSheet = ss.getSheetByName(checkIn.activeSheet);
      if (!masterSheet) continue;
      
      // Sync editable sections from satellite to master
      // Agenda (rows 11-19)
      const agendaData = satSheet.getRange('A11:E19').getValues();
      masterSheet.getRange('A11:E19').setValues(agendaData);
      
      // Decisions (rows 22-28)
      const decisionsData = satSheet.getRange('A22:E28').getValues();
      masterSheet.getRange('A22:E28').setValues(decisionsData);
      
      // Action Items (rows 31-37)
      const actionData = satSheet.getRange('A31:E37').getValues();
      masterSheet.getRange('A31:E37').setValues(actionData);
      
      // Update sync timestamp
      configSheet.getRange(i + 1, 4).setValue(new Date());
      configSheet.getRange(i + 1, 5).setValue('Synced');
      syncCount++;
      
    } catch (error) {
      console.error(`Sync failed for ${checkInName}: ${error.message}`);
      configSheet.getRange(i + 1, 5).setValue('Error');
    }
  }
  
  ss.toast(`Synced ${syncCount} satellite workbooks`, '✅ Sync Complete', 5);
}


/**
 * Syncs OKR data FROM master TO the OKR satellite (one-way push)
 */
function syncOKRSatellite_(masterSS, satelliteId) {
  const satellite = SpreadsheetApp.openById(satelliteId);
  const satSheet = satellite.getSheetByName('OKRs');
  if (!satSheet) return;
  
  const masterOKRSheet = masterSS.getSheetByName(CONFIG.sheets.okrs);
  if (!masterOKRSheet) return;
  
  const cols = CONFIG.okrColumns;
  
  // Stakeholder-editable columns ONLY: Fixed Deadline and Dependencies
  // All other OKR fields are ED-controlled and should not sync from satellite
  const stakeholderEditableCols = [cols.fixedDeadline, cols.dependencies];
  
  const satLastRow = satSheet.getLastRow();
  const masterLastRow = masterOKRSheet.getLastRow();
  
  // Sync ONLY stakeholder-editable columns from satellite to master
  if (satLastRow > 4) { // Account for 2 header rows + original headers
    stakeholderEditableCols.forEach(col => {
      // Get satellite data (offset by 2 for header rows)
      const satRange = satSheet.getRange(5, col, satLastRow - 4, 1); // Start at row 5
      const satValues = satRange.getValues();
      
      // Write to master (starting at row 4, which is first data row)
      const rowsToWrite = Math.min(satValues.length, masterLastRow - 3);
      if (rowsToWrite > 0) {
        masterOKRSheet.getRange(4, col, rowsToWrite, 1).setValues(satValues.slice(0, rowsToWrite));
      }
    });
  }
  
  // Now push fresh data FROM master TO satellite
  // Clear existing data (except first 2 header rows we added)
  const lastCol = satSheet.getLastColumn();
  if (satLastRow > 2) {
    satSheet.getRange(3, 1, satLastRow - 2, Math.max(lastCol, 30)).clear();
  }
  
  // Copy fresh data from master
  const sourceData = masterOKRSheet.getDataRange();
  const numRows = sourceData.getNumRows();
  const numCols = sourceData.getNumColumns();
  
  // Copy values starting at row 3
  const values = sourceData.getValues();
  satSheet.getRange(3, 1, numRows, numCols).setValues(values);
  
  // Copy formatting
  const backgrounds = sourceData.getBackgrounds();
  const fontColors = sourceData.getFontColors();
  const fontWeights = sourceData.getFontWeights();
  
  const targetRange = satSheet.getRange(3, 1, numRows, numCols);
  targetRange.setBackgrounds(backgrounds);
  targetRange.setFontColors(fontColors);
  targetRange.setFontWeights(fontWeights);
  
  // Re-apply stakeholder dropdowns (Fixed Deadline + Dependencies only)
  addOKRStakeholderDropdowns_(satSheet, numRows, 2);
  
  // Re-apply editable column highlighting
  highlightEditableOKRColumns_(satSheet, numRows, 2);
  
  // Update sync timestamp in row 2
  satSheet.getRange('A2').setValue('Last synced: ' + new Date().toLocaleString() + ' | ✏️ You can edit: Fixed Deadlines (green) & Dependencies (green)');
}


/**
 * Syncs only the OKR satellite (menu item for quick updates)
 */
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
    const checkInName = data[i][0];
    const satelliteId = data[i][1];
    
    if (checkInName === 'OKRs' && satelliteId) {
      try {
        syncOKRSatellite_(ss, satelliteId);
        configSheet.getRange(i + 1, 4).setValue(new Date());
        configSheet.getRange(i + 1, 5).setValue('Synced');
        ss.toast('OKR satellite synced successfully!', '✅ Complete', 5);
        return;
      } catch (error) {
        SpreadsheetApp.getUi().alert('Error syncing OKR satellite: ' + error.message);
        configSheet.getRange(i + 1, 5).setValue('Error');
        return;
      }
    }
  }
  
  SpreadsheetApp.getUi().alert('OKR satellite not found. Please run Initial Setup.');
}


// ============================================================================
// OKR CHANGE TRACKING & APPROVAL WORKFLOW
// ============================================================================

/**
 * Sets up the OKR Change Log sheet for tracking stakeholder changes
 */
function setupOKRChangeTracking() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let logSheet = ss.getSheetByName(CONFIG.sheets.okrChangeLog);
  if (logSheet) {
    SpreadsheetApp.getUi().alert('OKR Change Log already exists.');
    return;
  }
  
  // Create the change log sheet
  logSheet = ss.insertSheet(CONFIG.sheets.okrChangeLog);
  
  // Set up headers
  const headers = [
    'Timestamp', 'Changed By', 'Email', 'KR/Row', 'Field Changed', 
    'Old Value', 'New Value', 'Status', 'Reviewed By', 'Review Date', 'Notes'
  ];
  logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  logSheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#1a73e8')
    .setFontColor('white');
  
  // Set column widths
  logSheet.setColumnWidth(1, 150); // Timestamp
  logSheet.setColumnWidth(2, 120); // Changed By
  logSheet.setColumnWidth(3, 180); // Email
  logSheet.setColumnWidth(4, 80);  // KR/Row
  logSheet.setColumnWidth(5, 120); // Field Changed
  logSheet.setColumnWidth(6, 150); // Old Value
  logSheet.setColumnWidth(7, 150); // New Value
  logSheet.setColumnWidth(8, 100); // Status
  logSheet.setColumnWidth(9, 120); // Reviewed By
  logSheet.setColumnWidth(10, 120); // Review Date
  logSheet.setColumnWidth(11, 200); // Notes
  
  // Freeze header row
  logSheet.setFrozenRows(1);
  
  // Add data validation for Status column
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pending', 'Approved', 'Rejected'], true)
    .build();
  logSheet.getRange('H2:H500').setDataValidation(statusRule);
  
  SpreadsheetApp.getUi().alert(
    '✅ OKR Change Log Created',
    'The change log sheet has been set up.\n\n' +
    'To enable automatic change detection, you need to add an onEdit trigger to the OKR satellite workbook.\n\n' +
    'See the setup instructions for details.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}


/**
 * Logs a change made in the OKR satellite
 * Called from the satellite's onEdit trigger
 */
function logOKRChange(changeData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName(CONFIG.sheets.okrChangeLog);
  
  if (!logSheet) {
    setupOKRChangeTracking();
    logSheet = ss.getSheetByName(CONFIG.sheets.okrChangeLog);
  }
  
  const newRow = [
    changeData.timestamp || new Date(),
    changeData.changedBy || 'Unknown',
    changeData.email || '',
    changeData.krRow || '',
    changeData.fieldChanged || '',
    changeData.oldValue || '',
    changeData.newValue || '',
    'Pending',
    '',
    '',
    ''
  ];
  
  logSheet.appendRow(newRow);
  
  // Highlight pending row
  const lastRow = logSheet.getLastRow();
  logSheet.getRange(lastRow, 8).setBackground('#fff3cd'); // Yellow for pending
  
  // Send notification email to ED
  sendChangeNotificationEmail_(changeData);
}


/**
 * Sends an email notification when a stakeholder makes a change
 */
function sendChangeNotificationEmail_(changeData) {
  let email = PropertiesService.getDocumentProperties().getProperty('NOTIFICATION_EMAIL');
  if (!email || email === 'YOUR_EMAIL@example.com') return;
  
  const subject = `🔔 OKR Change Pending Approval: ${changeData.fieldChanged} updated by ${changeData.changedBy}`;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: #1a73e8;">📝 OKR Change Requires Your Approval</h2>
      
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr style="background: #f1f3f4;">
          <td style="padding: 10px; font-weight: bold;">Changed By</td>
          <td style="padding: 10px;">${changeData.changedBy} (${changeData.email})</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold;">KR / Row</td>
          <td style="padding: 10px;">${changeData.krRow}</td>
        </tr>
        <tr style="background: #f1f3f4;">
          <td style="padding: 10px; font-weight: bold;">Field Changed</td>
          <td style="padding: 10px;">${changeData.fieldChanged}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold;">Old Value</td>
          <td style="padding: 10px; color: #c53929;">${changeData.oldValue || '(empty)'}</td>
        </tr>
        <tr style="background: #f1f3f4;">
          <td style="padding: 10px; font-weight: bold;">New Value</td>
          <td style="padding: 10px; color: #1e8e3e;">${changeData.newValue || '(empty)'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold;">Timestamp</td>
          <td style="padding: 10px;">${changeData.timestamp}</td>
        </tr>
      </table>
      
      <p><strong>To approve or reject:</strong></p>
      <ol>
        <li>Open your CCAT Home Base spreadsheet</li>
        <li>Go to 🎛️ CCAT System → ✅ OKR Change Approval</li>
        <li>Choose to approve or reject the change</li>
      </ol>
      
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        This notification was sent by the CCAT Operating System.
      </p>
    </div>
  `;
  
  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody
    });
  } catch (error) {
    console.error('Failed to send change notification email:', error);
  }
}


/**
 * View all pending OKR changes
 */
function viewPendingOKRChanges() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(CONFIG.sheets.okrChangeLog);
  
  if (!logSheet) {
    SpreadsheetApp.getUi().alert('No change log found. Run Setup → Setup OKR Change Tracking first.');
    return;
  }
  
  // Navigate to the log sheet
  ss.setActiveSheet(logSheet);
  
  // Count pending changes
  const data = logSheet.getDataRange().getValues();
  let pendingCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][7] === 'Pending') {
      pendingCount++;
    }
  }
  
  SpreadsheetApp.getUi().alert(
    '📋 Pending OKR Changes',
    `You have ${pendingCount} pending change(s) to review.\n\n` +
    'Select rows and use the menu to approve or reject.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}


/**
 * Approve all pending OKR changes and sync to master
 */
function approveAllOKRChanges() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const logSheet = ss.getSheetByName(CONFIG.sheets.okrChangeLog);
  
  if (!logSheet) {
    ui.alert('No change log found.');
    return;
  }
  
  const response = ui.alert(
    '✅ Approve All Changes?',
    'This will:\n' +
    '1. Mark all pending changes as Approved\n' +
    '2. Sync the OKR satellite (applying changes to Master)\n' +
    '3. Send approval notifications to stakeholders\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  ss.toast('Approving all changes...', '✅ Approval', -1);
  
  const data = logSheet.getDataRange().getValues();
  const approvedChanges = [];
  const edName = Session.getActiveUser().getEmail();
  const now = new Date();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][7] === 'Pending') {
      // Update status to Approved
      logSheet.getRange(i + 1, 8).setValue('Approved');
      logSheet.getRange(i + 1, 8).setBackground('#c6efce'); // Green
      logSheet.getRange(i + 1, 9).setValue(edName);
      logSheet.getRange(i + 1, 10).setValue(now);
      
      approvedChanges.push({
        changedBy: data[i][1],
        email: data[i][2],
        krRow: data[i][3],
        fieldChanged: data[i][4],
        oldValue: data[i][5],
        newValue: data[i][6]
      });
    }
  }
  
  // Sync the OKR satellite
  syncOKRSatelliteOnly();
  
  // Send approval notifications
  sendApprovalNotifications_(approvedChanges, true);
  
  ss.toast(`${approvedChanges.length} change(s) approved and synced!`, '✅ Complete', 5);
}


/**
 * Approve selected (highlighted) OKR changes
 */
function approveSelectedOKRChanges() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const logSheet = ss.getSheetByName(CONFIG.sheets.okrChangeLog);
  
  if (!logSheet) {
    ui.alert('No change log found.');
    return;
  }
  
  const selection = logSheet.getActiveRange();
  if (!selection) {
    ui.alert('Please select the row(s) you want to approve.');
    return;
  }
  
  const startRow = selection.getRow();
  const numRows = selection.getNumRows();
  
  if (startRow < 2) {
    ui.alert('Please select data rows (not the header).');
    return;
  }
  
  const edName = Session.getActiveUser().getEmail();
  const now = new Date();
  const approvedChanges = [];
  
  for (let i = 0; i < numRows; i++) {
    const row = startRow + i;
    const status = logSheet.getRange(row, 8).getValue();
    
    if (status === 'Pending') {
      const data = logSheet.getRange(row, 1, 1, 7).getValues()[0];
      
      logSheet.getRange(row, 8).setValue('Approved');
      logSheet.getRange(row, 8).setBackground('#c6efce');
      logSheet.getRange(row, 9).setValue(edName);
      logSheet.getRange(row, 10).setValue(now);
      
      approvedChanges.push({
        changedBy: data[1],
        email: data[2],
        krRow: data[3],
        fieldChanged: data[4],
        oldValue: data[5],
        newValue: data[6]
      });
    }
  }
  
  if (approvedChanges.length === 0) {
    ui.alert('No pending changes in selection.');
    return;
  }
  
  // Ask if they want to sync now
  const syncNow = ui.alert(
    '✅ Changes Approved',
    `${approvedChanges.length} change(s) approved.\n\n` +
    'Sync OKR satellite now to apply changes?',
    ui.ButtonSet.YES_NO
  );
  
  if (syncNow === ui.Button.YES) {
    syncOKRSatelliteOnly();
  }
  
  // Send approval notifications
  sendApprovalNotifications_(approvedChanges, true);
}


/**
 * Reject selected OKR changes
 */
function rejectSelectedOKRChanges() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const logSheet = ss.getSheetByName(CONFIG.sheets.okrChangeLog);
  
  if (!logSheet) {
    ui.alert('No change log found.');
    return;
  }
  
  const selection = logSheet.getActiveRange();
  if (!selection) {
    ui.alert('Please select the row(s) you want to reject.');
    return;
  }
  
  // Ask for rejection reason
  const reasonResponse = ui.prompt(
    '❌ Reject Changes',
    'Please provide a reason for rejection (will be sent to stakeholder):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (reasonResponse.getSelectedButton() !== ui.Button.OK) return;
  
  const reason = reasonResponse.getResponseText() || 'No reason provided';
  
  const startRow = selection.getRow();
  const numRows = selection.getNumRows();
  
  if (startRow < 2) {
    ui.alert('Please select data rows (not the header).');
    return;
  }
  
  const edName = Session.getActiveUser().getEmail();
  const now = new Date();
  const rejectedChanges = [];
  
  for (let i = 0; i < numRows; i++) {
    const row = startRow + i;
    const status = logSheet.getRange(row, 8).getValue();
    
    if (status === 'Pending') {
      const data = logSheet.getRange(row, 1, 1, 7).getValues()[0];
      
      logSheet.getRange(row, 8).setValue('Rejected');
      logSheet.getRange(row, 8).setBackground('#f4c7c3'); // Red
      logSheet.getRange(row, 9).setValue(edName);
      logSheet.getRange(row, 10).setValue(now);
      logSheet.getRange(row, 11).setValue(reason);
      
      rejectedChanges.push({
        changedBy: data[1],
        email: data[2],
        krRow: data[3],
        fieldChanged: data[4],
        oldValue: data[5],
        newValue: data[6],
        reason: reason
      });
    }
  }
  
  if (rejectedChanges.length === 0) {
    ui.alert('No pending changes in selection.');
    return;
  }
  
  // Send rejection notifications
  sendApprovalNotifications_(rejectedChanges, false);
  
  // Sync to revert changes in satellite
  const revertNow = ui.alert(
    '❌ Changes Rejected',
    `${rejectedChanges.length} change(s) rejected.\n\n` +
    'Sync OKR satellite now to revert changes in satellite?',
    ui.ButtonSet.YES_NO
  );
  
  if (revertNow === ui.Button.YES) {
    syncOKRSatelliteOnly();
  }
}


/**
 * Send approval/rejection notifications to stakeholders
 */
function sendApprovalNotifications_(changes, approved) {
  // Group changes by email
  const changesByEmail = {};
  
  changes.forEach(change => {
    if (!change.email) return;
    if (!changesByEmail[change.email]) {
      changesByEmail[change.email] = {
        name: change.changedBy,
        changes: []
      };
    }
    changesByEmail[change.email].changes.push(change);
  });
  
  // Send email to each stakeholder
  Object.keys(changesByEmail).forEach(email => {
    const stakeholder = changesByEmail[email];
    const statusText = approved ? 'Approved ✅' : 'Rejected ❌';
    const statusColor = approved ? '#1e8e3e' : '#c53929';
    
    const subject = `CCAT OKR Change ${approved ? 'Approved' : 'Rejected'}: Your updates have been reviewed`;
    
    let changesHtml = '';
    stakeholder.changes.forEach(c => {
      changesHtml += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${c.krRow}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${c.fieldChanged}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${c.oldValue || '(empty)'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${c.newValue || '(empty)'}</td>
          ${!approved ? `<td style="padding: 8px; border: 1px solid #ddd;">${c.reason || ''}</td>` : ''}
        </tr>
      `;
    });
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 700px;">
        <h2 style="color: ${statusColor};">Your OKR Changes: ${statusText}</h2>
        
        <p>Hi ${stakeholder.name},</p>
        
        <p>Your recent changes to the CCAT OKR satellite have been <strong style="color: ${statusColor};">${approved ? 'approved' : 'rejected'}</strong>.</p>
        
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="background: #1a73e8; color: white;">
            <th style="padding: 10px; border: 1px solid #ddd;">KR/Row</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Field</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Old Value</th>
            <th style="padding: 10px; border: 1px solid #ddd;">New Value</th>
            ${!approved ? '<th style="padding: 10px; border: 1px solid #ddd;">Reason</th>' : ''}
          </tr>
          ${changesHtml}
        </table>
        
        ${approved ? 
          '<p>Your changes have been synced to the master OKR sheet.</p>' : 
          '<p>Your changes have been reverted. Please reach out if you have questions about the rejection.</p>'
        }
        
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          This notification was sent by the CCAT Operating System.
        </p>
      </div>
    `;
    
    try {
      MailApp.sendEmail({
        to: email,
        subject: subject,
        htmlBody: htmlBody
      });
    } catch (error) {
      console.error('Failed to send notification to ' + email + ':', error);
    }
  });
}


/**
 * Clear the OKR change log (approved/rejected entries only)
 */
function clearOKRChangeLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const logSheet = ss.getSheetByName(CONFIG.sheets.okrChangeLog);
  
  if (!logSheet) {
    ui.alert('No change log found.');
    return;
  }
  
  const response = ui.alert(
    '🗑️ Clear Change Log?',
    'This will delete all APPROVED and REJECTED entries.\n' +
    'Pending entries will be kept.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  const data = logSheet.getDataRange().getValues();
  const rowsToDelete = [];
  
  // Find rows to delete (from bottom to top to preserve indices)
  for (let i = data.length - 1; i >= 1; i--) {
    const status = data[i][7];
    if (status === 'Approved' || status === 'Rejected') {
      rowsToDelete.push(i + 1);
    }
  }
  
  // Delete rows
  rowsToDelete.forEach(row => {
    logSheet.deleteRow(row);
  });
  
  ss.toast(`Cleared ${rowsToDelete.length} processed entries.`, '🗑️ Cleared', 5);
}


/**
 * This function should be installed as an onEdit trigger in the OKR SATELLITE workbook
 * Copy this to the satellite's Apps Script and create an installable onEdit trigger
 * 
 * SATELLITE SCRIPT - Copy to OKR Satellite workbook:
 * 
 * function onEditTrigger(e) {
 *   const sheet = e.source.getActiveSheet();
 *   if (sheet.getName() !== 'OKRs') return;
 *   
 *   const range = e.range;
 *   const row = range.getRow();
 *   const col = range.getColumn();
 *   
 *   // Only track changes to editable columns (Fixed Deadline=20, Dependencies=26)
 *   // Offset by 2 for satellite header rows
 *   if (row < 5) return; // Header rows
 *   if (col !== 20 && col !== 26) return; // Not an editable column
 *   
 *   const user = Session.getActiveUser().getEmail();
 *   const krCell = sheet.getRange(row, 1).getValue(); // KR number
 *   const fieldName = col === 20 ? 'Fixed Deadline' : 'Dependencies';
 *   
 *   // Get the master spreadsheet ID from document properties
 *   const masterId = PropertiesService.getDocumentProperties().getProperty('MASTER_ID');
 *   if (!masterId) return;
 *   
 *   try {
 *     const masterSS = SpreadsheetApp.openById(masterId);
 *     const logSheet = masterSS.getSheetByName('📝 OKR Change Log');
 *     if (!logSheet) return;
 *     
 *     logSheet.appendRow([
 *       new Date(),
 *       user.split('@')[0], // Name part of email
 *       user,
 *       krCell || 'Row ' + (row - 2),
 *       fieldName,
 *       e.oldValue || '',
 *       e.value || '',
 *       'Pending',
 *       '',
 *       '',
 *       ''
 *     ]);
 *     
 *     // Highlight as pending
 *     const lastRow = logSheet.getLastRow();
 *     logSheet.getRange(lastRow, 8).setBackground('#fff3cd');
 *     
 *   } catch (error) {
 *     console.error('Failed to log change:', error);
 *   }
 * }
 */
function getSatelliteOnEditScript() {
  const script = `
// ============================================================================
// CCAT OKR SATELLITE - CHANGE TRACKING SCRIPT
// ============================================================================
// 
// INSTALLATION:
// 1. Open your OKR Satellite workbook
// 2. Go to Extensions > Apps Script
// 3. Paste this entire script
// 4. Save
// 5. Go to Triggers (clock icon) > Add Trigger
// 6. Choose: onEditTrigger, Head, From spreadsheet, On edit
// 7. Save and authorize
//
// ============================================================================

function onEditTrigger(e) {
  if (!e || !e.range) return;
  
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== 'OKRs') return;
  
  const range = e.range;
  const row = range.getRow();
  const col = range.getColumn();
  
  // Only track changes to editable columns
  // Fixed Deadline = column 20, Dependencies = column 26
  // Row offset: satellite has 2 header rows, so data starts at row 5
  if (row < 5) return;
  if (col !== 20 && col !== 26) return;
  
  const user = Session.getActiveUser().getEmail();
  const userName = user ? user.split('@')[0] : 'Unknown';
  const krCell = sheet.getRange(row, 1).getValue();
  const fieldName = col === 20 ? 'Fixed Deadline' : 'Dependencies';
  
  // Get the master spreadsheet ID
  const masterId = PropertiesService.getDocumentProperties().getProperty('MASTER_ID');
  if (!masterId) {
    console.log('Master ID not found in document properties');
    return;
  }
  
  try {
    const masterSS = SpreadsheetApp.openById(masterId);
    let logSheet = masterSS.getSheetByName('📝 OKR Change Log');
    
    if (!logSheet) {
      // Create the log sheet if it doesn't exist
      logSheet = masterSS.insertSheet('📝 OKR Change Log');
      const headers = ['Timestamp', 'Changed By', 'Email', 'KR/Row', 'Field Changed', 
                       'Old Value', 'New Value', 'Status', 'Reviewed By', 'Review Date', 'Notes'];
      logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      logSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a73e8').setFontColor('white');
    }
    
    // Format the values
    let oldVal = e.oldValue || '';
    let newVal = e.value || '';
    
    // Format dates nicely
    if (col === 20) { // Fixed Deadline
      if (newVal instanceof Date) {
        newVal = Utilities.formatDate(newVal, Session.getScriptTimeZone(), 'MMM d, yyyy');
      }
    }
    
    // Append the change
    logSheet.appendRow([
      new Date(),
      userName,
      user,
      krCell || 'Row ' + (row - 2),
      fieldName,
      oldVal,
      newVal,
      'Pending',
      '',
      '',
      ''
    ]);
    
    // Highlight as pending
    const lastRow = logSheet.getLastRow();
    logSheet.getRange(lastRow, 8).setBackground('#fff3cd');
    
    // Send notification email to ED
    sendChangeNotification_(masterSS, {
      changedBy: userName,
      email: user,
      krRow: krCell || 'Row ' + (row - 2),
      fieldChanged: fieldName,
      oldValue: oldVal,
      newValue: newVal,
      timestamp: new Date().toLocaleString()
    });
    
  } catch (error) {
    console.error('Failed to log change to master:', error);
  }
}

function sendChangeNotification_(masterSS, changeData) {
  // Get ED email from master properties
  const email = PropertiesService.getScriptProperties().getProperty('NOTIFICATION_EMAIL');
  if (!email) return;
  
  const subject = '🔔 OKR Change Pending: ' + changeData.fieldChanged + ' updated by ' + changeData.changedBy;
  
  const body = 
    'A stakeholder has made a change to the OKR satellite that requires your approval.\\n\\n' +
    'Changed By: ' + changeData.changedBy + ' (' + changeData.email + ')\\n' +
    'KR/Row: ' + changeData.krRow + '\\n' +
    'Field: ' + changeData.fieldChanged + '\\n' +
    'Old Value: ' + (changeData.oldValue || '(empty)') + '\\n' +
    'New Value: ' + (changeData.newValue || '(empty)') + '\\n' +
    'Time: ' + changeData.timestamp + '\\n\\n' +
    'To approve or reject, open your CCAT Home Base and go to:\\n' +
    '🎛️ CCAT System → ✅ OKR Change Approval';
  
  try {
    MailApp.sendEmail(email, subject, body);
  } catch (e) {
    console.log('Could not send email notification');
  }
}
`;
  
  // Show the script in a dialog
  const htmlOutput = HtmlService.createHtmlOutput(
    '<h3>Copy this script to your OKR Satellite workbook:</h3>' +
    '<textarea style="width:100%; height:400px; font-family:monospace; font-size:11px;">' + 
    script.replace(/</g, '&lt;').replace(/>/g, '&gt;') + 
    '</textarea>' +
    '<p><strong>Installation:</strong></p>' +
    '<ol>' +
    '<li>Open the OKR Satellite workbook</li>' +
    '<li>Go to Extensions → Apps Script</li>' +
    '<li>Delete any existing code and paste this script</li>' +
    '<li>Save</li>' +
    '<li>Click the clock icon (Triggers) → Add Trigger</li>' +
    '<li>Set: onEditTrigger | Head | From spreadsheet | On edit</li>' +
    '<li>Save and authorize when prompted</li>' +
    '</ol>'
  )
  .setWidth(700)
  .setHeight(600);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, '📋 OKR Satellite Change Tracking Script');
}


// ============================================================================
// OKR TIMELINE
// ============================================================================

/**
 * Updates the OKR timeline with quarter shading and milestone emojis
 */
function updateOKRTimeline() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.okrs);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('OKR sheet not found');
    return;
  }
  
  ss.toast('Updating OKR timeline...', '🎯 OKR Update', -1);
  
  const data = sheet.getDataRange().getValues();
  const cols = CONFIG.okrColumns;
  
  // Clear existing timeline formatting (columns 28-39, rows 4+)
  const timelineRange = sheet.getRange(4, 28, data.length - 3, 12);
  timelineRange.setBackground(null);
  timelineRange.clearContent();
  timelineRange.setFontWeight('normal');
  timelineRange.setHorizontalAlignment('center');
  timelineRange.setVerticalAlignment('middle');
  
  // Process each row
  for (let rowIndex = 3; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    const rowNum = rowIndex + 1; // 1-indexed for sheet
    
    // Get planning assumption (e.g., "Q1, Q2", "Q3")
    const planningAssumption = row[cols.planningAssumption - 1];
    if (!planningAssumption || planningAssumption === 'Planning Assumption') continue;
    
    // Parse quarters
    const quarters = String(planningAssumption).split(',').map(q => q.trim());
    
    // Apply shading for each quarter
    quarters.forEach(quarter => {
      const monthCols = CONFIG.quarterMonths[quarter];
      if (!monthCols) return;
      
      const color = CONFIG.quarterColors[quarter];
      monthCols.forEach(col => {
        sheet.getRange(rowNum, col).setBackground(color);
    });
    });
    
    // Check for fixed deadline and category
    const fixedDeadline = row[cols.fixedDeadline - 1];
    const category = row[cols.category - 1];
    
    if (fixedDeadline && category && category !== 'Category (if fixed deadline)') {
      // Parse the date to get the month
      let deadlineDate;
      if (fixedDeadline instanceof Date) {
        deadlineDate = fixedDeadline;
      } else {
        deadlineDate = new Date(fixedDeadline);
      }
      
      if (!isNaN(deadlineDate.getTime())) {
        const month = deadlineDate.getMonth() + 1; // 1-indexed
        const monthCol = CONFIG.monthColumns[month];
        
        if (monthCol) {
          const emoji = CONFIG.categoryEmojis[category] || '📌';
          const cell = sheet.getRange(rowNum, monthCol);
          
          // Make emoji pop: white background circle effect + larger font
          cell.setValue(emoji);
          cell.setBackground('#FFFFFF');  // White background to create "badge" effect
          cell.setFontSize(14);           // Larger emoji
          cell.setFontWeight('bold');
          cell.setBorder(true, true, true, true, false, false, '#000000', SpreadsheetApp.BorderStyle.SOLID);
        }
      }
    }
  }
  
  ss.toast('OKR timeline updated!', '✅ Complete', 5);
}


// ============================================================================
// RACI TASK LIST
// ============================================================================

/**
 * Creates the RACI sheet if it doesn't exist
 */
function createRACISheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let raciSheet = ss.getSheetByName(CONFIG.sheets.raciTaskList);
  
  if (!raciSheet) {
    raciSheet = ss.insertSheet(CONFIG.sheets.raciTaskList);
    
    // Move after OKRs
    const okrSheet = ss.getSheetByName(CONFIG.sheets.okrs);
    if (okrSheet) {
      const okrIndex = okrSheet.getIndex();
      ss.setActiveSheet(raciSheet);
      ss.moveActiveSheet(okrIndex + 1);
    }
  }
  
  return raciSheet;
}


/**
 * Generates the RACI Task List grouped by stakeholder
 */
function generateRACITaskList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const okrSheet = ss.getSheetByName(CONFIG.sheets.okrs);
  
  if (!okrSheet) {
    SpreadsheetApp.getUi().alert('OKR sheet not found');
    return;
  }
  
  ss.toast('Generating RACI Task List...', '📋 RACI', -1);
  
  // Get or create RACI sheet
  let raciSheet = ss.getSheetByName(CONFIG.sheets.raciTaskList);
  if (!raciSheet) {
    raciSheet = createRACISheet_();
  }
  raciSheet.clear();
  
  // Get OKR data
  const data = okrSheet.getDataRange().getValues();
  const cols = CONFIG.okrColumns;
  
  // Build stakeholder map
  const stakeholderMap = {};
  
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    const type = row[cols.type - 1];
    const description = row[cols.description - 1];
    const status = row[cols.status - 1];
    const priority = row[cols.priority - 1];
    
    // Skip header/empty rows
    if (!type || type === 'Objective:' || type === 'Key Result:') continue;
    
    const taskInfo = {
      type: type,
      description: description || type,
      status: status,
      priority: priority,
      row: i + 1
    };
    
    // Process each RACI column
    const raciTypes = [
      { col: cols.responsible, type: 'R' },
      { col: cols.accountable, type: 'A' },
      { col: cols.consulted, type: 'C' },
      { col: cols.informed, type: 'I' }
    ];
    
    raciTypes.forEach(raci => {
      const value = row[raci.col - 1];
      if (!value || value === 'Responsible' || value === 'Acountable' || 
          value === 'Consulted' || value === 'Informed') return;
      
      // Split by comma for multiple stakeholders
      const stakeholders = String(value).split(',').map(s => s.trim());
      
      stakeholders.forEach(stakeholder => {
        if (!stakeholderMap[stakeholder]) {
          stakeholderMap[stakeholder] = { R: [], A: [], C: [], I: [] };
        }
        stakeholderMap[stakeholder][raci.type].push(taskInfo);
      });
    });
  }
  
  // Build output
  const output = [];
  let currentRow = 1;
  
  // Title
  output.push(['📋 RACI TASK LIST BY STAKEHOLDER', '', '', '']);
  output.push(['Generated: ' + new Date().toLocaleString(), '', '', '']);
  output.push(['', '', '', '']);
  
  // Sort stakeholders alphabetically
  const sortedStakeholders = Object.keys(stakeholderMap).sort();
  
  sortedStakeholders.forEach(stakeholder => {
    const tasks = stakeholderMap[stakeholder];
    
    // Stakeholder header
    output.push(['👤 ' + stakeholder.toUpperCase(), '', '', '']);
    output.push(['─'.repeat(50), '', '', '']);
    
    // Responsible
    output.push(['[R] RESPONSIBLE:', '', '', '']);
    if (tasks.R.length === 0) {
      output.push(['    (none)', '', '', '']);
    } else {
      tasks.R.forEach(task => {
        output.push([`    • ${task.type}: ${task.description.substring(0, 80)}...`, task.priority, task.status, '']);
      });
    }
    output.push(['', '', '', '']);
    
    // Accountable
    output.push(['[A] ACCOUNTABLE:', '', '', '']);
    if (tasks.A.length === 0) {
      output.push(['    (none)', '', '', '']);
    } else {
      tasks.A.forEach(task => {
        output.push([`    • ${task.type}: ${task.description.substring(0, 80)}...`, task.priority, task.status, '']);
      });
    }
    output.push(['', '', '', '']);
    
    // Consulted
    output.push(['[C] CONSULTED:', '', '', '']);
    if (tasks.C.length === 0) {
      output.push(['    (none)', '', '', '']);
    } else {
      tasks.C.forEach(task => {
        output.push([`    • ${task.type}: ${task.description.substring(0, 80)}...`, task.priority, task.status, '']);
      });
    }
    output.push(['', '', '', '']);
    
    // Informed
    output.push(['[I] INFORMED:', '', '', '']);
    if (tasks.I.length === 0) {
      output.push(['    (none)', '', '', '']);
    } else {
      tasks.I.forEach(task => {
        output.push([`    • ${task.type}: ${task.description.substring(0, 80)}...`, task.priority, task.status, '']);
      });
    }
    
    // Separator
    output.push(['', '', '', '']);
    output.push(['━'.repeat(60), '', '', '']);
    output.push(['', '', '', '']);
  });
  
  // Write to sheet
  raciSheet.getRange(1, 1, output.length, 4).setValues(output);
  
  // Format
  raciSheet.getRange('A1').setFontSize(16).setFontWeight('bold');
  raciSheet.getRange('A2').setFontStyle('italic').setFontColor('#666666');
  raciSheet.setColumnWidth(1, 600);
  raciSheet.setColumnWidth(2, 80);
  raciSheet.setColumnWidth(3, 100);
  
  // Format stakeholder headers
  const values = raciSheet.getDataRange().getValues();
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] && values[i][0].toString().startsWith('👤')) {
      raciSheet.getRange(i + 1, 1).setFontWeight('bold').setFontSize(12).setBackground('#e8f0fe');
    }
    if (values[i][0] && values[i][0].toString().startsWith('[')) {
      raciSheet.getRange(i + 1, 1).setFontWeight('bold').setFontColor('#1a73e8');
    }
  }
  
  ss.toast('RACI Task List generated!', '✅ Complete', 5);
}


// ============================================================================
// FIX FORMULA REFERENCES
// ============================================================================

/**
 * Fixes the #REF! and #ERROR! issues in check-in sheets
 */
function fixFormulaReferences() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  ss.toast('Fixing formula references...', '🔧 Fix', -1);
  
  const sprintInfo = getCurrentSprintInfo_(ss);
  
  // Update each check-in sheet with direct values instead of broken formulas
  CONFIG.checkIns.forEach(checkIn => {
    // Fix template
    const template = ss.getSheetByName(checkIn.templateSheet);
    if (template) {
      template.getRange('B2').setValue(sprintInfo.name);
      template.getRange('D2').setValue(sprintInfo.dates);
      template.getRange('B3').setValue(sprintInfo.intent);
    }
    
    // Fix active sheet
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
// BI-WEEKLY SUMMARY FOR CHANEL DECK
// ============================================================================

/**
 * Generates a summary sheet that Google Slides can link to for the bi-weekly CHANEL update
 * This creates structured data tables that update automatically
 */
function generateBiWeeklySummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  ss.toast('Generating bi-weekly summary...', '📊 Summary', -1);
  
  // Get or create summary sheet
  let summarySheet = ss.getSheetByName('📊 Bi-Weekly Summary');
  if (!summarySheet) {
    summarySheet = ss.insertSheet('📊 Bi-Weekly Summary');
  }
  summarySheet.clear();
  
  // Gather data
  const sprintInfo = getCurrentSprintInfo_(ss);
  const okrSheet = ss.getSheetByName(CONFIG.sheets.okrs);
  
  // Count statuses and priorities
  let statusCounts = { 'Not Started': 0, 'In Progress': 0, 'Complete': 0, 'Blocked': 0 };
  let priorityCounts = { 'P0': 0, 'P1': 0, 'P2': 0, 'P3': 0 };
  let upcomingMilestones = [];
  let timelineData = [];
  
  if (okrSheet) {
    const data = okrSheet.getDataRange().getValues();
    const cols = CONFIG.okrColumns;
    
    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      const type = row[cols.type - 1];
      const desc = row[cols.description - 1];
      const status = row[cols.status - 1];
      const priority = row[cols.priority - 1];
      const deadline = row[cols.fixedDeadline - 1];
      const category = row[cols.category - 1];
      const planning = row[cols.planningAssumption - 1];
      
      if (status && statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      }
      if (priority && priorityCounts.hasOwnProperty(priority)) {
        priorityCounts[priority]++;
      }
      
      // Collect timeline items (items with deadlines)
      if (deadline && category) {
        const deadlineDate = new Date(deadline);
        if (!isNaN(deadlineDate.getTime())) {
          timelineData.push({
            month: deadlineDate.toLocaleString('default', { month: 'short' }),
            year: deadlineDate.getFullYear(),
            item: type || desc,
            category: category,
            emoji: CONFIG.categoryEmojis[category] || '📌'
          });
        }
      }
      
      // Upcoming milestones (next 30 days)
      if (deadline) {
        const deadlineDate = new Date(deadline);
        const today = new Date();
        const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        if (deadlineDate >= today && deadlineDate <= thirtyDays) {
          upcomingMilestones.push({
            date: deadlineDate.toLocaleDateString(),
            item: `${type}: ${desc ? desc.substring(0, 60) : 'No description'}`,
            category: category
          });
        }
      }
    }
  }
  
  // Build summary sheet
  let currentRow = 1;
  
  // Header
  summarySheet.getRange(currentRow, 1).setValue('📊 CCAT BI-WEEKLY SUMMARY');
  summarySheet.getRange(currentRow, 1).setFontSize(16).setFontWeight('bold');
  currentRow += 1;
  
  summarySheet.getRange(currentRow, 1).setValue('Generated: ' + new Date().toLocaleString());
  summarySheet.getRange(currentRow, 1).setFontStyle('italic').setFontColor('#666666');
  currentRow += 2;
  
  // Sprint Info Section (for linking)
  summarySheet.getRange(currentRow, 1).setValue('SPRINT INFO');
  summarySheet.getRange(currentRow, 1, 1, 2).setBackground('#000000').setFontColor('#FFFFFF').setFontWeight('bold');
  currentRow += 1;
  
  summarySheet.getRange(currentRow, 1, 3, 2).setValues([
    ['Sprint:', sprintInfo.name],
    ['Dates:', sprintInfo.dates],
    ['Intent:', sprintInfo.intent]
  ]);
  currentRow += 4;
  
  // Status Summary (for chart linking)
  summarySheet.getRange(currentRow, 1).setValue('STATUS SUMMARY');
  summarySheet.getRange(currentRow, 1, 1, 2).setBackground('#000000').setFontColor('#FFFFFF').setFontWeight('bold');
  currentRow += 1;
  
  summarySheet.getRange(currentRow, 1, 4, 2).setValues([
    ['✅ Complete', statusCounts['Complete']],
    ['🔄 In Progress', statusCounts['In Progress']],
    ['⏸️ Not Started', statusCounts['Not Started']],
    ['🚫 Blocked', statusCounts['Blocked']]
  ]);
  currentRow += 5;
  
  // Priority Breakdown (for chart linking)
  summarySheet.getRange(currentRow, 1).setValue('PRIORITY BREAKDOWN');
  summarySheet.getRange(currentRow, 1, 1, 2).setBackground('#000000').setFontColor('#FFFFFF').setFontWeight('bold');
  currentRow += 1;
  
  summarySheet.getRange(currentRow, 1, 4, 2).setValues([
    ['P0 (Critical)', priorityCounts['P0']],
    ['P1 (High)', priorityCounts['P1']],
    ['P2 (Medium)', priorityCounts['P2']],
    ['P3 (Low)', priorityCounts['P3']]
  ]);
  currentRow += 5;
  
  // Timeline Summary (for embedding in deck)
  summarySheet.getRange(currentRow, 1).setValue('UPCOMING MILESTONES (30 DAYS)');
  summarySheet.getRange(currentRow, 1, 1, 4).setBackground('#C9A227').setFontColor('#000000').setFontWeight('bold');
  currentRow += 1;
  
  summarySheet.getRange(currentRow, 1, 1, 4).setValues([['Date', 'Milestone', 'Category', 'Status']]);
  summarySheet.getRange(currentRow, 1, 1, 4).setFontWeight('bold').setBackground('#E8E8E8');
  currentRow += 1;
  
  if (upcomingMilestones.length > 0) {
    const milestoneRows = upcomingMilestones.map(m => [m.date, m.item, m.category || '', 'Upcoming']);
    summarySheet.getRange(currentRow, 1, milestoneRows.length, 4).setValues(milestoneRows);
    currentRow += milestoneRows.length + 1;
  } else {
    summarySheet.getRange(currentRow, 1).setValue('No milestones in the next 30 days');
    currentRow += 2;
  }
  
  // Quarterly Timeline Visual (simplified for linking)
  currentRow += 1;
  summarySheet.getRange(currentRow, 1).setValue('2026 QUARTERLY TIMELINE');
  summarySheet.getRange(currentRow, 1, 1, 5).setBackground('#000000').setFontColor('#FFFFFF').setFontWeight('bold');
  currentRow += 1;
  
  // Quarter headers
  summarySheet.getRange(currentRow, 1, 1, 5).setValues([['', 'Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)']]);
  summarySheet.getRange(currentRow, 2, 1, 4).setBackground('#2D2D2D').setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center');
  currentRow += 1;
  
  // Quarter colors for visual reference
  summarySheet.getRange(currentRow, 1).setValue('Timeline Color');
  summarySheet.getRange(currentRow, 2).setBackground(CONFIG.quarterColors['Q1']);
  summarySheet.getRange(currentRow, 3).setBackground(CONFIG.quarterColors['Q2']);
  summarySheet.getRange(currentRow, 4).setBackground(CONFIG.quarterColors['Q3']);
  summarySheet.getRange(currentRow, 5).setBackground(CONFIG.quarterColors['Q4']);
  currentRow += 2;
  
  // Legend
  summarySheet.getRange(currentRow, 1).setValue('MILESTONE LEGEND');
  summarySheet.getRange(currentRow, 1, 1, 2).setFontWeight('bold');
  currentRow += 1;
  
  const legendData = [
    ['🎪 Event', 'Scheduled event or production'],
    ['💬 Update', 'Status update or checkpoint'],
    ['📣 Comms', 'Communications milestone'],
    ['⭐ Key Milestone', 'Critical deliverable']
  ];
  summarySheet.getRange(currentRow, 1, legendData.length, 2).setValues(legendData);
  
  // Format columns
  summarySheet.setColumnWidth(1, 180);
  summarySheet.setColumnWidth(2, 250);
  summarySheet.setColumnWidth(3, 150);
  summarySheet.setColumnWidth(4, 150);
  summarySheet.setColumnWidth(5, 150);
  
  ss.toast('Bi-weekly summary generated!', '✅ Complete', 5);
  
  ui.alert(
    '📊 Summary Generated',
    'The "📊 Bi-Weekly Summary" sheet has been created/updated.\n\n' +
    'To embed in Google Slides:\n' +
    '1. Open your CHANEL update deck in Google Slides\n' +
    '2. Insert → Chart → From Sheets\n' +
    '3. Select this workbook and the summary tables\n' +
    '4. Charts will auto-update when you regenerate this summary\n\n' +
    'Tip: Run this every Tuesday before your Wednesday CHANEL meeting.',
    ui.ButtonSet.OK
  );
}


// ============================================================================
// EMAIL NOTIFICATIONS
// ============================================================================

/**
 * Sends a status summary email
 */
function sendStatusSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  // Check for email
  let email = PropertiesService.getDocumentProperties().getProperty('NOTIFICATION_EMAIL');
  if (!email || email === 'YOUR_EMAIL@example.com') {
    const response = ui.prompt(
      '📧 Email Required',
      'Enter your email address for notifications:',
      ui.ButtonSet.OK_CANCEL
    );
    if (response.getSelectedButton() !== ui.Button.OK) return;
    email = response.getResponseText();
    PropertiesService.getDocumentProperties().setProperty('NOTIFICATION_EMAIL', email);
  }
  
  ss.toast('Generating status summary...', '📧 Email', -1);
  
  // Gather data
  const sprintInfo = getCurrentSprintInfo_(ss);
  const okrSheet = ss.getSheetByName(CONFIG.sheets.okrs);
  
  // Count statuses
  let statusCounts = { 'Not Started': 0, 'In Progress': 0, 'Complete': 0, 'Blocked': 0 };
  let priorityCounts = { 'P0': 0, 'P1': 0, 'P2': 0, 'P3': 0 };
  let upcomingMilestones = [];
  
  if (okrSheet) {
    const data = okrSheet.getDataRange().getValues();
    const cols = CONFIG.okrColumns;
    
    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      const status = row[cols.status - 1];
      const priority = row[cols.priority - 1];
      const deadline = row[cols.fixedDeadline - 1];
      const type = row[cols.type - 1];
      const desc = row[cols.description - 1];
      
      if (status && statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      }
      if (priority && priorityCounts.hasOwnProperty(priority)) {
        priorityCounts[priority]++;
      }
      
      // Check for upcoming milestones (next 14 days)
      if (deadline) {
        const deadlineDate = new Date(deadline);
        const today = new Date();
        const twoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
        
        if (deadlineDate >= today && deadlineDate <= twoWeeks) {
          upcomingMilestones.push({
            date: deadlineDate.toLocaleDateString(),
            item: `${type}: ${desc ? desc.substring(0, 50) : 'No description'}...`
          });
        }
      }
    }
  }
  
  // Build email
  const subject = `📊 CCAT ${sprintInfo.name} Status Summary`;
  
  let body = `
<h2>🏛️ CCAT Sprint Status Summary</h2>
<p><strong>Sprint:</strong> ${sprintInfo.name}</p>
<p><strong>Dates:</strong> ${sprintInfo.dates}</p>
<p><strong>Intent:</strong> ${sprintInfo.intent}</p>

<h3>📈 OKR Status Overview</h3>
<ul>
  <li>✅ Complete: ${statusCounts['Complete']}</li>
  <li>🔄 In Progress: ${statusCounts['In Progress']}</li>
  <li>⏸️ Not Started: ${statusCounts['Not Started']}</li>
  <li>🚫 Blocked: ${statusCounts['Blocked']}</li>
</ul>

<h3>🎯 Priority Breakdown</h3>
<ul>
  <li>P0 (Critical): ${priorityCounts['P0']}</li>
  <li>P1 (High): ${priorityCounts['P1']}</li>
  <li>P2 (Medium): ${priorityCounts['P2']}</li>
  <li>P3 (Low): ${priorityCounts['P3']}</li>
</ul>

<h3>📅 Upcoming Milestones (Next 14 Days)</h3>
`;
  
  if (upcomingMilestones.length === 0) {
    body += '<p>No milestones in the next 14 days.</p>';
  } else {
    body += '<ul>';
    upcomingMilestones.forEach(m => {
      body += `<li><strong>${m.date}:</strong> ${m.item}</li>`;
    });
    body += '</ul>';
  }
  
  body += `
<hr>
<p><a href="${ss.getUrl()}">Open CCAT Home Base</a></p>
<p><em>Generated: ${new Date().toLocaleString()}</em></p>
`;
  
  // Send email
  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: body
  });
  
  ss.toast('Status summary sent to ' + email, '✅ Email Sent', 5);
}


/**
 * Prompts user to update their notification email
 */
function promptForEmail() {
  const ui = SpreadsheetApp.getUi();
  const currentEmail = PropertiesService.getDocumentProperties().getProperty('NOTIFICATION_EMAIL') || '(not set)';
  
  const response = ui.prompt(
    '📝 Update Notification Email',
    `Current email: ${currentEmail}\n\nEnter new email address:`,
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() === ui.Button.OK) {
    const newEmail = response.getResponseText();
    PropertiesService.getDocumentProperties().setProperty('NOTIFICATION_EMAIL', newEmail);
    ui.alert('✅ Email Updated', `Notifications will be sent to: ${newEmail}`, ui.ButtonSet.OK);
  }
}


// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets all satellite workbook IDs from config
 */
function getSatelliteIds_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  if (!configSheet) return [];
  
  const data = configSheet.getDataRange().getValues();
  const ids = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1]) {
      ids.push({
        name: data[i][0],
        id: data[i][1]
      });
    }
  }
  
  return ids;
}


// ============================================================================
// INSTALLABLE TRIGGERS (Run once to set up)
// ============================================================================

/**
 * Creates a time-based trigger to sync satellites every hour
 * Run this once manually if you want automatic syncing
 */
function createHourlySyncTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'syncAllSatellites') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new hourly trigger
  ScriptApp.newTrigger('syncAllSatellites')
    .timeBased()
    .everyHours(1)
    .create();
  
  SpreadsheetApp.getUi().alert('✅ Hourly sync trigger created');
}


/**
 * Removes the hourly sync trigger
 */
function removeHourlySyncTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'syncAllSatellites') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  SpreadsheetApp.getUi().alert('✅ Hourly sync trigger removed');
}


// ============================================================================
// ARCHIVE MANAGEMENT
// ============================================================================

/**
 * View all archived sprint sheets
 */
function viewArchivedSprints() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  const sheets = ss.getSheets();
  const archivedSprints = sheets.filter(s => {
    const name = s.getName();
    return /^Sprint \d+$/.test(name) || /^\[Archived\]/.test(name);
  });
  
  // Sort by sprint number
  archivedSprints.sort((a, b) => {
    const numA = parseInt(a.getName().replace(/[^0-9]/g, '')) || 0;
    const numB = parseInt(b.getName().replace(/[^0-9]/g, '')) || 0;
    return numB - numA;
  });
  
  if (archivedSprints.length === 0) {
    ui.alert('No archived sprints found.');
    return;
  }
  
  // Build HTML list
  let html = '<style>';
  html += 'body { font-family: Arial, sans-serif; padding: 10px; }';
  html += '.sprint { padding: 8px; margin: 5px 0; background: #f5f5f5; border-radius: 4px; cursor: pointer; }';
  html += '.sprint:hover { background: #e0e0e0; }';
  html += '.hidden { color: #999; font-style: italic; }';
  html += '.current { background: #e8f5e9; border-left: 4px solid #4caf50; }';
  html += '</style>';
  html += '<h3>📅 Sprint Archive</h3>';
  html += '<p>Click a sprint to navigate to it:</p>';
  
  archivedSprints.forEach((sheet, index) => {
    const name = sheet.getName();
    const isHidden = sheet.isSheetHidden();
    const isCurrent = index === 0 && !isHidden;
    
    html += `<div class="sprint ${isHidden ? 'hidden' : ''} ${isCurrent ? 'current' : ''}" `;
    html += `onclick="google.script.run.navigateToSheet_('${name}'); google.script.host.close();">`;
    html += `${name}`;
    if (isHidden) html += ' (hidden)';
    if (isCurrent) html += ' ← Current';
    html += '</div>';
  });
  
  html += '<br><button onclick="google.script.host.close()">Close</button>';
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(350)
    .setHeight(400);
  
  ui.showModalDialog(htmlOutput, '🗄️ Archived Sprints');
}


/**
 * View check-in history across satellites
 */
function viewCheckInHistory() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  // Check if we have the archive sheet
  let archiveSheet = ss.getSheetByName('📚 Check-In Archive');
  
  if (!archiveSheet) {
    const create = ui.alert(
      'Check-In Archive',
      'No archive found. Would you like to create one?\n\n' +
      'This will create a sheet that logs key decisions and action items from each sprint.',
      ui.ButtonSet.YES_NO
    );
    
    if (create === ui.Button.YES) {
      createCheckInArchive_();
      archiveSheet = ss.getSheetByName('📚 Check-In Archive');
    } else {
      return;
    }
  }
  
  ss.setActiveSheet(archiveSheet);
}


/**
 * Creates the check-in archive sheet
 */
function createCheckInArchive_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let archiveSheet = ss.getSheetByName('📚 Check-In Archive');
  if (archiveSheet) return archiveSheet;
  
  archiveSheet = ss.insertSheet('📚 Check-In Archive');
  
  // Set up headers
  const headers = [
    'Sprint', 'Check-In Type', 'Date', 'Decision/Action', 'Type', 
    'Owner', 'Status', 'Impact', 'Notes'
  ];
  archiveSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  archiveSheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#1a73e8')
    .setFontColor('white');
  
  // Set column widths
  archiveSheet.setColumnWidth(1, 100);
  archiveSheet.setColumnWidth(2, 130);
  archiveSheet.setColumnWidth(3, 100);
  archiveSheet.setColumnWidth(4, 300);
  archiveSheet.setColumnWidth(5, 80);
  archiveSheet.setColumnWidth(6, 120);
  archiveSheet.setColumnWidth(7, 100);
  archiveSheet.setColumnWidth(8, 80);
  archiveSheet.setColumnWidth(9, 200);
  
  archiveSheet.setFrozenRows(1);
  
  // Add data validation for Type
  const typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Decision', 'Action Item', 'Outcome', 'Blocker'], true)
    .build();
  archiveSheet.getRange('E2:E500').setDataValidation(typeRule);
  
  // Add data validation for Status
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Open', 'In Progress', 'Complete', 'Blocked', 'Cancelled'], true)
    .build();
  archiveSheet.getRange('G2:G500').setDataValidation(statusRule);
  
  return archiveSheet;
}


/**
 * Archives completed items from current sprint check-ins
 * Called automatically during sprint rollover
 */
function archiveCurrentSprintCheckIns_(sprintName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let archiveSheet = ss.getSheetByName('📚 Check-In Archive');
  if (!archiveSheet) {
    archiveSheet = createCheckInArchive_();
  }
  
  const today = new Date().toLocaleDateString();
  
  // Collect data from each check-in sheet
  CONFIG.checkIns.forEach(checkIn => {
    if (checkIn.type !== 'checkin') return;
    
    const sheet = ss.getSheetByName(checkIn.activeSheet);
    if (!sheet) return;
    
    // Get decisions (rows 22-28)
    const decisions = sheet.getRange('A22:E28').getValues();
    decisions.forEach(row => {
      if (row[0] && String(row[0]).trim() !== '') {
        archiveSheet.appendRow([
          sprintName,
          checkIn.name,
          today,
          row[0], // Decision
          'Decision',
          row[1], // Owner
          'Complete',
          row[2], // Impact
          row[3]  // Follow-up/Notes
        ]);
      }
    });
    
    // Get completed action items (rows 31-37)
    const actions = sheet.getRange('A31:E37').getValues();
    actions.forEach(row => {
      if (row[0] && String(row[0]).trim() !== '') {
        const status = String(row[3] || '').toLowerCase();
        if (status === 'complete' || status === 'done') {
          archiveSheet.appendRow([
            sprintName,
            checkIn.name,
            today,
            row[0], // Task
            'Action Item',
            row[1], // Owner
            'Complete',
            '',
            row[4]  // Notes/Link
          ]);
        }
      }
    });
  });
}


/**
 * Generates a summary report of archived sprints
 */
function generateArchiveReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  ss.toast('Generating archive report...', '📊 Report', -1);
  
  // Get all sprint sheets
  const sheets = ss.getSheets();
  const sprintSheets = sheets.filter(s => /^Sprint \d+$/.test(s.getName()));
  
  // Create or get report sheet
  let reportSheet = ss.getSheetByName('📊 Sprint Archive Report');
  if (reportSheet) {
    reportSheet.clear();
  } else {
    reportSheet = ss.insertSheet('📊 Sprint Archive Report');
  }
  
  // Header
  reportSheet.getRange('A1').setValue('📊 CCAT Sprint Archive Report');
  reportSheet.getRange('A1').setFontSize(16).setFontWeight('bold');
  reportSheet.getRange('A2').setValue('Generated: ' + new Date().toLocaleString());
  reportSheet.getRange('A2').setFontStyle('italic').setFontColor('#666');
  
  let currentRow = 4;
  
  // Summary stats
  reportSheet.getRange(currentRow, 1).setValue('SUMMARY');
  reportSheet.getRange(currentRow, 1, 1, 3).setBackground('#1a73e8').setFontColor('white').setFontWeight('bold');
  currentRow++;
  
  reportSheet.getRange(currentRow, 1, 3, 2).setValues([
    ['Total Sprints:', sprintSheets.length],
    ['Current Sprint:', sprintSheets.length > 0 ? sprintSheets[sprintSheets.length - 1].getName() : 'N/A'],
    ['First Sprint:', sprintSheets.length > 0 ? sprintSheets[0].getName() : 'N/A']
  ]);
  currentRow += 5;
  
  // Sprint timeline
  reportSheet.getRange(currentRow, 1).setValue('SPRINT TIMELINE');
  reportSheet.getRange(currentRow, 1, 1, 5).setBackground('#1a73e8').setFontColor('white').setFontWeight('bold');
  currentRow++;
  
  reportSheet.getRange(currentRow, 1, 1, 5).setValues([['Sprint', 'Dates', 'Intent', 'Status', 'Hidden']]);
  reportSheet.getRange(currentRow, 1, 1, 5).setFontWeight('bold').setBackground('#e8eaed');
  currentRow++;
  
  sprintSheets.forEach(sheet => {
    const name = sheet.getName();
    const dates = sheet.getRange('D2').getValue() || '';
    const intent = sheet.getRange('B3').getValue() || '';
    const isHidden = sheet.isSheetHidden();
    
    reportSheet.getRange(currentRow, 1, 1, 5).setValues([[
      name,
      dates,
      String(intent).substring(0, 100) + (intent.length > 100 ? '...' : ''),
      isHidden ? 'Archived' : 'Active',
      isHidden ? 'Yes' : 'No'
    ]]);
    currentRow++;
  });
  
  // Format columns
  reportSheet.setColumnWidth(1, 100);
  reportSheet.setColumnWidth(2, 150);
  reportSheet.setColumnWidth(3, 400);
  reportSheet.setColumnWidth(4, 80);
  reportSheet.setColumnWidth(5, 60);
  
  ss.setActiveSheet(reportSheet);
  ss.toast('Archive report generated!', '✅ Complete', 5);
}


// ============================================================================
// SYSTEM MAP VISUALIZATION
// ============================================================================

/**
 * Shows an interactive system map visualization
 */
function showSystemMap() {
  const html = HtmlService.createHtmlOutput(getSystemMapHtml_())
    .setWidth(900)
    .setHeight(700);
  
  SpreadsheetApp.getUi().showModalDialog(html, '🗺️ CCAT Operating System Map');
}


/**
 * Returns the HTML for the system map visualization
 */
function getSystemMapHtml_() {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
      padding: 20px;
      min-height: 100%;
    }
    
    h1 { 
      text-align: center; 
      margin-bottom: 10px;
      color: #C9A227;
      font-size: 24px;
    }
    
    .subtitle {
      text-align: center;
      color: #aaa;
      margin-bottom: 25px;
      font-size: 12px;
    }
    
    .container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .row {
      display: flex;
      justify-content: center;
      gap: 15px;
      flex-wrap: wrap;
    }
    
    .box {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 15px;
      min-width: 140px;
      text-align: center;
      transition: all 0.3s ease;
    }
    
    .box:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      border-color: #C9A227;
    }
    
    .box.master {
      background: linear-gradient(135deg, #C9A227 0%, #8B6914 100%);
      border: none;
      min-width: 200px;
    }
    
    .box.master h3 { color: #000; }
    .box.master p { color: #333; }
    
    .box.satellite {
      background: rgba(30, 136, 229, 0.2);
      border-color: #1e88e5;
    }
    
    .box.okr-sat {
      background: rgba(76, 175, 80, 0.2);
      border-color: #4caf50;
    }
    
    .box.system {
      background: rgba(156, 39, 176, 0.2);
      border-color: #9c27b0;
    }
    
    .box h3 {
      font-size: 14px;
      margin-bottom: 5px;
      color: #fff;
    }
    
    .box p {
      font-size: 10px;
      color: #aaa;
      line-height: 1.4;
    }
    
    .box .emoji {
      font-size: 28px;
      margin-bottom: 8px;
    }
    
    .arrow-down {
      text-align: center;
      color: #C9A227;
      font-size: 24px;
      margin: 5px 0;
    }
    
    .arrow-row {
      display: flex;
      justify-content: center;
      gap: 100px;
      color: #666;
      font-size: 20px;
    }
    
    .section-label {
      background: rgba(201, 162, 39, 0.2);
      color: #C9A227;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 10px auto;
      display: inline-block;
    }
    
    .flow-section {
      text-align: center;
      margin: 15px 0;
    }
    
    .legend {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #aaa;
    }
    
    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
    }
    
    .legend-color.gold { background: #C9A227; }
    .legend-color.blue { background: #1e88e5; }
    .legend-color.green { background: #4caf50; }
    .legend-color.purple { background: #9c27b0; }
    
    .sync-indicator {
      display: inline-block;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      margin-top: 5px;
    }
    
    .sync-two-way {
      background: rgba(76, 175, 80, 0.3);
      color: #81c784;
    }
    
    .sync-one-way {
      background: rgba(255, 152, 0, 0.3);
      color: #ffb74d;
    }
  </style>
</head>
<body>
  <h1>🗺️ CCAT Operating System</h1>
  <p class="subtitle">Hub-and-Spoke Architecture | Bi-Weekly Sprint Cadence</p>
  
  <div class="container">
    <!-- ED Control Layer -->
    <div class="flow-section">
      <span class="section-label">ED Control Layer</span>
    </div>
    
    <div class="row">
      <div class="box master">
        <div class="emoji">🏛️</div>
        <h3>HOME BASE</h3>
        <p>Master Control Station<br>Single Source of Truth</p>
      </div>
    </div>
    
    <div class="arrow-down">↓ ↑</div>
    
    <div class="row">
      <div class="box system">
        <div class="emoji">🎯</div>
        <h3>OKRs</h3>
        <p>Strategy & Outcomes</p>
      </div>
      <div class="box system">
        <div class="emoji">⏱️</div>
        <h3>Sprints</h3>
        <p>Bi-Weekly Execution</p>
      </div>
      <div class="box system">
        <div class="emoji">📋</div>
        <h3>RACI</h3>
        <p>Accountability</p>
      </div>
      <div class="box system">
        <div class="emoji">📝</div>
        <h3>Change Log</h3>
        <p>Approval Workflow</p>
      </div>
    </div>
    
    <!-- Sync Layer -->
    <div class="flow-section">
      <span class="section-label">Bi-Directional Sync</span>
    </div>
    
    <div class="arrow-row">
      <span>↙️</span>
      <span>⬇️</span>
      <span>↘️</span>
    </div>
    
    <!-- Satellite Layer -->
    <div class="flow-section">
      <span class="section-label">Stakeholder Satellites</span>
    </div>
    
    <div class="row">
      <div class="box satellite">
        <div class="emoji">🎛️</div>
        <h3>Production</h3>
        <p>Richard + Andreas</p>
        <span class="sync-indicator sync-two-way">↔️ Two-Way</span>
      </div>
      <div class="box satellite">
        <div class="emoji">💰</div>
        <h3>CHANEL</h3>
        <p>Funder Check-In</p>
        <span class="sync-indicator sync-two-way">↔️ Two-Way</span>
      </div>
      <div class="box satellite">
        <div class="emoji">🎓</div>
        <h3>Deans-Provost</h3>
        <p>Academic Leadership</p>
        <span class="sync-indicator sync-two-way">↔️ Two-Way</span>
      </div>
    </div>
    
    <div class="row">
      <div class="box satellite">
        <div class="emoji">🏗️</div>
        <h3>Facilities</h3>
        <p>Space & Infrastructure</p>
        <span class="sync-indicator sync-two-way">↔️ Two-Way</span>
      </div>
      <div class="box satellite">
        <div class="emoji">💻</div>
        <h3>IT</h3>
        <p>Technology</p>
        <span class="sync-indicator sync-two-way">↔️ Two-Way</span>
      </div>
      <div class="box satellite">
        <div class="emoji">🎒</div>
        <h3>Student Life</h3>
        <p>Student Union</p>
        <span class="sync-indicator sync-two-way">↔️ Two-Way</span>
      </div>
      <div class="box satellite">
        <div class="emoji">👥</div>
        <h3>Advisory</h3>
        <p>Committee</p>
        <span class="sync-indicator sync-two-way">↔️ Two-Way</span>
      </div>
    </div>
    
    <div class="row">
      <div class="box okr-sat">
        <div class="emoji">🎯</div>
        <h3>OKR Satellite</h3>
        <p>Stakeholder View<br>Edit: Deadlines & Dependencies</p>
        <span class="sync-indicator sync-one-way">📅 Limited Edit</span>
      </div>
    </div>
    
    <!-- Legend -->
    <div class="legend">
      <div class="legend-item">
        <div class="legend-color gold"></div>
        <span>Master (ED Only)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color purple"></div>
        <span>System Sheets</span>
      </div>
      <div class="legend-item">
        <div class="legend-color blue"></div>
        <span>Check-In Satellites</span>
      </div>
      <div class="legend-item">
        <div class="legend-color green"></div>
        <span>OKR Satellite</span>
      </div>
    </div>
  </div>
  
  <script>
    // Add click handlers if needed
  </script>
</body>
</html>
`;
}


/**
 * Generates a static system diagram as a Google Doc for sharing
 */
function generateSystemDocumentation() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  // Create a new Google Doc
  const doc = DocumentApp.create('CCAT Operating System - Documentation');
  const body = doc.getBody();
  
  // Title
  body.appendParagraph('CCAT Operating System')
    .setHeading(DocumentApp.ParagraphHeading.TITLE);
  
  body.appendParagraph('Program Management Framework Documentation')
    .setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
  
  body.appendParagraph('Generated: ' + new Date().toLocaleString())
    .setItalic(true);
  
  body.appendHorizontalRule();
  
  // Overview
  body.appendParagraph('System Overview')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  
  body.appendParagraph(
    'The CCAT Operating System is a hub-and-spoke architecture designed to manage ' +
    'bi-weekly sprint cycles, stakeholder communication, and strategic OKR tracking. ' +
    'The Executive Director maintains a central Home Base workbook that syncs with ' +
    'satellite workbooks for each stakeholder group.'
  );
  
  // Architecture
  body.appendParagraph('Architecture')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  
  body.appendParagraph('Hub: Home Base (ED Only)')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  
  const hubList = body.appendListItem('Single source of truth for all CCAT operations');
  hubList.setGlyphType(DocumentApp.GlyphType.BULLET);
  body.appendListItem('Contains OKRs, Sprint Planning, RACI, and system configuration');
  body.appendListItem('Pushes sprint info and goals to all satellites');
  body.appendListItem('Pulls updates from stakeholder satellites');
  
  body.appendParagraph('Spokes: Satellite Workbooks')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  
  body.appendListItem('Production Sync - Richard, Andreas');
  body.appendListItem('Funder Check-In - CHANEL Culture Fund');
  body.appendListItem('Deans-Provost Check-In - Academic Leadership');
  body.appendListItem('Facilities Check-In - Space & Infrastructure');
  body.appendListItem('IT Check-In - Technology');
  body.appendListItem('Student Life Check-In - Student Union');
  body.appendListItem('Advisory Committee - External Advisors');
  body.appendListItem('OKR Satellite - Read-only with limited edit (Deadlines & Dependencies)');
  
  // Sprint Rhythm
  body.appendParagraph('Sprint Rhythm')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  
  body.appendParagraph(
    'CCAT operates on a 2-week sprint cycle with Friday as a Focus Day (no meetings).'
  );
  
  body.appendParagraph('Week 1 - Align & Launch')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Monday: Sprint Planning, Directors Sync, Sprint Kickoff');
  body.appendParagraph('Tuesday: Production Sync, 1:1s');
  body.appendParagraph('Wednesday: Project Work');
  body.appendParagraph('Thursday: Production Sync');
  body.appendParagraph('Friday: Focus Day');
  
  body.appendParagraph('Week 2 - Execute & Synthesize')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Monday: Directors Sync, Curator Sync');
  body.appendParagraph('Tuesday: Production Sync, 1:1s');
  body.appendParagraph('Wednesday: Provost Check-In, Deans Check-In, CHANEL Sync');
  body.appendParagraph('Thursday: Production Sync, Leadership Synthesis');
  body.appendParagraph('Friday: Focus Day');
  
  // Save and get URL
  doc.saveAndClose();
  const docUrl = doc.getUrl();
  
  ui.alert(
    '📄 Documentation Created',
    'System documentation has been created as a Google Doc.\n\n' +
    'URL: ' + docUrl,
    ui.ButtonSet.OK
  );
  
  return docUrl;
}
/**
 * Sets up the Advancement Input satellite for external contact submissions
 */
function setupAdvancementSatellite_(satellite, masterId) {
  const sheet = satellite.getSheets()[0];
  sheet.setName('Contact Database');
  
  const headerData = [
    ['📬 CCAT ADVANCEMENT — Contact Database', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Instructions for Advancement Team:', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['1. Fill in contact information in the table below', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['2. Set "Action Needed" to flag items requiring ED review/approval/follow-up', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['3. Your submissions sync automatically to the master database', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['4. ED will be notified when you flag an action', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Submission Date', 'Name', 'Title', 'Organization', 'Institution Type', 'Industry', 'Region', 'CalArts Connection', 'Contact Source', 'Potential Role', 'Action Needed', 'Email', 'Phone', 'Initial Notes']
  ];
  
  sheet.getRange(1, 1, 9, 14).setValues(headerData);
  sheet.getRange('O9').setValue('Submitted By');
  
  // Formatting
  sheet.getRange('A1:O1').merge().setFontSize(16).setFontWeight('bold')
    .setBackground('#C9A227').setFontColor('white');
  sheet.getRange('A3:A7').setFontWeight('bold').setFontStyle('italic')
    .setBackground('#fff3cd');
  sheet.getRange('A9:O9').setFontWeight('bold').setBackground('#4285F4')
    .setFontColor('white');
  
  // Column widths
  const widths = [100, 150, 180, 180, 140, 120, 120, 150, 150, 180, 160, 180, 120, 250, 120];
  widths.forEach((width, index) => {
    sheet.setColumnWidth(index + 1, width);
  });
  
  // Add dropdowns
  const conf = CONFIG.contactConfig;
  
  sheet.getRange('E10:E200').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(conf.institutionTypes, true).build());
  sheet.getRange('F10:F200').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(conf.industries, true).build());
  sheet.getRange('G10:G200').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(conf.regions, true).build());
  sheet.getRange('H10:H200').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(conf.calArtsConnections, true).build());
  sheet.getRange('I10:I200').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(conf.contactSources, true).build());
  sheet.getRange('J10:J200').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(conf.potentialRoles, true).build());
  sheet.getRange('K10:K200').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(conf.actionNeeded, true).build());
  
  // Auto-populate formulas
  for (let i = 10; i <= 200; i++) {
    sheet.getRange(`A${i}`).setFormula(`=IF(B${i}<>"",TODAY(),"")`);
    sheet.getRange(`O${i}`).setFormula(`=IF(B${i}<>"",USER(),"")`);
  }
  
  sheet.setFrozenRows(9);
  
  // Protect instructions
  const protection = sheet.getRange('A1:O9').protect();
  protection.setDescription('Instructions - Do not edit');
  protection.setWarningOnly(true);
  
  // Store master ID
  const props = PropertiesService.getDocumentProperties();
  props.setProperty('MASTER_ID', masterId);
  props.setProperty('SATELLITE_TYPE', 'advancement');
}


/**
 * Syncs Contact Database from Advancement satellite to Home Base
 */
function syncAdvancementInput() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const configSheet = ss.getSheetByName(CONFIG.sheets.satelliteConfig);
  
  if (!configSheet) {
    ui.alert('Please run Initial Setup first.');
    return;
  }
  
  ss.toast('Syncing Advancement submissions...', '📬 Sync', -1);
  
  const data = configSheet.getDataRange().getValues();
  let satelliteId = null;
  let configRow = 0;
  
  // Find Advancement Input satellite
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'Advancement Input') {
      satelliteId = data[i][1];
      configRow = i + 1;
      break;
    }
  }
  
  if (!satelliteId) {
    ui.alert('Advancement Input satellite not found. Please run Initial Setup.');
    return;
  }
  
  try {
    const satellite = SpreadsheetApp.openById(satelliteId);
    const satSheet = satellite.getSheetByName('Contact Database');
    const contactSheet = ss.getSheetByName(CONFIG.sheets.advisoryNetwork);
    
    if (!satSheet || !contactSheet) {
      ui.alert('Required sheets not found.');
      return;
    }
    
    const submissions = satSheet.getRange('A10:O200').getValues();
    let syncCount = 0;
    let actionItems = [];
    
    submissions.forEach((row, index) => {
      // Skip empty rows
      if (!row[1]) return;
      
      // Generate Contact ID
      const lastRow = contactSheet.getLastRow();
      const contactId = String(lastRow).padStart(3, '0');
      
      // Map to contact database format
      const contactData = [
        contactId,       // Contact ID
        row[1],          // Name
        row[2],          // Title
        row[3],          // Organization
        row[4],          // Institution Type
        row[5],          // Industry
        row[6],          // Region
        row[7],          // CalArts Connection
        row[8],          // Contact Source
        row[9],          // Potential Role
        row[0],          // Date Added
        '',              // Last Contact Date
        '',              // Next Steps
        'Pending',       // Status
        row[14],         // Added By
        row[11],         // Email
        row[12],         // Phone
        row[13]          // Notes
      ];
      
      contactSheet.appendRow(contactData);
      syncCount++;
      
      // If action needed, add to action items
      if (row[10] && row[10] !== 'No ED Action') {
        actionItems.push({
          contact: row[1],
          action: row[10],
          notes: row[13],
          submittedBy: row[14],
          organization: row[3],
          role: row[9]
        });
      }
      
      // Clear satellite row
      satSheet.getRange(10 + index, 1, 1, 15).clearContent();
    });
    
    // Update RACI and send notifications
    if (actionItems.length > 0) {
      updateRACIWithContactActions_(actionItems);
      sendContactActionNotification_(actionItems);
    }
    
    // Update config
    configSheet.getRange(configRow, 4).setValue(new Date());
    configSheet.getRange(configRow, 5).setValue('Synced');
    
    ss.toast(`Synced ${syncCount} Contact Database!`, '✅ Complete', 5);
    
    if (actionItems.length > 0) {
      ui.alert(
        '⚠️ Action Items Required',
        `${actionItems.length} contact(s) require your attention.\n\n` +
        'Check your RACI Task List for details.',
        ui.ButtonSet.OK
      );
    }
    
  } catch (error) {
    ui.alert('Sync Error', error.message, ui.ButtonSet.OK);
    console.error(error);
  }
}


/**
 * Updates RACI Task List with contact action items
 */
function updateRACIWithContactActions_(actionItems) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let raciSheet = ss.getSheetByName(CONFIG.sheets.raciTaskList);
  
  if (!raciSheet) {
    raciSheet = createRACISheet_();
  }
  
  const lastRow = raciSheet.getLastRow();
  
  // Add section header
  raciSheet.getRange(lastRow + 2, 1).setValue('📬 ED - ADVANCEMENT CONTACT ACTIONS');
  raciSheet.getRange(lastRow + 2, 1)
    .setFontWeight('bold').setFontSize(12)
    .setBackground('#C9A227').setFontColor('white');
  raciSheet.getRange(lastRow + 3, 1).setValue('─'.repeat(60));
  
  let currentRow = lastRow + 4;
  
  // Add each action item
  actionItems.forEach(item => {
    const taskDesc = `${item.action}: ${item.contact} (${item.organization}) - ${item.role}`;
    raciSheet.getRange(currentRow, 1).setValue(taskDesc);
    raciSheet.getRange(currentRow, 2).setValue('P1');  // High priority
    raciSheet.getRange(currentRow, 3).setValue('Pending');
    raciSheet.getRange(currentRow, 4).setValue(`Submitted by ${item.submittedBy} | ${item.notes}`);
    currentRow++;
  });
}


/**
 * Sends email notification for contact actions
 */
function sendContactActionNotification_(actionItems) {
  const props = PropertiesService.getDocumentProperties();
  let email = props.getProperty('NOTIFICATION_EMAIL');
  
  if (!email || email === 'YOUR_EMAIL@example.com') return;
  
  const subject = `📬 ${actionItems.length} New Advisory Network Contact${actionItems.length > 1 ? 's' : ''} Require Your Action`;
  
  let itemsList = '';
  actionItems.forEach(item => {
    itemsList += `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.contact}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.organization}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.role}</td>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>${item.action}</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.submittedBy}</td>
      </tr>
    `;
  });
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 800px;">
      <h2 style="color: #C9A227;">📬 New Advisory Network Contacts Require Action</h2>
      <p>The Advancement team has submitted ${actionItems.length} contact(s) that require your attention.</p>
      
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr style="background: #4285F4; color: white;">
          <th style="padding: 10px; border: 1px solid #ddd;">Contact</th>
          <th style="padding: 10px; border: 1px solid #ddd;">Organization</th>
          <th style="padding: 10px; border: 1px solid #ddd;">Potential Role</th>
          <th style="padding: 10px; border: 1px solid #ddd;">Action Needed</th>
          <th style="padding: 10px; border: 1px solid #ddd;">Submitted By</th>
        </tr>
        ${itemsList}
      </table>
      
      <p><strong>Next Steps:</strong></p>
      <ol>
        <li>Review contacts in 🤝 Advisory Network sheet</li>
        <li>Check 📋 RACI Task List for action items</li>
        <li>Update contact status as you complete follow-ups</li>
      </ol>
      
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        This notification was sent by the CCAT Operating System.
      </p>
    </div>
  `;
  
  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}
/**
 * ============================================================================
 * CCAT APPS SCRIPT - COMPLETE PATCH v2.0
 * ============================================================================
 * 
 * INSTALLATION:
 * 1. Open your CCAT Home Base Google Sheet
 * 2. Extensions > Apps Script
 * 3. Paste this ENTIRE file at the BOTTOM of your existing script
 * 4. Save (Ctrl+S)
 * 5. Run: applyAllPatches() from the function dropdown
 * 6. Refresh your spreadsheet
 * 
 * WHAT THIS ADDS:
 * - 📝 Project Notes Doc creation & management
 * - 🔄 Bidirectional Advancement sync
 * - Advisory Network new columns (Strategic Value, Executive Summary, Key Links)
 * - Enhanced Add Contact dialog
 * - Auto-updates menus
 * 
 * ============================================================================
 */


// ============================================================================
// MASTER PATCH INSTALLER - Run this once
// ============================================================================

function applyAllPatches() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const response = ui.alert(
    '🔧 Apply CCAT Patches',
    'This will:\n\n' +
    '1. Add new columns to Advisory Network (Strategic Value, Executive Summary, Key Links)\n' +
    '2. Create Notes Doc Registry sheet\n' +
    '3. Upgrade Advancement satellite for bidirectional sync\n' +
    '4. Update menus (requires refresh)\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    ss.toast('Upgrading Advisory Network columns...', '🔧 Patch', -1);
    patchAdvisoryNetworkColumns_();
    
    ss.toast('Creating Notes Doc Registry...', '🔧 Patch', -1);
    patchCreateNotesRegistry_();
    
    ss.toast('Upgrading Advancement satellite...', '🔧 Patch', -1);
    patchAdvancementSatellite_();
    
    ss.toast('Patches applied!', '✅ Complete', 5);
    
    ui.alert(
      '✅ Patches Applied Successfully',
      'Changes made:\n' +
      '• Advisory Network: Added Strategic Value, Executive Summary, Key Links columns\n' +
      '• Created 📝 Notes Doc Registry sheet\n' +
      '• Advancement satellite upgraded for bidirectional sync\n\n' +
      'IMPORTANT: Refresh your browser (F5) to see new menu items.',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    ui.alert('❌ Patch Error', error.message, ui.ButtonSet.OK);
    console.error(error);
  }
}


function patchAdvisoryNetworkColumns_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('🤝 Advisory Network');
  if (!sheet) return;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let lastCol = sheet.getLastColumn();
  
  if (!headers.includes('Strategic Value')) {
    lastCol++;
    sheet.getRange(1, lastCol).setValue('Strategic Value');
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Exceptional', 'Very High', 'High', 'Moderate', 'Limited', 'Unclear'], true)
      .build();
    sheet.getRange(2, lastCol, 500, 1).setDataValidation(rule);
    sheet.setColumnWidth(lastCol, 120);
  }
  
  if (!headers.includes('Executive Summary')) {
    lastCol++;
    sheet.getRange(1, lastCol).setValue('Executive Summary');
    sheet.setColumnWidth(lastCol, 300);
  }
  
  if (!headers.includes('Key Links')) {
    lastCol++;
    sheet.getRange(1, lastCol).setValue('Key Links');
    sheet.setColumnWidth(lastCol, 250);
  }
  
  sheet.getRange(1, 1, 1, lastCol).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');
}


function patchCreateNotesRegistry_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName('📝 Notes Doc Registry')) return;
  
  const sheet = ss.insertSheet('📝 Notes Doc Registry');
  sheet.appendRow(['Project Name', 'Doc ID', 'URL', 'Created', 'Status']);
  sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 300);
  sheet.setColumnWidth(3, 400);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 100);
}


function patchAdvancementSatellite_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName('⚙️ Satellite Config');
  if (!configSheet) return;
  
  const data = configSheet.getDataRange().getValues();
  let satelliteId = null;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'Advancement Input') {
      satelliteId = data[i][1];
      break;
    }
  }
  
  if (!satelliteId) return;
  
  try {
    const satellite = SpreadsheetApp.openById(satelliteId);
    const sheet = satellite.getSheetByName('Contact Database');
    if (!sheet) return;
    
    // Check if already has Sync ID column
    const headers = sheet.getRange(9, 1, 1, 16).getValues()[0];
    if (headers[0] === 'Sync ID') return; // Already patched
    
    // Insert Sync ID column at A, shift everything right
    sheet.insertColumnBefore(1);
    sheet.getRange(9, 1).setValue('Sync ID');
    sheet.getRange(9, 1).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');
    sheet.setColumnWidth(1, 80);
    
    // Add Status column if missing (now at column 17 after shift)
    const lastCol = sheet.getLastColumn();
    if (lastCol < 17 || sheet.getRange(9, 17).getValue() !== 'Status') {
      sheet.getRange(9, 17).setValue('Status');
      sheet.getRange(9, 17).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');
      
      const statusRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['Active', 'Pending', 'On Hold', 'Inactive', 'Converted'], true)
        .build();
      sheet.getRange('Q10:Q500').setDataValidation(statusRule);
    }
    
    // Update instructions
    sheet.getRange('A3').setValue('This sheet syncs bidirectionally with Home Base:');
    sheet.getRange('A4').setValue('• NEW contacts you add here → sync to Home Base');
    sheet.getRange('A5').setValue('• NEW contacts in Home Base → appear here');
    sheet.getRange('A6').setValue('• Status updates flow both ways');
    sheet.getRange('A7').setValue('• Sync ID links records (do not edit column A)');
    sheet.getRange('A3:A7').setBackground('#e8f5e9');
    
  } catch (e) {
    console.log('Could not patch Advancement satellite: ' + e.message);
  }
}


// ============================================================================
// UPDATED onOpen - REPLACE YOUR EXISTING onOpen WITH THIS
// ============================================================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('🎛️ CCAT System')
    .addItem('🔄 New Sprint (Rollover & Push)', 'newSprintRollover')
    .addItem('🔁 Sync All Satellites', 'syncAllSatellites')
    .addItem('🎯 Sync OKR Satellite Only', 'syncOKRSatelliteOnly')
    .addSeparator()
    .addItem('🎯 Update OKR Timeline', 'updateOKRTimeline')
    .addItem('📋 Generate RACI Task List', 'generateRACITaskList')
    .addSeparator()
    .addSubMenu(ui.createMenu('📊 Bi-Weekly Update')
      .addItem('📊 Generate Summary Sheet', 'generateBiWeeklySummary')
      .addItem('📧 Send Pre-Read Email', 'sendStatusSummary'))
    .addSeparator()
    .addSubMenu(ui.createMenu('📝 Project Notes')
      .addItem('➕ Create New Project Notes Doc', 'createProjectNotesDoc')
      .addItem('📄 View All Notes Docs', 'showNotesDocList')
      .addItem('📝 Add Meeting Entry', 'addMeetingToActiveDoc'))
    .addSubMenu(ui.createMenu('🤝 Advisory Network')
      .addItem('👀 View Contact Database', 'navToAdvisoryNetwork')
      .addItem('➕ Add New Contact', 'showEnhancedAddContactDialog')
      .addItem('💬 View Conversation Log', 'navToConversationLog')
      .addItem('📊 View Network Dashboard', 'navToNetworkDashboard')
      .addSeparator()
      .addItem('🔄 Sync Advancement (↔ Bidirectional)', 'syncAdvancementBidirectional')
      .addItem('📧 Open Advancement Satellite', 'openSatelliteAdvancement'))
    .addSubMenu(ui.createMenu('✅ OKR Change Approval')
      .addItem('📋 View Pending Changes', 'viewPendingOKRChanges')
      .addItem('✅ Approve All & Sync', 'approveAllOKRChanges')
      .addItem('✅ Approve Selected Changes', 'approveSelectedOKRChanges')
      .addItem('❌ Reject Selected Changes', 'rejectSelectedOKRChanges')
      .addItem('🗑️ Clear Change Log', 'clearOKRChangeLog'))
    .addSeparator()
    .addSubMenu(ui.createMenu('🗄️ Archives')
      .addItem('📅 View Archived Sprints', 'viewArchivedSprints')
      .addItem('📋 View Check-In History', 'viewCheckInHistory')
      .addItem('📊 Generate Archive Report', 'generateArchiveReport'))
    .addSeparator()
    .addItem('📄 Doc Activity Dashboard', 'generateDocActivityDashboard')
    .addItem('🗺️ View System Map', 'showSystemMap')
    .addSeparator()
    .addSubMenu(ui.createMenu('⚙️ Setup')
      .addItem('🚀 Initial Setup (Create Satellites)', 'initialSetup')
      .addItem('🔧 Apply All Patches', 'applyAllPatches')
      .addItem('🔧 Fix Formula References', 'fixFormulaReferences')
      .addItem('📝 Update Config Email', 'promptForEmail')
      .addItem('📝 Setup OKR Change Tracking', 'setupOKRChangeTracking'))
    .addToUi();
  
  buildNavigationMenus_(ui);
}


// ============================================================================
// PROJECT NOTES DOC FUNCTIONS
// ============================================================================

function createProjectNotesDoc() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const response = ui.prompt(
    'Create Project Notes Doc',
    'Enter project name (e.g., "Frieze VIP Event", "Advisory Committee Build"):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() !== ui.Button.OK) return;
  
  const projectName = response.getResponseText().trim();
  if (!projectName) {
    ui.alert('Error', 'Project name cannot be empty.', ui.ButtonSet.OK);
    return;
  }
  
  ss.toast('Creating project notes doc...', '📝 Notes', -1);
  
  const doc = DocumentApp.create('CCAT Notes: ' + projectName);
  setupNotesDocStructure_(doc, projectName, ss);
  registerNotesDoc_(ss, projectName, doc.getId(), doc.getUrl());
  
  ss.toast('Project notes doc created!', '✅ Complete', 5);
  
  const html = HtmlService.createHtmlOutput(
    `<script>window.open('${doc.getUrl()}','_blank');google.script.host.close();</script>`
  ).setWidth(1).setHeight(1);
  ui.showModalDialog(html, 'Opening...');
}


function setupNotesDocStructure_(doc, projectName, ss) {
  const body = doc.getBody();
  body.clear();
  
  const sprintInfo = getCurrentSprintInfo_(ss);
  
  body.appendParagraph('CCAT Project Notes: ' + projectName)
    .setHeading(DocumentApp.ParagraphHeading.HEADING1)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  body.appendParagraph('');
  body.appendParagraph(
    'Project: ' + projectName + '\n' +
    'Created: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM d, yyyy') + '\n' +
    'Current Sprint: ' + sprintInfo.name
  ).setForegroundColor('#666666').setFontSize(10);
  
  body.appendHorizontalRule();
  
  body.appendParagraph('Quick Links').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('• Home Base: ' + ss.getUrl() + '\n• Related Documents: [links]\n• Key Contacts: [names]');
  
  body.appendHorizontalRule();
  
  body.appendParagraph('Meeting Notes').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Use CCAT System > Project Notes > Add Meeting Entry to insert new meetings.\n')
    .setItalic(true).setForegroundColor('#888888');
  
  insertMeetingTemplateToDoc_(doc, '[FIRST MEETING TITLE]');
  
  body.appendHorizontalRule();
  body.appendParagraph('Archive').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Move completed meetings here.\n').setItalic(true).setForegroundColor('#888888');
}


function insertMeetingTemplateToDoc_(doc, title) {
  const body = doc.getBody();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM d, yyyy');
  
  const template = `
───────────────────────────────────────
📅 ${today} — ${title}
───────────────────────────────────────

Attendees: 
Meeting Lead: 
Note Taker: 

AGENDA
1. 
2. 
3. 

DISCUSSION NOTES


DECISIONS
┌────┬──────────────────────────────────┬─────────────────────────┐
│ #  │ Decision                         │ Rationale               │
├────┼──────────────────────────────────┼─────────────────────────┤
│ 1  │                                  │                         │
└────┴──────────────────────────────────┴─────────────────────────┘

ACTION ITEMS
┌────┬──────────────────────────────────┬──────────┬──────────┬────────┐
│ #  │ Action                           │ Owner    │ Due      │ Status │
├────┼──────────────────────────────────┼──────────┼──────────┼────────┤
│ 1  │                                  │          │          │ ☐      │
│ 2  │                                  │          │          │ ☐      │
└────┴──────────────────────────────────┴──────────┴──────────┴────────┘

PARKING LOT
• 

`;
  
  const searchResult = body.findText('Use CCAT System');
  let insertIndex = 5;
  if (searchResult) {
    insertIndex = body.getChildIndex(searchResult.getElement().getParent()) + 1;
  }
  
  body.insertParagraph(insertIndex, template).setFontFamily('Consolas').setFontSize(10);
}


function registerNotesDoc_(ss, projectName, docId, url) {
  let sheet = ss.getSheetByName('📝 Notes Doc Registry');
  if (!sheet) {
    patchCreateNotesRegistry_();
    sheet = ss.getSheetByName('📝 Notes Doc Registry');
  }
  sheet.appendRow([projectName, docId, url, new Date(), 'Active']);
}


function getRegisteredDocs_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('📝 Notes Doc Registry');
  if (!sheet || sheet.getLastRow() < 2) return [];
  
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues()
    .map(row => ({ projectName: row[0], docId: row[1], url: row[2], created: row[3], status: row[4] }))
    .filter(d => d.status === 'Active' && d.docId);
}


function showNotesDocList() {
  const docs = getRegisteredDocs_();
  const ui = SpreadsheetApp.getUi();
  
  if (docs.length === 0) {
    ui.alert('No Project Notes Docs', 'Create one using CCAT System > Project Notes > Create New.', ui.ButtonSet.OK);
    return;
  }
  
  const html = HtmlService.createHtmlOutput(`
    <style>body{font-family:Arial,sans-serif;padding:20px}a{color:#1a73e8;text-decoration:none}a:hover{text-decoration:underline}li{margin:10px 0}</style>
    <h3>📝 Project Notes Documents</h3>
    <ul>${docs.map(d => `<li><a href="${d.url}" target="_blank">${d.projectName}</a></li>`).join('')}</ul>
  `).setWidth(400).setHeight(300);
  ui.showModalDialog(html, 'Notes Doc Registry');
}


function addMeetingToActiveDoc() {
  const ui = SpreadsheetApp.getUi();
  const docs = getRegisteredDocs_();
  
  if (docs.length === 0) {
    ui.alert('No docs found. Create one first.', '', ui.ButtonSet.OK);
    return;
  }
  
  const html = HtmlService.createHtmlOutput(`
    <style>body{font-family:Arial,sans-serif;padding:20px}select,input{width:100%;padding:8px;margin:10px 0;box-sizing:border-box}button{background:#4285f4;color:white;border:none;padding:10px 20px;cursor:pointer;margin-right:10px}button:hover{background:#3367d6}.cancel{background:#888}</style>
    <h3>Add Meeting Entry</h3>
    <label>Project:</label>
    <select id="docSelect">${docs.map(d => `<option value="${d.docId}">${d.projectName}</option>`).join('')}</select>
    <label>Meeting Title:</label>
    <input type="text" id="title" placeholder="e.g., Weekly Sync">
    <br><br>
    <button onclick="go()">Add Entry</button>
    <button class="cancel" onclick="google.script.host.close()">Cancel</button>
    <script>function go(){google.script.run.withSuccessHandler(()=>google.script.host.close()).insertMeetingEntry(document.getElementById('docSelect').value,document.getElementById('title').value)}</script>
  `).setWidth(400).setHeight(260);
  ui.showModalDialog(html, 'Add Meeting');
}


function insertMeetingEntry(docId, title) {
  const doc = DocumentApp.openById(docId);
  insertMeetingTemplateToDoc_(doc, title || '[MEETING TITLE]');
  
  const html = HtmlService.createHtmlOutput(
    `<script>window.open('${doc.getUrl()}','_blank');google.script.host.close();</script>`
  );
  SpreadsheetApp.getUi().showModalDialog(html, 'Opening...');
}


// ============================================================================
// BIDIRECTIONAL ADVANCEMENT SYNC
// ============================================================================

function syncAdvancementBidirectional() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const configSheet = ss.getSheetByName('⚙️ Satellite Config');
  
  if (!configSheet) {
    ui.alert('Run Initial Setup first.');
    return;
  }
  
  ss.toast('Starting bidirectional sync...', '🔄 Sync', -1);
  
  const data = configSheet.getDataRange().getValues();
  let satelliteId = null, configRow = 0;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'Advancement Input') {
      satelliteId = data[i][1];
      configRow = i + 1;
      break;
    }
  }
  
  if (!satelliteId) {
    ui.alert('Advancement satellite not found.');
    return;
  }
  
  try {
    const satellite = SpreadsheetApp.openById(satelliteId);
    const satSheet = satellite.getSheetByName('Contact Database');
    const homeSheet = ss.getSheetByName('🤝 Advisory Network');
    
    if (!satSheet || !homeSheet) {
      ui.alert('Required sheets not found.');
      return;
    }
    
    const homeData = getAdvisoryNetworkData_(homeSheet);
    const satData = getAdvancementSatelliteData_(satSheet);
    
    const pulledCount = pullNewFromSatellite_(satSheet, homeSheet, homeData, satData);
    const pushedCount = pushToSatellite_(satSheet, homeSheet, homeData, satData);
    
    configSheet.getRange(configRow, 4).setValue(new Date());
    configSheet.getRange(configRow, 5).setValue('Synced ↔');
    
    ss.toast(`Pulled ${pulledCount}, Pushed ${pushedCount}`, '✅ Sync Complete', 5);
    
    if (pulledCount > 0 || pushedCount > 0) {
      ui.alert('🔄 Sync Complete', `Pulled: ${pulledCount}\nPushed: ${pushedCount}`, ui.ButtonSet.OK);
    }
    
  } catch (error) {
    ui.alert('Sync Error', error.message, ui.ButtonSet.OK);
  }
}


function getAdvisoryNetworkData_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { byId: {}, byName: {}, ids: new Set(), headers: [], colIndex: () => -1 };
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const colIndex = (name) => headers.indexOf(name);
  
  const result = { byId: {}, byName: {}, ids: new Set(), headers, colIndex };
  
  data.forEach((row, idx) => {
    const id = String(row[colIndex('Contact ID')] || '').trim();
    const name = String(row[colIndex('Name')] || '').trim().toLowerCase();
    if (id) { result.byId[id] = { row, rowNum: idx + 2 }; result.ids.add(id); }
    if (name) { result.byName[name] = { row, rowNum: idx + 2, id }; }
  });
  
  return result;
}


function getAdvancementSatelliteData_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 10) return { byId: {}, byName: {}, ids: new Set() };
  
  const data = sheet.getRange(10, 1, lastRow - 9, 17).getValues();
  const colIndex = (name) => {
    const map = { 'Sync ID': 0, 'Submission Date': 1, 'Name': 2, 'Title': 3, 'Organization': 4,
      'Institution Type': 5, 'Industry': 6, 'Region': 7, 'CalArts Connection': 8, 'Contact Source': 9,
      'Potential Role': 10, 'Action Needed': 11, 'Email': 12, 'Phone': 13, 'Notes': 14, 'Submitted By': 15, 'Status': 16 };
    return map[name] !== undefined ? map[name] : -1;
  };
  
  const result = { byId: {}, byName: {}, ids: new Set(), colIndex };
  
  data.forEach((row, idx) => {
    const id = String(row[0] || '').trim();
    const name = String(row[2] || '').trim().toLowerCase();
    if (id) { result.byId[id] = { row, rowNum: idx + 10 }; result.ids.add(id); }
    if (name) { result.byName[name] = { row, rowNum: idx + 10, id }; }
  });
  
  return result;
}


function pullNewFromSatellite_(satSheet, homeSheet, homeData, satData) {
  let count = 0;
  const satLastRow = satSheet.getLastRow();
  if (satLastRow < 10) return 0;
  
  const submissions = satSheet.getRange(10, 1, satLastRow - 9, 17).getValues();
  
  submissions.forEach((row, index) => {
    const name = String(row[2] || '').trim();
    if (!name) return;
    
    const nameLower = name.toLowerCase();
    const syncId = String(row[0] || '').trim();
    
    if (syncId && homeData.ids.has(syncId)) return;
    if (homeData.byName[nameLower]) return;
    
    const newId = generateNextContactId_(homeSheet);
    const newRow = buildHomeBaseRow_(row, newId, homeData.headers);
    homeSheet.appendRow(newRow);
    satSheet.getRange(10 + index, 1).setValue(newId);
    count++;
  });
  
  return count;
}


function pushToSatellite_(satSheet, homeSheet, homeData, satData) {
  let count = 0;
  const homeLastRow = homeSheet.getLastRow();
  if (homeLastRow < 2) return 0;
  
  const col = homeData.colIndex;
  const contacts = homeSheet.getRange(2, 1, homeLastRow - 1, homeSheet.getLastColumn()).getValues();
  
  contacts.forEach((row) => {
    const contactId = String(row[col('Contact ID')] || '').trim();
    const name = String(row[col('Name')] || '').trim();
    if (!name) return;
    
    const nameLower = name.toLowerCase();
    const existsById = contactId && satData.ids.has(contactId);
    const existsByName = satData.byName[nameLower];
    
    if (existsById) {
      updateSatelliteRow_(satSheet, satData.byId[contactId].rowNum, row, homeData);
      count++;
    } else if (existsByName) {
      satSheet.getRange(existsByName.rowNum, 1).setValue(contactId);
      updateSatelliteRow_(satSheet, existsByName.rowNum, row, homeData);
      count++;
    } else {
      appendToSatellite_(satSheet, row, homeData);
      count++;
    }
  });
  
  return count;
}


function generateNextContactId_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return '001';
  
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let maxId = 0;
  ids.forEach(r => { const n = parseInt(String(r[0]).replace(/\D/g, '')) || 0; if (n > maxId) maxId = n; });
  return String(maxId + 1).padStart(3, '0');
}


function buildHomeBaseRow_(satRow, contactId, headers) {
  const row = new Array(headers.length).fill('');
  const set = (name, val) => { const i = headers.indexOf(name); if (i >= 0) row[i] = val; };
  
  set('Contact ID', contactId);
  set('Name', satRow[2]);
  set('Title', satRow[3]);
  set('Organization', satRow[4]);
  set('Institution Type', satRow[5]);
  set('Industry', satRow[6]);
  set('Region', satRow[7]);
  set('CalArts Connection', satRow[8]);
  set('Contact Source', satRow[9]);
  set('Potential Role', satRow[10]);
  set('Date Added', satRow[1] || new Date());
  set('Status', satRow[16] || 'Pending');
  set('Email', satRow[12]);
  set('Phone', satRow[13]);
  set('Notes', satRow[14]);
  
  return row;
}


function updateSatelliteRow_(satSheet, rowNum, homeRow, homeData) {
  const col = homeData.colIndex;
  const status = homeRow[col('Status')] || '';
  if (status) satSheet.getRange(rowNum, 17).setValue(status);
  
  const notes = homeRow[col('Notes')] || '';
  if (notes) {
    const existing = satSheet.getRange(rowNum, 15).getValue() || '';
    if (!existing.includes(notes)) {
      satSheet.getRange(rowNum, 15).setValue(existing ? existing + ' | ' + notes : notes);
    }
  }
}


function appendToSatellite_(satSheet, homeRow, homeData) {
  const col = homeData.colIndex;
  const newRow = [
    homeRow[col('Contact ID')] || '',
    homeRow[col('Date Added')] || new Date(),
    homeRow[col('Name')] || '',
    homeRow[col('Title')] || '',
    homeRow[col('Organization')] || '',
    homeRow[col('Institution Type')] || '',
    homeRow[col('Industry')] || '',
    homeRow[col('Region')] || '',
    homeRow[col('CalArts Connection')] || '',
    homeRow[col('Contact Source')] || '',
    homeRow[col('Potential Role')] || '',
    '',
    homeRow[col('Email')] || '',
    homeRow[col('Phone')] || '',
    homeRow[col('Notes')] || '',
    '',
    homeRow[col('Status')] || 'Active'
  ];
  satSheet.appendRow(newRow);
}


// ============================================================================
// ENHANCED ADD CONTACT DIALOG
// ============================================================================

function showEnhancedAddContactDialog() {
  const conf = CONFIG.contactConfig;
  
  const html = HtmlService.createHtmlOutput(`
    <style>
      body{font-family:Arial,sans-serif;padding:15px;font-size:13px}
      .form-group{margin-bottom:10px}label{display:block;font-weight:bold;margin-bottom:3px;font-size:12px}
      input,select,textarea{width:100%;padding:6px;box-sizing:border-box}textarea{height:50px}
      .row{display:flex;gap:10px}.row>div{flex:1}
      button{background:#4285f4;color:white;border:none;padding:10px 20px;cursor:pointer;margin-top:10px}
      button:hover{background:#3367d6}.cancel{background:#888;margin-left:10px}
    </style>
    <h3>Add New Contact</h3>
    <div class="row">
      <div class="form-group"><label>Name *</label><input type="text" id="name"></div>
      <div class="form-group"><label>Title</label><input type="text" id="title"></div>
    </div>
    <div class="row">
      <div class="form-group"><label>Organization</label><input type="text" id="organization"></div>
      <div class="form-group"><label>Industry</label><select id="industry"><option value="">--</option>${conf.industries.map(i=>`<option>${i}</option>`).join('')}</select></div>
    </div>
    <div class="row">
      <div class="form-group"><label>Strategic Value</label><select id="strategicValue"><option value="">--</option><option>Exceptional</option><option>Very High</option><option>High</option><option>Moderate</option><option>Limited</option><option>Unclear</option></select></div>
      <div class="form-group"><label>Potential Role</label><select id="potentialRole"><option value="">--</option>${conf.potentialRoles.map(r=>`<option>${r}</option>`).join('')}</select></div>
    </div>
    <div class="form-group"><label>Executive Summary</label><textarea id="executiveSummary" placeholder="Brief background..."></textarea></div>
    <div class="row">
      <div class="form-group"><label>Email</label><input type="email" id="email"></div>
      <div class="form-group"><label>Phone</label><input type="tel" id="phone"></div>
    </div>
    <div class="form-group"><label>Key Links</label><textarea id="keyLinks" placeholder="https://linkedin.com/in/..."></textarea></div>
    <div class="row">
      <div class="form-group"><label>Contact Source</label><select id="source"><option value="">--</option>${conf.contactSources.map(s=>`<option>${s}</option>`).join('')}</select></div>
      <div class="form-group"><label>CalArts Connection</label><select id="calarts"><option value="">--</option>${conf.calArtsConnections.map(c=>`<option>${c}</option>`).join('')}</select></div>
    </div>
    <div class="form-group"><label>Notes</label><textarea id="notes"></textarea></div>
    <button onclick="save()">Save</button><button class="cancel" onclick="google.script.host.close()">Cancel</button>
    <script>
      function save(){
        const c={name:document.getElementById('name').value,title:document.getElementById('title').value,
          organization:document.getElementById('organization').value,industry:document.getElementById('industry').value,
          strategicValue:document.getElementById('strategicValue').value,potentialRole:document.getElementById('potentialRole').value,
          executiveSummary:document.getElementById('executiveSummary').value,email:document.getElementById('email').value,
          phone:document.getElementById('phone').value,keyLinks:document.getElementById('keyLinks').value,
          source:document.getElementById('source').value,calarts:document.getElementById('calarts').value,
          notes:document.getElementById('notes').value};
        if(!c.name){alert('Name required');return;}
        google.script.run.withSuccessHandler(()=>{alert('Saved!');google.script.host.close();}).saveEnhancedContact(c);
      }
    </script>
  `).setWidth(520).setHeight(580);
  SpreadsheetApp.getUi().showModalDialog(html, 'Add New Contact');
}


function saveEnhancedContact(contact) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('🤝 Advisory Network');
  if (!sheet) throw new Error('Advisory Network sheet not found');
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const col = (name) => headers.indexOf(name);
  
  const newId = generateNextContactId_(sheet);
  const newRow = sheet.getLastRow() + 1;
  
  const set = (name, val) => { const c = col(name); if (c >= 0) sheet.getRange(newRow, c + 1).setValue(val); };
  
  set('Contact ID', newId);
  set('Name', contact.name);
  set('Title', contact.title);
  set('Organization', contact.organization);
  set('Industry', contact.industry);
  set('CalArts Connection', contact.calarts);
  set('Contact Source', contact.source);
  set('Potential Role', contact.potentialRole);
  set('Date Added', new Date());
  set('Status', 'New');
  set('Added By', Session.getActiveUser().getEmail());
  set('Email', contact.email);
  set('Phone', contact.phone);
  set('Notes', contact.notes);
  set('Strategic Value', contact.strategicValue);
  set('Executive Summary', contact.executiveSummary);
  set('Key Links', contact.keyLinks);
}


// ============================================================================
// NAVIGATION FUNCTION (if missing)
// ============================================================================

function navToNotesDocRegistry() { navigateToSheet_('📝 Notes Doc Registry'); }
function navToDocActivity() { navigateToSheet_(CONFIG.sheets.docActivity); }


// ============================================================================
// DOCUMENT ACTIVITY DASHBOARD (Drive Activity API)
// ============================================================================
//
// SETUP REQUIRED: Enable the "Google Drive Activity API" advanced service:
//   1. In Apps Script editor, click "+" next to "Services" in the left sidebar
//   2. Find "Google Drive Activity API" (driveactivity v2)
//   3. Click "Add"
//   4. Run generateDocActivityDashboard() from the menu
//
// This dashboard queries ALL activity across your Google Drive for the last
// 7 days using the Drive Activity API. It shows:
//   - Every doc with activity, who did what, when, how many times
//   - Shares / permission changes with who was granted access
//   - Edit, comment, create, move, rename, and delete events
//
// LIMITATIONS (Google platform restrictions):
//   - "View" events are NOT exposed by Google's API (privacy policy)
//   - View duration is not tracked by any Google API
//   - Copy/paste is not tracked by any Google API
//   - For view tracking, you need Google Workspace Admin audit logs
// ============================================================================

/**
 * Main entry point: generates the full Doc Activity Dashboard.
 */
function generateDocActivityDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // Check if Drive Activity API is enabled
  if (typeof DriveActivity === 'undefined') {
    ui.alert(
      '⚙️ Setup Required',
      'The Google Drive Activity API advanced service is not enabled.\n\n' +
      'To enable it:\n' +
      '1. Open Extensions > Apps Script\n' +
      '2. Click "+" next to "Services" in the left sidebar\n' +
      '3. Find "Google Drive Activity API"\n' +
      '4. Click "Add"\n' +
      '5. Then run this again.',
      ui.ButtonSet.OK
    );
    return;
  }

  ss.toast('Querying Drive Activity API for last 7 days...', '📄 Doc Activity', -1);

  // Get or create dashboard sheet
  let dashSheet = ss.getSheetByName(CONFIG.sheets.docActivity);
  if (!dashSheet) {
    dashSheet = ss.insertSheet(CONFIG.sheets.docActivity);
  }
  dashSheet.clear();

  // Query all Drive activity for last 7 days
  const activities = queryDriveActivity7Days_();

  // Process into structured data
  const processed = processDriveActivities_(activities);

  // Write the dashboard
  writeDashboardSheet_(ss, dashSheet, processed);

  ss.toast('Document Activity Dashboard ready! ' + processed.docCount + ' docs with activity.', '📄 Done', 5);
  ss.setActiveSheet(dashSheet);
  dashSheet.getRange('A1').activate();
}


/**
 * Query Drive Activity API for all activity in last 7 days.
 * Paginates through all results.
 */
function queryDriveActivity7Days_() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const filterTime = sevenDaysAgo.toISOString();

  const allActivities = [];
  let pageToken = null;

  do {
    const request = {
      filter: 'time >= "' + filterTime + '"',
      consolidationStrategy: { none: {} },
      pageSize: 100
    };
    if (pageToken) {
      request.pageToken = pageToken;
    }

    const response = DriveActivity.Activity.query(request);
    const activities = response.activities || [];
    allActivities.push.apply(allActivities, activities);
    pageToken = response.nextPageToken || null;

    // Safety limit: 2000 activities max to avoid Apps Script timeout
    if (allActivities.length >= 2000) break;
  } while (pageToken);

  return allActivities;
}


/**
 * Process raw Drive Activity API responses into structured dashboard data.
 */
function processDriveActivities_(activities) {
  // docId -> { name, url, mimeType, actions: [{ user, action, timestamp, details }] }
  const docs = {};
  // user -> { email, actionCounts: { Edit: N, ... }, docsTouched: Set, shares: [] }
  const users = {};
  // For daily breakdown: 'YYYY-MM-DD' -> { user -> { doc -> { action -> count } } }
  const daily = {};
  // Track shares specifically
  const shareEvents = [];

  activities.forEach(function(activity) {
    // Get the target doc(s)
    var targets = activity.targets || [];
    var actors = activity.actors || [];
    var actions = activity.actions || [];
    var timestamp = getActivityTimestamp_(activity);
    var dateStr = timestamp ? formatDateKey_(timestamp) : 'Unknown';

    targets.forEach(function(target) {
      var driveItem = target.driveItem;
      if (!driveItem) return;

      var docId = driveItem.name ? driveItem.name.replace('items/', '') : null;
      if (!docId) return;

      var docTitle = driveItem.title || 'Untitled';
      var mimeType = driveItem.mimeType || '';
      var docUrl = buildDriveUrl_(docId, mimeType);

      // Initialize doc entry
      if (!docs[docId]) {
        docs[docId] = { name: docTitle, url: docUrl, mimeType: mimeType, actions: [], fileType: classifyMimeType_(mimeType) };
      }

      actors.forEach(function(actor) {
        var userEmail = getActorEmail_(actor);
        if (!userEmail) return;

        // Initialize user entry
        if (!users[userEmail]) {
          users[userEmail] = { email: userEmail, actionCounts: {}, docsTouched: {}, shares: [] };
        }

        actions.forEach(function(actionWrapper) {
          var actionType = getActionType_(actionWrapper);
          var actionDetails = getActionDetails_(actionWrapper);

          // Record in doc
          docs[docId].actions.push({
            user: userEmail,
            action: actionType,
            timestamp: timestamp,
            date: dateStr,
            details: actionDetails
          });

          // Record in user totals
          users[userEmail].actionCounts[actionType] = (users[userEmail].actionCounts[actionType] || 0) + 1;
          users[userEmail].docsTouched[docId] = docTitle;

          // Record in daily breakdown
          if (!daily[dateStr]) daily[dateStr] = {};
          if (!daily[dateStr][userEmail]) daily[dateStr][userEmail] = {};
          if (!daily[dateStr][userEmail][docId]) daily[dateStr][userEmail][docId] = { name: docTitle, actions: {} };
          daily[dateStr][userEmail][docId].actions[actionType] = (daily[dateStr][userEmail][docId].actions[actionType] || 0) + 1;

          // Track share events specifically
          if (actionType === 'Permission Change' && actionDetails) {
            shareEvents.push({
              doc: docTitle,
              docId: docId,
              sharedBy: userEmail,
              date: dateStr,
              details: actionDetails
            });
            users[userEmail].shares.push({ doc: docTitle, date: dateStr, details: actionDetails });
          }
        });
      });
    });
  });

  return {
    docs: docs,
    users: users,
    daily: daily,
    shareEvents: shareEvents,
    docCount: Object.keys(docs).length,
    totalActions: activities.length
  };
}


/**
 * Write the full dashboard to the sheet.
 */
function writeDashboardSheet_(ss, sheet, data) {
  var currentRow = 1;

  // ===== HEADER =====
  sheet.getRange(currentRow, 1).setValue('📄 DOCUMENT ACTIVITY DASHBOARD — LAST 7 DAYS');
  sheet.getRange(currentRow, 1).setFontSize(16).setFontWeight('bold');
  currentRow++;
  sheet.getRange(currentRow, 1).setValue('Generated: ' + new Date().toLocaleString());
  sheet.getRange(currentRow, 1).setFontStyle('italic').setFontColor('#666666');
  currentRow++;

  var startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  sheet.getRange(currentRow, 1).setValue('Period: ' + startDate.toLocaleDateString() + ' — ' + new Date().toLocaleDateString());
  sheet.getRange(currentRow, 1).setFontColor('#333333');
  currentRow++;
  sheet.getRange(currentRow, 1).setValue('Documents with activity: ' + data.docCount + '  |  Total actions recorded: ' + data.totalActions);
  sheet.getRange(currentRow, 1).setFontColor('#333333');
  currentRow += 2;

  // ===== SECTION 1: DOCUMENT SUMMARY =====
  currentRow = writeSectionHeader_(sheet, currentRow, 'ALL DOCUMENTS WITH ACTIVITY (Last 7 Days)', 8);

  var docHeaders = ['Document', 'Type', 'Total Actions', 'Unique Users', 'Edits', 'Shares', 'Comments', 'Link'];
  sheet.getRange(currentRow, 1, 1, docHeaders.length).setValues([docHeaders]);
  sheet.getRange(currentRow, 1, 1, docHeaders.length).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');
  var docTableHeaderRow = currentRow;
  currentRow++;

  var docIds = Object.keys(data.docs);
  // Sort by total actions descending
  docIds.sort(function(a, b) {
    return data.docs[b].actions.length - data.docs[a].actions.length;
  });

  var docRows = [];
  docIds.forEach(function(docId) {
    var doc = data.docs[docId];
    var uniqueUsers = {};
    var edits = 0, shares = 0, comments = 0;
    doc.actions.forEach(function(a) {
      uniqueUsers[a.user] = true;
      if (a.action === 'Edit') edits++;
      if (a.action === 'Permission Change') shares++;
      if (a.action === 'Comment') comments++;
    });
    docRows.push([
      doc.name,
      doc.fileType,
      doc.actions.length,
      Object.keys(uniqueUsers).length,
      edits,
      shares,
      comments,
      doc.url
    ]);
  });

  if (docRows.length > 0) {
    sheet.getRange(currentRow, 1, docRows.length, docHeaders.length).setValues(docRows);
    for (var r = 0; r < docRows.length; r++) {
      var rowNum = currentRow + r;
      if (r % 2 === 0) sheet.getRange(rowNum, 1, 1, docHeaders.length).setBackground('#f8f9fa');
      // Color-code file type
      var ftColors = { 'Sheet': '#e8f5e9', 'Doc': '#e3f2fd', 'Slides': '#fff3e0', 'PDF': '#fce4ec', 'Folder': '#f3e5f5' };
      var ftColor = ftColors[docRows[r][1]];
      if (ftColor) sheet.getRange(rowNum, 2).setBackground(ftColor);
      // Clickable link
      if (docRows[r][7] && String(docRows[r][7]).indexOf('http') === 0) {
        sheet.getRange(rowNum, 8).setRichTextValue(
          SpreadsheetApp.newRichTextValue().setText('Open').setLinkUrl(String(docRows[r][7])).build()
        );
      }
      // Highlight high activity
      if (docRows[r][2] >= 10) sheet.getRange(rowNum, 3).setBackground('#c8e6c9').setFontWeight('bold');
      if (docRows[r][5] > 0) sheet.getRange(rowNum, 6).setBackground('#fff9c4').setFontWeight('bold');
    }
    currentRow += docRows.length;
  } else {
    sheet.getRange(currentRow, 1).setValue('No document activity found in the last 7 days.').setFontStyle('italic');
    currentRow++;
  }

  currentRow += 2;

  // ===== SECTION 2: USER ACTIVITY BREAKDOWN =====
  currentRow = writeSectionHeader_(sheet, currentRow, 'USER ACTIVITY BREAKDOWN', 7);

  var userHeaders = ['User', 'Docs Touched', 'Total Actions', 'Edits', 'Comments', 'Shares Made', 'Most Active Doc'];
  sheet.getRange(currentRow, 1, 1, userHeaders.length).setValues([userHeaders]);
  sheet.getRange(currentRow, 1, 1, userHeaders.length).setFontWeight('bold').setBackground('#34A853').setFontColor('white');
  currentRow++;

  var userEmails = Object.keys(data.users).sort(function(a, b) {
    var totalA = 0, totalB = 0;
    Object.values(data.users[a].actionCounts).forEach(function(v) { totalA += v; });
    Object.values(data.users[b].actionCounts).forEach(function(v) { totalB += v; });
    return totalB - totalA;
  });

  userEmails.forEach(function(email, idx) {
    var user = data.users[email];
    var totalActions = 0;
    Object.values(user.actionCounts).forEach(function(v) { totalActions += v; });

    // Find most active doc for this user
    var docActivity = {};
    Object.keys(data.docs).forEach(function(docId) {
      data.docs[docId].actions.forEach(function(a) {
        if (a.user === email) {
          docActivity[docId] = (docActivity[docId] || 0) + 1;
        }
      });
    });
    var topDoc = '';
    var topCount = 0;
    Object.keys(docActivity).forEach(function(docId) {
      if (docActivity[docId] > topCount) {
        topCount = docActivity[docId];
        topDoc = data.docs[docId].name;
      }
    });

    sheet.getRange(currentRow, 1, 1, userHeaders.length).setValues([[
      email,
      Object.keys(user.docsTouched).length,
      totalActions,
      user.actionCounts['Edit'] || 0,
      user.actionCounts['Comment'] || 0,
      user.shares.length,
      topDoc + (topCount > 0 ? ' (' + topCount + 'x)' : '')
    ]]);
    if (idx % 2 === 0) sheet.getRange(currentRow, 1, 1, userHeaders.length).setBackground('#f8f9fa');
    if (user.shares.length > 0) sheet.getRange(currentRow, 6).setBackground('#fff9c4').setFontWeight('bold');
    currentRow++;
  });

  if (userEmails.length === 0) {
    sheet.getRange(currentRow, 1).setValue('No user activity found.').setFontStyle('italic');
    currentRow++;
  }

  currentRow += 2;

  // ===== SECTION 3: DAILY ACTIVITY LOG =====
  currentRow = writeSectionHeader_(sheet, currentRow, 'DAILY ACTIVITY LOG (Per User, Per Doc)', 6);

  var dailyHeaders = ['Date', 'User', 'Document', 'Action', 'Count', 'Details'];
  sheet.getRange(currentRow, 1, 1, dailyHeaders.length).setValues([dailyHeaders]);
  sheet.getRange(currentRow, 1, 1, dailyHeaders.length).setFontWeight('bold').setBackground('#7B1FA2').setFontColor('white');
  currentRow++;

  var dates = Object.keys(data.daily).sort().reverse();
  var dailyRowCount = 0;
  dates.forEach(function(dateStr) {
    var dayUsers = data.daily[dateStr];
    Object.keys(dayUsers).sort().forEach(function(userEmail) {
      var dayDocs = dayUsers[userEmail];
      Object.keys(dayDocs).forEach(function(docId) {
        var entry = dayDocs[docId];
        Object.keys(entry.actions).forEach(function(actionType) {
          if (dailyRowCount >= 500) return; // Limit to prevent sheet overflow
          var count = entry.actions[actionType];
          sheet.getRange(currentRow, 1, 1, dailyHeaders.length).setValues([[
            dateStr,
            userEmail,
            entry.name,
            actionType,
            count,
            ''
          ]]);
          if (dailyRowCount % 2 === 0) sheet.getRange(currentRow, 1, 1, dailyHeaders.length).setBackground('#f8f9fa');
          // Highlight action types
          var actionColors = {
            'Edit': '#e8f5e9', 'Permission Change': '#fff9c4', 'Comment': '#e3f2fd',
            'Create': '#f3e5f5', 'Delete': '#ffcdd2', 'Move': '#fff3e0', 'Rename': '#e0f7fa'
          };
          if (actionColors[actionType]) sheet.getRange(currentRow, 4).setBackground(actionColors[actionType]);
          currentRow++;
          dailyRowCount++;
        });
      });
    });
  });

  if (dailyRowCount === 0) {
    sheet.getRange(currentRow, 1).setValue('No daily activity recorded.').setFontStyle('italic');
    currentRow++;
  }

  currentRow += 2;

  // ===== SECTION 4: SHARE / PERMISSION EVENTS =====
  currentRow = writeSectionHeader_(sheet, currentRow, 'SHARING & PERMISSION CHANGES', 4);

  var shareHeaders = ['Date', 'Shared By', 'Document', 'Details'];
  sheet.getRange(currentRow, 1, 1, shareHeaders.length).setValues([shareHeaders]);
  sheet.getRange(currentRow, 1, 1, shareHeaders.length).setFontWeight('bold').setBackground('#F57C00').setFontColor('white');
  currentRow++;

  if (data.shareEvents.length > 0) {
    data.shareEvents.forEach(function(evt, idx) {
      sheet.getRange(currentRow, 1, 1, shareHeaders.length).setValues([[
        evt.date,
        evt.sharedBy,
        evt.doc,
        evt.details
      ]]);
      if (idx % 2 === 0) sheet.getRange(currentRow, 1, 1, shareHeaders.length).setBackground('#fff8e1');
      currentRow++;
    });
  } else {
    sheet.getRange(currentRow, 1).setValue('No sharing events in the last 7 days.').setFontStyle('italic');
    currentRow++;
  }

  currentRow += 2;

  // ===== SECTION 5: PLATFORM LIMITATIONS NOTE =====
  currentRow = writeSectionHeader_(sheet, currentRow, '⚠️ WHAT THIS DASHBOARD CANNOT TRACK', 5);

  var limitations = [
    ['Who viewed (opened) a doc', 'Google does not expose view events via API (privacy policy)'],
    ['How long someone viewed', 'View duration is not tracked by any Google API'],
    ['Copy/paste activity', 'Clipboard operations are not tracked by Google'],
    ['How to get view data?', 'Google Workspace Admin Console > Reports > Drive audit log (requires admin access)'],
    ['What IS tracked above?', 'Edits, shares, comments, creates, moves, renames, deletes — with who, when, and how many times']
  ];

  limitations.forEach(function(row, idx) {
    sheet.getRange(currentRow, 1).setValue(row[0]).setFontWeight('bold');
    sheet.getRange(currentRow, 2, 1, 4).mergeAcross().setValue(row[1]);
    if (idx % 2 === 0) sheet.getRange(currentRow, 1, 1, 5).setBackground('#fff3e0');
    currentRow++;
  });

  // ===== COLUMN WIDTHS =====
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 250);
  sheet.setColumnWidth(4, 140);
  sheet.setColumnWidth(5, 80);
  sheet.setColumnWidth(6, 300);
  sheet.setColumnWidth(7, 200);
  sheet.setColumnWidth(8, 80);
  sheet.setFrozenRows(docTableHeaderRow);
}


// ============================================================================
// DRIVE ACTIVITY API HELPERS
// ============================================================================

/**
 * Write a black section header row.
 */
function writeSectionHeader_(sheet, row, title, colSpan) {
  sheet.getRange(row, 1).setValue(title);
  sheet.getRange(row, 1, 1, colSpan).setBackground('#000000').setFontColor('#FFFFFF').setFontWeight('bold');
  return row + 1;
}


/**
 * Get timestamp from an activity.
 */
function getActivityTimestamp_(activity) {
  if (!activity.timestamp) return null;
  return new Date(activity.timestamp);
}


/**
 * Format date as YYYY-MM-DD for grouping.
 */
function formatDateKey_(date) {
  if (!date || !(date instanceof Date)) return 'Unknown';
  var y = date.getFullYear();
  var m = ('0' + (date.getMonth() + 1)).slice(-2);
  var d = ('0' + date.getDate()).slice(-2);
  return y + '-' + m + '-' + d;
}


/**
 * Get the email of an actor from a Drive Activity actor object.
 */
function getActorEmail_(actor) {
  if (actor.user && actor.user.knownUser) {
    // The personName is in format 'people/ACCOUNT_ID', need to resolve
    var personName = actor.user.knownUser.personName;
    if (actor.user.knownUser.isCurrentUser) {
      return Session.getEffectiveUser().getEmail();
    }
    // Try to resolve via People API or use personName as fallback
    try {
      var person = People.People.get(personName, { personFields: 'emailAddresses' });
      if (person.emailAddresses && person.emailAddresses.length > 0) {
        return person.emailAddresses[0].value;
      }
    } catch (e) {
      // People API not enabled or can't resolve — use ID as fallback
    }
    return personName || 'Unknown User';
  }
  if (actor.administrator) return 'Admin';
  if (actor.system) return 'System';
  if (actor.impersonation) return 'Impersonation';
  return 'Anonymous';
}


/**
 * Determine action type from an action wrapper.
 */
function getActionType_(actionWrapper) {
  if (actionWrapper.detail) {
    if (actionWrapper.detail.edit) return 'Edit';
    if (actionWrapper.detail.create) return 'Create';
    if (actionWrapper.detail.move) return 'Move';
    if (actionWrapper.detail.rename) return 'Rename';
    if (actionWrapper.detail.delete_) return 'Delete';
    if (actionWrapper.detail.restore) return 'Restore';
    if (actionWrapper.detail.permissionChange) return 'Permission Change';
    if (actionWrapper.detail.comment) return 'Comment';
    if (actionWrapper.detail.dlpChange) return 'DLP Change';
    if (actionWrapper.detail.reference) return 'Reference';
    if (actionWrapper.detail.settingsChange) return 'Settings Change';
  }
  // Fallback: check top-level keys
  var keys = Object.keys(actionWrapper);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i] !== 'detail') return keys[i];
  }
  return 'Unknown';
}


/**
 * Get human-readable details from an action.
 */
function getActionDetails_(actionWrapper) {
  var detail = actionWrapper.detail || actionWrapper;

  if (detail.permissionChange) {
    var parts = [];
    var added = detail.permissionChange.addedPermissions || [];
    var removed = detail.permissionChange.removedPermissions || [];
    added.forEach(function(p) {
      var who = '';
      if (p.user && p.user.knownUser && p.user.knownUser.personName) {
        who = p.user.knownUser.personName;
      } else if (p.anyone) {
        who = 'Anyone with link';
      } else if (p.domain) {
        who = 'Domain: ' + (p.domain.name || '');
      } else if (p.group) {
        who = 'Group: ' + (p.group.email || '');
      }
      var role = p.role || '';
      parts.push('Added ' + role + (who ? ' for ' + who : ''));
    });
    removed.forEach(function(p) {
      parts.push('Removed access');
    });
    return parts.join('; ') || 'Permission changed';
  }

  if (detail.comment) {
    var commentType = '';
    if (detail.comment.post) commentType = 'Posted comment';
    if (detail.comment.assignment) commentType = 'Assigned';
    if (detail.comment.suggestion) commentType = 'Suggestion';
    if (detail.comment.deletedPost) commentType = 'Deleted comment';
    if (detail.comment.editedPost) commentType = 'Edited comment';
    if (detail.comment.resolvedPost) commentType = 'Resolved comment';
    if (detail.comment.reopenedPost) commentType = 'Reopened comment';
    return commentType || 'Comment activity';
  }

  if (detail.rename) {
    return 'Renamed' + (detail.rename.newTitle ? ' to "' + detail.rename.newTitle + '"' : '');
  }

  if (detail.move) {
    var addedParents = (detail.move.addedParents || []).map(function(p) {
      return p.driveItem ? p.driveItem.title : '';
    }).filter(Boolean);
    if (addedParents.length > 0) return 'Moved to ' + addedParents.join(', ');
    return 'Moved';
  }

  return '';
}


/**
 * Build a Google Drive URL from a file ID and mime type.
 */
function buildDriveUrl_(fileId, mimeType) {
  if (!fileId) return '';
  if (mimeType === 'application/vnd.google-apps.document') {
    return 'https://docs.google.com/document/d/' + fileId;
  }
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    return 'https://docs.google.com/spreadsheets/d/' + fileId;
  }
  if (mimeType === 'application/vnd.google-apps.presentation') {
    return 'https://docs.google.com/presentation/d/' + fileId;
  }
  if (mimeType === 'application/vnd.google-apps.folder') {
    return 'https://drive.google.com/drive/folders/' + fileId;
  }
  return 'https://drive.google.com/file/d/' + fileId;
}


/**
 * Classify a MIME type into a friendly label.
 */
function classifyMimeType_(mimeType) {
  if (!mimeType) return 'File';
  if (mimeType.indexOf('spreadsheet') >= 0) return 'Sheet';
  if (mimeType.indexOf('document') >= 0) return 'Doc';
  if (mimeType.indexOf('presentation') >= 0) return 'Slides';
  if (mimeType.indexOf('form') >= 0) return 'Form';
  if (mimeType.indexOf('folder') >= 0) return 'Folder';
  if (mimeType.indexOf('pdf') >= 0) return 'PDF';
  if (mimeType.indexOf('image') >= 0) return 'Image';
  if (mimeType.indexOf('video') >= 0) return 'Video';
  return 'File';
}


/**
 * Extract Google Doc/Sheet ID from a URL
 */
function extractDocIdFromUrl_(url) {
  if (!url) return null;
  var match = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}


/**
 * ============================================================================
 * CCAT CONTACT REPORT & DICTATION SYSTEM
 * ============================================================================
 * 
 * Add this to your existing CCAT Home Base Apps Script to enable:
 * 
 *   📞 Voice/text dictation of contact calls
 *   🤝 Auto-population of Advisory Network
 *   💬 Conversation Log entries
 *   📄 Executive Summary call report docs (like Morasky format)
 * 
 * INSTALLATION:
 *   1. Open your CCAT Home Base spreadsheet
 *   2. Extensions > Apps Script
 *   3. Paste this code at the BOTTOM of your existing script
 *   4. Add your CLAUDE_API_KEY to Script Properties
 *   5. Run: setupContactReportSystem()
 *   6. Refresh spreadsheet to see new menu items
 * 
 * USAGE:
 *   Option A: Click 🎛️ CCAT System > 🤝 Advisory Network > 📞 Log Contact Call
 *   Option B: Upload voice memo to "CCAT Contact Dictations" Drive folder
 * 
 * ============================================================================
 */


// ============================================================================
// CONFIGURATION
// ============================================================================

const CONTACT_REPORT_CONFIG = {
  // Claude model
  model: 'claude-sonnet-4-20250514',
  maxTokens: 8192,
  
  // Folder for voice memo uploads (created automatically)
  dictationFolderName: 'CCAT Contact Dictations',
  
  // Folder for completed call reports
  reportsFolderName: 'CCAT Call Reports',
  
  // Sheet names (should match your existing CONFIG)
  sheets: {
    advisoryNetwork: '🤝 Advisory Network',
    conversationLog: '💬 Conversation Log',
    callReportRegistry: '📞 Call Report Registry'
  },
  
  // Strategic value options
  strategicValueOptions: ['Exceptional', 'Very High', 'High', 'Moderate', 'Limited', 'Unclear'],
  
  // Potential roles (from your existing config)
  potentialRoles: ['Advisory Committee', 'Visiting Lecturer', 'Potential Hire', 'Fellow', 'Collaborator', 'Funder', 'General Network'],
  
  // Track processed audio files
  processedFilesKey: 'PROCESSED_DICTATION_IDS'
};


// ============================================================================
// SETUP
// ============================================================================

/**
 * Initial setup for the contact report system
 */
function setupContactReportSystem() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const response = ui.alert(
    '📞 Setup Contact Report System',
    'This will:\n\n' +
    '1. Create "📞 Call Report Registry" sheet\n' +
    '2. Create Drive folders for dictations and reports\n' +
    '3. Add columns to Advisory Network if needed\n' +
    '4. Set up hourly trigger for voice memo processing\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    ss.toast('Creating registry sheet...', '⚙️ Setup', -1);
    createCallReportRegistrySheet_();
    
    ss.toast('Creating Drive folders...', '⚙️ Setup', -1);
    createDictationFolders_();
    
    ss.toast('Verifying Advisory Network columns...', '⚙️ Setup', -1);
    ensureAdvisoryNetworkColumns_();
    
    ss.toast('Creating trigger...', '⚙️ Setup', -1);
    createDictationProcessingTrigger_();
    
    ss.toast('Setup complete!', '✅ Done', 5);
    
    // Check for API key
    const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
    
    if (!apiKey) {
      ui.alert(
        '⚠️ Almost Done - API Key Needed',
        'The system is set up, but you need to add your Claude API key:\n\n' +
        '1. In Apps Script, click ⚙️ Project Settings\n' +
        '2. Scroll to Script Properties\n' +
        '3. Add: CLAUDE_API_KEY = your key from console.anthropic.com\n\n' +
        'Then refresh your spreadsheet to see the new menu items.',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        '✅ Setup Complete',
        'Contact Report System is ready!\n\n' +
        'NEW MENU ITEMS:\n' +
        '• 🎛️ CCAT System > 🤝 Advisory Network > 📞 Log Contact Call\n' +
        '• 🎛️ CCAT System > 🤝 Advisory Network > 📋 View Call Reports\n\n' +
        'VOICE MEMO OPTION:\n' +
        'Upload .m4a/.mp3/.wav files to the "CCAT Contact Dictations" folder.\n' +
        'They\'ll be processed automatically every hour.\n\n' +
        'Refresh your spreadsheet to see new menu items.',
        ui.ButtonSet.OK
      );
    }
    
  } catch (error) {
    ui.alert('❌ Setup Error', error.message, ui.ButtonSet.OK);
    console.error(error);
  }
}


/**
 * Create the Call Report Registry sheet
 */
function createCallReportRegistrySheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONTACT_REPORT_CONFIG.sheets.callReportRegistry);
  
  if (sheet) return sheet;
  
  sheet = ss.insertSheet(CONTACT_REPORT_CONFIG.sheets.callReportRegistry);
  
  const headers = [
    'Report ID', 'Date', 'Primary Contact', 'Organization', 'Duration',
    'Subject', 'Strategic Value', 'Report Doc URL', 'Contacts Added',
    'Next Steps Count', 'Status', 'Created By'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#C9A227')
    .setFontColor('white');
  
  // Column widths
  const widths = [80, 100, 150, 150, 80, 200, 100, 300, 100, 100, 80, 150];
  widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  
  sheet.setFrozenRows(1);
  
  return sheet;
}


/**
 * Create Drive folders for dictations and reports
 */
function createDictationFolders_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const parentFolder = DriveApp.getFileById(ss.getId()).getParents().next();
  
  // Create dictations folder
  let dictFolder;
  const dictFolders = parentFolder.getFoldersByName(CONTACT_REPORT_CONFIG.dictationFolderName);
  if (dictFolders.hasNext()) {
    dictFolder = dictFolders.next();
  } else {
    dictFolder = parentFolder.createFolder(CONTACT_REPORT_CONFIG.dictationFolderName);
  }
  
  // Create reports folder
  let reportsFolder;
  const reportFolders = parentFolder.getFoldersByName(CONTACT_REPORT_CONFIG.reportsFolderName);
  if (reportFolders.hasNext()) {
    reportsFolder = reportFolders.next();
  } else {
    reportsFolder = parentFolder.createFolder(CONTACT_REPORT_CONFIG.reportsFolderName);
  }
  
  // Store folder IDs
  const props = PropertiesService.getDocumentProperties();
  props.setProperty('DICTATION_FOLDER_ID', dictFolder.getId());
  props.setProperty('REPORTS_FOLDER_ID', reportsFolder.getId());
  
  return { dictFolder, reportsFolder };
}


/**
 * Ensure Advisory Network has all needed columns
 */
function ensureAdvisoryNetworkColumns_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONTACT_REPORT_CONFIG.sheets.advisoryNetwork);
  if (!sheet) return;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let lastCol = sheet.getLastColumn();
  
  const neededColumns = [
    { name: 'Strategic Value', width: 120 },
    { name: 'Executive Summary', width: 300 },
    { name: 'Key Links', width: 200 },
    { name: 'Source Call Report', width: 250 },
    { name: 'Introduced By', width: 150 }
  ];
  
  neededColumns.forEach(col => {
    if (!headers.includes(col.name)) {
      lastCol++;
      sheet.getRange(1, lastCol).setValue(col.name);
      sheet.setColumnWidth(lastCol, col.width);
    }
  });
  
  // Apply header formatting
  sheet.getRange(1, 1, 1, lastCol)
    .setFontWeight('bold')
    .setBackground('#4285F4')
    .setFontColor('white');
    
  // Add Strategic Value dropdown
  const svCol = headers.indexOf('Strategic Value');
  if (svCol >= 0) {
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(CONTACT_REPORT_CONFIG.strategicValueOptions, true)
      .build();
    sheet.getRange(2, svCol + 1, 500, 1).setDataValidation(rule);
  }
}


/**
 * Create hourly trigger to process voice memos
 */
function createDictationProcessingTrigger_() {
  // Remove existing triggers
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'processNewDictations') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new hourly trigger
  ScriptApp.newTrigger('processNewDictations')
    .timeBased()
    .everyHours(1)
    .create();
}


// ============================================================================
// MAIN ENTRY POINTS
// ============================================================================

/**
 * Show the dictation input dialog
 * Called from menu: 🎛️ CCAT System > 🤝 Advisory Network > 📞 Log Contact Call
 */
function showContactDictationDialog() {
  const html = HtmlService.createHtmlOutput(getContactDictationDialogHtml_())
    .setWidth(650)
    .setHeight(720);
  
  SpreadsheetApp.getUi().showModalDialog(html, '📞 Log Contact Call');
}


/**
 * Process new voice memos from the dictation folder
 * Called by hourly trigger or manually
 */
function processNewDictations() {
  const props = PropertiesService.getDocumentProperties();
  const folderId = props.getProperty('DICTATION_FOLDER_ID');
  
  if (!folderId) {
    console.log('Dictation folder not configured. Run setupContactReportSystem first.');
    return;
  }
  
  const folder = DriveApp.getFolderById(folderId);
  const processedIds = getProcessedDictationIds_();
  const files = folder.getFiles();
  
  let processedCount = 0;
  
  while (files.hasNext()) {
    const file = files.next();
    const fileId = file.getId();
    const mimeType = file.getMimeType();
    
    // Skip if already processed
    if (processedIds.includes(fileId)) continue;
    
    // Check if it's an audio file
    if (!mimeType.includes('audio')) continue;
    
    try {
      console.log('Processing: ' + file.getName());
      
      // Transcribe the audio (using Google Cloud Speech or external service)
      const transcript = transcribeAudio_(file);
      
      if (transcript) {
        // Process the transcript
        const result = processContactDictation({
          text: transcript,
          sourceFile: file.getName(),
          sourceType: 'voice_memo'
        });
        
        if (result.success) {
          markDictationProcessed_(fileId);
          processedCount++;
          
          // Move file to processed subfolder
          moveToProcessedFolder_(file, folder);
        }
      }
      
    } catch (error) {
      console.error('Error processing ' + file.getName() + ': ' + error.message);
    }
  }
  
  if (processedCount > 0) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `Processed ${processedCount} voice memo(s)`, 
      '📞 Dictations', 
      5
    );
  }
}


/**
 * Main processing function - takes dictation text and routes to all destinations
 */
function processContactDictation(input) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    ss.toast('Processing dictation with Claude...', '🤖 AI', -1);
    
    // Call Claude to analyze and structure the dictation
    const analysis = analyzeContactDictation_(input.text, input.contactName, input.organization);
    
    if (!analysis || analysis.error) {
      return { success: false, error: analysis?.error || 'Analysis failed' };
    }
    
    ss.toast('Creating call report document...', '📄 Report', -1);
    
    // Create the call report document
    const reportDoc = createCallReportDocument_(analysis, input);
    
    ss.toast('Updating Advisory Network...', '🤝 Contacts', -1);
    
    // Add/update contacts in Advisory Network
    const contactsAdded = updateAdvisoryNetworkFromReport_(analysis, reportDoc.url);
    
    ss.toast('Logging conversation...', '💬 Log', -1);
    
    // Add entry to Conversation Log
    addConversationLogEntry_(analysis, reportDoc.url);
    
    ss.toast('Registering report...', '📋 Registry', -1);
    
    // Register in Call Report Registry
    registerCallReport_(analysis, reportDoc, contactsAdded, input);
    
    ss.toast('Contact report complete!', '✅ Done', 5);
    
    return {
      success: true,
      reportUrl: reportDoc.url,
      contactsAdded: contactsAdded,
      primaryContact: analysis.primaryContact?.name
    };
    
  } catch (error) {
    console.error('processContactDictation error:', error);
    return { success: false, error: error.message };
  }
}


// ============================================================================
// CLAUDE API - CONTACT ANALYSIS
// ============================================================================

/**
 * Analyze dictation using Claude API
 */
function analyzeContactDictation_(text, suggestedContact, suggestedOrg) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  
  if (!apiKey) {
    return { error: 'CLAUDE_API_KEY not configured in Script Properties' };
  }
  
  const prompt = buildContactAnalysisPrompt_(text, suggestedContact, suggestedOrg);
  
  const payload = {
    model: CONTACT_REPORT_CONFIG.model,
    max_tokens: CONTACT_REPORT_CONFIG.maxTokens,
    messages: [{ role: 'user', content: prompt }]
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', options);
    const json = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() !== 200 || json.error) {
      return { error: json.error?.message || 'API error' };
    }
    
    // Parse the structured response
    const content = json.content[0].text;
    return parseContactAnalysisResponse_(content);
    
  } catch (error) {
    return { error: error.message };
  }
}


/**
 * Build the prompt for contact analysis - based on Morasky report format
 */
function buildContactAnalysisPrompt_(text, suggestedContact, suggestedOrg) {
  return `You are a professional advancement/development officer assistant for CCAT (CHANEL Center for Artists and Technology at CalArts). Analyze this dictated call recap and extract structured data for a CRM system plus generate an executive summary document.

${suggestedContact ? `The user indicated this call was with: ${suggestedContact}` : ''}
${suggestedOrg ? `Organization: ${suggestedOrg}` : ''}

DICTATED CALL RECAP:
"""
${text}
"""

Please analyze this and respond with a JSON object (no markdown code blocks, just raw JSON) with this exact structure:

{
  "callMetadata": {
    "date": "YYYY-MM-DD or null if not specified",
    "duration": "estimated duration like '~1 hour' or null",
    "subject": "brief subject line for the call, e.g. 'CCAT Program Introduction & Potential Collaboration'"
  },
  
  "primaryContact": {
    "name": "full name",
    "title": "job title if mentioned",
    "organization": "company/institution",
    "institutionType": "University/Museum/Game Company/Tech Company/Studio/Research Lab/Non-Profit/Government/Other",
    "industry": "Technology/Gaming/Film-TV/Education/Arts-Culture/Research/Government/Non-Profit/Other",
    "region": "Los Angeles/California/West Coast/East Coast/Midwest/South/International/Remote",
    "strategicValue": "Exceptional/Very High/High/Moderate/Limited/Unclear",
    "executiveSummary": "2-4 sentence professional bio and context based on what was discussed - written for a donor database",
    "email": "if mentioned, otherwise null",
    "phone": "if mentioned, otherwise null",
    "links": ["any URLs, LinkedIn profiles, or websites mentioned"],
    "potentialRole": "Advisory Committee/Visiting Lecturer/Potential Hire/Fellow/Collaborator/Funder/General Network",
    "calArtsConnection": "describe any CalArts connection mentioned, or 'None'"
  },
  
  "additionalContacts": [
    {
      "name": "name of person mentioned who could be introduced",
      "title": "their title/role",
      "organization": "their company/institution",
      "institutionType": "same options as above",
      "industry": "same options as above",
      "strategicValue": "Exceptional/Very High/High/Moderate/Limited/Unclear",
      "executiveSummary": "2-4 sentence description based on what was said - written professionally",
      "potentialRole": "what role they might play for CCAT",
      "introducedBy": "name of the primary contact offering the introduction",
      "links": ["any URLs mentioned"],
      "notes": "additional context about this person"
    }
  ],
  
  "executiveReport": {
    "summary": "3-5 paragraph executive summary of the call written professionally in third person past tense. Start with a lead paragraph summarizing who was contacted and why it matters. Include key discussion points and strategic assessment. This should read like the 'Executive Summary' section of the Morasky report.",
    
    "keyBackground": "1-2 paragraphs about the primary contact's relevant background, career history, and why they're valuable. Write in a style suitable for a leadership briefing.",
    
    "valveConnections": "If applicable, describe any organizational connections or access the contact has (rename this field contextually based on their org)",
    
    "keyInsights": [
      "Bullet point insight #1 from the discussion",
      "Bullet point insight #2",
      "etc."
    ],
    
    "nextSteps": [
      {
        "action": "specific action to take",
        "owner": "who should do it (ED, Contact name, etc.)",
        "priority": "High/Medium/Low"
      }
    ],
    
    "assessment": "1-2 paragraph strategic assessment of this contact and opportunity. What's the potential value? What are the risks or considerations?"
  },
  
  "potentialIntroductions": [
    {
      "name": "Person who could be introduced",
      "introducedBy": "Who offered to make the intro",
      "description": "2-3 sentences about who this person is and why they matter",
      "potentialRole": "What role they might play for CCAT",
      "strategicValue": "Exceptional/Very High/High/Moderate/Limited/Unclear"
    }
  ],
  
  "conversationLogEntry": {
    "summary": "1-2 sentence summary for the conversation log database",
    "outcome": "Positive/Neutral/Needs Follow-up/Declined",
    "followUpDate": "suggested follow-up date in YYYY-MM-DD format or null",
    "actionItems": "brief comma-separated list of action items"
  }
}

IMPORTANT GUIDELINES:
- Extract ALL people mentioned, even briefly, as separate contacts
- For executive summaries, write professionally as if for a donor/prospect database
- The executiveReport.summary should be detailed enough to stand alone as a briefing document
- Infer strategic value based on position, connections, and potential value to an arts/technology program
- For additionalContacts, always set introducedBy to the primary contact's name
- If the call discusses someone offering introductions, capture each offered introduction in potentialIntroductions
- Don't make up information - use null or empty arrays if something isn't mentioned
- Write in a professional advancement/development tone throughout`;
}


/**
 * Parse Claude's response into structured data
 */
function parseContactAnalysisResponse_(content) {
  try {
    // Try to extract JSON from the response
    let jsonStr = content.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    
    return JSON.parse(jsonStr);
    
  } catch (error) {
    console.error('Failed to parse Claude response:', error);
    console.log('Raw response:', content.substring(0, 500));
    return { error: 'Failed to parse AI response: ' + error.message };
  }
}


// ============================================================================
// DOCUMENT CREATION - MORASKY FORMAT
// ============================================================================

/**
 * Create the call report document (Morasky-style format)
 */
function createCallReportDocument_(analysis, input) {
  const props = PropertiesService.getDocumentProperties();
  const reportsFolderId = props.getProperty('REPORTS_FOLDER_ID');
  
  const primaryName = analysis.primaryContact?.name || 'Unknown Contact';
  const date = analysis.callMetadata?.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  // Create document
  const docTitle = `Call Report: ${primaryName}`;
  const doc = DocumentApp.create(docTitle);
  const body = doc.getBody();
  
  // Move to reports folder
  if (reportsFolderId) {
    const file = DriveApp.getFileById(doc.getId());
    file.moveTo(DriveApp.getFolderById(reportsFolderId));
  }
  
  // Build document content
  buildMoraskyStyleReport_(body, analysis, date);
  
  doc.saveAndClose();
  
  return {
    id: doc.getId(),
    url: doc.getUrl(),
    name: docTitle
  };
}


/**
 * Build the call report document content in Morasky format
 */
function buildMoraskyStyleReport_(body, analysis, date) {
  const meta = analysis.callMetadata || {};
  const primary = analysis.primaryContact || {};
  const report = analysis.executiveReport || {};
  const intros = analysis.potentialIntroductions || [];
  const additional = analysis.additionalContacts || [];
  
  // ===== HEADER =====
  body.appendParagraph(`Call Report: ${primary.name || 'Contact'}`)
    .setHeading(DocumentApp.ParagraphHeading.HEADING1)
    .setBold(true);
  
  // Metadata block
  const metaText = body.appendParagraph(
    `Date: ${date}\n` +
    `Duration: ${meta.duration || '~1 hour'}\n` +
    `Subject: ${meta.subject || 'CCAT Introduction'}`
  );
  metaText.setFontSize(10);
  
  body.appendHorizontalRule();
  
  // ===== EXECUTIVE SUMMARY =====
  body.appendParagraph('Executive Summary')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  
  body.appendParagraph(report.summary || 'No summary available.');
  
  // Key Background (bold label)
  if (report.keyBackground) {
    const bgLabel = body.appendParagraph('Key Background: ');
    bgLabel.editAsText().setBold(true);
    
    // Append the content to the same paragraph or next
    body.appendParagraph(report.keyBackground);
  }
  
  // Organizational connections (like "Valve Connections" in Morasky)
  if (report.valveConnections) {
    const org = primary.organization || 'Organizational';
    const connLabel = body.appendParagraph(`${org} Connections: `);
    connLabel.editAsText().setBold(true);
    body.appendParagraph(report.valveConnections);
  }
  
  // ===== POTENTIAL INTRODUCTIONS =====
  if (intros.length > 0) {
    body.appendHorizontalRule();
    body.appendParagraph('Potential Introductions Offered')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    
    body.appendParagraph(`${primary.name} volunteered to connect us with several individuals:`);
    
    intros.forEach((intro, index) => {
      body.appendParagraph(`${index + 1}. ${intro.name}`)
        .setHeading(DocumentApp.ParagraphHeading.HEADING3);
      
      body.appendParagraph(intro.description || 'No description available.');
      
      if (intro.potentialRole) {
        const roleText = body.appendParagraph(`Potential Role: ${intro.potentialRole}`);
        roleText.editAsText().setBold(true);
      }
    });
  }
  
  // ===== KEY INSIGHTS =====
  if (report.keyInsights && report.keyInsights.length > 0) {
    body.appendHorizontalRule();
    body.appendParagraph('Key Insights from Discussion')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    
    report.keyInsights.forEach(insight => {
      body.appendListItem(insight);
    });
  }
  
  // ===== NEXT STEPS =====
  if (report.nextSteps && report.nextSteps.length > 0) {
    body.appendParagraph('Next Steps')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    
    report.nextSteps.forEach((step, index) => {
      const stepText = typeof step === 'string' ? step : `${step.action}${step.owner ? ' — ' + step.owner : ''}`;
      const item = body.appendListItem(stepText);
      item.setGlyphType(DocumentApp.GlyphType.NUMBER);
    });
  }
  
  // ===== ASSESSMENT =====
  if (report.assessment) {
    body.appendHorizontalRule();
    body.appendParagraph('Assessment')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph(report.assessment);
  }
  
  // ===== CONTACT PROFILES FOR TRACKER =====
  body.appendHorizontalRule();
  body.appendParagraph('Contact Profiles for Tracker')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  
  // Primary contact profile
  appendContactProfileSection_(body, primary, true);
  
  // Additional contact profiles
  additional.forEach(contact => {
    appendContactProfileSection_(body, contact, false);
  });
  
  // ===== FOOTER =====
  body.appendHorizontalRule();
  const footer = body.appendParagraph(
    `Generated: ${new Date().toLocaleString()}\n` +
    `By: CCAT Contact Report System`
  );
  footer.setFontSize(9).setForegroundColor('#999999');
}


/**
 * Append a contact profile section to the document
 */
function appendContactProfileSection_(body, contact, isPrimary) {
  if (!contact || !contact.name) return;
  
  body.appendParagraph(contact.name)
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  
  // Role line
  const roleOrg = [contact.title, contact.organization].filter(Boolean).join(', ');
  if (roleOrg) {
    const roleLine = body.appendParagraph(`Role: ${roleOrg}`);
    roleLine.editAsText().setBold(true);
  }
  
  // Strategic value
  const svLine = body.appendParagraph(`Strategic Value: ${(contact.strategicValue || 'UNCLEAR').toUpperCase()}`);
  svLine.editAsText().setBold(true);
  
  // Executive summary / bio
  if (contact.executiveSummary) {
    body.appendParagraph('');
    body.appendParagraph(contact.executiveSummary);
  }
  
  // Links section
  if (contact.links && contact.links.length > 0) {
    body.appendParagraph('Links:').editAsText().setBold(true);
    contact.links.forEach(link => {
      if (link) body.appendListItem(link);
    });
  }
  
  body.appendParagraph(''); // Spacing
}


// ============================================================================
// DATABASE UPDATES
// ============================================================================

/**
 * Update Advisory Network with contacts from the report
 */
function updateAdvisoryNetworkFromReport_(analysis, reportUrl) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONTACT_REPORT_CONFIG.sheets.advisoryNetwork);
  
  if (!sheet) return 0;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  let contactsAdded = 0;
  
  // Add primary contact
  if (analysis.primaryContact?.name) {
    addOrUpdateContact_(sheet, headers, analysis.primaryContact, reportUrl, null);
    contactsAdded++;
  }
  
  // Add additional contacts (introductions)
  const additional = analysis.additionalContacts || [];
  additional.forEach(contact => {
    if (contact.name) {
      addOrUpdateContact_(sheet, headers, contact, reportUrl, analysis.primaryContact?.name);
      contactsAdded++;
    }
  });
  
  return contactsAdded;
}


/**
 * Add or update a single contact in Advisory Network
 */
function addOrUpdateContact_(sheet, headers, contact, reportUrl, introducedBy) {
  const col = (name) => headers.indexOf(name);
  
  // Check if contact already exists
  const existingRow = findContactByName_(sheet, contact.name);
  
  if (existingRow > 0) {
    // Update existing contact with new info
    updateExistingContact_(sheet, existingRow, headers, contact, reportUrl);
    return;
  }
  
  // Generate new contact ID
  const newId = generateContactId_(sheet);
  const newRow = sheet.getLastRow() + 1;
  
  // Helper to set cell value
  const set = (name, val) => {
    const c = col(name);
    if (c >= 0 && val !== null && val !== undefined) {
      sheet.getRange(newRow, c + 1).setValue(val);
    }
  };
  
  set('Contact ID', newId);
  set('Name', contact.name);
  set('Title', contact.title);
  set('Organization', contact.organization);
  set('Institution Type', contact.institutionType);
  set('Industry', contact.industry);
  set('Region', contact.region);
  set('Strategic Value', contact.strategicValue);
  set('Executive Summary', contact.executiveSummary);
  set('Potential Role', contact.potentialRole);
  set('CalArts Connection', contact.calArtsConnection);
  set('Email', contact.email);
  set('Phone', contact.phone);
  set('Key Links', contact.links?.join('\n'));
  set('Source Call Report', reportUrl);
  set('Introduced By', introducedBy || contact.introducedBy);
  set('Date Added', new Date());
  set('Last Contact Date', new Date());
  set('Status', 'New');
  set('Added By', Session.getActiveUser().getEmail());
  set('Notes', contact.notes);
}


/**
 * Find a contact by name (case-insensitive)
 */
function findContactByName_(sheet, name) {
  if (!name) return -1;
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const nameCol = headers.indexOf('Name');
  if (nameCol < 0) return -1;
  
  const names = sheet.getRange(2, nameCol + 1, lastRow - 1, 1).getValues();
  const searchName = name.toLowerCase().trim();
  
  for (let i = 0; i < names.length; i++) {
    if (String(names[i][0]).toLowerCase().trim() === searchName) {
      return i + 2; // Return 1-indexed row number
    }
  }
  
  return -1;
}


/**
 * Update an existing contact with new information
 */
function updateExistingContact_(sheet, row, headers, contact, reportUrl) {
  const col = (name) => headers.indexOf(name);
  
  // Only update fields that are empty or if new info is more detailed
  const updateIfEmpty = (colName, newVal) => {
    const c = col(colName);
    if (c < 0 || !newVal) return;
    
    const currentVal = sheet.getRange(row, c + 1).getValue();
    if (!currentVal || String(currentVal).trim() === '') {
      sheet.getRange(row, c + 1).setValue(newVal);
    }
  };
  
  // Update empty fields
  updateIfEmpty('Title', contact.title);
  updateIfEmpty('Organization', contact.organization);
  updateIfEmpty('Executive Summary', contact.executiveSummary);
  updateIfEmpty('Strategic Value', contact.strategicValue);
  updateIfEmpty('Potential Role', contact.potentialRole);
  updateIfEmpty('Key Links', contact.links?.join('\n'));
  
  // Always update last contact date
  const lastContactCol = col('Last Contact Date');
  if (lastContactCol >= 0) {
    sheet.getRange(row, lastContactCol + 1).setValue(new Date());
  }
  
  // Append report URL to source call report
  const reportCol = col('Source Call Report');
  if (reportCol >= 0 && reportUrl) {
    const existing = sheet.getRange(row, reportCol + 1).getValue();
    if (existing && !existing.includes(reportUrl)) {
      sheet.getRange(row, reportCol + 1).setValue(existing + '\n' + reportUrl);
    } else if (!existing) {
      sheet.getRange(row, reportCol + 1).setValue(reportUrl);
    }
  }
  
  // Append to notes if there are new notes
  if (contact.notes) {
    const notesCol = col('Notes');
    if (notesCol >= 0) {
      const existing = sheet.getRange(row, notesCol + 1).getValue();
      const dateStamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const newNote = `[${dateStamp}] ${contact.notes}`;
      sheet.getRange(row, notesCol + 1).setValue(existing ? existing + '\n\n' + newNote : newNote);
    }
  }
}


/**
 * Add entry to Conversation Log
 */
function addConversationLogEntry_(analysis, reportUrl) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONTACT_REPORT_CONFIG.sheets.conversationLog);
  
  if (!sheet) return;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const col = (name) => headers.indexOf(name);
  
  const meta = analysis.callMetadata || {};
  const primary = analysis.primaryContact || {};
  const logEntry = analysis.conversationLogEntry || {};
  
  // Generate Log ID
  const lastRow = sheet.getLastRow();
  const logId = 'LOG' + String(lastRow).padStart(4, '0');
  
  const newRow = sheet.getLastRow() + 1;
  
  const set = (name, val) => {
    const c = col(name);
    if (c >= 0 && val !== null && val !== undefined) {
      sheet.getRange(newRow, c + 1).setValue(val);
    }
  };
  
  // Try multiple common column name variations
  set('Log ID', logId);
  set('Contact ID', ''); // Will need to be linked manually
  set('Contact Name', primary.name);
  set('Contact', primary.name);
  set('Name', primary.name);
  set('Date', meta.date || new Date());
  set('Type', 'Phone Call');
  set('Contact Type', 'Phone Call');
  set('Summary', logEntry.summary);
  set('Notes', logEntry.summary);
  set('Action Items', logEntry.actionItems);
  set('Next Follow-Up', logEntry.followUpDate);
  set('Follow-up Date', logEntry.followUpDate);
  set('Logged By', Session.getActiveUser().getEmail());
}


/**
 * Register the call report in the registry
 */
function registerCallReport_(analysis, reportDoc, contactsAdded, input) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONTACT_REPORT_CONFIG.sheets.callReportRegistry);
  
  if (!sheet) return;
  
  const meta = analysis.callMetadata || {};
  const primary = analysis.primaryContact || {};
  const report = analysis.executiveReport || {};
  
  // Generate report ID
  const lastRow = sheet.getLastRow();
  const reportId = 'CR-' + String(lastRow).padStart(4, '0');
  
  const newRow = [
    reportId,
    meta.date || new Date(),
    primary.name || 'Unknown',
    primary.organization || '',
    meta.duration || '',
    meta.subject || '',
    primary.strategicValue || 'Unclear',
    reportDoc.url,
    contactsAdded,
    (report.nextSteps || []).length,
    'Complete',
    Session.getActiveUser().getEmail()
  ];
  
  sheet.appendRow(newRow);
}


// ============================================================================
// AUDIO TRANSCRIPTION
// ============================================================================

/**
 * Transcribe audio file
 * Currently uses OpenAI Whisper - add OPENAI_API_KEY to Script Properties
 * 
 * For now, users should use the text input dialog instead.
 */
function transcribeAudio_(file) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  
  if (!apiKey) {
    console.log('OPENAI_API_KEY not configured - audio transcription disabled');
    return null;
  }
  
  try {
    const blob = file.getBlob();
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
    
    // Build multipart form data
    const requestBody = Utilities.newBlob('').getBytes();
    
    const payload = 
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="file"; filename="' + file.getName() + '"\r\n' +
      'Content-Type: ' + blob.getContentType() + '\r\n\r\n';
    
    const endData = '\r\n--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="model"\r\n\r\n' +
      'whisper-1\r\n' +
      '--' + boundary + '--';
    
    const payloadBytes = Utilities.newBlob(payload).getBytes()
      .concat(blob.getBytes())
      .concat(Utilities.newBlob(endData).getBytes());
    
    const options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      contentType: 'multipart/form-data; boundary=' + boundary,
      payload: payloadBytes,
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/audio/transcriptions', options);
    const json = JSON.parse(response.getContentText());
    
    return json.text || null;
    
  } catch (error) {
    console.error('Transcription error:', error);
    return null;
  }
}


// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getProcessedDictationIds_() {
  const props = PropertiesService.getDocumentProperties();
  const stored = props.getProperty(CONTACT_REPORT_CONFIG.processedFilesKey);
  return stored ? JSON.parse(stored) : [];
}


function markDictationProcessed_(fileId) {
  const props = PropertiesService.getDocumentProperties();
  const processed = getProcessedDictationIds_();
  
  if (!processed.includes(fileId)) {
    processed.push(fileId);
    // Keep only last 100
    if (processed.length > 100) processed.shift();
    props.setProperty(CONTACT_REPORT_CONFIG.processedFilesKey, JSON.stringify(processed));
  }
}


function moveToProcessedFolder_(file, parentFolder) {
  let processedFolder;
  const folders = parentFolder.getFoldersByName('Processed');
  
  if (folders.hasNext()) {
    processedFolder = folders.next();
  } else {
    processedFolder = parentFolder.createFolder('Processed');
  }
  
  file.moveTo(processedFolder);
}


function generateContactId_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return '001';
  
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let maxId = 0;
  
  ids.forEach(row => {
    const num = parseInt(String(row[0]).replace(/\D/g, '')) || 0;
    if (num > maxId) maxId = num;
  });
  
  return String(maxId + 1).padStart(3, '0');
}


// ============================================================================
// UI - DICTATION DIALOG HTML
// ============================================================================

function getContactDictationDialogHtml_() {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      padding: 20px; 
      margin: 0;
      background: #f5f5f5;
    }
    
    h2 { 
      color: #C9A227; 
      margin: 0 0 5px 0;
      font-size: 20px;
    }
    
    .subtitle {
      color: #666;
      font-size: 12px;
      margin-bottom: 15px;
    }
    
    .section {
      background: white;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .section-title {
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
      font-size: 13px;
    }
    
    .form-row {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    }
    
    .form-group {
      flex: 1;
    }
    
    label {
      display: block;
      font-size: 11px;
      color: #666;
      margin-bottom: 3px;
    }
    
    input, select, textarea {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 13px;
    }
    
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #C9A227;
    }
    
    textarea {
      resize: vertical;
      min-height: 220px;
      font-family: inherit;
      line-height: 1.5;
    }
    
    .hint {
      background: #fff3cd;
      border-left: 4px solid #C9A227;
      padding: 10px 12px;
      font-size: 11px;
      margin-bottom: 15px;
      border-radius: 0 4px 4px 0;
    }
    
    .hint strong {
      display: block;
      margin-bottom: 5px;
    }
    
    .buttons {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 15px;
    }
    
    button {
      padding: 10px 24px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
    }
    
    .btn-primary {
      background: #C9A227;
      color: white;
    }
    
    .btn-primary:hover {
      background: #b8911f;
    }
    
    .btn-primary:disabled {
      background: #999;
      cursor: not-allowed;
    }
    
    .btn-secondary {
      background: #e0e0e0;
      color: #333;
    }
    
    .btn-secondary:hover {
      background: #d0d0d0;
    }
    
    .status {
      padding: 12px;
      border-radius: 4px;
      margin-top: 15px;
      display: none;
      font-size: 13px;
    }
    
    .status.processing {
      display: block;
      background: #e3f2fd;
      color: #1565c0;
    }
    
    .status.success {
      display: block;
      background: #e8f5e9;
      color: #2e7d32;
    }
    
    .status.error {
      display: block;
      background: #ffebee;
      color: #c62828;
    }
    
    .char-count {
      text-align: right;
      font-size: 10px;
      color: #999;
      margin-top: 5px;
    }
    
    .report-link {
      display: inline-block;
      margin-top: 10px;
      padding: 8px 16px;
      background: #C9A227;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-size: 12px;
    }
    
    .report-link:hover {
      background: #b8911f;
    }
  </style>
</head>
<body>
  <h2>📞 Log Contact Call</h2>
  <p class="subtitle">Dictate or type your call recap — it will become a structured report + tracker entries</p>
  
  <div class="hint">
    <strong>💡 Tip: Use voice-to-text on your phone</strong>
    Open Notes on iPhone or Keep on Android, dictate your recap, then paste here.
    Speak naturally about who you talked to, what you discussed, and any introductions they offered.
  </div>
  
  <div class="section">
    <div class="section-title">Call Details (Optional — AI will extract from your notes)</div>
    <div class="form-row">
      <div class="form-group">
        <label>Contact Name</label>
        <input type="text" id="contactName" placeholder="e.g., Mike Morasky">
      </div>
      <div class="form-group">
        <label>Organization</label>
        <input type="text" id="organization" placeholder="e.g., Valve Corporation">
      </div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Call Recap *</div>
    <textarea id="dictation" placeholder="Paste or type your call recap here...

Example: 'Just got off a great call with Mike Morasky from Valve. He's been there 22 years as a composer, worked on Portal, Half-Life, all the big titles. Before that he was at Weta on Lord of the Rings. 

He's got a strong CalArts connection — actually applied back in the 80s when he was making experimental electronic music with Ryuichi Sakamoto in Japan. 

He offered to introduce us to Bay Raitt, who designed Gollum's face and is now doing AI filmmaking. Also mentioned Kal Spelletich, a machine art pioneer, and Trevor Paglen, the MacArthur fellow who does AI and surveillance art. 

Next steps: share my CalArts email so he can make the intros. Thinking he could participate in a symposium dialogue.'"></textarea>
    <div class="char-count"><span id="charCount">0</span> characters</div>
  </div>
  
  <div id="status" class="status"></div>
  
  <div class="buttons">
    <button class="btn-secondary" onclick="google.script.host.close()">Cancel</button>
    <button class="btn-primary" onclick="submit()" id="submitBtn">🤖 Process Call Report</button>
  </div>
  
  <script>
    const textarea = document.getElementById('dictation');
    const charCount = document.getElementById('charCount');
    const status = document.getElementById('status');
    const submitBtn = document.getElementById('submitBtn');
    
    textarea.addEventListener('input', () => {
      charCount.textContent = textarea.value.length;
    });
    
    function submit() {
      const text = textarea.value.trim();
      
      if (!text) {
        alert('Please enter your call recap');
        return;
      }
      
      if (text.length < 100) {
        alert('Please provide more detail about the call (at least a paragraph or two)');
        return;
      }
      
      // Show processing status
      status.className = 'status processing';
      status.innerHTML = '⏳ Processing with AI... This takes 30-60 seconds. Creating your call report, updating contacts, and logging the conversation.';
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Processing...';
      
      const input = {
        text: text,
        contactName: document.getElementById('contactName').value.trim(),
        organization: document.getElementById('organization').value.trim(),
        sourceType: 'manual_entry'
      };
      
      google.script.run
        .withSuccessHandler(onSuccess)
        .withFailureHandler(onError)
        .processContactDictation(input);
    }
    
    function onSuccess(result) {
      if (result.success) {
        status.className = 'status success';
        status.innerHTML = 
          '<strong>✅ Call Report Created!</strong><br><br>' +
          '📄 <strong>Report:</strong> ' + (result.primaryContact || 'Contact') + '<br>' +
          '👥 <strong>Contacts Added:</strong> ' + (result.contactsAdded || 0) + '<br><br>' +
          '<a href="' + result.reportUrl + '" target="_blank" class="report-link">Open Call Report →</a>';
        
        submitBtn.textContent = '✅ Done!';
        submitBtn.style.background = '#4caf50';
        
      } else {
        onError({ message: result.error || 'Unknown error' });
      }
    }
    
    function onError(error) {
      status.className = 'status error';
      status.innerHTML = '❌ <strong>Error:</strong> ' + (error.message || error);
      submitBtn.disabled = false;
      submitBtn.textContent = '🤖 Try Again';
    }
  </script>
</body>
</html>
`;
}


// ============================================================================
// VIEW CALL REPORTS
// ============================================================================

/**
 * Navigate to Call Report Registry sheet
 */
function showCallReportsList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONTACT_REPORT_CONFIG.sheets.callReportRegistry);
  
  if (!sheet || sheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert(
      '📞 No Call Reports Yet',
      'Use "Log Contact Call" to create your first call report!\n\n' +
      'Your dictated call notes will become:\n' +
      '• A professional executive summary document\n' +
      '• Contact entries in Advisory Network\n' +
      '• A logged conversation entry',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }
  
  ss.setActiveSheet(sheet);
}


/**
 * Navigate to Call Report Registry
 */
function navToCallReportRegistry() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONTACT_REPORT_CONFIG.sheets.callReportRegistry);
  if (sheet) ss.setActiveSheet(sheet);
}


/**
 * Open the reports folder in Drive
 */
function openCallReportsFolder() {
  const folderId = PropertiesService.getDocumentProperties().getProperty('REPORTS_FOLDER_ID');
  
  if (!folderId) {
    SpreadsheetApp.getUi().alert('Reports folder not set up. Run Setup Contact Report System first.');
    return;
  }
  
  const folder = DriveApp.getFolderById(folderId);
  const url = folder.getUrl();
  
  const html = HtmlService.createHtmlOutput(
    `<script>window.open('${url}','_blank');google.script.host.close();</script>`
  ).setWidth(1).setHeight(1);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Opening...');
}


// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Test Claude connection for contact reports
 */
function testContactReportClaude() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  
  if (!apiKey) {
    SpreadsheetApp.getUi().alert(
      '❌ API Key Not Found',
      'Add CLAUDE_API_KEY to Script Properties:\n\n' +
      '1. Click ⚙️ Project Settings\n' +
      '2. Scroll to Script Properties\n' +
      '3. Add: CLAUDE_API_KEY = your key',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }
  
  const payload = {
    model: CONTACT_REPORT_CONFIG.model,
    max_tokens: 100,
    messages: [{ role: 'user', content: 'Say "CCAT Contact Report System ready!" and nothing else.' }]
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', options);
    const json = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() === 200) {
      SpreadsheetApp.getUi().alert('✅ ' + json.content[0].text);
    } else {
      SpreadsheetApp.getUi().alert('❌ API Error: ' + (json.error?.message || 'Unknown'));
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Connection failed: ' + e.message);
  }
}


// ============================================================================
// MENU INTEGRATION
// ============================================================================

/**
 * Call this to add Contact Report items to your existing menu
 * Or integrate into your existing onOpen() function
 */
function addContactReportMenuItems() {
  const ui = SpreadsheetApp.getUi();
  
  // This creates a standalone menu - alternatively integrate into your existing menu
  ui.createMenu('📞 Contact Reports')
    .addItem('📞 Log Contact Call', 'showContactDictationDialog')
    .addItem('📋 View Call Reports', 'showCallReportsList')
    .addItem('📁 Open Reports Folder', 'openCallReportsFolder')
    .addSeparator()
    .addItem('🔄 Process Voice Memos Now', 'processNewDictations')
    .addSeparator()
    .addSubMenu(ui.createMenu('⚙️ Setup')
      .addItem('🚀 Initial Setup', 'setupContactReportSystem')
      .addItem('🔌 Test Claude Connection', 'testContactReportClaude'))
    .addToUi();
}


/**
 * IMPORTANT: Add these items to your existing Advisory Network submenu in onOpen():
 * 
 * .addSubMenu(ui.createMenu('🤝 Advisory Network')
 *   .addItem('👀 View Contact Database', 'navToAdvisoryNetwork')
 *   .addItem('➕ Add New Contact', 'showEnhancedAddContactDialog')
 *   .addItem('📞 Log Contact Call', 'showContactDictationDialog')     // <-- ADD THIS
 *   .addItem('📋 View Call Reports', 'showCallReportsList')           // <-- ADD THIS
 *   .addItem('💬 View Conversation Log', 'navToConversationLog')
 *   .addItem('📊 View Network Dashboard', 'navToNetworkDashboard')
 *   .addSeparator()
 *   .addItem('🔄 Sync Advancement', 'syncAdvancementBidirectional')
 *   .addItem('📧 Open Advancement Satellite', 'openSatelliteAdvancement')
 *   .addSeparator()
 *   .addItem('📁 Open Call Reports Folder', 'openCallReportsFolder')  // <-- ADD THIS
 *   .addItem('⚙️ Setup Contact Reports', 'setupContactReportSystem'))  // <-- ADD THIS
 */
/**
 * PATCH: Add Sync ID and Status columns to Advancement satellite
 * Run this once from the function dropdown
 */
function patchAdvancementSatellite() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const configSheet = ss.getSheetByName('⚙️ Satellite Config');
  
  if (!configSheet) {
    ui.alert('Run Initial Setup first.');
    return;
  }
  
  const data = configSheet.getDataRange().getValues();
  let satelliteId = null;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'Advancement Input') {
      satelliteId = data[i][1];
      break;
    }
  }
  
  if (!satelliteId) {
    ui.alert('Advancement Input satellite not found in config.');
    return;
  }
  
  ss.toast('Patching Advancement satellite...', '⚙️ Patch', -1);
  
  try {
    const satellite = SpreadsheetApp.openById(satelliteId);
    const sheet = satellite.getSheetByName('Contact Database');
    
    if (!sheet) {
      ui.alert('Contact Database sheet not found.');
      return;
    }
    
    // Check if already patched
    const currentA9 = sheet.getRange('A9').getValue();
    if (currentA9 === 'Sync ID') {
      ui.alert('✅ Already patched! Sync ID column exists.');
      return;
    }
    
    // Insert Sync ID column at A (shifts everything right)
    sheet.insertColumnBefore(1);
    sheet.getRange('A9').setValue('Sync ID');
    sheet.getRange('A9').setFontWeight('bold').setBackground('#4285F4').setFontColor('white');
    sheet.setColumnWidth(1, 80);
    
    // Add Status column at Q
    sheet.getRange('Q9').setValue('Status');
    sheet.getRange('Q9').setFontWeight('bold').setBackground('#4285F4').setFontColor('white');
    
    const statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Active', 'Pending', 'On Hold', 'Inactive', 'Converted'], true)
      .build();
    sheet.getRange('Q10:Q500').setDataValidation(statusRule);
    
    // Update instructions
    sheet.getRange('A3').setValue('This sheet syncs bidirectionally with Home Base:');
    sheet.getRange('A4').setValue('• NEW contacts you add here → sync to Home Base');
    sheet.getRange('A5').setValue('• Contacts from Home Base → appear here');
    sheet.getRange('A6').setValue('• Status updates flow both ways');
    sheet.getRange('A7').setValue('• Sync ID links records (do not edit column A)');
    sheet.getRange('A3:A7').setBackground('#e8f5e9').setFontStyle('italic');
    
    ss.toast('Patch complete!', '✅ Done', 5);
    
    ui.alert(
      '✅ Advancement Satellite Patched!',
      'Added:\n• Sync ID column (A)\n• Status column (Q)\n• Updated instructions\n\nURL unchanged. Ready for bidirectional sync!',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    ui.alert('❌ Error: ' + error.message);
    console.error(error);
  }
}
/**
 * ============================================================================
 * CCAT ADVANCEMENT SATELLITE SYSTEM v2.0 (FINAL)
 * ============================================================================
 * 
 * COLUMNS PUSHED TO ADVANCEMENT (View Only for Pushed Data):
 * - Contact ID, Name, Title, Organization
 * - Institution Type, Industry, Region
 * - CalArts Connection, Contact Source, Potential Role
 * - Date Added, Last Contact Date, Next Steps, Status
 * - Added By, Email, Phone
 * - Notes (sanitized), Executive Summary (sanitized)
 * 
 * NOT PUSHED (Internal Only):
 * - Strategic Value
 * - Source Call Report
 * - Key Links
 * 
 * ADVANCEMENT CAN:
 * - View all synced contact data
 * - Add NEW contacts (triggers email to ED)
 * - Add notes in "Advancement Notes" column
 * - Flag contacts with "Needs Review" checkbox
 * 
 * ADVANCEMENT CANNOT:
 * - Edit data pushed from Home Base
 * - See Strategic Value or Call Report links
 * 
 * ============================================================================
 */


// ============================================================================
// CONFIGURATION
// ============================================================================

const ADV_SATELLITE_CONFIG = {
  // Columns synced TO Advancement (in order)
  columnsToSync: [
    'Contact ID',        // A - System managed
    'Name',              // B - View only (editable for new)
    'Title',             // C - View only (editable for new)
    'Organization',      // D - View only (editable for new)
    'Institution Type',  // E - View only (editable for new)
    'Industry',          // F - View only (editable for new)
    'Region',            // G - View only (editable for new)
    'CalArts Connection',// H - View only (editable for new)
    'Contact Source',    // I - View only (editable for new)
    'Potential Role',    // J - View only (editable for new)
    'Date Added',        // K - System managed
    'Last Contact Date', // L - View only
    'Next Steps',        // M - View only
    'Status',            // N - View only
    'Added By',          // O - System managed
    'Email',             // P - View only (editable for new)
    'Phone',             // Q - View only (editable for new)
    'Notes',             // R - Sanitized version
    'Executive Summary'  // S - Sanitized version
  ],
  
  // Advancement-only columns
  advancementColumns: [
    'Advancement Notes', // T - Editable
    'Needs Review'       // U - Checkbox
  ],
  
  // Internal-only columns (NEVER synced)
  internalOnly: [
    'Strategic Value',
    'Source Call Report',
    'Key Links',
    'Introduced By'  // Could be shared, but keeping internal for now
  ],
  
  // Email notification
  notifyOnNewContact: true,
  
  // Sheet names
  sheets: {
    advisoryNetwork: '🤝 Advisory Network',
    satelliteConfig: '⚙️ Satellite Config',
    satellite: 'Contact Database'  // Renamed from "Contact Database"
  }
};


// ============================================================================
// SETUP: CREATE/RECONFIGURE ADVANCEMENT SATELLITE
// ============================================================================

/**
 * Main setup function - run this to create or reconfigure the Advancement satellite
 */
function setupAdvancementSatelliteV2() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const response = ui.alert(
    '🔄 Setup Advancement Satellite v2.0',
    'This will configure a professional contact database for Advancement.\n\n' +
    'WHAT ADVANCEMENT WILL SEE:\n' +
    '• All contacts with sanitized notes/summaries\n' +
    '• Status, Next Steps, Last Contact Date\n\n' +
    'WHAT STAYS INTERNAL:\n' +
    '• Strategic Value ratings\n' +
    '• Call Report links\n' +
    '• Candid internal notes\n\n' +
    'ADVANCEMENT CAN:\n' +
    '• Add new contacts (you\'ll be notified)\n' +
    '• Add their own observations\n' +
    '• Flag contacts for your review\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    ss.toast('Setting up Advancement satellite...', '⚙️ Setup', -1);
    
    // Get config sheet
    const configSheet = ss.getSheetByName(ADV_SATELLITE_CONFIG.sheets.satelliteConfig);
    if (!configSheet) {
      ui.alert('Run Initial Setup first to create the Satellite Config sheet.');
      return;
    }
    
    // Check for existing satellite
    const data = configSheet.getDataRange().getValues();
    let satelliteId = null;
    let configRow = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'Advancement Input') {
        satelliteId = data[i][1];
        configRow = i + 1;
        break;
      }
    }
    
    let satellite;
    
    if (satelliteId) {
      // Reconfigure existing satellite
      ss.toast('Reconfiguring existing satellite...', '⚙️ Setup', -1);
      satellite = SpreadsheetApp.openById(satelliteId);
    } else {
      // Create new satellite
      ss.toast('Creating new satellite...', '⚙️ Setup', -1);
      satellite = SpreadsheetApp.create('CCAT — Advancement Contact Database');
      satelliteId = satellite.getId();
      
      // Add to config
      configRow = configSheet.getLastRow() + 1;
      configSheet.getRange(configRow, 1, 1, 5).setValues([[
        'Advancement Input',
        satelliteId,
        satellite.getUrl(),
        new Date(),
        'v2.0 Created'
      ]]);
    }
    
    // Configure the satellite structure
    configureAdvancementSatellite_(satellite);
    
    // Update config timestamp
    configSheet.getRange(configRow, 4).setValue(new Date());
    configSheet.getRange(configRow, 5).setValue('v2.0 Configured');
    
    ss.toast('Setup complete!', '✅ Done', 5);
    
    ui.alert(
      '✅ Advancement Satellite Ready!',
      'The satellite has been configured.\n\n' +
      '📍 URL: ' + satellite.getUrl() + '\n\n' +
      'NEXT STEPS:\n' +
      '1. Share this URL with Advancement team (Editor access)\n' +
      '2. Run "Sync to Advancement" to populate contacts\n' +
      '3. Tell Advancement they can add new contacts and flag items for review',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    ui.alert('❌ Setup Error: ' + error.message);
    console.error(error);
  }
}


/**
 * Configure the Advancement satellite sheet structure
 */
function configureAdvancementSatellite_(satellite) {
  // Get or create the main sheet
  let sheet = satellite.getSheetByName(ADV_SATELLITE_CONFIG.sheets.satellite);
  if (!sheet) {
    const sheets = satellite.getSheets();
    sheet = sheets[0];
    sheet.setName(ADV_SATELLITE_CONFIG.sheets.satellite);
  }
  
  // Clear and rebuild
  sheet.clear();
  sheet.clearConditionalFormatRules();
  
  // =========================================================================
  // HEADER SECTION
  // =========================================================================
  
  // Row 1: Title
  sheet.getRange('A1').setValue('📬 CCAT ADVISORY NETWORK — ADVANCEMENT VIEW');
  sheet.getRange('A1:U1').merge();
  sheet.getRange('A1').setFontSize(18).setFontWeight('bold')
    .setBackground('#C9A227').setFontColor('white')
    .setHorizontalAlignment('center');
  sheet.setRowHeight(1, 40);
  
  // Row 2: Spacer
  sheet.setRowHeight(2, 5);
  
  // Rows 3-8: Instructions
  const instructions = [
    ['📋 INSTRUCTIONS FOR ADVANCEMENT TEAM'],
    [''],
    ['✅ You CAN: Add new contacts (fill in columns B-Q on a new row), add notes in column T, check "Needs Review" in column U'],
    [''],
    ['🔒 READ ONLY: All data in gray columns (A-S) is synced from Home Base and cannot be edited'],
    [''],
    ['📧 When you add a new contact, the ED will be notified automatically'],
    ['']
  ];
  sheet.getRange('A3:A10').setValues(instructions);
  sheet.getRange('A3').setFontWeight('bold').setFontSize(12).setBackground('#e3f2fd');
  sheet.getRange('A5').setBackground('#e8f5e9');
  sheet.getRange('A7').setBackground('#f5f5f5');
  sheet.getRange('A9').setBackground('#fff3cd');
  
  // Row 11: Column Headers
  const allHeaders = [
    ...ADV_SATELLITE_CONFIG.columnsToSync,
    ...ADV_SATELLITE_CONFIG.advancementColumns
  ];
  
  sheet.getRange(11, 1, 1, allHeaders.length).setValues([allHeaders]);
  sheet.getRange(11, 1, 1, allHeaders.length)
    .setFontWeight('bold')
    .setBackground('#4285F4')
    .setFontColor('white')
    .setHorizontalAlignment('center');
  sheet.setRowHeight(11, 30);
  
  // Freeze header rows
  sheet.setFrozenRows(11);
  
  // =========================================================================
  // COLUMN FORMATTING
  // =========================================================================
  
  const widths = {
    1: 80,   // A: Contact ID
    2: 150,  // B: Name
    3: 180,  // C: Title
    4: 150,  // D: Organization
    5: 120,  // E: Institution Type
    6: 100,  // F: Industry
    7: 100,  // G: Region
    8: 130,  // H: CalArts Connection
    9: 120,  // I: Contact Source
    10: 130, // J: Potential Role
    11: 100, // K: Date Added
    12: 110, // L: Last Contact Date
    13: 200, // M: Next Steps
    14: 80,  // N: Status
    15: 100, // O: Added By
    16: 180, // P: Email
    17: 120, // Q: Phone
    18: 250, // R: Notes
    19: 300, // S: Executive Summary
    20: 250, // T: Advancement Notes
    21: 100  // U: Needs Review
  };
  
  Object.entries(widths).forEach(([col, width]) => {
    sheet.setColumnWidth(parseInt(col), width);
  });
  
  // =========================================================================
  // VISUAL DISTINCTION: READ-ONLY vs EDITABLE
  // =========================================================================
  
  // Light gray for read-only synced data (A-S, columns 1-19)
  sheet.getRange('A12:S500').setBackground('#F8F8F8');
  
  // Light green for editable Advancement columns (T-U, columns 20-21)
  sheet.getRange('T12:U500').setBackground('#E8F5E9');
  
  // Style the header row to indicate editable columns
  sheet.getRange(11, 1, 1, 19).setBackground('#4285F4'); // Blue for synced
  sheet.getRange(11, 20, 1, 2).setBackground('#2e7d32'); // Green for editable
  
  // =========================================================================
  // DATA VALIDATION
  // =========================================================================
  
  // Get dropdowns from master config
  const conf = CONFIG.contactConfig;
  
  // Institution Type (E)
  sheet.getRange('E12:E500').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(conf.institutionTypes, true).build());
  
  // Industry (F)
  sheet.getRange('F12:F500').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(conf.industries, true).build());
  
  // Region (G)
  sheet.getRange('G12:G500').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(conf.regions, true).build());
  
  // CalArts Connection (H)
  sheet.getRange('H12:H500').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(conf.calArtsConnections, true).build());
  
  // Contact Source (I)
  sheet.getRange('I12:I500').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(conf.contactSources, true).build());
  
  // Potential Role (J)
  sheet.getRange('J12:J500').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(conf.potentialRoles, true).build());
  
  // Status (N)
  sheet.getRange('N12:N500').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(conf.statuses, true).build());
  
  // Needs Review checkbox (U)
  sheet.getRange('U12:U500').insertCheckboxes();
  
  // =========================================================================
  // CONDITIONAL FORMATTING
  // =========================================================================
  
  // Highlight rows flagged for review (yellow)
  const reviewRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$U12=TRUE')
    .setBackground('#FFECB3')
    .setRanges([sheet.getRange('A12:U500')])
    .build();
  
  // Highlight new entries from Advancement (no Contact ID yet) - blue
  const newEntryRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($A12="",$B12<>"")')
    .setBackground('#E3F2FD')
    .setRanges([sheet.getRange('A12:U500')])
    .build();
  
  sheet.setConditionalFormatRules([reviewRule, newEntryRule]);
  
  // =========================================================================
  // NOTES ON COLUMNS
  // =========================================================================
  
  sheet.getRange('A11').setNote('🔒 System-generated ID. Do not edit.');
  sheet.getRange('B11').setNote('🆕 Enter name for new contacts. Synced contacts are read-only.');
  sheet.getRange('K11').setNote('🔒 Auto-populated when contact is added.');
  sheet.getRange('L11').setNote('🔒 Updated by ED after each contact.');
  sheet.getRange('M11').setNote('🔒 ED\'s planned next steps for this contact.');
  sheet.getRange('N11').setNote('🔒 Current status of the relationship.');
  sheet.getRange('R11').setNote('🔒 Notes from Home Base (ED view).');
  sheet.getRange('S11').setNote('🔒 Professional summary of the contact.');
  sheet.getRange('T11').setNote('✏️ YOUR NOTES: Add observations, context, or questions here.');
  sheet.getRange('U11').setNote('✏️ CHECK THIS to flag for ED review/attention.');
}


// ============================================================================
// SYNC FUNCTIONS
// ============================================================================

/**
 * Main sync function: Push Home Base contacts to Advancement, Pull new Advancement contacts
 * Add to menu: 🎛️ CCAT System > 🤝 Advisory Network > 🔄 Sync to Advancement
 */
function syncToAdvancementSatellite_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  ss.toast('Starting Advancement sync...', '🔄 Sync', -1);
  
  try {
    // Get satellite
    const configSheet = ss.getSheetByName(ADV_SATELLITE_CONFIG.sheets.satelliteConfig);
    if (!configSheet) {
      ui.alert('Config sheet not found. Run Setup first.');
      return;
    }
    
    const data = configSheet.getDataRange().getValues();
    let satelliteId = null;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'Advancement Input') {
        satelliteId = data[i][1];
        break;
      }
    }
    
    if (!satelliteId) {
      ui.alert('Advancement satellite not found. Run Setup first.');
      return;
    }
    
    const satellite = SpreadsheetApp.openById(satelliteId);
    const satSheet = satellite.getSheetByName(ADV_SATELLITE_CONFIG.sheets.satellite);
    const homeSheet = ss.getSheetByName(ADV_SATELLITE_CONFIG.sheets.advisoryNetwork);
    
    if (!satSheet || !homeSheet) {
      ui.alert('Required sheets not found.');
      return;
    }
    
    // ===== PULL: New contacts from Advancement =====
    ss.toast('Checking for new Advancement submissions...', '🔄 Sync', -1);
    const newContacts = pullNewContactsFromAdvancement_(satSheet, homeSheet);
    
    // ===== PULL: Advancement notes and review flags =====
    ss.toast('Syncing Advancement notes...', '🔄 Sync', -1);
    const flaggedContacts = pullAdvancementFeedback_(satSheet, homeSheet);
    
    // ===== PUSH: All Home Base contacts to Advancement =====
    ss.toast('Pushing contacts to Advancement...', '🔄 Sync', -1);
    const { pushed, updated } = pushContactsToAdvancementV2_(homeSheet, satSheet);
    
    // Update config
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'Advancement Input') {
        configSheet.getRange(i + 1, 4).setValue(new Date());
        configSheet.getRange(i + 1, 5).setValue('Synced ↔');
        break;
      }
    }
    
    ss.toast('Sync complete!', '✅ Done', 5);
    
    // Show results
    let message = '✅ Sync Complete!\n\n';
    message += `📥 New from Advancement: ${newContacts.length}\n`;
    message += `🚩 Flagged for review: ${flaggedContacts.length}\n`;
    message += `📤 Pushed to Advancement: ${pushed}\n`;
    message += `🔄 Updated in Advancement: ${updated}\n`;
    
    if (newContacts.length > 0) {
      message += '\nNew contacts:\n';
      newContacts.forEach(c => message += `• ${c.name}\n`);
    }
    
    if (flaggedContacts.length > 0) {
      message += '\n⚠️ Needs your review:\n';
      flaggedContacts.forEach(c => message += `• ${c.name}: ${c.advancementNotes || '(flagged)'}\n`);
    }
    
    ui.alert('Advancement Sync', message, ui.ButtonSet.OK);
    
  } catch (error) {
    ui.alert('❌ Sync Error: ' + error.message);
    console.error(error);
  }
}


/**
 * Pull new contacts added by Advancement (rows without Contact ID)
 */
function pullNewContactsFromAdvancement_(satSheet, homeSheet) {
  const lastRow = satSheet.getLastRow();
  if (lastRow <= 11) return [];
  
  const satData = satSheet.getRange(12, 1, lastRow - 11, 21).getValues();
  const homeHeaders = homeSheet.getRange(1, 1, 1, homeSheet.getLastColumn()).getValues()[0];
  const newContacts = [];
  
  satData.forEach((row, idx) => {
    const contactId = row[0];  // A
    const name = row[1];       // B
    
    // Skip if has Contact ID (already synced) or no name
    if (contactId || !name) return;
    
    // This is a NEW contact from Advancement
    const newContact = {
      name: String(name).trim(),
      title: row[2],           // C
      organization: row[3],    // D
      institutionType: row[4], // E
      industry: row[5],        // F
      region: row[6],          // G
      calArtsConnection: row[7], // H
      contactSource: row[8],   // I
      potentialRole: row[9],   // J
      email: row[15],          // P
      phone: row[16],          // Q
      advancementNotes: row[19], // T
      satRow: idx + 12
    };
    
    // Add to Home Base
    const newId = addContactFromAdvancement_(homeSheet, homeHeaders, newContact);
    
    // Update satellite with Contact ID and metadata
    satSheet.getRange(newContact.satRow, 1).setValue(newId);           // A: Contact ID
    satSheet.getRange(newContact.satRow, 11).setValue(new Date());     // K: Date Added
    satSheet.getRange(newContact.satRow, 15).setValue('Advancement');  // O: Added By
    
    newContacts.push(newContact);
  });
  
  // Send email notification
  if (newContacts.length > 0 && ADV_SATELLITE_CONFIG.notifyOnNewContact) {
    sendAdvancementNotification_(newContacts);
  }
  
  return newContacts;
}


/**
 * Add a contact from Advancement to Home Base
 */
function addContactFromAdvancement_(sheet, headers, contact) {
  const col = (name) => headers.indexOf(name);
  
  // Generate Contact ID
  const lastRow = sheet.getLastRow();
  let maxId = 0;
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    ids.forEach(r => {
      const n = parseInt(String(r[0]).replace(/\D/g, '')) || 0;
      if (n > maxId) maxId = n;
    });
  }
  const newId = String(maxId + 1).padStart(3, '0');
  
  const newRow = sheet.getLastRow() + 1;
  
  const set = (name, val) => {
    const c = col(name);
    if (c >= 0 && val) sheet.getRange(newRow, c + 1).setValue(val);
  };
  
  set('Contact ID', newId);
  set('Name', contact.name);
  set('Title', contact.title);
  set('Organization', contact.organization);
  set('Institution Type', contact.institutionType);
  set('Industry', contact.industry);
  set('Region', contact.region);
  set('CalArts Connection', contact.calArtsConnection);
  set('Contact Source', contact.contactSource || 'Advancement');
  set('Potential Role', contact.potentialRole);
  set('Date Added', new Date());
  set('Status', 'New');
  set('Added By', 'Advancement Team');
  set('Email', contact.email);
  set('Phone', contact.phone);
  
  // Add Advancement notes to Notes field
  if (contact.advancementNotes) {
    set('Notes', `[From Advancement] ${contact.advancementNotes}`);
  }
  
  return newId;
}


/**
 * Pull Advancement notes and review flags
 */
function pullAdvancementFeedback_(satSheet, homeSheet) {
  const lastRow = satSheet.getLastRow();
  if (lastRow <= 11) return [];
  
  const satData = satSheet.getRange(12, 1, lastRow - 11, 21).getValues();
  const homeHeaders = homeSheet.getRange(1, 1, 1, homeSheet.getLastColumn()).getValues()[0];
  const notesCol = homeHeaders.indexOf('Notes');
  const flagged = [];
  
  satData.forEach((row) => {
    const contactId = row[0];      // A
    const advNotes = row[19];      // T: Advancement Notes
    const needsReview = row[20];   // U: Needs Review
    
    if (!contactId) return;
    
    // Find in Home Base
    const homeRow = findContactRowByIdInSheet_(homeSheet, contactId);
    if (homeRow < 0) return;
    
    // Track flagged contacts
    if (needsReview === true) {
      flagged.push({
        contactId: contactId,
        name: row[1],
        advancementNotes: advNotes || '(no notes)',
        homeRow: homeRow
      });
    }
    
    // Append Advancement notes
    if (advNotes && notesCol >= 0) {
      const current = homeSheet.getRange(homeRow, notesCol + 1).getValue();
      const marker = '[Advancement:';
      
      if (!current.includes(advNotes.substring(0, 30))) {
        const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        const newNote = `\n\n[Advancement: ${date}] ${advNotes}`;
        homeSheet.getRange(homeRow, notesCol + 1).setValue(current + newNote);
      }
    }
  });
  
  return flagged;
}


/**
 * Find contact row by ID
 */
function findContactRowByIdInSheet_(sheet, contactId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(contactId)) {
      return i + 2;
    }
  }
  return -1;
}


/**
 * Push all contacts from Home Base to Advancement (sanitized)
 */
function pushContactsToAdvancementV2_(homeSheet, satSheet) {
  const homeHeaders = homeSheet.getRange(1, 1, 1, homeSheet.getLastColumn()).getValues()[0];
  const homeData = homeSheet.getRange(2, 1, homeSheet.getLastRow() - 1, homeSheet.getLastColumn()).getValues();
  
  // Get existing satellite Contact IDs
  const satLastRow = satSheet.getLastRow();
  const existingIds = new Map();
  
  if (satLastRow > 11) {
    const satIds = satSheet.getRange(12, 1, satLastRow - 11, 1).getValues();
    satIds.forEach((r, idx) => {
      if (r[0]) existingIds.set(String(r[0]), idx + 12);
    });
  }
  
  const col = (name) => homeHeaders.indexOf(name);
  let pushed = 0;
  let updated = 0;
  
  homeData.forEach(row => {
    const contactId = row[col('Contact ID')];
    if (!contactId) return;
    
    const idStr = String(contactId);
    
    // Sanitize notes and executive summary
    const rawNotes = row[col('Notes')] || '';
    const rawSummary = row[col('Executive Summary')] || '';
    
    const sanitizedNotes = sanitizeForSharing_(rawNotes);
    const sanitizedSummary = sanitizeForSharing_(rawSummary);
    
    // Build row for Advancement (columns A-S)
    const satRow = [
      contactId,                                   // A: Contact ID
      row[col('Name')] || '',                      // B: Name
      row[col('Title')] || '',                     // C: Title
      row[col('Organization')] || '',              // D: Organization
      row[col('Institution Type')] || '',          // E: Institution Type
      row[col('Industry')] || '',                  // F: Industry
      row[col('Region')] || '',                    // G: Region
      row[col('CalArts Connection')] || '',        // H: CalArts Connection
      row[col('Contact Source')] || '',            // I: Contact Source
      row[col('Potential Role')] || '',            // J: Potential Role
      row[col('Date Added')] || '',                // K: Date Added
      row[col('Last Contact Date')] || '',         // L: Last Contact Date
      row[col('Next Steps')] || '',                // M: Next Steps
      row[col('Status')] || '',                    // N: Status
      row[col('Added By')] || '',                  // O: Added By
      row[col('Email')] || '',                     // P: Email
      row[col('Phone')] || '',                     // Q: Phone
      sanitizedNotes,                              // R: Notes (sanitized)
      sanitizedSummary                             // S: Executive Summary (sanitized)
    ];
    
    if (existingIds.has(idStr)) {
      // Update existing row (preserve Advancement columns T-U)
      const rowNum = existingIds.get(idStr);
      satSheet.getRange(rowNum, 1, 1, 19).setValues([satRow]);
      updated++;
    } else {
      // Append new row with empty Advancement columns
      const newRow = [...satRow, '', false]; // T: empty notes, U: unchecked
      satSheet.appendRow(newRow);
      pushed++;
    }
  });
  
  return { pushed, updated };
}


/**
 * Sanitize content for sharing with Advancement/external stakeholders
 */
function sanitizeForSharing_(text) {
  if (!text) return '';
  
  let sanitized = String(text);
  
  // Remove internal markers
  sanitized = sanitized.replace(/\[Internal:[^\]]*\]/gi, '');
  sanitized = sanitized.replace(/\[Confidential:[^\]]*\]/gi, '');
  sanitized = sanitized.replace(/\[Private:[^\]]*\]/gi, '');
  sanitized = sanitized.replace(/\[Strategic Value:[^\]]*\]/gi, '');
  
  // Remove sensitive phrases
  const sensitivePatterns = [
    /between us/gi,
    /off the record/gi,
    /don't share/gi,
    /not for (public|sharing)/gi,
    /internal only/gi,
    /candid(ly)?/gi,
    /honestly/gi
  ];
  
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Clean up whitespace
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  sanitized = sanitized.trim();
  
  return sanitized;
}


// ============================================================================
// EMAIL NOTIFICATIONS
// ============================================================================

/**
 * Send email when Advancement adds new contacts
 */
function sendAdvancementNotification_(contacts) {
  let email = Session.getActiveUser().getEmail();
  
  if (!email) return;
  
  const subject = `📬 ${contacts.length} New Contact${contacts.length > 1 ? 's' : ''} from Advancement`;
  
  let rows = '';
  contacts.forEach(c => {
    rows += `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${c.name || ''}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${c.title || ''}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${c.organization || ''}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${c.potentialRole || ''}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${c.email || ''}</td>
      </tr>
    `;
  });
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px;">
      <h2 style="color: #C9A227;">📬 New Contacts from Advancement</h2>
      
      <p>The Advancement team added ${contacts.length} new contact${contacts.length > 1 ? 's' : ''}.</p>
      
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr style="background: #4285F4; color: white;">
          <th style="padding: 8px; border: 1px solid #ddd;">Name</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Title</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Organization</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Role</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Email</th>
        </tr>
        ${rows}
      </table>
      
      <p><strong>Next Steps:</strong></p>
      <ul>
        <li>Review in 🤝 Advisory Network</li>
        <li>Add Strategic Value assessment</li>
        <li>Update Status as needed</li>
      </ul>
    </div>
  `;
  
  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: html
    });
  } catch (e) {
    console.error('Notification email failed:', e);
  }
}


// ============================================================================
// MENU UPDATE - ADD THESE TO YOUR onOpen()
// ============================================================================

/**
 * Add these items to your Advisory Network submenu:
 * 
 * .addSeparator()
 * .addItem('⚙️ Setup Advancement Satellite v2', 'setupAdvancementSatelliteV2')
 * .addItem('🔄 Sync to Advancement', 'syncToAdvancementSatellite_')
 */
/**
 * ============================================================================
 * CCAT ENHANCED CONTACT REPORT SYSTEM v2.0
 * ============================================================================
 * 
 * UPGRADES FROM v1.0:
 * - Web research on mentioned names (finds LinkedIn, articles, etc.)
 * - Spell-check and verify names against known databases
 * - Fact-check claims (titles, organizations, dates)
 * - Automatic sanitization for stakeholder-safe outputs
 * - Separate INTERNAL vs SHAREABLE content
 * 
 * OUTPUTS:
 * - Internal Contact Report (full candid version, ED only)
 * - Shareable Executive Summary (safe for Advancement, Chanel, artists)
 * - Shareable Notes (sanitized version of notes)
 * - Advisory Network entries (with both internal and shareable fields)
 * 
 * INSTALLATION:
 * 1. REPLACE your existing contact report functions with this file
 * 2. Ensure CLAUDE_API_KEY is in Script Properties
 * 3. Run setupContactReportSystem() if not already done
 * 
 * ============================================================================
 */


// ============================================================================
// CONFIGURATION
// ============================================================================

const ENHANCED_REPORT_CONFIG = {
  // Claude model - using claude-sonnet-4-20250514 for speed, switch to opus for quality
  model: 'claude-sonnet-4-20250514',
  maxTokens: 12000,
  
  // Research model (can be faster/cheaper for lookups)
  researchModel: 'claude-sonnet-4-20250514',
  researchMaxTokens: 4000,
  
  // Folder names
  dictationFolderName: 'CCAT Contact Dictations',
  reportsFolderName: 'CCAT Call Reports',
  
  // Sheet names
  sheets: {
    advisoryNetwork: '🤝 Advisory Network',
    conversationLog: '💬 Conversation Log',
    callReportRegistry: '📞 Call Report Registry'
  },
  
  // Sanitization keywords to flag/remove
  sensitivePatterns: [
    /political/gi,
    /difficult personality/gi,
    /hard to work with/gi,
    /drama/gi,
    /conflict/gi,
    /fired/gi,
    /terminated/gi,
    /lawsuit/gi,
    /legal issue/gi,
    /off the record/gi,
    /between us/gi,
    /don't share/gi,
    /confidential/gi,
    /not for public/gi,
    /internal only/gi,
    /yana/gi,           // Flag mentions of specific stakeholders
    /chanel politics/gi,
    /board politics/gi
  ],
  
  // Strategic value options (internal only)
  strategicValueOptions: ['Exceptional', 'Very High', 'High', 'Moderate', 'Limited', 'Unclear'],
  
  // Fields that should NEVER go to Advancement
  internalOnlyFields: ['Strategic Value', 'Source Call Report', 'Internal Notes']
};


// ============================================================================
// MAIN ENTRY POINT - SHOW DICTATION DIALOG
// ============================================================================

/**
 * Show the enhanced dictation input dialog
 */
function showContactDictationDialog() {
  const html = HtmlService.createHtmlOutput(getEnhancedDictationDialogHtml_())
    .setWidth(700)
    .setHeight(800);
  
  SpreadsheetApp.getUi().showModalDialog(html, '📞 Log Contact Call');
}


// ============================================================================
// MAIN PROCESSING FUNCTION
// ============================================================================

/**
 * Process contact dictation with research and sanitization
 */
function processContactDictation(input) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    // STEP 1: Initial analysis with Claude
    ss.toast('Analyzing dictation...', '🤖 Step 1/5', -1);
    const initialAnalysis = analyzeContactDictationInitial_(input.text, input.contactName, input.organization);
    
    if (!initialAnalysis || initialAnalysis.error) {
      return { success: false, error: initialAnalysis?.error || 'Initial analysis failed' };
    }
    
    // STEP 2: Research names and organizations
    ss.toast('Researching contacts...', '🔍 Step 2/5', -1);
    const enrichedAnalysis = enrichWithResearch_(initialAnalysis);
    
    // STEP 3: Sanitize for stakeholder sharing
    ss.toast('Preparing shareable content...', '🧹 Step 3/5', -1);
    const sanitizedContent = sanitizeForStakeholders_(enrichedAnalysis);
    
    // STEP 4: Create documents and update databases
    ss.toast('Creating report & updating contacts...', '📄 Step 4/5', -1);
    
    // Create INTERNAL call report (full candid version)
    const reportDoc = createInternalCallReport_(enrichedAnalysis, input);
    
    // Update Advisory Network with BOTH internal and shareable content
    const contactsAdded = updateAdvisoryNetworkEnhanced_(enrichedAnalysis, sanitizedContent, reportDoc.url);
    
    // Add to Conversation Log
    addConversationLogEntry_(enrichedAnalysis, reportDoc.url);
    
    // Register in Call Report Registry
    registerCallReport_(enrichedAnalysis, reportDoc, contactsAdded, input);
    
    // STEP 5: Sync to Advancement (shareable content only)
    ss.toast('Syncing to Advancement...', '🔄 Step 5/5', -1);
    syncNewContactsToAdvancement_();
    
    ss.toast('Contact report complete!', '✅ Done', 5);
    
    return {
      success: true,
      reportUrl: reportDoc.url,
      contactsAdded: contactsAdded,
      primaryContact: enrichedAnalysis.primaryContact?.name,
      researchFindings: enrichedAnalysis.researchSummary || 'No additional research needed'
    };
    
  } catch (error) {
    console.error('processContactDictation error:', error);
    return { success: false, error: error.message };
  }
}


// ============================================================================
// STEP 1: INITIAL ANALYSIS
// ============================================================================

/**
 * Initial Claude analysis of the dictation
 */
function analyzeContactDictationInitial_(text, suggestedContact, suggestedOrg) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  
  if (!apiKey) {
    return { error: 'CLAUDE_API_KEY not configured. Go to Project Settings > Script Properties.' };
  }
  
  const prompt = buildEnhancedAnalysisPrompt_(text, suggestedContact, suggestedOrg);
  
  const payload = {
    model: ENHANCED_REPORT_CONFIG.model,
    max_tokens: ENHANCED_REPORT_CONFIG.maxTokens,
    messages: [{ role: 'user', content: prompt }]
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', options);
    const json = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() !== 200 || json.error) {
      return { error: json.error?.message || 'API error: ' + response.getResponseCode() };
    }
    
    const content = json.content[0].text;
    return parseAnalysisResponse_(content);
    
  } catch (error) {
    return { error: 'API call failed: ' + error.message };
  }
}


/**
 * Build the enhanced analysis prompt
 */
function buildEnhancedAnalysisPrompt_(text, suggestedContact, suggestedOrg) {
  return `You are a professional advancement/development officer assistant for CCAT (CHANEL Center for Artists and Technology at CalArts). 

Analyze this dictated call recap and produce BOTH internal (candid) and shareable (sanitized) content.

${suggestedContact ? `User indicated this call was with: ${suggestedContact}` : ''}
${suggestedOrg ? `Organization: ${suggestedOrg}` : ''}

DICTATED CALL RECAP:
"""
${text}
"""

IMPORTANT INSTRUCTIONS:

1. SPELL-CHECK ALL NAMES: If a name sounds misspelled or unclear, note it and provide the likely correct spelling. Flag any names you're uncertain about.

2. FACT-CHECK: If specific claims are made (job titles, company affiliations, dates, accomplishments), note any that seem inconsistent or should be verified.

3. IDENTIFY RESEARCH NEEDED: List any people or organizations that should be researched for verification or additional context.

4. CREATE BOTH INTERNAL AND SHAREABLE VERSIONS:
   - INTERNAL: Full candid assessment, strategic observations, relationship dynamics
   - SHAREABLE: Professional, neutral language suitable for showing to the contact themselves, Advancement team, funders, or other stakeholders

5. SANITIZE SENSITIVE CONTENT: Flag and rewrite anything that could be embarrassing, politically sensitive, or unprofessional if shared.

Respond with JSON (no markdown code blocks):

{
  "callMetadata": {
    "date": "YYYY-MM-DD or null",
    "duration": "estimated duration",
    "subject": "brief subject line"
  },
  
  "primaryContact": {
    "name": "full name (spell-checked)",
    "nameConfidence": "High/Medium/Low",
    "nameSuggestions": ["alternative spellings if uncertain"],
    "title": "job title",
    "organization": "company/institution",
    "organizationVerified": true/false,
    "institutionType": "University/Museum/Game Company/Tech Company/Studio/Research Lab/Non-Profit/Government/Other",
    "industry": "Technology/Gaming/Film-TV/Education/Arts-Culture/Research/Government/Non-Profit/Other",
    "region": "Los Angeles/California/West Coast/East Coast/Midwest/South/International/Remote",
    "email": "if mentioned",
    "phone": "if mentioned",
    "calArtsConnection": "describe connection or 'None'",
    "potentialRole": "Advisory Committee/Visiting Lecturer/Potential Hire/Fellow/Collaborator/Funder/General Network",
    
    "strategicValue": "Exceptional/Very High/High/Moderate/Limited/Unclear",
    "strategicValueRationale": "why this rating (INTERNAL ONLY)",
    
    "internalNotes": "candid observations, relationship dynamics, anything sensitive (INTERNAL ONLY - never shared)",
    
    "shareableExecutiveSummary": "2-4 sentence professional bio suitable for sharing with the contact, funders, or advancement team. Write as if the contact might read this.",
    
    "shareableNotes": "sanitized version of key points, suitable for advancement team to see",
    
    "linksToResearch": ["LinkedIn URL if known", "company website", "any mentioned articles"],
    "factCheckFlags": ["any claims that should be verified"]
  },
  
  "additionalContacts": [
    {
      "name": "name (spell-checked)",
      "nameConfidence": "High/Medium/Low",
      "title": "their title",
      "organization": "their company",
      "institutionType": "type",
      "industry": "industry",
      "introducedBy": "who offered intro",
      "potentialRole": "potential CCAT role",
      "strategicValue": "assessment",
      "shareableExecutiveSummary": "professional description suitable for sharing",
      "shareableNotes": "sanitized notes",
      "internalNotes": "candid notes (INTERNAL ONLY)",
      "linksToResearch": ["URLs to find"]
    }
  ],
  
  "internalReport": {
    "summary": "Full candid executive summary (3-5 paragraphs) - INTERNAL ONLY. Include strategic assessment, relationship dynamics, any concerns.",
    "keyInsights": ["candid insights"],
    "assessment": "strategic assessment with honest evaluation of opportunities and risks",
    "nextSteps": [
      {"action": "specific action", "owner": "who", "priority": "High/Medium/Low"}
    ],
    "sensitiveItems": ["anything flagged as sensitive that was sanitized"]
  },
  
  "shareableReport": {
    "summary": "Professional summary (2-3 paragraphs) suitable for Advancement team or Chanel. Neutral, factual, professional tone.",
    "keyPoints": ["neutral professional points"],
    "nextSteps": ["sanitized action items appropriate to share"]
  },
  
  "researchNeeded": [
    {
      "name": "person or org to research",
      "type": "person/organization",
      "lookFor": "what to search for",
      "suggestedQueries": ["Google search queries"]
    }
  ],
  
  "spellCheckFlags": [
    {
      "original": "as heard/written",
      "suggested": "likely correct spelling",
      "confidence": "High/Medium/Low",
      "context": "where it appeared"
    }
  ],
  
  "factCheckFlags": [
    {
      "claim": "the claim made",
      "concern": "why it should be verified",
      "suggestedVerification": "how to verify"
    }
  ],
  
  "sanitizationLog": [
    {
      "original": "original sensitive content",
      "sanitized": "how it was rewritten",
      "reason": "why it was flagged"
    }
  ]
}

CRITICAL GUIDELINES:
- The shareableExecutiveSummary should be written as if the contact might read it
- The shareableNotes should be safe for Advancement, Chanel, or artists to see
- NEVER include strategic value ratings in shareable content
- NEVER include relationship dynamics or political observations in shareable content
- If something could embarrass anyone or damage a relationship if leaked, it goes in internal only
- Spell check ALL names - people are sensitive about their names being misspelled
- Flag any facts that seem uncertain or should be verified`;
}


/**
 * Parse Claude's analysis response
 */
function parseAnalysisResponse_(content) {
  try {
    let jsonStr = content.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    
    return JSON.parse(jsonStr);
    
  } catch (error) {
    console.error('Failed to parse Claude response:', error);
    console.log('Raw response (first 1000 chars):', content.substring(0, 1000));
    return { error: 'Failed to parse AI response: ' + error.message };
  }
}


// ============================================================================
// STEP 2: RESEARCH ENRICHMENT
// ============================================================================

/**
 * Enrich analysis with web research on mentioned names
 */
function enrichWithResearch_(analysis) {
  if (!analysis.researchNeeded || analysis.researchNeeded.length === 0) {
    analysis.researchSummary = 'No additional research needed.';
    return analysis;
  }
  
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!apiKey) return analysis;
  
  // For each person/org that needs research, do a quick lookup
  const researchResults = [];
  
  analysis.researchNeeded.forEach(item => {
    if (item.type === 'person') {
      const result = researchPerson_(item.name, item.suggestedQueries, apiKey);
      if (result) {
        researchResults.push(result);
        
        // Update the relevant contact with research findings
        updateContactWithResearch_(analysis, item.name, result);
      }
    }
  });
  
  analysis.researchResults = researchResults;
  analysis.researchSummary = researchResults.length > 0 
    ? `Researched ${researchResults.length} contact(s). Found additional context.`
    : 'Research attempted but no additional information found.';
  
  return analysis;
}


/**
 * Research a specific person using Claude's knowledge
 */
function researchPerson_(name, suggestedQueries, apiKey) {
  // Use Claude to synthesize what it knows about the person
  // Note: For real web search, you'd need to integrate with a search API
  
  const prompt = `I need to verify and enrich information about: ${name}

Based on your training data, please provide:
1. Likely correct spelling of the name
2. Known professional background (if this is a notable person)
3. Likely LinkedIn URL format
4. Any notable works, achievements, or affiliations
5. Confidence level in this information

If you don't have reliable information about this person, say so clearly.

Respond with JSON:
{
  "name": "verified spelling",
  "confidence": "High/Medium/Low/Unknown",
  "knownInfo": "what you know about them",
  "likelyLinkedIn": "probable LinkedIn URL or null",
  "notableWorks": ["if applicable"],
  "verificationSuggestion": "how to verify this info"
}`;

  const payload = {
    model: ENHANCED_REPORT_CONFIG.researchModel,
    max_tokens: ENHANCED_REPORT_CONFIG.researchMaxTokens,
    messages: [{ role: 'user', content: prompt }]
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', options);
    if (response.getResponseCode() !== 200) return null;
    
    const json = JSON.parse(response.getContentText());
    const content = json.content[0].text;
    
    // Parse response
    let result;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json\n?/, '').replace(/```\n?/, '').replace(/\n?```$/, '');
      }
      result = JSON.parse(jsonStr);
    } catch (e) {
      result = { name: name, knownInfo: content, confidence: 'Low' };
    }
    
    return result;
    
  } catch (error) {
    console.error('Research failed for ' + name + ':', error);
    return null;
  }
}


/**
 * Update a contact in the analysis with research findings
 */
function updateContactWithResearch_(analysis, name, research) {
  // Check primary contact
  if (analysis.primaryContact?.name?.toLowerCase() === name.toLowerCase()) {
    if (research.likelyLinkedIn) {
      analysis.primaryContact.linksToResearch = analysis.primaryContact.linksToResearch || [];
      analysis.primaryContact.linksToResearch.push(research.likelyLinkedIn);
    }
    if (research.knownInfo && research.confidence !== 'Unknown') {
      analysis.primaryContact.researchEnrichment = research.knownInfo;
    }
    return;
  }
  
  // Check additional contacts
  if (analysis.additionalContacts) {
    analysis.additionalContacts.forEach(contact => {
      if (contact.name?.toLowerCase() === name.toLowerCase()) {
        if (research.likelyLinkedIn) {
          contact.linksToResearch = contact.linksToResearch || [];
          contact.linksToResearch.push(research.likelyLinkedIn);
        }
        if (research.knownInfo && research.confidence !== 'Unknown') {
          contact.researchEnrichment = research.knownInfo;
        }
      }
    });
  }
}


// ============================================================================
// STEP 3: SANITIZATION
// ============================================================================

/**
 * Sanitize content for stakeholder sharing
 */
function sanitizeForStakeholders_(analysis) {
  const sanitized = {
    primaryContact: null,
    additionalContacts: [],
    shareableReport: analysis.shareableReport || {},
    sanitizationWarnings: []
  };
  
  // Sanitize primary contact
  if (analysis.primaryContact) {
    sanitized.primaryContact = sanitizeContact_(analysis.primaryContact, sanitized.sanitizationWarnings);
  }
  
  // Sanitize additional contacts
  if (analysis.additionalContacts) {
    sanitized.additionalContacts = analysis.additionalContacts.map(c => 
      sanitizeContact_(c, sanitized.sanitizationWarnings)
    );
  }
  
  // Double-check the shareable report
  if (sanitized.shareableReport.summary) {
    const checked = checkForSensitiveContent_(sanitized.shareableReport.summary);
    if (checked.hasSensitive) {
      sanitized.sanitizationWarnings.push({
        location: 'shareableReport.summary',
        issue: 'Contains potentially sensitive content',
        flags: checked.flags
      });
    }
  }
  
  return sanitized;
}


/**
 * Sanitize a single contact for sharing
 */
function sanitizeContact_(contact, warnings) {
  const sanitized = {
    name: contact.name,
    title: contact.title,
    organization: contact.organization,
    institutionType: contact.institutionType,
    industry: contact.industry,
    region: contact.region,
    calArtsConnection: contact.calArtsConnection,
    potentialRole: contact.potentialRole,
    email: contact.email,
    phone: contact.phone,
    introducedBy: contact.introducedBy,
    
    // SHAREABLE content only
    executiveSummary: contact.shareableExecutiveSummary || '',
    notes: contact.shareableNotes || '',
    links: (contact.linksToResearch || []).filter(l => l && !l.includes('internal'))
  };
  
  // Check executive summary for sensitive content
  if (sanitized.executiveSummary) {
    const checked = checkForSensitiveContent_(sanitized.executiveSummary);
    if (checked.hasSensitive) {
      warnings.push({
        contact: contact.name,
        field: 'executiveSummary',
        flags: checked.flags
      });
      // Could auto-sanitize here, but better to flag for review
    }
  }
  
  // Check notes for sensitive content
  if (sanitized.notes) {
    const checked = checkForSensitiveContent_(sanitized.notes);
    if (checked.hasSensitive) {
      warnings.push({
        contact: contact.name,
        field: 'notes',
        flags: checked.flags
      });
    }
  }
  
  return sanitized;
}


/**
 * Check text for sensitive content patterns
 */
function checkForSensitiveContent_(text) {
  const flags = [];
  
  ENHANCED_REPORT_CONFIG.sensitivePatterns.forEach(pattern => {
    if (pattern.test(text)) {
      flags.push(pattern.toString());
    }
  });
  
  return {
    hasSensitive: flags.length > 0,
    flags: flags
  };
}


// ============================================================================
// STEP 4: CREATE DOCUMENTS & UPDATE DATABASES
// ============================================================================

/**
 * Create the INTERNAL call report document (full candid version)
 */
function createInternalCallReport_(analysis, input) {
  const props = PropertiesService.getDocumentProperties();
  const reportsFolderId = props.getProperty('REPORTS_FOLDER_ID');
  
  const primaryName = analysis.primaryContact?.name || 'Unknown Contact';
  const date = analysis.callMetadata?.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  // Create document
  const docTitle = `[INTERNAL] Call Report: ${primaryName} - ${date}`;
  const doc = DocumentApp.create(docTitle);
  const body = doc.getBody();
  
  // Move to reports folder
  if (reportsFolderId) {
    const file = DriveApp.getFileById(doc.getId());
    file.moveTo(DriveApp.getFolderById(reportsFolderId));
  }
  
  // Build INTERNAL report content
  buildInternalReportContent_(body, analysis, date);
  
  doc.saveAndClose();
  
  return {
    id: doc.getId(),
    url: doc.getUrl(),
    name: docTitle
  };
}


/**
 * Build the internal report document content
 */
function buildInternalReportContent_(body, analysis, date) {
  const meta = analysis.callMetadata || {};
  const primary = analysis.primaryContact || {};
  const internal = analysis.internalReport || {};
  const additional = analysis.additionalContacts || [];
  
  // ===== CONFIDENTIAL HEADER =====
  body.appendParagraph('⚠️ INTERNAL & CONFIDENTIAL — DO NOT SHARE')
    .setForegroundColor('#c53929')
    .setFontSize(12)
    .setBold(true)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  body.appendParagraph(`Call Report: ${primary.name || 'Contact'}`)
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  
  // Metadata
  body.appendParagraph(
    `Date: ${date}\n` +
    `Duration: ${meta.duration || '~1 hour'}\n` +
    `Subject: ${meta.subject || 'CCAT Introduction'}\n` +
    `Strategic Value: ${primary.strategicValue || 'TBD'}`
  ).setFontSize(10);
  
  body.appendHorizontalRule();
  
  // ===== INTERNAL EXECUTIVE SUMMARY =====
  body.appendParagraph('Executive Summary (Internal)')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(internal.summary || 'No summary available.');
  
  // Strategic Assessment
  if (internal.assessment) {
    body.appendParagraph('Strategic Assessment')
      .setHeading(DocumentApp.ParagraphHeading.HEADING3);
    body.appendParagraph(internal.assessment);
  }
  
  // ===== RESEARCH FINDINGS =====
  if (analysis.researchResults && analysis.researchResults.length > 0) {
    body.appendHorizontalRule();
    body.appendParagraph('Research Findings')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    
    analysis.researchResults.forEach(result => {
      body.appendParagraph(`${result.name} (Confidence: ${result.confidence})`)
        .setHeading(DocumentApp.ParagraphHeading.HEADING3);
      body.appendParagraph(result.knownInfo || 'No additional information found.');
      if (result.likelyLinkedIn) {
        body.appendParagraph(`Likely LinkedIn: ${result.likelyLinkedIn}`);
      }
    });
  }
  
  // ===== SPELL CHECK FLAGS =====
  if (analysis.spellCheckFlags && analysis.spellCheckFlags.length > 0) {
    body.appendParagraph('⚠️ Name Spelling Flags')
      .setHeading(DocumentApp.ParagraphHeading.HEADING3)
      .setForegroundColor('#f9a825');
    
    analysis.spellCheckFlags.forEach(flag => {
      body.appendListItem(`"${flag.original}" → suggested: "${flag.suggested}" (${flag.confidence} confidence)`);
    });
  }
  
  // ===== FACT CHECK FLAGS =====
  if (analysis.factCheckFlags && analysis.factCheckFlags.length > 0) {
    body.appendParagraph('⚠️ Fact Check Needed')
      .setHeading(DocumentApp.ParagraphHeading.HEADING3)
      .setForegroundColor('#f9a825');
    
    analysis.factCheckFlags.forEach(flag => {
      body.appendListItem(`${flag.claim}\n  → ${flag.concern}\n  → Verify: ${flag.suggestedVerification}`);
    });
  }
  
  // ===== NEXT STEPS =====
  if (internal.nextSteps && internal.nextSteps.length > 0) {
    body.appendHorizontalRule();
    body.appendParagraph('Next Steps')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    
    internal.nextSteps.forEach(step => {
      const priority = step.priority === 'High' ? '🔴' : step.priority === 'Medium' ? '🟡' : '🟢';
      body.appendListItem(`${priority} ${step.action} — ${step.owner || 'TBD'}`);
    });
  }
  
  // ===== CONTACT PROFILES =====
  body.appendHorizontalRule();
  body.appendParagraph('Contact Profiles')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  
  // Primary contact (full internal version)
  appendInternalContactProfile_(body, primary, true);
  
  // Additional contacts
  additional.forEach(contact => {
    appendInternalContactProfile_(body, contact, false);
  });
  
  // ===== SANITIZATION LOG =====
  if (analysis.sanitizationLog && analysis.sanitizationLog.length > 0) {
    body.appendHorizontalRule();
    body.appendParagraph('Sanitization Log (What Was Changed for Sharing)')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2)
      .setForegroundColor('#666666');
    
    analysis.sanitizationLog.forEach(item => {
      body.appendParagraph(`Original: "${item.original}"`)
        .setFontSize(9).setForegroundColor('#999999');
      body.appendParagraph(`Sanitized: "${item.sanitized}"`)
        .setFontSize(9);
      body.appendParagraph(`Reason: ${item.reason}`)
        .setFontSize(9).setItalic(true);
      body.appendParagraph('');
    });
  }
  
  // ===== FOOTER =====
  body.appendHorizontalRule();
  const footer = body.appendParagraph(
    `Generated: ${new Date().toLocaleString()}\n` +
    `Classification: INTERNAL — Do not share call reports with external parties`
  );
  footer.setFontSize(9).setForegroundColor('#999999');
}


/**
 * Append a full internal contact profile to the document
 */
function appendInternalContactProfile_(body, contact, isPrimary) {
  if (!contact || !contact.name) return;
  
  body.appendParagraph(contact.name)
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  
  // Basic info
  const roleOrg = [contact.title, contact.organization].filter(Boolean).join(', ');
  if (roleOrg) body.appendParagraph(`Role: ${roleOrg}`).setBold(true);
  
  body.appendParagraph(`Strategic Value: ${(contact.strategicValue || 'UNCLEAR').toUpperCase()}`).setBold(true);
  
  if (contact.strategicValueRationale) {
    body.appendParagraph(`Rationale: ${contact.strategicValueRationale}`).setItalic(true);
  }
  
  // Internal notes (candid)
  if (contact.internalNotes) {
    body.appendParagraph('Internal Notes (Confidential):').setBold(true);
    body.appendParagraph(contact.internalNotes);
  }
  
  // Research enrichment
  if (contact.researchEnrichment) {
    body.appendParagraph('Research Findings:').setBold(true);
    body.appendParagraph(contact.researchEnrichment);
  }
  
  // Shareable version (for reference)
  if (contact.shareableExecutiveSummary) {
    body.appendParagraph('Shareable Executive Summary:').setBold(true).setForegroundColor('#1e8e3e');
    body.appendParagraph(contact.shareableExecutiveSummary);
  }
  
  // Links
  if (contact.linksToResearch && contact.linksToResearch.length > 0) {
    body.appendParagraph('Links:').setBold(true);
    contact.linksToResearch.forEach(link => {
      if (link) body.appendListItem(link);
    });
  }
  
  body.appendParagraph(''); // Spacing
}


/**
 * Update Advisory Network with both internal and shareable content
 */
function updateAdvisoryNetworkEnhanced_(analysis, sanitized, reportUrl) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ENHANCED_REPORT_CONFIG.sheets.advisoryNetwork);
  
  if (!sheet) return 0;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  let contactsAdded = 0;
  
  // Add/update primary contact
  if (analysis.primaryContact?.name) {
    addOrUpdateContactEnhanced_(
      sheet, 
      headers, 
      analysis.primaryContact, 
      sanitized.primaryContact,
      reportUrl, 
      null
    );
    contactsAdded++;
  }
  
  // Add/update additional contacts
  const additionalInternal = analysis.additionalContacts || [];
  const additionalSanitized = sanitized.additionalContacts || [];
  
  additionalInternal.forEach((contact, index) => {
    if (contact.name) {
      const sanitizedContact = additionalSanitized[index] || {};
      addOrUpdateContactEnhanced_(
        sheet, 
        headers, 
        contact,
        sanitizedContact,
        reportUrl, 
        analysis.primaryContact?.name
      );
      contactsAdded++;
    }
  });
  
  return contactsAdded;
}


/**
 * Add or update a contact with both internal and shareable fields
 */
function addOrUpdateContactEnhanced_(sheet, headers, internalContact, sanitizedContact, reportUrl, introducedBy) {
  const col = (name) => headers.indexOf(name);
  
  // Check if contact already exists
  const existingRow = findContactByNameInSheet_(sheet, internalContact.name);
  
  if (existingRow > 0) {
    updateExistingContactEnhanced_(sheet, existingRow, headers, internalContact, sanitizedContact, reportUrl);
    return;
  }
  
  // Generate new contact ID
  const newId = generateContactIdForSheet_(sheet);
  const newRow = sheet.getLastRow() + 1;
  
  // Helper to set cell value
  const set = (name, val) => {
    const c = col(name);
    if (c >= 0 && val !== null && val !== undefined && val !== '') {
      sheet.getRange(newRow, c + 1).setValue(val);
    }
  };
  
  // ALWAYS SET (from internal analysis)
  set('Contact ID', newId);
  set('Name', internalContact.name);
  set('Title', internalContact.title);
  set('Organization', internalContact.organization);
  set('Institution Type', internalContact.institutionType);
  set('Industry', internalContact.industry);
  set('Region', internalContact.region);
  set('CalArts Connection', internalContact.calArtsConnection);
  set('Contact Source', 'ED Call Report');
  set('Potential Role', internalContact.potentialRole);
  set('Date Added', new Date());
  set('Last Contact Date', new Date());
  set('Status', 'New');
  set('Added By', Session.getActiveUser().getEmail());
  set('Email', internalContact.email);
  set('Phone', internalContact.phone);
  set('Introduced By', introducedBy || internalContact.introducedBy);
  
  // INTERNAL ONLY (never synced to Advancement)
  set('Strategic Value', internalContact.strategicValue);
  set('Source Call Report', reportUrl);
  
  // SHAREABLE (gets synced to Advancement)
  set('Executive Summary', sanitizedContact?.executiveSummary || internalContact.shareableExecutiveSummary || '');
  set('Notes', sanitizedContact?.notes || internalContact.shareableNotes || '');
  set('Key Links', (internalContact.linksToResearch || []).join('\n'));
  
  // Next Steps from internal analysis
  if (internalContact.nextSteps) {
    set('Next Steps', internalContact.nextSteps);
  }
}


/**
 * Update existing contact with enhanced data
 */
function updateExistingContactEnhanced_(sheet, row, headers, internalContact, sanitizedContact, reportUrl) {
  const col = (name) => headers.indexOf(name);
  
  // Helper to update if better data available
  const updateIfBetter = (colName, newVal) => {
    const c = col(colName);
    if (c < 0 || !newVal) return;
    
    const currentVal = sheet.getRange(row, c + 1).getValue();
    // Update if current is empty OR new value is longer (presumably more detailed)
    if (!currentVal || String(currentVal).trim() === '' || String(newVal).length > String(currentVal).length) {
      sheet.getRange(row, c + 1).setValue(newVal);
    }
  };
  
  // Update shareable fields
  updateIfBetter('Title', internalContact.title);
  updateIfBetter('Organization', internalContact.organization);
  updateIfBetter('Executive Summary', sanitizedContact?.executiveSummary || internalContact.shareableExecutiveSummary);
  updateIfBetter('Potential Role', internalContact.potentialRole);
  updateIfBetter('Key Links', (internalContact.linksToResearch || []).join('\n'));
  
  // Update internal fields
  updateIfBetter('Strategic Value', internalContact.strategicValue);
  
  // Always update last contact date
  const lastContactCol = col('Last Contact Date');
  if (lastContactCol >= 0) {
    sheet.getRange(row, lastContactCol + 1).setValue(new Date());
  }
  
  // Append to source call report
  const reportCol = col('Source Call Report');
  if (reportCol >= 0 && reportUrl) {
    const existing = sheet.getRange(row, reportCol + 1).getValue();
    if (existing && !existing.includes(reportUrl)) {
      sheet.getRange(row, reportCol + 1).setValue(existing + '\n' + reportUrl);
    } else if (!existing) {
      sheet.getRange(row, reportCol + 1).setValue(reportUrl);
    }
  }
  
  // Append to notes with timestamp
  const notesCol = col('Notes');
  if (notesCol >= 0 && sanitizedContact?.notes) {
    const existing = sheet.getRange(row, notesCol + 1).getValue();
    const dateStamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const newNote = `[${dateStamp}] ${sanitizedContact.notes}`;
    
    if (existing && !existing.includes(sanitizedContact.notes)) {
      sheet.getRange(row, notesCol + 1).setValue(existing + '\n\n' + newNote);
    } else if (!existing) {
      sheet.getRange(row, notesCol + 1).setValue(newNote);
    }
  }
}


/**
 * Find contact by name in sheet
 */
function findContactByNameInSheet_(sheet, name) {
  if (!name) return -1;
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const nameCol = headers.indexOf('Name');
  if (nameCol < 0) return -1;
  
  const names = sheet.getRange(2, nameCol + 1, lastRow - 1, 1).getValues();
  const searchName = name.toLowerCase().trim();
  
  for (let i = 0; i < names.length; i++) {
    if (String(names[i][0]).toLowerCase().trim() === searchName) {
      return i + 2;
    }
  }
  
  return -1;
}


/**
 * Generate next contact ID
 */
function generateContactIdForSheet_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return '001';
  
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let maxId = 0;
  
  ids.forEach(row => {
    const num = parseInt(String(row[0]).replace(/\D/g, '')) || 0;
    if (num > maxId) maxId = num;
  });
  
  return String(maxId + 1).padStart(3, '0');
}


// ============================================================================
// STEP 5: SYNC TO ADVANCEMENT
// ============================================================================

/**
 * Sync new contacts to Advancement satellite (shareable content only)
 * This is called after adding new contacts from a call report
 */
function syncNewContactsToAdvancement_() {
  // This will be handled by the main bidirectional sync
  // Just trigger it here after adding new contacts
  try {
    syncToAdvancementSatellite_();
  } catch (error) {
    console.log('Advancement sync skipped: ' + error.message);
  }
}


// ============================================================================
// UI DIALOG HTML
// ============================================================================

function getEnhancedDictationDialogHtml_() {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      padding: 20px; 
      margin: 0;
      background: #f5f5f5;
    }
    
    h2 { 
      color: #C9A227; 
      margin: 0 0 5px 0;
      font-size: 20px;
    }
    
    .subtitle {
      color: #666;
      font-size: 12px;
      margin-bottom: 15px;
    }
    
    .section {
      background: white;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .section-title {
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
      font-size: 13px;
    }
    
    .form-row {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    }
    
    .form-group {
      flex: 1;
    }
    
    label {
      display: block;
      font-size: 11px;
      color: #666;
      margin-bottom: 3px;
    }
    
    input, select, textarea {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 13px;
    }
    
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #C9A227;
    }
    
    textarea {
      resize: vertical;
      min-height: 280px;
      font-family: inherit;
      line-height: 1.5;
    }
    
    .hint {
      background: #e8f5e9;
      border-left: 4px solid #4caf50;
      padding: 10px 12px;
      font-size: 11px;
      margin-bottom: 15px;
      border-radius: 0 4px 4px 0;
    }
    
    .hint.warning {
      background: #fff3cd;
      border-left-color: #C9A227;
    }
    
    .hint strong {
      display: block;
      margin-bottom: 5px;
    }
    
    .features {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      margin-top: 10px;
    }
    
    .feature {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: #666;
    }
    
    .feature-icon {
      font-size: 14px;
    }
    
    .buttons {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 15px;
    }
    
    button {
      padding: 10px 24px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
    }
    
    .btn-primary {
      background: #C9A227;
      color: white;
    }
    
    .btn-primary:hover {
      background: #b8911f;
    }
    
    .btn-primary:disabled {
      background: #999;
      cursor: not-allowed;
    }
    
    .btn-secondary {
      background: #e0e0e0;
      color: #333;
    }
    
    .btn-secondary:hover {
      background: #d0d0d0;
    }
    
    .status {
      padding: 12px;
      border-radius: 4px;
      margin-top: 15px;
      display: none;
      font-size: 13px;
    }
    
    .status.processing {
      display: block;
      background: #e3f2fd;
      color: #1565c0;
    }
    
    .status.success {
      display: block;
      background: #e8f5e9;
      color: #2e7d32;
    }
    
    .status.error {
      display: block;
      background: #ffebee;
      color: #c62828;
    }
    
    .char-count {
      text-align: right;
      font-size: 10px;
      color: #999;
      margin-top: 5px;
    }
    
    .report-link {
      display: inline-block;
      margin-top: 10px;
      padding: 8px 16px;
      background: #C9A227;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-size: 12px;
    }
    
    .progress-steps {
      display: flex;
      justify-content: space-between;
      margin: 15px 0;
      font-size: 10px;
    }
    
    .progress-step {
      text-align: center;
      color: #999;
    }
    
    .progress-step.active {
      color: #C9A227;
      font-weight: bold;
    }
    
    .progress-step.done {
      color: #4caf50;
    }
  </style>
</head>
<body>
  <h2>📞 Log Contact Call (Enhanced)</h2>
  <p class="subtitle">AI-powered analysis with research, spell-check, and automatic sanitization</p>
  
  <div class="hint">
    <strong>🆕 New Features in v2.0</strong>
    <div class="features">
      <div class="feature"><span class="feature-icon">🔍</span> Name research & verification</div>
      <div class="feature"><span class="feature-icon">✓</span> Spell-check names</div>
      <div class="feature"><span class="feature-icon">📋</span> Fact-check claims</div>
      <div class="feature"><span class="feature-icon">🧹</span> Auto-sanitize for sharing</div>
      <div class="feature"><span class="feature-icon">🔗</span> Find LinkedIn & articles</div>
    </div>
  </div>
  
  <div class="hint warning">
    <strong>📝 What Gets Created</strong>
    <strong>INTERNAL (you only):</strong> Full call report with candid assessment, strategic value ratings<br>
    <strong>SHAREABLE (Advancement):</strong> Professional executive summary and notes (sanitized)
  </div>
  
  <div class="section">
    <div class="section-title">Call Details (Optional — AI will extract from your notes)</div>
    <div class="form-row">
      <div class="form-group">
        <label>Contact Name</label>
        <input type="text" id="contactName" placeholder="e.g., Mike Morasky">
      </div>
      <div class="form-group">
        <label>Organization</label>
        <input type="text" id="organization" placeholder="e.g., Valve Corporation">
      </div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Call Recap *</div>
    <textarea id="dictation" placeholder="Paste or type your call recap here. Speak naturally — the AI will:

• Extract all mentioned people as separate contacts
• Spell-check names and suggest corrections
• Research people to find LinkedIn, articles, etc.
• Fact-check claims that seem uncertain
• Create INTERNAL notes (candid, for you only)
• Create SHAREABLE summary (professional, for Advancement/Chanel)
• Flag and sanitize sensitive content automatically

Example:
'Just talked with Mike Morasky at Valve. He's been there 22 years, worked on Portal and Half-Life soundtracks. Before that he was at Weta on Lord of the Rings.

He offered to intro us to Bay Raitt (designed Gollum's face, now doing AI film), Kal Spelletich (machine artist), and Trevor Paglen (MacArthur fellow, does AI/surveillance art).

Seems very well connected. Between us, I get the sense he's looking for his next chapter — might be interested in a more formal role. Should follow up on the intros and explore what that could look like.'"></textarea>
    <div class="char-count"><span id="charCount">0</span> characters</div>
  </div>
  
  <div class="progress-steps" id="progressSteps" style="display:none;">
    <div class="progress-step" id="step1">1. Analyze</div>
    <div class="progress-step" id="step2">2. Research</div>
    <div class="progress-step" id="step3">3. Sanitize</div>
    <div class="progress-step" id="step4">4. Create Report</div>
    <div class="progress-step" id="step5">5. Sync</div>
  </div>
  
  <div id="status" class="status"></div>
  
  <div class="buttons">
    <button class="btn-secondary" onclick="google.script.host.close()">Cancel</button>
    <button class="btn-primary" onclick="submit()" id="submitBtn">🤖 Process Call Report</button>
  </div>
  
  <script>
    const textarea = document.getElementById('dictation');
    const charCount = document.getElementById('charCount');
    const status = document.getElementById('status');
    const submitBtn = document.getElementById('submitBtn');
    const progressSteps = document.getElementById('progressSteps');
    
    textarea.addEventListener('input', () => {
      charCount.textContent = textarea.value.length;
    });
    
    function submit() {
      const text = textarea.value.trim();
      
      if (!text) {
        alert('Please enter your call recap');
        return;
      }
      
      if (text.length < 100) {
        alert('Please provide more detail about the call (at least a paragraph or two)');
        return;
      }
      
      // Show processing status
      progressSteps.style.display = 'flex';
      status.className = 'status processing';
      status.innerHTML = '⏳ Processing... This takes 60-90 seconds for full analysis, research, and sanitization.';
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Processing...';
      
      // Animate progress steps
      animateStep(1);
      
      const input = {
        text: text,
        contactName: document.getElementById('contactName').value.trim(),
        organization: document.getElementById('organization').value.trim(),
        sourceType: 'manual_entry'
      };
      
      google.script.run
        .withSuccessHandler(onSuccess)
        .withFailureHandler(onError)
        .processContactDictation(input);
    }
    
    function animateStep(step) {
      for (let i = 1; i <= 5; i++) {
        const el = document.getElementById('step' + i);
        if (i < step) {
          el.className = 'progress-step done';
        } else if (i === step) {
          el.className = 'progress-step active';
        } else {
          el.className = 'progress-step';
        }
      }
      
      if (step < 5) {
        setTimeout(() => animateStep(step + 1), 15000); // Move to next step every 15s
      }
    }
    
    function onSuccess(result) {
      // Mark all steps done
      for (let i = 1; i <= 5; i++) {
        document.getElementById('step' + i).className = 'progress-step done';
      }
      
      if (result.success) {
        status.className = 'status success';
        status.innerHTML = 
          '<strong>✅ Call Report Created!</strong><br><br>' +
          '📄 <strong>Report:</strong> ' + (result.primaryContact || 'Contact') + '<br>' +
          '👥 <strong>Contacts Added:</strong> ' + (result.contactsAdded || 0) + '<br>' +
          '🔍 <strong>Research:</strong> ' + (result.researchFindings || 'Complete') + '<br><br>' +
          '<a href="' + result.reportUrl + '" target="_blank" class="report-link">Open Internal Report →</a>';
        
        submitBtn.textContent = '✅ Done!';
        submitBtn.style.background = '#4caf50';
        
      } else {
        onError({ message: result.error || 'Unknown error' });
      }
    }
    
    function onError(error) {
      status.className = 'status error';
      status.innerHTML = '❌ <strong>Error:</strong> ' + (error.message || error);
      submitBtn.disabled = false;
      submitBtn.textContent = '🤖 Try Again';
    }
  </script>
</body>
</html>
`;
}
function pushContactsToAdvancementQuick() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const homeSheet = ss.getSheetByName('🤝 Advisory Network');
  
  // Get satellite
  const configSheet = ss.getSheetByName('⚙️ Satellite Config');
  const data = configSheet.getDataRange().getValues();
  let satelliteId = null;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'Advancement Input') {
      satelliteId = data[i][1];
      break;
    }
  }
  
  const satellite = SpreadsheetApp.openById(satelliteId);
  const satSheet = satellite.getSheetByName('Contact Database');
  
  // Get home data
  const homeHeaders = homeSheet.getRange(1, 1, 1, homeSheet.getLastColumn()).getValues()[0];
  const homeData = homeSheet.getRange(2, 1, homeSheet.getLastRow() - 1, homeSheet.getLastColumn()).getValues();
  
  const col = (name) => homeHeaders.indexOf(name);
  
  // Clear old data and write fresh starting at row 12
  if (satSheet.getLastRow() > 11) {
    satSheet.getRange(12, 1, satSheet.getLastRow() - 11, 21).clearContent();
  }
  
  let rowNum = 12;
  homeData.forEach(row => {
    const contactId = row[col('Contact ID')];
    if (!contactId) return;
    
    const satRow = [
      contactId,
      row[col('Name')] || '',
      row[col('Title')] || '',
      row[col('Organization')] || '',
      row[col('Institution Type')] || '',
      row[col('Industry')] || '',
      row[col('Region')] || '',
      row[col('CalArts Connection')] || '',
      row[col('Contact Source')] || '',
      row[col('Potential Role')] || '',
      row[col('Date Added')] || '',
      row[col('Last Contact Date')] || '',
      row[col('Next Steps')] || '',
      row[col('Status')] || '',
      row[col('Added By')] || '',
      row[col('Email')] || '',
      row[col('Phone')] || '',
      row[col('Notes')] || '',
      row[col('Executive Summary')] || '',
      '', // Advancement Notes
      false // Needs Review
    ];
    
    satSheet.getRange(rowNum, 1, 1, 21).setValues([satRow]);
    rowNum++;
  });
  
  SpreadsheetApp.getUi().alert('✅ Pushed ' + (rowNum - 12) + ' contacts to Advancement satellite');
}
/**
 * ============================================================================
 * CONTACT DETAIL VIEWER - Popup for Easy Reading
 * ============================================================================
 * 
 * Adds a "View Contact" button/menu to show a nicely formatted popup
 * with full contact details including Executive Summary.
 * 
 * INSTALLATION:
 * 1. Paste this into your CCAT Home Base Apps Script
 * 2. Save
 * 3. The viewer will work in both Home Base and Advancement satellite
 * 
 * USAGE:
 * - Select any row in Advisory Network or Advancement satellite
 * - Menu: 🎛️ CCAT System > 🤝 Advisory Network > 👁️ View Contact Details
 * - Or use the keyboard shortcut (if configured)
 * 
 * ============================================================================
 */


/**
 * Show contact details popup for the currently selected row
 * Works in both Home Base and Advancement satellite
 */
function showContactDetailPopup() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  
  // Check if we're in a valid sheet
  const validSheets = ['🤝 Advisory Network', 'Contact Database'];
  if (!validSheets.includes(sheetName)) {
    SpreadsheetApp.getUi().alert('Please select a row in the Advisory Network or Contact Database sheet.');
    return;
  }
  
  // Get selected row
  const selection = sheet.getActiveRange();
  const row = selection.getRow();
  
  // Determine header row based on sheet
  const headerRow = sheetName === 'Contact Database' ? 11 : 1;
  const dataStartRow = sheetName === 'Contact Database' ? 12 : 2;
  
  if (row < dataStartRow) {
    SpreadsheetApp.getUi().alert('Please select a contact row (not the header).');
    return;
  }
  
  // Get headers and row data
  const headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Build contact object
  const contact = {};
  headers.forEach((header, idx) => {
    if (header) {
      contact[header] = rowData[idx];
    }
  });
  
  // Check if row has data
  if (!contact['Name']) {
    SpreadsheetApp.getUi().alert('This row appears to be empty. Please select a row with contact data.');
    return;
  }
  
  // Show the popup
  const html = HtmlService.createHtmlOutput(buildContactDetailHtml_(contact, sheetName))
    .setWidth(550)
    .setHeight(650);
  
  SpreadsheetApp.getUi().showModalDialog(html, '👤 Contact Details');
}


/**
 * Build the HTML for the contact detail popup
 */
function buildContactDetailHtml_(contact, sheetName) {
  // Helper to safely get value
  const get = (field) => {
    const val = contact[field];
    if (val === null || val === undefined || val === '') return '';
    if (val instanceof Date) {
      return Utilities.formatDate(val, Session.getScriptTimeZone(), 'MMM d, yyyy');
    }
    return String(val);
  };
  
  // Determine status color
  const status = get('Status').toLowerCase();
  let statusColor = '#666';
  let statusBg = '#f0f0f0';
  if (status.includes('active')) { statusColor = '#2e7d32'; statusBg = '#e8f5e9'; }
  else if (status.includes('new')) { statusColor = '#1565c0'; statusBg = '#e3f2fd'; }
  else if (status.includes('pending')) { statusColor = '#f57c00'; statusBg = '#fff3e0'; }
  else if (status.includes('hold')) { statusColor = '#c62828'; statusBg = '#ffebee'; }
  
  // Build info rows
  const infoRow = (label, value) => {
    if (!value) return '';
    return `
      <div class="info-row">
        <span class="label">${label}</span>
        <span class="value">${value}</span>
      </div>
    `;
  };
  
  // Check if this is Advancement view (no strategic value)
  const isAdvancement = sheetName === 'Contact Database';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f5f5f5;
      padding: 0;
    }
    
    .header {
      background: linear-gradient(135deg, #C9A227 0%, #a8871e 100%);
      color: white;
      padding: 20px;
      position: relative;
    }
    
    .name {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .title-org {
      font-size: 14px;
      opacity: 0.9;
    }
    
    .status-badge {
      position: absolute;
      top: 20px;
      right: 20px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      background: ${statusBg};
      color: ${statusColor};
    }
    
    .content {
      padding: 20px;
    }
    
    .section {
      background: white;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    
    .section-title {
      font-size: 11px;
      font-weight: 600;
      color: #C9A227;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    
    .info-row {
      display: flex;
      flex-direction: column;
      padding: 6px 0;
    }
    
    .label {
      font-size: 10px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
    }
    
    .value {
      font-size: 13px;
      color: #333;
    }
    
    .summary-text {
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      white-space: pre-wrap;
    }
    
    .notes-text {
      font-size: 13px;
      line-height: 1.5;
      color: #555;
      white-space: pre-wrap;
      max-height: 150px;
      overflow-y: auto;
    }
    
    .empty-state {
      color: #999;
      font-style: italic;
      font-size: 13px;
    }
    
    .footer {
      padding: 16px 20px;
      background: #fafafa;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .contact-id {
      font-size: 11px;
      color: #999;
    }
    
    .close-btn {
      background: #C9A227;
      color: white;
      border: none;
      padding: 8px 24px;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
    }
    
    .close-btn:hover {
      background: #b8911f;
    }
    
    .tag {
      display: inline-block;
      background: #e3f2fd;
      color: #1565c0;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      margin-right: 6px;
      margin-bottom: 6px;
    }
    
    .tag.role {
      background: #f3e5f5;
      color: #7b1fa2;
    }
    
    .tag.connection {
      background: #e8f5e9;
      color: #2e7d32;
    }
    
    .advancement-notes {
      background: #e8f5e9;
      border-left: 3px solid #4caf50;
      padding: 12px;
      margin-top: 12px;
      border-radius: 0 4px 4px 0;
    }
    
    .advancement-notes .section-title {
      color: #2e7d32;
      border: none;
      padding: 0;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">${get('Name')}</div>
    <div class="title-org">${[get('Title'), get('Organization')].filter(Boolean).join(' · ')}</div>
    ${get('Status') ? `<div class="status-badge">${get('Status')}</div>` : ''}
  </div>
  
  <div class="content">
    <!-- Tags -->
    <div style="margin-bottom: 16px;">
      ${get('Potential Role') ? `<span class="tag role">${get('Potential Role')}</span>` : ''}
      ${get('Industry') ? `<span class="tag">${get('Industry')}</span>` : ''}
      ${get('Region') ? `<span class="tag">${get('Region')}</span>` : ''}
      ${get('CalArts Connection') ? `<span class="tag connection">${get('CalArts Connection')}</span>` : ''}
    </div>
    
    <!-- Executive Summary -->
    <div class="section">
      <div class="section-title">Executive Summary</div>
      ${get('Executive Summary') 
        ? `<div class="summary-text">${get('Executive Summary')}</div>`
        : `<div class="empty-state">No executive summary yet</div>`
      }
    </div>
    
    <!-- Contact Info -->
    <div class="section">
      <div class="section-title">Contact Information</div>
      <div class="info-grid">
        ${infoRow('Email', get('Email'))}
        ${infoRow('Phone', get('Phone'))}
        ${infoRow('Institution Type', get('Institution Type'))}
        ${infoRow('Contact Source', get('Contact Source'))}
      </div>
    </div>
    
    <!-- Activity -->
    <div class="section">
      <div class="section-title">Activity</div>
      <div class="info-grid">
        ${infoRow('Date Added', get('Date Added'))}
        ${infoRow('Last Contact', get('Last Contact Date') || get('Last Contact Da'))}
        ${infoRow('Added By', get('Added By'))}
        ${infoRow('Next Steps', get('Next Steps'))}
      </div>
    </div>
    
    <!-- Notes -->
    ${get('Notes') ? `
    <div class="section">
      <div class="section-title">Notes</div>
      <div class="notes-text">${get('Notes')}</div>
    </div>
    ` : ''}
    
    <!-- Advancement Notes (if present) -->
    ${get('Advancement Notes') ? `
    <div class="advancement-notes">
      <div class="section-title">📝 Advancement Team Notes</div>
      <div class="notes-text">${get('Advancement Notes')}</div>
    </div>
    ` : ''}
  </div>
  
  <div class="footer">
    <div class="contact-id">ID: ${get('Contact ID') || 'N/A'}</div>
    <button class="close-btn" onclick="google.script.host.close()">Close</button>
  </div>
</body>
</html>
`;
}




// ============================================================================
// MENU INTEGRATION
// ============================================================================

/**
 * Add this to your Advisory Network submenu in onOpen():
 * 
 * .addSeparator()
 * .addItem('👁️ View Contact Details', 'showContactDetailPopup')
 */
/**
 * Auto-popup when clicking on Name cell
 * This is a simple trigger - works automatically
 */
function onSelectionChange(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const sheetName = sheet.getName();
    
    const validSheets = {
      '🤝 Advisory Network': { dataStart: 2, nameCol: 2 },
      'Contact Database': { dataStart: 12, nameCol: 2 }
    };
    
    const config = validSheets[sheetName];
    if (!config) return;
    
    const range = e.range;
    if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;
    if (range.getColumn() !== config.nameCol) return;
    if (range.getRow() < config.dataStart) return;
    if (!range.getValue()) return;
    
    showContactDetailPopup();
  } catch (error) {
    // Silent fail
  }
}
/**
 /**
 * Creates Advancement Check-In - FULLY SELF-CONTAINED
 */
function addAdvancementCheckIn() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  Logger.log('Starting Advancement Check-In setup...');
  
  // Step 1: Create template sheet
  Logger.log('Step 1: Creating template sheet...');
  
  if (!ss.getSheetByName('Advancement Check-In Template')) {
    var productionTemplate = ss.getSheetByName('Production Sync Template');
    if (productionTemplate) {
      var templateSheet = productionTemplate.copyTo(ss);
      templateSheet.setName('Advancement Check-In Template');
      templateSheet.getRange('A1').setValue('Advancement Team Check-In');
      Logger.log('Created Advancement Check-In Template');
    }
  } else {
    Logger.log('Template already exists');
  }
  
  // Step 2: Create active sheet
  Logger.log('Step 2: Creating active sheet...');
  
  if (!ss.getSheetByName('Advancement Check-In')) {
    var template = ss.getSheetByName('Advancement Check-In Template');
    if (template) {
      var activeSheet = template.copyTo(ss);
      activeSheet.setName('Advancement Check-In');
      Logger.log('Created Advancement Check-In');
    }
  } else {
    Logger.log('Active sheet already exists');
  }
  
  // Step 3: Create satellite workbook
  Logger.log('Step 3: Creating satellite...');
  
  var configSheet = ss.getSheetByName('⚙️ Satellite Config');
  if (!configSheet) {
    Logger.log('ERROR: Satellite Config not found');
    return;
  }
  
  // Check if already exists
  var data = configSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === 'Advancement') {
      Logger.log('Advancement satellite already in config');
      Logger.log('DONE!');
      return;
    }
  }
  
  // Create satellite
  var satellite = SpreadsheetApp.create('CCAT Check-In — Advancement');
  var satelliteId = satellite.getId();
  
  // Move to folder
  var masterFolder = DriveApp.getFileById(ss.getId()).getParents().next();
  var folders = masterFolder.getFoldersByName('CCAT Satellite Check-Ins');
  var targetFolder = folders.hasNext() ? folders.next() : masterFolder.createFolder('CCAT Satellite Check-Ins');
  DriveApp.getFileById(satelliteId).moveTo(targetFolder);
  
  // Set up satellite sheet
  var satSheet = satellite.getSheets()[0];
  satSheet.setName('Check-In');
  satSheet.getRange('A1').setValue('Advancement Team Check-In').setFontSize(16).setFontWeight('bold');
  satSheet.getRange('A2').setValue('Sprint:');
  satSheet.getRange('C2').setValue('Dates:');
  satSheet.getRange('A3').setValue('Intent:');
  
  // Add to config
  var newRow = configSheet.getLastRow() + 1;
  configSheet.getRange(newRow, 1, 1, 5).setValues([[
    'Advancement',
    satelliteId,
    satellite.getUrl(),
    new Date(),
    'Created'
  ]]);
  
  Logger.log('Created satellite: ' + satellite.getUrl());
  Logger.log('');
  Logger.log('SUCCESS! Now add this to CONFIG.checkIns:');
  Logger.log("{ name: 'Advancement', templateSheet: 'Advancement Check-In Template', activeSheet: 'Advancement Check-In', title: 'Advancement Team Check-In', type: 'checkin' },");
}