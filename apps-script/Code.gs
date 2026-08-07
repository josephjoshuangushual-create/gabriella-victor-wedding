/**
 * Gabriella & Victor wedding site backend — RSVP, Well Wishes (+selfies),
 * and The Third Canvas.
 *
 * SETUP (one time, ~2 minutes):
 * 1. Create a new Google Sheet (any name, e.g. "GV Wedding Responses").
 * 2. Extensions → Apps Script, delete the default code, paste this file.
 * 3. Deploy → New deployment → type "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the Web App URL and paste it into CONFIG.scriptUrl in js/main.js.
 *
 * Sheet tabs are created automatically on first submission. Selfies are
 * saved to a Drive folder named "GV Wedding Selfies" (auto-created).
 * Moderation: set "approved" to "no" on any Wishes/Canvas row to hide it.
 *
 * Built for a large guest list: reads are cached for 60s (CacheService),
 * writes are serialized with LockService, so bursts of hundreds of
 * simultaneous guests don't hammer the Sheet or hit rate limits.
 */

var SHEETS = {
  rsvp: { name: "RSVP", headers: ["Timestamp", "First Name", "Last Name", "Email", "Phone", "Guest Of", "Attending", "Relationship"] },
  wish: { name: "Wishes", headers: ["Timestamp", "Name", "Message", "Photo File ID", "approved"] },
  stroke: { name: "Canvas", headers: ["Timestamp", "Name", "Color", "Size", "PointsJSON", "approved"] },
};
var SELFIE_FOLDER = "GV Wedding Selfies";
var CACHE_SECONDS = 60;

function getSheet(key) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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

function doGet(e) {
  var type = e.parameter.type;
  if (type === "wishes" || type === "strokes") {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(type);
    if (cached) return jsonText(cached);
    var out = type === "wishes" ? buildWishes() : buildStrokes();
    var text = JSON.stringify(out);
    if (text.length < 95000) cache.put(type, text, CACHE_SECONDS); // cache values cap at ~100KB
    return jsonText(text);
  }
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

function json(obj) {
  return jsonText(JSON.stringify(obj));
}
function jsonText(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}
