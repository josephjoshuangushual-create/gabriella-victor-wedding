/**
 * Gabriella & Victor wedding site backend.
 *
 * Handles: RSVP · Well Wishes (+selfies) · The Third Canvas · Gift Registry.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SETUP — do ALL of this signed in as the WEDDING GMAIL ACCOUNT, not a
 * personal one. Whoever owns this script is who guests receive email from;
 * MailApp cannot spoof a different From address.
 *
 * This is a STANDALONE script (not container-bound) that reaches the Sheet by
 * ID. Google's "Extensions → Apps Script" opener fails with "the file cannot
 * be opened" whenever more than one Google account is signed in; binding by
 * ID is immune to that, and works no matter which account is the default.
 *
 * 1. Create a Google Sheet under the wedding account (e.g. "GV Wedding") and
 *    copy its ID from the URL into SHEET_ID below.
 * 2. script.google.com → New project → paste this file.
 * 3. Fill in the COUPLE block below.
 * 4. Project Settings → Script Properties → add ADMIN_KEY = <a long password>.
 * 5. Run seedRegistry() once from the editor to create the 8 gift rows,
 *    then fill in the Price column in the Sheet.
 * 6. Deploy → New deployment → Web app.
 *      Execute as: Me     ·     Who has access: Anyone
 * 7. Paste the Web App URL into CONFIG.scriptUrl in js/main.js.
 * 8. Share the SHEET with edit access to whoever helps manage it — the
 *    script is container-bound, so Sheet access grants script access.
 *
 * Sheet tabs are created automatically. Selfies go to a Drive folder
 * "GV Wedding Selfies" (auto-created, under the wedding account).
 * Moderation: set "approved" to "no" on any Wishes/Canvas row to hide it.
 *
 * Built for a large guest list: reads are cached for 60s (CacheService),
 * writes are serialized with LockService.
 * ───────────────────────────────────────────────────────────────────────── */

// The Sheet this script reads and writes. Take it from the Sheet's URL:
// docs.google.com/spreadsheets/d/<THIS PART>/edit
var SHEET_ID = "1B4YHXdEdGFwsZNHUzjVKnIBRz6DL7ymDh7EgZY5wZXU";

var COUPLE = {
  names: "Gabriella & Victor",
  // Left blank ON PURPOSE, not a TODO: with no replyTo header, replies go to
  // the sending address — gabriellaandvictor@gmail.com — which is what we want.
  // Only set this if replies should land somewhere OTHER than the wedding inbox.
  replyTo: "",
  siteUrl: "https://josephjoshuangushual-create.github.io/gabriella-victor-wedding/",
  hashtag: "#OfGraceAndLove",

  // Shown to guests who claim a group-gift share (they transfer, couple buys)
  bankName: "Access Bank",
  accountNumber: "1685111168",
  accountName: "Gabriella Dalang",

  // Offered as the easy option at vendor checkout
  deliveryName: "",               // TODO
  deliveryAddress: "",            // TODO
  deliveryPhone: "",              // TODO
};

var SHEETS = {
  rsvp:     { name: "RSVP",       headers: ["Timestamp", "First Name", "Last Name", "Email", "Phone", "Guest Of", "Attending", "Relationship"] },
  wish:     { name: "Wishes",     headers: ["Timestamp", "Name", "Message", "Photo File ID", "approved"] },
  stroke:   { name: "Canvas",     headers: ["Timestamp", "Name", "Color", "Size", "PointsJSON", "approved"] },
  registry: { name: "Registry",   headers: ["ID", "Name", "Category", "Price", "Vendor", "URL", "Image", "Shares", "Active", "LastChecked", "Notes"] },
  claim:    { name: "GiftClaims", headers: ["Timestamp", "ItemID", "Name", "Email", "Phone", "Message", "ShowName", "Status", "Token", "BatchID", "ConfirmedAt", "LastNudge", "AdminNotes"] },
};

