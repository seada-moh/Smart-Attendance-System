const Attendance    = require('../models/Attendance');
const User          = require('../models/User');
const ShiftSettings = require('../models/ShiftSettings');
const { findBestMatch } = require('../utils/faceMatcher');
const { isWorkingDay, getEthiopianHolidays } = require('../utils/ethiopianHolidays');

const todayStr = () => new Date().toISOString().split('T')[0];

const resolveDepartment = (value) => {
  const v = value == null ? '' : String(value).trim();
  if (!v || /^general$/i.test(v) || v === 'null' || v === 'undefined') return 'Unassigned';
  return v;
};

const DEPARTMENT_FROM_USER = {
  $let: {
    vars: {
      live: { $trim: { input: { $toString: { $ifNull: [{ $arrayElemAt: ['$_user.department', 0] }, ''] } } } },
      snap: { $trim: { input: { $toString: { $ifNull: ['$department', ''] } } } },
    },
    in: {
      $switch: {
        branches: [
          { case: { $and: [{ $ne: ['$$live', ''] }, { $not: { $in: [{ $toLower: '$$live' }, ['general', 'null', 'undefined']] } }] }, then: '$$live' },
          { case: { $and: [{ $ne: ['$$snap', ''] }, { $not: { $in: [{ $toLower: '$$snap' }, ['general', 'null', 'undefined']] } }] }, then: '$$snap' },
        ],
        default: 'Unassigned',
      },
    },
  },
};

const getShift = async () => {
  const s = await ShiftSettings.findOne({ _key: 'default' });
  return s || {
    startHour: 8, startMinute: 30, gracePeriod: 0,
    endHour: 17, endMinute: 0,
    lunchEnabled: false,
    lunchStartHour: 12, lunchStartMinute: 0, lunchDuration: 60,
    afterLunchStartHour: 13, afterLunchStartMinute: 0,
  };
};

