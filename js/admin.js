/* ═══════════ Admin dashboard ═══════════
   Reads and writes through the same Apps Script backend. The admin key is
   held in sessionStorage only — never written to disk, never in the repo. */

const backendReady = () => GV_SCRIPT_URL.startsWith("https://");
let KEY = sessionStorage.getItem("gv_admin_key") || "";
let DATA = { items: [], claims: [] };
let STROKES = [];
let view = "rsvp";
let rsvpFilter = "all";
let rsvpSearch = "";

const $ = id => document.getElementById(id);
const esc = s => String(s === null || s === undefined ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const naira = n => (n ? "₦" + Number(n).toLocaleString("en-NG") : "—");

function api(params) {
  const url = new URL(GV_SCRIPT_URL);
  Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));
  url.searchParams.set("key", KEY);
  return fetch(url).then(r => r.json());
}

/* ── Gate ── */
$("adGateForm").addEventListener("submit", async e => {
  e.preventDefault();
  const note = $("adGateNote");
  if (!backendReady()) {
    note.textContent = "Set GV_SCRIPT_URL in js/config.js first.";
    note.className = "form-note error";
    return;
  }
  KEY = $("adKey").value.trim();
  note.textContent = "Checking…";
  note.className = "form-note";
  const out = await api({ action: "admin" }).catch(() => ({ ok: false }));
  if (!out.ok) {
    note.textContent = "That key was not accepted.";
    note.className = "form-note error";
    KEY = "";
    return;
  }
  sessionStorage.setItem("gv_admin_key", KEY);
  DATA = out;
  showShell();
});

$("adLock").addEventListener("click", () => {
  sessionStorage.removeItem("gv_admin_key");
  location.reload();
});
$("adRefresh").addEventListener("click", refresh);

function showShell() {
  $("adGate").hidden = true;
  $("adShell").hidden = false;
  render();
  syncNav();
  loadStrokes();
}

async function refresh() {
  const out = await api({ action: "admin" }).catch(() => ({ ok: false }));
  if (out.ok) { DATA = out; render(); }
}

/* ── Tabs ── */
/* The gift totals only mean anything on the gift tabs; on RSVPs or Moderation
   they were just pushing the actual content off a phone screen. */
const GIFT_VIEWS = ["board", "unconfirmed", "received", "links"];

function syncNav() {
  const active = $("adTabs").querySelector(".ad-tab.active");
  // the count chip is decoration — the label is the first text node
  if (active) $("adNavLabel").textContent = (active.childNodes[0].textContent || "").trim();
  $("adStats").hidden = GIFT_VIEWS.indexOf(view) === -1;
  closeNav();
}
function closeNav() {
  $("adTabs").classList.remove("open");
  $("adNavToggle").setAttribute("aria-expanded", "false");
}

$("adNavToggle").addEventListener("click", () => {
  const open = $("adTabs").classList.toggle("open");
  $("adNavToggle").setAttribute("aria-expanded", open ? "true" : "false");
});

$("adTabs").querySelectorAll(".ad-tab").forEach(btn =>
  btn.addEventListener("click", () => {
    view = btn.dataset.view;
    $("adTabs").querySelectorAll(".ad-tab").forEach(b => b.classList.toggle("active", b === btn));
    ["rsvp", "board", "unconfirmed", "received", "links", "canvas", "moderation"].forEach(v =>
      $("view" + v.charAt(0).toUpperCase() + v.slice(1)).hidden = v !== view);
    if (view === "canvas") drawPreview();
    syncNav();
  }));

// close the menu when tapping outside it
document.addEventListener("click", e => {
  if (!$("adTabs").classList.contains("open")) return;
  if ($("adTabs").contains(e.target) || $("adNavToggle").contains(e.target)) return;
  closeNav();
});

/* ── Rendering ── */
const LIVE = ["held", "ordered", "received"];
const itemName = id => (DATA.items.find(i => i.id === id) || {}).name || id;

