/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Storage Keys
const KEYS = {
  EMPLOYEES: 'hr_employees',
  SHIFTS: 'hr_shifts',
  LEAVES: 'hr_leaves',
  ATTENDANCE_PREFIX: 'hr_attendance_'
};

// Default Seed Data
const DEFAULT_SHIFTS = [
  {
    code: 'SH-01',
    name: 'الوردية الصباحية الأساسية',
    checkIn1: '08:00',
    checkOut1: '12:00',
    checkIn2: '13:00',
    checkOut2: '17:00',
    gracePeriods: 15,
    workingHours: 8,
    status: 'نشط'
  },
  {
    code: 'SH-02',
    name: 'الوردية المسائية المستمرة',
    checkIn1: '16:00',
    checkOut1: '23:59',
    checkIn2: '',
    checkOut2: '',
    gracePeriods: 10,
    workingHours: 8,
    status: 'نشط'
  },
  {
    code: 'SH-03',
    name: 'الوردية المرنة الموحدة',
    checkIn1: '09:00',
    checkOut1: '17:00',
    checkIn2: '',
    checkOut2: '',
    gracePeriods: 30,
    workingHours: 8,
    status: 'نشط'
  }
];

const DEFAULT_EMPLOYEES = [
  {
    seq: 1,
    empNo: 'EMP1001',
    name: 'أحمد محمود العتيبي',
    department: 'الموارد البشرية',
    position: 'مدير الموارد البشرية',
    shiftCode: 'SH-01',
    basicSalary: 12000,
    leaveBalance: 30,
    status: 'نشط'
  },
  {
    seq: 2,
    empNo: 'EMP1002',
    name: 'سارة عبد الله الشمري',
    department: 'تقنية المعلومات',
    position: 'مطور برمجيات سينيور',
    shiftCode: 'SH-03',
    basicSalary: 15000,
    leaveBalance: 25,
    status: 'نشط'
  },
  {
    seq: 3,
    empNo: 'EMP1003',
    name: 'محمد عبد الرحمن الحربي',
    department: 'المالية',
    position: 'المحاسب المالي العام',
    shiftCode: 'SH-01',
    basicSalary: 9500,
    leaveBalance: 28,
    status: 'نشط'
  },
  {
    seq: 4,
    empNo: 'EMP1004',
    name: 'خالد يوسف الرشيد',
    department: 'المبيعات',
    position: 'مشرف علاقات العملاء',
    shiftCode: 'SH-02',
    basicSalary: 8000,
    leaveBalance: 15,
    status: 'نشط'
  },
  {
    seq: 5,
    empNo: 'EMP1005',
    name: 'فاطمة محمد الدوسري',
    department: 'العمليات',
    position: 'منسق لوجستي ودعم',
    shiftCode: 'SH-01',
    basicSalary: 7000,
    leaveBalance: 20,
    status: 'موقوف'
  }
];

// Seed some leaves
const DEFAULT_LEAVES = [
  {
    id: 'L-101',
    empNo: 'EMP1003',
    leaveType: 'إجازة سنوية',
    startDate: '2026-06-10',
    endDate: '2026-06-12',
    daysCount: 3,
    notes: 'إجازة وعطلة عائلية سنوية معتمدة'
  }
];

