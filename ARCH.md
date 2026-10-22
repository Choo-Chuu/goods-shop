# 굿즈샵 구조 (ARCH)

핵심 요약은 [CLAUDE.md](CLAUDE.md).

## 1. 전체 구성
```
[브라우저: GitHub Pages 정적 사이트]
   │  supabase-js (anon 키 + 사용자 로그인 토큰)
   ├──────────────► Supabase Auth        회원가입/로그인 (이메일 인증 없음)
   ├──────────────► Supabase DB (RLS)    products 조회, orders 조회, create_order()
   ├──────────────► Edge Function        confirm-payment
   │                    └──(시크릿 키)──► 토스 결제 승인 API
   └──────────────► 토스 결제위젯 (결제창)
```

## 2. 폴더/파일
```
index.html  login.html  checkout.html  success.html  fail.html  orders.html  admin.html
css/style.css            공통 스타일
js/config.js             공개 설정값 (Supabase URL·anon 키, 토스 클라이언트 키)
js/common.js             Supabase 클라이언트(sb), getUser, isAdmin, requireLogin, renderNav, won, fmtDate, statusBadge, escapeHtml
js/shop.js               상품 목록 + create_order 호출 → checkout으로 이동
js/auth.js               로그인/회원가입 탭, ?next= 로 돌아가기
js/checkout.js           내 pending 주문 조회 → 결제위젯 렌더 → requestPayment
js/success.js            confirm-payment 호출 → 결과 표시
js/orders.js             내 주문 목록
js/admin.js              전체 주문 + 매출 요약 + 검색/상태 필터
supabase/migrations/001_init.sql          테이블, 함수, RLS, 예시 상품
supabase/functions/confirm-payment/index.ts 결제 승인 서버 함수
```
페이지마다 스크립트 로드 순서: `supabase-js(CDN) → config.js → common.js → 페이지 전용 js`.

## 3. 데이터베이스
### products
| 컬럼 | 설명 |
|---|---|
| id | bigint PK |
| name, description | 상품명, 설명 |
| price | 원 단위 정수 |
| emoji / image_url | 표시용 아이콘 / (선택) 이미지 |

### orders
| 컬럼 | 설명 |
|---|---|
| id | uuid PK |
| order_id | 토스에 넘기는 주문번호 `ORD-<32자리>` (unique) |
| user_id, user_email | 주문한 회원 |
| product_id, product_name, quantity | 주문 상품 (이름은 주문 시점 값 저장) |
| amount | **서버가 계산한** 결제 금액 |
| status | `pending` → `paid` 또는 `failed` |
| payment_key, method, paid_at | 토스 승인 결과 |
| fail_reason | 실패 사유 |

### 함수
- `is_admin()`: `auth.jwt() -> app_metadata ->> role = 'admin'`
- `create_order(p_product_id, p_quantity)`: security definer. 로그인 확인, 수량 1~99 검증, `price × quantity`로 금액 계산 후 pending 주문 생성. `authenticated`만 실행 가능.

### RLS 정책
| 테이블 | 조회 | 쓰기 |
|---|---|---|
| products | 누구나 | 없음 (대시보드/SQL로만) |
| orders | 본인 주문 또는 관리자 | 없음. `create_order()`와 Edge Function(service_role)만 쓴다 |

## 4. 결제 흐름
1. `index.html` 구매 클릭 → 로그인 확인 → `rpc('create_order')` → pending 주문 생성
2. `checkout.html?orderId=…` → 주문 조회(RLS) → `TossPayments(clientKey).widgets({customerKey: user.id})`
   → `setAmount` → `renderPaymentMethods` / `renderAgreement` → `requestPayment({orderId, orderName, successUrl, failUrl})`
3. 토스가 `success.html?paymentKey&orderId&amount`로 돌려보냄
4. `success.js` → `functions.invoke('confirm-payment', {paymentKey, orderId, amount})`
5. Edge Function:
   - 토큰으로 사용자 확인 (없으면 401)
   - 주문이 본인 것인지 확인 (아니면 403)
   - 이미 paid면 그대로 성공 반환 (새로고침 대비)
   - pending이 아니면 409
   - 금액이 다르면 failed 처리 후 400
   - 토스 `POST /v1/payments/confirm` (Basic `TOSS_SECRET_KEY:`)
   - 성공하면 `paid`, 실패하면 `failed` + 사유
6. 결제창에서 취소/실패 → `fail.html?code&message`. 주문은 pending으로 남고 내역에서 다시 결제할 수 있다.

## 5. 인증·관리자
- 이메일/비밀번호 가입. Supabase Auth 설정 `mailer_autoconfirm=true`이라 가입 즉시 세션 발급.
- `site_url` = Pages 주소, 허용 리다이렉트 = Pages 주소, `http://localhost:8000/**`
- 관리자 = `app_metadata.role='admin'`. 이 값은 Auth Admin API(service_role)로만 설정 가능하고 사용자가 바꿀 수 없다.
- `admin.html`의 화면 차단은 편의 기능이고, 실제 보호는 RLS가 한다.

## 6. 설정값 위치
| 값 | 위치 |
|---|---|
| Supabase URL, anon 키, 토스 클라이언트 키 | `js/config.js` (공개 OK) |
| 토스 시크릿 키 | Supabase secret `TOSS_SECRET_KEY` |
| service_role 키, DB 비밀번호 | `.env.local` (gitignore) |
| Supabase 관리 토큰 | 사용자 환경변수 `SUPABASE_ACCESS_TOKEN` |

## 7. 토스 테스트 키 교체
본인 토스 개발자센터 키로 바꾸려면:
1. `js/config.js`의 `TOSS_CLIENT_KEY` 변경
2. `supabase secrets set TOSS_SECRET_KEY=... --project-ref ydqwotzxxklzcbencmhv`

결제위젯용 키(`test_gck_` / `test_gsk_`)를 써야 한다.
