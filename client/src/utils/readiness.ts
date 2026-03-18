/**
 * Shared readiness calculation — single source of truth.
 *
 * Every component (Header, Skills, MemberBar, GearList) should use these
 * helpers so percentages stay in sync everywhere.
 *
 * Readiness is the AVERAGE of 4 category percentages:
 *   training, gear, medical, admin
 * Each category = (items done across all trekking members) / (total items × trekking members)
 */

import type { AdventureMember } from "../types/adventure";
import type { Skill } from "../types/skills";
import type { GearCatalogItem, MemberGearItem } from "../types/gear";
import type { ReadinessScore } from "../types/skills";

type MemberGearMap = Record<number, MemberGearItem[]>;

/**
 * Compute per-category and overall readiness for the whole crew.
 *
 * @param members       – adventure members (with skills, medical, admin_tasks arrays)
 * @param skills        – adventure skill definitions [{id, category, ...}]
 * @param gearCatalog   – full gear catalog items
 * @param memberGearMap – { userId: [{gear_catalog_id, status, ...}] }
 * @returns {{ training: number, gear: number, medical: number, admin: number, overall: number }}
 */
export function computeCrewReadiness(members: AdventureMember[], skills: Skill[], gearCatalog: GearCatalogItem[], memberGearMap: MemberGearMap): ReadinessScore {
  const trekking = members.filter(m => m.participation === "trekking");
  if (trekking.length === 0) return { training: 0, gear: 0, medical: 0, admin: 0, overall: 0 };

  const trainingSkills = skills.filter(s => s.category === "training");
  const medicalSkills  = skills.filter(s => s.category === "medical");
  const adminSkills    = skills.filter(s => s.category === "admin");

  const pct = (items: Skill[], field: "skills" | "medical" | "admin_tasks"): number | null => {
    if (items.length === 0) return null; // no items defined = category not applicable
    const total = items.length * trekking.length;
    const done  = trekking.reduce((sum, m) =>
      sum + (m[field] || []).filter(id => items.some(s => s.id === id)).length, 0);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const training = pct(trainingSkills, "skills");
  const medical  = pct(medicalSkills,  "medical");
  const admin    = pct(adminSkills,    "admin_tasks");

  // Gear uses the memberGearMap (new gear system), not m.gear
  const gearTotal = gearCatalog.length * trekking.length;
  const gearDone  = trekking.reduce((sum, m) => {
    const items = memberGearMap[m.user_id!] || [];
    return sum + items.filter(g => g.status === "owned" || g.status === "packed").length;
  }, 0);
  const gear = gearTotal > 0 ? Math.round((gearDone / gearTotal) * 100) : 0;

  // Only average categories that have items defined — don't penalize for unconfigured categories
  const activeCats = [training, gear, medical, admin].filter(v => v !== null) as number[];
  const overall = activeCats.length > 0 ? Math.round(activeCats.reduce((s, v) => s + v, 0) / activeCats.length) : 0;

  return { training: training ?? 0, gear, medical: medical ?? 0, admin: admin ?? 0, overall };
}

/**
 * Compute readiness for a single member (same 4-category average).
 *
 * @param member        – single member object
 * @param skills        – adventure skill definitions
 * @param gearCatalog   – full gear catalog items
 * @param memberGearMap – { userId: [{gear_catalog_id, status, ...}] }
 * @returns 0-100
 */
export function computeMemberReadiness(member: AdventureMember, skills: Skill[], gearCatalog: GearCatalogItem[], memberGearMap: MemberGearMap): number {
  const trainingSkills = skills.filter(s => s.category === "training");
  const medicalSkills  = skills.filter(s => s.category === "medical");
  const adminSkills    = skills.filter(s => s.category === "admin");

  const pct = (items: Skill[], field: "skills" | "medical" | "admin_tasks"): number | null => {
    if (items.length === 0) return null; // no items defined = category not applicable
    const done = (member[field] || []).filter(id => items.some(s => s.id === id)).length;
    return Math.round((done / items.length) * 100);
  };

  const training = pct(trainingSkills, "skills");
  const medical  = pct(medicalSkills,  "medical");
  const admin    = pct(adminSkills,    "admin_tasks");

  const gearItems = memberGearMap[member.user_id!] || [];
  const gearDone  = gearItems.filter(g => g.status === "owned" || g.status === "packed").length;
  const gear = gearCatalog.length > 0
    ? Math.round((gearDone / gearCatalog.length) * 100)
    : 0;

  // Only average categories that have items defined
  const activeCats = [training, gear, medical, admin].filter(v => v !== null) as number[];
  return activeCats.length > 0 ? Math.round(activeCats.reduce((s, v) => s + v, 0) / activeCats.length) : 0;
}
