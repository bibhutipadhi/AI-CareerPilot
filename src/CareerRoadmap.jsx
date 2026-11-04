import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { LoaderCircle, Map, Sparkles } from "lucide-react";
import { postApi } from "./api";
import "./CareerTools.css";

const careerOptions = [
  "Software Developer",
  "Frontend Developer",
  "Backend Developer",
  "Data Analyst",
  "Product Designer",
];

export default function CareerRoadmap({ initialCareer = careerOptions[0] }) {
  const [career, setCareer] = useState(
    careerOptions.includes(initialCareer) ? initialCareer : careerOptions[0]
  );
  const [currentSkills, setCurrentSkills] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState("2");
  const [roadmap, setRoadmap] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateRoadmap(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setRoadmap("");

    try {
      const data = await postApi("/api/career-roadmap", {
        career,
        currentSkills,
        hoursPerDay: Number(hoursPerDay),
      });

      if (typeof data.roadmap !== "string" || !data.roadmap.trim()) {
        throw new Error("The AI server returned an empty roadmap.");
      }

      setRoadmap(data.roadmap);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not generate your career roadmap."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="career-tools-page">
      <header className="career-tools-heading">
        <div className="career-tools-icon"><Map size={24} /></div>
        <div>
          <p className="career-tools-eyebrow">YOUR NEXT CAREER STEPS</p>
          <h1>Career Roadmap</h1>
          <p>Get a practical learning path tailored to your goal and schedule.</p>
        </div>
      </header>

      <form className="career-tools-card career-tools-form" onSubmit={generateRoadmap}>
        <label>
          Career goal
          <select
            value={career}
            onChange={(event) => setCareer(event.target.value)}
            disabled={loading}
          >
            {careerOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <label>
          Skills or experience you already have
          <textarea
            value={currentSkills}
            onChange={(event) => setCurrentSkills(event.target.value)}
            placeholder="For example: Java basics, HTML, college project"
            maxLength={2000}
            rows={4}
            disabled={loading}
          />
        </label>

        <label>
          Study time available per day
          <select
            value={hoursPerDay}
            onChange={(event) => setHoursPerDay(event.target.value)}
            disabled={loading}
          >
            <option value="1">About 1 hour</option>
            <option value="2">About 2 hours</option>
            <option value="3">About 3 hours</option>
            <option value="4">4 or more hours</option>
          </select>
        </label>

        <button className="career-tools-button" type="submit" disabled={loading}>
          {loading ? <LoaderCircle size={18} className="career-tools-spinner" /> : <Sparkles size={18} />}
          {loading ? "Building your roadmap..." : "Generate my roadmap"}
        </button>
        {error && <p className="career-tools-error" role="alert">{error}</p>}
      </form>

      {roadmap && (
        <section className="career-tools-card career-tools-result">
          <h2><Sparkles size={20} /> Your personalized roadmap</h2>
          <div className="career-tools-markdown"><ReactMarkdown>{roadmap}</ReactMarkdown></div>
        </section>
      )}
    </div>
  );
}
