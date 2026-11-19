# سجل التغييرات (CHANGELOG)

## [الدفعة 1] - إصلاح انهيار شاشة الرواتب وتوافق بيانات الموظف

### التغييرات المطبقة:
* **الملف:** `api.js`
  * **الأسطر:** 5188 - 5205 (داخل دالة `calculateMonthlyPayroll`)
  * **ما تغيّر:**
    * إضافة كائن متداخل `employee: { id: emp.id, fullName: emp.fullName, department: emp.department, jobTitle: emp.jobTitle, role: emp.role }` لكل سجل راتب يتم احتسابه.
    * إضافة حقل `month: monthStr` لكل سجل راتب، وضبط `rates.overtimeHours` و `earnings.allowances`.
    * الإبقاء التام على الحقول المسطحة الأصلية (`employeeId`, `employeeName`, `department`, `jobTitle`, `role`) لضمان التوافق العكسي.
    * منع حدوث خطأ `TypeError: Cannot read properties of undefined (reading 'id')` في المواضع التالية بملف `app.js`:
      * السطر 3318 (قسيمة بوابة الموظف)
      * السطر 6831 و 6843 (التفكيك المالي للمسير وتفاصيل القسيمة)
      * الأسطر 6876 - 6940 (رسم جدول الرواتب الرئيسي والصفوف التفاعلية المتجاوبة)
      * الأسطر 6963 - 6966 (نافذة قسيمة الراتب Payslip Modal)
      * الأسطر 7010 - 7013 (تصدير كشف الرواتب إلى CSV)
      * السطر 7683 (عرض التفاصيل السريعة للمسير Quick Details)

* **الملف:** `tests/payroll.test.js`
  * **ما تغيّر:** إنشاء اختبارات تكاملية Node + jsdom تحاكي تسجيل الدخول كـ "مبرمج"، وتتحقق من استدعاء `calculateMonthlyPayroll`، وفتح تبويب `module-payroll`، وعرض جدول المسير، وفتح نافذة القسيمة (Payslip Modal)، والتفاصيل السريعة، وزر قسيمة الموظف بالسطر 3318، والتأكد من فشل الاختبار قبل التعديل ونجاحه بعده.

* **ملفات الإعداد:** `package.json`, `eslint.config.mjs`, `.gitignore`
  * **ما تغيّر:** إضافة سكريبتات الفحص والاختبار (`npm test`, `npm run check`, `npm run lint`)، وضبط قواعد ESLint المطلوبة (`no-undef`, `no-redeclare`, `no-dupe-keys`).
