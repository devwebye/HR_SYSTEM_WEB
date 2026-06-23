/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('manual-attendance-page-indicator')) return;

  // Initialize page components
  initDefaultDate();
  populateEmployeesList();
  renderAttendanceGrid();

  // Bind event listeners
  const monthSel = document.getElementById('select-month');
  const yearSel = document.getElementById('select-year');
  const deptFilter = document.getElementById('filter-attendance-dept');

  if (monthSel) monthSel.addEventListener('change', () => { updateDefaultDate(); renderAttendanceGrid(); });
  if (yearSel) yearSel.addEventListener('change', () => { updateDefaultDate(); renderAttendanceGrid(); });
  if (deptFilter) deptFilter.addEventListener('change', renderAttendanceGrid);

  // Recalculate Button
  const recalcBtn = document.getElementById('recalc-attendance');
  if (recalcBtn) {
    recalcBtn.addEventListener('click', runFullRecalculation);
  }

  // Clear Today's Punches Button
  const deletePunchesBtn = document.getElementById('btn-delete-all-punches');
  if (deletePunchesBtn) {
    deletePunchesBtn.addEventListener('click', clearSelectedDayPunches);
  }

  // Employee Autocomplete Search & Dropdown Bindings
  initEmployeeSelection();

  // Smart Time Input Formatting & Validation
  initSmartTimeInput();

  // Save Punch Form Submission
  const saveBtn = document.getElementById('btn-save-punch');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveManualPunch);
  }

  // Reset Form Button
  const resetBtn = document.getElementById('btn-reset-form');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetPunchForm);
  }
});

// Helper: Get active year and month from filters
function getSelectedYearMonth() {
  const m = document.getElementById('select-month').value;
  const y = document.getElementById('select-year').value;
  return `${y}-${m}`;
}

// Initialize default date in form based on active month
function initDefaultDate() {
  const dateInput = document.getElementById('punch-date');
  if (!dateInput) return;
  
  // Set default to current day of active month context
  const yearMonth = getSelectedYearMonth();
  const today = new Date();
  const currentDay = String(today.getDate()).padStart(2, '0');
  
  // E.g. 2026-06-23
  dateInput.value = `${yearMonth}-${currentDay}`;
}

// Update date input when month/year filter changes
function updateDefaultDate() {
  const dateInput = document.getElementById('punch-date');
  if (!dateInput) return;
  
  const yearMonth = getSelectedYearMonth();
  dateInput.value = `${yearMonth}-15`; // Set to mid of selected month as fallback
}

// Populate the Employee dropdown list
function populateEmployeesList() {
  const select = document.getElementById('employee-select');
  if (!select || !window.DB) return;

  const employees = window.DB.getEmployees();
  
  // Clear other than first option
  select.innerHTML = '<option value="">-- اختر الموظف من القائمة --</option>';

  employees.forEach(emp => {
    const statusText = emp.status === 'نشط' ? 'نشط' : 'موقف';
    const option = document.createElement('option');
    option.value = emp.empNo;
    option.textContent = `${emp.name} (${emp.empNo}) - [${emp.department}] - [${statusText}]`;
    select.appendChild(option);
  });
}

