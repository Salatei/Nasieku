# NASIEKU'S STORE — Backend API

Node.js + Express + SQLite backend for the storefront: authentication,
product catalog (with admin upload/delete), orders, and M-Pesa (Daraja)
payments.

## Setup

```bash
cd nasiekus-backend
npm install
cp .env.example .env
```

Open `.env` and fill in:
- `JWT_SECRET` — any long random string (`openssl rand -hex 32`)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — credentials for the seeded admin account
- `MPESA_*` — from your Safaricom Daraja sandbox app (see below)
- `CORS_ORIGIN` — the URL(s) your frontend runs on

Then create the database and load the starter catalog + admin account:

```bash
npm run seed
```

Start the server:

```bash
npm start        # production
npm run dev       # auto-restarts on file changes
```

The API runs at `http://localhost:4000` by default. Check it's alive:

```bash
curl http://localhost:4000/api/health
```

## M-Pesa (Daraja) setup

1. Create an account at https://developer.safaricom.co.ke and make a new app
   under **My Apps** — this gives you a Consumer Key and Consumer Secret.
2. Under the app, enable **Lipa na M-Pesa Sandbox** to get the test shortcode
   (`174379`) and passkey (published on the Daraja "Lipa na M-Pesa Online"
   docs page).
3. Safaricom needs a **public HTTPS URL** to send payment results to
   (`MPESA_CALLBACK_URL`). Your machine's `localhost` isn't reachable from
   the internet, so for local development, tunnel it with
   [ngrok](https://ngrok.com):
   ```bash
   ngrok http 4000
   ```
   Then set `MPESA_CALLBACK_URL=https://<your-ngrok-id>.ngrok-free.app/api/mpesa/callback`
   in `.env` and restart the server.
4. Test numbers and PINs for the sandbox are listed on the Daraja docs —
   the sandbox doesn't move real money.
5. When you're ready to go live: apply for a production shortcode (Paybill
   or Till Number) through Safaricom, switch `MPESA_ENV`/`MPESA_BASE_URL`
   to production, and use your live shortcode/passkey/callback URL.

If the callback can't reach your server (e.g. you haven't set up ngrok yet),
you can still confirm payment manually with:
`POST /api/mpesa/status/:checkoutRequestId/query`, which actively asks
Safaricom for the result instead of waiting for the push notification.

## API reference

All request/response bodies are JSON unless noted. Protected routes need
`Authorization: Bearer <token>`.

### Auth
| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | — | `{ fullName, email, phone, password }` |
| POST | `/api/auth/login` | — | `{ email, password }` |
| GET  | `/api/auth/me` | customer/admin | current user |

### Products
| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/products` | — | query: `category`, `isNew`, `onSale`, `q`, `sort` |
| GET | `/api/products/:id` | — | |
| POST | `/api/products` | admin | multipart/form-data — fields + `images` files + optional `imageUrls` |
| PUT | `/api/products/:id` | admin | same fields, all optional; `removeImageIds` to delete specific images |
| DELETE | `/api/products/:id` | admin | removes product, its images, and uploaded files |

### Orders
| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/api/orders` | optional | create order — works for guests too |
| GET | `/api/orders/mine` | customer | logged-in user's orders |
| GET | `/api/orders/track/:orderNumber` | — | public status lookup |
| GET | `/api/orders` | admin | all orders |
| GET | `/api/orders/:id` | admin | full order detail |
| PUT | `/api/orders/:id/status` | admin | `{ orderStatus, paymentStatus }` |

### M-Pesa
| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/api/mpesa/stkpush` | — | `{ orderId, phone }` — triggers the STK prompt |
| POST | `/api/mpesa/callback` | — | Safaricom calls this; not for the frontend |
| GET | `/api/mpesa/status/:checkoutRequestId` | — | poll after STK push |
| POST | `/api/mpesa/status/:checkoutRequestId/query` | — | actively re-query Safaricom |

### Admin
| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/admin/stats` | admin | dashboard summary numbers |

## Notes

- Database is SQLite (`db/nasiekus.db`), created automatically on first run.
  No separate database server needed.
- Uploaded product images are stored in `/uploads` and served at
  `http://localhost:4000/uploads/<filename>`.
- Passwords are hashed with bcrypt; sessions are stateless JWTs.
- This backend is CORS-restricted to the origins listed in `CORS_ORIGIN`.
  Update that list to match wherever you host the frontend.
