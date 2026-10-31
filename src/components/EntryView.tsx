"use client";

import { useState } from "react";
import { ENTRIES, type Block } from "@/content/entries";
import type { Destination } from "@/lib/store";

/**
 * THE reusable waybill-entry template (§6.1). Renders any Entry —
 * resume, case study, about, contact — from the single content
 * source. Entries with access: "password" show a gate first
 * (future Delhivery drops).
 */

// Dev-only gate password; replaced by a proper check before launch.
const GATE_PASSWORD = "nightrun";

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "p":
      return <p className="leading-relaxed text-[#3a352c] mt-4">{block.text}</p>;
    case "h2":
      return (
        <h2 className="mt-12 text-2xl font-semibold tracking-tight text-[#1d1a15] border-b border-[#d6cfbe] pb-3">
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 className="mt-8 font-mono text-xs font-semibold uppercase tracking-[0.25em] text-[#8a8272]">
          {block.text}
        </h3>
      );
    case "ul":
      return (
        <ul className="mt-4 space-y-2">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 text-[#3a352c]">
              <span className="text-[#a89f8a] font-mono shrink-0">—</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote className="mt-6 border-l-2 border-[#b5ac96] pl-5 py-1 font-mono text-sm text-[#5c554a] leading-relaxed">
          {block.text}
        </blockquote>
      );
    case "kv":
      return (
        <dl className="mt-6 divide-y divide-[#e0d9c8] border-y border-[#e0d9c8]">
          {block.items.map(({ k, v }) => (
            <div key={k} className="flex gap-6 py-3">
              <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8a8272] w-28 shrink-0 pt-0.5">
                {k}
              </dt>
              <dd className="text-[#1d1a15]">{v}</dd>
            </div>
          ))}
        </dl>
      );
  }
}

export default function EntryView({ slug }: { slug: Destination }) {
  const entry = ENTRIES[slug];
  const [unlocked, setUnlocked] = useState(false);
  const [attempt, setAttempt] = useState("");
  const [wrong, setWrong] = useState(false);

  const gated = entry.access === "password" && !unlocked;

  return (
    <article>
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-[#8a8272]">
          The Night Run · {entry.kicker}
        </p>
      </div>
      <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
        {gated ? "🔒 Sealed cargo" : entry.title}
      </h1>
      {!gated && entry.meta && (
        <div className="mt-4 flex flex-wrap gap-2">
          {entry.meta.map((m) => (
            <span
              key={m}
              className="font-mono text-[11px] uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border border-[#c9c0aa] text-[#6b6455]"
            >
              {m}
            </span>
          ))}
        </div>
      )}
      <hr className="my-6 border-[#d6cfbe]" />

      {gated ? (
        <div className="py-6">
          <p className="leading-relaxed text-[#3a352c]">
            This delivery is under NDA. If you've been given the password,
            enter it below to break the seal.
          </p>
          <form
            className="mt-6 flex gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (attempt === GATE_PASSWORD) {
                setUnlocked(true);
              } else {
                setWrong(true);
              }
            }}
          >
            <input
              type="password"
              value={attempt}
              onChange={(e) => {
                setAttempt(e.target.value);
                setWrong(false);
              }}
              placeholder="password"
              className="font-mono text-sm px-4 py-2.5 bg-[#e6dfce] rounded border border-[#c9c0aa] focus:outline-none focus:border-[#8a8272] w-56"
            />
            <button
              type="submit"
              className="font-mono text-[11px] uppercase tracking-[0.2em] px-5 rounded bg-[#1d1a15] text-[#efeade] hover:bg-[#3a352c] transition-colors"
            >
              Unseal
            </button>
          </form>
          {wrong && (
            <p className="mt-3 font-mono text-xs text-[#a0442e]">
              That's not it — check with the driver.
            </p>
          )}
        </div>
      ) : (
        entry.blocks.map((block, i) => <BlockView key={i} block={block} />)
      )}
    </article>
  );
}
