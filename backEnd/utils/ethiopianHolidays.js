/**
 * Ethiopian Public Holidays — Gregorian dates for 2024-2027
 * Includes both Ethiopian Orthodox and national holidays.
 *
 * Fixed Gregorian dates (same every year):
 *   Jan 7  — Ethiopian Christmas (Genna)
 *   Jan 19 — Ethiopian Epiphany (Timkat)
 *   Mar 2  — Adwa Victory Day
 *   Apr 6  — Good Friday (approx, varies slightly)
 *   May 1  — International Labour Day
 *   May 5  — Patriots' Victory Day
 *   May 28 — Downfall of Derg (National Day)
 *   Aug 11 — Ethiopian New Year (Enkutatash) ~Sep 11 Gregorian
 *   Sep 11 — Ethiopian New Year (Enkutatash)
 *   Sep 27 — Meskel (Finding of the True Cross)
 *
 * Islamic holidays move yearly (approximate):
 *   Eid al-Fitr, Eid al-Adha, Prophet's Birthday
 */

// Returns a Set of "YYYY-MM-DD" strings for a given year
function getEthiopianHolidays(year) {
  const holidays = new Set();

  // ── Fixed Ethiopian / National holidays ──────────────────────────────────
  const fixed = [
    `${year}-01-07`,   // Genna (Ethiopian Christmas)
    `${year}-01-19`,   // Timkat (Ethiopian Epiphany)
    `${year}-03-02`,   // Adwa Victory Day
    `${year}-05-01`,   // International Labour Day
    `${year}-05-05`,   // Patriots' Victory Day (Arbegnoch)
    `${year}-05-28`,   // Derg Downfall Day
    `${year}-09-11`,   // Enkutatash (Ethiopian New Year)
    `${year}-09-27`,   // Meskel (Finding of the True Cross)
  ];
  fixed.forEach(d => holidays.add(d));

  // ── Good Friday & Easter (Ethiopian Orthodox) — approximate ──────────────
  // Ethiopian Orthodox Easter is typically 1 week after Western Easter
  const easter = getOrthodoxEaster(year);
  if (easter) {
    holidays.add(easter.goodFriday);
    holidays.add(easter.easter);
  }

  // ── Islamic holidays (approximate, based on recent years) ────────────────
  const islamic = getIslamicHolidays(year);
  islamic.forEach(d => holidays.add(d));

  return holidays;
}

// Approximate Ethiopian Orthodox Easter (Fasika) dates
function getOrthodoxEaster(year) {
  const knownEasters = {
    2024: { goodFriday: '2024-05-03', easter: '2024-05-05' },
    2025: { goodFriday: '2025-04-18', easter: '2025-04-20' },
    2026: { goodFriday: '2026-04-10', easter: '2026-04-12' },
    2027: { goodFriday: '2027-04-30', easter: '2027-05-02' },
  };
  return knownEasters[year] || null;
}

// Approximate Islamic holidays (Eid al-Fitr, Eid al-Adha, Mawlid)
function getIslamicHolidays(year) {
  const known = {
    2024: ['2024-04-10', '2024-04-11', '2024-06-16', '2024-06-17', '2024-09-16'],
    2025: ['2025-03-30', '2025-03-31', '2025-06-06', '2025-06-07', '2025-09-05'],
    2026: ['2026-03-20', '2026-03-21', '2026-05-27', '2026-05-28', '2026-08-25'],
    2027: ['2027-03-09', '2027-03-10', '2027-05-16', '2027-05-17', '2027-08-14'],
  };
  return known[year] || [];
}

/**
 * Check if a given date (YYYY-MM-DD or Date object) is a working day.
 * Returns false for: weekends (Sat/Sun) + Ethiopian public holidays
 */
function isWorkingDay(dateInput) {
  const date = typeof dateInput === 'string'
    ? new Date(dateInput + 'T00:00:00')
    : dateInput;

  const day = date.getDay();
  if (day === 0 || day === 6) return false; // Sunday or Saturday

  const dateStr = date.toISOString().split('T')[0];
  const year    = date.getFullYear();
  const holidays = getEthiopianHolidays(year);

  return !holidays.has(dateStr);
}

module.exports = { getEthiopianHolidays, isWorkingDay };
