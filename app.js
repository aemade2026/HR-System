/**
 * ============================================================================
 * نظام AE (HR-SYSTEM) للموارد البشرية والرواتب | AE (HR-SYSTEM)
 * Production Application Controller (ES2024+ Clean Architecture)
 * Modern Encapsulation, Reactive State Proxy, Native Intl APIs, and a11y
 * ============================================================================
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. PURE UTILITIES & SECURITY HELPERS (XSS Prevention & Debounce)
     ========================================================================== */

  /**
   * Escape HTML to prevent XSS vulnerabilities in user-supplied strings.
   * @param {*} str - Input value
   * @returns {string} Sanitized HTML string
   */
  function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Debounce function execution.
   * @param {Function} fn - Target function
   * @param {number} delay - Milliseconds delay
   * @returns {Function}
   */
  function debounce(fn, delay = 250) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /* ==========================================================================
     2. NATIVE INTL FORMATTERS & NUMBER TO ARABIC WORDS
     ========================================================================== */

  /** Cache Intl NumberFormatters for maximum runtime performance */
  const currencyFormatterCache = new Map();

  /**
   * Format numbers using browser Native Intl API.
   * @param {number|string} num
   * @param {string} [currencySymbol='ج.م']
   * @returns {string}
   */
  function formatCurrency(num, currencySymbol = null) {
    const numeric = Number(num ?? 0);
    const safeVal = isNaN(numeric) ? 0 : numeric;
    const symbol = currencySymbol ?? (store.state.settings?.currency || 'ج.م');

    let fmt = currencyFormatterCache.get(symbol);
    if (!fmt) {
      fmt = new Intl.NumberFormat('ar-EG-u-nu-latn', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      currencyFormatterCache.set(symbol, fmt);
    }
    return `${fmt.format(safeVal)} ${symbol}`;
  }

  /**
   * Native Arabic Gregorian & Hijri Date Formatters.
   */
  const gregorianDateFormatter = new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const timeFormatter = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  /**
   * Convert integer currency amount to legal Arabic words (Tafqeet).
   * @param {number} number
   * @returns {string}
   */
  function numberToArabicWords(number) {
    const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

    const intVal = Math.floor(Math.abs(Number(number) || 0));
    if (intVal === 0) return 'صفر جنيه مصري لا غير';

    function convertGroup(n) {
      let str = '';
      const h = Math.floor(n / 100);
      const rem = n % 100;
      const t = Math.floor(rem / 10);
      const u = rem % 10;

      if (h > 0) str += hundreds[h];

      if (rem > 0) {
        if (h > 0) str += ' و';
        if (rem >= 10 && rem <= 19) {
          str += teens[rem - 10];
        } else {
          if (u > 0) {
            str += units[u];
            if (t > 0) str += ' و';
          }
          if (t > 0) str += tens[t];
        }
      }
      return str;
    }

    let result = '';
    const thousands = Math.floor(intVal / 1000);
    const remainder = intVal % 1000;

    if (thousands > 0) {
      if (thousands === 1) {
        result += 'ألف';
      } else if (thousands === 2) {
        result += 'ألفان';
      } else if (thousands >= 3 && thousands <= 10) {
        result += `${convertGroup(thousands)} آلاف`;
      } else {
        result += `${convertGroup(thousands)} ألفاً`;
      }
      if (remainder > 0) result += ' و';
    }

    if (remainder > 0) {
      result += convertGroup(remainder);
    }

    return `فقط وقدره ${result} جنيه مصري لا غير`;
  }

  /* ==========================================================================
     3. SOUND ENGINE (Encapsulated Modern Web Audio API Class)
     ========================================================================== */

  class SoundEngine {
    #ctx = null;

    #initCtx() {
      if (!this.#ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.#ctx = new AudioContextClass();
        }
      }
      if (this.#ctx?.state === 'suspended') {
        this.#ctx.resume().catch(() => {});
      }
    }

    playSuccess() {
      if (!store.state.soundEnabled) return;
      try {
        this.#initCtx();
        if (!this.#ctx) return;
        const now = this.#ctx.currentTime;
        const osc = this.#ctx.createOscillator();
        const gain = this.#ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.#ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      } catch (err) {
        console.warn('Audio play error:', err);
      }
    }

    playError() {
      if (!store.state.soundEnabled) return;
      try {
        this.#initCtx();
        if (!this.#ctx) return;
        const now = this.#ctx.currentTime;
        const osc = this.#ctx.createOscillator();
        const gain = this.#ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(160, now + 0.12);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.#ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
      } catch (err) {
        console.warn('Audio play error:', err);
      }
    }

    playClick() {
      if (!store.state.soundEnabled) return;
      try {
        this.#initCtx();
        if (!this.#ctx) return;
        const now = this.#ctx.currentTime;
        const osc = this.#ctx.createOscillator();
        const gain = this.#ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.#ctx.destination);

        osc.start(now);
        osc.stop(now + 0.05);
      } catch (err) {
        console.warn('Audio play error:', err);
      }
    }
  }

  const sound = new SoundEngine();

  /* ==========================================================================
     4. REACTIVE STATE MANAGEMENT (AppStore via Proxy & EventTarget)
     ========================================================================== */

  class AppStore extends EventTarget {
    #rawState = {
      settings: null,
      employees: [],
      attendance: [],
      leaves: [],
      permissions: [],
      adjustments: [],
      currentMonth: '2026-10',
      currentDate: '2026-10-11',
      pinInput: '',
      soundEnabled: true,
      isDarkMode: false,
      activeTab: 'module-dashboard',
      activeSubTab: 'subtab-leaves',
      currentPayrollData: null,
      currentUser: null,
      currentSession: null,
      currentPortal: 'auth',
      authPinInput: '',
      pendingApprovals: [],
      currentPermissions: null,
      viewMode: 'default', // 'default' | 'employee_preview'
      originalRole: null,
      departments: [],
      requests: []
    };

    #proxyState = null;

    constructor() {
      super();
      const self = this;
      this.#proxyState = new Proxy(this.#rawState, {
        set(target, prop, value) {
          const prev = target[prop];
          target[prop] = value;
          self.dispatchEvent(new CustomEvent('statechange', {
            detail: { property: prop, value, prev }
          }));
          return true;
        },
        get(target, prop) {
          return target[prop];
        }
      });
    }

    get state() {
      return this.#proxyState;
    }

    /**
     * Subscribe to specific property change.
     * @param {string} prop
     * @param {Function} callback
     */
    on(prop, callback) {
      this.addEventListener('statechange', (e) => {
        if (e.detail.property === prop) {
          callback(e.detail.value, e.detail.prev);
        }
      });
    }
  }

  const store = new AppStore();

  /* ==========================================================================
     5. TOAST NOTIFICATIONS HELPER
     ========================================================================== */

  /**
   * Display accessible toast message.
   * @param {string} message
   * @param {'info'|'success'|'error'|'warning'} [type='info']
   * @param {number} [duration=3500]
   */
  function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-white shadow-xl transition-all duration-300 transform translate-y-2 pointer-events-auto ${
      type === 'success' ? 'bg-emerald-600' :
      type === 'error' ? 'bg-rose-600' :
      type === 'warning' ? 'bg-amber-600' : 'bg-blue-600'
    }`;

    const iconMap = {
      success: 'circle-check',
      error: 'circle-xmark',
      warning: 'triangle-exclamation',
      info: 'info-circle'
    };
    const icon = iconMap[type] ?? 'info-circle';

    toast.innerHTML = `<i class="fa-solid fa-${icon} text-sm" aria-hidden="true"></i> <span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-4');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /* ==========================================================================
     6. DATE & CLOCK ENGINE
     ========================================================================== */

  function updateLiveClock() {
    const now = new Date();
    const dateFormatted = gregorianDateFormatter.format(now);
    const timeFormatted = timeFormatter.format(now);

    const headerDate = document.getElementById('headerLiveDate');
    const headerClock = document.getElementById('headerLiveClock');
    const kioskClock = document.getElementById('kioskClock');
    const kioskDate = document.getElementById('kioskDate');

    if (headerDate) headerDate.textContent = dateFormatted;
    if (headerClock) headerClock.textContent = timeFormatted;
    if (kioskClock) kioskClock.textContent = timeFormatted;
    if (kioskDate) kioskDate.textContent = dateFormatted;
  }

  /* ==========================================================================
     7. DATA LOADERS
     ========================================================================== */

  async function loadSettings() {
    const res = await ApiService.getSettings();
    if (res.success) store.state.settings = res.data;
  }

  async function loadEmployees() {
    const res = await ApiService.getEmployees();
    if (res.success) {
      store.state.employees = res.data;
      if (store.state.currentUser) {
        const fresh = res.data.find(e => e.id === store.state.currentUser.id || e.email === store.state.currentUser.email);
        if (fresh) {
          if (fresh.email === 'aemade2016@gmail.com' || fresh.id === 'aa69f711-7ca3-41dc-b628-42a5dda853f6' || fresh.employee_code === 'EMP-0001') {
            fresh.role = 'programmer';
          }
          store.state.currentUser = fresh;
        }
      }
      populateEmployeeSelects();
      populateAuthBioSelect();
      renderQuickLoginShortcuts();
    }
  }

  async function loadAttendanceLogs() {
    const res = await ApiService.getAttendanceLogs();
    if (res.success) {
      store.state.attendance = res.data;
      renderRecentKioskFeed();
    }
  }

  async function loadLeaves() {
    const res = await ApiService.getLeaves();
    if (res.success) store.state.leaves = res.data;
  }

  async function loadPermissions() {
    const res = await ApiService.getPermissions();
    if (res.success) store.state.permissions = res.data;
  }

  async function loadAdjustments() {
    const res = await ApiService.getAdjustments();
    if (res.success) store.state.adjustments = res.data;
  }

  async function loadDepartments() {
    const res = await ApiService.getDepartments();
    if (res.success) {
      store.state.departments = res.data;
      updateDepartmentSelectOptions(res.data);
    }
  }

  function getEmployeeCode(emp) {
    if (!emp) return '';
    if (emp.email === 'aemade2016@gmail.com') return 'EMP-0001';
    if (emp.employee_code) return emp.employee_code;
    if (emp.employeeCode) return emp.employeeCode;
    const rawId = String(emp.id || '');
    if (rawId.startsWith('EMP-')) return rawId;
    if (rawId && !rawId.includes('-')) return rawId;
    return emp.role === 'programmer' ? 'EMP-0001' : 'EMP-1001';
  }

  function populateEmployeeSelects() {
    const selects = [
      document.getElementById('kioskEmpSelect'),
      document.getElementById('attFilterEmployee'),
      document.getElementById('manualPunchEmpSelect'),
      document.getElementById('leaveFormEmpSelect'),
      document.getElementById('permFormEmpSelect'),
      document.getElementById('adjFormEmpSelect')
    ];

    selects.forEach(sel => {
      if (!sel) return;
      const isFilter = sel.id === 'attFilterEmployee';
      sel.innerHTML = isFilter ? '<option value="all">كافة الموظفين</option>' : '';
      store.state.employees.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        const code = getEmployeeCode(emp);
        const dept = emp.department ? ` - ${emp.department}` : '';
        opt.textContent = `${emp.fullName} (${code}${dept})`;
        sel.appendChild(opt);
      });
    });
  }

  /* ==========================================================================
     8. THEME, SOUND, FULLSCREEN & FACTORY RESET
     ========================================================================== */

  function initThemeAndSound() {
    const savedTheme = localStorage.getItem('JISR_THEME') || 'light';
    const isDark = savedTheme === 'dark';
    store.state.isDarkMode = isDark;
    document.documentElement.classList.toggle('dark', isDark);

    const updateThemeUI = (dark) => {
      const themeBtns = [
        document.getElementById('toggleThemeBtn'),
        document.getElementById('authThemeToggleBtn'),
        document.getElementById('empToggleThemeBtn')
      ];
      themeBtns.forEach(btn => {
        if (!btn) return;
        btn.innerHTML = dark 
          ? '<i class="fa-solid fa-sun text-sm text-amber-400" aria-hidden="true"></i>' 
          : '<i class="fa-solid fa-moon text-sm text-slate-700 dark:text-slate-300" aria-hidden="true"></i>';
      });
    };

    updateThemeUI(isDark);

    const toggleThemeAction = () => {
      sound.playClick();
      store.state.isDarkMode = !store.state.isDarkMode;
      document.documentElement.classList.toggle('dark', store.state.isDarkMode);
      localStorage.setItem('JISR_THEME', store.state.isDarkMode ? 'dark' : 'light');
      updateThemeUI(store.state.isDarkMode);
      showToast(store.state.isDarkMode ? 'تم تفعيل الوضع الليلي' : 'تم تفعيل الوضع النهاري', 'info', 2000);
    };

    document.getElementById('toggleThemeBtn')?.addEventListener('click', toggleThemeAction);
    document.getElementById('authThemeToggleBtn')?.addEventListener('click', toggleThemeAction);
    document.getElementById('empToggleThemeBtn')?.addEventListener('click', toggleThemeAction);

    const savedSound = localStorage.getItem('JISR_SOUND') !== 'false';
    store.state.soundEnabled = savedSound;

    const updateSoundUI = (enabled) => {
      const soundBtns = [
        document.getElementById('toggleSoundBtn'),
        document.getElementById('authSoundToggleBtn'),
        document.getElementById('empToggleSoundBtn')
      ];
      soundBtns.forEach(btn => {
        if (!btn) return;
        btn.innerHTML = enabled 
          ? '<i class="fa-solid fa-volume-high text-sm text-slate-700 dark:text-slate-300" aria-hidden="true"></i>' 
          : '<i class="fa-solid fa-volume-xmark text-sm text-rose-500" aria-hidden="true"></i>';
      });
    };

    updateSoundUI(savedSound);

    const toggleSoundAction = () => {
      store.state.soundEnabled = !store.state.soundEnabled;
      localStorage.setItem('JISR_SOUND', store.state.soundEnabled ? 'true' : 'false');
      updateSoundUI(store.state.soundEnabled);
      if (store.state.soundEnabled) sound.playClick();
      showToast(store.state.soundEnabled ? 'تم تشغيل المؤثرات الصوتية' : 'تم كتم المؤثرات الصوتية', 'info', 2000);
    };

    document.getElementById('toggleSoundBtn')?.addEventListener('click', toggleSoundAction);
    document.getElementById('authSoundToggleBtn')?.addEventListener('click', toggleSoundAction);
    document.getElementById('empToggleSoundBtn')?.addEventListener('click', toggleSoundAction);

    // Fullscreen toggle
    const fsBtn = document.getElementById('toggleFullscreenBtn');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
          fsBtn.innerHTML = '<i class="fa-solid fa-compress text-sm" aria-hidden="true"></i>';
        } else {
          document.exitFullscreen().catch(() => {});
          fsBtn.innerHTML = '<i class="fa-solid fa-expand text-sm" aria-hidden="true"></i>';
        }
      });
    }

    // Reset Data button
    const resetBtn = document.getElementById('resetDataBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (confirm('هل أنت متأكد من رغبتك في إعادة ضبط كافة البيانات إلى الحالة الافتراضية الأولية؟')) {
          await ApiService.resetDatabase();
          showToast('تمت إعادة ضبط البيانات بنجاح', 'success');
          location.reload();
        }
      });
    }
  }

  /* ==========================================================================
     9. NAVIGATION & MOBILE DRAWER (Off-Canvas RTL Sidebar)
     ========================================================================== */

  /**
   * Programmatic navigation to any Admin Module.
   * Ensures sidebar active tab styling, section visibility, and module renderers trigger cleanly.
   * @param {string} targetId - e.g. 'module-dashboard', 'module-employees', etc.
   */
  function navigateToAdminModule(targetId = 'module-dashboard') {
    if (targetId === 'module-programmer' && (store.state.originalRole !== 'programmer' || store.state.viewMode === 'employee_preview')) {
      sound.playError();
      showToast('عذراً، لوحة المبرمج مخصصة فقط لرتبة مبرمج (Super Admin)', 'warning');
      navigateToAdminModule('module-dashboard');
      return;
    }

    store.state.activeTab = targetId;
    const tabs = document.querySelectorAll('.nav-tab');
    const sections = document.querySelectorAll('.module-section');

    // Update tabs styling with strict light/dark contrast
    tabs.forEach(t => {
      if (t.dataset.target === targetId) {
        t.classList.add('active-tab', 'bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-500/20');
        t.classList.remove('text-slate-700', 'dark:text-slate-300');
      } else {
        t.classList.remove('active-tab', 'bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-500/20');
        t.classList.add('text-slate-700', 'dark:text-slate-300');
      }
    });

    // Toggle sections
    sections.forEach(sec => {
      if (sec.id === targetId) {
        sec.classList.remove('hidden');
        sec.classList.add('block');
      } else {
        sec.classList.add('hidden');
        sec.classList.remove('block');
      }
    });

    // Trigger module specific refresh
    if (targetId === 'module-dashboard') renderDashboard();
    else if (targetId === 'module-attendance') renderAttendanceTable();
    else if (targetId === 'module-employees') renderEmployeesTable();
    else if (targetId === 'module-leaves') renderLeavesAndAdjustments();
    else if (targetId === 'module-approvals') {
      loadAndRenderAdminRequests();
      renderApprovalsTable();
      updateAdminNotifications();
      refreshPendingApprovalsBadge();
    }
    else if (targetId === 'module-payroll') renderPayrollModule();
    else if (targetId === 'module-settings') populateSettingsForm();
    else if (targetId === 'module-programmer') renderProgrammerPanel();
  }

  function setupNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        sound.playClick();
        const targetId = tab.dataset.target;
        navigateToAdminModule(targetId);
      });
    });
  }

  function setupMobileDrawer() {
    const sidebar = document.getElementById('appSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const closeBtn = document.getElementById('sidebarCloseBtn');

    if (!sidebar || !backdrop) return;

    const openDrawer = () => {
      sidebar.classList.remove('translate-x-full');
      sidebar.classList.add('translate-x-0');
      backdrop.classList.remove('hidden');
      document.body.classList.add('overflow-hidden', 'lg:overflow-auto');
    };

    const closeDrawer = () => {
      sidebar.classList.add('translate-x-full');
      sidebar.classList.remove('translate-x-0');
      backdrop.classList.add('hidden');
      document.body.classList.remove('overflow-hidden', 'lg:overflow-auto');
    };

    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isClosed = sidebar.classList.contains('translate-x-full');
        if (isClosed) {
          openDrawer();
        } else {
          closeDrawer();
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeDrawer();
      });
    }

    backdrop.addEventListener('click', () => {
      closeDrawer();
    });

    // Auto-close drawer when clicking on any navigation item on screens < 1024px
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        if (window.innerWidth < 1024) {
          closeDrawer();
        }
      });
    });

    // Clean state on screen orientation or resize change
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) {
        backdrop.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }
    });
  }

  /* ==========================================================================
     9.5 ROLE-BASED ACCESS CONTROL (RBAC) & MULTI-PORTAL CONTROLLER
     ========================================================================== */

  let cachedAuditLogs = [];

  /**
   * استخراج وتطبيع نوع المستخدم بناءً على نظام RBAC المصري
   * الرتب الأساسية: 'employee' (موظف) | 'manager' (مدير) | 'programmer' (مبرمج)
   */
  function resolveUserRole(user) {
    if (!user) return 'employee';
    if (user.email === 'aemade2016@gmail.com' || user.id === 'aa69f711-7ca3-41dc-b628-42a5dda853f6' || user.employee_code === 'EMP-0001') {
      return 'programmer';
    }
    const r = String(user.role || '').toLowerCase();
    if (r === 'programmer' || r === 'مبرمج') {
      return 'programmer';
    }
    if (r === 'manager' || r === 'مدير' || r === 'admin' || r === 'hr') {
      return 'manager';
    }
    return 'employee';
  }

  /**
   * التوجيه والتحقق من الصلاحيات الشاملة بعد تسجيل الدخول
   * @param {Object} user
   * @param {Object|null} permissions
   */
  async function applyUserRoleAndNavigate(user, permissions = null) {
    if (!user) {
      switchPortal('auth');
      return;
    }

    const roleType = resolveUserRole(user);
    store.state.currentUser = user;
    store.state.originalRole = roleType;
    store.state.viewMode = 'default';

    if (!permissions) {
      try {
        const pRes = await ApiService.getRolePermissions(roleType);
        store.state.currentPermissions = pRes.data || pRes;
      } catch (e) {
        store.state.currentPermissions = null;
      }
    } else {
      store.state.currentPermissions = permissions;
    }

    // إدارة عناصر الواجهة بناءً على الصلاحيات والرتبة
    updateRoleBasedUI(roleType);
    await updateCurrentCompanyHeader(user);

    // توجيه المستخدم حسب دوره:
    // موظف -> شاشته الشخصية فقط
    // مدير أو مبرمج -> شاشة الإدارة المعتادة
    if (roleType === 'employee') {
      switchPortal('employee');
    } else {
      switchPortal('admin');
    }
  }

  /**
   * تحديث اسم وهوية الشركة الحالية في الترويسة الرئيسية ولوحة التحكم بناءً على المستأجر المسجل
   * @param {Object} [user]
   */
  async function updateCurrentCompanyHeader(user = null) {
    try {
      const activeUser = user || store.state.currentUser;
      const companyId = activeUser?.company_id || ApiService.getCurrentCompanyId();
      
      const headerTitle = document.getElementById('appHeaderCompanyName');
      const headerBadge = document.getElementById('appHeaderCompanyBadge');
      const headerBadgeText = document.getElementById('appHeaderCompanyBadgeText');
      const drawerBadge = document.getElementById('drawerCompanyBadge');
      const dashboardBadge = document.getElementById('dashboardTenantBadge');
      const dashboardName = document.getElementById('dashboardTenantName');

      // إذا كانت الشركة الجذرية / المبرمج
      if (!companyId || companyId === '11111111-2222-3333-4444-555555555555') {
        if (headerTitle) headerTitle.textContent = 'لإدارة الحضور والرواتب';
        if (headerBadge) headerBadge.classList.add('hidden');
        if (drawerBadge) drawerBadge.classList.add('hidden');
        if (dashboardBadge) dashboardBadge.classList.add('hidden');
        return;
      }

      // جلب اسم الشركة من بيانات المستخدم أو LocalDatabase أو ApiService
      let companyName = activeUser?.company_name || activeUser?.companyName;
      if (!companyName) {
        const db = LocalDatabase.getDB();
        const found = (db.companies || []).find(c => c.id === companyId);
        if (found) companyName = found.name || found.companyName || found.company_name;
      }

      if (!companyName) {
        const compRes = await ApiService.getCompanySettings();
        if (compRes && compRes.success && compRes.data?.companyName) {
          companyName = compRes.data.companyName;
        }
      }

      const cleanName = companyName || 'الشركة الشريكة';

      if (headerTitle) {
        headerTitle.textContent = `| ${cleanName}`;
      }
      if (headerBadge && headerBadgeText) {
        headerBadgeText.textContent = cleanName;
        headerBadge.classList.remove('hidden');
      }
      if (drawerBadge) {
        drawerBadge.textContent = cleanName;
        drawerBadge.classList.remove('hidden');
      }
      if (dashboardBadge && dashboardName) {
        dashboardName.textContent = cleanName;
        dashboardBadge.classList.remove('hidden');
      }
    } catch (err) {
      console.warn('Failed to update company header:', err);
    }
  }

  /**
   * إدارة إخفاء وإظهار العناصر في الواجهة (DOM Manipulation) بناءً على الرتبة والصلاحيات
   */
  function updateRoleBasedUI(roleType) {
    const isPreview = store.state.viewMode === 'employee_preview';
    const effectiveRole = isPreview ? 'employee' : roleType;

    // 1. شاشة الموظف (portal-employee)
    const roleSwitchContainer = document.getElementById('empRoleSwitchContainer');
    const openSalesBtn = document.getElementById('openUpdateSalesBtn');
    const roleBadgeEl = document.getElementById('empUserRoleBadge');

    if (roleBadgeEl) {
      if (isPreview) {
        roleBadgeEl.textContent = 'معاينة: موظف عادي';
        roleBadgeEl.className = 'px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
      } else if (roleType === 'programmer') {
        roleBadgeEl.textContent = 'مبرمج (Programmer)';
        roleBadgeEl.className = 'px-2 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800';
      } else if (roleType === 'manager') {
        roleBadgeEl.textContent = 'مدير (Manager)';
        roleBadgeEl.className = 'px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800';
      } else {
        roleBadgeEl.textContent = 'موظف (Employee)';
        roleBadgeEl.className = 'px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700';
      }
    }

    // إخفاء زر التبديل للإدارة إذا كان موظف عادي أو في وضع المعاينة
    if (roleSwitchContainer) {
      if (isPreview || roleType === 'employee') {
        roleSwitchContainer.classList.add('hidden');
      } else {
        roleSwitchContainer.classList.remove('hidden');
      }
    }

    // زر تحديث المبيعات: يظهر فقط للإدارة أو من يملك صلاحية المبيعات
    if (openSalesBtn) {
      if (isPreview || roleType === 'employee') {
        openSalesBtn.classList.add('hidden');
      } else {
        openSalesBtn.classList.remove('hidden');
      }
    }

    // شريط التنبيه في وضع تبديل العرض (Preview Banner) في شاشة الموظف
    const empMain = document.querySelector('#portal-employee main');
    let previewBanner = document.getElementById('switchViewPreviewBanner');
    if (isPreview && empMain) {
      if (!previewBanner) {
        previewBanner = document.createElement('div');
        previewBanner.id = 'switchViewPreviewBanner';
        previewBanner.className = 'glass-panel p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-amber-400 mb-6';
        const originalTitle = store.state.originalRole === 'programmer' ? 'مبرمج' : 'مدير';
        previewBanner.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shrink-0">
              <i class="fa-solid fa-masks-theater text-amber-200"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <strong class="text-xs sm:text-sm font-black">أنت الآن في وضع تبديل العرض: "موظف عادي" (Employee View Mode)</strong>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white font-mono">معاينة حية</span>
              </div>
              <p class="text-[11px] text-amber-100 mt-0.5">
                يتم الآن عرض النظام كما يراه الموظف العادي تماماً (للقراءة والخدمات الذاتية فقط)، مع حجب كافة قوائم الإدارة والرواتب العامة.
              </p>
            </div>
          </div>
          <button id="exitPreviewModeBtn" class="px-4 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-black text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all active:scale-95 shrink-0">
            <i class="fa-solid fa-arrow-right-from-bracket text-blue-600"></i>
            <span>العودة للواجهة الأصلية (${originalTitle})</span>
          </button>
        `;
        empMain.prepend(previewBanner);
        document.getElementById('exitPreviewModeBtn')?.addEventListener('click', returnToOriginalAdminView);
      }
    } else if (!isPreview && previewBanner) {
      previewBanner.remove();
    }

    // 2. لوحة الإدارة (portal-admin)
    ensureProgrammerNavExists();
    const progGroup = document.getElementById('programmerSidebarGroup');
    if (progGroup) {
      if (roleType === 'programmer' && !isPreview) {
        progGroup.classList.remove('hidden');
      } else {
        progGroup.classList.add('hidden');
      }
    }

    // زر Switch View في رأس لوحة تحكم الإدارة
    const switchBtn = document.getElementById('switchToEmployeeBtn');
    if (switchBtn) {
      switchBtn.innerHTML = '<i class="fa-solid fa-masks-theater text-amber-500 text-sm"></i> <span class="hidden sm:inline">تبديل العرض (معاينة كـ موظف)</span>';
      switchBtn.title = 'تبديل العرض: استعراض النظام كـ موظف عادي';
      switchBtn.className = 'px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 font-bold text-xs hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all flex items-center gap-1.5 shadow-sm';
    }
  }

  /**
   * دالة تبديل العرض لمعاينة النظام كـ موظف عادي (Switch View to Employee Preview)
   */
  function switchViewToEmployeePreview() {
    sound.playClick();
    const user = store.state.currentUser;
    const currentRole = store.state.originalRole || resolveUserRole(user);

    if (currentRole !== 'manager' && currentRole !== 'programmer') {
      showToast('خاصية تبديل العرض متاحة فقط للمدراء والمبرمجين', 'warning');
      return;
    }

    store.state.viewMode = 'employee_preview';
    switchPortal('employee');
    showToast('أنت الآن في وضع تبديل العرض كـ موظف عادي (للقراءة والخدمات الذاتية)', 'info', 3000);
  }

  /**
   * دالة العودة من وضع المعاينة إلى الواجهة الإدارية الأصلية
   */
  function returnToOriginalAdminView() {
    sound.playClick();
    store.state.viewMode = 'default';
    
    const banner = document.getElementById('switchViewPreviewBanner');
    if (banner) banner.remove();

    switchPortal('admin');
    const roleTitle = store.state.originalRole === 'programmer' ? 'مبرمج' : 'مدير';
    showToast(`تمت العودة للواجهة الإدارية الأصلية (${roleTitle}) بنجاح`, 'success', 3000);
  }

  /* ==========================================================================
     PROGRAMMER PANEL CONTROLLER & SUPER ADMIN OPERATIONS
     ========================================================================== */

  let activeProgrammerSubTab = 'progTabPaneUsers';
  let cachedPermissionsMatrix = null;
  let programmerListenersBound = false;

  const PERMISSION_FRIENDLY_LABELS = {
    view_dashboard: 'استعراض لوحة التحكم والمؤشرات الرئيسية',
    view_profile: 'استعراض وتعديل الملف الشخصي',
    punch_attendance: 'تسجيل الحضور والانصراف بالبصمة الحيوية والـ PIN',
    view_own_attendance: 'استعراض سجل الحضور والغياب الشخصي',
    view_all_attendance: 'استعراض سجلات الحضور والانصراف العامة لكل الكوادر',
    manage_attendance: 'إدارة وتعديل سجلات الحضور يدوياً واحتساب التأخيرات',
    export_attendance: 'تصدير كشوفات وسجلات الحضور (CSV / Excel)',
    view_own_payroll: 'استعراض قسيمة الراتب الشخصية الشهرية',
    view_all_payroll: 'استعراض مسير الرواتب العام لكافة العاملين',
    manage_payroll: 'إدارة وحساب الرواتب والبدلات والخصومات الشهرية',
    export_payroll: 'تصدير مسير الرواتب المعتمد للبنك',
    submit_requests: 'تقديم طلبات الإجازات والأذونات والشكاوى (قانون العمل المصري)',
    view_own_requests: 'متابعة الموقف التنفيذي للطلبات الشخصية',
    view_all_requests: 'استعراض كافة طلبات الموظفين المقدمة للإدارة',
    approve_requests: 'اعتماد وقبول طلبات الإجازات والأذونات',
    reject_requests: 'رفض طلبات الإجازات مع توثيق سبب الرفض',
    delete_requests: 'حذف وإلغاء طلبات الإجازات والأذونات',
    view_employees: 'استعراض دليل وكشوفات الموظفين',
    manage_employees: 'إضافة وتعديل وحذف حسابات الموظفين',
    approve_pending_employees: 'مراجعة واعتماد طلبات التعيين الذاتي الجديدة',
    manage_employee_sales: 'تعديل مستهدفات المبيعات ونسبة العمولة',
    manage_employee_salaries: 'تعديل وتحديد الراتب الأساسي وهيكل الأجور',
    view_audit_logs: 'استعراض سجل الرقابة والتدقيق الأمني الشامل',
    export_audit_logs: 'تصدير سجل الرقابة والتدقيق (CSV)',
    clear_audit_logs: 'تفريغ ومسح سجل التدقيق الأمني (Dev Root)',
    view_company_settings: 'استعراض بيانات وهوية الشركة الرسمية',
    edit_company_settings: 'تعديل وتحديث بيانات الشركة والعملة الرسمية (ج.م)',
    view_system_settings: 'استعراض لوائح النظام ومواعيد الوردية',
    edit_system_settings: 'تعديل لوائح العمل ومحددات التأخير والجزاءات',
    manage_role_permissions: 'تعديل وحفظ مصفوفة الصلاحيات التفصيلية (RBAC)',
    access_developer_tools: 'الوصول للوحة تحكم المبرمج (Dev Root Console)',
    reset_database: 'إعادة ضبط قاعدة البيانات التشغيلية لحالة المصنع'
  };

  /**
   * تهيئة عناصر وأحداث لوحة المبرمج وربط التبويبات الأربعة
   */
  function ensureProgrammerNavExists() {
    // 1. زر لوحة المبرمج في القائمة الجانبية (إذا لم يكن موجوداً مسبقاً)
    const sidebarNav = document.querySelector('#appSidebar nav');
    if (sidebarNav && !document.getElementById('programmerSidebarGroup')) {
      const group = document.createElement('div');
      group.id = 'programmerSidebarGroup';
      group.className = 'pt-2 border-t border-slate-200 dark:border-slate-800 hidden';
      group.innerHTML = `
        <div class="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-2 px-3 flex items-center gap-1.5">
          <i class="fa-solid fa-code text-xs"></i>
          <span>منطقة التطوير وهندسة النظام</span>
        </div>
        <div class="space-y-1">
          <button id="programmerNavTab" class="nav-tab w-full px-3.5 py-2.5 rounded-xl text-base font-bold flex items-center gap-3 transition-all text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/60 text-right border border-purple-200/80 dark:border-purple-800/80" data-target="module-programmer">
            <i class="fa-solid fa-terminal text-lg w-6 text-center text-purple-600 dark:text-purple-400"></i>
            <span class="flex-1">لوحة المبرمج</span>
            <span class="bg-purple-100 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200 text-xs px-2 py-0.5 rounded-full font-mono font-bold">Dev Root</span>
          </button>
        </div>
      `;
      sidebarNav.appendChild(group);
    }

    // ربط نقر زر القائمة الجانبية
    const progNavTab = document.getElementById('programmerNavTab');
    if (progNavTab && !progNavTab.dataset.bound) {
      progNavTab.dataset.bound = 'true';
      progNavTab.addEventListener('click', () => {
        sound.playClick();
        navigateToAdminModule('module-programmer');
      });
    }

    // ربط كافة أحداث شاشات المبرمج مرة واحدة
    if (!programmerListenersBound) {
      setupProgrammerEvents();
      programmerListenersBound = true;
    }
  }

  /**
   * ربط كافة مستمعي الأحداث التفاعلية لأقسام لوحة المبرمج الأربعة
   */
  function setupProgrammerEvents() {
    // 1. أزرار التبديل بين التبويبات الأربعة
    const subTabs = [
      { btnId: 'progTabUsersBtn', paneId: 'progTabPaneUsers' },
      { btnId: 'progTabPermsBtn', paneId: 'progTabPanePerms' },
      { btnId: 'progTabAuditBtn', paneId: 'progTabPaneAudit' },
      { btnId: 'progTabCompanyBtn', paneId: 'progTabPaneCompany' }
    ];

    subTabs.forEach(t => {
      const btn = document.getElementById(t.btnId);
      btn?.addEventListener('click', () => {
        sound.playClick();
        switchProgrammerSubTab(t.paneId);
      });
    });

    // 2. أحداث إدارة المستخدمين
    const userSearchInput = document.getElementById('progUserSearchInput');
    const debouncedUserSearch = debounce(() => renderProgrammerUsersTable(), 150);
    userSearchInput?.addEventListener('input', debouncedUserSearch);

    document.getElementById('progUserRoleFilter')?.addEventListener('change', () => renderProgrammerUsersTable());
    document.getElementById('progUserDeptFilter')?.addEventListener('change', () => renderProgrammerUsersTable());
    
    document.getElementById('progRefreshUsersBtn')?.addEventListener('click', async () => {
      sound.playClick();
      showToast('جاري تحديث قائمة المستخدمين...', 'info', 1000);
      await loadEmployees();
      renderProgrammerUsersTable();
      showToast('تم تحديث قائمة المستخدمين بنجاح', 'success');
    });

    // زر إضافة مستخدم جديد (يفتح نافذة الموظف الشاملة)
    document.getElementById('progAddUserBtn')?.addEventListener('click', () => {
      sound.playClick();
      const openAddBtn = document.getElementById('openAddEmployeeModalBtn');
      if (openAddBtn) {
        openAddBtn.click();
      } else {
        const modal = document.getElementById('employeeModal');
        const form = document.getElementById('employeeForm');
        form?.reset();
        const titleEl = document.getElementById('employeeModalTitle');
        if (titleEl) titleEl.textContent = 'إضافة مستخدم جديد للنظام';
        const idInput = document.getElementById('empFormId');
        if (idInput) idInput.value = '';
        const pinInput = document.getElementById('empFormPin');
        if (pinInput) pinInput.value = generateRandom6DigitPin();
        modal?.classList.remove('hidden');
      }
    });

    // تفويض نقرات جدول المستخدمين (Reset PIN, Change Role, Edit, Delete)
    const usersTableBody = document.getElementById('progUsersTableBody');
    usersTableBody?.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.dataset.action;
      const empId = target.dataset.id;
      const emp = (store.state.employees || []).find(x => x.id === empId);
      if (!emp) return;

      sound.playClick();

      if (action === 'reset-pin') {
        openProgResetPinModal(emp);
      } else if (action === 'change-role') {
        openProgChangeRoleModal(emp);
      } else if (action === 'edit-user') {
        openEditEmployeeModal(emp);
      } else if (action === 'delete-user') {
        handleProgDeleteUser(emp);
      }
    });

    // نافذة إعادة تعيين الـ PIN
    const resetPinModal = document.getElementById('progResetPinModal');
    const closeResetPinBtn = document.getElementById('progCloseResetPinModalBtn');
    const cancelResetPinBtn = document.getElementById('progCancelResetPinBtn');
    const genRandomPinBtn = document.getElementById('progGenRandomPinBtn');
    const resetPinForm = document.getElementById('progResetPinForm');

    const closeResetModal = () => resetPinModal?.classList.add('hidden');
    closeResetPinBtn?.addEventListener('click', closeResetModal);
    cancelResetPinBtn?.addEventListener('click', closeResetModal);

    genRandomPinBtn?.addEventListener('click', () => {
      sound.playClick();
      const pinInput = document.getElementById('progResetPinInput');
      if (pinInput) pinInput.value = generateRandom6DigitPin();
    });

    resetPinForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const empId = document.getElementById('progResetPinUserId')?.value;
      const newPin = String(document.getElementById('progResetPinInput')?.value || '').trim();

      if (!newPin || newPin.length < 4 || newPin.length > 6) {
        sound.playError();
        showToast('يجب أن يتكون رمز PIN من 4 إلى 6 أرقام رقمية', 'warning');
        return;
      }

      showToast('جاري تحديث رمز PIN...', 'info', 1000);
      const res = await ApiService.updateEmployee(empId, { pin: newPin });
      if (res.success) {
        sound.playSuccess();
        showToast(`تم تعيين رمز PIN الجديد (${newPin}) للمستخدم بنجاح`, 'success');
        closeResetModal();
        await loadEmployees();
        renderProgrammerUsersTable();
      } else {
        sound.playError();
        showToast(res.message || res.error || 'فشل تحديث رمز PIN', 'error');
      }
    });

    // نافذة تغيير الرتبة (ترقية أو خفض)
    const changeRoleModal = document.getElementById('progChangeRoleModal');
    const closeChangeRoleBtn = document.getElementById('progCloseChangeRoleModalBtn');
    const cancelChangeRoleBtn = document.getElementById('progCancelChangeRoleBtn');
    const changeRoleForm = document.getElementById('progChangeRoleForm');

    const closeRoleModal = () => changeRoleModal?.classList.add('hidden');
    closeChangeRoleBtn?.addEventListener('click', closeRoleModal);
    cancelChangeRoleBtn?.addEventListener('click', closeRoleModal);

    changeRoleForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const empId = document.getElementById('progChangeRoleUserId')?.value;
      const selectedRadio = document.querySelector('input[name="progNewRoleRadio"]:checked');
      if (!selectedRadio || !empId) {
        showToast('يرجى تحديد الرتبة الجديدة أولاً', 'warning');
        return;
      }

      const newRole = selectedRadio.value;
      showToast('جاري تطبيق تغيير الرتبة...', 'info', 1000);
      const res = await ApiService.updateEmployee(empId, { role: newRole });
      if (res.success) {
        sound.playSuccess();
        const roleArabic = newRole === 'programmer' ? 'مبرمج (Super Admin)' : (newRole === 'manager' ? 'مدير (Manager)' : 'موظف (Employee)');
        showToast(`تم تغيير رتبة المستخدم إلى (${roleArabic}) بنجاح`, 'success');
        closeRoleModal();
        await loadEmployees();
        renderProgrammerUsersTable();
      } else {
        sound.playError();
        showToast(res.message || 'فشل تغيير الرتبة', 'error');
      }
    });

    // 3. أحداث مصفوفة الصلاحيات (Scope Dropdown & Actions)
    document.getElementById('progPermScopeSelect')?.addEventListener('change', () => {
      sound.playClick();
      renderProgrammerPermissionsMatrix();
    });

    document.getElementById('progSelectAllPermsBtn')?.addEventListener('click', () => {
      sound.playClick();
      const checkboxes = document.querySelectorAll('#progPermSingleScopeContainer input[type="checkbox"], #progPermissionsTableBody input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = true);
      showToast('تم تحديد جميع الصلاحيات في النطاق الحالي', 'info', 1500);
    });

    document.getElementById('progDeselectAllPermsBtn')?.addEventListener('click', () => {
      sound.playClick();
      const checkboxes = document.querySelectorAll('#progPermSingleScopeContainer input[type="checkbox"], #progPermissionsTableBody input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = false);
      showToast('تم إلغاء تحديد جميع الصلاحيات', 'info', 1500);
    });

    document.getElementById('progSavePermsBtn')?.addEventListener('click', saveProgrammerPermissions);
    document.getElementById('progResetPermsBtn')?.addEventListener('click', resetProgrammerPermissionsDefault);

    const permsSearchInput = document.getElementById('progPermsSearchInput');
    permsSearchInput?.addEventListener('input', debounce(() => filterPermissionsMatrixTable(), 150));

    // 4. أحداث سجل الرقابة
    const auditSearchInput = document.getElementById('progAuditSearch');
    auditSearchInput?.addEventListener('input', debounce(() => filterAndRenderAuditLogs(), 150));
    document.getElementById('progAuditActionFilter')?.addEventListener('change', () => filterAndRenderAuditLogs());
    document.getElementById('progAuditDateFilter')?.addEventListener('change', () => filterAndRenderAuditLogs());

    document.getElementById('progRefreshAuditBtn')?.addEventListener('click', async () => {
      sound.playClick();
      showToast('جاري جلب أحدث سجلات الرقابة...', 'info', 1000);
      await loadAndRenderAuditLogs();
      showToast('تم تحديث سجل الرقابة بنجاح', 'success');
    });

    document.getElementById('progExportAuditBtn')?.addEventListener('click', () => {
      sound.playClick();
      exportAuditLogsCSV();
    });

    // 5. أحداث إعدادات وهوية الشركة
    const companyForm = document.getElementById('progCompanySettingsForm');
    companyForm?.addEventListener('submit', handleSaveCompanySettings);

    document.getElementById('progResetCompanyBtn')?.addEventListener('click', () => {
      sound.playClick();
      loadCompanySettingsForm();
      showToast('تمت استعادة بيانات الشركة المحفوظة', 'info');
    });

    // Live Logo URL preview
    const logoInput = document.getElementById('progCompLogo');
    logoInput?.addEventListener('input', () => {
      updateCompanyLogoPreview(logoInput.value.trim());
    });

    // 5.5 أحداث إدارة الشركات والمشتركين (Tenants Management)
    const tenantsSearch = document.getElementById('progTenantsSearch');
    const debouncedTenantsSearch = debounce(() => renderProgrammerTenantsTable(), 150);
    tenantsSearch?.addEventListener('input', debouncedTenantsSearch);

    document.getElementById('progTenantsStatusFilter')?.addEventListener('change', () => renderProgrammerTenantsTable());

    document.getElementById('progRefreshTenantsBtn')?.addEventListener('click', async () => {
      sound.playClick();
      showToast('جاري تحديث قائمة الشركات...', 'info', 800);
      await renderProgrammerTenantsTable();
      showToast('تم تحديث قائمة الشركات بنجاح', 'success');
    });

    // تفويض نقرات جدول الشركات (Approve Tenant, Reject/Delete Tenant)
    const tenantsTableBody = document.getElementById('progTenantsTableBody');
    tenantsTableBody?.addEventListener('click', async (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.dataset.action;
      const companyId = target.dataset.id;
      if (!companyId) return;

      sound.playClick();

      if (action === 'prog-approve-tenant') {
        const confirmed = confirm('هل أنت متأكد من اعتماد وتفعيل هذه الشركة؟\nسيتم فوراً تفعيل الشركة وإنشاء حساب رسمي للمدير المسؤول بصلاحية Admin وربطه بالشركة.');
        if (!confirmed) return;

        target.disabled = true;
        target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الاعتماد...';

        const res = await ApiService.approveTenant(companyId);
        if (res.success) {
          sound.playSuccess();
          showToast(res.message || 'تم اعتماد وتفعيل الشركة بنجاح!', 'success', 5000);
          await loadEmployees();
          renderProgrammerTenantsTable();
        } else {
          sound.playError();
          showToast(res.message || 'فشل في اعتماد الشركة', 'error');
          target.disabled = false;
        }
      } else if (action === 'prog-reject-tenant') {
        const confirmed = confirm('تحذير: هل أنت متأكد من رفض وحذف هذه الشركة نهائياً من النظام؟\nسيتم حذف الشركة وجميع بياناتها.');
        if (!confirmed) return;

        target.disabled = true;
        target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحذف...';

        const res = await ApiService.rejectTenant(companyId);
        if (res.success) {
          sound.playSuccess();
          showToast(res.message || 'تم حذف الشركة بنجاح', 'success');
          await loadEmployees();
          renderProgrammerTenantsTable();
        } else {
          sound.playError();
          showToast(res.message || 'فشل في حذف الشركة', 'error');
          target.disabled = false;
        }
      }
    });

    // 6. زر إعادة تهيئة وتصفير النظام في لوحة المبرمج
    const progResetBtn = document.getElementById('progResetDataBtn');
    progResetBtn?.addEventListener('click', async () => {
      sound.playAlert();
      if (confirm('تنبيه أمني فائق (Super Admin / المبرمج):\n\nهل أنت متأكد من تصفير وإعادة تهيئة النظام بالكامل؟\nسيتم حذف كافة السجلات والطلبات والإجازات والتسويات وتصفير الحسابات، والإبقاء فقط على حساب المبرمج المعتمد.')) {
        showToast('جاري تصفير وإعادة تهيئة النظام...', 'info', 1500);
        await ApiService.resetDatabase();
        sound.playSuccess();
        showToast('تمت إعادة تهيئة وتصفير النظام بنجاح!', 'success');
        setTimeout(() => { location.reload(); }, 600);
      }
    });
  }

  /* --------------------------------------------------------------------------
     1. الشاشة الأولى: إدارة المستخدمين الشاملة
     -------------------------------------------------------------------------- */

  function renderProgrammerUsersTable() {
    const tbody = document.getElementById('progUsersTableBody');
    if (!tbody) return;

    const employees = store.state.employees || [];

    // KPI Counters
    const totalCount = employees.length;
    let progCount = 0;
    let mgrCount = 0;
    let empCount = 0;

    employees.forEach(emp => {
      const r = resolveUserRole(emp);
      if (r === 'programmer') progCount++;
      else if (r === 'manager') mgrCount++;
      else empCount++;
    });

    const totalEl = document.getElementById('progStatTotalUsers');
    const progEl = document.getElementById('progStatTotalProg');
    const mgrEl = document.getElementById('progStatTotalMgr');
    const empEl = document.getElementById('progStatTotalEmp');

    if (totalEl) totalEl.textContent = String(totalCount);
    if (progEl) progEl.textContent = String(progCount);
    if (mgrEl) mgrEl.textContent = String(mgrCount);
    if (empEl) empEl.textContent = String(empCount);

    // Populate Dept Filter if needed
    const deptFilter = document.getElementById('progUserDeptFilter');
    if (deptFilter && deptFilter.options.length <= 1) {
      const depts = [...new Set(employees.map(e => e.department).filter(Boolean))];
      depts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        deptFilter.appendChild(opt);
      });
    }

    // Filter Logic
    const searchVal = String(document.getElementById('progUserSearchInput')?.value || '').toLowerCase().trim();
    const roleVal = document.getElementById('progUserRoleFilter')?.value || 'all';
    const deptVal = document.getElementById('progUserDeptFilter')?.value || 'all';

    let filtered = employees.filter(emp => {
      const r = resolveUserRole(emp);
      if (roleVal !== 'all' && r !== roleVal) return false;
      if (deptVal !== 'all' && emp.department !== deptVal) return false;
      if (searchVal) {
        const hay = `${emp.fullName || ''} ${emp.id || ''} ${emp.jobTitle || ''} ${emp.email || ''} ${emp.department || ''}`.toLowerCase();
        if (!hay.includes(searchVal)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-500 font-medium">لا يوجد مستخدمون مطابقون لمعايير البحث</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(emp => {
      const role = resolveUserRole(emp);
      let roleBadge = '';
      if (role === 'programmer') {
        roleBadge = '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1.5 w-fit"><i class="fa-solid fa-crown text-[10px] text-amber-500"></i> مبرمج (Dev Root)</span>';
      } else if (role === 'manager') {
        roleBadge = '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1.5 w-fit"><i class="fa-solid fa-user-shield text-[10px]"></i> مدير (Manager)</span>';
      } else {
        roleBadge = '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 w-fit"><i class="fa-solid fa-user text-[10px]"></i> موظف (Staff)</span>';
      }

      const avatarSrc = emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
      const isCurrentUser = store.state.currentUser && store.state.currentUser.id === emp.id;
      const empCode = getEmployeeCode(emp);
      const childId = `prog-user-child-${emp.id}`;

      return `
        <tr class="table-parent-row hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer md:cursor-default" data-child-id="${childId}">
          <td class="p-2.5 sm:p-3.5">
            <div class="flex items-center gap-2.5">
              <img src="${avatarSrc}" alt="${escapeHTML(emp.fullName)}" class="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
              <div class="min-w-0">
                <div class="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                  <span class="truncate">${escapeHTML(emp.fullName)}</span>
                  ${isCurrentUser ? '<span class="px-1.5 py-0.2 rounded text-[10px] bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200 font-bold font-mono">حسابك</span>' : ''}
                </div>
                <div class="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium flex items-center gap-1 mt-0.5">
                  <span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">${escapeHTML(empCode)}</span>
                  <span class="hidden sm:inline text-slate-400">•</span>
                  <span class="hidden sm:inline truncate max-w-[140px]" title="${escapeHTML(emp.email || '')}">${escapeHTML(emp.email || 'بدون بريد')}</span>
                </div>
              </div>
            </div>
          </td>

          <td class="p-3.5 whitespace-nowrap hidden md:table-cell">
            <div class="font-bold text-slate-800 dark:text-slate-200">${escapeHTML(emp.jobTitle || 'موظف')}</div>
            <div class="text-xs text-slate-500 dark:text-slate-400">${escapeHTML(emp.department || 'عام')}</div>
          </td>

          <td class="p-2.5 sm:p-3.5 whitespace-nowrap">
            ${roleBadge}
          </td>

          <td class="p-3.5 font-mono whitespace-nowrap hidden md:table-cell">
            <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              <span class="font-black tracking-widest text-xs">${escapeHTML(emp.pin || '1234')}</span>
              <i class="fa-solid fa-key text-[10px] text-amber-500" title="رمز الدخول"></i>
            </div>
          </td>

          <td class="p-3.5 whitespace-nowrap hidden lg:table-cell">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 badge-live-pulse"></span>
              <span>نشط (Active)</span>
            </span>
          </td>

          <td class="p-3.5 text-center whitespace-nowrap hidden md:table-cell">
            <div class="flex items-center justify-center gap-1.5 whitespace-nowrap">
              <!-- تغيير الرتبة -->
              <button type="button" data-action="change-role" data-id="${emp.id}" class="p-1.5 px-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold flex items-center gap-1 transition-all shrink-0" title="ترقية أو خفض الرتبة">
                <i class="fa-solid fa-user-shield text-[11px]"></i>
                <span>الرتبة</span>
              </button>

              <!-- إعادة تعيين PIN -->
              <button type="button" data-action="reset-pin" data-id="${emp.id}" class="p-1.5 px-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/80 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-bold flex items-center gap-1 transition-all shrink-0" title="إعادة تعيين رمز PIN">
                <i class="fa-solid fa-key text-[11px]"></i>
                <span>PIN</span>
              </button>

              <!-- تعديل البيانات -->
              <button type="button" data-action="edit-user" data-id="${emp.id}" class="p-1.5 px-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center gap-1 transition-all shrink-0" title="تعديل بيانات المستخدم">
                <i class="fa-solid fa-pen-to-square text-[11px]"></i>
                <span>تعديل</span>
              </button>

              <!-- حذف المستخدم -->
              <button type="button" data-action="delete-user" data-id="${emp.id}" ${isCurrentUser ? 'disabled' : ''} class="p-1.5 px-2.5 rounded-lg ${isCurrentUser ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'} text-xs font-bold flex items-center gap-1 transition-all shrink-0" title="${isCurrentUser ? 'لا يمكن حذف الحساب المسجل به حالياً' : 'حذف المستخدم'}">
                <i class="fa-solid fa-trash-can text-[11px]"></i>
                <span>حذف</span>
              </button>
            </div>
          </td>

          <td class="p-2 sm:p-2.5 text-center md:hidden">
            <button class="row-expand-btn" data-action="toggle-child-row" data-target="${childId}" title="عرض باقي التفاصيل والإجراءات" aria-label="عرض باقي التفاصيل والإجراءات">
              <i class="fa-solid fa-chevron-down text-xs"></i>
            </button>
          </td>
        </tr>

        <tr id="${childId}" class="responsive-child-row hidden bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <td colspan="7" class="p-2.5 sm:p-3">
            <div class="responsive-child-card p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5 text-xs">
              <div class="grid grid-cols-2 gap-2 text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <span class="text-slate-500 font-medium block text-[11px]">المسمى والقسم:</span>
                  <span class="font-bold text-slate-800 dark:text-slate-200">${escapeHTML(emp.jobTitle || 'موظف')} • ${escapeHTML(emp.department || 'عام')}</span>
                </div>
                <div>
                  <span class="text-slate-500 font-medium block text-[11px]">رمز الـ PIN:</span>
                  <span class="font-mono font-black text-amber-600 dark:text-amber-400">${escapeHTML(emp.pin || '1234')}</span>
                </div>
                <div class="col-span-2 sm:col-span-1">
                  <span class="text-slate-500 font-medium block text-[11px]">البريد الإلكتروني:</span>
                  <span class="font-mono text-slate-700 dark:text-slate-300 break-all">${escapeHTML(emp.email || 'بدون بريد')}</span>
                </div>
                <div>
                  <span class="text-slate-500 font-medium block text-[11px]">حالة الحساب:</span>
                  <span class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>نشط (Active)</span>
                </div>
              </div>
              <div>
                <span class="text-slate-500 font-medium block mb-1.5 text-[11px]">الإجراءات والتحكم الجذري:</span>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button type="button" data-action="change-role" data-id="${emp.id}" class="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold flex items-center justify-center gap-1.5">
                    <i class="fa-solid fa-user-shield text-xs"></i>
                    <span>الرتبة</span>
                  </button>
                  <button type="button" data-action="reset-pin" data-id="${emp.id}" class="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/80 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-bold flex items-center justify-center gap-1.5">
                    <i class="fa-solid fa-key text-xs"></i>
                    <span>PIN</span>
                  </button>
                  <button type="button" data-action="edit-user" data-id="${emp.id}" class="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center justify-center gap-1.5">
                    <i class="fa-solid fa-pen-to-square text-xs"></i>
                    <span>تعديل</span>
                  </button>
                  <button type="button" data-action="delete-user" data-id="${emp.id}" ${isCurrentUser ? 'disabled' : ''} class="p-2 rounded-lg ${isCurrentUser ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'} text-xs font-bold flex items-center justify-center gap-1.5">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openProgResetPinModal(emp) {
    const modal = document.getElementById('progResetPinModal');
    if (!modal) return;

    document.getElementById('progResetPinUserId').value = emp.id;
    document.getElementById('progResetPinUserName').textContent = emp.fullName;
    document.getElementById('progResetPinUserCode').textContent = emp.id;
    document.getElementById('progResetPinUserRole').textContent = resolveUserRole(emp) === 'programmer' ? 'مبرمج' : (resolveUserRole(emp) === 'manager' ? 'مدير' : 'موظف');
    document.getElementById('progResetPinUserAvatar').src = emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
    document.getElementById('progResetPinInput').value = emp.pin || '1234';

    modal.classList.remove('hidden');
  }

  function openProgChangeRoleModal(emp) {
    const modal = document.getElementById('progChangeRoleModal');
    if (!modal) return;

    const currentRole = resolveUserRole(emp);
    document.getElementById('progChangeRoleUserId').value = emp.id;
    document.getElementById('progChangeRoleUserName').textContent = `${emp.fullName} (${getEmployeeCode(emp)})`;
    document.getElementById('progChangeRoleCurrentRoleBadge').textContent = currentRole === 'programmer' ? 'مبرمج (Super Admin)' : (currentRole === 'manager' ? 'مدير (Manager)' : 'موظف (Employee)');
    document.getElementById('progChangeRoleUserAvatar').src = emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';

    const radio = document.querySelector(`input[name="progNewRoleRadio"][value="${currentRole}"]`);
    if (radio) radio.checked = true;

    modal.classList.remove('hidden');
  }

  async function handleProgDeleteUser(emp) {
    if (store.state.currentUser && store.state.currentUser.id === emp.id) {
      sound.playError();
      showToast('أمان النظام: لا يمكنك حذف حساب المبرمج المسجل به حالياً!', 'warning');
      return;
    }

    if (!confirm(`تحذير أمني:\nهل أنت متأكد من رغبتك في حذف واستبعاد حساب المستخدم (${emp.fullName} - ${emp.id}) نهائياً؟\nسيتم تسجيل هذه الحركة في سجل الرقابة والتدقيق الأمني.`)) {
      return;
    }

    showToast('جاري حذف المستخدم وتوثيق العملية في سجل التدقيق...', 'info', 1500);
    const res = await ApiService.deleteEmployee(emp.id);
    if (res.success) {
      sound.playSuccess();
      showToast(`تم حذف حساب (${emp.fullName}) بنجاح`, 'success');
      await loadEmployees();
      renderProgrammerUsersTable();
    } else {
      sound.playError();
      showToast(res.message || 'فشل حذف المستخدم', 'error');
    }
  }

  /* --------------------------------------------------------------------------
     2. الشاشة الثانية: مصفوفة الصلاحيات التفصيلية (Interactive Scope & Checkboxes)
     -------------------------------------------------------------------------- */

  const PERMISSION_CATEGORIES = {
    salaries: {
      title: 'الرواتب والأجور والبدلات',
      icon: 'fa-solid fa-receipt text-emerald-500',
      badge: 'مالي',
      keys: ['view_own_payroll', 'view_all_payroll', 'manage_payroll', 'export_payroll', 'manage_employee_salaries']
    },
    attendance: {
      title: 'الحضور والدوام والانصراف (GPS)',
      icon: 'fa-solid fa-clock text-blue-500',
      badge: 'دوام',
      keys: ['punch_attendance', 'view_own_attendance', 'view_all_attendance', 'manage_attendance', 'export_attendance']
    },
    requests: {
      title: 'الإجازات والطلبات الرسمية والقرارات',
      icon: 'fa-solid fa-paper-plane text-purple-500',
      badge: 'طلبات',
      keys: ['submit_requests', 'view_own_requests', 'view_all_requests', 'approve_requests', 'reject_requests', 'delete_requests']
    },
    employees: {
      title: 'إدارة الكوادر والمبيعات والتارجت',
      icon: 'fa-solid fa-users text-amber-500',
      badge: 'كوادر',
      keys: ['view_employees', 'manage_employees', 'approve_pending_employees', 'manage_employee_sales']
    },
    system: {
      title: 'هندسة النظام، سجل الرقابة والتحكم الجذري',
      icon: 'fa-solid fa-terminal text-rose-500',
      badge: 'نظام',
      keys: ['view_dashboard', 'view_profile', 'view_audit_logs', 'export_audit_logs', 'clear_audit_logs', 'view_company_settings', 'edit_company_settings', 'view_system_settings', 'edit_system_settings', 'manage_role_permissions', 'access_developer_tools', 'reset_database']
    }
  };

  async function renderProgrammerPermissionsMatrix() {
    const scopeSelect = document.getElementById('progPermScopeSelect');
    const scopeVal = scopeSelect?.value || 'role:employee';
    const singleContainer = document.getElementById('progPermSingleScopeContainer');
    const allMatrixContainer = document.getElementById('progPermAllMatrixContainer');
    const scopeBanner = document.getElementById('progPermScopeBanner');
    const activeScopeNameEl = document.getElementById('progPermActiveScopeName');
    const scopeTypeBadgeEl = document.getElementById('progPermScopeTypeBadge');

    // Make sure department options in dropdown are loaded
    const db = LocalDatabase.getDB();
    const depts = db.departments || [];
    const deptOptGroup = document.getElementById('progPermDeptOptGroup');
    if (deptOptGroup && deptOptGroup.children.length === 0) {
      deptOptGroup.innerHTML = depts.map(d => `
        <option value="dept:${escapeHTML(d.name)}">قسم ${escapeHTML(d.name)} (${escapeHTML(d.code)})</option>
      `).join('');
    }

    if (scopeVal === 'view:all_matrix') {
      // Show Comparative Matrix Table (3 roles side-by-side)
      if (singleContainer) singleContainer.classList.add('hidden');
      if (allMatrixContainer) allMatrixContainer.classList.remove('hidden');
      if (scopeBanner) {
        if (activeScopeNameEl) activeScopeNameEl.textContent = 'مصفوفة المقارنة الشاملة لجميع الرتب';
        if (scopeTypeBadgeEl) scopeTypeBadgeEl.textContent = 'عرض مقارن';
      }

      const tbody = document.getElementById('progPermissionsTableBody');
      if (!tbody) return;

      const perms = db.role_permissions || INITIAL_DATABASE.role_permissions;
      cachedPermissionsMatrix = cloneData(perms);

      const empPerms = perms.employee || {};
      const mgrPerms = perms.manager || perms.admin || {};
      const progPerms = perms.programmer || perms.admin || {};

      const allKeys = Object.keys(PERMISSION_FRIENDLY_LABELS);

      tbody.innerHTML = allKeys.map(key => {
        const label = PERMISSION_FRIENDLY_LABELS[key] || key;
        const isEmp = !!empPerms[key];
        const isMgr = !!mgrPerms[key];
        const isProg = !!progPerms[key];

        return `
          <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors perm-row" data-key="${key}">
            <td class="p-3.5">
              <div class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">${escapeHTML(label)}</div>
              <div class="font-mono text-[11px] text-purple-600 dark:text-purple-400 mt-0.5">${escapeHTML(key)}</div>
            </td>
            <td class="p-3.5 text-center">
              <input type="checkbox" data-role="employee" data-key="${key}" ${isEmp ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer">
            </td>
            <td class="p-3.5 text-center">
              <input type="checkbox" data-role="manager" data-key="${key}" ${isMgr ? 'checked' : ''} class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer">
            </td>
            <td class="p-3.5 text-center">
              <input type="checkbox" data-role="programmer" data-key="${key}" ${isProg ? 'checked' : ''} class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer">
            </td>
          </tr>
        `;
      }).join('');
      return;
    }

    // Single Scope View (Role or Department)
    if (allMatrixContainer) allMatrixContainer.classList.add('hidden');
    if (singleContainer) singleContainer.classList.remove('hidden');

    let targetPermissions = {};
    let targetTitle = '';
    let targetBadge = '';

    if (scopeVal.startsWith('dept:')) {
      const deptName = scopeVal.replace('dept:', '');
      const deptRes = await ApiService.getDepartmentPermissions(deptName);
      targetPermissions = deptRes.data || {};
      targetTitle = `صلاحيات قسم: ${deptName}`;
      targetBadge = 'صلاحيات قسم مخصصة';
    } else {
      const role = scopeVal.replace('role:', '');
      const roleRes = await ApiService.getRolePermissions(role);
      targetPermissions = roleRes.data || {};
      const roleTitle = role === 'programmer' ? 'مبرمج (Super Admin)' : (role === 'manager' ? 'مدير إدارة (Manager)' : 'موظف عادي (Employee)');
      targetTitle = `صلاحيات رتبة: ${roleTitle}`;
      targetBadge = 'رتبة عامة';
    }

    if (activeScopeNameEl) activeScopeNameEl.textContent = targetTitle;
    if (scopeTypeBadgeEl) scopeTypeBadgeEl.textContent = targetBadge;

    if (!singleContainer) return;

    // Render categorized cards
    singleContainer.innerHTML = Object.entries(PERMISSION_CATEGORIES).map(([catKey, cat]) => {
      const categoryKeys = cat.keys;
      const activeCount = categoryKeys.filter(k => !!targetPermissions[k]).length;

      const itemsHtml = categoryKeys.map(k => {
        const isChecked = !!targetPermissions[k];
        const label = PERMISSION_FRIENDLY_LABELS[k] || k;

        return `
          <div class="perm-card-item flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all" data-key="${k}">
            <div class="min-w-0 flex-1">
              <strong class="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">${escapeHTML(label)}</strong>
              <span class="font-mono text-[11px] text-purple-600 dark:text-purple-400 mt-0.5 block truncate">${escapeHTML(k)}</span>
            </div>
            <label class="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" data-single-key="${k}" ${isChecked ? 'checked' : ''} class="sr-only peer">
              <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-teal-600 shadow-sm"></div>
            </label>
          </div>
        `;
      }).join('');

      return `
        <div class="glass-panel p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 perm-category-section">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 class="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <i class="${cat.icon}"></i>
              <span>${escapeHTML(cat.title)}</span>
            </h3>
            <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              ${activeCount} / ${categoryKeys.length} مفعل
            </span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            ${itemsHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  function filterPermissionsMatrixTable() {
    const searchVal = String(document.getElementById('progPermsSearchInput')?.value || '').toLowerCase().trim();
    // Filter Table rows
    document.querySelectorAll('.perm-row').forEach(r => {
      const text = r.textContent.toLowerCase();
      r.classList.toggle('hidden', searchVal && !text.includes(searchVal));
    });
    // Filter Card items
    document.querySelectorAll('.perm-card-item').forEach(c => {
      const text = c.textContent.toLowerCase();
      c.classList.toggle('hidden', searchVal && !text.includes(searchVal));
    });
  }

  async function saveProgrammerPermissions() {
    sound.playClick();
    const scopeSelect = document.getElementById('progPermScopeSelect');
    const scopeVal = scopeSelect?.value || 'role:employee';

    showToast('جاري حفظ وتطبيق الصلاحيات...', 'info', 1000);

    try {
      if (scopeVal === 'view:all_matrix') {
        const empPerms = {};
        const mgrPerms = {};
        const progPerms = {};

        const checkboxes = document.querySelectorAll('#progPermissionsTableBody input[type="checkbox"]');
        checkboxes.forEach(cb => {
          const role = cb.dataset.role;
          const key = cb.dataset.key;
          const val = cb.checked;
          if (role === 'employee') empPerms[key] = val;
          else if (role === 'manager') mgrPerms[key] = val;
          else if (role === 'programmer') progPerms[key] = val;
        });

        await ApiService.updateRolePermissions('employee', empPerms);
        await ApiService.updateRolePermissions('manager', mgrPerms);
        await ApiService.updateRolePermissions('programmer', progPerms);

        sound.playSuccess();
        showToast('تم حفظ مصفوفة الرتب العامة الشاملة بنجاح', 'success');
      } else if (scopeVal.startsWith('dept:')) {
        const deptName = scopeVal.replace('dept:', '');
        const deptPerms = {};
        const checkboxes = document.querySelectorAll('#progPermSingleScopeContainer input[data-single-key]');
        checkboxes.forEach(cb => {
          deptPerms[cb.dataset.singleKey] = cb.checked;
        });

        await ApiService.updateDepartmentPermissions(deptName, deptPerms);
        sound.playSuccess();
        showToast(`تم حفظ وتطبيق الصلاحيات المخصصة لقسم (${deptName}) بنجاح`, 'success');
      } else {
        const role = scopeVal.replace('role:', '');
        const rolePerms = {};
        const checkboxes = document.querySelectorAll('#progPermSingleScopeContainer input[data-single-key]');
        checkboxes.forEach(cb => {
          rolePerms[cb.dataset.singleKey] = cb.checked;
        });

        await ApiService.updateRolePermissions(role, rolePerms);

        const currentRole = store.state.originalRole || resolveUserRole(store.state.currentUser);
        if (currentRole === role) {
          const updated = await ApiService.getRolePermissions(currentRole);
          store.state.currentPermissions = updated.data || updated;
        }

        sound.playSuccess();
        const roleTitle = role === 'programmer' ? 'المبرمج' : (role === 'manager' ? 'المدير' : 'الموظف');
        showToast(`تم حفظ وتطبيق صلاحيات رتبة (${roleTitle}) بنجاح`, 'success');
      }
    } catch (err) {
      sound.playError();
      showToast('فشل حفظ الصلاحيات', 'error');
    }
  }

  async function resetProgrammerPermissionsDefault() {
    sound.playClick();
    const scopeSelect = document.getElementById('progPermScopeSelect');
    const scopeVal = scopeSelect?.value || 'role:employee';

    if (!confirm('هل أنت متأكد من رغبتك في استعادة الصلاحيات الافتراضية لهذا النطاق؟')) return;

    try {
      if (scopeVal.startsWith('dept:')) {
        const deptName = scopeVal.replace('dept:', '');
        const defaultDept = INITIAL_DATABASE.department_permissions[deptName] || INITIAL_DATABASE.role_permissions.employee;
        await ApiService.updateDepartmentPermissions(deptName, defaultDept);
      } else if (scopeVal === 'view:all_matrix') {
        const defaults = INITIAL_DATABASE.role_permissions;
        await ApiService.updateRolePermissions('employee', defaults.employee);
        await ApiService.updateRolePermissions('manager', defaults.manager);
        await ApiService.updateRolePermissions('programmer', defaults.programmer);
      } else {
        const role = scopeVal.replace('role:', '');
        const defaultRole = INITIAL_DATABASE.role_permissions[role] || INITIAL_DATABASE.role_permissions.employee;
        await ApiService.updateRolePermissions(role, defaultRole);
      }

      await renderProgrammerPermissionsMatrix();
      sound.playSuccess();
      showToast('تمت استعادة الصلاحيات الافتراضية بنجاح', 'success');
    } catch (err) {
      sound.playError();
      showToast('فشل استعادة الصلاحيات', 'error');
    }
  }

  /* --------------------------------------------------------------------------
     3. الشاشة الثالثة: سجل الرقابة والتدقيق (Audit Log)
     -------------------------------------------------------------------------- */

  async function loadAndRenderAuditLogs() {
    const tbody = document.getElementById('progAuditLogsTableBody');
    if (!tbody) return;

    try {
      const res = await ApiService.getAuditLogs();
      cachedAuditLogs = res.data || [];
      filterAndRenderAuditLogs();
    } catch (e) {
      cachedAuditLogs = LocalDatabase.getDB().audit_logs || [];
      filterAndRenderAuditLogs();
    }
  }

  function filterAndRenderAuditLogs() {
    const tbody = document.getElementById('progAuditLogsTableBody');
    if (!tbody) return;

    // KPI Counters
    let updateCount = 0;
    let createCount = 0;
    let otherCount = 0;

    cachedAuditLogs.forEach(l => {
      const t = l.actionType || '';
      if (t === 'تعديل') updateCount++;
      else if (t === 'إضافة') createCount++;
      else otherCount++;
    });

    const totalEl = document.getElementById('progAuditTotalCount');
    const updateEl = document.getElementById('progAuditUpdateCount');
    const createEl = document.getElementById('progAuditCreateCount');
    const otherEl = document.getElementById('progAuditOtherCount');
    const badgeEl = document.getElementById('progAuditTabBadge');

    if (totalEl) totalEl.textContent = String(cachedAuditLogs.length);
    if (updateEl) updateEl.textContent = String(updateCount);
    if (createEl) createEl.textContent = String(createCount);
    if (otherEl) otherEl.textContent = String(otherCount);
    if (badgeEl) badgeEl.textContent = String(cachedAuditLogs.length);

    // Filters
    const searchVal = String(document.getElementById('progAuditSearch')?.value || '').toLowerCase().trim();
    const actionVal = document.getElementById('progAuditActionFilter')?.value || 'all';
    const dateVal = document.getElementById('progAuditDateFilter')?.value || 'all';

    let filtered = [...cachedAuditLogs];

    if (actionVal !== 'all') {
      filtered = filtered.filter(l => l.actionType === actionVal);
    }

    if (searchVal) {
      filtered = filtered.filter(l => 
        (l.details || '').toLowerCase().includes(searchVal) ||
        (l.performedBy?.name || '').toLowerCase().includes(searchVal) ||
        (l.action || '').toLowerCase().includes(searchVal) ||
        (l.target || '').toLowerCase().includes(searchVal)
      );
    }

    if (dateVal === 'today') {
      const todayStr = new Date().toISOString().slice(0, 10);
      filtered = filtered.filter(l => String(l.timestamp || '').slice(0, 10) === todayStr);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-500 font-medium">لا توجد سجلات تدقيق مطابقة لمعايير البحث</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.slice(0, 150).map((log, idx) => {
      let actionBadge = '';
      const type = log.actionType || 'تعديل';
      if (type === 'إضافة') actionBadge = '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">إضافة (Create)</span>';
      else if (type === 'تعديل') actionBadge = '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">تعديل (Update)</span>';
      else if (type === 'حذف') actionBadge = '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">حذف (Delete)</span>';
      else if (type === 'مصادقة') actionBadge = '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">مصادقة (Auth)</span>';
      else if (type === 'اعتماد') actionBadge = '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">اعتماد (Approve)</span>';
      else actionBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">${escapeHTML(type)}</span>`;

      const actorName = log.performedBy?.name || 'النظام الآلي';
      const actorRole = log.performedBy?.roleArabic || log.performedBy?.role || 'System';
      const actorId = log.performedBy?.id ? `(${log.performedBy.id})` : '';
      const childId = `audit-child-${idx}-${log.id || Date.now()}`;

      return `
        <tr class="table-parent-row hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer md:cursor-default" data-child-id="${childId}">
          <td class="p-2.5 sm:p-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">
            ${escapeHTML(log.dateFormatted || log.timestamp)}
          </td>
          <td class="p-2.5 sm:p-3.5">
            <div class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
              <span>${escapeHTML(actorName)}</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold">${escapeHTML(actorRole)}</span>
            </div>
            ${actorId ? `<div class="font-mono text-[11px] text-slate-400 hidden sm:block">${escapeHTML(actorId)}</div>` : ''}
          </td>
          <td class="p-3.5 whitespace-nowrap hidden md:table-cell">${actionBadge}</td>
          <td class="p-3.5 font-mono font-bold text-xs text-slate-700 dark:text-slate-300 hidden lg:table-cell">${escapeHTML(log.target || 'system')}</td>
          <td class="p-3.5 text-xs text-slate-700 dark:text-slate-300 max-w-lg break-words leading-relaxed hidden md:table-cell">${escapeHTML(log.details)}</td>
          <td class="p-2 sm:p-2.5 text-center md:hidden">
            <button class="row-expand-btn" data-action="toggle-child-row" data-target="${childId}" title="عرض باقي التفاصيل" aria-label="عرض باقي التفاصيل">
              <i class="fa-solid fa-chevron-down text-xs"></i>
            </button>
          </td>
        </tr>
        <tr id="${childId}" class="responsive-child-row hidden bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <td colspan="6" class="p-2.5 sm:p-3">
            <div class="responsive-child-card p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2 text-xs">
              <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span class="text-slate-500 font-medium">نوع الإجراء:</span>
                <div>${actionBadge}</div>
              </div>
              <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span class="text-slate-500 font-medium">الكيان المستهدف:</span>
                <span class="font-mono font-bold text-slate-800 dark:text-slate-200">${escapeHTML(log.target || 'system')}</span>
              </div>
              <div>
                <span class="text-slate-500 font-medium block mb-1">تفاصيل وبيانات الحركة:</span>
                <p class="text-slate-800 dark:text-slate-200 font-medium leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">${escapeHTML(log.details)}</p>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function exportAuditLogsCSV() {
    if (!cachedAuditLogs || cachedAuditLogs.length === 0) {
      showToast('لا توجد سجلات تدقيق لتصديرها', 'warning');
      return;
    }

    const headers = ['التاريخ والوقت', 'اسم المنفذ', 'رتبة المنفذ', 'نوع الإجراء', 'الكيان المستهدف', 'التفاصيل'];
    const rows = cachedAuditLogs.map(l => [
      `"${l.dateFormatted || l.timestamp || ''}"`,
      `"${l.performedBy?.name || ''}"`,
      `"${l.performedBy?.roleArabic || l.performedBy?.role || ''}"`,
      `"${l.actionType || ''}"`,
      `"${l.target || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ae_hr_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('تم تصدير سجل التدقيق إلى ملف CSV بنجاح', 'success');
  }

  /* --------------------------------------------------------------------------
     3.5 إدارة الشركات والمشتركين (Multi-Tenant SaaS Management)
     -------------------------------------------------------------------------- */
  let cachedTenantsList = [];

  /**
   * جلب وعرض جدول إدارة الشركات والمشتركين في لوحة المبرمج
   */
  async function renderProgrammerTenantsTable() {
    const tbody = document.getElementById('progTenantsTableBody');
    if (!tbody) return;

    try {
      const res = await ApiService.getAllTenants();
      const tenants = (res && res.success) ? (res.data || []) : [];
      cachedTenantsList = tenants;

      // تحديث عدادات KPI
      const totalCount = tenants.length;
      const activeCount = tenants.filter(t => t.status === 'active').length;
      const pendingCount = tenants.filter(t => t.status === 'pending').length;

      const totalEl = document.getElementById('progTenantsTotalCount');
      const activeEl = document.getElementById('progTenantsActiveCount');
      const pendingEl = document.getElementById('progTenantsPendingCount');
      const badgeEl = document.getElementById('progTenantsPendingBadge');

      if (totalEl) totalEl.textContent = String(totalCount);
      if (activeEl) activeEl.textContent = String(activeCount);
      if (pendingEl) pendingEl.textContent = String(pendingCount);

      if (badgeEl) {
        if (pendingCount > 0) {
          badgeEl.textContent = String(pendingCount);
          badgeEl.classList.remove('hidden');
        } else {
          badgeEl.classList.add('hidden');
        }
      }

      // تطبيق الفلاتر
      const searchVal = String(document.getElementById('progTenantsSearch')?.value || '').toLowerCase().trim();
      const statusVal = document.getElementById('progTenantsStatusFilter')?.value || 'all';

      let filtered = [...tenants];
      if (statusVal !== 'all') {
        filtered = filtered.filter(t => t.status === statusVal);
      }

      if (searchVal) {
        filtered = filtered.filter(t =>
          (t.companyName || t.name || '').toLowerCase().includes(searchVal) ||
          (t.managerName || t.manager_name || '').toLowerCase().includes(searchVal) ||
          (t.email || '').toLowerCase().includes(searchVal) ||
          (t.phone || '').includes(searchVal) ||
          (t.taxNumber || t.tax_number || '').includes(searchVal)
        );
      }

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-10 text-xs text-slate-500 font-medium">
              <i class="fa-solid fa-buildings text-3xl text-slate-300 dark:text-slate-700 mb-2 block"></i>
              لا توجد شركات أو طلبات اشتراك مطابقة لمعايير البحث الحالية
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = filtered.map((t, idx) => {
        const isPending = t.status === 'pending';
        const childId = `tenant-child-${idx}-${t.id || Date.now()}`;
        const companyName = t.companyName || t.name || 'شركة غير معرّفة';
        const managerName = t.managerName || t.manager_name || 'غير محدد';
        const taxNum = t.taxNumber || t.tax_number || 'غير مسجل';
        const pinCode = t.pin ? String(t.pin).trim() : '----';
        const regDate = t.createdAt ? String(t.createdAt).split('T')[0] : '--';

        const statusBadge = isPending
          ? `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1.5 shadow-sm">
               <span class="w-1.5 h-1.5 rounded-full bg-amber-500 badge-live-pulse"></span>
               معلق (بانتظار الاعتماد)
             </span>`
          : `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-flex items-center gap-1">
               <i class="fa-solid fa-circle-check text-[10px]"></i>
               نشط ومفعل
             </span>`;

        const actionsHtml = isPending ? `
          <div class="flex items-center justify-center gap-1.5 flex-wrap">
            <button type="button" data-action="prog-approve-tenant" data-id="${escapeHTML(t.id)}" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95" title="اعتماد وتفعيل الشركة وإنشاء حساب المدير">
              <i class="fa-solid fa-check"></i>
              <span>اعتماد وتفعيل</span>
            </button>
            <button type="button" data-action="prog-reject-tenant" data-id="${escapeHTML(t.id)}" class="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 border border-rose-300 dark:border-rose-900 font-bold text-xs flex items-center gap-1 transition-all" title="رفض وحذف طلب الشركة">
              <i class="fa-solid fa-ban"></i>
              <span>رفض وحذف</span>
            </button>
          </div>
        ` : `
          <div class="flex items-center justify-center gap-1.5">
            <button type="button" data-action="prog-reject-tenant" data-id="${escapeHTML(t.id)}" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all" title="إيقاف وحذف الشركة من النظام">
              <i class="fa-solid fa-trash-can ml-1"></i>
              <span>إيقاف / حذف</span>
            </button>
          </div>
        `;

        return `
          <tr class="table-parent-row hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer md:cursor-default" data-child-id="${childId}">
            <td class="p-2.5 sm:p-3.5">
              <div class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                <i class="fa-solid fa-building text-purple-600 dark:text-purple-400 text-sm"></i>
                <span>${escapeHTML(companyName)}</span>
              </div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                الرقم الضريبي: <span class="font-bold">${escapeHTML(taxNum)}</span>
              </div>
            </td>
            <td class="p-2.5 sm:p-3.5">
              <div class="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm flex items-center gap-1">
                <i class="fa-solid fa-user-tie text-blue-600 dark:text-blue-400 text-xs"></i>
                <span>${escapeHTML(managerName)}</span>
              </div>
              <div class="text-[11px] text-slate-500 font-mono mt-0.5">
                رمز PIN: <span class="font-bold text-blue-600 dark:text-blue-400">${escapeHTML(pinCode)}</span>
              </div>
            </td>
            <td class="p-3.5 hidden md:table-cell">
              <div class="text-xs text-slate-800 dark:text-slate-200 font-mono">${escapeHTML(t.email || '--')}</div>
              <div class="text-[11px] text-slate-500 font-mono mt-0.5">${escapeHTML(t.phone || '--')}</div>
            </td>
            <td class="p-3.5 font-mono text-xs text-slate-600 dark:text-slate-400 hidden lg:table-cell">${escapeHTML(regDate)}</td>
            <td class="p-2.5 sm:p-3.5 text-center whitespace-nowrap">${statusBadge}</td>
            <td class="p-3.5 text-center hidden md:table-cell">${actionsHtml}</td>
            <td class="p-2 sm:p-2.5 text-center md:hidden">
              <button class="row-expand-btn" data-action="toggle-child-row" data-target="${childId}" title="عرض تفاصيل الشركة والإجراءات" aria-label="عرض تفاصيل الشركة">
                <i class="fa-solid fa-chevron-down text-xs"></i>
              </button>
            </td>
          </tr>
          <tr id="${childId}" class="responsive-child-row hidden bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
            <td colspan="7" class="p-2.5 sm:p-3">
              <div class="responsive-child-card p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5 text-xs">
                <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span class="text-slate-500 font-medium">البريد الإلكتروني:</span>
                  <span class="font-mono font-bold text-slate-800 dark:text-slate-200">${escapeHTML(t.email || '--')}</span>
                </div>
                <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span class="text-slate-500 font-medium">رقم الهاتف:</span>
                  <span class="font-mono font-bold text-slate-800 dark:text-slate-200">${escapeHTML(t.phone || '--')}</span>
                </div>
                <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span class="text-slate-500 font-medium">تاريخ التسجيل:</span>
                  <span class="font-mono text-slate-700 dark:text-slate-300">${escapeHTML(regDate)}</span>
                </div>
                <div class="pt-1 flex flex-col gap-2">
                  <span class="text-slate-500 font-medium">الإجراءات والتحكم:</span>
                  <div>${actionsHtml}</div>
                </div>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Error in renderProgrammerTenantsTable:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-xs text-rose-500">حدث خطأ أثناء تحميل بيانات الشركات: ${escapeHTML(err.message || err)}</td></tr>`;
      }
    }
  }

  /* --------------------------------------------------------------------------
     4. الشاشة الرابعة: إعدادات وهوية الشركة الرسمية
     -------------------------------------------------------------------------- */

  async function loadCompanySettingsForm() {
    try {
      const res = await ApiService.getCompanySettings();
      const comp = res.data || res || {};

      const nameEl = document.getElementById('progCompName');
      const nameEnEl = document.getElementById('progCompNameEn');
      const currEl = document.getElementById('progCompCurrency');
      const currCodeEl = document.getElementById('progCompCurrencyCode');
      const taxEl = document.getElementById('progCompTaxNumber');
      const crEl = document.getElementById('progCompCrNumber');
      const addrEl = document.getElementById('progCompAddress');
      const phoneEl = document.getElementById('progCompPhone');
      const emailEl = document.getElementById('progCompEmail');
      const logoEl = document.getElementById('progCompLogo');

      if (nameEl) nameEl.value = comp.companyName || 'AE (HR-SYSTEM)';
      if (nameEnEl) nameEnEl.value = comp.companyNameEn || 'AE (HR-SYSTEM)';
      if (currEl) currEl.value = comp.currency || 'ج.م';
      if (currCodeEl) currCodeEl.value = comp.currencyCode || 'EGP';
      if (taxEl) taxEl.value = comp.taxNumber || '492-710-853';
      if (crEl) crEl.value = comp.crNumber || '108492';
      if (addrEl) addrEl.value = comp.address || 'مبنى 14، القرية الذكية، طريق مصر الإسكندرية الصحراوي، الجيزة';
      if (phoneEl) phoneEl.value = comp.phone || '+20 2 3537 9000';
      if (emailEl) emailEl.value = comp.email || 'info@nilesolutions.com.eg';
      if (logoEl) logoEl.value = comp.logo || '';

      updateCompanyLogoPreview(comp.logo);
    } catch (err) {
      console.error('Failed to load company settings:', err);
    }
  }

  function updateCompanyLogoPreview(url) {
    const img = document.getElementById('progCompLogoPreviewImg');
    const fallback = document.getElementById('progCompLogoFallbackIcon');
    if (!img || !fallback) return;

    if (url && url.startsWith('http')) {
      img.src = url;
      img.classList.remove('hidden');
      fallback.classList.add('hidden');
    } else {
      img.classList.add('hidden');
      fallback.classList.remove('hidden');
    }
  }

  async function handleSaveCompanySettings(e) {
    e.preventDefault();
    sound.playClick();
    showToast('جاري حفظ وتحديث بيانات الشركة الرسمية...', 'info', 1000);

    const payload = {
      companyName: document.getElementById('progCompName')?.value.trim() || '',
      companyNameEn: document.getElementById('progCompNameEn')?.value.trim() || '',
      currency: document.getElementById('progCompCurrency')?.value.trim() || 'ج.م',
      currencyCode: document.getElementById('progCompCurrencyCode')?.value.trim() || 'EGP',
      taxNumber: document.getElementById('progCompTaxNumber')?.value.trim() || '',
      crNumber: document.getElementById('progCompCrNumber')?.value.trim() || '',
      address: document.getElementById('progCompAddress')?.value.trim() || '',
      phone: document.getElementById('progCompPhone')?.value.trim() || '',
      email: document.getElementById('progCompEmail')?.value.trim() || '',
      logo: document.getElementById('progCompLogo')?.value.trim() || ''
    };

    try {
      const res = await ApiService.updateCompanySettings(payload);
      if (res.success) {
        sound.playSuccess();
        showToast('تم حفظ وتحديث بيانات وهوية الشركة والعملة الرسمية بنجاح', 'success', 3500);

        // Update brand in headers
        if (payload.companyName) {
          document.querySelectorAll('.company-name-text').forEach(el => {
            el.textContent = payload.companyName;
          });
        }
      } else {
        sound.playError();
        showToast(res.message || 'فشل تحديث بيانات الشركة', 'error');
      }
    } catch (err) {
      sound.playError();
      showToast('حدث خطأ أثناء حفظ بيانات الشركة', 'error');
    }
  }

  /**
   * التبديل بين التبويبات الداخلية في لوحة المبرمج
   * @param {string} targetPaneId
   */
  function switchProgrammerSubTab(targetPaneId) {
    activeProgrammerSubTab = targetPaneId;

    const subPanes = document.querySelectorAll('.prog-tab-pane');
    subPanes.forEach(pane => {
      if (pane.id === targetPaneId) {
        pane.classList.remove('hidden');
      } else {
        pane.classList.add('hidden');
      }
    });

    const mapBtn = {
      progTabPaneUsers: 'progTabUsersBtn',
      progTabPanePerms: 'progTabPermsBtn',
      progTabPaneAudit: 'progTabAuditBtn',
      progTabPaneCompany: 'progTabCompanyBtn'
    };

    const tabButtons = document.querySelectorAll('.prog-sub-tab');
    tabButtons.forEach(btn => {
      if (btn.id === mapBtn[targetPaneId]) {
        btn.className = 'prog-sub-tab active flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all bg-purple-600 text-white shadow-md shadow-purple-500/20';
      } else {
        btn.className = 'prog-sub-tab flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';
      }
    });

    if (targetPaneId === 'progTabPaneUsers') renderProgrammerUsersTable();
    else if (targetPaneId === 'progTabPanePerms') renderProgrammerPermissionsMatrix();
    else if (targetPaneId === 'progTabPaneAudit') loadAndRenderAuditLogs();
    else if (targetPaneId === 'progTabPaneCompany') {
      renderProgrammerTenantsTable();
      loadCompanySettingsForm();
    }
  }

  /**
   * تشغيل وتحديث لوحة المبرمج
   */
  async function renderProgrammerPanel() {
    try {
      if (!store.state.employees || store.state.employees.length === 0) {
        await loadEmployees();
      }

      switchProgrammerSubTab(activeProgrammerSubTab || 'progTabPaneUsers');

      const db = LocalDatabase.getDB();
      cachedAuditLogs = db.audit_logs || [];
      const badgeEl = document.getElementById('progAuditTabBadge');
      if (badgeEl) badgeEl.textContent = String(cachedAuditLogs.length);
    } catch (err) {
      console.error('Programmer panel initialization error:', err);
    }
  }

  /**
   * Switch between Auth Portal, Employee Self-Service Portal, and Admin Management Portal.
   * @param {'auth'|'employee'|'admin'} portalName
   */
  function switchPortal(portalName) {
    const authPortal = document.getElementById('portal-auth');
    const empPortal = document.getElementById('portal-employee');
    const adminPortal = document.getElementById('portal-admin');

    if (portalName === 'admin') {
      const user = store.state.currentUser;
      const effectiveRole = store.state.originalRole || resolveUserRole(user);
      if (!user || (effectiveRole !== 'manager' && effectiveRole !== 'programmer')) {
        sound.playError();
        showToast('عذراً، صلاحياتك كموظف لا تخوّلك الدخول للوحة تحكم الإدارة الشاملة', 'warning');
        switchPortal('employee');
        return;
      }
    }

    store.state.currentPortal = portalName;

    if (portalName === 'auth') {
      authPortal?.classList.remove('hidden');
      empPortal?.classList.add('hidden');
      adminPortal?.classList.add('hidden');
      resetAuthPin();
      populateAuthBioSelect();
    } else if (portalName === 'employee') {
      empPortal?.classList.remove('hidden');
      authPortal?.classList.add('hidden');
      adminPortal?.classList.add('hidden');
      updateRoleBasedUI(store.state.viewMode === 'employee_preview' ? 'employee' : (store.state.originalRole || resolveUserRole(store.state.currentUser)));
      renderEmployeePortal();
    } else if (portalName === 'admin') {
      adminPortal?.classList.remove('hidden');
      authPortal?.classList.add('hidden');
      empPortal?.classList.add('hidden');
      refreshPendingApprovalsBadge();
      updateAdminNotifications();
      loadAndRenderAdminRequests();
      updateRoleBasedUI(store.state.originalRole || resolveUserRole(store.state.currentUser));
      navigateToAdminModule(store.state.activeTab || 'module-dashboard');
    }
  }

  /**
   * Check for an existing authenticated session on startup.
   */
  async function checkInitialSession() {
    try {
      // إصلاح فوري وتلقائي لجلسة المبرمج إذا كان مخزناً كـ employee سابقاً
      try {
        const rawLocal = localStorage.getItem('JISR_AUTH_SESSION');
        const rawSession = sessionStorage.getItem('JISR_AUTH_SESSION');
        const sObj = JSON.parse(rawLocal || rawSession || 'null');
        if (sObj && (sObj.email === 'aemade2016@gmail.com' || sObj.employeeId === 'EMP-0001' || sObj.employeeId === 'aa69f711-7ca3-41dc-b628-42a5dda853f6')) {
          sObj.role = 'programmer';
          sObj.normalizedRole = 'programmer';
          sObj.employeeId = 'aa69f711-7ca3-41dc-b628-42a5dda853f6';
          if (rawLocal) localStorage.setItem('JISR_AUTH_SESSION', JSON.stringify(sObj));
          if (rawSession) sessionStorage.setItem('JISR_AUTH_SESSION', JSON.stringify(sObj));
        }
      } catch (e) {}

      const res = await ApiService.getCurrentSession();
      const user = res.user || res.data?.user || res.employee || res.data?.employee;
      const session = res.session || res.data?.session;
      if (res.success && user && session) {
        // Sync with freshest employee data from local store
        let freshUser = store.state.employees.find(e => e.id === user.id || e.email === user.email) || user;
        if (freshUser.email === 'aemade2016@gmail.com' || freshUser.id === 'aa69f711-7ca3-41dc-b628-42a5dda853f6' || freshUser.employee_code === 'EMP-0001') {
          freshUser.role = 'programmer';
        }
        store.state.currentUser = freshUser;
        store.state.currentSession = session;
        const permissions = res.data?.permissions || res.permissions;
        await applyUserRoleAndNavigate(freshUser, permissions);
        return true;
      }
    } catch (err) {
      console.warn('Session verification exception:', err);
    }
    switchPortal('auth');
    return false;
  }

  /**
   * Populate biometric employee selection in Auth portal.
   */
  function populateAuthBioSelect() {
    const sel = document.getElementById('authBioEmpSelect');
    if (!sel) return;
    sel.innerHTML = '';
    const activeEmployees = store.state.employees.filter(e => e.status !== 'pending');
    activeEmployees.forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp.id;
      const isProgrammer = (emp.email === 'aemade2016@gmail.com' || emp.role === 'programmer' || emp.id === 'aa69f711-7ca3-41dc-b628-42a5dda853f6' || emp.employee_code === 'EMP-0001');
      const isManager = !isProgrammer && (emp.role === 'hr' || emp.role === 'manager' || emp.role === 'admin');
      const roleArabic = isProgrammer 
        ? 'مدير نظام / مبرمج (Programmer)' 
        : isManager 
        ? 'مدير (Manager)' 
        : 'موظف (Employee)';
      const code = getEmployeeCode(emp);
      opt.textContent = `${emp.fullName} (${code} - ${roleArabic})`;
      sel.appendChild(opt);
    });
  }

  /**
   * Render dynamic 1-Click Fast Access login buttons & PIN chips based on registered users.
   */
  function renderQuickLoginShortcuts() {
    const grid = document.getElementById('quickLoginButtonsWrapper');
    if (!grid) return;

    const employees = store.state.employees || [];
    const activeEmployees = employees.filter(e => e.status !== 'pending' && e.status !== 'suspended');

    if (activeEmployees.length === 0) {
      grid.className = 'grid grid-cols-1 gap-2.5';
      grid.innerHTML = `
        <div class="text-center text-xs text-slate-500 dark:text-slate-400 py-2.5 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl font-bold">
          <i class="fa-solid fa-user-slash ml-1 text-slate-400"></i>
          لا يوجد موظفون مسجلون حالياً
        </div>
      `;
      updateDemoPinChips([]);
      return;
    }

    // Separate users by role: Admin/Manager vs regular Employee
    const adminUser = activeEmployees.find(e => e.email === 'aemade2016@gmail.com' || e.role === 'programmer' || e.id === 'aa69f711-7ca3-41dc-b628-42a5dda853f6' || e.employee_code === 'EMP-0001')
      || activeEmployees.find(e => e.role === 'admin' || e.role === 'manager') 
      || activeEmployees[0];
    const otherUsers = activeEmployees.filter(e => e.id !== adminUser?.id && e.email !== adminUser?.email);
    const regularUser = otherUsers.find(e => e.email !== 'aemade2016@gmail.com' && (e.role === 'employee' || e.role === 'sales' || e.employee_code === 'EMP-1001')) 
      || otherUsers[0];

    const usersToShow = [];
    if (adminUser) usersToShow.push({ user: adminUser, type: 'admin' });
    if (regularUser) usersToShow.push({ user: regularUser, type: 'employee' });

    // Set responsive grid columns: 1 column if 1 user, 2 columns if 2 users
    grid.className = usersToShow.length === 1 
      ? 'grid grid-cols-1 gap-2.5' 
      : 'grid grid-cols-1 sm:grid-cols-2 gap-2.5';

    grid.innerHTML = usersToShow.map(({ user, type }) => {
      const isManager = type === 'admin';
      const roleText = (user.role === 'programmer' || user.role === 'admin') 
        ? 'كمسؤول' 
        : (user.role === 'manager' ? 'كمدير' : 'كموظف');
      const cleanName = (user.fullName || '').trim();
      const displayName = cleanName.length > 18 ? cleanName.split(' ')[0] : cleanName;
      const bgClass = isManager 
        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/20' 
        : 'bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 shadow-blue-500/20';
      const icon = isManager ? 'fa-user-shield' : 'fa-user';

      return `
        <button type="button" data-quick-user-id="${escapeHTML(user.id)}" class="py-2.5 px-3 rounded-xl ${bgClass} text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 truncate" title="دخول سريع: ${escapeHTML(user.fullName)}">
          <i class="fa-solid ${icon} text-xs shrink-0"></i>
          <span class="truncate">دخول ${roleText} (${escapeHTML(displayName)})</span>
        </button>
      `;
    }).join('');

    // Bind click events to login instantly
    grid.querySelectorAll('[data-quick-user-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.quickUserId;
        const targetEmp = activeEmployees.find(e => e.id === userId);
        if (!targetEmp) return;

        sound.playClick();
        showToast(`جاري تسجيل الدخول السريع: ${targetEmp.fullName}...`, 'info', 1500);

        const res = await ApiService.loginWithFingerprint(targetEmp.id, true);
        const user = res.user || res.data?.user || res.employee || res.data?.employee;
        if (res.success && user) {
          sound.playSuccess();
          const permissions = res.data?.permissions || res.permissions;
          showToast(`مرحباً يا ${user.fullName}! تم تسجيل الدخول بنجاح`, 'success', 3000);
          await applyUserRoleAndNavigate(user, permissions);
        } else {
          sound.playError();
          showToast(res.message || 'فشل تسجيل الدخول السريع', 'error', 3500);
        }
      });
    });

    updateDemoPinChips(usersToShow.map(u => u.user));
  }

  function updateDemoPinChips(users) {
    const container = document.getElementById('authDemoPinChips');
    if (!container) return;

    if (!users || users.length === 0) {
      container.innerHTML = '';
      return;
    }

    const chips = users.map(emp => {
      const pin = emp.pin || '123456';
      const roleTitle = (emp.role === 'programmer' || emp.role === 'admin') 
        ? 'مسؤول' 
        : (emp.role === 'manager' ? 'مدير' : 'موظف');
      const cleanName = (emp.fullName || '').trim().split(' ')[0] || emp.fullName;
      return `<button type="button" class="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-mono font-bold hover:bg-blue-200 transition-colors" data-demo-pin="${escapeHTML(pin)}" title="انقر لملء رمز PIN الخاص بـ ${escapeHTML(emp.fullName)}">${escapeHTML(pin)}</button> (${escapeHTML(roleTitle)}: ${escapeHTML(cleanName)})`;
    });

    container.innerHTML = `رموز PIN التجريبية للمسجلين: ${chips.join(' • ')}`;

    container.querySelectorAll('[data-demo-pin]').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const pin = btn.dataset.demoPin;
        if (pin) {
          store.state.authPinInput = pin;
          updateAuthPinDots();
          submitAuthPinLogin(pin);
        }
      });
    });
  }

  /**
   * Setup Creative Auth Portal (Biometric + 6-digit PIN Numpad).
   */
  function setupAuthPortal() {
    const authTabBioBtn = document.getElementById('authTabBioBtn');
    const authTabPinBtn = document.getElementById('authTabPinBtn');
    const authBioView = document.getElementById('authBioView');
    const authPinView = document.getElementById('authPinView');
    const authScannerWidget = document.getElementById('authScannerWidget');
    const authBioLoginBtn = document.getElementById('authBioLoginBtn');
    const authRememberMeCheck = document.getElementById('authRememberMeCheck');

    // Dual Tab Switching
    authTabBioBtn?.addEventListener('click', () => {
      sound.playClick();
      authTabBioBtn.classList.add('bg-white', 'dark:bg-slate-700', 'text-blue-600', 'dark:text-blue-400', 'shadow-sm');
      authTabBioBtn.classList.remove('text-slate-700', 'dark:text-slate-300');
      authTabPinBtn.classList.remove('bg-white', 'dark:bg-slate-700', 'text-blue-600', 'dark:text-blue-400', 'shadow-sm');
      authTabPinBtn.classList.add('text-slate-700', 'dark:text-slate-300');
      authBioView?.classList.remove('hidden');
      authPinView?.classList.add('hidden');
    });

    authTabPinBtn?.addEventListener('click', () => {
      sound.playClick();
      authTabPinBtn.classList.add('bg-white', 'dark:bg-slate-700', 'text-blue-600', 'dark:text-blue-400', 'shadow-sm');
      authTabPinBtn.classList.remove('text-slate-700', 'dark:text-slate-300');
      authTabBioBtn.classList.remove('bg-white', 'dark:bg-slate-700', 'text-blue-600', 'dark:text-blue-400', 'shadow-sm');
      authTabBioBtn.classList.add('text-slate-700', 'dark:text-slate-300');
      authPinView?.classList.remove('hidden');
      authBioView?.classList.add('hidden');
      resetAuthPin();
    });

    /**
     * استدعاء واجهة بصمة الجهاز الأصلية (Android BiometricPrompt / iOS FaceID/TouchID / Windows Hello)
     * تفعيل مستشعر البصمة المدمج بالهاتف مباشرة ومنع ظهور رسالة "No passkeys available"
     */
    const requestDeviceBiometricVerification = async (empId, empName) => {
      if (!window.PublicKeyCredential || !navigator.credentials) {
        throw new Error('NOT_SUPPORTED');
      }

      let isBioSupported = false;
      if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
        try {
          isBioSupported = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        } catch (e) {
          isBioSupported = false;
        }
      }

      if (!isBioSupported) {
        throw new Error('NO_PLATFORM_AUTHENTICATOR');
      }

      const challenge = new Uint8Array(32);
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(challenge);
      }

      const storageKey = 'AE_DEVICE_PASSKEY_' + (empId || 'default');
      const savedKey = localStorage.getItem(storageKey);

      // 1. إذا كان الموظف قد سجّل بصمة على هذا الجهاز مسبقاً، نطلب التحقق منها
      if (savedKey) {
        try {
          const credIdBytes = Uint8Array.from(atob(savedKey), c => c.charCodeAt(0));
          const getOptions = {
            publicKey: {
              challenge: challenge,
              timeout: 60000,
              userVerification: 'required',
              allowCredentials: [{
                id: credIdBytes,
                type: 'public-key',
                transports: ['internal']
              }]
            }
          };

          const assertion = await navigator.credentials.get(getOptions);
          if (assertion) {
            return { success: true, credential: assertion };
          }
        } catch (getErr) {
          console.warn('[Device Biometrics] get() failed or key cleared, falling back to create():', getErr);
        }
      }

      // 2. تفعيل مستشعر بصمة الهاتف الأصلي (BiometricPrompt) مباشرة عبر create() مع platform authenticator
      // هذا الاستدعاء يُجبر الهاتف على فتح شاشة مسح البصمة مباشرة دون البحث عن أجهزة أخرى
      const cleanId = String(empId || 'emp_user').replace(/[^\w-]/g, '_');
      const cleanName = (empName || 'موظف').toString().replace(/[^\w\s-]/g, '').trim() || cleanId;

      const createOptions = {
        publicKey: {
          challenge: challenge,
          rp: {
            name: "AE (HR-SYSTEM)"
          },
          user: {
            id: new TextEncoder().encode(cleanId),
            name: cleanId + '@ae-hr.local',
            displayName: cleanName
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },   // ES256 (Android, iOS)
            { type: "public-key", alg: -257 }  // RS256 (Windows Hello)
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform", // بصمة الجهاز المدمجة (يمنع No passkeys / Use different device)
            userVerification: "required",        // إلزام البصمة أو قفل الشاشة
            residentKey: "preferred"
          },
          timeout: 60000,
          attestation: "none"
        }
      };

      const newCredential = await navigator.credentials.create(createOptions);
      if (newCredential && newCredential.rawId) {
        const base64Id = btoa(String.fromCharCode(...new Uint8Array(newCredential.rawId)));
        localStorage.setItem(storageKey, base64Id);
        return { success: true, credential: newCredential };
      }

      throw new Error('BIOMETRICS_FAILED');
    };

    // Biometric Login via WebAuthn API (Local Device Biometrics) with Graceful PIN Fallback
    const executeBioLogin = async () => {
      const sel = document.getElementById('authBioEmpSelect');
      const empId = sel?.value;
      if (!empId) {
        showToast('يرجى اختيار موظف للتحقق من البصمة', 'warning');
        return;
      }
      const empName = sel?.options[sel.selectedIndex]?.text || '';

      authScannerWidget?.classList.add('scanning');
      sound.playClick();

      try {
        await requestDeviceBiometricVerification(empId, empName);
        authScannerWidget?.classList.remove('scanning');

        // في حال نجاح بصمة الجهاز (Success):
        const rememberMe = authRememberMeCheck ? authRememberMeCheck.checked : true;
        const res = await ApiService.loginWithFingerprint(empId, rememberMe);
        const user = res.user || res.data?.user || res.employee || res.data?.employee;
        if (res.success && user) {
          sound.playSuccess();
          const permissions = res.data?.permissions || res.permissions;
          showToast(`تم التحقق من بصمة الجهاز بنجاح! مرحباً بك يا ${user.fullName}`, 'success', 3000);
          await applyUserRoleAndNavigate(user, permissions);
        } else {
          sound.playError();
          showToast(res.message || res.error || 'فشل تسجيل الدخول', 'error', 3500);
        }
      } catch (bioErr) {
        authScannerWidget?.classList.remove('scanning');
        console.warn('[WebAuthn Biometrics Fallback]:', bioErr);
        sound.playAlert();

        if (bioErr && (bioErr.name === 'NotAllowedError' || bioErr.name === 'AbortError')) {
          showToast('تم إلغاء طلب بصمة الجهاز. يمكنك المحاولة مجدداً أو إدخال رمز PIN', 'warning', 4000);
        } else if (bioErr && bioErr.message === 'NO_PLATFORM_AUTHENTICATOR') {
          authTabPinBtn?.click();
          showToast('هذا الجهاز لا يدعم البصمة المدمجة، يرجى إدخال رمز الـ PIN', 'warning', 4000);
        } else {
          authTabPinBtn?.click();
          showToast('تعذر التحقق من بصمة الجهاز، يرجى إدخال رمز الـ PIN', 'warning', 4000);
        }
      }
    };

    authScannerWidget?.addEventListener('click', executeBioLogin);
    authBioLoginBtn?.addEventListener('click', executeBioLogin);

    // Dynamic 1-Click Fast Access Buttons & PIN Chips
    renderQuickLoginShortcuts();

    // 6-Digit PIN Numpad Handlers
    const authNumpadBtns = document.querySelectorAll('.auth-numpad-btn[data-num]');
    const authPinClearBtn = document.getElementById('authPinClearBtn');
    const authPinBackspaceBtn = document.getElementById('authPinBackspaceBtn');

    authNumpadBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const num = btn.dataset.num;
        if (store.state.authPinInput.length < 6) {
          store.state.authPinInput += num;
          updateAuthPinDots();
          if (store.state.authPinInput.length === 6) {
            submitAuthPinLogin();
          }
        }
      });
    });

    authPinClearBtn?.addEventListener('click', () => {
      sound.playClick();
      resetAuthPin();
    });

    authPinBackspaceBtn?.addEventListener('click', () => {
      sound.playClick();
      if (store.state.authPinInput.length > 0) {
        store.state.authPinInput = store.state.authPinInput.slice(0, -1);
        updateAuthPinDots();
      }
    });

    // Submit Button for PIN
    const authPinSubmitBtn = document.getElementById('authPinSubmitBtn');
    authPinSubmitBtn?.addEventListener('click', () => {
      sound.playClick();
      submitAuthPinLogin();
    });

    // Keyboard support for Auth PIN
    window.addEventListener('keydown', (e) => {
      if (store.state.currentPortal !== 'auth') return;
      if (authPinView?.classList.contains('hidden')) return;

      if (/^[0-9]$/.test(e.key)) {
        sound.playClick();
        if (store.state.authPinInput.length < 6) {
          store.state.authPinInput += e.key;
          updateAuthPinDots();
          if (store.state.authPinInput.length === 6) {
            submitAuthPinLogin();
          }
        }
      } else if (e.key === 'Backspace') {
        sound.playClick();
        if (store.state.authPinInput.length > 0) {
          store.state.authPinInput = store.state.authPinInput.slice(0, -1);
          updateAuthPinDots();
        }
      } else if (e.key === 'Enter') {
        sound.playClick();
        submitAuthPinLogin();
      } else if (e.key === 'Escape') {
        resetAuthPin();
      }
    });
  }

  function updateAuthPinDots() {
    const dots = document.querySelectorAll('#authPinDots .pin-dot');
    dots.forEach((dot, idx) => {
      if (idx < store.state.authPinInput.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  }

  function resetAuthPin() {
    store.state.authPinInput = '';
    updateAuthPinDots();
  }

  async function submitAuthPinLogin(directPin = null) {
    const pin = directPin || store.state.authPinInput;
    if (!pin || pin.length < 4 || pin.length > 6) {
      showToast('يرجى إدخال رمز PIN المكون من 4 إلى 6 أرقام', 'warning');
      return;
    }
    const authRememberMeCheck = document.getElementById('authRememberMeCheck');
    const rememberMe = authRememberMeCheck ? authRememberMeCheck.checked : true;
    const res = await ApiService.loginWithPin(pin, rememberMe);
    const user = res.user || res.data?.user || res.employee || res.data?.employee;
    const session = res.session || res.data?.session;

    if (res.success && user) {
      sound.playSuccess();
      resetAuthPin();
      const permissions = res.data?.permissions || res.permissions;
      showToast(`تم تسجيل الدخول بنجاح! مرحباً ${user.fullName}`, 'success', 3000);
      await applyUserRoleAndNavigate(user, permissions);
    } else {
      sound.playError();
      const dotsContainer = document.getElementById('authPinDots');
      dotsContainer?.classList.add('shake');
      showToast(res.message || res.error || 'رمز PIN غير صحيح', 'error', 3500);
      setTimeout(() => {
        dotsContainer?.classList.remove('shake');
        resetAuthPin();
      }, 500);
    }
  }

  /**
   * Setup New Employee Onboarding 2-step Wizard Modal.
   */
  function setupOnboardingWizard() {
    const modal = document.getElementById('onboardingModal');
    const openBtn = document.getElementById('openOnboardingBtn');
    const closeBtn = document.getElementById('closeOnboardingModalBtn');
    const step1 = document.getElementById('wizardStep1');
    const step2 = document.getElementById('wizardStep2');
    const ind1 = document.getElementById('wizardStepIndicator1');
    const ind2 = document.getElementById('wizardStepIndicator2');
    const nextBtn = document.getElementById('onboardNextBtn');
    const prevBtn = document.getElementById('onboardPrevBtn');
    const form = document.getElementById('onboardingForm');
    const idInput = document.getElementById('onboardEmpId');
    const bioWidget = document.getElementById('onboardFingerprintWidget');

    const goToStep1 = () => {
      step1?.classList.remove('hidden');
      step2?.classList.add('hidden');
      ind1?.classList.add('active', 'bg-blue-600', 'text-white');
      ind1?.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-500');
      ind2?.classList.remove('active', 'bg-blue-600', 'text-white');
      ind2?.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-500');
    };

    const goToStep2 = () => {
      step1?.classList.add('hidden');
      step2?.classList.remove('hidden');
      ind2?.classList.add('active', 'bg-blue-600', 'text-white');
      ind2?.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-500');
      ind1?.classList.remove('active', 'bg-blue-600', 'text-white');
      ind1?.classList.add('bg-emerald-600', 'text-white');
    };

    openBtn?.addEventListener('click', async () => {
      sound.playClick();
      form?.reset();
      const nextId = await ApiService.getNextEmployeeId();
      if (idInput) idInput.value = nextId;
      goToStep1();
      modal?.classList.remove('hidden');
    });

    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

    nextBtn?.addEventListener('click', () => {
      sound.playClick();
      const first = document.getElementById('onboardFirstName')?.value.trim();
      const second = document.getElementById('onboardSecondName')?.value.trim();
      const last = document.getElementById('onboardLastName')?.value.trim();
      const email = document.getElementById('onboardEmail')?.value.trim();
      const phone = document.getElementById('onboardPhone')?.value.trim();

      if (!first || !second || !last) {
        showToast('يرجى كتابة الاسم الثلاثي بالكامل', 'warning');
        return;
      }
      if (!email || !email.includes('@')) {
        showToast('يرجى إدخال بريد إلكتروني صالح (Gmail)', 'warning');
        return;
      }
      if (!phone) {
        showToast('يرجى إدخال رقم هاتف صالح', 'warning');
        return;
      }
      goToStep2();
    });

    prevBtn?.addEventListener('click', () => {
      sound.playClick();
      goToStep1();
    });

    bioWidget?.addEventListener('click', () => {
      sound.playClick();
      bioWidget.classList.add('scanning');
      setTimeout(() => {
        bioWidget.classList.remove('scanning');
        sound.playSuccess();
        const statusEl = document.getElementById('onboardBioStatus');
        if (statusEl) {
          statusEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> تم تسجيل وتأكيد البصمة الحيوية بنجاح!';
          statusEl.className = 'text-xs font-black text-emerald-600 dark:text-emerald-400';
        }
      }, 500);
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = document.getElementById('onboardPin')?.value.trim();
      const pinConfirm = document.getElementById('onboardPinConfirm')?.value.trim();

      if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        showToast('رمز PIN يجب أن يتكون من 6 أرقام تماماً', 'warning');
        return;
      }
      if (pin !== pinConfirm) {
        showToast('رمزا PIN غير متطابقين، يرجى إعادة إدخالهما للتأكيد', 'error');
        return;
      }

      const payload = {
        firstName: document.getElementById('onboardFirstName')?.value.trim(),
        secondName: document.getElementById('onboardSecondName')?.value.trim(),
        lastName: document.getElementById('onboardLastName')?.value.trim(),
        email: document.getElementById('onboardEmail')?.value.trim(),
        phone: document.getElementById('onboardPhone')?.value.trim(),
        department: document.getElementById('onboardDept')?.value,
        pin: pin,
        fingerprintHash: 'BIO_' + Math.random().toString(36).substring(2, 8).toUpperCase()
      };

      const res = await ApiService.registerNewEmployee(payload);
      if (res.success) {
        sound.playSuccess();
        modal?.classList.add('hidden');
        showToast(`تم استلام طلب تسجيلك بنجاح! كودك الوظيفي هو (${res.employee.id}). طلبك الآن في انتظار موافقة الإدارة (Pending).`, 'success', 6000);
        await loadEmployees();
        populateAuthBioSelect();
        refreshPendingApprovalsBadge();
      } else {
        sound.playError();
        showToast(res.message, 'error', 4000);
      }
    });
  }

  /**
   * Setup Employee Self-Service Portal Handlers (GPS Punch, Sales Modal, Payslip, Role Switch).
   */
  function setupEmployeePortal() {
    // Switch to Admin Dashboard Button
    const switchToAdminBtn = document.getElementById('switchToAdminBtn');
    switchToAdminBtn?.addEventListener('click', () => {
      sound.playClick();
      const currentRole = store.state.originalRole || resolveUserRole(store.state.currentUser);
      if (currentRole === 'employee') {
        showToast('غير مصرح لك بالدخول إلى لوحة تحكم الإدارة', 'warning');
        return;
      }
      returnToOriginalAdminView();
    });

    // Employee Portal Logout Button
    const empLogoutBtn = document.getElementById('empLogoutBtn');
    empLogoutBtn?.addEventListener('click', async () => {
      sound.playClick();
      await ApiService.logout();
      store.state.currentUser = null;
      store.state.currentSession = null;
      store.state.viewMode = 'default';
      const banner = document.getElementById('switchViewPreviewBanner');
      if (banner) banner.remove();
      showToast('تم تسجيل الخروج بنجاح', 'info');
      switchPortal('auth');
    });

    // Admin Portal Switch back to Employee Portal (Switch View)
    const switchToEmployeeBtn = document.getElementById('switchToEmployeeBtn');
    switchToEmployeeBtn?.addEventListener('click', () => {
      switchViewToEmployeePreview();
    });

    // Admin Logout Button
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    adminLogoutBtn?.addEventListener('click', async () => {
      sound.playClick();
      await ApiService.logout();
      store.state.currentUser = null;
      store.state.currentSession = null;
      showToast('تم تسجيل الخروج من النظام', 'info');
      switchPortal('auth');
    });

    // GPS Punch Station Button
    const empGpsPunchBtn = document.getElementById('empGpsPunchBtn');
    empGpsPunchBtn?.addEventListener('click', async () => {
      const user = store.state.currentUser;
      if (!user) return;

      const todayRec = store.state.attendance.find(a => a.employeeId === user.id && a.date === store.state.currentDate);
      if (todayRec && todayRec.checkIn && todayRec.checkOut) {
        sound.playClick();
        showToast('تم تسجيل الحضور والانصراف لهذا اليوم بالكامل. شكراً لالتزامك.', 'info', 3500);
        return;
      }

      empGpsPunchBtn.classList.add('scale-95');
      setTimeout(() => empGpsPunchBtn.classList.remove('scale-95'), 200);

      const performGpsPunch = async (coords) => {
        sound.playClick();
        const punchDate = store.state.currentDate || new Date().toISOString().split('T')[0];
        const res = await ApiService.punchAttendance({
          employeeId: user.id,
          location_coords: coords,
          date: punchDate
        });

        if (res.success) {
          sound.playSuccess();
          showToast(res.message, 'success', 3500);

          // Update UI coordinates directly
          const coordsText = document.getElementById('empGpsCoordsText');
          const locLabel = document.getElementById('empGpsLocationLabel');
          const precText = document.getElementById('empGpsPrecisionText');
          if (coordsText) coordsText.textContent = `${coords.lat.toFixed(6)}° N, ${coords.lng.toFixed(6)}° E`;
          if (locLabel) locLabel.textContent = coords.label || 'المقر المعتمد - موقع موثق بالـ GPS';
          if (precText) precText.textContent = `دقة التحديد: ±${coords.accuracy || 5} متر`;

          // Refresh logs and self-service view
          await loadAttendanceLogs();
          if (res.data) {
            const att = store.state.attendance || [];
            const idx = att.findIndex(a => a.employeeId === res.data.employeeId && a.date === res.data.date);
            if (idx !== -1) {
              att[idx] = res.data;
            } else {
              att.push(res.data);
            }
            store.state.attendance = [...att];
          }
          renderEmployeePortal();
          renderRecentKioskFeed();
        } else {
          sound.playError();
          showToast(res.message, 'error', 3500);
        }
      };

      if (navigator.geolocation) {
        showToast('جاري التحقق من إحداثيات الموقع عبر الأقمار الصناعية (GPS)...', 'info', 2000);
        navigator.geolocation.getCurrentPosition(
          pos => {
            const coords = {
              lat: Number(pos.coords.latitude.toFixed(6)),
              lng: Number(pos.coords.longitude.toFixed(6)),
              label: 'موقع جغرافي مباشر وموثق (GPS Live)',
              accuracy: Math.round(pos.coords.accuracy || 6)
            };
            performGpsPunch(coords);
          },
          err => {
            console.warn('Geolocation warning (using authorized default HQ):', err);
            const hqLat = Number(store.state.settings?.company_lat || 30.044420);
            const hqLng = Number(store.state.settings?.company_lng || 31.235810);
            const fallbackCoords = {
              lat: hqLat,
              lng: hqLng,
              label: store.state.settings?.companyAddress || 'المقر الرئيسي المعتمد - التجمع الخامس، القاهرة',
              accuracy: 7
            };
            performGpsPunch(fallbackCoords);
          },
          { enableHighAccuracy: true, timeout: 6000 }
        );
      } else {
        const hqLat = Number(store.state.settings?.company_lat || 30.044420);
        const hqLng = Number(store.state.settings?.company_lng || 31.235810);
        const fallbackCoords = {
          lat: hqLat,
          lng: hqLng,
          label: store.state.settings?.companyAddress || 'المقر الرئيسي المعتمد - القاهرة',
          accuracy: 8
        };
        performGpsPunch(fallbackCoords);
      }
    });

    // Official Payslip Action in Employee Portal
    const empViewPayslipBtn = document.getElementById('empViewPayslipBtn');
    empViewPayslipBtn?.addEventListener('click', async () => {
      sound.playClick();
      const user = store.state.currentUser;
      if (!user) return;

      const res = await ApiService.calculateMonthlyPayroll(store.state.currentMonth);
      if (res.success && res.payrollReport) {
        const slip = res.payrollReport.find(r => r.employee.id === user.id);
        if (slip) {
          openPayslipModal(slip);
          return;
        }
      }
      showToast('لا تتوفر قسيمة راتب معتمدة لهذا الشهر حالياً', 'warning');
    });

    // Target & Commission Modal Handlers
    const openSalesBtn = document.getElementById('openUpdateSalesBtn');
    const salesModal = document.getElementById('empSalesModal');
    const closeSalesBtn = document.getElementById('closeEmpSalesModalBtn');
    const cancelSalesBtn = document.getElementById('cancelEmpSalesModalBtn');
    const salesForm = document.getElementById('empSalesForm');
    const salesTargetInput = document.getElementById('salesModalTarget');
    const salesAchievedInput = document.getElementById('salesModalAchieved');
    const salesRateInput = document.getElementById('salesModalRate');
    const salesPreviewEl = document.getElementById('salesModalPreviewEarned');

    const updateSalesLivePreview = () => {
      const achieved = Number(salesAchievedInput?.value || 0);
      const rate = Number(salesRateInput?.value || 0);
      const earned = (achieved * rate) / 100;
      if (salesPreviewEl) salesPreviewEl.textContent = formatCurrency(earned);
    };

    openSalesBtn?.addEventListener('click', () => {
      sound.playClick();
      const user = store.state.currentUser;
      if (!user) return;

      if (salesTargetInput) salesTargetInput.value = user.salesTarget || 0;
      if (salesAchievedInput) salesAchievedInput.value = user.salesAchieved || 0;
      if (salesRateInput) salesRateInput.value = user.commissionRate || 0;
      updateSalesLivePreview();
      salesModal?.classList.remove('hidden');
    });

    closeSalesBtn?.addEventListener('click', () => salesModal?.classList.add('hidden'));
    cancelSalesBtn?.addEventListener('click', () => salesModal?.classList.add('hidden'));

    salesAchievedInput?.addEventListener('input', updateSalesLivePreview);
    salesRateInput?.addEventListener('input', updateSalesLivePreview);

    salesForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = store.state.currentUser;
      if (!user) return;

      const target = Number(salesTargetInput?.value || 0);
      const achieved = Number(salesAchievedInput?.value || 0);
      const rate = Number(salesRateInput?.value || 0);

      const res = await ApiService.updateEmployeeSales(user.id, {
        salesTarget: target,
        salesAchieved: achieved,
        commissionRate: rate
      });

      if (res.success) {
        sound.playSuccess();
        store.state.currentUser = res.employee;
        await loadEmployees();
        renderEmployeePortal();
        salesModal?.classList.add('hidden');
        showToast('تم تحديث أرقام المبيعات والعمولة بنجاح، وأُضيفت للراتب المستحق', 'success');
      } else {
        sound.playError();
        showToast(res.message, 'error');
      }
    });
  }

  /**
   * Render Employee Self-Service Dashboard data.
   */
  function renderEmployeePortal() {
    const user = store.state.currentUser;
    if (!user) return;

    // Refresh user object from latest store data
    const emp = store.state.employees.find(e => e.id === user.id) || user;
    store.state.currentUser = emp;

    // 1. Hero & Profile Info
    const welcomeEl = document.getElementById('empWelcomeName');
    const idBadgeEl = document.getElementById('empIdBadge');
    const jobDeptEl = document.getElementById('empJobAndDept');
    const avatarImg = document.getElementById('empAvatarImg');
    const roleBadgeEl = document.getElementById('empUserRoleBadge');
    const roleSwitchContainer = document.getElementById('empRoleSwitchContainer');

    if (welcomeEl) welcomeEl.textContent = `أهلاً بك، ${emp.fullName}`;
    if (idBadgeEl) idBadgeEl.textContent = emp.id;
    if (jobDeptEl) jobDeptEl.textContent = `${emp.jobTitle || 'موظف'} • ${emp.department || 'عام'}`;
    if (avatarImg) avatarImg.src = emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

    const isPreview = store.state.viewMode === 'employee_preview';
    const currentRole = store.state.originalRole || resolveUserRole(emp);

    if (roleBadgeEl) {
      if (isPreview) {
        roleBadgeEl.textContent = 'معاينة: موظف عادي';
        roleBadgeEl.className = 'px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
      } else if (currentRole === 'programmer') {
        roleBadgeEl.textContent = 'مبرمج (Programmer)';
        roleBadgeEl.className = 'px-2 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800';
      } else if (currentRole === 'manager') {
        roleBadgeEl.textContent = 'مدير (Manager)';
        roleBadgeEl.className = 'px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800';
      } else {
        roleBadgeEl.textContent = 'موظف (Employee)';
        roleBadgeEl.className = 'px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700';
      }
    }

    // Role Switching Button: only visible if user is manager or programmer AND not in preview mode
    if (roleSwitchContainer) {
      if (!isPreview && (currentRole === 'manager' || currentRole === 'programmer')) {
        roleSwitchContainer.classList.remove('hidden');
      } else {
        roleSwitchContainer.classList.add('hidden');
      }
    }

    // زر تحديث المبيعات: مخفي للموظف العادي وفي وضع المعاينة
    const openSalesBtn = document.getElementById('openUpdateSalesBtn');
    if (openSalesBtn) {
      if (isPreview || currentRole === 'employee') {
        openSalesBtn.classList.add('hidden');
      } else {
        openSalesBtn.classList.remove('hidden');
      }
    }

    // 2. Salary Status Badge
    const salaryStatusCard = document.getElementById('empSalaryStatusCard');
    const salaryStatusDot = document.getElementById('empSalaryStatusDot');
    const salaryStatusText = document.getElementById('empSalaryStatusText');
    const statusVal = emp.salaryStatus || 'paid';

    if (salaryStatusText && salaryStatusDot) {
      if (statusVal === 'paid') {
        salaryStatusText.textContent = 'تم الدفع والصرف بنجاح';
        salaryStatusText.className = 'text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400';
        salaryStatusDot.className = 'w-3 h-3 rounded-full bg-emerald-500 badge-live-pulse';
      } else if (statusVal === 'transferring') {
        salaryStatusText.textContent = 'جاري التحويل البنكي للمرتب';
        salaryStatusText.className = 'text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400';
        salaryStatusDot.className = 'w-3 h-3 rounded-full bg-blue-500 badge-live-pulse';
      } else if (statusVal === 'collecting') {
        salaryStatusText.textContent = 'جاري التحصيل والاعتماد المالي';
        salaryStatusText.className = 'text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400';
        salaryStatusDot.className = 'w-3 h-3 rounded-full bg-amber-500 badge-live-pulse';
      } else {
        salaryStatusText.textContent = 'موقوف للمراجعة الإدارية والمالية';
        salaryStatusText.className = 'text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400';
        salaryStatusDot.className = 'w-3 h-3 rounded-full bg-rose-500';
      }
    }

    // 3. Today's Attendance & GPS Station
    const todayDate = store.state.currentDate;
    const todayDateEl = document.getElementById('empTodayDateText');
    if (todayDateEl) todayDateEl.textContent = todayDate;

    const todayRec = store.state.attendance.find(a => a.employeeId === emp.id && a.date === todayDate);

    const punchBtn = document.getElementById('empGpsPunchBtn');
    const btnActionText = document.getElementById('empGpsBtnActionText');
    const btnSubText = document.getElementById('empGpsBtnSubText');
    const btnIcon = document.getElementById('empGpsBtnIcon');
    const gpsInstruction = document.getElementById('empGpsInstruction');

    const checkInEl = document.getElementById('empTodayCheckIn');
    const checkInBadge = document.getElementById('empTodayCheckInBadge');
    const checkOutEl = document.getElementById('empTodayCheckOut');
    const checkOutBadge = document.getElementById('empTodayCheckOutBadge');
    const shiftTimingEl = document.getElementById('empShiftTiming');
    const actualHoursEl = document.getElementById('empTodayActualHours');
    const lateMinsEl = document.getElementById('empTodayLateMins');
    const otEl = document.getElementById('empTodayOvertime');

    if (shiftTimingEl) shiftTimingEl.textContent = `${emp.shiftStart || '08:00'} إلى ${emp.shiftEnd || '16:00'} (8 ساعات عمل)`;

    if (!todayRec || !todayRec.checkIn) {
      if (punchBtn) punchBtn.className = 'gps-btn-inner state-in group';
      if (btnActionText) btnActionText.textContent = 'تسجيل حضور';
      if (btnSubText) btnSubText.textContent = 'بالـ GPS';
      if (btnIcon) btnIcon.className = 'fa-solid fa-fingerprint text-4xl mb-1 transition-transform group-hover:scale-110';
      if (gpsInstruction) gpsInstruction.textContent = 'اضغط على الزر لتسجيل الحضور وتوثيق إحداثيات موقعك الجغرافي فورياً';

      if (checkInEl) checkInEl.textContent = 'لم يسجل بعد';
      if (checkInBadge) checkInBadge.textContent = 'في انتظار البصمة';
      if (checkOutEl) checkOutEl.textContent = '--';
      if (checkOutBadge) checkOutBadge.textContent = '--';
      if (actualHoursEl) actualHoursEl.textContent = '0.00 ساعة';
      if (lateMinsEl) lateMinsEl.textContent = '0 دقيقة';
      if (otEl) otEl.textContent = '0.00 ساعة';
    } else if (todayRec.checkIn && !todayRec.checkOut) {
      if (punchBtn) punchBtn.className = 'gps-btn-inner state-out group';
      if (btnActionText) btnActionText.textContent = 'تسجيل انصراف';
      if (btnSubText) btnSubText.textContent = 'بالـ GPS';
      if (btnIcon) btnIcon.className = 'fa-solid fa-right-from-bracket text-4xl mb-1 transition-transform group-hover:scale-110';
      if (gpsInstruction) gpsInstruction.textContent = 'اضغط لتسجيل الانصراف وتوثيق ساعات العمل المنقضية وموقعك بدقة';

      if (checkInEl) checkInEl.textContent = todayRec.checkIn;
      if (checkInBadge) {
        checkInBadge.textContent = todayRec.lateMinutes > 0 ? `تأخير ${todayRec.lateMinutes} دقيقة` : 'في الموعد المحدد';
        checkInBadge.className = todayRec.lateMinutes > 0 ? 'text-[10px] text-amber-600 font-bold block mt-0.5' : 'text-[10px] text-emerald-600 font-bold block mt-0.5';
      }
      if (checkOutEl) checkOutEl.textContent = 'قيد العمل';
      if (checkOutBadge) checkOutBadge.textContent = 'الدوام جاري حالياً';
      if (actualHoursEl) actualHoursEl.textContent = `${todayRec.actualHours || 0} ساعة`;
      if (lateMinsEl) lateMinsEl.textContent = `${todayRec.lateMinutes || 0} دقيقة`;
      if (otEl) otEl.textContent = `${todayRec.overtimeHours || 0} ساعة`;
    } else {
      if (punchBtn) punchBtn.className = 'gps-btn-inner state-done group';
      if (btnActionText) btnActionText.textContent = 'اكتمل الدوام';
      if (btnSubText) btnSubText.textContent = 'تم تسجيل اليوم';
      if (btnIcon) btnIcon.className = 'fa-solid fa-circle-check text-4xl mb-1 transition-transform group-hover:scale-110';
      if (gpsInstruction) gpsInstruction.textContent = 'تم تسجيل الحضور والانصراف لهذا اليوم بنجاح، شكراً لالتزامك المهني';

      if (checkInEl) checkInEl.textContent = todayRec.checkIn;
      if (checkInBadge) checkInBadge.textContent = todayRec.lateMinutes > 0 ? `تأخير ${todayRec.lateMinutes} دقيقة` : 'في الموعد المحدد';
      if (checkOutEl) checkOutEl.textContent = todayRec.checkOut;
      if (checkOutBadge) checkOutBadge.textContent = 'انصراف موثق';
      if (actualHoursEl) actualHoursEl.textContent = `${todayRec.actualHours || 0} ساعة`;
      if (lateMinsEl) lateMinsEl.textContent = `${todayRec.lateMinutes || 0} دقيقة`;
      if (otEl) otEl.textContent = `${todayRec.overtimeHours || 0} ساعة`;
    }

    // GPS Coordinates Display
    const coordsText = document.getElementById('empGpsCoordsText');
    const locLabel = document.getElementById('empGpsLocationLabel');
    const precText = document.getElementById('empGpsPrecisionText');
    if (todayRec?.location_coords) {
      if (coordsText) coordsText.textContent = `${todayRec.location_coords.lat.toFixed(6)}° N, ${todayRec.location_coords.lng.toFixed(6)}° E`;
      if (locLabel) locLabel.textContent = todayRec.location_coords.label || 'المقر المعتمد - موقع موثق';
      if (precText) precText.textContent = `دقة التحديد: ±${todayRec.location_coords.accuracy || 6} متر`;
    }

    // 4. Monthly Personal Stats Calculation (October 2026)
    const empLogs = store.state.attendance.filter(a => a.employeeId === emp.id && a.date.startsWith('2026-10'));
    let totalActualHours = 0;
    let totalLateMins = 0;
    let totalEarlyMins = 0;
    let totalOtHours = 0;
    let presentCount = 0;
    let absentCount = 0;

    empLogs.forEach(log => {
      totalActualHours += Number(log.actualHours || 0);
      totalLateMins += Number(log.lateMinutes || 0);
      totalEarlyMins += Number(log.earlyLeaveMinutes || 0);
      totalOtHours += Number(log.overtimeHours || 0);
      if (log.status === 'present' || log.status === 'late') {
        presentCount++;
      } else if (log.status === 'absent') {
        absentCount++;
      }
    });

    const allowances = (emp.housingAllowance || 0) + (emp.transportAllowance || 0) + (emp.otherAllowances || 0);
    const hourlyRate = (emp.baseSalary / 30) / 8;
    const otPay = totalOtHours * hourlyRate * 1.5;

    // Leaves
    const empLeaves = store.state.leaves.filter(l => l.employeeId === emp.id && l.status === 'approved');
    const consumedLeaves = empLeaves.reduce((acc, l) => acc + (l.daysCount || 0), 0);
    const totalLeaveBalance = emp.leaveBalance ?? 21;
    const remainingLeaves = Math.max(0, totalLeaveBalance - consumedLeaves);

    // Helper for safe element text updates
    const setElText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    // Populate Cards defensively
    setElText('empStatBaseSalary', formatCurrency(emp.baseSalary));
    setElText('empStatTotalAllowances', `+ ${formatCurrency(allowances)} بدلات`);
    setElText('empStatActualHours', `${totalActualHours.toFixed(1)} س`);
    setElText('empStatLateMinutes', `${totalLateMins} د`);
    setElText('empStatEarlyMinutes', `${totalEarlyMins} د انصراف مبكر`);
    setElText('empStatOvertimeHours', `${totalOtHours.toFixed(1)} س`);
    setElText('empStatOvertimePay', `بقيمة ${formatCurrency(otPay)}`);
    setElText('empStatPresentDays', String(presentCount));
    setElText('empStatAbsentDays', `${absentCount} أيام غياب`);
    setElText('empStatRemainingLeaves', `${remainingLeaves} يوم`);
    setElText('empStatLeavesBreakdown', `استهلك ${consumedLeaves} من ${totalLeaveBalance} يوم`);

    // 5. Target & Commission Module
    const target = emp.salesTarget || 0;
    const achieved = emp.salesAchieved || 0;
    const rate = emp.commissionRate || 0;
    const earned = (achieved * rate) / 100;
    const percent = target > 0 ? Math.round((achieved / target) * 100) : 0;

    setElText('empTargetAmount', formatCurrency(target));
    setElText('empAchievedAmount', formatCurrency(achieved));
    setElText('empCommissionPercent', `${rate}%`);
    setElText('empCommissionEarned', formatCurrency(earned));
    setElText('empTargetPercentText', `${percent}%`);
    const progressBar = document.getElementById('empTargetProgressBar');
    if (progressBar) progressBar.style.width = `${Math.min(100, percent)}%`;

    // 6. History Reports Archive Table
    const historyTbody = document.getElementById('empHistoryTableBody');
    if (historyTbody) {
      const allEmpLogs = store.state.attendance
        .filter(a => a.employeeId === emp.id)
        .sort((a, b) => b.date.localeCompare(a.date));

      if (allEmpLogs.length === 0) {
        historyTbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-xs text-slate-500 font-medium">لا توجد حركات حضور سابقة مسجلة</td></tr>`;
      } else {
        historyTbody.innerHTML = allEmpLogs.map(rec => {
          let statusBadge = '';
          if (rec.status === 'present') {
            statusBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">حاضر</span>';
          } else if (rec.status === 'late') {
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">متأخر (${rec.lateMinutes}د)</span>`;
          } else if (rec.status === 'leave') {
            statusBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">إجازة</span>';
          } else {
            statusBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">غياب</span>';
          }

          const coordsPill = rec.location_coords 
            ? `<span class="coords-badge text-[11px] inline-flex items-center gap-1 font-mono text-blue-600 dark:text-blue-400 font-bold" title="${escapeHTML(rec.location_coords.label || '')}"><i class="fa-solid fa-location-dot text-rose-500"></i> ${rec.location_coords.lat}, ${rec.location_coords.lng}</span>`
            : '<span class="text-slate-400 text-xs font-medium">كشك البصمة</span>';

          return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
              <td class="p-3 font-mono font-bold text-slate-900 dark:text-white">${escapeHTML(rec.date)}</td>
              <td class="p-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">${escapeHTML(rec.checkIn || '--')}</td>
              <td class="p-3 font-mono text-blue-600 dark:text-blue-400 font-bold">${rec.checkOut ? escapeHTML(rec.checkOut) : 'دوام جاري'}</td>
              <td class="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">${rec.actualHours || 0} س</td>
              <td class="p-3">${coordsPill}</td>
              <td class="p-3">${statusBadge}</td>
            </tr>
          `;
        }).join('');
      }
    }

    // 7. Load Employee Administrative Requests
    loadAndRenderEmployeeRequests();
  }

  /**
   * Helper: Get formatted display information for administrative request types.
   */
  function getRequestTypeDisplayInfo(type) {
    switch (type) {
      case 'onboarding':
        return {
          title: 'طلب انضمام موظف جديد (Onboarding)',
          icon: 'fa-user-plus',
          bgClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800',
          badgeColor: 'purple'
        };
      case 'annual_leave':
        return {
          title: 'إجازة اعتيادية سنوية',
          icon: 'fa-umbrella-beach',
          bgClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
          badgeColor: 'emerald'
        };
      case 'casual_leave':
        return {
          title: 'إجازة عارضة طارئة',
          icon: 'fa-triangle-exclamation',
          bgClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800',
          badgeColor: 'amber'
        };
      case 'sick_leave':
        return {
          title: 'إجازة مرضية معتمدة',
          icon: 'fa-notes-medical',
          bgClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800',
          badgeColor: 'rose'
        };
      case 'early_leave':
        return {
          title: 'إذن خروج مبكر',
          icon: 'fa-person-walking-arrow-right',
          bgClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800',
          badgeColor: 'blue'
        };
      case 'morning_delay':
        return {
          title: 'إذن تأخير صباحي',
          icon: 'fa-clock',
          bgClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-800',
          badgeColor: 'sky'
        };
      case 'advance_salary':
        return {
          title: 'طلب سلفة مالية على الراتب',
          icon: 'fa-money-bill-wave',
          bgClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800',
          badgeColor: 'purple'
        };
      case 'complaint':
        return {
          title: 'شكوى أو استفسار إداري',
          icon: 'fa-circle-question',
          bgClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
          badgeColor: 'slate'
        };
      case 'resignation':
        return {
          title: 'طلب استقالة رسمي',
          icon: 'fa-file-signature',
          bgClass: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300 dark:border-red-800',
          badgeColor: 'red'
        };
      default:
        return {
          title: 'طلب إداري عام',
          icon: 'fa-file-lines',
          bgClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
          badgeColor: 'slate'
        };
    }
  }

  let currentEmpReqFilter = 'all';

  /**
   * Setup Employee Requests UI (Modals, Dynamic Fields, Submission).
   */
  function setupEmployeeRequestsUI() {
    const modal = document.getElementById('empRequestModal');
    const openBtns = [
      document.getElementById('empNewRequestBtn'),
      document.getElementById('empNewRequestBtnSection')
    ].filter(Boolean);
    const closeBtn = document.getElementById('closeEmpRequestModalBtn');
    const cancelBtn = document.getElementById('cancelEmpRequestModalBtn');
    const form = document.getElementById('empRequestForm');
    const typeSelect = document.getElementById('empReqTypeSelect');

    const leaveGroup = document.getElementById('empReqLeaveDatesGroup');
    const permGroup = document.getElementById('empReqPermissionGroup');
    const amountGroup = document.getElementById('empReqAmountGroup');
    const singleDateGroup = document.getElementById('empReqSingleDateGroup');

    const startDateInput = document.getElementById('empReqStartDate');
    const endDateInput = document.getElementById('empReqEndDate');
    const daysCountText = document.getElementById('empReqDaysCountText');
    const permDateInput = document.getElementById('empReqPermDate');
    const singleDateInput = document.getElementById('empReqSingleDate');

    // Date change handler to calculate days
    const updateDaysCount = () => {
      if (!startDateInput || !endDateInput || !daysCountText) return;
      const sVal = startDateInput.value;
      const eVal = endDateInput.value;
      if (!sVal || !eVal) {
        daysCountText.textContent = '1 يوم';
        return;
      }
      const sDate = new Date(sVal);
      const eDate = new Date(eVal);
      const diffTime = eDate - sDate;
      const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
      daysCountText.textContent = `${diffDays} ${diffDays === 1 ? 'يوم' : diffDays === 2 ? 'يومان' : diffDays <= 10 ? 'أيام' : 'يوماً'}`;
    };

    startDateInput?.addEventListener('change', () => {
      if (endDateInput && (!endDateInput.value || endDateInput.value < startDateInput.value)) {
        endDateInput.value = startDateInput.value;
      }
      updateDaysCount();
    });
    endDateInput?.addEventListener('change', updateDaysCount);

    const toggleDynamicGroups = () => {
      const type = typeSelect ? typeSelect.value : 'annual_leave';
      if (['annual_leave', 'casual_leave', 'sick_leave'].includes(type)) {
        leaveGroup?.classList.remove('hidden');
        permGroup?.classList.add('hidden');
        amountGroup?.classList.add('hidden');
        singleDateGroup?.classList.add('hidden');
      } else if (['early_leave', 'morning_delay'].includes(type)) {
        leaveGroup?.classList.add('hidden');
        permGroup?.classList.remove('hidden');
        amountGroup?.classList.add('hidden');
        singleDateGroup?.classList.add('hidden');
      } else if (type === 'advance_salary') {
        leaveGroup?.classList.add('hidden');
        permGroup?.classList.add('hidden');
        amountGroup?.classList.remove('hidden');
        singleDateGroup?.classList.add('hidden');
      } else {
        leaveGroup?.classList.add('hidden');
        permGroup?.classList.add('hidden');
        amountGroup?.classList.add('hidden');
        singleDateGroup?.classList.remove('hidden');
      }
    };

    typeSelect?.addEventListener('change', () => {
      sound.playClick();
      toggleDynamicGroups();
    });

    const openRequestModal = () => {
      sound.playClick();
      const today = store.state.currentDate || new Date().toISOString().split('T')[0];
      if (startDateInput) startDateInput.value = today;
      if (endDateInput) endDateInput.value = today;
      if (permDateInput) permDateInput.value = today;
      if (singleDateInput) singleDateInput.value = today;
      if (daysCountText) daysCountText.textContent = '1 يوم';
      const reasonEl = document.getElementById('empReqReason');
      if (reasonEl) reasonEl.value = '';
      const amountEl = document.getElementById('empReqAmount');
      if (amountEl) amountEl.value = '';
      if (typeSelect) typeSelect.value = 'annual_leave';
      toggleDynamicGroups();
      modal?.classList.remove('hidden');
    };

    openBtns.forEach(btn => btn.addEventListener('click', openRequestModal));
    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
    cancelBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

    // Filter tab clicks
    document.querySelectorAll('[data-emp-req-filter]').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        sound.playClick();
        document.querySelectorAll('[data-emp-req-filter]').forEach(b => {
          b.classList.remove('active', 'bg-emerald-600', 'text-white', 'shadow-md');
          b.classList.add('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
        });
        tabBtn.classList.remove('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
        tabBtn.classList.add('active', 'bg-emerald-600', 'text-white', 'shadow-md');
        currentEmpReqFilter = tabBtn.dataset.empReqFilter || 'all';
        loadAndRenderEmployeeRequests(currentEmpReqFilter);
      });
    });

    // Form submit
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = store.state.currentUser;
      if (!user) {
        showToast('يرجى تسجيل الدخول أولاً', 'error');
        return;
      }

      const reqType = typeSelect?.value || 'annual_leave';
      const reason = document.getElementById('empReqReason')?.value.trim();
      if (!reason) {
        showToast('يرجى كتابة سبب ومبرر الطلب', 'warning');
        return;
      }

      const payload = {
        employeeId: user.id,
        type: reqType,
        reason: reason
      };

      if (['annual_leave', 'casual_leave', 'sick_leave'].includes(reqType)) {
        payload.startDate = startDateInput?.value || store.state.currentDate;
        payload.endDate = endDateInput?.value || payload.startDate;
        const s = new Date(payload.startDate);
        const endD = new Date(payload.endDate);
        const diff = Math.max(1, Math.round((endD - s) / (1000 * 60 * 60 * 24)) + 1);
        payload.daysCount = diff;
      } else if (['early_leave', 'morning_delay'].includes(reqType)) {
        payload.date = permDateInput?.value || store.state.currentDate;
        payload.hoursCount = Number(document.getElementById('empReqHours')?.value || 1);
      } else if (reqType === 'advance_salary') {
        const amt = Number(document.getElementById('empReqAmount')?.value || 0);
        if (amt <= 0) {
          showToast('يرجى تحديد مبلغ السلفة المطلوب', 'warning');
          return;
        }
        payload.amount = amt;
      } else {
        payload.date = singleDateInput?.value || store.state.currentDate;
      }

      const res = await ApiService.createRequest(payload);
      if (res.success) {
        sound.playSuccess();
        modal?.classList.add('hidden');
        showToast('تم إرسال طلبك الإداري بنجاح إلى مدير الإدارة', 'success', 4000);
        await loadAndRenderEmployeeRequests(currentEmpReqFilter);
        updateAdminNotifications();
      } else {
        sound.playError();
        showToast(res.message || 'حدث خطأ أثناء تقديم الطلب', 'error');
      }
    });

    // Employee cards "view-request-details" delegation
    const empReqContainer = document.getElementById('empRequestsContainer');
    empReqContainer?.addEventListener('click', async (e) => {
      const viewBtn = e.target.closest('[data-action="view-request-details"]');
      if (viewBtn) {
        sound.playClick();
        const reqId = viewBtn.dataset.id;
        const allRes = await ApiService.getRequests();
        const all = allRes?.data || (Array.isArray(allRes) ? allRes : []);
        const req = all.find(r => r.id === reqId);
        if (req) openRequestDetailsModal(req);
      }
    });
  }

  /**
   * Load and render employee's requests list and KPIs.
   */
  async function loadAndRenderEmployeeRequests(statusFilter = currentEmpReqFilter) {
    const user = store.state.currentUser;
    const container = document.getElementById('empRequestsContainer');
    if (!user || !container) return;

    const reqRes = await ApiService.getRequests({ employeeId: user.id });
    const allRequests = reqRes?.data || (Array.isArray(reqRes) ? reqRes : []);

    // Update KPI badges
    const totalEl = document.getElementById('empReqTotalCount');
    const pendingEl = document.getElementById('empReqPendingCount');
    const approvedEl = document.getElementById('empReqApprovedCount');
    const rejectedEl = document.getElementById('empReqRejectedCount');

    const totalCount = allRequests.length;
    const pendingCount = allRequests.filter(r => r.status === 'pending').length;
    const approvedCount = allRequests.filter(r => r.status === 'approved').length;
    const rejectedCount = allRequests.filter(r => r.status === 'rejected').length;

    if (totalEl) totalEl.textContent = totalCount;
    if (pendingEl) pendingEl.textContent = pendingCount;
    if (approvedEl) approvedEl.textContent = approvedCount;
    if (rejectedEl) rejectedEl.textContent = rejectedCount;

    // Filter items
    let filtered = allRequests;
    if (statusFilter && statusFilter !== 'all') {
      filtered = allRequests.filter(r => r.status === statusFilter);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center glass-panel rounded-2xl p-6 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div class="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center text-slate-400 mb-3">
            <i class="fa-solid fa-folder-open text-2xl"></i>
          </div>
          <p class="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد طلبات مسجلة ضمن هذا التصنيف</p>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">اضغط على زر "تقديم طلب جديد" لإنشاء طلب إجازة، إذن، أو سلفة مالية</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(req => {
      const typeInfo = getRequestTypeDisplayInfo(req.type);

      let statusBadge = '';
      if (req.status === 'pending') {
        statusBadge = `
          <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1.5 shadow-sm">
            <span class="w-2 h-2 rounded-full bg-amber-500 badge-live-pulse"></span>
            <span>قيد المراجعة والاعتماد</span>
          </span>
        `;
      } else if (req.status === 'approved') {
        statusBadge = `
          <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 shadow-sm">
            <i class="fa-solid fa-circle-check text-emerald-500"></i>
            <span>تمت الموافقة والاعتماد</span>
          </span>
        `;
      } else {
        statusBadge = `
          <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1.5 shadow-sm">
            <i class="fa-solid fa-circle-xmark text-rose-500"></i>
            <span>تم رفض الطلب</span>
          </span>
        `;
      }

      // Timing / detail description
      let timingText = '';
      if (req.startDate && req.endDate) {
        timingText = `من <strong class="font-mono text-slate-800 dark:text-slate-200">${escapeHTML(req.startDate)}</strong> إلى <strong class="font-mono text-slate-800 dark:text-slate-200">${escapeHTML(req.endDate)}</strong> (${req.daysCount || 1} يوم)`;
      } else if (req.hoursCount) {
        timingText = `تاريخ: <strong class="font-mono text-slate-800 dark:text-slate-200">${escapeHTML(req.date || '')}</strong> • المدة: <strong class="font-mono text-slate-800 dark:text-slate-200">${req.hoursCount} ساعة</strong>`;
      } else if (req.amount) {
        timingText = `المبلغ المطلوب: <strong class="font-mono text-purple-600 dark:text-purple-400 font-black">${formatCurrency(req.amount)}</strong>`;
      } else if (req.date) {
        timingText = `التاريخ المحدد: <strong class="font-mono text-slate-800 dark:text-slate-200">${escapeHTML(req.date)}</strong>`;
      }

      // Manager Reply Box (if any)
      let managerReplyHtml = '';
      if (req.manager_reply) {
        const isApproved = req.status === 'approved';
        managerReplyHtml = `
          <div class="mt-3 p-3 rounded-xl border ${isApproved ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200' : 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'} text-xs">
            <div class="flex items-center gap-1.5 font-bold mb-1">
              <i class="fa-solid fa-comment-dots"></i>
              <span>رد وملاحظات الإدارة:</span>
            </div>
            <p class="font-medium whitespace-pre-wrap">${escapeHTML(req.manager_reply)}</p>
          </div>
        `;
      }

      return `
        <div class="glass-panel p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between gap-3 mb-2.5">
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border ${typeInfo.bgClass}">
                <i class="fa-solid ${typeInfo.icon}"></i>
              </div>
              <div>
                <h4 class="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">${escapeHTML(typeInfo.title)}</h4>
                <div class="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">كود الطلب: ${escapeHTML(req.id)} • تاريخ التقديم: ${escapeHTML(req.createdAt || '--')}</div>
              </div>
            </div>
            <div>${statusBadge}</div>
          </div>

          <div class="text-xs text-slate-600 dark:text-slate-400 mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800/80">
            ${timingText}
          </div>

          <div class="mt-2.5 text-xs">
            <span class="text-slate-500 font-bold block mb-0.5">سبب ومبرر الطلب:</span>
            <p class="text-slate-800 dark:text-slate-200 italic font-medium whitespace-pre-wrap">${escapeHTML(req.reason || 'لا توجد ملاحظات')}</p>
          </div>

          ${managerReplyHtml}

          <div class="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span class="text-[11px] font-mono text-slate-400">الرقم المرجعي: ${escapeHTML(req.id)}</span>
            <button type="button" data-action="view-request-details" data-id="${escapeHTML(req.id)}" class="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95" title="عرض تفاصيل الطلب الكاملة">
              <i class="fa-solid fa-eye text-xs"></i>
              <span>تفاصيل الطلب الكاملة</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Setup Unified Approvals Module (Requests & Onboarding) with real-time notification linkage.
   */
  function setupApprovalsModule() {
    // 1. Sub-tabs switching between Requests and Onboarding
    const subTabReqBtn = document.getElementById('approvalsSubTabRequestsBtn');
    const subTabOnboardBtn = document.getElementById('approvalsSubTabOnboardingBtn');
    const paneRequests = document.getElementById('approvalsPaneRequests');
    const paneOnboarding = document.getElementById('approvalsPaneOnboarding');

    const switchApprovalsSubTab = (tab) => {
      sound.playClick();
      if (tab === 'requests') {
        paneRequests?.classList.remove('hidden');
        paneOnboarding?.classList.add('hidden');

        subTabReqBtn?.classList.remove('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
        subTabReqBtn?.classList.add('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-500/20');

        subTabOnboardBtn?.classList.remove('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-500/20');
        subTabOnboardBtn?.classList.add('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
        loadAndRenderAdminRequests();
      } else {
        paneOnboarding?.classList.remove('hidden');
        paneRequests?.classList.add('hidden');

        subTabOnboardBtn?.classList.remove('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
        subTabOnboardBtn?.classList.add('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-500/20');

        subTabReqBtn?.classList.remove('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-500/20');
        subTabReqBtn?.classList.add('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
        renderApprovalsTable();
      }
    };

    subTabReqBtn?.addEventListener('click', () => switchApprovalsSubTab('requests'));
    subTabOnboardBtn?.addEventListener('click', () => switchApprovalsSubTab('onboarding'));

    // Refresh Button
    const refreshBtn = document.getElementById('refreshApprovalsBtn');
    refreshBtn?.addEventListener('click', () => {
      sound.playClick();
      loadAndRenderAdminRequests();
      renderApprovalsTable();
      updateAdminNotifications();
      refreshPendingApprovalsBadge();
      showToast('تم تحديث قائمة الطلبات والموافقات بنجاح', 'info');
    });

    // Filter controls in Requests Pane
    const deptFilter = document.getElementById('approvalsDeptFilter');
    const typeFilter = document.getElementById('approvalsTypeFilter');
    const statusFilter = document.getElementById('approvalsStatusFilter');
    const searchInput = document.getElementById('approvalsSearchInput');

    deptFilter?.addEventListener('change', () => loadAndRenderAdminRequests());
    typeFilter?.addEventListener('change', () => loadAndRenderAdminRequests());
    statusFilter?.addEventListener('change', () => loadAndRenderAdminRequests());
    searchInput?.addEventListener('input', () => loadAndRenderAdminRequests());

    // Requests table in-row action delegation (Approve / Reject decision)
    const adminReqTbody = document.getElementById('adminRequestsTableBody');
    adminReqTbody?.addEventListener('click', async (e) => {
      // 1. اعتماد وتعيين مرشح انضمام جديد
      const approveOnboardBtn = e.target.closest('[data-action="manager-approve-onboarding"]');
      if (approveOnboardBtn) {
        sound.playClick();
        const empId = approveOnboardBtn.dataset.id;
        
        let candidate = (await ApiService.getPendingEmployees()).find(c => c.id === empId || c.employee_code === empId);
        if (!candidate) {
          candidate = (store.state.employees || []).find(e => e.id === empId || e.employee_code === empId);
        }
        if (!candidate) {
          const empRes = await ApiService.getEmployeeById(empId);
          if (empRes?.success && empRes.data) candidate = empRes.data;
        }
        if (!candidate) {
          const allRes = await ApiService.getRequests();
          const allReqs = allRes?.data || (Array.isArray(allRes) ? allRes : []);
          const matchReq = allReqs.find(r => r.employeeId === empId || r.employee_id === empId || r.id === `REQ-ONB-${empId}`);
          if (matchReq) {
            candidate = matchReq.employee || matchReq.details?.rawEmployee;
          }
        }
        if (!candidate) {
          const row = approveOnboardBtn.closest('tr');
          const nameEl = row?.querySelector('.font-bold.text-slate-900');
          const deptEl = row?.querySelectorAll('td')?.[1];
          candidate = {
            id: empId,
            fullName: nameEl ? nameEl.textContent.trim() : 'موظف جديد',
            department: deptEl ? deptEl.textContent.trim() : 'المبيعات والتسويق',
            role: 'employee',
            baseSalary: 7500
          };
        }

        openApprovalModal(candidate);
        return;
      }

      // 2. رفض طلب مرشح انضمام جديد
      const rejectOnboardBtn = e.target.closest('[data-action="manager-reject-onboarding"]');
      if (rejectOnboardBtn) {
        sound.playClick();
        const empId = rejectOnboardBtn.dataset.id;
        if (confirm('هل أنت متأكد من رفض طلب هذا المرشح وإلغاء تسجيله نهائياً؟')) {
          const res = await ApiService.rejectPendingEmployee(empId);
          if (res.success) {
            sound.playSuccess();
            const row = rejectOnboardBtn.closest('tr');
            if (row) row.remove();
            showToast('تم رفض طلب تسجيل الموظف', 'info');
            await loadEmployees();
            await loadAndRenderAdminRequests();
            await renderApprovalsTable();
            refreshPendingApprovalsBadge();
            updateAdminNotifications();
          } else {
            sound.playError();
            showToast(res.message || 'حدث خطأ أثناء رفض الطلب', 'error');
          }
        }
        return;
      }

      // 3. اتخاذ قرار بالقبول لطلب إداري اعتيادي
      const approveBtn = e.target.closest('[data-action="manager-approve-req"]');
      if (approveBtn) {
        sound.playClick();
        const reqId = approveBtn.dataset.id;
        const allRes = await ApiService.getRequests();
        const all = allRes?.data || (Array.isArray(allRes) ? allRes : []);
        const req = all.find(r => r.id === reqId);
        if (req) {
          if (req.type === 'onboarding') {
            const candidate = req.employee || store.state.employees.find(e => e.id === req.employeeId) || { id: req.employeeId, fullName: req.employeeId };
            openApprovalModal(candidate);
          } else {
            openManagerDecisionModal(req, 'approved');
          }
        }
        return;
      }

      // 4. اتخاذ قرار بالرفض لطلب إداري اعتيادي
      const rejectBtn = e.target.closest('[data-action="manager-reject-req"]');
      if (rejectBtn) {
        sound.playClick();
        const reqId = rejectBtn.dataset.id;
        const allRes = await ApiService.getRequests();
        const all = allRes?.data || (Array.isArray(allRes) ? allRes : []);
        const req = all.find(r => r.id === reqId);
        if (req) {
          if (req.type === 'onboarding') {
            if (confirm('هل أنت متأكد من رفض طلب هذا المرشح وإلغاء تسجيله نهائياً؟')) {
              await ApiService.rejectPendingEmployee(req.employeeId);
              showToast('تم رفض طلب تسجيل الموظف', 'info');
              await loadEmployees();
              loadAndRenderAdminRequests();
              renderApprovalsTable();
              refreshPendingApprovalsBadge();
              updateAdminNotifications();
            }
          } else {
            openManagerDecisionModal(req, 'rejected');
          }
        }
        return;
      }
    });

    // Manager Decision Modal Handlers
    const decisionModal = document.getElementById('managerDecisionModal');
    const closeDecisionBtn = document.getElementById('closeDecisionModalBtn');
    const cancelDecisionBtn = document.getElementById('cancelDecisionModalBtn');
    const decisionForm = document.getElementById('managerDecisionForm');

    closeDecisionBtn?.addEventListener('click', () => decisionModal?.classList.add('hidden'));
    cancelDecisionBtn?.addEventListener('click', () => decisionModal?.classList.add('hidden'));

    decisionForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const reqId = document.getElementById('decisionRequestId')?.value;
      const actionType = document.getElementById('decisionActionType')?.value;
      const notes = document.getElementById('decisionNotesInput')?.value.trim();

      if (!reqId || !actionType) return;

      if (actionType === 'rejected' && !notes) {
        showToast('يرجى كتابة سبب ومبرر الرفض لتوضيحه للموظف', 'warning');
        return;
      }

      const res = await ApiService.updateRequestStatus(reqId, actionType, {
        manager_reply: notes
      });

      if (res.success) {
        sound.playSuccess();
        decisionModal?.classList.add('hidden');
        showToast(
          actionType === 'approved' 
            ? 'تم اعتماد والموافقة على الطلب بنجاح وتحديث حساب الموظف فورياً' 
            : 'تم تسجيل رفض الطلب وتدوين الملاحظات للموظف',
          actionType === 'approved' ? 'success' : 'info'
        );
        await loadAndRenderAdminRequests();
        await updateAdminNotifications();
        await loadLeaves();
        await loadPermissions();
        if (store.state.currentUser) {
          loadAndRenderEmployeeRequests();
        }
      } else {
        sound.playError();
        showToast(res.message || 'حدث خطأ أثناء معالجة القرار', 'error');
      }
    });

    // Navbar Notification Bell Controller
    const notifBtn = document.getElementById('adminNotificationsBtn');
    const notifDropdown = document.getElementById('adminNotificationsDropdown');
    const viewAllRequestsBtn = document.getElementById('adminViewAllRequestsBtn');

    notifBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      sound.playClick();
      notifDropdown?.classList.toggle('hidden');
    });

    viewAllRequestsBtn?.addEventListener('click', () => {
      sound.playClick();
      notifDropdown?.classList.add('hidden');
      navigateToAdminModule('module-approvals');
      switchApprovalsSubTab('requests');
    });

    // Close notifications dropdown on outside click
    document.addEventListener('click', (e) => {
      if (notifDropdown && !notifDropdown.classList.contains('hidden')) {
        const container = document.getElementById('adminNotificationsContainer');
        if (container && !container.contains(e.target)) {
          notifDropdown.classList.add('hidden');
        }
      }
    });

    // Notification dropdown click delegation
    const notifListEl = document.getElementById('adminNotificationsList');
    notifListEl?.addEventListener('click', async (e) => {
      const onboardBtn = e.target.closest('[data-action="notif-approve-onboarding"]');
      if (onboardBtn) {
        sound.playClick();
        notifDropdown?.classList.add('hidden');
        navigateToAdminModule('module-approvals');
        const empId = onboardBtn.dataset.id;
        const pendingList = await ApiService.getPendingEmployees();
        let candidate = pendingList.find(c => c.id === empId);
        if (!candidate) {
          candidate = (store.state.employees || []).find(e => e.id === empId);
        }
        if (candidate) openApprovalModal(candidate);
        return;
      }

      const reqBtn = e.target.closest('[data-action="manager-approve-req"], [data-action="notif-approve-req"]');
      if (reqBtn) {
        sound.playClick();
        notifDropdown?.classList.add('hidden');
        navigateToAdminModule('module-approvals');
        const reqId = reqBtn.dataset.id;
        const allRes = await ApiService.getRequests();
        const all = allRes?.data || (Array.isArray(allRes) ? allRes : []);
        const req = all.find(r => r.id === reqId);
        if (req) {
          if (req.type === 'onboarding') {
            const candidate = req.employee || store.state.employees.find(e => e.id === req.employeeId) || { id: req.employeeId, fullName: req.employeeId };
            openApprovalModal(candidate);
          } else {
            openManagerDecisionModal(req, 'approved');
          }
        }
        return;
      }
    });

    // Onboarding Module Handlers (Existing logic preserved & unified)
    const onboardingTbody = document.getElementById('approvalsTableBody');
    const onboardingModal = document.getElementById('approvalModal');
    const onboardingCloseBtn = document.getElementById('closeApprovalModalBtn');
    const onboardingCancelBtn = document.getElementById('cancelApprovalModalBtn');
    const onboardingForm = document.getElementById('approvalForm');
    const onboardingRejectBtn = document.getElementById('rejectCandidateBtn');

    onboardingCloseBtn?.addEventListener('click', () => onboardingModal?.classList.add('hidden'));
    onboardingCancelBtn?.addEventListener('click', () => onboardingModal?.classList.add('hidden'));

    onboardingTbody?.addEventListener('click', async (e) => {
      const approveCandidateBtn = e.target.closest('[data-action="open-approval"]');
      if (approveCandidateBtn) {
        sound.playClick();
        const id = approveCandidateBtn.dataset.id;
        const pendingList = await ApiService.getPendingEmployees();
        let candidate = pendingList.find(c => c.id === id);
        if (!candidate) {
          candidate = (store.state.employees || []).find(e => e.id === id);
        }
        if (candidate) openApprovalModal(candidate);
        return;
      }

      const rejectCandidateBtn = e.target.closest('[data-action="reject-candidate"]');
      if (rejectCandidateBtn) {
        sound.playClick();
        const id = rejectCandidateBtn.dataset.id;
        if (confirm('هل أنت متأكد من رفض هذا الطلب وإلغاء تسجيل المرشح نهائياً؟')) {
          const res = await ApiService.rejectPendingEmployee(id);
          if (res.success) {
            sound.playSuccess();
            showToast('تم رفض طلب التسجيل', 'info');
            await loadEmployees();
            populateAuthBioSelect();
            renderQuickLoginShortcuts();
            updateDemoPinChips();
            loadAndRenderAdminRequests();
            renderApprovalsTable();
            refreshPendingApprovalsBadge();
            updateAdminNotifications();
          }
        }
      }
    });

    const closeApprovalModal = () => {
      const modal = document.getElementById('approvalModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        modal.style.removeProperty('display');
      }
      document.body.classList.remove('overflow-hidden');
    };

    onboardingCloseBtn?.addEventListener('click', closeApprovalModal);
    onboardingCancelBtn?.addEventListener('click', closeApprovalModal);
    onboardingModal?.addEventListener('click', (e) => {
      if (e.target === onboardingModal) closeApprovalModal();
    });

    function openApprovalModal(c) {
      if (!c) {
        showToast('لم يتم العثور على بيانات المرشح', 'warning');
        return;
      }

      const nameEl = document.getElementById('approvalCandidateName');
      const idEl = document.getElementById('approvalCandidateId');
      const emailEl = document.getElementById('approvalCandidateEmail');
      const phoneEl = document.getElementById('approvalCandidatePhone');
      const empIdInput = document.getElementById('approvalEmpId');

      if (nameEl) nameEl.textContent = c.fullName || 'موظف جديد';
      if (idEl) idEl.textContent = getEmployeeCode(c);
      if (emailEl) emailEl.textContent = c.email || 'غير مسجل';
      if (phoneEl) phoneEl.textContent = c.phone || 'غير مسجل';
      if (empIdInput) empIdInput.value = c.id;

      const roleSelect = document.getElementById('approvalRoleSelect');
      if (roleSelect) roleSelect.value = c.role || 'employee';

      const deptSelect = document.getElementById('approvalDeptSelect');
      if (deptSelect && c.department) {
        let matched = false;
        for (let i = 0; i < deptSelect.options.length; i++) {
          const opt = deptSelect.options[i];
          if (opt.value === c.department || c.department.includes(opt.value) || opt.value.includes(c.department)) {
            deptSelect.selectedIndex = i;
            matched = true;
            break;
          }
        }
        if (!matched) {
          const newOpt = document.createElement('option');
          newOpt.value = c.department;
          newOpt.textContent = c.department;
          deptSelect.appendChild(newOpt);
          deptSelect.value = c.department;
        }
      }

      const jobTitleInput = document.getElementById('approvalJobTitle');
      if (jobTitleInput) jobTitleInput.value = c.jobTitle || ('أخصائي ' + (c.department || 'العمليات'));

      const baseSalaryInput = document.getElementById('approvalBaseSalary');
      if (baseSalaryInput) baseSalaryInput.value = c.baseSalary || 7500;

      const housingInput = document.getElementById('approvalHousing');
      if (housingInput) housingInput.value = c.housingAllowance || 1000;

      const transportInput = document.getElementById('approvalTransport');
      if (transportInput) transportInput.value = c.transportAllowance || 800;

      const otherInput = document.getElementById('approvalOther');
      if (otherInput) otherInput.value = c.otherAllowances || 500;

      const salesTargetInput = document.getElementById('approvalSalesTarget');
      if (salesTargetInput) salesTargetInput.value = c.salesTarget || 15000;

      const commissionRateInput = document.getElementById('approvalCommissionRate');
      if (commissionRateInput) commissionRateInput.value = c.commissionRate || 3;

      const modal = document.getElementById('approvalModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
      }
    }

    onboardingForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const empId = document.getElementById('approvalEmpId')?.value;
      if (!empId) return;

      const submitBtn = onboardingForm.querySelector('button[type="submit"]');
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin ml-1.5"></i> جاري الاعتماد...';
      }

      try {
        const payload = {
          role: document.getElementById('approvalRoleSelect')?.value || 'employee',
          department: document.getElementById('approvalDeptSelect')?.value || 'العمليات والتشغيل',
          jobTitle: (document.getElementById('approvalJobTitle')?.value || '').trim() || 'موظف',
          baseSalary: Number(document.getElementById('approvalBaseSalary')?.value || 0),
          housingAllowance: Number(document.getElementById('approvalHousing')?.value || 0),
          transportAllowance: Number(document.getElementById('approvalTransport')?.value || 0),
          otherAllowances: Number(document.getElementById('approvalOther')?.value || 0),
          salesTarget: Number(document.getElementById('approvalSalesTarget')?.value || 0),
          commissionRate: Number(document.getElementById('approvalCommissionRate')?.value || 0)
        };

        const res = await ApiService.approvePendingEmployee(empId, payload);
        if (res.success) {
          sound.playSuccess();
          // 1. إغلاق النافذة المنبثقة فوراً
          closeApprovalModal();

          // 2. إخفاء وإزالة الصف فوراً من جدول الاعتمادات لضمان اختفائه لحظياً
          const adminRows = document.querySelectorAll(`[data-action="manager-approve-onboarding"][data-id="${empId}"]`);
          adminRows.forEach(btn => {
            const tr = btn.closest('tr');
            if (tr) {
              tr.style.transition = 'all 0.3s ease';
              tr.style.opacity = '0';
              tr.remove();
            }
          });

          const onboardRows = document.querySelectorAll(`[data-action="open-approval"][data-id="${empId}"]`);
          onboardRows.forEach(btn => {
            const tr = btn.closest('tr');
            if (tr) {
              tr.style.transition = 'all 0.3s ease';
              tr.style.opacity = '0';
              tr.remove();
            }
          });

          showToast(`تم اعتماد الموظف (${res.employee?.fullName || empId}) وتفعيل حسابه بصلاحية (${payload.role === 'admin' ? 'مدير نظام' : payload.role === 'hr' ? 'مسؤول HR' : 'موظف'}) بنجاح!`, 'success', 5000);

          // 3. تحديث كافة المكونات والجداول
          await loadEmployees();
          populateAuthBioSelect();
          renderQuickLoginShortcuts();
          updateDemoPinChips();
          await loadAndRenderAdminRequests();
          await renderApprovalsTable();
          refreshPendingApprovalsBadge();
          updateAdminNotifications();
          renderEmployeesTable();
        } else {
          sound.playError();
          showToast(res.message, 'error');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      }
    });

    onboardingRejectBtn?.addEventListener('click', async () => {
      sound.playClick();
      const empId = document.getElementById('approvalEmpId')?.value;
      if (!empId) return;
      if (confirm('هل أنت متأكد من رفض طلب هذا المرشح نهائياً؟')) {
        const res = await ApiService.rejectPendingEmployee(empId);
        if (res.success) {
          sound.playSuccess();
          closeApprovalModal();

          const adminRows = document.querySelectorAll(`[data-action="manager-approve-onboarding"][data-id="${empId}"]`);
          adminRows.forEach(btn => btn.closest('tr')?.remove());
          const onboardRows = document.querySelectorAll(`[data-action="open-approval"][data-id="${empId}"]`);
          onboardRows.forEach(btn => btn.closest('tr')?.remove());

          showToast('تم رفض الطلب بنجاح', 'info');
          await loadEmployees();
          populateAuthBioSelect();
          renderQuickLoginShortcuts();
          updateDemoPinChips();
          await loadAndRenderAdminRequests();
          await renderApprovalsTable();
          refreshPendingApprovalsBadge();
          updateAdminNotifications();
        } else {
          sound.playError();
          showToast(res.message || 'فشل في رفض الطلب', 'error');
        }
      }
    });
  }

  /**
   * Open Decision Modal for Manager/Admin to approve or reject a request.
   */
  function openManagerDecisionModal(req, actionType) {
    const modal = document.getElementById('managerDecisionModal');
    if (!modal) return;

    document.getElementById('decisionRequestId').value = req.id;
    document.getElementById('decisionActionType').value = actionType;

    const emp = req.employee || store.state.employees.find(e => e.id === req.employeeId) || { fullName: req.employeeId, department: 'عام' };
    const typeInfo = getRequestTypeDisplayInfo(req.type);

    document.getElementById('decisionEmployeeName').textContent = emp.fullName;
    document.getElementById('decisionDepartment').textContent = emp.department || 'عام';
    document.getElementById('decisionRequestBadge').textContent = typeInfo.title;
    document.getElementById('decisionEmployeeReason').textContent = req.reason || 'لا توجد ملاحظات';

    let timingText = '';
    if (req.startDate && req.endDate) {
      timingText = `${req.startDate} إلى ${req.endDate} (${req.daysCount} يوم)`;
    } else if (req.hoursCount) {
      timingText = `${req.date} (${req.hoursCount} ساعة)`;
    } else if (req.amount) {
      timingText = formatCurrency(req.amount);
    } else if (req.date) {
      timingText = req.date;
    }
    document.getElementById('decisionRequestDates').textContent = timingText;

    const notesInput = document.getElementById('decisionNotesInput');
    if (notesInput) notesInput.value = req.manager_reply || '';

    const iconEl = document.getElementById('managerDecisionIcon');
    const titleTextEl = document.getElementById('managerDecisionTitleText');
    const confirmBtn = document.getElementById('confirmDecisionBtn');
    const confirmBtnText = document.getElementById('confirmDecisionBtnText');
    const notesLabel = document.getElementById('decisionNotesLabel');

    if (actionType === 'approved') {
      if (iconEl) iconEl.className = 'fa-solid fa-circle-check text-emerald-500';
      if (titleTextEl) titleTextEl.textContent = 'الموافقة على الطلب الإداري';
      if (confirmBtn) {
        confirmBtn.className = 'px-5 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700';
      }
      if (confirmBtnText) confirmBtnText.textContent = 'تأكيد الموافقة والاعتماد';
      if (notesLabel) notesLabel.textContent = 'ملاحظات وتوجيهات الإدارة (تصل للموظف - اختياري):';
    } else {
      if (iconEl) iconEl.className = 'fa-solid fa-ban text-rose-500';
      if (titleTextEl) titleTextEl.textContent = 'رفض الطلب الإداري';
      if (confirmBtn) {
        confirmBtn.className = 'px-5 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700';
      }
      if (confirmBtnText) confirmBtnText.textContent = 'تأكيد رفض الطلب';
      if (notesLabel) notesLabel.textContent = 'سبب ومبرر الرفض (إلزامي لتوضيحه للموظف):';
    }

    modal.classList.remove('hidden');
  }

  /**
   * Load and render requests table in Manager/Admin Approvals Center.
   */
  async function loadAndRenderAdminRequests() {
    const tbody = document.getElementById('adminRequestsTableBody');
    if (!tbody) return;

    const deptVal = document.getElementById('approvalsDeptFilter')?.value || 'all';
    const typeVal = document.getElementById('approvalsTypeFilter')?.value || 'all';
    const statusVal = document.getElementById('approvalsStatusFilter')?.value || 'all';
    const searchVal = (document.getElementById('approvalsSearchInput')?.value || '').trim().toLowerCase();

    const reqRes = await ApiService.getRequests();
    const allRequests = reqRes?.data || (Array.isArray(reqRes) ? reqRes : []);

    const filtered = allRequests.filter(req => {
      const emp = req.employee || store.state.employees.find(e => e.id === req.employeeId) || req.details?.rawEmployee || {};
      const empDept = emp.department || '';

      if (deptVal !== 'all' && empDept !== deptVal) return false;
      if (typeVal !== 'all' && req.type !== typeVal && req.request_type !== typeVal) return false;
      if (statusVal !== 'all' && req.status !== statusVal) return false;

      if (searchVal) {
        const empName = (emp.fullName || '').toLowerCase();
        const empId = (req.employeeId || '').toLowerCase();
        const empCode = (getEmployeeCode(emp) || '').toLowerCase();
        const reason = (req.reason || '').toLowerCase();
        if (!empName.includes(searchVal) && !empId.includes(searchVal) && !empCode.includes(searchVal) && !reason.includes(searchVal)) {
          return false;
        }
      }

      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-10 text-xs text-slate-500 font-medium">
            <i class="fa-solid fa-folder-open text-2xl text-slate-300 dark:text-slate-700 mb-2 block"></i>
            لا توجد طلبات إدارية مطابقة لخيارات التصفية والبحث الحالية
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map((req, idx) => {
      const emp = req.employee || store.state.employees.find(e => e.id === req.employeeId) || req.details?.rawEmployee || { fullName: req.employeeId, department: 'عام' };
      const typeInfo = getRequestTypeDisplayInfo(req.type);

      // حالة طلب انضمام موظف جديد (Onboarding)
      if (req.type === 'onboarding') {
        const candidate = emp;
        const isPending = req.status === 'pending';
        const childId = `admin-req-child-${req.id || ('onboard-' + idx)}`;

        let statusBadgeOnboard = '';
        if (isPending) {
          statusBadgeOnboard = '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1.5 shadow-sm"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 badge-live-pulse"></span>معلق (بانتظار الاعتماد)</span>';
        } else if (req.status === 'approved') {
          statusBadgeOnboard = '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-flex items-center gap-1"><i class="fa-solid fa-check-double text-[10px]"></i>تم الاعتماد والتفعيل</span>';
        } else {
          statusBadgeOnboard = '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 inline-flex items-center gap-1"><i class="fa-solid fa-ban text-[10px]"></i>مرفوض</span>';
        }

        const actionButtonsOnboard = isPending ? `
          <div class="flex items-center justify-center gap-1.5 flex-wrap">
            <button type="button" data-action="manager-approve-onboarding" data-id="${escapeHTML(candidate.id)}" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95" title="اعتماد الموظف وتحديد الصلاحية والراتب">
              <i class="fa-solid fa-user-check"></i>
              <span>اعتماد وتعيين</span>
            </button>
            <button type="button" data-action="manager-reject-onboarding" data-id="${escapeHTML(candidate.id)}" class="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 border border-rose-300 dark:border-rose-900 font-bold text-xs flex items-center gap-1 transition-all" title="رفض طلب الانضمام">
              <i class="fa-solid fa-ban"></i>
              <span>رفض</span>
            </button>
          </div>
        ` : `
          <div class="text-center">
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
              <i class="fa-solid fa-circle-check"></i> حساب نشط ومفعل
            </span>
          </div>
        `;

        return `
          <tr class="table-parent-row hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors bg-purple-50/20 dark:bg-purple-950/15 border-r-4 border-r-purple-500 cursor-pointer md:cursor-default" data-child-id="${childId}">
            <td class="p-2.5 sm:p-3.5">
              <div class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                <i class="fa-solid fa-user-clock text-purple-600 dark:text-purple-400 text-sm"></i>
                <span>${escapeHTML(candidate.fullName)}</span>
              </div>
              <div class="text-[11px] text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                ${escapeHTML(getEmployeeCode(candidate))} • ${escapeHTML(candidate.phone || candidate.email || 'غير مسجل')}
              </div>
              <div class="md:hidden mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                <i class="fa-solid fa-user-plus text-[9px]"></i>
                <span>طلب انضمام موظف جديد</span>
              </div>
            </td>
            <td class="p-3.5 text-xs font-bold text-slate-700 dark:text-slate-300 hidden md:table-cell">${escapeHTML(candidate.department || 'عام')}</td>
            <td class="p-3.5 hidden md:table-cell">
              <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800">
                <i class="fa-solid fa-user-plus"></i>
                <span>طلب انضمام موظف جديد (Onboarding)</span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                تاريخ التسجيل: <span class="font-mono text-slate-700 dark:text-slate-300">${escapeHTML(req.createdAt || req.submittedAt || '--')}</span>
              </div>
            </td>
            <td class="p-3.5 font-mono text-xs text-slate-600 dark:text-slate-400 hidden lg:table-cell">${escapeHTML(req.createdAt || req.submittedAt || '--')}</td>
            <td class="p-3.5 max-w-xs hidden lg:table-cell">
              <div class="text-xs text-slate-800 dark:text-slate-200 font-medium">طلب تسجيل وانضمام لفريق العمل بقسم <strong class="text-purple-600 dark:text-purple-400">${escapeHTML(candidate.department || 'عام')}</strong></div>
              <div class="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-0.5"><i class="fa-solid fa-hourglass-half ml-1"></i>بانتظار مراجعة الإدارة وتحديد الراتب والصلاحيات</div>
            </td>
            <td class="p-2.5 sm:p-3.5 text-center whitespace-nowrap">${statusBadgeOnboard}</td>
            <td class="p-3.5 text-center hidden md:table-cell">${actionButtonsOnboard}</td>
            <td class="p-2 sm:p-2.5 text-center md:hidden">
              <button class="row-expand-btn" data-action="toggle-child-row" data-target="${childId}" title="عرض تفاصيل الطلب والإجراءات" aria-label="عرض تفاصيل الطلب">
                <i class="fa-solid fa-chevron-down text-xs"></i>
              </button>
            </td>
          </tr>
          <tr id="${childId}" class="responsive-child-row hidden bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
            <td colspan="8" class="p-2.5 sm:p-3">
              <div class="responsive-child-card p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5 text-xs">
                <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span class="text-slate-500 font-medium">القسم المطلوب:</span>
                  <span class="font-bold text-slate-800 dark:text-slate-200">${escapeHTML(candidate.department || 'عام')}</span>
                </div>
                <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span class="text-slate-500 font-medium">تاريخ التسجيل:</span>
                  <span class="font-mono text-slate-700 dark:text-slate-300">${escapeHTML(req.createdAt || req.submittedAt || '--')}</span>
                </div>
                <div class="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span class="text-slate-500 font-medium block mb-1">بيانات وملاحظات الطلب:</span>
                  <p class="text-slate-800 dark:text-slate-200 bg-purple-50/50 dark:bg-purple-950/30 p-2 rounded-lg border border-purple-200 dark:border-purple-900/50">طلب انضمام موظف جديد - بانتظار الاعتماد وتحديد الراتب والصلاحيات</p>
                </div>
                <div class="pt-1 flex flex-col gap-2">
                  <span class="text-slate-500 font-medium">إجراءات الإدارة:</span>
                  <div>${actionButtonsOnboard}</div>
                </div>
              </div>
            </td>
          </tr>
        `;
      }

      let timingText = '';
      if (req.startDate && req.endDate) {
        timingText = `<span class="font-mono font-bold">${escapeHTML(req.startDate)}</span> إلى <span class="font-mono font-bold">${escapeHTML(req.endDate)}</span> <span class="text-xs text-slate-500">(${req.daysCount} يوم)</span>`;
      } else if (req.hoursCount) {
        timingText = `<span class="font-mono">${escapeHTML(req.date || '')}</span> • <span class="font-bold font-mono">${req.hoursCount} ساعة</span>`;
      } else if (req.amount) {
        timingText = `<span class="font-mono font-bold text-purple-600 dark:text-purple-400">${formatCurrency(req.amount)}</span>`;
      } else if (req.date) {
        timingText = `<span class="font-mono">${escapeHTML(req.date)}</span>`;
      }

      let statusBadge = '';
      if (req.status === 'pending') {
        statusBadge = '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 badge-live-pulse"></span>معلق</span>';
      } else if (req.status === 'approved') {
        statusBadge = '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-flex items-center gap-1"><i class="fa-solid fa-check text-[10px]"></i>مقبول</span>';
      } else {
        statusBadge = '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 inline-flex items-center gap-1"><i class="fa-solid fa-xmark text-[10px]"></i>مرفوض</span>';
      }

      let managerReplySnippet = '';
      if (req.manager_reply) {
        managerReplySnippet = `<div class="mt-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate" title="${escapeHTML(req.manager_reply)}"><i class="fa-solid fa-reply ml-1"></i>${escapeHTML(req.manager_reply)}</div>`;
      }

      const isPending = req.status === 'pending';
      const childId = `admin-req-child-${req.id || ('req-' + idx)}`;

      const actionButtons = isPending ? `
        <div class="flex items-center justify-center gap-1.5 flex-wrap">
          <button type="button" data-action="manager-approve-req" data-id="${escapeHTML(req.id)}" class="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all active:scale-95" title="الموافقة على الطلب">
            <i class="fa-solid fa-check"></i>
            <span>موافقة</span>
          </button>
          <button type="button" data-action="manager-reject-req" data-id="${escapeHTML(req.id)}" class="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 border border-rose-300 dark:border-rose-900 font-bold text-xs flex items-center gap-1 transition-all" title="رفض الطلب">
            <i class="fa-solid fa-ban"></i>
            <span>رفض</span>
          </button>
        </div>
      ` : `
        <div class="text-center">
          <button type="button" data-action="manager-approve-req" data-id="${escapeHTML(req.id)}" class="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold" title="تعديل القرار أو الملاحظات">
            <i class="fa-solid fa-pen-to-square ml-0.5"></i> تعديل القرار
          </button>
        </div>
      `;

      return `
        <tr class="table-parent-row hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer md:cursor-default" data-child-id="${childId}">
          <td class="p-2.5 sm:p-3.5">
            <div class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">${escapeHTML(emp.fullName)}</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">${escapeHTML(getEmployeeCode(emp))}</div>
            <div class="md:hidden mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${typeInfo.bgClass}">
              <i class="fa-solid ${typeInfo.icon} text-[9px]"></i>
              <span>${escapeHTML(typeInfo.title)}</span>
            </div>
          </td>
          <td class="p-3.5 text-xs font-bold text-slate-700 dark:text-slate-300 hidden md:table-cell">${escapeHTML(emp.department || 'عام')}</td>
          <td class="p-3.5 hidden md:table-cell">
            <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-bold ${typeInfo.bgClass}">
              <i class="fa-solid ${typeInfo.icon}"></i>
              <span>${escapeHTML(typeInfo.title)}</span>
            </div>
            <div class="text-xs text-slate-600 dark:text-slate-400 mt-1">${timingText}</div>
          </td>
          <td class="p-3.5 font-mono text-xs text-slate-600 dark:text-slate-400 hidden lg:table-cell">${escapeHTML(req.createdAt || '--')}</td>
          <td class="p-3.5 max-w-xs hidden lg:table-cell">
            <div class="text-xs text-slate-800 dark:text-slate-200 line-clamp-2" title="${escapeHTML(req.reason || '')}">${escapeHTML(req.reason || 'لا توجد ملاحظات')}</div>
            ${managerReplySnippet}
          </td>
          <td class="p-2.5 sm:p-3.5 text-center whitespace-nowrap">${statusBadge}</td>
          <td class="p-3.5 text-center hidden md:table-cell">${actionButtons}</td>
          <td class="p-2 sm:p-2.5 text-center md:hidden">
            <button class="row-expand-btn" data-action="toggle-child-row" data-target="${childId}" title="عرض تفاصيل الطلب والإجراءات" aria-label="عرض تفاصيل الطلب">
              <i class="fa-solid fa-chevron-down text-xs"></i>
            </button>
          </td>
        </tr>
        <tr id="${childId}" class="responsive-child-row hidden bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <td colspan="8" class="p-2.5 sm:p-3">
            <div class="responsive-child-card p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5 text-xs">
              <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span class="text-slate-500 font-medium">نوع الطلب والتفاصيل:</span>
                <div class="text-right">
                  <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-bold ${typeInfo.bgClass}">
                    <i class="fa-solid ${typeInfo.icon}"></i>
                    <span>${escapeHTML(typeInfo.title)}</span>
                  </div>
                  ${timingText ? `<div class="text-slate-600 dark:text-slate-400 mt-1 font-medium">${timingText}</div>` : ''}
                </div>
              </div>
              <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span class="text-slate-500 font-medium">القسم:</span>
                <span class="font-bold text-slate-800 dark:text-slate-200">${escapeHTML(emp.department || 'عام')}</span>
              </div>
              <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span class="text-slate-500 font-medium">تاريخ التقديم:</span>
                <span class="font-mono text-slate-700 dark:text-slate-300">${escapeHTML(req.createdAt || '--')}</span>
              </div>
              <div class="border-b border-slate-100 dark:border-slate-800 pb-2">
                <span class="text-slate-500 font-medium block mb-1">مبرر الطلب والملاحظات:</span>
                <p class="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">${escapeHTML(req.reason || 'لا توجد ملاحظات')}</p>
                ${managerReplySnippet ? `<div class="mt-2">${managerReplySnippet}</div>` : ''}
              </div>
              <div class="pt-1 flex flex-col gap-2">
                <span class="text-slate-500 font-medium">اتخاذ قرار:</span>
                <div>${actionButtons}</div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Update real-time admin notifications badge, counter, and dropdown list.
   */
  async function updateAdminNotifications() {
    const pendingRes = await ApiService.getRequests({ status: 'pending' });
    const pendingRequests = pendingRes?.data || (Array.isArray(pendingRes) ? pendingRes : []);
    const count = pendingRequests.length;

    const badge = document.getElementById('adminPendingBadge');
    const notifSummary = document.getElementById('adminNotifSummaryBadge');
    const subTabBadge = document.getElementById('subTabRequestsBadge');
    const headerCount = document.getElementById('approvalsHeaderCount');
    const notifList = document.getElementById('adminNotificationsList');

    if (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    if (notifSummary) notifSummary.textContent = `${count} طلب جديد`;
    if (subTabBadge) subTabBadge.textContent = count;
    if (headerCount) headerCount.textContent = `${count} طلب معلق`;

    if (notifList) {
      if (count === 0) {
        notifList.innerHTML = `
          <div class="p-6 text-center text-xs text-slate-500 font-medium">
            <i class="fa-solid fa-bell-slash text-2xl text-slate-300 dark:text-slate-700 mb-2 block"></i>
            لا توجد طلبات إدارية جديدة في الانتظار حالياً
          </div>
        `;
      } else {
        notifList.innerHTML = pendingRequests.slice(0, 10).map(req => {
          const emp = req.employee || store.state.employees.find(e => e.id === req.employeeId) || req.details?.rawEmployee || { fullName: req.employeeId, department: 'عام' };
          const typeInfo = getRequestTypeDisplayInfo(req.type);
          const isOnboarding = req.type === 'onboarding';

          const actionBtn = isOnboarding ? `
            <button type="button" data-action="notif-approve-onboarding" data-id="${escapeHTML(emp.id)}" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shrink-0 self-center transition-all flex items-center gap-1 shadow-sm" title="اعتماد الموظف وتحديد الصلاحية والراتب">
              <i class="fa-solid fa-user-check text-[10px]"></i>
              <span>اعتماد وتعيين</span>
            </button>
          ` : `
            <button type="button" data-action="notif-approve-req" data-id="${escapeHTML(req.id)}" class="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shrink-0 self-center transition-all" title="اتخاذ قرار">
              بت في الطلب
            </button>
          `;

          return `
            <div class="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-start justify-between gap-2.5 ${isOnboarding ? 'bg-purple-50/30 dark:bg-purple-950/20' : ''}">
              <div class="flex items-start gap-2.5 flex-1 min-w-0">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${typeInfo.bgClass} text-xs">
                  <i class="fa-solid ${typeInfo.icon}"></i>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-1">
                    <span class="font-bold text-xs text-slate-900 dark:text-white truncate">${escapeHTML(emp.fullName)}</span>
                    <span class="text-[10px] text-slate-400 font-mono">${escapeHTML(req.createdAt || '')}</span>
                  </div>
                  <div class="text-[11px] text-slate-600 dark:text-slate-400 font-semibold truncate mt-0.5">
                    ${escapeHTML(typeInfo.title)} • ${escapeHTML(emp.department || 'عام')}
                  </div>
                  <p class="text-[11px] text-slate-500 italic truncate mt-0.5">${escapeHTML(req.reason || '')}</p>
                </div>
              </div>
              ${actionBtn}
            </div>
          `;
        }).join('');
      }
    }
  }

  /**
   * Render Pending Approvals Table in Admin Portal (Candidate Onboarding).
   */
  async function renderApprovalsTable() {
    const tbody = document.getElementById('approvalsTableBody');
    if (!tbody) return;

    const pending = await ApiService.getPendingEmployees();

    const subTabOnboardBadge = document.getElementById('subTabOnboardingBadge');
    if (subTabOnboardBadge) {
      subTabOnboardBadge.textContent = pending.length;
      if (pending.length > 0) {
        subTabOnboardBadge.className = 'px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-mono font-black animate-pulse';
      } else {
        subTabOnboardBadge.className = 'px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-mono font-bold';
      }
    }

    if (pending.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-xs text-slate-500 font-medium">لا توجد طلبات موظفين جديدة في الانتظار حالياً</td></tr>`;
      return;
    }

    tbody.innerHTML = pending.map((c, idx) => {
      const childId = `approval-child-${idx}-${c.id || Date.now()}`;
      return `
        <tr class="table-parent-row hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer md:cursor-default" data-child-id="${childId}">
          <td class="p-2.5 sm:p-3">
            <div class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">${escapeHTML(c.fullName)}</div>
            <div class="text-[11px] text-blue-600 dark:text-blue-400 font-mono mt-0.5">${escapeHTML(c.email || 'غير مسجل')} • ${escapeHTML(c.phone || '')}</div>
          </td>
          <td class="p-3 font-mono font-black text-blue-600 dark:text-blue-400 text-xs sm:text-sm hidden md:table-cell">${escapeHTML(getEmployeeCode(c))}</td>
          <td class="p-3 font-bold text-slate-700 dark:text-slate-300 text-xs hidden md:table-cell">${escapeHTML(c.department || 'عام')}</td>
          <td class="p-3 font-mono text-xs text-slate-600 dark:text-slate-400 hidden lg:table-cell">${escapeHTML(c.hireDate || c.registeredAt?.split('T')[0] || 'اليوم')}</td>
          <td class="p-2.5 sm:p-3 whitespace-nowrap text-center">
            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500 badge-live-pulse"></span>
              قيد المراجعة والاعتماد
            </span>
          </td>
          <td class="p-3 text-center hidden md:table-cell">
            <div class="flex items-center justify-center gap-2">
              <button class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95" data-action="open-approval" data-id="${escapeHTML(c.id)}">
                <i class="fa-solid fa-user-check"></i>
                <span>اعتماد وتحديد الصلاحية</span>
              </button>
              <button class="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 border border-rose-300 dark:border-rose-900 font-bold text-xs flex items-center gap-1 transition-colors" data-action="reject-candidate" data-id="${escapeHTML(c.id)}" title="رفض الطلب">
                <i class="fa-solid fa-ban"></i>
                <span>رفض</span>
              </button>
            </div>
          </td>
          <td class="p-2 sm:p-2.5 text-center md:hidden">
            <button class="row-expand-btn" data-action="toggle-child-row" data-target="${childId}" title="عرض باقي التفاصيل والاعتماد" aria-label="عرض باقي التفاصيل">
              <i class="fa-solid fa-chevron-down text-xs"></i>
            </button>
          </td>
        </tr>
        <tr id="${childId}" class="responsive-child-row hidden bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <td colspan="7" class="p-2.5 sm:p-3">
            <div class="responsive-child-card p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5 text-xs">
              <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span class="text-slate-500 font-medium">كود الموظف:</span>
                <span class="font-mono font-bold text-blue-600 dark:text-blue-400">${escapeHTML(getEmployeeCode(c))}</span>
              </div>
              <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span class="text-slate-500 font-medium">القسم المبدئي:</span>
                <span class="font-bold text-slate-800 dark:text-slate-200">${escapeHTML(c.department || 'عام')}</span>
              </div>
              <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span class="text-slate-500 font-medium">تاريخ التسجيل:</span>
                <span class="font-mono text-slate-700 dark:text-slate-300">${escapeHTML(c.hireDate || c.registeredAt?.split('T')[0] || 'اليوم')}</span>
              </div>
              <div class="pt-1 flex flex-col gap-2">
                <span class="text-slate-500 font-medium">إجراءات الاعتماد:</span>
                <div class="flex items-center gap-2 flex-wrap">
                  <button class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95" data-action="open-approval" data-id="${escapeHTML(c.id)}">
                    <i class="fa-solid fa-user-check"></i>
                    <span>اعتماد وتحديد الصلاحية</span>
                  </button>
                  <button class="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 border border-rose-300 dark:border-rose-900 font-bold text-xs flex items-center gap-1 transition-colors" data-action="reject-candidate" data-id="${escapeHTML(c.id)}" title="رفض الطلب">
                    <i class="fa-solid fa-ban"></i>
                    <span>رفض</span>
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Update pending approvals counter badges across Admin Sidebar & Header.
   */
  async function refreshPendingApprovalsBadge(count = null) {
    let pendingCount = count;
    if (pendingCount === null) {
      const pendingRes = await ApiService.getRequests({ status: 'pending' });
      const pendingReqs = pendingRes?.data || (Array.isArray(pendingRes) ? pendingRes : []);
      pendingCount = pendingReqs.length;
    }
    const badge = document.getElementById('pendingApprovalsBadge');
    if (badge) badge.textContent = `${pendingCount} معلق`;
  }

  /* ==========================================================================
     10. MODULE 1: ATTENDANCE KIOSK TERMINAL (Scanner + 6-Digit PIN)
     ========================================================================== */

  function setupKioskTerminal() {
    const modeFingerprintBtn = document.getElementById('kioskModeFingerprintBtn');
    const modePinBtn = document.getElementById('kioskModePinBtn');
    const fingerprintSection = document.getElementById('fingerprintSection');
    const pinSection = document.getElementById('pinSection');
    const scannerWidget = document.getElementById('scannerWidget');
    const triggerFingerprintBtn = document.getElementById('triggerFingerprintPunchBtn');
    const kioskEmpSelect = document.getElementById('kioskEmpSelect');

    // Tab Switch between Fingerprint and PIN
    modeFingerprintBtn?.addEventListener('click', () => {
      sound.playClick();
      fingerprintSection?.classList.remove('hidden');
      fingerprintSection?.classList.add('flex');
      pinSection?.classList.add('hidden');
      pinSection?.classList.remove('flex');
      modeFingerprintBtn?.classList.add('bg-white', 'dark:bg-slate-700', 'text-blue-600', 'dark:text-blue-400', 'shadow-sm');
      modeFingerprintBtn?.classList.remove('text-slate-700', 'dark:text-slate-300');
      modePinBtn?.classList.remove('bg-white', 'dark:bg-slate-700', 'text-blue-600', 'dark:text-blue-400', 'shadow-sm');
      modePinBtn?.classList.add('text-slate-700', 'dark:text-slate-300');
    });

    modePinBtn?.addEventListener('click', () => {
      sound.playClick();
      pinSection?.classList.remove('hidden');
      pinSection?.classList.add('flex');
      fingerprintSection?.classList.add('hidden');
      fingerprintSection?.classList.remove('flex');
      modePinBtn?.classList.add('bg-white', 'dark:bg-slate-700', 'text-blue-600', 'dark:text-blue-400', 'shadow-sm');
      modePinBtn?.classList.remove('text-slate-700', 'dark:text-slate-300');
      modeFingerprintBtn?.classList.remove('bg-white', 'dark:bg-slate-700', 'text-blue-600', 'dark:text-blue-400', 'shadow-sm');
      modeFingerprintBtn?.classList.add('text-slate-700', 'dark:text-slate-300');
      resetPin();
    });

    // Scanner Widget Click & Button Punch (Native Device Biometrics)
    const executeFingerprintScan = async () => {
      const selectedEmpId = kioskEmpSelect?.value;
      if (!selectedEmpId) {
        showToast('يرجى اختيار موظف للتحقق من البصمة', 'warning');
        return;
      }
      const selectedEmpName = kioskEmpSelect?.options[kioskEmpSelect.selectedIndex]?.text || '';

      scannerWidget?.classList.add('scanning');
      sound.playClick();

      try {
        await requestDeviceBiometricVerification(selectedEmpId, selectedEmpName);
        scannerWidget?.classList.remove('scanning');

        // في حال نجاح بصمة الجهاز (Success):
        const res = await ApiService.loginWithFingerprint(selectedEmpId, true);
        handlePunchResult(res);
      } catch (bioErr) {
        console.warn('[WebAuthn Kiosk Fingerprint Fallback]:', bioErr);
        scannerWidget?.classList.remove('scanning');
        sound.playAlert();

        if (bioErr && (bioErr.name === 'NotAllowedError' || bioErr.name === 'AbortError')) {
          showToast('تم إلغاء مسح البصمة من الجهاز', 'warning', 3500);
        } else if (bioErr && bioErr.message === 'NO_PLATFORM_AUTHENTICATOR') {
          modePinBtn?.click();
          showToast('هذا الجهاز لا يدعم البصمة المدمجة، يرجى إدخال رمز الـ PIN', 'warning', 4000);
        } else {
          modePinBtn?.click();
          showToast('تعذر التحقق من البصمة، يرجى إدخال رمز الـ PIN', 'warning', 4000);
        }
      }
    };

    scannerWidget?.addEventListener('click', executeFingerprintScan);
    triggerFingerprintBtn?.addEventListener('click', executeFingerprintScan);

    // Setup 6-Digit PIN Numpad
    setupNumpad();

    // Close Confirmation Modal
    const closePunchModalBtn = document.getElementById('closePunchModalBtn');
    closePunchModalBtn?.addEventListener('click', () => {
      document.getElementById('punchConfirmModal')?.classList.add('hidden');
    });
  }

  function setupNumpad() {
    const numpadBtns = document.querySelectorAll('.numpad-btn[data-num]');
    const clearBtn = document.getElementById('pinClearBtn');
    const backspaceBtn = document.getElementById('pinBackspaceBtn');

    numpadBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const num = btn.dataset.num;
        if (store.state.pinInput.length < 6) {
          store.state.pinInput += num;
          updatePinDots();
          if (store.state.pinInput.length === 6) {
            submitPinPunch();
          }
        }
      });
    });

    clearBtn?.addEventListener('click', () => {
      sound.playClick();
      resetPin();
    });

    backspaceBtn?.addEventListener('click', () => {
      sound.playClick();
      if (store.state.pinInput.length > 0) {
        store.state.pinInput = store.state.pinInput.slice(0, -1);
        updatePinDots();
      }
    });
  }

  function updatePinDots() {
    const dots = document.querySelectorAll('#pinDotsContainer .pin-dot');
    dots.forEach((dot, idx) => {
      if (idx < store.state.pinInput.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  }

  function resetPin() {
    store.state.pinInput = '';
    updatePinDots();
  }

  async function submitPinPunch() {
    const pin = store.state.pinInput;
    const res = await ApiService.loginWithPin(pin, true);
    if (!res.success) {
      sound.playError();
      const container = document.getElementById('pinDotsContainer');
      container?.classList.add('shake');
      showToast(res.message || 'رمز PIN غير صحيح', 'error', 3000);
      setTimeout(() => {
        container?.classList.remove('shake');
        resetPin();
      }, 500);
      return;
    }
    resetPin();
    handlePunchResult(res);
  }

  function handlePunchResult(res) {
    if (!res.success) {
      sound.playError();
      showToast(res.message || 'فشل التحقق من الهوية', 'error', 4000);
      return;
    }

    sound.playSuccess();
    const user = res.user || res.data?.user || res.employee || res.data?.employee;
    showToast(`تم تسجيل الدخول بنجاح! مرحباً بك يا ${user?.fullName || ''}`, 'success', 3500);

    // Update Result Card & Open Confirmation Modal
    renderPunchResultCard(res);
    openPunchConfirmModal(res);
  }

  function renderPunchResultCard(res) {
    const card = document.getElementById('punchResultCard');
    const badge = document.getElementById('punchResultBadge');
    const content = document.getElementById('punchResultContent');
    const emp = res.user || res.data?.user || res.employee || res.data?.employee;

    if (!card || !badge || !content || !emp) return;

    card.className = 'glass-panel rounded-2xl p-6 shadow-xl border-l-4 border-l-emerald-500 transition-all duration-300 bg-white dark:bg-slate-900';
    badge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300';
    badge.textContent = 'تم تسجيل الدخول بنجاح';

    content.innerHTML = `
      <div class="flex items-center gap-4 text-right mb-4">
        <img src="${escapeHTML(emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')}" alt="${escapeHTML(emp.fullName)}" class="w-16 h-16 rounded-xl object-cover border-2 border-emerald-500 shadow-md">
        <div>
          <h4 class="text-base font-black text-slate-900 dark:text-white">${escapeHTML(emp.fullName)}</h4>
          <p class="text-xs text-slate-600 dark:text-slate-400 font-medium">${escapeHTML(emp.jobTitle || 'موظف')} • ${escapeHTML(emp.department || '')}</p>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">${escapeHTML(getEmployeeCode(emp))}</span>
            <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">تسجيل دخول موثق</span>
          </div>
        </div>
      </div>
      <div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 text-right">
        <div class="flex justify-between items-center mb-1">
          <span class="text-slate-600 dark:text-slate-400 font-bold">وقت الدخول:</span>
          <span class="font-bold font-mono text-slate-900 dark:text-white text-sm">${new Date().toLocaleTimeString('ar-EG')}</span>
        </div>
        <p class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">تم التحقق من الهوية وتسجيل الدخول بنجاح (مستقل تماماً عن سجلات الحضور والانصراف).</p>
      </div>
    `;
  }

  function openPunchConfirmModal(res) {
    const modal = document.getElementById('punchConfirmModal');
    const emp = res.user || res.data?.user || res.employee || res.data?.employee;

    const iconBg = document.getElementById('modalPunchIconBg');
    const icon = document.getElementById('modalPunchIcon');
    const title = document.getElementById('modalPunchTitle');
    const msg = document.getElementById('modalPunchMessage');

    if (!modal || !emp) return;

    if (iconBg) iconBg.className = 'w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto mb-4 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 flex items-center justify-center text-3xl sm:text-4xl shadow-inner';
    if (icon) icon.className = 'fa-solid fa-circle-check';
    if (title) title.textContent = 'تم تسجيل الدخول بنجاح';
    if (msg) msg.textContent = `تم التحقق بنجاح من بيانات المستخدم (${emp.fullName}) وتسجيل الدخول للنظام.`;

    const nameEl = document.getElementById('modalPunchEmpName');
    if (nameEl) nameEl.textContent = emp.fullName;
    const idEl = document.getElementById('modalPunchEmpId');
    if (idEl) idEl.textContent = getEmployeeCode(emp);
    const deptEl = document.getElementById('modalPunchEmpDept');
    if (deptEl) deptEl.textContent = emp.department;
    const timeEl = document.getElementById('modalPunchTime');
    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString('ar-EG');

    const detailRow = document.getElementById('modalPunchDetail');
    if (detailRow) {
      detailRow.textContent = 'تسجيل دخول ناجح (مستقل عن الحضور والانصراف)';
    }

    modal.classList.remove('hidden');
  }

  function renderRecentKioskFeed() {
    const feed = document.getElementById('kioskRecentFeed');
    const badge = document.getElementById('todayPunchCountBadge');
    if (!feed) return;

    const todayRecords = store.state.attendance.filter(a => a.date === store.state.currentDate);
    if (badge) badge.textContent = `${todayRecords.length} حركات اليوم`;

    if (todayRecords.length === 0) {
      feed.innerHTML = '<div class="text-center py-6 text-xs text-slate-500 dark:text-slate-400 font-medium">لا توجد حركات مسجلة لهذا اليوم بعد</div>';
      return;
    }

    feed.innerHTML = todayRecords.map(rec => {
      const isOut = !!rec.checkOut;
      return `
        <div class="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg ${isOut ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'} flex items-center justify-center font-bold text-xs">
              <i class="fa-solid ${isOut ? 'fa-arrow-right-from-bracket' : 'fa-arrow-right-to-bracket'}" aria-hidden="true"></i>
            </div>
            <div>
              <div class="font-bold text-slate-900 dark:text-white">${escapeHTML(rec.employeeName)}</div>
              <div class="text-[11px] text-slate-600 dark:text-slate-400 font-medium">${escapeHTML(rec.department)}</div>
            </div>
          </div>
          <div class="text-left font-mono">
            <div class="font-bold ${isOut ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}">${escapeHTML(isOut ? rec.checkOut : rec.checkIn)}</div>
            <span class="text-[10px] text-slate-600 dark:text-slate-400 font-medium">${isOut ? 'انصراف' : (rec.lateMinutes > 0 ? `تأخير ${rec.lateMinutes}د` : 'حضور')}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ==========================================================================
     11. MODULE 2: EXECUTIVE DASHBOARD CONTROLLER
     ========================================================================== */

  function setupDashboard() {
    renderDashboard();
  }

  async function renderDashboard() {
    const todayStr = store.state.currentDate;
    const totalEmployees = store.state.employees.length;
    const todayLogs = store.state.attendance.filter(a => a.date === todayStr);

    // KPIs
    const presentToday = todayLogs.filter(a => a.checkIn).length;
    const lateToday = todayLogs.filter(a => a.lateMinutes > (store.state.settings?.gracePeriodMinutes || 15)).length;

    // On leave today
    const onLeaveToday = store.state.leaves.filter(l => 
      l.status === 'approved' && 
      todayStr >= l.startDate && 
      todayStr <= l.endDate
    ).length;

    const absentToday = Math.max(0, totalEmployees - (presentToday + onLeaveToday));

    // Update KPI UI
    const totalEmpEl = document.getElementById('dashTotalEmployees');
    const presentEl = document.getElementById('dashPresentToday');
    const lateEl = document.getElementById('dashLateToday');
    const absentEl = document.getElementById('dashAbsentToday');
    const onLeaveEl = document.getElementById('dashOnLeaveToday');

    if (totalEmpEl) totalEmpEl.textContent = totalEmployees;
    if (presentEl) presentEl.textContent = presentToday;
    if (lateEl) lateEl.textContent = lateToday;
    if (absentEl) absentEl.textContent = absentToday;
    if (onLeaveEl) onLeaveEl.textContent = onLeaveToday;

    // Expected Monthly Payroll
    const payrollRes = await ApiService.calculateMonthlyPayroll(store.state.currentMonth);
    const expectedPayrollEl = document.getElementById('dashExpectedPayroll');
    if (payrollRes.success && expectedPayrollEl) {
      expectedPayrollEl.textContent = formatCurrency(payrollRes.summary.totalNetPayroll);
    }

    // Department Breakdown
    renderDepartmentBreakdown(todayLogs);

    // Live Dashboard Punches Stream
    renderDashboardLiveFeed(todayLogs);
  }

  function renderDepartmentBreakdown(todayLogs) {
    const container = document.getElementById('dashDeptBreakdown');
    if (!container) return;

    const depts = {};
    store.state.employees.forEach(emp => {
      depts[emp.department] ??= { total: 0, present: 0 };
      depts[emp.department].total++;
    });

    todayLogs.forEach(log => {
      if (log.checkIn && depts[log.department]) {
        depts[log.department].present++;
      }
    });

    container.innerHTML = Object.keys(depts).map(deptName => {
      const data = depts[deptName];
      const percent = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
      return `
        <div>
          <div class="flex justify-between text-xs font-bold mb-1">
            <span class="text-slate-900 dark:text-white">${escapeHTML(deptName)}</span>
            <span class="text-slate-600 dark:text-slate-400 font-mono">${data.present} من ${data.total} (${percent}%)</span>
          </div>
          <div class="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div class="h-full rounded-full ${percent >= 75 ? 'bg-emerald-500' : percent >= 50 ? 'bg-blue-500' : 'bg-amber-500'} transition-all duration-500" style="width: ${percent}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderDashboardLiveFeed(todayLogs) {
    const feed = document.getElementById('dashLiveFeed');
    if (!feed) return;

    if (todayLogs.length === 0) {
      feed.innerHTML = '<div class="text-center py-8 text-xs text-slate-500 dark:text-slate-400 font-medium">لا توجد حركات مسجلة لهذا اليوم بعد</div>';
      return;
    }

    feed.innerHTML = todayLogs.map(l => {
      const isOut = !!l.checkOut;
      return `
        <div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg ${isOut ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'} flex items-center justify-center font-bold">
              <i class="fa-solid ${isOut ? 'fa-arrow-right-from-bracket' : 'fa-arrow-right-to-bracket'}" aria-hidden="true"></i>
            </div>
            <div>
              <div class="font-bold text-slate-900 dark:text-white">${escapeHTML(l.employeeName)}</div>
              <div class="text-[11px] text-slate-600 dark:text-slate-400 font-medium">${escapeHTML(l.department)} • الوردية الرسمية</div>
            </div>
          </div>
          <div class="text-left font-mono">
            <div class="font-bold text-slate-900 dark:text-white">${escapeHTML(isOut ? `${l.checkIn} - ${l.checkOut}` : l.checkIn)}</div>
            <span class="text-[10px] ${l.lateMinutes > 15 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}">${isOut ? 'تم الانصراف' : (l.lateMinutes > 0 ? `تأخير ${l.lateMinutes} دقيقة` : 'حضور في الموعد')}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ==========================================================================
     12. MODULE 3: ATTENDANCE LOGS CONTROLLER (Event Delegation)
     ========================================================================== */

  function setupAttendanceView() {
    const filterMonth = document.getElementById('attFilterMonth');
    const filterEmp = document.getElementById('attFilterEmployee');
    const filterDept = document.getElementById('attFilterDept');
    const filterStatus = document.getElementById('attFilterStatus');
    const resetBtn = document.getElementById('resetAttFiltersBtn');

    const updateFilters = () => renderAttendanceTable();

    filterMonth?.addEventListener('change', updateFilters);
    filterEmp?.addEventListener('change', updateFilters);
    filterDept?.addEventListener('change', updateFilters);
    filterStatus?.addEventListener('change', updateFilters);

    resetBtn?.addEventListener('click', () => {
      if (filterMonth) filterMonth.value = store.state.currentMonth;
      if (filterEmp) filterEmp.value = 'all';
      if (filterDept) filterDept.value = 'all';
      if (filterStatus) filterStatus.value = 'all';
      renderAttendanceTable();
    });

    // Manual Punch Modal
    const openManualBtn = document.getElementById('openManualPunchModalBtn');
    const modal = document.getElementById('manualPunchModal');
    const closeBtn = document.getElementById('closeManualPunchModalBtn');
    const cancelBtn = document.getElementById('cancelManualPunchModalBtn');
    const form = document.getElementById('manualPunchForm');

    openManualBtn?.addEventListener('click', () => {
      form?.reset();
      document.getElementById('manualPunchId').value = '';
      document.getElementById('manualPunchDate').value = store.state.currentDate;
      modal?.classList.remove('hidden');
    });

    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
    cancelBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        id: document.getElementById('manualPunchId').value || null,
        employeeId: document.getElementById('manualPunchEmpSelect').value,
        date: document.getElementById('manualPunchDate').value,
        checkIn: document.getElementById('manualPunchCheckIn').value ? `${document.getElementById('manualPunchCheckIn').value}:00` : null,
        checkOut: document.getElementById('manualPunchCheckOut').value ? `${document.getElementById('manualPunchCheckOut').value}:00` : null,
        lateMinutes: Number(document.getElementById('manualPunchLateMins').value || 0),
        earlyLeaveMinutes: Number(document.getElementById('manualPunchEarlyMins').value || 0),
        overtimeHours: Number(document.getElementById('manualPunchOtHours').value || 0),
        notes: document.getElementById('manualPunchNotes').value
      };

      const res = await ApiService.saveManualAttendance(payload);
      if (res.success) {
        sound.playSuccess();
        showToast('تم حفظ سجل الحضور اليدوي بنجاح', 'success');
        modal?.classList.add('hidden');
        await loadAttendanceLogs();
        renderAttendanceTable();
      } else {
        showToast(res.message, 'error');
      }
    });

    // Event Delegation on Attendance Table Body
    const tbody = document.getElementById('attendanceTableBody');
    tbody?.addEventListener('click', (e) => {
      const viewBtn = e.target.closest('[data-action="view-att-details"]');
      if (viewBtn) {
        const id = viewBtn.dataset.id;
        const rec = store.state.attendance.find(r => r.id === id);
        if (rec) {
          showQuickDetails('attendance', rec);
        }
        return;
      }

      const editBtn = e.target.closest('[data-action="edit-attendance"]');
      if (editBtn) {
        const id = editBtn.dataset.id;
        const rec = store.state.attendance.find(r => r.id === id);
        if (rec) {
          openManualEditModal(rec);
        }
      }
    });
  }

  async function renderAttendanceTable() {
    const month = document.getElementById('attFilterMonth')?.value;
    const employeeId = document.getElementById('attFilterEmployee')?.value;
    const department = document.getElementById('attFilterDept')?.value;
    const status = document.getElementById('attFilterStatus')?.value;

    const res = await ApiService.getAttendanceLogs({
      month: month || undefined,
      employeeId: employeeId !== 'all' ? employeeId : undefined,
      department: department !== 'all' ? department : undefined,
      status: status !== 'all' ? status : undefined
    });

    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;

    if (!res.success || res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-xs text-slate-500 dark:text-slate-400 font-medium">لا توجد سجلات مطابقة لمعايير البحث المحددة</td></tr>`;
      return;
    }

    tbody.innerHTML = res.data.map((rec, idx) => {
      let statusBadge = '';
      if (rec.status === 'present') {
        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">حاضر</span>';
      } else if (rec.status === 'late') {
        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">متأخر</span>';
      } else if (rec.status === 'leave') {
        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">إجازة</span>';
      } else {
        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">غياب</span>';
      }

      const childId = `att-child-${rec.id || idx}`;

      return `
        <tr class="table-parent-row bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer md:cursor-default" data-child-id="${childId}">
          <td class="p-2 sm:p-2.5 font-bold text-slate-900 dark:text-white">
            <div class="text-xs sm:text-sm font-bold truncate max-w-[130px] sm:max-w-none">${escapeHTML(rec.employeeName)}</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-bold mt-0.5 tabular-nums num-display">${escapeHTML(rec.employeeId)}</div>
          </td>
          <td class="p-2 sm:p-2.5 hidden md:table-cell">
            <div class="font-mono text-slate-700 dark:text-slate-300 font-bold text-xs tabular-nums num-display">${escapeHTML(rec.date)}</div>
            <div class="text-[11px] font-mono mt-0.5">
              <span class="text-emerald-600 dark:text-emerald-400 font-bold">${escapeHTML(rec.checkIn || '--')}</span>
              <span class="text-slate-400 mx-0.5">/</span>
              <span class="text-blue-600 dark:text-blue-400 font-bold">${rec.checkOut ? escapeHTML(rec.checkOut) : 'دوام'}</span>
            </div>
            ${rec.location_coords ? `<div class="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold flex items-center gap-1 mt-0.5" title="${escapeHTML(rec.location_coords.label || '')}"><i class="fa-solid fa-location-dot text-rose-500"></i> ${rec.location_coords.lat}, ${rec.location_coords.lng}</div>` : ''}
          </td>
          <td class="p-2 sm:p-2.5 hidden lg:table-cell font-mono font-bold text-slate-900 dark:text-white text-xs tabular-nums num-display">
            ${rec.actualHours || 0} س
          </td>
          <td class="p-2 sm:p-2.5">
            ${statusBadge}
          </td>
          <td class="p-2 sm:p-2.5 text-center hidden md:table-cell">
            <div class="flex items-center justify-center gap-1.5">
              <button class="view-details-btn" data-action="view-att-details" data-id="${escapeHTML(rec.id)}" title="عرض كافة التفاصيل المخفية" aria-label="عرض التفاصيل">
                <i class="fa-solid fa-eye text-xs" aria-hidden="true"></i>
              </button>
              <button class="edit-att-btn p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold" data-action="edit-attendance" data-id="${escapeHTML(rec.id)}" aria-label="تعديل حركة الحضور">
                <i class="fa-solid fa-pen-to-square text-xs" aria-hidden="true"></i>
              </button>
            </div>
          </td>
          <td class="p-2 sm:p-2.5 text-center md:hidden">
            <button class="row-expand-btn" data-action="toggle-child-row" data-target="${childId}" title="عرض البيانات المخفية" aria-label="عرض البيانات المخفية">
              <i class="fa-solid fa-chevron-down text-xs"></i>
            </button>
          </td>
        </tr>
        <tr id="${childId}" class="responsive-child-row hidden bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <td colspan="6" class="p-2.5 sm:p-3">
            <div class="responsive-child-card p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5">
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">تاريخ الحركة:</span>
                  <span class="font-mono font-bold text-slate-900 dark:text-white">${escapeHTML(rec.date)}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">القسم:</span>
                  <span class="font-bold text-slate-900 dark:text-white">${escapeHTML(rec.department || '--')}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">تسجيل الحضور:</span>
                  <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">${escapeHTML(rec.checkIn || 'لم يسجل')}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">تسجيل الانصراف:</span>
                  <span class="font-mono font-bold text-blue-600 dark:text-blue-400">${rec.checkOut ? escapeHTML(rec.checkOut) : 'قيد الدوام'}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">ساعات العمل:</span>
                  <span class="font-mono font-bold text-slate-900 dark:text-white">${rec.actualHours || 0} س</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">التأخير الصباحي:</span>
                  <span class="font-mono font-bold ${rec.lateMinutes > 15 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}">${rec.lateMinutes || 0} د</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">موقع البصمة (GPS):</span>
                  <span class="font-mono font-bold text-blue-600 dark:text-blue-400">${rec.location_coords ? `${rec.location_coords.lat}, ${rec.location_coords.lng}` : 'كشك البصمة'}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">دقة وتحديد الموقع:</span>
                  <span class="font-semibold text-slate-800 dark:text-slate-200">${rec.location_coords?.label ? escapeHTML(rec.location_coords.label) : 'محطة مركزية'}</span>
                </div>
              </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">العمل الإضافي:</span>
                  <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">${rec.overtimeHours || 0} س</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">الملاحظات:</span>
                  <span class="font-medium text-slate-700 dark:text-slate-300 truncate block">${escapeHTML(rec.notes || 'لا توجد ملاحظات')}</span>
                </div>
              </div>
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button class="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm" data-action="view-att-details" data-id="${escapeHTML(rec.id)}">
                  <i class="fa-solid fa-eye text-xs"></i>
                  <span>البطاقة الكاملة</span>
                </button>
                <button class="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 font-bold text-xs flex items-center gap-1.5 transition-colors" data-action="edit-attendance" data-id="${escapeHTML(rec.id)}">
                  <i class="fa-solid fa-pen-to-square text-xs"></i>
                  <span>تعديل البصمة</span>
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openManualEditModal(rec) {
    const modal = document.getElementById('manualPunchModal');
    document.getElementById('manualPunchId').value = rec.id;
    document.getElementById('manualPunchEmpSelect').value = rec.employeeId;
    document.getElementById('manualPunchDate').value = rec.date;
    document.getElementById('manualPunchCheckIn').value = rec.checkIn ? rec.checkIn.substring(0, 5) : '';
    document.getElementById('manualPunchCheckOut').value = rec.checkOut ? rec.checkOut.substring(0, 5) : '';
    document.getElementById('manualPunchLateMins').value = rec.lateMinutes || 0;
    document.getElementById('manualPunchEarlyMins').value = rec.earlyLeaveMinutes || 0;
    document.getElementById('manualPunchOtHours').value = rec.overtimeHours || 0;
    document.getElementById('manualPunchNotes').value = rec.notes || '';
    modal?.classList.remove('hidden');
  }

  /* ==========================================================================
     13. MODULE 4: EMPLOYEES MANAGEMENT CONTROLLER (Debounced Search)
     ========================================================================== */

  function setupEmployeesManagement() {
    const searchInput = document.getElementById('employeeSearchInput');
    const deptFilter = document.getElementById('employeeDeptFilter');
    const openAddBtn = document.getElementById('openAddEmployeeModalBtn');
    const modal = document.getElementById('employeeModal');
    const closeBtn = document.getElementById('closeEmployeeModalBtn');
    const cancelBtn = document.getElementById('cancelEmployeeModalBtn');
    const form = document.getElementById('employeeForm');
    const genPinBtn = document.getElementById('generatePinBtn');

    // Debounced search to prevent unnecessary reflows
    const debouncedRenderEmployees = debounce(() => renderEmployeesTable(), 200);
    searchInput?.addEventListener('input', debouncedRenderEmployees);
    deptFilter?.addEventListener('change', () => renderEmployeesTable());

    openAddBtn?.addEventListener('click', () => {
      form?.reset();
      document.getElementById('empFormId').value = '';
      document.getElementById('employeeModalTitle').textContent = 'إضافة موظف جديد';
      document.getElementById('empFormPin').value = generateRandom6DigitPin();
      if (document.getElementById('empFormRole')) document.getElementById('empFormRole').value = 'employee';
      if (document.getElementById('empFormEmail')) document.getElementById('empFormEmail').value = '';
      if (document.getElementById('empFormSalesTarget')) document.getElementById('empFormSalesTarget').value = 0;
      if (document.getElementById('empFormCommissionRate')) document.getElementById('empFormCommissionRate').value = 0;
      modal?.classList.remove('hidden');
    });

    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
    cancelBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

    genPinBtn?.addEventListener('click', () => {
      sound.playClick();
      document.getElementById('empFormPin').value = generateRandom6DigitPin();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const empId = document.getElementById('empFormId').value;
      const empPayload = {
        fullName: document.getElementById('empFormFullName').value,
        department: document.getElementById('empFormDept').value,
        jobTitle: document.getElementById('empFormJobTitle').value,
        role: document.getElementById('empFormRole')?.value || 'employee',
        email: document.getElementById('empFormEmail')?.value || '',
        hireDate: document.getElementById('empFormHireDate').value,
        shiftStart: document.getElementById('empFormShiftStart').value,
        shiftEnd: document.getElementById('empFormShiftEnd').value,
        pin: document.getElementById('empFormPin').value,
        baseSalary: Number(document.getElementById('empFormBaseSalary').value || 0),
        housingAllowance: Number(document.getElementById('empFormHousing').value || 0),
        transportAllowance: Number(document.getElementById('empFormTransport').value || 0),
        otherAllowances: Number(document.getElementById('empFormOther').value || 0),
        insurancePercent: Number(document.getElementById('empFormInsurance').value || 11),
        phone: document.getElementById('empFormPhone').value,
        salesTarget: Number(document.getElementById('empFormSalesTarget')?.value || 0),
        commissionRate: Number(document.getElementById('empFormCommissionRate')?.value || 0)
      };

      let res;
      if (empId) {
        res = await ApiService.updateEmployee(empId, empPayload);
      } else {
        res = await ApiService.createEmployee(empPayload);
      }

      if (res.success) {
        sound.playSuccess();
        showToast(empId ? 'تم تحديث بيانات الموظف بنجاح' : 'تمت إضافة الموظف الجديد بنجاح', 'success');
        modal?.classList.add('hidden');
        await loadEmployees();
        populateAuthBioSelect();
        renderEmployeesTable();
      } else {
        sound.playError();
        showToast(res.message, 'error');
      }
    });

    // Event Delegation on Employees Table
    const tbody = document.getElementById('employeesTableBody');
    tbody?.addEventListener('click', async (e) => {
      const viewBtn = e.target.closest('[data-action="view-emp-details"]');
      if (viewBtn) {
        const id = viewBtn.dataset.id;
        const emp = store.state.employees.find(e => e.id === id);
        if (emp) showQuickDetails('employee', emp);
        return;
      }

      const editBtn = e.target.closest('[data-action="edit-employee"]');
      if (editBtn) {
        const id = editBtn.dataset.id;
        const emp = store.state.employees.find(e => e.id === id);
        if (emp) openEditEmployeeModal(emp);
        return;
      }

      const delBtn = e.target.closest('[data-action="delete-employee"]');
      if (delBtn) {
        const id = delBtn.dataset.id;
        const emp = store.state.employees.find(e => e.id === id);
        if (!emp) return;
        if (confirm(`هل أنت متأكد من حذف الموظف (${emp.fullName}) نهائياً من النظام؟`)) {
          const res = await ApiService.deleteEmployee(id);
          if (res.success) {
            sound.playSuccess();
            showToast('تم حذف الموظف بنجاح', 'success');
            await loadEmployees();
            populateAuthBioSelect();
            renderEmployeesTable();
          }
        }
      }
    });
  }

  function generateRandom6DigitPin() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function renderEmployeesTable() {
    const query = (document.getElementById('employeeSearchInput')?.value || '').trim().toLowerCase();
    const dept = document.getElementById('employeeDeptFilter')?.value || 'all';
    const tbody = document.getElementById('employeesTableBody');
    if (!tbody) return;

    let filtered = [...store.state.employees];
    if (query) {
      filtered = filtered.filter(e => 
        e.fullName.toLowerCase().includes(query) || 
        e.id.toLowerCase().includes(query) || 
        e.jobTitle.toLowerCase().includes(query)
      );
    }
    if (dept !== 'all') {
      filtered = filtered.filter(e => e.department === dept);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-xs text-slate-500 dark:text-slate-400 font-medium">لا يوجد موظفون مطابقون لبحثك</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((emp, idx) => {
      const allowancesTotal = (emp.housingAllowance || 0) + (emp.transportAllowance || 0) + (emp.otherAllowances || 0);
      const childId = `emp-child-${emp.id || idx}`;

      let rolePill = '';
      if (emp.role === 'admin') {
        rolePill = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">مدير نظام</span>';
      } else if (emp.role === 'hr') {
        rolePill = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">HR</span>';
      } else {
        rolePill = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">موظف</span>';
      }

      return `
        <tr class="table-parent-row bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer md:cursor-default" data-child-id="${childId}">
          <td class="p-2 sm:p-2.5 font-bold text-slate-900 dark:text-white">
            <div class="flex items-center gap-2">
              <img src="${escapeHTML(emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')}" alt="${escapeHTML(emp.fullName)}" class="w-8 h-8 rounded-full object-cover border border-slate-300 dark:border-slate-700 shrink-0">
              <div class="min-w-0">
                <div class="text-slate-900 dark:text-white font-bold text-xs sm:text-sm truncate max-w-[130px] sm:max-w-none">${escapeHTML(emp.fullName)}</div>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-bold tabular-nums num-display">${escapeHTML(emp.id)}</span>
                  ${rolePill}
                </div>
              </div>
            </div>
          </td>
          <td class="p-2 sm:p-2.5 text-slate-700 dark:text-slate-300 hidden md:table-cell">
            <div class="font-bold text-slate-900 dark:text-white text-xs">${escapeHTML(emp.department)}</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400">${escapeHTML(emp.jobTitle)}</div>
          </td>
          <td class="p-2 sm:p-2.5 font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm tabular-nums num-display hidden lg:table-cell">
            ${formatCurrency(emp.baseSalary + allowancesTotal)}
          </td>
          <td class="p-2 sm:p-2.5">
            <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">نشط</span>
          </td>
          <td class="p-2 sm:p-2.5 text-center hidden md:table-cell">
            <div class="flex items-center justify-center gap-1.5">
              <button class="view-details-btn" data-action="view-emp-details" data-id="${escapeHTML(emp.id)}" title="عرض كافة تفاصيل الموظف المخفية" aria-label="عرض تفاصيل الموظف">
                <i class="fa-solid fa-eye text-xs" aria-hidden="true"></i>
              </button>
              <button class="edit-emp-btn p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold" data-action="edit-employee" data-id="${escapeHTML(emp.id)}" title="تعديل" aria-label="تعديل الموظف">
                <i class="fa-solid fa-pen-to-square text-xs" aria-hidden="true"></i>
              </button>
              <button class="del-emp-btn p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-200 text-xs font-bold" data-action="delete-employee" data-id="${escapeHTML(emp.id)}" title="حذف" aria-label="حذف الموظف">
                <i class="fa-solid fa-trash text-xs" aria-hidden="true"></i>
              </button>
            </div>
          </td>
          <td class="p-2 sm:p-2.5 text-center md:hidden">
            <button class="row-expand-btn" data-action="toggle-child-row" data-target="${childId}" title="عرض البيانات المخفية" aria-label="عرض البيانات المخفية">
              <i class="fa-solid fa-chevron-down text-xs"></i>
            </button>
          </td>
        </tr>
        <tr id="${childId}" class="responsive-child-row hidden bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <td colspan="6" class="p-2.5 sm:p-3">
            <div class="responsive-child-card p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5">
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">القسم والمسمى:</span>
                  <span class="font-bold text-slate-900 dark:text-white">${escapeHTML(emp.department)} • ${escapeHTML(emp.jobTitle)}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">الصلاحية:</span>
                  <span class="font-bold text-blue-600 dark:text-blue-400">${emp.role === 'admin' ? 'مدير نظام (Super Admin)' : emp.role === 'hr' ? 'مسؤول موارد بشرية (HR)' : 'موظف (Employee)'}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">الراتب الأساسي:</span>
                  <span class="font-mono font-bold text-slate-900 dark:text-white">${formatCurrency(emp.baseSalary)}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">إجمالي البدلات:</span>
                  <span class="font-mono font-bold text-slate-900 dark:text-white">${formatCurrency(allowancesTotal)}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">تارجت المبيعات:</span>
                  <span class="font-mono font-bold text-amber-600 dark:text-amber-400">${formatCurrency(emp.salesTarget || 0)} (${emp.commissionRate || 0}%)</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">رمز PIN البصمة:</span>
                  <span class="font-mono font-black text-blue-600 dark:text-blue-400">${escapeHTML(emp.pin)}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">البريد الإلكتروني:</span>
                  <span class="font-medium text-slate-800 dark:text-slate-200 truncate block">${escapeHTML(emp.email || 'غير مسجل')}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">الهاتف:</span>
                  <span class="font-mono text-slate-700 dark:text-slate-300">${escapeHTML(emp.phone || 'غير مسجل')}</span>
                </div>
              </div>
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button class="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm" data-action="view-emp-details" data-id="${escapeHTML(emp.id)}">
                  <i class="fa-solid fa-eye text-xs"></i>
                  <span>الملف الشامل</span>
                </button>
                <button class="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 font-bold text-xs flex items-center gap-1.5 transition-colors" data-action="edit-employee" data-id="${escapeHTML(emp.id)}">
                  <i class="fa-solid fa-pen-to-square text-xs"></i>
                  <span>تعديل</span>
                </button>
                <button class="px-2.5 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-200 font-bold text-xs flex items-center gap-1.5 transition-colors" data-action="delete-employee" data-id="${escapeHTML(emp.id)}">
                  <i class="fa-solid fa-trash text-xs"></i>
                  <span>حذف</span>
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openEditEmployeeModal(emp) {
    const modal = document.getElementById('employeeModal');
    document.getElementById('employeeModalTitle').textContent = `تعديل بيانات الموظف (${emp.fullName})`;
    document.getElementById('empFormId').value = emp.id;
    document.getElementById('empFormFullName').value = emp.fullName;
    document.getElementById('empFormDept').value = emp.department;
    document.getElementById('empFormJobTitle').value = emp.jobTitle;
    if (document.getElementById('empFormRole')) document.getElementById('empFormRole').value = emp.role || 'employee';
    if (document.getElementById('empFormEmail')) document.getElementById('empFormEmail').value = emp.email || '';
    document.getElementById('empFormHireDate').value = emp.hireDate || '2023-01-01';
    document.getElementById('empFormShiftStart').value = emp.shiftStart || '08:00';
    document.getElementById('empFormShiftEnd').value = emp.shiftEnd || '16:00';
    document.getElementById('empFormPin').value = emp.pin;
    document.getElementById('empFormBaseSalary').value = emp.baseSalary;
    document.getElementById('empFormHousing').value = emp.housingAllowance || 0;
    document.getElementById('empFormTransport').value = emp.transportAllowance || 0;
    document.getElementById('empFormOther').value = emp.otherAllowances || 0;
    document.getElementById('empFormInsurance').value = emp.insurancePercent || 11;
    document.getElementById('empFormPhone').value = emp.phone || '';
    if (document.getElementById('empFormSalesTarget')) document.getElementById('empFormSalesTarget').value = emp.salesTarget || 0;
    if (document.getElementById('empFormCommissionRate')) document.getElementById('empFormCommissionRate').value = emp.commissionRate || 0;
    modal?.classList.remove('hidden');
  }

  /* ==========================================================================
     14. MODULE 5: LEAVES, PERMISSIONS & FINANCIAL ADJUSTMENTS (Event Delegation)
     ========================================================================== */

  function setupLeavesAndAdjustments() {
    // Sub-tabs
    const subTabs = document.querySelectorAll('.sub-tab');
    const panes = document.querySelectorAll('.subtab-pane');

    subTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        sound.playClick();
        const target = tab.dataset.subtab;
        store.state.activeSubTab = target;

        subTabs.forEach(t => {
          t.classList.remove('active', 'bg-slate-200', 'dark:bg-slate-800', 'text-blue-600', 'dark:text-blue-400', 'font-bold');
          t.classList.add('text-slate-700', 'dark:text-slate-300');
        });
        tab.classList.add('active', 'bg-slate-200', 'dark:bg-slate-800', 'text-blue-600', 'dark:text-blue-400', 'font-bold');
        tab.classList.remove('text-slate-700', 'dark:text-slate-300');

        panes.forEach(p => {
          if (p.id === target) {
            p.classList.remove('hidden');
            p.classList.add('block');
          } else {
            p.classList.add('hidden');
            p.classList.remove('block');
          }
        });
      });
    });

    // 1. Leave Modal Setup
    const openLeaveBtn = document.getElementById('openNewLeaveModalBtn');
    const leaveModal = document.getElementById('newLeaveModal');
    const closeLeaveBtn = document.getElementById('closeNewLeaveModalBtn');
    const cancelLeaveBtn = document.getElementById('cancelNewLeaveModalBtn');
    const leaveForm = document.getElementById('newLeaveForm');

    openLeaveBtn?.addEventListener('click', () => {
      leaveForm?.reset();
      leaveModal?.classList.remove('hidden');
    });
    closeLeaveBtn?.addEventListener('click', () => leaveModal?.classList.add('hidden'));
    cancelLeaveBtn?.addEventListener('click', () => leaveModal?.classList.add('hidden'));

    leaveForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        employeeId: document.getElementById('leaveFormEmpSelect').value,
        leaveType: document.getElementById('leaveFormType').value,
        daysCount: Number(document.getElementById('leaveFormDays').value || 1),
        startDate: document.getElementById('leaveFormStartDate').value,
        endDate: document.getElementById('leaveFormEndDate').value,
        reason: document.getElementById('leaveFormReason').value,
        status: 'approved',
        approvedBy: 'مدير الموارد البشرية'
      };

      const res = await ApiService.createLeave(payload);
      if (res.success) {
        sound.playSuccess();
        showToast('تم تسجيل الإجازة واعتمادها بنجاح', 'success');
        leaveModal?.classList.add('hidden');
        await loadLeaves();
        renderLeavesTable();
      }
    });

    // 2. Permission Modal Setup
    const openPermBtn = document.getElementById('openNewPermissionModalBtn');
    const permModal = document.getElementById('newPermissionModal');
    const closePermBtn = document.getElementById('closeNewPermissionModalBtn');
    const cancelPermBtn = document.getElementById('cancelNewPermissionModalBtn');
    const permForm = document.getElementById('newPermissionForm');

    openPermBtn?.addEventListener('click', () => {
      permForm?.reset();
      permModal?.classList.remove('hidden');
    });
    closePermBtn?.addEventListener('click', () => permModal?.classList.add('hidden'));
    cancelPermBtn?.addEventListener('click', () => permModal?.classList.add('hidden'));

    permForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        employeeId: document.getElementById('permFormEmpSelect').value,
        permissionType: document.getElementById('permFormType').value,
        hours: Number(document.getElementById('permFormHours').value || 1),
        date: document.getElementById('permFormDate').value,
        reason: document.getElementById('permFormReason').value,
        status: 'approved',
        approvedBy: 'المشرف المباشر'
      };

      const res = await ApiService.createPermission(payload);
      if (res.success) {
        sound.playSuccess();
        showToast('تم اعتماد إذن الدوام بنجاح', 'success');
        permModal?.classList.add('hidden');
        await loadPermissions();
        renderPermissionsTable();
      }
    });

    // 3. Financial Adjustment Modal Setup
    const openAdjBtn = document.getElementById('openNewAdjustmentModalBtn');
    const adjModal = document.getElementById('newAdjustmentModal');
    const closeAdjBtn = document.getElementById('closeNewAdjustmentModalBtn');
    const cancelAdjBtn = document.getElementById('cancelNewAdjustmentModalBtn');
    const adjForm = document.getElementById('newAdjustmentForm');
    const adjTypeSelect = document.getElementById('adjFormType');
    const adjCalcModeSelect = document.getElementById('adjFormCalcMode');
    const adjPenaltyRow = document.getElementById('adjPenaltyCalcModeRow');
    const adjDayFractionBox = document.getElementById('adjDayFractionBox');
    const adjValueBox = document.getElementById('adjValueBox');

    const toggleAdjFields = () => {
      const type = adjTypeSelect?.value;
      if (type === 'penalty') {
        adjPenaltyRow?.classList.remove('hidden');
        if (adjCalcModeSelect?.value === 'day_fraction') {
          adjDayFractionBox?.classList.remove('hidden');
          adjValueBox?.classList.add('hidden');
        } else {
          adjDayFractionBox?.classList.add('hidden');
          adjValueBox?.classList.remove('hidden');
        }
      } else {
        adjPenaltyRow?.classList.add('hidden');
        adjDayFractionBox?.classList.add('hidden');
        adjValueBox?.classList.remove('hidden');
      }
    };

    adjTypeSelect?.addEventListener('change', toggleAdjFields);
    adjCalcModeSelect?.addEventListener('change', toggleAdjFields);

    openAdjBtn?.addEventListener('click', () => {
      adjForm?.reset();
      toggleAdjFields();
      adjModal?.classList.remove('hidden');
    });
    closeAdjBtn?.addEventListener('click', () => adjModal?.classList.add('hidden'));
    cancelAdjBtn?.addEventListener('click', () => adjModal?.classList.add('hidden'));

    adjForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const type = adjTypeSelect.value;
      const isDayFrac = type === 'penalty' && adjCalcModeSelect.value === 'day_fraction';

      const payload = {
        employeeId: document.getElementById('adjFormEmpSelect').value,
        month: document.getElementById('adjFormMonth').value,
        type: type,
        calculationMode: isDayFrac ? 'day_fraction' : 'fixed_amount',
        daysFraction: isDayFrac ? Number(document.getElementById('adjFormDaysFraction').value) : 0,
        value: isDayFrac ? 0 : Number(document.getElementById('adjFormValue').value || 0),
        description: document.getElementById('adjFormDesc').value
      };

      const res = await ApiService.createAdjustment(payload);
      if (res.success) {
        sound.playSuccess();
        showToast('تم تسجيل التسوية المالية بنجاح', 'success');
        adjModal?.classList.add('hidden');
        await loadAdjustments();
        renderAdjustmentsTable();
      }
    });

    // Event Delegation on Leaves Table
    const leavesTbody = document.getElementById('leavesTableBody');
    leavesTbody?.addEventListener('click', async (e) => {
      const viewBtn = e.target.closest('[data-action="view-leave-details"]');
      if (viewBtn) {
        const l = store.state.leaves.find(x => x.id === viewBtn.dataset.id);
        if (l) showQuickDetails('leave', l);
        return;
      }

      const approveBtn = e.target.closest('[data-action="approve-leave"]');
      if (approveBtn) {
        await ApiService.updateLeaveStatus(approveBtn.dataset.id, 'approved');
        sound.playSuccess();
        showToast('تم اعتماد طلب الإجازة', 'success');
        await loadLeaves();
        renderLeavesTable();
        return;
      }

      const rejectBtn = e.target.closest('[data-action="reject-leave"]');
      if (rejectBtn) {
        await ApiService.updateLeaveStatus(rejectBtn.dataset.id, 'rejected');
        sound.playError();
        showToast('تم رفض طلب الإجازة', 'info');
        await loadLeaves();
        renderLeavesTable();
      }
    });

    // Event Delegation on Permissions Table
    const permTbody = document.getElementById('permissionsTableBody');
    permTbody?.addEventListener('click', (e) => {
      const viewBtn = e.target.closest('[data-action="view-perm-details"]');
      if (viewBtn) {
        const p = store.state.permissions.find(x => x.id === viewBtn.dataset.id);
        if (p) showQuickDetails('permission', p);
      }
    });

    // Event Delegation on Adjustments Table
    const adjTbody = document.getElementById('adjustmentsTableBody');
    adjTbody?.addEventListener('click', async (e) => {
      const viewBtn = e.target.closest('[data-action="view-adj-details"]');
      if (viewBtn) {
        const a = store.state.adjustments.find(x => x.id === viewBtn.dataset.id);
        if (a) showQuickDetails('adjustment', a);
        return;
      }

      const delBtn = e.target.closest('[data-action="delete-adjustment"]');
      if (delBtn) {
        if (confirm('هل أنت متأكد من حذف هذه التسوية المالية؟')) {
          await ApiService.deleteAdjustment(delBtn.dataset.id);
          sound.playSuccess();
          showToast('تم حذف التسوية بنجاح', 'success');
          await loadAdjustments();
          renderAdjustmentsTable();
        }
      }
    });
  }

  function renderLeavesAndAdjustments() {
    renderLeavesTable();
    renderPermissionsTable();
    renderAdjustmentsTable();
  }

  function renderLeavesTable() {
    const tbody = document.getElementById('leavesTableBody');
    if (!tbody) return;

    if (store.state.leaves.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-xs text-slate-500 dark:text-slate-400 font-medium">لا توجد طلبات إجازة مسجلة</td></tr>`;
      return;
    }

    tbody.innerHTML = store.state.leaves.map((l, idx) => {
      let typeLabel = '';
      let salaryImpact = '';
      if (l.leaveType === 'annual') {
        typeLabel = '<span class="font-bold text-blue-600 dark:text-blue-400">إجازة سنوية</span>';
        salaryImpact = '<span class="text-emerald-600 dark:text-emerald-400 font-bold">مدفوعة بالكامل</span>';
      } else if (l.leaveType === 'sick') {
        typeLabel = '<span class="font-bold text-emerald-600 dark:text-emerald-400">إجازة مرضية</span>';
        salaryImpact = '<span class="text-emerald-600 dark:text-emerald-400 font-bold">مدفوعة بالكامل</span>';
      } else if (l.leaveType === 'emergency') {
        typeLabel = '<span class="font-bold text-amber-600 dark:text-amber-400">إجازة طارئة</span>';
        salaryImpact = '<span class="text-emerald-600 dark:text-emerald-400 font-bold">مدفوعة</span>';
      } else {
        typeLabel = '<span class="font-bold text-rose-600 dark:text-rose-400">بدون راتب</span>';
        salaryImpact = `<span class="text-rose-600 dark:text-rose-400 font-bold tabular-nums num-display">تخصم تلقائياً</span>`;
      }

      const isApproved = l.status === 'approved';
      const childId = `leave-child-${l.id || idx}`;

      return `
        <tr class="table-parent-row bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer md:cursor-default" data-child-id="${childId}">
          <td class="p-2 sm:p-2.5 font-bold text-slate-900 dark:text-white">
            <div class="text-xs sm:text-sm font-bold truncate max-w-[130px] sm:max-w-none">${escapeHTML(l.employeeName)}</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-bold tabular-nums num-display">${escapeHTML(l.employeeId)}</div>
          </td>
          <td class="p-2 sm:p-2.5 hidden md:table-cell">
            <div class="text-xs font-bold">${typeLabel}</div>
            <div class="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5 tabular-nums num-display">${l.daysCount} يوم (${escapeHTML(l.startDate)})</div>
          </td>
          <td class="p-2 sm:p-2.5 hidden lg:table-cell text-xs font-bold">${salaryImpact}</td>
          <td class="p-2 sm:p-2.5">
            <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${isApproved ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}">
              ${isApproved ? 'معتمدة' : 'قيد الانتظار'}
            </span>
          </td>
          <td class="p-2 sm:p-2.5 text-center hidden md:table-cell">
            <div class="flex items-center justify-center gap-1.5">
              <button class="view-details-btn" data-action="view-leave-details" data-id="${escapeHTML(l.id)}" title="عرض تفاصيل الإجازة والمبرر" aria-label="عرض تفاصيل الإجازة">
                <i class="fa-solid fa-eye text-xs" aria-hidden="true"></i>
              </button>
              ${isApproved ? '' : `
                <button class="approve-leave-btn px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold" data-action="approve-leave" data-id="${escapeHTML(l.id)}">اعتماد</button>
                <button class="reject-leave-btn px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold" data-action="reject-leave" data-id="${escapeHTML(l.id)}">رفض</button>
              `}
            </div>
          </td>
          <td class="p-2 sm:p-2.5 text-center md:hidden">
            <button class="row-expand-btn" data-action="toggle-child-row" data-target="${childId}" title="عرض البيانات المخفية" aria-label="عرض البيانات المخفية">
              <i class="fa-solid fa-chevron-down text-xs"></i>
            </button>
          </td>
        </tr>
        <tr id="${childId}" class="responsive-child-row hidden bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <td colspan="6" class="p-2.5 sm:p-3">
            <div class="responsive-child-card p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5">
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">نوع الإجازة:</span>
                  <div class="mt-0.5">${typeLabel}</div>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">المدة:</span>
                  <span class="font-mono font-bold text-slate-900 dark:text-white">${l.daysCount} يوم</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">تاريخ البدء:</span>
                  <span class="font-mono font-bold text-slate-900 dark:text-white">${escapeHTML(l.startDate)}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">تاريخ العودة:</span>
                  <span class="font-mono font-bold text-slate-900 dark:text-white">${escapeHTML(l.endDate || l.startDate)}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">أثر الراتب:</span>
                  <div class="mt-0.5">${salaryImpact}</div>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">الحالة الحالية:</span>
                  <span class="font-bold ${isApproved ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}">${isApproved ? 'معتمدة رسمياً' : 'قيد انتظار الاعتماد'}</span>
                </div>
                <div class="col-span-2">
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">المبرر / الملاحظات:</span>
                  <span class="text-slate-700 dark:text-slate-300 font-medium">${escapeHTML(l.reason || 'لا يوجد مبرر مدون')}</span>
                </div>
              </div>
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button class="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm" data-action="view-leave-details" data-id="${escapeHTML(l.id)}">
                  <i class="fa-solid fa-eye text-xs"></i>
                  <span>تفاصيل الإجازة</span>
                </button>
                ${isApproved ? '' : `
                  <button class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors" data-action="approve-leave" data-id="${escapeHTML(l.id)}">اعتماد</button>
                  <button class="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors" data-action="reject-leave" data-id="${escapeHTML(l.id)}">رفض</button>
                `}
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderPermissionsTable() {
    const tbody = document.getElementById('permissionsTableBody');
    if (!tbody) return;

    if (store.state.permissions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-xs text-slate-500 dark:text-slate-400 font-medium">لا توجد أذونات دوام مسجلة</td></tr>`;
      return;
    }

    tbody.innerHTML = store.state.permissions.map((p, idx) => {
      const isMorning = p.permissionType === 'morning_delay';
      const childId = `perm-child-${p.id || idx}`;

      return `
        <tr class="table-parent-row bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer md:cursor-default" data-child-id="${childId}">
          <td class="p-2 sm:p-2.5 font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate max-w-[130px] sm:max-w-none">${escapeHTML(p.employeeName)}</td>
          <td class="p-2 sm:p-2.5 hidden md:table-cell">
            <div class="text-xs font-bold ${isMorning ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}">${isMorning ? 'تأخير صباحي' : 'انصراف مبكر'}</div>
            <div class="text-[11px] font-mono text-slate-600 dark:text-slate-400 tabular-nums num-display">${escapeHTML(p.date)}</div>
          </td>
          <td class="p-2 sm:p-2.5 hidden lg:table-cell text-xs">
            <span class="font-mono font-bold text-slate-900 dark:text-white tabular-nums num-display">${p.hours} ساعة</span>
            <span class="text-emerald-600 dark:text-emerald-400 block text-[11px] font-semibold">معفى من الحسم</span>
          </td>
          <td class="p-2 sm:p-2.5">
            <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">معتمد</span>
          </td>
          <td class="p-2 sm:p-2.5 text-center hidden md:table-cell">
            <button class="view-details-btn" data-action="view-perm-details" data-id="${escapeHTML(p.id)}" title="عرض تفاصيل الإذن" aria-label="عرض تفاصيل الإذن">
              <i class="fa-solid fa-eye text-xs" aria-hidden="true"></i>
            </button>
          </td>
          <td class="p-2 sm:p-2.5 text-center md:hidden">
            <button class="row-expand-btn" data-action="toggle-child-row" data-target="${childId}" title="عرض البيانات المخفية" aria-label="عرض البيانات المخفية">
              <i class="fa-solid fa-chevron-down text-xs"></i>
            </button>
          </td>
        </tr>
        <tr id="${childId}" class="responsive-child-row hidden bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <td colspan="6" class="p-2.5 sm:p-3">
            <div class="responsive-child-card p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5">
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">نوع الإذن:</span>
                  <span class="font-bold ${isMorning ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}">${isMorning ? 'تأخير صباحي' : 'انصراف مبكر'}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">تاريخ الإذن:</span>
                  <span class="font-mono font-bold text-slate-900 dark:text-white">${escapeHTML(p.date)}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">مدة الإذن:</span>
                  <span class="font-mono font-bold text-slate-900 dark:text-white">${p.hours} ساعة</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">أثر الراتب:</span>
                  <span class="text-emerald-600 dark:text-emerald-400 font-bold">معفى من الحسم</span>
                </div>
                <div class="col-span-2">
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">المبرر:</span>
                  <span class="text-slate-700 dark:text-slate-300 font-medium">${escapeHTML(p.reason || 'إذن عمل رسمي موثق')}</span>
                </div>
              </div>
              <div class="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button class="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm" data-action="view-perm-details" data-id="${escapeHTML(p.id)}">
                  <i class="fa-solid fa-eye text-xs"></i>
                  <span>عرض تفاصيل الإذن</span>
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderAdjustmentsTable() {
    const tbody = document.getElementById('adjustmentsTableBody');
    if (!tbody) return;

    if (store.state.adjustments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-xs text-slate-500 dark:text-slate-400 font-medium">لا توجد تسويات مالية مسجلة لهذا الشهر</td></tr>`;
      return;
    }

    tbody.innerHTML = store.state.adjustments.map((a, idx) => {
      let typeBadge = '';
      if (a.type === 'loan') {
        typeBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">سلفة</span>';
      } else if (a.type === 'bonus') {
        typeBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">مكافأة</span>';
      } else {
        typeBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">جزاء</span>';
      }

      const valDisplay = a.calculationMode === 'day_fraction' ? 
        `<span class="font-extrabold font-mono text-amber-600 dark:text-amber-400 text-xs tabular-nums num-display">${a.daysFraction} يوم عمل</span>` : 
        `<span class="font-extrabold font-mono text-slate-900 dark:text-white text-xs tabular-nums num-display">${formatCurrency(a.value)}</span>`;

      const childId = `adj-child-${a.id || idx}`;

      return `
        <tr class="table-parent-row bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer md:cursor-default" data-child-id="${childId}">
          <td class="p-2 sm:p-2.5 font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate max-w-[130px] sm:max-w-none">${escapeHTML(a.employeeName)}</td>
          <td class="p-2 sm:p-2.5 hidden md:table-cell">
            <div>${typeBadge}</div>
            <div class="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5 tabular-nums num-display">${escapeHTML(a.month)}</div>
          </td>
          <td class="p-2 sm:p-2.5 text-xs">
            <div class="md:hidden mb-0.5">${typeBadge}</div>
            ${valDisplay}
          </td>
          <td class="p-2 sm:p-2.5 hidden lg:table-cell text-xs text-slate-700 dark:text-slate-300 font-medium truncate max-w-xs">${escapeHTML(a.description)}</td>
          <td class="p-2 sm:p-2.5 text-center hidden md:table-cell">
            <div class="flex items-center justify-center gap-1.5">
              <button class="view-details-btn" data-action="view-adj-details" data-id="${escapeHTML(a.id)}" title="عرض تفاصيل التسوية" aria-label="عرض تفاصيل التسوية">
                <i class="fa-solid fa-eye text-xs" aria-hidden="true"></i>
              </button>
              <button class="del-adj-btn p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30" data-action="delete-adjustment" data-id="${escapeHTML(a.id)}" title="حذف" aria-label="حذف التسوية">
                <i class="fa-solid fa-trash text-xs" aria-hidden="true"></i>
              </button>
            </div>
          </td>
          <td class="p-2 sm:p-2.5 text-center md:hidden">
            <button class="row-expand-btn" data-action="toggle-child-row" data-target="${childId}" title="عرض البيانات المخفية" aria-label="عرض البيانات المخفية">
              <i class="fa-solid fa-chevron-down text-xs"></i>
            </button>
          </td>
        </tr>
        <tr id="${childId}" class="responsive-child-row hidden bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <td colspan="6" class="p-2.5 sm:p-3">
            <div class="responsive-child-card p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5">
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">نوع التسوية:</span>
                  <div class="mt-0.5">${typeBadge}</div>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">شهر التطبيق:</span>
                  <span class="font-mono font-bold text-slate-900 dark:text-white">${escapeHTML(a.month)}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">القيمة المحسوبة:</span>
                  <div class="mt-0.5">${valDisplay}</div>
                </div>
                <div class="col-span-2">
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">البيان والسبب:</span>
                  <span class="text-slate-700 dark:text-slate-300 font-medium">${escapeHTML(a.description || 'لا يوجد بيان')}</span>
                </div>
              </div>
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button class="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm" data-action="view-adj-details" data-id="${escapeHTML(a.id)}">
                  <i class="fa-solid fa-eye text-xs"></i>
                  <span>تفاصيل كاملة</span>
                </button>
                <button class="px-2.5 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-200 font-bold text-xs flex items-center gap-1.5 transition-colors" data-action="delete-adjustment" data-id="${escapeHTML(a.id)}">
                  <i class="fa-solid fa-trash text-xs"></i>
                  <span>حذف التسوية</span>
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /* ==========================================================================
     15. MODULE 6: PAYROLL ENGINE, CSV EXPORT & PRINTABLE PAYSLIPS
     ========================================================================== */

  function setupPayrollEngine() {
    const monthPicker = document.getElementById('payrollMonthPicker');
    const refreshBtn = document.getElementById('refreshPayrollBtn');
    const exportCsvBtn = document.getElementById('exportPayrollCsvBtn');

    monthPicker?.addEventListener('change', () => {
      store.state.currentMonth = monthPicker.value;
      renderPayrollModule();
    });

    refreshBtn?.addEventListener('click', () => {
      sound.playClick();
      renderPayrollModule();
      showToast('تمت إعادة احتساب مسير الرواتب بنجاح', 'success');
    });

    exportCsvBtn?.addEventListener('click', () => {
      exportPayrollToCSV();
    });

    // Payslip Modal controls
    const payslipModal = document.getElementById('payslipModal');
    const closeSlipBtn = document.getElementById('closePayslipModalBtn');
    const printSlipBtn = document.getElementById('printPayslipBtn');

    closeSlipBtn?.addEventListener('click', () => payslipModal?.classList.add('hidden'));
    printSlipBtn?.addEventListener('click', () => {
      window.print();
    });

    // Event Delegation on Payroll Master Table
    const tbody = document.getElementById('payrollTableBody');
    tbody?.addEventListener('click', (e) => {
      const detailsBtn = e.target.closest('[data-action="view-payroll-details"]');
      if (detailsBtn) {
        sound.playClick();
        const empId = detailsBtn.dataset.empid;
        const report = store.state.currentPayrollData?.payrollReport ?? [];
        const itemData = report.find(r => r.employee.id === empId);
        if (itemData) {
          showQuickDetails('payroll', itemData);
        }
        return;
      }

      const slipBtn = e.target.closest('[data-action="view-payslip"]');
      if (slipBtn) {
        sound.playClick();
        const empId = slipBtn.dataset.empid;
        const report = store.state.currentPayrollData?.payrollReport ?? [];
        const slipData = report.find(r => r.employee.id === empId);
        if (slipData) {
          openPayslipModal(slipData);
        }
      }
    });
  }

  async function renderPayrollModule() {
    const res = await ApiService.calculateMonthlyPayroll(store.state.currentMonth);
    if (!res.success) return;

    store.state.currentPayrollData = res;
    const summary = res.summary;
    const report = res.payrollReport;

    // Summary KPIs
    document.getElementById('payrollSummaryGross').textContent = formatCurrency(summary.totalGross);
    document.getElementById('payrollSummaryDeductions').textContent = formatCurrency(summary.totalDeductions);
    document.getElementById('payrollSummaryNet').textContent = formatCurrency(summary.totalNetPayroll);
    document.getElementById('payrollSummaryOvertime').textContent = formatCurrency(summary.totalOvertimePaid);
    document.getElementById('payrollSummaryPenalties').textContent = formatCurrency(summary.totalPenaltiesDeducted);

    // Master Table
    const tbody = document.getElementById('payrollTableBody');
    if (!tbody) return;

    if (!report || report.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-xs text-slate-500 dark:text-slate-400 font-medium">لا توجد بيانات مسير رواتب مسجلة لهذا الشهر</td></tr>`;
      return;
    }

    tbody.innerHTML = report.map((p, idx) => {
      const childId = `payroll-child-${p.employee.id || idx}`;

      return `
        <tr class="table-parent-row bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer md:cursor-default" data-child-id="${childId}">
          <td class="p-2 sm:p-2.5 font-bold text-slate-900 dark:text-white">
            <div class="text-slate-900 dark:text-white text-xs sm:text-sm font-bold truncate max-w-[130px] sm:max-w-none">${escapeHTML(p.employee.fullName)}</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-bold mt-0.5 tabular-nums num-display">${escapeHTML(p.employee.id)} • ${escapeHTML(p.employee.department)}</div>
          </td>
          <td class="p-2 sm:p-2.5 font-mono font-bold text-blue-700 dark:text-blue-300 text-xs sm:text-sm tabular-nums num-display bg-blue-50/40 dark:bg-blue-950/20 hidden md:table-cell">
            ${formatCurrency(p.earnings.gross)}
          </td>
          <td class="p-2 sm:p-2.5 font-mono font-bold text-rose-700 dark:text-rose-400 text-xs sm:text-sm tabular-nums num-display bg-rose-50/40 dark:bg-rose-950/20 hidden md:table-cell">
            ${formatCurrency(p.deductions.total)}
          </td>
          <td class="p-2 sm:p-2.5 font-mono font-black text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm tabular-nums num-display bg-emerald-50/60 dark:bg-emerald-950/30">
            ${formatCurrency(p.netSalary)}
          </td>
          <td class="p-2 sm:p-2.5 text-center hidden md:table-cell">
            <div class="flex items-center justify-center gap-1.5">
              <button class="view-details-btn" data-action="view-payroll-details" data-empid="${escapeHTML(p.employee.id)}" title="عرض تفكيك مفردات الراتب والخصومات" aria-label="عرض التفاصيل">
                <i class="fa-solid fa-eye text-xs" aria-hidden="true"></i>
              </button>
              <button class="view-payslip-btn px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1 transition-all active:scale-95" data-action="view-payslip" data-empid="${escapeHTML(p.employee.id)}" aria-label="عرض قسيمة الراتب">
                <i class="fa-solid fa-file-invoice text-xs" aria-hidden="true"></i>
                <span>القسيمة</span>
              </button>
            </div>
          </td>
          <td class="p-2 sm:p-2.5 text-center md:hidden">
            <button class="row-expand-btn" data-action="toggle-child-row" data-target="${childId}" title="عرض البيانات المخفية" aria-label="عرض البيانات المخفية">
              <i class="fa-solid fa-chevron-down text-xs"></i>
            </button>
          </td>
        </tr>
        <tr id="${childId}" class="responsive-child-row hidden bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <td colspan="6" class="p-2.5 sm:p-3">
            <div class="responsive-child-card p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5">
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">الراتب الأساسي:</span>
                  <span class="font-mono font-bold text-slate-900 dark:text-white">${formatCurrency(p.earnings.baseSalary)}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">إجمالي البدلات:</span>
                  <span class="font-mono font-bold text-slate-900 dark:text-white">${formatCurrency(p.earnings.allowances)}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">إجمالي الاستحقاق:</span>
                  <span class="font-mono font-bold text-blue-600 dark:text-blue-400">${formatCurrency(p.earnings.gross)}</span>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">إجمالي الاستقطاع:</span>
                  <span class="font-mono font-bold text-rose-600 dark:text-rose-400">${formatCurrency(p.deductions.total)}</span>
                </div>
                <div class="col-span-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                  <span class="font-bold text-emerald-800 dark:text-emerald-300">الصافي النهائي المستحق:</span>
                  <span class="font-mono font-black text-emerald-700 dark:text-emerald-300 text-sm">${formatCurrency(p.netSalary)}</span>
                </div>
              </div>
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button class="view-payslip-btn px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all" data-action="view-payslip" data-empid="${escapeHTML(p.employee.id)}">
                  <i class="fa-solid fa-file-invoice text-xs"></i>
                  <span>قسيمة الراتب</span>
                </button>
                <button class="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all" data-action="view-payroll-details" data-empid="${escapeHTML(p.employee.id)}">
                  <i class="fa-solid fa-eye text-xs"></i>
                  <span>تفكيك المفردات</span>
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openPayslipModal(p) {
    const modal = document.getElementById('payslipModal');
    const settings = store.state.settings || {};

    // Header info
    document.getElementById('slipCompanyName').textContent = settings.companyName || 'AE (HR-SYSTEM)';
    document.getElementById('slipCR').textContent = settings.commercialRegister || '184920';
    document.getElementById('slipTax').textContent = settings.taxNumber || '492-710-853';
    document.getElementById('slipMonthTitle').textContent = p.month;

    // Employee Metadata
    document.getElementById('slipEmpName').textContent = p.employee.fullName;
    document.getElementById('slipEmpId').textContent = p.employee.id;
    document.getElementById('slipEmpDept').textContent = p.employee.department;
    document.getElementById('slipEmpTitle').textContent = p.employee.jobTitle;

    // Rates
    document.getElementById('slipDailyRate').textContent = formatCurrency(p.rates.dailyRate);
    document.getElementById('slipHourlyRate').textContent = formatCurrency(p.rates.hourlyRate);

    // Earnings
    document.getElementById('slipBaseSalary').textContent = formatCurrency(p.earnings.baseSalary);
    document.getElementById('slipHousing').textContent = formatCurrency(p.earnings.housing);
    document.getElementById('slipTransport').textContent = formatCurrency(p.earnings.transport);
    document.getElementById('slipOtherAllowances').textContent = formatCurrency(p.earnings.otherAllowances);
    document.getElementById('slipOtHours').textContent = p.earnings.overtimeHours;
    document.getElementById('slipOtPay').textContent = formatCurrency(p.earnings.overtimeEarnings);
    document.getElementById('slipBonuses').textContent = formatCurrency(p.earnings.bonuses);
    document.getElementById('slipGrossTotal').textContent = formatCurrency(p.earnings.gross);

    // Deductions
    document.getElementById('slipLateMins').textContent = p.deductions.lateMinutes;
    document.getElementById('slipLatePenalty').textContent = formatCurrency(p.deductions.latePenalty);
    document.getElementById('slipEarlyMins').textContent = p.deductions.earlyMinutes;
    document.getElementById('slipEarlyPenalty').textContent = formatCurrency(p.deductions.earlyLeavePenalty);
    document.getElementById('slipUnpaidDays').textContent = p.deductions.unpaidDays;
    document.getElementById('slipUnpaidDeduction').textContent = formatCurrency(p.deductions.unpaidLeaveDeduction);
    document.getElementById('slipAdminPenalties').textContent = formatCurrency(p.deductions.adminPenalties);
    document.getElementById('slipLoans').textContent = formatCurrency(p.deductions.loans);
    document.getElementById('slipInsurance').textContent = formatCurrency(p.deductions.socialInsurance);
    document.getElementById('slipDeductionsTotal').textContent = formatCurrency(p.deductions.total);

    // Net
    document.getElementById('slipNetSalary').textContent = formatCurrency(p.netSalary);
    document.getElementById('slipNetText').textContent = numberToArabicWords(p.netSalary);

    modal?.classList.remove('hidden');
  }

  function exportPayrollToCSV() {
    if (!store.state.currentPayrollData) return;
    const report = store.state.currentPayrollData.payrollReport;

    let csvContent = '\uFEFF'; // UTF-8 BOM for Arabic support in Excel
    csvContent += 'الرقم الوظيفي,اسم الموظف,القسم,المسمى الوظيفي,الراتب الأساسي,إجمالي البدلات,أجر الإضافي,المكافآت,إجمالي الاستحقاقات,حسم التأخير,حسم الإجازات غير المدفوعة,الجزاءات الإدارية,السلف,التأمينات الاجتماعية,إجمالي الاستقطاعات,صافي الراتب\n';

    report.forEach(p => {
      const row = [
        `"${p.employee.id}"`,
        `"${p.employee.fullName}"`,
        `"${p.employee.department}"`,
        `"${p.employee.jobTitle}"`,
        p.earnings.baseSalary,
        p.earnings.totalAllowances,
        p.earnings.overtimeEarnings,
        p.earnings.bonuses,
        p.earnings.gross,
        (p.deductions.latePenalty + p.deductions.earlyLeavePenalty),
        p.deductions.unpaidLeaveDeduction,
        p.deductions.adminPenalties,
        p.deductions.loans,
        p.deductions.socialInsurance,
        p.deductions.total,
        p.netSalary
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `payroll_${store.state.currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('تم تصدير مسير الرواتب بصيغة CSV بنجاح', 'success');
  }

  /* ==========================================================================
     16. MODULE 7: DYNAMIC HR & PAYROLL SETTINGS CONTROLLER
     ========================================================================== */

  function setupSettingsForm() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    saveBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      const updated = {
        companyName: document.getElementById('setCompanyName').value,
        taxNumber: document.getElementById('setTaxNumber').value,
        commercialRegister: document.getElementById('setCommercialRegister').value,
        currency: document.getElementById('setCurrency').value,
        officialCheckIn: document.getElementById('setOfficialCheckIn').value,
        officialCheckOut: document.getElementById('setOfficialCheckOut').value,
        gracePeriodMinutes: Number(document.getElementById('setGracePeriod').value || 15),
        workingDaysPerMonth: Number(document.getElementById('setWorkingDays').value || 30),
        workingHoursPerDay: Number(document.getElementById('setWorkingHours').value || 8),
        tardinessDeductionMode: document.getElementById('setTardinessMode').value,
        overtimeRateMultiplier: Number(document.getElementById('setOvertimeMultiplier').value || 1.5),
        absencePenaltyMultiplier: Number(document.getElementById('setAbsenceMultiplier').value || 1.0),
        socialInsurancePercent: Number(document.getElementById('setSocialInsurance').value || 10),
        companyAddress: document.getElementById('setCompanyAddress')?.value || '',
        companyLocationUrl: document.getElementById('setCompanyLocationUrl')?.value || '',
        company_lat: document.getElementById('setCompanyLat')?.value ? parseFloat(document.getElementById('setCompanyLat').value) : null,
        company_lng: document.getElementById('setCompanyLng')?.value ? parseFloat(document.getElementById('setCompanyLng').value) : null,
        allowed_radius_meters: Number(document.getElementById('setAllowedRadius')?.value || 50)
      };

      const res = await ApiService.updateSettings(updated);
      if (res.success) {
        store.state.settings = res.data;
        sound.playSuccess();
        showToast('تم حفظ وتطبيق إعدادات اللائحة بنجاح', 'success');
      }
    });

    // Helper to extract coordinates from Google Maps URLs or text
    const parseCoordinates = (text) => {
      if (!text || typeof text !== 'string') return null;
      let m = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
      m = text.match(/[?&](?:q|ll|query|loc)=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
      m = text.match(/(?:place|search)\/(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
      m = text.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
      if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
      return null;
    };

    const updateGeoUI = (lat, lng) => {
      const hint = document.getElementById('geoParsedCoordsHint');
      const textEl = document.getElementById('geoParsedCoordsText');
      const badge = document.getElementById('geoStatusBadge');
      if (lat && lng) {
        if (hint) hint.classList.remove('hidden');
        if (textEl) textEl.textContent = `تم التقاط الإحداثيات: (${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)})`;
        if (badge) {
          badge.textContent = 'مفعل وجاهز';
          badge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
        }
      } else {
        if (hint) hint.classList.add('hidden');
        if (badge) {
          badge.textContent = 'غير محدد';
          badge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
        }
      }
    };

    // Live URL Input Handler
    const urlInput = document.getElementById('setCompanyLocationUrl');
    urlInput?.addEventListener('input', (e) => {
      const coords = parseCoordinates(e.target.value.trim());
      const latEl = document.getElementById('setCompanyLat');
      const lngEl = document.getElementById('setCompanyLng');
      if (coords) {
        if (latEl) latEl.value = coords.lat.toFixed(6);
        if (lngEl) lngEl.value = coords.lng.toFixed(6);
        updateGeoUI(coords.lat, coords.lng);
      } else {
        if (latEl) latEl.value = '';
        if (lngEl) lngEl.value = '';
        updateGeoUI(null, null);
      }
    });

    // Detect Current Location Button
    const detectBtn = document.getElementById('btnDetectCurrentLocation');
    detectBtn?.addEventListener('click', () => {
      if (!navigator.geolocation) {
        showToast('متصفحك لا يدعم تحديد الموقع الجغرافي GPS', 'error');
        return;
      }
      showToast('جاري تحديد موقعك الحالي عبر GPS...', 'info', 2000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const latEl = document.getElementById('setCompanyLat');
          const lngEl = document.getElementById('setCompanyLng');
          const urlEl = document.getElementById('setCompanyLocationUrl');
          if (latEl) latEl.value = lat.toFixed(6);
          if (lngEl) lngEl.value = lng.toFixed(6);
          if (urlEl) urlEl.value = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
          updateGeoUI(lat, lng);
          sound.playSuccess();
          showToast('تم تحديد إحداثيات موقعك الحالي بنجاح!', 'success');
        },
        (err) => {
          sound.playError();
          showToast('تعذر الوصول لموقعك الحالي. يرجى تفعيل إذن الموقع GPS بالمتصفح أو نسخ رابط الخريطة يدوياً.', 'error', 4000);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

    // Setup Departments Management
    setupDepartmentsManagement();
    loadAndRenderDepartments();
  }

  function populateSettingsForm() {
    const s = store.state.settings;
    if (!s) return;
    document.getElementById('setCompanyName').value = s.companyName || '';
    document.getElementById('setTaxNumber').value = s.taxNumber || '';
    document.getElementById('setCommercialRegister').value = s.commercialRegister || '';
    document.getElementById('setCurrency').value = s.currency || 'ج.م';
    document.getElementById('setOfficialCheckIn').value = s.officialCheckIn || '08:00';
    document.getElementById('setOfficialCheckOut').value = s.officialCheckOut || '16:00';
    document.getElementById('setGracePeriod').value = s.gracePeriodMinutes || 15;
    document.getElementById('setWorkingDays').value = s.workingDaysPerMonth || 30;
    document.getElementById('setWorkingHours').value = s.workingHoursPerDay || 8;
    document.getElementById('setTardinessMode').value = s.tardinessDeductionMode || 'tiered';
    document.getElementById('setOvertimeMultiplier').value = s.overtimeRateMultiplier || 1.35;
    document.getElementById('setAbsenceMultiplier').value = s.absencePenaltyMultiplier || 1.0;
    document.getElementById('setSocialInsurance').value = s.socialInsurancePercent || 11;

    const addrEl = document.getElementById('setCompanyAddress');
    if (addrEl) addrEl.value = s.companyAddress || s.address || '';
    const urlEl = document.getElementById('setCompanyLocationUrl');
    if (urlEl) urlEl.value = s.companyLocationUrl || (s.company_lat && s.company_lng ? `https://www.google.com/maps?q=${s.company_lat},${s.company_lng}` : '');
    const latEl = document.getElementById('setCompanyLat');
    if (latEl) latEl.value = s.company_lat || '';
    const lngEl = document.getElementById('setCompanyLng');
    if (lngEl) lngEl.value = s.company_lng || '';
    const radEl = document.getElementById('setAllowedRadius');
    if (radEl) radEl.value = s.allowed_radius_meters || 50;

    const hint = document.getElementById('geoParsedCoordsHint');
    const textEl = document.getElementById('geoParsedCoordsText');
    const badge = document.getElementById('geoStatusBadge');
    if (s.company_lat && s.company_lng) {
      if (hint) hint.classList.remove('hidden');
      if (textEl) textEl.textContent = `تم التقاط الإحداثيات: (${Number(s.company_lat).toFixed(5)}, ${Number(s.company_lng).toFixed(5)})`;
      if (badge) {
        badge.textContent = 'مفعل وجاهز';
        badge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
      }
    } else {
      if (hint) hint.classList.add('hidden');
      if (badge) {
        badge.textContent = 'غير محدد';
        badge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
      }
    }

    loadAndRenderDepartments();
  }

  /**
   * Setup Departments Management (Add, Edit, Delete).
   */
  function setupDepartmentsManagement() {
    const openAddBtn = document.getElementById('openAddDepartmentModalBtn');
    const modal = document.getElementById('departmentModal');
    const closeBtn = document.getElementById('closeDeptModalBtn');
    const cancelBtn = document.getElementById('cancelDeptModalBtn');
    const form = document.getElementById('departmentForm');
    const modalTitle = document.getElementById('departmentModalTitle');
    const managerSelect = document.getElementById('deptModalManager');

    const populateDeptManagers = (selectedManager = '') => {
      if (!managerSelect) return;
      managerSelect.innerHTML = '<option value="">بدون مدير حالياً</option>';
      const emps = store.state.employees || [];
      emps.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.fullName;
        const code = getEmployeeCode(emp);
        opt.textContent = `${emp.fullName} (${code} - ${emp.jobTitle || 'موظف'})`;
        if (emp.fullName === selectedManager) opt.selected = true;
        managerSelect.appendChild(opt);
      });
    };

    openAddBtn?.addEventListener('click', () => {
      sound.playClick();
      document.getElementById('deptModalId').value = '';
      document.getElementById('deptModalName').value = '';
      document.getElementById('deptModalNameEn').value = '';
      document.getElementById('deptModalCode').value = '';
      document.getElementById('deptModalDescription').value = '';
      populateDeptManagers();
      if (modalTitle) {
        modalTitle.innerHTML = '<i class="fa-solid fa-sitemap text-blue-500 ml-1"></i><span>إضافة قسم إداري جديد</span>';
      }
      modal?.classList.remove('hidden');
    });

    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
    cancelBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('deptModalId')?.value;
      const name = document.getElementById('deptModalName')?.value.trim();
      const nameEn = document.getElementById('deptModalNameEn')?.value.trim();
      const code = document.getElementById('deptModalCode')?.value.trim().toUpperCase();
      const managerName = document.getElementById('deptModalManager')?.value.trim();
      const description = document.getElementById('deptModalDescription')?.value.trim();

      if (!name || !code) {
        showToast('يرجى كتابة اسم وكود القسم', 'warning');
        return;
      }

      const payload = { name, nameEn, code, managerName, description };

      if (id) {
        const res = await ApiService.updateDepartment(id, payload);
        if (res.success) {
          sound.playSuccess();
          modal?.classList.add('hidden');
          showToast(`تم تحديث بيانات قسم (${name}) بنجاح`, 'success');
          await loadAndRenderDepartments();
        } else {
          sound.playError();
          showToast(res.message || 'فشل تحديث بيانات القسم', 'error');
        }
      } else {
        const res = await ApiService.createDepartment(payload);
        if (res.success) {
          sound.playSuccess();
          modal?.classList.add('hidden');
          showToast(`تم إنشاء قسم (${name}) بنجاح وتفعيل مصفوفة صلاحياته`, 'success');
          await loadAndRenderDepartments();
        } else {
          sound.playError();
          showToast(res.message || 'فشل إضافة القسم', 'error');
        }
      }
    });

    // In-table action delegation for edit / delete
    const tbody = document.getElementById('departmentsTableBody');
    tbody?.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('[data-action="edit-department"]');
      if (editBtn) {
        sound.playClick();
        const id = editBtn.dataset.id;
        const res = await ApiService.getDepartmentById(id);
        if (res.success && res.data) {
          const dept = res.data;
          document.getElementById('deptModalId').value = dept.id;
          document.getElementById('deptModalName').value = dept.name || '';
          document.getElementById('deptModalNameEn').value = dept.nameEn || '';
          document.getElementById('deptModalCode').value = dept.code || '';
          document.getElementById('deptModalDescription').value = dept.description || '';
          populateDeptManagers(dept.managerName || '');
          if (modalTitle) {
            modalTitle.innerHTML = `<i class="fa-solid fa-pen-to-square text-blue-500 ml-1"></i><span>تعديل قسم (${dept.name})</span>`;
          }
          modal?.classList.remove('hidden');
        }
        return;
      }

      const deleteBtn = e.target.closest('[data-action="delete-department"]');
      if (deleteBtn) {
        sound.playClick();
        const id = deleteBtn.dataset.id;
        const name = deleteBtn.dataset.name || 'هذا القسم';
        if (confirm(`هل أنت متأكد من حذف قسم "${name}"؟ سيتم حذف صلاحياته المرتبطة.`)) {
          const res = await ApiService.deleteDepartment(id);
          if (res.success) {
            sound.playSuccess();
            showToast(`تم حذف قسم "${name}" بنجاح`, 'info');
            await loadAndRenderDepartments();
          } else {
            sound.playError();
            showToast(res.message || 'فشل حذف القسم', 'error');
          }
        }
      }
    });
  }

  /**
   * Load and render departments table in Settings module.
   */
  async function loadAndRenderDepartments() {
    const tbody = document.getElementById('departmentsTableBody');
    const res = await ApiService.getDepartments();
    if (!res.success) return;

    const departments = res.data || [];
    store.state.departments = departments;
    updateDepartmentSelectOptions(departments);

    if (!tbody) return;

    if (departments.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-8 text-xs text-slate-500 font-medium">
            لا توجد أقسام مسجلة حالياً. اضغط "إضافة قسم جديد" للبدء.
          </td>
        </tr>
      `;
      return;
    }

    const employees = store.state.employees || [];

    tbody.innerHTML = departments.map(d => {
      const empCount = employees.filter(e => e.department === d.name).length;
      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
          <td class="p-3">
            <div class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>${escapeHTML(d.name)}</span>
            </div>
            ${d.nameEn ? `<div class="text-[11px] text-slate-400 font-mono mt-0.5">${escapeHTML(d.nameEn)}</div>` : ''}
          </td>
          <td class="p-3 font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">${escapeHTML(d.code || '--')}</td>
          <td class="p-3">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${empCount > 0 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}">
              ${empCount} موظف
            </span>
          </td>
          <td class="p-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate" title="${escapeHTML(d.description || '')}">
            ${escapeHTML(d.description || 'مهام تشغيلية وإدارية')}
          </td>
          <td class="p-3 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <button type="button" data-action="edit-department" data-id="${escapeHTML(d.id)}" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1 transition-colors" title="تعديل بيانات القسم">
                <i class="fa-solid fa-pen-to-square text-blue-500"></i>
                <span>تعديل</span>
              </button>
              <button type="button" data-action="delete-department" data-id="${escapeHTML(d.id)}" data-name="${escapeHTML(d.name)}" class="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 border border-rose-300 dark:border-rose-900 font-bold text-xs flex items-center gap-1 transition-colors" title="حذف القسم">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Update department options in all dropdown selects across the application.
   */
  function updateDepartmentSelectOptions(departments = []) {
    if (!departments || departments.length === 0) return;

    // 1. Approvals Dept Filter
    const approvalsDeptFilter = document.getElementById('approvalsDeptFilter');
    if (approvalsDeptFilter) {
      const currentVal = approvalsDeptFilter.value;
      approvalsDeptFilter.innerHTML = '<option value="all">كل الأقسام</option>';
      departments.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.name;
        opt.textContent = d.name;
        if (d.name === currentVal) opt.selected = true;
        approvalsDeptFilter.appendChild(opt);
      });
    }

    // 2. Onboarding Modal Dept Select
    const approvalDeptSelect = document.getElementById('approvalDeptSelect');
    if (approvalDeptSelect) {
      const cur = approvalDeptSelect.value;
      approvalDeptSelect.innerHTML = '';
      departments.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.name;
        opt.textContent = d.name;
        if (d.name === cur) opt.selected = true;
        approvalDeptSelect.appendChild(opt);
      });
    }

    // 3. Employee Modal Dept Select (if present)
    const empDeptSelect = document.getElementById('empDeptSelect') || document.getElementById('employeeDeptSelect');
    if (empDeptSelect) {
      const cur = empDeptSelect.value;
      empDeptSelect.innerHTML = '';
      departments.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.name;
        opt.textContent = d.name;
        if (d.name === cur) opt.selected = true;
        empDeptSelect.appendChild(opt);
      });
    }

    // 4. Programmer Permissions Scope OptGroup (#progPermDeptOptGroup)
    const progDeptOptGroup = document.getElementById('progPermDeptOptGroup');
    if (progDeptOptGroup) {
      progDeptOptGroup.innerHTML = '';
      departments.forEach(d => {
        const opt = document.createElement('option');
        opt.value = `dept:${d.name}`;
        opt.textContent = `قسم: ${d.name} (${d.code || ''})`;
        progDeptOptGroup.appendChild(opt);
      });
    }
  }

  /* ==========================================================================
     17. GLOBAL KEYBOARD NAVIGATION (Kiosk PIN + Escape to Close Modals)
     ========================================================================== */

  function setupGlobalKeyboardNavigation() {
    window.addEventListener('keydown', (e) => {
      // 1. Close any open modal on Escape key
      if (e.key === 'Escape') {
        const openModals = [
          document.getElementById('punchConfirmModal'),
          document.getElementById('employeeModal'),
          document.getElementById('manualPunchModal'),
          document.getElementById('newLeaveModal'),
          document.getElementById('newPermissionModal'),
          document.getElementById('newAdjustmentModal'),
          document.getElementById('payslipModal'),
          document.getElementById('empRequestModal'),
          document.getElementById('departmentModal'),
          document.getElementById('managerDecisionModal'),
          document.getElementById('progChangeRoleModal'),
          document.getElementById('progResetPinModal'),
          document.getElementById('progAuditDetailsModal')
        ];

        let closedAny = false;
        openModals.forEach(m => {
          if (m && !m.classList.contains('hidden')) {
            m.classList.add('hidden');
            closedAny = true;
          }
        });

        // Close mobile drawer if open
        const sidebar = document.getElementById('appSidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        if (sidebar && !sidebar.classList.contains('translate-x-full')) {
          sidebar.classList.add('translate-x-full');
          sidebar.classList.remove('translate-x-0');
          backdrop?.classList.add('hidden');
          document.body.classList.remove('overflow-hidden');
          closedAny = true;
        }

        if (closedAny) return;
      }

      // 2. Physical Keyboard PIN input on Kiosk Terminal
      if (store.state.activeTab === 'module-kiosk') {
        const pinSec = document.getElementById('pinSection');
        const isPinVisible = pinSec && !pinSec.classList.contains('hidden');
        
        // Don't intercept if an input or select element has active focus
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

        if (isPinVisible) {
          if (/^[0-9]$/.test(e.key)) {
            sound.playClick();
            if (store.state.pinInput.length < 6) {
              store.state.pinInput += e.key;
              updatePinDots();
              if (store.state.pinInput.length === 6) {
                submitPinPunch();
              }
            }
          } else if (e.key === 'Backspace') {
            sound.playClick();
            store.state.pinInput = store.state.pinInput.slice(0, -1);
            updatePinDots();
          } else if (e.key === 'Enter') {
            if (store.state.pinInput.length === 6) {
              submitPinPunch();
            }
          }
        }
      }
    });
  }

  /* ==========================================================================
     QUICK DETAILS MODAL CONTROLLER (Zero-Scroll Expanded Information Popup)
     ========================================================================== */
  function setupQuickDetailsModal() {
    const modal = document.getElementById('quickDetailsModal');
    const closeBtn = document.getElementById('closeQuickDetailsModalBtn');
    const dismissBtn = document.getElementById('dismissQuickDetailsModalBtn');

    const closeModal = () => {
      if (modal) modal.classList.add('hidden');
    };

    closeBtn?.addEventListener('click', closeModal);
    dismissBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  function openQuickDetailsModal(title, contentHtml) {
    const modal = document.getElementById('quickDetailsModal');
    const titleEl = document.getElementById('quickDetailsTitle');
    const contentEl = document.getElementById('quickDetailsContent');

    if (titleEl) titleEl.textContent = title;
    if (contentEl) contentEl.innerHTML = contentHtml;
    if (modal) modal.classList.remove('hidden');
  }

  function showQuickDetails(type, data) {
    sound.playClick();
    if (type === 'attendance') {
      const rec = data;
      const title = `تفاصيل حركة الحضور - ${rec.employeeName} (${rec.employeeId})`;
      const html = `
        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">الموظف والقسم:</span>
            <span class="font-bold text-slate-900 dark:text-white">${escapeHTML(rec.employeeName)} (${escapeHTML(rec.department)})</span>
          </div>
          <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">تاريخ الحركة:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-white">${escapeHTML(rec.date)}</span>
          </div>
          <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">وقت تسجيل الحضور:</span>
            <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">${escapeHTML(rec.checkIn || 'لم يسجل')}</span>
          </div>
          <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">وقت تسجيل الانصراف:</span>
            <span class="font-mono font-bold text-blue-600 dark:text-blue-400">${escapeHTML(rec.checkOut || 'قيد الدوام')}</span>
          </div>
          <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">ساعات العمل الفعلية:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-white">${rec.actualHours || 0} ساعة</span>
          </div>
          <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">دقائق التأخير الصباحي:</span>
            <span class="font-mono font-bold ${rec.lateMinutes > 15 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}">${rec.lateMinutes || 0} دقيقة</span>
          </div>
          <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">دقائق الانصراف المبكر:</span>
            <span class="font-mono font-bold ${rec.earlyLeaveMinutes > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}">${rec.earlyLeaveMinutes || 0} دقيقة</span>
          </div>
          <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">ساعات العمل الإضافي:</span>
            <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">${rec.overtimeHours || 0} ساعة</span>
          </div>
          <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">حالة الحضور:</span>
            <span class="font-bold text-slate-900 dark:text-white">${rec.status === 'present' ? 'حاضر منتظم' : rec.status === 'late' ? 'تأخير صباحي' : rec.status === 'leave' ? 'إجازة معتمدة' : 'غياب'}</span>
          </div>
          <div class="flex justify-between items-center py-1">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">الملاحظات:</span>
            <span class="font-medium text-slate-700 dark:text-slate-300">${escapeHTML(rec.notes || 'لا توجد ملاحظات')}</span>
          </div>
        </div>
      `;
      openQuickDetailsModal(title, html);
    } else if (type === 'employee') {
      const emp = data;
      const allowancesTotal = (emp.housingAllowance || 0) + (emp.transportAllowance || 0) + (emp.otherAllowances || 0);
      const title = `ملف الموظف - ${emp.fullName} (${emp.id})`;
      const html = `
        <div class="flex items-center gap-3 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 mb-3">
          <img src="${escapeHTML(emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')}" alt="${escapeHTML(emp.fullName)}" class="w-12 h-12 rounded-full object-cover border-2 border-blue-500 shadow">
          <div>
            <h4 class="font-bold text-slate-900 dark:text-white text-sm">${escapeHTML(emp.fullName)}</h4>
            <p class="text-xs text-slate-600 dark:text-slate-400 font-medium">${escapeHTML(emp.jobTitle)} • ${escapeHTML(emp.department)}</p>
            <span class="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5 inline-block">${escapeHTML(emp.id)}</span>
          </div>
        </div>
        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">الوردية الرسمية:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-white">${escapeHTML(emp.shiftStart)} إلى ${escapeHTML(emp.shiftEnd)}</span>
          </div>
          <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">رمز PIN (كشك البصمة):</span>
            <span class="font-mono font-black text-blue-600 dark:text-blue-400 tracking-wider">${escapeHTML(emp.pin)}</span>
          </div>
          <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">الراتب الأساسي:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-white">${formatCurrency(emp.baseSalary)}</span>
          </div>
          <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">بدل السكن:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-white">${formatCurrency(emp.housingAllowance || 0)}</span>
          </div>
          <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">بدل النقل:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-white">${formatCurrency(emp.transportAllowance || 0)}</span>
          </div>
          <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">بدلات أخرى:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-white">${formatCurrency(emp.otherAllowances || 0)}</span>
          </div>
          <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">إجمالي البدلات:</span>
            <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">${formatCurrency(allowancesTotal)}</span>
          </div>
          <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">نسبة التأمينات:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-white">${emp.insurancePercent || 10}%</span>
          </div>
          <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">رقم الهاتف:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-white">${escapeHTML(emp.phone || 'غير مسجل')}</span>
          </div>
          <div class="flex justify-between items-center py-1">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">تاريخ التعيين:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-white">${escapeHTML(emp.hireDate || 'غير مسجل')}</span>
          </div>
        </div>
      `;
      openQuickDetailsModal(title, html);
    } else if (type === 'payroll') {
      const p = data;
      const title = `التفكيك المالي للمسير - ${p.employee.fullName}`;
      const html = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div class="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-1.5">
            <span class="font-bold text-blue-900 dark:text-blue-300 text-xs block border-b border-blue-200 dark:border-blue-800 pb-1">مفردات الاستحقاقات (Gross)</span>
            <div class="flex justify-between text-xs py-0.5"><span>الأساسي:</span><span class="font-mono font-bold text-slate-900 dark:text-white">${formatCurrency(p.earnings.baseSalary)}</span></div>
            <div class="flex justify-between text-xs py-0.5"><span>بدل سكن:</span><span class="font-mono font-semibold">${formatCurrency(p.earnings.housing)}</span></div>
            <div class="flex justify-between text-xs py-0.5"><span>بدل نقل:</span><span class="font-mono font-semibold">${formatCurrency(p.earnings.transport)}</span></div>
            <div class="flex justify-between text-xs py-0.5"><span>بدلات أخرى:</span><span class="font-mono font-semibold">${formatCurrency(p.earnings.otherAllowances)}</span></div>
            <div class="flex justify-between text-xs py-0.5"><span>أجر الإضافي (${p.rates.overtimeHours}س):</span><span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">${formatCurrency(p.earnings.overtimeEarnings)}</span></div>
            <div class="flex justify-between text-xs py-0.5"><span>المكافآت:</span><span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">${formatCurrency(p.earnings.bonuses)}</span></div>
            <div class="flex justify-between text-xs pt-1 border-t border-blue-200 dark:border-blue-800 font-black">
              <span>إجمالي الاستحقاق:</span>
              <span class="font-mono text-blue-700 dark:text-blue-300">${formatCurrency(p.earnings.gross)}</span>
            </div>
          </div>
          <div class="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-1.5">
            <span class="font-bold text-rose-900 dark:text-rose-300 text-xs block border-b border-rose-200 dark:border-rose-800 pb-1">مفردات الاستقطاعات (Deductions)</span>
            <div class="flex justify-between text-xs py-0.5"><span>حسم التأخير:</span><span class="font-mono font-bold text-rose-600 dark:text-rose-400">${formatCurrency(p.deductions.latePenalty)}</span></div>
            <div class="flex justify-between text-xs py-0.5"><span>انصراف مبكر:</span><span class="font-mono font-semibold text-rose-600 dark:text-rose-400">${formatCurrency(p.deductions.earlyLeavePenalty)}</span></div>
            <div class="flex justify-between text-xs py-0.5"><span>إجازة غير مدفوعة:</span><span class="font-mono font-semibold text-rose-600 dark:text-rose-400">${formatCurrency(p.deductions.unpaidLeaveDeduction)}</span></div>
            <div class="flex justify-between text-xs py-0.5"><span>جزاءات إدارية:</span><span class="font-mono font-semibold text-rose-600 dark:text-rose-400">${formatCurrency(p.deductions.adminPenalties)}</span></div>
            <div class="flex justify-between text-xs py-0.5"><span>سلف شهرية:</span><span class="font-mono font-bold text-rose-600 dark:text-rose-400">${formatCurrency(p.deductions.loans)}</span></div>
            <div class="flex justify-between text-xs py-0.5"><span>تأمينات اجتماعية:</span><span class="font-mono font-semibold">${formatCurrency(p.deductions.socialInsurance)}</span></div>
            <div class="flex justify-between text-xs pt-1 border-t border-rose-200 dark:border-rose-800 font-black">
              <span>إجمالي الاستقطاع:</span>
              <span class="font-mono text-rose-700 dark:text-rose-300">${formatCurrency(p.deductions.total)}</span>
            </div>
          </div>
        </div>
        <div class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/60 flex justify-between items-center">
          <div>
            <span class="text-xs text-slate-600 dark:text-slate-400 font-bold block">صافي الراتب المستحق للصرف:</span>
            <span class="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">${p.employee.fullName} (${p.employee.id})</span>
          </div>
          <span class="text-base sm:text-lg font-black font-mono text-emerald-700 dark:text-emerald-300">${formatCurrency(p.netSalary)}</span>
        </div>
      `;
      openQuickDetailsModal(title, html);
    } else if (type === 'leave') {
      const l = data;
      const title = `تفاصيل الإجازة - ${l.employeeName}`;
      const html = `
        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
          <div class="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">الموظف:</span>
            <span class="font-bold text-slate-900 dark:text-white">${escapeHTML(l.employeeName)} (${escapeHTML(l.employeeId)})</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">نوع الإجازة:</span>
            <span class="font-bold text-blue-600 dark:text-blue-400">${l.leaveType === 'annual' ? 'إجازة سنوية' : l.leaveType === 'sick' ? 'إجازة مرضية' : l.leaveType === 'emergency' ? 'إجازة طارئة' : 'إجازة بدون راتب'}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">الفترة الزمنية:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-white">من ${escapeHTML(l.startDate)} إلى ${escapeHTML(l.endDate)}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">عدد الأيام:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-white">${l.daysCount} يوم</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">الأثر المالي:</span>
            <span class="font-bold ${l.leaveType === 'unpaid' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}">${l.leaveType === 'unpaid' ? 'حسم تلقائي من الراتب' : 'إجازة مدفوعة بالكامل'}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">الحالة والمعتمد:</span>
            <span class="font-bold text-emerald-600 dark:text-emerald-400">${l.status === 'approved' ? `معتمدة (${escapeHTML(l.approvedBy || 'الإدارة')})` : 'قيد الانتظار'}</span>
          </div>
          <div class="flex justify-between py-1">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">السبب والمبرر:</span>
            <span class="font-medium text-slate-800 dark:text-slate-200">${escapeHTML(l.reason || 'لا يوجد')}</span>
          </div>
        </div>
      `;
      openQuickDetailsModal(title, html);
    } else if (type === 'permission') {
      const p = data;
      const title = `تفاصيل إذن الدوام - ${p.employeeName}`;
      const html = `
        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
          <div class="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">الموظف:</span>
            <span class="font-bold text-slate-900 dark:text-white">${escapeHTML(p.employeeName)}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">تاريخ الإذن:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-white">${escapeHTML(p.date)}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">نوع الإذن:</span>
            <span class="font-bold text-blue-600 dark:text-blue-400">${p.permissionType === 'morning_delay' ? 'إذن تأخير صباحي' : 'إذن انصراف مبكر'}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">المدة المصرح بها:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-white">${p.hours} ساعة</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">أثر البصمة:</span>
            <span class="font-bold text-emerald-600 dark:text-emerald-400">معفى بالكامل من أي حسم مالي</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">المعتمد:</span>
            <span class="font-bold text-slate-900 dark:text-white">${escapeHTML(p.approvedBy || 'المشرف المباشر')}</span>
          </div>
          <div class="flex justify-between py-1">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">سبب الإذن:</span>
            <span class="font-medium text-slate-800 dark:text-slate-200">${escapeHTML(p.reason || 'لا يوجد')}</span>
          </div>
        </div>
      `;
      openQuickDetailsModal(title, html);
    } else if (type === 'adjustment') {
      const a = data;
      const title = `تفاصيل التسوية المالية - ${a.employeeName}`;
      const html = `
        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
          <div class="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">الموظف:</span>
            <span class="font-bold text-slate-900 dark:text-white">${escapeHTML(a.employeeName)}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">الشهر والتاريخ:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-white">${escapeHTML(a.month)} (${escapeHTML(a.date)})</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">نوع التسوية:</span>
            <span class="font-bold ${a.type === 'bonus' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${a.type === 'loan' ? 'سلفة مالية (حسم)' : a.type === 'bonus' ? 'مكافأة تميز (إضافة)' : 'جزاء إداري (حسم)'}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">طريقة الاحتساب:</span>
            <span class="font-semibold text-slate-900 dark:text-white">${a.calculationMode === 'day_fraction' ? 'نسبة من أجر اليوم' : 'مبلغ مقطوع'}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">القيمة:</span>
            <span class="font-mono font-black text-slate-900 dark:text-white">${a.calculationMode === 'day_fraction' ? `${a.daysFraction} يوم عمل` : formatCurrency(a.value)}</span>
          </div>
          <div class="flex justify-between py-1">
            <span class="text-slate-600 dark:text-slate-400 font-semibold">البيان والسبب:</span>
            <span class="font-medium text-slate-800 dark:text-slate-200">${escapeHTML(a.description || 'لا يوجد')}</span>
          </div>
        </div>
      `;
      openQuickDetailsModal(title, html);
    }
  }

  /* ==========================================================================
     17.5 RESPONSIVE ZERO-SCROLL TABLE DRAWER CONTROLLER
     ========================================================================== */

  function toggleChildRow(targetId, btnEl, parentRow) {
    const childRow = document.getElementById(targetId);
    if (!childRow) return;

    sound.playClick();
    const isHidden = childRow.classList.contains('hidden');
    if (isHidden) {
      childRow.classList.remove('hidden');
      btnEl?.classList.add('expanded');
      parentRow?.classList.add('is-expanded');
    } else {
      childRow.classList.add('hidden');
      btnEl?.classList.remove('expanded');
      parentRow?.classList.remove('is-expanded');
    }
  }

  function setupResponsiveTableToggle() {
    document.addEventListener('click', (e) => {
      // 1. If clicked on the toggle button
      const toggleBtn = e.target.closest('[data-action="toggle-child-row"]');
      if (toggleBtn) {
        e.stopPropagation();
        const targetId = toggleBtn.dataset.target;
        const parentRow = toggleBtn.closest('tr');
        toggleChildRow(targetId, toggleBtn, parentRow);
        return;
      }

      // 2. If clicked on parent row on mobile (< 768px), and not clicking another interactive element
      if (window.innerWidth < 768) {
        const parentRow = e.target.closest('.table-parent-row');
        if (parentRow && !e.target.closest('button, a, input, select, [data-action]')) {
          const childId = parentRow.dataset.childId;
          const toggleBtn = parentRow.querySelector('[data-action="toggle-child-row"]');
          toggleChildRow(childId, toggleBtn, parentRow);
        }
      }
    });
  }

  /* ==========================================================================
     18. APPLICATION BOOTSTRAPPER
     ========================================================================== */

  async function initApp() {
    // 1. Live Clock
    updateLiveClock();
    setInterval(updateLiveClock, 1000);

    // 2. Theme, Sound & Fullscreen
    initThemeAndSound();

    // 3. Load Initial Data from ApiService
    await loadSettings();
    await loadDepartments();
    await loadEmployees();
    await loadAttendanceLogs();
    await loadLeaves();
    await loadPermissions();
    await loadAdjustments();

    // 4. Setup Navigation & Mobile Off-Canvas Drawer (including Programmer Panel dynamic injection)
    ensureProgrammerNavExists();
    setupNavigation();
    setupMobileDrawer();

    // 5. Setup Kiosk Terminal (Scanner + PIN)
    setupKioskTerminal();

    // 6. Setup Feature Modules (Admin Portal)
    setupDashboard();
    setupEmployeesManagement();
    setupAttendanceView();
    setupLeavesAndAdjustments();
    setupPayrollEngine();
    setupSettingsForm();

    // 7. Setup Creative Auth Portal & Onboarding Wizard
    setupAuthPortal();
    setupOnboardingWizard();

    // 8. Setup Employee Self-Service Portal
    setupEmployeePortal();
    setupEmployeeRequestsUI();

    // 9. Setup Pending Approvals Module
    setupApprovalsModule();
    updateAdminNotifications();
    loadAndRenderAdminRequests();

    // 10. Setup Quick Details Modal
    setupQuickDetailsModal();

    // 10.5 Setup Responsive Zero-Scroll Table Drawers (Mobile Hidden Data Expand)
    setupResponsiveTableToggle();

    // 11. Setup Accessibility & Keyboard Navigation
    setupGlobalKeyboardNavigation();

    // 12. Authenticate & Select Initial Portal (Session Check)
    await checkInitialSession();

    console.log('✅ AE (HR-SYSTEM) RBAC HR & Payroll System successfully initialized with ES2024+ reactive architecture.');
  }

  // Self Boot
  document.addEventListener('DOMContentLoaded', initApp);

})();
