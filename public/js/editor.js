import { escapeHtml, resumeMarkup, fitResumeToPage, onePageMetrics } from "./resume-preview.js";
import { saveResumePdf } from "./resume-api.js";
import { loadDraftData, saveDraftData } from "./draft-storage.js";
import { createPdf, resumeFileBaseName, downloadResumePdf, printResumePdf } from "./resume-pdf.js";
import { ResumeParser } from "./resume-parser.js";
import { sanitizeContactField, parseEditableProfileText, buildProfileText } from "./resume-text.js";

export function initializeEditor(defaultResume) {
  const parser = new ResumeParser();
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

  function buildProfileTextFromSections() {
    return buildProfileText(draftDataFromFields());
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
    if (!currentResume) return;
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
    currentResume = parser.create(profileInput.value);
    currentResume.contactLine = contactLineFromInputs();
    renderResume(currentResume);
    generateStatus.textContent = "";
    generateStatus.classList.remove("warning");
    const metrics = onePageMetrics(resumeEl);
    if (!metrics.fits) openResolutionModal(metrics);
    return true;
  }

  async function saveCurrentResumePdf(message, pdfBlob = createPdf(currentResume)) {
    try {
      generateStatus.textContent = "Saving resume PDF...";
      generateStatus.classList.remove("warning");
      const savedResume = await saveResumePdf(pdfBlob, resumeFileBaseName(currentResume));
      generateStatus.textContent = message;
      return savedResume;
    } catch (error) {
      generateStatus.textContent = error.message || "Unable to save resume PDF.";
      generateStatus.classList.add("warning");
      return null;
    }
  }

  document.querySelector("#restoreDefault").addEventListener("click", () => {
    populateSectionsFromProfileText(buildProfileText(defaultResume));
    saveDraft();
    generate();
  });

  document.querySelector("#saveResume").addEventListener("click", async () => {
    persistEditorEdits();
    if (generate()) await saveCurrentResumePdf("Resume saved.");
  });
  startBuilding.addEventListener("click", () => {
    openGuidedEditorStep(0);
  });
  document.querySelector("#downloadPdf").addEventListener("click", () => {
    if (!generate()) return;
    downloadResumePdf(currentResume);
    generateStatus.textContent = "PDF downloaded.";
    generateStatus.classList.remove("warning");
  });
  document.querySelector("#printResume").addEventListener("click", () => {
    if (!generate()) return;
    printResumePdf(currentResume, resumeEl, () => {
      generateStatus.textContent = "Print dialog opened.";
      generateStatus.classList.remove("warning");
    });
  });
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

  if (!restoreDraft()) populateSectionsFromProfileText(buildProfileText(defaultResume));
  updateGuidedEditorActions();
  generate();
}
