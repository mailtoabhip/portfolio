import { Howl } from "howler";

/**
 * The site's one audio track — a single shared Howl instance, module-
 * level so it survives whether the tablet's Music app is open, closed,
 * or was never opened at all. `AudioEngine.tsx` is the only thing that
 * calls play()/pause() on it, driven purely by the store's `audioOn`
 * flag — that's the single source of truth both the tablet and the
 * phone read/write, so playback keeps going when either UI closes.
 */

export const TRACK_TITLE = "Jaundya Na Balasaheb";
export const TRACK_ARTIST = "Ajay-Atul · Bhau Kadam, Saie Tamhankar";

let howl: Howl | null = null;

function getHowl(): Howl {
  if (!howl) {
    howl = new Howl({
      src: ["/audio/highway-static.mp3"],
      loop: true,
      volume: 0.5,
      html5: true,
    });
  }
  return howl;
}

export function playTrack(): void {
  const h = getHowl();
  if (!h.playing()) h.play();
}

export function pauseTrack(): void {
  howl?.pause();
}
