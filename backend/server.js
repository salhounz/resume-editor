const path = require('path');
const express = require('express');
const { saveVersionedPdf } = require('./pdf-storage');

const app = express();
const PORT = process.env.PORT || 3000;
const publicDirectory = path.join(__dirname, '..', 'public');
const savedResumesDirectory = path.join(__dirname, '..', 'saved-resumes');

app.post('/api/resumes', express.raw({ type: 'application/pdf', limit: '10mb' }), async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    res.status(400).json({ error: 'A PDF body is required.' });
    return;
  }

  try {
    const filename = await saveVersionedPdf(savedResumesDirectory, req.get('x-resume-name'), req.body);
    res.status(201).json({ filename, url: `/saved-resumes/${encodeURIComponent(filename)}` });
  } catch (error) {
    console.error('Unable to save resume PDF:', error);
    res.status(500).json({ error: 'Unable to save resume PDF.' });
  }
});

app.use('/saved-resumes', express.static(savedResumesDirectory));
app.use(express.static(publicDirectory));

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDirectory, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Resume Editor is running at http://localhost:${PORT}`);
  console.log('Open that URL in your browser to use the app.');
});