function render() {
  const claims = DATA.claims || [];
  const held = claims.filter(c => c.status === "held");
  const ordered = claims.filter(c => c.status === "ordered");
  const received = claims.filter(c => c.status === "received");
  const pledged = claims.filter(c => LIVE.indexOf(c.status) >= 0).reduce((sum, c) => {
    const it = DATA.items.find(i => i.id === c.itemId);
    if (!it) return sum;
    const q = c.qty || 1;
    // covering every share of an item is the item's price, not q x rounded share
    if (it.shares > 1 && q === it.shares) return sum + it.price;
    return sum + (it.shares > 1 ? Math.ceil(it.price / it.shares) * q : it.price);
  }, 0);

  $("adStats").innerHTML = [
    ["On hold", held.length], ["Ordered", ordered.length], ["Received", received.length],
    ["Givers", new Set(claims.filter(c => LIVE.indexOf(c.status) >= 0).map(c => c.email)).size],
    ["Pledged", naira(pledged)],
  ].map(s => `<div class="ad-stat"><b>${s[1]}</b><span>${s[0]}</span></div>`).join("");

  $("adCountUnconfirmed").textContent = held.length ? "· " + held.length : "";
  const recCount = ordered.length + received.length;
  if ($("adCountRec")) $("adCountRec").textContent = recCount ? "· " + recCount : "";
  const stale = DATA.items.filter(i => i.active && (i.staleDays === null || i.staleDays > 30 || !i.price));
  $("adCountLinks").textContent = stale.length ? "· " + stale.length : "";

  /* Board */
  $("viewBoard").innerHTML = DATA.items.length ? DATA.items.map(it => {
    const live = claims.filter(c => c.itemId === it.id && LIVE.indexOf(c.status) >= 0);
    const pct = Math.round(Math.min(live.length, it.shares) / it.shares * 100);
    const who = live.length
      ? live.map(c => esc(c.name) + (c.status !== "held" ? " (" + c.status + ")" : "")).join(", ")
      : "Open";
    return `<div class="ad-row">
      <div class="ad-row-main">
        <div class="ad-row-title">${esc(it.name)}${it.active ? "" : " <span class='ad-pill'>retired</span>"}</div>
        <div class="ad-row-sub">${esc(it.vendor)} · ${naira(it.price)}${it.shares > 1 ? ` · ${live.length}/${it.shares} shares` : ""} · ${who}</div>
        ${it.shares > 1 ? `<div class="ad-bar"><i style="width:${pct}%"></i></div>` : ""}
      </div>
      <span class="ad-pill ${live.length >= it.shares ? "received" : "held"}">${live.length >= it.shares ? "Closed" : "Open"}</span>
    </div>`;
  }).join("") : `<p class="ad-empty">No registry items yet — run seedRegistry() in the Apps Script editor.</p>`;

  /* Unconfirmed */
  $("viewUnconfirmed").innerHTML = held.length
    ? held.sort((a, b) => b.ageDays - a.ageDays).map(c => rowHtml(c, [
        `<button class="btn btn-outline sm" data-mail="nudge" data-row="${c.row}" data-token="${esc(c.token || "")}">Send gentle check-in</button>`,
        `<button class="btn btn-outline sm" data-op="ordered" data-row="${c.row}" data-token="${esc(c.token || "")}">Mark ordered</button>`,
        `<button class="btn btn-outline sm" data-op="release" data-row="${c.row}" data-token="${esc(c.token || "")}">Release hold</button>`,
      ])).join("")
    : `<p class="ad-empty">Nothing waiting.${ordered.length + received.length
        ? ` Once a guest taps &ldquo;I have done this&rdquo;, their gift moves to <strong>Ordered &amp; received</strong> &mdash; that is where you release it.`
        : ""}</p>`;

  /* Received */
  const arrivals = claims.filter(c => c.status === "ordered" || c.status === "received");
  $("viewReceived").innerHTML = arrivals.length
    ? arrivals.map(c => rowHtml(c, (c.status === "ordered"
        ? [`<button class="btn btn-light sm" data-op="received" data-row="${c.row}" data-token="${esc(c.token || "")}">Mark received</button>`]
        : [`<button class="btn btn-outline sm" data-mail="thanks" data-row="${c.row}" data-token="${esc(c.token || "")}">Send thank-you</button>`]
      ).concat([`<button class="btn btn-outline sm" data-op="release" data-row="${c.row}" data-token="${esc(c.token || "")}">Release</button>`]))).join("")
    : `<p class="ad-empty">Nothing ordered yet. Gifts appear here once a guest confirms they have bought or sent it.</p>`;

  /* Link health */
  $("viewLinks").innerHTML = stale.length
    ? stale.map(it => `<div class="ad-row">
        <div class="ad-row-main">
          <div class="ad-row-title">${esc(it.name)}</div>
          <div class="ad-row-sub">${!it.price ? "No price set. " : ""}${it.staleDays === null ? "Never verified." : "Last checked " + it.staleDays + " days ago."}</div>
        </div>
        <a class="btn btn-outline sm" href="${esc(it.url)}" target="_blank" rel="noopener">Open ↗</a>
      </div>`).join("")
    : `<p class="ad-empty">All links checked recently and priced.</p>`;

  /* RSVPs — the guest list, and the thing the couple check most often */
  const rsvps = DATA.rsvps || [];
  const yes = rsvps.filter(r => /accept/i.test(r.attending));
  const no = rsvps.filter(r => /decline/i.test(r.attending));
  const dups = rsvps.filter(r => r.dup);
  $("adCountRsvp").textContent = rsvps.length ? "· " + rsvps.length : "";

  const q = rsvpSearch.trim().toLowerCase();
  const shown = rsvps.filter(r => {
    if (rsvpFilter === "yes" && !/accept/i.test(r.attending)) return false;
    if (rsvpFilter === "no" && !/decline/i.test(r.attending)) return false;
    if (rsvpFilter === "dups" && !r.dup) return false;
    if (!q) return true;
    return [r.firstName, r.lastName, r.email, r.phone, r.side, r.relationship]
      .join(" ").toLowerCase().includes(q);
  });

  const chip = (key, label, n) =>
    `<button class="registry-filter${rsvpFilter === key ? " active" : ""}" type="button" data-rsvpf="${key}">${label}${n !== undefined ? ` (${n})` : ""}</button>`;

  // Only offer the switch if the deployed backend actually supports it —
  // a button that looks live but silently fails is worse than no button.
  const st = DATA.settings;
  const rsvpSwitch = !st ? "" : `
    <div class="ad-switch ${st.rsvpOpen ? "on" : "off"}">
      <div class="ad-switch-main">
        <b>${st.rsvpOpen ? "RSVPs are open" : "RSVPs are closed"}</b>
        <span>${st.rsvpOpen
          ? "Guests can submit the form on the website."
          : "The form is disabled and the backend refuses new replies."}</span>
      </div>
      <button class="btn ${st.rsvpOpen ? "btn-outline" : "btn-light"} sm" type="button" id="adRsvpToggle">
        ${st.rsvpOpen ? "Close RSVPs" : "Reopen RSVPs"}
      </button>
    </div>
    ${st.rsvpOpen ? "" : `<label class="ad-field" style="max-width:560px">
        <span>Message shown to guests</span>
        <input type="text" id="adRsvpMsg" class="ad-search" style="width:100%;border-radius:4px"
          placeholder="RSVPs are now closed…" value="${esc(st.rsvpClosedMsg || "")}">
      </label>`}`;

  $("viewRsvp").innerHTML = rsvpSwitch + (rsvps.length ? `
    <div class="ad-stats" style="margin-bottom:1.4rem">
      <div class="ad-stat"><b>${yes.length}</b><span>Attending</span></div>
      <div class="ad-stat"><b>${no.length}</b><span>Cannot come</span></div>
      <div class="ad-stat"><b>${rsvps.length}</b><span>Total replies</span></div>
      <div class="ad-stat"><b>${rsvps.filter(r => /bride/i.test(r.side)).length}</b><span>Bride's side</span></div>
      <div class="ad-stat"><b>${rsvps.filter(r => /groom/i.test(r.side)).length}</b><span>Groom's side</span></div>
    </div>
    <div class="registry-head" style="margin-bottom:1.2rem">
      <div class="registry-filters">
        ${chip("all", "Everyone", rsvps.length)}${chip("yes", "Attending", yes.length)}${chip("no", "Cannot come", no.length)}${dups.length ? chip("dups", "Duplicates", dups.length) : ""}
      </div>
      <div class="ad-rsvp-tools">
        <input type="search" id="adRsvpSearch" class="ad-search" placeholder="Search name, email, phone…" value="${esc(rsvpSearch)}">
        <button class="btn btn-outline sm" type="button" id="adRsvpCsv">Download CSV</button>
      </div>
    </div>
    ${shown.length ? shown.map(r => `<div class="ad-row">
      <div class="ad-row-main">
        <div class="ad-row-title">${esc(r.firstName)} ${esc(r.lastName)}${r.dup ? ` <span class="ad-qty" style="color:var(--terracotta)">duplicate email</span>` : ""}</div>
        <div class="ad-row-sub">${esc(r.email)}${r.phone ? " · " + esc(r.phone) : ""}${r.side ? " · guest of " + esc(r.side) : ""}${r.relationship ? " · " + esc(r.relationship) : ""} · ${esc(r.when)}</div>
      </div>
      <span class="ad-pill ${/accept/i.test(r.attending) ? "received" : "released"}">${/accept/i.test(r.attending) ? "attending" : "declined"}</span>
      <div class="ad-row-acts">
        <a class="btn btn-outline sm" href="mailto:${esc(r.email)}">Email</a>
        <button class="btn btn-outline sm ad-danger" data-mod="drop" data-kind="rsvp" data-row="${r.row}" data-label="${esc(r.firstName + " " + r.lastName)}'s RSVP">Delete</button>
      </div>
    </div>`).join("") : `<p class="ad-empty">No RSVPs match that.</p>`}`
    : `<p class="ad-empty">No RSVPs yet. They appear here the moment a guest submits the form.</p>`);

  /* Moderation — everything a guest can post, so a test run leaves nothing behind */
  const wishes = DATA.wishes || [];
  const strokes = DATA.strokes || [];
  $("adCountMod").textContent = (wishes.length + strokes.length) ? "· " + (wishes.length + strokes.length) : "";

  const modRow = (kind, r, title, sub) => `<div class="ad-row${r.hidden ? " ad-dim" : ""}">
      <div class="ad-row-main">
        <div class="ad-row-title">${title}</div>
        <div class="ad-row-sub">${sub}</div>
      </div>
      ${r.hidden ? `<span class="ad-pill">hidden</span>` : ""}
      <div class="ad-row-acts">
        <button class="btn btn-outline sm" data-mod="${r.hidden ? "show" : "hide"}" data-kind="${kind}" data-row="${r.row}">${r.hidden ? "Show" : "Hide"}</button>
        <button class="btn btn-outline sm ad-danger" data-mod="drop" data-kind="${kind}" data-row="${r.row}" data-label="${esc(r.name || "this entry")}">Delete</button>
      </div>
    </div>`;

  $("viewModeration").innerHTML =
    `<p class="ad-muted ad-fine">Hide keeps an entry but takes it off the site. Delete removes it permanently &mdash; use that to clear your own test entries.</p>`
    + `<h3 style="margin-top:1.6rem">Wish Wall <span class="ad-muted">(${wishes.length})</span></h3>`
    + (wishes.length ? wishes.map(w => modRow("wish", w,
        `${esc(w.name || "Anonymous")}${w.hasPhoto ? ` <span class="ad-qty">photo</span>` : ""}`,
        `${esc((w.message || "").slice(0, 90))}${(w.message || "").length > 90 ? "…" : ""} · ${esc(w.when)}`)).join("")
      : `<p class="ad-empty">No wishes yet.</p>`)
    + `<h3 style="margin-top:2rem">Canvas signatures <span class="ad-muted">(${strokes.length})</span></h3>`
    + (strokes.length ? strokes.map(st => modRow("stroke", st,
        esc(st.name || "Unsigned"),
        `${st.points} points · <span style="color:${esc(st.color)}">■</span> ${esc(st.color)} · ${esc(st.when)}`)).join("")
      : `<p class="ad-empty">No signatures yet.</p>`);

  wireRowButtons();
}

