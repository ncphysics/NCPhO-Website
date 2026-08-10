/* --- CONFIGURATION --- */
const CONFIG = {
  competitionStartDate: "2026-10-25",
  competitionEndDate: "2026-10-31",
  registrationFormUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSeaGqVKQ4kgsVsWJlATgjXjFPpyAzNUzwQGr7rt6XQLQNNKOg/viewform?usp=header",
  instagramUrl:
    "https://www.instagram.com/ncssmphysicsclub?igsh=OTIzNHgzY3lheWlt&utm_source=qr",
  practicePdfUrl:
    "https://drive.google.com/file/d/11Z0xe88ykuKHbdNE2wgaEt_wjFYMZPGm/preview",
  constantsPdfUrl: "ncphoConstants.pdf",

  // OUTREACH IMPACT STATS

  // OUTREACH EVENTS — drop photos into the /outreach folder and
  // point "image" at them. Cards work fine before photos are added.
  outreachEvents: [
    {
      title: "Summer Physics Camp",
      description:
        "Dillan Garner of the North Carolina Physics Orginization hosted a summer physics camp at a Mecklenburg County recreational center.",
      image: "outreach/physics-camp-charlotte.jpg",
    },
  ],

  contributors: [
    { name: "Nolan Sheldon", role: "Test Writer", affiliation: "NCSSM" },
    { name: "Aaron Zhu", role: "Test Writer", affiliation: "NCSSM" },
    { name: "Kevin Yang", role: "Test Writer", affiliation: "NCSSM" },
    { name: "Colin Xu", role: "Test Writer", affiliation: "NCSSM" },
    {
      name: "Dillan Garner",
      role: "Founder & Executive Director",
      affiliation: "NCSSM",
    },
    {
      name: "Nikhil Mehta",
      role: "Founder & Managing Director",
      affiliation: "NCSSM",
    },
    {
      name: "Pranava Kumar",
      role: "Marketing and Technology Director",
      affiliation: "NCSSM",
    },
    { name: "David Osinuga", role: "Logistics Lead", affiliation: "NCSSM" },
    { name: "Alan Cai", role: "Marketing Director", affiliation: "NCSSM" },
    { name: "Jack Chen", role: "Marketing Director", affiliation: "NCSSM" },
    { name: "Baya Belgaied", role: "Outreach", affiliation: "NCSSM" },
    {
      name: "Scarlett Kerr",
      role: "Outreach",
      affiliation: "Byron Nelson High",
    },
  ],

  pastCompetitions: [
    {
      month: "January 2026",
      date: "2025-12-15",
      participants: 31,
      winner: "Akshar Vusthela",
      topScore: 92,
      testUrl: "https://tinyurl.com/u82hxzvh",
    },
    {
      month: "May 2026",
      date: "2026-05-01",
      participants: 53,
      winner: "Lawrence Qiao",
      topScore: 79,
      testUrl: "http://tiny.cc/8jx4101",
    },
  ],
};

/* --- NAVIGATION --- */
function showSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  document
    .querySelectorAll("section")
    .forEach((s) => s.classList.remove("active"));
  section.classList.add("active");

  document
    .querySelectorAll(".nav-links a")
    .forEach((a) => a.classList.remove("active-link"));
  const link = document.querySelector(`.nav-links a[href="#${sectionId}"]`);
  if (link) link.classList.add("active-link");

  document.getElementById("navLinks").classList.remove("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleMobileMenu() {
  document.getElementById("navLinks").classList.toggle("active");
}

// Keyboard activation (Enter/Space) for clickable non-button elements
function onActivateKey(event, action) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

// Deep links & back/forward: show the section named in the URL hash
window.addEventListener("hashchange", () =>
  showSection(location.hash.slice(1) || "home"),
);
if (location.hash) showSection(location.hash.slice(1));

/* --- LINKS & PDFS --- */
document.getElementById("registerBtn").href = CONFIG.registrationFormUrl;
document.getElementById("instagramLink").href = CONFIG.instagramUrl;

