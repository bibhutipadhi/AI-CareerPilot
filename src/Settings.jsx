import { useState } from "react";
import { Camera, CheckCircle2, Save, Settings as SettingsIcon, Trash2, UserRound } from "lucide-react";
import "./CareerTools.css";

const careerOptions = [
  "Software Developer",
  "Frontend Developer",
  "Backend Developer",
  "Data Analyst",
];

async function createAvatarImage(file) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Choose an image smaller than 5 MB.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const candidate = new Image();
      candidate.onload = () => resolve(candidate);
      candidate.onerror = () => reject(new Error("This image could not be opened."));
      candidate.src = objectUrl;
    });
    const side = 320;
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not process this photo.");
    const cropSide = Math.min(image.naturalWidth, image.naturalHeight);
    const cropX = (image.naturalWidth - cropSide) / 2;
    const cropY = (image.naturalHeight - cropSide) / 2;
    context.drawImage(image, cropX, cropY, cropSide, cropSide, 0, 0, side, side);
    return canvas.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "S";
}

export default function Settings({ profile, onSave }) {
  const [form, setForm] = useState(profile);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setMessage("");
    setError("");
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoLoading(true);
    setError("");
    setMessage("");
    try {
      const avatar = await createAvatarImage(file);
      update("avatar", avatar);
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : "Could not process this photo.");
    } finally {
      setPhotoLoading(false);
    }
  }

  function submitSettings(event) {
    event.preventDefault();
    const nextProfile = {
      ...form,
      name: form.name.trim() || "Student",
      email: form.email.trim(),
      phone: form.phone.trim(),
      college: form.college.trim(),
      degree: form.degree.trim(),
      graduationYear: form.graduationYear.trim(),
    };
    setForm(nextProfile);
    const saved = onSave(nextProfile);
    setMessage(saved
      ? "Your student account has been saved on this device."
      : "Your changes are active for this session, but this browser could not save them.");
  }

  return (
    <div className="career-tools-page student-account-page">
      <header className="career-tools-heading">
        <div className="career-tools-icon"><UserRound size={24} /></div>
        <div>
          <p className="career-tools-eyebrow">YOUR STUDENT PROFILE</p>
          <h1>Student Account</h1>
          <p>Manage your photo, education details, and learning preferences.</p>
        </div>
      </header>

      <form className="career-tools-card career-tools-form student-account-form" onSubmit={submitSettings}>
        <section className="student-account-photo-section" aria-label="Profile photo">
          <div className="student-account-avatar" aria-hidden="true">
            {form.avatar ? <img src={form.avatar} alt="" /> : <span>{initials(form.name || "Student")}</span>}
          </div>
          <div className="student-account-photo-copy">
            <h2>{form.name.trim() || "Your name"}</h2>
            <p>{form.degree || "Add your course"}{form.college ? ` · ${form.college}` : ""}</p>
            <div className="student-account-photo-actions">
              <label className="career-tools-button student-photo-button">
                <Camera size={17} />
                {photoLoading ? "Preparing photo…" : form.avatar ? "Change photo" : "Add a photo"}
                <input
                  className="student-account-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  disabled={photoLoading}
                />
              </label>
              {form.avatar && <button className="student-photo-remove" type="button" onClick={() => update("avatar", "")}><Trash2 size={16} /> Remove</button>}
            </div>
            <small>JPG, PNG, or WebP · square crop · up to 5 MB</small>
          </div>
        </section>

        <section className="student-account-fields-section">
          <div className="student-account-section-title"><div><p className="career-tools-eyebrow">ACCOUNT DETAILS</p><h2>About you</h2></div><SettingsIcon size={19} /></div>
          <div className="student-account-fields">
            <label>Full name
              <input type="text" value={form.name} maxLength={60} autoComplete="name" required onChange={(event) => update("name", event.target.value)} />
            </label>
            <label><span className="student-account-label">Email address <small>Optional</small></span>
              <input type="email" value={form.email} maxLength={254} autoComplete="email" placeholder="you@example.com" onChange={(event) => update("email", event.target.value)} />
            </label>
            <label><span className="student-account-label">Phone number <small>Optional</small></span>
              <input type="tel" value={form.phone} maxLength={40} autoComplete="tel" placeholder="Your contact number" onChange={(event) => update("phone", event.target.value)} />
            </label>
            <label><span className="student-account-label">College or university <small>Optional</small></span>
              <input type="text" value={form.college} maxLength={160} autoComplete="organization" placeholder="Your institution" onChange={(event) => update("college", event.target.value)} />
            </label>
            <label><span className="student-account-label">Degree or course <small>Optional</small></span>
              <input type="text" value={form.degree} maxLength={120} placeholder="e.g. B.Tech in Computer Science" onChange={(event) => update("degree", event.target.value)} />
            </label>
            <label><span className="student-account-label">Expected graduation year <small>Optional</small></span>
              <input type="number" value={form.graduationYear} min="2000" max="2100" inputMode="numeric" placeholder="2027" onChange={(event) => update("graduationYear", event.target.value)} />
            </label>
            <label>Career goal
              <select value={form.career} onChange={(event) => update("career", event.target.value)}>
                {careerOptions.map((career) => <option key={career} value={career}>{career}</option>)}
              </select>
            </label>
            <label>Daily study goal
              <select value={form.studyHours} onChange={(event) => update("studyHours", event.target.value)}>
                <option value="1">1 hour</option><option value="2">2 hours</option><option value="3">3 hours</option><option value="4">4 or more hours</option>
              </select>
            </label>
            <label>Appearance
              <select value={form.theme || "light"} onChange={(event) => update("theme", event.target.value)}>
                <option value="light">Light mode</option><option value="dark">Dark mode</option>
              </select>
            </label>
          </div>
        </section>

        <p className="student-account-privacy">Your account details and profile photo are stored in this browser only. They are not uploaded to a CareerCraft account.</p>
        <button className="career-tools-button student-account-save" type="submit" disabled={photoLoading}><Save size={18} /> Save student account</button>
        {error && <p className="student-account-error" role="alert">{error}</p>}
        {message && <p className="career-tools-success" role="status"><CheckCircle2 size={17} /> {message}</p>}
      </form>
    </div>
  );
}
