/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Main App Dashboard Handler
document.addEventListener('DOMContentLoaded', () => {
  // Initialize common UI components
  initCommonNavbarAndSidebar();

  // Clear All Data Database trigger handler
  const clearBtn = document.getElementById('btn-clear-all-data');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      Swal.fire({
        title: 'هل أنت متأكد من حذف جميع البيانات؟',
        text: 'لا يمكن التراجع عن هذه العملية وسيتم حذف الموظفين، الورديات، طلبات الإجازات، الرواتب والتقارير وتصفير الذاكرة.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'نعم، حذف كافة البيانات',
        cancelButtonText: 'إلغاء التراجع'
      }).then((result) => {
        if (result.isConfirmed) {
          if (window.DB && typeof window.DB.clearAllData === 'function') {
            window.DB.clearAllData();
            Swal.fire({
              title: 'تم مسح البيانات بنجاح!',
              text: 'تم تنظيف جداول قاعدة البيانات بالكامل بنجاح.',
              icon: 'success',
              confirmButtonText: 'حسناً، إعادة تحميل التطبيق',
              confirmButtonColor: '#4f46e5'
            }).then(() => {
              window.location.reload();
            });
          }
        }
      });
    });
  }

  // Load 20-Employee Demo Data trigger handler
  const loadBtn = document.getElementById('btn-load-demo-data');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      Swal.fire({
        title: 'هل ترغب في شحن حزمة البيانات التجريبية المتكاملة؟',
        text: 'سيقوم هذا بإدراج 20 موظفاً و3 ورديات عمل، مع بيانات الحضور الفعلي والإجازات المتزامنة لشهر يونيو 2026 للاختبار الفوري.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'نعم، إشحن البيانات الآن',
        cancelButtonText: 'إلغاء'
      }).then((result) => {
        if (result.isConfirmed) {
          if (window.DB && typeof window.DB.loadDemoData20 === 'function') {
            window.DB.loadDemoData20();
            Swal.fire({
              title: 'تم شحن البيانات بنجاح!',
              text: 'قامت خوارزمية الذكاء الاصطناعي ببناء 20 موظفاً، 3 ورديات عمل وحضور يونيو 2026 بالكامل بنجاح.',
              icon: 'success',
              confirmButtonText: 'حسناً، تحديث الشاشة',
              confirmButtonColor: '#4f46e5'
            }).then(() => {
              window.location.reload();
            });
          }
        }
      });
    });
  }

  // If loading index.html dashboard, load statistics
  if (document.getElementById('dashboard-app-stats')) {
    loadDashboardStats();

    // Intercept test download buttons to handle iframe browser sandbox restrictions gracefully
    document.querySelectorAll('.test-download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Many browsers block direct downloads inside iframes of development environments
        const inIframe = window.self !== window.top;
        if (inIframe) {
          e.preventDefault();
          const fileUrl = btn.getAttribute('href');
          
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              title: '<span style="font-family:Cairo; font-weight:700; color:#0f172a;">تعليمات التحميل والتشغيل التجريبي 💾</span>',
              html: `
                <div style="direction: rtl; text-align: right; font-family: Cairo; line-height: 1.6; font-size: 13.5px;" class="px-2">
                  <p class="text-secondary mb-3">
                    تمنع المتصفحات الحديثة التحميل المباشر للملفات من داخل <strong>شاشة المعاينة المصغرة المضمنة (Iframe)</strong> الخاصة ببيئة التطوير لحمايتها أمنياً.
                  </p>
                  <p class="mb-3 text-dark font-semibold">
                    <i class="bi bi-info-circle-fill text-primary ms-1"></i> 
                    للتحميل الفوري وبكل سهولة، يرجى اتباع أحد الحلين التاليين:
                  </p>
                  <div class="p-3 bg-light rounded border mb-3">
                    <strong class="text-success d-block mb-1"><i class="bi bi-box-arrow-up-right ms-1"></i> الحل الأول (مستحسن):</strong>
                    اضغط على زر <strong>"الفتح في نافذة جديدة" (Open in new tab)</strong> الموضح بأيقونة السهم في أعلى يمين شريط المعاينة ليعمل التطبيق كموقع متكامل، ومن ثم يمكنك تحميل الملف مجدداً بضغطة واحدة!
                  </div>
                  <div class="p-3 bg-light rounded border mb-3">
                    <strong class="text-primary d-block mb-1"><i class="bi bi-window-restore ms-1"></i> الحل الثاني:</strong>
                    اضغط على الزر الأزرق أدناه لفتح التطبيق مباشرة في نافذة مستقلة وبدء الحفظ فوراً.
                  </div>
                  <div style="font-size:11px;" class="p-2 border rounded bg-white text-center text-muted font-mono">
                     رابط الموقع الكامل: <br/>
                     <a href="${window.location.origin}" target="_blank" class="text-primary fw-bold text-decoration-none">${window.location.origin}</a>
                  </div>
                </div>
              `,
              icon: 'info',
              showCancelButton: true,
              confirmButtonColor: '#0284c7', // sky-600
              cancelButtonColor: '#64748b',
              confirmButtonText: '<i class="bi bi-box-arrow-up-right ms-1"></i> فتح التطبيق كموقع مستقل',
              cancelButtonText: 'إغلاق ومتابعة'
            }).then((result) => {
              if (result.isConfirmed) {
                window.open(window.location.origin, '_blank');
              }
            });
          } else {
            alert('يرجى فتح التطبيق كعلامة تبويب مستقلة (عبر الأيقونة في أعلى المعاينة) لتتمكن من تنزيل ملفات الإكسل، لأن المتصفح يمنع تنزيل الملفات من داخل النوافذ المضمنة.');
          }
        }
      });
    });
  }
});