document.getElementById("pdfFrame").src = CONFIG.practicePdfUrl;
document.getElementById("dl-pdf").href = CONFIG.practicePdfUrl.replace(
  "/preview",
  "/view",
);

document.getElementById("constantsFrame").src = CONFIG.constantsPdfUrl;
document.getElementById("dl-constants").href = CONFIG.constantsPdfUrl;

/* --- COMPETITION WINDOW & COUNTDOWN --- */
// Parse "YYYY-MM-DD" as local time to prevent UTC shift
function parseLocalDate(dateStr) {
  return new Date(dateStr + "T00:00:00");
}

const start = parseLocalDate(CONFIG.competitionStartDate);
const end = parseLocalDate(CONFIG.competitionEndDate);
document.getElementById("currentCompetitionInfo").innerHTML =
  `<strong>Next window: ${start.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  })} – ${end.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}</strong><br>
  <span class="fine-print">Opens 12:00 AM EST, closes 11:59 PM EST.</span>`;

function updateCountdown() {
  const diff = Math.max(0, start.getTime() - Date.now());

  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);

  document.getElementById("days").innerText = String(d).padStart(2, "0");
  document.getElementById("hours").innerText = String(h).padStart(2, "0");
  document.getElementById("minutes").innerText = String(m).padStart(2, "0");
  document.getElementById("seconds").innerText = String(s).padStart(2, "0");

  if (diff === 0) clearInterval(countdownTimer);
}
const countdownTimer = setInterval(updateCountdown, 1000);
updateCountdown();

/* --- DYNAMIC CONTENT --- */

// Outreach stats


// Outreach events (gallery)
const outreachGrid = document.getElementById("outreachGrid");
CONFIG.outreachEvents.forEach((event) => {
  const initials = event.title
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  const img = document.createElement("img");
  img.className = "event-photo";
  img.src = event.image;
  img.alt = event.title;
  // Show an initials tile until a real photo exists at event.image
  img.addEventListener("error", () => {
    const fallback = document.createElement("div");
    fallback.className = "event-photo-fallback";
    fallback.textContent = initials;
    img.replaceWith(fallback);
  });

  const body = document.createElement("div");
  body.className = "event-body";
  const title = document.createElement("h3");
  title.textContent = event.title;
  const desc = document.createElement("p");
  desc.textContent = event.description;
  body.append(title, desc);

  const card = document.createElement("div");
  card.className = "event-card";
  card.append(img, body);
  outreachGrid.appendChild(card);
});

// Contributors
const contribGrid = document.getElementById("contributorsGrid");
CONFIG.contributors.forEach((c) => {
  const div = document.createElement("div");
  div.className = "mini-card";
  div.innerHTML = `<h3>${c.name}</h3><p class="role">${c.role}</p><p class="affiliation">${c.affiliation}</p>`;
  contribGrid.appendChild(div);
});

// Archive
const archiveGrid = document.getElementById("archiveGrid");
CONFIG.pastCompetitions.forEach((c) => {
  const div = document.createElement("div");
  div.className = "mini-card";
  div.innerHTML = `
    <h3>${c.month}</h3>
    <p>Participants: ${c.participants}</p>
    <p>Prize winner: <span class="highlight">${c.winner}</span></p>
    <p>High Score: ${c.topScore}</p>
    <p>Test: <a href="${c.testUrl}" target="_blank" rel="noopener noreferrer">${c.testUrl}</a></p>`;
  archiveGrid.appendChild(div);
});

/* --- COSMOS BACKGROUND ENGINE --- */
const canvas = document.getElementById("space-canvas");
const ctx = canvas.getContext("2d");
let width, height, cx, cy;

let bgStars = []; // parallax starfield (3 depth layers)
let galaxy = []; // rotating spiral galaxy
let nebulae = []; // drifting color clouds
let shootingStars = [];
let comet = []; // cursor comet trail
let galaxyAngle = 0;

let mouse = { x: null, y: null, radius: 150 };
let parallax = { x: 0, y: 0, tx: 0, ty: 0 };

