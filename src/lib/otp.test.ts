import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Tashqi bogʻliqliklar: baza, SMS shlyuzi va Telegram — soxta
const db = vi.hoisted(() => ({
  otpCode: { findFirst: vi.fn(), count: vi.fn(), create: vi.fn() },
  user: { findUnique: vi.fn() },
}));
const sms = vi.hoisted(() => ({ sendSms: vi.fn(), smsMockMode: vi.fn() }));
const tg = vi.hoisted(() => ({ sendTelegram: vi.fn(), telegramMockMode: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./db", () => ({ prisma: db }));
vi.mock("./sms", () => sms);
vi.mock("./telegram", () => tg);

const { sendOtp } = await import("./otp");
const PHONE = "+998901234567";

describe("sendOtp: yetkazish kanali", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.otpCode.findFirst.mockResolvedValue(null);
    db.otpCode.count.mockResolvedValue(0);
    db.user.findUnique.mockResolvedValue(null);
    tg.telegramMockMode.mockReturnValue(false);
    tg.sendTelegram.mockResolvedValue({ message_id: 1 });
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OTP_DEV_ECHO", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("SMS ham, Telegram ham yoʻq — kod yaratilmaydi, halol xato qaytadi", async () => {
    sms.smsMockMode.mockReturnValue(true);
    expect(await sendOtp(PHONE)).toEqual({ ok: false, error: "SMS_UNAVAILABLE" });
    expect(db.otpCode.create).not.toHaveBeenCalled();
  });

  it("SMS yoʻq, raqam Telegram'ga bogʻlangan — kod Telegram'ga ketadi", async () => {
    sms.smsMockMode.mockReturnValue(true);
    db.user.findUnique.mockResolvedValue({ telegramId: "486", locale: "ru" });
    expect(await sendOtp(PHONE)).toEqual({ ok: true, channel: "telegram" });
    expect(tg.sendTelegram).toHaveBeenCalledWith("486", expect.stringMatching(/\d{6}/));
    expect(sms.sendSms).not.toHaveBeenCalled();
  });

  it("SMS ishlaydi va Telegram bogʻlangan — ikkalasiga ham", async () => {
    sms.smsMockMode.mockReturnValue(false);
    db.user.findUnique.mockResolvedValue({ telegramId: "486", locale: "uz" });
    expect(await sendOtp(PHONE)).toEqual({ ok: true, channel: "telegram" });
    expect(sms.sendSms).toHaveBeenCalledOnce();
  });

  it("Telegram yuborilmasa va SMS yoʻq boʻlsa — xato", async () => {
    sms.smsMockMode.mockReturnValue(true);
    sms.sendSms.mockResolvedValue(undefined);
    db.user.findUnique.mockResolvedValue({ telegramId: "486", locale: "uz" });
    tg.sendTelegram.mockResolvedValue(null);
    // Mock SMS aslida hech qayerga bormaydi — foydalanuvchiga “yuborildi” deyilmaydi
    expect(await sendOtp(PHONE)).toEqual({ ok: false, error: "SMS_UNAVAILABLE" });
    expect(sms.sendSms).not.toHaveBeenCalled();
  });

  it("test rejimi (OTP_DEV_ECHO=1) — kod javobda qaytadi", async () => {
    sms.smsMockMode.mockReturnValue(true);
    vi.stubEnv("OTP_DEV_ECHO", "1");
    const r = await sendOtp(PHONE);
    expect(r).toMatchObject({ ok: true, channel: "sms", devCode: expect.stringMatching(/^\d{6}$/) });
  });
});
