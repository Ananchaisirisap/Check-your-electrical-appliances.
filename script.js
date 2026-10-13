
/* =========================================
   Electricity Buddy - script.js
   Fixed & Improved Version
   ========================================= */

"use strict";

/* ===== ตัวช่วยพื้นฐาน ===== */

const $ = (id) => document.getElementById(id);

function money(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    : "0.00";
}

function escapeHTML(value) {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) => entities[char]
  );
}

function showResult(message) {
  const result = $("result");
  if (result) result.textContent = message;
}

/* ===== Local Storage ที่ปลอดภัย ===== */

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.error(`อ่านข้อมูล ${key} ไม่สำเร็จ`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`บันทึกข้อมูล ${key} ไม่สำเร็จ`, error);
    showResult("บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบพื้นที่จัดเก็บของเบราว์เซอร์");
    return false;
  }
}

let appliances = readStorage("currentAppliances", []);
let electricityHistory = readStorage("electricityHistory", []);

if (!Array.isArray(appliances)) appliances = [];
if (!Array.isArray(electricityHistory)) electricityHistory = [];

/* ตรวจสอบและจัดรูปข้อมูลเก่าที่บันทึกไว้ */
appliances = appliances
  .filter(item => item && typeof item === "object")
  .map(item => {
    const watt = Number(item.watt);
    const hours = Number(item.hours);
    const days = Number(item.days);
    const rate = Number(item.rate);

    const valid =
      String(item.name || "").trim() !== "" &&
      Number.isFinite(watt) && watt > 0 &&
      Number.isFinite(hours) && hours > 0 && hours <= 24 &&
      Number.isFinite(days) && days >= 1 && days <= 31 &&
      Number.isFinite(rate) && rate >= 0;

    if (!valid) return null;

    const units = watt * hours * days / 1000;

    return {
      name: String(item.name).trim(),
      watt,
      hours,
      days,
      rate,
      units,
      cost: units * rate
    };
  })
  .filter(Boolean);

electricityHistory = electricityHistory
  .filter(item => item && typeof item === "object")
  .slice(0, 10);

function saveAppliances() {
  return writeStorage("currentAppliances", appliances);
}

function saveHistory() {
  return writeStorage("electricityHistory", electricityHistory);
}

/* ===== ค่ากำลังไฟโดยประมาณ ===== */

const applianceWattSuggestions = {
  "พัดลม": 50,
  "โทรทัศน์": 100,
  "ตู้เย็น": 150,
  "เครื่องปรับอากาศ": 1200,
  "คอมพิวเตอร์ตั้งโต๊ะ": 200,
  "โน้ตบุ๊ก": 65,
  "แอร์ 9000 BTU": 800,
  "แอร์ 12000 BTU": 1100,
  "แอร์ 18000 BTU": 1600,
  "หลอดไฟ LED": 10,
  "หม้อหุงข้าว": 700,
  "ไมโครเวฟ": 1000,
  "เครื่องซักผ้า": 500,
  "เตารีด": 1000,
  "เครื่องทำน้ำอุ่น": 3500
};

const applianceNameInput = $("appliance");
const wattInput = $("watt");

applianceNameInput?.addEventListener("input", () => {
  const name = applianceNameInput.value.trim();

  if (Object.hasOwn(applianceWattSuggestions, name) && wattInput) {
    wattInput.value = applianceWattSuggestions[name];
  }
});

/* ===== คำแนะนำการประหยัดค่าไฟ ===== */