const toMins  = (h, m) => h * 60 + m;
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;
const lateLabel = (mins) =>
  mins > 0
    ? (mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m late` : `${mins} min late`)
    : '';

const calcStatus = (now, shift) => {
  const arrivedMins  = toMins(now.getHours(), now.getMinutes());
  const deadlineMins = toMins(shift.startHour, shift.startMinute) + (shift.gracePeriod || 0);
  if (arrivedMins <= deadlineMins) return { status: 'Present', lateMinutes: 0 };
  return { status: 'Late', lateMinutes: arrivedMins - deadlineMins };
};

const resolveSessionAction = (record, now, shift) => {
  const nowMins    = toMins(now.getHours(), now.getMinutes());
  const shiftStart = toMins(shift.startHour, shift.startMinute);
  const shiftEnd   = toMins(shift.endHour, shift.endMinute);
  const earlyWindow = shiftStart - 60;

  const lunchStart = shift.lunchEnabled ? toMins(shift.lunchStartHour, shift.lunchStartMinute) : null;
  const afterLunchStart = shift.lunchEnabled
    ? (shift.afterLunchStartHour != null
        ? toMins(shift.afterLunchStartHour, shift.afterLunchStartMinute)
        : toMins(shift.lunchStartHour, shift.lunchStartMinute) + (shift.lunchDuration || 60))
    : null;

  if (!record) {
    if (nowMins < earlyWindow) return 'too_early';
    if (shift.lunchEnabled && afterLunchStart !== null && nowMins >= afterLunchStart) return 'afterlunch_checkin';
    return 'morning_checkin';
  }

  const hasCheckOut           = !!record.checkOutTime;
  const hasAfterLunchCheckIn  = !!record.afterLunchCheckIn;
  const hasAfterLunchCheckOut = !!record.afterLunchCheckOut;

  if (hasAfterLunchCheckIn && hasAfterLunchCheckOut) return 'day_complete';

  if (!shift.lunchEnabled) {
    if (hasCheckOut) return 'day_complete';
    if (nowMins >= shiftEnd) return 'auto_checkout';
    return 'afterlunch_checkout';
  }

  if (hasCheckOut && !hasAfterLunchCheckIn) {
    if (afterLunchStart !== null && nowMins < afterLunchStart) return 'in_break';
    return 'afterlunch_checkin';
  }
  if (hasAfterLunchCheckIn && !hasAfterLunchCheckOut) return 'afterlunch_checkout';

  if (!hasCheckOut) {
    if (nowMins >= shiftEnd) return 'auto_checkout';
    if (lunchStart !== null && nowMins >= lunchStart) return 'in_break';
    return 'morning_active';
  }
  return 'day_complete';
};

// ─── POST /api/attendance/mark ────────────────────────────────────────────────
const markAttendance = async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128)
      return res.status(400).json({ success: false, message: 'Invalid face descriptor.' });

    const employees = await User.find({ isActive: true, 'faceDescriptor.0': { $exists: true } })
      .select('fullName employeeId department position faceDescriptor');
    if (!employees.length)
      return res.status(404).json({ success: false, message: 'No registered faces found.' });

    const { matched, employee, distance } = findBestMatch(faceDescriptor, employees);
    if (!matched)
      return res.status(401).json({ success: false, message: 'Face not recognised. Contact HR to register your face.' });

    const today  = todayStr();
    const now    = new Date();
    const shift  = await getShift();
    const record = await Attendance.findOne({ userId: employee._id, date: today });
    const action = resolveSessionAction(record, now, shift);

    const empInfo = {
      fullName: employee.fullName, employeeId: employee.employeeId,
      department: employee.department, position: employee.position || '',
    };

    if (action === 'too_early') {
      const opensAt = new Date(); opensAt.setHours(shift.startHour - 1, shift.startMinute, 0, 0);
      return res.status(400).json({ success: false, tooEarly: true,
        message: `Check-in is not open yet. Come back at ${fmtTime(opensAt)}.`, data: { employee: empInfo } });
    }
    if (action === 'morning_active') {
      return res.status(200).json({ success: false, morningActive: true,
        message: `${employee.fullName}, you're already checked in. Enjoy your morning!`,
        data: { employee: empInfo, checkInTime: record.checkInTime, status: record.status, session: 'morning_active' } });
    }
    if (action === 'in_break') {
      const lunchEndTime = new Date();
      lunchEndTime.setHours(shift.lunchStartHour, shift.lunchStartMinute + shift.lunchDuration, 0, 0);
      return res.status(200).json({ success: false, inBreak: true,
        message: `Enjoy your lunch, ${employee.fullName}! After-lunch check-in opens at ${fmtTime(lunchEndTime)}.`,
        data: { employee: empInfo, checkInTime: record.checkInTime, checkOutTime: record.checkOutTime, session: 'break' } });
    }
    if (action === 'day_complete') {
      return res.status(409).json({ success: false, dayComplete: true,
        message: `${employee.fullName}, your attendance for today is fully recorded. See you tomorrow!`,
        data: { employee: empInfo, checkInTime: record.checkInTime, checkOutTime: record.checkOutTime,
          afterLunchCheckIn: record.afterLunchCheckIn, afterLunchCheckOut: record.afterLunchCheckOut,
          status: record.status, session: 'complete' } });
    }
    if (action === 'morning_checkin') {
      const { status, lateMinutes } = calcStatus(now, shift);
      const newRecord = await Attendance.create({
        userId: employee._id, employeeId: employee.employeeId, fullName: employee.fullName,
        department: employee.department, position: employee.position || '',
        date: today, checkInTime: now, status, lateMinutes,
        matchConfidence: parseFloat(distance.toFixed(4)),
      });
      return res.status(201).json({ success: true, action: 'morning_checkin',
        message: `Welcome, ${employee.fullName}! Morning check-in recorded.`,
        data: { employee: empInfo, checkInTime: newRecord.checkInTime, status: newRecord.status,
          lateMinutes: newRecord.lateMinutes, lateLabel: lateLabel(newRecord.lateMinutes),
          date: newRecord.date, session: 'morning' } });
    }
    if (action === 'afterlunch_checkin' && !record) {
      const newRecord = await Attendance.create({
        userId: employee._id, employeeId: employee.employeeId, fullName: employee.fullName,
        department: employee.department, position: employee.position || '',
        date: today, checkInTime: now, afterLunchCheckIn: now, status: 'Late', lateMinutes: 0,
        matchConfidence: parseFloat(distance.toFixed(4)),
      });
      return res.status(201).json({ success: true, action: 'afterlunch_checkin',
        message: `Welcome back, ${employee.fullName}! After-lunch check-in recorded.`,
        data: { employee: empInfo, afterLunchCheckIn: newRecord.afterLunchCheckIn, status: newRecord.status, date: newRecord.date, session: 'afterlunch' } });
    }
    if (action === 'afterlunch_checkin') {
      record.afterLunchCheckIn = now; await record.save();
      return res.status(200).json({ success: true, action: 'afterlunch_checkin',
        message: `Welcome back, ${employee.fullName}! After-lunch check-in recorded.`,
        data: { employee: empInfo, checkInTime: record.checkInTime, checkOutTime: record.checkOutTime,
          afterLunchCheckIn: record.afterLunchCheckIn, status: record.status, date: record.date, session: 'afterlunch' } });
    }
    if (action === 'afterlunch_checkout') {
      if (shift.lunchEnabled) record.afterLunchCheckOut = now;
      else record.checkOutTime = now;
      await record.save();
      return res.status(200).json({ success: true, action: 'afterlunch_checkout',
        message: `Goodbye, ${employee.fullName}! Have a great evening.`,
        data: { employee: empInfo, checkInTime: record.checkInTime, checkOutTime: record.checkOutTime,
          afterLunchCheckIn: record.afterLunchCheckIn, afterLunchCheckOut: record.afterLunchCheckOut,
          status: record.status, date: record.date, session: 'afterlunch_checkout' } });
    }
    if (action === 'auto_checkout') {
      const shiftEndTime = new Date(now); shiftEndTime.setHours(shift.endHour, shift.endMinute, 0, 0);
      record.checkOutTime = shiftEndTime; await record.save();
      return res.status(200).json({ success: true, action: 'auto_checkout', autoCheckout: true,
        message: `${employee.fullName}, your shift ended. Auto check-out applied at ${fmtTime(shiftEndTime)}.`,
        data: { employee: empInfo, checkInTime: record.checkInTime, checkOutTime: record.checkOutTime,
          status: record.status, date: record.date, session: 'auto_checkout' } });
    }
    return res.status(400).json({ success: false, message: 'Unable to determine session action.' });
  } catch (err) {
    console.error('MarkAttendance error:', err);
    return res.status(500).json({ success: false, message: 'Server error during check-in.' });
  }
};