window.addEventListener("mousemove", (e) => {
  mouse.x = e.x;
  mouse.y = e.y;
  parallax.tx = (e.x / window.innerWidth - 0.5) * 50;
  parallax.ty = (e.y / window.innerHeight - 0.5) * 50;
  // Emit comet particles along the cursor path
  comet.push({
    x: e.x,
    y: e.y,
    vx: (Math.random() - 0.5) * 0.6,
    vy: (Math.random() - 0.5) * 0.6,
    life: 1,
    size: Math.random() * 2 + 0.6,
  });
  if (comet.length > 90) comet.shift();
});

// Stop star repulsion when the cursor leaves the page
document.addEventListener("mouseleave", () => {
  mouse.x = null;
  mouse.y = null;
});

function rand(a, b) {
  return a + Math.random() * (b - a);
}

// --- Build the spiral galaxy (log-spiral arms) ---
function buildGalaxy() {
  galaxy = [];
  const arms = 3;
  const count = Math.min(Math.floor((width * height) / 1600), 2200);
  const maxR = Math.min(width, height) * 0.6;
  const palette = [
    [0, 242, 234], // cyan
    [150, 90, 255], // violet
    [255, 70, 140], // pink
    [255, 255, 255], // white
  ];
  for (let i = 0; i < count; i++) {
    const arm = i % arms;
    // bias toward smaller radii for a dense core
    const t = Math.pow(Math.random(), 0.6);
    const r = t * maxR;
    // log spiral + per-arm offset + scatter that tightens near core
    const spin = r * 0.012;
    const scatter = (Math.random() - 0.5) * (0.5 + (1 - t) * 0.9);
    const ang = (arm / arms) * Math.PI * 2 + spin + scatter;
    // color: white/cyan core -> violet/pink outer
    let col;
    if (t < 0.18) col = [255, 255, 255];
    else col = palette[Math.floor(Math.random() * palette.length)];
    galaxy.push({
      r,
      ang,
      size: rand(0.4, 1.8) * (t < 0.18 ? 1.4 : 1),
      col,
      alpha: rand(0.35, 0.95),
      tw: Math.random() * Math.PI * 2,
      twS: rand(0.01, 0.05),
      depth: rand(0.2, 1),
    });
  }
}

// --- Background parallax starfield ---
function buildStars() {
  bgStars = [];
  const count = Math.min(Math.floor((width * height) / 5000), 260);
  for (let i = 0; i < count; i++) {
    bgStars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: rand(0.3, 1.4),
      depth: rand(0.1, 0.6),
      tw: Math.random() * Math.PI * 2,
      twS: rand(0.008, 0.03),
    });
  }
}

// --- Drifting nebula clouds ---
function buildNebulae() {
  const cols = [
    [112, 0, 255],
    [0, 242, 234],
    [255, 0, 110],
    [80, 30, 200],
  ];
  nebulae = cols.map((c) => ({
    x: rand(0.1, 0.9) * width,
    y: rand(0.1, 0.9) * height,
    r: rand(0.25, 0.5) * Math.min(width, height),
    col: c,
    phase: Math.random() * Math.PI * 2,
    drift: rand(0.02, 0.06),
    dir: Math.random() * Math.PI * 2,
    depth: rand(0.15, 0.45),
  }));
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  cx = width * 0.5;
  cy = height * 0.42;
  buildGalaxy();
  buildStars();
  buildNebulae();
}

