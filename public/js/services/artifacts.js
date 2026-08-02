export async function savePdfArtifact(pdfBlob, baseName) {
  const response = await fetch('/api/artifacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/pdf',
      'X-Resume-Name': baseName,
    },
    body: pdfBlob,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || 'Unable to save PDF artifact.');
  }
  return result;
}
