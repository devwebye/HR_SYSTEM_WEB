/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('data-management-page-indicator')) return;

  refreshCounts();

  // Load and Save Settings Config
  const limitInput = document.getElementById('config-prev-day-limit');
  const saveBtn = document.getElementById('btn-save-config');
  if (limitInput && window.DB) {
    limitInput.value = window.DB.getPreviousDayLimit();
  }
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const val = limitInput.value || '06:00';
      if (window.DB) {
        window.DB.savePreviousDayLimit(val);
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            title: 'تم حفظ الإعدادات!',
            text: `تم تحديد حد اعتبار البصمة تابعة لليوم السابق عند الساعة ${val} صباحاً بنجاح.`,
            icon: 'success',
            confirmButtonText: 'حسناً',
            confirmButtonColor: '#4f46e5'
          });
        } else {
          window.Toast.success('تم حفظ إعدادات النظام بنجاح.');
        }
      }
    });
  }

  // Export Backup Trigger
  const exportBtn = document.getElementById('btn-export-backup');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportBackup);
  }

  // Import Backup Trigger
  const importInput = document.getElementById('import-backup-file');
  if (importInput) {
    importInput.addEventListener('change', importBackup);
  }

  // Clear All Demo Data Trigger
  const clearDemoBtn = document.getElementById('btn-clear-demo-data');
  if (clearDemoBtn) {
    clearDemoBtn.addEventListener('click', () => {
      Swal.fire({
        title: 'هل أنت متأكد من حذف جميع البيانات؟',
        text: 'لا يمكن التراجع عن هذه العملية وسيتم حذف الموظفين، الورديات، طلبات الإجازات، وبصمات الحضور وتصفير الذاكرة.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'نعم، حذف كافة البيانات',
        cancelButtonText: 'إلغاء'
      }).then((result) => {
        if (result.isConfirmed) {
          if (window.DB && typeof window.DB.clearAllData === 'function') {
            window.DB.clearAllData();
            Swal.fire({
              title: 'تم مسح البيانات بنجاح!',
              text: 'تم تنظيف قاعدة البيانات وتطهيرها بالكامل.',
              icon: 'success',
              confirmButtonText: 'إعادة تحميل التطبيق',
              confirmButtonColor: '#4f46e5'
            }).then(() => {
              window.location.reload();
            });
          }
        }
      });
    });
  }

  // Repopulate Demo Data Trigger
  const repopulateBtn = document.getElementById('btn-repopulate-demo-data');
  if (repopulateBtn) {
    repopulateBtn.addEventListener('click', () => {
      Swal.fire({
        title: 'شحن حزمة البيانات التجريبية المتكاملة؟',
        text: 'سيقوم هذا بإعادة تعبئة النظام بـ 20 موظفاً و3 ورديات عمل، مع توفير بصمات حضور وإجازات منسقة لشهر يونيو 2026.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'شحن البيانات الآن',
        cancelButtonText: 'إلغاء'
      }).then((result) => {
        if (result.isConfirmed) {
          if (window.DB && typeof window.DB.loadDemoData20 === 'function') {
            window.DB.loadDemoData20();
            Swal.fire({
              title: 'تم شحن البيانات بنجاح! 🎉',
              text: 'قامت خوارزمية التطبيق بإدراج 20 موظفاً و3 ورديات مع حضور يونيو 2026 كاملاً.',
              icon: 'success',
              confirmButtonText: 'تحديث الشاشة',
              confirmButtonColor: '#4f46e5'
            }).then(() => {
              window.location.reload();
            });
          }
        }
      });
    });
  }
});

function refreshCounts() {
  if (!window.DB) return;

  const empCount = window.DB.getEmployees().length;
  const shiftCount = window.DB.getShifts().length;
  const leaveCount = window.DB.getLeaves().length;
  const attendanceCount = getAttendanceRecordsCount();

  const empEl = document.getElementById('count-employees');
  const shiftEl = document.getElementById('count-shifts');
  const leaveEl = document.getElementById('count-leaves');
  const attEl = document.getElementById('count-attendance');

  if (empEl) empEl.textContent = empCount;
  if (shiftEl) shiftEl.textContent = shiftCount;
  if (leaveEl) leaveEl.textContent = leaveCount;
  if (attEl) attEl.textContent = attendanceCount;
}

