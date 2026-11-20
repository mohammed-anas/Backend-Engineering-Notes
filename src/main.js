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

root.innerHTML = renderBook(model);

const flip = new PageFlip(root, {
  width: 460,
  height: 640,
  size: "stretch",
  minWidth: 280,
  maxWidth: 560,
  minHeight: 400,
  maxHeight: 760,
  drawShadow: true,
  maxShadowOpacity: 0.32,
  flippingTime: 780,
  usePortrait: true,
  autoSize: true,
  showCover: true,
  mobileScrollSupport: false,
  swipeDistance: 30,
  clickEventForward: true,
  useMouseEvents: true,
  showPageCorners: true,
  disableFlipByClick: false,
  startZIndex: 8,
});

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

document.getElementById("contents").addEventListener("click", () => goTo("contents"));
prevButton.addEventListener("click", () => flip.flipPrev());
nextButton.addEventListener("click", () => flip.flipNext());
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
  const target = event.target.closest("[data-goto]");
  if (target) goTo(target.dataset.goto);
});

document.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    flip.flipNext();
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    flip.flipPrev();
  } else if (event.key === "Home") {
    event.preventDefault();
    goTo("cover");
  }
});

window.addEventListener("hashchange", () => {
  const id = location.hash.replace("#", "");
  const page = pages.find((item) => item.id === id);
  if (!page || page.index === flip.getCurrentPageIndex()) return;
  flip.turnToPage(page.index);
});

applyTheme(document.documentElement.dataset.theme || "day");

function goTo(id) {
  const page = pages.find((item) => item.id === id);
  if (!page) return;
  const current = flip.getCurrentPageIndex();
  if (page.index === current) return;
  try {
    flip.flip(page.index);
  } catch {
    flip.turnToPage(page.index);
  }
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
  prevButton.disabled = index === 0;
  nextButton.disabled = visible.has(pages[pages.length - 1].id);
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
  if (page.layout === "back") return "End";
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
