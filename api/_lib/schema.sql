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

-- Collections the owner manages in the admin (the slug never changes, so links keep working).
create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,60}$'),
  name_en text not null check (char_length(name_en) between 1 and 120),
  name_am text,
  tagline_en text,
  tagline_am text,
  summary_en text,
  summary_am text,
  description_en text,
  description_am text,
  tags_en text,
  tags_am text,
  image_url text,
  sort int not null default 0,
  visible boolean not null default true,
  on_home boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into collections (slug, name_en, name_am, tagline_en, tagline_am, summary_en, summary_am, description_en, description_am, tags_en, tags_am, image_url, sort, on_home)
values
  ('cultural', 'Cultural wear', 'ባህላዊ አልባሳት', 'Line one', 'መስመር አንድ', 'Dresses and sets finished with red, black and yellow woven bands.', 'በቀይ፣ በጥቁር እና በቢጫ ጥለት ያጌጡ የባህል ልብሶች።', 'The colours and woven bands of Ethiopian cultural dress, Sidama among them, worked into dresses, jackets and sets.', 'የሲዳማን ጨምሮ የኢትዮጵያ ባህላዊ ቀለሞችና ጥለቶች፣ በቀሚስ፣ በጃኬት እና በሙሉ ልብስ ላይ በጥንቃቄ ተሰርተው።', 'Women''s dresses, Stripe-panel jackets, Men''s sets, Couples'' outfits, Holiday and wedding', 'የሴቶች ቀሚስ, ጥለት ያላቸው ጃኬቶች, የወንዶች ሙሉ ልብስ, የጥንዶች ልብስ, ለበዓል እና ለሰርግ', 'images/cultural-trio.jpg', 1, true),
  ('modern', 'Modern fashion', 'ዘመናዊ ፋሽን', 'Line two', 'መስመር ሁለት', 'Clean, contemporary cuts for everyday wear and for occasions.', 'ንጹህ ቅርጽ ያላቸው፣ ለዕለት ተዕለት እና ለዝግጅት የሚሆኑ ልብሶች።', 'Simple, sharply cut contemporary pieces for work, events and the stage.', 'ቀላል እና ንጹህ ቅርጽ ያላቸው ዘመናዊ ልብሶች፤ ለስራ፣ ለዝግጅት እና ለመድረክ።', 'Matching sets, Vests and trousers, Dresses, Artist styling', 'ሙሉ ልብሶች, ሰደርያ እና ሱሪ, ቀሚሶች, ለአርቲስቶች', 'images/backdrop-duo.jpg', 2, true),
  ('streetwear', 'Streetwear and custom apparel', 'ስትሪትዌር እና ልዩ ህትመት', 'Line three', 'መስመር ሶስት', 'Tees and casual pieces carrying the Mayza mark.', 'የማይዛ ምልክት ያረፈባቸው ቲሸርቶች እና የዕለት ልብሶች።', 'Everyday pieces carrying the Mayza mark, plus apparel made to your own design for teams, companies and events.', 'የማይዛ ምልክት ያረፈባቸው የዕለት ልብሶች፤ እንዲሁም ለቡድን፣ ለድርጅት እና ለዝግጅት በራስዎ ዲዛይን የሚዘጋጁ።', 'T-shirts, Hoodies, Group orders, Your own artwork', 'ቲሸርት, ሁዲ, የቡድን ልብስ, የራስዎ ዲዛይን', 'images/leather-jacket.jpg', 3, true),
  ('children', 'Children and family', 'የልጆች እና የቤተሰብ', 'Line four', 'መስመር አራት', null, null, 'Cultural dresses scaled down for little ones, and matching outfits a whole family can wear together.', 'ለልጆች የተዘጋጁ ትናንሽ የባህል ቀሚሶች፣ እና መላ ቤተሰብ አንድ ላይ የሚለብሳቸው ተመሳሳይ ልብሶች።', 'Girls'' dresses, Boys'' sets, Family matching', 'የልጆች ቀሚስ, የወንድ ልጆች ልብስ, የቤተሰብ ተመሳሳይ ልብስ', 'images/child-dress.jpg', 4, false)
on conflict (slug) do nothing;

-- Editable website text and photos (Admin > Website), keyed like "home.hero.title".
create table if not exists content (
  key text primary key check (key ~ '^[a-z0-9_.-]{1,80}$'),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name_en text not null check (char_length(name_en) between 1 and 120),
  name_am text,
  description_en text,
  description_am text,
  line text not null,
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


-- products belong to a collection (older databases had a fixed list of four)
alter table products drop constraint if exists products_line_check;
do $$
begin
  alter table products add constraint products_line_fkey foreign key (line) references collections (slug) on update cascade on delete restrict;
exception when duplicate_object then null;
end $$;

create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_status_idx on orders (status);
create index if not exists products_order_idx on products (visible, featured desc, sort);
create index if not exists collections_order_idx on collections (visible, sort);

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