class ShootingStar {
  constructor() {
    this.x = Math.random() * width;
    this.y = (Math.random() * height) / 2.2;
    this.len = rand(90, 200);
    this.speed = rand(9, 16);
    this.angle = rand(Math.PI / 6, Math.PI / 3.2);
    this.life = 0;
    this.maxLife = rand(28, 55);
  }
  update() {
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
    this.life++;
  }
  draw() {
    const tx = this.x - Math.cos(this.angle) * this.len;
    const ty = this.y - Math.sin(this.angle) * this.len;
    const fade = Math.max(0, 1 - this.life / this.maxLife);
    const g = ctx.createLinearGradient(this.x, this.y, tx, ty);
    g.addColorStop(0, `rgba(255,255,255,${fade})`);
    g.addColorStop(0.3, `rgba(0,242,234,${fade * 0.8})`);
    g.addColorStop(1, "rgba(0,242,234,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  }
}

function drawNebulae() {
  ctx.globalCompositeOperation = "lighter";
  for (const n of nebulae) {
    n.phase += 0.01;
    n.x += Math.cos(n.dir) * n.drift;
    n.y += Math.sin(n.dir) * n.drift;
    // wrap
    if (n.x < -n.r) n.x = width + n.r;
    if (n.x > width + n.r) n.x = -n.r;
    if (n.y < -n.r) n.y = height + n.r;
    if (n.y > height + n.r) n.y = -n.r;
    const px = n.x + parallax.x * n.depth;
    const py = n.y + parallax.y * n.depth;
    const pulse = 0.05 + (Math.sin(n.phase) * 0.5 + 0.5) * 0.07;
    const g = ctx.createRadialGradient(px, py, 0, px, py, n.r);
    g.addColorStop(0, `rgba(${n.col[0]},${n.col[1]},${n.col[2]},${pulse})`);
    g.addColorStop(1, `rgba(${n.col[0]},${n.col[1]},${n.col[2]},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, n.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

function drawGalaxy() {
  const gcx = cx + parallax.x * 0.4;
  const gcy = cy + parallax.y * 0.4;
  // glowing core
  ctx.globalCompositeOperation = "lighter";
  const core = ctx.createRadialGradient(
    gcx,
    gcy,
    0,
    gcx,
    gcy,
    Math.min(width, height) * 0.16,
  );
  core.addColorStop(0, "rgba(255,255,255,0.5)");
  core.addColorStop(0.3, "rgba(180,160,255,0.22)");
  core.addColorStop(1, "rgba(112,0,255,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(gcx, gcy, Math.min(width, height) * 0.16, 0, Math.PI * 2);
  ctx.fill();

  for (const s of galaxy) {
    const a = s.ang + galaxyAngle / (8 + s.r * 0.02);
    const x = gcx + Math.cos(a) * s.r + parallax.x * s.depth * 0.3;
    // squash vertically for a 3/4 disc perspective
    const y = gcy + Math.sin(a) * s.r * 0.42 + parallax.y * s.depth * 0.3;
    s.tw += s.twS;
    const alpha = s.alpha * (0.6 + Math.sin(s.tw) * 0.4);
    ctx.fillStyle = `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

function drawStars() {
  for (const s of bgStars) {
    let px = s.x + parallax.x * s.depth;
    let py = s.y + parallax.y * s.depth;
    if (mouse.x !== null) {
      const dx = mouse.x - px;
      const dy = mouse.y - py;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < mouse.radius) {
        const f = (mouse.radius - d) / mouse.radius;
        px -= (dx / d) * f * 14 * s.depth;
        py -= (dy / d) * f * 14 * s.depth;
      }
    }
    s.tw += s.twS;
    const alpha = 0.45 + Math.sin(s.tw) * 0.45;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawComet() {
  ctx.globalCompositeOperation = "lighter";
  for (let i = comet.length - 1; i >= 0; i--) {
    const p = comet[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.025;
    if (p.life <= 0) {
      comet.splice(i, 1);
      continue;
    }
    ctx.fillStyle = `rgba(0,242,234,${p.life * 0.8})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

function animate() {
  ctx.clearRect(0, 0, width, height);
  parallax.x += (parallax.tx - parallax.x) * 0.04;
  parallax.y += (parallax.ty - parallax.y) * 0.04;
  galaxyAngle += 0.03;

  drawNebulae();
  drawStars();
  drawGalaxy();
  drawComet();

  if (Math.random() < 0.005 && shootingStars.length < 2) {
    shootingStars.push(new ShootingStar());
  }
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    shootingStars[i].update();
    shootingStars[i].draw();
    if (shootingStars[i].life > shootingStars[i].maxLife)
      shootingStars.splice(i, 1);
  }

  requestAnimationFrame(animate);
}

window.addEventListener("resize", resize);
resize();
animate();