// ─── POST /api/attendance/checkout ───────────────────────────────────────────
const checkOutAttendance = async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128)
      return res.status(400).json({ success: false, message: 'Invalid face descriptor.' });

    const employees = await User.find({ isActive: true, 'faceDescriptor.0': { $exists: true } })
      .select('fullName employeeId department position faceDescriptor');
    if (!employees.length)
      return res.status(404).json({ success: false, message: 'No registered faces found.' });

    const { matched, employee, distance } = findBestMatch(faceDescriptor, employees);
    if (!matched)
      return res.status(401).json({ success: false, message: 'Face not recognised. Contact HR to register your face.' });

    const today = todayStr();
    const now   = new Date();
    const shift = await getShift();
    const empInfo = { fullName: employee.fullName, employeeId: employee.employeeId, department: employee.department, position: employee.position || '' };

    const record = await Attendance.findOne({ userId: employee._id, date: today });
    if (!record)
      return res.status(400).json({ success: false, noRecord: true,
        message: `${employee.fullName}, you haven't checked in yet today.`, data: { employee: empInfo } });

    const lunchEnabled     = shift.lunchEnabled;
    const hasAfterLunchIn  = !!record.afterLunchCheckIn;
    const hasAfterLunchOut = !!record.afterLunchCheckOut;
    const hasCheckOut      = !!record.checkOutTime;

    if (lunchEnabled && hasAfterLunchIn && hasAfterLunchOut)
      return res.status(409).json({ success: false, dayComplete: true,
        message: `${employee.fullName}, your attendance for today is fully recorded. See you tomorrow!`,
        data: { employee: empInfo, checkInTime: record.checkInTime, checkOutTime: record.checkOutTime,
          afterLunchCheckIn: record.afterLunchCheckIn, afterLunchCheckOut: record.afterLunchCheckOut,
          status: record.status, session: 'complete' } });

    if (!lunchEnabled && hasCheckOut)
      return res.status(409).json({ success: false, dayComplete: true,
        message: `${employee.fullName}, you've already checked out for today.`,
        data: { employee: empInfo, checkInTime: record.checkInTime, checkOutTime: record.checkOutTime, status: record.status, session: 'complete' } });

    let checkoutField;
    if (lunchEnabled && hasAfterLunchIn && !hasAfterLunchOut) {
      record.afterLunchCheckOut = now; checkoutField = 'afterLunchCheckOut';
    } else {
      record.checkOutTime = now; checkoutField = 'checkOutTime';
    }
    await record.save();

    const checkinMs  = new Date(record.checkInTime).getTime();
    const workedMins = Math.max(0, Math.round((now.getTime() - checkinMs) / 60000));
    const workedHrs  = Math.floor(workedMins / 60);
    const workedMin  = workedMins % 60;
    const workedLabel = `${workedHrs}h ${workedMin > 0 ? workedMin + 'm' : ''}`.trim();

    const shiftEndMins  = toMins(shift.endHour, shift.endMinute);
    const checkoutMins  = toMins(now.getHours(), now.getMinutes());
    const earlyMins     = Math.max(0, shiftEndMins - checkoutMins);
    const earlyLabel    = earlyMins > 0
      ? (earlyMins >= 60 ? `Left ${Math.floor(earlyMins/60)}h ${earlyMins%60>0?earlyMins%60+'m':''} early`.trim() : `Left ${earlyMins}m early`)
      : 'On time';

    return res.status(200).json({ success: true,
      action: checkoutField === 'afterLunchCheckOut' ? 'afterlunch_checkout' : 'checkout',
      message: `Goodbye, ${employee.fullName}! Safe travels. (Worked: ${workedLabel})`,
      data: { employee: empInfo, checkInTime: record.checkInTime, checkOutTime: record.checkOutTime,
        afterLunchCheckIn: record.afterLunchCheckIn, afterLunchCheckOut: record.afterLunchCheckOut,
        status: record.status, date: record.date, workedLabel, earlyLabel,
        session: checkoutField === 'afterLunchCheckOut' ? 'afterlunch_checkout' : 'checkout' } });
  } catch (err) {
    console.error('CheckOut error:', err);
    return res.status(500).json({ success: false, message: 'Server error during check-out.' });
  }
};