// Initialize LocalStorage with seeds if empty
function initializeStorage() {
  if (!localStorage.getItem(KEYS.SHIFTS)) {
    localStorage.setItem(KEYS.SHIFTS, JSON.stringify(DEFAULT_SHIFTS));
  }
  if (!localStorage.getItem(KEYS.EMPLOYEES)) {
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(DEFAULT_EMPLOYEES));
  }
  if (!localStorage.getItem(KEYS.LEAVES)) {
    localStorage.setItem(KEYS.LEAVES, JSON.stringify(DEFAULT_LEAVES));
  }

  // Pre-seed some attendance logs for June 2026 (YYYY-MM: 2026-06)
  const juneKey = `${KEYS.ATTENDANCE_PREFIX}2026-06`;
  if (!localStorage.getItem(juneKey)) {
    const seedAttendance = {};
    const employees = JSON.parse(localStorage.getItem(KEYS.EMPLOYEES));
    
    // Generate dates 1 to 15 of June 2026
    employees.forEach(emp => {
      // Don't generate for inactive employees to see differences
      if (emp.status !== 'نشط') return;

      for (let day = 1; day <= 15; day++) {
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `2026-06-${dayStr}`;
        const dayOfWeek = new Date(dateStr).getDay(); // 5 = Friday, 6 = Saturday (weekend)
        const recordKey = `${emp.empNo}_${dateStr}`;

        // Weekend logic (Friday / Saturday)
        if (dayOfWeek === 5 || dayOfWeek === 6) {
          seedAttendance[recordKey] = {
            empNo: emp.empNo,
            date: dateStr,
            checkIn1: '',
            checkOut1: '',
            checkIn2: '',
            checkOut2: '',
            reason: 'أخرى', // Weekend labeled as holiday/other
            delayMinutes: 0,
            earlyOutMinutes: 0,
            workingHours: 0,
            isAbsent: false,
            isLeave: false,
            incompleteCount: ''
          };
          continue;
        }

        // Leave days for EMP1003 (June 10th to 12th)
        if (emp.empNo === 'EMP1003' && day >= 10 && day <= 12) {
          seedAttendance[recordKey] = {
            empNo: emp.empNo,
            date: dateStr,
            checkIn1: '',
            checkOut1: '',
            checkIn2: '',
            checkOut2: '',
            reason: 'إجازة سنوية',
            delayMinutes: 0,
            earlyOutMinutes: 0,
            workingHours: 0,
            isAbsent: false,
            isLeave: true,
            incompleteCount: ''
          };
          continue;
        }

        // Normal days
        let cIn1 = '', cOut1 = '', cIn2 = '', cOut2 = '', reason = '';
        if (emp.shiftCode === 'SH-01') {
          // Double shift basic: start 08:00, end 12:00 / start 13:00, end 17:00
          if (day === 3) {
            // Late check in
            cIn1 = '08:25'; cOut1 = '12:01'; cIn2 = '13:00'; cOut2 = '17:00';
          } else if (day === 7) {
            // Early out
            cIn1 = '07:55'; cOut1 = '12:00'; cIn2 = '13:00'; cOut2 = '16:40';
          } else if (day === 11 && emp.empNo === 'EMP1001') {
            // Absent
            reason = 'غياب بدون عذر';
          } else if (day === 14) {
            // Missing biometric clock (Punch missing!)
            cIn1 = '08:00'; cOut1 = '12:00'; cIn2 = ''; cOut2 = ''; // missed afternoon
          } else {
            // Smooth perfect clocking
            cIn1 = '07:58'; cOut1 = '12:02'; cIn2 = '12:55'; cOut2 = '17:01';
          }
        } else if (emp.shiftCode === 'SH-03') {
          // Single shift: 09:00 to 17:00
          if (day === 5) {
            cIn1 = '09:40'; cOut1 = '17:00'; // 40 mins delay (grace is 30) => delay counted
          } else {
            cIn1 = '08:50'; cOut1 = '17:05';
          }
        } else if (emp.shiftCode === 'SH-02') {
          // Evening: 16:00 to 23:59
          cIn1 = '15:58'; cOut1 = '23:59';
        }

        // Save computed or dummy calculated values initially
        seedAttendance[recordKey] = {
          empNo: emp.empNo,
          date: dateStr,
          checkIn1: cIn1,
          checkOut1: cOut1,
          checkIn2: cIn2,
          checkOut2: cOut2,
          reason,
          delayMinutes: 0,
          earlyOutMinutes: 0,
          workingHours: 0,
          isAbsent: reason ? true : false,
          isLeave: false,
          incompleteCount: ''
        };

        // Run calculator on the specific item
        const shiftObj = DEFAULT_SHIFTS.find(s => s.code === emp.shiftCode);
        calculateAttendanceStats(seedAttendance[recordKey], shiftObj);
      }
    });

    localStorage.setItem(juneKey, JSON.stringify(seedAttendance));
  }

  // Automatically recalculate all stored attendance records to apply the new grace/delay calculation rules
  try {
    const shifts = JSON.parse(localStorage.getItem(KEYS.SHIFTS)) || [];
    const employees = JSON.parse(localStorage.getItem(KEYS.EMPLOYEES)) || [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(KEYS.ATTENDANCE_PREFIX)) {
        const attendance = JSON.parse(localStorage.getItem(key));
        if (attendance && typeof attendance === 'object') {
          let changed = false;
          Object.keys(attendance).forEach(recKey => {
            const rec = attendance[recKey];
            const emp = employees.find(e => e.empNo === rec.empNo);
            if (emp) {
              const shift = shifts.find(s => s.code === emp.shiftCode);
              if (shift) {
                calculateAttendanceStats(rec, shift);
                changed = true;
              }
            }
          });
          if (changed) {
            localStorage.setItem(key, JSON.stringify(attendance));
          }
        }
      }
    }
  } catch (err) {
    console.error("Migration recalculation error:", err);
  }
}

