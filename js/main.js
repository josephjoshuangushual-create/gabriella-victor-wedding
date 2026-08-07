/* ═══════════ Gabriella & Victor — site config ═══════════
   Everything the couple may change lives here. Swap the
   placeholder values below when details are confirmed.  */

const CONFIG = {
  // PLACEHOLDER date — update when the couple confirms (ISO format, WAT = +01:00)
  weddingDate: "2026-12-12T10:00:00+01:00",
  weddingDateLabel: "Date to be announced · Lagos, Nigeria",
  hashtag: "#OfGraceAndLove",

  // Google Apps Script Web App URL — paste the real URL after deploying
  // apps-script/Code.gs (see README). Leave as-is until then.
  scriptUrl: "PASTE_APPS_SCRIPT_URL_HERE",

  plannerEmail: "hello@example.com", // PLACEHOLDER

  schedule: {
    churchDate: "To be announced",
    churchVenue: "To be announced",
    churchDress: "To be announced",
    receptionDate: "To be announced",
    receptionVenue: "To be announced",
    receptionNote: "Details coming soon — check back after you RSVP.",
  },

  // Colors of the day (PLACEHOLDER — drawn from the pre-wedding shoot palette)
  colors: [
    { name: "Sage Green", hex: "#9caf88" },
    { name: "Terracotta", hex: "#c1683c" },
  ],

  // Gift accounts (PLACEHOLDER — replace with real details)
  gifts: [
    { title: "Bank Transfer (Naira)", bank: "Bank name coming soon", account: "0000000000", holder: "Account name" },
  ],

  // The 12 curated moments shown first (focal = first entry, ring = the rest)
  curatedMoments: [
    "VSP_4677.jpg","VSP_4423.jpg","VSP_4787.jpg","VSP_5003.jpg","VSP_4394.jpg",
    "VSP_4502.jpg","VSP_4547.jpg","VSP_4583.jpg","VSP_4601.jpg","VSP_5018.jpg",
    "VSP_5248.jpg","VSP_5337.jpg","VSP_4472.jpg",
  ],
  // The rest of the editorial shoot — pops into the orbit over time
  orbitPool: [
    "VSP_4398.jpg","VSP_4451.jpg","VSP_4455.jpg","VSP_4476.jpg","VSP_4524.jpg",
    "VSP_4537.jpg","VSP_4639.jpg","VSP_4655.jpg","VSP_4661.jpg","VSP_4674.jpg",
    "VSP_4718a.jpg","VSP_5056.jpg","VSP_5147.jpg","VSP_5166.jpg","VSP_5201.jpg",
  ],
  // Casual shots in the vintage film strip
  filmstripImages: [
    "IMG_5872.jpg","IMG_5873.jpg","IMG_5874.jpg","IMG_5875.jpg","IMG_5876.jpg",
    "IMG_5877.jpg","IMG_5878.jpg","IMG_5879.jpg","IMG_5880.jpg","IMG_5881.jpg","IMG_5882.jpg",
  ],
};

const IMG_BASE = "assets/img/web/";
const backendReady = () => CONFIG.scriptUrl.startsWith("https://");

/* ── Welcome overlay ── */
const overlay = document.getElementById("welcomeOverlay");
document.getElementById("openSiteBtn").addEventListener("click", () => {
  overlay.classList.add("closing");
  document.body.classList.remove("no-scroll");
  setTimeout(() => overlay.remove(), 700);
});

/* ── Nav ── */
const nav = document.getElementById("siteNav");
document.getElementById("navToggle").addEventListener("click", () => nav.classList.toggle("open"));
nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));
addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 40), { passive: true });

/* ── Hero text + countdown ── */
document.getElementById("heroTag").textContent = CONFIG.hashtag;
document.getElementById("heroDate").textContent = CONFIG.weddingDateLabel;
document.getElementById("plannerEmail").textContent = CONFIG.plannerEmail;
document.getElementById("plannerEmail").href = "mailto:" + CONFIG.plannerEmail;

const target = new Date(CONFIG.weddingDate).getTime();
const cd = ["cdD", "cdH", "cdM", "cdS"].map(id => document.getElementById(id));
function tick() {
  let diff = Math.max(0, target - Date.now()) / 1000;
  const d = Math.floor(diff / 86400); diff -= d * 86400;
  const h = Math.floor(diff / 3600); diff -= h * 3600;
  const m = Math.floor(diff / 60);
  const s = Math.floor(diff - m * 60);
  [d, h, m, s].forEach((v, i) => (cd[i].textContent = v));
}
tick();
setInterval(tick, 1000);

