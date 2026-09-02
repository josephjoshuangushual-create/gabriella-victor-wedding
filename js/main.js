/* ═══════════ Gabriella & Victor — site config ═══════════
   Everything the couple may change lives here. Swap the
   placeholder values below when details are confirmed.  */

const CONFIG = {
  // Wedding date (WAT = +01:00); time of day still TBC
  weddingDate: "2026-10-24T10:00:00+01:00",
  weddingDateLabel: "Saturday, 24th October 2026 · Warri, Nigeria",
  hashtag: "#HisGlory26",

  // Backend URL — set it once in js/config.js (shared with the admin page).
  scriptUrl: GV_SCRIPT_URL,

  // Enquiry contacts shown in the footer. `tel` uses +234 so the number still
  // dials correctly for any guest calling from outside Nigeria.
  contacts: [
    { name: "Adewumi", phone: "08139500264", tel: "+2348139500264" },
    { name: "Kingsley", phone: "08138453545", tel: "+2348138453545" },
  ],

  // The exact venue and start time are deliberately NOT public — they go only
  // to guests who have RSVP'd, with their access card closer to the day.
  schedule: {
    churchDate: "Saturday, 24th October 2026",
    churchVenue: "Warri, Delta State, Nigeria",
    churchDress: "Anything on our colour palette — whatever makes you feel comfortable and pretty/handsome",
  },

  // Colors of the day (drawn from the pre-wedding shoot palette; dress themes TBC)
  colors: [
    { name: "Sage Green", hex: "#9caf88" },
    { name: "Terracotta", hex: "#c1683c" },
    { name: "Brown", hex: "#6b4a33" },
  ],

  // Gift accounts (PLACEHOLDER — replace with real details)
  gifts: [
    { title: "Bank Transfer (Naira)", bank: "Access Bank", account: "1685111168", holder: "Gabriella Dalang" },
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
const IMG_GIFTS = "assets/img/gifts/";
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
document.getElementById("footerContacts").innerHTML = CONFIG.contacts
  .map(c => `${esc(c.name)} <a href="tel:${esc(c.tel)}">${esc(c.phone)}</a>`)
  .join("&ensp;·&ensp;");

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

/* Auto-advance via native scrolling (transform-animating the ~17k px track
   makes iOS drop the whole layer — the strip rendered blank on phones).
   Content flows left → right; touching/hovering pauses so guests can swipe. */
const stripScroller = document.getElementById("filmstripScroller");
let stripHold = false, stripHoldTimer = null, stripHover = false;
let stripPos = -1; // set after first measure
function stripPause() {
  stripHold = true;
  clearTimeout(stripHoldTimer);
  stripHoldTimer = setTimeout(() => { stripHold = false; }, 2500);
}
stripScroller.addEventListener("pointerdown", stripPause);
stripScroller.addEventListener("touchstart", stripPause, { passive: true });
stripScroller.addEventListener("wheel", stripPause, { passive: true });
stripScroller.addEventListener("mouseenter", () => { stripHover = true; });
stripScroller.addEventListener("mouseleave", () => { stripHover = false; });
stripScroller.addEventListener("scroll", () => {
  if (stripHold) stripPos = stripScroller.scrollLeft; // stay in sync with manual swipes
}, { passive: true });
function stripFrame() {
  const half = track.scrollWidth / 2;
  if (half > 0) {
    if (stripPos < 0) stripPos = half; // start on the second copy so both directions wrap
    if (!reducedMotion && !stripHold && !stripHover) stripPos -= 0.55; // drift left→right
    if (stripPos <= 0) stripPos += half;
    else if (stripPos >= half * 1.5) stripPos -= half;
    stripScroller.scrollLeft = stripPos;
  }
  requestAnimationFrame(stripFrame);
}
requestAnimationFrame(stripFrame);

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
  // shared with the admin export so the downloaded keepsake matches exactly
  CanvasExport.strokePath(tcCtx, pts, scale);
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

/* ── Gift registry ──
   Guests may pick several gifts at once. Claiming goes over GET (not the
   no-cors POST used elsewhere) because we must be able to READ the response:
   a reservation that cannot tell you whether you won the race is useless. */
const registryGrid = document.getElementById("registryGrid");
const registryNote = document.getElementById("registryNote");
const registryFilters = document.getElementById("registryFilters");
const giftBar = document.getElementById("giftBar");
const giftModal = document.getElementById("giftModal");
const giftForm = document.getElementById("giftForm");
const giftDone = document.getElementById("giftDone");
const giftNote = document.getElementById("giftNote");

let registryItems = [];
let registryBank = null;
let registryDelivery = null;
let giftFilter = "all";
let selectedGifts = [];
let giftQty = {};            // itemId -> number of share slots this guest is taking
let myGifts = [];
try {
  selectedGifts = JSON.parse(localStorage.getItem("gv_gift_sel") || "[]");
  myGifts = JSON.parse(localStorage.getItem("gv_gift_mine") || "[]");
} catch (err) { /* ignore malformed storage */ }

const MAX_GIFT_BATCH = 5;
const naira = n => (n ? "₦" + Number(n).toLocaleString("en-NG") : "");
const giftById = id => registryItems.find(i => i.id === id);

/** How many slots this guest is taking of an item (1 for whole items). */
function qtyFor(id) {
  const it = giftById(id);
  if (!it) return 1;
  if (it.shares <= 1) return 1;
  return Math.min(Math.max(1, giftQty[id] || 1), it.available);
}
/** What that comes to in naira. Covering every share of an untouched item
    costs the item's actual price, not shares x rounded-up share price. */
function giftAmount(id) {
  const it = giftById(id);
  if (!it) return 0;
  if (it.shares <= 1) return it.price;
  const q = qtyFor(id);
  return (q === it.shares && it.taken === 0) ? it.price : it.sharePrice * q;
}

function saveSelection() {
  try { localStorage.setItem("gv_gift_sel", JSON.stringify(selectedGifts)); } catch (err) {}
}

function renderRegistry() {
  if (!registryItems.length) {
    registryGrid.innerHTML = backendReady()
      ? `<p class="registry-skeleton">The registry opens shortly — please check back.</p>`
      : `<p class="registry-skeleton">The registry opens soon — please check back shortly.</p>`;
    registryFilters.innerHTML = "";
    return;
  }

  const cats = [...new Set(registryItems.map(i => i.category).filter(Boolean))];
  registryFilters.innerHTML = ["all", ...cats]
    .map(c => `<button class="registry-filter${c === giftFilter ? " active" : ""}" type="button" data-cat="${esc(c)}">${c === "all" ? "Everything" : esc(c)}</button>`)
    .join("");

  const shown = registryItems.filter(i => giftFilter === "all" || i.category === giftFilter);
  registryGrid.innerHTML = shown.map(item => {
    const gone = item.available <= 0;
    const isSel = selectedGifts.includes(item.id);
    const mine = myGifts.includes(item.id);
    const group = item.shares > 1;

    let state;
    if (mine) state = "Yours 💛 — thank you";
    else if (gone) state = item.givers.length ? `Already spoken for 💛 — by ${esc(item.givers[0])}` : "Already spoken for 💛";
    else if (group) state = `${item.taken} of ${item.shares} shares taken`;
    else state = "Available";

    // Use the Sheet's Image column if set, otherwise fall back to the filename
    // convention assets/img/gifts/<id>.jpg — so photos can be added by simply
    // dropping files in, with no Sheet edit. A missing file degrades to the
    // lettered placeholder rather than a broken-image icon.
    const letter = esc((item.name || "?").trim().charAt(0));
    const thumb = `<img class="registry-img" src="${esc(item.image || IMG_GIFTS + item.id + ".jpg")}"
        alt="${esc(item.name)}" loading="lazy" data-letter="${letter}">
      <span class="ph-mark" hidden>${letter}</span>`;

    const price = group && item.sharePrice
      ? `<p class="registry-price">${naira(item.price)} total</p><p class="registry-share-note">Join from ${naira(item.sharePrice)}</p>`
      : item.price ? `<p class="registry-price">${naira(item.price)}</p>`
      : `<p class="registry-price">Price shown at ${esc(item.vendor || "checkout")}</p>`;

    const bar = group
      ? `<div class="registry-bar"><i style="width:${Math.round(item.taken / item.shares * 100)}%"></i></div>`
      : "";

    return `<button class="registry-card${gone ? " taken" : ""}${isSel ? " selected" : ""}" type="button"
              data-id="${esc(item.id)}" ${gone ? "disabled" : ""}
              aria-pressed="${isSel ? "true" : "false"}">
        <span class="registry-thumb">${thumb}<span class="registry-tick">✓</span></span>
        <span class="registry-body">
          ${item.category ? `<span class="registry-cat">${esc(item.category)}</span>` : ""}
          <span class="registry-name">${esc(item.name)}</span>
          ${price}${bar}
          <span class="registry-state">${state}</span>
        </span>
      </button>`;
  }).join("");

  registryGrid.querySelectorAll(".registry-img").forEach(img => {
    const showPlaceholder = () => {
      img.hidden = true;
      const ph = img.nextElementSibling;
      if (ph) ph.hidden = false;
    };
    // A cached or fast 404 can fire `error` before this listener attaches, so
    // check the already-settled case too — otherwise a missing photo leaves a
    // broken-image icon instead of the letter.
    if (img.complete && img.naturalWidth === 0) showPlaceholder();
    else img.addEventListener("error", showPlaceholder, { once: true });
  });

  registryGrid.querySelectorAll(".registry-card:not(.taken)").forEach(card =>
    card.addEventListener("click", () => toggleGift(card.dataset.id)));
  registryFilters.querySelectorAll(".registry-filter").forEach(b =>
    b.addEventListener("click", () => { giftFilter = b.dataset.cat; renderRegistry(); }));

  updateGiftBar();
}

function toggleGift(id) {
  const i = selectedGifts.indexOf(id);
  if (i >= 0) selectedGifts.splice(i, 1);
  else {
    if (selectedGifts.length >= MAX_GIFT_BATCH) {
      registryNote.textContent = `You can choose up to ${MAX_GIFT_BATCH} at a time — more than enough generosity!`;
      registryNote.className = "registry-note form-note";
      return;
    }
    selectedGifts.push(id);
  }
  registryNote.textContent = "";
  saveSelection();
  renderRegistry();
}

function updateGiftBar() {
  // Drop anything claimed by someone else while we were deciding — but only
  // once the catalog is actually loaded. renderRegistry() also runs before the
  // first fetch resolves, and filtering then would wipe a selection restored
  // from localStorage (and save the empty list back over it).
  if (registryItems.length) {
    selectedGifts = selectedGifts.filter(id => { const it = giftById(id); return it && it.available > 0; });
    saveSelection();
  }

  const n = selectedGifts.length;
  giftBar.hidden = n === 0;
  document.body.classList.toggle("has-gift-bar", n > 0);
  if (!n) return;

  const total = selectedGifts.reduce((sum, id) => sum + giftAmount(id), 0);
  document.getElementById("giftBarCount").textContent = `${n} gift${n === 1 ? "" : "s"} selected`;
  document.getElementById("giftBarTotal").textContent = total ? naira(total) : "";
}

function renderChosenList() {
  document.getElementById("giftChosenList").innerHTML = selectedGifts.map(id => {
    const it = giftById(id);
    if (!it) return "";
    const q = qtyFor(id);

    // group gifts let the giver choose how much of it to cover
    let picker = "";
    if (it.shares > 1 && it.available > 1) {
      const opts = [];
      for (let n = 1; n <= it.available; n++) {
        const isAll = n === it.available;
        const amt = (n === it.shares && it.taken === 0) ? it.price : it.sharePrice * n;
        const label = isAll
          ? (it.taken === 0 ? "The whole gift" : "The rest of it")
          : n === 1 ? "One share" : `${n} shares`;
        opts.push(`<label class="gc-opt${n === q ? " on" : ""}">
            <input type="radio" name="qty-${esc(id)}" value="${n}" ${n === q ? "checked" : ""}>
            <span>${label}</span><b>${naira(amt)}</b></label>`);
      }
      picker = `<div class="gc-picker"><p class="gc-picker-q">How much would you like to give?</p>${opts.join("")}</div>`;
    }

    return `<li>
        <div class="gc-row">
          <span class="gc-name">${esc(it.name)}</span>
          <span class="gc-price">${giftAmount(id) ? naira(giftAmount(id)) : ""}</span>
          <button class="gc-drop" type="button" data-drop="${esc(id)}" aria-label="Remove ${esc(it.name)}">&times;</button>
        </div>${picker}
      </li>`;
  }).join("");

  const list = document.getElementById("giftChosenList");
  list.querySelectorAll(".gc-drop").forEach(b =>
    b.addEventListener("click", () => {
      toggleGift(b.dataset.drop);
      if (!selectedGifts.length) closeGiftModal();
      else renderChosenList();
    }));
  list.querySelectorAll(".gc-picker input").forEach(r =>
    r.addEventListener("change", () => {
      giftQty[r.name.replace(/^qty-/, "")] = Number(r.value);
      renderChosenList();
      updateGiftBar();
    }));
}

function openGiftModal() {
  if (!selectedGifts.length) return;
  giftForm.hidden = false;
  giftDone.hidden = true;
  giftNote.textContent = "";
  giftNote.className = "form-note";
  renderChosenList();
  giftModal.hidden = false;
  document.body.classList.add("no-scroll");
}
function closeGiftModal() {
  giftModal.hidden = true;
  document.body.classList.remove("no-scroll");
}

document.getElementById("giftBarGo").addEventListener("click", openGiftModal);
document.getElementById("giftClose").addEventListener("click", closeGiftModal);
document.getElementById("giftDoneClose").addEventListener("click", closeGiftModal);
document.getElementById("giftBarClear").addEventListener("click", () => {
  selectedGifts = [];
  saveSelection();
  renderRegistry();
});
giftModal.addEventListener("click", e => { if (e.target === giftModal) closeGiftModal(); });
addEventListener("keydown", e => { if (e.key === "Escape" && !giftModal.hidden) closeGiftModal(); });
document.getElementById("blessingOnlyBtn").addEventListener("click", () => {
  document.getElementById("wishes").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
});

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const was = btn.textContent;
    btn.textContent = "Copied ✓";
    setTimeout(() => { btn.textContent = was; }, 1800);
  } catch (err) {
    btn.textContent = "Press and hold to copy";
  }
}

