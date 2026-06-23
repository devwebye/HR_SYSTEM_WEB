/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('quick-attendance-page-indicator')) return;

  // Set default date range to today
  initDefaultDate();

  // Bind key actions
  document.getElementById('btn-load-active-employees').addEventListener('click', loadActiveEmployees);
  document.getElementById('btn-add-blank-row').addEventListener('click', () => addBlankRow());
  document.getElementById('btn-clear-table').addEventListener('click', clearTableRows);
  document.getElementById('btn-save-all-attendance').addEventListener('click', saveAllQuickAttendance);

  // Global paste listeners
  document.addEventListener('paste', handleGlobalPaste);
  const pasteArea = document.getElementById('paste-direct-textarea');
  if (pasteArea) {
    pasteArea.addEventListener('paste', (e) => {
      // Small timeout to allow paste to fill before parsing
      setTimeout(() => {
        parsePasteText(pasteArea.value);
        pasteArea.value = '';
      }, 50);
    });
  }

  // Monitor date changes to trigger real-time validation
  document.getElementById('quick-attendance-from-date').addEventListener('change', runRealtimeValidation);
  document.getElementById('quick-attendance-to-date').addEventListener('change', runRealtimeValidation);
});

// Helper: Format date to YYYY-MM-DD
function formatDateToYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Set default date range to today's date
function initDefaultDate() {
  const fromInput = document.getElementById('quick-attendance-from-date');
  const toInput = document.getElementById('quick-attendance-to-date');
  if (!fromInput || !toInput) return;
  
  const today = new Date();
  const todayStr = formatDateToYYYYMMDD(today);
  fromInput.value = todayStr;
  toInput.value = todayStr;
}

// Get active from/to dates
function getSelectedFromDate() {
  const fromInput = document.getElementById('quick-attendance-from-date');
  return fromInput ? fromInput.value : formatDateToYYYYMMDD(new Date());
}

function getSelectedToDate() {
  const toInput = document.getElementById('quick-attendance-to-date');
  return toInput ? toInput.value : formatDateToYYYYMMDD(new Date());
}

