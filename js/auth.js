// 회원가입 / 로그인 (이메일 인증 없이 바로 가입됩니다)
let mode = "login";
const form = document.getElementById("form");
const submit = document.getElementById("submit");
const msg = document.getElementById("msg");
const pw = document.getElementById("password");

function setMode(m) {
  mode = m;
  document.getElementById("tab-login").classList.toggle("on", m === "login");
  document.getElementById("tab-signup").classList.toggle("on", m === "signup");
  submit.textContent = m === "login" ? "로그인" : "회원가입";
  pw.autocomplete = m === "login" ? "current-password" : "new-password";
  hideMsg();
}
document.getElementById("tab-login").onclick = () => setMode("login");
document.getElementById("tab-signup").onclick = () => setMode("signup");

function show(text, type = "error") {
  msg.className = `msg show ${type}`;
  msg.textContent = text;
}
function hideMsg() { msg.className = "msg"; }

// 로그인 후 이동할 곳: ?next= 가 있으면 그곳, 관리자는 관리자 페이지, 그 외는 상품 페이지
function goNext(user) {
  const next = new URLSearchParams(location.search).get("next");
  if (next && /^[\w.-]+\.html(\?.*)?$/.test(next)) location.href = next;
  else location.href = isAdmin(user) ? "admin.html" : "index.html";
}

const ERRORS = {
  "Invalid login credentials": "이메일 또는 비밀번호가 맞지 않아요.",
  "User already registered": "이미 가입된 이메일이에요. 로그인해주세요.",
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = pw.value;
  submit.disabled = true;
  show(mode === "login" ? "로그인 중..." : "가입 중...", "info");

  const { data, error } =
    mode === "login"
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password });

  submit.disabled = false;
  if (error) {
    show(ERRORS[error.message] ?? error.message);
    return;
  }
  if (!data.session) {
    show("가입은 됐지만 자동 로그인이 안 됐어요. 로그인 탭에서 다시 로그인해주세요.", "info");
    setMode("login");
    return;
  }
  goNext(data.user);
});

// 이미 로그인돼 있으면 바로 이동
getUser().then((u) => { if (u) goNext(u); });
