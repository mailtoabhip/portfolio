import ExperienceLoader from "@/components/ExperienceLoader";
import NameCard from "@/components/NameCard";
import DriveHint from "@/components/DriveHint";
import ReadOverlay from "@/components/ReadOverlay";
import GameHud from "@/components/GameHud";
import CelestialToggle from "@/components/CelestialToggle";
import TouchDriveLayer from "@/components/TouchDriveLayer";
import TouchSteerFallback from "@/components/TouchSteerFallback";
import RecalibrateTilt from "@/components/RecalibrateTilt";
import LandscapePrompt from "@/components/LandscapePrompt";

export default function Home() {
  return (
    <main>
      <ExperienceLoader />
      <TouchDriveLayer />
      <NameCard />
      <DriveHint />
      <ReadOverlay />
      <GameHud />
      <CelestialToggle />
      <RecalibrateTilt />
      <TouchSteerFallback />
      <LandscapePrompt />
    </main>
  );
}
