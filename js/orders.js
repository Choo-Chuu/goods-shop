// 내 결제내역 (RLS 덕분에 본인 주문만 조회됩니다)
(async () => {
  const user = await requireLogin();
  if (!user) return;

  const rows = document.getElementById("rows");
  const { data, error } = await sb
    .from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

  if (error) {
    rows.innerHTML = `<tr><td colspan="6" class="empty">불러오지 못했어요: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  if (!data.length) {
    rows.innerHTML = `<tr><td colspan="6" class="empty">아직 결제 내역이 없어요. <a href="index.html">상품 보러 가기</a></td></tr>`;
    return;
  }
  rows.innerHTML = data.map((o) => `
    <tr>
      <td>${fmtDate(o.created_at)}</td>
      <td>${escapeHtml(o.product_name)}</td>
      <td>${o.quantity}</td>
      <td class="num">${won(o.amount)}</td>
      <td>${statusBadge(o.status)}${o.status === "pending"
        ? ` <a href="checkout.html?orderId=${encodeURIComponent(o.order_id)}">결제하기</a>` : ""}</td>
      <td>${escapeHtml(o.method ?? "-")}</td>
    </tr>`).join("");
})();
