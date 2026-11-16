import "server-only";
import { prisma } from "@/lib/db";
import { clickSignOk, sameAmount, type ClickParams } from "@/lib/payments-core";
import { clickConfig, markPaid } from "./service";

// Click SHOP API: Prepare (action=0) va Complete (action=1). merchant_trans_id = Payment.id

const ERR = {
  OK: [0, "Success"],
  SIGN: [-1, "SIGN CHECK FAILED"],
  AMOUNT: [-2, "Incorrect parameter amount"],
  ACTION: [-3, "Action not found"],
  PAID: [-4, "Already paid"],
  ORDER: [-5, "User does not exist"],
  TX: [-6, "Transaction does not exist"],
  REQUEST: [-8, "Error in request from click"],
  CANCELLED: [-9, "Transaction cancelled"],
} as const;

type Fields = ClickParams & { sign_string?: string; error?: string; click_paydoc_id?: string };

const reply = (f: Partial<Fields>, [error, note]: readonly [number, string], extra: Record<string, unknown> = {}) => ({
  click_trans_id: f.click_trans_id ?? null,
  merchant_trans_id: f.merchant_trans_id ?? null,
  ...extra,
  error,
  error_note: note,
});

export async function handleClick(f: Partial<Fields>, expectedAction: "0" | "1", now = new Date()) {
  const required = ["click_trans_id", "service_id", "merchant_trans_id", "amount", "action", "sign_time", "sign_string"] as const;
  if (required.some((k) => !f[k])) return reply(f, ERR.REQUEST);
  if (f.action !== expectedAction) return reply(f, ERR.ACTION);
  const cfg = clickConfig();
  if (f.service_id !== cfg.serviceId || !clickSignOk(f as Fields, cfg.secret)) return reply(f, ERR.SIGN);

  const p = await prisma.payment.findUnique({ where: { id: f.merchant_trans_id! } });
  if (!p || p.provider !== "CLICK") return reply(f, ERR.ORDER);
  if (p.status === "TOLANDI") return reply(f, ERR.PAID);
  if (p.status === "BEKOR") return reply(f, ERR.CANCELLED);
  if (!sameAmount(f.amount!, p.amountUzs)) return reply(f, ERR.AMOUNT);

  if (expectedAction === "0") {
    // prepare_id — butun son (Click talabi); vaqt belgisidan foydalanamiz
    const prepareId = p.externalId === f.click_trans_id && p.extCreateMs ? p.extCreateMs : BigInt(now.getTime());
    await prisma.payment.update({ where: { id: p.id }, data: { externalId: f.click_trans_id, extCreateMs: prepareId } });
    return reply(f, ERR.OK, { merchant_prepare_id: Number(prepareId) });
  }

  // Complete
  if (!p.extCreateMs || String(p.extCreateMs) !== f.merchant_prepare_id || p.externalId !== f.click_trans_id) return reply(f, ERR.TX);
  if (Number(f.error ?? 0) < 0) {
    // Click tomonida toʻlov amalga oshmadi
    await prisma.payment.update({ where: { id: p.id }, data: { status: "BEKOR", cancelledAt: now, extReason: Number(f.error) } });
    return reply(f, ERR.CANCELLED);
  }
  const res = await markPaid(p.id, {}, now);
  if (!res) return reply(f, ERR.PAID);
  return reply(f, ERR.OK, { merchant_confirm_id: Number(p.extCreateMs) });
}
