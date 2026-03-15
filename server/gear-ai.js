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

  const prompt = `You are an expert gear advisor for high-adventure Scouting treks like Philmont. For the gear item "${item.name}" (category: ${item.category}${item.subcategory ? ", subcategory: " + item.subcategory : ""}${item.description ? ", description: " + item.description : ""}), recommend the top 3 products that are highly rated, popular with Philmont/high-adventure trekkers, and currently available.

For each product include:
- product_name: the specific product name
- brand: manufacturer
- price_range: estimated price as a string like "$45" or "$120-150"
- weight_oz: weight in ounces (number, or null if not applicable)
- why_recommended: 1-2 sentences on why this is great for Philmont/backpacking
- amazon_search_url: a search URL in format https://www.amazon.com/s?k=ENCODED_SEARCH_TERMS&tag=${affiliateTag}

Respond ONLY with valid JSON: { "recommendations": [ { "product_name": "...", "brand": "...", "price_range": "...", "weight_oz": ..., "why_recommended": "...", "amazon_search_url": "..." } ] }`;

  try {
    const response = await api.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
      system: "You are a knowledgeable outdoor gear expert specializing in Philmont Scout Ranch and BSA high-adventure trek gear. You respond ONLY with valid JSON, no markdown.",
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
