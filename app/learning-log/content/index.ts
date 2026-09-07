import { aiMusic } from "./ai-music";
import type { Course } from "./types";

/** Every course in the learning log. Add more here as they get written up. */
export const courses: Course[] = [aiMusic];

export function getCourse(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}

export * from "./types";
