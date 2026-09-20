/**
 * api-client.js - Fetch wrapper: retry, abort, JWT, error handling.
 */
(function () {
  'use strict';

  const RETRY_LIMIT = 2;
  const RETRY_DELAY = 800;
  const TIMEOUT_MS = 60000;

  function buildUrl(action, params) {
    const base = (window.APP_CONFIG.API_BASE || '').replace(/\/+$/, '');
    const qs = new URLSearchParams();
    qs.set('action', action);
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(k => {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
          qs.set(k, params[k]);
        }
      });
    }
    return base + '?' + qs.toString();
  }

  function getAuthToken() {
    try {
      const raw = localStorage.getItem('crm.session');
      if (!raw) return null;
      const s = JSON.parse(raw);
      return s.token;
    } catch (e) { return null; }
  }

  async function request(action, body, opts) {
    opts = opts || {};
    const method = opts.method || (body ? 'POST' : 'GET');
    const token = getAuthToken();
    const url = buildUrl(action, Object.assign({}, opts.query || {}, token && method === 'GET' ? { token } : {}));

    const headers = { 'Content-Type': 'text/plain;charset=utf-8' };

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    if (opts.signal) {
      opts.signal.addEventListener('abort', () => ctrl.abort());
    }

    let attempt = 0;
    let lastErr;
    while (attempt <= RETRY_LIMIT) {
      try {
        // Body gửi đi: gộp token vào để backend auth (tránh Authorization header gây preflight)
        const payload = body ? Object.assign({}, body) : {};
        if (token && method !== 'GET') payload.token = token;

        const res = await fetch(url, {
          method,
          headers,
          body: (method === 'GET') ? undefined : JSON.stringify(payload),
          signal: ctrl.signal
        });
        clearTimeout(t);

        let data;
        try { data = await res.json(); }
        catch (e) { data = { ok: false, error: 'Phản hồi không hợp lệ' }; }

        if (!res.ok && res.status !== 200) {
          if (res.status === 401) {
            // Unauthorized -> logout
            window.dispatchEvent(new CustomEvent('crm:unauthorized'));
          }
          throw new Error(data.error || ('HTTP ' + res.status));
        }

        if (data.ok === false) {
          throw new Error(data.error || 'API error');
        }
        return data;
      } catch (err) {
        lastErr = err;
        if (err.name === 'AbortError') {
          throw new Error('Request timeout / đã hủy');
        }
        attempt++;
        if (attempt > RETRY_LIMIT) break;
        await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
      }
    }
    throw lastErr || new Error('Network error');
  }

  // Helper methods
  const api = {
    get:    (action, params) => request(action, null, { method: 'GET', query: params }),
    post:   (action, body)   => request(action, body || {}, { method: 'POST' }),
    put:    (action, body)   => request(action, body || {}, { method: 'POST' }),
    del:    (action, body)   => request(action, body || {}, { method: 'POST' }),

    // Shortcuts
    login:           (username, password) => request('login', { username, password }, { method: 'POST' }),
    me:              () => request('me', null, { method: 'GET' }),
    listLeads:       (params) => request('list_leads', params || {}, { method: 'POST' }),
    getLead:         (lead_id) => request('get_lead', { lead_id }, { method: 'POST' }),
    createLead:      (payload) => request('create_lead', payload, { method: 'POST' }),
    updateLead:      (lead_id, payload) => request('update_lead', Object.assign({ lead_id }, payload), { method: 'POST' }),
    deleteLead:      (lead_id) => request('delete_lead', { lead_id }, { method: 'POST' }),
    updateLeadStatus:(lead_id, payload) => request('update_lead_status', Object.assign({ lead_id }, payload), { method: 'POST' }),
    assignLead:      (lead_id, payload) => request('assign_lead', Object.assign({ lead_id }, payload), { method: 'POST' }),
    listUsers:       (filter) => request('list_users', filter || {}, { method: 'POST' }),
    createUser:      (payload) => request('create_user', payload, { method: 'POST' }),
    updateUser:      (payload) => request('update_user', payload, { method: 'POST' }),
    deleteUser:      (user_id) => request('delete_user', { user_id }, { method: 'POST' }),
    statsOverview:   () => request('stats_overview', null, { method: 'POST' }),
    statsConversion: () => request('stats_conversion', null, { method: 'POST' }),
    statsLeaderboard:() => request('stats_leaderboard', null, { method: 'POST' }),
    listMapping:     () => request('list_mapping', null, { method: 'POST' }),
    updateMapping:   (trang_thai_noi_bo, trang_thai_ads) => request('update_mapping', { trang_thai_noi_bo, trang_thai_ads }, { method: 'POST' }),
    listStatus:      () => request('list_status', null, { method: 'POST' }),
    ping:            () => request('ping', null, { method: 'GET' })
  };

  window.api = api;
})();
