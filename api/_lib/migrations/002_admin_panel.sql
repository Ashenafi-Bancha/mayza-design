-- 002: admin panel foundation (staff roles and two-factor sign-in, activity log,
-- clients and measurements, the order pipeline with payments, timeline and photos,
-- and a lightweight visitor tracker for the dashboard).

-- ---------- staff accounts ----------
alter table admins add column if not exists role text not null default 'owner';
alter table admins add column if not exists active boolean not null default true;
alter table admins add column if not exists totp_secret text;
alter table admins add column if not exists totp_enabled boolean not null default false;
alter table admins add column if not exists last_login_at timestamptz;
alter table admins add column if not exists updated_at timestamptz not null default now();
do $$ begin
  alter table admins add constraint admins_role_check check (role in ('owner', 'manager', 'editor', 'tailor'));
exception when duplicate_object then null; end $$;

-- ---------- activity log: who changed what, and when ----------
create table if not exists activity_log (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  user_id uuid references admins (id) on delete set null,
  user_label text,
  action text not null,
  entity_type text,
  entity_id text,
  summary text,
  details jsonb not null default '{}'::jsonb,
  ip text
);
create index if not exists activity_created_idx on activity_log (created_at desc);
create index if not exists activity_entity_idx on activity_log (entity_type, entity_id);

-- ---------- clients and their measurements ----------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 1 and 120),
  phone text,
  phone_norm text,              -- digits only, in international form, for duplicate checks
  email text,
  telegram text,
  whatsapp text,
  city text,
  notes text,                   -- private, staff only
  tags text[] not null default '{}',
  vip boolean not null default false,
  created_by uuid references admins (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists clients_phone_idx on clients (phone_norm);
create index if not exists clients_name_idx on clients (lower(full_name));

create table if not exists measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  label text,
  data jsonb not null default '{}'::jsonb,
  notes text,
  taken_on date not null default current_date,
  created_by uuid references admins (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists measurements_client_idx on measurements (client_id, taken_on desc);

-- ---------- orders: the pipeline ----------
create table if not exists order_counters (year int primary key, last int not null default 0);

alter table orders alter column ref drop not null;
alter table orders add column if not exists number text;
alter table orders add column if not exists client_id uuid references clients (id) on delete set null;
alter table orders add column if not exists type text not null default 'custom';
alter table orders add column if not exists priority text not null default 'normal';
alter table orders add column if not exists assigned_to uuid references admins (id) on delete set null;
alter table orders add column if not exists occasion text;
alter table orders add column if not exists event_date date;
alter table orders add column if not exists preferences text;
alter table orders add column if not exists payment_note text;
alter table orders add column if not exists created_by uuid references admins (id) on delete set null;
alter table orders add column if not exists archived_at timestamptz;

-- new status and source lists (older orders are mapped across)
alter table orders drop constraint if exists orders_status_check;
alter table orders drop constraint if exists orders_source_check;
update orders set status = 'in_production' where status = 'in_progress';
update orders set source = 'other' where source = 'social';
alter table orders add constraint orders_status_check check (status in ('new', 'contacted', 'quote_sent', 'confirmed', 'in_production', 'ready', 'delivered', 'cancelled'));
alter table orders add constraint orders_source_check check (source in ('phone', 'walk-in', 'telegram', 'whatsapp', 'instagram', 'referral', 'website', 'other'));
do $$ begin
  alter table orders add constraint orders_type_check check (type in ('custom', 'ready_to_wear', 'alteration', 'event_styling'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table orders add constraint orders_priority_check check (priority in ('normal', 'urgent', 'vip'));
exception when duplicate_object then null; end $$;

-- give existing orders a number in the new format
do $$
declare r record; y int; n int;
begin
  for r in select id, created_at from orders where number is null order by created_at loop
    y := extract(year from r.created_at)::int;
    insert into order_counters (year, last) values (y, 1)
      on conflict (year) do update set last = order_counters.last + 1
      returning last into n;
    update orders set number = 'ORD-' || y || '-' || lpad(n::text, 4, '0') where id = r.id;
  end loop;
end $$;
alter table orders alter column number set not null;
do $$ begin
  alter table orders add constraint orders_number_key unique (number);
exception when duplicate_object or duplicate_table then null; end $$;
create index if not exists orders_client_idx on orders (client_id);
create index if not exists orders_assigned_idx on orders (assigned_to);
create index if not exists orders_due_idx on orders (needed_by);

-- link existing orders to clients (one client per phone number)
do $$
declare r record; cid uuid; pn text;
begin
  for r in select * from orders where client_id is null order by created_at loop
    pn := regexp_replace(coalesce(r.phone, ''), '\D', '', 'g');
    if pn like '0%' then pn := '251' || substr(pn, 2); elsif length(pn) = 9 then pn := '251' || pn; end if;
    select id into cid from clients where phone_norm = pn and pn <> '' limit 1;
    if cid is null then
      insert into clients (full_name, phone, phone_norm, created_at) values (r.name, r.phone, nullif(pn, ''), r.created_at) returning id into cid;
    end if;
    update orders set client_id = cid where id = r.id;
  end loop;
end $$;

-- payments are recorded by hand (no payment gateway): several partial payments per order
create table if not exists order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  amount numeric not null check (amount > 0),
  method text not null default 'cash' check (method in ('telebirr', 'bank', 'cash', 'other')),
  paid_on date not null default current_date,
  note text,
  created_by uuid references admins (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists payments_order_idx on order_payments (order_id);
insert into order_payments (order_id, amount, method, paid_on, note, created_at)
  select id, deposit, 'other', created_at::date, 'Deposit recorded before payment tracking', created_at
  from orders o where deposit > 0 and not exists (select 1 from order_payments p where p.order_id = o.id);

-- timeline of each order: creation, status changes, notes, payments, photos
create table if not exists order_events (
  id bigserial primary key,
  order_id uuid not null references orders (id) on delete cascade,
  created_at timestamptz not null default now(),
  user_id uuid references admins (id) on delete set null,
  user_label text,
  kind text not null check (kind in ('created', 'status', 'note', 'payment', 'image', 'edit', 'assigned')),
  from_status text,
  to_status text,
  body text
);
create index if not exists order_events_idx on order_events (order_id, created_at);
insert into order_events (order_id, created_at, kind, to_status, body)
  select id, created_at, 'created', status, 'Order recorded before the timeline existed'
  from orders o where not exists (select 1 from order_events e where e.order_id = o.id);

-- reference images from the client and progress photos from the workshop
create table if not exists order_images (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  image_id uuid not null references images (id) on delete cascade,
  kind text not null default 'reference' check (kind in ('reference', 'progress')),
  caption text,
  created_by uuid references admins (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists order_images_idx on order_images (order_id);

-- ---------- visitor tracker (no cookies, no IP addresses) ----------
create table if not exists page_views (
  id bigserial primary key,
  day date not null default current_date,
  created_at timestamptz not null default now(),
  path text not null,
  source text not null default 'direct',
  collection text,
  visit boolean not null default false
);
create index if not exists page_views_day_idx on page_views (day);
