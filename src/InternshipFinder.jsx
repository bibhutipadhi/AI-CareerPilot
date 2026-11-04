import { useState } from "react";
import {
  AlertCircle,
  Bookmark,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Search,
} from "lucide-react";
import { apiRequest } from "./api";
import {
  currentTimestamp,
  readStored,
  storageKeys,
  writeStored,
} from "./dataStore";
import "./NewModules.css";

const countries = [
  ["in", "India"],
  ["us", "United States"],
  ["gb", "United Kingdom"],
  ["ca", "Canada"],
  ["au", "Australia"],
  ["de", "Germany"],
];
const domains = [
  "Software",
  "Data",
  "Design",
  "Product",
  "Marketing",
  "Finance",
];
const statuses = ["Interested", "Applied", "Interviewing", "Rejected", "Offer"];

function resultId(job) {
  return `${job.provider}:${job.id}`;
}

export default function InternshipFinder() {
  const [country, setCountry] = useState("in");
  const [location, setLocation] = useState("");
  const [domain, setDomain] = useState("Software");
  const [skills, setSkills] = useState("");
  const [results, setResults] = useState([]);
  const [saved, setSaved] = useState(() => {
    const value = readStored(storageKeys.internships, []);
    return Array.isArray(value) ? value : [];
  });
  const [searched, setSearched] = useState(false);
  const [source, setSource] = useState("");
  const [coverage, setCoverage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function persist(next) {
    setSaved(next);
    if (!writeStored(storageKeys.internships, next)) {
      setError(
        "Application status changed for this session, but could not be saved in this browser.",
      );
    } else {
      setError("");
    }
  }

  async function search(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSearched(true);
    setResults([]);
    setCoverage("");
    try {
      const params = new URLSearchParams({
        country,
        location: location.trim(),
        domain,
        skills: skills.trim(),
      });
      const data = await apiRequest(`/api/internships?${params}`);
      setResults(Array.isArray(data.results) ? data.results : []);
      setSource(
        typeof data.source === "string" ? data.source : "Live listings",
      );
      setCoverage(typeof data.coverage === "string" ? data.coverage : "");
    } catch (searchError) {
      setResults([]);
      const message =
        searchError instanceof Error
          ? searchError.message
          : "Could not search internships.";
      setError(
        message.includes("ADZUNA_APP_ID") || message.includes("ADZUNA_APP_KEY")
          ? "Restart the CareerCraft API to enable the no-key remote internship fallback. Adzuna credentials are optional."
          : message,
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleSaved(job) {
    const id = resultId(job);
    persist(
      saved.some((item) => item.id === id)
        ? saved.filter((item) => item.id !== id)
        : [
            ...saved,
            { id, job, status: "Interested", savedAt: currentTimestamp() },
          ],
    );
  }

  function updateStatus(id, status) {
    persist(saved.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  function removeSaved(id) {
    persist(saved.filter((item) => item.id !== id));
  }

  return (
    <div className="module-page">
      <header className="module-heading">
        <div className="module-icon">
          <Search size={24} />
        </div>
        <div>
          <p className="module-eyebrow">LIVE LISTINGS ONLY</p>
          <h1>Internship Finder</h1>
          <p>
            Search live listings and track opportunities you choose to save. If
            Adzuna is not configured, the finder returns country-eligible remote
            roles, ranks skill matches first, and ignores city names.
          </p>
        </div>
      </header>
      <form
        className="module-card module-form module-search-grid"
        onSubmit={search}
      >
        <label>
          Country
          <select
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          >
            {countries.map(([code, name]) => (
              <option value={code} key={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Location
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            maxLength={100}
            placeholder="City, region, or remote"
          />
        </label>
        <label>
          Domain
          <select
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
          >
            {domains.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Skills
          <input
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            maxLength={300}
            placeholder="e.g. Python, SQL, React"
          />
        </label>
        <button className="module-primary" type="submit" disabled={loading}>
          {loading ? (
            <LoaderCircle className="module-spin" size={18} />
          ) : (
            <Search size={18} />
          )}
          {loading ? "Searching live listings..." : "Search internships"}
        </button>
        {error && (
          <div className="module-error" role="alert">
            <AlertCircle size={17} />
            <div>
              <p>{error}</p>
            </div>
          </div>
        )}
      </form>

      {searched && !loading && !error && !results.length && (
        <div className="module-card module-empty">
          No {source === "Himalayas" ? "remote " : "live "}internships matched
          this search. Try another domain or a broader skills list.
        </div>
      )}
      {!!results.length && (
        <section
          className="module-listings"
          aria-label="Live internship listings"
        >
          <p className="module-muted">
            Showing {results.length} live listing
            {results.length === 1 ? "" : "s"} from{" "}
            {source === "Himalayas" ? (
              <a href="https://himalayas.app" target="_blank" rel="noreferrer">
                Himalayas <ExternalLink size={13} />
              </a>
            ) : (
              source
            )}
            . Listings link to the original source. {coverage}
          </p>
          {results.map((job) => {
            const id = resultId(job);
            const isSaved = saved.some((item) => item.id === id);
            return (
              <article className="module-card listing-card" key={id}>
                <div>
                  <h2>{job.title}</h2>
                  <p className="listing-company">{job.company}</p>
                  <p className="module-muted">
                    <MapPin size={15} />
                    {job.location}
                    {job.created
                      ? ` · ${new Date(job.created).toLocaleDateString()}`
                      : ""}
                  </p>
                  {job.description && (
                    <p className="listing-description">{job.description}</p>
                  )}
                  {job.salary && (
                    <p className="module-muted">Listed salary: {job.salary}</p>
                  )}
                </div>
                <div className="listing-actions">
                  <button
                    className="module-secondary"
                    type="button"
                    onClick={() => toggleSaved(job)}
                  >
                    <Bookmark size={16} />
                    {isSaved ? "Saved" : "Save"}
                  </button>
                  <a
                    className="module-link"
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View source <ExternalLink size={15} />
                  </a>
                  {job.applyUrl && (
                    <a
                      className="module-link"
                      href={job.applyUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Apply <ExternalLink size={15} />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section className="module-section">
        <h2>Saved opportunities ({saved.length})</h2>
        {!saved.length && (
          <p className="module-muted">
            Save a live listing to track its application status here.
          </p>
        )}
        {saved.map((item) => (
          <article className="module-card saved-listing" key={item.id}>
            <div>
              <h3>{item.job.title}</h3>
              <p className="module-muted">{item.job.company}</p>
            </div>
            <label>
              Status
              <select
                value={item.status}
                onChange={(event) => updateStatus(item.id, event.target.value)}
              >
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="module-text-button"
              onClick={() => removeSaved(item.id)}
            >
              Remove
            </button>
          </article>
        ))}
      </section>
      <p className="module-disclaimer">
        Adzuna provides broader live listings when configured. Without Adzuna
        credentials, this page uses Himalayas remote internships, which are
        refreshed daily and may have narrower coverage. Always confirm that a
        role is still open on its source page.
      </p>
    </div>
  );
}
