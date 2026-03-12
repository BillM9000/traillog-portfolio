# COPPA Compliance Checklist — TrailLog

**Conclusion: COPPA does NOT apply to TrailLog.**

TrailLog's youngest possible users are 13 years old. COPPA only applies to children **under 13**. This document provides the proof.

---

## What Is COPPA?

The **Children's Online Privacy Protection Act** (1998) is a U.S. federal law enforced by the FTC. It regulates the online collection of personal information from children **under 13 years of age**.

> **16 CFR Part 312 § 312.2** — "Child" means an individual under the age of 13.

The rule requires operators to obtain **verifiable parental consent** before collecting, using, or disclosing personal information from children under 13.

**Source:** [FTC COPPA Rule](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa) | [16 CFR Part 312 (eCFR)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312)

---

## What Counts as "Personal Information" Under COPPA?

COPPA defines personal information broadly, including:
- First and last name
- Home or physical address
- Email address
- Telephone number
- Social Security number
- A persistent identifier (cookies, IP address) used to track a child across sites
- Photo, video, or audio file containing a child's image or voice
- Geolocation information sufficient to identify street/city
- Biometric identifiers (added in 2025 amendments: fingerprints, facial templates, voiceprints, etc.)
- Government-issued identifiers (SSN, passport, birth certificate numbers — added 2025)

**Source:** [FTC COPPA Six-Step Compliance Plan](https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-six-step-compliance-plan-your-business) | [FTC 2025 COPPA Amendments](https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data)

---

## Who Must Comply?

COPPA applies to:

1. **Operators of websites/apps directed to children under 13**
2. **Operators of general-audience websites/apps that have actual knowledge** they are collecting personal information from a child under 13

A "general audience" site that does not target children and does not knowingly collect data from under-13 users is **not subject to COPPA** unless it gains actual knowledge that a specific visitor is under 13.

