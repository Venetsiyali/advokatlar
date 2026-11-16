import "server-only";
import type { Payment } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PAYME_TIMEOUT_MS, paymeAuthOk, toTiyin } from "@/lib/payments-core";
import { markPaid, paymeConfig, revertPaid } from "./service";

// Payme Merchant API (JSON-RPC 2.0): https://developer.help.paycom.uz
// Buyurtma identifikatori — account.order_id = Payment.id

type Msg = { uz: string; ru: string; en: string };
const msg = (uz: string, ru: string, en: string): Msg => ({ uz, ru, en });

const E = {
  AUTH: { code: -32504, message: msg("Ruxsat yoʻq", "Недостаточно привилегий", "Insufficient privileges") },
  PARSE: { code: -32700, message: msg("JSON xatosi", "Ошибка разбора JSON", "Parse error") },
  METHOD: { code: -32601, message: msg("Metod topilmadi", "Метод не найден", "Method not found") },
  AMOUNT: { code: -31001, message: msg("Notoʻgʻri summa", "Неверная сумма", "Incorrect amount") },
  ORDER_NOT_FOUND: { code: -31050, message: msg("Buyurtma topilmadi", "Заказ не найден", "Order not found"), data: "order_id" },
  ORDER_UNAVAILABLE: {
    code: -31051,
    message: msg("Buyurtma toʻlangan yoki boshqa toʻlov kutilmoqda", "Заказ оплачен или ожидает другой оплаты", "Order is paid or awaiting another payment"),
    data: "order_id",
  },
  TX_NOT_FOUND: { code: -31003, message: msg("Tranzaksiya topilmadi", "Транзакция не найдена", "Transaction not found") },
  CANNOT_PERFORM: { code: -31008, message: msg("Amalni bajarib boʻlmaydi", "Невозможно выполнить операцию", "Unable to perform operation") },
} as const;

type RpcError = { code: number; message: Msg; data?: string };
class PaymeError extends Error {
  constructor(public err: RpcError) {
    super(err.message.en);
  }
}

type Rpc = { id?: number | string; method?: string; params?: Record<string, unknown> };
const ms = (d: Date | null | undefined) => (d ? d.getTime() : 0);
const createMs = (p: Payment) => Number(p.extCreateMs ?? 0);

/** Kiruvchi soʻrov uchun JSON-RPC javobi (har doim HTTP 200 bilan qaytariladi) */
export async function handlePayme(rawBody: string, authHeader: string | null, now = new Date()) {
  let rpc: Rpc;
  try {
    rpc = JSON.parse(rawBody);
  } catch {
    return { jsonrpc: "2.0", id: null, error: E.PARSE };
  }
  const id = rpc.id ?? null;
  if (!paymeAuthOk(authHeader, paymeConfig().key)) return { jsonrpc: "2.0", id, error: E.AUTH };
  try {
    const result = await dispatch(rpc.method ?? "", rpc.params ?? {}, now);
    return { jsonrpc: "2.0", id, result };
  } catch (e) {
    if (e instanceof PaymeError) return { jsonrpc: "2.0", id, error: e.err };
    console.error("[payme]", e);
    return { jsonrpc: "2.0", id, error: { code: -32400, message: msg("Tizim xatosi", "Системная ошибка", "System error") } };
  }
}

async function dispatch(method: string, params: Record<string, unknown>, now: Date) {
  switch (method) {
    case "CheckPerformTransaction":
      await checkOrder(params);
      return { allow: true };
    case "CreateTransaction":
      return createTransaction(params, now);
    case "PerformTransaction":
      return performTransaction(String(params.id ?? ""), now);
    case "CancelTransaction":
      return cancelTransaction(String(params.id ?? ""), Number(params.reason ?? 0), now);
    case "CheckTransaction":
      return checkTransaction(String(params.id ?? ""));
    case "GetStatement":
      return getStatement(Number(params.from ?? 0), Number(params.to ?? 0));
    default:
      throw new PaymeError(E.METHOD);
  }
}

/** Buyurtma mavjudligi, holati va summasi */
async function checkOrder(params: Record<string, unknown>, ignoreTxId?: string) {
  const account = (params.account ?? {}) as Record<string, unknown>;
  const orderId = String(account.order_id ?? "");
  const p = orderId ? await prisma.payment.findUnique({ where: { id: orderId } }) : null;
  if (!p || p.provider !== "PAYME") throw new PaymeError(E.ORDER_NOT_FOUND);
  if (p.status !== "KUTILMOQDA") throw new PaymeError(E.ORDER_UNAVAILABLE);
  if (Number(params.amount) !== toTiyin(p.amountUzs)) throw new PaymeError(E.AMOUNT);
  // Buyurtmada boshqa ochiq tranzaksiya bor
  if (p.externalId && p.externalId !== ignoreTxId && p.extState === 1) throw new PaymeError(E.ORDER_UNAVAILABLE);
  return p;
}

