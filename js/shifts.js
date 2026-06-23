/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('shifts-page-indicator')) return;

  renderShiftsTable();

  // Binds forms
  const shiftForm = document.getElementById('shift-form');
  if (shiftForm) {
    shiftForm.addEventListener('submit', handleShiftSubmit);
  }

  // Bind live calculators on shifts entry
  const checkTimesIds = ['shift-in1', 'shift-out1', 'shift-in2', 'shift-out2'];
  checkTimesIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', autoCheckWorkingHours);
    }
  });

  // Search filter
  const searchInput = document.getElementById('search-shift');
  if (searchInput) {
    searchInput.addEventListener('input', renderShiftsTable);
  }

  // Export/Import hooks
  const exportBtn = document.getElementById('export-shifts');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportShiftsToExcel);
  }

  const importInput = document.getElementById('import-shifts-file');
  if (importInput) {
    importInput.addEventListener('change', importShiftsFromExcel);
  }

  // Batch Actions Event Listeners
  const selectAllCheck = document.getElementById('select-all-shifts');
  if (selectAllCheck) {
    selectAllCheck.addEventListener('change', (e) => {
      const checked = e.target.checked;
      document.querySelectorAll('.shift-checkbox').forEach(cb => {
        cb.checked = checked;
      });
      updateSelectedCount();
    });
  }

  const btnSelectAll = document.getElementById('btn-select-all');
  if (btnSelectAll) {
    btnSelectAll.addEventListener('click', () => {
      document.querySelectorAll('.shift-checkbox').forEach(cb => {
        cb.checked = true;
      });
      const selectAllCheck = document.getElementById('select-all-shifts');
      if (selectAllCheck) selectAllCheck.checked = true;
      updateSelectedCount();
    });
  }

  const btnDeselectAll = document.getElementById('btn-deselect-all');
  if (btnDeselectAll) {
    btnDeselectAll.addEventListener('click', () => {
      document.querySelectorAll('.shift-checkbox').forEach(cb => {
        cb.checked = false;
      });
      const selectAllCheck = document.getElementById('select-all-shifts');
      if (selectAllCheck) selectAllCheck.checked = false;
      updateSelectedCount();
    });
  }

  const btnDeleteSelected = document.getElementById('btn-delete-selected');
  if (btnDeleteSelected) {
    btnDeleteSelected.addEventListener('click', deleteSelectedShifts);
  }

  const tbody = document.getElementById('shifts-tbody');
  if (tbody) {
    tbody.addEventListener('change', (e) => {
      if (e.target.classList.contains('shift-checkbox')) {
        updateSelectedCount();
      }
    });
  }
});

// Calculate suggested work hours based on entered times
function autoCheckWorkingHours() {
  const in1 = document.getElementById('shift-in1').value;
  const out1 = document.getElementById('shift-out1').value;
  const in2 = document.getElementById('shift-in2').value;
  const out2 = document.getElementById('shift-out2').value;

  let totalMinutes = 0;

  if (in1 && out1) {
    const mIn1 = DB.timeToMinutes(in1);
    const mOut1 = DB.timeToMinutes(out1);
    totalMinutes += Math.max(0, mOut1 - mIn1);
  }

  if (in2 && out2) {
    const mIn2 = DB.timeToMinutes(in2);
    const mOut2 = DB.timeToMinutes(out2);
    totalMinutes += Math.max(0, mOut2 - mIn2);
  }

  const hours = parseFloat((totalMinutes / 60).toFixed(2));
  const workHoursInput = document.getElementById('shift-hours');
  if (workHoursInput && hours > 0) {
    workHoursInput.value = hours;
  }
}

