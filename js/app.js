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
        notify(title + " — kartu pratinjau, tidak ada permainan yang terhubung.");
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
    const sessionPanel = document.querySelector("#auth-session-panel");
    const sessionEmail = document.querySelector("#auth-session-email");
    if (sessionPanel) sessionPanel.hidden = !email;
    if (sessionEmail) sessionEmail.textContent = email;
    if (authForm) authForm.hidden = Boolean(email);
    const authIntro = document.querySelector("#auth-intro");
    if (authIntro && email) authIntro.textContent = "Kamu sudah masuk menggunakan akun ini.";
    else if (authIntro) authIntro.textContent = authMode === "signup"
      ? "Daftar dengan email yang bisa kamu akses."
      : "Gunakan email dan kata sandi untuk melanjutkan.";
    const mobileAccount = document.querySelector("#mobile-account");
    if (mobileAccount) mobileAccount.innerHTML = email ? "<span>♙</span>Akun" : "<span>♙</span>Masuk";
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

  async function signOutCurrentUser() {
    if (!supabaseClient) return;
    if (logoutButton) logoutButton.disabled = true;
    const dialogLogout = document.querySelector("#auth-dialog-logout");
    if (dialogLogout) dialogLogout.disabled = true;
    const { error } = await supabaseClient.auth.signOut();
    if (logoutButton) logoutButton.disabled = false;
    if (dialogLogout) dialogLogout.disabled = false;
    if (error) {
      notify("Gagal keluar. Coba lagi.");
      return;
    }
    authDialog?.close();
    notify("Kamu sudah keluar dari akun.");
  }

  logoutButton?.addEventListener("click", signOutCurrentUser);
  document.querySelector("#auth-dialog-logout")?.addEventListener("click", signOutCurrentUser);
  document.querySelector("#mobile-account")?.addEventListener("click", () => {
    if (!supabaseClient) {
      notify("Layanan akun belum tersedia. Coba muat ulang halaman.");
      return;
    }
    supabaseClient.auth.getSession().then(({ data }) => {
      if (data?.session) {
        setAuthMode("login");
        if (authDialog && !authDialog.open) authDialog.showModal();
      } else {
        openAuth("login");
      }
    });
  });


  // Live chat terhubung ke Supabase; AI dipanggil melalui Edge Function server-side.
  const supportForm = document.querySelector("#support-form");
  const supportInput = document.querySelector("#support-message-input");
  const supportMessages = document.querySelector("#support-messages");
  const supportTopic = document.querySelector("#support-topic");
  const supportCharCount = document.querySelector("#support-char-count");
  const supportFormNote = document.querySelector("#support-form-note");
  const supportAdmin = document.querySelector("#support-admin");
  const ticketList = document.querySelector("#support-ticket-list");
  const adminMessages = document.querySelector("#support-admin-messages");
  const adminHead = document.querySelector("#support-admin-thread-head");
  const adminReplyForm = document.querySelector("#support-admin-reply-form");
  const adminReplyInput = document.querySelector("#support-admin-reply-input");
  const adminNote = document.querySelector("#support-admin-note");
  let supportSession = null, conversationId = null, adminConversationId = null;
  let customerChannel = null, adminChannel = null, sendingSupport = false;

  function renderMessages(container, rows, adminView = false) {
    if (!container) return;
    container.replaceChildren();
    (rows || []).forEach((row) => {
      const bubble = document.createElement("div");
      const mine = adminView ? row.sender_type === "admin" : row.sender_type === "customer";
      bubble.className = "support-message " + (mine ? "support-user" : "support-reply");
      const label = document.createElement("span");
      label.textContent = row.sender_type === "customer" ? (adminView ? "Pelanggan" : "Kamu") : row.sender_type === "ai" ? "IOSBET FAQ Support" : row.sender_type === "admin" ? "Pemilik IOSBET" : "Informasi sistem";
      const body = document.createElement("p"); body.textContent = row.body || "";
      const time = document.createElement("time");
      const date = new Date(row.created_at || Date.now());
      time.textContent = Number.isNaN(date.getTime()) ? "" : date.toLocaleString("id-ID", {dateStyle:"short",timeStyle:"short"});
      bubble.append(label, body, time); container.appendChild(bubble);
    });
    container.scrollTop = container.scrollHeight;
  }
  function renderWelcome(text) {
    renderMessages(supportMessages, [{sender_type:"ai",body:text,created_at:new Date().toISOString()}]);
  }
  async function loadCustomerMessages() {
    if (!conversationId || !supportSession?.user || !supabaseClient) return;
    const {data,error}=await supabaseClient.from("support_messages").select("id,sender_type,body,created_at").eq("conversation_id",conversationId).order("created_at",{ascending:true}).limit(100);
    if(error){if(supportFormNote)supportFormNote.textContent="Pesan gagal dimuat. Periksa SQL setup dan RLS.";return;}
    if(data?.length) renderMessages(supportMessages,data);
    else renderWelcome("Halo! Kirim pertanyaan pertamamu untuk memulai percakapan.");
  }
  async function loadTickets() {
    if(!supportSession?.user || supportSession.user.app_metadata?.support_admin!==true)return;
    const {data,error}=await supabaseClient.from("support_conversations").select("id,user_id,topic,status,updated_at").order("updated_at",{ascending:false}).limit(100);
    if(error){if(ticketList)ticketList.textContent="Gagal memuat tiket. Periksa klaim admin dan RLS.";return;}
    ticketList.replaceChildren();
    if(!data?.length){ticketList.textContent="Belum ada percakapan.";return;}
    data.forEach(t=>{
      const b=document.createElement("button");b.type="button";b.className="support-ticket"+(t.id===adminConversationId?" active":"");
      const title=document.createElement("strong");title.textContent=t.topic||"Pertanyaan umum";
      const meta=document.createElement("small");meta.textContent=t.user_id.slice(0,8)+"… · "+t.status;
      const time=document.createElement("time");time.textContent=new Date(t.updated_at).toLocaleString("id-ID",{dateStyle:"short",timeStyle:"short"});
      b.append(title,meta,time);b.addEventListener("click",()=>selectTicket(t));ticketList.appendChild(b);
    });
  }
  async function loadAdminMessages(){
    if(!adminConversationId)return;
    const {data:ticket}=await supabaseClient.from("support_conversations").select("topic,user_id,status").eq("id",adminConversationId).maybeSingle();
    if(ticket&&adminHead)adminHead.textContent=ticket.topic+" · pengguna "+ticket.user_id.slice(0,8)+"… · "+ticket.status;
    const {data,error}=await supabaseClient.from("support_messages").select("id,sender_type,body,created_at").eq("conversation_id",adminConversationId).order("created_at",{ascending:true}).limit(200);
    if(error){if(adminNote)adminNote.textContent="Tidak dapat membaca pesan; periksa RLS admin.";return;}
    renderMessages(adminMessages,data,true);
  }
  async function selectTicket(t){adminConversationId=t.id;await loadTickets();await loadAdminMessages();}
  async function initializeSupport(session){
    supportSession=session||null;conversationId=null;
    if(customerChannel){supabaseClient.removeChannel(customerChannel);customerChannel=null;}
    if(!session?.user){renderWelcome("Silakan masuk ke akun untuk memulai percakapan yang tersimpan.");if(supportFormNote)supportFormNote.textContent="Masuk terlebih dahulu agar pesan tersimpan.";if(supportAdmin)supportAdmin.hidden=true;}
    else{
      const {data,error}=await supabaseClient.from("support_conversations").select("id,status").eq("user_id",session.user.id).in("status",["open","waiting"]).order("updated_at",{ascending:false}).limit(1);
      if(error){if(supportFormNote)supportFormNote.textContent="Backend belum siap. Pastikan SQL setup dijalankan dan tabel diizinkan Data API.";renderWelcome("Layanan chat belum siap dikonfigurasi.");}
      else{
        conversationId=data?.[0]?.id||null;
        if(conversationId){
          await loadCustomerMessages();
          customerChannel=supabaseClient.channel("support-customer-"+conversationId).on("postgres_changes",{event:"INSERT",schema:"public",table:"support_messages",filter:"conversation_id=eq."+conversationId},loadCustomerMessages).subscribe();
          if(supportFormNote)supportFormNote.textContent="Percakapan tersimpan. Balasan AI dan pemilik tampil realtime.";
        }else{renderWelcome("Halo! Kirim pertanyaan pertamamu untuk memulai percakapan.");if(supportFormNote)supportFormNote.textContent="Pesan pertama akan membuat percakapan baru.";}
      }
      const isAdmin=session.user.app_metadata?.support_admin===true;
      if(supportAdmin)supportAdmin.hidden=!isAdmin;
      if(isAdmin){
        await loadTickets();
        if(adminChannel)supabaseClient.removeChannel(adminChannel);
        adminChannel=supabaseClient.channel("support-owner-inbox")
          .on("postgres_changes",{event:"*",schema:"public",table:"support_messages"},async p=>{await loadTickets();if(adminConversationId&&p.new?.conversation_id===adminConversationId)await loadAdminMessages();})
          .on("postgres_changes",{event:"*",schema:"public",table:"support_conversations"},loadTickets).subscribe();
      }else if(adminChannel){supabaseClient.removeChannel(adminChannel);adminChannel=null;}
    }
  }
  supportInput?.addEventListener("input",()=>{if(supportCharCount)supportCharCount.textContent=String(supportInput.value.length);});
  supportForm?.addEventListener("submit",async e=>{
    e.preventDefault();if(sendingSupport)return;
    const message=(supportInput?.value||"").trim();if(!message)return;
    if(!supportSession?.user){if(supportFormNote)supportFormNote.textContent="Masuk dahulu untuk mengirim pesan.";openAuth("login");return;}
    sendingSupport=true;const submit=supportForm.querySelector('button[type="submit"]');if(submit){submit.disabled=true;submit.textContent="Mengirim...";}
    if(supportFormNote)supportFormNote.textContent="Menyimpan pesan dan mencari jawaban FAQ...";
    try{
      const {data,error}=await supabaseClient.functions.invoke("support-chat",{body:{conversation_id:conversationId,topic:supportTopic?.value||"Pertanyaan umum",message}});
      if(error)throw error;if(data?.error)throw new Error(data.error);
      conversationId=data.conversation_id||conversationId;supportInput.value="";if(supportCharCount)supportCharCount.textContent="0";
      await loadCustomerMessages();
      if(!customerChannel&&conversationId)customerChannel=supabaseClient.channel("support-customer-"+conversationId).on("postgres_changes",{event:"INSERT",schema:"public",table:"support_messages",filter:"conversation_id=eq."+conversationId},loadCustomerMessages).subscribe();
      if(supportFormNote)supportFormNote.textContent=data.ai_replied?"Pesan tersimpan dan FAQ otomatis sudah membalas.":"Pesan tersimpan; AI belum membalas. Pemilik dapat menindaklanjuti.";
    }catch(err){if(supportFormNote)supportFormNote.textContent=err?.message||"Pesan gagal dikirim. Coba lagi.";}
    finally{sendingSupport=false;if(submit){submit.disabled=false;submit.innerHTML='Kirim pesan <span>↗</span>';}}
  });
  adminReplyForm?.addEventListener("submit",async e=>{
    e.preventDefault();const body=(adminReplyInput?.value||"").trim();
    if(!body||!adminConversationId||supportSession?.user?.app_metadata?.support_admin!==true){if(adminNote)adminNote.textContent="Pilih tiket dan pastikan akunmu memiliki akses pemilik.";return;}
    const submit=document.querySelector("#support-admin-reply-submit");if(submit)submit.disabled=true;
    const {error}=await supabaseClient.from("support_messages").insert({conversation_id:adminConversationId,sender_id:supportSession.user.id,sender_type:"admin",body});
    if(submit)submit.disabled=false;
    if(error){if(adminNote)adminNote.textContent="Balasan gagal dikirim. Periksa klaim admin dan RLS.";return;}
    await supabaseClient.from("support_conversations").update({updated_at:new Date().toISOString(),status:"waiting"}).eq("id",adminConversationId);
    adminReplyInput.value="";if(adminNote)adminNote.textContent="Balasan terkirim.";await loadAdminMessages();await loadTickets();
  });
  document.querySelector("#support-admin-refresh")?.addEventListener("click",loadTickets);
  if(supabaseClient){
    supabaseClient.auth.getSession().then(({data})=>initializeSupport(data?.session||null));
    supabaseClient.auth.onAuthStateChange((_event,session)=>window.setTimeout(()=>initializeSupport(session||null),0));
  }

  const sectionIds = ["home", "slots", "casino", "poker", "lotto", "arcade", "fishing", "sports", "exclusive", "wallet", "deposit", "withdraw", "live-chat", "promotions", "leaderboard", "contact"];
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