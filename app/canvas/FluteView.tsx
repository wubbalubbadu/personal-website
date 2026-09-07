const TIKTOKS = ["7500666071444196651", "7538083046537317646"];

export default function FluteView() {
  return (
    <div className="fl">
      <div className="fl-video">
        <iframe
          src="https://www.youtube-nocookie.com/embed/ya3cFeMKD14?start=649"
          title="Competition performance"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <p className="fl-caption">Competition performance</p>

      <p className="fl-caption fl-caption--sec">More clips</p>
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

      <div className="fl-links">
        <a href="https://www.tiktok.com/@wubulubadudu" target="_blank" rel="noreferrer">
          @wubulubadudu on TikTok
        </a>
        <a
          href="https://www.douyin.com/user/MS4wLjABAAAANmZhGUqfg9pD4Rt3zrGjNp2Zv9hmMoyigTUdx-7VOjI?from_tab_name=main"
          target="_blank"
          rel="noreferrer"
        >
          Douyin
        </a>
      </div>
    </div>
  );
}
