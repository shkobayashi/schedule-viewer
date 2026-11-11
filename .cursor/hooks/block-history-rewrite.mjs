/**
 * Issue #553 item 6: deny shell commands that rewrite git history.
 * Pure classifier plus stdin wrapper — never executes the supplied command.
 */
import { pathToFileURL } from "node:url";

/** @typedef {{ permission: 'allow' | 'deny', agent_message?: string, reason?: string }} ClassifyResult */

const DENY_AGENT_MESSAGE =
  "履歴を書き換える git 操作（commit --amend、force push、rebase、pull --rebase など）は、このリポジトリの beforeShellExecution hook で拒否されています。通常の status、commit、push、merge は利用できます。";

const MALFORMED_AGENT_MESSAGE =
  "シェルコマンドの解析に失敗したため、このコマンドは拒否されました。";

const MAX_SUBSTITUTION_DEPTH = 8;
const SHELL_NAMES = new Set(["sh", "bash", "zsh"]);
const WRAPPER_NAMES = new Set(["command", "exec", "env"]);

/**
 * @param {string} [reason]
 * @returns {ClassifyResult}
 */
function deny(reason) {
  return {
    permission: "deny",
    agent_message: reason === "malformed" ? MALFORMED_AGENT_MESSAGE : DENY_AGENT_MESSAGE,
    reason,
  };
}

/** @returns {ClassifyResult} */
function allow() {
  return { permission: "allow" };
}

/**
 * @param {string} word
 */
function basenameOnly(word) {
  const idx = Math.max(word.lastIndexOf("/"), word.lastIndexOf("\\"));
  return idx === -1 ? word : word.slice(idx + 1);
}

/**
 * @param {string} command
 */
function quotesBalanced(command) {
  let quote = null;
  for (let i = 0; i < command.length; i += 1) {
    const c = command[i];
    if (quote === "'") {
      if (c === "'") quote = null;
      continue;
    }
    if (quote === '"') {
      if (c === "\\" && i + 1 < command.length) {
        i += 1;
        continue;
      }
      if (c === '"') quote = null;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
    }
  }
  return quote === null;
}

/**
 * @param {string} command
 * @returns {string[]}
 */
function splitChainSegments(command) {
  /** @type {string[]} */
  const segments = [];
  let start = 0;
  let quote = null;
  let i = 0;

  const pushSeg = (end) => {
    const seg = command.slice(start, end);
    if (seg.trim() !== "") {
      segments.push(seg);
    }
  };

  while (i < command.length) {
    const c = command[i];
    if (quote === "'") {
      if (c === "'") quote = null;
      i += 1;
      continue;
    }
    if (quote === '"') {
      if (c === "\\" && i + 1 < command.length) {
        i += 2;
        continue;
      }
      if (c === '"') quote = null;
      i += 1;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      i += 1;
      continue;
    }
    if (c === "\\" && command[i + 1] === "\n") {
      i += 2;
      continue;
    }
    if (command.startsWith("&&", i)) {
      pushSeg(i);
      start = i + 2;
      i += 2;
      continue;
    }
    if (command.startsWith("||", i)) {
      pushSeg(i);
      start = i + 2;
      i += 2;
      continue;
    }
    if (command.startsWith(";;", i)) {
      i += 2;
      continue;
    }
    if (c === ";" || c === "\n" || c === "|") {
      pushSeg(i);
      start = i + 1;
      i += 1;
      continue;
    }
    if (c === "&" && command[i + 1] !== "&") {
      pushSeg(i);
      start = i + 1;
      i += 1;
      continue;
    }
    i += 1;
  }
  pushSeg(command.length);
  return segments;
}

/**
 * @param {string} segment
 * @returns {{ ok: boolean, words?: string[] }}
 */
