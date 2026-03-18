import {
  getTroopMember, getAdventureMember, getAdventure, getCrew,
  addAdventureMember, updateInvitationStatus, autoLinkAdult, autoLinkScout,
  requestJoinTroop, approveTroopMember,
} from "./db.js";

// Safe parseInt — returns null if invalid, lets routes return 400
export function parseId(val) { const n = parseInt(val); return isNaN(n) ? null : n; }

// Escape text for .ics format (RFC 5545)
export function icsEscape(str) { return String(str || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }

// Safe error response — hides internal details in production
export function safeError(res, e, status = 500) {
  console.error(e);
  res.status(status).json({ error: process.env.NODE_ENV === "production" ? "Something went wrong" : e.message });
}

/** Build precise retailer URLs from structured product data */
export function buildBuyUrls(rec, affiliateTag) {
  const brandRe = rec.brand ? new RegExp(`^${rec.brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i") : null;
  const productClean = brandRe && rec.product_name ? rec.product_name.replace(brandRe, "") : (rec.product_name || "");
  const searchTerms = [rec.brand, productClean, rec.model_number].filter(Boolean).join(" ");

  return {
    buy_url: `https://www.amazon.com/s?k=${encodeURIComponent(searchTerms)}&tag=${encodeURIComponent(affiliateTag)}`,
    rei_url: `https://www.rei.com/search?q=${encodeURIComponent(searchTerms)}`,
  };
}

// ── Auth middleware ──

export function requireAuth(req, res, next) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
  next();
}

export function isGlobalAdmin(req) {
  return !!(req.user?.is_admin);
}

export function requireGlobalAdmin(req, res, next) {
  if (!req.isAuthenticated() || !req.user?.is_admin) return res.status(403).json({ error: "Global admin access required" });
  next();
}

export function requireTroopMember(requiredStatus = "approved") {
  return async (req, res, next) => {
    if (isGlobalAdmin(req)) { req.membership = { role: "admin", status: "approved" }; return next(); }
    const troopId = parseId(req.params.troopId);
    const membership = await getTroopMember(troopId, req.user.id);
    if (!membership || membership.status !== requiredStatus) {
      return res.status(403).json({ error: "Not an approved member of this troop" });
    }
    req.membership = membership;
    next();
  };
}

export async function requireTroopAdmin(req, res, next) {
  if (isGlobalAdmin(req)) { req.membership = { role: "admin", status: "approved" }; return next(); }
  const troopId = parseId(req.params.troopId);
  const membership = await getTroopMember(troopId, req.user.id);
  if (!membership || membership.role !== "admin" || membership.status !== "approved") {
    return res.status(403).json({ error: "Admin access required" });
  }
  req.membership = membership;
  next();
}

export async function requireSelfOrAdmin(req, res, next) {
  const troopId = parseId(req.params.troopId);
  const targetUserId = parseId(req.params.userId);
  if (req.user.id === targetUserId) return next();
  const membership = await getTroopMember(troopId, req.user.id);
  if (membership?.role === "admin" && membership.status === "approved") return next();
  res.status(403).json({ error: "Can only edit your own data" });
}

export async function requireAdventureMember(req, res, next) {
  const adventureId = parseId(req.params.adventureId);
  const member = await getAdventureMember(adventureId, req.user.id);
  if (!member) return res.status(403).json({ error: "Not a member of this adventure" });
  req.adventureMembership = member;
  next();
}

export async function requireAdventureAdmin(req, res, next) {
  if (isGlobalAdmin(req)) return next();
  const adventureId = parseId(req.params.adventureId);
  const member = await getAdventureMember(adventureId, req.user.id);
  if (member && member.role === "admin") {
    req.adventureMembership = member;
    return next();
  }
  const adventure = await getAdventure(adventureId);
  if (adventure) {
    const troopMember = await getTroopMember(adventure.troop_id, req.user.id);
    if (troopMember && troopMember.role === "admin" && troopMember.status === "approved") {
      req.adventureMembership = member;
      return next();
    }
  }
  return res.status(403).json({ error: "Adventure admin access required" });
}

