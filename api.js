/**
 * ============================================================================
 * نظام AE (HR-SYSTEM) للموارد البشرية والرواتب | AE (HR-SYSTEM)
 * ApiService & Local Mock Database Engine (Egyptian RBAC, GPS, Audit Logs & Requests Engine)
 * Integrated with Supabase Multi-Tenant Cloud Architecture
 * ============================================================================
 */

(function (window) {
  'use strict';

  // ==========================================================================
  // 1. إعدادات وبيانات الاتصال بـ Supabase
  // ==========================================================================
  const SUPABASE_URL = "https://kvcvjmbxfjpqwypcauaw.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2Y3ZqbWJ4ZmpwcXd5cGNhdWF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4Njc1OTQsImV4cCI6MjEwODQ0MzU5NH0.QURVE7XgPsURbgz7yv_bflH3C6ESiClo2WiLzGZoC8Y";

  // تهيئة عميل Supabase باستخدام let داخل النطاق المغلق لتفادي خطأ Redeclaration
  let supabase = null;
  if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
      console.warn('[Supabase Init Warning]:', e);
    }
  }
// Toggle between remote REST API and local browser mock database
const USE_BACKEND_API = false;
const BACKEND_BASE_URL = 'http://localhost:8000/api/v1';

// Initial Mock Dataset for First-Time Setup
const INITIAL_DATABASE = {
  settings: {
    company_id: '11111111-2222-3333-4444-555555555555',
    companyName: 'AE (HR-SYSTEM)',
    taxNumber: '492-710-853',
    commercialRegister: '184920 - مكتب استثمار القاهرة',
    currency: 'ج.م',
    workingDaysPerMonth: 30,
    workingHoursPerDay: 8,
    officialCheckIn: '08:00',
    officialCheckOut: '16:00',
    gracePeriodMinutes: 15,
    tardinessDeductionMode: 'tiered', // 'tiered' (شرائح قانون العمل المصري 12 لسنة 2003) or 'exact'
    overtimeRateMultiplier: 1.35, // مادة 85 من قانون العمل المصري (35% نهاراً)
    overtimeHolidayMultiplier: 2.0, // 200% أيام العطلات والراحات الرسمية
    absencePenaltyMultiplier: 1.0,
    socialInsurancePercent: 11, // قانون التأمينات الاجتماعية رقم 148 لسنة 2019 (11% حصة الموظف)
    attendanceKioskMode: 'both', // 'fingerprint', 'pin', or 'both'
    companyAddress: 'القاهرة، مصر',
    companyLocationUrl: 'https://maps.google.com/?q=30.044420,31.235810',
    company_lat: 30.044420,
    company_lng: 31.235810,
    allowed_radius_meters: 50
  },

  /* --------------------------------------------------------------------------
     1. إعدادات وهوية الشركة الرسمية (Company Settings)
     -------------------------------------------------------------------------- */
  company_settings: {
    company_id: '11111111-2222-3333-4444-555555555555',
    companyName: 'AE (HR-SYSTEM)',
    companyNameEn: 'AE (HR-SYSTEM)',
    logo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=180&auto=format&fit=crop&q=80',
    currency: 'ج.م',
    currencyCode: 'EGP',
    address: 'القاهرة، مصر',
    phone: '01008074308',
    email: 'aemade2016@gmail.com',
    taxNumber: '492-710-853',
    commercialRegister: '184920 - مكتب استثمار القاهرة',
    laborLawReference: 'قانون العمل المصري الموحد رقم 12 لسنة 2003 وتعديلاته ولائحته التنفيذية'
  },

  /* --------------------------------------------------------------------------
     1.2 جدول الشركات والمشتركين (Companies / Tenants Table - Multi-Tenant)
     -------------------------------------------------------------------------- */
  companies: [
    {
      id: '11111111-2222-3333-4444-555555555555',
      name: 'AE (HR-SYSTEM)',
      company_name: 'AE (HR-SYSTEM)',
      companyName: 'AE (HR-SYSTEM)',
      tax_number: '492-710-853',
      taxNumber: '492-710-853',
      manager_name: 'م. أحمد عماد',
      managerName: 'م. أحمد عماد',
      phone: '01008074308',
      email: 'aemade2016@gmail.com',
      pin: '050298',
      status: 'active',
      created_at: '2022-01-01T08:00:00Z',
      createdAt: '2022-01-01'
    }
  ],

  /* --------------------------------------------------------------------------
     1.5 جدول الأقسام الإدارية الرسمية (Departments Table)
     -------------------------------------------------------------------------- */
  departments: [
    {
      id: 'DEPT-101',
      name: 'تقنية المعلومات',
      nameEn: 'Information Technology',
      code: 'IT',
      description: 'هندسة البرمجيات، البنية التحتية، والدعم الفني والأمني',
      managerId: 'EMP-0001',
      managerName: 'م. أحمد عماد',
      createdAt: '2022-01-01'
    },
    {
      id: 'DEPT-102',
      name: 'الموارد البشرية',
      nameEn: 'Human Resources',
      code: 'HR',
      description: 'شؤون العاملين، التوظيف، التدريب، ومسير الرواتب',
      managerId: 'EMP-0001',
      managerName: 'م. أحمد عماد',
      createdAt: '2022-01-01'
    },
    {
      id: 'DEPT-103',
      name: 'الإدارة المالية',
      nameEn: 'Finance & Accounting',
      code: 'FIN',
      description: 'الحسابات العامة، الضرائب، الموازنات، والتقارير المالية',
      managerId: 'EMP-0001',
      managerName: 'م. أحمد عماد',
      createdAt: '2022-01-01'
    },
    {
      id: 'DEPT-104',
      name: 'المبيعات والتسويق',
      nameEn: 'Sales & Marketing',
      code: 'SALES',
      description: 'تطوير الأعمال، المبيعات الميدانية، والخطط التسويقية',
      managerId: 'EMP-0001',
      managerName: 'م. أحمد عماد',
      createdAt: '2022-01-01'
    },
    {
      id: 'DEPT-105',
      name: 'العمليات والتشغيل',
      nameEn: 'Operations & Logistics',
      code: 'OPS',
      description: 'إدارة سلاسل الإمداد، المشتريات، والجودة والدعم اللوجستي',
      managerId: 'EMP-0001',
      managerName: 'م. أحمد عماد',
      createdAt: '2022-01-01'
    }
  ],

  /* --------------------------------------------------------------------------
     1.6 مصفوفة صلاحيات الأقسام الإدارية (Department Permissions Matrix)
     -------------------------------------------------------------------------- */
  department_permissions: {
    'تقنية المعلومات': {
      view_dashboard: true,
      view_profile: true,
      punch_attendance: true,
      view_own_attendance: true,
      view_all_attendance: true,
      manage_attendance: true,
      export_attendance: true,
      view_own_payroll: true,
      view_all_payroll: false,
      manage_payroll: false,
      export_payroll: false,
      submit_requests: true,
      view_own_requests: true,
      view_all_requests: true,
      approve_requests: true,
      reject_requests: true,
      delete_requests: false,
      view_employees: true,
      manage_employees: true,
      approve_pending_employees: false,
      manage_employee_sales: false,
      manage_employee_salaries: false,
      view_audit_logs: true,
      export_audit_logs: true,
      clear_audit_logs: false,
      view_company_settings: true,
      edit_company_settings: false,
      view_system_settings: true,
      edit_system_settings: false,
      manage_role_permissions: false,
      access_developer_tools: true,
      reset_database: false
    },
    'الموارد البشرية': {
      view_dashboard: true,
      view_profile: true,
      punch_attendance: true,
      view_own_attendance: true,
      view_all_attendance: true,
      manage_attendance: true,
      export_attendance: true,
      view_own_payroll: true,
      view_all_payroll: true,
      manage_payroll: true,
      export_payroll: true,
      submit_requests: true,
      view_own_requests: true,
      view_all_requests: true,
      approve_requests: true,
      reject_requests: true,
      delete_requests: true,
      view_employees: true,
      manage_employees: true,
      approve_pending_employees: true,
      manage_employee_sales: true,
      manage_employee_salaries: true,
      view_audit_logs: true,
      export_audit_logs: true,
      clear_audit_logs: false,
      view_company_settings: true,
      edit_company_settings: true,
      view_system_settings: true,
      edit_system_settings: true,
      manage_role_permissions: false,
      access_developer_tools: false,
      reset_database: false
    },
    'الإدارة المالية': {
      view_dashboard: true,
      view_profile: true,
      punch_attendance: true,
      view_own_attendance: true,
      view_all_attendance: true,
      manage_attendance: false,
      export_attendance: true,
      view_own_payroll: true,
      view_all_payroll: true,
      manage_payroll: true,
      export_payroll: true,
      submit_requests: true,
      view_own_requests: true,
      view_all_requests: true,
      approve_requests: true,
      reject_requests: false,
      delete_requests: false,
      view_employees: true,
      manage_employees: false,
      approve_pending_employees: false,
      manage_employee_sales: true,
      manage_employee_salaries: true,
      view_audit_logs: true,
      export_audit_logs: true,
      clear_audit_logs: false,
      view_company_settings: true,
      edit_company_settings: true,
      view_system_settings: false,
      edit_system_settings: false,
      manage_role_permissions: false,
      access_developer_tools: false,
      reset_database: false
    },
    'المبيعات والتسويق': {
      view_dashboard: true,
      view_profile: true,
      punch_attendance: true,
      view_own_attendance: true,
      view_all_attendance: false,
      manage_attendance: false,
      export_attendance: false,
      view_own_payroll: true,
      view_all_payroll: false,
      manage_payroll: false,
      export_payroll: false,
      submit_requests: true,
      view_own_requests: true,
      view_all_requests: false,
      approve_requests: false,
      reject_requests: false,
      delete_requests: false,
      view_employees: true,
      manage_employees: false,
      approve_pending_employees: false,
      manage_employee_sales: true,
      manage_employee_salaries: false,
      view_audit_logs: false,
      export_audit_logs: false,
      clear_audit_logs: false,
      view_company_settings: true,
      edit_company_settings: false,
      view_system_settings: false,
      edit_system_settings: false,
      manage_role_permissions: false,
      access_developer_tools: false,
      reset_database: false
    },
    'العمليات والتشغيل': {
      view_dashboard: true,
      view_profile: true,
      punch_attendance: true,
      view_own_attendance: true,
      view_all_attendance: false,
      manage_attendance: false,
      export_attendance: false,
      view_own_payroll: true,
      view_all_payroll: false,
      manage_payroll: false,
      export_payroll: false,
      submit_requests: true,
      view_own_requests: true,
      view_all_requests: false,
      approve_requests: false,
      reject_requests: false,
      delete_requests: false,
      view_employees: true,
      manage_employees: false,
      approve_pending_employees: false,
      manage_employee_sales: false,
      manage_employee_salaries: false,
      view_audit_logs: false,
      export_audit_logs: false,
      clear_audit_logs: false,
      view_company_settings: true,
      edit_company_settings: false,
      view_system_settings: false,
      edit_system_settings: false,
      manage_role_permissions: false,
      access_developer_tools: false,
      reset_database: false
    }
  },

  /* --------------------------------------------------------------------------
     2. مصفوفة الصلاحيات التفصيلية (Role-Based Access Control Matrix)
     الرتب الأساسية: موظف (employee) - مدير (manager) - مبرمج (programmer)
     -------------------------------------------------------------------------- */
  role_permissions: {
    // رتبة الموظف (Employee Role)
    employee: {
      view_dashboard: true,
      view_profile: true,
      punch_attendance: true,
      view_own_attendance: true,
      view_all_attendance: false,
      manage_attendance: false,
      export_attendance: false,
      view_own_payroll: true,
      view_all_payroll: false,
      manage_payroll: false,
      export_payroll: false,
      submit_requests: true,
      view_own_requests: true,
      view_all_requests: false,
      approve_requests: false,
      reject_requests: false,
      delete_requests: false,
      view_employees: true,
      manage_employees: false,
      approve_pending_employees: false,
      manage_employee_sales: false,
      manage_employee_salaries: false,
      view_audit_logs: false,
      export_audit_logs: false,
      clear_audit_logs: false,
      view_company_settings: true,
      edit_company_settings: false,
      view_system_settings: false,
      edit_system_settings: false,
      manage_role_permissions: false,
      access_developer_tools: false,
      reset_database: false
    },
    // رتبة المدير (Manager / HR Director Role)
    manager: {
      view_dashboard: true,
      view_profile: true,
      punch_attendance: true,
      view_own_attendance: true,
      view_all_attendance: true,
      manage_attendance: true,
      export_attendance: true,
      view_own_payroll: true,
      view_all_payroll: true,
      manage_payroll: true,
      export_payroll: true,
      submit_requests: true,
      view_own_requests: true,
      view_all_requests: true,
      approve_requests: true,
      reject_requests: true,
      delete_requests: true,
      view_employees: true,
      manage_employees: true,
      approve_pending_employees: true,
      manage_employee_sales: true,
      manage_employee_salaries: true,
      view_audit_logs: true,
      export_audit_logs: true,
      clear_audit_logs: false,
      view_company_settings: true,
      edit_company_settings: true,
      view_system_settings: true,
      edit_system_settings: true,
      manage_role_permissions: true,
      access_developer_tools: false,
      reset_database: false
    },
    // رتبة المبرمج (Programmer / System Architect Role)
    programmer: {
      view_dashboard: true,
      view_profile: true,
      punch_attendance: true,
      view_own_attendance: true,
      view_all_attendance: true,
      manage_attendance: true,
      export_attendance: true,
      view_own_payroll: true,
      view_all_payroll: true,
      manage_payroll: true,
      export_payroll: true,
      submit_requests: true,
      view_own_requests: true,
      view_all_requests: true,
      approve_requests: true,
      reject_requests: true,
      delete_requests: true,
      view_employees: true,
      manage_employees: true,
      approve_pending_employees: true,
      manage_employee_sales: true,
      manage_employee_salaries: true,
      view_audit_logs: true,
      export_audit_logs: true,
      clear_audit_logs: true,
      view_company_settings: true,
      edit_company_settings: true,
      view_system_settings: true,
      edit_system_settings: true,
      manage_role_permissions: true,
      access_developer_tools: true,
      reset_database: true
    },
    // توافقية أسماء الرتب القديمة واللغة العربية (Aliases & Backwards Compatibility)
    admin: {
      view_dashboard: true,
      view_profile: true,
      punch_attendance: true,
      view_own_attendance: true,
      view_all_attendance: true,
      manage_attendance: true,
      export_attendance: true,
      view_own_payroll: true,
      view_all_payroll: true,
      manage_payroll: true,
      export_payroll: true,
      submit_requests: true,
      view_own_requests: true,
      view_all_requests: true,
      approve_requests: true,
      reject_requests: true,
      delete_requests: true,
      view_employees: true,
      manage_employees: true,
      approve_pending_employees: true,
      manage_employee_sales: true,
      manage_employee_salaries: true,
      view_audit_logs: true,
      export_audit_logs: true,
      clear_audit_logs: true,
      view_company_settings: true,
      edit_company_settings: true,
      view_system_settings: true,
      edit_system_settings: true,
      manage_role_permissions: true,
      access_developer_tools: true,
      reset_database: true
    },
    hr: {
      view_dashboard: true,
      view_profile: true,
      punch_attendance: true,
      view_own_attendance: true,
      view_all_attendance: true,
      manage_attendance: true,
      export_attendance: true,
      view_own_payroll: true,
      view_all_payroll: true,
      manage_payroll: true,
      export_payroll: true,
      submit_requests: true,
      view_own_requests: true,
      view_all_requests: true,
      approve_requests: true,
      reject_requests: true,
      delete_requests: true,
      view_employees: true,
      manage_employees: true,
      approve_pending_employees: true,
      manage_employee_sales: true,
      manage_employee_salaries: true,
      view_audit_logs: true,
      export_audit_logs: true,
      clear_audit_logs: false,
      view_company_settings: true,
      edit_company_settings: true,
      view_system_settings: true,
      edit_system_settings: true,
      manage_role_permissions: true,
      access_developer_tools: false,
      reset_database: false
    }
  },

  /* --------------------------------------------------------------------------
     3. طلبات الموظفين الرسمية (Requests Engine - Egyptian Labor Law)
     -------------------------------------------------------------------------- */
  requests: [],

  /* --------------------------------------------------------------------------
     4. سجل الرقابة والتدقيق الأمني التلقائي (Audit Logs)
     -------------------------------------------------------------------------- */
  audit_logs: [],

  /* --------------------------------------------------------------------------
     سجلات الموظفين الأصلية (Employees) - الحساب المعتمد للمبرمج الرئيسي فقط
     -------------------------------------------------------------------------- */
  employees: [
    {
      id: 'aa69f711-7ca3-41dc-b628-42a5dda853f6',
      employee_code: 'EMP-0001',
      fullName: 'م. أحمد عماد',
      first_name: 'Ahmed',
      last_name: 'Emad',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      department: 'تقنية المعلومات',
      jobTitle: 'مبرمج ومطور برمجيات (Super Admin)',
      hireDate: '2022-01-01',
      shiftStart: '08:00',
      shiftEnd: '16:00',
      pin: '050298',
      baseSalary: 25000,
      housingAllowance: 0,
      transportAllowance: 0,
      otherAllowances: 0,
      insurancePercent: 11,
      phone: '01008074308',
      email: 'aemade2016@gmail.com',
      role: 'programmer', // Super Admin / Programmer
      status: 'active',
      salesTarget: 0,
      salesAchieved: 0,
      commissionRate: 0,
      salaryStatus: 'paid',
      leaveBalance: 21,
      company_id: '11111111-2222-3333-4444-555555555555'
    }
  ],
  attendance: [],
  leaves: [],
  permissions: [],
  adjustments: []
};

// Seed realistic attendance records with GPS location coordinates
function generateSeedAttendance() {
  return [];
}

INITIAL_DATABASE.attendance = generateSeedAttendance();

// Pure mathematical rate helpers
function calculateDailyRate(baseSalary, workingDays = 30) {
  const days = Math.max(1, Number(workingDays) || 30);
  return Number((Number(baseSalary || 0) / days).toFixed(4));
}

function calculateHourlyRate(dailyRate, workingHours = 8) {
  const hours = Math.max(1, Number(workingHours) || 8);
  return Number((Number(dailyRate || 0) / hours).toFixed(4));
}

function calculateMinuteRate(hourlyRate) {
  return Number((Number(hourlyRate || 0) / 60).toFixed(6));
}

function calculateLatePenalty(lateMinutes, gracePeriod, mode, dailyRate, minuteRate) {
  if (lateMinutes <= gracePeriod) return 0;
  if (mode === 'exact') {
    return Number((lateMinutes * minuteRate).toFixed(2));
  }
  if (lateMinutes <= 30) {
    return Number((0.25 * dailyRate).toFixed(2));
  } else if (lateMinutes <= 60) {
    return Number((0.50 * dailyRate).toFixed(2));
  }
  return Number((1.00 * dailyRate).toFixed(2));
}

function cloneData(obj) {
  return typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
}

/**
 * ============================================================================
 * Audit & Interception Middleware (طبقة الرقابة والتدقيق الأمني التلقائي)
 * ============================================================================
 */
class AuditMiddleware {
  /**
   * استخراج بيانات المستخدم الفاعل (من قام بالحدث) من الجلسة النشطة
   */
  static getCurrentActor(customDb = null) {
    try {
      let raw = null;
      if (typeof localStorage !== 'undefined') raw = localStorage.getItem('JISR_AUTH_SESSION');
      if (!raw && typeof sessionStorage !== 'undefined') raw = sessionStorage.getItem('JISR_AUTH_SESSION');
      if (raw) {
        const session = JSON.parse(raw);
        if (session && session.employeeId) {
          const db = customDb || LocalDatabase.getDB();
          let emp = db?.employees?.find(e => e.id === session.employeeId || e.employee_code === session.employeeId);
          if (!emp && (session.employeeId === 'EMP-0001' || session.email === 'aemade2016@gmail.com')) {
            emp = db?.employees?.find(e => e.email === 'aemade2016@gmail.com');
          }
          if (emp) {
            return {
              id: emp.id,
              name: emp.fullName,
              role: emp.role || 'programmer',
              roleArabic: ApiService.getRoleArabicTitle(emp.role)
            };
          }
          return {
            id: session.employeeId,
            name: session.name || (session.role === 'programmer' ? 'م. أحمد عماد' : 'موظف'),
            role: session.role || 'programmer',
            roleArabic: ApiService.getRoleArabicTitle(session.role)
          };
        }
      }
    } catch (e) {
      // ignore
    }
    return {
      id: 'aa69f711-7ca3-41dc-b628-42a5dda853f6',
      employee_code: 'EMP-0001',
      name: 'م. أحمد عماد',
      role: 'programmer',
      roleArabic: 'مدير نظام / مبرمج'
    };
  }

