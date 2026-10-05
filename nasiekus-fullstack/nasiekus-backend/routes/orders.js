// routes/orders.js
const express = require("express");
const db = require("../db/connection");
const { requireAuth, requireAdmin, attachUserIfPresent } = require("../middleware/auth");

const router = express.Router();

function generateOrderNumber(){
  const n = Math.floor(10000 + Math.random() * 89999);
  return `NS-${n}`;
}

function serializeOrder(order){
  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
  return {
    id: order.id,
    orderNumber: order.order_number,
    fullName: order.full_name,
    email: order.email,
    phone: order.phone,
    deliveryAddress: order.delivery_address,
    city: order.city,
    subtotal: order.subtotal,
    deliveryFee: order.delivery_fee,
    discount: order.discount,
    total: order.total,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    orderStatus: order.order_status,
    createdAt: order.created_at,
    items: items.map(i => ({
      productId: i.product_id, name: i.product_name, size: i.size,
      quantity: i.quantity, unitPrice: i.unit_price
    }))
  };
}

// POST /api/orders — create an order (works for guests and logged-in users)
// Body: { fullName, email, phone, deliveryAddress, city, paymentMethod, items:[{productId, size, quantity}] }
router.post("/", attachUserIfPresent, (req, res) => {
  const { fullName, email, phone, deliveryAddress, city, paymentMethod, items } = req.body;

  if (!fullName || !phone || !deliveryAddress || !Array.isArray(items) || items.length === 0){
    return res.status(400).json({ error: "Full name, phone, delivery address, and at least one item are required." });
  }
  if (!["mpesa", "cod"].includes(paymentMethod)){
    return res.status(400).json({ error: "Payment method must be 'mpesa' or 'cod'." });
  }

  const getProduct = db.prepare("SELECT * FROM products WHERE id = ?");
  let subtotal = 0;
  const resolvedItems = [];
  for (const item of items){
    const product = getProduct.get(item.productId);
    if (!product) return res.status(400).json({ error: `Product ${item.productId} not found.` });
    const qty = Math.max(1, Number(item.quantity) || 1);
    subtotal += product.price * qty;
    resolvedItems.push({ productId: product.id, name: product.name, size: item.size || "", quantity: qty, unitPrice: product.price });
  }

  const deliveryFee = (city && city.toLowerCase() !== "nairobi") ? 350 : (subtotal >= 5000 ? 0 : 350);
  const discount = 0;
  const total = subtotal + deliveryFee - discount;
  const orderNumber = generateOrderNumber();

  const insertOrder = db.prepare(`
    INSERT INTO orders (order_number, user_id, full_name, email, phone, delivery_address, city,
                         subtotal, delivery_fee, discount, total, payment_method, payment_status, order_status)
    VALUES (@orderNumber, @userId, @fullName, @email, @phone, @deliveryAddress, @city,
            @subtotal, @deliveryFee, @discount, @total, @paymentMethod, 'pending', 'placed')
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, size, quantity, unit_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const createOrder = db.transaction(() => {
    const result = insertOrder.run({
      orderNumber, userId: req.user ? req.user.id : null, fullName, email: email || null, phone,
      deliveryAddress, city: city || "Nairobi", subtotal, deliveryFee, discount, total, paymentMethod
    });
    const orderId = result.lastInsertRowid;
    resolvedItems.forEach(i => insertItem.run(orderId, i.productId, i.name, i.size, i.quantity, i.unitPrice));
    return orderId;
  });

  const orderId = createOrder();
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  res.status(201).json({ order: serializeOrder(order) });
});

// GET /api/orders/mine — logged-in customer's own orders
router.get("/mine", requireAuth, (req, res) => {
  const orders = db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json({ orders: orders.map(serializeOrder) });
});

// GET /api/orders/track/:orderNumber — public order tracking (no auth, so
// only the minimal status shape is returned, not full customer details)
router.get("/track/:orderNumber", (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(req.params.orderNumber);
  if (!order) return res.status(404).json({ error: "No order found with that number." });
  res.json({
    orderNumber: order.order_number,
    orderStatus: order.order_status,
    paymentStatus: order.payment_status,
    createdAt: order.created_at,
    total: order.total
  });
});

// GET /api/orders/:id — admin only, full order detail
router.get("/:id", requireAuth, requireAdmin, (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found." });
  res.json({ order: serializeOrder(order) });
});

// GET /api/orders — admin only, all orders
router.get("/", requireAuth, requireAdmin, (req, res) => {
  const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  res.json({ orders: orders.map(serializeOrder) });
});

// PUT /api/orders/:id/status — admin only
router.put("/:id/status", requireAuth, requireAdmin, (req, res) => {
  const { orderStatus, paymentStatus } = req.body;
  const existing = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Order not found." });

  db.prepare("UPDATE orders SET order_status = ?, payment_status = ? WHERE id = ?").run(
    orderStatus || existing.order_status,
    paymentStatus || existing.payment_status,
    req.params.id
  );
  const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  res.json({ order: serializeOrder(updated) });
});

module.exports = router;
