"use client";

import { useLanguage } from "../i18n/LanguageContext";
import StudioPage from "../components/StudioPage";
import { ResourceList, ResourceRow } from "../components/ResourceList";

export default function ExercisesHub() {
  const { t } = useLanguage();

  const exercises = [
    {
      title: t.exercises.scaleStudioTitle,
      desc: t.exercises.scaleStudioDescription,
      meta: t.exercises.scaleStudioDetail,
      icon: "◎",
      tone: "sage" as const,
      href: "/flute-studio/exercises/scales",
    },
    {
      title: t.exercises.longToneTitle,
      desc: t.exercises.longToneDescription,
      meta: t.exercises.longToneDetail,
      icon: "◌",
      tone: "pink" as const,
    },
    {
      title: t.exercises.chromaticTitle,
      desc: t.exercises.chromaticDescription,
      meta: t.exercises.chromaticDetail,
      icon: "♩",
      tone: "slate" as const,
    },
  ];

  return (
    <StudioPage
      title={t.exercises.title}
      eyebrow={t.exercises.eyebrow}
      intro={t.exercises.intro}
      backHref="/flute-studio"
    >
      <ResourceList
        heading={
          <>
            <h2>{t.exercises.chooseFocus}</h2>
            <p>{t.exercises.chooseFocusDetail}</p>
          </>
        }
      >
        {exercises.map((exercise) => (
          <ResourceRow
            key={exercise.title}
            title={exercise.title}
            desc={exercise.desc}
            meta={exercise.meta}
            icon={exercise.icon}
            tone={exercise.tone}
            href={exercise.href}
            disabled={!exercise.href}
            trailing={
              exercise.href ? undefined : <span className="resource-chip">{t.exercises.comingSoon}</span>
            }
          />
        ))}
      </ResourceList>
    </StudioPage>
  );
}
