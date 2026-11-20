import { escapeHtml } from "./escape.js";
import { highlight, highlightCommands } from "./highlight.js";

export function renderBook(model) {
  return model.pages.map((page) => renderPage(page, model.book)).join("");
}

function renderPage(page, book) {
  const density = page.density || "soft";
  const inner = layouts[page.layout](page, book);
  return `<div class="page" data-density="${density}" data-page-id="${escapeHtml(page.id)}">${inner}</div>`;
}

const layouts = {
  cover(page, book) {
    return `<div class="cover">
      <div class="cover-frame">
        <p class="cover-mark" aria-hidden="true">SE</p>
        <h1>${escapeHtml(book.title)}</h1>
        <p class="cover-sub">${escapeHtml(book.subtitle)}</p>
        <div class="cover-rule" aria-hidden="true"></div>
        <p class="cover-author">${escapeHtml(book.author)}</p>
        <p class="cover-opens">Opens on Redis</p>
      </div>
    </div>`;
  },
  opener(page) {
    const chapters = page.chapters
      .map(
        (chapter) => `<li>
          ${goto(chapter.id, "opener-chapter", `<span class="opener-chapter-title">${escapeHtml(chapter.title)}</span><span class="opener-chapter-promise">${escapeHtml(chapter.promise)}</span>`)}
        </li>`,
      )
      .join("");
    return sheet(
      page,
      `<div class="opener-body">
        <p class="kicker">${escapeHtml(page.kicker)}</p>
        <h2 class="opener-title">${escapeHtml(page.title)}</h2>
        <p class="opener-blurb">${escapeHtml(page.blurb)}</p>
        <ol class="opener-chapters">${chapters}</ol>
        ${goto(page.indexId, "quiet-link", "Chapter index")}
      </div>`,
    );
  },
  contents(page) {
    const topics = page.entries.map(renderContentsTopic).join("");
    return sheet(
      page,
      `<p class="kicker">${escapeHtml(page.kicker)}</p>
       <h2 class="page-title">${escapeHtml(page.title)}</h2>
       <div class="toc">${topics}</div>`,
    );
  },
  subindex(page) {
    const groups = page.groups
      .map(
        (group) => `<section class="subindex-group">
          <h3>${escapeHtml(group.title)}</h3>
          <p>${escapeHtml(group.promise)}</p>
          <ol>
            ${group.rows
              .map(
                (row) =>
                  `<li>${goto(row.id, "toc-link", `<span class="toc-name">${escapeHtml(row.title)}</span><span class="toc-leader" aria-hidden="true"></span><span class="toc-folio">${escapeHtml(row.folio)}</span>`)}</li>`,
              )
              .join("")}
          </ol>
        </section>`,
      )
      .join("");
    return sheet(
      page,
      `<p class="kicker">${escapeHtml(page.kicker)}</p>
       <h2 class="page-title">${escapeHtml(page.title)}</h2>
       ${groups}`,
    );
  },
  lesson(page) {
    const body = page.blocks.map(renderBlock).join("");
    return sheet(
      page,
      `<p class="kicker">${escapeHtml(page.kicker || "")}</p>
       <h2 class="page-title">${escapeHtml(page.title)}</h2>
       ${body}`,
    );
  },
};

function sheet(page, body) {
  const foot = page.next
    ? `<footer class="sheet-foot">${goto(
        page.next.id,
        "next-hint",
        page.next.id === "contents"
          ? `<span>Return</span><strong>Contents</strong>`
          : `<span>Next</span><strong>${escapeHtml(page.next.title)}</strong>`,
      )}</footer>`
    : `<footer class="sheet-foot"></footer>`;
  return `<article class="sheet">
    <header class="sheet-head">
      <span class="running">${escapeHtml(page.header || "")}</span>
      <span class="folio">${escapeHtml(page.folio || "")}</span>
    </header>
    <div class="page-body">${body}</div>
    ${foot}
  </article>`;
}

