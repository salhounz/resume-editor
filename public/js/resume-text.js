export function sanitizeContactField(value, type) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^previous roles:/i.test(text)) return "";
  if (/^\d{2}\/\d{4}\s*-\s*\d{2}\/\d{4}$/i.test(text)) return "";
  if (/^\d{4}\s*-\s*\d{4}$/i.test(text)) return "";

  if (type === "location") {
    if (text.includes("|")) return "";
    return text;
  }
  if (type === "email") return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text) ? text : "";
  if (type === "phone") return /(\+?\d[\d\s().-]{7,}\d)/.test(text) ? text : "";
  if (type === "social") return /^https?:\/\//i.test(text) ? text : "";
  return text;
}

export function parseEditableProfileText(text) {
  const lines = String(text).replace(/\r/g, "").split("\n");
  const sectionNames = ["Profile", "About", "Experience", "Work Experience", "Education", "Certifications", "Honors & Awards", "Honors", "Languages", "Skills"];
  const firstSectionIndex = lines.findIndex((line) => sectionNames.some((name) => name.toLowerCase() === line.trim().toLowerCase()));
  const topLines = (firstSectionIndex >= 0 ? lines.slice(0, firstSectionIndex) : lines).map((line) => line.trim()).filter(Boolean).slice(0, 6);
  const headerMetaLines = topLines.slice(2).filter((line) => {
    const lower = line.toLowerCase();
    return (
      !lower.startsWith("previous roles:") &&
      !line.includes("|") &&
      !/^\d{2}\/\d{4}\s*-\s*\d{2}\/\d{4}$/i.test(line) &&
      !/^\d{4}\s*-\s*\d{4}$/i.test(line)
    );
  });
  const sections = { profile: "", experience: "", education: "", certifications: "", honors: "", languages: "", skills: "" };
  let active = "";

  for (const rawLine of firstSectionIndex >= 0 ? lines.slice(firstSectionIndex) : []) {
    const line = rawLine.trim();
    const normalized = line.toLowerCase();
    if (normalized === "profile" || normalized === "about") {
      active = "profile";
      continue;
    }
    if (normalized === "experience" || normalized === "work experience") {
      active = "experience";
      continue;
    }
    if (normalized === "education") {
      active = "education";
      continue;
    }
    if (normalized === "certifications" || normalized === "certification" || normalized === "licenses & certifications" || normalized === "licenses and certifications") {
      active = "certifications";
      continue;
    }
    if (normalized === "honors" || normalized === "honors & awards" || normalized === "honors and awards" || normalized === "awards") {
      active = "honors";
      continue;
    }
    if (normalized === "languages") {
      active = "languages";
      continue;
    }
    if (normalized === "skills") {
      active = "skills";
      continue;
    }
    if (active) sections[active] += `${rawLine}\n`;
  }

  return {
    name: topLines[0] || "",
    headline: topLines[1] || "",
    location: sanitizeContactField(headerMetaLines.find((line) => line.includes(",")) || headerMetaLines[0] || "", "location"),
    email: sanitizeContactField(headerMetaLines.find((line) => /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(line)) || "", "email"),
    phone: sanitizeContactField(headerMetaLines.find((line) => /(\+?\d[\d\s().-]{7,}\d)/.test(line)) || "", "phone"),
    social: sanitizeContactField(headerMetaLines.find((line) => /^https?:\/\//i.test(line)) || "", "social"),
    sections: Object.fromEntries(Object.entries(sections).map(([key, value]) => [key, value.trim()])),
  };
}

export function buildProfileText(fields) {
  return [
    (fields.name || "").trim(),
    (fields.headline || "").trim(),
    (fields.location || "").trim(),
    (fields.email || "").trim(),
    (fields.phone || "").trim(),
    (fields.social || "").trim(),
    "",
    "Profile",
    (fields.profile || "").trim(),
    "",
    "Experience",
    (fields.experience || "").trim(),
    "",
    "Education",
    (fields.education || "").trim(),
    "",
    "Certifications",
    (fields.certifications || "").trim(),
    "",
    "Honors & Awards",
    (fields.honors || "").trim(),
    "",
    "Skills",
    (fields.skills || "").trim(),
  ]
    .filter((line, index, array) => line || (array[index - 1] && array[index + 1]))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