function rowHtml(c, actions) {
  return `<div class="ad-row">
    <div class="ad-row-main">
      <div class="ad-row-title">${esc(c.name)} — ${esc(itemName(c.itemId))}${c.qty > 1 ? ` <span class="ad-qty">${c.qty} shares</span>` : ""}</div>
      <div class="ad-row-sub">${esc(c.email)}${c.phone ? " · " + esc(c.phone) : ""} · ${c.ageDays} day${c.ageDays === 1 ? "" : "s"} ago${c.nudged ? " · nudged " + esc(c.nudged) : ""}${c.showName ? "" : " · name hidden"}</div>
      ${c.message ? `<div class="ad-msg">“${esc(c.message)}”</div>` : ""}
    </div>
    <span class="ad-pill ${esc(c.status)}">${esc(c.status)}</span>
    <div class="ad-row-acts">${actions.join("")}</div>
  </div>`;
}

function wireRowButtons() {
  document.querySelectorAll("[data-op]").forEach(b => b.addEventListener("click", async () => {
    b.disabled = true;
    const out = await api({ action: "op", op: b.dataset.op, row: b.dataset.row, token: b.dataset.token || "" }).catch(() => ({ ok: false }));
    if (out.ok) await refresh(); else b.disabled = false;
  }));
  document.querySelectorAll("[data-mail]").forEach(b =>
    b.addEventListener("click", () => openMail(b.dataset.mail, Number(b.dataset.row))));

  const toggle = $("adRsvpToggle");
  if (toggle) toggle.addEventListener("click", async () => {
    const open = (DATA.settings || {}).rsvpOpen;
    if (open && !confirm("Close RSVPs? Guests will no longer be able to submit the form.")) return;
    toggle.disabled = true;
    const out = await api({ action: "op", op: "setting", key: "rsvpOpen", value: open ? "no" : "yes" })
      .catch(() => ({ ok: false }));
    if (out.ok) await refresh(); else toggle.disabled = false;
  });

  const msgBox = $("adRsvpMsg");
  if (msgBox) {
    let t;
    msgBox.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        await api({ action: "op", op: "setting", key: "rsvpClosedMsg", value: msgBox.value }).catch(() => {});
        if (DATA.settings) DATA.settings.rsvpClosedMsg = msgBox.value;   // keep without re-rendering mid-type
      }, 700);
    });
  }

  document.querySelectorAll("[data-rsvpf]").forEach(b =>
    b.addEventListener("click", () => { rsvpFilter = b.dataset.rsvpf; render(); }));

  const searchBox = $("adRsvpSearch");
  if (searchBox) {
    searchBox.addEventListener("input", () => {
      rsvpSearch = searchBox.value;
      const pos = searchBox.selectionStart;
      render();
      const again = $("adRsvpSearch");
      if (again) { again.focus(); again.setSelectionRange(pos, pos); }
    });
  }

  const csvBtn = $("adRsvpCsv");
  if (csvBtn) csvBtn.addEventListener("click", () => downloadRsvpCsv());

  document.querySelectorAll("[data-mod]").forEach(b => b.addEventListener("click", async () => {
    // deleting is permanent, so make them mean it
    if (b.dataset.mod === "drop" && !confirm(`Permanently delete ${b.dataset.label}? This cannot be undone.`)) return;
    b.disabled = true;
    const out = await api({ action: "op", op: b.dataset.mod, kind: b.dataset.kind, row: b.dataset.row })
      .catch(() => ({ ok: false }));
    if (out.ok) { await refresh(); if (view === "canvas") loadStrokes(); }
    else b.disabled = false;
  }));
}

