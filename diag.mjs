import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath:
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: true,
  args: ["--use-angle=default"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });

page.on("console", (msg) => {
  const t = msg.type();
  if (t === "error" || t === "warning") console.log(`[console.${t}]`, msg.text());
});
page.on("pageerror", (err) => console.log("[pageerror]", err.message));
page.on("requestfailed", (req) =>
  console.log("[requestfailed]", req.url(), req.failure()?.errorText)
);

await page.goto("http://localhost:3000", { waitUntil: "networkidle2", timeout: 30000 });
// let the name card play out + ignition
await new Promise((r) => setTimeout(r, 8000));
await page.screenshot({ path: process.argv[2] ?? "shot.png" });
console.log("[done] screenshot saved");
await browser.close();
