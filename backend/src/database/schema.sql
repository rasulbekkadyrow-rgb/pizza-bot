-- ═══════════════════════════════════════════════════════════════
--  PIZZA TMA — PostgreSQL sxemasi (idempotent, qayta ishga tushirsa bo'ladi)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  telegram_id   BIGINT      NOT NULL UNIQUE,
  first_name    TEXT        NOT NULL DEFAULT '',
  last_name     TEXT,
  username      TEXT,
  photo_url     TEXT,
  language_code TEXT        NOT NULL DEFAULT 'uz',
  phone         TEXT,
  is_admin      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_blocked    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id         BIGSERIAL PRIMARY KEY,
  slug       TEXT      NOT NULL UNIQUE,
  title      TEXT      NOT NULL,
  emoji      TEXT,
  sort_order INT       NOT NULL DEFAULT 0,
  is_active  BOOLEAN   NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS products (
  id              BIGSERIAL PRIMARY KEY,
  category_id     BIGINT      REFERENCES categories(id) ON DELETE SET NULL,
  slug            TEXT        NOT NULL UNIQUE,
  title           TEXT        NOT NULL,
  description     TEXT        NOT NULL DEFAULT '',
  image_url       TEXT        NOT NULL DEFAULT '',
  video_url       TEXT,
  price           INT         NOT NULL CHECK (price >= 0),
  old_price       INT         CHECK (old_price IS NULL OR old_price >= 0),
  ingredients     JSONB       NOT NULL DEFAULT '[]'::jsonb,
  badges          JSONB       NOT NULL DEFAULT '[]'::jsonb,
  weight_grams    INT,
  kcal            INT,
  is_bestseller   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_addon        BOOLEAN     NOT NULL DEFAULT FALSE,  -- order bump / cross-sell uchun
  is_available    BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order      INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available) WHERE is_available;

CREATE TABLE IF NOT EXISTS stories (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT      NOT NULL,
  cover_url  TEXT      NOT NULL,
  image_url  TEXT      NOT NULL,
  body       TEXT      NOT NULL DEFAULT '',
  cta_label  TEXT,
  cta_target TEXT,
  accent     TEXT      NOT NULL DEFAULT '#FF3B30',
  sort_order INT       NOT NULL DEFAULT 0,
  is_active  BOOLEAN   NOT NULL DEFAULT TRUE
);

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM (
      'PENDING',    -- mijoz yubordi, admin ko'rib chiqmoqda
      'CONFIRMED',  -- admin tasdiqladi, to'lov kutilmoqda
      'PAID',       -- to'lov qabul qilindi
      'PREPARING',  -- oshxonada tayyorlanmoqda
      'DELIVERING', -- kuryer yo'lda
      'COMPLETED',  -- yakunlandi
      'CANCELLED'   -- bekor qilindi
    );
  END IF;
END
$do$;

CREATE TABLE IF NOT EXISTS orders (
  id               BIGSERIAL PRIMARY KEY,
  public_no        TEXT         NOT NULL UNIQUE,
  user_id          BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status           order_status NOT NULL DEFAULT 'PENDING',
  subtotal         INT          NOT NULL DEFAULT 0,
  delivery_fee     INT          NOT NULL DEFAULT 0,
  total_amount     INT          NOT NULL DEFAULT 0,
  currency         TEXT         NOT NULL DEFAULT 'UZS',
  customer_name    TEXT         NOT NULL DEFAULT '',
  phone            TEXT         NOT NULL DEFAULT '',
  address          TEXT         NOT NULL DEFAULT '',
  latitude         DOUBLE PRECISION,
  longitude        DOUBLE PRECISION,
  comment          TEXT,
  payment_method   TEXT         NOT NULL DEFAULT 'CARD',
  admin_message_id BIGINT,
  admin_chat_id    BIGINT,
  processed_by     BIGINT,
  cancel_reason    TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user    ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id               BIGSERIAL PRIMARY KEY,
  order_id         BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       BIGINT REFERENCES products(id) ON DELETE SET NULL,
  title_snapshot   TEXT   NOT NULL,
  unit_price       INT    NOT NULL CHECK (unit_price >= 0),
  quantity         INT    NOT NULL CHECK (quantity > 0 AND quantity <= 50),
  options          JSONB  NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  id         BIGSERIAL PRIMARY KEY,
  order_id   BIGINT       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     order_status NOT NULL,
  actor_id   BIGINT,
  note       TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_order ON order_status_history(order_id);

-- updated_at ni avtomatik yangilovchi trigger
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $fn$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END
$fn$ LANGUAGE plpgsql;

DO $do$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'products', 'orders'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$s', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t);
  END LOOP;
END
$do$;

-- Buyurtma raqami uchun ketma-ketlik: PZ-001001
CREATE SEQUENCE IF NOT EXISTS order_public_no_seq START 1001;