// Render shifts grid rows
function renderShiftsTable() {
  const shifts = DB.getShifts();
  const searchVal = (document.getElementById('search-shift')?.value || '').toLowerCase();
  const tbody = document.getElementById('shifts-tbody');
  
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtered = shifts.filter(s => {
    return s.code.toLowerCase().includes(searchVal) || s.name.toLowerCase().includes(searchVal);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-4 text-muted">
          <i class="bi bi-calendar-range fs-1 d-block mb-2"></i>
          لم يتم العثور على أي وردية عمل تطابق خيارات الاستعلام.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(s => {
    const badgeClass = s.status === 'نشط' ? 'badge-active' : 'badge-inactive';
    
    // Formatting period 2 representation
    const p2Text = (s.checkIn2 && s.checkOut2) ? `${s.checkIn2} - ${s.checkOut2}` : '<span class="text-muted small">لا يوجد</span>';

    const tr = document.createElement('tr');
    tr.id = `shift-row-${s.code}`;
    tr.innerHTML = `
      <td><input type="checkbox" class="form-check-input shift-checkbox" value="${s.code}" /></td>
      <td class="fw-bold text-secondary">${s.code}</td>
      <td class="fw-semibold">${s.name}</td>
      <td class="font-mono text-primary">${s.checkIn1} - ${s.checkOut1}</td>
      <td class="font-mono text-info">${p2Text}</td>
      <td>${s.gracePeriods} دقيقة</td>
      <td class="fw-bold">${s.workingHours} ساعات</td>
      <td><span class="px-2 py-1 rounded-pill fw-semibold ${badgeClass}" style="font-size:0.75rem">${s.status}</span></td>
      <td>
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-outline-primary" onclick="editShift('${s.code}')" title="تعديل">
            <i class="bi bi-pencil-fill"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteShift('${s.code}')" title="حذف">
            <i class="bi bi-trash-fill"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Save or Update Shift in Storage
function handleShiftSubmit(e) {
  e.preventDefault();

  const codeInput = document.getElementById('shift-code');
  const isEditing = codeInput.disabled;
  const codeValue = codeInput.value.trim().toUpperCase();

  const name = document.getElementById('shift-name').value.trim();
  const checkIn1 = document.getElementById('shift-in1').value;
  const checkOut1 = document.getElementById('shift-out1').value;
  const checkIn2 = document.getElementById('shift-in2').value;
  const checkOut2 = document.getElementById('shift-out2').value;
  const gracePeriods = parseInt(document.getElementById('shift-grace').value, 10) || 0;
  const workingHours = parseFloat(document.getElementById('shift-hours').value) || 0;
  const status = document.getElementById('shift-status').value;

  if (!codeValue || !name || !checkIn1 || !checkOut1 || workingHours <= 0) {
    window.Toast.error('فضلاً أكمل كافة الحقول المطلوبة وحدد أوقات عمل صالحة للوردية.');
    return;
  }

  // Dual period check: if checkIn2 exists, checkOut2 must exist and vice-versa
  if ((checkIn2 && !checkOut2) || (!checkIn2 && checkOut2)) {
    window.Toast.error('خطأ: الفترة الثانية يجب أن تحتوي على وقت دخول وخروج معاً أو تُترك فارغة.');
    return;
  }

  const shifts = DB.getShifts();

  if (isEditing) {
    const idx = shifts.findIndex(s => s.code === codeValue);
    if (idx >= 0) {
      shifts[idx] = {
        code: codeValue,
        name,
        checkIn1,
        checkOut1,
        checkIn2,
        checkOut2,
        gracePeriods,
        workingHours,
        status
      };
      DB.saveShifts(shifts);
      window.Toast.success('تم تعديل إعدادات الوردية وحفظها.');
    }
  } else {
    const exists = shifts.some(s => s.code === codeValue);
    if (exists) {
      window.Toast.error('خطأ: الرمز المخصص لهذه الوردية مستخدم بالفعل!');
      return;
    }

    const newShift = {
      code: codeValue,
      name,
      checkIn1,
      checkOut1,
      checkIn2,
      checkOut2,
      gracePeriods,
      workingHours,
      status
    };

    shifts.push(newShift);
    DB.saveShifts(shifts);
    window.Toast.success('تمت إضافة وردية العمل الجديدة بنجاح.');
  }

  // Close modal
  const modalEl = document.getElementById('shiftModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  modal.hide();

  resetShiftForm();
  renderShiftsTable();
}

function resetShiftForm() {
  const form = document.getElementById('shift-form');
  if (form) form.reset();

  const codeInput = document.getElementById('shift-code');
  if (codeInput) {
    codeInput.disabled = false;
    const shifts = DB.getShifts();
    codeInput.value = `SH-${String(shifts.length + 1).padStart(2, '0')}`;
  }

  document.getElementById('modal-shift-title').textContent = 'إضافة وردية عمل جديدة';
}

// Edit raw triggers page modal
window.editShift = function(code) {
  const shifts = DB.getShifts();
  const s = shifts.find(item => item.code === code);
  if (!s) return;

  document.getElementById('modal-shift-title').textContent = 'تعديل بيانات الوردية';

  const codeInput = document.getElementById('shift-code');
  codeInput.value = s.code;
  codeInput.disabled = true;

  document.getElementById('shift-name').value = s.name;
  document.getElementById('shift-in1').value = s.checkIn1;
  document.getElementById('shift-out1').value = s.checkOut1;
  document.getElementById('shift-in2').value = s.checkIn2 || '';
  document.getElementById('shift-out2').value = s.checkOut2 || '';
  document.getElementById('shift-grace').value = s.gracePeriods;
  document.getElementById('shift-hours').value = s.workingHours;
  document.getElementById('shift-status').value = s.status;

  const modalEl = new bootstrap.Modal(document.getElementById('shiftModal'));
  modalEl.show();
};

window.deleteShift = function(code) {
  window.Toast.confirm('تأكيد مسح الوردية؟', `هل تود إزالة الوردية (${code}) من النظام؟ يرجى التأكد من عدم ارتباط أي موظفين حاليين بها لتجنب أخطاء الاحتساب.`, () => {
    let shifts = DB.getShifts();
    const beforeLength = shifts.length;
    shifts = shifts.filter(s => s.code !== code);
    
    if (shifts.length === beforeLength) return;

    DB.saveShifts(shifts);
    window.Toast.success('تم حذف الوردية بنجاح.');
    renderShiftsTable();
  });
};

window.resetShiftForm = resetShiftForm;

function exportShiftsToExcel() {
  const shifts = DB.getShifts();
  const formattedData = shifts.map(s => ({
    'كود الوردية': s.code,
    'اسم الوردية': s.name,
    'دخول1': s.checkIn1,
    'خروج1': s.checkOut1,
    'دخول2': s.checkIn2 || '',
    'خروج2': s.checkOut2 || '',
    'السماحية': s.gracePeriods,
    'ساعات العمل': s.workingHours,
    'الحالة': s.status
  }));
  window.ImportExport.exportToExcel(formattedData, 'كشف_الورديات_المسجلة', 'الورديات');
  window.Toast.success('تم تصدير كشف الورديات للإكسل.');
}

function importShiftsFromExcel(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'جاري الاستيراد والدراسة...',
      text: 'فضلاً انتظر بينما نقوم بفحص وتحديث قاعدة بيانات الورديات.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  window.ImportExport.importShifts(file, (err, report) => {
    if (err) {
      if (typeof Swal !== 'undefined') Swal.close();
      window.Toast.error('حدث عطل أثناء قراءة ملف الإكسل: ' + err);
    } else {
      if (typeof Swal !== 'undefined') Swal.close();
      window.ImportExport.showImportReport(report, 'تقرير معالجة واستيراد الورديات');
      renderShiftsTable();
    }
  });

  e.target.value = '';
}

function updateSelectedCount() {
  const selected = document.querySelectorAll('.shift-checkbox:checked').length;
  const panel = document.getElementById('batch-actions-panel');
  const badge = document.getElementById('selected-count-badge');
  if (panel && badge) {
    if (selected > 0) {
      panel.classList.remove('d-none');
      badge.textContent = `محدد: ${selected} وردية`;
    } else {
      panel.classList.add('d-none');
      const selectAllCheck = document.getElementById('select-all-shifts');
      if (selectAllCheck) selectAllCheck.checked = false;
    }
  }
}

function deleteSelectedShifts() {
  const selectedCheckboxes = document.querySelectorAll('.shift-checkbox:checked');
  const selectedCodes = Array.from(selectedCheckboxes).map(cb => cb.value);
  if (selectedCodes.length === 0) return;

  Swal.fire({
    title: 'تأكيد الحذف الجماعي للورديات ⚠️',
    text: `هل أنت متأكد من رغبتك في حذف عدد (${selectedCodes.length}) وردية من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء!`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'نعم، احذف السجلات المحددة',
    cancelButtonText: 'إلغاء'
  }).then((result) => {
    if (result.isConfirmed) {
      let shifts = DB.getShifts();
      shifts = shifts.filter(s => !selectedCodes.includes(s.code));
      DB.saveShifts(shifts);
      
      window.Toast.success(`تم حذف عدد (${selectedCodes.length}) وردية بنجاح.`);
      
      const selectAllCheck = document.getElementById('select-all-shifts');
      if (selectAllCheck) selectAllCheck.checked = false;
      
      renderShiftsTable();
      updateSelectedCount();
    }
  });
}

window.updateSelectedCount = updateSelectedCount;
window.deleteSelectedShifts = deleteSelectedShifts;
