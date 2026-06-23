/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('attendance-page-indicator')) return;

  // Initialize parameters
  initAttendanceFilters();
  renderAttendanceGrid();

  // Binds recalculate button
  const recalcBtn = document.getElementById('recalc-attendance');
  if (recalcBtn) {
    recalcBtn.addEventListener('click', recurseCalculationMetrics);
  }

  // Binds biometric punch Excel uploader
  const bioInput = document.getElementById('import-stamps-file');
  if (bioInput) {
    bioInput.addEventListener('change', importBiometricPunchesFile);
  }

  // Monitor filters changes
  const mSelector = document.getElementById('select-month');
  const ySelector = document.getElementById('select-year');
  const dFilter = document.getElementById('filter-attendance-dept');

  if (mSelector) mSelector.addEventListener('change', renderAttendanceGrid);
  if (ySelector) ySelector.addEventListener('change', renderAttendanceGrid);
  if (dFilter) dFilter.addEventListener('change', renderAttendanceGrid);

  // Batch Actions Event Listeners for Attendance
  const btnSelectAll = document.getElementById('btn-select-all');
  if (btnSelectAll) {
    btnSelectAll.addEventListener('click', () => {
      document.querySelectorAll('.attendance-checkbox').forEach(cb => {
        cb.checked = true;
      });
      const selectAllCheck = document.getElementById('select-all-attendance');
      if (selectAllCheck) selectAllCheck.checked = true;
      updateSelectedCount();
    });
  }

  const btnDeselectAll = document.getElementById('btn-deselect-all');
  if (btnDeselectAll) {
    btnDeselectAll.addEventListener('click', () => {
      document.querySelectorAll('.attendance-checkbox').forEach(cb => {
        cb.checked = false;
      });
      const selectAllCheck = document.getElementById('select-all-attendance');
      if (selectAllCheck) selectAllCheck.checked = false;
      updateSelectedCount();
    });
  }

  const btnDeleteSelected = document.getElementById('btn-delete-selected');
  if (btnDeleteSelected) {
    btnDeleteSelected.addEventListener('click', deleteSelectedAttendance);
  }
});

// Configure defaults for Month/Year selectors
function initAttendanceFilters() {
  const mSel = document.getElementById('select-month');
  const ySel = document.getElementById('select-year');
  
  if (!mSel || !ySel) return;

  // We default to "06" (June) and "2026" based on metadata context time (June 2026)
  mSel.value = '06';
  ySel.value = '2026';
}

// Global active YearMonth
function getSelectedYearMonth() {
  const m = document.getElementById('select-month').value;
  const y = document.getElementById('select-year').value;
  return `${y}-${m}`;
}

