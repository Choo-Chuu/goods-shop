// 상품 목록 보여주기 + 구매 버튼 → 주문 생성 후 결제 페이지로 이동
const box = document.getElementById("products");
const msg = document.getElementById("msg");

async function loadProducts() {
  const { data, error } = await sb.from("products").select("*").order("id");
  if (error) {
    box.innerHTML = `<div class="empty">상품을 불러오지 못했어요: ${escapeHtml(error.message)}</div>`;
    return;
  }
  box.innerHTML = data.map((p) => `
    <div class="card">
      <div class="emoji">${escapeHtml(p.emoji)}</div>
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.description)}</p>
      <div class="price">${won(p.price)}</div>
      <div class="buy-row">
        <input type="number" min="1" max="99" value="1" id="qty-${p.id}" aria-label="수량" />
        <button class="btn" data-id="${p.id}">구매하기</button>
      </div>
    </div>`).join("");
}

box.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;

  const user = await requireLogin();
  if (!user) return;

  const productId = Number(btn.dataset.id);
  const quantity = Number(document.getElementById(`qty-${productId}`).value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    showError("수량은 1~99개 사이로 입력해주세요.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "주문 준비 중...";
  // 금액은 서버(DB 함수)가 계산합니다
  const { data: order, error } = await sb.rpc("create_order", {
    p_product_id: productId,
    p_quantity: quantity,
  });
  if (error) {
    showError("주문을 만들지 못했어요: " + error.message);
    btn.disabled = false;
    btn.textContent = "구매하기";
    return;
  }
  location.href = `checkout.html?orderId=${encodeURIComponent(order.order_id)}`;
});

function showError(text) {
  msg.textContent = text;
  msg.classList.add("show");
}

loadProducts();
