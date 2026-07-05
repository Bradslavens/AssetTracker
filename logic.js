/* Pure logic for the net worth tracker — no DOM, no storage.
   Loaded as a plain script in the browser (exposes window.NetWorth)
   and as a CommonJS module under Node for tests. */
(function (root) {
  'use strict';

  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

  const usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  /* ── Input parsing ─────────────────────────────────────────────────── */

  function parseMoney(str) {
    if (str == null || String(str).trim() === '') return NaN;
    const cleaned = String(str)
      .trim()
      .replace(/\$/g, '')
      .replace(/ /g, ' ')
      .replace(/\s/g, '');

    if (cleaned === '' || cleaned === '-') return NaN;

    /* US-style 1,234,567.89 — commas are thousands separators */
    if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
      const n = parseFloat(cleaned.replace(/,/g, ''));
      return isNaN(n) ? NaN : n;
    }

    /* 1.234.567,89 — periods thousands, comma decimal */
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
      const n = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
      return isNaN(n) ? NaN : n;
    }

    /* Plain number, optional single decimal separator */
    const normalized = cleaned.replace(/,/g, '');
    const n = parseFloat(normalized);
    return isNaN(n) ? NaN : n;
  }

  function parseOptionalMoney(str) {
    if (str == null || String(str).trim() === '') return 0;
    return parseMoney(str);
  }

  function isMoneyEmpty(str) {
    return str == null || String(str).trim() === '';
  }

  function parsePercent(str) {
    if (str == null || String(str).trim() === '') return NaN;
    const cleaned = String(str).replace(/[%\s,]/g, '');
    const n = parseFloat(cleaned);
    if (isNaN(n)) return NaN;
    return n / 100;
  }

  function formatPercent(rate) {
    return (rate * 100).toFixed(1).replace(/\.0$/, '') + '%';
  }

  /* ── Goal math ─────────────────────────────────────────────────────── */

  /* Goal = Σ amount × (1 + rate)^elapsedYears for each principal event */
  function calcGoal(principalEvents, rate, atTimestamp) {
    return principalEvents.reduce((sum, ev) => {
      const years = (atTimestamp - ev.timestamp) / MS_PER_YEAR;
      return sum + ev.amount * Math.pow(1 + rate, years);
    }, 0);
  }

  function eventsAtTime(data, timestamp) {
    return data.principalEvents.filter((e) => e.timestamp <= timestamp);
  }

  function calcDelta(checkIn, data) {
    const goal = calcGoal(
      eventsAtTime(data, checkIn.timestamp),
      data.growthRate,
      checkIn.timestamp
    );
    return checkIn.value - goal;
  }

  /* ── Data helpers ──────────────────────────────────────────────────── */

  function getLastCheckIn(data) {
    if (!data.checkIns || !data.checkIns.length) return null;
    return data.checkIns.reduce((latest, ci) =>
      ci.timestamp > latest.timestamp ? ci : latest
    );
  }

  function isSetupComplete(data) {
    return !!(
      data &&
      typeof data.growthRate === 'number' &&
      Array.isArray(data.principalEvents) &&
      data.principalEvents.length > 0
    );
  }

  function addContributionEvent(data, amount, timestamp) {
    if (amount !== 0 && !isNaN(amount)) {
      data.principalEvents.push({ timestamp, amount });
    }
  }

  /* ── Formatting ────────────────────────────────────────────────────── */

  function formatDelta(delta) {
    const abs = Math.abs(Math.round(delta));
    if (abs < 1) return 'On target';
    const formatted = usd.format(abs);
    if (delta > 0) return '+' + formatted + ' ahead';
    return '−' + formatted + ' behind';
  }

  function formatHistoryDelta(delta) {
    const abs = Math.abs(Math.round(delta));
    if (abs < 1) return 'On target';
    const formatted = usd.format(abs);
    if (delta > 0) return '+' + formatted;
    return '−' + formatted;
  }

  /* Track dot position: 50% is on-target; clamp to 5%..95% */
  function trackDotLeft(delta, goal) {
    const span = Math.max(Math.abs(delta), goal * 0.05, 1000);
    const offset = Math.max(-0.45, Math.min(0.45, (delta / span) * 0.45));
    return 50 + offset * 100;
  }

  const api = {
    MS_PER_YEAR,
    usd,
    parseMoney,
    parseOptionalMoney,
    isMoneyEmpty,
    parsePercent,
    formatPercent,
    calcGoal,
    eventsAtTime,
    calcDelta,
    getLastCheckIn,
    isSetupComplete,
    addContributionEvent,
    formatDelta,
    formatHistoryDelta,
    trackDotLeft,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.NetWorth = api;
  }
})(typeof self !== 'undefined' ? self : this);
