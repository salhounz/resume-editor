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
