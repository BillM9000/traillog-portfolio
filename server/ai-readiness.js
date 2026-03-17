import Anthropic from "@anthropic-ai/sdk";

let client = null;

function getClient() {
  if (!client && process.env.ANTHROPIC_API_KEY) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * Generate a personalized readiness plan for a crew member.
 * Returns { plan, priorities } where plan has phases and priorities is an array of "Priority Now" items.
 */
export async function generateReadinessPlan({ adventureType, itinerary, departureDate, assessment, gearStatus }) {
  const api = getClient();
  if (!api) {
    return generateFallbackPlan({ adventureType, itinerary, departureDate, assessment, gearStatus });
  }

  const now = new Date();
  const depart = new Date(departureDate);
  const weeksRemaining = Math.max(0, Math.round((depart - now) / (7 * 24 * 60 * 60 * 1000)));

  const prompt = buildPrompt({ adventureType, itinerary, departureDate, weeksRemaining, assessment, gearStatus });

  try {
    const response = await api.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
      // System prompt defines the AI's role, behavioral constraints, and output format.
      // Pattern: role definition + tone adaptation based on urgency + JSON-only output requirement.
      // See CLAUDE_ARCHITECT_ALIGNMENT.md for prompt engineering patterns used here.
      system: "[System prompt redacted — defines trek readiness coach role with outcome-based benchmarks, adaptive urgency, and JSON-only output constraint]",
    });

    let text = response.content[0].text.trim();
    // Strip markdown code fences if Claude wraps the JSON
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    const parsed = JSON.parse(text);
    return {
      plan: parsed.plan || parsed,
      priorities: parsed.priorities || [],
      tokens_used: response.usage?.input_tokens + response.usage?.output_tokens || 0,
    };
  } catch (err) {
    console.error("[AI Readiness] Claude API error:", err.message);
    return generateFallbackPlan({ adventureType, itinerary, departureDate, assessment, gearStatus });
  }
}

function buildPrompt({ adventureType, itinerary, departureDate, weeksRemaining, assessment, gearStatus }) {
  const itin = itinerary ? {
    name: itinerary.name,
    days: itinerary.days,
    miles: itinerary.miles,
    rating: itinerary.rating,
    hardest_day: findHardestDay(itinerary.route_data),
  } : null;

  // Prompt engineering pattern (see CLAUDE_ARCHITECT_ALIGNMENT.md - Domain 4):
  //
  // The prompt is structured in 4 sections:
  //   1. MEMBER ASSESSMENT — contextual data about the user's current fitness
  //   2. TREK DETAILS — adventure type, departure date, itinerary difficulty, hardest day
  //   3. GEAR STATUS — item counts (packed/owned/needed) for situational awareness
  //   4. JSON SCHEMA — explicit response structure with field descriptions
  //
  // Key prompt engineering techniques used:
  //   - Explicit JSON schema with example field values
  //   - Behavioral rules (adaptive phase sizing, outcome-based benchmarks)
  //   - Domain-specific heuristics (boot break-in timeline, pack weight progression)
  //   - Urgency adaptation based on weeks remaining
  //
  // The prompt injects ${weeksRemaining}, ${assessment.*}, ${gearStatus.*}, and
  // ${itin.*} as contextual variables for personalization.
  //
  // [Full prompt content redacted — proprietary domain logic]
  return `[Prompt redacted — generates personalized readiness plan using assessment data, trek details, and gear status. See CLAUDE_ARCHITECT_ALIGNMENT.md for the prompt engineering patterns used.]`;
}

function findHardestDay(routeData) {
  if (!routeData || !Array.isArray(routeData) || routeData.length === 0) return null;
  let hardest = routeData[0];
  for (const day of routeData) {
    const score = (day.miles || 0) * 100 + (day.gain || 0);
    const hardestScore = (hardest.miles || 0) * 100 + (hardest.gain || 0);
    if (score > hardestScore) hardest = day;
  }
  return hardest;
}

/**
 * Fallback plan when no API key is configured.
 * Still useful — generates a reasonable plan based on the inputs.
 */
