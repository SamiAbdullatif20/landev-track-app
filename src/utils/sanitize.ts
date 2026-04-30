export function sanitizeDisplayText(value: string): string {
  const filtered = [...value].filter((char) => {
    const code = char.charCodeAt(0);
    const isControl = (code >= 0 && code <= 31) || code === 127;
    return !isControl && char !== "<" && char !== ">";
  });
  return filtered.join("").trim().slice(0, 240);
}
