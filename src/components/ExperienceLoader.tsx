"use client";

import dynamic from "next/dynamic";

// R3F must not run on the server; ssr:false is only allowed
// inside a client component, hence this wrapper.
const Experience = dynamic(() => import("@/components/three/Experience"), {
  ssr: false,
});

export default function ExperienceLoader() {
  return <Experience />;
}
