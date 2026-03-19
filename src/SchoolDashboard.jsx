import { useState, useEffect, useCallback } from "react";
import { SEED_EVENTS, SEED_TODOS, SEED_WEEK } from "./weekData";
import { STUDENT_NAME, TEACHER_NAME, SCHOOL_NAME, GRADE, MY_EMAIL, PARTNER_EMAIL } from "./config";

const STORAGE_KEY = "school-events-v6";
const TODO_KEY = "school-todos-v6";
const WEEK_KEY = "school-week-v6";

const makeCalLink = (title, startDate, endDate, description, addPartner = false) => {
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + 3600000);
  let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}&ctz=America/Los_Angeles&details=${encodeURIComponent(description)}&authuser=${MY_EMAIL}`;
  if (addPartner) url += `&add=${PARTNER_EMAIL}`;
  return url;
};

const guessType = (t) => {
  const l = t.toLowerCase();
  if (/test|quiz|exam/.test(l)) return "test";
  if (/fair|celebration|holi|party|movie|spirit|egg hunt/.test(l)) return "event";
  if (/volunteer|fundrais|sale/.test(l)) return "volunteer";
  if (/conference|meeting|parent/.test(l)) return "meeting";
  if (/break|holiday|no school|early release/.test(l)) return "break";
  return "event";
};

const typeConfig = {
  test: { emoji: "📝", color: "#E74C3C", bg: "#FDF0EF", label: "Test" },
  event: { emoji: "🎉", color: "#8E44AD", bg: "#F5EEF8", label: "Event" },
  volunteer: { emoji: "🤝", color: "#E67E22", bg: "#FEF5E7", label: "Volunteer" },
  meeting: { emoji: "👩‍🏫", color: "#2980B9", bg: "#EBF5FB", label: "Meeting" },
  break: { emoji: "🌴", color: "#27AE60", bg: "#EAFAF1", label: "Break" },
};

const todoPriorityConfig = {
  urgent: { color: "#E74C3C", bg: "#FDF0EF", label: "Urgent", icon: "🔴" },
  action: { color: "#E67E22", bg: "#FEF5E7", label: "Action Needed", icon: "🟠" },
  done: { color: "#27AE60", bg: "#EAFAF1", label: "Done", icon: "✅" },
};

const SUBJECTS = [
  { key: "character", icon: "💚", label: "Character", color: "#2E7D32", bg: "#E8F5E9" },
  { key: "reading", icon: "📖", label: "Reading", color: "#8E44AD", bg: "#F5EEF8" },
  { key: "grammar", icon: "✍️", label: "Grammar", color: "#E67E22", bg: "#FEF5E7" },
  { key: "vocabulary", icon: "📝", label: "Vocabulary", color: "#FF7043", bg: "#FBE9E7" },
  { key: "writing", icon: "🖊️", label: "Writing", color: "#5C6BC0", bg: "#E8EAF6" },
  { key: "math", icon: "🔢", label: "Math", color: "#2980B9", bg: "#EBF5FB" },
  { key: "science", icon: "🔬", label: "Science", color: "#27AE60", bg: "#EAFAF1" },
  { key: "history", icon: "🏛️", label: "History", color: "#795548", bg: "#EFEBE9" },
  { key: "recitation", icon: "🎤", label: "Recitation", color: "#AB47BC", bg: "#F3E5F5" },
  { key: "spelling", icon: "🔤", label: "Spelling", color: "#E74C3C", bg: "#FDF0EF" },
];


export default function SchoolDashboard() {
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [weekData, setWeekData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("week");
  const [eventsView, setEventsView] = useState("list"); // list | calendar
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [toast, setToast] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", date: "", type: "event" });
  const [expandedTodo, setExpandedTodo] = useState(null);
  const [editingTodo, setEditingTodo] = useState(null);
  const [todoForm, setTodoForm] = useState({ title: "", details: "", dueDate: "", priority: "action" });
  const [todoFilter, setTodoFilter] = useState("active");
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [expandedHome, setExpandedHome] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjForm, setSubjForm] = useState({ title: "", subtitle: "", topics: "", atHome: "", testDay: "" });
  const [editingWeekMeta, setEditingWeekMeta] = useState(false);
  const [weekMetaForm, setWeekMetaForm] = useState({ weekNumber: "", weekOf: "", affirmation: "" });

  useEffect(() => {
    const ld = (k, s, fn) => {
      try {
        const raw = localStorage.getItem(k);
        fn(raw ? JSON.parse(raw) : s);
        if (!raw) localStorage.setItem(k, JSON.stringify(s));
      } catch (e) { fn(s); }
    };
    ld(STORAGE_KEY, SEED_EVENTS, setEvents);
    ld(TODO_KEY, SEED_TODOS, setTodos);
    ld(WEEK_KEY, SEED_WEEK, setWeekData);
    setLoading(false);
  }, []);

  const sv = useCallback((k, d, fn) => {
    fn(d);
    try { localStorage.setItem(k, JSON.stringify(d)); } catch (e) { /* noop */ }
  }, []);

  const saveEv = (d) => sv(STORAGE_KEY, d, setEvents);
  const saveTd = (d) => sv(TODO_KEY, d, setTodos);
  const saveWk = (d) => sv(WEEK_KEY, d, setWeekData);
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));

  const thisWeekEv = events
    .filter((e) => { const d = new Date(e.date); return d >= today && d < endOfWeek; })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcomingEv = events
    .filter((e) => new Date(e.date) >= endOfWeek)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const calEv = events.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });
  const dim = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const fdow = new Date(selectedYear, selectedMonth, 1).getDay();
  const mNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const filtTd = todos
    .filter((t) => { if (todoFilter === "active") return !t.done; if (todoFilter === "done") return t.done; return true; })
    .sort((a, b) => {
      const p = { urgent: 0, action: 1, done: 3 };
      if (p[a.priority] !== p[b.priority]) return p[a.priority] - p[b.priority];
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
      return a.dueDate ? -1 : 1;
    });
  const actCt = todos.filter((t) => !t.done).length;

  const fmtDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
  };
  const fmtTime = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    const h = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
    const mins = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: false, timeZone: "America/Los_Angeles" });
    return mins === "0:00" || mins === "00:00" ? null : h;
  };
  const daysUntil = (iso) => {
    if (!iso) return "";
    const t2 = new Date(new Date(iso).getFullYear(), new Date(iso).getMonth(), new Date(iso).getDate());
    const d = Math.ceil((t2 - today) / 864e5);
    if (d === 0) return "Today";
    if (d === 1) return "Tomorrow";
    if (d < 0) return `${Math.abs(d)}d overdue`;
    return `In ${d}d`;
  };

  const iS = {
    border: "1.5px solid #E0E0E0", borderRadius: 8, padding: "9px 12px", fontSize: 13,
    fontFamily: "'DM Sans', sans-serif", outline: "none", width: "100%", boxSizing: "border-box",
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'DM Sans', sans-serif", background: "#FAFAF8" }}>
        <div style={{ fontSize: 18, color: "#888" }}>Loading...</div>
      </div>
    );
  }

  const Pill = ({ active, onClick, children }) => (
    <button onClick={onClick} style={{
      background: active ? "#1B4332" : "#fff", color: active ? "#fff" : "#666",
      border: active ? "1.5px solid #1B4332" : "1.5px solid #E0E0E0",
      borderRadius: 18, padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all .2s",
    }}>{children}</button>
  );

  const Btn = ({ onClick, children, primary, ml }) => (
    <button onClick={onClick} style={{
      background: primary ? "#1B4332" : "#fff", color: primary ? "#fff" : "#1B4332",
      border: primary ? "none" : "1.5px solid #E0E0E0", borderRadius: 9, padding: "7px 14px",
      fontSize: 12, fontWeight: 600, cursor: "pointer", boxShadow: primary ? "none" : "0 1px 3px rgba(0,0,0,.04)",
      marginLeft: ml ? "auto" : undefined,
    }}>{children}</button>
  );

  const EventCard = ({ ev }) => {
    const tc = typeConfig[ev.type] || typeConfig.event;
    const d = daysUntil(ev.date);
    const iT = d === "Today";
    const iTm = d === "Tomorrow";
    return (
      <div style={{
        background: "#fff", borderRadius: 12, padding: "13px 15px", marginBottom: 7,
        border: iT ? `2px solid ${tc.color}` : "1.5px solid #EDEDEA",
        boxShadow: iT ? `0 2px 10px ${tc.color}22` : "0 1px 3px rgba(0,0,0,.03)",
        display: "flex", alignItems: "flex-start", gap: 11,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{tc.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{ev.title}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: tc.color, background: tc.bg, padding: "1px 6px", borderRadius: 5 }}>{tc.label}</span>
          </div>
          <div style={{ fontSize: 12, color: "#777", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span>{fmtDate(ev.date)}{ev.endDate ? ` – ${fmtDate(ev.endDate)}` : ""}{fmtTime(ev.date) ? <> · <strong style={{ color: "#555" }}>{fmtTime(ev.date)}</strong></> : ""}</span>
            <span style={{ fontWeight: 600, color: iT ? tc.color : iTm ? "#E67E22" : "#999" }}>{d}</span>
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
            <a href={makeCalLink(ev.title + " (" + STUDENT_NAME + ")", ev.date, ev.endDate, "", false)} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 10, fontWeight: 600, color: "#1B4332", background: "#E8F5E9", padding: "3px 8px", borderRadius: 5, textDecoration: "none", border: "1px solid #C8E6C9" }}>📅 Me</a>
            <a href={makeCalLink(ev.title + " (" + STUDENT_NAME + ")", ev.date, ev.endDate, "", true)} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 10, fontWeight: 600, color: "#2D6A4F", background: "#F1F8E9", padding: "3px 8px", borderRadius: 5, textDecoration: "none", border: "1px solid #DCEDC8" }}>👫 Both</a>
            <button onClick={() => saveEv(events.filter((e2) => e2.id !== ev.id))}
              style={{ fontSize: 10, color: "#ccc", background: "transparent", padding: "3px 8px", borderRadius: 5, border: "1px solid #eee", cursor: "pointer" }}>🗑</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=Fraunces:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet" />
      <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#FAFAF8", minHeight: "100vh", color: "#1a1a1a" }}>

        {toast && <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999, background: "#1a1a1a", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 500, boxShadow: "0 8px 30px rgba(0,0,0,.15)", animation: "slideIn .3s ease" }}>{toast}</div>}

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #1B4332 0%, #2D6A4F 60%, #40916C 100%)", padding: "28px 22px 22px", color: "#fff", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.7, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 }}>{SCHOOL_NAME} · {GRADE} · {TEACHER_NAME}</div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, margin: "3px 0 10px", letterSpacing: "-0.02em" }}>{STUDENT_NAME}'s School Board 🎒</h1>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { key: "week", label: "📚 This Week" },
                { key: "home", label: "🏠 At Home" },
                { key: "todos", label: `✅ To-Do${actCt > 0 ? ` (${actCt})` : ""}` },
                { key: "events", label: "📅 Events" },
              ].map((v) => (
                <button key={v.key} onClick={() => setView(v.key)} style={{
                  background: view === v.key ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.08)",
                  border: view === v.key ? "1.5px solid rgba(255,255,255,.4)" : "1.5px solid transparent",
                  color: "#fff", padding: "5px 13px", borderRadius: 18, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all .2s",
                }}>{v.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div style={{ display: "flex", gap: 6, padding: "12px 18px 4px", flexWrap: "wrap" }}>
          {view === "todos" && <Btn onClick={() => { setEditingTodo("new"); setTodoForm({ title: "", details: "", dueDate: "", priority: "action" }); }}>➕ Add To-Do</Btn>}
          {view === "events" && <Btn onClick={() => { setEditingEvent("new"); setEditForm({ title: "", date: "", type: "event" }); }}>➕ Add Event</Btn>}
          {view === "week" && <Btn onClick={() => { setEditingWeekMeta(true); setWeekMetaForm({ weekNumber: weekData?.weekNumber || "", weekOf: weekData?.weekOf || "", affirmation: weekData?.affirmation || "" }); }}>✏️ Update Week</Btn>}
          <Btn onClick={async () => { await saveEv(SEED_EVENTS); await saveTd(SEED_TODOS); await saveWk(SEED_WEEK); showToast("Reset"); }} ml>↺</Btn>
        </div>

        {/* Modals */}
        {editingEvent && (
          <div style={{ margin: "6px 18px 0", background: "#fff", borderRadius: 12, border: "1.5px solid #E8E8E4", padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#1B4332" }}>{editingEvent === "new" ? "Add Event" : "Edit Event"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Title" style={iS} />
              <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} style={iS} />
              <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} style={iS}>
                {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </select>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn primary onClick={async () => {
                  if (editingEvent === "new") {
                    await saveEv([...events, { id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4), title: editForm.title || "Event", date: editForm.date ? new Date(editForm.date + "T17:00:00Z").toISOString() : new Date().toISOString(), type: editForm.type, source: "Manual" }]);
                  } else {
                    await saveEv(events.map((e) => e.id === editingEvent ? { ...e, title: editForm.title, date: new Date(editForm.date + "T17:00:00Z").toISOString(), type: editForm.type } : e));
                  }
                  setEditingEvent(null); showToast("Saved");
                }}>Save</Btn>
                <Btn onClick={() => setEditingEvent(null)}>Cancel</Btn>
              </div>
            </div>
          </div>
        )}

        {editingTodo && (
          <div style={{ margin: "6px 18px 0", background: "#fff", borderRadius: 12, border: "1.5px solid #E8E8E4", padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#1B4332" }}>{editingTodo === "new" ? "Add To-Do" : "Edit To-Do"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={todoForm.title} onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })} placeholder="What needs doing?" style={iS} />
              <textarea value={todoForm.details} onChange={(e) => setTodoForm({ ...todoForm, details: e.target.value })} placeholder="Details..." rows={2} style={{ ...iS, resize: "vertical" }} />
              <input type="date" value={todoForm.dueDate} onChange={(e) => setTodoForm({ ...todoForm, dueDate: e.target.value })} style={iS} />
              <select value={todoForm.priority} onChange={(e) => setTodoForm({ ...todoForm, priority: e.target.value })} style={iS}>
                {Object.entries(todoPriorityConfig).filter(([k]) => k !== "done").map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn primary onClick={async () => {
                  if (editingTodo === "new") {
                    await saveTd([...todos, { id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4), title: todoForm.title || "To-do", details: todoForm.details, dueDate: todoForm.dueDate ? new Date(todoForm.dueDate + "T17:00:00Z").toISOString() : null, priority: todoForm.priority, done: false, source: "Manual" }]);
                  } else {
                    await saveTd(todos.map((t) => t.id === editingTodo ? { ...t, title: todoForm.title, details: todoForm.details, dueDate: todoForm.dueDate ? new Date(todoForm.dueDate + "T17:00:00Z").toISOString() : null, priority: todoForm.priority } : t));
                  }
                  setEditingTodo(null); showToast("Saved");
                }}>Save</Btn>
                <Btn onClick={() => setEditingTodo(null)}>Cancel</Btn>
              </div>
            </div>
          </div>
        )}

        {editingWeekMeta && (
          <div style={{ margin: "6px 18px 0", background: "#fff", borderRadius: 12, border: "1.5px solid #E8E8E4", padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#1B4332" }}>Update Week</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={weekMetaForm.weekNumber} onChange={(e) => setWeekMetaForm({ ...weekMetaForm, weekNumber: e.target.value })} placeholder="#" style={{ ...iS, width: 60 }} />
                <input value={weekMetaForm.weekOf} onChange={(e) => setWeekMetaForm({ ...weekMetaForm, weekOf: e.target.value })} placeholder="Week of..." style={iS} />
              </div>
              <input value={weekMetaForm.affirmation} onChange={(e) => setWeekMetaForm({ ...weekMetaForm, affirmation: e.target.value })} placeholder="Affirmation" style={iS} />
              <div style={{ display: "flex", gap: 6 }}>
                <Btn primary onClick={async () => { await saveWk({ ...weekData, ...weekMetaForm }); setEditingWeekMeta(false); showToast("Updated"); }}>Save</Btn>
                <Btn onClick={() => setEditingWeekMeta(false)}>Cancel</Btn>
              </div>
            </div>
          </div>
        )}

        {editingSubject && (
          <div style={{ margin: "6px 18px 0", background: "#fff", borderRadius: 12, border: "1.5px solid #E8E8E4", padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#1B4332" }}>Edit {SUBJECTS.find((s) => s.key === editingSubject)?.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={subjForm.title} onChange={(e) => setSubjForm({ ...subjForm, title: e.target.value })} placeholder="Title / Focus" style={iS} />
              <input value={subjForm.subtitle} onChange={(e) => setSubjForm({ ...subjForm, subtitle: e.target.value })} placeholder="Subtitle" style={iS} />
              <input value={subjForm.topics} onChange={(e) => setSubjForm({ ...subjForm, topics: e.target.value })} placeholder="Topics (comma-separated)" style={iS} />
              <textarea value={subjForm.atHome} onChange={(e) => setSubjForm({ ...subjForm, atHome: e.target.value })} placeholder="At-home tips and activities..." rows={4} style={{ ...iS, resize: "vertical" }} />
              <input value={subjForm.testDay} onChange={(e) => setSubjForm({ ...subjForm, testDay: e.target.value })} placeholder="Test day" style={iS} />
              <div style={{ display: "flex", gap: 6 }}>
                <Btn primary onClick={async () => {
                  await saveWk({ ...weekData, subjects: { ...weekData.subjects, [editingSubject]: { ...weekData.subjects[editingSubject], title: subjForm.title, subtitle: subjForm.subtitle, topics: subjForm.topics.split(",").map((s) => s.trim()).filter(Boolean), atHome: subjForm.atHome, testDay: subjForm.testDay || null } } });
                  setEditingSubject(null); showToast("Updated");
                }}>Save</Btn>
                <Btn onClick={() => setEditingSubject(null)}>Cancel</Btn>
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: "8px 18px 28px" }}>

          {/* THIS WEEK */}
          {view === "week" && weekData && (
            <div>
              <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 10, border: "1.5px solid #EDEDEA" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: 1 }}>Week {weekData.weekNumber}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1B4332", fontFamily: "'Fraunces', serif" }}>{weekData.weekOf}</div>
                {weekData.affirmation && (
                  <div style={{ background: "linear-gradient(135deg, #F0FAF4, #E8F5E9)", borderRadius: 9, padding: "10px 13px", marginTop: 10, display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ fontSize: 18 }}>💚</span>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#2D6A4F", textTransform: "uppercase", letterSpacing: 0.5 }}>Affirmation</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1B4332", fontFamily: "'Fraunces', serif", fontStyle: "italic" }}>"{weekData.affirmation}"</div>
                    </div>
                  </div>
                )}
              </div>

              {SUBJECTS.map((subj) => {
                const data = weekData.subjects && weekData.subjects[subj.key];
                if (!data || (!data.title && (!data.topics || data.topics.length === 0))) return null;
                const isExp = expandedSubject === subj.key;

                return (
                  <div key={subj.key} style={{
                    background: "#fff", borderRadius: 12, marginBottom: 7,
                    border: isExp ? `2px solid ${subj.color}44` : "1.5px solid #EDEDEA",
                    boxShadow: isExp ? `0 3px 14px ${subj.color}11` : "0 1px 3px rgba(0,0,0,.03)",
                    overflow: "hidden", transition: "all .25s",
                  }}>
                    <div onClick={() => setExpandedSubject(isExp ? null : subj.key)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", cursor: "pointer", userSelect: "none" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: subj.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{subj.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: "#1a1a1a" }}>{subj.label}</span>
                          {data.testDay && <span style={{ fontSize: 9, fontWeight: 700, color: "#E74C3C", background: "#FDF0EF", padding: "1px 6px", borderRadius: 4 }}>📝 {data.testDay}</span>}
                        </div>
                        <div style={{ fontSize: 11.5, color: "#888", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {data.title || (data.topics && data.topics.join(", "))}
                        </div>
                      </div>
                      <div style={{ fontSize: 14, color: "#ccc", transition: "transform .2s", transform: isExp ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>▾</div>
                    </div>

                    {isExp && (
                      <div style={{ padding: "0 13px 13px", borderTop: "1px solid #f0f0ee", animation: "fadeIn .2s ease" }}>
                        <div style={{ background: subj.bg, borderRadius: 9, padding: "11px 13px", marginTop: 9 }}>
                          {data.title && <div style={{ fontSize: 14, fontWeight: 600, color: subj.color }}>{data.title}</div>}
                          {data.subtitle && <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{data.subtitle}</div>}
                          {data.topics && data.topics.length > 0 && (
                            <div style={{ marginTop: data.title ? 7 : 0 }}>
                              {data.topics.map((t, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: i < data.topics.length - 1 ? 4 : 0 }}>
                                  <div style={{ width: 5, height: 5, borderRadius: 3, background: subj.color, flexShrink: 0, marginTop: 5 }} />
                                  <span style={{ fontSize: 12.5, color: "#333", lineHeight: 1.4 }}>{t}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {data.testDay && <div style={{ fontSize: 11, color: "#E74C3C", fontWeight: 600, marginTop: 7 }}>📝 Test: {data.testDay}</div>}
                        </div>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          const s = weekData.subjects[subj.key] || {};
                          setEditingSubject(subj.key);
                          setSubjForm({ title: s.title || "", subtitle: s.subtitle || "", topics: (s.topics || []).join(", "), atHome: s.atHome || "", testDay: s.testDay || "" });
                        }} style={{ fontSize: 10, color: "#999", background: "#f8f8f8", padding: "4px 10px", borderRadius: 5, border: "1px solid #eee", cursor: "pointer", marginTop: 8 }}>✏️ Edit</button>
                      </div>
                    )}
                  </div>
                );
              })}
              {weekData.source && <div style={{ fontSize: 10, color: "#bbb", marginTop: 8 }}>📩 {weekData.source}</div>}
            </div>
          )}

          {/* AT HOME */}
          {view === "home" && weekData && (
            <div>
              <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, border: "1.5px solid #EDEDEA" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: 1 }}>Week {weekData.weekNumber} · At Home</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1B4332", fontFamily: "'Fraunces', serif", marginTop: 2 }}>Supporting {STUDENT_NAME}'s Learning 🏠</div>
                <div style={{ fontSize: 12.5, color: "#777", marginTop: 6, lineHeight: 1.5 }}>
                  Beyond homework — conversation starters, enrichment activities, and ways to connect with what {STUDENT_NAME} is exploring at school.
                </div>
              </div>

              {SUBJECTS.filter((s) => !["grammar", "vocabulary", "math", "recitation", "spelling"].includes(s.key)).map((subj) => {
                const data = weekData.subjects && weekData.subjects[subj.key];
                if (!data || !data.atHome) return null;
                const isExp = expandedHome === subj.key;

                return (
                  <div key={subj.key} style={{
                    background: "#fff", borderRadius: 12, marginBottom: 7,
                    border: isExp ? `2px solid ${subj.color}44` : "1.5px solid #EDEDEA",
                    boxShadow: isExp ? `0 3px 14px ${subj.color}11` : "0 1px 3px rgba(0,0,0,.03)",
                    overflow: "hidden", transition: "all .25s",
                  }}>
                    <div onClick={() => setExpandedHome(isExp ? null : subj.key)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", cursor: "pointer", userSelect: "none" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: subj.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{subj.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a1a" }}>{subj.label}</div>
                        <div style={{ fontSize: 11.5, color: "#888", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {data.title || "Tips & activities"}
                        </div>
                      </div>
                      {data.testDay && <span style={{ fontSize: 9, fontWeight: 700, color: "#E74C3C", background: "#FDF0EF", padding: "1px 6px", borderRadius: 4, flexShrink: 0 }}>📝 {data.testDay}</span>}
                      <div style={{ fontSize: 14, color: "#ccc", transition: "transform .2s", transform: isExp ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>▾</div>
                    </div>

                    {isExp && (
                      <div style={{ padding: "0 13px 13px", borderTop: "1px solid #f0f0ee", animation: "fadeIn .2s ease" }}>
                        <div style={{ marginTop: 9, padding: "12px 14px", background: "linear-gradient(135deg, #FAFAF8, #F5F5F0)", borderRadius: 9, fontSize: 13, color: "#444", lineHeight: 1.65, whiteSpace: "pre-line" }}>
                          {data.atHome}
                        </div>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          const s = weekData.subjects[subj.key] || {};
                          setEditingSubject(subj.key);
                          setSubjForm({ title: s.title || "", subtitle: s.subtitle || "", topics: (s.topics || []).join(", "), atHome: s.atHome || "", testDay: s.testDay || "" });
                        }} style={{ fontSize: 10, color: "#999", background: "#f8f8f8", padding: "4px 10px", borderRadius: 5, border: "1px solid #eee", cursor: "pointer", marginTop: 8 }}>✏️ Edit</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TODOS */}
          {view === "todos" && (
            <div>
              <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                {[{ key: "active", label: `Active (${todos.filter((t) => !t.done).length})` }, { key: "done", label: `Done (${todos.filter((t) => t.done).length})` }, { key: "all", label: "All" }].map((f) => (
                  <Pill key={f.key} active={todoFilter === f.key} onClick={() => setTodoFilter(f.key)}>{f.label}</Pill>
                ))}
              </div>
              {filtTd.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "#aaa", fontSize: 13 }}>All clear!</div>}
              {filtTd.map((todo) => {
                const pc = todoPriorityConfig[todo.priority] || todoPriorityConfig.action;
                const isExp = expandedTodo === todo.id;
                const d = daysUntil(todo.dueDate);
                const isOv = todo.dueDate && !todo.done && new Date(todo.dueDate) < today;
                return (
                  <div key={todo.id} style={{ background: "#fff", borderRadius: 12, marginBottom: 7, border: isOv ? "2px solid #E74C3C" : isExp ? `2px solid ${pc.color}44` : "1.5px solid #EDEDEA", overflow: "hidden", transition: "all .25s" }}>
                    <div onClick={() => setExpandedTodo(isExp ? null : todo.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 13px", cursor: "pointer", userSelect: "none" }}>
                      <div onClick={(e) => { e.stopPropagation(); saveTd(todos.map((t) => t.id === todo.id ? { ...t, done: !t.done, priority: !t.done ? "done" : "action" } : t)); }}
                        style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: todo.done ? "none" : `2px solid ${pc.color}88`, background: todo.done ? "#27AE60" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        {todo.done && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: todo.done ? "#aaa" : "#1a1a1a", textDecoration: todo.done ? "line-through" : "none" }}>{todo.title}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: pc.color, background: pc.bg, padding: "1px 6px", borderRadius: 5, textTransform: "uppercase" }}>{pc.icon} {pc.label}</span>
                        </div>
                        {todo.dueDate && <div style={{ fontSize: 11, color: isOv ? "#E74C3C" : "#888", marginTop: 2, fontWeight: isOv ? 600 : 400 }}>{fmtDate(todo.dueDate)} · {d}</div>}
                      </div>
                      <div style={{ fontSize: 14, color: "#ccc", transition: "transform .2s", transform: isExp ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>▾</div>
                    </div>
                    {isExp && (
                      <div style={{ padding: "0 13px 13px", borderTop: "1px solid #f0f0ee", animation: "fadeIn .2s ease" }}>
                        {todo.details && <div style={{ background: "#FAFAF8", borderRadius: 9, padding: "10px 12px", marginTop: 9, fontSize: 12.5, color: "#444", lineHeight: 1.55 }}>{todo.details}</div>}
                        {todo.source && <div style={{ fontSize: 10, color: "#aaa", marginTop: 7 }}>📩 {todo.source}</div>}
                        <div style={{ display: "flex", gap: 5, marginTop: 9, flexWrap: "wrap" }}>
                          {todo.dueDate && (
                            <>
                              <a href={makeCalLink(todo.title + " (" + STUDENT_NAME + ")", todo.dueDate, null, todo.details || "", false)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, fontWeight: 600, color: "#1B4332", background: "#E8F5E9", padding: "3px 9px", borderRadius: 5, textDecoration: "none", border: "1px solid #C8E6C9" }}>📅 Me</a>
                              <a href={makeCalLink(todo.title + " (" + STUDENT_NAME + ")", todo.dueDate, null, todo.details || "", true)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, fontWeight: 600, color: "#2D6A4F", background: "#F1F8E9", padding: "3px 9px", borderRadius: 5, textDecoration: "none", border: "1px solid #DCEDC8" }}>👫 Both</a>
                            </>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); setEditingTodo(todo.id); setTodoForm({ title: todo.title, details: todo.details || "", dueDate: todo.dueDate ? todo.dueDate.split("T")[0] : "", priority: todo.priority }); }} style={{ fontSize: 10, color: "#999", background: "#f8f8f8", padding: "3px 9px", borderRadius: 5, border: "1px solid #eee", cursor: "pointer" }}>✏️</button>
                          <button onClick={(e) => { e.stopPropagation(); saveTd(todos.filter((t) => t.id !== todo.id)); showToast("Removed"); }} style={{ fontSize: 10, color: "#ccc", background: "transparent", padding: "3px 9px", borderRadius: 5, border: "1px solid #eee", cursor: "pointer" }}>🗑</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* EVENTS (list + calendar toggle) */}
          {view === "events" && (
            <div>
              <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
                <Pill active={eventsView === "list"} onClick={() => setEventsView("list")}>📋 List</Pill>
                <Pill active={eventsView === "calendar"} onClick={() => setEventsView("calendar")}>🗓 Calendar</Pill>
              </div>

              {eventsView === "list" && (
                <div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1B4332", textTransform: "uppercase", letterSpacing: 1, marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: 4, background: "#27AE60" }} /> This Week
                    </div>
                    {thisWeekEv.length === 0
                      ? <div style={{ fontSize: 12, color: "#aaa", padding: "8px 0" }}>No events this week.</div>
                      : thisWeekEv.map((ev) => <EventCard key={ev.id} ev={ev} />)
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1B4332", textTransform: "uppercase", letterSpacing: 1, marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: 4, background: "#2980B9" }} /> Coming Up
                    </div>
                    {upcomingEv.length === 0
                      ? <div style={{ fontSize: 12, color: "#aaa", padding: "8px 0" }}>Nothing upcoming.</div>
                      : upcomingEv.map((ev) => <EventCard key={ev.id} ev={ev} />)
                    }
                  </div>
                </div>
              )}

              {eventsView === "calendar" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <button onClick={() => { if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); } else setSelectedMonth(selectedMonth - 1); }}
                      style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: "2px 8px" }}>‹</button>
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, color: "#1B4332" }}>{mNames[selectedMonth]} {selectedYear}</span>
                    <button onClick={() => { if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); } else setSelectedMonth(selectedMonth + 1); }}
                      style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: "2px 8px" }}>›</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: "#fff", borderRadius: 12, overflow: "hidden", border: "1.5px solid #EDEDEA" }}>
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                      <div key={i} style={{ padding: "6px 3px", textAlign: "center", fontSize: 10, fontWeight: 600, color: "#999", background: "#FAFAF8" }}>{d}</div>
                    ))}
                    {Array.from({ length: fdow }).map((_, i) => <div key={`e${i}`} style={{ padding: 4, minHeight: 48, background: "#FDFDFC" }} />)}
                    {Array.from({ length: dim }).map((_, i) => {
                      const day = i + 1;
                      const dEv = calEv.filter((e) => parseInt(new Date(e.date).toLocaleDateString("en-US", { day: "numeric", timeZone: "America/Los_Angeles" })) === day);
                      const isT = day === now.getDate() && selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
                      return (
                        <div key={day} style={{ padding: "3px 3px 4px", minHeight: 48, background: isT ? "#F0FAF4" : "#fff", borderTop: "1px solid #f0f0ee" }}>
                          <div style={{ fontSize: 10, fontWeight: isT ? 700 : 400, color: isT ? "#1B4332" : "#666", textAlign: "right", padding: "0 1px 1px" }}>{day}</div>
                          {dEv.slice(0, 2).map((ev) => {
                            const tc = typeConfig[ev.type] || typeConfig.event;
                            return (
                              <div key={ev.id} style={{ fontSize: 8.5, fontWeight: 600, color: tc.color, background: tc.bg, borderRadius: 3, padding: "1px 2px", marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={ev.title}>
                                {tc.emoji}{ev.title.length > 9 ? ev.title.slice(0, 9) + "…" : ev.title}
                              </div>
                            );
                          })}
                          {dEv.length > 2 && <div style={{ fontSize: 8, color: "#999", textAlign: "center" }}>+{dEv.length - 2}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        <style>{`
          @keyframes slideIn { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
          * { box-sizing: border-box; }
          button:hover { opacity: 0.85; }
          a:hover { opacity: 0.85; }
        `}</style>
      </div>
    </>
  );
}
