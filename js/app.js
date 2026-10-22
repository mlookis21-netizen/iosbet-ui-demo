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