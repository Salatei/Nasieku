// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { uploadsDir } = require("./paths");

require("./db/connection"); // ensures schema is created before routes load
// Idempotent — creates the admin + starter catalog only when missing.
// A seed failure must not stop the server: better a running API with an
// incomplete catalog than a deploy that dies with "no open ports detected".
try {
  require("./db/seed");
} catch (e){
  console.error("Seed failed — continuing without reseeding:", e);
}

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const mpesaRoutes = require("./routes/mpesa");
const adminRoutes = require("./routes/admin");

const app = express();

// Origins that are always allowed, merged with the CORS_ORIGIN env var so a
// missing/wrong Render setting can never lock out the real frontend again.
const KNOWN_ORIGINS = [
  "https://nasieku-nasiekus-store-loc3.vercel.app",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];
const envOrigins = (process.env.CORS_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
const allowedOrigins = [...new Set([...KNOWN_ORIGINS, ...envOrigins])];

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin/non-browser requests (no Origin header) and anything opening index.html
    // directly from disk (origin "null"), in addition to the configured list.
    if (!origin || origin === "null" || allowedOrigins.includes(origin)){
      return callback(null, true);
    }
    const err = new Error(`Not allowed by CORS — add ${origin} to CORS_ORIGIN`);
    err.status = 403;
    callback(err);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/mpesa", mpesaRoutes);
app.use("/api/admin", adminRoutes);

// Centralised error handler (e.g. multer file-size/type errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Something went wrong." });
});

app.use((req, res) => res.status(404).json({ error: "Not found." }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`NASIEKU'S STORE API running on http://localhost:${PORT} (node ${process.version})`);
});