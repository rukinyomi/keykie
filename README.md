# KEYKIE - Handcrafted Crochet Keychain & Aesthetic Charms 🧶✨

Website toko online e-commerce modern untuk brand rajutan gantungan kunci (crochet keychain) **KEYKIE** dengan sistem pembayaran utama menggunakan **QRIS (Quick Response Code Indonesian Standard)**.

---

## 🌟 Fitur Utama

### 1. 7 Menu Navigasi Lengkap
1. **Home**:
   - Hero banner estetik dengan slogan "Dirajut Penuh Cinta".
   - Keunggulan produk (100% Benang Katun Susu 5-ply, jahitan rapi, gantungan anti-karat, packing kado).
   - Produk Best Seller & koleksi terpopuler.
   - Review & testimoni pelanggan nyata.
2. **Katalog**:
   - Menampilkan koleksi gantungan rajut lengkap (Bunga & Tanaman, Karakter Hewan, Buah & Makanan, Custom Inisial & Nama).
   - Fitur pencarian kata kunci (*live search*).
   - Filter kategori produk.
   - Pengurutan harga (terendah, tertinggi) dan rating/popularitas.
   - Modal detail produk: pilih warna varian, request inisial huruf, pengatur jumlah (qty), deskripsi bahan & ukuran.
3. **Keranjang**:
   - Daftar item belanja dengan foto, nama, warna varian, dan custom inisial.
   - Stepper penambah/pengurang jumlah (+/-) & tombol hapus item.
   - Input voucher diskon (Kupon siap pakai: `KEYKIEBARU`, `GRATISONGKIR`, `RAJUTLUCU`).
   - Rincian kalkulasi belanja otomatis.
4. **Pembayaran**:
   - Form data pengiriman (Nama, No WhatsApp, Alamat lengkap, Kota, Kode Pos, Catatan kado).
   - Pilihan ekspedisi kurir (J&T Express, SiCepat, AnterAja, JNE, Instant Kurir).
   - Metode pembayaran utama: **QRIS Real-Time**.
   - Generate kode unik 3 digit acak untuk verifikasi transfer presisi.
5. **Pesanan Saya**:
   - Daftar riwayat pesanan yang tersimpan di `localStorage`.
   - Filter status tab (*Semua*, *Menunggu Pembayaran*, *Diproses (Dirajut)*, *Dikirim*, *Selesai*).
   - Tombol **Bayar QRIS Sekarang** (jika status belum bayar).
   - Tombol **Lacak Status** dengan timeline stepper progres pengerjaan rajut.
   - Tombol **Invoice / Cetak** (faktur resmi yang rapi dan siap diprint/disimpan sebagai PDF).
   - Tombol cepat **Hubungi Admin via WhatsApp** dengan template pesan otomatis berisi ID pesanan.
6. **About**:
   - Kisah perjalanan brand KEYKIE dan filosofi rajut handmade.
   - 3 pilar mutu: Benang Katun Susu, Presisi Rajut, Siap Jadi Hadiah.
   - Panduan cara mencuci dan merawat gantungan rajut agar awet.
7. **Contact Us**:
   - Info kontak resmi (WhatsApp, Instagram `@keykie.crochet`, Email, Alamat Studio di Bandung).
   - Form pesan interaktif dengan opsi kirim langsung ke WhatsApp.
   - Accordion FAQ (Pertanyaan yang sering diajukan).

---

## 💳 Fitur Pembayaran QRIS Interaktif

- **Desain Kartu Standar Nasional**: Tampilan kartu QRIS otentik sesuai standar ASPI & Bank Indonesia (Header merah QRIS + GPN, nama merchant `KEYKIE CROCHET OFFICIAL`, NMID resmi).
- **Dynamic QR Code**: QR code tajam dengan logo rajutan di tengah.
- **Countdown Timer**: Penghitung mundur 15 menit batas waktu pembayaran.
- **Simulasi Cek Otomatis**: Tombol *"Saya Sudah Bayar (Cek Otomatis)"* dengan loading verifikasi mutasi dan pembaruan status pesanan langsung ke *Diproses (Dirajut)*.
- **Upload Bukti Transfer**: Fasilitas simulasi unggah bukti transfer / screenshot pembayaran dari galeri.
- **Salin Nominal Cepat**: Tombol 1-klik untuk menyalin nominal total transfer hingga digit unik.

---

## 🚀 Cara Menjalankan Website

Website ini dibuat dengan **HTML5, Tailwind CSS, Lucide/Phosphor Icons, dan Vanilla JavaScript murni**, sehingga:
- **Tanpa perlu install Node.js / npm / compiler tambahan**.
- Cukup buka file `index.html` langsung di browser favoritmu (Google Chrome, Microsoft Edge, Mozilla Firefox, dll).

### Langkah Menjalankan:
1. Buka folder proyek:
   `C:\Users\ACER\.gemini\antigravity\scratch\keykie-crochet`
2. Klik ganda (double-click) pada file **`index.html`**.
3. Website akan langsung terbuka dan siap digunakan secara penuh!

> 💡 **Rekomendasi Workspace**:
> Atur direktori `C:\Users\ACER\.gemini\antigravity\scratch\keykie-crochet` sebagai **active workspace** di Antigravity agar kamu dapat dengan mudah mengelola seluruh file proyek.

---

## 📂 Struktur File

```text
keykie-crochet/
├── index.html          # Halaman utama dengan 7 menu view & modal
├── README.md           # Dokumentasi lengkap proyek
├── css/
│   └── style.css       # Styling estetik pastel, tema rajut & QRIS
├── js/
│   ├── data.js         # Data katalog produk, kurir, FAQ, voucher
│   ├── storage.js      # Pengelolaan cart & orders di LocalStorage
│   └── app.js          # Router navigasi, event handler, timer QRIS
└── assets/             # Direktori asset & gambar
```
