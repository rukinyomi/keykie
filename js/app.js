(function () {
  "use strict";

  const products = window.KEYKIE_PRODUCTS || [];
  const couriers = window.KEYKIE_COURIERS || [];
  const storage = window.KEYKIE_STORAGE;
  const whatsappAdmin = "6285290191226";
  const qrisAssetCandidates = [
    "assets/qris.png",
    "assets/qris.jpg",
    "assets/qris.jpeg",
    "assets/qris.webp",
    "assets/QRIS.png",
    "assets/QRIS.jpg",
    "assets/qr.png"
  ];
  const state = {
    cart: storage.read("keykie-cart", []),
    orders: storage.read("keykie-orders", []),
    voucher: storage.read("keykie-voucher", ""),
    category: "Semua",
    orderFilter: "all"
  };
  const categories = ["Semua", ...new Set(products.map((product) => product.category))];
  const rupiah = (amount) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
  const escapeHtml = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const byId = (id) => document.getElementById(id);
  const persist = () => {
    const saved = storage.write("keykie-cart", state.cart) &&
      storage.write("keykie-orders", state.orders) &&
      storage.write("keykie-voucher", state.voucher);
    if (!saved) showToast("Penyimpanan browser tidak tersedia. Perubahan mungkin tidak tersimpan.", "error");
  };
  const showToast = (message, type) => {
    const container = byId("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast-message rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${type === "error" ? "bg-red-600" : "bg-gray-900"} text-white`;
    toast.setAttribute("role", "status");
    toast.textContent = message;
    container.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3200);
  };
  const productById = (id) => products.find((product) => product.id === id);
  const cartCount = () => state.cart.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = () => state.cart.reduce((total, item) => {
    const product = productById(item.id);
    return total + (product ? product.price * item.quantity : 0);
  }, 0);
  const discountAmount = () => state.voucher === "KEYKIEBARU" ? Math.round(cartSubtotal() * 0.1) : 0;
  const selectedCourier = () => couriers.find((courier) => courier.id === document.querySelector('input[name="courier"]:checked')?.value) || couriers[0];

  function renderBadges() {
    document.querySelectorAll(".cart-count-badge").forEach((badge) => {
      badge.textContent = String(cartCount());
      badge.classList.toggle("hidden", cartCount() === 0);
    });
  }

  function productCard(product) {
    return `<article class="product-card card-soft rounded-3xl overflow-hidden flex flex-col">
      <button type="button" class="text-left" data-action="product-detail" data-id="${escapeHtml(product.id)}" aria-label="Lihat detail ${escapeHtml(product.name)}">
        <div class="h-48 ${escapeHtml(product.color)} flex items-center justify-center overflow-hidden">
          ${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="w-full h-full object-cover" loading="lazy" onerror="this.remove()">` : ""}
          <span class="text-7xl" aria-hidden="true">${escapeHtml(product.emoji)}</span>
        </div>
        <div class="p-4 pb-2">
          <div class="flex justify-between gap-2 items-start"><h3 class="font-bold text-gray-900">${escapeHtml(product.name)}</h3><span class="text-xs text-amber-500 font-bold">★ ${product.rating.toFixed(1)}</span></div>
          <p class="text-xs text-gray-500 mt-1">${escapeHtml(product.category)} · ${product.sold} terjual</p>
        </div>
      </button>
      <div class="px-4 pb-4 mt-auto flex items-center justify-between gap-2">
        <span class="font-extrabold text-pink-600">${rupiah(product.price)}</span>
        <button type="button" data-action="add-cart" data-id="${escapeHtml(product.id)}" class="btn-primary-keykie rounded-xl px-3 py-2 text-xs font-bold" aria-label="Tambah ${escapeHtml(product.name)} ke keranjang"><i class="ph-bold ph-plus"></i> Keranjang</button>
      </div>
    </article>`;
  }

  function filteredProducts() {
    const query = (byId("catalog-search")?.value || "").trim().toLowerCase();
    const sort = byId("catalog-sort")?.value || "popular";
    const list = products.filter((product) => {
      const matchesCategory = state.category === "Semua" || product.category === state.category;
      const matchesQuery = `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
    list.sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      return b.sold - a.sold;
    });
    return list;
  }

  function renderCatalog() {
    const categoryContainer = byId("catalog-categories");
    if (categoryContainer) categoryContainer.innerHTML = categories.map((category) =>
      `<button type="button" data-action="category" data-category="${escapeHtml(category)}" class="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border ${state.category === category ? "bg-pink-500 text-white border-pink-500" : "bg-white text-gray-600 border-gray-200 hover:bg-pink-50"}">${escapeHtml(category)}</button>`
    ).join("");
    const list = filteredProducts();
    const grid = byId("catalog-products-grid");
    if (grid) grid.innerHTML = list.length ? list.map(productCard).join("") : `<div class="col-span-full text-center card-soft rounded-2xl p-8 text-sm text-gray-500">Produk tidak ditemukan. Coba kata kunci lain.</div>`;
    const count = byId("catalog-product-count");
    if (count) count.textContent = `Menampilkan ${list.length} dari ${products.length} produk`;
    const featured = byId("featured-products-grid");
    if (featured) featured.innerHTML = [...products].sort((a, b) => b.sold - a.sold).slice(0, 4).map(productCard).join("");
  }

  function renderCart() {
    const empty = state.cart.length === 0;
    byId("cart-empty-state")?.classList.toggle("hidden", !empty);
    byId("cart-content-section")?.classList.toggle("hidden", empty);
    const items = byId("cart-items-container");
    if (items) items.innerHTML = state.cart.map((item) => {
      const product = productById(item.id);
      if (!product) return "";
      return `<article class="card-soft rounded-2xl p-4 flex gap-4 items-center">
        <div class="w-16 h-16 shrink-0 rounded-xl ${escapeHtml(product.color)} flex items-center justify-center text-3xl">${escapeHtml(product.emoji)}</div>
        <div class="min-w-0 flex-1"><h3 class="font-bold text-sm text-gray-900">${escapeHtml(product.name)}</h3><p class="text-xs text-pink-600 font-semibold mt-1">${rupiah(product.price)}</p>
          <div class="flex items-center gap-2 mt-2"><button type="button" data-action="quantity" data-id="${escapeHtml(product.id)}" data-delta="-1" class="w-7 h-7 rounded-lg border border-gray-200" aria-label="Kurangi jumlah">−</button><span class="text-xs font-bold">${item.quantity}</span><button type="button" data-action="quantity" data-id="${escapeHtml(product.id)}" data-delta="1" class="w-7 h-7 rounded-lg border border-gray-200" aria-label="Tambah jumlah">+</button></div>
        </div>
        <div class="text-right"><p class="font-bold text-sm">${rupiah(product.price * item.quantity)}</p><button type="button" data-action="remove-cart" data-id="${escapeHtml(product.id)}" class="text-xs text-red-500 mt-2 hover:underline">Hapus</button></div>
      </article>`;
    }).join("");
    byId("cart-subtotal").textContent = rupiah(cartSubtotal());
    byId("cart-total").textContent = rupiah(cartSubtotal() - discountAmount());
    byId("cart-discount-row").classList.toggle("hidden", discountAmount() === 0);
    byId("cart-discount-amount").textContent = `-${rupiah(discountAmount())}`;
    byId("cart-voucher-badge").innerHTML = state.voucher
      ? `<p class="text-xs text-emerald-600 font-semibold mt-2">Voucher ${escapeHtml(state.voucher)} berhasil digunakan.</p>` : "";
    if (byId("voucher-input") && state.voucher) byId("voucher-input").value = state.voucher;
    renderBadges();
    renderCheckoutSummary();
  }

  function renderCouriers() {
    const container = byId("courier-options-container");
    if (!container) return;
    container.innerHTML = couriers.map((courier, index) => `<label class="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-white cursor-pointer hover:border-pink-300">
      <span class="flex items-center gap-3"><input type="radio" name="courier" value="${escapeHtml(courier.id)}" ${index === 0 ? "checked" : ""}><span><span class="block text-xs font-bold text-gray-800">${escapeHtml(courier.name)}</span><span class="block text-[11px] text-gray-500">${escapeHtml(courier.detail)}</span></span></span>
      <span class="text-xs font-bold text-gray-700">${rupiah(courier.price)}</span>
    </label>`).join("");
  }

  function renderCheckoutSummary() {
    const miniItems = byId("checkout-mini-items");
    if (miniItems) miniItems.innerHTML = state.cart.length
      ? state.cart.map((item) => {
        const product = productById(item.id);
        return product ? `<div class="flex justify-between gap-3 text-xs"><span>${escapeHtml(product.name)} × ${item.quantity}</span><span class="font-semibold">${rupiah(product.price * item.quantity)}</span></div>` : "";
      }).join("")
      : `<p class="text-xs text-gray-500">Keranjang masih kosong. <a href="#katalog" data-nav-target="katalog" class="text-pink-600 underline">Pilih produk</a></p>`;
    const courier = selectedCourier();
    const shipping = state.voucher === "GRATISONGKIR" ? 0 : (courier?.price || 0);
    byId("checkout-subtotal").textContent = rupiah(cartSubtotal());
    byId("checkout-discount").textContent = `-${rupiah(discountAmount())}`;
    byId("checkout-discount-row").classList.toggle("hidden", discountAmount() === 0);
    byId("checkout-shipping").textContent = rupiah(shipping);
    byId("checkout-total").textContent = rupiah(Math.max(0, cartSubtotal() - discountAmount()) + shipping);
  }

  function renderOrders() {
    const filtered = state.orderFilter === "all" ? state.orders : state.orders.filter((order) => order.status === state.orderFilter);
    const empty = byId("orders-empty-state");
    const list = byId("orders-list-container");
    empty?.classList.toggle("hidden", filtered.length > 0);
    if (list) list.innerHTML = filtered.map((order) => `<article class="card-soft rounded-2xl p-5 mb-4">
      <div class="flex flex-wrap items-start justify-between gap-3"><div><p class="text-xs text-gray-500">Nomor pesanan</p><h3 class="font-extrabold text-gray-900">${escapeHtml(order.id)}</h3><p class="text-xs text-gray-500 mt-1">${new Date(order.createdAt).toLocaleString("id-ID")}</p></div>
        <span class="rounded-full px-3 py-1 text-xs font-bold ${order.status === "unpaid" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}">${order.status === "unpaid" ? "Menunggu pembayaran" : "Diproses"}</span></div>
      <div class="border-t border-gray-100 mt-4 pt-3 flex justify-between text-sm"><span>Total pesanan</span><strong class="text-pink-600">${rupiah(order.total)}</strong></div>
      <p class="text-xs text-gray-500 mt-2">${order.items.map((item) => `${escapeHtml(productById(item.id)?.name || "Produk")} × ${item.quantity}`).join(" · ")}</p>
      <div class="flex flex-wrap gap-2 mt-4"><button type="button" data-action="payment" data-id="${escapeHtml(order.id)}" class="btn-primary-keykie px-4 py-2 rounded-xl text-xs font-bold">Instruksi QRIS</button><button type="button" data-action="tracking" data-id="${escapeHtml(order.id)}" class="px-4 py-2 rounded-xl bg-pink-50 text-pink-700 text-xs font-bold">Lacak pesanan</button><button type="button" data-action="invoice" data-id="${escapeHtml(order.id)}" class="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold">Lihat invoice</button></div>
    </article>`).join("");
    document.querySelectorAll("[data-order-filter]").forEach((button) => {
      const active = button.dataset.orderFilter === state.orderFilter;
      button.classList.toggle("bg-pink-500", active);
      button.classList.toggle("text-white", active);
      button.classList.toggle("border-pink-500", active);
      button.classList.toggle("bg-white", !active);
      button.classList.toggle("text-gray-600", !active);
    });
  }

  const faqs = [
    ["Berapa lama proses pembuatan pesanan?", "Produk ready stock diproses dalam 1–2 hari kerja. Produk custom dapat memerlukan waktu lebih lama."],
    ["Bagaimana cara membayar dengan QRIS?", "Toko ini belum terhubung dengan penyedia QRIS. Pesanan dan instruksi yang tampil hanya simulasi dan bukan permintaan pembayaran sungguhan."],
    ["Apakah bisa meminta warna atau inisial khusus?", "Bisa. Pilih produk Inisial Custom dan tuliskan detail request pada catatan saat checkout."],
    ["Bagaimana cara merawat gantungan rajut?", "Cuci tangan dengan sabun lembut bila perlu, jangan diperas, lalu angin-anginkan di tempat teduh."]
  ];

  function renderFaq() {
    const container = byId("faq-accordion");
    if (container) container.innerHTML = faqs.map(([question, answer], index) => `<details class="card-soft rounded-2xl p-4 mb-3"><summary class="cursor-pointer font-bold text-sm text-gray-800">${escapeHtml(question)}</summary><p class="text-xs leading-relaxed text-gray-600 mt-3">${escapeHtml(answer)}</p></details>`).join("");
  }

  function navigate(view) {
    const validViews = ["home", "katalog", "keranjang", "pembayaran", "pesanan", "about", "contact"];
    const target = validViews.includes(view) ? view : "home";
    document.querySelectorAll(".view-section").forEach((section) => section.classList.toggle("hidden", section.id !== `view-${target}`));
    document.querySelectorAll("[data-nav-target]").forEach((link) => {
      const active = link.dataset.navTarget === target;
      link.classList.toggle("bg-pink-100", active);
      link.classList.toggle("text-pink-700", active);
      if (link.closest("#mobile-menu")) link.classList.toggle("bg-pink-50", active);
    });
    byId("mobile-menu")?.classList.add("hidden");
    if (target === "keranjang") renderCart();
    if (target === "pembayaran") renderCheckoutSummary();
    if (target === "pesanan") renderOrders();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showModal(id, content) {
    const modal = byId(id);
    if (!modal) return;
    modal.innerHTML = `<div class="modal-card card-soft rounded-3xl p-6 relative" role="dialog" aria-modal="true">${content}</div>`;
    modal.classList.remove("hidden");
    const close = modal.querySelector("[data-action='close-modal']");
    close?.focus();
  }

  function openProduct(id) {
    const product = productById(id);
    if (!product) return;
    showModal("product-detail-modal", `<div class="flex justify-end"><button type="button" class="modal-close" data-action="close-modal" aria-label="Tutup">×</button></div>
      <div class="text-center"><div class="w-32 h-32 mx-auto rounded-3xl ${escapeHtml(product.color)} flex items-center justify-center text-7xl">${escapeHtml(product.emoji)}</div>
      <p class="text-xs text-pink-600 font-bold mt-4">${escapeHtml(product.category)} · ★ ${product.rating.toFixed(1)}</p><h2 class="text-2xl font-extrabold mt-1">${escapeHtml(product.name)}</h2>
      <p class="text-sm text-gray-600 mt-3">${escapeHtml(product.description)}</p><p class="text-xl font-black text-pink-600 mt-4">${rupiah(product.price)}</p>
      <button type="button" data-action="add-cart" data-id="${escapeHtml(product.id)}" class="btn-primary-keykie mt-5 w-full rounded-xl py-3 font-bold">Tambah ke Keranjang</button></div>`);
  }

  function addToCart(id) {
    if (!productById(id)) return;
    const item = state.cart.find((entry) => entry.id === id);
    if (item) item.quantity += 1;
    else state.cart.push({ id, quantity: 1 });
    persist();
    renderCart();
    showToast("Produk ditambahkan ke keranjang.");
  }

  function updateQuantity(id, delta) {
    const item = state.cart.find((entry) => entry.id === id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) state.cart = state.cart.filter((entry) => entry.id !== id);
    persist();
    renderCart();
  }

  function applyVoucherCode() {
    const code = (byId("voucher-input")?.value || "").trim().toUpperCase();
    if (code === "KEYKIEBARU" || code === "GRATISONGKIR") {
      state.voucher = code;
      persist();
      renderCart();
      showToast(code === "KEYKIEBARU" ? "Voucher diskon 10% berhasil digunakan." : "Voucher gratis ongkir aktif di simulasi.");
      return;
    }
    state.voucher = "";
    persist();
    renderCart();
    showToast("Kode voucher tidak dikenal. Coba KEYKIEBARU atau GRATISONGKIR.", "error");
  }

  function setOrderFilter(filter) {
    state.orderFilter = filter;
    renderOrders();
  }

  function findOrder(id) {
    return state.orders.find((order) => order.id === id);
  }

  function openPayment(order) {
    showModal("qris-modal", `<div class="flex justify-between items-center"><h2 class="text-xl font-extrabold">Pembayaran QRIS</h2><button type="button" class="modal-close" data-action="close-modal" aria-label="Tutup">×</button></div>
      <div class="text-center py-4"><p class="font-bold">${escapeHtml(order.id)}</p><p class="text-2xl font-black text-pink-600 mt-1">${rupiah(order.total)}</p>
        <p class="text-xs text-gray-500 mt-1">Scan QRIS, lalu masukkan nominal pembayaran di atas.</p>
        <div class="mx-auto mt-4 w-full max-w-xs min-h-64 rounded-2xl border border-pink-100 bg-white p-3 flex items-center justify-center">
          <img id="qris-payment-image" alt="QRIS pembayaran KEYKIE" class="hidden max-h-80 w-full object-contain">
          <p id="qris-image-unavailable" class="hidden text-sm leading-relaxed text-gray-600">Gambar QRIS belum ditemukan. Letakkan gambar QRIS merchant di <code class="font-bold text-pink-700">assets/qris.png</code>, lalu muat ulang halaman.</p>
        </div>
      </div>
      <div class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Pembayaran tidak terverifikasi otomatis. Setelah membayar, kirim konfirmasi dan lampirkan bukti pembayaran melalui WhatsApp admin.</div>
      <button type="button" data-action="confirm-payment" data-order-id="${escapeHtml(order.id)}" class="btn-primary-keykie mt-4 w-full rounded-xl py-3 font-bold">Konfirmasi via WhatsApp</button>`);
    const image = byId("qris-payment-image");
    const unavailable = byId("qris-image-unavailable");
    let candidateIndex = 0;
    image.onload = () => {
      image.classList.remove("hidden");
      unavailable.classList.add("hidden");
      const confirmButton = document.querySelector("[data-action='confirm-payment']");
      if (confirmButton) confirmButton.dataset.qrisReady = "true";
    };
    image.onerror = () => {
      candidateIndex += 1;
      if (candidateIndex < qrisAssetCandidates.length) {
        image.src = qrisAssetCandidates[candidateIndex];
        return;
      }
      image.classList.add("hidden");
      unavailable.classList.remove("hidden");
      const confirmButton = document.querySelector("[data-action='confirm-payment']");
      if (confirmButton) {
        confirmButton.dataset.qrisReady = "false";
        confirmButton.textContent = "Minta QRIS via WhatsApp";
      }
    };
    image.src = qrisAssetCandidates[candidateIndex];
  }

  function confirmPaymentViaWhatsApp(orderId, qrisReady) {
    const order = findOrder(orderId);
    if (!order) {
      showToast("Pesanan tidak ditemukan. Silakan buka ulang halaman Pesanan Saya.", "error");
      return;
    }
    const message = qrisReady
      ? `Halo Admin KEYKIE, saya ingin konfirmasi pembayaran QRIS untuk pesanan ${order.id}. Total: ${rupiah(order.total)}. Produk: ${order.items.map((item) => `${productById(item.id)?.name || "Produk"} x${item.quantity}`).join(", ")}. Saya akan melampirkan bukti pembayaran di chat ini.`
      : `Halo Admin KEYKIE, saya ingin membayar pesanan ${order.id} sebesar ${rupiah(order.total)}. Mohon kirimkan QRIS merchant untuk pembayaran.`;
    window.open(`https://wa.me/${whatsappAdmin}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  function openTracking(order) {
    showModal("tracking-modal", `<div class="flex justify-between items-center"><h2 class="text-xl font-extrabold">Status Pesanan</h2><button type="button" class="modal-close" data-action="close-modal" aria-label="Tutup">×</button></div>
      <p class="text-sm text-gray-500 mt-2">${escapeHtml(order.id)}</p><div class="mt-5 rounded-2xl bg-pink-50 p-4"><p class="font-bold text-pink-700">${order.status === "unpaid" ? "Menunggu pembayaran (simulasi)" : "Pesanan diproses"}</p><p class="text-xs text-gray-600 mt-2">${escapeHtml(order.courier.name)} · Nomor resi belum tersedia.</p></div>
      <p class="text-xs text-gray-500 mt-4">Status pengiriman otomatis memerlukan integrasi layanan toko dan kurir.</p>`);
  }

  function openInvoice(order) {
    const orderItems = order.items.map((item) => {
      const product = productById(item.id);
      return product ? `<div class="flex justify-between gap-3 py-2 border-b border-gray-100 text-sm"><span>${escapeHtml(product.name)} × ${item.quantity}</span><span>${rupiah(product.price * item.quantity)}</span></div>` : "";
    }).join("");
    showModal("invoice-modal", `<div class="flex justify-between items-center"><h2 class="text-xl font-extrabold">Invoice KEYKIE</h2><button type="button" class="modal-close" data-action="close-modal" aria-label="Tutup">×</button></div>
      <p class="text-xs text-gray-500 mt-2">${escapeHtml(order.id)} · ${new Date(order.createdAt).toLocaleString("id-ID")}</p>
      <div class="mt-5"><p class="font-bold">${escapeHtml(order.customer.name)}</p><p class="text-xs text-gray-600">${escapeHtml(order.customer.address)}, ${escapeHtml(order.customer.city)}</p></div>
      <div class="mt-4">${orderItems}</div><div class="flex justify-between font-extrabold mt-4 text-pink-600"><span>Total</span><span>${rupiah(order.total)}</span></div>
      <button type="button" data-action="print-invoice" class="btn-primary-keykie mt-5 w-full rounded-xl py-3 font-bold">Cetak Invoice</button>`);
  }

  function submitCheckout(event) {
    event.preventDefault();
    if (!state.cart.length) {
      showToast("Keranjang masih kosong. Tambahkan produk terlebih dahulu.", "error");
      navigate("keranjang");
      return;
    }
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const courier = selectedCourier();
    if (!courier) {
      showToast("Pilih ekspedisi terlebih dahulu.", "error");
      return;
    }
    const subtotal = cartSubtotal();
    const order = {
      id: `KK${Date.now().toString().slice(-8)}`,
      createdAt: new Date().toISOString(),
      status: "unpaid",
      items: state.cart.map((item) => ({ ...item })),
      subtotal,
      discount: discountAmount(),
      courier,
      total: Math.max(0, subtotal - discountAmount()) + (state.voucher === "GRATISONGKIR" ? 0 : courier.price),
      customer: {
        name: byId("checkout-name").value.trim(),
        phone: byId("checkout-phone").value.trim(),
        address: byId("checkout-address").value.trim(),
        city: byId("checkout-city").value.trim(),
        postal: byId("checkout-postal").value.trim(),
        notes: byId("checkout-notes").value.trim()
      }
    };
    state.orders.unshift(order);
    state.cart = [];
    state.voucher = "";
    persist();
    renderCart();
    renderOrders();
    openPayment(order);
  }

  function contactMessage() {
    const name = byId("contact-name")?.value.trim();
    const contact = byId("contact-email")?.value.trim();
    const message = byId("contact-message")?.value.trim();
    return `Halo Admin KEYKIE, saya ${name || ""}${contact ? ` (${contact})` : ""}. ${message || "Saya ingin bertanya mengenai produk KEYKIE."}`;
  }

  function handleContactFormSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const url = `https://wa.me/${whatsappAdmin}?text=${encodeURIComponent(contactMessage())}`;
    window.open(url, "_blank", "noopener,noreferrer");
    showToast("Pesan disiapkan untuk dikirim melalui WhatsApp.");
  }

  function sendContactViaWhatsApp() {
    if (!byId("contact-name").value.trim() || !byId("contact-email").value.trim() || !byId("contact-message").value.trim()) {
      byId("contact-name").focus();
      showToast("Isi nama, kontak, dan pesan terlebih dahulu.", "error");
      return;
    }
    window.open(`https://wa.me/${whatsappAdmin}?text=${encodeURIComponent(contactMessage())}`, "_blank", "noopener,noreferrer");
  }

  document.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-nav-target]");
    if (nav) {
      event.preventDefault();
      const target = nav.dataset.navTarget;
      if (window.location.hash !== `#${target}`) history.pushState({ view: target }, "", `#${target}`);
      navigate(target);
      return;
    }
    const button = event.target.closest("[data-action]");
    if (!button) {
      const modal = event.target.closest("#product-detail-modal, #qris-modal, #tracking-modal, #invoice-modal");
      if (modal && event.target === modal) modal.classList.add("hidden");
      return;
    }
    const { action, id } = button.dataset;
    if (action === "close-modal") {
      button.closest("#product-detail-modal, #qris-modal, #tracking-modal, #invoice-modal")?.classList.add("hidden");
    } else if (action === "add-cart") {
      addToCart(id);
      if (!button.closest("#product-detail-modal")) return;
      byId("product-detail-modal").classList.add("hidden");
    } else if (action === "product-detail") openProduct(id);
    else if (action === "category") {
      state.category = button.dataset.category;
      renderCatalog();
    } else if (action === "quantity") updateQuantity(id, Number(button.dataset.delta));
    else if (action === "remove-cart") updateQuantity(id, -Infinity);
    else if (action === "payment" && findOrder(id)) openPayment(findOrder(id));
    else if (action === "tracking" && findOrder(id)) openTracking(findOrder(id));
    else if (action === "invoice" && findOrder(id)) openInvoice(findOrder(id));
    else if (action === "confirm-payment") confirmPaymentViaWhatsApp(button.dataset.orderId, button.dataset.qrisReady === "true");
    else if (action === "print-invoice") window.print();
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "catalog-search") renderCatalog();
  });
  document.addEventListener("change", (event) => {
    if (event.target.id === "catalog-sort") renderCatalog();
    if (event.target.name === "courier") renderCheckoutSummary();
  });
  byId("mobile-menu-btn")?.addEventListener("click", () => {
    const menu = byId("mobile-menu");
    const isHidden = menu.classList.toggle("hidden");
    byId("mobile-menu-btn").setAttribute("aria-expanded", String(!isHidden));
  });
  byId("checkout-form")?.addEventListener("submit", submitCheckout);
  byId("checkout-form")?.addEventListener("input", renderCheckoutSummary);
  byId("checkout-form")?.addEventListener("change", renderCheckoutSummary);
  byId("catalog-sort")?.addEventListener("change", renderCatalog);
  window.addEventListener("hashchange", () => navigate(window.location.hash.slice(1) || "home"));
  window.addEventListener("popstate", () => navigate(window.location.hash.slice(1) || "home"));

  window.applyVoucherCode = applyVoucherCode;
  window.filterOrders = setOrderFilter;
  window.handleContactFormSubmit = handleContactFormSubmit;
  window.sendContactViaWhatsApp = sendContactViaWhatsApp;

  renderCatalog();
  renderCouriers();
  renderFaq();
  renderCart();
  renderOrders();
  navigate(window.location.hash.slice(1) || "home");
})();
