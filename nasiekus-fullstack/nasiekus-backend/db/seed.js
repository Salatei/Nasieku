// db/seed.js
// Run with: npm run seed
// Creates the admin account (from .env) and loads a starter catalog so the
// storefront isn't empty on first run. Safe to re-run — it skips anything
// that already exists.

require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./connection");

function seedAdmin(){
  const email = (process.env.ADMIN_EMAIL || "simonparsalat@gmail.com").toLowerCase();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing){
    console.log(`Admin account already exists (${email}) — skipping.`);
    return;
  }
  const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "changeme123", 10);
  db.prepare(`
    INSERT INTO users (full_name, email, phone, password_hash, role)
    VALUES (?, ?, ?, ?, 'admin')
  `).run(process.env.ADMIN_NAME || "Store Admin", email, "+254700000000", hash);
  console.log(`Created admin account: ${email}`);
}

const STARTER_PRODUCTS = [
  { id: "cl-001", name: "Camel Bomber Jacket", category: "clothes", type: "Jackets", price: 6800, oldPrice: null, isNew: 1,
    colors: ["#C9A876", "#171310"], sizes: ["XS","S","M","L","XL"],
    desc: "A relaxed, wardrobe-anchoring bomber in brushed camel twill, finished with ribbed cuffs and a hidden interior pocket.",
    images: ["https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=900&auto=format&fit=crop","https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=900&auto=format&fit=crop"] },
  { id: "cl-002", name: "Oatmeal Oversized Hoodie", category: "clothes", type: "Hoodies", price: 3200, oldPrice: null, isNew: 1,
    colors: ["#DCD3C0", "#5B6144"], sizes: ["S","M","L","XL"],
    desc: "Heavyweight French terry hoodie cut for an easy, oversized drape. Garment-washed for a broken-in feel from day one.",
    images: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=900&auto=format&fit=crop","https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=900&auto=format&fit=crop"] },
  { id: "cl-003", name: "Rust Wrap Midi Dress", category: "clothes", type: "Dresses", price: 5400, oldPrice: 6900, isNew: 0,
    colors: ["#A5461E"], sizes: ["XS","S","M","L"],
    desc: "Fluid crepe wrap dress in a warm rust tone, with a self-tie waist and a bias-cut skirt that moves with you.",
    images: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=900&auto=format&fit=crop","https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=900&auto=format&fit=crop"] },
  { id: "cl-004", name: "Ivory Linen Shirt", category: "clothes", type: "Shirts", price: 2600, oldPrice: null, isNew: 0,
    colors: ["#F3EEE2", "#1B170F"], sizes: ["S","M","L","XL"],
    desc: "Breathable washed-linen shirt with a relaxed collar and dropped shoulder seam, made for Nairobi's warm afternoons.",
    images: ["https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=900&auto=format&fit=crop","https://images.unsplash.com/photo-1598033129183-c4f50c736f10?q=80&w=900&auto=format&fit=crop"] },
  { id: "cl-005", name: "Charcoal Tailored Trousers", category: "clothes", type: "Trousers", price: 4100, oldPrice: null, isNew: 0,
    colors: ["#3A362E"], sizes: ["28","30","32","34","36"],
    desc: "A slim, tapered trouser in soft-brushed twill with a clean waistband — dresses up or down with equal ease.",
    images: ["https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=900&auto=format&fit=crop","https://images.unsplash.com/photo-1506629082955-511b1aa562c8?q=80&w=900&auto=format&fit=crop"] },
  { id: "cl-006", name: "Sage Utility Jacket", category: "clothes", type: "Jackets", price: 5900, oldPrice: 7200, isNew: 0,
    colors: ["#5B6144"], sizes: ["S","M","L","XL"],
    desc: "Cotton-canvas utility jacket with four patch pockets and a corozo-button placket, built to soften with wear.",
    images: ["https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=900&auto=format&fit=crop","https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=900&auto=format&fit=crop"] },
  { id: "cl-007", name: "Terracotta Knit Sweater", category: "clothes", type: "Knitwear", price: 3800, oldPrice: null, isNew: 1,
    colors: ["#A5461E", "#C7A06C"], sizes: ["XS","S","M","L"],
    desc: "Soft cotton-blend knit with a ribbed crewneck and dropped hem, spun in a warm terracotta melange.",
    images: ["https://images.unsplash.com/photo-1614251056216-f748f76cd228?q=80&w=900&auto=format&fit=crop","https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=900&auto=format&fit=crop"] },
  { id: "cl-008", name: "Black Tailored Blazer", category: "clothes", type: "Outerwear", price: 7400, oldPrice: null, isNew: 0,
    colors: ["#171310"], sizes: ["XS","S","M","L","XL"],
    desc: "A structured single-breasted blazer with a soft shoulder and full canvas front — the one jacket that does everything.",
    images: ["https://images.unsplash.com/photo-1591369822096-ffd140ec948f?q=80&w=900&auto=format&fit=crop","https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=900&auto=format&fit=crop"] },
  { id: "sh-001", name: "Nude Beige Stiletto Heels", category: "shoes", type: "Heels", price: 4200, oldPrice: null, isNew: 0,
    colors: ["#C7A06C"], sizes: ["36","37","38","39","40"],
    desc: "Pointed-toe stiletto in nude leather with a 90mm heel — the everyday-elegant pair that pairs with anything.",
    images: ["https://images.unsplash.com/photo-1596703263926-eb0762ee17e4?q=80&w=900&auto=format&fit=crop","https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=900&auto=format&fit=crop"] },
  { id: "sh-002", name: "White Leather Sneakers", category: "shoes", type: "Sneakers", price: 3600, oldPrice: null, isNew: 1,
    colors: ["#F3EEE2", "#1B170F"], sizes: ["38","39","40","41","42","43"],
    desc: "Minimal court sneaker in full-grain leather with a cushioned footbed built for all-day wear.",
    images: ["https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=900&auto=format&fit=crop","https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=900&auto=format&fit=crop"] },
  { id: "sh-003", name: "Tan Ankle Boots", category: "shoes", type: "Boots", price: 5200, oldPrice: 6300, isNew: 0,
    colors: ["#C7A06C", "#3A362E"], sizes: ["37","38","39","40","41"],
    desc: "Chelsea-style ankle boot in supple tan leather with an elastic gusset and a stacked block heel.",
    images: ["https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=900&auto=format&fit=crop","https://images.unsplash.com/photo-1520639888713-7851133b1ed0?q=80&w=900&auto=format&fit=crop"] },
  { id: "sh-004", name: "Black Block Heel Sandals", category: "shoes", type: "Sandals", price: 3100, oldPrice: null, isNew: 0,
    colors: ["#171310"], sizes: ["36","37","38","39","40"],
    desc: "A strappy block-heel sandal with a padded footbed, cut low enough for long days on your feet.",
    images: ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=900&auto=format&fit=crop","https://images.unsplash.com/photo-1596703263926-eb0762ee17e4?q=80&w=900&auto=format&fit=crop"] },
  { id: "sh-005", name: "Rust Suede Loafers", category: "shoes", type: "Loafers", price: 3900, oldPrice: null, isNew: 1,
    colors: ["#A5461E"], sizes: ["38","39","40","41","42"],
    desc: "A soft suede penny loafer in a warm rust tone with a flexible leather sole for everyday comfort.",
    images: ["https://images.unsplash.com/photo-1614252369475-531eba835eb1?q=80&w=900&auto=format&fit=crop","https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=900&auto=format&fit=crop"] },
  { id: "sh-006", name: "Olive Canvas High-Tops", category: "shoes", type: "Sneakers", price: 2900, oldPrice: 3500, isNew: 0,
    colors: ["#5B6144"], sizes: ["37","38","39","40","41","42"],
    desc: "Classic canvas high-top in olive twill with a vulcanised rubber sole and a broken-in feel out of the box.",
    images: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=900&auto=format&fit=crop","https://images.unsplash.com/photo-1512374382149-233c42b6a83b?q=80&w=900&auto=format&fit=crop"] },
  { id: "of-001", name: "Denim Jacket, Washed Blue", category: "clothes", type: "Jackets", price: 3400, oldPrice: 4800, isNew: 0,
    colors: ["#4B5E77"], sizes: ["S","M","L","XL"],
    desc: "A wardrobe classic — mid-weight denim jacket, stonewashed for a lived-in finish, cut with a slightly boxy fit.",
    images: ["https://images.unsplash.com/photo-1543076447-215ad9ba6923?q=80&w=900&auto=format&fit=crop","https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=900&auto=format&fit=crop"] },
  { id: "of-002", name: "Cream Knit Cardigan", category: "clothes", type: "Knitwear", price: 2800, oldPrice: 3900, isNew: 0,
    colors: ["#F3EEE2"], sizes: ["XS","S","M","L"],
    desc: "Button-through cardigan in a soft cream knit, light enough to layer over everything in your rotation.",
    images: ["https://images.unsplash.com/photo-1583744946564-b52d01e2ea01?q=80&w=900&auto=format&fit=crop","https://images.unsplash.com/photo-1614251056216-f748f76cd228?q=80&w=900&auto=format&fit=crop"] },
  { id: "of-003", name: "Espadrille Wedge Sandals", category: "shoes", type: "Sandals", price: 2400, oldPrice: 3200, isNew: 0,
    colors: ["#C7A06C"], sizes: ["36","37","38","39","40"],
    desc: "A jute-wrapped wedge sandal with ankle ties, light enough for all-day wear from beach to brunch.",
    images: ["https://images.unsplash.com/photo-1518049362265-d5b2a6467637?q=80&w=900&auto=format&fit=crop","https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=900&auto=format&fit=crop"] },
  { id: "of-004", name: "Straight Leg Denim Jeans", category: "clothes", type: "Trousers", price: 3000, oldPrice: 4100, isNew: 0,
    colors: ["#3A4A63"], sizes: ["28","30","32","34","36"],
    desc: "Rigid-wash straight-leg denim with a mid-rise fit and a slightly cropped hem, built to soften into your shape.",
    images: ["https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=900&auto=format&fit=crop","https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=900&auto=format&fit=crop"] }
];

function seedProducts(){
  const count = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
  if (count > 0){
    console.log(`Products table already has ${count} rows — skipping catalog seed.`);
    return;
  }
  const insertProduct = db.prepare(`
    INSERT INTO products (id, name, category, type, price, old_price, is_new, description, colors, sizes)
    VALUES (@id, @name, @category, @type, @price, @oldPrice, @isNew, @desc, @colors, @sizes)
  `);
  const insertImage = db.prepare(`
    INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)
  `);

  const insertAll = db.transaction((products) => {
    for (const p of products){
      insertProduct.run({
        id: p.id, name: p.name, category: p.category, type: p.type,
        price: p.price, oldPrice: p.oldPrice, isNew: p.isNew, desc: p.desc,
        colors: JSON.stringify(p.colors), sizes: JSON.stringify(p.sizes)
      });
      p.images.forEach((url, i) => insertImage.run(p.id, url, i));
    }
  });
  insertAll(STARTER_PRODUCTS);
  console.log(`Seeded ${STARTER_PRODUCTS.length} starter products.`);
}

seedAdmin();
seedProducts();
console.log("Seed complete.");
