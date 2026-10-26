"use client";
import { useSyncExternalStore } from "react";
import { DEFAULT_TOOL_SOUNDS, getToolSounds, subscribeToolSounds } from "./toolSounds";

/** The studio's tool sound settings, re-rendering when any page changes them. */
export function useToolSounds() {
  return useSyncExternalStore(subscribeToolSounds, getToolSounds, () => DEFAULT_TOOL_SOUNDS);
}
