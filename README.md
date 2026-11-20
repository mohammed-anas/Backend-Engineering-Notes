# Software Engineering Notes

A short book of software engineering, made to be reread rather than studied. The paper warms for night reading. Pages turn. The first chapter is Redis, used as a leaderboard.

## Read it

```bash
npm install
npm run dev
```

Open the address Vite prints. Contents and each chapter index jump to a page. The lamp in the corner switches day and night paper. Arrow keys turn the page, and so does a corner.

```bash
npm run check
```

That checks the page list: unique ids and links that resolve. The last page of a topic returns to the contents.

## Add a topic

1. Copy `content/topics/_template.js` and rename it.
2. Keep each page to about a minute. One idea, then a picture, a command, or a snippet.
3. Import the file in `content/registry.js` and append it to `topics`.
4. Run `npm run check`.

The contents, the chapter index, and the page numbers build themselves. Block types are listed at the top of the template.
