export function getCurrentDateTime() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
  return { dateStr, timeStr, fullStr: `${dateStr} ${timeStr}` };
}
