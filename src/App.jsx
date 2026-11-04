import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Target,
  Map,
  MessageSquare,
  Settings,
  Bell,
  Search,
  ArrowUpRight,
  BriefcaseBusiness,
  Code2,
  BookOpen,
  CheckCircle2,
  Menu,
  X,
  Sparkles,
  GraduationCap,
  Clock3,
  GitBranch,
  Briefcase,
  Layers,
  CodeXml,
  TrendingUp,
  Compass,
  ClipboardCheck,
  Video,
  Bot,
  Plus,
  Trash2
} from "lucide-react";

import "./App.css";
import BrandMark from "./BrandMark";
import ResumeAnalyzer from "./ResumeAnalyzer";
import SkillGap from "./SkillGap";
import CareerRoadmap from "./CareerRoadmap";
import InterviewPrep from "./InterviewPrep";
import VirtualInterviewer from "./VirtualInterviewer";
import SettingsPage from "./Settings";
import JobMatcher from "./JobMatcher";
import InternshipFinder from "./InternshipFinder";
import PortfolioBuilder from "./PortfolioBuilder";
import ProjectGenerator from "./ProjectGenerator";
import CodingLab from "./CodingLab";
import SkillTracker from "./SkillTracker";
import AptitudeTest from "./AptitudeTest";
import PlacementDashboard from "./PlacementDashboard";
import GitHubAnalyzer from "./GitHubAnalyzer";
import CareerMentor from "./CareerMentor";
import { currentTimestamp, readStored, storageKeys, writeStored } from "./dataStore";

const defaultProfile = {
  name: "Student",
  email: "",
  phone: "",
  college: "",
  degree: "",
  graduationYear: "",
  avatar: "",
  career: "Software Developer",
  studyHours: "2",
  theme: "light",
};

const defaultActivities = [
  {
    id: "learn-java",
    title: "Learn Java fundamentals",
    category: "Programming",
    time: "30 minutes",
    done: true,
  },
  {
    id: "practice-dsa",
    title: "Practice 5 DSA questions",
    category: "Problem Solving",
    time: "45 minutes",
    done: false,
  },
  {
    id: "improve-resume",
    title: "Improve your resume",
    category: "Career",
    time: "20 minutes",
    done: false,
  },
];

