import Anthropic from "@anthropic-ai/sdk";
import { getAllGearCatalogItems, getCachedGearRec, upsertGearRec, getSetting } from "./db.js";

let client = null;
let refreshInProgress = false;

function getClient() {
  if (!client && process.env.ANTHROPIC_API_KEY) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate AI gear recommendations for a single catalog item.
 * Returns { recommendations, tokensUsed } or null on failure.
 */
async function generateRecsForItem(item, adventureType, affiliateTag) {
  const api = getClient();
  if (!api) return null;

  // Prompt engineering pattern (see CLAUDE_ARCHITECT_ALIGNMENT.md - Domain 4):
  //   - Injects item.name, item.category, item.subcategory, item.description as context
  //   - Requests top 3 product recommendations with structured fields
  //   - Explicit JSON schema: { recommendations: [{ product_name, brand, model_number, price_range, weight_oz, why_recommended }] }
  //   - Constraint: no URLs (generated server-side from product names)
  //
  // [Full prompt content redacted — proprietary recommendation logic]
  const prompt = `[Prompt redacted — generates gear recommendations for "${item.name}" (${item.category}). Returns structured JSON with product details. See CLAUDE_ARCHITECT_ALIGNMENT.md.]`;

  try {
    const response = await api.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
      // System prompt: gear expert role + JSON-only output constraint
      system: "[System prompt redacted — defines outdoor gear expert role with JSON-only output requirement]",
    });

    let text = response.content[0].text.trim();
    // Strip markdown code fences if model wraps the JSON
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    const parsed = JSON.parse(text);
    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    return {
      recommendations: parsed.recommendations || [],
      tokensUsed,
    };
  } catch (e) {
    console.error(`[gear-ai] Error generating recs for "${item.name}":`, e.message);
    return null;
  }
}

/**
 * Refresh all gear recommendations that are expired or missing.
 * Loops through every active gear catalog item and generates recs for any
 * that don't have a valid (non-expired) cached entry.
 */
export async function refreshAllGearRecommendations() {
  if (refreshInProgress) {
    console.log("[gear-ai] Refresh already in progress, skipping");
    return { skipped: true };
  }

  const api = getClient();
  if (!api) {
    console.log("[gear-ai] No ANTHROPIC_API_KEY set, skipping refresh");
    return { skipped: true, reason: "no_api_key" };
  }

  refreshInProgress = true;
  const adventureType = "philmont";
  const affiliateTag = getSetting("amazon_affiliate_tag") || "traillog-20";

  try {
    const items = getAllGearCatalogItems();
    let refreshed = 0;
    let skipped = 0;
    let failed = 0;

    console.log(`[gear-ai] Starting refresh for ${items.length} gear catalog items`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Check if we already have a valid cached rec
      const cached = getCachedGearRec(item.id, adventureType);
      if (cached) {
        skipped++;
        continue;
      }

      // Generate new recs
      const result = await generateRecsForItem(item, adventureType, affiliateTag);
      if (result && result.recommendations.length > 0) {
        // Set expiry to 7 days from now
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);
        upsertGearRec(item.id, adventureType, result.recommendations, result.tokensUsed, expiresAt);
        refreshed++;
        console.log(`[gear-ai] Refreshed ${refreshed}/${items.length - skipped} items (${item.name})`);
      } else {
        failed++;
        console.log(`[gear-ai] Failed to generate recs for "${item.name}"`);
      }

      // Sleep 1 second between API calls to avoid rate limits
      if (i < items.length - 1) {
        await sleep(1000);
      }
    }

    console.log(`[gear-ai] Refresh complete: ${refreshed} refreshed, ${skipped} cached (still valid), ${failed} failed`);
    return { refreshed, skipped, failed, total: items.length };
  } catch (e) {
    console.error("[gear-ai] Refresh error:", e.message);
    return { error: e.message };
  } finally {
    refreshInProgress = false;
  }
}

/**
 * Start the background gear recommendation refresh schedule.
 * - Runs once on startup (after 30s delay)
 * - Then checks every 24 hours for expired items
 */
export function startGearRefreshSchedule() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("[gear-ai] ANTHROPIC_API_KEY not set, background refresh disabled");
    return;
  }

  console.log("[gear-ai] Background refresh scheduled (first run in 30s, then every 24h)");

  // Initial run after 30 second delay
  setTimeout(() => {
    refreshAllGearRecommendations().catch(e =>
      console.error("[gear-ai] Initial refresh error:", e.message)
    );
  }, 30000);

  // Then every 24 hours
  setInterval(() => {
    refreshAllGearRecommendations().catch(e =>
      console.error("[gear-ai] Scheduled refresh error:", e.message)
    );
  }, 24 * 60 * 60 * 1000);
}

export function isRefreshInProgress() {
  return refreshInProgress;
}
