import test from "node:test";
import assert from "node:assert/strict";
import { searchCareerOpportunities, validateOpportunitySearch } from "./careerMentorOpportunities.js";

test("career opportunity search validates supported countries and bounded filters", () => {
  assert.deepEqual(validateOpportunitySearch({ country: "IN", role: "Frontend Developer", skills: "React" }), {
    country: "in", role: "Frontend Developer", location: "", skills: "React",
  });
  assert.equal(validateOpportunitySearch({ country: "xx", role: "Developer" }), null);
  assert.equal(validateOpportunitySearch({ country: "in", role: " " }), null);
  assert.equal(validateOpportunitySearch({ country: "in", role: "Developer", location: "x".repeat(101) }), null);
  assert.equal(validateOpportunitySearch({ country: "in", role: ["Developer"] }), null);
  assert.equal(validateOpportunitySearch({ country: "in", role: "Developer\nInjected" }), null);
});

test("live Adzuna results preserve source and reported salary while dropping unsafe links", async () => {
  let requestedUrl = "";
  const response = await searchCareerOpportunities({
    country: "in", role: "Data Analyst", location: "Pune", skills: "SQL Python",
    credentials: { ADZUNA_APP_ID: "app-id", ADZUNA_APP_KEY: "app-key" },
    fetcher: async (url) => {
      requestedUrl = url;
      return { ok: true, json: async () => ({ results: [
        null,
        { id: 1, title: "Analyst", company: { display_name: "A" }, description: "SQL and Python", salary_min: 4, salary_max: 8, salary_is_predicted: true, redirect_url: "https://jobs.example/1" },
        { id: 2, title: "Unsafe", redirect_url: "javascript:alert(1)" },
      ] }) };
    },
  });
  assert.match(requestedUrl, /jobs\/in\/search\/1/);
  assert.equal(response.source, "Adzuna");
  assert.equal(response.results.length, 1);
  assert.equal(response.results[0].salaryMin, 4);
  assert.equal(response.results[0].salaryMax, 8);
  assert.equal(response.results[0].salaryPredicted, true);
  assert.equal(response.results[0].url, "https://jobs.example/1");
});

test("keyless search uses only real remote listings and rejects unsafe listing links", async () => {
  const response = await searchCareerOpportunities({
    country: "in", role: "Frontend Developer", location: "Mumbai", skills: "React",
    credentials: {},
    fetcher: async () => ({ ok: true, json: async () => ({ jobs: [
      null,
      { guid: "/jobs/1", title: "Frontend Engineer", companyName: "Remote Co", excerpt: "React interfaces", minSalary: 50000, maxSalary: 70000, currency: "USD", salaryPeriod: "year" },
      { guid: "javascript:alert(1)", title: "Unsafe role" },
      { guid: "https://malicious.example/jobs/3", title: "Wrong source host" },
      { guid: "/jobs/2", title: "Internship", companyName: "Early Co" },
    ] }) }),
  });
  assert.equal(response.source, "Himalayas");
  assert.equal(response.results.length, 1);
  assert.equal(response.results[0].url, "https://himalayas.app/jobs/1");
  assert.equal(response.results[0].salaryCurrency, "USD");
  assert.equal(response.results[0].salaryPeriod, "year");
});
