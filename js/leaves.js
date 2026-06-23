/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('leaves-page-indicator')) return;

  renderEmployeesLeaveDropdown();
  renderLeavesTable();

  // Bind forms
  const leaveForm = document.getElementById('leave-form');
  if (leaveForm) {
    leaveForm.addEventListener('submit', handleLeaveSubmit);
  }

  // Bind auto-days calculator in modal form
  const startEl = document.getElementById('leave-start');
  const endEl = document.getElementById('leave-end');
  
  if (startEl && endEl) {
    startEl.addEventListener('change', autoCalculateLeaveDays);
    endEl.addEventListener('change', autoCalculateLeaveDays);
  }

  // Binds search and filter lists
  const searchInput = document.getElementById('search-leave');
  const typeFilter = document.getElementById('filter-leave-type');

  if (searchInput) searchInput.addEventListener('input', renderLeavesTable);
  if (typeFilter) typeFilter.addEventListener('change', renderLeavesTable);

  // Bulk Excel bindings
  const exportBtn = document.getElementById('export-leaves');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportLeavesToExcel);
  }

  const importInput = document.getElementById('import-leaves-file');
  if (importInput) {
    importInput.addEventListener('change', importLeavesFromExcel);
  }

  // Batch Actions Event Listeners
  const selectAllCheck = document.getElementById('select-all-leaves');
  if (selectAllCheck) {
    selectAllCheck.addEventListener('change', (e) => {
      const checked = e.target.checked;
      document.querySelectorAll('.leave-checkbox').forEach(cb => {
        cb.checked = checked;
      });
      updateSelectedCount();
    });
  }

  const btnSelectAll = document.getElementById('btn-select-all');
  if (btnSelectAll) {
    btnSelectAll.addEventListener('click', () => {
      document.querySelectorAll('.leave-checkbox').forEach(cb => {
        cb.checked = true;
      });
      const selectAllCheck = document.getElementById('select-all-leaves');
      if (selectAllCheck) selectAllCheck.checked = true;
      updateSelectedCount();
    });
  }

  const btnDeselectAll = document.getElementById('btn-deselect-all');
  if (btnDeselectAll) {
    btnDeselectAll.addEventListener('click', () => {
      document.querySelectorAll('.leave-checkbox').forEach(cb => {
        cb.checked = false;
      });
      const selectAllCheck = document.getElementById('select-all-leaves');
      if (selectAllCheck) selectAllCheck.checked = false;
      updateSelectedCount();
    });
  }

  const btnDeleteSelected = document.getElementById('btn-delete-selected');
  if (btnDeleteSelected) {
    btnDeleteSelected.addEventListener('click', deleteSelectedLeaves);
  }

  const tbody = document.getElementById('leaves-tbody');
  if (tbody) {
    tbody.addEventListener('change', (e) => {
      if (e.target.classList.contains('leave-checkbox')) {
        updateSelectedCount();
      }
    });
  }
});

// Load employees list in dropdown selector
function renderEmployeesLeaveDropdown() {
  const employees = DB.getEmployees().filter(e => e.status === 'نشط');
  const select = document.getElementById('leave-emp');
  if (!select) return;

  select.innerHTML = '<option value="" disabled selected>اختر الموظف...</option>';
  employees.forEach(emp => {
    const o = document.createElement('option');
    o.value = emp.empNo;
    o.textContent = `${emp.name} (${emp.empNo}) - رصيده الحالي: ${emp.leaveBalance} يوم`;
    select.appendChild(o);
  });
}

// Calculate days in modal inputs
function autoCalculateLeaveDays() {
  const startVal = document.getElementById('leave-start').value;
  const endVal = document.getElementById('leave-end').value;
  const daysInput = document.getElementById('leave-days');

  if (startVal && endVal && daysInput) {
    const start = new Date(startVal);
    const end = new Date(endVal);

    if (end < start) {
      daysInput.value = 0;
      return;
    }

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive day
    daysInput.value = diffDays;
  }
}

