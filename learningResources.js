export const learningResources = Object.freeze([
  { terms: ["python"], title: "Python tutorial", url: "https://docs.python.org/3/tutorial/" },
  { terms: ["javascript", "js"], title: "MDN JavaScript guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" },
  { terms: ["java"], title: "Dev.java learning paths", url: "https://dev.java/learn/" },
  { terms: ["sql"], title: "SQLBolt interactive lessons", url: "https://sqlbolt.com/" },
  { terms: ["react"], title: "React Learn", url: "https://react.dev/learn" },
  { terms: ["communication", "public speaking"], title: "Toastmasters public speaking resources", url: "https://www.toastmasters.org/resources" },
  { terms: ["git"], title: "Pro Git book", url: "https://git-scm.com/book/en/v2" },
]);

export function findLearningResource(skill) {
  const term = String(skill || "").toLowerCase();
  return learningResources.find((resource) => resource.terms.some((keyword) => term.includes(keyword))) || null;
}
