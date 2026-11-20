import book from "../content/book.js";
import { topics } from "../content/registry.js";
import { compose } from "../src/compose.js";

const { pages } = compose(book, topics);
const ids = new Set(pages.map((page) => page.id));

if (ids.size !== pages.length) {
  console.error("Duplicate page ids slipped through");
  process.exit(1);
}

if (pages.at(0).layout !== "cover") {
  console.error("The book should open on a cover");
  process.exit(1);
}

if (pages.some((page) => page.layout === "back" || page.layout === "endpaper")) {
  console.error("A finished topic returns to the contents, not a closing leaf");
  process.exit(1);
}

console.log(`${pages.length} pages · ${topics.length} topic${topics.length === 1 ? "" : "s"}`);
for (const page of pages) {
  const folio = (page.folio || "").padStart(4, " ");
  console.log(`${String(page.index).padStart(2, " ")}  ${folio}  ${page.layout.padEnd(9)}  ${page.id}`);
}
