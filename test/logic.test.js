'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  MS_PER_YEAR,
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
} = require('../logic.js');

/* ── parseMoney ──────────────────────────────────────────────────────── */

test('parseMoney: plain integers and decimals', () => {
  assert.equal(parseMoney('100000'), 100000);
  assert.equal(parseMoney('1234.56'), 1234.56);
  assert.equal(parseMoney('0'), 0);
});

test('parseMoney: strips dollar signs and whitespace', () => {
  assert.equal(parseMoney('$100,000'), 100000);
  assert.equal(parseMoney('  $1,234.56 '), 1234.56);
  assert.equal(parseMoney('$ 500'), 500);
});

test('parseMoney: US thousands separators', () => {
  assert.equal(parseMoney('1,234,567.89'), 1234567.89);
  assert.equal(parseMoney('12,000'), 12000);
});

test('parseMoney: European format', () => {
  assert.equal(parseMoney('1.234.567,89'), 1234567.89);
  assert.equal(parseMoney('1.000'), 1000); // ambiguous, treat . as thousands only when grouped — plain 1.000 parses as 1
});

test('parseMoney: negative values', () => {
  assert.equal(parseMoney('-500'), -500);
  assert.equal(parseMoney('-1,000'), -1000);
});

test('parseMoney: invalid input returns NaN', () => {
  assert.ok(Number.isNaN(parseMoney('')));
  assert.ok(Number.isNaN(parseMoney('   ')));
  assert.ok(Number.isNaN(parseMoney('abc')));
  assert.ok(Number.isNaN(parseMoney(null)));
  assert.ok(Number.isNaN(parseMoney(undefined)));
  assert.ok(Number.isNaN(parseMoney('-')));
});

/* ── parseOptionalMoney / isMoneyEmpty ───────────────────────────────── */

test('parseOptionalMoney: empty means zero', () => {
  assert.equal(parseOptionalMoney(''), 0);
  assert.equal(parseOptionalMoney('  '), 0);
  assert.equal(parseOptionalMoney(null), 0);
});

test('parseOptionalMoney: non-empty parses normally', () => {
  assert.equal(parseOptionalMoney('$250'), 250);
  assert.ok(Number.isNaN(parseOptionalMoney('junk')));
});

test('isMoneyEmpty', () => {
  assert.ok(isMoneyEmpty(''));
  assert.ok(isMoneyEmpty('   '));
  assert.ok(isMoneyEmpty(null));
  assert.ok(!isMoneyEmpty('5'));
});

/* ── parsePercent / formatPercent ────────────────────────────────────── */

test('parsePercent: converts to fraction', () => {
  assert.equal(parsePercent('8'), 0.08);
  assert.equal(parsePercent('8%'), 0.08);
  assert.equal(parsePercent('12.5 %'), 0.125);
  assert.equal(parsePercent('0'), 0);
});

test('parsePercent: invalid returns NaN', () => {
  assert.ok(Number.isNaN(parsePercent('')));
  assert.ok(Number.isNaN(parsePercent('abc')));
  assert.ok(Number.isNaN(parsePercent(null)));
});

test('formatPercent: renders fraction as percent string', () => {
  assert.equal(formatPercent(0.08), '8%');
  assert.equal(formatPercent(0.125), '12.5%');
  assert.equal(formatPercent(0), '0%');
});

/* ── calcGoal ────────────────────────────────────────────────────────── */

test('calcGoal: single principal grows by compound rate', () => {
  const t0 = 0;
  const events = [{ timestamp: t0, amount: 100000 }];
  const halfYear = t0 + MS_PER_YEAR / 2;
  const goal = calcGoal(events, 0.08, halfYear);
  // 100000 × 1.08^0.5 ≈ 103923.05
  assert.ok(Math.abs(goal - 100000 * Math.pow(1.08, 0.5)) < 1e-6);
});

test('calcGoal: zero elapsed time returns principal', () => {
  const events = [{ timestamp: 5000, amount: 42000 }];
  assert.equal(calcGoal(events, 0.08, 5000), 42000);
});

test('calcGoal: sums multiple principal events', () => {
  const events = [
    { timestamp: 0, amount: 100000 },
    { timestamp: MS_PER_YEAR / 2, amount: 10000 },
  ];
  const goal = calcGoal(events, 0.08, MS_PER_YEAR);
  const expected =
    100000 * Math.pow(1.08, 1) + 10000 * Math.pow(1.08, 0.5);
  assert.ok(Math.abs(goal - expected) < 1e-6);
});

