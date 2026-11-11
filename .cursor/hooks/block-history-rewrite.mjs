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
const SHELL_NAMES = new Set(["sh", "bash", "zsh", "dash", "ksh"]);
const WRAPPER_NAMES = new Set(["command", "exec", "env"]);

const SHELL_LONG_OPTS_WITH_ARG = new Set([
  "rcfile",
  "init-file",
  "login",
]);

const GIT_GLOBALS_WITH_VALUE = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--exec-path",
]);

const GIT_GLOBALS_WITH_VALUE_EQ = new Set([
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--exec-path",
]);

const GIT_GLOBALS_BOOL = new Set([
  "-p",
  "-P",
  "--paginate",
  "--no-pager",
  "--bare",
  "--no-replace-objects",
  "--no-optional-locks",
  "--literal-pathspecs",
  "--glob-pathspecs",
  "--noglob-pathspecs",
  "--icase-pathspecs",
  "--version",
  "--help",
  "-h",
  "-v",
]);

const PULL_REBASE_TRUTHY = new Set([
  "true",
  "1",
  "yes",
  "on",
  "merges",
  "interactive",
]);
const PULL_REBASE_FALSY = new Set(["false", "0", "no", "off"]);

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
 * @param {string} segment
 */
function advanceQuoted(c, i, quote, text) {
  if (quote === "'") {
    if (c === "'") return { quote: null, i: i + 1, inQuote: true };
    return { quote, i: i + 1, inQuote: true };
  }
  if (quote === '"') {
    if (c === "\\" && i + 1 < text.length) {
      return { quote, i: i + 2, inQuote: true };
    }
    if (c === '"') return { quote: null, i: i + 1, inQuote: true };
    return { quote, i: i + 1, inQuote: true };
  }
  if (c === "'" || c === '"') {
    return { quote: c, i: i + 1, inQuote: true };
  }
  return { quote, i, inQuote: false };
}

function stripTrailingShellComment(segment) {
  let quote = null;
  for (let i = 0; i < segment.length; i += 1) {
    const c = segment[i];
    const next = advanceQuoted(c, i, quote, segment);
    if (next.inQuote) {
      quote = next.quote;
      i = next.i - 1;
      continue;
    }
    if (c === "#" && (i === 0 || /[ \t]/.test(segment[i - 1]))) {
      return segment.slice(0, i).trimEnd();
    }
  }
  return segment;
}

/**
 * @param {string} command
 */
