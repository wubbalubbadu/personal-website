"use client";

import { useRef } from "react";

const TIKTOKS = ["7500666071444196651", "7538083046537317646"];

type Social = {
  name: string;
  cjk?: string;
  followers: string;
  likes?: string;
  href?: string;
  /** Shown instead of a likes line when the platform can't be linked. */
  note?: string;
};

const SOCIALS: Social[] = [
  {
    name: "TikTok",
    followers: "40k followers",
    likes: "3.4M likes",
    href: "https://www.tiktok.com/@wubulubadudu",
  },
  {
    name: "Douyin",
    cjk: "抖音",
    followers: "100k followers",
    likes: "7.1M likes",
    href: "https://www.douyin.com/user/MS4wLjABAAAANmZhGUqfg9pD4Rt3zrGjNp2Zv9hmMoyigTUdx-7VOjI",
  },
  {
    name: "WeChat Channels",
    cjk: "视频号",
    followers: "70k followers",
    note: "in-app only",
  },
  {
    name: "RedNote",
    cjk: "小红书",
    followers: "30k followers",
    href: "https://www.xiaohongshu.com/user/profile/5ff14b680000000001005c3f?xsec_token=AB_QdIGvTodBcRypHv1TDc158LFVM3a2yqUAjKjgVLHvU%3D&xsec_source=pc_search",
  },
];

const REDNOTE_CLIP =
  "https://www.xiaohongshu.com/explore/68598f0e0000000015022dc3?xsec_token=ABzTaGIpmL6YWzmT0Hx_RRzobz8aYZMUMctiK_zEbkF1Q=&xsec_source=pc_search";

export default function FluteView() {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".fl-card");
    const step = card ? card.offsetWidth + 10 : 160;
    track.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <div className="fl">
      <p className="fl-caption">Competition footage</p>
      <div className="fl-video">
        <iframe
          src="https://www.youtube-nocookie.com/embed/ya3cFeMKD14?start=649"
          title="Competition performance"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      <p className="fl-caption fl-caption--sec">Clips</p>
      <div className="fl-tiktoks">
        {TIKTOKS.map((id) => (
          <div className="fl-tiktok-wrap" key={id}>
            <iframe
              className="fl-tiktok"
              src={`https://www.tiktok.com/embed/v2/${id}`}
              title={`TikTok clip ${id}`}
              loading="lazy"
              allow="encrypted-media; fullscreen"
              scrolling="no"
            />
          </div>
        ))}
      </div>

      <div className="fl-social-head">
        <p className="fl-caption fl-caption--sec">Where I post</p>
        <div className="fl-social-nav">
          <button type="button" onClick={() => scrollByCard(-1)} aria-label="Scroll platforms left">
            ‹
          </button>
          <button type="button" onClick={() => scrollByCard(1)} aria-label="Scroll platforms right">
            ›
          </button>
        </div>
      </div>

      <div className="fl-carousel" ref={trackRef} role="group" aria-label="Social platforms">
        {SOCIALS.map((s) => {
          const inner = (
            <>
              <span className="fl-card__name">
                {s.name}
                {s.cjk ? <i className="fl-card__cjk">{s.cjk}</i> : null}
              </span>
              <span className="fl-card__stat">{s.followers}</span>
              {s.likes ? <span className="fl-card__sub">{s.likes}</span> : null}
              {s.note ? <span className="fl-card__sub">{s.note}</span> : null}
            </>
          );
          return s.href ? (
            <a className="fl-card" key={s.name} href={s.href} target="_blank" rel="noreferrer">
              {inner}
            </a>
          ) : (
            <div className="fl-card fl-card--static" key={s.name}>
              {inner}
            </div>
          );
        })}
      </div>

      <div className="fl-links">
        <a href={REDNOTE_CLIP} target="_blank" rel="noreferrer">
          Featured clip on RedNote →
        </a>
        <a href="/haylie-wu-music-resume.pdf" target="_blank" rel="noreferrer">
          Music résumé (PDF) →
        </a>
      </div>
    </div>
  );
}
