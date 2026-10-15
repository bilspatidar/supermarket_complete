
export function toMySQLDateTime(date = new Date()) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}