const findTx = async (txId: string) => {
  const p = txId ? await prisma.payment.findUnique({ where: { provider_externalId: { provider: "PAYME", externalId: txId } } }) : null;
  if (!p) throw new PaymeError(E.TX_NOT_FOUND);
  return p;
};

async function expire(p: Payment, now: Date) {
  await prisma.payment.update({ where: { id: p.id }, data: { extState: -1, extReason: 4, status: "BEKOR", cancelledAt: now } });
}

async function createTransaction(params: Record<string, unknown>, now: Date) {
  const txId = String(params.id ?? "");
  const time = Number(params.time ?? now.getTime());
  const existing = await prisma.payment.findUnique({ where: { provider_externalId: { provider: "PAYME", externalId: txId } } });
  if (existing) {
    if (existing.extState !== 1) throw new PaymeError(E.CANNOT_PERFORM);
    if (now.getTime() - createMs(existing) > PAYME_TIMEOUT_MS) {
      await expire(existing, now);
      throw new PaymeError(E.CANNOT_PERFORM);
    }
    return { create_time: createMs(existing), transaction: existing.id, state: 1 };
  }
  const p = await checkOrder(params, txId);
  // Shartli yangilash: parallel soʻrovda faqat bittasi buyurtmani band qiladi
  const upd = await prisma.payment.updateMany({
    where: { id: p.id, status: "KUTILMOQDA", OR: [{ externalId: null }, { extState: { not: 1 } }] },
    data: { externalId: txId, extState: 1, extCreateMs: BigInt(time), extReason: null },
  });
  if (upd.count === 0) throw new PaymeError(E.ORDER_UNAVAILABLE);
  return { create_time: time, transaction: p.id, state: 1 };
}

async function performTransaction(txId: string, now: Date) {
  const p = await findTx(txId);
  if (p.extState === 2) return { transaction: p.id, perform_time: ms(p.paidAt), state: 2 };
  if (p.extState !== 1) throw new PaymeError(E.CANNOT_PERFORM);
  if (now.getTime() - createMs(p) > PAYME_TIMEOUT_MS) {
    await expire(p, now);
    throw new PaymeError(E.CANNOT_PERFORM);
  }
  const res = await markPaid(p.id, { extState: 2 }, now);
  if (!res) {
    const fresh = await prisma.payment.findUniqueOrThrow({ where: { id: p.id } });
    if (fresh.extState === 2) return { transaction: fresh.id, perform_time: ms(fresh.paidAt), state: 2 };
    throw new PaymeError(E.CANNOT_PERFORM);
  }
  return { transaction: p.id, perform_time: now.getTime(), state: 2 };
}

async function cancelTransaction(txId: string, reason: number, now: Date) {
  const p = await findTx(txId);
  if (p.extState === -1 || p.extState === -2) {
    return { transaction: p.id, cancel_time: ms(p.cancelledAt), state: p.extState };
  }
  if (p.extState === 1) {
    await prisma.payment.update({ where: { id: p.id }, data: { extState: -1, extReason: reason, status: "BEKOR", cancelledAt: now } });
    return { transaction: p.id, cancel_time: now.getTime(), state: -1 };
  }
  // Bajarilgan toʻlovni bekor qilish (qaytarish): obuna davri qaytarib olinadi
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: p.id }, data: { extState: -2, extReason: reason, status: "BEKOR", cancelledAt: now } });
    await revertPaid(tx, p.id, now);
  });
  return { transaction: p.id, cancel_time: now.getTime(), state: -2 };
}

async function checkTransaction(txId: string) {
  const p = await findTx(txId);
  return {
    create_time: createMs(p),
    perform_time: p.extState === 2 || p.extState === -2 ? ms(p.paidAt) : 0,
    cancel_time: ms(p.cancelledAt),
    transaction: p.id,
    state: p.extState,
    reason: p.extReason,
  };
}

async function getStatement(from: number, to: number) {
  const rows = await prisma.payment.findMany({
    where: { provider: "PAYME", externalId: { not: null }, extCreateMs: { gte: BigInt(from), lte: BigInt(to) } },
    orderBy: { extCreateMs: "asc" },
  });
  return {
    transactions: rows.map((p) => ({
      id: p.externalId,
      time: createMs(p),
      amount: toTiyin(p.amountUzs),
      account: { order_id: p.id },
      create_time: createMs(p),
      perform_time: p.extState === 2 || p.extState === -2 ? ms(p.paidAt) : 0,
      cancel_time: ms(p.cancelledAt),
      transaction: p.id,
      state: p.extState,
      reason: p.extReason,
    })),
  };
}
