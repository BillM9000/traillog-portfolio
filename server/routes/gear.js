import { Router } from "express";
import {
  requireAuth, requireGlobalAdmin, requireAdventureMember,
  requireAdventureSelfOrAdmin, parseId, safeError, buildBuyUrls,
} from "../middleware.js";
import {
  getGearItems, getSetting, getTroop,
  getGearCatalog, getGearCatalogItem, getGearCategories,
  createGearCatalogItem, updateGearCatalogItem, softDeleteGearCatalogItem, reorderGearCatalog,
  addProductOption, updateProductOption, deleteProductOption,
  getCachedGearRec, upsertGearRec,
  earnBadge, findUserById, getAdventure,
  trackAffiliateClick,
  getAdventureMemberGearAll, getMemberGear, upsertMemberGear, bulkSetMemberGear, removeMemberGearItem,
  getMemberPackWeight,
  getUserMemberships, logAIQuery, getAIUsage,
} from "../db.js";
import { sendBadgeEarnedEmail } from "../email.js";

const router = Router();

// ═══════════════════════════════════════════
// GEAR ROUTES (legacy — kept for backward compat)
// ═══════════════════════════════════════════

router.get("/api/gear", requireAuth, (req, res) => {
  try {
    const tags = req.query.tags ? req.query.tags.split(",") : null;
    const items = getGearItems(tags);

    const troopId = req.query.troop ? parseId(req.query.troop) : null;
    if (troopId) {
      const troop = getTroop(troopId);
      const tag = troop?.amazon_affiliate_tag || getSetting("amazon_affiliate_tag");
      if (tag) {
        items.forEach(item => {
          if (item.affiliate_url && !item.affiliate_url.includes("tag=")) {
            item.affiliate_url += (item.affiliate_url.includes("?") ? "&" : "?") + `tag=${tag}`;
          }
        });
      }
    }
    res.json(items);
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// GEAR CATALOG ROUTES (v5)
// ═══════════════════════════════════════════

// Get full gear catalog (with product options and retailers)
router.get("/api/gear-catalog", requireAuth, (req, res) => {
  try {
    const troopId = req.query.troop ? parseId(req.query.troop) : null;
    res.json(getGearCatalog(troopId));
  } catch (e) { safeError(res, e); }
});

// Get gear categories with counts
router.get("/api/gear-catalog/categories", requireAuth, (req, res) => {
  try { res.json(getGearCategories()); }
  catch (e) { safeError(res, e); }
});

// Get single gear item with all details
router.get("/api/gear-catalog/:id", requireAuth, (req, res) => {
  try {
    const item = getGearCatalogItem(parseId(req.params.id));
    if (!item) return res.status(404).json({ error: "Gear item not found" });
    res.json(item);
  } catch (e) { safeError(res, e); }
});

// AI Gear Recommendation — uses cached recs or generates on-demand
router.post("/api/gear-catalog/:id/ai-recommend", requireAuth, async (req, res) => {
  try {
    const gearId = parseId(req.params.id);
    if (!gearId) return res.status(400).json({ error: "Invalid gear item ID" });

    const item = getGearCatalogItem(gearId);
    if (!item) return res.status(404).json({ error: "Gear item not found" });

    const adventureType = req.body.adventureType || "philmont";

    // Check cache first
    const cached = getCachedGearRec(gearId, adventureType);
    if (cached) {
      // Build buy URLs with current affiliate tag for cached recs
      const tag = getSetting("amazon_affiliate_tag") || "traillog-20";
      const recommendations = cached.recommendations.map(r => ({
        ...r,
        ...buildBuyUrls(r, tag),
      }));

      // Award badge (same logic regardless of cache)
      let badge_earned = null;
      const adventureId = parseId(req.body.adventureId);
      if (adventureId) {
        const earned = earnBadge(adventureId, req.user.id, "ai_gear");
        if (earned) {
          badge_earned = "ai_gear";
          const badgeUser = findUserById(req.user.id);
          const adventure = getAdventure(adventureId);
          const badgeTroop = adventure ? getTroop(adventure.troop_id) : null;
          if (badgeUser?.email) {
            sendBadgeEarnedEmail(badgeUser.email, badgeUser.name, "ai_gear", adventure?.name || "your adventure", {
              troopName: badgeTroop?.name, troopId: badgeTroop?.id, adventureId,
            }).catch(err => console.error("[email] Badge email failed:", err.message));
          }
        }
      }

      // Artificial delay so the "AI generating" animation still plays
      await new Promise(resolve => setTimeout(resolve, 1500));
      return res.json({ recommendations, badge_earned, cached: true, generated_at: cached.generated_at });
    }

    // Not cached — generate on-demand with Sonnet
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: "AI recommendations unavailable — API key not configured" });
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const tag = getSetting("amazon_affiliate_tag") || "traillog-20";
    const prompt = `You are an expert gear advisor for high-adventure Scouting treks like Philmont. For the gear item "${item.name}" (category: ${item.category}), recommend the top 3 products that are highly rated, popular with Philmont/high-adventure trekkers, and currently available. For each product include: product_name (the EXACT full product name as sold on Amazon), brand, model_number (specific model or SKU if known, or null), price_range (as a string like "$45"), weight_oz (number, if applicable, otherwise null), why_recommended (1-2 sentences). Do NOT include URLs. Focus on durability, weight, and trail-proven performance. Respond ONLY with valid JSON: { "recommendations": [ { "product_name": "...", "brand": "...", "model_number": "...", "price_range": "...", "weight_oz": ..., "why_recommended": "..." } ] }`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
      system: "You are a knowledgeable outdoor gear expert specializing in Philmont Scout Ranch and BSA high-adventure trek gear. You respond ONLY with valid JSON, no markdown.",
    });

    let text = response.content[0].text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    const parsed = JSON.parse(text);
    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    const recommendations = (parsed.recommendations || []).map(r => ({
      ...r,
      ...buildBuyUrls(r, tag),
    }));

    // Cache the result (expires in 7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);
    upsertGearRec(gearId, adventureType, parsed.recommendations || [], tokensUsed, expiresAt);

    // Award ai_gear badge if adventureId provided
    let badge_earned = null;
    const adventureId = parseId(req.body.adventureId);
    if (adventureId) {
      const earned = earnBadge(adventureId, req.user.id, "ai_gear");
      if (earned) {
        badge_earned = "ai_gear";
        const badgeUser = findUserById(req.user.id);
        const adventure = getAdventure(adventureId);
        const badgeTroop = adventure ? getTroop(adventure.troop_id) : null;
        if (badgeUser?.email) {
          sendBadgeEarnedEmail(badgeUser.email, badgeUser.name, "ai_gear", adventure?.name || "your adventure", {
            troopName: badgeTroop?.name, troopId: badgeTroop?.id, adventureId,
          }).catch(err => console.error("[email] Badge email failed:", err.message));
        }
      }
    }

    res.json({ recommendations, badge_earned, cached: false });
  } catch (e) {
    console.error("[AI Gear Recommend] Error:", e.message);
    safeError(res, e);
  }
});

