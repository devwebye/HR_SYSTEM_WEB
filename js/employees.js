/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('employees-page-indicator')) return;

  renderShiftsDropdown();
  renderEmployeesTable();

  // Binds forms
  const empForm = document.getElementById('employee-form');
  if (empForm) {
    empForm.addEventListener('submit', handleEmployeeSubmit);
  }

  // Binds search and filters
  const searchInput = document.getElementById('search-emp');
  const deptFilter = document.getElementById('filter-dept');
  const shiftFilter = document.getElementById('filter-shift');
  const statusFilter = document.getElementById('filter-status');

  if (searchInput) searchInput.addEventListener('input', renderEmployeesTable);
  if (deptFilter) deptFilter.addEventListener('change', renderEmployeesTable);
  if (shiftFilter) shiftFilter.addEventListener('change', renderEmployeesTable);
  if (statusFilter) statusFilter.addEventListener('change', renderEmployeesTable);

  // Excel trigger buttons
  const exportBtn = document.getElementById('export-employees');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportEmployeesToExcel);
  }

  const importInput = document.getElementById('import-employees-file');
  if (importInput) {
    importInput.addEventListener('change', importEmployeesFromExcel);
  }

  // Batch Actions Event Listeners
  const selectAllCheck = document.getElementById('select-all-employees');
  if (selectAllCheck) {
    selectAllCheck.addEventListener('change', (e) => {
      const checked = e.target.checked;
      document.querySelectorAll('.employee-checkbox').forEach(cb => {
        cb.checked = checked;
      });
      updateSelectedCount();
    });
  }

  const btnSelectAll = document.getElementById('btn-select-all');
  if (btnSelectAll) {
    btnSelectAll.addEventListener('click', () => {
      document.querySelectorAll('.employee-checkbox').forEach(cb => {
        cb.checked = true;
      });
      const selectAllCheck = document.getElementById('select-all-employees');
      if (selectAllCheck) selectAllCheck.checked = true;
      updateSelectedCount();
    });
  }

  const btnDeselectAll = document.getElementById('btn-deselect-all');
  if (btnDeselectAll) {
    btnDeselectAll.addEventListener('click', () => {
      document.querySelectorAll('.employee-checkbox').forEach(cb => {
        cb.checked = false;
      });
      const selectAllCheck = document.getElementById('select-all-employees');
      if (selectAllCheck) selectAllCheck.checked = false;
      updateSelectedCount();
    });
  }

  const btnDeleteSelected = document.getElementById('btn-delete-selected');
  if (btnDeleteSelected) {
    btnDeleteSelected.addEventListener('click', deleteSelectedEmployees);
  }

  const tbody = document.getElementById('employees-tbody');
  if (tbody) {
    tbody.addEventListener('change', (e) => {
      if (e.target.classList.contains('employee-checkbox')) {
        updateSelectedCount();
      }
    });
  }
});

// Load and populate shifts lists in dropdown selectors
function renderShiftsDropdown() {
  const shifts = DB.getShifts();
  const dropdowns = ['emp-shift', 'filter-shift'];
  
  dropdowns.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    
    // Save current selection or keep default
    const originalVal = el.value;
    el.innerHTML = id.startsWith('filter-') 
      ? '<option value="">كل الورديات</option>' 
      : '<option value="" disabled selected>اختر الوردية للموظف...</option>';

    shifts.forEach(s => {
      const option = document.createElement('option');
      option.value = s.code;
      option.textContent = s.name;
      el.appendChild(option);
    });

    if (originalVal) el.value = originalVal;
  });
}

