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

  const EMPLOYEE_PUBLIC_COLS = 'id, company_id, user_id, employee_code, first_name, last_name, email, phone, department, job_title, role, salary, hire_date, status, shift_start, shift_end, housing_allowance, transport_allowance, other_allowances, insurance_percent, leave_balance, sales_target, sales_achieved, commission_rate, salary_status, created_at, updated_at';
  const COMPANY_PUBLIC_COLS = 'id, name, tax_number, subscription_plan, is_active, company_lat, company_lng, allowed_radius_meters, status, manager_name, manager_phone, manager_email, created_at, updated_at';

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

// Avatar Presets for Male and Female
const DEFAULT_AVATARS = {
  male: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  female: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
};

function detectGender(fullName) {
  if (!fullName) return 'male';
  const name = String(fullName).trim();
  if (/^(مهندسة|دكتورة|أستاذة|مدام|آنسة|سيدة|م\/|د\/)\s/i.test(name)) return 'female';
  if (/^(مهندس|دكتور|أستاذ|سيد|م\.|د\.)\s/i.test(name) && !/(سارة|مريم|فاطمة|نور)/i.test(name)) return 'male';

  const parts = name.replace(/^(م\.|م\/|د\.|د\/|مهندس|مهندسة|أستاذ|أستاذة)\s+/i, '').trim().split(/\s+/);
  const firstName = parts[0] || '';

  const femaleNames = new Set([
    'فاطمة', 'فاطمه', 'مريم', 'سارة', 'ساره', 'نور', 'نورهان', 'نورا', 'ياسمين', 'هدى', 'منى', 
    'رانيا', 'داليا', 'أسماء', 'اسماء', 'شيرين', 'دينا', 'إيمان', 'ايمان', 'رحاب', 'آية', 'اية', 
    'بسمة', 'بسمه', 'سلمى', 'سلمي', 'هدير', 'رنا', 'نهى', 'نهي', 'رضوى', 'رضوي', 'أميرة', 'اميرة', 
    'اميره', 'أميره', 'هناء', 'نجلاء', 'مروة', 'مروه', 'ندى', 'ندي', 'ريم', 'خلود', 'عائشة', 
    'عائشه', 'خديجة', 'خديجه', 'زينب', 'فريدة', 'فريده', 'حبيبة', 'حبيبه', 'شهد', 'جنا', 'جنى', 
    'ملك', 'روان', 'آلاء', 'الاء', 'إسراء', 'اسراء', 'منار', 'يارا', 'هاجر', 'ميار', 'شروق', 
    'أروى', 'اروى', 'لمياء', 'صفاء', 'وفاء', 'ولاء', 'غادة', 'غاده', 'لبنى', 'لبني', 'عبير', 
    'هبة', 'هبه', 'رشا', 'سامية', 'ساميه', 'سحر', 'سهير', 'ماجدة', 'ماجده', 'نادية', 'ناديه'
  ]);

  if (femaleNames.has(firstName)) return 'female';
  if (firstName.endsWith('ة') || (firstName.endsWith('اء') && firstName.length > 3)) {
    const maleWithTa = new Set(['أسامة', 'اسامة', 'اسامه', 'أسامه', 'حمزة', 'حمزه', 'طلحة', 'طلحه', 'عبيدة', 'عبيده', 'عنترة', 'عنتره', 'قتادة', 'عكرمة']);
    if (!maleWithTa.has(firstName)) return 'female';
  }
  return 'male';
}

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
    phone: '01000000000',
    email: 'info@system.local',
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
      manager_name: 'المدير العام',
      managerName: 'المدير العام',
      phone: '01000000000',
      email: 'info@system.local',
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
  syncQueue: [],

  /* --------------------------------------------------------------------------
     سجلات الموظفين الأصلية (Employees)
     -------------------------------------------------------------------------- */
  employees: [],
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
          let emp = db?.employees?.find(e => e.id === session.employeeId || e.employee_code === session.employeeId || (session.email && e.email === session.email));
          if (emp) {
            return {
              id: emp.id,
              name: emp.fullName,
              role: emp.role || 'employee',
              roleArabic: ApiService.getRoleArabicTitle(emp.role)
            };
          }
          return {
            id: session.employeeId,
            name: session.name || 'مستخدم',
            role: session.role || 'employee',
            roleArabic: ApiService.getRoleArabicTitle(session.role)
          };
        }
      }
    } catch (e) {
      // ignore
    }
    const db = customDb || LocalDatabase.getDB();
    const firstEmp = db?.employees?.[0];
    if (firstEmp) {
      return {
        id: firstEmp.id,
        employee_code: firstEmp.employee_code || firstEmp.id,
        name: firstEmp.fullName,
        role: firstEmp.role || 'employee',
        roleArabic: ApiService.getRoleArabicTitle(firstEmp.role)
      };
    }
    return {
      id: 'SYS-ADMIN',
      employee_code: 'SYS-ADMIN',
      name: 'مدير النظام',
      role: 'admin',
      roleArabic: 'مدير نظام'
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
      const now = new Date(Date.now());
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

      // مزامنة فورية غير معطلة مع جدول audit_logs في Supabase
      if (typeof supabase !== 'undefined' && supabase && typeof supabase.from === 'function') {
        try {
          const compId = payload?.company_id || (typeof ApiService !== 'undefined' && typeof ApiService.getCurrentCompanyId === 'function' ? ApiService.getCurrentCompanyId() : null);
          const sbEntry = {
            company_id: compId,
            action: logEntry.action,
            target: logEntry.target,
            target_id: logEntry.targetId,
            details: logEntry.details,
            performed_by: actor.name || actor.id || 'SYSTEM'
          };
          const fromQ = supabase.from('audit_logs');
          if (fromQ && typeof fromQ.insert === 'function') {
            const insRes = fromQ.insert([sbEntry]);
            if (insRes && typeof insRes.then === 'function') {
              insRes.then(() => {}).catch(e => {
                console.warn('[Supabase AuditLog Insert Warning]:', e?.message || e);
              });
            }
          }
        } catch (e) {
          console.warn('[Supabase AuditLog Sync Warning]:', e);
        }
      }

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
          try { localStorage.removeItem(k); } catch (e) { console.warn('[Storage Cleanup]:', e); }
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
          if (!Array.isArray(parsed.syncQueue)) {
            parsed.syncQueue = [];
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

          if (!Array.isArray(parsed.employees) || parsed.employees.length === 0) {
            parsed.employees = cloneData(INITIAL_DATABASE.employees);
            needsSave = true;
          }

          // تم إزالة زراعة الموظف الوهمي لحماية خصوصية البيانات

          // تسوية ومزامنة الصور الشخصية بناءً على جنس الموظف (ذكر / أنثى) لجميع الموظفين
          if (Array.isArray(parsed.employees)) {
            parsed.employees.forEach(e => {
              if (!e.gender) {
                e.gender = detectGender(e.fullName || e.name);
                needsSave = true;
              }
              if (e.gender === 'male') {
                if (!e.avatar || e.avatar.includes('photo-1534528741775-53994a69daeb')) {
                  e.avatar = DEFAULT_AVATARS.male;
                  needsSave = true;
                }
              } else if (e.gender === 'female') {
                if (!e.avatar || e.avatar.includes('photo-1507003211169') || e.avatar.includes('photo-1535713875002') || e.avatar.includes('photo-1500648767791')) {
                  e.avatar = DEFAULT_AVATARS.female;
                  needsSave = true;
                }
              }
            });
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
        try {
          const raw = localStorage.getItem(this.#storageKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.syncQueue) && parsed.syncQueue.length > 0) {
              if (!Array.isArray(data.syncQueue)) {
                data.syncQueue = [...parsed.syncQueue];
              } else {
                parsed.syncQueue.forEach(item => {
                  if (!data.syncQueue.some(q => q.id === item.id)) {
                    data.syncQueue.push(item);
                  }
                });
              }
            }
          }
        } catch (_) {}
        localStorage.setItem(this.#storageKey, JSON.stringify(data));
      }
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  static resetDB() {
    try {
      this.#legacyKeys.forEach(k => {
        try { localStorage.removeItem(k); } catch (e) { console.warn('[Storage Cleanup]:', e); }
      });
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.#storageKey);
      }
    } catch (e) {
      console.warn('[Storage Reset Warning]:', e);
    }
    const fresh = cloneData(INITIAL_DATABASE);
    this.saveDB(fresh);
    return fresh;
  }

  static addToSyncQueue(item) {
    try {
      const db = this.getDB();
      if (!Array.isArray(db.syncQueue)) db.syncQueue = [];
      const queueId = item.id || `SYNC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const idx = db.syncQueue.findIndex(q => q.table === item.table && q.id === queueId);
      const queueItem = {
        id: queueId,
        table: item.table,
        action: item.action || 'upsert',
        payload: item.payload,
        match: item.match || null,
        context: item.context || '',
        error: item.error || '',
        queuedAt: new Date().toISOString(),
        attempts: 0
      };
      if (idx !== -1) {
        db.syncQueue[idx] = queueItem;
      } else {
        db.syncQueue.push(queueItem);
      }
      this.saveDB(db);
    } catch (e) {
      console.warn('[LocalDatabase addToSyncQueue Error]:', e);
    }
  }

  static getSyncQueue() {
    try {
      const db = this.getDB();
      return Array.isArray(db.syncQueue) ? db.syncQueue : [];
    } catch (e) {
      return [];
    }
  }

  static clearFromSyncQueue(id) {
    try {
      const db = this.getDB();
      if (!Array.isArray(db.syncQueue)) return;
      db.syncQueue = db.syncQueue.filter(q => q.id !== id);
      if (typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem(this.#storageKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.syncQueue)) {
              parsed.syncQueue = parsed.syncQueue.filter(q => q.id !== id);
              localStorage.setItem(this.#storageKey, JSON.stringify(parsed));
            }
          }
        } catch (_) {}
      }
      this.saveDB(db);
    } catch (e) {
      console.warn('[LocalDatabase clearFromSyncQueue Error]:', e);
    }
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

  /**
   * دالة موحدة لتنفيذ كافة عمليات الكتابة في Supabase وفحص الأخطاء
   * @param {Promise} promise استعلام Supabase
   * @param {string} context سياق العملية لتسجيل الأخطاء والواجهة
   * @param {object|null} entityInfo تفاصيل الكيان لجدولة المزامنة عند الفشل
   * @returns {Promise<{success: boolean, data: any, error: any}>}
   */
  static async sbWrite(promise, context = '', entityInfo = null) {
    if (!promise) return { success: true, data: null, error: null };
    try {
      const res = await promise;
      if (!res) return { success: true, data: null, error: null };
      const { data, error } = res;
      if (error) {
        console.error(`[Supabase Write Error] [${context}]:`, error);
        if (entityInfo) {
          if (entityInfo.record && typeof entityInfo.record === 'object') {
            entityInfo.record.pendingSync = true;
          }
          LocalDatabase.addToSyncQueue({
            ...entityInfo,
            context,
            error: error.message || String(error)
          });
        }
        if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
          window.showToast(`تحذير سحابي (${context}): تعذر الحفظ بالسحابة، تم الحفظ محلياً وجدولة المزامنة`, 'warning', 4500);
        }
        return { success: false, error, data: null };
      }
      return { success: true, data, error: null };
    } catch (err) {
      console.error(`[Supabase Write Exception] [${context}]:`, err);
      if (entityInfo) {
        if (entityInfo.record && typeof entityInfo.record === 'object') {
          entityInfo.record.pendingSync = true;
        }
        LocalDatabase.addToSyncQueue({
          ...entityInfo,
          context,
          error: err.message || String(err)
        });
      }
      if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
        window.showToast(`خطأ اتصال بالسحابة (${context}): تم الحفظ محلياً وستتم المزامنة تلقائياً`, 'warning', 4500);
      }
      return { success: false, error: err, data: null };
    }
  }

  /**
   * إعادة محاولة مزامنة السجلات العالقة (pendingSync) مع Supabase
   */
  static async retryPendingSync() {
    if (!supabase) return { synced: 0, failed: 0 };
    const queue = LocalDatabase.getSyncQueue();
    if (!queue || queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const item of [...queue]) {
      try {
        let op;
        const q = supabase.from(item.table);
        if (item.action === 'insert') {
          op = q.insert(Array.isArray(item.payload) ? item.payload : [item.payload]);
        } else if (item.action === 'upsert') {
          op = q.upsert(Array.isArray(item.payload) ? item.payload : [item.payload], item.options || {});
        } else if (item.action === 'update') {
          let uq = q.update(item.payload);
          if (item.match) {
            Object.entries(item.match).forEach(([k, v]) => { uq = uq.eq(k, v); });
          } else if (item.id) {
            uq = uq.eq('id', item.id);
          }
          op = uq;
        } else if (item.action === 'delete') {
          let dq = q.delete();
          if (item.match) {
            Object.entries(item.match).forEach(([k, v]) => { dq = dq.eq(k, v); });
          } else if (item.id) {
            dq = dq.eq('id', item.id);
          }
          op = dq;
        }

        if (op) {
          const { error } = await op;
          if (!error) {
            LocalDatabase.clearFromSyncQueue(item.id);
            const db = LocalDatabase.getDB();
            if (item.table && Array.isArray(db[item.table])) {
              const rec = db[item.table].find(r => r.id === item.id);
              if (rec) {
                delete rec.pendingSync;
                LocalDatabase.saveDB(db);
              }
            }
            synced++;
          } else {
            failed++;
          }
        }
      } catch (e) {
        console.warn(`[Sync Retry Exception] [${item.table}]:`, e);
        failed++;
      }
    }

    if (synced > 0 && typeof window !== 'undefined' && typeof window.showToast === 'function') {
      window.showToast(`تمت مزامنة ${synced} عملية بنجاح مع السحابة`, 'info', 3000);
    }
    return { synced, failed };
  }

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
      } catch (e) {
        console.warn('[Session Parse Error]:', e);
      }
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
    const empCode = emp.employee_code || emp.employeeCode || (String(emp.id || '').startsWith('EMP-') ? emp.id : 'EMP-0001');
    const role = emp.role || 'employee';
    return {
      id: emp.id || emp.employee_code,
      user_id: emp.user_id || emp.userId || null,
      userId: emp.user_id || emp.userId || null,
      employee_code: empCode,
      fullName: fullName,
      first_name: emp.first_name || fullName.split(' ')[0] || '',
      last_name: emp.last_name || fullName.split(' ').slice(1).join(' ') || '',
      gender: emp.gender || detectGender(fullName),
      avatar: (() => {
        const g = emp.gender || detectGender(fullName);
        if (emp.avatar && !(g === 'male' && emp.avatar.includes('photo-1534528741775-53994a69daeb'))) {
          return emp.avatar;
        }
        return g === 'female' ? DEFAULT_AVATARS.female : DEFAULT_AVATARS.male;
      })(),
      department: emp.department || 'العمليات والتشغيل',
      jobTitle: emp.jobTitle || emp.job_title || 'موظف',
      hireDate: emp.hireDate || emp.hire_date || new Date().toISOString().split('T')[0],
      shiftStart: emp.shiftStart || emp.shift_start || '08:00',
      shiftEnd: emp.shiftEnd || emp.shift_end || '16:00',
      baseSalary: Number(emp.baseSalary ?? emp.salary ?? 7000),
      housingAllowance: Number(emp.housingAllowance ?? 1000),
      transportAllowance: Number(emp.transportAllowance ?? 800),
      otherAllowances: Number(emp.otherAllowances ?? 500),
      insurancePercent: Number(emp.insurancePercent ?? 11),
      phone: emp.phone || '',
      email: emp.email || '',
      role: role,
      status: emp.status || 'active',
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
    const code = empData.employee_code || empData.employeeCode || (isUUID ? null : empData.id);
    const trimmedPin = empData.pin != null ? String(empData.pin).trim() : '';
    const hasPin = trimmedPin !== '' && trimmedPin !== 'undefined' && /^\d{6}$/.test(trimmedPin);
    const payload = {
      company_id: companyId,
      employee_code: code || empData.id,
      first_name: firstName,
      last_name: lastName,
      email: empData.email || null,
      phone: empData.phone || null,
      job_title: empData.jobTitle || empData.job_title || 'موظف',
      department: empData.department || 'العمليات والتشغيل',
      salary: Number(empData.baseSalary ?? empData.salary ?? 7000),
      role: empData.role || 'employee',
      status: empData.status || 'active',
      pin: hasPin ? trimmedPin : null,
      hire_date: empData.hireDate || empData.hire_date || new Date().toISOString().split('T')[0]
    };
    if (isUUID) {
      payload.id = empData.id;
    }
    if (empData.user_id || empData.userId) {
      payload.user_id = empData.user_id || empData.userId;
    }
    return payload;
  }

  /**
   * تحويل التاريخ إلى صيغة YYYY-MM-DD وفق توقيت القاهرة (Africa/Cairo)
   */
  static getCairoDateString(date = new Date()) {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Cairo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(date);
    } catch (e) {
      const tzOffset = 2 * 60;
      const cairoTime = new Date(date.getTime() + (tzOffset + date.getTimezoneOffset()) * 60000);
      return cairoTime.toISOString().split('T')[0];
    }
  }

  /**
   * تحويل الوقت إلى صيغة HH:mm:ss وفق توقيت القاهرة (Africa/Cairo)
   */
  static getCairoTimeString(date = new Date()) {
    try {
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        hourCycle: 'h23'
      });
      return formatter.format(date);
    } catch (e) {
      return date.toTimeString().split(' ')[0];
    }
  }

  /**
   * استخراج فارق التوقيت لمدينة القاهرة (+02:00 أو +03:00) لتاريخ محدد
   */
  static getCairoOffset(dateObj = new Date()) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Cairo',
        timeZoneName: 'longOffset'
      }).formatToParts(dateObj);
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      if (tzPart && tzPart.value) {
        const match = tzPart.value.match(/GMT([+-]\d{2}:\d{2})/);
        if (match) return match[1];
      }
    } catch (e) {}
    return '+02:00';
  }

  /**
   * تحويل التاريخ المحلي (YYYY-MM-DD) والوقت (HH:mm) إلى توقيت ISO UTC المتوافق مع عمود TIMESTAMPTZ في Supabase
   * يضمن حفظ 08:00 بتوقيت القاهرة كـ 06:00Z دون ترحيل الساعات عند استرجاعها
   */
  static formatLocalTimeToIsoUtc(dateStr, timeStr) {
    if (!timeStr) return null;
    const cleanTime = String(timeStr).trim();
    if (!cleanTime) return null;
    if (cleanTime.includes('T') && (cleanTime.endsWith('Z') || /[+-]\d{2}(:?\d{2})?$/.test(cleanTime))) {
      return cleanTime;
    }
    const dStr = dateStr || ApiService.getCairoDateString(new Date());
    const [y, m, d] = dStr.split('-').map(Number);
    const timePart = cleanTime.includes('T') ? cleanTime.split('T')[1] : cleanTime;
    const parts = timePart.split(':').map(Number);
    const hh = parts[0] || 0;
    const mm = parts[1] || 0;
    const ss = parts[2] || 0;

    const pad = (n) => String(n).padStart(2, '0');
    try {
      const approxDate = new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
      const offset = ApiService.getCairoOffset(approxDate);
      const isoWithOffset = `${dStr}T${pad(hh)}:${pad(mm)}:${pad(ss)}${offset}`;
      const dt = new Date(isoWithOffset);
      if (!isNaN(dt.getTime())) {
        return dt.toISOString();
      }
    } catch (e) {}

    const localDate = new Date(y, m - 1, d, hh, mm, ss, 0);
    return isNaN(localDate.getTime()) ? null : localDate.toISOString();
  }

  /**
   * تحويل طابع زمني أو وقت إلى توقيت القاهرة (HH:mm:ss)
   */
  static formatToCairoTime(val) {
    if (!val) return null;
    if (typeof val === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(val.trim())) {
      return val.trim().length === 5 ? `${val.trim()}:00` : val.trim();
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      return typeof val === 'string' && val.includes('T') ? val.split('T')[1].slice(0, 8) : String(val);
    }
    try {
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        hourCycle: 'h23'
      });
      return formatter.format(d);
    } catch (e) {
      return typeof val === 'string' && val.includes('T') ? val.split('T')[1].slice(0, 8) : d.toTimeString().split(' ')[0];
    }
  }

  /**
   * تطبيع كائن الحضور والانصراف مع تحويل التوقيت إلى القاهرة واحتساب الساعات من الطوابع الكاملة
   */
  static normalizeAttendance(att, empMap = {}) {
    return this.#normalizeAttendance(att, empMap);
  }

  /**
   * تطبيع كائن الحضور والانصراف
   */
  static #normalizeAttendance(att, empMap = {}) {
    if (!att) return null;
    const emp = empMap[att.employee_id || att.employeeId] || {};
    const empCode = emp.employee_code || emp.employeeCode || att.employee_code || att.employeeCode || '';

    const rawIn = att.check_in || att.checkIn;
    const rawOut = att.check_out || att.checkOut;

    const cairoCheckIn = rawIn ? ApiService.formatToCairoTime(rawIn) : null;
    const cairoCheckOut = rawOut ? ApiService.formatToCairoTime(rawOut) : null;

    let computedHours = null;
    if (rawIn && rawOut) {
      const inD = new Date(rawIn.includes('T') ? rawIn : `${att.date || '2000-01-01'}T${rawIn}`);
      let outD = new Date(rawOut.includes('T') ? rawOut : `${att.date || '2000-01-01'}T${rawOut}`);
      if (!rawOut.includes('T') && outD < inD) {
        outD.setDate(outD.getDate() + 1);
      }
      if (!isNaN(inD.getTime()) && !isNaN(outD.getTime()) && outD > inD) {
        computedHours = Number(((outD - inD) / (1000 * 60 * 60)).toFixed(2));
      }
    }

    const actualHours = computedHours !== null
      ? computedHours
      : Number(att.actualHours ?? att.actual_hours ?? 0);

    return {
      id: att.id,
      employeeId: att.employee_id || att.employeeId,
      employeeCode: empCode,
      employee_code: empCode,
      employeeName: att.employeeName || emp.fullName || att.employee_id,
      department: att.department || emp.department || '',
      date: att.date,
      checkIn: cairoCheckIn,
      checkOut: cairoCheckOut,
      actualHours: actualHours,
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
      let emp = null;
      let targetCompanyId = null;
      let sessionUser = null;

      // 1. استدعاء supabase.auth.getSession() أولاً
      if (supabase && supabase.auth && typeof supabase.auth.getSession === 'function') {
        try {
          const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
          if (!sessionErr && sessionData?.session?.user) {
            sessionUser = sessionData.session.user;
            const { data: empData, error: empErr } = await supabase
              .from('employees')
              .select(EMPLOYEE_PUBLIC_COLS)
              .eq('user_id', sessionUser.id)
              .maybeSingle();

            if (!empErr && empData && empData.status === 'active') {
              emp = this.#normalizeEmployee(empData);
              targetCompanyId = empData.company_id;
              if (targetCompanyId) this.setCurrentCompanyId(targetCompanyId);
            }
          }
        } catch (authErr) {
          console.warn('[Supabase getSession Warning]:', authErr);
        }
      }

      // 2. Fallback على التخزين المحلي (فقط عند تشغيل الاختبارات أو في بيئة بدون عميل Supabase)
      const isTestEnv = Boolean(typeof globalThis !== 'undefined' && globalThis.process?.env && (globalThis.process.env.NODE_ENV === 'test' || globalThis.process.env.NODE_TEST_CONTEXT)) ||
                        Boolean(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('jsdom'));
      let session = null;
      if (!emp && (isTestEnv || !supabase || !supabase.auth)) {
        let raw = null;
        if (typeof sessionStorage !== 'undefined') raw = sessionStorage.getItem('JISR_AUTH_SESSION');
        if (!raw && typeof localStorage !== 'undefined') raw = localStorage.getItem('JISR_AUTH_SESSION');
        if (raw) {
          try {
            session = JSON.parse(raw);
            const companyId = session.company_id || this.getCurrentCompanyId();
            this.setCurrentCompanyId(companyId);

            const db = LocalDatabase.getDB();
            const localEmp = (db.employees || []).find(e =>
              (session.user_id && e.user_id === session.user_id) ||
              e.id === session.employeeId ||
              e.employee_code === session.employeeId ||
              (session.email && e.email === session.email)
            );
            if (localEmp && localEmp.status === 'active') {
              emp = cloneData(localEmp);
              targetCompanyId = localEmp.company_id || companyId;
            }
          } catch (e) {}
        }
      }

      if (!emp) {
        if (typeof localStorage !== 'undefined') localStorage.removeItem('JISR_AUTH_SESSION');
        if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('JISR_AUTH_SESSION');
        return this.#createEnvelope(false, null, 'لا توجد جلسة نشطة');
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
        session: session || {
          employeeId: emp.id,
          user_id: emp.user_id || sessionUser?.id || null,
          email: emp.email,
          role: userRole
        },
        user: cloneData(emp),
        employee: cloneData(emp),
        companyId: targetCompanyId || this.getCurrentCompanyId()
      };

      return this.#createEnvelope(true, responsePayload, null, {
        ...responsePayload
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في استرجاع الجلسة الحالية');
    }
  }

  /**
   * تسجيل الدخول الرسمي عبر Supabase Auth باستخدام كود الموظف أو البريد الإلكتروني وكلمة المرور
   * @param {string} identifier - كود الموظف (مثل EMP-0001) أو البريد الإلكتروني
   * @param {string} password - كلمة المرور
   * @param {boolean} [rememberMe=true]
   */
  static async loginWithEmailPassword(identifier, password, rememberMe = true) {
    try {
      await this.simulateDelay(100);
      const cleanIdentifier = String(identifier || '').trim();
      const cleanPass = String(password || '');

      if (!cleanIdentifier || !cleanPass) {
        return this.#createEnvelope(false, null, 'يرجى إدخال كود الموظف أو البريد الإلكتروني وكلمة المرور');
      }

      let emailToAuth = null;

      // 1. إذا لم يحتوِ identifier على '@'، استدعِ دالة resolve_login_email في Supabase
      if (cleanIdentifier.includes('@')) {
        emailToAuth = cleanIdentifier.toLowerCase();
      } else {
        if (supabase) {
          try {
            const companyId = this.getCurrentCompanyId();
            const rpcParams = { p_identifier: cleanIdentifier };
            if (companyId) {
              rpcParams.p_company_id = companyId;
            }
            const { data: rpcRes, error: rpcErr } = await supabase.rpc('resolve_login_email', rpcParams);

            if (rpcErr) {
              console.warn('[Supabase resolve_login_email Error]:', rpcErr);
              return this.#createEnvelope(false, null, 'كود الموظف أو كلمة المرور غير صحيحة');
            }

            if (rpcRes) {
              if (rpcRes.status === 'ambiguous') {
                return this.#createEnvelope(false, null, 'هذا الكود مستخدم في أكثر من شركة، يرجى تسجيل الدخول بالبريد الإلكتروني');
              }
              if (rpcRes.status === 'not_found' || !rpcRes.email) {
                return this.#createEnvelope(false, null, 'كود الموظف أو كلمة المرور غير صحيحة');
              }
              if (rpcRes.status === 'ok' && rpcRes.email) {
                emailToAuth = String(rpcRes.email).trim().toLowerCase();
              }
            } else {
              return this.#createEnvelope(false, null, 'كود الموظف أو كلمة المرور غير صحيحة');
            }
          } catch (rpcEx) {
            console.warn('[resolve_login_email Exception]:', rpcEx);
            return this.#createEnvelope(false, null, 'كود الموظف أو كلمة المرور غير صحيحة');
          }
        } else {
          // Fallback للبيئة المحلية والاختبارات
          const db = LocalDatabase.getDB();
          const localEmp = (db.employees || []).find(e =>
            e.employee_code === cleanIdentifier ||
            e.employeeCode === cleanIdentifier ||
            e.id === cleanIdentifier
          );
          if (!localEmp || !localEmp.email) {
            return this.#createEnvelope(false, null, 'كود الموظف أو كلمة المرور غير صحيحة');
          }
          emailToAuth = String(localEmp.email).trim().toLowerCase();
        }
      }

      if (!emailToAuth) {
        return this.#createEnvelope(false, null, 'كود الموظف أو كلمة المرور غير صحيحة');
      }

      let emp = null;
      let targetCompanyId = null;
      let authUser = null;

      if (supabase && supabase.auth) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: emailToAuth,
          password: cleanPass
        });

        if (authError || !authData?.user) {
          const isCode = !cleanIdentifier.includes('@');
          const errMsg = authError?.message === 'Invalid login credentials'
            ? (isCode ? 'كود الموظف أو كلمة المرور غير صحيحة' : 'البريد الإلكتروني أو كلمة المرور غير صحيحة')
            : (authError?.message || 'فشل تسجيل الدخول عبر خادم المصادقة');
          return this.#createEnvelope(false, null, errMsg, { error: authError });
        }

        authUser = authData.user;

        // جلب سجل الموظف من جدول employees باستخدام EMPLOYEE_PUBLIC_COLS و user_id
        const { data: empData, error: empErr } = await supabase
          .from('employees')
          .select(EMPLOYEE_PUBLIC_COLS)
          .eq('user_id', authUser.id)
          .single();

        if (empErr || !empData) {
          return this.#createEnvelope(false, null, 'لم يتم العثور على سجل موظف نشط مرتبط بهذا الحساب');
        }

        if (empData.status !== 'active') {
          await supabase.auth.signOut();
          return this.#createEnvelope(false, null, 'تم إيقاف هذا الحساب أو أنه قيد المراجعة، يرجى مراجعة إدارة الموارد البشرية');
        }

        emp = this.#normalizeEmployee(empData);
        targetCompanyId = empData.company_id;
      } else {
        // Fallback على قاعدة البيانات المحلية للتطوير والاختبارات
        const db = LocalDatabase.getDB();
        const localEmp = (db.employees || []).find(e =>
          String(e.email || '').trim().toLowerCase() === emailToAuth
        );
        if (!localEmp) {
          return this.#createEnvelope(false, null, cleanIdentifier.includes('@') ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'كود الموظف أو كلمة المرور غير صحيحة');
        }
        if (localEmp.status !== 'active') {
          return this.#createEnvelope(false, null, 'تم إيقاف هذا الحساب أو أنه قيد المراجعة، يرجى مراجعة إدارة الموارد البشرية');
        }
        emp = cloneData(localEmp);
        targetCompanyId = emp.company_id || '11111111-2222-3333-4444-555555555555';
      }

      targetCompanyId = targetCompanyId || emp.company_id || '11111111-2222-3333-4444-555555555555';
      this.setCurrentCompanyId(targetCompanyId);
      emp.company_id = targetCompanyId;

      const userRole = emp.role || 'employee';
      const normalizedRole = (userRole === 'admin') ? 'programmer' : (userRole === 'hr' ? 'manager' : userRole);
      const roleArabic = this.getRoleArabicTitle(userRole);
      const db = LocalDatabase.getDB();
      const rolePermissions = db.role_permissions?.[userRole] || db.role_permissions?.[normalizedRole] || db.role_permissions?.employee || {};

      const authSession = {
        employeeId: emp.id,
        user_id: emp.user_id || authUser?.id || null,
        company_id: targetCompanyId,
        email: emp.email,
        name: emp.fullName,
        role: userRole,
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
      };

      const storage = rememberMe ? localStorage : sessionStorage;
      if (typeof storage !== 'undefined') {
        storage.setItem('JISR_AUTH_SESSION', JSON.stringify(authSession));
        storage.setItem('JISR_COMPANY_ID', targetCompanyId);
      }

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
        details: `تسجيل دخول ناجح للمستخدم: ${emp.fullName} (${emp.id}) بشركة (${targetCompanyId}) برتبة (${roleArabic}) باستخدام (${cleanIdentifier.includes('@') ? 'البريد الإلكتروني' : 'كود الموظف'})`
      });

      const responsePayload = {
        role: userRole,
        normalizedRole: normalizedRole,
        roleArabic: roleArabic,
        permissions: cloneData(rolePermissions),
        user: cloneData(emp),
        employee: cloneData(emp),
        session: authSession,
        company_id: targetCompanyId,
        companyId: targetCompanyId
      };

      return this.#createEnvelope(true, responsePayload, null, {
        ...responsePayload,
        message: `مرحباً بك مجدداً يا ${emp.fullName} (${roleArabic})`
      });
    } catch (err) {
      return this.#handleError(err, 'فشل في تسجيل الدخول');
    }
  }

  static async loginWithCodeOrEmail(identifier, password, rememberMe = true) {
    return this.loginWithEmailPassword(identifier, password, rememberMe);
  }

  /**
   * دالة تسجيل الدخول الموحدة للنظام (Supabase Auth / RBAC Login)
   */
  static async login(credential, rememberMe = true) {
    try {
      await this.simulateDelay(120);

      let cleanPin = null;
      let employeeId = null;
      let credentialEmail = null;
      let credentialPassword = null;
      let shouldRemember = rememberMe;

      if (typeof credential === 'object' && credential !== null) {
        if (credential.email) credentialEmail = String(credential.email).trim().toLowerCase();
        if (credential.password) credentialPassword = String(credential.password);
        if (credential.pin !== undefined && credential.pin !== null) cleanPin = String(credential.pin).trim();
        if (credential.employeeId) employeeId = String(credential.employeeId).trim();
        if (credential.fingerprint) employeeId = String(credential.fingerprint).trim();
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

      // 1. تسجيل الدخول الرسمي بالبريد الإلكتروني وكلمة المرور عبر Supabase Auth
      if (credentialEmail && credentialPassword) {
        return await this.loginWithEmailPassword(credentialEmail, credentialPassword, shouldRemember);
      }

      // 2. إذا حاول المستخدم الدخول المباشر برمز الـ PIN
      if (cleanPin) {
        return this.#createEnvelope(
          false,
          null,
          'تم إيقاف الدخول المباشر بالـ PIN مؤقتاً لدواعي الأمان، يرجى تسجيل الدخول بالبريد الإلكتروني وكلمة المرور.',
          { message: 'تم إيقاف الدخول المباشر بالـ PIN مؤقتاً لدواعي الأمان، يرجى تسجيل الدخول بالبريد الإلكتروني وكلمة المرور.' }
        );
      }

      // 3. التحقق عبر كود الموظف / البصمة الحيوية للكشك
      if (employeeId) {
        let emp = null;
        let targetCompanyId = null;

        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('employees')
              .select(EMPLOYEE_PUBLIC_COLS)
              .or(`id.eq.${employeeId},employee_code.eq.${employeeId}`)
              .limit(1);
            if (data && data.length > 0 && !error) {
              emp = this.#normalizeEmployee(data[0]);
              targetCompanyId = data[0].company_id;
            }
          } catch (sbErr) {
            console.warn('[Supabase Fingerprint Login Fallback]:', sbErr);
          }
        }

        if (!emp) {
          const db = LocalDatabase.getDB();
          const localEmp = (db.employees || []).find(e => e.id === employeeId || e.employee_code === employeeId);
          if (localEmp) {
            emp = cloneData(localEmp);
            targetCompanyId = localEmp.company_id || db.settings?.company_id || '11111111-2222-3333-4444-555555555555';
          }
        }

        if (!emp) {
          return this.#createEnvelope(false, null, 'بصمة الإصبع أو كود الموظف غير مسجل بالنظام!');
        }

        if (emp.status === 'pending') {
          return this.#createEnvelope(false, null, 'حسابك في انتظار اعتماد إدارة الموارد البشرية');
        }

        if (emp.status === 'suspended') {
          return this.#createEnvelope(false, null, 'تم إيقاف هذا الحساب، يرجى مراجعة إدارة الموارد البشرية');
        }

        targetCompanyId = targetCompanyId || emp.company_id || '11111111-2222-3333-4444-555555555555';
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
          authMethod: 'fingerprint',
          company_id: targetCompanyId,
          companyId: targetCompanyId,
          company_name: emp.company_name || null,
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
          details: `تسجيل دخول ناجح للمستخدم: ${emp.fullName} (${emp.id}) بشركة (${targetCompanyId}) برتبة (${roleArabic}) عبر البصمة الحيوية`
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
      }

      if (credentialEmail) {
        return this.#createEnvelope(false, null, 'يرجى إدخال كلمة المرور مع البريد الإلكتروني');
      }

      return this.#createEnvelope(false, null, 'يرجى إدخال البريد الإلكتروني وكلمة المرور لتسجيل الدخول');
    } catch (err) {
      return this.#handleError(err, 'فشل في تسجيل الدخول');
    }
  }

  static async loginWithPin(pin, rememberMe = true) {
    return this.#createEnvelope(
      false,
      null,
      'تم إيقاف الدخول المباشر بالـ PIN مؤقتاً لدواعي الأمان، يرجى تسجيل الدخول بالبريد الإلكتروني وكلمة المرور.',
      { message: 'تم إيقاف الدخول المباشر بالـ PIN مؤقتاً لدواعي الأمان، يرجى تسجيل الدخول بالبريد الإلكتروني وكلمة المرور.' }
    );
  }

  /**
   * فحص محلي لفريد بودن رمز الـ PIN في LocalDatabase
   * دون استعلام مباشر على أعمدة pin المحجوبة بـ CLS في Supabase
   */
  static async isPinTaken(pin, excludeEmployeeId = null, excludeCompanyId = null, excludeEmail = null) {
    if (!pin) return false;
    const cleanPin = String(pin).trim();
    if (!cleanPin) return false;

    const db = LocalDatabase.getDB();

    const isEmpMatch = (db.employees || []).some(e => {
      if (excludeEmployeeId && (e.id === excludeEmployeeId || e.employee_code === excludeEmployeeId)) return false;
      if (excludeEmail && e.email && e.email.toLowerCase() === excludeEmail.toLowerCase()) return false;
      return String(e.pin || '').trim() === cleanPin;
    });
    if (isEmpMatch) return true;

    const isCompMatch = (db.companies || []).some(c => {
      if (excludeCompanyId && (c.id === excludeCompanyId || c.company_id === excludeCompanyId)) return false;
      const cPin = String(c.pin || c.manager_pin || '').trim();
      return cPin === cleanPin;
    });
    if (isCompMatch) return true;

    return false;
  }

  static async loginWithFingerprint(employeeId, rememberMe = true) {
    try {
      await this.simulateDelay(80);
      let emp = null;
      let targetCompanyId = null;
      let authUser = null;

      // 1. التحقق من وجود جلسة Supabase Auth صالحة ونشطة (أو محاولة تجديدها)
      if (supabase && supabase.auth) {
        let session = null;
        try {
          const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
          if (sessionData?.session && !sessionErr) {
            session = sessionData.session;
          } else {
            const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
            if (refreshData?.session && !refreshErr) {
              session = refreshData.session;
            }
          }
        } catch (authEx) {
          console.warn('[loginWithFingerprint getSession Warning]:', authEx);
        }

        if (!session || !session.user) {
          return this.#createEnvelope(
            false,
            null,
            'انتهت جلسة المصادقة الأمنية على هذا الجهاز. يرجى تسجيل الدخول بكود الموظف وكلمة المرور مرة واحدة لتجديد تفعيل البصمة على هذا الجهاز.',
            {
              sessionExpired: true,
              message: 'انتهت جلسة المصادقة الأمنية على هذا الجهاز. يرجى تسجيل الدخول بكود الموظف وكلمة المرور مرة واحدة لتجديد تفعيل البصمة على هذا الجهاز.'
            }
          );
        }

        authUser = session.user;

        // جلب الموظف النشط عبر user_id باستخدام EMPLOYEE_PUBLIC_COLS
        const { data: empData, error: empErr } = await supabase
          .from('employees')
          .select(EMPLOYEE_PUBLIC_COLS)
          .eq('user_id', authUser.id)
          .single();

        if (empErr || !empData) {
          return this.#createEnvelope(false, null, 'لم يتم العثور على سجل موظف نشط مرتبط بهذه الجلسة');
        }

        if (empData.status !== 'active') {
          await supabase.auth.signOut();
          return this.#createEnvelope(false, null, 'تم إيقاف هذا الحساب أو أنه قيد المراجعة، يرجى مراجعة إدارة الموارد البشرية');
        }

        if (employeeId && empData.id !== employeeId && empData.employee_code !== employeeId) {
          return this.#createEnvelope(false, null, 'بصمة الجهاز المسجلة تخص موظفاً آخر. يرجى اختيار الحساب المطابق أو تسجيل الدخول بكلمة المرور.');
        }

        emp = this.#normalizeEmployee(empData);
        targetCompanyId = empData.company_id;
      } else {
        // Fallback للبيئة المحلية والاختبارات
        const db = LocalDatabase.getDB();
        const localEmp = (db.employees || []).find(e => e.id === employeeId || e.employee_code === employeeId);
        if (!localEmp) {
          return this.#createEnvelope(false, null, 'بصمة الإصبع أو كود الموظف غير مسجل بالنظام!');
        }
        if (localEmp.status !== 'active') {
          return this.#createEnvelope(false, null, 'تم إيقاف هذا الحساب أو أنه قيد المراجعة، يرجى مراجعة إدارة الموارد البشرية');
        }
        emp = cloneData(localEmp);
        targetCompanyId = emp.company_id || '11111111-2222-3333-4444-555555555555';
      }

      targetCompanyId = targetCompanyId || emp.company_id || '11111111-2222-3333-4444-555555555555';
      this.setCurrentCompanyId(targetCompanyId);
      emp.company_id = targetCompanyId;

      const userRole = emp.role || 'employee';
      const normalizedRole = (userRole === 'admin') ? 'programmer' : (userRole === 'hr' ? 'manager' : userRole);
      const roleArabic = this.getRoleArabicTitle(userRole);
      const db = LocalDatabase.getDB();
      const rolePermissions = db.role_permissions?.[userRole] || db.role_permissions?.[normalizedRole] || db.role_permissions?.employee || {};

      const authSession = {
        employeeId: emp.id,
        user_id: emp.user_id || authUser?.id || null,
        company_id: targetCompanyId,
        email: emp.email,
        name: emp.fullName,
        role: userRole,
        authMethod: 'fingerprint',
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
      };

      const storage = rememberMe ? localStorage : sessionStorage;
      if (typeof storage !== 'undefined') {
        storage.setItem('JISR_AUTH_SESSION', JSON.stringify(authSession));
        storage.setItem('JISR_COMPANY_ID', targetCompanyId);
      }

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
        details: `تسجيل دخول ناجح للمستخدم: ${emp.fullName} (${emp.id}) بشركة (${targetCompanyId}) برتبة (${roleArabic}) عبر بصمة الجهاز`
      });

      const responseData = {
        role: userRole,
        normalizedRole: normalizedRole,
        roleArabic: roleArabic,
        permissions: cloneData(rolePermissions),
        session: authSession,
        user: cloneData(emp),
        employee: cloneData(emp),
        company_id: targetCompanyId,
        companyId: targetCompanyId
      };

      return this.#createEnvelope(true, responseData, null, {
        ...responseData,
        message: `تم التحقق من بصمة الجهاز بنجاح! مرحباً بك يا ${emp.fullName} (${roleArabic})`
      });
    } catch (err) {
      return this.#handleError(err, 'فشل تسجيل الدخول عبر البصمة');
    }
  }

  static async logout() {
    try {
      const actor = AuditMiddleware.getCurrentActor();
      if (supabase && supabase.auth) {
        try { await supabase.auth.signOut(); } catch (e) { console.warn('[Supabase SignOut Warning]:', e); }
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

  static async getNextEmployeeId(companyId = null) {
    try {
      const targetCompanyId = companyId || this.getCurrentCompanyId();
      let nums = [];
      if (supabase) {
        try {
          let query = supabase
            .from('employees')
            .select('id, employee_code');
          if (targetCompanyId) {
            query = query.eq('company_id', targetCompanyId);
          }
          const { data } = await query;
          if (data && data.length > 0) {
            nums = data.map(e => {
              const code = String(e.employee_code || e.id || '');
              const match = code.match(/(\d+)/);
              return match ? parseInt(match[1], 10) : NaN;
            }).filter(n => !isNaN(n) && n > 0);
          }
        } catch (e) {
          console.warn('[Supabase getNextEmployeeId Warning]:', e);
        }
      }

      const db = LocalDatabase.getDB();
      const localNums = (db.employees || [])
        .filter(e => !targetCompanyId || !e.company_id || e.company_id === targetCompanyId)
        .map(e => {
          const code = String(e.employee_code || e.employeeCode || e.id || '');
          const match = code.match(/(\d+)/);
          return match ? parseInt(match[1], 10) : NaN;
        })
        .filter(n => !isNaN(n) && n > 0);

      const allNums = [...nums, ...localNums];
      const maxId = allNums.length > 0 ? Math.max(...allNums) : 0;
      const nextNum = maxId + 1;
      return `EMP-${String(nextNum).padStart(4, '0')}`;
    } catch (e) {
      return `EMP-${Date.now().toString().slice(-4)}`;
    }
  }

  static async getNextEmployeeCode(companyId = null) {
    return this.getNextEmployeeId(companyId);
  }

  static async isEmployeeCodeTaken(code, excludeEmployeeId = null, companyId = null) {
    if (!code) return false;
    const cleanCode = String(code).trim().toUpperCase();
    if (!cleanCode) return false;
    const targetCompId = companyId || this.getCurrentCompanyId();

    if (supabase) {
      try {
        let query = supabase
          .from('employees')
          .select('id, employee_code, company_id')
          .ilike('employee_code', cleanCode);
        if (targetCompId) {
          query = query.eq('company_id', targetCompId);
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          const match = data.some(e => {
            if (excludeEmployeeId && (e.id === excludeEmployeeId || String(e.employee_code || '').toUpperCase() === String(excludeEmployeeId).toUpperCase())) {
              return false;
            }
            return true;
          });
          if (match) return true;
        }
      } catch (e) {
        console.warn('[isEmployeeCodeTaken Supabase Warning]:', e);
      }
    }

    const db = LocalDatabase.getDB();
    const localMatch = (db.employees || []).some(e => {
      if (targetCompId && e.company_id && e.company_id !== targetCompId) return false;
      if (excludeEmployeeId && (e.id === excludeEmployeeId || e.employee_code === excludeEmployeeId)) return false;
      const c = String(e.employee_code || e.employeeCode || e.id || '').trim().toUpperCase();
      return c === cleanCode;
    });
    return localMatch;
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
            .select(EMPLOYEE_PUBLIC_COLS)
            .eq('company_id', companyId)
            .eq('status', 'pending');
          if (!error && Array.isArray(data)) {
            pending = data.map(e => this.#normalizeEmployee(e));
          }
        } catch (e) {
          console.warn('[Supabase getPendingEmployees Warning]:', e);
        }
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
      const companyId = onboardingData.companyId || onboardingData.company_id || this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();

      // تحديد اسم الشركة لربط الموظف بها بدقة وفق معمارية الشركات المتعددة (Multi-Tenant)
      let companyName = 'AE (HR-SYSTEM)';
      const allCompanies = Array.isArray(db.companies) ? db.companies : (INITIAL_DATABASE.companies || []);
      const matchedCompany = allCompanies.find(c => c.id === companyId || c.company_id === companyId);
      if (matchedCompany) {
        companyName = matchedCompany.companyName || matchedCompany.company_name || matchedCompany.name || companyName;
      }

      const newId = await this.getNextEmployeeId();
      const cleanPin = String(onboardingData.pin).trim();

      // فحص عدم تكرار الـ PIN على مستوى النظام بأكمله
      const pinTaken = await this.isPinTaken(cleanPin);
      if (pinTaken) {
        return this.#createEnvelope(false, null, 'رمز الـ PIN هذا مستخدم بالفعل لموظف أو مسؤول آخر بالنظام! يرجى اختيار رمز PIN سري فريد وغير مكرر.', {
          message: 'رمز الـ PIN هذا مستخدم بالفعل لموظف أو مسؤول آخر بالنظام! يرجى اختيار رمز PIN سري فريد وغير مكرر.'
        });
      }

      const fullName = `${onboardingData.firstName || ''} ${onboardingData.secondName || ''} ${onboardingData.lastName || ''}`.trim();

      const gender = onboardingData.gender || detectGender(fullName);
      const newEmp = {
        id: newId,
        company_id: companyId,
        company_name: companyName,
        companyName: companyName,
        fullName: fullName || 'موظف جديد',
        gender: gender,
        avatar: gender === 'female' ? DEFAULT_AVATARS.female : DEFAULT_AVATARS.male,
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

      // 1. الحفظ في Supabase أولاً مع عزل company_id واسترجاع UUID المولّد تلقائياً
      let sbSuccess = true;
      if (supabase) {
        const sbPayload = this.#toSupabaseEmployee(newEmp, companyId);
        sbPayload.status = 'pending';
        let query = supabase.from('employees').insert([sbPayload]);
        if (query && typeof query.select === 'function') {
          query = query.select(EMPLOYEE_PUBLIC_COLS).single();
        }
        const empWriteRes = await this.sbWrite(
          query,
          'تسجيل انضمام موظف',
          { table: 'employees', id: newId, record: newEmp, action: 'insert', payload: sbPayload }
        );
        if (empWriteRes.success && empWriteRes.data && empWriteRes.data.id) {
          newEmp.id = empWriteRes.data.id;
        } else if (!empWriteRes.success) {
          sbSuccess = false;
        }
      }

      // 2. الحفظ في LocalDatabase
      if (!Array.isArray(db.employees)) db.employees = [];
      db.employees.push(newEmp);

      // 3. تسجيل طلب اعتماد انضمام فوري في جدول الطلبات لربط الموظف بالإدارة فوراً
      const onboardingRequest = {
        id: `REQ-ONB-${newEmp.id}`,
        company_id: companyId,
        company_name: companyName,
        companyName: companyName,
        employee_id: newEmp.id,
        employeeId: newEmp.id,
        type: 'onboarding',
        request_type: 'onboarding',
        status: 'pending',
        startDate: newEmp.hireDate,
        submittedAt: newEmp.registeredAt,
        createdAt: newEmp.hireDate,
        reason: `طلب تسجيل وانضمام موظف جديد بشركة (${companyName}) بقسم (${newEmp.department}) - بانتظار الاعتماد وتحديد الراتب والصلاحيات`,
        employee: newEmp,
        details: {
          fullName: newEmp.fullName,
          companyId: companyId,
          companyName: companyName,
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
        const sbOnbPayload = {
          company_id: companyId,
          employee_id: newEmp.id,
          request_type: 'onboarding',
          status: 'pending',
          created_at: newEmp.registeredAt,
          reason: `طلب انضمام موظف جديد بشركة (${companyName}) بقسم (${newEmp.department})`,
          details: onboardingRequest.details
        };
        let query = supabase.from('requests').insert([sbOnbPayload]);
        if (query && typeof query.select === 'function') {
          query = query.select().single();
        }
        const reqWriteRes = await this.sbWrite(
          query,
          'إنشاء طلب انضمام موظف',
          { table: 'requests', id: `REQ-ONB-${newEmp.id}`, record: onboardingRequest, action: 'insert', payload: sbOnbPayload }
        );
        if (reqWriteRes.success && reqWriteRes.data && reqWriteRes.data.id) {
          onboardingRequest.id = reqWriteRes.data.id;
        } else if (!reqWriteRes.success) {
          sbSuccess = false;
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
        details: `تسجيل طلب موظف جديد بقائمة الانتظار: ${newEmp.fullName} (${newId}) بشركة (${companyName}) - قسم ${newEmp.department}`,
        payload: { ...onboardingData, company_id: companyId, company_name: companyName }
      });

      if (!sbSuccess) {
        return this.#createEnvelope(false, cloneData(newEmp), 'تم تسجيل الطلب محلياً بنجاح وتعذر الرفع السحابي حالياً', {
          pendingSync: true,
          employee: cloneData(newEmp),
          user: cloneData(newEmp),
          message: `تم حفظ طلبك محلياً بكود (${newId}) بانتظار المزامنة السحابية واعتماد إدارة الموارد البشرية.`
        });
      }

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

      // البحث عن المرشح
      let emp = await this.resolveEmployee(id);

      if (!emp) {
        return this.#createEnvelope(false, null, 'الموظف غير موجود');
      }

      if (emp.role === 'programmer') {
        return this.#createEnvelope(false, null, 'حساب مبرمج النظام محمي ومفعل ولا يمكن تعديله أو اعتماده كمرشح');
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
      let sbSuccess = true;
      if (supabase) {
        const sbEmpUpdate = {
          status: 'active',
          role: emp.role,
          department: emp.department,
          job_title: emp.jobTitle,
          salary: emp.baseSalary
        };
        const empWriteRes = await this.sbWrite(
          supabase.from('employees').update(sbEmpUpdate).eq('id', emp.id || id).eq('company_id', companyId),
          'اعتماد موظف',
          { table: 'employees', id: emp.id || id, record: emp, action: 'update', payload: sbEmpUpdate, match: { id: emp.id || id, company_id: companyId } }
        );
        if (!empWriteRes.success) sbSuccess = false;

        const reqUpdatePayload = {
          status: 'approved',
          review_notes: `تم اعتماد وتفعيل الحساب برتبة (${this.getRoleArabicTitle(emp.role)}) وراتب أساسي (${emp.baseSalary} ج.م)`,
          reviewed_at: new Date().toISOString()
        };
        const reqWriteRes = await this.sbWrite(
          supabase.from('requests').update(reqUpdatePayload).eq('employee_id', emp.id || id).eq('company_id', companyId),
          'تحديث طلب اعتماد موظف',
          { table: 'requests', id: `REQ-ONB-${emp.id || id}`, action: 'update', payload: reqUpdatePayload, match: { employee_id: emp.id || id, company_id: companyId } }
        );
        if (!reqWriteRes.success) sbSuccess = false;
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

      if (!sbSuccess) {
        return this.#createEnvelope(false, cloneData(emp), 'تم اعتماد الموظف محلياً وتعذر التحديث السحابي حالياً', {
          pendingSync: true,
          employee: cloneData(emp),
          user: cloneData(emp),
          message: `تم اعتماد حساب الموظف (${emp.fullName}) محلياً، وبانتظار المزامنة السحابية.`
        });
      }

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

      const emp = await this.resolveEmployee(id);
      if (!emp) {
        return this.#createEnvelope(false, null, 'الموظف غير موجود');
      }

      if (emp.role === 'programmer') {
        return this.#createEnvelope(false, null, 'حساب مبرمج النظام محمي تماماً ولا يمكن حذفه');
      }

      db.employees = (db.employees || []).filter(e => e.id !== emp.id && e.employee_code !== emp.employee_code);

      // 1. الحذف الآمن من Supabase
      let sbSuccess = true;
      if (supabase) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(emp.id || ''));
        let delQ = supabase.from('employees').delete().eq('company_id', companyId);
        delQ = isUUID ? delQ.eq('id', emp.id) : delQ.eq('employee_code', emp.id);
        const empWriteRes = await this.sbWrite(
          delQ,
          'حذف موظف مرفوض',
          { table: 'employees', id: emp.id, action: 'delete', match: { id: emp.id, company_id: companyId } }
        );
        if (!empWriteRes.success) sbSuccess = false;

        const rejUpdate = {
          status: 'rejected',
          review_notes: 'تم رفض طلب التسجيل من قبل الإدارة',
          reviewed_at: new Date().toISOString()
        };
        const reqWriteRes = await this.sbWrite(
          supabase.from('requests').update(rejUpdate).eq('employee_id', emp.id).eq('company_id', companyId),
          'تحديث طلب رفض موظف',
          { table: 'requests', id: `REQ-ONB-${emp.id}`, action: 'update', payload: rejUpdate, match: { employee_id: emp.id, company_id: companyId } }
        );
        if (!reqWriteRes.success) sbSuccess = false;
      }

      // تحديث حالة طلب الاعتماد في LocalDatabase
      if (Array.isArray(db.requests)) {
        const matchingReqs = db.requests.filter(r => 
          (r.employeeId === id || r.employee_id === id || r.employeeId === emp.id || r.employee_id === emp.id || r.id === `REQ-ONB-${id}` || r.id === `REQ-ONB-${emp.id}`) &&
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
        details: `رفض طلب تسجيل الموظف وحذف بياناته: ${emp.fullName} (${emp.id}) بشركة (${companyId})`
      });

      if (!sbSuccess) {
        return this.#createEnvelope(false, cloneData(emp), 'تم رفض الموظف محلياً وتعذر التحديث السحابي حالياً', {
          pendingSync: true,
          message: 'تم رفض طلب التسجيل محلياً، وبانتظار المزامنة السحابية.'
        });
      }

      return this.#createEnvelope(true, cloneData(emp), null, {
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
      const emp = await this.resolveEmployee(id);
      if (!emp) return this.#createEnvelope(false, null, 'الموظف غير موجود');
      const db = LocalDatabase.getDB();
      const targetEmp = (db.employees || []).find(e => e.id === emp.id) || emp;

      const targetMonth = salesData.month || salesData.salesMonth || new Date().toISOString().slice(0, 7);
      if (!targetEmp.monthlySales) targetEmp.monthlySales = {};

      const targetVal = salesData.target !== undefined ? Number(salesData.target) : (salesData.salesTarget !== undefined ? Number(salesData.salesTarget) : undefined);
      const achievedVal = salesData.achieved !== undefined ? Number(salesData.achieved) : (salesData.salesAchieved !== undefined ? Number(salesData.salesAchieved) : undefined);
      const commVal = salesData.commissionRate !== undefined ? Number(salesData.commissionRate) : undefined;

      if (targetVal !== undefined) targetEmp.salesTarget = targetVal;
      if (achievedVal !== undefined) targetEmp.salesAchieved = achievedVal;
      if (commVal !== undefined) targetEmp.commissionRate = commVal;
      targetEmp.salesMonth = targetMonth;

      targetEmp.monthlySales[targetMonth] = {
        salesTarget: targetEmp.salesTarget,
        salesAchieved: targetEmp.salesAchieved,
        commissionRate: targetEmp.commissionRate
      };

      LocalDatabase.saveDB(db);

      // تحديث فوري في Supabase مع مطابقة company_id
      if (supabase) {
        const updatePayload = {};
        if (targetVal !== undefined) updatePayload.sales_target = targetVal;
        if (achievedVal !== undefined) updatePayload.sales_achieved = achievedVal;
        if (commVal !== undefined) updatePayload.commission_rate = commVal;

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(emp.id || ''));
        let q = supabase.from('employees').update(updatePayload).eq('company_id', companyId);
        q = isUUID ? q.eq('id', emp.id) : q.eq('employee_code', emp.id);
        await this.sbWrite(
          q,
          'تحديث مبيعات وعمولة الموظف',
          { table: 'employees', id: emp.id, action: 'update', payload: updatePayload, match: { id: emp.id, company_id: companyId } }
        );
      }

      AuditMiddleware.log({
        action: 'UPDATE_SALES_TARGET',
        actionType: 'تعديل',
        target: 'employees',
        targetId: emp.id,
        details: `تحديث مستهدف المبيعات (${targetEmp.salesTarget} ج.م) والعمولة (${targetEmp.commissionRate}%) للموظف: ${targetEmp.fullName} بشركة (${companyId})`,
        payload: { ...salesData, company_id: companyId }
      });

      return this.#createEnvelope(true, cloneData(targetEmp), null, {
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
      const emp = await this.resolveEmployee(id);
      if (!emp) return this.#createEnvelope(false, null, 'الموظف غير موجود');
      const db = LocalDatabase.getDB();
      const targetEmp = (db.employees || []).find(e => e.id === emp.id);
      if (targetEmp) targetEmp.salaryStatus = salaryStatus;
      LocalDatabase.saveDB(db);

      // تحديث فوري في Supabase مع مطابقة company_id
      if (supabase) {
        const updatePayload = { salary_status: salaryStatus };
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(emp.id || ''));
        let q = supabase.from('employees').update(updatePayload).eq('company_id', companyId);
        q = isUUID ? q.eq('id', emp.id) : q.eq('employee_code', emp.id);
        await this.sbWrite(
          q,
          'تحديث حالة الراتب',
          { table: 'employees', id: emp.id, action: 'update', payload: updatePayload, match: { id: emp.id, company_id: companyId } }
        );
      }

      AuditMiddleware.log({
        action: 'UPDATE_SALARY_STATUS',
        actionType: 'تعديل',
        target: 'employees',
        targetId: emp.id,
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
            .select(COMPANY_PUBLIC_COLS)
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
      let sbSuccess = true;
      if (supabase) {
        const companyUpdatePayload = {
          name: newSettings.companyName,
          company_lat: newSettings.company_lat,
          company_lng: newSettings.company_lng,
          allowed_radius_meters: newSettings.allowed_radius_meters
        };
        const writeRes = await this.sbWrite(
          supabase
            .from('companies')
            .update(companyUpdatePayload)
            .eq('id', companyId),
          'تحديث إعدادات الشركة',
          { table: 'companies', id: companyId, action: 'update', payload: companyUpdatePayload, match: { id: companyId } }
        );
        if (!writeRes.success) sbSuccess = false;
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

      if (!sbSuccess) {
        return this.#createEnvelope(false, cloneData(db.settings), 'تم حفظ الإعدادات محلياً وتعذر الحفظ السحابي حالياً', {
          pendingSync: true,
          message: 'تم حفظ الإعدادات محلياً بانتظار المزامنة السحابية.'
        });
      }

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
            .select(COMPANY_PUBLIC_COLS)
            .eq('id', companyId)
            .maybeSingle();

          if (data && !error) {
            comp = {
              ...comp,
              companyName: data.name || data.company_name || comp.companyName,
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

      // إذا كانت شركة مستأجرة نبحث في db.companies لضمان استقرار العرض أوفلاين
      if (companyId && companyId !== '11111111-2222-3333-4444-555555555555') {
        const localComp = (db.companies || []).find(c => c.id === companyId);
        if (localComp) {
          comp = {
            ...comp,
            companyName: localComp.name || localComp.companyName || localComp.company_name || comp.companyName,
            taxNumber: localComp.tax_number || localComp.taxNumber || comp.taxNumber,
            phone: localComp.phone || localComp.manager_phone || comp.phone,
            email: localComp.email || localComp.manager_email || comp.email,
            ...localComp
          };
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
      let sbSuccess = true;
      if (supabase) {
        const companyUpdatePayload = {
          name: newSettings.companyName,
          company_lat: newSettings.company_lat,
          company_lng: newSettings.company_lng,
          allowed_radius_meters: newSettings.allowed_radius_meters
        };
        const writeRes = await this.sbWrite(
          supabase
            .from('companies')
            .update(companyUpdatePayload)
            .eq('id', companyId),
          'تحديث هوية الشركة',
          { table: 'companies', id: companyId, action: 'update', payload: companyUpdatePayload, match: { id: companyId } }
        );
        if (!writeRes.success) sbSuccess = false;
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

      if (!sbSuccess) {
        return this.#createEnvelope(false, cloneData(db.company_settings), 'تم تحديث بيانات الشركة محلياً وتعذر الحفظ السحابي حالياً', {
          pendingSync: true,
          message: 'تم تحديث بيانات الشركة محلياً بانتظار المزامنة السحابية.'
        });
      }

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
      const taxNumber = String(tenantData.taxNumber || '').trim();
      const companyName = String(tenantData.companyName || '').trim();
      const managerName = String(tenantData.managerName || '').trim();
      const phone = String(tenantData.phone || '').trim();
      const password = String(tenantData.password || tenantData.pin || '').trim();

      if (!password || password.length < 6) {
        return this.#createEnvelope(false, null, 'يرجى إدخال كلمة مرور للمدير لا تقل عن 6 خانات', {
          message: 'يرجى إدخال كلمة مرور للمدير لا تقل عن 6 خانات'
        });
      }

      const db = LocalDatabase.getDB();
      if (!Array.isArray(db.companies)) db.companies = cloneData(INITIAL_DATABASE.companies || []);

      // البحث عن أي طلب معلق سابق بنفس البريد أو الشركة لتحديثه
      let existingPending = db.companies.find(c => 
        c.status === 'pending' && (
          (email && c.email && c.email.toLowerCase() === email) ||
          (c.companyName && c.companyName.toLowerCase() === companyName.toLowerCase())
        )
      );

      // 1. فحص عدم تكرار البريد الإلكتروني مع الشركات المفعلة فقط
      if (supabase && email) {
        try {
          const { data: existingActive } = await supabase
            .from('companies')
            .select('id, name, status, manager_email')
            .eq('manager_email', email)
            .eq('status', 'active')
            .limit(1);

          if (existingActive && existingActive.length > 0) {
            return this.#createEnvelope(false, null, `البريد الإلكتروني (${email}) مسجل بالفعل لشركة نشطة أخرى (${existingActive[0].name}). يرجى استخدام بريد إلكتروني مختلف أو تسجيل الدخول.`, {
              message: `البريد الإلكتروني (${email}) مسجل بالفعل لشركة نشطة أخرى (${existingActive[0].name}). يرجى استخدام بريد إلكتروني مختلف أو تسجيل الدخول.`
            });
          }
        } catch (sbErr) {
          console.warn('[Supabase Duplicate Check Fallback]:', sbErr);
        }
      }

      // فحص محلي مع استثناء الشركة الجذرية التجريبية الافتراضية
      const duplicateActive = db.companies.find(c => {
        if (c.id === '11111111-2222-3333-4444-555555555555') return false; // استثناء الشركة الافتراضية
        if (c.status === 'pending') return false; // السماح بتحديث أو إعادة إرسال الطلبات المعلقة
        const isEmailMatch = email && c.email && c.email.toLowerCase() === email;
        const isTaxMatch = taxNumber && c.taxNumber && c.taxNumber === taxNumber;
        return isEmailMatch || isTaxMatch;
      });

      if (duplicateActive) {
        return this.#createEnvelope(false, null, 'البريد الإلكتروني أو الرقم الضريبي مسجل بالفعل لشركة نشطة أخرى بالنظام', {
          message: 'البريد الإلكتروني أو الرقم الضريبي مسجل بالفعل لشركة نشطة أخرى بالنظام'
        });
      }

      // توليد معرف UUID فريد للشركة متوافق مع معايير Supabase
      const companyId = existingPending?.id || ((typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
          }));

      const newTenant = {
        id: companyId,
        company_id: companyId,
        name: companyName,
        company_name: companyName,
        companyName: companyName,
        tax_number: taxNumber,
        taxNumber: taxNumber,
        manager_name: managerName,
        managerName: managerName,
        phone: phone,
        email: email,
        status: 'pending',
        created_at: existingPending?.created_at || new Date().toISOString(),
        createdAt: existingPending?.createdAt || new Date().toISOString().split('T')[0]
      };

      // 2. محاولة إنشاء حساب المدير في Supabase Auth بكلمة المرور المسجلة
      if (supabase && supabase.auth && email && password) {
        try {
          const { data: signUpData } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: managerName,
                company_name: companyName,
                role: 'manager'
              }
            }
          });
          if (signUpData?.user) {
            newTenant.user_id = signUpData.user.id;
          }
        } catch (authEx) {
          console.warn('[Supabase registerNewTenant signUp Warning]:', authEx);
        }
      }

      // 3. استدعاء دالة التسجيل الآمنة register_new_tenant عبر Supabase RPC
      let sbSuccess = true;
      if (supabase && typeof supabase.rpc === 'function') {
        const rpcPayload = {
          p_name: companyName,
          p_tax_number: taxNumber || null,
          p_manager_name: managerName,
          p_manager_phone: phone || null,
          p_manager_email: email || null,
          p_manager_pin: password
        };
        const writeRes = await this.sbWrite(
          supabase.rpc('register_new_tenant', rpcPayload),
          'تسجيل شركة جديدة عبر RPC',
          { table: 'companies', id: companyId, record: newTenant, action: 'rpc', payload: rpcPayload }
        );
        if (writeRes.success && writeRes.data) {
          const retId = typeof writeRes.data === 'string' ? writeRes.data : writeRes.data.id;
          if (retId) {
            newTenant.id = retId;
            newTenant.company_id = retId;
          }
        } else if (!writeRes.success) {
          sbSuccess = false;
        }
      }

      // 3. الحفظ في LocalDatabase.companies
      if (existingPending) {
        Object.assign(existingPending, newTenant);
      } else {
        db.companies.unshift(newTenant);
      }
      LocalDatabase.saveDB(db);

      // 4. تسجيل الحدث في سجل الرقابة والتدقيق (Audit Log)
      AuditMiddleware.log({
        action: 'REGISTER_TENANT',
        actionType: 'إضافة',
        target: 'companies',
        targetId: companyId,
        details: `تسجيل شركة جديدة بقائمة الانتظار: ${newTenant.companyName} (المدير: ${newTenant.managerName} - ${newTenant.phone})`,
        payload: newTenant
      });

      if (!sbSuccess) {
        return this.#createEnvelope(false, cloneData(newTenant), 'تم تسجيل الشركة محلياً وتعذر الحفظ السحابي حالياً', {
          pendingSync: true,
          message: 'تم استلام طلب تسجيل شركتكم محلياً، بانتظار المزامنة السحابية والمراجعة.'
        });
      }

      return this.#createEnvelope(true, cloneData(newTenant), null, {
        message: 'تم استلام طلب تسجيل شركتكم بنجاح! طلبكم قيد المراجعة والاعتماد الفوري من قبل الإدارة وسيتم تفعيل حسابكم فوراً.'
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
            .select(COMPANY_PUBLIC_COLS)
            .order('created_at', { ascending: false });

          if (data && !error && data.length > 0) {
            tenants = data.map(d => {
              let mName = (d.manager_name || d.managerName || '').trim();
              if (!mName || mName.includes('?') || /\uFFFD/.test(mName) || /\?{2,}/.test(mName)) {
                mName = 'المدير العام';
              }

              let cName = (d.name || d.company_name || d.companyName || '').trim();
              if (d.id === '11111111-2222-3333-4444-555555555555') {
                if (!cName || cName.includes('?') || /\uFFFD/.test(cName)) {
                  cName = 'AE (HR-SYSTEM)';
                }
              } else if (!cName || /\?{2,}/.test(cName)) {
                cName = 'شركة جديدة';
              }

              return {
                id: d.id,
                company_id: d.id,
                companyName: cName,
                name: cName,
                taxNumber: d.tax_number ?? d.taxNumber ?? 'غير مسجل',
                tax_number: d.tax_number ?? d.taxNumber ?? 'غير مسجل',
                managerName: mName,
                manager_name: mName,
                phone: d.manager_phone || d.phone || '',
                email: d.manager_email || d.email || '',
                password: d.manager_pin || d.pin || '',
                pin: d.manager_pin || d.pin || '',
                status: d.status || 'pending',
                createdAt: d.created_at || d.createdAt || new Date().toISOString()
              };
            });
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
        // دمج الشركات المحلية وتحديث الحالة في حال تم اعتمادها محلياً
        db.companies.forEach(localC => {
          const match = tenants.find(t => t.id === localC.id);
          if (!match) {
            tenants.push(localC);
          } else if (localC.status === 'active' && match.status === 'pending') {
            match.status = 'active';
          }
        });
      }

      // تنظيف وتصحيح أي أسماء مفقودة
      tenants.forEach(t => {
        if (!t.managerName || t.managerName.includes('?') || /\uFFFD/.test(t.managerName)) {
          t.managerName = 'المدير العام';
          t.manager_name = 'المدير العام';
        }
        if (!t.companyName || t.companyName.includes('?') || /\uFFFD/.test(t.companyName)) {
          t.companyName = 'AE (HR-SYSTEM)';
          t.name = 'AE (HR-SYSTEM)';
        }
      });

      // حفظ النسخة المنقحة محلياً
      db.companies = cloneData(tenants);
      LocalDatabase.saveDB(db);

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
          const { data } = await supabase.from('companies').select(COMPANY_PUBLIC_COLS).eq('id', companyId).maybeSingle();
          if (data) {
            company = {
              id: data.id,
              companyName: data.name || data.company_name,
              taxNumber: data.tax_number,
              managerName: data.manager_name,
              phone: data.manager_phone || data.phone || '',
              email: data.manager_email || data.email || '',
              pin: data.manager_pin || data.pin || '',
              status: 'pending'
            };
            db.companies.push(company);
          }
        } catch (e) {
          console.warn('[Supabase getTenantCompany Warning]:', e);
        }
      }

      if (!company) {
        return this.#createEnvelope(false, null, 'الشركة غير موجودة بالنظام', { message: 'الشركة غير موجودة بالنظام' });
      }

      // 1. تحديث حالة الشركة إلى active في Supabase
      let sbSuccess = true;
      if (supabase) {
        const compRes = await this.sbWrite(
          supabase.from('companies').update({ status: 'active', is_active: true }).eq('id', companyId),
          'تفعيل حساب الشركة',
          { table: 'companies', id: companyId, action: 'update', payload: { status: 'active', is_active: true }, match: { id: companyId } }
        );
        if (!compRes.success) sbSuccess = false;
      }

      // 2. تحديث حالة الشركة محلياً
      company.status = 'active';

      // 3. إنشاء موظف جديد ليكون مدير هذه الشركة (role = 'manager')
      const managerName = company.managerName || company.manager_name || 'مدير الشركة';
      const managerEmail = company.email || company.manager_email || `admin@comp-${companyId.slice(0, 6)}.com`;
      const managerPhone = company.phone || company.manager_phone || '';

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
        role: 'manager',
        status: 'active',
        department: 'الإدارة العامة',
        jobTitle: 'مدير عام الشركة',
        baseSalary: 15000,
        housingAllowance: 2000,
        transportAllowance: 1000,
        otherAllowances: 1000,
        salaryStatus: 'processing',
        leaveBalance: 21,
        hireDate: new Date().toISOString().split('T')[0]
      });

      // ربط حساب المدير إذا كان معرف المستخدم user_id متوفراً مسبقاً من مرحلة التسجيل
      if (company.user_id) {
        managerEmp.user_id = company.user_id;
      } else {
        // لا يتم استدعاء supabase.auth.signUp هنا منعاً لاستبدال جلسة المبرمج الحالية في المتصفح
        console.info('[Tenant Approval]: تم اعتماد حساب الشركة؛ وسيتم ربط حساب الدخول عبر البريد الإلكتروني أو دعوة المستخدم.');
      }

      // 4. إدراج أو تحديث حساب المدير في جدول employees في Supabase
      if (supabase) {
        const sbPayload = this.#toSupabaseEmployee(managerEmp, companyId);
        sbPayload.role = 'manager';
        sbPayload.status = 'active';
        delete sbPayload.pin;
        if (managerEmp.user_id) sbPayload.user_id = managerEmp.user_id;

        let existingEmp = null;
        if (managerEmail) {
          try {
            const { data: found } = await supabase
              .from('employees')
              .select('id, email, company_id')
              .eq('email', managerEmail)
              .maybeSingle();
            if (found) existingEmp = found;
          } catch (e) {}
        }

        let empQuery;
        let empAction = 'insert';
        if (existingEmp) {
          empAction = 'update';
          managerEmp.id = existingEmp.id;
          const updateFields = {
            company_id: companyId,
            status: 'active',
            role: 'manager'
          };
          if (managerEmp.user_id) updateFields.user_id = managerEmp.user_id;
          empQuery = supabase.from('employees').update(updateFields).eq('id', existingEmp.id);
        } else {
          empQuery = supabase.from('employees').insert([sbPayload]);
        }

        const empRes = await this.sbWrite(
          empQuery,
          'إنشاء حساب مدير الشركة المعتمدة',
          { table: 'employees', id: managerEmp.id, record: managerEmp, action: empAction, payload: sbPayload }
        );
        if (!empRes.success) sbSuccess = false;
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

      if (!sbSuccess) {
        return this.#createEnvelope(false, { company, manager: managerEmp }, 'تم اعتماد وتفعيل الشركة محلياً وتعذر الحفظ السحابي حالياً', {
          pendingSync: true,
          message: `تم اعتماد الشركة "${company.companyName}" محلياً بانتظار المزامنة السحابية.`
        });
      }

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
      let sbSuccess = true;
      if (supabase) {
        const r1 = await this.sbWrite(
          supabase.from('companies').delete().eq('id', companyId),
          'حذف شركة',
          { table: 'companies', id: companyId, action: 'delete', match: { id: companyId } }
        );
        if (!r1.success) sbSuccess = false;

        const r2 = await this.sbWrite(
          supabase.from('employees').delete().eq('company_id', companyId),
          'حذف موظفي الشركة',
          { table: 'employees', action: 'delete', match: { company_id: companyId } }
        );
        if (!r2.success) sbSuccess = false;
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

      if (!sbSuccess) {
        return this.#createEnvelope(false, null, 'تم حذف الشركة محلياً وتعذر الحذف السحابي حالياً', {
          pendingSync: true,
          message: `تم حذف الشركة "${compName}" محلياً بانتظار المزامنة السحابية.`
        });
      }

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
        } catch (e) {
          console.warn('[Supabase getDepartments Warning]:', e);
        }
      }

      if (list === null) {
        const db = LocalDatabase.getDB();
        list = Array.isArray(db.departments) ? [...db.departments] : [];
      }

      const db = LocalDatabase.getDB();
      const employees = Array.isArray(db.employees) ? db.employees : [];
      const enriched = list.map(d => ({
        ...d,
        nameEn: d.nameEn || d.name_en || '',
        managerId: d.managerId || d.manager_id || null,
        managerName: d.managerName || d.manager_name || '',
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
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(idOrName || '').trim());
          let dq = supabase.from('departments').select('*').eq('company_id', companyId);
          dq = isUUID ? dq.eq('id', idOrName) : dq.eq('name', idOrName);
          const { data } = await dq.maybeSingle();
          if (data) dept = data;
        } catch (e) {
          console.warn('[Supabase getDepartmentById Warning]:', e);
        }
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

      // 1. الإدراج في Supabase مع مطابقة أسماء الأعمدة في قاعدة البيانات وترك Postgres يولّد UUID
      let sbSuccess = true;
      if (supabase) {
        const sbDept = {
          company_id: companyId,
          name: name,
          name_en: deptData.nameEn || deptData.name_en || '',
          code: (deptData.code || name.slice(0, 3)).toUpperCase(),
          description: deptData.description || '',
          manager_id: deptData.managerId || deptData.manager_id || null,
          manager_name: deptData.managerName || deptData.manager_name || ''
        };
        let query = supabase.from('departments').insert([sbDept]);
        if (query && typeof query.select === 'function') {
          query = query.select().single();
        }
        const writeRes = await this.sbWrite(
          query,
          'إنشاء قسم جديد',
          { table: 'departments', id: newId, record: newDept, action: 'insert', payload: sbDept }
        );
        if (writeRes.success && writeRes.data && writeRes.data.id) {
          newDept.id = writeRes.data.id;
        } else if (!writeRes.success) {
          sbSuccess = false;
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

      if (!sbSuccess) {
        return this.#createEnvelope(false, cloneData(newDept), 'تم إنشاء القسم محلياً وتعذر الحفظ السحابي حالياً', {
          pendingSync: true,
          department: cloneData(newDept),
          message: `تم إنشاء قسم (${name}) محلياً بانتظار المزامنة السحابية.`
        });
      }

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

      // 1. التحديث في Supabase مع فلتر company_id الإجباري وأسماء الأعمدة الفعلية
      let sbSuccess = true;
      if (supabase) {
        const updatePayload = {
          name: newName,
          name_en: dept.nameEn || dept.name_en || '',
          code: dept.code,
          description: dept.description,
          manager_id: dept.managerId || dept.manager_id || null,
          manager_name: dept.managerName || dept.manager_name || ''
        };
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(dept.id || '').trim());
        let uq = supabase.from('departments').update(updatePayload).eq('company_id', companyId);
        uq = isUUID ? uq.eq('id', dept.id) : uq.eq('name', oldName);
        const writeRes = await this.sbWrite(
          uq,
          'تحديث بيانات القسم',
          { table: 'departments', id: dept.id, record: dept, action: 'update', payload: updatePayload, match: { id: dept.id, company_id: companyId } }
        );
        if (!writeRes.success) sbSuccess = false;
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

      if (!sbSuccess) {
        return this.#createEnvelope(false, cloneData(dept), 'تم تحديث بيانات القسم محلياً وتعذر التحديث السحابي حالياً', {
          pendingSync: true,
          department: cloneData(dept),
          message: `تم تحديث بيانات قسم (${newName}) محلياً بانتظار المزامنة السحابية.`
        });
      }

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
      let sbSuccess = true;
      if (supabase) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(target.id || '').trim());
        let delQ = supabase.from('departments').delete().eq('company_id', companyId);
        delQ = isUUID ? delQ.eq('id', target.id) : delQ.eq('name', target.name);
        const writeRes = await this.sbWrite(
          delQ,
          'حذف قسم إداري',
          { table: 'departments', id: target.id, action: 'delete', match: { id: target.id, company_id: companyId } }
        );
        if (!writeRes.success) sbSuccess = false;
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

      if (!sbSuccess) {
        return this.#createEnvelope(false, { id: target.id, name: target.name }, 'تم حذف القسم محلياً وتعذر الحذف السحابي حالياً', {
          pendingSync: true,
          message: `تم حذف قسم (${target.name}) محلياً بانتظار المزامنة السحابية.`
        });
      }

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

          if (filters.employeeId && filters.employeeId !== 'all') {
            const cleanEmpId = String(filters.employeeId).trim();
            const isEmpUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanEmpId);
            if (isEmpUUID) {
              query = query.eq('employee_id', cleanEmpId);
            } else {
              const db = LocalDatabase.getDB();
              const foundEmp = (db.employees || []).find(e => e.id === cleanEmpId || e.employee_code === cleanEmpId);
              if (foundEmp && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(foundEmp.id || ''))) {
                query = query.eq('employee_id', foundEmp.id);
              }
            }
          }
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
        } catch (e) {
          console.warn('[Supabase getRequestById Warning]:', e);
        }
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
      const rawEmpId = requestData.employeeId || requestData.employee_id;
      const emp = await this.resolveEmployee(rawEmpId, signal);
      if (!emp) return this.#createEnvelope(false, null, 'الموظف غير موجود');

      const db = LocalDatabase.getDB();

      const isUUID = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || '').trim());
      const hasValidUUID = isUUID(requestData.id);
      const type = requestData.type || 'annual_leave';
      const typeName = this.getRequestTypeName(type);
      const newId = hasValidUUID ? requestData.id : (requestData.id || `REQ-${Date.now()}`);
      const submittedAt = new Date().toISOString();

      const newRequest = {
        id: newId,
        company_id: companyId,
        employeeId: emp.id,
        employee_id: emp.id,
        employeeName: emp.fullName || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        department: emp.department || '',
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

      // 1. الإدراج في Supabase أولاً مع حقل company_id الإجباري وتوليد UUID تلقائياً
      let sbSuccess = true;
      if (supabase) {
        const sbReq = {
          company_id: companyId,
          employee_id: emp.id,
          request_type: type,
          details: newRequest,
          status: newRequest.status,
          created_at: submittedAt
        };
        let query = supabase.from('requests').insert([sbReq]);
        if (query && typeof query.select === 'function') {
          query = query.select().single();
        }
        const writeRes = await this.sbWrite(
          query,
          'إنشاء طلب جديد',
          { table: 'requests', id: newId, record: newRequest, action: 'insert', payload: sbReq }
        );
        if (writeRes.success && writeRes.data && writeRes.data.id) {
          newRequest.id = writeRes.data.id;
        } else if (!writeRes.success) {
          sbSuccess = false;
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

      if (!sbSuccess) {
        return this.#createEnvelope(false, cloneData(newRequest), 'تم تسجيل الطلب محلياً وتعذر الحفظ السحابي حالياً', {
          pendingSync: true,
          request: cloneData(newRequest),
          message: `تم تقديم طلب (${typeName}) محلياً بنجاح برقم (${newId}) بانتظار المزامنة السحابية.`
        });
      }

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
      let sbSuccess = true;
      if (supabase) {
        const updatePayload = {
          status: status,
          reviewed_by: req.reviewedBy,
          review_notes: req.reviewNotes,
          details: req
        };
        const writeRes = await this.sbWrite(
          supabase
            .from('requests')
            .update(updatePayload)
            .eq('id', requestId)
            .eq('company_id', companyId),
          'تحديث حالة الطلب',
          { table: 'requests', id: requestId, record: req, action: 'update', payload: updatePayload, match: { id: requestId, company_id: companyId } }
        );
        if (!writeRes.success) sbSuccess = false;
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

      if (!sbSuccess) {
        return this.#createEnvelope(false, cloneData(req), 'تم تحديث حالة الطلب محلياً وتعذر التحديث السحابي حالياً', {
          pendingSync: true,
          request: cloneData(req),
          message: `تم ${actionTypeName} الطلب محلياً بانتظار المزامنة السحابية.`
        });
      }

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
      let sbSuccess = true;
      if (supabase) {
        const writeRes = await this.sbWrite(
          supabase
            .from('requests')
            .delete()
            .eq('id', requestId)
            .eq('company_id', companyId),
          'حذف طلب',
          { table: 'requests', id: requestId, action: 'delete', match: { id: requestId, company_id: companyId } }
        );
        if (!writeRes.success) sbSuccess = false;
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

      if (!sbSuccess) {
        return this.#createEnvelope(false, { id: requestId }, 'تم حذف الطلب محلياً وتعذر الحذف السحابي حالياً', {
          pendingSync: true,
          message: 'تم حذف الطلب محلياً بانتظار المزامنة السحابية.'
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

      if (companyId) {
        logs = logs.filter(l => !l.company_id || l.company_id === companyId);
      }

      // جلب السجلات من Supabase أولاً عند توفر عميل السحابة
      if (supabase && companyId) {
        try {
          const fromQ = supabase.from('audit_logs');
          let q = fromQ && typeof fromQ.select === 'function' ? fromQ.select('*') : null;
          if (q && typeof q.eq === 'function') q = q.eq('company_id', companyId);
          if (q && typeof q.order === 'function') q = q.order('created_at', { ascending: false });
          if (q && typeof q.limit === 'function') q = q.limit(200);
          const { data: sbLogs, error: sbErr } = q ? (await q) : { data: null, error: null };

          if (!sbErr && Array.isArray(sbLogs) && sbLogs.length > 0) {
            const mapped = sbLogs.map(sl => ({
              id: sl.id,
              company_id: sl.company_id,
              timestamp: sl.created_at || new Date().toISOString(),
              dateFormatted: sl.created_at ? AuditMiddleware.formatEgyptianDateTime(new Date(sl.created_at)) : '',
              performedBy: {
                id: sl.performed_by || 'SYSTEM',
                name: sl.performed_by || 'النظام الآلي',
                role: 'system',
                roleArabic: 'مستخدم'
              },
              action: sl.action || 'MUTATE_DATA',
              actionType: 'تعديل',
              target: sl.target || 'system',
              targetId: sl.target_id || null,
              details: sl.details || '',
              payloadSummary: null
            }));
            const seenIds = new Set(mapped.map(m => m.id));
            logs = [...mapped, ...logs.filter(l => !seenIds.has(l.id))];
          }
        } catch (sbEx) {
          console.warn('[Supabase getAuditLogs Warning]:', sbEx);
        }
      }

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
            .select(EMPLOYEE_PUBLIC_COLS)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data)) {
            employees = data.map(e => this.#normalizeEmployee(e));
            // مزامنة الموظفين المسترجعين من السحابة في LocalDatabase
            try {
              const db = LocalDatabase.getDB();
              if (!Array.isArray(db.employees)) db.employees = [];
              employees.forEach(emp => {
                const idx = db.employees.findIndex(e => e.id === emp.id || (e.employee_code && e.employee_code === emp.employee_code));
                if (idx !== -1) db.employees[idx] = emp;
                else db.employees.push(emp);
              });
              LocalDatabase.saveDB(db);
            } catch (cacheErr) {
              console.warn('[Cache Supabase Employees Warning]:', cacheErr);
            }
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

  /**
   * دالة موحدة وحصينة لجلب الموظف بالـ UUID أو كود الموظف (employee_code)
   * تبحث في LocalDatabase ثم Supabase عبر EMPLOYEE_PUBLIC_COLS دون إرسال كود نصي لعمود UUID
   */
  static async resolveEmployee(idOrCode, signal = null) {
    if (!idOrCode) return null;
    const clean = String(idOrCode).trim();
    if (!clean) return null;

    const db = LocalDatabase.getDB();
    let emp = (db.employees || []).find(e => 
      e.id === clean || 
      e.employee_code === clean || 
      e.employeeCode === clean
    );
    if (emp) return cloneData(emp);

    // البحث في Supabase مع مراعاة هل المعرف UUID أم employee_code
    if (supabase) {
      try {
        const companyId = this.getCurrentCompanyId();
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
        let q = supabase
          .from('employees')
          .select(EMPLOYEE_PUBLIC_COLS)
          .eq('company_id', companyId);
        q = isUUID ? q.eq('id', clean) : q.eq('employee_code', clean);
        const { data, error } = await q.maybeSingle();
        if (!error && data) {
          emp = this.#normalizeEmployee(data);
          if (!Array.isArray(db.employees)) db.employees = [];
          const idx = db.employees.findIndex(e => e.id === emp.id || (e.employee_code && e.employee_code === emp.employee_code));
          if (idx !== -1) db.employees[idx] = emp;
          else db.employees.push(emp);
          LocalDatabase.saveDB(db);
          return cloneData(emp);
        }
      } catch (e) {
        console.warn('[Supabase resolveEmployee Warning]:', e);
      }
    }

    // محاولة أخيرة عبر getEmployees للبحث الشامل
    try {
      const res = await this.getEmployees(signal);
      const found = (res.data || []).find(e => 
        e.id === clean || 
        e.employee_code === clean || 
        e.employeeCode === clean
      );
      if (found) return cloneData(found);
    } catch (e) {
      console.warn('[resolveEmployee getEmployees Warning]:', e);
    }

    return null;
  }

  static async getEmployeeById(id, signal = null) {
    try {
      await this.simulateDelay(40, signal);
      const emp = await this.resolveEmployee(id, signal);
      if (!emp) return this.#createEnvelope(false, null, 'الموظف غير موجود');
      return this.#createEnvelope(true, cloneData(emp));
    } catch (err) {
      return this.#handleError(err, 'فشل في استرجاع بيانات الموظف');
    }
  }

  static async findEmployee(query, signal = null) {
    try {
      await this.simulateDelay(40, signal);
      const emp = await this.resolveEmployee(query, signal);
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
      const companyId = empData.company_id || empData.companyId || this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();

      // التحقق الأمني: رتبة مبرمج النظام محصورة فقط للمبرمج Super Admin
      if (empData.role === 'programmer') {
        const actor = AuditMiddleware.getCurrentActor();
        const curRole = actor?.role || 'employee';
        if (curRole !== 'programmer') {
          return this.#createEnvelope(false, null, 'صلاحية مرفوضة: لا يمكن تعيين رتبة مبرمج إلا من قبل المبرمج نفسه (Super Admin)', {
            message: 'صلاحية مرفوضة: لا يمكن تعيين رتبة مبرمج إلا من قبل المبرمج نفسه (Super Admin)'
          });
        }
      }

      // تحديد كود الموظف والتحقق من عدم تكراره داخل نفس الشركة
      const rawCode = empData.employee_code || empData.employeeCode || empData.id;
      const proposedCode = rawCode ? String(rawCode).trim() : await this.getNextEmployeeId(companyId);

      const codeTaken = await this.isEmployeeCodeTaken(proposedCode, null, companyId);
      if (codeTaken) {
        return this.#createEnvelope(false, null, `كود الموظف (${proposedCode}) مستخدم بالفعل داخل هذه المنشأة! يرجى اختيار كود آخر.`, {
          message: `كود الموظف (${proposedCode}) مستخدم بالفعل داخل هذه المنشأة! يرجى اختيار كود آخر.`
        });
      }

      const hasValidPin = empData.pin && 
        String(empData.pin).trim() !== '' && 
        String(empData.pin).trim() !== 'undefined' && 
        /^\d{6}$/.test(String(empData.pin).trim());

      if (hasValidPin) {
        const cleanPin = String(empData.pin).trim();
        const pinTaken = await this.isPinTaken(cleanPin);
        if (pinTaken) {
          return this.#createEnvelope(false, null, 'رمز الـ PIN المدخل مستخدم بالفعل لحساب آخر بالنظام! يرجى اختيار رمز PIN فريد.', {
            message: 'رمز الـ PIN المدخل مستخدم بالفعل لحساب آخر بالنظام! يرجى اختيار رمز PIN فريد.'
          });
        }
      }

      const newId = empData.id || proposedCode;
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
        employee_code: proposedCode,
        employeeCode: proposedCode,
        pin: hasValidPin ? String(empData.pin).trim() : null,
        company_id: companyId
      });

      // 1. الإدراج في Supabase أولاً مع حقل company_id واسترجاع UUID المولّد
      let sbSuccess = true;
      if (supabase) {
        const sbPayload = this.#toSupabaseEmployee(normalized, companyId);
        let query = supabase.from('employees').insert([sbPayload]);
        if (query && typeof query.select === 'function') {
          query = query.select(EMPLOYEE_PUBLIC_COLS).single();
        }
        const writeRes = await this.sbWrite(
          query,
          'إضافة موظف جديد',
          { table: 'employees', id: newId, record: normalized, action: 'insert', payload: sbPayload }
        );
        if (writeRes.success && writeRes.data && writeRes.data.id) {
          normalized.id = writeRes.data.id;
        } else if (!writeRes.success) {
          sbSuccess = false;
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
        details: `إضافة موظف جديد: ${normalized.fullName} (${newId}) بشركة (${companyId}) - قسم ${normalized.department} - كود (${proposedCode})`,
        payload: { ...empData, company_id: companyId }
      });

      if (!sbSuccess) {
        return this.#createEnvelope(false, cloneData(normalized), 'تمت إضافة الموظف محلياً وتعذر الحفظ السحابي حالياً', {
          pendingSync: true,
          message: 'تمت إضافة الموظف محلياً بانتظار المزامنة السحابية.'
        });
      }

      return this.#createEnvelope(true, cloneData(normalized), null, { message: 'تمت إضافة الموظف بنجاح' });
    } catch (err) {
      return this.#handleError(err, 'فشل في إضافة الموظف');
    }
  }

  static async updateEmployee(id, updatedFields, signal = null) {
    try {
      await this.simulateDelay(100, signal);
      if (!id || String(id).trim() === '') {
        return this.#createEnvelope(false, null, 'معرف الموظف مطلوب');
      }
      if (!updatedFields || typeof updatedFields !== 'object' || Array.isArray(updatedFields)) {
        return this.#createEnvelope(false, null, 'بيانات التحديث غير صالحة');
      }

      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();

      const allowedFields = new Set([
        'fullName', 'firstName', 'lastName', 'first_name', 'last_name',
        'employee_code', 'employeeCode', 'email', 'phone', 'department',
        'jobTitle', 'job_title', 'role', 'status', 'hireDate', 'hire_date',
        'salary', 'baseSalary', 'housingAllowance', 'housing_allowance',
        'transportAllowance', 'transport_allowance', 'otherAllowances', 'other_allowances',
        'insurancePercent', 'insurance_percent', 'leaveBalance', 'leave_balance',
        'shiftStart', 'shift_start', 'shiftEnd', 'shift_end',
        'salesTarget', 'sales_target', 'salesAchieved', 'sales_achieved',
        'commissionRate', 'commission_rate', 'salaryStatus', 'salary_status',
        'monthlySales', 'pin', 'avatar', 'gender'
      ]);

      const safeFields = {};
      for (const [key, value] of Object.entries(updatedFields)) {
        if (allowedFields.has(key) && value !== undefined) {
          safeFields[key] = value;
        }
      }

      // التحقق الأمني: لا يسمح بترقية أي حساب إلى رتبة مبرمج إلا من قبل المبرمج نفسه
      if (safeFields.role === 'programmer') {
        const actor = AuditMiddleware.getCurrentActor();
        const curRole = actor?.role || 'employee';
        if (curRole !== 'programmer') {
          return this.#createEnvelope(false, null, 'صلاحية مرفوضة: لا يمكن ترقية أي حساب إلى رتبة مبرمج إلا من قبل المبرمج نفسه (Super Admin)', {
            message: 'صلاحية مرفوضة: لا يمكن ترقية أي حساب إلى رتبة مبرمج إلا من قبل المبرمج نفسه (Super Admin)'
          });
        }
      }

      if (safeFields.gender) {
        if (!safeFields.avatar) {
          safeFields.avatar = safeFields.gender === 'female' ? DEFAULT_AVATARS.female : DEFAULT_AVATARS.male;
        }
      } else if (safeFields.fullName && !safeFields.avatar) {
        const g = detectGender(safeFields.fullName);
        safeFields.gender = g;
        safeFields.avatar = g === 'female' ? DEFAULT_AVATARS.female : DEFAULT_AVATARS.male;
      }

      // البحث عن الموظف الحالي في قاعدة البيانات المحلية لتحديد بياناته وهويته بدقة
      const currentEmp = (db.employees || []).find(e => 
        e.id === id || 
        e.employee_code === id || 
        (safeFields.email && e.email && e.email.toLowerCase() === String(safeFields.email).toLowerCase())
      );

      // فحص وتحديث كود الموظف
      if (safeFields.employee_code || safeFields.employeeCode) {
        const newCode = String(safeFields.employee_code || safeFields.employeeCode).trim();
        const codeTaken = await this.isEmployeeCodeTaken(newCode, id, companyId);
        if (codeTaken) {
          return this.#createEnvelope(false, null, `كود الموظف (${newCode}) مستخدم بالفعل داخل هذه المنشأة! يرجى اختيار كود آخر.`, {
            message: `كود الموظف (${newCode}) مستخدم بالفعل داخل هذه المنشأة! يرجى اختيار كود آخر.`
          });
        }
        safeFields.employee_code = newCode;
        safeFields.employeeCode = newCode;
      }

      // فحص وتحديث رمز PIN: لا يُعدل ولا يُرسل إلا إذا كان 6 أرقام صالحة
      const hasValidPin = safeFields.pin && 
        String(safeFields.pin).trim() !== '' && 
        String(safeFields.pin).trim() !== 'undefined' && 
        /^\d{6}$/.test(String(safeFields.pin).trim());

      if (hasValidPin) {
        const cleanNewPin = String(safeFields.pin).trim();
        const currentPin = currentEmp ? String(currentEmp.pin || '').trim() : null;

        // إذا لم يتغير الرمز السري عن الرمز الحالي للموظف نفسه، نتجاوز الفحص تماماً لتفادي الخطأ الزائف
        if (currentPin !== cleanNewPin) {
          const excludeEmpId = currentEmp?.id || id;
          const excludeCompId = currentEmp?.company_id || companyId;
          const excludeEmail = currentEmp?.email || safeFields.email || null;
          const pinTaken = await this.isPinTaken(cleanNewPin, excludeEmpId, excludeCompId, excludeEmail);
          if (pinTaken) {
            return this.#createEnvelope(false, null, 'رمز الـ PIN المدخل مستخدم بالفعل لموظف أو مسؤول آخر بالنظام! يرجى اختيار رمز مختلف.', {
              message: 'رمز الـ PIN المدخل مستخدم بالفعل لموظف أو مسؤول آخر بالنظام! يرجى اختيار رمز مختلف.'
            });
          }
        }
        safeFields.pin = cleanNewPin;
      } else {
        // حماية تامة: إذا لم يُدخل قيمة جديدة صحيحة (6 أرقام) يُحذف حقل الـ PIN تماماً
        delete safeFields.pin;
      }

      // 1. التحديث في Supabase أولاً مع فلتر company_id الإجباري
      let sbSuccess = true;
      if (supabase) {
        const sbUpdate = {};
        if (safeFields.employee_code) sbUpdate.employee_code = safeFields.employee_code;
        if (safeFields.pin) sbUpdate.pin = safeFields.pin;
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
          let supQuery = supabase.from('employees').update(sbUpdate);
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || '').trim());
          if (isUUID) {
            supQuery = supQuery.eq('id', id);
          } else {
            supQuery = supQuery.eq('employee_code', id);
          }
          const writeRes = await this.sbWrite(
            supQuery.eq('company_id', companyId),
            'تحديث بيانات موظف',
            { table: 'employees', id, record: { ...(currentEmp || {}), ...safeFields, id }, action: 'update', payload: sbUpdate, match: { id, company_id: companyId } }
          );
          if (!writeRes.success) sbSuccess = false;
        }
      }

      // 2. التحديث في LocalDatabase
      const idx = (db.employees || []).findIndex(e => 
        e.id === id || 
        e.employee_code === id || 
        (currentEmp && (e.id === currentEmp.id || e.employee_code === currentEmp.employee_code))
      );
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

      if (!sbSuccess) {
        return this.#createEnvelope(false, cloneData(updatedEmp), 'تم تحديث بيانات الموظف محلياً وتعذر الحفظ السحابي حالياً', {
          pendingSync: true,
          message: 'تم تحديث بيانات الموظف محلياً بانتظار المزامنة السحابية.'
        });
      }

      return this.#createEnvelope(true, cloneData(updatedEmp), null, { message: 'تم تحديث بيانات الموظف بنجاح' });
    } catch (err) {
      return this.#handleError(err, 'فشل في تحديث بيانات الموظف');
    }
  }

  /**
   * تغيير رمز PIN السري للموظف بواسطة الموظف نفسه مع التحقق الأمني
   * @param {string} employeeId 
   * @param {string} oldPin 
   * @param {string} newPin 
   */
  static async changeEmployeePin(employeeId, oldPin, newPin) {
    try {
      await this.simulateDelay(100);
      const cleanOldPin = String(oldPin || '').trim();
      const cleanNewPin = String(newPin || '').trim();

      if (!cleanNewPin || !/^\d{6}$/.test(cleanNewPin)) {
        return this.#createEnvelope(false, null, 'يجب أن يتكون رمز PIN الجديد من 6 أرقام تماماً');
      }

      if (cleanNewPin === cleanOldPin) {
        return this.#createEnvelope(false, null, 'رمز PIN الجديد يجب أن يكون مختلفاً عن الرمز القديم');
      }

      const db = LocalDatabase.getDB();
      const emp = (db.employees || []).find(e => e.id === employeeId || e.employee_code === employeeId);
      if (!emp) {
        return this.#createEnvelope(false, null, 'لم يتم العثور على بيانات الموظف في النظام');
      }

      // التحقق من صحة الرمز القديم
      const expectedOldPin = String(emp.pin || '').trim();
      if (expectedOldPin && expectedOldPin !== cleanOldPin) {
        return this.#createEnvelope(false, null, 'رمز PIN الحالي غير صحيح! يرجى التأكد من الرمز والمحاولة ثانيةً');
      }

      // فحص عدم استخدام الرمز الجديد لحساب آخر
      const cId = emp.company_id || this.getCurrentCompanyId();
      const pinTaken = await this.isPinTaken(cleanNewPin, emp.id, cId);
      if (pinTaken) {
        return this.#createEnvelope(false, null, 'رمز PIN الجديد مستخدم بالفعل لحساب آخر بالنظام! يرجى اختيار رمز مختلف');
      }

      // تحديث الموظف
      emp.pin = cleanNewPin;

      // إذا كان الموظف مديراً لشركة، نحدث رمز المدير أيضاً للشركة المتوافقة
      if (emp.role === 'manager' || emp.role === 'admin' || emp.role === 'hr') {
        const cId = emp.company_id || this.getCurrentCompanyId();
        const company = (db.companies || []).find(c => c.id === cId || c.email === emp.email);
        if (company) {
          company.pin = cleanNewPin;
          company.manager_pin = cleanNewPin;
        }
      }

      // الحفظ في LocalDatabase
      LocalDatabase.saveDB(db);

      // التحديث في Supabase
      let sbSuccess = true;
      if (supabase) {
        const w1 = await this.sbWrite(
          supabase.from('employees').update({ pin: cleanNewPin }).eq('id', emp.id),
          'تغيير رمز PIN للموظف',
          { table: 'employees', id: emp.id, action: 'update', payload: { pin: cleanNewPin }, match: { id: emp.id } }
        );
        if (!w1.success) sbSuccess = false;

        if (emp.role === 'manager' || emp.role === 'admin') {
          const w2 = await this.sbWrite(
            supabase.from('companies').update({ manager_pin: cleanNewPin }).eq('id', emp.company_id),
            'تحديث رمز PIN لمدير الشركة',
            { table: 'companies', id: emp.company_id, action: 'update', payload: { manager_pin: cleanNewPin }, match: { id: emp.company_id } }
          );
          if (!w2.success) sbSuccess = false;
        }
      }

      // تسجيل الحدث الرقابي
      AuditMiddleware.log({
        action: 'CHANGE_PIN',
        actionType: 'تعديل أمني',
        target: 'employees',
        targetId: emp.id,
        details: `قام الموظف ${emp.fullName || emp.id} بتغيير رمز PIN السري الخاص به بنجاح.`
      });

      if (!sbSuccess) {
        return this.#createEnvelope(false, { employeeId: emp.id, pin: cleanNewPin }, 'تم تغيير رمز PIN محلياً وتعذر التحديث السحابي حالياً', {
          pendingSync: true,
          message: 'تم تغيير رمز PIN السري محلياً بانتظار المزامنة السحابية.'
        });
      }

      return this.#createEnvelope(true, { employeeId: emp.id, pin: cleanNewPin }, 'تم تغيير رمز PIN السري الخاص بك بنجاح!');
    } catch (err) {
      return this.#handleError(err, 'فشل تغيير رمز PIN السري');
    }
  }

  static async deleteEmployee(id, signal = null) {
    try {
      await this.simulateDelay(80, signal);
      const companyId = this.getCurrentCompanyId();
      const db = LocalDatabase.getDB();

      // 1. الحذف من Supabase مع فلتر company_id الإجباري
      let sbSuccess = true;
      if (supabase) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || '').trim());
        let delQuery = supabase.from('employees').delete().eq('company_id', companyId);
        delQuery = isUUID ? delQuery.eq('id', id) : delQuery.eq('employee_code', id);
        const writeRes = await this.sbWrite(
          delQuery,
          'حذف موظف',
          { table: 'employees', id, action: 'delete', match: { id, company_id: companyId } }
        );
        if (!writeRes.success) sbSuccess = false;
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

      if (!sbSuccess) {
        return this.#createEnvelope(false, { id }, 'تم حذف الموظف محلياً وتعذر الحذف السحابي حالياً', {
          pendingSync: true,
          message: 'تم حذف الموظف محلياً بانتظار المزامنة السحابية.'
        });
      }

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
      if (input.employeeId) {
        employee = await this.resolveEmployee(input.employeeId, signal);
      } else if (input.pin) {
        const localE = (db.employees || []).find(e => String(e.pin).trim() === String(input.pin).trim());
        if (localE) employee = cloneData(localE);
      }

      if (!employee) {
        const errMsg = input.pin ? 'رمز PIN المكون من 6 أرقام غير صحيح!' : 'بصمة الإصبع غير مطابقة لأي سجل وظيفي!';
        return this.#createEnvelope(false, null, errMsg, { message: errMsg });
      }

      if (employee.status === 'suspended') {
        const msg = 'تم إيقاف هذا الحساب، يرجى مراجعة إدارة الموارد البشرية';
        return this.#createEnvelope(false, null, msg, { message: msg });
      }

      if (employee.status === 'pending') {
        const msg = 'عفواً، لا يمكن تسجيل الحضور حتى يتم اعتماد حسابك من قبل إدارة الموارد البشرية.';
        return this.#createEnvelope(false, null, msg, { message: msg });
      }

      const now = new Date(Date.now());
      const nowTimeStr = ApiService.getCairoTimeString(now);
      const todayStr = ApiService.getCairoDateString(now);
      const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = ApiService.getCairoDateString(yesterdayDate);

      const isGeofenceRequired = (localSettings.geofenceRequired !== false) && (db.company_settings?.geofenceRequired !== false);
      const coordsInput = input.location_coords || input.coords;
      const rawLat = coordsInput?.lat ?? coordsInput?.latitude;
      const rawLng = coordsInput?.lng ?? coordsInput?.longitude;
      const hasValidCoords = coordsInput &&
        rawLat !== null && rawLat !== undefined &&
        rawLng !== null && rawLng !== undefined &&
        Number.isFinite(Number(rawLat)) &&
        Number.isFinite(Number(rawLng)) &&
        Number(rawLat) !== 0 &&
        Number(rawLng) !== 0;

      if (isGeofenceRequired && !hasValidCoords) {
        const failMsg = 'عفواً، لا يمكن تسجيل البصمة بدون إحداثيات موقع جغرافي صالحة (GPS). يرجى تفعيل الموقع والمحاولة مجدداً.';
        return this.#createEnvelope(false, null, failMsg, {
          message: failMsg,
          geofenceMissing: true
        });
      }

      const locationCoords = hasValidCoords
        ? {
            lat: Number(rawLat),
            lng: Number(rawLng),
            label: coordsInput.label || 'موقع مسجل',
            accuracy: Number(coordsInput.accuracy || 10)
          }
        : {
            lat: compLat,
            lng: compLng,
            label: localSettings.companyAddress || 'المقر الرئيسي المعتمد (معفى من GPS)',
            accuracy: 10
          };

      // 3. تطبيق التحكم الجغرافي (Geofencing Verification) فعلياً
      if (isGeofenceRequired && locationCoords.lat && locationCoords.lng && compLat && compLng) {
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
        } catch (e) {
          console.warn('[Supabase Attendance Today Record Warning]:', e);
        }
      }

      if (!todayRecord) {
        const localRec = (db.attendance || []).find(a => a.employeeId === employee.id && a.date === todayStr);
        if (localRec) todayRecord = cloneData(localRec);
      }

      // الوردية الليلية: إذا لم يكن هناك تسجيل حضور لليوم وكان هناك سجل مفتوح (checkIn بدون checkOut) من اليوم السابق
      let isNightShiftCheckOut = false;
      if (!todayRecord || !todayRecord.checkIn) {
        let yesterdayRecord = null;
        if (supabase) {
          try {
            const { data: sbYest } = await supabase
              .from('attendance')
              .select('*')
              .eq('company_id', companyId)
              .eq('employee_id', employee.id)
              .eq('date', yesterdayStr)
              .maybeSingle();
            if (sbYest) {
              yesterdayRecord = this.#normalizeAttendance(sbYest, { [employee.id]: employee });
            }
          } catch (e) {
            console.warn('[Supabase Attendance Yesterday Record Warning]:', e);
          }
        }

        if (!yesterdayRecord) {
          const localYest = (db.attendance || []).find(a => a.employeeId === employee.id && a.date === yesterdayStr);
          if (localYest) yesterdayRecord = cloneData(localYest);
        }

        if (yesterdayRecord && yesterdayRecord.checkIn && !yesterdayRecord.checkOut) {
          todayRecord = yesterdayRecord;
          isNightShiftCheckOut = true;
        }
      }

      let morningPerm = (db.permissions || []).find(p =>
        p.employeeId === employee.id &&
        p.date === (isNightShiftCheckOut ? todayRecord.date : todayStr) &&
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
        const gracePeriodMinutes = Number.isFinite(Number(localSettings.gracePeriodMinutes))
          ? Number(localSettings.gracePeriodMinutes)
          : 15;
        const isLateAfterGrace = netLateMins > gracePeriodMinutes;
        const status = isLateAfterGrace ? 'late' : 'present';

        if (rawLateMins === 0) {
          message = 'تم تسجيل الحضور في الوقت المحدد بنجاح (الموقع الجغرافي موثق). يومك سعيد ومثمر!';
        } else if (permittedLateMins > 0 && netLateMins <= gracePeriodMinutes) {
          message = `تم تسجيل الحضور مع إذن مسبق (${morningPerm.hours} ساعة). معفى من الخصم (GPS موثق).`;
        } else if (rawLateMins <= gracePeriodMinutes) {
          message = `تم تسجيل الحضور ضمن فترة السماح (${gracePeriodMinutes} دقيقة) مع توثيق GPS.`;
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

        // إدراج الحضور في Supabase مع الحقول الرقمية وتوليد UUID تلقائياً
        let sbSuccess = true;
        if (supabase) {
          const attPayload = {
            company_id: companyId,
            employee_id: employee.id,
            date: todayStr,
            check_in: now.toISOString(),
            check_in_lat: locationCoords.lat || null,
            check_in_lng: locationCoords.lng || null,
            actual_hours: 0,
            late_minutes: netLateMins,
            early_leave_minutes: 0,
            overtime_hours: 0,
            status: status,
            notes: message
          };
          let query = supabase.from('attendance').upsert([attPayload], { onConflict: 'company_id,employee_id,date' });
          if (query && typeof query.select === 'function') {
            query = query.select().single();
          }
          const writeRes = await this.sbWrite(
            query,
            'تسجيل حضور الموظف',
            { table: 'attendance', id: newRecord.id, record: newRecord, action: 'upsert', payload: attPayload, options: { onConflict: 'company_id,employee_id,date' } }
          );
          if (writeRes.success && writeRes.data && writeRes.data.id) {
            newRecord.id = writeRes.data.id;
          } else if (!writeRes.success) {
            sbSuccess = false;
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

        if (!sbSuccess) {
          return this.#createEnvelope(false, cloneData(newRecord), 'تم تسجيل الحضور محلياً وتعذر الحفظ السحابي حالياً', {
            pendingSync: true,
            punchType,
            employee: cloneData(employee),
            timestamp: nowTimeStr,
            date: todayStr,
            status: status,
            lateMinutes: netLateMins,
            overtimeHours: 0,
            actualHours: 0,
            earlyLeaveMinutes: 0,
            location_coords: locationCoords,
            message: 'تم تسجيل الحضور محلياً بانتظار المزامنة السحابية',
            record: cloneData(newRecord)
          });
        }

        return this.#createEnvelope(true, cloneData(newRecord), null, {
          punchType,
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

        let inTime;
        if (todayRecord.check_in && todayRecord.check_in.includes('T')) {
          inTime = new Date(todayRecord.check_in);
        } else {
          inTime = new Date(`${todayRecord.date}T${todayRecord.checkIn}`);
        }
        const workedMs = now - inTime;
        const actualHours = Number(Math.max(0, workedMs / (1000 * 60 * 60)).toFixed(2));

        const [endH, endM] = (employee.shiftEnd || localSettings.officialCheckOut || '16:00').split(':').map(Number);
        const [startH, startM] = (employee.shiftStart || localSettings.officialCheckIn || '08:00').split(':').map(Number);
        const shiftEndDate = new Date(`${todayRecord.date}T00:00:00`);
        shiftEndDate.setHours(endH, endM, 0, 0);
        if (endH < startH || (endH === startH && endM < startM) || isNightShiftCheckOut) {
          shiftEndDate.setDate(shiftEndDate.getDate() + 1);
        }

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
            p.date === todayRecord.date &&
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
        let sbSuccess = true;
        if (supabase) {
          const updatePayload = {
            check_out: now.toISOString(),
            check_out_lat: locationCoords.lat || null,
            check_out_lng: locationCoords.lng || null,
            actual_hours: actualHours,
            late_minutes: todayRecord.lateMinutes ?? 0,
            early_leave_minutes: earlyLeaveMinutes,
            overtime_hours: overtimeHours,
            notes: todayRecord.notes
          };
          const writeRes = await this.sbWrite(
            supabase
              .from('attendance')
              .update(updatePayload)
              .eq('employee_id', employee.id)
              .eq('date', todayRecord.date)
              .eq('company_id', companyId),
            'تسجيل انصراف الموظف',
            {
              table: 'attendance',
              id: todayRecord.id,
              record: todayRecord,
              action: 'update',
              payload: updatePayload,
              match: { employee_id: employee.id, date: todayRecord.date, company_id: companyId }
            }
          );
          if (!writeRes.success) sbSuccess = false;
        }

        // تحديث LocalDatabase
        const localIdx = (db.attendance || []).findIndex(a => a.employeeId === employee.id && a.date === todayRecord.date);
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

        if (!sbSuccess) {
          return this.#createEnvelope(false, cloneData(todayRecord), 'تم تسجيل الانصراف محلياً وتعذر التحديث السحابي حالياً', {
            pendingSync: true,
            punchType,
            employee: cloneData(employee),
            timestamp: nowTimeStr,
            date: todayRecord.date,
            status: todayRecord.status,
            actualHours: actualHours,
            earlyLeaveMinutes: earlyLeaveMinutes,
            overtimeHours: overtimeHours,
            location_coords: locationCoords,
            message: 'تم تسجيل الانصراف محلياً بانتظار المزامنة السحابية',
            record: cloneData(todayRecord)
          });
        }

        return this.#createEnvelope(true, cloneData(todayRecord), null, {
          punchType,
          employee: cloneData(employee),
          timestamp: nowTimeStr,
          date: todayRecord.date,
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
          let deptEmpIds = null;
          if (filters.department && filters.department !== 'all') {
            const db = LocalDatabase.getDB();
            const localDeptEmps = (db.employees || [])
              .filter(e => e.department === filters.department)
              .map(e => e.id);
            deptEmpIds = [...localDeptEmps];

            try {
              const { data: sbDeptEmps } = await supabase
                .from('employees')
                .select('id')
                .eq('company_id', companyId)
                .eq('department', filters.department);
              if (Array.isArray(sbDeptEmps)) {
                const idSet = new Set([...deptEmpIds, ...sbDeptEmps.map(e => e.id)]);
                deptEmpIds = Array.from(idSet);
              }
            } catch (e) {
              console.warn('[Supabase getAttendanceLogs Dept Employees Warning]:', e);
            }

            if (deptEmpIds.length === 0) {
              return this.#createEnvelope(true, []);
            }
          }

          const PAGE_SIZE = 1000;
          let from = 0;
          let allData = [];
          let hasMore = true;
          let fetchSucceeded = false;

          while (hasMore) {
            let pageQuery = supabase
              .from('attendance')
              .select('*')
              .eq('company_id', companyId)
              .order('date', { ascending: false });

            if (filters.date) pageQuery = pageQuery.eq('date', filters.date);
            if (filters.employeeId && filters.employeeId !== 'all') {
              const cleanEmpId = String(filters.employeeId).trim();
              const isEmpUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanEmpId);
              if (isEmpUUID) {
                pageQuery = pageQuery.eq('employee_id', cleanEmpId);
              } else {
                const db = LocalDatabase.getDB();
                const foundEmp = (db.employees || []).find(e => e.id === cleanEmpId || e.employee_code === cleanEmpId);
                if (foundEmp && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(foundEmp.id || ''))) {
                  pageQuery = pageQuery.eq('employee_id', foundEmp.id);
                }
              }
            }
            if (filters.status && filters.status !== 'all') pageQuery = pageQuery.eq('status', filters.status);

            if (filters.month) {
              const [yearStr, monthStr] = filters.month.split('-');
              const y = parseInt(yearStr, 10);
              const m = parseInt(monthStr, 10);
              const startStr = `${y}-${String(m).padStart(2, '0')}-01`;
              const nextY = m === 12 ? y + 1 : y;
              const nextM = m === 12 ? 1 : m + 1;
              const nextStr = `${nextY}-${String(nextM).padStart(2, '0')}-01`;
              pageQuery = pageQuery.gte('date', startStr).lt('date', nextStr);
            }

            if (deptEmpIds && deptEmpIds.length > 0) {
              pageQuery = pageQuery.in('employee_id', deptEmpIds);
            }

            const { data, error } = await pageQuery.range(from, from + PAGE_SIZE - 1);
            if (error) {
              console.warn('[Supabase getAttendanceLogs Page Error]:', error);
              break;
            }
            if (Array.isArray(data)) {
              allData.push(...data);
              fetchSucceeded = true;
              if (data.length < PAGE_SIZE) {
                hasMore = false;
              } else {
                from += PAGE_SIZE;
              }
            } else {
              hasMore = false;
            }
          }

          if (fetchSucceeded) {
            const db = LocalDatabase.getDB();
            const empMap = {};
            (db.employees || []).forEach(e => { 
              empMap[e.id] = e; 
              if (e.employee_code) empMap[e.employee_code] = e;
            });
            records = allData.map(a => this.#normalizeAttendance(a, empMap));
            if (filters.department && filters.department !== 'all') {
              records = records.filter(r => r.department === filters.department);
            }
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
      const rawEmpId = entry.employeeId || entry.employee_id;
      let emp = await this.resolveEmployee(rawEmpId, signal);

      if (!emp && entry.employeeName) {
        try {
          const res = await this.getEmployees(signal);
          emp = (res.data || []).find(e => 
            e.fullName === entry.employeeName || 
            `${e.first_name || ''} ${e.last_name || ''}`.trim() === entry.employeeName
          );
        } catch (e) {
          console.warn('[saveManualAttendance findByName Warning]:', e);
        }
      }

      if (!emp) return this.#createEnvelope(false, null, 'الموظف غير موجود');

      const isUUID = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || '').trim());
      const hasValidUUID = isUUID(entry.id);
      const recordId = hasValidUUID ? entry.id : (entry.id || `ATT-${entry.date.replace(/-/g, '')}-${emp.id}`);

      const empCode = emp.employee_code || emp.employeeCode || '';
      const cairoCheckIn = entry.checkIn ? ApiService.formatToCairoTime(entry.checkIn) : null;
      const cairoCheckOut = entry.checkOut ? ApiService.formatToCairoTime(entry.checkOut) : null;

      let actualHours = entry.actualHours ?? entry.actual_hours ?? 0;
      if (entry.checkIn && entry.checkOut) {
        const inStr = entry.checkIn.includes('T') ? entry.checkIn.split('T')[1].slice(0, 8) : entry.checkIn;
        const outStr = entry.checkOut.includes('T') ? entry.checkOut.split('T')[1].slice(0, 8) : entry.checkOut;
        const [inH, inM] = inStr.split(':').map(Number);
        const [outH, outM] = outStr.split(':').map(Number);
        let diffMinutes = (outH * 60 + (outM || 0)) - (inH * 60 + (inM || 0));
        if (diffMinutes < 0) diffMinutes += 24 * 60; // الوردية الليلية
        if (diffMinutes > 0) actualHours = Number((diffMinutes / 60).toFixed(2));
      }

      const lateMins = Number(entry.lateMinutes ?? entry.late_minutes ?? 0);
      const earlyMins = Number(entry.earlyLeaveMinutes ?? entry.early_leave_minutes ?? 0);
      const otHours = Number(entry.overtimeHours ?? entry.overtime_hours ?? 0);

      const newRecord = {
        id: recordId,
        company_id: companyId,
        employeeId: emp.id,
        employee_id: emp.id,
        employeeCode: empCode,
        employee_code: empCode,
        employeeName: emp.fullName || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        department: emp.department || '',
        date: entry.date,
        checkIn: cairoCheckIn,
        checkOut: cairoCheckOut,
        actualHours: actualHours,
        lateMinutes: lateMins,
        earlyLeaveMinutes: earlyMins,
        overtimeHours: otHours,
        status: entry.status || (lateMins > 15 ? 'late' : 'present'),
        location_coords: entry.location_coords || {
          lat: 30.0444,
          lng: 31.2357,
          label: 'المقر الإداري - تعديل يدوي معتمد',
          accuracy: 5
        },
        notes: entry.notes || 'تعديل يدوي بواسطة إدارة الموارد البشرية'
      };

      // 1. الإدراج أو التحديث في Supabase مع حقل company_id والمقاييس الرقمية
      let sbSuccess = true;
      if (supabase) {
        const attPayload = {
          company_id: companyId,
          employee_id: emp.id,
          date: entry.date,
          check_in: ApiService.formatLocalTimeToIsoUtc(entry.date, entry.checkIn),
          check_out: ApiService.formatLocalTimeToIsoUtc(entry.date, entry.checkOut),
          actual_hours: Number(newRecord.actualHours ?? 0),
          late_minutes: Number(newRecord.lateMinutes ?? 0),
          early_leave_minutes: Number(newRecord.earlyLeaveMinutes ?? 0),
          overtime_hours: Number(newRecord.overtimeHours ?? 0),
          status: newRecord.status,
          notes: newRecord.notes
        };

        if (hasValidUUID) {
          attPayload.id = entry.id;
        }

        let query = supabase.from('attendance').upsert([attPayload], { onConflict: 'company_id,employee_id,date' });
        if (query && typeof query.select === 'function') {
          query = query.select().single();
        }
        const writeRes = await this.sbWrite(
          query,
          'تسجيل حضور يدوي',
          { table: 'attendance', id: recordId, record: newRecord, action: 'upsert', payload: attPayload, options: { onConflict: 'company_id,employee_id,date' } }
        );
        if (writeRes.success && writeRes.data && writeRes.data.id) {
          newRecord.id = writeRes.data.id;
        } else if (!writeRes.success) {
          sbSuccess = false;
        }
      }

      // 2. التحديث في LocalDatabase
      const db = LocalDatabase.getDB();
      if (!Array.isArray(db.attendance)) db.attendance = [];
      const idx = db.attendance.findIndex(a => 
        (newRecord.id && a.id === newRecord.id) || 
        (entry.id && a.id === entry.id) || 
        (a.employeeId === emp.id && a.date === entry.date)
      );
      if (idx !== -1) db.attendance[idx] = newRecord;
      else db.attendance.push(newRecord);
      LocalDatabase.saveDB(db);

      AuditMiddleware.log({
        action: 'MANUAL_ATTENDANCE_OVERRIDE',
        actionType: 'تعديل',
        target: 'attendance',
        targetId: newRecord.id,
        details: `تعديل يدوي لسجل حضور وانصراف الموظف: ${emp.fullName} (${emp.id}) بتاريخ ${entry.date} بشركة (${companyId})`,
        payload: { ...entry, company_id: companyId }
      });

      if (!sbSuccess) {
        return this.#createEnvelope(false, cloneData(newRecord), 'تم حفظ الحضور اليدوي محلياً وتعذر الحفظ السحابي حالياً', {
          pendingSync: true,
          record: cloneData(newRecord),
          message: 'تم حفظ سجل الحضور يدوياً محلياً بانتظار المزامنة السحابية.'
        });
      }

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

          if (filters.employeeId && filters.employeeId !== 'all') {
            const cleanEmpId = String(filters.employeeId).trim();
            const isEmpUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanEmpId);
            if (isEmpUUID) {
              query = query.eq('employee_id', cleanEmpId);
            } else {
              const db = LocalDatabase.getDB();
              const foundEmp = (db.employees || []).find(e => e.id === cleanEmpId || e.employee_code === cleanEmpId);
              if (foundEmp && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(foundEmp.id || ''))) {
                query = query.eq('employee_id', foundEmp.id);
              }
            }
          }
          if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);

          const { data, error } = await query;
          if (!error && Array.isArray(data)) {
            const db = LocalDatabase.getDB();
            const empMap = {};
            (db.employees || []).forEach(e => { 
              empMap[e.id] = e;
              if (e.employee_code) empMap[e.employee_code] = e;
            });
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
      const rawEmpId = leaveData.employeeId || leaveData.employee_id;
      const emp = await this.resolveEmployee(rawEmpId, signal);
      if (!emp) return this.#createEnvelope(false, null, 'الموظف غير موجود');

      const isUUID = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || '').trim());
      const hasValidUUID = isUUID(leaveData.id);

      const newLeave = {
        ...leaveData,
        id: hasValidUUID ? leaveData.id : (leaveData.id || `LV-${Math.floor(100 + Math.random() * 900)}`),
        company_id: companyId,
        employeeId: emp.id,
        employee_id: emp.id,
        employeeName: emp.fullName || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        department: emp.department || '',
        createdAt: new Date().toISOString().split('T')[0]
      };

      // 1. الإدراج في Supabase مع حقل company_id الإجباري وتوليد UUID تلقائياً
      let sbSuccess = true;
      if (supabase) {
        const sbLeave = {
          company_id: companyId,
          employee_id: emp.id,
          leave_type: newLeave.leaveType || 'annual',
          start_date: newLeave.startDate,
          end_date: newLeave.endDate,
          reason: newLeave.reason || 'إجازة رسمية',
          status: newLeave.status || 'pending',
          created_at: new Date().toISOString()
        };
        if (hasValidUUID) {
          sbLeave.id = newLeave.id;
        }
        let query = supabase.from('leaves').insert([sbLeave]);
        if (query && typeof query.select === 'function') {
          query = query.select().single();
        }
        const writeRes = await this.sbWrite(
          query,
          'تقديم طلب إجازة',
          { table: 'leaves', id: newLeave.id, record: newLeave, action: 'insert', payload: sbLeave }
        );
        if (writeRes.success && writeRes.data && writeRes.data.id) {
          newLeave.id = writeRes.data.id;
        } else if (!writeRes.success) {
          sbSuccess = false;
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

      if (!sbSuccess) {
        return this.#createEnvelope(false, cloneData(newLeave), 'تم تقديم طلب الإجازة محلياً وتعذر الحفظ السحابي حالياً', {
          pendingSync: true,
          message: 'تم تقديم طلب الإجازة محلياً بانتظار المزامنة السحابية.'
        });
      }

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
      let sbSuccess = true;
      if (supabase) {
        const updatePayload = {
          status: status,
          reviewed_by: approvedBy
        };
        const writeRes = await this.sbWrite(
          supabase
            .from('leaves')
            .update(updatePayload)
            .eq('id', leaveId)
            .eq('company_id', companyId),
          'تحديث حالة الإجازة',
          { table: 'leaves', id: leaveId, record: item, action: 'update', payload: updatePayload, match: { id: leaveId, company_id: companyId } }
        );
        if (!writeRes.success) sbSuccess = false;
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

      if (!sbSuccess) {
        return this.#createEnvelope(false, cloneData(item), 'تم تحديث حالة طلب الإجازة محلياً وتعذر التحديث السحابي حالياً', {
          pendingSync: true,
          message: `تم تحديث حالة طلب الإجازة محلياً بانتظار المزامنة السحابية.`
        });
      }

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
      const rawEmpId = permData.employeeId || permData.employee_id;
      const emp = await this.resolveEmployee(rawEmpId, signal);
      if (!emp) return this.#createEnvelope(false, null, 'الموظف غير موجود');

      const db = LocalDatabase.getDB();
      const newPerm = {
        ...permData,
        id: `PRM-${Math.floor(100 + Math.random() * 900)}`,
        company_id: companyId,
        employeeId: emp.id,
        employee_id: emp.id,
        employeeName: emp.fullName || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
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

          if (filters.employeeId && filters.employeeId !== 'all') {
            const cleanEmpId = String(filters.employeeId).trim();
            const isEmpUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanEmpId);
            if (isEmpUUID) {
              query = query.eq('employee_id', cleanEmpId);
            } else {
              const db = LocalDatabase.getDB();
              const foundEmp = (db.employees || []).find(e => e.id === cleanEmpId || e.employee_code === cleanEmpId);
              if (foundEmp && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(foundEmp.id || ''))) {
                query = query.eq('employee_id', foundEmp.id);
              }
            }
          }
          if (filters.type && filters.type !== 'all') query = query.eq('adjustment_type', filters.type);

          const { data, error } = await query;
          if (!error && Array.isArray(data)) {
            const db = LocalDatabase.getDB();
            const empMap = {};
            (db.employees || []).forEach(e => { 
              empMap[e.id] = e;
              if (e.employee_code) empMap[e.employee_code] = e;
            });
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
      const rawEmpId = adjData.employeeId || adjData.employee_id;
      const emp = await this.resolveEmployee(rawEmpId, signal);
      if (!emp) return this.#createEnvelope(false, null, 'الموظف غير موجود');

      const isUUID = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || '').trim());
      const hasValidUUID = isUUID(adjData.id);
      const newId = hasValidUUID ? adjData.id : (adjData.id || `ADJ-${Math.floor(100 + Math.random() * 900)}`);
      const effDate = adjData.date || new Date().toISOString().split('T')[0];
      const adjValue = Number(adjData.value ?? adjData.amount ?? 0);

      const newAdj = {
        ...adjData,
        id: newId,
        company_id: companyId,
        employeeId: emp.id,
        employee_id: emp.id,
        employeeName: emp.fullName || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        value: adjValue,
        amount: adjValue,
        date: effDate,
        month: adjData.month || effDate.slice(0, 7)
      };

      // 1. الإدراج في Supabase مع حقل company_id الإجباري وتوليد UUID تلقائياً
      let sbSuccess = true;
      if (supabase) {
        const sbAdj = {
          company_id: companyId,
          employee_id: emp.id,
          adjustment_type: adjData.type || 'bonus',
          amount: adjValue,
          effective_date: effDate,
          status: 'approved'
        };
        if (hasValidUUID) {
          sbAdj.id = newAdj.id;
        }
        let query = supabase.from('adjustments').insert([sbAdj]);
        if (query && typeof query.select === 'function') {
          query = query.select().single();
        }
        const writeRes = await this.sbWrite(
          query,
          'تسجيل معاملة مالية',
          { table: 'adjustments', id: newId, record: newAdj, action: 'insert', payload: sbAdj }
        );
        if (writeRes.success && writeRes.data && writeRes.data.id) {
          newAdj.id = writeRes.data.id;
        } else if (!writeRes.success) {
          sbSuccess = false;
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

      if (!sbSuccess) {
        return this.#createEnvelope(false, cloneData(newAdj), 'تم تسجيل المعاملة المالية محلياً وتعذر الحفظ السحابي حالياً', {
          pendingSync: true,
          message: 'تم تسجيل المعاملة المالية محلياً بانتظار المزامنة السحابية.'
        });
      }

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
      let sbSuccess = true;
      if (supabase) {
        const writeRes = await this.sbWrite(
          supabase
            .from('adjustments')
            .delete()
            .eq('id', id)
            .eq('company_id', companyId),
          'حذف معاملة مالية',
          { table: 'adjustments', id, action: 'delete', match: { id, company_id: companyId } }
        );
        if (!writeRes.success) sbSuccess = false;
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

      if (!sbSuccess) {
        return this.#createEnvelope(false, { id }, 'تم حذف المعاملة المالية محلياً وتعذر الحذف السحابي حالياً', {
          pendingSync: true,
          message: 'تم حذف المعاملة المالية محلياً بانتظار المزامنة السحابية.'
        });
      }

      return this.#createEnvelope(true, { id }, null, { message: 'تم حذف المعاملة المالية بنجاح' });
    } catch (err) {
      return this.#handleError(err, 'فشل في حذف المعاملة المالية');
    }
  }

  /* ==========================================================================
     PAYROLL CALCULATION ENGINE (EGYPTIAN LABOR LAW + MULTI-TENANT)
     ========================================================================== */

  static async calculateMonthlyPayroll(monthStr = null, signal = null) {
    try {
      await this.simulateDelay(120, signal);
      const defaultMonth = (typeof this.getCairoDateString === 'function')
        ? this.getCairoDateString(new Date()).slice(0, 7)
        : new Date().toISOString().slice(0, 7);
      monthStr = (typeof monthStr === 'string' && monthStr.trim()) ? monthStr.trim() : defaultMonth;
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

      const leavesRes = await this.getLeaves({ status: 'approved' }, signal);
      const allLeaves = leavesRes.data || [];

      const workingDays = (Number.isFinite(Number(settings.workingDaysPerMonth)) && Number(settings.workingDaysPerMonth) > 0)
        ? Number(settings.workingDaysPerMonth)
        : 30;
      const dailyHours = (Number.isFinite(Number(settings.workingHoursPerDay)) && Number(settings.workingHoursPerDay) > 0)
        ? Number(settings.workingHoursPerDay)
        : 8;
      const overtimeMultiplier = Number.isFinite(Number(settings.overtimeRateMultiplier))
        ? Number(settings.overtimeRateMultiplier)
        : 1.35;
      const absenceMultiplier = Number.isFinite(Number(settings.absencePenaltyMultiplier))
        ? Number(settings.absencePenaltyMultiplier)
        : 1.0;
      const gracePeriod = Number.isFinite(Number(settings.gracePeriodMinutes))
        ? Number(settings.gracePeriodMinutes)
        : 15;
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

        const empAttendance = allAttendance.filter(a =>
          a.employeeId === emp.id &&
          typeof a.date === 'string' &&
          a.date.startsWith(monthStr)
        );

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

        let salesAchieved = 0;
        let salesTarget = Number(emp.salesTarget || 0);
        let commissionRate = Number(emp.commissionRate || 0);

        if (emp.monthlySales && emp.monthlySales[monthStr]) {
          const mSales = emp.monthlySales[monthStr];
          salesAchieved = Number(mSales.salesAchieved ?? mSales.achieved ?? 0);
          if (mSales.salesTarget !== undefined) salesTarget = Number(mSales.salesTarget);
          if (mSales.commissionRate !== undefined) commissionRate = Number(mSales.commissionRate);
        } else if (emp.salesMonth) {
          if (emp.salesMonth === monthStr) {
            salesAchieved = Number(emp.salesAchieved || 0);
          } else {
            salesAchieved = 0;
          }
        } else {
          salesAchieved = 0;
        }

        const salesCommission = (salesTarget > 0 && salesAchieved >= salesTarget && commissionRate > 0)
          ? Number(((salesAchieved * commissionRate) / 100).toFixed(2))
          : 0;

        const empUnpaidLeaves = allLeaves.filter(l =>
          l.employeeId === emp.id &&
          (l.status === 'approved' || l.status === 'مقبول') &&
          (l.leaveType === 'unpaid' || l.leave_type === 'unpaid' || l.type === 'unpaid_leave') &&
          ((typeof l.startDate === 'string' && l.startDate.startsWith(monthStr)) ||
           (typeof l.start_date === 'string' && l.start_date.startsWith(monthStr)) ||
           (typeof l.createdAt === 'string' && l.createdAt.startsWith(monthStr)))
        );
        const unpaidDaysCount = empUnpaidLeaves.reduce((sum, l) => sum + Number(l.daysCount || l.days_count || 1), 0);
        const unpaidLeaveDeduction = Number((unpaidDaysCount * dailyRate).toFixed(2));

        const unexcusedAbsenceDays = empAttendance.filter(a => a.status === 'absent').length;
        const absenceDeduction = Number((unexcusedAbsenceDays * dailyRate * absenceMultiplier).toFixed(2));

        const socialInsurancePercent = Number.isFinite(Number(settings.socialInsurancePercent))
          ? Number(settings.socialInsurancePercent)
          : 11;
        const insurancePercent = Number.isFinite(Number(emp.insurancePercent))
          ? Number(emp.insurancePercent)
          : socialInsurancePercent;
        const socialInsuranceDeduction = Number(((baseSalary * insurancePercent) / 100).toFixed(2));

        const grossEarnings = Number((baseSalary + totalAllowances + overtimeEarnings + totalBonuses + salesCommission).toFixed(2));
        const totalDeductions = Number((latePenaltyAmount + earlyLeavePenaltyAmount + unpaidLeaveDeduction + absenceDeduction + totalAdminPenalties + totalLoans + socialInsuranceDeduction).toFixed(2));
        const rawNetSalary = Number((grossEarnings - totalDeductions).toFixed(2));
        const shortfall = rawNetSalary < 0 ? Math.abs(rawNetSalary) : 0;
        const warnings = [];
        if (shortfall > 0) {
          warnings.push(`عجز مالي في صافي الراتب بمقدار ${shortfall} ج.م بسبب تجاوز الاستقطاعات (${totalDeductions} ج.م) لإجمالي الاستحقاقات (${grossEarnings} ج.م)`);
        }

        return {
          employeeId: emp.id,
          employeeName: emp.fullName,
          department: emp.department,
          jobTitle: emp.jobTitle,
          role: emp.role,
          employee: {
            id: emp.id,
            fullName: emp.fullName,
            department: emp.department,
            jobTitle: emp.jobTitle,
            role: emp.role
          },
          salaryStatus: emp.salaryStatus || 'processing',
          company_id: companyId,
          month: monthStr,
          rates: {
            baseSalary,
            dailyRate,
            hourlyRate,
            minuteRate,
            overtimeHours: totalOvertimeHours
          },
          earnings: {
            baseSalary,
            housing,
            transport,
            otherAllowances,
            totalAllowances,
            allowances: totalAllowances,
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
          netSalary: rawNetSalary,
          shortfall: shortfall,
          warnings: warnings
        };
      });

      const summary = {
        month: monthStr,
        company_id: companyId,
        totalEmployees: payrollReport.length,
        totalGross: Number(payrollReport.reduce((acc, p) => acc + p.earnings.gross, 0).toFixed(2)),
        totalDeductions: Number(payrollReport.reduce((acc, p) => acc + p.deductions.total, 0).toFixed(2)),
        totalNetPayroll: Number(payrollReport.reduce((acc, p) => acc + p.netSalary, 0).toFixed(2)),
        totalShortfall: Number(payrollReport.reduce((acc, p) => acc + (p.shortfall || 0), 0).toFixed(2)),
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

      // 1. تصفير الجداول في Supabase للشركة الحالية مع الحفاظ على حساب مبرمج النظام فقط
      if (supabase) {
        await Promise.allSettled([
          this.sbWrite(supabase.from('leaves').delete().eq('company_id', companyId), 'تصفير الإجازات', { table: 'leaves', action: 'delete', match: { company_id: companyId } }),
          this.sbWrite(supabase.from('attendance').delete().eq('company_id', companyId), 'تصفير الحضور', { table: 'attendance', action: 'delete', match: { company_id: companyId } }),
          this.sbWrite(supabase.from('requests').delete().eq('company_id', companyId), 'تصفير الطلبات', { table: 'requests', action: 'delete', match: { company_id: companyId } }),
          this.sbWrite(supabase.from('adjustments').delete().eq('company_id', companyId), 'تصفير المعاملات المالية', { table: 'adjustments', action: 'delete', match: { company_id: companyId } }),
          this.sbWrite(supabase.from('employees').delete().eq('company_id', companyId).neq('role', 'programmer'), 'تصفير الموظفين', { table: 'employees', action: 'delete', match: { company_id: companyId } })
        ]);
      }

      // 2. تصفير قاعدة البيانات المحلية
      LocalDatabase.resetDB();

      // 3. تأكيد بقاء جلسة تسجيل الدخول لحساب المبرمج
      const progSession = {
        employeeId: 'EMP-0001',
        email: 'admin@system.local',
        role: 'programmer',
        normalizedRole: 'programmer',
        roleArabic: 'مدير نظام / مبرمج',
        authMethod: 'email',
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
        details: 'استعادة ضبط المصنع وتصفير كافة البيانات التجريبية مع الحفاظ على حساب مبرمج النظام'
      });

      return this.#createEnvelope(true, null, null, { message: 'تم تصفير وإعادة ضبط كافة البيانات بنجاح' });
    } catch (err) {
      return this.#handleError(err, 'فشل في استعادة ضبط المصنع');
    }
  }
}


// Global browser registration
ApiService.EMPLOYEE_PUBLIC_COLS = EMPLOYEE_PUBLIC_COLS;
ApiService.COMPANY_PUBLIC_COLS = COMPANY_PUBLIC_COLS;
window.ApiService = ApiService;
window.AuditMiddleware = AuditMiddleware;
window.LocalDatabase = LocalDatabase;
window.USE_BACKEND_API = USE_BACKEND_API;
window.DEFAULT_AVATARS = DEFAULT_AVATARS;
window.detectGender = detectGender;
window.cloneData = cloneData;
window.INITIAL_DATABASE = INITIAL_DATABASE;
window.EMPLOYEE_PUBLIC_COLS = EMPLOYEE_PUBLIC_COLS;
window.COMPANY_PUBLIC_COLS = COMPANY_PUBLIC_COLS;

  if (supabase) {
    window.supabaseClient = supabase;
  }
})(typeof window !== 'undefined' ? window : this);