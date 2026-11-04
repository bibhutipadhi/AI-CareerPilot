import { useState } from "react";
import ReactMarkdown from "react-markdown";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { AlertCircle, BriefcaseBusiness, LoaderCircle, Sparkles, Upload } from "lucide-react";
import { postApi } from "./api";
import { currentTimestamp, readStored, storageKeys, writeStored } from "./dataStore";
import "./NewModules.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function JobMatcher() {
  const [resumeText, setResumeText] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [error, setError] = useState("");

  async function handleResume(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf || file.size > 5 * 1024 * 1024) {
      setError("Choose a text-based PDF no larger than 5 MB.");
      return;
    }

    setLoadingFile(true);
    setError("");
    try {
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
      }).promise;
      const pages = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(content.items.map((item) => item.str).join(" "));
      }
      const extracted = pages.join("\n").trim();
      if (!extracted) throw new Error("No readable text found in this PDF.");
      if (extracted.length > 50000) {
        throw new Error("This resume contains too much text to analyze (50,000 character limit).");
      }
      setResumeText(extracted);
      setResumeName(file.name);
      setResult(null);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "Could not read the PDF.");
    } finally {
      setLoadingFile(false);
    }
  }

  async function matchJob(event) {
    event.preventDefault();
    setLoadingMatch(true);
    setError("");
    setResult(null);
    try {
      const data = await postApi("/api/job-match", { resumeText, jobDescription });
      if (!data.match || !Number.isInteger(data.match.score) || data.match.score < 0 || data.match.score > 100) {
        throw new Error("The AI service returned an invalid match report.");
      }
      setResult(data.match);
      const previous = readStored(storageKeys.jobMatches, []);
      const saved = writeStored(storageKeys.jobMatches, [
        { score: data.match.score, createdAt: currentTimestamp() },
        ...(Array.isArray(previous) ? previous : []),
      ].slice(0, 20));
      if (!saved) setError("Match report is ready, but could not be saved for placement analytics.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not match this job.");
    } finally {
      setLoadingMatch(false);
    }
  }

  return (
    <div className="module-page">
      <header className="module-heading">
        <div className="module-icon"><BriefcaseBusiness size={24} /></div>
        <div><p className="module-eyebrow">TAILOR YOUR APPLICATION</p><h1>AI Job Matcher</h1>
          <p>Compare your resume with a role and find concrete ways to improve your fit.</p>
        </div>
      </header>

      <form className="module-card module-form" onSubmit={matchJob}>
        <label className="upload-field">
          <span>Resume PDF</span>
          <span className="upload-drop">
            <Upload size={20} /> {loadingFile ? "Reading PDF..." : resumeName || "Choose a PDF (up to 5 MB)"}
          </span>
          <input type="file" accept=".pdf,application/pdf" onChange={handleResume} disabled={loadingFile || loadingMatch} />
        </label>
        {resumeText && <p className="module-muted">{resumeText.length.toLocaleString()} characters extracted. Resume text is sent to your configured AI backend for analysis.</p>}
        <label>Job description
          <textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} maxLength={30000} rows={10} required disabled={loadingMatch} placeholder="Paste the complete job description here..." />
        </label>
        <button className="module-primary" type="submit" disabled={loadingFile || loadingMatch || !resumeText || !jobDescription.trim()}>
          {loadingMatch ? <LoaderCircle className="module-spin" size={18} /> : <Sparkles size={18} />}
          {loadingMatch ? "Analyzing match..." : "Analyze compatibility"}
        </button>
        {error && <p className="module-error" role="alert"><AlertCircle size={17} />{error}</p>}
      </form>

      {result && (
        <section className="module-card">
          <div className="score-summary">
            <div className="score-ring" style={{ "--score": `${result.score}%` }}><strong>{result.score}%</strong></div>
            <div><h2>Resume compatibility</h2><p>{result.summary}</p></div>
          </div>
          <div className="module-columns">
            <div><h3>Relevant skills found</h3><TagList items={result.matchedSkills} /></div>
            <div><h3>Missing or underrepresented</h3><TagList items={result.missingSkills} /></div>
            <div><h3>Keywords to consider</h3><TagList items={result.missingKeywords} /></div>
          </div>
          <h3>Suggested improvements</h3>
          <div className="module-markdown"><ReactMarkdown>{result.suggestions}</ReactMarkdown></div>
          <p className="module-disclaimer">The score is an estimate based on extracted skills and keywords, not a hiring prediction.</p>
        </section>
      )}
    </div>
  );
}

function TagList({ items }) {
  return Array.isArray(items) && items.length
    ? <div className="module-tags">{items.map((item) => <span key={item}>{item}</span>)}</div>
    : <p className="module-muted">No items identified.</p>;
}