// Generate columns and rows of Excel monthly timetable
function renderAttendanceGrid() {
  const yearMonth = getSelectedYearMonth();
  const [year, month] = yearMonth.split('-').map(x => parseInt(x, 10));

  const daysInMonth = DB.getDaysInMonth(year, month);
  const employees = DB.getEmployees();
  const shifts = DB.getShifts();
  const attendance = DB.getAttendance(yearMonth);

  // Department filter
  const deptVal = document.getElementById('filter-attendance-dept')?.value || '';
  const filteredEmployees = employees.filter(emp => !deptVal || emp.department === deptVal);

  const theadRow1 = document.getElementById('attendance-thead-days');
  const theadRow2 = document.getElementById('attendance-thead-subheaders');
  const tbody = document.getElementById('attendance-tbody');

  if (!theadRow1 || !theadRow2 || !tbody) return;

  // Clear
  theadRow1.innerHTML = '';
  theadRow2.innerHTML = '';
  tbody.innerHTML = '';

  // 1. Build table headers
  // Column 0 to 4: Static descriptors (التحديد، الرقم الوظيفي، الاسم، القسم، الوردية)
  theadRow1.innerHTML = `
    <th rowspan="2" class="sticky-col sticky-col-0 align-middle text-center bg-secondary text-white" style="border-bottom:3px solid #cbd5e1;"><input type="checkbox" id="select-all-attendance" class="form-check-input" /></th>
    <th rowspan="2" class="sticky-col sticky-col-1 align-middle text-center bg-secondary text-white" style="border-bottom:3px solid #cbd5e1;">الرقم الوظيفي</th>
    <th rowspan="2" class="sticky-col sticky-col-2 align-middle bg-secondary text-white" style="border-bottom:3px solid #cbd5e1;">اسم الموظف</th>
    <th rowspan="2" class="sticky-col sticky-col-3 align-middle bg-secondary text-white" style="border-bottom:3px solid #cbd5e1;">القسم</th>
    <th rowspan="2" class="sticky-col sticky-col-4 align-middle bg-secondary text-white" style="border-bottom:3px solid #cbd5e1;">الوردية</th>
  `;

  // Dynamic Day titles spanned over 5 columns each
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${yearMonth}-${dayStr}`;
    const dayOfWeek = new Date(dateStr).getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday & Saturday
    const bgClass = isWeekend ? 'bg-secondary text-white' : 'bg-primary text-white';

    const th = document.createElement('th');
    th.colSpan = 5;
    th.className = `text-center py-2 ${bgClass} day-column-group`;
    th.textContent = `${dayStr}/${String(month).padStart(2, '0')}`;
    theadRow1.appendChild(th);

    // Sub-headers
    theadRow2.innerHTML += `
      <th class="cell-punch text-center text-primary font-mono" style="background:#f1f5f9; border-left:1px solid #e2e8f0">دخول 1</th>
      <th class="cell-punch text-center text-danger font-mono" style="background:#f1f5f9; border-left:1px solid #e2e8f0">خروج 1</th>
      <th class="cell-punch text-center text-primary font-mono" style="background:#f1f5f9; border-left:1px solid #e2e8f0">دخول 2</th>
      <th class="cell-punch text-center text-danger font-mono" style="background:#f1f5f9; border-left:1px solid #e2e8f0">خروج 2</th>
      <th class="cell-reason text-center text-dark" style="background:#e8eff6; border-left:2px solid #cbd5e1">السبب / نوع العذر</th>
    `;
  }

  // List of standard causes / reasons dropdown values
  const reasonsList = [
    { value: '', text: 'طبيعي' },
    { value: 'إذن دخول', text: 'إذن دخول' },
    { value: 'إذن خروج', text: 'إذن خروج' },
    { value: 'مهمة عمل', text: 'مهمة عمل' },
    { value: 'نسيان بصمة', text: 'نسيان بصمة' },
    { value: 'إجازة سنوية', text: 'إجازة سنوية' },
    { value: 'إجازة مرضية', text: 'إجازة مرضية' },
    { value: 'إجازة بدون راتب', text: 'إجازة بدون راتب' },
    { value: 'إجازة رسمية', text: 'إجازة رسمية' },
    { value: 'أخرى', text: 'أخرى' }
  ];

  // 2. Build rows
  if (filteredEmployees.length === 0) {
    const totalCols = 5 + daysInMonth * 5;
    tbody.innerHTML = `
      <tr>
        <td colspan="${totalCols}" class="text-center py-5 text-muted bg-white">
          <i class="bi bi-calendar-x fs-1 d-block mb-2"></i>
          لا توجد سجلات موظفين متاحة للعرض في القسم المختار.
        </td>
      </tr>
    `;
    return;
  }

  filteredEmployees.forEach(emp => {
    const shiftOpt = shifts.find(s => s.code === emp.shiftCode);
    const shiftName = shiftOpt ? shiftOpt.name : 'وردية غير صالحة';

    const tr = document.createElement('tr');
    tr.id = `attendance-row-${emp.empNo}`;

    // Static descriptors inside row
    let rowHTML = `
      <td class="sticky-col sticky-col-0 text-center bg-light" style="right:0"><input type="checkbox" class="form-check-input attendance-checkbox" value="${emp.empNo}" /></td>
      <td class="sticky-col sticky-col-1 fw-bold bg-light" style="right:40px">${emp.empNo}</td>
      <td class="sticky-col sticky-col-2 fw-semibold" style="right:115px">${emp.name}</td>
      <td class="sticky-col sticky-col-3 text-secondary" style="right:285px">${emp.department}</td>
      <td class="sticky-col sticky-col-4 border-left-3" style="right:395px">
        <span class="small text-muted">${shiftName}</span>
      </td>
    `;

    // Dynamic cells per day
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${yearMonth}-${dayStr}`;
      const dayOfWeek = new Date(dateStr).getDay();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday & Saturday

      const recordKey = `${emp.empNo}_${dateStr}`;
      const rec = attendance[recordKey] || {
        checkIn1: '',
        checkOut1: '',
        checkIn2: '',
        checkOut2: '',
        reason: '',
        isAbsent: false,
        isLeave: false,
        incompleteCount: ''
      };

      // Styles based on calculation indicators
      let cellBg = '';
      if (rec.isLeave) {
        cellBg = rec.reason === 'إجازة سنوية' ? 'bg-leave-sunya' : 'bg-leave-mardeya';
      } else if (rec.isAbsent) {
        cellBg = 'bg-absent';
      } else if (rec.incompleteCount) {
        cellBg = 'bg-incomplete';
      } else if (isWeekend) {
        cellBg = 'bg-weekend';
      }

      // Entry 1
      rowHTML += `
        <td class="cell-punch p-0 ${cellBg}" style="border-left:1px solid #e2e8f0">
          <input type="text" class="form-control form-control-sm border-0 bg-transparent text-center font-mono py-1 small" 
            style="font-size:0.8rem; border-radius:0"
            placeholder="--" 
            value="${rec.checkIn1 || ''}" 
            ${emp.status !== 'نشط' ? 'disabled' : ''}
            onblur="updateAttendanceCell('${emp.empNo}', '${dateStr}', 'checkIn1', this.value)" />
        </td>
      `;

      // Exit 1
      rowHTML += `
        <td class="cell-punch p-0 ${cellBg}" style="border-left:1px solid #e2e8f0">
          <input type="text" class="form-control form-control-sm border-0 bg-transparent text-center font-mono py-1 small" 
            style="font-size:0.8rem; border-radius:0"
            placeholder="--" 
            value="${rec.checkOut1 || ''}" 
            ${emp.status !== 'نشط' ? 'disabled' : ''}
            onblur="updateAttendanceCell('${emp.empNo}', '${dateStr}', 'checkOut1', this.value)" />
        </td>
      `;

      // Entry 2
      rowHTML += `
        <td class="cell-punch p-0 ${cellBg}" style="border-left:1px solid #e2e8f0">
          <input type="text" class="form-control form-control-sm border-0 bg-transparent text-center font-mono py-1 small" 
            style="font-size:0.8rem; border-radius:0"
            placeholder="--" 
            value="${rec.checkIn2 || ''}" 
            ${(emp.status !== 'نشط' || !shiftOpt?.checkIn2) ? 'disabled' : ''}
            onblur="updateAttendanceCell('${emp.empNo}', '${dateStr}', 'checkIn2', this.value)" />
        </td>
      `;

      // Exit 2
      rowHTML += `
        <td class="cell-punch p-0 ${cellBg}" style="border-left:1px solid #e2e8f0">
          <input type="text" class="form-control form-control-sm border-0 bg-transparent text-center font-mono py-1 small" 
            style="font-size:0.8rem; border-radius:0"
            placeholder="--" 
            value="${rec.checkOut2 || ''}" 
            ${(emp.status !== 'نشط' || !shiftOpt?.checkOut2) ? 'disabled' : ''}
            onblur="updateAttendanceCell('${emp.empNo}', '${dateStr}', 'checkOut2', this.value)" />
        </td>
      `;

      // Reason / Cause
      let optionsHTML = '';
      reasonsList.forEach(opt => {
        const selected = rec.reason === opt.value ? 'selected' : '';
        optionsHTML += `<option value="${opt.value}" ${selected}>${opt.text}</option>`;
      });

      rowHTML += `
        <td class="cell-reason p-0 ${cellBg}" style="border-left:2px solid #cbd5e1">
          <select class="form-select form-select-sm border-0 bg-transparent py-1 pe-3 fw-medium" 
            style="font-size:0.72rem; border-radius:0"
            ${emp.status !== 'نشط' ? 'disabled' : ''}
            onchange="updateAttendanceCell('${emp.empNo}', '${dateStr}', 'reason', this.value)">
            ${optionsHTML}
          </select>
        </td>
      `;
    }

    tr.innerHTML = rowHTML;
    tbody.appendChild(tr);
  });

  // Bind dynamic select-all change listener
  const selectAllCheck = document.getElementById('select-all-attendance');
  if (selectAllCheck) {
    selectAllCheck.addEventListener('change', (e) => {
      const checked = e.target.checked;
      document.querySelectorAll('.attendance-checkbox').forEach(cb => {
        cb.checked = checked;
      });
      updateSelectedCount();
    });
  }

  const tbodyEl = document.getElementById('attendance-tbody');
  if (tbodyEl) {
    tbodyEl.addEventListener('change', (e) => {
      if (e.target.classList.contains('attendance-checkbox')) {
        updateSelectedCount();
      }
    });
  }

  updateSelectedCount();
}

