/**
 * formatters.js - Format date/phone/status.
 */
(function () {
  'use strict';

  const pad = (n) => String(n).padStart(2, '0');

  function formatDateTime(input, opts) {
    if (!input) return '';
    const d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return String(input);
    opts = opts || {};
    if (opts.relative) return formatRelative(d);
    const dd = pad(d.getDate());
    const mm = pad(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    if (opts.dateOnly) return `${dd}/${mm}/${yyyy}`;
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  }

  function formatRelative(input) {
    const d = input instanceof Date ? input : new Date(input);
    const diff = Date.now() - d.getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 5) return 'vừa xong';
    if (sec < 60) return sec + ' giây trước';
    const min = Math.floor(sec / 60);
    if (min < 60) return min + ' phút trước';
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + ' giờ trước';
    const day = Math.floor(hr / 24);
    if (day < 7) return day + ' ngày trước';
    return formatDateTime(d, { dateOnly: true });
  }

  function formatPhone(phone) {
    if (!phone) return '';
    const s = String(phone).replace(/[^0-9+]/g, '');
    if (s.length === 10 && s.startsWith('0')) {
      return s.slice(0, 4) + ' ' + s.slice(4, 7) + ' ' + s.slice(7);
    }
    return s;
  }

  function formatNumber(n, opts) {
    if (n === null || n === undefined || isNaN(n)) return '0';
    opts = opts || {};
    if (opts.percent) {
      return (Number(n)).toFixed(opts.digits || 1) + '%';
    }
    if (opts.compact) {
      if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
      if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
      if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    }
    return Number(n).toLocaleString('vi-VN');
  }

  function initials(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function groupStatus(status, groups) {
    if (!groups) return 'Khác';
    for (const g in groups) {
      if (groups[g].indexOf(status) >= 0) return g;
    }
    return 'Khác';
  }

  function statusToVietnamese(status) {
    return status || '—';
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Export
  window.fmt = {
    dateTime: formatDateTime,
    date: (d) => formatDateTime(d, { dateOnly: true }),
    relative: formatRelative,
    phone: formatPhone,
    number: formatNumber,
    initials,
    groupStatus,
    statusToVietnamese,
    escapeHtml
  };
})();
