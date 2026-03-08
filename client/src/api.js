const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Members
  getMembers: () => request("/members"),
  addMember: (name, pin) => request("/members", { method: "POST", body: JSON.stringify({ name, pin }), headers: { "x-admin-pin": pin } }),
  removeMember: (id, pin) => request(`/members/${id}`, { method: "DELETE", headers: { "x-admin-pin": pin } }),
  updateDates: (id, dates) => request(`/members/${id}/dates`, { method: "PUT", body: JSON.stringify({ dates }) }),
  updateSkills: (id, skills) => request(`/members/${id}/skills`, { method: "PUT", body: JSON.stringify({ skills }) }),

  // Skills
  getSkills: () => request("/skills"),
  addSkill: (name, desc, pin) => request("/skills", { method: "POST", body: JSON.stringify({ name, desc, pin }), headers: { "x-admin-pin": pin } }),
  removeSkill: (id, pin) => request(`/skills/${id}`, { method: "DELETE", headers: { "x-admin-pin": pin } }),

  // Admin
  verifyPin: (pin) => request("/admin/verify", { method: "POST", body: JSON.stringify({ pin }) }),
  reset: (pin) => request("/admin/reset", { method: "POST", body: JSON.stringify({ pin }), headers: { "x-admin-pin": pin } }),
};
