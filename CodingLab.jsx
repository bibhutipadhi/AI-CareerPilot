import { useEffect, useState } from "react";
import { Check, ChevronRight, Code2, LoaderCircle, Play, Plus, Search, Send, Sparkles, Terminal } from "lucide-react";
import { apiRequest, postApi } from "./api";
import { readStored, storageKeys, writeStored } from "./dataStore";
import "./NewModules.css";

const languages = ["Python", "Java", "C++", "JavaScript"];

export default function CodingLab() {
  const [challenges, setChallenges] = useState([]);
  const [challengeId, setChallengeId] = useState("");
  const [language, setLanguage] = useState("Python");
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("All");
  const [customInput, setCustomInput] = useState("");
  const [editor, setEditor] = useState({ key: "", code: "" });
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [generatingChallenges, setGeneratingChallenges] = useState(false);
  const [running, setRunning] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [progress, setProgress] = useState(() => {
    const stored = readStored(storageKeys.coding, []);
    return Array.isArray(stored) ? stored : [];
  });

  useEffect(() => {
    let active = true;
    apiRequest("/api/coding-challenges")
      .then((data) => {
        if (!active) return;
        const items = Array.isArray(data.challenges) ? data.challenges : [];
        setChallenges(items);
        const dailyId = items.some((item) => item.id === data.dailyChallengeId)
          ? data.dailyChallengeId
          : items[0]?.id || "";
        setChallengeId(dailyId);
        setCustomInput(items.find((item) => item.id === dailyId)?.sampleInput || "");
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Could not load challenges.");
      })
      .finally(() => {
        if (active) setLoadingChallenges(false);
      });
    return () => { active = false; };
  }, []);

  const challenge = challenges.find((item) => item.id === challengeId);
  const visibleChallenges = challenges.filter((item) =>
    (levelFilter === "All" || item.level === levelFilter) &&
    `${item.title} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  const completedCount = progress.filter((item) =>
    item.passed === item.total || item.history?.some((attempt) => attempt.passed === attempt.total)
  ).length;
  const selectedProgress = progress.find((item) => item.challengeId === challengeId);
  const editorKey = `${challengeId}:${language}`;
  const sourceCode = editor.key === editorKey
    ? editor.code
    : challenge?.starterCode?.[language] || "";

  async function generateMoreChallenges() {
    setGeneratingChallenges(true);
    setError("");
    try {
      const data = await postApi("/api/coding-challenges/generate", {
        difficulty: levelFilter,
      });
      const newChallenges = Array.isArray(data.challenges) ? data.challenges : [];
      if (!newChallenges.length || newChallenges.some((item) => !item.id || !item.title)) {
        throw new Error("The question generator returned an invalid batch. Please try again.");
      }
      setChallenges((previous) => {
        const existingIds = new Set(previous.map((item) => item.id));
        return [...previous, ...newChallenges.filter((item) => !existingIds.has(item.id))];
      });
      const first = newChallenges[0];
      setQuery("");
      setChallengeId(first.id);
      setCustomInput(first.sampleInput || "");
      setResult(null);
      setExplanation("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not generate more questions.");
    } finally {
      setGeneratingChallenges(false);
    }
  }

  async function runCode(mode) {
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const data = await postApi("/api/coding-evaluate", {
        challengeId,
        language,
        sourceCode,
        mode,
        customInput: mode === "run" ? customInput : undefined,
      });
      if (
        !data.result ||
        !Number.isInteger(data.result.passed) ||
        !Number.isInteger(data.result.total) ||
        data.result.total < 1 ||
        data.result.passed < 0 ||
        data.result.passed > data.result.total ||
        !Array.isArray(data.result.cases)
      ) {
        throw new Error("The code runner returned an invalid test report.");
      }
      setResult({ ...data.result, mode });
      if (mode === "run") return;
      const attemptedAt = new Date().toISOString();
      const previous = progress.find((item) => item.challengeId === challengeId);
      const entry = {
        challengeId,
        language,
        passed: data.result.passed,
        total: data.result.total,
        completedAt: attemptedAt,
      };
      const next = [
        {
          ...entry,
          history: [...(Array.isArray(previous?.history) ? previous.history : previous ? [previous] : []), entry].slice(-100),
        },
        ...progress.filter((item) => item.challengeId !== challengeId),
      ];
      setProgress(next);
      if (!writeStored(storageKeys.coding, next)) {
        setError("Test results are shown, but could not be saved for placement analytics.");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not evaluate the solution.");
    } finally {
      setRunning(false);
    }
  }

  async function explainCode() {
    setExplaining(true);
    setError("");
    setExplanation("");
    try {
      const data = await postApi("/api/code-explanation", {
        language,
        sourceCode,
        problem: challenge?.title || "",
      });
      setExplanation(data.explanation);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not explain this code.");
    } finally {
      setExplaining(false);
    }
  }

  return <div className="module-page coding-lab-page">
    <header className="coding-page-header">
      <div><p className="module-eyebrow">PRACTICE, RUN, LEARN</p><h1>Coding Practice</h1><p>Choose a problem or generate a fresh batch whenever you want.</p></div>
      <div className="coding-overview"><Code2 size={19} /><span><strong>{completedCount}</strong> of {challenges.length} solved</span></div>
    </header>

    <div className="coding-workspace">
      <aside className="coding-problem-sidebar">
        <div className="coding-sidebar-heading"><div><span className="coding-sidebar-kicker">PRACTICE</span><h2>Challenges</h2></div><span className="coding-count">{challenges.length}</span></div>
        <label className="coding-search"><Search size={16} /><input aria-label="Search challenges" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search problems" /></label>
        <div className="coding-filter" aria-label="Filter by difficulty">{["All", "Beginner", "Intermediate", "Advanced"].map((level) => <button type="button" key={level} className={levelFilter === level ? "active" : ""} onClick={() => setLevelFilter(level)}>{level === "Beginner" ? "Easy" : level === "Intermediate" ? "Medium" : level === "Advanced" ? "Hard" : level}</button>)}</div>
        <button className="coding-generate-button" type="button" onClick={generateMoreChallenges} disabled={generatingChallenges || loadingChallenges}>
          {generatingChallenges ? <LoaderCircle className="module-spin" size={17} /> : <Plus size={17} />}
          <span><strong>{generatingChallenges ? "Creating questions…" : "Generate more questions"}</strong><small>{generatingChallenges ? "Building a fresh batch" : "5 new problems · keep going"}</small></span>
        </button>
        <div className="coding-challenge-list">
          {loadingChallenges && <p className="coding-list-message">Loading challenges…</p>}
          {!loadingChallenges && visibleChallenges.map((item) => {
            const saved = progress.find((entry) => entry.challengeId === item.id);
            const solved = saved && (
              saved.passed === saved.total || saved.history?.some((attempt) => attempt.passed === attempt.total)
            );
            return <button type="button" key={item.id} className={`coding-challenge-item ${challengeId === item.id ? "selected" : ""}`} onClick={() => { setChallengeId(item.id); setCustomInput(item.sampleInput || ""); setResult(null); setExplanation(""); setError(""); }}>
              <span className={`coding-problem-status ${solved ? "solved" : ""}`}>{solved ? <Check size={14} /> : <Code2 size={14} />}</span>
              <span className="coding-challenge-copy"><strong>{item.title}</strong><small>{item.category}</small></span>
              <span className={`coding-difficulty ${item.level.toLowerCase()}`}>{item.level === "Beginner" ? "Easy" : item.level === "Advanced" ? "Hard" : "Medium"}</span>
              <ChevronRight className="coding-challenge-chevron" size={15} />
            </button>;
          })}
          {!loadingChallenges && visibleChallenges.length === 0 && <p className="coding-list-message">No matching challenges.</p>}
        </div>
        <div className="coding-sidebar-progress"><span><Check size={14} /> Progress</span><strong>{challenges.length ? Math.round(completedCount / challenges.length * 100) : 0}%</strong><div><i style={{ width: `${challenges.length ? completedCount / challenges.length * 100 : 0}%` }} /></div></div>
      </aside>

      <main className="coding-main">
        {error && <p className="module-error" role="alert">{error}</p>}
        {!challenge && !loadingChallenges && <div className="coding-empty"><Code2 size={28} /><h2>Challenges are unavailable</h2><p>Check that the CareerCraft API is running, then reload this page.</p></div>}
        {challenge && <>
          <div className="coding-challenge-heading"><div><div className="coding-breadcrumb">Challenges <ChevronRight size={14} /> {challenge.category}</div><h2>{challenge.title}</h2><div className="coding-meta"><span className={`coding-difficulty ${challenge.level.toLowerCase()}`}>{challenge.level === "Beginner" ? "Easy" : challenge.level === "Advanced" ? "Hard" : "Medium"}</span><span>{challenge.category}</span>{selectedProgress && <span className="coding-last-attempt">Last attempt: {selectedProgress.passed}/{selectedProgress.total} tests</span>}</div></div>
            <label className="coding-language">Language<select value={language} onChange={(event) => { setLanguage(event.target.value); setResult(null); setExplanation(""); }}>{languages.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>

          <div className="coding-split">
            <section className="coding-problem-panel" aria-label="Problem description">
              <div className="coding-panel-tabs"><span className="active">Problem</span></div>
              <div className="coding-problem-content"><h3>Problem</h3><p>{challenge.description}</p>
                <h4>Input Format</h4><p>{challenge.inputFormat}</p>
                <h4>Output Format</h4><p>{challenge.outputFormat}</p>
                <h4>Sample Input</h4><pre className="coding-sample">{challenge.sampleInput}</pre>
                <h4>Sample Output</h4><pre className="coding-sample">{challenge.sampleOutput}</pre>
              </div>
            </section>

            <section className="coding-editor-panel" aria-label="Code editor">
              <div className="coding-editor-toolbar"><div><span className="coding-file-dot" /><strong>solution.{language === "Python" ? "py" : language === "Java" ? "java" : language === "C++" ? "cpp" : "js"}</strong></div><span className="coding-editor-language">{language}</span></div>
              <label className="sr-only" htmlFor="source-code">Your {language} solution</label>
              <textarea id="source-code" className="code-editor coding-code-editor" value={sourceCode} onChange={(event) => { setEditor({ key: editorKey, code: event.target.value }); setResult(null); }} maxLength={30000} spellCheck="false" autoCapitalize="off" autoCorrect="off" />
              <div className="coding-input-heading"><div><Terminal size={16} /><strong>Custom Input</strong></div><span>Run your code with your own test data</span></div>
              <label className="sr-only" htmlFor="custom-input">Custom input</label><textarea id="custom-input" className="coding-custom-input" value={customInput} onChange={(event) => setCustomInput(event.target.value)} maxLength={5000} placeholder="Enter input for your program" />
              <div className="coding-actions"><button type="button" className="module-secondary" disabled={running || !sourceCode.trim()} onClick={() => runCode("run")}>{running ? <LoaderCircle className="module-spin" size={17} /> : <Play size={17} />}{running ? "Running…" : "Run Code"}</button><button type="button" className="module-primary" disabled={running || !sourceCode.trim()} onClick={() => runCode("submit")}>{running ? <LoaderCircle className="module-spin" size={17} /> : <Send size={16} />}{running ? "Submitting…" : "Submit Code"}</button><button type="button" className="coding-explain" disabled={explaining || !sourceCode.trim()} onClick={explainCode}>{explaining ? <LoaderCircle className="module-spin" size={16} /> : <Sparkles size={16} />}{explaining ? "Explaining…" : "Explain"}</button></div>
            </section>
          </div>

          {result && <section className={`coding-result ${result.passed === result.total ? "accepted" : "rejected"}`} aria-live="polite"><div className="coding-result-header"><div><span className="coding-result-icon">{result.passed === result.total ? <Check size={17} /> : <Terminal size={17} />}</span><div><strong>{result.mode === "run" ? (result.passed === result.total ? "Run completed" : "Run failed") : result.passed === result.total ? "Accepted" : "Try again"}</strong><small>{result.mode === "run" ? "Custom input" : `${result.passed} of ${result.total} test cases passed`}</small></div></div><span>{result.status}</span></div>
            {result.cases?.map((item, index) => <div className="coding-case" key={index}><div className={item.passed ? "test-pass" : "test-fail"}>{result.mode === "run" ? "Program output" : `Test case ${index + 1}`}<strong>{result.mode === "run" ? (item.passed ? "Finished" : item.error || "Error") : item.passed ? "Passed" : item.error || "Failed"}</strong></div>{result.mode === "run" && <pre>{item.output || (item.error ? item.error : "(no output)")}</pre>}</div>)}
          </section>}
          {explanation && <section className="coding-explanation"><h3><Sparkles size={17} /> AI code explanation</h3><p>{explanation}</p></section>}
        </>}
      </main>
    </div>

    <section className="coding-history"><div><p className="module-eyebrow">YOUR PRACTICE</p><h2>Recent submissions</h2></div>{progress.length ? <div className="coding-history-list">{progress.map((item) => <div className="coding-history-item" key={item.challengeId}><span className={item.passed === item.total ? "history-solved" : "history-attempted"}>{item.passed === item.total ? <Check size={15} /> : <Code2 size={15} />}</span><strong>{challenges.find((entry) => entry.id === item.challengeId)?.title || item.challengeId}</strong><span>{item.language}</span><span>{item.passed}/{item.total} passed</span><time>{new Date(item.completedAt).toLocaleDateString()}</time></div>)}</div> : <p className="module-muted">Your submitted solutions will appear here.</p>}</section>
    <p className="module-disclaimer">Submissions are sent to the configured external isolated runner. CareerCraft does not execute submitted code inside the API server.</p>
  </div>;
}