function stripAllShellComments(command) {
  let quote = null;
  /** @type {string[]} */
  const parts = [];
  let start = 0;
  for (let i = 0; i < command.length; i += 1) {
    const c = command[i];
    const next = advanceQuoted(c, i, quote, command);
    if (next.inQuote) {
      quote = next.quote;
      i = next.i - 1;
      continue;
    }
    if (c === "#" && (i === 0 || /[ \t]/.test(command[i - 1]))) {
      parts.push(command.slice(start, i));
      while (i < command.length && command[i] !== "\n") {
        i += 1;
      }
      start = i;
      continue;
    }
  }
  parts.push(command.slice(start));
  return parts.join("").replace(/\n+$/, "");
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
  let groupDepth = 0;
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
    if (c === "{" || c === "(") {
      groupDepth += 1;
      i += 1;
      continue;
    }
    if (c === "}" || c === ")") {
      groupDepth = Math.max(0, groupDepth - 1);
      i += 1;
      continue;
    }
    if (c === "\\" && command[i + 1] === "\n") {
      i += 2;
      continue;
    }
    if (command.startsWith("&&", i)) {
      if (groupDepth > 0) {
        i += 2;
        continue;
      }
      pushSeg(i);
      start = i + 2;
      i += 2;
      continue;
    }
    if (command.startsWith("||", i)) {
      if (groupDepth > 0) {
        i += 2;
        continue;
      }
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
      if (groupDepth > 0) {
        i += 1;
        continue;
      }
      pushSeg(i);
      start = i + 1;
      i += 1;
      continue;
    }
    if (c === "&" && command[i + 1] !== "&") {
      if (groupDepth > 0) {
        i += 1;
        continue;
      }
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
    if (c === "\\" && i + 1 < segment.length) {
      const next = segment[i + 1];
      if (next === "\n") {
        i += 2;
        continue;
      }
      buf.push(next);
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
 * @param {string} configValue
 * @returns {boolean | null}
 */
function parsePullRebaseConfigValue(configValue) {
  const val = configValue.toLowerCase();
  if (PULL_REBASE_TRUTHY.has(val)) return true;
  if (PULL_REBASE_FALSY.has(val)) return false;
  return null;
}

/**
 * @param {string} nameEq
 */
function extractPullRebaseFromConfig(nameEq) {
  const eq = nameEq.indexOf("=");
  if (eq === -1) return null;
  const name = nameEq.slice(0, eq).trim().toLowerCase();
  if (name !== "pull.rebase") return null;
  return parsePullRebaseConfigValue(nameEq.slice(eq + 1).trim());
}

/**
 * @param {string} t
 * @returns {{ attached?: string, consumesNext?: boolean, pullRebase?: boolean | null, bool?: boolean, unknown?: boolean }}
 */
function classifyGitGlobalToken(t) {
  if (t === "--") {
    return { bool: true };
  }
  for (const g of GIT_GLOBALS_BOOL) {
    if (t === g) return { bool: true };
  }
  if (t.startsWith("-C") && t.length > 2) {
    return { bool: true };
  }
  if (t.startsWith("-c") && t.length > 2) {
    const val = extractPullRebaseFromConfig(t.slice(2));
    return { bool: true, pullRebase: val };
  }
  if (GIT_GLOBALS_WITH_VALUE.has(t)) {
    return { consumesNext: true };
  }
  for (const g of GIT_GLOBALS_WITH_VALUE_EQ) {
    if (t.startsWith(`${g}=`)) {
      return { bool: true };
    }
  }
  if (t.startsWith("-c") && t.includes("=")) {
    const val = extractPullRebaseFromConfig(t.slice(2));
    return { bool: true, pullRebase: val };
  }
  if (t.startsWith("--") && t.includes("=")) {
    const eq = t.indexOf("=");
    const head = t.slice(0, eq);
    if (
      GIT_GLOBALS_WITH_VALUE_EQ.has(head) ||
      GIT_GLOBALS_BOOL.has(head)
    ) {
      return { bool: true };
    }
    return { unknown: true };
  }
  if (t.startsWith("-") && !t.startsWith("--")) {
    const letters = t.slice(1);
    const allowed = new Set(["C", "c", "p", "P", "h", "v", "q"]);
    for (const ch of letters) {
      if (!allowed.has(ch)) {
        return { unknown: true };
      }
    }
    return { bool: true };
  }
  if (t.startsWith("--")) {
    return { unknown: true };
  }
  return { attached: t };
}

/**
 * @typedef {{ ok: false, reason: 'unknown' | 'malformed' }} GitParseFail
 * @typedef {{ ok: true, sub: string | null, rest: string[], pullRebaseConfig: boolean | null, informational?: boolean }} GitParseOk
 * @typedef {GitParseFail | GitParseOk} GitParseResult
 */

/**
 * @param {string[]} argv
 * @returns {GitParseResult}
 */
function parseGitInvocation(argv) {
  let i = 0;
  /** @type {boolean | null} */
  let pullRebaseConfig = null;

  while (i < argv.length) {
    const t = argv[i];
    if (t === "--") {
      i += 1;
      break;
    }
  if (!t.startsWith("-")) {
      return {
        ok: true,
        sub: t.toLowerCase(),
        rest: argv.slice(i + 1),
        pullRebaseConfig,
      };
    }

    const cls = classifyGitGlobalToken(t);
    if (cls.unknown) {
      return { ok: false, reason: "unknown" };
    }
    if (cls.attached) {
      return {
        ok: true,
        sub: cls.attached.toLowerCase(),
        rest: argv.slice(i + 1),
        pullRebaseConfig,
      };
    }
    if (cls.pullRebase !== undefined && cls.pullRebase !== null) {
      pullRebaseConfig = cls.pullRebase;
    }
    if (t.startsWith("-c") && t.length > 2) {
      const val = extractPullRebaseFromConfig(t.slice(2));
      if (val !== null) pullRebaseConfig = val;
    }
    if (t === "-c" || t === "-C") {
      if (i + 1 >= argv.length) {
        return { ok: false, reason: "malformed" };
      }
      const next = argv[i + 1];
      if (t === "-c") {
        const val = extractPullRebaseFromConfig(next);
        if (val !== null) pullRebaseConfig = val;
      }
      i += 2;
      continue;
    }
    if (cls.consumesNext) {
      if (i + 1 >= argv.length) {
        i += 1;
        continue;
      }
      if (t === "-c") {
        const val = extractPullRebaseFromConfig(argv[i + 1]);
        if (val !== null) pullRebaseConfig = val;
      }
      i += 2;
      continue;
    }
    i += 1;
  }

  if (i >= argv.length) {
    return {
      ok: true,
      sub: null,
      rest: [],
      pullRebaseConfig,
      informational: true,
    };
  }
  const sub = argv[i].toLowerCase();
  return {
    ok: true,
    sub,
    rest: argv.slice(i + 1),
    pullRebaseConfig,
  };
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
 * @param {string[]} args
 */
function gitPushDenied(args) {
  let plainForce = false;
  let hasLease = false;
  let hasIfIncludes = false;
  let i = 0;

  while (i < args.length) {
    const t = args[i];
    if (t === "--") break;
    if (t.startsWith("+")) return true;

    if (t === "--force-with-lease" || t.startsWith("--force-with-lease=")) {
      hasLease = true;
      i += 1;
      continue;
    }
    if (t === "--force-if-includes") {
      hasIfIncludes = true;
      i += 1;
      continue;
    }
    if (t === "--no-force") {
      plainForce = false;
      i += 1;
      continue;
    }
    if (t === "--force") {
      plainForce = true;
      i += 1;
      continue;
    }
    if (t.startsWith("--force=")) {
      const v = t.slice("--force=".length).toLowerCase();
      plainForce = !(v === "false" || v === "0" || v === "no");
      i += 1;
      continue;
    }
    if (t === "-o" || t === "--push-option") {
      i += 2;
      continue;
    }
    if (t.startsWith("--push-option=")) {
      i += 1;
      continue;
    }
    if (t === "--repo") {
      i += 2;
      continue;
    }
    if (t.startsWith("-") && !t.startsWith("--")) {
      let idx = 1;
      let sawO = false;
      while (idx < t.length) {
        const ch = t[idx];
        if (ch === "o") {
          sawO = true;
          break;
        }
        if (ch === "f") plainForce = true;
        idx += 1;
      }
      if (sawO && idx + 1 < t.length) {
        i += 1;
        continue;
      }
      if (sawO) {
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    i += 1;
  }

  if (hasLease || hasIfIncludes) return true;
  return plainForce;
}

/**
 * @param {string[]} args
 * @param {boolean | null} pullRebaseConfig
 */
function gitPullDenied(args, pullRebaseConfig) {
  /** @type {'rebase' | 'no-rebase' | null} */
  let explicit = null;
  let pastTerminator = false;

  for (const t of args) {
    if (t === "--") {
      pastTerminator = true;
      continue;
    }
    if (pastTerminator) continue;

    if (t === "--no-rebase" || t === "--rebase=false") {
      explicit = "no-rebase";
      continue;
    }
    if (t === "--rebase" || t === "-r") {
      explicit = "rebase";
      continue;
    }
    if (t.startsWith("--rebase=") && t !== "--rebase=false") {
      explicit = "rebase";
      continue;
    }
    if (t.startsWith("-") && !t.startsWith("--") && t.includes("r")) {
      let hasO = false;
      for (const ch of t.slice(1)) {
        if (ch === "o") hasO = true;
      }
      if (!hasO || t === "-r" || t === "-qr" || /r/.test(t)) {
        if (t.includes("r") && !t.startsWith("-o")) {
          explicit = "rebase";
        }
      }
    }
  }

  if (explicit === "rebase") return true;
  if (explicit === "no-rebase") return false;
  return pullRebaseConfig === true;
}

/**
 * @param {GitParseOk} parsed
 */
function gitSubcommandDenied(parsed) {
  const { sub, rest, pullRebaseConfig } = parsed;
  if (sub === null) return false;
  if (sub === "commit") return gitCommitDenied(rest);
  if (sub === "push") return gitPushDenied(rest);
  if (sub === "rebase") return true;
  if (sub === "pull") return gitPullDenied(rest, pullRebaseConfig);
  return false;
}

/**
 * @param {string[]} argv
 */
function gitArgvRewriteDenied(argv) {
  const parsed = parseGitInvocation(argv);
  if (!parsed.ok) return "unknown";
  return gitSubcommandDenied(parsed) ? "rewrite" : false;
}

/**
 * @param {string[]} argv
 */
function skipEnvOptions(argv) {
  let i = 0;
  while (i < argv.length) {
    const t = argv[i];
    if (t === "--") {
      return argv.slice(i + 1);
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t)) {
      i += 1;
      continue;
    }
    if (t === "-i" || t === "-0" || t === "--ignore-environment") {
      i += 1;
      continue;
    }
    if (t === "-u" || t === "--unset") {
      i += 2;
      continue;
    }
    if (t.startsWith("--unset=")) {
      i += 1;
      continue;
    }
    if (t === "-C" || t === "--chdir") {
      i += 2;
      continue;
    }
    if (t.startsWith("--chdir=")) {
      i += 1;
      continue;
    }
    if (t.startsWith("-") && t !== "--") {
      i += 1;
      continue;
    }
    break;
  }
  return argv.slice(i);
}

/**
 * @param {string[]} argv
 */
function skipCommandOptions(argv) {
  let i = 0;
  while (i < argv.length) {
    const t = argv[i];
    if (t === "-p" || t === "-v" || t === "-V") {
      i += 1;
      continue;
    }
    if (t === "--") {
      return argv.slice(i + 1);
    }
    if (t.startsWith("-")) {
      i += 1;
      continue;
    }
    break;
  }
  return argv.slice(i);
}

/**
 * @param {string[]} argv
 */
function skipExecOptions(argv) {
  let i = 0;
  while (i < argv.length) {
    const t = argv[i];
    if (t === "-a") {
      i += 2;
      continue;
    }
    if (t === "-l") {
      i += 1;
      continue;
    }
    if (t.startsWith("-") && t !== "--") {
      i += 1;
      continue;
    }
    break;
  }
  return argv.slice(i);
}

/**
 * @param {string[]} words
 */
function peelWrapperArgv(words) {
  let argv = stripAssignmentPrefixes(words);
  for (let guard = 0; guard < 16; guard += 1) {
    if (argv.length === 0) break;
    const base = basenameOnly(argv[0]).toLowerCase();
    if (base === "env") {
      argv = skipEnvOptions(argv.slice(1));
      continue;
    }
    if (base === "command") {
      argv = skipCommandOptions(argv.slice(1));
      continue;
    }
    if (base === "exec") {
      argv = skipExecOptions(argv.slice(1));
      continue;
    }
    break;
  }
  return argv;
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
    if (t.startsWith("--")) {
      const name = t.slice(2).split("=")[0];
      if (SHELL_LONG_OPTS_WITH_ARG.has(name)) {
        if (t.includes("=")) {
          continue;
        }
        i += 1;
      }
      continue;
    }
    if (t === "-c" || t === "-lc") {
      sawC = true;
      if (i + 1 < argv.length) script = argv[i + 1];
      break;
    }
    if (t.startsWith("-") && !t.startsWith("--")) {
      const body = t.slice(1);
      if (body.includes("c")) {
        sawC = true;
        if (i + 1 < argv.length) script = argv[i + 1];
        break;
      }
    }
  }
  if (!sawC) return undefined;
  return script ?? "";
}

/**
 * @param {string[]} words
 * @returns {{ targets: { type: 'argv', argv: string[] } | { type: 'script', script: string }[] }}
 */
function expandWordsToTargets(words) {
  const argv = peelWrapperArgv(words);
  if (argv.length === 0) {
    return { targets: [] };
  }

  const base = basenameOnly(argv[0]).toLowerCase();
  if (SHELL_NAMES.has(base)) {
    const script = extractShellDashCScript(argv);
    if (script === undefined) {
      return { targets: [{ type: "argv", argv }] };
    }
    return { targets: [{ type: "script", script }] };
  }

  if (base === "eval" && argv.length > 1) {
    return {
      targets: [{ type: "script", script: argv.slice(1).join(" ") }],
    };
  }

  return { targets: [{ type: "argv", argv }] };
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
 * @param {string} s
 * @param {string} openCh
 * @param {string} closeCh
 * @returns {string | null}
 */
function extractOuterDelimitedInterior(s, openCh, closeCh) {
  let quote = null;
  let depth = 0;
  let started = false;
  for (let i = 0; i < s.length; i += 1) {
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
    if (c === openCh) {
      if (depth === 0) started = i === 0;
      depth += 1;
      continue;
    }
    if (c === closeCh) {
      depth -= 1;
      if (depth === 0 && started && i === s.length - 1) {
        return s.slice(1, i).trim();
      }
    }
  }
  return null;
}

/**
 * @param {string} segment
 * @returns {string | null}
 */
function extractBalancedGroupInterior(segment) {
  const s = segment.trim();
  if (s.startsWith("((") && s.endsWith("))")) {
    return s.slice(2, -2).trim();
  }
  const parenInner = extractOuterDelimitedInterior(s, "(", ")");
  if (parenInner !== null) return parenInner;
  let braceInner = extractOuterDelimitedInterior(s, "{", "}");
  if (braceInner !== null) {
    braceInner = braceInner.replace(/;+\s*$/, "").trim();
    return braceInner;
  }
  return null;
}

/**
 * @param {string} segment
 * @param {number} depth
 * @returns {ClassifyResult | null}
 */
function analyzeSegment(segment, depth = 0) {
  const withoutComment = stripTrailingShellComment(segment);
  const trimmed = withoutComment.trim();
  const groupInner = extractBalancedGroupInterior(trimmed);
  if (groupInner !== null) {
    if (depth > MAX_SUBSTITUTION_DEPTH) {
      return deny("malformed");
    }
    const inner = classifyShellCommand(groupInner, depth + 1, true);
    if (inner.permission === "deny") return inner;
    return null;
  }

  const { ok, words } = tokenizeWords(trimmed);
  if (!ok) return deny("malformed");
  const { targets } = expandWordsToTargets(words);

  for (const target of targets) {
    if (target.type === "script") {
      const inner = classifyShellCommand(target.script, 0, true);
      if (inner.permission === "deny") return inner;
      continue;
    }
    if (!isGitArgv(target.argv)) continue;
    const gitArgs = target.argv.slice(1);
    const verdict = gitArgvRewriteDenied(gitArgs);
    if (verdict === "unknown" || verdict === "malformed") return deny("malformed");
    if (verdict === "rewrite") return deny("rewrite");
  }
  return null;
}

/**
 * @param {string} command
 * @param {number} depth
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
      if (c === '"') {
        quote = null;
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
 * @param {boolean} [_nested]
 * @returns {ClassifyResult}
 */
export function classifyShellCommand(command, substitutionDepth = 0, _nested = false) {
  if (typeof command !== "string") {
    return deny("malformed");
  }
  if (command.trim() === "") {
    return allow();
  }
  if (!quotesBalanced(command)) {
    return deny("malformed");
  }

  const sansComment = stripAllShellComments(command);
  const subScan = scanSubstitutions(sansComment, substitutionDepth);
  if (subScan && subScan.permission === "deny") {
    return subScan;
  }

  const segments = splitChainSegments(sansComment);
  for (const segment of segments) {
    const result = analyzeSegment(segment, substitutionDepth);
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
