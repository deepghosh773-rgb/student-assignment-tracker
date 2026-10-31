(() => {
  "use strict";
  const STORAGE_KEY = "studyflow.assignments.v1";
  const $ = (id) => document.getElementById(id);
  const state = { assignments: [], filter: "all", search: "", subject: "all", sort: "due-asc" };
  let toastTimer;

  const elements = {
    list: $("assignment-list"), empty: $("empty-state"), dialog: $("assignment-dialog"),
    form: $("assignment-form"), title: $("title-input"), subject: $("subject-input"),
    due: $("due-input"), description: $("description-input"), id: $("assignment-id"),
    error: $("form-error"), search: $("search-input"), subjectFilter: $("subject-filter"),
    sort: $("sort-select"), toast: $("toast")
  };

  function localDateString(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  function parseDate(dateString) {
    const [y, m, d] = dateString.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  function statusOf(item) {
    if (item.completed) return "completed";
    return item.dueDate < localDateString() ? "overdue" : "pending";
  }
  function formatDate(dateString, options = { day: "numeric", month: "short", year: "numeric" }) {
    if (!dateString) return "No date";
    return parseDate(dateString).toLocaleDateString(undefined, options);
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("Saved data is not a list.");
      state.assignments = parsed.filter(item =>
        item && typeof item.id === "string" &&
        typeof item.title === "string" && typeof item.subject === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate) &&
        typeof item.completed === "boolean"
      );
    } catch (error) {
      showToast("Saved data could not be read. You can import a backup.");
      console.error("Could not load assignments:", error);
      state.assignments = [];
    }
  }
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.assignments));
      return true;
    } catch (error) {
      console.error("Could not save assignments:", error);
      showToast("Could not save data. Check browser storage space/settings.");
      return false;
    }
  }
  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2600);
  }
  function counts() {
    const result = { all: state.assignments.length, pending: 0, completed: 0, overdue: 0 };
    state.assignments.forEach(item => result[statusOf(item)]++);
    return result;
  }
  function renderStats() {
    const c = counts();
    $("stat-total").textContent = c.all;
    $("stat-pending").textContent = c.pending;
    $("stat-completed").textContent = c.completed;
    $("stat-overdue").textContent = c.overdue;
    $("nav-all").textContent = c.all;
    $("nav-pending").textContent = c.pending;
    $("nav-completed").textContent = c.completed;
    $("nav-overdue").textContent = c.overdue;
  }
  function renderSubjects() {
    const current = state.subject;
    const subjects = [...new Set(state.assignments.map(a => a.subject.trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    elements.subjectFilter.innerHTML = '<option value="all">All subjects</option>' +
      subjects.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join("");
    if (subjects.includes(current)) elements.subjectFilter.value = current;
    else { state.subject = "all"; elements.subjectFilter.value = "all"; }
  }
  function visibleAssignments() {
    let items = state.assignments.filter(item => {
      const status = statusOf(item);
      const matchesStatus = state.filter === "all" || state.filter === status;
      const haystack = `${item.title} ${item.subject} ${item.description || ""}`.toLocaleLowerCase();
      const matchesSearch = haystack.includes(state.search.toLocaleLowerCase());
      const matchesSubject = state.subject === "all" || item.subject === state.subject;
      return matchesStatus && matchesSearch && matchesSubject;
    });
    items = [...items];
    if (state.sort === "due-asc") items.sort((a,b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title));
    if (state.sort === "due-desc") items.sort((a,b) => b.dueDate.localeCompare(a.dueDate) || a.title.localeCompare(b.title));
    if (state.sort === "title") items.sort((a,b) => a.title.localeCompare(b.title));
    if (state.sort === "created") items.sort((a,b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return items;
  }
  function renderList() {
    const items = visibleAssignments();
    const headings = { all: ["All assignments", "Everything you need to keep moving."], pending: ["Pending assignments", "Work that still needs your attention."], completed: ["Completed assignments", "Look at what you have accomplished."], overdue: ["Overdue assignments", "Unfinished work past its due date."] };
    $("list-heading").textContent = headings[state.filter][0];
    $("list-subtitle").textContent = headings[state.filter][1];
    elements.list.innerHTML = items.map(item => {
      const status = statusOf(item);
      const statusLabels = { pending: "Pending", completed: "Completed", overdue: "Overdue" };
      const dueText = status === "overdue" ? `Was due ${formatDate(item.dueDate)}` : `Due ${formatDate(item.dueDate)}`;
      return `<article class="assignment-row ${item.completed ? "is-complete" : ""}" data-id="${escapeHTML(item.id)}">
        <input class="complete-toggle" type="checkbox" aria-label="Mark ${escapeHTML(item.title)} completed" data-action="toggle" ${item.completed ? "checked" : ""}>
        <div class="assignment-main"><div class="assignment-title">${escapeHTML(item.title)}</div>
          <div class="assignment-meta"><span class="subject-tag">${escapeHTML(item.subject)}</span><span>${escapeHTML(dueText)}</span></div>
          ${item.description ? `<div class="assignment-meta">${escapeHTML(item.description)}</div>` : ""}
        </div>
        <div class="row-actions"><span class="status-badge status-${status}">${statusLabels[status]}</span>
          <button class="icon-button" data-action="edit" aria-label="Edit ${escapeHTML(item.title)}" title="Edit">✎</button>
          <button class="icon-button" data-action="delete" aria-label="Delete ${escapeHTML(item.title)}" title="Delete">⌫</button>
        </div>
      </article>`;
    }).join("");
    elements.empty.classList.toggle("visible", items.length === 0);
    elements.list.style.display = items.length === 0 ? "none" : "grid";
    $("result-count").textContent = `${items.length} ${items.length === 1 ? "assignment" : "assignments"}`;
  }
  function renderUpcoming() {
    const items = state.assignments.filter(a => !a.completed && a.dueDate >= localDateString())
      .sort((a,b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4);
    $("upcoming-list").innerHTML = items.length ? items.map(item => {
      const date = parseDate(item.dueDate);
      return `<div class="upcoming-item"><div class="date-tile"><strong>${date.getDate()}</strong><small>${date.toLocaleDateString(undefined,{month:"short"})}</small></div><div class="upcoming-copy"><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.subject)} · ${formatDate(item.dueDate,{day:"numeric",month:"short"})}</small></div></div>`;
    }).join("") : '<div class="upcoming-empty">No upcoming deadlines. Add an assignment to see it here.</div>';
  }
  function render() {
    renderStats(); renderSubjects(); renderList(); renderUpcoming();
  }
  function openDialog(item = null) {
    elements.form.reset();
    elements.error.textContent = "";
    elements.id.value = item ? item.id : "";
    $("dialog-title").textContent = item ? "Edit assignment" : "Add assignment";
    $("save-button").textContent = item ? "Save changes" : "Save assignment";
    elements.title.value = item ? item.title : "";
    elements.subject.value = item ? item.subject : "";
    elements.due.value = item ? item.dueDate : "";
    elements.description.value = item ? (item.description || "") : "";
    if (typeof elements.dialog.showModal === "function") elements.dialog.showModal();
    else showToast("This browser does not support the assignment dialog.");
    setTimeout(() => elements.title.focus(), 50);
  }
  function closeDialog() { elements.dialog.close(); }
  function validateForm() {
    const title = elements.title.value.trim();
    const subject = elements.subject.value.trim();
    const dueDate = elements.due.value;
    if (!title || !subject || !dueDate) return "Please fill in the title, subject, and due date.";
    if (title.length > 100 || subject.length > 60) return "Title or subject is too long.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(parseDate(dueDate).getTime()) ||
        localDateString(parseDate(dueDate)) !== dueDate) return "Please choose a valid due date.";
    if (elements.description.value.length > 500) return "Description must be 500 characters or fewer.";
    return "";
  }
  function saveAssignment(event) {
    event.preventDefault();
    const error = validateForm();
    if (error) { elements.error.textContent = error; return; }
    const id = elements.id.value;
    const existing = state.assignments.find(a => a.id === id);
    const item = {
      id: existing ? existing.id : (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
      title: elements.title.value.trim(),
      subject: elements.subject.value.trim(),
      dueDate: elements.due.value,
      description: elements.description.value.trim(),
      completed: existing ? existing.completed : false,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (existing) state.assignments = state.assignments.map(a => a.id === id ? item : a);
    else state.assignments.push(item);
    if (!persist()) return;
    closeDialog(); render(); showToast(existing ? "Assignment updated." : "Assignment added.");
  }
  function deleteAssignment(id) {
    const item = state.assignments.find(a => a.id === id);
    if (!item) return;
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone unless you have a backup.`)) return;
    state.assignments = state.assignments.filter(a => a.id !== id);
    if (persist()) { render(); showToast("Assignment deleted."); }
  }
  function toggleAssignment(id, completed) {
    state.assignments = state.assignments.map(a => a.id === id ? {...a, completed, updatedAt:new Date().toISOString()} : a);
    if (persist()) { render(); showToast(completed ? "Marked as completed." : "Marked as pending."); }
  }
  function setFilter(filter) {
    state.filter = filter;
    document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.filter === filter));
    renderList();
  }
  function exportBackup() {
    const data = { app: "StudyFlow", version: 1, exportedAt: new Date().toISOString(), assignments: state.assignments };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `studyflow-backup-${localDateString()}.json`; a.click();
    URL.revokeObjectURL(url); showToast("Backup export started.");
  }
  async function importBackup(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : parsed.assignments;
      if (!Array.isArray(items)) throw new Error("The file does not contain an assignments list.");
      const clean = items.map(item => {
        if (!item || typeof item.title !== "string" || !item.title.trim() ||
            typeof item.subject !== "string" || !item.subject.trim() ||
            typeof item.dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.dueDate)) {
          throw new Error("One or more assignments have invalid required fields.");
        }
        const due = parseDate(item.dueDate);
        if (Number.isNaN(due.getTime()) || localDateString(due) !== item.dueDate) throw new Error("A backup contains an invalid date.");
        return {
          id: typeof item.id === "string" ? item.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          title: item.title.trim().slice(0,100), subject: item.subject.trim().slice(0,60),
          dueDate: item.dueDate, description: typeof item.description === "string" ? item.description.slice(0,500) : "",
          completed: item.completed === true, createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });
      if (!window.confirm(`Import ${clean.length} assignments? This replaces the assignments currently saved in this browser.`)) return;
      state.assignments = clean;
      if (persist()) { state.filter="all";state.search="";state.subject="all";elements.search.value="";render();setFilter("all");showToast("Backup imported successfully."); }
    } catch (error) {
      showToast(error.message || "Could not import this backup.");
    } finally { $("import-input").value = ""; }
  }

  document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => setFilter(btn.dataset.filter)));
  ["top-add","add-inline","empty-add"].forEach(id => $(id).addEventListener("click", () => openDialog()));
  $("close-dialog").addEventListener("click", closeDialog);
  $("cancel-dialog").addEventListener("click", closeDialog);
  elements.dialog.addEventListener("click", event => { if (event.target === elements.dialog) closeDialog(); });
  elements.form.addEventListener("submit", saveAssignment);
  elements.list.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const row = button.closest("[data-id]");
    if (!row) return;
    const id = row.dataset.id;
    if (button.dataset.action === "edit") openDialog(state.assignments.find(a => a.id === id));
    if (button.dataset.action === "delete") deleteAssignment(id);
  });
  elements.list.addEventListener("change", event => {
    if (event.target.matches('[data-action="toggle"]')) {
      const row = event.target.closest("[data-id]");
      if (row) toggleAssignment(row.dataset.id, event.target.checked);
    }
  });
  elements.search.addEventListener("input", () => { state.search = elements.search.value.trim(); renderList(); });
  elements.subjectFilter.addEventListener("change", () => { state.subject = elements.subjectFilter.value; renderList(); });
  elements.sort.addEventListener("change", () => { state.sort = elements.sort.value; renderList(); });
  $("clear-search").addEventListener("click", () => {
    state.search="";state.subject="all";state.sort="due-asc";elements.search.value="";elements.subjectFilter.value="all";elements.sort.value="due-asc";setFilter("all");render();
  });
  $("export-btn").addEventListener("click", exportBackup);
  $("import-input").addEventListener("change", event => importBackup(event.target.files[0]));
  $("today-label").textContent = new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}).toUpperCase();
  loadData(); render();
})();