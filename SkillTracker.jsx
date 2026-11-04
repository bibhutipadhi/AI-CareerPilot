import { useState } from "react";
import { BookOpen, CalendarDays, Clock3, Flame, Plus, Target, TrendingUp, Trash2 } from "lucide-react";
import { currentTimestamp, readStored, storageKeys, writeStored } from "./dataStore";
import { findLearningResource } from "./learningResources";
import "./NewModules.css";

const weeklyGoalOptions = [60, 120, 180, 300, 420];

function makeId(prefix) {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeSkills(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((skill) => skill && typeof skill.name === "string" && skill.name.trim())
    .map((skill, index) => {
      const progress = Number(skill.progress);
      const updatedAt = typeof skill.updatedAt === "string" && Number.isFinite(new Date(skill.updatedAt).getTime())
        ? skill.updatedAt
        : new Date().toISOString();
      const history = Array.isArray(skill.history)
        ? skill.history.filter((event) => event && Number.isFinite(Number(event.progress)) && typeof event.updatedAt === "string").slice(-100)
        : [];
      const sessions = Array.isArray(skill.sessions)
        ? skill.sessions.filter((session) => session && Number.isFinite(Number(session.minutes)) && Number(session.minutes) > 0 && Number.isFinite(new Date(session.completedAt).getTime())).slice(-500)
        : [];
      return {
        ...skill,
        id: typeof skill.id === "string" && skill.id ? skill.id : `saved-skill-${index}-${skill.name}`,
        name: skill.name.trim().slice(0, 80),
        category: skill.category === "Soft skill" ? "Soft skill" : "Technical",
        progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0,
        updatedAt,
        history,
        sessions,
        milestone: typeof skill.milestone === "string" ? skill.milestone.slice(0, 140) : "",
      };
    });
}

function dateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function startOfWeek() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

function practiceStreak(sessions) {
  const practicedDates = new Set(sessions.map((session) => dateKey(new Date(session.completedAt))));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!practicedDates.has(dateKey(today))) today.setDate(today.getDate() - 1);
  let streak = 0;
  while (practicedDates.has(dateKey(today))) {
    streak += 1;
    today.setDate(today.getDate() - 1);
  }
  return streak;
}

