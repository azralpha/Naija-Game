create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null default 'Sapa Soldier',
  gu_balance integer not null default 0 check (gu_balance >= 0),
  gbese_balance integer not null default 0 check (gbese_balance >= 0),
  equipped_skin_top text not null default 'default',
  equipped_skin_bottom text not null default 'default',
  supporter boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  item_id text not null,
  purchased_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create table if not exists public.transactions (
  reference text primary key,
  user_id uuid references public.profiles(user_id) on delete set null,
  gateway_used text not null check (gateway_used in ('paystack', 'flutterwave')),
  amount_paid_ngn integer not null check (amount_paid_ngn > 0),
  gu_awarded integer not null default 0,
  is_tip boolean not null default false,
  status text not null check (status in ('pending', 'success', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.inventory enable row level security;
alter table public.transactions enable row level security;
create policy "profiles_self_read" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = user_id);
create policy "inventory_self_read" on public.inventory for select using (auth.uid() = user_id);
create policy "transactions_self_read" on public.transactions for select using (auth.uid() = user_id);
-- Server/webhook writes must use the service-role connection and never the browser anon key.
