export function saveDraftData(key, draft) {
  try {
    localStorage.setItem(key, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function loadDraftData(key) {
  try {
    const draft = JSON.parse(localStorage.getItem(key) || 'null');
    return draft && typeof draft === 'object' ? draft : null;
  } catch {
    return null;
  }
}