function getAttendanceRecordsCount() {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('hr_attendance_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key)) || {};
        total += Object.keys(data).length;
      } catch (e) {
        console.error(e);
      }
    }
  }
  return total;
}

function exportBackup() {
  if (!window.DB) return;

  const backup = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    employees: window.DB.getEmployees(),
    shifts: window.DB.getShifts(),
    leaves: window.DB.getLeaves(),
    attendance: {}
  };

  // Gather monthly attendance records
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('hr_attendance_')) {
      const month = key.substring('hr_attendance_'.length);
      try {
        backup.attendance[month] = JSON.parse(localStorage.getItem(key)) || {};
      } catch(e) {
        console.error(e);
      }
    }
  }

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `HR_System_Backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  window.Toast.success('تم تصدير ملف النسخة الاحتياطية بنجاح.');
}

function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const backup = JSON.parse(evt.target.result);
      
      // Basic validation
      if (!backup || !backup.employees || !backup.shifts || !backup.leaves || !backup.attendance) {
        throw new Error('ملف النسخة الاحتياطية غير صالح أو تالف! يرجى التأكد من اختيار ملف Backup.json الصحيح.');
      }

      // Save back to local storage
      localStorage.setItem('hr_employees', JSON.stringify(backup.employees));
      localStorage.setItem('hr_shifts', JSON.stringify(backup.shifts));
      localStorage.setItem('hr_leaves', JSON.stringify(backup.leaves));

      // Clear current attendance and write from backup
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('hr_attendance_')) {
          localStorage.removeItem(key);
        }
      }

      Object.keys(backup.attendance).forEach(month => {
        localStorage.setItem('hr_attendance_' + month, JSON.stringify(backup.attendance[month]));
      });

      Swal.fire({
        title: 'تم استعادة البيانات بنجاح! 🎉',
        text: 'تم استبدال وتحديث قاعدة البيانات بالكامل من ملف النسخ الاحتياطي.',
        icon: 'success',
        confirmButtonText: 'تحديث الشاشة',
        confirmButtonColor: '#4f46e5'
      }).then(() => {
        window.location.reload();
      });

    } catch(err) {
      window.Toast.error('خطأ في استعادة النسخة الاحتياطية: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

window.clearTable = function(tableName) {
  let title = '';
  let text = '';
  let key = '';
  let emptyVal = '[]';
  
  if (tableName === 'EMPLOYEES') {
    title = 'تأكيد تصفير جدول الموظفين 👤';
    text = 'سيتم حذف جميع الموظفين المسجلين في النظام نهائياً. لا يمكن التراجع عن هذه العملية!';
    key = 'hr_employees';
  } else if (tableName === 'SHIFTS') {
    title = 'تأكيد تصفير جدول ورديات العمل ⚙️';
    text = 'سيتم حذف جميع ورديات العمل المسجلة نهائياً. لا يمكن التراجع عن هذه العملية!';
    key = 'hr_shifts';
  } else if (tableName === 'LEAVES') {
    title = 'تأكيد تصفير جدول طلبات الإجازات 📅';
    text = 'سيتم حذف جميع طلبات الإجازات المسجلة نهائياً. لا يمكن التراجع عن هذه العملية!';
    key = 'hr_leaves';
  } else if (tableName === 'ATTENDANCE') {
    title = 'تأكيد تصفير بصمات وسجلات الحضور ⏱️';
    text = 'سيتم حذف جميع بصمات وحركات الحضور والانصراف المخزنة لكافة الشهور نهائياً. لا يمكن التراجع!';
  }

  Swal.fire({
    title: title,
    text: text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'نعم، امسح وصفر الجدول',
    cancelButtonText: 'إلغاء'
  }).then((result) => {
    if (result.isConfirmed) {
      if (tableName === 'ATTENDANCE') {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith('hr_attendance_')) {
            localStorage.removeItem(k);
          }
        }
      } else {
        localStorage.setItem(key, emptyVal);
      }
      window.Toast.success('تم تصفير الجدول بنجاح.');
      refreshCounts();
    }
  });
};
