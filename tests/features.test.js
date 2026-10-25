const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateReview,
  calculateWeightedGrade,
  requiredScore,
  splitTask,
  scheduleWithCapacity,
  minutesFromTimes
} = require('../features.js');

const fixedIds = (() => { let i = 0; return prefix => `${prefix}_${++i}`; })();

test('spaced repetition ratings produce valid future intervals', () => {
  const initial = { interval: 0, ease: 2.5, repetitions: 0, reviewCount: 0, reviewHistory: [] };
  const again = calculateReview(initial, 'again', '2026-10-25');
  assert.equal(again.interval, 1);
  assert.equal(again.dueDate, '2026-10-26');
  assert.equal(again.repetitions, 0);
  assert.equal(again.reviewCount, 1);

  const easy = calculateReview(initial, 'easy', '2026-10-25');
  assert.equal(easy.interval, 4);
  assert.equal(easy.dueDate, '2026-10-29');
  assert.equal(easy.repetitions, 1);
  assert.ok(easy.ease > initial.ease);
});

test('weighted grade calculator ignores ungraded items and computes weighted contribution', () => {
  const result = calculateWeightedGrade([
    { score: 45, maxScore: 50, weight: 30 },
    { score: 80, maxScore: 100, weight: 20 },
    { score: null, maxScore: 100, weight: 50 }
  ]);
  assert.equal(result.average, 86);
  assert.equal(result.weight, 50);
  assert.equal(result.gradedCount, 2);
  assert.equal(result.contribution, 43);
  assert.deepEqual(calculateWeightedGrade([{ score: null, maxScore: 100, weight: 50 }]), { average: null, weight: 0, gradedCount: 0, contribution: 0 });
});

test('required score reports achievable and impossible targets correctly', () => {
  const graded = [{ score: 90, maxScore: 100, weight: 30 }];
  const possible = requiredScore(graded, 80, 70);
  assert.equal(possible.needed, 75.71);
  assert.equal(possible.possible, true);
  assert.equal(possible.alreadyReached, false);

  const impossible = requiredScore([{ score: 60, maxScore: 100, weight: 80 }], 95, 20);
  assert.equal(impossible.needed, 235);
  assert.equal(impossible.possible, false);
  assert.equal(impossible.impossible, true);
});

test('task splitting preserves total workload, parent relationship, and completed tasks', () => {
  const original = { id: 'task_1', title: 'Revise optics', minutes: 125, status: 'todo', dueDate: '2026-11-01', priority: 'high' };
  const parts = splitTask(original, 50, fixedIds);
  assert.deepEqual(parts.map(p => p.minutes), [50, 50, 25]);
  assert.equal(parts.reduce((sum, p) => sum + p.minutes, 0), 125);
  assert.ok(parts.every(p => p.parentTaskId === 'task_1'));
  assert.ok(parts.every(p => p.status === 'todo' && p.planDate === ''));
  assert.equal(original.title, 'Revise optics'); // pure helper must not mutate source

  const done = { ...original, status: 'done', planDate: '2026-10-25' };
  assert.deepEqual(splitTask(done, 50, fixedIds), [done]);
});

test('capacity-aware scheduling never exceeds available capacity and retains unscheduled tasks', () => {
  const tasks = [
    { id: 'a', title: 'One', minutes: 50, priority: 'high', dueDate: '2026-10-26', status: 'todo' },
    { id: 'b', title: 'Two', minutes: 45, priority: 'medium', dueDate: '2026-10-27', status: 'todo' },
    { id: 'c', title: 'Big', minutes: 135, priority: 'low', dueDate: '2026-10-28', status: 'todo' },
    { id: 'done', title: 'Already done', minutes: 20, status: 'done', planDate: '2026-10-25' }
  ];
  const result = scheduleWithCapacity(tasks, {
    todayDate: '2026-10-25', horizon: 4, dailyBudget: 100, focusBlockMinutes: 50,
    capacityForDate: day => day === '2026-10-26' ? 50 : 100,
    makeId: fixedIds
  });
  for (const [day, load] of Object.entries(result.load)) assert.ok(load <= result.capacity[day]);
  assert.equal(result.tasks.find(t => t.id === 'done').planDate, '2026-10-25');
  assert.equal(result.tasks.filter(t => t.parentTaskId === 'c').reduce((sum, t) => sum + t.minutes, 0), 135);
  assert.ok(result.scheduledCount > 0);
  assert.ok(result.tasks.length >= 4);
});

test('time-block duration handles full and partial hours safely', () => {
  assert.equal(minutesFromTimes('09:00', '10:30'), 90);
  assert.equal(minutesFromTimes('13:15', '14:00'), 45);
  assert.equal(minutesFromTimes('10:00', '09:00'), 0);
});