function localDayKey(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activities, setActivities] = useState(() => {
    const stored = readStored(storageKeys.tasks, null);
    if (!Array.isArray(stored)) return defaultActivities;
    return stored
      .filter((item) => item && typeof item.title === "string" && item.title.trim())
      .map((item, index) => ({
        id: typeof item.id === "string" ? item.id : `saved-${index}-${item.title}`,
        title: item.title.trim().slice(0, 100),
        category: typeof item.category === "string" ? item.category.slice(0, 40) : "Personal",
        time: typeof item.time === "string" ? item.time.slice(0, 40) : "Anytime",
        done: item.done === true,
        completedAt: typeof item.completedAt === "string" ? item.completedAt : "",
      }));
  });
  const [completionLog, setCompletionLog] = useState(() => {
    const stored = readStored(storageKeys.taskCompletionLog, []);
    if (!Array.isArray(stored)) return [];
    return stored.filter((entry) => entry && typeof entry.taskId === "string" && typeof entry.completedAt === "string" && typeof entry.dayKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.dayKey) && Number.isFinite(new Date(entry.completedAt).getTime())).slice(-1000);
  });
  const [taskTitle, setTaskTitle] = useState("");
  const [activityError, setActivityError] = useState("");
  const [profile, setProfile] = useState(() => {
    try {
      const savedProfile = JSON.parse(
        window.localStorage.getItem("careerpilot-profile") || "null"
      );
      return {
        name: typeof savedProfile?.name === "string" && savedProfile.name.trim()
          ? savedProfile.name
          : defaultProfile.name,
        email: typeof savedProfile?.email === "string" ? savedProfile.email.slice(0, 254) : "",
        phone: typeof savedProfile?.phone === "string" ? savedProfile.phone.slice(0, 40) : "",
        college: typeof savedProfile?.college === "string" ? savedProfile.college.slice(0, 160) : "",
        degree: typeof savedProfile?.degree === "string" ? savedProfile.degree.slice(0, 120) : "",
        graduationYear: typeof savedProfile?.graduationYear === "string" ? savedProfile.graduationYear.slice(0, 4) : "",
        avatar: typeof savedProfile?.avatar === "string" && savedProfile.avatar.length <= 220000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(savedProfile.avatar)
          ? savedProfile.avatar
          : "",
        career: ["Software Developer", "Frontend Developer", "Backend Developer", "Data Analyst"].includes(savedProfile?.career)
          ? savedProfile.career
          : defaultProfile.career,
        studyHours: ["1", "2", "3", "4"].includes(savedProfile?.studyHours)
          ? savedProfile.studyHours
          : defaultProfile.studyHours,
        theme: ["light", "dark"].includes(savedProfile?.theme)
          ? savedProfile.theme
          : defaultProfile.theme,
      };
    } catch {
      console.error("Could not read the saved CareerCraft profile from browser storage.");
      return defaultProfile;
    }
  });

  const navigation = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Resume Analyzer", icon: FileText },
    { name: "Skill Gap", icon: Target },
    { name: "Career Roadmap", icon: Map },
    { name: "AI Interview", icon: MessageSquare },
    { name: "Virtual AI Interviewer", icon: Video },
    { name: "AI Job Matcher", icon: Briefcase },
    { name: "Internship Finder", icon: Search },
    { name: "Portfolio Builder", icon: Layers },
    { name: "Project Generator", icon: Sparkles },
    { name: "Coding Practice Lab", icon: CodeXml },
    { name: "Skill Tracker", icon: TrendingUp },
    { name: "Career Aptitude Test", icon: Compass },
    { name: "Placement Readiness", icon: ClipboardCheck },
    { name: "GitHub Analyzer", icon: GitBranch },
    { name: "AI Career Mentor", icon: Bot },
  ];

  const resumeProgress = readStored(storageKeys.resume, null);
  const jobMatches = readStored(storageKeys.jobMatches, []);
  const trackedSkills = readStored(storageKeys.skills, []);
  const resumeScore = Number.isFinite(resumeProgress?.score)
    ? resumeProgress.score
    : Array.isArray(jobMatches) && jobMatches.length && Number.isFinite(jobMatches[0]?.score)
      ? jobMatches[0].score
      : null;
  const skills = Array.isArray(trackedSkills) ? trackedSkills : [];
  const skillProgress = skills.length
    ? Math.round(skills.reduce((sum, skill) => sum + (Number(skill.progress) || 0), 0) / skills.length)
    : null;
  const stats = [
    {
      label: "Resume Score",
      value: resumeScore === null ? "—" : `${resumeScore}%`,
      detail: resumeScore === null ? "Analysis not started" : "Latest recorded analysis",
      icon: FileText,
      page: "Resume Analyzer",
    },
    {
      label: "Skills Identified",
      value: String(skills.length),
      detail: skills.length ? "Skills in your tracker" : "Add your skills",
      icon: Code2,
      page: "Skill Tracker",
    },
    {
      label: "Learning Progress",
      value: skillProgress === null ? "—" : `${skillProgress}%`,
      detail: skillProgress === null ? "Track a skill to get started" : "Average self-assessed skill progress",
      icon: GraduationCap,
      page: "Skill Tracker",
    },
    {
      label: "Tasks Completed",
      value: `${activities.filter((activity) => activity.done).length}/${activities.length}`,
      detail: "Today's learning goals",
      icon: CheckCircle2,
      page: "Career Roadmap",
    },
  ];

  const pendingActivities = activities.filter((activity) => !activity.done);
  const searchResults = [...navigation, { name: "Student Account", icon: Settings }]
    .filter((item) =>
      item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );

  useEffect(() => {
    function handleShortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        setNotificationsOpen(false);
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function navigateTo(page) {
    setActivePage(page);
    setMenuOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
    setNotificationsOpen(false);
  }

  function updateActivities(next) {
    setActivities(next);
    setActivityError(
      writeStored(storageKeys.tasks, next)
        ? ""
        : "Goal list changed for this session, but could not be saved in this browser."
    );
  }

  function toggleTask(id) {
    const currentActivity = activities.find((activity) => activity.id === id);
    let completionLogFailed = false;
    if (currentActivity && !currentActivity.done) {
      const completedAt = currentTimestamp();
      const completedDay = localDayKey(completedAt);
      const alreadyLoggedToday = completionLog.some((entry) => entry.taskId === id && localDayKey(entry.completedAt) === completedDay);
      if (!alreadyLoggedToday) {
        const nextLog = [...completionLog, { taskId: id, completedAt, dayKey: completedDay }].slice(-1000);
        setCompletionLog(nextLog);
        completionLogFailed = !writeStored(storageKeys.taskCompletionLog, nextLog);
      }
    }
    const next = activities.map((activity) =>
      activity.id === id
        ? { ...activity, done: !activity.done, completedAt: activity.done ? "" : completedAt }
        : activity
    );
    updateActivities(next);
    if (completionLogFailed) setActivityError("Task completion was recorded for this session, but the learning streak could not be saved in this browser.");
  }

  function addTask(event) {
    event.preventDefault();
    const title = taskTitle.trim();
    if (!title) return;
    updateActivities([
      ...activities,
      { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${title}`, title, category: "Personal", time: "Anytime", done: false, completedAt: "" },
    ]);
    setTaskTitle("");
  }

  function addMentorTasks(tasks) {
    if (!Array.isArray(tasks)) return 0;
    const existingTitles = new Set(activities.filter((item) => !item.done).map((item) => item.title.toLowerCase()));
    const additions = tasks
      .filter((task) => task && typeof task.title === "string" && task.title.trim())
      .slice(0, 8)
      .filter((task) => {
        const title = task.title.trim().toLowerCase();
        if (existingTitles.has(title)) return false;
        existingTitles.add(title);
        return true;
      })
      .map((task) => ({
        id: globalThis.crypto?.randomUUID?.() || `mentor-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: task.title.trim().slice(0, 100),
        category: typeof task.skill === "string" && task.skill.trim() ? task.skill.trim().slice(0, 40) : "Career Mentor",
        time: Number.isInteger(task.minutes) && task.minutes > 0 ? `${Math.min(task.minutes, 240)} minutes` : "Anytime",
        done: false,
        completedAt: "",
      }));
    if (additions.length) updateActivities([...activities, ...additions]);
    return additions.length;
  }

  function saveProfile(nextProfile) {
    setProfile(nextProfile);
    try {
      window.localStorage.setItem(
        "careerpilot-profile",
        JSON.stringify(nextProfile)
      );
      return true;
    } catch {
      return false;
    }
  }

  return (
    <div className="app-layout" data-theme={profile.theme}>

      {menuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside id="primary-navigation" className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>

        <div className="brand">
          <div className="brand-icon">
            <BrandMark size={27} />
          </div>

          <div>
            <h2>CareerCraft</h2>
            <span>YOUR AI CAREER STUDIO</span>
          </div>

          <button
            className="mobile-close"
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                type="button"
                key={item.name}
                className={`nav-item ${
                  activePage === item.name ? "active" : ""
                }`}
                aria-current={activePage === item.name ? "page" : undefined}
                onClick={() => navigateTo(item.name)}
              >
                <Icon size={19} />
                <span>{item.name}</span>

                {item.name === "Resume Analyzer" && (
                  <span className="new-label">AI</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">

          <div className="help-card">
            <div className="help-icon">
              <Sparkles size={19} />
            </div>

            <h3>Ready to grow?</h3>
            <p>Your next career milestone is waiting.</p>

            <button
              type="button"
              onClick={() => navigateTo("Career Roadmap")}
            >
              View roadmap <ArrowUpRight size={15} />
            </button>
          </div>

          <button
            type="button"
            className={`nav-item ${
              activePage === "Student Account" ? "active" : ""
            }`}
            onClick={() => navigateTo("Student Account")}
          >
            <Settings size={19} />
            <span>Student Account</span>
          </button>

          <button
            className="profile profile-action"
            type="button"
            onClick={() => navigateTo("Student Account")}
            aria-label="Open student account"
          >
            <div className="avatar" aria-hidden="true">{profile.avatar ? <img src={profile.avatar} alt="" /> : profile.name.slice(0, 1).toUpperCase()}</div>

            <div>
              <h4>{profile.name}</h4>
              <span>{profile.career}</span>
            </div>

            <ArrowUpRight size={17} className="profile-arrow" />
          </button>

        </div>
      </aside>

      <main className="main-content">

        <header className="topbar">

          <div className="topbar-left">
            <button
              className="mobile-menu"
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              aria-controls="primary-navigation"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={23} />
            </button>

            <div className="breadcrumb">
              Workspace <span>/</span> {activePage}
            </div>
          </div>

          <div className="topbar-right">

            <button
              className="search-button"
              type="button"
              aria-expanded={searchOpen}
              aria-label="Search workspace"
              onClick={() => {
                setSearchOpen((open) => !open);
                setNotificationsOpen(false);
              }}
            >
              <Search size={18} />
              <span>Search</span>
              <kbd>⌘ K</kbd>
            </button>

            <button
              className="notification-button"
              type="button"
              aria-expanded={notificationsOpen}
              aria-label={`Today's goals, ${pendingActivities.length} remaining`}
              onClick={() => {
                setNotificationsOpen((open) => !open);
                setSearchOpen(false);
              }}
            >
              <Bell size={19} />
              {pendingActivities.length > 0 && (
                <span className="notification-dot"></span>
              )}
            </button>

            <button
              className="top-avatar"
              type="button"
              aria-label="Open student account"
              onClick={() => navigateTo("Student Account")}
            >
              {profile.avatar ? <img src={profile.avatar} alt="" /> : profile.name.slice(0, 1).toUpperCase()}
            </button>

          </div>
        </header>

        {searchOpen && (
          <div className="topbar-popover search-popover">
            <label htmlFor="workspace-search">Search workspace</label>
            <input
              id="workspace-search"
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Find a page..."
            />
            <div className="popover-results">
              {searchResults.length ? searchResults.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => navigateTo(item.page || item.name)}
                  >
                    <Icon size={17} />
                    {item.name}
                  </button>
                );
              }) : <p>No matching pages.</p>}
            </div>
          </div>
        )}

        {notificationsOpen && (
          <div className="topbar-popover notifications-popover">
            <div className="popover-heading">
              <strong>Today's goals</strong>
              <span>{pendingActivities.length} remaining</span>
            </div>
            {pendingActivities.length ? (
              pendingActivities.map((activity) => (
                <button
                  type="button"
                  className="notification-item"
                key={activity.id}
                  onClick={() => toggleTask(activity.id)}
                >
                  <BookOpen size={17} />
                  <span>{activity.title}<small>Mark complete</small></span>
                </button>
              ))
            ) : (
              <p className="popover-empty">All of today's goals are complete.</p>
            )}
          </div>
        )}

        <section className="dashboard">

          {activePage === "Resume Analyzer" ? (

            <ResumeAnalyzer />

          ) : activePage === "Skill Gap" ? (

            <SkillGap initialCareer={profile.career} />

          ) : activePage === "Career Roadmap" ? (

            <CareerRoadmap initialCareer={profile.career} />

          ) : activePage === "AI Interview" ? (

            <InterviewPrep initialCareer={profile.career} />

          ) : activePage === "Virtual AI Interviewer" ? (

            <VirtualInterviewer initialCareer={profile.career} initialName={profile.name} />

          ) : activePage === "AI Job Matcher" ? (

            <JobMatcher />

          ) : activePage === "Internship Finder" ? (

            <InternshipFinder />

          ) : activePage === "Portfolio Builder" ? (

            <PortfolioBuilder userProfile={profile} />

          ) : activePage === "Project Generator" ? (

            <ProjectGenerator profile={profile} />

          ) : activePage === "Coding Practice Lab" ? (

            <CodingLab />

          ) : activePage === "Skill Tracker" ? (

            <SkillTracker />

          ) : activePage === "Career Aptitude Test" ? (

            <AptitudeTest />

          ) : activePage === "Placement Readiness" ? (

            <PlacementDashboard />

          ) : activePage === "GitHub Analyzer" ? (

            <GitHubAnalyzer />

          ) : activePage === "AI Career Mentor" ? (

            <CareerMentor profile={profile} activities={activities} completionLog={completionLog} onToggleTask={toggleTask} onAddTasks={addMentorTasks} onNavigate={navigateTo} />

          ) : activePage === "Student Account" ? (

            <SettingsPage profile={profile} onSave={saveProfile} />

          ) : (

            <>

              <div className="welcome-section">

                <div>
                  <div className="welcome-tag">
                    <Sparkles size={14} />
                    YOUR PERSONAL AI CAREER ASSISTANT
                  </div>

                  <h1>
                  Welcome back, <span>{profile.name}!</span>
                  </h1>

                  <p>
                    Small steps today. Big career achievements tomorrow.
                  </p>
                </div>

                <div className="date-card">
                  <Clock3 size={17} />
                  {profile.studyHours} focused study hours / day
                </div>

              </div>

              <div className="section-heading">
                <div>
                  <h2>Your Overview</h2>
                  <p>
                    Track your progress towards your dream career.
                  </p>
                </div>
              </div>

              <div className="stats-grid">

                {stats.map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <button
                      className="stat-card"
                      key={stat.label}
                      type="button"
                      onClick={() => navigateTo(stat.page)}
                      aria-label={`${stat.label}: ${stat.value}. Open ${stat.page}`}
                    >

                      <div className="stat-top">
                        <div className="stat-icon">
                          <Icon size={20} />
                        </div>

                        <ArrowUpRight
                          size={17}
                          className="muted-arrow"
                        />
                      </div>

                      <h3>{stat.value}</h3>
                      <h4>{stat.label}</h4>
                      <p>{stat.detail}</p>

                    </button>
                  );
                })}

              </div>

              <div className="content-grid">

                <section className="main-panel">

                  <div className="panel-heading">
                    <div>
                      <h2>Today's Goals</h2>
                      <p>Stay consistent. Keep improving.</p>
                    </div>

                    <button
                      type="button"
                      className="text-button"
                      onClick={() => navigateTo("Career Roadmap")}
                    >
                      View all <ArrowUpRight size={16} />
                    </button>
                  </div>

                  <div className="activity-list">

                    {activities.map((activity) => (
                      <div
                        className="activity-item"
                        key={activity.id}
                      >

                        <div className="activity-icon">
                          {activity.done ? (
                            <CheckCircle2 size={20} />
                          ) : (
                            <BookOpen size={20} />
                          )}
                        </div>

                        <div className="activity-info">
                          <h4>{activity.title}</h4>
                          <p>
                            {activity.category} · {activity.time}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="start-button"
                          onClick={() => toggleTask(activity.id)}
                        >
                          {activity.done ? "Undo" : "Mark complete"}
                        </button>
                        <button
                          type="button"
                          className="activity-delete"
                          aria-label={`Remove ${activity.title}`}
                          onClick={() => updateActivities(activities.filter((item) => item.id !== activity.id))}
                        >
                          <Trash2 size={16} />
                        </button>

                      </div>
                    ))}

                  </div>
                  {activities.length === 0 && <p className="activity-empty">No goals yet. Add one to plan your next step.</p>}
                  <form className="activity-add-form" onSubmit={addTask}>
                    <input
                      aria-label="New goal"
                      value={taskTitle}
                      onChange={(event) => setTaskTitle(event.target.value)}
                      maxLength={100}
                      placeholder="Add a learning goal..."
                    />
                    <button type="submit" disabled={!taskTitle.trim()}>
                      <Plus size={17} /> Add goal
                    </button>
                  </form>
                  {activityError && <p className="activity-error" role="alert">{activityError}</p>}
                </section>

                <section className="career-panel">

                  <div className="panel-heading">
                    <div>
                      <h2>Career Goal</h2>
                      <p>Your dream destination</p>
                    </div>

                    <BriefcaseBusiness
                      size={21}
                      className="career-icon"
                    />
                  </div>

                  <div className="career-illustration">
                    <div className="career-circle">
                      <Code2 size={35} />
                    </div>
                  </div>

                  <h3>{profile.career}</h3>

                  <p className="career-description">
                    Build your skills and become industry-ready.
                  </p>

                  <div className="career-tags">
                    <span>{profile.studyHours}h daily</span>
                    <span>Learning path</span>
                  </div>

                  <button
                    type="button"
                    className="career-button"
                    onClick={() => navigateTo("Skill Gap")}
                  >
                    Explore required skills
                    <ArrowUpRight size={17} />
                  </button>

                </section>

              </div>

              <section className="bottom-banner">

                <div className="banner-icon">
                  <Sparkles size={25} />
                </div>

                <div className="banner-text">
                  <h3>Your career, powered by AI.</h3>
                  <p>
                    Get personalised guidance, discover your strengths,
                    and prepare for your dream job.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigateTo("Resume Analyzer")}
                >
                  Explore AI tools <ArrowUpRight size={17} />
                </button>

              </section>

              <footer>
                <p>
                  © 2026 CareerCraft. Built for ambitious students.
                </p>
                <p>Learn · Build · Grow</p>
              </footer>

            </>

          )}

        </section>
      </main>
    </div>
  );
}

export default App;
