import pino from "pino";
import pinoHttp from "pino-http";

// ─── Base logger ─────────────────────────────────────────────────────
const level = process.env.LOG_LEVEL || "info";

export const logger = pino({
  level,
  // Pretty-print in dev, JSON in production (Docker)
  ...(process.env.NODE_ENV !== "production" && {
    transport: { target: "pino/file", options: { destination: 1 } },
  }),
});

// ─── HTTP request logger (replaces Morgan) ───────────────────────────
export const httpLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === "/api/public-settings" || req.url === "/api/auth/me",
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      userId: req.raw?.user?.id,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

// ─── Audit logger ────────────────────────────────────────────────────
// Structured events for security-relevant actions
export function audit(action, details = {}) {
  logger.info({ audit: true, action, ...details });
}

// Convenience helpers for common audit events
export const auditLog = {
  login(userId, email, method = "email") {
    audit("login", { userId, email, method });
  },
  loginFailed(email, reason) {
    audit("login_failed", { email, reason });
  },
  signup(userId, email) {
    audit("signup", { userId, email });
  },
  logout(userId) {
    audit("logout", { userId });
  },
  passwordReset(userId, email) {
    audit("password_reset", { userId, email });
  },
  passwordChange(userId) {
    audit("password_change", { userId });
  },
  profileUpdate(userId, fields) {
    audit("profile_update", { userId, fields });
  },
  troopCreated(userId, troopId, name) {
    audit("troop_created", { userId, troopId, name });
  },
  troopDeleted(userId, troopId) {
    audit("troop_deleted", { userId, troopId });
  },
  memberApproved(adminId, userId, troopId) {
    audit("member_approved", { adminId, userId, troopId });
  },
  memberDenied(adminId, userId, troopId) {
    audit("member_denied", { adminId, userId, troopId });
  },
  memberRemoved(adminId, userId, troopId) {
    audit("member_removed", { adminId, userId, troopId });
  },
  roleChanged(adminId, userId, role, scope) {
    audit("role_changed", { adminId, userId, role, ...scope });
  },
  adminPromoted(adminId, userId) {
    audit("admin_promoted", { adminId, userId });
  },
  adminDemoted(adminId, userId) {
    audit("admin_demoted", { adminId, userId });
  },
  settingChanged(adminId, key) {
    audit("setting_changed", { adminId, key });
  },
  adventureCreated(userId, adventureId, name) {
    audit("adventure_created", { userId, adventureId, name });
  },
  adventureDeleted(userId, adventureId) {
    audit("adventure_deleted", { userId, adventureId });
  },
  invitationSent(adminId, email, adventureId) {
    audit("invitation_sent", { adminId, email, adventureId });
  },
};