// Utility: Get all dates in range (inclusive)
function getDatesInRange(startDateStr, endDateStr) {
  const dates = [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  // Set time to noon to avoid daylight saving/timezone offset jumps
  let current = new Date(start);
  current.setHours(12, 0, 0, 0);
  
  const endLimit = new Date(end);
  endLimit.setHours(12, 0, 0, 0);

  while (current <= endLimit) {
    dates.push(formatDateToYYYYMMDD(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Utility: Determine beautiful soft pastel styling for each unique date, making Friday highlight green
function getDateColorStyle(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  if (day === 5) { // 5 is Friday
    return 'background-color: #f0fdf4 !important; border-right: 5px solid #16a34a !important;'; // Light green for Friday/Weekend
  }
  
  // High-quality pastel colors for cycling other weekdays
  const palette = [
    'background-color: #f8fafc !important; border-right: 5px solid #64748b !important;', // slate
    'background-color: #f0f9ff !important; border-right: 5px solid #0284c7 !important;', // sky blue
    'background-color: #faf5ff !important; border-right: 5px solid #a855f7 !important;', // purple
    'background-color: #fff1f2 !important; border-right: 5px solid #f43f5e !important;', // rose
    'background-color: #fffbeb !important; border-right: 5px solid #eab308 !important;', // amber
    'background-color: #fdf2f8 !important; border-right: 5px solid #ec4899 !important;'  // pink
  ];

  // Simple string hash to cycle through the color palette consistently
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % palette.length;
  return palette[idx];
}

// Clear table body rows
function clearTableRows() {
  const tbody = document.getElementById('quick-attendance-tbody');
  if (!tbody) return;

  if (tbody.children.length > 0 && !tbody.querySelector('td[colspan]')) {
    Swal.fire({
      title: 'تأكيد تصفير الجدول؟',
      text: 'سيتم مسح كافة الصفوف المعروضة في الجدول حالياً. لن يؤثر هذا على السجلات المحفوظة مسبقاً في النظام.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'نعم، مسح الصفوف',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        tbody.innerHTML = `
          <tr>
            <td colspan="12" class="text-center py-5 text-muted bg-white">
              <i class="bi bi-people fs-2 d-block mb-2 text-secondary"></i>
              <span>الجدول فارغ حالياً. اضغط على <strong>تحميل الموظفين النشطين</strong> لجلبهم تلقائياً، أو <strong>إضافة صف فارغ جديد</strong> للبدء بالكتابة أو اللصق.</span>
            </td>
          </tr>
        `;
        updateRowCount();
        runRealtimeValidation();
      }
    });
  } else {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" class="text-center py-5 text-muted bg-white">
          <i class="bi bi-people fs-2 d-block mb-2 text-secondary"></i>
          <span>الجدول فارغ حالياً. اضغط على <strong>تحميل الموظفين النشطين</strong> لجلبهم تلقائياً، أو <strong>إضافة صف فارغ جديد</strong> للبدء بالكتابة أو اللصق.</span>
        </td>
      </tr>
    `;
    updateRowCount();
    runRealtimeValidation();
  }
}

// Load all active employees for the selected period range
function loadActiveEmployees() {
  if (!window.DB) {
    Swal.fire('خطأ ❌', 'لا يمكن الاتصال بقاعدة البيانات المحلية.', 'error');
    return;
  }

  const fromDate = getSelectedFromDate();
  const toDate = getSelectedToDate();

  if (new Date(fromDate) > new Date(toDate)) {
    Swal.fire('تنبيه ⚠️', 'تاريخ البدء يجب أن يكون قبل أو يساوي تاريخ الانتهاء.', 'warning');
    return;
  }

  const datesInRange = getDatesInRange(fromDate, toDate);
  if (datesInRange.length > 31) {
    Swal.fire('تنبيه ⚠️', 'الرجاء اختيار فترة لا تتجاوز 31 يوماً لتجنب إبطاء المتصفح.', 'warning');
    return;
  }

  const employees = window.DB.getEmployees().filter(emp => emp.status === 'نشط');
  if (employees.length === 0) {
    Swal.fire('تنبيه ⚠️', 'لا يوجد موظفون نشطون حالياً في ملف الموظفين.', 'info');
    return;
  }

  const tbody = document.getElementById('quick-attendance-tbody');
  if (!tbody) return;

  // Clear placeholders
  const placeholder = tbody.querySelector('td[colspan]');
  if (placeholder) {
    tbody.innerHTML = '';
  }

  let rowsAdded = 0;

  // Add a row for each employee for each date in range
  datesInRange.forEach(dateStr => {
    const isFriday = new Date(dateStr).getDay() === 5;

    employees.forEach(emp => {
      // Check if employee+date combination already exists in current grid
      const exists = Array.from(tbody.querySelectorAll('.spreadsheet-row')).some(row => {
        const rDate = row.querySelector('.input-date')?.value;
        const rEmpNo = row.querySelector('.input-emp-no')?.value.trim();
        return rDate === dateStr && rEmpNo === emp.empNo;
      });

      if (!exists) {
        addBlankRow({
          date: dateStr,
          empNo: emp.empNo,
          name: emp.name,
          shiftCode: emp.shiftCode,
          checkIn1: '',
          checkOut1: '',
          checkIn2: '',
          checkOut2: '',
          reason: isFriday ? 'إجازة أسبوعية' : '',
          notes: isFriday ? 'إجازة نهاية الأسبوع (الجمعة)' : ''
        });
        rowsAdded++;
      }
    });
  });

  Swal.fire({
    title: 'تم تحميل الموظفين! 👥',
    text: `تم جدولة وتوليد عدد ${rowsAdded} صفاً للموظفين النشطين على مدار ${datesInRange.length} أيام للفترة المحددة.`,
    icon: 'success',
    timer: 2000,
    showConfirmButton: false
  });

  updateRowCount();
  runRealtimeValidation();
}

// Update count badge
function updateRowCount() {
  const tbody = document.getElementById('quick-attendance-tbody');
  const countBadge = document.getElementById('rows-count-badge');
  if (!tbody || !countBadge) return;

  if (tbody.querySelector('td[colspan]')) {
    countBadge.textContent = '0';
    return;
  }

  countBadge.textContent = tbody.children.length;
}

// Append a single row to the grid
function addBlankRow(data = null) {
  const tbody = document.getElementById('quick-attendance-tbody');
  if (!tbody) return;

  // Clear placeholders
  const placeholder = tbody.querySelector('td[colspan]');
  if (placeholder) {
    tbody.innerHTML = '';
  }

  const rowCount = tbody.children.length;
  const tr = document.createElement('tr');
  tr.className = 'spreadsheet-row';

  // Soft pastel shading depending on date
  const rowDate = data ? data.date : getSelectedFromDate();
  const colorStyle = getDateColorStyle(rowDate);
  tr.setAttribute('style', colorStyle);

  // Reasons dropdown including 'إجازة أسبوعية'
  const reasons = [
    { value: '', text: 'لا يوجد' },
    { value: 'إذن دخول', text: 'إذن دخول' },
    { value: 'إذن خروج', text: 'إذن خروج' },
    { value: 'مهمة عمل', text: 'مهمة عمل' },
    { value: 'نسيان بصمة', text: 'نسيان بصمة' },
    { value: 'إجازة سنوية', text: 'إجازة سنوية' },
    { value: 'إجازة مرضية', text: 'إجازة مرضية' },
    { value: 'إجازة بدون راتب', text: 'إجازة بدون راتب' },
    { value: 'إجازة رسمية', text: 'إجازة رسمية' },
    { value: 'إجازة أسبوعية', text: 'إجازة أسبوعية' },
    { value: 'أخرى', text: 'أخرى' }
  ];

  let reasonsOptions = '';
  reasons.forEach(r => {
    const selected = data && data.reason === r.value ? 'selected' : '';
    reasonsOptions += `<option value="${r.value}" ${selected}>${r.text}</option>`;
  });

  tr.innerHTML = `
    <td class="row-num align-middle">${rowCount + 1}</td>
    <td>
      <input type="date" class="input-date form-control form-control-sm text-center border-0 font-mono" data-col="0" value="${rowDate}" style="background-color: transparent;" />
    </td>
    <td>
      <input type="text" class="input-emp-no font-mono" placeholder="الرقم الوظيفي" data-col="1" value="${data ? data.empNo : ''}" />
    </td>
    <td class="cell-readonly span-emp-name text-end fw-semibold text-secondary" style="text-align:right;">${data ? data.name : '--'}</td>
    <td class="cell-readonly span-shift-code fw-medium text-dark">${data ? data.shiftCode : '--'}</td>
    <td>
      <input type="text" class="input-in1 font-mono text-primary" placeholder="--" data-col="2" value="${data ? data.checkIn1 : ''}" />
    </td>
    <td>
      <input type="text" class="input-out1 font-mono text-danger" placeholder="--" data-col="3" value="${data ? data.checkOut1 : ''}" />
    </td>
    <td>
      <input type="text" class="input-in2 font-mono text-primary" placeholder="--" data-col="4" value="${data ? data.checkIn2 : ''}" />
    </td>
    <td>
      <input type="text" class="input-out2 font-mono text-danger" placeholder="--" data-col="5" value="${data ? data.checkOut2 : ''}" />
    </td>
    <td>
      <select class="input-reason form-select py-1 border-0" data-col="6" style="background-color: transparent;">
        ${reasonsOptions}
      </select>
    </td>
    <td>
      <input type="text" class="input-notes font-sans" placeholder="اضف ملاحظة..." data-col="7" value="${data ? data.notes : ''}" style="background-color: transparent;" />
    </td>
    <td class="text-center align-middle bg-light">
      <button class="btn btn-link btn-sm text-danger p-0 border-0 btn-delete-row" title="حذف الصف">
        <i class="bi bi-trash fs-5"></i>
      </button>
    </td>
  `;

  tbody.appendChild(tr);

  // Bind interactive elements inside row
  bindRowEvents(tr);
  updateRowCount();
  runRealtimeValidation();
}

// Bind row events for immediate feedback and focus shifting
function bindRowEvents(tr) {
  const dateInput = tr.querySelector('.input-date');
  const empInput = tr.querySelector('.input-emp-no');
  const spanName = tr.querySelector('.span-emp-name');
  const spanShift = tr.querySelector('.span-shift-code');
  const deleteBtn = tr.querySelector('.btn-delete-row');

  const timeInputs = [
    tr.querySelector('.input-in1'),
    tr.querySelector('.input-out1'),
    tr.querySelector('.input-in2'),
    tr.querySelector('.input-out2')
  ];

  const reasonSelect = tr.querySelector('.input-reason');
  const notesInput = tr.querySelector('.input-notes');

  // 1. Date changed manually: Update colors and auto-fill Fridays
  if (dateInput) {
    dateInput.addEventListener('change', () => {
      const newDate = dateInput.value;
      if (newDate) {
        const colorStyle = getDateColorStyle(newDate);
        tr.setAttribute('style', colorStyle);

        // Auto-fill Friday as weekend
        const isFriday = new Date(newDate).getDay() === 5;
        if (isFriday) {
          reasonSelect.value = 'إجازة أسبوعية';
          notesInput.value = 'إجازة نهاية الأسبوع (الجمعة)';
        } else if (reasonSelect.value === 'إجازة أسبوعية') {
          reasonSelect.value = '';
          notesInput.value = '';
        }
      }
      runRealtimeValidation();
    });
  }

  // 2. Employee ID lookup
  if (empInput) {
    empInput.addEventListener('blur', () => {
      const empNo = empInput.value.trim();
      if (!empNo) {
        spanName.textContent = '--';
        spanShift.textContent = '--';
        runRealtimeValidation();
        return;
      }

      if (window.DB) {
        const emp = window.DB.getEmployees().find(x => x.empNo === empNo);
        if (emp) {
          spanName.textContent = emp.name;
          spanShift.textContent = emp.shiftCode;
          spanName.classList.remove('text-danger');
          spanName.classList.add('text-success');
        } else {
          spanName.textContent = 'موظف غير موجود! ❌';
          spanShift.textContent = '--';
          spanName.classList.remove('text-success');
          spanName.classList.add('text-danger');
        }
      }
      runRealtimeValidation();
    });
  }

  // 3. Smart abbreviated time formatting
  timeInputs.forEach(input => {
    if (!input) return;

    input.addEventListener('blur', () => {
      let val = input.value.trim();
      if (!val) {
        runRealtimeValidation();
        return;
      }

      const formatted = formatTimeSmart(val);
      input.value = formatted;

      runRealtimeValidation();
    });
  });

  // 4. Reason and Notes change trigger
  if (reasonSelect) reasonSelect.addEventListener('change', runRealtimeValidation);
  if (notesInput) notesInput.addEventListener('blur', runRealtimeValidation);

  // 5. Delete row click handler
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      tr.remove();
      const tbody = document.getElementById('quick-attendance-tbody');
      if (tbody) {
        Array.from(tbody.children).forEach((row, idx) => {
          const numCell = row.querySelector('.row-num');
          if (numCell) numCell.textContent = idx + 1;
        });

        if (tbody.children.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="12" class="text-center py-5 text-muted bg-white">
                <i class="bi bi-people fs-2 d-block mb-2 text-secondary"></i>
                <span>الجدول فارغ حالياً. اضغط على <strong>تحميل الموظفين النشطين</strong> لجلبهم تلقائياً، أو <strong>إضافة صف فارغ جديد</strong> للبدء بالكتابة أو اللصق.</span>
              </td>
            </tr>
          `;
        }
      }
      updateRowCount();
      runRealtimeValidation();
    });
  }

  // 6. Keyboard navigation bindings
  const allNavigableFields = [dateInput, empInput, ...timeInputs, reasonSelect, notesInput].filter(f => !!f);
  allNavigableFields.forEach(field => {
    field.addEventListener('keydown', (e) => {
      handleKeyboardNavigation(e, field);
    });
  });
}

// Spreadsheet fast navigation handler
function handleKeyboardNavigation(e, activeField) {
  const tr = activeField.closest('tr');
  const tbody = tr.parentNode;
  const rows = Array.from(tbody.children);
  const rowIdx = rows.indexOf(tr);
  const colIdx = parseInt(activeField.getAttribute('data-col'), 10);

  let targetRowIdx = rowIdx;
  let targetColIdx = colIdx;
  let prevent = false;

  switch (e.key) {
    case 'ArrowUp':
      targetRowIdx = rowIdx - 1;
      prevent = true;
      break;
    case 'ArrowDown':
    case 'Enter':
      targetRowIdx = rowIdx + 1;
      prevent = true;
      break;
    case 'ArrowLeft':
      targetColIdx = colIdx - 1;
      prevent = true;
      break;
    case 'ArrowRight':
      targetColIdx = colIdx + 1;
      prevent = true;
      break;
    default:
      return; // normal typing
  }

  if (prevent) {
    e.preventDefault();
  }

  // Boundary checks (0 to 7 cols)
  if (targetRowIdx < 0) targetRowIdx = 0;
  if (targetRowIdx >= rows.length) targetRowIdx = rows.length - 1;
  if (targetColIdx < 0) targetColIdx = 0;
  if (targetColIdx > 7) targetColIdx = 7;

  const targetRow = rows[targetRowIdx];
  if (targetRow) {
    const targetField = targetRow.querySelector(`[data-col="${targetColIdx}"]`);
    if (targetField) {
      targetField.focus();
      if (typeof targetField.select === 'function') {
        targetField.select();
      }
    }
  }
}

// Smart time formatting (e.g., 800 -> 08:00, 45 -> 00:45)
function formatTimeSmart(val) {
  let clean = val.replace(/\D/g, '').trim();
  if (!clean) return val;

  if (clean.length === 1) {
    return `0${clean}:00`;
  } else if (clean.length === 2) {
    const num = parseInt(clean, 10);
    if (num > 23) {
      return `00:${String(num).padStart(2, '0')}`;
    } else {
      return `${String(num).padStart(2, '0')}:00`;
    }
  } else if (clean.length === 3) {
    const h = clean.substring(0, 1);
    const m = clean.substring(1);
    return `0${h}:${m}`;
  } else if (clean.length === 4) {
    const h = clean.substring(0, 2);
    const m = clean.substring(2);
    return `${h}:${m}`;
  }
  return val;
}

// Global & direct paste handler
function handleGlobalPaste(e) {
  const active = document.activeElement;
  if (!active) return;

  if (active.classList.contains('input-date') ||
      active.classList.contains('input-emp-no') || 
      active.classList.contains('input-in1') || 
      active.classList.contains('input-out1') || 
      active.classList.contains('input-in2') || 
      active.classList.contains('input-out2') || 
      active.id === 'paste-direct-textarea') {
    
    const text = e.clipboardData ? e.clipboardData.getData('text') : '';
    if (text && text.includes('\t')) {
      e.preventDefault();
      parsePasteText(text);
    }
  }
}

// Clipboard Excel-paste parsing with smart date column detection
function parsePasteText(text) {
  if (!text) return;

  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return;

  const tbody = document.getElementById('quick-attendance-tbody');
  if (!tbody) return;

  // Clear placeholders
  const placeholder = tbody.querySelector('td[colspan]');
  if (placeholder) {
    tbody.innerHTML = '';
  }

  let successCount = 0;

  lines.forEach(line => {
    const cells = line.split('\t').map(c => c.trim());
    if (cells.length === 0 || !cells[0]) return;

    let rowDate = getSelectedFromDate();
    let empNo = cells[0];
    let timeIndexStart = 1;

    // Detect if column 0 looks like a date (e.g. contains '-' or '/' and isn't a plain number)
    if (cells[0] && (cells[0].includes('-') || cells[0].includes('/')) && isNaN(cells[0])) {
      try {
        const parsedDate = new Date(cells[0]);
        if (!isNaN(parsedDate.getTime())) {
          rowDate = formatDateToYYYYMMDD(parsedDate);
        }
      } catch(e) {}
      empNo = cells[1] || '';
      timeIndexStart = 2;
    }

    // Lookup employee info
    let empName = '--';
    let shiftCode = '--';
    if (window.DB && empNo) {
      const emp = window.DB.getEmployees().find(x => x.empNo === empNo);
      if (emp) {
        empName = emp.name;
        shiftCode = emp.shiftCode;
      }
    }

    // Map time slots and metadata
    const checkIn1 = cells[timeIndexStart] ? formatTimeSmart(cells[timeIndexStart]) : '';
    const checkOut1 = cells[timeIndexStart + 1] ? formatTimeSmart(cells[timeIndexStart + 1]) : '';
    const checkIn2 = cells[timeIndexStart + 2] ? formatTimeSmart(cells[timeIndexStart + 2]) : '';
    const checkOut2 = cells[timeIndexStart + 3] ? formatTimeSmart(cells[timeIndexStart + 3]) : '';
    const reason = cells[timeIndexStart + 4] || '';
    const notes = cells[timeIndexStart + 5] || '';

    // Automatically check if pasted date is Friday to auto pre-fill
    const isFriday = new Date(rowDate).getDay() === 5;

    addBlankRow({
      date: rowDate,
      empNo,
      name: empName,
      shiftCode,
      checkIn1,
      checkOut1,
      checkIn2,
      checkOut2,
      reason: reason || (isFriday ? 'إجازة أسبوعية' : ''),
      notes: notes || (isFriday ? 'إجازة نهاية الأسبوع (الجمعة)' : '')
    });

    successCount++;
  });

  Swal.fire({
    title: 'تم استيراد ولصق البيانات! 📋',
    text: `تم فحص ولصق عدد ${successCount} سجل من جدول Excel بنجاح.`,
    icon: 'success',
    timer: 2000,
    showConfirmButton: false
  });

  updateRowCount();
  runRealtimeValidation();
}

// Validation Engine
function runRealtimeValidation() {
  const tbody = document.getElementById('quick-attendance-tbody');
  const validBadge = document.getElementById('valid-rows-count');
  const invalidBadge = document.getElementById('invalid-rows-count');
  const errorBox = document.getElementById('validation-errors-box');
  const errorList = document.getElementById('validation-errors-list');

  if (!tbody || !validBadge || !invalidBadge || !errorBox || !errorList) return;

  if (tbody.querySelector('td[colspan]')) {
    validBadge.textContent = '0';
    invalidBadge.textContent = '0';
    errorBox.classList.add('d-none');
    return;
  }

  const rows = Array.from(tbody.children);
  let validCount = 0;
  let invalidCount = 0;
  const errors = [];
  const checkedKeys = new Set(); // To prevent duplicate (employee + date) combos in the grid

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  rows.forEach((row, index) => {
    const rNum = index + 1;
    
    // Read fields
    const dateField = row.querySelector('.input-date');
    const rowDate = dateField ? dateField.value.trim() : '';

    const empInput = row.querySelector('.input-emp-no');
    const empNo = empInput ? empInput.value.trim() : '';

    const in1 = row.querySelector('.input-in1')?.value.trim() || '';
    const out1 = row.querySelector('.input-out1')?.value.trim() || '';
    const in2 = row.querySelector('.input-in2')?.value.trim() || '';
    const out2 = row.querySelector('.input-out2')?.value.trim() || '';

    let rowHasError = false;

    // 1. Check valid date
    if (!rowDate) {
      errors.push(`الصف ${rNum}: التاريخ مطلوب.`);
      rowHasError = true;
    } else if (!dateRegex.test(rowDate)) {
      errors.push(`الصف ${rNum}: صيغة التاريخ غير صالحة (${rowDate}).`);
      rowHasError = true;
    }

    // 2. Check Emp No
    if (!empNo) {
      errors.push(`الصف ${rNum}: الرقم الوظيفي مطلوب.`);
      rowHasError = true;
    } else {
      if (window.DB) {
        const emp = window.DB.getEmployees().find(x => x.empNo === empNo);
        if (!emp) {
          errors.push(`الصف ${rNum}: الرقم الوظيفي (${empNo}) غير مسجل في النظام.`);
          rowHasError = true;
        }
      }

      // Check duplicate combo (Employee + Date) in the grid
      if (rowDate) {
        const comboKey = `${empNo}_${rowDate}`;
        if (checkedKeys.has(comboKey)) {
          errors.push(`الصف ${rNum}: تم تكرار تحضير نفس الموظف (${empNo}) لنفس اليوم (${rowDate}).`);
          rowHasError = true;
        }
        checkedKeys.add(comboKey);
      }
    }

    // 3. Check time formatting
    const timesToCheck = [
      { name: 'دخول 1', val: in1 },
      { name: 'خروج 1', val: out1 },
      { name: 'دخول 2', val: in2 },
      { name: 'خروج 2', val: out2 }
    ];

    timesToCheck.forEach(t => {
      if (t.val && !timeRegex.test(t.val)) {
        errors.push(`الصف ${rNum}: صيغة وقت حقل (${t.name}) غير صالحة: "${t.val}". يجب أن تكون بصيغة HH:MM.`);
        rowHasError = true;
      }
    });

    if (rowHasError) {
      row.style.border = '2px solid #ef4444'; // outline red
      invalidCount++;
    } else {
      row.style.border = ''; // reset
      validCount++;
    }
  });

  validBadge.textContent = validCount;
  invalidBadge.textContent = invalidCount;

  if (errors.length > 0) {
    errorList.innerHTML = errors.map(e => `<li>${e}</li>`).join('');
    errorBox.classList.remove('d-none');
  } else {
    errorList.innerHTML = '';
    errorBox.classList.add('d-none');
  }
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

// Save all quick attendance handler
function saveAllQuickAttendance() {
  const tbody = document.getElementById('quick-attendance-tbody');
  if (!tbody || tbody.querySelector('td[colspan]')) {
    Swal.fire('خطأ ❌', 'الجدول فارغ! الرجاء تحميل الموظفين أو إضافة صفوف لإدخال الحضور.', 'error');
    return;
  }

  // Run final validation
  runRealtimeValidation();

  const invalidCountVal = parseInt(document.getElementById('invalid-rows-count').textContent, 10);
  if (invalidCountVal > 0) {
    Swal.fire({
      title: 'بيانات غير صالحة ❌',
      text: 'الرجاء تصحيح الأخطاء الموضحة باللون الأحمر في كشف الفحص قبل الحفظ.',
      icon: 'error',
      confirmButtonText: 'حسناً، سأصلحها',
      confirmButtonColor: '#ef4444'
    });
    return;
  }

  // Gather records to save
  const rows = Array.from(tbody.children);
  const recordsToSave = [];

  rows.forEach(row => {
    const rowDate = row.querySelector('.input-date').value.trim();
    const empNo = row.querySelector('.input-emp-no').value.trim();
    const checkIn1 = row.querySelector('.input-in1').value.trim();
    const checkOut1 = row.querySelector('.input-out1').value.trim();
    const checkIn2 = row.querySelector('.input-in2').value.trim();
    const checkOut2 = row.querySelector('.input-out2').value.trim();
    const reason = row.querySelector('.input-reason').value;
    const notes = row.querySelector('.input-notes').value.trim();

    recordsToSave.push({
      empNo,
      date: rowDate,
      checkIn1,
      checkOut1,
      checkIn2,
      checkOut2,
      reason,
      notes,
      isAbsent: false,
      isLeave: false
    });
  });

  if (!window.DB) return;

  // Count existing duplicates in the database across all months in the range
  let duplicateCount = 0;
  const currentAttendanceByMonth = {};

  recordsToSave.forEach(rec => {
    const ym = rec.date.substring(0, 7);
    if (!currentAttendanceByMonth[ym]) {
      currentAttendanceByMonth[ym] = window.DB.getAttendance(ym) || {};
    }
    const key = `${rec.empNo}_${rec.date}`;
    if (currentAttendanceByMonth[ym][key]) {
      duplicateCount++;
    }
  });

  if (duplicateCount > 0) {
    Swal.fire({
      title: 'وجدنا سجلات حضور سابقة! ⚠️',
      text: `هناك عدد ${duplicateCount} سجلات حضور مسجلة مسبقاً في الفترة المحددة. كيف تفضل معالجتها؟`,
      icon: 'question',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'تحديث وسد الفجوات (تحديث)',
      denyButtonText: 'استبدال البيانات بالكامل',
      cancelButtonText: 'إلغاء العملية',
      confirmButtonColor: '#4f46e5',
      denyButtonColor: '#ea580c',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        commitSaveMultiple(recordsToSave, 'merge');
      } else if (result.isDenied) {
        commitSaveMultiple(recordsToSave, 'overwrite');
      }
    });
  } else {
    commitSaveMultiple(recordsToSave, 'direct');
  }
}

// Transactional multi-date commit with Night Shift (دوام ليلي) cross-midnight linking
function commitSaveMultiple(recordsToSave, mode) {
  if (!window.DB) return;

  const employees = window.DB.getEmployees();
  const shifts = window.DB.getShifts();
  let nightShiftCounter = 0;
  const limitMinutes = window.DB.timeToMinutes(window.DB.getPreviousDayLimit());

  // Group modifications by month to avoid redundant writes
  const monthsToRecalculate = new Set();
  const monthsData = {};

  // Pre-load attendance objects for affected months
  recordsToSave.forEach(rec => {
    const ym = rec.date.substring(0, 7);
    if (!monthsData[ym]) {
      monthsData[ym] = window.DB.getAttendance(ym) || {};
    }
  });

  recordsToSave.forEach(rec => {
    const selectedDate = rec.date;
    const yearMonth = selectedDate.substring(0, 7);
    const attendance = monthsData[yearMonth];

    const emp = employees.find(e => e.empNo === rec.empNo);
    const shift = shifts.find(s => s.code === (emp ? emp.shiftCode : ''));

    // NIGHT SHIFT RULES LINKER:
    // If checkout time (checkOut1 or checkOut2) is after midnight and before limit (e.g. 06:00 AM)
    // AND the employee had work/record yesterday, link checkout to yesterday's record!
    let crossMidnightCheckOutValue = '';
    let crossMidnightSlot = '';

    if (rec.checkOut1) {
      const min = window.DB.timeToMinutes(rec.checkOut1);
      if (min < limitMinutes) {
        crossMidnightCheckOutValue = rec.checkOut1;
        crossMidnightSlot = 'checkOut1';
      }
    }
    if (rec.checkOut2 && !crossMidnightCheckOutValue) {
      const min = window.DB.timeToMinutes(rec.checkOut2);
      if (min < limitMinutes) {
        crossMidnightCheckOutValue = rec.checkOut2;
        crossMidnightSlot = 'checkOut2';
      }
    }

    if (crossMidnightCheckOutValue) {
      const yesterdayStr = getPreviousDateStr(selectedDate);
      const yesterdayYearMonth = yesterdayStr.substring(0, 7);
      
      if (!monthsData[yesterdayYearMonth]) {
        monthsData[yesterdayYearMonth] = window.DB.getAttendance(yesterdayYearMonth) || {};
      }
      const yesterdayAttendance = monthsData[yesterdayYearMonth];
      const yesterdayKey = `${rec.empNo}_${yesterdayStr}`;

      if (yesterdayAttendance[yesterdayKey] || (emp && emp.status === 'نشط')) {
        const yRec = yesterdayAttendance[yesterdayKey] || {
          empNo: rec.empNo,
          date: yesterdayStr,
          checkIn1: '',
          checkOut1: '',
          checkIn2: '',
          checkOut2: '',
          reason: '',
          isAbsent: false,
          isLeave: false
        };

        yRec[crossMidnightSlot] = crossMidnightCheckOutValue;

        if (shift) {
          window.DB.calculateAttendanceStats(yRec, shift);
        }

        yesterdayAttendance[yesterdayKey] = yRec;
        monthsToRecalculate.add(yesterdayYearMonth);
        nightShiftCounter++;

        // Clear that checkout slot from today's record to prevent double counting
        rec[crossMidnightSlot] = '';
      }
    }

    // Write today's record based on mode
    const key = `${rec.empNo}_${selectedDate}`;
    const existing = attendance[key];

    if (existing && mode === 'merge') {
      existing.checkIn1 = existing.checkIn1 || rec.checkIn1;
      existing.checkOut1 = existing.checkOut1 || rec.checkOut1;
      existing.checkIn2 = existing.checkIn2 || rec.checkIn2;
      existing.checkOut2 = existing.checkOut2 || rec.checkOut2;
      existing.reason = existing.reason || rec.reason;
      existing.notes = existing.notes || rec.notes;

      if (shift) {
        window.DB.calculateAttendanceStats(existing, shift);
      }
      attendance[key] = existing;
    } else {
      const finalRec = {
        ...rec,
        reason: rec.reason,
        notes: rec.notes
      };

      if (shift) {
        window.DB.calculateAttendanceStats(finalRec, shift);
      }

      // Sync leave balance logic (same as main attendance)
      if (['إجازة سنوية', 'إجازة مرضية', 'إجازة بدون راتب', 'إجازة أسبوعية', 'إجازة رسمية'].includes(rec.reason)) {
        let leaves = window.DB.getLeaves();
        const exists = leaves.some(l => l.empNo === rec.empNo && l.startDate === selectedDate);
        if (!exists) {
          const newLeaveRecord = {
            empNo: rec.empNo,
            leaveType: rec.reason,
            startDate: selectedDate,
            endDate: selectedDate,
            daysCount: 1,
            notes: 'تسجيل تلقائي من كشف الحضور السريع',
            source: 'تم إنشاؤها من ورقة البصمات'
          };
          window.DB.addLeave(newLeaveRecord);
        }
      }

      attendance[key] = finalRec;
    }

    monthsToRecalculate.add(yearMonth);
  });

  // Persist all modified months to database
  Object.keys(monthsData).forEach(ym => {
    window.DB.saveAttendance(ym, monthsData[ym]);
  });

  // Auto trigger month stats recalculation to sync all dashboards
  monthsToRecalculate.forEach(ym => {
    window.DB.recalculateMonth(ym);
  });

  let alertText = `تم تسجيل وحفظ حضور وانصراف عدد ${recordsToSave.length} سجل بنجاح، وتحديث كافة كشوف الحضور ومسيرات الرواتب للفترة المحددة.`;
  if (nightShiftCounter > 0) {
    alertText += `\n\n💡 تم رصد وربط عدد (${nightShiftCounter}) بصمات خروج متأخرة باليوم السابق كدوام ليلي ذكي تلقائياً.`;
  }

  Swal.fire({
    title: 'تم حفظ الحضور الجماعي! 🎉',
    text: alertText,
    icon: 'success',
    confirmButtonText: 'رائع',
    confirmButtonColor: '#10b981'
  });

  // Reset grid
  const tbody = document.getElementById('quick-attendance-tbody');
  tbody.innerHTML = `
    <tr>
      <td colspan="12" class="text-center py-5 text-muted bg-white">
        <i class="bi bi-people fs-2 d-block mb-2 text-secondary"></i>
        <span>الجدول فارغ حالياً. اضغط على <strong>تحميل الموظفين النشطين</strong> لجلبهم تلقائياً، أو <strong>إضافة صف فارغ جديد</strong> للبدء بالكتابة أو اللصق.</span>
      </td>
    </tr>
  `;

  updateRowCount();
  runRealtimeValidation();
}
