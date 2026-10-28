window.KEYKIE_PRODUCTS = [
  { id: "teddy-bear", name: "Bear Crochet Keychain", category: "Keychain", price: 35000, rating: 0, sold: 5, emoji: "🧸", color: "bg-pink-100", description: "Gantungan kunci beruang rajut yang lucu untuk tas atau hadiah.", image: "assets/bear2.jpg" },
  { id: "octopus-keychain", name: "Octopus Keychain", category: "Keychain", price: 30000, rating: 0, sold: 4, emoji: "🐙", color: "bg-pink-50", description: "Gantungan kunci gurita rajut dengan bentuk mungil dan menggemaskan.", image: "assets/octopus3.jpg" },
  { id: "guitar-keychain", name: "Guitar Keychain", category: "Keychain", price: 31000, rating: 0, sold: 3, emoji: "🎸", color: "bg-rose-100", description: "Gantungan kunci gitar rajut untuk melengkapi aksesori tasmu.", image: "assets/guitar4.jpg" },
  { id: "whale-keychain", name: "Whale Keychain", category: "Keychain", price: 28000, rating: 0, sold: 4, emoji: "🐳", color: "bg-pink-100", description: "Gantungan kunci paus rajut yang imut dan cocok dibawa ke mana saja.", image: "assets/whale1.jpg" }
];

window.KEYKIE_COURIERS = [
  {
    id: "local",
    name: "Pengiriman Lokal KEYKIE",
    detail: "Gratis hingga 10 km; selanjutnya Rp2.000 per 2 km",
    pricePerDistanceStep: 2000,
    distanceStepKm: 2,
    maxDistanceKm: 50,
    freeShippingMaxDistanceKm: 10,
    origin: "Kost Narwanto, Kembangan, Baki, Sukoharjo"
  }
];

// Add one customer-approved screenshot per slide. Hide personal/payment details before adding images.
// Example slot: { name: "S****", rating: 5, review: "Produk lucu dan rapi!", image: "assets/testimonials/review-01.jpg", caption: "Ulasan pelanggan" }
window.KEYKIE_TESTIMONIALS = Array.from({ length: 10 }, () => ({
  name: "",
  rating: 0,
  review: "",
  image: "",
  caption: ""
}));
