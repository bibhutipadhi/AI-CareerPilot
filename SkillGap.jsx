import { useState } from "react";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Download,
} from "lucide-react";
import { postApi } from "./api";

const careerSkills = {
  "Software Developer": [
    "Java",
    "Python",
    "Data Structures",
    "Algorithms",
    "HTML",
    "CSS",
    "JavaScript",
    "Git",
    "SQL",
    "React",
  ],
  "Frontend Developer": [
    "HTML",
    "CSS",
    "JavaScript",
    "React",
    "Git",
    "Responsive Design",
    "TypeScript",
    "APIs",
    "Accessibility",
    "Testing",
  ],
  "Backend Developer": [
    "Java",
    "Python",
    "Node.js",
    "SQL",
    "MongoDB",
    "REST APIs",
    "Git",
    "Data Structures",
    "Authentication",
    "Testing",
  ],
  "Data Analyst": [
    "Python",
    "SQL",
    "Excel",
    "Statistics",
    "Pandas",
    "NumPy",
    "Data Visualization",
    "Power BI",
    "Tableau",
    "Data Cleaning",
  ],
};

export default function SkillGap({ initialCareer = "Software Developer" }) {
  const [career, setCareer] = useState(
    careerSkills[initialCareer] ? initialCareer : "Software Developer"
  );

  const [knownSkills, setKnownSkills] = useState([
    "Java",
    "Python",
    "HTML",
  ]);

  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const skills = careerSkills[career];

  const selectedSkills = knownSkills.filter((skill) =>
    skills.includes(skill)
  );

  const missingSkills = skills.filter(
    (skill) => !selectedSkills.includes(skill)
  );

  const percentage = Math.round(
    (selectedSkills.length / skills.length) * 100
  );

  function changeCareer(event) {
    setCareer(event.target.value);
    setKnownSkills([]);
    setPlan("");
    setError("");
  }

  function toggleSkill(skill) {
    setKnownSkills((previous) =>
      previous.includes(skill)
        ? previous.filter((item) => item !== skill)
        : [...previous, skill]
    );

    setPlan("");
    setError("");
  }

  async function generatePlan() {
    setLoading(true);
    setError("");
    setPlan("");

    try {
      const data = await postApi("/api/skill-plan", {
        career,
        knownSkills: selectedSkills,
        missingSkills,
      });

      if (typeof data.plan !== "string" || !data.plan.trim()) {
        throw new Error("Gemini did not return a learning plan.");
      }

      setPlan(data.plan);
    } catch (err) {
      console.error("Skill plan error:", err);
      setError(
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function downloadPlanPDF() {
    if (!plan) return;

    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - margin * 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("CareerCraft", margin, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text("Personalized Learning Plan", margin, 32);

    doc.setFontSize(11);
    doc.text(`Career Goal: ${career}`, margin, 42);

    doc.setFontSize(10);

    const cleanPlan = plan
      .replace(/#{1,6}\s?/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`/g, "");

    const lines = doc.splitTextToSize(cleanPlan, maxWidth);

    let y = 55;

    lines.forEach((line) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      doc.text(line, margin, y);
      y += 6;
    });

    doc.save("CareerCraft-Learning-Plan.pdf");
  }

  return (
    <div className="skill-gap-page">
      <div className="welcome-section">
        <div>
          <div className="welcome-tag">
            <Sparkles size={14} />
            AI CAREER DEVELOPMENT
          </div>

          <h1>Skill Gap Analyzer</h1>

          <p>
            Discover which skills you need to reach your dream career.
          </p>
        </div>
      </div>

      <div className="resume-preview">
        <h3>Choose your career goal</h3>

        <select
          value={career}
          onChange={changeCareer}
          style={{
            width: "100%",
            padding: "14px",
            marginTop: "15px",
            borderRadius: "10px",
            border: "1px solid #ddd",
            background: "white",
            fontSize: "15px",
          }}
        >
          {Object.keys(careerSkills).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="resume-preview" style={{ marginTop: "20px" }}>
        <h3>Select the skills you already know</h3>

        <p>Check every skill you have learned or practiced.</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "12px",
            marginTop: "20px",
          }}
        >
          {skills.map((skill) => (
            <label
              key={skill}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "14px",
                border: "1px solid #e5e0d8",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selectedSkills.includes(skill)}
                onChange={() => toggleSkill(skill)}
              />

              {skill}
            </label>
          ))}
        </div>
      </div>

      <div className="resume-preview" style={{ marginTop: "20px" }}>
        <h3>
          <Sparkles size={18} /> Your Skill Report
        </h3>

        <h1 style={{ fontSize: "36px", marginTop: "20px" }}>
          {percentage}%
        </h1>

        <p>Career skill readiness</p>

        <div
          style={{
            height: "10px",
            background: "#eee7dd",
            borderRadius: "20px",
            overflow: "hidden",
            margin: "15px 0",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${percentage}%`,
              background: "#f59e0b",
              borderRadius: "20px",
              transition: "width 0.3s",
            }}
          />
        </div>

        <p>
          You know {selectedSkills.length} out of {skills.length} required
          skills.
        </p>

        <div style={{ marginTop: "25px" }}>
          <h3>
            <CheckCircle2 size={17} /> Skills you know (
            {selectedSkills.length})
          </h3>

          <div className="career-tags" style={{ marginTop: "15px" }}>
            {selectedSkills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "25px" }}>
          <h3>
            <AlertCircle size={17} /> Skills to learn (
            {missingSkills.length})
          </h3>

          <div className="career-tags" style={{ marginTop: "15px" }}>
            {missingSkills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </div>

        <button
          className="career-button"
          type="button"
          onClick={generatePlan}
          disabled={loading}
          style={{
            width: "100%",
            justifyContent: "center",
            marginTop: "30px",
            opacity: loading ? 0.7 : 1,
          }}
        >
          <Sparkles size={18} />
          {loading
            ? "Generating Your AI Learning Plan..."
            : "Generate My AI Learning Plan"}
        </button>

        {error && (
          <p style={{ color: "#c24141", marginTop: "15px" }}>
            {error}
          </p>
        )}

        {plan && (
          <div className="resume-preview" style={{ marginTop: "25px" }}>
            <h2>
              <Sparkles size={20} /> Your Personalized AI Learning Plan
            </h2>

            <div
              className="ai-learning-plan"
              style={{
                lineHeight: "1.8",
                marginTop: "20px",
              }}
            >
              <ReactMarkdown>{plan}</ReactMarkdown>
            </div>

            <button
              className="career-button"
              type="button"
              onClick={downloadPlanPDF}
              style={{
                marginTop: "25px",
                width: "100%",
                justifyContent: "center",
              }}
            >
              <Download size={18} />
              Download Learning Plan PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
