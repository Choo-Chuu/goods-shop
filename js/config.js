// 공개돼도 안전한 설정값만 여기에 둡니다.
// (Supabase anon 키는 RLS 보안 규칙이 데이터를 지켜주고, 토스 클라이언트 키는 원래 공개용입니다)
// ⚠️ 시크릿 키(service_role, 토스 시크릿 키)는 절대 여기에 넣지 마세요.
const CONFIG = {
  SUPABASE_URL: "https://ydqwotzxxklzcbencmhv.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkcXdvdHp4eGtsemNiZW5jbWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NjIxMzYsImV4cCI6MjEwODIzODEzNn0.a_YAa5YiQOwSETILzTq4Lnr4WkdBo18Yt_UhAljbw7M",
  // 토스페이먼츠 문서용 공개 테스트 키 (결제위젯용, 실제 돈이 나가지 않음)
  TOSS_CLIENT_KEY: "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm",
};
