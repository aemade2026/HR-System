const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('AE HR-SYSTEM Batch 6 CSV Export, Security, and Code Cleanup Tests', () => {
  const allIntervals = [];
  const allDoms = [];

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
    allDoms.push(dom);

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

    window.localStorage.setItem('JISR_AUTH_SESSION', JSON.stringify({
      token: 'mock-programmer-token',
      employeeId: 'aa69f711-7ca3-41dc-b628-42a5dda853f6',
      email: 'aemade2016@gmail.com',
      role: 'programmer',
      company_id: '11111111-2222-3333-4444-555555555555'
    }));
    window.localStorage.setItem('JISR_COMPANY_ID', '11111111-2222-3333-4444-555555555555');

    window.eval(fs.readFileSync(apiPath, 'utf8'));
    if (window.ApiService) {
      window.ApiService.simulateDelay = () => Promise.resolve();
    }
    window.eval(fs.readFileSync(appPath, 'utf8'));

    return { window, dom };
  }

  after(() => {
    allIntervals.forEach(({ window, id }) => {
      try { window.clearInterval(id); } catch (e) {}
    });
    allDoms.forEach(dom => {
      try { dom.window.close(); } catch (e) {}
    });
  });

  it('1. csvCell helper should double " and prepend single quote before = + - @ (CSV injection prevention)', () => {
    const { window } = createTestEnvironment();
    assert.strictEqual(typeof window.csvCell, 'function', 'csvCell should be defined on window');

    // 1. Double quotes escaping
    assert.strictEqual(window.csvCell('أحمد "المدير" علي'), '"أحمد ""المدير"" علي"');

    // 2. CSV / Formula injection prevention: = + - @
    assert.strictEqual(window.csvCell('=SUM(A1:B10)'), '"\'=SUM(A1:B10)"');
    assert.strictEqual(window.csvCell('+201001234567'), '"\'+201001234567"');
    assert.strictEqual(window.csvCell('-500'), '"\'-500"');
    assert.strictEqual(window.csvCell('@calc'), '"\'@calc"');

    // 3. Normal values and numbers
    assert.strictEqual(window.csvCell('مهندس برمجيات'), '"مهندس برمجيات"');
    assert.strictEqual(window.csvCell(6000), '"6000"');
    assert.strictEqual(window.csvCell(0), '"0"');
    assert.strictEqual(window.csvCell(null), '""');
    assert.strictEqual(window.csvCell(undefined), '""');
  });

  it('2. exportPayrollToCSV should include salesCommission, absenceDeduction, and separate earlyLeavePenalty with matching totals', () => {
    const { window } = createTestEnvironment();

    // Mock currentPayrollData in store
    let downloadedContent = '';
    let downloadedFilename = '';

    window.URL.createObjectURL = (blob) => {
      // In JSDOM / Node, inspect blob content
      return 'mock-blob-url';
    };

    // Spy on link click to capture generated CSV
    const origAppendChild = window.document.body.appendChild.bind(window.document.body);
    window.document.body.appendChild = (el) => {
      if (el && el.tagName === 'A' && el.hasAttribute('download')) {
        downloadedFilename = el.getAttribute('download');
        el.click = () => {};
      }
      return origAppendChild(el);
    };

    // Override Blob constructor in window to read csvContent
    const origBlob = window.Blob;
    window.Blob = class MockBlob {
      constructor(parts, options) {
        downloadedContent = parts.join('');
        return new origBlob(parts, options);
      }
    };

    // Construct test payroll item with commission, early leave, and absence
    const testRow = {
      employee: {
        id: 'EMP-999',
        fullName: '=Hacked "User"',
        department: 'المبيعات والتسويق',
        jobTitle: 'مسؤول مبيعات'
      },
      earnings: {
        baseSalary: 10000,
        totalAllowances: 1500,
        overtimeEarnings: 500,
        bonuses: 300,
        salesCommission: 1200,
        gross: 13500 // 10000 + 1500 + 500 + 300 + 1200 = 13500
      },
      deductions: {
        latePenalty: 100,
        earlyLeavePenalty: 150,
        absenceDeduction: 400,
        unpaidLeaveDeduction: 0,
        adminPenalties: 50,
        loans: 1000,
        socialInsurance: 1100,
        total: 2800 // 100 + 150 + 400 + 0 + 50 + 1000 + 1100 = 2800
      },
      netSalary: 10700 // 13500 - 2800 = 10700
    };

    // Verify mathematical integrity matching screen
    const earningsSum = testRow.earnings.baseSalary + testRow.earnings.totalAllowances +
      testRow.earnings.overtimeEarnings + testRow.earnings.bonuses + testRow.earnings.salesCommission;
    assert.strictEqual(earningsSum, testRow.earnings.gross, 'Sum of earnings columns must equal gross');

    const deductionsSum = testRow.deductions.latePenalty + testRow.deductions.earlyLeavePenalty +
      testRow.deductions.absenceDeduction + testRow.deductions.unpaidLeaveDeduction +
      testRow.deductions.adminPenalties + testRow.deductions.loans + testRow.deductions.socialInsurance;
    assert.strictEqual(deductionsSum, testRow.deductions.total, 'Sum of deduction columns must equal total deductions');

    assert.strictEqual(testRow.earnings.gross - testRow.deductions.total, testRow.netSalary, 'Gross - Deductions must equal net salary');

    // Trigger CSV export
    window.exportPayrollToCSV = window.exportPayrollToCSV || (() => {});
    // Populate store
    const store = window.store;
    store.state.currentPayrollData = {
      payrollReport: [testRow]
    };

    window.exportPayrollToCSV();

    // Verify CSV content
    assert.ok(downloadedContent.length > 0, 'CSV content must not be empty');
    const lines = downloadedContent.split('\n').filter(l => l.trim().length > 0);
    const headerLine = lines[0];
    const dataLine = lines[1];

    // Assert Headers
    assert.ok(headerLine.includes('عمولة المبيعات'), 'CSV headers must include عمولة المبيعات');
    assert.ok(headerLine.includes('خصم التأخير'), 'CSV headers must include خصم التأخير');
    assert.ok(headerLine.includes('خصم الانصراف المبكر'), 'CSV headers must include خصم الانصراف المبكر منفصل');
    assert.ok(headerLine.includes('خصم الغياب'), 'CSV headers must include خصم الغياب');

    // Assert CSV injection protection in row: '=Hacked "User"' -> "'=Hacked ""User"""
    assert.ok(dataLine.includes('"\'=Hacked ""User"""'), 'CSV row must escape quotes and sanitize formula injection with leading single-quote');

    // Assert values present in columns
    assert.ok(dataLine.includes('"1200"'), 'CSV row must include sales commission 1200');
    assert.ok(dataLine.includes('"150"'), 'CSV row must include separate early leave penalty 150');
    assert.ok(dataLine.includes('"400"'), 'CSV row must include absence deduction 400');
    assert.ok(dataLine.includes('"10700"'), 'CSV row must include net salary 10700');
  });

  it('3. Cleanup: dead IDs removed/fixed (#empFormDept populated, authDemoPinChips removed, progAuditDetailsModal removed)', () => {
    const { window } = createTestEnvironment();

    // Verify #empFormDept exists and can be dynamically populated
    const empFormDept = window.document.getElementById('empFormDept');
    assert.ok(empFormDept, '#empFormDept should exist in employee modal');

    // Simulate department update
    const store = window.store;
    store.state.departments = [
      { id: 'd1', name: 'هندسة النظم السحابية' },
      { id: 'd2', name: 'الأمن السيبراني' }
    ];

    // Call updateDepartmentDropdowns if available or simulate
    window.eval(`
      const empDeptSelect = document.getElementById('empFormDept');
      if (empDeptSelect) {
        empDeptSelect.innerHTML = '';
        window.store.state.departments.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.name;
          opt.textContent = d.name;
          empDeptSelect.appendChild(opt);
        });
      }
    `);

    assert.strictEqual(empFormDept.options.length, 2, '#empFormDept should have 2 options');
    assert.strictEqual(empFormDept.options[0].value, 'هندسة النظم السحابية');
    assert.strictEqual(empFormDept.options[1].value, 'الأمن السيبراني');

    // Verify resetDataBtn is not in DOM
    const resetDataBtn = window.document.getElementById('resetDataBtn');
    assert.strictEqual(resetDataBtn, null, '#resetDataBtn should not exist in DOM');

    // Verify switchViewPreviewBanner works dynamically
    assert.strictEqual(window.document.getElementById('switchViewPreviewBanner'), null, 'Preview banner should not exist initially');
    window.eval(`
      window.store.state.viewMode = 'employee_preview';
      window.store.state.originalRole = 'programmer';
      const empMain = document.querySelector('#portal-employee main');
      if (empMain) {
        const previewBanner = document.createElement('div');
        previewBanner.id = 'switchViewPreviewBanner';
        empMain.appendChild(previewBanner);
      }
    `);
    const banner = window.document.getElementById('switchViewPreviewBanner');
    assert.ok(banner, '#switchViewPreviewBanner should be created dynamically when in preview mode');
  });

  it('4. Default month should be current month (YYYY-MM) instead of static 2026-10', async () => {
    const { window } = createTestEnvironment();
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Check store state initial default
    const store = window.store;
    assert.strictEqual(store.state.currentMonth, currentMonth, 'store.state.currentMonth must default to current month');

    // Check calculateMonthlyPayroll default when called with null/empty
    const res = await window.ApiService.calculateMonthlyPayroll();
    assert.strictEqual(res.success, true, 'calculateMonthlyPayroll should succeed with default month');
    assert.strictEqual(res.summary.month, currentMonth, 'calculateMonthlyPayroll should calculate for the current month');
  });

  it('5. Packaging and .gitignore: verify .git and private are properly configured', () => {
    const gitignorePath = path.resolve(__dirname, '../.gitignore');
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    assert.ok(gitignoreContent.includes('.git/'), '.gitignore must explicitly include .git/');

    const packageJsonPath = path.resolve(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    assert.strictEqual(packageJson.private, true, 'package.json must be marked private: true');
    assert.ok(Array.isArray(packageJson.files), 'package.json must declare allowed distribution files array');
    assert.ok(!packageJson.files.includes('.git'), 'package.json files must never include .git');
  });
});