// Global Core Calculators
// Parses time values 'HH:MM' into total minutes representing minutes elapsed since start of day
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// Converts minutes to working hours (e.g., 480 mins -> 8 hours)
function minutesToHours(minutesNum) {
  if (!minutesNum || minutesNum <= 0) return 0;
  return parseFloat((minutesNum / 60).toFixed(2));
}

// Compute stats for a single day record
function calculateAttendanceStats(record, shift) {
  if (!shift) return;

  // Reset calculations
  record.delayMinutes = 0;
  record.rawDelayMinutes = 0;
  record.graceMinutes = parseInt(shift.gracePeriods, 10) || 0;
  record.earlyOutMinutes = 0;
  record.workingHours = 0;
  record.incompleteCount = '';

  // Count punches
  const punches = [record.checkIn1, record.checkOut1, record.checkIn2, record.checkOut2].filter(p => !!p);

  // Set Leave/Absent statuses based on reason and punches
  const leaveReasons = ['إجازة سنوية', 'إجازة مرضية', 'إجازة بدون راتب', 'إجازة رسمية'];
  if (leaveReasons.includes(record.reason)) {
    record.isLeave = true;
    record.isAbsent = false;
  } else if (punches.length === 0) {
    record.isAbsent = true;
    record.isLeave = false;
  } else {
    record.isAbsent = false;
    record.isLeave = false;
  }

  // If there are punches, calculate working hours and delays/early-outs
  if (punches.length > 0) {
    // Incomplete biometric punch: raise alarm if punches count is odd or doesn't match shift structure
    const expectsDoublePeriod = shift.checkIn2 && shift.checkOut2;
    const expectedPunchesCount = expectsDoublePeriod ? 4 : 2;

    if (punches.length < expectedPunchesCount) {
      record.incompleteCount = 'بصمة ناقصة';
    }

    let totalWorkingMinutes = 0;
    let rawDelay1 = 0;
    let rawDelay2 = 0;

    // Period 1
    const sIn1 = timeToMinutes(shift.checkIn1);
    let sOut1 = timeToMinutes(shift.checkOut1);
    if (sOut1 < sIn1) {
      sOut1 += 1440; // Cross midnight
    }
    const cIn1 = record.checkIn1 ? timeToMinutes(record.checkIn1) : 0;
    let cOut1 = record.checkOut1 ? timeToMinutes(record.checkOut1) : 0;
    if (cIn1 > 0 && cOut1 > 0 && cOut1 < cIn1) {
      cOut1 += 1440; // Cross midnight
    }

    if (cIn1 > 0) {
      rawDelay1 = Math.max(0, cIn1 - sIn1);
      if (cOut1 > 0) {
        totalWorkingMinutes += Math.max(0, cOut1 - cIn1);
        
        // early exit check in Period 1
        const earlyOut1 = sOut1 - cOut1;
        if (earlyOut1 > 0) {
          record.earlyOutMinutes += earlyOut1;
        }
      }
    }

    // Period 2 (if active)
    if (shift.checkIn2 && shift.checkOut2) {
      const sIn2 = timeToMinutes(shift.checkIn2);
      let sOut2 = timeToMinutes(shift.checkOut2);
      if (sOut2 < sIn2) {
        sOut2 += 1440; // Cross midnight
      }
      const cIn2 = record.checkIn2 ? timeToMinutes(record.checkIn2) : 0;
      let cOut2 = record.checkOut2 ? timeToMinutes(record.checkOut2) : 0;
      if (cIn2 > 0 && cOut2 > 0 && cOut2 < cIn2) {
        cOut2 += 1440; // Cross midnight
      }

      if (cIn2 > 0) {
        rawDelay2 = Math.max(0, cIn2 - sIn2);
        if (cOut2 > 0) {
          totalWorkingMinutes += Math.max(0, cOut2 - cIn2);
          
          // early exit check in Period 2
          const earlyOut2 = sOut2 - cOut2;
          if (earlyOut2 > 0) {
            record.earlyOutMinutes += earlyOut2;
          }
        }
      }
    } else {
      // If single period shift, earlyOut is shiftEnd - last checkout
      if (cIn1 > 0 && cOut1 > 0) {
        const earlyOutSingle = sOut1 - cOut1;
        if (earlyOutSingle > 0) {
          record.earlyOutMinutes = earlyOutSingle;
        }
      }
    }

    // Calculate final delays with the new formula
    const actualDelayMinutes = rawDelay1 + rawDelay2;
    record.rawDelayMinutes = actualDelayMinutes;
    record.delayMinutes = Math.max(0, actualDelayMinutes - record.graceMinutes);

    record.workingHours = minutesToHours(totalWorkingMinutes);
  }

  // If any approved reason / excuse is selected, zero-out all penalties and absences!
  if (record.reason && record.reason.trim() !== '') {
    record.delayMinutes = 0;
    record.rawDelayMinutes = 0;
    record.earlyOutMinutes = 0;
    record.isAbsent = false;
    record.incompleteCount = ''; // Clear incomplete warning as it is excused
  }
}

