# Gabriella & Victor — Wedding Website 🤍

A one-page wedding website: welcome note, countdown hero, their love story, gallery, well-wishes guestbook, The Third Canvas, schedule, RSVP, gift registry, and Q&A. Plus a private admin dashboard for managing gifts and downloading the finished canvas.

**Stack:** plain HTML/CSS/JS, no build step. Hosted on GitHub Pages. RSVP + wishes stored in a Google Sheet via Google Apps Script.

## Editing the details

Everything that will change lives in `CONFIG` at the top of [js/main.js](js/main.js):

| What | Field |
|---|---|
| Wedding date (countdown) | `weddingDate` (ISO, keep `+01:00` for WAT) |
| Date line under names | `weddingDateLabel` |
| Hashtag | `hashtag` |
| Backend URL | set once in [js/config.js](js/config.js) — shared by the site and the admin page |
| Enquiry contacts (footer) | `contacts` |
| Church / reception details | `schedule.*` |
| Colours of the day | `colors` |
| Bank accounts for cash gifts | `gifts` |
| Registry items, prices, share counts | the **Registry** tab of the Google Sheet (no code change needed) |

The Q&A answers and story copy are in `index.html` directly.

**Current placeholders to replace when the couple confirms:** wedding date, venues, dress themes, colours, hashtag (currently `#OfGraceAndLove`).

## Enabling the backend (one time)

> **Do all of this signed in as a dedicated wedding Gmail account** (e.g. `gabriellaandvictor@gmail.com`) — **not** a personal one. Whoever owns the script is who guests receive email from; `MailApp` cannot send as a different address. That account ends up owning the Sheet, the script, the selfie folder, and every guest email — which is exactly where that data should live.

1. Create the Google Sheet under the wedding account (e.g. "GV Wedding").
2. In the Sheet: **Extensions → Apps Script**, paste in [apps-script/Code.gs](apps-script/Code.gs).
3. Fill in the `COUPLE` block at the top: `replyTo` (the couple's personal inbox), bank details, and delivery address.
4. **Project Settings → Script Properties** → add `ADMIN_KEY` with a long password. This is what unlocks `admin.html`. Never commit it.
5. Run `seedRegistry()` once from the editor to create the 8 gift rows, then fill in the **Price** column in the Sheet.
6. **Deploy → New deployment → Web app**, execute as **Me**, access **Anyone**. Copy the Web App URL.
7. Paste that URL into `GV_SCRIPT_URL` in [js/config.js](js/config.js) and push.
8. Share the **Sheet** with edit access to anyone who helps manage it — the script is container-bound, so Sheet access grants script access too.

RSVPs land in the "RSVP" tab, wishes in "Wishes", brushstrokes in "Canvas", the catalog in "Registry", and gift claims in "GiftClaims". Guest selfies are saved to a Drive folder named **"GV Wedding Selfies"**. Put `no` in a row's `approved` column (Wishes or Canvas) to hide it from the site.

Built for a big guest list: reads are cached for 60s, writes are serialized with a lock, the wall paginates (24 polaroids at a time), and each guest's own wish/stroke shows instantly.

## The gift registry

Guests pick one or more gifts, leave a blessing, and the item locks so nobody buys it twice. Because Jumia has no purchase API, "bought" is confirmed by people, in three stages:

| Stage | Who says so |
|---|---|
| **Held** | the guest claims it — the item locks for everyone else |
| **Ordered** | the guest taps the one-tap link in their thank-you email |
| **Received** | you mark it in the admin dashboard when the box arrives |

Claims go over `GET` (not the `no-cors` `POST` the rest of the site uses) because the browser must be able to **read** the response — a reservation that can't tell you whether you won the race is useless. The script takes a lock, re-checks availability inside it, and claims whatever is still free; if one item in a batch was taken seconds earlier, the rest still land.

**Group gifts:** an item with `Shares` > 1 is split. Shares settle as **cash** — the guest transfers their share and you buy the item once the shares fill (four people can't each buy a quarter of a TV). Set `Shares` to 1 for anything bought whole.

## Admin dashboard

Open `admin.html` on the live site and enter the `ADMIN_KEY`. It is `noindex`, and the key lives only in `sessionStorage`.

- **Board** — every item, its state, and who is bringing it
- **Unconfirmed** — holds awaiting confirmation, with a one-click *gentle check-in* (editable warm template) and *release hold*. There is deliberately **no automatic reminder schedule** — every nudge is a decision you make.
- **Received** — mark arrivals, send thank-yous
- **Link health** — items unpriced or unverified for 30+ days (Jumia links rot)
- **Canvas** — download The Third Canvas

Security note: the admin key travels in the request URL and may appear in Apps Script execution logs. That is proportionate for names, emails and gift statuses — but treat it as a password.

## Downloading The Third Canvas

The **Canvas** tab renders the finished painting with every painter's name on it, and hands you two files:

- **PNG** — works everywhere (WhatsApp, phone, Instagram)
- **SVG** — a few hundred KB, scales to any print size, keeps names as real text, and embeds the handwriting font. **This is the one to give a printer.**

Names appear twice over: as **signatures** beside each stroke, and as a **roll call** in the bottom margin. Where the painting is dense, some signatures are skipped rather than overlapping into soup — the dashboard tells you how many, and the roll call still carries every name, so nobody is ever left off.

Sizes are given by the printed width of the artwork. The page grows taller as the roll call grows, so the dashboard shows the real pixel dimensions live and warns when an export exceeds what iPhones can render (~16.7 megapixels) — use a laptop for those, or use the SVG, which has no such limit.

## Deploying

Push to `main` — GitHub Pages serves the site automatically (Settings → Pages → Deploy from branch `main`, root).

## Custom domain later

1. Buy the domain (e.g. on Namecheap/Porkbun/names.com).
2. Repo → Settings → Pages → Custom domain → enter it (creates a `CNAME` file).
3. At the registrar, add a `CNAME` record for `www` → `<username>.github.io`, and `A` records for the apex to GitHub Pages IPs: `185.199.108.153`, `.109.`, `.110.`, `.111.153`.
4. Wait for DNS, then tick **Enforce HTTPS**.

## Photos

Originals from the couple's Drive folder are in `assets/img/original/` (not committed); web-optimized copies in `assets/img/web/`. To add a photo: drop a web-sized JPG in `assets/img/web/` and add its filename to `galleryImages` or `randomImages` in `js/main.js`.
