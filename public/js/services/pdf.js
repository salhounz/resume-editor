import { groupWorkByCompany } from "../resume/renderer.js";

function pdfEscape(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function resumeFileBaseName(resume) {
  const name = String(resume?.name || "Candidate")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${name || "Candidate"}-Resume`;
}

function wrapText(text, maxChars) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function buildPdfLines(resume) {
  const lines = [];
  const add = (type, text = "") => lines.push({ type, text });
  add("name", resume.name);
  add("title", resume.title);
  add("contact", resume.contactLine);
  add("space");
  add("section", "Profile");
  wrapText(resume.profile, 104).forEach((line) => add("body", line));
  if (resume.work.length) {
    add("section", "Work Experience");
    groupWorkByCompany(resume.work).forEach((group, groupIndex) => {
      if (groupIndex) add("group-space");
      add("company", [group.company, group.locations.join(" / ")].filter(Boolean).join(", "));
      group.jobs.forEach((job) => {
        add("role", [job.title, job.dates].filter(Boolean).join(", "));
        if (job.previousRolesText) add("body", `Previous Roles: ${[job.previousRolesText, job.previousRolesDates].filter(Boolean).join(", ")}`);
        job.bullets.forEach((bullet) => wrapText(`- ${bullet}`, 101).forEach((line) => add("bullet", line)));
      });
    });
  }
  if (resume.education.length || resume.certifications.length) {
    add("section", "Education & Certifications");
    resume.education.forEach((item) => add("entry", [item.degree, item.school, item.location, item.dates].filter(Boolean).join(", ")));
    resume.certifications.forEach((item) => add("entry", item));
  }
  if (resume.honors.length) {
    add("section", "Honors & Awards");
    add("body", resume.honors.join("; "));
  }
  if (resume.skills.length) {
    add("section", "Skills");
    if (resume.skills.some((item) => item.includes(":"))) {
      resume.skills.forEach((item) => wrapText(item, 104).forEach((line) => add("body", line)));
    } else {
      add("body", resume.skills.join("; "));
    }
  }
  return lines;
}

export function createPdf(resume) {
  const width = 612;
  const height = 792;
  const marginX = 45;
  const topY = 754;
  const bottomY = 42;
  let y = topY;
  const commands = ["BT"];
  const lines = buildPdfLines(resume);
  const baseAdvance = {
    name: 18,
    title: 13,
    contact: 15,
    space: 5,
    section: 15,
    company: 11,
    role: 10.5,
    entry: 11,
    bullet: 10.5,
    body: 10.5,
    "group-space": 3,
  };
  const naturalHeight = lines.reduce((total, line) => total + (baseAdvance[line.type] || 5), 0);
  const spacingScale = Math.min(1.22, Math.max(1, (topY - bottomY) / Math.max(naturalHeight, 1)));
  const advance = (type) => (baseAdvance[type] || 5) * spacingScale;

  const write = (text, x, fontSize, font = "F1") => {
    commands.push(`/${font} ${fontSize} Tf`);
    commands.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfEscape(text)}) Tj`);
  };
  const center = (text, fontSize, font = "F1") => {
    const approxWidth = text.length * fontSize * 0.45;
    write(text, Math.max(marginX, (width - approxWidth) / 2), fontSize, font);
  };

  for (const line of lines) {
    if (y < 44) break;
    if (line.type === "name") {
      center(line.text, 18, "F2");
      y -= advance(line.type);
    } else if (line.type === "title") {
      center(line.text, 11, "F2");
      y -= advance(line.type);
    } else if (line.type === "contact") {
      center(line.text, 10);
      y -= advance(line.type);
    } else if (line.type === "section") {
      y -= 3 * spacingScale;
      write(line.text, marginX, 11, "F2");
      commands.push("ET");
      commands.push(`${marginX} ${y - 3} m ${width - marginX} ${y - 3} l S`);
      commands.push("BT");
      y -= advance(line.type) - 3 * spacingScale;
    } else if (line.type === "company") {
      write(line.text, marginX, 10.2, "F2");
      y -= advance(line.type);
    } else if (line.type === "role") {
      write(line.text, marginX + 16, 9.9, "F2");
      y -= advance(line.type);
    } else if (line.type === "entry") {
      write(line.text, marginX, 10.2, "F2");
      y -= advance(line.type);
    } else if (line.type === "bullet") {
      write(line.text, marginX + 36, 9.8);
      y -= advance(line.type);
    } else if (line.type === "body") {
      write(line.text, marginX, 9.9);
      y -= advance(line.type);
    } else {
      y -= advance(line.type);
    }
  }
  commands.push("ET");

  const stream = commands.join("\n");
  const title = resumeFileBaseName(resume);
  const subject = title;
  const keywords = [resume.title, ...resume.skills].filter(Boolean).join(", ");
  const creationDate = `D:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
  const info = [`<<`, `/Title (${pdfEscape(title)})`, `/Author (${pdfEscape(resume.name)})`, `/Subject (${pdfEscape(subject)})`, `/Keywords (${pdfEscape(keywords)})`, `/Creator (${pdfEscape("Resume Editor")})`, `/Producer (${pdfEscape("Resume Editor")})`, `/CreationDate (${creationDate})`, `>>`].join("\n");

  const objects = [
    `<< /Type /Catalog /Pages 2 0 R /Info 6 0 R >>`,
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 7 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>",
    info,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}
