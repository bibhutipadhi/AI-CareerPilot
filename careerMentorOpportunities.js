const allowedCountries = new Set(["in", "us", "gb", "ca", "au", "de"]);

function safeHttpsUrl(value, base) {
  try {
    const parsed = new URL(value, base);
    return parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

export function validateOpportunitySearch(query) {
  const read = (key, required = false) => {
    const value = query?.[key];
    if (value === undefined && !required) return "";
    return typeof value === "string" ? value.trim() : null;
  };
  const rawCountry = read("country", true);
  const role = read("role", true);
  const location = read("location");
  const skills = read("skills");
  const hasControlCharacters = (value) => [...(value || "")].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint <= 31 || codePoint === 127;
  });
  const country = rawCountry?.toLowerCase();
  return rawCountry !== null && role !== null && location !== null && skills !== null &&
    allowedCountries.has(country) && role.length > 0 && role.length <= 100 &&
    location.length <= 100 && skills.length <= 300 &&
    ![role, location, skills].some(hasControlCharacters)
    ? { country, role, location, skills }
    : null;
}

function rankBySkills(results, skills) {
  const terms = [...new Set((skills.toLowerCase().match(/[a-z0-9+#.]+/g) || []).filter((term) => term.length > 1))].slice(0, 12);
  const score = (item) => {
    const searchable = `${item.title} ${item.company} ${item.description}`.toLowerCase();
    return terms.reduce((sum, term) => sum + (searchable.includes(term) ? 1 : 0), 0);
  };
  return results.sort((a, b) => score(b) - score(a));
}

function normalizeAdzunaResults(data) {
  if (!Array.isArray(data?.results)) return [];
  return data.results.map((job) => {
    if (!job || typeof job !== "object") return null;
    const url = safeHttpsUrl(job.redirect_url);
    if (!url) return null;
    const salaryMin = Number.isFinite(job.salary_min) && job.salary_min > 0 && job.salary_min < 1_000_000_000 ? job.salary_min : null;
    const salaryMax = Number.isFinite(job.salary_max) && job.salary_max > 0 && job.salary_max < 1_000_000_000 ? job.salary_max : null;
    return {
      provider: "Adzuna",
      id: String(job.id || url).slice(0, 200),
      title: String(job.title || "Untitled listing").slice(0, 250),
      company: String(job.company?.display_name || "Company not listed").slice(0, 200),
      location: String(job.location?.display_name || "Location not listed").slice(0, 250),
      created: typeof job.created === "string" ? job.created : "",
      description: String(job.description || "").slice(0, 1200),
      salaryMin,
      salaryMax,
      salaryCurrency: "",
      salaryPeriod: "Provider period not specified",
      salaryPredicted: job.salary_is_predicted === true,
      url,
      applyUrl: "",
    };
  }).filter(Boolean);
}

function normalizeHimalayasResults(data) {
  if (!Array.isArray(data?.jobs)) return [];
  return data.jobs.map((job) => {
    if (!job || typeof job !== "object" || typeof job.guid !== "string") return null;
    const url = safeHttpsUrl(job.guid, "https://himalayas.app");
    if (!url || new URL(url).origin !== "https://himalayas.app") return null;
    const publicationDate = Number.isFinite(job.pubDate) && job.pubDate > 0 ? new Date(job.pubDate * 1000) : null;
    const restrictions = Array.isArray(job.locationRestrictions)
      ? job.locationRestrictions.map((item) => item?.name).filter((name) => typeof name === "string" && name.trim())
      : [];
    return {
      provider: "Himalayas",
      id: String(job.guid).slice(0, 200),
      title: String(job.title || "Untitled listing").slice(0, 250),
      company: String(job.companyName || "Company not listed").slice(0, 200),
      location: `Remote · ${restrictions.length ? restrictions.join(", ") : "Worldwide"}`.slice(0, 250),
      created: publicationDate && Number.isFinite(publicationDate.getTime()) ? publicationDate.toISOString() : "",
      description: String(job.excerpt || "Remote role listing.").slice(0, 1200),
      salaryMin: Number.isFinite(job.minSalary) && job.minSalary > 0 && job.minSalary < 1_000_000_000 ? job.minSalary : null,
      salaryMax: Number.isFinite(job.maxSalary) && job.maxSalary > 0 && job.maxSalary < 1_000_000_000 ? job.maxSalary : null,
      salaryCurrency: typeof job.currency === "string" ? job.currency.slice(0, 12) : "",
      salaryPeriod: typeof job.salaryPeriod === "string" ? job.salaryPeriod.slice(0, 40) : "",
      salaryPredicted: false,
      url,
      applyUrl: safeHttpsUrl(job.applicationLink),
    };
  }).filter(Boolean);
}

export async function searchCareerOpportunities({ country, role, location, skills, fetcher = fetch, credentials = process.env }) {
  let source;
  let results;
  if (credentials.ADZUNA_APP_ID?.trim() && credentials.ADZUNA_APP_KEY?.trim()) {
    const params = new URLSearchParams({
      app_id: credentials.ADZUNA_APP_ID,
      app_key: credentials.ADZUNA_APP_KEY,
      what: role.slice(0, 100),
      results_per_page: "20",
      sort_by: "relevance",
    });
    if (location) params.set("where", location);
    const response = await fetcher(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw Object.assign(new Error("The live job listings provider could not complete the search. Please try again later."), { statusCode: 502 });
    results = normalizeAdzunaResults(await response.json());
    source = "Adzuna";
  } else {
    const params = new URLSearchParams({ q: role, country: country.toUpperCase(), sort: "recent", page: "1" });
    const response = await fetcher(`https://himalayas.app/jobs/api/search?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw Object.assign(new Error("The remote job listings provider is temporarily unavailable. Please try again later."), { statusCode: 502 });
    results = normalizeHimalayasResults(await response.json()).filter((job) => !/\bintern(ship)?\b/i.test(job.title));
    source = "Himalayas";
  }
  return {
    source,
    coverage: source === "Adzuna"
      ? "Live listings for the selected country and location. Salary details are shown only when reported by a listing."
      : "Live remote listings only from Himalayas. City filters are unavailable without Adzuna credentials. Salary details are shown only when reported by a listing.",
    fetchedAt: new Date().toISOString(),
    results: rankBySkills(results, skills).slice(0, 20),
  };
}
