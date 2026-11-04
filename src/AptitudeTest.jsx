import { useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import { postApi } from "./api";
import { readStored, storageKeys, writeStored } from "./dataStore";
import "./NewModules.css";

const paths = ["Software Developer", "Data Analyst", "Product Designer", "Technical Product Manager"];
const questions = [
  { prompt: "Which kind of task sounds most satisfying?", choices: [["Build a useful tool", 0], ["Find patterns in information", 1], ["Make a confusing experience easier", 2], ["Coordinate people toward a goal", 3]] },
  { prompt: "When facing a new problem, you usually want to...", choices: [["Try a technical solution", 0], ["Gather evidence and compare options", 1], ["Understand the people affected", 2], ["Organize a plan and align others", 3]] },
  { prompt: "Which school or personal activity do you enjoy most?", choices: [["Programming or robotics", 0], ["Math, research, or spreadsheets", 1], ["Art, writing, or visual design", 2], ["Clubs, events, or team leadership", 3]] },
  { prompt: "What would you most like to improve in a product?", choices: [["How reliably it works", 0], ["How well decisions use data", 1], ["How clear and accessible it feels", 2], ["How well teams deliver it", 3]] },
  { prompt: "Which kind of output would you be proudest to show?", choices: [["A working application", 0], ["An insight backed by analysis", 1], ["A polished interface or prototype", 2], ["A product plan with measurable results", 3]] },
  { prompt: "When learning something difficult, you prefer to...", choices: [["Experiment and debug", 0], ["Study examples and test hypotheses", 1], ["Sketch ideas and gather feedback", 2], ["Break work into milestones", 3]] },
  { prompt: "Which work environment appeals to you?", choices: [["Focused building and problem solving", 0], ["Investigation and evidence", 1], ["Creative collaboration", 2], ["Cross-functional planning", 3]] },
  { prompt: "What motivates you most?", choices: [["Making technology work", 0], ["Discovering what the numbers mean", 1], ["Helping people through thoughtful design", 2], ["Turning a vision into a coordinated result", 3]] },
];

export default function AptitudeTest() {
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState(null);
  const [personalization, setPersonalization] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const history = readStored(storageKeys.aptitude, []);

  function finish() {
    const scores = [0, 0, 0, 0];
    Object.values(answers).forEach((choice) => { scores[choice] += 1; });
    const ranked = paths.map((career, index) => ({ career, score: scores[index] }))
      .sort((a, b) => b.score - a.score);
    const next = { scores: ranked, completedAt: new Date().toISOString(), answered: Object.keys(answers).length };
    setResult(next);
    setPersonalization("");
    const previous = readStored(storageKeys.aptitude, []);
    if (!writeStored(storageKeys.aptitude, [next, ...(Array.isArray(previous) ? previous : [])].slice(0, 10))) {
      setError("Your assessment results are available, but could not be saved in this browser.");
    }
  }

  async function getGuidance() {
    if (!result) return;
    setLoading(true);
    setError("");
    try {
      const data = await postApi("/api/aptitude-guidance", { scores: result.scores });
      if (typeof data.guidance !== "string" || !data.guidance.trim()) {
        throw new Error("The AI service returned empty career guidance.");
      }
      setPersonalization(data.guidance);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not personalize these results.");
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setAnswers({});
    setCurrent(0);
    setResult(null);
    setPersonalization("");
    setError("");
  }

  if (result) return <div className="module-page aptitude-page">
    <header className="module-heading">
      <div className="module-icon"><Sparkles size={24} /></div>
      <div>
        <p className="module-eyebrow">EXPLORATORY SELF-ASSESSMENT</p>
        <h1>Your career interests</h1>
        <p>Use these results as a starting point for exploring paths that fit what you enjoy.</p>
      </div>
    </header>
    <section className="module-card aptitude-results" aria-label="Career interest results">
      <div className="aptitude-results-heading">
        <div>
          <p className="module-eyebrow">YOUR INTEREST PROFILE</p>
          <h2>Career directions to explore</h2>
          <p>Based on your answers to {result.answered} reflection prompts.</p>
        </div>
        <span className="aptitude-results-count">{result.answered} of {questions.length} answered</span>
      </div>
      <div className="module-card-grid aptitude-results-grid">
        {result.scores.map((item, index) => (
          <article className={`aptitude-result ${index === 0 ? "top-match" : ""}`} key={item.career}>
            <div className="aptitude-result-top">
              <span className="aptitude-result-label">{index === 0 ? "Top match" : `Option ${index + 1}`}</span>
              <div className="aptitude-score">{item.score}<small>/{questions.length}</small></div>
            </div>
            <h3>{item.career}</h3>
            <p>{index === 0 ? "Your answers leaned most toward this path." : "This path also connects with some of your interests."}</p>
            <div className="progress-track" role="progressbar" aria-label={`${item.career} interest score`} aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={item.score}>
              <div style={{ width: `${item.score / questions.length * 100}%` }} />
            </div>
          </article>
        ))}
      </div>
      <div className="module-button-row aptitude-result-actions">
        <button className="module-primary" type="button" onClick={getGuidance} disabled={loading}>
          {loading ? <LoaderCircle className="module-spin" size={18} /> : <Sparkles size={18} />}
          {loading ? "Preparing guidance..." : "Get personalized career guidance"}
        </button>
        <button className="module-secondary" type="button" onClick={restart}>Retake assessment</button>
      </div>
      {personalization && <div className="module-markdown aptitude-guidance" aria-live="polite"><p>{personalization}</p></div>}
      {error && <p className="module-error" role="alert">{error}</p>}
    </section>
    <p className="module-disclaimer">These suggestions reflect your selected interests. Explore them alongside real-world experience and advice; this is not a validated psychological or hiring assessment.</p>
  </div>;

  const question = questions[current];
  const selected = answers[current];
  return <div className="module-page aptitude-page">
    <header className="module-heading">
      <div className="module-icon"><Sparkles size={24} /></div>
      <div>
        <p className="module-eyebrow">EXPLORATORY SELF-ASSESSMENT</p>
        <h1>Career Aptitude Test</h1>
        <p>Answer based on what interests you, not what you think is expected.</p>
      </div>
    </header>
    <section className="module-card aptitude-question" aria-labelledby="aptitude-question-title">
      <div className="aptitude-question-meta">
        <p className="module-eyebrow">QUESTION {current + 1}</p>
        <span>{current + 1} <span aria-hidden="true">/</span> {questions.length}</span>
      </div>
      <div className="progress-track" role="progressbar" aria-label="Assessment progress" aria-valuemin="0" aria-valuemax={questions.length} aria-valuenow={current + 1}>
        <div style={{ width: `${(current + 1) / questions.length * 100}%` }} />
      </div>
      <h2 id="aptitude-question-title">{question.prompt}</h2>
      <div className="aptitude-choices" role="group" aria-label="Choose the answer that fits you best">
        {question.choices.map(([label, choice], index) => (
          <button
            type="button"
            key={label}
            aria-pressed={selected === choice}
            className={`aptitude-choice ${selected === choice ? "selected" : ""}`}
            onClick={() => setAnswers((previous) => ({ ...previous, [current]: choice }))}
          >
            <span className="aptitude-choice-letter">{String.fromCharCode(65 + index)}</span>
            <span className="aptitude-choice-label">{label}</span>
          </button>
        ))}
      </div>
      <div className="module-button-row">
        <button className="module-secondary" type="button" disabled={current === 0} onClick={() => setCurrent((value) => value - 1)}><ArrowLeft size={16} />Previous</button>
        {current < questions.length - 1
          ? <button className="module-primary" type="button" disabled={selected === undefined} onClick={() => setCurrent((value) => value + 1)}>Next<ArrowRight size={16} /></button>
          : <button className="module-primary" type="button" disabled={selected === undefined} onClick={finish}>See results<Sparkles size={16} /></button>}
      </div>
    </section>
    {Array.isArray(history) && history.length > 0 && <p className="module-muted">Previous assessments saved: {history.length}</p>}
  </div>;
}
