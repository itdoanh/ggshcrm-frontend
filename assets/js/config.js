/**
 * config.js - Cấu hình runtime cho frontend.
 * Có thể override API_BASE qua localStorage hoặc query string ?api=...
 */
(function () {
  'use strict';

  const saved = localStorage.getItem('crm.api_base');
  const fromQuery = new URLSearchParams(location.search).get('api');

  window.APP_CONFIG = {
    API_BASE: fromQuery || saved || '',
    POLL_INTERVAL_MS: 2000,
    POLL_BACKOFF_MAX: 30000,
    APP_NAME: 'CRM Apex',
    VERSION: '1.0.0',
    DEBUG: false
  };

  // Nếu có query ?api thì lưu lại
  if (fromQuery) {
    localStorage.setItem('crm.api_base', fromQuery);
  }

  // Roles & permissions
  window.APP_ROLES = {
    admin:   { label: 'Admin',     icon: 'shield',     home: 'admin' },
    manager: { label: 'Quản lý',   icon: 'users',      home: 'manager' },
    leader:  { label: 'Leader',    icon: 'user-check', home: 'leader' },
    sale:    { label: 'Sale',      icon: 'headphones', home: 'sale' }
  };

  // Định nghĩa menu cho từng role
  window.APP_MENU = {
    admin: [
      { group: 'Tổng quan', items: [
        { route: 'admin',     label: 'Dashboard',    icon: 'layout-dashboard' },
        { route: 'admin.leads', label: 'Tất cả Lead', icon: 'inbox' }
      ]},
      { group: 'Quản lý', items: [
        { route: 'admin.users',   label: 'Nhân sự',     icon: 'users' },
        { route: 'admin.mapping', label: 'Bảng ánh xạ', icon: 'shuffle' }
      ]},
      { group: 'Cá nhân', items: [
        { route: 'profile', label: 'Hồ sơ',         icon: 'user-circle' },
        { route: 'settings', label: 'Cài đặt',       icon: 'settings' }
      ]}
    ],
    manager: [
      { group: 'Công việc', items: [
        { route: 'manager',       label: 'Dashboard',     icon: 'layout-dashboard' },
        { route: 'manager.leads', label: 'Lead của tôi',  icon: 'inbox' },
        { route: 'manager.assign', label: 'Phân bổ Lead', icon: 'git-branch' }
      ]},
      { group: 'Đội nhóm', items: [
        { route: 'manager.leaders', label: 'Leader của tôi', icon: 'user-check' }
      ]},
      { group: 'Cá nhân', items: [
        { route: 'profile',  label: 'Hồ sơ',   icon: 'user-circle' }
      ]}
    ],
    leader: [
      { group: 'Công việc', items: [
        { route: 'leader',       label: 'Dashboard',     icon: 'layout-dashboard' },
        { route: 'leader.leads', label: 'Lead nhóm tôi', icon: 'inbox' },
        { route: 'leader.assign', label: 'Gán Sale',     icon: 'git-branch' }
      ]},
      { group: 'Đội nhóm', items: [
        { route: 'leader.sales', label: 'Sale của tôi',  icon: 'headphones' }
      ]},
      { group: 'Cá nhân', items: [
        { route: 'profile',  label: 'Hồ sơ',   icon: 'user-circle' }
      ]}
    ],
    sale: [
      { group: 'Làm việc', items: [
        { route: 'sale',         label: 'Workspace',     icon: 'headphones' },
        { route: 'sale.leads',   label: 'Danh sách',     icon: 'inbox' }
      ]},
      { group: 'Cá nhân', items: [
        { route: 'profile', label: 'Hồ sơ', icon: 'user-circle' }
      ]}
    ]
  };
})();