/* ── Email composer — every send is a deliberate click ── */
const TEMPLATES = {
  nudge: c => ({
    subject: "Just checking in 💛",
    body: `Hello ${c.name.split(" ")[0]},\n\nWe hope you are well! We are only writing to say thank you again for choosing the ${itemName(c.itemId)} from our registry — it meant a lot to us.\n\nThere is genuinely no rush and no pressure at all. If you have already sorted it, just ignore this note. And if you would rather pick something else, or nothing at all, that is completely fine too — simply reply and let us know.\n\nWith love,\nGabriella & Victor`,
  }),
  thanks: c => ({
    subject: "It arrived — thank you 💛",
    body: `Dear ${c.name.split(" ")[0]},\n\nThe ${itemName(c.itemId)} arrived safely, and we could not be more grateful. Thank you for thinking of us as we start this chapter — it will be used and loved for years.\n\nWe cannot wait to celebrate with you.\n\nWith all our love,\nGabriella & Victor`,
  }),
};
let mailRow = null;
let mailToken = "";

function openMail(kind, row) {
  const c = DATA.claims.find(x => x.row === row);
  if (!c) return;
  const t = TEMPLATES[kind](c);
  mailRow = row;
  mailToken = c.token || "";
  $("adMailKind").textContent = kind === "nudge" ? "Gentle check-in" : "Thank you";
  $("adMailTo").textContent = "To " + c.name + " · " + c.email;
  $("adMailSubject").value = t.subject;
  $("adMailBody").value = t.body;
  $("adMailNote").textContent = "";
  $("adMailForm").dataset.kind = kind;
  $("adMailModal").hidden = false;
}
$("adMailClose").addEventListener("click", () => { $("adMailModal").hidden = true; });
$("adMailModal").addEventListener("click", e => { if (e.target === $("adMailModal")) $("adMailModal").hidden = true; });
$("adMailForm").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = $("adMailSend");
  btn.disabled = true;
  $("adMailNote").textContent = "Sending…";
  $("adMailNote").className = "form-note";
  const out = await api({
    action: "op", op: $("adMailForm").dataset.kind, row: mailRow, token: mailToken || "",
    subject: $("adMailSubject").value, body: $("adMailBody").value,
  }).catch(() => ({ ok: false }));
  btn.disabled = false;
  if (out.ok) {
    $("adMailModal").hidden = true;
    refresh();
  } else {
    $("adMailNote").textContent = out.error || "Could not send — please try again.";
    $("adMailNote").className = "form-note error";
  }
});

