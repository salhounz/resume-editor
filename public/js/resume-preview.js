export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function uniqueJoin(values, separator) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))].join(separator);
}

export function resumeMarkup(resume) {
  return `
    <header class="resume-header">
      <h2>${escapeHtml(resume.name)}</h2>
      <div class="resume-title">${escapeHtml(resume.title)}</div>
      <div class="contact-line">${escapeHtml(resume.contactLine)}</div>
    </header>
    <section class="resume-section">
      <h3>Profile</h3>
      <p class="summary">${escapeHtml(resume.profile)}</p>
    </section>
    ${renderWork(resume.work)}
    ${renderEducationAndCertifications(resume.education, resume.certifications)}
    ${renderListSection("Honors & Awards", resume.honors)}
    ${renderListSection("Skills", resume.skills)}
  `;
}

function companyKey(job) {
  return String(job.company || "Independent Experience").trim().toLowerCase();
}

export function groupWorkByCompany(work) {
  const groups = [];
  work.forEach((job) => {
    const group = groups.at(-1);
    const sameCompany = group && companyKey({ company: group.company }) === companyKey(job);
    const sameLocation = group && uniqueJoin(group.locations, " / ") === (job.location || "");
    if (!sameCompany || !sameLocation) {
      groups.push({
        company: job.company || "Independent Experience",
        locations: job.location ? [job.location] : [],
        jobs: [],
      });
    }
    const activeGroup = groups.at(-1);
    if (job.location && !activeGroup.locations.includes(job.location)) activeGroup.locations.push(job.location);
    activeGroup.jobs.push(job);
  });

  return groups;
}

function renderWork(work) {
  if (!work.length) return "";
  const groups = groupWorkByCompany(work);
  return `
    <section class="resume-section">
      <h3>Work Experience</h3>
      ${groups
        .map(
          (group) => `
        <div class="company-group">
          <div class="company-heading">
            <span>${escapeHtml(group.company)}</span>
            <span class="entry-meta">${escapeHtml(group.locations.join(" / "))}</span>
          </div>
          ${group.jobs
            .map(
              (job) => `
            <div class="entry stacked-role">
              <div class="entry-heading">
                <span>${escapeHtml(job.title)}</span>
                <span class="entry-meta">${escapeHtml(job.dates)}</span>
              </div>
              ${
                job.previousRolesText
                  ? `<div class="entry-subhead">${escapeHtml(`Previous Roles: ${job.previousRolesText}${job.previousRolesDates ? ` | ${job.previousRolesDates}` : ""}`)}</div>`
                  : ""
              }
              <ul>${job.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>
            </div>`
            )
            .join("")}
        </div>`
        )
        .join("")}
    </section>
  `;
}

function renderEducationAndCertifications(education, certifications) {
  if (!education.length && !certifications.length) return "";
  return `
    <section class="resume-section">
      <h3>Education & Certifications</h3>
      ${education
        .map(
          (item) => `
        <div class="entry">
          <div class="entry-heading">
            <span>${escapeHtml([item.degree, item.school, item.location].filter(Boolean).join(", "))}</span>
            <span class="entry-meta">${escapeHtml(item.dates)}</span>
          </div>
        </div>`
        )
        .join("")}
      ${certifications.map((item) => `<div class="entry"><div class="entry-heading"><span>${escapeHtml(item)}</span></div></div>`).join("")}
    </section>
  `;
}

function renderListSection(title, items) {
  if (!items.length) return "";
  const hasCategories = items.some((item) => item.includes(":"));
  return `
    <section class="resume-section">
      <h3>${title}</h3>
      ${
        hasCategories
          ? `<div class="category-list">${items.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>`
          : `<ul class="compact-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      }
    </section>
  `;
}

export function fitResumeToPage(element) {
  const fitClasses = ["fit-compact", "fit-condensed"];
  element.classList.remove(...fitClasses);

  for (const fitClass of fitClasses) {
    if (element.scrollHeight <= element.clientHeight + 1) break;
    element.classList.add(fitClass);
  }
}

export function onePageMetrics(element) {
  const overflow = Math.max(0, element.scrollHeight - element.clientHeight);
  return {
    fits: overflow <= 35,
    overflow,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  };
}
