// routes/mpesa.js
const express = require("express");
const db = require("../db/connection");
const { stkPush, stkQuery } = require("../utils/mpesa");

const router = express.Router();

// POST /api/mpesa/stkpush — initiate an STK push for an existing order
// Body: { orderId, phone }
router.post("/stkpush", async (req, res) => {
  const { orderId, phone } = req.body;
  if (!orderId || !phone){
    return res.status(400).json({ error: "orderId and phone are required." });
  }

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  if (!order) return res.status(404).json({ error: "Order not found." });
  if (order.payment_status === "paid"){
    return res.status(400).json({ error: "This order has already been paid." });
  }

  try{
    const result = await stkPush({
      phone,
      amount: order.total,
      accountReference: order.order_number,
      description: `NASIEKUS ${order.order_number}`
    });

    if (result.ResponseCode !== "0"){
      return res.status(400).json({ error: result.ResponseDescription || "STK push was not accepted." });
    }

    db.prepare(`
      INSERT INTO mpesa_transactions (order_id, checkout_request_id, merchant_request_id, phone, amount, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(order.id, result.CheckoutRequestID, result.MerchantRequestID, phone, order.total);

    res.json({
      message: "STK push sent — check your phone to complete payment.",
      checkoutRequestId: result.CheckoutRequestID
    });
  }catch(err){
    const detail = err.response?.data?.errorMessage || err.message;
    console.error("STK push failed:", detail);
    res.status(502).json({ error: "Could not reach M-Pesa. " + detail });
  }
});

// POST /api/mpesa/callback — Safaricom calls this URL with the payment result.
// Must be a public HTTPS URL (see MPESA_CALLBACK_URL in .env) — use ngrok in dev.
router.post("/callback", (req, res) => {
  try{
    const body = req.body?.Body?.stkCallback;
    if (!body){
      return res.status(400).json({ ResultCode: 1, ResultDesc: "No callback body received." });
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = body;
    const txn = db.prepare("SELECT * FROM mpesa_transactions WHERE checkout_request_id = ?").get(CheckoutRequestID);
    if (!txn){
      console.warn("Callback received for unknown CheckoutRequestID:", CheckoutRequestID);
      return res.json({ ResultCode: 0, ResultDesc: "Accepted" }); // ack anyway per Daraja spec
    }

    let mpesaReceipt = null;
    if (ResultCode === 0 && CallbackMetadata?.Item){
      const receiptItem = CallbackMetadata.Item.find(i => i.Name === "MpesaReceiptNumber");
      mpesaReceipt = receiptItem ? receiptItem.Value : null;
    }

    const status = ResultCode === 0 ? "success" : "failed";
    db.prepare(`
      UPDATE mpesa_transactions
      SET status = ?, mpesa_receipt_number = ?, result_desc = ?, raw_callback = ?
      WHERE id = ?
    `).run(status, mpesaReceipt, ResultDesc, JSON.stringify(req.body), txn.id);

    if (status === "success"){
      db.prepare("UPDATE orders SET payment_status = 'paid' WHERE id = ?").run(txn.order_id);
    }else{
      db.prepare("UPDATE orders SET payment_status = 'failed' WHERE id = ?").run(txn.order_id);
    }

    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }catch(err){
    console.error("Error processing M-Pesa callback:", err);
    res.status(500).json({ ResultCode: 1, ResultDesc: "Server error" });
  }
});

// GET /api/mpesa/status/:checkoutRequestId — the frontend polls this after
// initiating STK push, so it can show "waiting" / "paid" / "failed".
router.get("/status/:checkoutRequestId", (req, res) => {
  const txn = db.prepare("SELECT * FROM mpesa_transactions WHERE checkout_request_id = ?").get(req.params.checkoutRequestId);
  if (!txn) return res.status(404).json({ error: "Transaction not found." });
  res.json({
    status: txn.status,
    mpesaReceiptNumber: txn.mpesa_receipt_number,
    resultDesc: txn.result_desc
  });
});

// POST /api/mpesa/status/:checkoutRequestId/query — actively ask Safaricom
// for the result (fallback if the callback hasn't arrived yet, e.g. local dev
// without a public callback URL).
router.post("/status/:checkoutRequestId/query", async (req, res) => {
  try{
    const result = await stkQuery(req.params.checkoutRequestId);
    if (result.ResultCode === "0" || result.ResultCode === 0){
      const txn = db.prepare("SELECT * FROM mpesa_transactions WHERE checkout_request_id = ?").get(req.params.checkoutRequestId);
      if (txn && txn.status === "pending"){
        db.prepare("UPDATE mpesa_transactions SET status = 'success', result_desc = ? WHERE id = ?").run(result.ResultDesc, txn.id);
        db.prepare("UPDATE orders SET payment_status = 'paid' WHERE id = ?").run(txn.order_id);
      }
    }
    res.json(result);
  }catch(err){
    const detail = err.response?.data?.errorMessage || err.message;
    res.status(502).json({ error: "Could not query M-Pesa. " + detail });
  }
});

module.exports = router;