// Render entries inside table
function renderLeavesTable() {
  const leaves = DB.getLeaves();
  const employees = DB.getEmployees();
  const tbody = document.getElementById('leaves-tbody');
  if (!tbody) return;

  const searchVal = (document.getElementById('search-leave')?.value || '').toLowerCase();
  const typeVal = document.getElementById('filter-leave-type')?.value || '';

  tbody.innerHTML = '';

  const filtered = leaves.filter(item => {
    const emp = employees.find(e => e.empNo === item.empNo);
    const empName = emp ? emp.name.toLowerCase() : '';
    const matchesSearch = item.empNo.toLowerCase().includes(searchVal) || empName.includes(searchVal);
    const matchesType = !typeVal || item.leaveType === typeVal;

    return matchesSearch && matchesType;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          <i class="bi bi-calendar-check fs-1 d-block mb-2"></i>
          لا يوجد طلبات أو سجلات إجازات مسجلة تطابق الاستعلام.
        </td>
      </tr>
    `;
    return;
  }

  // Render rows
  filtered.forEach((item, idx) => {
    const emp = employees.find(e => e.empNo === item.empNo);
    const empName = emp ? emp.name : `<span class="text-danger small">موظف محذوف (${item.empNo})</span>`;
    const empDept = emp ? emp.department : 'غير متوفر';

    let leaveBadgeClass = 'bg-secondary';
    if (item.leaveType === 'إجازة سنوية') leaveBadgeClass = 'bg-primary';
    else if (item.leaveType === 'إجازة مرضية') leaveBadgeClass = 'bg-success';
    else if (item.leaveType === 'إجازة بدون راتب') leaveBadgeClass = 'bg-danger';

    const tr = document.createElement('tr');
    tr.id = `leave-row-${item.id}`;
    tr.innerHTML = `
      <td><input type="checkbox" class="form-check-input leave-checkbox" value="${item.id}" /></td>
      <td>${idx + 1}</td>
      <td class="fw-bold text-primary">${item.empNo}</td>
      <td class="fw-semibold">${empName}</td>
      <td>${empDept}</td>
      <td><span class="badge ${leaveBadgeClass}">${item.leaveType}</span></td>
      <td class="font-mono">${item.startDate} إلى ${item.endDate}</td>
      <td class="fw-bold text-dark text-center">${item.daysCount} أيام</td>
      <td><span class="badge bg-light text-dark border">${item.source || 'تم إدخالها يدوياً'}</span></td>
      <td class="text-truncate" style="max-width:200px" title="${item.notes}">${item.notes || '-'}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteLeave('${item.id}')" title="حدف">
          <i class="bi bi-trash-fill"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Save Leave Log in DB
function handleLeaveSubmit(e) {
  e.preventDefault();

  const empNo = document.getElementById('leave-emp').value;
  const leaveType = document.getElementById('leave-type').value;
  const startDate = document.getElementById('leave-start').value;
  const endDate = document.getElementById('leave-end').value;
  const daysCount = parseInt(document.getElementById('leave-days').value, 10);
  const notes = document.getElementById('leave-notes').value.trim();

  if (!empNo || !leaveType || !startDate || !endDate || daysCount <= 0) {
    window.Toast.error('فضلاً تحقق من البيانات وتاريخ البداية والنهاية أولاً.');
    return;
  }

  // If annual, check balance
  const employees = DB.getEmployees();
  const emp = employees.find(e => e.empNo === empNo);
  
  if (leaveType === 'إجازة سنوية' && emp) {
    if (emp.leaveBalance < daysCount) {
      window.Toast.confirm('رصيد غير كافٍ', `موظف المختار يملك رصيداً قدره ${emp.leaveBalance} يوم والطلب الحالي قدره ${daysCount} يوم. هل تود المتابعة والخصم بالسالب؟`, () => {
        saveValidatedLeave({ empNo, leaveType, startDate, endDate, daysCount, notes, source: 'تم إدخالها يدوياً' });
      });
      return;
    }
  }

  saveValidatedLeave({ empNo, leaveType, startDate, endDate, daysCount, notes, source: 'تم إدخالها يدوياً' });
}

function saveValidatedLeave(newRecord) {
  // Save in DB
  DB.addLeave(newRecord);
  window.Toast.success('تم تسجيل طلب الإجازة وتحديث رصيد الموظف تلقائياً.');

  // Close modal
  const modalEl = document.getElementById('leaveModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  modal.hide();

  // reset form
  document.getElementById('leave-form').reset();
  
  renderLeavesTable();
  renderEmployeesLeaveDropdown();
}

// Delete leave log trigger
window.deleteLeave = function(id) {
  window.Toast.confirm('حذف سجل الإجازة؟', 'هل تود حذف هذا السجل؟ لن تسترخص أرصدة الموظفين المستقطعة تلقائياً للإجازات السنوية السابقة عبر الحذف البسيط.', () => {
    let leaves = DB.getLeaves();
    leaves = leaves.filter(l => l.id !== id);
    DB.saveLeaves(leaves);
    window.Toast.success('تم حذف السجل.');
    renderLeavesTable();
    renderEmployeesLeaveDropdown();
  });
};

// Excel actions helper
function exportLeavesToExcel() {
  const leaves = DB.getLeaves();
  if (leaves.length === 0) {
    window.Toast.error('لا يوجد سجلات إجازات لتصديرها.');
    return;
  }

  const employees = DB.getEmployees();
  const formatted = leaves.map(l => {
    const emp = employees.find(e => e.empNo === l.empNo);
    return {
      'الرقم الوظيفي': l.empNo,
      'الموظف': emp ? emp.name : 'غير معروف',
      'القسم': emp ? emp.department : 'غير معروف',
      'نوع الإجازة': l.leaveType,
      'تاريخ البداية': l.startDate,
      'تاريخ النهاية': l.endDate,
      'عدد الأيام': l.daysCount,
      'المصدر': l.source || 'تم إدخالها يدوياً',
      'ملاحظات': l.notes
    };
  });

  window.ImportExport.exportToExcel(formatted, 'سجل_الإجازات_العام', 'سجل الإجازات');
  window.Toast.success('تم التصدير للإكسل بنجاح.');
}

function importLeavesFromExcel(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'دراسة واستيراد الإجازات...',
      text: 'يرجى الانتظار بينما ننتهي من تسجيل وحفظ الإجازات في النظام.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  window.ImportExport.importLeaves(file, (err, report) => {
    if (err) {
      if (typeof Swal !== 'undefined') Swal.close();
      window.Toast.error('حدث عطل أثناء استيراد الإجازات: ' + err);
    } else {
      if (typeof Swal !== 'undefined') Swal.close();
      window.ImportExport.showImportReport(report, 'تقرير معالجة واستيراد الإجازات');
      renderLeavesTable();
      renderEmployeesLeaveDropdown();
    }
  });

  e.target.value = '';
}

function updateSelectedCount() {
  const selected = document.querySelectorAll('.leave-checkbox:checked').length;
  const panel = document.getElementById('batch-actions-panel');
  const badge = document.getElementById('selected-count-badge');
  if (panel && badge) {
    if (selected > 0) {
      panel.classList.remove('d-none');
      badge.textContent = `محدد: ${selected} إجازة`;
    } else {
      panel.classList.add('d-none');
      const selectAllCheck = document.getElementById('select-all-leaves');
      if (selectAllCheck) selectAllCheck.checked = false;
    }
  }
}

function deleteSelectedLeaves() {
  const selectedCheckboxes = document.querySelectorAll('.leave-checkbox:checked');
  const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
  if (selectedIds.length === 0) return;

  Swal.fire({
    title: 'تأكيد الحذف الجماعي للإجازات ⚠️',
    text: `هل أنت متأكد من رغبتك في حذف عدد (${selectedIds.length}) سجل إجازة من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء!`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'نعم، احذف السجلات المحددة',
    cancelButtonText: 'إلغاء'
  }).then((result) => {
    if (result.isConfirmed) {
      let leaves = DB.getLeaves();
      leaves = leaves.filter(l => !selectedIds.includes(l.id));
      DB.saveLeaves(leaves);
      
      window.Toast.success(`تم حذف عدد (${selectedIds.length}) سجل إجازة بنجاح.`);
      
      const selectAllCheck = document.getElementById('select-all-leaves');
      if (selectAllCheck) selectAllCheck.checked = false;
      
      renderLeavesTable();
      renderEmployeesLeaveDropdown();
      updateSelectedCount();
    }
  });
}

window.updateSelectedCount = updateSelectedCount;
window.deleteSelectedLeaves = deleteSelectedLeaves;
