(() => {
  const searchInput = document.querySelector("#game-search");
  const cards = [...document.querySelectorAll(".game-card")];
  const filterButtons = [...document.querySelectorAll(".filter-chip")];
  const emptyState = document.querySelector("#empty-state");
  const toast = document.querySelector("#toast");
  const sidebar = document.querySelector("#sidebar");
  const menuToggle = document.querySelector("#menu-toggle");
  const dialog = document.querySelector("#detail-dialog");
  const dialogTitle = document.querySelector("#dialog-title");
  let activeFilter = "all";
  let toastTimer;

  function notify(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function filterCatalog() {
    const query = (searchInput?.value || "").trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const name = (card.dataset.name || "").toLowerCase();
      const category = (card.dataset.category || "").toLowerCase();
      const matchesQuery = !query || name.includes(query) || card.textContent.toLowerCase().includes(query);
      const matchesFilter = activeFilter === "all" || category === activeFilter;
      const show = matchesQuery && matchesFilter;
      card.hidden = !show;
      if (show) visible += 1;
    });
    if (emptyState) emptyState.hidden = visible !== 0;
  }

  searchInput?.addEventListener("input", filterCatalog);
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter || "all";
      filterButtons.forEach((item) => item.classList.toggle("active", item === button));
      filterCatalog();
    });
  });

  document.querySelectorAll("[data-notice]").forEach((button) => {
    button.addEventListener("click", () => notify(button.dataset.notice));
  });

  document.querySelectorAll("[data-game]").forEach((button) => {
    button.addEventListener("click", () => {
      const title = button.dataset.game || "Detail katalog";
      if (dialog && typeof dialog.showModal === "function") {
        dialogTitle.textContent = title;
        dialog.showModal();
      } else {
        notify(title + " — kartu pratinjau demo, tidak ada permainan yang terhubung.");
      }
    });
  });

  const closeDialog = () => dialog?.close();
  document.querySelector("#dialog-close")?.addEventListener("click", closeDialog);
  document.querySelector("#dialog-ok")?.addEventListener("click", closeDialog);
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });

  menuToggle?.addEventListener("click", () => {
    const open = sidebar?.classList.toggle("open") || false;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
  });

  sidebar?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      sidebar.classList.remove("open");
      menuToggle?.setAttribute("aria-expanded", "false");
    });
  });

  document.querySelector("#mobile-search")?.addEventListener("click", () => {
    searchInput?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.addEventListener("keydown", (event) => {
    const typing = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
    if (event.key === "/" && !typing) {
      event.preventDefault();
      searchInput?.focus();
    }
    if (event.key === "Escape") {
      sidebar?.classList.remove("open");
      menuToggle?.setAttribute("aria-expanded", "false");
    }
  });


  // Supabase Auth — project khusus iosbet-ui-demo.
  // Publishable key aman digunakan di browser; jangan pernah menaruh service_role key di sini.
  const SUPABASE_URL = "https://udzfazezlzoeppqbxsqh.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_OV2VnOiU9iQig8yyQmvf-A_5GCgwTVg";
  const authDialog = document.querySelector("#auth-dialog");
  const authForm = document.querySelector("#auth-form");
  const authTitle = document.querySelector("#auth-title");
  const authIntro = document.querySelector("#auth-intro");
  const authMessage = document.querySelector("#auth-message");
  const authSubmit = document.querySelector("#auth-submit");
  const authPassword = document.querySelector("#auth-password");
  const loginOpen = document.querySelector("#login-open");
  const signupOpen = document.querySelector("#signup-open");
  const logoutButton = document.querySelector("#logout-button");
  const authUser = document.querySelector("#auth-user");
  const loginModeButton = document.querySelector("#auth-mode-login");
  const signupModeButton = document.querySelector("#auth-mode-signup");
  let authMode = "login";
  let supabaseClient = null;

  function setAuthMessage(message, type = "") {
    if (!authMessage) return;
    authMessage.textContent = message;
    authMessage.className = "auth-message" + (type ? " " + type : "");
  }

  function setAuthMode(mode) {
    authMode = mode === "signup" ? "signup" : "login";
    const signingUp = authMode === "signup";
    if (authTitle) authTitle.textContent = signingUp ? "Buat akun baru" : "Masuk ke akun";
    if (authIntro) authIntro.textContent = signingUp
      ? "Daftar dengan email yang bisa kamu akses."
      : "Gunakan email dan kata sandi untuk melanjutkan.";
    if (authSubmit) authSubmit.textContent = signingUp ? "Daftar akun" : "Masuk";
    if (authPassword) authPassword.autocomplete = signingUp ? "new-password" : "current-password";
    loginModeButton?.classList.toggle("active", !signingUp);
    signupModeButton?.classList.toggle("active", signingUp);
    setAuthMessage("");
  }

  function openAuth(mode) {
    setAuthMode(mode);
    if (authDialog && !authDialog.open) authDialog.showModal();
    window.setTimeout(() => document.querySelector("#auth-email")?.focus(), 50);
  }

  function renderAuthSession(session) {
    const email = session?.user?.email || "";
    if (authUser) {
      authUser.textContent = email;
      authUser.hidden = !email;
    }
    if (loginOpen) loginOpen.hidden = Boolean(email);
    if (signupOpen) signupOpen.hidden = Boolean(email);
    if (logoutButton) logoutButton.hidden = !email;
  }

  if (window.supabase?.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (error) notify("Tidak dapat memeriksa sesi akun. Coba muat ulang halaman.");
      renderAuthSession(data?.session || null);
    });
    supabaseClient.auth.onAuthStateChange((_event, session) => renderAuthSession(session));
  } else {
    notify("Layanan autentikasi belum termuat. Periksa koneksi internet lalu muat ulang.");
  }

  loginOpen?.addEventListener("click", () => openAuth("login"));
  signupOpen?.addEventListener("click", () => openAuth("signup"));
  loginModeButton?.addEventListener("click", () => setAuthMode("login"));
  signupModeButton?.addEventListener("click", () => setAuthMode("signup"));
  document.querySelector("#auth-close")?.addEventListener("click", () => authDialog?.close());
  authDialog?.addEventListener("click", (event) => {
    if (event.target === authDialog) authDialog.close();
  });

  authForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabaseClient) {
      setAuthMessage("Layanan autentikasi belum tersedia. Coba muat ulang halaman.", "error");
      return;
    }
    const email = document.querySelector("#auth-email")?.value.trim();
    const password = authPassword?.value || "";
    if (!email || password.length < 8) {
      setAuthMessage("Masukkan email valid dan kata sandi minimal 8 karakter.", "error");
      return;
    }

    authSubmit.disabled = true;
    authSubmit.textContent = authMode === "signup" ? "Membuat akun..." : "Memeriksa...";
    setAuthMessage("");
    try {
      if (authMode === "signup") {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + window.location.pathname }
        });
        if (error) throw error;
        if (data.session) {
          setAuthMessage("Akun berhasil dibuat dan kamu sudah masuk.", "success");
          notify("Akun berhasil dibuat.");
          window.setTimeout(() => authDialog?.close(), 900);
        } else {
          setAuthMessage("Pendaftaran diterima. Periksa email untuk mengonfirmasi akun sebelum masuk.", "success");
        }
      } else {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setAuthMessage("Berhasil masuk.", "success");
        notify("Login berhasil.");
        window.setTimeout(() => authDialog?.close(), 500);
      }
    } catch (error) {
      const message = error?.message || "Terjadi kesalahan. Coba lagi.";
      setAuthMessage(message, "error");
    } finally {
      authSubmit.disabled = false;
      authSubmit.textContent = authMode === "signup" ? "Daftar akun" : "Masuk";
    }
  });

  logoutButton?.addEventListener("click", async () => {
    if (!supabaseClient) return;
    logoutButton.disabled = true;
    const { error } = await supabaseClient.auth.signOut();
    logoutButton.disabled = false;
    if (error) {
      notify("Gagal keluar. Coba lagi.");
      return;
    }
    notify("Kamu sudah keluar dari akun.");
  });

  const sectionIds = ["home", "slots", "casino", "poker", "lotto", "arcade", "fishing", "sports", "exclusive", "promotions", "leaderboard", "contact"];
  const navLinks = [...document.querySelectorAll(".side-nav a, .mobile-nav a")];
  const sectionObserver = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === "#" + visible.target.id));
  }, { rootMargin: "-18% 0px -65% 0px", threshold: [0, .15, .35] }) : null;
  sectionIds.forEach((id) => {
    const section = document.getElementById(id);
    if (section && sectionObserver) sectionObserver.observe(section);
  });
})();