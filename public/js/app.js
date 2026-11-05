import { initializeEditor } from "./editor.js";

async function startApp() {
  const response = await fetch("/data/default-resume.json", { cache: "no-cache" });
  if (!response.ok) throw new Error("Unable to load the default resume. Refresh to try again.");

  const defaultResume = await response.json();
  const fields = [
    "name", "headline", "location", "email", "phone", "social",
    "profile", "experience", "education", "certifications", "honors", "skills",
  ];
  if (!defaultResume || fields.some((field) => typeof defaultResume[field] !== "string")) {
    throw new Error("The default resume must contain text for each contact and section field.");
  }

  initializeEditor(defaultResume);
}

startApp().catch((error) => {
  console.error("Unable to start Resume Editor:", error);
  const status = document.querySelector("#generateStatus");
  status.textContent = error.message || "Unable to start the editor. Refresh to try again.";
  status.classList.add("warning");
  document.querySelectorAll("button, input, textarea").forEach((control) => {
    control.disabled = true;
  });
});
