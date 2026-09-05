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
  siteUrl: "https://gabriellaandvictor.vercel.app/",
  hashtag: "#HisGlory26",

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

/* Small settings store in Script Properties. Read at runtime, so flipping one
   takes effect immediately — no redeploy, unlike anything in the COUPLE block. */
var SETTINGS_DEFAULTS = { rsvpOpen: "yes", rsvpClosedMsg: "" };

function getSetting(key) {
  var v = PropertiesService.getScriptProperties().getProperty("set_" + key);
  return v === null || v === undefined ? SETTINGS_DEFAULTS[key] : v;
}
function setSetting(key, value) {
  if (!(key in SETTINGS_DEFAULTS)) return false;
  PropertiesService.getScriptProperties().setProperty("set_" + key, String(value));
  return true;
}
function rsvpIsOpen() { return String(getSetting("rsvpOpen")).toLowerCase() !== "no"; }

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
      // Enforced here as well as in the page: a stale tab, or someone poking
      // the endpoint directly, must not land a row after RSVPs are closed.
      if (!rsvpIsOpen()) return json({ ok: false, error: "rsvp closed" });
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
  return {
    items: items, bank: publicBank(), delivery: publicDelivery(),
    rsvpOpen: rsvpIsOpen(), rsvpClosedMsg: String(getSetting("rsvpClosedMsg") || ""),
  };
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

    // items arrive as "<id>" or "<id>:<qty>" — qty lets one guest cover several
    // share slots of the same gift, up to and including the whole thing.
    var requests = String(p.items || "").split(",").map(function (s) {
      var bits = String(s).trim().split(":");
      return { id: bits[0].trim(), qty: Math.max(1, Math.min(20, Number(bits[1]) || 1)) };
    }).filter(function (r) { return r.id; });
    var ids = requests.map(function (r) { return r.id; });
    var name = String(p.name || "").trim();
    var email = String(p.email || "").trim();
    if (!ids.length) return { ok: false, error: "no items" };
    if (!name || !email) return { ok: false, error: "name and email required" };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "invalid email" };
    if (String(p.hp || "")) return { ok: true, claimed: [], taken: [] }; // honeypot: pretend success
    requests = requests.slice(0, MAX_BATCH);

    var sheet = getSheet("claim");
    var rows = sheet.getDataRange().getValues().slice(1);

    // rate limit: how many open holds does this address already carry?
    var openItems = {};
    rows.forEach(function (r) {
      if (String(r[C.EMAIL]).toLowerCase() === email.toLowerCase() && String(r[C.STATUS]).toLowerCase() === "held") {
        openItems[String(r[C.ITEM])] = true;
      }
    });
    var open = Object.keys(openItems).length;
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

    requests.forEach(function (req) {
      var id = req.id;
      if (seen[id]) return;
      seen[id] = true;
      var row = reg[id];
      if (!row || String(row[R.ACTIVE]).toLowerCase() === "no") { taken.push({ id: id, reason: "gone" }); return; }
      var shares = Math.max(1, Number(row[R.SHARES]) || 1);
      var priorTaken = counts[id] || 0;
      var free = shares - priorTaken;
      if (free <= 0) { taken.push({ id: id, reason: "taken", name: String(row[R.NAME]) }); return; }

      var qty = Math.min(req.qty, free);       // never oversell, even if the page was stale
      var price = Number(row[R.PRICE]) || 0;
      var sharePrice = shares > 1 && price ? Math.ceil(price / shares) : 0;
      // Buying every share of an untouched item IS buying the item, so that
      // guest gets the vendor link. If others already sent cash, the couple is
      // holding it and does the buying, so this guest transfers too.
      var whole = (priorTaken === 0 && qty === shares);
      var token = Utilities.getUuid();       // one token per gift, shared by its rows

      for (var k = 0; k < qty; k++) {
        newRows.push([now, id, name, email, phone, message, showName, "held", token, batchId, "", "", ""]);
      }
      counts[id] = priorTaken + qty;

      claimed.push({
        id: id,
        name: String(row[R.NAME]),
        url: String(row[R.URL] || ""),
        vendor: String(row[R.VENDOR] || ""),
        price: price,
        shares: shares,
        sharePrice: sharePrice,
        qty: qty,
        whole: whole,
        amount: whole ? price : sharePrice * qty,
        shortfall: req.qty - qty,            // asked for more than was left
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

/* ── Email shell ──────────────────────────────────────────────────────────
   Table-based, inline styles only: Gmail strips <style> blocks and ignores
   flexbox. 600px is the safe width. Every email also carries a plain-text
   alternative, which matters both for accessibility and for spam scoring. */

var MAIL = {
  paper: "#efe9dd", ink: "#2b2620", dim: "#6c6455",
  sage: "#9caf88", line: "#ded5c4", card: "#f6f2e9",
};

function mailShell(headline, innerHtml) {
  var img = COUPLE.siteUrl.replace(/\/$/, "") + "/assets/img/email/header.jpg";
  var h = '<!doctype html><html><body style="margin:0;padding:0;background:' + MAIL.paper + ';">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + MAIL.paper + ';padding:24px 12px;">'
    + '<tr><td align="center">'
    + '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid ' + MAIL.line + ';border-radius:8px;overflow:hidden;">'

    // banner
    + '<tr><td style="padding:0;"><img src="' + img + '" width="600" alt="' + escapeHtml(COUPLE.names) + '"'
    + ' style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>'

    // name + hashtag
    + '<tr><td align="center" style="padding:28px 32px 0 32px;font-family:Georgia,\'Times New Roman\',serif;">'
    + '<div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:' + MAIL.dim + ';">'
    + escapeHtml(COUPLE.names) + '</div>'
    + '<div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:' + MAIL.sage + ';padding-top:6px;">'
    + escapeHtml(COUPLE.hashtag) + '</div>'
    + '<div style="font-size:28px;line-height:1.25;color:' + MAIL.ink + ';padding:14px 0 0 0;">' + headline + '</div>'
    + '<div style="width:44px;height:1px;background:' + MAIL.line + ';margin:20px auto 0 auto;"></div>'
    + '</td></tr>'

    // body
    + '<tr><td style="padding:22px 32px 32px 32px;font-family:Georgia,\'Times New Roman\',serif;font-size:15px;line-height:1.65;color:' + MAIL.ink + ';">'
    + innerHtml
    + '</td></tr>'

    + '<tr><td style="padding:18px 32px 26px 32px;border-top:1px solid ' + MAIL.line + ';font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:' + MAIL.dim + ';" align="center">'
    + 'Saturday, 24th October 2026<br>'
    + '<a href="' + COUPLE.siteUrl + '" style="color:' + MAIL.sage + ';text-decoration:none;">' + escapeHtml(shortUrl(COUPLE.siteUrl)) + '</a>'
    + '</td></tr>'

    + '</table></td></tr></table></body></html>';
  return h;
}

function shortUrl(u) {
  return String(u).replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function mailButton(href, label) {
  return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px auto;"><tr>'
    + '<td align="center" style="background:' + MAIL.sage + ';border-radius:999px;">'
    + '<a href="' + href + '" style="display:inline-block;padding:14px 34px;font-family:Helvetica,Arial,sans-serif;'
    + 'font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#ffffff;text-decoration:none;">' + escapeHtml(label) + '</a>'
    + '</td></tr></table>';
}

function mailHeading(text) {
  return '<div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;'
    + 'color:' + MAIL.dim + ';padding:24px 0 10px 0;">' + escapeHtml(text) + '</div>';
}

function mailPanel(inner) {
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + MAIL.card
    + ';border:1px solid ' + MAIL.line + ';border-radius:6px;margin:6px 0;"><tr>'
    + '<td style="padding:16px 18px;font-family:Georgia,\'Times New Roman\',serif;font-size:15px;line-height:1.7;color:' + MAIL.ink + ';">'
    + inner + '</td></tr></table>';
}

function sendClaimEmail(name, email, claimed, batchId) {
  var base = ScriptApp.getService().getUrl();
  var firstName = name.split(" ")[0];
  var wholeItems = claimed.filter(function (c) { return c.shares <= 1 || c.whole; });
  var shareItems = claimed.filter(function (c) { return c.shares > 1 && !c.whole; });
  var shareTotal = shareItems.reduce(function (s, c) { return s + (c.amount || 0); }, 0);

  var b = '<p style="margin:0 0 4px 0;">Dear ' + escapeHtml(firstName) + ',</p>'
    + '<p style="margin:12px 0 0 0;">Your gift is set aside, so no one else picks the same thing. '
    + 'Truly, thank you &mdash; there is no rush at all.</p>';

  var text = "Dear " + firstName + ",\n\nYour gift is set aside, so no one else picks the same thing. "
    + "Truly, thank you - there is no rush at all.\n";

  if (wholeItems.length) {
    b += mailHeading("To buy directly");
    text += "\nTO BUY DIRECTLY\n";
    wholeItems.forEach(function (c) {
      b += '<div style="padding:2px 0 10px 0;">'
        + '<a href="' + c.url + '" style="color:' + MAIL.ink + ';font-size:16px;">' + escapeHtml(c.name) + '</a>'
        + '<div style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:' + MAIL.dim + ';padding-top:3px;">'
        + escapeHtml(c.vendor) + (c.price ? " &middot; " + money(c.price) : "")
        + (c.whole ? ' &middot; <span style="color:' + MAIL.sage + ';">you are covering this one in full</span>' : "")
        + '</div></div>';
      text += "- " + c.name + (c.price ? " (" + money(c.price) + ")" : "") + "\n  " + c.url + "\n";
    });
    if (COUPLE.deliveryAddress) {
      b += mailPanel('<strong style="font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:' + MAIL.dim + ';">Easiest option</strong><br>'
        + 'Have it delivered straight to us:<br><br>'
        + escapeHtml(COUPLE.deliveryName) + '<br>' + escapeHtml(COUPLE.deliveryAddress) + '<br>' + escapeHtml(COUPLE.deliveryPhone)
        + '<br><span style="color:' + MAIL.dim + ';font-size:14px;">Or bring it on the day &mdash; whichever suits you.</span>');
      text += "\nDeliver to: " + COUPLE.deliveryName + ", " + COUPLE.deliveryAddress + ", " + COUPLE.deliveryPhone + "\n";
    }
  }

  if (shareItems.length) {
    b += mailHeading("To send your share" + (shareItems.length > 1 ? "s" : ""));
    text += "\nTO SEND YOUR SHARE" + (shareItems.length > 1 ? "S" : "") + "\n";
    var lines = "";
    shareItems.forEach(function (c) {
      lines += escapeHtml(c.name) + (c.amount ? ' &mdash; ' + money(c.amount) : "")
        + (c.qty > 1 ? ' <span style="color:' + MAIL.dim + ';font-size:14px;">(' + c.qty + ' shares)</span>' : "") + '<br>';
      text += "- " + c.name + (c.amount ? " - " + money(c.amount) : "") + (c.qty > 1 ? " (" + c.qty + " shares)" : "") + "\n";
    });
    if (shareItems.length > 1 && shareTotal) {
      lines += '<br><span style="color:' + MAIL.sage + ';">One transfer of ' + money(shareTotal) + ' covers them all.</span><br>';
      text += "One transfer of " + money(shareTotal) + " covers them all.\n";
    }
    lines += '<br><strong style="font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:' + MAIL.dim + ';">Where to send it</strong><br>'
      + escapeHtml(COUPLE.bankName) + '<br>' + escapeHtml(COUPLE.accountNumber) + '<br>' + escapeHtml(COUPLE.accountName);
    text += COUPLE.bankName + " / " + COUPLE.accountNumber + " / " + COUPLE.accountName + "\n";
    b += mailPanel(lines);
    b += '<p style="margin:10px 0 0 0;font-size:14px;color:' + MAIL.dim + ';">We will buy it once the shares are complete.</p>';
  }

  b += '<p style="margin:26px 0 0 0;">Once you have done it, one tap here lets us know:</p>';
  b += mailButton(base + "?action=confirm&batch=" + batchId, "I have done this");
  text += "\nWhen done, confirm here:\n" + base + "?action=confirm&batch=" + batchId + "\n";

  if (claimed.length > 1) {
    b += '<p style="margin:0;font-size:14px;color:' + MAIL.dim + ';">Buying them at different times? Confirm one at a time:</p>'
      + '<div style="font-size:14px;padding-top:6px;">';
    claimed.forEach(function (c) {
      b += '&middot; <a href="' + base + '?action=confirm&token=' + c.token + '" style="color:' + MAIL.sage + ';">' + escapeHtml(c.name) + '</a><br>';
    });
    b += '</div>';
  }

  b += '<p style="margin:26px 0 0 0;font-size:14px;color:' + MAIL.dim + ';">If you change your mind, just reply to this email &mdash; '
    + 'no explanation needed. We are simply glad you are celebrating with us.</p>';
  text += "\nIf you change your mind, just reply - no explanation needed.\n\n"
    + COUPLE.names + "\n" + shortUrl(COUPLE.siteUrl) + "\n";

  var opts = {
    to: email,
    name: COUPLE.names,
    subject: "Thank you, " + firstName,
    htmlBody: mailShell("Thank you, " + escapeHtml(firstName), b),
    body: text,
  };
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

  // A guest covering several shares of one gift produces one row per slot.
  // Collapse them by token+status so the dashboard shows one line per gift
  // with a share count, and one button that acts on the whole claim.
  var groups = {};
  var order = [];
  claimRows.forEach(function (r, i) {
    var ts = r[C.TS] ? new Date(r[C.TS]).getTime() : now;
    var status = String(r[C.STATUS]).toLowerCase();
    var token = String(r[C.TOKEN] || "");
    var key = (token || ("r" + (i + 2))) + "|" + status;
    if (!groups[key]) {
      groups[key] = {
        row: i + 2, rows: [], token: token,
        itemId: String(r[C.ITEM]), name: String(r[C.NAME]), email: String(r[C.EMAIL]),
        phone: String(r[C.PHONE] || ""), message: String(r[C.MSG] || ""),
        showName: String(r[C.SHOW]).toLowerCase() === "yes",
        status: status, batch: String(r[C.BATCH] || ""),
        ageDays: Math.floor((now - ts) / 86400000),
        nudged: r[C.NUDGE] ? new Date(r[C.NUDGE]).toISOString().slice(0, 10) : "",
        qty: 0,
      };
      order.push(key);
    }
    groups[key].qty++;
    groups[key].rows.push(i + 2);
  });
  var claims = order.map(function (k) { return groups[k]; });

  // The guest list. Duplicates are flagged rather than blocked: the same
  // person may legitimately RSVP twice (changed their mind, or a typo the
  // first time), so the couple decide which row is the real one.
  var rsvpRows = getSheet("rsvp").getDataRange().getValues().slice(1);
  var emailCount = {};
  rsvpRows.forEach(function (r) {
    var e = String(r[3] || "").trim().toLowerCase();
    if (e) emailCount[e] = (emailCount[e] || 0) + 1;
  });
  var rsvps = rsvpRows.map(function (r, i) {
    var e = String(r[3] || "").trim().toLowerCase();
    return {
      row: i + 2,
      when: r[0] ? new Date(r[0]).toISOString().slice(0, 10) : "",
      firstName: String(r[1] || ""),
      lastName: String(r[2] || ""),
      email: String(r[3] || ""),
      phone: String(r[4] || ""),
      side: String(r[5] || ""),
      attending: String(r[6] || ""),
      relationship: String(r[7] || ""),
      dup: !!(e && emailCount[e] > 1),
    };
  }).reverse();

  // Everything a guest can post, so it can be moderated or cleared after testing
  var wishRows = getSheet("wish").getDataRange().getValues().slice(1);
  var wishes = wishRows.map(function (r, i) {
    return {
      row: i + 2,
      name: String(r[1] || ""),
      message: String(r[2] || ""),
      hasPhoto: !!r[3],
      hidden: String(r[4]).toLowerCase() === "no",
      when: r[0] ? new Date(r[0]).toISOString().slice(0, 10) : "",
    };
  }).reverse();

  var strokeRows = getSheet("stroke").getDataRange().getValues().slice(1);
  var strokes = strokeRows.map(function (r, i) {
    var pts = 0;
    try { pts = JSON.parse(String(r[4] || "[]")).length; } catch (e) { pts = 0; }
    return {
      row: i + 2,
      name: String(r[1] || ""),
      color: String(r[2] || ""),
      size: Number(r[3]) || 0,
      points: pts,
      hidden: String(r[5]).toLowerCase() === "no",
      when: r[0] ? new Date(r[0]).toISOString().slice(0, 10) : "",
    };
  }).reverse();

  return { ok: true, items: items, claims: claims, wishes: wishes, strokes: strokes,
           rsvps: rsvps, bank: publicBank(), delivery: publicDelivery(),
           settings: { rsvpOpen: rsvpIsOpen(), rsvpClosedMsg: String(getSetting("rsvpClosedMsg") || "") } };
}

function adminOp(p) {
  if (!adminOk(p)) return { ok: false, error: "unauthorized" };
  var sheet = getSheet("claim");
  var op = String(p.op || "");

  // A claim may span several rows (one per share slot). Prefer the token so
  // one click acts on the whole gift; fall back to a single row.
  var rows = [];
  var token = String(p.token || "");
  if (token) {
    var all = sheet.getDataRange().getValues();
    for (var i = 1; i < all.length; i++) {
      if (String(all[i][C.TOKEN]) === token && String(all[i][C.STATUS]).toLowerCase() !== "released") rows.push(i + 1);
      else if (String(all[i][C.TOKEN]) === token && op === "held") rows.push(i + 1);
    }
  }
  if (!rows.length) {
    var row = Number(p.row);
    if (!row || row < 2) return { ok: false, error: "bad row" };
    rows = [row];
  }

  if (op === "setting") {
    // NB: not `key` — that is already the admin password parameter, and the
    // client sets it last, so a setting named `key` would be clobbered.
    var k = String(p.skey || "");
    if (!setSetting(k, String(p.value === undefined ? "" : p.value))) return { ok: false, error: "unknown setting" };
    CacheService.getScriptCache().remove("registry");   // the site reads this from the catalog
    return { ok: true, key: k, value: getSetting(k) };
  }

  // Moderation on the guest-posted feeds. `kind` is "wish" or "stroke";
  // hide flips the approved column, delete removes the row for good.
  if (op === "hide" || op === "show" || op === "drop") {
    var kind = String(p.kind || "");
    // RSVP rows have no approved column, so only deletion applies to them
    if (kind === "rsvp") {
      if (op !== "drop") return { ok: false, error: "rsvp supports drop only" };
      var rs = getSheet("rsvp");
      var rr = Number(p.row);
      if (!rr || rr < 2 || rr > rs.getLastRow()) return { ok: false, error: "bad row" };
      rs.deleteRow(rr);
      return { ok: true };
    }
    if (kind !== "wish" && kind !== "stroke") return { ok: false, error: "bad kind" };
    var sh = getSheet(kind);
    var r = Number(p.row);
    if (!r || r < 2 || r > sh.getLastRow()) return { ok: false, error: "bad row" };
    var approvedCol = kind === "wish" ? 5 : 6;   // Wishes col E, Canvas col F
    if (op === "drop") sh.deleteRow(r);
    else sh.getRange(r, approvedCol).setValue(op === "hide" ? "no" : "yes");
    CacheService.getScriptCache().remove(kind === "wish" ? "wishes" : "strokes");
    return { ok: true };
  }

  if (op === "release" || op === "received" || op === "ordered" || op === "held") {
    var value = op === "release" ? "released" : op;
    var stamp = new Date();
    rows.forEach(function (r) {
      sheet.getRange(r, C.STATUS + 1).setValue(value);
      if (op === "received") sheet.getRange(r, C.CONFIRMED + 1).setValue(stamp);
    });
    CacheService.getScriptCache().remove("registry");
    return { ok: true, rowsUpdated: rows.length };
  }

  if (op === "nudge" || op === "thanks") {
    var values = sheet.getRange(rows[0], 1, 1, SHEETS.claim.headers.length).getValues()[0];
    var to = String(values[C.EMAIL]);
    var who = String(values[C.NAME]).split(" ")[0];
    if (!to) return { ok: false, error: "no email" };
    var subject = String(p.subject || (op === "nudge" ? "A note from " + COUPLE.names : "Thank you"));
    var body = String(p.body || "").slice(0, 4000);
    // same shell as the claim email, so everything a guest receives matches
    var inner = body.split("\n").map(function (line) {
      return line.trim()
        ? '<p style="margin:0 0 12px 0;">' + escapeHtml(line) + '</p>'
        : '<div style="height:6px;"></div>';
    }).join("");
    var headline = op === "nudge" ? "Just checking in" : "Thank you";
    var opts = {
      to: to, name: COUPLE.names, subject: subject,
      htmlBody: mailShell(headline, inner),
      body: body + "\n\n" + COUPLE.names + "\n" + shortUrl(COUPLE.siteUrl) + "\n",
    };
    if (COUPLE.replyTo) opts.replyTo = COUPLE.replyTo;
    MailApp.sendEmail(opts);
    if (op === "nudge") {
      var when = new Date();
      rows.forEach(function (r) { sheet.getRange(r, C.NUDGE + 1).setValue(when); });
    }
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
