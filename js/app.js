(function () {
  "use strict";

  const products = window.KEYKIE_PRODUCTS || [];
  const couriers = window.KEYKIE_COURIERS || [];
  const testimonials = window.KEYKIE_TESTIMONIALS || [];
  let testimonialIndex = 0;
  const storage = window.KEYKIE_STORAGE;
  const supabaseClient = window.KEYKIE_SUPABASE?.client;
  const whatsappAdmin = "6285290191226";
  const deliveryCity = "Surakarta, Jawa Tengah";
  let adminSession = null;
  const qrisAsset = "assets/qris.jpg";
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
  const paymentWhatsAppUrl = (order, qrisReady) => {
    const shippingInfo = order.shippingFreeByDistance
      ? `gratis untuk jarak ${order.shippingDistanceKm} km`
      : order.shippingFreeByVoucher
        ? "gratis dengan voucher"
        : `${rupiah(order.shippingCost ?? order.courier.price)} untuk jarak ${order.shippingDistanceKm} km`;
    const message = qrisReady
      ? `Halo Admin KEYKIE, saya ingin konfirmasi pembayaran QRIS untuk pesanan ${order.id}. Total: ${rupiah(order.total)} (ongkir ${shippingInfo}). Produk: ${order.items.map((item) => `${productById(item.id)?.name || "Produk"} x${item.quantity}`).join(", ")}. Saya akan melampirkan bukti pembayaran di chat ini.`
      : `Halo Admin KEYKIE, saya ingin membayar pesanan ${order.id} sebesar ${rupiah(order.total)}. Mohon kirimkan QRIS merchant untuk pembayaran.`;
    return `https://wa.me/${whatsappAdmin}?text=${encodeURIComponent(message)}`;
  };
  const shippingQuoteWhatsAppUrl = (order) => {
    const message = `Halo Admin KEYKIE, saya ingin konfirmasi ongkir pesanan ${order.id}. Nama: ${order.customer.name}. Alamat: ${order.customer.address}, ${order.customer.city} ${order.customer.postal}. Subtotal sementara: ${rupiah(order.subtotal - order.discount)}. Mohon hitung ongkir dan kirim total pembayaran sebelum saya membayar.`;
    return `https://wa.me/${whatsappAdmin}?text=${encodeURIComponent(message)}`;
  };
  const cancellationWhatsAppUrl = (order) => {
    const message = `Halo Admin KEYKIE, saya ingin mengajukan pembatalan pesanan ${order.id} atas nama ${order.customer.name}. Total pesanan: ${rupiah(order.total)}. Mohon konfirmasi pembatalannya.`;
    return `https://wa.me/${whatsappAdmin}?text=${encodeURIComponent(message)}`;
  };

  function renderBadges() {
    document.querySelectorAll(".cart-count-badge").forEach((badge) => {
      badge.textContent = String(cartCount());
      badge.classList.toggle("hidden", cartCount() === 0);
    });
  }

  function productCard(product) {
    return `<article class="product-card card-soft rounded-3xl overflow-hidden flex flex-col">
      <button type="button" class="text-left" data-action="product-detail" data-id="${escapeHtml(product.id)}" aria-label="Lihat detail ${escapeHtml(product.name)}">
        <div class="relative h-48 ${escapeHtml(product.color)} flex items-center justify-center overflow-hidden">
          ${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="absolute inset-0 h-full w-full object-cover" loading="lazy" onerror="this.remove()">` : ""}
          ${product.image ? "" : `<span class="text-7xl" aria-hidden="true">${escapeHtml(product.emoji)}</span>`}
        </div>
        <div class="p-4 pb-2">
          <div class="flex justify-between gap-2 items-start"><h3 class="font-bold text-gray-900">${escapeHtml(product.name)}</h3>${product.rating > 0 ? `<span class="text-xs text-amber-500 font-bold">★ ${product.rating.toFixed(1)}</span>` : ""}</div>
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

  function renderTestimonials() {
    const container = byId("testimonials-grid");
    if (!container) return;
    const slides = testimonials;
    if (!slides.length) {
      container.innerHTML = `<article class="card-soft rounded-3xl p-8 text-center col-span-full">
        <div class="mx-auto w-14 h-14 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center text-2xl"><i class="ph-bold ph-chat-circle-dots" aria-hidden="true"></i></div>
        <h3 class="mt-4 font-bold text-gray-900">Belum ada slot testimoni</h3>
      </article>`;
      return;
    }
    testimonialIndex = (testimonialIndex + slides.length) % slides.length;
    const testimonial = slides[testimonialIndex];
    const stars = "★".repeat(Math.max(0, Math.min(5, Number(testimonial.rating) || 0)));
    const dots = slides.map((_, index) => `<button type="button" data-action="testimonial-slide" data-index="${index}" aria-label="Tampilkan testimoni ${index + 1}" aria-current="${index === testimonialIndex ? "true" : "false"}" class="h-2.5 w-2.5 rounded-full ${index === testimonialIndex ? "bg-pink-600" : "bg-pink-200 hover:bg-pink-400"}"></button>`).join("");
    container.innerHTML = `<article class="card-soft rounded-3xl p-5 sm:p-7 w-full max-w-2xl mx-auto col-span-full">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="font-bold text-gray-900">${escapeHtml(testimonial.name || `Testimoni ${testimonialIndex + 1}`)}</h3>
          ${stars ? `<span class="text-amber-500 text-sm" aria-label="Rating ${stars.length} dari 5">${stars}</span>` : ""}
        </div>
        <span class="text-xs text-gray-500">${testimonialIndex + 1} / ${slides.length}</span>
      </div>
      ${testimonial.review ? `<blockquote class="mt-3 text-sm text-gray-600 leading-relaxed">${escapeHtml(testimonial.review)}</blockquote>` : ""}
      <figure class="mt-4">
        ${testimonial.image
          ? `<img src="${escapeHtml(testimonial.image)}" alt="${escapeHtml(testimonial.caption || `Screenshot testimoni ${testimonial.name || "pelanggan KEYKIE"}`)}" class="max-h-[28rem] min-h-48 w-full rounded-2xl border border-pink-100 bg-white object-contain" loading="lazy">`
          : `<div class="flex min-h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/50 p-6 text-center">
              <i class="ph-bold ph-image text-4xl text-pink-300" aria-hidden="true"></i>
              <span class="mt-3 text-sm font-bold text-gray-700">Slot screenshot ${testimonialIndex + 1}</span>
              <span class="mt-1 text-xs text-gray-500">Tambahkan foto pelanggan di js/data.js</span>
            </div>`}
        ${testimonial.caption ? `<figcaption class="mt-2 text-center text-xs text-gray-500">${escapeHtml(testimonial.caption)}</figcaption>` : ""}
      </figure>
      ${slides.length > 1 ? `<div class="mt-5 flex items-center justify-center gap-4">
        <button type="button" data-action="testimonial-slide" data-delta="-1" aria-label="Testimoni sebelumnya" class="modal-close"><i class="ph-bold ph-caret-left" aria-hidden="true"></i></button>
        <div class="flex items-center gap-2" aria-label="Pilih testimoni">${dots}</div>
        <button type="button" data-action="testimonial-slide" data-delta="1" aria-label="Testimoni berikutnya" class="modal-close"><i class="ph-bold ph-caret-right" aria-hidden="true"></i></button>
      </div>` : ""}
    </article>`;
  }

  function renderCart() {
    const empty = state.cart.length === 0;
    byId("cart-empty-state")?.classList.toggle("hidden", !empty);
    byId("cart-content-section")?.classList.toggle("hidden", empty);
    document.querySelector("[data-action='clear-cart']")?.classList.toggle("hidden", empty);
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
    container.innerHTML = couriers.map((courier) => `<div class="flex items-center justify-between gap-3 p-3 rounded-xl border border-pink-200 bg-white">
      <span><span class="block text-xs font-bold text-gray-800">${escapeHtml(courier.name)}</span><span class="block text-[11px] text-gray-500">${escapeHtml(courier.detail)}</span></span>
      <span class="text-right text-xs font-bold text-emerald-700">Ongkir dihitung admin</span>
    </div>`).join("");
  }

  function shippingCostForDistance(distanceKm, courier = selectedCourier()) {
    if (!courier || distanceKm <= courier.freeShippingMaxDistanceKm) return 0;
    return Math.ceil((distanceKm - courier.freeShippingMaxDistanceKm) / courier.distanceStepKm) * courier.pricePerDistanceStep;
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
    byId("checkout-subtotal").textContent = rupiah(cartSubtotal());
    byId("checkout-discount").textContent = `-${rupiah(discountAmount())}`;
    byId("checkout-discount-row").classList.toggle("hidden", discountAmount() === 0);
    byId("checkout-shipping").textContent = state.voucher === "GRATISONGKIR" ? "Gratis (voucher)" : "Dikonfirmasi admin";
    byId("checkout-total").textContent = rupiah(Math.max(0, cartSubtotal() - discountAmount()));
  }

  function renderOrders() {
    const filtered = state.orderFilter === "all" ? state.orders : state.orders.filter((order) => order.status === state.orderFilter);
    const empty = byId("orders-empty-state");
    const list = byId("orders-list-container");
    empty?.classList.toggle("hidden", filtered.length > 0);
    if (list) list.innerHTML = filtered.map((order) => `<article class="card-soft rounded-2xl p-5 mb-4">
      <div class="flex flex-wrap items-start justify-between gap-3"><div><p class="text-xs text-gray-500">Nomor pesanan</p><h3 class="font-extrabold text-gray-900">${escapeHtml(order.id)}</h3><p class="text-xs text-gray-500 mt-1">${new Date(order.createdAt).toLocaleString("id-ID")}</p></div>
        <span class="rounded-full px-3 py-1 text-xs font-bold ${order.status === "unpaid" || order.status === "awaiting_shipping" ? "bg-amber-100 text-amber-700" : order.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}">${orderStatusLabels[order.status] || "Status tidak diketahui"}</span></div>
      <div class="border-t border-gray-100 mt-4 pt-3 flex justify-between text-sm"><span>${order.status === "awaiting_shipping" ? "Subtotal sementara" : "Total pesanan"}</span><strong class="text-pink-600">${rupiah(order.total)}</strong></div>
      <p class="text-xs text-gray-500 mt-2">${order.items.map((item) => `${escapeHtml(productById(item.id)?.name || "Produk")} × ${item.quantity}`).join(" · ")}</p>
      <div class="flex flex-wrap gap-2 mt-4">${order.status === "unpaid" ? `<button type="button" data-action="payment" data-id="${escapeHtml(order.id)}" class="btn-primary-keykie px-4 py-2 rounded-xl text-xs font-bold">Instruksi QRIS</button><a href="${escapeHtml(paymentWhatsAppUrl(order, true))}" target="_blank" rel="noopener noreferrer" class="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600">Konfirmasi via WhatsApp</a>` : order.status === "awaiting_shipping" ? `<a href="${escapeHtml(shippingQuoteWhatsAppUrl(order))}" target="_blank" rel="noopener noreferrer" class="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600">Konfirmasi Ongkir via WhatsApp</a>` : ""}${["unpaid", "awaiting_shipping"].includes(order.status) ? order.cancellationToken ? `<button type="button" data-action="cancel-order" data-id="${escapeHtml(order.id)}" class="rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Batalkan Pesanan</button>` : `<a href="${escapeHtml(cancellationWhatsAppUrl(order))}" target="_blank" rel="noopener noreferrer" class="rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Ajukan Pembatalan via WhatsApp</a>` : ""}<button type="button" data-action="invoice" data-id="${escapeHtml(order.id)}" class="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold">Lihat invoice</button></div>
      ${order.status === "awaiting_shipping" ? `<p class="mt-2 text-xs text-gray-500">Ongkir belum termasuk. Menunggu admin menghitungnya dari alamat; QRIS tersedia setelah total akhir dikonfirmasi.</p>` : ""}
      ${order.status === "unpaid" ? `<p class="mt-2 text-xs text-gray-500">${order.cancellationToken ? "Ongkir sudah dikonfirmasi. Pembatalan otomatis tersedia sebelum pembayaran." : "Untuk pesanan lama, ajukan pembatalan melalui WhatsApp."}</p>` : ""}
      ${["processing", "shipping", "completed"].includes(order.status) ? `<p class="mt-2 text-xs font-semibold text-amber-700">Pesanan sudah dibayar dan tidak dapat dibatalkan.</p>` : ""}
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

  const orderStatusLabels = {
    awaiting_shipping: "Menunggu konfirmasi ongkir",
    unpaid: "Menunggu pembayaran",
    processing: "Diproses",
    shipping: "Dikirim",
    completed: "Selesai",
    cancelled: "Dibatalkan"
  };

  function clearCart() {
    if (!state.cart.length) return;
    state.cart = [];
    state.voucher = "";
    persist();
    renderCart();
    showToast("Keranjang berhasil dikosongkan.");
  }

  async function cancelUnpaidOrder(id) {
    const order = findOrder(id);
    if (!order || !["unpaid", "awaiting_shipping"].includes(order.status) || !order.cancellationToken) return;
    if (!window.confirm(`Batalkan pesanan ${order.id}? Pembatalan hanya bisa dilakukan sebelum pembayaran.`)) return;
    if (!supabaseClient) {
      showToast("Pembatalan otomatis belum tersedia karena koneksi Supabase belum siap.", "error");
      return;
    }
    const { data: cancelled, error } = await supabaseClient.rpc("cancel_unpaid_order", {
      p_order_id: order.id,
      p_cancellation_token: order.cancellationToken
    });
    if (error) {
      console.error("Gagal membatalkan pesanan di Supabase.", error);
      showToast("Pembatalan gagal. Pastikan fungsi pembatalan terbaru sudah dipasang di Supabase.", "error");
      return;
    }
    if (!cancelled) {
      showToast("Pesanan tidak dapat dibatalkan. Pesanan mungkin sudah dibayar atau statusnya telah berubah.", "error");
      return;
    }
    order.status = "cancelled";
    persist();
    renderOrders();
    showToast("Pesanan berhasil dibatalkan.");
  }

  function showAdminMessage(message, isError) {
    const element = byId("admin-orders-message");
    if (!element) return;
    element.textContent = message;
    element.classList.remove("hidden", "bg-red-50", "text-red-700", "bg-emerald-50", "text-emerald-700");
    element.classList.add(isError ? "bg-red-50" : "bg-emerald-50", isError ? "text-red-700" : "text-emerald-700");
  }

  function renderAdminView() {
    const login = byId("admin-login-form");
    const dashboard = byId("admin-dashboard");
    const loginError = byId("admin-login-error");
    if (!login || !dashboard) return;
    login.classList.toggle("hidden", Boolean(adminSession));
    dashboard.classList.toggle("hidden", !adminSession);
    if (loginError) loginError.classList.add("hidden");
    if (adminSession) {
      byId("admin-session-email").textContent = adminSession.user.email || "Admin";
      loadAdminOrders();
    }
  }

  async function loadAdminOrders() {
    const list = byId("admin-orders-list");
    if (!list || !adminSession || !supabaseClient) return;
    list.innerHTML = `<p class="card-soft rounded-2xl p-6 text-sm text-gray-500">Memuat pesanan...</p>`;
    const { data: access, error: accessError } = await supabaseClient
      .from("keykie_admins")
      .select("user_id")
      .eq("user_id", adminSession.user.id)
      .maybeSingle();
    if (accessError) {
      console.error("Gagal memeriksa hak akses admin KEYKIE.", accessError);
      showAdminMessage("Gagal memeriksa akses admin. Pastikan skema Supabase sudah dipasang.", true);
      return;
    }
    if (!access) {
      list.replaceChildren();
      showAdminMessage(
        `Akun ini belum diberi akses admin. Salin User ID berikut ke SQL Editor Supabase: ${adminSession.user.id} — INSERT INTO public.keykie_admins (user_id) VALUES ('${adminSession.user.id}') ON CONFLICT (user_id) DO NOTHING;`,
        true
      );
      return;
    }
    const { data, error } = await supabaseClient
      .from("orders")
      .select("id, created_at, status, order_data")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("Gagal memuat pesanan admin dari Supabase.", error);
      showAdminMessage(`Pesanan gagal dimuat: ${error.message}`, true);
      return;
    }
    if (!data.length) {
      list.innerHTML = `<p class="card-soft rounded-2xl p-6 text-sm text-gray-500">Belum ada pesanan online.</p>`;
      return;
    }
    list.innerHTML = data.map((row) => {
      const order = row.order_data || {};
      const customer = order.customer || {};
      const items = Array.isArray(order.items) ? order.items : [];
      const availableStatuses = row.status === "awaiting_shipping"
        ? [["awaiting_shipping", orderStatusLabels.awaiting_shipping], ["cancelled", orderStatusLabels.cancelled]]
        : Object.entries(orderStatusLabels).filter(([status]) => status !== "awaiting_shipping");
      return `<article class="card-soft rounded-2xl p-5 mb-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div><p class="text-xs text-gray-500">Pesanan · ${new Date(row.created_at).toLocaleString("id-ID")}</p><h3 class="font-extrabold text-gray-900">${escapeHtml(row.id)}</h3></div>
          <label class="text-xs font-bold text-gray-700">Status
            <select data-action="admin-status" data-id="${escapeHtml(row.id)}" class="ml-2 rounded-lg border border-gray-200 p-2">
              ${availableStatuses.map(([status, label]) => `<option value="${status}" ${row.status === status ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600">
          <div><strong class="text-gray-800">Pelanggan:</strong> ${escapeHtml(customer.name)} · ${escapeHtml(customer.phone)}</div>
          <div><strong class="text-gray-800">Total:</strong> ${rupiah(Number(order.total) || 0)}</div>
          <div class="sm:col-span-2"><strong class="text-gray-800">Alamat:</strong> ${escapeHtml(customer.address)}, ${escapeHtml(customer.city)} ${escapeHtml(customer.postal)}</div>
          <div class="sm:col-span-2"><strong class="text-gray-800">Item:</strong> ${items.map((item) => `${escapeHtml(productById(item.id)?.name || "Produk")} × ${Number(item.quantity) || 0}`).join(" · ")}</div>
          ${customer.notes ? `<div class="sm:col-span-2"><strong class="text-gray-800">Catatan:</strong> ${escapeHtml(customer.notes)}</div>` : ""}
        </div>
        ${row.status === "awaiting_shipping" ? `<form data-action="confirm-shipping-form" data-id="${escapeHtml(row.id)}" class="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-pink-50 p-4">
          <label class="text-xs font-bold text-gray-700">Jarak rute dari toko (km)
            <input type="number" name="distanceKm" required min="0.1" max="50" step="0.1" value="${escapeHtml(order.shippingDistanceKm || "")}" class="mt-1 block w-36 rounded-lg border border-gray-200 p-2">
          </label>
          <button type="submit" class="btn-primary-keykie rounded-xl px-4 py-2 text-xs font-bold">Hitung & Konfirmasi Ongkir</button>
          <span class="text-[11px] text-gray-600">Gratis hingga 10 km; selanjutnya Rp2.000 per 2 km.</span>
        </form>` : ""}
      </article>`;
    }).join("");
    showAdminMessage(`${data.length} pesanan terbaru ditampilkan.`, false);
  }

  async function submitAdminLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const errorElement = byId("admin-login-error");
    if (!supabaseClient) {
      errorElement.textContent = "Supabase belum siap. Periksa konfigurasi dan koneksi internet.";
      errorElement.classList.remove("hidden");
      return;
    }
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: byId("admin-email").value.trim(),
      password: byId("admin-password").value
    });
    if (error) {
      console.error("Login admin Supabase gagal.", error);
      errorElement.textContent = "Login gagal. Periksa email dan password admin.";
      errorElement.classList.remove("hidden");
      return;
    }
    adminSession = data.session;
    form.reset();
    renderAdminView();
  }

  async function signOutAdmin() {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error("Logout admin Supabase gagal.", error);
      showAdminMessage("Gagal keluar dari akun admin.", true);
      return;
    }
    adminSession = null;
    byId("admin-orders-list").replaceChildren();
    renderAdminView();
  }

  async function updateAdminOrderStatus(select) {
    const status = select.value;
    if (!Object.hasOwn(orderStatusLabels, status) || !adminSession || !supabaseClient) return;
    const { data, error: fetchError } = await supabaseClient
      .from("orders")
      .select("order_data")
      .eq("id", select.dataset.id)
      .single();
    if (fetchError) {
      console.error("Gagal membaca data pesanan sebelum memperbarui status.", fetchError);
      showAdminMessage("Status gagal diperbarui. Muat ulang pesanan dan coba lagi.", true);
      return;
    }
    const { error } = await supabaseClient
      .from("orders")
      .update({ status, order_data: { ...data.order_data, status } })
      .eq("id", select.dataset.id);
    if (error) {
      console.error("Gagal memperbarui status pesanan di Supabase.", error);
      showAdminMessage("Status gagal diperbarui. Periksa kebijakan akses database.", true);
      return;
    }
    showAdminMessage(`Status pesanan ${select.dataset.id} diperbarui menjadi ${orderStatusLabels[status]}.`, false);
  }

  async function confirmOrderShipping(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const distanceKm = Number(new FormData(form).get("distanceKm"));
    const courier = couriers[0];
    if (!Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > courier.maxDistanceKm) {
      showAdminMessage(`Masukkan jarak yang valid, maksimal ${courier.maxDistanceKm} km.`, true);
      return;
    }
    if (!adminSession || !supabaseClient) {
      showAdminMessage("Sesi admin tidak tersedia. Silakan login kembali.", true);
      return;
    }
    const whatsappWindow = window.open("about:blank", "_blank");
    const { data, error: fetchError } = await supabaseClient
      .from("orders")
      .select("order_data")
      .eq("id", form.dataset.id)
      .eq("status", "awaiting_shipping")
      .maybeSingle();
    if (fetchError || !data) {
      whatsappWindow?.close();
      if (fetchError) console.error("Gagal membaca pesanan sebelum menetapkan ongkir.", fetchError);
      showAdminMessage("Ongkir gagal ditetapkan. Pesanan mungkin sudah diperbarui; muat ulang daftar pesanan.", true);
      return;
    }
    const order = data.order_data;
    const shippingFreeByDistance = distanceKm <= courier.freeShippingMaxDistanceKm;
    const shippingFreeByVoucher = order.shippingFreeByVoucher === true;
    const shippingCost = shippingFreeByVoucher ? 0 : shippingCostForDistance(distanceKm, courier);
    const updatedOrder = {
      ...order,
      status: "unpaid",
      shippingDistanceKm: distanceKm,
      shippingCost,
      shippingFreeByDistance: shippingFreeByDistance && !shippingFreeByVoucher,
      shippingFreeByVoucher,
      courier: { ...order.courier, price: shippingCost },
      total: Math.max(0, Number(order.subtotal) - Number(order.discount)) + shippingCost
    };
    const { data: updated, error } = await supabaseClient
      .from("orders")
      .update({ status: "unpaid", order_data: updatedOrder })
      .eq("id", form.dataset.id)
      .eq("status", "awaiting_shipping")
      .select("id")
      .maybeSingle();
    if (error || !updated) {
      whatsappWindow?.close();
      if (error) console.error("Gagal menyimpan ongkir dan total akhir.", error);
      showAdminMessage("Ongkir gagal disimpan. Periksa koneksi dan kebijakan Supabase.", true);
      return;
    }
    const customerPhone = String(order.customer.phone).replace(/\D/g, "").replace(/^0/, "62");
    const whatsappUrl = `https://wa.me/${customerPhone}?text=${encodeURIComponent(`Halo ${order.customer.name}, ongkir pesanan ${order.id} adalah ${rupiah(shippingCost)} untuk jarak ${distanceKm} km. Total pembayaran: ${rupiah(updatedOrder.total)}. Silakan buka halaman Pesanan Saya, tekan Perbarui Status & Ongkir, lalu lanjutkan pembayaran QRIS.`)}`;
    if (whatsappWindow) whatsappWindow.location.href = whatsappUrl;
    await loadAdminOrders();
    showAdminMessage(`Ongkir ${rupiah(shippingCost)} ditetapkan untuk pesanan ${form.dataset.id}. Status menunggu pembayaran.`, false);
  }

  async function refreshCustomerOrders() {
    if (!supabaseClient) {
      showToast("Supabase belum siap. Status pesanan tidak dapat diperbarui.", "error");
      return;
    }
    const tokenOrders = state.orders.filter((order) => order.cancellationToken);
    if (!tokenOrders.length) {
      showToast("Pesanan lama tidak memiliki token untuk diperbarui otomatis.", "error");
      return;
    }
    let updatedCount = 0;
    for (const order of tokenOrders) {
      const { data, error } = await supabaseClient.rpc("get_customer_order", {
        p_order_id: order.id,
        p_cancellation_token: order.cancellationToken
      });
      if (error) {
        console.error(`Gagal memperbarui pesanan ${order.id}.`, error);
        showToast("Status/ongkir gagal diperbarui. Pastikan skema Supabase terbaru sudah dijalankan.", "error");
        return;
      }
      if (data && typeof data === "object") {
        Object.assign(order, data);
        updatedCount += 1;
      }
    }
    persist();
    renderOrders();
    showToast(updatedCount ? "Status dan ongkir pesanan berhasil diperbarui." : "Belum ada pembaruan pesanan dari admin.");
  }

  const faqs = [
    ["Berapa lama proses pembuatan pesanan?", "Produk ready stock diproses dalam 1–2 hari kerja. Produk custom dapat memerlukan waktu lebih lama."],
    ["Bagaimana cara membayar dengan QRIS?", "Pembayaran QRIS belum terhubung otomatis ke penyedia pembayaran. Admin akan memverifikasi pembayaran secara manual setelah bukti dikirim melalui WhatsApp."],
    ["Apakah bisa meminta warna atau inisial khusus?", "Bisa. Pilih produk Inisial Custom dan tuliskan detail request pada catatan saat checkout."],
    ["Bagaimana cara merawat gantungan rajut?", "Cuci tangan dengan sabun lembut bila perlu, jangan diperas, lalu angin-anginkan di tempat teduh."]
  ];

  function renderFaq() {
    const container = byId("faq-accordion");
    if (container) container.innerHTML = faqs.map(([question, answer], index) => `<details class="card-soft rounded-2xl p-4 mb-3"><summary class="cursor-pointer font-bold text-sm text-gray-800">${escapeHtml(question)}</summary><p class="text-xs leading-relaxed text-gray-600 mt-3">${escapeHtml(answer)}</p></details>`).join("");
  }

  function navigate(view) {
    const validViews = ["home", "katalog", "keranjang", "pembayaran", "pesanan", "admin", "about", "contact"];
    const target = validViews.includes(view) ? view : "home";
    document.querySelectorAll(".view-section").forEach((section) => section.classList.toggle("hidden", section.id !== `view-${target}`));
    document.querySelectorAll("[data-nav-target]").forEach((link) => {
      const active = link.dataset.navTarget === target;
      if (link.classList.contains("brand-home-link")) return;
      link.classList.toggle("bg-pink-100", active);
      link.classList.toggle("text-pink-700", active);
      if (link.closest("#mobile-menu")) link.classList.toggle("bg-pink-50", active);
    });
    byId("mobile-menu")?.classList.add("hidden");
    if (target === "keranjang") renderCart();
    if (target === "pembayaran") renderCheckoutSummary();
    if (target === "pesanan") renderOrders();
    if (target === "admin") renderAdminView();
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
      <p class="text-xs text-pink-600 font-bold mt-4">${escapeHtml(product.category)}${product.rating > 0 ? ` · ★ ${product.rating.toFixed(1)}` : ""}</p><h2 class="text-2xl font-extrabold mt-1">${escapeHtml(product.name)}</h2>
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
          <img id="qris-payment-image" src="${qrisAsset}" alt="QRIS pembayaran KEYKIE" class="max-h-80 w-full object-contain">
          <p id="qris-image-unavailable" class="hidden text-sm leading-relaxed text-gray-600">Gambar QRIS tidak dapat dimuat. Pastikan file <code class="font-bold text-pink-700">assets/qris.jpg</code> tersedia.</p>
        </div>
      </div>
      <div class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Pembayaran tidak terverifikasi otomatis. Setelah membayar, kirim konfirmasi dan lampirkan bukti pembayaran melalui WhatsApp admin.</div>
      <a id="confirm-payment-whatsapp" href="${escapeHtml(paymentWhatsAppUrl(order, true))}" target="_blank" rel="noopener noreferrer" class="btn-primary-keykie mt-4 block w-full rounded-xl py-3 text-center font-bold">Konfirmasi via WhatsApp</a>`);
    const image = byId("qris-payment-image");
    const unavailable = byId("qris-image-unavailable");
    image.onerror = () => {
      image.classList.add("hidden");
      unavailable.classList.remove("hidden");
    };
  }

  function openShippingQuote(order) {
    showModal("qris-modal", `<div class="flex justify-between items-center"><h2 class="text-xl font-extrabold">Konfirmasi Ongkos Kirim</h2><button type="button" class="modal-close" data-action="close-modal" aria-label="Tutup">×</button></div>
      <div class="mt-4 rounded-2xl bg-pink-50 p-4">
        <p class="text-sm">Pesanan <strong>${escapeHtml(order.id)}</strong> berhasil dibuat.</p>
        <p class="mt-2 text-sm text-gray-700">Admin akan menghitung ongkir dari alamat tujuan dan mengirimkan total akhir melalui WhatsApp. Pembayaran QRIS tersedia setelah total ongkir dikonfirmasi.</p>
        <p class="mt-3 text-xs text-gray-500">Gratis hingga 10 km; selanjutnya Rp2.000 per 2 km. Subtotal sementara: ${rupiah(order.subtotal - order.discount)}.</p>
      </div>
      <a href="${escapeHtml(shippingQuoteWhatsAppUrl(order))}" target="_blank" rel="noopener noreferrer" class="btn-primary-keykie mt-4 block w-full rounded-xl py-3 text-center font-bold">Kirim Alamat & Minta Ongkir via WhatsApp</a>`);
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
    const shippingLabel = order.status === "awaiting_shipping" ? "Menunggu konfirmasi ongkir"
      : order.shippingFreeByDistance
      ? `Gratis (${order.shippingDistanceKm} km)`
      : order.shippingFreeByVoucher ? "Gratis (voucher)"
        : `Ongkir ${order.shippingDistanceKm ? `(${order.shippingDistanceKm} km)` : ""}`;
    showModal("invoice-modal", `<div class="flex justify-between items-center"><h2 class="text-xl font-extrabold">Invoice KEYKIE</h2><button type="button" class="modal-close" data-action="close-modal" aria-label="Tutup">×</button></div>
      <p class="text-xs text-gray-500 mt-2">${escapeHtml(order.id)} · ${new Date(order.createdAt).toLocaleString("id-ID")}</p>
      <div class="mt-5"><p class="font-bold">${escapeHtml(order.customer.name)}</p><p class="text-xs text-gray-600">${escapeHtml(order.customer.address)}, ${escapeHtml(order.customer.city)}</p></div>
      <div class="mt-4">${orderItems}</div>
      <div class="flex justify-between text-xs text-gray-600 mt-3"><span>${shippingLabel}</span><span>${order.status === "awaiting_shipping" ? "Belum ditentukan" : rupiah(order.shippingCost ?? order.courier.price)}</span></div>
      <div class="flex justify-between font-extrabold mt-2 text-pink-600"><span>Total</span><span>${rupiah(order.total)}</span></div>
      <button type="button" data-action="print-invoice" class="btn-primary-keykie mt-5 w-full rounded-xl py-3 font-bold">Cetak Invoice</button>`);
  }

  async function submitCheckout(event) {
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
    if (byId("checkout-city").value !== deliveryCity) {
      showToast("Pengiriman hanya tersedia untuk Kota Surakarta.", "error");
      return;
    }
    const freeShippingByVoucher = state.voucher === "GRATISONGKIR";
    const subtotal = cartSubtotal();
    const order = {
      id: `KK${Date.now().toString().slice(-8)}`,
      createdAt: new Date().toISOString(),
      status: "awaiting_shipping",
      cancellationToken: window.crypto?.randomUUID?.(),
      items: state.cart.map((item) => ({ ...item })),
      subtotal,
      discount: discountAmount(),
      courier: { ...courier, price: 0 },
      shippingDistanceKm: null,
      shippingCost: 0,
      shippingFreeByDistance: false,
      shippingFreeByVoucher: freeShippingByVoucher,
      total: Math.max(0, subtotal - discountAmount()),
      customer: {
        name: byId("checkout-name").value.trim(),
        phone: byId("checkout-phone").value.trim(),
        address: byId("checkout-address").value.trim(),
        city: byId("checkout-city").value.trim(),
        postal: byId("checkout-postal").value.trim(),
        notes: byId("checkout-notes").value.trim()
      }
    };
    if (!order.cancellationToken) {
      showToast("Browser tidak mendukung token pembatalan aman. Perbarui browser lalu coba lagi.", "error");
      return;
    }
    if (!supabaseClient) {
      showToast("Pesanan belum dapat dibuat karena koneksi Supabase belum siap.", "error");
      return;
    }
    const { error } = await supabaseClient.from("orders").insert({
      id: order.id,
      created_at: order.createdAt,
      status: order.status,
      order_data: order
    });
    if (error) {
      console.error("Gagal menyimpan pesanan ke Supabase.", error);
      showToast("Pesanan gagal disimpan online. Silakan coba lagi.", "error");
      return;
    }
    state.orders.unshift(order);
    state.cart = [];
    state.voucher = "";
    persist();
    renderCart();
    renderOrders();
    openShippingQuote(order);
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

  async function initializeAdminSession() {
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.error("Gagal memeriksa sesi admin Supabase.", error);
      return;
    }
    adminSession = data.session;
    if (window.location.hash === "#admin") renderAdminView();
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
    } else if (action === "testimonial-slide") {
      if (button.dataset.index !== undefined) testimonialIndex = Number(button.dataset.index);
      else testimonialIndex += Number(button.dataset.delta);
      renderTestimonials();
    } else if (action === "admin-refresh") {
      loadAdminOrders();
    } else if (action === "refresh-orders") {
      refreshCustomerOrders();
    } else if (action === "admin-logout") {
      signOutAdmin();
    } else if (action === "clear-cart") {
      clearCart();
    } else if (action === "cancel-order") {
      cancelUnpaidOrder(id);
    } else if (action === "quantity") updateQuantity(id, Number(button.dataset.delta));
    else if (action === "remove-cart") updateQuantity(id, -Infinity);
    else if (action === "payment" && findOrder(id)) openPayment(findOrder(id));
    else if (action === "tracking" && findOrder(id)) openTracking(findOrder(id));
    else if (action === "invoice" && findOrder(id)) openInvoice(findOrder(id));
    else if (action === "print-invoice") window.print();
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "catalog-search") renderCatalog();
  });
  document.addEventListener("change", (event) => {
    if (event.target.id === "catalog-sort") renderCatalog();
    if (event.target.name === "courier") renderCheckoutSummary();
    if (event.target.matches("[data-action='admin-status']")) updateAdminOrderStatus(event.target);
  });
  byId("mobile-menu-btn")?.addEventListener("click", () => {
    const menu = byId("mobile-menu");
    const isHidden = menu.classList.toggle("hidden");
    byId("mobile-menu-btn").setAttribute("aria-expanded", String(!isHidden));
  });
  byId("checkout-form")?.addEventListener("submit", submitCheckout);
  byId("admin-login-form")?.addEventListener("submit", submitAdminLogin);
  document.addEventListener("submit", (event) => {
    if (event.target.matches("[data-action='confirm-shipping-form']")) confirmOrderShipping(event);
  });
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
  renderTestimonials();
  renderCouriers();
  renderFaq();
  renderCart();
  renderOrders();
  navigate(window.location.hash.slice(1) || "home");
  initializeAdminSession();
})();
