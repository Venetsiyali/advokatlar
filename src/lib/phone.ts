/** Oʻzbekiston raqamini +998XXXXXXXXX koʻrinishiga keltiradi; notoʻgʻri boʻlsa null */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = input.replace(/\D/g, "");
  if (d.length === 9) d = `998${d}`;
  if (!/^998\d{9}$/.test(d)) return null;
  return `+${d}`;
}

/** +998 90 123 45 67 */
export function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length !== 12) return phone;
  return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
}

/** Qisman yashirish: +998 90 *** ** 67 */
export function maskPhone(phone: string) {
  const f = formatPhone(phone);
  return f.replace(/(\+998 \d{2}) \d{3} \d{2}/, "$1 *** **");
}
