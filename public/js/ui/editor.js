import { defaultResume } from "../config/default-resume.js";
import { escapeHtml, resumeMarkup } from "../resume/renderer.js";
import { fitResumeToPage, onePageMetrics } from "../resume/fit.js";
import { savePdfArtifact } from "../services/artifacts.js";
import { loadDraftData, saveDraftData } from "../services/storage.js";
import { createPdf, resumeFileBaseName } from "../services/pdf.js";
import { ResumeAgent } from "../resume/parser.js";


const agent = new ResumeAgent();
const profileInput = document.querySelector("#profileInput");
const nameInput = document.querySelector("#nameInput");
const headlineInput = document.querySelector("#headlineInput");
const locationInput = document.querySelector("#locationInput");
const emailInput = document.querySelector("#emailInput");
const phoneInput = document.querySelector("#phoneInput");
const socialInput = document.querySelector("#socialInput");
const profileSectionInput = document.querySelector("#profileSectionInput");
const experienceSectionInput = document.querySelector("#experienceSectionInput");
const educationSectionInput = document.querySelector("#educationSectionInput");
const certificationsSectionInput = document.querySelector("#certificationsSectionInput");
const honorsSectionInput = document.querySelector("#honorsSectionInput");
const skillsSectionInput = document.querySelector("#skillsSectionInput");
const resumeEl = document.querySelector("#resume");
const atsChecks = document.querySelector("#atsChecks");
const generateStatus = document.querySelector("#generateStatus");
const resolutionModal = document.querySelector("#resolutionModal");
const closeResolution = document.querySelector("#closeResolution");
const resolutionError = document.querySelector("#resolutionError");
const resolutionFindings = document.querySelector("#resolutionFindings");
const resolutionStatus = document.querySelector("#resolutionStatus");
const resolutionResume = document.querySelector("#resolutionResume");
const resolutionCutoff = document.querySelector("#resolutionCutoff");
const editResolution = document.querySelector("#editResolution");
const closeResolutionAction = document.querySelector("#closeResolutionAction");
const editorModal = document.querySelector("#editorModal");
const editorModalTitle = document.querySelector("#editorModalTitle");
const editorModalDescription = document.querySelector("#editorModalDescription");
const closeEditorModal = document.querySelector("#closeEditorModal");
const editorLaunchers = Array.from(document.querySelectorAll(".editor-launcher"));
const editorPanels = Array.from(document.querySelectorAll(".editor-pane"));
const startBuilding = document.querySelector("#startBuilding");
const guidedEditorActions = document.querySelector("#guidedEditorActions");
const guidedEditorStatus = document.querySelector("#guidedEditorStatus");
const guidedBack = document.querySelector("#guidedBack");
const guidedNext = document.querySelector("#guidedNext");
let currentResume = null;
let syncingSections = false;
let suppressOverflowModal = false;
let activeEditorLauncher = null;
let guidedMode = false;
let guidedStepIndex = 0;
const draftStorageKey = "resume-editor-draft-v3";

const guidedEditorSteps = [
  {
    target: "contactPanel",
    title: "Contact & Links",
    description: "Add your name, headline, location, email, phone, and primary link.",
  },
  {
    target: "profilePanel",
    title: "Profile",
    description: "Write the short summary that opens the resume.",
  },
  {
    target: "experiencePanel",
    title: "Work Experience",
    description: "Add grouped company experience, roles, dates, and bullets.",
  },
  {
    target: "educationPanel",
    title: "Education",
    description: "Add degree, school, and dates.",
  },
  {
    target: "certificationsPanel",
    title: "Certifications",
    description: "Add certifications and licenses if relevant.",
  },
  {
    target: "honorsPanel",
    title: "Honors & Awards",
    description: "Add awards, recognition, or skip if not needed.",
  },
  {
    target: "skillsPanel",
    title: "Skills",
    description: "Finish with grouped skills and keywords for ATS coverage.",
  },
];


