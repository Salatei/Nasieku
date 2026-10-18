/* ==========================================================================
   NASIEKU'S STORE — shared UI behaviour
   ========================================================================== */

/* ---- Mobile nav ----------------------------------------------------------*/
function initMobileNav(){
  const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("mainNav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.classList.toggle("open", open);
    document.getElementById("scrim")?.classList.toggle("show", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.getElementById("scrim")?.addEventListener("click", () => {
    nav.classList.remove("open");
    toggle.classList.remove("open");
  });
}

/* ---- Search panel ----------------------------------------------------------*/
function openSearchPanel(){
  document.getElementById("searchPanel")?.classList.add("open");
  document.getElementById("scrim")?.classList.add("show");
  setTimeout(() => document.getElementById("searchInput")?.focus(), 200);
}
function closeSearchPanel(){
  document.getElementById("searchPanel")?.classList.remove("open");
  document.getElementById("scrim")?.classList.remove("show");
}
function initSearch(){
  document.getElementById("searchToggle")?.addEventListener("click", openSearchPanel);
  document.getElementById("searchClose")?.addEventListener("click", closeSearchPanel);
  document.getElementById("searchForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("searchInput").value.trim();
    if (q) window.location.href = "shop.html?q=" + encodeURIComponent(q);
  });
}

/* ---- Product card rendering (used on home + shop) -------------------------*/
function productCardHTML(p){
  const tags = [];
  if (p.isNew) tags.push(`<span class="tag tag-new">New</span>`);
  if (p.oldPrice) tags.push(`<span class="tag tag-sale">Sale</span>`);
  const priceHTML = p.oldPrice
    ? `<span class="price-old">${formatKES(p.oldPrice)}</span><span class="price-new">${formatKES(p.price)}</span>`
    : `<span>${formatKES(p.price)}</span>`;
  const altImg = p.images[1] || p.images[0];
  const swatches = (p.colors || []).map(c => `<span class="swatch" style="background:${c}"></span>`).join("");

  return `
  <article class="product-card">
    <a href="product.html?id=${p.id}" class="product-media">
      <div class="product-tags">${tags.join("")}</div>
      <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
      <img class="img-alt" src="${altImg}" alt="" loading="lazy">
    </a>
    <button type="button" class="quick-add" onclick="quickAdd('${p.id}')">Quick add</button>
    <a href="product.html?id=${p.id}" class="product-info">
      <div class="name">${p.name}</div>
      <div class="cat">${p.type}</div>
      <div class="price-row">${priceHTML}</div>
      <div class="swatches">${swatches}</div>
    </a>
  </article>`;
}

function quickAdd(id){
  const p = getProductById(id);
  if (!p) return;
  Cart.add(id, p.sizes[Math.floor(p.sizes.length / 2)], 1);
  showToast(`${p.name} added to your bag`);
  renderCartDrawer();
}

function renderProducts(containerId, list){
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!list.length){
    el.innerHTML = `<div class="empty-state">No products match your filters yet. Try clearing a filter.</div>`;
    return;
  }
  el.innerHTML = list.map(productCardHTML).join("");
}

/* ---- Newsletter + generic form success states -----------------------------*/
function initNewsletterForm(){
  const form = document.getElementById("newsletterForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const note = document.getElementById("newsletterNote");
    const email = form.querySelector("input[type=email]").value;
    if (note) note.textContent = `Thanks — a confirmation is on its way to ${email}.`;
    form.reset();
  });
}

function initContactForm(){
  const form = document.getElementById("contactForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    showToast("Message sent — we'll reply within one business day.");
    form.reset();
  });
}

/* ---- FAQ accordion ---------------------------------------------------------*/
function initFAQ(){
  document.querySelectorAll(".faq-item").forEach(item => {
    item.querySelector(".faq-q")?.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach(i => i !== item && i.classList.remove("open"));
      item.classList.toggle("open", !isOpen);
    });
  });
}

/* ---- Order tracking (GET /api/orders/track/:orderNumber) -------------------*/
function renderTrackResult(order){
  const numEl = document.getElementById("trackOrderNumber");
  const noteEl = document.getElementById("trackPaymentNote");
  const stepsEl = document.getElementById("trackSteps");
  if (numEl) numEl.textContent = "Order " + order.orderNumber;
  if (noteEl) noteEl.textContent = "Payment " + (order.paymentStatus || "pending") + " · " + formatKES(order.total);
  if (!stepsEl) return;

  const steps = [
    { key: "placed", label: "Order Placed" },
    { key: "packed", label: "Packed" },
    { key: "out_for_delivery", label: "Out for Delivery" },
    { key: "delivered", label: "Delivered" }
  ];
  const idx = steps.findIndex(s => s.key === order.orderStatus);
  const cancelled = idx === -1;
  const visible = cancelled ? steps.slice(0, 1) : steps;
  stepsEl.innerHTML = visible.map((s, i) => {
    const done = (!cancelled && i <= idx) || (cancelled && i === 0);
    return `<div class="track-step${done ? " done" : ""}"><div class="dot"></div>${s.label}</div>`;
  }).join("") + (cancelled ? `<div class="track-step"><div class="dot"></div>Cancelled</div>` : "");
}

function initTrackOrder(){
  const form = document.getElementById("trackForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("trackOrderInput");
    const msg = document.getElementById("trackMessage");
    const result = document.getElementById("trackResult");
    const orderNumber = (input && input.value ? input.value : "").trim().toUpperCase();
    if (!orderNumber) return;

    if (msg) msg.textContent = "Checking order status…";
    try{
      const res = await fetch(apiUrl("/api/orders/track/" + encodeURIComponent(orderNumber)));
      const data = await res.json();
      if (!res.ok){
        result?.classList.remove("show");
        if (msg) msg.textContent = data.error || "Order not found.";
        return;
      }
      if (msg) msg.textContent = "";
      renderTrackResult(data);
      result?.classList.add("show");
      result?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }catch(err){
      result?.classList.remove("show");
      if (msg) msg.textContent = "Can't reach the store server — is the backend running at " + API_BASE + "?";
    }
  });
}

/* ---- Footer year ------------------------------------------------------------*/
function initFooterYear(){
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
}

document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  initSearch();
  initNewsletterForm();
  initContactForm();
  initFAQ();
  initTrackOrder();
  initFooterYear();
});
