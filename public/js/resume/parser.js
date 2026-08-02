const monthMap = new Map([
  ["jan", "01"],
  ["january", "01"],
  ["feb", "02"],
  ["february", "02"],
  ["mar", "03"],
  ["march", "03"],
  ["apr", "04"],
  ["april", "04"],
  ["may", "05"],
  ["jun", "06"],
  ["june", "06"],
  ["jul", "07"],
  ["july", "07"],
  ["aug", "08"],
  ["august", "08"],
  ["sep", "09"],
  ["sept", "09"],
  ["september", "09"],
  ["oct", "10"],
  ["october", "10"],
  ["nov", "11"],
  ["november", "11"],
  ["dec", "12"],
  ["december", "12"],
]);

export class ResumeAgent {
  create(profileText) {
    const lines = this.cleanLines(profileText);
    const sections = this.splitSections(lines);
    const contact = this.extractContact(lines);
    const resume = {
      name: contact.name,
      title: contact.title || "Professional",
      contactLine: this.contactLine(contact),
      profile: this.buildProfile(sections.about, contact.title),
      work: this.extractExperience(sections.experience),
      education: this.extractEducation(sections.education),
      certifications: this.extractList(sections.certifications),
      honors: this.extractList(sections.honors),
      languages: this.extractList(sections.languages),
      skills: this.extractList(sections.skills),
    };

    return resume;
  }