function formatMinutes(minutes) {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export default function SkillTracker() {
  const [skills, setSkills] = useState(() => normalizeSkills(readStored(storageKeys.skills, [])));
  const [weeklyGoal, setWeeklyGoal] = useState(() => {
    const saved = readStored(storageKeys.skillWeeklyTarget, 180);
    return weeklyGoalOptions.includes(saved) ? saved : 180;
  });
  const [progressDrafts, setProgressDrafts] = useState({});
  const [milestoneDrafts, setMilestoneDrafts] = useState({});
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Technical");
  const [error, setError] = useState("");

  function persist(next) {
    setSkills(next);
    if (!writeStored(storageKeys.skills, next)) setError("Could not save progress in this browser.");
    else setError("");
  }

  function addSkill(event) {
    event.preventDefault();
    const normalized = name.trim();
    if (!normalized) return;
    if (skills.some((skill) => skill.name.toLowerCase() === normalized.toLowerCase())) {
      setError("That skill is already being tracked.");
      return;
    }
    if (skills.length >= 100) {
      setError("You can track up to 100 skills. Remove one before adding another.");
      return;
    }
    persist([...skills, {
      id: makeId("skill"),
      name: normalized.slice(0, 80),
      category,
      progress: 0,
      updatedAt: new Date().toISOString(),
      history: [],
      sessions: [],
      milestone: "",
    }]);
    setName("");
  }

  function updateProgress(id, progress) {
    const value = Math.max(0, Math.min(100, Number(progress)));
    const updatedAt = new Date().toISOString();
    let changed = false;
    const next = skills.map((skill) => {
      if (skill.id !== id || skill.progress === value) return skill;
      changed = true;
      const event = { progress: value, updatedAt };
      return {
        ...skill,
        progress: value,
        updatedAt,
        history: [...skill.history, event].slice(-100),
      };
    });
    setProgressDrafts((previous) => {
      const drafts = { ...previous };
      delete drafts[id];
      return drafts;
    });
    if (changed) persist(next);
  }

  function logPractice(id, minutes) {
    const session = { id: makeId("practice"), minutes, completedAt: currentTimestamp() };
    persist(skills.map((skill) => skill.id === id
      ? { ...skill, sessions: [...skill.sessions, session].slice(-500) }
      : skill));
  }

  function saveMilestone(event, id) {
    event.preventDefault();
    const existing = skills.find((skill) => skill.id === id);
    const milestone = (milestoneDrafts[id] ?? existing?.milestone ?? "").trim().slice(0, 140);
    if (!existing || existing.milestone === milestone) return;
    persist(skills.map((skill) => skill.id === id ? { ...skill, milestone } : skill));
    setMilestoneDrafts((previous) => {
      const drafts = { ...previous };
      delete drafts[id];
      return drafts;
    });
  }

  function saveWeeklyGoal(event) {
    const next = Number(event.target.value);
    if (!weeklyGoalOptions.includes(next)) return;
    setWeeklyGoal(next);
    if (!writeStored(storageKeys.skillWeeklyTarget, next)) setError("Weekly goal changed for this session, but could not be saved in this browser.");
    else setError("");
  }

  function resourceFor(skill) {
    return findLearningResource(skill.name);
  }

  const average = skills.length
    ? Math.round(skills.reduce((sum, skill) => sum + skill.progress, 0) / skills.length)
    : null;
  const sessions = skills.flatMap((skill) => skill.sessions);
  const weekStart = startOfWeek();
  const weeklySessions = sessions.filter((session) => new Date(session.completedAt) >= weekStart);
  const weeklyMinutes = weeklySessions.reduce((sum, session) => sum + Number(session.minutes), 0);
  const weeklyDays = new Set(weeklySessions.map((session) => dateKey(new Date(session.completedAt)))).size;
  const streak = practiceStreak(sessions);
  const goalProgress = Math.min(100, Math.round((weeklyMinutes / weeklyGoal) * 100));

  return <div className="module-page skill-tracker-page">
    <header className="module-heading">
      <div className="module-icon"><TrendingUp size={24} /></div>
      <div><p className="module-eyebrow">BUILD A CONSISTENT PRACTICE HABIT</p><h1>Skill Development Tracker</h1><p>Set a next milestone, log practice time, and review your self-assessed progress.</p></div>
    </header>

    <section className="module-card tracker-summary" aria-label="Weekly skill practice summary">
      <div className="tracker-summary-header">
        <div>
          <p className="module-eyebrow">WEEKLY PRACTICE GOAL</p>
          <h2>{weeklyMinutes >= weeklyGoal ? "Weekly goal reached" : "Build your weekly rhythm"}</h2>
          <p className="module-muted">{formatMinutes(weeklyMinutes)} practiced across {weeklyDays} day{weeklyDays === 1 ? "" : "s"} this week.</p>
        </div>
        <label className="tracker-goal-control"><span><Target size={15} />Weekly target</span>
          <select value={weeklyGoal} onChange={saveWeeklyGoal}>
            {weeklyGoalOptions.map((minutes) => <option value={minutes} key={minutes}>{formatMinutes(minutes)} / week</option>)}
          </select>
        </label>
      </div>
      <div className="tracker-goal-labels"><span>{formatMinutes(weeklyMinutes)} of {formatMinutes(weeklyGoal)}</span><strong>{goalProgress}%</strong></div>
      <div className="progress-track" role="progressbar" aria-label="Weekly practice goal" aria-valuemin={0} aria-valuemax={weeklyGoal} aria-valuenow={Math.min(weeklyMinutes, weeklyGoal)}><div style={{ width: `${goalProgress}%` }} /></div>
      <p className="tracker-goal-hint">{weeklyMinutes >= weeklyGoal ? "Great work. Keep the habit going." : `${formatMinutes(weeklyGoal - weeklyMinutes)} left to reach your weekly target.`}</p>
      <div className="tracker-stats-grid">
        <div className="tracker-stat"><TrendingUp size={19} /><span><strong>{average === null ? "—" : `${average}%`}</strong><small>average self-rating · {skills.length} skills</small></span></div>
        <div className="tracker-stat"><Flame size={19} /><span><strong>{streak} day{streak === 1 ? "" : "s"}</strong><small>current practice streak</small></span></div>
        <div className="tracker-stat"><CalendarDays size={19} /><span><strong>{weeklyDays} day{weeklyDays === 1 ? "" : "s"}</strong><small>active this week</small></span></div>
      </div>
    </section>

    <form className="module-card module-form module-search-grid" onSubmit={addSkill}>
      <label>Skill name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required placeholder="e.g. Python or Communication" /></label>
      <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Technical</option><option>Soft skill</option></select></label>
      <button className="module-primary" type="submit"><Plus size={18} />Track skill</button>
      {error && <p className="module-error" role="alert">{error}</p>}
    </form>

    {!skills.length && <div className="module-card module-empty">Add a skill above to set your first milestone and log a practice session.</div>}
    <div className="module-card-grid skill-tracker-grid">{skills.map((skill) => {
      const resource = resourceFor(skill);
      const skillWeekMinutes = skill.sessions
        .filter((session) => new Date(session.completedAt) >= weekStart)
        .reduce((sum, session) => sum + Number(session.minutes), 0);
      const displayedProgress = progressDrafts[skill.id] ?? skill.progress;
      const displayedMilestone = milestoneDrafts[skill.id] ?? skill.milestone;
      return <article className="module-card skill-card" key={skill.id}>
        <div className="skill-card-heading">
          <div><p className="module-eyebrow">{skill.category}</p><h3>{skill.name}</h3></div>
          <button className="module-icon-button" type="button" onClick={() => persist(skills.filter((item) => item.id !== skill.id))} aria-label={`Remove ${skill.name}`}><Trash2 size={17} /></button>
        </div>

        <label className="skill-progress-label"><span>Self-assessed progress <strong>{displayedProgress}%</strong></span>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={displayedProgress}
            aria-label={`${skill.name} self-assessed progress`}
            onChange={(event) => setProgressDrafts((previous) => ({ ...previous, [skill.id]: Number(event.target.value) }))}
            onPointerUp={(event) => updateProgress(skill.id, event.currentTarget.value)}
            onBlur={(event) => updateProgress(skill.id, event.currentTarget.value)}
          />
        </label>
        <div className="progress-track" role="progressbar" aria-label={`${skill.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={displayedProgress}><div style={{ width: `${displayedProgress}%` }} /></div>
        <p className="module-muted skill-updated">Progress updated {new Date(skill.updatedAt).toLocaleDateString()}</p>

        <form className="skill-milestone-form" onSubmit={(event) => saveMilestone(event, skill.id)}>
          <label>Next milestone<input value={displayedMilestone} onChange={(event) => setMilestoneDrafts((previous) => ({ ...previous, [skill.id]: event.target.value }))} maxLength={140} placeholder="e.g. Build a small project" /></label>
          <button className="module-secondary" type="submit" disabled={displayedMilestone.trim() === skill.milestone}>{skill.milestone ? "Save" : "Set milestone"}</button>
        </form>

        <div className="skill-practice-panel">
          <div className="skill-practice-heading"><div><h4>Practice this week</h4><p>{formatMinutes(skillWeekMinutes)} logged</p></div><Clock3 size={17} /></div>
          <div className="skill-practice-actions" aria-label={`Log practice for ${skill.name}`}>
            {[15, 30, 60].map((minutes) => <button type="button" key={minutes} onClick={() => logPractice(skill.id, minutes)} aria-label={`Log ${minutes} minutes of ${skill.name} practice`}>+{minutes} min</button>)}
          </div>
        </div>

        {resource ? <a className="resource-link" href={resource.url} target="_blank" rel="noreferrer"><BookOpen size={15} />{resource.title}</a> : <p className="module-muted skill-no-resource">No vetted resource is mapped yet for this skill.</p>}
      </article>;
    })}</div>
    <p className="module-disclaimer">Practice time and skill progress are self-reported and saved in this browser. Your weekly target starts over each Monday; your practice history is kept with each skill.</p>
  </div>;
}
