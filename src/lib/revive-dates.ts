const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Kesh JSON'da saqlaydi — sanalar matnga aylanadi; ularni qayta Date qilamiz */
export function reviveDates<T>(value: T): T {
  // Kesh boʻsh boʻlganda natija bazadan toʻgʻridan-toʻgʻri keladi — Date obyektlari oʻzgarishsiz qoladi
  if (value instanceof Date) return value;
  if (typeof value === "string") return (ISO_DATE.test(value) ? new Date(value) : value) as T;
  if (Array.isArray(value)) return value.map(reviveDates) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = reviveDates(v);
    return out as T;
  }
  return value;
}
