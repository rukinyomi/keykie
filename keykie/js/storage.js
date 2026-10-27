window.KEYKIE_STORAGE = {
  read(key, fallback) {
    try {
      const saved = window.localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch (error) {
      console.error("Gagal membaca data KEYKIE dari penyimpanan browser.", error);
      return fallback;
    }
  },
  write(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Gagal menyimpan data KEYKIE ke penyimpanan browser.", error);
      return false;
    }
  }
};