/** Hand the planner or caterer a spreadsheet without giving them Sheet access. */
function downloadRsvpCsv() {
  const rows = DATA.rsvps || [];
  if (!rows.length) return;
  const cell = v => {
    const s = String(v === null || v === undefined ? "" : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const head = ["Date", "First name", "Last name", "Email", "Phone", "Guest of", "Attending", "Relationship"];
  const body = rows.map(r => [r.when, r.firstName, r.lastName, r.email, r.phone, r.side, r.attending, r.relationship].map(cell).join(","));
  // BOM so Excel opens UTF-8 names correctly
  const blob = new Blob(["\ufeff" + [head.join(","), ...body].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "rsvps-" + stamp() + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}

/* ═══════════ Canvas export ═══════════ */

async function loadStrokes() {
  try {
    const res = await fetch(GV_SCRIPT_URL + "?type=strokes");
    const data = await res.json();
    if (Array.isArray(data)) STROKES = data;
  } catch (err) { /* leave empty */ }
  drawPreview();
}

function exportOpts(width) {
  return {
    width,
    signatures: $("cxSignatures").checked,
    rollCall: $("cxRoll").checked,
    paper: $("cxPaper").checked,
    title: "The Third Canvas",
    subtitle: "Gabriella & Victor",
    date: "24th October 2026",
    hashtag: "#HisGlory26",
  };
}

/** Google Fonts loads Caveat lazily; drawing before it is ready silently
    falls back to a default face. This is the classic canvas-text bug. */
async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load('40px "Caveat"'),
      document.fonts.load('40px "Cormorant Garamond"'),
      document.fonts.load('40px "Jost"'),
    ]);
    await document.fonts.ready;
  } catch (err) { /* proceed with fallbacks */ }
}

