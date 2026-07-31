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

  const escapeHtml = value => String(value ?? "-")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

  async function getResource(resource) {
    const separator = config.API_BASE_URL.includes("?") ? "&" : "?";
    const response = await fetch(`${config.API_BASE_URL}${separator}resource=${resource}`, {cache:"no-store", redirect:"follow"});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.success !== true) throw new Error(payload.message || "API error");
    return Array.isArray(payload.data) ? payload.data : [];
  }

  function renderTable(targetId, rows, columns) {
    const target = document.getElementById(targetId);
    if (!rows.length) { target.innerHTML = '<div class="empty-row">ยังไม่มีข้อมูล</div>'; return; }
    target.innerHTML = `<table class="data-table"><thead><tr>${columns.map(c=>`<th>${c.label}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr>${columns.map(c=>`<td>${c.render ? c.render(row) : escapeHtml(row[c.key])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }

  async function loadBusinessData() {
    const targets = ["customersData","vehiclesData","inventoryData","ordersData","invoicesData"];
    targets.forEach(id => document.getElementById(id).innerHTML = '<div class="loading-row">กำลังโหลดข้อมูล...</div>');
    try {
      const [customers, vehicles, inventory, orders, invoices] = await Promise.all([
        getResource("customers"), getResource("vehicles"), getResource("inventory"), getResource("orders"), getResource("invoices")
      ]);
      document.getElementById("customerCount").textContent = customers.length;
      document.getElementById("vehicleCount").textContent = vehicles.length;
      document.getElementById("orderCount").textContent = orders.filter(x => !["Completed","Cancelled"].includes(x.Status)).length;
      document.getElementById("inventoryAlertCount").textContent = inventory.filter(x => Number(x.Quantity||0) <= Number(x.MinStock||0)).length;
      renderTable("customersData", customers, [
        {label:"ลูกค้า",render:r=>`<strong>${escapeHtml(r.FirstName)} ${escapeHtml(r.LastName||"")}</strong><small>${escapeHtml(r.CustomerID)}</small>`},
        {label:"โทรศัพท์",key:"Phone"},{label:"อีเมล",key:"Email"},{label:"สถานะ",key:"Status"}
      ]);
      renderTable("vehiclesData", vehicles, [
        {label:"รถ",render:r=>`<strong>${escapeHtml(r.Brand)} ${escapeHtml(r.Model)}</strong><small>${escapeHtml(r.VehicleID)}</small>`},
        {label:"VIN",key:"VIN"},{label:"ปี",key:"Year"},{label:"ระยะทาง",render:r=>`${escapeHtml(r.Mileage||0)} km`},{label:"สถานะ",key:"Status"}
      ]);
      renderTable("inventoryData", inventory, [
        {label:"อะไหล่",render:r=>`<strong>${escapeHtml(r.PartName)}</strong><small>${escapeHtml(r.PartNumber||r.PartID)}</small>`},
        {label:"จำนวน",key:"Quantity"},{label:"ขั้นต่ำ",key:"MinStock"},{label:"ราคาขาย",render:r=>`฿${Number(r.SellPrice||0).toLocaleString("th-TH")}`},{label:"ชั้น",key:"Shelf"}
      ]);
      renderTable("ordersData", orders, [
        {label:"ใบสั่งงาน",render:r=>`<strong>${escapeHtml(r.OrderID)}</strong><small>${escapeHtml(r.OrderDate)}</small>`},
        {label:"ลูกค้า",key:"CustomerID"},{label:"รถ",key:"VehicleID"},{label:"ยอดรวม",render:r=>`฿${Number(r.TotalAmount||0).toLocaleString("th-TH")}`},{label:"สถานะ",key:"Status"}
      ]);
      renderTable("invoicesData", invoices, [
        {label:"ใบแจ้งหนี้",render:r=>`<strong>${escapeHtml(r.InvoiceID)}</strong><small>${escapeHtml(r.InvoiceDate)}</small>`},
        {label:"ใบสั่งงาน",key:"OrderID"},{label:"ยอดรวม",render:r=>`฿${Number(r.TotalAmount||0).toLocaleString("th-TH")}`},{label:"คงเหลือ",render:r=>`฿${Number(r.Balance||0).toLocaleString("th-TH")}`},{label:"สถานะ",key:"PaymentStatus"}
      ]);
    } catch (error) {
      targets.forEach(id => document.getElementById(id).innerHTML = `<div class="error-row">โหลดข้อมูลไม่สำเร็จ: ${escapeHtml(error.message)}</div>`);
    }
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
      if (ok) await loadBusinessData();
    } catch (error) {
      setApiState(false, `API error: ${error.message}`);
      document.getElementById("apiStatus").textContent = "error";
    }
  }

  document.getElementById("refreshButton").addEventListener("click", refreshApi);
  refreshApi();
})();
