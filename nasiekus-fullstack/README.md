# NASIEKU'S STORE — Full Stack

A complete storefront: static HTML/CSS/JS frontend + a Node.js/Express/SQLite
backend with JWT auth, an admin dashboard, and M-Pesa (Daraja) payments.

```
nasiekus-store/          → frontend (HTML, CSS, JS — open index.html)
nasiekus-backend/         → backend API (Node/Express/SQLite)
```

## Quick start

**1. Start the backend first** (the frontend calls it for everything):

```bash
cd nasiekus-backend
npm install
cp .env.example .env
# edit .env — set JWT_SECRET, ADMIN_EMAIL/PASSWORD, and (optionally) M-Pesa keys
npm run seed      # creates the admin account + loads 18 starter products
npm start         # runs at http://localhost:4000
```

**2. Serve the frontend** — don't just double-click `index.html`; serve it
over HTTP so relative paths and CORS behave normally. From the
`nasiekus-store` folder:

```bash
npx serve .
# or: python3 -m http.server 5500
```

Open whatever URL that prints (e.g. `http://localhost:5500`). If your
frontend runs on a different port than the ones already listed in
`nasiekus-backend/.env`'s `CORS_ORIGIN`, add it there and restart the
backend.

**3. Log in**
- **Customers**: `account.html` → Create Account, or use it to check order
  history after checking out.
- **Admin**: `admin-login.html`, with the `ADMIN_EMAIL` / `ADMIN_PASSWORD`
  you set in `.env`. That takes you to `admin-dashboard.html` — add/edit/
  delete products (with image upload) and manage order status from there.

## How the pieces connect

- `nasiekus-store/js/config.js` holds `API_BASE` — the only place you need
  to change the URL if you deploy the backend somewhere other than
  `localhost:4000`.
- `js/products.js` fetches the live catalog from `/api/products` instead of
  using hardcoded data — every page (`index`, `shop`, `product`, `cart`)
  awaits this before rendering.
- The cart itself still lives in the browser (`localStorage`, via `js/cart.js`)
  until checkout — at that point `checkout.html` sends it to the backend as
  a real order and, for M-Pesa, triggers an STK push and polls for the
  result.
- `account.html` is customer-facing login/register/order-history.
  `admin-login.html` + `admin-dashboard.html` are staff-only and check for
  an admin-role JWT before showing anything.

## Deploying

The frontend is static — host it anywhere (Netlify, Vercel, GitHub Pages, a
plain web server). The backend needs a Node host with persistent disk for
SQLite and `/uploads` (Render, Railway, a VPS, etc.) — serverless platforms
that wipe disk between requests won't keep your database or uploaded images.
Wherever it ends up, update `API_BASE` in `js/config.js`, `CORS_ORIGIN` in
the backend's `.env`, and switch `MPESA_ENV`/`MPESA_BASE_URL` to production
once you have a live Safaricom shortcode.

See `nasiekus-backend/README.md` for the full API reference and M-Pesa
sandbox setup walkthrough.
