/* ═══════════ The Third Canvas — shared renderer ═══════════
   The ONE definition of how a stroke is drawn. The live wall (main.js) and
   the admin export both call strokePath(), so the downloaded keepsake can
   never drift away from what guests actually painted. */
const CanvasExport = (function () {
  const TC_W = 1500, TC_H = 1000;
  const PAPER = "#efe9dd";
  const INK = "#2b2620";
  const INK_DIM = "#6c6455";

  /** Draws the stroke's curve into ctx. Caller sets strokeStyle/lineWidth. */
  function strokePath(ctx, points, scale, ox, oy) {
    ox = ox || 0; oy = oy || 0;
    if (!points || points.length < 2) return false;
    ctx.beginPath();
    ctx.moveTo(points[0][0] * scale + ox, points[0][1] * scale + oy);
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i][0] + points[i + 1][0]) / 2 * scale + ox;
      const my = (points[i][1] + points[i + 1][1]) / 2 * scale + oy;
      ctx.quadraticCurveTo(points[i][0] * scale + ox, points[i][1] * scale + oy, mx, my);
    }
    ctx.stroke();
    return true;
  }

  /** Same curve as an SVG path string — not an approximation, the identical maths. */
  function strokeSvgPath(points, scale, ox, oy) {
    ox = ox || 0; oy = oy || 0;
    if (!points || points.length < 2) return "";
    const r = n => Math.round(n * 10) / 10;
    let d = "M" + r(points[0][0] * scale + ox) + "," + r(points[0][1] * scale + oy);
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i][0] + points[i + 1][0]) / 2 * scale + ox;
      const my = (points[i][1] + points[i + 1][1]) / 2 * scale + oy;
      d += "Q" + r(points[i][0] * scale + ox) + "," + r(points[i][1] * scale + oy)
         + " " + r(mx) + "," + r(my);
    }
    return d;
  }

  /** Darken a stroke colour so a signature stays legible on cream paper. */
  function darken(hex, amount) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || "").trim());
    if (!m) return INK_DIM;
    const f = amount === undefined ? 0.62 : amount;
    const c = [1, 2, 3].map(i => Math.round(parseInt(m[i], 16) * f));
    return "rgb(" + c.join(",") + ")";
  }

  function layout(width) {
    const margin = Math.round(width * 0.06);
    const artW = width - margin * 2;
    const artH = Math.round(artW * TC_H / TC_W);
    const titleH = Math.round(width * 0.10);
    return { width, margin, artW, artH, titleH, artX: margin, artY: margin + titleH };
  }

  /** Wrap "a · b · c" name list into lines that fit maxW. */
  function wrapNames(ctx, names, maxW) {
    const lines = [];
    let line = "";
    names.forEach(n => {
      const next = line ? line + "  ·  " + n : n;
      if (ctx.measureText(next).width > maxW && line) { lines.push(line); line = n; }
      else line = next;
    });
    if (line) lines.push(line);
    return lines;
  }

  function overlaps(a, boxes) {
    for (const b of boxes) {
      if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) return true;
    }
    return false;
  }

  /**
   * Work out where each signature goes, skipping any that cannot fit.
   * Returns { placed: [{name,x,y,color}], skipped: n }
   */
  function placeSignatures(ctx, strokes, scale, ox, oy, fontPx) {
    const boxes = [];
    const placed = [];
    let skipped = 0;
    ctx.font = fontPx + "px Caveat, cursive";

    strokes.forEach(s => {
      const name = String(s.name || "").trim();
      if (!name || !s.points || s.points.length < 2) return;
      const w = ctx.measureText(name).width;
      const h = fontPx;
      const pts = s.points;
      const anchors = [pts[pts.length - 1], pts[0], pts[Math.floor(pts.length / 2)]];
      const pad = fontPx * 0.45;
      const offsets = [[pad, pad + h * 0.7], [-w - pad, pad + h * 0.7], [pad, -pad], [-w - pad, -pad], [-w / 2, pad + h * 1.4]];

      let done = false;
      for (const a of anchors) {
        if (done) break;
        for (const off of offsets) {
          const x = a[0] * scale + ox + off[0];
          const y = a[1] * scale + oy + off[1];
          const box = { x: x - 2, y: y - h, w: w + 4, h: h + 4 };
          // keep signatures inside the art area
          if (box.x < ox || box.x + box.w > ox + TC_W * scale || box.y < oy || box.y + box.h > oy + TC_H * scale) continue;
          if (overlaps(box, boxes)) continue;
          boxes.push(box);
          placed.push({ name, x, y, color: darken(s.color) });
          done = true;
          break;
        }
      }
      if (!done) skipped++;
    });

    return { placed, skipped };
  }

  function contributors(strokes) {
    const seen = [];
    strokes.forEach(s => {
      const n = String(s.name || "").trim();
      if (n && seen.indexOf(n) === -1) seen.push(n);
    });
    return seen;
  }

  /**
   * Render the keepsake into `canvas`.
   * opts: { width, signatures, rollCall, paper, title, subtitle, date, hashtag }
   * Returns { width, height, skipped, names }
   */
  function render(canvas, strokes, opts) {
    const o = opts || {};
    const width = o.width || 4000;
    const L = layout(width);
    const scale = L.artW / TC_W;
    const names = contributors(strokes);

    const ctx = canvas.getContext("2d");
    const rollFont = Math.round(width * 0.018);
    const sigFont = Math.round(width * 0.013);

    // measure the roll call first so the canvas can be sized to fit it
    ctx.font = rollFont + "px Caveat, cursive";
    const rollLines = o.rollCall !== false && names.length ? wrapNames(ctx, names, L.artW) : [];
    const rollBlock = rollLines.length ? Math.round(width * 0.045) + rollLines.length * Math.round(rollFont * 1.35) : 0;
    const height = L.artY + L.artH + rollBlock + L.margin;

    canvas.width = width;
    canvas.height = height;

    // ground
    if (o.paper !== false) { ctx.fillStyle = PAPER; ctx.fillRect(0, 0, width, height); }
    else ctx.clearRect(0, 0, width, height);

    const onPaper = o.paper !== false;

    // title block
    if (onPaper) {
      ctx.textAlign = "center";
      ctx.fillStyle = INK_DIM;
      ctx.font = Math.round(width * 0.0115) + "px Jost, sans-serif";
      const eyebrow = (o.hashtag || "").toUpperCase();
      if (eyebrow) ctx.fillText(spaced(eyebrow), width / 2, L.margin + width * 0.028);
      ctx.fillStyle = INK;
      ctx.font = Math.round(width * 0.038) + "px Cormorant Garamond, Georgia, serif";
      ctx.fillText(o.title || "The Third Canvas", width / 2, L.margin + width * 0.072);
      ctx.fillStyle = INK_DIM;
      ctx.font = Math.round(width * 0.0135) + "px Cormorant Garamond, Georgia, serif";
      const sub = [o.subtitle, o.date].filter(Boolean).join("  ·  ");
      if (sub) ctx.fillText(sub, width / 2, L.margin + width * 0.092);
      ctx.textAlign = "left";
    }

    // the paint, in the order guests laid it down
    ctx.lineCap = ctx.lineJoin = "round";
    strokes.forEach(s => {
      ctx.strokeStyle = s.color || "#9caf88";
      ctx.lineWidth = (Number(s.size) || 14) * scale;
      strokePath(ctx, s.points, scale, L.artX, L.artY);
    });

    // signatures
    let skipped = 0;
    if (o.signatures !== false) {
      const sig = placeSignatures(ctx, strokes, scale, L.artX, L.artY, sigFont);
      ctx.font = sigFont + "px Caveat, cursive";
      sig.placed.forEach(p => { ctx.fillStyle = p.color; ctx.fillText(p.name, p.x, p.y); });
      skipped = sig.skipped;
    }

    // roll call
    if (rollLines.length && onPaper) {
      ctx.textAlign = "center";
      ctx.fillStyle = INK_DIM;
      ctx.font = Math.round(width * 0.0115) + "px Jost, sans-serif";
      const label = "PAINTED BY " + names.length + (names.length === 1 ? " HAND" : " HANDS");
      ctx.fillText(spaced(label), width / 2, L.artY + L.artH + Math.round(width * 0.032));
      ctx.fillStyle = INK;
      ctx.font = rollFont + "px Caveat, cursive";
      const lh = Math.round(rollFont * 1.35);
      rollLines.forEach((line, i) => {
        ctx.fillText(line, width / 2, L.artY + L.artH + Math.round(width * 0.058) + i * lh);
      });
      ctx.textAlign = "left";
    }

    return { width, height, skipped, names };
  }

  function spaced(s) { return String(s).split("").join(" "); }

  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /**
   * Same artwork as SVG — resolution-independent, tiny, and the names stay
   * real selectable text. This is the file to hand a printer.
   * `fontCss` may carry a base64 @font-face so Caveat survives off this machine.
   */
  function toSVG(strokes, opts, measureCanvas) {
    const o = opts || {};
    const width = o.width || 4000;
    const L = layout(width);
    const scale = L.artW / TC_W;
    const names = contributors(strokes);

    const c = measureCanvas || document.createElement("canvas");
    const ctx = c.getContext("2d");
    const rollFont = Math.round(width * 0.018);
    const sigFont = Math.round(width * 0.013);
    ctx.font = rollFont + "px Caveat, cursive";
    const rollLines = o.rollCall !== false && names.length ? wrapNames(ctx, names, L.artW) : [];
    const rollBlock = rollLines.length ? Math.round(width * 0.045) + rollLines.length * Math.round(rollFont * 1.35) : 0;
    const height = L.artY + L.artH + rollBlock + L.margin;
    const onPaper = o.paper !== false;

    let svg = '<?xml version="1.0" encoding="UTF-8"?>\n';
    svg += '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">\n';
    svg += '<style>\n' + (o.fontCss || "")
        + '.sig{font-family:"Caveat",cursive}.roll{font-family:"Caveat",cursive}'
        + '.ttl{font-family:"Cormorant Garamond",Georgia,serif}.lbl{font-family:"Jost",sans-serif;letter-spacing:0.34em}\n</style>\n';
    if (onPaper) svg += '<rect width="100%" height="100%" fill="' + PAPER + '"/>\n';

    if (onPaper) {
      if (o.hashtag) svg += '<text class="lbl" x="' + width / 2 + '" y="' + Math.round(L.margin + width * 0.028) + '" text-anchor="middle" font-size="' + Math.round(width * 0.0115) + '" fill="' + INK_DIM + '">' + esc(o.hashtag.toUpperCase()) + '</text>\n';
      svg += '<text class="ttl" x="' + width / 2 + '" y="' + Math.round(L.margin + width * 0.072) + '" text-anchor="middle" font-size="' + Math.round(width * 0.038) + '" fill="' + INK + '">' + esc(o.title || "The Third Canvas") + '</text>\n';
      const sub = [o.subtitle, o.date].filter(Boolean).join("  ·  ");
      if (sub) svg += '<text class="ttl" x="' + width / 2 + '" y="' + Math.round(L.margin + width * 0.092) + '" text-anchor="middle" font-size="' + Math.round(width * 0.0135) + '" fill="' + INK_DIM + '">' + esc(sub) + '</text>\n';
    }

    svg += '<g fill="none" stroke-linecap="round" stroke-linejoin="round">\n';
    strokes.forEach(s => {
      const d = strokeSvgPath(s.points, scale, L.artX, L.artY);
      if (!d) return;
      svg += '<path d="' + d + '" stroke="' + esc(s.color || "#9caf88") + '" stroke-width="' + Math.round((Number(s.size) || 14) * scale * 10) / 10 + '"/>\n';
    });
    svg += '</g>\n';

    let skipped = 0;
    if (o.signatures !== false) {
      const sig = placeSignatures(ctx, strokes, scale, L.artX, L.artY, sigFont);
      skipped = sig.skipped;
      sig.placed.forEach(p => {
        svg += '<text class="sig" x="' + Math.round(p.x) + '" y="' + Math.round(p.y) + '" font-size="' + sigFont + '" fill="' + p.color + '">' + esc(p.name) + '</text>\n';
      });
    }

    if (rollLines.length && onPaper) {
      const label = "PAINTED BY " + names.length + (names.length === 1 ? " HAND" : " HANDS");
      svg += '<text class="lbl" x="' + width / 2 + '" y="' + Math.round(L.artY + L.artH + width * 0.032) + '" text-anchor="middle" font-size="' + Math.round(width * 0.0115) + '" fill="' + INK_DIM + '">' + esc(label) + '</text>\n';
      const lh = Math.round(rollFont * 1.35);
      rollLines.forEach((line, i) => {
        svg += '<text class="roll" x="' + width / 2 + '" y="' + Math.round(L.artY + L.artH + width * 0.058 + i * lh) + '" text-anchor="middle" font-size="' + rollFont + '" fill="' + INK + '">' + esc(line) + '</text>\n';
      });
    }

    svg += '</svg>\n';
    return { svg, width, height, skipped, names };
  }

  return { TC_W, TC_H, strokePath, strokeSvgPath, render, toSVG, contributors, layout, darken };
})();