  cleanLines(text) {
    return text
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  splitSections(lines) {
    const aliases = {
      about: ["about", "summary", "profile"],
      experience: ["experience", "work experience", "employment"],
      education: ["education"],
      certifications: ["certifications", "certification", "licenses & certifications", "licenses and certifications"],
      honors: ["honors", "honors & awards", "honors and awards", "awards"],
      skills: ["skills", "top skills"],
      languages: ["languages"],
    };
    const result = { about: [], experience: [], education: [], certifications: [], honors: [], skills: [], languages: [] };
    let active = "";

    for (const line of lines) {
      const key = Object.keys(aliases).find((name) => aliases[name].includes(line.toLowerCase()));
      if (key) {
        active = key;
        continue;
      }
      if (active) result[active].push(line);
    }
    return result;
  }

  extractContact(lines) {
    const email = lines.find((line) => /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(line)) || "";
    const phone = lines.find((line) => /(\+?\d[\d\s().-]{7,}\d)/.test(line)) || "";
    const social = lines.find((line) => /^https?:\/\//i.test(line)) || "";
    const name = lines.find((line) => !line.includes("@") && !/^\(?\+?\d/.test(line) && !this.isSection(line)) || "Resume Candidate";
    const title = lines[1] && !this.isSection(lines[1]) && lines[1] !== name ? lines[1] : "";
    const location = lines.find((line) => /,/.test(line) && !line.includes("@") && !/\d{4}/.test(line)) || "";

    return { name, title, email, phone, location, social };
  }

  isSection(line) {
    return /^(about|summary|profile|experience|work experience|education|certifications|certification|licenses & certifications|licenses and certifications|honors|honors & awards|honors and awards|awards|skills|languages)$/i.test(line);
  }

  contactLine(contact) {
    return [contact.email, contact.phone, contact.location, contact.social].filter(Boolean).join(" | ");
  }

  buildProfile(aboutLines, role) {
    const text = aboutLines.join(" ").replace(/\s+/g, " ").trim();
    if (text) return text;
    return `Results-driven ${role || "professional"} with experience translating business needs into measurable outcomes. Known for analytical problem solving, clear communication, and dependable execution across cross-functional teams.`;
  }

  extractExperience(lines) {
    const grouped = this.extractGroupedExperience(lines);
    if (grouped.length) return grouped;
    return this.extractLegacyExperience(lines);
  }

  extractGroupedExperience(lines) {
    const entries = [];
    let i = 0;

    while (i < lines.length) {
      const companyInfo = this.parseCompanyLocationLine(lines[i]);
      const roleInfo = this.parseRoleDateLine(lines[i + 1] || "");
      if (!companyInfo || !roleInfo) {
        i += 1;
        continue;
      }

      const entry = {
        title: roleInfo.title || "Role",
        company: companyInfo.company,
        dates: roleInfo.dates,
        location: companyInfo.location,
        previousRolesText: "",
        previousRolesDates: "",
        bullets: [],
      };

      i += 2;

      while (i < lines.length) {
        const line = lines[i];
        const nextCompanyInfo = this.parseCompanyLocationLine(line);
        const nextRoleInfo = this.parseRoleDateLine(lines[i + 1] || "");
        if (nextCompanyInfo && nextRoleInfo) break;

        const previousRoles = this.parsePreviousRolesLine(line);
        if (previousRoles) {
          entry.previousRolesText = previousRoles.text;
          entry.previousRolesDates = previousRoles.dates;
          i += 1;
          continue;
        }

        if (line) entry.bullets.push(this.polishBullet(line));
        i += 1;
      }

      if (!entry.bullets.length) {
        entry.bullets.push(`Contributed to ${entry.title || "role"} responsibilities at ${entry.company || "the organization"}.`);
      }
      entries.push(entry);
    }

    return entries;
  }

  extractLegacyExperience(lines) {
    const entries = [];
    let current = null;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const next = lines[i + 1] || "";
      const currentDate = this.parseDateRange(line);
      const nextDate = this.parseDateRange(next);

      if ((currentDate || nextDate) && i >= 1) {
        if (current) entries.push(current);
        current = {
          title: currentDate ? lines[i - 2] || "Role" : lines[i - 1] || "Role",
          company: currentDate ? lines[i - 1] || "" : line,
          dates: currentDate || nextDate,
          location: "",
          previousRolesText: "",
          previousRolesDates: "",
          bullets: [],
        };
        if (!currentDate) i += 1;
        continue;
      }

      if (current && !current.location && !this.looksLikeBullet(line) && !this.parseDateRange(line)) {
        current.location = line;
        continue;
      }

      if (current && !this.parseDateRange(line)) current.bullets.push(this.polishBullet(line));
    }

    if (current) entries.push(current);
    return entries.length ? entries : this.fallbackExperience(lines);
  }

  parseCompanyLocationLine(line) {
    const normalized = String(line || "").trim().replace(/[\u2013\u2014]/g, "-");
    const match = normalized.match(/^(.+?)\s+-\s+(.+)$/);
    if (!match) return null;
    return { company: match[1].trim(), location: match[2].trim() };
  }

  parseRoleDateLine(line) {
    const match = String(line || "").trim().match(/^(.+?)\s+\|\s+(.+)$/);
    if (!match) return null;
    const dates = this.parseDateRange(match[2].trim());
    if (!dates) return null;
    return { title: match[1].trim(), dates };
  }

  parsePreviousRolesLine(line) {
    const match = String(line || "").trim().match(/^Previous Roles:\s*(.+?)(?:\s+\|\s+(.+))?$/i);
    if (!match) return null;
    return {
      text: match[1].trim(),
      dates: this.parseDateRange((match[2] || "").trim()) || "",
    };
  }

  fallbackExperience(lines) {
    if (!lines.length) return [];
    return [
      {
        title: "Professional Experience",
        company: "",
        dates: "",
        location: "",
        previousRolesText: "",
        previousRolesDates: "",
        bullets: lines.map((line) => this.polishBullet(line)),
      },
    ];
  }

  extractEducation(lines) {
    const entries = [];
    for (let i = 0; i < lines.length; i += 1) {
      const degree = lines[i];
      const school = lines[i + 1] || "";
      const dateIndex = [i + 2, i + 3].find((index) => this.parseDateRange(lines[index] || ""));
      if (school && dateIndex) {
        entries.push({
          degree,
          school,
          dates: this.parseDateRange(lines[dateIndex]),
          location: this.isEducationBoundary(lines[dateIndex + 1] || "") ? "" : lines[dateIndex + 1] || "",
        });
        i = this.isEducationBoundary(lines[dateIndex + 1] || "") ? dateIndex : dateIndex + 1;
      } else if (degree && school && !this.isSection(degree) && !this.isSection(school)) {
        entries.push({ degree, school, dates: "", location: "" });
        i += 1;
      }
    }
    return entries;
  }

  extractList(lines) {
    const hasCategories = lines.some((line) => line.includes(":"));
    if (hasCategories) return lines.map((line) => line.trim()).filter(Boolean);
    return lines.flatMap((line) => (line.includes(",") && /\d{4}/.test(line) ? [line] : line.split(/[,;|]/))).map((item) => item.trim()).filter(Boolean);
  }

  isEducationBoundary(line) {
    return /degree|certificate|certification|university|college|school|institute|bachelor|master|associate|doctor|science|arts/i.test(String(line));
  }


  parseDateRange(text) {
    const normalized = String(text).trim();
    if (/^Y{4}$/i.test(normalized)) return "YYYY";
    if (/^(19|20)\d{2}$/.test(normalized)) return normalized;
    if (/^(0[1-9]|1[0-2])\/((19|20)\d{2}|YYYY)$/i.test(normalized)) return normalized;
    if (/^(0[1-9]|1[0-2])\/(19|20)\d{2}\s*[-\u2013]\s*((0[1-9]|1[0-2])\/(19|20)\d{2}|Present|Current)$/i.test(normalized)) {
      return normalized.replace(/\s*[-\u2013]\s*/g, " - ").replace(/current/i, "Present");
    }
    const match = normalized.match(/([A-Za-z]{3,9})\s+(\d{4})\s*[-\u2013]\s*(([A-Za-z]{3,9})\s+)?(\d{4}|present|current)/i);
    if (!match) return "";
    const start = `${monthMap.get(match[1].toLowerCase()) || "01"}/${match[2]}`;
    const end = /present|current/i.test(match[5])
      ? "Present"
      : `${monthMap.get((match[4] || "jan").toLowerCase()) || "01"}/${match[5]}`;
    return `${start} - ${end}`;
  }

  looksLikeBullet(line) {
    return /^(built|completed|created|expanded|led|managed|provided|identified|defined|developed|implemented|collaborated|instrumental|mentor|mentored|contributed|problem|effectively|improved|increased|reduced|delivered|designed|owned|owns|promoted|supported|maintained|optimized|automated|launched|started|established)/i.test(line);
  }

  polishBullet(line) {
    const clean = line.replace(/^[\u2022*-]\s*/, "").replace(/\.$/, "");
    return `${clean}.`;
  }

  trimSentence(text, maxWords) {
    const words = text.split(/\s+/).slice(0, maxWords);
    const result = words.join(" ").replace(/[,:;]$/, "");
    return /[.!?]$/.test(result) ? result : `${result}.`;
  }
}
