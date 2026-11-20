import { PageFlip } from "page-flip";
import book from "../content/book.js";
import { topics } from "../content/registry.js";
import { compose } from "./compose.js";
import { mountLeaderboards } from "./leaderboard.js";
import { renderBook } from "./render.js";

const THEME_KEY = "se-notes-theme";
const model = compose(book, topics);
const pages = model.pages;

const root = document.getElementById("book");
const label = document.getElementById("page-label");
const prevButton = document.getElementById("prev");
const nextButton = document.getElementById("next");
const themeButton = document.getElementById("theme");
const themeLabel = document.getElementById("theme-label");
const themeColor = document.getElementById("theme-color");
const closeButton = document.getElementById("close");
const contentsButton = document.getElementById("contents");
const SHUT_LINES = [
  "The margin can hold your place. Go bother the kettle.",
  "Shut. The clever part will still be clever after sleep.",
  "Enough for one sitting. The book does not sulk.",
  "Close it. Tomorrow is a perfectly good bookmark.",
  "The book is patient. You have had a day.",
];
let shutting = false;

root.innerHTML = renderBook(model);

const flip = new PageFlip(root, {
  width: 460,
  height: 640,
  size: "stretch",
  minWidth: 280,
  maxWidth: 560,
  minHeight: 400,
  maxHeight: 760,
  drawShadow: false,
  maxShadowOpacity: 0,
  flippingTime: 320,
  usePortrait: true,
  autoSize: false,
  showCover: true,
  mobileScrollSupport: false,
  swipeDistance: 30,
  clickEventForward: true,
  useMouseEvents: true,
  showPageCorners: false,
  disableFlipByClick: false,
  startZIndex: 8,
});
let turning = false;

flip.loadFromHTML(root.querySelectorAll(".page"));
const boards = mountLeaderboards(root);
guardPageClicks(root.querySelector(".stf__block"));

const hash = location.hash.replace("#", "");
if (pages.some((page) => page.id === hash)) {
  flip.turnToPage(pages.find((page) => page.id === hash).index);
}

flip.on("flip", (event) => sync(event.data));
flip.on("init", () => sync(flip.getCurrentPageIndex()));
flip.on("changeOrientation", () => sync(flip.getCurrentPageIndex()));
flip.on("changeState", (event) => {
  turning = event.data === "flipping" || event.data === "user_fold";
  root.classList.toggle("is-turning", turning);
});

document.getElementById("contents").addEventListener("click", () => goTo("contents"));
closeButton.addEventListener("click", closeBook);
prevButton.addEventListener("click", () => turn(-1));
nextButton.addEventListener("click", () => turn(1));
themeButton.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "night" ? "day" : "night";
  applyTheme(next);
});

root.addEventListener("click", (event) => {
  const recall = event.target.closest(".recall");
  if (recall) {
    const open = recall.classList.toggle("is-open");
    recall.setAttribute("aria-expanded", open ? "true" : "false");
    return;
  }
  const topic = event.target.closest(".toc-topic-link");
  if (topic) {
    openTopic(topic);
    return;
  }
  const target = event.target.closest("[data-goto]");
  if (target) goTo(target.dataset.goto);
});

document.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    turn(1);
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    turn(-1);
  } else if (event.key === "Home") {
    event.preventDefault();
    goTo("cover");
  } else if (event.key === "Escape") {
    event.preventDefault();
    closeBook();
  } else if (event.key === "i" || event.key === "I") {
    event.preventDefault();
    goTo("contents");
  }
});

window.addEventListener("hashchange", () => {
  const id = location.hash.replace("#", "");
  const page = pages.find((item) => item.id === id);
  if (!page || page.index === flip.getCurrentPageIndex()) return;
  flip.turnToPage(page.index);
});

applyTheme(document.documentElement.dataset.theme || "day");

function openTopic(button) {
  const section = button.closest(".toc-topic");
  const list = section.parentElement;
  const wasOpen = section.classList.contains("is-open");
  for (const item of list.querySelectorAll(".toc-topic")) {
    item.classList.remove("is-open");
    item.querySelector(".toc-topic-link").setAttribute("aria-expanded", "false");
    const chapters = item.querySelector(".toc-chapters");
    if (chapters) chapters.hidden = true;
  }
  if (wasOpen) return;
  list.prepend(section);
  section.classList.add("is-open");
  button.setAttribute("aria-expanded", "true");
  section.querySelector(".toc-chapters").hidden = false;
}