/* ── Schedule + colors + gifts from CONFIG ── */
for (const [key, val] of Object.entries(CONFIG.schedule)) {
  const el = document.getElementById(key);
  if (el) el.textContent = val;
}
document.getElementById("colorSwatches").innerHTML = CONFIG.colors
  .map(c => `<div class="swatch"><i style="background:${c.hex}"></i><span>${c.name}</span></div>`)
  .join("");
document.getElementById("giftingGrid").innerHTML = CONFIG.gifts
  .map(g => `<div class="gift-card"><h4>${g.title}</h4><p class="bank">${g.bank}</p><p class="acct">${g.account}</p><p class="holder">${g.holder}</p></div>`)
  .join("");

/* ── Lightbox (navigates across every photo) ── */
const allImages = [...CONFIG.curatedMoments, ...CONFIG.orbitPool, ...CONFIG.filmstripImages];
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
let lbIndex = 0;
function showLightbox(i) {
  lbIndex = (i + allImages.length) % allImages.length;
  lightboxImg.src = IMG_BASE + allImages[lbIndex];
  lightbox.hidden = false;
  document.body.classList.add("no-scroll");
}
function hideLightbox() {
  lightbox.hidden = true;
  document.body.classList.remove("no-scroll");
}
document.getElementById("lightboxClose").addEventListener("click", hideLightbox);
document.getElementById("lightboxPrev").addEventListener("click", () => showLightbox(lbIndex - 1));
document.getElementById("lightboxNext").addEventListener("click", () => showLightbox(lbIndex + 1));
lightbox.addEventListener("click", e => { if (e.target === lightbox) hideLightbox(); });
addEventListener("keydown", e => {
  if (lightbox.hidden) return;
  if (e.key === "Escape") hideLightbox();
  if (e.key === "ArrowLeft") showLightbox(lbIndex - 1);
  if (e.key === "ArrowRight") showLightbox(lbIndex + 1);
});

/* ── Orbit gallery ── */
const orbitStage = document.getElementById("orbitStage");
const orbitRing = document.getElementById("orbitRing");
const orbitFocal = document.getElementById("orbitFocal");
const orbitCaption = document.getElementById("orbitCaption");
const SLOTS = 12;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const orbitTotal = CONFIG.curatedMoments.length + CONFIG.orbitPool.length;
let focalSrc = CONFIG.curatedMoments[0];
const slotSrcs = CONFIG.curatedMoments.slice(1, 1 + SLOTS);
// Shuffled queue of everything not currently visible — the "fresh photos" pool
let queue = shuffle([...CONFIG.orbitPool]);
const seen = new Set([focalSrc, ...slotSrcs]);

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

orbitRing.innerHTML = slotSrcs
  .map((f, i) => `<button class="orbit-item" data-slot="${i}" type="button" aria-label="Bring photo forward"><img src="${IMG_BASE + f}" alt="Gabriella and Victor"></button>`)
  .join("");
const slotEls = [...orbitRing.querySelectorAll(".orbit-item")];
orbitFocal.querySelector("img").src = IMG_BASE + focalSrc;

function updateCaption() {
  orbitCaption.textContent = `Moment ${seen.size} · of ${orbitTotal}`;
}
updateCaption();

/* Ring placement — JS-driven angle so auto-spin, hover-pause and drag share one state.
   Items get rotate(a) translate(R) rotate(-a) so the photos stay upright. */
let ringAngle = 0;
let velocity = reducedMotion ? 0 : 0.045; // deg per frame ≈ 1 rev / 130s
const BASE_VELOCITY = velocity;
let paused = false;
let dragging = false;

function layout() {
  const radius = orbitStage.clientWidth * 0.41;
  const visible = slotEls.filter(el => getComputedStyle(el).display !== "none");
  const step = 360 / visible.length;
  visible.forEach((el, i) => {
    const a = ringAngle + i * step;
    el.style.transform = `rotate(${a}deg) translate(${radius}px) rotate(${-a}deg)`;
  });
}
function frame() {
  if (!dragging && !paused && velocity) ringAngle = (ringAngle + velocity) % 360;
  // inertia decay back toward the gentle base spin
  if (!dragging && Math.abs(velocity) > Math.abs(BASE_VELOCITY)) velocity *= 0.96;
  layout();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
addEventListener("resize", layout);

orbitStage.addEventListener("mouseenter", () => { paused = true; });
orbitStage.addEventListener("mouseleave", () => { paused = false; });

/* Drag to spin (pointer events cover touch + mouse) */
let lastX = 0, movedFar = false;
orbitStage.addEventListener("pointerdown", e => {
  dragging = true; movedFar = false; lastX = e.clientX;
});
addEventListener("pointermove", e => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  lastX = e.clientX;
  if (Math.abs(dx) > 2) movedFar = true;
  ringAngle = (ringAngle + dx * 0.35) % 360;
  velocity = Math.max(-2.5, Math.min(2.5, dx * 0.12)) || BASE_VELOCITY;
});
addEventListener("pointerup", () => {
  if (dragging) { dragging = false; nudgePop(); }
});

