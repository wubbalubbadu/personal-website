import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QR Tree — Haylie Wu",
  description:
    "A scannable QR code that stands up into a blocky cherry tree and folds back flat, resolving only from one point of view.",
};

export default function QrTreeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