// Admin: Create gear item
router.post("/api/gear-catalog", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    if (!req.body.name?.trim()) return res.status(400).json({ error: "Gear item name is required" });
    if (!req.body.category?.trim()) return res.status(400).json({ error: "Category is required" });
    const item = createGearCatalogItem(req.body);
    res.status(201).json(item);
  } catch (e) { safeError(res, e); }
});

// Admin: Update gear item
router.put("/api/gear-catalog/:id", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    updateGearCatalogItem(parseId(req.params.id), req.body);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Admin: Soft-delete gear item
router.delete("/api/gear-catalog/:id", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    softDeleteGearCatalogItem(parseId(req.params.id));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Admin: Reorder gear items
router.put("/api/gear-catalog-reorder", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be array" });
    reorderGearCatalog(orderedIds);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Admin: Add product option to gear item
router.post("/api/gear-catalog/:id/options", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    const option = addProductOption(parseId(req.params.id), req.body);
    res.status(201).json(option);
  } catch (e) { safeError(res, e); }
});

// Admin: Update product option
router.put("/api/gear-catalog/options/:optId", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    updateProductOption(parseId(req.params.optId), req.body);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Admin: Delete product option
router.delete("/api/gear-catalog/options/:optId", requireAuth, requireGlobalAdmin, (req, res) => {
  try {
    deleteProductOption(parseId(req.params.optId));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// AFFILIATE CLICK TRACKING
// ═══════════════════════════════════════════

router.post("/api/affiliate/click", requireAuth, (req, res) => {
  try {
    const { product_option_id, gear_catalog_id, url } = req.body;
    if (!url) return res.status(400).json({ error: "url required" });
    trackAffiliateClick(req.user.id, product_option_id, gear_catalog_id, url, req.headers.referer);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// MEMBER GEAR ROUTES (adventure-scoped)
// ═══════════════════════════════════════════

// Get all member gear for an adventure
router.get("/api/adventures/:adventureId/gear", requireAuth, requireAdventureMember, (req, res) => {
  try {
    res.json(getAdventureMemberGearAll(parseId(req.params.adventureId)));
  } catch (e) { safeError(res, e); }
});

// Get single member's gear selections
router.get("/api/adventures/:adventureId/members/:userId/gear", requireAuth, requireAdventureMember, (req, res) => {
  try {
    res.json(getMemberGear(parseId(req.params.adventureId), parseId(req.params.userId)));
  } catch (e) { safeError(res, e); }
});

// Update a single gear item selection for a member
router.put("/api/adventures/:adventureId/members/:userId/gear-item/:gearId", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    const id = upsertMemberGear(
      parseId(req.params.adventureId),
      parseId(req.params.userId),
      parseId(req.params.gearId),
      req.body
    );
    res.json({ ok: true, id });
  } catch (e) { safeError(res, e); }
});

// Bulk set member gear (initial setup / quick-add)
router.post("/api/adventures/:adventureId/members/:userId/gear-bulk", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    const { selections } = req.body;
    if (!Array.isArray(selections)) return res.status(400).json({ error: "selections must be array" });
    bulkSetMemberGear(parseId(req.params.adventureId), parseId(req.params.userId), selections);
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Remove a gear selection from a member
router.delete("/api/adventures/:adventureId/members/:userId/gear-item/:gearId", requireAuth, requireAdventureMember, requireAdventureSelfOrAdmin, (req, res) => {
  try {
    removeMemberGearItem(parseId(req.params.adventureId), parseId(req.params.userId), parseId(req.params.gearId));
    res.json({ ok: true });
  } catch (e) { safeError(res, e); }
});

// Get pack weight breakdown for a member
router.get("/api/adventures/:adventureId/members/:userId/pack-weight", requireAuth, requireAdventureMember, (req, res) => {
  try {
    res.json(getMemberPackWeight(parseId(req.params.adventureId), parseId(req.params.userId)));
  } catch (e) { safeError(res, e); }
});

// ═══════════════════════════════════════════
// AI GEAR ROUTES (premium features)
// ═══════════════════════════════════════════

router.post("/api/gear/ai/weight-lookup", requireAuth, (req, res) => {
  try {
    // Premium check
    const userMemberships = getUserMemberships(req.user.id);
    const hasPremium = userMemberships.some(m => {
      const troop = getTroop(m.troop_id);
      return troop?.tier === "premium";
    });
    if (!hasPremium) return res.status(403).json({ error: "Premium feature", upgrade: true });
    if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "AI weight lookup not configured" });

    // Stub: AI weight lookup will be implemented with Anthropic API
    const { product_name } = req.body;
    if (!product_name?.trim()) return res.status(400).json({ error: "product_name required" });
    res.json({ product_name, estimated_weight_oz: null, confidence: "unavailable", source: "ai_lookup_pending" });
  } catch (e) { safeError(res, e); }
});

router.post("/api/gear/ai/chat", requireAuth, (req, res) => {
  try {
    const userMemberships = getUserMemberships(req.user.id);
    const hasPremium = userMemberships.some(m => {
      const troop = getTroop(m.troop_id);
      return troop?.tier === "premium";
    });
    if (!hasPremium) return res.status(403).json({ error: "Premium feature", upgrade: true });
    if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "AI chatbot not configured" });

    const { message, adventure_id } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "message required" });

    // Stub: AI chatbot will be implemented with Anthropic API
    const response = "AI gear chatbot is being set up. Check back soon for personalized gear advice!";
    logAIQuery(req.user.id, adventure_id, message, response, 0);
    res.json({ response, tokens_used: 0 });
  } catch (e) { safeError(res, e); }
});

router.get("/api/gear/ai/usage", requireAuth, (req, res) => {
  try { res.json(getAIUsage(req.user.id)); }
  catch (e) { safeError(res, e); }
});

export default router;