async function drawPreview() {
  if (!$("cxPreview")) return;
  await fontsReady();
  const out = CanvasExport.render($("cxPreview"), STROKES, exportOpts(900));
  const names = out.names.length;
  $("cxStats").textContent = STROKES.length
    ? `${STROKES.length} stroke${STROKES.length === 1 ? "" : "s"} · ${names} contributor${names === 1 ? "" : "s"}`
      + (out.skipped ? ` · ${out.skipped} signature${out.skipped === 1 ? "" : "s"} omitted for space (all names still appear in the roll call)` : "")
    : "No strokes painted yet.";
  showOutputSize();
}

/** The canvas grows taller as the roll call grows, so the real pixel area is
    not knowable from the preset alone — show it, and flag the iOS ceiling. */
const IOS_AREA_LIMIT = 16.7e6;
function showOutputSize() {
  const w = Number($("cxSize").value);
  const probe = document.createElement("canvas");
  const out = CanvasExport.render(probe, STROKES, exportOpts(w));
  const mp = out.width * out.height / 1e6;
  const el = $("cxOut");
  if (!el) return;
  el.textContent = `Output: ${out.width} × ${out.height}px (${mp.toFixed(1)} MP)`;
  el.classList.toggle("ad-warn", mp > IOS_AREA_LIMIT / 1e6);
  $("cxNote").textContent = mp > IOS_AREA_LIMIT / 1e6
    ? "This is above what iPhones can render — export it from a laptop, or use SVG (no size limit)."
    : "";
  $("cxNote").className = mp > IOS_AREA_LIMIT / 1e6 ? "form-note error" : "form-note";
}
["cxSignatures", "cxRoll", "cxPaper"].forEach(id => $(id).addEventListener("change", drawPreview));
$("cxHidden").addEventListener("change", drawPreview); // reserved: needs an admin strokes feed
$("cxSize").addEventListener("change", showOutputSize);

