/**
 * polling.js - Polling thông minh với exponential backoff.
 */
(function () {
  'use strict';

  class Poller {
    constructor(fn, opts) {
      this.fn = fn;
      this.interval = (opts && opts.interval) || 2000;
      this.maxInterval = (opts && opts.maxInterval) || 30000;
      this.curInterval = this.interval;
      this.running = false;
      this.timer = null;
      this.onError = (opts && opts.onError) || function () {};
      this.onSuccess = (opts && opts.onSuccess) || function () {};
      this.immediate = (opts && opts.immediate !== false);
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.curInterval = this.interval;
      if (this.immediate) this._tick();
      else this._scheduleNext();
    }

    stop() {
      this.running = false;
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    }

    _scheduleNext() {
      if (!this.running) return;
      this.timer = setTimeout(() => this._tick(), this.curInterval);
    }

    async _tick() {
      if (!this.running) return;
      try {
        await this.fn();
        this.curInterval = this.interval; // reset
        this.onSuccess();
      } catch (err) {
        this.onError(err);
        // Exponential backoff: 2s -> 4s -> 8s -> 16s -> 30s
        this.curInterval = Math.min(this.maxInterval, this.curInterval * 2);
      }
      this._scheduleNext();
    }
  }

  window.Poller = Poller;
})();
