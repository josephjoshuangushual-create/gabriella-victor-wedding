/* ═══════════ Gabriella & Victor — site config ═══════════
   Everything the couple may change lives here. Swap the
   placeholder values below when details are confirmed.  */

const CONFIG = {
  // Wedding date (WAT = +01:00); time of day still TBC
  weddingDate: "2026-10-24T10:00:00+01:00",
  weddingDateLabel: "Saturday, 24th October 2026 · Warri, Nigeria",
  hashtag: "#OfGraceAndLove",

  // Google Apps Script Web App URL — paste the real URL after deploying
  // apps-script/Code.gs (see README). Leave as-is until then.
  scriptUrl: "PASTE_APPS_SCRIPT_URL_HERE",

  plannerEmail: "hello@example.com", // PLACEHOLDER

  schedule: {
    churchDate: "Saturday, 24th October 2026 · Time TBA",
    churchVenue: "NNPC Housing Complex, Warri, Delta State",
    churchDress: "To be announced",
  },

  // Colors of the day (drawn from the pre-wedding shoot palette; dress themes TBC)
  colors: [
    { name: "Sage Green", hex: "#9caf88" },
    { name: "Terracotta", hex: "#c1683c" },
    { name: "Brown", hex: "#6b4a33" },
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
  // Casual shots in the vintage film strip (rnd_22 is the two-canvases photo,
  // featured in The Third Canvas section instead)
  filmstripImages: [
    "IMG_5872.jpg","IMG_5873.jpg","IMG_5874.jpg","IMG_5875.jpg","IMG_5876.jpg",
    "IMG_5877.jpg","IMG_5878.jpg","IMG_5879.jpg","IMG_5880.jpg","IMG_5881.jpg","IMG_5882.jpg",
    "rnd_01.jpg","rnd_02.jpg","rnd_03.jpg","rnd_04.jpg","rnd_05.jpg","rnd_06.jpg",
    "rnd_07.jpg","rnd_08.jpg","rnd_09.jpg","rnd_10.jpg","rnd_11.jpg","rnd_12.jpg",
    "rnd_13.jpg","rnd_14.jpg","rnd_15.jpg","rnd_16.jpg","rnd_17.jpg","rnd_18.jpg",
    "rnd_19.jpg","rnd_20.jpg","rnd_21.jpg","rnd_23.jpg","rnd_24.jpg","rnd_25.jpg",
    "rnd_26.jpg","rnd_27.jpg","rnd_28.jpg","rnd_29.jpg","rnd_30.jpg","rnd_31.jpg",
    "rnd_32.jpg","rnd_33.jpg","rnd_34.jpg","rnd_35.jpg","rnd_36.jpg",
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
track.style.animationDuration = CONFIG.filmstripImages.length * 5 + "s"; // constant speed regardless of count
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

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ── Polaroid wish wall ──
   Scales to large guest lists: wishes render in pages of PAGE_SIZE with
   lazy-loaded images, and nothing is fetched until the section nears the
   viewport. The visitor's own wish (localStorage) is always pinned first. */
const wishesWall = document.getElementById("wishesWall");
const loadMoreBtn = document.getElementById("loadMoreWishes");
const PAGE_SIZE = 24;
let allWishes = [];
let shownCount = 0;
const myWish = JSON.parse(localStorage.getItem("gv_wish") || "null");

function polaroidHTML(w, mine = false) {
  const photo = w.photoUrl
    ? `<img class="ph" src="${esc(w.photoUrl)}" alt="Guest selfie" loading="lazy">`
    : `<div class="ph-placeholder">🤍</div>`;
  return `<div class="polaroid${mine ? " mine" : ""}">${mine ? '<span class="mine-tag">Your wish</span>' : ""}${photo}<p class="wish-msg">${esc(w.message)}</p><p class="wish-name">— ${esc(w.name)}</p></div>`;
}

function renderWall() {
  const pinned = myWish ? [myWish] : [];
  const rest = allWishes.filter(w => !myWish || w.name !== myWish.name || w.message !== myWish.message);
  const visible = rest.slice(0, shownCount);
  const cards = [...pinned.map(w => polaroidHTML(w, true)), ...visible.map(w => polaroidHTML(w))];
  wishesWall.innerHTML = cards.length
    ? cards.join("")
    : '<p class="wishes-empty">Be the first to leave the couple a wish 🤍</p>';
  loadMoreBtn.hidden = shownCount >= rest.length;
}

async function loadWishes() {
  if (!backendReady()) { renderWall(); return; }
  try {
    const res = await fetch(CONFIG.scriptUrl + "?type=wishes");
    const wishes = await res.json();
    if (Array.isArray(wishes)) {
      allWishes = wishes;
      shownCount = Math.min(PAGE_SIZE, allWishes.length);
    }
  } catch (err) { /* wall keeps current state */ }
  renderWall();
}
loadMoreBtn.addEventListener("click", () => {
  shownCount += PAGE_SIZE;
  renderWall();
});
renderWall();
// fetch only when the section is close to view — avoids a stampede on page load
new IntersectionObserver((entries, obs) => {
  if (entries.some(e => e.isIntersecting)) { loadWishes(); obs.disconnect(); }
}, { rootMargin: "600px" }).observe(wishesWall);

/* ── Selfie booth ── */
const boothModal = document.getElementById("boothModal");
const boothVideo = document.getElementById("boothVideo");
const boothPreview = document.getElementById("boothPreview");
const boothIdle = document.getElementById("boothIdle");
const boothCount = document.getElementById("boothCount");
const boothFlash = document.getElementById("boothFlash");
const boothStart = document.getElementById("boothStart");
const boothSnap = document.getElementById("boothSnap");
const boothRetake = document.getElementById("boothRetake");
const boothUploadLabel = document.getElementById("boothUploadLabel");
const boothFile = document.getElementById("boothFile");
let boothStream = null;
let selfieData = null;

document.getElementById("openBoothBtn").addEventListener("click", () => {
  boothModal.hidden = false;
  document.body.classList.add("no-scroll");
});
function closeBooth() {
  boothModal.hidden = true;
  document.body.classList.remove("no-scroll");
  stopStream();
}
document.getElementById("boothClose").addEventListener("click", closeBooth);
boothModal.addEventListener("click", e => { if (e.target === boothModal) closeBooth(); });

function stopStream() {
  if (boothStream) { boothStream.getTracks().forEach(t => t.stop()); boothStream = null; }
  boothVideo.hidden = true;
}
function showBoothState({ video = false, preview = false, idle = false }) {
  boothVideo.hidden = !video;
  boothPreview.hidden = !preview;
  boothIdle.hidden = !idle;
  boothSnap.hidden = !video;
  boothRetake.hidden = !preview;
  boothStart.hidden = video || preview;
}
boothStart.addEventListener("click", async () => {
  try {
    boothStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    boothVideo.srcObject = boothStream;
    showBoothState({ video: true });
    boothUploadLabel.hidden = true;
  } catch (err) {
    // camera denied or unavailable → fall back to the phone's own camera app / file picker
    boothIdle.textContent = "Camera unavailable here — upload a photo instead.";
    boothUploadLabel.hidden = false;
  }
});
boothSnap.addEventListener("click", async () => {
  for (const n of ["3", "2", "1"]) {
    boothCount.textContent = n;
    boothCount.hidden = false;
    await new Promise(r => setTimeout(r, 700));
  }
  boothCount.hidden = true;
  boothFlash.classList.add("go");
  setTimeout(() => boothFlash.classList.remove("go"), 500);
  const side = Math.min(boothVideo.videoWidth, boothVideo.videoHeight, 900);
  const c = document.createElement("canvas");
  c.width = c.height = side;
  const ctx = c.getContext("2d");
  // mirror to match the preview, crop center square
  const sx = (boothVideo.videoWidth - Math.min(boothVideo.videoWidth, boothVideo.videoHeight)) / 2;
  const sy = (boothVideo.videoHeight - Math.min(boothVideo.videoWidth, boothVideo.videoHeight)) / 2;
  ctx.translate(side, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(boothVideo, sx, sy, Math.min(boothVideo.videoWidth, boothVideo.videoHeight), Math.min(boothVideo.videoWidth, boothVideo.videoHeight), 0, 0, side, side);
  selfieData = c.toDataURL("image/jpeg", 0.8);
  boothPreview.src = selfieData;
  stopStream();
  showBoothState({ preview: true });
});
boothRetake.addEventListener("click", () => {
  selfieData = null;
  showBoothState({ idle: true });
  boothStart.click();
});
boothFile.addEventListener("change", () => {
  const file = boothFile.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    const side = Math.min(img.width, img.height, 900);
    const c = document.createElement("canvas");
    c.width = c.height = side;
    const sq = Math.min(img.width, img.height);
    c.getContext("2d").drawImage(img, (img.width - sq) / 2, (img.height - sq) / 2, sq, sq, 0, 0, side, side);
    selfieData = c.toDataURL("image/jpeg", 0.8);
    boothPreview.src = selfieData;
    showBoothState({ preview: true });
    URL.revokeObjectURL(img.src);
  };
  img.src = URL.createObjectURL(file);
});

/* Wish submission — optimistic: your polaroid appears instantly, pinned first */
const wishForm = document.getElementById("wishForm");
wishForm.addEventListener("submit", async e => {
  e.preventDefault();
  const note = wishForm.querySelector("[data-form-note]");
  note.className = "form-note";
  if (!backendReady()) {
    note.textContent = "Wishes open soon — please check back shortly!";
    return;
  }
  const btn = wishForm.querySelector("button[type=submit]");
  btn.disabled = true;
  note.textContent = "Posting…";
  try {
    const data = Object.fromEntries(new FormData(wishForm));
    data.type = "wish";
    if (selfieData) data.photo = selfieData;
    await fetch(CONFIG.scriptUrl, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(data),
    });
    const mine = { name: data.name, message: data.message, photoUrl: selfieData || "" };
    localStorage.setItem("gv_wish", JSON.stringify(mine));
    allWishes = allWishes.filter(w => w.name !== mine.name || w.message !== mine.message);
    renderWallWithMine(mine);
    note.textContent = "You're on the wall! 🤍";
    note.classList.add("success");
    setTimeout(closeBooth, 1400);
    wishForm.reset();
    selfieData = null;
    showBoothState({ idle: true });
  } catch (err) {
    note.textContent = "Something went wrong — please try again.";
    note.classList.add("error");
  } finally {
    btn.disabled = false;
  }
});
function renderWallWithMine(mine) {
  const rest = allWishes.slice(0, Math.max(shownCount, PAGE_SIZE));
  wishesWall.innerHTML = [polaroidHTML(mine, true), ...rest.map(w => polaroidHTML(w))].join("");
}

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

/* ── The Third Canvas ──
   Guests each paint ONE signed brushstroke. Strokes are stored as
   normalized, simplified point lists (≤80 points) so even 1000+
   strokes stay a small payload and render in a single canvas pass. */
const tc = document.getElementById("thirdCanvas");
const tcCtx = tc.getContext("2d");
const tcTooltip = document.getElementById("tcTooltip");
const tcCaption = document.getElementById("tcCaption");
const tcTools = document.getElementById("tcTools");
const tcDone = document.getElementById("tcDone");
const tcNote = document.getElementById("tcNote");
const tcUndo = document.getElementById("tcUndo");
const tcSign = document.getElementById("tcSign");
const tcName = document.getElementById("tcName");
const TC_W = 1500, TC_H = 1000;
const TC_COLORS = ["#9caf88", "#c1683c", "#8b5e3c", "#e8ddc4", "#6e805f", "#c9a45c", "#4a4238"];
const TC_SIZES = [6, 14, 26];
let tcColor = TC_COLORS[0];
let tcSize = TC_SIZES[1];
let strokes = [];
let pending = null;   // the guest's unsigned stroke
let drawingStroke = null;
let hoverIndex = -1;
const signed = JSON.parse(localStorage.getItem("gv_stroke") || "null");

document.getElementById("tcPalette").innerHTML = TC_COLORS
  .map(c => `<button class="tc-swatch${c === tcColor ? " active" : ""}" type="button" style="background:${c}" data-c="${c}" aria-label="Colour ${c}"></button>`)
  .join("");
document.getElementById("tcSizes").innerHTML = TC_SIZES
  .map(s => `<button class="tc-size${s === tcSize ? " active" : ""}" type="button" data-s="${s}" aria-label="Brush size ${s}"><i style="width:${s * 0.8}px;height:${s * 0.8}px"></i></button>`)
  .join("");
document.querySelectorAll(".tc-swatch").forEach(b => b.addEventListener("click", () => {
  tcColor = b.dataset.c;
  document.querySelectorAll(".tc-swatch").forEach(x => x.classList.toggle("active", x === b));
  if (pending) { pending.color = tcColor; drawCanvas(); }
}));
document.querySelectorAll(".tc-size").forEach(b => b.addEventListener("click", () => {
  tcSize = Number(b.dataset.s);
  document.querySelectorAll(".tc-size").forEach(x => x.classList.toggle("active", x === b));
  if (pending) { pending.size = tcSize; drawCanvas(); }
}));

function fitCanvas() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = tc.clientWidth;
  tc.width = w * dpr;
  tc.height = (w * TC_H / TC_W) * dpr;
  drawCanvas();
}
addEventListener("resize", fitCanvas);

function drawStroke(s, highlight) {
  const scale = tc.width / TC_W;
  const pts = s.points;
  if (pts.length < 2) return;
  tcCtx.save();
  tcCtx.lineCap = tcCtx.lineJoin = "round";
  tcCtx.strokeStyle = s.color;
  tcCtx.lineWidth = s.size * scale;
  if (highlight) { tcCtx.shadowColor = s.color; tcCtx.shadowBlur = 18 * scale; }
  tcCtx.beginPath();
  tcCtx.moveTo(pts[0][0] * scale, pts[0][1] * scale);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2 * scale;
    const my = (pts[i][1] + pts[i + 1][1]) / 2 * scale;
    tcCtx.quadraticCurveTo(pts[i][0] * scale, pts[i][1] * scale, mx, my);
  }
  tcCtx.stroke();
  tcCtx.restore();
}
function drawCanvas() {
  tcCtx.clearRect(0, 0, tc.width, tc.height);
  strokes.forEach((s, i) => drawStroke(s, i === hoverIndex));
  if (drawingStroke) drawStroke(drawingStroke);
  if (pending) drawStroke(pending, true);
}
function updateTcCaption() {
  const n = strokes.length + (pending ? 1 : 0);
  tcCaption.textContent = n
    ? `${n} stroke${n === 1 ? "" : "s"} and counting — every one painted by someone we love`
    : "The canvas is waiting for its first stroke";
}