export async function requireAdventureSelfOrAdmin(req, res, next) {
  if (isGlobalAdmin(req)) return next();
  const adventureId = parseId(req.params.adventureId);
  const targetUserId = parseId(req.params.userId);
  if (req.user.id === targetUserId) return next();
  const member = await getAdventureMember(adventureId, req.user.id);
  if (member?.role === "admin") return next();
  const adventure = await getAdventure(adventureId);
  if (adventure) {
    const troopMember = await getTroopMember(adventure.troop_id, req.user.id);
    if (troopMember?.role === "admin" && troopMember.status === "approved") return next();
  }
  res.status(403).json({ error: "Can only edit your own data" });
}

// ── Crew middleware ──

export async function requireCrewMember(req, res, next) {
  const crewId = parseId(req.params.crewId);
  if (!crewId) return res.status(400).json({ error: "Invalid crew ID" });
  const crew = await getCrew(crewId);
  if (!crew) return res.status(404).json({ error: "Crew not found" });
  req.crew = crew;
  const member = await getAdventureMember(crew.adventure_id, req.user.id);
  if (!member) return res.status(403).json({ error: "Not a member of this crew's adventure" });
  req.adventureMembership = member;
  next();
}

export async function requireCrewAdmin(req, res, next) {
  if (isGlobalAdmin(req)) {
    const crewId = parseId(req.params.crewId);
    const crew = await getCrew(crewId);
    if (!crew) return res.status(404).json({ error: "Crew not found" });
    req.crew = crew;
    return next();
  }
  const crewId = parseId(req.params.crewId);
  if (!crewId) return res.status(400).json({ error: "Invalid crew ID" });
  const crew = await getCrew(crewId);
  if (!crew) return res.status(404).json({ error: "Crew not found" });
  req.crew = crew;
  const member = await getAdventureMember(crew.adventure_id, req.user.id);
  if (member?.role === "admin") return next();
  const adventure = await getAdventure(crew.adventure_id);
  if (adventure) {
    const troopMember = await getTroopMember(adventure.troop_id, req.user.id);
    if (troopMember?.role === "admin" && troopMember.status === "approved") return next();
  }
  return res.status(403).json({ error: "Crew admin access required" });
}

export async function requireCrewSelfOrAdmin(req, res, next) {
  if (isGlobalAdmin(req)) {
    const crewId = parseId(req.params.crewId);
    const crew = await getCrew(crewId);
    if (!crew) return res.status(404).json({ error: "Crew not found" });
    req.crew = crew;
    return next();
  }
  const crewId = parseId(req.params.crewId);
  const targetUserId = parseId(req.params.userId);
  if (req.user.id === targetUserId) {
    const crew = await getCrew(crewId);
    if (!crew) return res.status(404).json({ error: "Crew not found" });
    req.crew = crew;
    return next();
  }
  return requireCrewAdmin(req, res, next);
}

/**
 * Process a pending invitation — auto-join troop + adventure.
 */
export async function processInvitation(user, invitation) {
  try {
    // Auto-join troop if not already a member
    const troopMember = await getTroopMember(invitation.troop_id, user.id);
    if (!troopMember) {
      await requestJoinTroop(user.id, invitation.troop_id);
      await approveTroopMember(invitation.troop_id, user.id);
    } else if (troopMember.status === "pending") {
      await approveTroopMember(invitation.troop_id, user.id);
    }
    // Auto-join adventure if specified
    if (invitation.adventure_id) {
      const advMember = await getAdventureMember(invitation.adventure_id, user.id);
      if (!advMember) {
        await addAdventureMember(invitation.adventure_id, user.id, "member");
        if (user.user_type === "adult") await autoLinkAdult(invitation.adventure_id, user.id);
        else if (user.user_type === "scout") await autoLinkScout(invitation.adventure_id, user.id);
      }
    }
    await updateInvitationStatus(invitation.id, "accepted");
  } catch (e) {
    console.error("processInvitation error:", e);
  }
}
