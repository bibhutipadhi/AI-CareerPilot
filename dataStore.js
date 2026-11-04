export function readStored(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : JSON.parse(stored);
  } catch (error) {
    console.error(`Could not read CareerCraft browser data for "${key}".`, error);
    return fallback;
  }
}

export function writeStored(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Could not save CareerCraft browser data for "${key}".`, error);
    return false;
  }
}

export function removeStored(key) {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Could not remove CareerCraft browser data for "${key}".`, error);
    return false;
  }
}

export function currentTimestamp() {
  return new Date().toISOString();
}

export const storageKeys = {
  profile: "careerpilot-profile",
  tasks: "careerpilot-tasks",
  taskCompletionLog: "careerpilot-task-completions",
  resume: "careerpilot-resume",
  jobMatches: "careerpilot-job-matches",
  internships: "careerpilot-internships",
  portfolio: "careerpilot-portfolio",
  projectIdeas: "careerpilot-project-ideas",
  coding: "careerpilot-coding-progress",
  skills: "careerpilot-skill-progress",
  skillWeeklyTarget: "careercraft-skill-weekly-target",
  aptitude: "careerpilot-aptitude-results",
  interview: "careerpilot-interview-progress",
  virtualInterview: "careerpilot-virtual-interview-history",
  mentorMemory: "careerpilot-mentor-memory",
  mentorConversations: "careerpilot-mentor-conversations",
};
