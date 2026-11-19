const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('AE HR-SYSTEM Payroll Calculations and Attendance Tests (Batch 2)', () => {
  function createTestEnv() {
    const htmlPath = path.resolve(__dirname, '../index.html');
    const apiPath = path.resolve(__dirname, '../api.js');

    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, {
      url: 'http://localhost/',
      runScripts: 'outside-only',
      pretendToBeVisual: true
    });

    const { window } = dom;

    window.scrollTo = () => {};
    window.alert = () => {};
    window.AudioContext = class {
      createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
      createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
      get currentTime() { return 0; }
    };
    window.webkitAudioContext = window.AudioContext;

    // Load api.js only
    window.eval(fs.readFileSync(apiPath, 'utf8'));
    if (window.ApiService) {
      window.ApiService.simulateDelay = () => Promise.resolve();
    }

    return { window, dom };
  }

  it('اختبار سماح 0: إعداد gracePeriodMinutes = 0 يمنع تطبيق سماح الـ 15 دقيقة الافتراضي في الراتب و punchAttendance', async () => {
    const { window } = createTestEnv();
    const db = window.LocalDatabase.getDB();

    // Set gracePeriodMinutes to 0 explicitly
    db.settings.gracePeriodMinutes = 0;
    window.LocalDatabase.saveDB(db);

    const emp = db.employees[0];
    const companyId = window.ApiService.getCurrentCompanyId();

    // 1. Check punchAttendance behavior when gracePeriodMinutes = 0
    // Punch attendance 5 minutes after shiftStart (08:05 when shift is 08:00)
    const originalDateNow = Date.now;
    const testDate = new Date();
    testDate.setHours(8, 5, 0, 0);
    Date.now = () => testDate.getTime();

    try {
      const punchRes = await window.ApiService.punchAttendance({
        pin: emp.pin,
        coords: { latitude: db.settings.company_lat, longitude: db.settings.company_lng }
      });
      assert.strictEqual(punchRes.success, true);
      const todayStr = new Date().toISOString().split('T')[0];
      const attRecord = (window.LocalDatabase.getDB().attendance || []).find(a => a.employeeId === emp.id && a.date === todayStr);
      assert.ok(attRecord, 'Attendance record should be created');
      // With grace 0 and 5 min late, status MUST be 'late', NOT 'present'
      assert.strictEqual(attRecord.status, 'late', 'Status must be late when gracePeriodMinutes is 0 and employee is 5 min late');
    } finally {
      Date.now = originalDateNow;
    }

    // 2. Check calculateMonthlyPayroll late penalty with gracePeriodMinutes = 0
    // Record with 10 minutes late in 2026-10
    db.attendance.push({
      id: 'ATT-GRACE-TEST',
      company_id: companyId,
      employeeId: emp.id,
      employeeName: emp.fullName,
      date: '2026-10-05',
      checkIn: '08:10',
      lateMinutes: 10,
      earlyLeaveMinutes: 0,
      overtimeHours: 0,
      status: 'late'
    });
    window.LocalDatabase.saveDB(db);

    const payrollRes = await window.ApiService.calculateMonthlyPayroll('2026-10');
    assert.strictEqual(payrollRes.success, true);
    const slip = payrollRes.payrollReport.find(r => r.employee.id === emp.id);
    assert.ok(slip, 'Payroll slip should be found');
    assert.ok(slip.deductions.latePenalty > 0, 'Late penalty should be deducted when grace period is 0');
  });

  it('اختبار تأمين 0: موظف insurancePercent = 0 يجب ألا يخصم منه 11% افتراضياً', async () => {
    const { window } = createTestEnv();
    const db = window.LocalDatabase.getDB();
    const emp = db.employees[0];
    emp.insurancePercent = 0; // Explicitly set to 0%
    window.LocalDatabase.saveDB(db);

    const payrollRes = await window.ApiService.calculateMonthlyPayroll('2026-10');
    assert.strictEqual(payrollRes.success, true);
    const slip = payrollRes.payrollReport.find(r => r.employee.id === emp.id);
    assert.ok(slip, 'Payroll slip should be found');
    assert.strictEqual(slip.deductions.socialInsurance, 0, 'Social insurance deduction must be 0 when insurancePercent = 0');
  });

  it('اختبار يوم غياب: احتساب unexcusedAbsenceDays من سجلات الحضور بـ status=absent وخصمه باستخدام absencePenaltyMultiplier', async () => {
    const { window } = createTestEnv();
    const db = window.LocalDatabase.getDB();
    const emp = db.employees[0];
    const companyId = window.ApiService.getCurrentCompanyId();

    db.attendance.push({
      id: 'ATT-ABSENT-TEST',
      company_id: companyId,
      employeeId: emp.id,
      employeeName: emp.fullName,
      date: '2026-10-12',
      status: 'absent'
    });
    window.LocalDatabase.saveDB(db);

    const payrollRes = await window.ApiService.calculateMonthlyPayroll('2026-10');
    assert.strictEqual(payrollRes.success, true);
    const slip = payrollRes.payrollReport.find(r => r.employee.id === emp.id);
    assert.ok(slip, 'Payroll slip should be found');
    assert.strictEqual(slip.deductions.unexcusedAbsenceDays, 1, 'unexcusedAbsenceDays must be 1');
    const expectedDeduction = Number((1 * slip.rates.dailyRate * 1.0).toFixed(2));
    assert.strictEqual(slip.deductions.absenceDeduction, expectedDeduction, 'absenceDeduction must equal 1 * dailyRate * multiplier');
  });

  it('اختبار عمولة شهر آخر = 0: المبيعات المربوطة بشهر آخر لا تُحتسب كعمولة في شهر الراتب الحالي', async () => {
    const { window } = createTestEnv();
    const db = window.LocalDatabase.getDB();
    const emp = db.employees[0];

    // Set sales target and achieved for September (2026-09)
    emp.salesTarget = 10000;
    emp.salesAchieved = 15000;
    emp.commissionRate = 10;
    emp.salesMonth = '2026-09';
    window.LocalDatabase.saveDB(db);

    // Calculate payroll for October (2026-10)
    const payrollRes = await window.ApiService.calculateMonthlyPayroll('2026-10');
    assert.strictEqual(payrollRes.success, true);
    const slip = payrollRes.payrollReport.find(r => r.employee.id === emp.id);
    assert.ok(slip, 'Payroll slip should be found');
    assert.strictEqual(slip.earnings.salesCommission, 0, 'Sales commission for 2026-10 must be 0 when sales belong to 2026-09');
  });

  it('اختبار سلفة أكبر من الإجمالي: إرجاع netSalary الحقيقي السالب مع shortfall و warnings[]', async () => {
    const { window } = createTestEnv();
    const db = window.LocalDatabase.getDB();
    const emp = db.employees[0];
    const companyId = window.ApiService.getCurrentCompanyId();

    // Add a huge loan adjustment greater than gross earnings
    db.adjustments.push({
      id: 'ADJ-HUGE-LOAN',
      company_id: companyId,
      employeeId: emp.id,
      type: 'loan',
      amount: 100000, // 100k loan, base salary is 25k
      month: '2026-10',
      date: '2026-10-01'
    });
    window.LocalDatabase.saveDB(db);

    const payrollRes = await window.ApiService.calculateMonthlyPayroll('2026-10');
    assert.strictEqual(payrollRes.success, true);
    const slip = payrollRes.payrollReport.find(r => r.employee.id === emp.id);
    assert.ok(slip, 'Payroll slip should be found');
    assert.ok(slip.netSalary < 0, 'netSalary must be negative when deductions exceed gross');
    assert.ok(slip.shortfall > 0, 'shortfall must be greater than 0');
    assert.strictEqual(slip.shortfall, Math.abs(slip.netSalary), 'shortfall must equal absolute deficit');
    assert.ok(Array.isArray(slip.warnings) && slip.warnings.length > 0, 'warnings array must contain deficit alert');
  });

  it('اختبار التحقق من a.date قبل startsWith: لا ينهار عند وجود سجل حضور به date غير معرف أو غير نصي', async () => {
    const { window } = createTestEnv();
    const db = window.LocalDatabase.getDB();
    const emp = db.employees[0];
    const companyId = window.ApiService.getCurrentCompanyId();

    // Corrupted attendance records
    db.attendance.push(
      { id: 'ATT-NO-DATE', company_id: companyId, employeeId: emp.id, date: null },
      { id: 'ATT-UNDEF-DATE', company_id: companyId, employeeId: emp.id, date: undefined },
      { id: 'ATT-NUM-DATE', company_id: companyId, employeeId: emp.id, date: 12345 }
    );
    window.LocalDatabase.saveDB(db);

    // Should not throw TypeError
    const payrollRes = await window.ApiService.calculateMonthlyPayroll('2026-10');
    assert.strictEqual(payrollRes.success, true, 'calculateMonthlyPayroll should not crash with invalid a.date');
  });
});
