const Holiday = require('../models/Holiday');
const { getEthiopianHolidays } = require('../utils/ethiopianHolidays');

// GET /api/holidays?year=2026
// Returns built-in Ethiopian holidays + custom holidays merged
const getHolidays = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Built-in Ethiopian holidays
    const builtIn = getEthiopianHolidays(year);
    const builtInList = [
      { date: `${year}-01-07`, name: 'Genna (Ethiopian Christmas)', type: 'religious', builtin: true },
      { date: `${year}-01-19`, name: 'Timkat (Ethiopian Epiphany)', type: 'religious', builtin: true },
      { date: `${year}-03-02`, name: 'Adwa Victory Day', type: 'national', builtin: true },
      { date: `${year}-05-01`, name: 'International Labour Day', type: 'national', builtin: true },
      { date: `${year}-05-05`, name: "Patriots' Victory Day (Arbegnoch)", type: 'national', builtin: true },
      { date: `${year}-05-28`, name: 'Derg Downfall Day', type: 'national', builtin: true },
      { date: `${year}-09-11`, name: 'Enkutatash (Ethiopian New Year)', type: 'national', builtin: true },
      { date: `${year}-09-27`, name: 'Meskel (Finding of the True Cross)', type: 'religious', builtin: true },
    ];

    // Easter / Good Friday approximate
    const easters = {
      2024: [{ date: '2024-05-03', name: 'Good Friday (Siklet)', type: 'religious', builtin: true },
              { date: '2024-05-05', name: 'Easter (Fasika)', type: 'religious', builtin: true }],
      2025: [{ date: '2025-04-18', name: 'Good Friday (Siklet)', type: 'religious', builtin: true },
              { date: '2025-04-20', name: 'Easter (Fasika)', type: 'religious', builtin: true }],
      2026: [{ date: '2026-04-10', name: 'Good Friday (Siklet)', type: 'religious', builtin: true },
              { date: '2026-04-12', name: 'Easter (Fasika)', type: 'religious', builtin: true }],
      2027: [{ date: '2027-04-30', name: 'Good Friday (Siklet)', type: 'religious', builtin: true },
              { date: '2027-05-02', name: 'Easter (Fasika)', type: 'religious', builtin: true }],
    };

    // Islamic holidays approximate
    const islamic = {
      2024: [
        { date: '2024-04-10', name: 'Eid al-Fitr', type: 'religious', builtin: true },
        { date: '2024-06-16', name: 'Eid al-Adha', type: 'religious', builtin: true },
        { date: '2024-09-16', name: "Mawlid (Prophet's Birthday)", type: 'religious', builtin: true },
      ],
      2025: [
        { date: '2025-03-30', name: 'Eid al-Fitr', type: 'religious', builtin: true },
        { date: '2025-06-06', name: 'Eid al-Adha', type: 'religious', builtin: true },
        { date: '2025-09-05', name: "Mawlid (Prophet's Birthday)", type: 'religious', builtin: true },
      ],
      2026: [
        { date: '2026-03-20', name: 'Eid al-Fitr', type: 'religious', builtin: true },
        { date: '2026-05-27', name: 'Eid al-Adha', type: 'religious', builtin: true },
        { date: '2026-08-25', name: "Mawlid (Prophet's Birthday)", type: 'religious', builtin: true },
      ],
      2027: [
        { date: '2027-03-09', name: 'Eid al-Fitr', type: 'religious', builtin: true },
        { date: '2027-05-16', name: 'Eid al-Adha', type: 'religious', builtin: true },
        { date: '2027-08-14', name: "Mawlid (Prophet's Birthday)", type: 'religious', builtin: true },
      ],
    };

    const allBuiltIn = [
      ...builtInList,
      ...(easters[year] || []),
      ...(islamic[year] || []),
    ];

    // Custom holidays from DB for this year
    const customHolidays = await Holiday.find({
      $or: [
        { date: { $gte: `${year}-01-01`, $lte: `${year}-12-31` } },
        { recurring: true, date: { $regex: `-${String(year-1).slice(2)}-|-${String(year).slice(2)}-` } },
      ],
    }).sort({ date: 1 });

    // Merge and sort
    const all = [...allBuiltIn, ...customHolidays.map(h => ({
      _id: h._id, date: h.date, name: h.name, type: h.type,
      description: h.description, recurring: h.recurring, builtin: false,
    }))];

    all.sort((a, b) => a.date.localeCompare(b.date));

    return res.json({ success: true, data: { holidays: all, year } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/holidays — admin adds custom holiday
const addHoliday = async (req, res) => {
  try {
    const { date, name, description, type, recurring } = req.body;
    if (!date || !name) return res.status(400).json({ success: false, message: 'date and name required.' });

    const holiday = await Holiday.create({ date, name, description, type, recurring: !!recurring });
    return res.status(201).json({ success: true, message: 'Holiday added.', data: { holiday } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'A holiday already exists on this date.' });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/holidays/:id — admin removes custom holiday
const deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndDelete(req.params.id);
    if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found.' });
    return res.json({ success: true, message: 'Holiday removed.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getHolidays, addHoliday, deleteHoliday };