// Render dynamic employee database rows
function renderEmployeesTable() {
  const employees = DB.getEmployees();
  const shifts = DB.getShifts();
  const tbody = document.getElementById('employees-tbody');
  if (!tbody) return;

  // Retrieve filters
  const searchVal = (document.getElementById('search-emp')?.value || '').toLowerCase();
  const deptVal = document.getElementById('filter-dept')?.value || '';
  const shiftVal = document.getElementById('filter-shift')?.value || '';
  const statusVal = document.getElementById('filter-status')?.value || '';

  tbody.innerHTML = '';

  const filtered = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchVal) || 
                          emp.empNo.toLowerCase().includes(searchVal) || 
                          emp.position.toLowerCase().includes(searchVal);
    const matchesDept = !deptVal || emp.department === deptVal;
    const matchesShift = !shiftVal || emp.shiftCode === shiftVal;
    const matchesStatus = !statusVal || emp.status === statusVal;

    return matchesSearch && matchesDept && matchesShift && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-4 text-muted">
          <i class="bi bi-people fs-1 d-block mb-2"></i>
          لا يوجد موظفين مسجلين يطابقون خيارات البحث والفلترة المحددة.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach((emp, index) => {
    const shiftOpt = shifts.find(s => s.code === emp.shiftCode);
    const shiftName = shiftOpt ? shiftOpt.name : 'وردية غير صالحة';
    
    // Status visual badge
    const badgeClass = emp.status === 'نشط' ? 'badge-active' : 'badge-inactive';

    const tr = document.createElement('tr');
    tr.id = `emp-row-${emp.empNo}`;
    tr.innerHTML = `
      <td><input type="checkbox" class="form-check-input employee-checkbox" value="${emp.empNo}" /></td>
      <td>${index + 1}</td>
      <td class="fw-bold text-primary">${emp.empNo}</td>
      <td class="fw-semibold">${emp.name}</td>
      <td>${emp.department}</td>
      <td>${emp.position}</td>
      <td><span class="badge bg-light text-dark border border-secondary-subtle">${shiftName}</span></td>
      <td class="fw-bold text-success">${window.formatCurrency(emp.basicSalary)}</td>
      <td>${emp.leaveBalance} يوم</td>
      <td><span class="px-2 py-1 rounded-pill fw-semibold ${badgeClass}" style="font-size:0.75rem">${emp.status}</span></td>
      <td>
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-outline-primary" onclick="editEmployee('${emp.empNo}')" title="تعديل">
            <i class="bi bi-pencil-fill"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteEmployee('${emp.empNo}')" title="حذف">
            <i class="bi bi-trash-fill"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Save or Update Employee
function handleEmployeeSubmit(e) {
  e.preventDefault();

  const empNoInput = document.getElementById('emp-id');
  const isEditing = empNoInput.disabled; // If disabled, it means updating an existing item
  const idValue = empNoInput.value.trim().toUpperCase();

  const name = document.getElementById('emp-name').value.trim();
  const department = document.getElementById('emp-dept').value;
  const position = document.getElementById('emp-position').value.trim();
  const shiftCode = document.getElementById('emp-shift').value;
  const basicSalary = parseFloat(document.getElementById('emp-salary').value);
  const leaveBalance = parseInt(document.getElementById('emp-leaves').value, 10);
  const status = document.getElementById('emp-status').value;

  if (!idValue || !name || !department || !position || !shiftCode) {
    window.Toast.error('فضلاً أكمل تعبئة كافة الحقول المطلوبة.');
    return;
  }

  const employees = DB.getEmployees();

  if (isEditing) {
    // Update existing
    const idx = employees.findIndex(emp => emp.empNo === idValue);
    if (idx >= 0) {
      employees[idx] = {
        ...employees[idx],
        name,
        department,
        position,
        shiftCode,
        basicSalary,
        leaveBalance,
        status
      };
      DB.saveEmployees(employees);
      window.Toast.success('تم تحديث بيانات الموظف بنجاح.');
    }
  } else {
    // Add new employee (with duplicate check & auto update)
    const existingIdx = employees.findIndex(emp => emp.empNo === idValue);
    if (existingIdx >= 0) {
      employees[existingIdx] = {
        ...employees[existingIdx],
        name,
        department,
        position,
        shiftCode,
        basicSalary,
        leaveBalance,
        status
      };
      DB.saveEmployees(employees);
      window.Toast.success('تم تحديث الموظف الموجود مسبقاً.');
    } else {
      const nextSeq = employees.length > 0 ? Math.max(...employees.map(e => e.seq)) + 1 : 1;
      const newEmp = {
        seq: nextSeq,
        empNo: idValue,
        name,
        department,
        position,
        shiftCode,
        basicSalary,
        leaveBalance,
        status
      };

      employees.push(newEmp);
      DB.saveEmployees(employees);
      window.Toast.success('تم تسجيل الموظف الجديد في قاعدة البيانات.');
    }
  }

  // Hide Modal & clear
  const modalEl = document.getElementById('employeeModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  modal.hide();
  
  resetEmployeeForm();
  renderEmployeesTable();
}

function resetEmployeeForm() {
  const form = document.getElementById('employee-form');
  if (form) form.reset();
  
  const empNoInput = document.getElementById('emp-id');
  if (empNoInput) {
    empNoInput.disabled = false;
    // Suggest automatic employee code
    const employees = DB.getEmployees();
    const nextIdNum = employees.length > 0 
      ? Math.max(...employees.map(e => parseInt(e.empNo.replace(/\D/g, '') || '1000'))) + 1 
      : 1001;
    empNoInput.value = `EMP${nextIdNum}`;
  }
  
  document.getElementById('modal-emp-title').textContent = 'إضافة موظف جديد';
}

// Edit employee trigger
window.editEmployee = function(empNo) {
  const employees = DB.getEmployees();
  const emp = employees.find(e => e.empNo === empNo);
  if (!emp) return;

  document.getElementById('modal-emp-title').textContent = 'تعديل بيانات الموظف';
  
  const empNoInput = document.getElementById('emp-id');
  empNoInput.value = emp.empNo;
  empNoInput.disabled = true; // Block ID modifications

  document.getElementById('emp-name').value = emp.name;
  document.getElementById('emp-dept').value = emp.department;
  document.getElementById('emp-position').value = emp.position;
  document.getElementById('emp-shift').value = emp.shiftCode;
  document.getElementById('emp-salary').value = emp.basicSalary;
  document.getElementById('emp-leaves').value = emp.leaveBalance;
  document.getElementById('emp-status').value = emp.status;

  const modalEl = new bootstrap.Modal(document.getElementById('employeeModal'));
  modalEl.show();
};

// Delete employee trigger
window.deleteEmployee = function(empNo) {
  window.Toast.confirm('هل أنت متأكد من الحذف؟', `سيتم مسح بيانات الموظف صاحب الرقم ${empNo} نهائياً مع كافة سجلاته.`, () => {
    let employees = DB.getEmployees();
    employees = employees.filter(e => e.empNo !== empNo);
    DB.saveEmployees(employees);
    window.Toast.success('تم حذف بيانات الموظف وسجلاته.');
    renderEmployeesTable();
  });
};

// Excel Export Routines
function exportEmployeesToExcel() {
  const employees = DB.getEmployees();
  if (employees.length === 0) {
    window.Toast.error('لا توجد بيانات موظفين لتصديرها.');
    return;
  }

  // Map to localized column fields
  const formattedData = employees.map(emp => ({
    'الرقم التسلسلي': emp.seq,
    'الرقم الوظيفي': emp.empNo,
    'اسم الموظف': emp.name,
    'القسم': emp.department,
    'المسمى الوظيفي': emp.position,
    'الوردية': emp.shiftCode,
    'الراتب الأساسي': emp.basicSalary,
    'رصيد الإجازات': emp.leaveBalance,
    'الحالة': emp.status
  }));

  window.ImportExport.exportToExcel(formattedData, 'كشف_الموظفين_المسجلين', 'الموظفون');
  window.Toast.success('تم تصدير كشف الموظفين للإكسل.');
}

// Excel Import handlers
function importEmployeesFromExcel(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Show a loading panel
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'جاري الاستيراد والتدقيق...',
      text: 'فضلاً انتظر بينما نقوم بفحص وتحديث قاعدة بيانات الموظفين.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  window.ImportExport.importEmployees(file, (err, report) => {
    if (typeof Swal !== 'undefined') Swal.close();
    if (err) {
      window.Toast.error('حدث عطل أثناء قراءة ملف الإكسل: ' + err);
    } else {
      let reportHTML = `
        <div class="text-start direction-rtl font-sans p-2" style="direction:rtl; text-align:right;">
          <div class="row g-2 mb-3 text-center">
            <div class="col-6">
              <div class="bg-success-subtle text-success p-2 rounded border border-success-subtle">
                <span class="small d-block text-muted" style="font-size:0.75rem">موظفون جدد (تم الإضافة)</span>
                <strong class="fs-5">${report.importedCount}</strong>
              </div>
            </div>
            <div class="col-6">
              <div class="bg-primary-subtle text-primary p-2 rounded border border-primary-subtle">
                <span class="small d-block text-muted" style="font-size:0.75rem">موظفون مسبقون (تم التحديث)</span>
                <strong class="fs-5">${report.updatedCount}</strong>
              </div>
            </div>
          </div>
      `;

      if (report.rejected && report.rejected.length > 0) {
        reportHTML += `
          <div class="alert alert-danger p-2 mb-3" style="font-size: 0.78rem;">
            <i class="bi bi-exclamation-triangle-fill me-1"></i>
            تنبيه: تم رفض واستبعاد عدد <strong>(${report.rejected.length})</strong> سجل لعدم مطابقتها للشروط.
          </div>
          <div class="table-responsive" style="max-height: 200px; overflow-y: auto;">
            <table class="table table-sm table-striped table-bordered mb-0" style="font-size: 0.72rem;">
              <thead class="table-dark sticky-top">
                <tr>
                  <th class="py-1">السطر</th>
                  <th class="py-1">الرقم الوظيفي</th>
                  <th class="py-1">سبب الرفض والحل المقترح</th>
                </tr>
              </thead>
              <tbody>
                ${report.rejected.map(rej => `
                  <tr>
                    <td class="text-center fw-bold">${rej.row}</td>
                    <td class="text-center font-mono">${rej.item}</td>
                    <td class="text-danger">${rej.reason}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      } else {
        reportHTML += `
          <div class="alert alert-success p-2 mb-0 text-center" style="font-size: 0.82rem;">
            <i class="bi bi-check-circle-fill me-1 text-success"></i>
            تم استيراد وتحديث كافة السجلات بنجاح دون أي استبعاد!
          </div>
        `;
      }

      reportHTML += `</div>`;

      Swal.fire({
        title: 'تقرير نتائج استيراد الموظفين 📑',
        html: reportHTML,
        width: '600px',
        confirmButtonText: 'موافق، تم الاطلاع',
        confirmButtonColor: '#4f46e5'
      });

      renderEmployeesTable();
      renderShiftsDropdown();
    }
  });

  // clear file value
  e.target.value = '';
}

function updateSelectedCount() {
  const selected = document.querySelectorAll('.employee-checkbox:checked').length;
  const panel = document.getElementById('batch-actions-panel');
  const badge = document.getElementById('selected-count-badge');
  if (panel && badge) {
    if (selected > 0) {
      panel.classList.remove('d-none');
      badge.textContent = `محدد: ${selected} موظف`;
    } else {
      panel.classList.add('d-none');
      const selectAllCheck = document.getElementById('select-all-employees');
      if (selectAllCheck) selectAllCheck.checked = false;
    }
  }
}

function deleteSelectedEmployees() {
  const selectedCheckboxes = document.querySelectorAll('.employee-checkbox:checked');
  const selectedEmpNos = Array.from(selectedCheckboxes).map(cb => cb.value);
  if (selectedEmpNos.length === 0) return;

  Swal.fire({
    title: 'تأكيد الحذف الجماعي ⚠️',
    text: `هل أنت متأكد من رغبتك في حذف عدد (${selectedEmpNos.length}) موظف من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء!`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'نعم، احذف السجلات المحددة',
    cancelButtonText: 'إلغاء'
  }).then((result) => {
    if (result.isConfirmed) {
      let employees = DB.getEmployees();
      employees = employees.filter(emp => !selectedEmpNos.includes(emp.empNo));
      DB.saveEmployees(employees);
      
      window.Toast.success(`تم حذف عدد (${selectedEmpNos.length}) موظف بنجاح.`);
      
      const selectAllCheck = document.getElementById('select-all-employees');
      if (selectAllCheck) selectAllCheck.checked = false;
      
      renderEmployeesTable();
      updateSelectedCount();
    }
  });
}

// Expose reset trigger
window.resetEmployeeForm = resetEmployeeForm;
window.updateSelectedCount = updateSelectedCount;
window.deleteSelectedEmployees = deleteSelectedEmployees;