function sanitizeContactField(value, type) {
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

function parseEditableProfileText(text) {
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

function workSectionTextLines(work) {
  return work.flatMap((job) => {
    const lines = [];
    lines.push([job.company, job.location].filter(Boolean).join(" - ") || job.company || job.location || job.title);
    lines.push([job.title, job.dates].filter(Boolean).join(" | "));
    if (job.previousRolesText) {
      lines.push(`Previous Roles: ${job.previousRolesText}${job.previousRolesDates ? ` | ${job.previousRolesDates}` : ""}`);
    }
    lines.push(...job.bullets);
    lines.push("");
    return lines;
  });
}

function editableTextFromResume(resume, contact = {}) {
  return [
    contact.name || resume.name || "",
    contact.headline || resume.title || "",
    contact.location || "",
    contact.email || "",
    contact.phone || "",
    contact.social || "",
    "",
    "Profile",
    resume.profile || "",
    "",
    "Experience",
    ...workSectionTextLines(resume.work || []),
    "Education",
    ...resume.education.flatMap((item) => [item.degree, item.school, item.dates, item.location, ""]),
    "Certifications",
    ...(resume.certifications.length ? [resume.certifications.join("\n")] : []),
    "",
    "Honors & Awards",
    ...(resume.honors.length ? [resume.honors.join("\n")] : []),
    "",
    "Skills",
    resume.skills.join("\n"),
  ]
    .filter((line, index, array) => line || (array[index - 1] && array[index + 1]))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildProfileTextFromSections() {
  return [
    nameInput.value.trim(),
    headlineInput.value.trim(),
    locationInput.value.trim(),
    emailInput.value.trim(),
    phoneInput.value.trim(),
    socialInput.value.trim(),
    "",
    "Profile",
    profileSectionInput.value.trim(),
    "",
    "Experience",
    experienceSectionInput.value.trim(),
    "",
    "Education",
    educationSectionInput.value.trim(),
    "",
    "Certifications",
    certificationsSectionInput.value.trim(),
    "",
    "Honors & Awards",
    honorsSectionInput.value.trim(),
    "",
    "Skills",
    skillsSectionInput.value.trim(),
  ]
    .filter((line, index, array) => line || (array[index - 1] && array[index + 1]))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function populateSectionsFromProfileText(text) {
  syncingSections = true;
  const parsed = parseEditableProfileText(text);
  nameInput.value = parsed.name;
  headlineInput.value = parsed.headline;
  locationInput.value = sanitizeContactField(parsed.location, "location");
  emailInput.value = sanitizeContactField(parsed.email, "email");
  phoneInput.value = sanitizeContactField(parsed.phone, "phone");
  socialInput.value = sanitizeContactField(parsed.social, "social");
  profileSectionInput.value = parsed.sections.profile;
  experienceSectionInput.value = parsed.sections.experience;
  educationSectionInput.value = parsed.sections.education;
  certificationsSectionInput.value = parsed.sections.certifications;
  honorsSectionInput.value = parsed.sections.honors;
  skillsSectionInput.value = parsed.sections.skills;
  profileInput.value = buildProfileTextFromSections();
  syncingSections = false;
}

function syncProfileTextFromSections() {
  if (syncingSections) return;
  syncingSections = true;
  profileInput.value = buildProfileTextFromSections();
  syncingSections = false;
}

function draftDataFromFields() {
  return {
    name: nameInput.value,
    headline: headlineInput.value,
    location: locationInput.value,
    email: emailInput.value,
    phone: phoneInput.value,
    social: socialInput.value,
    profile: profileSectionInput.value,
    experience: experienceSectionInput.value,
    education: educationSectionInput.value,
    certifications: certificationsSectionInput.value,
    honors: honorsSectionInput.value,
    skills: skillsSectionInput.value,
    source: profileInput.value,
  };
}

function saveDraft() {
  saveDraftData(draftStorageKey, draftDataFromFields());
}

function restoreDraft() {
  const draft = loadDraftData(draftStorageKey);
  if (!draft) return false;
    nameInput.value = draft.name || "";
    headlineInput.value = draft.headline || "";
    locationInput.value = draft.location || "";
    emailInput.value = draft.email || "";
    phoneInput.value = draft.phone || "";
    socialInput.value = draft.social || "";
    profileSectionInput.value = draft.profile || "";
    experienceSectionInput.value = draft.experience || "";
    educationSectionInput.value = draft.education || "";
    certificationsSectionInput.value = draft.certifications || "";
    honorsSectionInput.value = draft.honors || "";
    skillsSectionInput.value = draft.skills || "";
    profileInput.value = draft.source || buildProfileTextFromSections();
    syncProfileTextFromSections();
    return true;
}

function contactLineFromInputs() {
  return [
    sanitizeContactField(emailInput.value, "email"),
    sanitizeContactField(phoneInput.value, "phone"),
    sanitizeContactField(locationInput.value, "location"),
    sanitizeContactField(socialInput.value, "social"),
  ].filter(Boolean).join(" | ");
}

function renderResume(resume) {
  currentResume = resume;
  resumeEl.innerHTML = resumeMarkup(resume);
  fitResumeToPage(resumeEl);
  renderChecks(resume);
}


function renderChecks(resume) {
  const checks = [
    ["Single-column layout with standard headings", true],
    ["One-page letter layout with compact spacing", resumeEl.scrollHeight <= resumeEl.clientHeight + 35],
    ["Contact line includes email or phone", /@|\d{3}/.test(resume.contactLine)],
    ["Experience bullets are concise and text-based", resume.work.every((job) => job.bullets.length <= 7)],
    ["Skills are plain text, not graphics or ratings", resume.skills.length > 0],
  ];

  atsChecks.innerHTML = checks
    .map(([label, passed]) => `<li class="${passed ? "" : "warning"}">${passed ? "Pass" : "Review"}: ${label}</li>`)
    .join("");
}

function showModal(modal) {
  modal.hidden = false;
  modal.removeAttribute("hidden");
}

function hideModal(modal) {
  modal.hidden = true;
  modal.setAttribute("hidden", "");
}

function openEditorModal(target, title, description, launcher) {
  const panel = editorPanels.find((item) => item.dataset.editorPanel === target);
  if (!panel) return;

  editorPanels.forEach((item) => item.classList.toggle("active", item === panel));
  editorModalTitle.textContent = title;
  editorModalDescription.textContent = description;
  activeEditorLauncher = launcher || null;
  showModal(editorModal);

  const focusTarget = panel.querySelector("input, textarea, button, select");
  if (focusTarget) focusTarget.focus();
}

function updateGuidedEditorActions() {
  guidedEditorActions.hidden = !guidedMode;
  if (!guidedMode) return;

  const total = guidedEditorSteps.length;
  guidedEditorStatus.textContent = `Step ${guidedStepIndex + 1} of ${total}`;
  guidedBack.disabled = guidedStepIndex === 0;
  guidedNext.textContent = guidedStepIndex === total - 1 ? "Finish" : "Next";
}

function openGuidedEditorStep(index) {
  guidedMode = true;
  guidedStepIndex = Math.max(0, Math.min(index, guidedEditorSteps.length - 1));
  const step = guidedEditorSteps[guidedStepIndex];
  updateGuidedEditorActions();
  openEditorModal(step.target, step.title, step.description, startBuilding);
}

function openGuidedEditorTarget(target, launcher) {
  const stepIndex = guidedEditorSteps.findIndex((step) => step.target === target);
  if (stepIndex === -1) return false;
  guidedMode = true;
  guidedStepIndex = stepIndex;
  const step = guidedEditorSteps[guidedStepIndex];
  updateGuidedEditorActions();
  openEditorModal(step.target, step.title, step.description, launcher);
  return true;
}

function exitGuidedEditor() {
  guidedMode = false;
  guidedStepIndex = 0;
  updateGuidedEditorActions();
}

function persistEditorEdits() {
  syncProfileTextFromSections();
  saveDraft();
}

function closeEditor() {
  persistEditorEdits();
  exitGuidedEditor();
  hideModal(editorModal);
  editorPanels.forEach((item) => item.classList.remove("active"));
  if (activeEditorLauncher) activeEditorLauncher.focus();
  activeEditorLauncher = null;
  generate();
}

function renderResolutionPreview(resume) {
  resolutionResume.innerHTML = resumeMarkup(resume);
  const cutoffTop = resolutionResume.clientHeight;
  resolutionCutoff.style.top = `${cutoffTop}px`;
}

function openResolutionModal(metrics) {
  if (!currentResume || suppressOverflowModal) return;
  const overflowInches = (metrics.overflow / 96).toFixed(2);
  resolutionError.textContent = `The generated resume is ${metrics.overflow}px, about ${overflowInches}in, beyond the one-page printable area.`;
  resolutionFindings.innerHTML = [
    "Dashed red line marks where page one ends.",
    "Everything below that line spills onto page two.",
    "ATS checks stay red until the resume fits within one printable page.",
  ]
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  renderResolutionPreview(currentResume);
  resolutionStatus.textContent = "Close this preview and keep editing any section. Save again to re-check fit.";
  resolutionStatus.classList.add("warning");
  showModal(resolutionModal);
}

function generate() {
  syncProfileTextFromSections();
  if (!profileInput.value.trim()) {
    generateStatus.textContent = "Add resume content, then generate the resume.";
    generateStatus.classList.add("warning");
    profileInput.focus();
    return false;
  }
  currentResume = agent.create(profileInput.value);
  currentResume.contactLine = contactLineFromInputs();
  renderResume(currentResume);
  generateStatus.textContent = "";
  generateStatus.classList.remove("warning");
  const metrics = onePageMetrics(resumeEl);
  if (!metrics.fits) openResolutionModal(metrics);
  return true;
}



async function archiveCurrentResume(message, pdfBlob = createPdf(currentResume)) {
  try {
    generateStatus.textContent = "Saving PDF artifact...";
    generateStatus.classList.remove("warning");
    const artifact = await savePdfArtifact(pdfBlob, resumeFileBaseName(currentResume));
    generateStatus.textContent = message;
    return artifact;
  } catch (error) {
    generateStatus.textContent = error.message || "Unable to save PDF artifact.";
    generateStatus.classList.add("warning");
    return null;
  }
}

function openPrintPdfDialog() {
  if (!currentResume) generate();
  if (!currentResume) return;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");

  const printTitle = resumeFileBaseName(currentResume);
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(printTitle)}</title>
    <link rel="stylesheet" href="/css/resume.css" />
    <link rel="stylesheet" href="/css/app.css" />
    <link rel="stylesheet" href="/css/print.css" />
    <style>
      body { margin: 0; background: #fff; }
      .print-shell { display: flex; justify-content: center; padding: 0; }
      .resume-page { box-shadow: none; }
      @page { size: letter; margin: 0; }
    </style>
  </head>
  <body>
    <main class="print-shell">${resumeEl.outerHTML}</main>
  </body>
</html>`;

  iframe.srcdoc = html;
  document.body.appendChild(iframe);

  const cleanup = () => {
    iframe.remove();
    window.removeEventListener("focus", cleanup);
  };

  iframe.addEventListener("load", () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      cleanup();
      return;
    }
    window.addEventListener("focus", cleanup, { once: true });
    generateStatus.textContent = "Print dialog opened.";
    generateStatus.classList.remove("warning");
    frameWindow.focus();
    frameWindow.print();
  });
}

function downloadPdf() {
  if (!currentResume) generate();
  if (!currentResume) return;

  const blob = createPdf(currentResume);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${resumeFileBaseName(currentResume)}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  generateStatus.textContent = "PDF downloaded.";
  generateStatus.classList.remove("warning");
}

document.querySelector("#restoreDefault").addEventListener("click", () => {
  populateSectionsFromProfileText(defaultResume.profileText);
  saveDraft();
  generate();
});

document.querySelector("#saveResume").addEventListener("click", async () => {
  persistEditorEdits();
  if (generate()) await archiveCurrentResume("Resume saved.");
});
startBuilding.addEventListener("click", () => {
  openGuidedEditorStep(0);
});
document.querySelector("#downloadPdf").addEventListener("click", downloadPdf);
document.querySelector("#printResume").addEventListener("click", openPrintPdfDialog);
closeResolution.addEventListener("click", () => {
  hideModal(resolutionModal);
});
closeResolutionAction.addEventListener("click", () => {
  hideModal(resolutionModal);
});
editResolution.addEventListener("click", () => {
  hideModal(resolutionModal);
  openEditorModal("experiencePanel", "Work Experience", "Edit jobs, dates, previous roles, and bullets.", editResolution);
});
closeEditorModal.addEventListener("click", closeEditor);
guidedBack.addEventListener("click", (event) => {
  event.preventDefault();
  if (!guidedMode || guidedStepIndex === 0) return;
  persistEditorEdits();
  openGuidedEditorStep(guidedStepIndex - 1);
});
guidedNext.addEventListener("click", (event) => {
  event.preventDefault();
  if (!guidedMode) return;
  persistEditorEdits();
  if (guidedStepIndex < guidedEditorSteps.length - 1) {
    openGuidedEditorStep(guidedStepIndex + 1);
    return;
  }
  closeEditor();
});
editorModal.addEventListener("click", (event) => {
  if (event.target === editorModal) closeEditor();
});
resolutionModal.addEventListener("click", (event) => {
  if (event.target === resolutionModal) hideModal(resolutionModal);
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!editorModal.hidden) closeEditor();
  if (!resolutionModal.hidden) hideModal(resolutionModal);
});
editorLaunchers.forEach((launcher) => {
  launcher.addEventListener("click", () => {
    if (openGuidedEditorTarget(launcher.dataset.editorTarget, launcher)) return;
    exitGuidedEditor();
    openEditorModal(
      launcher.dataset.editorTarget,
      launcher.dataset.editorTitle || launcher.textContent.trim(),
      launcher.dataset.editorDescription || "",
      launcher
    );
  });
});
profileInput.addEventListener("input", () => {
  if (syncingSections) return;
  populateSectionsFromProfileText(profileInput.value);
  saveDraft();
});

[
  nameInput,
  headlineInput,
  locationInput,
  emailInput,
  phoneInput,
  socialInput,
  profileSectionInput,
  experienceSectionInput,
  educationSectionInput,
  certificationsSectionInput,
  honorsSectionInput,
  skillsSectionInput,
].forEach((field) => {
  field.addEventListener("input", () => {
    syncProfileTextFromSections();
    saveDraft();
  });
});

if (!restoreDraft()) populateSectionsFromProfileText(defaultResume.profileText);
updateGuidedEditorActions();
generate();
