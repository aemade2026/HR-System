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

    const db = window.LocalDatabase.getDB();
    if (!Array.isArray(db.employees) || db.employees.length === 0) {
      db.employees = [{
        id: 'aa69f711-7ca3-41dc-b628-42a5dda853f6',
        user_id: 'aa69f711-7ca3-41dc-b628-42a5dda853f6',
        employee_code: 'EMP-0001',
        fullName: 'مدير النظام (مبرمج)',
        department: 'تقنية المعلومات',
        jobTitle: 'مبرمج نظام',
        role: 'programmer',
        status: 'active',
        company_id: '11111111-2222-3333-4444-555555555555'
      }];
      window.LocalDatabase.saveDB(db);
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

  it('7. اختبار تعديل وحفظ سجل حضور يدوي لموظف بمعرف UUID ومزامنة المقاييس الرقمية في Supabase', async () => {
    let capturedUpsert = null;
    let capturedOptions = null;
    const testEmployeeUUID = '99999999-8888-7777-6666-555555555555';
    const testAttendanceUUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

    const mockSupabaseClient = {
      from(table) {
        return {
          select(cols) {
            return {
              eq(col, val) {
                return {
                  eq(col2, val2) {
                    return {
                      maybeSingle: async () => {
                        if (table === 'employees' && (val === testEmployeeUUID || val2 === testEmployeeUUID)) {
                          return {
                            data: {
                              id: testEmployeeUUID,
                              company_id: '11111111-2222-3333-4444-555555555555',
                              employee_code: 'EMP-0001',
                              first_name: 'أحمد',
                              last_name: 'عماد',
                              email: 'ahmed@example.com',
                              role: 'employee',
                              status: 'active',
                              department: 'تقنية المعلومات'
                            },
                            error: null
                          };
                        }
                        return { data: null, error: null };
                      }
                    };
                  },
                  maybeSingle: async () => {
                    if (table === 'employees' && val === testEmployeeUUID) {
                      return {
                        data: {
                          id: testEmployeeUUID,
                          company_id: '11111111-2222-3333-4444-555555555555',
                          employee_code: 'EMP-0001',
                          first_name: 'أحمد',
                          last_name: 'عماد',
                          email: 'ahmed@example.com',
                          role: 'employee',
                          status: 'active',
                          department: 'تقنية المعلومات'
                        },
                        error: null
                      };
                    }
                    return { data: null, error: null };
                  }
                };
              }
            };
          },
          upsert(payload, options) {
            capturedUpsert = payload;
            capturedOptions = options;
            return {
              select() {
                return {
                  single: async () => ({
                    data: {
                      id: testAttendanceUUID,
                      ...payload[0]
                    },
                    error: null
                  })
                };
              }
            };
          }
        };
      }
    };

    const { window } = createTestEnvironment(mockSupabaseClient);

    const payload = {
      id: testAttendanceUUID,
      employeeId: testEmployeeUUID,
      date: '2026-11-21',
      checkIn: '08:30:00',
      checkOut: '17:00:00',
      lateMinutes: 30,
      earlyLeaveMinutes: 10,
      overtimeHours: 1.5,
      notes: 'تعديل حركة حضور معتمد'
    };

    const res = await window.ApiService.saveManualAttendance(payload);

    assert.strictEqual(res.success, true, 'saveManualAttendance should succeed for UUID employee');
    assert.strictEqual(res.data.id, testAttendanceUUID, 'Record ID should match UUID');
    assert.strictEqual(res.data.employeeId, testEmployeeUUID, 'Employee ID should match UUID');
    assert.strictEqual(res.data.lateMinutes, 30, 'Late minutes should match');
    assert.strictEqual(res.data.earlyLeaveMinutes, 10, 'Early leave minutes should match');
    assert.strictEqual(res.data.overtimeHours, 1.5, 'Overtime hours should match');
    assert.strictEqual(res.data.actualHours, 8.5, 'Calculated actual hours should be 8.5');

    assert.ok(capturedUpsert, 'Supabase upsert must be called');
    assert.strictEqual(capturedUpsert[0].id, testAttendanceUUID, 'Supabase upsert must include attendance UUID');
    assert.strictEqual(capturedUpsert[0].employee_id, testEmployeeUUID, 'Supabase upsert must include employee UUID');
    assert.strictEqual(capturedUpsert[0].late_minutes, 30, 'Supabase late_minutes must be numeric 30');
    assert.strictEqual(capturedUpsert[0].early_leave_minutes, 10, 'Supabase early_leave_minutes must be numeric 10');
    assert.strictEqual(capturedUpsert[0].overtime_hours, 1.5, 'Supabase overtime_hours must be numeric 1.5');
    assert.strictEqual(capturedUpsert[0].actual_hours, 8.5, 'Supabase actual_hours must be numeric 8.5');
    assert.strictEqual(capturedOptions?.onConflict, 'company_id,employee_id,date', 'Upsert onConflict constraint must be company_id,employee_id,date');
  });

  it('8. اختبار تسجيل الدخول بكود الموظف (EMP-0001) عبر دالة resolve_login_email في Supabase', async () => {
    let rpcCalledWith = null;
    let authCalledWith = null;
    let employeeQueryUserId = null;
    let rpcResponse = { status: 'ok', email: 'emp0001@example.com' };

    const mockSupabase = {
      rpc(fnName, params) {
        rpcCalledWith = { fnName, params };
        return Promise.resolve({ data: rpcResponse, error: null });
      },
      auth: {
        async signInWithPassword({ email, password }) {
          authCalledWith = { email, password };
          if (email === 'emp0001@example.com' && password === 'ValidPass123!') {
            return {
              data: {
                user: { id: 'user-uuid-emp-0001', email: 'emp0001@example.com' },
                session: { access_token: 'fake-token' }
              },
              error: null
            };
          }
          return { data: { user: null }, error: { message: 'Invalid login credentials' } };
        },
        async signOut() {
          return { error: null };
        }
      },
      from(table) {
        return {
          select(cols) {
            return {
              eq(colName, val) {
                if (colName === 'user_id') {
                  employeeQueryUserId = val;
                }
                return {
                  async single() {
                    if (table === 'employees' && val === 'user-uuid-emp-0001') {
                      return {
                        data: {
                          id: 'aa69f711-7ca3-41dc-b628-42a5dda853f6',
                          company_id: '11111111-2222-3333-4444-555555555555',
                          user_id: 'user-uuid-emp-0001',
                          employee_code: 'EMP-0001',
                          first_name: 'أحمد',
                          last_name: 'عماد',
                          email: 'emp0001@example.com',
                          role: 'programmer',
                          status: 'active'
                        },
                        error: null
                      };
                    }
                    return { data: null, error: { message: 'Not found' } };
                  }
                };
              }
            };
          }
        };
      }
    };

    const { window } = createTestEnvironment(mockSupabase);

    // الحالة 1: نجاح تسجيل الدخول عبر الكود وتوجيهه للبريد المسترجع
    const resSuccess = await window.ApiService.loginWithCodeOrEmail('EMP-0001', 'ValidPass123!');
    assert.strictEqual(resSuccess.success, true, 'Login with code should succeed');
    assert.strictEqual(rpcCalledWith.fnName, 'resolve_login_email', 'Should call resolve_login_email RPC');
    assert.strictEqual(rpcCalledWith.params.p_identifier, 'EMP-0001', 'Should pass code to RPC');
    assert.strictEqual(authCalledWith.email, 'emp0001@example.com', 'Auth should be called with resolved email');
    assert.strictEqual(employeeQueryUserId, 'user-uuid-emp-0001', 'Employee should be fetched by user_id');
    assert.strictEqual(resSuccess.data.user.employee_code, 'EMP-0001', 'User employee_code should match');
    assert.strictEqual(resSuccess.data.role, 'programmer', 'User role should match');

    // الحالة 2: الكود مكرر في أكثر من شركة (ambiguous)
    rpcResponse = { status: 'ambiguous' };
    const resAmbiguous = await window.ApiService.loginWithEmailPassword('EMP-0001', 'ValidPass123!');
    assert.strictEqual(resAmbiguous.success, false, 'Ambiguous code should fail');
    assert.match(resAmbiguous.message, /هذا الكود مستخدم في أكثر من شركة/);

    // الحالة 3: الكود غير موجود (not_found)
    rpcResponse = { status: 'not_found' };
    const resNotFound = await window.ApiService.loginWithEmailPassword('EMP-9999', 'ValidPass123!');
    assert.strictEqual(resNotFound.success, false, 'Not found code should fail');
    assert.match(resNotFound.message, /كود الموظف أو كلمة المرور غير صحيحة/);
  });

  it('9. اختبار تعديل موظف: حفظ employee_code وعدم إرسال pin = "undefined" عند ترك الرمز فارغاً', async () => {
    let capturedUpdates = [];
    const testEmployeeUUID = '33333333-4444-5555-6666-777777777777';

    const mockSupabase = {
      from(table) {
        return {
          select(cols) {
            return {
              eq() {
                return {
                  async single() {
                    return { data: null, error: null };
                  }
                };
              },
              ilike(col, val) {
                return {
                  eq(cCol, cVal) {
                    return Promise.resolve({ data: [], error: null });
                  }
                };
              }
            };
          },
          update(payload) {
            capturedUpdates.push(payload);
            return {
              eq(col, val) {
                return {
                  eq(col2, val2) {
                    return Promise.resolve({ data: [{ id: testEmployeeUUID, ...payload }], error: null });
                  }
                };
              }
            };
          }
        };
      }
    };

    const { window } = createTestEnvironment(mockSupabase);

    // إضافة موظف مبدئي في LocalDatabase
    const db = window.LocalDatabase.getDB();
    db.employees = db.employees || [];
    db.employees.push({
      id: testEmployeeUUID,
      company_id: '11111111-2222-3333-4444-555555555555',
      employee_code: 'EMP-0005',
      fullName: 'سعيد محمد',
      role: 'employee',
      status: 'active',
      department: 'تقنية المعلومات',
      pin: '123456'
    });
    window.LocalDatabase.saveDB(db);

    // 1. اختبار تعديل الموظف مع ترك الرمز فارغاً (أو undefined أو نص "undefined")
    const updatePayload1 = {
      fullName: 'سعيد محمد علي',
      employee_code: 'EMP-0010',
      pin: 'undefined', // محاكاة قيمة undefined المحولة لنص
      jobTitle: 'مهندس برمجيات'
    };

    const res1 = await window.ApiService.updateEmployee(testEmployeeUUID, updatePayload1);
    assert.strictEqual(res1.success, true, 'updateEmployee should succeed');
    assert.strictEqual(capturedUpdates.length, 1, 'Supabase update should be called once');

    // التحقق الصارم: عمود pin يجب ألا يرسل نهائياً إلى Supabase، وممنوع إرسال "undefined"
    assert.strictEqual(capturedUpdates[0].pin, undefined, 'PIN must NOT be sent to Supabase when undefined or invalid');
    assert.strictEqual(capturedUpdates[0].employee_code, 'EMP-0010', 'employee_code must be sent to Supabase');

    // 2. اختبار تعديل الموظف برمز PIN جديد وصالح (6 أرقام)
    const updatePayload2 = {
      pin: '654321'
    };

    const res2 = await window.ApiService.updateEmployee(testEmployeeUUID, updatePayload2);
    assert.strictEqual(res2.success, true, 'updateEmployee with valid PIN should succeed');
    assert.strictEqual(capturedUpdates.length, 2, 'Supabase update should be called twice');
    assert.strictEqual(capturedUpdates[1].pin, '654321', 'Valid 6-digit PIN must be sent to Supabase');

    // 3. اختبار getNextEmployeeId
    const nextCode = await window.ApiService.getNextEmployeeId();
    assert.ok(nextCode.startsWith('EMP-'), 'Next employee ID must start with EMP-');
  });

  it('10. اختبار حفظ واسترجاع الحضور بدون تقديم بالساعات (Timezone Shift) وعرض كود الموظف', async () => {
    let capturedUpsert = null;
    const testEmployeeUUID = '12345678-1234-1234-1234-123456789abc';
    const testAttendanceUUID = 'abcdef01-abcd-abcd-abcd-abcdef012345';

    const empData = {
      id: testEmployeeUUID,
      company_id: '11111111-2222-3333-4444-555555555555',
      employee_code: 'EMP-0001',
      first_name: 'أحمد',
      last_name: 'عماد',
      email: 'ahmed@example.com',
      role: 'employee',
      status: 'active',
      department: 'تقنية المعلومات'
    };

    const mockSupabaseClient = {
      from(table) {
        return {
          select(cols) {
            return {
              eq(col, val) {
                return {
                  eq(col2, val2) {
                    return {
                      maybeSingle: async () => {
                        if (table === 'employees' && (val === testEmployeeUUID || val2 === testEmployeeUUID)) {
                          return { data: empData, error: null };
                        }
                        return { data: null, error: null };
                      }
                    };
                  },
                  maybeSingle: async () => {
                    if (table === 'employees' && val === testEmployeeUUID) {
                      return { data: empData, error: null };
                    }
                    return { data: null, error: null };
                  }
                };
              }
            };
          },
          upsert(payload, options) {
            capturedUpsert = payload;
            return {
              select() {
                return {
                  single: async () => ({
                    data: {
                      id: testAttendanceUUID,
                      ...payload[0]
                    },
                    error: null
                  })
                };
              }
            };
          }
        };
      }
    };

    const { window } = createTestEnvironment(mockSupabaseClient);

    const db = window.LocalDatabase.getDB();
    db.employees = db.employees || [];
    db.employees.push({ ...empData, fullName: 'أحمد عماد' });
    window.LocalDatabase.saveDB(db);

    // 1. اختبار دوال التحويل الزمنية المباشرة
    const isoIn = window.ApiService.formatLocalTimeToIsoUtc('2026-11-24', '08:00');
    const isoOut = window.ApiService.formatLocalTimeToIsoUtc('2026-11-24', '16:00');
    assert.ok(isoIn.endsWith('Z'), 'ISO string must end with UTC Z designator');
    assert.strictEqual(window.ApiService.formatToCairoTime(isoIn), '08:00:00', 'Cairo check-in time must be preserved as exactly 08:00:00 without shift');
    assert.strictEqual(window.ApiService.formatToCairoTime(isoOut), '16:00:00', 'Cairo check-out time must be preserved as exactly 16:00:00 without shift');

    // 2. اختبار حفظ سجل الحضور اليدوي
    const payload = {
      id: testAttendanceUUID,
      employeeId: testEmployeeUUID,
      date: '2026-11-24',
      checkIn: '08:00:00',
      checkOut: '16:00:00',
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      overtimeHours: 0,
      notes: 'تعديل يدوي لاختبار فارق التوقيت'
    };

    const res = await window.ApiService.saveManualAttendance(payload);
    assert.strictEqual(res.success, true, 'saveManualAttendance must succeed');
    assert.strictEqual(res.data.checkIn, '08:00:00', 'Saved local checkIn must be 08:00:00');
    assert.strictEqual(res.data.checkOut, '16:00:00', 'Saved local checkOut must be 16:00:00');
    assert.strictEqual(res.data.actualHours, 8, '8 hours from 08:00 to 16:00');
    assert.strictEqual(res.data.employeeCode, 'EMP-0001', 'employeeCode must be EMP-0001');

    // 3. التحقق من payload المرسل إلى Supabase
    assert.ok(capturedUpsert && capturedUpsert.length > 0, 'Supabase upsert must be called');
    const sbRecord = capturedUpsert[0];
    assert.ok(sbRecord.check_in.endsWith('Z'), 'check_in sent to Supabase TIMESTAMPTZ must be ISO UTC ending with Z');
    assert.ok(sbRecord.check_out.endsWith('Z'), 'check_out sent to Supabase TIMESTAMPTZ must be ISO UTC ending with Z');

    // 4. تطبيع السجل القادم من Supabase
    const normalized = window.ApiService.normalizeAttendance(sbRecord, { [testEmployeeUUID]: empData });
    assert.strictEqual(normalized.checkIn, '08:00:00', 'Normalized checkIn must be 08:00:00');
    assert.strictEqual(normalized.checkOut, '16:00:00', 'Normalized checkOut must be 16:00:00');
    assert.strictEqual(normalized.employeeCode, 'EMP-0001', 'Normalized record must include employeeCode EMP-0001');
    assert.strictEqual(normalized.employee_code, 'EMP-0001', 'Normalized record must include employee_code EMP-0001');
  });

  it('11. اختبار تسجيل شركة جديدة بكلمة مرور بدلاً من رمز PIN واعتمادها وإنشاء الحساب', async () => {
    let capturedRpc = null;
    let capturedSignUp = null;

    const mockSupabase = {
      auth: {
        signUp: async (options) => {
          capturedSignUp = options;
          return {
            data: { user: { id: 'usr-manager-test-uuid', email: options.email } },
            error: null
          };
        }
      },
      rpc: (fn, params) => {
        capturedRpc = { fn, params };
        return Promise.resolve({ data: 'new-comp-uuid-999', error: null });
      },
      from: (table) => {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
              limit: () => Promise.resolve({ data: [], error: null }),
              order: () => Promise.resolve({ data: [], error: null })
            }),
            order: () => Promise.resolve({ data: [], error: null })
          }),
          update: (payload) => ({
            eq: () => Promise.resolve({ data: [payload], error: null })
          }),
          insert: (payload) => Promise.resolve({ data: payload, error: null })
        };
      }
    };

    const { window } = createTestEnvironment(mockSupabase);

    // 1. اختبار رفض كلمة مرور أقل من 6 خانات
    const invalidRes = await window.ApiService.registerNewTenant({
      companyName: 'شركة تجريبية قصيرة',
      managerName: 'مدير تجريبي',
      email: 'shortpass@example.com',
      password: '123'
    });
    assert.strictEqual(invalidRes.success, false, 'Password less than 6 chars must be rejected');

    // 2. اختبار تسجيل الشركة بكلمة مرور صالحة (6 خانات أو أكثر)
    const validTenantData = {
      companyName: 'شركة النور للحلول البرمجية',
      managerName: 'م. خالد أحمد',
      email: 'khaled@alnoor.com',
      phone: '01011223344',
      taxNumber: '123456789',
      password: 'StrongPassword2026'
    };

    const regRes = await window.ApiService.registerNewTenant(validTenantData);
    assert.strictEqual(regRes.success, true, 'Registration with valid password must succeed');
    assert.strictEqual(regRes.data.password, undefined, 'Password must not be stored in plaintext in tenant record');
    assert.strictEqual(regRes.data.status, 'pending', 'Status must be pending');

    // 3. التحقق من استدعاء Supabase Auth signUp بكلمة المرور
    assert.ok(capturedSignUp, 'Supabase Auth signUp should be called with password');
    assert.strictEqual(capturedSignUp.email, 'khaled@alnoor.com');
    assert.strictEqual(capturedSignUp.password, 'StrongPassword2026');

    // 4. التحقق من تمرير كلمة المرور إلى RPC
    assert.ok(capturedRpc, 'RPC register_new_tenant should be called');
    assert.strictEqual(capturedRpc.params.p_manager_pin, 'StrongPassword2026', 'Password should be passed as credential');

    // 5. التحقق من ظهور كلمة المرور كـ "محددة" في getAllTenants
    const tenantsRes = await window.ApiService.getAllTenants();
    assert.strictEqual(tenantsRes.success, true);
    const added = tenantsRes.data.find(t => t.email === 'khaled@alnoor.com');
    assert.ok(added, 'Added tenant must exist in tenants list');
    assert.strictEqual(added.password, undefined, 'Password must not be accessible in plaintext');
  });
});
