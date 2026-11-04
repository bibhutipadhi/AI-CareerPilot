export const CAREER_MENTOR_ACTIONS = Object.freeze([
  "career_paths",
  "compare_careers",
  "skill_gap",
  "learning_plan",
  "daily_tasks",
]);

const validText = (value, limit = 500) => typeof value === "string" && value.trim().length > 0 && value.length <= limit;
const validList = (value, min, max, itemLimit = 100) => Array.isArray(value) && value.length >= min && value.length <= max && value.every((item) => validText(item, itemLimit));
const hasExactKeys = (value, expected) => value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).length === expected.length && expected.every((key) => Object.hasOwn(value, key));

export function validateCareerMentorActionRequest(body, careerChoices) {
  const { action, profile, memory, roleA, roleB, skills = "", interests = "" } = body || {};
  const validMemory = memory === undefined || (
    memory && memory.approved === true &&
    typeof memory.education === "string" && memory.education.length <= 500 &&
    typeof memory.skills === "string" && memory.skills.length <= 1200 &&
    typeof memory.interests === "string" && memory.interests.length <= 600 &&
    typeof memory.learningMethod === "string" && memory.learningMethod.length <= 300
  );
  const comparisonValid = action !== "compare_careers" || (
    careerChoices.includes(roleA) && careerChoices.includes(roleB) && roleA !== roleB
  );

  return Boolean(
    CAREER_MENTOR_ACTIONS.includes(action) &&
    profile && typeof profile === "object" &&
    validText(profile.name, 100) && careerChoices.includes(profile.career) &&
    ["1", "2", "3", "4"].includes(profile.studyHours) &&
    validMemory && comparisonValid &&
    typeof skills === "string" && skills.length <= 1200 &&
    typeof interests === "string" && interests.length <= 600
  );
}

export function validateCareerMentorActionResult(action, result, roleA, roleB) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return false;
  if (action === "career_paths") {
    return hasExactKeys(result, ["roles"]) && Array.isArray(result.roles) && result.roles.length === 3 && result.roles.every((item) =>
      hasExactKeys(item, ["role", "fit", "qualifications", "skills", "growth"]) &&
      item && validText(item.role, 100) && validText(item.fit, 600) && validList(item.qualifications, 1, 6, 200) &&
      validList(item.skills, 2, 10, 80) && validText(item.growth, 600)
    );
  }
  if (action === "compare_careers") {
    return hasExactKeys(result, ["comparisons"]) && Array.isArray(result.comparisons) && result.comparisons.length === 2 &&
      result.comparisons.every((item) => hasExactKeys(item, ["role", "learningEffortWeeks", "requiredSkills", "entryPath", "growth", "tradeoffs"]) && [roleA, roleB].includes(item.role) &&
        Number.isInteger(item.learningEffortWeeks) && item.learningEffortWeeks >= 1 && item.learningEffortWeeks <= 260 &&
        validList(item.requiredSkills, 2, 10, 80) && validText(item.entryPath, 600) &&
        validText(item.growth, 600) && validText(item.tradeoffs, 600)
      ) && result.comparisons[0].role !== result.comparisons[1].role;
  }
  if (action === "skill_gap") {
    return hasExactKeys(result, ["requiredSkills"]) && Array.isArray(result.requiredSkills) && result.requiredSkills.length >= 4 && result.requiredSkills.length <= 12 &&
      result.requiredSkills.every((item) => hasExactKeys(item, ["skill", "priority", "why", "firstStep"]) && validText(item.skill, 80) &&
        ["High", "Medium", "Low"].includes(item.priority) && validText(item.why, 400) && validText(item.firstStep, 400)
      );
  }
  if (action === "learning_plan") {
    return hasExactKeys(result, ["days"]) && Array.isArray(result.days) && result.days.length === 7 && result.days.every((item, index) =>
      hasExactKeys(item, ["day", "focus", "minutes", "practice", "resourceSkill"]) && item.day === index + 1 && validText(item.focus, 160) && Number.isInteger(item.minutes) &&
      item.minutes >= 10 && item.minutes <= 240 && validText(item.practice, 400) && validText(item.resourceSkill, 80)
    );
  }
  if (action === "daily_tasks") {
    return hasExactKeys(result, ["tasks"]) && Array.isArray(result.tasks) && result.tasks.length >= 3 && result.tasks.length <= 6 && result.tasks.every((item) =>
      hasExactKeys(item, ["title", "skill", "minutes"]) && validText(item.title, 120) && validText(item.skill, 80) &&
      Number.isInteger(item.minutes) && item.minutes >= 10 && item.minutes <= 180
    );
  }
  return false;
}

export function staysWithinStudyBudget(action, result, studyHours) {
  const availableMinutes = Number(studyHours) * 60;
  if (!Number.isFinite(availableMinutes) || availableMinutes < 60) return false;
  if (action === "daily_tasks") {
    return Array.isArray(result?.tasks) && result.tasks.reduce((total, task) => total + (Number(task?.minutes) || 0), 0) <= availableMinutes;
  }
  if (action === "learning_plan") {
    return Array.isArray(result?.days) && result.days.every((day) => Number(day?.minutes) <= availableMinutes);
  }
  return true;
}
