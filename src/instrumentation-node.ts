// Har 5 daqiqada: javobsiz murojaatlarni qayta yuborish, adminga signal, obuna eslatmalari.
// Bir nechta instans ishlatilsa ENABLE_INTERNAL_CRON=0 qiling va /api/cron/dispatch ni tashqi cron orqali chaqiring.
import { processTimeouts } from "./server/matching";
import { processSubscriptions } from "./server/subscriptions";

// Vercel (serverless) da ichki taymer ishlamaydi — u yerda vercel.json crons yoki tashqi cron ishlatiladi
if (process.env.ENABLE_INTERNAL_CRON !== "0" && !process.env.VERCEL && process.env.NEXT_PHASE !== "phase-production-build") {
  const tick = async () => {
    try {
      const r = await processTimeouts();
      const s = await processSubscriptions();
      if (r.redispatched || r.alerted || s.expired || s.reminded) console.info("[cron]", { ...r, ...s });
    } catch (e) {
      console.error("[cron] xato", e);
    }
  };
  setInterval(tick, 5 * 60_000).unref?.();
}
