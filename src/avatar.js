const COLORS = ["#3654D8", "#DD5B45", "#2E9E6B", "#B3742E", "#7C4DB0", "#2E8FB0"];

function hashSeed(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

export function colorFor(seed) {
  if (!seed) return "#9BA0AF";
  return COLORS[hashSeed(seed) % COLORS.length];
}

export function initialsAvatar(name) {
  const letter = (name || "?").trim().slice(0, 1).toUpperCase() || "?";
  const color = colorFor(name || "?");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="20" fill="${color}"/><text x="20" y="26" font-family="Work Sans,sans-serif" font-size="16" fill="#fff" text-anchor="middle">${letter}</text></svg>`;
  return "data:image/svg+xml;base64," + btoa(svg);
}
