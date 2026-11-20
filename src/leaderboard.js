/** A small live board. Each tick is one ZINCRBY, then the rows reorder. */

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

export function mountLeaderboards(scope) {
  return [...scope.querySelectorAll(".js-leaderboard")].map(mountLeaderboard);
}

function mountLeaderboard(root) {
  const config = JSON.parse(root.querySelector("script").textContent);
  const scores = Object.fromEntries(config.players.map((player) => [player.id, player.score]));
  const rows = new Map();
  let cursor = 0;
  let timer = null;
  let visible = false;
  let paused = false;

  root.innerHTML = `
    <div class="lb-top">
      <span class="lb-live"><span class="lb-dot" aria-hidden="true"></span> live</span>
      <button type="button" class="lb-toggle">Play</button>
    </div>
    <p class="lb-cmd" aria-live="polite"></p>
    <p class="lb-why"></p>
    <div class="lb-list"></div>
    <p class="lb-foot">You did not sort. You added a number.</p>
  `;

  const list = root.querySelector(".lb-list");
  const command = root.querySelector(".lb-cmd");
  const why = root.querySelector(".lb-why");
  const toggle = root.querySelector(".lb-toggle");

  for (const player of config.players) {
    const row = document.createElement("div");
    row.className = "lb-row";
    row.dataset.id = player.id;
    row.innerHTML = `
      <span class="lb-rank"></span>
      <span class="lb-name"></span>
      <span class="lb-track"><span class="lb-bar"></span></span>
      <span class="lb-score"></span>
      <button type="button" class="lb-plus">+10</button>
    `;
    row.querySelector(".lb-name").textContent = player.name;
    row.querySelector(".lb-plus").setAttribute("aria-label", `Add 10 points to ${player.name}`);
    row.querySelector(".lb-plus").addEventListener("click", () => {
      scores[player.id] += 10;
      paint({ animate: visible, flashId: player.id });
      say(player.id, 10, `${player.name} scored from the page`);
    });
    rows.set(player.id, row);
    list.append(row);
  }

  toggle.addEventListener("click", () => {
    if (timer) {
      paused = true;
      stop();
    } else {
      paused = false;
      start();
    }
  });

  paint({ animate: false });
  sayIdle();

  function paint({ animate, flashId }) {
    const first = new Map();
    if (animate) {
      for (const [id, row] of rows) first.set(id, row.getBoundingClientRect().top);
    }
    const ordered = [...config.players].sort(
      (a, b) => scores[b.id] - scores[a.id] || a.name.localeCompare(b.name),
    );
    const top = scores[ordered[0].id] || 1;
    ordered.forEach((player, index) => {
      const row = rows.get(player.id);
      list.append(row);
      row.querySelector(".lb-rank").textContent = String(index + 1);
      row.querySelector(".lb-score").textContent = String(scores[player.id]);
      row.querySelector(".lb-bar").style.width = `${Math.max(8, (scores[player.id] / top) * 100)}%`;
      row.classList.toggle("is-flash", player.id === flashId);
    });
    if (!animate) return;
    for (const [id, row] of rows) {
      const dy = first.get(id) - row.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) continue;
      row.style.transition = "none";
      row.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => {
        row.style.transition = "";
        row.style.transform = "";
      });
    }
  }

  function say(id, delta, reason) {
    command.textContent = `${config.command} ${config.key} ${delta} user:${id}`;
    why.textContent = reason;
  }

  function sayIdle() {
    command.textContent = `${config.key}`;
    why.textContent = "Saturday chess. Games finish, points land.";
  }

  function tick() {
    if (cursor >= config.script.length) {
      for (const player of config.players) scores[player.id] = player.score;
      cursor = 0;
      paint({ animate: visible });
      command.textContent = config.key;
      why.textContent = "New round. The board returns to the start.";
      return;
    }
    const event = config.script[cursor];
    cursor += 1;
    scores[event.id] += event.delta;
    paint({ animate: visible, flashId: event.id });
    say(event.id, event.delta, event.why);
  }

  function start() {
    if (timer || !visible) return;
    root.classList.add("is-playing");
    toggle.textContent = "Pause";
    timer = setInterval(tick, 1500);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    root.classList.remove("is-playing");
    toggle.textContent = "Play";
  }

  return {
    element: root,
    show() {
      if (visible) return;
      visible = true;
      paint({ animate: false });
      if (!paused && !reducedMotion.matches) start();
    },
    hide() {
      visible = false;
      stop();
    },
  };
}