function renderGiftDone(claimed, taken) {
  const whole = claimed.filter(c => c.shares <= 1 || c.whole);
  const shares = claimed.filter(c => c.shares > 1 && !c.whole);
  const shareTotal = shares.reduce((s, c) => s + (c.amount || 0), 0);
  let html = "";

  const short = claimed.filter(c => c.shortfall > 0);
  if (short.length) {
    html += `<p class="gift-taken-note">${short.map(c =>
      `Someone took ${c.shortfall} share${c.shortfall === 1 ? "" : "s"} of the ${esc(c.name)} just before you, so you have ${c.qty} instead.`).join(" ")}</p>`;
  }

  if (taken && taken.length) {
    const names = taken.map(t => t.name || "one of your picks").join(", ");
    html += `<p class="gift-taken-note">${claimed.length ? "Almost all yours — " : ""}${esc(names)}
      ${taken.length === 1 ? "was claimed" : "were claimed"} moments before you.
      ${claimed.length ? "Everything else is set aside for you." : "Have a look at what is still open."}</p>`;
  }

  if (whole.length) {
    html += `<div class="gift-block"><h4>To buy directly</h4><ul class="gift-buylist">`
      + whole.map(c => `<li><a href="${esc(c.url)}" target="_blank" rel="noopener">
          <span>${esc(c.name)}${c.whole ? ` <em class="gb-full">covering this in full 💛</em>` : ""}</span>
          <span class="gb-vendor">${esc(c.vendor)}${c.price ? " · " + naira(c.price) : ""} ↗</span></a></li>`).join("")
      + `</ul></div>`;

    if (registryDelivery && registryDelivery.address) {
      const addr = [registryDelivery.name, registryDelivery.address, registryDelivery.phone].filter(Boolean).join("\n");
      html += `<div class="gift-block"><h4>The easy option</h4><div class="gift-copybox">
          Most guests have it delivered straight to us — paste this at checkout.<br><br>
          ${esc(addr).replace(/\n/g, "<br>")}
          <br><button class="btn btn-outline sm" type="button" data-copy="${esc(addr)}">Copy address</button>
          <p class="gift-fineprint">Or bring it on the day — whichever suits you.</p>
        </div></div>`;
    }
  }

  if (shares.length) {
    const bank = registryBank || {};
    const lines = [bank.bankName, bank.accountNumber, bank.accountName].filter(Boolean).join("\n");
    html += `<div class="gift-block"><h4>To send your share${shares.length > 1 ? "s" : ""}</h4><div class="gift-copybox">`
      + shares.map(c => `${esc(c.name)}${c.amount ? " — " + naira(c.amount) : ""}${c.qty > 1 ? ` <span class="gc-qty">(${c.qty} shares)</span>` : ""}<br>`).join("")
      + (shares.length > 1 && shareTotal ? `<br><span class="gc-total">One transfer of ${naira(shareTotal)} covers all of them.</span><br>` : "")
      // never show an empty details box — say what happens next instead
      + (lines
          ? `<br>${esc(lines).replace(/\n/g, "<br>")}`
            + (bank.accountNumber ? `<br><button class="btn btn-outline sm" type="button" data-copy="${esc(bank.accountNumber)}">Copy account number</button>` : "")
          : `<br>We will email you the transfer details shortly — nothing to do right now.`)
      + `<p class="gift-fineprint">We will buy it once the shares are complete.</p></div></div>`;
  }

  if (claimed.length) {
    html += `<p class="gift-fineprint">We have emailed you this list with a one-tap link to let us know once it is done.
      There is no deadline and no pressure at all — and if you change your mind, just reply to that email.</p>`;
  }

  document.getElementById("giftDoneTitle").textContent = claimed.length ? "Thank you — truly 💛" : "Those ones just went";
  document.getElementById("giftDoneBody").innerHTML = html;
  document.getElementById("giftDoneBody").querySelectorAll("[data-copy]").forEach(b =>
    b.addEventListener("click", () => copyText(b.dataset.copy, b)));
  giftForm.hidden = true;
  giftDone.hidden = false;
}

