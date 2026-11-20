import book from "../content/book.js";
import { topics } from "../content/registry.js";
import { compose } from "../src/compose.js";

const { pages } = compose(book, topics);
const ids = new Set(pages.map((page) => page.id));

if (ids.size !== pages.length) {
  console.error("Duplicate page ids slipped through");
  process.exit(1);
}

if (pages.at(0).layout !== "cover" || pages.at(-1).layout !== "back") {
  console.error("The book should open on a cover and close on a cover");
  process.exit(1);
}

if (pages.length % 2 !== 0) {
  console.error("Page count should be even so the back cover sits alone");
  process.exit(1);
}

console.log(`${pages.length} pages · ${topics.length} topic${topics.length === 1 ? "" : "s"}`);
for (const page of pages) {
  const folio = (page.folio || "").padStart(4, " ");
  console.log(`${String(page.index).padStart(2, " ")}  ${folio}  ${page.layout.padEnd(9)}  ${page.id}`);
}