function tokenizeWords(segment) {
  /** @type {string[]} */
  const words = [];
  let i = 0;
  let quote = null;
  /** @type {string[]} */
  let buf = [];

  const flush = () => {
    if (buf.length > 0) {
      words.push(buf.join(""));
      buf = [];
    }
  };

  while (i < segment.length) {
    const c = segment[i];
    if (quote === "'") {
      if (c === "'") {
        quote = null;
        flush();
      } else {
        buf.push(c);
      }
      i += 1;
      continue;
    }
    if (quote === '"') {
      if (c === "\\" && i + 1 < segment.length) {
        buf.push(segment[i + 1]);
        i += 2;
        continue;
      }
      if (c === '"') {
        quote = null;
        flush();
        i += 1;
        continue;
      }
      buf.push(c);
      i += 1;
      continue;
    }
    if (c === "'" || c === '"') {
      flush();
      quote = c;
      i += 1;
      continue;
    }
    if (c === "\\" && segment[i + 1] === "\n") {
      i += 2;
      continue;
    }
    if (/[ \t]/.test(c)) {
      flush();
      i += 1;
      continue;
    }
    buf.push(c);
    i += 1;
  }
  if (quote !== null) {
    return { ok: false };
  }
  flush();
  return { ok: true, words };
}

/**
 * @param {string[]} words
 * @returns {string[]}
 */
function stripAssignmentPrefixes(words) {
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (w === "export" || w === "declare" || w === "typeset") {
      i += 1;
      continue;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w)) {
      i += 1;
      continue;
    }
    break;
  }
  return words.slice(i);
}

/**
 * @param {string[]} argv
 * @param {number} i
 */
function isGitGlobalOption(argv, i) {
  const t = argv[i];
  if (t === "-C" || t === "-c") return true;
  if (
    t === "--git-dir" ||
    t === "--work-tree" ||
    t === "--namespace" ||
    t === "--paginate" ||
    t === "--no-pager" ||
    t === "--bare"
  ) {
    return true;
  }
  if (
    t.startsWith("--git-dir=") ||
    t.startsWith("--work-tree=") ||
    t.startsWith("--namespace=")
  ) {
    return true;
  }
  return false;
}

/**
 * @param {string[]} argv
 * @param {number} i
 */
function consumeGitGlobalOption(argv, i) {
  const t = argv[i];
  if (t === "-C" || t === "-c" || t === "--git-dir" || t === "--work-tree" || t === "--namespace") {
    return i + 2 <= argv.length ? i + 2 : i + 1;
  }
  return i + 1;
}

/**
 * @param {string[]} argv
 * @returns {{ sub: string, rest: string[] } | null}
 */
function parseGitInvocation(argv) {
  let i = 0;
  while (i < argv.length) {
    const t = argv[i];
    if (t === "--") {
      return null;
    }
    if (isGitGlobalOption(argv, i)) {
      i = consumeGitGlobalOption(argv, i);
      continue;
    }
    if (t.startsWith("-")) {
      return null;
    }
    return { sub: t.toLowerCase(), rest: argv.slice(i + 1) };
  }
  return null;
}

/**
 * @param {string[]} args
 */
function gitCommitDenied(args) {
  let i = 0;
  while (i < args.length) {
    const t = args[i];
    if (t === "--") break;
    if (t === "--amend" || t.startsWith("--amend=")) return true;
    if (t === "-m" || t === "--message" || t === "--author" || t === "--date") {
      i += 2;
      continue;
    }
    if (t.startsWith("-m") && t.length > 2) {
      i += 1;
      continue;
    }
    if (t === "--file" || t === "-F") {
      i += 2;
      continue;
    }
    if (t.startsWith("--") || (t.startsWith("-") && t.length > 1)) {
      i += 1;
      continue;
    }
    i += 1;
  }
  return false;
}

/**
 * @param {string} flag
 */
function pushForceTokenDenied(flag) {
  if (flag === "--force") return true;
  if (flag.startsWith("--force-with-lease")) return true;
  if (flag.startsWith("--force-if-includes")) return true;
  return false;
}

/**
 * @param {string[]} args
 */
