# 굿즈샵 (goods-shop)

굿즈를 판매하는 작은 웹사이트. 세부 구조는 [ARCH.md](ARCH.md) 참고.

- 사이트: https://choo-chuu.github.io/goods-shop/
- 저장소: https://github.com/Choo-Chuu/goods-shop
- Supabase 프로젝트: `ydqwotzxxklzcbencmhv` (서울, ap-northeast-2)

## 사용자
- 사용자는 **코딩 입문자**다. 질문하거나 설명할 때는 쉬운 한국어로, 전문용어는 풀어서, 단계별로 설명한다.

## 기술 스택
- 프론트: 순수 HTML/CSS/JS (빌드 없음) → GitHub Pages (main 브랜치 루트)
- 백엔드: Supabase (Auth, Postgres + RLS, Edge Function)
- 결제: 토스페이먼츠 **결제위젯 테스트 모드** (문서용 공개 테스트 키 `test_gck_docs_…` / `test_gsk_docs_…`)
- 라이브러리는 CDN: `@supabase/supabase-js@2.45.4`, `https://js.tosspayments.com/v2/standard`

## 페이지
| 파일 | 내용 |
|---|---|
| `index.html` | 상품 목록, 구매 |
| `login.html` | 회원가입 / 로그인 |
| `checkout.html` | 토스 결제위젯으로 결제 |
| `success.html` / `fail.html` | 결제 결과 |
| `orders.html` | 내 결제내역 |
| `admin.html` | 관리자 전용 전체 결제내역 |

## 꼭 지킬 규칙
1. **시크릿 키는 서버에만.** `service_role` 키와 토스 시크릿 키는 절대 프론트 코드/git에 넣지 않는다. 토스 시크릿은 Supabase secret `TOSS_SECRET_KEY`.
2. **결제 금액은 서버가 계산.** 주문은 `create_order()` DB 함수로만 만들고, 승인은 `confirm-payment` Edge Function이 금액을 검증한 뒤 처리한다.
3. **orders 테이블은 브라우저에서 쓰기 금지** (insert/update RLS 정책 없음). 조회는 본인 것만, 관리자는 전체.
4. **관리자 판별은 `app_metadata.role = 'admin'`** (이메일로 판별하지 않음). 관리자 계정: `admin@admin.com` / `superadmin`.
5. **이메일 인증 꺼짐** (`mailer_autoconfirm: true`). 가입 즉시 로그인된다.
6. `.env.local`에 DB 비밀번호·키가 있다. git에 올리지 않는다.

## 자주 쓰는 작업
- 배포(프론트): `git add -A && git commit -m "..." && git push` → GitHub Pages가 1~2분 뒤 자동 반영
- DB 변경: `supabase/migrations/`에 새 SQL 파일 추가 → Management API `POST /v1/projects/{ref}/database/query`로 실행
- Edge Function 배포: `supabase functions deploy confirm-payment --use-api --project-ref ydqwotzxxklzcbencmhv`
- 토큰: Supabase는 사용자 환경변수 `SUPABASE_ACCESS_TOKEN`, GitHub는 `gh` 로그인(Choo-Chuu)
- 로컬 미리보기: 이 폴더에서 정적 서버를 띄워 `http://localhost:8000` (Auth 리다이렉트 허용 목록에 등록됨)