// Single custom cell modifications save
window.updateAttendanceCell = function(empNo, dateStr, field, value) {
  const cleanVal = String(value || '').trim();

  // Basic validation for time inputs
  if (field !== 'reason' && cleanVal !== '') {
    const timeMatch = cleanVal.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (!timeMatch) {
      window.Toast.error('تنسيق وقت غير صالح! يجب إدخال الوقت بصيغة 24 ساعة مثلاً: 08:30');
      renderAttendanceGrid(); // Refresh grid to revert wrong value
      return;
    }
  }

  const [year, month] = dateStr.split('-');
  const yearMonth = `${year}-${month}`;
  const attendance = DB.getAttendance(yearMonth);
  const recordKey = `${empNo}_${dateStr}`;

  if (!attendance[recordKey]) {
    attendance[recordKey] = {
      empNo,
      date: dateStr,
      checkIn1: '',
      checkOut1: '',
      checkIn2: '',
      checkOut2: '',
      reason: '',
      delayMinutes: 0,
      earlyOutMinutes: 0,
      workingHours: 0,
      isAbsent: false,
      isLeave: false,
      incompleteCount: ''
    };
  }

  // Update cell
  attendance[recordKey][field] = cleanVal;

  // Auto calculate stats for this specific day using related shift rules
  const employees = DB.getEmployees();
  const emp = employees.find(e => e.empNo === empNo);
  if (emp) {
    const shifts = DB.getShifts();
    const shift = shifts.find(s => s.code === emp.shiftCode);
    if (shift) {
      DB.calculateAttendanceStats(attendance[recordKey], shift);
      
      // Auto register/deregister to leaves table if reason changes
      if (field === 'reason') {
        // First, check if there is an existing leave record created from the attendance sheet for this employee and date
        let leaves = DB.getLeaves();
        const existingIndex = leaves.findIndex(l => l.empNo === empNo && l.startDate === dateStr && l.source === 'تم إنشاؤها من ورقة البصمات');
        
        if (existingIndex !== -1) {
          const oldLeave = leaves[existingIndex];
          // Revert balance if it was an annual leave
          if (oldLeave.leaveType === 'إجازة سنوية') {
            const emps = DB.getEmployees();
            const currentEmp = emps.find(e => e.empNo === empNo);
            if (currentEmp) {
              currentEmp.leaveBalance = (currentEmp.leaveBalance || 0) + 1;
              DB.saveEmployees(emps);
            }
          }
          leaves.splice(existingIndex, 1);
          DB.saveLeaves(leaves);
        }

        // If the new reason is one of the supported leave types, create a new synced leave record
        if (['إجازة سنوية', 'إجازة مرضية', 'إجازة بدون راتب'].includes(cleanVal)) {
          leaves = DB.getLeaves(); // Refresh leaves list after deletion
          const exists = leaves.some(l => l.empNo === empNo && l.startDate === dateStr);
          if (!exists) {
            const newLeaveRecord = {
              empNo,
              leaveType: cleanVal,
              startDate: dateStr,
              endDate: dateStr,
              daysCount: 1,
              notes: 'تسجيل تلقائي من شيت الحضور الشهري',
              source: 'تم إنشاؤها من ورقة البصمات'
            };
            DB.addLeave(newLeaveRecord);
            window.Toast.success(`تمت مزامنة وتسجيل إجازة (${cleanVal}) في سجل الإجازات.`);
          }
        }
      }
    }
  }

  // Save back to db
  DB.saveAttendance(yearMonth, attendance);

  // Partial grid background styling updates based on outcomes (no full refresh needed to prevent focus losses!)
  const rowEl = document.getElementById(`attendance-row-${empNo}`);
  if (rowEl) {
    // If reason was modified, we'd better refresh grid to update sibling inputs block attributes or cells color
    if (field === 'reason') {
      renderAttendanceGrid();
    }
  }
};

