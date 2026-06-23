/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('reports-page-indicator')) return;

  // Initialize dates
  const mSel = document.getElementById('report-month');
  const ySel = document.getElementById('report-year');
  if (mSel && ySel) {
    mSel.value = '06';
    ySel.value = '2026';

    mSel.addEventListener('change', renderActiveReport);
    ySel.addEventListener('change', renderActiveReport);
  }

  // Bind change on report types or departments
  const typeFilter = document.getElementById('report-type');
  const deptFilter = document.getElementById('report-dept');

  if (typeFilter) typeFilter.addEventListener('change', renderActiveReport);
  if (deptFilter) deptFilter.addEventListener('change', renderActiveReport);

  // Print button
  const printBtn = document.getElementById('print-report');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Excel button
  const excelBtn = document.getElementById('export-report-excel');
  if (excelBtn) {
    excelBtn.addEventListener('click', exportActiveReportToExcel);
  }

  renderActiveReport();
});

// Primary router to prepare and construct reports based on dropdown value
function renderActiveReport() {
  const type = document.getElementById('report-type').value;
  const m = document.getElementById('report-month').value;
  const y = document.getElementById('report-year').value;
  const yearMonth = `${y}-${m}`;
  const dept = document.getElementById('report-dept').value;

  const employees = DB.getEmployees().filter(e => !dept || e.department === dept);
  const shifts = DB.getShifts();
  const attendance = DB.getAttendance(yearMonth);
  const leaves = DB.getLeaves();

  const titleEl = document.getElementById('report-viewer-title');
  const tableHead = document.getElementById('report-thead');
  const tableBody = document.getElementById('report-tbody');

  if (!titleEl || !tableHead || !tableBody) return;

  // Clear
  tableHead.innerHTML = '';
  tableBody.innerHTML = '';

  const reportNamesMap = {
    'attendance': 'تقرير كشف الحضور وساعات العمل الشهرية',
    'absence': 'تقرير كشف الغياب التفصيلي',
    'delays': 'تقرير كشف التأخير والمغادرات المبكرة',
    'leaves': 'تقرير كشف سجلات الإجازات الممنوحة',
    'payroll': 'ملخص كشف رواتب الموظفين المستحقة'
  };

  titleEl.innerHTML = `
    <span>${reportNamesMap[type]}</span>
    <small class="d-block text-muted mt-1 fs-6">عن شهر: ${m}/${y} ${dept ? ` - قسم: ${dept}` : ''}</small>
  `;

  // Branch configurations represent specific reports
  if (type === 'attendance') {
    // Columns: الرقم الوظيفي, الموظف, القسم, الوردية, أيام الالتزام, إجمالي ساعات العمل, معدل ساعات العمل اليومية
    tableHead.innerHTML = `
      <tr>
        <th>الرقم الوظيفي</th>
        <th>اسم الموظف</th>
        <th>القسم</th>
        <th>الوردية</th>
        <th>أيام العمل الفعلية</th>
        <th>إجمالي الساعات المنجزة</th>
        <th>معدل البصمات الناقصة</th>
      </tr>
    `;

    employees.forEach(emp => {
      let workedDays = 0;
      let totalHours = 0;
      let incompleteCount = 0;

      Object.keys(attendance).forEach(key => {
        if (key.startsWith(`${emp.empNo}_`)) {
          const r = attendance[key];
          if (r.workingHours > 0) workedDays++;
          totalHours += r.workingHours || 0;
          if (r.incompleteCount) incompleteCount++;
        }
      });

      const shift = shifts.find(s => s.code === emp.shiftCode);
      const shiftName = shift ? shift.name : 'غير محددة';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="fw-bold">${emp.empNo}</td>
        <td class="fw-semibold">${emp.name}</td>
        <td>${emp.department}</td>
        <td><span class="badge bg-light text-dark border">${shiftName}</span></td>
        <td class="font-mono text-center fw-bold text-success">${workedDays} أيام</td>
        <td class="font-mono text-center fw-bold">${totalHours.toFixed(2)} ساعة</td>
        <td class="text-center font-mono text-warning">${incompleteCount > 0 ? `<span class="badge bg-warning-subtle text-warning-emphasis">${incompleteCount} بصمة ناقصة</span>` : 'سليم'}</td>
      `;
      tableBody.appendChild(tr);
    });

  } else if (type === 'absence') {
    // Columns: الرقم الوظيفي، اسم الموظف، القسم، التاريخ، حالة الغياب كعذر أو غير عذر
    tableHead.innerHTML = `
      <tr>
        <th>الرقم الوظيفي</th>
        <th>اسم الموظف</th>
        <th>القسم</th>
        <th>تاريخ الغياب</th>
        <th>نوع الغياب / العذر</th>
      </tr>
    `;

    let absenceFound = false;

    employees.forEach(emp => {
      Object.keys(attendance).forEach(key => {
        if (key.startsWith(`${emp.empNo}_`)) {
          const r = attendance[key];
          if (r.isAbsent) {
            absenceFound = true;
            const dateStr = key.replace(`${emp.empNo}_`, '');
            let txt = 'غياب كامل بدون عذر مبين';
            let badgeClass = 'bg-danger';
            if (r.reason) {
              txt = `غياب مبرر (${r.reason})`;
              badgeClass = 'bg-success';
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td class="fw-bold">${emp.empNo}</td>
              <td class="fw-semibold">${emp.name}</td>
              <td>${emp.department}</td>
              <td class="font-mono">${dateStr}</td>
              <td><span class="badge ${badgeClass}">${txt}</span></td>
            `;
            tableBody.appendChild(tr);
          }
        }
      });
    });

    if (!absenceFound) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">لا توجد غيابات مسجلة في خيارات التصفية المدخلة.</td></tr>`;
    }

  } else if (type === 'delays') {
    // Columns: الرقم الوظيفي، اسم الموظف، التاريخ، دقائق التأخير، دقائق الخروج المبكر، الإجراء
    tableHead.innerHTML = `
      <tr>
        <th>الرقم الوظيفي</th>
        <th>اسم الموظف</th>
        <th>القسم</th>
        <th>تاريخ المخالفة</th>
        <th>دقائق التأخير</th>
        <th>الخروج المبكر</th>
      </tr>
    `;

    let delayFound = false;

    employees.forEach(emp => {
      Object.keys(attendance).forEach(key => {
        if (key.startsWith(`${emp.empNo}_`)) {
          const r = attendance[key];
          if ((r.delayMinutes > 0 || r.earlyOutMinutes > 0) && !r.isLeave && !r.isAbsent) {
            delayFound = true;
            const dateStr = key.replace(`${emp.empNo}_`, '');

            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td class="fw-bold">${emp.empNo}</td>
              <td class="fw-semibold">${emp.name}</td>
              <td>${emp.department}</td>
              <td class="font-mono">${dateStr}</td>
              <td class="font-mono text-center small" style="line-height: 1.25;">
                ${r.delayMinutes > 0 ? `
                  <div class="d-inline-block text-center text-nowrap">
                    <div class="text-muted" style="font-size:0.75rem">الخام: ${r.rawDelayMinutes || r.delayMinutes} د</div>
                    <div class="text-muted" style="font-size:0.75rem">السماحية: ${r.graceMinutes || 0} د</div>
                    ${r.reason ? `
                      <div class="text-success fw-bold" style="font-size:0.75rem">تأخير مبرر</div>
                      <div class="text-success small" style="font-size:0.68rem">(${r.reason})</div>
                    ` : `
                      <div class="text-danger fw-bold" style="font-size:0.78rem">المحتسب: ${r.delayMinutes} د</div>
                    `}
                  </div>
                ` : '-'}
              </td>
              <td class="font-mono text-center small" style="line-height: 1.25;">
                ${r.earlyOutMinutes > 0 ? `
                  <div class="d-inline-block text-center text-nowrap">
                    <div class="text-muted" style="font-size:0.75rem">الخام: ${r.earlyOutMinutes} د</div>
                    ${r.reason ? `
                      <div class="text-success fw-bold" style="font-size:0.75rem">خروج مبرر</div>
                      <div class="text-success small" style="font-size:0.68rem">(${r.reason})</div>
                    ` : `
                      <div class="text-danger fw-bold" style="font-size:0.78rem">المحتسب: ${r.earlyOutMinutes} د</div>
                    `}
                  </div>
                ` : '-'}
              </td>
            `;
            tableBody.appendChild(tr);
          }
        }
      });
    });

    if (!delayFound) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">لا يوجد أي دقائق تأخر أو مغادرة مبكرة خلال الفترة المذكورة.</td></tr>`;
    }

  } else if (type === 'leaves') {
    tableHead.innerHTML = `
      <tr>
        <th>الرقم الوظيفي</th>
        <th>اسم الموظف</th>
        <th>القسم</th>
        <th>نوع الإجازة</th>
        <th>من تاريخ</th>
        <th>إلى تاريخ</th>
        <th>المدة الكلية</th>
        <th>صياغة الملاحظة</th>
      </tr>
    `;

    // Filter leaves active in this month
    const list = leaves.filter(l => {
      const emp = employees.find(e => e.empNo === l.empNo);
      if (!emp) return false;
      return l.startDate.startsWith(yearMonth) || l.endDate.startsWith(yearMonth);
    });

    if (list.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">لا توجد طلبات إجازة مسجلة في هذا الشهر.</td></tr>`;
      return;
    }

    list.forEach(l => {
      const emp = employees.find(e => e.empNo === l.empNo);
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="fw-bold">${l.empNo}</td>
        <td class="fw-semibold">${emp ? emp.name : 'غير متوفر'}</td>
        <td>${emp ? emp.department : 'غير متوفر'}</td>
        <td><span class="badge bg-primary">${l.leaveType}</span></td>
        <td class="font-mono">${l.startDate}</td>
        <td class="font-mono">${l.endDate}</td>
        <td class="text-center fw-bold">${l.daysCount} أيام</td>
        <td>${l.notes || '-'}</td>
      `;
      tableBody.appendChild(tr);
    });

  } else if (type === 'payroll') {
    tableHead.innerHTML = `
      <tr>
        <th>الرقم الوظيفي</th>
        <th>اسم الموظف</th>
        <th>الراتب الأساسي</th>
        <th>أيام الغياب</th>
        <th>استقطاع الغياب</th>
        <th>دقائق التأخير</th>
        <th>استقطاع التأخير</th>
        <th>صافي الراتب</th>
      </tr>
    `;

    employees.forEach(emp => {
      const shift = shifts.find(s => s.code === emp.shiftCode);
      const standardWorkHours = shift ? shift.workingHours : 8;

      const dayPay = emp.basicSalary / 30;
      const hourPay = dayPay / standardWorkHours;
      const minutePay = hourPay / 60;

      let totalAbsentDays = 0;
      let totalDelayMins = 0;
      let totalRawDelayMins = 0;
      let totalEarlyOutMins = 0;

      Object.keys(attendance).forEach(key => {
        if (key.startsWith(`${emp.empNo}_`)) {
          const record = attendance[key];
          const unpaidReasons = ['غياب بدون عذر', 'إجازة بدون راتب'];
          
          if (record.isAbsent && (!record.reason || unpaidReasons.includes(record.reason))) {
            totalAbsentDays++;
          } else if (unpaidReasons.includes(record.reason)) {
            totalAbsentDays++;
          }

          if (!record.isLeave && !record.isAbsent) {
            totalRawDelayMins += record.rawDelayMinutes || record.delayMinutes || 0;
            if (!record.reason || record.reason === '') {
              totalDelayMins += record.delayMinutes || 0;
              totalEarlyOutMins += record.earlyOutMinutes || 0;
            }
          }
        }
      });

      const absentDeduct = totalAbsentDays * dayPay;
      const delayDeduct = (totalDelayMins + totalEarlyOutMins) * minutePay; // combines early exits inside delay details
      const netSalary = Math.max(0, emp.basicSalary - (absentDeduct + delayDeduct));

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="fw-bold">${emp.empNo}</td>
        <td class="fw-semibold">${emp.name}</td>
        <td class="font-mono">${emp.basicSalary.toLocaleString()} ريال</td>
        <td class="font-mono text-center text-danger">${totalAbsentDays} يوم</td>
        <td class="font-mono text-danger">${absentDeduct.toFixed(2)}</td>
        <td class="font-mono text-center small" style="line-height: 1.25;">
          <div class="text-muted" style="font-size:0.7rem">الخام: ${totalRawDelayMins} د</div>
          <div class="text-muted" style="font-size:0.7rem">السماحية: ${totalRawDelayMins - totalDelayMins} د</div>
          <div class="fw-bold text-danger" style="font-size:0.72rem">المحتسب: ${totalDelayMins} د</div>
          ${totalEarlyOutMins > 0 ? `<div class="text-info" style="font-size:0.7rem">خروج مبكر: ${totalEarlyOutMins} د</div>` : ''}
        </td>
        <td class="font-mono text-warning">${delayDeduct.toFixed(2)}</td>
        <td class="font-mono text-success fw-bold text-center bg-light">${netSalary.toFixed(2)} ريال</td>
      `;
      tableBody.appendChild(tr);
    });
  }
}

// Convert active rendered HTML tables directly to Excel
function exportActiveReportToExcel() {
  const type = document.getElementById('report-type').value;
  const m = document.getElementById('report-month').value;
  const y = document.getElementById('report-year').value;
  
  const reportNamesMap = {
    'attendance': 'كشف_الحضور_الشهري',
    'absence': 'كشف_الغياب_الشهري',
    'delays': 'كشف_التأخيرات_والتفريط',
    'leaves': 'كشف_مسير_الإجازات',
    'payroll': 'كشف_رواتب_الملخص'
  };

  const fileTitle = `${reportNamesMap[type]}_${y}_${m}`;
  window.ImportExport.exportTableToExcel('report-table', fileTitle, 'تقرير الكشف');
  window.Toast.success('تم تصدير ملف الكشف للإكسل.');
}
