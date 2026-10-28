(function () {
  "use strict";

  const projectUrl = "https://vhpekszslzdhufkmblba.supabase.co";
  const publishableKey = "sb_publishable_AtyYajghnPGTRRWin2TlNw_KhxD6WWa";
  const supabaseSdk = window.supabase;

  if (!supabaseSdk || !projectUrl || !publishableKey) {
    console.error("Supabase belum siap. Periksa pemuatan SDK dan js/supabase-config.js.");
    window.KEYKIE_SUPABASE = null;
    return;
  }

  window.KEYKIE_SUPABASE = {
    client: supabaseSdk.createClient(projectUrl, publishableKey)
  };
})();
