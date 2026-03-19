import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { logger, httpLogger, auditLog } from "./logger.js";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import passport from "./auth.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  pool, initializeDatabase, getSetting, getCouncils, getDashboardData,
  getOnboarding, setOnboardingRole, completeOnboardingStep, completeOnboarding,
} from "./db.js";
import { validate, voteSchema, deleteVoteSchema } from "./validation.js";
import { startGearRefreshSchedule } from "./gear-ai.js";
import { startReminderScheduler } from "./scheduler.js";
import { requireAuth, safeError } from "./middleware.js";

// Route modules
import authRoutes from "./routes/auth.js";
import troopRoutes from "./routes/troops.js";
import adventureRoutes from "./routes/adventures.js";
import crewRoutes from "./routes/crews.js";
import trainingRoutes from "./routes/training.js";
import gearRoutes from "./routes/gear.js";
import adminRoutes from "./routes/admin.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3614;

app.set("trust proxy", 1);
app.use(express.json({ limit: "6mb" }));

// ── Security Headers ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.googleusercontent.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(morgan("short"));
app.use(httpLogger);

// ── Public settings (before rate limiter — must always be available) ──
app.get("/api/public-settings", async (req, res) => {
  res.json({
    maintenance_mode: await getSetting("maintenance_mode") === "true",
    maintenance_message: await getSetting("maintenance_message") || "",
    registration_enabled: await getSetting("registration_enabled") !== "false",
    announcement_enabled: await getSetting("announcement_enabled") === "true",
    announcement_banner: await getSetting("announcement_banner") || "",
    announcement_type: await getSetting("announcement_type") || "info",
  });
});

// ── Councils list (public, no auth — needed for troop creation forms) ──
app.get("/api/councils", async (req, res) => {
  res.json(await getCouncils());
});

// ── Rate Limiting ──
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 100, message: { error: "Too many requests" }, standardHeaders: true, legacyHeaders: false });
app.use("/api/", apiLimiter);