// Create sidebar structure dynamically on pages to avoid manual repetitions
function initCommonNavbarAndSidebar() {
  // Simple check which page is active to highlight menu item
  const currentPath = window.location.pathname;
  let activePage = 'dashboard';
  if (currentPath.includes('employees.html')) activePage = 'employees';
  else if (currentPath.includes('shifts.html')) activePage = 'shifts';
  else if (currentPath.includes('attendance.html')) activePage = 'attendance';
  else if (currentPath.includes('manual-attendance.html')) activePage = 'manual-attendance';
  else if (currentPath.includes('quick-attendance.html')) activePage = 'quick-attendance';
  else if (currentPath.includes('leaves.html')) activePage = 'leaves';
  else if (currentPath.includes('payroll.html')) activePage = 'payroll';
  else if (currentPath.includes('reports.html')) activePage = 'reports';
  else if (currentPath.includes('data-management.html')) activePage = 'data-management';
  else if (currentPath.includes('help.html')) activePage = 'help';

  // Find root directory offset
  const isInPages = currentPath.includes('/pages/');
  const rootOffset = isInPages ? '../' : './';

  // Inject Sidebar
  const sidebarEl = document.getElementById('sidebar-container');
  if (sidebarEl) {
    sidebarEl.innerHTML = `
      <div class="sidebar">
        <div class="brand">
          <i class="bi bi-clock-history"></i>
          <span>نظام الحضور والرواتب</span>
        </div>
        <ul class="sidebar-menu">
          <li class="${activePage === 'dashboard' ? 'active' : ''}">
            <a href="${rootOffset}index.html">
              <i class="bi bi-grid-1x2-fill"></i>
              <span>لوحة التحكم الرئيسية</span>
            </a>
          </li>
          <li class="${activePage === 'employees' ? 'active' : ''}">
            <a href="${rootOffset}pages/employees.html">
              <i class="bi bi-people-fill"></i>
              <span>إدارة الموظفين</span>
            </a>
          </li>
          <li class="${activePage === 'shifts' ? 'active' : ''}">
            <a href="${rootOffset}pages/shifts.html">
              <i class="bi bi-calendar-range-fill"></i>
              <span>إدارة الورديات</span>
            </a>
          </li>
          <li class="${activePage === 'attendance' ? 'active' : ''}">
            <a href="${rootOffset}pages/attendance.html">
              <i class="bi bi-grid-3x3-gap-fill"></i>
              <span>شيت الحضور الشهري</span>
            </a>
          </li>
          <li class="${activePage === 'manual-attendance' ? 'active' : ''}">
            <a href="${rootOffset}pages/manual-attendance.html">
              <i class="bi bi-fingerprint"></i>
              <span>إدخال البصمات اليدوي</span>
            </a>
          </li>
          <li class="${activePage === 'quick-attendance' ? 'active' : ''}">
            <a href="${rootOffset}pages/quick-attendance.html">
              <i class="bi bi-lightning-fill"></i>
              <span>الحضور اليومي السريع</span>
            </a>
          </li>
          <li class="${activePage === 'leaves' ? 'active' : ''}">
            <a href="${rootOffset}pages/leaves.html">
              <i class="bi bi-calendar2-check-fill"></i>
              <span>سجل طلبات الإجازات</span>
            </a>
          </li>
          <li class="${activePage === 'payroll' ? 'active' : ''}">
            <a href="${rootOffset}pages/payroll.html">
              <i class="bi bi-cash-stack"></i>
              <span>مسير الرواتب الشهري</span>
            </a>
          </li>
          <li class="${activePage === 'reports' ? 'active' : ''}">
            <a href="${rootOffset}pages/reports.html">
              <i class="bi bi-file-earmark-bar-graph-fill"></i>
              <span>التقارير والمقاييس</span>
            </a>
          </li>
          <li class="${activePage === 'data-management' ? 'active' : ''}">
            <a href="${rootOffset}pages/data-management.html">
              <i class="bi bi-database-fill-gear text-warning"></i>
              <span>إدارة بيانات النظام</span>
            </a>
          </li>
          <li class="${activePage === 'help' ? 'active' : ''}">
            <a href="${rootOffset}pages/help.html">
              <i class="bi bi-question-circle-fill"></i>
              <span>دليل التشغيل والمساعدة</span>
            </a>
          </li>
        </ul>
      </div>
    `;
  }

  // Inject Header
  const headerEl = document.getElementById('header-container');
  if (headerEl) {
    let pageTitle = "مرحباً بك في النظام الذكي لإدارة شئون الموظفين";
    if (activePage === 'employees') pageTitle = "إدارة الموظفين والملفات الأساسية 👤";
    else if (activePage === 'shifts') pageTitle = "إدارة ورديات وتوقيتات العمل ⚙️";
    else if (activePage === 'attendance') pageTitle = "سجل الحضور والانصراف والتحليل الذكي ⏱️";
    else if (activePage === 'manual-attendance') pageTitle = "إدخال البصمات اليدوي والتحقق الذكي ⏱️";
    else if (activePage === 'quick-attendance') pageTitle = "الحضور اليومي السريع واللصق الجماعي ⏱️";
    else if (activePage === 'leaves') pageTitle = "إدارة طلبات وسجل الإجازات 📅";
    else if (activePage === 'payroll') pageTitle = "مسير رواتب واحتساب مستحقات الموظفين 💵";
    else if (activePage === 'reports') pageTitle = "التقارير الرقابية والرسوم البيانية 📊";
    else if (activePage === 'data-management') pageTitle = "أدوات إدارة وتطهير وصيانة البيانات 🛠️";
    else if (activePage === 'help') pageTitle = "دليل تشغيل النظام والمساعدة الفنية والاستكشافية 📘";

    headerEl.innerHTML = `
      <header class="app-header">
        <div class="header-title-box">
          <h4 class="m-0 fw-bold text-dark d-flex align-items-center">
            <span id="header-page-title">${pageTitle}</span>
          </h4>
        </div>
        <div class="header-profile d-flex align-items-center">
          <div class="header-user-badge">
            <i class="bi bi-person-fill-lock text-primary ms-2 fs-5"></i>
            <span class="fw-semibold text-secondary">المدير العام (أدمن)</span>
          </div>
        </div>
      </header>
    `;
  }
}

