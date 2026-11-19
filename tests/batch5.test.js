const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('AE HR-SYSTEM Batch 5 Supabase Write Error Handling & Sync Tests', () => {
  const allIntervals = [];
  const allDoms = [];

  function createTestEnvironment(initialFailingTables = []) {
    const htmlPath = path.resolve(__dirname, '../index.html');
    const apiPath = path.resolve(__dirname, '../api.js');

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

    // Track toasts called in the window
    const toasts = [];
    window.__capturedToasts = toasts;

    // Dynamic list of tables that should fail
    const failingWriteTables = [...initialFailingTables];

    // Mock Supabase with configurable table failures
    const mockSupabase = {
      from: (tableName) => {
        const shouldFail = () => failingWriteTables.includes('*') || failingWriteTables.includes(tableName);
        const queryObj = {
          select: () => queryObj,
          insert: () => {
            if (shouldFail()) {
              return Promise.resolve({ data: null, error: { message: `Supabase RLS Error on insert into ${tableName}` } });
            }
            return Promise.resolve({ data: [{ id: 'mock-id' }], error: null });
          },
          upsert: () => {
            if (shouldFail()) {
              return Promise.resolve({ data: null, error: { message: `Supabase RLS Error on upsert into ${tableName}` } });
            }
            return Promise.resolve({ data: [{ id: 'mock-id' }], error: null });
          },
          update: () => {
            if (shouldFail()) {
              const p = Promise.resolve({ data: null, error: { message: `Supabase RLS Error on update into ${tableName}` } });
              p.eq = () => p;
              p.neq = () => p;
              p.or = () => p;
              return p;
            }
            const p = Promise.resolve({ data: [{ id: 'mock-id' }], error: null });
            p.eq = () => p;
            p.neq = () => p;
            p.or = () => p;
            return p;
          },
          delete: () => {
            if (shouldFail()) {
              const p = Promise.resolve({ data: null, error: { message: `Supabase RLS Error on delete from ${tableName}` } });
              p.eq = () => p;
              p.neq = () => p;
              p.or = () => p;
              return p;
            }
            const p = Promise.resolve({ data: [], error: null });
            p.eq = () => p;
            p.neq = () => p;
            p.or = () => p;
            return p;
          },
          eq: () => queryObj,
          neq: () => queryObj,
          or: () => queryObj,
          order: () => queryObj,
          range: () => queryObj,
          gte: () => queryObj,
          gt: () => queryObj,
          lte: () => queryObj,
          lt: () => queryObj,
          in: () => queryObj,
          is: () => queryObj,
          like: () => queryObj,
          ilike: () => queryObj,
          limit: () => queryObj,
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null })
        };
        return queryObj;
      },
      auth: {
        signOut: () => Promise.resolve()
      }
    };

    window.supabase = { createClient: () => mockSupabase };

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

    return { window, dom, mockSupabase, failingWriteTables, toasts };
  }

  after(() => {
    allIntervals.forEach(({ window, id }) => {
      try { window.clearInterval(id); } catch (e) {}
    });
    allDoms.forEach((dom) => {
      try { dom.window.close(); } catch (e) {}
    });
  });

  it('1. sbWrite helper should intercept { error }, log it, show warning toast, mark pendingSync, and return success: false', async () => {
    const { window, toasts } = createTestEnvironment();
    window.showToast = (msg, type) => {
      toasts.push({ msg, type });
    };

    const targetRecord = { id: 'REQ-101', name: 'طلب تجريبي' };
    const failingPromise = Promise.resolve({
      data: null,
      error: { message: 'Database RLS policy violation' }
    });

    const res = await window.ApiService.sbWrite(failingPromise, 'اختبار كتابة سحابية', {
      table: 'requests',
      id: 'REQ-101',
      record: targetRecord,
      action: 'insert'
    });

    assert.strictEqual(res.success, false, 'sbWrite should return success: false when Supabase returns an error');
    assert.strictEqual(res.error.message, 'Database RLS policy violation');
    assert.strictEqual(targetRecord.pendingSync, true, 'sbWrite should mark target record with pendingSync: true');

    // Verify warning toast
    assert.ok(toasts.some(t => t.type === 'warning' && t.msg.includes('تعذر الحفظ بالسحابة')), 'sbWrite should display a warning toast in Arabic');

    // Verify queued in syncQueue
    const syncQueue = window.LocalDatabase.getSyncQueue();
    assert.ok(syncQueue.some(q => q.id === 'REQ-101' && q.table === 'requests'), 'Item should be queued in LocalDatabase syncQueue');
  });

  it('2. createRequest when Supabase write fails should return success: false, pendingSync: true, and save locally', async () => {
    const { window, toasts } = createTestEnvironment(['requests']);
    window.showToast = (msg, type) => {
      toasts.push({ msg, type });
    };

    const res = await window.ApiService.createRequest({
      employeeId: 'aa69f711-7ca3-41dc-b628-42a5dda853f6',
      type: 'annual_leave',
      daysCount: 3,
      startDate: '2026-11-25',
      endDate: '2026-11-28',
      reason: 'إجازة عائلية'
    });

    assert.strictEqual(res.success, false, 'createRequest should return success: false when Supabase write fails');
    assert.strictEqual(res.pendingSync, true, 'res.pendingSync must be true');

    // Check LocalDatabase
    const db = window.LocalDatabase.getDB();
    const savedReq = (db.requests || []).find(r => r.reason === 'إجازة عائلية');
    assert.ok(savedReq, 'Request must be saved in LocalDatabase');
    assert.strictEqual(savedReq.pendingSync, true, 'Local record must have pendingSync: true');

    // Check syncQueue
    const syncQueue = window.LocalDatabase.getSyncQueue();
    assert.ok(syncQueue.some(q => q.table === 'requests' && q.payload && q.payload.details && q.payload.details.reason === 'إجازة عائلية'));
  });

  it('3. createEmployee and punchAttendance when Supabase write fails should return success: false with pendingSync: true', async () => {
    const { window, toasts } = createTestEnvironment(['employees', 'attendance']);
    window.showToast = (msg, type) => {
      toasts.push({ msg, type });
    };

    // Test createEmployee
    const empRes = await window.ApiService.createEmployee({
      fullName: 'أحمد علي حسن',
      email: 'ahmed.ali.sync@test.com',
      role: 'employee',
      department: 'العمليات والتشغيل',
      baseSalary: 6000,
      pin: '887766'
    });

    assert.strictEqual(empRes.success, false, 'createEmployee should return success: false when Supabase fails');
    assert.strictEqual(empRes.pendingSync, true, 'empRes.pendingSync must be true');

    const db = window.LocalDatabase.getDB();
    const savedEmp = (db.employees || []).find(e => e.email === 'ahmed.ali.sync@test.com');
    assert.ok(savedEmp, 'Employee must be saved locally');
    assert.strictEqual(savedEmp.pendingSync, true, 'Local employee record must have pendingSync: true');

    // Test punchAttendance
    const attRes = await window.ApiService.punchAttendance({
      employeeId: savedEmp.id,
      location_coords: { lat: 30.044420, lng: 31.235810, accuracy: 5 }
    });

    assert.strictEqual(attRes.success, false, 'punchAttendance should return success: false when Supabase fails');
    assert.strictEqual(attRes.pendingSync, true, 'attRes.pendingSync must be true');

    const freshDb = window.LocalDatabase.getDB();
    const savedAtt = (freshDb.attendance || []).find(a => a.employeeId === savedEmp.id);
    assert.ok(savedAtt, 'Attendance must be saved locally');
    assert.strictEqual(savedAtt.pendingSync, true, 'Local attendance record must have pendingSync: true');
  });

  it('4. UI Integration: when Supabase write fails, the UI must NOT display success', async () => {
    const { window } = createTestEnvironment(['requests']);
    const appPath = path.resolve(__dirname, '../app.js');

    const capturedToasts = [];
    window.eval(fs.readFileSync(appPath, 'utf8'));

    // Wait for initApp async initialization
    await new Promise(resolve => setTimeout(resolve, 300));

    // Wrap showToast to capture calls
    const originalShowToast = window.showToast;
    window.showToast = (msg, type, duration) => {
      capturedToasts.push({ msg, type });
      if (typeof originalShowToast === 'function') {
        originalShowToast(msg, type, duration);
      }
    };

    const payload = {
      employeeId: 'aa69f711-7ca3-41dc-b628-42a5dda853f6',
      type: 'annual_leave',
      reason: 'طلب إجازة لاختبار فشل السحابة',
      startDate: '2026-11-20',
      endDate: '2026-11-22'
    };

    const res = await window.ApiService.createRequest(payload);
    if (res.success) {
      window.showToast('تم إرسال طلبك الإداري بنجاح إلى مدير الإدارة', 'success', 4000);
    } else {
      window.showToast(res.message || 'حدث خطأ أثناء تقديم الطلب', 'error');
    }

    // Verify UI did NOT display success toast
    const successToasts = capturedToasts.filter(t => t.type === 'success');
    assert.strictEqual(
      successToasts.length,
      0,
      `UI must NOT display a success toast when cloud write fails. Captured toasts: ${JSON.stringify(capturedToasts)}`
    );

    // Verify UI displayed warning or error toast
    const errorOrWarning = capturedToasts.filter(t => t.type === 'error' || t.type === 'warning');
    assert.ok(
      errorOrWarning.length > 0,
      `UI must display warning or error toast when cloud write fails. Captured toasts: ${JSON.stringify(capturedToasts)}`
    );
  });

  it('5. retryPendingSync replays pendingSync queue items when Supabase write succeeds', async () => {
    // Start with failing writes to populate syncQueue
    const { window, failingWriteTables } = createTestEnvironment(['requests']);

    await window.ApiService.createRequest({
      employeeId: 'aa69f711-7ca3-41dc-b628-42a5dda853f6',
      type: 'casual_leave',
      daysCount: 1,
      reason: 'طلب إعادة محاولة المزامنة'
    });

    const initialQueue = window.LocalDatabase.getSyncQueue();
    assert.ok(initialQueue.length > 0, 'Sync queue must contain at least one item');

    // Now restore Supabase connection (no tables failing)
    failingWriteTables.length = 0;

    // Run retryPendingSync
    const retryRes = await window.ApiService.retryPendingSync();
    assert.ok(retryRes.synced >= 1, 'retryPendingSync should have successfully synced queued items');

    const remainingQueue = window.LocalDatabase.getSyncQueue();
    assert.strictEqual(remainingQueue.length, 0, 'Sync queue should be completely empty after successful sync');
  });
});
