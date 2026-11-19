const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('AE HR-SYSTEM Batch 4 Bug Fixes Tests', () => {
  const allIntervals = [];

  function createTestEnvironment(mockSupabase = null) {
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

    if (mockSupabase) {
      window.supabase = { createClient: () => mockSupabase };
    }

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

    return { window, dom };
  }

  after(() => {
    allIntervals.forEach(({ window, id }) => {
      try { window.clearInterval(id); } catch (e) {}
    });
  });

  it('1. اختبار موقوف: ارفض الموظف الموقوف (status === "suspended") برسالة تطابق login', async () => {
    const { window } = createTestEnvironment();
    const db = window.LocalDatabase.getDB();
    if (!Array.isArray(db.employees)) db.employees = [];

    const suspendedEmp = {
      id: 'EMP-SUSPENDED-01',
      employee_code: 'EMP-SUSP-01',
      fullName: 'موظف موقوف تجريبي',
      department: 'العمليات',
      status: 'suspended',
      role: 'employee',
      pin: '888999',
      company_id: '11111111-2222-3333-4444-555555555555'
    };
    db.employees.push(suspendedEmp);
    window.LocalDatabase.saveDB(db);

    const res = await window.ApiService.punchAttendance({
      employeeId: 'EMP-SUSPENDED-01',
      location_coords: { lat: 30.0444, lng: 31.2358 }
    });

    assert.strictEqual(res.success, false, 'Should reject punch for suspended employee');
    assert.strictEqual(res.message, 'تم إيقاف هذا الحساب، يرجى مراجعة إدارة الموارد البشرية');
  });

  it('2. اختبار الجيوفينس: رفض البصمة بدون إحداثيات أو بإحداثيات صفرية إلا إذا كان geofenceRequired=false', async () => {
    const { window } = createTestEnvironment();
    const db = window.LocalDatabase.getDB();
    if (!Array.isArray(db.employees)) db.employees = [];

    const testEmp = {
      id: 'EMP-GEO-01',
      employee_code: 'EMP-GEO-01',
      fullName: 'موظف اختبار الموقع',
      department: 'العمليات',
      status: 'active',
      role: 'employee',
      company_id: '11111111-2222-3333-4444-555555555555'
    };
    db.employees.push(testEmp);
    window.LocalDatabase.saveDB(db);

    // a. بدون location_coords
    const resNoCoords = await window.ApiService.punchAttendance({
      employeeId: 'EMP-GEO-01'
    });
    assert.strictEqual(resNoCoords.success, false, 'Should reject punch without coordinates');
    assert.ok(resNoCoords.message.includes('GPS') || resNoCoords.geofenceMissing, 'Error message should mention GPS requirement');

    // b. بإحداثيات صفرية lat=0, lng=0
    const resZeroCoords = await window.ApiService.punchAttendance({
      employeeId: 'EMP-GEO-01',
      location_coords: { lat: 0, lng: 0 }
    });
    assert.strictEqual(resZeroCoords.success, false, 'Should reject punch with lat/lng=0');

    // c. بإحداثيات غير رقمية
    const resInvalidCoords = await window.ApiService.punchAttendance({
      employeeId: 'EMP-GEO-01',
      location_coords: { lat: 'invalid', lng: 'coords' }
    });
    assert.strictEqual(resInvalidCoords.success, false, 'Should reject punch with non-numeric coordinates');

    // d. عند تعطيل الجيوفينس geofenceRequired=false يُقبل تسجيل الحضور بدون إحداثيات
    db.settings = db.settings || {};
    db.settings.geofenceRequired = false;
    window.LocalDatabase.saveDB(db);

    const resDisabledGeofence = await window.ApiService.punchAttendance({
      employeeId: 'EMP-GEO-01'
    });
    assert.strictEqual(resDisabledGeofence.success, true, 'Should allow punch when geofenceRequired is false');
  });

  it('3. اختبار تاريخ قديم: تجاهل input.date القادم من العميل واستخدام تاريخ اليوم بتوقيت Africa/Cairo', async () => {
    const { window } = createTestEnvironment();
    const db = window.LocalDatabase.getDB();
    if (!Array.isArray(db.employees)) db.employees = [];

    const testEmp = {
      id: 'EMP-DATE-01',
      employee_code: 'EMP-DATE-01',
      fullName: 'موظف اختبار التواريخ',
      department: 'العمليات',
      status: 'active',
      role: 'employee',
      company_id: '11111111-2222-3333-4444-555555555555'
    };
    db.employees.push(testEmp);
    window.LocalDatabase.saveDB(db);

    const cairoTodayStr = window.ApiService.getCairoDateString();

    const res = await window.ApiService.punchAttendance({
      employeeId: 'EMP-DATE-01',
      date: '2020-01-01', // Fake past date
      location_coords: { lat: 30.0444, lng: 31.2358 }
    });

    assert.strictEqual(res.success, true, 'Punch should succeed');
    assert.strictEqual(res.data.date, cairoTodayStr, 'Attendance record date must use current Cairo date, not input.date');
    assert.notStrictEqual(res.data.date, '2020-01-01', 'Must strictly ignore client input.date');
  });

  it('4. اختبار الوردية الليلية: قفل سجل اليوم السابق بدلاً من فتح سجل جديد بعد منتصف الليل', async () => {
    const { window } = createTestEnvironment();
    const db = window.LocalDatabase.getDB();
    if (!Array.isArray(db.employees)) db.employees = [];
    if (!Array.isArray(db.attendance)) db.attendance = [];

    const nightEmp = {
      id: 'EMP-NIGHT-01',
      employee_code: 'EMP-NIGHT-01',
      fullName: 'موظف الوردية الليلية',
      department: 'الأمن والحراسة',
      shiftStart: '22:00',
      shiftEnd: '06:00',
      status: 'active',
      role: 'employee',
      company_id: '11111111-2222-3333-4444-555555555555'
    };
    db.employees.push(nightEmp);

    const now = new Date();
    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = window.ApiService.getCairoDateString(yesterdayDate);
    const todayStr = window.ApiService.getCairoDateString(now);

    // سياق: الموظف سجّل حضور أمس الساعة 22:00 ولم يسجل انصراف بعد
    const yesterdayRecord = {
      id: `ATT-${yesterdayStr.replace(/-/g, '')}-EMP-NIGHT-01`,
      company_id: '11111111-2222-3333-4444-555555555555',
      employeeId: 'EMP-NIGHT-01',
      employeeName: 'موظف الوردية الليلية',
      department: 'الأمن والحراسة',
      date: yesterdayStr,
      checkIn: '22:00:00',
      checkOut: null,
      actualHours: 0,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      overtimeHours: 0,
      status: 'present',
      notes: 'تسجيل حضور البارحة'
    };
    db.attendance.push(yesterdayRecord);
    window.LocalDatabase.saveDB(db);

    // تسجيل بصمة الانصراف بعد منتصف الليل
    const res = await window.ApiService.punchAttendance({
      employeeId: 'EMP-NIGHT-01',
      location_coords: { lat: 30.0444, lng: 31.2358 }
    });

    assert.strictEqual(res.success, true, 'Punch should succeed');
    assert.strictEqual(res.punchType, 'check_out', 'Should detect open shift from yesterday and execute check_out');
    assert.strictEqual(res.data.date, yesterdayStr, 'Should close record belonging to yesterdayStr');
    assert.ok(res.data.checkOut, 'checkOut time should be populated');
    assert.ok(res.data.actualHours > 0, 'actualHours should be positive and calculated from checkIn to now');

    // التأكد من عدم فتح سجل حضور جديد لليوم
    const todayLogs = window.LocalDatabase.getDB().attendance.filter(a => a.employeeId === 'EMP-NIGHT-01' && a.date === todayStr);
    assert.strictEqual(todayLogs.length, 0, 'Must NOT open a new attendance record for today');
  });

  it('5. اختبار normalizeAttendance: تحويل أوقات UTC إلى توقيت القاهرة وحساب ساعات العمل من الـ timestamps الكاملة', () => {
    const { window } = createTestEnvironment();

    // 06:00 UTC = 08:00 بتوقيت القاهرة (UTC+2)
    // 14:30 UTC = 16:30 بتوقيت القاهرة (UTC+2)
    const att = {
      id: 'ATT-UTC-TEST',
      employee_id: 'EMP-001',
      date: '2026-11-20',
      check_in: '2026-11-20T06:00:00.000Z',
      check_out: '2026-11-20T14:30:00.000Z'
    };

    const normalized = window.ApiService.normalizeAttendance(att);
    assert.strictEqual(normalized.checkIn, '08:00:00', 'checkIn should be converted to Cairo time (08:00:00)');
    assert.strictEqual(normalized.checkOut, '16:30:00', 'checkOut should be converted to Cairo time (16:30:00)');
    assert.strictEqual(normalized.actualHours, 8.5, 'actualHours should be accurately calculated from timestamps (8.5 hrs)');
  });

  it('6. اختبار getAttendanceLogs في Supabase: تطبيق فلاتر month (gte/lt) و department واستخدام pagination (range)', async () => {
    let capturedCalls = [];
    let rangeCalls = [];

    // Mock supabaseClient
    const mockSupabaseClient = {
      from: (table) => {
        const queryState = { table, filters: {} };
        const builder = {
          select: (fields) => { queryState.fields = fields; return builder; },
          eq: (col, val) => { queryState.filters[col] = val; return builder; },
          order: (col, opts) => { queryState.order = { col, opts }; return builder; },
          gte: (col, val) => { queryState.gte = { col, val }; return builder; },
          lt: (col, val) => { queryState.lt = { col, val }; return builder; },
          in: (col, vals) => { queryState.in = { col, vals }; return builder; },
          range: async (from, to) => {
            rangeCalls.push({ from, to });
            capturedCalls.push({ ...queryState });
            if (from === 0) {
              // Return first page of 1000 items
              const page1 = Array.from({ length: 1000 }, (_, i) => ({
                id: `ATT-PG1-${i}`,
                employee_id: 'EMP-001',
                department: 'تقنية المعلومات',
                date: '2026-11-15',
                check_in: '2026-11-15T06:00:00.000Z',
                check_out: '2026-11-15T14:00:00.000Z',
                company_id: '11111111-2222-3333-4444-555555555555'
              }));
              return { data: page1, error: null };
            } else if (from === 1000) {
              // Return second page with 250 items (< 1000 so pagination terminates)
              const page2 = Array.from({ length: 250 }, (_, i) => ({
                id: `ATT-PG2-${i}`,
                employee_id: 'EMP-001',
                department: 'تقنية المعلومات',
                date: '2026-11-16',
                check_in: '2026-11-16T06:00:00.000Z',
                check_out: '2026-11-16T14:00:00.000Z',
                company_id: '11111111-2222-3333-4444-555555555555'
              }));
              return { data: page2, error: null };
            }
            return { data: [], error: null };
          }
        };
        return builder;
      }
    };

    const { window } = createTestEnvironment(mockSupabaseClient);

    const res = await window.ApiService.getAttendanceLogs({
      month: '2026-11',
      department: 'تقنية المعلومات'
    });

    assert.strictEqual(res.success, true, 'getAttendanceLogs should succeed');
    // Ensure month filter was applied with gte / lt
    assert.ok(capturedCalls.length > 0, 'Supabase query must be executed');
    assert.strictEqual(capturedCalls[0].gte?.col, 'date');
    assert.strictEqual(capturedCalls[0].gte?.val, '2026-11-01');
    assert.strictEqual(capturedCalls[0].lt?.col, 'date');
    assert.strictEqual(capturedCalls[0].lt?.val, '2026-12-01');

    // Ensure pagination range was called for both pages (0..999, 1000..1999)
    assert.strictEqual(rangeCalls.length, 2, 'Should paginate over 1000 records');
    assert.strictEqual(rangeCalls[0].from, 0);
    assert.strictEqual(rangeCalls[0].to, 999);
    assert.strictEqual(rangeCalls[1].from, 1000);
    assert.strictEqual(rangeCalls[1].to, 1999);
    assert.strictEqual(res.data.length, 1250, 'Total fetched records should combine all pages (1250 rows)');
  });
});
