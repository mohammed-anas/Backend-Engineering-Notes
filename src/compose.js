/** Turns the book config and topic files into an ordered list of pages. */

const BLOCKS = new Set([
  "prose",
  "list",
  "note",
  "stack",
  "commands",
  "code",
  "pair",
  "leaderboard",
  "recall",
]);

const CONTENTS_BUDGET = 14;
const SUBINDEX_BUDGET = 9;

export function compose(book, topics) {
  validate(book, topics);

  const pages = [];
  const add = (page) => {
    pages.push(page);
    return page;
  };

  add({
    id: "cover",
    layout: "cover",
    density: "hard",
    numbering: "none",
    title: book.title,
  });

  for (const front of book.front.filter((page) => page.beforeContents)) {
    add(lessonPage(front, book.title, "roman"));
  }

  const contentsSlots = [];
  const topicPlans = topics.map((topic) => planTopic(topic));
  const contentsChunks = paginateContents(topicPlans);

  contentsChunks.forEach((entries, index) => {
    const page = add({
      id: index === 0 ? "contents" : `contents-${index + 1}`,
      layout: "contents",
      numbering: "roman",
      title: index === 0 ? "Contents" : "Contents, continued",
      kicker: book.title,
      header: book.title,
      entries,
    });
    contentsSlots.push(page);
  });

  for (const front of book.front.filter((page) => !page.beforeContents)) {
    add(lessonPage(front, book.title, "roman"));
  }

  for (const plan of topicPlans) {
    add({
      id: plan.openerId,
      layout: "opener",
      numbering: "arabic",
      title: plan.topic.title,
      kicker: plan.topic.eyebrow,
      header: plan.topic.title,
      blurb: plan.topic.blurb,
      indexId: plan.subindexIds[0],
      chapters: plan.topic.chapters.map((chapter) => ({
        id: chapter.pages[0].id,
        title: chapter.title,
        promise: chapter.promise,
      })),
    });

    plan.subindexChunks.forEach((groups, index) => {
      add({
        id: plan.subindexIds[index],
        layout: "subindex",
        numbering: "arabic",
        title: index === 0 ? "In this chapter" : "In this chapter, continued",
        kicker: plan.topic.title,
        header: plan.topic.title,
        groups,
      });
    });

    for (const chapter of plan.topic.chapters) {
      for (const source of chapter.pages) {
        add({
          ...lessonPage(source, `${plan.topic.title} · ${chapter.title}`, "arabic"),
          topicId: plan.topic.id,
          chapterId: chapter.id,
        });
      }
    }
  }

  const seen = new Set();
  for (const page of pages) {
    if (seen.has(page.id)) throw new Error(`Duplicate page id "${page.id}"`);
    seen.add(page.id);
  }

  let roman = 0;
  let arabic = 0;
  pages.forEach((page, index) => {
    page.index = index;
    page.density = page.density || "soft";
    if (page.numbering === "roman") page.folio = toRoman(++roman);
    else if (page.numbering === "arabic") page.folio = String(++arabic);
    else page.folio = "";
  });

  const byId = new Map(pages.map((page) => [page.id, page]));

  for (const page of contentsSlots) {
    for (const entry of page.entries) {
      entry.folio = byId.get(entry.id)?.folio || "";
      entry.indexFolio = byId.get(entry.indexId)?.folio || "";
      for (const lesson of entry.lessons) {
        lesson.folio = byId.get(lesson.id)?.folio || "";
      }
    }
  }

  for (const page of pages) {
    if (page.layout !== "subindex") continue;
    for (const group of page.groups) {
      for (const row of group.rows) {
        row.folio = byId.get(row.id)?.folio || "";
      }
    }
  }

  const readable = pages.filter((page) => page.layout !== "cover");
  for (let i = 0; i < readable.length - 1; i += 1) {
    const next = readable[i + 1];
    readable[i].next = { id: next.id, title: next.title };
  }

  const lastOfTopic = new Map();
  for (const page of pages) {
    if (page.topicId) lastOfTopic.set(page.topicId, page);
  }
  for (const page of lastOfTopic.values()) {
    page.next = { id: "contents", title: "Contents" };
  }

  for (const page of pages) {
    page.links = collectLinks(page);
    for (const id of page.links) {
      if (!byId.has(id)) {
        throw new Error(`Page "${page.id}" links to missing page "${id}"`);
      }
    }
  }

  return { book, pages, byId };
}

function lessonPage(source, header, numbering) {
  for (const block of source.blocks || []) {
    if (!BLOCKS.has(block.type)) {
      throw new Error(`Page "${source.id}" has unknown block "${block.type}"`);
    }
  }
  return {
    id: source.id,
    layout: "lesson",
    numbering,
    title: source.title,
    kicker: source.kicker,
    header,
    blocks: source.blocks || [],
  };
}

function planTopic(topic) {
  const subindexChunks = paginateSubindex(topic);
  return {
    topic,
    openerId: `${topic.id}-open`,
    subindexIds: subindexChunks.map((_, index) =>
      index === 0 ? `${topic.id}-index` : `${topic.id}-index-${index + 1}`,
    ),
    subindexChunks,
  };
}

