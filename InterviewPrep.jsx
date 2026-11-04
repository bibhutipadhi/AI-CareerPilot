import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, CheckCircle2, LoaderCircle, MessageSquare, Mic, MicOff, Send, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { postApi } from "./api";
import { readStored, storageKeys, writeStored } from "./dataStore";
import "./CareerTools.css";

const careerOptions = [
  "Software Developer",
  "Frontend Developer",
  "Backend Developer",
  "Data Analyst",
  "Product Designer",
];

export default function InterviewPrep({ initialCareer = careerOptions[0] }) {
  const [career, setCareer] = useState(
    careerOptions.includes(initialCareer) ? initialCareer : careerOptions[0]
  );
  const [experienceLevel, setExperienceLevel] = useState("Entry-level");
  const [questionType, setQuestionType] = useState("Mixed");
  const [questionCount, setQuestionCount] = useState("5");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [question, setQuestion] = useState("");
  const [questionsSeen, setQuestionsSeen] = useState([]);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [responses, setResponses] = useState([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef(null);
  const voiceBaseRef = useRef("");
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const SpeechRecognitionApi = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

  useEffect(() => () => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
    }
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  function stopQuestionSpeech() {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  function readQuestionAloud() {
    if (!speechSupported || !question) return;
    if (isSpeaking) {
      stopQuestionSpeech();
      return;
    }

    const utterance = new window.SpeechSynthesisUtterance(question);
    utterance.rate = 0.96;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function stopVoiceAnswer() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        recognitionRef.current = null;
        setIsListening(false);
      }
    } else {
      setIsListening(false);
    }
  }

  function startVoiceAnswer() {
    if (!SpeechRecognitionApi) {
      setVoiceError("Voice input is not available in this browser. You can type your answer instead.");
      return;
    }

    setVoiceError("");
    stopQuestionSpeech();
    const recognition = new SpeechRecognitionApi();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    voiceBaseRef.current = answer.trim();

    recognition.onresult = (event) => {
      const finalParts = [];
      const interimParts = [];
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript?.trim();
        if (!transcript) continue;
        (result.isFinal ? finalParts : interimParts).push(transcript);
      }
      setInterimTranscript(interimParts.join(" "));
      setAnswer([voiceBaseRef.current, finalParts.join(" ")].filter(Boolean).join(voiceBaseRef.current ? " " : ""));
      setFeedback("");
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceError("Microphone access was blocked. Allow microphone access in your browser and try again.");
      } else if (event.error === "audio-capture") {
        setVoiceError("No microphone was found. Connect one or type your answer instead.");
      } else if (event.error === "no-speech") {
        setVoiceError("No speech was detected. Try again or type your answer.");
      } else if (event.error !== "aborted") {
        setVoiceError("Voice input stopped. Please try again or type your answer.");
      }
      setIsListening(false);
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setIsListening(false);
      setInterimTranscript("");
    };

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceError("Could not start voice input. Check microphone permission and try again.");
    }
  }

  async function requestQuestion(previousQuestions) {
    stopQuestionSpeech();
    if (recognitionRef.current) stopVoiceAnswer();
    setVoiceError("");
    setLoadingQuestion(true);
    setError("");
    try {
      const data = await postApi("/api/interview-question", {
        career,
        experienceLevel,
        questionType,
        previousQuestions: previousQuestions.slice(-7),
      });

      if (typeof data.question !== "string" || !data.question.trim()) {
        throw new Error("The AI server returned an empty interview question.");
      }
      setQuestion(data.question);
      setQuestionsSeen((previous) => [...previous, data.question]);
      setAnswer("");
      setFeedback("");
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not generate an interview question.");
      return false;
    } finally {
      setLoadingQuestion(false);
    }
  }

  async function startInterview() {
    setSessionComplete(false);
    setSessionActive(true);
    setQuestionNumber(1);
    setQuestion("");
    setQuestionsSeen([]);
    setResponses([]);
    setAnswer("");
    setFeedback("");
    const loaded = await requestQuestion([]);
    if (!loaded) {
      setSessionActive(false);
      setQuestionNumber(0);
    }
  }

  async function reviewAnswer(event) {
    event.preventDefault();
    if (!question || !answer.trim() || loadingFeedback || isListening) return;
    setLoadingFeedback(true);
    setError("");
    setFeedback("");

    try {
      const data = await postApi("/api/interview-feedback", {
        career,
        experienceLevel,
        question,
        answer: answer.trim(),
      });
      if (typeof data.feedback !== "string" || !data.feedback.trim()) {
        throw new Error("The AI server returned empty feedback.");
      }

      const reviewedAt = new Date().toISOString();
      setFeedback(data.feedback);
      setResponses((previous) => [...previous, {
        questionNumber,
        question,
        answer: answer.trim(),
        feedback: data.feedback,
        reviewedAt,
      }]);

      const previous = readStored(storageKeys.interview, { reviewedAnswers: 0 });
      const saved = writeStored(storageKeys.interview, {
        reviewedAnswers: (Number(previous?.reviewedAnswers) || 0) + 1,
        reviewedAt,
        history: [...(Array.isArray(previous?.history) ? previous.history : []), reviewedAt].slice(-100),
      });
      if (!saved) setError("Feedback is ready, but interview progress could not be saved for placement analytics.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not review your interview answer.");
    } finally {
      setLoadingFeedback(false);
    }
  }

  async function continueInterview() {
    if (questionNumber >= Number(questionCount)) {
      setSessionActive(false);
      setSessionComplete(true);
      return;
    }
    const nextQuestion = questionNumber + 1;
    if (await requestQuestion(questionsSeen)) setQuestionNumber(nextQuestion);
  }

  function endInterview() {
    stopQuestionSpeech();
    if (recognitionRef.current) stopVoiceAnswer();
    setSessionActive(false);
    setSessionComplete(true);
  }

  const reviewedQuestionCount = new Set(responses.map((item) => item.questionNumber)).size;

  return (
    <div className="career-tools-page ai-interview-page">
      <header className="career-tools-heading">
        <div className="career-tools-icon"><MessageSquare size={24} /></div>
        <div>
          <p className="career-tools-eyebrow">PRACTICE WITH AN AI INTERVIEWER</p>
          <h1>AI Mock Interview</h1>
          <p>Answer role-specific questions and get coaching after every response.</p>
        </div>
      </header>

      {!sessionActive && !sessionComplete && (
        <section className="career-tools-card career-tools-form">
          <h2>Set up your interview</h2>
          <label>
            Career role
            <select value={career} onChange={(event) => setCareer(event.target.value)} disabled={loadingQuestion}>
              {careerOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <div className="ai-interview-options">
            <label>
              Experience level
              <select value={experienceLevel} onChange={(event) => setExperienceLevel(event.target.value)} disabled={loadingQuestion}>
                <option>Entry-level</option>
                <option>Internship</option>
                <option>Experienced</option>
              </select>
            </label>
            <label>
              Question style
              <select value={questionType} onChange={(event) => setQuestionType(event.target.value)} disabled={loadingQuestion}>
                <option>Mixed</option>
                <option>Technical</option>
                <option>Behavioral</option>
              </select>
            </label>
            <label>
              Questions per interview
              <select value={questionCount} onChange={(event) => setQuestionCount(event.target.value)} disabled={loadingQuestion}>
                <option value="3">3 questions</option>
                <option value="5">5 questions</option>
                <option value="8">8 questions</option>
              </select>
            </label>
          </div>
          <button className="career-tools-button" type="button" onClick={startInterview} disabled={loadingQuestion}>
            {loadingQuestion ? <LoaderCircle size={18} className="career-tools-spinner" /> : <Sparkles size={18} />}
            {loadingQuestion ? "Starting your interview…" : "Start AI mock interview"}
          </button>
          {error && <p className="career-tools-error" role="alert">{error}</p>}
        </section>
      )}

      {sessionActive && question && (
        <>
          <section className="career-tools-card ai-interview-progress">
            <div><p className="career-tools-eyebrow">QUESTION {questionNumber} OF {questionCount}</p><strong>{career} · {experienceLevel} · {questionType}</strong></div>
            <div className="progress-track"><div style={{ width: `${questionNumber / Number(questionCount) * 100}%` }} /></div>
            <button className="career-tools-secondary" type="button" onClick={endInterview} disabled={loadingQuestion || loadingFeedback}><X size={15} /> End interview</button>
          </section>

          <section className="career-tools-card career-tools-result ai-interview-question">
            <div className={`ai-interviewer ${isSpeaking ? "is-speaking" : ""} ${isListening ? "is-listening" : ""}`}>
              <div className="ai-interviewer-avatar" aria-hidden="true"><Bot size={24} /></div>
              <div className="ai-interviewer-intro">
                <p className="career-tools-eyebrow">AI VIRTUAL INTERVIEWER</p>
                <p>{isSpeaking ? "Asking your question…" : isListening ? "Listening to your answer…" : "Ready when you are. Take a moment to think."}</p>
              </div>
              <button className="career-tools-secondary ai-interviewer-speak" type="button" onClick={readQuestionAloud} disabled={!speechSupported} aria-label={isSpeaking ? "Stop reading the question" : "Read question aloud"}>
                {isSpeaking ? <VolumeX size={17} /> : <Volume2 size={17} />}
                {isSpeaking ? "Stop" : "Read aloud"}
              </button>
            </div>
            <h2>Interview question</h2>
            <div className="career-tools-markdown"><ReactMarkdown>{question}</ReactMarkdown></div>
            <form className="career-tools-answer" onSubmit={reviewAnswer}>
              <label htmlFor="interview-answer">Your answer</label>
              <textarea
                id="interview-answer"
                value={answer}
                onChange={(event) => { setAnswer(event.target.value); setFeedback(""); }}
                placeholder="Answer as if you were in the interview. Include the steps you took and the result."
                maxLength={5000}
                rows={7}
                required
                disabled={loadingFeedback || loadingQuestion}
              />
              <div className="ai-interviewer-controls">
                <button className={`career-tools-secondary ai-interviewer-mic ${isListening ? "is-active" : ""}`} type="button" onClick={isListening ? stopVoiceAnswer : startVoiceAnswer} disabled={!SpeechRecognitionApi || loadingFeedback || loadingQuestion}>
                  {isListening ? <MicOff size={17} /> : <Mic size={17} />}
                  {isListening ? "Stop voice answer" : "Answer by voice"}
                </button>
                {!SpeechRecognitionApi && <span className="ai-interviewer-hint">Voice input is unavailable here. You can type your answer.</span>}
              </div>
              {isListening && <p className="ai-interviewer-transcript" aria-live="polite">{interimTranscript || "Speak naturally. Live transcription will appear here."}</p>}
              {voiceError && <p className="career-tools-error ai-interviewer-error" role="alert">{voiceError}</p>}
              <button className="career-tools-button" type="submit" disabled={loadingFeedback || loadingQuestion || !answer.trim() || isListening}>
                {loadingFeedback ? <LoaderCircle size={18} className="career-tools-spinner" /> : <Send size={18} />}
                {loadingFeedback ? "Reviewing your answer…" : isListening ? "Stop voice input to continue" : feedback ? "Review revised answer" : "Get AI feedback"}
              </button>
            </form>
          </section>

          {feedback && (
            <section className="career-tools-card career-tools-result ai-interview-feedback" aria-live="polite">
              <h2><Sparkles size={20} /> Coach feedback</h2>
              <div className="career-tools-markdown"><ReactMarkdown>{feedback}</ReactMarkdown></div>
              <button className="career-tools-button" type="button" onClick={continueInterview} disabled={loadingFeedback || loadingQuestion}>
                {questionNumber === Number(questionCount) ? <CheckCircle2 size={18} /> : <MessageSquare size={18} />}
                {questionNumber === Number(questionCount) ? "Finish interview" : "Next question"}
              </button>
            </section>
          )}
          {error && <p className="career-tools-error" role="alert">{error}</p>}
        </>
      )}

      {sessionComplete && (
        <section className="career-tools-card ai-interview-summary">
          <div className="career-tools-icon"><CheckCircle2 size={24} /></div>
          <p className="career-tools-eyebrow">INTERVIEW COMPLETE</p>
          <h2>You reviewed {reviewedQuestionCount} of {questionCount} answers</h2>
          <p>Your feedback is below so you can revisit your strongest points and next steps.</p>
          {responses.map((item) => (
            <article className="ai-interview-response" key={`${item.questionNumber}-${item.reviewedAt}`}>
              <p className="career-tools-eyebrow">QUESTION {item.questionNumber}</p>
              <div className="career-tools-markdown"><ReactMarkdown>{item.question}</ReactMarkdown></div>
              <h3>Your answer</h3><p>{item.answer}</p>
              <h3>Coach feedback</h3><div className="career-tools-markdown"><ReactMarkdown>{item.feedback}</ReactMarkdown></div>
            </article>
          ))}
          <button className="career-tools-button" type="button" onClick={startInterview} disabled={loadingQuestion}>
            {loadingQuestion ? <LoaderCircle size={18} className="career-tools-spinner" /> : <Sparkles size={18} />}
            {loadingQuestion ? "Starting your interview…" : "Start another interview"}
          </button>
          {error && <p className="career-tools-error" role="alert">{error}</p>}
        </section>
      )}

      <p className="career-tools-disclaimer">Interview questions and feedback are AI-generated practice guidance. Avoid sharing confidential or personal information.</p>
    </div>
  );
}
