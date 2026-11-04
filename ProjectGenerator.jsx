import { useState } from "react";
import { Download, LoaderCircle, Sparkles, Trash2 } from "lucide-react";
import { postApi } from "./api";
import { currentTimestamp, readStored, storageKeys, writeStored } from "./dataStore";
import "./NewModules.css";

const careerOptions = ["Software Developer", "Frontend Developer", "Backend Developer", "Data Analyst", "Product Designer"];

function downloadText(filename, content) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ProjectGenerator({ profile }) {
  const [career, setCareer] = useState(profile.career);
  const [level, setLevel] = useState("Beginner");
  const [interests, setInterests] = useState("");
  const [skills, setSkills] = useState("");
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(() => {
    const value = readStored(storageKeys.projectIdeas, []);
    return Array.isArray(value) ? value : [];
  });

  async function generate(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setIdeas([]);
    try {
      const data = await postApi("/api/project-ideas", { career, level, interests, skills });
      if (!Array.isArray(data.ideas) || !data.ideas.length) throw new Error("No valid project ideas were returned.");
      setIdeas(data.ideas);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not generate ideas.");
    } finally {
      setLoading(false);
    }
  }

  function saveIdea(idea) {
    if (saved.some((item) => item.title === idea.title)) {
      setNotice("This idea is already in your saved list.");
      return;
    }
    const next = [...saved, { ...idea, level, savedAt: currentTimestamp() }];
    setSaved(next);
    setError("");
    setNotice(writeStored(storageKeys.projectIdeas, next)
      ? `${idea.title} was added to your saved ideas.`
      : "Idea saved for this session, but could not be saved in this browser.");
  }

  function makeReadme(idea, difficulty = level) {
    return `# ${idea.title}\n\n${idea.description}\n\n## Difficulty\n${difficulty}\n\n## Technology Stack\n${idea.stack.map((item) => `- ${item}`).join("\n")}\n\n## Development Steps\n${idea.steps.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n## Getting Started\n\n1. Clone this repository.\n2. Install the dependencies required by the chosen stack.\n3. Follow the development steps above.\n\n## License\n\nAdd a license before publishing this project.\n`;
  }

  function removeSavedIdea(index) {
    const next = saved.filter((_, current) => current !== index);
    setSaved(next);
    setNotice(writeStored(storageKeys.projectIdeas, next)
      ? "Saved idea removed."
      : "Idea removed for this session, but the change could not be saved in this browser.");
  }

  return <div className="module-page">
    <header className="module-heading"><div className="module-icon"><Sparkles size={24} /></div><div><p className="module-eyebrow">BUILD SOMETHING MEANINGFUL</p><h1>AI Project Generator</h1><p>Generate ideas tailored to your skills, interests, and target role.</p></div></header>
    <form className="module-card module-form module-search-grid" onSubmit={generate}>
      <label>Target career<select value={career} onChange={(event) => setCareer(event.target.value)}>{careerOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Difficulty<select value={level} onChange={(event) => setLevel(event.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
      <label>Interests<input value={interests} onChange={(event) => setInterests(event.target.value)} maxLength={500} placeholder="e.g. sustainability, personal finance" /></label>
      <label>Skills or tools<input value={skills} onChange={(event) => setSkills(event.target.value)} maxLength={500} placeholder="e.g. Python, React, SQL" /></label>
      <button className="module-primary" type="submit" disabled={loading}>{loading ? <LoaderCircle className="module-spin" size={18} /> : <Sparkles size={18} />}{loading ? "Generating ideas..." : "Generate project ideas"}</button>
      {error && <p className="module-error" role="alert">{error}</p>}
    </form>
    {!!ideas.length && <section className="module-section"><h2>Ideas for your {level.toLowerCase()} level</h2><p className="module-muted">Ideas are AI-generated and tailored to your inputs; verify scope and originality before starting.</p><div className="module-card-grid">
      {ideas.map((idea, index) => {
        const isSaved = saved.some((item) => item.title === idea.title);
        return <article className="module-card idea-card" key={`${idea.title}-${index}`}><p className="module-eyebrow">{level}</p><h3>{idea.title}</h3><p>{idea.description}</p><h4>Suggested stack</h4><div className="module-tags">{idea.stack.map((item) => <span key={item}>{item}</span>)}</div><h4>Development steps</h4><ol>{idea.steps.map((step, stepIndex) => <li key={`${stepIndex}-${step}`}>{step}</li>)}</ol><div className="module-button-row"><button className="module-secondary" type="button" disabled={isSaved} onClick={() => saveIdea(idea)}>{isSaved ? "Saved" : "Save idea"}</button><button className="module-secondary" type="button" onClick={() => downloadText(`${idea.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-README.md`, makeReadme(idea))}><Download size={16} /> Download README</button></div></article>;
      })}
    </div></section>}
    {notice && <p className="module-success" role="status">{notice}</p>}
    {!!saved.length && <section className="module-section"><h2>Saved ideas ({saved.length})</h2>{saved.map((idea, index) => <div className="module-card saved-listing" key={`${idea.title}-${idea.savedAt || index}`}><div><strong>{idea.title}</strong><p className="module-muted">{idea.level || "Difficulty not recorded"}</p></div><div className="module-button-row"><button className="module-secondary" type="button" onClick={() => downloadText(`${idea.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-README.md`, makeReadme(idea, idea.level || "Unspecified"))}><Download size={15} /> README</button><button className="module-text-button" type="button" onClick={() => removeSavedIdea(index)} aria-label={`Remove ${idea.title} from saved ideas`}><Trash2 size={15} /> Remove</button></div></div>)}</section>}
  </div>;
}
