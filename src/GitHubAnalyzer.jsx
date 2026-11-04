import { useState } from "react";
import { ExternalLink, GitBranch, LoaderCircle, Search, Sparkles } from "lucide-react";
import { apiRequest } from "./api";
import "./NewModules.css";

export default function GitHubAnalyzer() {
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setProfile(null);
    try {
      const data = await apiRequest(`/api/github/${encodeURIComponent(username.trim())}`);
      setProfile(data.profile);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load this GitHub profile.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="module-page">
    <header className="module-heading"><div className="module-icon"><GitBranch size={24} /></div><div><p className="module-eyebrow">PUBLIC REPOSITORY REVIEW</p><h1>GitHub Profile Analyzer</h1><p>Review public GitHub activity and find portfolio opportunities.</p></div></header>
    <form className="module-card module-form module-inline-form" onSubmit={analyze}>
      <label>GitHub username<input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={39} pattern="[A-Za-z0-9-]+" required placeholder="e.g. octocat" /></label>
      <button className="module-primary" type="submit" disabled={loading}>{loading ? <LoaderCircle className="module-spin" size={18} /> : <Search size={18} />}{loading ? "Analyzing..." : "Analyze public profile"}</button>
    </form>
    {error && <p className="module-error" role="alert">{error}</p>}
    {profile && <>
      <section className="module-card github-profile">
        {profile.avatarUrl && <img src={profile.avatarUrl} alt="" width="72" height="72" />}
        <div><h2>{profile.name || profile.username}</h2><p>@{profile.username}{profile.location ? ` · ${profile.location}` : ""}</p>{profile.bio && <p>{profile.bio}</p>}<a className="module-link" href={profile.url} target="_blank" rel="noreferrer">Open GitHub profile <ExternalLink size={15} /></a></div>
      </section>
      <div className="module-card-grid">
        <Metric label="Public repositories" value={profile.publicRepos} />
        <Metric label="Followers" value={profile.followers} />
        <Metric label="Public stars (listed repos)" value={profile.stars} />
        <Metric label="Recently pushed (90 days)" value={profile.activeRepos} />
      </div>
      <section className="module-card"><h2>Languages in public repositories</h2>{profile.languages.length ? <div className="module-tags">{profile.languages.map((item) => <span key={item.name}>{item.name} · {item.repositories} repos</span>)}</div> : <p className="module-muted">No primary-language data found in the returned public repositories.</p>}</section>
      <section className="module-card"><h2>Recent public repositories</h2>{profile.repositories.length ? profile.repositories.map((repo) => <article className="github-repo" key={repo.name}><div><a href={repo.url} target="_blank" rel="noreferrer">{repo.name} <ExternalLink size={14} /></a><p>{repo.description || "No description provided."}</p><small>{repo.language || "Language not set"} · {repo.stars} stars · Updated {new Date(repo.pushedAt).toLocaleDateString()}</small></div></article>) : <p className="module-muted">No public repositories were returned.</p>}</section>
      <section className="module-card"><h2><Sparkles size={18} /> Portfolio suggestions</h2><ul>{profile.suggestions.map((item) => <li key={item}>{item}</li>)}</ul></section>
    </>}
    <p className="module-disclaimer">Uses GitHub's public API and public repositories only. Unauthenticated rate limits apply; no private data is accessed.</p>
  </div>;
}

function Metric({ label, value }) {
  return <article className="module-card github-metric"><p>{label}</p><strong>{value ?? "—"}</strong></article>;
}
