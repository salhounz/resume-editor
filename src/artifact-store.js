const fs = require('fs/promises');
const path = require('path');

function sanitizeArtifactBaseName(value) {
  const safeName = String(value || 'Candidate-Resume')
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return safeName || 'Candidate-Resume';
}

async function writeVersionedArtifact(artifactsDirectory, baseName, pdfBuffer) {
  await fs.mkdir(artifactsDirectory, { recursive: true });
  const safeBaseName = sanitizeArtifactBaseName(baseName);

  for (let version = 1; version < Number.MAX_SAFE_INTEGER; version += 1) {
    const filename = `${safeBaseName}-V${version}.pdf`;
    const artifactPath = path.join(artifactsDirectory, filename);
    try {
      await fs.writeFile(artifactPath, pdfBuffer, { flag: 'wx' });
      return filename;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }

  throw new Error('Unable to assign an artifact version.');
}

module.exports = { sanitizeArtifactBaseName, writeVersionedArtifact };
