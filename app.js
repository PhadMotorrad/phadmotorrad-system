(() => {
  "use strict";

  const config = window.PHAD_CONFIG || {};
  const views = [...document.querySelectorAll(".view")];
  const navItems = [...document.querySelectorAll(".nav-item")];
  const titleMap = {
    dashboard: "Dashboard",
    customers: "Customers",
    vehicles: "Vehicles",
    inventory: "Inventory",
    orders: "Orders",
    invoices: "Invoices",
    settings: "Settings"
  };

  function showView(id) {
    views.forEach(view => view.classList.toggle("active", view.id === id));
    navItems.forEach(item => item.classList.toggle("active", item.dataset.view === id));
    document.getElementById("pageTitle").textContent = titleMap[id] || "Phad Motorrad";
    document.getElementById("sidebar").classList.remove("open");
  }

  navItems.forEach(item => item.addEventListener("click", () => showView(item.dataset.view)));
  document.querySelectorAll("[data-go]").forEach(button =>
    button.addEventListener("click", () => showView(button.dataset.go))
  );

  document.getElementById("menuButton").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  document.getElementById("apiUrlPreview").value = config.API_BASE_URL || "";

  function setApiState(ok, message) {
    const dot = document.getElementById("apiDot");
    const label = document.getElementById("apiLabel");
    const pill = document.getElementById("apiPill");
    const hero = document.getElementById("heroStatus");

    dot.classList.toggle("ok", ok);
    pill.classList.toggle("ok", ok);
    hero.classList.toggle("ok", ok);
    hero.classList.toggle("error", !ok);

    label.textContent = message;
    pill.textContent = ok ? "Connected" : "Not connected";
    hero.textContent = ok ? "API Online" : message;
  }

  async function refreshApi() {
    const url = (config.API_BASE_URL || "").trim();

    if (!url || url.includes("PASTE_GOOGLE")) {
      setApiState(false, "API URL not configured");
      return;
    }

    setApiState(false, "Checking API...");

    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        cache: "no-store"
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = await response.json();
      const data = payload.data || {};
      const ok = payload.success === true || String(data.status).toLowerCase() === "ok";

      document.getElementById("apiApp").textContent = data.app || "-";
      document.getElementById("apiVersion").textContent = data.version || "-";
      document.getElementById("apiStatus").textContent = data.status || (ok ? "ok" : "-");
      document.getElementById("apiTimestamp").textContent = payload.timestamp || "-";

      setApiState(ok, ok ? "API connected" : "Unexpected API response");
    } catch (error) {
      setApiState(false, `API error: ${error.message}`);
      document.getElementById("apiStatus").textContent = "error";
    }
  }

  document.getElementById("refreshButton").addEventListener("click", refreshApi);
  refreshApi();
})();