**Source:** [Digital.gov COPPA Overview](https://digital.gov/resources/childrens-online-privacy-protection-rule-coppa/) | [FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)

---

## Why TrailLog Is Exempt

TrailLog is a planning tool for **BSA High Adventure** trips. All four BSA High Adventure bases have minimum age requirements of **13 or older**:

### Philmont Scout Ranch
- **Minimum age: 14** (or 13 if the scout has completed 8th grade)
- Participants must be registered members of Scouting America
- **Source:** [Philmont Crew Requirements](https://www.philmontscoutranch.org/treks/trekrequirements/crewrequirements/) | [2026 Advisor's Guidebook (PDF)](https://www.philmontscoutranch.org/wp-content/uploads/2025/11/2026-Advisors-Guidebook-11.12.25.pdf)

### Northern Tier (Charles L. Sommers Wilderness Base)
- **Minimum age: 14** (or 13 if the scout has completed 8th grade)
- Same policy as Philmont for all Northern Tier programs
- **Source:** [Northern Tier](https://www.ntier.org/) | [High Adventure FAQ](https://www.nationalhighadventureawards.org/faq)

### Summit Bechtel Reserve (The Summit)
- **Minimum age: 14** (or 13 if the scout has completed 8th grade)
- Same policy as Philmont for Christen High Adventure Base programs
- **Source:** [Summit Bechtel Reserve](https://www.summitbsa.org/) | [BSA High Adventure](https://www.scouting.org/outdoor-programs/high-adventure-bases/)

### Florida Sea Base
- **Minimum age: 13** for Scuba, Out Island, Bahamas, and St. Thomas programs
- **Minimum age: 12** for Keys Adventure, Marine Eco Expedition, and Fishing Adventure only
- Proof of age required at check-in (school ID + birth certificate, passport, or government ID)
- Participants who would turn 13 during their adventure are **not** eligible for age-13 programs
- **Source:** [Sea Base Eligibility](https://seabaseha.org/scouts/register/eligibility/) | [Sea Base FAQ](https://seabaseha.org/scouts/resources/faq/)

### Summary Table

| High Adventure Base | Minimum Age | COPPA Applies? |
|---------------------|------------|----------------|
| Philmont Scout Ranch | 14 (or 13 + completed 8th grade) | **No** — age 13+ |
| Northern Tier | 14 (or 13 + completed 8th grade) | **No** — age 13+ |
| Summit Bechtel Reserve | 14 (or 13 + completed 8th grade) | **No** — age 13+ |
| Sea Base (most programs) | 13 | **No** — age 13+ |
| Sea Base (Keys/Fishing only) | 12 | **See note below** |

### Note on Sea Base Age-12 Programs

Sea Base allows **12-year-olds** for three specific programs (Keys Adventure, Marine Eco Expedition, Fishing Adventure). These participants are **under 13** and would fall under COPPA.

**TrailLog's position:**
- TrailLog currently only supports **Philmont Scout Ranch** (min age 14/13+8th)
- The other three bases (Northern Tier, Sea Base, Summit) are listed as "Coming Soon" and disabled
- **If/when Sea Base is enabled**, consider whether to:
  - (a) Require age verification at registration (age gate)
  - (b) Exclude Sea Base age-12 programs
  - (c) Implement COPPA-compliant parental consent for those specific programs
- This is **not a current concern** — only relevant if Sea Base support is added in the future

---

## TrailLog Age Gate Enforcement

Although COPPA does not strictly require an age gate for TrailLog (since BSA already enforces age minimums at the base level), TrailLog implements its own **application-level age verification** as a proactive compliance measure. This prevents under-13 users from creating accounts even if they lie about their BSA eligibility.

### How It Works

**Step 1 — Age Confirmation (immediately after account creation, before any other action):**

Every new user (Google OAuth or email/password) must confirm their age before proceeding:

| Option | Meaning |
|--------|---------|
| "I am 13 or older" | User is a youth/scout (age 13–17) |
| "I am 18 or older" | User is an adult (age 18+) |

- No under-13 option exists — users who cannot truthfully select either option **cannot proceed**
- This screen appears once, immediately after first login, before role selection
- The selection is stored in the `users` table (`age_confirmed` field)

**Step 2 — Role Selection Validation:**

| Age Confirmed | Role Selected | Result |
|---------------|--------------|--------|
| 18+ | Adult | ✅ Allowed |
| 18+ | Scout | ✅ Allowed (edge case, but permitted) |
| 13+ | Scout | ✅ Allowed |
| 13+ | Adult | ❌ **Blocked** — "You must be 18 or older to register as an adult leader. Please select Scout/Youth." |

**Why this matters:**
- In BSA, scouts **age out at 18** — at 18 you are an adult, period. There is no gray area.
- If someone selects "13 or older" but tries to pick the Adult role, they are either lying about their age or picked the wrong age confirmation. Either way, the app catches it.
- This creates an auditable record that every user self-certified their age category.

**Step 3 — Server-Side Enforcement:**

- The server validates age confirmation before allowing role selection
- The `age_confirmed` value (`13+` or `18+`) is stored permanently and cannot be changed by the user
- API endpoints reject role assignments that conflict with age confirmation
- If a user somehow bypasses the client-side check, the server blocks them

### What This Does NOT Do

- **Does not collect date of birth** — we only collect age category (13+ or 18+), not exact age. This minimizes data collection.
- **Does not verify identity** — we rely on self-certification, same as BSA's own online registration. We are not a government agency.
- **Does not replace BSA's checks** — BSA verifies age with physical ID at check-in at the high adventure base. TrailLog is a planning tool, not the final authority.

### Implementation Details

- **Database:** `users.age_confirmed` column — values: `null` (not yet confirmed), `"13+"`, `"18+"`
- **Client:** Age confirmation modal appears in ProfileSetup flow, before role selection
- **Server:** `requireAgeConfirmed` middleware on role-selection and troop-join endpoints
- **Audit trail:** `users.age_confirmed_at` timestamp recorded when confirmation is made

---

## COPPA Compliance Checklist

| # | Requirement | TrailLog Status | Notes |
|---|-------------|----------------|-------|
| 1 | App directed at children under 13? | **No** | Directed at BSA high adventure crews (13+) |
| 2 | Actual knowledge of under-13 users? | **No** | Age gate blocks under-13 at registration |
| 3 | Collecting personal info from under-13? | **No** | Name, email collected — but only after age confirmation (13+) |
| 4 | Privacy policy posted? | ⬜ Pending | Good practice regardless of COPPA. See GO_LIVE_CHECKLIST.md |
| 5 | Parental consent mechanism? | **N/A** | Not required — age gate prevents under-13 accounts |
| 6 | Age gate / age verification? | ✅ Implemented | Two-tier: "13 or older" / "18 or older" with role validation |
| 7 | Data deletion mechanism? | ⬜ Pending | Not COPPA-required but good practice |
| 8 | Third-party data sharing? | **None** | TrailLog does not share data with third parties |

---

## Penalties (For Reference)

- Civil penalties up to **$53,088 per violation** (FTC enforcement)
- The FTC has brought cases against major companies including YouTube ($170M), Epic Games/Fortnite ($275M), and others
- **Source:** [FTC Children's Privacy Enforcement](https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy)

---

## 2025 COPPA Rule Updates (For Reference)

The FTC published major amendments effective **June 23, 2025** (compliance deadline: April 22, 2026):
- Expanded definition of personal information (biometrics, government IDs)
- New limits on targeted advertising to children
- Strengthened data security requirements
- New requirements for ed-tech companies

These updates do **not change the age threshold** — COPPA still applies to under-13 only.

**Source:** [FTC 2025 COPPA Final Rule](https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data) | [White & Case COPPA Analysis](https://www.whitecase.com/insight-alert/unpacking-ftcs-coppa-amendments-what-you-need-know)

---

*Last updated: 2026-03-13*
*This document is for internal reference and is not legal advice. Consult a lawyer for formal compliance opinions.*
