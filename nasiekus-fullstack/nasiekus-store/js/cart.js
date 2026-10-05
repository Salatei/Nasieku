/* ==========================================================================
   NASIEKU'S STORE — cart state
   Persisted to localStorage so it survives across pages and reloads.
   ========================================================================== */

const CART_KEY = "nasiekus_cart_v1";

const Cart = {
  items: [],

  load(){
    try{
      const raw = localStorage.getItem(CART_KEY);
      this.items = raw ? JSON.parse(raw) : [];
    }catch(e){
      this.items = [];
    }
    return this.items;
  },

  save(){
    localStorage.setItem(CART_KEY, JSON.stringify(this.items));
    this.updateBadges();
  },

  add(productId, size, qty = 1){
    const existing = this.items.find(i => i.id === productId && i.size === size);
    if (existing){
      existing.qty += qty;
    } else {
      this.items.push({ id: productId, size: size, qty: qty });
    }
    this.save();
  },

  updateQty(index, qty){
    if (!this.items[index]) return;
    this.items[index].qty = Math.max(1, qty);
    this.save();
  },

  remove(index){
    this.items.splice(index, 1);
    this.save();
  },

  clear(){
    this.items = [];
    this.save();
  },

  count(){
    return this.items.reduce((sum, i) => sum + i.qty, 0);
  },

  subtotal(){
    return this.items.reduce((sum, i) => {
      const p = getProductById(i.id);
      return p ? sum + p.price * i.qty : sum;
    }, 0);
  },

  updateBadges(){
    document.querySelectorAll("[data-cart-count]").forEach(el => {
      const n = this.count();
      el.textContent = n;
      el.style.display = n > 0 ? "flex" : "none";
    });
  }
};

Cart.load();

/* ---- Cart drawer rendering (present on every page) ---------------------- */
function renderCartDrawer(){
  const wrap = document.getElementById("cartItems");
  const foot = document.getElementById("cartFoot");
  if (!wrap) return;

  if (Cart.items.length === 0){
    wrap.innerHTML = `<div class="cart-empty"><p>Your bag is empty.</p></div>`;
    if (foot) foot.style.display = "none";
    return;
  }
  if (foot) foot.style.display = "block";

  wrap.innerHTML = Cart.items.map((item, idx) => {
    const p = getProductById(item.id);
    if (!p) return "";
    return `
      <div class="cart-row">
        <img src="${p.images[0]}" alt="${p.name}">
        <div class="cart-row-info">
          <div class="name">${p.name}</div>
          <div class="meta">Size ${item.size} &middot; ${formatKES(p.price)}</div>
          <div class="qty-stepper">
            <button type="button" aria-label="Decrease quantity" onclick="Cart.updateQty(${idx}, ${item.qty - 1}); renderCartDrawer();">&minus;</button>
            <span>${item.qty}</span>
            <button type="button" aria-label="Increase quantity" onclick="Cart.updateQty(${idx}, ${item.qty + 1}); renderCartDrawer();">+</button>
          </div>
          <button type="button" class="remove-row" onclick="Cart.remove(${idx}); renderCartDrawer();">Remove</button>
        </div>
      </div>`;
  }).join("");

  const subEl = document.getElementById("cartSubtotal");
  if (subEl) subEl.textContent = formatKES(Cart.subtotal());
}

async function openCartDrawer(){
  document.getElementById("cartDrawer")?.classList.add("open");
  document.getElementById("scrim")?.classList.add("show");
  await loadProducts();
  renderCartDrawer();
}
function closeCartDrawer(){
  document.getElementById("cartDrawer")?.classList.remove("open");
  document.getElementById("scrim")?.classList.remove("show");
}

function showToast(message){
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove("show"), 2600);
}

document.addEventListener("DOMContentLoaded", () => {
  Cart.updateBadges();
  document.getElementById("cartToggle")?.addEventListener("click", openCartDrawer);
  document.getElementById("cartClose")?.addEventListener("click", closeCartDrawer);
  document.getElementById("scrim")?.addEventListener("click", () => {
    closeCartDrawer();
    closeSearchPanel();
  });
});
