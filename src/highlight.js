import { escapeHtml } from "./escape.js";

const JS_WORDS = new Set([
  "const",
  "let",
  "var",
  "await",
  "return",
  "new",
  "true",
  "false",
  "async",
  "function",
]);

/** Colors Redis command words without treating the line as a full language. */
export function highlightCommands(code) {
  return escapeHtml(code).replace(
    /\b[A-Z][A-Z0-9]+\b/g,
    (word) => `<span class="tok-cmd">${word}</span>`,
  );
}

export function highlight(code, lang) {
  if (lang === "redis") {
    return code.split("\n").map(highlightRedisLine).join("\n");
  }
  if (lang === "javascript") {
    return code.split("\n").map(highlightJsLine).join("\n");
  }
  return escapeHtml(code);
}

function highlightRedisLine(line) {
  const match = line.match(/^(\s*)([A-Z][A-Z0-9]*)(.*)$/);
  if (!match) return escapeHtml(line);
  return `${escapeHtml(match[1])}<span class="tok-cmd">${escapeHtml(match[2])}</span>${escapeHtml(match[3])}`;
}

function highlightJsLine(line) {
  let html = "";
  let i = 0;
  while (i < line.length) {
    if (line.startsWith("//", i)) {
      html += `<span class="tok-note">${escapeHtml(line.slice(i))}</span>`;
      break;
    }
    const quote = line[i];
    if (quote === '"' || quote === "'" || quote === "`") {
      const end = scanString(line, i);
      html += `<span class="tok-str">${escapeHtml(line.slice(i, end))}</span>`;
      i = end;
      continue;
    }
    const word = line.slice(i).match(/^[A-Za-z_$][\w$]*/);
    if (word) {
      const token = word[0];
      const cls = JS_WORDS.has(token) ? "tok-key" : "tok-name";
      html += `<span class="${cls}">${escapeHtml(token)}</span>`;
      i += token.length;
      continue;
    }
    const num = line.slice(i).match(/^\d[\d_]*(?:e[+-]?\d+)?/);
    if (num) {
      html += `<span class="tok-num">${escapeHtml(num[0])}</span>`;
      i += num[0].length;
      continue;
    }
    html += escapeHtml(line[i]);
    i += 1;
  }
  return html;
}

function scanString(line, start) {
  const quote = line[start];
  let i = start + 1;
  while (i < line.length) {
    if (line[i] === "\\") {
      i += 2;
      continue;
    }
    if (line[i] === quote) return i + 1;
    i += 1;
  }
  return line.length;
}
