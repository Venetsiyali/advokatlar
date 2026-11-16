import "server-only";

// Eskiz.uz SMS shlyuzi. ESKIZ_EMAIL / ESKIZ_PASSWORD boʻlmasa — mock rejim (kod konsolga yoziladi).
const BASE = "https://notify.eskiz.uz/api";
let cachedToken: { token: string; exp: number } | null = null;

export const smsMockMode = () => !process.env.ESKIZ_EMAIL || !process.env.ESKIZ_PASSWORD;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now()) return cachedToken.token;
  const body = new FormData();
  body.set("email", process.env.ESKIZ_EMAIL!);
  body.set("password", process.env.ESKIZ_PASSWORD!);
  const res = await fetch(`${BASE}/auth/login`, { method: "POST", body });
  if (!res.ok) throw new Error(`Eskiz login xatosi: ${res.status}`);
  const json = (await res.json()) as { data?: { token?: string } };
  const token = json.data?.token;
  if (!token) throw new Error("Eskiz token olinmadi");
  cachedToken = { token, exp: Date.now() + 25 * 86400_000 };
  return token;
}

export async function sendSms(phone: string, message: string): Promise<void> {
  if (smsMockMode()) {
    console.info(`[SMS mock] ${phone}: ${message}`);
    return;
  }
  const send = async (token: string) => {
    const body = new FormData();
    body.set("mobile_phone", phone.replace(/\D/g, ""));
    body.set("message", message);
    body.set("from", process.env.ESKIZ_FROM || "4546");
    return fetch(`${BASE}/message/sms/send`, { method: "POST", body, headers: { Authorization: `Bearer ${token}` } });
  };
  let res = await send(await getToken());
  if (res.status === 401) {
    cachedToken = null;
    res = await send(await getToken());
  }
  if (!res.ok) throw new Error(`Eskiz SMS xatosi: ${res.status} ${await res.text()}`);
}
