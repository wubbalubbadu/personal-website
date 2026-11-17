// Every word on screen, in both languages. Drafts for Haylie to edit.
import type { ActionId, BodyStyle, FaceStyle, TimeOfDay, ViewMode } from "./game";
import type { Zone } from "./nav";

type Copy = {
  title: string;
  tagline: string;
  enter: string;
  bye: string;
  again: string;
  loading: string;
  broken: string;
  hintMouse: string;
  hintTouch: string;
  here(n: number): string;
  inside(n: number): string;
  you: string;
  newLook: string;
  soundOn: string;
  soundOff: string;
  settings: string;
  time: string;
  crowd: string;
  faces: string;
  bodies: string;
  bodyNames: Record<BodyStyle, string>;
  view: string;
  views: Record<ViewMode, string>;
  faceNames: Record<FaceStyle, string>;
  zones: Record<Zone, string>;
  actions: Record<ActionId, string>;
  times: Record<TimeOfDay | "auto", string>;
  stage: string;
  crowds: [string, string, string];
};

export const COPY: Record<"en" | "zh", Copy> = {
  en: {
    title: "Soak",
    tagline: "A small bathhouse to wander. Warm up, cool down, lie on the floor for a while. Other people are here too.",
    enter: "Come in",
    bye: "See you tomorrow.",
    again: "Go back in",
    loading: "Heating the water",
    broken: "The bathhouse couldn't open here. It needs 3D graphics (WebGL), which this browser or device has turned off.",
    hintMouse: "Click the floor to walk. Drag to look around, scroll to zoom.",
    hintTouch: "Tap the floor to walk. Drag to look around, pinch to zoom.",
    here: (n) => (n === 1 ? "Just you" : `${n} here`),
    inside: (n) => (n === 1 ? "1 person is inside right now" : `${n} people are inside right now`),
    you: "You are",
    newLook: "New look",
    soundOn: "Turn sound off",
    soundOff: "Turn sound on",
    settings: "Time and crowd",
    time: "Time",
    crowd: "Crowd",
    faces: "Faces",
    bodies: "Body",
    bodyNames: { gumdrop: "Gumdrop", bean: "Bean", dumpling: "Dumpling" },
    view: "View",
    views: { third: "Behind you", first: "Your eyes" },
    faceNames: { dots: "Dots", sleepy: "Sleepy", goofy: "Goofy", round: "Before" },
    zones: { lounge: "Warm floor lounge", sauna: "Sauna", spring: "Hot spring", plunge: "Cold plunge", path: "Garden" },
    actions: {
      wave: "Wave", sigh: "Sigh", pour: "Pour water", fan: "Fan the steam", dunk: "Dunk", bucket: "Bucket",
      egg: "Crack an egg", milk: "Drink milk", cucumbers: "Cucumbers", nap: "Nap", float: "Float", getup: "Get up",
    },
    times: { dusk: "Dusk", night: "Night", morning: "Morning", auto: "My clock" },
    stage: "The bathhouse. Click the floor to walk and drag to look around. Number keys 1 to 4 use the actions at the bottom, and Escape gets you up.",
    crowds: ["Quiet", "Cosy", "Busy"],
  },
  zh: {
    title: "泡一泡",
    tagline: "一间可以随便逛的小澡堂。暖一暖，凉一凉，在地板上躺一会儿。这里还有别的人。",
    enter: "进来吧",
    bye: "明天见。",
    again: "再进去",
    loading: "正在烧水",
    broken: "澡堂在这里打不开。它需要 3D 图形（WebGL），这个浏览器或设备把它关掉了。",
    hintMouse: "点地板走过去，拖动看四周，滚轮拉近拉远。",
    hintTouch: "点地板走过去，拖动看四周，双指拉近拉远。",
    here: (n) => (n === 1 ? "只有你" : `${n} 人在`),
    inside: (n) => `现在里面有 ${n} 个人`,
    you: "你是",
    newLook: "换个样子",
    soundOn: "关掉声音",
    soundOff: "打开声音",
    settings: "时间和人数",
    time: "时间",
    crowd: "人数",
    faces: "脸",
    bodies: "身体",
    bodyNames: { gumdrop: "水滴", bean: "豆子", dumpling: "团子" },
    view: "视角",
    views: { third: "身后", first: "眼睛" },
    faceNames: { dots: "豆豆眼", sleepy: "眯眯眼", goofy: "呆呆的", round: "原来的" },
    zones: { lounge: "暖地板休息室", sauna: "桑拿房", spring: "温泉", plunge: "冷水池", path: "院子" },
    actions: {
      wave: "挥手", sigh: "叹口气", pour: "浇水", fan: "扇热气", dunk: "潜一下", bucket: "浇一桶",
      egg: "敲鸡蛋", milk: "喝牛奶", cucumbers: "敷黄瓜", nap: "睡一会儿", float: "漂着", getup: "起来",
    },
    times: { dusk: "黄昏", night: "夜晚", morning: "早晨", auto: "跟我的时钟" },
    stage: "澡堂。点地板走过去，拖动看四周。数字键 1 到 4 对应底部的动作，Esc 起身。",
    crowds: ["安静", "刚好", "热闹"],
  },
};
