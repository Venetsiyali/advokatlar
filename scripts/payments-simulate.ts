// Payme va Click webhook'larini haqiqiy soʻrovlarsiz sinash (lokal bazada).
// Ishga tushirish: npm run payments:simulate
import assert from "node:assert/strict";

process.env.PAYME_MERCHANT_ID = "test-merchant";
process.env.PAYME_KEY = "test-payme-key";
process.env.CLICK_SERVICE_ID = "777";
process.env.CLICK_MERCHANT_ID = "888";
process.env.CLICK_SECRET_KEY = "click-secret";
delete process.env.TELEGRAM_BOT_TOKEN;

const DAY = 86400_000;

async function main() {
  const { prisma } = await import("@/lib/db");
  const { handlePayme } = await import("@/server/payments/payme");
  const { handleClick } = await import("@/server/payments/click");
  const { createPayment } = await import("@/server/payments/service");
  const { clickSign } = await import("@/lib/payments-core");

  const lawyer = await prisma.lawyerProfile.findFirstOrThrow({ where: { status: "TASDIQLANGAN" }, include: { subscription: true } });
  const original = lawyer.subscription!;
  const created: string[] = [];
  const auth = `Basic ${Buffer.from("Paycom:test-payme-key").toString("base64")}`;
  let rpcId = 1;
  const rpc = (method: string, params: Record<string, unknown>, a = auth, now?: Date) =>
    handlePayme(JSON.stringify({ id: rpcId++, method, params }), a, now) as Promise<{ result?: Record<string, unknown>; error?: { code: number } }>;
  const subEnd = async () => (await prisma.subscription.findUniqueOrThrow({ where: { lawyerId: lawyer.id } })).endsAt.getTime();

  try {
    // ---------- Payme: toʻliq hayot sikli ----------
    const p1 = (await createPayment(lawyer.id, "PAYME"))!;
    created.push(p1.id);
    const amount = p1.amountUzs * 100;
    const account = { order_id: p1.id };

    assert.equal((await rpc("CheckPerformTransaction", { amount, account }, "Basic bad")).error?.code, -32504);
    assert.equal((await rpc("CheckPerformTransaction", { amount: amount - 100, account })).error?.code, -31001);
    assert.equal((await rpc("CheckPerformTransaction", { amount, account: { order_id: "nope" } })).error?.code, -31050);
    assert.deepEqual((await rpc("CheckPerformTransaction", { amount, account })).result, { allow: true });
    assert.equal((await rpc("Unknown", {})).error?.code, -32601);
    console.log("✓ Payme: avtorizatsiya, summa, buyurtma tekshiruvi");

    const txId = `payme-tx-${Date.now()}`;
    const time = Date.now();
    const c1 = await rpc("CreateTransaction", { id: txId, time, amount, account });
    assert.equal(c1.result?.state, 1);
    assert.equal(c1.result?.create_time, time);
    const c2 = await rpc("CreateTransaction", { id: txId, time, amount, account });
    assert.equal(c2.result?.create_time, time, "takroriy CreateTransaction idempotent");
    assert.equal((await rpc("CreateTransaction", { id: `${txId}-other`, time, amount, account })).error?.code, -31051, "buyurtmada ochiq tranzaksiya bor");
    console.log("✓ Payme: CreateTransaction (idempotent, ikkinchi tranzaksiya rad etildi)");

    const before = await subEnd();
    const pf1 = await rpc("PerformTransaction", { id: txId });
    assert.equal(pf1.result?.state, 2);
    const after = await subEnd();
    assert.equal(after - before, 30 * DAY, "faol obuna oxiridan +30 kun");
    const pf2 = await rpc("PerformTransaction", { id: txId });
    assert.equal(pf2.result?.perform_time, pf1.result?.perform_time, "takroriy Perform idempotent");
    assert.equal(await subEnd(), after, "takroriy Perform obunani ikki marta uzaytirmaydi");
    const chk = await rpc("CheckTransaction", { id: txId });
    assert.equal(chk.result?.state, 2);
    assert.equal((await prisma.subscription.findUniqueOrThrow({ where: { lawyerId: lawyer.id } })).status, "FAOL");
    console.log("✓ Payme: PerformTransaction → obuna FAOL, +30 kun, idempotent");

    const st = await rpc("GetStatement", { from: time - 1000, to: time + 1000 });
    assert.ok((st.result?.transactions as { id: string }[]).some((x) => x.id === txId));
    const cancel = await rpc("CancelTransaction", { id: txId, reason: 5 });
    assert.equal(cancel.result?.state, -2);
    assert.equal(await subEnd(), before, "qaytarilganda obuna davri olib tashlanadi");
    assert.equal((await rpc("CancelTransaction", { id: txId, reason: 5 })).result?.state, -2);
    assert.equal((await rpc("CheckTransaction", { id: "missing" })).error?.code, -31003);
    console.log("✓ Payme: GetStatement, CancelTransaction (-2) davrni qaytaradi");

    // ---------- Payme: 12 soatlik muddat ----------
    const p2 = (await createPayment(lawyer.id, "PAYME"))!;
    created.push(p2.id);
    const oldTx = `payme-old-${Date.now()}`;
    const oldTime = Date.now() - 13 * 3600_000;
    assert.equal((await rpc("CreateTransaction", { id: oldTx, time: oldTime, amount, account: { order_id: p2.id } })).result?.state, 1);
    assert.equal((await rpc("PerformTransaction", { id: oldTx })).error?.code, -31008);
    const exp = await rpc("CheckTransaction", { id: oldTx });
    assert.equal(exp.result?.state, -1);
    assert.equal(exp.result?.reason, 4);
    console.log("✓ Payme: 12 soatdan eskirgan tranzaksiya bekor qilinadi (reason 4)");

    // ---------- Click ----------
    const p3 = (await createPayment(lawyer.id, "CLICK"))!;
    created.push(p3.id);
    const base = {
      click_trans_id: String(Date.now()),
      service_id: "777",
      merchant_trans_id: p3.id,
      amount: p3.amountUzs.toFixed(2),
      sign_time: "2026-11-16 10:00:00",
      click_paydoc_id: "1",
      error: "0",
    };
    const prep = { ...base, action: "0" };
    assert.equal((await handleClick({ ...prep, sign_string: "bad" }, "0")).error, -1);
    assert.equal((await handleClick({ ...prep, amount: "1.00", sign_string: clickSign({ ...prep, amount: "1.00" }, "click-secret") }, "0")).error, -2);
    const r1 = (await handleClick({ ...prep, sign_string: clickSign(prep, "click-secret") }, "0")) as unknown as { error: number; merchant_prepare_id: number };
    assert.equal(r1.error, 0);
    const wrong = { ...base, action: "1", merchant_prepare_id: "1" };
    assert.equal((await handleClick({ ...wrong, sign_string: clickSign(wrong, "click-secret") }, "1")).error, -6);
    const before2 = await subEnd();
    const comp = { ...base, action: "1", merchant_prepare_id: String(r1.merchant_prepare_id) };
    assert.equal((await handleClick({ ...comp, sign_string: clickSign(comp, "click-secret") }, "1")).error, 0);
    assert.equal((await subEnd()) - before2, 30 * DAY);
    assert.equal((await handleClick({ ...comp, sign_string: clickSign(comp, "click-secret") }, "1")).error, -4, "ikkinchi marta — allaqachon toʻlangan");
    console.log("✓ Click: imzo, summa, prepare/complete, takroriy complete rad etildi");

    // Yangi buyurtma yaratilganda provayderga yetmagan eskilari bekor qilinadi
    const p4 = (await createPayment(lawyer.id, "PAYME"))!;
    const p5 = (await createPayment(lawyer.id, "PAYME"))!;
    created.push(p4.id, p5.id);
    assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: p4.id } })).status, "BEKOR");
    console.log("✓ eski ochiq buyurtmalar bekor qilinadi");

    console.log("\nBarcha toʻlov ssenariylari muvaffaqiyatli ✔");
  } finally {
    await prisma.payment.deleteMany({ where: { id: { in: created } } });
    await prisma.subscription.update({
      where: { id: original.id },
      data: { endsAt: original.endsAt, status: original.status, planId: original.planId, remindedAt: original.remindedAt },
    });
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("✗", e);
  process.exitCode = 1;
});
