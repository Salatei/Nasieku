// routes/products.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const db = require("../db/connection");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

function serializeProduct(row){
  const images = db.prepare(
    "SELECT id, image_url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC"
  ).all(row.id);
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    type: row.type,
    price: row.price,
    oldPrice: row.old_price,
    isNew: !!row.is_new,
    desc: row.description,
    colors: JSON.parse(row.colors || "[]"),
    sizes: JSON.parse(row.sizes || "[]"),
    stock: row.stock,
    images: images.length
      ? images.map(i => i.image_url)
      : ["https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=900&auto=format&fit=crop"],
    imageRecords: images // includes ids, useful for the admin dashboard
  };
}

function slugify(name){
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${base}-${Date.now().toString(36)}`;
}

// GET /api/products — public, with optional filters
router.get("/", (req, res) => {
  const { category, isNew, onSale, q, sort } = req.query;
  let sql = "SELECT * FROM products WHERE 1=1";
  const params = [];

  if (category && category !== "all"){
    sql += " AND category = ?";
    params.push(category);
  }
  if (isNew === "1" || isNew === "true"){
    sql += " AND is_new = 1";
  }
  if (onSale === "1" || onSale === "true"){
    sql += " AND old_price IS NOT NULL";
  }
  if (q){
    sql += " AND (name LIKE ? OR type LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }

  switch(sort){
    case "price-asc": sql += " ORDER BY price ASC"; break;
    case "price-desc": sql += " ORDER BY price DESC"; break;
    case "new": sql += " ORDER BY is_new DESC, created_at DESC"; break;
    default: sql += " ORDER BY created_at DESC";
  }

  const rows = db.prepare(sql).all(...params);
  res.json({ products: rows.map(serializeProduct) });
});

// GET /api/products/:id — public
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Product not found." });
  res.json({ product: serializeProduct(row) });
});

// POST /api/products — admin only. Accepts multipart/form-data:
//   name, category, type, price, oldPrice, isNew, description, colors, sizes
//   images: uploaded files (optional)
//   imageUrls: comma-separated external URLs (optional, in addition to files)
router.post("/", requireAuth, requireAdmin, upload.array("images", 6), (req, res) => {
  const { name, category, type, price, oldPrice, isNew, description, colors, sizes, imageUrls } = req.body;

  if (!name || !category || !price){
    return res.status(400).json({ error: "Name, category, and price are required." });
  }
  if (!["clothes", "shoes"].includes(category)){
    return res.status(400).json({ error: "Category must be 'clothes' or 'shoes'." });
  }

  const id = slugify(name);
  const parsedColors = safeParseList(colors);
  const parsedSizes = safeParseList(sizes);

  db.prepare(`
    INSERT INTO products (id, name, category, type, price, old_price, is_new, description, colors, sizes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, name.trim(), category, type || "", Math.round(Number(price)),
    oldPrice ? Math.round(Number(oldPrice)) : null,
    (isNew === "1" || isNew === "true") ? 1 : 0,
    description || "", JSON.stringify(parsedColors), JSON.stringify(parsedSizes)
  );

  const insertImage = db.prepare("INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)");
  let order = 0;
  (req.files || []).forEach(f => insertImage.run(id, `/uploads/${f.filename}`, order++));
  safeParseList(imageUrls).forEach(url => insertImage.run(id, url, order++));

  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  res.status(201).json({ product: serializeProduct(row) });
});

// PUT /api/products/:id — admin only. Same fields as POST, all optional;
// uploaded files and imageUrls are appended to the existing image list.
router.put("/:id", requireAuth, requireAdmin, upload.array("images", 6), (req, res) => {
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found." });

  const { name, category, type, price, oldPrice, isNew, description, colors, sizes, imageUrls, removeImageIds } = req.body;

  db.prepare(`
    UPDATE products SET
      name = ?, category = ?, type = ?, price = ?, old_price = ?,
      is_new = ?, description = ?, colors = ?, sizes = ?
    WHERE id = ?
  `).run(
    name ?? existing.name,
    category ?? existing.category,
    type ?? existing.type,
    price ? Math.round(Number(price)) : existing.price,
    oldPrice === "" ? null : (oldPrice ? Math.round(Number(oldPrice)) : existing.old_price),
    isNew === undefined ? existing.is_new : ((isNew === "1" || isNew === "true") ? 1 : 0),
    description ?? existing.description,
    colors ? JSON.stringify(safeParseList(colors)) : existing.colors,
    sizes ? JSON.stringify(safeParseList(sizes)) : existing.sizes,
    req.params.id
  );

  if (removeImageIds){
    const ids = safeParseList(removeImageIds);
    const del = db.prepare("SELECT image_url FROM product_images WHERE id = ? AND product_id = ?");
    ids.forEach(imgId => {
      const img = del.get(imgId, req.params.id);
      if (img && img.image_url.startsWith("/uploads/")){
        const filePath = path.join(__dirname, "..", img.image_url);
        fs.unlink(filePath, () => {});
      }
      db.prepare("DELETE FROM product_images WHERE id = ? AND product_id = ?").run(imgId, req.params.id);
    });
  }

  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM product_images WHERE product_id = ?").get(req.params.id).m;
  const insertImage = db.prepare("INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)");
  let order = maxOrder + 1;
  (req.files || []).forEach(f => insertImage.run(req.params.id, `/uploads/${f.filename}`, order++));
  safeParseList(imageUrls).forEach(url => insertImage.run(req.params.id, url, order++));

  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  res.json({ product: serializeProduct(row) });
});

// DELETE /api/products/:id — admin only. Removes the product, its image
// rows, and any locally-uploaded image files.
router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found." });

  const images = db.prepare("SELECT image_url FROM product_images WHERE product_id = ?").all(req.params.id);
  images.forEach(img => {
    if (img.image_url.startsWith("/uploads/")){
      fs.unlink(path.join(__dirname, "..", img.image_url), () => {});
    }
  });

  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id); // cascades product_images
  res.json({ success: true });
});

function safeParseList(value){
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try{
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  }catch(e){ /* fall through to comma-split */ }
  return String(value).split(",").map(s => s.trim()).filter(Boolean);
}

module.exports = router;
