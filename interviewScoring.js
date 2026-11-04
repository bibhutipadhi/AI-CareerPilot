export const INTERVIEW_SCORE_WEIGHTS = Object.freeze({
  technicalKnowledge: 25,
  answerRelevance: 20,
  communication: 15,
  problemSolving: 20,
  answerStructure: 10,
  practicalUnderstanding: 10,
});

export function calculateWeightedInterviewScore(scores) {
  const categories = Object.keys(INTERVIEW_SCORE_WEIGHTS);
  if (!scores || categories.some((name) => !Number.isInteger(scores[name]) || scores[name] < 0 || scores[name] > 100)) {
    throw new TypeError("Interview scores must be integers between 0 and 100 for every category.");
  }
  return Math.round(categories.reduce((total, name) => total + scores[name] * INTERVIEW_SCORE_WEIGHTS[name], 0) / 100);
}
