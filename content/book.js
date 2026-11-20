/** Book-wide pages. Topics live in content/topics and are registered next door. */
const book = {
  title: "Evening Notes",
  subtitle: "Software engineering, short enough to reread.",
  volume: "Volume 01",
  front: [
    {
      id: "how-to-read",
      beforeContents: true,
      kicker: "How to read",
      title: "Turn the corner",
      blocks: [
        {
          type: "prose",
          text: "This is a revision book. Each page is one idea, said once, then a picture of it happening.",
        },
        {
          type: "list",
          items: [
            "Drag a corner, or use the arrows. The page turns.",
            "Contents and each chapter index jump straight to a page.",
            "The lamp in the corner is day and night. The paper changes. The words do not.",
            "A live page is a real use, running. Pause it if you want the room quiet.",
          ],
        },
        {
          type: "note",
          tone: "remember",
          text: "If you can say the page out loud in one breath, you have it.",
        },
      ],
    },
    {
      id: "adding-a-topic",
      kicker: "The template",
      title: "Add the next topic",
      blocks: [
        {
          type: "prose",
          text: "A topic is a file. The contents, the chapter index, and the page numbers build themselves.",
        },
        {
          type: "list",
          items: [
            "Copy content/topics/_template.js and give it a real name.",
            "Fill chapters with short pages. One idea each.",
            "Import the file in content/registry.js and add it to the list.",
            "Run npm run check. It refuses a broken id or an unknown block.",
          ],
        },
        {
          type: "note",
          tone: "remember",
          text: "Blocks you can use: prose, list, note, stack, commands, code, pair, leaderboard, recall.",
        },
      ],
    },
  ],
};

export default book;
