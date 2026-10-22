// 토스 결제 승인 함수
// success.html이 { paymentKey, orderId, amount }를 보내면:
// 1) 로그인한 사용자 확인 → 2) 본인의 pending 주문인지, 금액이 맞는지 검증
// 3) 토스 승인 API 호출(시크릿 키는 서버에만 있음) → 4) 주문 상태 업데이트
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST만 가능합니다" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const TOSS_SECRET_KEY = Deno.env.get("TOSS_SECRET_KEY");
  if (!TOSS_SECRET_KEY) return json({ error: "서버 설정 오류(TOSS_SECRET_KEY 없음)" }, 500);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // 1) 로그인한 사용자 확인
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) return json({ error: "로그인이 필요합니다" }, 401);
  const user = userData.user;

  let body: { paymentKey?: string; orderId?: string; amount?: number | string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "잘못된 요청입니다" }, 400);
  }
  const paymentKey = String(body.paymentKey ?? "");
  const orderId = String(body.orderId ?? "");
  const amount = Number(body.amount);
  if (!paymentKey || !orderId || !Number.isFinite(amount)) {
    return json({ error: "결제 정보가 부족합니다" }, 400);
  }

  // 2) 주문 검증
  const { data: order, error: orderErr } = await admin
    .from("orders").select("*").eq("order_id", orderId).maybeSingle();
  if (orderErr || !order) return json({ error: "주문을 찾을 수 없습니다" }, 404);
  if (order.user_id !== user.id) return json({ error: "본인 주문이 아닙니다" }, 403);
  if (order.status === "paid") return json({ ok: true, order, already: true });
  if (order.status !== "pending") return json({ error: "결제할 수 없는 주문 상태입니다" }, 409);
  if (order.amount !== amount) {
    await admin.from("orders").update({ status: "failed", fail_reason: "금액 불일치" }).eq("id", order.id);
    return json({ error: "결제 금액이 주문 금액과 다릅니다" }, 400);
  }

  // 3) 토스 결제 승인
  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(TOSS_SECRET_KEY + ":"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  const toss = await res.json();

  // 4) 주문 상태 업데이트
  if (!res.ok) {
    await admin.from("orders")
      .update({ status: "failed", fail_reason: `${toss.code}: ${toss.message}` })
      .eq("id", order.id);
    return json({ error: toss.message ?? "결제 승인 실패", code: toss.code }, 400);
  }

  const { data: updated } = await admin.from("orders")
    .update({
      status: "paid",
      payment_key: paymentKey,
      method: toss.method ?? null,
      paid_at: toss.approvedAt ?? new Date().toISOString(),
      fail_reason: null,
    })
    .eq("id", order.id)
    .select()
    .single();

  return json({ ok: true, order: updated });
});
