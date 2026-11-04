import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Trash2
} from "lucide-react";
import { postApi } from "./api";
import { currentTimestamp, readStored, storageKeys, writeStored } from "./dataStore";
import { extractPdfText } from "./pdfText";
import "./ResumeAnalyzer.css";

export default function ResumeAnalyzer() {
  const [file, setFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [error, setError] = useState("");

  const keywords = [
    "python", "java", "javascript", "react",
    "html", "css", "sql", "communication",
    "teamwork", "project", "education",
    "experience", "skills", "github"
  ];

  const foundKeywords = keywords.filter((word) =>
    resumeText.toLowerCase().includes(word)
  );

  const score = Math.min(
    100,
    Math.round((foundKeywords.length / keywords.length) * 100)
  );

  async function handleFile(event) {
    const selectedFile = event.target.files[0];

    if (!selectedFile) return;
    // Let the same file be selected again after removing it or a failed read.
    event.target.value = "";

    setError("");
    setResumeText("");
    setAiFeedback("");
    setFile(null);

    setLoading(true);
    setFile(selectedFile);

    try {
      const extractedText = await extractPdfText(selectedFile);
      setResumeText(extractedText);
    } catch (err) {
      setError(err.message || "Could not read this PDF.");
      setFile(null);
    } finally {
      setLoading(false);
    }
  }

  async function analyzeResume() {
    if (!resumeText.trim() || loading || aiLoading) return;
    setError("");
    setAiFeedback("");
    setAiLoading(true);

    try {
      const data = await postApi("/api/analyze-resume", { resumeText });

      if (typeof data.feedback !== "string" || !data.feedback.trim()) {
        throw new Error("The AI server returned no resume feedback.");
      }

      setAiFeedback(data.feedback);
      const analyzedAt = currentTimestamp();
      const previous = readStored(storageKeys.resume, null);
      const record = {
        score,
        analyzedAt,
        history: [...(Array.isArray(previous?.history) ? previous.history : previous?.analyzedAt ? [previous] : []), { score, analyzedAt }].slice(-100),
      };
      if (!writeStored(storageKeys.resume, record)) {
        setError("Resume feedback is ready, but could not be saved for placement analytics.");
      }
    } catch (err) {
      setError(
        err.message || "Could not connect to the AI server. Please try again."
      );
    } finally {
      setAiLoading(false);
    }
  }

  function resetResume() {
    setFile(null);
    setResumeText("");
    setAiFeedback("");
    setError("");
  }

  return (
    <div className="resume-page">
      <div className="resume-heading">
        <div>
          <p className="resume-eyebrow">
            <Sparkles size={15} /> YOUR CAREER ASSISTANT
          </p>
          <h1>Resume Analyzer</h1>
          <p>Upload your resume and discover ways to improve it.</p>
        </div>
      </div>

      {!resumeText && (
        <label className="resume-upload">
          <div className="upload-icon">
            <Upload size={30} />
          </div>
          <h2>Upload your resume</h2>
          <p>Choose a PDF file from your device</p>
          <span className="upload-button">Choose PDF</span>
          <small>PDF only · Maximum size 5 MB</small>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFile}
            disabled={loading || aiLoading}
            hidden
          />
        </label>
      )}

      {loading && (
        <div className="resume-message">
          Reading your resume. Please wait...
        </div>
      )}

      {error && (
        <div className="resume-error">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {resumeText && (
        <div className="resume-results">
          <div className="resume-file">
            <FileText size={24} />
            <div>
              <strong>{file?.name}</strong>
              <p>{Math.round(resumeText.length / 5)} approximate words</p>
            </div>
            <CheckCircle2 className="success-icon" />
          </div>

          <div className="resume-score-card">
            <p>Preliminary keyword score</p>
            <h2>{score}/100</h2>
            <div className="score-track">
              <div style={{ width: `${score}%` }} />
            </div>
            <small>
              This is a basic keyword check, not an AI evaluation.
            </small>
          </div>

          <div className="resume-keywords">
            <h3>Skills and keywords detected</h3>
            {foundKeywords.length > 0 ? (
              <div className="keyword-list">
                {foundKeywords.map((word) => (
                  <span key={word}>{word}</span>
                ))}
              </div>
            ) : (
              <p>No matching keywords found yet.</p>
            )}
          </div>

          <button
            className="upload-button"
            type="button"
            onClick={analyzeResume}
            disabled={loading || aiLoading || !resumeText.trim()}
          >
            <Sparkles size={16} />
            {aiLoading ? "Analyzing with Gemini..." : "Analyze with Gemini AI"}
          </button>

          {aiFeedback && (
            <div className="resume-preview">
              <h3>
                <Sparkles size={18} /> Gemini AI Resume Feedback
              </h3>
              <div className="markdown-feedback">
  <ReactMarkdown>{aiFeedback}</ReactMarkdown>
</div>
            </div>
          )}

          <div className="resume-preview">
            <h3>Extracted resume text</h3>
            <pre>{resumeText}</pre>
          </div>

          <button className="reset-resume" type="button" onClick={resetResume} disabled={loading || aiLoading}>
            <Trash2 size={16} /> Remove resume
          </button>
        </div>
      )}
    </div>
  );
}
