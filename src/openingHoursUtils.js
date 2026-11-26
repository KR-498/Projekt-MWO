export const ISO_DAYS = [
  { iso: 1, label: 'Poniedziałek' },
  { iso: 2, label: 'Wtorek' },
  { iso: 3, label: 'Środa' },
  { iso: 4, label: 'Czwartek' },
  { iso: 5, label: 'Piątek' },
  { iso: 6, label: 'Sobota' },
  { iso: 7, label: 'Niedziela' },
];

export function parseIsoDayName(str) {
  const s = String(str || '').trim().toLowerCase();
  if (s.startsWith('pon')) return 1;
  if (s.startsWith('wt')) return 2;
  if (s.startsWith('śr') || s.startsWith('sr')) return 3;
  if (s.startsWith('czw')) return 4;
  if (s.startsWith('pi') || s.startsWith('pt')) return 5;
  if (s.startsWith('sob') || s.startsWith('sb')) return 6;
  if (s.startsWith('nie') || s.startsWith('nd')) return 7;
  return null;
}

export function doesLabelMatchDay(daysLabel, isoDay) {
  const parts = String(daysLabel || '').split(/\s*(?:[-–—]|\bdo\b)\s*/i);
  if (parts.length >= 2) {
    const start = parseIsoDayName(parts[0]);
    const end = parseIsoDayName(parts[1]);
    if (start !== null && end !== null) {
      return start <= end
        ? isoDay >= start && isoDay <= end
        : isoDay >= start || isoDay <= end;
    }
  }
  const single = parseIsoDayName(parts[0]);
  return single !== null && isoDay === single;
}

export function getOpeningHoursForDate(dateStr, hoursRows, hoursLoaded = true) {
  if (!dateStr || !hoursLoaded) {
    return { open: null, close: null, closed: false };
  }
  if (!hoursRows || hoursRows.length === 0) {
    return { open: null, close: null, closed: true };
  }
  const [year, month, day] = String(dateStr).split('-').map(Number);
  const jsDay = new Date(year, month - 1, day).getDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;

  for (const row of hoursRows) {
    if (doesLabelMatchDay(row.days_label, isoDay)) {
      if (!row.open_time || !row.close_time) {
        return { open: null, close: null, closed: true };
      }
      return {
        open: String(row.open_time).slice(0, 5),
        close: String(row.close_time).slice(0, 5),
        closed: false,
      };
    }
  }
  return { open: null, close: null, closed: true };
}

export function expandRowsToWeekSchedule(hoursRows) {
  return ISO_DAYS.map(({ iso, label }) => {
    const matched = (hoursRows || []).find((row) =>
      doesLabelMatchDay(row.days_label, iso),
    );
    const hasHours = Boolean(matched?.open_time && matched?.close_time);
    return {
      isoDay: iso,
      label,
      isOpen: hasHours,
      openTime: hasHours ? String(matched.open_time).slice(0, 5) : '17:00',
      closeTime: hasHours ? String(matched.close_time).slice(0, 5) : '22:00',
    };
  });
}