function paginateContents(plans) {
  const topics = plans.map((plan) => ({
    id: plan.openerId,
    indexId: plan.subindexIds[0],
    title: plan.topic.title,
    eyebrow: plan.topic.eyebrow,
    lessons: plan.topic.chapters.flatMap((chapter) =>
      chapter.pages.map((page) => ({
        id: page.id,
        title: page.title,
        chapter: chapter.title,
      })),
    ),
  }));

  const chunks = [];
  let current = [];
  let used = 0;

  const flush = () => {
    if (!current.length) return;
    chunks.push(current);
    current = [];
    used = 0;
  };

  for (const topic of topics) {
    let offset = 0;
    let part = 0;
    while (offset < topic.lessons.length) {
      const room = CONTENTS_BUDGET - used;
      if (room < 3) {
        flush();
        continue;
      }
      const take = Math.min(topic.lessons.length - offset, room - 2);
      current.push({
        id: topic.id,
        indexId: topic.indexId,
        title: topic.title,
        eyebrow: topic.eyebrow,
        continued: part > 0,
        lessons: topic.lessons.slice(offset, offset + take),
      });
      used += 2 + take;
      offset += take;
      part += 1;
      if (offset < topic.lessons.length) flush();
    }
  }
  flush();
  return chunks.length ? chunks : [[]];
}

function paginateSubindex(topic) {
  const rows = topic.chapters.flatMap((chapter) =>
    chapter.pages.map((page, index) => ({
      chapterId: chapter.id,
      chapter: chapter.title,
      promise: chapter.promise,
      showChapter: index === 0,
      id: page.id,
      title: page.title,
    })),
  );

  const chunks = [];
  let current = [];
  let used = 0;
  let lastChapter = "";

  const flush = () => {
    if (!current.length) return;
    chunks.push(groupRows(current));
    current = [];
    used = 0;
  };

  for (const row of rows) {
    const cost = row.showChapter || row.chapterId !== lastChapter ? 2 : 1;
    if (used && used + cost > SUBINDEX_BUDGET) flush();
    current.push({
      ...row,
      showChapter: row.showChapter || row.chapterId !== lastChapter || current.length === 0,
    });
    used += current[current.length - 1].showChapter ? 2 : 1;
    lastChapter = row.chapterId;
  }
  flush();
  return chunks.length ? chunks : [[]];
}

function groupRows(rows) {
  const groups = [];
  for (const row of rows) {
    if (row.showChapter || !groups.length || groups[groups.length - 1].chapterId !== row.chapterId) {
      groups.push({
        chapterId: row.chapterId,
        title: row.chapter,
        promise: row.promise,
        rows: [],
      });
    }
    groups[groups.length - 1].rows.push({ id: row.id, title: row.title });
  }
  return groups;
}

function collectLinks(page) {
  const links = [];
  if (page.next) links.push(page.next.id);
  if (page.indexId) links.push(page.indexId);
  for (const chapter of page.chapters || []) links.push(chapter.id);
  for (const entry of page.entries || []) {
    links.push(entry.id);
    if (entry.indexId) links.push(entry.indexId);
    for (const lesson of entry.lessons || []) links.push(lesson.id);
  }
  for (const group of page.groups || []) {
    for (const row of group.rows) links.push(row.id);
  }
  return links;
}

function validate(book, topics) {
  if (!book?.title || !Array.isArray(book.front)) {
    throw new Error("Book config needs a title and a front array");
  }
  const ids = new Set(["cover", "back"]);
  const claim = (id, label) => {
    if (!id || !/^[a-z0-9-]+$/.test(id)) {
      throw new Error(`${label} id "${id}" should be lowercase letters, numbers, and dashes`);
    }
    if (ids.has(id)) throw new Error(`Duplicate page id "${id}"`);
    ids.add(id);
  };

  for (const page of book.front) {
    claim(page.id, "Front page");
    if (!page.title || !page.blocks?.length) {
      throw new Error(`Front page "${page.id}" needs a title and blocks`);
    }
  }

  for (const topic of topics) {
    for (const key of ["id", "title", "eyebrow", "blurb", "chapters"]) {
      if (!topic[key]) throw new Error(`Topic is missing ${key}`);
    }
    claim(`${topic.id}-open`, "Topic");
    if (!/^[a-z0-9-]+$/.test(topic.id)) {
      throw new Error(`Topic id "${topic.id}" should be lowercase letters, numbers, and dashes`);
    }
    ids.add(`${topic.id}-index`);
    if (!topic.chapters.length) throw new Error(`Topic "${topic.id}" has no chapters`);

    for (const chapter of topic.chapters) {
      if (!chapter.id || !chapter.title || !chapter.pages?.length) {
        throw new Error(`Topic "${topic.id}" has a chapter missing id, title, or pages`);
      }
      for (const page of chapter.pages) {
        claim(page.id, "Page");
        if (!page.title || !page.blocks?.length) {
          throw new Error(`Page "${page.id}" needs a title and at least one block`);
        }
        for (const block of page.blocks) {
          if (block.type === "leaderboard") validateBoard(page.id, block);
        }
      }
    }
  }
}

function validateBoard(pageId, block) {
  const ids = new Set((block.players || []).map((player) => player.id));
  if (!ids.size) throw new Error(`Page "${pageId}" leaderboard has no players`);
  for (const event of block.script || []) {
    if (!ids.has(event.id)) {
      throw new Error(`Page "${pageId}" script mentions unknown player "${event.id}"`);
    }
  }
}

function toRoman(n) {
  const digits = [
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];
  let out = "";
  let left = n;
  for (const [value, glyph] of digits) {
    while (left >= value) {
      out += glyph;
      left -= value;
    }
  }
  return out;
}