// Compute dashboard KPIs and prepare charts
function loadDashboardStats() {
  const employees = DB.getEmployees();
  const shifts = DB.getShifts();
  const leaves = DB.getLeaves();
  const activeMonth = "2026-06"; // Current seed month
  const attendance = DB.getAttendance(activeMonth);

  // 1. Counters
  const totalEmployeesCount = employees.length;
  const activeShiftsCount = shifts.filter(s => s.status === 'نشط').length;
  
  // Calculate today's status (using representative date e.g. 2026-06-15 from simulated system)
  let leavesActiveCount = 0;
  let presentTodayCount = 0;
  let absentTodayCount = 0;
  
  const refDateStr = "2026-06-15";
  employees.forEach(emp => {
    const key = `${emp.empNo}_${refDateStr}`;
    const record = attendance[key];
    if (record) {
      if (record.isLeave) leavesActiveCount++;
      else if (record.workingHours > 0) presentTodayCount++;
      else if (record.isAbsent) absentTodayCount++;
    }
  });

  // Display values
  document.getElementById('stat-total-employees').textContent = totalEmployeesCount;
  document.getElementById('stat-active-shifts').textContent = activeShiftsCount;
  document.getElementById('stat-active-leaves').textContent = leaves.length; // Total leaves log
  
  // Calculate active rate
  const rate = totalEmployeesCount > 0 
    ? Math.round(((totalEmployeesCount - absentTodayCount) / totalEmployeesCount) * 100) 
    : 100;
  document.getElementById('stat-attendance-rate').textContent = `${rate}%`;

  // Draw Charts
  if (typeof Chart !== 'undefined') {
    // Chart 1: Department Distributions
    const deptCounts = {};
    employees.forEach(emp => {
      deptCounts[emp.department] = (deptCounts[emp.department] || 0) + 1;
    });

    const chart1Ctx = document.getElementById('chart-departments').getContext('2d');
    new Chart(chart1Ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(deptCounts),
        datasets: [{
          data: Object.values(deptCounts),
          backgroundColor: [
            '#4f46e5', // HR
            '#06b6d4', // IT
            '#10b981', // Finance
            '#f59e0b', // Sales
            '#ec4899', // Operations
            '#8b5cf6'  // Others
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Cairo' }}
          }
        }
      }
    });

    // Chart 2: Cumulative Monthly statistics (Attendance, delays, absences) in June 2026
    let totalDelayMinutes = 0;
    let totalWorkingHours = 0;
    let totalIncompletePunches = 0;
    let totalAbsences = 0;

    Object.values(attendance).forEach(rec => {
      totalDelayMinutes += rec.delayMinutes || 0;
      totalWorkingHours += rec.workingHours || 0;
      if (rec.incompleteCount) totalIncompletePunches++;
      if (rec.isAbsent) totalAbsences++;
    });

    const chart2Ctx = document.getElementById('chart-monthly-overview').getContext('2d');
    new Chart(chart2Ctx, {
      type: 'bar',
      data: {
        labels: ['مجموع ساعات العمل', 'دقائق التأخير الإجمالية', 'حالات الغياب المسجلة', 'البصمات الناقصة'],
        datasets: [{
          label: 'مقاييس الشهر الحالي (يونيو 2026)',
          data: [
            Math.round(totalWorkingHours),
            totalDelayMinutes,
            totalAbsences,
            totalIncompletePunches
          ],
          backgroundColor: [
            '#10b981', // green
            '#f59e0b', // amber
            '#ef4444', // red
            '#3b82f6'  // blue
          ],
          borderWidth: 0,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' }}
        },
        scales: {
          y: { beginAtZero: true, ticks: { font: { family: 'Cairo' }}},
          x: { ticks: { font: { family: 'Cairo' }}}
        }
      }
    });
  } else {
    console.warn('Chart.js library is not loaded. Skipping chart drawings.');
  }
}

// Global alert system wrapper
window.Toast = {
  success(message) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        title: message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
    } else {
      alert('تم بنجاح: ' + message);
    }
  },
  error(message) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true
      });
    } else {
      alert('خطأ: ' + message);
    }
  },
  confirm(title, text, callback) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'تأكيد',
        cancelButtonText: 'إلغاء'
      }).then((result) => {
        if (result.isConfirmed) {
          callback();
        }
      });
    } else {
      if (confirm(`${title}\n${text}`)) {
        callback();
      }
    }
  }
};
