import assert from "node:assert/strict";
import test from "node:test";
import { calculateWeightedInterviewScore, INTERVIEW_SCORE_WEIGHTS } from "./interviewScoring.js";

test("interview category weights total 100 percent", () => {
  assert.equal(Object.values(INTERVIEW_SCORE_WEIGHTS).reduce((total, weight) => total + weight, 0), 100);
});

test("weighted overall score respects the requested category weights", () => {
  assert.equal(calculateWeightedInterviewScore({
    technicalKnowledge: 100,
    answerRelevance: 0,
    communication: 0,
    problemSolving: 0,
    answerStructure: 0,
    practicalUnderstanding: 0,
  }), 25);
  assert.equal(calculateWeightedInterviewScore({
    technicalKnowledge: 0,
    answerRelevance: 0,
    communication: 0,
    problemSolving: 0,
    answerStructure: 0,
    practicalUnderstanding: 100,
  }), 10);
});

test("weighted overall score handles perfect, empty, and fractional totals", () => {
  assert.equal(calculateWeightedInterviewScore(Object.fromEntries(Object.keys(INTERVIEW_SCORE_WEIGHTS).map((key) => [key, 100]))), 100);
  assert.equal(calculateWeightedInterviewScore(Object.fromEntries(Object.keys(INTERVIEW_SCORE_WEIGHTS).map((key) => [key, 0]))), 0);
  assert.equal(calculateWeightedInterviewScore({
    technicalKnowledge: 89,
    answerRelevance: 71,
    communication: 65,
    problemSolving: 80,
    answerStructure: 76,
    practicalUnderstanding: 73,
  }), 77);
});

test("invalid or missing category scores are rejected", () => {
  assert.throws(() => calculateWeightedInterviewScore({}), /integers between 0 and 100/);
  assert.throws(() => calculateWeightedInterviewScore({ ...Object.fromEntries(Object.keys(INTERVIEW_SCORE_WEIGHTS).map((key) => [key, 75])), communication: 101 }), /integers between 0 and 100/);
});
