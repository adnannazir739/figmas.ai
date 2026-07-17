import { json, readJson, requireDb, requireUser } from "../../_lib/api.js";

const TOKEN_SYMBOL = "FGMS";
const STAGE_COUNT = 8;
const STAGE_LENGTH_DAYS = 7;
const STAGE_ONE_PRICE = 0.01;
const STAGE_INCREASE = 1.25;
const PRESALE_START = "2026-07-17T00:00:00+02:00";

export async function onRequestGet({ request, env }) {
  try {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;

    const { results } = await requireDb(env)
      .prepare(
        `SELECT id, usdt_amount, token_amount, token_symbol, stage_number, token_price,
          tx_hash, sender_wallet, status, admin_note, created_at, reviewed_at
         FROM purchases
         WHERE user_id = ?
         ORDER BY created_at DESC`
      )
      .bind(auth.user.id)
      .all();

    return json({ purchases: results || [] });
  } catch (error) {
    return json({ error: error.message || "Could not load purchases." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const auth = await requireUser(request, env);
    if (auth.error) return auth.error;

    const body = await readJson(request);
    const usdt = Number(body.usdtAmount);
    const txHash = String(body.txHash || "").trim();
    const senderWallet = String(body.senderWallet || "").trim();

    if (!Number.isFinite(usdt) || usdt <= 0) return json({ error: "Enter a valid USDT amount." }, 400);
    if (txHash.length < 12) return json({ error: "Enter a valid transaction hash." }, 400);
    if (senderWallet.length < 12) return json({ error: "Enter the sending wallet address." }, 400);

    const stage = getCurrentStage();
    const tokenAmount = usdt / stage.price;

    const purchase = {
      id: crypto.randomUUID(),
      userId: auth.user.id,
      email: auth.user.email,
      usdt,
      tokenAmount,
      stageNumber: stage.number,
      tokenPrice: stage.price,
      txHash,
      senderWallet
    };

    await requireDb(env)
      .prepare(
        `INSERT INTO purchases (
          id, user_id, email, usdt_amount, token_amount, token_symbol,
          stage_number, token_price, tx_hash, sender_wallet, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`
      )
      .bind(
        purchase.id,
        purchase.userId,
        purchase.email,
        purchase.usdt,
        purchase.tokenAmount,
        TOKEN_SYMBOL,
        purchase.stageNumber,
        purchase.tokenPrice,
        purchase.txHash,
        purchase.senderWallet
      )
      .run();

    return json({ purchase: { ...purchase, tokenSymbol: TOKEN_SYMBOL, status: "Pending" } }, 201);
  } catch (error) {
    return json({ error: error.message || "Could not submit purchase." }, 500);
  }
}

function getCurrentStage(now = new Date()) {
  const start = new Date(PRESALE_START);
  const stages = Array.from({ length: STAGE_COUNT }, (_, index) => {
    const stageStart = new Date(start.getTime() + index * STAGE_LENGTH_DAYS * 86400000);
    const stageEnd = new Date(stageStart.getTime() + STAGE_LENGTH_DAYS * 86400000);
    return {
      number: index + 1,
      start: stageStart,
      end: stageEnd,
      price: STAGE_ONE_PRICE * STAGE_INCREASE ** index
    };
  });

  return stages.find((stage) => now >= stage.start && now < stage.end) || stages[stages.length - 1];
}
