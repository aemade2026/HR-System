const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('AE HR-SYSTEM Batch 3 Bug Fixes Tests', () => {
  const allIntervals = [];

  function createTestEnvironment(role = 'programmer') {
    const htmlPath = path.resolve(__dirname, '../index.html');
    const apiPath = path.resolve(__dirname, '../api.js');
    const appPath = path.resolve(__dirname, '../app.js');

    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, {
      url: 'http://localhost/',
      runScripts: 'outside-only',
      pretendToBeVisual: true
    });

    const { window } = dom;

    const origSetInterval = window.setInterval.bind(window);
    window.setInterval = (fn, ms, ...args) => {
      const id = origSetInterval(fn, ms, ...args);
      allIntervals.push({ window, id });
      return id;
    };

    window.scrollTo = () => {};
    window.alert = () => {};
    window.confirm = () => true;
    window.AudioContext = class {
      createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
      createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
      get currentTime() { return 0; }
    };
    window.webkitAudioContext = window.AudioContext;

    // Mock WebAuthn PublicKeyCredential and navigator.credentials
    window.PublicKeyCredential = class {};
    window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = async () => true;
    window.navigator.credentials = {
      create: async () => ({ rawId: new Uint8Array([1, 2, 3, 4]).buffer }),
      get: async () => ({ id: 'mock-cred' })
    };

    if (role === 'programmer') {
      window.localStorage.setItem('JISR_AUTH_SESSION', JSON.stringify({
        token: 'mock-session-token',
        employeeId: 'aa69f711-7ca3-41dc-b628-42a5dda853f6',
        email: 'aemade2016@gmail.com',
        role: 'programmer',
        company_id: '11111111-2222-3333-4444-555555555555'
      }));
    } else {
      window.localStorage.setItem('JISR_AUTH_SESSION', JSON.stringify({
        token: 'mock-emp-token',
        employeeId: 'EMP-0002',
        email: 'employee@company.com',
        role: 'employee',
        company_id: '11111111-2222-3333-4444-555555555555'
      }));
    }
    window.localStorage.setItem('JISR_COMPANY_ID', '11111111-2222-3333-4444-555555555555');

    const uncaughtErrors = [];
    window.addEventListener('error', (e) => {
      uncaughtErrors.push(e.error || e.message);
    });

    window.eval(fs.readFileSync(apiPath, 'utf8'));
    if (window.ApiService) {
      window.ApiService.simulateDelay = () => Promise.resolve();
    }

    window.eval(fs.readFileSync(appPath, 'utf8'));

    return { window, dom, uncaughtErrors };
  }

  after(() => {
    allIntervals.forEach(({ window, id }) => {
      try { window.clearInterval(id); } catch (e) {}
    });
  });

  it('1. requestDeviceBiometricVerification should be callable from kiosk terminal without ReferenceError', async () => {
    const { window, uncaughtErrors } = createTestEnvironment('programmer');
    await new Promise(r => setTimeout(r, 200));

    // In Kiosk terminal, select an employee and click the scanner widget
    const kioskEmpSelect = window.document.getElementById('kioskEmpSelect');
    assert.ok(kioskEmpSelect, '#kioskEmpSelect should exist');
    kioskEmpSelect.innerHTML = '<option value="aa69f711-7ca3-41dc-b628-42a5dda853f6" selected>م. أحمد عماد</option>';
    kioskEmpSelect.value = 'aa69f711-7ca3-41dc-b628-42a5dda853f6';

    const scannerWidget = window.document.getElementById('scannerWidget');
    assert.ok(scannerWidget, '#scannerWidget should exist');

    // Trigger fingerprint scan
    scannerWidget.click();
    await new Promise(r => setTimeout(r, 200));

    // Ensure no ReferenceError was thrown for requestDeviceBiometricVerification
    const hasRefError = uncaughtErrors.some(err => String(err).includes('requestDeviceBiometricVerification'));
    assert.strictEqual(hasRefError, false, 'Should not throw ReferenceError for requestDeviceBiometricVerification');
  });

  it('2. openRequestDetailsModal should be defined and open #requestDetailsModal with request data, escapeHTML, and close handlers', async () => {
    const { window, uncaughtErrors } = createTestEnvironment('programmer');
    await new Promise(r => setTimeout(r, 200));

    // Seed a request into LocalDatabase
    const db = window.LocalDatabase.getDB();
    if (!Array.isArray(db.requests)) db.requests = [];
    const testReq = {
      id: 'REQ-TEST-99',
      company_id: '11111111-2222-3333-4444-555555555555',
      employeeId: 'aa69f711-7ca3-41dc-b628-42a5dda853f6',
      employeeName: 'م. أحمد عماد',
      department: 'تقنية المعلومات',
      type: 'annual_leave',
      typeName: 'إجازة اعتيادية',
      status: 'approved',
      startDate: '2026-11-20',
      endDate: '2026-11-25',
      daysCount: 5,
      reason: '<script>alert(1)</script>ظروف خاصة',
      managerReply: '<script>alert(2)</script>تمت الموافقة',
      reviewedBy: 'المدير العام',
      reviewedAt: '2026-11-19'
    };
    db.requests.push(testReq);
    window.LocalDatabase.saveDB(db);

    // Call openRequestDetailsModal via delegation on #empRequestsContainer
    const empReqContainer = window.document.getElementById('empRequestsContainer');
    assert.ok(empReqContainer, '#empRequestsContainer should exist');
    empReqContainer.innerHTML = '<button data-action="view-request-details" data-id="REQ-TEST-99">عرض التفاصيل</button>';

    const viewBtn = empReqContainer.querySelector('[data-action="view-request-details"]');
    viewBtn.click();

    await new Promise(r => setTimeout(r, 200));

    const hasRefError = uncaughtErrors.some(err => String(err).includes('openRequestDetailsModal'));
    assert.strictEqual(hasRefError, false, 'Should not throw ReferenceError for openRequestDetailsModal');

    const modal = window.document.getElementById('requestDetailsModal');
    assert.ok(modal, '#requestDetailsModal should exist');
    assert.strictEqual(modal.classList.contains('hidden'), false, '#requestDetailsModal should be visible');

    // Verify content populated and HTML escaped
    const reasonEl = window.document.getElementById('reqDetailsReasonText');
    assert.ok(reasonEl, '#reqDetailsReasonText should exist');
    assert.ok(!reasonEl.innerHTML.includes('<script>'), 'Reason text should be escaped with escapeHTML');
    assert.ok(reasonEl.textContent.includes('ظروف خاصة'), 'Reason text should be visible');

    // Verify close on button click
    const closeBtn = window.document.getElementById('closeReqDetailsModalBtn') || window.document.getElementById('dismissReqDetailsModalBtn');
    assert.ok(closeBtn, 'Close button should exist');
    closeBtn.click();
    assert.strictEqual(modal.classList.contains('hidden'), true, '#requestDetailsModal should close on button click');
  });

  it('3. cloneData and INITIAL_DATABASE should be exported on window and allow Programmer Permissions matrix and Reset Defaults to work', async () => {
    const { window, uncaughtErrors } = createTestEnvironment('programmer');
    await new Promise(r => setTimeout(r, 200));

    // Verify window exports
    assert.strictEqual(typeof window.cloneData, 'function', 'window.cloneData must be exported as a function');
    assert.strictEqual(typeof window.INITIAL_DATABASE, 'object', 'window.INITIAL_DATABASE must be exported as an object');

    // Navigate to module-programmer
    const progTab = window.document.querySelector('.nav-tab[data-target="module-programmer"]');
    assert.ok(progTab, 'Programmer nav tab should exist');
    progTab.click();
    await new Promise(r => setTimeout(r, 100));

    // Open permissions subtab
    const permSubTab = window.document.getElementById('progTabPermsBtn');
    assert.ok(permSubTab, 'Permissions subtab button (#progTabPermsBtn) should exist');
    permSubTab.click();
    await new Promise(r => setTimeout(r, 200));

    // Verify single scope container rendered initially
    const singleContainer = window.document.getElementById('progPermSingleScopeContainer');
    assert.ok(singleContainer, '#progPermSingleScopeContainer should exist');
    assert.ok(singleContainer.children.length > 0, 'Single scope permissions should render category cards');

    // Select comparative matrix view (which uses cloneData and INITIAL_DATABASE)
    const scopeSelect = window.document.getElementById('progPermScopeSelect');
    assert.ok(scopeSelect, '#progPermScopeSelect should exist');
    scopeSelect.value = 'view:all_matrix';
    scopeSelect.dispatchEvent(new window.Event('change'));
    await new Promise(r => setTimeout(r, 200));

    // Check tbody rendered
    const tbody = window.document.getElementById('progPermissionsTableBody');
    assert.ok(tbody, '#progPermissionsTableBody should exist');
    const rows = tbody.querySelectorAll('tr');
    assert.ok(rows.length > 0, 'Permissions matrix table should render rows');

    // Test Reset Default Permissions button (which uses INITIAL_DATABASE)
    const resetBtn = window.document.getElementById('progResetPermsBtn');
    assert.ok(resetBtn, '#progResetPermsBtn should exist');
    resetBtn.click();
    await new Promise(r => setTimeout(r, 200));

    const hasMatrixError = uncaughtErrors.some(err => String(err).includes('cloneData') || String(err).includes('INITIAL_DATABASE'));
    assert.strictEqual(hasMatrixError, false, 'Should not throw ReferenceError for cloneData or INITIAL_DATABASE');
  });
});
