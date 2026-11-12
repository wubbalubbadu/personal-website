/**
 * The landing page in Simplified Chinese: every string the cat's room shows,
 * in one place so Haylie can go over the wording. Shapes mirror studio.ts,
 * links.ts and app/lib/answers.ts; app/lab/home-1/copy.ts lays these over the
 * English. Same rules as the English copy: no dashes, warm, a bit cute.
 * Product and place names that people search for in English stay in English.
 */
import { COPY } from "./links";

export const ZH = {
  intro:
    "你好，我是 Haylie Wu！我是一名长笛演奏者，也是软件工程师。我演奏、教课，也为音乐人写软件。我在西北大学读了计算机和长笛，现在在新英格兰音乐学院读长笛演奏硕士。",

  topicAsk: {
    background: "说说你的软件背景吧。",
    flute: "聊聊你的长笛吧。",
    projects: "你做过哪些东西？",
  },

  /** The three answers from the hello (app/lib/answers.ts), one string per paragraph. */
  answers: {
    background: [
      "我在软件行业做了好几年，待过的环境差别都挺大。在 MathWorks，我在一个大型的生产代码库里开发功能，其中两个随 MATLAB 公开版本发布了，我还为结构化的 Excel 测试数据设计了一套解析器组合子系统。在一家早期创业公司，我是后端负责人，后端、部署、性能和新人上手都归我管。我把首次加载时间缩短了大约三分之一，还完成了一次完整的数据库迁移，没有影响任何现有用户。",
      "我也在西北大学的 Center for Connected Learning 为 NetLogo Web 做过面向开发者和用户的工具，并在那里做过关于调度近似算法的研究实习。",
      "从西北大学本科毕业后，我决定用两年时间在新英格兰音乐学院专心训练长笛演奏。这是我认真考虑过的决定：趁这段时间，把自己的演奏推到最远。同时我一直在写软件，现在也还在不断做新项目。",
    ],
    flute: [
      "我正拿着奖学金在新英格兰音乐学院读长笛演奏硕士，也在积极参加青年演奏家比赛。",
      "比赛之外，我在网上为古典音乐攒了一些观众：TikTok、抖音、微信视频号和小红书加起来大约 24 万粉丝，短视频获赞超过 1000 万。大部分是我自己改编、自己制作伴奏的曲子。我很想让平时不听古典音乐的人，也觉得它亲切好懂。",
    ],
    projects: [
      "我现在在做 Cookie 长笛工作室，一个给长笛演奏者的实时练习平台，还有学习笔记，把课程笔记变成可以点着看的互动课本。在这之前，我做过西北大学学生真正在用的全栈产品：一个校园二手市场，和一个有一千多用户的社交新闻 app。",
    ],
  },

  /** Each thing in the room: its name, what she says, the bubble, the main link's label. */
  items: {
    diploma: {
      name: "毕业证书",
      react: "我的毕业证书！",
      body: "我在西北大学读了计算机科学和长笛演奏。现在在新英格兰音乐学院读长笛演奏硕士，这期间写软件也一直没停下。",
    },
    resume: {
      name: "简历",
      react: "全都写在这里了。",
      body: "我的软件简历：在 MathWorks 发布的功能、在创业公司带后端，还有在西北大学做的工具和研究。",
      open: "打开我的简历",
    },
    socials: {
      name: "社交媒体",
      react: "来网上找我玩！",
      body: "我会在网上分享演奏和短视频，TikTok、抖音、微信视频号和小红书加起来大约 24 万粉丝。",
    },
    laptop: { name: "笔记本电脑", react: "我的项目都在这里面。", body: "" },
    book: {
      name: "学习笔记",
      react: "我的学习笔记！",
      body: "学习笔记是我把上课的笔记重做成的一本互动课本，里面的演示都能听。第一门课是 CMU 的音乐深度学习。",
      open: "打开学习笔记",
    },
    letter: {
      name: "信",
      react: "写信给我！",
      body: `发邮件是联系我最好的方式，我真的会看。我的邮箱是 ${COPY.email}。`,
    },
    flute: {
      name: "长笛",
      react: "给你吹一段吧。",
      body: "我在新英格兰音乐学院读长笛演奏硕士。我参加比赛、教课，也在网上分享演奏。",
    },
    ipad: {
      name: "Cookie 长笛工作室",
      react: "我的练习 app！",
      body: "Cookie 长笛工作室是我给长笛演奏者做的练习 app。打开浏览器就能用，有中文也有英文。",
      open: "打开 Cookie 长笛工作室",
    },
    cookies: { name: "饼干", react: "", body: "" },
    jar: { name: "饼干罐", react: "", body: "" },
    closet: { name: "衣柜", react: "", body: "" },
    cushion: { name: "坐垫", react: "", body: "再睡五分钟。" },
    stand: { name: "谱架", react: "", body: "先练长音。永远先练长音。" },
    window: { name: "窗户", react: "", body: "这里光线很好，适合练琴。" },
  },

  /** The questions some things open, keyed like QUESTIONS in studio.ts. */
  questions: {
    flute: {
      listen: {
        ask: "能听听你演奏吗？",
        say: "屏幕上放的是我一场比赛的录像。我平时发的大多是短视频：我自己改编、自己做伴奏的曲子，TikTok、抖音、微信视频号和小红书上大约有 24 万人关注。",
      },
      now: {
        ask: "你最近在忙什么？",
        say: `在新英格兰音乐学院拿奖学金读长笛演奏硕士，也在参加青年演奏家比赛。接下来我打算录一些练习曲放到 YouTube 上。我也教课，从初中生到成年业余爱好者都有。想上课的话，发邮件到 ${COPY.email} 找我吧。`,
      },
    },
    socials: {
      videos: {
        ask: "给我看看你的视频吧！",
        say: "屏幕上放的就是一个。每首曲子都是我自己改编、自己做伴奏，然后拍下来的。更多的都在我的主页上。",
      },
    },
    laptop: {
      proud: {
        ask: "你最骄傲的是哪个？",
        say: "Cookie 长笛工作室。大多数练习 app 把乐谱存成图片文件。我的 app 存的是音阶背后的规则，自己写出记谱，再在浏览器里画出来。换个调、换个音域，就能得到一份新的乐谱，所以一个引擎就能做出十二个调的音阶书、长音练习和四个八度的颤音表。",
        open: "打开 Cookie 长笛工作室",
      },
      hard: {
        ask: "最难的问题是什么？",
        say: "让乐谱排版正确。我用的记谱库默认乐谱是印在纸上的，所以在手机上它一行只放一小节。现在我会先量出第一行实际放得下多少音符，再在合适的地方换行，重写乐谱。翻页也是一样：我量出画好的每一行，自己算出每一页。",
      },
      log: {
        ask: "学习笔记是什么？",
        say: "我的课堂笔记，重做成一本互动课本，可以当网页读，也可以像幻灯片一样点着看。第一本是 CMU 的音乐深度学习课程，里面有能玩的小演示：亲耳听到混叠，用正弦波搭出一个声音，看实时频谱图。",
        open: "打开学习笔记",
      },
      before: {
        ask: "你之前做过什么？",
        say: "我是学生创业项目 SKUY 的后端负责人，团队大约有 15 名工程师。我写了它的 API，还有为一千多用户的新闻流抓取内容的数据管道，把首次加载缩短了大约 35%，并把数据库从 PostgreSQL 迁到了 Firebase。",
      },
      how: {
        ask: "你用什么技术？",
        say: "Cookie 长笛工作室是一个用 TypeScript 写的 Next.js 应用，设计和代码都是我自己做的。乐谱用 OpenSheetMusicDisplay 排版，声音来自 Web Audio API，3D 用的是 three.js，部署在 Cloudflare Workers 上。",
      },
    },
    ipad: {
      what: {
        ask: "它能做什么？",
        say: "比如你在练长音。选好音和音域，它就帮你把练习写出来。打开持续音，吹起来，看看你的音准有没有对上。音阶、练习曲和指法表也都是这样用的。",
      },
      different: {
        ask: "它有什么不一样？",
        say: "大多数练习 app 把乐谱存成文件，我的基本不这样做。它记住的是音阶或练习背后的规则，现场写出乐谱，所以换个音域或者换个奏法，就能得到一份新的乐谱。",
      },
    },
  },

  snackLines: [
    ["咔嚓。好吧，就一块。", "练长音特别容易饿，都没人提醒过我。", "好吧，再来一块，为了专注。"],
    ["别告诉我老师。", "饼干屑掉进长笛按键里，就得大扫除一次。", "不过值得。"],
    ["练习休息！五分钟。", "也许十分钟。", "好，吃块饼干再睡个午觉。就这么定了。"],
    ["还是热的。有人爱我。", "你要吗？我给你留最大的那块。", "……最大的那块我吃了。对不起。"],
    ["长音的燃料。", "气息支撑从肚子开始，所以这也算练习。", "我就这么说，谁也别想改。"],
    ["这些是好吃的那种。", "糖霜饼干。猫咪安全，长笛安全，就是掉渣。", "别看桌子。"],
  ],
  snackMilestones: {
    5: ["五块了。", "我要停下来了。", "（才不会。）"],
    10: ["十块饼干。", "这已经是一场饼干独奏会了。", "请在曲子结束后再鼓掌。"],
    20: ["二十块？！", "你真是个坏榜样。", "谢谢你。"],
  } as Record<number, string[]>,

  /** The closet's lines, in the same order as LOOKS in studio.ts. */
  looks: [
    "贝雷帽！很有艺术家的感觉。我想给你画一幅画，可我的爪子只会音阶。",
    "我的独奏会蝴蝶结。请在曲子结束后再鼓掌。",
    "阅读眼镜。我看起来好像懂傅里叶变换。其实我懂一点点。",
    "又是学士帽。我自己挣来的，当然要戴。",
    "围裙穿好了。白天是烘焙师，晚上是长笛手。",
    "全都戴上。这就叫时尚。",
    "就是我自己。说实话，还是这样最好看。",
  ],

  desktopLine:
    "这里面放着我做过的六样东西：我的长笛练习 app、我的学习笔记、两个大学时做的 app、我的音乐制作，还有我的 OpenMusic 作品。",

  /** The laptop's projects: a name only where it changes, and the bubble. */
  projects: {
    "cookie-flute-studio": {
      name: "Cookie 长笛工作室",
      preview: "Cookie 长笛工作室让乐谱可以互动，每首曲子都有配套的练习工具。它会根据你正在练的内容生成练习，还会在你吹的时候听着。",
    },
    "learning-log": {
      name: "学习笔记",
      preview: "学习笔记是我把上课的笔记重做成的一本互动课本，里面的演示都能听。第一门课是 CMU 的音乐深度学习。",
    },
    skuy: {
      preview: "SKUY 是给西北大学学生用的社区和新闻 app，由大约 15 名工程师的创业团队开发。我负责后端：API、为一千多用户的新闻流抓取内容的数据管道，还有从 PostgreSQL 迁到 Firebase。",
    },
    market: {
      preview: "Market 是西北大学学生买卖和求购二手物品的平台。我做了整个技术栈：商品发布、搜索、账号、图片上传和 API。",
    },
  } as Record<string, { name?: string; preview: string }>,
  status: { Active: "进行中", "In progress": "开发中", Archived: "已归档" } as Record<string, string>,
  yearTo: " 至 ",

  ui: {
    nextProject: "下一个项目",
    open: (name: string) => `打开 ${name}`,
    details: "完整介绍",
    allProjects: "查看全部项目",
    anotherLook: "再换一套？",
    emailMe: "给我发邮件",
    seeAll: "查看全部项目 ›",
    next: "下一页",
    mute: "关掉声音",
    unmute: "打开声音",
    askMe: "问我",
    things: "房间里的东西",
    letterCard: "写信给我！",
    watchOnTikTok: "播放不了？去 TikTok 看 ›",
    /** The button guide's verbs. */
    guide: {
      Skip: "跳过",
      Next: "继续",
      Look: "看看",
      Select: "选择",
      Pet: "摸摸",
      Move: "移动",
      Open: "打开",
      Back: "返回",
      Choose: "选择",
      Browse: "浏览",
      Desk: "书桌",
      Ask: "提问",
      "Next project": "下一个项目",
      "Try it on": "试穿",
      Details: "详情",
      "Next video": "下一个视频",
      "Zoom in": "靠近看",
      "All projects": "全部项目",
      Email: "发邮件",
      "Open PDF": "打开 PDF",
      Visit: "访问",
      Go: "前往",
    } as Record<string, string>,
  },
};