  /**
   * تنسيق التاريخ والوقت المحلي المصري
   */
  static formatEgyptianDateTime(date = new Date()) {
    try {
      const d = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).format(d);
    } catch (e) {
      return new Date().toLocaleString('ar-EG');
    }
  }

  /**
   * تسجيل مباشر لحدث تدقيق في audit_logs
   */
  static log({ action, actionType = 'تعديل', target = 'system', targetId = null, details = '', performedBy = null, payload = null }) {
    try {
      const db = LocalDatabase.getDB();
      if (!Array.isArray(db.audit_logs)) {
        db.audit_logs = [];
      }

      const actor = performedBy || this.getCurrentActor(db);
      const now = new Date();
      const logEntry = {
        id: `AUD-${now.getTime()}-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: now.toISOString(),
        dateFormatted: this.formatEgyptianDateTime(now),
        performedBy: {
          id: actor.id || 'SYSTEM',
          name: actor.name || 'النظام الآلي',
          role: actor.role || 'system',
          roleArabic: actor.roleArabic || ApiService.getRoleArabicTitle(actor.role)
        },
        action: String(action || 'MUTATE_DATA').toUpperCase(),
        actionType: actionType, // 'إضافة', 'تعديل', 'حذف', 'تسجيل', 'اعتماد', 'رفض'
        target: target,
        targetId: targetId ? String(targetId) : null,
        details: String(details || 'تم إجراء عملية على قاعدة البيانات'),
        payloadSummary: payload ? this.sanitizePayload(payload) : null
      };

      // Add to start to keep latest logs at top
      db.audit_logs.unshift(logEntry);

      // Keep max 1000 logs in local storage to prevent browser quota overflow
      if (db.audit_logs.length > 1000) {
        db.audit_logs = db.audit_logs.slice(0, 1000);
      }

      LocalDatabase.saveDB(db);
      return logEntry;
    } catch (err) {
      console.warn('Audit logging failed (non-critical):', err);
      return null;
    }
  }

  /**
   * تنظيف البيانات وتجنب حفظ كلمات المرور أو الـ PIN في السجل الأمني
   */
  static sanitizePayload(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    try {
      const copy = { ...payload };
      if ('pin' in copy) copy.pin = '******';
      if ('password' in copy) copy.password = '******';
      return copy;
    } catch (e) {
      return null;
    }
  }

  /**
   * دالة اعتراضية Wrapper لتغليف أي دالة وتوثيق أي تعديل بيانات تلقائياً
   */
  static wrap(options, fn) {
    return async function(...args) {
      const result = await fn.apply(this, args);
      if (result && result.success !== false) {
        try {
          const targetId = typeof options.getTargetId === 'function' ? options.getTargetId(result, ...args) : (options.targetId || null);
          const details = typeof options.getDetails === 'function' ? options.getDetails(result, ...args) : (options.details || '');
          const actor = typeof options.getActor === 'function' ? options.getActor(result, ...args) : null;
          const payload = typeof options.getPayload === 'function' ? options.getPayload(result, ...args) : (args[0] || null);

          AuditMiddleware.log({
            action: options.action,
            actionType: options.actionType || 'تعديل',
            target: options.target,
            targetId: targetId,
            details: details,
            performedBy: actor,
            payload: payload
          });
        } catch (auditErr) {
          console.warn('AuditMiddleware interceptor error:', auditErr);
        }
      }
      return result;
    };
  }
}

/**
 * ============================================================================
 * Enterprise Local Database Engine with Automatic Schema Migration (EG RBAC V4)
 * ============================================================================
 */
class LocalDatabase {
  static #storageKey = 'JISR_HR_SYSTEM_DATABASE_PROG_V1';
  static #legacyKeys = [
    'JISR_HR_SYSTEM_DATABASE_EG_V5',
    'JISR_HR_SYSTEM_DATABASE_EG_V4',
    'JISR_HR_SYSTEM_DATABASE_EG_V3',
    'JISR_HR_SYSTEM_DATABASE_EG_V2',
    'JISR_HR_SYSTEM_DATABASE_V1'
  ];

  static getDB() {
    try {
      if (typeof localStorage !== 'undefined') {
        // تنظيف وحذف كافة قواعد البيانات التجريبية القديمة لضمان تصفير البيانات
        this.#legacyKeys.forEach(k => {
          try { localStorage.removeItem(k); } catch (e) {}
        });

        let data = localStorage.getItem(this.#storageKey);
        if (data) {
          const parsed = JSON.parse(data);
          let needsSave = false;

          if (!parsed.company_settings) {
            parsed.company_settings = cloneData(INITIAL_DATABASE.company_settings);
            needsSave = true;
          }
          if (!Array.isArray(parsed.companies) || parsed.companies.length === 0) {
            parsed.companies = cloneData(INITIAL_DATABASE.companies);
            needsSave = true;
          }
          if (!parsed.settings) {
            parsed.settings = cloneData(INITIAL_DATABASE.settings);
            needsSave = true;
          }
          if (!Array.isArray(parsed.departments) || parsed.departments.length === 0) {
            parsed.departments = cloneData(INITIAL_DATABASE.departments);
            needsSave = true;
          }
          if (!parsed.department_permissions) {
            parsed.department_permissions = cloneData(INITIAL_DATABASE.department_permissions);
            needsSave = true;
          }
          if (!parsed.role_permissions) {
            parsed.role_permissions = cloneData(INITIAL_DATABASE.role_permissions);
            needsSave = true;
          }

          // ترحيل وتحديث هوية الشركة الافتراضية إلى AE (HR-SYSTEM)
          if (parsed.company_settings && (parsed.company_settings.companyName === 'شركة النيل للتكنولوجيا' || parsed.company_settings.companyName === 'جسور' || !parsed.company_settings.companyName)) {
            parsed.company_settings.companyName = 'AE (HR-SYSTEM)';
            parsed.company_settings.companyNameEn = 'AE (HR-SYSTEM)';
            needsSave = true;
          }
          if (parsed.settings && (parsed.settings.companyName === 'شركة النيل للتكنولوجيا' || parsed.settings.companyName === 'جسور' || !parsed.settings.companyName)) {
            parsed.settings.companyName = 'AE (HR-SYSTEM)';
            needsSave = true;
          }
          if (Array.isArray(parsed.companies)) {
            const defComp = parsed.companies.find(c => c.id === '11111111-2222-3333-4444-555555555555');
            if (defComp && (defComp.name === 'شركة النيل للتكنولوجيا' || defComp.name === 'جسور')) {
              defComp.name = 'AE (HR-SYSTEM)';
              defComp.company_name = 'AE (HR-SYSTEM)';
              defComp.companyName = 'AE (HR-SYSTEM)';
              needsSave = true;
            }
          }

          // استعادة وضمان حماية حساب المبرمج الأصلي (aemade2016@gmail.com) كـ Super Admin دون مساس
          if (!Array.isArray(parsed.employees)) parsed.employees = [];

          let prog = parsed.employees.find(e => e.email === 'aemade2016@gmail.com' || e.id === 'aa69f711-7ca3-41dc-b628-42a5dda853f6');
          if (prog) {
            prog.id = 'aa69f711-7ca3-41dc-b628-42a5dda853f6';
            prog.employee_code = 'EMP-0001';
            prog.fullName = 'م. أحمد عماد';
            prog.first_name = 'Ahmed';
            prog.last_name = 'Emad';
            prog.email = 'aemade2016@gmail.com';
            prog.role = 'programmer';
            prog.department = 'تقنية المعلومات';
            prog.jobTitle = 'مبرمج ومطور برمجيات (Super Admin)';
            prog.status = 'active';
            prog.pin = '050298';
            prog.baseSalary = 25000;
            needsSave = true;
          } else {
            parsed.employees.unshift(cloneData(INITIAL_DATABASE.employees[0]));
            needsSave = true;
          }

          // التأكد من استقلالية حساب الموظف المعتمد "احمد عماد الدين" (EMP-1001) كموظف منفصل تماماً
          let cand = parsed.employees.find(e => e.email !== 'aemade2016@gmail.com' && (e.id === 'EMP-1001' || e.employee_code === 'EMP-1001' || e.fullName === 'احمد عماد الدين'));
          if (!cand) {
            parsed.employees.push({
              id: 'EMP-1001',
              employee_code: 'EMP-1001',
              company_id: '55555555-4444-3333-2222-111111111111',
              fullName: 'احمد عماد الدين',
              department: 'المبيعات والتسويق',
              jobTitle: 'أخصائي المبيعات والتسويق',
              phone: '01123245614',
              email: 'ahmed.emad.sales@company.com',
              role: 'employee',
              status: 'active',
              pin: '123456',
              baseSalary: 7500,
              housingAllowance: 1000,
              transportAllowance: 800,
              otherAllowances: 500,
              salesTarget: 15000,
              salesAchieved: 0,
              commissionRate: 3,
              salaryStatus: 'processing',
              leaveBalance: 21,
              hireDate: new Date().toISOString().split('T')[0]
            });
            needsSave = true;
          } else {
            // تثبيت بيانات الموظف المعتمد
            cand.id = 'EMP-1001';
            cand.employee_code = 'EMP-1001';
            cand.role = 'employee';
            cand.status = 'active';
            cand.department = 'المبيعات والتسويق';
            cand.jobTitle = cand.jobTitle || 'أخصائي المبيعات والتسويق';
            cand.baseSalary = cand.baseSalary || 7500;
          }

          // تصفير الجداول والعمليات الحسابية
          if (!Array.isArray(parsed.requests)) { parsed.requests = []; needsSave = true; }
          if (!Array.isArray(parsed.attendance)) { parsed.attendance = []; needsSave = true; }
          if (!Array.isArray(parsed.leaves)) { parsed.leaves = []; needsSave = true; }
          if (!Array.isArray(parsed.permissions)) { parsed.permissions = []; needsSave = true; }
          if (!Array.isArray(parsed.adjustments)) { parsed.adjustments = []; needsSave = true; }
          if (!Array.isArray(parsed.audit_logs)) { parsed.audit_logs = []; needsSave = true; }

          if (needsSave) {
            this.saveDB(parsed);
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('LocalStorage access warning, using in-memory dataset:', e);
    }
    const fresh = cloneData(INITIAL_DATABASE);
    this.saveDB(fresh);
    return fresh;
  }

  static saveDB(data) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.#storageKey, JSON.stringify(data));
      }
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  static resetDB() {
    try {
      this.#legacyKeys.forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.#storageKey);
      }
    } catch (e) {}
    const fresh = cloneData(INITIAL_DATABASE);
    this.saveDB(fresh);
    return fresh;
  }
}


/**
 * ============================================================================
 * Enterprise Multi-Tenant SaaS ApiService Layer (Supabase Engine + Local Fallback)
 * Full Egyptian RBAC, Auth, Real Geofencing (GPS) & Security Audit Engine
 * ============================================================================
 */
class ApiService {
  static AuditMiddleware = AuditMiddleware;

  static #createEnvelope(success, data, error = null, extra = {}) {
    return {
      success,
      data,
      error,
      message: error ?? (extra?.message ?? (success ? 'تم تنفيذ العملية بنجاح' : 'حدث خطأ في تنفيذ العملية')),
      timestamp: new Date().toISOString(),
      ...extra
    };
  }

  static #handleError(err, customMessage = 'فشل في معالجة طلب الـ API') {
    const message = err instanceof Error ? err.message : String(err ?? customMessage);
    return this.#createEnvelope(false, null, message, { message });
  }

  static async simulateDelay(ms = 60, signal = null) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        return reject(new DOMException('Aborted by caller', 'AbortError'));
      }
      const timer = setTimeout(() => {
        resolve();
      }, ms);
      signal?.addEventListener?.('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted by caller', 'AbortError'));
      }, { once: true });
    });
  }

  /* ==========================================================================
     RBAC & ROLE HELPER METHODS
     ========================================================================== */

  /**
   * الحصول على المسمى العربي الرسمي للرتبة
   */
  static getRoleArabicTitle(role) {
    const map = {
      admin: 'مدير نظام / مبرمج',
      programmer: 'مبرمج (Programmer)',
      manager: 'مدير (Manager)',
      hr: 'مسؤول موارد بشرية (HR)',
      employee: 'موظف (Employee)',
      'موظف': 'موظف (Employee)',
      'مدير': 'مدير (Manager)',
      'مبرمج': 'مبرمج (Programmer)'
    };
    return map[role] || 'موظف (Employee)';
  }

  /**
   * الحصول على الاسم العربي لنوع الطلب
   */
  static getRequestTypeName(type) {
    const map = {
      onboarding: 'طلب انضمام موظف جديد',
      annual_leave: 'إجازة اعتيادي',
      casual_leave: 'إجازة عارضة',
      sick_leave: 'إجازة مرضي',
      morning_delay: 'إذن تأخير',
      early_leave: 'إذن خروج',
      advance_salary: 'طلب سلفة مالية',
      salary_adjustment: 'تعديل راتب',
      complaint: 'شكوى',
      resignation: 'استقالة'
    };
    return map[type] || 'طلب إداري';
  }

  /**
   * فحص صلاحية معينة لرتبة معينة
   */
  static checkPermission(permissionKey, role = null) {
    try {
      const db = LocalDatabase.getDB();
      const activeRole = role || AuditMiddleware.getCurrentActor(db).role || 'employee';
      const perms = db.role_permissions || INITIAL_DATABASE.role_permissions;
      const normalized = (activeRole === 'admin') ? 'programmer' : (activeRole === 'hr' ? 'manager' : activeRole);
      const rolePerms = perms[activeRole] || perms[normalized] || perms.employee || {};
      return Boolean(rolePerms[permissionKey]);
    } catch (e) {
      return false;
    }
  }

  /* ==========================================================================
     TENANT CONTEXT & MULTI-TENANCY ISOLATION ENGINE
     ========================================================================== */

  /**
   * استرجاع معرف الشركة/المستأجر الحالي (company_id) من sessionStorage أو الجلسة النشطة
   * @returns {string} معرّف الشركة المستأجرة
   */
  static getCurrentCompanyId() {
    let companyId = null;
    if (typeof sessionStorage !== 'undefined') {
      companyId = sessionStorage.getItem('JISR_COMPANY_ID');
    }
    if (!companyId && typeof localStorage !== 'undefined') {
      companyId = localStorage.getItem('JISR_COMPANY_ID');
    }
    if (!companyId) {
      try {
        let raw = null;
        if (typeof sessionStorage !== 'undefined') raw = sessionStorage.getItem('JISR_AUTH_SESSION');
        if (!raw && typeof localStorage !== 'undefined') raw = localStorage.getItem('JISR_AUTH_SESSION');
        if (raw) {
          const session = JSON.parse(raw);
          companyId = session.company_id || session.companyId;
        }
      } catch (e) {}
    }
    if (!companyId) {
      try {
        const db = LocalDatabase.getDB();
        companyId = db.settings?.company_id || db.company_settings?.company_id || '11111111-2222-3333-4444-555555555555';
      } catch (e) {
        companyId = '11111111-2222-3333-4444-555555555555';
      }
    }
    return companyId;
  }

  /**
   * حفظ معرف الشركة الحالي في sessionStorage و localStorage
   * @param {string} companyId
   */
  static setCurrentCompanyId(companyId) {
    if (!companyId) return;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('JISR_COMPANY_ID', companyId);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('JISR_COMPANY_ID', companyId);
    }
  }

  /**
   * دالة مساعدة لحساب المسافة الجغرافية بالأمتار بين نقطتين (Haversine Formula)
   */
  static getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    if (lat1 === null || lat1 === undefined || lon1 === null || lon1 === undefined ||
        lat2 === null || lat2 === undefined || lon2 === null || lon2 === undefined) {
      return 0;
    }
    const R = 6371e3; // نصف قطر الأرض بالأمتار
    const φ1 = Number(lat1) * Math.PI / 180;
    const φ2 = Number(lat2) * Math.PI / 180;
    const Δφ = (Number(lat2) - Number(lat1)) * Math.PI / 180;
    const Δλ = (Number(lon2) - Number(lon1)) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  /**
   * تطبيع وتجهيز كائن الموظف للتوافق التام بين استجابات Supabase والواجهة الأمامية
   */
  static #normalizeEmployee(emp) {
    if (!emp) return null;
    const fullName = emp.fullName ||
      (`${emp.first_name || ''} ${emp.last_name || ''}`.trim()) ||
      emp.name ||
      emp.id;
    const isProg = emp.email === 'aemade2016@gmail.com' || emp.id === 'aa69f711-7ca3-41dc-b628-42a5dda853f6' || emp.employee_code === 'EMP-0001';
    const empCode = isProg ? 'EMP-0001' : (emp.employee_code || emp.employeeCode || (String(emp.id || '').startsWith('EMP-') ? emp.id : 'EMP-1001'));
    return {
      id: isProg ? 'aa69f711-7ca3-41dc-b628-42a5dda853f6' : (emp.id || emp.employee_code),
      employee_code: empCode,
      fullName: isProg ? 'م. أحمد عماد' : fullName,
      first_name: isProg ? 'Ahmed' : (emp.first_name || fullName.split(' ')[0] || ''),
      last_name: isProg ? 'Emad' : (emp.last_name || fullName.split(' ').slice(1).join(' ') || ''),
      avatar: emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      department: isProg ? 'تقنية المعلومات' : (emp.department || 'العمليات والتشغيل'),
      jobTitle: isProg ? 'مبرمج ومطور برمجيات (Super Admin)' : (emp.jobTitle || emp.job_title || 'موظف'),
      hireDate: emp.hireDate || emp.hire_date || new Date().toISOString().split('T')[0],
      shiftStart: emp.shiftStart || emp.shift_start || '08:00',
      shiftEnd: emp.shiftEnd || emp.shift_end || '16:00',
      pin: isProg ? '050298' : String(emp.pin || '').trim(),
      baseSalary: isProg ? 25000 : Number(emp.baseSalary ?? emp.salary ?? 7000),
      housingAllowance: Number(emp.housingAllowance ?? 1000),
      transportAllowance: Number(emp.transportAllowance ?? 800),
      otherAllowances: Number(emp.otherAllowances ?? 500),
      insurancePercent: Number(emp.insurancePercent ?? 11),
      phone: emp.phone || (isProg ? '01008074308' : ''),
      email: emp.email || (isProg ? 'aemade2016@gmail.com' : ''),
      role: isProg ? 'programmer' : (emp.role || 'employee'),
      status: isProg ? 'active' : (emp.status || 'active'),
      salesTarget: Number(emp.salesTarget ?? 0),
      salesAchieved: Number(emp.salesAchieved ?? 0),
      commissionRate: Number(emp.commissionRate ?? 0),
      salaryStatus: emp.salaryStatus || 'processing',
      leaveBalance: Number(emp.leaveBalance ?? 21),
      biometricEnrolled: emp.biometricEnrolled !== false,
      company_id: emp.company_id || ApiService.getCurrentCompanyId()
    };
  }

  /**
   * تحويل كائن الموظف إلى حقول جدول employees في Supabase
   */
  static #toSupabaseEmployee(empData, companyId) {
    const parts = (empData.fullName || '').trim().split(' ');
    const firstName = empData.firstName || empData.first_name || parts[0] || 'موظف';
    const lastName = empData.lastName || empData.last_name || parts.slice(1).join(' ') || '';
    const isUUID = empData.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(empData.id);
    const payload = {
      company_id: companyId,
      employee_code: empData.employee_code || empData.id,
      first_name: firstName,
      last_name: lastName,
      email: empData.email || null,
      phone: empData.phone || null,
      job_title: empData.jobTitle || empData.job_title || 'موظف',
      department: empData.department || 'العمليات والتشغيل',
      salary: Number(empData.baseSalary ?? empData.salary ?? 7000),
      role: empData.role || 'employee',
      status: empData.status || 'active',
      pin: empData.pin ? String(empData.pin).trim() : null,
      hire_date: empData.hireDate || empData.hire_date || new Date().toISOString().split('T')[0]
    };
    if (isUUID) {
      payload.id = empData.id;
    }
    return payload;
  }

  /**
   * تطبيع كائن الحضور والانصراف
   */
  static #normalizeAttendance(att, empMap = {}) {
    if (!att) return null;
    const emp = empMap[att.employee_id || att.employeeId] || {};
    return {
      id: att.id,
      employeeId: att.employee_id || att.employeeId,
      employeeName: att.employeeName || emp.fullName || att.employee_id,
      department: att.department || emp.department || '',
      date: att.date,
      checkIn: att.checkIn || (att.check_in ? (att.check_in.includes('T') ? att.check_in.split('T')[1].slice(0, 8) : att.check_in) : null),
      checkOut: att.checkOut || (att.check_out ? (att.check_out.includes('T') ? att.check_out.split('T')[1].slice(0, 8) : att.check_out) : null),
      actualHours: Number(att.actualHours ?? att.actual_hours ?? 0),
      lateMinutes: Number(att.lateMinutes ?? att.late_minutes ?? 0),
      earlyLeaveMinutes: Number(att.earlyLeaveMinutes ?? att.early_leave_minutes ?? 0),
      overtimeHours: Number(att.overtimeHours ?? att.overtime_hours ?? 0),
      status: att.status || 'present',
      location_coords: att.location_coords || {
        lat: att.check_in_lat || null,
        lng: att.check_in_lng || null
      },
      notes: att.notes || '',
      company_id: att.company_id || ApiService.getCurrentCompanyId()
    };
  }

  /**
   * تطبيع كائن الطلب
   */
  static #normalizeRequest(req, empMap = {}) {
    if (!req) return null;
    const emp = empMap[req.employee_id || req.employeeId] || {};
    const details = typeof req.details === 'object' && req.details !== null ? req.details : {};
    const type = req.type || req.request_type || details.type || 'annual_leave';
    const typeName = req.typeName || details.typeName || ApiService.getRequestTypeName(type);
    return {
      id: req.id,
      employeeId: req.employee_id || req.employeeId,
      employeeName: req.employeeName || details.employeeName || emp.fullName || req.employee_id,
      department: req.department || details.department || emp.department || '',
      type: type,
      typeName: typeName,
      title: req.title || details.title || `طلب ${typeName}`,
      reason: req.reason || details.reason || '',
      status: req.status || 'pending',
      startDate: req.startDate || details.startDate || req.start_date || null,
      endDate: req.endDate || details.endDate || req.end_date || null,
      daysCount: Number(req.daysCount ?? details.daysCount ?? 1),
      date: req.date || details.date || null,
      hours: req.hours ? Number(req.hours) : (details.hours ? Number(details.hours) : null),
      amount: req.amount ? Number(req.amount) : (details.amount ? Number(details.amount) : null),
      submittedAt: req.submittedAt || req.created_at || details.submittedAt || new Date().toISOString(),
      reviewedAt: req.reviewedAt || details.reviewedAt || null,
      reviewedBy: req.reviewed_by || req.reviewedBy || details.reviewedBy || null,
      reviewNotes: req.review_notes || req.reviewNotes || details.reviewNotes || '',
      manager_reply: req.manager_reply || req.review_notes || details.manager_reply || '',
      company_id: req.company_id || ApiService.getCurrentCompanyId()
    };
  }

  /**
   * تطبيع كائن الإجازة
   */
  static #normalizeLeave(l, empMap = {}) {
    if (!l) return null;
    const emp = empMap[l.employee_id || l.employeeId] || {};
    return {
      id: l.id,
      employeeId: l.employee_id || l.employeeId,
      employeeName: l.employeeName || emp.fullName || l.employee_id,
      department: l.department || emp.department || '',
      leaveType: l.leaveType || l.leave_type || 'annual',
      startDate: l.startDate || l.start_date,
      endDate: l.endDate || l.end_date,
      daysCount: Number(l.daysCount || l.days_count || 1),
      reason: l.reason || '',
      status: l.status || 'pending',
      approvedBy: l.approvedBy || l.reviewed_by || 'إدارة الموارد البشرية',
      createdAt: l.createdAt || l.created_at || new Date().toISOString().split('T')[0],
      company_id: l.company_id || ApiService.getCurrentCompanyId()
    };
  }

  /**
   * تطبيع كائن التسوية المالية
   */
  static #normalizeAdjustment(a, empMap = {}) {
    if (!a) return null;
    const emp = empMap[a.employee_id || a.employeeId] || {};
    const amount = Number(a.amount ?? a.value ?? 0);
    const date = a.date || a.effective_date || new Date().toISOString().split('T')[0];
    return {
      id: a.id,
      employeeId: a.employee_id || a.employeeId,
      employeeName: a.employeeName || emp.fullName || a.employee_id,
      type: a.type || a.adjustment_type || 'bonus',
      amount: amount,
      value: amount,
      date: date,
      month: a.month || date.slice(0, 7),
      description: a.description || a.notes || 'تسوية مالية',
      status: a.status || 'approved',
      company_id: a.company_id || ApiService.getCurrentCompanyId()
    };
  }

  /* ==========================================================================
     AUTHENTICATION & SESSION MANAGEMENT (RBAC + MULTI-TENANT)
     ========================================================================== */

  static async checkSession() { return this.getCurrentSession(); }

  static async getCurrentSession() {
    try {
      let raw = null;
      if (typeof sessionStorage !== 'undefined') raw = sessionStorage.getItem('JISR_AUTH_SESSION');
      if (!raw && typeof localStorage !== 'undefined') raw = localStorage.getItem('JISR_AUTH_SESSION');
      if (!raw) return this.#createEnvelope(false, null, 'لا توجد جلسة نشطة');

      const session = JSON.parse(raw);
      const companyId = session.company_id || this.getCurrentCompanyId();
      this.setCurrentCompanyId(companyId);

      let emp = null;

      // 1. استدعاء Supabase أولاً
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('company_id', companyId)
            .or(`id.eq.${session.employeeId},employee_code.eq.${session.employeeId}`)
            .maybeSingle();
          if (data && !error) {
            emp = this.#normalizeEmployee(data);
          }
        } catch (sbErr) {
          console.warn('[Supabase Session Check Fallback]:', sbErr);
        }
      }

      // 2. آلية Fallback على LocalDatabase
      if (!emp) {
        const db = LocalDatabase.getDB();
        const localEmp = (db.employees || []).find(e =>
          e.id === session.employeeId ||
          e.employee_code === session.employeeId
        );
        if (localEmp) {
          emp = cloneData(localEmp);
        } else if (session.email === 'aemade2016@gmail.com' || session.employeeId === 'EMP-0001' || session.employeeId === 'aa69f711-7ca3-41dc-b628-42a5dda853f6') {
          const prog = (db.employees || []).find(e => e.email === 'aemade2016@gmail.com');
          if (prog) emp = cloneData(prog);
        }
      }

      if (!emp) {
        if (typeof localStorage !== 'undefined') localStorage.removeItem('JISR_AUTH_SESSION');
        if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('JISR_AUTH_SESSION');
        return this.#createEnvelope(false, null, 'المستخدم المرتبط بهذه الجلسة غير موجود');
      }

      // حماية مطلقة: حساب المبرمج دائماً programmer
      if (emp.email === 'aemade2016@gmail.com' || emp.id === 'aa69f711-7ca3-41dc-b628-42a5dda853f6') {
        emp.role = 'programmer';
        emp.department = 'تقنية المعلومات';
        emp.jobTitle = 'مبرمج ومطور برمجيات (Super Admin)';
      }

      const db = LocalDatabase.getDB();
      const userRole = emp.role || 'employee';
      const normalizedRole = (userRole === 'admin') ? 'programmer' : (userRole === 'hr' ? 'manager' : userRole);
      const roleArabic = this.getRoleArabicTitle(userRole);
      const rolePermissions = db.role_permissions?.[userRole] || db.role_permissions?.[normalizedRole] || db.role_permissions?.employee || {};

      const responsePayload = {
        role: userRole,
        normalizedRole: normalizedRole,
        roleArabic: roleArabic,
        permissions: cloneData(rolePermissions),
        session: session,
        user: cloneData(emp),
        employee: cloneData(emp),
        companyId: companyId
      };

      return this.#createEnvelope(true, responsePayload, null, {
        ...responsePayload
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في التحقق من الجلسة');
    }
  }

  /**
   * دالة تسجيل الدخول الموحدة للنظام المصري (RBAC Login)
   * تقبل بصمة الإصبع أو رمز الـ PIN وتجلب company_id من Supabase وتحفظه بالجلسة
   */
  static async login(credential, rememberMe = true) {
    try {
      await this.simulateDelay(120);

      let cleanPin = null;
      let employeeId = null;
      let credentialEmail = null;
      let shouldRemember = rememberMe;

      if (typeof credential === 'object' && credential !== null) {
        if (credential.pin !== undefined && credential.pin !== null) cleanPin = String(credential.pin).trim();
        if (credential.employeeId) employeeId = String(credential.employeeId).trim();
        if (credential.fingerprint) employeeId = String(credential.fingerprint).trim();
        if (credential.email) credentialEmail = String(credential.email).trim().toLowerCase();
        if (credential.rememberMe !== undefined) shouldRemember = Boolean(credential.rememberMe);
      } else if (typeof credential === 'string' || typeof credential === 'number') {
        const str = String(credential).trim();
        if (str.includes('@')) {
          credentialEmail = str.toLowerCase();
        } else if (/^\d{4,6}$/.test(str)) {
          cleanPin = str;
        } else {
          employeeId = str;
        }
      }

      if (!cleanPin && !employeeId && !credentialEmail) {
        return this.#createEnvelope(false, null, 'يرجى إدخال رمز PIN أو التحقق عبر بصمة الإصبع أو البريد الإلكتروني');
      }

      const authMethod = credentialEmail ? 'email' : (cleanPin ? 'pin' : 'fingerprint');
      let emp = null;
      let targetCompanyId = null;

      // 1. استدعاء Supabase أولاً للتحقق من بيانات الموظف واستخراج company_id
      if (supabase) {
        try {
          let query = supabase.from('employees').select('*, companies(*)');
          if (credentialEmail) {
            query = query.eq('email', credentialEmail);
          } else if (cleanPin) {
            query = query.eq('pin', cleanPin);
          } else {
            query = query.or(`id.eq.${employeeId},employee_code.eq.${employeeId}`);
          }
          const { data, error } = await query.maybeSingle();
          if (data && !error) {
            emp = this.#normalizeEmployee(data);
            targetCompanyId = data.company_id || (data.companies && data.companies.id);
          }
        } catch (sbErr) {
          console.warn('[Supabase Login Fallback]:', sbErr);
        }
      }

      // 2. آلية Fallback على LocalDatabase في حال انقطاع الاتصال أو عدم العثور عليه
      if (!emp) {
        const db = LocalDatabase.getDB();
        let localEmp = null;
        if (credentialEmail) {
          localEmp = (db.employees || []).find(e => String(e.email || '').trim().toLowerCase() === credentialEmail);
        } else if (cleanPin) {
          localEmp = (db.employees || []).find(e => String(e.pin).trim() === cleanPin);
        } else {
          localEmp = (db.employees || []).find(e => e.id === employeeId || e.employee_code === employeeId);
        }
        if (localEmp) {
          emp = cloneData(localEmp);
          targetCompanyId = localEmp.company_id || db.settings?.company_id || 'COMP-001';
        }
      }

      if (!emp) {
        const errMsg = credentialEmail
          ? 'البريد الإلكتروني المدخل غير مسجل بالنظام!'
          : (cleanPin ? 'رمز PIN المكون من 6 أرقام غير صحيح!' : 'بصمة الإصبع أو كود الموظف غير مسجل بالنظام!');
        return this.#createEnvelope(false, null, errMsg, { message: errMsg });
      }

      // حماية مطلقة: حساب المبرمج الأصلي دائماً Super Admin / programmer
      if (emp.email === 'aemade2016@gmail.com' || cleanPin === '050298' || credentialEmail === 'aemade2016@gmail.com' || emp.id === 'aa69f711-7ca3-41dc-b628-42a5dda853f6' || emp.role === 'programmer' || emp.employee_code === 'EMP-0001') {
        emp.role = 'programmer';
        emp.department = 'تقنية المعلومات';
        emp.jobTitle = 'مبرمج ومطور برمجيات (Super Admin)';
        emp.status = 'active';
        emp.employee_code = 'EMP-0001';
        emp.id = 'aa69f711-7ca3-41dc-b628-42a5dda853f6';
        if (supabase) {
          supabase.from('employees').update({
            role: 'programmer',
            department: 'تقنية المعلومات',
            job_title: 'مدير النظام (Super Admin)',
            employee_code: 'EMP-0001',
            status: 'active'
          }).eq('email', 'aemade2016@gmail.com').then().catch(() => {});
        }
      }

      if (emp.status === 'pending') {
        return this.#createEnvelope(false, null, 'حسابك في انتظار اعتماد إدارة الموارد البشرية');
      }

      if (emp.status === 'suspended') {
        return this.#createEnvelope(false, null, 'تم إيقاف هذا الحساب، يرجى مراجعة إدارة الموارد البشرية');
      }

      // حفظ معرّف الشركة المستأجرة (company_id) فورياً في sessionStorage و localStorage
      targetCompanyId = targetCompanyId || emp.company_id || 'COMP-001';
      this.setCurrentCompanyId(targetCompanyId);
      emp.company_id = targetCompanyId;

      const db = LocalDatabase.getDB();
      const userRole = emp.role || 'employee';
      const normalizedRole = (userRole === 'admin') ? 'programmer' : (userRole === 'hr' ? 'manager' : userRole);
      const roleArabic = this.getRoleArabicTitle(userRole);
      const rolePermissions = db.role_permissions?.[userRole] || db.role_permissions?.[normalizedRole] || db.role_permissions?.employee || {};

      const session = {
        employeeId: emp.id,
        role: userRole,
        normalizedRole: normalizedRole,
        roleArabic: roleArabic,
        authMethod: authMethod,
        company_id: targetCompanyId,
        companyId: targetCompanyId,
        loginTime: new Date().toISOString(),
        rememberMe: shouldRemember
      };

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('JISR_COMPANY_ID', targetCompanyId);
        sessionStorage.setItem('JISR_AUTH_SESSION', JSON.stringify(session));
      }
      if (typeof localStorage !== 'undefined') {
        if (shouldRemember) {
          localStorage.setItem('JISR_COMPANY_ID', targetCompanyId);
          localStorage.setItem('JISR_AUTH_SESSION', JSON.stringify(session));
        } else {
          localStorage.removeItem('JISR_AUTH_SESSION');
        }
      }

      // تسجيل عملية تسجيل الدخول في سجل التدقيق
      AuditMiddleware.log({
        action: 'LOGIN',
        actionType: 'تسجيل',
        target: 'auth',
        targetId: emp.id,
        performedBy: {
          id: emp.id,
          name: emp.fullName,
          role: userRole,
          roleArabic: roleArabic
        },
        details: `تسجيل دخول ناجح للمستخدم: ${emp.fullName} (${emp.id}) بشركة (${targetCompanyId}) برتبة (${roleArabic}) عبر ${authMethod === 'pin' ? 'رمز الـ PIN' : 'البصمة الحيوية'}`
      });

      const responseData = {
        role: userRole,
        normalizedRole: normalizedRole,
        roleArabic: roleArabic,
        permissions: cloneData(rolePermissions),
        session: session,
        user: cloneData(emp),
        employee: cloneData(emp),
        company_id: targetCompanyId,
        companyId: targetCompanyId
      };

      return this.#createEnvelope(true, responseData, null, {
        ...responseData,
        message: `مرحباً بك مجدداً يا ${emp.fullName} (${roleArabic})`
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في تسجيل الدخول');
    }
  }

  static async loginWithPin(pin, rememberMe = true) {
    return this.login({ pin, rememberMe }, rememberMe);
  }

  static async loginWithFingerprint(employeeId, rememberMe = true) {
    return this.login({ employeeId, rememberMe }, rememberMe);
  }

  static async logout() {
    try {
      const actor = AuditMiddleware.getCurrentActor();
      if (supabase && supabase.auth) {
        try { await supabase.auth.signOut(); } catch (e) {}
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('JISR_AUTH_SESSION');
        localStorage.removeItem('JISR_COMPANY_ID');
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('JISR_AUTH_SESSION');
        sessionStorage.removeItem('JISR_COMPANY_ID');
      }

      AuditMiddleware.log({
        action: 'LOGOUT',
        actionType: 'تسجيل',
        target: 'auth',
        targetId: actor.id,
        details: `تسجيل خروج المستخدم: ${actor.name} (${actor.id})`
      });

      return this.#createEnvelope(true, null, null, { message: 'تم تسجيل الخروج بنجاح' });
    } catch (err) {
      return this.#handleError(err, 'فشل في تسجيل الخروج');
    }
  }

  /* ==========================================================================
     EMPLOYEE MANAGEMENT & ONBOARDING
     ========================================================================== */

  static async getNextEmployeeId() {
    try {
      const companyId = this.getCurrentCompanyId();
      let nums = [];
      if (supabase) {
        try {
          const { data } = await supabase
            .from('employees')
            .select('id, employee_code')
            .eq('company_id', companyId);
          if (data && data.length > 0) {
            nums = data.map(e => parseInt(String(e.employee_code || e.id).replace('EMP-', ''), 10)).filter(n => !isNaN(n) && n >= 1000);
          }
        } catch (e) {}
      }

      const db = LocalDatabase.getDB();
      const localNums = (db.employees || [])
        .map(e => parseInt(String(e.employee_code || e.id).replace('EMP-', ''), 10))
        .filter(n => !isNaN(n) && n >= 1000);

      const allNums = [...nums, ...localNums];
      const maxId = allNums.length > 0 ? Math.max(...allNums) : 1000;
      return `EMP-${maxId + 1}`;
    } catch (e) {
      return `EMP-${Date.now().toString().slice(-4)}`;
    }
  }

  static async getPendingEmployees(signal = null) {
    try {
      await this.simulateDelay(60, signal);
      const companyId = this.getCurrentCompanyId();
      let pending = [];

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('company_id', companyId)
            .eq('status', 'pending');
          if (!error && Array.isArray(data)) {
            pending = data.map(e => this.#normalizeEmployee(e));
          }
        } catch (e) {}
      }

      // دمج الموظفين المعلقين من LocalDatabase لضمان عدم ضياع أي موظف محلي
      const db = LocalDatabase.getDB();
      const localPending = (db.employees || []).filter(e => e.status === 'pending').map(e => this.#normalizeEmployee(e));
      localPending.forEach(lp => {
        if (!pending.some(p => p.id === lp.id || (p.employee_code && p.employee_code === lp.employee_code))) {
          pending.push(lp);
        }
      });

      // استبعاد أي موظف تم اعتماده وتفعيله بالفعل كـ active
      const activeIds = new Set((db.employees || []).filter(e => e.status === 'active').map(e => e.id));
      const activeCodes = new Set((db.employees || []).filter(e => e.status === 'active').map(e => e.employee_code).filter(Boolean));
      pending = pending.filter(p => !activeIds.has(p.id) && !activeCodes.has(p.employee_code) && !activeCodes.has(p.id));

      return cloneData(pending);
    } catch (err) {
      const db = LocalDatabase.getDB();
      const activeIds = new Set((db.employees || []).filter(e => e.status === 'active').map(e => e.id));
      const activeCodes = new Set((db.employees || []).filter(e => e.status === 'active').map(e => e.employee_code).filter(Boolean));
      const fallback = (db.employees || []).filter(e => e.status === 'pending' && !activeIds.has(e.id) && !activeCodes.has(e.employee_code)).map(e => this.#normalizeEmployee(e));
      return cloneData(fallback);
    }
  }

  static async registerNewEmployee(onboardingData) {
    try {
      await this.simulateDelay(120);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();

      const newId = await this.getNextEmployeeId();
      const cleanPin = String(onboardingData.pin).trim();

      // فحص عدم تكرار الـ PIN محلياً
      if ((db.employees || []).some(e => String(e.pin).trim() === cleanPin)) {
        return this.#createEnvelope(false, null, 'رمز PIN المختار مستخدم بالفعل، يرجى اختيار رمز آخر مكون من 6 أرقام');
      }

      const fullName = `${onboardingData.firstName || ''} ${onboardingData.secondName || ''} ${onboardingData.lastName || ''}`.trim();

      const newEmp = {
        id: newId,
        company_id: companyId,
        fullName: fullName || 'موظف جديد',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        department: onboardingData.department || 'العمليات والتشغيل',
        jobTitle: onboardingData.jobTitle || 'موظف جديد (قيد التعيين)',
        hireDate: new Date().toISOString().split('T')[0],
        shiftStart: '08:00',
        shiftEnd: '16:00',
        pin: cleanPin,
        baseSalary: Number(onboardingData.baseSalary || 7000),
        housingAllowance: 1000,
        transportAllowance: 800,
        otherAllowances: 500,
        insurancePercent: 11,
        phone: onboardingData.phone || '+20 100 000 0000',
        email: onboardingData.email || '',
        role: 'employee',
        status: 'pending',
        salesTarget: 15000,
        salesAchieved: 0,
        commissionRate: 3,
        salaryStatus: 'hold',
        leaveBalance: 21,
        biometricEnrolled: true,
        registeredAt: new Date().toISOString()
      };

      // 1. الحفظ في Supabase أولاً مع عزل company_id
      if (supabase) {
        try {
          const sbPayload = this.#toSupabaseEmployee(newEmp, companyId);
          sbPayload.status = 'pending';
          await supabase.from('employees').insert([sbPayload]);
        } catch (sbErr) {
          console.warn('[Supabase registerNewEmployee Fallback]:', sbErr);
        }
      }

      // 2. الحفظ في LocalDatabase
      if (!Array.isArray(db.employees)) db.employees = [];
      db.employees.push(newEmp);

      // 3. تسجيل طلب اعتماد انضمام فوري في جدول الطلبات لربط الموظف بالإدارة فوراً
      const onboardingRequest = {
        id: `REQ-ONB-${newId}`,
        company_id: companyId,
        employee_id: newId,
        employeeId: newId,
        type: 'onboarding',
        request_type: 'onboarding',
        status: 'pending',
        startDate: newEmp.hireDate,
        submittedAt: newEmp.registeredAt,
        createdAt: newEmp.hireDate,
        reason: `طلب تسجيل وانضمام موظف جديد بقسم (${newEmp.department}) - بانتظار الاعتماد وتحديد الراتب والصلاحيات`,
        employee: newEmp,
        details: {
          fullName: newEmp.fullName,
          phone: newEmp.phone,
          email: newEmp.email,
          department: newEmp.department,
          jobTitle: newEmp.jobTitle,
          rawEmployee: newEmp
        }
      };

      if (!Array.isArray(db.requests)) db.requests = [];
      db.requests.unshift(onboardingRequest);

      if (supabase) {
        try {
          await supabase.from('requests').insert([{
            id: `REQ-ONB-${newId}`,
            company_id: companyId,
            employee_id: newId,
            request_type: 'onboarding',
            status: 'pending',
            created_at: newEmp.registeredAt,
            reason: `طلب انضمام موظف جديد بقسم (${newEmp.department})`,
            details: onboardingRequest.details
          }]);
        } catch (sbReqErr) {
          console.warn('[Supabase onboarding request insert]:', sbReqErr);
        }
      }

      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'REGISTER_NEW_EMPLOYEE',
        actionType: 'إضافة',
        target: 'employees',
        targetId: newId,
        performedBy: {
          id: newId,
          name: newEmp.fullName,
          role: 'employee',
          roleArabic: 'موظف قيد الاعتماد'
        },
        details: `تسجيل طلب موظف جديد بقائمة الانتظار: ${newEmp.fullName} (${newId}) بشركة (${companyId}) - قسم ${newEmp.department}`,
        payload: { ...onboardingData, company_id: companyId }
      });

      return this.#createEnvelope(true, cloneData(newEmp), null, {
        employee: cloneData(newEmp),
        user: cloneData(newEmp),
        message: `تم تسجيل طلبك بنجاح بكود الموظف (${newId}). حسابك الآن بانتظار اعتماد إدارة الموارد البشرية.`
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في تسجيل الموظف الجديد');
    }
  }

  static async approvePendingEmployee(id, approvalData = {}) {
    try {
      await this.simulateDelay(100);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();

      // حماية صارمة مطلقة: منع تعديل أو اعتماد حساب المبرمج الأصلي للنظام تحت أي مسمى!
      if (id === 'aa69f711-7ca3-41dc-b628-42a5dda853f6' || id === 'EMP-0001') {
        return this.#createEnvelope(false, null, 'حساب المبرمج الأصلي محمي تماماً ومفعل كـ Super Admin ولا يمكن تعديله أو اعتماده كمرشح');
      }

      // البحث عن المرشح مع الاستبعاد التام والكامل لحساب المبرمج الأصلي
      let emp = (db.employees || []).find(e => 
        e.email !== 'aemade2016@gmail.com' &&
        e.role !== 'programmer' &&
        e.id !== 'aa69f711-7ca3-41dc-b628-42a5dda853f6' &&
        (e.id === id || e.employee_code === id)
      );

      if (!emp && supabase) {
        try {
          const { data } = await supabase
            .from('employees')
            .select('*')
            .eq('company_id', companyId)
            .neq('email', 'aemade2016@gmail.com')
            .or(`id.eq.${id},employee_code.eq.${id}`)
            .maybeSingle();
          if (data && data.email !== 'aemade2016@gmail.com' && data.role !== 'programmer') {
            emp = this.#normalizeEmployee(data);
            if (!Array.isArray(db.employees)) db.employees = [];
            db.employees.push(emp);
          }
        } catch (e) {}
      }

      if (!emp) {
        return this.#createEnvelope(false, null, 'الموظف غير موجود أو أنه حساب محمي');
      }

      emp.status = 'active';
      if (approvalData.role) emp.role = approvalData.role;
      if (approvalData.baseSalary !== undefined) emp.baseSalary = Number(approvalData.baseSalary);
      if (approvalData.department) emp.department = approvalData.department;
      if (approvalData.jobTitle) emp.jobTitle = approvalData.jobTitle;
      if (approvalData.housingAllowance !== undefined) emp.housingAllowance = Number(approvalData.housingAllowance);
      if (approvalData.transportAllowance !== undefined) emp.transportAllowance = Number(approvalData.transportAllowance);
      if (approvalData.otherAllowances !== undefined) emp.otherAllowances = Number(approvalData.otherAllowances);
      if (approvalData.salesTarget !== undefined) emp.salesTarget = Number(approvalData.salesTarget);
      if (approvalData.commissionRate !== undefined) emp.commissionRate = Number(approvalData.commissionRate);
      emp.salaryStatus = 'processing';

      // تحديث أو إنشاء حالة طلب الاعتماد في LocalDatabase كـ approved
      if (!Array.isArray(db.requests)) db.requests = [];
      const matchingReqs = db.requests.filter(r => 
        (r.employeeId === id || r.employee_id === id || r.employeeId === emp.id || r.employee_id === emp.id || r.id === `REQ-ONB-${id}` || r.id === `REQ-ONB-${emp.id}`) &&
        (r.type === 'onboarding' || r.request_type === 'onboarding')
      );

      if (matchingReqs.length > 0) {
        matchingReqs.forEach(req => {
          req.status = 'approved';
          req.manager_reply = `تم اعتماد وتفعيل الحساب بنجاح برتبة (${this.getRoleArabicTitle(emp.role)}) وراتب أساسي (${emp.baseSalary} ج.م)`;
          req.reviewNotes = `تم اعتماد وتفعيل الحساب برتبة (${this.getRoleArabicTitle(emp.role)})`;
          req.approvedAt = new Date().toISOString();
          req.reviewedAt = new Date().toISOString();
        });
      } else {
        db.requests.unshift({
          id: `REQ-ONB-${emp.id || id}`,
          company_id: companyId,
          employee_id: emp.id || id,
          employeeId: emp.id || id,
          type: 'onboarding',
          request_type: 'onboarding',
          status: 'approved',
          startDate: emp.registeredAt ? emp.registeredAt.split('T')[0] : (emp.hireDate || new Date().toISOString().split('T')[0]),
          submittedAt: emp.registeredAt || emp.hireDate || new Date().toISOString(),
          createdAt: emp.registeredAt ? emp.registeredAt.split('T')[0] : (emp.hireDate || new Date().toISOString().split('T')[0]),
          reason: `طلب تسجيل وانضمام موظف جديد بقسم (${emp.department || 'عام'}) - تم الاعتماد والتفعيل`,
          reviewNotes: `تم اعتماد وتفعيل الحساب برتبة (${this.getRoleArabicTitle(emp.role)}) وراتب أساسي (${emp.baseSalary} ج.م)`,
          manager_reply: `تم اعتماد وتفعيل الحساب بنجاح برتبة (${this.getRoleArabicTitle(emp.role)}) وراتب أساسي (${emp.baseSalary} ج.م)`,
          approvedAt: new Date().toISOString(),
          reviewedAt: new Date().toISOString(),
          employee: emp
        });
      }

      // 1. التحديث الآمن في Supabase (تجنب الحقول غير الموجودة مثل manager_reply)
      if (supabase) {
        try {
          const sbEmpUpdate = {
            status: 'active',
            role: emp.role,
            department: emp.department,
            job_title: emp.jobTitle,
            salary: emp.baseSalary
          };
          if (emp.id) {
            await supabase.from('employees').update(sbEmpUpdate).eq('id', emp.id).eq('company_id', companyId);
          }
          if (emp.employee_code) {
            await supabase.from('employees').update(sbEmpUpdate).eq('employee_code', emp.employee_code).eq('company_id', companyId);
          }
          if (id && id !== emp.id && id !== emp.employee_code) {
            await supabase.from('employees').update(sbEmpUpdate).eq('employee_code', id).eq('company_id', companyId);
          }
        } catch (sbEmpErr) {
          console.warn('[Supabase approvePendingEmployee emp]:', sbEmpErr);
        }

        try {
          const reqUpdatePayload = {
            status: 'approved',
            review_notes: `تم اعتماد وتفعيل الحساب برتبة (${this.getRoleArabicTitle(emp.role)}) وراتب أساسي (${emp.baseSalary} ج.م)`,
            reviewed_at: new Date().toISOString()
          };
          await supabase.from('requests').update(reqUpdatePayload).eq('id', `REQ-ONB-${id}`).eq('company_id', companyId);
          if (emp.id) {
            await supabase.from('requests').update(reqUpdatePayload).eq('id', `REQ-ONB-${emp.id}`).eq('company_id', companyId);
            await supabase.from('requests').update(reqUpdatePayload).eq('employee_id', emp.id).eq('request_type', 'onboarding').eq('company_id', companyId);
          }
          if (emp.employee_code) {
            await supabase.from('requests').update(reqUpdatePayload).eq('employee_id', emp.employee_code).eq('request_type', 'onboarding').eq('company_id', companyId);
          }
        } catch (sbReqErr) {
          console.warn('[Supabase approvePendingEmployee req]:', sbReqErr);
        }
      }

      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'APPROVE_EMPLOYEE',
        actionType: 'اعتماد',
        target: 'employees',
        targetId: emp.id,
        details: `اعتماد وتفعيل حساب الموظف (${emp.fullName} - ${emp.id}) بشركة (${companyId}) برتبة: ${this.getRoleArabicTitle(emp.role)} وراتب أساسي: ${emp.baseSalary} ج.م`,
        payload: { ...approvalData, company_id: companyId }
      });

      return this.#createEnvelope(true, cloneData(emp), null, {
        employee: cloneData(emp),
        user: cloneData(emp),
        message: `تم اعتماد وتفعيل حساب الموظف (${emp.fullName}) بنجاح بصلاحية: ${this.getRoleArabicTitle(emp.role)}`
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في اعتماد الموظف');
    }
  }

  static async rejectPendingEmployee(id) {
    try {
      await this.simulateDelay(80);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();

      // حماية صارمة مطلقة: منع حذف حساب المبرمج الأصلي للنظام
      if (id === 'aa69f711-7ca3-41dc-b628-42a5dda853f6' || id === 'EMP-0001') {
        return this.#createEnvelope(false, null, 'حساب المبرمج الأصلي محمي تماماً ولا يمكن حذفه');
      }

      const idx = (db.employees || []).findIndex(e => 
        e.email !== 'aemade2016@gmail.com' &&
        e.role !== 'programmer' &&
        e.id !== 'aa69f711-7ca3-41dc-b628-42a5dda853f6' &&
        (e.id === id || e.employee_code === id)
      );
      if (idx === -1) {
        return this.#createEnvelope(false, null, 'الموظف غير موجود أو محمي');
      }

      const [removed] = db.employees.splice(idx, 1);

      // 1. الحذف الآمن من Supabase
      if (supabase) {
        try {
          if (removed.id) {
            await supabase.from('employees').delete().eq('id', removed.id).eq('company_id', companyId);
          }
          if (removed.employee_code) {
            await supabase.from('employees').delete().eq('employee_code', removed.employee_code).eq('company_id', companyId);
          }
        } catch (sbErr) {
          console.warn('[Supabase rejectPendingEmployee emp]:', sbErr);
        }

        try {
          const rejUpdate = {
            status: 'rejected',
            review_notes: 'تم رفض طلب التسجيل من قبل الإدارة',
            reviewed_at: new Date().toISOString()
          };
          await supabase.from('requests').update(rejUpdate).eq('id', `REQ-ONB-${id}`).eq('company_id', companyId);
          if (removed.id) {
            await supabase.from('requests').update(rejUpdate).eq('id', `REQ-ONB-${removed.id}`).eq('company_id', companyId);
            await supabase.from('requests').update(rejUpdate).eq('employee_id', removed.id).eq('request_type', 'onboarding').eq('company_id', companyId);
          }
          if (removed.employee_code) {
            await supabase.from('requests').update(rejUpdate).eq('employee_id', removed.employee_code).eq('request_type', 'onboarding').eq('company_id', companyId);
          }
        } catch (sbReqErr) {
          console.warn('[Supabase rejectPendingEmployee req]:', sbReqErr);
        }
      }

      // تحديث حالة طلب الاعتماد في LocalDatabase
      if (Array.isArray(db.requests)) {
        const matchingReqs = db.requests.filter(r => 
          (r.employeeId === id || r.employee_id === id || r.employeeId === removed.id || r.employee_id === removed.id || r.id === `REQ-ONB-${id}` || r.id === `REQ-ONB-${removed.id}`) &&
          (r.type === 'onboarding' || r.request_type === 'onboarding')
        );
        matchingReqs.forEach(req => {
          req.status = 'rejected';
          req.manager_reply = 'تم رفض طلب التسجيل من قبل الإدارة';
          req.reviewNotes = 'مرفوض من قبل الإدارة';
          req.rejectedAt = new Date().toISOString();
          req.reviewedAt = new Date().toISOString();
        });
      }

      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'REJECT_EMPLOYEE',
        actionType: 'حذف',
        target: 'employees',
        targetId: id,
        details: `رفض طلب تسجيل الموظف وحذف بياناته: ${removed.fullName} (${removed.id}) بشركة (${companyId})`
      });

      return this.#createEnvelope(true, cloneData(removed), null, {
        message: 'تم رفض طلب التسجيل وإلغاء بيانات الموظف بنجاح'
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في رفض الموظف');
    }
  }

  static async updateEmployeeSales(id, salesData) {
    try {
      await this.simulateDelay(60);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      const emp = (db.employees || []).find(e => e.id === id);
      if (!emp) return this.#createEnvelope(false, null, 'الموظف غير موجود');

      if (salesData.salesTarget !== undefined) emp.salesTarget = Number(salesData.salesTarget);
      if (salesData.salesAchieved !== undefined) emp.salesAchieved = Number(salesData.salesAchieved);
      if (salesData.commissionRate !== undefined) emp.commissionRate = Number(salesData.commissionRate);

      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'UPDATE_SALES_TARGET',
        actionType: 'تعديل',
        target: 'employees',
        targetId: id,
        details: `تحديث مستهدف المبيعات (${emp.salesTarget} ج.م) والعمولة (${emp.commissionRate}%) للموظف: ${emp.fullName} بشركة (${companyId})`,
        payload: { ...salesData, company_id: companyId }
      });

      return this.#createEnvelope(true, cloneData(emp), null, {
        message: 'تم تحديث أرقام المبيعات ونسبة العمولة بنجاح'
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في تحديث المبيعات والعمولة');
    }
  }

  static async updateSalaryStatus(id, salaryStatus) {
    try {
      await this.simulateDelay(60);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      const emp = (db.employees || []).find(e => e.id === id);
      if (!emp) return this.#createEnvelope(false, null, 'الموظف غير موجود');

      emp.salaryStatus = salaryStatus;
      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'UPDATE_SALARY_STATUS',
        actionType: 'تعديل',
        target: 'employees',
        targetId: id,
        details: `تحديث حالة الراتب للموظف (${emp.fullName}) إلى: ${salaryStatus} بشركة (${companyId})`
      });

      return this.#createEnvelope(true, cloneData(emp), null, {
        message: `تم تحديث حالة الراتب إلى: ${salaryStatus}`
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في تحديث حالة الراتب');
    }
  }

  /* ==========================================================================
     SETTINGS & COMPANY CONFIGURATION (GEOFENCING & SYSTEM RULES)
     ========================================================================== */

  static async getSettings(signal = null) {
    try {
      await this.simulateDelay(60, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      let settings = cloneData(db.settings || {});

      // 1. استدعاء إعدادات الشركة من Supabase أولاً
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .maybeSingle();

          if (data && !error) {
            settings = {
              ...settings,
              companyName: data.name || settings.companyName,
              company_lat: data.company_lat ?? data.latitude ?? settings.company_lat,
              company_lng: data.company_lng ?? data.longitude ?? settings.company_lng,
              allowed_radius_meters: data.allowed_radius_meters ?? settings.allowed_radius_meters
            };
          }
        } catch (sbErr) {
          console.warn('[Supabase getSettings Fallback]:', sbErr);
        }
      }

      return this.#createEnvelope(true, cloneData(settings));
    } catch (err) {
      return this.#handleError(err, 'فشل في جلب إعدادات النظام');
    }
  }

  static async updateSettings(newSettings, signal = null) {
    try {
      await this.simulateDelay(100, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      db.settings = { ...db.settings, ...newSettings };

      if (newSettings.companyName && db.company_settings) db.company_settings.companyName = newSettings.companyName;
      if (newSettings.currency && db.company_settings) db.company_settings.currency = newSettings.currency;
      if (newSettings.companyAddress && db.company_settings) db.company_settings.address = newSettings.companyAddress;
      if (newSettings.company_lat && db.company_settings) db.company_settings.company_lat = newSettings.company_lat;
      if (newSettings.company_lng && db.company_settings) db.company_settings.company_lng = newSettings.company_lng;
      if (newSettings.allowed_radius_meters && db.company_settings) db.company_settings.allowed_radius_meters = newSettings.allowed_radius_meters;

      // 1. تحديث جدول companies في Supabase مع عزل المستأجر الحالي
      if (supabase) {
        try {
          await supabase
            .from('companies')
            .update({
              name: newSettings.companyName,
              company_lat: newSettings.company_lat,
              company_lng: newSettings.company_lng,
              allowed_radius_meters: newSettings.allowed_radius_meters
            })
            .eq('id', companyId);
        } catch (sbErr) {
          console.warn('[Supabase updateSettings Fallback]:', sbErr);
        }
      }

      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'UPDATE_SETTINGS',
        actionType: 'تعديل',
        target: 'settings',
        targetId: companyId,
        details: `تحديث قواعد وإعدادات مسير الرواتب والتحكم الجغرافي لشركة (${companyId})`,
        payload: { ...newSettings, company_id: companyId }
      });

      return this.#createEnvelope(true, cloneData(db.settings), null, { message: 'تم تحديث الإعدادات بنجاح' });
    } catch (err) {
      return this.#handleError(err, 'فشل في حفظ إعدادات النظام');
    }
  }

  static async getCompanySettings(signal = null) {
    try {
      await this.simulateDelay(60, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      let comp = cloneData(db.company_settings || INITIAL_DATABASE.company_settings);

      // 1. استدعاء بيانات وهوية الشركة من Supabase أولاً
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .maybeSingle();

          if (data && !error) {
            comp = {
              ...comp,
              companyName: data.name || comp.companyName,
              company_lat: data.company_lat ?? data.latitude ?? comp.company_lat,
              company_lng: data.company_lng ?? data.longitude ?? comp.company_lng,
              allowed_radius_meters: data.allowed_radius_meters ?? comp.allowed_radius_meters,
              ...data
            };
          }
        } catch (sbErr) {
          console.warn('[Supabase getCompanySettings Fallback]:', sbErr);
        }
      }

      return this.#createEnvelope(true, cloneData(comp));
    } catch (err) {
      return this.#handleError(err, 'فشل في جلب بيانات الشركة');
    }
  }

  static async updateCompanySettings(newSettings, signal = null) {
    try {
      await this.simulateDelay(100, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      db.company_settings = {
        ...(db.company_settings || INITIAL_DATABASE.company_settings),
        ...newSettings
      };

      if (newSettings.companyName) db.settings.companyName = newSettings.companyName;
      if (newSettings.currency) db.settings.currency = newSettings.currency;
      if (newSettings.taxNumber) db.settings.taxNumber = newSettings.taxNumber;
      if (newSettings.commercialRegister) db.settings.commercialRegister = newSettings.commercialRegister;

      // 1. تحديث جدول companies في Supabase أولاً
      if (supabase) {
        try {
          await supabase
            .from('companies')
            .update({
              name: newSettings.companyName,
              company_lat: newSettings.company_lat,
              company_lng: newSettings.company_lng,
              allowed_radius_meters: newSettings.allowed_radius_meters
            })
            .eq('id', companyId);
        } catch (sbErr) {
          console.warn('[Supabase updateCompanySettings Fallback]:', sbErr);
        }
      }

      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'UPDATE_COMPANY_SETTINGS',
        actionType: 'تعديل',
        target: 'company_settings',
        targetId: companyId,
        details: `تحديث بيانات الشركة الرسمية (${db.company_settings.companyName}) لشركة (${companyId})`,
        payload: { ...newSettings, company_id: companyId }
      });

      return this.#createEnvelope(true, cloneData(db.company_settings), null, {
        message: 'تم تحديث بيانات وهوية الشركة بنجاح'
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في تحديث بيانات الشركة');
    }
  }

  /* ==========================================================================
     MULTI-TENANT SAAS MODULE (إدارة طلبات واشتراكات الشركات الجديدة)
     ========================================================================== */

  /**
   * تسجيل شركة جديدة من صفحة الهبوط في حالة قيد الانتظار (Pending)
   * @param {Object} tenantData { companyName, taxNumber, managerName, phone, email, pin }
   * @param {AbortSignal} [signal]
   */
  static async registerNewTenant(tenantData, signal = null) {
    try {
      await this.simulateDelay(120, signal);
      if (!tenantData || !tenantData.companyName || !tenantData.managerName) {
        return this.#createEnvelope(false, null, 'يرجى استكمال كافة بيانات الشركة واسم المدير', {
          message: 'يرجى استكمال كافة بيانات الشركة واسم المدير'
        });
      }

      const email = String(tenantData.email || '').trim().toLowerCase();
      const pin = String(tenantData.pin || '').trim();
      if (!pin || pin.length < 4) {
        return this.#createEnvelope(false, null, 'يرجى إدخال رمز PIN للمدير لا يقل عن 4 أرقام', {
          message: 'يرجى إدخال رمز PIN للمدير لا يقل عن 4 أرقام'
        });
      }

      const db = LocalDatabase.getDB();
      if (!Array.isArray(db.companies)) db.companies = cloneData(INITIAL_DATABASE.companies || []);

      // فحص عدم تكرار البريد الإلكتروني أو الرقم الضريبي
      const duplicate = db.companies.find(c => 
        (c.email && c.email.toLowerCase() === email) || 
        (tenantData.taxNumber && c.taxNumber && c.taxNumber === tenantData.taxNumber)
      );
      if (duplicate) {
        return this.#createEnvelope(false, null, 'البريد الإلكتروني أو الرقم الضريبي مسجل بالفعل لشركة أخرى بالنظام', {
          message: 'البريد الإلكتروني أو الرقم الضريبي مسجل بالفعل لشركة أخرى بالنظام'
        });
      }

      // توليد معرف UUID فريد للشركة
      const companyId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'comp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

      const newTenant = {
        id: companyId,
        company_id: companyId,
        name: tenantData.companyName.trim(),
        company_name: tenantData.companyName.trim(),
        companyName: tenantData.companyName.trim(),
        tax_number: (tenantData.taxNumber || '').trim(),
        taxNumber: (tenantData.taxNumber || '').trim(),
        manager_name: tenantData.managerName.trim(),
        managerName: tenantData.managerName.trim(),
        phone: (tenantData.phone || '').trim(),
        email: email,
        pin: pin,
        status: 'pending',
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString().split('T')[0]
      };

      // 1. الإدراج في جدول companies في Supabase
      if (supabase) {
        try {
          const sbPayload = {
            id: companyId,
            name: newTenant.companyName,
            tax_number: newTenant.taxNumber || null,
            manager_name: newTenant.managerName,
            phone: newTenant.phone || null,
            email: newTenant.email || null,
            pin: newTenant.pin,
            status: 'pending'
          };
          const { error } = await supabase.from('companies').insert([sbPayload]);
          if (error) {
            console.warn('[Supabase registerNewTenant Warning]:', error.message || error);
          }
        } catch (sbErr) {
          console.warn('[Supabase registerNewTenant Fallback]:', sbErr);
        }
      }

      // 2. الحفظ في LocalDatabase.companies كآلية Fallback مضمونة
      db.companies.unshift(newTenant);
      LocalDatabase.saveDB(db);

      // تسجيل الحدث في سجل الرقابة والتدقيق (Audit Log)
      AuditMiddleware.log({
        action: 'REGISTER_TENANT',
        actionType: 'إضافة',
        target: 'companies',
        targetId: companyId,
        details: `تسجيل شركة جديدة بقائمة الانتظار: ${newTenant.companyName} (المدير: ${newTenant.managerName} - ${newTenant.phone})`,
        payload: newTenant
      });

      return this.#createEnvelope(true, cloneData(newTenant), null, {
        message: 'تم استلام طلب تسجيل شركتكم بنجاح! طلبكم قيد المراجعة والاعتماد من قبل الإدارة وسيتم تفعيل حسابكم فوراً.'
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في تسجيل الشركة الجديدة');
    }
  }

  /**
   * جلب جميع الشركات المسجلة بالنظام (سواء Pending أو Active)
   * @param {AbortSignal} [signal]
   */
  static async getAllTenants(signal = null) {
    try {
      await this.simulateDelay(60, signal);
      let tenants = [];

      // 1. جلب الشركات من Supabase أولاً
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('companies')
            .select('*')
            .order('created_at', { ascending: false });

          if (data && !error && data.length > 0) {
            tenants = data.map(d => ({
              id: d.id,
              company_id: d.id,
              companyName: d.name || d.company_name || d.companyName || 'شركة بدون اسم',
              name: d.name || d.company_name || d.companyName || 'شركة بدون اسم',
              taxNumber: d.tax_number ?? d.taxNumber ?? 'غير مسجل',
              tax_number: d.tax_number ?? d.taxNumber ?? 'غير مسجل',
              managerName: d.manager_name ?? d.managerName ?? 'غير مسجل',
              manager_name: d.manager_name ?? d.managerName ?? 'غير مسجل',
              phone: d.phone || '',
              email: d.email || '',
              pin: d.pin || '',
              status: d.status || 'active',
              createdAt: d.created_at || d.createdAt || new Date().toISOString()
            }));
          }
        } catch (sbErr) {
          console.warn('[Supabase getAllTenants Fallback]:', sbErr);
        }
      }

      // 2. المزامنة والدمج مع LocalDatabase
      const db = LocalDatabase.getDB();
      if (!Array.isArray(db.companies)) {
        db.companies = cloneData(INITIAL_DATABASE.companies || []);
        LocalDatabase.saveDB(db);
      }

      if (tenants.length === 0) {
        tenants = cloneData(db.companies);
      } else {
        // دمج الشركات المحلية غير المرفوعة بعد
        db.companies.forEach(localC => {
          if (!tenants.some(t => t.id === localC.id)) {
            tenants.push(localC);
          }
        });
      }

      // فرز القائمة بحيث تظهر الشركات المعلقة أولاً ثم حسب التاريخ
      tenants.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });

      return this.#createEnvelope(true, cloneData(tenants));
    } catch (err) {
      return this.#handleError(err, 'فشل في استرجاع قائمة الشركات');
    }
  }

  /**
   * اعتماد وتفعيل شركة جديدة وإنشاء حساب المدير العام لها (role = 'admin')
   * @param {string} companyId
   * @param {AbortSignal} [signal]
   */
  static async approveTenant(companyId, signal = null) {
    try {
      await this.simulateDelay(120, signal);
      const db = LocalDatabase.getDB();
      if (!Array.isArray(db.companies)) db.companies = [];

      let company = db.companies.find(c => c.id === companyId);

      // إذا لم تكن موجودة محلياً، نبحث عنها في Supabase
      if (!company && supabase) {
        try {
          const { data } = await supabase.from('companies').select('*').eq('id', companyId).maybeSingle();
          if (data) {
            company = {
              id: data.id,
              companyName: data.name || data.company_name,
              taxNumber: data.tax_number,
              managerName: data.manager_name,
              phone: data.phone,
              email: data.email,
              pin: data.pin,
              status: 'pending'
            };
            db.companies.push(company);
          }
        } catch (e) {}
      }

      if (!company) {
        return this.#createEnvelope(false, null, 'الشركة غير موجودة بالنظام', { message: 'الشركة غير موجودة بالنظام' });
      }

      // 1. تحديث حالة الشركة إلى active في Supabase
      if (supabase) {
        try {
          await supabase.from('companies').update({ status: 'active' }).eq('id', companyId);
        } catch (sbErr) {
          console.warn('[Supabase approveTenant status error]:', sbErr);
        }
      }

      // 2. تحديث حالة الشركة محلياً
      company.status = 'active';

      // 3. إنشاء موظف جديد ليكون مدير هذه الشركة (role = 'admin')
      const managerName = company.managerName || company.manager_name || 'مدير الشركة';
      const managerEmail = company.email || `admin@comp-${companyId.slice(0, 6)}.com`;
      const managerPhone = company.phone || '';
      const managerPin = String(company.pin || '123456').trim();

      const managerId = await this.getNextEmployeeId();
      const managerEmp = this.#normalizeEmployee({
        id: managerId,
        employee_code: managerId,
        company_id: companyId,
        fullName: managerName,
        firstName: managerName.split(' ')[0],
        lastName: managerName.split(' ').slice(1).join(' ') || '',
        email: managerEmail,
        phone: managerPhone,
        pin: managerPin,
        role: 'admin',
        status: 'active',
        department: 'الإدارة العامة',
        jobTitle: 'مدير عام الشركة (Admin)',
        baseSalary: 15000,
        housingAllowance: 2000,
        transportAllowance: 1000,
        otherAllowances: 1000,
        salaryStatus: 'processing',
        leaveBalance: 21,
        hireDate: new Date().toISOString().split('T')[0]
      });

      // 4. إدراج حساب المدير في جدول employees في Supabase
      if (supabase) {
        try {
          const sbPayload = this.#toSupabaseEmployee(managerEmp, companyId);
          sbPayload.role = 'admin';
          sbPayload.status = 'active';
          await supabase.from('employees').insert([sbPayload]);
        } catch (sbErr) {
          console.warn('[Supabase approveTenant Manager Insert Fallback]:', sbErr);
        }
      }

      // 5. حفظ الموظف الجديد في LocalDatabase
      if (!Array.isArray(db.employees)) db.employees = [];
      db.employees = db.employees.filter(e => e.id !== managerId && e.email !== managerEmail);
      db.employees.push(managerEmp);

      LocalDatabase.saveDB(db);

      // تسجيل الحدث في سجل التدقيق
      AuditMiddleware.log({
        action: 'APPROVE_TENANT',
        actionType: 'اعتماد',
        target: 'companies',
        targetId: companyId,
        details: `اعتماد وتفعيل الشركة: "${company.companyName}" وإنشاء حساب المدير العام المسؤول: ${managerName} (${managerId}) بصلاحية Admin`,
        payload: { companyId, managerEmp }
      });

      return this.#createEnvelope(true, { company, manager: managerEmp }, null, {
        message: `تم اعتماد وتفعيل الشركة "${company.companyName}" بنجاح! تم إنشاء حساب المدير العام (${managerName}) برتبة Admin وبكود (${managerId}).`
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في اعتماد وتفعيل الشركة');
    }
  }

  /**
   * رفض وحذف الشركة وطلب اشتراكها من النظام
   * @param {string} companyId
   * @param {AbortSignal} [signal]
   */
  static async rejectTenant(companyId, signal = null) {
    try {
      await this.simulateDelay(100, signal);
      const db = LocalDatabase.getDB();
      const comp = (db.companies || []).find(c => c.id === companyId);
      const compName = comp?.companyName || companyId;

      // 1. الحذف من Supabase
      if (supabase) {
        try {
          await supabase.from('companies').delete().eq('id', companyId);
          await supabase.from('employees').delete().eq('company_id', companyId);
        } catch (sbErr) {
          console.warn('[Supabase rejectTenant error]:', sbErr);
        }
      }

      // 2. الحذف من LocalDatabase
      if (Array.isArray(db.companies)) {
        db.companies = db.companies.filter(c => c.id !== companyId);
      }
      if (Array.isArray(db.employees)) {
        // حذف موظفي هذه الشركة فقط مع حماية حساب المبرمج Super Admin
        db.employees = db.employees.filter(e => e.company_id !== companyId || e.role === 'programmer');
      }

      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'REJECT_TENANT',
        actionType: 'حذف',
        target: 'companies',
        targetId: companyId,
        details: `رفض وحذف الشركة: "${compName}" (${companyId}) وجميع بياناتها من النظام`,
        payload: { companyId }
      });

      return this.#createEnvelope(true, null, null, {
        message: `تم رفض وحذف الشركة "${compName}" بنجاح`
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في رفض وحذف الشركة');
    }
  }

  /* ==========================================================================
     ROLE PERMISSIONS MODULE (RBAC)
     ========================================================================== */

  static async getRolePermissions(role = null, signal = null) {
    try {
      await this.simulateDelay(50, signal);
      const db = LocalDatabase.getDB();
      const perms = db.role_permissions || INITIAL_DATABASE.role_permissions;
      if (role) {
        const normalized = (role === 'admin') ? 'programmer' : (role === 'hr' ? 'manager' : role);
        const rolePerms = perms[role] || perms[normalized] || perms.employee || {};
        return this.#createEnvelope(true, cloneData(rolePerms));
      }
      return this.#createEnvelope(true, cloneData(perms));
    } catch (err) {
      return this.#handleError(err, 'فشل في جلب مصفوفة الصلاحيات');
    }
  }

  static async updateRolePermissions(role, permissions, signal = null) {
    try {
      await this.simulateDelay(80, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      if (!db.role_permissions) db.role_permissions = cloneData(INITIAL_DATABASE.role_permissions);

      db.role_permissions[role] = {
        ...(db.role_permissions[role] || {}),
        ...permissions
      };

      if (role === 'programmer') db.role_permissions.admin = db.role_permissions.programmer;
      if (role === 'manager') db.role_permissions.hr = db.role_permissions.manager;

      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'UPDATE_ROLE_PERMISSIONS',
        actionType: 'تعديل',
        target: 'role_permissions',
        targetId: role,
        details: `تحديث مصفوفة الصلاحيات التفصيلية لرتبة: ${this.getRoleArabicTitle(role)} بشركة (${companyId})`,
        payload: { role, permissions, company_id: companyId }
      });

      return this.#createEnvelope(true, cloneData(db.role_permissions[role]), null, {
        message: `تم تحديث صلاحيات رتبة (${this.getRoleArabicTitle(role)}) بنجاح`
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في حفظ صلاحيات الرتبة');
    }
  }

  /* ==========================================================================
     DEPARTMENTS & DEPARTMENT PERMISSIONS MODULE
     ========================================================================== */

  static async getDepartments(signal = null) {
    try {
      await this.simulateDelay(60, signal);
      const companyId = this.getCurrentCompanyId();
      let list = null;

      // 1. استدعاء الأقسام من Supabase أولاً
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('departments')
            .select('*')
            .eq('company_id', companyId);
          if (!error && Array.isArray(data) && data.length > 0) {
            list = data;
          }
        } catch (e) {}
      }

      if (list === null) {
        const db = LocalDatabase.getDB();
        list = Array.isArray(db.departments) ? [...db.departments] : [];
      }

      const db = LocalDatabase.getDB();
      const employees = Array.isArray(db.employees) ? db.employees : [];
      const enriched = list.map(d => ({
        ...d,
        employeeCount: employees.filter(e => e.department === d.name && e.status !== 'archived').length
      }));

      return this.#createEnvelope(true, cloneData(enriched));
    } catch (err) {
      return this.#handleError(err, 'فشل في استرجاع قائمة الأقسام');
    }
  }

  static async getDepartmentById(idOrName, signal = null) {
    try {
      await this.simulateDelay(40, signal);
      const companyId = this.getCurrentCompanyId();
      let dept = null;

      if (supabase) {
        try {
          const { data } = await supabase
            .from('departments')
            .select('*')
            .eq('company_id', companyId)
            .or(`id.eq.${idOrName},name.eq.${idOrName}`)
            .maybeSingle();
          if (data) dept = data;
        } catch (e) {}
      }

      if (!dept) {
        const db = LocalDatabase.getDB();
        dept = (db.departments || []).find(d => d.id === idOrName || d.name === idOrName);
      }

      return dept
        ? this.#createEnvelope(true, cloneData(dept))
        : this.#createEnvelope(false, null, 'القسم غير موجود');
    } catch (err) {
      return this.#handleError(err, 'فشل في استرجاع بيانات القسم');
    }
  }

  static async createDepartment(deptData, signal = null) {
    try {
      await this.simulateDelay(80, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      if (!Array.isArray(db.departments)) db.departments = [];

      const name = String(deptData.name || '').trim();
      if (!name) return this.#createEnvelope(false, null, 'اسم القسم مطلوب');

      if (db.departments.some(d => d.name.toLowerCase() === name.toLowerCase())) {
        return this.#createEnvelope(false, null, 'يوجد قسم مسجل بهذا الاسم مسبقاً');
      }

      const newId = `DEPT-${Date.now().toString().slice(-4)}`;
      const newDept = {
        id: newId,
        company_id: companyId,
        name: name,
        nameEn: deptData.nameEn || '',
        code: (deptData.code || name.slice(0, 3)).toUpperCase(),
        description: deptData.description || '',
        managerId: deptData.managerId || null,
        managerName: deptData.managerName || '',
        createdAt: new Date().toISOString().split('T')[0]
      };

      // 1. الإدراج في Supabase
      if (supabase) {
        try {
          await supabase.from('departments').insert([newDept]);
        } catch (sbErr) {
          console.warn('[Supabase createDepartment Fallback]:', sbErr);
        }
      }

      // 2. التحديث في LocalDatabase
      db.departments.push(newDept);
      if (!db.department_permissions) db.department_permissions = {};
      if (!db.department_permissions[name]) {
        db.department_permissions[name] = cloneData(INITIAL_DATABASE.department_permissions?.['العمليات والتشغيل'] || INITIAL_DATABASE.role_permissions.employee);
      }
      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'CREATE_DEPARTMENT',
        actionType: 'إضافة',
        target: 'departments',
        targetId: newId,
        details: `إضافة قسم إداري جديد: ${name} (كود: ${newDept.code}) بشركة (${companyId})`,
        payload: newDept
      });

      return this.#createEnvelope(true, cloneData(newDept), null, {
        department: cloneData(newDept),
        message: `تم إنشاء قسم (${name}) بنجاح`
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في إنشاء القسم');
    }
  }

  static async updateDepartment(deptId, deptData, signal = null) {
    try {
      await this.simulateDelay(80, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      const dept = (db.departments || []).find(d => d.id === deptId || d.name === deptId);
      if (!dept) return this.#createEnvelope(false, null, 'القسم غير موجود');

      const oldName = dept.name;
      const newName = String(deptData.name || dept.name).trim();

      dept.name = newName;
      if (deptData.nameEn !== undefined) dept.nameEn = deptData.nameEn;
      if (deptData.code !== undefined) dept.code = String(deptData.code).toUpperCase();
      if (deptData.description !== undefined) dept.description = deptData.description;
      if (deptData.managerId !== undefined) dept.managerId = deptData.managerId;
      if (deptData.managerName !== undefined) dept.managerName = deptData.managerName;

      // 1. التحديث في Supabase مع فلتر company_id الإجباري
      if (supabase) {
        try {
          await supabase
            .from('departments')
            .update({
              name: newName,
              nameEn: dept.nameEn,
              code: dept.code,
              description: dept.description,
              managerId: dept.managerId,
              managerName: dept.managerName
            })
            .eq('id', dept.id)
            .eq('company_id', companyId);
        } catch (sbErr) {
          console.warn('[Supabase updateDepartment Fallback]:', sbErr);
        }
      }

      // تحديث أسماء الأقسام للموظفين والطلبات في حال تغير اسم القسم
      if (newName !== oldName) {
        (db.employees || []).forEach(emp => {
          if (emp.department === oldName) emp.department = newName;
        });
        (db.requests || []).forEach(req => {
          if (req.department === oldName) req.department = newName;
        });
        if (db.department_permissions && db.department_permissions[oldName]) {
          db.department_permissions[newName] = db.department_permissions[oldName];
          delete db.department_permissions[oldName];
        }
      }

      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'UPDATE_DEPARTMENT',
        actionType: 'تعديل',
        target: 'departments',
        targetId: dept.id,
        details: `تحديث بيانات قسم: ${oldName} ${newName !== oldName ? `(الاسم الجديد: ${newName})` : ''} بشركة (${companyId})`,
        payload: { deptId, deptData, company_id: companyId }
      });

      return this.#createEnvelope(true, cloneData(dept), null, {
        department: cloneData(dept),
        message: `تم تحديث بيانات قسم (${newName}) بنجاح`
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في تحديث بيانات القسم');
    }
  }

  static async deleteDepartment(deptId, signal = null) {
    try {
      await this.simulateDelay(80, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      const idx = (db.departments || []).findIndex(d => d.id === deptId || d.name === deptId);
      if (idx === -1) return this.#createEnvelope(false, null, 'القسم غير موجود');

      const target = db.departments[idx];
      const assignedEmps = (db.employees || []).filter(e => e.department === target.name && e.status !== 'archived');
      if (assignedEmps.length > 0) {
        return this.#createEnvelope(false, null, `لا يمكن حذف القسم لوجود (${assignedEmps.length}) موظف مسجلين به. قم بنقلهم لقسم آخر أولاً.`);
      }

      // 1. الحذف من Supabase
      if (supabase) {
        try {
          await supabase
            .from('departments')
            .delete()
            .eq('id', target.id)
            .eq('company_id', companyId);
        } catch (sbErr) {
          console.warn('[Supabase deleteDepartment Fallback]:', sbErr);
        }
      }

      db.departments.splice(idx, 1);
      if (db.department_permissions && db.department_permissions[target.name]) {
        delete db.department_permissions[target.name];
      }
      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'DELETE_DEPARTMENT',
        actionType: 'حذف',
        target: 'departments',
        targetId: target.id,
        details: `حذف قسم إداري: ${target.name} (${target.id}) بشركة (${companyId})`
      });

      return this.#createEnvelope(true, { id: target.id, name: target.name }, null, {
        message: `تم حذف قسم (${target.name}) بنجاح`
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في حذف القسم');
    }
  }

  static async getDepartmentPermissions(departmentName, signal = null) {
    try {
      await this.simulateDelay(40, signal);
      const db = LocalDatabase.getDB();
      const permsMap = db.department_permissions || INITIAL_DATABASE.department_permissions || {};
      const deptPerms = permsMap[departmentName] || cloneData(INITIAL_DATABASE.role_permissions.employee);
      return this.#createEnvelope(true, cloneData(deptPerms));
    } catch (err) {
      return this.#handleError(err, 'فشل في جلب صلاحيات القسم');
    }
  }

  static async updateDepartmentPermissions(departmentName, permissions, signal = null) {
    try {
      await this.simulateDelay(80, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      if (!db.department_permissions) db.department_permissions = cloneData(INITIAL_DATABASE.department_permissions || {});

      db.department_permissions[departmentName] = {
        ...(db.department_permissions[departmentName] || {}),
        ...permissions
      };

      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'UPDATE_DEPT_PERMISSIONS',
        actionType: 'تعديل',
        target: 'department_permissions',
        targetId: departmentName,
        details: `تحديث مصفوفة الصلاحيات المخصصة لقسم: ${departmentName} بشركة (${companyId})`,
        payload: { departmentName, permissions, company_id: companyId }
      });

      return this.#createEnvelope(true, cloneData(db.department_permissions[departmentName]), null, {
        message: `تم حفظ الصلاحيات المخصصة لقسم (${departmentName}) بنجاح`
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في حفظ صلاحيات القسم');
    }
  }

  static async getAllDepartmentPermissions(signal = null) {
    try {
      await this.simulateDelay(50, signal);
      const db = LocalDatabase.getDB();
      const perms = db.department_permissions || INITIAL_DATABASE.department_permissions || {};
      return this.#createEnvelope(true, cloneData(perms));
    } catch (err) {
      return this.#handleError(err, 'فشل في جلب مصفوفة صلاحيات الأقسام');
    }
  }

  /* ==========================================================================
     REQUESTS MODULE (طلبات الموظفين الـ 8 - عزل المستأجر)
     ========================================================================== */

  static async getRequests(filters = {}, signal = null) {
    try {
      await this.simulateDelay(60, signal);
      const companyId = this.getCurrentCompanyId();
      let list = null;

      // 1. استدعاء الطلبات من Supabase أولاً مع فلتر company_id الإجباري
      if (supabase) {
        try {
          let query = supabase
            .from('requests')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

          if (filters.employeeId) query = query.eq('employee_id', filters.employeeId);
          if (filters.type && filters.type !== 'all') query = query.eq('request_type', filters.type);
          if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);

          const { data, error } = await query;
          if (!error && Array.isArray(data)) {
            const db = LocalDatabase.getDB();
            const empMap = {};
            (db.employees || []).forEach(e => { empMap[e.id] = e; if (e.employee_code) empMap[e.employee_code] = e; });
            list = data.map(r => this.#normalizeRequest(r, empMap));
          }
        } catch (sbErr) {
          console.warn('[Supabase getRequests Fallback]:', sbErr);
        }
      }

      // 2. دمج الطلبات مع LocalDatabase
      const db = LocalDatabase.getDB();
      const localReqs = Array.isArray(db.requests) ? [...db.requests] : [];
      if (list === null) {
        list = localReqs;
      } else {
        // دمج ومزامنة حالة الطلبات المحلية مع السحابية
        localReqs.forEach(locReq => {
          const idx = list.findIndex(r => r.id === locReq.id || (r.employeeId === locReq.employeeId && (r.type === locReq.type || r.request_type === locReq.type)));
          if (idx !== -1) {
            if (locReq.status && locReq.status !== list[idx].status) {
              list[idx].status = locReq.status;
              if (locReq.reviewNotes) list[idx].reviewNotes = locReq.reviewNotes;
              if (locReq.reviewedAt) list[idx].reviewedAt = locReq.reviewedAt;
            }
          } else {
            list.push(locReq);
          }
        });
      }

      // 3. ربط وتزامن تلقائي: إذا كان الموظف active (معتمد)، فإن أي طلب انضمام onboarding خاص به يعتبر approved تلقائياً!
      const allLocalEmps = (db.employees || []);
      const empStatusMap = {};
      allLocalEmps.forEach(e => {
        if (e.id) empStatusMap[e.id] = e.status;
        if (e.employee_code) empStatusMap[e.employee_code] = e.status;
      });

      list.forEach(r => {
        if (r.type === 'onboarding' || r.request_type === 'onboarding') {
          const empStatus = empStatusMap[r.employeeId] || empStatusMap[r.employee_id];
          if (empStatus === 'active') {
            r.status = 'approved';
          }
        }
      });

      // 4. دمج طلبات اعتماد الموظفين المعلقين الجدد (Onboarding) فقط لمن لا يزال status = 'pending'
      const pendingEmps = allLocalEmps.filter(e => e.status === 'pending');
      pendingEmps.forEach(pEmp => {
        const alreadyExists = list.some(r => 
          (r.employeeId === pEmp.id || r.employee_id === pEmp.id || r.id === `REQ-ONB-${pEmp.id}`) &&
          (r.type === 'onboarding' || r.request_type === 'onboarding')
        );

        if (!alreadyExists) {
          const synthReq = {
            id: `REQ-ONB-${pEmp.id}`,
            company_id: pEmp.company_id || companyId,
            employee_id: pEmp.id,
            employeeId: pEmp.id,
            type: 'onboarding',
            request_type: 'onboarding',
            status: 'pending',
            startDate: pEmp.registeredAt ? pEmp.registeredAt.split('T')[0] : (pEmp.hireDate || new Date().toISOString().split('T')[0]),
            submittedAt: pEmp.registeredAt || pEmp.hireDate || new Date().toISOString(),
            createdAt: pEmp.registeredAt ? pEmp.registeredAt.split('T')[0] : (pEmp.hireDate || new Date().toISOString().split('T')[0]),
            reason: `طلب تسجيل وانضمام موظف جديد بقسم (${pEmp.department || 'عام'}) - بانتظار الاعتماد وتحديد الراتب والصلاحيات`,
            employee: pEmp,
            details: {
              fullName: pEmp.fullName,
              phone: pEmp.phone,
              email: pEmp.email,
              department: pEmp.department,
              jobTitle: pEmp.jobTitle,
              rawEmployee: pEmp
            }
          };
          list.unshift(synthReq);
        }
      });

      // 5. تطبيق الفلاتر الإضافية المطلوبة بدقة
      if (filters.employeeId) list = list.filter(r => r.employeeId === filters.employeeId || r.employee_id === filters.employeeId);
      if (filters.type && filters.type !== 'all') list = list.filter(r => (r.type === filters.type || r.request_type === filters.type));
      if (filters.status && filters.status !== 'all') list = list.filter(r => r.status === filters.status);
      if (filters.month) list = list.filter(r => (r.startDate || r.submittedAt || '').startsWith(filters.month));

      list.sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0));

      return this.#createEnvelope(true, cloneData(list));
    } catch (err) {
      return this.#handleError(err, 'فشل في استرجاع طلبات الموظفين');
    }
  }

  static async getRequestById(id, signal = null) {
    try {
      await this.simulateDelay(40, signal);
      const companyId = this.getCurrentCompanyId();
      let req = null;

      if (supabase) {
        try {
          const { data } = await supabase
            .from('requests')
            .select('*')
            .eq('id', id)
            .eq('company_id', companyId)
            .maybeSingle();
          if (data) {
            const db = LocalDatabase.getDB();
            const empMap = {};
            (db.employees || []).forEach(e => { empMap[e.id] = e; });
            req = this.#normalizeRequest(data, empMap);
          }
        } catch (e) {}
      }

      if (!req) {
        const db = LocalDatabase.getDB();
        req = (db.requests || []).find(r => r.id === id);
      }

      return req
        ? this.#createEnvelope(true, cloneData(req))
        : this.#createEnvelope(false, null, 'الطلب غير موجود');
    } catch (err) {
      return this.#handleError(err, 'فشل في البحث عن الطلب');
    }
  }

  static async createRequest(requestData, signal = null) {
    try {
      await this.simulateDelay(100, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      const emp = (db.employees || []).find(e => e.id === requestData.employeeId);
      if (!emp) return this.#createEnvelope(false, null, 'الموظف غير موجود');

      const type = requestData.type || 'annual_leave';
      const typeName = this.getRequestTypeName(type);
      const newId = `REQ-${Date.now()}`;
      const submittedAt = new Date().toISOString();

      const newRequest = {
        id: newId,
        company_id: companyId,
        employeeId: emp.id,
        employeeName: emp.fullName,
        department: emp.department,
        type: type,
        typeName: typeName,
        title: requestData.title || `طلب ${typeName}`,
        reason: requestData.reason || requestData.details || '',
        status: requestData.status || 'pending',
        startDate: requestData.startDate || null,
        endDate: requestData.endDate || null,
        daysCount: Number(requestData.daysCount || (requestData.startDate && requestData.endDate ? 1 : 0)),
        date: requestData.date || requestData.startDate || null,
        hours: requestData.hours ? Number(requestData.hours) : null,
        amount: requestData.amount ? Number(requestData.amount) : null,
        submittedAt: submittedAt,
        reviewedAt: null,
        reviewedBy: null,
        reviewNotes: '',
        manager_reply: requestData.manager_reply || '',
        ...requestData
      };

      // 1. الإدراج في Supabase أولاً مع حقل company_id الإجباري
      if (supabase) {
        try {
          await supabase.from('requests').insert([{
            id: newId,
            company_id: companyId,
            employee_id: emp.id,
            request_type: type,
            details: newRequest,
            status: newRequest.status,
            created_at: submittedAt
          }]);
        } catch (sbErr) {
          console.warn('[Supabase createRequest Fallback]:', sbErr);
        }
      }

      // 2. المزامنة مع LocalDatabase
      if (!Array.isArray(db.requests)) db.requests = [];
      db.requests.unshift(newRequest);

      // إذا كان معتمد مسبقاً يضاف لجدول leaves
      if (newRequest.status === 'approved' && ['annual_leave', 'casual_leave', 'sick_leave'].includes(type)) {
        if (!Array.isArray(db.leaves)) db.leaves = [];
        db.leaves.push({
          id: `LV-${newRequest.id.replace('REQ-', '')}`,
          company_id: companyId,
          employeeId: emp.id,
          employeeName: emp.fullName,
          department: emp.department,
          leaveType: type === 'annual_leave' ? 'annual' : (type === 'sick_leave' ? 'sick' : 'unpaid'),
          startDate: newRequest.startDate,
          endDate: newRequest.endDate,
          daysCount: newRequest.daysCount,
          reason: newRequest.reason,
          status: 'approved',
          approvedBy: 'الإدارة التنفيذية',
          createdAt: submittedAt.split('T')[0]
        });
      }

      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'CREATE_REQUEST',
        actionType: 'إضافة',
        target: 'requests',
        targetId: newId,
        details: `تقديم طلب (${typeName}) جديد للموظف: ${emp.fullName} (${emp.id}) بشركة (${companyId})`,
        payload: { ...newRequest, company_id: companyId }
      });

      return this.#createEnvelope(true, cloneData(newRequest), null, {
        request: cloneData(newRequest),
        message: `تم تقديم طلب (${typeName}) بنجاح وهو قيد المراجعة برقم (${newId})`
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في تسجيل الطلب');
    }
  }

  static async updateRequestStatus(requestId, status, reviewData = {}, signal = null) {
    try {
      await this.simulateDelay(80, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      const req = (db.requests || []).find(r => r.id === requestId);
      if (!req) return this.#createEnvelope(false, null, 'الطلب غير موجود');

      const prevStatus = req.status;
      req.status = status;
      req.reviewedAt = new Date().toISOString();
      req.reviewedBy = reviewData.reviewedBy || reviewData.approvedBy || AuditMiddleware.getCurrentActor(db).name;
      req.manager_reply = reviewData.manager_reply || reviewData.reviewNotes || reviewData.notes || '';
      req.reviewNotes = req.manager_reply;

      // 1. التحديث في Supabase مع فلتر company_id الإجباري
      if (supabase) {
        try {
          await supabase
            .from('requests')
            .update({
              status: status,
              reviewed_by: req.reviewedBy,
              review_notes: req.reviewNotes,
              details: req
            })
            .eq('id', requestId)
            .eq('company_id', companyId);
        } catch (sbErr) {
          console.warn('[Supabase updateRequestStatus Fallback]:', sbErr);
        }
      }

      // 2. مزامنة حالة الاعتماد مع الجداول المرتبطة
      if (status === 'approved' && prevStatus !== 'approved') {
        const emp = (db.employees || []).find(e => e.id === req.employeeId);
        if (emp) {
          if (['annual_leave', 'casual_leave', 'sick_leave'].includes(req.type)) {
            if (req.type === 'annual_leave' && req.daysCount) {
              emp.leaveBalance = Math.max(0, (emp.leaveBalance || 21) - req.daysCount);
            }
            if (!Array.isArray(db.leaves)) db.leaves = [];
            db.leaves.push({
              id: `LV-${req.id.replace('REQ-', '')}`,
              company_id: companyId,
              employeeId: emp.id,
              employeeName: emp.fullName,
              department: emp.department,
              leaveType: req.type === 'annual_leave' ? 'annual' : (req.type === 'sick_leave' ? 'sick' : 'unpaid'),
              startDate: req.startDate,
              endDate: req.endDate,
              daysCount: req.daysCount || 1,
              reason: req.reason,
              status: 'approved',
              approvedBy: req.reviewedBy,
              createdAt: req.submittedAt ? req.submittedAt.split('T')[0] : new Date().toISOString().split('T')[0]
            });
          } else if (req.type === 'morning_delay' || req.type === 'early_leave') {
            if (!Array.isArray(db.permissions)) db.permissions = [];
            db.permissions.push({
              id: `PRM-${req.id.replace('REQ-', '')}`,
              company_id: companyId,
              employeeId: emp.id,
              employeeName: emp.fullName,
              date: req.date || req.startDate || new Date().toISOString().split('T')[0],
              permissionType: req.type,
              hours: req.hours || 1,
              reason: req.reason,
              status: 'approved',
              approvedBy: req.reviewedBy
            });
          }
        }
      }

      LocalDatabase.saveDB(db);

      const actionName = status === 'approved' ? 'APPROVE_REQUEST' : 'REJECT_REQUEST';
      const actionTypeName = status === 'approved' ? 'اعتماد' : 'رفض';
      AuditMiddleware.log({
        action: actionName,
        actionType: actionTypeName,
        target: 'requests',
        targetId: req.id,
        details: `${actionTypeName} طلب (${req.typeName} - ${req.id}) للموظف ${req.employeeName} بشركة (${companyId}) بواسطة: ${req.reviewedBy}`,
        payload: { requestId, status, reviewData, company_id: companyId }
      });

      return this.#createEnvelope(true, cloneData(req), null, {
        request: cloneData(req),
        message: `تم ${actionTypeName} الطلب بنجاح`
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في تحديث حالة الطلب');
    }
  }

  static async approveRequest(requestId, reviewData = {}, signal = null) {
    return this.updateRequestStatus(requestId, 'approved', reviewData, signal);
  }

  static async rejectRequest(requestId, reviewData = {}, signal = null) {
    return this.updateRequestStatus(requestId, 'rejected', reviewData, signal);
  }

  static async deleteRequest(requestId, signal = null) {
    try {
      await this.simulateDelay(60, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();

      // 1. الحذف من Supabase مع فلتر company_id الإجباري
      if (supabase) {
        try {
          await supabase
            .from('requests')
            .delete()
            .eq('id', requestId)
            .eq('company_id', companyId);
        } catch (sbErr) {
          console.warn('[Supabase deleteRequest Fallback]:', sbErr);
        }
      }

      const idx = (db.requests || []).findIndex(r => r.id === requestId);
      if (idx !== -1) {
        const [removed] = db.requests.splice(idx, 1);
        LocalDatabase.saveDB(db);
        AuditMiddleware.log({
          action: 'DELETE_REQUEST',
          actionType: 'حذف',
          target: 'requests',
          targetId: requestId,
          details: `حذف طلب (${removed.typeName} - ${removed.id}) للموظف: ${removed.employeeName} بشركة (${companyId})`
        });
      }

      return this.#createEnvelope(true, { id: requestId }, null, { message: 'تم حذف الطلب بنجاح' });
    } catch (err) {
      return this.#handleError(err, 'فشل في حذف الطلب');
    }
  }

  /* ==========================================================================
     AUDIT LOGS MODULE (سجل الرقابة والتدقيق الأمني)
     ========================================================================== */

  static async getAuditLogs(filters = {}, signal = null) {
    try {
      await this.simulateDelay(60, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      let logs = Array.isArray(db.audit_logs) ? [...db.audit_logs] : [];

      if (filters.actionType && filters.actionType !== 'all') {
        logs = logs.filter(l => l.actionType === filters.actionType);
      }
      if (filters.target && filters.target !== 'all') {
        logs = logs.filter(l => l.target === filters.target);
      }
      if (filters.employeeId) {
        logs = logs.filter(l => l.performedBy?.id === filters.employeeId);
      }
      if (filters.search) {
        const q = String(filters.search).toLowerCase();
        logs = logs.filter(l =>
          (l.details || '').toLowerCase().includes(q) ||
          (l.performedBy?.name || '').toLowerCase().includes(q) ||
          (l.action || '').toLowerCase().includes(q)
        );
      }
      if (filters.date) {
        logs = logs.filter(l => (l.timestamp || '').startsWith(filters.date));
      }

      logs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      return this.#createEnvelope(true, cloneData(logs));
    } catch (err) {
      return this.#handleError(err, 'فشل في استرجاع سجل التدقيق والرقابة');
    }
  }

  static async logAuditEvent(eventData) {
    return AuditMiddleware.log(eventData);
  }

  static async clearAuditLogs(signal = null) {
    try {
      await this.simulateDelay(60, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      const count = (db.audit_logs || []).length;
      db.audit_logs = [];
      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'CLEAR_AUDIT_LOGS',
        actionType: 'حذف',
        target: 'audit_logs',
        targetId: companyId,
        details: `تم تفريغ سجل التدقيق والرقابة لشركة (${companyId}) [مسح ${count} سجل تدقيق]`
      });

      return this.#createEnvelope(true, { count }, null, {
        message: 'تم تفريغ سجل التدقيق بنجاح'
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في مسح سجل التدقيق');
    }
  }

  /* ==========================================================================
     EMPLOYEES CRUD & DATA ACCESS
     ========================================================================== */

  static async getEmployees(signal = null) {
    try {
      await this.simulateDelay(60, signal);
      const companyId = this.getCurrentCompanyId();
      let employees = null;

      // 1. استدعاء الموظفين من Supabase أولاً مع فلتر company_id الإجباري
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data)) {
            employees = data.map(e => this.#normalizeEmployee(e));
          }
        } catch (sbErr) {
          console.warn('[Supabase getEmployees Fallback]:', sbErr);
        }
      }

      // 2. آلية دمج الموظفين من LocalDatabase
      const db = LocalDatabase.getDB();
      const localEmps = (db.employees || []).filter(e => !e.company_id || e.company_id === companyId).map(e => this.#normalizeEmployee(e));

      if (employees === null) {
        employees = localEmps;
      } else {
        localEmps.forEach(le => {
          if (!employees.some(e => e.id === le.id || (e.employee_code && e.employee_code === le.employee_code))) {
            employees.push(le);
          }
        });
      }

      return this.#createEnvelope(true, cloneData(employees));
    } catch (err) {
      return this.#handleError(err, 'فشل في استرجاع قائمة الموظفين');
    }
  }

  static async getEmployeeById(id, signal = null) {
    try {
      await this.simulateDelay(40, signal);
      const companyId = this.getCurrentCompanyId();
      let emp = null;

      // 1. استدعاء الموظف من Supabase مع فلتر company_id
      if (supabase) {
        try {
          const { data } = await supabase
            .from('employees')
            .select('*')
            .eq('id', id)
            .eq('company_id', companyId)
            .maybeSingle();
          if (data) emp = this.#normalizeEmployee(data);
        } catch (e) {}
      }

      if (!emp) {
        const db = LocalDatabase.getDB();
        const found = (db.employees || []).find(e => e.id === id || e.employee_code === id);
        if (found) emp = this.#normalizeEmployee(found);
      }

      if (!emp) {
        const res = await this.getEmployees(signal);
        emp = (res.data || []).find(e => e.id === id || e.employee_code === id);
      }

      if (!emp) return this.#createEnvelope(false, null, 'الموظف غير موجود');
      return this.#createEnvelope(true, cloneData(emp));
    } catch (err) {
      return this.#handleError(err, 'فشل في استرجاع بيانات الموظف');
    }
  }

  static async findEmployee(query, signal = null) {
    try {
      await this.simulateDelay(40, signal);
      const companyId = this.getCurrentCompanyId();
      let emp = null;

      if (supabase) {
        try {
          const { data } = await supabase
            .from('employees')
            .select('*')
            .eq('company_id', companyId)
            .or(`id.eq.${query},pin.eq.${query}`)
            .maybeSingle();
          if (data) emp = this.#normalizeEmployee(data);
        } catch (e) {}
      }

      if (!emp) {
        const db = LocalDatabase.getDB();
        emp = (db.employees || []).find(e => e.id === query || String(e.pin).trim() === String(query).trim());
      }

      return emp
        ? this.#createEnvelope(true, cloneData(emp))
        : this.#createEnvelope(false, null, 'الموظف غير موجود', { message: 'الموظف غير موجود' });
    } catch (err) {
      return this.#handleError(err, 'فشل في البحث عن الموظف');
    }
  }

  static async createEmployee(empData, signal = null) {
    try {
      await this.simulateDelay(100, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();

      if ((db.employees || []).some(e => String(e.pin).trim() === String(empData.pin).trim())) {
        return this.#createEnvelope(false, null, 'رمز PIN مستخدم بالفعل لموظف آخر، يرجى توليد رمز مختلف', {
          message: 'رمز PIN مستخدم بالفعل لموظف آخر، يرجى توليد رمز مختلف'
        });
      }

      const newId = empData.id || await this.getNextEmployeeId();
      const normalized = this.#normalizeEmployee({
        role: 'employee',
        status: 'active',
        salesTarget: 0,
        salesAchieved: 0,
        commissionRate: 0,
        salaryStatus: 'processing',
        leaveBalance: 21,
        ...empData,
        id: newId,
        company_id: companyId
      });

      // 1. الإدراج في Supabase أولاً مع حقل company_id
      if (supabase) {
        try {
          const sbPayload = this.#toSupabaseEmployee(normalized, companyId);
          await supabase.from('employees').insert([sbPayload]);
        } catch (sbErr) {
          console.warn('[Supabase createEmployee Fallback]:', sbErr);
        }
      }

      // 2. الحفظ في LocalDatabase
      if (!Array.isArray(db.employees)) db.employees = [];
      db.employees.push(normalized);
      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'CREATE_EMPLOYEE',
        actionType: 'إضافة',
        target: 'employees',
        targetId: newId,
        details: `إضافة موظف جديد: ${normalized.fullName} (${newId}) بشركة (${companyId}) - قسم ${normalized.department}`,
        payload: { ...empData, company_id: companyId }
      });

      return this.#createEnvelope(true, cloneData(normalized), null, { message: 'تمت إضافة الموظف بنجاح' });
    } catch (err) {
      return this.#handleError(err, 'فشل في إضافة الموظف');
    }
  }

  static async updateEmployee(id, updatedFields, signal = null) {
    try {
      await this.simulateDelay(100, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();

      const safeFields = { ...updatedFields };
      delete safeFields.company_id; // حماية عزل المستأجر

      if (safeFields.pin && (db.employees || []).some(e => String(e.pin).trim() === String(safeFields.pin).trim() && e.id !== id)) {
        return this.#createEnvelope(false, null, 'رمز PIN مستخدم لموظف آخر بالفعل', { message: 'رمز PIN مستخدم لموظف آخر بالفعل' });
      }

      // 1. التحديث في Supabase أولاً مع فلتر company_id الإجباري
      if (supabase) {
        try {
          const sbUpdate = {};
          if (safeFields.pin) sbUpdate.pin = String(safeFields.pin).trim();
          if (safeFields.role) sbUpdate.role = safeFields.role;
          if (safeFields.status) sbUpdate.status = safeFields.status;
          if (safeFields.department) sbUpdate.department = safeFields.department;
          if (safeFields.jobTitle || safeFields.job_title) sbUpdate.job_title = safeFields.jobTitle || safeFields.job_title;
          if (safeFields.baseSalary || safeFields.salary) sbUpdate.salary = Number(safeFields.baseSalary || safeFields.salary);
          if (safeFields.email) sbUpdate.email = safeFields.email;
          if (safeFields.phone) sbUpdate.phone = safeFields.phone;
          if (safeFields.fullName) {
            const parts = safeFields.fullName.trim().split(' ');
            sbUpdate.first_name = parts[0] || '';
            sbUpdate.last_name = parts.slice(1).join(' ') || '';
          }

          if (Object.keys(sbUpdate).length > 0) {
            await supabase
              .from('employees')
              .update(sbUpdate)
              .eq('id', id)
              .eq('company_id', companyId);
          }
        } catch (sbErr) {
          console.warn('[Supabase updateEmployee Fallback]:', sbErr);
        }
      }

      // 2. التحديث في LocalDatabase
      const idx = (db.employees || []).findIndex(e => e.id === id || e.employee_code === id);
      if (idx !== -1) {
        db.employees[idx] = { ...db.employees[idx], ...safeFields };
        LocalDatabase.saveDB(db);
      }

      AuditMiddleware.log({
        action: 'UPDATE_EMPLOYEE',
        actionType: 'تعديل',
        target: 'employees',
        targetId: id,
        details: `تحديث بيانات الموظف: (${id}) بشركة (${companyId})`,
        payload: { ...safeFields, company_id: companyId }
      });

      const updatedEmp = idx !== -1 ? db.employees[idx] : { id, ...safeFields };
      return this.#createEnvelope(true, cloneData(updatedEmp), null, { message: 'تم تحديث بيانات الموظف بنجاح' });
    } catch (err) {
      return this.#handleError(err, 'فشل في تحديث بيانات الموظف');
    }
  }

  static async deleteEmployee(id, signal = null) {
    try {
      await this.simulateDelay(80, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();

      // 1. الحذف من Supabase مع فلتر company_id الإجباري
      if (supabase) {
        try {
          await supabase
            .from('employees')
            .delete()
            .eq('id', id)
            .eq('company_id', companyId);
        } catch (sbErr) {
          console.warn('[Supabase deleteEmployee Fallback]:', sbErr);
        }
      }

      // 2. الحذف من LocalDatabase
      const targetEmp = (db.employees || []).find(e => e.id === id);
      const empName = targetEmp ? targetEmp.fullName : id;
      db.employees = (db.employees || []).filter(e => e.id !== id);
      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'DELETE_EMPLOYEE',
        actionType: 'حذف',
        target: 'employees',
        targetId: id,
        details: `حذف سجل الموظف: ${empName} (${id}) نهائياً من شركة (${companyId})`
      });

      return this.#createEnvelope(true, { id }, null, { message: 'تم حذف الموظف بنجاح' });
    } catch (err) {
      return this.#handleError(err, 'فشل في حذف الموظف');
    }
  }

  /* ==========================================================================
     GPS & SMART ATTENDANCE ENGINE (REAL GEOFENCING + MULTI-TENANT)
     ========================================================================== */

  static async punchAttendance(input, signal = null) {
    try {
      await this.simulateDelay(120, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      const localSettings = db.settings || {};

      // 1. جلب إعدادات الشركة والنطاق الجغرافي من جدول companies في Supabase كأساس
      let compLat = null;
      let compLng = null;
      let allowedRadius = 50;

      if (supabase) {
        try {
          const { data: comp } = await supabase
            .from('companies')
            .select('company_lat, company_lng, allowed_radius_meters, latitude, longitude')
            .eq('id', companyId)
            .maybeSingle();

          if (comp) {
            compLat = comp.company_lat ?? comp.latitude;
            compLng = comp.company_lng ?? comp.longitude;
            if (comp.allowed_radius_meters) {
              allowedRadius = Number(comp.allowed_radius_meters);
            }
          }
        } catch (sbCompErr) {
          console.warn('[Geofencing Supabase Companies Fetch Warning]:', sbCompErr);
        }
      }

      if (!compLat || !compLng) {
        compLat = localSettings.company_lat ?? db.company_settings?.company_lat ?? 30.044420;
        compLng = localSettings.company_lng ?? db.company_settings?.company_lng ?? 31.235810;
        allowedRadius = Number(localSettings.allowed_radius_meters || 50);
      }

      // 2. التحقق من هوية الموظف في نطاق نفس الشركة (company_id)
      let employee = null;
      if (supabase) {
        try {
          let empQuery = supabase.from('employees').select('*').eq('company_id', companyId);
          if (input.employeeId) {
            empQuery = empQuery.or(`id.eq.${input.employeeId},employee_code.eq.${input.employeeId}`);
          } else if (input.pin) {
            empQuery = empQuery.eq('pin', String(input.pin).trim());
          }
          const { data: empData } = await empQuery.maybeSingle();
          if (empData) employee = this.#normalizeEmployee(empData);
        } catch (e) {}
      }

      if (!employee) {
        if (input.employeeId) {
          const localE = (db.employees || []).find(e => e.id === input.employeeId || e.employee_code === input.employeeId);
          if (localE) employee = cloneData(localE);
        } else if (input.pin) {
          const localE = (db.employees || []).find(e => String(e.pin).trim() === String(input.pin).trim());
          if (localE) employee = cloneData(localE);
        }
      }

      if (!employee) {
        const errMsg = input.pin ? 'رمز PIN المكون من 6 أرقام غير صحيح!' : 'بصمة الإصبع غير مطابقة لأي سجل وظيفي!';
        return this.#createEnvelope(false, null, errMsg, { message: errMsg });
      }

      if (employee.status === 'pending') {
        const msg = 'عفواً، لا يمكن تسجيل الحضور حتى يتم اعتماد حسابك من قبل إدارة الموارد البشرية.';
        return this.#createEnvelope(false, null, msg, { message: msg });
      }

      const now = new Date();
      const nowTimeStr = now.toTimeString().split(' ')[0]; // HH:mm:ss
      const todayStr = input.date || (typeof window !== 'undefined' && window.appStore?.state?.currentDate) || now.toISOString().split('T')[0];

      const locationCoords = input.location_coords || {
        lat: compLat,
        lng: compLng,
        label: localSettings.companyAddress || 'المقر الرئيسي المعتمد',
        accuracy: 10
      };

      // 3. تطبيق التحكم الجغرافي (Geofencing Verification) فعلياً
      if (locationCoords && locationCoords.lat && locationCoords.lng && compLat && compLng) {
        const distanceMeters = this.getDistanceFromLatLonInMeters(
          locationCoords.lat,
          locationCoords.lng,
          compLat,
          compLng
        );

        if (distanceMeters > allowedRadius) {
          const failMsg = `عفواً، لا يمكن تسجيل البصمة! أنت خارج النطاق الجغرافي المسموح به لمقر الشركة (المسافة الحالية: ${distanceMeters} متر، والحد الأقصى المسموح به: ${allowedRadius} متر).`;
          return this.#createEnvelope(false, null, failMsg, {
            message: failMsg,
            distanceMeters,
            allowedRadius,
            geofenceViolation: true
          });
        }
      }

      // 4. استرجاع سجل اليوم للموظف من Supabase أولاً بعزل company_id
      let todayRecord = null;
      if (supabase) {
        try {
          const { data: sbAtt } = await supabase
            .from('attendance')
            .select('*')
            .eq('company_id', companyId)
            .eq('employee_id', employee.id)
            .eq('date', todayStr)
            .maybeSingle();
          if (sbAtt) {
            todayRecord = this.#normalizeAttendance(sbAtt, { [employee.id]: employee });
          }
        } catch (e) {}
      }

      if (!todayRecord) {
        const localRec = (db.attendance || []).find(a => a.employeeId === employee.id && a.date === todayStr);
        if (localRec) todayRecord = cloneData(localRec);
      }

      let morningPerm = (db.permissions || []).find(p =>
        p.employeeId === employee.id &&
        p.date === todayStr &&
        p.permissionType === 'morning_delay' &&
        p.status === 'approved'
      );
      const permittedLateMins = morningPerm ? (morningPerm.hours * 60) : 0;

      let punchType = 'check_in';
      let message = '';

      if (!todayRecord || !todayRecord.checkIn) {
        // --- تسجيل الحضور (Check-In) ---
        punchType = 'check_in';
        const [shiftH, shiftM] = (employee.shiftStart || localSettings.officialCheckIn || '08:00').split(':').map(Number);
        const shiftStartDate = new Date(now);
        shiftStartDate.setHours(shiftH, shiftM, 0, 0);

        const diffMs = now - shiftStartDate;
        const rawLateMins = diffMs > 0 ? Math.floor(diffMs / (1000 * 60)) : 0;
        const netLateMins = Math.max(0, rawLateMins - permittedLateMins);
        const isLateAfterGrace = netLateMins > (localSettings.gracePeriodMinutes || 15);
        const status = isLateAfterGrace ? 'late' : 'present';

        if (rawLateMins === 0) {
          message = 'تم تسجيل الحضور في الوقت المحدد بنجاح (الموقع الجغرافي موثق). يومك سعيد ومثمر!';
        } else if (permittedLateMins > 0 && netLateMins <= (localSettings.gracePeriodMinutes || 15)) {
          message = `تم تسجيل الحضور مع إذن مسبق (${morningPerm.hours} ساعة). معفى من الخصم (GPS موثق).`;
        } else if (rawLateMins <= (localSettings.gracePeriodMinutes || 15)) {
          message = `تم تسجيل الحضور ضمن فترة السماح (${localSettings.gracePeriodMinutes || 15} دقيقة) مع توثيق GPS.`;
        } else {
          message = `تم تسجيل الحضور مع تأخير قدره ${netLateMins} دقيقة (GPS موثق).`;
        }

        const newRecord = {
          id: `ATT-${todayStr.replace(/-/g, '')}-${employee.id}`,
          company_id: companyId,
          employeeId: employee.id,
          employeeName: employee.fullName,
          department: employee.department,
          date: todayStr,
          checkIn: nowTimeStr,
          checkOut: null,
          actualHours: 0,
          lateMinutes: netLateMins,
          earlyLeaveMinutes: 0,
          overtimeHours: 0,
          status: status,
          location_coords: locationCoords,
          notes: message
        };

        // إدراج الحضور في Supabase أولاً
        if (supabase) {
          try {
            await supabase.from('attendance').upsert([{
              id: newRecord.id,
              company_id: companyId,
              employee_id: employee.id,
              date: todayStr,
              check_in: now.toISOString(),
              check_in_lat: locationCoords.lat || null,
              check_in_lng: locationCoords.lng || null,
              status: status,
              notes: message
            }], { onConflict: 'company_id,employee_id,date' });
          } catch (sbAttErr) {
            console.warn('[Supabase Attendance Insert Fallback]:', sbAttErr);
          }
        }

        // تحديث LocalDatabase
        if (!Array.isArray(db.attendance)) db.attendance = [];
        const existingIdx = db.attendance.findIndex(a => a.employeeId === employee.id && a.date === todayStr);
        if (existingIdx !== -1) db.attendance[existingIdx] = newRecord;
        else db.attendance.push(newRecord);
        LocalDatabase.saveDB(db);

        AuditMiddleware.log({
          action: 'ATTENDANCE_CHECK_IN',
          actionType: 'تسجيل',
          target: 'attendance',
          targetId: newRecord.id,
          performedBy: {
            id: employee.id,
            name: employee.fullName,
            role: employee.role,
            roleArabic: this.getRoleArabicTitle(employee.role)
          },
          details: `تسجيل حضور للموظف: ${employee.fullName} (${employee.id}) بشركة (${companyId}) في ${nowTimeStr} [GPS موثق] - الحالة: ${status}`,
          payload: { location_coords: locationCoords, status, company_id: companyId }
        });

        return this.#createEnvelope(true, cloneData(newRecord), null, {
          punchType: 'check_in',
          employee: cloneData(employee),
          timestamp: nowTimeStr,
          date: todayStr,
          status: status,
          lateMinutes: netLateMins,
          overtimeHours: 0,
          actualHours: 0,
          earlyLeaveMinutes: 0,
          location_coords: locationCoords,
          message: message,
          record: cloneData(newRecord)
        });

      } else if (todayRecord.checkIn && !todayRecord.checkOut) {
        // --- تسجيل الانصراف (Check-Out) ---
        punchType = 'check_out';

        const inTime = new Date(`${todayStr}T${todayRecord.checkIn}`);
        const workedMs = now - inTime;
        const actualHours = Number((workedMs / (1000 * 60 * 60)).toFixed(2));

        const [endH, endM] = (employee.shiftEnd || localSettings.officialCheckOut || '16:00').split(':').map(Number);
        const shiftEndDate = new Date(now);
        shiftEndDate.setHours(endH, endM, 0, 0);

        let overtimeHours = 0;
        let earlyLeaveMinutes = 0;

        const diffEndMs = now - shiftEndDate;
        if (diffEndMs > 0) {
          overtimeHours = Number((diffEndMs / (1000 * 60 * 60)).toFixed(2));
          message = `تم تسجيل الانصراف بنجاح! لديك ساعات إضافية: ${overtimeHours} ساعة (GPS موثق).`;
        } else {
          const rawEarlyMins = Math.floor(Math.abs(diffEndMs) / (1000 * 60));
          const earlyPerm = (db.permissions || []).find(p =>
            p.employeeId === employee.id &&
            p.date === todayStr &&
            p.permissionType === 'early_leave' &&
            p.status === 'approved'
          );
          const permittedEarlyMins = earlyPerm ? (earlyPerm.hours * 60) : 0;
          earlyLeaveMinutes = Math.max(0, rawEarlyMins - permittedEarlyMins);

          if (earlyLeaveMinutes > 0) {
            message = `تم تسجيل الانصراف مبكراً بمقدار ${earlyLeaveMinutes} دقيقة (GPS موثق).`;
          } else {
            message = 'تم تسجيل الانصراف بنجاح مع إذن مبكر معتمد (GPS موثق). رافقتك السلامة!';
          }
        }

        todayRecord.checkOut = nowTimeStr;
        todayRecord.actualHours = actualHours;
        todayRecord.earlyLeaveMinutes = earlyLeaveMinutes;
        todayRecord.overtimeHours = overtimeHours;
        todayRecord.checkOut_coords = locationCoords;
        todayRecord.notes += ` | انصراف في ${nowTimeStr} [GPS موثق]`;

        // تحديث في Supabase أولاً
        if (supabase) {
          try {
            await supabase
              .from('attendance')
              .update({
                check_out: now.toISOString(),
                check_out_lat: locationCoords.lat || null,
                check_out_lng: locationCoords.lng || null,
                notes: todayRecord.notes
              })
              .eq('employee_id', employee.id)
              .eq('date', todayStr)
              .eq('company_id', companyId);
          } catch (sbAttOutErr) {
            console.warn('[Supabase Attendance CheckOut Fallback]:', sbAttOutErr);
          }
        }

        // تحديث LocalDatabase
        const localIdx = (db.attendance || []).findIndex(a => a.employeeId === employee.id && a.date === todayStr);
        if (localIdx !== -1) {
          db.attendance[localIdx] = todayRecord;
          LocalDatabase.saveDB(db);
        }

        AuditMiddleware.log({
          action: 'ATTENDANCE_CHECK_OUT',
          actionType: 'تسجيل',
          target: 'attendance',
          targetId: todayRecord.id,
          performedBy: {
            id: employee.id,
            name: employee.fullName,
            role: employee.role,
            roleArabic: this.getRoleArabicTitle(employee.role)
          },
          details: `تسجيل انصراف للموظف: ${employee.fullName} (${employee.id}) بشركة (${companyId}) في ${nowTimeStr} [ساعات العمل: ${actualHours}]`,
          payload: { actualHours, overtimeHours, earlyLeaveMinutes, location_coords: locationCoords, company_id: companyId }
        });

        return this.#createEnvelope(true, cloneData(todayRecord), null, {
          punchType: 'check_out',
          employee: cloneData(employee),
          timestamp: nowTimeStr,
          date: todayStr,
          status: todayRecord.status,
          actualHours: actualHours,
          earlyLeaveMinutes: earlyLeaveMinutes,
          overtimeHours: overtimeHours,
          location_coords: locationCoords,
          message: message,
          record: cloneData(todayRecord)
        });

      } else {
        const msg = `الموظف (${employee.fullName}) أتم تسجيل الحضور والانصراف لهذا اليوم بالفعل (${todayRecord.checkIn} - ${todayRecord.checkOut}).`;
        return this.#createEnvelope(false, null, msg, { message: msg });
      }
    } catch (err) {
      return this.#handleError(err, 'فشل في معالجة تسجيل الحضور/الانصراف');
    }
  }

  static async getAttendanceLogs(filters = {}, signal = null) {
    try {
      await this.simulateDelay(60, signal);
      const companyId = this.getCurrentCompanyId();
      let records = null;

      // 1. استدعاء السجلات من Supabase أولاً مع فلتر company_id الإجباري
      if (supabase) {
        try {
          let query = supabase
            .from('attendance')
            .select('*')
            .eq('company_id', companyId)
            .order('date', { ascending: false });

          if (filters.date) query = query.eq('date', filters.date);
          if (filters.employeeId) query = query.eq('employee_id', filters.employeeId);
          if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);

          const { data, error } = await query;
          if (!error && Array.isArray(data)) {
            const db = LocalDatabase.getDB();
            const empMap = {};
            (db.employees || []).forEach(e => { empMap[e.id] = e; });
            records = data.map(a => this.#normalizeAttendance(a, empMap));
          }
        } catch (sbErr) {
          console.warn('[Supabase getAttendanceLogs Fallback]:', sbErr);
        }
      }

      // 2. آلية Fallback على LocalDatabase
      if (records === null) {
        const db = LocalDatabase.getDB();
        records = [...(db.attendance || [])];
        if (filters.date) records = records.filter(r => r.date === filters.date);
        if (filters.month) records = records.filter(r => r.date.startsWith(filters.month));
        if (filters.employeeId) records = records.filter(r => r.employeeId === filters.employeeId);
        if (filters.department && filters.department !== 'all') records = records.filter(r => r.department === filters.department);
        if (filters.status && filters.status !== 'all') records = records.filter(r => r.status === filters.status);
        records.sort((a, b) => new Date(`${b.date}T${b.checkIn || '00:00:00'}`) - new Date(`${a.date}T${a.checkIn || '00:00:00'}`));
      }

      return this.#createEnvelope(true, cloneData(records));
    } catch (err) {
      return this.#handleError(err, 'فشل في استرجاع سجلات الحضور والانصراف');
    }
  }

  static async saveManualAttendance(entry, signal = null) {
    try {
      await this.simulateDelay(100, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      const emp = (db.employees || []).find(e => e.id === entry.employeeId);
      if (!emp) return this.#createEnvelope(false, null, 'الموظف غير موجود');

      const recordId = entry.id || `ATT-${entry.date.replace(/-/g, '')}-${emp.id}`;
      let actualHours = entry.actualHours || 0;
      if (entry.checkIn && entry.checkOut) {
        const inT = new Date(`${entry.date}T${entry.checkIn}`);
        const outT = new Date(`${entry.date}T${entry.checkOut}`);
        if (outT > inT) actualHours = Number(((outT - inT) / (1000 * 60 * 60)).toFixed(2));
      }

      const newRecord = {
        id: recordId,
        company_id: companyId,
        employeeId: emp.id,
        employeeName: emp.fullName,
        department: emp.department,
        date: entry.date,
        checkIn: entry.checkIn || null,
        checkOut: entry.checkOut || null,
        actualHours: actualHours,
        lateMinutes: Number(entry.lateMinutes || 0),
        earlyLeaveMinutes: Number(entry.earlyLeaveMinutes || 0),
        overtimeHours: Number(entry.overtimeHours || 0),
        status: entry.status || (entry.lateMinutes > 15 ? 'late' : 'present'),
        location_coords: entry.location_coords || {
          lat: 30.0444,
          lng: 31.2357,
          label: 'المقر الإداري - تعديل يدوي معتمد',
          accuracy: 5
        },
        notes: entry.notes || 'تعديل يدوي بواسطة إدارة الموارد البشرية'
      };

      // 1. الإدراج في Supabase أولاً مع حقل company_id
      if (supabase) {
        try {
          await supabase.from('attendance').upsert([{
            id: recordId,
            company_id: companyId,
            employee_id: emp.id,
            date: entry.date,
            check_in: entry.checkIn ? `${entry.date}T${entry.checkIn}` : null,
            check_out: entry.checkOut ? `${entry.date}T${entry.checkOut}` : null,
            status: newRecord.status,
            notes: newRecord.notes
          }], { onConflict: 'company_id,employee_id,date' });
        } catch (sbErr) {
          console.warn('[Supabase saveManualAttendance Fallback]:', sbErr);
        }
      }

      // 2. التحديث في LocalDatabase
      if (!Array.isArray(db.attendance)) db.attendance = [];
      const idx = db.attendance.findIndex(a => a.id === recordId || (a.employeeId === emp.id && a.date === entry.date));
      if (idx !== -1) db.attendance[idx] = newRecord;
      else db.attendance.push(newRecord);
      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'MANUAL_ATTENDANCE_OVERRIDE',
        actionType: 'تعديل',
        target: 'attendance',
        targetId: recordId,
        details: `تعديل يدوي لسجل حضور وانصراف الموظف: ${emp.fullName} (${emp.id}) بتاريخ ${entry.date} بشركة (${companyId})`,
        payload: { ...entry, company_id: companyId }
      });

      return this.#createEnvelope(true, cloneData(newRecord), null, { message: 'تم حفظ سجل الحضور بنجاح' });
    } catch (err) {
      return this.#handleError(err, 'فشل في حفظ سجل الحضور اليدوي');
    }
  }

  /* ==========================================================================
     LEAVES, PERMISSIONS & FINANCIAL ADJUSTMENTS (MULTI-TENANT)
     ========================================================================== */

  static async getLeaves(filters = {}, signal = null) {
    try {
      await this.simulateDelay(60, signal);
      const companyId = this.getCurrentCompanyId();
      let list = null;

      // 1. استدعاء الإجازات من Supabase مع فلتر company_id الإجباري
      if (supabase) {
        try {
          let query = supabase
            .from('leaves')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

          if (filters.employeeId) query = query.eq('employee_id', filters.employeeId);
          if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);

          const { data, error } = await query;
          if (!error && Array.isArray(data)) {
            const db = LocalDatabase.getDB();
            const empMap = {};
            (db.employees || []).forEach(e => { empMap[e.id] = e; });
            list = data.map(l => this.#normalizeLeave(l, empMap));
          }
        } catch (sbErr) {
          console.warn('[Supabase getLeaves Fallback]:', sbErr);
        }
      }

      // 2. آلية Fallback على LocalDatabase
      if (list === null) {
        const db = LocalDatabase.getDB();
        list = [...(db.leaves || [])];
        if (filters.employeeId) list = list.filter(l => l.employeeId === filters.employeeId);
        if (filters.status && filters.status !== 'all') list = list.filter(l => l.status === filters.status);
      }

      return this.#createEnvelope(true, cloneData(list));
    } catch (err) {
      return this.#handleError(err, 'فشل في استرجاع طلبات الإجازات');
    }
  }

  static async createLeave(leaveData, signal = null) {
    try {
      await this.simulateDelay(100, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      const emp = (db.employees || []).find(e => e.id === leaveData.employeeId);
      if (!emp) return this.#createEnvelope(false, null, 'الموظف غير موجود');

      const newLeave = {
        ...leaveData,
        id: `LV-${Math.floor(100 + Math.random() * 900)}`,
        company_id: companyId,
        employeeName: emp.fullName,
        department: emp.department,
        createdAt: new Date().toISOString().split('T')[0]
      };

      // 1. الإدراج في Supabase مع حقل company_id الإجباري
      if (supabase) {
        try {
          await supabase.from('leaves').insert([{
            id: newLeave.id,
            company_id: companyId,
            employee_id: emp.id,
            leave_type: newLeave.leaveType || 'annual',
            start_date: newLeave.startDate,
            end_date: newLeave.endDate,
            reason: newLeave.reason || 'إجازة رسمية',
            status: newLeave.status || 'pending',
            created_at: new Date().toISOString()
          }]);
        } catch (sbErr) {
          console.warn('[Supabase createLeave Fallback]:', sbErr);
        }
      }

      // 2. الحفظ في LocalDatabase
      if (!Array.isArray(db.leaves)) db.leaves = [];
      db.leaves.push(newLeave);

      // مزامنة مع requests
      if (!Array.isArray(db.requests)) db.requests = [];
      db.requests.unshift({
        id: `REQ-${newLeave.id.replace('LV-', '')}`,
        company_id: companyId,
        employeeId: emp.id,
        employeeName: emp.fullName,
        department: emp.department,
        type: newLeave.leaveType === 'annual' ? 'annual_leave' : (newLeave.leaveType === 'sick' ? 'sick_leave' : 'casual_leave'),
        typeName: newLeave.leaveType === 'annual' ? 'إجازة اعتيادي' : (newLeave.leaveType === 'sick' ? 'إجازة مرضي' : 'إجازة عارضة'),
        title: `طلب إجازة (${newLeave.leaveType})`,
        reason: newLeave.reason || 'إجازة عمل رسمية',
        status: newLeave.status || 'pending',
        startDate: newLeave.startDate,
        endDate: newLeave.endDate,
        daysCount: newLeave.daysCount,
        submittedAt: new Date().toISOString(),
        reviewedAt: null,
        reviewedBy: null
      });

      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'CREATE_LEAVE',
        actionType: 'إضافة',
        target: 'leaves',
        targetId: newLeave.id,
        details: `تقديم طلب إجازة (${newLeave.leaveType}) للموظف: ${emp.fullName} بشركة (${companyId})`,
        payload: { ...leaveData, company_id: companyId }
      });

      return this.#createEnvelope(true, cloneData(newLeave), null, { message: 'تم تقديم طلب الإجازة بنجاح' });
    } catch (err) {
      return this.#handleError(err, 'فشل في تسجيل طلب الإجازة');
    }
  }

  static async updateLeaveStatus(leaveId, status, approvedBy = 'إدارة الموارد البشرية', signal = null) {
    try {
      await this.simulateDelay(80, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      const item = (db.leaves || []).find(l => l.id === leaveId);
      if (!item) return this.#createEnvelope(false, null, 'طلب الإجازة غير موجود');

      item.status = status;
      item.approvedBy = approvedBy;

      // 1. التحديث في Supabase مع فلتر company_id الإجباري
      if (supabase) {
        try {
          await supabase
            .from('leaves')
            .update({
              status: status,
              reviewed_by: approvedBy
            })
            .eq('id', leaveId)
            .eq('company_id', companyId);
        } catch (sbErr) {
          console.warn('[Supabase updateLeaveStatus Fallback]:', sbErr);
        }
      }

      if (status === 'approved' && item.leaveType === 'annual') {
        const emp = (db.employees || []).find(e => e.id === item.employeeId);
        if (emp && emp.leaveBalance) {
          emp.leaveBalance = Math.max(0, emp.leaveBalance - Number(item.daysCount || 0));
        }
      }

      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'UPDATE_LEAVE_STATUS',
        actionType: status === 'approved' ? 'اعتماد' : 'رفض',
        target: 'leaves',
        targetId: leaveId,
        details: `${status === 'approved' ? 'اعتماد' : 'رفض'} طلب الإجازة (${leaveId}) للموظف ${item.employeeName} بشركة (${companyId}) بواسطة: ${approvedBy}`
      });

      return this.#createEnvelope(true, cloneData(item), null, { message: `تم تحديث حالة طلب الإجازة إلى: ${status}` });
    } catch (err) {
      return this.#handleError(err, 'فشل في تحديث حالة طلب الإجازة');
    }
  }

  static async getPermissions(signal = null) {
    try {
      await this.simulateDelay(50, signal);
      const db = LocalDatabase.getDB();
      return this.#createEnvelope(true, cloneData(db.permissions || []));
    } catch (err) {
      return this.#handleError(err, 'فشل في استرجاع أذونات الموظفين');
    }
  }

  static async createPermission(permData, signal = null) {
    try {
      await this.simulateDelay(80, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      const emp = (db.employees || []).find(e => e.id === permData.employeeId);
      if (!emp) return this.#createEnvelope(false, null, 'الموظف غير موجود');

      const newPerm = {
        ...permData,
        id: `PRM-${Math.floor(100 + Math.random() * 900)}`,
        company_id: companyId,
        employeeName: emp.fullName,
        status: permData.status || 'approved',
        approvedBy: permData.approvedBy || 'المشرف المباشر'
      };

      if (!Array.isArray(db.permissions)) db.permissions = [];
      db.permissions.push(newPerm);

      // مزامنة مع requests
      if (!Array.isArray(db.requests)) db.requests = [];
      db.requests.unshift({
        id: `REQ-${newPerm.id.replace('PRM-', '')}`,
        company_id: companyId,
        employeeId: emp.id,
        employeeName: emp.fullName,
        department: emp.department,
        type: newPerm.permissionType || 'morning_delay',
        typeName: newPerm.permissionType === 'morning_delay' ? 'إذن تأخير' : 'إذن خروج',
        title: `إذن موظف (${newPerm.permissionType === 'morning_delay' ? 'تأخير صباحي' : 'انصراف مبكر'})`,
        reason: newPerm.reason || 'إذن رسمي معتمد',
        status: newPerm.status || 'approved',
        date: newPerm.date,
        hours: newPerm.hours,
        submittedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        reviewedBy: newPerm.approvedBy
      });

      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'CREATE_PERMISSION',
        actionType: 'إضافة',
        target: 'permissions',
        targetId: newPerm.id,
        details: `تسجيل إذن (${newPerm.permissionType}) لمدة (${newPerm.hours} ساعة) للموظف: ${emp.fullName} بشركة (${companyId})`,
        payload: { ...permData, company_id: companyId }
      });

      return this.#createEnvelope(true, cloneData(newPerm), null, { message: 'تم تسجيل إذن الموظف بنجاح' });
    } catch (err) {
      return this.#handleError(err, 'فشل في تسجيل إذن الموظف');
    }
  }

  static async getAdjustments(filters = {}, signal = null) {
    try {
      await this.simulateDelay(60, signal);
      const companyId = this.getCurrentCompanyId();
      let list = null;

      // 1. استدعاء التسويات من Supabase مع فلتر company_id الإجباري
      if (supabase) {
        try {
          let query = supabase
            .from('adjustments')
            .select('*')
            .eq('company_id', companyId)
            .order('effective_date', { ascending: false });

          if (filters.employeeId) query = query.eq('employee_id', filters.employeeId);
          if (filters.type && filters.type !== 'all') query = query.eq('adjustment_type', filters.type);

          const { data, error } = await query;
          if (!error && Array.isArray(data)) {
            const db = LocalDatabase.getDB();
            const empMap = {};
            (db.employees || []).forEach(e => { empMap[e.id] = e; });
            list = data.map(a => this.#normalizeAdjustment(a, empMap));
          }
        } catch (sbErr) {
          console.warn('[Supabase getAdjustments Fallback]:', sbErr);
        }
      }

      // 2. آلية Fallback على LocalDatabase
      if (list === null) {
        const db = LocalDatabase.getDB();
        list = [...(db.adjustments || [])];
        if (filters.month) list = list.filter(a => a.month === filters.month);
        if (filters.employeeId) list = list.filter(a => a.employeeId === filters.employeeId);
        if (filters.type && filters.type !== 'all') list = list.filter(a => a.type === filters.type);
      }

      return this.#createEnvelope(true, cloneData(list));
    } catch (err) {
      return this.#handleError(err, 'فشل في استرجاع المعاملات المالية');
    }
  }

  static async createAdjustment(adjData, signal = null) {
    try {
      await this.simulateDelay(80, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();
      const emp = (db.employees || []).find(e => e.id === adjData.employeeId);
      if (!emp) return this.#createEnvelope(false, null, 'الموظف غير موجود');

      const newId = `ADJ-${Math.floor(100 + Math.random() * 900)}`;
      const effDate = adjData.date || new Date().toISOString().split('T')[0];
      const adjValue = Number(adjData.value ?? adjData.amount ?? 0);

      const newAdj = {
        ...adjData,
        id: newId,
        company_id: companyId,
        employeeName: emp.fullName,
        value: adjValue,
        amount: adjValue,
        date: effDate,
        month: adjData.month || effDate.slice(0, 7)
      };

      // 1. الإدراج في Supabase مع حقل company_id الإجباري
      if (supabase) {
        try {
          await supabase.from('adjustments').insert([{
            id: newId,
            company_id: companyId,
            employee_id: emp.id,
            adjustment_type: adjData.type || 'bonus',
            amount: adjValue,
            effective_date: effDate,
            status: 'approved'
          }]);
        } catch (sbErr) {
          console.warn('[Supabase createAdjustment Fallback]:', sbErr);
        }
      }

      // 2. الحفظ في LocalDatabase
      if (!Array.isArray(db.adjustments)) db.adjustments = [];
      db.adjustments.push(newAdj);
      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'CREATE_ADJUSTMENT',
        actionType: 'إضافة',
        target: 'adjustments',
        targetId: newId,
        details: `تسجيل معاملة مالية (${newAdj.type}) بقيمة (${adjValue} ج.م) للموظف: ${emp.fullName} بشركة (${companyId})`,
        payload: { ...adjData, company_id: companyId }
      });

      return this.#createEnvelope(true, cloneData(newAdj), null, { message: 'تم تسجيل المعاملة المالية بنجاح' });
    } catch (err) {
      return this.#handleError(err, 'فشل في إضافة المعاملة المالية');
    }
  }

  static async deleteAdjustment(id, signal = null) {
    try {
      await this.simulateDelay(60, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();

      // 1. الحذف من Supabase مع فلتر company_id الإجباري
      if (supabase) {
        try {
          await supabase
            .from('adjustments')
            .delete()
            .eq('id', id)
            .eq('company_id', companyId);
        } catch (sbErr) {
          console.warn('[Supabase deleteAdjustment Fallback]:', sbErr);
        }
      }

      const targetAdj = (db.adjustments || []).find(a => a.id === id);
      const adjDesc = targetAdj ? `${targetAdj.type} - ${targetAdj.employeeName}` : id;
      db.adjustments = (db.adjustments || []).filter(a => a.id !== id);
      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'DELETE_ADJUSTMENT',
        actionType: 'حذف',
        target: 'adjustments',
        targetId: id,
        details: `حذف المعاملة المالية رقم (${id}) [${adjDesc}] بشركة (${companyId})`
      });

      return this.#createEnvelope(true, { id }, null, { message: 'تم حذف المعاملة المالية بنجاح' });
    } catch (err) {
      return this.#handleError(err, 'فشل في حذف المعاملة المالية');
    }
  }

  /* ==========================================================================
     PAYROLL CALCULATION ENGINE (EGYPTIAN LABOR LAW + MULTI-TENANT)
     ========================================================================== */

  static async calculateMonthlyPayroll(monthStr = '2026-10', signal = null) {
    try {
      await this.simulateDelay(120, signal);
      const companyId = this.getCurrentCompanyId();

      // جلب الإعدادات والموظفين والحضور والتسويات التابعة لنفس الشركة
      const settingsRes = await this.getSettings(signal);
      const settings = settingsRes.data || {};

      const employeesRes = await this.getEmployees(signal);
      const allEmployees = employeesRes.data || [];
      const activeEmployees = allEmployees.filter(e => e.status !== 'pending' && e.status !== 'suspended');

      const attendanceRes = await this.getAttendanceLogs({ month: monthStr }, signal);
      const allAttendance = attendanceRes.data || [];

      const adjustmentsRes = await this.getAdjustments({ month: monthStr }, signal);
      const allAdjustments = adjustmentsRes.data || [];

      const workingDays = Number(settings.workingDaysPerMonth || 30);
      const dailyHours = Number(settings.workingHoursPerDay || 8);
      const overtimeMultiplier = Number(settings.overtimeRateMultiplier || 1.35);
      const absenceMultiplier = Number(settings.absencePenaltyMultiplier || 1.0);
      const gracePeriod = Number(settings.gracePeriodMinutes || 15);
      const tardinessMode = settings.tardinessDeductionMode || 'tiered';

      const payrollReport = activeEmployees.map(emp => {
        const baseSalary = Number(emp.baseSalary || 0);
        const housing = Number(emp.housingAllowance || 0);
        const transport = Number(emp.transportAllowance || 0);
        const otherAllowances = Number(emp.otherAllowances || 0);
        const totalAllowances = housing + transport + otherAllowances;

        const dailyRate = calculateDailyRate(baseSalary, workingDays);
        const hourlyRate = calculateHourlyRate(dailyRate, dailyHours);
        const minuteRate = calculateMinuteRate(hourlyRate);

        const empAttendance = allAttendance.filter(a => a.employeeId === emp.id && a.date.startsWith(monthStr));

        let totalOvertimeHours = 0;
        let totalLateMinutes = 0;
        let totalEarlyMinutes = 0;
        let latePenaltyAmount = 0;

        empAttendance.forEach(att => {
          const ot = Number(att.overtimeHours || 0);
          const late = Number(att.lateMinutes || 0);
          const early = Number(att.earlyLeaveMinutes || 0);

          totalOvertimeHours += ot;
          totalLateMinutes += late;
          totalEarlyMinutes += early;

          latePenaltyAmount += calculateLatePenalty(late, gracePeriod, tardinessMode, dailyRate, minuteRate);
        });

        const earlyLeavePenaltyAmount = Number((totalEarlyMinutes * minuteRate).toFixed(2));
        latePenaltyAmount = Number(latePenaltyAmount.toFixed(2));

        const overtimeEarnings = Number((totalOvertimeHours * hourlyRate * overtimeMultiplier).toFixed(2));

        const empAdjustments = allAdjustments.filter(adj => adj.employeeId === emp.id);
        const totalBonuses = Number(empAdjustments.filter(a => a.type === 'bonus').reduce((acc, a) => acc + (a.value || a.amount || 0), 0).toFixed(2));
        const totalAdminPenalties = Number(empAdjustments.filter(a => a.type === 'penalty').reduce((acc, a) => acc + (a.value || a.amount || 0), 0).toFixed(2));
        const totalLoans = Number(empAdjustments.filter(a => a.type === 'loan').reduce((acc, a) => acc + (a.value || a.amount || 0), 0).toFixed(2));

        const salesTarget = Number(emp.salesTarget || 0);
        const salesAchieved = Number(emp.salesAchieved || 0);
        const commissionRate = Number(emp.commissionRate || 0);
        const salesCommission = (salesTarget > 0 && salesAchieved >= salesTarget && commissionRate > 0)
          ? Number(((salesAchieved * commissionRate) / 100).toFixed(2))
          : 0;

        const unpaidDaysCount = 0;
        const unpaidLeaveDeduction = Number((unpaidDaysCount * dailyRate).toFixed(2));
        const unexcusedAbsenceDays = 0;
        const absenceDeduction = Number((unexcusedAbsenceDays * dailyRate * absenceMultiplier).toFixed(2));

        const insurancePercent = Number(emp.insurancePercent || settings.socialInsurancePercent || 11);
        const socialInsuranceDeduction = Number(((baseSalary * insurancePercent) / 100).toFixed(2));

        const grossEarnings = Number((baseSalary + totalAllowances + overtimeEarnings + totalBonuses + salesCommission).toFixed(2));
        const totalDeductions = Number((latePenaltyAmount + earlyLeavePenaltyAmount + unpaidLeaveDeduction + absenceDeduction + totalAdminPenalties + totalLoans + socialInsuranceDeduction).toFixed(2));
        const netSalary = Math.max(0, Number((grossEarnings - totalDeductions).toFixed(2)));

        return {
          employeeId: emp.id,
          employeeName: emp.fullName,
          department: emp.department,
          jobTitle: emp.jobTitle,
          role: emp.role,
          salaryStatus: emp.salaryStatus || 'processing',
          company_id: companyId,
          rates: {
            baseSalary,
            dailyRate,
            hourlyRate,
            minuteRate
          },
          earnings: {
            baseSalary,
            housing,
            transport,
            otherAllowances,
            totalAllowances,
            overtimeHours: totalOvertimeHours,
            overtimeEarnings,
            bonuses: totalBonuses,
            salesTarget,
            salesAchieved,
            commissionRate,
            salesCommission,
            gross: grossEarnings
          },
          deductions: {
            lateMinutes: totalLateMinutes,
            latePenalty: latePenaltyAmount,
            earlyMinutes: totalEarlyMinutes,
            earlyLeavePenalty: earlyLeavePenaltyAmount,
            unpaidDays: unpaidDaysCount,
            unpaidLeaveDeduction,
            unexcusedAbsenceDays,
            absenceDeduction,
            adminPenalties: totalAdminPenalties,
            loans: totalLoans,
            socialInsurance: socialInsuranceDeduction,
            total: totalDeductions
          },
          netSalary
        };
      });

      const summary = {
        month: monthStr,
        company_id: companyId,
        totalEmployees: payrollReport.length,
        totalGross: Number(payrollReport.reduce((acc, p) => acc + p.earnings.gross, 0).toFixed(2)),
        totalDeductions: Number(payrollReport.reduce((acc, p) => acc + p.deductions.total, 0).toFixed(2)),
        totalNetPayroll: Number(payrollReport.reduce((acc, p) => acc + p.netSalary, 0).toFixed(2)),
        totalOvertimePaid: Number(payrollReport.reduce((acc, p) => acc + p.earnings.overtimeEarnings, 0).toFixed(2)),
        totalCommissionsPaid: Number(payrollReport.reduce((acc, p) => acc + p.earnings.salesCommission, 0).toFixed(2)),
        totalPenaltiesDeducted: Number(payrollReport.reduce((acc, p) => acc + (p.deductions.latePenalty + p.deductions.adminPenalties), 0).toFixed(2))
      };

      return this.#createEnvelope(true, cloneData({ summary, payrollReport }), null, {
        summary: cloneData(summary),
        payrollReport: cloneData(payrollReport)
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في حساب مسير الرواتب الشهري');
    }
  }

  static async resetDatabase(signal = null) {
    try {
      await this.simulateDelay(100, signal);
      const companyId = this.getCurrentCompanyId();

      // 1. تصفير الجداول في Supabase للشركة الحالية مع الحفاظ على حساب المبرمج فقط
      if (supabase) {
        try {
          await Promise.allSettled([
            supabase.from('leaves').delete().eq('company_id', companyId),
            supabase.from('attendance').delete().eq('company_id', companyId),
            supabase.from('requests').delete().eq('company_id', companyId),
            supabase.from('adjustments').delete().eq('company_id', companyId),
            supabase.from('employees').delete().eq('company_id', companyId).neq('email', 'aemade2016@gmail.com')
          ]);
        } catch (sbErr) {
          console.warn('[Supabase Reset Warning]:', sbErr);
        }
      }

      // 2. تصفير قاعدة البيانات المحلية
      LocalDatabase.resetDB();

      // 3. تأكيد بقاء جلسة تسجيل الدخول لحساب المبرمج (م. أحمد عماد)
      const progSession = {
        employeeId: 'aa69f711-7ca3-41dc-b628-42a5dda853f6',
        email: 'aemade2016@gmail.com',
        role: 'programmer',
        normalizedRole: 'programmer',
        roleArabic: 'مدير نظام / مبرمج',
        authMethod: 'pin',
        company_id: companyId,
        companyId: companyId,
        loginTime: new Date().toISOString(),
        rememberMe: true
      };

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('JISR_AUTH_SESSION', JSON.stringify(progSession));
        sessionStorage.setItem('JISR_COMPANY_ID', companyId);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('JISR_AUTH_SESSION', JSON.stringify(progSession));
        localStorage.setItem('JISR_COMPANY_ID', companyId);
      }

      AuditMiddleware.log({
        action: 'RESET_DATABASE',
        actionType: 'تعديل',
        target: 'system',
        targetId: companyId,
        details: `استعادة ضبط المصنع وتصفير كافة البيانات التجريبية وحصر النظام على حساب المبرمج: aemade2016@gmail.com`
      });

      return this.#createEnvelope(true, null, null, { message: 'تم تصفير وإعادة ضبط كافة البيانات بنجاح' });
    } catch (err) {
      return this.#handleError(err, 'فشل في استعادة ضبط المصنع');
    }
  }
}


// Global browser registration
window.ApiService = ApiService;
window.AuditMiddleware = AuditMiddleware;
window.LocalDatabase = LocalDatabase;
window.USE_BACKEND_API = USE_BACKEND_API;

  if (supabase) {
    window.supabaseClient = supabase;
  }
})(typeof window !== 'undefined' ? window : this);