function renderSavingTips() {
  const tipsBox = $("saving-tips");
  if (!tipsBox) {
    console.warn('ไม่พบ element id="saving-tips" ใน index.html');
    return;
  }

  if (appliances.length === 0) {
    tipsBox.replaceChildren();

    const message = document.createElement("p");
    message.textContent = "เพิ่มเครื่องใช้ไฟฟ้าเพื่อรับคำแนะนำ";
    tipsBox.appendChild(message);
    return;
  }

  const names = appliances.map(item =>
    String(item.name || "").toLowerCase()
  );

  const tips = [
    {
      title: "ปิดเมื่อไม่ใช้งาน",
      detail: "ปิดเครื่องใช้ไฟฟ้าเมื่อไม่จำเป็นต้องใช้งาน"
    },
    {
      title: "ลดเวลาการใช้งาน",
      detail: "ตรวจสอบอุปกรณ์ที่เปิดทิ้งไว้ และลดเวลาที่ไม่จำเป็น"
    }
  ];

  function addTip(pattern, title, detail) {
    if (names.some(name => pattern.test(name))) {
      tips.push({ title, detail });
    }
  }

  addTip(
    /แอร์|เครื่องปรับอากาศ|air conditioner|aircon|\bac\b/,
    "เครื่องปรับอากาศ",
    "ลองตั้งอุณหภูมิประมาณ 26°C ปิดประตูหน้าต่างให้สนิท และล้างแผ่นกรองเป็นประจำ"
  );

  addTip(
    /คอม|คอมพิวเตอร์|computer|laptop|โน้ตบุ๊ก/,
    "คอมพิวเตอร์",
    "เปิดโหมดประหยัดพลังงาน และปิดเครื่องเมื่อเลิกใช้งาน"
  );

  addTip(
    /ทีวี|โทรทัศน์|television|\btv\b/,
    "โทรทัศน์",
    "ปิดทีวีเมื่อไม่มีคนดู และหลีกเลี่ยงการเปิดทิ้งไว้"
  );

  addTip(
    /หลอดไฟ|ไฟส่องสว่าง|โคมไฟ|led|light|lamp/,
    "แสงสว่าง",
    "ใช้แสงธรรมชาติเมื่อเหมาะสม และเลือกหลอด LED ที่มีประสิทธิภาพ"
  );

  addTip(
    /พัดลม|fan/,
    "พัดลม",
    "ปิดพัดลมเมื่อออกจากห้อง และเลือกระดับความแรงให้เหมาะสม"
  );

  addTip(
    /ตู้เย็น|refrigerator|fridge/,
    "ตู้เย็น",
    "ปิดประตูให้สนิท ลดการเปิดบ่อย และเว้นพื้นที่ระบายความร้อน"
  );

  addTip(
    /เครื่องทำน้ำอุ่น|water heater/,
    "เครื่องทำน้ำอุ่น",
    "ใช้เท่าที่จำเป็น และปิดเครื่องหลังใช้งาน"
  );

  addTip(
    /หม้อหุงข้าว|rice cooker/,
    "หม้อหุงข้าว",
    "หุงข้าวในปริมาณที่เหมาะสม และหลีกเลี่ยงการอุ่นทิ้งไว้นาน"
  );

  addTip(
    /ไมโครเวฟ|microwave/,
    "ไมโครเวฟ",
    "เลือกเวลาอุ่นให้เหมาะกับปริมาณอาหาร"
  );

  addTip(
    /เครื่องซักผ้า|washing machine/,
    "เครื่องซักผ้า",
    "ซักผ้าในปริมาณที่เหมาะสมกับความจุเครื่อง"
  );

  addTip(
    /เตารีด|iron/,
    "เตารีด",
    "รวบรวมผ้ารีดต่อเนื่องกัน เพื่อลดการเปิดเครื่องหลายครั้ง"
  );

  const heading = document.createElement("p");
  heading.textContent = `พบเครื่องใช้ไฟฟ้า ${appliances.length} รายการ`;

  const list = document.createElement("ul");

  tips.forEach(tip => {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    const detail = document.createElement("p");

    title.textContent = tip.title;
    detail.textContent = tip.detail;

    item.append(title, detail);
    list.appendChild(item);
  });

  tipsBox.replaceChildren(heading, list);
}

/* ===== แสดงรายการเครื่องใช้ไฟฟ้า ===== */

function renderAppliances() {
  const list = $("appliance-list");

  if (list) {
    if (appliances.length === 0) {
      list.innerHTML = "<p>ยังไม่มีเครื่องใช้ไฟฟ้าในรายการ</p>";
    } else {
      list.innerHTML = appliances.map((item, index) => `
        <div class="appliance-item">
          <div>
            <strong>${escapeHTML(item.name)}</strong>
            <p>${item.watt} W × ${item.hours} ชม./วัน × ${item.days} วัน</p>
            <p>ใช้ไฟ ${money(item.units)} หน่วย/เดือน · ${money(item.cost)} บาท/เดือน</p>
          </div>
          <button type="button" data-remove="${index}">ลบ</button>
        </div>
      `).join("");
    }
  }

  renderElectricityChart();
  updateSummary();
  renderSavingTips();
}

