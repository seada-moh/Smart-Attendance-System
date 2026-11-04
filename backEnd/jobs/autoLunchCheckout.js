/**
 * autoLunchCheckout.js
 *
 * Scheduled job — fires every minute and checks whether the lunch start time
 * configured in ShiftSettings has been reached. When it has, it bulk check-outs
 * every employee who:
 *   • has a check-in record for today
 *   • has NOT yet been checked out (checkOutTime is null)
 *   • has NOT already returned from lunch (afterLunchCheckIn is null)
 *
 * This implements the "Auto Lunch Check-out" feature:
 *   Admin sets lunchStartHour / lunchStartMinute in Shift Settings.
 *   At that exact minute the system silently records checkOutTime = lunchStart
 *   for all applicable employees — no manual action needed at the kiosk.
 */

const cron        = require('node-cron');
const Attendance  = require('../models/Attendance');
const ShiftSettings = require('../models/ShiftSettings');

const pad2     = (n) => String(n).padStart(2, '0');
const todayStr = () => new Date().toISOString().split('T')[0];

/**
 * Perform the actual bulk check-out.
 * Called by the cron task AND exposed for manual/test invocation.
 */
const runAutoLunchCheckout = async () => {
  try {
    const shift = await ShiftSettings.findOne({ _key: 'default' });
    if (!shift || !shift.lunchEnabled) return; // feature disabled

    const now     = new Date();
    const today   = todayStr();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const lunchMins = shift.lunchStartHour * 60 + shift.lunchStartMinute;

    // Only fire within the exact minute window
    if (nowMins !== lunchMins) return;

    // Construct the official lunch-start timestamp for today
    const lunchTime = new Date();
    lunchTime.setHours(shift.lunchStartHour, shift.lunchStartMinute, 0, 0);

    const result = await Attendance.updateMany(
      {
        date:              today,
        checkOutTime:      null,   // not yet checked out
        afterLunchCheckIn: null,   // hasn't already returned from lunch
      },
      { $set: { checkOutTime: lunchTime } }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `[AutoLunchCheckout] ${new Date().toISOString()} — ` +
        `Auto checked-out ${result.modifiedCount} employee(s) at lunch time ` +
        `(${pad2(shift.lunchStartHour)}:${pad2(shift.lunchStartMinute)}).`
      );
    }
  } catch (err) {
    console.error('[AutoLunchCheckout] Error during auto lunch check-out:', err.message);
  }
};

/**
 * Register the cron schedule.
 * Runs every minute — the handler itself only acts on the correct minute.
 * This avoids complex dynamic cron-string rebuilds when settings change.
 */
const scheduleAutoLunchCheckout = () => {
  cron.schedule('* * * * *', runAutoLunchCheckout, {
    timezone: process.env.TZ || 'Africa/Addis_Ababa',
  });
  console.log('[AutoLunchCheckout] Scheduled (checks every minute, fires at configured lunch time).');
};

module.exports = { scheduleAutoLunchCheckout, runAutoLunchCheckout };