function generateFallbackPlan({ adventureType, itinerary, departureDate, assessment, gearStatus }) {
  const now = new Date();
  const depart = new Date(departureDate);
  const weeksRemaining = Math.max(0, Math.round((depart - now) / (7 * 24 * 60 * 60 * 1000)));

  const itin = itinerary || {};
  const miles = itin.miles || 60;
  const days = itin.days || 10;
  const hardest = findHardestDay(itin.route_data);

  // Determine fitness gap
  const currentMiles = assessment?.current_distance_miles || 3;
  const hasPackExp = assessment?.pack_experience !== "none";
  const hasElevation = assessment?.elevation_access !== "flat_only";
  const isActive = assessment?.activity_level === "regularly_active" || assessment?.activity_level === "very_active";

  // Adaptive phase sizing
  let phaseWeeks;
  if (weeksRemaining >= 16) phaseWeeks = [4, 4, 4, 4];
  else if (weeksRemaining >= 12) phaseWeeks = [3, 3, 3, 3];
  else if (weeksRemaining >= 8) phaseWeeks = [2, 2, 2, 2];
  else if (weeksRemaining >= 4) phaseWeeks = [1, 1, 1, 1];
  else phaseWeeks = [1, 1, 1, 1]; // Damage control

  const targetDaily = Math.round(miles / days);
  const hardestMiles = hardest?.miles || targetDaily + 3;
  const hardestGain = hardest?.gain || 2000;

  const plan = {
    summary: weeksRemaining < 4
      ? `With ${weeksRemaining} weeks remaining, focus on loaded miles every available day. Be honest about your limits on the trail.`
      : weeksRemaining < 8
        ? `${weeksRemaining} weeks is tight but doable. Every session should be purposeful — no junk miles.`
        : `${weeksRemaining} weeks gives you a solid runway. Build steadily and you'll be ready.`,
    total_phases: 4,
    phases: [
      {
        number: 1, name: "Foundation",
        weeks: `1-${phaseWeeks[0]}`,
        focus: "Build base endurance and establish a training rhythm",
        benchmarks: [
          `Can comfortably hike ${Math.min(currentMiles + 2, 6)} miles on varied terrain`,
          hasElevation ? "Include hills in every session" : "Use stairs or incline treadmill to simulate elevation",
          "Hike at least 2-3 times per week",
        ],
        pack_weight: "No pack",
      },
      {
        number: 2, name: "Load Building",
        weeks: `${phaseWeeks[0] + 1}-${phaseWeeks[0] + phaseWeeks[1]}`,
        focus: "Introduce pack weight and build distance",
        benchmarks: [
          `Can do ${Math.min(currentMiles + 4, 8)} miles with 15-20 lb pack`,
          "Comfortable with sustained uphill under load",
          hasPackExp ? "Verify pack fit is still correct under load" : "Get properly fitted for a backpack",
        ],
        pack_weight: "Light (15-20 lbs)",
      },
      {
        number: 3, name: "Trek Simulation",
        weeks: `${phaseWeeks[0] + phaseWeeks[1] + 1}-${phaseWeeks[0] + phaseWeeks[1] + phaseWeeks[2]}`,
        focus: "Match trek demands with loaded miles",
        benchmarks: [
          `Can do ${Math.min(hardestMiles, 10)} miles with 25-30 lb pack`,
          `Handle ${Math.min(hardestGain, 2000)}+ ft elevation gain in a session`,
          "Complete at least one back-to-back day hike (consecutive days)",
        ],
        pack_weight: "Medium (25-30 lbs)",
      },
      {
        number: 4, name: "Shakedown",
        weeks: `${phaseWeeks[0] + phaseWeeks[1] + phaseWeeks[2] + 1}-${weeksRemaining}`,
        focus: "Full weight, full distance, identify weaknesses",
        benchmarks: [
          `Can do ${hardestMiles} miles with 35+ lb pack (your hardest day simulation)`,
          "Complete a full overnight shakedown with all gear",
          "All gear tested and dialed — no first-time-on-trail surprises",
        ],
        pack_weight: "Full (35+ lbs)",
      },
    ],
  };

  // Generate priorities
  const priorities = [];

  // Boot priority
  const bootsNeeded = gearStatus.packed < gearStatus.total * 0.3;
  if (bootsNeeded && weeksRemaining < 14) {
    priorities.push({
      urgency: weeksRemaining < 8 ? "red" : "yellow",
      title: "Boot break-in critical",
      detail: `Boot break-in takes 3-4 months. With ${weeksRemaining} weeks left, ${weeksRemaining < 8 ? "this is urgent — blisters on Day 1 are preventable" : "get fitted and start breaking them in now"}.`,
      category: "gear",
    });
  }

  // Fitness gap
  if (currentMiles < targetDaily) {
    priorities.push({
      urgency: weeksRemaining < 6 && currentMiles < targetDaily / 2 ? "red" : "yellow",
      title: `Distance gap: ${currentMiles}mi → ${targetDaily}mi daily average`,
      detail: hardest
        ? `Your hardest day is Day ${hardest.day} (${hardest.miles}mi, ${hardest.gain}ft gain). Build toward that.`
        : `Your trek averages ${targetDaily} miles/day. Build your base distance steadily.`,
      category: "training",
    });
  }

  // Pack experience
  if (!hasPackExp) {
    priorities.push({
      urgency: weeksRemaining < 8 ? "red" : "yellow",
      title: "No loaded pack experience",
      detail: "Start with 15 lbs and build up. Pack weight changes everything about how you hike.",
      category: "training",
    });
  }

  // Gear status
  if (gearStatus.needed > gearStatus.total * 0.5) {
    priorities.push({
      urgency: weeksRemaining < 8 ? "yellow" : "green",
      title: `${gearStatus.needed} gear items still needed`,
      detail: "Check your gear list and prioritize big-ticket items (boots, pack, sleeping bag) first.",
      category: "gear",
    });
  }

  // On track message
  if (priorities.length === 0) {
    priorities.push({
      urgency: "green",
      title: "Looking good",
      detail: `You're in solid shape for a ${weeksRemaining}-week ramp. Keep building steadily.`,
      category: "training",
    });
  }

  return { plan, priorities, tokens_used: 0 };
}