/* ===== เพิ่มเครื่องใช้ไฟฟ้า ===== */

$("calculate")?.addEventListener("click", () => {
  const name = applianceNameInput?.value.trim() ?? "";
  const wattText = wattInput?.value ?? "";
  const hoursText = $("hours")?.value ?? "";
  const daysText = $("days")?.value ?? "";
  const rateText = $("rate")?.value ?? "";

  const watt = Number(wattText);
  const hours = Number(hoursText);
  const days = Number(daysText);
  const rate = Number(rateText);

  if (
    !name ||
    wattText.trim() === "" || !Number.isFinite(watt) || watt <= 0 ||
    hoursText.trim() === "" || !Number.isFinite(hours) || hours <= 0 || hours > 24 ||
    daysText.trim() === "" || !Number.isFinite(days) || days < 1 || days > 31 ||
    rateText.trim() === "" || !Number.isFinite(rate) || rate < 0
  ) {
    showResult("กรุณากรอกชื่อ กำลังไฟ ชั่วโมง วัน และค่าไฟให้ถูกต้อง");
    return;
  }

  const units = watt * hours * days / 1000;
  const cost = units * rate;

  appliances.push({ name, watt, hours, days, rate, units, cost });

  saveAppliances();
  renderAppliances();

  showResult(
    `${name}: ใช้ไฟ ${money(units)} หน่วย ค่าไฟ ${money(cost)} บาท/เดือน`
  );
});

/* ===== ลบเครื่องใช้ไฟฟ้า ===== */

$("appliance-list")?.addEventListener("click", event => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;

  const index = Number(button.dataset.remove);

  if (!Number.isInteger(index) || index < 0 || index >= appliances.length) {
    return;
  }

  appliances.splice(index, 1);
  saveAppliances();
  renderAppliances();
  showResult("ลบรายการเรียบร้อยแล้ว");
});

/* ===== สรุปหน่วยไฟและค่าใช้จ่าย ===== */

function updateSummary() {
  const totalUnits = appliances.reduce(
    (sum, item) => sum + item.units,
    0
  );

  const totalCost = appliances.reduce(
    (sum, item) => sum + item.cost,
    0
  );

  if ($("summary-units")) {
    $("summary-units").textContent = money(totalUnits);
  }

  if ($("summary-cost")) {
    $("summary-cost").textContent = money(totalCost);
  }
}

/* ===== คำนวณค่าไฟรวมและบันทึกประวัติ ===== */

$("add-appliance")?.addEventListener("click", () => {
  const totalUnits = appliances.reduce((sum, item) => sum + item.units, 0);
  const totalCost = appliances.reduce((sum, item) => sum + item.cost, 0);

  const totalBill = $("total-bill");

  if (totalBill) {
    totalBill.textContent =
      `ค่าไฟรวมจากรายการเครื่องใช้ไฟฟ้า: ${money(totalCost)} บาท/เดือน`;
  }

  electricityHistory.unshift({
    date: new Date().toLocaleString("th-TH"),
    units: totalUnits,
    cost: totalCost
  });

  electricityHistory = electricityHistory.slice(0, 10);
  saveHistory();
  renderHistory();

  showResult("คำนวณค่าไฟรวมเรียบร้อยแล้ว");
});

/* ===== กราฟเปรียบเทียบค่าไฟ ===== */

function renderElectricityChart() {
  const chart = $("electricity-chart");
  if (!chart) return;

  if (appliances.length === 0) {
    chart.innerHTML = "<p>เพิ่มเครื่องใช้ไฟฟ้าเพื่อดูกราฟค่าไฟ</p>";
    return;
  }

  const sorted = [...appliances].sort((a, b) => b.cost - a.cost);
  const maxCost = Math.max(...sorted.map(item => item.cost), 0.01);

  chart.innerHTML = sorted.map(item => {
    const percentage = Math.max(
      0,
      Math.min(100, item.cost / maxCost * 100)
    );

    return `
      <div class="chart-row">
        <div class="chart-info">
          <span class="chart-name">${escapeHTML(item.name)}</span>
          <span class="chart-value">${money(item.cost)} บาท</span>
        </div>
        <div class="chart-track">
          <div class="chart-bar" style="width:${percentage}%"></div>
        </div>
      </div>
    `;
  }).join("");
}

