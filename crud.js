(() => {
  "use strict";

  const apiUrl = (window.PHAD_CONFIG?.API_BASE_URL || "").trim();
  const today = () => new Date().toISOString().slice(0, 10);
  const money = value => Number(value || 0);

  const definitions = {
    customers: {
      title: "เพิ่มลูกค้าทดสอบ",
      success: "เพิ่มลูกค้าทดสอบเรียบร้อยแล้ว",
      fields: [
        ["FirstName", "ชื่อ", "text", true],
        ["LastName", "นามสกุล", "text"],
        ["Phone", "เบอร์โทรศัพท์", "tel", true],
        ["Email", "อีเมล", "email"]
      ],
      build: values => ({ ...values, Status: "Test", Notes: "Created from Cloudflare test" })
    },
    vehicles: {
      title: "เพิ่มรถทดสอบ",
      success: "เพิ่มรถทดสอบเรียบร้อยแล้ว",
      fields: [
        ["VIN", "VIN", "text", true],
        ["Brand", "ยี่ห้อ", "text", true, "BMW"],
        ["Model", "รุ่น", "text", true],
        ["Series", "Series", "text"],
        ["Year", "ปี", "number"],
        ["Color", "สี", "text"],
        ["Mileage", "ระยะทาง (กม.)", "number", false, "0"]
      ],
      build: values => ({ ...values, VIN: values.VIN.toUpperCase(), Status: "Test", Notes: "Created from Cloudflare test" })
    },
    inventory: {
      title: "เพิ่มสินค้าทดสอบ",
      success: "เพิ่มสินค้าทดสอบเรียบร้อยแล้ว",
      fields: [
        ["PartName", "ชื่ออะไหล่", "text", true],
        ["PartNumber", "Part Number", "text"],
        ["Category", "หมวดหมู่", "text"],
        ["Brand", "แบรนด์", "text", false, "BMW Motorrad"],
        ["FitsModel", "ใช้กับรุ่น", "text"],
        ["Quantity", "จำนวนเริ่มต้น", "number", true, "0"],
        ["MinStock", "จำนวนขั้นต่ำ", "number", true, "1"],
        ["SellPrice", "ราคาขาย", "number", true, "0"],
        ["Shelf", "ตำแหน่งชั้น", "text"]
      ],
      build: values => ({ ...values, Quantity: money(values.Quantity), MinStock: money(values.MinStock), SellPrice: money(values.SellPrice), Status: "Test", Notes: "Created from Cloudflare test" })
    },
    orders: {
      title: "เปิดใบสั่งงานทดสอบ",
      success: "สร้างใบสั่งงานทดสอบเรียบร้อยแล้ว",
      fields: [
        ["OrderDate", "วันที่เปิดงาน", "date", true, today()],
        ["CustomerID", "รหัสลูกค้า", "select-customers", true],
        ["VehicleID", "รหัสรถ", "select-vehicles", true],
        ["Subtotal", "ยอดรวม", "number", true, "0"],
        ["PaymentMethod", "วิธีชำระเงิน", "select-payment", true],
        ["Notes", "รายละเอียดงาน", "textarea"]
      ],
      build: values => ({ OrderDate: values.OrderDate, CustomerID: values.CustomerID, VehicleID: values.VehicleID, Subtotal: money(values.Subtotal), Discount: 0, Tax: 0, TotalAmount: money(values.Subtotal), Status: "Test", PaymentMethod: values.PaymentMethod, CreatedBy: "Cloudflare test", Notes: `Created from Cloudflare test · ${values.Notes || ""}` })
    },
    invoices: {
      title: "สร้างใบแจ้งหนี้ทดสอบ",
      success: "สร้างใบแจ้งหนี้ทดสอบเรียบร้อยแล้ว",
      fields: [
        ["InvoiceDate", "วันที่ออกใบแจ้งหนี้", "date", true, today()],
        ["DueDate", "วันครบกำหนด", "date", true, today()],
        ["OrderID", "ใบสั่งงาน", "select-orders", true],
        ["TotalAmount", "ยอดรวม", "number", true, "0"],
        ["PaidAmount", "ชำระแล้ว", "number", true, "0"]
      ],
      build: (values, related) => {
        const total = money(values.TotalAmount);
        const paid = money(values.PaidAmount);
        if (total <= 0) throw new Error("ยอดรวมต้องมากกว่า 0 บาท");
        if (paid < 0 || paid > total) throw new Error("ยอดชำระต้องไม่ติดลบและไม่เกินยอดรวม");
        const order = related.orders.find(item => item.OrderID === values.OrderID);
        return { InvoiceDate: values.InvoiceDate, DueDate: values.DueDate, OrderID: values.OrderID, CustomerID: order?.CustomerID || "", Subtotal: total, Discount: 0, Tax: 0, TotalAmount: total, PaidAmount: paid, Balance: total - paid, PaymentStatus: paid === total ? "Paid" : "Test", Notes: "Created from Cloudflare test" };
      }
    }
  };

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.hidden = true;
  overlay.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-head"><div><p class="eyebrow">TEST DATA</p><h2 id="modalTitle"></h2></div><button class="modal-close" type="button" aria-label="ปิด">×</button></div><form id="recordForm" class="record-form"></form></div>';
  document.body.appendChild(overlay);

  const form = overlay.querySelector("#recordForm");
  const title = overlay.querySelector("#modalTitle");
  let activeResource = "";
  let related = { customers: [], vehicles: [], orders: [] };

  async function api(resource, action = "", body) {
    const query = new URLSearchParams({ resource });
    if (action) query.set("action", action);
    const response = await fetch(`${apiUrl}?${query}`, body ? { method: "POST", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) } : { cache: "no-store", redirect: "follow" });
    const result = await response.json();
    if (!response.ok || result.success !== true) throw new Error(result.message || `HTTP ${response.status}`);
    return result.data;
  }

  async function getRelated() {
    const [customers, vehicles, orders] = await Promise.all([api("customers"), api("vehicles"), api("orders")]);
    return { customers, vehicles, orders };
  }

  function optionHtml(items, idKey, label) {
    return '<option value="">-- กรุณาเลือก --</option>' + items.map(item => `<option value="${String(item[idKey]).replaceAll('"', '&quot;')}">${label(item)}</option>`).join("");
  }

  function fieldHtml(field) {
    const [name, label, type, required, value = ""] = field;
    const requiredMark = required ? " *" : "";
    if (type === "textarea") return `<label class="form-wide">${label}${requiredMark}<textarea name="${name}" ${required ? "required" : ""}></textarea></label>`;
    if (type === "select-customers") return `<label>${label}${requiredMark}<select name="${name}" required>${optionHtml(related.customers, "CustomerID", x => `${x.FirstName || ""} ${x.LastName || ""} (${x.CustomerID})`)}</select></label>`;
    if (type === "select-vehicles") return `<label>${label}${requiredMark}<select name="${name}" required>${optionHtml(related.vehicles, "VehicleID", x => `${x.Brand || ""} ${x.Model || ""} · ${x.VIN || ""}`)}</select></label>`;
    if (type === "select-orders") return `<label>${label}${requiredMark}<select name="${name}" required>${optionHtml(related.orders, "OrderID", x => `${x.OrderID} · ฿${money(x.TotalAmount).toLocaleString("th-TH")}`)}</select></label>`;
    if (type === "select-payment") return `<label>${label}${requiredMark}<select name="${name}" required><option value="Cash">เงินสด</option><option value="Transfer">โอนเงิน</option><option value="Card">บัตร</option></select></label>`;
    return `<label>${label}${requiredMark}<input name="${name}" type="${type}" value="${value}" ${required ? "required" : ""} ${type === "number" ? 'min="0" step="any"' : ""}></label>`;
  }

  async function openModal(resource) {
    if (!apiUrl) return;
    activeResource = resource;
    const definition = definitions[resource];
    title.textContent = definition.title;
    related = await getRelated();
    form.innerHTML = definition.fields.map(fieldHtml).join("") + '<div class="form-actions form-wide"><button type="button" class="secondary-button" data-cancel>ยกเลิก</button><button type="submit" class="primary-button">บันทึกข้อมูลทดสอบ</button></div><p class="form-message form-wide" role="status"></p>';
    overlay.hidden = false;
    document.body.classList.add("modal-open");
    form.querySelector("input,select,textarea")?.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.classList.remove("modal-open");
  }

  overlay.addEventListener("click", event => {
    if (event.target === overlay || event.target.closest(".modal-close") || event.target.closest("[data-cancel]")) closeModal();
  });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !overlay.hidden) closeModal(); });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const message = form.querySelector(".form-message");
    const submit = form.querySelector('[type="submit"]');
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      submit.disabled = true;
      submit.textContent = "กำลังบันทึก...";
      message.className = "form-message form-wide";
      message.textContent = "";
      const body = definitions[activeResource].build(values, related);
      await api(activeResource, "create", body);
      message.classList.add("success");
      message.textContent = definitions[activeResource].success;
      document.getElementById("refreshButton").click();
      setTimeout(closeModal, 900);
    } catch (error) {
      message.classList.add("error");
      message.textContent = `บันทึกไม่สำเร็จ: ${error.message}`;
    } finally {
      submit.disabled = false;
      submit.textContent = "บันทึกข้อมูลทดสอบ";
    }
  });

  Object.keys(definitions).forEach(resource => {
    const button = document.querySelector(`#${resource} .section-heading .primary-button`);
    if (!button) return;
    button.disabled = false;
    button.addEventListener("click", () => openModal(resource).catch(error => alert(`เปิดแบบฟอร์มไม่สำเร็จ: ${error.message}`)));
  });
})();