// ── Sessions (PostgreSQL via connect-pg-simple) ──
const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({
    pool,
    tableName: "sessions",
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || (() => { if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET required in production"); return "dev-secret-local-only"; })(),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// Serve static frontend in production
app.use(express.static(join(__dirname, "../client/dist")));

// ── CSRF Protection (double-submit cookie pattern) ──
app.use((req, res, next) => {
  // Generate token if session exists but has no token yet
  if (req.session && !req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  // Set readable cookie so client can send it back as a header
  if (req.session?.csrfToken) {
    res.cookie("XSRF-TOKEN", req.session.csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }
  // Validate on state-changing methods (exempt standalone vote page)
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method) && req.path !== "/api/vote") {
    const token = req.headers["x-csrf-token"];
    if (!req.session?.csrfToken || token !== req.session.csrfToken) {
      return res.status(403).json({ error: "Invalid CSRF token" });
    }
  }
  next();
});

// ── Maintenance mode ──
app.use("/api", async (req, res, next) => {
  if (req.path === "/health" || req.path === "/public-settings" || req.path === "/councils") return next();
  if (await getSetting("maintenance_mode") === "true") {
    if (req.isAuthenticated() && req.user?.is_admin) return next();
    const msg = await getSetting("maintenance_message") || "TrailLog is temporarily down for maintenance. Please check back soon.";
    return res.status(503).json({ error: msg, maintenance: true });
  }
  next();
});

// ═══════════════════════════════════════════
// MOUNT ROUTE MODULES
// ═══════════════════════════════════════════

app.use(authRoutes);
app.use(troopRoutes);
app.use(adventureRoutes);
app.use(crewRoutes);
app.use(trainingRoutes);
app.use(gearRoutes);
app.use(adminRoutes);

// ═══════════════════════════════════════════
// ROUTES THAT STAY IN INDEX
// ═══════════════════════════════════════════

// Dashboard
app.get("/api/dashboard", requireAuth, async (req, res) => {
  try {
    const data = await getDashboardData(req.user.id, !!req.user.is_admin);
    res.json(data);
  } catch (e) { safeError(res, e); }
});

// ── Onboarding ──
app.get("/api/onboarding", requireAuth, async (req, res) => {
  try {
    const data = await getOnboarding(req.user.id);
    res.json(data);
  } catch (e) { safeError(res, e); }
});

app.put("/api/onboarding/role", requireAuth, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["trekker", "admin", "parent"].includes(role)) {
      return res.status(400).json({ error: "Invalid onboarding role" });
    }
    await setOnboardingRole(req.user.id, role);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

app.put("/api/onboarding/step", requireAuth, async (req, res) => {
  try {
    const { step } = req.body;
    if (!step || typeof step !== "string") {
      return res.status(400).json({ error: "Step ID required" });
    }
    const steps = await completeOnboardingStep(req.user.id, step);
    res.json({ steps });
  } catch (e) { safeError(res, e); }
});

app.put("/api/onboarding/complete", requireAuth, async (req, res) => {
  try {
    await completeOnboarding(req.user.id);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Health check (no auth — for uptime monitoring)
const startedAt = new Date().toISOString();
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "1.0.0", started: startedAt, uptime: Math.floor(process.uptime()) });
});

// ── Legal Pages (standalone HTML, no auth required, crawlable) ──

const legalStyle = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DM Sans', Helvetica, sans-serif; background: #1A2412; color: #D4E4B8; line-height: 1.7; }
    .wrap { max-width: 720px; margin: 0 auto; padding: 40px 24px 60px; }
    h1 { font-family: 'Zilla Slab', Georgia, serif; font-size: 28px; font-weight: 900; color: #FDFAF5; margin-bottom: 8px; }
    .updated { font-size: 12px; color: #7A9A5A; margin-bottom: 32px; }
    h2 { font-size: 18px; font-weight: 700; color: #B8CC9A; margin: 28px 0 10px; }
    p, li { font-size: 14px; margin-bottom: 10px; }
    ul { padding-left: 20px; }
    a { color: #B8CC9A; }
    .back { display: inline-block; margin-bottom: 24px; color: #7A9A5A; font-size: 13px; text-decoration: none; }
    .back:hover { color: #B8CC9A; }
  </style>
`;

app.get("/privacy", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy Policy — TrailLog</title>${legalStyle}</head><body><div class="wrap">
<a href="/" class="back">&larr; Back to TrailLog</a>
<h1>Privacy Policy</h1>
<p class="updated">Last updated: March 13, 2026</p>

<p>TrailLog ("we," "our," or "the app") is a free planning tool for Scouting America high adventure crews, operated by GraceZero.ai. This policy explains what data we collect, why, and how we protect it.</p>

<h2>1. Information We Collect</h2>
<p><strong>Account information:</strong> Name, email address, and age category (13+ or 18+). If you sign in with Google, we also receive your Google profile photo.</p>
<p><strong>Scout-specific:</strong> If you register as a scout, we collect a parent/guardian email address (required).</p>
<p><strong>Usage data:</strong> Training availability dates, gear selections, RSVP responses, and crew coordination data you enter into the app.</p>
<p><strong>Technical data:</strong> We use session cookies to keep you logged in. We do not use tracking cookies, analytics scripts, or third-party advertising.</p>

<h2>2. How We Use Your Information</h2>
<ul>
  <li>To provide the TrailLog service (crew coordination, gear planning, training scheduling)</li>
  <li>To send you email notifications about your crew's activities (training events, itinerary changes, badge awards)</li>
  <li>To notify parent/guardian emails when a scout joins a troop</li>
  <li>To enforce age-based access controls (BSA high adventure requires age 13+)</li>
</ul>

<h2>3. Information We Do NOT Collect</h2>
<ul>
  <li>Date of birth or exact age (only age category: 13+ or 18+)</li>
  <li>Payment or financial information</li>
  <li>Precise geolocation</li>
  <li>Health or medical records</li>
  <li>Social Security numbers or government IDs</li>
</ul>

<h2>4. Data Sharing</h2>
<p>We do <strong>not</strong> sell, rent, or share your personal information with third parties. Your data is only visible to:</p>
<ul>
  <li>Other members of troops and adventures you join</li>
  <li>Troop administrators (who manage membership and training)</li>
  <li>The global platform administrator</li>
</ul>

<h2>5. Data Storage & Security</h2>
<p>Your data is stored in an encrypted database on a secured virtual private server. We use:</p>
<ul>
  <li>HTTPS/TLS encryption for all connections</li>
  <li>Bcrypt password hashing (for email/password accounts)</li>
  <li>HTTP-only, secure session cookies</li>
  <li>Rate limiting to prevent abuse</li>
  <li>Daily automated backups</li>
</ul>

<h2>6. Children's Privacy (COPPA)</h2>
<p>TrailLog is designed for BSA high adventure participants aged 13 and older. We do not knowingly collect information from children under 13. All users must confirm they are at least 13 years old before creating an account. See our <a href="/privacy#coppa">COPPA compliance documentation</a> for details.</p>

<h2>7. Your Rights</h2>
<p>You may request to:</p>
<ul>
  <li>View the personal data we hold about you</li>
  <li>Correct inaccurate information</li>
  <li>Delete your account and associated data</li>
</ul>
<p>Contact us at the email below to make a request.</p>

<h2>8. Changes to This Policy</h2>
<p>We may update this policy as the app evolves. Material changes will be noted with an updated date at the top of this page.</p>

<h2>9. Contact</h2>
<p>For privacy questions or data requests, email: <strong>bill.mccoy@gracezero.ai</strong></p>
</div></body></html>`);
});

app.get("/terms", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Terms of Service — TrailLog</title>${legalStyle}</head><body><div class="wrap">
<a href="/" class="back">&larr; Back to TrailLog</a>
<h1>Terms of Service</h1>
<p class="updated">Last updated: March 13, 2026</p>

<p>By using TrailLog ("the app"), you agree to these terms. If you do not agree, do not use the app.</p>

<h2>1. What TrailLog Is</h2>
<p>TrailLog is a free planning and coordination tool for Scouting America high adventure crews. It helps crews organize training schedules, gear lists, and itinerary planning. TrailLog is <strong>not affiliated with or endorsed by</strong> Scouting America (BSA).</p>

<h2>2. Eligibility</h2>
<p>You must be at least 13 years old to create an account. Users under 18 must have a parent or guardian's email on file. By creating an account, you confirm that you meet these requirements.</p>

<h2>3. Your Account</h2>
<ul>
  <li>You are responsible for keeping your login credentials secure</li>
  <li>You must provide accurate information (name, email, age category)</li>
  <li>You may not create accounts for others without their knowledge</li>
  <li>One person, one account — do not create duplicate accounts</li>
</ul>

<h2>4. Acceptable Use</h2>
<p>You agree not to:</p>
<ul>
  <li>Use the app for any purpose unrelated to crew coordination and high adventure planning</li>
  <li>Submit false information (especially age confirmation)</li>
  <li>Attempt to access other users' accounts or data</li>
  <li>Interfere with or disrupt the service</li>
  <li>Use automated tools to scrape or interact with the app</li>
</ul>

<h2>5. Content You Provide</h2>
<p>You retain ownership of any content you submit (training notes, gear selections, etc.). By using TrailLog, you grant us permission to store and display this content to other members of your troops and adventures as part of the service.</p>

<h2>6. Service Availability</h2>
<p>TrailLog is provided "as is" without warranty. We strive for reliable uptime but do not guarantee uninterrupted access. We may modify, suspend, or discontinue features at any time.</p>

<h2>7. Limitation of Liability</h2>
<p>TrailLog is a planning tool, not a substitute for official BSA guidance. We are not responsible for:</p>
<ul>
  <li>Decisions made based on information in the app</li>
  <li>Physical preparation or safety during high adventure treks</li>
  <li>Gear suitability, fitness, or medical readiness</li>
  <li>Any loss of data, though we take reasonable precautions to prevent it</li>
</ul>

<h2>7a. AI-Generated Content Disclaimer</h2>
<p>TrailLog uses artificial intelligence (AI) to generate training plans, gear recommendations, and readiness assessments. This AI-generated content is provided <strong>for general informational and planning purposes only</strong> and does not constitute medical, fitness, or professional advice. Specifically:</p>
<ul>
  <li>AI training plans are <strong>not a substitute for advice from a licensed physician, certified athletic trainer, or other qualified professional</strong></li>
  <li>You should consult your doctor before beginning any new exercise or training program, especially programs involving altitude, heavy pack weight, or strenuous physical activity</li>
  <li>AI gear recommendations are suggestions based on general data and may not account for your specific needs, body type, or conditions</li>
  <li>If you experience pain, dizziness, chest discomfort, or shortness of breath during training, stop immediately and seek medical attention</li>
  <li>TrailLog, its creators, and its AI providers are not liable for any injury, illness, or loss resulting from following AI-generated plans or recommendations</li>
</ul>

<h2>8. Account Termination</h2>
<p>We may suspend or delete accounts that violate these terms. You may delete your own account by contacting us.</p>

<h2>9. Changes to These Terms</h2>
<p>We may update these terms as the app evolves. Continued use after changes constitutes acceptance.</p>

<h2>10. Contact</h2>
<p>Questions about these terms? Email: <strong>bill.mccoy@gracezero.ai</strong></p>
</div></body></html>`);
});

// ── T-Shirt Vote Page (standalone, not part of main app) ──
app.use("/vote", express.static(join(__dirname, "../vote-page/philmont-vote-portal")));
app.get("/vote", (req, res) => {
  res.sendFile(join(__dirname, "../vote-page/philmont-vote-portal/vote.html"));
});

app.get("/api/vote/counts", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT design_id, COUNT(*) as count FROM shirt_votes GROUP BY design_id");
    const counts = {};
    rows.forEach(r => { counts[r.design_id] = parseInt(r.count); });
    const { rows: voterRows } = await pool.query("SELECT COUNT(DISTINCT voter_name) as c FROM shirt_votes");
    const voterCount = parseInt(voterRows[0].c);
    res.json({ counts, total: rows.reduce((s, r) => s + parseInt(r.count), 0), voters: voterCount });
  } catch (e) { res.status(500).json({ error: "Failed to load votes" }); }
});

app.get("/api/vote/my-votes", async (req, res) => {
  const name = req.query.name;
  if (!name) return res.json({ votes: [] });
  try {
    const { rows } = await pool.query("SELECT design_id, vote_slot FROM shirt_votes WHERE voter_name = $1 ORDER BY vote_slot", [name.trim()]);
    res.json({ votes: rows.map(r => ({ design_id: r.design_id, slot: r.vote_slot })) });
  } catch (e) { res.status(500).json({ error: "Failed to load votes" }); }
});

app.post("/api/vote", validate(voteSchema), async (req, res) => {
  const { voter_name, design_id, vote_slot } = req.body;
  if (!voter_name || !design_id) return res.status(400).json({ error: "Name and design required" });
  const name = voter_name.trim();
  const slot = vote_slot === 2 ? 2 : 1;
  if (name.length < 2 || name.length > 30) return res.status(400).json({ error: "Name must be 2-30 characters" });
  try {
    // Can't vote for the same design in both slots
    const otherSlot = slot === 1 ? 2 : 1;
    const { rows: dupRows } = await pool.query("SELECT id FROM shirt_votes WHERE voter_name = $1 AND vote_slot = $2 AND design_id = $3", [name, otherSlot, design_id]);
    if (dupRows.length > 0) return res.status(400).json({ error: "You already voted for this design in your other slot" });

    const { rows: existingRows } = await pool.query("SELECT id, design_id FROM shirt_votes WHERE voter_name = $1 AND vote_slot = $2", [name, slot]);
    if (existingRows.length > 0) {
      await pool.query("UPDATE shirt_votes SET design_id = $1, updated_at = NOW() WHERE id = $2", [design_id, existingRows[0].id]);
      return res.json({ status: "changed", slot, previous: existingRows[0].design_id });
    }
    await pool.query("INSERT INTO shirt_votes (voter_name, design_id, vote_slot) VALUES ($1, $2, $3)", [name, design_id, slot]);
    res.json({ status: "created", slot });
  } catch (e) { res.status(500).json({ error: "Failed to record vote" }); }
});

app.delete("/api/vote", validate(deleteVoteSchema), async (req, res) => {
  const { voter_name, vote_slot } = req.body;
  if (!voter_name || !vote_slot) return res.status(400).json({ error: "Name and slot required" });
  try {
    await pool.query("DELETE FROM shirt_votes WHERE voter_name = $1 AND vote_slot = $2", [voter_name.trim(), vote_slot]);
    res.json({ status: "removed" });
  } catch (e) { res.status(500).json({ error: "Failed to remove vote" }); }
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "../client/dist/index.html"));
});

// Start server (skip when imported for testing)
if (process.env.NODE_ENV !== "test") {
  // Initialize database (seed data) before starting server
  initializeDatabase().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`TrailLog running on port ${PORT}`);
      startGearRefreshSchedule();
      startReminderScheduler();
    });
  }).catch(err => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });
}

export default app;
