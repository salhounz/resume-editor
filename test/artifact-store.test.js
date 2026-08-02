const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { sanitizeArtifactBaseName, writeVersionedArtifact } = require('../src/artifact-store');

test('sanitizes artifact base names', () => {
  assert.equal(sanitizeArtifactBaseName('Candidate Name Resume.pdf'), 'Candidate-Name-Resume');
  assert.equal(sanitizeArtifactBaseName('../../unsafe'), 'unsafe');
});

test('increments artifact versions without overwriting', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'resume-editor-artifacts-'));
  try {
    const first = await writeVersionedArtifact(directory, 'Candidate-Name-Resume', Buffer.from('%PDF-first'));
    const second = await writeVersionedArtifact(directory, 'Candidate-Name-Resume', Buffer.from('%PDF-second'));

    assert.equal(first, 'Candidate-Name-Resume-V1.pdf');
    assert.equal(second, 'Candidate-Name-Resume-V2.pdf');
    assert.equal(await fs.readFile(path.join(directory, first), 'utf8'), '%PDF-first');
    assert.equal(await fs.readFile(path.join(directory, second), 'utf8'), '%PDF-second');
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
