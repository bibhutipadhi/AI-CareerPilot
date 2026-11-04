import { useState } from "react";
import { Download, ExternalLink, Plus, Sparkles, Trash2 } from "lucide-react";
import { postApi } from "./api";
import { readStored, storageKeys, writeStored } from "./dataStore";
import "./NewModules.css";

const templates = ["Modern", "Minimal", "Bold"];
const emptyProject = { name: "", description: "", stack: "" };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function safeLink(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export default function PortfolioBuilder({ userProfile }) {
  const [profile, setProfile] = useState(() => {
    const value = readStored(storageKeys.portfolio, {});
    return {
      name: typeof value?.name === "string" ? value.name : userProfile.name || "",
      title: typeof value?.title === "string" ? value.title : userProfile.career || "",
      bio: typeof value?.bio === "string" ? value.bio : "",
      skills: typeof value?.skills === "string" ? value.skills : "",
      education: typeof value?.education === "string" ? value.education : "",
      github: typeof value?.github === "string" ? value.github : "",
      linkedin: typeof value?.linkedin === "string" ? value.linkedin : "",
      projects: Array.isArray(value?.projects) && value.projects.some((project) =>
        project && typeof project.name === "string" && typeof project.description === "string" && typeof project.stack === "string"
      )
        ? value.projects.filter((project) => project && typeof project.name === "string" && typeof project.description === "string" && typeof project.stack === "string")
        : [{ ...emptyProject }],
      template: templates.includes(value.template) ? value.template : "Modern",
    };
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function update(field, value) {
    const next = { ...profile, [field]: value };
    setProfile(next);
    setNotice(writeStored(storageKeys.portfolio, next)
      ? ""
      : "Changes are visible in this session but could not be saved in this browser.");
  }

  function updateProject(index, field, value) {
    const projects = profile.projects.map((project, current) =>
      current === index ? { ...project, [field]: value } : project
    );
    const next = { ...profile, projects };
    setProfile(next);
    setNotice(writeStored(storageKeys.portfolio, next)
      ? ""
      : "Changes are visible in this session but could not be saved in this browser.");
  }

  async function generateBio() {
    setGenerating(true);
    setError("");
    try {
      const data = await postApi("/api/portfolio-bio", {
        name: profile.name,
        title: profile.title,
        skills: profile.skills,
        education: profile.education,
        projects: profile.projects.filter((project) => project.name.trim()),
      });
      if (typeof data.bio !== "string" || !data.bio.trim()) {
        throw new Error("The AI service returned an empty bio.");
      }
      update("bio", data.bio);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not generate a portfolio bio.");
    } finally {
      setGenerating(false);
    }
  }

  function downloadPortfolio() {
    const name = escapeHtml(profile.name || "Portfolio");
    const title = escapeHtml(profile.title);
    const bio = escapeHtml(profile.bio);
    const templateClass = profile.template.toLowerCase();
    const skills = profile.skills.split(",").map((skill) => skill.trim()).filter(Boolean);
    const projects = profile.projects.filter((project) => project.name.trim());
    const social = [
      ["GitHub", safeLink(profile.github)],
      ["LinkedIn", safeLink(profile.linkedin)],
    ].filter(([, url]) => url);
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${name} — Portfolio</title>
<style>*{box-sizing:border-box}body{margin:0;font:16px/1.7 system-ui,sans-serif;background:#f8fafc;color:#172554}.wrap{max-width:920px;margin:auto;padding:8vh 24px}.hero,.card{background:white;border:1px solid #e2e8f0;border-radius:20px;padding:clamp(24px,5vw,52px);margin-bottom:20px}.hero{background:${templateClass === "bold" ? "#172554" : "#fff"};color:${templateClass === "bold" ? "#fff" : "#172554"}}h1{font-size:clamp(2rem,5vw,3.8rem);line-height:1.1;margin:.3em 0}h2{font-size:1.3rem}.tag{display:inline-block;background:#ffedd5;color:#9a3412;border-radius:99px;padding:6px 12px;margin:4px}a{color:#c2410c;margin-right:16px}.project{padding:18px 0;border-top:1px solid #e2e8f0}.minimal .hero,.minimal .card{border-radius:0;box-shadow:none}.muted{color:#64748b}</style></head>
<body class="${templateClass}"><main class="wrap"><header class="hero"><p class="muted">${title}</p><h1>${name}</h1><p>${bio}</p>${social.map(([label, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${label}</a>`).join("")}</header>
${skills.length ? `<section class="card"><h2>Skills</h2>${skills.map((skill) => `<span class="tag">${escapeHtml(skill)}</span>`).join("")}</section>` : ""}
${profile.education.trim() ? `<section class="card"><h2>Education</h2><p>${escapeHtml(profile.education).replace(/\n/g, "<br>")}</p></section>` : ""}
${projects.length ? `<section class="card"><h2>Selected projects</h2>${projects.map((project) => `<article class="project"><h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.description)}</p><p class="muted">${escapeHtml(project.stack)}</p></article>`).join("")}</section>` : ""}
</main></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(profile.name || "careerpilot-portfolio").trim().replace(/[^a-z0-9-_]+/gi, "-")}-portfolio.html`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Portfolio downloaded as a standalone HTML file.");
  }

  return (
    <div className="module-page">
      <header className="module-heading"><div className="module-icon"><Sparkles size={24} /></div><div><p className="module-eyebrow">YOUR WORK, PROFESSIONALLY PRESENTED</p><h1>AI Portfolio Builder</h1><p>Build and download a portfolio site from your real profile details.</p></div></header>
      <div className="portfolio-layout">
        <form className="module-card module-form" onSubmit={(event) => event.preventDefault()}>
          <label>Name<input value={profile.name} maxLength={100} onChange={(event) => update("name", event.target.value)} /></label>
          <label>Professional headline<input value={profile.title} maxLength={150} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Junior Frontend Developer" /></label>
          <label>About you<textarea value={profile.bio} maxLength={2000} rows={4} onChange={(event) => update("bio", event.target.value)} /></label>
          <button className="module-secondary" type="button" disabled={generating} onClick={generateBio}>{generating ? "Writing..." : <><Sparkles size={16} /> Draft bio with AI</>}</button>
          <label>Skills (comma-separated)<input value={profile.skills} maxLength={1000} onChange={(event) => update("skills", event.target.value)} /></label>
          <label>Education<textarea value={profile.education} maxLength={1500} rows={3} onChange={(event) => update("education", event.target.value)} /></label>
          <label>GitHub profile URL<input type="url" value={profile.github} onChange={(event) => update("github", event.target.value)} placeholder="https://github.com/username" /></label>
          <label>LinkedIn profile URL<input type="url" value={profile.linkedin} onChange={(event) => update("linkedin", event.target.value)} placeholder="https://www.linkedin.com/in/username" /></label>
          <label>Template<select value={profile.template} onChange={(event) => update("template", event.target.value)}>{templates.map((template) => <option key={template}>{template}</option>)}</select></label>
          <div className="module-section-heading"><h2>Projects</h2><button className="module-text-button" type="button" onClick={() => update("projects", [...profile.projects, { ...emptyProject }])}><Plus size={16} /> Add project</button></div>
          {profile.projects.map((project, index) => <fieldset className="project-fields" key={index}>
            <legend>Project {index + 1}</legend>
            <label>Project name<input value={project.name} maxLength={120} onChange={(event) => updateProject(index, "name", event.target.value)} /></label>
            <label>Description<textarea value={project.description} maxLength={1000} rows={2} onChange={(event) => updateProject(index, "description", event.target.value)} /></label>
            <label>Technology stack<input value={project.stack} maxLength={300} onChange={(event) => updateProject(index, "stack", event.target.value)} /></label>
            {profile.projects.length > 1 && <button className="module-text-button" type="button" onClick={() => update("projects", profile.projects.filter((_, current) => current !== index))}><Trash2 size={15} /> Remove project</button>}
          </fieldset>)}
          <button className="module-primary" type="button" onClick={downloadPortfolio}><Download size={18} /> Download portfolio website</button>
          {notice && <p className="module-success" role="status">{notice}</p>}
          {error && <p className="module-error" role="alert">{error}</p>}
          <p className="module-disclaimer">Your portfolio stays in this browser until you download it. Hosting/publishing is not configured.</p>
        </form>
        <PortfolioPreview profile={profile} />
      </div>
    </div>
  );
}

function PortfolioPreview({ profile }) {
  const github = safeLink(profile.github);
  const linkedin = safeLink(profile.linkedin);
  return <section className={`module-card portfolio-preview template-${profile.template.toLowerCase()}`}>
    <div className="preview-toolbar"><span>Live preview</span><span>{profile.template} template</span></div>
    <p className="module-eyebrow">{profile.title || "Professional headline"}</p>
    <h2>{profile.name || "Your Name"}</h2>
    <p>{profile.bio || "Add a short introduction to preview your portfolio."}</p>
    {!!profile.skills.trim() && <><h3>Skills</h3><div className="module-tags">{profile.skills.split(",").map((skill) => skill.trim()).filter(Boolean).map((skill) => <span key={skill}>{skill}</span>)}</div></>}
    {profile.education.trim() && <><h3>Education</h3><p>{profile.education}</p></>}
    {profile.projects.some((project) => project.name.trim()) && <><h3>Projects</h3>{profile.projects.filter((project) => project.name.trim()).map((project, index) => <article className="preview-project" key={`${project.name}-${index}`}><h4>{project.name}</h4><p>{project.description}</p><small>{project.stack}</small></article>)}</>}
    <div className="preview-links">{github && <a href={github} target="_blank" rel="noreferrer">GitHub <ExternalLink size={14} /></a>}{linkedin && <a href={linkedin} target="_blank" rel="noreferrer">LinkedIn <ExternalLink size={14} /></a>}</div>
  </section>;
}
