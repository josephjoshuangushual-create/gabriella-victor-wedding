/**
 * Gabriella & Victor wedding site backend — RSVP + Well Wishes.
 *
 * SETUP (one time, ~2 minutes):
 * 1. Create a new Google Sheet (any name, e.g. "GV Wedding Responses").
 * 2. Extensions → Apps Script, delete the default code, paste this file.
 * 3. Deploy → New deployment → type "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the Web App URL and paste it into CONFIG.scriptUrl in js/main.js.
 *
 * Sheet tabs "RSVP" and "Wishes" are created automatically on first submission.
 * To hide a wish from the site, put "no" in its "approved" column.
 */

const SHEETS = {
  rsvp: { name: "RSVP", headers: ["Timestamp", "First Name", "Last Name", "Email", "Phone", "Guest Of", "Attending", "Relationship"] },
  wish: { name: "Wishes", headers: ["Timestamp", "Name", "Message", "approved"] },
};

function getSheet(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS[key].name);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS[key].name);
    sheet.appendRow(SHEETS[key].headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.type === "rsvp") {
      getSheet("rsvp").appendRow([
        new Date(), data.firstName || "", data.lastName || "", data.email || "",
        data.phone || "", data.side || "", data.attending || "", data.relationship || "",
      ]);
    } else if (data.type === "wish") {
      getSheet("wish").appendRow([new Date(), data.name || "", data.message || "", "yes"]);
    } else {
      return json({ ok: false, error: "unknown type" });
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  if (e.parameter.type === "wishes") {
    const rows = getSheet("wish").getDataRange().getValues().slice(1);
    const wishes = rows
      .filter(function (r) { return String(r[3]).toLowerCase() !== "no" && r[2]; })
      .map(function (r) { return { name: r[1], message: r[2] }; })
      .reverse();
    return json(wishes);
  }
  return json({ ok: true, service: "GV wedding backend" });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
