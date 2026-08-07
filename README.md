# Gabriella & Victor — Wedding Website 🤍

A one-page wedding website: welcome note, countdown hero, their love story, gallery, well-wishes guestbook, schedule, RSVP, gifting, and Q&A.

**Stack:** plain HTML/CSS/JS, no build step. Hosted on GitHub Pages. RSVP + wishes stored in a Google Sheet via Google Apps Script.

## Editing the details

Everything that will change lives in `CONFIG` at the top of [js/main.js](js/main.js):

| What | Field |
|---|---|
| Wedding date (countdown) | `weddingDate` (ISO, keep `+01:00` for WAT) |
| Date line under names | `weddingDateLabel` |
| Hashtag | `hashtag` |
| Backend URL | `scriptUrl` |
| Planner email | `plannerEmail` |
| Church / reception details | `schedule.*` |
| Colours of the day | `colors` |
| Bank accounts for gifting | `gifts` |

The Q&A answers and story copy are in `index.html` directly.

**Current placeholders to replace when the couple confirms:** wedding date, venues, dress themes, colours, bank details, planner email, hashtag (currently `#OfGraceAndLove`).

## Enabling RSVP + Well Wishes (one time, ~2 min)

1. Create a Google Sheet (e.g. "GV Wedding Responses").
2. In the Sheet: **Extensions → Apps Script**, paste in [apps-script/Code.gs](apps-script/Code.gs).
3. **Deploy → New deployment → Web app**, execute as **Me**, access **Anyone**. Copy the Web App URL.
4. Paste that URL into `CONFIG.scriptUrl` in `js/main.js` and push.

RSVPs land in the "RSVP" tab, wishes in the "Wishes" tab. Put `no` in a wish's `approved` column to hide it from the site.

## Deploying

Push to `main` — GitHub Pages serves the site automatically (Settings → Pages → Deploy from branch `main`, root).

## Custom domain later

1. Buy the domain (e.g. on Namecheap/Porkbun/names.com).
2. Repo → Settings → Pages → Custom domain → enter it (creates a `CNAME` file).
3. At the registrar, add a `CNAME` record for `www` → `<username>.github.io`, and `A` records for the apex to GitHub Pages IPs: `185.199.108.153`, `.109.`, `.110.`, `.111.153`.
4. Wait for DNS, then tick **Enforce HTTPS**.

## Photos

Originals from the couple's Drive folder are in `assets/img/original/` (not committed); web-optimized copies in `assets/img/web/`. To add a photo: drop a web-sized JPG in `assets/img/web/` and add its filename to `galleryImages` or `randomImages` in `js/main.js`.
