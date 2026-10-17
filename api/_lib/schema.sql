-- Mayza Design database (PostgreSQL 13+). Safe to run more than once: npm run migrate

create extension if not exists pgcrypto;

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  name text,
  password_hash text not null,
  token_version int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Product photos uploaded from the admin, stored in the database so the site
-- needs no separate file service. Each is a resized JPEG of a few hundred KB.
create table if not exists images (
  id uuid primary key default gen_random_uuid(),
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp')),
  data bytea not null,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name_en text not null check (char_length(name_en) between 1 and 120),
  name_am text,
  description_en text,
  description_am text,
  line text not null check (line in ('cultural', 'modern', 'streetwear', 'children')),
  price numeric check (price is null or price >= 0),
  image_url text,
  featured boolean not null default false,
  visible boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  phone text not null check (char_length(phone) between 5 and 40),
  garment text check (garment in ('cultural', 'modern', 'street', 'group', 'other')),
  who text check (who in ('woman', 'man', 'child', 'couple', 'family')),
  needed_by date,
  measurements jsonb not null default '{}'::jsonb,
  notes text check (char_length(notes) <= 2000),
  product_id uuid references products (id) on delete set null,
  product_name text,
  source text not null default 'website' check (source in ('website', 'phone', 'walk-in', 'social')),
  status text not null default 'new' check (status in ('new', 'confirmed', 'in_progress', 'ready', 'delivered', 'cancelled')),
  price numeric check (price is null or price >= 0),
  deposit numeric check (deposit is null or deposit >= 0),
  admin_notes text
);

create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_status_idx on orders (status);
create index if not exists products_order_idx on products (visible, featured desc, sort);

insert into settings (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;

insert into products (name_en, name_am, line, image_url, featured, sort)
select * from (values
  ('Woven panel jacket sets', 'ጥለት ያላቸው የጃኬት ሙሉ ልብሶች', 'cultural', 'images/cultural-trio.jpg', true, 1),
  ('Embroidered white set', 'ጥልፍ ያለው ነጭ ሙሉ ልብስ', 'cultural', 'images/embroidered-set.jpg', true, 2),
  ('Cultural trim jackets', 'የባህል ጥለት ያላቸው ጃኬቶች', 'cultural', 'images/cultural-duo.jpg', false, 3),
  ('Woven trim shirt', 'የባህል ጥለት ያለው ሸሚዝ', 'cultural', 'images/trim-shirt.jpg', false, 4),
  ('Children''s cultural dress', 'የልጆች የባህል ቀሚስ', 'children', 'images/child-dress.jpg', true, 5),
  ('White vest and trouser set', 'ነጭ ሰደርያ እና ሱሪ', 'modern', 'images/backdrop-duo.jpg', false, 6),
  ('Burgundy leather jacket', 'ቡርጋንዲ የቆዳ ጃኬት', 'modern', 'images/burgundy-jacket.jpg', false, 7),
  ('Studio looks', 'የስቱዲዮ ልብሶች', 'modern', 'images/backdrop-trio.jpg', false, 8),
  ('Stripe-panel bomber', 'ጥለት ያለው ቦምበር ጃኬት', 'streetwear', 'images/stripe-bomber.jpg', true, 9),
  ('Denim set', 'የጂንስ ሙሉ ልብስ', 'streetwear', 'images/denim-set.jpg', false, 10),
  ('Black leather jacket', 'ጥቁር የቆዳ ጃኬት', 'streetwear', 'images/leather-jacket.jpg', false, 11),
  ('Cultural band fleece jacket', 'የባህል ጥለት ያለው ፍሊስ ጃኬት', 'streetwear', 'images/stripe-fleece.jpg', false, 12)
) as seed (name_en, name_am, line, image_url, featured, sort)
where not exists (select 1 from products);
