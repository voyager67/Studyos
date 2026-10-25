/* StudyOS Complete Edition — extended local-first study toolkit. */
(function (root) {
  'use strict';

  const FEATURE_KEY = 'studyos.features.v1';
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const BLOCK_KINDS = ['study', 'class', 'personal'];
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));
  const pad = n => String(n).padStart(2, '0');
  const today = () => toDateString(new Date());
  const toDateString = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dateObj = value => { const p = String(value || '').split('-').map(Number); return p.length === 3 && p.every(Number.isFinite) ? new Date(p[0], p[1] - 1, p[2], 12) : new Date(); };
  const addDate = (value, amount) => { const d = dateObj(value); d.setDate(d.getDate() + amount); return toDateString(d); };
  const dateDiff = (a, b) => Math.round((dateObj(a) - dateObj(b)) / 86400000);
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && toDateString(dateObj(value)) === value;
  const validTime = value => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
  const nextDateForWeekday = day => { const current = (dateObj(today()).getDay() + 6) % 7; return addDate(today(), (Number(day) - current + 7) % 7); };
  const uid = p => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shortDate = value => dateObj(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const fullDate = value => dateObj(value).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const minsLabel = mins => { const m = Math.max(0, Math.round(Number(mins) || 0)); return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`; };
  const minutesFromTimes = (start, end) => { const [sh, sm] = String(start || '00:00').split(':').map(Number); const [eh, em] = String(end || '00:00').split(':').map(Number); return Math.max(0, (eh * 60 + em) - (sh * 60 + sm)); };
  const sortByDate = (a, b, field = 'date') => String(a[field] || '9999-12-31').localeCompare(String(b[field] || '9999-12-31'));

  function calculateReview(card, rating, todayDate = today()) {
    const oldInterval = Math.max(0, Number(card.interval) || 0);
    let ease = Math.max(1.3, Math.min(3.2, Number(card.ease) || 2.5));
    let interval = 1;
    let repetitions = Math.max(0, Number(card.repetitions) || 0);
    if (rating === 'again') { interval = 1; repetitions = 0; ease = Math.max(1.3, ease - 0.2); }
    else if (rating === 'hard') { interval = Math.max(1, Math.round((oldInterval || 1) * 1.2)); repetitions += 1; ease = Math.max(1.3, ease - 0.15); }
    else if (rating === 'easy') { interval = oldInterval < 1 ? 4 : Math.max(4, Math.round(oldInterval * ease * 1.3)); repetitions += 1; ease = Math.min(3.2, ease + 0.15); }
    else { interval = oldInterval < 1 ? 1 : Math.max(2, Math.round(oldInterval * ease)); repetitions += 1; }
    return { ...card, interval, ease: Math.round(ease * 100) / 100, repetitions, dueDate: addDate(todayDate, interval), lastReviewed: todayDate, reviewCount: Math.max(0, Number(card.reviewCount) || 0) + 1, reviewHistory: [...(Array.isArray(card.reviewHistory) ? card.reviewHistory : []), { date: todayDate, rating, interval }].slice(-365) };
  }

  function calculateWeightedGrade(assessments) {
    const graded = (assessments || []).filter(a => a.score !== null && a.score !== '' && Number(a.maxScore) > 0 && Number(a.weight) > 0 && Number.isFinite(Number(a.score)));
    const weight = graded.reduce((sum, a) => sum + Number(a.weight), 0);
    if (!weight) return { average: null, weight: 0, gradedCount: 0, contribution: 0 };
    const contribution = graded.reduce((sum, a) => sum + (Number(a.score) / Number(a.maxScore)) * Number(a.weight), 0);
    return { average: Math.round(contribution / weight * 10000) / 100, weight: Math.round(weight * 100) / 100, gradedCount: graded.length, contribution: Math.round(contribution * 100) / 100 };
  }

  function requiredScore(assessments, targetPercent, remainingWeight) {
    const target = Math.max(0, Math.min(100, Number(targetPercent) || 0));
    const weight = Math.max(0.01, Math.min(100, Number(remainingWeight) || 0));
    const graded = calculateWeightedGrade(assessments);
    const needed = (target - graded.contribution) / (weight / 100);
    return { needed: Math.round(needed * 100) / 100, currentContribution: graded.contribution, gradedWeight: graded.weight, remainingWeight: weight, possible: needed <= 100, impossible: needed > 100, alreadyReached: needed <= 0 };
  }

  function splitTask(task, maxSessionMinutes = 50, makeId = uid) {
    const duration = Math.max(5, Number(task.minutes) || 45);
    const chunk = Math.max(15, Math.min(180, Number(maxSessionMinutes) || 50));
    if (duration <= chunk || task.status === 'done') return [{ ...task }];
    const count = Math.ceil(duration / chunk);
    const pieces = [];
    let remaining = duration;
    for (let i = 0; i < count; i += 1) {
      const minutes = Math.min(chunk, remaining); remaining -= minutes;
      pieces.push({ ...task, id: makeId('task'), title: `${task.title} — Part ${i + 1}/${count}`, taskGroupTitle: task.taskGroupTitle || task.title, parentTaskId: task.parentTaskId || task.id, partNumber: i + 1, partCount: count, minutes, actualMinutes: 0, planDate: '', status: 'todo', completedAt: null, createdAt: new Date().toISOString() });
    }
    return pieces;
  }

  function scheduleWithCapacity(tasks, options) {
    const { todayDate = today(), horizon = 14, dailyBudget = 180, focusBlockMinutes = 50, capacityForDate = () => dailyBudget, makeId = uid } = options || {};
    const days = Array.from({ length: Math.max(1, Math.min(60, horizon)) }, (_, i) => addDate(todayDate, i));
    const capacity = Object.fromEntries(days.map(day => [day, Math.max(0, Math.min(600, Number(capacityForDate(day)) || 0))]));
    const load = Object.fromEntries(days.map(day => [day, 0]));
    const pending = (tasks || []).filter(t => t.status !== 'done');
    const completed = (tasks || []).filter(t => t.status === 'done').map(t => ({ ...t }));
    const chunkSize = Math.max(15, Math.min(180, Number(focusBlockMinutes) || 50));
    const expanded = pending.flatMap(task => splitTask(task, Math.min(chunkSize, Math.max(15, dailyBudget)), makeId)).sort((a, b) => sortByDate(a, b, 'dueDate') || ({ high: 0, medium: 1, low: 2 }[a.priority] ?? 1) - ({ high: 0, medium: 1, low: 2 }[b.priority] ?? 1));
    const output = [];
    const unscheduled = [];
    expanded.forEach(task => {
      const duration = Math.max(5, Number(task.minutes) || 45);
      let preferred = days;
      if (task.dueDate && task.dueDate >= todayDate) { const before = days.filter(d => d <= task.dueDate); if (before.length) preferred = before; }
      let chosen = preferred.find(d => capacity[d] - load[d] >= duration);
      if (!chosen) chosen = days.find(d => capacity[d] - load[d] >= duration);
      if (!chosen) { unscheduled.push({ ...task, planDate: '' }); return; }
      load[chosen] += duration; output.push({ ...task, planDate: chosen });
    });
    return { tasks: [...completed, ...output, ...unscheduled], load, capacity, scheduledCount: output.length, unscheduledCount: unscheduled.length, plannedMinutes: output.reduce((sum, t) => sum + t.minutes, 0) };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { calculateReview, calculateWeightedGrade, requiredScore, splitTask, scheduleWithCapacity, minutesFromTimes };
  if (!root.document) return;

  const defaults = () => ({ schema: 1, events: [], blocks: [], flashcards: [], revisions: [], notes: [], habits: [], assessments: [], goals: [], settings: { theme: 'light', studyBlockMinutes: 50, notifications: false, sentReminders: [] } });
  function normalizeExtras(input) {
    const base = defaults(); const x = input && typeof input === 'object' ? input : {};
    const arr = key => Array.isArray(x[key]) ? x[key] : [];
    return {
      ...base,
      events: arr('events').filter(e => e && typeof e.title === 'string' && validDate(e.date)).map(e => ({ ...e, id: String(e.id || uid('event')), title: e.title.slice(0, 140), date: e.date, startTime: validTime(e.startTime) ? e.startTime : '', endTime: validTime(e.endTime) ? e.endTime : '', kind: ['event', 'exam', 'personal'].includes(e.kind) ? e.kind : 'event', subjectId: String(e.subjectId || ''), notes: String(e.notes || '').slice(0, 1500) })),
      blocks: arr('blocks').filter(b => b && Number.isInteger(Number(b.day)) && Number(b.day) >= 0 && Number(b.day) <= 6 && validTime(b.start) && validTime(b.end) && minutesFromTimes(b.start, b.end) > 0).map(b => ({ ...b, id: String(b.id || uid('block')), day: Number(b.day), label: String(b.label || 'Study block').slice(0, 100), start: String(b.start), end: String(b.end), kind: BLOCK_KINDS.includes(b.kind) ? b.kind : 'study' })),
      flashcards: arr('flashcards').filter(c => c && typeof c.front === 'string' && typeof c.back === 'string').map(c => ({ ...c, id: String(c.id || uid('card')), deck: String(c.deck || 'General').slice(0, 80), subjectId: String(c.subjectId || ''), front: c.front.slice(0, 1000), back: c.back.slice(0, 3000), dueDate: validDate(c.dueDate) ? c.dueDate : today(), interval: Math.max(0, Number(c.interval) || 0), ease: Math.max(1.3, Number(c.ease) || 2.5), repetitions: Math.max(0, Number(c.repetitions) || 0), reviewCount: Math.max(0, Number(c.reviewCount) || 0), reviewHistory: Array.isArray(c.reviewHistory) ? c.reviewHistory.slice(-365) : [], createdAt: c.createdAt || new Date().toISOString() })),
      revisions: arr('revisions').filter(r => r && typeof r.topic === 'string').map(r => ({ ...r, id: String(r.id || uid('rev')), subjectId: String(r.subjectId || ''), topicId: String(r.topicId || ''), topic: r.topic.slice(0, 180), dueDate: validDate(r.dueDate) ? r.dueDate : today(), interval: Math.max(0, Number(r.interval) || 0), ease: Math.max(1.3, Number(r.ease) || 2.5), repetitions: Math.max(0, Number(r.repetitions) || 0), reviewCount: Math.max(0, Number(r.reviewCount) || 0), reviewHistory: Array.isArray(r.reviewHistory) ? r.reviewHistory.slice(-365) : [] })),
      notes: arr('notes').filter(n => n && typeof n.title === 'string').map(n => ({ ...n, id: String(n.id || uid('note')), title: n.title.slice(0, 160), subjectId: String(n.subjectId || ''), tags: Array.isArray(n.tags) ? n.tags.map(t => String(t).slice(0, 40)).slice(0, 20) : [], content: String(n.content || '').slice(0, 50000), url: safeUrl(String(n.url || '')), pinned: Boolean(n.pinned), createdAt: n.createdAt || new Date().toISOString(), updatedAt: n.updatedAt || new Date().toISOString() })),
      habits: arr('habits').filter(h => h && typeof h.name === 'string').map(h => ({ ...h, id: String(h.id || uid('habit')), name: h.name.slice(0, 100), targetDays: Math.max(1, Math.min(7, Number(h.targetDays) || 5)), color: ['#7665df','#2da887','#e6a04f','#4e8fe5','#e06f80','#b16acb','#7f91a8'].includes(h.color) ? h.color : '#7665df', logs: Array.isArray(h.logs) ? [...new Set(h.logs.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)))].slice(-500) : [] })),
      assessments: arr('assessments').filter(a => a && typeof a.title === 'string' && validDate(a.date)).map(a => { const maxScore = Math.max(1, Number(a.maxScore) || 100); const rawScore = a.score === '' || a.score == null ? null : Number(a.score); return ({ ...a, id: String(a.id || uid('exam')), title: a.title.slice(0, 140), subjectId: String(a.subjectId || ''), date: a.date, kind: ['exam', 'quiz', 'assignment', 'mock', 'other'].includes(a.kind) ? a.kind : 'exam', score: rawScore === null || !Number.isFinite(rawScore) || rawScore < 0 || rawScore > maxScore ? null : rawScore, maxScore, weight: Math.max(0, Math.min(100, Number(a.weight) || 0)), notes: String(a.notes || '').slice(0, 1200) }); }),
      goals: arr('goals').filter(g => g && typeof g.title === 'string').map(g => ({ ...g, id: String(g.id || uid('goal')), title: g.title.slice(0, 140), metric: ['minutes', 'tasks', 'topics', 'cards'].includes(g.metric) ? g.metric : 'minutes', target: Math.max(1, Number(g.target) || 1), startDate: validDate(g.startDate) ? g.startDate : today(), dueDate: validDate(g.dueDate) ? g.dueDate : addDate(today(), 30), completed: Boolean(g.completed), createdAt: g.createdAt || new Date().toISOString() })),
      settings: { ...base.settings, ...(x.settings || {}), studyBlockMinutes: Math.max(15, Math.min(180, Number(x.settings?.studyBlockMinutes) || 50)), notifications: Boolean(x.settings?.notifications), sentReminders: Array.isArray(x.settings?.sentReminders) ? x.settings.sentReminders.slice(-500) : [], theme: x.settings?.theme === 'dark' ? 'dark' : 'light' }
    };
  }

  function seedExtras() {
    const subs = subjects(); const pick = name => subs.find(s => s.name.toLowerCase().includes(name))?.id || '';
    const todayDate = today();
    const cards = [
      { deck: 'Mathematics · Fundamentals', subjectId: pick('mathematics'), front: 'What is the determinant of a 2×2 matrix [[a,b],[c,d]]?', back: 'ad − bc. A matrix is singular when its determinant is zero.' },
      { deck: 'Mathematics · Fundamentals', subjectId: pick('mathematics'), front: 'When is a square matrix invertible?', back: 'When its determinant is non-zero; equivalently, its rank is full.' },
      { deck: 'Physics · Quick recall', subjectId: pick('physics'), front: 'What is the relationship between wave speed, frequency, and wavelength?', back: 'v = fλ. Keep units consistent: metres per second, hertz, and metres.' },
      { deck: 'Physics · Quick recall', subjectId: pick('physics'), front: 'What is the SI unit of electrical resistance?', back: 'The ohm (Ω). From Ohm’s law, R = V / I.' },
      { deck: 'Programming · Concepts', subjectId: pick('programming'), front: 'What is recursion?', back: 'A technique in which a function calls itself on a smaller subproblem, with a base case that stops the recursion.' },
      { deck: 'Programming · Concepts', subjectId: pick('programming'), front: 'What two things must a correct recursive function define?', back: 'A base case and a recursive step that moves toward the base case.' },
      { deck: 'Chemistry · Quick recall', subjectId: pick('chemistry'), front: 'What is a core aim of green chemistry?', back: 'Prevent waste and reduce or eliminate hazardous substances through the design of chemical products and processes.' }
    ].map(c => ({ ...c, id: uid('card'), dueDate: todayDate, interval: 0, ease: 2.5, repetitions: 0, reviewCount: 0, reviewHistory: [], createdAt: new Date().toISOString() }));
    const revisions = subs.flatMap(s => (s.topics || []).map(t => ({ id: uid('rev'), subjectId: s.id, topicId: t.id, topic: t.name, dueDate: todayDate, interval: 0, ease: 2.5, repetitions: 0, reviewCount: 0, reviewHistory: [] })));
    const notes = [
      { title: 'How to use spaced repetition', subjectId: '', tags: ['revision', 'study-method'], content: 'Recall first, check the answer second. Rate each topic honestly: Again if you could not retrieve it, Hard if recall was slow, Good if it came back with effort, and Easy if it was immediate. The review interval is a suggestion; move it when needed.' },
      { title: 'Matrix revision checklist', subjectId: pick('mathematics'), tags: ['formula', 'checklist'], content: `• Check matrix dimensions before multiplying.
• For a 2×2 determinant, use ad − bc.
• An inverse requires a non-zero determinant.
• Verify an inverse by multiplying A × A⁻¹ and checking for the identity matrix.` },
      { title: 'Active recall session template', subjectId: '', tags: ['workflow', 'revision'], content: `1. Close the notes.
2. Write everything you remember about one topic.
3. Solve one problem without looking at the worked solution.
4. Compare against the source and correct gaps.
5. Turn the missed idea into a flashcard or a short revision task.` }
    ].map(n => ({ ...n, id: uid('note'), pinned: n.tags.includes('checklist'), url: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
    const habits = [
      { id: uid('habit'), name: '10 minutes of formula recall', targetDays: 5, color: '#7665df', logs: [] },
      { id: uid('habit'), name: 'Solve a problem without notes', targetDays: 4, color: '#2da887', logs: [] },
      { id: uid('habit'), name: 'Plan tomorrow before stopping', targetDays: 5, color: '#e6a04f', logs: [] }
    ];
    return normalizeExtras({ ...defaults(), flashcards: cards, revisions, notes, habits,
      events: [{ id: uid('event'), title: 'Weekly review & reset', date: addDate(todayDate, 2), startTime: '18:00', endTime: '18:30', kind: 'event', subjectId: '', notes: 'Review what worked, move unfinished tasks, and choose next week’s priorities.' }],
      assessments: [{ id: uid('exam'), title: 'Physics practice mock', subjectId: pick('physics'), date: addDate(todayDate, 6), kind: 'mock', score: null, maxScore: 100, weight: 0, notes: 'Demo entry — edit or delete it when setting up your real exam plan.' }],
      goals: [{ id: uid('goal'), title: 'Build 12 focused hours', metric: 'minutes', target: 720, startDate: addDate(todayDate, -6), dueDate: addDate(todayDate, 6), completed: false, createdAt: new Date().toISOString() },
        { id: uid('goal'), title: 'Finish 8 syllabus topics', metric: 'topics', target: 8, startDate: todayDate, dueDate: addDate(todayDate, 30), completed: false, createdAt: new Date().toISOString() }]
    });
  }
  let data = defaults();
  try { const existing = localStorage.getItem(FEATURE_KEY); data = existing ? normalizeExtras(JSON.parse(existing)) : seedExtras(); if (!existing) localStorage.setItem(FEATURE_KEY, JSON.stringify(data)); } catch (_) { data = defaults(); }
  let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
  let selectedCalendarDate = today();
  let selectedNoteId = null;
  let flashStudy = { queue: [], index: 0, flipped: false };
  let searchReturnFocus = null;

  function core() { return root.StudyOSCore?.getState ? root.StudyOSCore.getState() : { subjects: [], tasks: [], focusLogs: [], preferences: { dailyBudget: 180 } }; }
  function coreAPI() { return root.StudyOSCore || null; }
  function subjects() { return core().subjects || []; }
  function tasks() { return core().tasks || []; }
  function subjectName(id) { return subjects().find(s => s.id === id)?.name || 'General'; }
  function subjectSelect(name = 'subjectId', selected = '') { return `<select class="input" name="${esc(name)}"><option value="">General / no subject</option>${subjects().map(s => `<option value="${esc(s.id)}" ${s.id === selected ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>`; }
  function notice(message, kind) { coreAPI()?.toast?.(message, kind); }
  function saveFeatures(shouldRender = true) { try { localStorage.setItem(FEATURE_KEY, JSON.stringify(data)); } catch (_) { notice('Could not save extra features: browser storage may be blocked or full.', 'error'); } if (shouldRender) render(activeView()); }
  function activeView() { return $('.view.active')?.id?.replace(/^view-/, '') || 'today'; }
  function updateNavBadges() {
    const badge = $('#revision-nav-count');
    if (!badge) return;
    const dueRevisions = data.revisions.filter(item => item.dueDate <= today()).length;
    const dueCards = data.flashcards.filter(item => item.dueDate <= today()).length;
    const count = dueRevisions + dueCards;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = count === 0;
    badge.setAttribute('aria-label', `${count} items due for review`);
  }
  function render(view) {
    applyTheme(); updateNavBadges();
    const current = view || activeView();
    if (current === 'calendar') renderCalendar();
    if (current === 'revision') renderRevision();
    if (current === 'flashcards') renderFlashcards();
    if (current === 'exams') renderExams();
    if (current === 'notes') renderNotes();
    if (current === 'habits') renderHabits();
    if (current === 'timetable') renderTimetable();
    if (current === 'goals') renderGoals();
    checkReminders();
  }

  function ensureDialogs() {
    if (!$('#feature-modal')) document.body.insertAdjacentHTML('beforeend', '<div class="feature-modal-backdrop" id="feature-modal" hidden><section class="feature-modal-card" role="dialog" aria-modal="true" aria-labelledby="feature-modal-title"><div class="feature-modal-head"><div><span id="feature-modal-kicker">STUDYOS TOOLKIT</span><h2 id="feature-modal-title">Add item</h2></div><button class="icon-button" type="button" data-feature-action="close-modal" aria-label="Close dialog">×</button></div><div id="feature-modal-body"></div></section></div>');
    if (!$('#command-palette')) document.body.insertAdjacentHTML('beforeend', '<div class="command-backdrop" id="command-palette" hidden><section class="command-panel" role="dialog" aria-modal="true" aria-label="Quick find"><div class="command-search-line"><span>⌕</span><input id="command-search" type="search" placeholder="Search tasks, notes, cards, exams…" autocomplete="off"><kbd>ESC</kbd></div><div id="command-results" class="command-results"></div><div class="command-footer"><span>↵ Open result</span><span>Ctrl / ⌘ K to open anywhere</span></div></section></div>');
  }

  function openModal(title, kicker, formHtml) {
    ensureDialogs();
    $('#feature-modal-title').textContent = title; $('#feature-modal-kicker').textContent = kicker || 'STUDYOS TOOLKIT'; $('#feature-modal-body').innerHTML = formHtml;
    $('#feature-modal').hidden = false;
    const first = $('#feature-modal-body input, #feature-modal-body select, #feature-modal-body textarea'); if (first) first.focus();
  }
  function closeModal() { if ($('#feature-modal')) { $('#feature-modal').hidden = true; $('#feature-modal-body').innerHTML = ''; } }
  function field(label, name, value = '', type = 'text', extra = '') { return `<label class="feature-form-field"><span>${esc(label)}</span><input class="input" type="${esc(type)}" name="${esc(name)}" value="${esc(value)}" ${extra}></label>`; }
  function textarea(label, name, value = '', placeholder = '') { return `<label class="feature-form-field"><span>${esc(label)}</span><textarea class="input" name="${esc(name)}" rows="4" placeholder="${esc(placeholder)}">${esc(value)}</textarea></label>`; }
  function formFooter(label = 'Save') { return `<div class="feature-form-actions"><button class="button button-secondary" type="button" data-feature-action="close-modal">Cancel</button><button class="button button-primary" type="submit">${esc(label)}</button></div>`; }
  function safeUrl(value) { if (!value) return ''; try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch (_) { return ''; } }
  function dateBadge(date) { const d = dateDiff(date, today()); return d < 0 ? `<span class="date-badge overdue">${Math.abs(d)}d overdue</span>` : d === 0 ? '<span class="date-badge today-badge">Today</span>' : d === 1 ? '<span class="date-badge">Tomorrow</span>' : `<span class="date-badge">${shortDate(date)}</span>`; }
  function metricCard(value, label, sub, icon = '✳') { return `<article class="feature-metric-card"><span class="metric-icon">${icon}</span><div><strong>${esc(value)}</strong><small>${esc(label)}</small><p>${esc(sub)}</p></div></article>`; }
  function noItems(icon, title, message) { return `<div class="feature-empty"><span>${icon}</span><b>${esc(title)}</b><p>${esc(message)}</p></div>`; }

  // CALENDAR — tasks, events, assessments, subject exams and recurring timetable blocks.
  function calendarItems(date) {
    const out = [];
    tasks().forEach(t => { if (t.status !== 'done' && t.planDate === date) out.push({ kind: 'task', title: t.title, subjectId: t.subjectId, subtitle: `${t.minutes} min planned`, id: t.id, date }); if (t.status !== 'done' && t.dueDate === date && t.planDate !== date) out.push({ kind: 'deadline', title: `${t.title} · deadline`, subjectId: t.subjectId, subtitle: 'Task deadline', id: t.id, date }); });
    data.events.filter(e => e.date === date).forEach(e => out.push({ kind: e.kind || 'event', title: e.title, subjectId: e.subjectId, subtitle: [e.startTime && e.endTime ? `${e.startTime}–${e.endTime}` : e.startTime || '', e.notes].filter(Boolean).join(' · '), id: e.id, date }));
    data.assessments.filter(a => a.date === date).forEach(a => out.push({ kind: 'exam', title: a.title, subjectId: a.subjectId, subtitle: `${a.kind[0].toUpperCase() + a.kind.slice(1)}${a.weight ? ` · ${a.weight}% weight` : ''}`, id: a.id, date }));
    subjects().filter(s => s.examDate === date && !data.assessments.some(a => a.date === date && a.subjectId === s.id)).forEach(s => out.push({ kind: 'exam', title: `${s.name} exam`, subjectId: s.id, subtitle: 'Subject exam date', id: s.id, date }));
    const day = (dateObj(date).getDay() + 6) % 7;
    data.blocks.filter(b => b.day === day).forEach(b => out.push({ kind: `block-${b.kind}`, title: b.label, subjectId: '', subtitle: `${b.start}–${b.end} · ${b.kind === 'study' ? 'Study window' : b.kind === 'class' ? 'Class / lecture' : 'Personal time'}`, id: b.id, date }));
    return out.sort((a, b) => String(a.subtitle).localeCompare(String(b.subtitle)));
  }
  function renderCalendar() {
    if (!$('#calendar-grid')) return;
    $('#calendar-month-title').textContent = calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1, 12); const monOffset = (first.getDay() + 6) % 7; const start = new Date(first); start.setDate(first.getDate() - monOffset);
    const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return toDateString(d); });
    $('#calendar-grid').innerHTML = days.map(d => {
      const items = calendarItems(d); const dayDate = dateObj(d); const other = dayDate.getMonth() !== calendarMonth.getMonth();
      const classes = ['calendar-day', other ? 'other-month' : '', d === today() ? 'is-today' : '', d === selectedCalendarDate ? 'is-selected' : ''].filter(Boolean).join(' ');
      return `<button type="button" class="${classes}" data-calendar-date="${d}" aria-label="${esc(fullDate(d))}, ${items.length} items"><span class="calendar-day-num">${dayDate.getDate()}</span><span class="calendar-day-markers">${items.slice(0, 3).map(i => `<i class="cal-marker ${esc(i.kind)}" title="${esc(i.title)}"></i>`).join('')}</span>${items.length ? `<small>${items.length} item${items.length === 1 ? '' : 's'}</small>` : '<small class="calendar-day-empty">·</small>'}</button>`;
    }).join('');
    renderAgenda(); renderCalendarUpcoming();
  }
  function renderAgenda() {
    $('#calendar-agenda-title').textContent = selectedCalendarDate === today() ? 'Today’s agenda' : fullDate(selectedCalendarDate).split(',').slice(0, 2).join(',');
    $('#calendar-agenda-subtitle').textContent = fullDate(selectedCalendarDate);
    const items = calendarItems(selectedCalendarDate); $('#calendar-agenda-count').textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;
    $('#calendar-agenda-list').innerHTML = items.length ? items.map(i => `<article class="agenda-item"><i class="agenda-kind ${esc(i.kind)}"></i><div class="agenda-copy"><b>${esc(i.title)}</b><p>${esc(i.subtitle || subjectName(i.subjectId))}</p><small>${esc(subjectName(i.subjectId))}</small></div>${i.kind === 'task' || i.kind === 'deadline' ? `<button class="tiny-action" data-feature-action="open-task" data-id="${esc(i.id)}" title="Open task">↗</button>` : i.kind === 'event' || i.kind === 'personal' ? `<button class="tiny-action" data-feature-action="edit-event" data-id="${esc(i.id)}" title="Edit event">✎</button>` : ''}</article>`).join('') : noItems('◷', 'Nothing on this date', 'Add a study task or calendar event to give the day structure.');
  }
  function renderCalendarUpcoming() {
    const items = [];
    tasks().filter(t => t.status !== 'done' && t.dueDate && t.dueDate >= today()).forEach(t => items.push({ date: t.dueDate, kind: 'deadline', title: t.title, subjectId: t.subjectId }));
    data.events.filter(e => e.date >= today()).forEach(e => items.push({ date: e.date, kind: e.kind, title: e.title, subjectId: e.subjectId }));
    data.assessments.filter(a => a.date >= today()).forEach(a => items.push({ date: a.date, kind: 'exam', title: a.title, subjectId: a.subjectId }));
    subjects().filter(s => s.examDate >= today()).forEach(s => { if (!data.assessments.some(a => a.subjectId === s.id && a.date === s.examDate)) items.push({ date: s.examDate, kind: 'exam', title: `${s.name} exam`, subjectId: s.id }); });
    items.sort((a, b) => sortByDate(a, b)).splice(5);
    $('#calendar-upcoming').innerHTML = items.length ? items.map(i => `<article class="upcoming-item"><span class="upcoming-date"><b>${dateObj(i.date).getDate()}</b><small>${dateObj(i.date).toLocaleDateString(undefined, { month: 'short' })}</small></span><div><b>${esc(i.title)}</b><small>${esc(subjectName(i.subjectId))}</small></div><span class="upcoming-type ${esc(i.kind)}">${esc(i.kind === 'exam' ? 'EXAM' : i.kind === 'deadline' ? 'DUE' : 'EVENT')}</span></article>`).join('') : noItems('✓', 'No upcoming deadlines', 'Add exam dates or task deadlines to see them here.');
  }
  function openEventModal(event = null, presetDate = selectedCalendarDate) {
    const e = event || { title: '', date: presetDate, startTime: '16:00', endTime: '17:00', kind: 'event', subjectId: '', notes: '' };
    openModal(event ? 'Edit calendar event' : 'Add calendar event', 'CALENDAR & DEADLINES', `<form class="feature-form" data-feature-form="event" data-id="${esc(event?.id || '')}">${field('Event title', 'title', e.title, 'text', 'required maxlength="140"')}${`<div class="feature-form-grid">${field('Date', 'date', e.date, 'date', 'required')}${field('Start time', 'startTime', e.startTime || '', 'time')}${field('End time', 'endTime', e.endTime || '', 'time')}<label class="feature-form-field"><span>Category</span><select name="kind" class="input">${[['event','Event'],['exam','Exam / important date'],['personal','Personal commitment']].map(([v,l])=>`<option value="${v}" ${e.kind===v?'selected':''}>${l}</option>`).join('')}</select></label><label class="feature-form-field"><span>Subject</span>${subjectSelect('subjectId', e.subjectId)}</label></div>`}${textarea('Notes (optional)', 'notes', e.notes || '', 'Room, link, materials, or anything to remember.')}${formFooter(event ? 'Save event' : 'Add event')}</form>`);
  }
  function exportCalendarICS() {
    const rows = [];
    const add = (uidValue, title, date, startTime, endTime, description, recurringDay = null) => {
      const dt = (d, t) => `${String(d).replaceAll('-', '')}T${String(t || '00:00').replace(':', '')}00`;
      rows.push('BEGIN:VEVENT', `UID:${icsEscape(uidValue)}@studyos.local`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`, `SUMMARY:${icsEscape(title)}`);
      if (startTime && endTime) { rows.push(`DTSTART:${dt(date, startTime)}`, `DTEND:${dt(date, endTime)}`); } else rows.push(`DTSTART;VALUE=DATE:${String(date).replaceAll('-', '')}`);
      if (description) rows.push(`DESCRIPTION:${icsEscape(description)}`);
      if (recurringDay !== null) rows.push('RRULE:FREQ=WEEKLY;BYDAY=' + ['MO','TU','WE','TH','FR','SA','SU'][recurringDay] + ';UNTIL=20301231T235959');
      rows.push('END:VEVENT');
    };
    tasks().filter(t => t.status !== 'done' && t.planDate).forEach(t => add(`task-${t.id}`, `Study: ${t.title}`, t.planDate, '', '', `${subjectName(t.subjectId)} · ${t.minutes} minutes`));
    tasks().filter(t => t.status !== 'done' && t.dueDate && t.dueDate !== t.planDate).forEach(t => add(`deadline-${t.id}`, `Deadline: ${t.title}`, t.dueDate, '', '', subjectName(t.subjectId)));
    data.events.forEach(e => add(`event-${e.id}`, e.title, e.date, e.startTime, e.endTime, `${e.kind} · ${subjectName(e.subjectId)}${e.notes ? ' · ' + e.notes : ''}`));
    data.assessments.forEach(a => add(`assessment-${a.id}`, `${a.kind.toUpperCase()}: ${a.title}`, a.date, '', '', `${subjectName(a.subjectId)}${a.weight ? ` · weight ${a.weight}%` : ''}`));
    subjects().filter(s => s.examDate && !data.assessments.some(a => a.subjectId === s.id && a.date === s.examDate)).forEach(s => add(`subject-exam-${s.id}`, `${s.name} exam`, s.examDate, '', '', 'Exam date from subject syllabus'));
    data.blocks.forEach(b => add(`block-${b.id}`, `${b.kind === 'study' ? 'Study' : b.kind === 'class' ? 'Class' : 'Personal'}: ${b.label}`, nextDateForWeekday(b.day), b.start, b.end, 'Recurring StudyOS timetable block', b.day));
    const content = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//StudyOS//Complete Study Workspace//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...rows, 'END:VCALENDAR'].join('\r\n');
    download('studyos-calendar.ics', content, 'text/calendar;charset=utf-8'); notice('Calendar exported. Import the .ics file into your calendar app.');
  }
  function icsEscape(v) { return String(v || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }

  // REVISION LAB — spaced recall for syllabus topics.
  function generateRevisions() {
    const existing = new Set(data.revisions.map(r => `${r.subjectId}|${r.topicId}`)); let added = 0;
    subjects().forEach(s => (s.topics || []).forEach(t => { const key = `${s.id}|${t.id}`; if (!existing.has(key)) { data.revisions.push({ id: uid('rev'), subjectId: s.id, topicId: t.id, topic: t.name, dueDate: today(), interval: 0, ease: 2.5, repetitions: 0, reviewCount: 0, reviewHistory: [] }); added += 1; } }));
    saveFeatures(); notice(added ? `Added ${added} syllabus topics to your revision queue.` : 'Every syllabus topic is already in the revision lab.');
  }
  function renderRevision() {
    if (!$('#revision-queue')) return;
    const due = data.revisions.filter(r => r.dueDate <= today()).sort((a,b)=>sortByDate(a,b));
    const upcoming = data.revisions.filter(r => r.dueDate > today()).sort((a,b)=>sortByDate(a,b));
    const reviews = data.revisions.reduce((n,r)=>n+(r.reviewCount||0),0); const mastered = data.revisions.filter(r=>r.interval>=21).length;
    $('#revision-metrics').innerHTML = [metricCard(due.length, 'Topics due now', 'Ready for active recall', '↻'), metricCard(upcoming.length, 'Scheduled later', 'Spaced across future days', '◷'), metricCard(reviews, 'Reviews logged', 'Across your review history', '✓'), metricCard(mastered, 'Long intervals', 'Topics with 3+ weeks between reviews', '✦')].join('');
    $('#revision-due-count').textContent = `${due.length} due`;
    const revisionBadge = $('#revision-nav-count'); const allDueCount = due.length + data.flashcards.filter(c => c.dueDate <= today()).length; revisionBadge.textContent = allDueCount > 99 ? '99+' : String(allDueCount); revisionBadge.hidden = allDueCount === 0;
    $('#revision-queue').innerHTML = due.length ? due.map(r => `<article class="revision-row"><span class="revision-symbol">↻</span><div class="revision-copy"><b>${esc(r.topic)}</b><small>${esc(subjectName(r.subjectId))} · ${r.reviewCount || 0} reviews</small><p>Last interval: ${r.interval || 0} day${r.interval === 1 ? '' : 's'} · Ease ${Number(r.ease || 2.5).toFixed(2)}</p></div><div class="revision-actions"><button class="review-rating again" data-feature-action="rate-revision" data-id="${esc(r.id)}" data-rating="again">Again</button><button class="review-rating hard" data-feature-action="rate-revision" data-id="${esc(r.id)}" data-rating="hard">Hard</button><button class="review-rating good" data-feature-action="rate-revision" data-id="${esc(r.id)}" data-rating="good">Good</button><button class="review-rating easy" data-feature-action="rate-revision" data-id="${esc(r.id)}" data-rating="easy">Easy</button></div></article>`).join('') : noItems('✦', 'Your review queue is clear', 'Generate a queue from your syllabus or enjoy the breathing room.');
    $('#revision-upcoming').innerHTML = upcoming.length ? upcoming.slice(0, 12).map(r => `<div class="feature-list-row"><div class="list-row-icon revision-icon">↻</div><div class="feature-row-main"><b>${esc(r.topic)}</b><small>${esc(subjectName(r.subjectId))} · interval ${r.interval} day${r.interval===1?'':'s'}</small></div><span class="row-date">${shortDate(r.dueDate)}</span></div>`).join('') : noItems('◷', 'Nothing scheduled ahead', 'Review a topic today and a future interval will be created automatically.');
  }
  function exportRevisions() { download('studyos-revision-log.csv', toCSV([['Topic','Subject','Next review','Interval days','Ease','Reviews','Last reviewed'], ...data.revisions.map(r=>[r.topic,subjectName(r.subjectId),r.dueDate,r.interval,r.ease,r.reviewCount||0,r.lastReviewed||''])]), 'text/csv;charset=utf-8'); }

  // FLASHCARDS — deck management plus active-recall study sessions.
  function decks() { return [...new Set(data.flashcards.map(c => c.deck).filter(Boolean))].sort((a,b)=>a.localeCompare(b)); }
  function renderFlashcards() {
    if (!$('#flashcard-library')) return;
    const cards = data.flashcards; const due = cards.filter(c=>c.dueDate<=today()).length; const reviewed = cards.reduce((n,c)=>n+(c.reviewCount||0),0); const mastered = cards.filter(c=>c.interval>=14).length;
    $('#flashcard-metrics').innerHTML = [metricCard(cards.length, 'Cards in library', `${decks().length} decks`, '▣'), metricCard(due, 'Due to review', 'Scheduled for today or earlier', '↻'), metricCard(reviewed, 'Reviews completed', 'Active-recall attempts logged', '✓'), metricCard(mastered, 'Long-term cards', 'Intervals of two weeks or more', '✦')].join('');
    const deckSelect = $('#flashcard-deck-filter'); const old = deckSelect.value || 'all'; deckSelect.innerHTML = `<option value="all">All decks</option>${decks().map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join('')}`; if ([...deckSelect.options].some(o=>o.value===old)) deckSelect.value=old;
    const search = ($('#flashcard-search').value || '').trim().toLowerCase(); const filtered = cards.filter(c => (deckSelect.value==='all'||c.deck===deckSelect.value) && `${c.front} ${c.back} ${c.deck} ${subjectName(c.subjectId)}`.toLowerCase().includes(search));
    $('#flashcard-library-subtitle').textContent = `${filtered.length} card${filtered.length===1?'':'s'} · ${decks().length} deck${decks().length===1?'':'s'}`;
    $('#flashcard-library').innerHTML = filtered.length ? filtered.map(c=>`<article class="flashcard-library-row"><div class="card-index">${(c.front||'?').slice(0,1).toUpperCase()}</div><div class="feature-row-main"><b>${esc(c.front)}</b><small>${esc(c.deck)} · ${esc(subjectName(c.subjectId))} · due ${shortDate(c.dueDate)}</small><p>${esc(c.back.slice(0,100))}${c.back.length>100?'…':''}</p></div><div class="row-action-group"><button class="tiny-action" data-feature-action="edit-card" data-id="${esc(c.id)}" title="Edit card">✎</button><button class="tiny-action danger-text" data-feature-action="delete-card" data-id="${esc(c.id)}" title="Delete card">×</button></div></article>`).join('') : noItems('▣', 'Your card library is waiting', 'Create cards for formulas, definitions, tricky concepts, and facts you want to retrieve from memory.');
    renderStudyCard();
  }
  function renderStudyCard() {
    const area = $('#flashcard-study-area'); if (!area) return;
    const current = flashStudy.queue[flashStudy.index] ? data.flashcards.find(c=>c.id===flashStudy.queue[flashStudy.index]) : null;
    if (!current) { area.innerHTML = `<div class="study-session-empty"><div class="study-session-orbit">✦</div><h3>${flashStudy.queue.length ? 'Session complete' : 'Ready when you are.'}</h3><p>${flashStudy.queue.length ? `You reviewed ${flashStudy.queue.length} card${flashStudy.queue.length===1?'':'s'} in this session.` : 'Choose a deck above, then start a review session. Due cards are prioritised first.'}</p><button class="button button-primary" id="flashcards-start-study" ${data.flashcards.length?'':'disabled'}>▶ ${flashStudy.queue.length?'Study again':'Start study session'}</button></div>`; return; }
    const index = flashStudy.index + 1; const flipped = flashStudy.flipped;
    area.innerHTML = `<div class="study-session-progress"><span>Card ${index} of ${flashStudy.queue.length}</span><div><i style="width:${index/flashStudy.queue.length*100}%"></i></div><button class="text-button" data-feature-action="end-flash-session">End session</button></div><button type="button" class="flashcard-face ${flipped?'is-flipped':''}" data-feature-action="flip-card"><span class="flashcard-face-label">${flipped?'ANSWER':'PROMPT'}</span><strong>${esc(flipped?current.back:current.front)}</strong><small>${flipped?'Think about how well you recalled it.':'Try to answer before revealing.'}</small><span class="flashcard-flip-hint">${flipped?'◉ Answer revealed':'↻ Tap to reveal'}</span></button>${flipped?`<div class="flashcard-rating-row"><p>How well did you recall it?</p><div><button class="review-rating again" data-feature-action="rate-flashcard" data-rating="again" data-id="${esc(current.id)}">Again</button><button class="review-rating hard" data-feature-action="rate-flashcard" data-rating="hard" data-id="${esc(current.id)}">Hard</button><button class="review-rating good" data-feature-action="rate-flashcard" data-rating="good" data-id="${esc(current.id)}">Good</button><button class="review-rating easy" data-feature-action="rate-flashcard" data-rating="easy" data-id="${esc(current.id)}">Easy</button></div></div>`:`<button class="button button-primary full-width reveal-answer-button" data-feature-action="flip-card">Reveal answer ↗</button>`}`;
  }
  function openCardModal(card = null) {
    const c = card || { deck: decks()[0] || 'General', subjectId: '', front: '', back: '' };
    openModal(card?'Edit flashcard':'Create flashcard','ACTIVE RECALL · CARD BUILDER',`<form class="feature-form" data-feature-form="card" data-id="${esc(card?.id||'')}">${field('Deck name','deck',c.deck||'General','text','required maxlength="80" placeholder="e.g. Physics formulas"')}<label class="feature-form-field"><span>Subject (optional)</span>${subjectSelect('subjectId',c.subjectId)}</label>${textarea('Prompt / front','front',c.front,'What question should you be able to answer?')} ${textarea('Answer / back','back',c.back,'Explain the answer in your own words or include a formula.')}<p class="helper-copy">Keep one concept per card. Short prompts make active recall more effective.</p>${formFooter(card?'Save flashcard':'Create flashcard')}</form>`);
  }
  function startFlashStudy() {
    const selected = $('#flashcard-deck-filter')?.value || 'all'; const all = data.flashcards.filter(c=>selected==='all'||c.deck===selected).sort((a,b)=>(a.dueDate<=today()?0:1)-(b.dueDate<=today()?0:1)||sortByDate(a,b,'dueDate'));
    if (!all.length) return notice('Add a flashcard before starting a study session.','error');
    flashStudy={queue:all.map(c=>c.id),index:0,flipped:false}; renderStudyCard();
  }
  function rateCard(id, rating) { const i=data.flashcards.findIndex(c=>c.id===id); if(i<0)return; data.flashcards[i]=calculateReview(data.flashcards[i],rating); const wasEnd=flashStudy.index>=flashStudy.queue.length-1; flashStudy.index+=1;flashStudy.flipped=false;saveFeatures(); if(wasEnd)notice('Flashcard session complete. Review dates have been updated.'); }
  function exportCards() { download('studyos-flashcards.csv',toCSV([['Deck','Subject','Front','Back','Next review','Interval days','Ease','Reviews'],...data.flashcards.map(c=>[c.deck,subjectName(c.subjectId),c.front,c.back,c.dueDate,c.interval,c.ease,c.reviewCount])]),'text/csv;charset=utf-8'); }

  // EXAM CENTER — assessments, deadlines, grade tracking and score target math.
  function gradedAssessments() { return data.assessments.filter(a=>a.score!==null && a.maxScore>0); }
  function renderExams() {
    if (!$('#exam-list')) return;
    const upcoming = data.assessments.filter(a=>a.date>=today()).sort((a,b)=>sortByDate(a,b)).slice(0,5); const next = upcoming[0]; const grade = calculateWeightedGrade(data.assessments); const overdue = data.assessments.filter(a=>a.date<today() && (a.score===null || a.score==='')).length;
    $('#exam-next-hero').innerHTML = next ? `<div class="exam-hero-mark">⚑</div><div><span class="eyebrow">NEXT ASSESSMENT</span><h2>${esc(next.title)}</h2><p>${esc(subjectName(next.subjectId))} · ${fullDate(next.date)} · ${esc(next.kind)}</p></div><div class="exam-countdown"><strong>${dateDiff(next.date,today())}</strong><small>day${dateDiff(next.date,today())===1?'':'s'} to go</small></div>` : `<div class="exam-hero-mark">⚑</div><div><span class="eyebrow">YOUR EXAM TIMELINE</span><h2>No upcoming assessments yet</h2><p>Add an exam, quiz, assignment, or mock test and keep its score here.</p></div><button class="button button-primary" id="exam-hero-add">＋ Add assessment</button>`;
    $('#exam-summary').innerHTML = [metricCard(data.assessments.length,'Assessments tracked',`${upcoming.length} upcoming`, '⚑'),metricCard(grade.average===null?'—':`${grade.average}%`,'Weighted average',`${grade.weight}% of grade recorded`,'↗'),metricCard(gradedAssessments().length,'Scores recorded','Use real marks when available','✓'),metricCard(overdue,'Past dates without scores','Check whether to record or reschedule','◷')].join('');
    const filter=$('#exam-filter').value; const list=data.assessments.filter(a=>filter==='upcoming'?a.date>=today():filter==='graded'?a.score!==null&&a.score!=='':true).sort((a,b)=>sortByDate(a,b));
    $('#exam-list').innerHTML = list.length ? list.map(a=>{const hasScore=a.score!==null&&a.score!=='';const pct=hasScore?Math.round(Number(a.score)/Number(a.maxScore)*100):null;return `<article class="exam-row"><span class="exam-kind-mark ${esc(a.kind)}">${a.kind==='exam'?'⚑':a.kind==='quiz'?'?':a.kind==='mock'?'◉':'▤'}</span><div class="feature-row-main"><b>${esc(a.title)}</b><small>${esc(subjectName(a.subjectId))} · ${esc(a.kind)} · ${shortDate(a.date)}${a.weight?` · ${a.weight}% weight`:''}</small>${hasScore?`<div class="exam-score-line"><div class="progress-track"><span style="width:${Math.min(100,pct)}%;background:${pct>=75?'#259b78':pct>=50?'#e99a46':'#df5b6c'}"></span></div><strong>${esc(a.score)} / ${esc(a.maxScore)} <span>(${pct}%)</span></strong></div>`:dateBadge(a.date)}</div><div class="row-action-group"><button class="tiny-action" data-feature-action="edit-assessment" data-id="${esc(a.id)}" title="Edit assessment">✎</button><button class="tiny-action danger-text" data-feature-action="delete-assessment" data-id="${esc(a.id)}" title="Delete assessment">×</button></div></article>`}).join('') : noItems('⚑','No matching assessments','Add an exam or change the filter to see your assessment list.');
  }
  function openAssessmentModal(a=null) {
    const x=a||{title:'',subjectId:'',date:today(),kind:'exam',score:'',maxScore:100,weight:0,notes:''};
    openModal(a?'Edit assessment':'Add assessment','EXAMS · QUIZZES · MOCK TESTS',`<form class="feature-form" data-feature-form="assessment" data-id="${esc(a?.id||'')}">${field('Assessment name','title',x.title,'text','required maxlength="140"')}<div class="feature-form-grid"><label class="feature-form-field"><span>Subject</span>${subjectSelect('subjectId',x.subjectId)}</label><label class="feature-form-field"><span>Type</span><select name="kind" class="input">${['exam','quiz','assignment','mock','other'].map(k=>`<option value="${k}" ${x.kind===k?'selected':''}>${k[0].toUpperCase()+k.slice(1)}</option>`).join('')}</select></label>${field('Date','date',x.date,'date','required')}${field('Score (leave blank if unknown)','score',x.score==null?'':x.score,'number','min="0" step="0.01"')}${field('Maximum marks','maxScore',x.maxScore||100,'number','min="1" max="100000" step="0.01" required')}${field('Weight in final grade (%)','weight',x.weight||0,'number','min="0" max="100" step="0.1"')}</div>${textarea('Notes (optional)','notes',x.notes||'','Syllabus, format, preparation pointers…')}${formFooter(a?'Save assessment':'Add assessment')}</form>`);
  }
  function calculateTargetForm() { const target=Number($('#grade-target-percent').value); const weight=Number($('#grade-remaining-weight').value); if(!(target>0&&target<=100&&weight>0&&weight<=100)){notice('Enter a target between 1–100% and a remaining weight between 1–100%.','error');return;} const result=requiredScore(data.assessments,target,weight); let message=result.alreadyReached?`You have already accumulated at least ${target}% in weighted points; confirm your syllabus weighting before relying on this result.`:result.impossible?`You would need ${result.needed}% on the remaining ${weight}% of the grade, which is not achievable with a score capped at 100%.`: `You need about ${result.needed}% on the remaining ${weight}% of the grade to reach ${target}% overall.`; $('#grade-target-result').innerHTML=`<span class="grade-result-kicker">ESTIMATED REQUIRED SCORE</span><strong class="${result.impossible?'grade-impossible':''}">${result.alreadyReached?'0':result.needed}%</strong><p>${esc(message)}</p><small>Recorded weighted points: ${result.currentContribution.toFixed(2)} · Recorded weight: ${result.gradedWeight.toFixed(1)}%</small>`; }

  // NOTES VAULT — local notes, links, tags, pinning and editing.
  function renderNotes() {
    if (!$('#notes-list')) return;
    const sel=$('#notes-subject-filter'); const old=sel.value||'all'; sel.innerHTML=`<option value="all">All subjects</option>${subjects().map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}`; if([...sel.options].some(o=>o.value===old))sel.value=old;
    const q=($('#notes-search').value||'').trim().toLowerCase(); const subjectFilter=sel.value; const filtered=data.notes.filter(n=>(subjectFilter==='all'||n.subjectId===subjectFilter)&&`${n.title} ${n.content} ${(n.tags||[]).join(' ')} ${subjectName(n.subjectId)}`.toLowerCase().includes(q)).sort((a,b)=>(b.pinned-a.pinned)||String(b.updatedAt).localeCompare(String(a.updatedAt)));
    $('#notes-count').textContent=`${filtered.length} note${filtered.length===1?'':'s'} · ${data.notes.filter(n=>n.pinned).length} pinned`;
    $('#notes-list').innerHTML=filtered.length?filtered.map(n=>`<button type="button" class="note-list-item ${selectedNoteId===n.id?'selected':''}" data-feature-action="select-note" data-id="${esc(n.id)}"><span class="note-list-pin">${n.pinned?'◆':'▤'}</span><span class="note-list-main"><b>${esc(n.title)}</b><small>${esc(subjectName(n.subjectId))} · ${shortDate(String(n.updatedAt).slice(0,10))}</small><span>${esc(n.content.slice(0,75))}${n.content.length>75?'…':''}</span><span class="tag-list">${(n.tags||[]).slice(0,3).map(t=>`<i>${esc(t)}</i>`).join('')}</span></span></button>`).join(''):noItems('▤','No notes found','Create notes or save useful resource links. Search matches note text and tags.');
    renderNoteEditor();
  }
  function renderNoteEditor() {
    const panel=$('#note-editor'); const n=data.notes.find(x=>x.id===selectedNoteId);
    if(!n){panel.innerHTML=`<div class="note-editor-empty"><div class="empty-state-icon">▤</div><h2>Your knowledge, in one place.</h2><p>Create a note or select one from the left. Notes remain in your browser until you export them.</p><button class="button button-primary" id="note-first-create">＋ Create your first note</button></div>`;return;}
    const link=safeUrl(n.url);
    panel.innerHTML=`<form class="note-editor-form" data-feature-form="note-edit" data-id="${esc(n.id)}"><div class="note-editor-top"><span class="note-editor-kicker">${esc(subjectName(n.subjectId))} · UPDATED ${esc(new Date(n.updatedAt).toLocaleDateString())}</span><div class="row-action-group"><button type="button" class="button button-secondary" data-feature-action="toggle-note-pin" data-id="${esc(n.id)}">${n.pinned?'◆ Pinned':'◇ Pin note'}</button><button type="button" class="button button-secondary" data-feature-action="export-single-note" data-id="${esc(n.id)}">↓ Export</button></div></div>${field('Title','title',n.title,'text','required maxlength="160"')}<div class="feature-form-grid"><label class="feature-form-field"><span>Subject</span>${subjectSelect('subjectId',n.subjectId)}</label>${field('Tags · comma separated','tags',(n.tags||[]).join(', '),'text','maxlength="300" placeholder="formula, exam, important"')}</div>${link?`<p class="note-resource-link">↗ <a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${esc(n.url)}</a></p>`:''}${textarea('Note / resource summary','content',n.content,'Write definitions, solved examples, revision summaries, or decisions. Plain text is supported.')}${!n.url?field('Resource URL (optional)','url','','url','placeholder="https://…"'):field('Resource URL (optional)','url',n.url,'url','placeholder="https://…"')}<div class="note-editor-footer"><span>Saved locally when you click Save.</span><div class="row-action-group"><button type="button" class="button button-danger" data-feature-action="delete-note" data-id="${esc(n.id)}">Delete note</button><button type="submit" class="button button-primary">Save note</button></div></div></form>`;
  }
  function openNoteModal(note=null, linkOnly=false) {
    const n=note||{title:linkOnly?'Useful resource':'',subjectId:'',tags:[],content:'',url:''};
    openModal(note?'Edit note':linkOnly?'Save a resource link':'Create note', 'NOTES VAULT · LOCAL KNOWLEDGE BASE', `<form class="feature-form" data-feature-form="note-create" data-id="${esc(note?.id||'')}" data-link-only="${linkOnly?'1':'0'}">${field('Title','title',n.title,'text','required maxlength="160"')}${`<label class="feature-form-field"><span>Subject</span>${subjectSelect('subjectId',n.subjectId)}</label>`}${field('Tags · comma separated','tags',(n.tags||[]).join(', '),'text','maxlength="300" placeholder="formula, revision, reference"')}${field('Resource URL (optional)','url',n.url||'','url','placeholder="https://…"')}${textarea(linkOnly?'Why is this useful?':'Note content','content',n.content||'',linkOnly?'A short summary so you remember why you saved it.':'Definitions, examples, formulas, or a revision summary.')}${formFooter(note?'Save changes':linkOnly?'Save resource':'Create note')}</form>`);
  }
  function exportNotes() { const md=data.notes.sort((a,b)=>Number(b.pinned)-Number(a.pinned)).map(n=>`# ${n.title}\n\nSubject: ${subjectName(n.subjectId)}\nTags: ${(n.tags||[]).join(', ')}\n${n.url?`Resource: ${n.url}\n`:''}\n${n.content}\n`).join('\n---\n\n');download('studyos-notes.md',md,'text/markdown;charset=utf-8'); }

  // HABITS — check-ins and a local consistency heatmap.
  function habitStreak(habit) { let count=0; let d=today(); if(!(habit.logs||[]).includes(d)) d=addDate(d,-1); for(let i=0;i<366;i++){if((habit.logs||[]).includes(d)){count++;d=addDate(d,-1);}else break;} return count; }
  function renderHabits() {
    if(!$('#habit-grid'))return;
    const done=data.habits.filter(h=>(h.logs||[]).includes(today())).length; const weekly=data.habits.reduce((sum,h)=>sum+(h.logs||[]).filter(d=>dateDiff(today(),d)>=0&&dateDiff(today(),d)<=6).length,0);
    $('#habit-hero').innerHTML=`<div class="habit-hero-mark">✳</div><div class="habit-hero-copy"><span class="eyebrow">YOUR DAILY CHECK-IN</span><h2>${done===data.habits.length&&data.habits.length?'You showed up for every habit today.':'Build a routine that respects your real life.'}</h2><p>${done} of ${data.habits.length} habits checked in today · ${weekly} check-ins over the last seven days.</p></div><div class="habit-hero-number"><strong>${data.habits.length?Math.round(done/data.habits.length*100):0}%</strong><small>today completed</small></div>`;
    $('#habit-grid').innerHTML=data.habits.length?data.habits.map(h=>{const checked=h.logs.includes(today()); const last7=h.logs.filter(d=>dateDiff(today(),d)>=0&&dateDiff(today(),d)<=6).length;return `<article class="habit-card ${checked?'habit-checked':''}"><div class="habit-card-top"><span class="habit-icon" style="background:${esc(h.color)}1a;color:${esc(h.color)}">✳</span><div class="row-action-group"><button class="tiny-action" data-feature-action="edit-habit" data-id="${esc(h.id)}" title="Edit habit">✎</button><button class="tiny-action danger-text" data-feature-action="delete-habit" data-id="${esc(h.id)}" title="Delete habit">×</button></div></div><h3>${esc(h.name)}</h3><p>${last7}/${h.targetDays} check-ins this week · ${habitStreak(h)} day streak</p><div class="habit-week-dots">${Array.from({length:7},(_,i)=>{const d=addDate(today(),i-6);return `<span title="${esc(fullDate(d))}" class="${h.logs.includes(d)?'done':''}">${h.logs.includes(d)?'✓':''}</span>`}).join('')}</div><button class="button ${checked?'button-secondary':'button-primary'} full-width" data-feature-action="habit-check" data-id="${esc(h.id)}">${checked?'✓ Completed today · Undo':'＋ Check in for today'}</button></article>`}).join(''):noItems('✳','Build your first routine','Try “10 minutes of formula revision”, “Read 5 pages”, or “Review 10 flashcards”.');
    const dates=Array.from({length:30},(_,i)=>addDate(today(),i-29));const counts=Object.fromEntries(dates.map(d=>[d,data.habits.filter(h=>h.logs.includes(d)).length]));const max=Math.max(1,...Object.values(counts));
    $('#habit-heatmap').innerHTML=`<div class="heatmap-days">${dates.map(d=>`<div class="heatmap-cell level-${counts[d]?Math.max(1,Math.ceil(counts[d]/Math.max(1,data.habits.length)*4)):0}" title="${esc(fullDate(d))}: ${counts[d]} habit check-ins"><small>${dateObj(d).getDate()}</small></div>`).join('')}</div><div class="heatmap-scale"><span>Less</span><i class="level-0"></i><i class="level-1"></i><i class="level-2"></i><i class="level-3"></i><i class="level-4"></i><span>More</span><span class="heatmap-total">${Object.values(counts).reduce((s,v)=>s+v,0)} check-ins · last 30 days</span></div>`;
  }
  function openHabitModal(habit=null) { const h=habit||{name:'',targetDays:5,color:'#7665df'};openModal(habit?'Edit habit':'Create habit','HABITS · REPEATABLE ACTIONS',`<form class="feature-form" data-feature-form="habit" data-id="${esc(habit?.id||'')}">${field('Habit name','name',h.name,'text','required maxlength="100" placeholder="e.g. Review formulas for 10 minutes"')}<div class="feature-form-grid"><label class="feature-form-field"><span>Weekly target</span><select class="input" name="targetDays">${[1,2,3,4,5,6,7].map(n=>`<option value="${n}" ${Number(h.targetDays)===n?'selected':''}>${n} day${n===1?'':'s'} / week</option>`).join('')}</select></label><label class="feature-form-field"><span>Colour</span><select class="input" name="color">${['#7665df','#2da887','#e6a04f','#4e8fe5','#e06f80','#b16acb','#7f91a8'].map(c=>`<option value="${c}" ${h.color===c?'selected':''}>${c}</option>`).join('')}</select></label></div><p class="helper-copy">This is a consistency tracker, not a streak penalty. Missed days are information, not failure.</p>${formFooter(habit?'Save habit':'Create habit')}</form>`); }
  function exportHabits() { download('studyos-habit-checkins.csv',toCSV([['Habit','Date','Checked in'],...data.habits.flatMap(h=>Array.from({length:30},(_,i)=>addDate(today(),i-29)).map(d=>[h.name,d,h.logs.includes(d)?'yes':'no']))]),'text/csv;charset=utf-8'); }

  // TIMETABLE — recurring blocks and availability-aware task planning.
  function renderTimetable() {
    if(!$('#timetable-grid'))return;
    const dayCaps=DAY_NAMES.map((d,i)=>{const study=data.blocks.filter(b=>b.day===i&&b.kind==='study').reduce((sum,b)=>sum+minutesFromTimes(b.start,b.end),0);return {d,i,study,capacity:study?Math.min(Number(core().preferences?.dailyBudget)||180,study):Number(core().preferences?.dailyBudget)||180};});
    $('#timetable-grid').innerHTML=dayCaps.map(day=>{const blocks=data.blocks.filter(b=>b.day===day.i).sort((a,b)=>a.start.localeCompare(b.start));return `<section class="timetable-day"><div class="timetable-day-head"><b>${day.d}</b><span>${minsLabel(day.study)} ${day.study?'study capacity':'default budget'}</span></div>${blocks.length?blocks.map(b=>`<article class="time-block-card ${esc(b.kind)}"><span class="time-block-time">${esc(b.start)}<small>to</small>${esc(b.end)}</span><div><b>${esc(b.label)}</b><small>${b.kind==='study'?'Study window':b.kind==='class'?'Class / lecture':'Personal / unavailable'}</small></div><button type="button" class="tiny-action" data-feature-action="delete-block" data-id="${esc(b.id)}" title="Delete time block">×</button></article>`).join(''):`<div class="timetable-empty">No recurring blocks</div>`}<button class="day-add-task timetable-add-day" data-feature-action="add-block-day" data-day="${day.i}">＋ Add block</button></section>`}).join('');
    $('#time-block-count').textContent=`${data.blocks.length} block${data.blocks.length===1?'':'s'}`;
    const list=data.blocks.slice().sort((a,b)=>a.day-b.day||a.start.localeCompare(b.start));$('#time-block-list').innerHTML=list.length?list.map(b=>`<div class="feature-list-row"><div class="list-row-icon ${esc(b.kind)}">${b.kind==='study'?'◷':b.kind==='class'?'▤':'•'}</div><div class="feature-row-main"><b>${esc(b.label)}</b><small>${DAY_NAMES[b.day]} · ${b.start}–${b.end} · ${b.kind}</small></div><button class="tiny-action danger-text" data-feature-action="delete-block" data-id="${esc(b.id)}">×</button></div>`).join(''):noItems('◷','No timetable blocks added','Add recurring study windows, lectures, or personal commitments to make the schedule more realistic.');
  }
  function openBlockModal(block=null, presetDay=0) {const b=block||{label:'Focused study',day:presetDay,start:'17:00',end:'18:00',kind:'study'};openModal(block?'Edit time block':'Add recurring time block','TIMETABLE · WEEKLY AVAILABILITY',`<form class="feature-form" data-feature-form="block" data-id="${esc(block?.id||'')}">${field('Block title','label',b.label,'text','required maxlength="100"')}<div class="feature-form-grid"><label class="feature-form-field"><span>Day of week</span><select class="input" name="day">${DAY_NAMES.map((d,i)=>`<option value="${i}" ${Number(b.day)===i?'selected':''}>${d}</option>`).join('')}</select></label><label class="feature-form-field"><span>Block type</span><select class="input" name="kind">${[['study','Study window'],['class','Class / lecture'],['personal','Personal / unavailable']].map(([v,l])=>`<option value="${v}" ${b.kind===v?'selected':''}>${l}</option>`).join('')}</select></label>${field('Start','start',b.start,'time','required')}${field('End','end',b.end,'time','required')}</div><p class="helper-copy">Study windows contribute to the smart planner's available minutes for that weekday. If a day has no study window, the daily budget from Preferences is used.</p>${formFooter(block?'Save block':'Add block')}</form>`);}
  function smartPlan() {
    const state=core(); const budget=Number(state.preferences?.dailyBudget)||180; const horizon=21; const focusBlock=Number(data.settings.studyBlockMinutes)||50;
    const capacityForDate=date=>{const day=(dateObj(date).getDay()+6)%7;const study=data.blocks.filter(b=>b.day===day&&b.kind==='study').reduce((s,b)=>s+minutesFromTimes(b.start,b.end),0);let cap=study?Math.min(budget,study):budget;const busy=data.events.filter(e=>e.date===date&&(e.kind==='personal'||e.kind==='busy')&&e.startTime&&e.endTime).reduce((s,e)=>s+minutesFromTimes(e.startTime,e.endTime),0);return Math.max(0,cap-busy);};
    const result=scheduleWithCapacity(state.tasks,{todayDate:today(),horizon,dailyBudget:budget,focusBlockMinutes:Math.min(focusBlock,budget),capacityForDate});
    state.tasks=result.tasks; coreAPI()?.saveAndRender?.();
    notice(`Smart plan complete: ${result.scheduledCount} focus-sized sessions placed; ${result.unscheduledCount} remain unscheduled because the 21-day capacity was full.`);
  }
  function exportTimetableICS() { exportCalendarICS(); }

  // GOALS — measurable targets derived from actual local data.
  function goalProgress(goal) {
    const start=goal.startDate||today(),end=goal.dueDate||today();
    if(goal.metric==='minutes')return (core().focusLogs||[]).filter(l=>l.date>=start&&l.date<=end).reduce((n,l)=>n+Number(l.minutes||0),0);
    if(goal.metric==='tasks')return tasks().filter(t=>t.status==='done'&&t.completedAt&&t.completedAt.slice(0,10)>=start&&t.completedAt.slice(0,10)<=end).length;
    if(goal.metric==='topics')return subjects().flatMap(s=>s.topics||[]).filter(t=>t.status==='done').length;
    return data.flashcards.reduce((n,c)=>n+(c.reviewHistory||[]).filter(r=>r.date>=start&&r.date<=end).length,0);
  }
  function renderGoals() {
    if(!$('#goal-grid'))return;
    const active=data.goals.filter(g=>!g.completed);const done=data.goals.filter(g=>g.completed||goalProgress(g)>=g.target).length;const totalFocus=(core().focusLogs||[]).reduce((s,l)=>s+Number(l.minutes||0),0);const totalTasks=tasks().filter(t=>t.status==='done').length;
    $('#goal-overview').innerHTML=`<article class="goal-overview-card"><span class="metric-icon">◎</span><div><strong>${active.length}</strong><small>Active goals</small><p>Targets you're working towards</p></div></article><article class="goal-overview-card"><span class="metric-icon green">✓</span><div><strong>${done}</strong><small>Goals reached</small><p>Progress based on logged data</p></div></article><article class="goal-overview-card"><span class="metric-icon orange">◷</span><div><strong>${minsLabel(totalFocus)}</strong><small>Total focused</small><p>${totalTasks} tasks completed overall</p></div></article>`;
    $('#goal-grid').innerHTML=data.goals.length?data.goals.map(g=>{const value=goalProgress(g),pct=Math.min(100,Math.round(value/g.target*100)),reached=value>=g.target;return `<article class="goal-card ${reached||g.completed?'goal-reached':''}"><div class="goal-card-top"><span class="goal-kind-icon">${g.metric==='minutes'?'◷':g.metric==='tasks'?'✓':g.metric==='topics'?'▤':'▣'}</span><button class="tiny-action danger-text" data-feature-action="delete-goal" data-id="${esc(g.id)}" aria-label="Delete goal">×</button></div><h3>${esc(g.title)}</h3><p>${g.metric==='minutes'?'Focused minutes':g.metric==='tasks'?'Completed tasks':g.metric==='topics'?'Completed syllabus topics':'Flashcard reviews'}</p><div class="goal-progress-values"><strong>${esc(g.metric==='minutes'?minsLabel(value):value.toLocaleString())}</strong><span>of ${esc(g.metric==='minutes'?minsLabel(g.target):g.target)}</span><b>${pct}%</b></div><div class="progress-track"><span style="width:${pct}%"></span></div><div class="goal-card-foot"><span>${reached?'✓ Target reached':`Due ${shortDate(g.dueDate)}`}</span><span>${Math.max(0,Math.ceil(dateDiff(g.dueDate,today())))} days left</span></div></article>`}).join(''):noItems('◎','Start with one meaningful target','For example: complete 20 focused hours before an exam, finish 12 tasks, or review 80 flashcards.');
    const milestones=[];subjects().filter(s=>s.examDate&&s.examDate>=today()).forEach(s=>milestones.push({date:s.examDate,title:`${s.name} exam`,subjectId:s.id,kind:'Exam'}));data.assessments.filter(a=>a.date>=today()).forEach(a=>milestones.push({date:a.date,title:a.title,subjectId:a.subjectId,kind:a.kind}));milestones.sort(sortByDate).splice(5);$('#goal-milestones').innerHTML=milestones.length?milestones.map(m=>`<article class="upcoming-item"><span class="upcoming-date"><b>${dateObj(m.date).getDate()}</b><small>${dateObj(m.date).toLocaleDateString(undefined,{month:'short'})}</small></span><div><b>${esc(m.title)}</b><small>${esc(subjectName(m.subjectId))}</small></div><span class="upcoming-type exam">${esc(m.kind.toUpperCase())}</span></article>`).join(''):noItems('✓','No upcoming milestones','Add exam dates in a subject or assessment in the Exam center.');
  }
  function openGoalModal() {openModal('Create a study goal','GOALS · MAKE PROGRESS MEASURABLE',`<form class="feature-form" data-feature-form="goal">${field('Goal title','title','','text','required maxlength="140" placeholder="e.g. Complete 12 focused hours before the exam"')}<div class="feature-form-grid"><label class="feature-form-field"><span>Measure progress by</span><select name="metric" class="input"><option value="minutes">Focus minutes</option><option value="tasks">Completed tasks</option><option value="topics">Completed syllabus topics</option><option value="cards">Flashcard reviews</option></select></label>${field('Target amount','target','720','number','required min="1" max="1000000"')}${field('Start date','startDate',today(),'date','required')}${field('Target date','dueDate',addDate(today(),30),'date','required')}</div><p class="helper-copy">Focus minutes, task completions, and flashcard reviews are measured within the selected date window. Syllabus topic progress is a current total.</p>${formFooter('Create goal')}</form>`);}
  function exportGoals() {download('studyos-goals.csv',toCSV([['Goal','Metric','Target','Current progress','Start date','Target date','Status'],...data.goals.map(g=>[g.title,g.metric,g.target,goalProgress(g),g.startDate,g.dueDate,goalProgress(g)>=g.target?'Reached':'Active'])]),'text/csv;charset=utf-8');}

  // COMMAND PALETTE, REMINDERS, THEME AND EXPORT UTILITIES.
  function openSearch() {ensureDialogs();searchReturnFocus=document.activeElement;$('#command-palette').hidden=false;$('#command-search').value='';renderSearchResults('');$('#command-search').focus();}
  function closeSearch() {if($('#command-palette'))$('#command-palette').hidden=true;if(searchReturnFocus?.focus)searchReturnFocus.focus();}
  function renderSearchResults(query) {const q=String(query||'').trim().toLowerCase();const results=[];tasks().filter(t=>`${t.title} ${t.notes||''}`.toLowerCase().includes(q)).slice(0,8).forEach(t=>results.push({kind:'Task',title:t.title,detail:`${subjectName(t.subjectId)} · ${t.minutes} min`,view:'planner',id:t.id,icon:'✓'}));subjects().filter(s=>`${s.name} ${(s.topics||[]).map(t=>t.name).join(' ')}`.toLowerCase().includes(q)).slice(0,5).forEach(s=>results.push({kind:'Subject',title:s.name,detail:`${(s.topics||[]).length} syllabus topics`,view:'syllabus',id:s.id,icon:'▤'}));data.notes.filter(n=>`${n.title} ${n.content} ${(n.tags||[]).join(' ')}`.toLowerCase().includes(q)).slice(0,5).forEach(n=>results.push({kind:'Note',title:n.title,detail:subjectName(n.subjectId),view:'notes',id:n.id,icon:'▤'}));data.flashcards.filter(c=>`${c.front} ${c.back} ${c.deck}`.toLowerCase().includes(q)).slice(0,5).forEach(c=>results.push({kind:'Flashcard',title:c.front,detail:c.deck,view:'flashcards',id:c.id,icon:'▣'}));data.assessments.filter(a=>`${a.title} ${subjectName(a.subjectId)}`.toLowerCase().includes(q)).slice(0,5).forEach(a=>results.push({kind:'Assessment',title:a.title,detail:`${shortDate(a.date)} · ${subjectName(a.subjectId)}`,view:'exams',id:a.id,icon:'⚑'}));$('#command-results').innerHTML=results.length?results.slice(0,18).map((r,i)=>`<button type="button" class="command-result ${i===0?'command-result-active':''}" data-feature-action="open-search-result" data-result-view="${r.view}" data-id="${esc(r.id)}"><span class="command-result-icon">${r.icon}</span><span><b>${esc(r.title)}</b><small>${esc(r.kind)} · ${esc(r.detail)}</small></span><kbd>↵</kbd></button>`).join(''):noItems('⌕',q?'No matches found':'Search your workspace','Try a task name, subject, note keyword, flashcard prompt, or assessment title.');}
  function applyTheme() {document.documentElement.dataset.theme=data.settings.theme||'light';const button=$('#theme-toggle');if(button){button.textContent=data.settings.theme==='dark'?'☀':'☾';button.title=data.settings.theme==='dark'?'Switch to light theme':'Switch to dark theme';button.setAttribute('aria-label',button.title);}}
  function toggleTheme() {data.settings.theme=data.settings.theme==='dark'?'light':'dark';saveFeatures(false);applyTheme();notice(`${data.settings.theme==='dark'?'Dark':'Light'} theme enabled.`);}
  function enableReminders() {if(!('Notification' in root)){notice('This browser does not support desktop notifications.','error');return;}if(Notification.permission==='granted'){data.settings.notifications=true;saveFeatures();notice('Study reminders enabled while StudyOS is open.');return;}Notification.requestPermission().then(permission=>{if(permission==='granted'){data.settings.notifications=true;saveFeatures();notice('Study reminders enabled while StudyOS is open.');}else notice('Notifications were not enabled. You can still see deadlines in the calendar.','error');});}
  function checkReminders() {if(!data.settings.notifications||!('Notification' in root)||Notification.permission!=='granted'||document.hidden)return;const now=new Date();if(now.getHours()<7||now.getHours()>22)return;const candidates=[];tasks().filter(t=>t.status!=='done'&&t.dueDate===today()).forEach(t=>candidates.push({key:`task-${t.id}-${today()}`,title:'StudyOS task due today',body:t.title}));data.assessments.filter(a=>a.date===today()).forEach(a=>candidates.push({key:`assessment-${a.id}-${today()}`,title:'StudyOS assessment today',body:a.title}));data.events.filter(e=>e.date===today()).forEach(e=>candidates.push({key:`event-${e.id}-${today()}`,title:'StudyOS calendar reminder',body:e.title}));candidates.forEach(c=>{if(!data.settings.sentReminders.includes(c.key)){try{new Notification(c.title,{body:c.body,icon:'./assets/studyos-mark.svg'});data.settings.sentReminders.push(c.key);}catch(_){} }});if(candidates.length)saveFeatures(false);}
  function download(filename, content, mime) {const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);}
  function toCSV(rows) {return '\ufeff'+rows.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');}

  function handleFeatureForm(form) {
    const fd=new FormData(form);const v=Object.fromEntries(fd.entries());const id=form.dataset.id||'';const arr=(key)=>data[key];
    if(form.dataset.featureForm==='event'){
      if(v.startTime&&v.endTime&&minutesFromTimes(v.startTime,v.endTime)<=0)return notice('End time must be later than the start time.','error');
      const obj={id:id||uid('event'),title:v.title.trim(),date:v.date,startTime:v.startTime||'',endTime:v.endTime||'',kind:v.kind,subjectId:v.subjectId||'',notes:v.notes||''};if(!obj.title||!obj.date)return notice('Add an event title and date.','error');const i=arr('events').findIndex(x=>x.id===id);if(i>=0)arr('events')[i]=obj;else arr('events').push(obj);selectedCalendarDate=obj.date;calendarMonth=new Date(dateObj(obj.date).getFullYear(),dateObj(obj.date).getMonth(),1,12);closeModal();saveFeatures();notice(i>=0?'Event updated.':'Event added to your calendar.');return;
    }
    if(form.dataset.featureForm==='card'){
      const obj={id:id||uid('card'),deck:v.deck.trim()||'General',subjectId:v.subjectId||'',front:v.front.trim(),back:v.back.trim(),dueDate:id?(arr('flashcards').find(c=>c.id===id)?.dueDate||today()):today(),interval:id?(arr('flashcards').find(c=>c.id===id)?.interval||0):0,ease:id?(arr('flashcards').find(c=>c.id===id)?.ease||2.5):2.5,repetitions:id?(arr('flashcards').find(c=>c.id===id)?.repetitions||0):0,reviewCount:id?(arr('flashcards').find(c=>c.id===id)?.reviewCount||0):0,reviewHistory:id?(arr('flashcards').find(c=>c.id===id)?.reviewHistory||[]):[],createdAt:id?(arr('flashcards').find(c=>c.id===id)?.createdAt||new Date().toISOString()):new Date().toISOString()};if(!obj.front||!obj.back)return notice('Add both a prompt and an answer.','error');const i=arr('flashcards').findIndex(c=>c.id===id);if(i>=0)arr('flashcards')[i]=obj;else arr('flashcards').push(obj);closeModal();saveFeatures();notice(i>=0?'Flashcard updated.':'Flashcard created.');return;
    }
    if(form.dataset.featureForm==='note-create'||form.dataset.featureForm==='note-edit'){
      const url=v.url?safeUrl(v.url):'';if(v.url&&!url)return notice('Use a valid http:// or https:// resource URL.','error');if(!v.title.trim())return notice('Add a note title.','error');const old=arr('notes').find(n=>n.id===id);const obj={id:id||uid('note'),title:v.title.trim(),subjectId:v.subjectId||'',tags:String(v.tags||'').split(',').map(t=>t.trim()).filter(Boolean).slice(0,20),content:v.content||'',url,pinned:old?.pinned||false,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};const i=arr('notes').findIndex(n=>n.id===id);if(i>=0)arr('notes')[i]=obj;else arr('notes').push(obj);selectedNoteId=obj.id;closeModal();saveFeatures();notice(i>=0?'Note saved.':'Note created.');return;
    }
    if(form.dataset.featureForm==='habit'){
      const obj={id:id||uid('habit'),name:v.name.trim(),targetDays:Number(v.targetDays)||5,color:v.color||'#7665df',logs:arr('habits').find(h=>h.id===id)?.logs||[]};if(!obj.name)return notice('Add a habit name.','error');const i=arr('habits').findIndex(h=>h.id===id);if(i>=0)arr('habits')[i]=obj;else arr('habits').push(obj);closeModal();saveFeatures();notice(i>=0?'Habit updated.':'Habit created.');return;
    }
    if(form.dataset.featureForm==='block'){
      if(minutesFromTimes(v.start,v.end)<=0)return notice('The block end time must be after the start time.','error');const obj={id:id||uid('block'),label:v.label.trim(),day:Number(v.day),start:v.start,end:v.end,kind:v.kind};if(!obj.label)return notice('Add a time block label.','error');const collision=arr('blocks').some(b=>b.id!==id&&b.day===obj.day&&obj.start<b.end&&obj.end>b.start);if(collision&&!confirm('This time overlaps another recurring block on that day. Save anyway?'))return;const i=arr('blocks').findIndex(b=>b.id===id);if(i>=0)arr('blocks')[i]=obj;else arr('blocks').push(obj);closeModal();saveFeatures();notice(i>=0?'Time block updated.':'Recurring block added.');return;
    }
    if(form.dataset.featureForm==='assessment'){
      if(!v.title.trim()||!v.date)return notice('Add an assessment name and date.','error');const max=Math.max(1,Number(v.maxScore)||100);const score=v.score===''?null:Number(v.score);if(score!==null&&(!Number.isFinite(score)||score<0||score>max))return notice('Score must be between zero and maximum marks.','error');const obj={id:id||uid('exam'),title:v.title.trim(),subjectId:v.subjectId||'',date:v.date,kind:v.kind||'exam',score,maxScore:max,weight:Math.max(0,Math.min(100,Number(v.weight)||0)),notes:v.notes||''};const i=arr('assessments').findIndex(a=>a.id===id);if(i>=0)arr('assessments')[i]=obj;else arr('assessments').push(obj);closeModal();saveFeatures();notice(i>=0?'Assessment updated.':'Assessment added.');return;
    }
    if(form.dataset.featureForm==='goal'){
      const obj={id:uid('goal'),title:v.title.trim(),metric:v.metric||'minutes',target:Math.max(1,Number(v.target)||1),startDate:v.startDate||today(),dueDate:v.dueDate||addDate(today(),30),completed:false,createdAt:new Date().toISOString()};if(!obj.title)return notice('Add a goal title.','error');if(obj.dueDate<obj.startDate)return notice('Target date should be on or after the start date.','error');arr('goals').push(obj);closeModal();saveFeatures();notice('Goal created.');return;
    }
  }

  function handleAction(action, target) {
    const id=target.dataset.id;
    if(action==='close-modal'){closeModal();return;}
    if(action==='add-event'){openEventModal();return;}
    if(action==='edit-event'){const e=data.events.find(x=>x.id===id);if(e)openEventModal(e);return;}
    if(action==='open-task'){const t=tasks().find(x=>x.id===id);if(t){coreAPI()?.setView?.('today');coreAPI()?.openTaskModal?.(t,t.planDate||today());}return;}
    if(action==='rate-revision'){const i=data.revisions.findIndex(r=>r.id===id);if(i>=0){data.revisions[i]=calculateReview(data.revisions[i],target.dataset.rating);saveFeatures();notice(`Next review: ${shortDate(data.revisions[i].dueDate)}.`);}return;}
    if(action==='flip-card'){flashStudy.flipped=!flashStudy.flipped;renderStudyCard();return;}
    if(action==='rate-flashcard'){rateCard(id,target.dataset.rating);return;}
    if(action==='end-flash-session'){flashStudy={queue:[],index:0,flipped:false};renderStudyCard();return;}
    if(action==='edit-card'){const c=data.flashcards.find(x=>x.id===id);if(c)openCardModal(c);return;}
    if(action==='delete-card'){if(confirm('Delete this flashcard?')){data.flashcards=data.flashcards.filter(c=>c.id!==id);flashStudy.queue=flashStudy.queue.filter(i=>i!==id);saveFeatures();notice('Flashcard deleted.');}return;}
    if(action==='select-note'){selectedNoteId=id;renderNotes();return;}
    if(action==='toggle-note-pin'){const n=data.notes.find(x=>x.id===id);if(n){n.pinned=!n.pinned;n.updatedAt=new Date().toISOString();saveFeatures();}return;}
    if(action==='delete-note'){if(confirm('Delete this note permanently?')){data.notes=data.notes.filter(n=>n.id!==id);selectedNoteId=null;saveFeatures();notice('Note deleted.');}return;}
    if(action==='export-single-note'){const n=data.notes.find(x=>x.id===id);if(n)download(`${n.title.replace(/[^a-z0-9-_ ]/gi,'').trim().replace(/\s+/g,'-')||'study-note'}.md`,`# ${n.title}\n\nSubject: ${subjectName(n.subjectId)}\nTags: ${(n.tags||[]).join(', ')}\n${n.url?`Resource: ${n.url}\n`:''}\n${n.content}\n`,'text/markdown;charset=utf-8');return;}
    if(action==='habit-check'){const h=data.habits.find(x=>x.id===id);if(h){if(h.logs.includes(today()))h.logs=h.logs.filter(d=>d!==today());else h.logs.push(today());saveFeatures();}return;}
    if(action==='edit-habit'){const h=data.habits.find(x=>x.id===id);if(h)openHabitModal(h);return;}
    if(action==='delete-habit'){if(confirm('Delete this habit and its check-in history?')){data.habits=data.habits.filter(h=>h.id!==id);saveFeatures();}return;}
    if(action==='delete-block'){data.blocks=data.blocks.filter(b=>b.id!==id);saveFeatures();notice('Time block removed.');return;}
    if(action==='edit-block'){const b=data.blocks.find(x=>x.id===id);if(b)openBlockModal(b);return;}
    if(action==='add-block-day'){openBlockModal(null,Number(target.dataset.day)||0);return;}
    if(action==='edit-assessment'){const a=data.assessments.find(x=>x.id===id);if(a)openAssessmentModal(a);return;}
    if(action==='delete-assessment'){if(confirm('Delete this assessment?')){data.assessments=data.assessments.filter(a=>a.id!==id);saveFeatures();}return;}
    if(action==='delete-goal'){if(confirm('Delete this goal?')){data.goals=data.goals.filter(g=>g.id!==id);saveFeatures();}return;}
    if(action==='open-search-result'){closeSearch();const view=target.dataset.resultView;coreAPI()?.setView?.(view);if(view==='notes'){selectedNoteId=id;renderNotes();}if(view==='flashcards'){const card=data.flashcards.find(c=>c.id===id);if(card)$('#flashcard-deck-filter').value=card.deck;renderFlashcards();}if(view==='calendar'){const task=tasks().find(t=>t.id===id);if(task&&task.planDate){selectedCalendarDate=task.planDate;calendarMonth=new Date(dateObj(task.planDate).getFullYear(),dateObj(task.planDate).getMonth(),1,12);renderCalendar();}}return;}
  }

  function handleClick(event) {
    const target=event.target.closest('[data-feature-action],#calendar-prev,#calendar-next,#calendar-today,#calendar-export-ics,#calendar-add-task,#calendar-notifications,#add-calendar-event,#revision-generate,#revision-export,#flashcard-add,#flashcards-start-study,#flashcards-export,#exam-add,#exam-hero-add,#exam-calendar-export,#notes-export,#note-add,#notes-new-link,#note-first-create,#habit-add,#habit-log-export,#timetable-add-block,#smart-plan-button,#timetable-export-ics,#goal-add,#goal-export,#theme-toggle,#global-search-open');if(!target)return;
    const action=target.dataset.featureAction;if(action){handleAction(action,target);return;}
    if(target.matches('[data-view-link]')){return;}
    if(target.id==='calendar-prev'){calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1,12);renderCalendar();return;}
    if(target.id==='calendar-next'){calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1,12);renderCalendar();return;}
    if(target.id==='calendar-today'){calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1,12);selectedCalendarDate=today();renderCalendar();return;}
    if(target.dataset.calendarDate){selectedCalendarDate=target.dataset.calendarDate;renderCalendar();return;}
    if(target.id==='calendar-export-ics'||target.id==='exam-calendar-export'||target.id==='timetable-export-ics'){exportCalendarICS();return;}
    if(target.id==='calendar-add-task'){coreAPI()?.setView?.('today');coreAPI()?.openTaskModal?.(null,selectedCalendarDate);return;}
    if(target.id==='calendar-notifications'){enableReminders();return;}
    if(target.id==='add-calendar-event'){openEventModal();return;}
    if(target.id==='revision-generate'){generateRevisions();return;}
    if(target.id==='revision-export'){exportRevisions();return;}
    if(target.id==='flashcard-add'){openCardModal();return;}
    if(target.id==='flashcards-start-study'){startFlashStudy();return;}
    if(target.id==='flashcards-export'){exportCards();return;}
    if(target.id==='exam-add'||target.id==='exam-hero-add'){openAssessmentModal();return;}
    if(target.id==='notes-export'){exportNotes();return;}
    if(target.id==='note-add'||target.id==='note-first-create'){openNoteModal();return;}
    if(target.id==='notes-new-link'){openNoteModal(null,true);return;}
    if(target.id==='habit-add'){openHabitModal();return;}
    if(target.id==='habit-log-export'){exportHabits();return;}
    if(target.id==='timetable-add-block'){openBlockModal();return;}
    if(target.id==='smart-plan-button'){if(confirm('Split tasks longer than your focus block and create a 21-day plan using your available study windows? This updates all unfinished task dates.'))smartPlan();return;}
    if(target.id==='goal-add'){openGoalModal();return;}
    if(target.id==='goal-export'){exportGoals();return;}
    if(target.id==='theme-toggle'){toggleTheme();return;}
    if(target.id==='global-search-open'){openSearch();return;}
    if(target.id==='install-app-button'){return;}
  }

  function handleSubmit(event) {
    const form=event.target.closest('[data-feature-form]');if(form){event.preventDefault();handleFeatureForm(form);return;}
    if(event.target.id==='grade-target-form'){event.preventDefault();calculateTargetForm();}
  }

  function installListeners() {
    ensureDialogs();
    document.addEventListener('click',handleClick);
    document.addEventListener('submit', handleSubmit, true);
    $('#calendar-grid')?.addEventListener('click',e=>{const b=e.target.closest('[data-calendar-date]');if(b){selectedCalendarDate=b.dataset.calendarDate;renderCalendar();}});
    $('#flashcard-deck-filter')?.addEventListener('change',()=>{flashStudy={queue:[],index:0,flipped:false};renderFlashcards();});
    $('#flashcard-search')?.addEventListener('input',renderFlashcards);
    $('#notes-search')?.addEventListener('input',renderNotes);
    $('#notes-subject-filter')?.addEventListener('change',renderNotes);
    $('#exam-filter')?.addEventListener('change',renderExams);
    $('#command-search')?.addEventListener('input',e=>renderSearchResults(e.target.value));
    $('#command-search')?.addEventListener('keydown',e=>{if(e.key==='Escape')closeSearch();if(e.key==='Enter'){const first=$('.command-result', $('#command-results'));if(first)first.click();}});
    $('#command-palette')?.addEventListener('click',e=>{if(e.target.id==='command-palette')closeSearch();});
    $('#grade-target-form')?.addEventListener('input',()=>{if($('#grade-target-result').innerHTML)calculateTargetForm();});
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'){if($('#feature-modal')&&!$('#feature-modal').hidden)closeModal();if($('#command-palette')&&!$('#command-palette').hidden)closeSearch();}
      const active=document.activeElement;const typing=active&&(active.matches('input,textarea,select')||active.isContentEditable);
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();}
      else if(!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key==='/'){e.preventDefault();openSearch();}
      else if(!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key.toLowerCase()==='n'){if(activeView()==='notes')openNoteModal();else coreAPI()?.openTaskModal?.();}
    });
    document.addEventListener('visibilitychange',checkReminders);
    setInterval(checkReminders,60000);
    root.addEventListener('beforeinstallprompt', event => { event.preventDefault(); root.studyOSInstallPrompt = event; const install = $('#install-app-button'); if (install) install.hidden = false; });
    $('#install-app-button')?.addEventListener('click', async () => { const prompt = root.studyOSInstallPrompt; if (!prompt) return; prompt.prompt(); await prompt.userChoice; root.studyOSInstallPrompt = null; $('#install-app-button').hidden = true; });
  }

  function reloadFromStorage() {
    try {
      const saved = localStorage.getItem(FEATURE_KEY);
      data = saved ? normalizeExtras(JSON.parse(saved)) : defaults();
      if (!saved) localStorage.setItem(FEATURE_KEY, JSON.stringify(data));
    } catch (_) { data = defaults(); }
    render(activeView());
  }
  function resetFeatures() {
    data = defaults();
    try { localStorage.setItem(FEATURE_KEY, JSON.stringify(data)); } catch (_) {}
    flashStudy = { queue: [], index: 0, flipped: false }; selectedNoteId = null;
    render(activeView());
  }
  const api={render,reload:reloadFromStorage,reset:resetFeatures,calculateReview,calculateWeightedGrade,requiredScore,splitTask,scheduleWithCapacity};
  root.StudyOSFeatures=api;
  installListeners();
  applyTheme();
  render(activeView());
})(typeof window!=='undefined'?window:globalThis);