// Setup Employee Selection Autocomplete Search and Dropdown sync
function initEmployeeSelection() {
  const searchInput = document.getElementById('employee-search-input');
  const select = document.getElementById('employee-select');
  const resultsBox = document.getElementById('employee-search-results');
  
  const displayNo = document.getElementById('display-emp-no');
  const displayName = document.getElementById('display-emp-name');

  if (!searchInput || !select || !resultsBox) return;

  // Sync Select list selection with Details view
  select.addEventListener('change', (e) => {
    const empNo = e.target.value;
    if (empNo && window.DB) {
      const emp = window.DB.getEmployees().find(x => x.empNo === empNo);
      if (emp) {
        displayNo.textContent = emp.empNo;
        displayName.textContent = emp.name;
        searchInput.value = emp.name;
        
        // Highlight employee row in grid
        highlightEmployeeRow(emp.empNo);
        return;
      }
    }
    clearSelectionDisplay();
  });

  // Autocomplete Search input
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      resultsBox.style.display = 'none';
      return;
    }

    if (!window.DB) return;
    const employees = window.DB.getEmployees();
    
    // Filter employees by name or No
    const matches = employees.filter(emp => 
      emp.name.toLowerCase().includes(query) || 
      emp.empNo.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
      resultsBox.innerHTML = '<div class="p-2 text-muted text-center small">لا توجد نتائج مطابقة</div>';
      resultsBox.style.display = 'block';
      return;
    }

    resultsBox.innerHTML = '';
    matches.slice(0, 10).forEach(emp => {
      const item = document.createElement('div');
      item.className = 'result-item';
      item.innerHTML = `
        <strong>${emp.name}</strong> <span class="badge bg-light text-dark font-mono">${emp.empNo}</span><br/>
        <small class="text-muted">${emp.department} - ${emp.position}</small>
      `;
      item.addEventListener('click', () => {
        // Select in dropdown
        select.value = emp.empNo;
        searchInput.value = emp.name;
        displayNo.textContent = emp.empNo;
        displayName.textContent = emp.name;
        resultsBox.style.display = 'none';
        
        // Highlight row
        highlightEmployeeRow(emp.empNo);
      });
      resultsBox.appendChild(item);
    });

    resultsBox.style.display = 'block';
  });

  // Close results box when clicking outside
  document.addEventListener('click', (e) => {
    if (e.target !== searchInput && e.target !== resultsBox) {
      resultsBox.style.display = 'none';
    }
  });
}

function clearSelectionDisplay() {
  document.getElementById('display-emp-no').textContent = '--';
  document.getElementById('display-emp-name').textContent = '--';
  document.getElementById('employee-search-input').value = '';
  document.getElementById('employee-select').value = '';
}

// Highlight employee's row in the grid table
function highlightEmployeeRow(empNo) {
  // Remove existing highlights
  document.querySelectorAll('#attendance-tbody tr').forEach(tr => {
    tr.classList.remove('table-primary');
  });

  const row = document.getElementById(`attendance-row-${empNo}`);
  if (row) {
    row.classList.add('table-primary');
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Smart time formatting logic (e.g. 830 -> 08:30)
function formatTimeSmart(val) {
  let clean = val.replace(/\D/g, '').trim();
  if (!clean) return val;

  if (clean.length === 1) {
    // "8" -> "08:00"
    return `0${clean}:00`;
  } else if (clean.length === 2) {
    // "45" -> "00:45", "08" -> "08:00"
    const num = parseInt(clean, 10);
    if (num > 23) {
      return `00:${String(num).padStart(2, '0')}`;
    } else {
      return `${String(num).padStart(2, '0')}:00`;
    }
  } else if (clean.length === 3) {
    // "830" -> "08:30", "700" -> "07:00"
    const h = clean.substring(0, 1);
    const m = clean.substring(1);
    return `0${h}:${m}`;
  } else if (clean.length === 4) {
    // "1530" -> "15:30"
    const h = clean.substring(0, 2);
    const m = clean.substring(2);
    return `${h}:${m}`;
  }
  return val;
}

// Handle time input dynamic validation & formatting
function initSmartTimeInput() {
  const timeInput = document.getElementById('punch-time');
  if (!timeInput) return;

  // Format on blur
  timeInput.addEventListener('blur', () => {
    const origVal = timeInput.value.trim();
    if (!origVal) return;
    
    const formatted = formatTimeSmart(origVal);
    timeInput.value = formatted;
    
    // Validate format
    validateTimeInput(formatted);
  });

  // Also catch "Enter" key on time input to trigger formatting
  timeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const formatted = formatTimeSmart(timeInput.value.trim());
      timeInput.value = formatted;
      validateTimeInput(formatted);
    }
  });
}

