// db/connection.js
// SQLite connection + schema setup. Runs automatically on first import,
// so simply requiring this module is enough to get a ready database.

const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "nasiekus.db");
const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    phone         TEXT,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL CHECK (category IN ('clothes','shoes')),
    type        TEXT NOT NULL DEFAULT '',
    price       INTEGER NOT NULL,
    old_price   INTEGER,
    is_new      INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '',
    colors      TEXT NOT NULL DEFAULT '[]',   -- JSON array of hex strings
    sizes       TEXT NOT NULL DEFAULT '[]',   -- JSON array of size labels
    stock       INTEGER NOT NULL DEFAULT 50,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS product_images (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url  TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number    TEXT NOT NULL UNIQUE,
    user_id         INTEGER REFERENCES users(id),
    full_name       TEXT NOT NULL,
    email           TEXT,
    phone           TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    city            TEXT NOT NULL DEFAULT 'Nairobi',
    subtotal        INTEGER NOT NULL,
    delivery_fee    INTEGER NOT NULL DEFAULT 0,
    discount        INTEGER NOT NULL DEFAULT 0,
    total           INTEGER NOT NULL,
    payment_method  TEXT NOT NULL CHECK (payment_method IN ('mpesa','cod')),
    payment_status  TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed')),
    order_status    TEXT NOT NULL DEFAULT 'placed' CHECK (order_status IN ('placed','packed','out_for_delivery','delivered','cancelled')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id   TEXT REFERENCES products(id),
    product_name TEXT NOT NULL,
    size         TEXT,
    quantity     INTEGER NOT NULL,
    unit_price   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mpesa_transactions (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id             INTEGER REFERENCES orders(id),
    checkout_request_id  TEXT,
    merchant_request_id  TEXT,
    phone                TEXT,
    amount               INTEGER,
    status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','cancelled')),
    mpesa_receipt_number TEXT,
    result_desc          TEXT,
    raw_callback         TEXT,
    created_at           TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_mpesa_checkout_id ON mpesa_transactions(checkout_request_id);
`);

module.exports = db;