// Recalculates entire month context metrics
function recurseCalculationMetrics() {
  const yearMonth = getSelectedYearMonth();
  
  // Show spinner
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'جاري تحديث واحتساب الإحصائيات...',
      text: 'فضلاً انتظر بينما نقوم بمراجعة كافة السجلات اليومية للموظفين ومطابقتها بورديا تهم لحساب المخصومات ورفع إشارات البصمات الناقصة.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  setTimeout(() => {
    try {
      DB.recalculateMonth(yearMonth);
      if (typeof Swal !== 'undefined') Swal.close();
      window.Toast.success('تم الانتهاء من احتساب نسب التأخيرات، الغياب، ساعات العمل، وإشارات البصمات المفقودة بنجاح.');
      renderAttendanceGrid();
    } catch (e) {
      if (typeof Swal !== 'undefined') Swal.close();
      window.Toast.error('حدث خلل أثناء الاحتساب: ' + e);
    }
  }, 600);
}

// Bulk uploader biometric stamps Excel file
function importBiometricPunchesFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const yearMonth = getSelectedYearMonth();

  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'رفع وجدولة البصمات...',
      text: 'نقوم بتحليل سجلات البصمات وتجميع البصمات الثنائية والرباعية اليومية تلقائياً للموظفين.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  window.ImportExport.importBiometricExcel(file, yearMonth, (err, stats) => {
    if (err) {
      if (typeof Swal !== 'undefined') Swal.close();
      window.Toast.error('فشل استيراد البصمات: ' + err);
    } else {
      if (typeof Swal !== 'undefined') Swal.close();
      
      const count = stats.updatedDaysCount;
      const unknowns = stats.unknownRows || [];
      const incompletes = stats.incompleteRows || [];
      const overflows = stats.overflowRows || [];

      // Construct a highly detailed report body
      let reportHTML = `
        <div class="text-start" style="direction: rtl; text-align: right; font-family: 'Cairo', sans-serif; font-size: 0.85rem;">
          <div class="alert alert-success d-flex align-items-center mb-3 py-2 px-3">
            <i class="bi bi-check-circle-fill me-2 fs-5 text-success"></i>
            <div>
              تمت جدولة الحضور وتحديث <strong>${count}</strong> سجل يومي بنجاح للشهر المختار.
            </div>
          </div>
      `;

      // 1. Unknown employee accounts (Matched ONLY on ID)
      if (unknowns.length > 0) {
        reportHTML += `
          <div class="card border-danger mb-3">
            <div class="card-header bg-danger text-white py-1 fs-6 d-flex justify-content-between align-items-center">
              <span>⚠️ أرقام وظيفية غير معروفة تم تجاهلها وعزلها (${unknowns.length})</span>
            </div>
            <div class="card-body p-0" style="max-height: 120px; overflow-y: auto;">
              <table class="table table-sm table-striped table-bordered mb-0" style="font-size:0.75rem;">
                <thead>
                  <tr class="table-secondary">
                    <th class="py-1">الرقم الوظيفي</th>
                    <th class="py-1">الاسم الوارد في الملف</th>
                  </tr>
                </thead>
                <tbody>
                  ${unknowns.map(uk => `
                    <tr>
                      <td class="fw-bold text-danger">${uk.empNo}</td>
                      <td>${uk.empName}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      // 2. Incomplete punch days (< 4)
      if (incompletes.length > 0) {
        reportHTML += `
          <div class="card border-warning mb-3">
            <div class="card-header bg-warning text-dark py-1 fs-6">
              <span>⚠️ تنبيه: بصمة ناقصة / غير مكتملة (${incompletes.length})</span>
            </div>
            <div class="card-body p-0" style="max-height: 120px; overflow-y: auto;">
              <table class="table table-sm table-striped table-bordered mb-0" style="font-size:0.75rem;">
                <thead>
                  <tr class="table-secondary">
                    <th class="py-1">الموظف</th>
                    <th class="py-1">التاريخ</th>
                    <th class="py-1">عدد البصمات</th>
                    <th class="py-1">الأوقات المسجلة</th>
                  </tr>
                </thead>
                <tbody>
                  ${incompletes.map(inc => `
                    <tr>
                      <td>${inc.empName} (<small>${inc.empNo}</small>)</td>
                      <td>${inc.date}</td>
                      <td class="text-center text-warning fw-bold">${inc.timesCount}</td>
                      <td class="font-monospace">${inc.times}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      // 3. Overflow punch days (> 4)
      if (overflows.length > 0) {
        reportHTML += `
          <div class="card border-info mb-3">
            <div class="card-header bg-info text-dark py-1 fs-6">
              <span>ℹ️ مراجعة البصمات الزائدة (${overflows.length})</span>
            </div>
            <div class="card-body p-0" style="max-height: 120px; overflow-y: auto;">
              <table class="table table-sm table-striped table-bordered mb-0" style="font-size:0.75rem;">
                <thead>
                  <tr class="table-secondary">
                    <th class="py-1">الموظف</th>
                    <th class="py-1">التاريخ</th>
                    <th class="py-1">نشط باليوم</th>
                    <th class="py-1">البصمات الزائدة المتجاوزة</th>
                  </tr>
                </thead>
                <tbody>
                  ${overflows.map(ov => `
                    <tr>
                      <td>${ov.empName} (<small>${ov.empNo}</small>)</td>
                      <td>${ov.date}</td>
                      <td class="text-success small">أول 4 بصمات مستخدمة</td>
                      <td class="text-danger font-monospace">${ov.extraPunches}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      reportHTML += `</div>`;

      if (typeof Swal !== 'undefined') {
        Swal.fire({
          title: 'تقرير نتائج استيراد البصمات الذكية',
          html: reportHTML,
          width: '650px',
          confirmButtonText: 'حسناً، تم الاطلاع',
          confirmButtonColor: '#4f46e5'
        });
      } else {
        window.Toast.success(`تم استيراد ${count} سجل بنجاح.`);
      }

      renderAttendanceGrid();
    }
  });

  e.target.value = '';
}

