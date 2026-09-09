/*
 * physics-fx.js — motion for the NCSSM-palette build.
 *
 * Everything here is integrated, not tweened:
 *
 *   1. Every letter of the hero headline is a damped spring anchored to its
 *      typeset position, so the pointer parts the text and it springs back.
 *   2. Six letters are replaced by the thing they look like — the O is a moon,
 *      the C a horseshoe magnet, an s a coil spring that visibly stretches
 *      when its letter is knocked out of place, an a an atom, an i a pendulum
 *      driven by its own pivot's acceleration, the z a bolt.
 *   3. A rocket flies in on a curved approach, is captured into a circular
 *      orbit around the moon, runs two revolutions, then burns out of orbit —
 *      the burn drops a shockwave whose wavefront knocks the letters apart.
 *   4. Behind all of it, satellites run Keplerian orbits around an invisible
 *      attractor; the pointer is a mass too, so moving it bends their paths.
 *
 * Colours come from the stylesheet's custom properties, so this file works
 * unchanged against both the light and dark palettes.
 */
(function () {
  const hero = document.querySelector(".hero");
  const heading = document.querySelector(".hero h1");
  if (!hero || !heading) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotion.matches) return;

  const TAU = Math.PI * 2;

  // Letter springs. Underdamped on purpose — the overshoot is what makes them
  // feel like objects rather than tweens.
  const STIFFNESS = 180;
  const DAMPING = 12;

  const POINTER_RADIUS = 130;
  const POINTER_FORCE = 2600;
  const ROCKET_RADIUS = 150;
  const ROCKET_FORCE = 9000;
  const ORBIT_FORCE_SCALE = 0.35; // gentler while parked around the moon
  const WAVE_BAND = 46;
  const WAVE_FORCE = 9000;

  // Rocket flight.
  const APPROACH_SPEED = 520;
  const APPROACH_PULL = 5.4e6; // px^3/s^2 toward the moon, curves the run-in
  const ORBIT_OMEGA = 2.4; // rad/s, about 2.6 s per revolution
  const ORBIT_REVS = 2;
  const ESCAPE_SPEED = 640;

  // Ambient orbits.
  const GM = 1200000;
  const POINTER_GM = 260000;
  const SOFTENING = 30;
  const TRAIL = 80;
  const TRAIL_EVERY = 3;

  /* ---------- colours from the active palette ---------- */

  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.display = "none";
  document.body.appendChild(probe);

  function readColor(name, fallback) {
    probe.style.color = "";
    probe.style.color = `var(${name})`;
    const parts = getComputedStyle(probe).color.match(/[\d.]+/g);
    return parts ? [+parts[0], +parts[1], +parts[2]] : fallback;
  }

  const palette = {
    body: readColor("--heading", [39, 72, 110]),
    trim: readColor("--accent", [52, 96, 148]),
    glass: readColor("--page-bg", [240, 240, 240]),
    flame: readColor("--gold", [236, 198, 70]),
    ember: readColor("--orange", [203, 132, 60]),
  };

  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  /* ---------- split the headline into per-letter springs ---------- */

  function split(el) {
    const text = el.textContent.replace(/\s+/g, " ").trim();
    el.setAttribute("aria-label", text);
    el.textContent = "";
    text.split(" ").forEach((word, i) => {
      if (i) el.appendChild(document.createTextNode(" "));
      const wordEl = document.createElement("span");
      wordEl.className = "fx-word";
      wordEl.setAttribute("aria-hidden", "true");
      for (const glyph of word) {
        const charEl = document.createElement("span");
        charEl.className = "fx-char";
        charEl.textContent = glyph;
        wordEl.appendChild(charEl);
      }
      el.appendChild(wordEl);
    });
    return Array.from(el.querySelectorAll(".fx-char"));
  }

  function makeChar(el) {
    return {
      el,
      letter: el.textContent,
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      ox: 0,
      oy: 0,
      vx: 0,
      vy: 0,
      prevVx: 0,
      kind: null,
      theta: 0.35, // pendulum angle
      omega: 0, // pendulum rate
      phase: Math.random() * TAU, // electron phase
    };
  }

  const headingChars = split(heading).map(makeChar);
  const eyebrow = document.querySelector(".hero .eyebrow");
  const chars = headingChars.concat(
    eyebrow ? split(eyebrow).map(makeChar) : []
  );

  // Pick which letters become objects. The capital O and C are unique, the
  // rest take the first sensible occurrence.
  const glyphs = {};
  function assign(kind, test) {
    const found = headingChars.find((c) => !c.kind && test(c));
    if (found) {
      found.kind = kind;
      glyphs[kind] = found;
    }
  }
  assign("moon", (c) => c.letter === "O");
  assign("magnet", (c) => c.letter === "C");
  assign("spring", (c) => c.letter === "s");
  assign("atom", (c) => c.letter === "a");
  assign("bolt", (c) => c.letter === "z");
  assign("pendulum", (c) => c.letter === "i");

  function measure() {
    chars.forEach((c) => {
      c.el.style.transform = "";
    });
    void document.body.offsetHeight;
    chars.forEach((c) => {
      const r = c.el.getBoundingClientRect();
      c.x = r.left + r.width / 2 + window.scrollX;
      c.y = r.top + r.height / 2 + window.scrollY;
      c.w = r.width;
      c.h = r.height;
    });
  }

  /* ---------- canvases ---------- */

  const field = document.createElement("canvas");
  field.id = "fx-field";
  field.setAttribute("aria-hidden", "true");
  document.body.appendChild(field);
  const fctx = field.getContext("2d");

  const canvas = document.createElement("canvas");
  canvas.id = "fx-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const bodies = [];
  const centre = { x: 0, y: 0 };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    field.width = canvas.width;
    field.height = canvas.height;
    field.style.width = canvas.style.width;
    field.style.height = canvas.style.height;
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const box = hero.getBoundingClientRect();
    centre.x = box.left + box.width / 2;
    centre.y = Math.min(box.top + box.height * 0.45, window.innerHeight * 0.55);
    if (!bodies.length) seedField();

    measure();
  }

  /* ---------- ambient: orbital mechanics ---------- */

  function seed(body, radius) {
    const angle = Math.random() * TAU;
    const speed = Math.sqrt(GM / radius) * (0.92 + Math.random() * 0.14);
    const spin = Math.random() < 0.5 ? 1 : -1;
    body.r0 = radius;
    body.x = centre.x + Math.cos(angle) * radius;
    body.y = centre.y + Math.sin(angle) * radius;
    body.vx = -Math.sin(angle) * speed * spin;
    body.vy = Math.cos(angle) * speed * spin;
    body.trail.length = 0;
  }

  function seedField() {
    bodies.length = 0;
    const span = Math.min(window.innerWidth, window.innerHeight);
    [0.14, 0.21, 0.29, 0.37, 0.45].forEach((f, i) => {
      const body = { trail: [], tick: 0, size: i % 3 === 0 ? 4 : 2.8, gold: i === 1 };
      seed(body, f * span);
      bodies.push(body);
    });
  }

  function stepField(dt) {
    for (const b of bodies) {
      const dx = centre.x - b.x;
      const dy = centre.y - b.y;
      const d2 = dx * dx + dy * dy + SOFTENING * SOFTENING;
      const inv = GM / (d2 * Math.sqrt(d2));
      let ax = dx * inv;
      let ay = dy * inv;

      if (pointer.live) {
        const px = pointer.x - b.x;
        const py = pointer.y - b.y;
        const p2 = px * px + py * py + 8100;
        const pinv = POINTER_GM / (p2 * Math.sqrt(p2));
        ax += px * pinv;
        ay += py * pinv;
      }

      b.vx += ax * dt;
      b.vy += ay * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      b.tick = (b.tick + 1) % TRAIL_EVERY;
      if (b.tick === 0) {
        b.trail.push(b.x, b.y);
        if (b.trail.length > TRAIL * 2) {
          b.trail.splice(0, b.trail.length - TRAIL * 2);
        }
      }

      const dist = Math.hypot(b.x - centre.x, b.y - centre.y);
      if (dist > b.r0 * 2.6 || dist < 18) seed(b, b.r0);
    }
  }

  function drawField() {
    fctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    fctx.strokeStyle = rgba(palette.trim, 0.3);
    fctx.lineWidth = 1;
    fctx.beginPath();
    fctx.arc(centre.x, centre.y, 4, 0, TAU);
    fctx.stroke();

    for (const b of bodies) {
      const colour = b.gold ? palette.flame : palette.trim;
      const points = b.trail.length / 2;
      fctx.lineWidth = 1.5;
      for (let i = 1; i < points; i++) {
        fctx.strokeStyle = rgba(colour, (i / points) * 0.4);
        fctx.beginPath();
        fctx.moveTo(b.trail[(i - 1) * 2], b.trail[(i - 1) * 2 + 1]);
        fctx.lineTo(b.trail[i * 2], b.trail[i * 2 + 1]);
        fctx.stroke();
      }
      fctx.fillStyle = rgba(colour, 0.75);
      fctx.beginPath();
      fctx.arc(b.x, b.y, b.size, 0, TAU);
      fctx.fill();
    }
  }

  /* ---------- state ---------- */

  const pointer = { x: 0, y: 0, live: false };
  const exhaust = [];
  const waves = [];

  const rocket = {
    phase: "idle",
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    orbitAngle: 0,
    orbitR: 0,
    spin: 1,
    turned: 0,
  };
  let side = 1;
  let untilLaunch = 3.5;

  // Where the letters currently are, in viewport space.
  function charPos(c) {
    return { x: c.x - window.scrollX + c.ox, y: c.y - window.scrollY + c.oy };
  }

  function moonState() {
    const m = glyphs.moon;
    if (!m) return null;
    const p = charPos(m);
    return { x: p.x, y: p.y, r: Math.max(14, m.w * 0.45) };
  }

  function launch() {
    if (rocket.phase !== "idle") return;
    const moon = moonState();
    const target = moon || { x: window.innerWidth / 2, y: window.innerHeight * 0.3 };
    rocket.x = side > 0 ? -90 : window.innerWidth + 90;
    rocket.y = target.y + 170;
    const dx = target.x - rocket.x;
    const dy = target.y - rocket.y;
    const d = Math.hypot(dx, dy) || 1;
    rocket.vx = (dx / d) * APPROACH_SPEED;
    rocket.vy = (dy / d) * APPROACH_SPEED;
    rocket.phase = moon ? "approach" : "escape";
    rocket.turned = 0;
    side *= -1;
  }

  function capture(moon) {
    const dx = rocket.x - moon.x;
    const dy = rocket.y - moon.y;
    rocket.orbitAngle = Math.atan2(dy, dx);
    rocket.orbitR = moon.r + 26;
    // Orbit the way the rocket was already going round the moon.
    rocket.spin = Math.sign(dx * rocket.vy - dy * rocket.vx) || 1;
    rocket.turned = 0;
    rocket.phase = "orbit";
  }

  function burn(moon) {
    const tangent = rocket.spin;
    const tx = -Math.sin(rocket.orbitAngle) * tangent;
    const ty = Math.cos(rocket.orbitAngle) * tangent;
    rocket.vx = tx * ESCAPE_SPEED;
    rocket.vy = ty * ESCAPE_SPEED;
    rocket.phase = "escape";
    waves.push({ x: rocket.x, y: rocket.y, r: 8, v: 620, age: 0, life: 1.1 });
  }

  function emitExhaust(dt) {
    const angle = Math.atan2(rocket.vy, rocket.vx);
    const tx = rocket.x - Math.cos(angle) * 16;
    const ty = rocket.y - Math.sin(angle) * 16;
    const count = Math.min(rocket.phase === "orbit" ? 2 : 4, Math.ceil(dt * 190));
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.7;
      const speed = 60 + Math.random() * 120;
      exhaust.push({
        x: tx,
        y: ty,
        vx: -Math.cos(angle + spread) * speed + rocket.vx * 0.08,
        vy: -Math.sin(angle + spread) * speed + rocket.vy * 0.08,
        age: 0,
        life: 0.32 + Math.random() * 0.45,
        r: 1.6 + Math.random() * 2.4,
        hot: Math.random() < 0.45,
      });
    }
    if (exhaust.length > 240) exhaust.splice(0, exhaust.length - 240);
  }

  function stepRocket(dt) {
    if (rocket.phase === "idle") return;
    const moon = moonState();

    if (rocket.phase === "approach" && moon) {
      const dx = moon.x - rocket.x;
      const dy = moon.y - rocket.y;
      const d2 = dx * dx + dy * dy + 4000;
      const pull = APPROACH_PULL / (d2 * Math.sqrt(d2));
      rocket.vx += dx * pull * dt;
      rocket.vy += dy * pull * dt;
      rocket.x += rocket.vx * dt;
      rocket.y += rocket.vy * dt;

      const d = Math.hypot(moon.x - rocket.x, moon.y - rocket.y);
      const closing = (moon.x - rocket.x) * rocket.vx + (moon.y - rocket.y) * rocket.vy;
      if (d <= moon.r + 26 || closing < 0) capture(moon);
    } else if (rocket.phase === "orbit" && moon) {
      const omega = ORBIT_OMEGA * rocket.spin;
      rocket.orbitAngle += omega * dt;
      rocket.turned += Math.abs(omega) * dt;
      rocket.x = moon.x + Math.cos(rocket.orbitAngle) * rocket.orbitR;
      rocket.y = moon.y + Math.sin(rocket.orbitAngle) * rocket.orbitR;
      // Nose along the tangent.
      rocket.vx = -Math.sin(rocket.orbitAngle) * rocket.orbitR * omega;
      rocket.vy = Math.cos(rocket.orbitAngle) * rocket.orbitR * omega;
      if (rocket.turned >= TAU * ORBIT_REVS) burn(moon);
    } else {
      rocket.x += rocket.vx * dt;
      rocket.y += rocket.vy * dt;
    }

    emitExhaust(dt);

    const margin = 160;
    if (
      rocket.x < -margin ||
      rocket.x > window.innerWidth + margin ||
      rocket.y < -margin ||
      rocket.y > window.innerHeight + margin
    ) {
      rocket.phase = "idle";
      untilLaunch = 7 + Math.random() * 5;
    }
  }

  function stepParticles(dt) {
    for (let i = exhaust.length - 1; i >= 0; i--) {
      const p = exhaust[i];
      p.age += dt;
      if (p.age >= p.life) {
        exhaust.splice(i, 1);
        continue;
      }
      const drag = Math.exp(-2.2 * dt);
      p.vx *= drag;
      p.vy *= drag;
      p.vy -= 8 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.age += dt;
      if (w.age >= w.life) {
        waves.splice(i, 1);
        continue;
      }
      w.r += w.v * dt;
      w.v *= Math.exp(-1.1 * dt);
    }
  }

  function stepChars(dt) {
    const sx = window.scrollX;
    const sy = window.scrollY;
    const flying = rocket.phase !== "idle";
    const rocketScale = rocket.phase === "orbit" ? ORBIT_FORCE_SCALE : 1;

    for (const c of chars) {
      const cx = c.x - sx + c.ox;
      const cy = c.y - sy + c.oy;
      let fx = 0;
      let fy = 0;

      if (pointer.live) {
        const dx = cx - pointer.x;
        const dy = cy - pointer.y;
        const d = Math.hypot(dx, dy) || 0.001;
        if (d < POINTER_RADIUS) {
          const falloff = 1 - d / POINTER_RADIUS;
          const f = POINTER_FORCE * falloff * falloff;
          fx += (dx / d) * f;
          fy += (dy / d) * f;
        }
      }

      // The moon is what the rocket is orbiting, so it does not get blown
      // around by it — otherwise the orbit chases its own target.
      if (flying && c.kind !== "moon") {
        const dx = cx - rocket.x;
        const dy = cy - rocket.y;
        const d = Math.hypot(dx, dy) || 0.001;
        if (d < ROCKET_RADIUS) {
          const falloff = 1 - d / ROCKET_RADIUS;
          const f = ROCKET_FORCE * falloff * falloff * rocketScale;
          fx += (dx / d) * f;
          fy += (dy / d) * f;
        }
      }

      for (const w of waves) {
        const dx = cx - w.x;
        const dy = cy - w.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const band = Math.abs(d - w.r);
        if (band < WAVE_BAND) {
          const strength =
            (1 - band / WAVE_BAND) * (1 - w.age / w.life) * WAVE_FORCE;
          fx += (dx / d) * strength;
          fy += (dy / d) * strength;
        }
      }

      fx += -STIFFNESS * c.ox - DAMPING * c.vx;
      fy += -STIFFNESS * c.oy - DAMPING * c.vy;

      c.prevVx = c.vx;
      c.vx += fx * dt;
      c.vy += fy * dt;
      c.ox += c.vx * dt;
      c.oy += c.vy * dt;

      if (c.kind === "pendulum") stepPendulum(c, dt);
      if (c.kind === "atom") c.phase += dt * 2.1;

      if (
        !c.kind &&
        Math.abs(c.ox) < 0.05 &&
        Math.abs(c.oy) < 0.05 &&
        Math.abs(c.vx) < 0.5 &&
        Math.abs(c.vy) < 0.5
      ) {
        c.ox = c.oy = c.vx = c.vy = 0;
        if (c.el.style.transform) c.el.style.transform = "";
        continue;
      }

      const tilt = Math.max(-14, Math.min(14, c.ox * 0.22));
      c.el.style.transform = `translate3d(${c.ox.toFixed(2)}px, ${c.oy.toFixed(
        2
      )}px, 0) rotate(${tilt.toFixed(2)}deg)`;
    }
  }

  // A pendulum whose pivot is the letter itself: shove the letter sideways and
  // the bob swings, exactly as a hanging mass does on an accelerating support.
  function stepPendulum(c, dt) {
    const L = Math.max(12, c.h * 0.42);
    const g = 1500;
    const ax = Math.max(-4000, Math.min(4000, (c.vx - c.prevVx) / Math.max(dt, 1e-4)));
    const alpha =
      (-g / L) * Math.sin(c.theta) - 1.1 * c.omega - (ax / L) * Math.cos(c.theta);
    c.omega += alpha * dt;
    c.theta += c.omega * dt;
  }

  /* ---------- letter glyphs ---------- */

  function drawMoon(c, x, y) {
    const r = Math.max(14, c.w * 0.45);
    ctx.fillStyle = rgba(palette.body, 1);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(palette.glass, 0.38);
    const craters = [
      [-0.34, -0.26, 0.2],
      [0.28, -0.1, 0.14],
      [-0.05, 0.36, 0.17],
      [0.36, 0.34, 0.1],
    ];
    for (const [dx, dy, rr] of craters) {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, rr * r, 0, TAU);
      ctx.fill();
    }
  }

  function drawMagnet(c, x, y) {
    const r = c.w * 0.4;
    const thickness = Math.max(5, c.w * 0.26);
    ctx.lineWidth = thickness;
    ctx.lineCap = "butt";
    // The horseshoe: an arc left open on the right, like the C it replaces.
    ctx.strokeStyle = rgba(palette.body, 1);
    ctx.beginPath();
    ctx.arc(x, y, r, 0.42 * Math.PI, 1.58 * Math.PI);
    ctx.stroke();
    // Poles.
    ctx.strokeStyle = rgba(palette.ember, 1);
    ctx.beginPath();
    ctx.arc(x, y, r, 1.22 * Math.PI, 1.58 * Math.PI);
    ctx.stroke();
    ctx.strokeStyle = rgba(palette.trim, 1);
    ctx.beginPath();
    ctx.arc(x, y, r, 0.42 * Math.PI, 0.78 * Math.PI);
    ctx.stroke();
    ctx.lineCap = "round";
  }

  // Drawn from the letter's rest position to where it actually is, so the
  // coil stretches whenever the shockwave drags its letter away.
  function drawSpring(c, x, y) {
    const ax = c.x - window.scrollX;
    const ay = c.y - window.scrollY - c.h * 0.3;
    const bx = x;
    const by = y + c.h * 0.3;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const amp = c.w * 0.34;
    const turns = 6;
    const steps = 60;

    ctx.strokeStyle = rgba(palette.body, 1);
    ctx.lineWidth = Math.max(2, c.w * 0.1);
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const swell = Math.sin(Math.PI * t); // taper the ends into the axis
      const off = Math.sin(t * TAU * turns) * amp * swell;
      const px = ax + dx * t - uy * off;
      const py = ay + dy * t + ux * off;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  function drawAtom(c, x, y) {
    const rx = c.w * 0.52;
    const ry = c.w * 0.2;
    ctx.lineWidth = Math.max(1.2, c.w * 0.05);
    for (let i = 0; i < 3; i++) {
      const spin = (i * Math.PI) / 3;
      ctx.strokeStyle = rgba(palette.trim, 0.55);
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, spin, 0, TAU);
      ctx.stroke();

      const a = c.phase * (1 + i * 0.24) + i * 2.1;
      const ex = Math.cos(a) * rx;
      const ey = Math.sin(a) * ry;
      ctx.fillStyle = rgba(palette.trim, 1);
      ctx.beginPath();
      ctx.arc(
        x + ex * Math.cos(spin) - ey * Math.sin(spin),
        y + ex * Math.sin(spin) + ey * Math.cos(spin),
        Math.max(1.8, c.w * 0.075),
        0,
        TAU
      );
      ctx.fill();
    }
    ctx.fillStyle = rgba(palette.body, 1);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2.4, c.w * 0.15), 0, TAU);
    ctx.fill();
  }

  function drawPendulum(c, x, y) {
    const L = Math.max(12, c.h * 0.42);
    const px = x;
    const py = y - c.h * 0.3;
    const bx = px + Math.sin(c.theta) * L;
    const by = py + Math.cos(c.theta) * L;
    ctx.strokeStyle = rgba(palette.body, 0.75);
    ctx.lineWidth = Math.max(1.2, c.w * 0.07);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.fillStyle = rgba(palette.body, 1);
    ctx.beginPath();
    ctx.arc(bx, by, Math.max(3, c.w * 0.3), 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, Math.max(1.5, c.w * 0.1), 0, TAU);
    ctx.fill();
  }

  function drawBolt(c, x, y) {
    const w = c.w * 0.6;
    const h = c.h * 0.42;
    const pts = [
      [0.55, -1],
      [-0.35, 0.1],
      [0.1, 0.1],
      [-0.45, 1],
      [0.5, -0.12],
      [0.02, -0.12],
    ];
    ctx.fillStyle = rgba(palette.flame, 1);
    ctx.beginPath();
    pts.forEach(([px, py], i) => {
      const sx = x + px * w;
      const sy = y + py * h;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.fill();
  }

  let glyphsRevealed = false;

  function drawGlyphs() {
    if (!glyphsRevealed) {
      glyphsRevealed = true;
      chars.forEach((c) => c.kind && c.el.classList.add("fx-glyph"));
    }
    for (const c of chars) {
      if (!c.kind) continue;
      const p = charPos(c);
      if (c.kind === "moon") drawMoon(c, p.x, p.y);
      else if (c.kind === "magnet") drawMagnet(c, p.x, p.y);
      else if (c.kind === "spring") drawSpring(c, p.x, p.y);
      else if (c.kind === "atom") drawAtom(c, p.x, p.y);
      else if (c.kind === "pendulum") drawPendulum(c, p.x, p.y);
      else if (c.kind === "bolt") drawBolt(c, p.x, p.y);
    }
  }

  /* ---------- rocket ---------- */

  function drawRocket() {
    const angle = Math.atan2(rocket.vy, rocket.vx);
    ctx.save();
    ctx.translate(rocket.x, rocket.y);
    ctx.rotate(angle);

    ctx.fillStyle = rgba(palette.flame, 0.9);
    ctx.beginPath();
    ctx.moveTo(-13, -4.5);
    ctx.lineTo(-13, 4.5);
    ctx.lineTo(-24 - Math.random() * 8, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = rgba(palette.trim, 1);
    ctx.beginPath();
    ctx.moveTo(-5, -6);
    ctx.lineTo(-16, -13);
    ctx.lineTo(-12, -3.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-5, 6);
    ctx.lineTo(-16, 13);
    ctx.lineTo(-12, 3.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = rgba(palette.body, 1);
    ctx.beginPath();
    ctx.moveTo(21, 0);
    ctx.quadraticCurveTo(4, -8.5, -12, -7);
    ctx.lineTo(-12, 7);
    ctx.quadraticCurveTo(4, 8.5, 21, 0);
    ctx.fill();

    ctx.fillStyle = rgba(palette.glass, 1);
    ctx.beginPath();
    ctx.arc(6, 0, 3.6, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    drawGlyphs();

    for (const p of exhaust) {
      const t = p.age / p.life;
      ctx.globalAlpha = (1 - t) * 0.42;
      ctx.fillStyle = rgba(p.hot ? palette.flame : palette.ember, 1);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1 + t * 1.1), 0, TAU);
      ctx.fill();
    }

    ctx.lineWidth = 2;
    for (const w of waves) {
      ctx.globalAlpha = (1 - w.age / w.life) * 0.5;
      ctx.strokeStyle = rgba(palette.trim, 1);
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, TAU);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    if (rocket.phase !== "idle") drawRocket();
  }

  /* ---------- loop ---------- */

  const homeSection = document.getElementById("home");
  const onHome = () => !homeSection || homeSection.classList.contains("active");

  let last = performance.now();
  let settled = false;
  let running = true;

  function park() {
    rocket.phase = "idle";
    exhaust.length = 0;
    waves.length = 0;
    pointer.live = false;
    chars.forEach((c) => {
      c.ox = c.oy = c.vx = c.vy = 0;
      c.el.style.transform = "";
    });
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    fctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    settled = true;
  }

  function frame(now) {
    const dt = Math.min(0.032, (now - last) / 1000);
    last = now;
    requestAnimationFrame(frame);

    if (document.hidden || !running) return;

    if (!onHome()) {
      if (!settled) park();
      return;
    }
    settled = false;

    if (rocket.phase === "idle") {
      untilLaunch -= dt;
      if (untilLaunch <= 0) launch();
    }

    stepField(dt);
    drawField();
    stepRocket(dt);
    stepParticles(dt);
    stepChars(dt);
    draw();
  }

  /* ---------- wiring ---------- */

  window.addEventListener("pointermove", (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.live = true;
  });
  window.addEventListener("pointerleave", () => {
    pointer.live = false;
  });
  window.addEventListener("blur", () => {
    pointer.live = false;
  });
  window.addEventListener("resize", resize);

  if (homeSection) {
    new MutationObserver(() => {
      if (!onHome()) park();
      else settled = false;
    }).observe(homeSection, { attributes: true, attributeFilter: ["class"] });
  }

  heading.addEventListener("click", () => {
    untilLaunch = 0;
    launch();
  });

  reduceMotion.addEventListener("change", (e) => {
    if (e.matches) window.location.reload();
  });

  resize();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure);
  }
  requestAnimationFrame(frame);

  /* ---------- debug harness ---------- */

  const params = new URLSearchParams(location.search);

  function stepAll(dt) {
    stepField(dt);
    stepRocket(dt);
    stepParticles(dt);
    stepChars(dt);
  }

  // ?fxframe=N freezes the live loop and renders frame N of a launch, so a
  // headless capture lands on an exact, repeatable moment of the flight.
  if (params.has("fxframe")) {
    const frames = Number(params.get("fxframe")) || 200;
    const render = () => {
      running = false;
      measure();
      launch();
      for (let i = 0; i < frames; i++) stepAll(1 / 60);
      drawField();
      draw();
      document.documentElement.setAttribute("data-fx-rendered", String(frames));
    };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(render);
    } else {
      render();
    }
  }

  if (params.has("fxdebug")) {
    window.__fx = {
      launch,
      step(dt) {
        stepAll(dt);
        drawField();
        draw();
      },
      state() {
        return {
          phase: rocket.phase,
          turned: rocket.turned,
          rocket: { x: rocket.x, y: rocket.y },
          moon: moonState(),
          glyphs: Object.keys(glyphs),
          waves: waves.length,
          exhaust: exhaust.length,
          untilLaunch,
        };
      },
    };
  }
})();