giftForm.addEventListener("submit", async e => {
  e.preventDefault();
  const btn = document.getElementById("giftSubmit");
  const data = Object.fromEntries(new FormData(giftForm));
  if (!selectedGifts.length) return;
  if (!backendReady()) {
    giftNote.textContent = "The registry opens soon — please check back shortly!";
    giftNote.className = "form-note error";
    return;
  }
  btn.disabled = true;
  giftNote.textContent = "Setting them aside…";
  giftNote.className = "form-note";

  try {
    const url = new URL(CONFIG.scriptUrl);
    url.searchParams.set("action", "claim");
    url.searchParams.set("items", selectedGifts.map(id => id + ":" + qtyFor(id)).join(","));
    url.searchParams.set("name", data.name || "");
    url.searchParams.set("email", data.email || "");
    url.searchParams.set("phone", data.phone || "");
    url.searchParams.set("message", (data.message || "").slice(0, 400));
    url.searchParams.set("showName", data.showName ? "yes" : "no");
    url.searchParams.set("wall", data.wall ? "yes" : "no");
    url.searchParams.set("hp", data.hp || "");

    const res = await fetch(url);
    const out = await res.json();
    if (!out.ok) {
      giftNote.textContent = out.message || "Something went wrong — please try again.";
      giftNote.className = "form-note error";
      btn.disabled = false;
      return;
    }

    myGifts = myGifts.concat((out.claimed || []).map(c => c.id));
    try { localStorage.setItem("gv_gift_mine", JSON.stringify(myGifts)); } catch (err) {}
    selectedGifts = [];
    saveSelection();
    renderGiftDone(out.claimed || [], out.taken || []);
    loadRegistry();
  } catch (err) {
    giftNote.textContent = "Something went wrong — please try again.";
    giftNote.className = "form-note error";
    btn.disabled = false;
  }
});

async function loadRegistry() {
  if (backendReady()) {
    try {
      const res = await fetch(CONFIG.scriptUrl + "?action=registry");
      const data = await res.json();
      if (data && Array.isArray(data.items)) {
        registryItems = data.items;
        registryBank = data.bank;
        registryDelivery = data.delivery;
      }
    } catch (err) { /* fall through to the placeholder */ }
  }
  renderRegistry();
}
renderRegistry();
new IntersectionObserver((entries, obs) => {
  if (entries.some(e => e.isIntersecting)) { loadRegistry(); obs.disconnect(); }
}, { rootMargin: "600px" }).observe(registryGrid);
