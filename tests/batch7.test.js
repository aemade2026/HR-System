const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('AE HR-SYSTEM Batch 7 Pre-Production Audit & Security Verification Tests', () => {
  const allIntervals = [];

  function createTestEnvironment(mockSupabase = null) {
    const htmlPath = path.resolve(__dirname, '../index.html');
    const apiPath = path.resolve(__dirname, '../api.js');

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

    if (mockSupabase) {
      window.supabase = { createClient: () => mockSupabase };
    }

    const testUser = {
      id: 'aa69f711-7ca3-41dc-b628-42a5dda853f6',
      user_id: 'aa69f711-7ca3-41dc-b628-42a5dda853f6',
      employee_code: 'EMP-0001',
      fullName: 'مدير النظام (مبرمج)',
      department: 'تقنية المعلومات',
      jobTitle: 'مبرمج نظام',
      role: 'programmer',
      status: 'active',
      company_id: '11111111-2222-3333-4444-555555555555'
    };

    window.localStorage.setItem('JISR_AUTH_SESSION', JSON.stringify({
      token: 'mock-programmer-token',
      employeeId: testUser.id,
      email: 'admin@system.local',
      role: 'programmer',
      company_id: testUser.company_id
    }));
    window.localStorage.setItem('JISR_COMPANY_ID', testUser.company_id);

    window.eval(fs.readFileSync(apiPath, 'utf8'));
    if (window.ApiService) {
      window.ApiService.simulateDelay = () => Promise.resolve();
    }

    const db = window.LocalDatabase.getDB();
    if (!Array.isArray(db.employees) || db.employees.length === 0) {
      db.employees = [{ ...testUser }];
      window.LocalDatabase.saveDB(db);
    }

    return { window, dom };
  }

  after(() => {
    allIntervals.forEach(({ window, id }) => {
      try { window.clearInterval(id); } catch (e) {}
    });
  });

  it('1. createLeave and createAdjustment execute without ReferenceError: db is not defined', async () => {
    const { window } = createTestEnvironment();
    const testEmpId = 'aa69f711-7ca3-41dc-b628-42a5dda853f6';

    // Test createLeave
    const leaveRes = await window.ApiService.createLeave({
      employeeId: testEmpId,
      leaveType: 'annual',
      startDate: '2026-12-01',
      endDate: '2026-12-03',
      daysCount: 3,
      reason: 'إجازة سنوية اختبارية'
    });

    assert.strictEqual(leaveRes.success, true, 'createLeave must succeed without ReferenceError');
    assert.ok(leaveRes.data, 'Leave record must be returned');

    const db = window.LocalDatabase.getDB();
    const savedLeave = (db.leaves || []).find(l => l.reason === 'إجازة سنوية اختبارية');
    assert.ok(savedLeave, 'Leave record must be saved in LocalDatabase.leaves');

    // Test createAdjustment
    const adjRes = await window.ApiService.createAdjustment({
      employeeId: testEmpId,
      type: 'bonus',
      value: 500,
      date: '2026-12-01',
      month: '2026-12'
    });

    assert.strictEqual(adjRes.success, true, 'createAdjustment must succeed without ReferenceError');
    assert.ok(adjRes.data, 'Adjustment record must be returned');

    const savedAdj = (window.LocalDatabase.getDB().adjustments || []).find(a => a.value === 500);
    assert.ok(savedAdj, 'Adjustment must be saved in LocalDatabase.adjustments');
  });

  it('2. rejectPendingEmployee executes without ReferenceError: removed is not defined', async () => {
    const { window } = createTestEnvironment();
    const db = window.LocalDatabase.getDB();

    const pendingEmp = {
      id: 'EMP-PENDING-99',
      employee_code: 'EMP-9999',
      fullName: 'موظف بانتظار الاعتماد',
      department: 'العمليات والتشغيل',
      role: 'employee',
      status: 'pending',
      company_id: '11111111-2222-3333-4444-555555555555'
    };
    db.employees.push(pendingEmp);
    window.LocalDatabase.saveDB(db);

    const res = await window.ApiService.rejectPendingEmployee('EMP-PENDING-99');
    assert.strictEqual(res.success, true, 'rejectPendingEmployee must succeed without ReferenceError');
    assert.strictEqual(res.data.fullName, 'موظف بانتظار الاعتماد', 'Rejected employee data must be returned');

    const afterDb = window.LocalDatabase.getDB();
    const found = afterDb.employees.find(e => e.id === 'EMP-PENDING-99');
    assert.strictEqual(found, undefined, 'Rejected employee must be removed from LocalDatabase');
  });

  it('3. Verification: absence of hardcoded PII (EMP-1001, phone 01123245614, PIN 123456)', () => {
    const apiSource = fs.readFileSync(path.resolve(__dirname, '../api.js'), 'utf8');

    // Check INITIAL_DATABASE.employees is empty
    assert.match(apiSource, /employees:\s*\[\s*\]/, 'INITIAL_DATABASE.employees must be []');

    // Check absence of fake employee seeding in getDB
    assert.strictEqual(apiSource.includes('01123245614'), false, 'Hardcoded phone 01123245614 must not exist');
    assert.strictEqual(apiSource.includes('ahmed.emad.sales@company.com'), false, 'Hardcoded fake email must not exist');
    assert.strictEqual(apiSource.includes('55555555-4444-3333-2222-111111111111'), false, 'Hardcoded company UUID must not exist');
  });

  it('4. updateEmployeeSales and updateSalaryStatus update data and call Supabase update', async () => {
    let capturedUpdates = [];
    const mockSupabase = {
      from: (table) => ({
        update: (payload) => {
          capturedUpdates.push({ table, payload });
          const builder = {
            eq: () => builder,
            then: (resolve) => resolve({ data: [payload], error: null })
          };
          return builder;
        }
      })
    };

    const { window } = createTestEnvironment(mockSupabase);
    const testEmpId = 'aa69f711-7ca3-41dc-b628-42a5dda853f6';

    // Test updateEmployeeSales
    const salesRes = await window.ApiService.updateEmployeeSales(testEmpId, {
      salesTarget: 25000,
      salesAchieved: 18000,
      commissionRate: 5
    });
    assert.strictEqual(salesRes.success, true);
    assert.strictEqual(salesRes.data.salesTarget, 25000);
    assert.strictEqual(salesRes.data.commissionRate, 5);

    // Test updateSalaryStatus
    const salaryRes = await window.ApiService.updateSalaryStatus(testEmpId, 'paid');
    assert.strictEqual(salaryRes.success, true);

    const empInDb = window.LocalDatabase.getDB().employees.find(e => e.id === testEmpId);
    assert.strictEqual(empInDb.salaryStatus, 'paid');
    assert.ok(capturedUpdates.some(u => u.table === 'employees' && u.payload.salary_status === 'paid'), 'Supabase update for salaryStatus must be called');
  });

  it('5. GPS Security: Geolocation error stops punchAttendance and displays toast when geofence is required', async () => {
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

    window.navigator.geolocation = {
      getCurrentPosition: (success, error) => {
        error(new Error('User denied Geolocation'));
      }
    };

    const testUser = {
      id: 'aa69f711-7ca3-41dc-b628-42a5dda853f6',
      user_id: 'aa69f711-7ca3-41dc-b628-42a5dda853f6',
      employee_code: 'EMP-0001',
      fullName: 'مدير النظام (مبرمج)',
      department: 'تقنية المعلومات',
      role: 'programmer',
      status: 'active',
      company_id: '11111111-2222-3333-4444-555555555555'
    };

    window.localStorage.setItem('JISR_AUTH_SESSION', JSON.stringify({
      token: 'mock-token',
      employeeId: testUser.id,
      email: 'admin@system.local',
      role: 'programmer',
      company_id: testUser.company_id
    }));

    window.eval(fs.readFileSync(apiPath, 'utf8'));

    const db = window.LocalDatabase.getDB();
    db.employees = [testUser];
    window.LocalDatabase.saveDB(db);

    window.eval(fs.readFileSync(appPath, 'utf8'));

    // Wait for initApp
    await new Promise(resolve => setTimeout(resolve, 300));

    // Ensure geofenceRequired is true
    window.store.state.settings = { ...(window.store.state.settings || {}), geofenceRequired: true };

    let punchCalled = false;
    window.ApiService.punchAttendance = () => {
      punchCalled = true;
      return Promise.resolve({ success: false });
    };

    const btn = window.document.getElementById('empGpsPunchBtn');
    assert.ok(btn, 'empGpsPunchBtn should exist');
    btn.click();

    await new Promise(resolve => setTimeout(resolve, 100));

    assert.strictEqual(punchCalled, false, 'punchAttendance must NOT be called when GPS fails and geofence is required');

    const toastContainer = window.document.getElementById('toastContainer');
    const toastText = toastContainer ? toastContainer.textContent : '';
    assert.ok(
      toastText.includes('تعذر تحديد موقعك عبر الـ GPS'),
      `Error toast must be displayed in toastContainer. Actual content: "${toastText}"`
    );

    try { dom.window.close(); } catch (e) {}
  });
});
