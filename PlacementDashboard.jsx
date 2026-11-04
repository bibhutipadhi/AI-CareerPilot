import { CheckCircle2, CircleHelp, GraduationCap, MessageSquare, Code2, FileText } from "lucide-react";
import { readStored, storageKeys } from "./dataStore";
import "./NewModules.css";

const WEEK_AGO = new Date(Date.now() - 7 * 86400000).toISOString();

function storedArray(key) {
  const value = readStored(key, []);
  return Array.isArray(value) ? value : [];
}

export default function PlacementDashboard() {
  const resume = readStored(storageKeys.resume, null);
  const jobMatches = storedArray(storageKeys.jobMatches);
  const coding = storedArray(storageKeys.coding);
  const skills = storedArray(storageKeys.skills);
  const interviews = readStored(storageKeys.interview, null);
  const aptitude = storedArray(storageKeys.aptitude);

  const skillScore = skills.length
    ? Math.round(skills.reduce((sum, skill) => sum + (Number(skill.progress) || 0), 0) / skills.length)
    : null;
  const codingScore = coding.length
    ? Math.round(coding.reduce((sum, item) => sum + (item.total ? item.passed / item.total * 100 : 0), 0) / coding.length)
    : null;
  const resumeScore = Number.isFinite(resume?.score)
    ? resume.score
    : jobMatches.length
      ? Math.round(jobMatches.reduce((sum, item) => sum + item.score, 0) / jobMatches.length)
      : null;
  const interviewScore = Number.isInteger(interviews?.reviewedAnswers) && interviews.reviewedAnswers > 0
    ? Math.min(100, Math.round(interviews.reviewedAnswers / 3 * 100))
    : null;

  const dimensions = [
    { label: "Resume & job fit", score: resumeScore, detail: resume?.analyzedAt ? `Resume analyzed ${new Date(resume.analyzedAt).toLocaleDateString()}` : `${jobMatches.length} job match${jobMatches.length === 1 ? "" : "es"} recorded`, icon: FileText },
    { label: "Coding practice", score: codingScore, detail: `${coding.length} challenge${coding.length === 1 ? "" : "s"} with passing tests recorded`, icon: Code2 },
    { label: "Skill development", score: skillScore, detail: `${skills.length} skill${skills.length === 1 ? "" : "s"} tracked`, icon: GraduationCap },
    { label: "Interview practice", score: interviewScore, detail: `${interviews?.reviewedAnswers || 0} answer${interviews?.reviewedAnswers === 1 ? "" : "s"} reviewed; 3 is the progress target`, icon: MessageSquare },
  ];
  const available = dimensions.filter((item) => item.score !== null);
  const readiness = available.length
    ? Math.round(available.reduce((sum, item) => sum + item.score, 0) / available.length)
    : null;

  const weeklyItems = [
    ...coding.flatMap((item) => (Array.isArray(item.history) ? item.history : [item])
      .map((attempt) => ({ date: attempt.completedAt, description: `Passed ${attempt.passed}/${attempt.total} coding tests` }))),
    ...skills.flatMap((item) => [
      ...(Array.isArray(item.history) ? item.history : [{ progress: item.progress, updatedAt: item.updatedAt }])
        .map((event) => ({ date: event.updatedAt, description: `Updated ${item.name} progress to ${event.progress}%` })),
      ...(Array.isArray(item.sessions) ? item.sessions : [])
        .map((session) => ({ date: session.completedAt, description: `Practiced ${item.name} for ${session.minutes} min` })),
    ]),
    ...jobMatches.map((item) => ({ date: item.createdAt, description: `Job compatibility analysis: ${item.score}%` })),
    ...(Array.isArray(interviews?.history)
      ? interviews.history.map((date) => ({ date, description: "Practiced and reviewed an interview answer" }))
      : interviews?.reviewedAt
        ? [{ date: interviews.reviewedAt, description: `Reviewed interview answers (${interviews.reviewedAnswers} total)` }]
        : []),
    ...(Array.isArray(resume?.history)
      ? resume.history.map((item) => ({ date: item.analyzedAt, description: `Resume reviewed (${item.score}% keyword score)` }))
      : resume?.analyzedAt
        ? [{ date: resume.analyzedAt, description: `Resume reviewed (${resume.score}% keyword score)` }]
        : []),
  ].filter((item) => item.date && item.date >= WEEK_AGO)
    .sort((a, b) => b.date.localeCompare(a.date));

  return <div className="module-page">
    <header className="module-heading"><div className="module-icon"><GraduationCap size={24} /></div><div><p className="module-eyebrow">YOUR RECORDED PROGRESS</p><h1>Placement Readiness</h1><p>Scores use only activity recorded in your browser; missing areas are not counted as zero.</p></div></header>
    <section className="module-card readiness-summary">
      <div className="readiness-score">{readiness === null ? "—" : `${readiness}%`}</div>
      <div><h2>{readiness === null ? "Not enough data yet" : "Readiness across available areas"}</h2><p>{available.length} of {dimensions.length} areas have recorded progress.</p></div>
    </section>
    <div className="module-card-grid">{dimensions.map((item) => {
      const Icon = item.icon;
      return <article className="module-card readiness-card" key={item.label}>
        <div className="readiness-card-title"><Icon size={20} /><h2>{item.label}</h2></div>
        <strong>{item.score === null ? "Not recorded" : `${item.score}%`}</strong>
        {item.score !== null && <div className="progress-track"><div style={{ width: `${item.score}%` }} /></div>}
        <p className="module-muted">{item.detail}</p>
        {item.score === null && <CircleHelp size={17} aria-label="No data available" />}
      </article>;
    })}</div>
    <section className="module-section">
      <h2>This week's progress report</h2>
      {!weeklyItems.length ? <div className="module-card module-empty">No progress events were recorded in the last seven days.</div> : <div className="module-card">{weeklyItems.map((item, index) => <p className="weekly-event" key={`${item.date}-${index}`}><CheckCircle2 size={16} />{item.description}<time>{new Date(item.date).toLocaleDateString()}</time></p>)}</div>}
    </section>
    {aptitude[0] && <p className="module-muted">Latest career interest assessment saved {new Date(aptitude[0].completedAt).toLocaleDateString()}; it is exploratory and is not included in the readiness score.</p>}
    <p className="module-disclaimer">Readiness is a transparent progress indicator, not a prediction of placement or hiring outcomes.</p>
  </div>;
}
