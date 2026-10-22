// 모든 페이지에서 같이 쓰는 기능: Supabase 연결, 로그인 확인, 상단 메뉴, 표시 형식
const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

async function getUser() {
  const { data } = await sb.auth.getSession();
  return data.session?.user ?? null;
}

function isAdmin(user) {
  return user?.app_metadata?.role === "admin";
}

// 로그인 안 했으면 로그인 페이지로 보냄 (로그인 후 원래 페이지로 돌아옴)
async function requireLogin() {
  const user = await getUser();
  if (!user) {
    const next = encodeURIComponent(location.pathname.split("/").pop() + location.search);
    location.href = `login.html?next=${next}`;
    return null;
  }
  return user;
}

async function renderNav() {
  const nav = document.getElementById("nav");
  if (!nav) return;
  const user = await getUser();
  const here = location.pathname.split("/").pop() || "index.html";
  const link = (href, label) =>
    `<a href="${href}" class="${here === href ? "active" : ""}">${label}</a>`;

  nav.innerHTML = `
    <div class="nav-inner">
      <a href="index.html" class="brand">🛍️ 굿즈샵</a>
      <nav class="links">
        ${link("index.html", "상품")}
        ${user ? link("orders.html", "내 결제내역") : ""}
        ${isAdmin(user) ? link("admin.html", "관리자") : ""}
        ${user
          ? `<span class="who">${escapeHtml(user.email)}</span><button id="logout" class="btn-text">로그아웃</button>`
          : link("login.html", "로그인")}
      </nav>
    </div>`;

  document.getElementById("logout")?.addEventListener("click", async () => {
    await sb.auth.signOut();
    location.href = "index.html";
  });
}

function won(n) {
  return Number(n).toLocaleString("ko-KR") + "원";
}

function fmtDate(s) {
  return s ? new Date(s).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" }) : "-";
}

const STATUS = {
  paid: ["결제완료", "ok"],
  pending: ["결제 미완료", "wait"],
  failed: ["결제실패", "bad"],
};
function statusBadge(s) {
  const [label, cls] = STATUS[s] ?? [s, ""];
  return `<span class="badge ${cls}">${label}</span>`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

renderNav();
