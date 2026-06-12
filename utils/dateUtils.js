export function getCurrentDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`; // YYYY-MM-DD local
  const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS local
  return { dateStr, timeStr, fullStr: `${dateStr} ${timeStr}` };
}