// Validate if time is a valid HH:MM 24h string
function validateTimeInput(timeStr) {
  if (!timeStr) return true;

  const timeMatch = timeStr.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!timeMatch) {
    Swal.fire({
      title: 'خطأ في تنسيق الوقت ❌',
      text: `الوقت المدخل "${timeStr}" غير صالح! يجب إدخال وقت صحيح بصيغة 24 ساعة (مثال: 08:30 أو 15:45). الرجاء مراجعة الوقت وتعديله.`,
      icon: 'error',
      confirmButtonText: 'مفهوم، سأصححه',
      confirmButtonColor: '#ef4444'
    });
    return false;
  }
  return true;
}

// Subtract 1 day from a date string (YYYY-MM-DD)
function getPreviousDateStr(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Handle Manual Punch Save Trigger
function saveManualPunch() {
  const empNo = document.getElementById('employee-select').value;
  const punchDate = document.getElementById('punch-date').value;
  let punchTime = document.getElementById('punch-time').value.trim();
  const punchType = document.getElementById('punch-type').value;

  if (!empNo) {
    Swal.fire('تنبيه ⚠️', 'الرجاء اختيار الموظف أولاً قبل الحفظ!', 'warning');
    return;
  }
  if (!punchDate) {
    Swal.fire('تنبيه ⚠️', 'الرجاء إدخال تاريخ البصمة!', 'warning');
    return;
  }
  if (!punchTime) {
    Swal.fire('تنبيه ⚠️', 'الرجاء إدخال وقت البصمة!', 'warning');
    return;
  }

  // Final formatting check
  punchTime = formatTimeSmart(punchTime);
  document.getElementById('punch-time').value = punchTime;

  if (!validateTimeInput(punchTime)) return;

  if (!window.DB) return;
  const employees = window.DB.getEmployees();
  const emp = employees.find(e => e.empNo === empNo);
  if (!emp) return;

  let targetDate = punchDate;
  let nightShiftTriggered = false;

  // 1. NIGHT SHIFT DETECTOR RULE
  const timeMinutes = window.DB.timeToMinutes(punchTime);
  const limitMinutes = window.DB.timeToMinutes(window.DB.getPreviousDayLimit());

  if (timeMinutes < limitMinutes) {
    // Check previous day
    const prevDate = getPreviousDateStr(punchDate);
    const prevYearMonth = prevDate.substring(0, 7);
    const prevAttendance = window.DB.getAttendance(prevYearMonth);
    const prevKey = `${empNo}_${prevDate}`;
    const prevRecord = prevAttendance[prevKey];

    // If employee is active or has previous day record, treat as previous day checkout!
    if (prevRecord || emp.status === 'نشط') {
      targetDate = prevDate;
      nightShiftTriggered = true;
    }
  }

  const targetYearMonth = targetDate.substring(0, 7);
  const attendance = window.DB.getAttendance(targetYearMonth);
  const recordKey = `${empNo}_${targetDate}`;

  // Get or create daily record
  const rec = attendance[recordKey] || {
    empNo,
    date: targetDate,
    checkIn1: '',
    checkOut1: '',
    checkIn2: '',
    checkOut2: '',
    reason: '',
    isAbsent: false,
    isLeave: false,
    incompleteCount: ''
  };

  // 2. SAVE PUNCH TYPE (Auto order vs Custom slot)
  if (punchType === 'auto') {
    // Combine existing non-empty punches
    const punches = [rec.checkIn1, rec.checkOut1, rec.checkIn2, rec.checkOut2, ...(rec.extraPunches || [])].filter(p => !!p);
    
    // Add new punch if not already present
    if (!punches.includes(punchTime)) {
      punches.push(punchTime);
    }

    // Sort chronologically ascending
    punches.sort((a, b) => window.DB.timeToMinutes(a) - window.DB.timeToMinutes(b));

    // Re-assign slots
    rec.checkIn1 = punches[0] || '';
    rec.checkOut1 = punches[1] || '';
    rec.checkIn2 = punches[2] || '';
    rec.checkOut2 = punches[3] || '';
    rec.extraPunches = punches.slice(4);
  } else {
    // Save to explicit slot chosen by user
    rec[punchType] = punchTime;
  }

  // Recalculate daily stats using employee's shift rules
  const shifts = window.DB.getShifts();
  const shift = shifts.find(s => s.code === emp.shiftCode);
  if (shift) {
    window.DB.calculateAttendanceStats(rec, shift);
  }

  // Save to LocalStorage DB
  attendance[recordKey] = rec;
  window.DB.saveAttendance(targetYearMonth, attendance);

  // Success Toast & UI updating
  const successMsg = nightShiftTriggered 
    ? `تم ربط البصمة تلقائياً كخروج للدوام الليلي ليوم أمس (${targetDate}) بنجاح!` 
    : 'تم حفظ البصمة اليدوية بنجاح وإعادة احتساب المؤشرات اليومية.';

  Swal.fire({
    title: 'تم الحفظ بنجاح! 🎉',
    text: successMsg,
    icon: 'success',
    timer: 2500,
    showConfirmButton: false
  });

  // Clear ONLY the time input as requested, keeping employee selected for rapid logging!
  document.getElementById('punch-time').value = '';
  document.getElementById('punch-time').focus();

  // Refresh Grid UI
  renderAttendanceGrid();
  highlightEmployeeRow(empNo);
}

// Clear day's punches for the selected employee and date
function clearSelectedDayPunches() {
  const empNo = document.getElementById('employee-select').value;
  const punchDate = document.getElementById('punch-date').value;

  if (!empNo || !punchDate) {
    Swal.fire('تنبيه ⚠️', 'الرجاء اختيار الموظف والتاريخ أولاً لمسح بصمات هذا اليوم.', 'warning');
    return;
  }

  Swal.fire({
    title: 'هل ترغب في مسح بصمات اليوم؟',
    text: `سيتم تصفير وحذف كافة بصمات الموظف لهذا اليوم (${punchDate}) وإعادته كغياب أو يوم غير مسجل.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'نعم، امسح البصمات',
    cancelButtonText: 'إلغاء'
  }).then((result) => {
    if (result.isConfirmed) {
      const yearMonth = punchDate.substring(0, 7);
      const attendance = window.DB.getAttendance(yearMonth);
      const key = `${empNo}_${punchDate}`;

      if (attendance[key]) {
        delete attendance[key];
        window.DB.saveAttendance(yearMonth, attendance);
        
        Swal.fire('تم المسح!', 'تم حذف بصمات اليوم المختار للموظف بنجاح.', 'success');
        renderAttendanceGrid();
        highlightEmployeeRow(empNo);
      } else {
        Swal.fire('عذراً', 'لا توجد بصمات مسجلة لهذا اليوم مسبقاً لمسحها.', 'info');
      }
    }
  });
}

// Reset form fields
function resetPunchForm() {
  clearSelectionDisplay();
  initDefaultDate();
  document.getElementById('punch-time').value = '';
  document.getElementById('punch-type').value = 'auto';
  
  // Remove highlights
  document.querySelectorAll('#attendance-tbody tr').forEach(tr => {
    tr.classList.remove('table-primary');
  });
}

// Recalculate metrics trigger handler
function runFullRecalculation() {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'إعادة احتساب الحضور والرواتب...',
      text: 'نقوم بمزامنة البصمات اليدوية والمستوردة وتحديث دفاتر الغياب والتأخيرات والرواتب لكافة الموظفين.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  setTimeout(() => {
    try {
      const yearMonth = getSelectedYearMonth();
      if (window.DB) {
        window.DB.recalculateMonth(yearMonth);
      }
      if (typeof Swal !== 'undefined') Swal.close();
      window.Toast.success('تمت إعادة جدولة واحتساب التحليلات ومستحقات الرواتب للشهر الحالي بنجاح.');
      renderAttendanceGrid();
    } catch (e) {
      if (typeof Swal !== 'undefined') Swal.close();
      window.Toast.error('فشل إعادة الاحتساب: ' + e);
    }
  }, 600);
}

// Render the grid matching attendance.html visual style and support dynamic blur changes
function renderAttendanceGrid() {
  if (!window.DB) return;

  const yearMonth = getSelectedYearMonth();
  const [year, month] = yearMonth.split('-').map(x => parseInt(x, 10));

  const daysInMonth = window.DB.getDaysInMonth(year, month);
  const employees = window.DB.getEmployees();
  const shifts = window.DB.getShifts();
  const attendance = window.DB.getAttendance(yearMonth);

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
  theadRow1.innerHTML = `
    <th rowspan="2" class="align-middle text-center bg-secondary text-white" style="border-bottom:3px solid #cbd5e1; width:50px;"><i class="bi bi-gear"></i></th>
    <th rowspan="2" class="align-middle text-center bg-secondary text-white" style="border-bottom:3px solid #cbd5e1;">الرقم الوظيفي</th>
    <th rowspan="2" class="align-middle bg-secondary text-white" style="border-bottom:3px solid #cbd5e1; text-align:right;">اسم الموظف</th>
    <th rowspan="2" class="align-middle bg-secondary text-white" style="border-bottom:3px solid #cbd5e1;">الوردية</th>
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
      <th class="cell-punch text-center text-primary font-mono" style="background:#f1f5f9; border-left:1px solid #e2e8f0; font-size:11px;">دخول 1</th>
      <th class="cell-punch text-center text-danger font-mono" style="background:#f1f5f9; border-left:1px solid #e2e8f0; font-size:11px;">خروج 1</th>
      <th class="cell-punch text-center text-primary font-mono" style="background:#f1f5f9; border-left:1px solid #e2e8f0; font-size:11px;">دخول 2</th>
      <th class="cell-punch text-center text-danger font-mono" style="background:#f1f5f9; border-left:1px solid #e2e8f0; font-size:11px;">خروج 2</th>
      <th class="cell-reason text-center text-dark" style="background:#e8eff6; border-left:2px solid #cbd5e1; font-size:11px;">السبب</th>
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
    const totalCols = 4 + daysInMonth * 5;
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

    // Select row click binds to manual-entry form auto-picker
    let rowHTML = `
      <td class="text-center bg-light">
        <button class="btn btn-xs btn-outline-primary p-1 py-0 fs-7" onclick="selectEmployeeForForm('${emp.empNo}')" title="اختيار الموظف لتسجيل البصمة">
          <i class="bi bi-plus-circle-fill"></i>
        </button>
      </td>
      <td class="fw-bold bg-light text-center font-mono">${emp.empNo}</td>
      <td class="fw-semibold text-end" style="text-align:right;">${emp.name}</td>
      <td class="text-secondary small text-center">${shiftName}</td>
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
        <td class="cell-punch p-0 ${cellBg}" style="border-left:1px solid #e2e8f0" onclick="selectCellForForm('${emp.empNo}', '${dateStr}', 'checkIn1')">
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
        <td class="cell-punch p-0 ${cellBg}" style="border-left:1px solid #e2e8f0" onclick="selectCellForForm('${emp.empNo}', '${dateStr}', 'checkOut1')">
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
        <td class="cell-punch p-0 ${cellBg}" style="border-left:1px solid #e2e8f0" onclick="selectCellForForm('${emp.empNo}', '${dateStr}', 'checkIn2')">
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
        <td class="cell-punch p-0 ${cellBg}" style="border-left:1px solid #e2e8f0" onclick="selectCellForForm('${emp.empNo}', '${dateStr}', 'checkOut2')">
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
}

// Select an employee row to be automatically set in form
window.selectEmployeeForForm = function(empNo) {
  if (!window.DB) return;
  const select = document.getElementById('employee-select');
  const searchInput = document.getElementById('employee-search-input');
  
  const emp = window.DB.getEmployees().find(e => e.empNo === empNo);
  if (emp && select) {
    select.value = emp.empNo;
    if (searchInput) searchInput.value = emp.name;
    document.getElementById('display-emp-no').textContent = emp.empNo;
    document.getElementById('display-emp-name').textContent = emp.name;
    highlightEmployeeRow(empNo);
    window.Toast.success(`تم اختيار الموظف: ${emp.name}`);
  }
};

// Select specific cell (Employee & Date) to quickly fill the form
window.selectCellForForm = function(empNo, dateStr, slotType) {
  if (!window.DB) return;
  const select = document.getElementById('employee-select');
  const searchInput = document.getElementById('employee-search-input');
  const dateInput = document.getElementById('punch-date');
  const typeInput = document.getElementById('punch-type');

  const emp = window.DB.getEmployees().find(e => e.empNo === empNo);
  if (emp) {
    if (select) select.value = emp.empNo;
    if (searchInput) searchInput.value = emp.name;
    if (dateInput) dateInput.value = dateStr;
    if (typeInput) typeInput.value = slotType;

    document.getElementById('display-emp-no').textContent = emp.empNo;
    document.getElementById('display-emp-name').textContent = emp.name;
    highlightEmployeeRow(empNo);
    
    // Focus on time field for instant inputting
    document.getElementById('punch-time').focus();
  }
};

// Global inline cell modifications save (enabling matching the main page exact functionality!)
window.updateAttendanceCell = function(empNo, dateStr, field, value) {
  let cleanVal = String(value || '').trim();

  // Smart formatting inline
  if (field !== 'reason' && cleanVal !== '') {
    cleanVal = formatTimeSmart(cleanVal);
    
    // Validate format
    const timeMatch = cleanVal.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (!timeMatch) {
      Swal.fire({
        title: 'تنسيق وقت غير صالح ❌',
        text: `الوقت المدخل "${value}" غير صالح! يجب إدخال الوقت بصيغة 24 ساعة مثلاً: 08:30`,
        icon: 'error',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#ef4444'
      });
      renderAttendanceGrid(); // Refresh grid to revert wrong value
      return;
    }
  }

  const [year, month] = dateStr.split('-');
  const yearMonth = `${year}-${month}`;
  const attendance = window.DB.getAttendance(yearMonth);
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
  const employees = window.DB.getEmployees();
  const emp = employees.find(e => e.empNo === empNo);
  if (emp) {
    const shifts = window.DB.getShifts();
    const shift = shifts.find(s => s.code === emp.shiftCode);
    if (shift) {
      window.DB.calculateAttendanceStats(attendance[recordKey], shift);
      
      // Auto register/deregister to leaves table if reason changes
      if (field === 'reason') {
        let leaves = window.DB.getLeaves();
        const existingIndex = leaves.findIndex(l => l.empNo === empNo && l.startDate === dateStr && l.source === 'تم إنشاؤها من ورقة البصمات');
        
        if (existingIndex !== -1) {
          const oldLeave = leaves[existingIndex];
          if (oldLeave.leaveType === 'إجازة سنوية') {
            const emps = window.DB.getEmployees();
            const currentEmp = emps.find(e => e.empNo === empNo);
            if (currentEmp) {
              currentEmp.leaveBalance = (currentEmp.leaveBalance || 0) + 1;
              window.DB.saveEmployees(emps);
            }
          }
          leaves.splice(existingIndex, 1);
          window.DB.saveLeaves(leaves);
        }

        // Sync leaf record
        if (['إجازة سنوية', 'إجازة مرضية', 'إجازة بدون راتب'].includes(cleanVal)) {
          leaves = window.DB.getLeaves();
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
            window.DB.addLeave(newLeaveRecord);
            window.Toast.success(`تمت مزامنة وتسجيل إجازة (${cleanVal}) في سجل الإجازات.`);
          }
        }
      }
    }
  }

  window.DB.saveAttendance(yearMonth, attendance);
  window.Toast.success('تم التحديث بنجاح.');
  renderAttendanceGrid();
};
