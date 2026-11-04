import test from "node:test";
import assert from "node:assert/strict";
import {
  CAREER_MENTOR_ACTIONS,
  staysWithinStudyBudget,
  validateCareerMentorActionRequest,
  validateCareerMentorActionResult,
} from "./careerMentorActions.js";

const careerChoices = ["Software Developer", "Frontend Developer", "Backend Developer", "Data Analyst"];
const profile = { name: "Student", career: "Software Developer", studyHours: "2" };

test("mentor action input accepts supported tools and rejects invalid career comparisons", () => {
  for (const action of CAREER_MENTOR_ACTIONS) {
    const request = action === "compare_careers"
      ? { action, profile, roleA: "Software Developer", roleB: "Data Analyst" }
      : { action, profile };
    assert.equal(validateCareerMentorActionRequest(request, careerChoices), true);
  }
  assert.equal(validateCareerMentorActionRequest({ action: "compare_careers", profile, roleA: "Software Developer", roleB: "Software Developer" }, careerChoices), false);
  assert.equal(validateCareerMentorActionRequest({ action: "compare_careers", profile, roleA: "Unknown", roleB: "Data Analyst" }, careerChoices), false);
  assert.equal(validateCareerMentorActionRequest({ action: "daily_tasks", profile, interests: "x".repeat(601) }, careerChoices), false);
});

test("daily task response is bounded and contains only actionable fields", () => {
  const result = { tasks: [
    { title: "Practice arrays", skill: "Data structures", minutes: 30 },
    { title: "Review loops", skill: "Programming", minutes: 20 },
    { title: "Write a short reflection", skill: "Communication", minutes: 10 },
  ] };
  assert.equal(validateCareerMentorActionResult("daily_tasks", result), true);
  assert.equal(validateCareerMentorActionResult("daily_tasks", { ...result, salary: "$80k" }), false);
  assert.equal(validateCareerMentorActionResult("daily_tasks", { tasks: [{ ...result.tasks[0], minutes: 500 }, ...result.tasks.slice(1)] }), false);
});

test("career comparisons must include both requested roles and estimated effort", () => {
  const result = { comparisons: [
    { role: "Frontend Developer", learningEffortWeeks: 16, requiredSkills: ["HTML", "CSS"], entryPath: "Build interfaces", growth: "Specialize in accessibility", tradeoffs: "Estimate varies by experience." },
    { role: "Data Analyst", learningEffortWeeks: 20, requiredSkills: ["SQL", "Statistics"], entryPath: "Analyze a public dataset", growth: "Move into analytics engineering", tradeoffs: "Estimate varies by experience." },
  ] };
  assert.equal(validateCareerMentorActionResult("compare_careers", result, "Frontend Developer", "Data Analyst"), true);
  assert.equal(validateCareerMentorActionResult("compare_careers", result, "Backend Developer", "Data Analyst"), false);
});

test("learning plan requires seven bounded days and no generated URL field", () => {
  const days = Array.from({ length: 7 }, (_, index) => ({
    day: index + 1,
    focus: `Topic ${index + 1}`,
    minutes: 45,
    practice: "Complete a small hands-on exercise.",
    resourceSkill: "Python",
  }));
  assert.equal(validateCareerMentorActionResult("learning_plan", { days }), true);
  assert.equal(validateCareerMentorActionResult("learning_plan", { days: days.map((day, index) => index === 0 ? { ...day, url: "https://example.com" } : day) }), false);
});

test("generated daily work stays within the student's available study time", () => {
  assert.equal(staysWithinStudyBudget("daily_tasks", { tasks: [{ minutes: 30 }, { minutes: 30 }] }, "1"), true);
  assert.equal(staysWithinStudyBudget("daily_tasks", { tasks: [{ minutes: 40 }, { minutes: 30 }] }, "1"), false);
  assert.equal(staysWithinStudyBudget("learning_plan", { days: [{ minutes: 60 }, { minutes: 90 }] }, "1"), false);
  assert.equal(staysWithinStudyBudget("career_paths", {}, "2"), true);
});
