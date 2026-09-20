/**
 * icons.js - Lucide icons helper.
 * Sau khi DOM có <i data-lucide="icon-name">...</i>, gọi renderIcons() để thay thành SVG.
 */
(function () {
  'use strict';

  function renderIcons(scope) {
    scope = scope || document;
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try {
        window.lucide.createIcons({ nameAttr: 'data-lucide', attrs: {} });
      } catch (e) {
        // ignore
      }
    }
  }

  function icon(name, opts) {
    // Trả về HTML <i data-lucide="name"> cho renderIcons xử lý sau
    opts = opts || {};
    const cls = opts.class ? ` class="${opts.class}"` : '';
    return `<i data-lucide="${name}"${cls}></i>`;
  }

  window.ic = { render: renderIcons, html: icon };
})();
