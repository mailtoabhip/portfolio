import ExperienceLoader from "@/components/ExperienceLoader";
import NameCard from "@/components/NameCard";
import DriveHint from "@/components/DriveHint";
import TabletOS from "@/components/TabletOS";
import PhoneCard from "@/components/PhoneCard";
import CelestialToggle from "@/components/CelestialToggle";
import GameHud from "@/components/GameHud";
import TouchDriveLayer from "@/components/TouchDriveLayer";
import TouchSteerFallback from "@/components/TouchSteerFallback";
import RecalibrateTilt from "@/components/RecalibrateTilt";
import LandscapePrompt from "@/components/LandscapePrompt";
import AudioEngine from "@/components/AudioEngine";

export default function Home() {
  return (
    <main>
      <ExperienceLoader />
      <AudioEngine />
      <TouchDriveLayer />
      <NameCard />
      <DriveHint />
      <TabletOS />
      <PhoneCard />
      <GameHud />
      <CelestialToggle />
      <RecalibrateTilt />
      <TouchSteerFallback />
      <LandscapePrompt />
    </main>
  );
}