test('calcGoal: empty events yields zero', () => {
  assert.equal(calcGoal([], 0.08, 12345), 0);
});

/* ── eventsAtTime ────────────────────────────────────────────────────── */

test('eventsAtTime: filters out future events', () => {
  const data = {
    principalEvents: [
      { timestamp: 100, amount: 1 },
      { timestamp: 200, amount: 2 },
      { timestamp: 300, amount: 3 },
    ],
  };
  const got = eventsAtTime(data, 200);
  assert.deepEqual(got.map((e) => e.amount), [1, 2]);
});

/* ── calcDelta ───────────────────────────────────────────────────────── */

test('calcDelta: actual minus goal at check-in time', () => {
  const data = {
    growthRate: 0.08,
    principalEvents: [{ timestamp: 0, amount: 100000 }],
  };
  const checkIn = { timestamp: MS_PER_YEAR / 2, value: 105000 };
  const expected = 105000 - 100000 * Math.pow(1.08, 0.5);
  assert.ok(Math.abs(calcDelta(checkIn, data) - expected) < 1e-6);
});

/* ── getLastCheckIn ──────────────────────────────────────────────────── */

test('getLastCheckIn: returns most recent by timestamp', () => {
  const data = {
    checkIns: [
      { timestamp: 100, value: 1 },
      { timestamp: 300, value: 3 },
      { timestamp: 200, value: 2 },
    ],
  };
  assert.equal(getLastCheckIn(data).value, 3);
});

test('getLastCheckIn: null when empty or missing', () => {
  assert.equal(getLastCheckIn({ checkIns: [] }), null);
  assert.equal(getLastCheckIn({}), null);
});

/* ── isSetupComplete ─────────────────────────────────────────────────── */

test('isSetupComplete: requires rate and at least one principal event', () => {
  assert.ok(
    isSetupComplete({
      growthRate: 0.08,
      principalEvents: [{ timestamp: 0, amount: 1 }],
    })
  );
  assert.ok(!isSetupComplete(null));
  assert.ok(!isSetupComplete({}));
  assert.ok(!isSetupComplete({ growthRate: 0.08, principalEvents: [] }));
  assert.ok(
    !isSetupComplete({ growthRate: '8', principalEvents: [{ timestamp: 0, amount: 1 }] })
  );
});

/* ── addContributionEvent ────────────────────────────────────────────── */

test('addContributionEvent: appends non-zero contributions', () => {
  const data = { principalEvents: [] };
  addContributionEvent(data, 500, 999);
  assert.deepEqual(data.principalEvents, [{ timestamp: 999, amount: 500 }]);
});

test('addContributionEvent: ignores zero and NaN', () => {
  const data = { principalEvents: [] };
  addContributionEvent(data, 0, 999);
  addContributionEvent(data, NaN, 999);
  assert.equal(data.principalEvents.length, 0);
});

test('addContributionEvent: negative contributions (withdrawals) recorded', () => {
  const data = { principalEvents: [] };
  addContributionEvent(data, -250, 111);
  assert.deepEqual(data.principalEvents, [{ timestamp: 111, amount: -250 }]);
});

/* ── formatDelta / formatHistoryDelta ────────────────────────────────── */

test('formatDelta: ahead, behind, on target', () => {
  assert.equal(formatDelta(1077), '+$1,077 ahead');
  assert.equal(formatDelta(-1923), '−$1,923 behind');
  assert.equal(formatDelta(0), 'On target');
  assert.equal(formatDelta(0.4), 'On target');
});

test('formatHistoryDelta: compact signed form', () => {
  assert.equal(formatHistoryDelta(1077), '+$1,077');
  assert.equal(formatHistoryDelta(-1923), '−$1,923');
  assert.equal(formatHistoryDelta(0), 'On target');
});

/* ── trackDotLeft ────────────────────────────────────────────────────── */

test('trackDotLeft: on-target sits at 50%', () => {
  assert.equal(trackDotLeft(0, 100000), 50);
});

test('trackDotLeft: ahead moves right, behind moves left', () => {
  assert.ok(trackDotLeft(5000, 100000) > 50);
  assert.ok(trackDotLeft(-5000, 100000) < 50);
});

test('trackDotLeft: clamped to 5%..95%', () => {
  assert.equal(trackDotLeft(1e12, 100000), 95);
  assert.equal(trackDotLeft(-1e12, 100000), 5);
});