// Load database functions
const DB = {
  getPreviousDayLimit() {
    return localStorage.getItem('hr_prev_day_limit') || '06:00';
  },

  savePreviousDayLimit(val) {
    localStorage.setItem('hr_prev_day_limit', val || '06:00');
  },

  getEmployees() {
    return JSON.parse(localStorage.getItem(KEYS.EMPLOYEES)) || [];
  },

  saveEmployees(employees) {
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(employees));
  },

  getShifts() {
    return JSON.parse(localStorage.getItem(KEYS.SHIFTS)) || [];
  },

  saveShifts(shifts) {
    localStorage.setItem(KEYS.SHIFTS, JSON.stringify(shifts));
  },

  getLeaves() {
    return JSON.parse(localStorage.getItem(KEYS.LEAVES)) || [];
  },

  saveLeaves(leaves) {
    localStorage.setItem(KEYS.LEAVES, JSON.stringify(leaves));
  },

  getAttendance(yearMonth) {
    const key = KEYS.ATTENDANCE_PREFIX + yearMonth;
    return JSON.parse(localStorage.getItem(key)) || {};
  },

  saveAttendance(yearMonth, data) {
    const key = KEYS.ATTENDANCE_PREFIX + yearMonth;
    localStorage.setItem(key, JSON.stringify(data));
  },

  // Recalculate statistics for all saved months context
  recalculateMonth(yearMonth) {
    const data = this.getAttendance(yearMonth);
    const employees = this.getEmployees();
    const shifts = this.getShifts();

    Object.keys(data).forEach(key => {
      const record = data[key];
      const emp = employees.find(e => e.empNo === record.empNo);
      if (emp) {
        const shift = shifts.find(s => s.code === emp.shiftCode);
        if (shift) {
          calculateAttendanceStats(record, shift);
        }
      }
    });

    this.saveAttendance(yearMonth, data);
  },

  // Add individual leave log and reduce employee balance if annual
  addLeave(leaveRecord) {
    const leaves = this.getLeaves();
    leaveRecord.id = 'L-' + Date.now();
    leaves.push(leaveRecord);
    this.saveLeaves(leaves);

    // If annual leave, deduct from employee balance
    if (leaveRecord.leaveType === 'إجازة سنوية') {
      const employees = this.getEmployees();
      const emp = employees.find(e => e.empNo === leaveRecord.empNo);
      if (emp) {
        emp.leaveBalance = Math.max(0, emp.leaveBalance - parseInt(leaveRecord.daysCount, 10));
        this.saveEmployees(employees);
      }
    }
  },

  // Clear all demo/seed data completely
  clearAllData() {
    localStorage.clear();
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify([]));
    localStorage.setItem(KEYS.SHIFTS, JSON.stringify([]));
    localStorage.setItem(KEYS.LEAVES, JSON.stringify([]));
    // Clear any attendance monthly files
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(KEYS.ATTENDANCE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  },

  // Seeding full 20 employees and 3 shifts demo data
  loadDemoData20() {
    this.clearAllData();

    const shifts = [
      {
        code: 'SH-01',
        name: 'الوردية الصباحية الأساسية (ثنائية)',
        checkIn1: '08:00',
        checkOut1: '12:00',
        checkIn2: '13:00',
        checkOut2: '17:00',
        gracePeriods: 15,
        workingHours: 8,
        status: 'نشط'
      },
      {
        code: 'SH-02',
        name: 'الوردية المسائية المستمرة',
        checkIn1: '16:00',
        checkOut1: '23:59',
        checkIn2: '',
        checkOut2: '',
        gracePeriods: 10,
        workingHours: 8,
        status: 'نشط'
      },
      {
        code: 'SH-03',
        name: 'الوردية المرنة الموحدة',
        checkIn1: '09:00',
        checkOut1: '17:00',
        checkIn2: '',
        checkOut2: '',
        gracePeriods: 30,
        workingHours: 8,
        status: 'نشط'
      }
    ];

    const employees = [
      { seq: 1, empNo: 'EMP1001', name: 'أحمد محمود العتيبي', department: 'الموارد البشرية', position: 'مدير الموارد البشرية', shiftCode: 'SH-01', basicSalary: 12000, leaveBalance: 30, status: 'نشط' },
      { seq: 2, empNo: 'EMP1002', name: 'سارة عبد الله الشمري', department: 'تقنية المعلومات', position: 'مطور برمجيات سينيور', shiftCode: 'SH-03', basicSalary: 15000, leaveBalance: 25, status: 'نشط' },
      { seq: 3, empNo: 'EMP1003', name: 'محمد عبد الرحمن الحربي', department: 'المالية', position: 'المحاسب المالي العام', shiftCode: 'SH-01', basicSalary: 9500, leaveBalance: 28, status: 'نشط' },
      { seq: 4, empNo: 'EMP1004', name: 'خالد يوسف الرشيد', department: 'المبيعات', position: 'مشرف علاقات العملاء', shiftCode: 'SH-02', basicSalary: 8000, leaveBalance: 15, status: 'نشط' },
      { seq: 5, empNo: 'EMP1005', name: 'فاطمة محمد الدوسري', department: 'العمليات', position: 'منسق لوجستي ودعم', shiftCode: 'SH-01', basicSalary: 7000, leaveBalance: 20, status: 'نشط' },
      { seq: 6, empNo: 'EMP1006', name: 'عبد العزيز فهد المطيري', department: 'تقنية المعلومات', position: 'مهندس شبكات', shiftCode: 'SH-03', basicSalary: 13000, leaveBalance: 22, status: 'نشط' },
      { seq: 7, empNo: 'EMP1007', name: 'مها علي القحطاني', department: 'الموارد البشرية', position: 'مسؤول التوظيف والتدريب', shiftCode: 'SH-01', basicSalary: 8500, leaveBalance: 29, status: 'نشط' },
      { seq: 8, empNo: 'EMP1008', name: 'فيصل سعد الدوسري', department: 'المبيعات', position: 'ممثل مبيعات خارجي', shiftCode: 'SH-02', basicSalary: 7500, leaveBalance: 18, status: 'نشط' },
      { seq: 9, empNo: 'EMP1009', name: 'هدى سليمان الفوزان', department: 'المالية', position: 'مدقق حسابات رواتب', shiftCode: 'SH-01', basicSalary: 10500, leaveBalance: 24, status: 'نشط' },
      { seq: 10, empNo: 'EMP1010', name: 'سلطان بدر العرفج', department: 'العمليات', position: 'مدير عمليات التوريد', shiftCode: 'SH-01', basicSalary: 9000, leaveBalance: 21, status: 'نشط' },
      { seq: 11, empNo: 'EMP1011', name: 'ريم فايز السبيعي', department: 'التسويق', position: 'مدير الحملات الإعلانية', shiftCode: 'SH-03', basicSalary: 8200, leaveBalance: 20, status: 'نشط' },
      { seq: 12, empNo: 'EMP1012', name: 'بندر خالد العتيق', department: 'الدعم الفني', position: 'فني صيانة حاسب آلي', shiftCode: 'SH-01', basicSalary: 6500, leaveBalance: 15, status: 'نشط' },
      { seq: 13, empNo: 'EMP1013', name: 'أمل عبد الله الرويلي', department: 'الموارد البشرية', position: 'منسق خدمات الموظفين', shiftCode: 'SH-01', basicSalary: 9000, leaveBalance: 25, status: 'نشط' },
      { seq: 14, empNo: 'EMP1014', name: 'سعود محمد آل سعود', department: 'المبيعات', position: 'مدير حسابات كبار العملاء', shiftCode: 'SH-02', basicSalary: 8500, leaveBalance: 22, status: 'نشط' },
      { seq: 15, empNo: 'EMP1015', name: 'نورة حمد السديري', department: 'تقنية المعلومات', position: 'مسؤول حماية أمن معلومات', shiftCode: 'SH-03', basicSalary: 14000, leaveBalance: 26, status: 'نشط' },
      { seq: 16, empNo: 'EMP1016', name: 'طارق علي العمري', department: 'المالية', position: 'محلل موازنات واستثمار', shiftCode: 'SH-01', basicSalary: 11000, leaveBalance: 27, status: 'نشط' },
      { seq: 17, empNo: 'EMP1017', name: 'ياسمين خالد الباز', department: 'التسويق', position: 'منسق علاقات عامة وإعلام', shiftCode: 'SH-03', basicSalary: 7500, leaveBalance: 19, status: 'نشط' },
      { seq: 18, empNo: 'EMP1018', name: 'ماجد فهد المحيسن', department: 'الدعم الفني', position: 'أخصائي دعم نظم تشغيل', shiftCode: 'SH-01', basicSalary: 7200, leaveBalance: 17, status: 'نشط' },
      { seq: 19, empNo: 'EMP1019', name: 'خلود صالح الشهري', department: 'العمليات', position: 'مراقب جودة الأداء والخدمات', shiftCode: 'SH-01', basicSalary: 6800, leaveBalance: 14, status: 'نشط' },
      { seq: 20, empNo: 'EMP1020', name: 'رائد سليمان العسيري', department: 'المبيعات', position: 'رئيس وحدة المبيعات المباشرة', shiftCode: 'SH-02', basicSalary: 9200, leaveBalance: 23, status: 'نشط' }
    ];

    const leaves = [
      { id: 'L-' + (Date.now() + 1), empNo: 'EMP1003', leaveType: 'إجازة سنوية', startDate: '2026-06-10', endDate: '2026-06-12', daysCount: 3, notes: 'إجازة سنوية معتمدة' },
      { id: 'L-' + (Date.now() + 2), empNo: 'EMP1007', leaveType: 'إجازة مرضية', startDate: '2026-06-14', endDate: '2026-06-15', daysCount: 2, notes: 'إجازة مرضية بموجب تقرير طبي' }
    ];

    // Deduct leave days
    employees.find(e => e.empNo === 'EMP1003').leaveBalance -= 3;
    employees.find(e => e.empNo === 'EMP1007').leaveBalance -= 2;

    this.saveShifts(shifts);
    this.saveEmployees(employees);
    this.saveLeaves(leaves);

    // Build June 2026 attendance seed
    const juneKey = `${KEYS.ATTENDANCE_PREFIX}2026-06`;
    const seedAttendance = {};

    employees.forEach(emp => {
      for (let day = 1; day <= 20; day++) {
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `2026-06-${dayStr}`;
        const dayOfWeek = new Date(dateStr).getDay(); // 5 = Fri, 6 = Sat
        const recordKey = `${emp.empNo}_${dateStr}`;

        // Weekend logic (Friday or Saturday)
        if (dayOfWeek === 5 || dayOfWeek === 6) {
          seedAttendance[recordKey] = {
            empNo: emp.empNo,
            date: dateStr,
            checkIn1: '',
            checkOut1: '',
            checkIn2: '',
            checkOut2: '',
            reason: 'أخرى',
            delayMinutes: 0,
            earlyOutMinutes: 0,
            workingHours: 0,
            isAbsent: false,
            isLeave: false,
            incompleteCount: ''
          };
          continue;
        }

        // Active Leaves Checking
        if (emp.empNo === 'EMP1003' && day >= 10 && day <= 12) {
          seedAttendance[recordKey] = {
            empNo: emp.empNo,
            date: dateStr,
            checkIn1: '',
            checkOut1: '',
            checkIn2: '',
            checkOut2: '',
            reason: 'إجازة سنوية',
            delayMinutes: 0,
            earlyOutMinutes: 0,
            workingHours: 0,
            isAbsent: false,
            isLeave: true,
            incompleteCount: ''
          };
          continue;
        }

        if (emp.empNo === 'EMP1007' && day >= 14 && day <= 15) {
          seedAttendance[recordKey] = {
            empNo: emp.empNo,
            date: dateStr,
            checkIn1: '',
            checkOut1: '',
            checkIn2: '',
            checkOut2: '',
            reason: 'إجازة مرضية',
            delayMinutes: 0,
            earlyOutMinutes: 0,
            workingHours: 0,
            isAbsent: false,
            isLeave: true,
            incompleteCount: ''
          };
          continue;
        }

        // Clock times
        let cIn1 = '', cOut1 = '', cIn2 = '', cOut2 = '', reason = '';
        if (emp.shiftCode === 'SH-01') {
          if (day === 3 && emp.empNo === 'EMP1001') {
            cIn1 = '08:25'; cOut1 = '12:01'; cIn2 = '13:00'; cOut2 = '17:00'; // 25 Min delay
          } else if (day === 7 && emp.empNo === 'EMP1005') {
            cIn1 = '07:55'; cOut1 = '11:40'; cIn2 = '13:00'; cOut2 = '17:00'; // 20 Min Early-out
          } else if (day === 8 && emp.empNo === 'EMP1009') {
            reason = 'غياب بدون عذر';
          } else if (day === 11 && emp.empNo === 'EMP1001') {
            cIn1 = '08:00'; cOut1 = '12:00'; cIn2 = ''; cOut2 = ''; // Incomplete punch
          } else {
            cIn1 = '07:58'; cOut1 = '12:02'; cIn2 = '12:55'; cOut2 = '17:01';
          }
        } else if (emp.shiftCode === 'SH-03') {
          if (day === 5 && emp.empNo === 'EMP1002') {
            cIn1 = '09:40'; cOut1 = '17:00'; // 40 Min delay (grace is 30)
          } else {
            cIn1 = '08:52'; cOut1 = '17:04';
          }
        } else if (emp.shiftCode === 'SH-02') {
          cIn1 = '15:58'; cOut1 = '23:59';
        }

        seedAttendance[recordKey] = {
          empNo: emp.empNo,
          date: dateStr,
          checkIn1: cIn1,
          checkOut1: cOut1,
          checkIn2: cIn2,
          checkOut2: cOut2,
          reason,
          delayMinutes: 0,
          earlyOutMinutes: 0,
          workingHours: 0,
          isAbsent: reason ? true : false,
          isLeave: false,
          incompleteCount: ''
        };

        const shiftObj = shifts.find(s => s.code === emp.shiftCode);
        calculateAttendanceStats(seedAttendance[recordKey], shiftObj);
      }
    });

    localStorage.setItem(juneKey, JSON.stringify(seedAttendance));
  },

  // Helper properties to check calendar details
  getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  },

  timeToMinutes,
  minutesToHours,
  calculateAttendanceStats,
  formatCurrency(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) {
      amount = 0;
    }
    const formatted = Number(amount).toLocaleString('en-US', { maximumFractionDigits: 0 });
    return `${formatted} ريال يمني`;
  }
};

// Initialize
initializeStorage();

window.DB = DB;
window.formatCurrency = DB.formatCurrency;
