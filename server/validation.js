import { z } from "zod";

// ─── Reusable primitives ─────────────────────────────────────────────
const email = z.string().trim().email("Invalid email address").max(255);
const password = z.string().min(8, "Password must be at least 8 characters").max(255);
const name = z.string().trim().min(1, "Name is required").max(100);
const id = z.coerce.number().int().positive();
const optionalString = z.string().trim().max(500).optional().or(z.literal(""));
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Invalid date format (YYYY-MM-DD)");

// ─── Auth schemas ────────────────────────────────────────────────────
export const signupSchema = z.object({
  name,
  email,
  password,
  tos_accepted: z.literal(true, { errorMap: () => ({ message: "You must accept the Terms of Service" }) }),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: password,
});

export const profileUpdateSchema = z.object({
  name: name.optional(),
  user_type: z.enum(["adult", "scout"]).optional(),
  parent_email: email.optional().or(z.literal("")),
  parent_email_2: email.optional().or(z.literal("")),
  age_confirmed: z.enum(["13+", "18+"]).optional(),
});

// ─── Troop schemas ───────────────────────────────────────────────────
export const createTroopSchema = z.object({
  name,
  description: optionalString,
  council: z.string().trim().max(60).optional(),
  council_id: id.optional(),
  location: z.string().trim().max(100).optional(),
  is_public: z.boolean().optional(),
}).refine(d => d.council || d.council_id, { message: "Council is required" });

export const updateTroopSchema = z.object({
  name: name.optional(),
  description: optionalString,
  council: z.string().trim().max(60).optional(),
  council_id: id.optional(),
  location: z.string().trim().max(100).optional(),
  is_public: z.boolean().optional(),
});

// ─── Adventure schemas ───────────────────────────────────────────────
export const createAdventureSchema = z.object({
  name,
  description: optionalString,
  trek_date: dateString.optional(),
  depart_date: dateString.optional(),
  arrive_date: dateString.optional(),
  return_date: dateString.optional(),
  home_date: dateString.optional(),
  itinerary_id: z.string().trim().max(20).optional(),
  adventure_type: z.enum(["philmont", "northern_tier", "sea_base", "summit"]).default("philmont"),
});

// ─── Training event schemas ──────────────────────────────────────────
export const createTrainingEventSchema = z.object({
  date: dateString,
  period: z.enum(["am", "pm", "all"]).default("all"),
  time_label: z.string().trim().max(50).optional(),
  location: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
  type: z.enum(["proposed", "scheduled"]).default("scheduled"),
});

export const updateTrainingEventSchema = z.object({
  date: dateString,
  period: z.enum(["am", "pm", "all"]).default("all"),
  time_label: z.string().trim().max(50).optional(),
  location: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const rsvpSchema = z.object({
  status: z.enum(["going", "cant"]),
});

// ─── Admin schemas ───────────────────────────────────────────────────
export const adminSettingSchema = z.object({
  key: z.string().trim().min(1).max(100).refine(k => k !== "schema_version", "Cannot modify schema_version"),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

// ─── Vote schemas ────────────────────────────────────────────────────
export const voteSchema = z.object({
  voter_name: z.string().trim().min(2).max(30),
  design_id: id,
  vote_slot: z.union([z.literal(1), z.literal(2)]),
});

export const deleteVoteSchema = z.object({
  voter_name: z.string().trim().min(1),
  vote_slot: z.union([z.literal(1), z.literal(2)]),
});

// ─── Readiness schemas ───────────────────────────────────────────────
export const readinessAssessSchema = z.object({
  current_distance_miles: z.number().min(0).max(50),
  pack_experience: z.enum(["none", "day_pack", "loaded"]),
  elevation_access: z.enum(["flat_only", "some_hills", "real_elevation"]),
  activity_level: z.enum(["sedentary", "lightly_active", "regularly_active", "very_active"]),
});

// ─── Middleware factory ──────────────────────────────────────────────
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstError = result.error.errors[0];
      return res.status(400).json({ error: firstError.message });
    }
    req.body = result.data;
    next();
  };
}
