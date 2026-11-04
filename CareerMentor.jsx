import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  History,
  LoaderCircle,
  Mic,
  MicOff,
  Plus,
  Save,
  Send,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  Volume2,
  VolumeX,
} from "lucide-react";
import { apiRequest, postApi } from "./api";
import { currentTimestamp, readStored, removeStored, storageKeys, writeStored } from "./dataStore";
import { findLearningResource } from "./learningResources";
import "./NewModules.css";

const mentorCareers = ["Software Developer", "Frontend Developer", "Backend Developer", "Data Analyst", "Product Designer", "Technical Product Manager"];

const mentorPrompts = [
  "Which career paths fit my current skills and interests?",
  "What should I focus on learning this week?",
  "Suggest a portfolio project for my current level.",
  "Help me prepare for an internship application.",
];

function makeId(prefix = "mentor") {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanConversationHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item.id === "string" && Array.isArray(item.messages))
    .map((item) => ({
      id: item.id,
      title: typeof item.title === "string" ? item.title.slice(0, 90) : "Career mentor chat",
      createdAt: typeof item.createdAt === "string" ? item.createdAt : currentTimestamp(),
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : currentTimestamp(),
      messages: item.messages.filter((message) => message && ["user", "assistant"].includes(message.role) && typeof message.content === "string").slice(-40),
    })).filter((item) => item.messages.length).slice(0, 20);
}

function getApprovedMemory(value, profile, trackedSkills) {
  if (value && typeof value === "object") {
    return {
      approved: value.approved === true,
      education: typeof value.education === "string" ? value.education.slice(0, 500) : "",
      skills: typeof value.skills === "string" ? value.skills.slice(0, 1200) : "",
      interests: typeof value.interests === "string" ? value.interests.slice(0, 600) : "",
      learningMethod: typeof value.learningMethod === "string" ? value.learningMethod.slice(0, 300) : "",
    };
  }
  return {
    approved: false,
    education: [profile.degree, profile.college, profile.graduationYear].filter(Boolean).join(" · ").slice(0, 500),
    skills: trackedSkills.map((skill) => skill.name).filter(Boolean).slice(0, 40).join(", ").slice(0, 1200),
    interests: "",
    learningMethod: "",
  };
}

function chooseIndianEnglishVoice(voices) {
  const candidates = voices.filter((voice) => /^en[-_]in(?:[-_]|$)/i.test(voice.lang || ""));
  const qualityRank = (voice) => /neural|natural|enhanced|premium/i.test(voice.name)
    ? 3
    : /google|microsoft/i.test(voice.name)
      ? 2
      : voice.default ? 1 : 0;
  return candidates.sort((a, b) => qualityRank(b) - qualityRank(a))[0] || null;
}

function formatDate(date) {
  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime())
    ? parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "Saved chat";
}

