/**
 * auth-store.js - Alpine.store('auth'): quản lý session, token, user hiện tại.
 */
(function () {
  'use strict';

  const SESSION_KEY = 'crm.session';

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !s.token || !s.user) return null;
      // Decode exp
      try {
        const parts = s.token.split('.');
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          localStorage.removeItem(SESSION_KEY);
          return null;
        }
      } catch (e) {
        // token malformed -> logout
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return s;
    } catch (e) { return null; }
  }

  function saveSession(s) {
    if (!s) {
      localStorage.removeItem(SESSION_KEY);
    } else {
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    }
  }

  const authStore = {
    token: null,
    user: null,
    initialized: false,

    init() {
      const s = loadSession();
      if (s) {
        this.token = s.token;
        this.user = s.user;
      }
      this.initialized = true;

      // Listen cho event 401
      window.addEventListener('crm:unauthorized', () => {
        this.logout();
        toast.error('Phiên đăng nhập đã hết hạn');
        setTimeout(() => location.reload(), 800);
      });
    },

    async login(username, password) {
      try {
        const res = await api.login(username, password);
        this.token = res.data.token;
        this.user = res.data.user;
        saveSession({ token: this.token, user: this.user });
        return res.data;
      } catch (err) {
        throw err;
      }
    },

    logout() {
      this.token = null;
      this.user = null;
      saveSession(null);
    },

    isRole(role) {
      return this.user && this.user.role === role;
    },

    home() {
      if (!this.user) return '/';
      const cfg = (window.APP_ROLES || {})[this.user.role];
      return cfg ? cfg.home : '/';
    },

    fullName() {
      return (this.user && this.user.full_name) || 'Người dùng';
    },

    initials() {
      return fmt.initials(this.fullName());
    }
  };

  // Đăng ký store với Alpine khi Alpine khởi tạo
  document.addEventListener('alpine:init', () => {
    Alpine.store('auth', authStore);
  });
})();