function gitPushDenied(args) {
  let i = 0;
  while (i < args.length) {
    const t = args[i];
    if (t === "--") break;
    if (pushForceTokenDenied(t)) return true;
    if (t === "-o" || t === "--repo") {
      i += 2;
      continue;
    }
    if (t.startsWith("-") && !t.startsWith("--")) {
      if (t.includes("f")) return true;
      i += 1;
      continue;
    }
    if (t.startsWith("+")) return true;
    i += 1;
  }
  return false;
}

/**
 * @param {string[]} args
 */
function gitPullDenied(args) {
  let wantsRebase = false;
  let blocksRebase = false;
  for (const t of args) {
    if (t === "--no-rebase" || t === "--rebase=false") {
      blocksRebase = true;
    }
    if (t === "--rebase" || t === "-r") {
      wantsRebase = true;
    }
    if (t.startsWith("--rebase=") && t !== "--rebase=false") {
      wantsRebase = true;
    }
  }
  return wantsRebase && !blocksRebase;
}

/**
 * @param {string[]} argv
 */
function gitArgvRewriteDenied(argv) {
  const parsed = parseGitInvocation(argv);
  if (!parsed) return false;
  const { sub, rest } = parsed;
  if (sub === "commit") return gitCommitDenied(rest);
  if (sub === "push") return gitPushDenied(rest);
  if (sub === "rebase") return true;
  if (sub === "pull") return gitPullDenied(rest);
  return false;
}

/**
 * @param {string[]} words
 * @returns {{ ok: boolean, targets: { type: 'argv', argv: string[] } | { type: 'script', script: string }[] }}
 */
function expandWordsToTargets(words) {
  if (words.length === 0) {
    return { ok: true, targets: [] };
  }
  let argv = words;
  const head = argv[0].toLowerCase();
  if (WRAPPER_NAMES.has(head)) {
    argv = argv.slice(1);
  }
  if (argv.length === 0) {
    return { ok: true, targets: [] };
  }

  const base = basenameOnly(argv[0]).toLowerCase();
  if (SHELL_NAMES.has(base)) {
    const script = extractShellDashCScript(argv);
    if (script === undefined) {
      return { ok: true, targets: [{ type: "argv", argv }] };
    }
    return { ok: true, targets: [{ type: "script", script }] };
  }

  if (head === "eval" && argv.length > 1) {
    return {
      ok: true,
      targets: [{ type: "script", script: argv.slice(1).join(" ") }],
    };
  }

  return { ok: true, targets: [{ type: "argv", argv }] };
}

/**
 * @param {string[]} argv
 * @returns {string | undefined | null} script string, undefined if not -c form, null if malformed -c
 */
function extractShellDashCScript(argv) {
  /** @type {string | null} */
  let script = null;
  let sawC = false;
  for (let i = 1; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === "-c" || t === "-lc") {
      sawC = true;
      if (i + 1 < argv.length) {
        script = argv[i + 1];
      }
      break;
    }
    if (t.startsWith("-") && t.includes("c") && t.length > 2) {
      sawC = true;
      script = argv[i + 1] ?? "";
      break;
    }
  }
  if (!sawC) return undefined;
  return script ?? "";
}

/**
 * @param {string[]} argv
 */
function isGitArgv(argv) {
  if (argv.length === 0) return false;
  const base = basenameOnly(argv[0]).toLowerCase();
  return base === "git" || base === "git.exe";
}

/**
 * @param {string} segment
 * @returns {ClassifyResult | null}
 */
function analyzeSegment(segment) {
  const { ok, words } = tokenizeWords(segment.trim());
  if (!ok) return deny("malformed");
  const stripped = stripAssignmentPrefixes(words);
  const { ok: expandOk, targets } = expandWordsToTargets(stripped);
  if (!expandOk) return deny("malformed");

  for (const target of targets) {
    if (target.type === "script") {
      const inner = classifyShellCommand(target.script, 0, true);
      if (inner.permission === "deny") return inner;
      continue;
    }
    if (!isGitArgv(target.argv)) continue;
    const gitArgs = target.argv.slice(1);
    if (gitArgvRewriteDenied(gitArgs)) {
      return deny("rewrite");
    }
  }
  return null;
}

