"use client";

import { useEffect } from "react";
import { useNightRun } from "@/lib/store";
import { playTrack, pauseTrack } from "@/lib/audio";

/**
 * Owns the one music track's play/pause state. Mounted once at the
 * app root (not inside the tablet or the phone) so playback survives
 * either UI closing — `audioOn` is the single source of truth both
 * the tablet's Music app and the phone's tap gesture read/write.
 */
export default function AudioEngine() {
  const audioOn = useNightRun((s) => s.audioOn);

  useEffect(() => {
    if (audioOn) playTrack();
    else pauseTrack();
  }, [audioOn]);

  return null;
}
