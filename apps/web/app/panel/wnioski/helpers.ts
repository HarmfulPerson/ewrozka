export const getJoinStatus = (startsAt: string | null) => {
  if (!startsAt) return { canJoin: false, tooltip: '' };
  const diff = new Date(startsAt).getTime() - 5 * 60 * 1000 - Date.now();
  if (diff <= 0) return { canJoin: true, tooltip: '' };
  const totalMins = Math.ceil(diff / 60000);
  const d = Math.floor(totalMins / 1440);
  const h = Math.floor((totalMins % 1440) / 60);
  const m = totalMins % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d} d`);
  if (h > 0) parts.push(`${h} h`);
  if (m > 0 || parts.length === 0) parts.push(`${m} min`);
  return { canJoin: false, tooltip: `Dostępne za ${parts.join(' ')}` };
};

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
