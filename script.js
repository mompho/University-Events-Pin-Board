(function () {
  "use strict";

  const EVENTS_KEY = "pulse_events_v1";

  const CATEGORY_LABEL = { faculty: "Faculty", club: "Club", open: "Open to all" };

  /* ---------------- storage helpers ---------------- */
  function loadEvents() {
    try {
      return JSON.parse(localStorage.getItem(EVENTS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function saveEvents(list) {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(list));
  }

  /* ---------------- screen navigation ---------------- */
  const screens = {
    landing: document.getElementById("screen-landing"),
    student: document.getElementById("screen-student"),
    host: document.getElementById("screen-host"),
  };

  function showScreen(name) {
    Object.values(screens).forEach((el) => el.classList.remove("active"));
    screens[name].classList.add("active");
    window.scrollTo(0, 0);
  }

  /* ---------------- landing -> student / host ---------------- */
  document.querySelectorAll(".role-card").forEach((card) => {
    card.addEventListener("click", () => {
      const target = card.dataset.goto;
      if (target === "host") {
        renderHostGrid();
        showScreen("host");
      } else {
        renderStudentGrid();
        showScreen("student");
      }
    });
  });

  document.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", () => showScreen(btn.dataset.back));
  });

  /* ---------------- student grid ---------------- */
  let activeFilter = "all";
  document.getElementById("student-filters").addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    document.querySelectorAll("#student-filters .chip").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    renderStudentGrid();
  });

  function renderStudentGrid() {
    const grid = document.getElementById("student-grid");
    const empty = document.getElementById("student-empty");
    const all = loadEvents().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const list = activeFilter === "all" ? all : all.filter((ev) => ev.category === activeFilter);

    grid.innerHTML = "";
    if (list.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    list.forEach((ev) => grid.appendChild(buildTicketCard(ev, false)));
  }

  /* ---------------- host grid (shows every posted event) ---------------- */
  function renderHostGrid() {
    const grid = document.getElementById("host-grid");
    const empty = document.getElementById("host-empty");
    const all = loadEvents().sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    grid.innerHTML = "";
    if (all.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    all.forEach((ev) => grid.appendChild(buildTicketCard(ev, true)));
  }

  /* ---------------- ticket card builder ---------------- */
  function formatDate(dateStr, timeStr) {
    if (!dateStr) return "Date TBC";
    const d = new Date(dateStr + "T" + (timeStr || "00:00"));
    const dateFmt = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    return timeStr ? dateFmt + " · " + timeStr : dateFmt;
  }

  function categoryText(ev) {
    if (ev.category === "faculty" && ev.faculty) return ev.faculty;
    return CATEGORY_LABEL[ev.category] || ev.category;
  }

  function buildTicketCard(ev, ownerView) {
    const card = document.createElement("div");
    card.className = "ticket";

    if (ownerView) {
      const delBtn = document.createElement("button");
      delBtn.className = "ticket-host-btn";
      delBtn.setAttribute("aria-label", "Delete event");
      delBtn.textContent = "×";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm('Remove "' + ev.title + '"?')) {
          const remaining = loadEvents().filter((x) => x.id !== ev.id);
          saveEvents(remaining);
          renderHostGrid();
        }
      });
      card.appendChild(delBtn);
    }

    const img = document.createElement("img");
    img.className = "ticket-image";
    if (ev.image) img.src = ev.image;
    card.appendChild(img);

    const perf = document.createElement("div");
    perf.className = "ticket-perforation";
    card.appendChild(perf);

    const body = document.createElement("div");
    body.className = "ticket-body";

    const topRow = document.createElement("div");
    topRow.className = "ticket-top-row";
    const title = document.createElement("h3");
    title.className = "ticket-title";
    title.textContent = ev.title;
    const badge = document.createElement("span");
    badge.className = "badge badge-" + ev.category;
    badge.textContent = categoryText(ev);
    topRow.appendChild(title);
    topRow.appendChild(badge);

    const meta = document.createElement("p");
    meta.className = "ticket-meta";
    meta.textContent = formatDate(ev.date, ev.time) + " · " + ev.location;

    const desc = document.createElement("p");
    desc.className = "ticket-desc";
    desc.textContent = ev.description;

    const bottomRow = document.createElement("div");
    bottomRow.className = "ticket-bottom-row";
    const fee = document.createElement("span");
    if (ev.feeType === "paid" && ev.feeAmount) {
      fee.className = "fee-tag";
      fee.textContent = "R" + Number(ev.feeAmount).toFixed(2);
    } else {
      fee.className = "fee-tag is-free";
      fee.textContent = "Free";
    }
    const host = document.createElement("span");
    host.className = "ticket-meta";
    host.textContent = ev.hostName;
    bottomRow.appendChild(fee);
    bottomRow.appendChild(host);

    body.appendChild(topRow);
    body.appendChild(meta);
    body.appendChild(desc);
    body.appendChild(bottomRow);
    card.appendChild(body);

    card.addEventListener("click", () => openDetail(ev));
    return card;
  }

  /* ---------------- detail modal ---------------- */
  const detailOverlay = document.getElementById("detail-overlay");
  function openDetail(ev) {
    document.getElementById("detail-image").src = ev.image || "";
    const catBadge = document.getElementById("detail-category");
    catBadge.className = "badge badge-" + ev.category;
    catBadge.textContent = categoryText(ev);
    document.getElementById("detail-title").textContent = ev.title;
    document.getElementById("detail-meta").textContent = formatDate(ev.date, ev.time);
    document.getElementById("detail-desc").textContent = ev.description;
    document.getElementById("detail-location").textContent = ev.location;
    document.getElementById("detail-fee").textContent =
      ev.feeType === "paid" && ev.feeAmount ? "R" + Number(ev.feeAmount).toFixed(2) : "Free";
    document.getElementById("detail-host").textContent = ev.hostName;
    detailOverlay.hidden = false;
  }
  document.getElementById("close-detail-btn").addEventListener("click", () => (detailOverlay.hidden = true));
  detailOverlay.addEventListener("click", (e) => {
    if (e.target === detailOverlay) detailOverlay.hidden = true;
  });

  /* ---------------- host: new event form ---------------- */
  const formOverlay = document.getElementById("form-overlay");
  const eventForm = document.getElementById("event-form");
  let uploadedImageData = "";

  function syncFacultyFieldVisibility() {
    const isFaculty = document.getElementById("ev-category").value === "faculty";
    document.getElementById("ev-faculty-field").style.display = isFaculty ? "flex" : "none";
  }
  document.getElementById("ev-category").addEventListener("change", syncFacultyFieldVisibility);

  document.getElementById("open-form-btn").addEventListener("click", () => {
    eventForm.reset();
    uploadedImageData = "";
    document.getElementById("upload-preview").hidden = true;
    document.getElementById("upload-placeholder").hidden = false;
    document.getElementById("ev-fee-amount").hidden = true;
    document.getElementById("ev-fee-amount").value = "";
    syncFacultyFieldVisibility();
    formOverlay.hidden = false;
  });
  document.getElementById("close-form-btn").addEventListener("click", () => (formOverlay.hidden = true));
  formOverlay.addEventListener("click", (e) => {
    if (e.target === formOverlay) formOverlay.hidden = true;
  });

  const uploadBox = document.getElementById("upload-box");
  const imageInput = document.getElementById("ev-image");
  uploadBox.addEventListener("click", () => imageInput.click());
  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      uploadedImageData = reader.result;
      const preview = document.getElementById("upload-preview");
      preview.src = uploadedImageData;
      preview.hidden = false;
      document.getElementById("upload-placeholder").hidden = true;
    };
    reader.readAsDataURL(file);
  });

  document.querySelectorAll('input[name="ev-fee-type"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const isPaid = document.querySelector('input[name="ev-fee-type"]:checked').value === "paid";
      document.getElementById("ev-fee-amount").hidden = !isPaid;
    });
  });

  eventForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const feeType = document.querySelector('input[name="ev-fee-type"]:checked').value;
    const category = document.getElementById("ev-category").value;
    const ev = {
      id: "ev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      hostName: document.getElementById("ev-host").value.trim(),
      title: document.getElementById("ev-title").value.trim(),
      image: uploadedImageData,
      description: document.getElementById("ev-desc").value.trim(),
      location: document.getElementById("ev-location").value.trim(),
      date: document.getElementById("ev-date").value,
      time: document.getElementById("ev-time").value,
      category: category,
      faculty: category === "faculty" ? document.getElementById("ev-faculty").value : "",
      feeType: feeType,
      feeAmount: feeType === "paid" ? document.getElementById("ev-fee-amount").value : "",
      createdAt: Date.now(),
    };
    const list = loadEvents();
    list.push(ev);
    saveEvents(list);
    formOverlay.hidden = true;
    renderHostGrid();
  });

  /* ---------------- start on landing ---------------- */
  showScreen("landing");
})();