/**
 * toast.js - Hệ thống thông báo toast (4 góc, auto-dismiss).
 */
(function () {
  'use strict';

  const variants = {
    success: { icon: 'check-circle', title: 'Thành công' },
    error:   { icon: 'alert-circle', title: 'Lỗi' },
    warning: { icon: 'alert-triangle', title: 'Cảnh báo' },
    info:    { icon: 'info', title: 'Thông tin' }
  };

  function ensureContainer() {
    let c = document.querySelector('.toast-container');
    if (!c) {
      c = document.createElement('div');
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  function show(options) {
    options = options || {};
    const variant = options.variant || 'info';
    const v = variants[variant] || variants.info;
    const title = options.title || v.title;
    const message = options.message || '';
    const duration = options.duration || 4000;

    const c = ensureContainer();
    const el = document.createElement('div');
    el.className = 'toast toast-' + variant + ' toast-enter';
    el.innerHTML = `
      <i data-lucide="${v.icon}" class="toast-icon"></i>
      <div class="toast-content">
        <div class="toast-title">${fmt.escapeHtml(title)}</div>
        ${message ? `<div class="toast-message">${fmt.escapeHtml(message)}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Đóng">
        <i data-lucide="x" style="width:14px;height:14px;"></i>
      </button>
    `;

    const close = () => {
      el.classList.remove('toast-enter');
      el.classList.add('toast-leave');
      setTimeout(() => el.remove(), 250);
    };

    el.querySelector('.toast-close').addEventListener('click', close);
    if (duration > 0) {
      setTimeout(close, duration);
    }

    c.appendChild(el);
    if (window.ic) window.ic.render(el);

    return { close };
  }

  window.toast = {
    show,
    success: (msg, opts) => show(Object.assign({ variant: 'success', message: msg }, opts || {})),
    error:   (msg, opts) => show(Object.assign({ variant: 'error', message: msg }, opts || {})),
    warning: (msg, opts) => show(Object.assign({ variant: 'warning', message: msg }, opts || {})),
    info:    (msg, opts) => show(Object.assign({ variant: 'info', message: msg }, opts || {}))
  };
})();
