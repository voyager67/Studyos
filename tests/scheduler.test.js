const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPlan, startOfWeek, addDays, toISODate, fromISODate, isValidDateString, minutesLabel, safeMinutes } = require('../app.js');

test('week starts on Monday', () => {
  assert.equal(startOfWeek('2026-10-25'), '2026-10-19'); // Sunday
  assert.equal(startOfWeek('2026-10-19'), '2026-10-19'); // Monday
  assert.equal(startOfWeek('2026-10-23'), '2026-10-19'); // Friday
});

test('date helpers work across month boundaries', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2027-01-01', -1), '2026-12-31');
  assert.equal(toISODate(fromISODate('2026-10-25')), '2026-10-25');
  assert.equal(isValidDateString('2026-10-25'), true);
  assert.equal(isValidDateString('2026-02-30'), false);
});

test('scheduler places urgent and earlier-deadline tasks first', () => {
  const tasks = [
    { id: 'later', title: 'Later', minutes: 60, priority: 'high', dueDate: '2026-10-28', status: 'todo', createdAt: '2' },
    { id: 'urgent', title: 'Urgent', minutes: 60, priority: 'low', dueDate: '2026-10-25', status: 'todo', createdAt: '1' },
    { id: 'mid', title: 'Mid', minutes: 45, priority: 'high', dueDate: '2026-10-26', status: 'todo', createdAt: '3' }
  ];
  const result = buildPlan(tasks, 120, '2026-10-25', 4);
  const byId = Object.fromEntries(result.tasks.map(t => [t.id, t]));
  assert.equal(byId.urgent.planDate, '2026-10-25');
  assert.equal(byId.mid.planDate, '2026-10-25');
  assert.equal(byId.later.planDate, '2026-10-26');
  assert.equal(result.scheduledCount, 3);
});

test('scheduler prefers a later realistic slot over overloading a full deadline day', () => {
  const tasks = [
    { id: 'first', title: 'First', minutes: 60, priority: 'high', dueDate: '2026-10-25', status: 'todo' },
    { id: 'second', title: 'Second', minutes: 60, priority: 'medium', dueDate: '2026-10-25', status: 'todo' },
    { id: 'third', title: 'Third', minutes: 45, priority: 'low', dueDate: '2026-10-25', status: 'todo' }
  ];
  const result = buildPlan(tasks, 120, '2026-10-25', 3);
  const byId = Object.fromEntries(result.tasks.map(t => [t.id, t]));
  assert.equal(byId.first.planDate, '2026-10-25');
  assert.equal(byId.second.planDate, '2026-10-25');
  assert.equal(byId.third.planDate, '2026-10-26');
});

test('scheduler does not drop tasks that exceed the daily budget', () => {
  const tasks = [{ id: 'big', title: 'Large task', minutes: 180, priority: 'high', dueDate: '2026-10-25', status: 'todo' }];
  const result = buildPlan(tasks, 60, '2026-10-25', 3);
  assert.equal(result.tasks.length, 1);
  assert.ok(result.tasks[0].planDate);
  assert.equal(result.plannedMinutes, 180);
});

test('completed tasks are retained and not rescheduled', () => {
  const tasks = [
    { id: 'done', title: 'Finished', minutes: 30, status: 'done', planDate: '2026-10-20' },
    { id: 'todo', title: 'Pending', minutes: 45, priority: 'medium', dueDate: '2026-10-27', status: 'todo' }
  ];
  const result = buildPlan(tasks, 90, '2026-10-25', 7);
  const done = result.tasks.find(t => t.id === 'done');
  const todo = result.tasks.find(t => t.id === 'todo');
  assert.equal(done.planDate, '2026-10-20');
  assert.equal(todo.planDate, '2026-10-25');
  assert.equal(result.scheduledCount, 1);
});

test('time helpers handle safe defaults and readable labels', () => {
  assert.equal(safeMinutes(-10, 45), 5);
  assert.equal(safeMinutes(9999, 45), 600);
  assert.equal(minutesLabel(45), '45m');
  assert.equal(minutesLabel(60), '1h');
  assert.equal(minutesLabel(95), '1h 35m');
});
