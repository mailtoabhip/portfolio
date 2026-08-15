import ExperienceLoader from "@/components/ExperienceLoader";
import NameCard from "@/components/NameCard";
import DriveHint from "@/components/DriveHint";
import ReadOverlay from "@/components/ReadOverlay";
import GameHud from "@/components/GameHud";
import CelestialToggle from "@/components/CelestialToggle";

export default function Home() {
  return (
    <main>
      <ExperienceLoader />
      <NameCard />
      <DriveHint />
      <ReadOverlay />
      <GameHud />
      <CelestialToggle />
    </main>
  );
}
