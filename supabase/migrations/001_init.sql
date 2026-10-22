-- 굿즈샵 초기 스키마: 상품, 주문, 관리자 판별, 보안 규칙(RLS)

-- 상품 ------------------------------------------------------------
create table if not exists public.products (
  id          bigint generated always as identity primary key,
  name        text    not null,
  description text    not null default '',
  price       integer not null check (price > 0),   -- 원 단위
  emoji       text    not null default '🎁',         -- 이미지 대신 쓰는 아이콘
  image_url   text,
  created_at  timestamptz not null default now()
);

-- 주문(결제 내역) ---------------------------------------------------
create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  order_id     text not null unique,                 -- 토스에 넘기는 주문번호
  user_id      uuid not null references auth.users(id) on delete cascade,
  user_email   text not null,
  product_id   bigint not null references public.products(id),
  product_name text not null,
  quantity     integer not null check (quantity between 1 and 99),
  amount       integer not null check (amount > 0), -- 서버에서 계산한 결제 금액
  status       text not null default 'pending' check (status in ('pending','paid','failed')),
  payment_key  text,
  method       text,
  fail_reason  text,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);
create index if not exists orders_user_id_idx on public.orders(user_id);

-- 관리자 판별: app_metadata.role = 'admin' (사용자가 직접 바꿀 수 없는 값)
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

-- 보안 규칙(RLS) ----------------------------------------------------
alter table public.products enable row level security;
alter table public.orders   enable row level security;

drop policy if exists "상품은 누구나 조회" on public.products;
create policy "상품은 누구나 조회" on public.products
  for select using (true);

drop policy if exists "본인 주문 또는 관리자만 조회" on public.orders;
create policy "본인 주문 또는 관리자만 조회" on public.orders
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
-- orders에는 insert/update 정책이 없으므로 브라우저에서 직접 쓸 수 없음.
-- 주문 생성은 create_order(), 결제 승인은 Edge Function(service_role)만 가능.

-- 주문 만들기: 금액은 DB 가격으로 계산 (브라우저가 보낸 금액은 믿지 않음)
create or replace function public.create_order(p_product_id bigint, p_quantity integer)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_product public.products;
  v_order   public.orders;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 99 then
    raise exception '수량은 1~99개만 가능합니다';
  end if;

  select * into v_product from public.products where id = p_product_id;
  if not found then
    raise exception '존재하지 않는 상품입니다';
  end if;

  insert into public.orders (order_id, user_id, user_email, product_id, product_name, quantity, amount)
  values (
    'ORD-' || replace(gen_random_uuid()::text, '-', ''),
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', ''),
    v_product.id,
    v_product.name,
    p_quantity,
    v_product.price * p_quantity
  )
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.create_order(bigint, integer) from public, anon;
grant execute on function public.create_order(bigint, integer) to authenticated;

-- 예시 상품 ---------------------------------------------------------
insert into public.products (name, description, price, emoji)
select * from (values
  ('로고 머그컵',   '매일 쓰기 좋은 350ml 세라믹 머그컵',        12000, '☕'),
  ('스티커 팩',     '방수 비닐 스티커 10종 세트',                 4000, '✨'),
  ('오버핏 티셔츠', '면 100% 오버핏 반팔 티셔츠 (프리사이즈)',    25000, '👕'),
  ('아크릴 키링',   '양면 인쇄 아크릴 키링',                      6000, '🔑'),
  ('에코백',        '튼튼한 캔버스 소재 데일리 에코백',           15000, '👜'),
  ('A3 포스터',     '고급 무광지에 인쇄한 일러스트 포스터',       9000, '🖼️')
) as v(name, description, price, emoji)
where not exists (select 1 from public.products);