// ─── GET /api/attendance/kiosk-status ────────────────────────────────────────
const getKioskStatus = async (req, res) => {
  try {
    const shift     = await getShift();
    const now       = new Date();
    const todayDate = now.toISOString().split('T')[0];
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = getEthiopianHolidays(now.getFullYear()).has(todayDate);

    let kioskMode = 'morning';
    if (isWeekend || isHoliday) {
      kioskMode = 'closed';
    } else {
      const nowMins        = toMins(now.getHours(), now.getMinutes());
      const shiftEndMins   = toMins(shift.endHour, shift.endMinute);
      const lunchStartMins = shift.lunchEnabled ? toMins(shift.lunchStartHour, shift.lunchStartMinute) : null;
      const lunchEndMins   = lunchStartMins !== null ? lunchStartMins + shift.lunchDuration : null;
      if (shift.lunchEnabled && lunchStartMins !== null) {
        if (nowMins >= lunchStartMins && nowMins < lunchEndMins) kioskMode = 'break';
        else if (nowMins >= lunchEndMins) kioskMode = 'afterlunch';
      }
      if (nowMins >= shiftEndMins) kioskMode = 'closed';
    }

    return res.json({
      success: true,
      data: {
        shift: {
          startHour: shift.startHour, startMinute: shift.startMinute, gracePeriod: shift.gracePeriod,
          endHour: shift.endHour, endMinute: shift.endMinute, lunchEnabled: shift.lunchEnabled,
          lunchStartHour: shift.lunchStartHour, lunchStartMinute: shift.lunchStartMinute, lunchDuration: shift.lunchDuration,
        },
        kioskMode, isWeekend, isHoliday, serverTime: now.toISOString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/attendance ──────────────────────────────────────────────────────
const getCompanyAttendance = async (req, res) => {
  try {
    const { date, startDate, endDate, department, status, employeeId, search, page = 1, limit = 50 } = req.query;
    const q = {};
    if (date) { q.date = date; }
    else if (startDate || endDate) {
      q.date = {};
      if (startDate) q.date.$gte = startDate;
      if (endDate)   q.date.$lte = endDate;
    }
    if (status)     q.status     = status;
    if (employeeId) q.employeeId = { $regex: employeeId, $options: 'i' };
    if (search)     q.$or = [{ fullName: { $regex: search, $options: 'i' } }, { employeeId: { $regex: search, $options: 'i' } }];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const lim  = parseInt(limit);

    const pipeline = [
      { $match: q },
      { $sort: { date: -1, checkInTime: -1 } },
      { $addFields: { _lookupId: { $convert: { input: '$userId', to: 'objectId', onError: '$userId', onNull: '$userId' } } } },
      { $lookup: { from: 'users', localField: '_lookupId', foreignField: '_id', as: '_user' } },
      { $addFields: { department: DEPARTMENT_FROM_USER } },
      { $project: { _user: 0, _lookupId: 0 } },
    ];

    if (department) pipeline.push({ $match: { department: { $regex: department, $options: 'i' } } });

    const countPipeline = [...pipeline, { $count: 'total' }];
    const [rows, countResult] = await Promise.all([
      Attendance.aggregate([...pipeline, { $skip: skip }, { $limit: lim }]),
      Attendance.aggregate(countPipeline),
    ]);
    const total = countResult[0]?.total ?? 0;

    return res.json({ success: true, data: { records: rows,
      pagination: { total, page: +page, limit: lim, totalPages: Math.ceil(total / lim) } } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/attendance/my ───────────────────────────────────────────────────
const getMyAttendance = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 30 } = req.query;
    const q = { userId: req.user._id };
    if (startDate || endDate) {
      q.date = {};
      if (startDate) q.date.$gte = startDate;
      if (endDate)   q.date.$lte = endDate;
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      Attendance.find(q).sort({ date: -1 }).skip(skip).limit(parseInt(limit)),
      Attendance.countDocuments(q),
    ]);
    return res.json({ success: true, data: { records,
      pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) } } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/attendance/dashboard ───────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const today = todayStr();
    const now   = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Check if today is a working day
    const todayIsWorkingDay = isWorkingDay(today);

    const [totalEmployees, presentToday, lateToday, permissionToday, todayRecords, monthlyTrend, deptStats] =
      await Promise.all([
        User.countDocuments({ role: 'employee', isActive: true }),
        todayIsWorkingDay ? Attendance.countDocuments({ date: today, status: 'Present' })    : Promise.resolve(0),
        todayIsWorkingDay ? Attendance.countDocuments({ date: today, status: 'Late' })       : Promise.resolve(0),
        todayIsWorkingDay ? Attendance.countDocuments({ date: today, status: 'Permission' }) : Promise.resolve(0),
        Attendance.find({ date: today }).sort({ checkInTime: -1 }).limit(10).select('fullName employeeId department checkInTime status'),
        Attendance.aggregate([
          { $match: { date: { $gte: monthStart } } },
          { $group: { _id: '$date', present: { $sum: { $cond: [{ $eq: ['$status','Present'] },1,0] } }, late: { $sum: { $cond: [{ $eq: ['$status','Late'] },1,0] } }, total: { $sum: 1 } } },
          { $sort: { _id: 1 } }, { $limit: 31 },
        ]),
        Attendance.aggregate([
          { $match: { date: today } },
          { $group: { _id: '$department', count: { $sum: 1 } } },
          { $sort: { count: -1 } }, { $limit: 8 },
        ]),
      ]);

    const checkedIn   = presentToday + lateToday + permissionToday;
    // On weekends/holidays absent = 0 (no one is expected to come)
    const absentToday = todayIsWorkingDay ? Math.max(0, totalEmployees - checkedIn) : 0;

    return res.json({ success: true, data: {
      summary: { totalEmployees, presentToday, lateToday, permissionToday, absentToday, checkedIn, isWorkingDay: todayIsWorkingDay },
      recentCheckIns: todayRecords, monthlyTrend, deptStats,
    } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/attendance/my/stats ────────────────────────────────────────────
const getMyStats = async (req, res) => {
  try {
    const now        = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const yearStart  = `${now.getFullYear()}-01-01`;
    const today      = todayStr();

    const from30 = new Date(now); from30.setDate(from30.getDate() - 29);
    const start30 = from30.toISOString().split('T')[0];

    const [monthStats, yearStats, recent, last30Records] = await Promise.all([
      Attendance.aggregate([{ $match: { userId: req.user._id, date: { $gte: monthStart } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Attendance.aggregate([{ $match: { userId: req.user._id, date: { $gte: yearStart } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Attendance.find({ userId: req.user._id }).sort({ date: -1 }).limit(14),
      Attendance.find({ userId: req.user._id, date: { $gte: start30, $lte: today } }).select('date status'),
    ]);

    const toMap = (arr) => arr.reduce((m, x) => { m[x._id] = x.count; return m; }, {});
    const ms = toMap(monthStats);
    const ys = toMap(yearStats);

    // Rate = (present + late + permission) / total_recorded * 100
    // Use actual working days for the period, starting from employee's registration
    const empRegDate     = req.user.createdAt ? req.user.createdAt.toISOString().split('T')[0] : yearStart;
    const effYearStart   = empRegDate > yearStart ? empRegDate : yearStart;
    const effMonthStart  = empRegDate > monthStart ? empRegDate : monthStart;

    // Count working days for year and month (from employee's registration date)
    const countWorkingDays = (from, to) => {
      let count = 0;
      const start = new Date(from + 'T00:00:00');
      const end   = new Date(to   + 'T00:00:00');
      // Don't count today (might still be working)
      const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
      const effective = end < yesterday ? end : yesterday;
      for (let d = new Date(start); d <= effective; d.setDate(d.getDate() + 1)) {
        if (isWorkingDay(d.toISOString().split('T')[0])) count++;
      }
      return count;
    };

    const workingDaysYear  = countWorkingDays(effYearStart, today);
    const workingDaysMonth = countWorkingDays(effMonthStart, today);

    const presentYear  = (ys.Present || 0) + (ys.Late || 0) + (ys.Permission || 0);
    const absentYear   = Math.max(0, workingDaysYear - (ys.Present||0) - (ys.Late||0) - (ys.Absent||0) - (ys.Permission||0) + (ys.Absent||0));
    const rate         = workingDaysYear > 0 ? Math.round((presentYear / workingDaysYear) * 100) : 100;

    const presentMonth = (ms.Present || 0) + (ms.Late || 0) + (ms.Permission || 0);
    const absentMonth  = Math.max(0, workingDaysMonth - (ms.Present||0) - (ms.Late||0) - (ms.Permission||0));

    const empCreatedAt   = req.user.createdAt ? req.user.createdAt.toISOString().split('T')[0] : start30;
    const effectiveStart = empCreatedAt > start30 ? empCreatedAt : start30;

    // Build working days from effective start up to BUT NOT including today
    // (today is still in progress — don't count as absent yet)
    const workingDays = [];
    const fromEff  = new Date(effectiveStart + 'T00:00:00');
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    const yestStr   = yesterday.toISOString().split('T')[0];
    for (let d = new Date(fromEff); d <= yesterday; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().split('T')[0];
      if (isWorkingDay(ds)) workingDays.push(ds);
    }

    const presentDates = new Set(last30Records.map(r => r.date));
    // Only count days up to yesterday as absent
    const absentDays = workingDays.filter(d => d <= yestStr && !presentDates.has(d));

    // Streak: consecutive absent days ending on yesterday
    let streak = 0;
    for (let i = workingDays.length - 1; i >= 0; i--) {
      if (!presentDates.has(workingDays[i])) streak++;
      else break;
    }

    let absenceWarning = null;
    if (streak >= 5 || absentDays.length >= 8) {
      absenceWarning = { level: 'critical', streak, totalAbsent: absentDays.length,
        message: 'Come to the office immediately! Your attendance is critically low.' };
    } else if (streak >= 3 || absentDays.length >= 5) {
      absenceWarning = { level: 'warning', streak, totalAbsent: absentDays.length,
        message: streak >= 3
          ? `You have been absent for ${streak} consecutive working days. Come to the office immediately!`
          : `You have been absent ${absentDays.length} days in the last 30 days. Please attend regularly.` };
    }

    return res.json({ success: true, data: {
      month: {
        present: ms.Present || 0,
        late:    ms.Late    || 0,
        absent:  absentMonth,
      },
      year: {
        present: ys.Present || 0,
        late:    ys.Late    || 0,
        absent:  absentYear,
        rate,
      },
      recentActivity: recent, absenceWarning,
    } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/attendance/analytics ───────────────────────────────────────────
const getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, department, search } = req.query;
    if (!startDate || !endDate)
      return res.status(400).json({ success: false, message: 'startDate and endDate are required.' });

    let empQuery = { role: 'employee', isActive: true };
    if (department) empQuery.department = { $regex: department, $options: 'i' };
    if (search)     empQuery.$or = [{ fullName: { $regex: search, $options: 'i' } }, { employeeId: { $regex: search, $options: 'i' } }];

    const employees = await User.find(empQuery).select('fullName employeeId department position createdAt');

    // Cap endDate to yesterday — don't count today or future days as expected working days
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const effectiveEnd = endDate < yesterdayStr ? endDate : yesterdayStr;

    const workingDaysArr = [];
    const s = new Date(startDate   + 'T00:00:00');
    const e = new Date(effectiveEnd + 'T00:00:00');
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().split('T')[0];
      if (isWorkingDay(ds)) workingDaysArr.push(ds);
    }
    const totalWorkingDays = workingDaysArr.length;

    const userIds = employees.map(emp => emp._id);
    const records = await Attendance.aggregate([
      { $match: { userId: { $in: userIds }, date: { $gte: startDate, $lte: effectiveEnd } } },
      { $group: { _id: '$userId',
        presentDays:      { $sum: { $cond: [{ $eq: ['$status','Present'] },1,0] } },
        lateDays:         { $sum: { $cond: [{ $eq: ['$status','Late'] },1,0] } },
        totalLateMinutes: { $sum: { $ifNull: ['$lateMinutes',0] } },
        recordedDays:     { $sum: 1 },
        dates:            { $push: '$date' },
      } },
    ]);

    const recordMap = {};
    records.forEach(r => { recordMap[r._id.toString()] = r; });

    const result = employees.map(emp => {
      const r            = recordMap[emp._id.toString()] || { presentDays:0, lateDays:0, totalLateMinutes:0, recordedDays:0, dates:[] };
      const presentDays  = r.presentDays;
      const lateDays     = r.lateDays;

      // Only count working days from when employee was registered
      const empRegDate = emp.createdAt ? emp.createdAt.toISOString().split('T')[0] : startDate;
      const effStart   = empRegDate > startDate ? empRegDate : startDate;

      // Count working days in period from employee's effective start
      const empWorkingDays = workingDaysArr.filter(d => d >= effStart).length;

      // Absent = working days expected - days actually recorded (within effective period)
      const recordedInPeriod = (r.dates || []).filter(d => d >= effStart).length;
      const absentDays       = Math.max(0, empWorkingDays - recordedInPeriod);

      // Include Permission as attended (consistent with getMyStats rate)
      const permissionDays   = recordedInPeriod - presentDays - lateDays;
      const attendedDays     = presentDays + lateDays + Math.max(0, permissionDays);
      const attendancePct    = empWorkingDays > 0
        ? Math.round((attendedDays / empWorkingDays) * 100) : 100;
      const totalLateMinutes = r.totalLateMinutes;
      const lateOccurrences  = lateDays;
      const tH = Math.floor(totalLateMinutes/60), tM = totalLateMinutes%60;
      const lateTotalLabel = totalLateMinutes===0 ? '0m' : tH>0 ? `${tH}h ${tM>0?tM+'m':''}`.trim() : `${tM}m`;
      const healthFlag = attendancePct < 70 ? 'termination_risk' : attendancePct < 85 ? 'warning' : 'normal';

      return {
        employeeId: emp.employeeId, fullName: emp.fullName,
        department: resolveDepartment(emp.department), position: emp.position,
        presentDays, lateDays, absentDays,
        totalWorkingDays: empWorkingDays,
        attendancePct,
        lateOccurrences, totalLateMinutes, lateTotalLabel, healthFlag,
      };
    });

    const order = { termination_risk: 0, warning: 1, normal: 2 };
    result.sort((a, b) => (order[a.healthFlag]??3) - (order[b.healthFlag]??3));

    const totals = result.reduce((acc, emp) => {
      acc.presentDays      += emp.presentDays;
      acc.lateDays         += emp.lateDays;
      acc.absentDays       += emp.absentDays;
      acc.totalLateMinutes += emp.totalLateMinutes;
      if (emp.healthFlag === 'warning')          acc.warningCount++;
      if (emp.healthFlag === 'termination_risk') acc.riskCount++;
      return acc;
    }, { presentDays:0, lateDays:0, absentDays:0, totalLateMinutes:0, warningCount:0, riskCount:0 });

    const tHrs = Math.floor(totals.totalLateMinutes/60), tMin = totals.totalLateMinutes%60;
    totals.lateTotalLabel = totals.totalLateMinutes===0 ? '0m' : tHrs>0 ? `${tHrs}h ${tMin>0?tMin+'m':''}`.trim() : `${tMin}m`;

    return res.json({ success: true, data: {
      employees: result, totals, totalWorkingDays,
      periodStart: startDate, periodEnd: endDate, generatedAt: new Date().toISOString(),
    } });
  } catch (err) {
    console.error('getAnalytics error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/attendance/absent-warnings ─────────────────────────────────────
const getAbsentWarnings = async (req, res) => {
  try {
    const now   = new Date();
    const today = todayStr();
    const from  = new Date(now); from.setDate(from.getDate() - 29);
    const startDate = from.toISOString().split('T')[0];

    const employees = await User.find({ role: 'employee', isActive: true })
      .select('fullName employeeId department position createdAt');
    const records = await Attendance.find({ date: { $gte: startDate, $lte: today } }).select('userId date status');

    const presentMap = {};
    for (const r of records) {
      const uid = r.userId.toString();
      if (!presentMap[uid]) presentMap[uid] = new Set();
      presentMap[uid].add(r.date);
    }

    const workingDays = [];
    for (let d = new Date(from); d <= now; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().split('T')[0];
      // Don't count today as absent — shift might still be ongoing
      if (ds < today && isWorkingDay(ds)) workingDays.push(ds);
    }

    const warnings = [];
    for (const emp of employees) {
      const uid     = emp._id.toString();
      const present = presentMap[uid] || new Set();
      const empStart       = emp.createdAt ? emp.createdAt.toISOString().split('T')[0] : startDate;
      const effectiveStart = empStart > startDate ? empStart : startDate;
      const empWorkingDays = workingDays.filter(d => d >= effectiveStart);
      const absent         = empWorkingDays.filter(d => !present.has(d));
      const absentCount    = absent.length;

      let maxStreak = 0, streak = 0;
      for (const d of empWorkingDays) {
        if (!present.has(d)) { streak++; maxStreak = Math.max(maxStreak, streak); }
        else streak = 0;
      }

      let level = null, reason = '';
      if      (maxStreak >= 5)      { level = 'critical'; reason = `Absent ${maxStreak} consecutive working days`; }
      else if (maxStreak >= 3)      { level = 'warning';  reason = `Absent ${maxStreak} consecutive working days`; }
      else if (absentCount >= 8)    { level = 'critical'; reason = `Absent ${absentCount} days in last 30 days`; }
      else if (absentCount >= 5)    { level = 'warning';  reason = `Absent ${absentCount} days in last 30 days`; }

      if (level) {
        warnings.push({ _id: emp._id, fullName: emp.fullName, employeeId: emp.employeeId,
          department: emp.department, position: emp.position, absentCount, maxStreak, level, reason,
          recentAbsent: absent.slice(-5) });
      }
    }

    warnings.sort((a, b) => (a.level === 'critical' ? -1 : 1));
    return res.json({ success: true, data: { warnings, total: warnings.length, periodStart: startDate, periodEnd: today } });
  } catch (err) {
    console.error('getAbsentWarnings error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  markAttendance, checkOutAttendance, getKioskStatus,
  getCompanyAttendance, getMyAttendance, getDashboard,
  getMyStats, getAnalytics, getAbsentWarnings,
};