/**
 * @param {string} command
 * @param {number} depth
 * @param {boolean} inner
 * @returns {ClassifyResult | null}
 */
function scanSubstitutions(command, depth = 0) {
  if (depth > MAX_SUBSTITUTION_DEPTH) return null;
  let quote = null;
  let i = 0;
  while (i < command.length) {
    const c = command[i];
    if (quote === "'") {
      if (c === "'") quote = null;
      i += 1;
      continue;
    }
    if (quote === '"') {
      if (c === "\\" && i + 1 < command.length) {
        i += 2;
        continue;
      }
      if (c === '"') quote = null;
      i += 1;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      i += 1;
      continue;
    }
    if (command.startsWith("$(", i)) {
      const close = findClosingParen(command, i + 2);
      if (close === -1) return deny("malformed");
      const innerText = command.slice(i + 2, close);
      const nested = classifyShellCommand(innerText, depth + 1, true);
      if (nested.permission === "deny") return nested;
      i = close + 1;
      continue;
    }
    if (c === "`") {
      const close = command.indexOf("`", i + 1);
      if (close === -1) return deny("malformed");
      const innerText = command.slice(i + 1, close);
      const nested = classifyShellCommand(innerText, depth + 1, true);
      if (nested.permission === "deny") return nested;
      i = close + 1;
      continue;
    }
    i += 1;
  }
  return null;
}

/**
 * @param {string} s
 * @param {number} start
 */
function findClosingParen(s, start) {
  let quote = null;
  let depth = 1;
  for (let i = start; i < s.length; i += 1) {
    const c = s[i];
    if (quote === "'") {
      if (c === "'") quote = null;
      continue;
    }
    if (quote === '"') {
      if (c === "\\" && i + 1 < s.length) {
        i += 1;
        continue;
      }
      if (c === '"') quote = null;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      continue;
    }
    if (c === "(") depth += 1;
    if (c === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Classify a full shell command string for history-rewriting git operations.
 *
 * Empty or whitespace-only commands are allowed (nothing substantive to run).
 * Unbalanced quotes and hook-level malformed input map to deny.
 *
 * @param {string} command
 * @param {number} [substitutionDepth]
 * @param {boolean} [nested]
 * @returns {ClassifyResult}
 */
export function classifyShellCommand(command, substitutionDepth = 0, nested = false) {
  if (typeof command !== "string") {
    return deny("malformed");
  }
  if (command.trim() === "") {
    return allow();
  }
  if (!quotesBalanced(command)) {
    return deny("malformed");
  }

  const subScan = scanSubstitutions(command, substitutionDepth);
  if (subScan && subScan.permission === "deny") {
    return subScan;
  }

  const segments = splitChainSegments(command);
  for (const segment of segments) {
    const result = analyzeSegment(segment);
    if (result) return result;
  }

  return allow();
}

/**
 * @param {unknown} input
 * @returns {ClassifyResult}
 */
export function classifyHookInput(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return deny("malformed");
  }
  const { command } = /** @type {{ command?: unknown }} */ (input);
  if (typeof command !== "string") {
    return deny("malformed");
  }
  return classifyShellCommand(command);
}

/**
 * @param {ClassifyResult} result
 */
export function formatHookStdout(result) {
  /** @type {{ permission: string, agent_message?: string }} */
  const payload = { permission: result.permission };
  if (result.agent_message) {
    payload.agent_message = result.agent_message;
  }
  return `${JSON.stringify(payload)}\n`;
}

async function runHookCli() {
  let raw = "";
  for await (const chunk of process.stdin) {
    raw += chunk;
  }
  let parsed;
  try {
    parsed = raw.trim() === "" ? null : JSON.parse(raw);
  } catch {
    parsed = null;
  }
  const result = classifyHookInput(parsed);
  process.stdout.write(formatHookStdout(result));
  process.exit(0);
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  runHookCli();
}
