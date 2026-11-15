import fs from "node:fs";

const css = fs.readFileSync("frontend/src/styles/tokens.css", "utf8");
const token = (name: string, fallback: string) => css.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1] ?? fallback;
const hex = (value: string) => value.slice(1).match(/.{2}/g)!.map((part) => parseInt(part, 16) / 255);
const linear = (value: number) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
const luminance = (value: string) => {
  const [r, g, b] = hex(value).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (foreground: string, background: string) => {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

const pairs = [
  ["--text", "--surface", 4.5],
  ["--text-2", "--surface", 7],
  ["--muted", "--surface", 4.5],
  ["--brand", "--bg", 4.5],
];
let failed = false;
for (const [foregroundName, backgroundName, minimum] of pairs) {
  const foreground = token(foregroundName, "#000000");
  const background = token(backgroundName, "#ffffff");
  const actual = ratio(foreground, background);
  console.log(`${foregroundName} on ${backgroundName}: ${actual.toFixed(2)}:1 (minimum ${minimum}:1)`);
  if (actual < minimum) failed = true;
}
if (failed) process.exit(1);
console.log("Contrast check: PASS");
