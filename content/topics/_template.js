/**
 * Copy this file, rename it, and fill it in.
 * Then import it from content/registry.js and append it to `topics`.
 *
 * A page should take about a minute. One idea, a picture or a snippet, one line to remember.
 *
 * Block types
 * -----------
 * prose        { type, text }
 * list         { type, items: string[] }
 * note         { type, tone: "remember" | "warn", text }
 * stack        { type, key, caption, rows: [member, score][] }
 * commands     { type, items: { cmd, args, gloss }[] }
 * code         { type, lang: "javascript" | "redis", caption, code }
 * pair         { type, left: { label, code }, right: { label, code } }
 * leaderboard  { type, key, command, players: { id, name, score }[], script: { id, delta, why }[] }
 * recall       { type, items: { q, a }[] }
 *
 * This file is not imported. It is the blank page.
 */

const template = {
  id: "topic-id",
  title: "Topic name",
  eyebrow: "A short shelf",
  blurb: "One sentence a reader can repeat.",
  chapters: [
    {
      id: "use-case",
      title: "Use case",
      promise: "What this chapter leaves you able to say.",
      pages: [
        {
          id: "topic-id-use-case-idea",
          kicker: "The idea",
          title: "Say it in a line",
          blocks: [
            {
              type: "prose",
              text: "What problem is this, in one or two sentences.",
            },
            {
              type: "list",
              items: [
                "The shape of the data.",
                "The one command or call that matters.",
                "The mistake people make first.",
              ],
            },
            {
              type: "note",
              tone: "remember",
              text: "The line you want left in memory.",
            },
          ],
        },
      ],
    },
  ],
};

export default template;