function stamp() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function deliver(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // iOS Safari ignores the download attribute — give them something to save
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
  if (isIOS) window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

$("cxPng").addEventListener("click", async () => {
  const note = $("cxNote");
  if (!STROKES.length) { note.textContent = "Nothing to export yet."; note.className = "form-note error"; return; }
  const width = Number($("cxSize").value);
  note.textContent = "Rendering…";
  note.className = "form-note";
  await fontsReady();
  try {
    const c = document.createElement("canvas");
    const out = CanvasExport.render(c, STROKES, exportOpts(width));
    c.toBlob(blob => {
      // a browser that exceeded its canvas area limit hands back null or a stub
      if (!blob || blob.size < 5000) {
        note.textContent = `That size was too large for this browser (${out.width}×${out.height}). Try a smaller one, or export from a laptop.`;
        note.className = "form-note error";
        return;
      }
      deliver(blob, "third-canvas-" + stamp() + ".png");
      note.textContent = `Downloaded — ${out.width}×${out.height}px, ${(blob.size / 1048576).toFixed(1)} MB`
        + (out.skipped ? `, ${out.skipped} signature(s) omitted for space` : "");
      note.className = "form-note success";
    }, "image/png");
  } catch (err) {
    note.textContent = "Export failed at that size — try a smaller one.";
    note.className = "form-note error";
  }
});

$("cxSvg").addEventListener("click", async () => {
  const note = $("cxNote");
  if (!STROKES.length) { note.textContent = "Nothing to export yet."; note.className = "form-note error"; return; }
  note.textContent = "Building SVG…";
  note.className = "form-note";
  await fontsReady();
  const fontCss = await embedFont();
  const out = CanvasExport.toSVG(STROKES, Object.assign(exportOpts(Number($("cxSize").value)), { fontCss }), document.createElement("canvas"));
  deliver(new Blob([out.svg], { type: "image/svg+xml" }), "third-canvas-" + stamp() + ".svg");
  note.textContent = `Downloaded — ${out.width}×${out.height}, scales to any print size`
    + (fontCss ? ", handwriting font embedded" : " (font not embedded — tell your printer it uses Caveat)");
  note.className = "form-note success";
});

/** Inline Caveat as base64 so the SVG keeps its handwriting off this machine. */
async function embedFont() {
  try {
    const cssRes = await fetch("https://fonts.googleapis.com/css2?family=Caveat&display=swap");
    const css = await cssRes.text();
    const m = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/.exec(css);
    if (!m) return "";
    const buf = await (await fetch(m[1])).arrayBuffer();
    let bin = "";
    new Uint8Array(buf).forEach(b => { bin += String.fromCharCode(b); });
    return `@font-face{font-family:"Caveat";src:url(data:font/woff2;base64,${btoa(bin)}) format("woff2");}\n`;
  } catch (err) {
    return "";
  }
}

/* Auto-unlock if the key is still in this session */
if (KEY && backendReady()) {
  api({ action: "admin" }).then(out => {
    if (out.ok) { DATA = out; showShell(); }
    else sessionStorage.removeItem("gv_admin_key");
  }).catch(() => {});
}
