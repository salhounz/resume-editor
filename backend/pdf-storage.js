const fs = require('fs/promises');
const path = require('path');

function sanitizePdfBaseName(value) {
  const safeName = String(value || 'Candidate-Resume')
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return safeName || 'Candidate-Resume';
}

async function saveVersionedPdf(savedResumesDirectory, baseName, pdfBuffer) {
  await fs.mkdir(savedResumesDirectory, { recursive: true });
  const safeBaseName = sanitizePdfBaseName(baseName);

  for (let version = 1; version < Number.MAX_SAFE_INTEGER; version += 1) {
    const filename = `${safeBaseName}-V${version}.pdf`;
    const pdfPath = path.join(savedResumesDirectory, filename);
    try {
      await fs.writeFile(pdfPath, pdfBuffer, { flag: 'wx' });
      return filename;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }

  throw new Error('Unable to assign an PDF version.');
}

module.exports = { sanitizePdfBaseName, saveVersionedPdf };
