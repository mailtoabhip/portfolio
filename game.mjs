import puppeteer from "puppeteer-core";

const out = (n) =>
  `C:\\Users\\hp\\AppData\\Local\\Temp\\claude\\D--portfolio\\3e771bdb-555f-4943-ae82-1c5c93873c68\\scratchpad\\game${n}.png`;

const browser = await puppeteer.launch({
  executablePath:
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 8000)); // intro

await page.screenshot({ path: out(1) }); // idle with HUD

// Drive toward the stop: hold W, poll the HUD distance
await page.keyboard.down("w");
let dist = 999;
for (let i = 0; i < 120; i++) {
  await new Promise((r) => setTimeout(r, 250));
  dist = await page.evaluate(() => {
    const el = [...document.querySelectorAll("p")].find((p) =>
      p.textContent?.includes("m")
    );
    const m = el?.textContent?.match(/·\s*(\d+)m/);
    return m ? parseInt(m[1]) : 999;
  });
  if (dist < 42) break;
}
console.log("[drive] dist =", dist);
await page.screenshot({ path: out(2) }); // approaching the sign

// Brake!
await page.keyboard.up("w");
await page.keyboard.down("s");
await new Promise((r) => setTimeout(r, 4000));
await page.keyboard.up("s");
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: out(3) }); // should be the delivered entry

const opened = await page.evaluate(() =>
  document.body.innerText.includes("Delivered") ||
  document.body.innerText.includes("DELIVERED")
);
console.log("[result] delivered-entry open:", opened);

await browser.close();
