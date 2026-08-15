import type { Destination } from "@/lib/store";

/**
 * Single content source for every waybill entry (§6.1).
 * One template renders all of these; adding a Delhivery case study
 * later = adding an entry with access: "password".
 *
 * Copy migrated from the Framer site screenshots (2026-07-07), with
 * the role corrected to Delhivery per the master plan.
 */

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "kv"; items: { k: string; v: string }[] };

export interface Entry {
  slug: Destination;
  kicker: string;
  title: string;
  meta?: string[];
  access: "public" | "password";
  blocks: Block[];
}

export const ENTRIES: Record<Destination, Entry> = {
  /* ================= RESUME ================= */
  manifest: {
    slug: "manifest",
    kicker: "The Manifest",
    title: "Abhijeet Purandare — Resume",
    meta: ["B2B Product Designer", "Delhivery", "Pune, India"],
    access: "public",
    blocks: [
      {
        type: "p",
        text: "B2B Product Designer at Delhivery — designing the products that move India's largest logistics network: dashboards, ops tools, and workflows that thousands of people depend on to move millions of shipments.",
      },
      {
        type: "kv",
        items: [
          { k: "Currently", v: "B2B Product Design @ Delhivery" },
          { k: "Previously", v: "ParallelHQ — enterprise & consumer products" },
          { k: "Experience", v: "3+ years across B2B and consumer UX" },
          { k: "Email", v: "abhijeet.designmail@gmail.com" },
        ],
      },
      { type: "h2", text: "I have worked with" },
      {
        type: "ul",
        items: [
          "GSK",
          "Pennsylvania Department of Health",
          "Cipla",
          "Parle",
          "CapShift",
          "TVS Motors (via ParallelHQ)",
        ],
      },
      {
        type: "p",
        text: "[PDF download coming — this page becomes the downloadable manifest.]",
      },
    ],
  },

  /* ================= DROP #01 — TVS ACCELERATOR ================= */
  "tvs-accelerator": {
    slug: "tvs-accelerator",
    kicker: "Drop #01 · Flagship",
    title: "Optimizing the Experience for TVSM Accelerator",
    meta: ["B2B web app", "TVS Motors dealerships", "4 UX · 1 BA · 1 PM"],
    access: "public",
    blocks: [
      {
        type: "p",
        text: "Transforming the enquiry management system for faster enquiries, seamless navigation, and a sales experience teams love.",
      },
      { type: "h2", text: "Revolutionizing dealership sales" },
      {
        type: "p",
        text: "Buying a vehicle isn't just about picking a model — it's a journey. From the moment a customer walks into a showroom to the time they ride out with their new vehicle, there's a lot happening behind the scenes. Sales executives are constantly juggling enquiries, test rides, bookings, and deliveries, making sure every step is smooth and seamless. That's where TVS Accelerator comes in.",
      },
      {
        type: "p",
        text: "TVS Accelerator is a B2B progressive web app designed by TVS Motors to streamline dealership operations. It acts as the digital backbone for sales teams — from handling customer enquiries to managing test rides and ensuring hassle-free vehicle deliveries. Essentially, a smart assistant for dealerships, keeping everything organized in one place so sales executives can focus on what matters most: selling better and serving customers faster.",
      },
      { type: "h2", text: "Who uses Accelerator (and why)?" },
      {
        type: "ul",
        items: [
          "Sales Executives (DSEs) — the friendly faces who greet you when you walk into a showroom. They log and manage customer enquiries, schedule and track test rides, and process bookings and deliveries.",
          "Branch Managers — the decision-makers ensuring everything runs smoothly: overseeing sales performance, tracking ongoing enquiries, test rides and bookings, and managing sales-executive and team performance.",
          "Dealer Owners — the big-picture strategists: a holistic view of sales and customer trends, performance across multiple dealerships, data-driven business decisions.",
        ],
      },
      { type: "h2", text: "Where it fits in the buying process" },
      {
        type: "p",
        text: "The vehicle-buying journey breaks into three stages — enquiry at the showroom, booking/financing/delivery, and post-sale servicing & loyalty. Accelerator plays a critical role in the Pre-Sales stage, acting as an Enquiry Management System that helps sales teams track, nurture, and convert potential buyers into actual customers.",
      },
      { type: "h2", text: "The team behind the experience" },
      {
        type: "p",
        text: "4 UX designers (simplifying the user experience), 1 business analyst (bridging user needs and business), 1 project manager — plus the development team. Together we set out to redefine how dealerships manage sales: reducing friction, improving efficiency, and making Accelerator a tool sales executives actually want to use.",
      },

      /* ---------- Sub-study 1: Research ---------- */
      { type: "h2", text: "Case study 1 — Uncovering Pain Points: research-driven UX" },
      {
        type: "quote",
        text: "“Real dealership challenges, real user insights — shaping a smarter, more efficient sales experience.”",
      },
      { type: "h3", text: "Working in agile" },
      {
        type: "p",
        text: "We followed an agile methodology, working in sprint cycles with a structured yet flexible approach: prioritizing high-impact features, addressing existing issues, and managing backlogs & ad-hoc requests. Each sprint: week 1 heavy design execution, week 2 presentation & feedback, then user testing in Pune & Bangalore dealerships — testing prototypes directly with sales executives to understand how new features fit their real-world workflow.",
      },
      { type: "h3", text: "Dealer visits" },
      {
        type: "p",
        text: "Stepping into the real world of dealerships was an eye-opener. We observed how sales executives currently use Accelerator, the challenges they face in their workflow, what frustrates them about the existing system, and what really matters to them when engaging with customers.",
      },
      { type: "h3", text: "What we discovered" },
      {
        type: "ul",
        items: [
          "Too many steps, not enough time — the enquiry process was too long and distracting while interacting with customers. Many jotted details on paper first and entered them into Accelerator later.",
          "Inconsistent usage & workarounds — some dealerships relied on Accelerator, many still used quotation books, registers, or Excel sheets.",
          "Need for quick, flexible enquiries — DSEs wanted a two-step process: capture basics quickly, fill the rest later without losing the enquiry.",
          "Visibility gaps & follow-ups — managers struggled with tracking enquiry status, follow-ups, and performance due to a lack of clear reports and filters.",
        ],
      },
      { type: "h3", text: "What users told us" },
      {
        type: "ul",
        items: [
          "Enquiry creation — a long, repetitive hassle: “Customers are in a hurry. It takes too long to enter details; they lose patience and walk away.” DSEs skipped or delayed entries, leading to missing and inconsistent data.",
          "Quotation process — stuck in the paper age: “Customers want a printed quote. If I can't give them one, they don't trust the price.” Physical quotes got lost, misplaced, or altered.",
          "Delivery checklists — the paper trail never ends: checklists got misplaced, and there was no record of what was checked before delivery.",
        ],
      },
      {
        type: "quote",
        text: "Branch Manager: slower enquiries, missed follow-ups, and sales execs avoiding Accelerator — exactly what we didn't want.",
      },
      {
        type: "p",
        text: "These insights directly shaped our next steps. We didn't just want to fix Accelerator — we wanted to redefine how sales executives interacted with it. Up next: three high-impact solutions.",
      },

      /* ---------- Sub-study 2: Enquiry 90% ---------- */
      { type: "h2", text: "Case study 2 — Cutting enquiry time by 90%" },
      {
        type: "quote",
        text: "“Entering enquiries takes too long — I end up noting details on paper first.”",
      },
      { type: "h3", text: "Why this feature was prioritized" },
      {
        type: "p",
        text: "One issue stood out loud and clear: the enquiry process was painfully slow, so DSEs avoided using Accelerator in real time — jotting details on paper, entering them later. That delayed the sales process and made data incomplete or missing. From the business side: lost opportunities (enquiries never logged in real time = missed follow-ups), inconsistent data (entered later, business teams couldn't get an accurate picture), and no way to measure true conversion from enquiry to booking.",
      },
      { type: "h3", text: "Our approach" },
      {
        type: "ul",
        items: [
          "Identify what's essential vs. what can wait — split the process: Step 1 captures just the essential details to log an enquiry; Step 2 fills in the rest when time allows.",
          "Optimize step 1 for speed — logging an enquiry must take under 10 seconds. Anything more and DSEs revert to manual workarounds.",
          "Minimize cognitive load — instead of overwhelming DSEs with too much information at once, a clear structured flow that guides them smoothly through both steps.",
          "Standardized data that helps managers make better decisions — enquiry status syncs with the rest of the system; incomplete enquiries intelligently prompt DSEs to finish them next time.",
        ],
      },
      { type: "h3", text: "Mapping the impact" },
      {
        type: "p",
        text: "We audited every touchpoint affected by the update so the ecosystem stayed seamless: create & complete enquiry forms, dashboards & filters, enquiry lists and cards, customer history, missed/today's tasks, notifications, and the follow-up flow.",
      },

      /* ---------- Sub-study 3: Digital quotations ---------- */
      { type: "h2", text: "Case study 3 — Transitioning to fully digital quotations (WIP)" },
      {
        type: "quote",
        text: "“Pricing changes, discounts vary. Paper quotes get lost. A one-time PDF won't work for years — we need something smarter.”",
      },
      { type: "h3", text: "The problem" },
      {
        type: "p",
        text: "Sales executives were still writing quotations manually instead of using the system. Manual work felt faster; the digital process wasn't integrated with their workflow. Customization was lacking — DSEs needed to adjust pricing, accessories, and offers, which wasn't fully supported. And customers trusted handwritten ones because they felt final and personal. For the business: no proper records meant no tracking or visibility, inconsistent pricing & discounts across customers, and lost leads with no automatic follow-ups.",
      },
      { type: "h3", text: "Our approach" },
      {
        type: "ul",
        items: [
          "Revisit the current process — map how DSEs access and generate quotations manually; identify the key friction points.",
          "Understand the purpose — analyze why quotations were needed, designing solutions that matched real dealership workflows instead of just digitizing.",
          "Fit it into Accelerator — the new quotation process seamlessly integrates into the existing app for a natural transition.",
          "Design the user flow — multiple journey options: refine how DSEs generate, send, and manage quotations within the app.",
          "Branch-manager controls — pricing varies across locations, so BMs can create, update, and manage quotations including pricing, discounts, and accessories.",
        ],
      },
      { type: "h3", text: "The solution (high-fidelity)" },
      {
        type: "ul",
        items: [
          "The DSE fills an enquiry and submits within seconds — every customer is logged.",
          "Receptionists can log customer data instantly; quotations are auto-sent.",
          "Customers can scan a QR code and self-register an enquiry.",
          "Once an enquiry is submitted, the system instantly sends the quotation.",
        ],
      },

      /* ---------- Dear Diary ---------- */
      { type: "h2", text: "Dear Diary — reflections from the road" },
      {
        type: "ul",
        items: [
          "Bridging the gap between business expectations and user needs was a challenge. Ensuring business constraints didn't dilute usability improvements required constant data-backed discussions.",
          "Every dealership operated differently. Standardizing workflows while keeping them flexible enough for on-ground realities was a balancing act.",
          "Introducing modern UX into an established system came with challenges — some features couldn't be built from scratch; we had to adapt within existing constraints while still making meaningful improvements.",
          "This project refined my skills in client communication, system thinking, and strategic UX decision-making. More importantly, it reinforced the importance of solving real-world problems, not just designing screens.",
        ],
      },
    ],
  },

  /* ================= DROP #02 — PA KIOSKS ================= */
  "pennsylvania-kiosks": {
    slug: "pennsylvania-kiosks",
    kicker: "Drop #02 · Civic",
    title: "Empowering Pennsylvanians with Accessible, Hassle-Free Kiosks",
    meta: ["Kiosk UX", "PA Department of Health", "Role: UX Designer"],
    access: "public",
    blocks: [
      {
        type: "p",
        text: "Enhancing the Department of Health's kiosks for smoother navigation, better usability, and faster birth-certificate requests for all.",
      },
      { type: "h2", text: "Hi there" },
      {
        type: "p",
        text: "This project felt especially personal: a few months back, I had my own frustrating experience trying to obtain a birth certificate online in India — it took forever, and I never got a proper update. So when the opportunity arose to improve a similar process for residents in Pennsylvania, I jumped at the chance to simplify, accelerate, and make it more accessible for everyone.",
      },
      {
        type: "p",
        text: "The Birth Certificate Kiosk is a walk-in service where users can request and generate their certificates without long queues or complicated paperwork. Our mission: shorter wait times, clear instructions, and an overall intuitive experience so people wouldn't have to endure what I did.",
      },
      { type: "h2", text: "The challenge" },
      {
        type: "ul",
        items: [
          "Reduce wait times at government offices",
          "Simplify the complex application process",
          "Minimize errors caused by unclear instructions",
        ],
      },
      { type: "h2", text: "Understanding the problem" },
      {
        type: "p",
        text: "Referencing 10 usability heuristics for UI design (NN/g), we audited the existing kiosk flows, ranked issues by severity, and identified 100+ issues. Key research insights:",
      },
      {
        type: "ul",
        items: [
          "Insufficient user guidance — unclear instructions, minimal tooltips, poor error messaging led to user hesitation; many abandoned the process midway due to confusion about verification steps.",
          "Suboptimal efficiency in the user journey — excessive typing and unnecessary repetition frustrated users; re-entering previously saved data felt cumbersome and time-consuming.",
          "Lack of real-time preview & confirmation — users wanted to preview the certificate before submitting; error correction was difficult with no intuitive way to edit details before finalizing.",
          "Inconsistent design elements — button placement, styling, and varied colors across screens caused confusion; no unified design system resulted in a disjointed experience.",
        ],
      },
      {
        type: "quote",
        text: "Impact: these issues resulted in longer transaction times, higher abandonment rates, and user frustration.",
      },
      { type: "h2", text: "Our approach" },
      {
        type: "ul",
        items: [
          "A simplified, guided application process — step-by-step flow eliminates guesswork; real-time error validation prevents mistakes before they compound; preview & confirmation screens let users verify details prior to submission.",
          "Accessibility & ease of use for all — larger fonts & high-contrast colors for better readability; simplified language to reduce cognitive load, especially for less tech-savvy users; multi-language support (English & Spanish) to serve Pennsylvania's diverse population.",
          "A faster, frictionless transaction — auto-fill & smart data retrieval minimize repetitive typing; streamlined payment integration with quick, intuitive steps; option to review & continue incomplete applications to reduce frustration and rework.",
          "Additional enhancements — standardized design components for a cohesive interface; shorter, optimized user journey to speed overall processing.",
        ],
      },
      { type: "h2", text: "Before vs. after" },
      {
        type: "ul",
        items: [
          "Old experience: lengthy unclear instructions, multiple verification steps causing confusion, high drop-off rates due to complex navigation.",
          "New experience: step-by-step guided process for clarity, reduced typing & redundant steps, real-time previews for error correction, significantly faster completion time.",
        ],
      },
    ],
  },

  /* ================= DROP #03 — UX AUDITS ================= */
  "tvs-ux-audit": {
    slug: "tvs-ux-audit",
    kicker: "Drop #03 · Audit",
    title: "Bridging the UX Gaps: UX Audit of TVS iQube & 3W Websites",
    meta: ["2 UX audits", "EV & three-wheeler sites"],
    access: "public",
    blocks: [
      {
        type: "p",
        text: "Identifying and solving usability issues to create a smoother digital ride — two audits across TVS's electric-scooter (iQube) and three-wheeler websites.",
      },
      { type: "h2", text: "The approach" },
      {
        type: "p",
        text: "[Full audit walkthroughs to be added — method, key findings, before/after. Share the audit page screenshots and I'll migrate them here.]",
      },
    ],
  },

  /* ================= DROP #04 — GADGET COMMERCE ================= */
  "gadget-commerce": {
    slug: "gadget-commerce",
    kicker: "Drop #04 · Sprint",
    title: "A Smarter, Faster Way To Shop Electronic Gadgets Online",
    meta: ["E-commerce", "48 hours", "Take-home assignment"],
    access: "public",
    blocks: [
      {
        type: "p",
        text: "A take-home design assignment completed in 48 hours — from brief to finished flows, start to end.",
      },
      { type: "h2", text: "The sprint" },
      {
        type: "p",
        text: "[Full sprint story to be added — brief, decisions under time pressure, final screens. Share the page screenshot and I'll migrate it here.]",
      },
    ],
  },

  /* ================= ABOUT ================= */
  about: {
    slug: "about",
    kicker: "Locate: Abhijeet",
    title: "Hey, I'm Abhijeet Purandare! 👋",
    meta: ["Pune", "Chai-powered", "Short films someday"],
    access: "public",
    blocks: [
      {
        type: "p",
        text: "A Pune-based designer shaping seamless digital experiences for people. Over the past three years, I've dived deep into the world of UX, crafting intuitive and impactful designs that make people's lives easier. But hey — I'm not just about wireframes and pixels. I believe great design is about understanding people, solving real problems, and making things flow naturally.",
      },
      {
        type: "p",
        text: "Today I do that for Delhivery, designing B2B products for India's biggest logistics network: dashboards, ops tools, and workflows that thousands of people depend on to move millions of shipments.",
      },
      { type: "h2", text: "How it all started 🎨 → 💻" },
      {
        type: "p",
        text: "My design journey kicked off in college with logo design, graphic art, and a little bit of coding (yes, I once thought I'd be a developer!). But then I discovered UX, and everything clicked — design wasn't just about visuals; it was about making interactions feel effortless. I quickly realized the difference between designing for usability and designing for marketing, and that shift completely changed how I approached problem-solving. Since then, I've been on a constant learning spree, growing my design intuition every day.",
      },
      { type: "h2", text: "What I believe in 🏆" },
      {
        type: "quote",
        text: "Design should be invisible — if users have to think too much, something's off. Every interaction should feel like second nature: no unnecessary clicks, no guesswork. Collaboration makes magic happen — great design isn't built in isolation, it's a team effort.",
      },
      { type: "h2", text: "Working with me 🤝" },
      {
        type: "ul",
        items: [
          "I love challenges.",
          "I encourage and enjoy open discussions.",
          "I see UX as a way to elevate business and product.",
          "I enjoy exchanging quick feedback & A/B testing to refine the best ideas.",
          "You'll see me taking on responsibilities beyond UX — mentoring designers, managing projects, even playing scrum master when needed.",
          "You'll witness me explaining ideas effortlessly, whether to a 5-year-old or a 70-year-old.",
        ],
      },
      { type: "h2", text: "Beyond work — the human side 🌏" },
      {
        type: "p",
        text: "When I'm not deep in ideating something, you'll find me:",
      },
      {
        type: "ul",
        items: [
          "Clicking photos & editing videos 📷",
          "Writing short-film scripts (one day, I'll direct one!) 🎬",
          "Rope skipping / running — I love that! 🏃",
          "Experimenting with new recipes 🍳",
          "Dreaming about my next travel destination — over chai ☕",
        ],
      },
      { type: "h2", text: "My explorations" },
      {
        type: "ul",
        items: [
          "Catering service branding — Thane, India",
          "Personal branding logo — for a nutritionist",
          "Technical event identity — organized by VIIT Pune",
          "Proton Projects — IT services company, Pune",
        ],
      },
      { type: "h2", text: "Chatter on the CB — what people say 📻" },
      {
        type: "quote",
        text: "“Abhijeet is a detail-oriented designer who carefully considers every use case to create well-rounded solutions. His passion for research-driven design is evident, always striving for quality and impact. A supportive and approachable teammate, he readily offers insights and guidance. His calm, proactive mindset helps him navigate challenges effectively, making a meaningful difference in every project.” — Avid Kadam, Senior UX Lead @ Fractal Ink Design Studio",
      },
      {
        type: "quote",
        text: "“I had the opportunity to work with Abhijeet on a project and was truly impressed by his UX design skills. His designs were visually appealing, user-friendly, and well-structured, ensuring a smooth development process. His attention to detail, collaborative approach, and proactive problem-solving made working with him a great experience. His expertise and professionalism stood out. I highly recommend him for any UX design role.” — Vikas Jadhav, Tech Lead @ Extentia Merkle",
      },
      {
        type: "quote",
        text: "“I had the pleasure of working with Abhijeet on a B2C website project. His exceptional UX design skills, attention to detail, and willingness to learn and adapt brought a fresh perspective to the redesign. Abhijeet's thoughtful approach significantly improved the website's user experience, making him a valuable collaborator.” — Pranav Pendharkar, Assistant Manager - Design @ TORM",
      },
    ],
  },

  /* ================= FIELD NOTES ================= */
  notes: {
    slug: "notes",
    kicker: "Route: Field Notes",
    title: "My Thoughts — from UX to real-world design",
    access: "public",
    blocks: [
      {
        type: "p",
        text: "What I've learned between drops — writing on design, products, and why things fail or feel like home.",
      },
      {
        type: "ul",
        items: [
          "When Great Products Fail 📉🔍 — lessons from Kodak & Nokia on why innovation alone isn't enough",
          "The QWERTY Trap ⌨️ — why inefficient designs stick around",
          "Design That Feels Like Home 🏡✨ — creating intuitive experiences that users instantly connect with",
        ],
      },
      {
        type: "p",
        text: "[Full posts to be migrated — share their screenshots and they'll land here.]",
      },
    ],
  },

  /* ================= CONTACT ================= */
  signal: {
    slug: "signal",
    kicker: "Signal: Dispatch",
    title: "Reach out to me",
    access: "public",
    blocks: [
      {
        type: "p",
        text: "Let's build connections that feel like heartfelt talks! Got a route in mind — a role, a project, or just a good conversation about design? Radio's always on.",
      },
      {
        type: "kv",
        items: [
          { k: "Email", v: "abhijeet.designmail@gmail.com" },
          { k: "LinkedIn", v: "Abhijeet Purandare" },
          { k: "Instagram", v: "uxpected.abhi" },
        ],
      },
    ],
  },
};