/* ===== ประวัติการคำนวณ ===== */

function renderHistory() {
  const historyList = $("history-list");
  if (!historyList) return;

  if (electricityHistory.length === 0) {
    historyList.innerHTML = "<p>ยังไม่มีประวัติการคำนวณ</p>";
    return;
  }

  historyList.innerHTML = electricityHistory.map(item => `
    <div class="history-item">
      <p>${escapeHTML(item.date || "")}</p>
      <p>ใช้ไฟ ${money(item.units)} หน่วย</p>
      <strong>${money(item.cost)} บาท</strong>
    </div>
  `).join("");
}

$("clear-history")?.addEventListener("click", () => {
  electricityHistory = [];
  saveHistory();
  renderHistory();
  showResult("ล้างประวัติเรียบร้อยแล้ว");
});

/* ===== ประมาณการบิลค่าไฟ ===== */

function calculateProgressiveCharge(units) {
  const tiers = [
    { limit: 150, rate: 3.2484 },
    { limit: 400, rate: 4.2218 },
    { limit: Infinity, rate: 4.4217 }
  ];

  let remaining = units;
  let charge = 0;
  let previousLimit = 0;

  for (const tier of tiers) {
    const capacity = tier.limit - previousLimit;
    const tierUnits = Math.min(remaining, capacity);

    charge += tierUnits * tier.rate;
    remaining -= tierUnits;
    previousLimit = tier.limit;

    if (remaining <= 0) break;
  }

  return charge;
}

function calculateBillEstimate() {
  const unitsInput = $("monthly-units");
  const ftInput = $("ft-rate");
  const serviceInput = $("service-charge");

  if (!unitsInput || !ftInput || !serviceInput) return;

  const outputs = {
    units: $("bill-units"),
    base: $("bill-base"),
    ft: $("bill-ft"),
    service: $("bill-service"),
    beforeVat: $("bill-before-vat"),
    vat: $("bill-vat"),
    total: $("bill-total")
  };

  const units = Number(unitsInput.value);
  const ftRate = Number(ftInput.value);
  const service = Number(serviceInput.value);

  const valid =
    unitsInput.value.trim() !== "" &&
    ftInput.value.trim() !== "" &&
    serviceInput.value.trim() !== "" &&
    Number.isFinite(units) && units >= 0 &&
    Number.isFinite(ftRate) && ftRate >= 0 &&
    Number.isFinite(service) && service >= 0;

  if (!valid) {
    if (outputs.units) outputs.units.textContent = "กรุณาตรวจสอบข้อมูล";
    ["base", "ft", "service", "beforeVat", "vat", "total"].forEach(key => {
      if (outputs[key]) outputs[key].textContent = "—";
    });
    return;
  }

  const base = calculateProgressiveCharge(units);
  const ft = units * ftRate;
  const beforeVat = base + ft + service;
  const vat = beforeVat * 0.07;
  const total = beforeVat + vat;

  const values = {
    units: `${money(units)} หน่วย`,
    base: `${money(base)} บาท`,
    ft: `${money(ft)} บาท`,
    service: `${money(service)} บาท`,
    beforeVat: `${money(beforeVat)} บาท`,
    vat: `${money(vat)} บาท`,
    total: `${money(total)} บาท`
  };

  Object.entries(values).forEach(([key, value]) => {
    if (outputs[key]) outputs[key].textContent = value;
  });
}

["monthly-units", "ft-rate", "service-charge"].forEach(id => {
  $(id)?.addEventListener("input", calculateBillEstimate);
});

/* ===== เริ่มต้นระบบ ===== */

function initializeApp() {
  saveAppliances();
  renderHistory();
  renderAppliances();
  calculateBillEstimate();
}

initializeApp();
