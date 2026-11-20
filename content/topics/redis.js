/** Redis, first use: a live leaderboard. Keep each page to a minute. */
const redis = {
  id: "redis",
  title: "Redis",
  eyebrow: "In memory",
  blurb: "A sorted set is a leaderboard that is already in order.",
  chapters: [
    {
      id: "leaderboard",
      title: "Leaderboard",
      promise: "Top ten, my rank, add points.",
      pages: [
        {
          id: "redis-leaderboard-job",
          kicker: "The job",
          title: "Three questions",
          blocks: [
            {
              type: "prose",
              text: "A leaderboard only ever asks three things. Who is on top, where am I, and what is my score after this game.",
            },
            {
              type: "list",
              items: [
                "A database can answer with ORDER BY. It sorts again on every read.",
                "Once the board is busy, that sort is the cost you feel.",
                "A Redis sorted set keeps the order as scores change. A read is a slice, not a sort.",
              ],
            },
            {
              type: "note",
              tone: "remember",
              text: "You are not caching a list. The ranking itself lives in Redis.",
            },
          ],
        },
        {
          id: "redis-leaderboard-shape",
          kicker: "The shape",
          title: "One key, many members",
          blocks: [
            {
              type: "prose",
              text: "One key is one board. Each player is a member with a score. Redis keeps that list sorted.",
            },
            {
              type: "stack",
              key: "lb:chess:daily",
              caption: "High score at the top when you read from the top.",
              rows: [
                ["user:maya", "153"],
                ["user:jules", "136"],
                ["user:rafi", "130"],
                ["user:noor", "126"],
              ],
            },
            {
              type: "list",
              items: [
                "Key names the board: lb:chess:daily is one day of chess.",
                "Member is a stable id. Never a name, avatar, or JSON blob.",
                "Score is a number. Bigger is better, so read from the high end.",
              ],
            },
          ],
        },
        {
          id: "redis-leaderboard-commands",
          kicker: "The commands",
          title: "Four, and you are done",
          blocks: [
            {
              type: "commands",
              items: [
                {
                  cmd: "ZADD",
                  args: "lb:chess:daily 1200 user:maya",
                  gloss: "Set Maya's score to 1200. Replaces whatever she had.",
                },
                {
                  cmd: "ZINCRBY",
                  args: "lb:chess:daily 25 user:maya",
                  gloss: "Add 25. Creates her if she is new. This is the write you want.",
                },
                {
                  cmd: "ZREVRANGE",
                  args: "lb:chess:daily 0 9 WITHSCORES",
                  gloss: "Top 10, highest first, scores included.",
                },
                {
                  cmd: "ZREVRANK",
                  args: "lb:chess:daily user:maya",
                  gloss: "Maya's place. 0 is first. Empty if she has never scored.",
                },
              ],
            },
            {
              type: "note",
              tone: "remember",
              text: "Around me: take the rank, then ZREVRANGE a few places either side. ZSCORE reads one score. ZCARD counts the board. Newer Redis spells the range as ZRANGE … REV.",
            },
          ],
        },
        {
          id: "redis-leaderboard-live",
          kicker: "In use",
          title: "A point lands",
          blocks: [
            {
              type: "prose",
              text: "Saturday chess. Five players. Each finished game is one ZINCRBY, and the board reorders itself.",
            },
            {
              type: "leaderboard",
              key: "lb:chess:daily",
              command: "ZINCRBY",
              players: [
                { id: "maya", name: "Maya", score: 128 },
                { id: "jules", name: "Jules", score: 121 },
                { id: "rafi", name: "Rafi", score: 110 },
                { id: "noor", name: "Noor", score: 96 },
                { id: "kenji", name: "Kenji", score: 80 },
              ],
              script: [
                { id: "noor", delta: 30, why: "Noor won on time" },
                { id: "jules", delta: 15, why: "Jules won a blitz game" },
                { id: "kenji", delta: 40, why: "Kenji took a queen and the match" },
                { id: "maya", delta: 25, why: "Maya beat the leader" },
                { id: "rafi", delta: 20, why: "Rafi drew a long game" },
                { id: "noor", delta: 20, why: "Noor won the rematch" },
                { id: "kenji", delta: 30, why: "Kenji is on a streak" },
                { id: "jules", delta: 20, why: "Jules closed the round" },
              ],
            },
          ],
        },
        {
          id: "redis-leaderboard-code",
          kicker: "The feature",
          title: "The whole write path",
          blocks: [
            {
              type: "code",
              lang: "javascript",
              caption: "New total back, the top ten, and Maya's place. Add 1 to the rank before you show it.",
              code: `const key = "lb:chess:daily";

const score = await redis.zIncrBy(
  key, 25, "user:maya",
);
const top = await redis.zRangeWithScores(
  key, 0, 9, { REV: true },
);
const rank = await redis.zRevRank(
  key, "user:maya",
);`,
            },
            {
              type: "list",
              items: [
                "Increment inside Redis. Do not read a score, add in your process, and write it back.",
                "REV, or ZREVRANGE, because a high score should come first.",
                "Rank is zero-based. A person wants to see 1st.",
              ],
            },
          ],
        },
        {
          id: "redis-leaderboard-edges",
          kicker: "Sharp edges",
          title: "Where boards go wrong",
          blocks: [
            {
              type: "pair",
              left: {
                label: "Loses a win",
                code: "ZSCORE, then ZADD the new total",
              },
              right: {
                label: "Keeps both",
                code: "ZINCRBY key 25 user:maya",
              },
            },
            {
              type: "prose",
              text: "Two games can finish in the same instant. Both read 100, both write 125, and one win is gone. ZINCRBY adds inside Redis, in one command.",
            },
            {
              type: "code",
              lang: "javascript",
              caption: "Equal scores break by member name, which is arbitrary. If earlier must rank higher, write the whole score. ZINCRBY would keep a stale time.",
              code: `const fraction = (1e13 - Date.now()) / 1e13;
const score = points + fraction;
await redis.zAdd(key, {
  score,
  value: member,
});
const shown = Math.floor(score);`,
            },
            {
              type: "list",
              items: [
                "A new day is a new key, lb:chess:2026-11-20, or EXPIRE the old one.",
                "The member is an id. The profile stays in your database.",
              ],
            },
          ],
        },
        {
          id: "redis-leaderboard-recall",
          kicker: "Before you close it",
          title: "Say it in one breath",
          blocks: [
            {
              type: "prose",
              text: "Cover the answer. If you hesitate, that is the line to reread.",
            },
            {
              type: "recall",
              items: [
                {
                  q: "What is the board?",
                  a: "A sorted set. One key, a member, and a score, already in order.",
                },
                {
                  q: "How do points land safely?",
                  a: "ZINCRBY. One atomic add. Not a read, then a write.",
                },
                {
                  q: "Top 10, highest first?",
                  a: "ZREVRANGE key 0 9 WITHSCORES",
                },
                {
                  q: "Where am I?",
                  a: "ZREVRANK key member. Zero is first. Add one for the screen.",
                },
                {
                  q: "Same score, earlier wins?",
                  a: "Put time in the fraction and ZADD the whole score. Show Math.floor.",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export default redis;
