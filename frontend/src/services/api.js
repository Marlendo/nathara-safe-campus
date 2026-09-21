const API_BASE = "/api/v1";

/** Lightweight fetch wrapper that throws on non-2xx. */
async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  // Public
  createReport: (data) => request("/reports", { method: "POST", body: data }),
  getCaseStatus: (caseNumber) => request(`/reports/${caseNumber}/status`),
  getServices: (type) =>
    request(`/services${type ? `?type=${type}` : ""}`),

  // Auth
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }),

  // Responder
  getOverview: (token) => request("/admin/overview", { token }),
  getReports: (token, filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const qs = params.toString();
    return request(`/admin/reports${qs ? `?${qs}` : ""}`, { token });
  },
  getReport: (token, id) => request(`/admin/reports/${id}`, { token }),
  assignCase: (token, id, userId) =>
    request(`/admin/reports/${id}/assign`, { method: "POST", body: { userId }, token }),
  changeStatus: (token, id, status) =>
    request(`/admin/reports/${id}/status`, { method: "PATCH", body: { status }, token }),
  addNote: (token, id, note) =>
    request(`/admin/reports/${id}/notes`, { method: "POST", body: { note }, token }),
  createReferral: (token, id, serviceId) =>
    request(`/admin/reports/${id}/referrals`, { method: "POST", body: { serviceId }, token }),
  getActiveResponders: (token) => request("/admin/responders", { token }),

  // Admin — service directory
  getAdminServices: (token) => request("/admin/services", { token }),
  createService: (token, data) =>
    request("/admin/services", { method: "POST", body: data, token }),
  updateService: (token, id, data) =>
    request(`/admin/services/${id}`, { method: "PATCH", body: data, token }),
  deleteService: (token, id) =>
    request(`/admin/services/${id}`, { method: "DELETE", token }),

  // Admin — responder accounts
  createUser: (token, data) =>
    request("/admin/users", { method: "POST", body: data, token }),
  updateUser: (token, id, data) =>
    request(`/admin/users/${id}`, { method: "PATCH", body: data, token }),
  resetPassword: (token, id, password) =>
    request(`/admin/users/${id}/reset-password`, { method: "POST", body: { password }, token }),

  // Admin — system activity
  getActivity: (token, limit = 50) =>
    request(`/admin/activity?limit=${limit}`, { token }),
};

export default api;