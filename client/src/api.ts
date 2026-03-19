import type {
  MeResponse, Adventure, Crew, AdventureMember, Skill, TrainingEvent,
  GearCatalogItem, MemberGearItem, PackWeightResult, ProductOption,
  GearOverride, TroopCustomGear, Invitation, LinkRequest, Achievement,
  Council, AdventureDocument, AnnouncementSettings, Membership,
  Badge, Milestone, TrainingAttendance, Itinerary,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiData = Record<string, any>;

const BASE = "/api";

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as Record<string, string>) };
  if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers,
    ...options,
  });
  if (res.status === 401 && !path.includes("/auth/")) {
    window.location.href = "/?error=session";
    throw new Error("Not authenticated");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

interface Troop {
  id: number;
  name: string;
  council: string | null;
  council_id: number | null;
  location: string | null;
  is_public: number;
  logo: string | null;
  created_at: string;
}

interface TroopSettings {
  require_approval: number;
  allow_self_remove: number;
}

interface DashboardData {
  troops: unknown[];
  pending_requests: number;
  public_troops: unknown[];
}

interface AIUsage {
  used: number;
  limit: number;
  remaining: number;
}

interface AffiliateStats {
  total_clicks: number;
  clicks: unknown[];
}

interface GearRefreshStatus {
  status: string;
  progress?: number;
  total?: number;
}

export const api = {
  // Auth
  getMe: () => request<MeResponse>("/auth/me"),
  login: (email: string, password: string) => request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  signup: (name: string, email: string, password: string, tos_accepted: boolean) => request("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password, tos_accepted }) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  updateProfile: (data: ApiData) => request("/auth/profile", { method: "PUT", body: JSON.stringify(data) }),
  forgotPassword: (email: string) => request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) => request("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),
  changePassword: (currentPassword: string, newPassword: string) => request("/auth/change-password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) }),

  // Troops
  getTroops: () => request<Troop[]>("/troops"),
  getTroop: (id: number) => request<Troop>(`/troops/${id}`),
  createTroop: (data: ApiData) => request<Troop>("/troops", { method: "POST", body: JSON.stringify(data) }),
  checkDuplicateTroop: (unitType: string, unitNumber: string, councilId: number) =>
    request(`/troops/check-duplicate?unit_type=${encodeURIComponent(unitType)}&unit_number=${encodeURIComponent(unitNumber)}&council_id=${councilId}`),
  updateTroop: (id: number, data: ApiData) => request(`/troops/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  joinTroop: (id: number, data?: ApiData) => request(`/troops/${id}/join`, { method: "POST", body: JSON.stringify(data || {}) }),
  getTroopJoinInfo: (id: number) => request(`/troops/${id}/join-info`),
  uploadTroopLogo: (id: number, image: string) => request(`/troops/${id}/logo`, { method: "PUT", body: JSON.stringify({ image }) }),
  deleteTroopLogo: (id: number) => request(`/troops/${id}/logo`, { method: "PUT", body: JSON.stringify({}) }),
  updateTroopSettings: (id: number, data: Partial<TroopSettings>) => request(`/troops/${id}/settings`, { method: "PUT", body: JSON.stringify(data) }),

  // Troop Members
  getMembers: (troopId: number) => request<Membership[]>(`/troops/${troopId}/members`),
  approveMember: (troopId: number, userId: number) => request(`/troops/${troopId}/members/${userId}/approve`, { method: "PUT" }),
  denyMember: (troopId: number, userId: number) => request(`/troops/${troopId}/members/${userId}/deny`, { method: "PUT" }),
  removeMember: (troopId: number, userId: number) => request(`/troops/${troopId}/members/${userId}`, { method: "DELETE" }),
  leaveTroop: (troopId: number) => request(`/troops/${troopId}/leave`, { method: "POST" }),
  updateDates: (troopId: number, userId: number, dates: string[]) => request(`/troops/${troopId}/members/${userId}/dates`, { method: "PUT", body: JSON.stringify({ dates }) }),
  updateSkills: (troopId: number, userId: number, skills: number[]) => request(`/troops/${troopId}/members/${userId}/skills`, { method: "PUT", body: JSON.stringify({ skills }) }),

  // Skills (legacy troop-scoped)
  getSkills: (troopId: number) => request<Skill[]>(`/troops/${troopId}/skills`),
  addSkill: (troopId: number, name: string, desc: string) => request(`/troops/${troopId}/skills`, { method: "POST", body: JSON.stringify({ name, desc }) }),
  removeSkill: (troopId: number, skillId: number) => request(`/troops/${troopId}/skills/${skillId}`, { method: "DELETE" }),

  // Adventures
  getAdventures: (troopId: number) => request<Adventure[]>(`/troops/${troopId}/adventures`),
  getAdventure: (id: number) => request<Adventure>(`/adventures/${id}`),
  createAdventure: (troopId: number, data: ApiData) => request<Adventure>(`/troops/${troopId}/adventures`, { method: "POST", body: JSON.stringify(data) }),
  updateAdventure: (id: number, data: ApiData) => request(`/adventures/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteAdventure: (id: number) => request(`/adventures/${id}`, { method: "DELETE" }),

  // Adventure Members
  getAdventureMembers: (advId: number) => request<AdventureMember[]>(`/adventures/${advId}/members`),
  addAdventureMember: (advId: number, user_id: number, role: string) => request(`/adventures/${advId}/members`, { method: "POST", body: JSON.stringify({ user_id, role }) }),
  removeAdventureMember: (advId: number, userId: number) => request(`/adventures/${advId}/members/${userId}`, { method: "DELETE" }),
  updateAdventureDates: (advId: number, userId: number, dates: string[]) => request(`/adventures/${advId}/members/${userId}/dates`, { method: "PUT", body: JSON.stringify({ dates }) }),
  updateAdventureSkills: (advId: number, userId: number, skills: number[]) => request(`/adventures/${advId}/members/${userId}/skills`, { method: "PUT", body: JSON.stringify({ skills }) }),
  updateAdventureGear: (advId: number, userId: number, gear: unknown[]) => request(`/adventures/${advId}/members/${userId}/gear`, { method: "PUT", body: JSON.stringify({ gear }) }),
  updateAdventureMedical: (advId: number, userId: number, medical: number[]) => request(`/adventures/${advId}/members/${userId}/medical`, { method: "PUT", body: JSON.stringify({ medical }) }),
  updateAdventureAdmin: (advId: number, userId: number, admin_tasks: number[]) => request(`/adventures/${advId}/members/${userId}/admin`, { method: "PUT", body: JSON.stringify({ admin_tasks }) }),

  // Adventure Skills
  getAdventureSkills: (advId: number, category?: string) => request<Skill[]>(`/adventures/${advId}/skills${category ? `?category=${category}` : ""}`),
  addAdventureSkill: (advId: number, name: string, desc: string, category: string, icon: string) => request(`/adventures/${advId}/skills`, { method: "POST", body: JSON.stringify({ name, desc, category, icon }) }),
  removeAdventureSkill: (advId: number, skillId: number) => request(`/adventures/${advId}/skills/${skillId}`, { method: "DELETE" }),

  // Adventure Member Management
  updateMemberRole: (advId: number, userId: number, role: string) => request(`/adventures/${advId}/members/${userId}/role`, { method: "PUT", body: JSON.stringify({ role }) }),
  updateMemberUserType: (advId: number, userId: number, user_type: string) => request(`/adventures/${advId}/members/${userId}/user-type`, { method: "PUT", body: JSON.stringify({ user_type }) }),
  updateParticipation: (advId: number, userId: number, participation: string) => request(`/adventures/${advId}/members/${userId}/participation`, { method: "PUT", body: JSON.stringify({ participation }) }),
  linkMember: (advId: number, userId: number, linked_scouts: number[]) => request(`/adventures/${advId}/members/${userId}/link`, { method: "PUT", body: JSON.stringify({ linked_scouts }) }),
  addManualMember: (advId: number, name: string) => request(`/adventures/${advId}/manual-members`, { method: "POST", body: JSON.stringify({ name }) }),
  removeManualMember: (advId: number, memberId: number) => request(`/adventures/${advId}/manual-members/${memberId}`, { method: "DELETE" }),

  // Invitations
  sendInvitation: (advId: number, email: string) => request(`/adventures/${advId}/invitations`, { method: "POST", body: JSON.stringify({ email }) }),
  getInvitations: (advId: number) => request<Invitation[]>(`/adventures/${advId}/invitations`),

  // Link Requests
  getLinkRequests: (advId: number) => request<LinkRequest[]>(`/adventures/${advId}/link-requests`),
  createLinkRequest: (advId: number, scout_id: number) => request(`/adventures/${advId}/link-requests`, { method: "POST", body: JSON.stringify({ scout_id }) }),
  approveLinkRequest: (advId: number, requestId: number) => request(`/adventures/${advId}/link-requests/${requestId}/approve`, { method: "PUT" }),
  denyLinkRequest: (advId: number, requestId: number) => request(`/adventures/${advId}/link-requests/${requestId}/deny`, { method: "PUT" }),

  // Achievements
  getAchievements: (advId: number) => request<Achievement>(`/adventures/${advId}/achievements`),
  checkMilestones: (advId: number) => request(`/adventures/${advId}/check-milestones`, { method: "POST" }),

  // Training Events
  getTrainingEvents: (advId: number) => request<TrainingEvent[]>(`/adventures/${advId}/training-events`),
  createTrainingEvent: (advId: number, data: ApiData) => request<TrainingEvent>(`/adventures/${advId}/training-events`, { method: "POST", body: JSON.stringify(data) }),
  updateTrainingEvent: (advId: number, eventId: number, data: ApiData) => request(`/adventures/${advId}/training-events/${eventId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTrainingEvent: (advId: number, eventId: number) => request(`/adventures/${advId}/training-events/${eventId}`, { method: "DELETE" }),
  rsvpTrainingEvent: (advId: number, eventId: number, status: string) => request(`/adventures/${advId}/training-events/${eventId}/rsvp`, { method: "PUT", body: JSON.stringify({ status }) }),
  updateTrainingEventStatus: (advId: number, eventId: number, type: string, status: string) => request(`/adventures/${advId}/training-events/${eventId}/status`, { method: "PUT", body: JSON.stringify({ type, status }) }),
  markAttendance: (advId: number, eventId: number, attendees: number[]) => request(`/adventures/${advId}/training-events/${eventId}/attendance`, { method: "POST", body: JSON.stringify({ attendees }) }),
  selfReportAttendance: (advId: number, eventId: number, attended: boolean) => request(`/adventures/${advId}/training-events/${eventId}/attendance/self`, { method: "PUT", body: JSON.stringify({ attended }) }),
  getAttendance: (advId: number, eventId: number) => request<TrainingAttendance[]>(`/adventures/${advId}/training-events/${eventId}/attendance`),
  getAttendanceCount: (advId: number, userId: number) => request<{ count: number }>(`/adventures/${advId}/members/${userId}/attendance-count`),

  // Milestone config
  getMilestonesConfig: (advId: number) => request(`/adventures/${advId}/milestones-config`),
  updateMilestonesConfig: (advId: number, milestones: unknown) => request(`/adventures/${advId}/milestones-config`, { method: "PUT", body: JSON.stringify({ milestones }) }),

  // Calendar export
  getCalendarExportUrl: (advId: number): string => `${BASE}/adventures/${advId}/training-events/export.ics`,

  // Itineraries
  getItineraries: () => request<Itinerary[]>("/itineraries"),
  getItinerary: (id: string) => request<Itinerary>(`/itineraries/${id}`),

  // Gear (legacy)
  getGear: (troopId?: number) => fetch(`${BASE}/gear${troopId ? `?troop=${troopId}` : ""}`, { credentials: "include" }).then(r => r.json()),

  // Gear Catalog (v5)
  getGearCatalog: (troopId?: number) => request<GearCatalogItem[]>(`/gear-catalog${troopId ? `?troop=${troopId}` : ""}`),
  getGearCategories: () => request<string[]>("/gear-catalog/categories"),
  getGearCatalogItem: (id: number) => request<GearCatalogItem>(`/gear-catalog/${id}`),

  // Member Gear (adventure-scoped)
  getAdventureGearAll: (advId: number) => request<MemberGearItem[]>(`/adventures/${advId}/gear`),
  getMemberGearItems: (advId: number, userId: number) => request<MemberGearItem[]>(`/adventures/${advId}/members/${userId}/gear`),
  updateMemberGearItem: (advId: number, userId: number, gearId: number, data: ApiData) =>
    request(`/adventures/${advId}/members/${userId}/gear-item/${gearId}`, { method: "PUT", body: JSON.stringify(data) }),
  bulkSetMemberGear: (advId: number, userId: number, selections: unknown[]) =>
    request(`/adventures/${advId}/members/${userId}/gear-bulk`, { method: "POST", body: JSON.stringify({ selections }) }),
  removeMemberGearItem: (advId: number, userId: number, gearId: number) =>
    request(`/adventures/${advId}/members/${userId}/gear-item/${gearId}`, { method: "DELETE" }),
  getMemberPackWeight: (advId: number, userId: number) => request<PackWeightResult>(`/adventures/${advId}/members/${userId}/pack-weight`),

  // Gear Admin (global admin)
  createGearCatalogItem: (data: ApiData) => request("/gear-catalog", { method: "POST", body: JSON.stringify(data) }),
  updateGearCatalogItem: (id: number, data: ApiData) => request(`/gear-catalog/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteGearCatalogItem: (id: number) => request(`/gear-catalog/${id}`, { method: "DELETE" }),
  reorderGearCatalog: (orderedIds: number[]) => request("/gear-catalog-reorder", { method: "PUT", body: JSON.stringify({ orderedIds }) }),
  addProductOption: (gearId: number, data: ApiData) => request<ProductOption>(`/gear-catalog/${gearId}/options`, { method: "POST", body: JSON.stringify(data) }),
  updateProductOption: (optId: number, data: ApiData) => request(`/gear-catalog/options/${optId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProductOption: (optId: number) => request(`/gear-catalog/options/${optId}`, { method: "DELETE" }),

  // Troop Gear Overrides
  setTroopGearOverride: (troopId: number, gearId: number, hidden: boolean) =>
    request(`/troops/${troopId}/gear-overrides/${gearId}`, { method: "PUT", body: JSON.stringify({ hidden }) }),
  getTroopGearOverrides: (troopId: number) => request<GearOverride[]>(`/troops/${troopId}/gear-overrides`),

  // Troop Custom Gear
  getTroopCustomGear: (troopId: number) => request<TroopCustomGear[]>(`/troops/${troopId}/custom-gear`),
  addTroopCustomGear: (troopId: number, data: ApiData) => request<TroopCustomGear>(`/troops/${troopId}/custom-gear`, { method: "POST", body: JSON.stringify(data) }),
  updateTroopCustomGear: (troopId: number, id: number, data: ApiData) => request(`/troops/${troopId}/custom-gear/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTroopCustomGear: (troopId: number, id: number) => request(`/troops/${troopId}/custom-gear/${id}`, { method: "DELETE" }),

  // AI Gear (premium)
  aiWeightLookup: (productName: string) => request("/gear/ai/weight-lookup", { method: "POST", body: JSON.stringify({ product_name: productName }) }),
  aiGearChat: (message: string, adventureId: number) => request("/gear/ai/chat", { method: "POST", body: JSON.stringify({ message, adventure_id: adventureId }) }),
  getAIUsage: () => request<AIUsage>("/gear/ai/usage"),

  // AI Gear Recommendations
  getAIGearRecommendation: (gearId: number, adventureId: number) => request(`/gear-catalog/${gearId}/ai-recommend`, { method: "POST", body: JSON.stringify({ adventureId }) }),

  // Retailers (admin)
  getRetailers: () => request<any[]>('/admin/retailers'),
  updateRetailer: (id: number, data: ApiData) => request('/admin/retailers/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  createRetailer: (data: ApiData) => request('/admin/retailers', { method: 'POST', body: JSON.stringify(data) }),

  // Global Admin
  getAdminTroops: () => request("/admin/troops"),
  getAdminTroopMembers: (troopId: number) => request(`/admin/troops/${troopId}/members`),
  deleteAdminTroop: (troopId: number) => request(`/admin/troops/${troopId}`, { method: "DELETE" }),
  getAdminUsers: () => request("/admin/users"),
  getAdminSettings: () => request("/admin/settings"),
  updateAdminSetting: (key: string, value: unknown) => request("/admin/settings", { method: "PUT", body: JSON.stringify({ key, value }) }),
  getAffiliateStats: () => request<AffiliateStats>("/admin/affiliate-stats"),
  refreshGearRecs: () => request("/admin/refresh-gear-recs", { method: "POST" }),
  getGearRefreshStatus: () => request<GearRefreshStatus>("/admin/gear-refresh-status"),
  getSystemAdmins: () => request("/admin/system-admins"),
  promoteAdmin: (userId: number) => request(`/admin/users/${userId}/promote`, { method: "PUT" }),
  demoteAdmin: (userId: number) => request(`/admin/users/${userId}/demote`, { method: "PUT" }),

  // Crews
  getCrews: (advId: number) => request<Crew[]>(`/adventures/${advId}/crews`),
  getCrew: (crewId: number) => request<Crew>(`/crews/${crewId}`),
  createCrew: (advId: number, data: ApiData) => request<Crew>(`/adventures/${advId}/crews`, { method: "POST", body: JSON.stringify(data) }),
  updateCrew: (crewId: number, data: ApiData) => request(`/crews/${crewId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCrew: (crewId: number) => request(`/crews/${crewId}`, { method: "DELETE" }),

  // Crew Members
  getCrewMembers: (crewId: number) => request<AdventureMember[]>(`/crews/${crewId}/members`),
  getAllCrewMembers: (adventureId: number) => request<AdventureMember[]>(`/adventures/${adventureId}/all-crew-members`),
  addCrewMember: (crewId: number, user_id: number, role: string) => request(`/crews/${crewId}/members`, { method: "POST", body: JSON.stringify({ user_id, role }) }),
  removeCrewMember: (crewId: number, userId: number) => request(`/crews/${crewId}/members/${userId}`, { method: "DELETE" }),
  updateCrewDates: (crewId: number, userId: number, dates: string[]) => request(`/crews/${crewId}/members/${userId}/dates`, { method: "PUT", body: JSON.stringify({ dates }) }),
  updateCrewSkills: (crewId: number, userId: number, skills: number[]) => request(`/crews/${crewId}/members/${userId}/skills`, { method: "PUT", body: JSON.stringify({ skills }) }),
  updateCrewGear: (crewId: number, userId: number, gear: unknown[]) => request(`/crews/${crewId}/members/${userId}/gear`, { method: "PUT", body: JSON.stringify({ gear }) }),
  updateCrewMedical: (crewId: number, userId: number, medical: number[]) => request(`/crews/${crewId}/members/${userId}/medical`, { method: "PUT", body: JSON.stringify({ medical }) }),
  updateCrewAdmin: (crewId: number, userId: number, admin_tasks: number[]) => request(`/crews/${crewId}/members/${userId}/admin`, { method: "PUT", body: JSON.stringify({ admin_tasks }) }),
  updateCrewMemberRole: (crewId: number, userId: number, role: string) => request(`/crews/${crewId}/members/${userId}/role`, { method: "PUT", body: JSON.stringify({ role }) }),
  updateCrewParticipation: (crewId: number, userId: number, participation: string) => request(`/crews/${crewId}/members/${userId}/participation`, { method: "PUT", body: JSON.stringify({ participation }) }),
  linkCrewMember: (crewId: number, userId: number, linked_scouts: number[]) => request(`/crews/${crewId}/members/${userId}/link`, { method: "PUT", body: JSON.stringify({ linked_scouts }) }),
  addCrewManualMember: (crewId: number, name: string) => request(`/crews/${crewId}/manual-members`, { method: "POST", body: JSON.stringify({ name }) }),
  removeCrewManualMember: (crewId: number, memberId: number) => request(`/crews/${crewId}/manual-members/${memberId}`, { method: "DELETE" }),

  // Crew Gear
  getCrewGearAll: (crewId: number) => request<MemberGearItem[]>(`/crews/${crewId}/gear`),
  getCrewMemberPackWeight: (crewId: number, userId: number) => request<PackWeightResult>(`/crews/${crewId}/members/${userId}/pack-weight`),

  // Crew Achievements
  getCrewAchievements: (crewId: number) => request<Achievement>(`/crews/${crewId}/achievements`),

  // AI Readiness
  getAssessment: (crewId: number) => request(`/crews/${crewId}/readiness/assess`),
  submitAssessment: (crewId: number, data: ApiData) => request(`/crews/${crewId}/readiness/assess`, { method: "POST", body: JSON.stringify(data) }),
  getReadinessPlan: (crewId: number, userId: number) => request(`/crews/${crewId}/readiness/plan/${userId}`),
  updateReadinessProgress: (crewId: number, data: ApiData) => request(`/crews/${crewId}/readiness/progress`, { method: "PUT", body: JSON.stringify(data) }),
  getReadinessDashboard: (crewId: number) => request(`/crews/${crewId}/readiness/dashboard`),
  regenerateReadinessPlan: (crewId: number) => request(`/crews/${crewId}/readiness/regenerate`, { method: "POST" }),

  // Councils
  getCouncils: () => request<Council[]>("/councils"),

  // Dashboard
  getDashboard: () => request<DashboardData>("/dashboard"),

  // Affiliate tracking
  trackAffiliateClick: (productOptionId: number, gearCatalogId: number, url: string) =>
    request("/affiliate/click", { method: "POST", body: JSON.stringify({ product_option_id: productOptionId, gear_catalog_id: gearCatalogId, url }) }),

  // Documents
  getDocuments: (advId: number) => request<AdventureDocument[]>(`/adventures/${advId}/documents`),
  uploadDocument: (advId: number, file: string, originalName: string, description: string) => request(`/adventures/${advId}/documents`, { method: "POST", body: JSON.stringify({ file, originalName, description }) }),
  getDocumentUrl: (advId: number, docId: number): string => `${BASE}/adventures/${advId}/documents/${docId}/download`,
  deleteDocument: (advId: number, docId: number) => request(`/adventures/${advId}/documents/${docId}`, { method: "DELETE" }),

  // Onboarding
  getOnboarding: () => request<{ role: string | null; steps: string[]; completed: boolean }>("/onboarding"),
  setOnboardingRole: (role: string) => request("/onboarding/role", { method: "PUT", body: JSON.stringify({ role }) }),
  completeOnboardingStep: (step: string) => request("/onboarding/step", { method: "PUT", body: JSON.stringify({ step }) }),
  completeOnboarding: () => request("/onboarding/complete", { method: "PUT" }),

  // Public settings (no auth)
  getPublicSettings: (): Promise<AnnouncementSettings> => fetch("/api/public-settings").then(r => r.json()),
};
