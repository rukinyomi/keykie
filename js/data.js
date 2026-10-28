window.KEYKIE_PRODUCTS = [
  { id: "teddy-bear", name: "Bear Crochet Keychain", category: "Keychain", price: 35000, rating: 0, sold: 5, emoji: "🧸", color: "bg-pink-100", description: "Gantungan kunci beruang rajut yang lucu untuk tas atau hadiah.", image: "assets/bear2.jpg" },
  { id: "octopus-keychain", name: "Octopus Keychain", category: "Keychain", price: 30000, rating: 0, sold: 4, emoji: "🐙", color: "bg-pink-50", description: "Gantungan kunci gurita rajut dengan bentuk mungil dan menggemaskan.", image: "assets/octopus3.jpg" },
  { id: "guitar-keychain", name: "Guitar Keychain", category: "Keychain", price: 31000, rating: 0, sold: 3, emoji: "🎸", color: "bg-rose-100", description: "Gantungan kunci gitar rajut untuk melengkapi aksesori tasmu.", image: "assets/guitar4.jpg" },
  { id: "whale-keychain", name: "Whale Keychain", category: "Keychain", price: 28000, rating: 0, sold: 4, emoji: "🐳", color: "bg-pink-100", description: "Gantungan kunci paus rajut yang imut dan cocok dibawa ke mana saja.", image: "assets/whale1.jpg" }
];

window.KEYKIE_COURIERS = [
  {
    id: "delivery",
    name: "Ekspedisi dikonfirmasi via WhatsApp",
    detail: "Tarif mengikuti cek tarif ekspedisi resmi; khusus Surakarta",
    maxDistanceKm: 20,
    freeShippingMinItems: 5,
    freeShippingMaxDistanceKm: 10,
    carriers: [
      { id: "jne", name: "JNE" },
      { id: "jnt", name: "J&T Express" },
      { id: "sicepat", name: "SiCepat" },
      { id: "pos", name: "Pos Indonesia" },
      { id: "local", name: "Kurir Lokal KEYKIE" }
    ]
  }
];

window.KEYKIE_TESTIMONIALS = [
  {
    name: "Pelanggan KEYKIE",
    rating: 0,
    review: "“Sudah sampai kak, baguss sukaa”",
    image: "assets/testimoni1-public.jpg",
    caption: "Ulasan pelanggan tentang pesanan yang sudah diterima"
  },
  {
    name: "Pelanggan KEYKIE",
    rating: 0,
    review: "",
    image: "assets/testimoni2-public.jpg",
    caption: "Pembaruan pesanan dan foto produk KEYKIE"
  },
  ...Array.from({ length: 8 }, (_, index) => ({
    name: "Pelanggan KEYKIE",
    rating: 0,
    review: "",
    image: `assets/testimoni${index + 3}-public.jpg`,
    caption: "Ulasan pelanggan KEYKIE"
  }))
];
