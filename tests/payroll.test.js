const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('AE HR-SYSTEM Payroll Module Integration Tests', () => {
  const allIntervals = [];

  function createTestEnvironment() {
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

    // Track intervals so we can clear them and let Node exit cleanly
    const origSetInterval = window.setInterval.bind(window);
    window.setInterval = (fn, ms, ...args) => {
      const id = origSetInterval(fn, ms, ...args);
      allIntervals.push({ window, id });
      return id;
    };

    // Polyfill browser globals for test environment
    window.scrollTo = () => {};
    window.alert = () => {};
    window.AudioContext = class {
      createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
      createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
      get currentTime() { return 0; }
    };
    window.webkitAudioContext = window.AudioContext;

    // Preset Programmer Session in localStorage
    window.localStorage.setItem('JISR_AUTH_SESSION', JSON.stringify({
      token: 'mock-session-token',
      employeeId: 'aa69f711-7ca3-41dc-b628-42a5dda853f6',
      email: 'aemade2016@gmail.com',
      role: 'programmer',
      company_id: '11111111-2222-3333-4444-555555555555'
    }));
    window.localStorage.setItem('JISR_COMPANY_ID', '11111111-2222-3333-4444-555555555555');

    // Capture unhandled errors in window
    const errors = [];
    window.addEventListener('error', (e) => {
      errors.push(e.error || e.message);
    });

    // Load api.js
    const apiCode = fs.readFileSync(apiPath, 'utf8');
    window.eval(apiCode);

    // Speed up ApiService delays in tests
    if (window.ApiService) {
      window.ApiService.simulateDelay = () => Promise.resolve();
    }

    // Load app.js
    const appCode = fs.readFileSync(appPath, 'utf8');
    window.eval(appCode);

    return { window, dom, errors };
  }

  after(() => {
    allIntervals.forEach(({ window, id }) => {
      try { window.clearInterval(id); } catch (e) {}
    });
  });

  it('calculateMonthlyPayroll should return employee object with {id, fullName, department, jobTitle, role} and flat fields', async () => {
    const { window } = createTestEnvironment();
    const res = await window.ApiService.calculateMonthlyPayroll('2026-10');
    assert.strictEqual(res.success, true, 'calculateMonthlyPayroll should succeed');
    assert.ok(Array.isArray(res.payrollReport), 'payrollReport should be an array');
    assert.ok(res.payrollReport.length > 0, 'payrollReport should have rows');

    const row = res.payrollReport[0];
    // Check flat fields exist for backwards compatibility
    assert.ok(row.employeeId, 'Flat employeeId should exist');
    assert.ok(row.employeeName, 'Flat employeeName should exist');
    assert.ok(row.department, 'Flat department should exist');
    assert.ok(row.jobTitle, 'Flat jobTitle should exist');

    // Check nested employee object exists as expected by app.js
    assert.ok(row.employee, 'Nested employee object should exist');
    assert.strictEqual(typeof row.employee, 'object', 'employee must be an object');
    assert.ok(row.employee.id, 'employee.id must exist');
    assert.ok(row.employee.fullName, 'employee.fullName must exist');
    assert.ok(row.employee.department, 'employee.department must exist');
    assert.ok(row.employee.jobTitle, 'employee.jobTitle must exist');
    assert.ok(row.employee.role, 'employee.role must exist');
  });

  it('loads app as programmer, renders module-payroll table, payslip modal, and quick details without error', async () => {
    const { window, errors } = createTestEnvironment();

    // Wait for initApp async initialization
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify programmer role loaded into admin portal
    const adminPortal = window.document.getElementById('portal-admin');
    assert.ok(adminPortal, 'Admin portal container should exist');
    assert.strictEqual(adminPortal.classList.contains('hidden'), false, 'Admin portal should be active for programmer');

    // Open module-payroll tab
    const navPayroll = window.document.querySelector('.nav-tab[data-target="module-payroll"]');
    assert.ok(navPayroll, 'Payroll nav tab should exist');
    navPayroll.click();

    // Wait for renderPayrollModule to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify payroll table rendered
    const tbody = window.document.getElementById('payrollTableBody');
    assert.ok(tbody, '#payrollTableBody should exist');
    const rows = tbody.querySelectorAll('tr.table-parent-row');
    assert.ok(rows.length > 0, 'Payroll table should have rendered employee rows without error');

    // Verify first row contains employee full name
    const firstRowText = rows[0].textContent;
    assert.ok(firstRowText.includes('أحمد عماد') || firstRowText.length > 10, 'Row should display employee data');

    // Test Quick Details Modal (view-payroll-details)
    const detailsBtn = tbody.querySelector('[data-action="view-payroll-details"]');
    assert.ok(detailsBtn, 'Details button should exist');
    detailsBtn.click();
    const quickModal = window.document.getElementById('quickDetailsModal');
    assert.ok(quickModal, 'Quick details modal should exist');
    assert.strictEqual(quickModal.classList.contains('hidden'), false, 'Quick details modal should be visible');

    // Close quick details modal
    const closeQuickBtn = window.document.getElementById('closeQuickDetailsBtn');
    if (closeQuickBtn) closeQuickBtn.click();

    // Test Payslip Modal (view-payslip)
    const payslipBtn = tbody.querySelector('[data-action="view-payslip"]');
    assert.ok(payslipBtn, 'Payslip button should exist');
    payslipBtn.click();
    const payslipModal = window.document.getElementById('payslipModal');
    assert.ok(payslipModal, 'Payslip modal should exist');
    assert.strictEqual(payslipModal.classList.contains('hidden'), false, 'Payslip modal should be visible');
    const slipEmpName = window.document.getElementById('slipEmpName');
    assert.ok(slipEmpName && slipEmpName.textContent.trim().length > 0, 'Slip employee name should be populated');

    // Test Employee Portal Payslip Button (#empViewPayslipBtn at line 3318)
    const empViewPayslipBtn = window.document.getElementById('empViewPayslipBtn');
    assert.ok(empViewPayslipBtn, '#empViewPayslipBtn should exist');
    empViewPayslipBtn.click();
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.strictEqual(payslipModal.classList.contains('hidden'), false, 'Payslip modal should be opened by empViewPayslipBtn');

    // Ensure no uncaught errors occurred
    assert.strictEqual(errors.length, 0, `Should have zero uncaught errors, but got: ${errors.join('; ')}`);
  });
});
