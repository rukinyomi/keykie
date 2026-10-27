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

  function renderTestimonials() {
    const container = byId("testimonials-grid");
    if (!container) return;
    const slides = testimonials.filter((testimonial) => typeof testimonial.image === "string" && testimonial.image.trim());
    if (!slides.length) {
      container.innerHTML = `<article class="card-soft rounded-3xl p-8 text-center col-span-full">
        <div class="mx-auto w-14 h-14 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center text-2xl"><i class="ph-bold ph-chat-circle-dots" aria-hidden="true"></i></div>
        <h3 class="mt-4 font-bold text-gray-900">Testimoni pelanggan akan tampil di sini</h3>
        <p class="mt-2 text-sm text-gray-500">Tambahkan foto screenshot ulasan pelanggan pada data testimoni KEYKIE.</p>
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
          <h3 class="font-bold text-gray-900">${escapeHtml(testimonial.name || "Pelanggan KEYKIE")}</h3>
          ${stars ? `<span class="text-amber-500 text-sm" aria-label="Rating ${stars.length} dari 5">${stars}</span>` : ""}
        </div>
        <span class="text-xs text-gray-500">${testimonialIndex + 1} / ${slides.length}</span>
      </div>
      ${testimonial.review ? `<blockquote class="mt-3 text-sm text-gray-600 leading-relaxed">${escapeHtml(testimonial.review)}</blockquote>` : ""}
      <figure class="mt-4">
        <img src="${escapeHtml(testimonial.image)}" alt="${escapeHtml(testimonial.caption || `Screenshot testimoni ${testimonial.name || "pelanggan KEYKIE"}`)}" class="max-h-[28rem] min-h-48 w-full rounded-2xl border border-pink-100 bg-white object-contain" loading="lazy">
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
      <span class="text-right text-xs font-bold text-emerald-700">Gratis ≤${courier.freeShippingMaxDistanceKm} km</span>
    </div>`).join("");
  }

  function shippingCostForDistance(distanceKm, courier = selectedCourier()) {
    return courier && distanceKm > 0 ? Math.ceil(distanceKm) * courier.pricePerKm : 0;
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
    const distanceKm = Number(byId("checkout-distance")?.value);
    const freeShippingByVoucher = state.voucher === "GRATISONGKIR";
    const hasValidDistance = Number.isFinite(distanceKm) && distanceKm > 0 && distanceKm <= (courier?.maxDistanceKm || 0);
    const freeShippingByDistance = hasValidDistance && distanceKm <= (courier?.freeShippingMaxDistanceKm || 0);
    const freeShipping = freeShippingByDistance || freeShippingByVoucher;
    const distanceField = byId("checkout-distance-field");
    const distanceInput = byId("checkout-distance");
    distanceField?.classList.toggle("hidden", freeShippingByVoucher);
    if (distanceInput) distanceInput.required = !freeShippingByVoucher;
    const shipping = freeShipping ? 0 : hasValidDistance ? shippingCostForDistance(distanceKm, courier) : 0;
    byId("checkout-subtotal").textContent = rupiah(cartSubtotal());
    byId("checkout-discount").textContent = `-${rupiah(discountAmount())}`;
    byId("checkout-discount-row").classList.toggle("hidden", discountAmount() === 0);
    byId("checkout-shipping").textContent = freeShippingByDistance
      ? `Gratis (≤${courier.freeShippingMaxDistanceKm} km)`
      : freeShippingByVoucher ? "Gratis (voucher)"
      : hasValidDistance ? rupiah(shipping) : "Isi jarak rute";
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
      <div class="flex flex-wrap gap-2 mt-4"><button type="button" data-action="payment" data-id="${escapeHtml(order.id)}" class="btn-primary-keykie px-4 py-2 rounded-xl text-xs font-bold">Instruksi QRIS</button><a href="${escapeHtml(paymentWhatsAppUrl(order, true))}" target="_blank" rel="noopener noreferrer" class="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600">Konfirmasi via WhatsApp</a><button type="button" data-action="tracking" data-id="${escapeHtml(order.id)}" class="px-4 py-2 rounded-xl bg-pink-50 text-pink-700 text-xs font-bold">Lacak pesanan</button><button type="button" data-action="invoice" data-id="${escapeHtml(order.id)}" class="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold">Lihat invoice</button></div>
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
    unpaid: "Menunggu pembayaran",
    processing: "Diproses",
    shipping: "Dikirim",
    completed: "Selesai",
    cancelled: "Dibatalkan"
  };

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
      return `<article class="card-soft rounded-2xl p-5 mb-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div><p class="text-xs text-gray-500">Pesanan · ${new Date(row.created_at).toLocaleString("id-ID")}</p><h3 class="font-extrabold text-gray-900">${escapeHtml(row.id)}</h3></div>
          <label class="text-xs font-bold text-gray-700">Status
            <select data-action="admin-status" data-id="${escapeHtml(row.id)}" class="ml-2 rounded-lg border border-gray-200 p-2">
              ${Object.entries(orderStatusLabels).map(([status, label]) => `<option value="${status}" ${row.status === status ? "selected" : ""}>${label}</option>`).join("")}
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
      <a id="confirm-payment-whatsapp" href="${escapeHtml(paymentWhatsAppUrl(order, true))}" target="_blank" rel="noopener noreferrer" class="btn-primary-keykie mt-4 block w-full rounded-xl py-3 text-center font-bold">Konfirmasi via WhatsApp</a>`);
    const image = byId("qris-payment-image");
    const unavailable = byId("qris-image-unavailable");
    let candidateIndex = 0;
    image.onload = () => {
      image.classList.remove("hidden");
      unavailable.classList.add("hidden");
      const confirmLink = byId("confirm-payment-whatsapp");
      if (confirmLink) confirmLink.href = paymentWhatsAppUrl(order, true);
    };
    image.onerror = () => {
      candidateIndex += 1;
      if (candidateIndex < qrisAssetCandidates.length) {
        image.src = qrisAssetCandidates[candidateIndex];
        return;
      }
      image.classList.add("hidden");
      unavailable.classList.remove("hidden");
      const confirmLink = byId("confirm-payment-whatsapp");
      if (confirmLink) {
        confirmLink.href = paymentWhatsAppUrl(order, false);
        confirmLink.textContent = "Minta QRIS via WhatsApp";
      }
    };
    image.src = qrisAssetCandidates[candidateIndex];
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
    const shippingLabel = order.shippingFreeByDistance
      ? `Gratis (${order.shippingDistanceKm} km)`
      : order.shippingFreeByVoucher ? "Gratis (voucher)"
        : `Ongkir ${order.shippingDistanceKm ? `(${order.shippingDistanceKm} km)` : ""}`;
    showModal("invoice-modal", `<div class="flex justify-between items-center"><h2 class="text-xl font-extrabold">Invoice KEYKIE</h2><button type="button" class="modal-close" data-action="close-modal" aria-label="Tutup">×</button></div>
      <p class="text-xs text-gray-500 mt-2">${escapeHtml(order.id)} · ${new Date(order.createdAt).toLocaleString("id-ID")}</p>
      <div class="mt-5"><p class="font-bold">${escapeHtml(order.customer.name)}</p><p class="text-xs text-gray-600">${escapeHtml(order.customer.address)}, ${escapeHtml(order.customer.city)}</p></div>
      <div class="mt-4">${orderItems}</div>
      <div class="flex justify-between text-xs text-gray-600 mt-3"><span>${shippingLabel}</span><span>${rupiah(order.shippingCost ?? order.courier.price)}</span></div>
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
    const distanceKm = Number(byId("checkout-distance").value);
    if (byId("checkout-city").value !== deliveryCity) {
      showToast("Pengiriman hanya tersedia untuk Kota Surakarta.", "error");
      return;
    }
    const freeShippingByVoucher = state.voucher === "GRATISONGKIR";
    if (!freeShippingByVoucher && (!Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > courier.maxDistanceKm)) {
      showToast(`Masukkan jarak rute yang valid, maksimal ${courier.maxDistanceKm} km.`, "error");
      byId("checkout-distance").focus();
      return;
    }
    const freeShippingByDistance = Number.isFinite(distanceKm) && distanceKm > 0 && distanceKm <= courier.freeShippingMaxDistanceKm;
    const freeShipping = freeShippingByDistance || freeShippingByVoucher;
    const shippingCost = freeShipping ? 0 : shippingCostForDistance(distanceKm, courier);
    const subtotal = cartSubtotal();
    const order = {
      id: `KK${Date.now().toString().slice(-8)}`,
      createdAt: new Date().toISOString(),
      status: "unpaid",
      items: state.cart.map((item) => ({ ...item })),
      subtotal,
      discount: discountAmount(),
      courier: { ...courier, price: shippingCost },
      shippingDistanceKm: Number.isFinite(distanceKm) && distanceKm > 0 && distanceKm <= courier.maxDistanceKm ? distanceKm : null,
      shippingCost,
      shippingFreeByDistance,
      shippingFreeByVoucher: !freeShippingByDistance && freeShippingByVoucher,
      total: Math.max(0, subtotal - discountAmount()) + shippingCost,
      customer: {
        name: byId("checkout-name").value.trim(),
        phone: byId("checkout-phone").value.trim(),
        address: byId("checkout-address").value.trim(),
        city: byId("checkout-city").value.trim(),
        postal: byId("checkout-postal").value.trim(),
        notes: byId("checkout-notes").value.trim()
      }
    };
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
    } else if (action === "admin-logout") {
      signOutAdmin();
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