/* Living pool — pop a fresh, unseen photo into a slot. No repeats on screen:
   the outgoing photo goes to the back of the queue, the incoming one leaves it. */
let slotCursor = 0;
function popIn() {
  if (!queue.length) return;
  const el = slotEls[slotCursor % slotEls.length];
  slotCursor++;
  const img = el.querySelector("img");
  const outgoing = img.src.split("/").pop();
  const incoming = queue.shift();
  queue.push(outgoing);
  seen.add(incoming);
  img.classList.add("fading");
  setTimeout(() => {
    img.src = IMG_BASE + incoming;
    img.classList.remove("fading");
    el.classList.add("popping");
    setTimeout(() => el.classList.remove("popping"), 550);
    updateCaption();
  }, 450);
}
let popTimer = null;
function schedulePops(interval) {
  clearInterval(popTimer);
  if (reducedMotion) return;
  popTimer = setInterval(popIn, interval);
}
schedulePops(5200);
// interaction accelerates fresh photos briefly
function nudgePop() {
  popIn();
  schedulePops(2600);
  setTimeout(() => schedulePops(5200), 9000);
}

/* Tap to promote — orbit photo swaps into the focal circle */
slotEls.forEach(el =>
  el.addEventListener("click", () => {
    if (movedFar) return; // was a drag, not a tap
    const img = el.querySelector("img");
    const promoted = img.src.split("/").pop();
    const demoted = focalSrc;
    focalSrc = promoted;
    const focalImg = orbitFocal.querySelector("img");
    focalImg.classList.add("fading");
    img.classList.add("fading");
    setTimeout(() => {
      focalImg.src = IMG_BASE + promoted;
      img.src = IMG_BASE + demoted;
      focalImg.classList.remove("fading");
      img.classList.remove("fading");
    }, 450);
  })
);
orbitFocal.addEventListener("click", () => {
  if (movedFar) return;
  showLightbox(allImages.indexOf(focalSrc));
});

/* ── Vintage film strip ── */
const track = document.getElementById("filmstripTrack");
const frameHTML = CONFIG.filmstripImages
  .map(f => `<button class="film-frame" data-src="${f}" type="button" aria-label="View photo full size"><img src="${IMG_BASE + f}" alt="Gabriella and Victor" loading="lazy"></button>`)
  .join("");
track.innerHTML = frameHTML + frameHTML; // duplicated for a seamless loop
track.querySelectorAll(".film-frame").forEach(fr =>
  fr.addEventListener("click", () => showLightbox(allImages.indexOf(fr.dataset.src)))
);

/* ── Read more ── */
document.querySelectorAll(".read-more").forEach(btn =>
  btn.addEventListener("click", () => {
    const text = btn.previousElementSibling;
    const collapsed = text.hasAttribute("data-collapsed");
    text.toggleAttribute("data-collapsed");
    btn.textContent = collapsed ? "Read Less" : "Read More";
  })
);

/* ── Well wishes ── */
const wishesWall = document.getElementById("wishesWall");
async function loadWishes() {
  if (!backendReady()) return;
  try {
    const res = await fetch(CONFIG.scriptUrl + "?type=wishes");
    const wishes = await res.json();
    if (Array.isArray(wishes) && wishes.length) {
      wishesWall.innerHTML = wishes
        .map(w => `<div class="wish-card"><p class="wish-name">${esc(w.name)}</p><p class="wish-msg">${esc(w.message)}</p></div>`)
        .join("");
    }
  } catch (err) {
    /* wall keeps its empty state */
  }
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
loadWishes();

/* ── Form submission ── */
async function handleForm(form, type, successMsg) {
  const note = form.querySelector("[data-form-note]");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    note.className = "form-note";
    if (!backendReady()) {
      note.textContent = type === "rsvp"
        ? "RSVP opens soon — please check back shortly!"
        : "Wishes open soon — please check back shortly!";
      return;
    }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    note.textContent = "Sending…";
    try {
      const data = Object.fromEntries(new FormData(form));
      data.type = type;
      await fetch(CONFIG.scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(data),
      });
      note.textContent = successMsg;
      note.classList.add("success");
      form.reset();
      if (type === "wish") setTimeout(loadWishes, 1200);
    } catch (err) {
      note.textContent = "Something went wrong — please try again.";
      note.classList.add("error");
    } finally {
      btn.disabled = false;
    }
  });
}
handleForm(document.getElementById("rsvpForm"), "rsvp", "Thank you! Your RSVP has been received. 🤍");
handleForm(document.getElementById("wishForm"), "wish", "Thank you! Your wish has been posted. 🤍");
