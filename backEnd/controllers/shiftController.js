const ShiftSettings = require('../models/ShiftSettings');

const DEFAULTS = {
  startHour: 8, startMinute: 30,
  gracePeriod: 0,
  endHour: 17, endMinute: 0,
  lunchEnabled: false,
  lunchStartHour: 12, lunchStartMinute: 0,
  lunchDuration: 60,
  afterLunchStartHour: 13, afterLunchStartMinute: 0,
};

// GET /api/shift  — admin only
const getSettings = async (_req, res) => {
  try {
    const settings = await ShiftSettings.findOne({ _key: 'default' });
    return res.json({ success: true, data: settings || DEFAULTS });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/shift  — admin only
const updateSettings = async (req, res) => {
  try {
    const {
      startHour, startMinute, gracePeriod, endHour, endMinute,
      lunchEnabled, lunchStartHour, lunchStartMinute, lunchDuration,
      afterLunchStartHour, afterLunchStartMinute,
    } = req.body;

    const num = (v, lo, hi) => Number.isInteger(+v) && +v >= lo && +v <= hi;
    if (!num(startHour,   0, 23))  return res.status(400).json({ success: false, message: 'startHour must be 0-23.' });
    if (!num(startMinute, 0, 59))  return res.status(400).json({ success: false, message: 'startMinute must be 0-59.' });
    if (!num(gracePeriod, 0, 60))  return res.status(400).json({ success: false, message: 'gracePeriod must be 0-60.' });
    if (!num(endHour,     0, 23))  return res.status(400).json({ success: false, message: 'endHour must be 0-23.' });
    if (!num(endMinute,   0, 59))  return res.status(400).json({ success: false, message: 'endMinute must be 0-59.' });

    if (lunchEnabled) {
      if (!num(lunchStartHour,   0, 23))  return res.status(400).json({ success: false, message: 'lunchStartHour must be 0-23.' });
      if (!num(lunchStartMinute, 0, 59))  return res.status(400).json({ success: false, message: 'lunchStartMinute must be 0-59.' });
      if (!num(lunchDuration,    0, 180)) return res.status(400).json({ success: false, message: 'lunchDuration must be 0-180 minutes.' });
      if (!num(afterLunchStartHour,   0, 23)) return res.status(400).json({ success: false, message: 'afterLunchStartHour must be 0-23.' });
      if (!num(afterLunchStartMinute, 0, 59)) return res.status(400).json({ success: false, message: 'afterLunchStartMinute must be 0-59.' });
    }

    const settings = await ShiftSettings.findOneAndUpdate(
      { _key: 'default' },
      {
        startHour: +startHour, startMinute: +startMinute,
        gracePeriod: +gracePeriod,
        endHour: +endHour, endMinute: +endMinute,
        lunchEnabled:     !!lunchEnabled,
        lunchStartHour:   lunchEnabled ? +lunchStartHour   : 12,
        lunchStartMinute: lunchEnabled ? +lunchStartMinute : 0,
        lunchDuration:    lunchEnabled ? +lunchDuration     : 60,
        afterLunchStartHour:   lunchEnabled ? +afterLunchStartHour   : 13,
        afterLunchStartMinute: lunchEnabled ? +afterLunchStartMinute : 0,
      },
      { upsert: true, new: true, runValidators: true }
    );

    return res.json({ success: true, message: 'Shift settings updated.', data: settings });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getSettings, updateSettings };
