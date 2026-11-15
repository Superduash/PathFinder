import fs from "node:fs";
const css = fs.readFileSync("frontend/src/styles/tokens.css", "utf8");
const token = (name) => css.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];
const luminance = (value) => {
  const channels = value.slice(1).match(/.{2}/g).map((part) => parseInt(part, 16) / 255).map((part) => part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};
const ratio = (foreground, background) => {
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
const pairs = [["--text", "--surface", 4.5], ["--text-2", "--surface", 7], ["--muted", "--surface", 4.5], ["--brand", "--bg", 4.5]];
let failed = false;
for (const [foregroundName, backgroundName, minimum] of pairs) {
  const actual = ratio(token(foregroundName), token(backgroundName));
  console.log(`${foregroundName} on ${backgroundName}: ${actual.toFixed(2)}:1 (minimum ${minimum}:1)`);
  if (actual < minimum) failed = true;
}
if (failed) process.exit(1);
console.log("Contrast check: PASS");
