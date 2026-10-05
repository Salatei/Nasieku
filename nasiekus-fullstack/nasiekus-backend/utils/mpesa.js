// utils/mpesa.js
// Thin wrapper around Safaricom's Daraja API for Lipa na M-Pesa Online
// (STK Push). Docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate

const axios = require("axios");

function baseUrl(){
  return process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke";
}

// Daraja timestamps are YYYYMMDDHHmmss in the Africa/Nairobi-equivalent
// server time. Using UTC "now" is fine for sandbox testing; for production,
// generate this from EAT if your server isn't already in that timezone.
function timestamp(){
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function password(shortcode, passkey, ts){
  return Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");
}

// Normalises Kenyan numbers (07xx / 01xx / +2547xx / 2547xx) to the
// 2547XXXXXXXX / 2541XXXXXXXX format Daraja expects.
function normalizeMsisdn(phone){
  let p = String(phone).replace(/[^\d]/g, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (p.startsWith("254") && p.length === 12) return p;
  if (p.startsWith("7") || p.startsWith("1")) return "254" + p;
  return p;
}

async function getAccessToken(){
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");

  const { data } = await axios.get(
    `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  return data.access_token;
}

// Initiates an STK Push prompt on the customer's phone for `amount` KES.
// `accountReference` and `description` show up on the customer's prompt/receipt.
async function stkPush({ phone, amount, accountReference, description }){
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const ts = timestamp();
  const token = await getAccessToken();
  const msisdn = normalizeMsisdn(phone);

  const payload = {
    BusinessShortCode: shortcode,
    Password: password(shortcode, passkey, ts),
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(amount),
    PartyA: msisdn,
    PartyB: shortcode,
    PhoneNumber: msisdn,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: (accountReference || "NASIEKUS").slice(0, 12),
    TransactionDesc: (description || "Order payment").slice(0, 13)
  };

  const { data } = await axios.post(
    `${baseUrl()}/mpesa/stkpush/v1/processrequest`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data; // { MerchantRequestID, CheckoutRequestID, ResponseCode, ... }
}

// Optional: actively query the result instead of waiting for the callback
// (useful as a fallback if the callback is delayed or unreachable in dev).
async function stkQuery(checkoutRequestId){
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const ts = timestamp();
  const token = await getAccessToken();

  const payload = {
    BusinessShortCode: shortcode,
    Password: password(shortcode, passkey, ts),
    Timestamp: ts,
    CheckoutRequestID: checkoutRequestId
  };

  const { data } = await axios.post(
    `${baseUrl()}/mpesa/stkpushquery/v1/query`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

module.exports = { getAccessToken, stkPush, stkQuery, normalizeMsisdn };
