// 토스 결제 성공 후 돌아오는 곳: 서버(Edge Function)에 결제 승인을 요청
const box = document.getElementById("result");

function render(icon, title, body) {
  box.innerHTML = `<div class="big-icon">${icon}</div><h1>${title}</h1><p class="sub">${body}</p>`;
}

(async () => {
  const user = await requireLogin();
  if (!user) return;

  const q = new URLSearchParams(location.search);
  const payload = {
    paymentKey: q.get("paymentKey"),
    orderId: q.get("orderId"),
    amount: Number(q.get("amount")),
  };

  const { data, error } = await sb.functions.invoke("confirm-payment", { body: payload });

  if (error || !data?.ok) {
    let reason = data?.error;
    if (!reason && error?.context?.json) {
      try { reason = (await error.context.json()).error; } catch { /* 무시 */ }
    }
    render("❌", "결제에 실패했어요", `${escapeHtml(reason ?? error?.message ?? "알 수 없는 오류")}<br><br>
      <a href="index.html">상품으로 돌아가기</a>`);
    return;
  }

  const o = data.order;
  render("✅", "결제가 완료됐어요!", `${escapeHtml(o.product_name)} × ${o.quantity} · <b>${won(o.amount)}</b><br><br>
    <a class="btn" href="orders.html">내 결제내역 보기</a>`);
})();
