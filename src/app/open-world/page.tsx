"use client";
import dynamic from "next/dynamic";
const OpenWorldGame=dynamic(()=>import("@/components/openWorld/OpenWorldGame"),{ssr:false});
export default function OpenWorldPage(){return <OpenWorldGame/>;}
