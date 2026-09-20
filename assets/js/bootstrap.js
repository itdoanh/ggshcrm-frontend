/**
 * bootstrap.js - Khởi tạo Alpine components cho app.
 * VERSION v1.1.3 - Force cache bust
 */
(function () {
  'use strict';

  // State chung cho app
  const AppState = {
    sidebarCollapsed: false,
    mobileSidebarOpen: false,
    viewHtml: '',
    viewData: null,
    viewName: '',
    loading: false
  };

  // Cache view HTML
  const viewCache = {};

  /**
   * Map route name -> view file
   * 'admin' route uses admin.html, 'admin.users' cũng dùng admin.html (mặc định)
   */
  const ROUTE_TO_VIEW = {
    'home': 'home',
    'admin': 'admin',
    'admin.leads': 'leads',
    'admin.users': 'users',
    'admin.mapping': 'mapping',
    'admin.lead': 'leads',
    'admin.sheetHub': 'sheet-hub',
    'admin.assign': 'lead-assign',
    'admin.distribution': 'settings',
    'manager': 'manager',
    'manager.leads': 'leads',
    'manager.assign': 'lead-assign',
    'manager.leaders': 'users',
    'leader': 'leader',
    'leader.leads': 'leads',
    'leader.assign': 'lead-assign',
    'leader.sales': 'users',
    'sale': 'sale',
    'sale.leads': 'leads',
    'profile': 'profile',
    'settings': 'settings',
    'sheet-hub': 'sheet-hub'
  };

  async function fetchView(name) {
    // Map route name -> view file
    const viewName = ROUTE_TO_VIEW[name] || name.split('.')[0] || 'home';
    if (viewCache[viewName]) return viewCache[viewName];
    const res = await fetch('views/' + viewName + '.html', { cache: 'no-cache' });
    if (!res.ok) {
      // Fallback về home nếu không có
      if (viewName !== 'home') {
        const fb = await fetch('views/home.html', { cache: 'no-cache' });
        if (fb.ok) return await fb.text();
      }
      throw new Error('View not found: ' + viewName);
    }
    const html = await res.text();
    viewCache[viewName] = html;
    return html;
  }

  /**
   * Tách HTML body và các khối <script>.
   * Trả về { html, scripts } - html không còn thẻ <script>.
   */
  function splitHtmlAndScripts(raw) {
    const scripts = [];
    // Lấy tất cả <script>...</script>
    const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let html = raw.replace(scriptRe, (_, code) => {
      scripts.push(code);
      return '';
    });
    return { html, scripts };
  }

  async function fetchInto(selector, viewName) {
    const el = document.querySelector(selector);
    if (!el) return;
    try {
      const html = await fetchView(viewName);
      el.innerHTML = html;
      if (window.ic) window.ic.render(el);
      // Alpine tự động init các x-data mới thêm vào DOM
    } catch (err) {
      el.innerHTML = '<div class="empty-state">Lỗi tải: ' + fmt.escapeHtml(err.message) + '</div>';
    }
  }

  document.addEventListener('alpine:init', () => {
    console.log('[Bootstrap] alpine:init fired');
    try {
      // ===== APP ROOT =====
        Alpine.data('app', () => ({
          ready: false,
          auth: Alpine.store('auth'),

          async init() {
            console.log('[App] init called');
            this.auth.init();
            // BỎ QUA api.me() verify khi init để tránh timeout/CORS khi Apps Script cold start.
            // Token JWT đã có đủ thông tin user, không cần verify lại ngay khi load trang.
            // Verify sẽ tự động fail qua các API call khác nếu token hết hạn.
            this.ready = true;
            document.body.classList.add('app-ready');
            console.log('[App] ready = true');
            setTimeout(() => window.ic && window.ic.render(), 100);
          }
        }));

    // ===== LOGIN VIEW =====
    Alpine.data('loginView', () => ({
      username: '',
      password: '',
      remember: true,
      loading: false,
      error: '',
      showApiInput: !window.APP_CONFIG.API_BASE,
      apiBase: window.APP_CONFIG.API_BASE,

      async init() {
        const root = this.$root;
        if (root && root.children.length === 0) {
          try {
            const html = await fetchView('login');
            root.innerHTML = html;
            if (window.ic) window.ic.render(root);
          } catch (e) {
            root.innerHTML = '<div class="empty-state">Lỗi tải login: ' + (e.message || e) + '</div>';
          }
        }
        setTimeout(() => window.ic && window.ic.render(), 50);
      },

      async submit() {
        if (this.loading) return;
        if (!this.username || !this.password) {
          this.error = 'Vui lòng nhập đầy đủ thông tin';
          return;
        }
        this.loading = true;
        this.error = '';
        try {
          if (this.showApiInput && this.apiBase) {
            window.APP_CONFIG.API_BASE = this.apiBase.trim();
            localStorage.setItem('crm.api_base', this.apiBase.trim());
          }
          await this.auth.login(this.username.trim(), this.password);
          toast.success('Đăng nhập thành công');
          setTimeout(() => location.reload(), 300);
        } catch (err) {
          this.error = err.message || 'Đăng nhập thất bại';
        } finally {
          this.loading = false;
        }
      }
    }));

    // ===== APP SHELL =====
    Alpine.data('appShell', () => ({
      auth: Alpine.store('auth'),
      router: Alpine.store('router'),
      sidebarCollapsed: false,
      viewHtml: '',
      viewName: '',
      viewParams: {},
      loading: true,

      async init() {
        this.sidebarCollapsed = localStorage.getItem('crm.sidebar_collapsed') === '1';

        // Load sidebar + topbar content (chỉ 1 lần)
        await fetchInto('.sidebar-host', 'sidebar');
        await fetchInto('.topbar-host', 'topbar');
        setTimeout(() => window.ic && window.ic.render(), 50);

        // Listen route change
        window.addEventListener('crm:route', async (e) => {
          await this.loadRoute(e.detail.name, e.detail.params || {});
        });
        await this.loadRoute(
          (window.router.getCurrent() || {}).name || this.auth.home(),
          (window.router.getCurrent() || {}).params || {}
        );
        this._initGlobalShortcuts();
      },

      async loadRoute(name, params) {
        this.viewName = name;
        this.viewParams = params;
        this.loading = true;
        try {
          const raw = await fetchView(name);
          const parsed = splitHtmlAndScripts(raw);

          await this.$nextTick();
          const target = document.getElementById('route-container');
          if (!target) {
            this.loading = false;
            return;
          }

          // Dispatch unload event cho component cũ cleanup (poller, listeners)
          window.dispatchEvent(new CustomEvent('crm:route:unload', { detail: { prev: this.viewName } }));

          // Clear container (innerHTML tự động cleanup DOM)
          target.innerHTML = parsed.html;

          // Đăng ký component (eval script) - phải chạy TRƯỚC Alpine.initTree
          parsed.scripts.forEach(code => {
            try { (0, eval)(code); }
            catch (e) { console.error('View script error:', e); }
          });

          // Đảm bảo các fallback scope đã register TRƯỚC khi Alpine.initTree
          try { (window.ensureCrmFallbackScopes || function(){})(); }
          catch (e) {}

          // Alpine.initTree để bind các x-data mới
          if (window.Alpine && Alpine.initTree) {
            try { Alpine.initTree(target); }
            catch (e) { console.error('Alpine.initTree error:', e); }
          }

          // Render Lucide icons
          if (window.ic) window.ic.render(target);

          // Dispatch event cho các view cần re-bind
          window.dispatchEvent(new CustomEvent('crm:route:loaded', { detail: { name, params } }));

          this.loading = false;
        } catch (err) {
          const container = document.getElementById('route-container');
          if (container) {
            container.innerHTML = `
              <div class="empty-state">
                <i data-lucide="alert-circle" style="width:48px;height:48px;color:#f43f5e;"></i>
                <div class="empty-state-title">Không tải được trang</div>
                <div class="empty-state-text">${fmt.escapeHtml(err.message)}</div>
              </div>`;
            if (window.ic) window.ic.render(container);
          }
          this.loading = false;
        }
      },

      toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        localStorage.setItem('crm.sidebar_collapsed', this.sidebarCollapsed ? '1' : '0');
      },

      toggleMobileSidebar() {
        const sidebar = document.querySelector('.app-sidebar');
        if (sidebar) sidebar.classList.toggle('mobile-open');
      },

      logout() {
        if (confirm('Đăng xuất khỏi hệ thống?')) {
          this.auth.logout();
          location.hash = '#/';
          setTimeout(() => location.reload(), 200);
        }
      },

      openSettings() {
        openModal({
          title: 'Cài đặt',
          size: 'md',
          html: '<div class="space-y-4"><p class="text-surface-300">API Endpoint hiện tại:</p><code class="block bg-surface-900 p-3 rounded text-xs break-all">' + fmt.escapeHtml(window.APP_CONFIG.API_BASE) + '</code><button class="btn btn-secondary w-full" onclick="localStorage.removeItem(\'crm.api_base\');location.reload();">Đổi API Endpoint</button></div>'
        });
      },

      _initGlobalShortcuts() {
        document.addEventListener('keydown', (e) => {
          // Ctrl+K -> focus search
          if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const search = document.querySelector('.topbar-search input');
            if (search) search.focus();
          }
        });
      }
    }));

    // ===== SIDEBAR =====
    Alpine.data('sidebarView', () => ({
      auth: Alpine.store('auth'),
      router: Alpine.store('router'),
      currentRoute: '',

      get initials() { return this.auth.initials(); },
      get fullName() { return this.auth.fullName(); },
      get roleLabel() {
        const role = this.auth.user && this.auth.user.role;
        return (window.APP_ROLES[role] || {}).label || role || '';
      },

      init() {
        this.currentRoute = (window.router.getCurrent() || {}).name || '';
        window.addEventListener('crm:route', (e) => {
          this.currentRoute = e.detail.name;
        });
        setTimeout(() => window.ic && window.ic.render(), 50);
      },

      menu() {
        const role = this.auth.user && this.auth.user.role;
        return (window.APP_MENU && window.APP_MENU[role]) || [];
      },

      isActive(route) {
        if (!this.currentRoute) return false;
        if (route === this.currentRoute) return true;
        return this.currentRoute.indexOf(route + '.') === 0;
      },

      go(route) {
        this.router.navigate(route);
        const sidebar = document.querySelector('.app-sidebar');
        if (sidebar && sidebar.classList.contains('mobile-open')) {
          sidebar.classList.remove('mobile-open');
        }
      },

      logout() {
        if (confirm('Đăng xuất khỏi hệ thống?')) {
          this.auth.logout();
          location.hash = '#/';
          setTimeout(() => location.reload(), 200);
        }
      }
    }));

    // ===== TOPBAR =====
    Alpine.data('topbarView', () => ({
      auth: Alpine.store('auth'),
      router: Alpine.store('router'),
      search: '',

      get initials() { return this.auth.initials(); },
      get fullName() { return this.auth.fullName(); },
      get roleLabel() {
        const role = this.auth.user && this.auth.user.role;
        return (window.APP_ROLES[role] || {}).label || role || '';
      },
      get currentRouteName() {
        const c = this.router && this.router.current && this.router.current();
        return (c && c.name) || 'home';
      },

      init() {
        setTimeout(() => window.ic && window.ic.render(), 50);
      },

      onSearch() {
        window.dispatchEvent(new CustomEvent('crm:search', { detail: this.search }));
      },

      logout() {
        if (confirm('Đăng xuất khỏi hệ thống?')) {
          this.auth.logout();
          location.hash = '#/';
          setTimeout(() => location.reload(), 200);
        }
      },

      openSettings() {
        openModal({
          title: 'Cài đặt hệ thống',
          size: 'md',
          html: `
            <div class="space-y-4">
              <div>
                <label class="form-label">API Endpoint</label>
                <code class="block bg-surface-900 p-3 rounded text-xs break-all text-surface-300">${fmt.escapeHtml(window.APP_CONFIG.API_BASE || '(chưa cấu hình)')}</code>
              </div>
              <div>
                <label class="form-label">Phiên bản</label>
                <div class="text-surface-300 text-sm">v${window.APP_CONFIG.VERSION}</div>
              </div>
              <div class="divider"></div>
              <button class="btn btn-danger w-full" onclick="localStorage.removeItem('crm.api_base');localStorage.removeItem('crm.session');location.reload();">
                <i data-lucide="trash-2" class="w-4 h-4"></i> Reset toàn bộ (đăng xuất + xóa API)
              </button>
            </div>
          `
        });
      },

      toggleSidebar() {
        const shell = document.querySelector('[x-data*="appShell"]');
        if (shell) {
          const data = Alpine.$data(shell);
          if (data && data.toggleSidebar) data.toggleSidebar();
        }
      },

      toggleMobile() {
        const sidebar = document.querySelector('.app-sidebar');
        if (sidebar) sidebar.classList.toggle('mobile-open');
      }
    }));

    // ===== MODAL LAYER =====
    Alpine.data('modalLayer', () => ({
      stack: [],

      init() {
        window.addEventListener('crm:modal', (e) => this.open(e.detail));
        window.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && this.stack.length) this.close(this.stack[this.stack.length - 1].id);
        });
      },

      open(opts) {
        const id = 'modal-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        const item = Object.assign({ id, size: 'md', html: '' }, opts);
        this.stack.push(item);
        document.body.style.overflow = 'hidden';
        setTimeout(() => window.ic && window.ic.render(), 50);
      },

      close(id) {
        this.stack = this.stack.filter(m => m.id !== id);
        if (!this.stack.length) document.body.style.overflow = '';
      },

      closeAll() {
        this.stack = [];
        document.body.style.overflow = '';
      }
    }));

    // ===== TOAST LAYER =====
    Alpine.data('toastLayer', () => ({
      init() {
        // Toast layer is created dynamically by window.toast.show()
      }
    }));
  } catch (err) {
    console.error('[Bootstrap] alpine:init error:', err);
  }
  });

  // Helpers global
  window.openModal = function (opts) {
    window.dispatchEvent(new CustomEvent('crm:modal', { detail: opts }));
  };
  window.closeModal = function (id) {
    const layer = document.querySelector('[x-data="modalLayer"]');
    if (layer) {
      const data = Alpine.$data(layer);
      if (data && data.close) data.close(id);
    }
  };

  // Hàm đăng ký component để các view gọi
  window.registerCrmComponent = function (name, factory) {
    if (typeof Alpine === 'undefined' || !Alpine.data) {
      setTimeout(() => window.registerCrmComponent(name, factory), 50);
      return;
    }
    // Tránh đăng ký trùng (Alpine sẽ throw)
    const reg = Alpine._crmRegistered = Alpine._crmRegistered || new Set();
    if (reg.has(name)) return;
    reg.add(name);
    try {
      Alpine.data(name, factory);
    } catch (e) {
      console.warn('Component register failed:', name, e);
    }
  };

  // Fallback Alpine.data cho các view scope có tham chiếu `loading` mà chưa khai báo component.
  // Tránh lỗi Alpine Expression Error khi view render trước khi component được register.
  const VIEW_SCOPES = [
    'adminDashboard', 'managerDashboard', 'leaderDashboard', 'saleWorkspace',
    'usersPage', 'leadsPage', 'mappingPage', 'distributionSettings',
    'leadAssign', 'sheetHub', 'homeView', 'profilePage'
  ];

  // Tập field mặc định đủ dùng cho mọi view (tránh crash nếu component chưa register)
  function defaultViewState() {
    return {
      // common
      loading: false, error: '', items: [], saving: false, refreshing: false,
      // dashboard
      metrics: { total: 0, today: 0, in_progress: 0, unassigned: 0, converted: 0, failed: 0, conversion_rate: 0, failure_rate: 0 },
      // leads
      leads: [], filteredLeads: () => [], search: '', filter: 'all',
      statusFilter: '', statusList: [], sortField: '', sortDir: 'asc',
      // users
      users: [], filteredUsers: () => [], roles: [],
      canCreate: false, currentUser: null, editingUser: null, userForm: {},
      // mapping
      mappings: [], newInternal: '', newAds: '',
      // settings
      whitelist: [], newDomain: '',
      // profile
      title: '', total: 0,
      currentPassword: '', newPassword: '', confirmPassword: '',
      // role helpers
      roleLabel: () => '', roleBadgeClass: () => '',
      // generic helpers
      refresh: () => {}, openCreate: () => {}, setFilter: () => {},
      fmt: window.fmt || { number: (n) => n || 0, escapeHtml: (s) => s || '' },
      auth: window.Alpine && Alpine.store ? Alpine.store('auth') : {}
    };
  }

  function ensureFallbackScope(name) {
    if (typeof Alpine === 'undefined' || !Alpine.data) {
      setTimeout(() => ensureFallbackScope(name), 50);
      return;
    }
    const reg = Alpine._crmRegistered = Alpine._crmRegistered || new Set();
    if (reg.has(name)) return;
    reg.add(name);
    Alpine.data(name, () => defaultViewState());
  }
  VIEW_SCOPES.forEach(ensureFallbackScope);

  // Expose globally để bootstrap.js có thể re-ensure sau khi render view mới
  window.ensureCrmFallbackScopes = function () {
    VIEW_SCOPES.forEach(ensureFallbackScope);
  };
})();
