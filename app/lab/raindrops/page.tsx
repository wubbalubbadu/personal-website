import type {Metadata} from "next";
import Raindrops from "./Raindrops";

export const metadata: Metadata = {
  title: "Raindrops | Lab",
  description: "Each note you play falls as a drop: pitch sets where, articulation sets how it splashes, rings and fades.",
  robots: {index: false, follow: false},
};

export default function RaindropsPage() { return <Raindrops/>; }