/* Painting (disabled once the guest has signed) */
function canvasPoint(e) {
  const r = tc.getBoundingClientRect();
  return [
    Math.round((e.clientX - r.left) / r.width * TC_W),
    Math.round((e.clientY - r.top) / r.height * TC_H),
  ];
}
tc.addEventListener("pointerdown", e => {
  if (signed || pending) return;
  try { tc.setPointerCapture(e.pointerId); } catch (ignore) {}
  drawingStroke = { color: tcColor, size: tcSize, points: [canvasPoint(e)] };
});
tc.addEventListener("pointermove", e => {
  if (drawingStroke) {
    drawingStroke.points.push(canvasPoint(e));
    drawCanvas();
    return;
  }
  // hover: find a stroke near the pointer
  if (!strokes.length) return;
  const [px, py] = canvasPoint(e);
  let best = -1, bestDist = 40 * 40;
  strokes.forEach((s, i) => {
    for (const [x, y] of s.points) {
      const d = (x - px) ** 2 + (y - py) ** 2;
      if (d < bestDist) { bestDist = d; best = i; }
    }
  });
  if (best !== hoverIndex) {
    hoverIndex = best;
    drawCanvas();
    if (best >= 0) {
      const r = tc.getBoundingClientRect();
      tcTooltip.textContent = `Painted by ${strokes[best].name || "a loved one"}`;
      tcTooltip.style.left = e.clientX - r.left + 14 + "px";
      tcTooltip.style.top = e.clientY - r.top + 14 + "px";
      tcTooltip.hidden = false;
    } else tcTooltip.hidden = true;
  } else if (best >= 0) {
    const r = tc.getBoundingClientRect();
    tcTooltip.style.left = e.clientX - r.left + 14 + "px";
    tcTooltip.style.top = e.clientY - r.top + 14 + "px";
  }
});
tc.addEventListener("pointerleave", () => { hoverIndex = -1; tcTooltip.hidden = true; drawCanvas(); });
tc.addEventListener("pointerup", () => {
  if (!drawingStroke) return;
  if (drawingStroke.points.length > 3) {
    // simplify: cap at 80 evenly-sampled points to keep payloads tiny
    const pts = drawingStroke.points;
    const step = Math.max(1, Math.ceil(pts.length / 80));
    drawingStroke.points = pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
    pending = drawingStroke;
    tcUndo.disabled = false;
    tcSign.disabled = false;
    tcNote.textContent = "Beautiful. Sign your name to make it permanent.";
  }
  drawingStroke = null;
  drawCanvas();
  updateTcCaption();
});
tcUndo.addEventListener("click", () => {
  pending = null;
  tcUndo.disabled = true;
  tcSign.disabled = true;
  tcNote.textContent = "Pick a colour, then paint one stroke on the canvas.";
  drawCanvas();
  updateTcCaption();
});
tcSign.addEventListener("click", async () => {
  if (!pending) return;
  const name = tcName.value.trim();
  if (!name) { tcNote.textContent = "Please sign your name first."; return; }
  if (!backendReady()) { tcNote.textContent = "The canvas opens soon — please check back shortly!"; return; }
  tcSign.disabled = true;
  tcNote.textContent = "Adding your stroke…";
  try {
    const stroke = { ...pending, name };
    await fetch(CONFIG.scriptUrl, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ type: "stroke", ...stroke, points: JSON.stringify(stroke.points) }),
    });
    strokes.push(stroke);
    localStorage.setItem("gv_stroke", JSON.stringify(stroke));
    pending = null;
    tcTools.hidden = true;
    tcDone.hidden = false;
    drawCanvas();
    updateTcCaption();
  } catch (err) {
    tcSign.disabled = false;
    tcNote.textContent = "Something went wrong — please try again.";
  }
});

async function loadStrokes() {
  if (backendReady()) {
    try {
      const res = await fetch(CONFIG.scriptUrl + "?type=strokes");
      const data = await res.json();
      if (Array.isArray(data)) strokes = data;
    } catch (err) { /* keep local state */ }
  }
  // the guest's own stroke always shows, even before the server catches up
  if (signed && !strokes.some(s => s.name === signed.name && s.points.length === signed.points.length)) {
    strokes.push(signed);
  }
  drawCanvas();
  updateTcCaption();
}
if (signed) { tcTools.hidden = true; tcDone.hidden = false; }
fitCanvas();
new IntersectionObserver((entries, obs) => {
  if (entries.some(e => e.isIntersecting)) { loadStrokes(); obs.disconnect(); }
}, { rootMargin: "600px" }).observe(tc);
