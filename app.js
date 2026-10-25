/* StudyOS Complete Edition — a privacy-first, local study workspace. No ad tech, accounts, or remote APIs. */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'studyos.workspace.v1';
  const COLORS = ['#7665df', '#2da887', '#e6a04f', '#4e8fe5', '#e06f80', '#7f91a8', '#b16acb'];
  const COLOR_PALETTES = {
    '#7665df': { bg: '#eeebff', text: '#6654ca' }, '#2da887': { bg: '#e5f7f0', text: '#248b70' },
    '#e6a04f': { bg: '#fff2df', text: '#b67a2e' }, '#4e8fe5': { bg: '#eaf2ff', text: '#4079c2' },
    '#e06f80': { bg: '#ffedf0', text: '#bd5364' }, '#7f91a8': { bg: '#eef1f5', text: '#687990' },
    '#b16acb': { bg: '#f6eafa', text: '#9958b3' }
  };
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

  function pad(n) { return String(n).padStart(2, '0'); }
  function toISODate(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
  function fromISODate(value) {
    const parts = String(value || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return new Date();
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  }
  function addDays(value, amount) { const d = typeof value === 'string' ? fromISODate(value) : new Date(value); d.setDate(d.getDate() + amount); return toISODate(d); }
  function startOfWeek(value) { const d = typeof value === 'string' ? fromISODate(value) : new Date(value); d.setHours(12, 0, 0, 0); const shift = (d.getDay() + 6) % 7; d.setDate(d.getDate() - shift); return toISODate(d); }
  function shortDay(value) { return fromISODate(value).toLocaleDateString(undefined, { weekday: 'short' }); }
  function shortDate(value) { return fromISODate(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  function longDate(value) { return fromISODate(value).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }); }
  function dateRange(startValue, count) { return Array.from({ length: count }, (_, i) => addDays(startValue, i)); }
  function safeMinutes(value, fallback = 45) { const n = Number(value); return Number.isFinite(n) ? Math.max(5, Math.min(600, Math.round(n))) : fallback; }
  function uid(prefix = 'id') { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  function minutesLabel(mins) { const n = Math.max(0, Math.round(Number(mins) || 0)); if (n < 60) return `${n}m`; const h = Math.floor(n / 60), rem = n % 60; return rem ? `${h}h ${rem}m` : `${h}h`; }
  function relativeDue(value, today) {
    if (!value) return 'No deadline';
    if (value === today) return 'Due today';
    const delta = Math.round((fromISODate(value) - fromISODate(today)) / 86400000);
    if (delta === 1) return 'Due tomorrow';
    if (delta < 0) return `${Math.abs(delta)}d overdue`;
    return `Due ${shortDate(value)}`;
  }
  function isValidDateString(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && !Number.isNaN(fromISODate(value).getTime()) && toISODate(fromISODate(value)) === value; }
  function compareTasks(a, b) {
    const ad = a.dueDate || '9999-12-31', bd = b.dueDate || '9999-12-31';
    if (ad !== bd) return ad.localeCompare(bd);
    const p = (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
    if (p) return p;
    return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
  }
  /** Pure, deterministic rule-based scheduler. Returns updated copies, never mutates inputs. */
  function buildPlan(tasks, dailyBudget, today, horizon = 7) {
    const budget = Math.max(30, Math.min(600, Math.round(Number(dailyBudget) || 180)));
    const days = dateRange(today, Math.max(1, Math.min(30, horizon)));
    const load = Object.fromEntries(days.map(day => [day, 0]));
    const pending = (tasks || []).filter(t => t.status !== 'done').map(t => ({ ...t })).sort(compareTasks);
    const scheduled = [];
    pending.forEach(task => {
      const mins = safeMinutes(task.minutes, 45);
      let deadlineWindow = days;
      if (task.dueDate && task.dueDate >= today) {
        const beforeDue = days.filter(day => day <= task.dueDate);
        if (beforeDue.length) deadlineWindow = beforeDue;
      }
      let chosen = deadlineWindow.find(day => load[day] + mins <= budget);
      // If no slot fits before the deadline, do not overload a day blindly: find
      // the next available day in the full planning horizon and let the user
      // see/review the resulting deadline trade-off.
      if (!chosen) chosen = days.find(day => load[day] + mins <= budget);
      if (!chosen) chosen = days.reduce((lightest, day) => load[day] < load[lightest] ? day : lightest, days[0]);
      // Tasks larger than the daily budget still get a slot; the plan never silently drops them.
      load[chosen] = (load[chosen] || 0) + mins;
      task.planDate = chosen;
      scheduled.push(task);
    });
    const ids = new Set(scheduled.map(t => t.id));
    const finished = (tasks || []).filter(t => t.status === 'done').map(t => ({ ...t }));
    return { tasks: [...finished, ...scheduled], load, scheduledCount: scheduled.length, plannedMinutes: scheduled.reduce((sum, t) => sum + safeMinutes(t.minutes, 45), 0), pendingIds: ids };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { buildPlan, compareTasks, startOfWeek, addDays, toISODate, fromISODate, isValidDateString, minutesLabel, safeMinutes };
  if (!root.document) return;

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const todayISO = () => toISODate(new Date());
  const seededWorkspace = () => {
    const today = todayISO();
    const subjects = [
      { id: 'sub_math', name: 'Engineering Mathematics', color: COLORS[0], examDate: addDays(today, 23), topics: [{ id: uid('top'), name: 'Matrices and determinants', status: 'done' }, { id: uid('top'), name: 'Differential equations', status: 'in-progress' }, { id: uid('top'), name: 'Laplace transforms', status: 'not-started' }, { id: uid('top'), name: 'Probability distributions', status: 'not-started' }] },
      { id: 'sub_physics', name: 'Applied Physics', color: COLORS[1], examDate: addDays(today, 27), topics: [{ id: uid('top'), name: 'Interference and diffraction', status: 'in-progress' }, { id: uid('top'), name: 'Semiconductors', status: 'not-started' }, { id: uid('top'), name: 'Optical fibres', status: 'not-started' }] },
      { id: 'sub_programming', name: 'Programming Fundamentals', color: COLORS[3], examDate: addDays(today, 19), topics: [{ id: uid('top'), name: 'Functions and recursion', status: 'done' }, { id: uid('top'), name: 'Arrays and strings', status: 'done' }, { id: uid('top'), name: 'Pointers and memory', status: 'in-progress' }] },
      { id: 'sub_chem', name: 'Applied Chemistry', color: COLORS[2], examDate: addDays(today, 30), topics: [{ id: uid('top'), name: 'Green chemistry', status: 'not-started' }, { id: uid('top'), name: 'Polymers', status: 'not-started' }, { id: uid('top'), name: 'Water technology', status: 'not-started' }] }
    ];
    const tasks = [
      { id: 'task_matrix', title: 'Practice matrix problems', subjectId: 'sub_math', planDate: today, dueDate: today, minutes: 45, priority: 'high', status: 'todo', actualMinutes: 0, notes: '', createdAt: `${today}T08:00:00`, completedAt: null },
      { id: 'task_physics', title: 'Revise interference notes', subjectId: 'sub_physics', planDate: today, dueDate: addDays(today, 1), minutes: 35, priority: 'medium', status: 'todo', actualMinutes: 0, notes: '', createdAt: `${today}T08:05:00`, completedAt: null },
      { id: 'task_code', title: 'Solve recursion exercises', subjectId: 'sub_programming', planDate: today, dueDate: addDays(today, 2), minutes: 40, priority: 'high', status: 'todo', actualMinutes: 0, notes: '', createdAt: `${today}T08:10:00`, completedAt: null },
      { id: 'task_chem', title: 'Create a green chemistry summary', subjectId: 'sub_chem', planDate: addDays(today, 1), dueDate: addDays(today, 5), minutes: 50, priority: 'low', status: 'todo', actualMinutes: 0, notes: '', createdAt: `${today}T08:15:00`, completedAt: null },
      { id: 'task_laplace', title: 'Watch Laplace transform lecture', subjectId: 'sub_math', planDate: addDays(today, 2), dueDate: addDays(today, 4), minutes: 45, priority: 'medium', status: 'todo', actualMinutes: 0, notes: '', createdAt: `${today}T08:20:00`, completedAt: null },
      { id: 'task_done', title: 'Review arrays and strings', subjectId: 'sub_programming', planDate: today, dueDate: today, minutes: 30, priority: 'low', status: 'done', actualMinutes: 30, notes: '', createdAt: `${today}T07:30:00`, completedAt: `${today}T08:45:00` },
      { id: 'task_optics', title: 'Make an optics formula sheet', subjectId: 'sub_physics', planDate: '', dueDate: addDays(today, 6), minutes: 40, priority: 'medium', status: 'todo', actualMinutes: 0, notes: '', createdAt: `${today}T08:25:00`, completedAt: null }
    ];
    const focusLogs = [];
    [35, 50, 25, 65, 40, 30, 30].forEach((mins, index) => {
      if (index < 6) focusLogs.push({ id: uid('focus'), date: addDays(today, index - 6), taskId: null, subjectId: subjects[index % subjects.length].id, minutes: mins, kind: 'sample' });
    });
    focusLogs.push({ id: uid('focus'), date: today, taskId: 'task_done', subjectId: 'sub_programming', minutes: 30, kind: 'sample' });
    return { version: 1, subjects, tasks, focusLogs, preferences: { dailyBudget: 180, weeklyGoal: 12, focusDuration: 25 }, firstRun: true };
  };

  function normalizeWorkspace(data) {
    const fallback = { version: 1, subjects: [], tasks: [], focusLogs: [], preferences: { dailyBudget: 180, weeklyGoal: 12, focusDuration: 25 }, firstRun: false };
    if (!data || typeof data !== 'object' || !Array.isArray(data.subjects) || !Array.isArray(data.tasks)) return fallback;
    const subjects = data.subjects.filter(s => s && typeof s.name === 'string').map(s => ({ id: String(s.id || uid('sub')), name: s.name.slice(0, 100), color: COLORS.includes(s.color) ? s.color : COLORS[0], examDate: isValidDateString(s.examDate) ? s.examDate : '', topics: (Array.isArray(s.topics) ? s.topics : []).filter(t => t && typeof t.name === 'string').map(t => ({ id: String(t.id || uid('top')), name: t.name.slice(0, 160), status: ['not-started', 'in-progress', 'done'].includes(t.status) ? t.status : 'not-started' })) }));
    const subjectIds = new Set(subjects.map(s => s.id));
    const tasks = data.tasks.filter(t => t && typeof t.title === 'string' && t.title.trim()).map(t => ({ id: String(t.id || uid('task')), title: t.title.trim().slice(0, 160), subjectId: subjectIds.has(t.subjectId) ? t.subjectId : '', planDate: isValidDateString(t.planDate) ? t.planDate : '', dueDate: isValidDateString(t.dueDate) ? t.dueDate : '', minutes: safeMinutes(t.minutes, 45), priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium', status: ['todo', 'done'].includes(t.status) ? t.status : 'todo', actualMinutes: Math.max(0, Number(t.actualMinutes) || 0), notes: String(t.notes || '').slice(0, 1200), createdAt: String(t.createdAt || new Date().toISOString()), completedAt: t.completedAt ? String(t.completedAt) : null }));
    const focusLogs = (Array.isArray(data.focusLogs) ? data.focusLogs : []).filter(f => f && isValidDateString(f.date)).map(f => ({ id: String(f.id || uid('focus')), date: f.date, taskId: f.taskId ? String(f.taskId) : null, subjectId: subjectIds.has(f.subjectId) ? f.subjectId : '', minutes: Math.max(1, Math.min(600, Number(f.minutes) || 1)), kind: String(f.kind || 'focus') }));
    const pref = data.preferences || {};
    return { version: 1, subjects, tasks, focusLogs, preferences: { dailyBudget: Math.max(30, Math.min(600, Number(pref.dailyBudget) || 180)), weeklyGoal: Math.max(1, Math.min(80, Number(pref.weeklyGoal) || 12)), focusDuration: [15, 25, 35, 45, 50].includes(Number(pref.focusDuration)) ? Number(pref.focusDuration) : 25 }, firstRun: Boolean(data.firstRun) };
  }

  let state;
  let storedWorkspace = null;
  try { storedWorkspace = localStorage.getItem(STORAGE_KEY); } catch (_) { /* Continue in memory if browser storage is unavailable. */ }
  if (storedWorkspace) {
    try { state = normalizeWorkspace(JSON.parse(storedWorkspace)); }
    catch (_) { state = seededWorkspace(); }
  } else {
    state = seededWorkspace();
  }
  let activeView = 'today';
  let selectedDate = todayISO();
  let plannerWeekOffset = 0;
  let chosenColor = COLORS[0];
  let editingSubjectId = null;
  let modalFocusReturn = null;
  let focusTaskId = null;
  let timerInterval = null;
  let timerRunning = false;
  let timerRemaining = 25 * 60;
  let timerDeadline = null;
  let timerTotal = 25 * 60;
  let currentSettingsSection = 'planning';

  function save(markCustom = true) { if (markCustom && state.firstRun) state.firstRun = false; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { toast('Could not save: browser storage may be blocked or full.', 'error'); } }
  function subjectFor(id) { return state.subjects.find(s => s.id === id); }
  function taskFor(id) { return state.tasks.find(t => t.id === id); }
  function subjectTopicProgress(subject) { const topics = subject.topics || []; const done = topics.filter(t => t.status === 'done').length; return { done, total: topics.length, percent: topics.length ? Math.round(done / topics.length * 100) : 0 }; }
  function subjectTaskProgress(id) { const tasks = state.tasks.filter(t => t.subjectId === id); const done = tasks.filter(t => t.status === 'done').length; return { done, total: tasks.length, percent: tasks.length ? Math.round(done / tasks.length * 100) : 0 }; }
  function totalTopicProgress() { const all = state.subjects.flatMap(s => s.topics || []); return { done: all.filter(t => t.status === 'done').length, total: all.length, percent: all.length ? Math.round(all.filter(t => t.status === 'done').length / all.length * 100) : 0 }; }
  function weekDates() { return dateRange(addDays(startOfWeek(todayISO()), plannerWeekOffset * 7), 7); }
  function weekFocusLogs(dates = dateRange(addDays(todayISO(), -6), 7)) { const set = new Set(dates); return dates.map(date => ({ date, minutes: state.focusLogs.filter(log => log.date === date).reduce((sum, log) => sum + log.minutes, 0) })); }
  function taskSubjectTag(task) { const subject = subjectFor(task.subjectId); if (!subject) return `<span class="subject-tag" style="background:#f0f1f6;color:#7f8497">General</span>`; const pal = COLOR_PALETTES[subject.color] || COLOR_PALETTES[COLORS[0]]; return `<span class="subject-tag" style="background:${pal.bg};color:${pal.text}"><i style="background:${subject.color}"></i>${escapeHtml(subject.name)}</span>`; }
  function priorityText(priority) { return ({ high: 'High priority', medium: 'Medium priority', low: 'Low priority' })[priority] || 'Medium priority'; }
  function toast(message, kind = '') {
    const node = document.createElement('div'); node.className = `toast ${kind}`; node.textContent = message; $('#toast-region').appendChild(node);
    setTimeout(() => { node.style.opacity = '0'; node.style.transform = 'translateY(5px)'; setTimeout(() => node.remove(), 220); }, 3200);
  }
  function setView(view) {
    if (!['today', 'planner', 'syllabus', 'analytics', 'settings', 'calendar', 'revision', 'flashcards', 'exams', 'notes', 'habits', 'timetable', 'goals'].includes(view)) return;
    activeView = view;
    $$('.view').forEach(node => node.classList.toggle('active', node.id === `view-${view}`));
    $$('.nav-item[data-view]').forEach(node => node.classList.toggle('active', node.dataset.view === view));
    const labels = { today: 'Today', planner: 'Study planner', syllabus: 'Syllabus', analytics: 'Insights', settings: 'Preferences', calendar: 'Calendar', revision: 'Revision lab', flashcards: 'Flashcards', exams: 'Exam center', notes: 'Notes vault', habits: 'Habits', timetable: 'Timetable & availability', goals: 'Goals' };
    $('#breadcrumb-current').textContent = labels[view];
    document.title = `${labels[view]} — StudyOS`;
    closeSidebar();
    render();
  }
  function openSidebar() { $('#sidebar').classList.add('open'); $('#sidebar-scrim').classList.add('show'); }
  function closeSidebar() { $('#sidebar').classList.remove('open'); $('#sidebar-scrim').classList.remove('show'); }
  function renderGlobal() {
    const today = todayISO();
    $('#topbar-date').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    $('#today-date-long').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const h = new Date().getHours();
    $('#greeting-title').textContent = h < 12 ? 'Good morning. Let’s focus.' : h < 17 ? 'Make this afternoon count.' : 'Finish today with intention.';
    const activePending = state.tasks.filter(t => t.status !== 'done' && t.planDate === today).length;
    $('#today-nav-count').textContent = String(activePending);
    const week = weekFocusLogs(dateRange(addDays(today, -6), 7));
    const minutes = week.reduce((sum, entry) => sum + entry.minutes, 0);
    $('#weekly-focus-number').textContent = `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`;
    $('#weekly-goal-number').textContent = `${state.preferences.weeklyGoal}h`;
    $('#weekly-goal-progress').style.width = `${Math.min(100, minutes / (state.preferences.weeklyGoal * 60) * 100)}%`;
    $('#weekly-goal-caption').textContent = minutes >= state.preferences.weeklyGoal * 60 ? 'Weekly goal reached. Great work.' : `${Math.max(0, state.preferences.weeklyGoal * 60 - minutes)} focused minutes to your goal.`;
    $('.workspace-copy small').textContent = state.firstRun ? 'Sample data · local only' : 'Personal workspace · local';
    $('#subject-nav-list').innerHTML = state.subjects.length ? state.subjects.map(s => `<button class="subject-nav-item" data-subject-open="${escapeHtml(s.id)}"><i class="subject-dot" style="background:${s.color}"></i><span>${escapeHtml(s.name)}</span><small>${subjectTopicProgress(s).percent}%</small></button>`).join('') : '<div class="no-results">Add a subject to get started.</div>';
    renderStats();
  }
  function renderStats() {
    const today = todayISO(); const weekDatesArr = dateRange(addDays(today, -6), 7); const set = new Set(weekDatesArr);
    const logs = state.focusLogs.filter(log => set.has(log.date)); const minutes = logs.reduce((sum, log) => sum + log.minutes, 0);
    $('#stat-focus').innerHTML = `${Math.floor(minutes / 60)}<span>h</span> ${minutes % 60}<span>m</span>`;
    $('#stat-focus-caption').textContent = minutes ? `${Math.round(minutes / 7)} min average per day` : 'Log a focus session to start your trend';
    const weeklyTasks = state.tasks.filter(t => (t.status === 'done' && t.completedAt && set.has(t.completedAt.slice(0, 10))) || (t.planDate && set.has(t.planDate)));
    const done = weeklyTasks.filter(t => t.status === 'done').length;
    const rate = weeklyTasks.length ? Math.round(done / weeklyTasks.length * 100) : 0;
    $('#stat-completed').innerHTML = `${done}<span class="muted-denom"> / ${weeklyTasks.length}</span>`;
    $('#stat-completion-rate').textContent = `${rate}% done`;
    $('#stat-completion-progress').style.width = `${rate}%`;
    const completedWithPlan = state.tasks.filter(t => t.status === 'done' && t.completedAt && t.planDate);
    const follow = completedWithPlan.length ? Math.round(completedWithPlan.filter(t => t.completedAt.slice(0, 10) <= t.planDate).length / completedWithPlan.length * 100) : null;
    $('#stat-followthrough').innerHTML = follow === null ? '—<span>%</span>' : `${follow}<span>%</span>`;
    $('#stat-followthrough-caption').textContent = follow === null ? 'Complete planned tasks to build your trend' : 'Completed on or before plan date';
    $('#stat-followthrough-progress').style.width = `${follow || 0}%`;
    $('#focus-mini-bars').innerHTML = weekFocusLogs(weekDatesArr).map((entry, i) => `<span class="mini-bar ${i === 6 ? 'current' : ''}" title="${shortDate(entry.date)}: ${entry.minutes} minutes" style="height:${Math.max(3, Math.min(22, entry.minutes / Math.max(1, ...weekFocusLogs(weekDatesArr).map(x => x.minutes)) * 22))}px"></span>`).join('');
  }
  function renderToday() {
    $('#plan-day-title').textContent = longDate(selectedDate);
    $('#plan-day-subtitle').textContent = selectedDate === todayISO() ? 'YOUR FOCUS FOR TODAY' : selectedDate < todayISO() ? 'A LOOK BACK AT YOUR PLAN' : 'PLAN AHEAD, ONE STEP AT A TIME';
    const dayTasks = state.tasks.filter(t => t.planDate === selectedDate).sort((a, b) => (a.status === 'done') - (b.status === 'done') || compareTasks(a, b));
    const pending = dayTasks.filter(t => t.status !== 'done').length;
    $('#today-task-count').textContent = `${dayTasks.length} task${dayTasks.length === 1 ? '' : 's'}`;
    if (!dayTasks.length) {
      $('#today-task-list').innerHTML = `<div class="empty-state"><div class="empty-state-icon">✳</div><b>Room for a fresh start.</b><p>No tasks planned for this day. Add a small, clear next step.</p><button class="button button-ghost" data-add-task-date="${selectedDate}">＋ Add a task</button></div>`;
    } else {
      $('#today-task-list').innerHTML = dayTasks.map(task => {
        const due = task.dueDate ? relativeDue(task.dueDate, todayISO()) : 'No deadline';
        const overdue = task.status !== 'done' && task.dueDate && task.dueDate < todayISO();
        return `<article class="task-row ${task.status === 'done' ? 'done' : ''}" data-task-row="${escapeHtml(task.id)}"><input class="task-check" type="checkbox" data-task-done="${escapeHtml(task.id)}" ${task.status === 'done' ? 'checked' : ''} aria-label="Mark ${escapeHtml(task.title)} ${task.status === 'done' ? 'incomplete' : 'complete'}"><div class="task-row-main"><div class="task-title-line"><span class="task-title">${escapeHtml(task.title)}</span>${taskSubjectTag(task)}</div><div class="task-meta"><span>◷ ${task.minutes} min planned</span><span><i class="priority-mark priority-${task.priority}"></i>${priorityText(task.priority)}</span><span class="${overdue ? 'task-due-overdue' : ''}">${escapeHtml(due)}</span>${task.actualMinutes ? `<span>✓ ${task.actualMinutes}m logged</span>` : ''}</div></div><div class="task-row-actions">${task.status !== 'done' ? `<button class="tiny-action" data-focus-task="${escapeHtml(task.id)}" title="Start focus session" aria-label="Focus on ${escapeHtml(task.title)}">▶</button>` : ''}<button class="tiny-action" data-edit-task="${escapeHtml(task.id)}" title="Edit task" aria-label="Edit task">✎</button><button class="tiny-action" data-log-time="${escapeHtml(task.id)}" title="Log study time" aria-label="Log study time">＋</button></div></article>`;
      }).join('');
    }
    $('#welcome-title').textContent = pending ? `You have ${pending} focused step${pending === 1 ? '' : 's'} planned.` : 'Your next step is the most important one.';
    const nextStepMessage = pending ? 'Choose one task, give it a focused block, and let the momentum build.' : 'Set a clear target, protect your focus time, and start small.';
    $('#welcome-message').textContent = state.firstRun ? `${nextStepMessage} Starter tasks are fictional—replace them with your own.` : nextStepMessage;
    const subjects = state.subjects.slice(0, 4);
    $('#subject-progress-list').innerHTML = subjects.length ? subjects.map(s => {
      const prog = subjectTopicProgress(s); const pal = COLOR_PALETTES[s.color] || COLOR_PALETTES[COLORS[0]];
      return `<div class="subject-progress-item"><div class="subject-progress-head"><i class="subject-dot" style="background:${s.color}"></i><span class="subject-progress-name">${escapeHtml(s.name)}</span><span class="subject-progress-value">${prog.done}/${prog.total} topics</span></div><div class="subject-progress-track"><span style="width:${prog.percent}%;background:${s.color}"></span></div></div>`;
    }).join('') : '<div class="no-results">Add your first subject to track syllabus progress.</div>';
    $('#prev-day').disabled = selectedDate <= addDays(todayISO(), -30);
    $('#next-day').disabled = selectedDate >= addDays(todayISO(), 30);
  }
  function renderPlanner() {
    const dates = weekDates(); const start = dates[0]; const end = dates[6];
    $('#planner-week-title').textContent = `${shortDate(start)} – ${fromISODate(end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    const weekSet = new Set(dates);
    const weekTasks = state.tasks.filter(t => t.planDate && weekSet.has(t.planDate));
    const plannedMinutes = weekTasks.reduce((sum, t) => sum + t.minutes, 0);
    $('#planner-week-minutes').textContent = minutesLabel(plannedMinutes);
    $('#planner-week-tasks').textContent = weekTasks.length;
    const donePct = weekTasks.length ? Math.round(weekTasks.filter(t => t.status === 'done').length / weekTasks.length * 100) : 0;
    $('#planner-week-done').textContent = `${donePct}%`;
    $('#week-board').innerHTML = dates.map(date => {
      const dayTasks = state.tasks.filter(t => t.planDate === date).sort((a, b) => (a.status === 'done') - (b.status === 'done') || compareTasks(a, b));
      const totalMins = dayTasks.reduce((sum, t) => sum + t.minutes, 0);
      return `<section class="week-day ${date === todayISO() ? 'today' : ''}"><div class="week-day-head"><small>${shortDay(date).toUpperCase()}</small><b>${fromISODate(date).getDate()}</b><div class="day-workload"><span style="width:${Math.min(100, totalMins / state.preferences.dailyBudget * 100)}%"></span></div><div class="day-workload-label">${minutesLabel(totalMins)} planned</div></div><div class="week-day-content">${dayTasks.map(t => {
        const s = subjectFor(t.subjectId); const pal = s ? COLOR_PALETTES[s.color] || COLOR_PALETTES[COLORS[0]] : COLOR_PALETTES[COLORS[0]];
        return `<div class="week-task ${t.status === 'done' ? 'done' : ''}" data-edit-task="${escapeHtml(t.id)}" title="Click to edit"><div class="week-task-title">${escapeHtml(t.title)}</div><span class="week-task-subject" style="color:${s ? pal.text : '#8d88b5'}">${escapeHtml(s ? s.name : 'General')}</span><span class="week-task-minutes">◷ ${t.minutes} min ${t.status === 'done' ? '· Done' : ''}</span></div>`;
      }).join('')}<button class="day-add-task" data-add-task-date="${date}">＋ Add task</button></div></section>`;
    }).join('');
    const unplanned = state.tasks.filter(t => t.status !== 'done' && (!t.planDate || !weekSet.has(t.planDate))).sort(compareTasks);
    $('#unplanned-count').textContent = `${unplanned.length} task${unplanned.length === 1 ? '' : 's'}`;
    $('#unplanned-list').innerHTML = unplanned.length ? unplanned.map(t => `<div class="unplanned-row"><div class="task-row-main"><div class="task-title-line"><span class="task-title">${escapeHtml(t.title)}</span>${taskSubjectTag(t)}</div><div class="task-meta"><span>◷ ${t.minutes} min</span><span class="priority-mark priority-${t.priority}"></span><span>${escapeHtml(t.dueDate ? relativeDue(t.dueDate, todayISO()) : 'No deadline')}</span></div></div><button class="button button-secondary" data-schedule-task="${escapeHtml(t.id)}">Schedule →</button></div>`).join('') : '<div class="empty-state"><div class="empty-state-icon">✓</div><b>Nothing waiting for a slot.</b><p>All unfinished tasks are on your current seven-day plan.</p></div>';
  }
  function renderSyllabus() {
    const totals = totalTopicProgress();
    $('#syllabus-subject-total').textContent = state.subjects.length;
    $('#syllabus-topics-done').textContent = `${totals.done} / ${totals.total}`;
    $('#syllabus-overall-progress').textContent = `${totals.percent}%`;
    const search = ($('#subject-search').value || '').trim().toLowerCase(); const filter = $('#subject-filter').value;
    const filtered = state.subjects.filter(s => s.name.toLowerCase().includes(search)).filter(s => filter === 'all' || (filter === 'incomplete' ? subjectTopicProgress(s).percent < 100 : subjectTopicProgress(s).percent === 100));
    $('#syllabus-grid').innerHTML = filtered.length ? filtered.map(s => {
      const prog = subjectTopicProgress(s); const pal = COLOR_PALETTES[s.color] || COLOR_PALETTES[COLORS[0]];
      const topics = s.topics || [];
      return `<article class="subject-card"><div class="subject-card-head"><div class="subject-card-color" style="background:${pal.bg};color:${pal.text}">▤</div><div class="subject-card-title"><h3>${escapeHtml(s.name)}</h3><p>${s.examDate ? `Exam · ${shortDate(s.examDate)}` : 'No exam date set'} · ${topics.length} topic${topics.length === 1 ? '' : 's'}</p></div><div class="subject-card-actions"><button class="tiny-action" data-edit-subject="${escapeHtml(s.id)}" title="Edit subject" aria-label="Edit ${escapeHtml(s.name)}">✎</button><button class="tiny-action" data-delete-subject="${escapeHtml(s.id)}" title="Delete subject and its tasks" aria-label="Delete ${escapeHtml(s.name)}">×</button></div></div><div class="subject-card-progress"><div class="subject-card-progress-row"><span>${prog.done} of ${prog.total} topics complete</span><b>${prog.percent}%</b></div><div class="subject-progress-track"><span style="width:${prog.percent}%;background:${s.color}"></span></div></div><div class="topic-list">${topics.length ? topics.map(t => `<div class="topic-row ${t.status === 'done' ? 'done' : t.status === 'in-progress' ? 'in-progress' : ''}" data-cycle-topic="${escapeHtml(s.id)}" data-topic-id="${escapeHtml(t.id)}" role="button" tabindex="0" aria-label="Update topic ${escapeHtml(t.name)} status"><span class="topic-state">${t.status === 'done' ? '✓' : t.status === 'in-progress' ? '◷' : ''}</span><span>${escapeHtml(t.name)}</span><small class="topic-status-text">${t.status === 'done' ? 'Done' : t.status === 'in-progress' ? 'In progress' : 'To do'}</small></div>`).join('') : '<div class="subject-card-empty">No topics yet. Add a topic below.</div>'}</div><form class="add-topic-row" data-add-topic="${escapeHtml(s.id)}"><input name="topic" maxlength="160" placeholder="Add a topic..." aria-label="New topic for ${escapeHtml(s.name)}" required><button type="submit">Add +</button></form></article>`;
    }).join('') : '<div class="panel" style="grid-column:1/-1"><div class="empty-state"><div class="empty-state-icon">▤</div><b>No subjects match that view.</b><p>Add a subject or change your search/filter.</p><button class="button button-primary" data-add-subject>＋ Add subject</button></div></div>';
  }
  function renderAnalytics() {
    const totalMinutes = state.focusLogs.reduce((sum, log) => sum + log.minutes, 0);
    $('#analytics-total-focus').innerHTML = `${Math.floor(totalMinutes / 60)}<span>h</span> ${totalMinutes % 60}<span>m</span>`;
    $('#analytics-total-tasks').textContent = state.tasks.filter(t => t.status === 'done').length;
    const completedDays = new Set(state.tasks.filter(t => t.status === 'done' && t.completedAt).map(t => t.completedAt.slice(0, 10)));
    let streak = 0; let cursor = todayISO();
    if (!completedDays.has(cursor)) cursor = addDays(cursor, -1);
    while (completedDays.has(cursor) && streak < 365) { streak++; cursor = addDays(cursor, -1); }
    $('#analytics-streak').innerHTML = `${streak}<span> day${streak === 1 ? '' : 's'}</span>`;
    const lastSeven = weekFocusLogs(dateRange(addDays(todayISO(), -6), 7)); const max = Math.max(60, ...lastSeven.map(x => x.minutes));
    $('#focus-chart').innerHTML = lastSeven.map(entry => `<div class="chart-column"><div class="chart-bar-wrap"><span class="chart-value">${entry.minutes || ''}</span><div class="chart-bar ${entry.date === todayISO() ? 'today' : ''}" style="height:${Math.max(entry.minutes ? 3 : 0, entry.minutes / max * 100)}%" title="${entry.minutes} focus minutes"></div></div><span class="chart-label">${shortDay(entry.date)}</span></div>`).join('');
    const subjectMinutes = state.subjects.map(s => ({ ...s, minutes: state.focusLogs.filter(log => log.subjectId === s.id).reduce((sum, log) => sum + log.minutes, 0) })).sort((a, b) => b.minutes - a.minutes);
    const top = Math.max(1, ...subjectMinutes.map(s => s.minutes));
    $('#subject-breakdown').innerHTML = subjectMinutes.length ? subjectMinutes.map(s => `<div class="breakdown-row"><div class="breakdown-row-head"><i class="subject-dot" style="background:${s.color}"></i><b>${escapeHtml(s.name)}</b><span>${minutesLabel(s.minutes)}</span></div><div class="breakdown-track"><span style="width:${s.minutes / top * 100}%;background:${s.color}"></span></div></div>`).join('') : '<div class="no-results">Add subjects and log focus sessions to see a breakdown.</div>';
  }
  function renderSettings() {
    $('#daily-budget').value = state.preferences.dailyBudget;
    $('#weekly-goal').value = state.preferences.weeklyGoal;
    $('#focus-duration').value = state.preferences.focusDuration;
    $$('.settings-nav-item').forEach(b => b.classList.toggle('active', b.dataset.settingsSection === currentSettingsSection));
    $$('.settings-section').forEach(s => s.classList.toggle('active', s.id === `settings-${currentSettingsSection}`));
  }
  function render() {
    renderGlobal();
    renderToday();
    if (activeView === 'planner') renderPlanner();
    if (activeView === 'syllabus') renderSyllabus();
    if (activeView === 'analytics') renderAnalytics();
    if (activeView === 'settings') renderSettings();
    updateTimerUI();
    if (root.StudyOSFeatures && typeof root.StudyOSFeatures.render === 'function') root.StudyOSFeatures.render(activeView);
  }

  function showModal(title, kicker, content, onReady) {
    modalFocusReturn = document.activeElement;
    $('#modal-title').textContent = title; $('#modal-kicker').textContent = kicker || 'MAKE IT MANAGEABLE'; $('#modal-body').innerHTML = content;
    $('#modal-backdrop').hidden = false;
    const first = $('#modal-body input, #modal-body select, #modal-body textarea, #modal-body button'); if (first) first.focus();
    if (onReady) onReady();
  }
  function closeModal() { $('#modal-backdrop').hidden = true; $('#modal-body').innerHTML = ''; if (modalFocusReturn && modalFocusReturn.focus) modalFocusReturn.focus(); }
  function openTaskModal(task = null, date = selectedDate) {
    const editing = Boolean(task); const taskData = task || { title: '', subjectId: state.subjects[0]?.id || '', planDate: date, dueDate: date, minutes: 45, priority: 'medium', notes: '' };
    showModal(editing ? 'Edit study task' : 'Add a study task', editing ? 'REFINE YOUR NEXT STEP' : 'MAKE IT MANAGEABLE', `<form id="task-form" class="modal-form"><label><span>What do you want to work on?</span><input class="input" name="title" maxlength="160" placeholder="e.g. Solve 10 practice problems" value="${escapeHtml(taskData.title)}" required></label><div class="form-grid"><label><span>Subject</span><select class="input" name="subjectId"><option value="">General / no subject</option>${state.subjects.map(s => `<option value="${escapeHtml(s.id)}" ${taskData.subjectId === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}</select></label><label><span>Study time</span><select class="input" name="minutes">${[15, 25, 30, 35, 45, 50, 60, 75, 90, 120, 150, 180].map(m => `<option value="${m}" ${Number(taskData.minutes) === m ? 'selected' : ''}>${m} minutes</option>`).join('')}</select></label><label><span>Schedule on</span><input class="input" type="date" name="planDate" value="${escapeHtml(taskData.planDate || '')}"></label><label><span>Due date</span><input class="input" type="date" name="dueDate" value="${escapeHtml(taskData.dueDate || '')}"></label><label><span>Priority</span><select class="input" name="priority">${['high', 'medium', 'low'].map(p => `<option value="${p}" ${taskData.priority === p ? 'selected' : ''}>${p[0].toUpperCase() + p.slice(1)}</option>`).join('')}</select></label><label><span>Status</span><select class="input" name="status"><option value="todo" ${taskData.status !== 'done' ? 'selected' : ''}>To do</option><option value="done" ${taskData.status === 'done' ? 'selected' : ''}>Completed</option></select></label></div><label><span>Notes <small>(optional)</small></span><textarea class="input" name="notes" maxlength="1200" placeholder="What does done look like?">${escapeHtml(taskData.notes || '')}</textarea></label><div class="modal-footer"><button type="button" class="button button-secondary" data-modal-cancel>Cancel</button>${editing ? `<button type="button" class="button button-danger" data-delete-task="${escapeHtml(task.id)}">Delete task</button>` : ''}<button type="submit" class="button button-primary">${editing ? 'Save task' : 'Add task'}</button></div></form>`, () => {
      $('#task-form').addEventListener('submit', event => {
        event.preventDefault(); const form = new FormData(event.currentTarget); const title = String(form.get('title') || '').trim();
        if (!title) return toast('Give your task a name first.', 'error');
        const planDate = String(form.get('planDate') || ''); const dueDate = String(form.get('dueDate') || '');
        const taskStatus = String(form.get('status')) === 'done' ? 'done' : 'todo';
        const data = { title, subjectId: String(form.get('subjectId') || ''), planDate: isValidDateString(planDate) ? planDate : '', dueDate: isValidDateString(dueDate) ? dueDate : '', minutes: safeMinutes(form.get('minutes'), 45), priority: String(form.get('priority') || 'medium'), status: taskStatus, notes: String(form.get('notes') || '').trim(), actualMinutes: task?.actualMinutes || 0, createdAt: task?.createdAt || new Date().toISOString(), completedAt: taskStatus === 'done' ? (task?.completedAt || new Date().toISOString()) : null };
        if (editing) Object.assign(task, data); else state.tasks.push({ id: uid('task'), ...data });
        if (data.planDate) selectedDate = data.planDate;
        save(); closeModal(); render(); toast(editing ? 'Task updated.' : 'Task added to your workspace.');
      });
    });
  }
  function openSubjectModal(subject = null) {
    editingSubjectId = subject?.id || null; chosenColor = subject?.color || COLORS[state.subjects.length % COLORS.length];
    const topicText = (subject?.topics || []).map(t => t.name).join('\n');
    const colorOptions = COLORS.map(color => `<button type="button" class="color-choice ${color === chosenColor ? 'selected' : ''}" data-color-choice="${color}" style="background:${color}" aria-label="Select subject color ${color}"></button>`).join('');
    showModal(subject ? 'Edit subject' : 'Add a subject', 'BUILD YOUR SYLLABUS', `<form id="subject-form" class="modal-form"><label><span>Subject name</span><input class="input" name="name" maxlength="100" placeholder="e.g. Discrete Mathematics" value="${escapeHtml(subject?.name || '')}" required></label><div class="form-grid"><label><span>Exam date <small>(optional)</small></span><input class="input" type="date" name="examDate" value="${escapeHtml(subject?.examDate || '')}"></label><label><span>Subject colour</span><div class="color-options">${colorOptions}</div></label></div><label><span>Topics or chapters</span><textarea class="input" name="topics" maxlength="6000" placeholder="One topic per line\nSets and relations\nGraph theory\nCombinatorics">${escapeHtml(topicText)}</textarea><small style="color:#9da2b2;font-size:9px">One topic per line. Existing topic statuses are retained when editing matching topic names.</small></label><div class="modal-footer"><button type="button" class="button button-secondary" data-modal-cancel>Cancel</button>${subject ? `<button type="button" class="button button-danger" data-delete-subject="${escapeHtml(subject.id)}">Delete subject</button>` : ''}<button type="submit" class="button button-primary">${subject ? 'Save changes' : 'Add subject'}</button></div></form>`, () => {
      $('#subject-form').addEventListener('submit', event => {
        event.preventDefault(); const form = new FormData(event.currentTarget); const name = String(form.get('name') || '').trim();
        if (!name) return toast('Enter a subject name.', 'error');
        const existing = subject ? new Map(subject.topics.map(t => [t.name.trim().toLowerCase(), t])) : new Map();
        const topicNames = [...new Set(String(form.get('topics') || '').split(/\r?\n/).map(t => t.trim()).filter(Boolean))];
        const next = { id: subject?.id || uid('sub'), name, color: chosenColor, examDate: isValidDateString(String(form.get('examDate') || '')) ? String(form.get('examDate')) : '', topics: topicNames.map(name => { const old = existing.get(name.toLowerCase()); return old ? { ...old, name } : { id: uid('top'), name, status: 'not-started' }; }) };
        const duplicate = state.subjects.find(s => s.id !== next.id && s.name.toLowerCase() === name.toLowerCase());
        if (duplicate) return toast('You already have a subject with that name.', 'error');
        if (subject) state.subjects[state.subjects.findIndex(s => s.id === subject.id)] = next; else state.subjects.push(next);
        save(); closeModal(); render(); toast(subject ? 'Subject updated.' : 'Subject added.');
      });
    });
  }
  function deleteTask(id) {
    const task = taskFor(id); if (!task) return;
    if (!confirm(`Delete “${task.title}”? This cannot be undone.`)) return;
    state.tasks = state.tasks.filter(t => t.id !== id);
    if (focusTaskId === id) { focusTaskId = null; resetTimer(false); }
    save(); closeModal(); render(); toast('Task deleted.');
  }
  function deleteSubject(id) {
    const subject = subjectFor(id); if (!subject) return;
    if (!confirm(`Delete “${subject.name}” and unassign its tasks? This cannot be undone.`)) return;
    state.subjects = state.subjects.filter(s => s.id !== id);
    state.tasks.forEach(t => { if (t.subjectId === id) t.subjectId = ''; });
    state.focusLogs.forEach(log => { if (log.subjectId === id) log.subjectId = ''; });
    save(); closeModal(); render(); toast('Subject deleted. Its tasks were kept as general tasks.');
  }
  function cycleTopic(subjectId, topicId) {
    const s = subjectFor(subjectId); const t = s?.topics.find(topic => topic.id === topicId); if (!t) return;
    t.status = ({ 'not-started': 'in-progress', 'in-progress': 'done', done: 'not-started' })[t.status] || 'not-started';
    save(); render();
  }
  function scheduleTask(id) {
    const task = taskFor(id); if (!task) return;
    const week = weekDates(); const load = Object.fromEntries(week.map(d => [d, state.tasks.filter(t => t.planDate === d && t.status !== 'done').reduce((sum, t) => sum + t.minutes, 0)]));
    const slot = week.find(d => load[d] + task.minutes <= state.preferences.dailyBudget) || week.find(d => load[d] < state.preferences.dailyBudget) || week[0];
    task.planDate = slot; save(); render(); toast(`Task scheduled for ${longDate(slot)}.`);
  }
  function autoPlan() {
    const result = buildPlan(state.tasks, state.preferences.dailyBudget, todayISO(), 7);
    state.tasks = result.tasks; plannerWeekOffset = 0; save(); render();
    toast(`Planned ${result.scheduledCount} unfinished tasks across your next seven days.`);
  }
  function logTime(id) {
    const task = taskFor(id); if (!task) return;
    const answer = prompt(`How many minutes did you spend on “${task.title}”?`, String(task.minutes));
    if (answer === null) return;
    const minutes = Number(answer);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600) return toast('Enter a whole number between 1 and 600 minutes.', 'error');
    task.actualMinutes += minutes;
    state.focusLogs.push({ id: uid('focus'), date: todayISO(), taskId: task.id, subjectId: task.subjectId, minutes, kind: 'manual' });
    save(); render(); toast(`${minutes} minutes logged. Nice work.`);
  }

  function setupTimer(taskId = focusTaskId) {
    if (taskId) {
      const task = taskFor(taskId); if (!task || task.status === 'done') { toast('Choose an unfinished task for your focus session.', 'error'); return false; }
      focusTaskId = taskId;
    } else if (!focusTaskId || !taskFor(focusTaskId) || taskFor(focusTaskId).status === 'done') {
      const candidate = state.tasks.filter(t => t.status !== 'done').sort((a, b) => (a.planDate === todayISO() ? -1 : 0) - (b.planDate === todayISO() ? -1 : 0) || compareTasks(a, b))[0];
      if (!candidate) { toast('Add a study task before starting a focus session.', 'error'); return false; }
      focusTaskId = candidate.id;
    }
    if (!timerRunning && timerRemaining === 25 * 60 && timerTotal === 25 * 60) { timerTotal = state.preferences.focusDuration * 60; timerRemaining = timerTotal; }
    return true;
  }
  function startTimer() {
    if (!setupTimer()) return;
    if (timerInterval) clearInterval(timerInterval);
    if (timerRemaining <= 0) { timerTotal = state.preferences.focusDuration * 60; timerRemaining = timerTotal; }
    timerRunning = true; timerDeadline = Date.now() + timerRemaining * 1000;
    timerInterval = setInterval(() => {
      timerRemaining = Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000));
      if (timerRemaining <= 0) finishTimer(); else updateTimerUI();
    }, 250);
    updateTimerUI();
  }
  function pauseTimer() {
    if (!timerRunning) return;
    timerRemaining = Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000));
    timerRunning = false; timerDeadline = null; if (timerInterval) clearInterval(timerInterval); timerInterval = null; updateTimerUI();
  }
  function resetTimer(showToast = true) {
    if (timerInterval) clearInterval(timerInterval); timerInterval = null; timerRunning = false; timerDeadline = null; timerTotal = state.preferences.focusDuration * 60; timerRemaining = timerTotal; updateTimerUI(); if (showToast) toast('Focus timer reset.');
  }
  function finishTimer() {
    if (timerInterval) clearInterval(timerInterval); timerInterval = null; timerRunning = false; timerDeadline = null; timerRemaining = 0;
    const task = taskFor(focusTaskId); if (task) { const mins = Math.round(timerTotal / 60); task.actualMinutes += mins; state.focusLogs.push({ id: uid('focus'), date: todayISO(), taskId: task.id, subjectId: task.subjectId, minutes: mins, kind: 'timer' }); save(); }
    updateTimerUI(); render(); toast('Focus session complete. Your time has been logged.');
  }
  function timerString(seconds) { return `${pad(Math.floor(Math.max(0, seconds) / 60))}:${pad(Math.max(0, seconds) % 60)}`; }
  function updateTimerUI() {
    const digits = timerString(timerRemaining); const task = taskFor(focusTaskId);
    $('#timer-digits').textContent = digits; $('#focus-overlay-timer').textContent = digits;
    $('#timer-caption').textContent = timerRunning ? 'STAY WITH IT' : timerRemaining === 0 ? 'SESSION COMPLETE' : 'DEEP WORK';
    $('#timer-task-name').textContent = task ? task.title : 'Pick a task to focus on'; $('#focus-overlay-task').textContent = task ? task.title : 'Choose a task and give it your attention.';
    $('#timer-start').innerHTML = timerRunning ? 'Ⅱ Pause focus' : timerRemaining === 0 ? '↻ Start again' : '▶ Start focus';
    $('#overlay-timer-toggle').innerHTML = timerRunning ? 'Ⅱ Pause focus' : timerRemaining === 0 ? '↻ Start again' : '▶ Start focus';
    const fraction = timerTotal ? Math.max(0, Math.min(1, timerRemaining / timerTotal)) : 1;
    $('#timer-ring-value').style.strokeDashoffset = String(603.19 * (1 - fraction));
    $('#focus-overlay-progress').style.width = `${(1 - fraction) * 100}%`;
    $('.focus-status').innerHTML = `<span class="live-dot" style="${timerRunning ? 'background:#e9a34b;box-shadow:0 0 0 3px #fff0de' : ''}"></span> ${timerRunning ? 'IN SESSION' : 'READY'}`;
  }
  function toggleFocusOverlay(show) { $('#focus-overlay').hidden = !show; if (show) updateTimerUI(); }
  function toggleTimer() { if (timerRunning) pauseTimer(); else startTimer(); }

  function exportJson() {
    let studyosFeatures = null; try { studyosFeatures = JSON.parse(localStorage.getItem('studyos.features.v1') || 'null'); } catch (_) {}
    downloadFile(`studyos-complete-backup-${todayISO()}.json`, JSON.stringify({ ...state, studyosFeatures, exportedAt: new Date().toISOString(), appEdition: 'StudyOS Complete Edition' }, null, 2), 'application/json'); toast('Complete workspace backup downloaded.');
  }
  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportCsv() {
    const rows = [['Title', 'Subject', 'Scheduled date', 'Due date', 'Planned minutes', 'Actual minutes', 'Priority', 'Status', 'Notes']];
    state.tasks.forEach(t => rows.push([t.title, subjectFor(t.subjectId)?.name || 'General', t.planDate, t.dueDate, t.minutes, t.actualMinutes, t.priority, t.status, t.notes]));
    const csv = rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    downloadFile(`studyos-tasks-${todayISO()}.csv`, '\ufeff' + csv, 'text/csv;charset=utf-8'); toast('Task report downloaded.');
  }
  function importJsonFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        if (!confirm('Import this backup and replace the current workspace? Export a backup first if you want to keep the current data.')) return;
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.subjects) || !Array.isArray(parsed.tasks)) throw new Error('Not a StudyOS workspace backup');
        state = normalizeWorkspace(parsed);
        if (parsed.studyosFeatures && typeof parsed.studyosFeatures === 'object') localStorage.setItem('studyos.features.v1', JSON.stringify(parsed.studyosFeatures));
        else localStorage.removeItem('studyos.features.v1');
        save(); selectedDate = todayISO(); root.StudyOSFeatures?.reload?.(); render(); toast('Complete workspace backup imported.');
      } catch (_) { toast('That file is not a valid StudyOS JSON backup.', 'error'); }
    };
    reader.onerror = () => toast('Could not read that file.', 'error'); reader.readAsText(file);
  }
  function resetWorkspace() {
    if (!confirm('Reset your StudyOS workspace? All locally saved subjects, tasks, and focus history will be removed. This cannot be undone.')) return;
    state = { version: 1, subjects: [], tasks: [], focusLogs: [], preferences: { dailyBudget: 180, weeklyGoal: 12, focusDuration: 25 }, firstRun: false };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); localStorage.removeItem('studyos.features.v1'); } catch (_) {}
    root.StudyOSFeatures?.reset?.();
    selectedDate = todayISO(); focusTaskId = null; resetTimer(false); render(); toast('Workspace reset. Start fresh.');
  }

  document.addEventListener('click', event => {
    const target = event.target.closest('button,[data-task-done],[data-focus-task],[data-edit-task],[data-log-time],[data-add-task-date],[data-subject-open],[data-edit-subject],[data-delete-subject],[data-delete-task],[data-cycle-topic],[data-schedule-task],[data-color-choice],[data-modal-cancel]');
    if (!target) return;
    if (target.matches('[data-view]')) { setView(target.dataset.view); return; }
    if (target.matches('[data-view-link]')) { setView(target.dataset.viewLink); return; }
    if (target.matches('[data-add-task-date]')) { openTaskModal(null, target.dataset.addTaskDate); return; }
    if (target.matches('[data-add-subject],#add-subject-inline,#add-subject-sidebar,#add-subject-syllabus')) { openSubjectModal(); return; }
    if (target.matches('#add-task-top,#add-task-inline')) { openTaskModal(); return; }
    if (target.matches('[data-task-done]')) {
      const task = taskFor(target.dataset.taskDone); if (!task) return;
      task.status = target.checked ? 'done' : 'todo'; task.completedAt = target.checked ? new Date().toISOString() : null;
      save(); render(); toast(target.checked ? 'Task completed. Small win, banked.' : 'Task moved back to your to-do list.'); return;
    }
    if (target.matches('[data-edit-task]')) { const task = taskFor(target.dataset.editTask); if (task) openTaskModal(task); return; }
    if (target.matches('[data-focus-task]')) { focusTaskId = target.dataset.focusTask; if (!setupTimer(focusTaskId)) return; timerTotal = state.preferences.focusDuration * 60; timerRemaining = timerTotal; toggleFocusOverlay(true); render(); return; }
    if (target.matches('[data-log-time]')) { logTime(target.dataset.logTime); return; }
    if (target.matches('[data-subject-open]')) { setView('syllabus'); return; }
    if (target.matches('[data-edit-subject]')) { const s = subjectFor(target.dataset.editSubject); if (s) openSubjectModal(s); return; }
    if (target.matches('[data-delete-subject]')) { deleteSubject(target.dataset.deleteSubject); return; }
    if (target.matches('[data-delete-task]')) { deleteTask(target.dataset.deleteTask); return; }
    if (target.matches('[data-cycle-topic]')) { if (target.matches('button')) return; cycleTopic(target.dataset.cycleTopic, target.dataset.topicId); return; }
    if (target.matches('[data-schedule-task]')) { scheduleTask(target.dataset.scheduleTask); return; }
    if (target.matches('[data-color-choice]')) { chosenColor = target.dataset.colorChoice; $$('.color-choice').forEach(b => b.classList.toggle('selected', b.dataset.colorChoice === chosenColor)); return; }
    if (target.matches('[data-modal-cancel],#modal-close')) { closeModal(); return; }
  });

  $('#menu-toggle').addEventListener('click', openSidebar);
  $('#sidebar-scrim').addEventListener('click', closeSidebar);
  $('#top-avatar').addEventListener('click', () => setView('settings'));
  $('#workspace-switch').addEventListener('click', () => toast('One personal workspace, saved locally on this device.'));
  $('#focus-top-button').addEventListener('click', () => { if (setupTimer()) toggleFocusOverlay(true); });
  $('#focus-close').addEventListener('click', () => toggleFocusOverlay(false));
  $('#timer-start').addEventListener('click', toggleTimer); $('#overlay-timer-toggle').addEventListener('click', toggleTimer);
  $('#timer-reset').addEventListener('click', () => resetTimer()); $('#overlay-timer-reset').addEventListener('click', () => resetTimer());
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-backdrop').addEventListener('click', e => { if (e.target === $('#modal-backdrop')) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!$('#modal-backdrop').hidden) closeModal(); else if (!$('#focus-overlay').hidden) toggleFocusOverlay(false); else closeSidebar(); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-cycle-topic]') && e.target.tagName !== 'BUTTON') { e.preventDefault(); cycleTopic(e.target.dataset.cycleTopic, e.target.dataset.topicId); }
  });
  $('#prev-day').addEventListener('click', () => { selectedDate = addDays(selectedDate, -1); renderToday(); });
  $('#next-day').addEventListener('click', () => { selectedDate = addDays(selectedDate, 1); renderToday(); });
  $('#today-date-button').addEventListener('click', () => { selectedDate = todayISO(); renderToday(); });
  $('#welcome-action').addEventListener('click', () => setView('planner'));
  $('#auto-plan-button').addEventListener('click', autoPlan);
  $('#planner-week-prev').addEventListener('click', () => { plannerWeekOffset--; renderPlanner(); });
  $('#planner-week-next').addEventListener('click', () => { plannerWeekOffset++; renderPlanner(); });
  $('#planner-settings-link').addEventListener('click', () => { currentSettingsSection = 'planning'; setView('settings'); });
  $('#subject-search').addEventListener('input', renderSyllabus); $('#subject-filter').addEventListener('change', renderSyllabus);
  $('#analytics-export').addEventListener('click', exportJson); $('#export-data').addEventListener('click', exportJson); $('#export-tasks').addEventListener('click', exportCsv);
  $('#import-data').addEventListener('click', () => $('#import-file').click()); $('#import-file').addEventListener('change', e => { importJsonFile(e.target.files?.[0]); e.target.value = ''; });
  $('#reset-workspace').addEventListener('click', resetWorkspace);
  $('#settings-form').addEventListener('submit', e => {
    e.preventDefault(); const daily = Number($('#daily-budget').value); const weekly = Number($('#weekly-goal').value); const duration = Number($('#focus-duration').value);
    if (!Number.isFinite(daily) || daily < 30 || daily > 600 || !Number.isFinite(weekly) || weekly < 1 || weekly > 80) { toast('Check the planning values and try again.', 'error'); return; }
    state.preferences = { dailyBudget: Math.round(daily / 15) * 15, weeklyGoal: Math.round(weekly), focusDuration: [15, 25, 35, 45, 50].includes(duration) ? duration : 25 };
    if (!timerRunning) { timerTotal = state.preferences.focusDuration * 60; timerRemaining = timerTotal; }
    save(); render(); $('#settings-save-status').textContent = 'Saved'; setTimeout(() => $('#settings-save-status').textContent = '', 2000); toast('Preferences saved.');
  });
  $$('.settings-nav-item').forEach(button => button.addEventListener('click', () => { currentSettingsSection = button.dataset.settingsSection; renderSettings(); }));
  $('#today-more').addEventListener('click', () => { const pending = state.tasks.filter(t => t.status !== 'done' && t.planDate === selectedDate); if (pending.length) { if (confirm('Build a new seven-day plan using your current priorities and daily time budget? This will reschedule all unfinished tasks.')) autoPlan(); } else openTaskModal(null, selectedDate); });
  document.addEventListener('submit', e => {
    const form = e.target.closest('[data-add-topic]'); if (!form) return;
    e.preventDefault(); const field = $('input[name="topic"]', form); const name = field.value.trim(); if (!name) return;
    const subject = subjectFor(form.dataset.addTopic); if (!subject) return;
    if (subject.topics.some(t => t.name.toLowerCase() === name.toLowerCase())) return toast('That topic is already on the list.', 'error');
    subject.topics.push({ id: uid('top'), name, status: 'not-started' }); save(); renderSyllabus(); toast('Topic added.');
  });

  // Public integration surface for the complete feature modules.
  root.StudyOSCore = { getState: () => state, saveAndRender: () => { save(); render(); }, render, setView, openTaskModal, toast, todayISO, addDays, uid, escapeHtml, minutesLabel, isValidDateString };

  // Seed a helpful fictional workspace on first visit; users can reset it in Preferences → Data & privacy.
  save(false);
  render();
})(typeof window !== 'undefined' ? window : globalThis);
