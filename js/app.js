(function () {
  const STORAGE_KEY = "alder-portal-pilot-v1";
  const SESSION_KEY = "alder-session";
  const PLACE_KEY = "alder-place";
  const ACCESS_FILLED = "********";
  const PASS_FILLED = "**********";
  const AVATAR_COLORS = ["#0b5e56", "#1f4e5f", "#8a4b2f", "#3d5a3a", "#5c4d7a", "#8d5a2b", "#1e5f74", "#6b3f4a", "#3f5e4a", "#4d5d73"];

  const state = {
    view: "login",
    clientId: null,
    mode: "dashboard",
    openTaskId: null,
    query: "",
    cohort: "All",
    sort: "name",
    taskFilter: "all",
    libraryQuery: "",
    adding: false,
    armReset: false,
    loginError: "",
    accessDraft: null,
    passDraft: null,
    data: null,
    undo: null
  };

  let renderOpts = {};
  let toastTimer = 0;

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function uid(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return PortalData.createSeed();
      const data = JSON.parse(raw);
      if (!Array.isArray(data.clients) || !Array.isArray(data.templates)) return PortalData.createSeed();
      return data;
    } catch (err) {
      return PortalData.createSeed();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    } catch (err) {
      showToast("Could not save in this browser");
    }
  }

  function savePlace() {
    if (state.view === "login") return;
    sessionStorage.setItem(PLACE_KEY, JSON.stringify({
      view: state.view,
      clientId: state.clientId,
      mode: state.mode
    }));
  }

  function currentClient() {
    return state.data.clients.find(function (client) { return client.id === state.clientId; }) || null;
  }

  function taskStatus(task) {
    const total = task.subtasks.length;
    const done = task.subtasks.filter(function (step) { return step.done; }).length;
    if (total && done === total) return "done";
    if (done > 0) return "partial";
    return "open";
  }

  function clientStats(client) {
    let steps = 0;
    let done = 0;
    let complete = 0;
    let partial = 0;
    let open = 0;
    client.tasks.forEach(function (task) {
      const status = taskStatus(task);
      const finished = task.subtasks.filter(function (step) { return step.done; }).length;
      steps += task.subtasks.length;
      done += finished;
      if (status === "done") complete += 1;
      else if (status === "partial") partial += 1;
      else open += 1;
    });
    return {
      steps: steps,
      done: done,
      complete: complete,
      partial: partial,
      open: open,
      total: client.tasks.length,
      pct: steps ? Math.round((done / steps) * 100) : 0
    };
  }

  function formatUpdated(iso) {
    const then = new Date(iso).getTime();
    if (!then) return "Just now";
    const mins = Math.round((Date.now() - then) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return mins + " min ago";
    const hours = Math.round(mins / 60);
    if (hours < 24) return hours === 1 ? "1 hour ago" : hours + " hours ago";
    const days = Math.round(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return days + " days ago";
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function touch(client) {
    client.updatedAt = new Date().toISOString();
  }

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (part) {
      return part.charAt(0).toUpperCase();
    }).join("");
  }

  function avatarColor(id) {
    let total = 0;
    String(id).split("").forEach(function (ch) { total += ch.charCodeAt(0); });
    return AVATAR_COLORS[total % AVATAR_COLORS.length];
  }

  function cohorts() {
    const names = {};
    state.data.clients.forEach(function (client) { names[client.cohort] = true; });
    return ["All"].concat(Object.keys(names).sort());
  }

  function visibleClients() {
    const query = state.query.trim().toLowerCase();
    const list = state.data.clients.filter(function (client) {
      if (state.cohort !== "All" && client.cohort !== state.cohort) return false;
      if (!query) return true;
      return (client.name + " " + client.cohort + " " + client.focus).toLowerCase().indexOf(query) !== -1;
    });
    list.sort(function (a, b) {
      if (state.sort === "progress") return clientStats(b).pct - clientStats(a).pct || a.name.localeCompare(b.name);
      if (state.sort === "updated") return new Date(b.updatedAt) - new Date(a.updatedAt);
      return a.name.localeCompare(b.name);
    });
    return list;
  }

  function ring(pct) {
    const offset = (175.9 - (Math.max(0, Math.min(100, pct)) / 100) * 175.9).toFixed(2);
    return '<div class="ring-wrap"><svg class="ring" viewBox="0 0 72 72" aria-hidden="true"><circle class="ring-track" cx="36" cy="36" r="28"></circle><circle class="ring-value" cx="36" cy="36" r="28" style="--target:' + offset + '" transform="rotate(-90 36 36)"></circle></svg><strong>' + pct + '%</strong></div>';
  }

  function avatar(name, id) {
    return '<span class="avatar" style="background:' + avatarColor(id) + '">' + esc(initials(name) || "•") + "</span>";
  }

  function chevron() {
    return '<svg class="chevron" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 7l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path></svg>';
  }

  function statusLabel(status) {
    if (status === "done") return "Complete";
    if (status === "partial") return "In progress";
    return "Not started";
  }

  function showToast(message, undo) {
    state.undo = undo || null;
    const el = document.getElementById("toast");
    el.innerHTML = "<span>" + esc(message) + "</span>" + (undo ? '<button type="button" data-action="undo">Undo</button>' : "");
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("show");
      state.undo = null;
    }, 3400);
  }

  function hideToast() {
    const el = document.getElementById("toast");
    el.classList.remove("show");
    clearTimeout(toastTimer);
  }

  function render(opts) {
    renderOpts = opts || {};
    if (state.view === "client" && !currentClient()) state.view = "roster";
    const y = renderOpts.keepScroll ? window.scrollY : 0;
    const focus = renderOpts.focus ? captureFocus(renderOpts.focus) : null;
    document.body.classList.toggle("is-login", state.view === "login");
    document.getElementById("app").innerHTML = state.view === "login" ? viewLogin() : viewApp();
    document.title = state.view === "login" ? "Enter portal · Alder" : state.view === "client" && currentClient() ? currentClient().name + " · Alder" : "Clients · Alder";
    if (renderOpts.scrollTop) window.scrollTo(0, 0);
    else if (renderOpts.keepScroll) window.scrollTo(0, y);
    if (focus) restoreFocus(focus);
    savePlace();
  }

  function captureFocus(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    return { id: id, start: el.selectionStart, end: el.selectionEnd };
  }

  function restoreFocus(focus) {
    const el = document.getElementById(focus.id);
    if (!el) return;
    el.focus();
    if (typeof focus.start === "number" && el.setSelectionRange) {
      el.setSelectionRange(focus.start, focus.end);
    }
  }

  function viewLogin() {
    const accessValue = state.accessDraft == null ? ACCESS_FILLED : state.accessDraft;
    const passValue = state.passDraft == null ? PASS_FILLED : state.passDraft;
    return ''
      + '<main class="login">'
      + '<section class="brand"><div class="brand-inner">'
      + '<div class="lockup"><span class="mark" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2.2c1.7 2.3 2.6 4 2.6 6A2.6 2.6 0 0 1 9 10.8 2.6 2.6 0 0 1 6.4 8.2C6.4 6.2 7.3 4.5 9 2.2z" fill="#d7efe9"/><path d="M9 10.6V15" stroke="#d7efe9" stroke-width="1.4" stroke-linecap="round"/></svg></span><span>Alder<small>Client portal</small></span></div>'
      + "<h1>Checklists shaped for each client.</h1>"
      + '<p class="lede">A pilot workspace for ten clients now, with room to grow. Each person gets their own mix of tasks.</p>'
      + '<ol class="points"><li><div><strong>Their own set</strong><span>About ten tasks, chosen for that client.</span></div></li><li><div><strong>Short steps</strong><span>One to five steps inside each task.</span></div></li><li><div><strong>Editable</strong><span>Change one client without touching the others.</span></div></li></ol>'
      + '<p class="brand-foot">Sample records only. Nothing here is a real chart.</p>'
      + "</div></section>"
      + '<section class="login-panel"><div class="login-card' + (state.loginError ? " has-error" : "") + '">'
      + '<p class="eyebrow">Staff access</p><h2>Enter the pilot</h2>'
      + '<p class="lede">Access is filled in for this pilot. Continue when you are ready.</p>'
      + '<form id="login-form" autocomplete="off" data-lpignore="true">'
      + '<label class="field"><span>Access ID</span><input id="access-id" name="pilot-access" type="password" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" readonly value="' + esc(accessValue) + '"></label>'
      + '<label class="field"><span>Passcode</span><input id="passcode" name="pilot-passcode" type="password" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" readonly value="' + esc(passValue) + '"></label>'
      + (state.loginError ? '<p class="form-error" id="login-error" role="alert">' + esc(state.loginError) + "</p>" : "")
      + '<button class="primary wide" type="submit">Enter portal</button>'
      + "</form>"
      + '<p class="fine">Demonstration workspace. Do not enter real health information.</p>'
      + "</div></section></main>";
  }

  function topbar() {
    return ''
      + '<header class="topbar"><div class="topbar-inner">'
      + '<button type="button" class="brand-lockup" data-action="go-roster"><span class="mark" aria-hidden="true">A</span><span><strong>Alder</strong><small>Pilot workspace</small></span></button>'
      + '<div class="top-actions"><span class="pill">Sample data</span><button type="button" class="ghost" data-action="logout">Sign out</button></div>'
      + "</div></header>";
  }

  function viewApp() {
    const body = state.view === "client" ? clientBody() : rosterBody();
    const rise = renderOpts.animate === false ? "" : " rise-in";
    return topbar() + '<main class="page' + rise + '" id="content">' + body + "</main>";
  }

  function rosterBody() {
    const clients = visibleClients();
    const all = state.data.clients;
    let steps = 0;
    let done = 0;
    all.forEach(function (client) {
      const stats = clientStats(client);
      steps += stats.steps;
      done += stats.done;
    });
    const pct = steps ? Math.round((done / steps) * 100) : 0;
    const chips = cohorts().map(function (name) {
      const pressed = state.cohort === name ? "true" : "false";
      return '<button type="button" class="chip" data-action="cohort" data-cohort="' + esc(name) + '" aria-pressed="' + pressed + '">' + esc(name) + "</button>";
    }).join("");
    const cards = clients.map(function (client, index) {
      const stats = clientStats(client);
      return ''
        + '<button type="button" class="client-card" data-action="open-client" data-id="' + esc(client.id) + '" style="animation-delay:' + (index * 35) + 'ms">'
        + '<div class="card-top">' + avatar(client.name, client.id) + '<span class="badge ' + (stats.pct === 100 ? "done" : stats.pct ? "partial" : "open") + '">' + esc(client.cohort) + "</span></div>"
        + '<span class="identity"><span><strong>' + esc(client.name) + "</strong><span>" + esc(client.focus) + "</span></span></span>"
        + '<span class="bar" aria-hidden="true"><span style="width:' + stats.pct + '%"></span></span>'
        + '<span class="card-foot"><span>' + stats.complete + " of " + stats.total + " tasks complete</span><span>" + stats.pct + "%</span></span>"
        + "</button>";
    }).join("");
    const addForm = state.adding ? ''
      + '<form class="composer" id="add-client-form">'
      + "<h2>New client</h2>"
      + '<p class="lede">They start with an empty dashboard. Assign tasks after you create them.</p>'
      + '<div class="form-row">'
      + '<label class="field"><span>Name</span><input name="clientname" maxlength="60" required></label>'
      + '<label class="field"><span>Group</span><input name="group" maxlength="40" value="Intake"></label>'
      + '<label class="field"><span>Focus</span><input name="focus" maxlength="80" placeholder="What this checklist is for"></label>'
      + '<button class="primary" type="submit">Create</button>'
      + "</div>"
      + '<div class="form-actions"><button type="button" class="ghost" data-action="toggle-add">Cancel</button></div>'
      + "</form>" : "";
    const empty = clients.length ? "" : '<div class="empty"><p>No clients match this view.</p></div>';
    const reset = state.armReset
      ? '<div class="confirm-row"><span class="meta">Replace every edit with the original sample roster?</span><button type="button" class="text-danger" data-action="confirm-reset">Restore</button><button type="button" class="ghost" data-action="cancel-reset">Cancel</button></div>'
      : '<button type="button" class="ghost" data-action="toggle-reset">Restore sample roster</button>';
    return ''
      + '<p class="notice">Sample records stay in this browser. Do not enter real health information.</p>'
      + '<div class="page-head"><div><p class="eyebrow">Pilot group</p><h1>Client checklists</h1>'
      + '<p class="lede">' + all.length + " of 50 seats. Each dashboard holds its own tasks, usually about ten, from a library of " + state.data.templates.length + ".</p></div>"
      + '<button type="button" class="primary" data-action="toggle-add"' + (all.length >= 50 ? " disabled" : "") + ">Add client</button></div>"
      + '<section class="metrics"><article class="metric"><span>Clients</span><strong>' + all.length + '</strong></article><article class="metric"><span>Task library</span><strong>' + state.data.templates.length + '</strong></article><article class="metric"><span>Steps complete</span><strong>' + pct + "%</strong></article></section>"
      + '<div class="toolbar"><label class="search"><span class="sr">Search clients</span><input id="client-search" name="roster-search" type="search" placeholder="Search clients" autocomplete="off" value="' + esc(state.query) + '"></label>'
      + '<label class="sort"><span class="sr">Sort</span><select data-action="sort"><option value="name"' + (state.sort === "name" ? " selected" : "") + '>Name</option><option value="progress"' + (state.sort === "progress" ? " selected" : "") + '>Progress</option><option value="updated"' + (state.sort === "updated" ? " selected" : "") + ">Recent</option></select></label></div>"
      + '<div class="chips" role="toolbar" aria-label="Groups">' + chips + "</div>"
      + addForm
      + '<div class="cards">' + cards + "</div>"
      + empty
      + '<div class="page-foot"><p class="meta">Showing ' + clients.length + " client" + (clients.length === 1 ? "" : "s") + ".</p>" + reset + "</div>";
  }

  function clientBody() {
    const client = currentClient();
    const stats = clientStats(client);
    const options = state.data.clients.map(function (item) {
      return '<option value="' + esc(item.id) + '"' + (item.id === client.id ? " selected" : "") + ">" + esc(item.name) + "</option>";
    }).join("");
    return ''
      + '<div class="staff-tools"><div class="tool-cluster">'
      + '<button type="button" class="secondary" data-action="go-roster">All clients</button>'
      + '<label class="jump"><span class="sr">Switch client</span><select data-action="jump-client">' + options + "</select></label>"
      + "</div>"
      + '<div class="seg" role="group" aria-label="Client view"><button type="button" data-action="set-mode" data-mode="dashboard" aria-pressed="' + (state.mode === "dashboard" ? "true" : "false") + '">Dashboard</button><button type="button" data-action="set-mode" data-mode="customize" aria-pressed="' + (state.mode === "customize" ? "true" : "false") + '">Customize</button></div>'
      + "</div>"
      + '<p class="notice">Sample profile for the pilot. Edits apply to this client only.</p>'
      + '<div class="layout"><aside class="summary">' + (state.mode === "customize" ? profileEditor(client, stats) : profileSummary(client, stats)) + "</aside><div>" + (state.mode === "customize" ? customizeMain(client) : dashboardMain(client)) + "</div></div>";
  }

  function profileSummary(client, stats) {
    return ring(stats.pct)
      + '<p class="eyebrow">' + esc(client.cohort) + "</p>"
      + "<h2>" + esc(client.name) + "</h2>"
      + '<p class="focus">' + esc(client.focus) + "</p>"
      + "<ul class=\"stats\"><li><span>Tasks</span><strong>" + stats.total + "</strong></li><li><span>Steps</span><strong>" + stats.done + " of " + stats.steps + "</strong></li><li><span>Updated</span><strong>" + esc(formatUpdated(client.updatedAt)) + "</strong></li></ul>";
  }

  function profileEditor(client) {
    return '<p class="eyebrow">Profile</p>'
      + '<p class="focus">These labels appear on the dashboard. They stay with this client.</p>'
      + '<label class="field"><span>Client name</span><input data-action="rename-client" maxlength="60" value="' + esc(client.name) + '"></label>'
      + '<label class="field"><span>Group</span><input data-action="rename-group" maxlength="40" value="' + esc(client.cohort) + '"></label>'
      + '<label class="field"><span>Focus</span><input data-action="rename-focus" maxlength="80" value="' + esc(client.focus) + '"></label>'
      + '<div class="danger-zone"><button type="button" class="text-danger" data-action="remove-client">Remove client</button></div>';
  }

  function dashboardMain(client) {
    const filters = [["all", "All"], ["open", "Still open"], ["done", "Complete"]];
    const chips = filters.map(function (item) {
      return '<button type="button" class="chip" data-action="task-filter" data-filter="' + item[0] + '" aria-pressed="' + (state.taskFilter === item[0] ? "true" : "false") + '">' + item[1] + "</button>";
    }).join("");
    const tasks = client.tasks.filter(function (task) {
      const status = taskStatus(task);
      if (state.taskFilter === "done") return status === "done";
      if (state.taskFilter === "open") return status !== "done";
      return true;
    });
    const list = tasks.length ? tasks.map(function (task) { return taskCard(task, "dashboard"); }).join("") : '<div class="empty"><p>' + (client.tasks.length ? "Nothing in this filter." : "No tasks on this dashboard yet.") + "</p>" + (client.tasks.length ? "" : '<button type="button" class="primary" data-action="set-mode" data-mode="customize">Assign tasks</button>') + "</div>";
    return '<div class="list-head"><h2>Tasks</h2><span class="meta">' + tasks.length + " shown</span></div>"
      + '<div class="chips filters" role="toolbar" aria-label="Task status">' + chips + "</div>"
      + list;
  }

  function customizeMain(client) {
    const query = state.libraryQuery.trim().toLowerCase();
    const library = state.data.templates.filter(function (template) {
      if (!query) return true;
      return template.title.toLowerCase().indexOf(query) !== -1;
    });
    const rows = library.map(function (template) {
      const added = client.tasks.some(function (task) { return task.templateId === template.id; });
      const index = state.data.templates.findIndex(function (item) { return item.id === template.id; }) + 1;
      const number = index < 10 ? "0" + index : String(index);
      return ''
        + '<div class="lib-row"><span class="lib-index">' + number + '</span><span class="grow"><strong>' + esc(template.title) + "</strong><span class=\"meta\">" + template.steps.length + " steps</span></span>"
        + (added ? '<span class="badge done">Added</span>' : '<button type="button" class="secondary" data-action="add-template" data-id="' + esc(template.id) + '">Add</button>')
        + "</div>";
    }).join("");
    const assigned = client.tasks.length
      ? client.tasks.map(function (task, index) { return taskCard(task, "customize", index, client.tasks.length); }).join("")
      : '<div class="empty"><p>No tasks assigned yet. Add one from the library below.</p></div>';
    return ''
      + '<div class="list-head"><h2>Assigned</h2><span class="meta">' + client.tasks.length + " tasks</span></div>"
      + assigned
      + '<section class="block"><h2>Task library</h2><p class="lede">Adding a task copies it onto this client. Other clients keep their own set.</p>'
      + '<label class="search"><span class="sr">Search the library</span><input id="library-search" type="search" placeholder="Search tasks" autocomplete="off" value="' + esc(state.libraryQuery) + '"></label>'
      + (rows || '<p class="meta">No tasks match that search.</p>')
      + "</section>"
      + '<form class="block" id="custom-task-form"><h2>Custom task</h2><p class="lede">Use this when the library does not cover the work. Up to 5 steps.</p>'
      + '<label class="field"><span>Title</span><input name="title" maxlength="80"></label>'
      + '<label class="field"><span>Note</span><input name="detail" maxlength="160"></label>'
      + '<label class="field"><span>Steps, one per line</span><textarea name="steps" maxlength="800" placeholder="First step&#10;Second step"></textarea></label>'
      + '<button class="primary" type="submit">Add custom task</button></form>';
  }

  function taskCard(task, mode, index, count) {
    const status = taskStatus(task);
    const done = task.subtasks.filter(function (step) { return step.done; }).length;
    const open = state.openTaskId === task.id;
    const tools = mode === "customize" ? ''
      + '<div class="task-tools">'
      + '<button type="button" class="icon-btn" data-action="move-task" data-dir="up" data-task="' + esc(task.id) + '" aria-label="Move task up"' + (index === 0 ? " disabled" : "") + '>Up</button>'
      + '<button type="button" class="icon-btn" data-action="move-task" data-dir="down" data-task="' + esc(task.id) + '" aria-label="Move task down"' + (index === count - 1 ? " disabled" : "") + '>Down</button>'
      + '<button type="button" class="icon-btn" data-action="remove-task" data-task="' + esc(task.id) + '">Remove</button>'
      + "</div>" : "";
    return ''
      + '<article class="task' + (open ? " is-open" : "") + (status === "done" ? " is-done" : "") + '">'
      + '<div class="task-top"><button type="button" class="task-open" data-action="toggle-open" data-task="' + esc(task.id) + '" aria-expanded="' + (open ? "true" : "false") + '">'
      + '<span class="status-dot ' + status + '" aria-hidden="true"></span>'
      + '<span class="task-copy"><strong>' + esc(task.title) + "</strong><small>" + done + " of " + task.subtasks.length + " steps · " + statusLabel(status) + (task.templateId ? "" : " · Custom") + "</small></span>"
      + '<span class="badge ' + status + '">' + statusLabel(status) + "</span>"
      + chevron()
      + "</button>" + tools + "</div>"
      + '<div class="fold"><div class="fold-inner"' + (open ? "" : " inert aria-hidden=\"true\"") + ">" + taskBody(task, mode) + "</div></div>"
      + "</article>";
  }

  function taskBody(task, mode) {
    if (mode === "dashboard") {
      const steps = task.subtasks.map(function (step) {
        return '<li><label class="step' + (step.done ? " is-done" : "") + '"><input type="checkbox" data-action="toggle-sub" data-task="' + esc(task.id) + '" data-sub="' + esc(step.id) + '"' + (step.done ? " checked" : "") + '><span class="box" aria-hidden="true"></span><span class="step-label">' + esc(step.label) + "</span></label></li>";
      }).join("");
      return '<div class="task-body">' + (task.detail ? '<p class="detail">' + esc(task.detail) + "</p>" : "") + '<ul class="steps">' + steps + "</ul></div>";
    }
    const steps = task.subtasks.map(function (step) {
      return ''
        + '<div class="step-edit"><label class="check-only"><input type="checkbox" data-action="toggle-sub" data-task="' + esc(task.id) + '" data-sub="' + esc(step.id) + '"' + (step.done ? " checked" : "") + '><span class="box" aria-hidden="true"></span><span class="sr">Mark step</span></label>'
        + '<input type="text" data-action="rename-sub" data-task="' + esc(task.id) + '" data-sub="' + esc(step.id) + '" maxlength="140" value="' + esc(step.label) + '">'
        + '<button type="button" class="ghost" data-action="remove-sub" data-task="' + esc(task.id) + '" data-sub="' + esc(step.id) + '"' + (task.subtasks.length === 1 ? " disabled" : "") + ">Remove</button></div>";
    }).join("");
    return ''
      + '<div class="task-body">'
      + '<label class="field"><span>Task title</span><input data-action="rename-task" data-task="' + esc(task.id) + '" maxlength="80" value="' + esc(task.title) + '"></label>'
      + '<label class="field"><span>Note</span><input data-action="rename-detail" data-task="' + esc(task.id) + '" maxlength="160" value="' + esc(task.detail) + '"></label>'
      + steps
      + '<button type="button" class="secondary" data-action="add-sub" data-task="' + esc(task.id) + '"' + (task.subtasks.length >= 5 ? " disabled" : "") + ">Add step</button>"
      + "</div>";
  }

  function findTask(client, taskId) {
    return client.tasks.find(function (task) { return task.id === taskId; }) || null;
  }

  function openClient(id) {
    const client = state.data.clients.find(function (item) { return item.id === id; });
    if (!client) return;
    state.view = "client";
    state.clientId = id;
    state.mode = "dashboard";
    const next = client.tasks.find(function (task) { return taskStatus(task) !== "done"; }) || client.tasks[0];
    state.openTaskId = next ? next.id : null;
    render({ animate: true, scrollTop: true });
  }

  function removeTask(client, taskId) {
    const index = client.tasks.findIndex(function (task) { return task.id === taskId; });
    if (index < 0) return;
    const removed = client.tasks.splice(index, 1)[0];
    if (state.openTaskId === taskId) state.openTaskId = null;
    touch(client);
    save();
    render({ animate: false, keepScroll: true });
    showToast("Task removed", function () {
      client.tasks.splice(index, 0, removed);
      state.openTaskId = removed.id;
      touch(client);
      save();
      render({ animate: false, keepScroll: true });
    });
  }

  function removeClient(client) {
    const index = state.data.clients.findIndex(function (item) { return item.id === client.id; });
    if (index < 0) return;
    const removed = state.data.clients.splice(index, 1)[0];
    state.view = "roster";
    state.clientId = null;
    save();
    render({ animate: true, scrollTop: true });
    showToast("Client removed", function () {
      state.data.clients.splice(index, 0, removed);
      save();
      render({ animate: false });
    });
  }

  function assignTemplate(client, templateId) {
    if (client.tasks.some(function (task) { return task.templateId === templateId; })) {
      showToast("Already on this dashboard");
      return;
    }
    const template = state.data.templates.find(function (item) { return item.id === templateId; });
    if (!template) return;
    const id = uid("task");
    client.tasks.push({
      id: id,
      templateId: template.id,
      title: template.title,
      detail: template.detail,
      subtasks: template.steps.slice(0, 5).map(function (label, index) {
        return { id: id + "-s" + index, label: label, done: false };
      })
    });
    state.openTaskId = id;
    touch(client);
    save();
    render({ animate: false, keepScroll: true });
    showToast("Task added");
  }

  function createCustom(form) {
    const client = currentClient();
    if (!client) return;
    const title = form.title.value.trim();
    const detail = form.detail.value.trim();
    const lines = form.steps.value.split(/\n/).map(function (line) { return line.trim(); }).filter(Boolean);
    if (!title) {
      showToast("Add a task title");
      return;
    }
    if (!lines.length) {
      showToast("Add at least one step");
      return;
    }
    const id = uid("task");
    client.tasks.push({
      id: id,
      templateId: null,
      title: title.slice(0, 80),
      detail: detail.slice(0, 160),
      subtasks: lines.slice(0, 5).map(function (label, index) {
        return { id: id + "-s" + index, label: label.slice(0, 140), done: false };
      })
    });
    state.openTaskId = id;
    touch(client);
    save();
    render({ animate: false, keepScroll: true });
    showToast(lines.length > 5 ? "Task added with the first 5 steps" : "Custom task added");
  }

  function createClient(form) {
    if (state.data.clients.length >= 50) {
      showToast("This pilot holds up to 50 clients");
      return;
    }
    const name = form.clientname.value.trim();
    if (name.length < 2) {
      showToast("Enter a client name");
      return;
    }
    const client = {
      id: uid("client"),
      name: name.slice(0, 60),
      cohort: (form.group.value.trim() || "General").slice(0, 40),
      focus: (form.focus.value.trim() || "Custom checklist").slice(0, 80),
      updatedAt: new Date().toISOString(),
      tasks: []
    };
    state.data.clients.push(client);
    state.adding = false;
    state.view = "client";
    state.clientId = client.id;
    state.mode = "customize";
    state.openTaskId = null;
    save();
    render({ animate: true, scrollTop: true });
    showToast("Client added. Assign their tasks.");
  }

  function rename(action, el) {
    const client = currentClient();
    if (!client) return;
    const value = el.value.trim();
    if (action === "rename-client") {
      if (!value) {
        render({ animate: false, keepScroll: true });
        showToast("Client name is required");
        return;
      }
      client.name = value.slice(0, 60);
    } else if (action === "rename-group") {
      client.cohort = (value || "General").slice(0, 40);
    } else if (action === "rename-focus") {
      client.focus = (value || "Custom checklist").slice(0, 80);
    } else if (action === "rename-task" || action === "rename-detail" || action === "rename-sub") {
      const task = findTask(client, el.dataset.task);
      if (!task) return;
      if (action === "rename-detail") {
        task.detail = value.slice(0, 160);
      } else if (action === "rename-task") {
        if (!value) {
          render({ animate: false, keepScroll: true });
          showToast("Task title is required");
          return;
        }
        task.title = value.slice(0, 80);
      } else {
        const step = task.subtasks.find(function (item) { return item.id === el.dataset.sub; });
        if (!step) return;
        if (!value) {
          render({ animate: false, keepScroll: true });
          showToast("Step text is required");
          return;
        }
        step.label = value.slice(0, 140);
      }
    }
    touch(client);
    save();
    render({ animate: false, keepScroll: true });
  }

  function onClick(event) {
    const el = event.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    if (action === "toggle-sub" || action === "undo") {
      if (action === "undo" && state.undo) {
        const redo = state.undo;
        state.undo = null;
        hideToast();
        redo();
      }
      return;
    }
    const client = currentClient();
    if (action === "logout") {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(PLACE_KEY);
      state.view = "login";
      state.loginError = "";
      state.accessDraft = null;
      state.passDraft = null;
      render({ animate: true, scrollTop: true });
      return;
    }
    if (action === "go-roster") {
      state.view = "roster";
      state.clientId = null;
      render({ animate: true, scrollTop: true });
      return;
    }
    if (action === "open-client") {
      openClient(el.dataset.id);
      return;
    }
    if (action === "set-mode") {
      state.mode = el.dataset.mode === "customize" ? "customize" : "dashboard";
      render({ animate: false, keepScroll: true });
      return;
    }
    if (action === "toggle-open") {
      state.openTaskId = state.openTaskId === el.dataset.task ? null : el.dataset.task;
      render({ animate: false, keepScroll: true });
      return;
    }
    if (action === "toggle-add") {
      state.adding = !state.adding;
      render({ animate: false, keepScroll: true });
      return;
    }
    if (action === "toggle-reset") {
      state.armReset = true;
      render({ animate: false, keepScroll: true });
      return;
    }
    if (action === "cancel-reset") {
      state.armReset = false;
      render({ animate: false, keepScroll: true });
      return;
    }
    if (action === "confirm-reset") {
      const previous = state.data;
      state.data = PortalData.createSeed();
      state.armReset = false;
      state.view = "roster";
      state.clientId = null;
      state.query = "";
      state.cohort = "All";
      save();
      render({ animate: true, scrollTop: true });
      showToast("Sample roster restored", function () {
        state.data = previous;
        save();
        render({ animate: false });
      });
      return;
    }
    if (action === "cohort") {
      state.cohort = el.dataset.cohort || "All";
      render({ animate: false, keepScroll: true });
      return;
    }
    if (action === "task-filter") {
      state.taskFilter = el.dataset.filter || "all";
      render({ animate: false, keepScroll: true });
      return;
    }
    if (!client) return;
    if (action === "move-task") {
      const index = client.tasks.findIndex(function (task) { return task.id === el.dataset.task; });
      const next = index + (el.dataset.dir === "up" ? -1 : 1);
      if (index < 0 || next < 0 || next >= client.tasks.length) return;
      const moved = client.tasks.splice(index, 1)[0];
      client.tasks.splice(next, 0, moved);
      touch(client);
      save();
      render({ animate: false, keepScroll: true });
      return;
    }
    if (action === "remove-task") {
      removeTask(client, el.dataset.task);
      return;
    }
    if (action === "remove-client") {
      removeClient(client);
      return;
    }
    if (action === "add-template") {
      assignTemplate(client, el.dataset.id);
      return;
    }
    if (action === "add-sub") {
      const task = findTask(client, el.dataset.task);
      if (!task || task.subtasks.length >= 5) {
        showToast("Each task can have up to 5 steps");
        return;
      }
      task.subtasks.push({ id: uid("step"), label: "New step", done: false });
      touch(client);
      save();
      render({ animate: false, keepScroll: true });
      return;
    }
    if (action === "remove-sub") {
      const task = findTask(client, el.dataset.task);
      if (!task || task.subtasks.length <= 1) return;
      task.subtasks = task.subtasks.filter(function (step) { return step.id !== el.dataset.sub; });
      touch(client);
      save();
      render({ animate: false, keepScroll: true });
    }
  }

  function onChange(event) {
    const el = event.target;
    const action = el.dataset.action;
    if (!action) return;
    if (action === "sort") {
      state.sort = el.value;
      render({ animate: false, keepScroll: true });
      return;
    }
    if (action === "jump-client") {
      openClient(el.value);
      return;
    }
    if (action === "toggle-sub") {
      const client = currentClient();
      const task = client && findTask(client, el.dataset.task);
      const step = task && task.subtasks.find(function (item) { return item.id === el.dataset.sub; });
      if (!step) return;
      step.done = el.checked;
      touch(client);
      save();
      render({ animate: false, keepScroll: true });
      return;
    }
    if (action.indexOf("rename-") === 0) rename(action, el);
  }

  function onSubmit(event) {
    event.preventDefault();
    if (event.target.id === "login-form") {
      const access = document.getElementById("access-id").value;
      const pass = document.getElementById("passcode").value;
      state.accessDraft = access;
      state.passDraft = pass;
      if (access === ACCESS_FILLED && pass === PASS_FILLED) {
        sessionStorage.setItem(SESSION_KEY, "1");
        state.loginError = "";
        state.view = "roster";
        state.clientId = null;
        render({ animate: true, scrollTop: true });
        return;
      }
      state.loginError = access && pass ? "Those details do not match the pilot access." : "Enter the access ID and passcode.";
      render({ animate: false });
      return;
    }
    if (event.target.id === "add-client-form") createClient(event.target);
    if (event.target.id === "custom-task-form") createCustom(event.target);
  }

  function onInput(event) {
    if (event.target.id === "client-search") {
      state.query = event.target.value;
      render({ animate: false, keepScroll: true, focus: "client-search" });
      return;
    }
    if (event.target.id === "library-search") {
      state.libraryQuery = event.target.value;
      render({ animate: false, keepScroll: true, focus: "library-search" });
      return;
    }
    if (event.target.id === "access-id") state.accessDraft = event.target.value;
    if (event.target.id === "passcode") state.passDraft = event.target.value;
    if (state.loginError && (event.target.id === "access-id" || event.target.id === "passcode")) {
      state.loginError = "";
      const alert = document.getElementById("login-error");
      if (alert) alert.remove();
      const card = document.querySelector(".login-card");
      if (card) card.classList.remove("has-error");
    }
  }

  function onFocus(event) {
    if (event.target.id === "access-id" || event.target.id === "passcode") {
      event.target.removeAttribute("readonly");
    }
  }

  function boot() {
    state.data = load();
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      try {
        const place = JSON.parse(sessionStorage.getItem(PLACE_KEY) || "{}");
        if (place.view === "client" && state.data.clients.some(function (client) { return client.id === place.clientId; })) {
          state.view = "client";
          state.clientId = place.clientId;
          state.mode = place.mode === "customize" ? "customize" : "dashboard";
        } else {
          state.view = "roster";
        }
      } catch (err) {
        state.view = "roster";
      }
    }
    document.addEventListener("click", onClick);
    document.addEventListener("change", onChange);
    document.addEventListener("submit", onSubmit);
    document.addEventListener("input", onInput);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (!state.adding && !state.armReset) return;
      state.adding = false;
      state.armReset = false;
      render({ animate: false, keepScroll: true });
    });
    render({ animate: true });
  }

  boot();
})();
