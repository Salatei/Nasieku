/* ==========================================================================
   NASIEKU'S STORE — product catalog (API-backed)
   PRODUCTS starts empty and is filled by loadProducts(), which every page
   awaits before rendering anything that depends on it (grids, cart, etc).
   ========================================================================== */

let PRODUCTS = [];
let _productsLoaded = false;
let _productsPromise = null;

// Fetches the full catalog once per page load and caches it in PRODUCTS.
// Safe to call from multiple places (cart.js, main.js, page scripts) —
// concurrent calls share the same in-flight request.
async function loadProducts(force = false){
  if (_productsLoaded && !force) return PRODUCTS;
  if (_productsPromise && !force) return _productsPromise;

  _productsPromise = (async () => {
    try{
      const res = await fetch(apiUrl("/api/products"));
      if (!res.ok) throw new Error("Failed to load products (" + res.status + ")");
      const data = await res.json();
      PRODUCTS = (data.products || []).map(normalizeProduct);
    }catch(err){
      console.error("Could not reach the store API:", err);
      PRODUCTS = [];
      showApiOfflineNotice();
    }
    _productsLoaded = true;
    return PRODUCTS;
  })();

  return _productsPromise;
}

// The API returns absolute-ish paths for uploaded images ("/uploads/x.jpg")
// and full URLs for external ones (Unsplash) — resolve the former against
// the API host so <img> tags work regardless of where the frontend is served from.
function normalizeProduct(p){
  return {
    ...p,
    images: (p.images || []).map(url => url.startsWith("/") ? apiUrl(url) : url)
  };
}

function getProductById(id){
  return PRODUCTS.find(p => p.id === id);
}

// Fetches a single product directly — used by the product detail page so a
// shared link works even if that item isn't in a cached PRODUCTS list yet.
async function fetchProductById(id){
  try{
    const res = await fetch(apiUrl("/api/products/" + encodeURIComponent(id)));
    if (!res.ok) return null;
    const data = await res.json();
    return normalizeProduct(data.product);
  }catch(err){
    console.error("Could not fetch product:", err);
    return null;
  }
}

function formatKES(amount){
  return "KES " + Number(amount || 0).toLocaleString("en-KE");
}

// A quiet, non-blocking banner for when the API can't be reached at all
// (e.g. the backend isn't running) — so the site fails visibly, not silently.
function showApiOfflineNotice(){
  if (document.getElementById("apiOfflineNotice")) return;
  const bar = document.createElement("div");
  bar.id = "apiOfflineNotice";
  bar.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:300;background:#7E3315;color:#fff;text-align:center;padding:10px 16px;font-size:.82rem;font-family:sans-serif;";
  bar.textContent = "Can't reach the store server — is the backend running at " + API_BASE + "?";
  document.body.appendChild(bar);
}