function closeBook() {
  if (turning || flip.getCurrentPageIndex() === 0) return;
  shutting = true;
  flip.turnToPage(0);
}

function turn(direction) {
  if (turning) return;
  const current = pages[flip.getCurrentPageIndex()];
  if (direction > 0 && current?.next?.id === "contents" && current.topicId) {
    goTo("contents");
    return;
  }
  if (direction > 0) flip.flipNext();
  else flip.flipPrev();
}

function goTo(id) {
  const page = pages.find((item) => item.id === id);
  if (!page || turning) return;
  const current = flip.getCurrentPageIndex();
  if (visibleIds(current).includes(page.id)) return;
  const distance = Math.abs(page.index - current);
  const oneTurn = distance <= (flip.getOrientation() === "portrait" ? 1 : 3);
  if (page.layout === "contents" || !oneTurn) {
    flip.turnToPage(page.index);
    return;
  }
  if (page.index > current) flip.flipNext();
  else flip.flipPrev();
}

function sync(index) {
  const page = pages[index];
  if (!page) return;
  const visible = new Set(visibleIds(index));
  document.querySelectorAll(".page").forEach((element) => {
    const id = element.dataset.pageId;
    const pageIndex = pages.findIndex((item) => item.id === id);
    element.classList.toggle("is-open", visible.has(id));
    element.dataset.side =
      flip.getOrientation() === "portrait" || pageIndex % 2 === 0 ? "right" : "left";
  });
  for (const board of boards) {
    const id = board.element.closest(".page")?.dataset.pageId;
    if (visible.has(id)) board.show();
    else board.hide();
  }
  label.textContent = pageLabel(page);
  closeButton.hidden = index === 0;
  contentsButton.hidden = page.layout === "contents";
  const note = document.querySelector(".cover-quit");
  if (page.layout === "cover" && shutting) {
    note.textContent = SHUT_LINES[Math.floor(Math.random() * SHUT_LINES.length)];
    note.hidden = false;
    shutting = false;
  } else if (page.layout !== "cover") {
    note.hidden = true;
  }
  const here = pages[index];
  const backToContents = here?.topicId && here.next?.id === "contents";
  prevButton.disabled = index === 0;
  nextButton.disabled = !backToContents && visible.has(pages[pages.length - 1].id);
  const nextHash = `#${page.id}`;
  if (location.hash !== nextHash) history.replaceState(null, "", nextHash);
}

function visibleIds(index) {
  if (flip.getOrientation() === "portrait") return [pages[index].id];
  if (index === 0 || index === pages.length - 1) return [pages[index].id];
  return [pages[index].id, pages[index + 1].id];
}

function pageLabel(page) {
  if (page.layout === "cover") return "Cover";
  const name = page.header && page.header !== book.title ? page.header : page.title;
  return page.folio ? `${name}  ·  ${page.folio}` : name;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  const night = theme === "night";
  themeLabel.textContent = night ? "Day" : "Night";
  themeButton.setAttribute("aria-label", night ? "Read on day paper" : "Read on night paper");
  themeColor.setAttribute("content", night ? "#141311" : "#e4dcd0");
}

function guardPageClicks(block) {
  if (!block) return;
  block.addEventListener(
    "mousedown",
    (event) => {
      if (event.target.closest("button, a")) {
        event.stopPropagation();
        return;
      }
      if (!inCorner(event, block)) event.stopPropagation();
    },
    true,
  );
  block.addEventListener(
    "touchstart",
    (event) => {
      if (event.target.closest("button, a")) event.stopPropagation();
    },
    true,
  );
}

function inCorner(event, element) {
  const rect = element.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const pagesAcross = flip.getOrientation() === "portrait" ? 1 : 2;
  const pageWidth = rect.width / pagesAcross;
  const zone = Math.hypot(pageWidth, rect.height) / 5;
  return (x < zone || x > rect.width - zone) && (y < zone || y > rect.height - zone);
}
