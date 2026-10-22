// 결제 페이지: 내 주문을 불러와서 토스 결제위젯을 보여주고 결제를 요청
const msg = document.getElementById("msg");
const payBtn = document.getElementById("pay");

function showError(text) {
  msg.textContent = text;
  msg.classList.add("show");
}

(async () => {
  const user = await requireLogin();
  if (!user) return;

  const orderId = new URLSearchParams(location.search).get("orderId");
  // RLS 덕분에 본인 주문만 조회됩니다
  const { data: order, error } = await sb.from("orders").select("*").eq("order_id", orderId).maybeSingle();
  if (error || !order) {
    document.getElementById("summary").innerHTML = `<div class="empty">주문을 찾을 수 없어요.</div>`;
    return;
  }
  if (order.status !== "pending") {
    document.getElementById("summary").innerHTML =
      `<div class="empty">이미 처리된 주문이에요. <a href="orders.html">결제내역 보기</a></div>`;
    return;
  }

  const orderName = order.quantity > 1 ? `${order.product_name} ${order.quantity}개` : order.product_name;
  document.getElementById("summary").innerHTML = `
    <div class="summary">
      <div><h3>${escapeHtml(orderName)}</h3><p>주문번호 ${escapeHtml(order.order_id)}</p></div>
      <div class="price">${won(order.amount)}</div>
    </div>`;

  try {
    const tossPayments = TossPayments(CONFIG.TOSS_CLIENT_KEY);
    const widgets = tossPayments.widgets({ customerKey: user.id });
    await widgets.setAmount({ currency: "KRW", value: order.amount });
    await Promise.all([
      widgets.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
      widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
    ]);
    payBtn.disabled = false;

    payBtn.addEventListener("click", async () => {
      try {
        await widgets.requestPayment({
          orderId: order.order_id,
          orderName,
          customerEmail: user.email,
          successUrl: new URL("success.html", location.href).href,
          failUrl: new URL("fail.html", location.href).href,
        });
      } catch (err) {
        // 사용자가 결제창을 닫은 경우 등
        showError(err.message ?? "결제를 진행하지 못했어요.");
      }
    });
  } catch (err) {
    showError("결제 화면을 불러오지 못했어요: " + (err.message ?? err));
  }
})();