function updateSelectedCount() {
  const selected = document.querySelectorAll('.attendance-checkbox:checked').length;
  const panel = document.getElementById('batch-actions-panel');
  const badge = document.getElementById('selected-count-badge');
  if (panel && badge) {
    if (selected > 0) {
      panel.classList.remove('d-none');
      badge.textContent = `محدد: ${selected} موظف`;
    } else {
      panel.classList.add('d-none');
      const selectAllCheck = document.getElementById('select-all-attendance');
      if (selectAllCheck) selectAllCheck.checked = false;
    }
  }
}

function deleteSelectedAttendance() {
  const selectedCheckboxes = document.querySelectorAll('.attendance-checkbox:checked');
  const selectedEmpNos = Array.from(selectedCheckboxes).map(cb => cb.value);
  if (selectedEmpNos.length === 0) return;

  const yearMonth = getSelectedYearMonth();

  Swal.fire({
    title: 'تأكيد حذف بصمات الموظفين المحددين؟ ⚠️',
    text: `هل أنت متأكد من رغبتك في مسح بصمات وحضور عدد (${selectedEmpNos.length}) موظف للشهر المختار (${yearMonth}) بالكامل؟ لا يمكن التراجع عن هذا الإجراء!`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'نعم، امسح البصمات المحددة',
    cancelButtonText: 'إلغاء'
  }).then((result) => {
    if (result.isConfirmed) {
      const attendance = DB.getAttendance(yearMonth);
      
      // Delete all records of selected employees for this yearMonth
      for (const key in attendance) {
        const empNo = key.split('_')[0];
        if (selectedEmpNos.includes(empNo)) {
          delete attendance[key];
        }
      }
      
      DB.saveAttendance(yearMonth, attendance);
      window.Toast.success(`تم مسح حضور وبصمات الموظفين المحددين لشهر ${yearMonth} بنجاح.`);
      
      renderAttendanceGrid();
      updateSelectedCount();
    }
  });
}

window.updateSelectedCount = updateSelectedCount;
window.deleteSelectedAttendance = deleteSelectedAttendance;
