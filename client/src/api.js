const BASE = "/api";

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function request(path, options = {}) {
  const csrfToken = getCsrfToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
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
  return data;
}

export const api = {
  // Auth
  getMe: () => request("/auth/me"),
  login: (email, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  signup: (name, email, password, tos_accepted) => request("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password, tos_accepted }) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  updateProfile: (data) => request("/auth/profile", { method: "PUT", body: JSON.stringify(data) }),
  forgotPassword: (email) => request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token, password) => request("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),
  changePassword: (currentPassword, newPassword) => request("/auth/change-password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) }),

  // Troops
  getTroops: () => request("/troops"),
  getTroop: (id) => request(`/troops/${id}`),
  createTroop: (data) => request("/troops", { method: "POST", body: JSON.stringify(data) }),
  updateTroop: (id, data) => request(`/troops/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  joinTroop: (id, data) => request(`/troops/${id}/join`, { method: "POST", body: JSON.stringify(data || {}) }),
  getTroopJoinInfo: (id) => request(`/troops/${id}/join-info`),
  uploadTroopLogo: (id, image) => request(`/troops/${id}/logo`, { method: "PUT", body: JSON.stringify({ image }) }),
  deleteTroopLogo: (id) => request(`/troops/${id}/logo`, { method: "PUT", body: JSON.stringify({}) }),
  updateTroopSettings: (id, data) => request(`/troops/${id}/settings`, { method: "PUT", body: JSON.stringify(data) }),

  // Troop Members
  getMembers: (troopId) => request(`/troops/${troopId}/members`),
  approveMember: (troopId, userId) => request(`/troops/${troopId}/members/${userId}/approve`, { method: "PUT" }),
  denyMember: (troopId, userId) => request(`/troops/${troopId}/members/${userId}/deny`, { method: "PUT" }),
  removeMember: (troopId, userId) => request(`/troops/${troopId}/members/${userId}`, { method: "DELETE" }),
  leaveTroop: (troopId) => request(`/troops/${troopId}/leave`, { method: "POST" }),
  updateDates: (troopId, userId, dates) => request(`/troops/${troopId}/members/${userId}/dates`, { method: "PUT", body: JSON.stringify({ dates }) }),
  updateSkills: (troopId, userId, skills) => request(`/troops/${troopId}/members/${userId}/skills`, { method: "PUT", body: JSON.stringify({ skills }) }),

  // Skills (legacy troop-scoped)
  getSkills: (troopId) => request(`/troops/${troopId}/skills`),
  addSkill: (troopId, name, desc) => request(`/troops/${troopId}/skills`, { method: "POST", body: JSON.stringify({ name, desc }) }),
  removeSkill: (troopId, skillId) => request(`/troops/${troopId}/skills/${skillId}`, { method: "DELETE" }),

  // Adventures
  getAdventures: (troopId) => request(`/troops/${troopId}/adventures`),
  getAdventure: (id) => request(`/adventures/${id}`),
  createAdventure: (troopId, data) => request(`/troops/${troopId}/adventures`, { method: "POST", body: JSON.stringify(data) }),
  updateAdventure: (id, data) => request(`/adventures/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteAdventure: (id) => request(`/adventures/${id}`, { method: "DELETE" }),

  // Adventure Members
  getAdventureMembers: (advId) => request(`/adventures/${advId}/members`),
  addAdventureMember: (advId, user_id, role) => request(`/adventures/${advId}/members`, { method: "POST", body: JSON.stringify({ user_id, role }) }),
  removeAdventureMember: (advId, userId) => request(`/adventures/${advId}/members/${userId}`, { method: "DELETE" }),
  updateAdventureDates: (advId, userId, dates) => request(`/adventures/${advId}/members/${userId}/dates`, { method: "PUT", body: JSON.stringify({ dates }) }),
  updateAdventureSkills: (advId, userId, skills) => request(`/adventures/${advId}/members/${userId}/skills`, { method: "PUT", body: JSON.stringify({ skills }) }),
  updateAdventureGear: (advId, userId, gear) => request(`/adventures/${advId}/members/${userId}/gear`, { method: "PUT", body: JSON.stringify({ gear }) }),
  updateAdventureMedical: (advId, userId, medical) => request(`/adventures/${advId}/members/${userId}/medical`, { method: "PUT", body: JSON.stringify({ medical }) }),
  updateAdventureAdmin: (advId, userId, admin_tasks) => request(`/adventures/${advId}/members/${userId}/admin`, { method: "PUT", body: JSON.stringify({ admin_tasks }) }),

  // Adventure Skills
  getAdventureSkills: (advId, category) => request(`/adventures/${advId}/skills${category ? `?category=${category}` : ""}`),
  addAdventureSkill: (advId, name, desc, category, icon) => request(`/adventures/${advId}/skills`, { method: "POST", body: JSON.stringify({ name, desc, category, icon }) }),
  removeAdventureSkill: (advId, skillId) => request(`/adventures/${advId}/skills/${skillId}`, { method: "DELETE" }),

  // Adventure Member Management
  updateMemberRole: (advId, userId, role) => request(`/adventures/${advId}/members/${userId}/role`, { method: "PUT", body: JSON.stringify({ role }) }),
  updateMemberUserType: (advId, userId, user_type) => request(`/adventures/${advId}/members/${userId}/user-type`, { method: "PUT", body: JSON.stringify({ user_type }) }),
  updateParticipation: (advId, userId, participation) => request(`/adventures/${advId}/members/${userId}/participation`, { method: "PUT", body: JSON.stringify({ participation }) }),
  linkMember: (advId, userId, linked_scouts) => request(`/adventures/${advId}/members/${userId}/link`, { method: "PUT", body: JSON.stringify({ linked_scouts }) }),
  addManualMember: (advId, name) => request(`/adventures/${advId}/manual-members`, { method: "POST", body: JSON.stringify({ name }) }),
  removeManualMember: (advId, memberId) => request(`/adventures/${advId}/manual-members/${memberId}`, { method: "DELETE" }),

  // Invitations
  sendInvitation: (advId, email) => request(`/adventures/${advId}/invitations`, { method: "POST", body: JSON.stringify({ email }) }),
  getInvitations: (advId) => request(`/adventures/${advId}/invitations`),

  // Link Requests
  getLinkRequests: (advId) => request(`/adventures/${advId}/link-requests`),
  createLinkRequest: (advId, scout_id) => request(`/adventures/${advId}/link-requests`, { method: "POST", body: JSON.stringify({ scout_id }) }),
  approveLinkRequest: (advId, requestId) => request(`/adventures/${advId}/link-requests/${requestId}/approve`, { method: "PUT" }),
  denyLinkRequest: (advId, requestId) => request(`/adventures/${advId}/link-requests/${requestId}/deny`, { method: "PUT" }),

  // Achievements
  getAchievements: (advId) => request(`/adventures/${advId}/achievements`),
  checkMilestones: (advId) => request(`/adventures/${advId}/check-milestones`, { method: "POST" }),

  // Training Events
  getTrainingEvents: (advId) => request(`/adventures/${advId}/training-events`),
  createTrainingEvent: (advId, data) => request(`/adventures/${advId}/training-events`, { method: "POST", body: JSON.stringify(data) }),
  deleteTrainingEvent: (advId, eventId) => request(`/adventures/${advId}/training-events/${eventId}`, { method: "DELETE" }),
  rsvpTrainingEvent: (advId, eventId, status) => request(`/adventures/${advId}/training-events/${eventId}/rsvp`, { method: "PUT", body: JSON.stringify({ status }) }),

  // Itineraries
  getItineraries: () => request("/itineraries"),
  getItinerary: (id) => request(`/itineraries/${id}`),

  // Gear (legacy)
  getGear: (troopId) => fetch(`${BASE}/gear${troopId ? `?troop=${troopId}` : ""}`, { credentials: "include" }).then(r => r.json()),

  // Gear Catalog (v5)
  getGearCatalog: (troopId) => request(`/gear-catalog${troopId ? `?troop=${troopId}` : ""}`),
  getGearCategories: () => request("/gear-catalog/categories"),
  getGearCatalogItem: (id) => request(`/gear-catalog/${id}`),

  // Member Gear (adventure-scoped)
  getAdventureGearAll: (advId) => request(`/adventures/${advId}/gear`),
  getMemberGearItems: (advId, userId) => request(`/adventures/${advId}/members/${userId}/gear`),
  updateMemberGearItem: (advId, userId, gearId, data) =>
    request(`/adventures/${advId}/members/${userId}/gear-item/${gearId}`, { method: "PUT", body: JSON.stringify(data) }),
  bulkSetMemberGear: (advId, userId, selections) =>
    request(`/adventures/${advId}/members/${userId}/gear-bulk`, { method: "POST", body: JSON.stringify({ selections }) }),
  removeMemberGearItem: (advId, userId, gearId) =>
    request(`/adventures/${advId}/members/${userId}/gear-item/${gearId}`, { method: "DELETE" }),
  getMemberPackWeight: (advId, userId) => request(`/adventures/${advId}/members/${userId}/pack-weight`),

  // Gear Admin (global admin)
  createGearCatalogItem: (data) => request("/gear-catalog", { method: "POST", body: JSON.stringify(data) }),
  updateGearCatalogItem: (id, data) => request(`/gear-catalog/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteGearCatalogItem: (id) => request(`/gear-catalog/${id}`, { method: "DELETE" }),
  reorderGearCatalog: (orderedIds) => request("/gear-catalog-reorder", { method: "PUT", body: JSON.stringify({ orderedIds }) }),
  addProductOption: (gearId, data) => request(`/gear-catalog/${gearId}/options`, { method: "POST", body: JSON.stringify(data) }),
  updateProductOption: (optId, data) => request(`/gear-catalog/options/${optId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProductOption: (optId) => request(`/gear-catalog/options/${optId}`, { method: "DELETE" }),

  // Troop Gear Overrides
  setTroopGearOverride: (troopId, gearId, hidden) =>
    request(`/troops/${troopId}/gear-overrides/${gearId}`, { method: "PUT", body: JSON.stringify({ hidden }) }),
  getTroopGearOverrides: (troopId) => request(`/troops/${troopId}/gear-overrides`),

  // Troop Custom Gear
  getTroopCustomGear: (troopId) => request(`/troops/${troopId}/custom-gear`),
  addTroopCustomGear: (troopId, data) => request(`/troops/${troopId}/custom-gear`, { method: "POST", body: JSON.stringify(data) }),
  updateTroopCustomGear: (troopId, id, data) => request(`/troops/${troopId}/custom-gear/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTroopCustomGear: (troopId, id) => request(`/troops/${troopId}/custom-gear/${id}`, { method: "DELETE" }),

  // AI Gear (premium)
  aiWeightLookup: (productName) => request("/gear/ai/weight-lookup", { method: "POST", body: JSON.stringify({ product_name: productName }) }),
  aiGearChat: (message, adventureId) => request("/gear/ai/chat", { method: "POST", body: JSON.stringify({ message, adventure_id: adventureId }) }),
  getAIUsage: () => request("/gear/ai/usage"),

  // AI Gear Recommendations
  getAIGearRecommendation: (gearId, adventureId) => request(`/gear-catalog/${gearId}/ai-recommend`, { method: "POST", body: JSON.stringify({ adventureId }) }),

  // Global Admin
  getAdminTroops: () => request("/admin/troops"),
  getAdminTroopMembers: (troopId) => request(`/admin/troops/${troopId}/members`),
  deleteAdminTroop: (troopId) => request(`/admin/troops/${troopId}`, { method: "DELETE" }),
  getAdminUsers: () => request("/admin/users"),
  getAdminSettings: () => request("/admin/settings"),
  updateAdminSetting: (key, value) => request("/admin/settings", { method: "PUT", body: JSON.stringify({ key, value }) }),
  getAffiliateStats: () => request("/admin/affiliate-stats"),
  getSystemAdmins: () => request("/admin/system-admins"),
  promoteAdmin: (userId) => request(`/admin/users/${userId}/promote`, { method: "PUT" }),
  demoteAdmin: (userId) => request(`/admin/users/${userId}/demote`, { method: "PUT" }),

  // Crews
  getCrews: (advId) => request(`/adventures/${advId}/crews`),
  getCrew: (crewId) => request(`/crews/${crewId}`),
  createCrew: (advId, data) => request(`/adventures/${advId}/crews`, { method: "POST", body: JSON.stringify(data) }),
  updateCrew: (crewId, data) => request(`/crews/${crewId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCrew: (crewId) => request(`/crews/${crewId}`, { method: "DELETE" }),

  // Crew Members
  getCrewMembers: (crewId) => request(`/crews/${crewId}/members`),
  addCrewMember: (crewId, user_id, role) => request(`/crews/${crewId}/members`, { method: "POST", body: JSON.stringify({ user_id, role }) }),
  removeCrewMember: (crewId, userId) => request(`/crews/${crewId}/members/${userId}`, { method: "DELETE" }),
  updateCrewDates: (crewId, userId, dates) => request(`/crews/${crewId}/members/${userId}/dates`, { method: "PUT", body: JSON.stringify({ dates }) }),
  updateCrewSkills: (crewId, userId, skills) => request(`/crews/${crewId}/members/${userId}/skills`, { method: "PUT", body: JSON.stringify({ skills }) }),
  updateCrewGear: (crewId, userId, gear) => request(`/crews/${crewId}/members/${userId}/gear`, { method: "PUT", body: JSON.stringify({ gear }) }),
  updateCrewMedical: (crewId, userId, medical) => request(`/crews/${crewId}/members/${userId}/medical`, { method: "PUT", body: JSON.stringify({ medical }) }),
  updateCrewAdmin: (crewId, userId, admin_tasks) => request(`/crews/${crewId}/members/${userId}/admin`, { method: "PUT", body: JSON.stringify({ admin_tasks }) }),
  updateCrewMemberRole: (crewId, userId, role) => request(`/crews/${crewId}/members/${userId}/role`, { method: "PUT", body: JSON.stringify({ role }) }),
  updateCrewParticipation: (crewId, userId, participation) => request(`/crews/${crewId}/members/${userId}/participation`, { method: "PUT", body: JSON.stringify({ participation }) }),
  linkCrewMember: (crewId, userId, linked_scouts) => request(`/crews/${crewId}/members/${userId}/link`, { method: "PUT", body: JSON.stringify({ linked_scouts }) }),
  addCrewManualMember: (crewId, name) => request(`/crews/${crewId}/manual-members`, { method: "POST", body: JSON.stringify({ name }) }),
  removeCrewManualMember: (crewId, memberId) => request(`/crews/${crewId}/manual-members/${memberId}`, { method: "DELETE" }),

  // Crew Gear
  getCrewGearAll: (crewId) => request(`/crews/${crewId}/gear`),
  getCrewMemberPackWeight: (crewId, userId) => request(`/crews/${crewId}/members/${userId}/pack-weight`),

  // Crew Achievements
  getCrewAchievements: (crewId) => request(`/crews/${crewId}/achievements`),

  // AI Readiness
  getAssessment: (crewId) => request(`/crews/${crewId}/readiness/assess`),
  submitAssessment: (crewId, data) => request(`/crews/${crewId}/readiness/assess`, { method: "POST", body: JSON.stringify(data) }),
  getReadinessPlan: (crewId, userId) => request(`/crews/${crewId}/readiness/plan/${userId}`),
  updateReadinessProgress: (crewId, data) => request(`/crews/${crewId}/readiness/progress`, { method: "PUT", body: JSON.stringify(data) }),
  getReadinessDashboard: (crewId) => request(`/crews/${crewId}/readiness/dashboard`),
  regenerateReadinessPlan: (crewId) => request(`/crews/${crewId}/readiness/regenerate`, { method: "POST" }),

  // Councils
  getCouncils: () => request("/councils"),

  // Dashboard
  getDashboard: () => request("/dashboard"),

  // Affiliate tracking
  trackAffiliateClick: (productOptionId, gearCatalogId, url) =>
    request("/affiliate/click", { method: "POST", body: JSON.stringify({ product_option_id: productOptionId, gear_catalog_id: gearCatalogId, url }) }),

  // Public settings (no auth)
  getPublicSettings: () => fetch("/api/public-settings").then(r => r.json()),
};