function MentorActionCards({ card, onAddTasks, onSaveProject }) {
  const [notice, setNotice] = useState("");
  if (!card || typeof card !== "object") return null;
  const { kind, result = {} } = card;
  const safeHref = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  };
  const salaryFor = (job) => {
    if (typeof job.salary === "string" && job.salary.trim()) return job.salary;
    if (Number.isFinite(job.salaryMin) || Number.isFinite(job.salaryMax)) {
      const range = [job.salaryMin, job.salaryMax].filter(Number.isFinite).map((amount) => amount.toLocaleString()).join("–");
      const unit = [job.salaryCurrency, job.salaryPeriod].filter(Boolean).join(" / ");
      return `${job.salaryPredicted ? "Provider estimate" : "Reported"}: ${range}${unit ? ` ${unit}` : " (period/currency unclear)"}`;
    }
    return "Salary not provided by this listing";
  };
  const listing = (job, index) => {
    const listingUrl = safeHref(job.url);
    const applicationUrl = safeHref(job.applyUrl);
    return <article className="mentor-listing-card" key={`${job.provider || "listing"}-${job.id || index}`}>
      <div><p className="module-eyebrow">{job.provider || "Live listing"}{job.created ? ` · ${formatDate(job.created)}` : ""}</p><h4>{job.title}</h4><p>{job.company} · {job.location}</p><small>{salaryFor(job)}</small><p className="mentor-listing-description">{job.description}</p></div>
      <div className="module-button-row">{listingUrl && <a className="module-secondary mentor-source-link" href={listingUrl} target="_blank" rel="noreferrer">View listing <ExternalLink size={14} /></a>}{applicationUrl && <a className="module-secondary mentor-source-link" href={applicationUrl} target="_blank" rel="noreferrer">Apply <ExternalLink size={14} /></a>}</div>
    </article>;
  };

  if (kind === "career_paths") return <div className="mentor-action-results"><div className="mentor-result-grid">{(result.roles || []).map((item) => <article className="mentor-result-card" key={item.role}><p className="module-eyebrow">ROLE TO EXPLORE</p><h3>{item.role}</h3><p>{item.fit}</p><h4>Typical qualifications</h4><ul>{item.qualifications?.map((value) => <li key={value}>{value}</li>)}</ul><h4>Useful skills</h4><div className="module-tags">{item.skills?.map((value) => <span key={value}>{value}</span>)}</div><h4>Possible growth</h4><p>{item.growth}</p></article>)}</div></div>;
  if (kind === "compare_careers") return <div className="mentor-action-results"><div className="mentor-result-grid">{(result.comparisons || []).map((item) => {
    const evidence = result.market?.find((entry) => entry.role === item.role);
    const salaryListings = evidence?.results?.filter((job) => Number.isFinite(job.salaryMin) || Number.isFinite(job.salaryMax) || (typeof job.salary === "string" && job.salary.trim())).slice(0, 4) || [];
    return <article className="mentor-result-card" key={item.role}><p className="module-eyebrow">ESTIMATED STUDY PLAN · NOT A GUARANTEE</p><h3>{item.role}</h3><strong className="mentor-effort">About {item.learningEffortWeeks} weeks</strong><h4>Core skills</h4><div className="module-tags">{item.requiredSkills?.map((value) => <span key={value}>{value}</span>)}</div><h4>Entry path</h4><p>{item.entryPath}</p><h4>Growth</h4><p>{item.growth}</p><h4>Tradeoffs</h4><p>{item.tradeoffs}</p><div className="mentor-salary-evidence"><h4>Salary evidence from live listings</h4>{salaryListings.length ? <><p>{evidence.source} listings returned {evidence.results.length} matching roles. These are listing-reported amounts, not market averages; currency or period may be unclear.</p><ul>{salaryListings.map((job, index) => <li key={`${job.id}-${index}`}>{job.title}: {salaryFor(job)}{safeHref(job.url) && <> · <a href={safeHref(job.url)} target="_blank" rel="noreferrer">source</a></>}</li>)}</ul></> : <p>{evidence?.error || "No salary amounts were provided by the fetched listings. No estimate is shown."}</p>}</div></article>;
  })}</div></div>;
  if (kind === "skill_gap") return <div className="mentor-action-results"><div className="mentor-result-grid">{(result.requiredSkills || []).map((item) => <article className="mentor-gap-card" key={item.skill}><div><span className={`mentor-priority ${String(item.priority).toLowerCase()}`}>{item.priority} priority</span><h3>{item.skill}</h3></div><p>{item.why}</p><small><strong>First step:</strong> {item.firstStep}</small></article>)}</div></div>;
  if (kind === "learning_plan") return <div className="mentor-action-results"><div className="mentor-learning-plan">{(result.days || []).map((item) => {
    const resource = findLearningResource(item.resourceSkill);
    return <article className="mentor-day-card" key={item.day}><span>Day {item.day}</span><div><h3>{item.focus}</h3><p>{item.practice}</p>{resource ? <a href={resource.url} target="_blank" rel="noreferrer">{resource.title} <ExternalLink size={13} /></a> : <small>No verified resource link in the current catalog for {item.resourceSkill}.</small>}</div><small>{item.minutes} min</small></article>;
  })}</div></div>;
  if (kind === "daily_tasks") return <div className="mentor-action-results"><div className="mentor-result-grid">{(result.tasks || []).map((task) => <article className="mentor-result-card mentor-suggested-task" key={`${task.title}-${task.skill}`}><CalendarDays size={17} /><div><h3>{task.title}</h3><p>{task.skill} · {task.minutes} minutes</p></div></article>)}</div><button type="button" className="module-primary mentor-add-tasks" onClick={() => { const count = onAddTasks?.(result.tasks) || 0; setNotice(count ? `${count} task${count === 1 ? "" : "s"} added to your daily list.` : "These tasks are already on your list."); }}><CheckCircle2 size={16} /> Add suggested tasks</button>{notice && <p className="module-success" role="status">{notice}</p>}</div>;
  if (kind === "project_ideas") return <div className="mentor-action-results"><div className="mentor-result-grid">{(result.ideas || []).map((idea, index) => <article className="mentor-result-card" key={`${idea.title}-${index}`}><p className="module-eyebrow">{idea.level || "Suggested project"}</p><h3>{idea.title}</h3><p>{idea.description}</p><h4>Technology stack</h4><div className="module-tags">{idea.stack?.map((value) => <span key={value}>{value}</span>)}</div><h4>First steps</h4><ol>{idea.steps?.map((step, stepIndex) => <li key={`${stepIndex}-${step}`}>{step}</li>)}</ol><button type="button" className="module-secondary" onClick={() => onSaveProject?.(idea)}>Save to Project Generator</button></article>)}</div></div>;
  if (kind === "opportunities") return <div className="mentor-action-results"><p className="mentor-market-note">{result.coverage} Source: {result.source || "live provider"}{result.fetchedAt ? ` · Checked ${formatDate(result.fetchedAt)}` : ""}. Only current provider listings are shown.</p>{(result.results || []).length ? <div className="mentor-listing-grid">{result.results.map(listing)}</div> : <p className="module-muted">No matching listings were returned. Try a broader role, skills, or location search.</p>}</div>;
  return null;
}

