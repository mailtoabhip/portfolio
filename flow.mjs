import puppeteer from "puppeteer-core";

const out = (n) =>
  `C:\\Users\\hp\\AppData\\Local\\Temp\\claude\\D--portfolio\\3e771bdb-555f-4943-ae82-1c5c93873c68\\scratchpad\\flow${n}.png`;

const browser = await puppeteer.launch({
  executablePath:
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 8000)); // intro + ignition

// 1. click the paper stack (dash, left of wheel)
await page.mouse.click(400, 510);
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: out(1) });
console.log("[1] clicked stack → index");

// 2. click the first index row (RESUME)
await page.mouse.click(640, 410);
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: out(2) });
console.log("[2] clicked first entry");

// 3. Esc back to index, Esc back to road
await page.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 500));
await page.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: out(3) });
console.log("[3] escaped back to the road");

await browser.close();
