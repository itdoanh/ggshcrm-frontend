/**
 * router.js - Hash router cho SPA. Hỗ trợ nested route (parent.child).
 */
(function () {
  'use strict';

  let routes = {};
  let currentRoute = null;

  function define(name, def) {
    routes[name] = def;
  }

  function defineMany(defs) {
    Object.assign(routes, defs);
  }

  function parse(hash) {
    let h = (hash || '').replace(/^#\/?/, '').replace(/\?.*$/, '');
    const params = {};
    const qIdx = (hash || '').indexOf('?');
    if (qIdx >= 0) {
      const q = (hash || '').slice(qIdx + 1);
      q.split('&').forEach(kv => {
        if (!kv) return;
        const [k, v] = kv.split('=');
        params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    return { name: h || 'home', params };
  }

  function navigate(name, params) {
    let h = '#/' + name;
    if (params && Object.keys(params).length) {
      const qs = Object.keys(params)
        .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
        .join('&');
      if (qs) h += '?' + qs;
    }
    if (location.hash === h) {
      // Force re-exec
      exec();
    } else {
      location.hash = h;
    }
  }

  function getCurrent() {
    return parse(location.hash);
  }

  function resolve(name) {
    if (routes[name]) return routes[name];
    // fallback: tìm theo prefix
    const parts = name.split('.');
    let cur = name;
    while (cur) {
      if (routes[cur]) return routes[cur];
      const lastDot = cur.lastIndexOf('.');
      if (lastDot < 0) break;
      cur = cur.slice(0, lastDot);
    }
    return null;
  }

  function exec() {
    const r = parse(location.hash);
    currentRoute = r;
    const def = resolve(r.name) || resolve('not_found');
    if (def && typeof def.render === 'function') {
      try {
        def.render(r.params);
      } catch (e) {
        console.error('Router render error:', e);
      }
    }
    // Dispatch event để các view khác lắng nghe
    window.dispatchEvent(new CustomEvent('crm:route', { detail: r }));
  }

  document.addEventListener('alpine:init', () => {
    Alpine.store('router', {
      current: () => currentRoute,
      navigate,
      routes
    });
    window.addEventListener('hashchange', exec);
  });

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(exec, 50);
  });

  window.router = { define, defineMany, navigate, getCurrent, exec, resolve };
})();
