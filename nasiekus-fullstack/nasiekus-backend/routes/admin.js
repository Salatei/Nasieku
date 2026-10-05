// routes/admin.js
const express = require("express");
const db = require("../db/connection");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/admin/stats — quick numbers for the dashboard header
router.get("/stats", requireAuth, requireAdmin, (req, res) => {
  const productCount = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
  const orderCount = db.prepare("SELECT COUNT(*) AS n FROM orders").get().n;
  const customerCount = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'").get().n;
  const revenue = db.prepare("SELECT COALESCE(SUM(total),0) AS n FROM orders WHERE payment_status = 'paid'").get().n;
  const pendingOrders = db.prepare("SELECT COUNT(*) AS n FROM orders WHERE order_status IN ('placed','packed','out_for_delivery')").get().n;

  res.json({ productCount, orderCount, customerCount, revenue, pendingOrders });
});

module.exports = router;
