export function validateCareerMentorRequest(body, careerChoices) {
  const { profile, messages, memory } = body || {};
  const validMemory = memory === undefined || (
    memory && memory.approved === true &&
    typeof memory.education === "string" && memory.education.length <= 500 &&
    typeof memory.skills === "string" && memory.skills.length <= 1200 &&
    typeof memory.interests === "string" && memory.interests.length <= 600 &&
    typeof memory.learningMethod === "string" && memory.learningMethod.length <= 300
  );

  return Boolean(
    profile && typeof profile === "object" &&
    typeof profile.name === "string" && profile.name.trim().length > 0 && profile.name.length <= 100 &&
    typeof profile.career === "string" && careerChoices.includes(profile.career) &&
    ["1", "2", "3", "4"].includes(profile.studyHours) &&
    validMemory &&
    Array.isArray(messages) && messages.length >= 1 && messages.length <= 16 &&
    messages.every((message) => ["user", "assistant"].includes(message?.role) && typeof message.content === "string" && message.content.trim().length > 0 && message.content.length <= 3000) &&
    messages[messages.length - 1]?.role === "user" &&
    messages.reduce((total, message) => total + message.content.length, 0) <= 36000
  );
}
