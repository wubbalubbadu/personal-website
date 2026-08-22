import type { Metadata } from "next";
import "./daily-critter.css";

export const metadata: Metadata = {
  title: "Daily Critter",
  description: "Every day you're assigned a tiny animal identity. Learn its facts, do its missions, grow your Critterdex.",
};

export default function DailyCritterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
