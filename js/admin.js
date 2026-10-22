// 관리자 페이지: 전체 결제내역 (관리자 여부는 DB의 RLS가 최종 확인합니다)
let all = [];
const rows = document.getElementById("rows");

(async () => {
  const user = await requireLogin();
  if (!user) return;
  if (!isAdmin(user)) {
    alert("관리자만 볼 수 있는 페이지예요.");
    location.href = "index.html";
    return;
  }

  const { data, error } = await sb.from("orders").select("*").order("created_at", { ascending: false });
  if (error) {
    rows.innerHTML = `<tr><td colspan="8" class="empty">불러오지 못했어요: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  all = data;
  renderStats();
  renderRows();
})();

function renderStats() {
  const paid = all.filter((o) => o.status === "paid");
  const revenue = paid.reduce((s, o) => s + o.amount, 0);
  const buyers = new Set(paid.map((o) => o.user_id)).size;
  const stat = (k, v) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`;
  document.getElementById("stats").innerHTML =
    stat("총 매출 (결제완료)", won(revenue)) +
    stat("결제완료 건수", paid.length + "건") +
    stat("구매한 회원 수", buyers + "명") +
    stat("전체 주문", all.length + "건");
}

function renderRows() {
  const q = document.getElementById("search").value.trim().toLowerCase();
  const st = document.getElementById("status").value;
  const list = all.filter((o) =>
    (!st || o.status === st) &&
    (!q || [o.user_email, o.product_name, o.order_id].some((v) => String(v).toLowerCase().includes(q))));

  if (!list.length) {
    rows.innerHTML = `<tr><td colspan="8" class="empty">해당하는 결제 내역이 없어요.</td></tr>`;
    return;
  }
  rows.innerHTML = list.map((o) => `
    <tr>
      <td>${fmtDate(o.created_at)}</td>
      <td>${escapeHtml(o.user_email)}</td>
      <td>${escapeHtml(o.product_name)}</td>
      <td>${o.quantity}</td>
      <td class="num">${won(o.amount)}</td>
      <td>${statusBadge(o.status)}</td>
      <td>${escapeHtml(o.method ?? "-")}</td>
      <td><small>${escapeHtml(o.order_id)}</small></td>
    </tr>`).join("");
}

document.getElementById("search").addEventListener("input", renderRows);
document.getElementById("status").addEventListener("change", renderRows);