export default function CareerMentor({ profile, activities = [], completionLog = [], onToggleTask, onAddTasks, onNavigate }) {
  const [safeSkills] = useState(() => {
    const trackedSkills = readStored(storageKeys.skills, []);
    return Array.isArray(trackedSkills) ? trackedSkills.filter((skill) => skill && typeof skill.name === "string") : [];
  });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [guideLoading, setGuideLoading] = useState("");
  const [error, setError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [conversations, setConversations] = useState(() => cleanConversationHistory(readStored(storageKeys.mentorConversations, [])));
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [memory, setMemory] = useState(() => getApprovedMemory(readStored(storageKeys.mentorMemory, null), profile, safeSkills));
  const [savedMemory, setSavedMemory] = useState(() => getApprovedMemory(readStored(storageKeys.mentorMemory, null), profile, safeSkills));
  const [memoryNotice, setMemoryNotice] = useState("");
  const [storageError, setStorageError] = useState("");
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [expandedMemory, setExpandedMemory] = useState(false);
  const [opportunityCountry, setOpportunityCountry] = useState("in");
  const [opportunityLocation, setOpportunityLocation] = useState("");
  const [projectLevel, setProjectLevel] = useState("Beginner");
  const [targetCareer, setTargetCareer] = useState(mentorCareers.includes(profile.career) ? profile.career : mentorCareers[0]);
  const [compareRoleA, setCompareRoleA] = useState(mentorCareers.includes(profile.career) ? profile.career : mentorCareers[0]);
  const [compareRoleB, setCompareRoleB] = useState(profile.career === "Data Analyst" ? "Software Developer" : "Data Analyst");
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechRef = useRef(null);
  const listeningRef = useRef(false);
  const [referenceDate] = useState(() => new Date());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  useEffect(() => () => {
    listeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
    }
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  function saveConversation(nextMessages) {
    if (!nextMessages.length) return;
    const now = currentTimestamp();
    const id = currentConversationId || makeId("conversation");
    const previous = conversations.find((item) => item.id === id);
    const firstQuestion = nextMessages.find((item) => item.role === "user")?.content || "Career mentor chat";
    const record = {
      id,
      title: previous?.title || firstQuestion.replace(/\s+/g, " ").slice(0, 72),
      createdAt: previous?.createdAt || now,
      updatedAt: now,
      messages: nextMessages.slice(-40),
    };
    const next = [record, ...conversations.filter((item) => item.id !== id)].slice(0, 20);
    setCurrentConversationId(id);
    setConversations(next);
    if (!writeStored(storageKeys.mentorConversations, next)) {
      setStorageError("This conversation is visible now, but could not be saved in this browser.");
    } else {
      setStorageError("");
    }
  }

  function startNewConversation() {
    if (recognitionRef.current) stopListening();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setMessages([]);
    setInput("");
    setError("");
    setCurrentConversationId(null);
    setExpandedHistory(false);
    setSpeaking(false);
  }

  function openConversation(record) {
    stopListening();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setMessages(record.messages);
    setCurrentConversationId(record.id);
    setInput("");
    setError("");
    setSpeaking(false);
    setExpandedHistory(false);
  }

  function deleteConversation(id) {
    const next = conversations.filter((item) => item.id !== id);
    setConversations(next);
    if (!writeStored(storageKeys.mentorConversations, next)) {
      setStorageError("Could not remove that saved conversation from this browser.");
      return;
    }
    if (currentConversationId === id) {
      setMessages([]);
      setCurrentConversationId(null);
    }
    setStorageError("");
  }

  function clearConversationHistory() {
    if (!conversations.length || !window.confirm("Delete all saved career mentor conversations from this browser?")) return;
    setConversations([]);
    setMessages([]);
    setCurrentConversationId(null);
    if (!writeStored(storageKeys.mentorConversations, [])) setStorageError("Could not clear saved conversations in this browser.");
    else setStorageError("");
  }

  function saveMemory(event) {
    event.preventDefault();
    const next = {
      approved: memory.approved === true,
      education: memory.education.trim().slice(0, 500),
      skills: memory.skills.trim().slice(0, 1200),
      interests: memory.interests.trim().slice(0, 600),
      learningMethod: memory.learningMethod.trim().slice(0, 300),
      updatedAt: currentTimestamp(),
    };
    setMemory(next);
    if (writeStored(storageKeys.mentorMemory, next)) {
      setSavedMemory(next);
      setMemoryNotice(next.approved ? "Saved. The mentor will use these details in future requests." : "Saved on this device. Turn on approval when you want the mentor to use these details.");
      setStorageError("");
    } else {
      setMemoryNotice("");
      setStorageError("Memory could not be saved in this browser.");
    }
  }

  function deleteMemory() {
    const emptyMemory = { approved: false, education: "", skills: "", interests: "", learningMethod: "" };
    setMemory(emptyMemory);
    setSavedMemory(emptyMemory);
    const removed = removeStored(storageKeys.mentorMemory);
    setMemoryNotice(removed ? "Saved career memory was deleted from this browser." : "Memory was cleared for this session but could not be removed from browser storage.");
    if (removed) setStorageError("");
    else setStorageError("Memory was cleared for this session but could not be removed from browser storage.");
  }

  function toggleMemoryApproval(approved) {
    setMemory((previous) => ({ ...previous, approved }));
    setMemoryNotice("Save your changes to confirm this choice.");
  }

  function speak(text) {
    if (!voiceOutput || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    const voice = chooseIndianEnglishVoice(window.speechSynthesis.getVoices());
    utterance.lang = "en-IN";
    if (voice) utterance.voice = voice;
    utterance.rate = 0.96;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function stopListening() {
    listeningRef.current = false;
    setListening(false);
    setInterimTranscript("");
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }

  function toggleListening() {
    if (listeningRef.current) {
      stopListening();
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Speech recognition is not supported by this browser. You can still type your question.");
      return;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) finalText += event.results[index][0].transcript;
        else interimText += event.results[index][0].transcript;
      }
      if (finalText) setInput((previous) => `${previous}${previous.trim() ? " " : ""}${finalText.trim()}`);
      setInterimTranscript(interimText.trim());
    };
    recognition.onerror = (event) => {
      const errorText = event.error === "not-allowed"
        ? "Microphone access was blocked. Allow microphone access in your browser, or type your question."
        : event.error === "no-speech"
          ? "No speech was detected. Try again or type your question."
          : "Voice input stopped. You can continue by typing.";
      setError(errorText);
      stopListening();
    };
    recognition.onend = () => {
      listeningRef.current = false;
      setListening(false);
      setInterimTranscript("");
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    listeningRef.current = true;
    setListening(true);
    setError("");
    try {
      recognition.start();
    } catch {
      stopListening();
      setError("Could not start voice input. You can type your question instead.");
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading || guideLoading) return;
    const previousMessages = messages;
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");
    stopListening();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
    const context = approvedContext();
    const approvedMemory = context.memory ? { ...context.memory, skills: context.skills } : undefined;
    try {
      const data = await postApi("/api/career-mentor", {
        profile: { name: profile.name, career: profile.career, studyHours: profile.studyHours },
        ...(approvedMemory ? { memory: approvedMemory } : {}),
        messages: nextMessages.slice(-16).map(({ role, content }) => ({ role, content })),
      });
      if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("The AI service returned an empty response.");
      const completedMessages = [...nextMessages, { role: "assistant", content: data.reply.trim() }];
      setMessages(completedMessages);
      saveConversation(completedMessages);
      speak(data.reply.trim());
    } catch (requestError) {
      setMessages(previousMessages);
      setInput(text);
      setError(requestError instanceof Error ? requestError.message : "Could not send your message.");
    } finally {
      setLoading(false);
    }
  }

  function approvedContext() {
    if (savedMemory?.approved !== true) return { skills: "", interests: "", memory: undefined };
    const skillNames = safeSkills.map((skill) => skill.name.trim()).filter(Boolean);
    const savedSkillNames = (savedMemory.skills || "").split(",").map((skill) => skill.trim()).filter(Boolean);
    return {
      skills: [...new Set([...skillNames, ...savedSkillNames])].slice(0, 40).join(", ").slice(0, 1200),
      interests: savedMemory.interests || "",
      memory: {
        approved: true,
        education: savedMemory.education || "",
        skills: savedMemory.skills || "",
        interests: savedMemory.interests || "",
        learningMethod: savedMemory.learningMethod || "",
      },
    };
  }

  function appendGuideResult(question, content, cards) {
    const userMessage = { role: "user", content: question };
    const assistantMessage = { role: "assistant", content, cards };
    const completedMessages = [...messages, userMessage, assistantMessage];
    setMessages(completedMessages);
    saveConversation(completedMessages);
    speak(content);
  }

  function actionSummary(action, result) {
    if (action === "career_paths") return `I found three roles to explore: ${result.roles.map((item) => item.role).join(", ")}. These are options to investigate, not a fixed career-fit score.`;
    if (action === "compare_careers") return `Here is a comparison of ${result.comparisons.map((item) => item.role).join(" and ")}. Learning time is a rough estimate based on the context you shared.`;
    if (action === "skill_gap") return `I prioritized ${result.requiredSkills.length} skills for ${targetCareer}. The first steps are estimates; review them against your experience.`;
    if (action === "learning_plan") return "Here is a seven-day study outline based on your goal and available time. Resource links are shown only when they match the existing vetted catalog.";
    if (action === "daily_tasks") return "Here are small tasks for your next study day. Add the ones you want to your existing daily task list.";
    if (action === "project_ideas") return `Here are ${result.ideas.length} project ideas for your ${targetCareer} goal. Review the scope and adjust it to your experience.`;
    return "Here is your personalized guidance.";
  }

  async function runGuideAction(action) {
    if (loading || guideLoading) return;
    if (action === "compare_careers" && compareRoleA === compareRoleB) {
      setError("Choose two different careers to compare.");
      return;
    }
    setGuideLoading(action);
    setLoading(true);
    setError("");
    setActionNotice("");
    const context = approvedContext();
    try {
      if (action === "project_ideas") {
        const data = await postApi("/api/project-ideas", {
          career: targetCareer,
          level: projectLevel,
          interests: context.interests,
          skills: context.skills.slice(0, 500),
        });
        if (!Array.isArray(data.ideas) || data.ideas.length < 1 || data.ideas.some((idea) => !idea || typeof idea.title !== "string" || typeof idea.description !== "string" || !Array.isArray(idea.stack) || !Array.isArray(idea.steps))) {
          throw new Error("The project generator returned an incomplete response.");
        }
        const result = { ideas: data.ideas.map((idea) => ({ ...idea, level: projectLevel })) };
        appendGuideResult("Suggest a portfolio project for my current level.", actionSummary(action, result), { kind: action, result });
        return;
      }
      const requestProfile = { name: profile.name, career: action === "compare_careers" ? profile.career : targetCareer, studyHours: profile.studyHours };
      const body = { action, profile: requestProfile, skills: context.skills, interests: context.interests, ...(context.memory ? { memory: context.memory } : {}) };
      if (action === "compare_careers") Object.assign(body, { roleA: compareRoleA, roleB: compareRoleB });
      const data = await postApi("/api/career-mentor/guide", body);
      if (data.action !== action || !data.result || typeof data.result !== "object") throw new Error("The career advisor returned an incomplete result.");
      let result = data.result;
      if (action === "compare_careers") {
        const market = await Promise.all([compareRoleA, compareRoleB].map(async (role) => {
          const params = new URLSearchParams({ country: opportunityCountry, role, skills: context.skills.slice(0, 300) });
          try {
            const marketData = await apiRequest(`/api/career-mentor/opportunities?${params}`);
            return { role, source: marketData.source, results: Array.isArray(marketData.results) ? marketData.results.slice(0, 8) : [], error: "" };
          } catch (marketError) {
            return { role, source: "", results: [], error: marketError instanceof Error ? marketError.message : "Live salary evidence is unavailable." };
          }
        }));
        result = { ...data.result, market };
      }
      const question = action === "career_paths"
        ? "Recommend career paths that could fit my profile."
        : action === "compare_careers"
          ? `Compare ${compareRoleA} and ${compareRoleB}.`
          : action === "skill_gap"
            ? `Show my prioritized skill gaps for ${targetCareer}.`
            : action === "learning_plan"
              ? "Build a realistic seven-day learning schedule for my goal."
              : "Suggest a few tasks for my next study day.";
      appendGuideResult(question, actionSummary(action, result), { kind: action, result });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not prepare this career guidance.");
    } finally {
      setLoading(false);
      setGuideLoading("");
    }
  }

  async function runOpportunitySearch(kind) {
    if (loading || guideLoading) return;
    setGuideLoading(kind);
    setLoading(true);
    setError("");
    setActionNotice("");
    const context = approvedContext();
    try {
      let data;
      if (kind === "internships") {
        const params = new URLSearchParams({ country: opportunityCountry, location: opportunityLocation.trim(), domain: targetCareer.includes("Data") ? "Data" : targetCareer.includes("Design") ? "Design" : "Software", skills: context.skills.slice(0, 300) });
        data = await apiRequest(`/api/internships?${params}`);
      } else {
        const params = new URLSearchParams({ country: opportunityCountry, role: targetCareer, location: opportunityLocation.trim(), skills: context.skills.slice(0, 300) });
        data = await apiRequest(`/api/career-mentor/opportunities?${params}`);
      }
      if (!Array.isArray(data.results)) throw new Error("The listings provider returned an incomplete response.");
      const result = { ...data, kind };
      appendGuideResult(`Search live ${kind} for ${targetCareer}.`, `${data.results.length} live ${kind} listing${data.results.length === 1 ? "" : "s"} returned by ${data.source || "the listings provider"}. Review each source and its eligibility before applying.`, { kind: "opportunities", result });
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : `Could not search live ${kind}.`);
    } finally {
      setLoading(false);
      setGuideLoading("");
    }
  }

  function saveProjectIdea(idea) {
    const savedIdeas = readStored(storageKeys.projectIdeas, []);
    const current = Array.isArray(savedIdeas) ? savedIdeas : [];
    if (current.some((item) => item.title?.toLowerCase() === idea.title.toLowerCase())) {
      setActionNotice("That project is already in your saved ideas.");
      return;
    }
    const next = [...current, { ...idea, level: idea.level || projectLevel, savedAt: currentTimestamp() }];
    setActionNotice(writeStored(storageKeys.projectIdeas, next)
      ? "Project saved. You can open it from AI Project Generator."
      : "Project is available in this conversation, but could not be saved in this browser.");
  }

  const completedActivities = activities.filter((activity) => activity.done).length;
  const [dateKeys] = useState(() => Array.from({ length: 1001 }, (_, index) => {
    const day = new Date(referenceDate);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - index);
    return {
      key: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
      label: day.toLocaleDateString(undefined, { weekday: "short" }),
    };
  }));
  const weekDateKeys = dateKeys.slice(0, 7).reverse();
  const completedDayKeys = new Set(completionLog.map((entry) => entry.dayKey));
  const weekDays = weekDateKeys.map(({ key, label }) => {
    const count = completionLog.filter((entry) => entry.dayKey === key).length;
    return { key, label, count };
  });
  const weeklyTaskTotal = weekDays.reduce((total, day) => total + day.count, 0);
  const streakStart = completedDayKeys.has(dateKeys[0].key) ? 0 : completedDayKeys.has(dateKeys[1].key) ? 1 : dateKeys.length;
  let currentStreak = 0;
  for (let index = streakStart; index < dateKeys.length && completedDayKeys.has(dateKeys[index].key); index += 1) currentStreak += 1;
  const averageSkill = safeSkills.length
    ? Math.round(safeSkills.reduce((total, skill) => total + (Number(skill.progress) || 0), 0) / safeSkills.length)
    : null;
  const visibleConversations = expandedHistory ? conversations : conversations.slice(0, 4);
  const recognitionAvailable = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const speechAvailable = typeof window !== "undefined" && Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);

  return <div className="module-page mentor-page">
    <header className="module-heading"><div className="module-icon"><Sparkles size={24} /></div><div><p className="module-eyebrow">PERSONALIZED GUIDANCE · YOUR PROGRESS</p><h1>AI Career Mentor</h1><p>Plan your next step, explore options, and keep your learning moving.</p></div></header>

    <section className="mentor-insight-grid" aria-label="Your current learning progress">
      <article className="mentor-insight-card"><span><Target size={17} /> Career goal</span><strong>{profile.career}</strong><small>{profile.studyHours} study hours per day</small></article>
      <article className="mentor-insight-card"><span><BarChart3 size={17} /> Tracked skills</span><strong>{averageSkill === null ? "Get started" : `${averageSkill}% average`}</strong><small>{safeSkills.length ? `${safeSkills.length} skills in your tracker` : "Add skills in Skill Tracker to personalize recommendations"}</small></article>
      <article className="mentor-insight-card"><span><CheckCircle2 size={17} /> Today's tasks</span><strong>{completedActivities}/{activities.length} complete</strong><small>From your CareerCraft daily task list</small></article>
      <article className="mentor-insight-card"><span><Sparkles size={17} /> Learning streak</span><strong>{currentStreak} day{currentStreak === 1 ? "" : "s"}</strong><small>Complete a learning task daily to keep it going</small></article>
    </section>

    <section className="mentor-analytics-grid" aria-label="Career progress analytics">
      <article className="module-card mentor-analytics-card"><div className="mentor-analytics-heading"><div><p className="module-eyebrow">WEEKLY REPORT</p><h2>Tasks completed</h2></div><strong>{weeklyTaskTotal}</strong></div><div className="mentor-week-bars" role="img" aria-label={`Completed tasks over the last seven days: ${weeklyTaskTotal} total`}>{weekDays.map((day) => <div className="mentor-week-bar-column" key={day.key}><span title={`${day.count} completed`}>{day.count || ""}</span><i style={{ "--bar-height": `${weeklyTaskTotal ? Math.max(10, day.count / weeklyTaskTotal * 100) : 4}%` }} /><small>{day.label}</small></div>)}</div><p className="module-muted">Counts completions logged on this device. Older completions are not included.</p></article>
      <article className="module-card mentor-analytics-card"><div className="mentor-analytics-heading"><div><p className="module-eyebrow">SKILL PROGRESS</p><h2>Tracked skills</h2></div><BarChart3 size={19} /></div>{safeSkills.length ? <div className="mentor-skill-bars">{safeSkills.slice(0, 5).map((skill) => <div className="mentor-skill-bar" key={skill.id || skill.name}><div><span>{skill.name}</span><strong>{Math.max(0, Math.min(100, Number(skill.progress) || 0))}%</strong></div><i><span style={{ width: `${Math.max(0, Math.min(100, Number(skill.progress) || 0))}%` }} /></i></div>)}</div> : <p className="module-muted">Add skills in Skill Tracker to see your progress here.</p>}<button className="module-text-button" type="button" onClick={() => onNavigate?.("Skill Tracker")}>Update skill progress <ArrowUpRight size={14} /></button></article>
    </section>

    <div className="mentor-workspace">
      <aside className="mentor-side-panel">
        <section className="module-card mentor-side-card">
          <div className="mentor-side-heading"><div><p className="module-eyebrow">YOUR PLAN</p><h2>Today's tasks</h2></div><BookOpen size={19} /></div>
          {activities.length ? <ul className="mentor-task-list">{activities.slice(0, 6).map((activity) => <li key={activity.id} className={activity.done ? "done" : ""}><button type="button" onClick={() => onToggleTask?.(activity.id)} aria-label={`${activity.done ? "Mark incomplete" : "Complete"}: ${activity.title}`}><CheckCircle2 size={17} /></button><span>{activity.title}<small>{activity.category} · {activity.time}</small></span></li>)}</ul> : <p className="module-muted">No daily tasks yet. Ask your mentor to create a plan.</p>}
          <button type="button" className="module-text-button" onClick={() => onNavigate?.("Career Roadmap")}>Open full career roadmap <ArrowUpRight size={15} /></button>
        </section>

        <section className="module-card mentor-side-card">
          <button className="mentor-disclosure" type="button" aria-expanded={expandedMemory} onClick={() => setExpandedMemory((value) => !value)}><div><p className="module-eyebrow">EDITABLE AND OPTIONAL</p><h2>What your mentor remembers</h2></div><UserRound size={19} /></button>
          {expandedMemory && <form className="mentor-memory-form" onSubmit={saveMemory}>
            <p className="module-muted">Your details stay in this browser. Only the fields below are sent with a mentor request when you approve them. Email, phone, and profile photo are never sent.</p>
            <label>Education and course<input value={memory.education} maxLength={500} onChange={(event) => setMemory((previous) => ({ ...previous, education: event.target.value }))} placeholder="Degree, college, or graduation year" /></label>
            <label>Skills<input value={memory.skills} maxLength={1200} onChange={(event) => setMemory((previous) => ({ ...previous, skills: event.target.value }))} placeholder="Skills you want the mentor to remember" /></label>
            <label>Interests<input value={memory.interests} maxLength={600} onChange={(event) => setMemory((previous) => ({ ...previous, interests: event.target.value }))} placeholder="Topics or industries you enjoy" /></label>
            <label>Preferred learning method<select value={memory.learningMethod} onChange={(event) => setMemory((previous) => ({ ...previous, learningMethod: event.target.value }))}><option value="">Choose one</option><option>Hands-on projects</option><option>Short lessons and notes</option><option>Videos and demonstrations</option><option>Reading documentation</option><option>Practice problems</option><option>A mix of formats</option></select></label>
            <label className="mentor-memory-approval"><input type="checkbox" checked={memory.approved} onChange={(event) => toggleMemoryApproval(event.target.checked)} /><span>I approve the mentor using these details to personalize guidance.</span></label>
            <div className="module-button-row"><button className="module-primary" type="submit"><Save size={16} /> Save memory</button><button className="module-secondary" type="button" onClick={deleteMemory}><Trash2 size={16} /> Delete memory</button></div>
            {memoryNotice && <p className="module-success" role="status">{memoryNotice}</p>}
          </form>}
        </section>

        <section className="module-card mentor-side-card">
          <button className="mentor-disclosure" type="button" aria-expanded={expandedHistory} onClick={() => setExpandedHistory((value) => !value)}><div><p className="module-eyebrow">SAVED ON THIS DEVICE</p><h2>Conversation history <span>{conversations.length}</span></h2></div><History size={19} /></button>
          {expandedHistory && <div className="mentor-history-list">
            {!visibleConversations.length && <p className="module-muted">Your saved mentor chats will appear here.</p>}
            {visibleConversations.map((item) => <div className={`mentor-history-item ${item.id === currentConversationId ? "active" : ""}`} key={item.id}><button type="button" onClick={() => openConversation(item)}><strong>{item.title}</strong><small>{formatDate(item.updatedAt)} · {item.messages.length} messages</small></button><button className="mentor-delete-chat" type="button" onClick={() => deleteConversation(item.id)} aria-label={`Delete chat ${item.title}`} title="Delete conversation"><Trash2 size={14} /></button></div>)}
            <button className="module-text-button" type="button" onClick={clearConversationHistory} disabled={!conversations.length}><Trash2 size={15} /> Clear all chats</button>
          </div>}
        </section>
      </aside>

      <section className="module-card mentor-chat" aria-label="Career mentor conversation">
        <div className="mentor-chat-heading"><div><p className="module-eyebrow">YOUR PERSONAL CAREER ASSISTANT</p><h2>{currentConversationId ? conversations.find((item) => item.id === currentConversationId)?.title || "Career mentor chat" : "Start a conversation"}</h2></div><div className="mentor-chat-tools"><button className="module-secondary" type="button" onClick={startNewConversation} title="Start new conversation"><Plus size={16} /> New chat</button><button className="module-icon-button" type="button" onClick={() => { setVoiceOutput((value) => !value); if (voiceOutput && window.speechSynthesis) window.speechSynthesis.cancel(); }} disabled={!speechAvailable} aria-label={voiceOutput ? "Turn mentor voice off" : "Turn mentor voice on"} title={speechAvailable ? "Toggle Indian English voice replies" : "Voice output is not supported"}>{voiceOutput ? <Volume2 size={17} /> : <VolumeX size={17} />}</button></div></div>
        <section className="mentor-action-toolbar" aria-label="Career planning tools">
          <div className="mentor-action-controls"><label>Target role<select value={targetCareer} onChange={(event) => setTargetCareer(event.target.value)}>{mentorCareers.map((career) => <option key={career}>{career}</option>)}</select></label><label>Project level<select value={projectLevel} onChange={(event) => setProjectLevel(event.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label></div>
          <div className="mentor-action-buttons"><button className="module-secondary" type="button" disabled={loading} onClick={() => runGuideAction("career_paths")}>Career paths</button><button className="module-secondary" type="button" disabled={loading || compareRoleA === compareRoleB} onClick={() => runGuideAction("compare_careers")}>Compare careers</button><button className="module-secondary" type="button" disabled={loading} onClick={() => runGuideAction("skill_gap")}>Skill gaps</button><button className="module-secondary" type="button" disabled={loading} onClick={() => runGuideAction("learning_plan")}>7-day plan</button><button className="module-secondary" type="button" disabled={loading} onClick={() => runGuideAction("project_ideas")}>Project ideas</button><button className="module-secondary" type="button" disabled={loading} onClick={() => runGuideAction("daily_tasks")}>Daily tasks</button></div>
          <div className="mentor-market-controls"><label>Compare<select value={compareRoleA} onChange={(event) => setCompareRoleA(event.target.value)}>{mentorCareers.map((career) => <option key={career}>{career}</option>)}</select></label><span>with</span><label className="sr-only" htmlFor="mentor-compare-role-b">Second career</label><select id="mentor-compare-role-b" value={compareRoleB} onChange={(event) => setCompareRoleB(event.target.value)}>{mentorCareers.map((career) => <option key={career}>{career}</option>)}</select><label>Country<select value={opportunityCountry} onChange={(event) => setOpportunityCountry(event.target.value)}><option value="in">India</option><option value="us">United States</option><option value="gb">United Kingdom</option><option value="ca">Canada</option><option value="au">Australia</option><option value="de">Germany</option></select></label><label>Location<input value={opportunityLocation} maxLength={100} onChange={(event) => setOpportunityLocation(event.target.value)} placeholder="City, optional" /></label><button className="module-secondary" type="button" disabled={loading} onClick={() => runOpportunitySearch("jobs")}><BriefcaseBusiness size={15} /> Live jobs</button><button className="module-secondary" type="button" disabled={loading} onClick={() => runOpportunitySearch("internships")}><GraduationCap size={15} /> Internships</button></div>
          {guideLoading && <p className="mentor-action-loading" role="status"><LoaderCircle className="module-spin" size={15} /> Preparing {guideLoading.replaceAll("_", " ")}…</p>}
        </section>
        <div className="mentor-conversation" role="log" aria-live="polite" aria-relevant="additions">
          {!messages.length && <div className="mentor-welcome"><div className="mentor-welcome-icon"><Sparkles size={22} /></div><h2>What would you like help with?</h2><p>Your mentor uses your career goal and study time. Save and approve extra details to personalize it further.</p><div className="mentor-prompt-list">{mentorPrompts.map((prompt) => <button type="button" key={prompt} onClick={() => setInput(prompt)}>{prompt}<ArrowUpRight size={14} /></button>)}</div></div>}
          {messages.map((message, index) => <article className={`mentor-message ${message.role} ${message.cards ? "has-results" : ""}`} key={`${currentConversationId || "current"}-${index}-${message.role}`}><div className="mentor-message-heading"><strong>{message.role === "user" ? profile.name || "You" : "Career Mentor"}</strong>{message.role === "assistant" && <Sparkles size={14} />}</div>{message.role === "assistant" ? <><div className="mentor-markdown"><ReactMarkdown>{message.content}</ReactMarkdown></div>{message.cards && <MentorActionCards card={message.cards} onAddTasks={onAddTasks} onSaveProject={saveProjectIdea} />}</> : <p>{message.content}</p>}</article>)}
          {listening && <div className="mentor-voice-indicator listening"><Mic size={16} /> Listening in Indian English…</div>}
          {interimTranscript && <p className="mentor-interim" aria-live="polite">{interimTranscript}</p>}
          {speaking && <div className="mentor-voice-indicator speaking"><Volume2 size={16} /> Speaking…<span className="mentor-waveform" aria-hidden="true"><i /><i /><i /><i /><i /></span></div>}
          {loading && <p className="module-muted mentor-thinking"><LoaderCircle className="module-spin" size={17} /> Your mentor is thinking…</p>}
          <div ref={bottomRef} />
        </div>
        {error && <p className="module-error" role="alert"><AlertCircle size={16} /> {error}</p>}
        {actionNotice && <p className="module-success" role="status">{actionNotice}</p>}
        {storageError && <p className="module-error" role="alert">{storageError}</p>}
        <form className="mentor-input" onSubmit={sendMessage}>
          <label className="sr-only" htmlFor="mentor-question">Your career question</label>
          <div className="mentor-input-box"><textarea id="mentor-question" rows={3} maxLength={3000} value={input} onChange={(event) => setInput(event.target.value)} placeholder={listening ? "Speak your question…" : "Ask about career options, skills, projects, or your next step…"} disabled={loading} />{listening && <small className="mentor-input-caption">Your browser may process speech according to its own privacy settings. Review the transcript before sending.</small>}</div>
          <div className="mentor-input-actions"><button className={`module-icon-button mentor-mic-button ${listening ? "active" : ""}`} type="button" onClick={toggleListening} disabled={loading || (!recognitionAvailable && !listening)} aria-label={listening ? "Stop recording" : "Start voice input"} title={recognitionAvailable ? listening ? "Stop voice input" : "Speak your question" : "Speech recognition is not supported in this browser"}>{listening ? <MicOff size={18} /> : <Mic size={18} />}</button><button className="module-primary" type="submit" disabled={loading || !input.trim()}>{loading ? <LoaderCircle className="module-spin" size={18} /> : <Send size={18} />}{loading ? "Thinking…" : "Ask mentor"}</button></div>
        </form>
      </section>
    </div>

    <p className="module-disclaimer mentor-disclaimer">AI guidance is an estimate, not a hiring prediction. Conversation and approved memory stay in this browser; approved text is sent to Gemini when you ask for guidance. Voice recognition is provided by your browser. The mentor does not measure confidence, personality, or ability.</p>
  </div>;
}