function renderContentsTopic(entry) {
  const groups = [];
  for (const lesson of entry.lessons) {
    const last = groups[groups.length - 1];
    if (!last || last.chapter !== lesson.chapter) {
      groups.push({ chapter: lesson.chapter, lessons: [lesson] });
    } else {
      last.lessons.push(lesson);
    }
  }
  const body = groups
    .map(
      (group) => `<p class="toc-chapter">${escapeHtml(group.chapter)}</p>
        <ol>
          ${group.lessons
            .map(
              (lesson) =>
                `<li>${goto(lesson.id, "toc-link", `<span class="toc-name">${escapeHtml(lesson.title)}</span><span class="toc-leader" aria-hidden="true"></span><span class="toc-folio">${escapeHtml(lesson.folio)}</span>`)}</li>`,
            )
            .join("")}
        </ol>`,
    )
    .join("");
  const index = entry.continued
    ? ""
    : goto(
        entry.indexId,
        "toc-link toc-index-link",
        `<span class="toc-name">Chapter index</span><span class="toc-leader" aria-hidden="true"></span><span class="toc-folio">${escapeHtml(entry.indexFolio)}</span>`,
      );
  return `<section class="toc-topic">
    ${goto(entry.id, "toc-topic-link", `<span><span class="toc-eyebrow">${escapeHtml(entry.eyebrow)}</span><span class="toc-topic-name">${escapeHtml(entry.title)}${entry.continued ? ", continued" : ""}</span></span><span class="toc-leader" aria-hidden="true"></span><span class="toc-folio">${escapeHtml(entry.folio)}</span>`)}
    ${index}
    ${body}
  </section>`;
}

function renderBlock(block) {
  switch (block.type) {
    case "prose":
      return `<p class="prose">${escapeHtml(block.text)}</p>`;
    case "list":
      return `<ul class="points">${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
    case "note":
      return `<aside class="note note-${block.tone === "warn" ? "warn" : "remember"}">
        <span class="note-mark">${block.tone === "warn" ? "Careful" : "Remember"}</span>
        <p>${escapeHtml(block.text)}</p>
      </aside>`;
    case "stack":
      return `<figure class="stack">
        <figcaption class="stack-key"><span>key</span> ${escapeHtml(block.key)}</figcaption>
        <ol>
          ${block.rows
            .map(
              (row, index) =>
                `<li class="stack-row" style="--i:${index}"><span class="stack-member">${escapeHtml(row[0])}</span><span class="stack-score">${escapeHtml(row[1])}</span></li>`,
            )
            .join("")}
        </ol>
        <figcaption class="stack-caption">${escapeHtml(block.caption || "")}</figcaption>
      </figure>`;
    case "commands":
      return `<ul class="cmds">${block.items
        .map(
          (item) => `<li>
            <code><span class="tok-cmd">${escapeHtml(item.cmd)}</span> ${escapeHtml(item.args)}</code>
            <p>${escapeHtml(item.gloss)}</p>
          </li>`,
        )
        .join("")}</ul>`;
    case "code":
      return `<figure class="snippet">
        <pre class="code"><code>${highlight(block.code, block.lang)}</code></pre>
        ${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ""}
      </figure>`;
    case "pair":
      return `<div class="pair">
        ${pairSide(block.left)}
        ${pairSide(block.right)}
      </div>`;
    case "leaderboard":
      return `<div class="lb js-leaderboard"><script type="application/json">${jsonForScript(block)}</script></div>`;
    case "recall":
      return `<div class="recalls">${block.items
        .map(
          (item) => `<button type="button" class="recall" aria-expanded="false">
            <span class="recall-q">${escapeHtml(item.q)}</span>
            <span class="recall-a">${escapeHtml(item.a)}</span>
          </button>`,
        )
        .join("")}</div>`;
    default:
      return "";
  }
}

function pairSide(side) {
  return `<div class="pair-side">
    <span class="pair-label">${escapeHtml(side.label)}</span>
    <pre class="code"><code>${highlightCommands(side.code)}</code></pre>
  </div>`;
}

function goto(id, className, inner) {
  return `<button type="button" class="${className}" data-goto="${escapeHtml(id)}">${inner}</button>`;
}

function jsonForScript(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