var SELFIE_FOLDER = "GV Wedding Selfies";
var CACHE_SECONDS = 60;
var MAX_BATCH = 5;          // gifts claimable in one go
var MAX_OPEN_PER_EMAIL = 6; // open holds one address may carry

/* Column indexes (0-based) so the code reads clearly */
var R = { ID: 0, NAME: 1, CATEGORY: 2, PRICE: 3, VENDOR: 4, URL: 5, IMAGE: 6, SHARES: 7, ACTIVE: 8, CHECKED: 9, NOTES: 10 };
var C = { TS: 0, ITEM: 1, NAME: 2, EMAIL: 3, PHONE: 4, MSG: 5, SHOW: 6, STATUS: 7, TOKEN: 8, BATCH: 9, CONFIRMED: 10, NUDGE: 11, ADMIN: 12 };

/* Statuses that occupy a share slot */
var LIVE_STATUSES = ["held", "ordered", "received"];

function getSheet(key) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEETS[key].name);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS[key].name);
    sheet.appendRow(SHEETS[key].headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getSelfieFolder() {
  var it = DriveApp.getFoldersByName(SELFIE_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(SELFIE_FOLDER);
}

/* ═══════════════════════ WRITES (RSVP / wish / stroke) ═══════════════════════ */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // serialize concurrent writes safely
    var data = JSON.parse(e.postData.contents);
    var cache = CacheService.getScriptCache();

    if (data.type === "rsvp") {
      getSheet("rsvp").appendRow([
        new Date(), data.firstName || "", data.lastName || "", data.email || "",
        data.phone || "", data.side || "", data.attending || "", data.relationship || "",
      ]);
    } else if (data.type === "wish") {
      var fileId = "";
      if (data.photo && String(data.photo).length < 6000000) {
        var base64 = String(data.photo).split(",")[1] || "";
        if (base64) {
          var blob = Utilities.newBlob(Utilities.base64Decode(base64), "image/jpeg", "wish_" + Date.now() + ".jpg");
          var file = getSelfieFolder().createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          fileId = file.getId();
        }
      }
      getSheet("wish").appendRow([new Date(), data.name || "", data.message || "", fileId, "yes"]);
      cache.remove("wishes");
    } else if (data.type === "stroke") {
      var pts = String(data.points || "[]");
      if (pts.length > 6000) pts = "[]"; // reject oversized strokes
      getSheet("stroke").appendRow([new Date(), data.name || "", data.color || "#9caf88", Number(data.size) || 14, pts, "yes"]);
      cache.remove("strokes");
    } else {
      return json({ ok: false, error: "unknown type" });
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

/* ═══════════════════════════════ READS / ACTIONS ═══════════════════════════════ */

function doGet(e) {
  var p = e.parameter || {};
  var type = p.type;

  if (type === "wishes" || type === "strokes") {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(type);
    if (cached) return jsonText(cached);
    var out = type === "wishes" ? buildWishes() : buildStrokes();
    var text = JSON.stringify(out);
    if (text.length < 95000) cache.put(type, text, CACHE_SECONDS); // cache values cap at ~100KB
    return jsonText(text);
  }

  var action = p.action;
  if (action === "registry") return jsonText(cachedRegistry());
  if (action === "claim")    return json(claimGifts(p));
  if (action === "confirm")  return confirmPage(p);
  if (action === "admin")    return json(adminRead(p));
  if (action === "op")       return json(adminOp(p));

  return json({ ok: true, service: "GV wedding backend" });
}

function buildWishes() {
  var rows = getSheet("wish").getDataRange().getValues().slice(1);
  return rows
    .filter(function (r) { return String(r[4]).toLowerCase() !== "no" && r[2]; })
    .map(function (r) {
      return {
        name: r[1],
        message: r[2],
        photoUrl: r[3] ? "https://drive.google.com/thumbnail?id=" + r[3] + "&sz=w600" : "",
      };
    })
    .reverse(); // newest first
}

function buildStrokes() {
  var rows = getSheet("stroke").getDataRange().getValues().slice(1);
  return rows
    .filter(function (r) { return String(r[5]).toLowerCase() !== "no" && r[4]; })
    .map(function (r) {
      var pts;
      try { pts = JSON.parse(r[4]); } catch (err) { pts = []; }
      return { name: r[1], color: r[2], size: r[3], points: pts };
    })
    .filter(function (s) { return s.points.length > 1; });
}

/* ═══════════════════════════════ GIFT REGISTRY ═══════════════════════════════ */

/** Live claim counts + display names, keyed by item id. */
function claimIndex() {
  var rows = getSheet("claim").getDataRange().getValues().slice(1);
  var idx = {};
  rows.forEach(function (r) {
    var status = String(r[C.STATUS]).toLowerCase();
    if (LIVE_STATUSES.indexOf(status) === -1) return;
    var id = String(r[C.ITEM]);
    if (!idx[id]) idx[id] = { count: 0, names: [] };
    idx[id].count++;
    // only surface a name the giver chose to make public
    if (String(r[C.SHOW]).toLowerCase() === "yes" && r[C.NAME]) idx[id].names.push(String(r[C.NAME]));
  });
  return idx;
}

/**
 * Public catalog. Deliberately contains NO email addresses — this payload is
 * readable by anyone with the script URL.
 */
function buildRegistry() {
  var rows = getSheet("registry").getDataRange().getValues().slice(1);
  var idx = claimIndex();
  var items = rows
    .filter(function (r) { return r[R.ID] && String(r[R.ACTIVE]).toLowerCase() !== "no"; })
    .map(function (r) {
      var id = String(r[R.ID]);
      var shares = Math.max(1, Number(r[R.SHARES]) || 1);
      var taken = idx[id] ? idx[id].count : 0;
      var price = Number(r[R.PRICE]) || 0;
      return {
        id: id,
        name: String(r[R.NAME]),
        category: String(r[R.CATEGORY] || ""),
        price: price,
        sharePrice: shares > 1 && price ? Math.ceil(price / shares) : 0,
        vendor: String(r[R.VENDOR] || ""),
        url: String(r[R.URL] || ""),
        image: String(r[R.IMAGE] || ""),
        shares: shares,
        taken: Math.min(taken, shares),
        available: Math.max(0, shares - taken),
        givers: idx[id] ? idx[id].names : [],
      };
    });
  return { items: items, bank: publicBank(), delivery: publicDelivery() };
}

function publicBank() {
  return { bankName: COUPLE.bankName, accountNumber: COUPLE.accountNumber, accountName: COUPLE.accountName };
}
function publicDelivery() {
  return { name: COUPLE.deliveryName, address: COUPLE.deliveryAddress, phone: COUPLE.deliveryPhone };
}

function cachedRegistry() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("registry");
  if (cached) return cached;
  var text = JSON.stringify(buildRegistry());
  if (text.length < 95000) cache.put("registry", text, CACHE_SECONDS);
  return text;
}

/**
 * Atomic batch claim. Takes the script lock ONCE, re-reads live counts inside
 * the lock, and claims whatever is still free. A collision on one item never
 * fails the rest of the batch.
 */
function claimGifts(p) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    var ids = String(p.items || "").split(",").map(function (s) { return s.trim(); }).filter(String);
    var name = String(p.name || "").trim();
    var email = String(p.email || "").trim();
    if (!ids.length) return { ok: false, error: "no items" };
    if (!name || !email) return { ok: false, error: "name and email required" };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "invalid email" };
    if (String(p.hp || "")) return { ok: true, claimed: [], taken: [] }; // honeypot: pretend success
    ids = ids.slice(0, MAX_BATCH);

    var sheet = getSheet("claim");
    var rows = sheet.getDataRange().getValues().slice(1);

    // rate limit: how many open holds does this address already carry?
    var open = 0;
    rows.forEach(function (r) {
      if (String(r[C.EMAIL]).toLowerCase() === email.toLowerCase() && String(r[C.STATUS]).toLowerCase() === "held") open++;
    });
    if (open >= MAX_OPEN_PER_EMAIL) return { ok: false, error: "limit", message: "You already have " + open + " gifts on hold." };

    // live availability, computed inside the lock
    var reg = {};
    getSheet("registry").getDataRange().getValues().slice(1).forEach(function (r) {
      if (r[R.ID]) reg[String(r[R.ID])] = r;
    });
    var counts = {};
    rows.forEach(function (r) {
      if (LIVE_STATUSES.indexOf(String(r[C.STATUS]).toLowerCase()) === -1) return;
      var id = String(r[C.ITEM]);
      counts[id] = (counts[id] || 0) + 1;
    });

    var batchId = Utilities.getUuid().slice(0, 8);
    var showName = String(p.showName || "yes").toLowerCase() === "no" ? "no" : "yes";
    var message = String(p.message || "").slice(0, 400);
    var phone = String(p.phone || "").slice(0, 40);
    var now = new Date();
    var claimed = [], taken = [], newRows = [], seen = {};

    ids.forEach(function (id) {
      if (seen[id]) return;
      seen[id] = true;
      var row = reg[id];
      if (!row || String(row[R.ACTIVE]).toLowerCase() === "no") { taken.push({ id: id, reason: "gone" }); return; }
      var shares = Math.max(1, Number(row[R.SHARES]) || 1);
      if ((counts[id] || 0) >= shares) { taken.push({ id: id, reason: "taken", name: String(row[R.NAME]) }); return; }
      counts[id] = (counts[id] || 0) + 1;
      var token = Utilities.getUuid();
      newRows.push([now, id, name, email, phone, message, showName, "held", token, batchId, "", "", ""]);
      claimed.push({
        id: id,
        name: String(row[R.NAME]),
        url: String(row[R.URL] || ""),
        vendor: String(row[R.VENDOR] || ""),
        price: Number(row[R.PRICE]) || 0,
        shares: shares,
        sharePrice: shares > 1 && Number(row[R.PRICE]) ? Math.ceil(Number(row[R.PRICE]) / shares) : 0,
        token: token,
      });
    });

    if (newRows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
      CacheService.getScriptCache().remove("registry"); // a stale board is the exact bug this prevents
    }

    // optionally echo the blessing onto the Wish Wall
    if (message && String(p.wall || "") === "yes") {
      getSheet("wish").appendRow([now, name, message, "", "yes"]);
      CacheService.getScriptCache().remove("wishes");
    }

    if (claimed.length) {
      try { sendClaimEmail(name, email, claimed, batchId); } catch (mailErr) { /* never fail a claim on email */ }
    }
    return { ok: true, claimed: claimed, taken: taken, batchId: batchId };
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function money(n) {
  if (!n) return "";
  return "₦" + Number(n).toLocaleString("en-NG");
}

function sendClaimEmail(name, email, claimed, batchId) {
  var base = ScriptApp.getService().getUrl();
  var firstName = name.split(" ")[0];
  var wholeItems = claimed.filter(function (c) { return c.shares <= 1; });
  var shareItems = claimed.filter(function (c) { return c.shares > 1; });
  var shareTotal = shareItems.reduce(function (s, c) { return s + (c.sharePrice || 0); }, 0);

  var html = '<div style="font-family:Georgia,serif;color:#2b2721;max-width:560px;line-height:1.6">';
  html += '<p style="font-size:20px;margin:0 0 4px">Thank you, ' + escapeHtml(firstName) + ' 💛</p>';
  html += '<p style="color:#6b6459;margin:0 0 20px">' + escapeHtml(COUPLE.names) + ' · ' + escapeHtml(COUPLE.hashtag) + '</p>';
  html += '<p>Your gift is set aside so no one else picks the same thing. Truly, thank you — there is no rush at all.</p>';

  if (wholeItems.length) {
    html += '<p style="margin-top:22px"><strong>To buy directly</strong></p><ul style="padding-left:18px">';
    wholeItems.forEach(function (c) {
      html += '<li style="margin-bottom:6px"><a href="' + c.url + '">' + escapeHtml(c.name) + '</a>'
           + (c.price ? ' · ' + money(c.price) : '') + ' <span style="color:#6b6459">(' + escapeHtml(c.vendor) + ')</span></li>';
    });
    html += '</ul>';
    if (COUPLE.deliveryAddress) {
      html += '<p style="background:#f5f1e8;padding:12px 14px;border-radius:6px"><strong>Easiest option — have it delivered to us:</strong><br>'
           + escapeHtml(COUPLE.deliveryName) + '<br>' + escapeHtml(COUPLE.deliveryAddress) + '<br>' + escapeHtml(COUPLE.deliveryPhone)
           + '<br><span style="color:#6b6459">Or bring it on the day — whichever suits you.</span></p>';
    }
  }

  if (shareItems.length) {
    html += '<p style="margin-top:22px"><strong>To send your share' + (shareItems.length > 1 ? 's' : '') + '</strong></p><ul style="padding-left:18px">';
    shareItems.forEach(function (c) {
      html += '<li style="margin-bottom:6px">' + escapeHtml(c.name) + ' — ' + money(c.sharePrice) + '</li>';
    });
    html += '</ul>';
    html += '<p style="background:#f5f1e8;padding:12px 14px;border-radius:6px">'
         + (shareItems.length > 1 ? '<strong>One transfer of ' + money(shareTotal) + ' covers all of them.</strong><br>' : '')
         + escapeHtml(COUPLE.bankName) + '<br>' + escapeHtml(COUPLE.accountNumber) + '<br>' + escapeHtml(COUPLE.accountName) + '</p>';
  }

  html += '<p style="margin-top:26px">Once you have done it, one tap here lets us know:</p>';
  html += '<p><a href="' + base + '?action=confirm&batch=' + batchId + '" style="background:#9caf88;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;display:inline-block">I have done this</a></p>';
  if (claimed.length > 1) {
    html += '<p style="color:#6b6459;font-size:14px">Buying them at different times? Confirm one at a time:<br>';
    claimed.forEach(function (c) {
      html += '· <a href="' + base + '?action=confirm&token=' + c.token + '">' + escapeHtml(c.name) + '</a><br>';
    });
    html += '</p>';
  }
  html += '<p style="color:#6b6459;font-size:14px;margin-top:26px">If you change your mind, just reply to this email — no explanation needed. We are simply glad you are celebrating with us.</p>';
  html += '</div>';

  var opts = { to: email, name: COUPLE.names, subject: "Thank you, " + firstName + " 💛", htmlBody: html };
  if (COUPLE.replyTo) opts.replyTo = COUPLE.replyTo;
  MailApp.sendEmail(opts);
}

/** Guest taps the confirm link in their email → flips held to ordered. */
function confirmPage(p) {
  var lock = LockService.getScriptLock();
  var count = 0;
  try {
    lock.waitLock(15000);
    var sheet = getSheet("claim");
    var rows = sheet.getDataRange().getValues();
    var now = new Date();
    for (var i = 1; i < rows.length; i++) {
      var match = (p.token && rows[i][C.TOKEN] === p.token) || (p.batch && rows[i][C.BATCH] === p.batch);
      if (match && String(rows[i][C.STATUS]).toLowerCase() === "held") {
        sheet.getRange(i + 1, C.STATUS + 1).setValue("ordered");
        sheet.getRange(i + 1, C.CONFIRMED + 1).setValue(now);
        count++;
      }
    }
  } catch (err) {
    // fall through to the friendly page
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }

  var msg = count
    ? "Thank you — that is noted 💛"
    : "This one is already marked, thank you 💛";
  var html = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<div style="font-family:Georgia,serif;background:#0e0d0b;color:#f2ede4;min-height:100vh;display:flex;'
    + 'align-items:center;justify-content:center;text-align:center;padding:2rem;margin:0">'
    + '<div><p style="font-size:0.72rem;letter-spacing:0.34em;text-transform:uppercase;color:#b9b1a3">'
    + escapeHtml(COUPLE.names) + '</p><h1 style="font-weight:500;font-size:2rem;margin:1rem 0">' + msg + '</h1>'
    + '<p style="color:#b9b1a3;max-width:32ch;margin:0 auto 2rem">We cannot wait to celebrate with you.</p>'
    + '<a href="' + COUPLE.siteUrl + '" style="color:#9caf88">Back to the website</a></div></div>';
  return HtmlService.createHtmlOutput(html).setTitle(COUPLE.names);
}

/* ═══════════════════════════════ ADMIN ═══════════════════════════════ */

function adminOk(p) {
  var key = PropertiesService.getScriptProperties().getProperty("ADMIN_KEY");
  return key && String(p.key || "") === key;
}

function adminRead(p) {
  if (!adminOk(p)) return { ok: false, error: "unauthorized" };
  var regRows = getSheet("registry").getDataRange().getValues().slice(1);
  var claimRows = getSheet("claim").getDataRange().getValues().slice(1);
  var now = Date.now();

  var items = regRows.filter(function (r) { return r[R.ID]; }).map(function (r) {
    var checked = r[R.CHECKED] ? new Date(r[R.CHECKED]).getTime() : 0;
    return {
      id: String(r[R.ID]), name: String(r[R.NAME]), price: Number(r[R.PRICE]) || 0,
      vendor: String(r[R.VENDOR] || ""), url: String(r[R.URL] || ""),
      shares: Math.max(1, Number(r[R.SHARES]) || 1),
      active: String(r[R.ACTIVE]).toLowerCase() !== "no",
      staleDays: checked ? Math.floor((now - checked) / 86400000) : null,
    };
  });

  var claims = claimRows.map(function (r, i) {
    var ts = r[C.TS] ? new Date(r[C.TS]).getTime() : now;
    return {
      row: i + 2,
      itemId: String(r[C.ITEM]), name: String(r[C.NAME]), email: String(r[C.EMAIL]),
      phone: String(r[C.PHONE] || ""), message: String(r[C.MSG] || ""),
      showName: String(r[C.SHOW]).toLowerCase() === "yes",
      status: String(r[C.STATUS]).toLowerCase(), batch: String(r[C.BATCH] || ""),
      ageDays: Math.floor((now - ts) / 86400000),
      nudged: r[C.NUDGE] ? new Date(r[C.NUDGE]).toISOString().slice(0, 10) : "",
    };
  });

  return { ok: true, items: items, claims: claims, bank: publicBank(), delivery: publicDelivery() };
}

function adminOp(p) {
  if (!adminOk(p)) return { ok: false, error: "unauthorized" };
  var sheet = getSheet("claim");
  var row = Number(p.row);
  if (!row || row < 2) return { ok: false, error: "bad row" };
  var op = String(p.op || "");

  if (op === "release" || op === "received" || op === "ordered" || op === "held") {
    sheet.getRange(row, C.STATUS + 1).setValue(op === "release" ? "released" : op);
    if (op === "received") sheet.getRange(row, C.CONFIRMED + 1).setValue(new Date());
    CacheService.getScriptCache().remove("registry");
    return { ok: true };
  }

  if (op === "nudge" || op === "thanks") {
    var values = sheet.getRange(row, 1, 1, SHEETS.claim.headers.length).getValues()[0];
    var to = String(values[C.EMAIL]);
    var who = String(values[C.NAME]).split(" ")[0];
    if (!to) return { ok: false, error: "no email" };
    var subject = String(p.subject || (op === "nudge" ? "A note from " + COUPLE.names : "Thank you 💛"));
    var body = String(p.body || "").slice(0, 4000);
    var html = '<div style="font-family:Georgia,serif;color:#2b2721;max-width:560px;line-height:1.6">'
      + body.split("\n").map(function (line) { return "<p>" + escapeHtml(line) + "</p>"; }).join("")
      + '<p style="color:#6b6459;font-size:14px">' + escapeHtml(COUPLE.names) + " · " + escapeHtml(COUPLE.hashtag) + '</p></div>';
    var opts = { to: to, name: COUPLE.names, subject: subject, htmlBody: html };
    if (COUPLE.replyTo) opts.replyTo = COUPLE.replyTo;
    MailApp.sendEmail(opts);
    if (op === "nudge") sheet.getRange(row, C.NUDGE + 1).setValue(new Date());
    return { ok: true, sentTo: who };
  }

  return { ok: false, error: "unknown op" };
}

/* ═══════════════════════════════ HELPERS ═══════════════════════════════ */

function escapeHtml(s) {
  return String(s === null || s === undefined ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function json(obj) {
  return jsonText(JSON.stringify(obj));
}
function jsonText(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run ONCE from the editor to create the 8 registry rows.
 * Safe to re-run: it only adds ids that are not already present.
 * Afterwards, fill in the Price column in the Sheet by hand.
 */
function seedRegistry() {
  var sheet = getSheet("registry");
  var existing = {};
  sheet.getDataRange().getValues().slice(1).forEach(function (r) { if (r[R.ID]) existing[String(r[R.ID])] = true; });

  var seed = [
    ["tv-hisense-55",        "Hisense 55\" Smart UHD 4K TV",              "Living Room", "", "Jumia",  "https://www.jumia.com.ng/55smart-uhd-4k-tvbluetoothnetflixyoutubedstv-now-app-hisense-mpg3443243.html", "", 4],
    ["cooker-maxi-6090",     "Maxi 60x90 Gas Cooker (4 Gas + 2 Electric)", "Kitchen",    "", "Jumia",  "https://www.jumia.com.ng/maxi-60x90-4-gas-2-electrical-burners-gas-cooker-glass-stainless-ignition-button-timer-oven-burner-up-down1-knob-control-black-grayf9e42g2-418631264.html", "", 3],
    ["washer-midea-12kg",    "Midea 12kg Inverter Front Loader Washer",    "Laundry",    "", "Jumia",  "https://www.jumia.com.ng/midea-12kg-inverter-quattro-powerful-wash-auto-clean-full-automatic-front-loader-washingmachine-419666744.html", "", 4],
    ["freezer-haier-259l",   "Haier Thermocool 259L Inverter Chest Freezer","Kitchen",   "", "Jumia",  "https://www.jumia.com.ng/haier-thermocool-259-litres-inverter-chest-freezer-htf-259v-slv-418580164.html", "", 3],
    ["blender-raylux-2l",    "Raylux 2L Commercial Blender (3HP)",         "Kitchen",    "", "Raylux", "https://rayluxafrica.com/product/raylux-2-litres-caterpillar-engine-3hp-heavy-duty-commercial-grade-automatic-program-professional-blender/", "", 1],
    ["processor-raylux-4in1","Raylux 4-in-1 Food Processor",               "Kitchen",    "", "Raylux", "https://rayluxafrica.com/product/raylux-multi-functional-4-in-1-food-processor/", "", 1],
    ["microwave-hisense-25l","Hisense 25L Microwave + Grill",              "Kitchen",    "", "Jumia",  "https://www.jumia.com.ng/microwave-grill-25l-h25mobs6g-hisense-mpg11959970.html", "", 1],
    ["soundbar-lg-s40t",     "LG 300W Wireless Soundbar (S40T)",           "Living Room","", "Jumia",  "https://www.jumia.com.ng/300w-wireless-soundbar-with-ai-pro-sound-s40t-lg-mpg12047177.html", "", 1],
  ];

  var today = new Date();
  var rows = seed
    .filter(function (s) { return !existing[s[0]]; })
    .map(function (s) { return [s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], "yes", today, ""]; });

  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  CacheService.getScriptCache().remove("registry");
  return rows.length + " item(s) added. Now fill in the Price column.";
}
