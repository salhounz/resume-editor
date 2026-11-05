export async function saveResumePdf(pdfBlob, baseName) {
  const response = await fetch('/api/resumes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/pdf',
      'X-Resume-Name': baseName,
    },
    body: pdfBlob,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || 'Unable to save resume PDF.');
  }
  return result;
}
