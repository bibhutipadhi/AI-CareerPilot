import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Bot,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  History,
  LoaderCircle,
  Mic,
  MicOff,
  Pause,
  Play,
  Send,
  Sparkles,
  Trash2,
  Upload,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import jsPDF from "jspdf";
import { postApi } from "./api";
import { readStored, storageKeys, writeStored } from "./dataStore";
import { extractPdfText } from "./pdfText";
import "./VirtualInterviewer.css";

const categories = [
  "HR Interview",
  "Technical Interview",
  "Coding Interview",
  "Campus Placement Interview",
  "Behavioral Interview",
  "Custom Job Description Interview",
];
const levels = ["Internship", "Entry-level", "Experienced"];
const difficulties = ["Easy", "Medium", "Hard"];
const scoreLabels = [
  ["technicalKnowledge", "Technical knowledge", 25],
  ["answerRelevance", "Answer relevance", 20],
  ["communication", "Communication clarity", 15],
  ["problemSolving", "Problem solving", 20],
  ["answerStructure", "Answer structure", 10],
  ["practicalUnderstanding", "Practical understanding", 10],
];

function supportedRecognition() {
  return typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  if (!minutes) return `${remainder}s`;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function formatDate(date) {
  return new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function chooseIndianEnglishVoice(voices) {
  const candidates = voices.filter((voice) => /^en[-_]in(?:[-_]|$)/i.test(voice.lang || ""));
  const qualityRank = (voice) => {
    const name = voice.name.toLowerCase();
    if (/neural|natural|enhanced|premium/.test(name)) return 3;
    if (/google|microsoft/.test(name)) return 2;
    return voice.default ? 1 : 0;
  };
  return candidates.sort((a, b) => qualityRank(b) - qualityRank(a))[0] || null;
}

function makeId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `interview-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function VirtualInterviewer({ initialCareer = "Software Developer", initialName = "Student" }) {
  const [category, setCategory] = useState(categories[0]);
  const [candidateName, setCandidateName] = useState(initialName);
  const [career, setCareer] = useState(initialCareer);
  const [experienceLevel, setExperienceLevel] = useState("Entry-level");
  const [durationMinutes, setDurationMinutes] = useState("10");
  const [difficulty, setDifficulty] = useState("Medium");
  const [questionCount, setQuestionCount] = useState("5");
  const [language, setLanguage] = useState("JavaScript");
  const [skills, setSkills] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [page, setPage] = useState("setup");
  const [sessionConfig, setSessionConfig] = useState(null);
  const [codingChallenge, setCodingChallenge] = useState(null);
  const [codeEvaluation, setCodeEvaluation] = useState(null);
  const [codeRunning, setCodeRunning] = useState(false);
  const [codeHint, setCodeHint] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [liveDifficulty, setLiveDifficulty] = useState("Medium");
  const [questionNumber, setQuestionNumber] = useState(1);
  const [followUpsOnQuestion, setFollowUpsOnQuestion] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [codeAnswer, setCodeAnswer] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [starting, setStarting] = useState(false);
  const [speechOutput, setSpeechOutput] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [canRetryTurn, setCanRetryTurn] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState(() => {
    const stored = readStored(storageKeys.virtualInterview, []);
    return Array.isArray(stored) ? stored : [];
  });
  const [historyNow] = useState(() => Date.now());
  const [selectedRecord, setSelectedRecord] = useState(null);

  const recognitionRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraRequestIdRef = useRef(0);
  const videoRef = useRef(null);
  const elapsedRef = useRef(0);
  const answerRef = useRef("");
  const voiceBaseRef = useRef("");
  const answersRef = useRef([]);
  const thinkingRef = useRef(false);
  const pausedRef = useRef(false);
  const handsFreeRef = useRef(false);
  const listeningRef = useRef(false);
  const suppressAutoSendRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const voiceResumeTimerRef = useRef(null);
  const startListeningRef = useRef(null);
  const sendAnswerRef = useRef(null);
  const finishStartedRef = useRef(false);
  const retryTurnRef = useRef(null);
  const speechRef = useRef(null);
  const indianVoiceRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return undefined;
    const synthesis = window.speechSynthesis;
    const updateVoice = () => {
      indianVoiceRef.current = chooseIndianEnglishVoice(synthesis.getVoices());
    };
    updateVoice();
    synthesis.addEventListener?.("voiceschanged", updateVoice);
    return () => synthesis.removeEventListener?.("voiceschanged", updateVoice);
  }, []);

  function stopSpeaking() {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    speechRef.current = null;
    setSpeaking(false);
  }

  function clearVoiceTimers() {
    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    if (voiceResumeTimerRef.current) window.clearTimeout(voiceResumeTimerRef.current);
    silenceTimerRef.current = null;
    voiceResumeTimerRef.current = null;
  }

  function updateAnswer(nextAnswer) {
    answerRef.current = nextAnswer;
    setAnswer(nextAnswer);
  }

  async function handleResumeFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setResumeLoading(true);
    setError("");
    try {
      const text = await extractPdfText(file, { maxCharacters: 10000 });
      setResumeText(text);
      setResumeFileName(file.name);
    } catch (resumeError) {
      setError(resumeError instanceof Error ? resumeError.message : "Could not read this PDF resume.");
    } finally {
      setResumeLoading(false);
    }
  }

  function resumeVoiceAfterResponse() {
    if (!handsFreeRef.current || pausedRef.current || thinkingRef.current) return;
    suppressAutoSendRef.current = false;
    if (voiceResumeTimerRef.current) window.clearTimeout(voiceResumeTimerRef.current);
    voiceResumeTimerRef.current = window.setTimeout(() => {
      if (handsFreeRef.current && !pausedRef.current && !thinkingRef.current) {
        startListeningRef.current?.();
      }
    }, 350);
  }

  function speakText(text, onDone) {
    if (!speechOutput || typeof window === "undefined" || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      if (onDone) window.setTimeout(onDone, 0);
      return;
    }
    stopSpeaking();
    const utterance = new window.SpeechSynthesisUtterance(text);
    const indianVoice = chooseIndianEnglishVoice(window.speechSynthesis.getVoices()) || indianVoiceRef.current;
    if (indianVoice) {
      indianVoiceRef.current = indianVoice;
      utterance.voice = indianVoice;
      utterance.lang = indianVoice.lang;
    } else {
      utterance.lang = "en-IN";
    }
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => setSpeaking(true);
    const complete = () => {
      setSpeaking(false);
      if (speechRef.current === utterance) speechRef.current = null;
      onDone?.();
    };
    utterance.onend = complete;
    utterance.onerror = complete;
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function stopListening() {
    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
    listeningRef.current = false;
    setListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        recognitionRef.current = null;
      }
    }
  }

  function startListening() {
    const Recognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
    if (!Recognition) {
      setError("Voice input is not supported in this browser. You can still type your answer.");
      return;
    }
    if (listeningRef.current || pausedRef.current || thinkingRef.current || !handsFreeRef.current) return;
    if (voiceResumeTimerRef.current) window.clearTimeout(voiceResumeTimerRef.current);
    voiceResumeTimerRef.current = null;
    stopSpeaking();
    setError("");
    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    voiceBaseRef.current = answerRef.current.trim();
    recognition.onresult = (event) => {
      const finalParts = [];
      const interimParts = [];
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript?.trim();
        if (!text) continue;
        (result.isFinal ? finalParts : interimParts).push(text);
      }
      const fullTranscript = [voiceBaseRef.current, finalParts.join(" ")].filter(Boolean).join(voiceBaseRef.current ? " " : "");
      updateAnswer(fullTranscript);
      setInterimTranscript(interimParts.join(" "));
      if (interimParts.length || !finalParts.length) {
        if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      } else if (handsFreeRef.current && !suppressAutoSendRef.current) {
        if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = window.setTimeout(() => {
          if (handsFreeRef.current && !pausedRef.current && !thinkingRef.current) {
            sendAnswerRef.current?.(true);
          }
        }, 1900);
      }
    };
    recognition.onerror = (event) => {
      const recoverable = event.error === "no-speech" || event.error === "aborted";
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access was blocked. Allow microphone access in your browser and try again.");
      } else if (event.error === "audio-capture") {
        setError("No microphone was found. Connect one or type your answer instead.");
      } else if (event.error === "no-speech") {
        setError("");
      } else if (event.error !== "aborted") {
        setError("Voice input stopped. Please try again or type your answer.");
      }
      if (!recoverable) {
        handsFreeRef.current = false;
        suppressAutoSendRef.current = false;
        setHandsFree(false);
        clearVoiceTimers();
      }
      listeningRef.current = false;
      setListening(false);
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      listeningRef.current = false;
      setListening(false);
      setInterimTranscript("");
      if (handsFreeRef.current && !pausedRef.current && !thinkingRef.current && !suppressAutoSendRef.current) {
        resumeVoiceAfterResponse();
      }
    };
    try {
      recognition.start();
      listeningRef.current = true;
      setListening(true);
    } catch {
      recognitionRef.current = null;
      listeningRef.current = false;
      setListening(false);
      handsFreeRef.current = false;
      setHandsFree(false);
      setError("Could not start voice input. Check microphone permission and try again.");
    }
  }

  function startHandsFree() {
    if (!supportedRecognition()) {
      setError("Voice interview is not supported in this browser. You can type and send each answer instead.");
      return;
    }
    handsFreeRef.current = true;
    setHandsFree(true);
    startListening();
  }

  function stopHandsFree() {
    handsFreeRef.current = false;
    suppressAutoSendRef.current = false;
    setHandsFree(false);
    clearVoiceTimers();
    stopListening();
    stopSpeaking();
  }

  function resumeInterview() {
    pausedRef.current = false;
    setPaused(false);
    if (handsFreeRef.current) {
      suppressAutoSendRef.current = false;
      resumeVoiceAfterResponse();
    }
  }

  function stopCamera() {
    cameraRequestIdRef.current += 1;
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setCameraStream(null);
  }

  async function toggleCamera() {
    setCameraError("");
    if (cameraStreamRef.current) {
      stopCamera();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera preview is not available in this browser or connection.");
      return;
    }
    const requestId = ++cameraRequestIdRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (requestId !== cameraRequestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      cameraStreamRef.current = stream;
      setCameraStream(stream);
    } catch (cameraRequestError) {
      if (cameraRequestError?.name === "NotAllowedError" || cameraRequestError?.name === "PermissionDeniedError") {
        setCameraError("Camera access was blocked. You can continue with the avatar and voice or text.");
      } else if (cameraRequestError?.name === "NotFoundError") {
        setCameraError("No camera was found. You can continue without video.");
      } else {
        setCameraError("Could not start camera preview. You can continue without video.");
      }
    }
  }

  useEffect(() => {
    if (videoRef.current && cameraStream) videoRef.current.srcObject = cameraStream;
  }, [cameraStream, page]);

  useEffect(() => {
    if (page !== "room" || paused || !sessionConfig) return undefined;
    const timer = window.setInterval(() => {
      const nextElapsed = elapsedRef.current + 1;
      elapsedRef.current = nextElapsed;
      setElapsedSeconds(nextElapsed);
      if (nextElapsed >= Number(sessionConfig.durationMinutes) * 60) {
        window.clearInterval(timer);
        if (!thinkingRef.current) finishRef.current?.();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [page, paused, sessionConfig]);

  useEffect(() => () => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
    }
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    cameraRequestIdRef.current += 1;
    if (cameraStreamRef.current) cameraStreamRef.current.getTracks().forEach((track) => track.stop());
  }, []);

  async function beginInterview() {
    if (resumeLoading) {
      setError("Wait for the resume PDF to finish processing.");
      return;
    }
    if (!career.trim()) {
      setError("Enter the target job role before starting.");
      return;
    }
    if (category === "Custom Job Description Interview" && !jobDescription.trim()) {
      setError("Add a job description for this custom interview mode.");
      return;
    }
    const baseConfig = {
      category,
      career: career.trim(),
      experienceLevel,
      durationMinutes: Number(durationMinutes),
      questionCount: Number(questionCount),
      difficulty,
      language: category === "Coding Interview" ? language : "",
      skills: skills.trim(),
      resumeText: resumeText.trim(),
      jobDescription: jobDescription.trim(),
    };
    setStarting(true);
    setError("");
    setStorageWarning("");
    setPdfError("");
    pausedRef.current = false;
    thinkingRef.current = false;
    handsFreeRef.current = false;
    listeningRef.current = false;
    suppressAutoSendRef.current = false;
    clearVoiceTimers();
    setHandsFree(false);
    setPaused(false);
    finishStartedRef.current = false;
    retryTurnRef.current = null;
    setCanRetryTurn(false);
    elapsedRef.current = 0;
    answersRef.current = [];
    setElapsedSeconds(0);
    setSessionConfig(null);
    setCodingChallenge(null);
    setCodeEvaluation(null);
    setCodeHint("");
    setLiveDifficulty(baseConfig.difficulty);
    setQuestionNumber(1);
    setFollowUpsOnQuestion(0);
    setTranscript([]);
    setCurrentQuestion(null);
    updateAnswer("");
    setCodeAnswer("");
    setReport(null);
    try {
      let selectedChallenge = null;
      if (category === "Coding Interview") {
        const challengeData = await postApi("/api/coding-challenges");
        const allChallenges = Array.isArray(challengeData.challenges) ? challengeData.challenges : [];
        const compatible = allChallenges.filter((item) => item?.id && item.starterCode?.[language]);
        const preferredLevel = difficulty === "Easy" ? "Beginner" : difficulty === "Hard" ? "Advanced" : "Intermediate";
        const levelMatches = compatible.filter((item) => item.level === preferredLevel);
        const pool = levelMatches.length ? levelMatches : compatible;
        if (!pool.length) throw new Error("No coding challenges are available for this language. Please try again later.");
        selectedChallenge = pool[Math.floor(Math.random() * pool.length)];
      }
      const config = { ...baseConfig, codingChallengeId: selectedChallenge?.id || "" };
      setSessionConfig(config);
      setCodingChallenge(selectedChallenge);
      setCodeAnswer(selectedChallenge?.starterCode?.[language] || "");
      const data = await postApi("/api/virtual-interview/turn", {
        stage: "start",
        config,
        transcript: [],
        questionNumber: 1,
        questionLimit: config.questionCount,
        allowFollowUp: false,
      });
      if (!data.turn || typeof data.turn.message !== "string" || !data.turn.message.trim()) {
        throw new Error("The AI interviewer returned an empty opening question.");
      }
      const opening = { id: makeId(), role: "interviewer", text: data.turn.message.trim(), questionNumber: 1 };
      setCurrentQuestion(opening);
      setTranscript([opening]);
      setCodeEvaluation(null);
      setPage("room");
      speakText(opening.text);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not start the virtual interview.");
    } finally {
      setStarting(false);
    }
  }

  async function requestNextTurn(payload) {
    thinkingRef.current = true;
    setThinking(true);
    setError("");
    try {
      const data = await postApi("/api/virtual-interview/turn", payload);
      if (!data.turn || typeof data.turn.message !== "string" || !data.turn.message.trim() || !["follow_up", "next_question"].includes(data.turn.intent)) {
        throw new Error("The AI interviewer returned an invalid response. Please try again.");
      }
      const nextQuestionNumber = data.turn.intent === "follow_up" ? payload.questionNumber : payload.questionNumber + 1;
      const nextFollowUps = data.turn.intent === "follow_up" ? followUpsOnQuestion + 1 : 0;
      const message = { id: makeId(), role: "interviewer", text: data.turn.message.trim(), questionNumber: nextQuestionNumber, intent: data.turn.intent };
      setTranscript([...payload.transcript, message]);
      setCurrentQuestion(message);
      setQuestionNumber(nextQuestionNumber);
      setFollowUpsOnQuestion(nextFollowUps);
      setLiveDifficulty(data.turn.difficulty || liveDifficulty);
      updateAnswer("");
      if (data.turn.intent !== "follow_up") {
        setCodeAnswer("");
        setCodeEvaluation(null);
      }
      retryTurnRef.current = null;
      setCanRetryTurn(false);
      speakText(message.text, resumeVoiceAfterResponse);
    } catch (requestError) {
      retryTurnRef.current = payload;
      setCanRetryTurn(true);
      setError(requestError instanceof Error ? requestError.message : "Could not get the next interview question.");
    } finally {
      thinkingRef.current = false;
      setThinking(false);
      if (sessionConfig && elapsedRef.current >= Number(sessionConfig.durationMinutes) * 60 && answersRef.current.length) {
        window.setTimeout(() => finishRef.current?.(), 0);
      }
    }
  }

  async function sendAnswer(fromVoice = false) {
    if (!currentQuestion || pausedRef.current || thinkingRef.current) return;
    if (fromVoice && !handsFreeRef.current) return;
    if (!fromVoice && (listeningRef.current || handsFreeRef.current)) return;
    const spokenAnswer = (answerRef.current || answer).trim();
    const starterCode = codingChallenge?.starterCode?.[sessionConfig.language]?.trim();
    const code = codeAnswer.trim() === starterCode ? "" : codeAnswer.trim();
    if (!spokenAnswer && (!code || fromVoice)) {
      if (fromVoice) {
        suppressAutoSendRef.current = true;
        stopListening();
        resumeVoiceAfterResponse();
      }
      return;
    }
    if (fromVoice) {
      suppressAutoSendRef.current = true;
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
      stopListening();
    }
    const matchingEvaluation = codeEvaluation?.sourceCode === code ? codeEvaluation.result : null;
    const testSummary = matchingEvaluation
      ? `\nAutomated test result: ${matchingEvaluation.passed}/${matchingEvaluation.total} tests passed (${matchingEvaluation.status}).`
      : "\nAutomated tests were not run for this submission.";
    const fullAnswer = code
      ? `${spokenAnswer || "Candidate submitted code."}\n\nCode submission (${sessionConfig.language}):\n${code}${testSummary}`
      : spokenAnswer;
    const candidateMessage = { id: makeId(), role: "candidate", text: fullAnswer, questionNumber };
    const nextTranscript = [...transcript, candidateMessage];
    const nextAnswers = [...answersRef.current, { question: currentQuestion.text, answer: fullAnswer, questionNumber }];
    answersRef.current = nextAnswers;
    setTranscript(nextTranscript);
    updateAnswer("");
    stopSpeaking();

    if (questionNumber >= sessionConfig.questionCount) {
      finishInterview(nextAnswers, nextTranscript);
      return;
    }

    const allowFollowUp = followUpsOnQuestion < 2;
    retryTurnRef.current = {
      stage: "answer",
      config: { ...sessionConfig, difficulty: liveDifficulty },
      transcript: nextTranscript,
      questionNumber,
      questionLimit: sessionConfig.questionCount,
      allowFollowUp,
    };
    await requestNextTurn(retryTurnRef.current);
  }

  async function runCodingTests() {
    const sourceCode = codeAnswer.trim();
    if (!sessionConfig?.codingChallengeId || !sourceCode || codeRunning || paused || thinking) return;
    setCodeRunning(true);
    setCodeEvaluation(null);
    setError("");
    try {
      const data = await postApi("/api/coding-evaluate", {
        challengeId: sessionConfig.codingChallengeId,
        language: sessionConfig.language,
        sourceCode,
        mode: "submit",
      });
      if (
        !data.result || !Number.isInteger(data.result.passed) || !Number.isInteger(data.result.total) ||
        data.result.total < 1 || data.result.passed < 0 || data.result.passed > data.result.total ||
        !Array.isArray(data.result.cases) || typeof data.result.status !== "string"
      ) {
        throw new Error("The code runner returned an invalid result. Please try again.");
      }
      setCodeEvaluation({ sourceCode, result: data.result });
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Could not run the coding tests.");
    } finally {
      setCodeRunning(false);
    }
  }

  async function requestCodingHint() {
    if (!sessionConfig?.codingChallengeId || hintLoading || paused || thinking) return;
    setHintLoading(true);
    setError("");
    try {
      const data = await postApi("/api/virtual-interview/coding-hint", {
        challengeId: sessionConfig.codingChallengeId,
        language: sessionConfig.language,
        sourceCode: codeAnswer,
      });
      if (typeof data.hint !== "string" || !data.hint.trim()) throw new Error("The AI interviewer returned an empty hint. Please try again.");
      setCodeHint(data.hint.trim());
    } catch (hintError) {
      setError(hintError instanceof Error ? hintError.message : "Could not get a coding hint.");
    } finally {
      setHintLoading(false);
    }
  }

  function submitAnswer(event) {
    event.preventDefault();
    void sendAnswer(false);
  }

  async function retryNextTurn() {
    if (retryTurnRef.current) await requestNextTurn(retryTurnRef.current);
  }

  async function finishInterview(answerSnapshot = answersRef.current, transcriptSnapshot = transcript) {
    if (finishStartedRef.current) return;
    if (!answerSnapshot.length) {
      setError("Answer at least one question before generating an interview report.");
      return;
    }
    finishStartedRef.current = true;
    stopHandsFree();
    pausedRef.current = true;
    stopCamera();
    setPaused(true);
    setError("");
    const finalElapsed = elapsedRef.current;
    try {
      let finalTranscript = [...transcriptSnapshot];
      if (!finalTranscript.some((item) => item.intent === "closing")) {
        thinkingRef.current = true;
        setThinking(true);
        let closingText = "Thank you for your time today. That concludes the interview.";
        try {
          const closing = await postApi("/api/virtual-interview/turn", {
            stage: "closing",
            config: { ...sessionConfig, difficulty: liveDifficulty },
            transcript: finalTranscript,
            questionNumber,
            questionLimit: sessionConfig.questionCount,
            allowFollowUp: false,
          });
          if (closing.turn?.intent === "closing" && typeof closing.turn.message === "string" && closing.turn.message.trim()) {
            closingText = closing.turn.message.trim();
          }
        } catch {
          // Keep the interview courteous if the AI closing turn is temporarily unavailable.
        } finally {
          thinkingRef.current = false;
          setThinking(false);
        }
        const closingMessage = { id: makeId(), role: "interviewer", text: closingText, questionNumber, intent: "closing" };
        finalTranscript = [...finalTranscript, closingMessage];
        setTranscript(finalTranscript);
        speakText(closingText);
      }
      setPage("reporting");
      const data = await postApi("/api/virtual-interview/report", {
        config: { ...sessionConfig, difficulty: liveDifficulty },
        answers: answerSnapshot,
        durationSeconds: finalElapsed,
      });
      if (!data.report || !Number.isInteger(data.report.overallScore) || !Array.isArray(data.report.questionReviews) || data.report.questionReviews.length !== answerSnapshot.length) {
        throw new Error("The AI report was incomplete. No score has been saved; please retry.");
      }
      const record = {
        id: makeId(),
        createdAt: new Date().toISOString(),
        candidateName: candidateName.trim() || "Candidate",
        category: sessionConfig.category,
        career: sessionConfig.career,
        durationSeconds: finalElapsed,
        config: {
          category: sessionConfig.category,
          career: sessionConfig.career,
          experienceLevel: sessionConfig.experienceLevel,
          difficulty: liveDifficulty,
          durationMinutes: sessionConfig.durationMinutes,
          questionCount: sessionConfig.questionCount,
          language: sessionConfig.language,
          codingChallengeTitle: codingChallenge?.title || "",
        },
        report: data.report,
      };
      setReport(record);
      setSelectedRecord(record);
      const previous = readStored(storageKeys.virtualInterview, []);
      const nextHistory = [record, ...(Array.isArray(previous) ? previous : [])].slice(0, 30);
      if (writeStored(storageKeys.virtualInterview, nextHistory)) {
        setHistory(nextHistory);
      } else {
        setStorageWarning("The report is ready, but this browser could not save interview history. You can still download the PDF.");
      }
      setPage("report");
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "Could not generate the interview report.");
      setPage("report_error");
      finishStartedRef.current = false;
    }
  }

  const finishRef = useRef(finishInterview);

  useEffect(() => {
    finishRef.current = finishInterview;
    sendAnswerRef.current = sendAnswer;
    startListeningRef.current = startListening;
  });

  function pauseInterview() {
    pausedRef.current = true;
    stopSpeaking();
    clearVoiceTimers();
    if (recognitionRef.current) stopListening();
    setPaused(true);
  }

  function toggleSpeechOutput() {
    if (speechOutput) {
      stopSpeaking();
      if (handsFreeRef.current && !pausedRef.current && !thinkingRef.current) resumeVoiceAfterResponse();
    }
    setSpeechOutput(!speechOutput);
  }

  async function downloadReport(record = selectedRecord) {
    if (!record?.report) return;
    setPdfError("");
    try {
      const doc = new jsPDF();
      const margin = 16;
      let y = 20;
      const addText = (value, options = {}) => {
        const fontSize = options.fontSize || 10;
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(String(value || ""), 178);
        const lineHeight = fontSize * 0.48;
        if (y + lines.length * lineHeight > 278) {
          doc.addPage();
          y = 18;
        }
        doc.text(lines, margin, y);
        y += lines.length * lineHeight + (options.gap ?? 3);
      };
      addText("Virtual AI Interview Report", { fontSize: 18, gap: 4 });
      addText(`Candidate: ${record.candidateName || "Candidate"}`, { fontSize: 11, gap: 2 });
      addText(`Target role: ${record.career} | Category: ${record.category} | Duration: ${formatDuration(record.durationSeconds)} | ${formatDate(record.createdAt)}`, { fontSize: 10, gap: 3 });
      if (record.config?.codingChallengeTitle) addText(`Coding challenge: ${record.config.codingChallengeTitle}`, { fontSize: 10, gap: 3 });
      addText("AI practice estimate, not a hiring prediction.", { fontSize: 9, gap: 6 });
      addText(`Overall score: ${record.report.overallScore}/100`, { fontSize: 14, gap: 5 });
      addText(record.report.summary, { fontSize: 10, gap: 6 });
      scoreLabels.forEach(([key, label, weight]) => {
        const value = record.report.scores?.[key];
        addText(`${label} (${weight}% weight): ${Number.isInteger(value) ? `${value}/100` : "Not scored in this older report"}`);
      });
      addText("Answer presentation (text-only impression)", { fontSize: 13, gap: 2 });
      addText(record.report.presentationFeedback);
      [["Strong points", record.report.strongPoints], ["Areas to improve", record.report.weakAreas], ["Recommendations", record.report.recommendations], ["Practice questions", record.report.practiceQuestions]].forEach(([title, items]) => {
        addText(title, { fontSize: 13, gap: 2 });
        items.forEach((item) => addText(`- ${item}`));
      });
      record.report.questionReviews.forEach((item, index) => {
        addText(`Question ${index + 1} | Score ${item.score}/100`, { fontSize: 13, gap: 2 });
        addText(`Question: ${item.question}`);
        addText(`Your answer: ${item.answer}`);
        addText(`Evaluation: ${item.evaluation}`);
        addText(`Improved example: ${item.improvedAnswer}`, { gap: 5 });
      });
      const safeRole = record.career.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "interview";
      doc.save(`virtual-interview-${safeRole}.pdf`);
    } catch {
      setPdfError("Could not create the PDF report. Please try again.");
    }
  }

  function openHistoryRecord(record) {
    setSelectedRecord(record);
    setReport(record);
    setPage("report");
    setStorageWarning("");
  }

  function clearHistory() {
    if (!history.length || !window.confirm("Delete all saved virtual interview reports from this browser?")) return;
    if (writeStored(storageKeys.virtualInterview, [])) {
      setHistory([]);
      setStorageWarning("");
    } else {
      setStorageWarning("Could not clear interview history in this browser.");
    }
  }

  function deleteHistoryRecord(record) {
    if (!record?.id || !window.confirm("Delete this saved interview report from this browser?")) return;
    const nextHistory = history.filter((item) => item.id !== record.id);
    if (writeStored(storageKeys.virtualInterview, nextHistory)) {
      setHistory(nextHistory);
      setStorageWarning("");
      if (selectedRecord?.id === record.id) {
        setSelectedRecord(null);
        setReport(null);
        setPage("history");
      }
    } else {
      setStorageWarning("Could not delete this interview record in this browser.");
    }
  }

  const recognitionAvailable = supportedRecognition();
  const speechAvailable = typeof window !== "undefined" && Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
  const scoreSeries = [...history].slice(0, 8).reverse();
  const chartPoints = scoreSeries.map((item, index) => {
    const x = scoreSeries.length < 2 ? 160 : 16 + index * (288 / (scoreSeries.length - 1));
    const y = 82 - (Math.max(0, Math.min(100, item.report?.overallScore || 0)) * 0.68);
    return `${x},${y}`;
  }).join(" ");
  const weekStart = historyNow - 7 * 24 * 60 * 60 * 1000;
  const weeklyRecords = history.filter((item) => {
    const createdAt = Date.parse(item.createdAt);
    return Number.isFinite(createdAt) && createdAt >= weekStart && createdAt <= historyNow;
  });
  const weeklyScores = weeklyRecords.map((item) => item.report?.overallScore).filter((value) => Number.isInteger(value));
  const weeklyAverage = weeklyScores.length
    ? Math.round(weeklyScores.reduce((total, value) => total + value, 0) / weeklyScores.length)
    : null;

  return (
    <div className="virtual-interviewer-page">
      <header className="virtual-heading">
        <div className="virtual-heading-icon"><Video size={24} /></div>
        <div className="virtual-heading-copy">
          <p className="virtual-eyebrow">VOICE OR TEXT · YOU CONTROL THE CAMERA</p>
          <h1>Virtual AI Interviewer</h1>
          <p>Practice a live interview by voice or text, then review an evidence-based report.</p>
        </div>
        {page !== "room" && page !== "reporting" && page !== "report_error" && (
          <button className="virtual-history-button" type="button" onClick={() => setPage("history")}>
            <History size={17} /> Interview history <span>{history.length}</span>
          </button>
        )}
      </header>

      {page === "setup" && (
        <>
          <form className="virtual-setup-card" onSubmit={(event) => { event.preventDefault(); beginInterview(); }}>
            <div className="virtual-section-heading"><div><p className="virtual-eyebrow">BUILD YOUR SESSION</p><h2>Interview setup</h2></div><span className="virtual-private-badge"><CheckCircle2 size={15} /> Camera and audio are never recorded</span></div>
            <div className="virtual-form-grid">
              <label>Interview category
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  {categories.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>Candidate name
                <input value={candidateName} onChange={(event) => setCandidateName(event.target.value)} maxLength={100} placeholder="Your name" />
              </label>
              <label>Target job role
                <input value={career} onChange={(event) => setCareer(event.target.value)} maxLength={100} required placeholder="e.g. Frontend Developer" />
              </label>
              <label>Experience level
                <select value={experienceLevel} onChange={(event) => setExperienceLevel(event.target.value)}>
                  {levels.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>Interview duration
                <select value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)}>
                  <option value="10">10 minutes</option><option value="20">20 minutes</option><option value="30">30 minutes</option>
                </select>
              </label>
              <label>Starting difficulty
                <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                  {difficulties.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>Main questions
                <select value={questionCount} onChange={(event) => setQuestionCount(event.target.value)}>
                  <option value="3">3 questions</option><option value="5">5 questions</option><option value="8">8 questions</option><option value="10">10 questions</option>
                </select>
              </label>
              {category === "Coding Interview" && <label>Programming language
                <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                  {["JavaScript", "Python", "Java", "C++"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>}
            </div>
            <div className="virtual-voice-preference"><Volume2 size={16} /><span>Voice output prefers an Indian English voice when your browser provides one; otherwise it uses the browser default.</span></div>
            <details className="virtual-context-details">
              <summary>Personalize with skills, resume, or a job description <span>Optional</span></summary>
              <div className="virtual-context-fields">
                <label>Skills and experience highlights
                  <textarea value={skills} onChange={(event) => setSkills(event.target.value)} maxLength={3000} rows={3} placeholder="Add skills or projects you'd like the interviewer to consider." />
                </label>
                <label className="virtual-resume-upload">Resume PDF (optional)
                  <span className="virtual-resume-upload-control"><Upload size={16} /><span>{resumeLoading ? "Reading your resume…" : resumeFileName || "Choose a text-based PDF (max 5 MB)"}</span><input type="file" accept="application/pdf,.pdf" onChange={handleResumeFile} disabled={resumeLoading} /></span>
                </label>
                <label>Resume text or relevant excerpts
                  <textarea value={resumeText} onChange={(event) => { setResumeText(event.target.value); if (resumeFileName) setResumeFileName(""); }} maxLength={10000} rows={5} placeholder="Text is extracted on this device. Only this text is sent to Gemini." />
                </label>
                <label>Job description {category === "Custom Job Description Interview" ? "(required)" : "(optional)"}
                  <textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} maxLength={15000} rows={5} placeholder="Paste the job description to tailor questions to this role." required={category === "Custom Job Description Interview"} />
                </label>
              </div>
            </details>
            <div className="virtual-privacy-note"><AlertCircle size={17} /><p>Resume PDFs are read on this device; extracted text and interview answers are sent to the configured Gemini service to generate questions and your report. Voice transcription uses your browser's speech service and may follow that service's privacy settings. Interview history is saved in this browser. Camera preview stays on this device; CareerCraft does not record or upload audio or video.{category === "Coding Interview" ? " Coding submissions are sent to an isolated external runner for tests and included in the AI feedback request; hidden test inputs stay on the server." : ""}</p></div>
            <button className="virtual-primary" type="submit" disabled={starting || resumeLoading || !career.trim()}>
              {starting ? <LoaderCircle className="virtual-spin" size={18} /> : <Video size={18} />}
              {starting ? "Preparing your interview…" : "Start interview"}
            </button>
            {error && <p className="virtual-error" role="alert">{error}</p>}
          </form>
          {history.length > 0 && (
            <section className="virtual-history-preview">
              <div className="virtual-section-heading"><div><p className="virtual-eyebrow">YOUR RECENT PRACTICE</p><h2>Interview history</h2></div><button className="virtual-link-button" type="button" onClick={() => setPage("history")}>View all <ArrowLeft size={15} /></button></div>
              <div className="virtual-history-grid">{history.slice(0, 3).map((item) => <button className="virtual-history-card" type="button" key={item.id} onClick={() => openHistoryRecord(item)}><span>{item.category}</span><strong>{item.report?.overallScore ?? "—"}<small>/100</small></strong><small>{item.career} · {formatDate(item.createdAt)}</small></button>)}</div>
            </section>
          )}
        </>
      )}

      {page === "room" && sessionConfig && (
        <>
          <div className="virtual-room-toolbar">
            <div className="virtual-live-label"><span /> LIVE PRACTICE</div>
            <div className="virtual-timer"><Clock3 size={17} /><strong>{formatTime(elapsedSeconds)}</strong><span> / {formatTime(sessionConfig.durationMinutes * 60)}</span></div>
            <div className="virtual-room-actions">
              <button type="button" className="virtual-control-button" onClick={toggleSpeechOutput} disabled={!speechAvailable} aria-label={speechOutput ? "Turn Indian English interviewer voice off" : "Turn Indian English interviewer voice on"} title={speechAvailable ? "Toggle Indian English interviewer voice" : "Text-to-speech is not supported"}>
                {speechOutput ? <Volume2 size={17} /> : <VolumeX size={17} />}<span>{speechOutput ? "Voice on" : "Voice off"}</span>
              </button>
              <button type="button" className="virtual-control-button" onClick={paused ? resumeInterview : pauseInterview}>
                {paused ? <Play size={17} /> : <Pause size={17} />}<span>{paused ? "Resume" : "Pause"}</span>
              </button>
              <button type="button" className="virtual-end-button" onClick={() => finishInterview()} disabled={thinking}><Video size={16} /> End interview</button>
            </div>
          </div>

          <div className="virtual-room-layout">
            <section className="virtual-stage-column">
              <div className={`virtual-stage ${speaking ? "is-speaking" : ""} ${listening ? "is-listening" : ""} ${thinking ? "is-thinking" : ""}`}>
                <div className="virtual-stage-topline"><span>AI INTERVIEWER</span><span>QUESTION {questionNumber} OF {sessionConfig.questionCount}</span></div>
                <div className="virtual-avatar-wrap"><div className="virtual-avatar-halo" /><div className="virtual-avatar"><Bot size={48} /></div><span className="virtual-avatar-status"><i />{thinking ? "Thinking" : speaking ? "Speaking" : listening ? "Listening" : paused ? "Paused" : "Ready"}</span>{(listening || speaking) && <div className="virtual-waveform" aria-hidden="true">{Array.from({ length: 13 }, (_, index) => <i key={index} />)}</div>}</div>
                <div className="virtual-question-bubble">
                  {thinking ? <span className="virtual-thinking-dots"><i /><i /><i /></span> : currentQuestion?.text || "Your interviewer is preparing a question…"}
                </div>
                <div className="virtual-stage-footer"><span>{sessionConfig.category} · {sessionConfig.career}</span><span>{liveDifficulty} difficulty</span></div>
                {cameraStream && <div className="virtual-self-view"><video ref={videoRef} autoPlay playsInline muted /><span>You · local preview</span></div>}
              </div>
              {sessionConfig.category === "Coding Interview" && codingChallenge && <section className="virtual-coding-challenge" aria-label="Coding interview problem">
                <div><p className="virtual-eyebrow">CODING CHALLENGE · {codingChallenge.level}</p><h2>{codingChallenge.title}</h2></div>
                <p>{codingChallenge.description}</p>
                <p><strong>Input:</strong> {codingChallenge.inputFormat} <strong>Output:</strong> {codingChallenge.outputFormat}</p>
                <div className="virtual-sample-io"><span><strong>Sample input</strong><code>{codingChallenge.sampleInput}</code></span><span><strong>Sample output</strong><code>{codingChallenge.sampleOutput}</code></span></div>
                <small>Run tests sends your code to the configured isolated runner. Private test inputs stay on the server.</small>
              </section>}
              <div className="virtual-room-controls">
                <button className={`virtual-round-control ${handsFree ? "active" : ""}`} type="button" onClick={handsFree ? stopHandsFree : startHandsFree} disabled={!recognitionAvailable || (!handsFree && (thinking || paused))} aria-label={handsFree ? "Stop hands-free voice interview" : "Start hands-free voice interview"} aria-pressed={handsFree} title={recognitionAvailable ? handsFree ? "Stop hands-free voice interview" : "Start hands-free voice interview" : "Voice input is not supported in this browser"}>
                  {handsFree ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button className={`virtual-round-control ${cameraStream ? "active-camera" : ""}`} type="button" onClick={toggleCamera} disabled={paused} aria-label={cameraStream ? "Turn camera off" : "Turn camera on"} title="Optional local camera preview">
                  {cameraStream ? <CameraOff size={20} /> : <Camera size={20} />}
                </button>
                <span className="virtual-control-caption">{handsFree ? listening ? "Listening" : "Voice on" : recognitionAvailable ? "Hands-free" : "Type answer"}</span>
                <span className="virtual-control-caption">{cameraStream ? "Camera on" : "Camera off"}</span>
              </div>
              {recognitionAvailable
                ? <p className="virtual-inline-hint">{handsFree ? "Hands-free is on. Speak naturally; your answer sends after a short pause, then the interviewer responds." : "Tap the mic once to start. Your speech will be sent automatically after a short pause."}</p>
                : <p className="virtual-inline-hint">This browser does not support speech recognition. Type your answer below.</p>}
              {cameraError && <p className="virtual-error" role="alert">{cameraError}</p>}
              {error && <p className="virtual-error" role="alert">{error}</p>}
            </section>

            <aside className="virtual-transcript-panel">
              <div className="virtual-panel-title"><div><p className="virtual-eyebrow">LIVE NOTES</p><h2>Conversation</h2></div><span>{transcript.filter((item) => item.role === "candidate").length} answers</span></div>
              <div className="virtual-transcript-list" role="log" aria-live="polite" aria-relevant="additions">
                {transcript.map((item) => <article className={`virtual-message ${item.role}`} key={item.id}><div><strong>{item.role === "interviewer" ? "AI Interviewer" : "You"}</strong>{item.questionNumber && <span>Q{item.questionNumber}</span>}</div><p>{item.text}</p></article>)}
                {thinking && <div className="virtual-thinking-line"><LoaderCircle size={15} className="virtual-spin" /> Interviewer is preparing the next question…</div>}
              </div>
              <form className="virtual-answer-form" onSubmit={submitAnswer}>
                <label htmlFor="virtual-answer">Your response</label>
                <textarea id="virtual-answer" value={answer} onChange={(event) => updateAnswer(event.target.value)} maxLength={5000} rows={4} disabled={paused || thinking || listening} placeholder={listening ? "Speak your answer; the transcript will appear here." : "Type your answer or use the microphone."} />
                {listening && <p className="virtual-interim" aria-live="polite">{interimTranscript || "Listening for your answer…"}</p>}
                {sessionConfig.category === "Coding Interview" && <label htmlFor="virtual-code-answer">Code ({sessionConfig.language})
                  <textarea id="virtual-code-answer" className="virtual-code-input" value={codeAnswer} onChange={(event) => { setCodeAnswer(event.target.value); setCodeEvaluation(null); }} maxLength={10000} rows={9} disabled={paused || thinking || codeRunning} placeholder={`Write your ${sessionConfig.language} solution here…`} spellCheck="false" />
                </label>}
                {sessionConfig.category === "Coding Interview" && <>
                  <button className="virtual-secondary virtual-run-code" type="button" onClick={requestCodingHint} disabled={paused || thinking || hintLoading}>
                    {hintLoading ? <LoaderCircle size={16} className="virtual-spin" /> : <Sparkles size={16} />}{hintLoading ? "Preparing a hint…" : "Ask AI for a hint"}
                  </button>
                  {codeHint && <div className="virtual-code-hint" role="status"><strong>Interviewer hint</strong><p>{codeHint}</p></div>}
                  <button className="virtual-secondary virtual-run-code" type="button" onClick={runCodingTests} disabled={paused || thinking || codeRunning || !codeAnswer.trim()}>
                    {codeRunning ? <LoaderCircle size={16} className="virtual-spin" /> : <Play size={16} />}{codeRunning ? "Running tests…" : "Run hidden tests"}
                  </button>
                  <p className="virtual-code-limit">The shared runner allows three submissions per minute; AI hints are limited to five per minute.</p>
                  {codeEvaluation && <div className={`virtual-code-result ${codeEvaluation.result.passed === codeEvaluation.result.total ? "passed" : "failed"}`} role="status">
                    <strong>{codeEvaluation.result.status}</strong><span>{codeEvaluation.result.passed}/{codeEvaluation.result.total} tests passed</span>
                  </div>}
                </>}
                <button className="virtual-primary" type="submit" disabled={paused || thinking || codeRunning || listening || handsFree || (!answer.trim() && (!codeAnswer.trim() || codeAnswer.trim() === codingChallenge?.starterCode?.[sessionConfig.language]?.trim()))}>
                  {thinking ? <LoaderCircle className="virtual-spin" size={17} /> : <Send size={17} />}
                  {thinking ? "Interviewer is responding…" : handsFree ? "Answer sends automatically" : listening ? "Stop the microphone to send" : "Send answer"}
                </button>
                {canRetryTurn && !thinking && <button className="virtual-link-button" type="button" onClick={retryNextTurn}>Retry interviewer response</button>}
                {paused && <p className="virtual-paused-note">Interview paused. Resume when you are ready to continue.</p>}
              </form>
            </aside>
          </div>
          <p className="virtual-room-footnote">The camera is an optional local preview only. Voice transcription depends on your browser and microphone permission; text input is always available.</p>
        </>
      )}

      {page === "reporting" && <section className="virtual-state-card"><LoaderCircle size={30} className="virtual-spin" /><h2>Building your interview report</h2><p>Gemini is reviewing your answers. Scores will only appear if the report is complete and valid.</p></section>}

      {page === "report_error" && <section className="virtual-state-card virtual-state-error"><AlertCircle size={30} /><h2>Report not ready</h2><p>{error}</p><div><button className="virtual-primary" type="button" onClick={() => finishInterview()}><Sparkles size={17} /> Retry report</button><button className="virtual-secondary" type="button" onClick={() => { pausedRef.current = true; setPage("room"); setPaused(true); }}>Return to interview</button></div></section>}

      {page === "report" && report?.report && <ReportView record={report} onBack={() => setPage("setup")} onDownload={downloadReport} storageWarning={storageWarning} pdfError={pdfError} />}

      {page === "history" && (
        <section className="virtual-history-page">
          <div className="virtual-section-heading"><div><p className="virtual-eyebrow">YOUR PRACTICE RECORD</p><h2>Interview history</h2></div><div className="virtual-history-actions"><button className="virtual-secondary" type="button" onClick={() => setPage("setup")}><ArrowLeft size={16} /> Back to setup</button><button className="virtual-danger-button" type="button" onClick={clearHistory} disabled={!history.length}><Trash2 size={16} /> Clear history</button></div></div>
          {storageWarning && <p className="virtual-error" role="alert">{storageWarning}</p>}
          <div className="virtual-weekly-stats" aria-label="Last seven days interview analytics">
            <article><span>Interviews this week</span><strong>{weeklyRecords.length}</strong><small>Last 7 days on this browser</small></article>
            <article><span>Average score this week</span><strong>{weeklyAverage === null ? "—" : `${weeklyAverage}/100`}</strong><small>{weeklyScores.length ? `Based on ${weeklyScores.length} completed report${weeklyScores.length === 1 ? "" : "s"}` : "Complete an interview to see your average"}</small></article>
          </div>
          {history.length > 1 && <div className="virtual-trend-card"><div><BarChart3 size={19} /><div><strong>Score trend</strong><small>Recent saved reports, oldest to newest</small></div></div><svg viewBox="0 0 320 96" role="img" aria-label="Overall interview score trend"><line x1="16" x2="304" y1="82" y2="82" /><line x1="16" x2="304" y1="14" y2="14" /><polyline points={chartPoints} />{scoreSeries.map((item, index) => { const x = scoreSeries.length < 2 ? 160 : 16 + index * (288 / (scoreSeries.length - 1)); const y = 82 - (Math.max(0, Math.min(100, item.report?.overallScore || 0)) * 0.68); return <circle key={item.id} cx={x} cy={y} r="3.5" />; })}</svg></div>}
          {!history.length ? <div className="virtual-empty-state"><History size={28} /><h3>No saved interviews yet</h3><p>Completed interview reports will appear here on this browser.</p></div> : <div className="virtual-history-list">{history.map((item) => <div className="virtual-history-row" key={item.id}>
            <button className="virtual-history-main" type="button" onClick={() => openHistoryRecord(item)}>
              <span className="virtual-history-score">{item.report?.overallScore ?? "—"}</span><span className="virtual-history-meta"><strong>{item.candidateName ? `${item.candidateName} · ` : ""}{item.category}</strong><small>{item.career} · {formatDate(item.createdAt)} · {formatDuration(item.durationSeconds)}</small></span><span className="virtual-history-open">View report <ArrowLeft size={15} /></span>
            </button>
            <button className="virtual-history-delete" type="button" onClick={() => deleteHistoryRecord(item)} aria-label={`Delete ${item.category} interview report`} title="Delete report"><Trash2 size={16} /></button>
          </div>)}</div>}
        </section>
      )}
    </div>
  );
}

function ReportView({ record, onBack, onDownload, storageWarning, pdfError }) {
  const report = record.report;
  return (
    <div className="virtual-report-page">
      <div className="virtual-report-toolbar"><button className="virtual-secondary" type="button" onClick={onBack}><ArrowLeft size={16} /> New interview</button><button className="virtual-primary" type="button" onClick={() => onDownload(record)}><Download size={17} /> Download PDF</button></div>
      {pdfError && <p className="virtual-error" role="alert">{pdfError}</p>}
      {storageWarning && <p className="virtual-error" role="alert">{storageWarning}</p>}
      <section className="virtual-report-hero">
        <div><p className="virtual-eyebrow">INTERVIEW PERFORMANCE REPORT</p><h2>{record.career}</h2><p>{record.candidateName ? `${record.candidateName} · ` : ""}{record.category} · {formatDate(record.createdAt)} · {formatDuration(record.durationSeconds)}</p>{record.config?.codingChallengeTitle && <p>Coding challenge: {record.config.codingChallengeTitle}</p>}</div>
        <div className="virtual-overall-score" style={{ "--score": `${report.overallScore}%` }}><span>{report.overallScore}</span><small>/ 100</small></div>
      </section>
      <section className="virtual-report-section"><div className="virtual-report-section-title"><Sparkles size={18} /><h3>Summary</h3></div><p>{report.summary}</p></section>
      <section className="virtual-report-section"><div className="virtual-report-section-title"><BarChart3 size={18} /><h3>Performance breakdown</h3></div><p className="virtual-report-weight-note">The overall score is calculated from these category scores using the listed weights.</p><div className="virtual-score-grid">{scoreLabels.map(([key, label, weight]) => { const value = report.scores?.[key]; const score = Number.isInteger(value) ? Math.max(0, Math.min(100, value)) : null; return <article className="virtual-score-card" key={key}><div><span>{label}<small>{weight}% of overall score</small></span><strong>{score === null ? "—" : score}</strong></div><div className="virtual-score-track" role="progressbar" aria-label={`${label} score`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score ?? 0}><span style={{ width: `${score ?? 0}%` }} /></div></article>; })}</div></section>
      <section className="virtual-report-section"><div className="virtual-report-section-title"><FileText size={18} /><h3>Answer presentation</h3><span className="virtual-text-only-badge">Text-only assessment</span></div><p>{report.presentationFeedback}</p><small className="virtual-report-disclaimer">Scores evaluate written answers. They do not measure actual confidence, personality, voice, appearance, or hiring outcomes.</small></section>
      <div className="virtual-report-columns"><ReportList title="Strong points" items={report.strongPoints} variant="positive" /><ReportList title="Areas to improve" items={report.weakAreas} variant="improve" /></div>
      <section className="virtual-report-section"><div className="virtual-report-section-title"><CheckCircle2 size={18} /><h3>Personalized recommendations</h3></div><ol className="virtual-recommendations">{report.recommendations.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ol></section>
      <section className="virtual-report-section"><div className="virtual-report-section-title"><History size={18} /><h3>Question-by-question review</h3></div><div className="virtual-question-reviews">{report.questionReviews.map((item, index) => <article className="virtual-question-review" key={`${index}-${item.question}`}><div className="virtual-review-heading"><span>QUESTION {index + 1}</span><strong>{item.score}/100</strong></div><h4>{item.question}</h4><div className="virtual-answer-block"><strong>Your answer</strong><p>{item.answer}</p></div><div className="virtual-answer-block"><strong>Evaluation</strong><p>{item.evaluation}</p></div><div className="virtual-answer-block improved"><strong>Example improvement</strong><p>{item.improvedAnswer}</p></div></article>)}</div></section>
      <section className="virtual-report-section"><div className="virtual-report-section-title"><Sparkles size={18} /><h3>Questions to practice next</h3></div><ol className="virtual-recommendations">{report.practiceQuestions.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ol></section>
      <p className="virtual-report-disclaimer">AI-generated practice feedback is an estimate from this transcript, not a hiring prediction. No audio or video was included in the scoring.</p>
    </div>
  );
}

function ReportList({ title, items, variant }) {
  return <section className={`virtual-report-list ${variant}`}><h3>{title}</h3><ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></section>;
}
