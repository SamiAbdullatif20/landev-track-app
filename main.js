var Bp = Object.defineProperty;
var Mp = (e, t, n) => t in e ? Bp(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var N = (e, t, n) => Mp(e, typeof t != "symbol" ? t + "" : t, n);
import qp, { app as J, safeStorage as ht, session as Ea, screen as Hp, desktopCapturer as Vp, ipcMain as ie, BrowserWindow as Hc, nativeImage as Zp } from "electron";
import { fileURLToPath as Wp } from "node:url";
import Y from "node:path";
import ce from "node:fs";
import gt from "fs";
import nt, { resolve as _a } from "path";
import fn from "os";
import As from "crypto";
import vt from "util";
import xe, { Readable as Gp } from "stream";
import Br from "http";
import Mr from "https";
import ks from "url";
import Vc from "http2";
import Jp from "assert";
import Zc from "tty";
import ut from "zlib";
import Wc, { EventEmitter as Kp } from "events";
import { randomUUID as Dn, createHash as Xp } from "node:crypto";
import Gc from "child_process";
import Yp from "better-sqlite3";
import { execFile as Qp, spawnSync as zn } from "node:child_process";
import ed, { promisify as td } from "node:util";
import Ts from "node:stream";
import { createRequire as Jc } from "node:module";
import nd from "node:events";
import { availableParallelism as rd } from "node:os";
function Nt(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var rt = { exports: {} };
const es = gt, kr = nt, id = fn, sd = As, Sa = [
  "◈ encrypted .env [www.dotenvx.com]",
  "◈ secrets for agents [www.dotenvx.com]",
  "⌁ auth for agents [www.vestauth.com]",
  "⌘ custom filepath { path: '/custom/path/.env' }",
  "⌘ enable debugging { debug: true }",
  "⌘ override existing { override: true }",
  "⌘ suppress logs { quiet: true }",
  "⌘ multiple files { path: ['.env.local', '.env'] }"
];
function ad() {
  return Sa[Math.floor(Math.random() * Sa.length)];
}
function Gt(e) {
  return typeof e == "string" ? !["false", "0", "no", "off", ""].includes(e.toLowerCase()) : !!e;
}
function od() {
  return process.stdout.isTTY;
}
function cd(e) {
  return od() ? `\x1B[2m${e}\x1B[0m` : e;
}
const ld = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
function ud(e) {
  const t = {};
  let n = e.toString();
  n = n.replace(/\r\n?/mg, `
`);
  let r;
  for (; (r = ld.exec(n)) != null; ) {
    const i = r[1];
    let s = r[2] || "";
    s = s.trim();
    const a = s[0];
    s = s.replace(/^(['"`])([\s\S]*)\1$/mg, "$2"), a === '"' && (s = s.replace(/\\n/g, `
`), s = s.replace(/\\r/g, "\r")), t[i] = s;
  }
  return t;
}
function pd(e) {
  e = e || {};
  const t = Yc(e);
  e.path = t;
  const n = he.configDotenv(e);
  if (!n.parsed) {
    const a = new Error(`MISSING_DATA: Cannot parse ${t} for an unknown reason`);
    throw a.code = "MISSING_DATA", a;
  }
  const r = Xc(e).split(","), i = r.length;
  let s;
  for (let a = 0; a < i; a++)
    try {
      const c = r[a].trim(), l = fd(n, c);
      s = he.decrypt(l.ciphertext, l.key);
      break;
    } catch (c) {
      if (a + 1 >= i)
        throw c;
    }
  return he.parse(s);
}
function dd(e) {
  console.error(`⚠ ${e}`);
}
function Tn(e) {
  console.log(`┆ ${e}`);
}
function Kc(e) {
  console.log(`◇ ${e}`);
}
function Xc(e) {
  return e && e.DOTENV_KEY && e.DOTENV_KEY.length > 0 ? e.DOTENV_KEY : process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0 ? process.env.DOTENV_KEY : "";
}
function fd(e, t) {
  let n;
  try {
    n = new URL(t);
  } catch (c) {
    if (c.code === "ERR_INVALID_URL") {
      const l = new Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");
      throw l.code = "INVALID_DOTENV_KEY", l;
    }
    throw c;
  }
  const r = n.password;
  if (!r) {
    const c = new Error("INVALID_DOTENV_KEY: Missing key part");
    throw c.code = "INVALID_DOTENV_KEY", c;
  }
  const i = n.searchParams.get("environment");
  if (!i) {
    const c = new Error("INVALID_DOTENV_KEY: Missing environment part");
    throw c.code = "INVALID_DOTENV_KEY", c;
  }
  const s = `DOTENV_VAULT_${i.toUpperCase()}`, a = e.parsed[s];
  if (!a) {
    const c = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${s} in your .env.vault file.`);
    throw c.code = "NOT_FOUND_DOTENV_ENVIRONMENT", c;
  }
  return { ciphertext: a, key: r };
}
function Yc(e) {
  let t = null;
  if (e && e.path && e.path.length > 0)
    if (Array.isArray(e.path))
      for (const n of e.path)
        es.existsSync(n) && (t = n.endsWith(".vault") ? n : `${n}.vault`);
    else
      t = e.path.endsWith(".vault") ? e.path : `${e.path}.vault`;
  else
    t = kr.resolve(process.cwd(), ".env.vault");
  return es.existsSync(t) ? t : null;
}
function Aa(e) {
  return e[0] === "~" ? kr.join(id.homedir(), e.slice(1)) : e;
}
function md(e) {
  const t = Gt(process.env.DOTENV_CONFIG_DEBUG || e && e.debug), n = Gt(process.env.DOTENV_CONFIG_QUIET || e && e.quiet);
  (t || !n) && Kc("loading env from encrypted .env.vault");
  const r = he._parseVault(e);
  let i = process.env;
  return e && e.processEnv != null && (i = e.processEnv), he.populate(i, r, e), { parsed: r };
}
function hd(e) {
  const t = kr.resolve(process.cwd(), ".env");
  let n = "utf8", r = process.env;
  e && e.processEnv != null && (r = e.processEnv);
  let i = Gt(r.DOTENV_CONFIG_DEBUG || e && e.debug), s = Gt(r.DOTENV_CONFIG_QUIET || e && e.quiet);
  e && e.encoding ? n = e.encoding : i && Tn("no encoding is specified (UTF-8 is used by default)");
  let a = [t];
  if (e && e.path)
    if (!Array.isArray(e.path))
      a = [Aa(e.path)];
    else {
      a = [];
      for (const u of e.path)
        a.push(Aa(u));
    }
  let c;
  const l = {};
  for (const u of a)
    try {
      const d = he.parse(es.readFileSync(u, { encoding: n }));
      he.populate(l, d, e);
    } catch (d) {
      i && Tn(`failed to load ${u} ${d.message}`), c = d;
    }
  const p = he.populate(r, l, e);
  if (i = Gt(r.DOTENV_CONFIG_DEBUG || i), s = Gt(r.DOTENV_CONFIG_QUIET || s), i || !s) {
    const u = Object.keys(p).length, d = [];
    for (const f of a)
      try {
        const m = kr.relative(process.cwd(), f);
        d.push(m);
      } catch (m) {
        i && Tn(`failed to load ${f} ${m.message}`), c = m;
      }
    Kc(`injected env (${u}) from ${d.join(",")} ${cd(`// tip: ${ad()}`)}`);
  }
  return c ? { parsed: l, error: c } : { parsed: l };
}
function gd(e) {
  if (Xc(e).length === 0)
    return he.configDotenv(e);
  const t = Yc(e);
  return t ? he._configVault(e) : (dd(`you set DOTENV_KEY but you are missing a .env.vault file at ${t}`), he.configDotenv(e));
}
function vd(e, t) {
  const n = Buffer.from(t.slice(-64), "hex");
  let r = Buffer.from(e, "base64");
  const i = r.subarray(0, 12), s = r.subarray(-16);
  r = r.subarray(12, -16);
  try {
    const a = sd.createDecipheriv("aes-256-gcm", n, i);
    return a.setAuthTag(s), `${a.update(r)}${a.final()}`;
  } catch (a) {
    const c = a instanceof RangeError, l = a.message === "Invalid key length", p = a.message === "Unsupported state or unable to authenticate data";
    if (c || l) {
      const u = new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");
      throw u.code = "INVALID_DOTENV_KEY", u;
    } else if (p) {
      const u = new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
      throw u.code = "DECRYPTION_FAILED", u;
    } else
      throw a;
  }
}
function bd(e, t, n = {}) {
  const r = !!(n && n.debug), i = !!(n && n.override), s = {};
  if (typeof t != "object") {
    const a = new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
    throw a.code = "OBJECT_REQUIRED", a;
  }
  for (const a of Object.keys(t))
    Object.prototype.hasOwnProperty.call(e, a) ? (i === !0 && (e[a] = t[a], s[a] = t[a]), r && Tn(i === !0 ? `"${a}" is already defined and WAS overwritten` : `"${a}" is already defined and was NOT overwritten`)) : (e[a] = t[a], s[a] = t[a]);
  return s;
}
const he = {
  configDotenv: hd,
  _configVault: md,
  _parseVault: pd,
  config: gd,
  decrypt: vd,
  parse: ud,
  populate: bd
};
rt.exports.configDotenv = he.configDotenv;
rt.exports._configVault = he._configVault;
rt.exports._parseVault = he._parseVault;
rt.exports.config = he.config;
rt.exports.decrypt = he.decrypt;
rt.exports.parse = he.parse;
rt.exports.populate = he.populate;
rt.exports = he;
var xd = rt.exports;
const yd = /* @__PURE__ */ Nt(xd);
var ka;
function w(e, t, n) {
  function r(c, l) {
    if (c._zod || Object.defineProperty(c, "_zod", {
      value: {
        def: l,
        constr: a,
        traits: /* @__PURE__ */ new Set()
      },
      enumerable: !1
    }), c._zod.traits.has(e))
      return;
    c._zod.traits.add(e), t(c, l);
    const p = a.prototype, u = Object.keys(p);
    for (let d = 0; d < u.length; d++) {
      const f = u[d];
      f in c || (c[f] = p[f].bind(c));
    }
  }
  const i = (n == null ? void 0 : n.Parent) ?? Object;
  class s extends i {
  }
  Object.defineProperty(s, "name", { value: e });
  function a(c) {
    var l;
    const p = n != null && n.Parent ? new s() : this;
    r(p, c), (l = p._zod).deferred ?? (l.deferred = []);
    for (const u of p._zod.deferred)
      u();
    return p;
  }
  return Object.defineProperty(a, "init", { value: r }), Object.defineProperty(a, Symbol.hasInstance, {
    value: (c) => {
      var l, p;
      return n != null && n.Parent && c instanceof n.Parent ? !0 : (p = (l = c == null ? void 0 : c._zod) == null ? void 0 : l.traits) == null ? void 0 : p.has(e);
    }
  }), Object.defineProperty(a, "name", { value: e }), a;
}
class Qt extends Error {
  constructor() {
    super("Encountered Promise during synchronous parse. Use .parseAsync() instead.");
  }
}
class Qc extends Error {
  constructor(t) {
    super(`Encountered unidirectional transform during encode: ${t}`), this.name = "ZodEncodeError";
  }
}
(ka = globalThis).__zod_globalConfig ?? (ka.__zod_globalConfig = {});
const Ps = globalThis.__zod_globalConfig;
function Tt(e) {
  return Ps;
}
function el(e) {
  const t = Object.values(e).filter((r) => typeof r == "number");
  return Object.entries(e).filter(([r, i]) => t.indexOf(+r) === -1).map(([r, i]) => i);
}
function ts(e, t) {
  return typeof t == "bigint" ? t.toString() : t;
}
function Rs(e) {
  return {
    get value() {
      {
        const t = e();
        return Object.defineProperty(this, "value", { value: t }), t;
      }
    }
  };
}
function js(e) {
  return e == null;
}
function Is(e) {
  const t = e.startsWith("^") ? 1 : 0, n = e.endsWith("$") ? e.length - 1 : e.length;
  return e.slice(t, n);
}
const Ta = /* @__PURE__ */ Symbol("evaluating");
function W(e, t, n) {
  let r;
  Object.defineProperty(e, t, {
    get() {
      if (r !== Ta)
        return r === void 0 && (r = Ta, r = n()), r;
    },
    set(i) {
      Object.defineProperty(e, t, {
        value: i
        // configurable: true,
      });
    },
    configurable: !0
  });
}
function Ct(e, t, n) {
  Object.defineProperty(e, t, {
    value: n,
    writable: !0,
    enumerable: !0,
    configurable: !0
  });
}
function bt(...e) {
  const t = {};
  for (const n of e) {
    const r = Object.getOwnPropertyDescriptors(n);
    Object.assign(t, r);
  }
  return Object.defineProperties({}, t);
}
function Pa(e) {
  return JSON.stringify(e);
}
function wd(e) {
  return e.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
const tl = "captureStackTrace" in Error ? Error.captureStackTrace : (...e) => {
};
function Tr(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
const Ed = /* @__PURE__ */ Rs(() => {
  var e;
  if (Ps.jitless || typeof navigator < "u" && ((e = navigator == null ? void 0 : navigator.userAgent) != null && e.includes("Cloudflare")))
    return !1;
  try {
    const t = Function;
    return new t(""), !0;
  } catch {
    return !1;
  }
});
function jn(e) {
  if (Tr(e) === !1)
    return !1;
  const t = e.constructor;
  if (t === void 0 || typeof t != "function")
    return !0;
  const n = t.prototype;
  return !(Tr(n) === !1 || Object.prototype.hasOwnProperty.call(n, "isPrototypeOf") === !1);
}
function nl(e) {
  return jn(e) ? { ...e } : Array.isArray(e) ? [...e] : e instanceof Map ? new Map(e) : e instanceof Set ? new Set(e) : e;
}
const _d = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
function an(e) {
  return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function xt(e, t, n) {
  const r = new e._zod.constr(t ?? e._zod.def);
  return (!t || n != null && n.parent) && (r._zod.parent = e), r;
}
function F(e) {
  const t = e;
  if (!t)
    return {};
  if (typeof t == "string")
    return { error: () => t };
  if ((t == null ? void 0 : t.message) !== void 0) {
    if ((t == null ? void 0 : t.error) !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    t.error = t.message;
  }
  return delete t.message, typeof t.error == "string" ? { ...t, error: () => t.error } : t;
}
function Sd(e) {
  return Object.keys(e).filter((t) => e[t]._zod.optin === "optional" && e[t]._zod.optout === "optional");
}
function Ad(e, t) {
  const n = e._zod.def, r = n.checks;
  if (r && r.length > 0)
    throw new Error(".pick() cannot be used on object schemas containing refinements");
  const s = bt(e._zod.def, {
    get shape() {
      const a = {};
      for (const c in t) {
        if (!(c in n.shape))
          throw new Error(`Unrecognized key: "${c}"`);
        t[c] && (a[c] = n.shape[c]);
      }
      return Ct(this, "shape", a), a;
    },
    checks: []
  });
  return xt(e, s);
}
function kd(e, t) {
  const n = e._zod.def, r = n.checks;
  if (r && r.length > 0)
    throw new Error(".omit() cannot be used on object schemas containing refinements");
  const s = bt(e._zod.def, {
    get shape() {
      const a = { ...e._zod.def.shape };
      for (const c in t) {
        if (!(c in n.shape))
          throw new Error(`Unrecognized key: "${c}"`);
        t[c] && delete a[c];
      }
      return Ct(this, "shape", a), a;
    },
    checks: []
  });
  return xt(e, s);
}
function Td(e, t) {
  if (!jn(t))
    throw new Error("Invalid input to extend: expected a plain object");
  const n = e._zod.def.checks;
  if (n && n.length > 0) {
    const s = e._zod.def.shape;
    for (const a in t)
      if (Object.getOwnPropertyDescriptor(s, a) !== void 0)
        throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
  }
  const i = bt(e._zod.def, {
    get shape() {
      const s = { ...e._zod.def.shape, ...t };
      return Ct(this, "shape", s), s;
    }
  });
  return xt(e, i);
}
function Pd(e, t) {
  if (!jn(t))
    throw new Error("Invalid input to safeExtend: expected a plain object");
  const n = bt(e._zod.def, {
    get shape() {
      const r = { ...e._zod.def.shape, ...t };
      return Ct(this, "shape", r), r;
    }
  });
  return xt(e, n);
}
function Rd(e, t) {
  var r;
  if ((r = e._zod.def.checks) != null && r.length)
    throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
  const n = bt(e._zod.def, {
    get shape() {
      const i = { ...e._zod.def.shape, ...t._zod.def.shape };
      return Ct(this, "shape", i), i;
    },
    get catchall() {
      return t._zod.def.catchall;
    },
    checks: t._zod.def.checks ?? []
  });
  return xt(e, n);
}
function jd(e, t, n) {
  const i = t._zod.def.checks;
  if (i && i.length > 0)
    throw new Error(".partial() cannot be used on object schemas containing refinements");
  const a = bt(t._zod.def, {
    get shape() {
      const c = t._zod.def.shape, l = { ...c };
      if (n)
        for (const p in n) {
          if (!(p in c))
            throw new Error(`Unrecognized key: "${p}"`);
          n[p] && (l[p] = e ? new e({
            type: "optional",
            innerType: c[p]
          }) : c[p]);
        }
      else
        for (const p in c)
          l[p] = e ? new e({
            type: "optional",
            innerType: c[p]
          }) : c[p];
      return Ct(this, "shape", l), l;
    },
    checks: []
  });
  return xt(t, a);
}
function Id(e, t, n) {
  const r = bt(t._zod.def, {
    get shape() {
      const i = t._zod.def.shape, s = { ...i };
      if (n)
        for (const a in n) {
          if (!(a in s))
            throw new Error(`Unrecognized key: "${a}"`);
          n[a] && (s[a] = new e({
            type: "nonoptional",
            innerType: i[a]
          }));
        }
      else
        for (const a in i)
          s[a] = new e({
            type: "nonoptional",
            innerType: i[a]
          });
      return Ct(this, "shape", s), s;
    }
  });
  return xt(t, r);
}
function Jt(e, t = 0) {
  var n;
  if (e.aborted === !0)
    return !0;
  for (let r = t; r < e.issues.length; r++)
    if (((n = e.issues[r]) == null ? void 0 : n.continue) !== !0)
      return !0;
  return !1;
}
function Od(e, t = 0) {
  var n;
  if (e.aborted === !0)
    return !0;
  for (let r = t; r < e.issues.length; r++)
    if (((n = e.issues[r]) == null ? void 0 : n.continue) === !1)
      return !0;
  return !1;
}
function rl(e, t) {
  return t.map((n) => {
    var r;
    return (r = n).path ?? (r.path = []), n.path.unshift(e), n;
  });
}
function Yn(e) {
  return typeof e == "string" ? e : e == null ? void 0 : e.message;
}
function Pt(e, t, n) {
  var l, p, u, d, f, m;
  const r = e.message ? e.message : Yn((u = (p = (l = e.inst) == null ? void 0 : l._zod.def) == null ? void 0 : p.error) == null ? void 0 : u.call(p, e)) ?? Yn((d = t == null ? void 0 : t.error) == null ? void 0 : d.call(t, e)) ?? Yn((f = n.customError) == null ? void 0 : f.call(n, e)) ?? Yn((m = n.localeError) == null ? void 0 : m.call(n, e)) ?? "Invalid input", { inst: i, continue: s, input: a, ...c } = e;
  return c.path ?? (c.path = []), c.message = r, t != null && t.reportInput && (c.input = a), c;
}
function Os(e) {
  return Array.isArray(e) ? "array" : typeof e == "string" ? "string" : "unknown";
}
function In(...e) {
  const [t, n, r] = e;
  return typeof t == "string" ? {
    message: t,
    code: "custom",
    input: n,
    inst: r
  } : { ...t };
}
const il = (e, t) => {
  e.name = "$ZodError", Object.defineProperty(e, "_zod", {
    value: e._zod,
    enumerable: !1
  }), Object.defineProperty(e, "issues", {
    value: t,
    enumerable: !1
  }), e.message = JSON.stringify(t, ts, 2), Object.defineProperty(e, "toString", {
    value: () => e.message,
    enumerable: !1
  });
}, sl = w("$ZodError", il), al = w("$ZodError", il, { Parent: Error });
function $d(e, t = (n) => n.message) {
  const n = {}, r = [];
  for (const i of e.issues)
    i.path.length > 0 ? (n[i.path[0]] = n[i.path[0]] || [], n[i.path[0]].push(t(i))) : r.push(t(i));
  return { formErrors: r, fieldErrors: n };
}
function Nd(e, t = (n) => n.message) {
  const n = { _errors: [] }, r = (i, s = []) => {
    for (const a of i.issues)
      if (a.code === "invalid_union" && a.errors.length)
        a.errors.map((c) => r({ issues: c }, [...s, ...a.path]));
      else if (a.code === "invalid_key")
        r({ issues: a.issues }, [...s, ...a.path]);
      else if (a.code === "invalid_element")
        r({ issues: a.issues }, [...s, ...a.path]);
      else {
        const c = [...s, ...a.path];
        if (c.length === 0)
          n._errors.push(t(a));
        else {
          let l = n, p = 0;
          for (; p < c.length; ) {
            const u = c[p];
            p === c.length - 1 ? (l[u] = l[u] || { _errors: [] }, l[u]._errors.push(t(a))) : l[u] = l[u] || { _errors: [] }, l = l[u], p++;
          }
        }
      }
  };
  return r(e), n;
}
const $s = (e) => (t, n, r, i) => {
  const s = r ? { ...r, async: !1 } : { async: !1 }, a = t._zod.run({ value: n, issues: [] }, s);
  if (a instanceof Promise)
    throw new Qt();
  if (a.issues.length) {
    const c = new ((i == null ? void 0 : i.Err) ?? e)(a.issues.map((l) => Pt(l, s, Tt())));
    throw tl(c, i == null ? void 0 : i.callee), c;
  }
  return a.value;
}, Ns = (e) => async (t, n, r, i) => {
  const s = r ? { ...r, async: !0 } : { async: !0 };
  let a = t._zod.run({ value: n, issues: [] }, s);
  if (a instanceof Promise && (a = await a), a.issues.length) {
    const c = new ((i == null ? void 0 : i.Err) ?? e)(a.issues.map((l) => Pt(l, s, Tt())));
    throw tl(c, i == null ? void 0 : i.callee), c;
  }
  return a.value;
}, qr = (e) => (t, n, r) => {
  const i = r ? { ...r, async: !1 } : { async: !1 }, s = t._zod.run({ value: n, issues: [] }, i);
  if (s instanceof Promise)
    throw new Qt();
  return s.issues.length ? {
    success: !1,
    error: new (e ?? sl)(s.issues.map((a) => Pt(a, i, Tt())))
  } : { success: !0, data: s.value };
}, Cd = /* @__PURE__ */ qr(al), Hr = (e) => async (t, n, r) => {
  const i = r ? { ...r, async: !0 } : { async: !0 };
  let s = t._zod.run({ value: n, issues: [] }, i);
  return s instanceof Promise && (s = await s), s.issues.length ? {
    success: !1,
    error: new e(s.issues.map((a) => Pt(a, i, Tt())))
  } : { success: !0, data: s.value };
}, Ld = /* @__PURE__ */ Hr(al), Dd = (e) => (t, n, r) => {
  const i = r ? { ...r, direction: "backward" } : { direction: "backward" };
  return $s(e)(t, n, i);
}, zd = (e) => (t, n, r) => $s(e)(t, n, r), Fd = (e) => async (t, n, r) => {
  const i = r ? { ...r, direction: "backward" } : { direction: "backward" };
  return Ns(e)(t, n, i);
}, Ud = (e) => async (t, n, r) => Ns(e)(t, n, r), Bd = (e) => (t, n, r) => {
  const i = r ? { ...r, direction: "backward" } : { direction: "backward" };
  return qr(e)(t, n, i);
}, Md = (e) => (t, n, r) => qr(e)(t, n, r), qd = (e) => async (t, n, r) => {
  const i = r ? { ...r, direction: "backward" } : { direction: "backward" };
  return Hr(e)(t, n, i);
}, Hd = (e) => async (t, n, r) => Hr(e)(t, n, r), Vd = /^[cC][0-9a-z]{6,}$/, Zd = /^[0-9a-z]+$/, Wd = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/, Gd = /^[0-9a-vA-V]{20}$/, Jd = /^[A-Za-z0-9]{27}$/, Kd = /^[a-zA-Z0-9_-]{21}$/, Xd = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/, Yd = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/, Ra = (e) => e ? new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${e}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`) : /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/, Qd = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/, ef = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$";
function tf() {
  return new RegExp(ef, "u");
}
const nf = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, rf = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/, sf = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/, af = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/, of = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/, ol = /^[A-Za-z0-9_-]*$/, cf = /^https?$/, lf = /^\+[1-9]\d{6,14}$/, cl = "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))", uf = /* @__PURE__ */ new RegExp(`^${cl}$`);
function ll(e) {
  const t = "(?:[01]\\d|2[0-3]):[0-5]\\d";
  return typeof e.precision == "number" ? e.precision === -1 ? `${t}` : e.precision === 0 ? `${t}:[0-5]\\d` : `${t}:[0-5]\\d\\.\\d{${e.precision}}` : `${t}(?::[0-5]\\d(?:\\.\\d+)?)?`;
}
function pf(e) {
  return new RegExp(`^${ll(e)}$`);
}
function df(e) {
  const t = ll({ precision: e.precision }), n = ["Z"];
  e.local && n.push(""), e.offset && n.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
  const r = `${t}(?:${n.join("|")})`;
  return new RegExp(`^${cl}T(?:${r})$`);
}
const ff = (e) => {
  const t = e ? `[\\s\\S]{${(e == null ? void 0 : e.minimum) ?? 0},${(e == null ? void 0 : e.maximum) ?? ""}}` : "[\\s\\S]*";
  return new RegExp(`^${t}$`);
}, mf = /^(?:true|false)$/i, hf = /^[^A-Z]*$/, gf = /^[^a-z]*$/, Ye = /* @__PURE__ */ w("$ZodCheck", (e, t) => {
  var n;
  e._zod ?? (e._zod = {}), e._zod.def = t, (n = e._zod).onattach ?? (n.onattach = []);
}), vf = /* @__PURE__ */ w("$ZodCheckMaxLength", (e, t) => {
  var n;
  Ye.init(e, t), (n = e._zod.def).when ?? (n.when = (r) => {
    const i = r.value;
    return !js(i) && i.length !== void 0;
  }), e._zod.onattach.push((r) => {
    const i = r._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    t.maximum < i && (r._zod.bag.maximum = t.maximum);
  }), e._zod.check = (r) => {
    const i = r.value;
    if (i.length <= t.maximum)
      return;
    const a = Os(i);
    r.issues.push({
      origin: a,
      code: "too_big",
      maximum: t.maximum,
      inclusive: !0,
      input: i,
      inst: e,
      continue: !t.abort
    });
  };
}), bf = /* @__PURE__ */ w("$ZodCheckMinLength", (e, t) => {
  var n;
  Ye.init(e, t), (n = e._zod.def).when ?? (n.when = (r) => {
    const i = r.value;
    return !js(i) && i.length !== void 0;
  }), e._zod.onattach.push((r) => {
    const i = r._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    t.minimum > i && (r._zod.bag.minimum = t.minimum);
  }), e._zod.check = (r) => {
    const i = r.value;
    if (i.length >= t.minimum)
      return;
    const a = Os(i);
    r.issues.push({
      origin: a,
      code: "too_small",
      minimum: t.minimum,
      inclusive: !0,
      input: i,
      inst: e,
      continue: !t.abort
    });
  };
}), xf = /* @__PURE__ */ w("$ZodCheckLengthEquals", (e, t) => {
  var n;
  Ye.init(e, t), (n = e._zod.def).when ?? (n.when = (r) => {
    const i = r.value;
    return !js(i) && i.length !== void 0;
  }), e._zod.onattach.push((r) => {
    const i = r._zod.bag;
    i.minimum = t.length, i.maximum = t.length, i.length = t.length;
  }), e._zod.check = (r) => {
    const i = r.value, s = i.length;
    if (s === t.length)
      return;
    const a = Os(i), c = s > t.length;
    r.issues.push({
      origin: a,
      ...c ? { code: "too_big", maximum: t.length } : { code: "too_small", minimum: t.length },
      inclusive: !0,
      exact: !0,
      input: r.value,
      inst: e,
      continue: !t.abort
    });
  };
}), Vr = /* @__PURE__ */ w("$ZodCheckStringFormat", (e, t) => {
  var n, r;
  Ye.init(e, t), e._zod.onattach.push((i) => {
    const s = i._zod.bag;
    s.format = t.format, t.pattern && (s.patterns ?? (s.patterns = /* @__PURE__ */ new Set()), s.patterns.add(t.pattern));
  }), t.pattern ? (n = e._zod).check ?? (n.check = (i) => {
    t.pattern.lastIndex = 0, !t.pattern.test(i.value) && i.issues.push({
      origin: "string",
      code: "invalid_format",
      format: t.format,
      input: i.value,
      ...t.pattern ? { pattern: t.pattern.toString() } : {},
      inst: e,
      continue: !t.abort
    });
  }) : (r = e._zod).check ?? (r.check = () => {
  });
}), yf = /* @__PURE__ */ w("$ZodCheckRegex", (e, t) => {
  Vr.init(e, t), e._zod.check = (n) => {
    t.pattern.lastIndex = 0, !t.pattern.test(n.value) && n.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: n.value,
      pattern: t.pattern.toString(),
      inst: e,
      continue: !t.abort
    });
  };
}), wf = /* @__PURE__ */ w("$ZodCheckLowerCase", (e, t) => {
  t.pattern ?? (t.pattern = hf), Vr.init(e, t);
}), Ef = /* @__PURE__ */ w("$ZodCheckUpperCase", (e, t) => {
  t.pattern ?? (t.pattern = gf), Vr.init(e, t);
}), _f = /* @__PURE__ */ w("$ZodCheckIncludes", (e, t) => {
  Ye.init(e, t);
  const n = an(t.includes), r = new RegExp(typeof t.position == "number" ? `^.{${t.position}}${n}` : n);
  t.pattern = r, e._zod.onattach.push((i) => {
    const s = i._zod.bag;
    s.patterns ?? (s.patterns = /* @__PURE__ */ new Set()), s.patterns.add(r);
  }), e._zod.check = (i) => {
    i.value.includes(t.includes, t.position) || i.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: t.includes,
      input: i.value,
      inst: e,
      continue: !t.abort
    });
  };
}), Sf = /* @__PURE__ */ w("$ZodCheckStartsWith", (e, t) => {
  Ye.init(e, t);
  const n = new RegExp(`^${an(t.prefix)}.*`);
  t.pattern ?? (t.pattern = n), e._zod.onattach.push((r) => {
    const i = r._zod.bag;
    i.patterns ?? (i.patterns = /* @__PURE__ */ new Set()), i.patterns.add(n);
  }), e._zod.check = (r) => {
    r.value.startsWith(t.prefix) || r.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "starts_with",
      prefix: t.prefix,
      input: r.value,
      inst: e,
      continue: !t.abort
    });
  };
}), Af = /* @__PURE__ */ w("$ZodCheckEndsWith", (e, t) => {
  Ye.init(e, t);
  const n = new RegExp(`.*${an(t.suffix)}$`);
  t.pattern ?? (t.pattern = n), e._zod.onattach.push((r) => {
    const i = r._zod.bag;
    i.patterns ?? (i.patterns = /* @__PURE__ */ new Set()), i.patterns.add(n);
  }), e._zod.check = (r) => {
    r.value.endsWith(t.suffix) || r.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "ends_with",
      suffix: t.suffix,
      input: r.value,
      inst: e,
      continue: !t.abort
    });
  };
}), kf = /* @__PURE__ */ w("$ZodCheckOverwrite", (e, t) => {
  Ye.init(e, t), e._zod.check = (n) => {
    n.value = t.tx(n.value);
  };
});
class Tf {
  constructor(t = []) {
    this.content = [], this.indent = 0, this && (this.args = t);
  }
  indented(t) {
    this.indent += 1, t(this), this.indent -= 1;
  }
  write(t) {
    if (typeof t == "function") {
      t(this, { execution: "sync" }), t(this, { execution: "async" });
      return;
    }
    const r = t.split(`
`).filter((a) => a), i = Math.min(...r.map((a) => a.length - a.trimStart().length)), s = r.map((a) => a.slice(i)).map((a) => " ".repeat(this.indent * 2) + a);
    for (const a of s)
      this.content.push(a);
  }
  compile() {
    const t = Function, n = this == null ? void 0 : this.args, i = [...((this == null ? void 0 : this.content) ?? [""]).map((s) => `  ${s}`)];
    return new t(...n, i.join(`
`));
  }
}
const Pf = {
  major: 4,
  minor: 4,
  patch: 1
}, ue = /* @__PURE__ */ w("$ZodType", (e, t) => {
  var i;
  var n;
  e ?? (e = {}), e._zod.def = t, e._zod.bag = e._zod.bag || {}, e._zod.version = Pf;
  const r = [...e._zod.def.checks ?? []];
  e._zod.traits.has("$ZodCheck") && r.unshift(e);
  for (const s of r)
    for (const a of s._zod.onattach)
      a(e);
  if (r.length === 0)
    (n = e._zod).deferred ?? (n.deferred = []), (i = e._zod.deferred) == null || i.push(() => {
      e._zod.run = e._zod.parse;
    });
  else {
    const s = (c, l, p) => {
      let u = Jt(c), d;
      for (const f of l) {
        if (f._zod.def.when) {
          if (Od(c) || !f._zod.def.when(c))
            continue;
        } else if (u)
          continue;
        const m = c.issues.length, v = f._zod.check(c);
        if (v instanceof Promise && (p == null ? void 0 : p.async) === !1)
          throw new Qt();
        if (d || v instanceof Promise)
          d = (d ?? Promise.resolve()).then(async () => {
            await v, c.issues.length !== m && (u || (u = Jt(c, m)));
          });
        else {
          if (c.issues.length === m)
            continue;
          u || (u = Jt(c, m));
        }
      }
      return d ? d.then(() => c) : c;
    }, a = (c, l, p) => {
      if (Jt(c))
        return c.aborted = !0, c;
      const u = s(l, r, p);
      if (u instanceof Promise) {
        if (p.async === !1)
          throw new Qt();
        return u.then((d) => e._zod.parse(d, p));
      }
      return e._zod.parse(u, p);
    };
    e._zod.run = (c, l) => {
      if (l.skipChecks)
        return e._zod.parse(c, l);
      if (l.direction === "backward") {
        const u = e._zod.parse({ value: c.value, issues: [] }, { ...l, skipChecks: !0 });
        return u instanceof Promise ? u.then((d) => a(d, c, l)) : a(u, c, l);
      }
      const p = e._zod.parse(c, l);
      if (p instanceof Promise) {
        if (l.async === !1)
          throw new Qt();
        return p.then((u) => s(u, r, l));
      }
      return s(p, r, l);
    };
  }
  W(e, "~standard", () => ({
    validate: (s) => {
      var a;
      try {
        const c = Cd(e, s);
        return c.success ? { value: c.data } : { issues: (a = c.error) == null ? void 0 : a.issues };
      } catch {
        return Ld(e, s).then((l) => {
          var p;
          return l.success ? { value: l.data } : { issues: (p = l.error) == null ? void 0 : p.issues };
        });
      }
    },
    vendor: "zod",
    version: 1
  }));
}), Cs = /* @__PURE__ */ w("$ZodString", (e, t) => {
  var n;
  ue.init(e, t), e._zod.pattern = [...((n = e == null ? void 0 : e._zod.bag) == null ? void 0 : n.patterns) ?? []].pop() ?? ff(e._zod.bag), e._zod.parse = (r, i) => {
    if (t.coerce)
      try {
        r.value = String(r.value);
      } catch {
      }
    return typeof r.value == "string" || r.issues.push({
      expected: "string",
      code: "invalid_type",
      input: r.value,
      inst: e
    }), r;
  };
}), ee = /* @__PURE__ */ w("$ZodStringFormat", (e, t) => {
  Vr.init(e, t), Cs.init(e, t);
}), Rf = /* @__PURE__ */ w("$ZodGUID", (e, t) => {
  t.pattern ?? (t.pattern = Yd), ee.init(e, t);
}), jf = /* @__PURE__ */ w("$ZodUUID", (e, t) => {
  if (t.version) {
    const r = {
      v1: 1,
      v2: 2,
      v3: 3,
      v4: 4,
      v5: 5,
      v6: 6,
      v7: 7,
      v8: 8
    }[t.version];
    if (r === void 0)
      throw new Error(`Invalid UUID version: "${t.version}"`);
    t.pattern ?? (t.pattern = Ra(r));
  } else
    t.pattern ?? (t.pattern = Ra());
  ee.init(e, t);
}), If = /* @__PURE__ */ w("$ZodEmail", (e, t) => {
  t.pattern ?? (t.pattern = Qd), ee.init(e, t);
}), Of = /* @__PURE__ */ w("$ZodURL", (e, t) => {
  ee.init(e, t), e._zod.check = (n) => {
    var r;
    try {
      const i = n.value.trim();
      if (!t.normalize && ((r = t.protocol) == null ? void 0 : r.source) === cf.source && !/^https?:\/\//i.test(i)) {
        n.issues.push({
          code: "invalid_format",
          format: "url",
          note: "Invalid URL format",
          input: n.value,
          inst: e,
          continue: !t.abort
        });
        return;
      }
      const s = new URL(i);
      t.hostname && (t.hostname.lastIndex = 0, t.hostname.test(s.hostname) || n.issues.push({
        code: "invalid_format",
        format: "url",
        note: "Invalid hostname",
        pattern: t.hostname.source,
        input: n.value,
        inst: e,
        continue: !t.abort
      })), t.protocol && (t.protocol.lastIndex = 0, t.protocol.test(s.protocol.endsWith(":") ? s.protocol.slice(0, -1) : s.protocol) || n.issues.push({
        code: "invalid_format",
        format: "url",
        note: "Invalid protocol",
        pattern: t.protocol.source,
        input: n.value,
        inst: e,
        continue: !t.abort
      })), t.normalize ? n.value = s.href : n.value = i;
      return;
    } catch {
      n.issues.push({
        code: "invalid_format",
        format: "url",
        input: n.value,
        inst: e,
        continue: !t.abort
      });
    }
  };
}), $f = /* @__PURE__ */ w("$ZodEmoji", (e, t) => {
  t.pattern ?? (t.pattern = tf()), ee.init(e, t);
}), Nf = /* @__PURE__ */ w("$ZodNanoID", (e, t) => {
  t.pattern ?? (t.pattern = Kd), ee.init(e, t);
}), Cf = /* @__PURE__ */ w("$ZodCUID", (e, t) => {
  t.pattern ?? (t.pattern = Vd), ee.init(e, t);
}), Lf = /* @__PURE__ */ w("$ZodCUID2", (e, t) => {
  t.pattern ?? (t.pattern = Zd), ee.init(e, t);
}), Df = /* @__PURE__ */ w("$ZodULID", (e, t) => {
  t.pattern ?? (t.pattern = Wd), ee.init(e, t);
}), zf = /* @__PURE__ */ w("$ZodXID", (e, t) => {
  t.pattern ?? (t.pattern = Gd), ee.init(e, t);
}), Ff = /* @__PURE__ */ w("$ZodKSUID", (e, t) => {
  t.pattern ?? (t.pattern = Jd), ee.init(e, t);
}), Uf = /* @__PURE__ */ w("$ZodISODateTime", (e, t) => {
  t.pattern ?? (t.pattern = df(t)), ee.init(e, t);
}), Bf = /* @__PURE__ */ w("$ZodISODate", (e, t) => {
  t.pattern ?? (t.pattern = uf), ee.init(e, t);
}), Mf = /* @__PURE__ */ w("$ZodISOTime", (e, t) => {
  t.pattern ?? (t.pattern = pf(t)), ee.init(e, t);
}), qf = /* @__PURE__ */ w("$ZodISODuration", (e, t) => {
  t.pattern ?? (t.pattern = Xd), ee.init(e, t);
}), Hf = /* @__PURE__ */ w("$ZodIPv4", (e, t) => {
  t.pattern ?? (t.pattern = nf), ee.init(e, t), e._zod.bag.format = "ipv4";
}), Vf = /* @__PURE__ */ w("$ZodIPv6", (e, t) => {
  t.pattern ?? (t.pattern = rf), ee.init(e, t), e._zod.bag.format = "ipv6", e._zod.check = (n) => {
    try {
      new URL(`http://[${n.value}]`);
    } catch {
      n.issues.push({
        code: "invalid_format",
        format: "ipv6",
        input: n.value,
        inst: e,
        continue: !t.abort
      });
    }
  };
}), Zf = /* @__PURE__ */ w("$ZodCIDRv4", (e, t) => {
  t.pattern ?? (t.pattern = sf), ee.init(e, t);
}), Wf = /* @__PURE__ */ w("$ZodCIDRv6", (e, t) => {
  t.pattern ?? (t.pattern = af), ee.init(e, t), e._zod.check = (n) => {
    const r = n.value.split("/");
    try {
      if (r.length !== 2)
        throw new Error();
      const [i, s] = r;
      if (!s)
        throw new Error();
      const a = Number(s);
      if (`${a}` !== s)
        throw new Error();
      if (a < 0 || a > 128)
        throw new Error();
      new URL(`http://[${i}]`);
    } catch {
      n.issues.push({
        code: "invalid_format",
        format: "cidrv6",
        input: n.value,
        inst: e,
        continue: !t.abort
      });
    }
  };
});
function ul(e) {
  if (e === "")
    return !0;
  if (/\s/.test(e) || e.length % 4 !== 0)
    return !1;
  try {
    return atob(e), !0;
  } catch {
    return !1;
  }
}
const Gf = /* @__PURE__ */ w("$ZodBase64", (e, t) => {
  t.pattern ?? (t.pattern = of), ee.init(e, t), e._zod.bag.contentEncoding = "base64", e._zod.check = (n) => {
    ul(n.value) || n.issues.push({
      code: "invalid_format",
      format: "base64",
      input: n.value,
      inst: e,
      continue: !t.abort
    });
  };
});
function Jf(e) {
  if (!ol.test(e))
    return !1;
  const t = e.replace(/[-_]/g, (r) => r === "-" ? "+" : "/"), n = t.padEnd(Math.ceil(t.length / 4) * 4, "=");
  return ul(n);
}
const Kf = /* @__PURE__ */ w("$ZodBase64URL", (e, t) => {
  t.pattern ?? (t.pattern = ol), ee.init(e, t), e._zod.bag.contentEncoding = "base64url", e._zod.check = (n) => {
    Jf(n.value) || n.issues.push({
      code: "invalid_format",
      format: "base64url",
      input: n.value,
      inst: e,
      continue: !t.abort
    });
  };
}), Xf = /* @__PURE__ */ w("$ZodE164", (e, t) => {
  t.pattern ?? (t.pattern = lf), ee.init(e, t);
});
function Yf(e, t = null) {
  try {
    const n = e.split(".");
    if (n.length !== 3)
      return !1;
    const [r] = n;
    if (!r)
      return !1;
    const i = JSON.parse(atob(r));
    return !("typ" in i && (i == null ? void 0 : i.typ) !== "JWT" || !i.alg || t && (!("alg" in i) || i.alg !== t));
  } catch {
    return !1;
  }
}
const Qf = /* @__PURE__ */ w("$ZodJWT", (e, t) => {
  ee.init(e, t), e._zod.check = (n) => {
    Yf(n.value, t.alg) || n.issues.push({
      code: "invalid_format",
      format: "jwt",
      input: n.value,
      inst: e,
      continue: !t.abort
    });
  };
}), em = /* @__PURE__ */ w("$ZodBoolean", (e, t) => {
  ue.init(e, t), e._zod.pattern = mf, e._zod.parse = (n, r) => {
    if (t.coerce)
      try {
        n.value = !!n.value;
      } catch {
      }
    const i = n.value;
    return typeof i == "boolean" || n.issues.push({
      expected: "boolean",
      code: "invalid_type",
      input: i,
      inst: e
    }), n;
  };
}), tm = /* @__PURE__ */ w("$ZodUnknown", (e, t) => {
  ue.init(e, t), e._zod.parse = (n) => n;
}), nm = /* @__PURE__ */ w("$ZodNever", (e, t) => {
  ue.init(e, t), e._zod.parse = (n, r) => (n.issues.push({
    expected: "never",
    code: "invalid_type",
    input: n.value,
    inst: e
  }), n);
});
function ja(e, t, n) {
  e.issues.length && t.issues.push(...rl(n, e.issues)), t.value[n] = e.value;
}
const rm = /* @__PURE__ */ w("$ZodArray", (e, t) => {
  ue.init(e, t), e._zod.parse = (n, r) => {
    const i = n.value;
    if (!Array.isArray(i))
      return n.issues.push({
        expected: "array",
        code: "invalid_type",
        input: i,
        inst: e
      }), n;
    n.value = Array(i.length);
    const s = [];
    for (let a = 0; a < i.length; a++) {
      const c = i[a], l = t.element._zod.run({
        value: c,
        issues: []
      }, r);
      l instanceof Promise ? s.push(l.then((p) => ja(p, n, a))) : ja(l, n, a);
    }
    return s.length ? Promise.all(s).then(() => n) : n;
  };
});
function Pr(e, t, n, r, i, s) {
  const a = n in r;
  if (e.issues.length) {
    if (i && s && !a)
      return;
    t.issues.push(...rl(n, e.issues));
  }
  if (!a && !i) {
    e.issues.length || t.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: void 0,
      path: [n]
    });
    return;
  }
  e.value === void 0 ? a && (t.value[n] = void 0) : t.value[n] = e.value;
}
function pl(e) {
  var r, i, s, a;
  const t = Object.keys(e.shape);
  for (const c of t)
    if (!((a = (s = (i = (r = e.shape) == null ? void 0 : r[c]) == null ? void 0 : i._zod) == null ? void 0 : s.traits) != null && a.has("$ZodType")))
      throw new Error(`Invalid element at key "${c}": expected a Zod schema`);
  const n = Sd(e.shape);
  return {
    ...e,
    keys: t,
    keySet: new Set(t),
    numKeys: t.length,
    optionalKeys: new Set(n)
  };
}
function dl(e, t, n, r, i, s) {
  const a = [], c = i.keySet, l = i.catchall._zod, p = l.def.type, u = l.optin === "optional", d = l.optout === "optional";
  for (const f in t) {
    if (f === "__proto__" || c.has(f))
      continue;
    if (p === "never") {
      a.push(f);
      continue;
    }
    const m = l.run({ value: t[f], issues: [] }, r);
    m instanceof Promise ? e.push(m.then((v) => Pr(v, n, f, t, u, d))) : Pr(m, n, f, t, u, d);
  }
  return a.length && n.issues.push({
    code: "unrecognized_keys",
    keys: a,
    input: t,
    inst: s
  }), e.length ? Promise.all(e).then(() => n) : n;
}
const im = /* @__PURE__ */ w("$ZodObject", (e, t) => {
  ue.init(e, t);
  const n = Object.getOwnPropertyDescriptor(t, "shape");
  if (!(n != null && n.get)) {
    const c = t.shape;
    Object.defineProperty(t, "shape", {
      get: () => {
        const l = { ...c };
        return Object.defineProperty(t, "shape", {
          value: l
        }), l;
      }
    });
  }
  const r = Rs(() => pl(t));
  W(e._zod, "propValues", () => {
    const c = t.shape, l = {};
    for (const p in c) {
      const u = c[p]._zod;
      if (u.values) {
        l[p] ?? (l[p] = /* @__PURE__ */ new Set());
        for (const d of u.values)
          l[p].add(d);
      }
    }
    return l;
  });
  const i = Tr, s = t.catchall;
  let a;
  e._zod.parse = (c, l) => {
    a ?? (a = r.value);
    const p = c.value;
    if (!i(p))
      return c.issues.push({
        expected: "object",
        code: "invalid_type",
        input: p,
        inst: e
      }), c;
    c.value = {};
    const u = [], d = a.shape;
    for (const f of a.keys) {
      const m = d[f], v = m._zod.optin === "optional", g = m._zod.optout === "optional", b = m._zod.run({ value: p[f], issues: [] }, l);
      b instanceof Promise ? u.push(b.then((x) => Pr(x, c, f, p, v, g))) : Pr(b, c, f, p, v, g);
    }
    return s ? dl(u, p, c, l, r.value, e) : u.length ? Promise.all(u).then(() => c) : c;
  };
}), sm = /* @__PURE__ */ w("$ZodObjectJIT", (e, t) => {
  im.init(e, t);
  const n = e._zod.parse, r = Rs(() => pl(t)), i = (f) => {
    var D, P;
    const m = new Tf(["shape", "payload", "ctx"]), v = r.value, g = (C) => {
      const q = Pa(C);
      return `shape[${q}]._zod.run({ value: input[${q}], issues: [] }, ctx)`;
    };
    m.write("const input = payload.value;");
    const b = /* @__PURE__ */ Object.create(null);
    let x = 0;
    for (const C of v.keys)
      b[C] = `key_${x++}`;
    m.write("const newResult = {};");
    for (const C of v.keys) {
      const q = b[C], L = Pa(C), ne = f[C], K = ((D = ne == null ? void 0 : ne._zod) == null ? void 0 : D.optin) === "optional", Le = ((P = ne == null ? void 0 : ne._zod) == null ? void 0 : P.optout) === "optional";
      m.write(`const ${q} = ${g(C)};`), K && Le ? m.write(`
        if (${q}.issues.length) {
          if (${L} in input) {
            payload.issues = payload.issues.concat(${q}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${L}, ...iss.path] : [${L}]
            })));
          }
        }
        
        if (${q}.value === undefined) {
          if (${L} in input) {
            newResult[${L}] = undefined;
          }
        } else {
          newResult[${L}] = ${q}.value;
        }
        
      `) : K ? m.write(`
        if (${q}.issues.length) {
          payload.issues = payload.issues.concat(${q}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${L}, ...iss.path] : [${L}]
          })));
        }
        
        if (${q}.value === undefined) {
          if (${L} in input) {
            newResult[${L}] = undefined;
          }
        } else {
          newResult[${L}] = ${q}.value;
        }
        
      `) : m.write(`
        const ${q}_present = ${L} in input;
        if (${q}.issues.length) {
          payload.issues = payload.issues.concat(${q}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${L}, ...iss.path] : [${L}]
          })));
        }
        if (!${q}_present && !${q}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${L}]
          });
        }

        if (${q}_present) {
          if (${q}.value === undefined) {
            newResult[${L}] = undefined;
          } else {
            newResult[${L}] = ${q}.value;
          }
        }

      `);
    }
    m.write("payload.value = newResult;"), m.write("return payload;");
    const I = m.compile();
    return (C, q) => I(f, C, q);
  };
  let s;
  const a = Tr, c = !Ps.jitless, p = c && Ed.value, u = t.catchall;
  let d;
  e._zod.parse = (f, m) => {
    d ?? (d = r.value);
    const v = f.value;
    return a(v) ? c && p && (m == null ? void 0 : m.async) === !1 && m.jitless !== !0 ? (s || (s = i(t.shape)), f = s(f, m), u ? dl([], v, f, m, d, e) : f) : n(f, m) : (f.issues.push({
      expected: "object",
      code: "invalid_type",
      input: v,
      inst: e
    }), f);
  };
});
function Ia(e, t, n, r) {
  for (const s of e)
    if (s.issues.length === 0)
      return t.value = s.value, t;
  const i = e.filter((s) => !Jt(s));
  return i.length === 1 ? (t.value = i[0].value, i[0]) : (t.issues.push({
    code: "invalid_union",
    input: t.value,
    inst: n,
    errors: e.map((s) => s.issues.map((a) => Pt(a, r, Tt())))
  }), t);
}
const am = /* @__PURE__ */ w("$ZodUnion", (e, t) => {
  ue.init(e, t), W(e._zod, "optin", () => t.options.some((r) => r._zod.optin === "optional") ? "optional" : void 0), W(e._zod, "optout", () => t.options.some((r) => r._zod.optout === "optional") ? "optional" : void 0), W(e._zod, "values", () => {
    if (t.options.every((r) => r._zod.values))
      return new Set(t.options.flatMap((r) => Array.from(r._zod.values)));
  }), W(e._zod, "pattern", () => {
    if (t.options.every((r) => r._zod.pattern)) {
      const r = t.options.map((i) => i._zod.pattern);
      return new RegExp(`^(${r.map((i) => Is(i.source)).join("|")})$`);
    }
  });
  const n = t.options.length === 1 ? t.options[0]._zod.run : null;
  e._zod.parse = (r, i) => {
    if (n)
      return n(r, i);
    let s = !1;
    const a = [];
    for (const c of t.options) {
      const l = c._zod.run({
        value: r.value,
        issues: []
      }, i);
      if (l instanceof Promise)
        a.push(l), s = !0;
      else {
        if (l.issues.length === 0)
          return l;
        a.push(l);
      }
    }
    return s ? Promise.all(a).then((c) => Ia(c, r, e, i)) : Ia(a, r, e, i);
  };
}), om = /* @__PURE__ */ w("$ZodIntersection", (e, t) => {
  ue.init(e, t), e._zod.parse = (n, r) => {
    const i = n.value, s = t.left._zod.run({ value: i, issues: [] }, r), a = t.right._zod.run({ value: i, issues: [] }, r);
    return s instanceof Promise || a instanceof Promise ? Promise.all([s, a]).then(([l, p]) => Oa(n, l, p)) : Oa(n, s, a);
  };
});
function ns(e, t) {
  if (e === t)
    return { valid: !0, data: e };
  if (e instanceof Date && t instanceof Date && +e == +t)
    return { valid: !0, data: e };
  if (jn(e) && jn(t)) {
    const n = Object.keys(t), r = Object.keys(e).filter((s) => n.indexOf(s) !== -1), i = { ...e, ...t };
    for (const s of r) {
      const a = ns(e[s], t[s]);
      if (!a.valid)
        return {
          valid: !1,
          mergeErrorPath: [s, ...a.mergeErrorPath]
        };
      i[s] = a.data;
    }
    return { valid: !0, data: i };
  }
  if (Array.isArray(e) && Array.isArray(t)) {
    if (e.length !== t.length)
      return { valid: !1, mergeErrorPath: [] };
    const n = [];
    for (let r = 0; r < e.length; r++) {
      const i = e[r], s = t[r], a = ns(i, s);
      if (!a.valid)
        return {
          valid: !1,
          mergeErrorPath: [r, ...a.mergeErrorPath]
        };
      n.push(a.data);
    }
    return { valid: !0, data: n };
  }
  return { valid: !1, mergeErrorPath: [] };
}
function Oa(e, t, n) {
  const r = /* @__PURE__ */ new Map();
  let i;
  for (const c of t.issues)
    if (c.code === "unrecognized_keys") {
      i ?? (i = c);
      for (const l of c.keys)
        r.has(l) || r.set(l, {}), r.get(l).l = !0;
    } else
      e.issues.push(c);
  for (const c of n.issues)
    if (c.code === "unrecognized_keys")
      for (const l of c.keys)
        r.has(l) || r.set(l, {}), r.get(l).r = !0;
    else
      e.issues.push(c);
  const s = [...r].filter(([, c]) => c.l && c.r).map(([c]) => c);
  if (s.length && i && e.issues.push({ ...i, keys: s }), Jt(e))
    return e;
  const a = ns(t.value, n.value);
  if (!a.valid)
    throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(a.mergeErrorPath)}`);
  return e.value = a.data, e;
}
const cm = /* @__PURE__ */ w("$ZodEnum", (e, t) => {
  ue.init(e, t);
  const n = el(t.entries), r = new Set(n);
  e._zod.values = r, e._zod.pattern = new RegExp(`^(${n.filter((i) => _d.has(typeof i)).map((i) => typeof i == "string" ? an(i) : i.toString()).join("|")})$`), e._zod.parse = (i, s) => {
    const a = i.value;
    return r.has(a) || i.issues.push({
      code: "invalid_value",
      values: n,
      input: a,
      inst: e
    }), i;
  };
}), lm = /* @__PURE__ */ w("$ZodLiteral", (e, t) => {
  if (ue.init(e, t), t.values.length === 0)
    throw new Error("Cannot create literal schema with no valid values");
  const n = new Set(t.values);
  e._zod.values = n, e._zod.pattern = new RegExp(`^(${t.values.map((r) => typeof r == "string" ? an(r) : r ? an(r.toString()) : String(r)).join("|")})$`), e._zod.parse = (r, i) => {
    const s = r.value;
    return n.has(s) || r.issues.push({
      code: "invalid_value",
      values: t.values,
      input: s,
      inst: e
    }), r;
  };
}), um = /* @__PURE__ */ w("$ZodTransform", (e, t) => {
  ue.init(e, t), e._zod.parse = (n, r) => {
    if (r.direction === "backward")
      throw new Qc(e.constructor.name);
    const i = t.transform(n.value, n);
    if (r.async)
      return (i instanceof Promise ? i : Promise.resolve(i)).then((a) => (n.value = a, n));
    if (i instanceof Promise)
      throw new Qt();
    return n.value = i, n;
  };
});
function $a(e, t) {
  return e.issues.length && t === void 0 ? { issues: [], value: void 0 } : e;
}
const fl = /* @__PURE__ */ w("$ZodOptional", (e, t) => {
  ue.init(e, t), e._zod.optin = "optional", e._zod.optout = "optional", W(e._zod, "values", () => t.innerType._zod.values ? /* @__PURE__ */ new Set([...t.innerType._zod.values, void 0]) : void 0), W(e._zod, "pattern", () => {
    const n = t.innerType._zod.pattern;
    return n ? new RegExp(`^(${Is(n.source)})?$`) : void 0;
  }), e._zod.parse = (n, r) => {
    if (t.innerType._zod.optin === "optional") {
      const i = t.innerType._zod.run(n, r);
      return i instanceof Promise ? i.then((s) => $a(s, n.value)) : $a(i, n.value);
    }
    return n.value === void 0 ? n : t.innerType._zod.run(n, r);
  };
}), pm = /* @__PURE__ */ w("$ZodExactOptional", (e, t) => {
  fl.init(e, t), W(e._zod, "values", () => t.innerType._zod.values), W(e._zod, "pattern", () => t.innerType._zod.pattern), e._zod.parse = (n, r) => t.innerType._zod.run(n, r);
}), dm = /* @__PURE__ */ w("$ZodNullable", (e, t) => {
  ue.init(e, t), W(e._zod, "optin", () => t.innerType._zod.optin), W(e._zod, "optout", () => t.innerType._zod.optout), W(e._zod, "pattern", () => {
    const n = t.innerType._zod.pattern;
    return n ? new RegExp(`^(${Is(n.source)}|null)$`) : void 0;
  }), W(e._zod, "values", () => t.innerType._zod.values ? /* @__PURE__ */ new Set([...t.innerType._zod.values, null]) : void 0), e._zod.parse = (n, r) => n.value === null ? n : t.innerType._zod.run(n, r);
}), fm = /* @__PURE__ */ w("$ZodDefault", (e, t) => {
  ue.init(e, t), e._zod.optin = "optional", W(e._zod, "values", () => t.innerType._zod.values), e._zod.parse = (n, r) => {
    if (r.direction === "backward")
      return t.innerType._zod.run(n, r);
    if (n.value === void 0)
      return n.value = t.defaultValue, n;
    const i = t.innerType._zod.run(n, r);
    return i instanceof Promise ? i.then((s) => Na(s, t)) : Na(i, t);
  };
});
function Na(e, t) {
  return e.value === void 0 && (e.value = t.defaultValue), e;
}
const mm = /* @__PURE__ */ w("$ZodPrefault", (e, t) => {
  ue.init(e, t), e._zod.optin = "optional", W(e._zod, "values", () => t.innerType._zod.values), e._zod.parse = (n, r) => (r.direction === "backward" || n.value === void 0 && (n.value = t.defaultValue), t.innerType._zod.run(n, r));
}), hm = /* @__PURE__ */ w("$ZodNonOptional", (e, t) => {
  ue.init(e, t), W(e._zod, "values", () => {
    const n = t.innerType._zod.values;
    return n ? new Set([...n].filter((r) => r !== void 0)) : void 0;
  }), e._zod.parse = (n, r) => {
    const i = t.innerType._zod.run(n, r);
    return i instanceof Promise ? i.then((s) => Ca(s, e)) : Ca(i, e);
  };
});
function Ca(e, t) {
  return !e.issues.length && e.value === void 0 && e.issues.push({
    code: "invalid_type",
    expected: "nonoptional",
    input: e.value,
    inst: t
  }), e;
}
const gm = /* @__PURE__ */ w("$ZodCatch", (e, t) => {
  ue.init(e, t), W(e._zod, "optin", () => t.innerType._zod.optin), W(e._zod, "optout", () => t.innerType._zod.optout), W(e._zod, "values", () => t.innerType._zod.values), e._zod.parse = (n, r) => {
    if (r.direction === "backward")
      return t.innerType._zod.run(n, r);
    const i = t.innerType._zod.run(n, r);
    return i instanceof Promise ? i.then((s) => (n.value = s.value, s.issues.length && (n.value = t.catchValue({
      ...n,
      error: {
        issues: s.issues.map((a) => Pt(a, r, Tt()))
      },
      input: n.value
    }), n.issues = []), n)) : (n.value = i.value, i.issues.length && (n.value = t.catchValue({
      ...n,
      error: {
        issues: i.issues.map((s) => Pt(s, r, Tt()))
      },
      input: n.value
    }), n.issues = []), n);
  };
}), vm = /* @__PURE__ */ w("$ZodPipe", (e, t) => {
  ue.init(e, t), W(e._zod, "values", () => t.in._zod.values), W(e._zod, "optin", () => t.in._zod.optin), W(e._zod, "optout", () => t.out._zod.optout), W(e._zod, "propValues", () => t.in._zod.propValues), e._zod.parse = (n, r) => {
    if (r.direction === "backward") {
      const s = t.out._zod.run(n, r);
      return s instanceof Promise ? s.then((a) => Qn(a, t.in, r)) : Qn(s, t.in, r);
    }
    const i = t.in._zod.run(n, r);
    return i instanceof Promise ? i.then((s) => Qn(s, t.out, r)) : Qn(i, t.out, r);
  };
});
function Qn(e, t, n) {
  return e.issues.length ? (e.aborted = !0, e) : t._zod.run({ value: e.value, issues: e.issues }, n);
}
const bm = /* @__PURE__ */ w("$ZodReadonly", (e, t) => {
  ue.init(e, t), W(e._zod, "propValues", () => t.innerType._zod.propValues), W(e._zod, "values", () => t.innerType._zod.values), W(e._zod, "optin", () => {
    var n, r;
    return (r = (n = t.innerType) == null ? void 0 : n._zod) == null ? void 0 : r.optin;
  }), W(e._zod, "optout", () => {
    var n, r;
    return (r = (n = t.innerType) == null ? void 0 : n._zod) == null ? void 0 : r.optout;
  }), e._zod.parse = (n, r) => {
    if (r.direction === "backward")
      return t.innerType._zod.run(n, r);
    const i = t.innerType._zod.run(n, r);
    return i instanceof Promise ? i.then(La) : La(i);
  };
});
function La(e) {
  return e.value = Object.freeze(e.value), e;
}
const xm = /* @__PURE__ */ w("$ZodCustom", (e, t) => {
  Ye.init(e, t), ue.init(e, t), e._zod.parse = (n, r) => n, e._zod.check = (n) => {
    const r = n.value, i = t.fn(r);
    if (i instanceof Promise)
      return i.then((s) => Da(s, n, r, e));
    Da(i, n, r, e);
  };
});
function Da(e, t, n, r) {
  if (!e) {
    const i = {
      code: "custom",
      input: n,
      inst: r,
      // incorporates params.error into issue reporting
      path: [...r._zod.def.path ?? []],
      // incorporates params.error into issue reporting
      continue: !r._zod.def.abort
      // params: inst._zod.def.params,
    };
    r._zod.def.params && (i.params = r._zod.def.params), t.issues.push(In(i));
  }
}
var za;
class ym {
  constructor() {
    this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map();
  }
  add(t, ...n) {
    const r = n[0];
    return this._map.set(t, r), r && typeof r == "object" && "id" in r && this._idmap.set(r.id, t), this;
  }
  clear() {
    return this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map(), this;
  }
  remove(t) {
    const n = this._map.get(t);
    return n && typeof n == "object" && "id" in n && this._idmap.delete(n.id), this._map.delete(t), this;
  }
  get(t) {
    const n = t._zod.parent;
    if (n) {
      const r = { ...this.get(n) ?? {} };
      delete r.id;
      const i = { ...r, ...this._map.get(t) };
      return Object.keys(i).length ? i : void 0;
    }
    return this._map.get(t);
  }
  has(t) {
    return this._map.has(t);
  }
}
function wm() {
  return new ym();
}
(za = globalThis).__zod_globalRegistry ?? (za.__zod_globalRegistry = wm());
const An = globalThis.__zod_globalRegistry;
// @__NO_SIDE_EFFECTS__
function Em(e, t) {
  return new e({
    type: "string",
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function _m(e, t) {
  return new e({
    type: "string",
    format: "email",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Fa(e, t) {
  return new e({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Sm(e, t) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Am(e, t) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v4",
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function km(e, t) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v6",
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Tm(e, t) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v7",
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Pm(e, t) {
  return new e({
    type: "string",
    format: "url",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Rm(e, t) {
  return new e({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function jm(e, t) {
  return new e({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Im(e, t) {
  return new e({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Om(e, t) {
  return new e({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function $m(e, t) {
  return new e({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Nm(e, t) {
  return new e({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Cm(e, t) {
  return new e({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Lm(e, t) {
  return new e({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Dm(e, t) {
  return new e({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function zm(e, t) {
  return new e({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Fm(e, t) {
  return new e({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Um(e, t) {
  return new e({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Bm(e, t) {
  return new e({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Mm(e, t) {
  return new e({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function qm(e, t) {
  return new e({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: !1,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Hm(e, t) {
  return new e({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: !1,
    local: !1,
    precision: null,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Vm(e, t) {
  return new e({
    type: "string",
    format: "date",
    check: "string_format",
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Zm(e, t) {
  return new e({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Wm(e, t) {
  return new e({
    type: "string",
    format: "duration",
    check: "string_format",
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Gm(e, t) {
  return new e({
    type: "boolean",
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Jm(e) {
  return new e({
    type: "unknown"
  });
}
// @__NO_SIDE_EFFECTS__
function Km(e, t) {
  return new e({
    type: "never",
    ...F(t)
  });
}
// @__NO_SIDE_EFFECTS__
function ml(e, t) {
  return new vf({
    check: "max_length",
    ...F(t),
    maximum: e
  });
}
// @__NO_SIDE_EFFECTS__
function Rr(e, t) {
  return new bf({
    check: "min_length",
    ...F(t),
    minimum: e
  });
}
// @__NO_SIDE_EFFECTS__
function hl(e, t) {
  return new xf({
    check: "length_equals",
    ...F(t),
    length: e
  });
}
// @__NO_SIDE_EFFECTS__
function Xm(e, t) {
  return new yf({
    check: "string_format",
    format: "regex",
    ...F(t),
    pattern: e
  });
}
// @__NO_SIDE_EFFECTS__
function Ym(e) {
  return new wf({
    check: "string_format",
    format: "lowercase",
    ...F(e)
  });
}
// @__NO_SIDE_EFFECTS__
function Qm(e) {
  return new Ef({
    check: "string_format",
    format: "uppercase",
    ...F(e)
  });
}
// @__NO_SIDE_EFFECTS__
function eh(e, t) {
  return new _f({
    check: "string_format",
    format: "includes",
    ...F(t),
    includes: e
  });
}
// @__NO_SIDE_EFFECTS__
function th(e, t) {
  return new Sf({
    check: "string_format",
    format: "starts_with",
    ...F(t),
    prefix: e
  });
}
// @__NO_SIDE_EFFECTS__
function nh(e, t) {
  return new Af({
    check: "string_format",
    format: "ends_with",
    ...F(t),
    suffix: e
  });
}
// @__NO_SIDE_EFFECTS__
function mn(e) {
  return new kf({
    check: "overwrite",
    tx: e
  });
}
// @__NO_SIDE_EFFECTS__
function rh(e) {
  return /* @__PURE__ */ mn((t) => t.normalize(e));
}
// @__NO_SIDE_EFFECTS__
function ih() {
  return /* @__PURE__ */ mn((e) => e.trim());
}
// @__NO_SIDE_EFFECTS__
function sh() {
  return /* @__PURE__ */ mn((e) => e.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function ah() {
  return /* @__PURE__ */ mn((e) => e.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function oh() {
  return /* @__PURE__ */ mn((e) => wd(e));
}
// @__NO_SIDE_EFFECTS__
function ch(e, t, n) {
  return new e({
    type: "array",
    element: t,
    // get element() {
    //   return element;
    // },
    ...F(n)
  });
}
// @__NO_SIDE_EFFECTS__
function lh(e, t, n) {
  return new e({
    type: "custom",
    check: "custom",
    fn: t,
    ...F(n)
  });
}
// @__NO_SIDE_EFFECTS__
function uh(e, t) {
  const n = /* @__PURE__ */ ph((r) => (r.addIssue = (i) => {
    if (typeof i == "string")
      r.issues.push(In(i, r.value, n._zod.def));
    else {
      const s = i;
      s.fatal && (s.continue = !1), s.code ?? (s.code = "custom"), s.input ?? (s.input = r.value), s.inst ?? (s.inst = n), s.continue ?? (s.continue = !n._zod.def.abort), r.issues.push(In(s));
    }
  }, e(r.value, r)), t);
  return n;
}
// @__NO_SIDE_EFFECTS__
function ph(e, t) {
  const n = new Ye({
    check: "custom",
    ...F(t)
  });
  return n._zod.check = e, n;
}
function gl(e) {
  let t = (e == null ? void 0 : e.target) ?? "draft-2020-12";
  return t === "draft-4" && (t = "draft-04"), t === "draft-7" && (t = "draft-07"), {
    processors: e.processors ?? {},
    metadataRegistry: (e == null ? void 0 : e.metadata) ?? An,
    target: t,
    unrepresentable: (e == null ? void 0 : e.unrepresentable) ?? "throw",
    override: (e == null ? void 0 : e.override) ?? (() => {
    }),
    io: (e == null ? void 0 : e.io) ?? "output",
    counter: 0,
    seen: /* @__PURE__ */ new Map(),
    cycles: (e == null ? void 0 : e.cycles) ?? "ref",
    reused: (e == null ? void 0 : e.reused) ?? "inline",
    external: (e == null ? void 0 : e.external) ?? void 0
  };
}
function Ee(e, t, n = { path: [], schemaPath: [] }) {
  var u, d;
  var r;
  const i = e._zod.def, s = t.seen.get(e);
  if (s)
    return s.count++, n.schemaPath.includes(e) && (s.cycle = n.path), s.schema;
  const a = { schema: {}, count: 1, cycle: void 0, path: n.path };
  t.seen.set(e, a);
  const c = (d = (u = e._zod).toJSONSchema) == null ? void 0 : d.call(u);
  if (c)
    a.schema = c;
  else {
    const f = {
      ...n,
      schemaPath: [...n.schemaPath, e],
      path: n.path
    };
    if (e._zod.processJSONSchema)
      e._zod.processJSONSchema(t, a.schema, f);
    else {
      const v = a.schema, g = t.processors[i.type];
      if (!g)
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${i.type}`);
      g(e, t, v, f);
    }
    const m = e._zod.parent;
    m && (a.ref || (a.ref = m), Ee(m, t, f), t.seen.get(m).isParent = !0);
  }
  const l = t.metadataRegistry.get(e);
  return l && Object.assign(a.schema, l), t.io === "input" && ke(e) && (delete a.schema.examples, delete a.schema.default), t.io === "input" && "_prefault" in a.schema && ((r = a.schema).default ?? (r.default = a.schema._prefault)), delete a.schema._prefault, t.seen.get(e).schema;
}
function vl(e, t) {
  var a, c, l, p;
  const n = e.seen.get(t);
  if (!n)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const r = /* @__PURE__ */ new Map();
  for (const u of e.seen.entries()) {
    const d = (a = e.metadataRegistry.get(u[0])) == null ? void 0 : a.id;
    if (d) {
      const f = r.get(d);
      if (f && f !== u[0])
        throw new Error(`Duplicate schema id "${d}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      r.set(d, u[0]);
    }
  }
  const i = (u) => {
    var g;
    const d = e.target === "draft-2020-12" ? "$defs" : "definitions";
    if (e.external) {
      const b = (g = e.external.registry.get(u[0])) == null ? void 0 : g.id, x = e.external.uri ?? ((D) => D);
      if (b)
        return { ref: x(b) };
      const I = u[1].defId ?? u[1].schema.id ?? `schema${e.counter++}`;
      return u[1].defId = I, { defId: I, ref: `${x("__shared")}#/${d}/${I}` };
    }
    if (u[1] === n)
      return { ref: "#" };
    const m = `#/${d}/`, v = u[1].schema.id ?? `__schema${e.counter++}`;
    return { defId: v, ref: m + v };
  }, s = (u) => {
    if (u[1].schema.$ref)
      return;
    const d = u[1], { ref: f, defId: m } = i(u);
    d.def = { ...d.schema }, m && (d.defId = m);
    const v = d.schema;
    for (const g in v)
      delete v[g];
    v.$ref = f;
  };
  if (e.cycles === "throw")
    for (const u of e.seen.entries()) {
      const d = u[1];
      if (d.cycle)
        throw new Error(`Cycle detected: #/${(c = d.cycle) == null ? void 0 : c.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
    }
  for (const u of e.seen.entries()) {
    const d = u[1];
    if (t === u[0]) {
      s(u);
      continue;
    }
    if (e.external) {
      const m = (l = e.external.registry.get(u[0])) == null ? void 0 : l.id;
      if (t !== u[0] && m) {
        s(u);
        continue;
      }
    }
    if ((p = e.metadataRegistry.get(u[0])) == null ? void 0 : p.id) {
      s(u);
      continue;
    }
    if (d.cycle) {
      s(u);
      continue;
    }
    if (d.count > 1 && e.reused === "ref") {
      s(u);
      continue;
    }
  }
}
function bl(e, t) {
  var c, l, p, u;
  const n = e.seen.get(t);
  if (!n)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const r = (d) => {
    const f = e.seen.get(d);
    if (f.ref === null)
      return;
    const m = f.def ?? f.schema, v = { ...m }, g = f.ref;
    if (f.ref = null, g) {
      r(g);
      const x = e.seen.get(g), I = x.schema;
      if (I.$ref && (e.target === "draft-07" || e.target === "draft-04" || e.target === "openapi-3.0") ? (m.allOf = m.allOf ?? [], m.allOf.push(I)) : Object.assign(m, I), Object.assign(m, v), d._zod.parent === g)
        for (const P in m)
          P === "$ref" || P === "allOf" || P in v || delete m[P];
      if (I.$ref && x.def)
        for (const P in m)
          P === "$ref" || P === "allOf" || P in x.def && JSON.stringify(m[P]) === JSON.stringify(x.def[P]) && delete m[P];
    }
    const b = d._zod.parent;
    if (b && b !== g) {
      r(b);
      const x = e.seen.get(b);
      if (x != null && x.schema.$ref && (m.$ref = x.schema.$ref, x.def))
        for (const I in m)
          I === "$ref" || I === "allOf" || I in x.def && JSON.stringify(m[I]) === JSON.stringify(x.def[I]) && delete m[I];
    }
    e.override({
      zodSchema: d,
      jsonSchema: m,
      path: f.path ?? []
    });
  };
  for (const d of [...e.seen.entries()].reverse())
    r(d[0]);
  const i = {};
  if (e.target === "draft-2020-12" ? i.$schema = "https://json-schema.org/draft/2020-12/schema" : e.target === "draft-07" ? i.$schema = "http://json-schema.org/draft-07/schema#" : e.target === "draft-04" ? i.$schema = "http://json-schema.org/draft-04/schema#" : e.target, (c = e.external) != null && c.uri) {
    const d = (l = e.external.registry.get(t)) == null ? void 0 : l.id;
    if (!d)
      throw new Error("Schema is missing an `id` property");
    i.$id = e.external.uri(d);
  }
  Object.assign(i, n.def ?? n.schema);
  const s = (p = e.metadataRegistry.get(t)) == null ? void 0 : p.id;
  s !== void 0 && i.id === s && delete i.id;
  const a = ((u = e.external) == null ? void 0 : u.defs) ?? {};
  for (const d of e.seen.entries()) {
    const f = d[1];
    f.def && f.defId && (f.def.id === f.defId && delete f.def.id, a[f.defId] = f.def);
  }
  e.external || Object.keys(a).length > 0 && (e.target === "draft-2020-12" ? i.$defs = a : i.definitions = a);
  try {
    const d = JSON.parse(JSON.stringify(i));
    return Object.defineProperty(d, "~standard", {
      value: {
        ...t["~standard"],
        jsonSchema: {
          input: jr(t, "input", e.processors),
          output: jr(t, "output", e.processors)
        }
      },
      enumerable: !1,
      writable: !1
    }), d;
  } catch {
    throw new Error("Error converting schema to JSON.");
  }
}
function ke(e, t) {
  const n = t ?? { seen: /* @__PURE__ */ new Set() };
  if (n.seen.has(e))
    return !1;
  n.seen.add(e);
  const r = e._zod.def;
  if (r.type === "transform")
    return !0;
  if (r.type === "array")
    return ke(r.element, n);
  if (r.type === "set")
    return ke(r.valueType, n);
  if (r.type === "lazy")
    return ke(r.getter(), n);
  if (r.type === "promise" || r.type === "optional" || r.type === "nonoptional" || r.type === "nullable" || r.type === "readonly" || r.type === "default" || r.type === "prefault")
    return ke(r.innerType, n);
  if (r.type === "intersection")
    return ke(r.left, n) || ke(r.right, n);
  if (r.type === "record" || r.type === "map")
    return ke(r.keyType, n) || ke(r.valueType, n);
  if (r.type === "pipe")
    return ke(r.in, n) || ke(r.out, n);
  if (r.type === "object") {
    for (const i in r.shape)
      if (ke(r.shape[i], n))
        return !0;
    return !1;
  }
  if (r.type === "union") {
    for (const i of r.options)
      if (ke(i, n))
        return !0;
    return !1;
  }
  if (r.type === "tuple") {
    for (const i of r.items)
      if (ke(i, n))
        return !0;
    return !!(r.rest && ke(r.rest, n));
  }
  return !1;
}
const dh = (e, t = {}) => (n) => {
  const r = gl({ ...n, processors: t });
  return Ee(e, r), vl(r, e), bl(r, e);
}, jr = (e, t, n = {}) => (r) => {
  const { libraryOptions: i, target: s } = r ?? {}, a = gl({ ...i ?? {}, target: s, io: t, processors: n });
  return Ee(e, a), vl(a, e), bl(a, e);
}, fh = {
  guid: "uuid",
  url: "uri",
  datetime: "date-time",
  json_string: "json-string",
  regex: ""
  // do not set
}, mh = (e, t, n, r) => {
  const i = n;
  i.type = "string";
  const { minimum: s, maximum: a, format: c, patterns: l, contentEncoding: p } = e._zod.bag;
  if (typeof s == "number" && (i.minLength = s), typeof a == "number" && (i.maxLength = a), c && (i.format = fh[c] ?? c, i.format === "" && delete i.format, c === "time" && delete i.format), p && (i.contentEncoding = p), l && l.size > 0) {
    const u = [...l];
    u.length === 1 ? i.pattern = u[0].source : u.length > 1 && (i.allOf = [
      ...u.map((d) => ({
        ...t.target === "draft-07" || t.target === "draft-04" || t.target === "openapi-3.0" ? { type: "string" } : {},
        pattern: d.source
      }))
    ]);
  }
}, hh = (e, t, n, r) => {
  n.type = "boolean";
}, gh = (e, t, n, r) => {
  n.not = {};
}, vh = (e, t, n, r) => {
}, bh = (e, t, n, r) => {
  const i = e._zod.def, s = el(i.entries);
  s.every((a) => typeof a == "number") && (n.type = "number"), s.every((a) => typeof a == "string") && (n.type = "string"), n.enum = s;
}, xh = (e, t, n, r) => {
  const i = e._zod.def, s = [];
  for (const a of i.values)
    if (a === void 0) {
      if (t.unrepresentable === "throw")
        throw new Error("Literal `undefined` cannot be represented in JSON Schema");
    } else if (typeof a == "bigint") {
      if (t.unrepresentable === "throw")
        throw new Error("BigInt literals cannot be represented in JSON Schema");
      s.push(Number(a));
    } else
      s.push(a);
  if (s.length !== 0) if (s.length === 1) {
    const a = s[0];
    n.type = a === null ? "null" : typeof a, t.target === "draft-04" || t.target === "openapi-3.0" ? n.enum = [a] : n.const = a;
  } else
    s.every((a) => typeof a == "number") && (n.type = "number"), s.every((a) => typeof a == "string") && (n.type = "string"), s.every((a) => typeof a == "boolean") && (n.type = "boolean"), s.every((a) => a === null) && (n.type = "null"), n.enum = s;
}, yh = (e, t, n, r) => {
  if (t.unrepresentable === "throw")
    throw new Error("Custom types cannot be represented in JSON Schema");
}, wh = (e, t, n, r) => {
  if (t.unrepresentable === "throw")
    throw new Error("Transforms cannot be represented in JSON Schema");
}, Eh = (e, t, n, r) => {
  const i = n, s = e._zod.def, { minimum: a, maximum: c } = e._zod.bag;
  typeof a == "number" && (i.minItems = a), typeof c == "number" && (i.maxItems = c), i.type = "array", i.items = Ee(s.element, t, {
    ...r,
    path: [...r.path, "items"]
  });
}, _h = (e, t, n, r) => {
  var p;
  const i = n, s = e._zod.def;
  i.type = "object", i.properties = {};
  const a = s.shape;
  for (const u in a)
    i.properties[u] = Ee(a[u], t, {
      ...r,
      path: [...r.path, "properties", u]
    });
  const c = new Set(Object.keys(a)), l = new Set([...c].filter((u) => {
    const d = s.shape[u]._zod;
    return t.io === "input" ? d.optin === void 0 : d.optout === void 0;
  }));
  l.size > 0 && (i.required = Array.from(l)), ((p = s.catchall) == null ? void 0 : p._zod.def.type) === "never" ? i.additionalProperties = !1 : s.catchall ? s.catchall && (i.additionalProperties = Ee(s.catchall, t, {
    ...r,
    path: [...r.path, "additionalProperties"]
  })) : t.io === "output" && (i.additionalProperties = !1);
}, Sh = (e, t, n, r) => {
  const i = e._zod.def, s = i.inclusive === !1, a = i.options.map((c, l) => Ee(c, t, {
    ...r,
    path: [...r.path, s ? "oneOf" : "anyOf", l]
  }));
  s ? n.oneOf = a : n.anyOf = a;
}, Ah = (e, t, n, r) => {
  const i = e._zod.def, s = Ee(i.left, t, {
    ...r,
    path: [...r.path, "allOf", 0]
  }), a = Ee(i.right, t, {
    ...r,
    path: [...r.path, "allOf", 1]
  }), c = (p) => "allOf" in p && Object.keys(p).length === 1, l = [
    ...c(s) ? s.allOf : [s],
    ...c(a) ? a.allOf : [a]
  ];
  n.allOf = l;
}, kh = (e, t, n, r) => {
  const i = e._zod.def, s = Ee(i.innerType, t, r), a = t.seen.get(e);
  t.target === "openapi-3.0" ? (a.ref = i.innerType, n.nullable = !0) : n.anyOf = [s, { type: "null" }];
}, Th = (e, t, n, r) => {
  const i = e._zod.def;
  Ee(i.innerType, t, r);
  const s = t.seen.get(e);
  s.ref = i.innerType;
}, Ph = (e, t, n, r) => {
  const i = e._zod.def;
  Ee(i.innerType, t, r);
  const s = t.seen.get(e);
  s.ref = i.innerType, n.default = JSON.parse(JSON.stringify(i.defaultValue));
}, Rh = (e, t, n, r) => {
  const i = e._zod.def;
  Ee(i.innerType, t, r);
  const s = t.seen.get(e);
  s.ref = i.innerType, t.io === "input" && (n._prefault = JSON.parse(JSON.stringify(i.defaultValue)));
}, jh = (e, t, n, r) => {
  const i = e._zod.def;
  Ee(i.innerType, t, r);
  const s = t.seen.get(e);
  s.ref = i.innerType;
  let a;
  try {
    a = i.catchValue(void 0);
  } catch {
    throw new Error("Dynamic catch values are not supported in JSON Schema");
  }
  n.default = a;
}, Ih = (e, t, n, r) => {
  const i = e._zod.def, s = t.io === "input" ? i.in._zod.def.type === "transform" ? i.out : i.in : i.out;
  Ee(s, t, r);
  const a = t.seen.get(e);
  a.ref = s;
}, Oh = (e, t, n, r) => {
  const i = e._zod.def;
  Ee(i.innerType, t, r);
  const s = t.seen.get(e);
  s.ref = i.innerType, n.readOnly = !0;
}, xl = (e, t, n, r) => {
  const i = e._zod.def;
  Ee(i.innerType, t, r);
  const s = t.seen.get(e);
  s.ref = i.innerType;
}, $h = /* @__PURE__ */ w("ZodISODateTime", (e, t) => {
  Uf.init(e, t), te.init(e, t);
});
function Nh(e) {
  return /* @__PURE__ */ Hm($h, e);
}
const Ch = /* @__PURE__ */ w("ZodISODate", (e, t) => {
  Bf.init(e, t), te.init(e, t);
});
function Lh(e) {
  return /* @__PURE__ */ Vm(Ch, e);
}
const Dh = /* @__PURE__ */ w("ZodISOTime", (e, t) => {
  Mf.init(e, t), te.init(e, t);
});
function zh(e) {
  return /* @__PURE__ */ Zm(Dh, e);
}
const Fh = /* @__PURE__ */ w("ZodISODuration", (e, t) => {
  qf.init(e, t), te.init(e, t);
});
function Uh(e) {
  return /* @__PURE__ */ Wm(Fh, e);
}
const yl = (e, t) => {
  sl.init(e, t), e.name = "ZodError", Object.defineProperties(e, {
    format: {
      value: (n) => Nd(e, n)
      // enumerable: false,
    },
    flatten: {
      value: (n) => $d(e, n)
      // enumerable: false,
    },
    addIssue: {
      value: (n) => {
        e.issues.push(n), e.message = JSON.stringify(e.issues, ts, 2);
      }
      // enumerable: false,
    },
    addIssues: {
      value: (n) => {
        e.issues.push(...n), e.message = JSON.stringify(e.issues, ts, 2);
      }
      // enumerable: false,
    },
    isEmpty: {
      get() {
        return e.issues.length === 0;
      }
      // enumerable: false,
    }
  });
}, wl = /* @__PURE__ */ w("ZodError", yl), Be = /* @__PURE__ */ w("ZodError", yl, {
  Parent: Error
}), Bh = /* @__PURE__ */ $s(Be), Mh = /* @__PURE__ */ Ns(Be), qh = /* @__PURE__ */ qr(Be), Hh = /* @__PURE__ */ Hr(Be), Vh = /* @__PURE__ */ Dd(Be), Zh = /* @__PURE__ */ zd(Be), Wh = /* @__PURE__ */ Fd(Be), Gh = /* @__PURE__ */ Ud(Be), Jh = /* @__PURE__ */ Bd(Be), Kh = /* @__PURE__ */ Md(Be), Xh = /* @__PURE__ */ qd(Be), Yh = /* @__PURE__ */ Hd(Be), Ua = /* @__PURE__ */ new WeakMap();
function Zr(e, t, n) {
  const r = Object.getPrototypeOf(e);
  let i = Ua.get(r);
  if (i || (i = /* @__PURE__ */ new Set(), Ua.set(r, i)), !i.has(t)) {
    i.add(t);
    for (const s in n) {
      const a = n[s];
      Object.defineProperty(r, s, {
        configurable: !0,
        enumerable: !1,
        get() {
          const c = a.bind(this);
          return Object.defineProperty(this, s, {
            configurable: !0,
            writable: !0,
            enumerable: !0,
            value: c
          }), c;
        },
        set(c) {
          Object.defineProperty(this, s, {
            configurable: !0,
            writable: !0,
            enumerable: !0,
            value: c
          });
        }
      });
    }
  }
}
const pe = /* @__PURE__ */ w("ZodType", (e, t) => (ue.init(e, t), Object.assign(e["~standard"], {
  jsonSchema: {
    input: jr(e, "input"),
    output: jr(e, "output")
  }
}), e.toJSONSchema = dh(e, {}), e.def = t, e.type = t.type, Object.defineProperty(e, "_def", { value: t }), e.parse = (n, r) => Bh(e, n, r, { callee: e.parse }), e.safeParse = (n, r) => qh(e, n, r), e.parseAsync = async (n, r) => Mh(e, n, r, { callee: e.parseAsync }), e.safeParseAsync = async (n, r) => Hh(e, n, r), e.spa = e.safeParseAsync, e.encode = (n, r) => Vh(e, n, r), e.decode = (n, r) => Zh(e, n, r), e.encodeAsync = async (n, r) => Wh(e, n, r), e.decodeAsync = async (n, r) => Gh(e, n, r), e.safeEncode = (n, r) => Jh(e, n, r), e.safeDecode = (n, r) => Kh(e, n, r), e.safeEncodeAsync = async (n, r) => Xh(e, n, r), e.safeDecodeAsync = async (n, r) => Yh(e, n, r), Zr(e, "ZodType", {
  check(...n) {
    const r = this.def;
    return this.clone(bt(r, {
      checks: [
        ...r.checks ?? [],
        ...n.map((i) => typeof i == "function" ? { _zod: { check: i, def: { check: "custom" }, onattach: [] } } : i)
      ]
    }), { parent: !0 });
  },
  with(...n) {
    return this.check(...n);
  },
  clone(n, r) {
    return xt(this, n, r);
  },
  brand() {
    return this;
  },
  register(n, r) {
    return n.add(this, r), this;
  },
  refine(n, r) {
    return this.check(Zg(n, r));
  },
  superRefine(n, r) {
    return this.check(Wg(n, r));
  },
  overwrite(n) {
    return this.check(/* @__PURE__ */ mn(n));
  },
  optional() {
    return qa(this);
  },
  exactOptional() {
    return $g(this);
  },
  nullable() {
    return Ha(this);
  },
  nullish() {
    return qa(Ha(this));
  },
  nonoptional(n) {
    return Fg(this, n);
  },
  array() {
    return _g(this);
  },
  or(n) {
    return kg([this, n]);
  },
  and(n) {
    return Pg(this, n);
  },
  transform(n) {
    return Va(this, Ig(n));
  },
  default(n) {
    return Lg(this, n);
  },
  prefault(n) {
    return zg(this, n);
  },
  catch(n) {
    return Bg(this, n);
  },
  pipe(n) {
    return Va(this, n);
  },
  readonly() {
    return Hg(this);
  },
  describe(n) {
    const r = this.clone();
    return An.add(r, { description: n }), r;
  },
  meta(...n) {
    if (n.length === 0)
      return An.get(this);
    const r = this.clone();
    return An.add(r, n[0]), r;
  },
  isOptional() {
    return this.safeParse(void 0).success;
  },
  isNullable() {
    return this.safeParse(null).success;
  },
  apply(n) {
    return n(this);
  }
}), Object.defineProperty(e, "description", {
  get() {
    var n;
    return (n = An.get(e)) == null ? void 0 : n.description;
  },
  configurable: !0
}), e)), El = /* @__PURE__ */ w("_ZodString", (e, t) => {
  Cs.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (r, i, s) => mh(e, r, i);
  const n = e._zod.bag;
  e.format = n.format ?? null, e.minLength = n.minimum ?? null, e.maxLength = n.maximum ?? null, Zr(e, "_ZodString", {
    regex(...r) {
      return this.check(/* @__PURE__ */ Xm(...r));
    },
    includes(...r) {
      return this.check(/* @__PURE__ */ eh(...r));
    },
    startsWith(...r) {
      return this.check(/* @__PURE__ */ th(...r));
    },
    endsWith(...r) {
      return this.check(/* @__PURE__ */ nh(...r));
    },
    min(...r) {
      return this.check(/* @__PURE__ */ Rr(...r));
    },
    max(...r) {
      return this.check(/* @__PURE__ */ ml(...r));
    },
    length(...r) {
      return this.check(/* @__PURE__ */ hl(...r));
    },
    nonempty(...r) {
      return this.check(/* @__PURE__ */ Rr(1, ...r));
    },
    lowercase(r) {
      return this.check(/* @__PURE__ */ Ym(r));
    },
    uppercase(r) {
      return this.check(/* @__PURE__ */ Qm(r));
    },
    trim() {
      return this.check(/* @__PURE__ */ ih());
    },
    normalize(...r) {
      return this.check(/* @__PURE__ */ rh(...r));
    },
    toLowerCase() {
      return this.check(/* @__PURE__ */ sh());
    },
    toUpperCase() {
      return this.check(/* @__PURE__ */ ah());
    },
    slugify() {
      return this.check(/* @__PURE__ */ oh());
    }
  });
}), Qh = /* @__PURE__ */ w("ZodString", (e, t) => {
  Cs.init(e, t), El.init(e, t), e.email = (n) => e.check(/* @__PURE__ */ _m(eg, n)), e.url = (n) => e.check(/* @__PURE__ */ Pm(tg, n)), e.jwt = (n) => e.check(/* @__PURE__ */ qm(gg, n)), e.emoji = (n) => e.check(/* @__PURE__ */ Rm(ng, n)), e.guid = (n) => e.check(/* @__PURE__ */ Fa(Ba, n)), e.uuid = (n) => e.check(/* @__PURE__ */ Sm(er, n)), e.uuidv4 = (n) => e.check(/* @__PURE__ */ Am(er, n)), e.uuidv6 = (n) => e.check(/* @__PURE__ */ km(er, n)), e.uuidv7 = (n) => e.check(/* @__PURE__ */ Tm(er, n)), e.nanoid = (n) => e.check(/* @__PURE__ */ jm(rg, n)), e.guid = (n) => e.check(/* @__PURE__ */ Fa(Ba, n)), e.cuid = (n) => e.check(/* @__PURE__ */ Im(ig, n)), e.cuid2 = (n) => e.check(/* @__PURE__ */ Om(sg, n)), e.ulid = (n) => e.check(/* @__PURE__ */ $m(ag, n)), e.base64 = (n) => e.check(/* @__PURE__ */ Um(fg, n)), e.base64url = (n) => e.check(/* @__PURE__ */ Bm(mg, n)), e.xid = (n) => e.check(/* @__PURE__ */ Nm(og, n)), e.ksuid = (n) => e.check(/* @__PURE__ */ Cm(cg, n)), e.ipv4 = (n) => e.check(/* @__PURE__ */ Lm(lg, n)), e.ipv6 = (n) => e.check(/* @__PURE__ */ Dm(ug, n)), e.cidrv4 = (n) => e.check(/* @__PURE__ */ zm(pg, n)), e.cidrv6 = (n) => e.check(/* @__PURE__ */ Fm(dg, n)), e.e164 = (n) => e.check(/* @__PURE__ */ Mm(hg, n)), e.datetime = (n) => e.check(Nh(n)), e.date = (n) => e.check(Lh(n)), e.time = (n) => e.check(zh(n)), e.duration = (n) => e.check(Uh(n));
});
function de(e) {
  return /* @__PURE__ */ Em(Qh, e);
}
const te = /* @__PURE__ */ w("ZodStringFormat", (e, t) => {
  ee.init(e, t), El.init(e, t);
}), eg = /* @__PURE__ */ w("ZodEmail", (e, t) => {
  If.init(e, t), te.init(e, t);
}), Ba = /* @__PURE__ */ w("ZodGUID", (e, t) => {
  Rf.init(e, t), te.init(e, t);
}), er = /* @__PURE__ */ w("ZodUUID", (e, t) => {
  jf.init(e, t), te.init(e, t);
}), tg = /* @__PURE__ */ w("ZodURL", (e, t) => {
  Of.init(e, t), te.init(e, t);
}), ng = /* @__PURE__ */ w("ZodEmoji", (e, t) => {
  $f.init(e, t), te.init(e, t);
}), rg = /* @__PURE__ */ w("ZodNanoID", (e, t) => {
  Nf.init(e, t), te.init(e, t);
}), ig = /* @__PURE__ */ w("ZodCUID", (e, t) => {
  Cf.init(e, t), te.init(e, t);
}), sg = /* @__PURE__ */ w("ZodCUID2", (e, t) => {
  Lf.init(e, t), te.init(e, t);
}), ag = /* @__PURE__ */ w("ZodULID", (e, t) => {
  Df.init(e, t), te.init(e, t);
}), og = /* @__PURE__ */ w("ZodXID", (e, t) => {
  zf.init(e, t), te.init(e, t);
}), cg = /* @__PURE__ */ w("ZodKSUID", (e, t) => {
  Ff.init(e, t), te.init(e, t);
}), lg = /* @__PURE__ */ w("ZodIPv4", (e, t) => {
  Hf.init(e, t), te.init(e, t);
}), ug = /* @__PURE__ */ w("ZodIPv6", (e, t) => {
  Vf.init(e, t), te.init(e, t);
}), pg = /* @__PURE__ */ w("ZodCIDRv4", (e, t) => {
  Zf.init(e, t), te.init(e, t);
}), dg = /* @__PURE__ */ w("ZodCIDRv6", (e, t) => {
  Wf.init(e, t), te.init(e, t);
}), fg = /* @__PURE__ */ w("ZodBase64", (e, t) => {
  Gf.init(e, t), te.init(e, t);
}), mg = /* @__PURE__ */ w("ZodBase64URL", (e, t) => {
  Kf.init(e, t), te.init(e, t);
}), hg = /* @__PURE__ */ w("ZodE164", (e, t) => {
  Xf.init(e, t), te.init(e, t);
}), gg = /* @__PURE__ */ w("ZodJWT", (e, t) => {
  Qf.init(e, t), te.init(e, t);
}), vg = /* @__PURE__ */ w("ZodBoolean", (e, t) => {
  em.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => hh(e, n, r);
});
function bg(e) {
  return /* @__PURE__ */ Gm(vg, e);
}
const xg = /* @__PURE__ */ w("ZodUnknown", (e, t) => {
  tm.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => vh();
});
function Ma() {
  return /* @__PURE__ */ Jm(xg);
}
const yg = /* @__PURE__ */ w("ZodNever", (e, t) => {
  nm.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => gh(e, n, r);
});
function wg(e) {
  return /* @__PURE__ */ Km(yg, e);
}
const Eg = /* @__PURE__ */ w("ZodArray", (e, t) => {
  rm.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => Eh(e, n, r, i), e.element = t.element, Zr(e, "ZodArray", {
    min(n, r) {
      return this.check(/* @__PURE__ */ Rr(n, r));
    },
    nonempty(n) {
      return this.check(/* @__PURE__ */ Rr(1, n));
    },
    max(n, r) {
      return this.check(/* @__PURE__ */ ml(n, r));
    },
    length(n, r) {
      return this.check(/* @__PURE__ */ hl(n, r));
    },
    unwrap() {
      return this.element;
    }
  });
});
function _g(e, t) {
  return /* @__PURE__ */ ch(Eg, e, t);
}
const Sg = /* @__PURE__ */ w("ZodObject", (e, t) => {
  sm.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => _h(e, n, r, i), W(e, "shape", () => t.shape), Zr(e, "ZodObject", {
    keyof() {
      return is(Object.keys(this._zod.def.shape));
    },
    catchall(n) {
      return this.clone({ ...this._zod.def, catchall: n });
    },
    passthrough() {
      return this.clone({ ...this._zod.def, catchall: Ma() });
    },
    loose() {
      return this.clone({ ...this._zod.def, catchall: Ma() });
    },
    strict() {
      return this.clone({ ...this._zod.def, catchall: wg() });
    },
    strip() {
      return this.clone({ ...this._zod.def, catchall: void 0 });
    },
    extend(n) {
      return Td(this, n);
    },
    safeExtend(n) {
      return Pd(this, n);
    },
    merge(n) {
      return Rd(this, n);
    },
    pick(n) {
      return Ad(this, n);
    },
    omit(n) {
      return kd(this, n);
    },
    partial(...n) {
      return jd(Sl, this, n[0]);
    },
    required(...n) {
      return Id(Al, this, n[0]);
    }
  });
});
function Fn(e, t) {
  const n = {
    type: "object",
    shape: e ?? {},
    ...F(t)
  };
  return new Sg(n);
}
const Ag = /* @__PURE__ */ w("ZodUnion", (e, t) => {
  am.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => Sh(e, n, r, i), e.options = t.options;
});
function kg(e, t) {
  return new Ag({
    type: "union",
    options: e,
    ...F(t)
  });
}
const Tg = /* @__PURE__ */ w("ZodIntersection", (e, t) => {
  om.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => Ah(e, n, r, i);
});
function Pg(e, t) {
  return new Tg({
    type: "intersection",
    left: e,
    right: t
  });
}
const rs = /* @__PURE__ */ w("ZodEnum", (e, t) => {
  cm.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (r, i, s) => bh(e, r, i), e.enum = t.entries, e.options = Object.values(t.entries);
  const n = new Set(Object.keys(t.entries));
  e.extract = (r, i) => {
    const s = {};
    for (const a of r)
      if (n.has(a))
        s[a] = t.entries[a];
      else
        throw new Error(`Key ${a} not found in enum`);
    return new rs({
      ...t,
      checks: [],
      ...F(i),
      entries: s
    });
  }, e.exclude = (r, i) => {
    const s = { ...t.entries };
    for (const a of r)
      if (n.has(a))
        delete s[a];
      else
        throw new Error(`Key ${a} not found in enum`);
    return new rs({
      ...t,
      checks: [],
      ...F(i),
      entries: s
    });
  };
});
function is(e, t) {
  const n = Array.isArray(e) ? Object.fromEntries(e.map((r) => [r, r])) : e;
  return new rs({
    type: "enum",
    entries: n,
    ...F(t)
  });
}
const Rg = /* @__PURE__ */ w("ZodLiteral", (e, t) => {
  lm.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => xh(e, n, r), e.values = new Set(t.values), Object.defineProperty(e, "value", {
    get() {
      if (t.values.length > 1)
        throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
      return t.values[0];
    }
  });
});
function _l(e, t) {
  return new Rg({
    type: "literal",
    values: Array.isArray(e) ? e : [e],
    ...F(t)
  });
}
const jg = /* @__PURE__ */ w("ZodTransform", (e, t) => {
  um.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => wh(e, n), e._zod.parse = (n, r) => {
    if (r.direction === "backward")
      throw new Qc(e.constructor.name);
    n.addIssue = (s) => {
      if (typeof s == "string")
        n.issues.push(In(s, n.value, t));
      else {
        const a = s;
        a.fatal && (a.continue = !1), a.code ?? (a.code = "custom"), a.input ?? (a.input = n.value), a.inst ?? (a.inst = e), n.issues.push(In(a));
      }
    };
    const i = t.transform(n.value, n);
    return i instanceof Promise ? i.then((s) => (n.value = s, n)) : (n.value = i, n);
  };
});
function Ig(e) {
  return new jg({
    type: "transform",
    transform: e
  });
}
const Sl = /* @__PURE__ */ w("ZodOptional", (e, t) => {
  fl.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => xl(e, n, r, i), e.unwrap = () => e._zod.def.innerType;
});
function qa(e) {
  return new Sl({
    type: "optional",
    innerType: e
  });
}
const Og = /* @__PURE__ */ w("ZodExactOptional", (e, t) => {
  pm.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => xl(e, n, r, i), e.unwrap = () => e._zod.def.innerType;
});
function $g(e) {
  return new Og({
    type: "optional",
    innerType: e
  });
}
const Ng = /* @__PURE__ */ w("ZodNullable", (e, t) => {
  dm.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => kh(e, n, r, i), e.unwrap = () => e._zod.def.innerType;
});
function Ha(e) {
  return new Ng({
    type: "nullable",
    innerType: e
  });
}
const Cg = /* @__PURE__ */ w("ZodDefault", (e, t) => {
  fm.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => Ph(e, n, r, i), e.unwrap = () => e._zod.def.innerType, e.removeDefault = e.unwrap;
});
function Lg(e, t) {
  return new Cg({
    type: "default",
    innerType: e,
    get defaultValue() {
      return typeof t == "function" ? t() : nl(t);
    }
  });
}
const Dg = /* @__PURE__ */ w("ZodPrefault", (e, t) => {
  mm.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => Rh(e, n, r, i), e.unwrap = () => e._zod.def.innerType;
});
function zg(e, t) {
  return new Dg({
    type: "prefault",
    innerType: e,
    get defaultValue() {
      return typeof t == "function" ? t() : nl(t);
    }
  });
}
const Al = /* @__PURE__ */ w("ZodNonOptional", (e, t) => {
  hm.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => Th(e, n, r, i), e.unwrap = () => e._zod.def.innerType;
});
function Fg(e, t) {
  return new Al({
    type: "nonoptional",
    innerType: e,
    ...F(t)
  });
}
const Ug = /* @__PURE__ */ w("ZodCatch", (e, t) => {
  gm.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => jh(e, n, r, i), e.unwrap = () => e._zod.def.innerType, e.removeCatch = e.unwrap;
});
function Bg(e, t) {
  return new Ug({
    type: "catch",
    innerType: e,
    catchValue: typeof t == "function" ? t : () => t
  });
}
const Mg = /* @__PURE__ */ w("ZodPipe", (e, t) => {
  vm.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => Ih(e, n, r, i), e.in = t.in, e.out = t.out;
});
function Va(e, t) {
  return new Mg({
    type: "pipe",
    in: e,
    out: t
    // ...util.normalizeParams(params),
  });
}
const qg = /* @__PURE__ */ w("ZodReadonly", (e, t) => {
  bm.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => Oh(e, n, r, i), e.unwrap = () => e._zod.def.innerType;
});
function Hg(e) {
  return new qg({
    type: "readonly",
    innerType: e
  });
}
const Vg = /* @__PURE__ */ w("ZodCustom", (e, t) => {
  xm.init(e, t), pe.init(e, t), e._zod.processJSONSchema = (n, r, i) => yh(e, n);
});
function Zg(e, t = {}) {
  return /* @__PURE__ */ lh(Vg, e, t);
}
function Wg(e, t) {
  return /* @__PURE__ */ uh(e, t);
}
const se = {
  AUTH_LOGIN: "auth:login",
  AUTH_LOGOUT: "auth:logout",
  AUTH_STATUS: "auth:status",
  CONNECTION_TEST: "app:connection-test",
  APP_INFO: "app:info",
  PROJECTS_LIST: "projects:list",
  TRACKING_STATUS: "tracking:status",
  TRACKING_START: "tracking:start",
  TRACKING_STOP: "tracking:stop",
  TRACKING_SAVE_DESCRIPTION: "tracking:save-description",
  RECENT_PROJECTS: "projects:recent"
};
function kl(e, t) {
  return function() {
    return e.apply(t, arguments);
  };
}
const { toString: Gg } = Object.prototype, { getPrototypeOf: Wr } = Object, { iterator: Gr, toStringTag: Tl } = Symbol, Jr = /* @__PURE__ */ ((e) => (t) => {
  const n = Gg.call(t);
  return e[n] || (e[n] = n.slice(8, -1).toLowerCase());
})(/* @__PURE__ */ Object.create(null)), qe = (e) => (e = e.toLowerCase(), (t) => Jr(t) === e), Kr = (e) => (t) => typeof t === e, { isArray: hn } = Array, on = Kr("undefined");
function Un(e) {
  return e !== null && !on(e) && e.constructor !== null && !on(e.constructor) && Ie(e.constructor.isBuffer) && e.constructor.isBuffer(e);
}
const Pl = qe("ArrayBuffer");
function Jg(e) {
  let t;
  return typeof ArrayBuffer < "u" && ArrayBuffer.isView ? t = ArrayBuffer.isView(e) : t = e && e.buffer && Pl(e.buffer), t;
}
const Kg = Kr("string"), Ie = Kr("function"), Rl = Kr("number"), Bn = (e) => e !== null && typeof e == "object", Xg = (e) => e === !0 || e === !1, yr = (e) => {
  if (Jr(e) !== "object")
    return !1;
  const t = Wr(e);
  return (t === null || t === Object.prototype || Object.getPrototypeOf(t) === null) && !(Tl in e) && !(Gr in e);
}, Yg = (e) => {
  if (!Bn(e) || Un(e))
    return !1;
  try {
    return Object.keys(e).length === 0 && Object.getPrototypeOf(e) === Object.prototype;
  } catch {
    return !1;
  }
}, Qg = qe("Date"), ev = qe("File"), tv = (e) => !!(e && typeof e.uri < "u"), nv = (e) => e && typeof e.getParts < "u", rv = qe("Blob"), iv = qe("FileList"), sv = (e) => Bn(e) && Ie(e.pipe);
function av() {
  return typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {};
}
const Za = av(), Wa = typeof Za.FormData < "u" ? Za.FormData : void 0, ov = (e) => {
  if (!e) return !1;
  if (Wa && e instanceof Wa) return !0;
  const t = Wr(e);
  if (!t || t === Object.prototype || !Ie(e.append)) return !1;
  const n = Jr(e);
  return n === "formdata" || // detect form-data instance
  n === "object" && Ie(e.toString) && e.toString() === "[object FormData]";
}, cv = qe("URLSearchParams"), [lv, uv, pv, dv] = [
  "ReadableStream",
  "Request",
  "Response",
  "Headers"
].map(qe), fv = (e) => e.trim ? e.trim() : e.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
function Mn(e, t, { allOwnKeys: n = !1 } = {}) {
  if (e === null || typeof e > "u")
    return;
  let r, i;
  if (typeof e != "object" && (e = [e]), hn(e))
    for (r = 0, i = e.length; r < i; r++)
      t.call(null, e[r], r, e);
  else {
    if (Un(e))
      return;
    const s = n ? Object.getOwnPropertyNames(e) : Object.keys(e), a = s.length;
    let c;
    for (r = 0; r < a; r++)
      c = s[r], t.call(null, e[c], c, e);
  }
}
function jl(e, t) {
  if (Un(e))
    return null;
  t = t.toLowerCase();
  const n = Object.keys(e);
  let r = n.length, i;
  for (; r-- > 0; )
    if (i = n[r], t === i.toLowerCase())
      return i;
  return null;
}
const wt = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : global, Il = (e) => !on(e) && e !== wt;
function ss() {
  const { caseless: e, skipUndefined: t } = Il(this) && this || {}, n = {}, r = (i, s) => {
    if (s === "__proto__" || s === "constructor" || s === "prototype")
      return;
    const a = e && jl(n, s) || s;
    yr(n[a]) && yr(i) ? n[a] = ss(n[a], i) : yr(i) ? n[a] = ss({}, i) : hn(i) ? n[a] = i.slice() : (!t || !on(i)) && (n[a] = i);
  };
  for (let i = 0, s = arguments.length; i < s; i++)
    arguments[i] && Mn(arguments[i], r);
  return n;
}
const mv = (e, t, n, { allOwnKeys: r } = {}) => (Mn(
  t,
  (i, s) => {
    n && Ie(i) ? Object.defineProperty(e, s, {
      value: kl(i, n),
      writable: !0,
      enumerable: !0,
      configurable: !0
    }) : Object.defineProperty(e, s, {
      value: i,
      writable: !0,
      enumerable: !0,
      configurable: !0
    });
  },
  { allOwnKeys: r }
), e), hv = (e) => (e.charCodeAt(0) === 65279 && (e = e.slice(1)), e), gv = (e, t, n, r) => {
  e.prototype = Object.create(t.prototype, r), Object.defineProperty(e.prototype, "constructor", {
    value: e,
    writable: !0,
    enumerable: !1,
    configurable: !0
  }), Object.defineProperty(e, "super", {
    value: t.prototype
  }), n && Object.assign(e.prototype, n);
}, vv = (e, t, n, r) => {
  let i, s, a;
  const c = {};
  if (t = t || {}, e == null) return t;
  do {
    for (i = Object.getOwnPropertyNames(e), s = i.length; s-- > 0; )
      a = i[s], (!r || r(a, e, t)) && !c[a] && (t[a] = e[a], c[a] = !0);
    e = n !== !1 && Wr(e);
  } while (e && (!n || n(e, t)) && e !== Object.prototype);
  return t;
}, bv = (e, t, n) => {
  e = String(e), (n === void 0 || n > e.length) && (n = e.length), n -= t.length;
  const r = e.indexOf(t, n);
  return r !== -1 && r === n;
}, xv = (e) => {
  if (!e) return null;
  if (hn(e)) return e;
  let t = e.length;
  if (!Rl(t)) return null;
  const n = new Array(t);
  for (; t-- > 0; )
    n[t] = e[t];
  return n;
}, yv = /* @__PURE__ */ ((e) => (t) => e && t instanceof e)(typeof Uint8Array < "u" && Wr(Uint8Array)), wv = (e, t) => {
  const r = (e && e[Gr]).call(e);
  let i;
  for (; (i = r.next()) && !i.done; ) {
    const s = i.value;
    t.call(e, s[0], s[1]);
  }
}, Ev = (e, t) => {
  let n;
  const r = [];
  for (; (n = e.exec(t)) !== null; )
    r.push(n);
  return r;
}, _v = qe("HTMLFormElement"), Sv = (e) => e.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function(n, r, i) {
  return r.toUpperCase() + i;
}), Ga = (({ hasOwnProperty: e }) => (t, n) => e.call(t, n))(Object.prototype), Av = qe("RegExp"), Ol = (e, t) => {
  const n = Object.getOwnPropertyDescriptors(e), r = {};
  Mn(n, (i, s) => {
    let a;
    (a = t(i, s, e)) !== !1 && (r[s] = a || i);
  }), Object.defineProperties(e, r);
}, kv = (e) => {
  Ol(e, (t, n) => {
    if (Ie(e) && ["arguments", "caller", "callee"].indexOf(n) !== -1)
      return !1;
    const r = e[n];
    if (Ie(r)) {
      if (t.enumerable = !1, "writable" in t) {
        t.writable = !1;
        return;
      }
      t.set || (t.set = () => {
        throw Error("Can not rewrite read-only method '" + n + "'");
      });
    }
  });
}, Tv = (e, t) => {
  const n = {}, r = (i) => {
    i.forEach((s) => {
      n[s] = !0;
    });
  };
  return hn(e) ? r(e) : r(String(e).split(t)), n;
}, Pv = () => {
}, Rv = (e, t) => e != null && Number.isFinite(e = +e) ? e : t;
function jv(e) {
  return !!(e && Ie(e.append) && e[Tl] === "FormData" && e[Gr]);
}
const Iv = (e) => {
  const t = new Array(10), n = (r, i) => {
    if (Bn(r)) {
      if (t.indexOf(r) >= 0)
        return;
      if (Un(r))
        return r;
      if (!("toJSON" in r)) {
        t[i] = r;
        const s = hn(r) ? [] : {};
        return Mn(r, (a, c) => {
          const l = n(a, i + 1);
          !on(l) && (s[c] = l);
        }), t[i] = void 0, s;
      }
    }
    return r;
  };
  return n(e, 0);
}, Ov = qe("AsyncFunction"), $v = (e) => e && (Bn(e) || Ie(e)) && Ie(e.then) && Ie(e.catch), $l = ((e, t) => e ? setImmediate : t ? ((n, r) => (wt.addEventListener(
  "message",
  ({ source: i, data: s }) => {
    i === wt && s === n && r.length && r.shift()();
  },
  !1
), (i) => {
  r.push(i), wt.postMessage(n, "*");
}))(`axios@${Math.random()}`, []) : (n) => setTimeout(n))(typeof setImmediate == "function", Ie(wt.postMessage)), Nv = typeof queueMicrotask < "u" ? queueMicrotask.bind(wt) : typeof process < "u" && process.nextTick || $l, Cv = (e) => e != null && Ie(e[Gr]), h = {
  isArray: hn,
  isArrayBuffer: Pl,
  isBuffer: Un,
  isFormData: ov,
  isArrayBufferView: Jg,
  isString: Kg,
  isNumber: Rl,
  isBoolean: Xg,
  isObject: Bn,
  isPlainObject: yr,
  isEmptyObject: Yg,
  isReadableStream: lv,
  isRequest: uv,
  isResponse: pv,
  isHeaders: dv,
  isUndefined: on,
  isDate: Qg,
  isFile: ev,
  isReactNativeBlob: tv,
  isReactNative: nv,
  isBlob: rv,
  isRegExp: Av,
  isFunction: Ie,
  isStream: sv,
  isURLSearchParams: cv,
  isTypedArray: yv,
  isFileList: iv,
  forEach: Mn,
  merge: ss,
  extend: mv,
  trim: fv,
  stripBOM: hv,
  inherits: gv,
  toFlatObject: vv,
  kindOf: Jr,
  kindOfTest: qe,
  endsWith: bv,
  toArray: xv,
  forEachEntry: wv,
  matchAll: Ev,
  isHTMLForm: _v,
  hasOwnProperty: Ga,
  hasOwnProp: Ga,
  // an alias to avoid ESLint no-prototype-builtins detection
  reduceDescriptors: Ol,
  freezeMethods: kv,
  toObjectSet: Tv,
  toCamelCase: Sv,
  noop: Pv,
  toFiniteNumber: Rv,
  findKey: jl,
  global: wt,
  isContextDefined: Il,
  isSpecCompliantForm: jv,
  toJSONObject: Iv,
  isAsyncFn: Ov,
  isThenable: $v,
  setImmediate: $l,
  asap: Nv,
  isIterable: Cv
};
let S = class Nl extends Error {
  static from(t, n, r, i, s, a) {
    const c = new Nl(t.message, n || t.code, r, i, s);
    return c.cause = t, c.name = t.name, t.status != null && c.status == null && (c.status = t.status), a && Object.assign(c, a), c;
  }
  /**
   * Create an Error with the specified message, config, error code, request and response.
   *
   * @param {string} message The error message.
   * @param {string} [code] The error code (for example, 'ECONNABORTED').
   * @param {Object} [config] The config.
   * @param {Object} [request] The request.
   * @param {Object} [response] The response.
   *
   * @returns {Error} The created error.
   */
  constructor(t, n, r, i, s) {
    super(t), Object.defineProperty(this, "message", {
      value: t,
      enumerable: !0,
      writable: !0,
      configurable: !0
    }), this.name = "AxiosError", this.isAxiosError = !0, n && (this.code = n), r && (this.config = r), i && (this.request = i), s && (this.response = s, this.status = s.status);
  }
  toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: h.toJSONObject(this.config),
      code: this.code,
      status: this.status
    };
  }
};
S.ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE";
S.ERR_BAD_OPTION = "ERR_BAD_OPTION";
S.ECONNABORTED = "ECONNABORTED";
S.ETIMEDOUT = "ETIMEDOUT";
S.ERR_NETWORK = "ERR_NETWORK";
S.ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS";
S.ERR_DEPRECATED = "ERR_DEPRECATED";
S.ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE";
S.ERR_BAD_REQUEST = "ERR_BAD_REQUEST";
S.ERR_CANCELED = "ERR_CANCELED";
S.ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT";
S.ERR_INVALID_URL = "ERR_INVALID_URL";
S.ERR_FORM_DATA_DEPTH_EXCEEDED = "ERR_FORM_DATA_DEPTH_EXCEEDED";
var Cl = xe.Stream, Lv = vt, Dv = He;
function He() {
  this.source = null, this.dataSize = 0, this.maxDataSize = 1024 * 1024, this.pauseStream = !0, this._maxDataSizeExceeded = !1, this._released = !1, this._bufferedEvents = [];
}
Lv.inherits(He, Cl);
He.create = function(e, t) {
  var n = new this();
  t = t || {};
  for (var r in t)
    n[r] = t[r];
  n.source = e;
  var i = e.emit;
  return e.emit = function() {
    return n._handleEmit(arguments), i.apply(e, arguments);
  }, e.on("error", function() {
  }), n.pauseStream && e.pause(), n;
};
Object.defineProperty(He.prototype, "readable", {
  configurable: !0,
  enumerable: !0,
  get: function() {
    return this.source.readable;
  }
});
He.prototype.setEncoding = function() {
  return this.source.setEncoding.apply(this.source, arguments);
};
He.prototype.resume = function() {
  this._released || this.release(), this.source.resume();
};
He.prototype.pause = function() {
  this.source.pause();
};
He.prototype.release = function() {
  this._released = !0, this._bufferedEvents.forEach((function(e) {
    this.emit.apply(this, e);
  }).bind(this)), this._bufferedEvents = [];
};
He.prototype.pipe = function() {
  var e = Cl.prototype.pipe.apply(this, arguments);
  return this.resume(), e;
};
He.prototype._handleEmit = function(e) {
  if (this._released) {
    this.emit.apply(this, e);
    return;
  }
  e[0] === "data" && (this.dataSize += e[1].length, this._checkIfMaxDataSizeExceeded()), this._bufferedEvents.push(e);
};
He.prototype._checkIfMaxDataSizeExceeded = function() {
  if (!this._maxDataSizeExceeded && !(this.dataSize <= this.maxDataSize)) {
    this._maxDataSizeExceeded = !0;
    var e = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
    this.emit("error", new Error(e));
  }
};
var zv = vt, Ll = xe.Stream, Ja = Dv, Fv = le;
function le() {
  this.writable = !1, this.readable = !0, this.dataSize = 0, this.maxDataSize = 2 * 1024 * 1024, this.pauseStreams = !0, this._released = !1, this._streams = [], this._currentStream = null, this._insideLoop = !1, this._pendingNext = !1;
}
zv.inherits(le, Ll);
le.create = function(e) {
  var t = new this();
  e = e || {};
  for (var n in e)
    t[n] = e[n];
  return t;
};
le.isStreamLike = function(e) {
  return typeof e != "function" && typeof e != "string" && typeof e != "boolean" && typeof e != "number" && !Buffer.isBuffer(e);
};
le.prototype.append = function(e) {
  var t = le.isStreamLike(e);
  if (t) {
    if (!(e instanceof Ja)) {
      var n = Ja.create(e, {
        maxDataSize: 1 / 0,
        pauseStream: this.pauseStreams
      });
      e.on("data", this._checkDataSize.bind(this)), e = n;
    }
    this._handleErrors(e), this.pauseStreams && e.pause();
  }
  return this._streams.push(e), this;
};
le.prototype.pipe = function(e, t) {
  return Ll.prototype.pipe.call(this, e, t), this.resume(), e;
};
le.prototype._getNext = function() {
  if (this._currentStream = null, this._insideLoop) {
    this._pendingNext = !0;
    return;
  }
  this._insideLoop = !0;
  try {
    do
      this._pendingNext = !1, this._realGetNext();
    while (this._pendingNext);
  } finally {
    this._insideLoop = !1;
  }
};
le.prototype._realGetNext = function() {
  var e = this._streams.shift();
  if (typeof e > "u") {
    this.end();
    return;
  }
  if (typeof e != "function") {
    this._pipeNext(e);
    return;
  }
  var t = e;
  t((function(n) {
    var r = le.isStreamLike(n);
    r && (n.on("data", this._checkDataSize.bind(this)), this._handleErrors(n)), this._pipeNext(n);
  }).bind(this));
};
le.prototype._pipeNext = function(e) {
  this._currentStream = e;
  var t = le.isStreamLike(e);
  if (t) {
    e.on("end", this._getNext.bind(this)), e.pipe(this, { end: !1 });
    return;
  }
  var n = e;
  this.write(n), this._getNext();
};
le.prototype._handleErrors = function(e) {
  var t = this;
  e.on("error", function(n) {
    t._emitError(n);
  });
};
le.prototype.write = function(e) {
  this.emit("data", e);
};
le.prototype.pause = function() {
  this.pauseStreams && (this.pauseStreams && this._currentStream && typeof this._currentStream.pause == "function" && this._currentStream.pause(), this.emit("pause"));
};
le.prototype.resume = function() {
  this._released || (this._released = !0, this.writable = !0, this._getNext()), this.pauseStreams && this._currentStream && typeof this._currentStream.resume == "function" && this._currentStream.resume(), this.emit("resume");
};
le.prototype.end = function() {
  this._reset(), this.emit("end");
};
le.prototype.destroy = function() {
  this._reset(), this.emit("close");
};
le.prototype._reset = function() {
  this.writable = !1, this._streams = [], this._currentStream = null;
};
le.prototype._checkDataSize = function() {
  if (this._updateDataSize(), !(this.dataSize <= this.maxDataSize)) {
    var e = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
    this._emitError(new Error(e));
  }
};
le.prototype._updateDataSize = function() {
  this.dataSize = 0;
  var e = this;
  this._streams.forEach(function(t) {
    t.dataSize && (e.dataSize += t.dataSize);
  }), this._currentStream && this._currentStream.dataSize && (this.dataSize += this._currentStream.dataSize);
};
le.prototype._emitError = function(e) {
  this._reset(), this.emit("error", e);
};
var Dl = {};
const Uv = {
  "application/1d-interleaved-parityfec": {
    source: "iana"
  },
  "application/3gpdash-qoe-report+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/3gpp-ims+xml": {
    source: "iana",
    compressible: !0
  },
  "application/3gpphal+json": {
    source: "iana",
    compressible: !0
  },
  "application/3gpphalforms+json": {
    source: "iana",
    compressible: !0
  },
  "application/a2l": {
    source: "iana"
  },
  "application/ace+cbor": {
    source: "iana"
  },
  "application/activemessage": {
    source: "iana"
  },
  "application/activity+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-costmap+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-costmapfilter+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-directory+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-endpointcost+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-endpointcostparams+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-endpointprop+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-endpointpropparams+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-error+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-networkmap+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-networkmapfilter+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-updatestreamcontrol+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-updatestreamparams+json": {
    source: "iana",
    compressible: !0
  },
  "application/aml": {
    source: "iana"
  },
  "application/andrew-inset": {
    source: "iana",
    extensions: [
      "ez"
    ]
  },
  "application/applefile": {
    source: "iana"
  },
  "application/applixware": {
    source: "apache",
    extensions: [
      "aw"
    ]
  },
  "application/at+jwt": {
    source: "iana"
  },
  "application/atf": {
    source: "iana"
  },
  "application/atfx": {
    source: "iana"
  },
  "application/atom+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "atom"
    ]
  },
  "application/atomcat+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "atomcat"
    ]
  },
  "application/atomdeleted+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "atomdeleted"
    ]
  },
  "application/atomicmail": {
    source: "iana"
  },
  "application/atomsvc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "atomsvc"
    ]
  },
  "application/atsc-dwd+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dwd"
    ]
  },
  "application/atsc-dynamic-event-message": {
    source: "iana"
  },
  "application/atsc-held+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "held"
    ]
  },
  "application/atsc-rdt+json": {
    source: "iana",
    compressible: !0
  },
  "application/atsc-rsat+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rsat"
    ]
  },
  "application/atxml": {
    source: "iana"
  },
  "application/auth-policy+xml": {
    source: "iana",
    compressible: !0
  },
  "application/bacnet-xdd+zip": {
    source: "iana",
    compressible: !1
  },
  "application/batch-smtp": {
    source: "iana"
  },
  "application/bdoc": {
    compressible: !1,
    extensions: [
      "bdoc"
    ]
  },
  "application/beep+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/calendar+json": {
    source: "iana",
    compressible: !0
  },
  "application/calendar+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xcs"
    ]
  },
  "application/call-completion": {
    source: "iana"
  },
  "application/cals-1840": {
    source: "iana"
  },
  "application/captive+json": {
    source: "iana",
    compressible: !0
  },
  "application/cbor": {
    source: "iana"
  },
  "application/cbor-seq": {
    source: "iana"
  },
  "application/cccex": {
    source: "iana"
  },
  "application/ccmp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/ccxml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ccxml"
    ]
  },
  "application/cdfx+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "cdfx"
    ]
  },
  "application/cdmi-capability": {
    source: "iana",
    extensions: [
      "cdmia"
    ]
  },
  "application/cdmi-container": {
    source: "iana",
    extensions: [
      "cdmic"
    ]
  },
  "application/cdmi-domain": {
    source: "iana",
    extensions: [
      "cdmid"
    ]
  },
  "application/cdmi-object": {
    source: "iana",
    extensions: [
      "cdmio"
    ]
  },
  "application/cdmi-queue": {
    source: "iana",
    extensions: [
      "cdmiq"
    ]
  },
  "application/cdni": {
    source: "iana"
  },
  "application/cea": {
    source: "iana"
  },
  "application/cea-2018+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cellml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cfw": {
    source: "iana"
  },
  "application/city+json": {
    source: "iana",
    compressible: !0
  },
  "application/clr": {
    source: "iana"
  },
  "application/clue+xml": {
    source: "iana",
    compressible: !0
  },
  "application/clue_info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cms": {
    source: "iana"
  },
  "application/cnrp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/coap-group+json": {
    source: "iana",
    compressible: !0
  },
  "application/coap-payload": {
    source: "iana"
  },
  "application/commonground": {
    source: "iana"
  },
  "application/conference-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cose": {
    source: "iana"
  },
  "application/cose-key": {
    source: "iana"
  },
  "application/cose-key-set": {
    source: "iana"
  },
  "application/cpl+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "cpl"
    ]
  },
  "application/csrattrs": {
    source: "iana"
  },
  "application/csta+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cstadata+xml": {
    source: "iana",
    compressible: !0
  },
  "application/csvm+json": {
    source: "iana",
    compressible: !0
  },
  "application/cu-seeme": {
    source: "apache",
    extensions: [
      "cu"
    ]
  },
  "application/cwt": {
    source: "iana"
  },
  "application/cybercash": {
    source: "iana"
  },
  "application/dart": {
    compressible: !0
  },
  "application/dash+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mpd"
    ]
  },
  "application/dash-patch+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mpp"
    ]
  },
  "application/dashdelta": {
    source: "iana"
  },
  "application/davmount+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "davmount"
    ]
  },
  "application/dca-rft": {
    source: "iana"
  },
  "application/dcd": {
    source: "iana"
  },
  "application/dec-dx": {
    source: "iana"
  },
  "application/dialog-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/dicom": {
    source: "iana"
  },
  "application/dicom+json": {
    source: "iana",
    compressible: !0
  },
  "application/dicom+xml": {
    source: "iana",
    compressible: !0
  },
  "application/dii": {
    source: "iana"
  },
  "application/dit": {
    source: "iana"
  },
  "application/dns": {
    source: "iana"
  },
  "application/dns+json": {
    source: "iana",
    compressible: !0
  },
  "application/dns-message": {
    source: "iana"
  },
  "application/docbook+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "dbk"
    ]
  },
  "application/dots+cbor": {
    source: "iana"
  },
  "application/dskpp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/dssc+der": {
    source: "iana",
    extensions: [
      "dssc"
    ]
  },
  "application/dssc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xdssc"
    ]
  },
  "application/dvcs": {
    source: "iana"
  },
  "application/ecmascript": {
    source: "iana",
    compressible: !0,
    extensions: [
      "es",
      "ecma"
    ]
  },
  "application/edi-consent": {
    source: "iana"
  },
  "application/edi-x12": {
    source: "iana",
    compressible: !1
  },
  "application/edifact": {
    source: "iana",
    compressible: !1
  },
  "application/efi": {
    source: "iana"
  },
  "application/elm+json": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/elm+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.cap+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/emergencycalldata.comment+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.control+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.deviceinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.ecall.msd": {
    source: "iana"
  },
  "application/emergencycalldata.providerinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.serviceinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.subscriberinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.veds+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emma+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "emma"
    ]
  },
  "application/emotionml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "emotionml"
    ]
  },
  "application/encaprtp": {
    source: "iana"
  },
  "application/epp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/epub+zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "epub"
    ]
  },
  "application/eshop": {
    source: "iana"
  },
  "application/exi": {
    source: "iana",
    extensions: [
      "exi"
    ]
  },
  "application/expect-ct-report+json": {
    source: "iana",
    compressible: !0
  },
  "application/express": {
    source: "iana",
    extensions: [
      "exp"
    ]
  },
  "application/fastinfoset": {
    source: "iana"
  },
  "application/fastsoap": {
    source: "iana"
  },
  "application/fdt+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "fdt"
    ]
  },
  "application/fhir+json": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/fhir+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/fido.trusted-apps+json": {
    compressible: !0
  },
  "application/fits": {
    source: "iana"
  },
  "application/flexfec": {
    source: "iana"
  },
  "application/font-sfnt": {
    source: "iana"
  },
  "application/font-tdpfr": {
    source: "iana",
    extensions: [
      "pfr"
    ]
  },
  "application/font-woff": {
    source: "iana",
    compressible: !1
  },
  "application/framework-attributes+xml": {
    source: "iana",
    compressible: !0
  },
  "application/geo+json": {
    source: "iana",
    compressible: !0,
    extensions: [
      "geojson"
    ]
  },
  "application/geo+json-seq": {
    source: "iana"
  },
  "application/geopackage+sqlite3": {
    source: "iana"
  },
  "application/geoxacml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/gltf-buffer": {
    source: "iana"
  },
  "application/gml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "gml"
    ]
  },
  "application/gpx+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "gpx"
    ]
  },
  "application/gxf": {
    source: "apache",
    extensions: [
      "gxf"
    ]
  },
  "application/gzip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "gz"
    ]
  },
  "application/h224": {
    source: "iana"
  },
  "application/held+xml": {
    source: "iana",
    compressible: !0
  },
  "application/hjson": {
    extensions: [
      "hjson"
    ]
  },
  "application/http": {
    source: "iana"
  },
  "application/hyperstudio": {
    source: "iana",
    extensions: [
      "stk"
    ]
  },
  "application/ibe-key-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/ibe-pkg-reply+xml": {
    source: "iana",
    compressible: !0
  },
  "application/ibe-pp-data": {
    source: "iana"
  },
  "application/iges": {
    source: "iana"
  },
  "application/im-iscomposing+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/index": {
    source: "iana"
  },
  "application/index.cmd": {
    source: "iana"
  },
  "application/index.obj": {
    source: "iana"
  },
  "application/index.response": {
    source: "iana"
  },
  "application/index.vnd": {
    source: "iana"
  },
  "application/inkml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ink",
      "inkml"
    ]
  },
  "application/iotp": {
    source: "iana"
  },
  "application/ipfix": {
    source: "iana",
    extensions: [
      "ipfix"
    ]
  },
  "application/ipp": {
    source: "iana"
  },
  "application/isup": {
    source: "iana"
  },
  "application/its+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "its"
    ]
  },
  "application/java-archive": {
    source: "apache",
    compressible: !1,
    extensions: [
      "jar",
      "war",
      "ear"
    ]
  },
  "application/java-serialized-object": {
    source: "apache",
    compressible: !1,
    extensions: [
      "ser"
    ]
  },
  "application/java-vm": {
    source: "apache",
    compressible: !1,
    extensions: [
      "class"
    ]
  },
  "application/javascript": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "js",
      "mjs"
    ]
  },
  "application/jf2feed+json": {
    source: "iana",
    compressible: !0
  },
  "application/jose": {
    source: "iana"
  },
  "application/jose+json": {
    source: "iana",
    compressible: !0
  },
  "application/jrd+json": {
    source: "iana",
    compressible: !0
  },
  "application/jscalendar+json": {
    source: "iana",
    compressible: !0
  },
  "application/json": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "json",
      "map"
    ]
  },
  "application/json-patch+json": {
    source: "iana",
    compressible: !0
  },
  "application/json-seq": {
    source: "iana"
  },
  "application/json5": {
    extensions: [
      "json5"
    ]
  },
  "application/jsonml+json": {
    source: "apache",
    compressible: !0,
    extensions: [
      "jsonml"
    ]
  },
  "application/jwk+json": {
    source: "iana",
    compressible: !0
  },
  "application/jwk-set+json": {
    source: "iana",
    compressible: !0
  },
  "application/jwt": {
    source: "iana"
  },
  "application/kpml-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/kpml-response+xml": {
    source: "iana",
    compressible: !0
  },
  "application/ld+json": {
    source: "iana",
    compressible: !0,
    extensions: [
      "jsonld"
    ]
  },
  "application/lgr+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "lgr"
    ]
  },
  "application/link-format": {
    source: "iana"
  },
  "application/load-control+xml": {
    source: "iana",
    compressible: !0
  },
  "application/lost+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "lostxml"
    ]
  },
  "application/lostsync+xml": {
    source: "iana",
    compressible: !0
  },
  "application/lpf+zip": {
    source: "iana",
    compressible: !1
  },
  "application/lxf": {
    source: "iana"
  },
  "application/mac-binhex40": {
    source: "iana",
    extensions: [
      "hqx"
    ]
  },
  "application/mac-compactpro": {
    source: "apache",
    extensions: [
      "cpt"
    ]
  },
  "application/macwriteii": {
    source: "iana"
  },
  "application/mads+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mads"
    ]
  },
  "application/manifest+json": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "webmanifest"
    ]
  },
  "application/marc": {
    source: "iana",
    extensions: [
      "mrc"
    ]
  },
  "application/marcxml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mrcx"
    ]
  },
  "application/mathematica": {
    source: "iana",
    extensions: [
      "ma",
      "nb",
      "mb"
    ]
  },
  "application/mathml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mathml"
    ]
  },
  "application/mathml-content+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mathml-presentation+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-associated-procedure-description+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-deregister+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-envelope+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-msk+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-msk-response+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-protection-description+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-reception-report+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-register+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-register-response+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-schedule+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-user-service-description+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbox": {
    source: "iana",
    extensions: [
      "mbox"
    ]
  },
  "application/media-policy-dataset+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mpf"
    ]
  },
  "application/media_control+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mediaservercontrol+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mscml"
    ]
  },
  "application/merge-patch+json": {
    source: "iana",
    compressible: !0
  },
  "application/metalink+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "metalink"
    ]
  },
  "application/metalink4+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "meta4"
    ]
  },
  "application/mets+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mets"
    ]
  },
  "application/mf4": {
    source: "iana"
  },
  "application/mikey": {
    source: "iana"
  },
  "application/mipc": {
    source: "iana"
  },
  "application/missing-blocks+cbor-seq": {
    source: "iana"
  },
  "application/mmt-aei+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "maei"
    ]
  },
  "application/mmt-usd+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "musd"
    ]
  },
  "application/mods+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mods"
    ]
  },
  "application/moss-keys": {
    source: "iana"
  },
  "application/moss-signature": {
    source: "iana"
  },
  "application/mosskey-data": {
    source: "iana"
  },
  "application/mosskey-request": {
    source: "iana"
  },
  "application/mp21": {
    source: "iana",
    extensions: [
      "m21",
      "mp21"
    ]
  },
  "application/mp4": {
    source: "iana",
    extensions: [
      "mp4s",
      "m4p"
    ]
  },
  "application/mpeg4-generic": {
    source: "iana"
  },
  "application/mpeg4-iod": {
    source: "iana"
  },
  "application/mpeg4-iod-xmt": {
    source: "iana"
  },
  "application/mrb-consumer+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mrb-publish+xml": {
    source: "iana",
    compressible: !0
  },
  "application/msc-ivr+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/msc-mixer+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/msword": {
    source: "iana",
    compressible: !1,
    extensions: [
      "doc",
      "dot"
    ]
  },
  "application/mud+json": {
    source: "iana",
    compressible: !0
  },
  "application/multipart-core": {
    source: "iana"
  },
  "application/mxf": {
    source: "iana",
    extensions: [
      "mxf"
    ]
  },
  "application/n-quads": {
    source: "iana",
    extensions: [
      "nq"
    ]
  },
  "application/n-triples": {
    source: "iana",
    extensions: [
      "nt"
    ]
  },
  "application/nasdata": {
    source: "iana"
  },
  "application/news-checkgroups": {
    source: "iana",
    charset: "US-ASCII"
  },
  "application/news-groupinfo": {
    source: "iana",
    charset: "US-ASCII"
  },
  "application/news-transmission": {
    source: "iana"
  },
  "application/nlsml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/node": {
    source: "iana",
    extensions: [
      "cjs"
    ]
  },
  "application/nss": {
    source: "iana"
  },
  "application/oauth-authz-req+jwt": {
    source: "iana"
  },
  "application/oblivious-dns-message": {
    source: "iana"
  },
  "application/ocsp-request": {
    source: "iana"
  },
  "application/ocsp-response": {
    source: "iana"
  },
  "application/octet-stream": {
    source: "iana",
    compressible: !1,
    extensions: [
      "bin",
      "dms",
      "lrf",
      "mar",
      "so",
      "dist",
      "distz",
      "pkg",
      "bpk",
      "dump",
      "elc",
      "deploy",
      "exe",
      "dll",
      "deb",
      "dmg",
      "iso",
      "img",
      "msi",
      "msp",
      "msm",
      "buffer"
    ]
  },
  "application/oda": {
    source: "iana",
    extensions: [
      "oda"
    ]
  },
  "application/odm+xml": {
    source: "iana",
    compressible: !0
  },
  "application/odx": {
    source: "iana"
  },
  "application/oebps-package+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "opf"
    ]
  },
  "application/ogg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "ogx"
    ]
  },
  "application/omdoc+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "omdoc"
    ]
  },
  "application/onenote": {
    source: "apache",
    extensions: [
      "onetoc",
      "onetoc2",
      "onetmp",
      "onepkg"
    ]
  },
  "application/opc-nodeset+xml": {
    source: "iana",
    compressible: !0
  },
  "application/oscore": {
    source: "iana"
  },
  "application/oxps": {
    source: "iana",
    extensions: [
      "oxps"
    ]
  },
  "application/p21": {
    source: "iana"
  },
  "application/p21+zip": {
    source: "iana",
    compressible: !1
  },
  "application/p2p-overlay+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "relo"
    ]
  },
  "application/parityfec": {
    source: "iana"
  },
  "application/passport": {
    source: "iana"
  },
  "application/patch-ops-error+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xer"
    ]
  },
  "application/pdf": {
    source: "iana",
    compressible: !1,
    extensions: [
      "pdf"
    ]
  },
  "application/pdx": {
    source: "iana"
  },
  "application/pem-certificate-chain": {
    source: "iana"
  },
  "application/pgp-encrypted": {
    source: "iana",
    compressible: !1,
    extensions: [
      "pgp"
    ]
  },
  "application/pgp-keys": {
    source: "iana",
    extensions: [
      "asc"
    ]
  },
  "application/pgp-signature": {
    source: "iana",
    extensions: [
      "asc",
      "sig"
    ]
  },
  "application/pics-rules": {
    source: "apache",
    extensions: [
      "prf"
    ]
  },
  "application/pidf+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/pidf-diff+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/pkcs10": {
    source: "iana",
    extensions: [
      "p10"
    ]
  },
  "application/pkcs12": {
    source: "iana"
  },
  "application/pkcs7-mime": {
    source: "iana",
    extensions: [
      "p7m",
      "p7c"
    ]
  },
  "application/pkcs7-signature": {
    source: "iana",
    extensions: [
      "p7s"
    ]
  },
  "application/pkcs8": {
    source: "iana",
    extensions: [
      "p8"
    ]
  },
  "application/pkcs8-encrypted": {
    source: "iana"
  },
  "application/pkix-attr-cert": {
    source: "iana",
    extensions: [
      "ac"
    ]
  },
  "application/pkix-cert": {
    source: "iana",
    extensions: [
      "cer"
    ]
  },
  "application/pkix-crl": {
    source: "iana",
    extensions: [
      "crl"
    ]
  },
  "application/pkix-pkipath": {
    source: "iana",
    extensions: [
      "pkipath"
    ]
  },
  "application/pkixcmp": {
    source: "iana",
    extensions: [
      "pki"
    ]
  },
  "application/pls+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "pls"
    ]
  },
  "application/poc-settings+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/postscript": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ai",
      "eps",
      "ps"
    ]
  },
  "application/ppsp-tracker+json": {
    source: "iana",
    compressible: !0
  },
  "application/problem+json": {
    source: "iana",
    compressible: !0
  },
  "application/problem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/provenance+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "provx"
    ]
  },
  "application/prs.alvestrand.titrax-sheet": {
    source: "iana"
  },
  "application/prs.cww": {
    source: "iana",
    extensions: [
      "cww"
    ]
  },
  "application/prs.cyn": {
    source: "iana",
    charset: "7-BIT"
  },
  "application/prs.hpub+zip": {
    source: "iana",
    compressible: !1
  },
  "application/prs.nprend": {
    source: "iana"
  },
  "application/prs.plucker": {
    source: "iana"
  },
  "application/prs.rdf-xml-crypt": {
    source: "iana"
  },
  "application/prs.xsf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/pskc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "pskcxml"
    ]
  },
  "application/pvd+json": {
    source: "iana",
    compressible: !0
  },
  "application/qsig": {
    source: "iana"
  },
  "application/raml+yaml": {
    compressible: !0,
    extensions: [
      "raml"
    ]
  },
  "application/raptorfec": {
    source: "iana"
  },
  "application/rdap+json": {
    source: "iana",
    compressible: !0
  },
  "application/rdf+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rdf",
      "owl"
    ]
  },
  "application/reginfo+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rif"
    ]
  },
  "application/relax-ng-compact-syntax": {
    source: "iana",
    extensions: [
      "rnc"
    ]
  },
  "application/remote-printing": {
    source: "iana"
  },
  "application/reputon+json": {
    source: "iana",
    compressible: !0
  },
  "application/resource-lists+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rl"
    ]
  },
  "application/resource-lists-diff+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rld"
    ]
  },
  "application/rfc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/riscos": {
    source: "iana"
  },
  "application/rlmi+xml": {
    source: "iana",
    compressible: !0
  },
  "application/rls-services+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rs"
    ]
  },
  "application/route-apd+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rapd"
    ]
  },
  "application/route-s-tsid+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sls"
    ]
  },
  "application/route-usd+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rusd"
    ]
  },
  "application/rpki-ghostbusters": {
    source: "iana",
    extensions: [
      "gbr"
    ]
  },
  "application/rpki-manifest": {
    source: "iana",
    extensions: [
      "mft"
    ]
  },
  "application/rpki-publication": {
    source: "iana"
  },
  "application/rpki-roa": {
    source: "iana",
    extensions: [
      "roa"
    ]
  },
  "application/rpki-updown": {
    source: "iana"
  },
  "application/rsd+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "rsd"
    ]
  },
  "application/rss+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "rss"
    ]
  },
  "application/rtf": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rtf"
    ]
  },
  "application/rtploopback": {
    source: "iana"
  },
  "application/rtx": {
    source: "iana"
  },
  "application/samlassertion+xml": {
    source: "iana",
    compressible: !0
  },
  "application/samlmetadata+xml": {
    source: "iana",
    compressible: !0
  },
  "application/sarif+json": {
    source: "iana",
    compressible: !0
  },
  "application/sarif-external-properties+json": {
    source: "iana",
    compressible: !0
  },
  "application/sbe": {
    source: "iana"
  },
  "application/sbml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sbml"
    ]
  },
  "application/scaip+xml": {
    source: "iana",
    compressible: !0
  },
  "application/scim+json": {
    source: "iana",
    compressible: !0
  },
  "application/scvp-cv-request": {
    source: "iana",
    extensions: [
      "scq"
    ]
  },
  "application/scvp-cv-response": {
    source: "iana",
    extensions: [
      "scs"
    ]
  },
  "application/scvp-vp-request": {
    source: "iana",
    extensions: [
      "spq"
    ]
  },
  "application/scvp-vp-response": {
    source: "iana",
    extensions: [
      "spp"
    ]
  },
  "application/sdp": {
    source: "iana",
    extensions: [
      "sdp"
    ]
  },
  "application/secevent+jwt": {
    source: "iana"
  },
  "application/senml+cbor": {
    source: "iana"
  },
  "application/senml+json": {
    source: "iana",
    compressible: !0
  },
  "application/senml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "senmlx"
    ]
  },
  "application/senml-etch+cbor": {
    source: "iana"
  },
  "application/senml-etch+json": {
    source: "iana",
    compressible: !0
  },
  "application/senml-exi": {
    source: "iana"
  },
  "application/sensml+cbor": {
    source: "iana"
  },
  "application/sensml+json": {
    source: "iana",
    compressible: !0
  },
  "application/sensml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sensmlx"
    ]
  },
  "application/sensml-exi": {
    source: "iana"
  },
  "application/sep+xml": {
    source: "iana",
    compressible: !0
  },
  "application/sep-exi": {
    source: "iana"
  },
  "application/session-info": {
    source: "iana"
  },
  "application/set-payment": {
    source: "iana"
  },
  "application/set-payment-initiation": {
    source: "iana",
    extensions: [
      "setpay"
    ]
  },
  "application/set-registration": {
    source: "iana"
  },
  "application/set-registration-initiation": {
    source: "iana",
    extensions: [
      "setreg"
    ]
  },
  "application/sgml": {
    source: "iana"
  },
  "application/sgml-open-catalog": {
    source: "iana"
  },
  "application/shf+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "shf"
    ]
  },
  "application/sieve": {
    source: "iana",
    extensions: [
      "siv",
      "sieve"
    ]
  },
  "application/simple-filter+xml": {
    source: "iana",
    compressible: !0
  },
  "application/simple-message-summary": {
    source: "iana"
  },
  "application/simplesymbolcontainer": {
    source: "iana"
  },
  "application/sipc": {
    source: "iana"
  },
  "application/slate": {
    source: "iana"
  },
  "application/smil": {
    source: "iana"
  },
  "application/smil+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "smi",
      "smil"
    ]
  },
  "application/smpte336m": {
    source: "iana"
  },
  "application/soap+fastinfoset": {
    source: "iana"
  },
  "application/soap+xml": {
    source: "iana",
    compressible: !0
  },
  "application/sparql-query": {
    source: "iana",
    extensions: [
      "rq"
    ]
  },
  "application/sparql-results+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "srx"
    ]
  },
  "application/spdx+json": {
    source: "iana",
    compressible: !0
  },
  "application/spirits-event+xml": {
    source: "iana",
    compressible: !0
  },
  "application/sql": {
    source: "iana"
  },
  "application/srgs": {
    source: "iana",
    extensions: [
      "gram"
    ]
  },
  "application/srgs+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "grxml"
    ]
  },
  "application/sru+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sru"
    ]
  },
  "application/ssdl+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "ssdl"
    ]
  },
  "application/ssml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ssml"
    ]
  },
  "application/stix+json": {
    source: "iana",
    compressible: !0
  },
  "application/swid+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "swidtag"
    ]
  },
  "application/tamp-apex-update": {
    source: "iana"
  },
  "application/tamp-apex-update-confirm": {
    source: "iana"
  },
  "application/tamp-community-update": {
    source: "iana"
  },
  "application/tamp-community-update-confirm": {
    source: "iana"
  },
  "application/tamp-error": {
    source: "iana"
  },
  "application/tamp-sequence-adjust": {
    source: "iana"
  },
  "application/tamp-sequence-adjust-confirm": {
    source: "iana"
  },
  "application/tamp-status-query": {
    source: "iana"
  },
  "application/tamp-status-response": {
    source: "iana"
  },
  "application/tamp-update": {
    source: "iana"
  },
  "application/tamp-update-confirm": {
    source: "iana"
  },
  "application/tar": {
    compressible: !0
  },
  "application/taxii+json": {
    source: "iana",
    compressible: !0
  },
  "application/td+json": {
    source: "iana",
    compressible: !0
  },
  "application/tei+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "tei",
      "teicorpus"
    ]
  },
  "application/tetra_isi": {
    source: "iana"
  },
  "application/thraud+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "tfi"
    ]
  },
  "application/timestamp-query": {
    source: "iana"
  },
  "application/timestamp-reply": {
    source: "iana"
  },
  "application/timestamped-data": {
    source: "iana",
    extensions: [
      "tsd"
    ]
  },
  "application/tlsrpt+gzip": {
    source: "iana"
  },
  "application/tlsrpt+json": {
    source: "iana",
    compressible: !0
  },
  "application/tnauthlist": {
    source: "iana"
  },
  "application/token-introspection+jwt": {
    source: "iana"
  },
  "application/toml": {
    compressible: !0,
    extensions: [
      "toml"
    ]
  },
  "application/trickle-ice-sdpfrag": {
    source: "iana"
  },
  "application/trig": {
    source: "iana",
    extensions: [
      "trig"
    ]
  },
  "application/ttml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ttml"
    ]
  },
  "application/tve-trigger": {
    source: "iana"
  },
  "application/tzif": {
    source: "iana"
  },
  "application/tzif-leap": {
    source: "iana"
  },
  "application/ubjson": {
    compressible: !1,
    extensions: [
      "ubj"
    ]
  },
  "application/ulpfec": {
    source: "iana"
  },
  "application/urc-grpsheet+xml": {
    source: "iana",
    compressible: !0
  },
  "application/urc-ressheet+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rsheet"
    ]
  },
  "application/urc-targetdesc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "td"
    ]
  },
  "application/urc-uisocketdesc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vcard+json": {
    source: "iana",
    compressible: !0
  },
  "application/vcard+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vemmi": {
    source: "iana"
  },
  "application/vividence.scriptfile": {
    source: "apache"
  },
  "application/vnd.1000minds.decision-model+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "1km"
    ]
  },
  "application/vnd.3gpp-prose+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp-prose-pc3ch+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp-v2x-local-service-information": {
    source: "iana"
  },
  "application/vnd.3gpp.5gnas": {
    source: "iana"
  },
  "application/vnd.3gpp.access-transfer-events+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.bsf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.gmop+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.gtpc": {
    source: "iana"
  },
  "application/vnd.3gpp.interworking-data": {
    source: "iana"
  },
  "application/vnd.3gpp.lpp": {
    source: "iana"
  },
  "application/vnd.3gpp.mc-signalling-ear": {
    source: "iana"
  },
  "application/vnd.3gpp.mcdata-affiliation-command+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcdata-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcdata-payload": {
    source: "iana"
  },
  "application/vnd.3gpp.mcdata-service-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcdata-signalling": {
    source: "iana"
  },
  "application/vnd.3gpp.mcdata-ue-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcdata-user-profile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-affiliation-command+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-floor-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-location-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-mbms-usage-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-service-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-signed+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-ue-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-ue-init-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-user-profile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-affiliation-command+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-affiliation-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-location-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-mbms-usage-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-service-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-transmission-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-ue-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-user-profile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mid-call+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.ngap": {
    source: "iana"
  },
  "application/vnd.3gpp.pfcp": {
    source: "iana"
  },
  "application/vnd.3gpp.pic-bw-large": {
    source: "iana",
    extensions: [
      "plb"
    ]
  },
  "application/vnd.3gpp.pic-bw-small": {
    source: "iana",
    extensions: [
      "psb"
    ]
  },
  "application/vnd.3gpp.pic-bw-var": {
    source: "iana",
    extensions: [
      "pvb"
    ]
  },
  "application/vnd.3gpp.s1ap": {
    source: "iana"
  },
  "application/vnd.3gpp.sms": {
    source: "iana"
  },
  "application/vnd.3gpp.sms+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.srvcc-ext+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.srvcc-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.state-and-event-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.ussd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp2.bcmcsinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp2.sms": {
    source: "iana"
  },
  "application/vnd.3gpp2.tcap": {
    source: "iana",
    extensions: [
      "tcap"
    ]
  },
  "application/vnd.3lightssoftware.imagescal": {
    source: "iana"
  },
  "application/vnd.3m.post-it-notes": {
    source: "iana",
    extensions: [
      "pwn"
    ]
  },
  "application/vnd.accpac.simply.aso": {
    source: "iana",
    extensions: [
      "aso"
    ]
  },
  "application/vnd.accpac.simply.imp": {
    source: "iana",
    extensions: [
      "imp"
    ]
  },
  "application/vnd.acucobol": {
    source: "iana",
    extensions: [
      "acu"
    ]
  },
  "application/vnd.acucorp": {
    source: "iana",
    extensions: [
      "atc",
      "acutc"
    ]
  },
  "application/vnd.adobe.air-application-installer-package+zip": {
    source: "apache",
    compressible: !1,
    extensions: [
      "air"
    ]
  },
  "application/vnd.adobe.flash.movie": {
    source: "iana"
  },
  "application/vnd.adobe.formscentral.fcdt": {
    source: "iana",
    extensions: [
      "fcdt"
    ]
  },
  "application/vnd.adobe.fxp": {
    source: "iana",
    extensions: [
      "fxp",
      "fxpl"
    ]
  },
  "application/vnd.adobe.partial-upload": {
    source: "iana"
  },
  "application/vnd.adobe.xdp+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xdp"
    ]
  },
  "application/vnd.adobe.xfdf": {
    source: "iana",
    extensions: [
      "xfdf"
    ]
  },
  "application/vnd.aether.imp": {
    source: "iana"
  },
  "application/vnd.afpc.afplinedata": {
    source: "iana"
  },
  "application/vnd.afpc.afplinedata-pagedef": {
    source: "iana"
  },
  "application/vnd.afpc.cmoca-cmresource": {
    source: "iana"
  },
  "application/vnd.afpc.foca-charset": {
    source: "iana"
  },
  "application/vnd.afpc.foca-codedfont": {
    source: "iana"
  },
  "application/vnd.afpc.foca-codepage": {
    source: "iana"
  },
  "application/vnd.afpc.modca": {
    source: "iana"
  },
  "application/vnd.afpc.modca-cmtable": {
    source: "iana"
  },
  "application/vnd.afpc.modca-formdef": {
    source: "iana"
  },
  "application/vnd.afpc.modca-mediummap": {
    source: "iana"
  },
  "application/vnd.afpc.modca-objectcontainer": {
    source: "iana"
  },
  "application/vnd.afpc.modca-overlay": {
    source: "iana"
  },
  "application/vnd.afpc.modca-pagesegment": {
    source: "iana"
  },
  "application/vnd.age": {
    source: "iana",
    extensions: [
      "age"
    ]
  },
  "application/vnd.ah-barcode": {
    source: "iana"
  },
  "application/vnd.ahead.space": {
    source: "iana",
    extensions: [
      "ahead"
    ]
  },
  "application/vnd.airzip.filesecure.azf": {
    source: "iana",
    extensions: [
      "azf"
    ]
  },
  "application/vnd.airzip.filesecure.azs": {
    source: "iana",
    extensions: [
      "azs"
    ]
  },
  "application/vnd.amadeus+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.amazon.ebook": {
    source: "apache",
    extensions: [
      "azw"
    ]
  },
  "application/vnd.amazon.mobi8-ebook": {
    source: "iana"
  },
  "application/vnd.americandynamics.acc": {
    source: "iana",
    extensions: [
      "acc"
    ]
  },
  "application/vnd.amiga.ami": {
    source: "iana",
    extensions: [
      "ami"
    ]
  },
  "application/vnd.amundsen.maze+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.android.ota": {
    source: "iana"
  },
  "application/vnd.android.package-archive": {
    source: "apache",
    compressible: !1,
    extensions: [
      "apk"
    ]
  },
  "application/vnd.anki": {
    source: "iana"
  },
  "application/vnd.anser-web-certificate-issue-initiation": {
    source: "iana",
    extensions: [
      "cii"
    ]
  },
  "application/vnd.anser-web-funds-transfer-initiation": {
    source: "apache",
    extensions: [
      "fti"
    ]
  },
  "application/vnd.antix.game-component": {
    source: "iana",
    extensions: [
      "atx"
    ]
  },
  "application/vnd.apache.arrow.file": {
    source: "iana"
  },
  "application/vnd.apache.arrow.stream": {
    source: "iana"
  },
  "application/vnd.apache.thrift.binary": {
    source: "iana"
  },
  "application/vnd.apache.thrift.compact": {
    source: "iana"
  },
  "application/vnd.apache.thrift.json": {
    source: "iana"
  },
  "application/vnd.api+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.aplextor.warrp+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.apothekende.reservation+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.apple.installer+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mpkg"
    ]
  },
  "application/vnd.apple.keynote": {
    source: "iana",
    extensions: [
      "key"
    ]
  },
  "application/vnd.apple.mpegurl": {
    source: "iana",
    extensions: [
      "m3u8"
    ]
  },
  "application/vnd.apple.numbers": {
    source: "iana",
    extensions: [
      "numbers"
    ]
  },
  "application/vnd.apple.pages": {
    source: "iana",
    extensions: [
      "pages"
    ]
  },
  "application/vnd.apple.pkpass": {
    compressible: !1,
    extensions: [
      "pkpass"
    ]
  },
  "application/vnd.arastra.swi": {
    source: "iana"
  },
  "application/vnd.aristanetworks.swi": {
    source: "iana",
    extensions: [
      "swi"
    ]
  },
  "application/vnd.artisan+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.artsquare": {
    source: "iana"
  },
  "application/vnd.astraea-software.iota": {
    source: "iana",
    extensions: [
      "iota"
    ]
  },
  "application/vnd.audiograph": {
    source: "iana",
    extensions: [
      "aep"
    ]
  },
  "application/vnd.autopackage": {
    source: "iana"
  },
  "application/vnd.avalon+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.avistar+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.balsamiq.bmml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "bmml"
    ]
  },
  "application/vnd.balsamiq.bmpr": {
    source: "iana"
  },
  "application/vnd.banana-accounting": {
    source: "iana"
  },
  "application/vnd.bbf.usp.error": {
    source: "iana"
  },
  "application/vnd.bbf.usp.msg": {
    source: "iana"
  },
  "application/vnd.bbf.usp.msg+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.bekitzur-stech+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.bint.med-content": {
    source: "iana"
  },
  "application/vnd.biopax.rdf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.blink-idb-value-wrapper": {
    source: "iana"
  },
  "application/vnd.blueice.multipass": {
    source: "iana",
    extensions: [
      "mpm"
    ]
  },
  "application/vnd.bluetooth.ep.oob": {
    source: "iana"
  },
  "application/vnd.bluetooth.le.oob": {
    source: "iana"
  },
  "application/vnd.bmi": {
    source: "iana",
    extensions: [
      "bmi"
    ]
  },
  "application/vnd.bpf": {
    source: "iana"
  },
  "application/vnd.bpf3": {
    source: "iana"
  },
  "application/vnd.businessobjects": {
    source: "iana",
    extensions: [
      "rep"
    ]
  },
  "application/vnd.byu.uapi+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cab-jscript": {
    source: "iana"
  },
  "application/vnd.canon-cpdl": {
    source: "iana"
  },
  "application/vnd.canon-lips": {
    source: "iana"
  },
  "application/vnd.capasystems-pg+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cendio.thinlinc.clientconf": {
    source: "iana"
  },
  "application/vnd.century-systems.tcp_stream": {
    source: "iana"
  },
  "application/vnd.chemdraw+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "cdxml"
    ]
  },
  "application/vnd.chess-pgn": {
    source: "iana"
  },
  "application/vnd.chipnuts.karaoke-mmd": {
    source: "iana",
    extensions: [
      "mmd"
    ]
  },
  "application/vnd.ciedi": {
    source: "iana"
  },
  "application/vnd.cinderella": {
    source: "iana",
    extensions: [
      "cdy"
    ]
  },
  "application/vnd.cirpack.isdn-ext": {
    source: "iana"
  },
  "application/vnd.citationstyles.style+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "csl"
    ]
  },
  "application/vnd.claymore": {
    source: "iana",
    extensions: [
      "cla"
    ]
  },
  "application/vnd.cloanto.rp9": {
    source: "iana",
    extensions: [
      "rp9"
    ]
  },
  "application/vnd.clonk.c4group": {
    source: "iana",
    extensions: [
      "c4g",
      "c4d",
      "c4f",
      "c4p",
      "c4u"
    ]
  },
  "application/vnd.cluetrust.cartomobile-config": {
    source: "iana",
    extensions: [
      "c11amc"
    ]
  },
  "application/vnd.cluetrust.cartomobile-config-pkg": {
    source: "iana",
    extensions: [
      "c11amz"
    ]
  },
  "application/vnd.coffeescript": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.document": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.document-template": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.presentation": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.presentation-template": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.spreadsheet": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.spreadsheet-template": {
    source: "iana"
  },
  "application/vnd.collection+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.collection.doc+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.collection.next+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.comicbook+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.comicbook-rar": {
    source: "iana"
  },
  "application/vnd.commerce-battelle": {
    source: "iana"
  },
  "application/vnd.commonspace": {
    source: "iana",
    extensions: [
      "csp"
    ]
  },
  "application/vnd.contact.cmsg": {
    source: "iana",
    extensions: [
      "cdbcmsg"
    ]
  },
  "application/vnd.coreos.ignition+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cosmocaller": {
    source: "iana",
    extensions: [
      "cmc"
    ]
  },
  "application/vnd.crick.clicker": {
    source: "iana",
    extensions: [
      "clkx"
    ]
  },
  "application/vnd.crick.clicker.keyboard": {
    source: "iana",
    extensions: [
      "clkk"
    ]
  },
  "application/vnd.crick.clicker.palette": {
    source: "iana",
    extensions: [
      "clkp"
    ]
  },
  "application/vnd.crick.clicker.template": {
    source: "iana",
    extensions: [
      "clkt"
    ]
  },
  "application/vnd.crick.clicker.wordbank": {
    source: "iana",
    extensions: [
      "clkw"
    ]
  },
  "application/vnd.criticaltools.wbs+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wbs"
    ]
  },
  "application/vnd.cryptii.pipe+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.crypto-shade-file": {
    source: "iana"
  },
  "application/vnd.cryptomator.encrypted": {
    source: "iana"
  },
  "application/vnd.cryptomator.vault": {
    source: "iana"
  },
  "application/vnd.ctc-posml": {
    source: "iana",
    extensions: [
      "pml"
    ]
  },
  "application/vnd.ctct.ws+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cups-pdf": {
    source: "iana"
  },
  "application/vnd.cups-postscript": {
    source: "iana"
  },
  "application/vnd.cups-ppd": {
    source: "iana",
    extensions: [
      "ppd"
    ]
  },
  "application/vnd.cups-raster": {
    source: "iana"
  },
  "application/vnd.cups-raw": {
    source: "iana"
  },
  "application/vnd.curl": {
    source: "iana"
  },
  "application/vnd.curl.car": {
    source: "apache",
    extensions: [
      "car"
    ]
  },
  "application/vnd.curl.pcurl": {
    source: "apache",
    extensions: [
      "pcurl"
    ]
  },
  "application/vnd.cyan.dean.root+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cybank": {
    source: "iana"
  },
  "application/vnd.cyclonedx+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cyclonedx+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.d2l.coursepackage1p0+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.d3m-dataset": {
    source: "iana"
  },
  "application/vnd.d3m-problem": {
    source: "iana"
  },
  "application/vnd.dart": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dart"
    ]
  },
  "application/vnd.data-vision.rdz": {
    source: "iana",
    extensions: [
      "rdz"
    ]
  },
  "application/vnd.datapackage+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dataresource+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dbf": {
    source: "iana",
    extensions: [
      "dbf"
    ]
  },
  "application/vnd.debian.binary-package": {
    source: "iana"
  },
  "application/vnd.dece.data": {
    source: "iana",
    extensions: [
      "uvf",
      "uvvf",
      "uvd",
      "uvvd"
    ]
  },
  "application/vnd.dece.ttml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "uvt",
      "uvvt"
    ]
  },
  "application/vnd.dece.unspecified": {
    source: "iana",
    extensions: [
      "uvx",
      "uvvx"
    ]
  },
  "application/vnd.dece.zip": {
    source: "iana",
    extensions: [
      "uvz",
      "uvvz"
    ]
  },
  "application/vnd.denovo.fcselayout-link": {
    source: "iana",
    extensions: [
      "fe_launch"
    ]
  },
  "application/vnd.desmume.movie": {
    source: "iana"
  },
  "application/vnd.dir-bi.plate-dl-nosuffix": {
    source: "iana"
  },
  "application/vnd.dm.delegation+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dna": {
    source: "iana",
    extensions: [
      "dna"
    ]
  },
  "application/vnd.document+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dolby.mlp": {
    source: "apache",
    extensions: [
      "mlp"
    ]
  },
  "application/vnd.dolby.mobile.1": {
    source: "iana"
  },
  "application/vnd.dolby.mobile.2": {
    source: "iana"
  },
  "application/vnd.doremir.scorecloud-binary-document": {
    source: "iana"
  },
  "application/vnd.dpgraph": {
    source: "iana",
    extensions: [
      "dpg"
    ]
  },
  "application/vnd.dreamfactory": {
    source: "iana",
    extensions: [
      "dfac"
    ]
  },
  "application/vnd.drive+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ds-keypoint": {
    source: "apache",
    extensions: [
      "kpxx"
    ]
  },
  "application/vnd.dtg.local": {
    source: "iana"
  },
  "application/vnd.dtg.local.flash": {
    source: "iana"
  },
  "application/vnd.dtg.local.html": {
    source: "iana"
  },
  "application/vnd.dvb.ait": {
    source: "iana",
    extensions: [
      "ait"
    ]
  },
  "application/vnd.dvb.dvbisl+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.dvbj": {
    source: "iana"
  },
  "application/vnd.dvb.esgcontainer": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcdftnotifaccess": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcesgaccess": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcesgaccess2": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcesgpdd": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcroaming": {
    source: "iana"
  },
  "application/vnd.dvb.iptv.alfec-base": {
    source: "iana"
  },
  "application/vnd.dvb.iptv.alfec-enhancement": {
    source: "iana"
  },
  "application/vnd.dvb.notif-aggregate-root+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-container+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-generic+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-ia-msglist+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-ia-registration-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-ia-registration-response+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-init+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.pfr": {
    source: "iana"
  },
  "application/vnd.dvb.service": {
    source: "iana",
    extensions: [
      "svc"
    ]
  },
  "application/vnd.dxr": {
    source: "iana"
  },
  "application/vnd.dynageo": {
    source: "iana",
    extensions: [
      "geo"
    ]
  },
  "application/vnd.dzr": {
    source: "iana"
  },
  "application/vnd.easykaraoke.cdgdownload": {
    source: "iana"
  },
  "application/vnd.ecdis-update": {
    source: "iana"
  },
  "application/vnd.ecip.rlp": {
    source: "iana"
  },
  "application/vnd.eclipse.ditto+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ecowin.chart": {
    source: "iana",
    extensions: [
      "mag"
    ]
  },
  "application/vnd.ecowin.filerequest": {
    source: "iana"
  },
  "application/vnd.ecowin.fileupdate": {
    source: "iana"
  },
  "application/vnd.ecowin.series": {
    source: "iana"
  },
  "application/vnd.ecowin.seriesrequest": {
    source: "iana"
  },
  "application/vnd.ecowin.seriesupdate": {
    source: "iana"
  },
  "application/vnd.efi.img": {
    source: "iana"
  },
  "application/vnd.efi.iso": {
    source: "iana"
  },
  "application/vnd.emclient.accessrequest+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.enliven": {
    source: "iana",
    extensions: [
      "nml"
    ]
  },
  "application/vnd.enphase.envoy": {
    source: "iana"
  },
  "application/vnd.eprints.data+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.epson.esf": {
    source: "iana",
    extensions: [
      "esf"
    ]
  },
  "application/vnd.epson.msf": {
    source: "iana",
    extensions: [
      "msf"
    ]
  },
  "application/vnd.epson.quickanime": {
    source: "iana",
    extensions: [
      "qam"
    ]
  },
  "application/vnd.epson.salt": {
    source: "iana",
    extensions: [
      "slt"
    ]
  },
  "application/vnd.epson.ssf": {
    source: "iana",
    extensions: [
      "ssf"
    ]
  },
  "application/vnd.ericsson.quickcall": {
    source: "iana"
  },
  "application/vnd.espass-espass+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.eszigno3+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "es3",
      "et3"
    ]
  },
  "application/vnd.etsi.aoc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.asic-e+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.etsi.asic-s+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.etsi.cug+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvcommand+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvdiscovery+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvprofile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvsad-bc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvsad-cod+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvsad-npvr+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvservice+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvsync+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvueprofile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.mcid+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.mheg5": {
    source: "iana"
  },
  "application/vnd.etsi.overload-control-policy-dataset+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.pstn+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.sci+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.simservs+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.timestamp-token": {
    source: "iana"
  },
  "application/vnd.etsi.tsl+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.tsl.der": {
    source: "iana"
  },
  "application/vnd.eu.kasparian.car+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.eudora.data": {
    source: "iana"
  },
  "application/vnd.evolv.ecig.profile": {
    source: "iana"
  },
  "application/vnd.evolv.ecig.settings": {
    source: "iana"
  },
  "application/vnd.evolv.ecig.theme": {
    source: "iana"
  },
  "application/vnd.exstream-empower+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.exstream-package": {
    source: "iana"
  },
  "application/vnd.ezpix-album": {
    source: "iana",
    extensions: [
      "ez2"
    ]
  },
  "application/vnd.ezpix-package": {
    source: "iana",
    extensions: [
      "ez3"
    ]
  },
  "application/vnd.f-secure.mobile": {
    source: "iana"
  },
  "application/vnd.familysearch.gedcom+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.fastcopy-disk-image": {
    source: "iana"
  },
  "application/vnd.fdf": {
    source: "iana",
    extensions: [
      "fdf"
    ]
  },
  "application/vnd.fdsn.mseed": {
    source: "iana",
    extensions: [
      "mseed"
    ]
  },
  "application/vnd.fdsn.seed": {
    source: "iana",
    extensions: [
      "seed",
      "dataless"
    ]
  },
  "application/vnd.ffsns": {
    source: "iana"
  },
  "application/vnd.ficlab.flb+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.filmit.zfc": {
    source: "iana"
  },
  "application/vnd.fints": {
    source: "iana"
  },
  "application/vnd.firemonkeys.cloudcell": {
    source: "iana"
  },
  "application/vnd.flographit": {
    source: "iana",
    extensions: [
      "gph"
    ]
  },
  "application/vnd.fluxtime.clip": {
    source: "iana",
    extensions: [
      "ftc"
    ]
  },
  "application/vnd.font-fontforge-sfd": {
    source: "iana"
  },
  "application/vnd.framemaker": {
    source: "iana",
    extensions: [
      "fm",
      "frame",
      "maker",
      "book"
    ]
  },
  "application/vnd.frogans.fnc": {
    source: "iana",
    extensions: [
      "fnc"
    ]
  },
  "application/vnd.frogans.ltf": {
    source: "iana",
    extensions: [
      "ltf"
    ]
  },
  "application/vnd.fsc.weblaunch": {
    source: "iana",
    extensions: [
      "fsc"
    ]
  },
  "application/vnd.fujifilm.fb.docuworks": {
    source: "iana"
  },
  "application/vnd.fujifilm.fb.docuworks.binder": {
    source: "iana"
  },
  "application/vnd.fujifilm.fb.docuworks.container": {
    source: "iana"
  },
  "application/vnd.fujifilm.fb.jfi+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.fujitsu.oasys": {
    source: "iana",
    extensions: [
      "oas"
    ]
  },
  "application/vnd.fujitsu.oasys2": {
    source: "iana",
    extensions: [
      "oa2"
    ]
  },
  "application/vnd.fujitsu.oasys3": {
    source: "iana",
    extensions: [
      "oa3"
    ]
  },
  "application/vnd.fujitsu.oasysgp": {
    source: "iana",
    extensions: [
      "fg5"
    ]
  },
  "application/vnd.fujitsu.oasysprs": {
    source: "iana",
    extensions: [
      "bh2"
    ]
  },
  "application/vnd.fujixerox.art-ex": {
    source: "iana"
  },
  "application/vnd.fujixerox.art4": {
    source: "iana"
  },
  "application/vnd.fujixerox.ddd": {
    source: "iana",
    extensions: [
      "ddd"
    ]
  },
  "application/vnd.fujixerox.docuworks": {
    source: "iana",
    extensions: [
      "xdw"
    ]
  },
  "application/vnd.fujixerox.docuworks.binder": {
    source: "iana",
    extensions: [
      "xbd"
    ]
  },
  "application/vnd.fujixerox.docuworks.container": {
    source: "iana"
  },
  "application/vnd.fujixerox.hbpl": {
    source: "iana"
  },
  "application/vnd.fut-misnet": {
    source: "iana"
  },
  "application/vnd.futoin+cbor": {
    source: "iana"
  },
  "application/vnd.futoin+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.fuzzysheet": {
    source: "iana",
    extensions: [
      "fzs"
    ]
  },
  "application/vnd.genomatix.tuxedo": {
    source: "iana",
    extensions: [
      "txd"
    ]
  },
  "application/vnd.gentics.grd+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.geo+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.geocube+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.geogebra.file": {
    source: "iana",
    extensions: [
      "ggb"
    ]
  },
  "application/vnd.geogebra.slides": {
    source: "iana"
  },
  "application/vnd.geogebra.tool": {
    source: "iana",
    extensions: [
      "ggt"
    ]
  },
  "application/vnd.geometry-explorer": {
    source: "iana",
    extensions: [
      "gex",
      "gre"
    ]
  },
  "application/vnd.geonext": {
    source: "iana",
    extensions: [
      "gxt"
    ]
  },
  "application/vnd.geoplan": {
    source: "iana",
    extensions: [
      "g2w"
    ]
  },
  "application/vnd.geospace": {
    source: "iana",
    extensions: [
      "g3w"
    ]
  },
  "application/vnd.gerber": {
    source: "iana"
  },
  "application/vnd.globalplatform.card-content-mgt": {
    source: "iana"
  },
  "application/vnd.globalplatform.card-content-mgt-response": {
    source: "iana"
  },
  "application/vnd.gmx": {
    source: "iana",
    extensions: [
      "gmx"
    ]
  },
  "application/vnd.google-apps.document": {
    compressible: !1,
    extensions: [
      "gdoc"
    ]
  },
  "application/vnd.google-apps.presentation": {
    compressible: !1,
    extensions: [
      "gslides"
    ]
  },
  "application/vnd.google-apps.spreadsheet": {
    compressible: !1,
    extensions: [
      "gsheet"
    ]
  },
  "application/vnd.google-earth.kml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "kml"
    ]
  },
  "application/vnd.google-earth.kmz": {
    source: "iana",
    compressible: !1,
    extensions: [
      "kmz"
    ]
  },
  "application/vnd.gov.sk.e-form+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.gov.sk.e-form+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.gov.sk.xmldatacontainer+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.grafeq": {
    source: "iana",
    extensions: [
      "gqf",
      "gqs"
    ]
  },
  "application/vnd.gridmp": {
    source: "iana"
  },
  "application/vnd.groove-account": {
    source: "iana",
    extensions: [
      "gac"
    ]
  },
  "application/vnd.groove-help": {
    source: "iana",
    extensions: [
      "ghf"
    ]
  },
  "application/vnd.groove-identity-message": {
    source: "iana",
    extensions: [
      "gim"
    ]
  },
  "application/vnd.groove-injector": {
    source: "iana",
    extensions: [
      "grv"
    ]
  },
  "application/vnd.groove-tool-message": {
    source: "iana",
    extensions: [
      "gtm"
    ]
  },
  "application/vnd.groove-tool-template": {
    source: "iana",
    extensions: [
      "tpl"
    ]
  },
  "application/vnd.groove-vcard": {
    source: "iana",
    extensions: [
      "vcg"
    ]
  },
  "application/vnd.hal+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hal+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "hal"
    ]
  },
  "application/vnd.handheld-entertainment+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "zmm"
    ]
  },
  "application/vnd.hbci": {
    source: "iana",
    extensions: [
      "hbci"
    ]
  },
  "application/vnd.hc+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hcl-bireports": {
    source: "iana"
  },
  "application/vnd.hdt": {
    source: "iana"
  },
  "application/vnd.heroku+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hhe.lesson-player": {
    source: "iana",
    extensions: [
      "les"
    ]
  },
  "application/vnd.hl7cda+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.hl7v2+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.hp-hpgl": {
    source: "iana",
    extensions: [
      "hpgl"
    ]
  },
  "application/vnd.hp-hpid": {
    source: "iana",
    extensions: [
      "hpid"
    ]
  },
  "application/vnd.hp-hps": {
    source: "iana",
    extensions: [
      "hps"
    ]
  },
  "application/vnd.hp-jlyt": {
    source: "iana",
    extensions: [
      "jlt"
    ]
  },
  "application/vnd.hp-pcl": {
    source: "iana",
    extensions: [
      "pcl"
    ]
  },
  "application/vnd.hp-pclxl": {
    source: "iana",
    extensions: [
      "pclxl"
    ]
  },
  "application/vnd.httphone": {
    source: "iana"
  },
  "application/vnd.hydrostatix.sof-data": {
    source: "iana",
    extensions: [
      "sfd-hdstx"
    ]
  },
  "application/vnd.hyper+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hyper-item+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hyperdrive+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hzn-3d-crossword": {
    source: "iana"
  },
  "application/vnd.ibm.afplinedata": {
    source: "iana"
  },
  "application/vnd.ibm.electronic-media": {
    source: "iana"
  },
  "application/vnd.ibm.minipay": {
    source: "iana",
    extensions: [
      "mpy"
    ]
  },
  "application/vnd.ibm.modcap": {
    source: "iana",
    extensions: [
      "afp",
      "listafp",
      "list3820"
    ]
  },
  "application/vnd.ibm.rights-management": {
    source: "iana",
    extensions: [
      "irm"
    ]
  },
  "application/vnd.ibm.secure-container": {
    source: "iana",
    extensions: [
      "sc"
    ]
  },
  "application/vnd.iccprofile": {
    source: "iana",
    extensions: [
      "icc",
      "icm"
    ]
  },
  "application/vnd.ieee.1905": {
    source: "iana"
  },
  "application/vnd.igloader": {
    source: "iana",
    extensions: [
      "igl"
    ]
  },
  "application/vnd.imagemeter.folder+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.imagemeter.image+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.immervision-ivp": {
    source: "iana",
    extensions: [
      "ivp"
    ]
  },
  "application/vnd.immervision-ivu": {
    source: "iana",
    extensions: [
      "ivu"
    ]
  },
  "application/vnd.ims.imsccv1p1": {
    source: "iana"
  },
  "application/vnd.ims.imsccv1p2": {
    source: "iana"
  },
  "application/vnd.ims.imsccv1p3": {
    source: "iana"
  },
  "application/vnd.ims.lis.v2.result+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolconsumerprofile+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolproxy+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolproxy.id+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolsettings+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolsettings.simple+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.informedcontrol.rms+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.informix-visionary": {
    source: "iana"
  },
  "application/vnd.infotech.project": {
    source: "iana"
  },
  "application/vnd.infotech.project+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.innopath.wamp.notification": {
    source: "iana"
  },
  "application/vnd.insors.igm": {
    source: "iana",
    extensions: [
      "igm"
    ]
  },
  "application/vnd.intercon.formnet": {
    source: "iana",
    extensions: [
      "xpw",
      "xpx"
    ]
  },
  "application/vnd.intergeo": {
    source: "iana",
    extensions: [
      "i2g"
    ]
  },
  "application/vnd.intertrust.digibox": {
    source: "iana"
  },
  "application/vnd.intertrust.nncp": {
    source: "iana"
  },
  "application/vnd.intu.qbo": {
    source: "iana",
    extensions: [
      "qbo"
    ]
  },
  "application/vnd.intu.qfx": {
    source: "iana",
    extensions: [
      "qfx"
    ]
  },
  "application/vnd.iptc.g2.catalogitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.conceptitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.knowledgeitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.newsitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.newsmessage+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.packageitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.planningitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ipunplugged.rcprofile": {
    source: "iana",
    extensions: [
      "rcprofile"
    ]
  },
  "application/vnd.irepository.package+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "irp"
    ]
  },
  "application/vnd.is-xpr": {
    source: "iana",
    extensions: [
      "xpr"
    ]
  },
  "application/vnd.isac.fcs": {
    source: "iana",
    extensions: [
      "fcs"
    ]
  },
  "application/vnd.iso11783-10+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.jam": {
    source: "iana",
    extensions: [
      "jam"
    ]
  },
  "application/vnd.japannet-directory-service": {
    source: "iana"
  },
  "application/vnd.japannet-jpnstore-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-payment-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-registration": {
    source: "iana"
  },
  "application/vnd.japannet-registration-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-setstore-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-verification": {
    source: "iana"
  },
  "application/vnd.japannet-verification-wakeup": {
    source: "iana"
  },
  "application/vnd.jcp.javame.midlet-rms": {
    source: "iana",
    extensions: [
      "rms"
    ]
  },
  "application/vnd.jisp": {
    source: "iana",
    extensions: [
      "jisp"
    ]
  },
  "application/vnd.joost.joda-archive": {
    source: "iana",
    extensions: [
      "joda"
    ]
  },
  "application/vnd.jsk.isdn-ngn": {
    source: "iana"
  },
  "application/vnd.kahootz": {
    source: "iana",
    extensions: [
      "ktz",
      "ktr"
    ]
  },
  "application/vnd.kde.karbon": {
    source: "iana",
    extensions: [
      "karbon"
    ]
  },
  "application/vnd.kde.kchart": {
    source: "iana",
    extensions: [
      "chrt"
    ]
  },
  "application/vnd.kde.kformula": {
    source: "iana",
    extensions: [
      "kfo"
    ]
  },
  "application/vnd.kde.kivio": {
    source: "iana",
    extensions: [
      "flw"
    ]
  },
  "application/vnd.kde.kontour": {
    source: "iana",
    extensions: [
      "kon"
    ]
  },
  "application/vnd.kde.kpresenter": {
    source: "iana",
    extensions: [
      "kpr",
      "kpt"
    ]
  },
  "application/vnd.kde.kspread": {
    source: "iana",
    extensions: [
      "ksp"
    ]
  },
  "application/vnd.kde.kword": {
    source: "iana",
    extensions: [
      "kwd",
      "kwt"
    ]
  },
  "application/vnd.kenameaapp": {
    source: "iana",
    extensions: [
      "htke"
    ]
  },
  "application/vnd.kidspiration": {
    source: "iana",
    extensions: [
      "kia"
    ]
  },
  "application/vnd.kinar": {
    source: "iana",
    extensions: [
      "kne",
      "knp"
    ]
  },
  "application/vnd.koan": {
    source: "iana",
    extensions: [
      "skp",
      "skd",
      "skt",
      "skm"
    ]
  },
  "application/vnd.kodak-descriptor": {
    source: "iana",
    extensions: [
      "sse"
    ]
  },
  "application/vnd.las": {
    source: "iana"
  },
  "application/vnd.las.las+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.las.las+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "lasxml"
    ]
  },
  "application/vnd.laszip": {
    source: "iana"
  },
  "application/vnd.leap+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.liberty-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.llamagraphics.life-balance.desktop": {
    source: "iana",
    extensions: [
      "lbd"
    ]
  },
  "application/vnd.llamagraphics.life-balance.exchange+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "lbe"
    ]
  },
  "application/vnd.logipipe.circuit+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.loom": {
    source: "iana"
  },
  "application/vnd.lotus-1-2-3": {
    source: "iana",
    extensions: [
      "123"
    ]
  },
  "application/vnd.lotus-approach": {
    source: "iana",
    extensions: [
      "apr"
    ]
  },
  "application/vnd.lotus-freelance": {
    source: "iana",
    extensions: [
      "pre"
    ]
  },
  "application/vnd.lotus-notes": {
    source: "iana",
    extensions: [
      "nsf"
    ]
  },
  "application/vnd.lotus-organizer": {
    source: "iana",
    extensions: [
      "org"
    ]
  },
  "application/vnd.lotus-screencam": {
    source: "iana",
    extensions: [
      "scm"
    ]
  },
  "application/vnd.lotus-wordpro": {
    source: "iana",
    extensions: [
      "lwp"
    ]
  },
  "application/vnd.macports.portpkg": {
    source: "iana",
    extensions: [
      "portpkg"
    ]
  },
  "application/vnd.mapbox-vector-tile": {
    source: "iana",
    extensions: [
      "mvt"
    ]
  },
  "application/vnd.marlin.drm.actiontoken+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.marlin.drm.conftoken+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.marlin.drm.license+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.marlin.drm.mdcf": {
    source: "iana"
  },
  "application/vnd.mason+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.maxar.archive.3tz+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.maxmind.maxmind-db": {
    source: "iana"
  },
  "application/vnd.mcd": {
    source: "iana",
    extensions: [
      "mcd"
    ]
  },
  "application/vnd.medcalcdata": {
    source: "iana",
    extensions: [
      "mc1"
    ]
  },
  "application/vnd.mediastation.cdkey": {
    source: "iana",
    extensions: [
      "cdkey"
    ]
  },
  "application/vnd.meridian-slingshot": {
    source: "iana"
  },
  "application/vnd.mfer": {
    source: "iana",
    extensions: [
      "mwf"
    ]
  },
  "application/vnd.mfmp": {
    source: "iana",
    extensions: [
      "mfm"
    ]
  },
  "application/vnd.micro+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.micrografx.flo": {
    source: "iana",
    extensions: [
      "flo"
    ]
  },
  "application/vnd.micrografx.igx": {
    source: "iana",
    extensions: [
      "igx"
    ]
  },
  "application/vnd.microsoft.portable-executable": {
    source: "iana"
  },
  "application/vnd.microsoft.windows.thumbnail-cache": {
    source: "iana"
  },
  "application/vnd.miele+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.mif": {
    source: "iana",
    extensions: [
      "mif"
    ]
  },
  "application/vnd.minisoft-hp3000-save": {
    source: "iana"
  },
  "application/vnd.mitsubishi.misty-guard.trustweb": {
    source: "iana"
  },
  "application/vnd.mobius.daf": {
    source: "iana",
    extensions: [
      "daf"
    ]
  },
  "application/vnd.mobius.dis": {
    source: "iana",
    extensions: [
      "dis"
    ]
  },
  "application/vnd.mobius.mbk": {
    source: "iana",
    extensions: [
      "mbk"
    ]
  },
  "application/vnd.mobius.mqy": {
    source: "iana",
    extensions: [
      "mqy"
    ]
  },
  "application/vnd.mobius.msl": {
    source: "iana",
    extensions: [
      "msl"
    ]
  },
  "application/vnd.mobius.plc": {
    source: "iana",
    extensions: [
      "plc"
    ]
  },
  "application/vnd.mobius.txf": {
    source: "iana",
    extensions: [
      "txf"
    ]
  },
  "application/vnd.mophun.application": {
    source: "iana",
    extensions: [
      "mpn"
    ]
  },
  "application/vnd.mophun.certificate": {
    source: "iana",
    extensions: [
      "mpc"
    ]
  },
  "application/vnd.motorola.flexsuite": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.adsi": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.fis": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.gotap": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.kmr": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.ttc": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.wem": {
    source: "iana"
  },
  "application/vnd.motorola.iprm": {
    source: "iana"
  },
  "application/vnd.mozilla.xul+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xul"
    ]
  },
  "application/vnd.ms-3mfdocument": {
    source: "iana"
  },
  "application/vnd.ms-artgalry": {
    source: "iana",
    extensions: [
      "cil"
    ]
  },
  "application/vnd.ms-asf": {
    source: "iana"
  },
  "application/vnd.ms-cab-compressed": {
    source: "iana",
    extensions: [
      "cab"
    ]
  },
  "application/vnd.ms-color.iccprofile": {
    source: "apache"
  },
  "application/vnd.ms-excel": {
    source: "iana",
    compressible: !1,
    extensions: [
      "xls",
      "xlm",
      "xla",
      "xlc",
      "xlt",
      "xlw"
    ]
  },
  "application/vnd.ms-excel.addin.macroenabled.12": {
    source: "iana",
    extensions: [
      "xlam"
    ]
  },
  "application/vnd.ms-excel.sheet.binary.macroenabled.12": {
    source: "iana",
    extensions: [
      "xlsb"
    ]
  },
  "application/vnd.ms-excel.sheet.macroenabled.12": {
    source: "iana",
    extensions: [
      "xlsm"
    ]
  },
  "application/vnd.ms-excel.template.macroenabled.12": {
    source: "iana",
    extensions: [
      "xltm"
    ]
  },
  "application/vnd.ms-fontobject": {
    source: "iana",
    compressible: !0,
    extensions: [
      "eot"
    ]
  },
  "application/vnd.ms-htmlhelp": {
    source: "iana",
    extensions: [
      "chm"
    ]
  },
  "application/vnd.ms-ims": {
    source: "iana",
    extensions: [
      "ims"
    ]
  },
  "application/vnd.ms-lrm": {
    source: "iana",
    extensions: [
      "lrm"
    ]
  },
  "application/vnd.ms-office.activex+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ms-officetheme": {
    source: "iana",
    extensions: [
      "thmx"
    ]
  },
  "application/vnd.ms-opentype": {
    source: "apache",
    compressible: !0
  },
  "application/vnd.ms-outlook": {
    compressible: !1,
    extensions: [
      "msg"
    ]
  },
  "application/vnd.ms-package.obfuscated-opentype": {
    source: "apache"
  },
  "application/vnd.ms-pki.seccat": {
    source: "apache",
    extensions: [
      "cat"
    ]
  },
  "application/vnd.ms-pki.stl": {
    source: "apache",
    extensions: [
      "stl"
    ]
  },
  "application/vnd.ms-playready.initiator+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ms-powerpoint": {
    source: "iana",
    compressible: !1,
    extensions: [
      "ppt",
      "pps",
      "pot"
    ]
  },
  "application/vnd.ms-powerpoint.addin.macroenabled.12": {
    source: "iana",
    extensions: [
      "ppam"
    ]
  },
  "application/vnd.ms-powerpoint.presentation.macroenabled.12": {
    source: "iana",
    extensions: [
      "pptm"
    ]
  },
  "application/vnd.ms-powerpoint.slide.macroenabled.12": {
    source: "iana",
    extensions: [
      "sldm"
    ]
  },
  "application/vnd.ms-powerpoint.slideshow.macroenabled.12": {
    source: "iana",
    extensions: [
      "ppsm"
    ]
  },
  "application/vnd.ms-powerpoint.template.macroenabled.12": {
    source: "iana",
    extensions: [
      "potm"
    ]
  },
  "application/vnd.ms-printdevicecapabilities+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ms-printing.printticket+xml": {
    source: "apache",
    compressible: !0
  },
  "application/vnd.ms-printschematicket+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ms-project": {
    source: "iana",
    extensions: [
      "mpp",
      "mpt"
    ]
  },
  "application/vnd.ms-tnef": {
    source: "iana"
  },
  "application/vnd.ms-windows.devicepairing": {
    source: "iana"
  },
  "application/vnd.ms-windows.nwprinting.oob": {
    source: "iana"
  },
  "application/vnd.ms-windows.printerpairing": {
    source: "iana"
  },
  "application/vnd.ms-windows.wsd.oob": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.lic-chlg-req": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.lic-resp": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.meter-chlg-req": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.meter-resp": {
    source: "iana"
  },
  "application/vnd.ms-word.document.macroenabled.12": {
    source: "iana",
    extensions: [
      "docm"
    ]
  },
  "application/vnd.ms-word.template.macroenabled.12": {
    source: "iana",
    extensions: [
      "dotm"
    ]
  },
  "application/vnd.ms-works": {
    source: "iana",
    extensions: [
      "wps",
      "wks",
      "wcm",
      "wdb"
    ]
  },
  "application/vnd.ms-wpl": {
    source: "iana",
    extensions: [
      "wpl"
    ]
  },
  "application/vnd.ms-xpsdocument": {
    source: "iana",
    compressible: !1,
    extensions: [
      "xps"
    ]
  },
  "application/vnd.msa-disk-image": {
    source: "iana"
  },
  "application/vnd.mseq": {
    source: "iana",
    extensions: [
      "mseq"
    ]
  },
  "application/vnd.msign": {
    source: "iana"
  },
  "application/vnd.multiad.creator": {
    source: "iana"
  },
  "application/vnd.multiad.creator.cif": {
    source: "iana"
  },
  "application/vnd.music-niff": {
    source: "iana"
  },
  "application/vnd.musician": {
    source: "iana",
    extensions: [
      "mus"
    ]
  },
  "application/vnd.muvee.style": {
    source: "iana",
    extensions: [
      "msty"
    ]
  },
  "application/vnd.mynfc": {
    source: "iana",
    extensions: [
      "taglet"
    ]
  },
  "application/vnd.nacamar.ybrid+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ncd.control": {
    source: "iana"
  },
  "application/vnd.ncd.reference": {
    source: "iana"
  },
  "application/vnd.nearst.inv+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nebumind.line": {
    source: "iana"
  },
  "application/vnd.nervana": {
    source: "iana"
  },
  "application/vnd.netfpx": {
    source: "iana"
  },
  "application/vnd.neurolanguage.nlu": {
    source: "iana",
    extensions: [
      "nlu"
    ]
  },
  "application/vnd.nimn": {
    source: "iana"
  },
  "application/vnd.nintendo.nitro.rom": {
    source: "iana"
  },
  "application/vnd.nintendo.snes.rom": {
    source: "iana"
  },
  "application/vnd.nitf": {
    source: "iana",
    extensions: [
      "ntf",
      "nitf"
    ]
  },
  "application/vnd.noblenet-directory": {
    source: "iana",
    extensions: [
      "nnd"
    ]
  },
  "application/vnd.noblenet-sealer": {
    source: "iana",
    extensions: [
      "nns"
    ]
  },
  "application/vnd.noblenet-web": {
    source: "iana",
    extensions: [
      "nnw"
    ]
  },
  "application/vnd.nokia.catalogs": {
    source: "iana"
  },
  "application/vnd.nokia.conml+wbxml": {
    source: "iana"
  },
  "application/vnd.nokia.conml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.iptv.config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.isds-radio-presets": {
    source: "iana"
  },
  "application/vnd.nokia.landmark+wbxml": {
    source: "iana"
  },
  "application/vnd.nokia.landmark+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.landmarkcollection+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.n-gage.ac+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ac"
    ]
  },
  "application/vnd.nokia.n-gage.data": {
    source: "iana",
    extensions: [
      "ngdat"
    ]
  },
  "application/vnd.nokia.n-gage.symbian.install": {
    source: "iana",
    extensions: [
      "n-gage"
    ]
  },
  "application/vnd.nokia.ncd": {
    source: "iana"
  },
  "application/vnd.nokia.pcd+wbxml": {
    source: "iana"
  },
  "application/vnd.nokia.pcd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.radio-preset": {
    source: "iana",
    extensions: [
      "rpst"
    ]
  },
  "application/vnd.nokia.radio-presets": {
    source: "iana",
    extensions: [
      "rpss"
    ]
  },
  "application/vnd.novadigm.edm": {
    source: "iana",
    extensions: [
      "edm"
    ]
  },
  "application/vnd.novadigm.edx": {
    source: "iana",
    extensions: [
      "edx"
    ]
  },
  "application/vnd.novadigm.ext": {
    source: "iana",
    extensions: [
      "ext"
    ]
  },
  "application/vnd.ntt-local.content-share": {
    source: "iana"
  },
  "application/vnd.ntt-local.file-transfer": {
    source: "iana"
  },
  "application/vnd.ntt-local.ogw_remote-access": {
    source: "iana"
  },
  "application/vnd.ntt-local.sip-ta_remote": {
    source: "iana"
  },
  "application/vnd.ntt-local.sip-ta_tcp_stream": {
    source: "iana"
  },
  "application/vnd.oasis.opendocument.chart": {
    source: "iana",
    extensions: [
      "odc"
    ]
  },
  "application/vnd.oasis.opendocument.chart-template": {
    source: "iana",
    extensions: [
      "otc"
    ]
  },
  "application/vnd.oasis.opendocument.database": {
    source: "iana",
    extensions: [
      "odb"
    ]
  },
  "application/vnd.oasis.opendocument.formula": {
    source: "iana",
    extensions: [
      "odf"
    ]
  },
  "application/vnd.oasis.opendocument.formula-template": {
    source: "iana",
    extensions: [
      "odft"
    ]
  },
  "application/vnd.oasis.opendocument.graphics": {
    source: "iana",
    compressible: !1,
    extensions: [
      "odg"
    ]
  },
  "application/vnd.oasis.opendocument.graphics-template": {
    source: "iana",
    extensions: [
      "otg"
    ]
  },
  "application/vnd.oasis.opendocument.image": {
    source: "iana",
    extensions: [
      "odi"
    ]
  },
  "application/vnd.oasis.opendocument.image-template": {
    source: "iana",
    extensions: [
      "oti"
    ]
  },
  "application/vnd.oasis.opendocument.presentation": {
    source: "iana",
    compressible: !1,
    extensions: [
      "odp"
    ]
  },
  "application/vnd.oasis.opendocument.presentation-template": {
    source: "iana",
    extensions: [
      "otp"
    ]
  },
  "application/vnd.oasis.opendocument.spreadsheet": {
    source: "iana",
    compressible: !1,
    extensions: [
      "ods"
    ]
  },
  "application/vnd.oasis.opendocument.spreadsheet-template": {
    source: "iana",
    extensions: [
      "ots"
    ]
  },
  "application/vnd.oasis.opendocument.text": {
    source: "iana",
    compressible: !1,
    extensions: [
      "odt"
    ]
  },
  "application/vnd.oasis.opendocument.text-master": {
    source: "iana",
    extensions: [
      "odm"
    ]
  },
  "application/vnd.oasis.opendocument.text-template": {
    source: "iana",
    extensions: [
      "ott"
    ]
  },
  "application/vnd.oasis.opendocument.text-web": {
    source: "iana",
    extensions: [
      "oth"
    ]
  },
  "application/vnd.obn": {
    source: "iana"
  },
  "application/vnd.ocf+cbor": {
    source: "iana"
  },
  "application/vnd.oci.image.manifest.v1+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oftn.l10n+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.contentaccessdownload+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.contentaccessstreaming+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.cspg-hexbinary": {
    source: "iana"
  },
  "application/vnd.oipf.dae.svg+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.dae.xhtml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.mippvcontrolmessage+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.pae.gem": {
    source: "iana"
  },
  "application/vnd.oipf.spdiscovery+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.spdlist+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.ueprofile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.userprofile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.olpc-sugar": {
    source: "iana",
    extensions: [
      "xo"
    ]
  },
  "application/vnd.oma-scws-config": {
    source: "iana"
  },
  "application/vnd.oma-scws-http-request": {
    source: "iana"
  },
  "application/vnd.oma-scws-http-response": {
    source: "iana"
  },
  "application/vnd.oma.bcast.associated-procedure-parameter+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.drm-trigger+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.imd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.ltkm": {
    source: "iana"
  },
  "application/vnd.oma.bcast.notification+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.provisioningtrigger": {
    source: "iana"
  },
  "application/vnd.oma.bcast.sgboot": {
    source: "iana"
  },
  "application/vnd.oma.bcast.sgdd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.sgdu": {
    source: "iana"
  },
  "application/vnd.oma.bcast.simple-symbol-container": {
    source: "iana"
  },
  "application/vnd.oma.bcast.smartcard-trigger+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.sprov+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.stkm": {
    source: "iana"
  },
  "application/vnd.oma.cab-address-book+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.cab-feature-handler+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.cab-pcc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.cab-subs-invite+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.cab-user-prefs+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.dcd": {
    source: "iana"
  },
  "application/vnd.oma.dcdc": {
    source: "iana"
  },
  "application/vnd.oma.dd2+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dd2"
    ]
  },
  "application/vnd.oma.drm.risd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.group-usage-list+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.lwm2m+cbor": {
    source: "iana"
  },
  "application/vnd.oma.lwm2m+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.lwm2m+tlv": {
    source: "iana"
  },
  "application/vnd.oma.pal+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.detailed-progress-report+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.final-report+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.groups+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.invocation-descriptor+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.optimized-progress-report+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.push": {
    source: "iana"
  },
  "application/vnd.oma.scidm.messages+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.xcap-directory+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.omads-email+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.omads-file+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.omads-folder+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.omaloc-supl-init": {
    source: "iana"
  },
  "application/vnd.onepager": {
    source: "iana"
  },
  "application/vnd.onepagertamp": {
    source: "iana"
  },
  "application/vnd.onepagertamx": {
    source: "iana"
  },
  "application/vnd.onepagertat": {
    source: "iana"
  },
  "application/vnd.onepagertatp": {
    source: "iana"
  },
  "application/vnd.onepagertatx": {
    source: "iana"
  },
  "application/vnd.openblox.game+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "obgx"
    ]
  },
  "application/vnd.openblox.game-binary": {
    source: "iana"
  },
  "application/vnd.openeye.oeb": {
    source: "iana"
  },
  "application/vnd.openofficeorg.extension": {
    source: "apache",
    extensions: [
      "oxt"
    ]
  },
  "application/vnd.openstreetmap.data+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "osm"
    ]
  },
  "application/vnd.opentimestamps.ots": {
    source: "iana"
  },
  "application/vnd.openxmlformats-officedocument.custom-properties+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.customxmlproperties+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawing+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.chart+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.extended-properties+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.comments+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    source: "iana",
    compressible: !1,
    extensions: [
      "pptx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presprops+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slide": {
    source: "iana",
    extensions: [
      "sldx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slide+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow": {
    source: "iana",
    extensions: [
      "ppsx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.tags+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.template": {
    source: "iana",
    extensions: [
      "potx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.template.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    source: "iana",
    compressible: !1,
    extensions: [
      "xlsx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template": {
    source: "iana",
    extensions: [
      "xltx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.theme+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.themeoverride+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.vmldrawing": {
    source: "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    source: "iana",
    compressible: !1,
    extensions: [
      "docx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template": {
    source: "iana",
    extensions: [
      "dotx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-package.core-properties+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-package.relationships+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oracle.resource+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.orange.indata": {
    source: "iana"
  },
  "application/vnd.osa.netdeploy": {
    source: "iana"
  },
  "application/vnd.osgeo.mapguide.package": {
    source: "iana",
    extensions: [
      "mgp"
    ]
  },
  "application/vnd.osgi.bundle": {
    source: "iana"
  },
  "application/vnd.osgi.dp": {
    source: "iana",
    extensions: [
      "dp"
    ]
  },
  "application/vnd.osgi.subsystem": {
    source: "iana",
    extensions: [
      "esa"
    ]
  },
  "application/vnd.otps.ct-kip+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oxli.countgraph": {
    source: "iana"
  },
  "application/vnd.pagerduty+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.palm": {
    source: "iana",
    extensions: [
      "pdb",
      "pqa",
      "oprc"
    ]
  },
  "application/vnd.panoply": {
    source: "iana"
  },
  "application/vnd.paos.xml": {
    source: "iana"
  },
  "application/vnd.patentdive": {
    source: "iana"
  },
  "application/vnd.patientecommsdoc": {
    source: "iana"
  },
  "application/vnd.pawaafile": {
    source: "iana",
    extensions: [
      "paw"
    ]
  },
  "application/vnd.pcos": {
    source: "iana"
  },
  "application/vnd.pg.format": {
    source: "iana",
    extensions: [
      "str"
    ]
  },
  "application/vnd.pg.osasli": {
    source: "iana",
    extensions: [
      "ei6"
    ]
  },
  "application/vnd.piaccess.application-licence": {
    source: "iana"
  },
  "application/vnd.picsel": {
    source: "iana",
    extensions: [
      "efif"
    ]
  },
  "application/vnd.pmi.widget": {
    source: "iana",
    extensions: [
      "wg"
    ]
  },
  "application/vnd.poc.group-advertisement+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.pocketlearn": {
    source: "iana",
    extensions: [
      "plf"
    ]
  },
  "application/vnd.powerbuilder6": {
    source: "iana",
    extensions: [
      "pbd"
    ]
  },
  "application/vnd.powerbuilder6-s": {
    source: "iana"
  },
  "application/vnd.powerbuilder7": {
    source: "iana"
  },
  "application/vnd.powerbuilder7-s": {
    source: "iana"
  },
  "application/vnd.powerbuilder75": {
    source: "iana"
  },
  "application/vnd.powerbuilder75-s": {
    source: "iana"
  },
  "application/vnd.preminet": {
    source: "iana"
  },
  "application/vnd.previewsystems.box": {
    source: "iana",
    extensions: [
      "box"
    ]
  },
  "application/vnd.proteus.magazine": {
    source: "iana",
    extensions: [
      "mgz"
    ]
  },
  "application/vnd.psfs": {
    source: "iana"
  },
  "application/vnd.publishare-delta-tree": {
    source: "iana",
    extensions: [
      "qps"
    ]
  },
  "application/vnd.pvi.ptid1": {
    source: "iana",
    extensions: [
      "ptid"
    ]
  },
  "application/vnd.pwg-multiplexed": {
    source: "iana"
  },
  "application/vnd.pwg-xhtml-print+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.qualcomm.brew-app-res": {
    source: "iana"
  },
  "application/vnd.quarantainenet": {
    source: "iana"
  },
  "application/vnd.quark.quarkxpress": {
    source: "iana",
    extensions: [
      "qxd",
      "qxt",
      "qwd",
      "qwt",
      "qxl",
      "qxb"
    ]
  },
  "application/vnd.quobject-quoxdocument": {
    source: "iana"
  },
  "application/vnd.radisys.moml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit-conf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit-conn+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit-dialog+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit-stream+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-conf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-base+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-fax-detect+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-fax-sendrecv+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-group+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-speech+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-transform+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.rainstor.data": {
    source: "iana"
  },
  "application/vnd.rapid": {
    source: "iana"
  },
  "application/vnd.rar": {
    source: "iana",
    extensions: [
      "rar"
    ]
  },
  "application/vnd.realvnc.bed": {
    source: "iana",
    extensions: [
      "bed"
    ]
  },
  "application/vnd.recordare.musicxml": {
    source: "iana",
    extensions: [
      "mxl"
    ]
  },
  "application/vnd.recordare.musicxml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "musicxml"
    ]
  },
  "application/vnd.renlearn.rlprint": {
    source: "iana"
  },
  "application/vnd.resilient.logic": {
    source: "iana"
  },
  "application/vnd.restful+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.rig.cryptonote": {
    source: "iana",
    extensions: [
      "cryptonote"
    ]
  },
  "application/vnd.rim.cod": {
    source: "apache",
    extensions: [
      "cod"
    ]
  },
  "application/vnd.rn-realmedia": {
    source: "apache",
    extensions: [
      "rm"
    ]
  },
  "application/vnd.rn-realmedia-vbr": {
    source: "apache",
    extensions: [
      "rmvb"
    ]
  },
  "application/vnd.route66.link66+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "link66"
    ]
  },
  "application/vnd.rs-274x": {
    source: "iana"
  },
  "application/vnd.ruckus.download": {
    source: "iana"
  },
  "application/vnd.s3sms": {
    source: "iana"
  },
  "application/vnd.sailingtracker.track": {
    source: "iana",
    extensions: [
      "st"
    ]
  },
  "application/vnd.sar": {
    source: "iana"
  },
  "application/vnd.sbm.cid": {
    source: "iana"
  },
  "application/vnd.sbm.mid2": {
    source: "iana"
  },
  "application/vnd.scribus": {
    source: "iana"
  },
  "application/vnd.sealed.3df": {
    source: "iana"
  },
  "application/vnd.sealed.csf": {
    source: "iana"
  },
  "application/vnd.sealed.doc": {
    source: "iana"
  },
  "application/vnd.sealed.eml": {
    source: "iana"
  },
  "application/vnd.sealed.mht": {
    source: "iana"
  },
  "application/vnd.sealed.net": {
    source: "iana"
  },
  "application/vnd.sealed.ppt": {
    source: "iana"
  },
  "application/vnd.sealed.tiff": {
    source: "iana"
  },
  "application/vnd.sealed.xls": {
    source: "iana"
  },
  "application/vnd.sealedmedia.softseal.html": {
    source: "iana"
  },
  "application/vnd.sealedmedia.softseal.pdf": {
    source: "iana"
  },
  "application/vnd.seemail": {
    source: "iana",
    extensions: [
      "see"
    ]
  },
  "application/vnd.seis+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.sema": {
    source: "iana",
    extensions: [
      "sema"
    ]
  },
  "application/vnd.semd": {
    source: "iana",
    extensions: [
      "semd"
    ]
  },
  "application/vnd.semf": {
    source: "iana",
    extensions: [
      "semf"
    ]
  },
  "application/vnd.shade-save-file": {
    source: "iana"
  },
  "application/vnd.shana.informed.formdata": {
    source: "iana",
    extensions: [
      "ifm"
    ]
  },
  "application/vnd.shana.informed.formtemplate": {
    source: "iana",
    extensions: [
      "itp"
    ]
  },
  "application/vnd.shana.informed.interchange": {
    source: "iana",
    extensions: [
      "iif"
    ]
  },
  "application/vnd.shana.informed.package": {
    source: "iana",
    extensions: [
      "ipk"
    ]
  },
  "application/vnd.shootproof+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.shopkick+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.shp": {
    source: "iana"
  },
  "application/vnd.shx": {
    source: "iana"
  },
  "application/vnd.sigrok.session": {
    source: "iana"
  },
  "application/vnd.simtech-mindmapper": {
    source: "iana",
    extensions: [
      "twd",
      "twds"
    ]
  },
  "application/vnd.siren+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.smaf": {
    source: "iana",
    extensions: [
      "mmf"
    ]
  },
  "application/vnd.smart.notebook": {
    source: "iana"
  },
  "application/vnd.smart.teacher": {
    source: "iana",
    extensions: [
      "teacher"
    ]
  },
  "application/vnd.snesdev-page-table": {
    source: "iana"
  },
  "application/vnd.software602.filler.form+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "fo"
    ]
  },
  "application/vnd.software602.filler.form-xml-zip": {
    source: "iana"
  },
  "application/vnd.solent.sdkm+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sdkm",
      "sdkd"
    ]
  },
  "application/vnd.spotfire.dxp": {
    source: "iana",
    extensions: [
      "dxp"
    ]
  },
  "application/vnd.spotfire.sfs": {
    source: "iana",
    extensions: [
      "sfs"
    ]
  },
  "application/vnd.sqlite3": {
    source: "iana"
  },
  "application/vnd.sss-cod": {
    source: "iana"
  },
  "application/vnd.sss-dtf": {
    source: "iana"
  },
  "application/vnd.sss-ntf": {
    source: "iana"
  },
  "application/vnd.stardivision.calc": {
    source: "apache",
    extensions: [
      "sdc"
    ]
  },
  "application/vnd.stardivision.draw": {
    source: "apache",
    extensions: [
      "sda"
    ]
  },
  "application/vnd.stardivision.impress": {
    source: "apache",
    extensions: [
      "sdd"
    ]
  },
  "application/vnd.stardivision.math": {
    source: "apache",
    extensions: [
      "smf"
    ]
  },
  "application/vnd.stardivision.writer": {
    source: "apache",
    extensions: [
      "sdw",
      "vor"
    ]
  },
  "application/vnd.stardivision.writer-global": {
    source: "apache",
    extensions: [
      "sgl"
    ]
  },
  "application/vnd.stepmania.package": {
    source: "iana",
    extensions: [
      "smzip"
    ]
  },
  "application/vnd.stepmania.stepchart": {
    source: "iana",
    extensions: [
      "sm"
    ]
  },
  "application/vnd.street-stream": {
    source: "iana"
  },
  "application/vnd.sun.wadl+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wadl"
    ]
  },
  "application/vnd.sun.xml.calc": {
    source: "apache",
    extensions: [
      "sxc"
    ]
  },
  "application/vnd.sun.xml.calc.template": {
    source: "apache",
    extensions: [
      "stc"
    ]
  },
  "application/vnd.sun.xml.draw": {
    source: "apache",
    extensions: [
      "sxd"
    ]
  },
  "application/vnd.sun.xml.draw.template": {
    source: "apache",
    extensions: [
      "std"
    ]
  },
  "application/vnd.sun.xml.impress": {
    source: "apache",
    extensions: [
      "sxi"
    ]
  },
  "application/vnd.sun.xml.impress.template": {
    source: "apache",
    extensions: [
      "sti"
    ]
  },
  "application/vnd.sun.xml.math": {
    source: "apache",
    extensions: [
      "sxm"
    ]
  },
  "application/vnd.sun.xml.writer": {
    source: "apache",
    extensions: [
      "sxw"
    ]
  },
  "application/vnd.sun.xml.writer.global": {
    source: "apache",
    extensions: [
      "sxg"
    ]
  },
  "application/vnd.sun.xml.writer.template": {
    source: "apache",
    extensions: [
      "stw"
    ]
  },
  "application/vnd.sus-calendar": {
    source: "iana",
    extensions: [
      "sus",
      "susp"
    ]
  },
  "application/vnd.svd": {
    source: "iana",
    extensions: [
      "svd"
    ]
  },
  "application/vnd.swiftview-ics": {
    source: "iana"
  },
  "application/vnd.sycle+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.syft+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.symbian.install": {
    source: "apache",
    extensions: [
      "sis",
      "sisx"
    ]
  },
  "application/vnd.syncml+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "xsm"
    ]
  },
  "application/vnd.syncml.dm+wbxml": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "bdm"
    ]
  },
  "application/vnd.syncml.dm+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "xdm"
    ]
  },
  "application/vnd.syncml.dm.notification": {
    source: "iana"
  },
  "application/vnd.syncml.dmddf+wbxml": {
    source: "iana"
  },
  "application/vnd.syncml.dmddf+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "ddf"
    ]
  },
  "application/vnd.syncml.dmtnds+wbxml": {
    source: "iana"
  },
  "application/vnd.syncml.dmtnds+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.syncml.ds.notification": {
    source: "iana"
  },
  "application/vnd.tableschema+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.tao.intent-module-archive": {
    source: "iana",
    extensions: [
      "tao"
    ]
  },
  "application/vnd.tcpdump.pcap": {
    source: "iana",
    extensions: [
      "pcap",
      "cap",
      "dmp"
    ]
  },
  "application/vnd.think-cell.ppttc+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.tmd.mediaflex.api+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.tml": {
    source: "iana"
  },
  "application/vnd.tmobile-livetv": {
    source: "iana",
    extensions: [
      "tmo"
    ]
  },
  "application/vnd.tri.onesource": {
    source: "iana"
  },
  "application/vnd.trid.tpt": {
    source: "iana",
    extensions: [
      "tpt"
    ]
  },
  "application/vnd.triscape.mxs": {
    source: "iana",
    extensions: [
      "mxs"
    ]
  },
  "application/vnd.trueapp": {
    source: "iana",
    extensions: [
      "tra"
    ]
  },
  "application/vnd.truedoc": {
    source: "iana"
  },
  "application/vnd.ubisoft.webplayer": {
    source: "iana"
  },
  "application/vnd.ufdl": {
    source: "iana",
    extensions: [
      "ufd",
      "ufdl"
    ]
  },
  "application/vnd.uiq.theme": {
    source: "iana",
    extensions: [
      "utz"
    ]
  },
  "application/vnd.umajin": {
    source: "iana",
    extensions: [
      "umj"
    ]
  },
  "application/vnd.unity": {
    source: "iana",
    extensions: [
      "unityweb"
    ]
  },
  "application/vnd.uoml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "uoml"
    ]
  },
  "application/vnd.uplanet.alert": {
    source: "iana"
  },
  "application/vnd.uplanet.alert-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.bearer-choice": {
    source: "iana"
  },
  "application/vnd.uplanet.bearer-choice-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.cacheop": {
    source: "iana"
  },
  "application/vnd.uplanet.cacheop-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.channel": {
    source: "iana"
  },
  "application/vnd.uplanet.channel-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.list": {
    source: "iana"
  },
  "application/vnd.uplanet.list-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.listcmd": {
    source: "iana"
  },
  "application/vnd.uplanet.listcmd-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.signal": {
    source: "iana"
  },
  "application/vnd.uri-map": {
    source: "iana"
  },
  "application/vnd.valve.source.material": {
    source: "iana"
  },
  "application/vnd.vcx": {
    source: "iana",
    extensions: [
      "vcx"
    ]
  },
  "application/vnd.vd-study": {
    source: "iana"
  },
  "application/vnd.vectorworks": {
    source: "iana"
  },
  "application/vnd.vel+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.verimatrix.vcas": {
    source: "iana"
  },
  "application/vnd.veritone.aion+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.veryant.thin": {
    source: "iana"
  },
  "application/vnd.ves.encrypted": {
    source: "iana"
  },
  "application/vnd.vidsoft.vidconference": {
    source: "iana"
  },
  "application/vnd.visio": {
    source: "iana",
    extensions: [
      "vsd",
      "vst",
      "vss",
      "vsw"
    ]
  },
  "application/vnd.visionary": {
    source: "iana",
    extensions: [
      "vis"
    ]
  },
  "application/vnd.vividence.scriptfile": {
    source: "iana"
  },
  "application/vnd.vsf": {
    source: "iana",
    extensions: [
      "vsf"
    ]
  },
  "application/vnd.wap.sic": {
    source: "iana"
  },
  "application/vnd.wap.slc": {
    source: "iana"
  },
  "application/vnd.wap.wbxml": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "wbxml"
    ]
  },
  "application/vnd.wap.wmlc": {
    source: "iana",
    extensions: [
      "wmlc"
    ]
  },
  "application/vnd.wap.wmlscriptc": {
    source: "iana",
    extensions: [
      "wmlsc"
    ]
  },
  "application/vnd.webturbo": {
    source: "iana",
    extensions: [
      "wtb"
    ]
  },
  "application/vnd.wfa.dpp": {
    source: "iana"
  },
  "application/vnd.wfa.p2p": {
    source: "iana"
  },
  "application/vnd.wfa.wsc": {
    source: "iana"
  },
  "application/vnd.windows.devicepairing": {
    source: "iana"
  },
  "application/vnd.wmc": {
    source: "iana"
  },
  "application/vnd.wmf.bootstrap": {
    source: "iana"
  },
  "application/vnd.wolfram.mathematica": {
    source: "iana"
  },
  "application/vnd.wolfram.mathematica.package": {
    source: "iana"
  },
  "application/vnd.wolfram.player": {
    source: "iana",
    extensions: [
      "nbp"
    ]
  },
  "application/vnd.wordperfect": {
    source: "iana",
    extensions: [
      "wpd"
    ]
  },
  "application/vnd.wqd": {
    source: "iana",
    extensions: [
      "wqd"
    ]
  },
  "application/vnd.wrq-hp3000-labelled": {
    source: "iana"
  },
  "application/vnd.wt.stf": {
    source: "iana",
    extensions: [
      "stf"
    ]
  },
  "application/vnd.wv.csp+wbxml": {
    source: "iana"
  },
  "application/vnd.wv.csp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.wv.ssp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.xacml+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.xara": {
    source: "iana",
    extensions: [
      "xar"
    ]
  },
  "application/vnd.xfdl": {
    source: "iana",
    extensions: [
      "xfdl"
    ]
  },
  "application/vnd.xfdl.webform": {
    source: "iana"
  },
  "application/vnd.xmi+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.xmpie.cpkg": {
    source: "iana"
  },
  "application/vnd.xmpie.dpkg": {
    source: "iana"
  },
  "application/vnd.xmpie.plan": {
    source: "iana"
  },
  "application/vnd.xmpie.ppkg": {
    source: "iana"
  },
  "application/vnd.xmpie.xlim": {
    source: "iana"
  },
  "application/vnd.yamaha.hv-dic": {
    source: "iana",
    extensions: [
      "hvd"
    ]
  },
  "application/vnd.yamaha.hv-script": {
    source: "iana",
    extensions: [
      "hvs"
    ]
  },
  "application/vnd.yamaha.hv-voice": {
    source: "iana",
    extensions: [
      "hvp"
    ]
  },
  "application/vnd.yamaha.openscoreformat": {
    source: "iana",
    extensions: [
      "osf"
    ]
  },
  "application/vnd.yamaha.openscoreformat.osfpvg+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "osfpvg"
    ]
  },
  "application/vnd.yamaha.remote-setup": {
    source: "iana"
  },
  "application/vnd.yamaha.smaf-audio": {
    source: "iana",
    extensions: [
      "saf"
    ]
  },
  "application/vnd.yamaha.smaf-phrase": {
    source: "iana",
    extensions: [
      "spf"
    ]
  },
  "application/vnd.yamaha.through-ngn": {
    source: "iana"
  },
  "application/vnd.yamaha.tunnel-udpencap": {
    source: "iana"
  },
  "application/vnd.yaoweme": {
    source: "iana"
  },
  "application/vnd.yellowriver-custom-menu": {
    source: "iana",
    extensions: [
      "cmp"
    ]
  },
  "application/vnd.youtube.yt": {
    source: "iana"
  },
  "application/vnd.zul": {
    source: "iana",
    extensions: [
      "zir",
      "zirz"
    ]
  },
  "application/vnd.zzazz.deck+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "zaz"
    ]
  },
  "application/voicexml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "vxml"
    ]
  },
  "application/voucher-cms+json": {
    source: "iana",
    compressible: !0
  },
  "application/vq-rtcpxr": {
    source: "iana"
  },
  "application/wasm": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wasm"
    ]
  },
  "application/watcherinfo+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wif"
    ]
  },
  "application/webpush-options+json": {
    source: "iana",
    compressible: !0
  },
  "application/whoispp-query": {
    source: "iana"
  },
  "application/whoispp-response": {
    source: "iana"
  },
  "application/widget": {
    source: "iana",
    extensions: [
      "wgt"
    ]
  },
  "application/winhlp": {
    source: "apache",
    extensions: [
      "hlp"
    ]
  },
  "application/wita": {
    source: "iana"
  },
  "application/wordperfect5.1": {
    source: "iana"
  },
  "application/wsdl+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wsdl"
    ]
  },
  "application/wspolicy+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wspolicy"
    ]
  },
  "application/x-7z-compressed": {
    source: "apache",
    compressible: !1,
    extensions: [
      "7z"
    ]
  },
  "application/x-abiword": {
    source: "apache",
    extensions: [
      "abw"
    ]
  },
  "application/x-ace-compressed": {
    source: "apache",
    extensions: [
      "ace"
    ]
  },
  "application/x-amf": {
    source: "apache"
  },
  "application/x-apple-diskimage": {
    source: "apache",
    extensions: [
      "dmg"
    ]
  },
  "application/x-arj": {
    compressible: !1,
    extensions: [
      "arj"
    ]
  },
  "application/x-authorware-bin": {
    source: "apache",
    extensions: [
      "aab",
      "x32",
      "u32",
      "vox"
    ]
  },
  "application/x-authorware-map": {
    source: "apache",
    extensions: [
      "aam"
    ]
  },
  "application/x-authorware-seg": {
    source: "apache",
    extensions: [
      "aas"
    ]
  },
  "application/x-bcpio": {
    source: "apache",
    extensions: [
      "bcpio"
    ]
  },
  "application/x-bdoc": {
    compressible: !1,
    extensions: [
      "bdoc"
    ]
  },
  "application/x-bittorrent": {
    source: "apache",
    extensions: [
      "torrent"
    ]
  },
  "application/x-blorb": {
    source: "apache",
    extensions: [
      "blb",
      "blorb"
    ]
  },
  "application/x-bzip": {
    source: "apache",
    compressible: !1,
    extensions: [
      "bz"
    ]
  },
  "application/x-bzip2": {
    source: "apache",
    compressible: !1,
    extensions: [
      "bz2",
      "boz"
    ]
  },
  "application/x-cbr": {
    source: "apache",
    extensions: [
      "cbr",
      "cba",
      "cbt",
      "cbz",
      "cb7"
    ]
  },
  "application/x-cdlink": {
    source: "apache",
    extensions: [
      "vcd"
    ]
  },
  "application/x-cfs-compressed": {
    source: "apache",
    extensions: [
      "cfs"
    ]
  },
  "application/x-chat": {
    source: "apache",
    extensions: [
      "chat"
    ]
  },
  "application/x-chess-pgn": {
    source: "apache",
    extensions: [
      "pgn"
    ]
  },
  "application/x-chrome-extension": {
    extensions: [
      "crx"
    ]
  },
  "application/x-cocoa": {
    source: "nginx",
    extensions: [
      "cco"
    ]
  },
  "application/x-compress": {
    source: "apache"
  },
  "application/x-conference": {
    source: "apache",
    extensions: [
      "nsc"
    ]
  },
  "application/x-cpio": {
    source: "apache",
    extensions: [
      "cpio"
    ]
  },
  "application/x-csh": {
    source: "apache",
    extensions: [
      "csh"
    ]
  },
  "application/x-deb": {
    compressible: !1
  },
  "application/x-debian-package": {
    source: "apache",
    extensions: [
      "deb",
      "udeb"
    ]
  },
  "application/x-dgc-compressed": {
    source: "apache",
    extensions: [
      "dgc"
    ]
  },
  "application/x-director": {
    source: "apache",
    extensions: [
      "dir",
      "dcr",
      "dxr",
      "cst",
      "cct",
      "cxt",
      "w3d",
      "fgd",
      "swa"
    ]
  },
  "application/x-doom": {
    source: "apache",
    extensions: [
      "wad"
    ]
  },
  "application/x-dtbncx+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "ncx"
    ]
  },
  "application/x-dtbook+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "dtb"
    ]
  },
  "application/x-dtbresource+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "res"
    ]
  },
  "application/x-dvi": {
    source: "apache",
    compressible: !1,
    extensions: [
      "dvi"
    ]
  },
  "application/x-envoy": {
    source: "apache",
    extensions: [
      "evy"
    ]
  },
  "application/x-eva": {
    source: "apache",
    extensions: [
      "eva"
    ]
  },
  "application/x-font-bdf": {
    source: "apache",
    extensions: [
      "bdf"
    ]
  },
  "application/x-font-dos": {
    source: "apache"
  },
  "application/x-font-framemaker": {
    source: "apache"
  },
  "application/x-font-ghostscript": {
    source: "apache",
    extensions: [
      "gsf"
    ]
  },
  "application/x-font-libgrx": {
    source: "apache"
  },
  "application/x-font-linux-psf": {
    source: "apache",
    extensions: [
      "psf"
    ]
  },
  "application/x-font-pcf": {
    source: "apache",
    extensions: [
      "pcf"
    ]
  },
  "application/x-font-snf": {
    source: "apache",
    extensions: [
      "snf"
    ]
  },
  "application/x-font-speedo": {
    source: "apache"
  },
  "application/x-font-sunos-news": {
    source: "apache"
  },
  "application/x-font-type1": {
    source: "apache",
    extensions: [
      "pfa",
      "pfb",
      "pfm",
      "afm"
    ]
  },
  "application/x-font-vfont": {
    source: "apache"
  },
  "application/x-freearc": {
    source: "apache",
    extensions: [
      "arc"
    ]
  },
  "application/x-futuresplash": {
    source: "apache",
    extensions: [
      "spl"
    ]
  },
  "application/x-gca-compressed": {
    source: "apache",
    extensions: [
      "gca"
    ]
  },
  "application/x-glulx": {
    source: "apache",
    extensions: [
      "ulx"
    ]
  },
  "application/x-gnumeric": {
    source: "apache",
    extensions: [
      "gnumeric"
    ]
  },
  "application/x-gramps-xml": {
    source: "apache",
    extensions: [
      "gramps"
    ]
  },
  "application/x-gtar": {
    source: "apache",
    extensions: [
      "gtar"
    ]
  },
  "application/x-gzip": {
    source: "apache"
  },
  "application/x-hdf": {
    source: "apache",
    extensions: [
      "hdf"
    ]
  },
  "application/x-httpd-php": {
    compressible: !0,
    extensions: [
      "php"
    ]
  },
  "application/x-install-instructions": {
    source: "apache",
    extensions: [
      "install"
    ]
  },
  "application/x-iso9660-image": {
    source: "apache",
    extensions: [
      "iso"
    ]
  },
  "application/x-iwork-keynote-sffkey": {
    extensions: [
      "key"
    ]
  },
  "application/x-iwork-numbers-sffnumbers": {
    extensions: [
      "numbers"
    ]
  },
  "application/x-iwork-pages-sffpages": {
    extensions: [
      "pages"
    ]
  },
  "application/x-java-archive-diff": {
    source: "nginx",
    extensions: [
      "jardiff"
    ]
  },
  "application/x-java-jnlp-file": {
    source: "apache",
    compressible: !1,
    extensions: [
      "jnlp"
    ]
  },
  "application/x-javascript": {
    compressible: !0
  },
  "application/x-keepass2": {
    extensions: [
      "kdbx"
    ]
  },
  "application/x-latex": {
    source: "apache",
    compressible: !1,
    extensions: [
      "latex"
    ]
  },
  "application/x-lua-bytecode": {
    extensions: [
      "luac"
    ]
  },
  "application/x-lzh-compressed": {
    source: "apache",
    extensions: [
      "lzh",
      "lha"
    ]
  },
  "application/x-makeself": {
    source: "nginx",
    extensions: [
      "run"
    ]
  },
  "application/x-mie": {
    source: "apache",
    extensions: [
      "mie"
    ]
  },
  "application/x-mobipocket-ebook": {
    source: "apache",
    extensions: [
      "prc",
      "mobi"
    ]
  },
  "application/x-mpegurl": {
    compressible: !1
  },
  "application/x-ms-application": {
    source: "apache",
    extensions: [
      "application"
    ]
  },
  "application/x-ms-shortcut": {
    source: "apache",
    extensions: [
      "lnk"
    ]
  },
  "application/x-ms-wmd": {
    source: "apache",
    extensions: [
      "wmd"
    ]
  },
  "application/x-ms-wmz": {
    source: "apache",
    extensions: [
      "wmz"
    ]
  },
  "application/x-ms-xbap": {
    source: "apache",
    extensions: [
      "xbap"
    ]
  },
  "application/x-msaccess": {
    source: "apache",
    extensions: [
      "mdb"
    ]
  },
  "application/x-msbinder": {
    source: "apache",
    extensions: [
      "obd"
    ]
  },
  "application/x-mscardfile": {
    source: "apache",
    extensions: [
      "crd"
    ]
  },
  "application/x-msclip": {
    source: "apache",
    extensions: [
      "clp"
    ]
  },
  "application/x-msdos-program": {
    extensions: [
      "exe"
    ]
  },
  "application/x-msdownload": {
    source: "apache",
    extensions: [
      "exe",
      "dll",
      "com",
      "bat",
      "msi"
    ]
  },
  "application/x-msmediaview": {
    source: "apache",
    extensions: [
      "mvb",
      "m13",
      "m14"
    ]
  },
  "application/x-msmetafile": {
    source: "apache",
    extensions: [
      "wmf",
      "wmz",
      "emf",
      "emz"
    ]
  },
  "application/x-msmoney": {
    source: "apache",
    extensions: [
      "mny"
    ]
  },
  "application/x-mspublisher": {
    source: "apache",
    extensions: [
      "pub"
    ]
  },
  "application/x-msschedule": {
    source: "apache",
    extensions: [
      "scd"
    ]
  },
  "application/x-msterminal": {
    source: "apache",
    extensions: [
      "trm"
    ]
  },
  "application/x-mswrite": {
    source: "apache",
    extensions: [
      "wri"
    ]
  },
  "application/x-netcdf": {
    source: "apache",
    extensions: [
      "nc",
      "cdf"
    ]
  },
  "application/x-ns-proxy-autoconfig": {
    compressible: !0,
    extensions: [
      "pac"
    ]
  },
  "application/x-nzb": {
    source: "apache",
    extensions: [
      "nzb"
    ]
  },
  "application/x-perl": {
    source: "nginx",
    extensions: [
      "pl",
      "pm"
    ]
  },
  "application/x-pilot": {
    source: "nginx",
    extensions: [
      "prc",
      "pdb"
    ]
  },
  "application/x-pkcs12": {
    source: "apache",
    compressible: !1,
    extensions: [
      "p12",
      "pfx"
    ]
  },
  "application/x-pkcs7-certificates": {
    source: "apache",
    extensions: [
      "p7b",
      "spc"
    ]
  },
  "application/x-pkcs7-certreqresp": {
    source: "apache",
    extensions: [
      "p7r"
    ]
  },
  "application/x-pki-message": {
    source: "iana"
  },
  "application/x-rar-compressed": {
    source: "apache",
    compressible: !1,
    extensions: [
      "rar"
    ]
  },
  "application/x-redhat-package-manager": {
    source: "nginx",
    extensions: [
      "rpm"
    ]
  },
  "application/x-research-info-systems": {
    source: "apache",
    extensions: [
      "ris"
    ]
  },
  "application/x-sea": {
    source: "nginx",
    extensions: [
      "sea"
    ]
  },
  "application/x-sh": {
    source: "apache",
    compressible: !0,
    extensions: [
      "sh"
    ]
  },
  "application/x-shar": {
    source: "apache",
    extensions: [
      "shar"
    ]
  },
  "application/x-shockwave-flash": {
    source: "apache",
    compressible: !1,
    extensions: [
      "swf"
    ]
  },
  "application/x-silverlight-app": {
    source: "apache",
    extensions: [
      "xap"
    ]
  },
  "application/x-sql": {
    source: "apache",
    extensions: [
      "sql"
    ]
  },
  "application/x-stuffit": {
    source: "apache",
    compressible: !1,
    extensions: [
      "sit"
    ]
  },
  "application/x-stuffitx": {
    source: "apache",
    extensions: [
      "sitx"
    ]
  },
  "application/x-subrip": {
    source: "apache",
    extensions: [
      "srt"
    ]
  },
  "application/x-sv4cpio": {
    source: "apache",
    extensions: [
      "sv4cpio"
    ]
  },
  "application/x-sv4crc": {
    source: "apache",
    extensions: [
      "sv4crc"
    ]
  },
  "application/x-t3vm-image": {
    source: "apache",
    extensions: [
      "t3"
    ]
  },
  "application/x-tads": {
    source: "apache",
    extensions: [
      "gam"
    ]
  },
  "application/x-tar": {
    source: "apache",
    compressible: !0,
    extensions: [
      "tar"
    ]
  },
  "application/x-tcl": {
    source: "apache",
    extensions: [
      "tcl",
      "tk"
    ]
  },
  "application/x-tex": {
    source: "apache",
    extensions: [
      "tex"
    ]
  },
  "application/x-tex-tfm": {
    source: "apache",
    extensions: [
      "tfm"
    ]
  },
  "application/x-texinfo": {
    source: "apache",
    extensions: [
      "texinfo",
      "texi"
    ]
  },
  "application/x-tgif": {
    source: "apache",
    extensions: [
      "obj"
    ]
  },
  "application/x-ustar": {
    source: "apache",
    extensions: [
      "ustar"
    ]
  },
  "application/x-virtualbox-hdd": {
    compressible: !0,
    extensions: [
      "hdd"
    ]
  },
  "application/x-virtualbox-ova": {
    compressible: !0,
    extensions: [
      "ova"
    ]
  },
  "application/x-virtualbox-ovf": {
    compressible: !0,
    extensions: [
      "ovf"
    ]
  },
  "application/x-virtualbox-vbox": {
    compressible: !0,
    extensions: [
      "vbox"
    ]
  },
  "application/x-virtualbox-vbox-extpack": {
    compressible: !1,
    extensions: [
      "vbox-extpack"
    ]
  },
  "application/x-virtualbox-vdi": {
    compressible: !0,
    extensions: [
      "vdi"
    ]
  },
  "application/x-virtualbox-vhd": {
    compressible: !0,
    extensions: [
      "vhd"
    ]
  },
  "application/x-virtualbox-vmdk": {
    compressible: !0,
    extensions: [
      "vmdk"
    ]
  },
  "application/x-wais-source": {
    source: "apache",
    extensions: [
      "src"
    ]
  },
  "application/x-web-app-manifest+json": {
    compressible: !0,
    extensions: [
      "webapp"
    ]
  },
  "application/x-www-form-urlencoded": {
    source: "iana",
    compressible: !0
  },
  "application/x-x509-ca-cert": {
    source: "iana",
    extensions: [
      "der",
      "crt",
      "pem"
    ]
  },
  "application/x-x509-ca-ra-cert": {
    source: "iana"
  },
  "application/x-x509-next-ca-cert": {
    source: "iana"
  },
  "application/x-xfig": {
    source: "apache",
    extensions: [
      "fig"
    ]
  },
  "application/x-xliff+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "xlf"
    ]
  },
  "application/x-xpinstall": {
    source: "apache",
    compressible: !1,
    extensions: [
      "xpi"
    ]
  },
  "application/x-xz": {
    source: "apache",
    extensions: [
      "xz"
    ]
  },
  "application/x-zmachine": {
    source: "apache",
    extensions: [
      "z1",
      "z2",
      "z3",
      "z4",
      "z5",
      "z6",
      "z7",
      "z8"
    ]
  },
  "application/x400-bp": {
    source: "iana"
  },
  "application/xacml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xaml+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "xaml"
    ]
  },
  "application/xcap-att+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xav"
    ]
  },
  "application/xcap-caps+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xca"
    ]
  },
  "application/xcap-diff+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xdf"
    ]
  },
  "application/xcap-el+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xel"
    ]
  },
  "application/xcap-error+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xcap-ns+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xns"
    ]
  },
  "application/xcon-conference-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xcon-conference-info-diff+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xenc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xenc"
    ]
  },
  "application/xhtml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xhtml",
      "xht"
    ]
  },
  "application/xhtml-voice+xml": {
    source: "apache",
    compressible: !0
  },
  "application/xliff+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xlf"
    ]
  },
  "application/xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xml",
      "xsl",
      "xsd",
      "rng"
    ]
  },
  "application/xml-dtd": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dtd"
    ]
  },
  "application/xml-external-parsed-entity": {
    source: "iana"
  },
  "application/xml-patch+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xmpp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xop+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xop"
    ]
  },
  "application/xproc+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "xpl"
    ]
  },
  "application/xslt+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xsl",
      "xslt"
    ]
  },
  "application/xspf+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "xspf"
    ]
  },
  "application/xv+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mxml",
      "xhvml",
      "xvml",
      "xvm"
    ]
  },
  "application/yang": {
    source: "iana",
    extensions: [
      "yang"
    ]
  },
  "application/yang-data+json": {
    source: "iana",
    compressible: !0
  },
  "application/yang-data+xml": {
    source: "iana",
    compressible: !0
  },
  "application/yang-patch+json": {
    source: "iana",
    compressible: !0
  },
  "application/yang-patch+xml": {
    source: "iana",
    compressible: !0
  },
  "application/yin+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "yin"
    ]
  },
  "application/zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "zip"
    ]
  },
  "application/zlib": {
    source: "iana"
  },
  "application/zstd": {
    source: "iana"
  },
  "audio/1d-interleaved-parityfec": {
    source: "iana"
  },
  "audio/32kadpcm": {
    source: "iana"
  },
  "audio/3gpp": {
    source: "iana",
    compressible: !1,
    extensions: [
      "3gpp"
    ]
  },
  "audio/3gpp2": {
    source: "iana"
  },
  "audio/aac": {
    source: "iana"
  },
  "audio/ac3": {
    source: "iana"
  },
  "audio/adpcm": {
    source: "apache",
    extensions: [
      "adp"
    ]
  },
  "audio/amr": {
    source: "iana",
    extensions: [
      "amr"
    ]
  },
  "audio/amr-wb": {
    source: "iana"
  },
  "audio/amr-wb+": {
    source: "iana"
  },
  "audio/aptx": {
    source: "iana"
  },
  "audio/asc": {
    source: "iana"
  },
  "audio/atrac-advanced-lossless": {
    source: "iana"
  },
  "audio/atrac-x": {
    source: "iana"
  },
  "audio/atrac3": {
    source: "iana"
  },
  "audio/basic": {
    source: "iana",
    compressible: !1,
    extensions: [
      "au",
      "snd"
    ]
  },
  "audio/bv16": {
    source: "iana"
  },
  "audio/bv32": {
    source: "iana"
  },
  "audio/clearmode": {
    source: "iana"
  },
  "audio/cn": {
    source: "iana"
  },
  "audio/dat12": {
    source: "iana"
  },
  "audio/dls": {
    source: "iana"
  },
  "audio/dsr-es201108": {
    source: "iana"
  },
  "audio/dsr-es202050": {
    source: "iana"
  },
  "audio/dsr-es202211": {
    source: "iana"
  },
  "audio/dsr-es202212": {
    source: "iana"
  },
  "audio/dv": {
    source: "iana"
  },
  "audio/dvi4": {
    source: "iana"
  },
  "audio/eac3": {
    source: "iana"
  },
  "audio/encaprtp": {
    source: "iana"
  },
  "audio/evrc": {
    source: "iana"
  },
  "audio/evrc-qcp": {
    source: "iana"
  },
  "audio/evrc0": {
    source: "iana"
  },
  "audio/evrc1": {
    source: "iana"
  },
  "audio/evrcb": {
    source: "iana"
  },
  "audio/evrcb0": {
    source: "iana"
  },
  "audio/evrcb1": {
    source: "iana"
  },
  "audio/evrcnw": {
    source: "iana"
  },
  "audio/evrcnw0": {
    source: "iana"
  },
  "audio/evrcnw1": {
    source: "iana"
  },
  "audio/evrcwb": {
    source: "iana"
  },
  "audio/evrcwb0": {
    source: "iana"
  },
  "audio/evrcwb1": {
    source: "iana"
  },
  "audio/evs": {
    source: "iana"
  },
  "audio/flexfec": {
    source: "iana"
  },
  "audio/fwdred": {
    source: "iana"
  },
  "audio/g711-0": {
    source: "iana"
  },
  "audio/g719": {
    source: "iana"
  },
  "audio/g722": {
    source: "iana"
  },
  "audio/g7221": {
    source: "iana"
  },
  "audio/g723": {
    source: "iana"
  },
  "audio/g726-16": {
    source: "iana"
  },
  "audio/g726-24": {
    source: "iana"
  },
  "audio/g726-32": {
    source: "iana"
  },
  "audio/g726-40": {
    source: "iana"
  },
  "audio/g728": {
    source: "iana"
  },
  "audio/g729": {
    source: "iana"
  },
  "audio/g7291": {
    source: "iana"
  },
  "audio/g729d": {
    source: "iana"
  },
  "audio/g729e": {
    source: "iana"
  },
  "audio/gsm": {
    source: "iana"
  },
  "audio/gsm-efr": {
    source: "iana"
  },
  "audio/gsm-hr-08": {
    source: "iana"
  },
  "audio/ilbc": {
    source: "iana"
  },
  "audio/ip-mr_v2.5": {
    source: "iana"
  },
  "audio/isac": {
    source: "apache"
  },
  "audio/l16": {
    source: "iana"
  },
  "audio/l20": {
    source: "iana"
  },
  "audio/l24": {
    source: "iana",
    compressible: !1
  },
  "audio/l8": {
    source: "iana"
  },
  "audio/lpc": {
    source: "iana"
  },
  "audio/melp": {
    source: "iana"
  },
  "audio/melp1200": {
    source: "iana"
  },
  "audio/melp2400": {
    source: "iana"
  },
  "audio/melp600": {
    source: "iana"
  },
  "audio/mhas": {
    source: "iana"
  },
  "audio/midi": {
    source: "apache",
    extensions: [
      "mid",
      "midi",
      "kar",
      "rmi"
    ]
  },
  "audio/mobile-xmf": {
    source: "iana",
    extensions: [
      "mxmf"
    ]
  },
  "audio/mp3": {
    compressible: !1,
    extensions: [
      "mp3"
    ]
  },
  "audio/mp4": {
    source: "iana",
    compressible: !1,
    extensions: [
      "m4a",
      "mp4a"
    ]
  },
  "audio/mp4a-latm": {
    source: "iana"
  },
  "audio/mpa": {
    source: "iana"
  },
  "audio/mpa-robust": {
    source: "iana"
  },
  "audio/mpeg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "mpga",
      "mp2",
      "mp2a",
      "mp3",
      "m2a",
      "m3a"
    ]
  },
  "audio/mpeg4-generic": {
    source: "iana"
  },
  "audio/musepack": {
    source: "apache"
  },
  "audio/ogg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "oga",
      "ogg",
      "spx",
      "opus"
    ]
  },
  "audio/opus": {
    source: "iana"
  },
  "audio/parityfec": {
    source: "iana"
  },
  "audio/pcma": {
    source: "iana"
  },
  "audio/pcma-wb": {
    source: "iana"
  },
  "audio/pcmu": {
    source: "iana"
  },
  "audio/pcmu-wb": {
    source: "iana"
  },
  "audio/prs.sid": {
    source: "iana"
  },
  "audio/qcelp": {
    source: "iana"
  },
  "audio/raptorfec": {
    source: "iana"
  },
  "audio/red": {
    source: "iana"
  },
  "audio/rtp-enc-aescm128": {
    source: "iana"
  },
  "audio/rtp-midi": {
    source: "iana"
  },
  "audio/rtploopback": {
    source: "iana"
  },
  "audio/rtx": {
    source: "iana"
  },
  "audio/s3m": {
    source: "apache",
    extensions: [
      "s3m"
    ]
  },
  "audio/scip": {
    source: "iana"
  },
  "audio/silk": {
    source: "apache",
    extensions: [
      "sil"
    ]
  },
  "audio/smv": {
    source: "iana"
  },
  "audio/smv-qcp": {
    source: "iana"
  },
  "audio/smv0": {
    source: "iana"
  },
  "audio/sofa": {
    source: "iana"
  },
  "audio/sp-midi": {
    source: "iana"
  },
  "audio/speex": {
    source: "iana"
  },
  "audio/t140c": {
    source: "iana"
  },
  "audio/t38": {
    source: "iana"
  },
  "audio/telephone-event": {
    source: "iana"
  },
  "audio/tetra_acelp": {
    source: "iana"
  },
  "audio/tetra_acelp_bb": {
    source: "iana"
  },
  "audio/tone": {
    source: "iana"
  },
  "audio/tsvcis": {
    source: "iana"
  },
  "audio/uemclip": {
    source: "iana"
  },
  "audio/ulpfec": {
    source: "iana"
  },
  "audio/usac": {
    source: "iana"
  },
  "audio/vdvi": {
    source: "iana"
  },
  "audio/vmr-wb": {
    source: "iana"
  },
  "audio/vnd.3gpp.iufp": {
    source: "iana"
  },
  "audio/vnd.4sb": {
    source: "iana"
  },
  "audio/vnd.audiokoz": {
    source: "iana"
  },
  "audio/vnd.celp": {
    source: "iana"
  },
  "audio/vnd.cisco.nse": {
    source: "iana"
  },
  "audio/vnd.cmles.radio-events": {
    source: "iana"
  },
  "audio/vnd.cns.anp1": {
    source: "iana"
  },
  "audio/vnd.cns.inf1": {
    source: "iana"
  },
  "audio/vnd.dece.audio": {
    source: "iana",
    extensions: [
      "uva",
      "uvva"
    ]
  },
  "audio/vnd.digital-winds": {
    source: "iana",
    extensions: [
      "eol"
    ]
  },
  "audio/vnd.dlna.adts": {
    source: "iana"
  },
  "audio/vnd.dolby.heaac.1": {
    source: "iana"
  },
  "audio/vnd.dolby.heaac.2": {
    source: "iana"
  },
  "audio/vnd.dolby.mlp": {
    source: "iana"
  },
  "audio/vnd.dolby.mps": {
    source: "iana"
  },
  "audio/vnd.dolby.pl2": {
    source: "iana"
  },
  "audio/vnd.dolby.pl2x": {
    source: "iana"
  },
  "audio/vnd.dolby.pl2z": {
    source: "iana"
  },
  "audio/vnd.dolby.pulse.1": {
    source: "iana"
  },
  "audio/vnd.dra": {
    source: "iana",
    extensions: [
      "dra"
    ]
  },
  "audio/vnd.dts": {
    source: "iana",
    extensions: [
      "dts"
    ]
  },
  "audio/vnd.dts.hd": {
    source: "iana",
    extensions: [
      "dtshd"
    ]
  },
  "audio/vnd.dts.uhd": {
    source: "iana"
  },
  "audio/vnd.dvb.file": {
    source: "iana"
  },
  "audio/vnd.everad.plj": {
    source: "iana"
  },
  "audio/vnd.hns.audio": {
    source: "iana"
  },
  "audio/vnd.lucent.voice": {
    source: "iana",
    extensions: [
      "lvp"
    ]
  },
  "audio/vnd.ms-playready.media.pya": {
    source: "iana",
    extensions: [
      "pya"
    ]
  },
  "audio/vnd.nokia.mobile-xmf": {
    source: "iana"
  },
  "audio/vnd.nortel.vbk": {
    source: "iana"
  },
  "audio/vnd.nuera.ecelp4800": {
    source: "iana",
    extensions: [
      "ecelp4800"
    ]
  },
  "audio/vnd.nuera.ecelp7470": {
    source: "iana",
    extensions: [
      "ecelp7470"
    ]
  },
  "audio/vnd.nuera.ecelp9600": {
    source: "iana",
    extensions: [
      "ecelp9600"
    ]
  },
  "audio/vnd.octel.sbc": {
    source: "iana"
  },
  "audio/vnd.presonus.multitrack": {
    source: "iana"
  },
  "audio/vnd.qcelp": {
    source: "iana"
  },
  "audio/vnd.rhetorex.32kadpcm": {
    source: "iana"
  },
  "audio/vnd.rip": {
    source: "iana",
    extensions: [
      "rip"
    ]
  },
  "audio/vnd.rn-realaudio": {
    compressible: !1
  },
  "audio/vnd.sealedmedia.softseal.mpeg": {
    source: "iana"
  },
  "audio/vnd.vmx.cvsd": {
    source: "iana"
  },
  "audio/vnd.wave": {
    compressible: !1
  },
  "audio/vorbis": {
    source: "iana",
    compressible: !1
  },
  "audio/vorbis-config": {
    source: "iana"
  },
  "audio/wav": {
    compressible: !1,
    extensions: [
      "wav"
    ]
  },
  "audio/wave": {
    compressible: !1,
    extensions: [
      "wav"
    ]
  },
  "audio/webm": {
    source: "apache",
    compressible: !1,
    extensions: [
      "weba"
    ]
  },
  "audio/x-aac": {
    source: "apache",
    compressible: !1,
    extensions: [
      "aac"
    ]
  },
  "audio/x-aiff": {
    source: "apache",
    extensions: [
      "aif",
      "aiff",
      "aifc"
    ]
  },
  "audio/x-caf": {
    source: "apache",
    compressible: !1,
    extensions: [
      "caf"
    ]
  },
  "audio/x-flac": {
    source: "apache",
    extensions: [
      "flac"
    ]
  },
  "audio/x-m4a": {
    source: "nginx",
    extensions: [
      "m4a"
    ]
  },
  "audio/x-matroska": {
    source: "apache",
    extensions: [
      "mka"
    ]
  },
  "audio/x-mpegurl": {
    source: "apache",
    extensions: [
      "m3u"
    ]
  },
  "audio/x-ms-wax": {
    source: "apache",
    extensions: [
      "wax"
    ]
  },
  "audio/x-ms-wma": {
    source: "apache",
    extensions: [
      "wma"
    ]
  },
  "audio/x-pn-realaudio": {
    source: "apache",
    extensions: [
      "ram",
      "ra"
    ]
  },
  "audio/x-pn-realaudio-plugin": {
    source: "apache",
    extensions: [
      "rmp"
    ]
  },
  "audio/x-realaudio": {
    source: "nginx",
    extensions: [
      "ra"
    ]
  },
  "audio/x-tta": {
    source: "apache"
  },
  "audio/x-wav": {
    source: "apache",
    extensions: [
      "wav"
    ]
  },
  "audio/xm": {
    source: "apache",
    extensions: [
      "xm"
    ]
  },
  "chemical/x-cdx": {
    source: "apache",
    extensions: [
      "cdx"
    ]
  },
  "chemical/x-cif": {
    source: "apache",
    extensions: [
      "cif"
    ]
  },
  "chemical/x-cmdf": {
    source: "apache",
    extensions: [
      "cmdf"
    ]
  },
  "chemical/x-cml": {
    source: "apache",
    extensions: [
      "cml"
    ]
  },
  "chemical/x-csml": {
    source: "apache",
    extensions: [
      "csml"
    ]
  },
  "chemical/x-pdb": {
    source: "apache"
  },
  "chemical/x-xyz": {
    source: "apache",
    extensions: [
      "xyz"
    ]
  },
  "font/collection": {
    source: "iana",
    extensions: [
      "ttc"
    ]
  },
  "font/otf": {
    source: "iana",
    compressible: !0,
    extensions: [
      "otf"
    ]
  },
  "font/sfnt": {
    source: "iana"
  },
  "font/ttf": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ttf"
    ]
  },
  "font/woff": {
    source: "iana",
    extensions: [
      "woff"
    ]
  },
  "font/woff2": {
    source: "iana",
    extensions: [
      "woff2"
    ]
  },
  "image/aces": {
    source: "iana",
    extensions: [
      "exr"
    ]
  },
  "image/apng": {
    compressible: !1,
    extensions: [
      "apng"
    ]
  },
  "image/avci": {
    source: "iana",
    extensions: [
      "avci"
    ]
  },
  "image/avcs": {
    source: "iana",
    extensions: [
      "avcs"
    ]
  },
  "image/avif": {
    source: "iana",
    compressible: !1,
    extensions: [
      "avif"
    ]
  },
  "image/bmp": {
    source: "iana",
    compressible: !0,
    extensions: [
      "bmp"
    ]
  },
  "image/cgm": {
    source: "iana",
    extensions: [
      "cgm"
    ]
  },
  "image/dicom-rle": {
    source: "iana",
    extensions: [
      "drle"
    ]
  },
  "image/emf": {
    source: "iana",
    extensions: [
      "emf"
    ]
  },
  "image/fits": {
    source: "iana",
    extensions: [
      "fits"
    ]
  },
  "image/g3fax": {
    source: "iana",
    extensions: [
      "g3"
    ]
  },
  "image/gif": {
    source: "iana",
    compressible: !1,
    extensions: [
      "gif"
    ]
  },
  "image/heic": {
    source: "iana",
    extensions: [
      "heic"
    ]
  },
  "image/heic-sequence": {
    source: "iana",
    extensions: [
      "heics"
    ]
  },
  "image/heif": {
    source: "iana",
    extensions: [
      "heif"
    ]
  },
  "image/heif-sequence": {
    source: "iana",
    extensions: [
      "heifs"
    ]
  },
  "image/hej2k": {
    source: "iana",
    extensions: [
      "hej2"
    ]
  },
  "image/hsj2": {
    source: "iana",
    extensions: [
      "hsj2"
    ]
  },
  "image/ief": {
    source: "iana",
    extensions: [
      "ief"
    ]
  },
  "image/jls": {
    source: "iana",
    extensions: [
      "jls"
    ]
  },
  "image/jp2": {
    source: "iana",
    compressible: !1,
    extensions: [
      "jp2",
      "jpg2"
    ]
  },
  "image/jpeg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "jpeg",
      "jpg",
      "jpe"
    ]
  },
  "image/jph": {
    source: "iana",
    extensions: [
      "jph"
    ]
  },
  "image/jphc": {
    source: "iana",
    extensions: [
      "jhc"
    ]
  },
  "image/jpm": {
    source: "iana",
    compressible: !1,
    extensions: [
      "jpm"
    ]
  },
  "image/jpx": {
    source: "iana",
    compressible: !1,
    extensions: [
      "jpx",
      "jpf"
    ]
  },
  "image/jxr": {
    source: "iana",
    extensions: [
      "jxr"
    ]
  },
  "image/jxra": {
    source: "iana",
    extensions: [
      "jxra"
    ]
  },
  "image/jxrs": {
    source: "iana",
    extensions: [
      "jxrs"
    ]
  },
  "image/jxs": {
    source: "iana",
    extensions: [
      "jxs"
    ]
  },
  "image/jxsc": {
    source: "iana",
    extensions: [
      "jxsc"
    ]
  },
  "image/jxsi": {
    source: "iana",
    extensions: [
      "jxsi"
    ]
  },
  "image/jxss": {
    source: "iana",
    extensions: [
      "jxss"
    ]
  },
  "image/ktx": {
    source: "iana",
    extensions: [
      "ktx"
    ]
  },
  "image/ktx2": {
    source: "iana",
    extensions: [
      "ktx2"
    ]
  },
  "image/naplps": {
    source: "iana"
  },
  "image/pjpeg": {
    compressible: !1
  },
  "image/png": {
    source: "iana",
    compressible: !1,
    extensions: [
      "png"
    ]
  },
  "image/prs.btif": {
    source: "iana",
    extensions: [
      "btif"
    ]
  },
  "image/prs.pti": {
    source: "iana",
    extensions: [
      "pti"
    ]
  },
  "image/pwg-raster": {
    source: "iana"
  },
  "image/sgi": {
    source: "apache",
    extensions: [
      "sgi"
    ]
  },
  "image/svg+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "svg",
      "svgz"
    ]
  },
  "image/t38": {
    source: "iana",
    extensions: [
      "t38"
    ]
  },
  "image/tiff": {
    source: "iana",
    compressible: !1,
    extensions: [
      "tif",
      "tiff"
    ]
  },
  "image/tiff-fx": {
    source: "iana",
    extensions: [
      "tfx"
    ]
  },
  "image/vnd.adobe.photoshop": {
    source: "iana",
    compressible: !0,
    extensions: [
      "psd"
    ]
  },
  "image/vnd.airzip.accelerator.azv": {
    source: "iana",
    extensions: [
      "azv"
    ]
  },
  "image/vnd.cns.inf2": {
    source: "iana"
  },
  "image/vnd.dece.graphic": {
    source: "iana",
    extensions: [
      "uvi",
      "uvvi",
      "uvg",
      "uvvg"
    ]
  },
  "image/vnd.djvu": {
    source: "iana",
    extensions: [
      "djvu",
      "djv"
    ]
  },
  "image/vnd.dvb.subtitle": {
    source: "iana",
    extensions: [
      "sub"
    ]
  },
  "image/vnd.dwg": {
    source: "iana",
    extensions: [
      "dwg"
    ]
  },
  "image/vnd.dxf": {
    source: "iana",
    extensions: [
      "dxf"
    ]
  },
  "image/vnd.fastbidsheet": {
    source: "iana",
    extensions: [
      "fbs"
    ]
  },
  "image/vnd.fpx": {
    source: "iana",
    extensions: [
      "fpx"
    ]
  },
  "image/vnd.fst": {
    source: "iana",
    extensions: [
      "fst"
    ]
  },
  "image/vnd.fujixerox.edmics-mmr": {
    source: "iana",
    extensions: [
      "mmr"
    ]
  },
  "image/vnd.fujixerox.edmics-rlc": {
    source: "iana",
    extensions: [
      "rlc"
    ]
  },
  "image/vnd.globalgraphics.pgb": {
    source: "iana"
  },
  "image/vnd.microsoft.icon": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ico"
    ]
  },
  "image/vnd.mix": {
    source: "iana"
  },
  "image/vnd.mozilla.apng": {
    source: "iana"
  },
  "image/vnd.ms-dds": {
    compressible: !0,
    extensions: [
      "dds"
    ]
  },
  "image/vnd.ms-modi": {
    source: "iana",
    extensions: [
      "mdi"
    ]
  },
  "image/vnd.ms-photo": {
    source: "apache",
    extensions: [
      "wdp"
    ]
  },
  "image/vnd.net-fpx": {
    source: "iana",
    extensions: [
      "npx"
    ]
  },
  "image/vnd.pco.b16": {
    source: "iana",
    extensions: [
      "b16"
    ]
  },
  "image/vnd.radiance": {
    source: "iana"
  },
  "image/vnd.sealed.png": {
    source: "iana"
  },
  "image/vnd.sealedmedia.softseal.gif": {
    source: "iana"
  },
  "image/vnd.sealedmedia.softseal.jpg": {
    source: "iana"
  },
  "image/vnd.svf": {
    source: "iana"
  },
  "image/vnd.tencent.tap": {
    source: "iana",
    extensions: [
      "tap"
    ]
  },
  "image/vnd.valve.source.texture": {
    source: "iana",
    extensions: [
      "vtf"
    ]
  },
  "image/vnd.wap.wbmp": {
    source: "iana",
    extensions: [
      "wbmp"
    ]
  },
  "image/vnd.xiff": {
    source: "iana",
    extensions: [
      "xif"
    ]
  },
  "image/vnd.zbrush.pcx": {
    source: "iana",
    extensions: [
      "pcx"
    ]
  },
  "image/webp": {
    source: "apache",
    extensions: [
      "webp"
    ]
  },
  "image/wmf": {
    source: "iana",
    extensions: [
      "wmf"
    ]
  },
  "image/x-3ds": {
    source: "apache",
    extensions: [
      "3ds"
    ]
  },
  "image/x-cmu-raster": {
    source: "apache",
    extensions: [
      "ras"
    ]
  },
  "image/x-cmx": {
    source: "apache",
    extensions: [
      "cmx"
    ]
  },
  "image/x-freehand": {
    source: "apache",
    extensions: [
      "fh",
      "fhc",
      "fh4",
      "fh5",
      "fh7"
    ]
  },
  "image/x-icon": {
    source: "apache",
    compressible: !0,
    extensions: [
      "ico"
    ]
  },
  "image/x-jng": {
    source: "nginx",
    extensions: [
      "jng"
    ]
  },
  "image/x-mrsid-image": {
    source: "apache",
    extensions: [
      "sid"
    ]
  },
  "image/x-ms-bmp": {
    source: "nginx",
    compressible: !0,
    extensions: [
      "bmp"
    ]
  },
  "image/x-pcx": {
    source: "apache",
    extensions: [
      "pcx"
    ]
  },
  "image/x-pict": {
    source: "apache",
    extensions: [
      "pic",
      "pct"
    ]
  },
  "image/x-portable-anymap": {
    source: "apache",
    extensions: [
      "pnm"
    ]
  },
  "image/x-portable-bitmap": {
    source: "apache",
    extensions: [
      "pbm"
    ]
  },
  "image/x-portable-graymap": {
    source: "apache",
    extensions: [
      "pgm"
    ]
  },
  "image/x-portable-pixmap": {
    source: "apache",
    extensions: [
      "ppm"
    ]
  },
  "image/x-rgb": {
    source: "apache",
    extensions: [
      "rgb"
    ]
  },
  "image/x-tga": {
    source: "apache",
    extensions: [
      "tga"
    ]
  },
  "image/x-xbitmap": {
    source: "apache",
    extensions: [
      "xbm"
    ]
  },
  "image/x-xcf": {
    compressible: !1
  },
  "image/x-xpixmap": {
    source: "apache",
    extensions: [
      "xpm"
    ]
  },
  "image/x-xwindowdump": {
    source: "apache",
    extensions: [
      "xwd"
    ]
  },
  "message/cpim": {
    source: "iana"
  },
  "message/delivery-status": {
    source: "iana"
  },
  "message/disposition-notification": {
    source: "iana",
    extensions: [
      "disposition-notification"
    ]
  },
  "message/external-body": {
    source: "iana"
  },
  "message/feedback-report": {
    source: "iana"
  },
  "message/global": {
    source: "iana",
    extensions: [
      "u8msg"
    ]
  },
  "message/global-delivery-status": {
    source: "iana",
    extensions: [
      "u8dsn"
    ]
  },
  "message/global-disposition-notification": {
    source: "iana",
    extensions: [
      "u8mdn"
    ]
  },
  "message/global-headers": {
    source: "iana",
    extensions: [
      "u8hdr"
    ]
  },
  "message/http": {
    source: "iana",
    compressible: !1
  },
  "message/imdn+xml": {
    source: "iana",
    compressible: !0
  },
  "message/news": {
    source: "iana"
  },
  "message/partial": {
    source: "iana",
    compressible: !1
  },
  "message/rfc822": {
    source: "iana",
    compressible: !0,
    extensions: [
      "eml",
      "mime"
    ]
  },
  "message/s-http": {
    source: "iana"
  },
  "message/sip": {
    source: "iana"
  },
  "message/sipfrag": {
    source: "iana"
  },
  "message/tracking-status": {
    source: "iana"
  },
  "message/vnd.si.simp": {
    source: "iana"
  },
  "message/vnd.wfa.wsc": {
    source: "iana",
    extensions: [
      "wsc"
    ]
  },
  "model/3mf": {
    source: "iana",
    extensions: [
      "3mf"
    ]
  },
  "model/e57": {
    source: "iana"
  },
  "model/gltf+json": {
    source: "iana",
    compressible: !0,
    extensions: [
      "gltf"
    ]
  },
  "model/gltf-binary": {
    source: "iana",
    compressible: !0,
    extensions: [
      "glb"
    ]
  },
  "model/iges": {
    source: "iana",
    compressible: !1,
    extensions: [
      "igs",
      "iges"
    ]
  },
  "model/mesh": {
    source: "iana",
    compressible: !1,
    extensions: [
      "msh",
      "mesh",
      "silo"
    ]
  },
  "model/mtl": {
    source: "iana",
    extensions: [
      "mtl"
    ]
  },
  "model/obj": {
    source: "iana",
    extensions: [
      "obj"
    ]
  },
  "model/step": {
    source: "iana"
  },
  "model/step+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "stpx"
    ]
  },
  "model/step+zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "stpz"
    ]
  },
  "model/step-xml+zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "stpxz"
    ]
  },
  "model/stl": {
    source: "iana",
    extensions: [
      "stl"
    ]
  },
  "model/vnd.collada+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dae"
    ]
  },
  "model/vnd.dwf": {
    source: "iana",
    extensions: [
      "dwf"
    ]
  },
  "model/vnd.flatland.3dml": {
    source: "iana"
  },
  "model/vnd.gdl": {
    source: "iana",
    extensions: [
      "gdl"
    ]
  },
  "model/vnd.gs-gdl": {
    source: "apache"
  },
  "model/vnd.gs.gdl": {
    source: "iana"
  },
  "model/vnd.gtw": {
    source: "iana",
    extensions: [
      "gtw"
    ]
  },
  "model/vnd.moml+xml": {
    source: "iana",
    compressible: !0
  },
  "model/vnd.mts": {
    source: "iana",
    extensions: [
      "mts"
    ]
  },
  "model/vnd.opengex": {
    source: "iana",
    extensions: [
      "ogex"
    ]
  },
  "model/vnd.parasolid.transmit.binary": {
    source: "iana",
    extensions: [
      "x_b"
    ]
  },
  "model/vnd.parasolid.transmit.text": {
    source: "iana",
    extensions: [
      "x_t"
    ]
  },
  "model/vnd.pytha.pyox": {
    source: "iana"
  },
  "model/vnd.rosette.annotated-data-model": {
    source: "iana"
  },
  "model/vnd.sap.vds": {
    source: "iana",
    extensions: [
      "vds"
    ]
  },
  "model/vnd.usdz+zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "usdz"
    ]
  },
  "model/vnd.valve.source.compiled-map": {
    source: "iana",
    extensions: [
      "bsp"
    ]
  },
  "model/vnd.vtu": {
    source: "iana",
    extensions: [
      "vtu"
    ]
  },
  "model/vrml": {
    source: "iana",
    compressible: !1,
    extensions: [
      "wrl",
      "vrml"
    ]
  },
  "model/x3d+binary": {
    source: "apache",
    compressible: !1,
    extensions: [
      "x3db",
      "x3dbz"
    ]
  },
  "model/x3d+fastinfoset": {
    source: "iana",
    extensions: [
      "x3db"
    ]
  },
  "model/x3d+vrml": {
    source: "apache",
    compressible: !1,
    extensions: [
      "x3dv",
      "x3dvz"
    ]
  },
  "model/x3d+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "x3d",
      "x3dz"
    ]
  },
  "model/x3d-vrml": {
    source: "iana",
    extensions: [
      "x3dv"
    ]
  },
  "multipart/alternative": {
    source: "iana",
    compressible: !1
  },
  "multipart/appledouble": {
    source: "iana"
  },
  "multipart/byteranges": {
    source: "iana"
  },
  "multipart/digest": {
    source: "iana"
  },
  "multipart/encrypted": {
    source: "iana",
    compressible: !1
  },
  "multipart/form-data": {
    source: "iana",
    compressible: !1
  },
  "multipart/header-set": {
    source: "iana"
  },
  "multipart/mixed": {
    source: "iana"
  },
  "multipart/multilingual": {
    source: "iana"
  },
  "multipart/parallel": {
    source: "iana"
  },
  "multipart/related": {
    source: "iana",
    compressible: !1
  },
  "multipart/report": {
    source: "iana"
  },
  "multipart/signed": {
    source: "iana",
    compressible: !1
  },
  "multipart/vnd.bint.med-plus": {
    source: "iana"
  },
  "multipart/voice-message": {
    source: "iana"
  },
  "multipart/x-mixed-replace": {
    source: "iana"
  },
  "text/1d-interleaved-parityfec": {
    source: "iana"
  },
  "text/cache-manifest": {
    source: "iana",
    compressible: !0,
    extensions: [
      "appcache",
      "manifest"
    ]
  },
  "text/calendar": {
    source: "iana",
    extensions: [
      "ics",
      "ifb"
    ]
  },
  "text/calender": {
    compressible: !0
  },
  "text/cmd": {
    compressible: !0
  },
  "text/coffeescript": {
    extensions: [
      "coffee",
      "litcoffee"
    ]
  },
  "text/cql": {
    source: "iana"
  },
  "text/cql-expression": {
    source: "iana"
  },
  "text/cql-identifier": {
    source: "iana"
  },
  "text/css": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "css"
    ]
  },
  "text/csv": {
    source: "iana",
    compressible: !0,
    extensions: [
      "csv"
    ]
  },
  "text/csv-schema": {
    source: "iana"
  },
  "text/directory": {
    source: "iana"
  },
  "text/dns": {
    source: "iana"
  },
  "text/ecmascript": {
    source: "iana"
  },
  "text/encaprtp": {
    source: "iana"
  },
  "text/enriched": {
    source: "iana"
  },
  "text/fhirpath": {
    source: "iana"
  },
  "text/flexfec": {
    source: "iana"
  },
  "text/fwdred": {
    source: "iana"
  },
  "text/gff3": {
    source: "iana"
  },
  "text/grammar-ref-list": {
    source: "iana"
  },
  "text/html": {
    source: "iana",
    compressible: !0,
    extensions: [
      "html",
      "htm",
      "shtml"
    ]
  },
  "text/jade": {
    extensions: [
      "jade"
    ]
  },
  "text/javascript": {
    source: "iana",
    compressible: !0
  },
  "text/jcr-cnd": {
    source: "iana"
  },
  "text/jsx": {
    compressible: !0,
    extensions: [
      "jsx"
    ]
  },
  "text/less": {
    compressible: !0,
    extensions: [
      "less"
    ]
  },
  "text/markdown": {
    source: "iana",
    compressible: !0,
    extensions: [
      "markdown",
      "md"
    ]
  },
  "text/mathml": {
    source: "nginx",
    extensions: [
      "mml"
    ]
  },
  "text/mdx": {
    compressible: !0,
    extensions: [
      "mdx"
    ]
  },
  "text/mizar": {
    source: "iana"
  },
  "text/n3": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "n3"
    ]
  },
  "text/parameters": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/parityfec": {
    source: "iana"
  },
  "text/plain": {
    source: "iana",
    compressible: !0,
    extensions: [
      "txt",
      "text",
      "conf",
      "def",
      "list",
      "log",
      "in",
      "ini"
    ]
  },
  "text/provenance-notation": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/prs.fallenstein.rst": {
    source: "iana"
  },
  "text/prs.lines.tag": {
    source: "iana",
    extensions: [
      "dsc"
    ]
  },
  "text/prs.prop.logic": {
    source: "iana"
  },
  "text/raptorfec": {
    source: "iana"
  },
  "text/red": {
    source: "iana"
  },
  "text/rfc822-headers": {
    source: "iana"
  },
  "text/richtext": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rtx"
    ]
  },
  "text/rtf": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rtf"
    ]
  },
  "text/rtp-enc-aescm128": {
    source: "iana"
  },
  "text/rtploopback": {
    source: "iana"
  },
  "text/rtx": {
    source: "iana"
  },
  "text/sgml": {
    source: "iana",
    extensions: [
      "sgml",
      "sgm"
    ]
  },
  "text/shaclc": {
    source: "iana"
  },
  "text/shex": {
    source: "iana",
    extensions: [
      "shex"
    ]
  },
  "text/slim": {
    extensions: [
      "slim",
      "slm"
    ]
  },
  "text/spdx": {
    source: "iana",
    extensions: [
      "spdx"
    ]
  },
  "text/strings": {
    source: "iana"
  },
  "text/stylus": {
    extensions: [
      "stylus",
      "styl"
    ]
  },
  "text/t140": {
    source: "iana"
  },
  "text/tab-separated-values": {
    source: "iana",
    compressible: !0,
    extensions: [
      "tsv"
    ]
  },
  "text/troff": {
    source: "iana",
    extensions: [
      "t",
      "tr",
      "roff",
      "man",
      "me",
      "ms"
    ]
  },
  "text/turtle": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "ttl"
    ]
  },
  "text/ulpfec": {
    source: "iana"
  },
  "text/uri-list": {
    source: "iana",
    compressible: !0,
    extensions: [
      "uri",
      "uris",
      "urls"
    ]
  },
  "text/vcard": {
    source: "iana",
    compressible: !0,
    extensions: [
      "vcard"
    ]
  },
  "text/vnd.a": {
    source: "iana"
  },
  "text/vnd.abc": {
    source: "iana"
  },
  "text/vnd.ascii-art": {
    source: "iana"
  },
  "text/vnd.curl": {
    source: "iana",
    extensions: [
      "curl"
    ]
  },
  "text/vnd.curl.dcurl": {
    source: "apache",
    extensions: [
      "dcurl"
    ]
  },
  "text/vnd.curl.mcurl": {
    source: "apache",
    extensions: [
      "mcurl"
    ]
  },
  "text/vnd.curl.scurl": {
    source: "apache",
    extensions: [
      "scurl"
    ]
  },
  "text/vnd.debian.copyright": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/vnd.dmclientscript": {
    source: "iana"
  },
  "text/vnd.dvb.subtitle": {
    source: "iana",
    extensions: [
      "sub"
    ]
  },
  "text/vnd.esmertec.theme-descriptor": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/vnd.familysearch.gedcom": {
    source: "iana",
    extensions: [
      "ged"
    ]
  },
  "text/vnd.ficlab.flt": {
    source: "iana"
  },
  "text/vnd.fly": {
    source: "iana",
    extensions: [
      "fly"
    ]
  },
  "text/vnd.fmi.flexstor": {
    source: "iana",
    extensions: [
      "flx"
    ]
  },
  "text/vnd.gml": {
    source: "iana"
  },
  "text/vnd.graphviz": {
    source: "iana",
    extensions: [
      "gv"
    ]
  },
  "text/vnd.hans": {
    source: "iana"
  },
  "text/vnd.hgl": {
    source: "iana"
  },
  "text/vnd.in3d.3dml": {
    source: "iana",
    extensions: [
      "3dml"
    ]
  },
  "text/vnd.in3d.spot": {
    source: "iana",
    extensions: [
      "spot"
    ]
  },
  "text/vnd.iptc.newsml": {
    source: "iana"
  },
  "text/vnd.iptc.nitf": {
    source: "iana"
  },
  "text/vnd.latex-z": {
    source: "iana"
  },
  "text/vnd.motorola.reflex": {
    source: "iana"
  },
  "text/vnd.ms-mediapackage": {
    source: "iana"
  },
  "text/vnd.net2phone.commcenter.command": {
    source: "iana"
  },
  "text/vnd.radisys.msml-basic-layout": {
    source: "iana"
  },
  "text/vnd.senx.warpscript": {
    source: "iana"
  },
  "text/vnd.si.uricatalogue": {
    source: "iana"
  },
  "text/vnd.sosi": {
    source: "iana"
  },
  "text/vnd.sun.j2me.app-descriptor": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "jad"
    ]
  },
  "text/vnd.trolltech.linguist": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/vnd.wap.si": {
    source: "iana"
  },
  "text/vnd.wap.sl": {
    source: "iana"
  },
  "text/vnd.wap.wml": {
    source: "iana",
    extensions: [
      "wml"
    ]
  },
  "text/vnd.wap.wmlscript": {
    source: "iana",
    extensions: [
      "wmls"
    ]
  },
  "text/vtt": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "vtt"
    ]
  },
  "text/x-asm": {
    source: "apache",
    extensions: [
      "s",
      "asm"
    ]
  },
  "text/x-c": {
    source: "apache",
    extensions: [
      "c",
      "cc",
      "cxx",
      "cpp",
      "h",
      "hh",
      "dic"
    ]
  },
  "text/x-component": {
    source: "nginx",
    extensions: [
      "htc"
    ]
  },
  "text/x-fortran": {
    source: "apache",
    extensions: [
      "f",
      "for",
      "f77",
      "f90"
    ]
  },
  "text/x-gwt-rpc": {
    compressible: !0
  },
  "text/x-handlebars-template": {
    extensions: [
      "hbs"
    ]
  },
  "text/x-java-source": {
    source: "apache",
    extensions: [
      "java"
    ]
  },
  "text/x-jquery-tmpl": {
    compressible: !0
  },
  "text/x-lua": {
    extensions: [
      "lua"
    ]
  },
  "text/x-markdown": {
    compressible: !0,
    extensions: [
      "mkd"
    ]
  },
  "text/x-nfo": {
    source: "apache",
    extensions: [
      "nfo"
    ]
  },
  "text/x-opml": {
    source: "apache",
    extensions: [
      "opml"
    ]
  },
  "text/x-org": {
    compressible: !0,
    extensions: [
      "org"
    ]
  },
  "text/x-pascal": {
    source: "apache",
    extensions: [
      "p",
      "pas"
    ]
  },
  "text/x-processing": {
    compressible: !0,
    extensions: [
      "pde"
    ]
  },
  "text/x-sass": {
    extensions: [
      "sass"
    ]
  },
  "text/x-scss": {
    extensions: [
      "scss"
    ]
  },
  "text/x-setext": {
    source: "apache",
    extensions: [
      "etx"
    ]
  },
  "text/x-sfv": {
    source: "apache",
    extensions: [
      "sfv"
    ]
  },
  "text/x-suse-ymp": {
    compressible: !0,
    extensions: [
      "ymp"
    ]
  },
  "text/x-uuencode": {
    source: "apache",
    extensions: [
      "uu"
    ]
  },
  "text/x-vcalendar": {
    source: "apache",
    extensions: [
      "vcs"
    ]
  },
  "text/x-vcard": {
    source: "apache",
    extensions: [
      "vcf"
    ]
  },
  "text/xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xml"
    ]
  },
  "text/xml-external-parsed-entity": {
    source: "iana"
  },
  "text/yaml": {
    compressible: !0,
    extensions: [
      "yaml",
      "yml"
    ]
  },
  "video/1d-interleaved-parityfec": {
    source: "iana"
  },
  "video/3gpp": {
    source: "iana",
    extensions: [
      "3gp",
      "3gpp"
    ]
  },
  "video/3gpp-tt": {
    source: "iana"
  },
  "video/3gpp2": {
    source: "iana",
    extensions: [
      "3g2"
    ]
  },
  "video/av1": {
    source: "iana"
  },
  "video/bmpeg": {
    source: "iana"
  },
  "video/bt656": {
    source: "iana"
  },
  "video/celb": {
    source: "iana"
  },
  "video/dv": {
    source: "iana"
  },
  "video/encaprtp": {
    source: "iana"
  },
  "video/ffv1": {
    source: "iana"
  },
  "video/flexfec": {
    source: "iana"
  },
  "video/h261": {
    source: "iana",
    extensions: [
      "h261"
    ]
  },
  "video/h263": {
    source: "iana",
    extensions: [
      "h263"
    ]
  },
  "video/h263-1998": {
    source: "iana"
  },
  "video/h263-2000": {
    source: "iana"
  },
  "video/h264": {
    source: "iana",
    extensions: [
      "h264"
    ]
  },
  "video/h264-rcdo": {
    source: "iana"
  },
  "video/h264-svc": {
    source: "iana"
  },
  "video/h265": {
    source: "iana"
  },
  "video/iso.segment": {
    source: "iana",
    extensions: [
      "m4s"
    ]
  },
  "video/jpeg": {
    source: "iana",
    extensions: [
      "jpgv"
    ]
  },
  "video/jpeg2000": {
    source: "iana"
  },
  "video/jpm": {
    source: "apache",
    extensions: [
      "jpm",
      "jpgm"
    ]
  },
  "video/jxsv": {
    source: "iana"
  },
  "video/mj2": {
    source: "iana",
    extensions: [
      "mj2",
      "mjp2"
    ]
  },
  "video/mp1s": {
    source: "iana"
  },
  "video/mp2p": {
    source: "iana"
  },
  "video/mp2t": {
    source: "iana",
    extensions: [
      "ts"
    ]
  },
  "video/mp4": {
    source: "iana",
    compressible: !1,
    extensions: [
      "mp4",
      "mp4v",
      "mpg4"
    ]
  },
  "video/mp4v-es": {
    source: "iana"
  },
  "video/mpeg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "mpeg",
      "mpg",
      "mpe",
      "m1v",
      "m2v"
    ]
  },
  "video/mpeg4-generic": {
    source: "iana"
  },
  "video/mpv": {
    source: "iana"
  },
  "video/nv": {
    source: "iana"
  },
  "video/ogg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "ogv"
    ]
  },
  "video/parityfec": {
    source: "iana"
  },
  "video/pointer": {
    source: "iana"
  },
  "video/quicktime": {
    source: "iana",
    compressible: !1,
    extensions: [
      "qt",
      "mov"
    ]
  },
  "video/raptorfec": {
    source: "iana"
  },
  "video/raw": {
    source: "iana"
  },
  "video/rtp-enc-aescm128": {
    source: "iana"
  },
  "video/rtploopback": {
    source: "iana"
  },
  "video/rtx": {
    source: "iana"
  },
  "video/scip": {
    source: "iana"
  },
  "video/smpte291": {
    source: "iana"
  },
  "video/smpte292m": {
    source: "iana"
  },
  "video/ulpfec": {
    source: "iana"
  },
  "video/vc1": {
    source: "iana"
  },
  "video/vc2": {
    source: "iana"
  },
  "video/vnd.cctv": {
    source: "iana"
  },
  "video/vnd.dece.hd": {
    source: "iana",
    extensions: [
      "uvh",
      "uvvh"
    ]
  },
  "video/vnd.dece.mobile": {
    source: "iana",
    extensions: [
      "uvm",
      "uvvm"
    ]
  },
  "video/vnd.dece.mp4": {
    source: "iana"
  },
  "video/vnd.dece.pd": {
    source: "iana",
    extensions: [
      "uvp",
      "uvvp"
    ]
  },
  "video/vnd.dece.sd": {
    source: "iana",
    extensions: [
      "uvs",
      "uvvs"
    ]
  },
  "video/vnd.dece.video": {
    source: "iana",
    extensions: [
      "uvv",
      "uvvv"
    ]
  },
  "video/vnd.directv.mpeg": {
    source: "iana"
  },
  "video/vnd.directv.mpeg-tts": {
    source: "iana"
  },
  "video/vnd.dlna.mpeg-tts": {
    source: "iana"
  },
  "video/vnd.dvb.file": {
    source: "iana",
    extensions: [
      "dvb"
    ]
  },
  "video/vnd.fvt": {
    source: "iana",
    extensions: [
      "fvt"
    ]
  },
  "video/vnd.hns.video": {
    source: "iana"
  },
  "video/vnd.iptvforum.1dparityfec-1010": {
    source: "iana"
  },
  "video/vnd.iptvforum.1dparityfec-2005": {
    source: "iana"
  },
  "video/vnd.iptvforum.2dparityfec-1010": {
    source: "iana"
  },
  "video/vnd.iptvforum.2dparityfec-2005": {
    source: "iana"
  },
  "video/vnd.iptvforum.ttsavc": {
    source: "iana"
  },
  "video/vnd.iptvforum.ttsmpeg2": {
    source: "iana"
  },
  "video/vnd.motorola.video": {
    source: "iana"
  },
  "video/vnd.motorola.videop": {
    source: "iana"
  },
  "video/vnd.mpegurl": {
    source: "iana",
    extensions: [
      "mxu",
      "m4u"
    ]
  },
  "video/vnd.ms-playready.media.pyv": {
    source: "iana",
    extensions: [
      "pyv"
    ]
  },
  "video/vnd.nokia.interleaved-multimedia": {
    source: "iana"
  },
  "video/vnd.nokia.mp4vr": {
    source: "iana"
  },
  "video/vnd.nokia.videovoip": {
    source: "iana"
  },
  "video/vnd.objectvideo": {
    source: "iana"
  },
  "video/vnd.radgamettools.bink": {
    source: "iana"
  },
  "video/vnd.radgamettools.smacker": {
    source: "iana"
  },
  "video/vnd.sealed.mpeg1": {
    source: "iana"
  },
  "video/vnd.sealed.mpeg4": {
    source: "iana"
  },
  "video/vnd.sealed.swf": {
    source: "iana"
  },
  "video/vnd.sealedmedia.softseal.mov": {
    source: "iana"
  },
  "video/vnd.uvvu.mp4": {
    source: "iana",
    extensions: [
      "uvu",
      "uvvu"
    ]
  },
  "video/vnd.vivo": {
    source: "iana",
    extensions: [
      "viv"
    ]
  },
  "video/vnd.youtube.yt": {
    source: "iana"
  },
  "video/vp8": {
    source: "iana"
  },
  "video/vp9": {
    source: "iana"
  },
  "video/webm": {
    source: "apache",
    compressible: !1,
    extensions: [
      "webm"
    ]
  },
  "video/x-f4v": {
    source: "apache",
    extensions: [
      "f4v"
    ]
  },
  "video/x-fli": {
    source: "apache",
    extensions: [
      "fli"
    ]
  },
  "video/x-flv": {
    source: "apache",
    compressible: !1,
    extensions: [
      "flv"
    ]
  },
  "video/x-m4v": {
    source: "apache",
    extensions: [
      "m4v"
    ]
  },
  "video/x-matroska": {
    source: "apache",
    compressible: !1,
    extensions: [
      "mkv",
      "mk3d",
      "mks"
    ]
  },
  "video/x-mng": {
    source: "apache",
    extensions: [
      "mng"
    ]
  },
  "video/x-ms-asf": {
    source: "apache",
    extensions: [
      "asf",
      "asx"
    ]
  },
  "video/x-ms-vob": {
    source: "apache",
    extensions: [
      "vob"
    ]
  },
  "video/x-ms-wm": {
    source: "apache",
    extensions: [
      "wm"
    ]
  },
  "video/x-ms-wmv": {
    source: "apache",
    compressible: !1,
    extensions: [
      "wmv"
    ]
  },
  "video/x-ms-wmx": {
    source: "apache",
    extensions: [
      "wmx"
    ]
  },
  "video/x-ms-wvx": {
    source: "apache",
    extensions: [
      "wvx"
    ]
  },
  "video/x-msvideo": {
    source: "apache",
    extensions: [
      "avi"
    ]
  },
  "video/x-sgi-movie": {
    source: "apache",
    extensions: [
      "movie"
    ]
  },
  "video/x-smv": {
    source: "apache",
    extensions: [
      "smv"
    ]
  },
  "x-conference/x-cooltalk": {
    source: "apache",
    extensions: [
      "ice"
    ]
  },
  "x-shader/x-fragment": {
    compressible: !0
  },
  "x-shader/x-vertex": {
    compressible: !0
  }
};
/*!
 * mime-db
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015-2022 Douglas Christopher Wilson
 * MIT Licensed
 */
var Bv = Uv;
/*!
 * mime-types
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */
(function(e) {
  var t = Bv, n = nt.extname, r = /^\s*([^;\s]*)(?:;|\s|$)/, i = /^text\//i;
  e.charset = s, e.charsets = { lookup: s }, e.contentType = a, e.extension = c, e.extensions = /* @__PURE__ */ Object.create(null), e.lookup = l, e.types = /* @__PURE__ */ Object.create(null), p(e.extensions, e.types);
  function s(u) {
    if (!u || typeof u != "string")
      return !1;
    var d = r.exec(u), f = d && t[d[1].toLowerCase()];
    return f && f.charset ? f.charset : d && i.test(d[1]) ? "UTF-8" : !1;
  }
  function a(u) {
    if (!u || typeof u != "string")
      return !1;
    var d = u.indexOf("/") === -1 ? e.lookup(u) : u;
    if (!d)
      return !1;
    if (d.indexOf("charset") === -1) {
      var f = e.charset(d);
      f && (d += "; charset=" + f.toLowerCase());
    }
    return d;
  }
  function c(u) {
    if (!u || typeof u != "string")
      return !1;
    var d = r.exec(u), f = d && e.extensions[d[1].toLowerCase()];
    return !f || !f.length ? !1 : f[0];
  }
  function l(u) {
    if (!u || typeof u != "string")
      return !1;
    var d = n("x." + u).toLowerCase().substr(1);
    return d && e.types[d] || !1;
  }
  function p(u, d) {
    var f = ["nginx", "apache", void 0, "iana"];
    Object.keys(t).forEach(function(v) {
      var g = t[v], b = g.extensions;
      if (!(!b || !b.length)) {
        u[v] = b;
        for (var x = 0; x < b.length; x++) {
          var I = b[x];
          if (d[I]) {
            var D = f.indexOf(t[d[I]].source), P = f.indexOf(g.source);
            if (d[I] !== "application/octet-stream" && (D > P || D === P && d[I].substr(0, 12) === "application/"))
              continue;
          }
          d[I] = v;
        }
      }
    });
  }
})(Dl);
var Mv = qv;
function qv(e) {
  var t = typeof setImmediate == "function" ? setImmediate : typeof process == "object" && typeof process.nextTick == "function" ? process.nextTick : null;
  t ? t(e) : setTimeout(e, 0);
}
var Ka = Mv, zl = Hv;
function Hv(e) {
  var t = !1;
  return Ka(function() {
    t = !0;
  }), function(r, i) {
    t ? e(r, i) : Ka(function() {
      e(r, i);
    });
  };
}
var Fl = Vv;
function Vv(e) {
  Object.keys(e.jobs).forEach(Zv.bind(e)), e.jobs = {};
}
function Zv(e) {
  typeof this.jobs[e] == "function" && this.jobs[e]();
}
var Xa = zl, Wv = Fl, Ul = Gv;
function Gv(e, t, n, r) {
  var i = n.keyedList ? n.keyedList[n.index] : n.index;
  n.jobs[i] = Jv(t, i, e[i], function(s, a) {
    i in n.jobs && (delete n.jobs[i], s ? Wv(n) : n.results[i] = a, r(s, n.results));
  });
}
function Jv(e, t, n, r) {
  var i;
  return e.length == 2 ? i = e(n, Xa(r)) : i = e(n, t, Xa(r)), i;
}
var Bl = Kv;
function Kv(e, t) {
  var n = !Array.isArray(e), r = {
    index: 0,
    keyedList: n || t ? Object.keys(e) : null,
    jobs: {},
    results: n ? {} : [],
    size: n ? Object.keys(e).length : e.length
  };
  return t && r.keyedList.sort(n ? t : function(i, s) {
    return t(e[i], e[s]);
  }), r;
}
var Xv = Fl, Yv = zl, Ml = Qv;
function Qv(e) {
  Object.keys(this.jobs).length && (this.index = this.size, Xv(this), Yv(e)(null, this.results));
}
var eb = Ul, tb = Bl, nb = Ml, rb = ib;
function ib(e, t, n) {
  for (var r = tb(e); r.index < (r.keyedList || e).length; )
    eb(e, t, r, function(i, s) {
      if (i) {
        n(i, s);
        return;
      }
      if (Object.keys(r.jobs).length === 0) {
        n(null, r.results);
        return;
      }
    }), r.index++;
  return nb.bind(r, n);
}
var Xr = { exports: {} }, Ya = Ul, sb = Bl, ab = Ml;
Xr.exports = ob;
Xr.exports.ascending = ql;
Xr.exports.descending = cb;
function ob(e, t, n, r) {
  var i = sb(e, n);
  return Ya(e, t, i, function s(a, c) {
    if (a) {
      r(a, c);
      return;
    }
    if (i.index++, i.index < (i.keyedList || e).length) {
      Ya(e, t, i, s);
      return;
    }
    r(null, i.results);
  }), ab.bind(i, r);
}
function ql(e, t) {
  return e < t ? -1 : e > t ? 1 : 0;
}
function cb(e, t) {
  return -1 * ql(e, t);
}
var Hl = Xr.exports, lb = Hl, ub = pb;
function pb(e, t, n) {
  return lb(e, t, null, n);
}
var db = {
  parallel: rb,
  serial: ub,
  serialOrdered: Hl
}, Vl = Object, fb = Error, mb = EvalError, hb = RangeError, gb = ReferenceError, vb = SyntaxError, di, Qa;
function Ls() {
  return Qa || (Qa = 1, di = TypeError), di;
}
var bb = URIError, xb = Math.abs, yb = Math.floor, wb = Math.max, Eb = Math.min, _b = Math.pow, Sb = Math.round, Ab = Number.isNaN || function(t) {
  return t !== t;
}, kb = Ab, Tb = function(t) {
  return kb(t) || t === 0 ? t : t < 0 ? -1 : 1;
}, Pb = Object.getOwnPropertyDescriptor, wr = Pb;
if (wr)
  try {
    wr([], "length");
  } catch {
    wr = null;
  }
var Zl = wr, Er = Object.defineProperty || !1;
if (Er)
  try {
    Er({}, "a", { value: 1 });
  } catch {
    Er = !1;
  }
var Rb = Er, fi, eo;
function Wl() {
  return eo || (eo = 1, fi = function() {
    if (typeof Symbol != "function" || typeof Object.getOwnPropertySymbols != "function")
      return !1;
    if (typeof Symbol.iterator == "symbol")
      return !0;
    var t = {}, n = Symbol("test"), r = Object(n);
    if (typeof n == "string" || Object.prototype.toString.call(n) !== "[object Symbol]" || Object.prototype.toString.call(r) !== "[object Symbol]")
      return !1;
    var i = 42;
    t[n] = i;
    for (var s in t)
      return !1;
    if (typeof Object.keys == "function" && Object.keys(t).length !== 0 || typeof Object.getOwnPropertyNames == "function" && Object.getOwnPropertyNames(t).length !== 0)
      return !1;
    var a = Object.getOwnPropertySymbols(t);
    if (a.length !== 1 || a[0] !== n || !Object.prototype.propertyIsEnumerable.call(t, n))
      return !1;
    if (typeof Object.getOwnPropertyDescriptor == "function") {
      var c = (
        /** @type {PropertyDescriptor} */
        Object.getOwnPropertyDescriptor(t, n)
      );
      if (c.value !== i || c.enumerable !== !0)
        return !1;
    }
    return !0;
  }), fi;
}
var mi, to;
function jb() {
  if (to) return mi;
  to = 1;
  var e = typeof Symbol < "u" && Symbol, t = Wl();
  return mi = function() {
    return typeof e != "function" || typeof Symbol != "function" || typeof e("foo") != "symbol" || typeof Symbol("bar") != "symbol" ? !1 : t();
  }, mi;
}
var hi, no;
function Gl() {
  return no || (no = 1, hi = typeof Reflect < "u" && Reflect.getPrototypeOf || null), hi;
}
var gi, ro;
function Jl() {
  if (ro) return gi;
  ro = 1;
  var e = Vl;
  return gi = e.getPrototypeOf || null, gi;
}
var Ib = "Function.prototype.bind called on incompatible ", Ob = Object.prototype.toString, $b = Math.max, Nb = "[object Function]", io = function(t, n) {
  for (var r = [], i = 0; i < t.length; i += 1)
    r[i] = t[i];
  for (var s = 0; s < n.length; s += 1)
    r[s + t.length] = n[s];
  return r;
}, Cb = function(t, n) {
  for (var r = [], i = n, s = 0; i < t.length; i += 1, s += 1)
    r[s] = t[i];
  return r;
}, Lb = function(e, t) {
  for (var n = "", r = 0; r < e.length; r += 1)
    n += e[r], r + 1 < e.length && (n += t);
  return n;
}, Db = function(t) {
  var n = this;
  if (typeof n != "function" || Ob.apply(n) !== Nb)
    throw new TypeError(Ib + n);
  for (var r = Cb(arguments, 1), i, s = function() {
    if (this instanceof i) {
      var u = n.apply(
        this,
        io(r, arguments)
      );
      return Object(u) === u ? u : this;
    }
    return n.apply(
      t,
      io(r, arguments)
    );
  }, a = $b(0, n.length - r.length), c = [], l = 0; l < a; l++)
    c[l] = "$" + l;
  if (i = Function("binder", "return function (" + Lb(c, ",") + "){ return binder.apply(this,arguments); }")(s), n.prototype) {
    var p = function() {
    };
    p.prototype = n.prototype, i.prototype = new p(), p.prototype = null;
  }
  return i;
}, zb = Db, Yr = Function.prototype.bind || zb, vi, so;
function Ds() {
  return so || (so = 1, vi = Function.prototype.call), vi;
}
var bi, ao;
function Kl() {
  return ao || (ao = 1, bi = Function.prototype.apply), bi;
}
var xi, oo;
function Fb() {
  return oo || (oo = 1, xi = typeof Reflect < "u" && Reflect && Reflect.apply), xi;
}
var yi, co;
function Ub() {
  if (co) return yi;
  co = 1;
  var e = Yr, t = Kl(), n = Ds(), r = Fb();
  return yi = r || e.call(n, t), yi;
}
var wi, lo;
function Bb() {
  if (lo) return wi;
  lo = 1;
  var e = Yr, t = Ls(), n = Ds(), r = Ub();
  return wi = function(s) {
    if (s.length < 1 || typeof s[0] != "function")
      throw new t("a function is required");
    return r(e, n, s);
  }, wi;
}
var Ei, uo;
function Mb() {
  if (uo) return Ei;
  uo = 1;
  var e = Bb(), t = Zl, n;
  try {
    n = /** @type {{ __proto__?: typeof Array.prototype }} */
    [].__proto__ === Array.prototype;
  } catch (a) {
    if (!a || typeof a != "object" || !("code" in a) || a.code !== "ERR_PROTO_ACCESS")
      throw a;
  }
  var r = !!n && t && t(
    Object.prototype,
    /** @type {keyof typeof Object.prototype} */
    "__proto__"
  ), i = Object, s = i.getPrototypeOf;
  return Ei = r && typeof r.get == "function" ? e([r.get]) : typeof s == "function" ? (
    /** @type {import('./get')} */
    function(c) {
      return s(c == null ? c : i(c));
    }
  ) : !1, Ei;
}
var _i, po;
function qb() {
  if (po) return _i;
  po = 1;
  var e = Gl(), t = Jl(), n = Mb();
  return _i = e ? function(i) {
    return e(i);
  } : t ? function(i) {
    if (!i || typeof i != "object" && typeof i != "function")
      throw new TypeError("getProto: not an object");
    return t(i);
  } : n ? function(i) {
    return n(i);
  } : null, _i;
}
var Hb = Function.prototype.call, Vb = Object.prototype.hasOwnProperty, Zb = Yr, zs = Zb.call(Hb, Vb), B, Wb = Vl, Gb = fb, Jb = mb, Kb = hb, Xb = gb, cn = vb, en = Ls(), Yb = bb, Qb = xb, ex = yb, tx = wb, nx = Eb, rx = _b, ix = Sb, sx = Tb, Xl = Function, Si = function(e) {
  try {
    return Xl('"use strict"; return (' + e + ").constructor;")();
  } catch {
  }
}, On = Zl, ax = Rb, Ai = function() {
  throw new en();
}, ox = On ? function() {
  try {
    return arguments.callee, Ai;
  } catch {
    try {
      return On(arguments, "callee").get;
    } catch {
      return Ai;
    }
  }
}() : Ai, Ut = jb()(), ve = qb(), cx = Jl(), lx = Gl(), Yl = Kl(), qn = Ds(), Ht = {}, ux = typeof Uint8Array > "u" || !ve ? B : ve(Uint8Array), _t = {
  __proto__: null,
  "%AggregateError%": typeof AggregateError > "u" ? B : AggregateError,
  "%Array%": Array,
  "%ArrayBuffer%": typeof ArrayBuffer > "u" ? B : ArrayBuffer,
  "%ArrayIteratorPrototype%": Ut && ve ? ve([][Symbol.iterator]()) : B,
  "%AsyncFromSyncIteratorPrototype%": B,
  "%AsyncFunction%": Ht,
  "%AsyncGenerator%": Ht,
  "%AsyncGeneratorFunction%": Ht,
  "%AsyncIteratorPrototype%": Ht,
  "%Atomics%": typeof Atomics > "u" ? B : Atomics,
  "%BigInt%": typeof BigInt > "u" ? B : BigInt,
  "%BigInt64Array%": typeof BigInt64Array > "u" ? B : BigInt64Array,
  "%BigUint64Array%": typeof BigUint64Array > "u" ? B : BigUint64Array,
  "%Boolean%": Boolean,
  "%DataView%": typeof DataView > "u" ? B : DataView,
  "%Date%": Date,
  "%decodeURI%": decodeURI,
  "%decodeURIComponent%": decodeURIComponent,
  "%encodeURI%": encodeURI,
  "%encodeURIComponent%": encodeURIComponent,
  "%Error%": Gb,
  "%eval%": eval,
  // eslint-disable-line no-eval
  "%EvalError%": Jb,
  "%Float16Array%": typeof Float16Array > "u" ? B : Float16Array,
  "%Float32Array%": typeof Float32Array > "u" ? B : Float32Array,
  "%Float64Array%": typeof Float64Array > "u" ? B : Float64Array,
  "%FinalizationRegistry%": typeof FinalizationRegistry > "u" ? B : FinalizationRegistry,
  "%Function%": Xl,
  "%GeneratorFunction%": Ht,
  "%Int8Array%": typeof Int8Array > "u" ? B : Int8Array,
  "%Int16Array%": typeof Int16Array > "u" ? B : Int16Array,
  "%Int32Array%": typeof Int32Array > "u" ? B : Int32Array,
  "%isFinite%": isFinite,
  "%isNaN%": isNaN,
  "%IteratorPrototype%": Ut && ve ? ve(ve([][Symbol.iterator]())) : B,
  "%JSON%": typeof JSON == "object" ? JSON : B,
  "%Map%": typeof Map > "u" ? B : Map,
  "%MapIteratorPrototype%": typeof Map > "u" || !Ut || !ve ? B : ve((/* @__PURE__ */ new Map())[Symbol.iterator]()),
  "%Math%": Math,
  "%Number%": Number,
  "%Object%": Wb,
  "%Object.getOwnPropertyDescriptor%": On,
  "%parseFloat%": parseFloat,
  "%parseInt%": parseInt,
  "%Promise%": typeof Promise > "u" ? B : Promise,
  "%Proxy%": typeof Proxy > "u" ? B : Proxy,
  "%RangeError%": Kb,
  "%ReferenceError%": Xb,
  "%Reflect%": typeof Reflect > "u" ? B : Reflect,
  "%RegExp%": RegExp,
  "%Set%": typeof Set > "u" ? B : Set,
  "%SetIteratorPrototype%": typeof Set > "u" || !Ut || !ve ? B : ve((/* @__PURE__ */ new Set())[Symbol.iterator]()),
  "%SharedArrayBuffer%": typeof SharedArrayBuffer > "u" ? B : SharedArrayBuffer,
  "%String%": String,
  "%StringIteratorPrototype%": Ut && ve ? ve(""[Symbol.iterator]()) : B,
  "%Symbol%": Ut ? Symbol : B,
  "%SyntaxError%": cn,
  "%ThrowTypeError%": ox,
  "%TypedArray%": ux,
  "%TypeError%": en,
  "%Uint8Array%": typeof Uint8Array > "u" ? B : Uint8Array,
  "%Uint8ClampedArray%": typeof Uint8ClampedArray > "u" ? B : Uint8ClampedArray,
  "%Uint16Array%": typeof Uint16Array > "u" ? B : Uint16Array,
  "%Uint32Array%": typeof Uint32Array > "u" ? B : Uint32Array,
  "%URIError%": Yb,
  "%WeakMap%": typeof WeakMap > "u" ? B : WeakMap,
  "%WeakRef%": typeof WeakRef > "u" ? B : WeakRef,
  "%WeakSet%": typeof WeakSet > "u" ? B : WeakSet,
  "%Function.prototype.call%": qn,
  "%Function.prototype.apply%": Yl,
  "%Object.defineProperty%": ax,
  "%Object.getPrototypeOf%": cx,
  "%Math.abs%": Qb,
  "%Math.floor%": ex,
  "%Math.max%": tx,
  "%Math.min%": nx,
  "%Math.pow%": rx,
  "%Math.round%": ix,
  "%Math.sign%": sx,
  "%Reflect.getPrototypeOf%": lx
};
if (ve)
  try {
    null.error;
  } catch (e) {
    var px = ve(ve(e));
    _t["%Error.prototype%"] = px;
  }
var dx = function e(t) {
  var n;
  if (t === "%AsyncFunction%")
    n = Si("async function () {}");
  else if (t === "%GeneratorFunction%")
    n = Si("function* () {}");
  else if (t === "%AsyncGeneratorFunction%")
    n = Si("async function* () {}");
  else if (t === "%AsyncGenerator%") {
    var r = e("%AsyncGeneratorFunction%");
    r && (n = r.prototype);
  } else if (t === "%AsyncIteratorPrototype%") {
    var i = e("%AsyncGenerator%");
    i && ve && (n = ve(i.prototype));
  }
  return _t[t] = n, n;
}, fo = {
  __proto__: null,
  "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
  "%ArrayPrototype%": ["Array", "prototype"],
  "%ArrayProto_entries%": ["Array", "prototype", "entries"],
  "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
  "%ArrayProto_keys%": ["Array", "prototype", "keys"],
  "%ArrayProto_values%": ["Array", "prototype", "values"],
  "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
  "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
  "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
  "%BooleanPrototype%": ["Boolean", "prototype"],
  "%DataViewPrototype%": ["DataView", "prototype"],
  "%DatePrototype%": ["Date", "prototype"],
  "%ErrorPrototype%": ["Error", "prototype"],
  "%EvalErrorPrototype%": ["EvalError", "prototype"],
  "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
  "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
  "%FunctionPrototype%": ["Function", "prototype"],
  "%Generator%": ["GeneratorFunction", "prototype"],
  "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
  "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
  "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
  "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
  "%JSONParse%": ["JSON", "parse"],
  "%JSONStringify%": ["JSON", "stringify"],
  "%MapPrototype%": ["Map", "prototype"],
  "%NumberPrototype%": ["Number", "prototype"],
  "%ObjectPrototype%": ["Object", "prototype"],
  "%ObjProto_toString%": ["Object", "prototype", "toString"],
  "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
  "%PromisePrototype%": ["Promise", "prototype"],
  "%PromiseProto_then%": ["Promise", "prototype", "then"],
  "%Promise_all%": ["Promise", "all"],
  "%Promise_reject%": ["Promise", "reject"],
  "%Promise_resolve%": ["Promise", "resolve"],
  "%RangeErrorPrototype%": ["RangeError", "prototype"],
  "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
  "%RegExpPrototype%": ["RegExp", "prototype"],
  "%SetPrototype%": ["Set", "prototype"],
  "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
  "%StringPrototype%": ["String", "prototype"],
  "%SymbolPrototype%": ["Symbol", "prototype"],
  "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
  "%TypedArrayPrototype%": ["TypedArray", "prototype"],
  "%TypeErrorPrototype%": ["TypeError", "prototype"],
  "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
  "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
  "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
  "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
  "%URIErrorPrototype%": ["URIError", "prototype"],
  "%WeakMapPrototype%": ["WeakMap", "prototype"],
  "%WeakSetPrototype%": ["WeakSet", "prototype"]
}, Hn = Yr, Ir = zs, fx = Hn.call(qn, Array.prototype.concat), mx = Hn.call(Yl, Array.prototype.splice), mo = Hn.call(qn, String.prototype.replace), Or = Hn.call(qn, String.prototype.slice), hx = Hn.call(qn, RegExp.prototype.exec), gx = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g, vx = /\\(\\)?/g, bx = function(t) {
  var n = Or(t, 0, 1), r = Or(t, -1);
  if (n === "%" && r !== "%")
    throw new cn("invalid intrinsic syntax, expected closing `%`");
  if (r === "%" && n !== "%")
    throw new cn("invalid intrinsic syntax, expected opening `%`");
  var i = [];
  return mo(t, gx, function(s, a, c, l) {
    i[i.length] = c ? mo(l, vx, "$1") : a || s;
  }), i;
}, xx = function(t, n) {
  var r = t, i;
  if (Ir(fo, r) && (i = fo[r], r = "%" + i[0] + "%"), Ir(_t, r)) {
    var s = _t[r];
    if (s === Ht && (s = dx(r)), typeof s > "u" && !n)
      throw new en("intrinsic " + t + " exists, but is not available. Please file an issue!");
    return {
      alias: i,
      name: r,
      value: s
    };
  }
  throw new cn("intrinsic " + t + " does not exist!");
}, yx = function(t, n) {
  if (typeof t != "string" || t.length === 0)
    throw new en("intrinsic name must be a non-empty string");
  if (arguments.length > 1 && typeof n != "boolean")
    throw new en('"allowMissing" argument must be a boolean');
  if (hx(/^%?[^%]*%?$/, t) === null)
    throw new cn("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
  var r = bx(t), i = r.length > 0 ? r[0] : "", s = xx("%" + i + "%", n), a = s.name, c = s.value, l = !1, p = s.alias;
  p && (i = p[0], mx(r, fx([0, 1], p)));
  for (var u = 1, d = !0; u < r.length; u += 1) {
    var f = r[u], m = Or(f, 0, 1), v = Or(f, -1);
    if ((m === '"' || m === "'" || m === "`" || v === '"' || v === "'" || v === "`") && m !== v)
      throw new cn("property names with quotes must have matching quotes");
    if ((f === "constructor" || !d) && (l = !0), i += "." + f, a = "%" + i + "%", Ir(_t, a))
      c = _t[a];
    else if (c != null) {
      if (!(f in c)) {
        if (!n)
          throw new en("base intrinsic for " + t + " exists, but the property is not available.");
        return;
      }
      if (On && u + 1 >= r.length) {
        var g = On(c, f);
        d = !!g, d && "get" in g && !("originalValue" in g.get) ? c = g.get : c = c[f];
      } else
        d = Ir(c, f), c = c[f];
      d && !l && (_t[a] = c);
    }
  }
  return c;
}, ki, ho;
function wx() {
  if (ho) return ki;
  ho = 1;
  var e = Wl();
  return ki = function() {
    return e() && !!Symbol.toStringTag;
  }, ki;
}
var Ex = yx, go = Ex("%Object.defineProperty%", !0), _x = wx()(), Sx = zs, Ax = Ls(), tr = _x ? Symbol.toStringTag : null, kx = function(t, n) {
  var r = arguments.length > 2 && !!arguments[2] && arguments[2].force, i = arguments.length > 2 && !!arguments[2] && arguments[2].nonConfigurable;
  if (typeof r < "u" && typeof r != "boolean" || typeof i < "u" && typeof i != "boolean")
    throw new Ax("if provided, the `overrideIfSet` and `nonConfigurable` options must be booleans");
  tr && (r || !Sx(t, tr)) && (go ? go(t, tr, {
    configurable: !i,
    enumerable: !1,
    value: n,
    writable: !1
  }) : t[tr] = n);
}, Tx = function(e, t) {
  return Object.keys(t).forEach(function(n) {
    e[n] = e[n] || t[n];
  }), e;
}, Fs = Fv, Px = vt, Ti = nt, Rx = Br, jx = Mr, Ix = ks.parse, Ox = gt, $x = xe.Stream, Nx = As, Pi = Dl, Cx = db, Lx = kx, pt = zs, as = Tx;
function H(e) {
  if (!(this instanceof H))
    return new H(e);
  this._overheadLength = 0, this._valueLength = 0, this._valuesToMeasure = [], Fs.call(this), e = e || {};
  for (var t in e)
    this[t] = e[t];
}
Px.inherits(H, Fs);
H.LINE_BREAK = `\r
`;
H.DEFAULT_CONTENT_TYPE = "application/octet-stream";
H.prototype.append = function(e, t, n) {
  n = n || {}, typeof n == "string" && (n = { filename: n });
  var r = Fs.prototype.append.bind(this);
  if ((typeof t == "number" || t == null) && (t = String(t)), Array.isArray(t)) {
    this._error(new Error("Arrays are not supported."));
    return;
  }
  var i = this._multiPartHeader(e, t, n), s = this._multiPartFooter();
  r(i), r(t), r(s), this._trackLength(i, t, n);
};
H.prototype._trackLength = function(e, t, n) {
  var r = 0;
  n.knownLength != null ? r += Number(n.knownLength) : Buffer.isBuffer(t) ? r = t.length : typeof t == "string" && (r = Buffer.byteLength(t)), this._valueLength += r, this._overheadLength += Buffer.byteLength(e) + H.LINE_BREAK.length, !(!t || !t.path && !(t.readable && pt(t, "httpVersion")) && !(t instanceof $x)) && (n.knownLength || this._valuesToMeasure.push(t));
};
H.prototype._lengthRetriever = function(e, t) {
  pt(e, "fd") ? e.end != null && e.end != 1 / 0 && e.start != null ? t(null, e.end + 1 - (e.start ? e.start : 0)) : Ox.stat(e.path, function(n, r) {
    if (n) {
      t(n);
      return;
    }
    var i = r.size - (e.start ? e.start : 0);
    t(null, i);
  }) : pt(e, "httpVersion") ? t(null, Number(e.headers["content-length"])) : pt(e, "httpModule") ? (e.on("response", function(n) {
    e.pause(), t(null, Number(n.headers["content-length"]));
  }), e.resume()) : t("Unknown stream");
};
H.prototype._multiPartHeader = function(e, t, n) {
  if (typeof n.header == "string")
    return n.header;
  var r = this._getContentDisposition(t, n), i = this._getContentType(t, n), s = "", a = {
    // add custom disposition as third element or keep it two elements if not
    "Content-Disposition": ["form-data", 'name="' + e + '"'].concat(r || []),
    // if no content type. allow it to be empty array
    "Content-Type": [].concat(i || [])
  };
  typeof n.header == "object" && as(a, n.header);
  var c;
  for (var l in a)
    if (pt(a, l)) {
      if (c = a[l], c == null)
        continue;
      Array.isArray(c) || (c = [c]), c.length && (s += l + ": " + c.join("; ") + H.LINE_BREAK);
    }
  return "--" + this.getBoundary() + H.LINE_BREAK + s + H.LINE_BREAK;
};
H.prototype._getContentDisposition = function(e, t) {
  var n;
  if (typeof t.filepath == "string" ? n = Ti.normalize(t.filepath).replace(/\\/g, "/") : t.filename || e && (e.name || e.path) ? n = Ti.basename(t.filename || e && (e.name || e.path)) : e && e.readable && pt(e, "httpVersion") && (n = Ti.basename(e.client._httpMessage.path || "")), n)
    return 'filename="' + n + '"';
};
H.prototype._getContentType = function(e, t) {
  var n = t.contentType;
  return !n && e && e.name && (n = Pi.lookup(e.name)), !n && e && e.path && (n = Pi.lookup(e.path)), !n && e && e.readable && pt(e, "httpVersion") && (n = e.headers["content-type"]), !n && (t.filepath || t.filename) && (n = Pi.lookup(t.filepath || t.filename)), !n && e && typeof e == "object" && (n = H.DEFAULT_CONTENT_TYPE), n;
};
H.prototype._multiPartFooter = function() {
  return (function(e) {
    var t = H.LINE_BREAK, n = this._streams.length === 0;
    n && (t += this._lastBoundary()), e(t);
  }).bind(this);
};
H.prototype._lastBoundary = function() {
  return "--" + this.getBoundary() + "--" + H.LINE_BREAK;
};
H.prototype.getHeaders = function(e) {
  var t, n = {
    "content-type": "multipart/form-data; boundary=" + this.getBoundary()
  };
  for (t in e)
    pt(e, t) && (n[t.toLowerCase()] = e[t]);
  return n;
};
H.prototype.setBoundary = function(e) {
  if (typeof e != "string")
    throw new TypeError("FormData boundary must be a string");
  this._boundary = e;
};
H.prototype.getBoundary = function() {
  return this._boundary || this._generateBoundary(), this._boundary;
};
H.prototype.getBuffer = function() {
  for (var e = new Buffer.alloc(0), t = this.getBoundary(), n = 0, r = this._streams.length; n < r; n++)
    typeof this._streams[n] != "function" && (Buffer.isBuffer(this._streams[n]) ? e = Buffer.concat([e, this._streams[n]]) : e = Buffer.concat([e, Buffer.from(this._streams[n])]), (typeof this._streams[n] != "string" || this._streams[n].substring(2, t.length + 2) !== t) && (e = Buffer.concat([e, Buffer.from(H.LINE_BREAK)])));
  return Buffer.concat([e, Buffer.from(this._lastBoundary())]);
};
H.prototype._generateBoundary = function() {
  this._boundary = "--------------------------" + Nx.randomBytes(12).toString("hex");
};
H.prototype.getLengthSync = function() {
  var e = this._overheadLength + this._valueLength;
  return this._streams.length && (e += this._lastBoundary().length), this.hasKnownLength() || this._error(new Error("Cannot calculate proper length in synchronous way.")), e;
};
H.prototype.hasKnownLength = function() {
  var e = !0;
  return this._valuesToMeasure.length && (e = !1), e;
};
H.prototype.getLength = function(e) {
  var t = this._overheadLength + this._valueLength;
  if (this._streams.length && (t += this._lastBoundary().length), !this._valuesToMeasure.length) {
    process.nextTick(e.bind(this, null, t));
    return;
  }
  Cx.parallel(this._valuesToMeasure, this._lengthRetriever, function(n, r) {
    if (n) {
      e(n);
      return;
    }
    r.forEach(function(i) {
      t += i;
    }), e(null, t);
  });
};
H.prototype.submit = function(e, t) {
  var n, r, i = { method: "post" };
  return typeof e == "string" ? (e = Ix(e), r = as({
    port: e.port,
    path: e.pathname,
    host: e.hostname,
    protocol: e.protocol
  }, i)) : (r = as(e, i), r.port || (r.port = r.protocol === "https:" ? 443 : 80)), r.headers = this.getHeaders(e.headers), r.protocol === "https:" ? n = jx.request(r) : n = Rx.request(r), this.getLength((function(s, a) {
    if (s && s !== "Unknown stream") {
      this._error(s);
      return;
    }
    if (a && n.setHeader("Content-Length", a), this.pipe(n), t) {
      var c, l = function(p, u) {
        return n.removeListener("error", l), n.removeListener("response", c), t.call(this, p, u);
      };
      c = l.bind(this, null), n.on("error", l), n.on("response", c);
    }
  }).bind(this)), n;
};
H.prototype._error = function(e) {
  this.error || (this.error = e, this.pause(), this.emit("error", e));
};
H.prototype.toString = function() {
  return "[object FormData]";
};
Lx(H.prototype, "FormData");
var Dx = H;
const Ql = /* @__PURE__ */ Nt(Dx);
function os(e) {
  return h.isPlainObject(e) || h.isArray(e);
}
function eu(e) {
  return h.endsWith(e, "[]") ? e.slice(0, -2) : e;
}
function Ri(e, t, n) {
  return e ? e.concat(t).map(function(i, s) {
    return i = eu(i), !n && s ? "[" + i + "]" : i;
  }).join(n ? "." : "") : t;
}
function zx(e) {
  return h.isArray(e) && !e.some(os);
}
const Fx = h.toFlatObject(h, {}, null, function(t) {
  return /^is[A-Z]/.test(t);
});
function Qr(e, t, n) {
  if (!h.isObject(e))
    throw new TypeError("target must be an object");
  t = t || new (Ql || FormData)(), n = h.toFlatObject(
    n,
    {
      metaTokens: !0,
      dots: !1,
      indexes: !1
    },
    !1,
    function(b, x) {
      return !h.isUndefined(x[b]);
    }
  );
  const r = n.metaTokens, i = n.visitor || d, s = n.dots, a = n.indexes, c = n.Blob || typeof Blob < "u" && Blob, l = n.maxDepth === void 0 ? 100 : n.maxDepth, p = c && h.isSpecCompliantForm(t);
  if (!h.isFunction(i))
    throw new TypeError("visitor must be a function");
  function u(g) {
    if (g === null) return "";
    if (h.isDate(g))
      return g.toISOString();
    if (h.isBoolean(g))
      return g.toString();
    if (!p && h.isBlob(g))
      throw new S("Blob is not supported. Use a Buffer instead.");
    return h.isArrayBuffer(g) || h.isTypedArray(g) ? p && typeof Blob == "function" ? new Blob([g]) : Buffer.from(g) : g;
  }
  function d(g, b, x) {
    let I = g;
    if (h.isReactNative(t) && h.isReactNativeBlob(g))
      return t.append(Ri(x, b, s), u(g)), !1;
    if (g && !x && typeof g == "object") {
      if (h.endsWith(b, "{}"))
        b = r ? b : b.slice(0, -2), g = JSON.stringify(g);
      else if (h.isArray(g) && zx(g) || (h.isFileList(g) || h.endsWith(b, "[]")) && (I = h.toArray(g)))
        return b = eu(b), I.forEach(function(P, C) {
          !(h.isUndefined(P) || P === null) && t.append(
            // eslint-disable-next-line no-nested-ternary
            a === !0 ? Ri([b], C, s) : a === null ? b : b + "[]",
            u(P)
          );
        }), !1;
    }
    return os(g) ? !0 : (t.append(Ri(x, b, s), u(g)), !1);
  }
  const f = [], m = Object.assign(Fx, {
    defaultVisitor: d,
    convertValue: u,
    isVisitable: os
  });
  function v(g, b, x = 0) {
    if (!h.isUndefined(g)) {
      if (x > l)
        throw new S(
          "Object is too deeply nested (" + x + " levels). Max depth: " + l,
          S.ERR_FORM_DATA_DEPTH_EXCEEDED
        );
      if (f.indexOf(g) !== -1)
        throw Error("Circular reference detected in " + b.join("."));
      f.push(g), h.forEach(g, function(D, P) {
        (!(h.isUndefined(D) || D === null) && i.call(t, D, h.isString(P) ? P.trim() : P, b, m)) === !0 && v(D, b ? b.concat(P) : [P], x + 1);
      }), f.pop();
    }
  }
  if (!h.isObject(e))
    throw new TypeError("data must be an object");
  return v(e), t;
}
function vo(e) {
  const t = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+"
  };
  return encodeURIComponent(e).replace(/[!'()~]|%20/g, function(r) {
    return t[r];
  });
}
function tu(e, t) {
  this._pairs = [], e && Qr(e, this, t);
}
const nu = tu.prototype;
nu.append = function(t, n) {
  this._pairs.push([t, n]);
};
nu.toString = function(t) {
  const n = t ? function(r) {
    return t.call(this, r, vo);
  } : vo;
  return this._pairs.map(function(i) {
    return n(i[0]) + "=" + n(i[1]);
  }, "").join("&");
};
function Ux(e) {
  return encodeURIComponent(e).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
}
function Us(e, t, n) {
  if (!t)
    return e;
  const r = n && n.encode || Ux, i = h.isFunction(n) ? {
    serialize: n
  } : n, s = i && i.serialize;
  let a;
  if (s ? a = s(t, i) : a = h.isURLSearchParams(t) ? t.toString() : new tu(t, i).toString(r), a) {
    const c = e.indexOf("#");
    c !== -1 && (e = e.slice(0, c)), e += (e.indexOf("?") === -1 ? "?" : "&") + a;
  }
  return e;
}
class bo {
  constructor() {
    this.handlers = [];
  }
  /**
   * Add a new interceptor to the stack
   *
   * @param {Function} fulfilled The function to handle `then` for a `Promise`
   * @param {Function} rejected The function to handle `reject` for a `Promise`
   * @param {Object} options The options for the interceptor, synchronous and runWhen
   *
   * @return {Number} An ID used to remove interceptor later
   */
  use(t, n, r) {
    return this.handlers.push({
      fulfilled: t,
      rejected: n,
      synchronous: r ? r.synchronous : !1,
      runWhen: r ? r.runWhen : null
    }), this.handlers.length - 1;
  }
  /**
   * Remove an interceptor from the stack
   *
   * @param {Number} id The ID that was returned by `use`
   *
   * @returns {void}
   */
  eject(t) {
    this.handlers[t] && (this.handlers[t] = null);
  }
  /**
   * Clear all interceptors from the stack
   *
   * @returns {void}
   */
  clear() {
    this.handlers && (this.handlers = []);
  }
  /**
   * Iterate over all the registered interceptors
   *
   * This method is particularly useful for skipping over any
   * interceptors that may have become `null` calling `eject`.
   *
   * @param {Function} fn The function to call for each interceptor
   *
   * @returns {void}
   */
  forEach(t) {
    h.forEach(this.handlers, function(r) {
      r !== null && t(r);
    });
  }
}
const ei = {
  silentJSONParsing: !0,
  forcedJSONParsing: !0,
  clarifyTimeoutError: !1,
  legacyInterceptorReqResOrdering: !0
}, Bx = ks.URLSearchParams, ji = "abcdefghijklmnopqrstuvwxyz", xo = "0123456789", ru = {
  DIGIT: xo,
  ALPHA: ji,
  ALPHA_DIGIT: ji + ji.toUpperCase() + xo
}, Mx = (e = 16, t = ru.ALPHA_DIGIT) => {
  let n = "";
  const { length: r } = t, i = new Uint32Array(e);
  As.randomFillSync(i);
  for (let s = 0; s < e; s++)
    n += t[i[s] % r];
  return n;
}, qx = {
  isNode: !0,
  classes: {
    URLSearchParams: Bx,
    FormData: Ql,
    Blob: typeof Blob < "u" && Blob || null
  },
  ALPHABET: ru,
  generateString: Mx,
  protocols: ["http", "https", "file", "data"]
}, Bs = typeof window < "u" && typeof document < "u", cs = typeof navigator == "object" && navigator || void 0, Hx = Bs && (!cs || ["ReactNative", "NativeScript", "NS"].indexOf(cs.product) < 0), Vx = typeof WorkerGlobalScope < "u" && // eslint-disable-next-line no-undef
self instanceof WorkerGlobalScope && typeof self.importScripts == "function", Zx = Bs && window.location.href || "http://localhost", Wx = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  hasBrowserEnv: Bs,
  hasStandardBrowserEnv: Hx,
  hasStandardBrowserWebWorkerEnv: Vx,
  navigator: cs,
  origin: Zx
}, Symbol.toStringTag, { value: "Module" })), oe = {
  ...Wx,
  ...qx
};
function Gx(e, t) {
  return Qr(e, new oe.classes.URLSearchParams(), {
    visitor: function(n, r, i, s) {
      return oe.isNode && h.isBuffer(n) ? (this.append(r, n.toString("base64")), !1) : s.defaultVisitor.apply(this, arguments);
    },
    ...t
  });
}
function Jx(e) {
  return h.matchAll(/\w+|\[(\w*)]/g, e).map((t) => t[0] === "[]" ? "" : t[1] || t[0]);
}
function Kx(e) {
  const t = {}, n = Object.keys(e);
  let r;
  const i = n.length;
  let s;
  for (r = 0; r < i; r++)
    s = n[r], t[s] = e[s];
  return t;
}
function iu(e) {
  function t(n, r, i, s) {
    let a = n[s++];
    if (a === "__proto__") return !0;
    const c = Number.isFinite(+a), l = s >= n.length;
    return a = !a && h.isArray(i) ? i.length : a, l ? (h.hasOwnProp(i, a) ? i[a] = h.isArray(i[a]) ? i[a].concat(r) : [i[a], r] : i[a] = r, !c) : ((!i[a] || !h.isObject(i[a])) && (i[a] = []), t(n, r, i[a], s) && h.isArray(i[a]) && (i[a] = Kx(i[a])), !c);
  }
  if (h.isFormData(e) && h.isFunction(e.entries)) {
    const n = {};
    return h.forEachEntry(e, (r, i) => {
      t(Jx(r), i, n, 0);
    }), n;
  }
  return null;
}
const Bt = (e, t) => e != null && h.hasOwnProp(e, t) ? e[t] : void 0;
function Xx(e, t, n) {
  if (h.isString(e))
    try {
      return (t || JSON.parse)(e), h.trim(e);
    } catch (r) {
      if (r.name !== "SyntaxError")
        throw r;
    }
  return (n || JSON.stringify)(e);
}
const Vn = {
  transitional: ei,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [
    function(t, n) {
      const r = n.getContentType() || "", i = r.indexOf("application/json") > -1, s = h.isObject(t);
      if (s && h.isHTMLForm(t) && (t = new FormData(t)), h.isFormData(t))
        return i ? JSON.stringify(iu(t)) : t;
      if (h.isArrayBuffer(t) || h.isBuffer(t) || h.isStream(t) || h.isFile(t) || h.isBlob(t) || h.isReadableStream(t))
        return t;
      if (h.isArrayBufferView(t))
        return t.buffer;
      if (h.isURLSearchParams(t))
        return n.setContentType("application/x-www-form-urlencoded;charset=utf-8", !1), t.toString();
      let c;
      if (s) {
        const l = Bt(this, "formSerializer");
        if (r.indexOf("application/x-www-form-urlencoded") > -1)
          return Gx(t, l).toString();
        if ((c = h.isFileList(t)) || r.indexOf("multipart/form-data") > -1) {
          const p = Bt(this, "env"), u = p && p.FormData;
          return Qr(
            c ? { "files[]": t } : t,
            u && new u(),
            l
          );
        }
      }
      return s || i ? (n.setContentType("application/json", !1), Xx(t)) : t;
    }
  ],
  transformResponse: [
    function(t) {
      const n = Bt(this, "transitional") || Vn.transitional, r = n && n.forcedJSONParsing, i = Bt(this, "responseType"), s = i === "json";
      if (h.isResponse(t) || h.isReadableStream(t))
        return t;
      if (t && h.isString(t) && (r && !i || s)) {
        const c = !(n && n.silentJSONParsing) && s;
        try {
          return JSON.parse(t, Bt(this, "parseReviver"));
        } catch (l) {
          if (c)
            throw l.name === "SyntaxError" ? S.from(l, S.ERR_BAD_RESPONSE, this, null, Bt(this, "response")) : l;
        }
      }
      return t;
    }
  ],
  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: oe.classes.FormData,
    Blob: oe.classes.Blob
  },
  validateStatus: function(t) {
    return t >= 200 && t < 300;
  },
  headers: {
    common: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": void 0
    }
  }
};
h.forEach(["delete", "get", "head", "post", "put", "patch"], (e) => {
  Vn.headers[e] = {};
});
const Yx = h.toObjectSet([
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "user-agent"
]), Qx = (e) => {
  const t = {};
  let n, r, i;
  return e && e.split(`
`).forEach(function(a) {
    i = a.indexOf(":"), n = a.substring(0, i).trim().toLowerCase(), r = a.substring(i + 1).trim(), !(!n || t[n] && Yx[n]) && (n === "set-cookie" ? t[n] ? t[n].push(r) : t[n] = [r] : t[n] = t[n] ? t[n] + ", " + r : r);
  }), t;
}, yo = Symbol("internals"), ey = /[^\x09\x20-\x7E\x80-\xFF]/g;
function ty(e) {
  let t = 0, n = e.length;
  for (; t < n; ) {
    const r = e.charCodeAt(t);
    if (r !== 9 && r !== 32)
      break;
    t += 1;
  }
  for (; n > t; ) {
    const r = e.charCodeAt(n - 1);
    if (r !== 9 && r !== 32)
      break;
    n -= 1;
  }
  return t === 0 && n === e.length ? e : e.slice(t, n);
}
function yn(e) {
  return e && String(e).trim().toLowerCase();
}
function ny(e) {
  return ty(e.replace(ey, ""));
}
function _r(e) {
  return e === !1 || e == null ? e : h.isArray(e) ? e.map(_r) : ny(String(e));
}
function ry(e) {
  const t = /* @__PURE__ */ Object.create(null), n = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let r;
  for (; r = n.exec(e); )
    t[r[1]] = r[2];
  return t;
}
const iy = (e) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(e.trim());
function Ii(e, t, n, r, i) {
  if (h.isFunction(r))
    return r.call(this, t, n);
  if (i && (t = n), !!h.isString(t)) {
    if (h.isString(r))
      return t.indexOf(r) !== -1;
    if (h.isRegExp(r))
      return r.test(t);
  }
}
function sy(e) {
  return e.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (t, n, r) => n.toUpperCase() + r);
}
function ay(e, t) {
  const n = h.toCamelCase(" " + t);
  ["get", "set", "has"].forEach((r) => {
    Object.defineProperty(e, r + n, {
      value: function(i, s, a) {
        return this[r].call(this, t, i, s, a);
      },
      configurable: !0
    });
  });
}
let ye = class {
  constructor(t) {
    t && this.set(t);
  }
  set(t, n, r) {
    const i = this;
    function s(c, l, p) {
      const u = yn(l);
      if (!u)
        throw new Error("header name must be a non-empty string");
      const d = h.findKey(i, u);
      (!d || i[d] === void 0 || p === !0 || p === void 0 && i[d] !== !1) && (i[d || l] = _r(c));
    }
    const a = (c, l) => h.forEach(c, (p, u) => s(p, u, l));
    if (h.isPlainObject(t) || t instanceof this.constructor)
      a(t, n);
    else if (h.isString(t) && (t = t.trim()) && !iy(t))
      a(Qx(t), n);
    else if (h.isObject(t) && h.isIterable(t)) {
      let c = {}, l, p;
      for (const u of t) {
        if (!h.isArray(u))
          throw TypeError("Object iterator must return a key-value pair");
        c[p = u[0]] = (l = c[p]) ? h.isArray(l) ? [...l, u[1]] : [l, u[1]] : u[1];
      }
      a(c, n);
    } else
      t != null && s(n, t, r);
    return this;
  }
  get(t, n) {
    if (t = yn(t), t) {
      const r = h.findKey(this, t);
      if (r) {
        const i = this[r];
        if (!n)
          return i;
        if (n === !0)
          return ry(i);
        if (h.isFunction(n))
          return n.call(this, i, r);
        if (h.isRegExp(n))
          return n.exec(i);
        throw new TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(t, n) {
    if (t = yn(t), t) {
      const r = h.findKey(this, t);
      return !!(r && this[r] !== void 0 && (!n || Ii(this, this[r], r, n)));
    }
    return !1;
  }
  delete(t, n) {
    const r = this;
    let i = !1;
    function s(a) {
      if (a = yn(a), a) {
        const c = h.findKey(r, a);
        c && (!n || Ii(r, r[c], c, n)) && (delete r[c], i = !0);
      }
    }
    return h.isArray(t) ? t.forEach(s) : s(t), i;
  }
  clear(t) {
    const n = Object.keys(this);
    let r = n.length, i = !1;
    for (; r--; ) {
      const s = n[r];
      (!t || Ii(this, this[s], s, t, !0)) && (delete this[s], i = !0);
    }
    return i;
  }
  normalize(t) {
    const n = this, r = {};
    return h.forEach(this, (i, s) => {
      const a = h.findKey(r, s);
      if (a) {
        n[a] = _r(i), delete n[s];
        return;
      }
      const c = t ? sy(s) : String(s).trim();
      c !== s && delete n[s], n[c] = _r(i), r[c] = !0;
    }), this;
  }
  concat(...t) {
    return this.constructor.concat(this, ...t);
  }
  toJSON(t) {
    const n = /* @__PURE__ */ Object.create(null);
    return h.forEach(this, (r, i) => {
      r != null && r !== !1 && (n[i] = t && h.isArray(r) ? r.join(", ") : r);
    }), n;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([t, n]) => t + ": " + n).join(`
`);
  }
  getSetCookie() {
    return this.get("set-cookie") || [];
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(t) {
    return t instanceof this ? t : new this(t);
  }
  static concat(t, ...n) {
    const r = new this(t);
    return n.forEach((i) => r.set(i)), r;
  }
  static accessor(t) {
    const r = (this[yo] = this[yo] = {
      accessors: {}
    }).accessors, i = this.prototype;
    function s(a) {
      const c = yn(a);
      r[c] || (ay(i, a), r[c] = !0);
    }
    return h.isArray(t) ? t.forEach(s) : s(t), this;
  }
};
ye.accessor([
  "Content-Type",
  "Content-Length",
  "Accept",
  "Accept-Encoding",
  "User-Agent",
  "Authorization"
]);
h.reduceDescriptors(ye.prototype, ({ value: e }, t) => {
  let n = t[0].toUpperCase() + t.slice(1);
  return {
    get: () => e,
    set(r) {
      this[n] = r;
    }
  };
});
h.freezeMethods(ye);
function Oi(e, t) {
  const n = this || Vn, r = t || n, i = ye.from(r.headers);
  let s = r.data;
  return h.forEach(e, function(c) {
    s = c.call(n, s, i.normalize(), t ? t.status : void 0);
  }), i.normalize(), s;
}
function su(e) {
  return !!(e && e.__CANCEL__);
}
let Rt = class extends S {
  /**
   * A `CanceledError` is an object that is thrown when an operation is canceled.
   *
   * @param {string=} message The message.
   * @param {Object=} config The config.
   * @param {Object=} request The request.
   *
   * @returns {CanceledError} The created error.
   */
  constructor(t, n, r) {
    super(t ?? "canceled", S.ERR_CANCELED, n, r), this.name = "CanceledError", this.__CANCEL__ = !0;
  }
};
function Kt(e, t, n) {
  const r = n.config.validateStatus;
  !n.status || !r || r(n.status) ? e(n) : t(
    new S(
      "Request failed with status code " + n.status,
      [S.ERR_BAD_REQUEST, S.ERR_BAD_RESPONSE][Math.floor(n.status / 100) - 4],
      n.config,
      n.request,
      n
    )
  );
}
function oy(e) {
  return typeof e != "string" ? !1 : /^([a-z][a-z\d+\-.]*:)?\/\//i.test(e);
}
function cy(e, t) {
  return t ? e.replace(/\/?\/$/, "") + "/" + t.replace(/^\/+/, "") : e;
}
function Ms(e, t, n) {
  let r = !oy(t);
  return e && (r || n === !1) ? cy(e, t) : t;
}
var ly = {
  ftp: 21,
  gopher: 70,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443
};
function uy(e) {
  try {
    return new URL(e);
  } catch {
    return null;
  }
}
function py(e) {
  var t = (typeof e == "string" ? uy(e) : e) || {}, n = t.protocol, r = t.host, i = t.port;
  if (typeof r != "string" || !r || typeof n != "string" || (n = n.split(":", 1)[0], r = r.replace(/:\d*$/, ""), i = parseInt(i) || ly[n] || 0, !dy(r, i)))
    return "";
  var s = ls(n + "_proxy") || ls("all_proxy");
  return s && s.indexOf("://") === -1 && (s = n + "://" + s), s;
}
function dy(e, t) {
  var n = ls("no_proxy").toLowerCase();
  return n ? n === "*" ? !1 : n.split(/[,\s]/).every(function(r) {
    if (!r)
      return !0;
    var i = r.match(/^(.+):(\d+)$/), s = i ? i[1] : r, a = i ? parseInt(i[2]) : 0;
    return a && a !== t ? !0 : /^[.*]/.test(s) ? (s.charAt(0) === "*" && (s = s.slice(1)), !e.endsWith(s)) : e !== s;
  }) : !0;
}
function ls(e) {
  return process.env[e.toLowerCase()] || process.env[e.toUpperCase()] || "";
}
var qs = { exports: {} }, nr = { exports: {} }, rr = { exports: {} }, $i, wo;
function fy() {
  if (wo) return $i;
  wo = 1;
  var e = 1e3, t = e * 60, n = t * 60, r = n * 24, i = r * 7, s = r * 365.25;
  $i = function(u, d) {
    d = d || {};
    var f = typeof u;
    if (f === "string" && u.length > 0)
      return a(u);
    if (f === "number" && isFinite(u))
      return d.long ? l(u) : c(u);
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(u)
    );
  };
  function a(u) {
    if (u = String(u), !(u.length > 100)) {
      var d = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        u
      );
      if (d) {
        var f = parseFloat(d[1]), m = (d[2] || "ms").toLowerCase();
        switch (m) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return f * s;
          case "weeks":
          case "week":
          case "w":
            return f * i;
          case "days":
          case "day":
          case "d":
            return f * r;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return f * n;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return f * t;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return f * e;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return f;
          default:
            return;
        }
      }
    }
  }
  function c(u) {
    var d = Math.abs(u);
    return d >= r ? Math.round(u / r) + "d" : d >= n ? Math.round(u / n) + "h" : d >= t ? Math.round(u / t) + "m" : d >= e ? Math.round(u / e) + "s" : u + "ms";
  }
  function l(u) {
    var d = Math.abs(u);
    return d >= r ? p(u, d, r, "day") : d >= n ? p(u, d, n, "hour") : d >= t ? p(u, d, t, "minute") : d >= e ? p(u, d, e, "second") : u + " ms";
  }
  function p(u, d, f, m) {
    var v = d >= f * 1.5;
    return Math.round(u / f) + " " + m + (v ? "s" : "");
  }
  return $i;
}
var Ni, Eo;
function au() {
  if (Eo) return Ni;
  Eo = 1;
  function e(t) {
    r.debug = r, r.default = r, r.coerce = p, r.disable = c, r.enable = s, r.enabled = l, r.humanize = fy(), r.destroy = u, Object.keys(t).forEach((d) => {
      r[d] = t[d];
    }), r.names = [], r.skips = [], r.formatters = {};
    function n(d) {
      let f = 0;
      for (let m = 0; m < d.length; m++)
        f = (f << 5) - f + d.charCodeAt(m), f |= 0;
      return r.colors[Math.abs(f) % r.colors.length];
    }
    r.selectColor = n;
    function r(d) {
      let f, m = null, v, g;
      function b(...x) {
        if (!b.enabled)
          return;
        const I = b, D = Number(/* @__PURE__ */ new Date()), P = D - (f || D);
        I.diff = P, I.prev = f, I.curr = D, f = D, x[0] = r.coerce(x[0]), typeof x[0] != "string" && x.unshift("%O");
        let C = 0;
        x[0] = x[0].replace(/%([a-zA-Z%])/g, (L, ne) => {
          if (L === "%%")
            return "%";
          C++;
          const K = r.formatters[ne];
          if (typeof K == "function") {
            const Le = x[C];
            L = K.call(I, Le), x.splice(C, 1), C--;
          }
          return L;
        }), r.formatArgs.call(I, x), (I.log || r.log).apply(I, x);
      }
      return b.namespace = d, b.useColors = r.useColors(), b.color = r.selectColor(d), b.extend = i, b.destroy = r.destroy, Object.defineProperty(b, "enabled", {
        enumerable: !0,
        configurable: !1,
        get: () => m !== null ? m : (v !== r.namespaces && (v = r.namespaces, g = r.enabled(d)), g),
        set: (x) => {
          m = x;
        }
      }), typeof r.init == "function" && r.init(b), b;
    }
    function i(d, f) {
      const m = r(this.namespace + (typeof f > "u" ? ":" : f) + d);
      return m.log = this.log, m;
    }
    function s(d) {
      r.save(d), r.namespaces = d, r.names = [], r.skips = [];
      const f = (typeof d == "string" ? d : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const m of f)
        m[0] === "-" ? r.skips.push(m.slice(1)) : r.names.push(m);
    }
    function a(d, f) {
      let m = 0, v = 0, g = -1, b = 0;
      for (; m < d.length; )
        if (v < f.length && (f[v] === d[m] || f[v] === "*"))
          f[v] === "*" ? (g = v, b = m, v++) : (m++, v++);
        else if (g !== -1)
          v = g + 1, b++, m = b;
        else
          return !1;
      for (; v < f.length && f[v] === "*"; )
        v++;
      return v === f.length;
    }
    function c() {
      const d = [
        ...r.names,
        ...r.skips.map((f) => "-" + f)
      ].join(",");
      return r.enable(""), d;
    }
    function l(d) {
      for (const f of r.skips)
        if (a(d, f))
          return !1;
      for (const f of r.names)
        if (a(d, f))
          return !0;
      return !1;
    }
    function p(d) {
      return d instanceof Error ? d.stack || d.message : d;
    }
    function u() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    return r.enable(r.load()), r;
  }
  return Ni = e, Ni;
}
var _o;
function my() {
  return _o || (_o = 1, function(e, t) {
    t.formatArgs = r, t.save = i, t.load = s, t.useColors = n, t.storage = a(), t.destroy = /* @__PURE__ */ (() => {
      let l = !1;
      return () => {
        l || (l = !0, console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."));
      };
    })(), t.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function n() {
      if (typeof window < "u" && window.process && (window.process.type === "renderer" || window.process.__nwjs))
        return !0;
      if (typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/))
        return !1;
      let l;
      return typeof document < "u" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window < "u" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator < "u" && navigator.userAgent && (l = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(l[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function r(l) {
      if (l[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + l[0] + (this.useColors ? "%c " : " ") + "+" + e.exports.humanize(this.diff), !this.useColors)
        return;
      const p = "color: " + this.color;
      l.splice(1, 0, p, "color: inherit");
      let u = 0, d = 0;
      l[0].replace(/%[a-zA-Z%]/g, (f) => {
        f !== "%%" && (u++, f === "%c" && (d = u));
      }), l.splice(d, 0, p);
    }
    t.log = console.debug || console.log || (() => {
    });
    function i(l) {
      try {
        l ? t.storage.setItem("debug", l) : t.storage.removeItem("debug");
      } catch {
      }
    }
    function s() {
      let l;
      try {
        l = t.storage.getItem("debug") || t.storage.getItem("DEBUG");
      } catch {
      }
      return !l && typeof process < "u" && "env" in process && (l = process.env.DEBUG), l;
    }
    function a() {
      try {
        return localStorage;
      } catch {
      }
    }
    e.exports = au()(t);
    const { formatters: c } = e.exports;
    c.j = function(l) {
      try {
        return JSON.stringify(l);
      } catch (p) {
        return "[UnexpectedJSONParseError]: " + p.message;
      }
    };
  }(rr, rr.exports)), rr.exports;
}
var ir = { exports: {} }, Ci, So;
function hy() {
  return So || (So = 1, Ci = (e, t = process.argv) => {
    const n = e.startsWith("-") ? "" : e.length === 1 ? "-" : "--", r = t.indexOf(n + e), i = t.indexOf("--");
    return r !== -1 && (i === -1 || r < i);
  }), Ci;
}
var Li, Ao;
function gy() {
  if (Ao) return Li;
  Ao = 1;
  const e = fn, t = Zc, n = hy(), { env: r } = process;
  let i;
  n("no-color") || n("no-colors") || n("color=false") || n("color=never") ? i = 0 : (n("color") || n("colors") || n("color=true") || n("color=always")) && (i = 1), "FORCE_COLOR" in r && (r.FORCE_COLOR === "true" ? i = 1 : r.FORCE_COLOR === "false" ? i = 0 : i = r.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(r.FORCE_COLOR, 10), 3));
  function s(l) {
    return l === 0 ? !1 : {
      level: l,
      hasBasic: !0,
      has256: l >= 2,
      has16m: l >= 3
    };
  }
  function a(l, p) {
    if (i === 0)
      return 0;
    if (n("color=16m") || n("color=full") || n("color=truecolor"))
      return 3;
    if (n("color=256"))
      return 2;
    if (l && !p && i === void 0)
      return 0;
    const u = i || 0;
    if (r.TERM === "dumb")
      return u;
    if (process.platform === "win32") {
      const d = e.release().split(".");
      return Number(d[0]) >= 10 && Number(d[2]) >= 10586 ? Number(d[2]) >= 14931 ? 3 : 2 : 1;
    }
    if ("CI" in r)
      return ["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((d) => d in r) || r.CI_NAME === "codeship" ? 1 : u;
    if ("TEAMCITY_VERSION" in r)
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(r.TEAMCITY_VERSION) ? 1 : 0;
    if (r.COLORTERM === "truecolor")
      return 3;
    if ("TERM_PROGRAM" in r) {
      const d = parseInt((r.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (r.TERM_PROGRAM) {
        case "iTerm.app":
          return d >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    return /-256(color)?$/i.test(r.TERM) ? 2 : /^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(r.TERM) || "COLORTERM" in r ? 1 : u;
  }
  function c(l) {
    const p = a(l, l && l.isTTY);
    return s(p);
  }
  return Li = {
    supportsColor: c,
    stdout: s(a(!0, t.isatty(1))),
    stderr: s(a(!0, t.isatty(2)))
  }, Li;
}
var ko;
function vy() {
  return ko || (ko = 1, function(e, t) {
    const n = Zc, r = vt;
    t.init = u, t.log = c, t.formatArgs = s, t.save = l, t.load = p, t.useColors = i, t.destroy = r.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    ), t.colors = [6, 2, 3, 4, 5, 1];
    try {
      const f = gy();
      f && (f.stderr || f).level >= 2 && (t.colors = [
        20,
        21,
        26,
        27,
        32,
        33,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        56,
        57,
        62,
        63,
        68,
        69,
        74,
        75,
        76,
        77,
        78,
        79,
        80,
        81,
        92,
        93,
        98,
        99,
        112,
        113,
        128,
        129,
        134,
        135,
        148,
        149,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        178,
        179,
        184,
        185,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        214,
        215,
        220,
        221
      ]);
    } catch {
    }
    t.inspectOpts = Object.keys(process.env).filter((f) => /^debug_/i.test(f)).reduce((f, m) => {
      const v = m.substring(6).toLowerCase().replace(/_([a-z])/g, (b, x) => x.toUpperCase());
      let g = process.env[m];
      return /^(yes|on|true|enabled)$/i.test(g) ? g = !0 : /^(no|off|false|disabled)$/i.test(g) ? g = !1 : g === "null" ? g = null : g = Number(g), f[v] = g, f;
    }, {});
    function i() {
      return "colors" in t.inspectOpts ? !!t.inspectOpts.colors : n.isatty(process.stderr.fd);
    }
    function s(f) {
      const { namespace: m, useColors: v } = this;
      if (v) {
        const g = this.color, b = "\x1B[3" + (g < 8 ? g : "8;5;" + g), x = `  ${b};1m${m} \x1B[0m`;
        f[0] = x + f[0].split(`
`).join(`
` + x), f.push(b + "m+" + e.exports.humanize(this.diff) + "\x1B[0m");
      } else
        f[0] = a() + m + " " + f[0];
    }
    function a() {
      return t.inspectOpts.hideDate ? "" : (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function c(...f) {
      return process.stderr.write(r.formatWithOptions(t.inspectOpts, ...f) + `
`);
    }
    function l(f) {
      f ? process.env.DEBUG = f : delete process.env.DEBUG;
    }
    function p() {
      return process.env.DEBUG;
    }
    function u(f) {
      f.inspectOpts = {};
      const m = Object.keys(t.inspectOpts);
      for (let v = 0; v < m.length; v++)
        f.inspectOpts[m[v]] = t.inspectOpts[m[v]];
    }
    e.exports = au()(t);
    const { formatters: d } = e.exports;
    d.o = function(f) {
      return this.inspectOpts.colors = this.useColors, r.inspect(f, this.inspectOpts).split(`
`).map((m) => m.trim()).join(" ");
    }, d.O = function(f) {
      return this.inspectOpts.colors = this.useColors, r.inspect(f, this.inspectOpts);
    };
  }(ir, ir.exports)), ir.exports;
}
var To;
function by() {
  return To || (To = 1, typeof process > "u" || process.type === "renderer" || process.browser === !0 || process.__nwjs ? nr.exports = my() : nr.exports = vy()), nr.exports;
}
var wn, xy = function() {
  if (!wn) {
    try {
      wn = by()("follow-redirects");
    } catch {
    }
    typeof wn != "function" && (wn = function() {
    });
  }
  wn.apply(null, arguments);
}, Zn = ks, $n = Zn.URL, yy = Br, wy = Mr, Hs = xe.Writable, Vs = Jp, ou = xy;
(function() {
  var t = typeof process < "u", n = typeof window < "u" && typeof document < "u", r = jt(Error.captureStackTrace);
  !t && (n || !r) && console.warn("The follow-redirects package should be excluded from browser builds.");
})();
var Zs = !1;
try {
  Vs(new $n(""));
} catch (e) {
  Zs = e.code === "ERR_INVALID_URL";
}
var Ey = [
  "Authorization",
  "Proxy-Authorization",
  "Cookie"
], _y = [
  "auth",
  "host",
  "hostname",
  "href",
  "path",
  "pathname",
  "port",
  "protocol",
  "query",
  "search",
  "hash"
], Ws = ["abort", "aborted", "connect", "error", "socket", "timeout"], Gs = /* @__PURE__ */ Object.create(null);
Ws.forEach(function(e) {
  Gs[e] = function(t, n, r) {
    this._redirectable.emit(e, t, n, r);
  };
});
var us = Wn(
  "ERR_INVALID_URL",
  "Invalid URL",
  TypeError
), ps = Wn(
  "ERR_FR_REDIRECTION_FAILURE",
  "Redirected request failed"
), Sy = Wn(
  "ERR_FR_TOO_MANY_REDIRECTS",
  "Maximum number of redirects exceeded",
  ps
), Ay = Wn(
  "ERR_FR_MAX_BODY_LENGTH_EXCEEDED",
  "Request body larger than maxBodyLength limit"
), ky = Wn(
  "ERR_STREAM_WRITE_AFTER_END",
  "write after end"
), Ty = Hs.prototype.destroy || lu;
function $e(e, t) {
  Hs.call(this), this._sanitizeOptions(e), this._options = e, this._ended = !1, this._ending = !1, this._redirectCount = 0, this._redirects = [], this._requestBodyLength = 0, this._requestBodyBuffers = [], t && this.on("response", t);
  var n = this;
  this._onNativeResponse = function(r) {
    try {
      n._processResponse(r);
    } catch (i) {
      n.emit("error", i instanceof ps ? i : new ps({ cause: i }));
    }
  }, this._headerFilter = new RegExp("^(?:" + Ey.concat(e.sensitiveHeaders).map($y).join("|") + ")$", "i"), this._performRequest();
}
$e.prototype = Object.create(Hs.prototype);
$e.prototype.abort = function() {
  Ks(this._currentRequest), this._currentRequest.abort(), this.emit("abort");
};
$e.prototype.destroy = function(e) {
  return Ks(this._currentRequest, e), Ty.call(this, e), this;
};
$e.prototype.write = function(e, t, n) {
  if (this._ending)
    throw new ky();
  if (!St(e) && !Iy(e))
    throw new TypeError("data should be a string, Buffer or Uint8Array");
  if (jt(t) && (n = t, t = null), e.length === 0) {
    n && n();
    return;
  }
  this._requestBodyLength + e.length <= this._options.maxBodyLength ? (this._requestBodyLength += e.length, this._requestBodyBuffers.push({ data: e, encoding: t }), this._currentRequest.write(e, t, n)) : (this.emit("error", new Ay()), this.abort());
};
$e.prototype.end = function(e, t, n) {
  if (jt(e) ? (n = e, e = t = null) : jt(t) && (n = t, t = null), !e)
    this._ended = this._ending = !0, this._currentRequest.end(null, null, n);
  else {
    var r = this, i = this._currentRequest;
    this.write(e, t, function() {
      r._ended = !0, i.end(null, null, n);
    }), this._ending = !0;
  }
};
$e.prototype.setHeader = function(e, t) {
  this._options.headers[e] = t, this._currentRequest.setHeader(e, t);
};
$e.prototype.removeHeader = function(e) {
  delete this._options.headers[e], this._currentRequest.removeHeader(e);
};
$e.prototype.setTimeout = function(e, t) {
  var n = this;
  function r(a) {
    a.setTimeout(e), a.removeListener("timeout", a.destroy), a.addListener("timeout", a.destroy);
  }
  function i(a) {
    n._timeout && clearTimeout(n._timeout), n._timeout = setTimeout(function() {
      n.emit("timeout"), s();
    }, e), r(a);
  }
  function s() {
    n._timeout && (clearTimeout(n._timeout), n._timeout = null), n.removeListener("abort", s), n.removeListener("error", s), n.removeListener("response", s), n.removeListener("close", s), t && n.removeListener("timeout", t), n.socket || n._currentRequest.removeListener("socket", i);
  }
  return t && this.on("timeout", t), this.socket ? i(this.socket) : this._currentRequest.once("socket", i), this.on("socket", r), this.on("abort", s), this.on("error", s), this.on("response", s), this.on("close", s), this;
};
[
  "flushHeaders",
  "getHeader",
  "setNoDelay",
  "setSocketKeepAlive"
].forEach(function(e) {
  $e.prototype[e] = function(t, n) {
    return this._currentRequest[e](t, n);
  };
});
["aborted", "connection", "socket"].forEach(function(e) {
  Object.defineProperty($e.prototype, e, {
    get: function() {
      return this._currentRequest[e];
    }
  });
});
$e.prototype._sanitizeOptions = function(e) {
  if (e.headers || (e.headers = {}), jy(e.sensitiveHeaders) || (e.sensitiveHeaders = []), e.host && (e.hostname || (e.hostname = e.host), delete e.host), !e.pathname && e.path) {
    var t = e.path.indexOf("?");
    t < 0 ? e.pathname = e.path : (e.pathname = e.path.substring(0, t), e.search = e.path.substring(t));
  }
};
$e.prototype._performRequest = function() {
  var e = this._options.protocol, t = this._options.nativeProtocols[e];
  if (!t)
    throw new TypeError("Unsupported protocol " + e);
  if (this._options.agents) {
    var n = e.slice(0, -1);
    this._options.agent = this._options.agents[n];
  }
  var r = this._currentRequest = t.request(this._options, this._onNativeResponse);
  r._redirectable = this;
  for (var i of Ws)
    r.on(i, Gs[i]);
  if (this._currentUrl = /^\//.test(this._options.path) ? Zn.format(this._options) : (
    // When making a request to a proxy, […]
    // a client MUST send the target URI in absolute-form […].
    this._options.path
  ), this._isRedirect) {
    var s = 0, a = this, c = this._requestBodyBuffers;
    (function l(p) {
      if (r === a._currentRequest)
        if (p)
          a.emit("error", p);
        else if (s < c.length) {
          var u = c[s++];
          r.finished || r.write(u.data, u.encoding, l);
        } else a._ended && r.end();
    })();
  }
};
$e.prototype._processResponse = function(e) {
  var t = e.statusCode;
  this._options.trackRedirects && this._redirects.push({
    url: this._currentUrl,
    headers: e.headers,
    statusCode: t
  });
  var n = e.headers.location;
  if (!n || this._options.followRedirects === !1 || t < 300 || t >= 400) {
    e.responseUrl = this._currentUrl, e.redirects = this._redirects, this.emit("response", e), this._requestBodyBuffers = [];
    return;
  }
  if (Ks(this._currentRequest), e.destroy(), ++this._redirectCount > this._options.maxRedirects)
    throw new Sy();
  var r, i = this._options.beforeRedirect;
  i && (r = Object.assign({
    // The Host header was set by nativeProtocol.request
    Host: e.req.getHeader("host")
  }, this._options.headers));
  var s = this._options.method;
  ((t === 301 || t === 302) && this._options.method === "POST" || // RFC7231§6.4.4: The 303 (See Other) status code indicates that
  // the server is redirecting the user agent to a different resource […]
  // A user agent can perform a retrieval request targeting that URI
  // (a GET or HEAD request if using HTTP) […]
  t === 303 && !/^(?:GET|HEAD)$/.test(this._options.method)) && (this._options.method = "GET", this._requestBodyBuffers = [], Di(/^content-/i, this._options.headers));
  var a = Di(/^host$/i, this._options.headers), c = Js(this._currentUrl), l = a || c.host, p = /^\w+:/.test(n) ? this._currentUrl : Zn.format(Object.assign(c, { host: l })), u = Py(n, p);
  if (ou("redirecting to", u.href), this._isRedirect = !0, ds(u, this._options), (u.protocol !== c.protocol && u.protocol !== "https:" || u.host !== l && !Ry(u.host, l)) && Di(this._headerFilter, this._options.headers), jt(i)) {
    var d = {
      headers: e.headers,
      statusCode: t
    }, f = {
      url: p,
      method: s,
      headers: r
    };
    i(this._options, d, f), this._sanitizeOptions(this._options);
  }
  this._performRequest();
};
function cu(e) {
  var t = {
    maxRedirects: 21,
    maxBodyLength: 10485760
  }, n = {};
  return Object.keys(e).forEach(function(r) {
    var i = r + ":", s = n[i] = e[r], a = t[r] = Object.create(s);
    function c(p, u, d) {
      return Oy(p) ? p = ds(p) : St(p) ? p = ds(Js(p)) : (d = u, u = uu(p), p = { protocol: i }), jt(u) && (d = u, u = null), u = Object.assign({
        maxRedirects: t.maxRedirects,
        maxBodyLength: t.maxBodyLength
      }, p, u), u.nativeProtocols = n, !St(u.host) && !St(u.hostname) && (u.hostname = "::1"), Vs.equal(u.protocol, i, "protocol mismatch"), ou("options", u), new $e(u, d);
    }
    function l(p, u, d) {
      var f = a.request(p, u, d);
      return f.end(), f;
    }
    Object.defineProperties(a, {
      request: { value: c, configurable: !0, enumerable: !0, writable: !0 },
      get: { value: l, configurable: !0, enumerable: !0, writable: !0 }
    });
  }), t;
}
function lu() {
}
function Js(e) {
  var t;
  if (Zs)
    t = new $n(e);
  else if (t = uu(Zn.parse(e)), !St(t.protocol))
    throw new us({ input: e });
  return t;
}
function Py(e, t) {
  return Zs ? new $n(e, t) : Js(Zn.resolve(t, e));
}
function uu(e) {
  if (/^\[/.test(e.hostname) && !/^\[[:0-9a-f]+\]$/i.test(e.hostname))
    throw new us({ input: e.href || e });
  if (/^\[/.test(e.host) && !/^\[[:0-9a-f]+\](:\d+)?$/i.test(e.host))
    throw new us({ input: e.href || e });
  return e;
}
function ds(e, t) {
  var n = t || {};
  for (var r of _y)
    n[r] = e[r];
  return n.hostname.startsWith("[") && (n.hostname = n.hostname.slice(1, -1)), n.port !== "" && (n.port = Number(n.port)), n.path = n.search ? n.pathname + n.search : n.pathname, n;
}
function Di(e, t) {
  var n;
  for (var r in t)
    e.test(r) && (n = t[r], delete t[r]);
  return n === null || typeof n > "u" ? void 0 : String(n).trim();
}
function Wn(e, t, n) {
  function r(i) {
    jt(Error.captureStackTrace) && Error.captureStackTrace(this, this.constructor), Object.assign(this, i || {}), this.code = e, this.message = this.cause ? t + ": " + this.cause.message : t;
  }
  return r.prototype = new (n || Error)(), Object.defineProperties(r.prototype, {
    constructor: {
      value: r,
      enumerable: !1
    },
    name: {
      value: "Error [" + e + "]",
      enumerable: !1
    }
  }), r;
}
function Ks(e, t) {
  for (var n of Ws)
    e.removeListener(n, Gs[n]);
  e.on("error", lu), e.destroy(t);
}
function Ry(e, t) {
  Vs(St(e) && St(t));
  var n = e.length - t.length - 1;
  return n > 0 && e[n] === "." && e.endsWith(t);
}
function jy(e) {
  return e instanceof Array;
}
function St(e) {
  return typeof e == "string" || e instanceof String;
}
function jt(e) {
  return typeof e == "function";
}
function Iy(e) {
  return typeof e == "object" && "length" in e;
}
function Oy(e) {
  return $n && e instanceof $n;
}
function $y(e) {
  return e.replace(/[\]\\/()*+?.$]/g, "\\$&");
}
qs.exports = cu({ http: yy, https: wy });
qs.exports.wrap = cu;
var Ny = qs.exports;
const Cy = /* @__PURE__ */ Nt(Ny), $r = "1.15.2";
function pu(e) {
  const t = /^([-+\w]{1,25})(:?\/\/|:)/.exec(e);
  return t && t[1] || "";
}
const Ly = /^(?:([^;]+);)?(?:[^;]+;)?(base64|),([\s\S]*)$/;
function Dy(e, t, n) {
  const r = n && n.Blob || oe.classes.Blob, i = pu(e);
  if (t === void 0 && r && (t = !0), i === "data") {
    e = i.length ? e.slice(i.length + 1) : e;
    const s = Ly.exec(e);
    if (!s)
      throw new S("Invalid URL", S.ERR_INVALID_URL);
    const a = s[1], c = s[2], l = s[3], p = Buffer.from(decodeURIComponent(l), c ? "base64" : "utf8");
    if (t) {
      if (!r)
        throw new S("Blob is not supported", S.ERR_NOT_SUPPORT);
      return new r([p], { type: a });
    }
    return p;
  }
  throw new S("Unsupported protocol " + i, S.ERR_NOT_SUPPORT);
}
const zi = Symbol("internals");
class Po extends xe.Transform {
  constructor(t) {
    t = h.toFlatObject(
      t,
      {
        maxRate: 0,
        chunkSize: 64 * 1024,
        minChunkSize: 100,
        timeWindow: 500,
        ticksRate: 2,
        samplesCount: 15
      },
      null,
      (r, i) => !h.isUndefined(i[r])
    ), super({
      readableHighWaterMark: t.chunkSize
    });
    const n = this[zi] = {
      timeWindow: t.timeWindow,
      chunkSize: t.chunkSize,
      maxRate: t.maxRate,
      minChunkSize: t.minChunkSize,
      bytesSeen: 0,
      isCaptured: !1,
      notifiedBytesLoaded: 0,
      ts: Date.now(),
      bytes: 0,
      onReadCallback: null
    };
    this.on("newListener", (r) => {
      r === "progress" && (n.isCaptured || (n.isCaptured = !0));
    });
  }
  _read(t) {
    const n = this[zi];
    return n.onReadCallback && n.onReadCallback(), super._read(t);
  }
  _transform(t, n, r) {
    const i = this[zi], s = i.maxRate, a = this.readableHighWaterMark, c = i.timeWindow, l = 1e3 / c, p = s / l, u = i.minChunkSize !== !1 ? Math.max(i.minChunkSize, p * 0.01) : 0, d = (m, v) => {
      const g = Buffer.byteLength(m);
      i.bytesSeen += g, i.bytes += g, i.isCaptured && this.emit("progress", i.bytesSeen), this.push(m) ? process.nextTick(v) : i.onReadCallback = () => {
        i.onReadCallback = null, process.nextTick(v);
      };
    }, f = (m, v) => {
      const g = Buffer.byteLength(m);
      let b = null, x = a, I, D = 0;
      if (s) {
        const P = Date.now();
        (!i.ts || (D = P - i.ts) >= c) && (i.ts = P, I = p - i.bytes, i.bytes = I < 0 ? -I : 0, D = 0), I = p - i.bytes;
      }
      if (s) {
        if (I <= 0)
          return setTimeout(() => {
            v(null, m);
          }, c - D);
        I < x && (x = I);
      }
      x && g > x && g - x > u && (b = m.subarray(x), m = m.subarray(0, x)), d(
        m,
        b ? () => {
          process.nextTick(v, null, b);
        } : v
      );
    };
    f(t, function m(v, g) {
      if (v)
        return r(v);
      g ? f(g, m) : r(null);
    });
  }
}
const { asyncIterator: Ro } = Symbol, du = async function* (e) {
  e.stream ? yield* e.stream() : e.arrayBuffer ? yield await e.arrayBuffer() : e[Ro] ? yield* e[Ro]() : yield e;
}, zy = oe.ALPHABET.ALPHA_DIGIT + "-_", Nn = typeof TextEncoder == "function" ? new TextEncoder() : new vt.TextEncoder(), Et = `\r
`, Fy = Nn.encode(Et), Uy = 2;
class By {
  constructor(t, n) {
    const { escapeName: r } = this.constructor, i = h.isString(n);
    let s = `Content-Disposition: form-data; name="${r(t)}"${!i && n.name ? `; filename="${r(n.name)}"` : ""}${Et}`;
    if (i)
      n = Nn.encode(String(n).replace(/\r?\n|\r\n?/g, Et));
    else {
      const a = String(n.type || "application/octet-stream").replace(/[\r\n]/g, "");
      s += `Content-Type: ${a}${Et}`;
    }
    this.headers = Nn.encode(s + Et), this.contentLength = i ? n.byteLength : n.size, this.size = this.headers.byteLength + this.contentLength + Uy, this.name = t, this.value = n;
  }
  async *encode() {
    yield this.headers;
    const { value: t } = this;
    h.isTypedArray(t) ? yield t : yield* du(t), yield Fy;
  }
  static escapeName(t) {
    return String(t).replace(
      /[\r\n"]/g,
      (n) => ({
        "\r": "%0D",
        "\n": "%0A",
        '"': "%22"
      })[n]
    );
  }
}
const My = (e, t, n) => {
  const {
    tag: r = "form-data-boundary",
    size: i = 25,
    boundary: s = r + "-" + oe.generateString(i, zy)
  } = n || {};
  if (!h.isFormData(e))
    throw TypeError("FormData instance required");
  if (s.length < 1 || s.length > 70)
    throw Error("boundary must be 10-70 characters long");
  const a = Nn.encode("--" + s + Et), c = Nn.encode("--" + s + "--" + Et);
  let l = c.byteLength;
  const p = Array.from(e.entries()).map(([d, f]) => {
    const m = new By(d, f);
    return l += m.size, m;
  });
  l += a.byteLength * p.length, l = h.toFiniteNumber(l);
  const u = {
    "Content-Type": `multipart/form-data; boundary=${s}`
  };
  return Number.isFinite(l) && (u["Content-Length"] = l), t && t(u), Gp.from(
    async function* () {
      for (const d of p)
        yield a, yield* d.encode();
      yield c;
    }()
  );
};
class qy extends xe.Transform {
  __transform(t, n, r) {
    this.push(t), r();
  }
  _transform(t, n, r) {
    if (t.length !== 0 && (this._transform = this.__transform, t[0] !== 120)) {
      const i = Buffer.alloc(2);
      i[0] = 120, i[1] = 156, this.push(i, n);
    }
    this.__transform(t, n, r);
  }
}
const Hy = (e, t) => h.isAsyncFn(e) ? function(...n) {
  const r = n.pop();
  e.apply(this, n).then((i) => {
    try {
      t ? r(null, ...t(i)) : r(null, i);
    } catch (s) {
      r(s);
    }
  }, r);
} : e, Vy = /* @__PURE__ */ new Set(["localhost"]), fu = (e) => {
  const t = e.split(".");
  return t.length !== 4 || t[0] !== "127" ? !1 : t.every((n) => /^\d+$/.test(n) && Number(n) >= 0 && Number(n) <= 255);
}, Zy = (e) => {
  if (e === "::1") return !0;
  const t = e.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (t) return fu(t[1]);
  const n = e.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (n) {
    const i = parseInt(n[1], 16);
    return i >= 32512 && i <= 32767;
  }
  const r = e.split(":");
  if (r.length === 8) {
    for (let i = 0; i < 7; i++)
      if (!/^0+$/.test(r[i])) return !1;
    return /^0*1$/.test(r[7]);
  }
  return !1;
}, jo = (e) => e ? Vy.has(e) || fu(e) ? !0 : Zy(e) : !1, Wy = {
  http: 80,
  https: 443,
  ws: 80,
  wss: 443,
  ftp: 21
}, Gy = (e) => {
  let t = e, n = 0;
  if (t.charAt(0) === "[") {
    const s = t.indexOf("]");
    if (s !== -1) {
      const a = t.slice(1, s), c = t.slice(s + 1);
      return c.charAt(0) === ":" && /^\d+$/.test(c.slice(1)) && (n = Number.parseInt(c.slice(1), 10)), [a, n];
    }
  }
  const r = t.indexOf(":"), i = t.lastIndexOf(":");
  return r !== -1 && r === i && /^\d+$/.test(t.slice(i + 1)) && (n = Number.parseInt(t.slice(i + 1), 10), t = t.slice(0, i)), [t, n];
}, Io = (e) => e && (e.charAt(0) === "[" && e.charAt(e.length - 1) === "]" && (e = e.slice(1, -1)), e.replace(/\.+$/, ""));
function Jy(e) {
  let t;
  try {
    t = new URL(e);
  } catch {
    return !1;
  }
  const n = (process.env.no_proxy || process.env.NO_PROXY || "").toLowerCase();
  if (!n)
    return !1;
  if (n === "*")
    return !0;
  const r = Number.parseInt(t.port, 10) || Wy[t.protocol.split(":", 1)[0]] || 0, i = Io(t.hostname.toLowerCase());
  return n.split(/[\s,]+/).some((s) => {
    if (!s)
      return !1;
    let [a, c] = Gy(s);
    return a = Io(a), !a || c && c !== r ? !1 : (a.charAt(0) === "*" && (a = a.slice(1)), a.charAt(0) === "." ? i.endsWith(a) : i === a || jo(i) && jo(a));
  });
}
function Ky(e, t) {
  e = e || 10;
  const n = new Array(e), r = new Array(e);
  let i = 0, s = 0, a;
  return t = t !== void 0 ? t : 1e3, function(l) {
    const p = Date.now(), u = r[s];
    a || (a = p), n[i] = l, r[i] = p;
    let d = s, f = 0;
    for (; d !== i; )
      f += n[d++], d = d % e;
    if (i = (i + 1) % e, i === s && (s = (s + 1) % e), p - a < t)
      return;
    const m = u && p - u;
    return m ? Math.round(f * 1e3 / m) : void 0;
  };
}
function Xy(e, t) {
  let n = 0, r = 1e3 / t, i, s;
  const a = (p, u = Date.now()) => {
    n = u, i = null, s && (clearTimeout(s), s = null), e(...p);
  };
  return [(...p) => {
    const u = Date.now(), d = u - n;
    d >= r ? a(p, u) : (i = p, s || (s = setTimeout(() => {
      s = null, a(i);
    }, r - d)));
  }, () => i && a(i)];
}
const ln = (e, t, n = 3) => {
  let r = 0;
  const i = Ky(50, 250);
  return Xy((s) => {
    const a = s.loaded, c = s.lengthComputable ? s.total : void 0, l = c != null ? Math.min(a, c) : a, p = Math.max(0, l - r), u = i(p);
    r = Math.max(r, l);
    const d = {
      loaded: l,
      total: c,
      progress: c ? l / c : void 0,
      bytes: p,
      rate: u || void 0,
      estimated: u && c ? (c - l) / u : void 0,
      event: s,
      lengthComputable: c != null,
      [t ? "download" : "upload"]: !0
    };
    e(d);
  }, n);
}, Nr = (e, t) => {
  const n = e != null;
  return [
    (r) => t[0]({
      lengthComputable: n,
      total: e,
      loaded: r
    }),
    t[1]
  ];
}, Cr = (e) => (...t) => h.asap(() => e(...t));
function Yy(e) {
  if (!e || typeof e != "string" || !e.startsWith("data:")) return 0;
  const t = e.indexOf(",");
  if (t < 0) return 0;
  const n = e.slice(5, t), r = e.slice(t + 1);
  if (/;base64/i.test(n)) {
    let s = r.length;
    const a = r.length;
    for (let f = 0; f < a; f++)
      if (r.charCodeAt(f) === 37 && f + 2 < a) {
        const m = r.charCodeAt(f + 1), v = r.charCodeAt(f + 2);
        (m >= 48 && m <= 57 || m >= 65 && m <= 70 || m >= 97 && m <= 102) && (v >= 48 && v <= 57 || v >= 65 && v <= 70 || v >= 97 && v <= 102) && (s -= 2, f += 2);
      }
    let c = 0, l = a - 1;
    const p = (f) => f >= 2 && r.charCodeAt(f - 2) === 37 && // '%'
    r.charCodeAt(f - 1) === 51 && // '3'
    (r.charCodeAt(f) === 68 || r.charCodeAt(f) === 100);
    l >= 0 && (r.charCodeAt(l) === 61 ? (c++, l--) : p(l) && (c++, l -= 3)), c === 1 && l >= 0 && (r.charCodeAt(l) === 61 || p(l)) && c++;
    const d = Math.floor(s / 4) * 3 - (c || 0);
    return d > 0 ? d : 0;
  }
  return Buffer.byteLength(r, "utf8");
}
const Oo = {
  flush: ut.constants.Z_SYNC_FLUSH,
  finishFlush: ut.constants.Z_SYNC_FLUSH
}, Qy = {
  flush: ut.constants.BROTLI_OPERATION_FLUSH,
  finishFlush: ut.constants.BROTLI_OPERATION_FLUSH
}, $o = h.isFunction(ut.createBrotliDecompress), { http: e0, https: t0 } = Cy, n0 = /https:?/, No = Symbol("axios.http.socketListener"), sr = Symbol("axios.http.currentReq"), Co = oe.protocols.map((e) => e + ":"), Lo = (e, [t, n]) => (e.on("end", n).on("error", n), t);
class r0 {
  constructor() {
    this.sessions = /* @__PURE__ */ Object.create(null);
  }
  getSession(t, n) {
    n = Object.assign(
      {
        sessionTimeout: 1e3
      },
      n
    );
    let r = this.sessions[t];
    if (r) {
      let u = r.length;
      for (let d = 0; d < u; d++) {
        const [f, m] = r[d];
        if (!f.destroyed && !f.closed && vt.isDeepStrictEqual(m, n))
          return f;
      }
    }
    const i = Vc.connect(t, n);
    let s;
    const a = () => {
      if (s)
        return;
      s = !0;
      let u = r, d = u.length, f = d;
      for (; f--; )
        if (u[f][0] === i) {
          d === 1 ? delete this.sessions[t] : u.splice(f, 1), i.closed || i.close();
          return;
        }
    }, c = i.request, { sessionTimeout: l } = n;
    if (l != null) {
      let u, d = 0;
      i.request = function() {
        const f = c.apply(this, arguments);
        return d++, u && (clearTimeout(u), u = null), f.once("close", () => {
          --d || (u = setTimeout(() => {
            u = null, a();
          }, l));
        }), f;
      };
    }
    i.once("close", a);
    let p = [i, n];
    return r ? r.push(p) : r = this.sessions[t] = [p], i;
  }
}
const i0 = new r0();
function s0(e, t) {
  e.beforeRedirects.proxy && e.beforeRedirects.proxy(e), e.beforeRedirects.config && e.beforeRedirects.config(e, t);
}
function mu(e, t, n) {
  let r = t;
  if (!r && r !== !1) {
    const i = py(n);
    i && (Jy(n) || (r = new URL(i)));
  }
  if (r) {
    if (r.username && (r.auth = (r.username || "") + ":" + (r.password || "")), r.auth) {
      if (!!(r.auth.username || r.auth.password))
        r.auth = (r.auth.username || "") + ":" + (r.auth.password || "");
      else if (typeof r.auth == "object")
        throw new S("Invalid proxy authorization", S.ERR_BAD_OPTION, { proxy: r });
      const a = Buffer.from(r.auth, "utf8").toString("base64");
      e.headers["Proxy-Authorization"] = "Basic " + a;
    }
    e.headers.host = e.hostname + (e.port ? ":" + e.port : "");
    const i = r.hostname || r.host;
    e.hostname = i, e.host = i, e.port = r.port, e.path = n, r.protocol && (e.protocol = r.protocol.includes(":") ? r.protocol : `${r.protocol}:`);
  }
  e.beforeRedirects.proxy = function(s) {
    mu(s, t, s.href);
  };
}
const a0 = typeof process < "u" && h.kindOf(process) === "process", o0 = (e) => new Promise((t, n) => {
  let r, i;
  const s = (l, p) => {
    i || (i = !0, r && r(l, p));
  }, a = (l) => {
    s(l), t(l);
  }, c = (l) => {
    s(l, !0), n(l);
  };
  e(a, c, (l) => r = l).catch(c);
}), c0 = ({ address: e, family: t }) => {
  if (!h.isString(e))
    throw TypeError("address must be a string");
  return {
    address: e,
    family: t || (e.indexOf(".") < 0 ? 6 : 4)
  };
}, Do = (e, t) => c0(h.isObject(e) ? e : { address: e, family: t }), l0 = {
  request(e, t) {
    const n = e.protocol + "//" + e.hostname + ":" + (e.port || (e.protocol === "https:" ? 443 : 80)), { http2Options: r, headers: i } = e, s = i0.getSession(n, r), { HTTP2_HEADER_SCHEME: a, HTTP2_HEADER_METHOD: c, HTTP2_HEADER_PATH: l, HTTP2_HEADER_STATUS: p } = Vc.constants, u = {
      [a]: e.protocol.replace(":", ""),
      [c]: e.method,
      [l]: e.path
    };
    h.forEach(i, (f, m) => {
      m.charAt(0) !== ":" && (u[m] = f);
    });
    const d = s.request(u);
    return d.once("response", (f) => {
      const m = d;
      f = Object.assign({}, f);
      const v = f[p];
      delete f[p], m.headers = f, m.statusCode = +v, t(m);
    }), d;
  }
}, u0 = a0 && function(t) {
  return o0(async function(r, i, s) {
    const a = (y) => h.hasOwnProp(t, y) ? t[y] : void 0;
    let c = a("data"), l = a("lookup"), p = a("family"), u = a("httpVersion");
    u === void 0 && (u = 1);
    let d = a("http2Options");
    const f = a("responseType"), m = a("responseEncoding"), v = t.method.toUpperCase();
    let g, b = !1, x;
    if (u = +u, Number.isNaN(u))
      throw TypeError(`Invalid protocol version: '${t.httpVersion}' is not a number`);
    if (u !== 1 && u !== 2)
      throw TypeError(`Unsupported protocol version '${u}'`);
    const I = u === 2;
    if (l) {
      const y = Hy(l, (E) => h.isArray(E) ? E : [E]);
      l = (E, j, $) => {
        y(E, j, (z, G, V) => {
          if (z)
            return $(z);
          const X = h.isArray(G) ? G.map((Ft) => Do(Ft)) : [Do(G, V)];
          j.all ? $(z, X) : $(z, X[0].address, X[0].family);
        });
      };
    }
    const D = new Kp();
    function P(y) {
      try {
        D.emit(
          "abort",
          !y || y.type ? new Rt(null, t, x) : y
        );
      } catch (E) {
        console.warn("emit error", E);
      }
    }
    D.once("abort", i);
    const C = () => {
      t.cancelToken && t.cancelToken.unsubscribe(P), t.signal && t.signal.removeEventListener("abort", P), D.removeAllListeners();
    };
    (t.cancelToken || t.signal) && (t.cancelToken && t.cancelToken.subscribe(P), t.signal && (t.signal.aborted ? P() : t.signal.addEventListener("abort", P))), s((y, E) => {
      if (g = !0, E) {
        b = !0, C();
        return;
      }
      const { data: j } = y;
      if (j instanceof xe.Readable || j instanceof xe.Duplex) {
        const $ = xe.finished(j, () => {
          $(), C();
        });
      } else
        C();
    });
    const q = Ms(t.baseURL, t.url, t.allowAbsoluteUrls), L = new URL(q, oe.hasBrowserEnv ? oe.origin : void 0), ne = L.protocol || Co[0];
    if (ne === "data:") {
      if (t.maxContentLength > -1) {
        const E = String(t.url || q || "");
        if (Yy(E) > t.maxContentLength)
          return i(
            new S(
              "maxContentLength size of " + t.maxContentLength + " exceeded",
              S.ERR_BAD_RESPONSE,
              t
            )
          );
      }
      let y;
      if (v !== "GET")
        return Kt(r, i, {
          status: 405,
          statusText: "method not allowed",
          headers: {},
          config: t
        });
      try {
        y = Dy(t.url, f === "blob", {
          Blob: t.env && t.env.Blob
        });
      } catch (E) {
        throw S.from(E, S.ERR_BAD_REQUEST, t);
      }
      return f === "text" ? (y = y.toString(m), (!m || m === "utf8") && (y = h.stripBOM(y))) : f === "stream" && (y = xe.Readable.from(y)), Kt(r, i, {
        data: y,
        status: 200,
        statusText: "OK",
        headers: new ye(),
        config: t
      });
    }
    if (Co.indexOf(ne) === -1)
      return i(
        new S("Unsupported protocol " + ne, S.ERR_BAD_REQUEST, t)
      );
    const K = ye.from(t.headers).normalize();
    K.set("User-Agent", "axios/" + $r, !1);
    const { onUploadProgress: Le, onDownloadProgress: it } = t, Me = t.maxRate;
    let De, Re;
    if (h.isSpecCompliantForm(c)) {
      const y = K.getContentType(/boundary=([-_\w\d]{10,70})/i);
      c = My(
        c,
        (E) => {
          K.set(E);
        },
        {
          tag: `axios-${$r}-boundary`,
          boundary: y && y[1] || void 0
        }
      );
    } else if (h.isFormData(c) && h.isFunction(c.getHeaders) && c.getHeaders !== Object.prototype.getHeaders) {
      if (K.set(c.getHeaders()), !K.hasContentLength())
        try {
          const y = await vt.promisify(c.getLength).call(c);
          Number.isFinite(y) && y >= 0 && K.setContentLength(y);
        } catch {
        }
    } else if (h.isBlob(c) || h.isFile(c))
      c.size && K.setContentType(c.type || "application/octet-stream"), K.setContentLength(c.size || 0), c = xe.Readable.from(du(c));
    else if (c && !h.isStream(c)) {
      if (!Buffer.isBuffer(c)) if (h.isArrayBuffer(c))
        c = Buffer.from(new Uint8Array(c));
      else if (h.isString(c))
        c = Buffer.from(c, "utf-8");
      else
        return i(
          new S(
            "Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream",
            S.ERR_BAD_REQUEST,
            t
          )
        );
      if (K.setContentLength(c.length, !1), t.maxBodyLength > -1 && c.length > t.maxBodyLength)
        return i(
          new S(
            "Request body larger than maxBodyLength limit",
            S.ERR_BAD_REQUEST,
            t
          )
        );
    }
    const zt = h.toFiniteNumber(K.getContentLength());
    h.isArray(Me) ? (De = Me[0], Re = Me[1]) : De = Re = Me, c && (Le || De) && (h.isStream(c) || (c = xe.Readable.from(c, { objectMode: !1 })), c = xe.pipeline(
      [
        c,
        new Po({
          maxRate: h.toFiniteNumber(De)
        })
      ],
      h.noop
    ), Le && c.on(
      "progress",
      Lo(
        c,
        Nr(
          zt,
          ln(Cr(Le), !1, 3)
        )
      )
    ));
    let re;
    const A = a("auth");
    if (A) {
      const y = A.username || "", E = A.password || "";
      re = y + ":" + E;
    }
    if (!re && L.username) {
      const y = L.username, E = L.password;
      re = y + ":" + E;
    }
    re && K.delete("authorization");
    let _;
    try {
      _ = Us(
        L.pathname + L.search,
        t.params,
        t.paramsSerializer
      ).replace(/^\?/, "");
    } catch (y) {
      const E = new Error(y.message);
      return E.config = t, E.url = t.url, E.exists = !0, i(E);
    }
    K.set(
      "Accept-Encoding",
      "gzip, compress, deflate" + ($o ? ", br" : ""),
      !1
    );
    const k = Object.assign(/* @__PURE__ */ Object.create(null), {
      path: _,
      method: v,
      headers: K.toJSON(),
      agents: { http: t.httpAgent, https: t.httpsAgent },
      auth: re,
      protocol: ne,
      family: p,
      beforeRedirect: s0,
      beforeRedirects: /* @__PURE__ */ Object.create(null),
      http2Options: d
    });
    if (!h.isUndefined(l) && (k.lookup = l), t.socketPath) {
      if (typeof t.socketPath != "string")
        return i(new S(
          "socketPath must be a string",
          S.ERR_BAD_OPTION_VALUE,
          t
        ));
      if (t.allowedSocketPaths != null) {
        const y = Array.isArray(t.allowedSocketPaths) ? t.allowedSocketPaths : [t.allowedSocketPaths], E = _a(t.socketPath);
        if (!y.some(
          ($) => typeof $ == "string" && _a($) === E
        ))
          return i(new S(
            `socketPath "${t.socketPath}" is not permitted by allowedSocketPaths`,
            S.ERR_BAD_OPTION_VALUE,
            t
          ));
      }
      k.socketPath = t.socketPath;
    } else
      k.hostname = L.hostname.startsWith("[") ? L.hostname.slice(1, -1) : L.hostname, k.port = L.port, mu(
        k,
        t.proxy,
        ne + "//" + L.hostname + (L.port ? ":" + L.port : "") + k.path
      );
    let O;
    const R = n0.test(k.protocol);
    if (k.agent = R ? t.httpsAgent : t.httpAgent, I)
      O = l0;
    else {
      const y = a("transport");
      if (y)
        O = y;
      else if (t.maxRedirects === 0)
        O = R ? Mr : Br;
      else {
        t.maxRedirects && (k.maxRedirects = t.maxRedirects);
        const E = a("beforeRedirect");
        E && (k.beforeRedirects.config = E), O = R ? t0 : e0;
      }
    }
    if (t.maxBodyLength > -1 ? k.maxBodyLength = t.maxBodyLength : k.maxBodyLength = 1 / 0, k.insecureHTTPParser = !!a("insecureHTTPParser"), x = O.request(k, function(E) {
      if (x.destroyed) return;
      const j = [E], $ = h.toFiniteNumber(E.headers["content-length"]);
      if (it || Re) {
        const X = new Po({
          maxRate: h.toFiniteNumber(Re)
        });
        it && X.on(
          "progress",
          Lo(
            X,
            Nr(
              $,
              ln(Cr(it), !0, 3)
            )
          )
        ), j.push(X);
      }
      let z = E;
      const G = E.req || x;
      if (t.decompress !== !1 && E.headers["content-encoding"])
        switch ((v === "HEAD" || E.statusCode === 204) && delete E.headers["content-encoding"], (E.headers["content-encoding"] || "").toLowerCase()) {
          case "gzip":
          case "x-gzip":
          case "compress":
          case "x-compress":
            j.push(ut.createUnzip(Oo)), delete E.headers["content-encoding"];
            break;
          case "deflate":
            j.push(new qy()), j.push(ut.createUnzip(Oo)), delete E.headers["content-encoding"];
            break;
          case "br":
            $o && (j.push(ut.createBrotliDecompress(Qy)), delete E.headers["content-encoding"]);
        }
      z = j.length > 1 ? xe.pipeline(j, h.noop) : j[0];
      const V = {
        status: E.statusCode,
        statusText: E.statusMessage,
        headers: new ye(E.headers),
        config: t,
        request: G
      };
      if (f === "stream") {
        if (t.maxContentLength > -1) {
          const X = t.maxContentLength, Ft = z;
          async function* xn() {
            let ge = 0;
            for await (const wa of Ft) {
              if (ge += wa.length, ge > X)
                throw new S(
                  "maxContentLength size of " + X + " exceeded",
                  S.ERR_BAD_RESPONSE,
                  t,
                  G
                );
              yield wa;
            }
          }
          z = xe.Readable.from(xn(), {
            objectMode: !1
          });
        }
        V.data = z, Kt(r, i, V);
      } else {
        const X = [];
        let Ft = 0;
        z.on("data", function(ge) {
          X.push(ge), Ft += ge.length, t.maxContentLength > -1 && Ft > t.maxContentLength && (b = !0, z.destroy(), P(
            new S(
              "maxContentLength size of " + t.maxContentLength + " exceeded",
              S.ERR_BAD_RESPONSE,
              t,
              G
            )
          ));
        }), z.on("aborted", function() {
          if (b)
            return;
          const ge = new S(
            "stream has been aborted",
            S.ERR_BAD_RESPONSE,
            t,
            G
          );
          z.destroy(ge), i(ge);
        }), z.on("error", function(ge) {
          x.destroyed || i(S.from(ge, null, t, G));
        }), z.on("end", function() {
          try {
            let ge = X.length === 1 ? X[0] : Buffer.concat(X);
            f !== "arraybuffer" && (ge = ge.toString(m), (!m || m === "utf8") && (ge = h.stripBOM(ge))), V.data = ge;
          } catch (ge) {
            return i(S.from(ge, null, t, V.request, V));
          }
          Kt(r, i, V);
        });
      }
      D.once("abort", (X) => {
        z.destroyed || (z.emit("error", X), z.destroy());
      });
    }), D.once("abort", (y) => {
      x.close ? x.close() : x.destroy(y);
    }), x.on("error", function(E) {
      i(S.from(E, null, t, x));
    }), x.on("socket", function(E) {
      E.setKeepAlive(!0, 1e3 * 60), E[No] || (E.on("error", function($) {
        const z = E[sr];
        z && !z.destroyed && z.destroy($);
      }), E[No] = !0), E[sr] = x, x.once("close", function() {
        E[sr] === x && (E[sr] = null);
      });
    }), t.timeout) {
      const y = parseInt(t.timeout, 10);
      if (Number.isNaN(y)) {
        P(
          new S(
            "error trying to parse `config.timeout` to int",
            S.ERR_BAD_OPTION_VALUE,
            t,
            x
          )
        );
        return;
      }
      x.setTimeout(y, function() {
        if (g) return;
        let j = t.timeout ? "timeout of " + t.timeout + "ms exceeded" : "timeout exceeded";
        const $ = t.transitional || ei;
        t.timeoutErrorMessage && (j = t.timeoutErrorMessage), P(
          new S(
            j,
            $.clarifyTimeoutError ? S.ETIMEDOUT : S.ECONNABORTED,
            t,
            x
          )
        );
      });
    } else
      x.setTimeout(0);
    if (h.isStream(c)) {
      let y = !1, E = !1;
      c.on("end", () => {
        y = !0;
      }), c.once("error", ($) => {
        E = !0, x.destroy($);
      }), c.on("close", () => {
        !y && !E && P(new Rt("Request stream has been aborted", t, x));
      });
      let j = c;
      if (t.maxBodyLength > -1 && t.maxRedirects === 0) {
        const $ = t.maxBodyLength;
        let z = 0;
        j = xe.pipeline(
          [
            c,
            new xe.Transform({
              transform(G, V, X) {
                if (z += G.length, z > $)
                  return X(
                    new S(
                      "Request body larger than maxBodyLength limit",
                      S.ERR_BAD_REQUEST,
                      t,
                      x
                    )
                  );
                X(null, G);
              }
            })
          ],
          h.noop
        ), j.on("error", (G) => {
          x.destroyed || x.destroy(G);
        });
      }
      j.pipe(x);
    } else
      c && x.write(c), x.end();
  });
}, p0 = oe.hasStandardBrowserEnv ? /* @__PURE__ */ ((e, t) => (n) => (n = new URL(n, oe.origin), e.protocol === n.protocol && e.host === n.host && (t || e.port === n.port)))(
  new URL(oe.origin),
  oe.navigator && /(msie|trident)/i.test(oe.navigator.userAgent)
) : () => !0, d0 = oe.hasStandardBrowserEnv ? (
  // Standard browser envs support document.cookie
  {
    write(e, t, n, r, i, s, a) {
      if (typeof document > "u") return;
      const c = [`${e}=${encodeURIComponent(t)}`];
      h.isNumber(n) && c.push(`expires=${new Date(n).toUTCString()}`), h.isString(r) && c.push(`path=${r}`), h.isString(i) && c.push(`domain=${i}`), s === !0 && c.push("secure"), h.isString(a) && c.push(`SameSite=${a}`), document.cookie = c.join("; ");
    },
    read(e) {
      if (typeof document > "u") return null;
      const t = document.cookie.match(new RegExp("(?:^|; )" + e + "=([^;]*)"));
      return t ? decodeURIComponent(t[1]) : null;
    },
    remove(e) {
      this.write(e, "", Date.now() - 864e5, "/");
    }
  }
) : (
  // Non-standard browser env (web workers, react-native) lack needed support.
  {
    write() {
    },
    read() {
      return null;
    },
    remove() {
    }
  }
), zo = (e) => e instanceof ye ? { ...e } : e;
function It(e, t) {
  t = t || {};
  const n = /* @__PURE__ */ Object.create(null);
  Object.defineProperty(n, "hasOwnProperty", {
    value: Object.prototype.hasOwnProperty,
    enumerable: !1,
    writable: !0,
    configurable: !0
  });
  function r(p, u, d, f) {
    return h.isPlainObject(p) && h.isPlainObject(u) ? h.merge.call({ caseless: f }, p, u) : h.isPlainObject(u) ? h.merge({}, u) : h.isArray(u) ? u.slice() : u;
  }
  function i(p, u, d, f) {
    if (h.isUndefined(u)) {
      if (!h.isUndefined(p))
        return r(void 0, p, d, f);
    } else return r(p, u, d, f);
  }
  function s(p, u) {
    if (!h.isUndefined(u))
      return r(void 0, u);
  }
  function a(p, u) {
    if (h.isUndefined(u)) {
      if (!h.isUndefined(p))
        return r(void 0, p);
    } else return r(void 0, u);
  }
  function c(p, u, d) {
    if (h.hasOwnProp(t, d))
      return r(p, u);
    if (h.hasOwnProp(e, d))
      return r(void 0, p);
  }
  const l = {
    url: s,
    method: s,
    data: s,
    baseURL: a,
    transformRequest: a,
    transformResponse: a,
    paramsSerializer: a,
    timeout: a,
    timeoutMessage: a,
    withCredentials: a,
    withXSRFToken: a,
    adapter: a,
    responseType: a,
    xsrfCookieName: a,
    xsrfHeaderName: a,
    onUploadProgress: a,
    onDownloadProgress: a,
    decompress: a,
    maxContentLength: a,
    maxBodyLength: a,
    beforeRedirect: a,
    transport: a,
    httpAgent: a,
    httpsAgent: a,
    cancelToken: a,
    socketPath: a,
    allowedSocketPaths: a,
    responseEncoding: a,
    validateStatus: c,
    headers: (p, u, d) => i(zo(p), zo(u), d, !0)
  };
  return h.forEach(Object.keys({ ...e, ...t }), function(u) {
    if (u === "__proto__" || u === "constructor" || u === "prototype") return;
    const d = h.hasOwnProp(l, u) ? l[u] : i, f = h.hasOwnProp(e, u) ? e[u] : void 0, m = h.hasOwnProp(t, u) ? t[u] : void 0, v = d(f, m, u);
    h.isUndefined(v) && d !== c || (n[u] = v);
  }), n;
}
const hu = (e) => {
  const t = It({}, e), n = (f) => h.hasOwnProp(t, f) ? t[f] : void 0, r = n("data");
  let i = n("withXSRFToken");
  const s = n("xsrfHeaderName"), a = n("xsrfCookieName");
  let c = n("headers");
  const l = n("auth"), p = n("baseURL"), u = n("allowAbsoluteUrls"), d = n("url");
  if (t.headers = c = ye.from(c), t.url = Us(
    Ms(p, d, u),
    e.params,
    e.paramsSerializer
  ), l && c.set(
    "Authorization",
    "Basic " + btoa(
      (l.username || "") + ":" + (l.password ? unescape(encodeURIComponent(l.password)) : "")
    )
  ), h.isFormData(r)) {
    if (oe.hasStandardBrowserEnv || oe.hasStandardBrowserWebWorkerEnv)
      c.setContentType(void 0);
    else if (h.isFunction(r.getHeaders)) {
      const f = r.getHeaders(), m = ["content-type", "content-length"];
      Object.entries(f).forEach(([v, g]) => {
        m.includes(v.toLowerCase()) && c.set(v, g);
      });
    }
  }
  if (oe.hasStandardBrowserEnv && (h.isFunction(i) && (i = i(t)), i === !0 || i == null && p0(t.url))) {
    const m = s && a && d0.read(a);
    m && c.set(s, m);
  }
  return t;
}, f0 = typeof XMLHttpRequest < "u", m0 = f0 && function(e) {
  return new Promise(function(n, r) {
    const i = hu(e);
    let s = i.data;
    const a = ye.from(i.headers).normalize();
    let { responseType: c, onUploadProgress: l, onDownloadProgress: p } = i, u, d, f, m, v;
    function g() {
      m && m(), v && v(), i.cancelToken && i.cancelToken.unsubscribe(u), i.signal && i.signal.removeEventListener("abort", u);
    }
    let b = new XMLHttpRequest();
    b.open(i.method.toUpperCase(), i.url, !0), b.timeout = i.timeout;
    function x() {
      if (!b)
        return;
      const D = ye.from(
        "getAllResponseHeaders" in b && b.getAllResponseHeaders()
      ), C = {
        data: !c || c === "text" || c === "json" ? b.responseText : b.response,
        status: b.status,
        statusText: b.statusText,
        headers: D,
        config: e,
        request: b
      };
      Kt(
        function(L) {
          n(L), g();
        },
        function(L) {
          r(L), g();
        },
        C
      ), b = null;
    }
    "onloadend" in b ? b.onloadend = x : b.onreadystatechange = function() {
      !b || b.readyState !== 4 || b.status === 0 && !(b.responseURL && b.responseURL.indexOf("file:") === 0) || setTimeout(x);
    }, b.onabort = function() {
      b && (r(new S("Request aborted", S.ECONNABORTED, e, b)), b = null);
    }, b.onerror = function(P) {
      const C = P && P.message ? P.message : "Network Error", q = new S(C, S.ERR_NETWORK, e, b);
      q.event = P || null, r(q), b = null;
    }, b.ontimeout = function() {
      let P = i.timeout ? "timeout of " + i.timeout + "ms exceeded" : "timeout exceeded";
      const C = i.transitional || ei;
      i.timeoutErrorMessage && (P = i.timeoutErrorMessage), r(
        new S(
          P,
          C.clarifyTimeoutError ? S.ETIMEDOUT : S.ECONNABORTED,
          e,
          b
        )
      ), b = null;
    }, s === void 0 && a.setContentType(null), "setRequestHeader" in b && h.forEach(a.toJSON(), function(P, C) {
      b.setRequestHeader(C, P);
    }), h.isUndefined(i.withCredentials) || (b.withCredentials = !!i.withCredentials), c && c !== "json" && (b.responseType = i.responseType), p && ([f, v] = ln(p, !0), b.addEventListener("progress", f)), l && b.upload && ([d, m] = ln(l), b.upload.addEventListener("progress", d), b.upload.addEventListener("loadend", m)), (i.cancelToken || i.signal) && (u = (D) => {
      b && (r(!D || D.type ? new Rt(null, e, b) : D), b.abort(), b = null);
    }, i.cancelToken && i.cancelToken.subscribe(u), i.signal && (i.signal.aborted ? u() : i.signal.addEventListener("abort", u)));
    const I = pu(i.url);
    if (I && oe.protocols.indexOf(I) === -1) {
      r(
        new S(
          "Unsupported protocol " + I + ":",
          S.ERR_BAD_REQUEST,
          e
        )
      );
      return;
    }
    b.send(s || null);
  });
}, h0 = (e, t) => {
  const { length: n } = e = e ? e.filter(Boolean) : [];
  if (t || n) {
    let r = new AbortController(), i;
    const s = function(p) {
      if (!i) {
        i = !0, c();
        const u = p instanceof Error ? p : this.reason;
        r.abort(
          u instanceof S ? u : new Rt(u instanceof Error ? u.message : u)
        );
      }
    };
    let a = t && setTimeout(() => {
      a = null, s(new S(`timeout of ${t}ms exceeded`, S.ETIMEDOUT));
    }, t);
    const c = () => {
      e && (a && clearTimeout(a), a = null, e.forEach((p) => {
        p.unsubscribe ? p.unsubscribe(s) : p.removeEventListener("abort", s);
      }), e = null);
    };
    e.forEach((p) => p.addEventListener("abort", s));
    const { signal: l } = r;
    return l.unsubscribe = () => h.asap(c), l;
  }
}, g0 = function* (e, t) {
  let n = e.byteLength;
  if (n < t) {
    yield e;
    return;
  }
  let r = 0, i;
  for (; r < n; )
    i = r + t, yield e.slice(r, i), r = i;
}, v0 = async function* (e, t) {
  for await (const n of b0(e))
    yield* g0(n, t);
}, b0 = async function* (e) {
  if (e[Symbol.asyncIterator]) {
    yield* e;
    return;
  }
  const t = e.getReader();
  try {
    for (; ; ) {
      const { done: n, value: r } = await t.read();
      if (n)
        break;
      yield r;
    }
  } finally {
    await t.cancel();
  }
}, Fo = (e, t, n, r) => {
  const i = v0(e, t);
  let s = 0, a, c = (l) => {
    a || (a = !0, r && r(l));
  };
  return new ReadableStream(
    {
      async pull(l) {
        try {
          const { done: p, value: u } = await i.next();
          if (p) {
            c(), l.close();
            return;
          }
          let d = u.byteLength;
          if (n) {
            let f = s += d;
            n(f);
          }
          l.enqueue(new Uint8Array(u));
        } catch (p) {
          throw c(p), p;
        }
      },
      cancel(l) {
        return c(l), i.return();
      }
    },
    {
      highWaterMark: 2
    }
  );
}, Uo = 64 * 1024, { isFunction: ar } = h, x0 = (({ Request: e, Response: t }) => ({
  Request: e,
  Response: t
}))(h.global), { ReadableStream: Bo, TextEncoder: Mo } = h.global, qo = (e, ...t) => {
  try {
    return !!e(...t);
  } catch {
    return !1;
  }
}, y0 = (e) => {
  e = h.merge.call(
    {
      skipUndefined: !0
    },
    x0,
    e
  );
  const { fetch: t, Request: n, Response: r } = e, i = t ? ar(t) : typeof fetch == "function", s = ar(n), a = ar(r);
  if (!i)
    return !1;
  const c = i && ar(Bo), l = i && (typeof Mo == "function" ? /* @__PURE__ */ ((v) => (g) => v.encode(g))(new Mo()) : async (v) => new Uint8Array(await new n(v).arrayBuffer())), p = s && c && qo(() => {
    let v = !1;
    const g = new n(oe.origin, {
      body: new Bo(),
      method: "POST",
      get duplex() {
        return v = !0, "half";
      }
    }), b = g.headers.has("Content-Type");
    return g.body != null && g.body.cancel(), v && !b;
  }), u = a && c && qo(() => h.isReadableStream(new r("").body)), d = {
    stream: u && ((v) => v.body)
  };
  i && ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((v) => {
    !d[v] && (d[v] = (g, b) => {
      let x = g && g[v];
      if (x)
        return x.call(g);
      throw new S(
        `Response type '${v}' is not supported`,
        S.ERR_NOT_SUPPORT,
        b
      );
    });
  });
  const f = async (v) => {
    if (v == null)
      return 0;
    if (h.isBlob(v))
      return v.size;
    if (h.isSpecCompliantForm(v))
      return (await new n(oe.origin, {
        method: "POST",
        body: v
      }).arrayBuffer()).byteLength;
    if (h.isArrayBufferView(v) || h.isArrayBuffer(v))
      return v.byteLength;
    if (h.isURLSearchParams(v) && (v = v + ""), h.isString(v))
      return (await l(v)).byteLength;
  }, m = async (v, g) => {
    const b = h.toFiniteNumber(v.getContentLength());
    return b ?? f(g);
  };
  return async (v) => {
    let {
      url: g,
      method: b,
      data: x,
      signal: I,
      cancelToken: D,
      timeout: P,
      onDownloadProgress: C,
      onUploadProgress: q,
      responseType: L,
      headers: ne,
      withCredentials: K = "same-origin",
      fetchOptions: Le
    } = hu(v), it = t || fetch;
    L = L ? (L + "").toLowerCase() : "text";
    let Me = h0(
      [I, D && D.toAbortSignal()],
      P
    ), De = null;
    const Re = Me && Me.unsubscribe && (() => {
      Me.unsubscribe();
    });
    let zt;
    try {
      if (q && p && b !== "get" && b !== "head" && (zt = await m(ne, x)) !== 0) {
        let R = new n(g, {
          method: "POST",
          body: x,
          duplex: "half"
        }), y;
        if (h.isFormData(x) && (y = R.headers.get("content-type")) && ne.setContentType(y), R.body) {
          const [E, j] = Nr(
            zt,
            ln(Cr(q))
          );
          x = Fo(R.body, Uo, E, j);
        }
      }
      h.isString(K) || (K = K ? "include" : "omit");
      const re = s && "credentials" in n.prototype;
      if (h.isFormData(x)) {
        const R = ne.getContentType();
        R && /^multipart\/form-data/i.test(R) && !/boundary=/i.test(R) && ne.delete("content-type");
      }
      const A = {
        ...Le,
        signal: Me,
        method: b.toUpperCase(),
        headers: ne.normalize().toJSON(),
        body: x,
        duplex: "half",
        credentials: re ? K : void 0
      };
      De = s && new n(g, A);
      let _ = await (s ? it(De, Le) : it(g, A));
      const k = u && (L === "stream" || L === "response");
      if (u && (C || k && Re)) {
        const R = {};
        ["status", "statusText", "headers"].forEach(($) => {
          R[$] = _[$];
        });
        const y = h.toFiniteNumber(_.headers.get("content-length")), [E, j] = C && Nr(
          y,
          ln(Cr(C), !0)
        ) || [];
        _ = new r(
          Fo(_.body, Uo, E, () => {
            j && j(), Re && Re();
          }),
          R
        );
      }
      L = L || "text";
      let O = await d[h.findKey(d, L) || "text"](
        _,
        v
      );
      return !k && Re && Re(), await new Promise((R, y) => {
        Kt(R, y, {
          data: O,
          headers: ye.from(_.headers),
          status: _.status,
          statusText: _.statusText,
          config: v,
          request: De
        });
      });
    } catch (re) {
      throw Re && Re(), re && re.name === "TypeError" && /Load failed|fetch/i.test(re.message) ? Object.assign(
        new S(
          "Network Error",
          S.ERR_NETWORK,
          v,
          De,
          re && re.response
        ),
        {
          cause: re.cause || re
        }
      ) : S.from(re, re && re.code, v, De, re && re.response);
    }
  };
}, w0 = /* @__PURE__ */ new Map(), gu = (e) => {
  let t = e && e.env || {};
  const { fetch: n, Request: r, Response: i } = t, s = [r, i, n];
  let a = s.length, c = a, l, p, u = w0;
  for (; c--; )
    l = s[c], p = u.get(l), p === void 0 && u.set(l, p = c ? /* @__PURE__ */ new Map() : y0(t)), u = p;
  return p;
};
gu();
const Xs = {
  http: u0,
  xhr: m0,
  fetch: {
    get: gu
  }
};
h.forEach(Xs, (e, t) => {
  if (e) {
    try {
      Object.defineProperty(e, "name", { value: t });
    } catch {
    }
    Object.defineProperty(e, "adapterName", { value: t });
  }
});
const Ho = (e) => `- ${e}`, E0 = (e) => h.isFunction(e) || e === null || e === !1;
function _0(e, t) {
  e = h.isArray(e) ? e : [e];
  const { length: n } = e;
  let r, i;
  const s = {};
  for (let a = 0; a < n; a++) {
    r = e[a];
    let c;
    if (i = r, !E0(r) && (i = Xs[(c = String(r)).toLowerCase()], i === void 0))
      throw new S(`Unknown adapter '${c}'`);
    if (i && (h.isFunction(i) || (i = i.get(t))))
      break;
    s[c || "#" + a] = i;
  }
  if (!i) {
    const a = Object.entries(s).map(
      ([l, p]) => `adapter ${l} ` + (p === !1 ? "is not supported by the environment" : "is not available in the build")
    );
    let c = n ? a.length > 1 ? `since :
` + a.map(Ho).join(`
`) : " " + Ho(a[0]) : "as no adapter specified";
    throw new S(
      "There is no suitable adapter to dispatch the request " + c,
      "ERR_NOT_SUPPORT"
    );
  }
  return i;
}
const vu = {
  /**
   * Resolve an adapter from a list of adapter names or functions.
   * @type {Function}
   */
  getAdapter: _0,
  /**
   * Exposes all known adapters
   * @type {Object<string, Function|Object>}
   */
  adapters: Xs
};
function Fi(e) {
  if (e.cancelToken && e.cancelToken.throwIfRequested(), e.signal && e.signal.aborted)
    throw new Rt(null, e);
}
function Vo(e) {
  return Fi(e), e.headers = ye.from(e.headers), e.data = Oi.call(e, e.transformRequest), ["post", "put", "patch"].indexOf(e.method) !== -1 && e.headers.setContentType("application/x-www-form-urlencoded", !1), vu.getAdapter(e.adapter || Vn.adapter, e)(e).then(
    function(r) {
      return Fi(e), r.data = Oi.call(e, e.transformResponse, r), r.headers = ye.from(r.headers), r;
    },
    function(r) {
      return su(r) || (Fi(e), r && r.response && (r.response.data = Oi.call(
        e,
        e.transformResponse,
        r.response
      ), r.response.headers = ye.from(r.response.headers))), Promise.reject(r);
    }
  );
}
const ti = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach((e, t) => {
  ti[e] = function(r) {
    return typeof r === e || "a" + (t < 1 ? "n " : " ") + e;
  };
});
const Zo = {};
ti.transitional = function(t, n, r) {
  function i(s, a) {
    return "[Axios v" + $r + "] Transitional option '" + s + "'" + a + (r ? ". " + r : "");
  }
  return (s, a, c) => {
    if (t === !1)
      throw new S(
        i(a, " has been removed" + (n ? " in " + n : "")),
        S.ERR_DEPRECATED
      );
    return n && !Zo[a] && (Zo[a] = !0, console.warn(
      i(
        a,
        " has been deprecated since v" + n + " and will be removed in the near future"
      )
    )), t ? t(s, a, c) : !0;
  };
};
ti.spelling = function(t) {
  return (n, r) => (console.warn(`${r} is likely a misspelling of ${t}`), !0);
};
function S0(e, t, n) {
  if (typeof e != "object")
    throw new S("options must be an object", S.ERR_BAD_OPTION_VALUE);
  const r = Object.keys(e);
  let i = r.length;
  for (; i-- > 0; ) {
    const s = r[i], a = Object.prototype.hasOwnProperty.call(t, s) ? t[s] : void 0;
    if (a) {
      const c = e[s], l = c === void 0 || a(c, s, e);
      if (l !== !0)
        throw new S(
          "option " + s + " must be " + l,
          S.ERR_BAD_OPTION_VALUE
        );
      continue;
    }
    if (n !== !0)
      throw new S("Unknown option " + s, S.ERR_BAD_OPTION);
  }
}
const Sr = {
  assertOptions: S0,
  validators: ti
}, ze = Sr.validators;
let At = class {
  constructor(t) {
    this.defaults = t || {}, this.interceptors = {
      request: new bo(),
      response: new bo()
    };
  }
  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  async request(t, n) {
    try {
      return await this._request(t, n);
    } catch (r) {
      if (r instanceof Error) {
        let i = {};
        Error.captureStackTrace ? Error.captureStackTrace(i) : i = new Error();
        const s = (() => {
          if (!i.stack)
            return "";
          const a = i.stack.indexOf(`
`);
          return a === -1 ? "" : i.stack.slice(a + 1);
        })();
        try {
          if (!r.stack)
            r.stack = s;
          else if (s) {
            const a = s.indexOf(`
`), c = a === -1 ? -1 : s.indexOf(`
`, a + 1), l = c === -1 ? "" : s.slice(c + 1);
            String(r.stack).endsWith(l) || (r.stack += `
` + s);
          }
        } catch {
        }
      }
      throw r;
    }
  }
  _request(t, n) {
    typeof t == "string" ? (n = n || {}, n.url = t) : n = t || {}, n = It(this.defaults, n);
    const { transitional: r, paramsSerializer: i, headers: s } = n;
    r !== void 0 && Sr.assertOptions(
      r,
      {
        silentJSONParsing: ze.transitional(ze.boolean),
        forcedJSONParsing: ze.transitional(ze.boolean),
        clarifyTimeoutError: ze.transitional(ze.boolean),
        legacyInterceptorReqResOrdering: ze.transitional(ze.boolean)
      },
      !1
    ), i != null && (h.isFunction(i) ? n.paramsSerializer = {
      serialize: i
    } : Sr.assertOptions(
      i,
      {
        encode: ze.function,
        serialize: ze.function
      },
      !0
    )), n.allowAbsoluteUrls !== void 0 || (this.defaults.allowAbsoluteUrls !== void 0 ? n.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls : n.allowAbsoluteUrls = !0), Sr.assertOptions(
      n,
      {
        baseUrl: ze.spelling("baseURL"),
        withXsrfToken: ze.spelling("withXSRFToken")
      },
      !0
    ), n.method = (n.method || this.defaults.method || "get").toLowerCase();
    let a = s && h.merge(s.common, s[n.method]);
    s && h.forEach(["delete", "get", "head", "post", "put", "patch", "common"], (v) => {
      delete s[v];
    }), n.headers = ye.concat(a, s);
    const c = [];
    let l = !0;
    this.interceptors.request.forEach(function(g) {
      if (typeof g.runWhen == "function" && g.runWhen(n) === !1)
        return;
      l = l && g.synchronous;
      const b = n.transitional || ei;
      b && b.legacyInterceptorReqResOrdering ? c.unshift(g.fulfilled, g.rejected) : c.push(g.fulfilled, g.rejected);
    });
    const p = [];
    this.interceptors.response.forEach(function(g) {
      p.push(g.fulfilled, g.rejected);
    });
    let u, d = 0, f;
    if (!l) {
      const v = [Vo.bind(this), void 0];
      for (v.unshift(...c), v.push(...p), f = v.length, u = Promise.resolve(n); d < f; )
        u = u.then(v[d++], v[d++]);
      return u;
    }
    f = c.length;
    let m = n;
    for (; d < f; ) {
      const v = c[d++], g = c[d++];
      try {
        m = v(m);
      } catch (b) {
        g.call(this, b);
        break;
      }
    }
    try {
      u = Vo.call(this, m);
    } catch (v) {
      return Promise.reject(v);
    }
    for (d = 0, f = p.length; d < f; )
      u = u.then(p[d++], p[d++]);
    return u;
  }
  getUri(t) {
    t = It(this.defaults, t);
    const n = Ms(t.baseURL, t.url, t.allowAbsoluteUrls);
    return Us(n, t.params, t.paramsSerializer);
  }
};
h.forEach(["delete", "get", "head", "options"], function(t) {
  At.prototype[t] = function(n, r) {
    return this.request(
      It(r || {}, {
        method: t,
        url: n,
        data: (r || {}).data
      })
    );
  };
});
h.forEach(["post", "put", "patch"], function(t) {
  function n(r) {
    return function(s, a, c) {
      return this.request(
        It(c || {}, {
          method: t,
          headers: r ? {
            "Content-Type": "multipart/form-data"
          } : {},
          url: s,
          data: a
        })
      );
    };
  }
  At.prototype[t] = n(), At.prototype[t + "Form"] = n(!0);
});
let A0 = class bu {
  constructor(t) {
    if (typeof t != "function")
      throw new TypeError("executor must be a function.");
    let n;
    this.promise = new Promise(function(s) {
      n = s;
    });
    const r = this;
    this.promise.then((i) => {
      if (!r._listeners) return;
      let s = r._listeners.length;
      for (; s-- > 0; )
        r._listeners[s](i);
      r._listeners = null;
    }), this.promise.then = (i) => {
      let s;
      const a = new Promise((c) => {
        r.subscribe(c), s = c;
      }).then(i);
      return a.cancel = function() {
        r.unsubscribe(s);
      }, a;
    }, t(function(s, a, c) {
      r.reason || (r.reason = new Rt(s, a, c), n(r.reason));
    });
  }
  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason)
      throw this.reason;
  }
  /**
   * Subscribe to the cancel signal
   */
  subscribe(t) {
    if (this.reason) {
      t(this.reason);
      return;
    }
    this._listeners ? this._listeners.push(t) : this._listeners = [t];
  }
  /**
   * Unsubscribe from the cancel signal
   */
  unsubscribe(t) {
    if (!this._listeners)
      return;
    const n = this._listeners.indexOf(t);
    n !== -1 && this._listeners.splice(n, 1);
  }
  toAbortSignal() {
    const t = new AbortController(), n = (r) => {
      t.abort(r);
    };
    return this.subscribe(n), t.signal.unsubscribe = () => this.unsubscribe(n), t.signal;
  }
  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source() {
    let t;
    return {
      token: new bu(function(i) {
        t = i;
      }),
      cancel: t
    };
  }
};
function k0(e) {
  return function(n) {
    return e.apply(null, n);
  };
}
function T0(e) {
  return h.isObject(e) && e.isAxiosError === !0;
}
const fs = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
  WebServerIsDown: 521,
  ConnectionTimedOut: 522,
  OriginIsUnreachable: 523,
  TimeoutOccurred: 524,
  SslHandshakeFailed: 525,
  InvalidSslCertificate: 526
};
Object.entries(fs).forEach(([e, t]) => {
  fs[t] = e;
});
function xu(e) {
  const t = new At(e), n = kl(At.prototype.request, t);
  return h.extend(n, At.prototype, t, { allOwnKeys: !0 }), h.extend(n, t, null, { allOwnKeys: !0 }), n.create = function(i) {
    return xu(It(e, i));
  }, n;
}
const M = xu(Vn);
M.Axios = At;
M.CanceledError = Rt;
M.CancelToken = A0;
M.isCancel = su;
M.VERSION = $r;
M.toFormData = Qr;
M.AxiosError = S;
M.Cancel = M.CanceledError;
M.all = function(t) {
  return Promise.all(t);
};
M.spread = k0;
M.isAxiosError = T0;
M.mergeConfig = It;
M.AxiosHeaders = ye;
M.formToJSON = (e) => iu(h.isHTMLForm(e) ? new FormData(e) : e);
M.getAdapter = vu.getAdapter;
M.HttpStatusCode = fs;
M.default = M;
const {
  Axios: cR,
  AxiosError: lR,
  CanceledError: uR,
  isCancel: pR,
  CancelToken: dR,
  VERSION: fR,
  all: mR,
  Cancel: hR,
  isAxiosError: gR,
  spread: vR,
  toFormData: bR,
  AxiosHeaders: xR,
  HttpStatusCode: yR,
  formToJSON: wR,
  getAdapter: ER,
  mergeConfig: _R
} = M, yu = gt, kn = nt;
var P0 = {
  findAndReadPackageJson: R0,
  tryReadJsonAt: Vt
};
function R0() {
  return Vt(O0()) || Vt(I0()) || Vt(process.resourcesPath, "app.asar") || Vt(process.resourcesPath, "app") || Vt(process.cwd()) || { name: void 0, version: void 0 };
}
function Vt(...e) {
  if (e[0])
    try {
      const t = kn.join(...e), n = j0("package.json", t);
      if (!n)
        return;
      const r = JSON.parse(yu.readFileSync(n, "utf8")), i = (r == null ? void 0 : r.productName) || (r == null ? void 0 : r.name);
      return !i || i.toLowerCase() === "electron" ? void 0 : i ? { name: i, version: r == null ? void 0 : r.version } : void 0;
    } catch {
      return;
    }
}
function j0(e, t) {
  let n = t;
  for (; ; ) {
    const r = kn.parse(n), i = r.root, s = r.dir;
    if (yu.existsSync(kn.join(n, e)))
      return kn.resolve(kn.join(n, e));
    if (n === i)
      return null;
    n = s;
  }
}
function I0() {
  const e = process.argv.filter((n) => n.indexOf("--user-data-dir=") === 0);
  return e.length === 0 || typeof e[0] != "string" ? null : e[0].replace("--user-data-dir=", "");
}
function O0() {
  var e;
  try {
    return (e = require.main) == null ? void 0 : e.filename;
  } catch {
    return;
  }
}
const $0 = Gc, yt = fn, Mt = nt, N0 = P0;
let C0 = class {
  constructor() {
    N(this, "appName");
    N(this, "appPackageJson");
    N(this, "platform", process.platform);
  }
  getAppLogPath(t = this.getAppName()) {
    return this.platform === "darwin" ? Mt.join(this.getSystemPathHome(), "Library/Logs", t) : Mt.join(this.getAppUserDataPath(t), "logs");
  }
  getAppName() {
    var n;
    const t = this.appName || ((n = this.getAppPackageJson()) == null ? void 0 : n.name);
    if (!t)
      throw new Error(
        "electron-log can't determine the app name. It tried these methods:\n1. Use `electron.app.name`\n2. Use productName or name from the nearest package.json`\nYou can also set it through log.transports.file.setAppName()"
      );
    return t;
  }
  /**
   * @private
   * @returns {undefined}
   */
  getAppPackageJson() {
    return typeof this.appPackageJson != "object" && (this.appPackageJson = N0.findAndReadPackageJson()), this.appPackageJson;
  }
  getAppUserDataPath(t = this.getAppName()) {
    return t ? Mt.join(this.getSystemPathAppData(), t) : void 0;
  }
  getAppVersion() {
    var t;
    return (t = this.getAppPackageJson()) == null ? void 0 : t.version;
  }
  getElectronLogPath() {
    return this.getAppLogPath();
  }
  getMacOsVersion() {
    const t = Number(yt.release().split(".")[0]);
    return t <= 19 ? `10.${t - 4}` : t - 9;
  }
  /**
   * @protected
   * @returns {string}
   */
  getOsVersion() {
    let t = yt.type().replace("_", " "), n = yt.release();
    return t === "Darwin" && (t = "macOS", n = this.getMacOsVersion()), `${t} ${n}`;
  }
  /**
   * @return {PathVariables}
   */
  getPathVariables() {
    const t = this.getAppName(), n = this.getAppVersion(), r = this;
    return {
      appData: this.getSystemPathAppData(),
      appName: t,
      appVersion: n,
      get electronDefaultDir() {
        return r.getElectronLogPath();
      },
      home: this.getSystemPathHome(),
      libraryDefaultDir: this.getAppLogPath(t),
      libraryTemplate: this.getAppLogPath("{appName}"),
      temp: this.getSystemPathTemp(),
      userData: this.getAppUserDataPath(t)
    };
  }
  getSystemPathAppData() {
    const t = this.getSystemPathHome();
    switch (this.platform) {
      case "darwin":
        return Mt.join(t, "Library/Application Support");
      case "win32":
        return process.env.APPDATA || Mt.join(t, "AppData/Roaming");
      default:
        return process.env.XDG_CONFIG_HOME || Mt.join(t, ".config");
    }
  }
  getSystemPathHome() {
    var t;
    return ((t = yt.homedir) == null ? void 0 : t.call(yt)) || process.env.HOME;
  }
  getSystemPathTemp() {
    return yt.tmpdir();
  }
  getVersions() {
    return {
      app: `${this.getAppName()} ${this.getAppVersion()}`,
      electron: void 0,
      os: this.getOsVersion()
    };
  }
  isDev() {
    return process.env.NODE_ENV === "development" || process.env.ELECTRON_IS_DEV === "1";
  }
  isElectron() {
    return !!process.versions.electron;
  }
  onAppEvent(t, n) {
  }
  onAppReady(t) {
    t();
  }
  onEveryWebContentsEvent(t, n) {
  }
  /**
   * Listen to async messages sent from opposite process
   * @param {string} channel
   * @param {function} listener
   */
  onIpc(t, n) {
  }
  onIpcInvoke(t, n) {
  }
  /**
   * @param {string} url
   * @param {Function} [logFunction]
   */
  openUrl(t, n = console.error) {
    const i = { darwin: "open", win32: "start", linux: "xdg-open" }[process.platform] || "xdg-open";
    $0.exec(`${i} ${t}`, {}, (s) => {
      s && n(s);
    });
  }
  setAppName(t) {
    this.appName = t;
  }
  setPlatform(t) {
    this.platform = t;
  }
  setPreloadFileForSessions({
    filePath: t,
    // eslint-disable-line no-unused-vars
    includeFutureSession: n = !0,
    // eslint-disable-line no-unused-vars
    getSessions: r = () => []
    // eslint-disable-line no-unused-vars
  }) {
  }
  /**
   * Sent a message to opposite process
   * @param {string} channel
   * @param {any} message
   */
  sendIpc(t, n) {
  }
  showErrorBox(t, n) {
  }
};
var L0 = C0;
const D0 = nt, z0 = L0;
let F0 = class extends z0 {
  /**
   * @param {object} options
   * @param {typeof Electron} [options.electron]
   */
  constructor({ electron: n } = {}) {
    super();
    /**
     * @type {typeof Electron}
     */
    N(this, "electron");
    this.electron = n;
  }
  getAppName() {
    var r, i;
    let n;
    try {
      n = this.appName || ((r = this.electron.app) == null ? void 0 : r.name) || ((i = this.electron.app) == null ? void 0 : i.getName());
    } catch {
    }
    return n || super.getAppName();
  }
  getAppUserDataPath(n) {
    return this.getPath("userData") || super.getAppUserDataPath(n);
  }
  getAppVersion() {
    var r;
    let n;
    try {
      n = (r = this.electron.app) == null ? void 0 : r.getVersion();
    } catch {
    }
    return n || super.getAppVersion();
  }
  getElectronLogPath() {
    return this.getPath("logs") || super.getElectronLogPath();
  }
  /**
   * @private
   * @param {any} name
   * @returns {string|undefined}
   */
  getPath(n) {
    var r;
    try {
      return (r = this.electron.app) == null ? void 0 : r.getPath(n);
    } catch {
      return;
    }
  }
  getVersions() {
    return {
      app: `${this.getAppName()} ${this.getAppVersion()}`,
      electron: `Electron ${process.versions.electron}`,
      os: this.getOsVersion()
    };
  }
  getSystemPathAppData() {
    return this.getPath("appData") || super.getSystemPathAppData();
  }
  isDev() {
    var n;
    return ((n = this.electron.app) == null ? void 0 : n.isPackaged) !== void 0 ? !this.electron.app.isPackaged : typeof process.execPath == "string" ? D0.basename(process.execPath).toLowerCase().startsWith("electron") : super.isDev();
  }
  onAppEvent(n, r) {
    var i;
    return (i = this.electron.app) == null || i.on(n, r), () => {
      var s;
      (s = this.electron.app) == null || s.off(n, r);
    };
  }
  onAppReady(n) {
    var r, i, s;
    (r = this.electron.app) != null && r.isReady() ? n() : (i = this.electron.app) != null && i.once ? (s = this.electron.app) == null || s.once("ready", n) : n();
  }
  onEveryWebContentsEvent(n, r) {
    var s, a, c;
    return (a = (s = this.electron.webContents) == null ? void 0 : s.getAllWebContents()) == null || a.forEach((l) => {
      l.on(n, r);
    }), (c = this.electron.app) == null || c.on("web-contents-created", i), () => {
      var l, p;
      (l = this.electron.webContents) == null || l.getAllWebContents().forEach((u) => {
        u.off(n, r);
      }), (p = this.electron.app) == null || p.off("web-contents-created", i);
    };
    function i(l, p) {
      p.on(n, r);
    }
  }
  /**
   * Listen to async messages sent from opposite process
   * @param {string} channel
   * @param {function} listener
   */
  onIpc(n, r) {
    var i;
    (i = this.electron.ipcMain) == null || i.on(n, r);
  }
  onIpcInvoke(n, r) {
    var i, s;
    (s = (i = this.electron.ipcMain) == null ? void 0 : i.handle) == null || s.call(i, n, r);
  }
  /**
   * @param {string} url
   * @param {Function} [logFunction]
   */
  openUrl(n, r = console.error) {
    var i;
    (i = this.electron.shell) == null || i.openExternal(n).catch(r);
  }
  setPreloadFileForSessions({
    filePath: n,
    includeFutureSession: r = !0,
    getSessions: i = () => {
      var s;
      return [(s = this.electron.session) == null ? void 0 : s.defaultSession];
    }
  }) {
    for (const a of i().filter(Boolean))
      s(a);
    r && this.onAppEvent("session-created", (a) => {
      s(a);
    });
    function s(a) {
      typeof a.registerPreloadScript == "function" ? a.registerPreloadScript({
        filePath: n,
        id: "electron-log-preload",
        type: "frame"
      }) : a.setPreloads([...a.getPreloads(), n]);
    }
  }
  /**
   * Sent a message to opposite process
   * @param {string} channel
   * @param {any} message
   */
  sendIpc(n, r) {
    var i, s;
    (s = (i = this.electron.BrowserWindow) == null ? void 0 : i.getAllWindows()) == null || s.forEach((a) => {
      var c, l;
      ((c = a.webContents) == null ? void 0 : c.isDestroyed()) === !1 && ((l = a.webContents) == null ? void 0 : l.isCrashed()) === !1 && a.webContents.send(n, r);
    });
  }
  showErrorBox(n, r) {
    var i;
    (i = this.electron.dialog) == null || i.showErrorBox(n, r);
  }
};
var U0 = F0, wu = { exports: {} };
(function(e) {
  let t = {};
  try {
    t = require("electron");
  } catch {
  }
  t.ipcRenderer && n(t), e.exports = n;
  function n({ contextBridge: r, ipcRenderer: i }) {
    if (!i)
      return;
    i.on("__ELECTRON_LOG_IPC__", (a, c) => {
      window.postMessage({ cmd: "message", ...c });
    }), i.invoke("__ELECTRON_LOG__", { cmd: "getOptions" }).catch((a) => console.error(new Error(
      `electron-log isn't initialized in the main process. Please call log.initialize() before. ${a.message}`
    )));
    const s = {
      sendToMain(a) {
        try {
          i.send("__ELECTRON_LOG__", a);
        } catch (c) {
          console.error("electronLog.sendToMain ", c, "data:", a), i.send("__ELECTRON_LOG__", {
            cmd: "errorHandler",
            error: { message: c == null ? void 0 : c.message, stack: c == null ? void 0 : c.stack },
            errorName: "sendToMain"
          });
        }
      },
      log(...a) {
        s.sendToMain({ data: a, level: "info" });
      }
    };
    for (const a of ["error", "warn", "info", "verbose", "debug", "silly"])
      s[a] = (...c) => s.sendToMain({
        data: c,
        level: a
      });
    if (r && process.contextIsolated)
      try {
        r.exposeInMainWorld("__electronLog", s);
      } catch {
      }
    typeof window == "object" ? window.__electronLog = s : __electronLog = s;
  }
})(wu);
var B0 = wu.exports;
const Wo = gt, M0 = fn, Go = nt, q0 = B0;
let Jo = !1, Ko = !1;
var H0 = {
  initialize({
    externalApi: e,
    getSessions: t,
    includeFutureSession: n,
    logger: r,
    preload: i = !0,
    spyRendererConsole: s = !1
  }) {
    e.onAppReady(() => {
      try {
        i && V0({
          externalApi: e,
          getSessions: t,
          includeFutureSession: n,
          logger: r,
          preloadOption: i
        }), s && Z0({ externalApi: e, logger: r });
      } catch (a) {
        r.warn(a);
      }
    });
  }
};
function V0({
  externalApi: e,
  getSessions: t,
  includeFutureSession: n,
  logger: r,
  preloadOption: i
}) {
  let s = typeof i == "string" ? i : void 0;
  if (Jo) {
    r.warn(new Error("log.initialize({ preload }) already called").stack);
    return;
  }
  Jo = !0;
  try {
    s = Go.resolve(
      __dirname,
      "../renderer/electron-log-preload.js"
    );
  } catch {
  }
  if (!s || !Wo.existsSync(s)) {
    s = Go.join(
      e.getAppUserDataPath() || M0.tmpdir(),
      "electron-log-preload.js"
    );
    const a = `
      try {
        (${q0.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;
    Wo.writeFileSync(s, a, "utf8");
  }
  e.setPreloadFileForSessions({
    filePath: s,
    includeFutureSession: n,
    getSessions: t
  });
}
function Z0({ externalApi: e, logger: t }) {
  if (Ko) {
    t.warn(
      new Error("log.initialize({ spyRendererConsole }) already called").stack
    );
    return;
  }
  Ko = !0;
  const n = ["debug", "info", "warn", "error"];
  e.onEveryWebContentsEvent(
    "console-message",
    (r, i, s) => {
      t.processMessage({
        data: [s],
        level: n[i],
        variables: { processType: "renderer" }
      });
    }
  );
}
var W0 = G0;
function G0(e) {
  return Object.defineProperties(t, {
    defaultLabel: { value: "", writable: !0 },
    labelPadding: { value: !0, writable: !0 },
    maxLabelLength: { value: 0, writable: !0 },
    labelLength: {
      get() {
        switch (typeof t.labelPadding) {
          case "boolean":
            return t.labelPadding ? t.maxLabelLength : 0;
          case "number":
            return t.labelPadding;
          default:
            return 0;
        }
      }
    }
  });
  function t(n) {
    t.maxLabelLength = Math.max(t.maxLabelLength, n.length);
    const r = {};
    for (const i of e.levels)
      r[i] = (...s) => e.logData(s, { level: i, scope: n });
    return r.log = r.info, r;
  }
}
let J0 = class {
  constructor({ processMessage: t }) {
    this.processMessage = t, this.buffer = [], this.enabled = !1, this.begin = this.begin.bind(this), this.commit = this.commit.bind(this), this.reject = this.reject.bind(this);
  }
  addMessage(t) {
    this.buffer.push(t);
  }
  begin() {
    this.enabled = [];
  }
  commit() {
    this.enabled = !1, this.buffer.forEach((t) => this.processMessage(t)), this.buffer = [];
  }
  reject() {
    this.enabled = !1, this.buffer = [];
  }
};
var K0 = J0;
const X0 = W0, Y0 = K0;
var lt;
let Q0 = (lt = class {
  constructor({
    allowUnknownLevel: t = !1,
    dependencies: n = {},
    errorHandler: r,
    eventLogger: i,
    initializeFn: s,
    isDev: a = !1,
    levels: c = ["error", "warn", "info", "verbose", "debug", "silly"],
    logId: l,
    transportFactories: p = {},
    variables: u
  } = {}) {
    N(this, "dependencies", {});
    N(this, "errorHandler", null);
    N(this, "eventLogger", null);
    N(this, "functions", {});
    N(this, "hooks", []);
    N(this, "isDev", !1);
    N(this, "levels", null);
    N(this, "logId", null);
    N(this, "scope", null);
    N(this, "transports", {});
    N(this, "variables", {});
    this.addLevel = this.addLevel.bind(this), this.create = this.create.bind(this), this.initialize = this.initialize.bind(this), this.logData = this.logData.bind(this), this.processMessage = this.processMessage.bind(this), this.allowUnknownLevel = t, this.buffering = new Y0(this), this.dependencies = n, this.initializeFn = s, this.isDev = a, this.levels = c, this.logId = l, this.scope = X0(this), this.transportFactories = p, this.variables = u || {};
    for (const d of this.levels)
      this.addLevel(d, !1);
    this.log = this.info, this.functions.log = this.log, this.errorHandler = r, r == null || r.setOptions({ ...n, logFn: this.error }), this.eventLogger = i, i == null || i.setOptions({ ...n, logger: this });
    for (const [d, f] of Object.entries(p))
      this.transports[d] = f(this, n);
    lt.instances[l] = this;
  }
  static getInstance({ logId: t }) {
    return this.instances[t] || this.instances.default;
  }
  addLevel(t, n = this.levels.length) {
    n !== !1 && this.levels.splice(n, 0, t), this[t] = (...r) => this.logData(r, { level: t }), this.functions[t] = this[t];
  }
  catchErrors(t) {
    return this.processMessage(
      {
        data: ["log.catchErrors is deprecated. Use log.errorHandler instead"],
        level: "warn"
      },
      { transports: ["console"] }
    ), this.errorHandler.startCatching(t);
  }
  create(t) {
    return typeof t == "string" && (t = { logId: t }), new lt({
      dependencies: this.dependencies,
      errorHandler: this.errorHandler,
      initializeFn: this.initializeFn,
      isDev: this.isDev,
      transportFactories: this.transportFactories,
      variables: { ...this.variables },
      ...t
    });
  }
  compareLevels(t, n, r = this.levels) {
    const i = r.indexOf(t), s = r.indexOf(n);
    return s === -1 || i === -1 ? !0 : s <= i;
  }
  initialize(t = {}) {
    this.initializeFn({ logger: this, ...this.dependencies, ...t });
  }
  logData(t, n = {}) {
    this.buffering.enabled ? this.buffering.addMessage({ data: t, date: /* @__PURE__ */ new Date(), ...n }) : this.processMessage({ data: t, ...n });
  }
  processMessage(t, { transports: n = this.transports } = {}) {
    if (t.cmd === "errorHandler") {
      this.errorHandler.handle(t.error, {
        errorName: t.errorName,
        processType: "renderer",
        showDialog: !!t.showDialog
      });
      return;
    }
    let r = t.level;
    this.allowUnknownLevel || (r = this.levels.includes(t.level) ? t.level : "info");
    const i = {
      date: /* @__PURE__ */ new Date(),
      logId: this.logId,
      ...t,
      level: r,
      variables: {
        ...this.variables,
        ...t.variables
      }
    };
    for (const [s, a] of this.transportEntries(n))
      if (!(typeof a != "function" || a.level === !1) && this.compareLevels(a.level, t.level))
        try {
          const c = this.hooks.reduce((l, p) => l && p(l, a, s), i);
          c && a({ ...c, data: [...c.data] });
        } catch (c) {
          this.processInternalErrorFn(c);
        }
  }
  processInternalErrorFn(t) {
  }
  transportEntries(t = this.transports) {
    return (Array.isArray(t) ? t : Object.entries(t)).map((r) => {
      switch (typeof r) {
        case "string":
          return this.transports[r] ? [r, this.transports[r]] : null;
        case "function":
          return [r.name, r];
        default:
          return Array.isArray(r) ? r : null;
      }
    }).filter(Boolean);
  }
}, N(lt, "instances", {}), lt);
var ew = Q0;
let tw = class {
  constructor({
    externalApi: t,
    logFn: n = void 0,
    onError: r = void 0,
    showDialog: i = void 0
  } = {}) {
    N(this, "externalApi");
    N(this, "isActive", !1);
    N(this, "logFn");
    N(this, "onError");
    N(this, "showDialog", !0);
    this.createIssue = this.createIssue.bind(this), this.handleError = this.handleError.bind(this), this.handleRejection = this.handleRejection.bind(this), this.setOptions({ externalApi: t, logFn: n, onError: r, showDialog: i }), this.startCatching = this.startCatching.bind(this), this.stopCatching = this.stopCatching.bind(this);
  }
  handle(t, {
    logFn: n = this.logFn,
    onError: r = this.onError,
    processType: i = "browser",
    showDialog: s = this.showDialog,
    errorName: a = ""
  } = {}) {
    var c;
    t = nw(t);
    try {
      if (typeof r == "function") {
        const l = ((c = this.externalApi) == null ? void 0 : c.getVersions()) || {}, p = this.createIssue;
        if (r({
          createIssue: p,
          error: t,
          errorName: a,
          processType: i,
          versions: l
        }) === !1)
          return;
      }
      a ? n(a, t) : n(t), s && !a.includes("rejection") && this.externalApi && this.externalApi.showErrorBox(
        `A JavaScript error occurred in the ${i} process`,
        t.stack
      );
    } catch {
      console.error(t);
    }
  }
  setOptions({ externalApi: t, logFn: n, onError: r, showDialog: i }) {
    typeof t == "object" && (this.externalApi = t), typeof n == "function" && (this.logFn = n), typeof r == "function" && (this.onError = r), typeof i == "boolean" && (this.showDialog = i);
  }
  startCatching({ onError: t, showDialog: n } = {}) {
    this.isActive || (this.isActive = !0, this.setOptions({ onError: t, showDialog: n }), process.on("uncaughtException", this.handleError), process.on("unhandledRejection", this.handleRejection));
  }
  stopCatching() {
    this.isActive = !1, process.removeListener("uncaughtException", this.handleError), process.removeListener("unhandledRejection", this.handleRejection);
  }
  createIssue(t, n) {
    var r;
    (r = this.externalApi) == null || r.openUrl(
      `${t}?${new URLSearchParams(n).toString()}`
    );
  }
  handleError(t) {
    this.handle(t, { errorName: "Unhandled" });
  }
  handleRejection(t) {
    const n = t instanceof Error ? t : new Error(JSON.stringify(t));
    this.handle(n, { errorName: "Unhandled rejection" });
  }
};
function nw(e) {
  if (e instanceof Error)
    return e;
  if (e && typeof e == "object") {
    if (e.message)
      return Object.assign(new Error(e.message), e);
    try {
      return new Error(JSON.stringify(e));
    } catch (t) {
      return new Error(`Couldn't normalize error ${String(e)}: ${t}`);
    }
  }
  return new Error(`Can't normalize error ${String(e)}`);
}
var rw = tw;
let iw = class {
  constructor(t = {}) {
    N(this, "disposers", []);
    N(this, "format", "{eventSource}#{eventName}:");
    N(this, "formatters", {
      app: {
        "certificate-error": ({ args: t }) => this.arrayToObject(t.slice(1, 4), [
          "url",
          "error",
          "certificate"
        ]),
        "child-process-gone": ({ args: t }) => t.length === 1 ? t[0] : t,
        "render-process-gone": ({ args: [t, n] }) => n && typeof n == "object" ? { ...n, ...this.getWebContentsDetails(t) } : []
      },
      webContents: {
        "console-message": ({ args: [t, n, r, i] }) => {
          if (!(t < 3))
            return { message: n, source: `${i}:${r}` };
        },
        "did-fail-load": ({ args: t }) => this.arrayToObject(t, [
          "errorCode",
          "errorDescription",
          "validatedURL",
          "isMainFrame",
          "frameProcessId",
          "frameRoutingId"
        ]),
        "did-fail-provisional-load": ({ args: t }) => this.arrayToObject(t, [
          "errorCode",
          "errorDescription",
          "validatedURL",
          "isMainFrame",
          "frameProcessId",
          "frameRoutingId"
        ]),
        "plugin-crashed": ({ args: t }) => this.arrayToObject(t, ["name", "version"]),
        "preload-error": ({ args: t }) => this.arrayToObject(t, ["preloadPath", "error"])
      }
    });
    N(this, "events", {
      app: {
        "certificate-error": !0,
        "child-process-gone": !0,
        "render-process-gone": !0
      },
      webContents: {
        // 'console-message': true,
        "did-fail-load": !0,
        "did-fail-provisional-load": !0,
        "plugin-crashed": !0,
        "preload-error": !0,
        unresponsive: !0
      }
    });
    N(this, "externalApi");
    N(this, "level", "error");
    N(this, "scope", "");
    this.setOptions(t);
  }
  setOptions({
    events: t,
    externalApi: n,
    level: r,
    logger: i,
    format: s,
    formatters: a,
    scope: c
  }) {
    typeof t == "object" && (this.events = t), typeof n == "object" && (this.externalApi = n), typeof r == "string" && (this.level = r), typeof i == "object" && (this.logger = i), (typeof s == "string" || typeof s == "function") && (this.format = s), typeof a == "object" && (this.formatters = a), typeof c == "string" && (this.scope = c);
  }
  startLogging(t = {}) {
    this.setOptions(t), this.disposeListeners();
    for (const n of this.getEventNames(this.events.app))
      this.disposers.push(
        this.externalApi.onAppEvent(n, (...r) => {
          this.handleEvent({ eventSource: "app", eventName: n, handlerArgs: r });
        })
      );
    for (const n of this.getEventNames(this.events.webContents))
      this.disposers.push(
        this.externalApi.onEveryWebContentsEvent(
          n,
          (...r) => {
            this.handleEvent(
              { eventSource: "webContents", eventName: n, handlerArgs: r }
            );
          }
        )
      );
  }
  stopLogging() {
    this.disposeListeners();
  }
  arrayToObject(t, n) {
    const r = {};
    return n.forEach((i, s) => {
      r[i] = t[s];
    }), t.length > n.length && (r.unknownArgs = t.slice(n.length)), r;
  }
  disposeListeners() {
    this.disposers.forEach((t) => t()), this.disposers = [];
  }
  formatEventLog({ eventName: t, eventSource: n, handlerArgs: r }) {
    var u;
    const [i, ...s] = r;
    if (typeof this.format == "function")
      return this.format({ args: s, event: i, eventName: t, eventSource: n });
    const a = (u = this.formatters[n]) == null ? void 0 : u[t];
    let c = s;
    if (typeof a == "function" && (c = a({ args: s, event: i, eventName: t, eventSource: n })), !c)
      return;
    const l = {};
    return Array.isArray(c) ? l.args = c : typeof c == "object" && Object.assign(l, c), n === "webContents" && Object.assign(l, this.getWebContentsDetails(i == null ? void 0 : i.sender)), [this.format.replace("{eventSource}", n === "app" ? "App" : "WebContents").replace("{eventName}", t), l];
  }
  getEventNames(t) {
    return !t || typeof t != "object" ? [] : Object.entries(t).filter(([n, r]) => r).map(([n]) => n);
  }
  getWebContentsDetails(t) {
    if (!(t != null && t.loadURL))
      return {};
    try {
      return {
        webContents: {
          id: t.id,
          url: t.getURL()
        }
      };
    } catch {
      return {};
    }
  }
  handleEvent({ eventName: t, eventSource: n, handlerArgs: r }) {
    var s;
    const i = this.formatEventLog({ eventName: t, eventSource: n, handlerArgs: r });
    if (i) {
      const a = this.scope ? this.logger.scope(this.scope) : this.logger;
      (s = a == null ? void 0 : a[this.level]) == null || s.call(a, ...i);
    }
  }
};
var sw = iw, Gn = { transform: aw };
function aw({
  logger: e,
  message: t,
  transport: n,
  initialData: r = (t == null ? void 0 : t.data) || [],
  transforms: i = n == null ? void 0 : n.transforms
}) {
  return i.reduce((s, a) => typeof a == "function" ? a({ data: s, logger: e, message: t, transport: n }) : s, r);
}
const { transform: ow } = Gn;
var Eu = {
  concatFirstStringElements: cw,
  format({ message: e, logger: t, transport: n, data: r = e == null ? void 0 : e.data }) {
    switch (typeof n.format) {
      case "string":
        return ow({
          message: e,
          logger: t,
          transforms: [pw, uw, dw],
          transport: n,
          initialData: [n.format, ...r]
        });
      case "function":
        return n.format({
          data: r,
          level: (e == null ? void 0 : e.level) || "info",
          logger: t,
          message: e,
          transport: n
        });
      default:
        return r;
    }
  }
};
function cw({ data: e }) {
  return typeof e[0] != "string" || typeof e[1] != "string" || e[0].match(/%[1cdfiOos]/) ? e : [`${e[0]} ${e[1]}`, ...e.slice(2)];
}
function lw(e) {
  const t = Math.abs(e), n = e > 0 ? "-" : "+", r = Math.floor(t / 60).toString().padStart(2, "0"), i = (t % 60).toString().padStart(2, "0");
  return `${n}${r}:${i}`;
}
function uw({ data: e, logger: t, message: n }) {
  const { defaultLabel: r, labelLength: i } = (t == null ? void 0 : t.scope) || {}, s = e[0];
  let a = n.scope;
  a || (a = r);
  let c;
  return a === "" ? c = i > 0 ? "".padEnd(i + 3) : "" : typeof a == "string" ? c = ` (${a})`.padEnd(i + 3) : c = "", e[0] = s.replace("{scope}", c), e;
}
function pw({ data: e, message: t }) {
  let n = e[0];
  if (typeof n != "string")
    return e;
  n = n.replace("{level}]", `${t.level}]`.padEnd(6, " "));
  const r = t.date || /* @__PURE__ */ new Date();
  return e[0] = n.replace(/\{(\w+)}/g, (i, s) => {
    var a;
    switch (s) {
      case "level":
        return t.level || "info";
      case "logId":
        return t.logId;
      case "y":
        return r.getFullYear().toString(10);
      case "m":
        return (r.getMonth() + 1).toString(10).padStart(2, "0");
      case "d":
        return r.getDate().toString(10).padStart(2, "0");
      case "h":
        return r.getHours().toString(10).padStart(2, "0");
      case "i":
        return r.getMinutes().toString(10).padStart(2, "0");
      case "s":
        return r.getSeconds().toString(10).padStart(2, "0");
      case "ms":
        return r.getMilliseconds().toString(10).padStart(3, "0");
      case "z":
        return lw(r.getTimezoneOffset());
      case "iso":
        return r.toISOString();
      default:
        return ((a = t.variables) == null ? void 0 : a[s]) || i;
    }
  }).trim(), e;
}
function dw({ data: e }) {
  const t = e[0];
  if (typeof t != "string")
    return e;
  if (t.lastIndexOf("{text}") === t.length - 6)
    return e[0] = t.replace(/\s?{text}/, ""), e[0] === "" && e.shift(), e;
  const r = t.split("{text}");
  let i = [];
  return r[0] !== "" && i.push(r[0]), i = i.concat(e.slice(1)), r[1] !== "" && i.push(r[1]), i;
}
var _u = { exports: {} };
(function(e) {
  const t = vt;
  e.exports = {
    serialize: r,
    maxDepth({ data: i, transport: s, depth: a = (s == null ? void 0 : s.depth) ?? 6 }) {
      if (!i)
        return i;
      if (a < 1)
        return Array.isArray(i) ? "[array]" : typeof i == "object" && i ? "[object]" : i;
      if (Array.isArray(i))
        return i.map((l) => e.exports.maxDepth({
          data: l,
          depth: a - 1
        }));
      if (typeof i != "object" || i && typeof i.toISOString == "function")
        return i;
      if (i === null)
        return null;
      if (i instanceof Error)
        return i;
      const c = {};
      for (const l in i)
        Object.prototype.hasOwnProperty.call(i, l) && (c[l] = e.exports.maxDepth({
          data: i[l],
          depth: a - 1
        }));
      return c;
    },
    toJSON({ data: i }) {
      return JSON.parse(JSON.stringify(i, n()));
    },
    toString({ data: i, transport: s }) {
      const a = (s == null ? void 0 : s.inspectOptions) || {}, c = i.map((l) => {
        if (l !== void 0)
          try {
            const p = JSON.stringify(l, n(), "  ");
            return p === void 0 ? void 0 : JSON.parse(p);
          } catch {
            return l;
          }
      });
      return t.formatWithOptions(a, ...c);
    }
  };
  function n(i = {}) {
    const s = /* @__PURE__ */ new WeakSet();
    return function(a, c) {
      if (typeof c == "object" && c !== null) {
        if (s.has(c))
          return;
        s.add(c);
      }
      return r(a, c, i);
    };
  }
  function r(i, s, a = {}) {
    const c = (a == null ? void 0 : a.serializeMapAndSet) !== !1;
    return s instanceof Error ? s.stack : s && (typeof s == "function" ? `[function] ${s.toString()}` : s instanceof Date ? s.toISOString() : c && s instanceof Map && Object.fromEntries ? Object.fromEntries(s) : c && s instanceof Set && Array.from ? Array.from(s) : s);
  }
})(_u);
var ni = _u.exports, Ys = {
  applyAnsiStyles({ data: e }) {
    return Xo(e, fw, mw);
  },
  removeStyles({ data: e }) {
    return Xo(e, () => "");
  }
};
const Su = {
  unset: "\x1B[0m",
  black: "\x1B[30m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  magenta: "\x1B[35m",
  cyan: "\x1B[36m",
  white: "\x1B[37m",
  gray: "\x1B[90m"
};
function fw(e) {
  const t = e.replace(/color:\s*(\w+).*/, "$1").toLowerCase();
  return Su[t] || "";
}
function mw(e) {
  return e + Su.unset;
}
function Xo(e, t, n) {
  const r = {};
  return e.reduce((i, s, a, c) => {
    if (r[a])
      return i;
    if (typeof s == "string") {
      let l = a, p = !1;
      s = s.replace(/%[1cdfiOos]/g, (u) => {
        if (l += 1, u !== "%c")
          return u;
        const d = c[l];
        return typeof d == "string" ? (r[l] = !0, p = !0, t(d, s)) : u;
      }), p && n && (s = n(s));
    }
    return i.push(s), i;
  }, []);
}
const {
  concatFirstStringElements: hw,
  format: gw
} = Eu, { maxDepth: vw, toJSON: bw } = ni, {
  applyAnsiStyles: xw,
  removeStyles: yw
} = Ys, { transform: ww } = Gn, Yo = {
  error: console.error,
  warn: console.warn,
  info: console.info,
  verbose: console.info,
  debug: console.debug,
  silly: console.debug,
  log: console.log
};
var Ew = ku;
const _w = process.platform === "win32" ? ">" : "›", Au = `%c{h}:{i}:{s}.{ms}{scope}%c ${_w} {text}`;
Object.assign(ku, {
  DEFAULT_FORMAT: Au
});
function ku(e) {
  return Object.assign(t, {
    colorMap: {
      error: "red",
      warn: "yellow",
      info: "cyan",
      verbose: "unset",
      debug: "gray",
      silly: "gray",
      default: "unset"
    },
    format: Au,
    level: "silly",
    transforms: [
      Sw,
      gw,
      kw,
      hw,
      vw,
      bw
    ],
    useStyles: process.env.FORCE_STYLES,
    writeFn({ message: n }) {
      (Yo[n.level] || Yo.info)(...n.data);
    }
  });
  function t(n) {
    const r = ww({ logger: e, message: n, transport: t });
    t.writeFn({
      message: { ...n, data: r }
    });
  }
}
function Sw({ data: e, message: t, transport: n }) {
  return typeof n.format != "string" || !n.format.includes("%c") ? e : [
    `color:${Tw(t.level, n)}`,
    "color:unset",
    ...e
  ];
}
function Aw(e, t) {
  if (typeof e == "boolean")
    return e;
  const r = t === "error" || t === "warn" ? process.stderr : process.stdout;
  return r && r.isTTY;
}
function kw(e) {
  const { message: t, transport: n } = e;
  return (Aw(n.useStyles, t.level) ? xw : yw)(e);
}
function Tw(e, t) {
  return t.colorMap[e] || t.colorMap.default;
}
const Pw = Wc, ot = gt, Qo = fn;
let Rw = class extends Pw {
  constructor({
    path: n,
    writeOptions: r = { encoding: "utf8", flag: "a", mode: 438 },
    writeAsync: i = !1
  }) {
    super();
    N(this, "asyncWriteQueue", []);
    N(this, "bytesWritten", 0);
    N(this, "hasActiveAsyncWriting", !1);
    N(this, "path", null);
    N(this, "initialSize");
    N(this, "writeOptions", null);
    N(this, "writeAsync", !1);
    this.path = n, this.writeOptions = r, this.writeAsync = i;
  }
  get size() {
    return this.getSize();
  }
  clear() {
    try {
      return ot.writeFileSync(this.path, "", {
        mode: this.writeOptions.mode,
        flag: "w"
      }), this.reset(), !0;
    } catch (n) {
      return n.code === "ENOENT" ? !0 : (this.emit("error", n, this), !1);
    }
  }
  crop(n) {
    try {
      const r = jw(this.path, n || 4096);
      this.clear(), this.writeLine(`[log cropped]${Qo.EOL}${r}`);
    } catch (r) {
      this.emit(
        "error",
        new Error(`Couldn't crop file ${this.path}. ${r.message}`),
        this
      );
    }
  }
  getSize() {
    if (this.initialSize === void 0)
      try {
        const n = ot.statSync(this.path);
        this.initialSize = n.size;
      } catch {
        this.initialSize = 0;
      }
    return this.initialSize + this.bytesWritten;
  }
  increaseBytesWrittenCounter(n) {
    this.bytesWritten += Buffer.byteLength(n, this.writeOptions.encoding);
  }
  isNull() {
    return !1;
  }
  nextAsyncWrite() {
    const n = this;
    if (this.hasActiveAsyncWriting || this.asyncWriteQueue.length === 0)
      return;
    const r = this.asyncWriteQueue.join("");
    this.asyncWriteQueue = [], this.hasActiveAsyncWriting = !0, ot.writeFile(this.path, r, this.writeOptions, (i) => {
      n.hasActiveAsyncWriting = !1, i ? n.emit(
        "error",
        new Error(`Couldn't write to ${n.path}. ${i.message}`),
        this
      ) : n.increaseBytesWrittenCounter(r), n.nextAsyncWrite();
    });
  }
  reset() {
    this.initialSize = void 0, this.bytesWritten = 0;
  }
  toString() {
    return this.path;
  }
  writeLine(n) {
    if (n += Qo.EOL, this.writeAsync) {
      this.asyncWriteQueue.push(n), this.nextAsyncWrite();
      return;
    }
    try {
      ot.writeFileSync(this.path, n, this.writeOptions), this.increaseBytesWrittenCounter(n);
    } catch (r) {
      this.emit(
        "error",
        new Error(`Couldn't write to ${this.path}. ${r.message}`),
        this
      );
    }
  }
};
var Tu = Rw;
function jw(e, t) {
  const n = Buffer.alloc(t), r = ot.statSync(e), i = Math.min(r.size, t), s = Math.max(0, r.size - t), a = ot.openSync(e, "r"), c = ot.readSync(a, n, 0, i, s);
  return ot.closeSync(a), n.toString("utf8", 0, c);
}
const Iw = Tu;
let Ow = class extends Iw {
  clear() {
  }
  crop() {
  }
  getSize() {
    return 0;
  }
  isNull() {
    return !0;
  }
  writeLine() {
  }
};
var $w = Ow;
const Nw = Wc, ec = gt, tc = nt, Cw = Tu, Lw = $w;
let Dw = class extends Nw {
  constructor() {
    super();
    N(this, "store", {});
    this.emitError = this.emitError.bind(this);
  }
  /**
   * Provide a File object corresponding to the filePath
   * @param {string} filePath
   * @param {WriteOptions} [writeOptions]
   * @param {boolean} [writeAsync]
   * @return {File}
   */
  provide({ filePath: n, writeOptions: r = {}, writeAsync: i = !1 }) {
    let s;
    try {
      if (n = tc.resolve(n), this.store[n])
        return this.store[n];
      s = this.createFile({ filePath: n, writeOptions: r, writeAsync: i });
    } catch (a) {
      s = new Lw({ path: n }), this.emitError(a, s);
    }
    return s.on("error", this.emitError), this.store[n] = s, s;
  }
  /**
   * @param {string} filePath
   * @param {WriteOptions} writeOptions
   * @param {boolean} async
   * @return {File}
   * @private
   */
  createFile({ filePath: n, writeOptions: r, writeAsync: i }) {
    return this.testFileWriting({ filePath: n, writeOptions: r }), new Cw({ path: n, writeOptions: r, writeAsync: i });
  }
  /**
   * @param {Error} error
   * @param {File} file
   * @private
   */
  emitError(n, r) {
    this.emit("error", n, r);
  }
  /**
   * @param {string} filePath
   * @param {WriteOptions} writeOptions
   * @private
   */
  testFileWriting({ filePath: n, writeOptions: r }) {
    ec.mkdirSync(tc.dirname(n), { recursive: !0 }), ec.writeFileSync(n, "", { flag: "a", mode: r.mode });
  }
};
var zw = Dw;
const or = gt, Fw = fn, En = nt, Uw = zw, { transform: Bw } = Gn, { removeStyles: Mw } = Ys, {
  format: qw,
  concatFirstStringElements: Hw
} = Eu, { toString: Vw } = ni;
var Zw = Gw;
const Ww = new Uw();
function Gw(e, { registry: t = Ww, externalApi: n } = {}) {
  let r;
  return t.listenerCount("error") < 1 && t.on("error", (p, u) => {
    a(`Can't write to ${u}`, p);
  }), Object.assign(i, {
    fileName: Jw(e.variables.processType),
    format: "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}",
    getFile: c,
    inspectOptions: { depth: 5 },
    level: "silly",
    maxSize: 1024 ** 2,
    readAllLogs: l,
    sync: !0,
    transforms: [Mw, qw, Hw, Vw],
    writeOptions: { flag: "a", mode: 438, encoding: "utf8" },
    archiveLogFn(p) {
      const u = p.toString(), d = En.parse(u);
      try {
        or.renameSync(u, En.join(d.dir, `${d.name}.old${d.ext}`));
      } catch (f) {
        a("Could not rotate log", f);
        const m = Math.round(i.maxSize / 4);
        p.crop(Math.min(m, 256 * 1024));
      }
    },
    resolvePathFn(p) {
      return En.join(p.libraryDefaultDir, p.fileName);
    },
    setAppName(p) {
      e.dependencies.externalApi.setAppName(p);
    }
  });
  function i(p) {
    const u = c(p);
    i.maxSize > 0 && u.size > i.maxSize && (i.archiveLogFn(u), u.reset());
    const f = Bw({ logger: e, message: p, transport: i });
    u.writeLine(f);
  }
  function s() {
    r || (r = Object.create(
      Object.prototype,
      {
        ...Object.getOwnPropertyDescriptors(
          n.getPathVariables()
        ),
        fileName: {
          get() {
            return i.fileName;
          },
          enumerable: !0
        }
      }
    ), typeof i.archiveLog == "function" && (i.archiveLogFn = i.archiveLog, a("archiveLog is deprecated. Use archiveLogFn instead")), typeof i.resolvePath == "function" && (i.resolvePathFn = i.resolvePath, a("resolvePath is deprecated. Use resolvePathFn instead")));
  }
  function a(p, u = null, d = "error") {
    const f = [`electron-log.transports.file: ${p}`];
    u && f.push(u), e.transports.console({ data: f, date: /* @__PURE__ */ new Date(), level: d });
  }
  function c(p) {
    s();
    const u = i.resolvePathFn(r, p);
    return t.provide({
      filePath: u,
      writeAsync: !i.sync,
      writeOptions: i.writeOptions
    });
  }
  function l({ fileFilter: p = (u) => u.endsWith(".log") } = {}) {
    s();
    const u = En.dirname(i.resolvePathFn(r));
    return or.existsSync(u) ? or.readdirSync(u).map((d) => En.join(u, d)).filter(p).map((d) => {
      try {
        return {
          path: d,
          lines: or.readFileSync(d, "utf8").split(Fw.EOL)
        };
      } catch {
        return null;
      }
    }).filter(Boolean) : [];
  }
}
function Jw(e = process.type) {
  switch (e) {
    case "renderer":
      return "renderer.log";
    case "worker":
      return "worker.log";
    default:
      return "main.log";
  }
}
const { maxDepth: Kw, toJSON: Xw } = ni, { transform: Yw } = Gn;
var Qw = eE;
function eE(e, { externalApi: t }) {
  return Object.assign(n, {
    depth: 3,
    eventId: "__ELECTRON_LOG_IPC__",
    level: e.isDev ? "silly" : !1,
    transforms: [Xw, Kw]
  }), t != null && t.isElectron() ? n : void 0;
  function n(r) {
    var i;
    ((i = r == null ? void 0 : r.variables) == null ? void 0 : i.processType) !== "renderer" && (t == null || t.sendIpc(n.eventId, {
      ...r,
      data: Yw({ logger: e, message: r, transport: n })
    }));
  }
}
const tE = Br, nE = Mr, { transform: rE } = Gn, { removeStyles: iE } = Ys, { toJSON: sE, maxDepth: aE } = ni;
var oE = cE;
function cE(e) {
  return Object.assign(t, {
    client: { name: "electron-application" },
    depth: 6,
    level: !1,
    requestOptions: {},
    transforms: [iE, sE, aE],
    makeBodyFn({ message: n }) {
      return JSON.stringify({
        client: t.client,
        data: n.data,
        date: n.date.getTime(),
        level: n.level,
        scope: n.scope,
        variables: n.variables
      });
    },
    processErrorFn({ error: n }) {
      e.processMessage(
        {
          data: [`electron-log: can't POST ${t.url}`, n],
          level: "warn"
        },
        { transports: ["console", "file"] }
      );
    },
    sendRequestFn({ serverUrl: n, requestOptions: r, body: i }) {
      const a = (n.startsWith("https:") ? nE : tE).request(n, {
        method: "POST",
        ...r,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": i.length,
          ...r.headers
        }
      });
      return a.write(i), a.end(), a;
    }
  });
  function t(n) {
    if (!t.url)
      return;
    const r = t.makeBodyFn({
      logger: e,
      message: { ...n, data: rE({ logger: e, message: n, transport: t }) },
      transport: t
    }), i = t.sendRequestFn({
      serverUrl: t.url,
      requestOptions: t.requestOptions,
      body: Buffer.from(r, "utf8")
    });
    i.on("error", (s) => t.processErrorFn({
      error: s,
      logger: e,
      message: n,
      request: i,
      transport: t
    }));
  }
}
const nc = ew, lE = rw, uE = sw, pE = Ew, dE = Zw, fE = Qw, mE = oE;
var hE = gE;
function gE({ dependencies: e, initializeFn: t }) {
  var r;
  const n = new nc({
    dependencies: e,
    errorHandler: new lE(),
    eventLogger: new uE(),
    initializeFn: t,
    isDev: (r = e.externalApi) == null ? void 0 : r.isDev(),
    logId: "default",
    transportFactories: {
      console: pE,
      file: dE,
      ipc: fE,
      remote: mE
    },
    variables: {
      processType: "main"
    }
  });
  return n.default = n, n.Logger = nc, n.processInternalErrorFn = (i) => {
    n.transports.console.writeFn({
      message: {
        data: ["Unhandled electron-log error", i],
        level: "error"
      }
    });
  }, n;
}
const vE = qp, bE = U0, { initialize: xE } = H0, yE = hE, Qs = new bE({ electron: vE }), ri = yE({
  dependencies: { externalApi: Qs },
  initializeFn: xE
});
var wE = ri;
Qs.onIpc("__ELECTRON_LOG__", (e, t) => {
  t.scope && ri.Logger.getInstance(t).scope(t.scope);
  const n = new Date(t.date);
  Pu({
    ...t,
    date: n.getTime() ? n : /* @__PURE__ */ new Date()
  });
});
Qs.onIpcInvoke("__ELECTRON_LOG__", (e, { cmd: t = "", logId: n }) => {
  switch (t) {
    case "getOptions":
      return {
        levels: ri.Logger.getInstance({ logId: n }).levels,
        logId: n
      };
    default:
      return Pu({ data: [`Unknown cmd '${t}'`], level: "error" }), {};
  }
});
function Pu(e) {
  var t;
  (t = ri.Logger.getInstance(e)) == null || t.processMessage(e);
}
const EE = wE;
var _E = EE;
const SE = /* @__PURE__ */ Nt(_E), U = SE;
function AE() {
  var t, n;
  const e = Y.join(((n = (t = J) == null ? void 0 : t.getPath) == null ? void 0 : n.call(t, "logs")) ?? process.cwd(), "landev-track.log");
  return ce.mkdirSync(Y.dirname(e), { recursive: !0 }), e;
}
U.initialize();
U.transports.file.level = "info";
var qc;
const kE = typeof ((qc = J) == null ? void 0 : qc.isPackaged) == "boolean" ? J.isPackaged : !1;
U.transports.console.level = kE ? "warn" : "debug";
U.transports.file.maxSize = 5 * 1024 * 1024;
U.transports.file.resolvePathFn = () => AE();
const TE = U.transports.file.archiveLogFn;
let Ui = !1;
U.transports.file.archiveLogFn = (e) => {
  if (Ui)
    return;
  const t = typeof e == "string" ? e : typeof e == "object" && e && "path" in e ? String(e.path) : null;
  if (!(!t || !ce.existsSync(t))) {
    Ui = !0;
    try {
      TE(e);
    } catch {
    } finally {
      Ui = !1;
    }
  }
};
const PE = Fn({
  VITE_API_BASE_URL: de().url(),
  VITE_APP_ENV: is(["dev", "staging", "prod"]).default("dev"),
  APP_NAME: de().default("LANDEV Tracker"),
  AUTO_UPDATE_ENABLED: is(["true", "false"]).default("false"),
  UPDATE_FEED_URL: de().url().optional()
});
let cr = null;
function un() {
  if (cr)
    return cr;
  const e = process.env.VITE_API_BASE_URL, t = "http://localhost:3000";
  e || U.warn("missing-api-base-url-using-fallback", { fallbackApiBaseUrl: t });
  const n = PE.parse({
    VITE_API_BASE_URL: e ?? t,
    VITE_APP_ENV: process.env.VITE_APP_ENV ?? "dev",
    APP_NAME: process.env.APP_NAME ?? "LANDEV Tracker",
    AUTO_UPDATE_ENABLED: process.env.AUTO_UPDATE_ENABLED ?? "false",
    UPDATE_FEED_URL: process.env.UPDATE_FEED_URL
  });
  return cr = {
    ...n,
    autoUpdateEnabled: n.AUTO_UPDATE_ENABLED === "true",
    updateFeedUrl: n.UPDATE_FEED_URL ?? "https://github.com/SamiAbdullatif20/landev-track-app/releases/latest/download"
  }, cr;
}
const we = {
  auth: {
    login: "/api/auth/login",
    logout: ["/api/auth/logout", "/auth/logout"],
    me: ["/api/auth/me", "/api/me", "/api/auth/session"]
  },
  tracking: {
    projects: "/api/projects",
    sessionStart: "/api/tracking/session/start",
    sessionStop: "/api/tracking/session/stop",
    sessionActive: "/api/tracking/session/active",
    sessionStatus: "/api/tracking/session/status",
    screenshotsSign: "/api/tracking/screenshots/sign",
    screenshotsCommit: "/api/tracking/screenshots/commit",
    eventsBatch: "/api/tracking/events/batch"
  },
  attendance: {
    today: ["/api/attendance/today", "/attendance/today"]
  }
};
function Xt(e) {
  if (e == null)
    return null;
  if (typeof e == "string") {
    const t = e.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof e == "number" || typeof e == "boolean")
    return String(e);
  if (Array.isArray(e)) {
    for (const t of e) {
      const n = Xt(t);
      if (n)
        return n;
    }
    return null;
  }
  if (typeof e == "object") {
    const t = e;
    for (const n of ["message", "error", "detail", "description", "msg", "reason"]) {
      const r = Xt(t[n]);
      if (r)
        return r;
    }
    for (const n of ["errors", "issues", "details"]) {
      const r = Xt(t[n]);
      if (r)
        return r;
    }
    for (const n of ["code", "type", "name"]) {
      const r = Xt(t[n]);
      if (r)
        return r;
    }
  }
  return null;
}
function Bi(e, t) {
  const n = Xt(e);
  return n || (t === 401 || t === 403 ? "Invalid username or password." : t === 402 ? "The tracking server is temporarily unavailable. Please contact your admin." : t === 404 ? "Login service not found. Please contact your admin." : t >= 500 ? "Server is currently unavailable. Try again shortly." : `Request failed with status ${t}.`);
}
class Pe extends Error {
  constructor(n, r, i) {
    super(r);
    N(this, "kind");
    N(this, "statusCode");
    N(this, "responsePreview");
    this.kind = n, this.statusCode = i == null ? void 0 : i.statusCode, this.responsePreview = i == null ? void 0 : i.responsePreview;
  }
}
let lr = null, Ru = [];
function Ce() {
  if (lr) return lr;
  const t = un().VITE_API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");
  return lr = M.create({
    baseURL: t,
    timeout: 15e3,
    withCredentials: !0
  }), lr;
}
function RE(e) {
  if (e != null)
    try {
      return (typeof e == "string" ? e : JSON.stringify(e)).slice(0, 220);
    } catch {
      return;
    }
}
function gn(e) {
  if (e instanceof wl) {
    const i = e.issues[0], s = Xt(i) ?? (i == null ? void 0 : i.message) ?? "Response validation failed.";
    return new Pe("validation", s);
  }
  if (!M.isAxiosError(e))
    return e instanceof Error ? new Pe("validation", e.message) : new Pe("server", "Unexpected error while talking to server.");
  const t = e;
  if (!t.response)
    return new Pe("network", "Network unavailable. Check your connection and retry.");
  const n = t.response.status, r = {
    statusCode: n,
    responsePreview: RE(t.response.data)
  };
  return n === 401 || n === 403 ? new Pe("auth", Bi(t.response.data, n), r) : n >= 500 ? new Pe("server", Bi(t.response.data, n), r) : new Pe(
    "validation",
    Bi(t.response.data, n),
    r
  );
}
async function Lt(e, t) {
  try {
    return await e(t);
  } catch (n) {
    const r = gn(n);
    if (r.kind !== "auth" || !t.onAuthRefresh)
      throw r;
    const i = await t.onAuthRefresh();
    if (!i)
      throw r;
    return U.info("auth-retry-request"), await e(i);
  }
}
async function jE(e, t = 3) {
  var r;
  let n;
  for (let i = 0; i < t; i += 1)
    try {
      return await e();
    } catch (s) {
      n = s;
      const c = (r = s.response) == null ? void 0 : r.status;
      if (!(!c || c >= 500 || c === 429) || i === t - 1)
        break;
      await new Promise((p) => setTimeout(p, 400 * (i + 1)));
    }
  throw gn(n);
}
function Oe(e) {
  const t = {};
  return e.token && (t.Authorization = `Bearer ${e.token}`), e.sessionCookie && (t.Cookie = e.sessionCookie), t;
}
function ju(e) {
  return !e || e.length === 0 ? null : e.map((t) => {
    var n;
    return (n = t.split(";")[0]) == null ? void 0 : n.trim();
  }).filter(Boolean).join("; ");
}
function Ue(e, t) {
  const n = ju(e.headers["set-cookie"]);
  n && t.onSessionCookie && t.onSessionCookie(n);
}
async function vn(e, t) {
  var r;
  let n;
  for (const i of e)
    try {
      return await t(i);
    } catch (s) {
      if (n = s, M.isAxiosError(s) && ((r = s.response) == null ? void 0 : r.status) === 404)
        continue;
      throw s;
    }
  throw n;
}
function rc(e) {
  return typeof e == "string" && e.trim() ? [e.trim()] : Array.isArray(e) ? e.map((t) => typeof t == "string" ? t.trim() : null).filter((t) => !!t) : [];
}
function ea(e) {
  if (!e || typeof e != "object") return [];
  const t = e, n = rc(t.roles);
  if (n.length > 0) return n;
  const r = t.user;
  return r && typeof r == "object" ? rc(r.roles) : [];
}
function IE(e) {
  if (!e || typeof e != "object") return null;
  const t = e;
  for (const n of ["token", "accessToken", "access_token"])
    if (typeof t[n] == "string" && t[n].trim())
      return t[n].trim();
  return null;
}
function OE(e) {
  return {
    username: e.username,
    email: e.username,
    password: e.password
  };
}
function ms() {
  return [...Ru];
}
function ta(e) {
  Ru = [...e];
}
async function $E(e) {
  const t = Ce();
  try {
    const n = await vn(
      we.auth.me,
      (i) => t.get(i, { headers: Oe(e) })
    );
    Ue(n, e);
    const r = ea(n.data);
    return r.length > 0 && ta(r), r.length > 0 ? r : ms();
  } catch {
    return ms();
  }
}
async function Iu(e, t) {
  return jE(async () => {
    const r = await Ce().post(we.auth.login, OE(e), {
      headers: Oe(t)
    });
    Ue(r, t);
    const i = ju(r.headers["set-cookie"]), s = IE(r.data), a = ea(r.data);
    a.length > 0 && ta(a);
    const c = a.length > 0 ? a : await $E(t);
    if (!s && !i && c.length === 0)
      throw new Pe("auth", "Login did not return a session. Check your username and password.");
    return { token: s, sessionCookie: i, roles: c };
  });
}
async function NE(e) {
  var t, n;
  if (!e.token && !e.sessionCookie)
    return { authenticated: !1 };
  try {
    const r = Ce(), i = await vn(
      we.auth.me,
      (s) => r.get(s, { headers: Oe(e) })
    );
    return Ue(i, e), { authenticated: !0 };
  } catch (r) {
    if (r instanceof Pe && r.kind === "auth")
      return { authenticated: !1 };
    if (M.isAxiosError(r) && (((t = r.response) == null ? void 0 : t.status) === 401 || ((n = r.response) == null ? void 0 : n.status) === 403))
      return { authenticated: !1 };
    throw gn(r);
  }
}
async function CE(e) {
  var t;
  try {
    const n = Ce();
    await vn(
      we.auth.logout,
      (r) => n.post(r, {}, { headers: Oe(e), timeout: 8e3 })
    );
  } catch (n) {
    const r = M.isAxiosError(n) ? (t = n.response) == null ? void 0 : t.status : null;
    if (r === 404 || r === 401 || r === 403)
      return;
    U.warn("auth-logout-request-failed", {
      error: n instanceof Error ? n.message : "unknown",
      status: r
    });
  }
}
async function LE() {
  try {
    return await Ce().post(we.auth.login, { username: "_probe_", password: "_probe_" }), { reachable: !0, message: "Backend reachable" };
  } catch (e) {
    return M.isAxiosError(e) && e.response ? { reachable: !0, message: `Backend reachable (HTTP ${e.response.status})` } : { reachable: !1, message: "Backend is unreachable." };
  }
}
const DE = Fn({
  ok: _l(!0).optional(),
  path: de().min(1).optional(),
  storagePath: de().min(1).optional(),
  token: de().min(1),
  signedUrl: de().url().optional(),
  uploadUrl: de().url().optional(),
  uploadUuid: de().optional(),
  mimeType: de().optional(),
  contentType: de().optional(),
  capturedAtIso: de().optional(),
  capturedAt: de().optional()
}).refine((e) => !!(e.path || e.storagePath), {
  message: "path or storagePath required"
}).refine((e) => !!(e.signedUrl || e.uploadUrl), {
  message: "signedUrl or uploadUrl required"
});
function zE(e) {
  return {
    uploadUuid: e.uploadUuid,
    capturedAtIso: e.capturedAtIso,
    capturedAt: e.capturedAtIso,
    mimeType: e.mimeType,
    contentType: e.mimeType,
    ...typeof e.byteSize == "number" ? { byteSize: e.byteSize } : {},
    ...e.projectId ? { projectId: e.projectId } : {},
    ...e.sessionId ? { sessionId: e.sessionId, workSessionId: e.sessionId } : {}
  };
}
function FE(e, t) {
  const n = DE.parse(e), r = n.path ?? n.storagePath, i = n.signedUrl ?? n.uploadUrl;
  return Ou(i), {
    path: r,
    token: n.token,
    signedUrl: i,
    uploadUuid: n.uploadUuid ?? t.uploadUuid,
    mimeType: n.mimeType ?? n.contentType ?? t.mimeType,
    capturedAtIso: n.capturedAtIso ?? n.capturedAt ?? t.capturedAtIso
  };
}
function Ou(e) {
  let t;
  try {
    t = new URL(e).hostname.toLowerCase();
  } catch {
    throw new Pe("validation", "Invalid screenshot upload URL from sign API.");
  }
  let n = "";
  try {
    n = new URL(un().VITE_API_BASE_URL).hostname.toLowerCase();
  } catch {
    n = "";
  }
  if (t.includes("vercel.app") || n && (t === n || t.endsWith(`.${n}`)))
    throw new Pe(
      "validation",
      `Screenshot signed URL must target storage, not the web API (${t}).`
    );
}
const UE = Fn({
  ok: _l(!0),
  duplicate: bg().optional(),
  screenshotId: de().optional()
});
async function $u(e, t) {
  return Lt(async (n) => {
    const i = await Ce().post(
      we.tracking.screenshotsSign,
      zE(e),
      { headers: Oe(n) }
    );
    return Ue(i, n), FE(i.data, e);
  }, t);
}
async function BE(e, t) {
  return Lt(async (n) => {
    const i = await Ce().post(
      we.tracking.screenshotsCommit,
      {
        ...e,
        storagePath: e.path
      },
      { headers: Oe(n) }
    );
    Ue(i, n);
    const s = UE.parse(i.data);
    return {
      duplicate: s.duplicate ?? !1,
      screenshotId: s.screenshotId
    };
  }, t);
}
async function ME(e, t) {
  return Lt(async (n) => {
    const i = await Ce().post(
      we.tracking.eventsBatch,
      { events: e.events },
      { headers: Oe(n), timeout: 3e4 }
    );
    return Ue(i, n), { ok: !0 };
  }, t);
}
function Te(e) {
  if (e == null) return null;
  if (typeof e == "string") {
    const t = e.trim();
    return t.length > 0 ? t : null;
  }
  return typeof e == "number" || typeof e == "boolean" ? String(e) : null;
}
function qE(e) {
  const t = Te(e.id ?? e.projectId ?? e.project_id ?? e._id), n = Te(
    e.name ?? e.title ?? e.projectName ?? e.project_name ?? e.displayLabel ?? e.projectNumber
  );
  if (!t || !n) return null;
  const r = Te(e.projectNumber ?? e.project_number ?? e.code), i = Te(
    e.projectAddress ?? e.project_address ?? e.address
  ), s = e.clientName ?? e.client_name ?? e.client, a = Te(
    s && typeof s == "object" ? s.name ?? s.title : s
  ), c = Te(e.displayLabel ?? e.display_label) ?? r ?? n, l = Te(e.searchLabel ?? e.search_label) ?? [n, a, r, i].filter(Boolean).join(" ") ?? n;
  return { id: t, name: n, displayLabel: c, searchLabel: l, projectNumber: r, projectAddress: i, clientName: a };
}
function HE(e) {
  if (Array.isArray(e)) return e;
  if (!e || typeof e != "object") return [];
  const t = e;
  for (const n of ["projects", "assignedProjects", "assigned_projects", "data", "items", "results"]) {
    const r = t[n];
    if (Array.isArray(r)) return r;
    if (r && typeof r == "object") {
      const i = r;
      for (const s of ["projects", "items", "results"])
        if (Array.isArray(i[s])) return i[s];
    }
  }
  return [];
}
function VE(e) {
  if (!e || typeof e != "object") return null;
  const t = e, n = Te(t.nextCursor ?? t.next_cursor);
  if (n) return n;
  const r = t.pagination ?? t.meta;
  if (r && typeof r == "object") {
    const i = r;
    return i.hasMore === !1 || i.has_more === !1 ? null : Te(i.nextCursor ?? i.next_cursor ?? i.next);
  }
  return null;
}
async function ZE(e) {
  return Lt(async (t) => {
    const n = Ce(), r = /* @__PURE__ */ new Map();
    let i = null, s = 0;
    do {
      if (s += 1, s > 100) break;
      const a = await n.get(we.tracking.projects, {
        headers: Oe(t),
        params: { limit: 200, ...i ? { cursor: i } : {} }
      });
      Ue(a, t);
      for (const c of HE(a.data)) {
        if (!c || typeof c != "object") continue;
        const l = qE(c);
        l && r.set(l.id, l);
      }
      i = VE(a.data);
    } while (i);
    return Array.from(r.values()).sort((a, c) => {
      const l = ic(a.displayLabel, a.name) ? 0 : 1, p = ic(c.displayLabel, c.name) ? 0 : 1;
      return l !== p ? l - p : a.displayLabel.localeCompare(c.displayLabel, void 0, { sensitivity: "base" });
    });
  }, e);
}
function ic(...e) {
  return e.some((t) => {
    if (!t) return !1;
    const n = t.trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ");
    return n === "admin - new task" || n.includes("admin - new task");
  });
}
async function sc(e) {
  const t = Ce(), n = await vn(
    we.auth.me,
    (l) => t.get(l, { headers: Oe(e) })
  );
  Ue(n, e);
  const r = n.data && typeof n.data == "object" ? n.data : {}, i = r.user && typeof r.user == "object" ? r.user : r, s = ea(n.data);
  s.length > 0 && ta(s);
  const a = Te(i.username ?? i.email ?? r.username ?? r.email) ?? "User", c = Te(i.name ?? i.fullName ?? i.full_name ?? r.name) ?? a;
  return {
    id: Te(i.id ?? r.id),
    name: c,
    username: a,
    email: Te(i.email ?? r.email),
    roles: s.length > 0 ? s : ms()
  };
}
function Nu(e, t) {
  var n, r, i;
  try {
    const s = new Intl.DateTimeFormat("en-CA", {
      timeZone: t,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date(e)), a = (n = s.find((p) => p.type === "year")) == null ? void 0 : n.value, c = (r = s.find((p) => p.type === "month")) == null ? void 0 : r.value, l = (i = s.find((p) => p.type === "day")) == null ? void 0 : i.value;
    if (a && c && l) return `${a}-${c}-${l}`;
  } catch {
  }
  return e.slice(0, 10);
}
function Cn(e) {
  if (!e || typeof e != "object") return null;
  const t = e;
  for (const r of ["sessionId", "workSessionId", "id", "work_session_id"]) {
    const i = Te(t[r]);
    if (i) return i;
  }
  const n = t.session ?? t.workSession ?? t.data;
  return n && typeof n == "object" ? Cn(n) : null;
}
async function ac(e, t) {
  return Lt(async (n) => {
    var l;
    const r = Ce(), i = e.startTimeUtc, s = e.workDateKey ?? Nu(i, e.clientTimeZone), a = Dn(), c = {
      projectId: e.projectId,
      projectName: e.projectName,
      description: e.description,
      workDetails: e.description,
      work_details: e.description,
      details: e.description,
      clientTimeZone: e.clientTimeZone,
      workDateKey: s,
      startTime: i,
      startedAt: i,
      startTimeUtc: i,
      occurredAt: i,
      // Enables immediate live-counter start on web without waiting for poll.
      trailingEvents: [
        {
          eventUuid: a,
          eventKind: "SESSION_START",
          type: "SESSION_START",
          occurredAtIso: i,
          occurredAt: i,
          workDateKey: s,
          clientTimeZone: e.clientTimeZone,
          projectId: e.projectId,
          projectName: e.projectName,
          description: e.description,
          source: "DESKTOP_AGENT"
        }
      ]
    };
    try {
      const p = await r.post(we.tracking.sessionStart, c, {
        headers: Oe(n)
      });
      return Ue(p, n), { sessionId: Cn(p.data) };
    } catch (p) {
      if (M.isAxiosError(p) && ((l = p.response) == null ? void 0 : l.status) === 404) {
        const u = await vn(
          we.attendance.today,
          (d) => r.post(
            d,
            { ...c, action: "start" },
            { headers: Oe(n) }
          )
        );
        return Ue(u, n), { sessionId: Cn(u.data) };
      }
      throw gn(p);
    }
  }, t);
}
async function WE(e, t) {
  return Lt(async (n) => {
    var l;
    const r = Ce(), i = e.stoppedAt, s = e.workDateKey ?? Nu(i, e.clientTimeZone ?? "UTC"), a = Dn(), c = {
      stoppedAt: i,
      stopTimeUtc: i,
      endTime: i,
      occurredAt: i,
      workDateKey: s,
      trailingEvents: [
        {
          eventUuid: a,
          eventKind: "SESSION_STOP",
          type: "SESSION_STOP",
          occurredAtIso: i,
          occurredAt: i,
          workDateKey: s,
          clientTimeZone: e.clientTimeZone,
          sessionId: e.sessionId,
          workSessionId: e.sessionId,
          source: "DESKTOP_AGENT"
        }
      ]
    };
    e.sessionId && (c.sessionId = e.sessionId, c.workSessionId = e.sessionId), e.projectId && (c.projectId = e.projectId), e.projectName && (c.projectName = e.projectName), e.startedAt && (c.startedAt = e.startedAt, c.startTime = e.startedAt, c.startTimeUtc = e.startedAt), typeof e.durationMs == "number" && (c.durationMs = e.durationMs, c.trackedDurationMs = e.durationMs, c.durationSeconds = Math.round(e.durationMs / 1e3)), e.clientTimeZone && (c.clientTimeZone = e.clientTimeZone, c.timezone = e.clientTimeZone), e.description && (c.description = e.description, c.workDetails = e.description);
    try {
      const p = await r.post(we.tracking.sessionStop, c, {
        headers: Oe(n)
      });
      return Ue(p, n), { ok: !0, sessionId: Cn(p.data) ?? e.sessionId ?? null };
    } catch (p) {
      if (M.isAxiosError(p) && ((l = p.response) == null ? void 0 : l.status) === 404)
        return await vn(
          we.attendance.today,
          (u) => r.post(
            u,
            { ...c, action: "end" },
            { headers: Oe(n) }
          )
        ), { ok: !0, sessionId: e.sessionId ?? null };
      throw gn(p);
    }
  }, t);
}
async function Pn(e) {
  return Lt(async (t) => {
    var i, s, a;
    const n = Ce(), r = [
      we.tracking.sessionActive,
      we.tracking.sessionStatus,
      ...we.attendance.today
    ];
    for (const c of r)
      try {
        const l = await n.get(c, { headers: Oe(t) });
        Ue(l, t);
        const p = l.data;
        if (p && typeof p == "object") {
          const u = p;
          if ((u.active ?? u.isActive ?? u.is_active) === !1) continue;
          const f = Cn(p);
          if (f) return f;
        }
      } catch (l) {
        if (M.isAxiosError(l) && ((i = l.response) == null ? void 0 : i.status) === 404) continue;
        if (M.isAxiosError(l) && (((s = l.response) == null ? void 0 : s.status) === 401 || ((a = l.response) == null ? void 0 : a.status) === 403))
          throw gn(l);
      }
    return null;
  }, e);
}
const Lr = Y.join(J.getPath("userData"), "token.bin"), Dr = Y.join(J.getPath("userData"), "session-cookie.bin");
function Cu(e, t) {
  if (!ht.isEncryptionAvailable())
    throw new Error("OS encryption is unavailable for secure storage.");
  const n = ht.encryptString(t);
  ce.writeFileSync(e, n);
}
function Lu(e) {
  if (!ce.existsSync(e) || !ht.isEncryptionAvailable())
    return null;
  const t = ce.readFileSync(e);
  return ht.decryptString(t);
}
function Du(e) {
  Cu(Lr, e);
}
function na() {
  return Lu(Lr);
}
function zu() {
  ce.existsSync(Lr) && ce.unlinkSync(Lr);
}
function ra(e) {
  Cu(Dr, e);
}
function ia() {
  return Lu(Dr);
}
function Fu() {
  ce.existsSync(Dr) && ce.unlinkSync(Dr);
}
const Ln = Y.join(J.getPath("userData"), "login-credentials.bin");
function GE(e) {
  if (!ht.isEncryptionAvailable())
    throw new Error("OS encryption is unavailable for secure storage.");
  ce.writeFileSync(Ln, ht.encryptString(e));
}
function JE() {
  return !ce.existsSync(Ln) || !ht.isEncryptionAvailable() ? null : ht.decryptString(ce.readFileSync(Ln));
}
function KE(e, t) {
  GE(JSON.stringify({ username: e, password: t }));
}
function XE() {
  const e = JE();
  if (!e)
    return null;
  try {
    const t = JSON.parse(e);
    return !t.username || !t.password ? null : t;
  } catch {
    return null;
  }
}
function YE() {
  ce.existsSync(Ln) && ce.unlinkSync(Ln);
}
function QE() {
  const e = un().VITE_API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");
  return [e, `${e}/api`];
}
async function e1() {
  let e = 0;
  for (const t of QE())
    try {
      const n = await Ea.defaultSession.cookies.get({ url: t });
      for (const r of n)
        await Ea.defaultSession.cookies.remove(t, r.name), e += 1;
    } catch (n) {
      U.warn("api-session-cookie-clear-failed", {
        url: t,
        error: n instanceof Error ? n.message : "unknown"
      });
    }
  e > 0 && U.info("api-session-cookies-cleared", { count: e });
}
function dt() {
  return {
    token: na() ?? void 0,
    sessionCookie: ia() ?? void 0,
    onSessionCookie: ra
  };
}
function t1() {
  return !!(na() || ia());
}
async function sa() {
  const e = XE();
  if (!e)
    return U.warn("auth-refresh-skipped", { reason: "no_saved_credentials" }), null;
  try {
    U.info("auth-refresh-attempt", { username: e.username });
    const t = await Iu(
      { username: e.username, password: e.password },
      dt()
    );
    return t.token && Du(t.token), t.sessionCookie && ra(t.sessionCookie), U.info("auth-refresh-success", { hasToken: !!t.token, hasCookie: !!t.sessionCookie }), dt();
  } catch (t) {
    return U.warn("auth-refresh-failed", {
      error: t instanceof Error ? t.message : "unknown"
    }), zu(), Fu(), null;
  }
}
let qt = null;
function n1() {
  return Y.join(J.getPath("userData"), "landev-tracker-v2.sqlite");
}
function _e() {
  if (qt) return qt;
  const e = n1();
  return ce.mkdirSync(Y.dirname(e), { recursive: !0 }), qt = new Yp(e), qt.pragma("journal_mode = WAL"), qt.exec(`
    CREATE TABLE IF NOT EXISTS local_session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      active INTEGER NOT NULL DEFAULT 0,
      sessionId TEXT,
      projectId TEXT,
      projectName TEXT,
      description TEXT NOT NULL DEFAULT '',
      startedAt TEXT,
      draftDescription TEXT NOT NULL DEFAULT '',
      updatedAt TEXT NOT NULL
    );
    INSERT OR IGNORE INTO local_session (id, active, description, draftDescription, updatedAt)
    VALUES (1, 0, '', '', datetime('now'));

    CREATE TABLE IF NOT EXISTS screenshot_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uploadUuid TEXT NOT NULL UNIQUE,
      capturedAt TEXT NOT NULL,
      filePath TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      projectId TEXT,
      sessionId TEXT,
      metadataJson TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recent_projects (
      projectId TEXT PRIMARY KEY,
      projectName TEXT NOT NULL,
      lastWorkedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS work_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId TEXT NOT NULL,
      projectName TEXT NOT NULL,
      startedAt TEXT NOT NULL,
      stoppedAt TEXT NOT NULL,
      durationMs INTEGER NOT NULL,
      workDateKey TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_work_log_date ON work_log(workDateKey);

    CREATE TABLE IF NOT EXISTS app_usage_day (
      workDateKey TEXT NOT NULL,
      appKey TEXT NOT NULL,
      displayName TEXT NOT NULL,
      processName TEXT,
      seconds INTEGER NOT NULL DEFAULT 0,
      updatedAt TEXT NOT NULL,
      PRIMARY KEY (workDateKey, appKey)
    );

    CREATE TABLE IF NOT EXISTS event_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventUuid TEXT NOT NULL UNIQUE,
      eventKind TEXT NOT NULL,
      payloadJson TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      nextRunAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_event_queue_pending ON event_queue(status, nextRunAt);
  `), qt;
}
function Qe() {
  return _e().prepare(
    `SELECT active, sessionId, projectId, projectName, description, startedAt, draftDescription
       FROM local_session WHERE id = 1`
  ).get() ?? {
    active: 0,
    sessionId: null,
    projectId: null,
    projectName: null,
    description: "",
    startedAt: null,
    draftDescription: ""
  };
}
function Ar(e) {
  const t = Qe();
  _e().prepare(
    `UPDATE local_session SET
        active = @active,
        sessionId = @sessionId,
        projectId = @projectId,
        projectName = @projectName,
        description = @description,
        startedAt = @startedAt,
        draftDescription = @draftDescription,
        updatedAt = @updatedAt
      WHERE id = 1`
  ).run({
    active: e.active,
    sessionId: e.sessionId ?? t.sessionId,
    projectId: e.projectId ?? t.projectId,
    projectName: e.projectName ?? t.projectName,
    description: e.description ?? t.description,
    startedAt: e.startedAt === void 0 ? t.startedAt : e.startedAt,
    draftDescription: e.draftDescription ?? t.draftDescription,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
function r1() {
  Ar({
    active: 0,
    sessionId: null,
    projectId: null,
    projectName: null,
    description: "",
    startedAt: null,
    draftDescription: Qe().draftDescription
  });
}
function i1(e) {
  _e().prepare(
    `INSERT INTO screenshot_queue
        (uploadUuid, capturedAt, filePath, mimeType, projectId, sessionId, metadataJson, attempts, status, updatedAt)
       VALUES
        (@uploadUuid, @capturedAt, @filePath, @mimeType, @projectId, @sessionId, @metadataJson, 0, 'pending', @updatedAt)
       ON CONFLICT(uploadUuid) DO UPDATE SET
         filePath = excluded.filePath,
         status = 'pending',
         updatedAt = excluded.updatedAt`
  ).run({ ...e, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
}
function s1(e = 10) {
  return _e().prepare(
    `SELECT id, uploadUuid, capturedAt, filePath, mimeType, projectId, sessionId, metadataJson, attempts, status
       FROM screenshot_queue
       WHERE status = 'pending'
       ORDER BY id ASC
       LIMIT ?`
  ).all(e);
}
function oc(e) {
  _e().prepare(
    "UPDATE screenshot_queue SET status = 'delivered', updatedAt = @updatedAt WHERE id = @id"
  ).run({ id: e, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
}
function a1(e, t) {
  _e().prepare(
    "UPDATE screenshot_queue SET attempts = @attempts, status = 'pending', updatedAt = @updatedAt WHERE id = @id"
  ).run({ id: e, attempts: t, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
}
function o1() {
  const e = Y.join(J.getPath("userData"), "screenshot-queue-v2");
  return ce.mkdirSync(e, { recursive: !0 }), e;
}
const Uu = 24 * 60 * 60 * 1e3;
function Bu() {
  const e = new Date(Date.now() - Uu).toISOString();
  _e().prepare("DELETE FROM recent_projects WHERE lastWorkedAt < ?").run(e);
}
function cc(e, t, n) {
  if (!e.trim()) return;
  const r = n ?? (/* @__PURE__ */ new Date()).toISOString();
  _e().prepare(
    `INSERT INTO recent_projects (projectId, projectName, lastWorkedAt)
       VALUES (@projectId, @projectName, @lastWorkedAt)
       ON CONFLICT(projectId) DO UPDATE SET
         projectName = excluded.projectName,
         lastWorkedAt = excluded.lastWorkedAt`
  ).run({
    projectId: e,
    projectName: t.trim() || e,
    lastWorkedAt: r
  }), Bu();
}
function c1(e = 8) {
  Bu();
  const t = new Date(Date.now() - Uu).toISOString();
  return _e().prepare(
    `SELECT projectId, projectName, lastWorkedAt
       FROM recent_projects
       WHERE lastWorkedAt >= ?
       ORDER BY lastWorkedAt DESC
       LIMIT ?`
  ).all(t, e);
}
function Jn(e = /* @__PURE__ */ new Date()) {
  const t = e.getFullYear(), n = String(e.getMonth() + 1).padStart(2, "0"), r = String(e.getDate()).padStart(2, "0");
  return `${t}-${n}-${r}`;
}
function l1(e) {
  _e().prepare(
    `INSERT INTO work_log (projectId, projectName, startedAt, stoppedAt, durationMs, workDateKey)
       VALUES (@projectId, @projectName, @startedAt, @stoppedAt, @durationMs, @workDateKey)`
  ).run({
    projectId: e.projectId,
    projectName: e.projectName,
    startedAt: e.startedAt,
    stoppedAt: e.stoppedAt,
    durationMs: Math.max(0, Math.round(e.durationMs)),
    workDateKey: Jn(new Date(e.stoppedAt))
  });
}
function u1(e = /* @__PURE__ */ new Date()) {
  const t = _e().prepare(
    `SELECT COALESCE(SUM(durationMs), 0) AS total
       FROM work_log
       WHERE workDateKey = ?`
  ).get(Jn(e));
  return Number((t == null ? void 0 : t.total) ?? 0);
}
function p1(e) {
  if (e.seconds <= 0) return;
  const t = e.workDateKey ?? Jn(), n = `${e.application}::${e.displayName}`.toLowerCase();
  _e().prepare(
    `INSERT INTO app_usage_day (workDateKey, appKey, displayName, processName, seconds, updatedAt)
       VALUES (@workDateKey, @appKey, @displayName, @processName, @seconds, @updatedAt)
       ON CONFLICT(workDateKey, appKey) DO UPDATE SET
         seconds = seconds + excluded.seconds,
         displayName = excluded.displayName,
         processName = excluded.processName,
         updatedAt = excluded.updatedAt`
  ).run({
    workDateKey: t,
    appKey: n,
    displayName: e.displayName,
    processName: e.processName,
    seconds: Math.round(e.seconds),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
function d1(e = 20) {
  return _e().prepare(
    `SELECT displayName, processName, seconds
       FROM app_usage_day
       WHERE workDateKey = ?
       ORDER BY seconds DESC
       LIMIT ?`
  ).all(Jn(), e);
}
function f1(e) {
  const t = (/* @__PURE__ */ new Date()).toISOString();
  _e().prepare(
    `INSERT INTO event_queue (eventUuid, eventKind, payloadJson, attempts, status, nextRunAt, createdAt)
       VALUES (@eventUuid, @eventKind, @payloadJson, 0, 'pending', @now, @now)
       ON CONFLICT(eventUuid) DO NOTHING`
  ).run({
    eventUuid: e.eventUuid,
    eventKind: e.eventKind,
    payloadJson: JSON.stringify(e.payload),
    now: t
  });
}
function m1(e = 40) {
  const t = (/* @__PURE__ */ new Date()).toISOString();
  return _e().prepare(
    `SELECT id, eventUuid, eventKind, payloadJson, attempts
       FROM event_queue
       WHERE status = 'pending' AND nextRunAt <= ?
       ORDER BY id ASC
       LIMIT ?`
  ).all(t, e);
}
function h1(e) {
  _e().prepare("UPDATE event_queue SET status = 'delivered', nextRunAt = @now WHERE id = @id").run({ id: e, now: (/* @__PURE__ */ new Date()).toISOString() });
}
function g1(e, t) {
  const n = Math.min(9e5, 1e3 * 2 ** Math.min(t, 8)), r = new Date(Date.now() + n).toISOString();
  _e().prepare(
    "UPDATE event_queue SET attempts = @attempts, status = 'pending', nextRunAt = @nextRunAt WHERE id = @id"
  ).run({ id: e, attempts: t, nextRunAt: r });
}
const v1 = td(Qp), b1 = /* @__PURE__ */ new Set([
  "powershell",
  "powershell.exe",
  "pwsh",
  "pwsh.exe",
  "cmd",
  "cmd.exe",
  "conhost",
  "conhost.exe",
  "wt",
  "wt.exe",
  "openconsole",
  "openconsole.exe"
]), ur = {
  chrome: "Google Chrome",
  "chrome.exe": "Google Chrome",
  msedge: "Microsoft Edge",
  "msedge.exe": "Microsoft Edge",
  firefox: "Firefox",
  "firefox.exe": "Firefox",
  code: "Visual Studio Code",
  "code.exe": "Visual Studio Code",
  devenv: "Visual Studio",
  "devenv.exe": "Visual Studio",
  acad: "AutoCAD",
  "acad.exe": "AutoCAD",
  revit: "Revit",
  "revit.exe": "Revit",
  zoom: "Zoom",
  "zoom.exe": "Zoom",
  teams: "Microsoft Teams",
  "ms-teams.exe": "Microsoft Teams",
  "teams.exe": "Microsoft Teams",
  slack: "Slack",
  "slack.exe": "Slack",
  outlook: "Outlook",
  "outlook.exe": "Outlook",
  WINWORD: "Word",
  "winword.exe": "Word",
  EXCEL: "Excel",
  "excel.exe": "Excel",
  powerpnt: "PowerPoint",
  "powerpnt.exe": "PowerPoint",
  notion: "Notion",
  "notion.exe": "Notion",
  figma: "Figma",
  "figma.exe": "Figma",
  explorer: "File Explorer",
  "explorer.exe": "File Explorer"
};
function x1(e) {
  const t = e.replace(/\.exe$/i, "").toLowerCase();
  return /acad|revit|autodesk/.test(t) ? "autodesk" : t === "msedge" || t === "edge" ? "edge" : t === "code" ? "vscode" : t.includes("teams") ? "teams" : t || "unknown";
}
function y1(e, t) {
  var i;
  const n = e.toLowerCase();
  if (ur[n]) return ur[n];
  const r = e.replace(/\.exe$/i, "");
  if (ur[r.toLowerCase()]) return ur[r.toLowerCase()];
  if (t.trim()) {
    const s = (i = t.split(" - ").pop()) == null ? void 0 : i.trim();
    if (s && s.length <= 40) return s;
  }
  return r || "Unknown";
}
function lc(e) {
  return b1.has(e.toLowerCase());
}
const w1 = `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class FgWin {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
}
"@
$hwnd = [FgWin]::GetForegroundWindow()
if ($hwnd -eq [IntPtr]::Zero) { Write-Output '{"ok":false}'; exit }
$pidOut = 0
[void][FgWin]::GetWindowThreadProcessId($hwnd, [ref]$pidOut)
$sb = New-Object System.Text.StringBuilder 512
[void][FgWin]::GetWindowText($hwnd, $sb, $sb.Capacity)
$title = $sb.ToString()
$proc = Get-Process -Id $pidOut -ErrorAction SilentlyContinue
$name = if ($proc) { $proc.ProcessName } else { '' }
$exe = if ($proc -and $proc.Path) { Split-Path $proc.Path -Leaf } else { if ($name) { "$name.exe" } else { '' } }
$obj = @{ ok = $true; processId = $pidOut; processName = $exe; processBase = $name; windowTitle = $title }
$obj | ConvertTo-Json -Compress
`.trim();
let uc = 0, Mi = null;
async function E1() {
  if (process.platform !== "win32")
    return null;
  const e = Date.now();
  if (Mi && e - uc < 800)
    return Mi;
  try {
    const { stdout: t } = await v1(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", w1],
      { windowsHide: !0, timeout: 2500, maxBuffer: 65536 }
    ), n = String(t || "").trim();
    if (!n) return null;
    const r = JSON.parse(n);
    if (!r.ok) return null;
    const i = (r.processName || `${r.processBase || ""}.exe` || "").trim();
    if (!i || lc(i) || lc(r.processBase || ""))
      return null;
    const s = String(r.windowTitle ?? "").trim(), a = y1(i, s), c = x1(i), l = {
      applicationDisplayName: a,
      application: c,
      processName: i,
      windowTitle: s,
      processId: typeof r.processId == "number" ? r.processId : null
    };
    return Mi = l, uc = e, l;
  } catch (t) {
    return U.warn("foreground-probe-failed", {
      error: t instanceof Error ? t.message : "unknown"
    }), null;
  }
}
const _1 = 3e3, S1 = 15e3;
function pc() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
class A1 {
  constructor() {
    N(this, "timer", null);
    N(this, "running", !1);
    N(this, "context", {
      sessionId: null,
      projectId: null,
      startedAt: null,
      clientTimeZone: pc()
    });
    N(this, "open", null);
    N(this, "sampling", !1);
  }
  start(t) {
    this.stop(!1), this.running = !0, this.context = {
      sessionId: t.sessionId ?? null,
      projectId: t.projectId ?? null,
      startedAt: t.startedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
      clientTimeZone: t.clientTimeZone ?? pc()
    }, this.open = null, this.timer = setInterval(() => {
      this.sample();
    }, _1), this.sample(), U.info("app-usage-tracker-started");
  }
  updateContext(t) {
    this.context = { ...this.context, ...t };
  }
  stop(t = !0) {
    this.running = !1, this.timer && (clearInterval(this.timer), this.timer = null), t && this.closeOpenSegment(Date.now()), this.open = null;
  }
  getTodayApps() {
    return d1();
  }
  async sample() {
    if (!(!this.running || this.sampling)) {
      this.sampling = !0;
      try {
        const t = Date.now(), n = await E1();
        if (!n) {
          this.closeOpenSegment(t);
          return;
        }
        if (!this.open) {
          this.open = { app: n, startedAtMs: t, lastEmittedAtMs: t };
          return;
        }
        if (!(this.open.app.processName.toLowerCase() === n.processName.toLowerCase() && this.open.app.applicationDisplayName === n.applicationDisplayName)) {
          this.closeOpenSegment(t), this.open = { app: n, startedAtMs: t, lastEmittedAtMs: t };
          return;
        }
        this.open.app = n, t - this.open.lastEmittedAtMs >= S1 && (this.emitSegment(this.open, t), this.open.lastEmittedAtMs = t, this.open.startedAtMs = t);
      } finally {
        this.sampling = !1;
      }
    }
  }
  closeOpenSegment(t) {
    this.open && (this.emitSegment(this.open, t), this.open = null);
  }
  emitSegment(t, n) {
    const r = Math.max(0, Math.round((n - t.startedAtMs) / 1e3));
    if (r < 1) return;
    const i = t.app;
    p1({
      displayName: i.applicationDisplayName,
      processName: i.processName,
      application: i.application,
      seconds: r
    });
    const s = new Date(n).toISOString(), a = Jn(new Date(n)), c = Dn(), l = this.context.sessionId, p = {
      eventUuid: c,
      eventKind: "APP_FOCUS",
      type: "APP_FOCUS",
      occurredAt: s,
      occurredAtIso: s,
      workDateKey: a,
      clientTimeZone: this.context.clientTimeZone,
      projectId: this.context.projectId,
      workSessionId: l,
      sessionId: l,
      sessionSegmentStartedAt: this.context.startedAt,
      appName: i.applicationDisplayName,
      applicationDisplayName: i.applicationDisplayName,
      application: i.application,
      processName: i.processName,
      windowTitle: i.windowTitle,
      activeSeconds: r,
      idleSeconds: 0,
      metadata: {
        application: i.application,
        applicationDisplayName: i.applicationDisplayName,
        processName: i.processName,
        windowTitle: i.windowTitle,
        activeSeconds: r,
        idleSeconds: 0,
        source: "landev-tracker-v2"
      }
    };
    f1({ eventUuid: c, eventKind: "APP_FOCUS", payload: p });
  }
  async flushEvents(t) {
    const n = m1(40);
    if (n.length === 0) return;
    const r = n.map((i) => JSON.parse(i.payloadJson));
    try {
      await ME({ events: r }, t);
      for (const i of n)
        h1(i.id);
      U.info("app-focus-events-flushed", { count: n.length });
    } catch (i) {
      for (const s of n)
        g1(s.id, s.attempts + 1);
      U.warn("app-focus-events-flush-failed", {
        count: n.length,
        error: i instanceof Error ? i.message : "unknown"
      });
    }
  }
}
const dc = 4, fc = 3, qi = 4;
function k1(e) {
  var n;
  const t = (n = e.metadata) == null ? void 0 : n.uploadUuid;
  return typeof t == "string" && t.trim() ? t.trim() : Dn();
}
function Mu(e, t) {
  return {
    capturedAtIso: e.capturedAt,
    mimeType: e.mimeType,
    uploadUuid: t,
    byteSize: e.imageBytes.length,
    projectId: e.projectId ?? void 0,
    sessionId: e.sessionId
  };
}
function qu(e, t) {
  if (e.includes("token="))
    return e;
  const n = e.includes("?") ? "&" : "?";
  return `${e}${n}token=${encodeURIComponent(t)}`;
}
function ii(e) {
  var t;
  return M.isAxiosError(e) ? ((t = e.response) == null ? void 0 : t.status) ?? null : e instanceof Pe ? e.statusCode ?? null : null;
}
function aa(e) {
  if (M.isAxiosError(e) && !e.response)
    return !0;
  const t = ii(e);
  return t === 429 || t != null && t >= 500;
}
function T1(e) {
  return ii(e) === 403 || aa(e);
}
function zr(e) {
  return Math.min(6e4, 1e3 * 2 ** e);
}
function P1(e) {
  try {
    return new URL(e).host;
  } catch {
    return;
  }
}
const si = {
  maxBodyLength: 1 / 0,
  maxContentLength: 1 / 0,
  timeout: 6e4
};
async function R1(e) {
  await M.put(e.sign.signedUrl, e.imageBytes, {
    ...si,
    headers: {
      "Content-Type": e.mimeType,
      "x-upsert": "true",
      "cache-control": "3600"
    }
  });
}
async function j1(e) {
  const t = qu(e.sign.signedUrl, e.sign.token);
  await M.put(t, e.imageBytes, {
    ...si,
    headers: {
      "Content-Type": e.mimeType,
      "x-upsert": "true"
    }
  });
}
async function I1(e) {
  await M.put(e.sign.signedUrl, e.imageBytes, {
    ...si,
    headers: {
      Authorization: `Bearer ${e.sign.token}`,
      "Content-Type": e.mimeType,
      "x-upsert": "true"
    }
  });
}
async function O1(e) {
  const t = qu(e.sign.signedUrl, e.sign.token);
  await M.post(t, e.imageBytes, {
    ...si,
    headers: {
      "Content-Type": e.mimeType,
      "x-upsert": "true"
    }
  });
}
async function Hu(e) {
  var r;
  Ou(e.sign.signedUrl);
  const t = [
    { name: "put-signed-url-as-is", run: () => R1(e) },
    { name: "put-query-token", run: () => j1(e) },
    { name: "put-bearer-token", run: () => I1(e) },
    { name: "post-query-token", run: () => O1(e) }
  ];
  let n;
  for (const i of t)
    try {
      await i.run();
      return;
    } catch (s) {
      n = s;
      const a = ii(s), c = M.isAxiosError(s) && ((r = s.response) == null ? void 0 : r.data) != null ? JSON.stringify(s.response.data).slice(0, 240) : void 0;
      if (U.warn("screenshot-supabase-upload-strategy-failed", {
        strategy: i.name,
        status: a,
        path: e.sign.path,
        uploadUrlHost: P1(e.sign.signedUrl),
        responsePreview: c
      }), a === 405 && i.name === "put-query-token")
        continue;
    }
  throw n instanceof Error ? n : new Error("screenshot-supabase-upload-failed");
}
async function $1(e, t, n) {
  let r;
  for (let i = 0; i < dc; i += 1)
    try {
      return await $u(Mu(e, t), n);
    } catch (s) {
      if (r = s, s instanceof Pe && (s.statusCode === 403 || s.kind === "auth") || !aa(s))
        throw s;
      if (i === dc - 1)
        break;
      await new Promise((a) => setTimeout(a, zr(i)));
    }
  throw r instanceof Error ? r : new Error("screenshot-sign-failed");
}
async function N1(e, t, n, r) {
  let i = e, s;
  for (let a = 0; a < fc; a += 1)
    try {
      return await Hu({
        sign: i,
        imageBytes: t.imageBytes,
        mimeType: t.mimeType
      }), i;
    } catch (c) {
      if (s = c, U.warn("screenshot-supabase-upload-failed", {
        uploadUuid: r,
        attempt: a + 1,
        status: ii(c),
        path: i.path
      }), !T1(c))
        break;
      a < fc - 1 && (i = await $u(Mu(t, r), n)), await new Promise((l) => setTimeout(l, zr(a)));
    }
  throw s instanceof Error ? s : new Error("screenshot-supabase-upload-failed");
}
async function C1(e, t, n, r) {
  let i;
  for (let s = 0; s < qi; s += 1)
    try {
      const a = await BE(
        {
          path: t.path,
          uploadUuid: n,
          capturedAtIso: e.capturedAt,
          mimeType: e.mimeType,
          projectId: e.projectId ?? void 0,
          sessionId: e.sessionId,
          workSessionId: e.sessionId,
          metadata: {
            ...e.metadata ?? {},
            uploadUuid: n
          }
        },
        r
      );
      a.duplicate && U.info("screenshot-commit-duplicate", { uploadUuid: n, screenshotId: a.screenshotId });
      return;
    } catch (a) {
      if (i = a, (a instanceof Pe ? a.statusCode : null) === 409 && s < qi - 1) {
        await Hu({
          sign: t,
          imageBytes: e.imageBytes,
          mimeType: e.mimeType
        }), await new Promise((l) => setTimeout(l, zr(s)));
        continue;
      }
      if (!aa(a))
        throw a;
      if (s === qi - 1)
        break;
      await new Promise((l) => setTimeout(l, zr(s)));
    }
  throw i instanceof Error ? i : new Error("screenshot-commit-failed");
}
async function mc(e, t) {
  const n = k1(e), r = {
    ...e,
    metadata: {
      ...e.metadata ?? {},
      uploadUuid: n
    }
  }, i = await $1(r, n, t), s = await N1(i, r, t, n);
  return await C1(r, s, n, t), U.info("screenshot-uploaded-direct", {
    uploadUuid: n,
    path: s.path,
    bytes: r.imageBytes.length
  }), { uploadUuid: n, path: s.path };
}
/*!
  Copyright 2013 Lovell Fuller and others.
  SPDX-License-Identifier: Apache-2.0
*/
const Vu = (e) => typeof e < "u" && e !== null, L1 = (e) => typeof e == "object", D1 = (e) => Object.prototype.toString.call(e) === "[object Object]", z1 = (e) => typeof e == "function", F1 = (e) => typeof e == "boolean", U1 = (e) => e instanceof Buffer, B1 = (e) => {
  if (Vu(e))
    switch (e.constructor) {
      case Uint8Array:
      case Uint8ClampedArray:
      case Int8Array:
      case Uint16Array:
      case Int16Array:
      case Uint32Array:
      case Int32Array:
      case Float32Array:
      case Float64Array:
        return !0;
    }
  return !1;
}, M1 = (e) => e instanceof ArrayBuffer, q1 = (e) => typeof e == "string" && e.length > 0, H1 = (e) => typeof e == "number" && !Number.isNaN(e), V1 = (e) => Number.isInteger(e), Z1 = (e, t, n) => e >= t && e <= n, W1 = (e, t) => t.includes(e), G1 = (e, t, n) => new Error(
  `Expected ${t} for ${e} but received ${n} of type ${typeof n}`
), J1 = (e, t) => (t.message = e.message, t), o = {
  defined: Vu,
  object: L1,
  plainObject: D1,
  fn: z1,
  bool: F1,
  buffer: U1,
  typedArray: B1,
  arrayBuffer: M1,
  string: q1,
  number: H1,
  integer: V1,
  inRange: Z1,
  inArray: W1,
  invalidParameterError: G1,
  nativeError: J1
}, Zu = () => process.platform === "linux";
let pr = null;
const K1 = () => {
  if (!pr)
    if (Zu() && process.report) {
      const e = process.report.excludeNetwork;
      process.report.excludeNetwork = !0, pr = process.report.getReport(), process.report.excludeNetwork = e;
    } else
      pr = {};
  return pr;
};
var X1 = { isLinux: Zu, getReport: K1 };
const tn = gt, Y1 = "/usr/bin/ldd", Q1 = "/proc/self/exe", Fr = 2048, e_ = (e) => {
  const t = tn.openSync(e, "r"), n = Buffer.alloc(Fr), r = tn.readSync(t, n, 0, Fr, 0);
  return tn.close(t, () => {
  }), n.subarray(0, r);
}, t_ = (e) => new Promise((t, n) => {
  tn.open(e, "r", (r, i) => {
    if (r)
      n(r);
    else {
      const s = Buffer.alloc(Fr);
      tn.read(i, s, 0, Fr, 0, (a, c) => {
        t(s.subarray(0, c)), tn.close(i, () => {
        });
      });
    }
  });
});
var n_ = {
  LDD_PATH: Y1,
  SELF_PATH: Q1,
  readFileSync: e_,
  readFile: t_
};
const r_ = (e) => {
  if (e.length < 64 || e.readUInt32BE(0) !== 2135247942 || e.readUInt8(4) !== 2 || e.readUInt8(5) !== 1)
    return null;
  const t = e.readUInt32LE(32), n = e.readUInt16LE(54), r = e.readUInt16LE(56);
  for (let i = 0; i < r; i++) {
    const s = t + i * n;
    if (e.readUInt32LE(s) === 3) {
      const c = e.readUInt32LE(s + 8), l = e.readUInt32LE(s + 32);
      return e.subarray(c, c + l).toString().replace(/\0.*$/g, "");
    }
  }
  return null;
};
var i_ = {
  interpreterPath: r_
};
const Wu = Gc, { isLinux: bn, getReport: Gu } = X1, { LDD_PATH: ai, SELF_PATH: Ju, readFile: oa, readFileSync: ca } = n_, { interpreterPath: Ku } = i_;
let Ge, Je, Ke;
const Xu = "getconf GNU_LIBC_VERSION 2>&1 || true; ldd --version 2>&1 || true";
let ct = "";
const Yu = () => ct || new Promise((e) => {
  Wu.exec(Xu, (t, n) => {
    ct = t ? " " : n, e(ct);
  });
}), Qu = () => {
  if (!ct)
    try {
      ct = Wu.execSync(Xu, { encoding: "utf8" });
    } catch {
      ct = " ";
    }
  return ct;
}, tt = "glibc", ep = /LIBC[a-z0-9 \-).]*?(\d+\.\d+)/i, Ot = "musl", s_ = (e) => e.includes("libc.musl-") || e.includes("ld-musl-"), tp = () => {
  const e = Gu();
  return e.header && e.header.glibcVersionRuntime ? tt : Array.isArray(e.sharedObjects) && e.sharedObjects.some(s_) ? Ot : null;
}, np = (e) => {
  const [t, n] = e.split(/[\r\n]+/);
  return t && t.includes(tt) ? tt : n && n.includes(Ot) ? Ot : null;
}, rp = (e) => {
  if (e) {
    if (e.includes("/ld-musl-"))
      return Ot;
    if (e.includes("/ld-linux-"))
      return tt;
  }
  return null;
}, ip = (e) => (e = e.toString(), e.includes("musl") ? Ot : e.includes("GNU C Library") ? tt : null), a_ = async () => {
  if (Je !== void 0)
    return Je;
  Je = null;
  try {
    const e = await oa(ai);
    Je = ip(e);
  } catch {
  }
  return Je;
}, o_ = () => {
  if (Je !== void 0)
    return Je;
  Je = null;
  try {
    const e = ca(ai);
    Je = ip(e);
  } catch {
  }
  return Je;
}, c_ = async () => {
  if (Ge !== void 0)
    return Ge;
  Ge = null;
  try {
    const e = await oa(Ju), t = Ku(e);
    Ge = rp(t);
  } catch {
  }
  return Ge;
}, l_ = () => {
  if (Ge !== void 0)
    return Ge;
  Ge = null;
  try {
    const e = ca(Ju), t = Ku(e);
    Ge = rp(t);
  } catch {
  }
  return Ge;
}, sp = async () => {
  let e = null;
  if (bn() && (e = await c_(), !e && (e = await a_(), e || (e = tp()), !e))) {
    const t = await Yu();
    e = np(t);
  }
  return e;
}, ap = () => {
  let e = null;
  if (bn() && (e = l_(), !e && (e = o_(), e || (e = tp()), !e))) {
    const t = Qu();
    e = np(t);
  }
  return e;
}, u_ = async () => bn() && await sp() !== tt, p_ = () => bn() && ap() !== tt, d_ = async () => {
  if (Ke !== void 0)
    return Ke;
  Ke = null;
  try {
    const t = (await oa(ai)).match(ep);
    t && (Ke = t[1]);
  } catch {
  }
  return Ke;
}, f_ = () => {
  if (Ke !== void 0)
    return Ke;
  Ke = null;
  try {
    const t = ca(ai).match(ep);
    t && (Ke = t[1]);
  } catch {
  }
  return Ke;
}, op = () => {
  const e = Gu();
  return e.header && e.header.glibcVersionRuntime ? e.header.glibcVersionRuntime : null;
}, hc = (e) => e.trim().split(/\s+/)[1], cp = (e) => {
  const [t, n, r] = e.split(/[\r\n]+/);
  return t && t.includes(tt) ? hc(t) : n && r && n.includes(Ot) ? hc(r) : null;
}, m_ = async () => {
  let e = null;
  if (bn() && (e = await d_(), e || (e = op()), !e)) {
    const t = await Yu();
    e = cp(t);
  }
  return e;
}, h_ = () => {
  let e = null;
  if (bn() && (e = f_(), e || (e = op()), !e)) {
    const t = Qu();
    e = cp(t);
  }
  return e;
};
var hs = {
  GLIBC: tt,
  MUSL: Ot,
  family: sp,
  familySync: ap,
  isNonGlibcLinux: u_,
  isNonGlibcLinuxSync: p_,
  version: m_,
  versionSync: h_
};
const Yt = /* @__PURE__ */ Nt(hs);
var gs = { exports: {} };
const g_ = "2.0.0", lp = 256, v_ = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
9007199254740991, b_ = 16, x_ = lp - 6, y_ = [
  "major",
  "premajor",
  "minor",
  "preminor",
  "patch",
  "prepatch",
  "prerelease"
];
var Kn = {
  MAX_LENGTH: lp,
  MAX_SAFE_COMPONENT_LENGTH: b_,
  MAX_SAFE_BUILD_LENGTH: x_,
  MAX_SAFE_INTEGER: v_,
  RELEASE_TYPES: y_,
  SEMVER_SPEC_VERSION: g_,
  FLAG_INCLUDE_PRERELEASE: 1,
  FLAG_LOOSE: 2
};
const w_ = typeof process == "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...e) => console.error("SEMVER", ...e) : () => {
};
var oi = w_;
(function(e, t) {
  const {
    MAX_SAFE_COMPONENT_LENGTH: n,
    MAX_SAFE_BUILD_LENGTH: r,
    MAX_LENGTH: i
  } = Kn, s = oi;
  t = e.exports = {};
  const a = t.re = [], c = t.safeRe = [], l = t.src = [], p = t.safeSrc = [], u = t.t = {};
  let d = 0;
  const f = "[a-zA-Z0-9-]", m = [
    ["\\s", 1],
    ["\\d", i],
    [f, r]
  ], v = (b) => {
    for (const [x, I] of m)
      b = b.split(`${x}*`).join(`${x}{0,${I}}`).split(`${x}+`).join(`${x}{1,${I}}`);
    return b;
  }, g = (b, x, I) => {
    const D = v(x), P = d++;
    s(b, P, x), u[b] = P, l[P] = x, p[P] = D, a[P] = new RegExp(x, I ? "g" : void 0), c[P] = new RegExp(D, I ? "g" : void 0);
  };
  g("NUMERICIDENTIFIER", "0|[1-9]\\d*"), g("NUMERICIDENTIFIERLOOSE", "\\d+"), g("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${f}*`), g("MAINVERSION", `(${l[u.NUMERICIDENTIFIER]})\\.(${l[u.NUMERICIDENTIFIER]})\\.(${l[u.NUMERICIDENTIFIER]})`), g("MAINVERSIONLOOSE", `(${l[u.NUMERICIDENTIFIERLOOSE]})\\.(${l[u.NUMERICIDENTIFIERLOOSE]})\\.(${l[u.NUMERICIDENTIFIERLOOSE]})`), g("PRERELEASEIDENTIFIER", `(?:${l[u.NONNUMERICIDENTIFIER]}|${l[u.NUMERICIDENTIFIER]})`), g("PRERELEASEIDENTIFIERLOOSE", `(?:${l[u.NONNUMERICIDENTIFIER]}|${l[u.NUMERICIDENTIFIERLOOSE]})`), g("PRERELEASE", `(?:-(${l[u.PRERELEASEIDENTIFIER]}(?:\\.${l[u.PRERELEASEIDENTIFIER]})*))`), g("PRERELEASELOOSE", `(?:-?(${l[u.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${l[u.PRERELEASEIDENTIFIERLOOSE]})*))`), g("BUILDIDENTIFIER", `${f}+`), g("BUILD", `(?:\\+(${l[u.BUILDIDENTIFIER]}(?:\\.${l[u.BUILDIDENTIFIER]})*))`), g("FULLPLAIN", `v?${l[u.MAINVERSION]}${l[u.PRERELEASE]}?${l[u.BUILD]}?`), g("FULL", `^${l[u.FULLPLAIN]}$`), g("LOOSEPLAIN", `[v=\\s]*${l[u.MAINVERSIONLOOSE]}${l[u.PRERELEASELOOSE]}?${l[u.BUILD]}?`), g("LOOSE", `^${l[u.LOOSEPLAIN]}$`), g("GTLT", "((?:<|>)?=?)"), g("XRANGEIDENTIFIERLOOSE", `${l[u.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`), g("XRANGEIDENTIFIER", `${l[u.NUMERICIDENTIFIER]}|x|X|\\*`), g("XRANGEPLAIN", `[v=\\s]*(${l[u.XRANGEIDENTIFIER]})(?:\\.(${l[u.XRANGEIDENTIFIER]})(?:\\.(${l[u.XRANGEIDENTIFIER]})(?:${l[u.PRERELEASE]})?${l[u.BUILD]}?)?)?`), g("XRANGEPLAINLOOSE", `[v=\\s]*(${l[u.XRANGEIDENTIFIERLOOSE]})(?:\\.(${l[u.XRANGEIDENTIFIERLOOSE]})(?:\\.(${l[u.XRANGEIDENTIFIERLOOSE]})(?:${l[u.PRERELEASELOOSE]})?${l[u.BUILD]}?)?)?`), g("XRANGE", `^${l[u.GTLT]}\\s*${l[u.XRANGEPLAIN]}$`), g("XRANGELOOSE", `^${l[u.GTLT]}\\s*${l[u.XRANGEPLAINLOOSE]}$`), g("COERCEPLAIN", `(^|[^\\d])(\\d{1,${n}})(?:\\.(\\d{1,${n}}))?(?:\\.(\\d{1,${n}}))?`), g("COERCE", `${l[u.COERCEPLAIN]}(?:$|[^\\d])`), g("COERCEFULL", l[u.COERCEPLAIN] + `(?:${l[u.PRERELEASE]})?(?:${l[u.BUILD]})?(?:$|[^\\d])`), g("COERCERTL", l[u.COERCE], !0), g("COERCERTLFULL", l[u.COERCEFULL], !0), g("LONETILDE", "(?:~>?)"), g("TILDETRIM", `(\\s*)${l[u.LONETILDE]}\\s+`, !0), t.tildeTrimReplace = "$1~", g("TILDE", `^${l[u.LONETILDE]}${l[u.XRANGEPLAIN]}$`), g("TILDELOOSE", `^${l[u.LONETILDE]}${l[u.XRANGEPLAINLOOSE]}$`), g("LONECARET", "(?:\\^)"), g("CARETTRIM", `(\\s*)${l[u.LONECARET]}\\s+`, !0), t.caretTrimReplace = "$1^", g("CARET", `^${l[u.LONECARET]}${l[u.XRANGEPLAIN]}$`), g("CARETLOOSE", `^${l[u.LONECARET]}${l[u.XRANGEPLAINLOOSE]}$`), g("COMPARATORLOOSE", `^${l[u.GTLT]}\\s*(${l[u.LOOSEPLAIN]})$|^$`), g("COMPARATOR", `^${l[u.GTLT]}\\s*(${l[u.FULLPLAIN]})$|^$`), g("COMPARATORTRIM", `(\\s*)${l[u.GTLT]}\\s*(${l[u.LOOSEPLAIN]}|${l[u.XRANGEPLAIN]})`, !0), t.comparatorTrimReplace = "$1$2$3", g("HYPHENRANGE", `^\\s*(${l[u.XRANGEPLAIN]})\\s+-\\s+(${l[u.XRANGEPLAIN]})\\s*$`), g("HYPHENRANGELOOSE", `^\\s*(${l[u.XRANGEPLAINLOOSE]})\\s+-\\s+(${l[u.XRANGEPLAINLOOSE]})\\s*$`), g("STAR", "(<|>)?=?\\s*\\*"), g("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$"), g("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
})(gs, gs.exports);
var Xn = gs.exports;
const E_ = Object.freeze({ loose: !0 }), __ = Object.freeze({}), S_ = (e) => e ? typeof e != "object" ? E_ : e : __;
var la = S_;
const gc = /^[0-9]+$/, up = (e, t) => {
  if (typeof e == "number" && typeof t == "number")
    return e === t ? 0 : e < t ? -1 : 1;
  const n = gc.test(e), r = gc.test(t);
  return n && r && (e = +e, t = +t), e === t ? 0 : n && !r ? -1 : r && !n ? 1 : e < t ? -1 : 1;
}, A_ = (e, t) => up(t, e);
var pp = {
  compareIdentifiers: up,
  rcompareIdentifiers: A_
};
const dr = oi, { MAX_LENGTH: vc, MAX_SAFE_INTEGER: fr } = Kn, { safeRe: mr, t: hr } = Xn, k_ = la, { compareIdentifiers: vs } = pp, T_ = (e, t) => {
  const n = t.split(".");
  if (n.length > e.length)
    return !1;
  for (let r = 0; r < n.length; r++)
    if (vs(e[r], n[r]) !== 0)
      return !1;
  return !0;
};
let P_ = class We {
  constructor(t, n) {
    if (n = k_(n), t instanceof We) {
      if (t.loose === !!n.loose && t.includePrerelease === !!n.includePrerelease)
        return t;
      t = t.version;
    } else if (typeof t != "string")
      throw new TypeError(`Invalid version. Must be a string. Got type "${typeof t}".`);
    if (t.length > vc)
      throw new TypeError(
        `version is longer than ${vc} characters`
      );
    dr("SemVer", t, n), this.options = n, this.loose = !!n.loose, this.includePrerelease = !!n.includePrerelease;
    const r = t.trim().match(n.loose ? mr[hr.LOOSE] : mr[hr.FULL]);
    if (!r)
      throw new TypeError(`Invalid Version: ${t}`);
    if (this.raw = t, this.major = +r[1], this.minor = +r[2], this.patch = +r[3], this.major > fr || this.major < 0)
      throw new TypeError("Invalid major version");
    if (this.minor > fr || this.minor < 0)
      throw new TypeError("Invalid minor version");
    if (this.patch > fr || this.patch < 0)
      throw new TypeError("Invalid patch version");
    r[4] ? this.prerelease = r[4].split(".").map((i) => {
      if (/^[0-9]+$/.test(i)) {
        const s = +i;
        if (s >= 0 && s < fr)
          return s;
      }
      return i;
    }) : this.prerelease = [], this.build = r[5] ? r[5].split(".") : [], this.format();
  }
  format() {
    return this.version = `${this.major}.${this.minor}.${this.patch}`, this.prerelease.length && (this.version += `-${this.prerelease.join(".")}`), this.version;
  }
  toString() {
    return this.version;
  }
  compare(t) {
    if (dr("SemVer.compare", this.version, this.options, t), !(t instanceof We)) {
      if (typeof t == "string" && t === this.version)
        return 0;
      t = new We(t, this.options);
    }
    return t.version === this.version ? 0 : this.compareMain(t) || this.comparePre(t);
  }
  compareMain(t) {
    return t instanceof We || (t = new We(t, this.options)), this.major < t.major ? -1 : this.major > t.major ? 1 : this.minor < t.minor ? -1 : this.minor > t.minor ? 1 : this.patch < t.patch ? -1 : this.patch > t.patch ? 1 : 0;
  }
  comparePre(t) {
    if (t instanceof We || (t = new We(t, this.options)), this.prerelease.length && !t.prerelease.length)
      return -1;
    if (!this.prerelease.length && t.prerelease.length)
      return 1;
    if (!this.prerelease.length && !t.prerelease.length)
      return 0;
    let n = 0;
    do {
      const r = this.prerelease[n], i = t.prerelease[n];
      if (dr("prerelease compare", n, r, i), r === void 0 && i === void 0)
        return 0;
      if (i === void 0)
        return 1;
      if (r === void 0)
        return -1;
      if (r === i)
        continue;
      return vs(r, i);
    } while (++n);
  }
  compareBuild(t) {
    t instanceof We || (t = new We(t, this.options));
    let n = 0;
    do {
      const r = this.build[n], i = t.build[n];
      if (dr("build compare", n, r, i), r === void 0 && i === void 0)
        return 0;
      if (i === void 0)
        return 1;
      if (r === void 0)
        return -1;
      if (r === i)
        continue;
      return vs(r, i);
    } while (++n);
  }
  // preminor will bump the version up to the next minor release, and immediately
  // down to pre-release. premajor and prepatch work the same way.
  inc(t, n, r) {
    if (t.startsWith("pre")) {
      if (!n && r === !1)
        throw new Error("invalid increment argument: identifier is empty");
      if (n) {
        const i = `-${n}`.match(this.options.loose ? mr[hr.PRERELEASELOOSE] : mr[hr.PRERELEASE]);
        if (!i || i[1] !== n)
          throw new Error(`invalid identifier: ${n}`);
      }
    }
    switch (t) {
      case "premajor":
        this.prerelease.length = 0, this.patch = 0, this.minor = 0, this.major++, this.inc("pre", n, r);
        break;
      case "preminor":
        this.prerelease.length = 0, this.patch = 0, this.minor++, this.inc("pre", n, r);
        break;
      case "prepatch":
        this.prerelease.length = 0, this.inc("patch", n, r), this.inc("pre", n, r);
        break;
      case "prerelease":
        this.prerelease.length === 0 && this.inc("patch", n, r), this.inc("pre", n, r);
        break;
      case "release":
        if (this.prerelease.length === 0)
          throw new Error(`version ${this.raw} is not a prerelease`);
        this.prerelease.length = 0;
        break;
      case "major":
        (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) && this.major++, this.minor = 0, this.patch = 0, this.prerelease = [];
        break;
      case "minor":
        (this.patch !== 0 || this.prerelease.length === 0) && this.minor++, this.patch = 0, this.prerelease = [];
        break;
      case "patch":
        this.prerelease.length === 0 && this.patch++, this.prerelease = [];
        break;
      case "pre": {
        const i = Number(r) ? 1 : 0;
        if (this.prerelease.length === 0)
          this.prerelease = [i];
        else {
          let s = this.prerelease.length;
          for (; --s >= 0; )
            typeof this.prerelease[s] == "number" && (this.prerelease[s]++, s = -2);
          if (s === -1) {
            if (n === this.prerelease.join(".") && r === !1)
              throw new Error("invalid increment argument: identifier already exists");
            this.prerelease.push(i);
          }
        }
        if (n) {
          let s = [n, i];
          if (r === !1 && (s = [n]), T_(this.prerelease, n)) {
            const a = this.prerelease[n.split(".").length];
            isNaN(a) && (this.prerelease = s);
          } else
            this.prerelease = s;
        }
        break;
      }
      default:
        throw new Error(`invalid increment argument: ${t}`);
    }
    return this.raw = this.format(), this.build.length && (this.raw += `+${this.build.join(".")}`), this;
  }
};
var Ae = P_;
const bc = Ae, R_ = (e, t, n = !1) => {
  if (e instanceof bc)
    return e;
  try {
    return new bc(e, t);
  } catch (r) {
    if (!n)
      return null;
    throw r;
  }
};
var Dt = R_;
const j_ = Dt, I_ = (e, t) => {
  const n = j_(e, t);
  return n ? n.version : null;
};
var O_ = I_;
const $_ = Dt, N_ = (e, t) => {
  const n = $_(e.trim().replace(/^[=v]+/, ""), t);
  return n ? n.version : null;
};
var C_ = N_;
const xc = Ae, L_ = (e, t, n, r, i) => {
  typeof n == "string" && (i = r, r = n, n = void 0);
  try {
    return new xc(
      e instanceof xc ? e.version : e,
      n
    ).inc(t, r, i).version;
  } catch {
    return null;
  }
};
var D_ = L_;
const yc = Dt, z_ = (e, t) => {
  const n = yc(e, null, !0), r = yc(t, null, !0), i = n.compare(r);
  if (i === 0)
    return null;
  const s = i > 0, a = s ? n : r, c = s ? r : n, l = !!a.prerelease.length;
  if (!!c.prerelease.length && !l) {
    if (!c.patch && !c.minor)
      return "major";
    if (c.compareMain(a) === 0)
      return c.minor && !c.patch ? "minor" : "patch";
  }
  const u = l ? "pre" : "";
  return n.major !== r.major ? u + "major" : n.minor !== r.minor ? u + "minor" : n.patch !== r.patch ? u + "patch" : "prerelease";
};
var F_ = z_;
const U_ = Ae, B_ = (e, t) => new U_(e, t).major;
var M_ = B_;
const q_ = Ae, H_ = (e, t) => new q_(e, t).minor;
var V_ = H_;
const Z_ = Ae, W_ = (e, t) => new Z_(e, t).patch;
var G_ = W_;
const J_ = Dt, K_ = (e, t) => {
  const n = J_(e, t);
  return n && n.prerelease.length ? n.prerelease : null;
};
var X_ = K_;
const wc = Ae, Y_ = (e, t, n) => new wc(e, n).compare(new wc(t, n));
var Ve = Y_;
const Q_ = Ve, eS = (e, t, n) => Q_(t, e, n);
var tS = eS;
const nS = Ve, rS = (e, t) => nS(e, t, !0);
var iS = rS;
const Ec = Ae, sS = (e, t, n) => {
  const r = new Ec(e, n), i = new Ec(t, n);
  return r.compare(i) || r.compareBuild(i);
};
var ua = sS;
const aS = ua, oS = (e, t) => e.sort((n, r) => aS(n, r, t));
var cS = oS;
const lS = ua, uS = (e, t) => e.sort((n, r) => lS(r, n, t));
var pS = uS;
const dS = Ve, fS = (e, t, n) => dS(e, t, n) > 0;
var ci = fS;
const mS = Ve, hS = (e, t, n) => mS(e, t, n) < 0;
var pa = hS;
const gS = Ve, vS = (e, t, n) => gS(e, t, n) === 0;
var dp = vS;
const bS = Ve, xS = (e, t, n) => bS(e, t, n) !== 0;
var fp = xS;
const yS = Ve, wS = (e, t, n) => yS(e, t, n) >= 0;
var da = wS;
const ES = Ve, _S = (e, t, n) => ES(e, t, n) <= 0;
var fa = _S;
const SS = dp, AS = fp, kS = ci, TS = da, PS = pa, RS = fa, jS = (e, t, n, r) => {
  switch (t) {
    case "===":
      return typeof e == "object" && (e = e.version), typeof n == "object" && (n = n.version), e === n;
    case "!==":
      return typeof e == "object" && (e = e.version), typeof n == "object" && (n = n.version), e !== n;
    case "":
    case "=":
    case "==":
      return SS(e, n, r);
    case "!=":
      return AS(e, n, r);
    case ">":
      return kS(e, n, r);
    case ">=":
      return TS(e, n, r);
    case "<":
      return PS(e, n, r);
    case "<=":
      return RS(e, n, r);
    default:
      throw new TypeError(`Invalid operator: ${t}`);
  }
};
var mp = jS;
const IS = Ae, OS = Dt, { safeRe: gr, t: vr } = Xn, $S = (e, t) => {
  if (e instanceof IS)
    return e;
  if (typeof e == "number" && (e = String(e)), typeof e != "string")
    return null;
  t = t || {};
  let n = null;
  if (!t.rtl)
    n = e.match(t.includePrerelease ? gr[vr.COERCEFULL] : gr[vr.COERCE]);
  else {
    const l = t.includePrerelease ? gr[vr.COERCERTLFULL] : gr[vr.COERCERTL];
    let p;
    for (; (p = l.exec(e)) && (!n || n.index + n[0].length !== e.length); )
      (!n || p.index + p[0].length !== n.index + n[0].length) && (n = p), l.lastIndex = p.index + p[1].length + p[2].length;
    l.lastIndex = -1;
  }
  if (n === null)
    return null;
  const r = n[2], i = n[3] || "0", s = n[4] || "0", a = t.includePrerelease && n[5] ? `-${n[5]}` : "", c = t.includePrerelease && n[6] ? `+${n[6]}` : "";
  return OS(`${r}.${i}.${s}${a}${c}`, t);
};
var NS = $S;
const CS = Dt, LS = Kn, DS = Ae, zS = (e, t, n) => {
  if (!LS.RELEASE_TYPES.includes(t))
    return null;
  const r = FS(e, n);
  return r && US(r, t);
}, FS = (e, t) => {
  const n = e instanceof DS ? e.version : e;
  return CS(n, t);
}, US = (e, t) => {
  if (BS(t))
    return e.version;
  switch (e.prerelease = [], t) {
    case "major":
      e.minor = 0, e.patch = 0;
      break;
    case "minor":
      e.patch = 0;
      break;
  }
  return e.format();
}, BS = (e) => e.startsWith("pre");
var MS = zS;
class qS {
  constructor() {
    this.max = 1e3, this.map = /* @__PURE__ */ new Map();
  }
  get(t) {
    const n = this.map.get(t);
    if (n !== void 0)
      return this.map.delete(t), this.map.set(t, n), n;
  }
  delete(t) {
    return this.map.delete(t);
  }
  set(t, n) {
    if (!this.delete(t) && n !== void 0) {
      if (this.map.size >= this.max) {
        const i = this.map.keys().next().value;
        this.delete(i);
      }
      this.map.set(t, n);
    }
    return this;
  }
}
var HS = qS, Hi, _c;
function Ze() {
  if (_c) return Hi;
  _c = 1;
  const e = /\s+/g;
  class t {
    constructor(_, k) {
      if (k = i(k), _ instanceof t)
        return _.loose === !!k.loose && _.includePrerelease === !!k.includePrerelease ? _ : new t(_.raw, k);
      if (_ instanceof s)
        return this.raw = _.value, this.set = [[_]], this.formatted = void 0, this;
      if (this.options = k, this.loose = !!k.loose, this.includePrerelease = !!k.includePrerelease, this.raw = _.trim().replace(e, " "), this.set = this.raw.split("||").map((O) => this.parseRange(O.trim())).filter((O) => O.length), !this.set.length)
        throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
      if (this.set.length > 1) {
        const O = this.set[0];
        if (this.set = this.set.filter((R) => !x(R[0])), this.set.length === 0)
          this.set = [O];
        else if (this.set.length > 1) {
          for (const R of this.set)
            if (R.length === 1 && I(R[0])) {
              this.set = [R];
              break;
            }
        }
      }
      this.formatted = void 0;
    }
    get range() {
      if (this.formatted === void 0) {
        this.formatted = "";
        for (let _ = 0; _ < this.set.length; _++) {
          _ > 0 && (this.formatted += "||");
          const k = this.set[_];
          for (let O = 0; O < k.length; O++)
            O > 0 && (this.formatted += " "), this.formatted += k[O].toString().trim();
        }
      }
      return this.formatted;
    }
    format() {
      return this.range;
    }
    toString() {
      return this.range;
    }
    parseRange(_) {
      _ = _.replace(b, "");
      const O = ((this.options.includePrerelease && v) | (this.options.loose && g)) + ":" + _, R = r.get(O);
      if (R)
        return R;
      const y = this.options.loose, E = y ? l[u.HYPHENRANGELOOSE] : l[u.HYPHENRANGE];
      _ = _.replace(E, zt(this.options.includePrerelease)), a("hyphen replace", _), _ = _.replace(l[u.COMPARATORTRIM], d), a("comparator trim", _), _ = _.replace(l[u.TILDETRIM], f), a("tilde trim", _), _ = _.replace(l[u.CARETTRIM], m), a("caret trim", _);
      let j = _.split(" ").map((V) => P(V, this.options)).join(" ").split(/\s+/).map((V) => Re(V, this.options));
      y && (j = j.filter((V) => (a("loose invalid filter", V, this.options), !!V.match(l[u.COMPARATORLOOSE])))), a("range list", j);
      const $ = /* @__PURE__ */ new Map(), z = j.map((V) => new s(V, this.options));
      for (const V of z) {
        if (x(V))
          return [V];
        $.set(V.value, V);
      }
      $.size > 1 && $.has("") && $.delete("");
      const G = [...$.values()];
      return r.set(O, G), G;
    }
    intersects(_, k) {
      if (!(_ instanceof t))
        throw new TypeError("a Range is required");
      return this.set.some((O) => D(O, k) && _.set.some((R) => D(R, k) && O.every((y) => R.every((E) => y.intersects(E, k)))));
    }
    // if ANY of the sets match ALL of its comparators, then pass
    test(_) {
      if (!_)
        return !1;
      if (typeof _ == "string")
        try {
          _ = new c(_, this.options);
        } catch {
          return !1;
        }
      for (let k = 0; k < this.set.length; k++)
        if (re(this.set[k], _, this.options))
          return !0;
      return !1;
    }
  }
  Hi = t;
  const n = HS, r = new n(), i = la, s = li(), a = oi, c = Ae, {
    safeRe: l,
    src: p,
    t: u,
    comparatorTrimReplace: d,
    tildeTrimReplace: f,
    caretTrimReplace: m
  } = Xn, { FLAG_INCLUDE_PRERELEASE: v, FLAG_LOOSE: g } = Kn, b = new RegExp(p[u.BUILD], "g"), x = (A) => A.value === "<0.0.0-0", I = (A) => A.value === "", D = (A, _) => {
    let k = !0;
    const O = A.slice();
    let R = O.pop();
    for (; k && O.length; )
      k = O.every((y) => R.intersects(y, _)), R = O.pop();
    return k;
  }, P = (A, _) => (A = A.replace(l[u.BUILD], ""), a("comp", A, _), A = K(A, _), a("caret", A), A = L(A, _), a("tildes", A), A = it(A, _), a("xrange", A), A = De(A, _), a("stars", A), A), C = (A) => !A || A.toLowerCase() === "x" || A === "*", q = (A, _, k) => C(A) && !C(_) || C(_) && k && !C(k), L = (A, _) => A.trim().split(/\s+/).map((k) => ne(k, _)).join(" "), ne = (A, _) => {
    const k = _.loose ? l[u.TILDELOOSE] : l[u.TILDE];
    return A.replace(k, (O, R, y, E, j) => {
      a("tilde", A, O, R, y, E, j);
      let $;
      return C(R) ? $ = "" : C(y) ? $ = `>=${R}.0.0 <${+R + 1}.0.0-0` : C(E) ? $ = `>=${R}.${y}.0 <${R}.${+y + 1}.0-0` : j ? (a("replaceTilde pr", j), $ = `>=${R}.${y}.${E}-${j} <${R}.${+y + 1}.0-0`) : $ = `>=${R}.${y}.${E} <${R}.${+y + 1}.0-0`, a("tilde return", $), $;
    });
  }, K = (A, _) => A.trim().split(/\s+/).map((k) => Le(k, _)).join(" "), Le = (A, _) => {
    a("caret", A, _);
    const k = _.loose ? l[u.CARETLOOSE] : l[u.CARET], O = _.includePrerelease ? "-0" : "";
    return A.replace(k, (R, y, E, j, $) => {
      a("caret", A, R, y, E, j, $);
      let z;
      return C(y) ? z = "" : C(E) ? z = `>=${y}.0.0${O} <${+y + 1}.0.0-0` : C(j) ? y === "0" ? z = `>=${y}.${E}.0${O} <${y}.${+E + 1}.0-0` : z = `>=${y}.${E}.0${O} <${+y + 1}.0.0-0` : $ ? (a("replaceCaret pr", $), y === "0" ? E === "0" ? z = `>=${y}.${E}.${j}-${$} <${y}.${E}.${+j + 1}-0` : z = `>=${y}.${E}.${j}-${$} <${y}.${+E + 1}.0-0` : z = `>=${y}.${E}.${j}-${$} <${+y + 1}.0.0-0`) : (a("no pr"), y === "0" ? E === "0" ? z = `>=${y}.${E}.${j} <${y}.${E}.${+j + 1}-0` : z = `>=${y}.${E}.${j} <${y}.${+E + 1}.0-0` : z = `>=${y}.${E}.${j} <${+y + 1}.0.0-0`), a("caret return", z), z;
    });
  }, it = (A, _) => (a("replaceXRanges", A, _), A.split(/\s+/).map((k) => Me(k, _)).join(" ")), Me = (A, _) => {
    A = A.trim();
    const k = _.loose ? l[u.XRANGELOOSE] : l[u.XRANGE];
    return A.replace(k, (O, R, y, E, j, $) => {
      if (a("xRange", A, O, R, y, E, j, $), q(y, E, j))
        return A;
      const z = C(y), G = z || C(E), V = G || C(j), X = V;
      return R === "=" && X && (R = ""), $ = _.includePrerelease ? "-0" : "", z ? R === ">" || R === "<" ? O = "<0.0.0-0" : O = "*" : R && X ? (G && (E = 0), j = 0, R === ">" ? (R = ">=", G ? (y = +y + 1, E = 0, j = 0) : (E = +E + 1, j = 0)) : R === "<=" && (R = "<", G ? y = +y + 1 : E = +E + 1), R === "<" && ($ = "-0"), O = `${R + y}.${E}.${j}${$}`) : G ? O = `>=${y}.0.0${$} <${+y + 1}.0.0-0` : V && (O = `>=${y}.${E}.0${$} <${y}.${+E + 1}.0-0`), a("xRange return", O), O;
    });
  }, De = (A, _) => (a("replaceStars", A, _), A.trim().replace(l[u.STAR], "")), Re = (A, _) => (a("replaceGTE0", A, _), A.trim().replace(l[_.includePrerelease ? u.GTE0PRE : u.GTE0], "")), zt = (A) => (_, k, O, R, y, E, j, $, z, G, V, X) => (C(O) ? k = "" : C(R) ? k = `>=${O}.0.0${A ? "-0" : ""}` : C(y) ? k = `>=${O}.${R}.0${A ? "-0" : ""}` : E ? k = `>=${k}` : k = `>=${k}${A ? "-0" : ""}`, C(z) ? $ = "" : C(G) ? $ = `<${+z + 1}.0.0-0` : C(V) ? $ = `<${z}.${+G + 1}.0-0` : X ? $ = `<=${z}.${G}.${V}-${X}` : A ? $ = `<${z}.${G}.${+V + 1}-0` : $ = `<=${$}`, `${k} ${$}`.trim()), re = (A, _, k) => {
    for (let O = 0; O < A.length; O++)
      if (!A[O].test(_))
        return !1;
    if (_.prerelease.length && !k.includePrerelease) {
      for (let O = 0; O < A.length; O++)
        if (a(A[O].semver), A[O].semver !== s.ANY && A[O].semver.prerelease.length > 0) {
          const R = A[O].semver;
          if (R.major === _.major && R.minor === _.minor && R.patch === _.patch)
            return !0;
        }
      return !1;
    }
    return !0;
  };
  return Hi;
}
var Vi, Sc;
function li() {
  if (Sc) return Vi;
  Sc = 1;
  const e = Symbol("SemVer ANY");
  class t {
    static get ANY() {
      return e;
    }
    constructor(u, d) {
      if (d = n(d), u instanceof t) {
        if (u.loose === !!d.loose)
          return u;
        u = u.value;
      }
      u = u.trim().split(/\s+/).join(" "), a("comparator", u, d), this.options = d, this.loose = !!d.loose, this.parse(u), this.semver === e ? this.value = "" : this.value = this.operator + this.semver.version, a("comp", this);
    }
    parse(u) {
      const d = this.options.loose ? r[i.COMPARATORLOOSE] : r[i.COMPARATOR], f = u.match(d);
      if (!f)
        throw new TypeError(`Invalid comparator: ${u}`);
      this.operator = f[1] !== void 0 ? f[1] : "", this.operator === "=" && (this.operator = ""), f[2] ? this.semver = new c(f[2], this.options.loose) : this.semver = e;
    }
    toString() {
      return this.value;
    }
    test(u) {
      if (a("Comparator.test", u, this.options.loose), this.semver === e || u === e)
        return !0;
      if (typeof u == "string")
        try {
          u = new c(u, this.options);
        } catch {
          return !1;
        }
      return s(u, this.operator, this.semver, this.options);
    }
    intersects(u, d) {
      if (!(u instanceof t))
        throw new TypeError("a Comparator is required");
      return this.operator === "" ? this.value === "" ? !0 : new l(u.value, d).test(this.value) : u.operator === "" ? u.value === "" ? !0 : new l(this.value, d).test(u.semver) : (d = n(d), d.includePrerelease && (this.value === "<0.0.0-0" || u.value === "<0.0.0-0") || !d.includePrerelease && (this.value.startsWith("<0.0.0") || u.value.startsWith("<0.0.0")) ? !1 : !!(this.operator.startsWith(">") && u.operator.startsWith(">") || this.operator.startsWith("<") && u.operator.startsWith("<") || this.semver.version === u.semver.version && this.operator.includes("=") && u.operator.includes("=") || s(this.semver, "<", u.semver, d) && this.operator.startsWith(">") && u.operator.startsWith("<") || s(this.semver, ">", u.semver, d) && this.operator.startsWith("<") && u.operator.startsWith(">")));
    }
  }
  Vi = t;
  const n = la, { safeRe: r, t: i } = Xn, s = mp, a = oi, c = Ae, l = Ze();
  return Vi;
}
const VS = Ze(), ZS = (e, t, n) => {
  try {
    t = new VS(t, n);
  } catch {
    return !1;
  }
  return t.test(e);
};
var ui = ZS;
const WS = Ze(), GS = (e, t) => new WS(e, t).set.map((n) => n.map((r) => r.value).join(" ").trim().split(" "));
var JS = GS;
const KS = Ae, XS = Ze(), YS = (e, t, n) => {
  let r = null, i = null, s = null;
  try {
    s = new XS(t, n);
  } catch {
    return null;
  }
  return e.forEach((a) => {
    s.test(a) && (!r || i.compare(a) === -1) && (r = a, i = new KS(r, n));
  }), r;
};
var QS = YS;
const eA = Ae, tA = Ze(), nA = (e, t, n) => {
  let r = null, i = null, s = null;
  try {
    s = new tA(t, n);
  } catch {
    return null;
  }
  return e.forEach((a) => {
    s.test(a) && (!r || i.compare(a) === 1) && (r = a, i = new eA(r, n));
  }), r;
};
var rA = nA;
const Zi = Ae, iA = Ze(), Ac = ci, sA = (e, t) => {
  e = new iA(e, t);
  let n = new Zi("0.0.0");
  if (e.test(n) || (n = new Zi("0.0.0-0"), e.test(n)))
    return n;
  n = null;
  for (let r = 0; r < e.set.length; ++r) {
    const i = e.set[r];
    let s = null;
    i.forEach((a) => {
      const c = new Zi(a.semver.version);
      switch (a.operator) {
        case ">":
          c.prerelease.length === 0 ? c.patch++ : c.prerelease.push(0), c.raw = c.format();
        case "":
        case ">=":
          (!s || Ac(c, s)) && (s = c);
          break;
        case "<":
        case "<=":
          break;
        default:
          throw new Error(`Unexpected operation: ${a.operator}`);
      }
    }), s && (!n || Ac(n, s)) && (n = s);
  }
  return n && e.test(n) ? n : null;
};
var aA = sA;
const oA = Ze(), cA = (e, t) => {
  try {
    return new oA(e, t).range || "*";
  } catch {
    return null;
  }
};
var lA = cA;
const uA = Ae, hp = li(), { ANY: pA } = hp, dA = Ze(), fA = ui, kc = ci, Tc = pa, mA = fa, hA = da, gA = (e, t, n, r) => {
  e = new uA(e, r), t = new dA(t, r);
  let i, s, a, c, l;
  switch (n) {
    case ">":
      i = kc, s = mA, a = Tc, c = ">", l = ">=";
      break;
    case "<":
      i = Tc, s = hA, a = kc, c = "<", l = "<=";
      break;
    default:
      throw new TypeError('Must provide a hilo val of "<" or ">"');
  }
  if (fA(e, t, r))
    return !1;
  for (let p = 0; p < t.set.length; ++p) {
    const u = t.set[p];
    let d = null, f = null;
    if (u.forEach((m) => {
      m.semver === pA && (m = new hp(">=0.0.0")), d = d || m, f = f || m, i(m.semver, d.semver, r) ? d = m : a(m.semver, f.semver, r) && (f = m);
    }), d.operator === c || d.operator === l || (!f.operator || f.operator === c) && s(e, f.semver))
      return !1;
    if (f.operator === l && a(e, f.semver))
      return !1;
  }
  return !0;
};
var ma = gA;
const vA = ma, bA = (e, t, n) => vA(e, t, ">", n);
var xA = bA;
const yA = ma, wA = (e, t, n) => yA(e, t, "<", n);
var EA = wA;
const Pc = Ze(), _A = (e, t, n) => (e = new Pc(e, n), t = new Pc(t, n), e.intersects(t, n));
var SA = _A;
const AA = ui, kA = Ve;
var TA = (e, t, n) => {
  const r = [];
  let i = null, s = null;
  const a = e.sort((u, d) => kA(u, d, n));
  for (const u of a)
    AA(u, t, n) ? (s = u, i || (i = u)) : (s && r.push([i, s]), s = null, i = null);
  i && r.push([i, null]);
  const c = [];
  for (const [u, d] of r)
    u === d ? c.push(u) : !d && u === a[0] ? c.push("*") : d ? u === a[0] ? c.push(`<=${d}`) : c.push(`${u} - ${d}`) : c.push(`>=${u}`);
  const l = c.join(" || "), p = typeof t.raw == "string" ? t.raw : String(t);
  return l.length < p.length ? l : t;
};
const Rc = Ze(), ha = li(), { ANY: Wi } = ha, Gi = ui, ga = Ve, PA = (e, t, n = {}) => {
  if (e === t)
    return !0;
  e = new Rc(e, n), t = new Rc(t, n);
  let r = !1;
  e: for (const i of e.set) {
    for (const s of t.set) {
      const a = jA(i, s, n);
      if (r = r || a !== null, a)
        continue e;
    }
    if (r)
      return !1;
  }
  return !0;
}, RA = [new ha(">=0.0.0-0")], jc = [new ha(">=0.0.0")], jA = (e, t, n) => {
  if (e === t)
    return !0;
  if (e.length === 1 && e[0].semver === Wi) {
    if (t.length === 1 && t[0].semver === Wi)
      return !0;
    n.includePrerelease ? e = RA : e = jc;
  }
  if (t.length === 1 && t[0].semver === Wi) {
    if (n.includePrerelease)
      return !0;
    t = jc;
  }
  const r = /* @__PURE__ */ new Set();
  let i, s;
  for (const m of e)
    m.operator === ">" || m.operator === ">=" ? i = Ic(i, m, n) : m.operator === "<" || m.operator === "<=" ? s = Oc(s, m, n) : r.add(m.semver);
  if (r.size > 1)
    return null;
  let a;
  if (i && s) {
    if (a = ga(i.semver, s.semver, n), a > 0)
      return null;
    if (a === 0 && (i.operator !== ">=" || s.operator !== "<="))
      return null;
  }
  for (const m of r) {
    if (i && !Gi(m, String(i), n) || s && !Gi(m, String(s), n))
      return null;
    for (const v of t)
      if (!Gi(m, String(v), n))
        return !1;
    return !0;
  }
  let c, l, p, u, d = s && !n.includePrerelease && s.semver.prerelease.length ? s.semver : !1, f = i && !n.includePrerelease && i.semver.prerelease.length ? i.semver : !1;
  d && d.prerelease.length === 1 && s.operator === "<" && d.prerelease[0] === 0 && (d = !1);
  for (const m of t) {
    if (u = u || m.operator === ">" || m.operator === ">=", p = p || m.operator === "<" || m.operator === "<=", i) {
      if (f && m.semver.prerelease && m.semver.prerelease.length && m.semver.major === f.major && m.semver.minor === f.minor && m.semver.patch === f.patch && (f = !1), m.operator === ">" || m.operator === ">=") {
        if (c = Ic(i, m, n), c === m && c !== i)
          return !1;
      } else if (i.operator === ">=" && !m.test(i.semver))
        return !1;
    }
    if (s) {
      if (d && m.semver.prerelease && m.semver.prerelease.length && m.semver.major === d.major && m.semver.minor === d.minor && m.semver.patch === d.patch && (d = !1), m.operator === "<" || m.operator === "<=") {
        if (l = Oc(s, m, n), l === m && l !== s)
          return !1;
      } else if (s.operator === "<=" && !m.test(s.semver))
        return !1;
    }
    if (!m.operator && (s || i) && a !== 0)
      return !1;
  }
  return !(i && p && !s && a !== 0 || s && u && !i && a !== 0 || f || d);
}, Ic = (e, t, n) => {
  if (!e)
    return t;
  const r = ga(e.semver, t.semver, n);
  return r > 0 ? e : r < 0 || t.operator === ">" && e.operator === ">=" ? t : e;
}, Oc = (e, t, n) => {
  if (!e)
    return t;
  const r = ga(e.semver, t.semver, n);
  return r < 0 ? e : r > 0 || t.operator === "<" && e.operator === "<=" ? t : e;
};
var IA = PA;
const Ji = Xn, $c = Kn, OA = Ae, Nc = pp, $A = Dt, NA = O_, CA = C_, LA = D_, DA = F_, zA = M_, FA = V_, UA = G_, BA = X_, MA = Ve, qA = tS, HA = iS, VA = ua, ZA = cS, WA = pS, GA = ci, JA = pa, KA = dp, XA = fp, YA = da, QA = fa, ek = mp, tk = NS, nk = MS, rk = li(), ik = Ze(), sk = ui, ak = JS, ok = QS, ck = rA, lk = aA, uk = lA, pk = ma, dk = xA, fk = EA, mk = SA, hk = TA, gk = IA;
var vk = {
  parse: $A,
  valid: NA,
  clean: CA,
  inc: LA,
  diff: DA,
  major: zA,
  minor: FA,
  patch: UA,
  prerelease: BA,
  compare: MA,
  rcompare: qA,
  compareLoose: HA,
  compareBuild: VA,
  sort: ZA,
  rsort: WA,
  gt: GA,
  lt: JA,
  eq: KA,
  neq: XA,
  gte: YA,
  lte: QA,
  cmp: ek,
  coerce: tk,
  truncate: nk,
  Comparator: rk,
  Range: ik,
  satisfies: sk,
  toComparators: ak,
  maxSatisfying: ok,
  minSatisfying: ck,
  minVersion: lk,
  validRange: uk,
  outside: pk,
  gtr: dk,
  ltr: fk,
  intersects: mk,
  simplifyRange: hk,
  subset: gk,
  SemVer: OA,
  re: Ji.re,
  src: Ji.src,
  tokens: Ji.t,
  SEMVER_SPEC_VERSION: $c.SEMVER_SPEC_VERSION,
  RELEASE_TYPES: $c.RELEASE_TYPES,
  compareIdentifiers: Nc.compareIdentifiers,
  rcompareIdentifiers: Nc.rcompareIdentifiers
};
const pi = /* @__PURE__ */ Nt(vk), bk = "sharp", xk = "High performance Node.js image processing, the fastest module to resize JPEG, PNG, WebP, GIF, AVIF and TIFF images", yk = "0.35.1", wk = "Lovell Fuller <npm@lovell.info>", Ek = "https://sharp.pixelplumbing.com", _k = [
  "Pierre Inglebert <pierre.inglebert@gmail.com>",
  "Jonathan Ong <jonathanrichardong@gmail.com>",
  "Chanon Sajjamanochai <chanon.s@gmail.com>",
  "Juliano Julio <julianojulio@gmail.com>",
  "Daniel Gasienica <daniel@gasienica.ch>",
  "Julian Walker <julian@fiftythree.com>",
  "Amit Pitaru <pitaru.amit@gmail.com>",
  "Brandon Aaron <hello.brandon@aaron.sh>",
  "Andreas Lind <andreas@one.com>",
  "Maurus Cuelenaere <mcuelenaere@gmail.com>",
  "Linus Unnebäck <linus@folkdatorn.se>",
  "Victor Mateevitsi <mvictoras@gmail.com>",
  "Alaric Holloway <alaric.holloway@gmail.com>",
  "Bernhard K. Weisshuhn <bkw@codingforce.com>",
  "Chris Riley <criley@primedia.com>",
  "David Carley <dacarley@gmail.com>",
  "John Tobin <john@limelightmobileinc.com>",
  "Kenton Gray <kentongray@gmail.com>",
  "Felix Bünemann <Felix.Buenemann@gmail.com>",
  "Samy Al Zahrani <samyalzahrany@gmail.com>",
  "Chintan Thakkar <lemnisk8@gmail.com>",
  "F. Orlando Galashan <frulo@gmx.de>",
  "Kleis Auke Wolthuizen <info@kleisauke.nl>",
  "Matt Hirsch <mhirsch@media.mit.edu>",
  "Matthias Thoemmes <thoemmes@gmail.com>",
  "Patrick Paskaris <patrick@paskaris.gr>",
  "Jérémy Lal <kapouer@melix.org>",
  "Rahul Nanwani <r.nanwani@gmail.com>",
  "Alice Monday <alice0meta@gmail.com>",
  "Kristo Jorgenson <kristo.jorgenson@gmail.com>",
  "YvesBos <yves_bos@outlook.com>",
  "Guy Maliar <guy@tailorbrands.com>",
  "Nicolas Coden <nicolas@ncoden.fr>",
  "Matt Parrish <matt.r.parrish@gmail.com>",
  "Marcel Bretschneider <marcel.bretschneider@gmail.com>",
  "Matthew McEachen <matthew+github@mceachen.org>",
  "Jarda Kotěšovec <jarda.kotesovec@gmail.com>",
  "Kenric D'Souza <kenric.dsouza@gmail.com>",
  "Oleh Aleinyk <oleg.aleynik@gmail.com>",
  "Marcel Bretschneider <marcel.bretschneider@gmail.com>",
  "Andrea Bianco <andrea.bianco@unibas.ch>",
  "Rik Heywood <rik@rik.org>",
  "Thomas Parisot <hi@oncletom.io>",
  "Nathan Graves <nathanrgraves+github@gmail.com>",
  "Tom Lokhorst <tom@lokhorst.eu>",
  "Espen Hovlandsdal <espen@hovlandsdal.com>",
  "Sylvain Dumont <sylvain.dumont35@gmail.com>",
  "Alun Davies <alun.owain.davies@googlemail.com>",
  "Aidan Hoolachan <ajhoolachan21@gmail.com>",
  "Axel Eirola <axel.eirola@iki.fi>",
  "Freezy <freezy@xbmc.org>",
  "Daiz <taneli.vatanen@gmail.com>",
  "Julian Aubourg <j@ubourg.net>",
  "Keith Belovay <keith@picthrive.com>",
  "Michael B. Klein <mbklein@gmail.com>",
  "Jordan Prudhomme <jordan@raboland.fr>",
  "Ilya Ovdin <iovdin@gmail.com>",
  "Andargor <andargor@yahoo.com>",
  "Paul Neave <paul.neave@gmail.com>",
  "Brendan Kennedy <brenwken@gmail.com>",
  "Brychan Bennett-Odlum <git@brychan.io>",
  "Edward Silverton <e.silverton@gmail.com>",
  "Roman Malieiev <aromaleev@gmail.com>",
  "Tomas Szabo <tomas.szabo@deftomat.com>",
  "Robert O'Rourke <robert@o-rourke.org>",
  "Guillermo Alfonso Varela Chouciño <guillevch@gmail.com>",
  "Christian Flintrup <chr@gigahost.dk>",
  "Manan Jadhav <manan@motionden.com>",
  "Leon Radley <leon@radley.se>",
  "alza54 <alza54@thiocod.in>",
  "Jacob Smith <jacob@frende.me>",
  "Michael Nutt <michael@nutt.im>",
  "Brad Parham <baparham@gmail.com>",
  "Taneli Vatanen <taneli.vatanen@gmail.com>",
  "Joris Dugué <zaruike10@gmail.com>",
  "Chris Banks <christopher.bradley.banks@gmail.com>",
  "Ompal Singh <ompal.hitm09@gmail.com>",
  "Brodan <christopher.hranj@gmail.com>",
  "Ankur Parihar <ankur.github@gmail.com>",
  "Brahim Ait elhaj <brahima@gmail.com>",
  "Mart Jansink <m.jansink@gmail.com>",
  "Lachlan Newman <lachnewman007@gmail.com>",
  "Dennis Beatty <dennis@dcbeatty.com>",
  "Ingvar Stepanyan <me@rreverser.com>",
  "Don Denton <don@happycollision.com>",
  "Dmytro Tiapukhin <cool.gegeg@gmail.com>",
  "Florian Lefebvre <contact@florian-lefebvre.dev>"
], Sk = {
  build: "node install/build.js",
  "build:dist": "node scripts/build.mjs",
  clean: "rm -rf src/build/ test/fixtures/output.*",
  test: "npm run lint && npm run test-unit",
  lint: "npm run lint-cpp && npm run lint-js && npm run lint-types && npm run lint-publish",
  "lint-cpp": "cpplint --quiet src/*.h src/*.cc",
  "lint-js": "biome lint",
  "lint-publish": "publint --strict",
  "lint-types": "tsd --files ./test/types/sharp.test-d.ts",
  "test-leak": "./test/leak/leak.sh",
  "test-unit": "node --experimental-test-coverage test/unit.mjs",
  "package-from-local-build": "node npm/from-local-build.js",
  "package-wasm-wrappers": "node npm/wasm-wrappers.js",
  "package-release-notes": "node npm/release-notes.js",
  "docs-build": "node docs/build.mjs",
  "docs-serve": "cd docs && npm start",
  "docs-publish": "cd docs && npm run build && npx firebase-tools deploy --project pixelplumbing --only hosting:pixelplumbing-sharp"
}, Ak = "commonjs", kk = [
  "dist",
  "install",
  "lib/index.d.ts",
  "src/*.{cc,h,gyp}"
], Tk = "./dist/index.cjs", Pk = "./dist/index.mjs", Rk = "./dist/index.d.mts", jk = {
  ".": {
    import: {
      types: "./dist/index.d.mts",
      default: "./dist/index.mjs"
    },
    require: {
      types: "./dist/index.d.cts",
      default: "./dist/index.cjs"
    }
  }
}, Ik = !0, Ok = {
  type: "git",
  url: "git+https://github.com/lovell/sharp.git"
}, $k = [
  "jpeg",
  "png",
  "webp",
  "avif",
  "tiff",
  "gif",
  "svg",
  "jp2",
  "dzi",
  "image",
  "resize",
  "thumbnail",
  "crop",
  "embed",
  "libvips",
  "vips"
], Nk = {
  "@img/colour": "^1.1.0",
  "detect-libc": "^2.1.2",
  semver: "^7.8.4"
}, Ck = {
  "@img/sharp-darwin-arm64": "0.35.1",
  "@img/sharp-darwin-x64": "0.35.1",
  "@img/sharp-freebsd-wasm32": "0.35.1",
  "@img/sharp-libvips-darwin-arm64": "1.3.0",
  "@img/sharp-libvips-darwin-x64": "1.3.0",
  "@img/sharp-libvips-linux-arm": "1.3.0",
  "@img/sharp-libvips-linux-arm64": "1.3.0",
  "@img/sharp-libvips-linux-ppc64": "1.3.0",
  "@img/sharp-libvips-linux-riscv64": "1.3.0",
  "@img/sharp-libvips-linux-s390x": "1.3.0",
  "@img/sharp-libvips-linux-x64": "1.3.0",
  "@img/sharp-libvips-linuxmusl-arm64": "1.3.0",
  "@img/sharp-libvips-linuxmusl-x64": "1.3.0",
  "@img/sharp-linux-arm": "0.35.1",
  "@img/sharp-linux-arm64": "0.35.1",
  "@img/sharp-linux-ppc64": "0.35.1",
  "@img/sharp-linux-riscv64": "0.35.1",
  "@img/sharp-linux-s390x": "0.35.1",
  "@img/sharp-linux-x64": "0.35.1",
  "@img/sharp-linuxmusl-arm64": "0.35.1",
  "@img/sharp-linuxmusl-x64": "0.35.1",
  "@img/sharp-webcontainers-wasm32": "0.35.1",
  "@img/sharp-win32-arm64": "0.35.1",
  "@img/sharp-win32-ia32": "0.35.1",
  "@img/sharp-win32-x64": "0.35.1"
}, Lk = {
  "@biomejs/biome": "^2.4.16",
  "@cpplint/cli": "^0.1.0",
  "@emnapi/runtime": "^1.11.0",
  "@img/sharp-libvips-dev": "1.3.0",
  "@img/sharp-libvips-dev-wasm32": "1.3.0",
  "@img/sharp-libvips-win32-arm64": "1.3.0",
  "@img/sharp-libvips-win32-ia32": "1.3.0",
  "@img/sharp-libvips-win32-x64": "1.3.0",
  "@types/node": "*",
  emnapi: "^1.11.0",
  "exif-reader": "^2.0.3",
  "extract-zip": "^2.0.1",
  icc: "^4.0.0",
  "node-addon-api": "^8.8.0",
  "node-gyp": "^12.4.0",
  publint: "^0.3.21",
  "tar-fs": "^3.1.2",
  tsd: "^0.33.0"
}, Dk = "Apache-2.0", zk = {
  node: ">=20.9.0"
}, Fk = {
  libvips: ">=8.18.3"
}, Uk = {
  url: "https://opencollective.com/libvips"
}, pn = {
  name: bk,
  description: xk,
  version: yk,
  author: wk,
  homepage: Ek,
  contributors: _k,
  scripts: Sk,
  type: Ak,
  files: kk,
  main: Tk,
  module: Pk,
  types: Rk,
  exports: jk,
  sideEffects: Ik,
  repository: Ok,
  keywords: $k,
  dependencies: Nk,
  optionalDependencies: Ck,
  devDependencies: Lk,
  license: Dk,
  engines: zk,
  config: Fk,
  funding: Uk
};
/*!
  Copyright 2013 Lovell Fuller and others.
  SPDX-License-Identifier: Apache-2.0
*/
const Bk = process.env.npm_package_config_libvips || pn.config.libvips, gp = pi.coerce(Bk).version, Mk = [
  "darwin-arm64",
  "darwin-x64",
  "freebsd-arm64",
  "freebsd-x64",
  "linux-arm",
  "linux-arm64",
  "linux-ppc64",
  "linux-riscv64",
  "linux-s390x",
  "linux-wasm32",
  "linux-x64",
  "linuxmusl-arm64",
  "linuxmusl-x64",
  "win32-arm64",
  "win32-ia32",
  "win32-x64"
], va = {
  encoding: "utf8",
  shell: !0
}, qk = (e) => {
  e instanceof Error ? console.error(`sharp: Installation error: ${e.message}`) : console.log(`sharp: ${e}`);
}, vp = () => Yt.isNonGlibcLinuxSync() ? Yt.familySync() : "", Hk = () => `${process.platform}${vp()}-${process.arch}`, dn = () => {
  if (bp())
    return "wasm32";
  const { npm_config_arch: e, npm_config_platform: t, npm_config_libc: n } = process.env, r = typeof n == "string" ? n : vp();
  return `${t || process.platform}${r}-${e || process.arch}`;
}, Vk = () => {
  try {
    return require(`@img/sharp-libvips-dev-${dn()}/include`);
  } catch {
    try {
      return require("@img/sharp-libvips-dev/include");
    } catch {
    }
  }
  return "";
}, Zk = () => {
  try {
    return require("@img/sharp-libvips-dev/cplusplus");
  } catch {
  }
  return "";
}, Wk = () => {
  try {
    return require(`@img/sharp-libvips-dev-${dn()}/lib`);
  } catch {
    try {
      return require(`@img/sharp-libvips-${dn()}/lib`);
    } catch {
    }
  }
  return "";
}, Gk = () => {
  var e;
  if (((e = process.release) == null ? void 0 : e.name) === "node" && process.versions && !pi.satisfies(process.versions.node, pn.engines.node))
    return { found: process.versions.node, expected: pn.engines.node };
}, bp = () => {
  const { CC: e } = process.env;
  return !!(e != null && e.endsWith("/emcc"));
}, Jk = () => process.platform === "darwin" && process.arch === "x64" ? (zn("sysctl sysctl.proc_translated", va).stdout || "").trim() === "sysctl.proc_translated: 1" : !1, Cc = (e) => Xp("sha512").update(e).digest("hex"), Kk = () => {
  try {
    const e = Cc(`imgsharp-libvips-${dn()}`), t = pi.coerce(pn.optionalDependencies[`@img/sharp-libvips-${dn()}`], {
      includePrerelease: !0
    }).version;
    return Cc(`${e}npm:${t}`).slice(0, 10);
  } catch {
  }
  return "";
}, Xk = () => zn(`node-gyp rebuild --directory=src ${bp() ? "--nodedir=emscripten" : ""}`, {
  ...va,
  stdio: "inherit"
}).status, xp = () => process.platform !== "win32" ? (zn("pkg-config --modversion vips-cpp", {
  ...va,
  env: {
    ...process.env,
    PKG_CONFIG_PATH: yp()
  }
}).stdout || "").trim() : "", Yk = () => {
  try {
    const e = (zn("brew", ["--prefix"], { encoding: "utf8" }).stdout || "").trim();
    if (e)
      return `${e}/lib/pkgconfig`;
  } catch {
  }
}, Qk = () => {
  try {
    const e = (zn("pkg-config", ["--variable", "pc_path", "pkg-config"], { encoding: "utf8" }).stdout || "").trim();
    if (e)
      return e;
  } catch {
  }
}, yp = () => process.platform !== "win32" ? [
  Yk(),
  Qk(),
  process.env.PKG_CONFIG_PATH
].filter(Boolean).join(":") : "", Ki = (e, t, n) => (n && n(`Detected ${t}, skipping search for globally-installed libvips`), e), e2 = (e) => {
  if (process.env.SHARP_IGNORE_GLOBAL_LIBVIPS)
    return Ki(!1, "SHARP_IGNORE_GLOBAL_LIBVIPS", e);
  if (process.env.SHARP_FORCE_GLOBAL_LIBVIPS)
    return Ki(!0, "SHARP_FORCE_GLOBAL_LIBVIPS", e);
  if (Jk())
    return Ki(!1, "Rosetta", e);
  const t = xp();
  return !!t && pi.gte(t, gp);
}, wp = {
  minimumLibvipsVersion: gp,
  prebuiltPlatforms: Mk,
  buildPlatformArch: dn,
  buildSharpLibvipsIncludeDir: Vk,
  buildSharpLibvipsCPlusPlusDir: Zk,
  buildSharpLibvipsLibDir: Wk,
  isUnsupportedNodeRuntime: Gk,
  runtimePlatformArch: Hk,
  log: qk,
  yarnLocator: Kk,
  spawnRebuild: Xk,
  globalLibvipsVersion: xp,
  pkgConfigPath: yp,
  useGlobalLibvips: e2
};
/*!
  Copyright 2013 Lovell Fuller and others.
  SPDX-License-Identifier: Apache-2.0
*/
const me = Jc(import.meta.url), { version: Ep } = pn, { runtimePlatformArch: t2, isUnsupportedNodeRuntime: Lc, prebuiltPlatforms: n2, minimumLibvipsVersion: r2 } = wp, at = t2();
let Q;
const kt = [];
try {
  Q = me(`../src/build/Release/sharp-${at}-${Ep}.node`);
} catch (e) {
  kt.push(e);
}
if (!Q)
  try {
    Q = me(`../src/build/Release/sharp-wasm32-${Ep}.node`);
  } catch (e) {
    kt.push(e);
  }
if (!Q)
  try {
    switch (at) {
      case "darwin-arm64":
        Q = me("@img/sharp-darwin-arm64/sharp.node");
        break;
      case "darwin-x64":
        Q = me("@img/sharp-darwin-x64/sharp.node");
        break;
      case "linux-arm":
        Q = me("@img/sharp-linux-arm/sharp.node");
        break;
      case "linux-arm64":
        Q = me("@img/sharp-linux-arm64/sharp.node");
        break;
      case "linux-ppc64":
        Q = me("@img/sharp-linux-ppc64/sharp.node");
        break;
      case "linux-riscv64":
        Q = me("@img/sharp-linux-riscv64/sharp.node");
        break;
      case "linux-s390x":
        Q = me("@img/sharp-linux-s390x/sharp.node");
        break;
      case "linux-x64":
        Q = me("@img/sharp-linux-x64/sharp.node");
        break;
      case "linuxmusl-arm64":
        Q = me("@img/sharp-linuxmusl-arm64/sharp.node");
        break;
      case "linuxmusl-x64":
        Q = me("@img/sharp-linuxmusl-x64/sharp.node");
        break;
      case "win32-arm64":
        Q = me("@img/sharp-win32-arm64/sharp.node");
        break;
      case "win32-ia32":
        Q = me("@img/sharp-win32-ia32/sharp.node");
        break;
      case "win32-x64":
        Q = me("@img/sharp-win32-x64/sharp.node");
        break;
      case "freebsd-arm64":
      case "freebsd-x64":
        Q = me("@img/sharp-freebsd-wasm32/sharp.node");
        break;
      case "linux-wasm32":
        Q = me("@img/sharp-webcontainers-wasm32/sharp.node");
        break;
      default:
        Q = me("@img/sharp-wasm32/sharp.node");
        break;
    }
    if (["linux-x64", "linuxmusl-x64"].includes(at) && !Q._isUsingX64V2()) {
      const e = new Error("Prebuilt binaries for Linux x64 require v2 microarchitecture");
      e.code = "Unsupported CPU", kt.push(e), Q = null;
    }
  } catch (e) {
    kt.push(e);
  }
if (!Q) {
  const [e, t, n] = ["linux", "darwin", "win32"].map((s) => at.startsWith(s)), r = [`Could not load the "sharp" module using the ${at} runtime`];
  kt.forEach((s) => {
    s.code.endsWith("MODULE_NOT_FOUND") || r.push(`${s.code}: ${s.message}`);
  });
  const i = kt.map((s) => s.message).join(" ");
  if (r.push("Possible solutions:"), Lc()) {
    const { found: s, expected: a } = Lc();
    r.push("- Please upgrade Node.js:", `    Found ${s}`, `    Requires ${a}`);
  } else if (n2.includes(at)) {
    const [s, a] = at.split("-"), c = s.endsWith("musl") ? " --libc=musl" : "";
    r.push(
      "- Ensure optional dependencies can be installed:",
      "    npm install --include=optional sharp",
      "- Ensure your package manager supports multi-platform installation:",
      "    See https://sharp.pixelplumbing.com/install#cross-platform",
      "- Add platform-specific dependencies:",
      `    npm install --os=${s.replace("musl", "")}${c} --cpu=${a} sharp`
    );
  } else
    r.push(
      `- Manually install libvips >= ${r2}`,
      "    See https://sharp.pixelplumbing.com/install#building-from-source",
      "- Add WebAssembly-based dependencies:",
      "    npm install sharp @img/sharp-wasm32"
    );
  if (e && /(symbol not found|CXXABI_)/i.test(i))
    try {
      const { config: s } = me(`@img/sharp-libvips-${at}/package`), a = `${hs.familySync()} ${hs.versionSync()}`, c = `${s.musl ? "musl" : "glibc"} ${s.musl || s.glibc}`;
      r.push("- Update your OS:", `    Found ${a}`, `    Requires ${c}`);
    } catch {
    }
  throw e && /\/snap\/core[0-9]{2}/.test(i) && r.push("- Remove the Node.js Snap, which does not support native modules", "    snap remove node"), t && /Incompatible library version/.test(i) && r.push("- Update Homebrew:", "    brew update && brew upgrade vips"), kt.some((s) => s.code === "ERR_DLOPEN_DISABLED") && r.push("- Run Node.js without using the --no-addons flag"), n && /The specified procedure could not be found/.test(i) && r.push(
    "- Using the canvas package on Windows?",
    "    See https://sharp.pixelplumbing.com/install#canvas-and-windows",
    "- Check for outdated versions of sharp in the dependency tree:",
    "    npm ls sharp"
  ), r.push("- Consult the installation documentation:", "    See https://sharp.pixelplumbing.com/install"), new Error(r.join(`
`));
}
const Z = Q;
/*!
  Copyright 2013 Lovell Fuller and others.
  SPDX-License-Identifier: Apache-2.0
*/
const i2 = ed.debuglog("sharp"), s2 = (e) => {
  Se.queue.emit("change", e);
}, Se = function(e, t) {
  if (arguments.length === 1 && !o.defined(e))
    throw new Error("Invalid input");
  return this instanceof Se ? (Ts.Duplex.call(this), this.options = {
    // resize options
    topOffsetPre: -1,
    leftOffsetPre: -1,
    widthPre: -1,
    heightPre: -1,
    topOffsetPost: -1,
    leftOffsetPost: -1,
    widthPost: -1,
    heightPost: -1,
    width: -1,
    height: -1,
    canvas: "crop",
    position: 0,
    resizeBackground: [0, 0, 0, 255],
    angle: 0,
    rotationAngle: 0,
    rotationBackground: [0, 0, 0, 255],
    rotateBefore: !1,
    orientBefore: !1,
    flip: !1,
    flop: !1,
    extendTop: 0,
    extendBottom: 0,
    extendLeft: 0,
    extendRight: 0,
    extendBackground: [0, 0, 0, 255],
    extendWith: "background",
    withoutEnlargement: !1,
    withoutReduction: !1,
    affineMatrix: [],
    affineBackground: [0, 0, 0, 255],
    affineIdx: 0,
    affineIdy: 0,
    affineOdx: 0,
    affineOdy: 0,
    affineInterpolator: this.constructor.interpolators.bilinear,
    kernel: "lanczos3",
    fastShrinkOnLoad: !0,
    // operations
    tint: [-1, 0, 0, 0],
    flatten: !1,
    flattenBackground: [0, 0, 0],
    unflatten: !1,
    negate: !1,
    negateAlpha: !0,
    medianSize: 0,
    blurSigma: 0,
    precision: "integer",
    minAmpl: 0.2,
    sharpenSigma: 0,
    sharpenM1: 1,
    sharpenM2: 2,
    sharpenX1: 2,
    sharpenY2: 10,
    sharpenY3: 20,
    threshold: 0,
    thresholdGrayscale: !0,
    trimBackground: [],
    trimThreshold: -1,
    trimLineArt: !1,
    trimMargin: 0,
    dilateWidth: 0,
    erodeWidth: 0,
    gamma: 0,
    gammaOut: 0,
    greyscale: !1,
    normalise: !1,
    normaliseLower: 1,
    normaliseUpper: 99,
    claheWidth: 0,
    claheHeight: 0,
    claheMaxSlope: 3,
    brightness: 1,
    saturation: 1,
    hue: 0,
    lightness: 0,
    booleanBufferIn: null,
    booleanFileIn: "",
    joinChannelIn: [],
    extractChannel: -1,
    removeAlpha: !1,
    ensureAlpha: -1,
    colourspace: "srgb",
    colourspacePipeline: "last",
    composite: [],
    // output
    fileOut: "",
    formatOut: "input",
    streamOut: !1,
    typedArrayOut: !1,
    keepMetadata: 0,
    withMetadataOrientation: -1,
    withMetadataDensity: 0,
    withIccProfile: "",
    withExif: {},
    withExifMerge: !0,
    withXmp: "",
    keepGainMap: !1,
    withGainMap: !1,
    resolveWithObject: !1,
    loop: -1,
    delay: [],
    // output format
    jpegQuality: 80,
    jpegProgressive: !1,
    jpegChromaSubsampling: "4:2:0",
    jpegTrellisQuantisation: !1,
    jpegOvershootDeringing: !1,
    jpegOptimiseScans: !1,
    jpegOptimiseCoding: !0,
    jpegQuantisationTable: 0,
    pngProgressive: !1,
    pngCompressionLevel: 6,
    pngAdaptiveFiltering: !1,
    pngPalette: !1,
    pngQuality: 100,
    pngEffort: 7,
    pngBitdepth: 8,
    pngDither: 1,
    jp2Quality: 80,
    jp2TileHeight: 512,
    jp2TileWidth: 512,
    jp2Lossless: !1,
    jp2ChromaSubsampling: "4:4:4",
    webpQuality: 80,
    webpAlphaQuality: 100,
    webpLossless: !1,
    webpNearLossless: !1,
    webpSmartSubsample: !1,
    webpSmartDeblock: !1,
    webpPreset: "default",
    webpEffort: 4,
    webpMinSize: !1,
    webpMixed: !1,
    webpExact: !1,
    gifBitdepth: 8,
    gifEffort: 7,
    gifDither: 1,
    gifInterFrameMaxError: 0,
    gifInterPaletteMaxError: 3,
    gifKeepDuplicateFrames: !1,
    gifReuse: !0,
    gifProgressive: !1,
    tiffQuality: 80,
    tiffCompression: "jpeg",
    tiffBigtiff: !1,
    tiffPredictor: "horizontal",
    tiffPyramid: !1,
    tiffMiniswhite: !1,
    tiffBitdepth: 0,
    tiffTile: !1,
    tiffTileHeight: 256,
    tiffTileWidth: 256,
    tiffXres: 1,
    tiffYres: 1,
    tiffResolutionUnit: "inch",
    heifQuality: 50,
    heifLossless: !1,
    heifCompression: "av1",
    heifEffort: 4,
    heifChromaSubsampling: "4:4:4",
    heifBitdepth: 8,
    heifTune: "auto",
    jxlDistance: 1,
    jxlDecodingTier: 0,
    jxlEffort: 7,
    jxlLossless: !1,
    rawDepth: "uchar",
    tileSize: 256,
    tileOverlap: 0,
    tileContainer: "fs",
    tileLayout: "dz",
    tileFormat: "last",
    tileDepth: "last",
    tileAngle: 0,
    tileSkipBlanks: -1,
    tileBackground: [255, 255, 255, 255],
    tileCentre: !1,
    tileId: "https://example.com/iiif",
    tileBasename: "",
    timeoutSeconds: 0,
    linearA: [],
    linearB: [],
    pdfBackground: [255, 255, 255, 255],
    // Function to notify of libvips warnings
    debuglog: (n) => {
      this.emit("warning", n), i2(n);
    },
    // Function to notify of queue length changes
    queueListener: s2
  }, this.options.input = this._createInputDescriptor(e, t, { allowStream: !0 }), this) : new Se(e, t);
};
Object.setPrototypeOf(Se.prototype, Ts.Duplex.prototype);
Object.setPrototypeOf(Se, Ts.Duplex);
function a2() {
  const e = this.constructor.call(), { debuglog: t, queueListener: n, ...r } = this.options;
  return e.options = structuredClone(r), e.options.debuglog = t, e.options.queueListener = n, this._isStreamInput() && this.on("finish", () => {
    this._flattenBufferIn(), e.options.input.buffer = this.options.input.buffer, e.emit("finish");
  }), e;
}
Object.assign(Se.prototype, { clone: a2 });
/*!
  Copyright 2013 Lovell Fuller and others.
  SPDX-License-Identifier: Apache-2.0
*/
const o2 = {
  left: "low",
  top: "low",
  low: "low",
  center: "centre",
  centre: "centre",
  right: "high",
  bottom: "high",
  high: "high"
}, c2 = [
  // Limits and error handling
  "failOn",
  "limitInputPixels",
  "limitInputChannels",
  "unlimited",
  // Format-generic
  "animated",
  "autoOrient",
  "density",
  "ignoreIcc",
  "page",
  "pages",
  "sequentialRead",
  // Format-specific
  "jp2",
  "openSlide",
  "pdf",
  "raw",
  "svg",
  "tiff",
  // Deprecated
  "openSlideLevel",
  "pdfBackground",
  "tiffSubifd"
];
function _p(e) {
  const t = c2.filter((n) => o.defined(e[n])).map((n) => [n, e[n]]);
  return t.length ? Object.fromEntries(t) : void 0;
}
function l2(e, t, n) {
  const r = {
    autoOrient: !1,
    failOn: "warning",
    limitInputPixels: 268402689,
    limitInputChannels: 5,
    ignoreIcc: !1,
    unlimited: !1,
    sequentialRead: !0
  };
  if (o.string(e))
    r.file = e;
  else if (o.buffer(e)) {
    if (e.length === 0)
      throw Error("Input Buffer is empty");
    r.buffer = e;
  } else if (o.arrayBuffer(e)) {
    if (e.byteLength === 0)
      throw Error("Input bit Array is empty");
    r.buffer = Buffer.from(e, 0, e.byteLength);
  } else if (o.typedArray(e)) {
    if (e.length === 0)
      throw Error("Input Bit Array is empty");
    r.buffer = Buffer.from(e.buffer, e.byteOffset, e.byteLength);
  } else if (o.plainObject(e) && !o.defined(t))
    t = e, _p(t) && (r.buffer = []);
  else if (!o.defined(e) && !o.defined(t) && o.object(n) && n.allowStream)
    r.buffer = [];
  else if (Array.isArray(e))
    if (e.length > 1)
      if (!this.options.joining)
        this.options.joining = !0, this.options.join = e.map((i) => this._createInputDescriptor(i));
      else
        throw new Error("Recursive join is unsupported");
    else
      throw new Error("Expected at least two images to join");
  else
    throw new Error(`Unsupported input '${e}' of type ${typeof e}${o.defined(t) ? ` when also providing options of type ${typeof t}` : ""}`);
  if (o.object(t)) {
    if (o.defined(t.failOn))
      if (o.string(t.failOn) && o.inArray(t.failOn, ["none", "truncated", "error", "warning"]))
        r.failOn = t.failOn;
      else
        throw o.invalidParameterError("failOn", "one of: none, truncated, error, warning", t.failOn);
    if (o.defined(t.autoOrient))
      if (o.bool(t.autoOrient))
        r.autoOrient = t.autoOrient;
      else
        throw o.invalidParameterError("autoOrient", "boolean", t.autoOrient);
    if (o.defined(t.density))
      if (o.number(t.density) && o.inRange(t.density, 1, 1e5))
        r.density = t.density;
      else
        throw o.invalidParameterError("density", "number between 1 and 100000", t.density);
    if (o.defined(t.ignoreIcc))
      if (o.bool(t.ignoreIcc))
        r.ignoreIcc = t.ignoreIcc;
      else
        throw o.invalidParameterError("ignoreIcc", "boolean", t.ignoreIcc);
    if (o.defined(t.limitInputPixels))
      if (o.bool(t.limitInputPixels))
        r.limitInputPixels = t.limitInputPixels ? 16383 ** 2 : 0;
      else if (o.integer(t.limitInputPixels) && o.inRange(t.limitInputPixels, 0, Number.MAX_SAFE_INTEGER))
        r.limitInputPixels = t.limitInputPixels;
      else
        throw o.invalidParameterError("limitInputPixels", "positive integer", t.limitInputPixels);
    if (o.defined(t.limitInputChannels))
      if (o.bool(t.limitInputChannels))
        r.limitInputChannels = t.limitInputChannels ? 5 : 0;
      else if (o.integer(t.limitInputChannels) && o.inRange(t.limitInputChannels, 0, Number.MAX_SAFE_INTEGER))
        r.limitInputChannels = t.limitInputChannels;
      else
        throw o.invalidParameterError("limitInputChannels", "positive integer", t.limitInputChannels);
    if (o.defined(t.unlimited))
      if (o.bool(t.unlimited))
        r.unlimited = t.unlimited;
      else
        throw o.invalidParameterError("unlimited", "boolean", t.unlimited);
    if (o.defined(t.sequentialRead))
      if (o.bool(t.sequentialRead))
        r.sequentialRead = t.sequentialRead;
      else
        throw o.invalidParameterError("sequentialRead", "boolean", t.sequentialRead);
    if (o.defined(t.raw)) {
      if (o.object(t.raw) && o.integer(t.raw.width) && t.raw.width > 0 && o.integer(t.raw.height) && t.raw.height > 0 && o.integer(t.raw.channels) && o.inRange(t.raw.channels, 1, 4))
        switch (r.rawWidth = t.raw.width, r.rawHeight = t.raw.height, r.rawChannels = t.raw.channels, e.constructor) {
          case Uint8Array:
          case Uint8ClampedArray:
            r.rawDepth = "uchar";
            break;
          case Int8Array:
            r.rawDepth = "char";
            break;
          case Uint16Array:
            r.rawDepth = "ushort";
            break;
          case Int16Array:
            r.rawDepth = "short";
            break;
          case Uint32Array:
            r.rawDepth = "uint";
            break;
          case Int32Array:
            r.rawDepth = "int";
            break;
          case Float32Array:
            r.rawDepth = "float";
            break;
          case Float64Array:
            r.rawDepth = "double";
            break;
          default:
            r.rawDepth = "uchar";
            break;
        }
      else
        throw new Error("Expected width, height and channels for raw pixel input");
      if (r.rawPremultiplied = !1, o.defined(t.raw.premultiplied))
        if (o.bool(t.raw.premultiplied))
          r.rawPremultiplied = t.raw.premultiplied;
        else
          throw o.invalidParameterError("raw.premultiplied", "boolean", t.raw.premultiplied);
      if (r.rawPageHeight = 0, o.defined(t.raw.pageHeight))
        if (o.integer(t.raw.pageHeight) && t.raw.pageHeight > 0 && t.raw.pageHeight <= t.raw.height) {
          if (t.raw.height % t.raw.pageHeight !== 0)
            throw new Error(`Expected raw.height ${t.raw.height} to be a multiple of raw.pageHeight ${t.raw.pageHeight}`);
          r.rawPageHeight = t.raw.pageHeight;
        } else
          throw o.invalidParameterError("raw.pageHeight", "positive integer", t.raw.pageHeight);
    }
    if (o.defined(t.animated))
      if (o.bool(t.animated))
        r.pages = t.animated ? -1 : 1;
      else
        throw o.invalidParameterError("animated", "boolean", t.animated);
    if (o.defined(t.pages))
      if (o.integer(t.pages) && o.inRange(t.pages, -1, 1e5))
        r.pages = t.pages;
      else
        throw o.invalidParameterError("pages", "integer between -1 and 100000", t.pages);
    if (o.defined(t.page))
      if (o.integer(t.page) && o.inRange(t.page, 0, 1e5))
        r.page = t.page;
      else
        throw o.invalidParameterError("page", "integer between 0 and 100000", t.page);
    if (o.object(t.openSlide) && o.defined(t.openSlide.level))
      if (o.integer(t.openSlide.level) && o.inRange(t.openSlide.level, 0, 256))
        r.openSlideLevel = t.openSlide.level;
      else
        throw o.invalidParameterError("openSlide.level", "integer between 0 and 256", t.openSlide.level);
    else if (o.defined(t.level))
      if (o.integer(t.level) && o.inRange(t.level, 0, 256))
        r.openSlideLevel = t.level;
      else
        throw o.invalidParameterError("level", "integer between 0 and 256", t.level);
    if (o.object(t.tiff) && o.defined(t.tiff.subifd))
      if (o.integer(t.tiff.subifd) && o.inRange(t.tiff.subifd, -1, 1e5))
        r.tiffSubifd = t.tiff.subifd;
      else
        throw o.invalidParameterError("tiff.subifd", "integer between -1 and 100000", t.tiff.subifd);
    else if (o.defined(t.subifd))
      if (o.integer(t.subifd) && o.inRange(t.subifd, -1, 1e5))
        r.tiffSubifd = t.subifd;
      else
        throw o.invalidParameterError("subifd", "integer between -1 and 100000", t.subifd);
    if (o.object(t.svg)) {
      if (o.defined(t.svg.stylesheet))
        if (o.string(t.svg.stylesheet))
          r.svgStylesheet = t.svg.stylesheet;
        else
          throw o.invalidParameterError("svg.stylesheet", "string", t.svg.stylesheet);
      if (o.defined(t.svg.highBitdepth))
        if (o.bool(t.svg.highBitdepth))
          r.svgHighBitdepth = t.svg.highBitdepth;
        else
          throw o.invalidParameterError("svg.highBitdepth", "boolean", t.svg.highBitdepth);
    }
    if (o.object(t.pdf) && o.defined(t.pdf.background) ? r.pdfBackground = this._getBackgroundColourOption(t.pdf.background) : o.defined(t.pdfBackground) && (r.pdfBackground = this._getBackgroundColourOption(t.pdfBackground)), o.object(t.jp2) && o.defined(t.jp2.oneshot))
      if (o.bool(t.jp2.oneshot))
        r.jp2Oneshot = t.jp2.oneshot;
      else
        throw o.invalidParameterError("jp2.oneshot", "boolean", t.jp2.oneshot);
    if (o.defined(t.create))
      if (o.object(t.create) && o.integer(t.create.width) && t.create.width > 0 && o.integer(t.create.height) && t.create.height > 0 && o.integer(t.create.channels)) {
        if (r.createWidth = t.create.width, r.createHeight = t.create.height, r.createChannels = t.create.channels, r.createPageHeight = 0, o.defined(t.create.pageHeight))
          if (o.integer(t.create.pageHeight) && t.create.pageHeight > 0 && t.create.pageHeight <= t.create.height) {
            if (t.create.height % t.create.pageHeight !== 0)
              throw new Error(`Expected create.height ${t.create.height} to be a multiple of create.pageHeight ${t.create.pageHeight}`);
            r.createPageHeight = t.create.pageHeight;
          } else
            throw o.invalidParameterError("create.pageHeight", "positive integer", t.create.pageHeight);
        if (o.defined(t.create.noise)) {
          if (!o.object(t.create.noise))
            throw new Error("Expected noise to be an object");
          if (t.create.noise.type !== "gaussian")
            throw new Error("Only gaussian noise is supported at the moment");
          if (r.createNoiseType = t.create.noise.type, !o.inRange(t.create.channels, 1, 4))
            throw o.invalidParameterError("create.channels", "number between 1 and 4", t.create.channels);
          if (r.createNoiseMean = 128, o.defined(t.create.noise.mean))
            if (o.number(t.create.noise.mean) && o.inRange(t.create.noise.mean, 0, 1e4))
              r.createNoiseMean = t.create.noise.mean;
            else
              throw o.invalidParameterError("create.noise.mean", "number between 0 and 10000", t.create.noise.mean);
          if (r.createNoiseSigma = 30, o.defined(t.create.noise.sigma))
            if (o.number(t.create.noise.sigma) && o.inRange(t.create.noise.sigma, 0, 1e4))
              r.createNoiseSigma = t.create.noise.sigma;
            else
              throw o.invalidParameterError("create.noise.sigma", "number between 0 and 10000", t.create.noise.sigma);
        } else if (o.defined(t.create.background)) {
          if (!o.inRange(t.create.channels, 3, 4))
            throw o.invalidParameterError("create.channels", "number between 3 and 4", t.create.channels);
          r.createBackground = this._getBackgroundColourOption(t.create.background);
        } else
          throw new Error("Expected valid noise or background to create a new input image");
        delete r.buffer;
      } else
        throw new Error("Expected valid width, height and channels to create a new input image");
    if (o.defined(t.text))
      if (o.object(t.text) && o.string(t.text.text)) {
        if (r.textValue = t.text.text, o.defined(t.text.height) && o.defined(t.text.dpi))
          throw new Error("Expected only one of dpi or height");
        if (o.defined(t.text.font))
          if (o.string(t.text.font))
            r.textFont = t.text.font;
          else
            throw o.invalidParameterError("text.font", "string", t.text.font);
        if (o.defined(t.text.fontfile))
          if (o.string(t.text.fontfile))
            r.textFontfile = t.text.fontfile;
          else
            throw o.invalidParameterError("text.fontfile", "string", t.text.fontfile);
        if (o.defined(t.text.width))
          if (o.integer(t.text.width) && t.text.width > 0)
            r.textWidth = t.text.width;
          else
            throw o.invalidParameterError("text.width", "positive integer", t.text.width);
        if (o.defined(t.text.height))
          if (o.integer(t.text.height) && t.text.height > 0)
            r.textHeight = t.text.height;
          else
            throw o.invalidParameterError("text.height", "positive integer", t.text.height);
        if (o.defined(t.text.align))
          if (o.string(t.text.align) && o.string(this.constructor.align[t.text.align]))
            r.textAlign = this.constructor.align[t.text.align];
          else
            throw o.invalidParameterError("text.align", "valid alignment", t.text.align);
        if (o.defined(t.text.justify))
          if (o.bool(t.text.justify))
            r.textJustify = t.text.justify;
          else
            throw o.invalidParameterError("text.justify", "boolean", t.text.justify);
        if (o.defined(t.text.dpi))
          if (o.integer(t.text.dpi) && o.inRange(t.text.dpi, 1, 1e6))
            r.textDpi = t.text.dpi;
          else
            throw o.invalidParameterError("text.dpi", "integer between 1 and 1000000", t.text.dpi);
        if (o.defined(t.text.rgba))
          if (o.bool(t.text.rgba))
            r.textRgba = t.text.rgba;
          else
            throw o.invalidParameterError("text.rgba", "bool", t.text.rgba);
        if (o.defined(t.text.spacing))
          if (o.integer(t.text.spacing) && o.inRange(t.text.spacing, -1e6, 1e6))
            r.textSpacing = t.text.spacing;
          else
            throw o.invalidParameterError("text.spacing", "integer between -1000000 and 1000000", t.text.spacing);
        if (o.defined(t.text.wrap))
          if (o.string(t.text.wrap) && o.inArray(t.text.wrap, ["word", "char", "word-char", "none"]))
            r.textWrap = t.text.wrap;
          else
            throw o.invalidParameterError("text.wrap", "one of: word, char, word-char, none", t.text.wrap);
        delete r.buffer;
      } else
        throw new Error("Expected a valid string to create an image with text.");
    if (o.defined(t.join))
      if (o.defined(this.options.join)) {
        if (o.defined(t.join.animated))
          if (o.bool(t.join.animated))
            r.joinAnimated = t.join.animated;
          else
            throw o.invalidParameterError("join.animated", "boolean", t.join.animated);
        if (o.defined(t.join.across))
          if (o.integer(t.join.across) && o.inRange(t.join.across, 1, 1e6))
            r.joinAcross = t.join.across;
          else
            throw o.invalidParameterError("join.across", "integer between 1 and 100000", t.join.across);
        if (o.defined(t.join.shim))
          if (o.integer(t.join.shim) && o.inRange(t.join.shim, 0, 1e6))
            r.joinShim = t.join.shim;
          else
            throw o.invalidParameterError("join.shim", "integer between 0 and 100000", t.join.shim);
        if (o.defined(t.join.background) && (r.joinBackground = this._getBackgroundColourOption(t.join.background)), o.defined(t.join.halign))
          if (o.string(t.join.halign) && o.string(this.constructor.align[t.join.halign]))
            r.joinHalign = this.constructor.align[t.join.halign];
          else
            throw o.invalidParameterError("join.halign", "valid alignment", t.join.halign);
        if (o.defined(t.join.valign))
          if (o.string(t.join.valign) && o.string(this.constructor.align[t.join.valign]))
            r.joinValign = this.constructor.align[t.join.valign];
          else
            throw o.invalidParameterError("join.valign", "valid alignment", t.join.valign);
      } else
        throw new Error("Expected input to be an array of images to join");
  } else if (o.defined(t))
    throw new Error(`Invalid input options ${t}`);
  return r;
}
function u2(e, t, n) {
  Array.isArray(this.options.input.buffer) ? o.buffer(e) ? (this.options.input.buffer.length === 0 && this.on("finish", () => {
    this.streamInFinished = !0;
  }), this.options.input.buffer.push(e), n()) : n(new Error("Non-Buffer data on Writable Stream")) : n(new Error("Unexpected data on Writable Stream"));
}
function p2() {
  this._isStreamInput() && (this.options.input.buffer = Buffer.concat(this.options.input.buffer));
}
function d2() {
  return Array.isArray(this.options.input.buffer);
}
function f2(e) {
  const t = Error();
  return o.fn(e) ? (this._isStreamInput() ? this.on("finish", () => {
    this._flattenBufferIn(), Z.metadata(this.options, (n, r) => {
      n ? e(o.nativeError(n, t)) : e(null, r);
    });
  }) : Z.metadata(this.options, (n, r) => {
    n ? e(o.nativeError(n, t)) : e(null, r);
  }), this) : this._isStreamInput() ? new Promise((n, r) => {
    const i = () => {
      this._flattenBufferIn(), Z.metadata(this.options, (s, a) => {
        s ? r(o.nativeError(s, t)) : n(a);
      });
    };
    this.writableFinished ? i() : this.once("finish", i);
  }) : new Promise((n, r) => {
    Z.metadata(this.options, (i, s) => {
      i ? r(o.nativeError(i, t)) : n(s);
    });
  });
}
function m2(e) {
  const t = Error();
  return o.fn(e) ? (this._isStreamInput() ? this.on("finish", () => {
    this._flattenBufferIn(), Z.stats(this.options, (n, r) => {
      n ? e(o.nativeError(n, t)) : e(null, r);
    });
  }) : Z.stats(this.options, (n, r) => {
    n ? e(o.nativeError(n, t)) : e(null, r);
  }), this) : this._isStreamInput() ? new Promise((n, r) => {
    this.on("finish", function() {
      this._flattenBufferIn(), Z.stats(this.options, (i, s) => {
        i ? r(o.nativeError(i, t)) : n(s);
      });
    });
  }) : new Promise((n, r) => {
    Z.stats(this.options, (i, s) => {
      i ? r(o.nativeError(i, t)) : n(s);
    });
  });
}
const h2 = (e) => {
  Object.assign(e.prototype, {
    // Private
    _inputOptionsFromObject: _p,
    _createInputDescriptor: l2,
    _write: u2,
    _flattenBufferIn: p2,
    _isStreamInput: d2,
    // Public
    metadata: f2,
    stats: m2
  }), e.align = o2;
};
/*!
  Copyright 2013 Lovell Fuller and others.
  SPDX-License-Identifier: Apache-2.0
*/
const Sp = {
  center: 0,
  centre: 0,
  north: 1,
  east: 2,
  south: 3,
  west: 4,
  northeast: 5,
  southeast: 6,
  southwest: 7,
  northwest: 8
}, Ap = {
  top: 1,
  right: 2,
  bottom: 3,
  left: 4,
  "right top": 5,
  "right bottom": 6,
  "left bottom": 7,
  "left top": 8
}, Dc = {
  background: "background",
  copy: "copy",
  repeat: "repeat",
  mirror: "mirror"
}, kp = {
  entropy: 16,
  attention: 17
}, bs = {
  nearest: "nearest",
  linear: "linear",
  cubic: "cubic",
  mitchell: "mitchell",
  lanczos2: "lanczos2",
  lanczos3: "lanczos3",
  mks2013: "mks2013",
  mks2021: "mks2021"
}, g2 = {
  contain: "contain",
  cover: "cover",
  fill: "fill",
  inside: "inside",
  outside: "outside"
}, v2 = {
  contain: "embed",
  cover: "crop",
  fill: "ignore_aspect",
  inside: "max",
  outside: "min"
};
function ba(e) {
  return e.angle % 360 !== 0 || e.rotationAngle !== 0;
}
function Ur(e) {
  return e.width !== -1 || e.height !== -1;
}
function b2(e, t, n) {
  if (Ur(this.options) && this.options.debuglog("ignoring previous resize options"), this.options.widthPost !== -1 && this.options.debuglog("operation order will be: extract, resize, extract"), o.defined(e))
    if (o.object(e) && !o.defined(n))
      n = e;
    else if (o.integer(e) && e > 0)
      this.options.width = e;
    else
      throw o.invalidParameterError("width", "positive integer", e);
  else
    this.options.width = -1;
  if (o.defined(t))
    if (o.integer(t) && t > 0)
      this.options.height = t;
    else
      throw o.invalidParameterError("height", "positive integer", t);
  else
    this.options.height = -1;
  if (o.object(n)) {
    if (o.defined(n.width))
      if (o.integer(n.width) && n.width > 0)
        this.options.width = n.width;
      else
        throw o.invalidParameterError("width", "positive integer", n.width);
    if (o.defined(n.height))
      if (o.integer(n.height) && n.height > 0)
        this.options.height = n.height;
      else
        throw o.invalidParameterError("height", "positive integer", n.height);
    if (o.defined(n.fit)) {
      const r = v2[n.fit];
      if (o.string(r))
        this.options.canvas = r;
      else
        throw o.invalidParameterError("fit", "valid fit", n.fit);
    }
    if (o.defined(n.position)) {
      const r = o.integer(n.position) ? n.position : kp[n.position] || Ap[n.position] || Sp[n.position];
      if (o.integer(r) && (o.inRange(r, 0, 8) || o.inRange(r, 16, 17)))
        this.options.position = r;
      else
        throw o.invalidParameterError("position", "valid position/gravity/strategy", n.position);
    }
    if (this._setBackgroundColourOption("resizeBackground", n.background), o.defined(n.kernel))
      if (o.string(bs[n.kernel]))
        this.options.kernel = bs[n.kernel];
      else
        throw o.invalidParameterError("kernel", "valid kernel name", n.kernel);
    o.defined(n.withoutEnlargement) && this._setBooleanOption("withoutEnlargement", n.withoutEnlargement), o.defined(n.withoutReduction) && this._setBooleanOption("withoutReduction", n.withoutReduction), o.defined(n.fastShrinkOnLoad) && this._setBooleanOption("fastShrinkOnLoad", n.fastShrinkOnLoad);
  }
  return ba(this.options) && Ur(this.options) && (this.options.rotateBefore = !0), this;
}
function x2(e) {
  if (o.integer(e) && e > 0)
    this.options.extendTop = e, this.options.extendBottom = e, this.options.extendLeft = e, this.options.extendRight = e;
  else if (o.object(e)) {
    if (o.defined(e.top))
      if (o.integer(e.top) && e.top >= 0)
        this.options.extendTop = e.top;
      else
        throw o.invalidParameterError("top", "positive integer", e.top);
    if (o.defined(e.bottom))
      if (o.integer(e.bottom) && e.bottom >= 0)
        this.options.extendBottom = e.bottom;
      else
        throw o.invalidParameterError("bottom", "positive integer", e.bottom);
    if (o.defined(e.left))
      if (o.integer(e.left) && e.left >= 0)
        this.options.extendLeft = e.left;
      else
        throw o.invalidParameterError("left", "positive integer", e.left);
    if (o.defined(e.right))
      if (o.integer(e.right) && e.right >= 0)
        this.options.extendRight = e.right;
      else
        throw o.invalidParameterError("right", "positive integer", e.right);
    if (this._setBackgroundColourOption("extendBackground", e.background), o.defined(e.extendWith))
      if (o.string(Dc[e.extendWith]))
        this.options.extendWith = Dc[e.extendWith];
      else
        throw o.invalidParameterError("extendWith", "one of: background, copy, repeat, mirror", e.extendWith);
  } else
    throw o.invalidParameterError("extend", "integer or object", e);
  return this;
}
function y2(e) {
  const t = Ur(this.options) || this.options.widthPre !== -1 ? "Post" : "Pre";
  return this.options[`width${t}`] !== -1 && this.options.debuglog("ignoring previous extract options"), ["left", "top", "width", "height"].forEach(function(n) {
    const r = e[n];
    if (o.integer(r) && r >= 0)
      this.options[n + (n === "left" || n === "top" ? "Offset" : "") + t] = r;
    else
      throw o.invalidParameterError(n, "integer", r);
  }, this), ba(this.options) && !Ur(this.options) && (this.options.widthPre === -1 || this.options.widthPost === -1) && (this.options.rotateBefore = !0), this.options.input.autoOrient && (this.options.orientBefore = !0), this;
}
function w2(e) {
  if (this.options.trimThreshold = 10, o.defined(e))
    if (o.object(e)) {
      if (o.defined(e.background) && this._setBackgroundColourOption("trimBackground", e.background), o.defined(e.threshold))
        if (o.number(e.threshold) && e.threshold >= 0)
          this.options.trimThreshold = e.threshold;
        else
          throw o.invalidParameterError("threshold", "positive number", e.threshold);
      if (o.defined(e.lineArt) && this._setBooleanOption("trimLineArt", e.lineArt), o.defined(e.margin))
        if (o.integer(e.margin) && e.margin >= 0)
          this.options.trimMargin = e.margin;
        else
          throw o.invalidParameterError("margin", "positive integer", e.margin);
    } else
      throw o.invalidParameterError("trim", "object", e);
  return ba(this.options) && (this.options.rotateBefore = !0), this;
}
const E2 = (e) => {
  Object.assign(e.prototype, {
    resize: b2,
    extend: x2,
    extract: y2,
    trim: w2
  }), e.gravity = Sp, e.strategy = kp, e.kernel = bs, e.fit = g2, e.position = Ap;
};
/*!
  Copyright 2013 Lovell Fuller and others.
  SPDX-License-Identifier: Apache-2.0
*/
const xs = {
  clear: "clear",
  source: "source",
  over: "over",
  in: "in",
  out: "out",
  atop: "atop",
  dest: "dest",
  "dest-over": "dest-over",
  "dest-in": "dest-in",
  "dest-out": "dest-out",
  "dest-atop": "dest-atop",
  xor: "xor",
  add: "add",
  saturate: "saturate",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  darken: "darken",
  lighten: "lighten",
  "colour-dodge": "colour-dodge",
  "color-dodge": "colour-dodge",
  "colour-burn": "colour-burn",
  "color-burn": "colour-burn",
  "hard-light": "hard-light",
  "soft-light": "soft-light",
  difference: "difference",
  exclusion: "exclusion"
};
function _2(e) {
  if (!Array.isArray(e))
    throw o.invalidParameterError("images to composite", "array", e);
  return this.options.composite = e.map((t) => {
    if (!o.object(t))
      throw o.invalidParameterError("image to composite", "object", t);
    const n = this._inputOptionsFromObject(t), r = {
      input: this._createInputDescriptor(t.input, n, { allowStream: !1 }),
      blend: "over",
      tile: !1,
      left: 0,
      top: 0,
      hasOffset: !1,
      gravity: 0,
      premultiplied: !1
    };
    if (o.defined(t.blend))
      if (o.string(xs[t.blend]))
        r.blend = xs[t.blend];
      else
        throw o.invalidParameterError("blend", "valid blend name", t.blend);
    if (o.defined(t.tile))
      if (o.bool(t.tile))
        r.tile = t.tile;
      else
        throw o.invalidParameterError("tile", "boolean", t.tile);
    if (o.defined(t.left))
      if (o.integer(t.left))
        r.left = t.left;
      else
        throw o.invalidParameterError("left", "integer", t.left);
    if (o.defined(t.top))
      if (o.integer(t.top))
        r.top = t.top;
      else
        throw o.invalidParameterError("top", "integer", t.top);
    if (o.defined(t.top) !== o.defined(t.left))
      throw new Error("Expected both left and top to be set");
    if (r.hasOffset = o.integer(t.top) && o.integer(t.left), o.defined(t.gravity))
      if (o.integer(t.gravity) && o.inRange(t.gravity, 0, 8))
        r.gravity = t.gravity;
      else if (o.string(t.gravity) && o.integer(this.constructor.gravity[t.gravity]))
        r.gravity = this.constructor.gravity[t.gravity];
      else
        throw o.invalidParameterError("gravity", "valid gravity", t.gravity);
    if (o.defined(t.premultiplied))
      if (o.bool(t.premultiplied))
        r.premultiplied = t.premultiplied;
      else
        throw o.invalidParameterError("premultiplied", "boolean", t.premultiplied);
    return r;
  }), this;
}
const S2 = (e) => {
  e.prototype.composite = _2, e.blend = xs;
};
/*!
  Copyright 2013 Lovell Fuller and others.
  SPDX-License-Identifier: Apache-2.0
*/
const zc = {
  integer: "integer",
  float: "float",
  approximate: "approximate"
};
function A2(e, t) {
  if (!o.defined(e))
    return this.autoOrient();
  if ((this.options.angle || this.options.rotationAngle) && (this.options.debuglog("ignoring previous rotate options"), this.options.angle = 0, this.options.rotationAngle = 0), o.integer(e) && !(e % 90))
    this.options.angle = e;
  else if (o.number(e))
    this.options.rotationAngle = e, o.object(t) && t.background && this._setBackgroundColourOption("rotationBackground", t.background);
  else
    throw o.invalidParameterError("angle", "numeric", e);
  return this;
}
function k2() {
  return this.options.input.autoOrient = !0, this;
}
function T2(e) {
  return this.options.flip = o.bool(e) ? e : !0, this;
}
function P2(e) {
  return this.options.flop = o.bool(e) ? e : !0, this;
}
function R2(e, t) {
  const n = Array.isArray(e) ? [].concat(...e) : [];
  if (n.length === 4 && n.every(o.number))
    this.options.affineMatrix = n;
  else
    throw o.invalidParameterError("matrix", "1x4 or 2x2 array", e);
  if (o.defined(t))
    if (o.object(t)) {
      if (this._setBackgroundColourOption("affineBackground", t.background), o.defined(t.idx))
        if (o.number(t.idx))
          this.options.affineIdx = t.idx;
        else
          throw o.invalidParameterError("options.idx", "number", t.idx);
      if (o.defined(t.idy))
        if (o.number(t.idy))
          this.options.affineIdy = t.idy;
        else
          throw o.invalidParameterError("options.idy", "number", t.idy);
      if (o.defined(t.odx))
        if (o.number(t.odx))
          this.options.affineOdx = t.odx;
        else
          throw o.invalidParameterError("options.odx", "number", t.odx);
      if (o.defined(t.ody))
        if (o.number(t.ody))
          this.options.affineOdy = t.ody;
        else
          throw o.invalidParameterError("options.ody", "number", t.ody);
      if (o.defined(t.interpolator))
        if (o.inArray(t.interpolator, Object.values(this.constructor.interpolators)))
          this.options.affineInterpolator = t.interpolator;
        else
          throw o.invalidParameterError("options.interpolator", "valid interpolator name", t.interpolator);
    } else
      throw o.invalidParameterError("options", "object", t);
  return this;
}
function j2(e) {
  if (o.plainObject(e)) {
    if (o.number(e.sigma) && o.inRange(e.sigma, 1e-6, 10))
      this.options.sharpenSigma = e.sigma;
    else
      throw o.invalidParameterError("options.sigma", "number between 0.000001 and 10", e.sigma);
    if (o.defined(e.m1))
      if (o.number(e.m1) && o.inRange(e.m1, 0, 1e6))
        this.options.sharpenM1 = e.m1;
      else
        throw o.invalidParameterError("options.m1", "number between 0 and 1000000", e.m1);
    if (o.defined(e.m2))
      if (o.number(e.m2) && o.inRange(e.m2, 0, 1e6))
        this.options.sharpenM2 = e.m2;
      else
        throw o.invalidParameterError("options.m2", "number between 0 and 1000000", e.m2);
    if (o.defined(e.x1))
      if (o.number(e.x1) && o.inRange(e.x1, 0, 1e6))
        this.options.sharpenX1 = e.x1;
      else
        throw o.invalidParameterError("options.x1", "number between 0 and 1000000", e.x1);
    if (o.defined(e.y2))
      if (o.number(e.y2) && o.inRange(e.y2, 0, 1e6))
        this.options.sharpenY2 = e.y2;
      else
        throw o.invalidParameterError("options.y2", "number between 0 and 1000000", e.y2);
    if (o.defined(e.y3))
      if (o.number(e.y3) && o.inRange(e.y3, 0, 1e6))
        this.options.sharpenY3 = e.y3;
      else
        throw o.invalidParameterError("options.y3", "number between 0 and 1000000", e.y3);
  } else
    this.options.sharpenSigma = -1;
  return this;
}
function I2(e) {
  if (!o.defined(e))
    this.options.medianSize = 3;
  else if (o.integer(e) && o.inRange(e, 1, 1e3))
    this.options.medianSize = e;
  else
    throw o.invalidParameterError("size", "integer between 1 and 1000", e);
  return this;
}
function O2(e) {
  let t;
  if (o.number(e))
    t = e;
  else if (o.plainObject(e)) {
    if (!o.number(e.sigma))
      throw o.invalidParameterError("options.sigma", "number between 0.3 and 1000", t);
    if (t = e.sigma, "precision" in e)
      if (o.string(zc[e.precision]))
        this.options.precision = zc[e.precision];
      else
        throw o.invalidParameterError("precision", "one of: integer, float, approximate", e.precision);
    if ("minAmplitude" in e)
      if (o.number(e.minAmplitude) && o.inRange(e.minAmplitude, 1e-3, 1))
        this.options.minAmpl = e.minAmplitude;
      else
        throw o.invalidParameterError("minAmplitude", "number between 0.001 and 1", e.minAmplitude);
  }
  if (!o.defined(e))
    this.options.blurSigma = -1;
  else if (o.bool(e))
    this.options.blurSigma = e ? -1 : 0;
  else if (o.number(t) && o.inRange(t, 0.3, 1e3))
    this.options.blurSigma = t;
  else
    throw o.invalidParameterError("sigma", "number between 0.3 and 1000", t);
  return this;
}
function Tp(e) {
  if (!o.defined(e))
    this.options.dilateWidth = 1;
  else if (o.integer(e) && e > 0)
    this.options.dilateWidth = e;
  else
    throw o.invalidParameterError("dilate", "positive integer", Tp);
  return this;
}
function Pp(e) {
  if (!o.defined(e))
    this.options.erodeWidth = 1;
  else if (o.integer(e) && e > 0)
    this.options.erodeWidth = e;
  else
    throw o.invalidParameterError("erode", "positive integer", Pp);
  return this;
}
function $2(e) {
  return this.options.flatten = o.bool(e) ? e : !0, o.object(e) && this._setBackgroundColourOption("flattenBackground", e.background), this;
}
function N2() {
  return this.options.unflatten = !0, this;
}
function C2(e, t) {
  if (!o.defined(e))
    this.options.gamma = 2.2;
  else if (o.number(e) && o.inRange(e, 1, 3))
    this.options.gamma = e;
  else
    throw o.invalidParameterError("gamma", "number between 1.0 and 3.0", e);
  if (!o.defined(t))
    this.options.gammaOut = this.options.gamma;
  else if (o.number(t) && o.inRange(t, 1, 3))
    this.options.gammaOut = t;
  else
    throw o.invalidParameterError("gammaOut", "number between 1.0 and 3.0", t);
  return this;
}
function L2(e) {
  if (this.options.negate = o.bool(e) ? e : !0, o.plainObject(e) && "alpha" in e)
    if (o.bool(e.alpha))
      this.options.negateAlpha = e.alpha;
    else
      throw o.invalidParameterError("alpha", "should be boolean value", e.alpha);
  return this;
}
function D2(e) {
  if (o.plainObject(e)) {
    if (o.defined(e.lower))
      if (o.number(e.lower) && o.inRange(e.lower, 0, 99))
        this.options.normaliseLower = e.lower;
      else
        throw o.invalidParameterError("lower", "number between 0 and 99", e.lower);
    if (o.defined(e.upper))
      if (o.number(e.upper) && o.inRange(e.upper, 1, 100))
        this.options.normaliseUpper = e.upper;
      else
        throw o.invalidParameterError("upper", "number between 1 and 100", e.upper);
  }
  if (this.options.normaliseLower >= this.options.normaliseUpper)
    throw o.invalidParameterError(
      "range",
      "lower to be less than upper",
      `${this.options.normaliseLower} >= ${this.options.normaliseUpper}`
    );
  return this.options.normalise = !0, this;
}
function z2(e) {
  return this.normalise(e);
}
function F2(e) {
  if (o.plainObject(e)) {
    if (o.integer(e.width) && e.width > 0)
      this.options.claheWidth = e.width;
    else
      throw o.invalidParameterError("width", "integer greater than zero", e.width);
    if (o.integer(e.height) && e.height > 0)
      this.options.claheHeight = e.height;
    else
      throw o.invalidParameterError("height", "integer greater than zero", e.height);
    if (o.defined(e.maxSlope))
      if (o.integer(e.maxSlope) && o.inRange(e.maxSlope, 0, 100))
        this.options.claheMaxSlope = e.maxSlope;
      else
        throw o.invalidParameterError("maxSlope", "integer between 0 and 100", e.maxSlope);
  } else
    throw o.invalidParameterError("options", "plain object", e);
  return this;
}
function U2(e) {
  if (!o.object(e) || !Array.isArray(e.kernel) || !o.integer(e.width) || !o.integer(e.height) || !o.inRange(e.width, 3, 1001) || !o.inRange(e.height, 3, 1001) || e.height * e.width !== e.kernel.length)
    throw new Error("Invalid convolution kernel");
  return o.integer(e.scale) || (e.scale = e.kernel.reduce((t, n) => t + n, 0)), e.scale < 1 && (e.scale = 1), o.integer(e.offset) || (e.offset = 0), this.options.convKernel = e, this;
}
function B2(e, t) {
  if (!o.defined(e))
    this.options.threshold = 128;
  else if (o.bool(e))
    this.options.threshold = e ? 128 : 0;
  else if (o.integer(e) && o.inRange(e, 0, 255))
    this.options.threshold = e;
  else
    throw o.invalidParameterError("threshold", "integer between 0 and 255", e);
  return !o.object(t) || t.greyscale === !0 || t.grayscale === !0 ? this.options.thresholdGrayscale = !0 : this.options.thresholdGrayscale = !1, this;
}
function M2(e, t, n) {
  if (this.options.boolean = this._createInputDescriptor(e, n), o.string(t) && o.inArray(t, ["and", "or", "eor"]))
    this.options.booleanOp = t;
  else
    throw o.invalidParameterError("operator", "one of: and, or, eor", t);
  return this;
}
function q2(e, t) {
  if (!o.defined(e) && o.number(t) ? e = 1 : o.number(e) && !o.defined(t) && (t = 0), !o.defined(e))
    this.options.linearA = [];
  else if (o.number(e))
    this.options.linearA = [e];
  else if (Array.isArray(e) && e.length && e.every(o.number))
    this.options.linearA = e;
  else
    throw o.invalidParameterError("a", "number or array of numbers", e);
  if (!o.defined(t))
    this.options.linearB = [];
  else if (o.number(t))
    this.options.linearB = [t];
  else if (Array.isArray(t) && t.length && t.every(o.number))
    this.options.linearB = t;
  else
    throw o.invalidParameterError("b", "number or array of numbers", t);
  if (this.options.linearA.length !== this.options.linearB.length)
    throw new Error("Expected a and b to be arrays of the same length");
  return this;
}
function H2(e) {
  if (!Array.isArray(e))
    throw o.invalidParameterError("inputMatrix", "array", e);
  if (e.length !== 3 && e.length !== 4)
    throw o.invalidParameterError("inputMatrix", "3x3 or 4x4 array", e.length);
  const t = e.flat().map(Number);
  if (t.length !== 9 && t.length !== 16)
    throw o.invalidParameterError("inputMatrix", "cardinality of 9 or 16", t.length);
  return this.options.recombMatrix = t, this;
}
function V2(e) {
  if (!o.plainObject(e))
    throw o.invalidParameterError("options", "plain object", e);
  if ("brightness" in e)
    if (o.number(e.brightness) && e.brightness >= 0)
      this.options.brightness = e.brightness;
    else
      throw o.invalidParameterError("brightness", "number above zero", e.brightness);
  if ("saturation" in e)
    if (o.number(e.saturation) && e.saturation >= 0)
      this.options.saturation = e.saturation;
    else
      throw o.invalidParameterError("saturation", "number above zero", e.saturation);
  if ("hue" in e)
    if (o.integer(e.hue))
      this.options.hue = e.hue % 360;
    else
      throw o.invalidParameterError("hue", "number", e.hue);
  if ("lightness" in e)
    if (o.number(e.lightness))
      this.options.lightness = e.lightness;
    else
      throw o.invalidParameterError("lightness", "number", e.lightness);
  return this;
}
const Z2 = (e) => {
  Object.assign(e.prototype, {
    autoOrient: k2,
    rotate: A2,
    flip: T2,
    flop: P2,
    affine: R2,
    sharpen: j2,
    erode: Pp,
    dilate: Tp,
    median: I2,
    blur: O2,
    flatten: $2,
    unflatten: N2,
    gamma: C2,
    negate: L2,
    normalise: D2,
    normalize: z2,
    clahe: F2,
    convolve: U2,
    threshold: B2,
    boolean: M2,
    linear: q2,
    recomb: H2,
    modulate: V2
  });
};
var xa = Object.defineProperty, W2 = Object.getOwnPropertyDescriptor, G2 = Object.getOwnPropertyNames, J2 = Object.prototype.hasOwnProperty, K2 = (e, t) => {
  for (var n in t)
    xa(e, n, { get: t[n], enumerable: !0 });
}, X2 = (e, t, n, r) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let i of G2(t))
      !J2.call(e, i) && i !== n && xa(e, i, { get: () => t[i], enumerable: !(r = W2(t, i)) || r.enumerable });
  return e;
}, Y2 = (e) => X2(xa({}, "__esModule", { value: !0 }), e), Rp = {};
K2(Rp, {
  default: () => fT
});
var Q2 = Y2(Rp), ys = {
  aliceblue: [240, 248, 255],
  antiquewhite: [250, 235, 215],
  aqua: [0, 255, 255],
  aquamarine: [127, 255, 212],
  azure: [240, 255, 255],
  beige: [245, 245, 220],
  bisque: [255, 228, 196],
  black: [0, 0, 0],
  blanchedalmond: [255, 235, 205],
  blue: [0, 0, 255],
  blueviolet: [138, 43, 226],
  brown: [165, 42, 42],
  burlywood: [222, 184, 135],
  cadetblue: [95, 158, 160],
  chartreuse: [127, 255, 0],
  chocolate: [210, 105, 30],
  coral: [255, 127, 80],
  cornflowerblue: [100, 149, 237],
  cornsilk: [255, 248, 220],
  crimson: [220, 20, 60],
  cyan: [0, 255, 255],
  darkblue: [0, 0, 139],
  darkcyan: [0, 139, 139],
  darkgoldenrod: [184, 134, 11],
  darkgray: [169, 169, 169],
  darkgreen: [0, 100, 0],
  darkgrey: [169, 169, 169],
  darkkhaki: [189, 183, 107],
  darkmagenta: [139, 0, 139],
  darkolivegreen: [85, 107, 47],
  darkorange: [255, 140, 0],
  darkorchid: [153, 50, 204],
  darkred: [139, 0, 0],
  darksalmon: [233, 150, 122],
  darkseagreen: [143, 188, 143],
  darkslateblue: [72, 61, 139],
  darkslategray: [47, 79, 79],
  darkslategrey: [47, 79, 79],
  darkturquoise: [0, 206, 209],
  darkviolet: [148, 0, 211],
  deeppink: [255, 20, 147],
  deepskyblue: [0, 191, 255],
  dimgray: [105, 105, 105],
  dimgrey: [105, 105, 105],
  dodgerblue: [30, 144, 255],
  firebrick: [178, 34, 34],
  floralwhite: [255, 250, 240],
  forestgreen: [34, 139, 34],
  fuchsia: [255, 0, 255],
  gainsboro: [220, 220, 220],
  ghostwhite: [248, 248, 255],
  gold: [255, 215, 0],
  goldenrod: [218, 165, 32],
  gray: [128, 128, 128],
  green: [0, 128, 0],
  greenyellow: [173, 255, 47],
  grey: [128, 128, 128],
  honeydew: [240, 255, 240],
  hotpink: [255, 105, 180],
  indianred: [205, 92, 92],
  indigo: [75, 0, 130],
  ivory: [255, 255, 240],
  khaki: [240, 230, 140],
  lavender: [230, 230, 250],
  lavenderblush: [255, 240, 245],
  lawngreen: [124, 252, 0],
  lemonchiffon: [255, 250, 205],
  lightblue: [173, 216, 230],
  lightcoral: [240, 128, 128],
  lightcyan: [224, 255, 255],
  lightgoldenrodyellow: [250, 250, 210],
  lightgray: [211, 211, 211],
  lightgreen: [144, 238, 144],
  lightgrey: [211, 211, 211],
  lightpink: [255, 182, 193],
  lightsalmon: [255, 160, 122],
  lightseagreen: [32, 178, 170],
  lightskyblue: [135, 206, 250],
  lightslategray: [119, 136, 153],
  lightslategrey: [119, 136, 153],
  lightsteelblue: [176, 196, 222],
  lightyellow: [255, 255, 224],
  lime: [0, 255, 0],
  limegreen: [50, 205, 50],
  linen: [250, 240, 230],
  magenta: [255, 0, 255],
  maroon: [128, 0, 0],
  mediumaquamarine: [102, 205, 170],
  mediumblue: [0, 0, 205],
  mediumorchid: [186, 85, 211],
  mediumpurple: [147, 112, 219],
  mediumseagreen: [60, 179, 113],
  mediumslateblue: [123, 104, 238],
  mediumspringgreen: [0, 250, 154],
  mediumturquoise: [72, 209, 204],
  mediumvioletred: [199, 21, 133],
  midnightblue: [25, 25, 112],
  mintcream: [245, 255, 250],
  mistyrose: [255, 228, 225],
  moccasin: [255, 228, 181],
  navajowhite: [255, 222, 173],
  navy: [0, 0, 128],
  oldlace: [253, 245, 230],
  olive: [128, 128, 0],
  olivedrab: [107, 142, 35],
  orange: [255, 165, 0],
  orangered: [255, 69, 0],
  orchid: [218, 112, 214],
  palegoldenrod: [238, 232, 170],
  palegreen: [152, 251, 152],
  paleturquoise: [175, 238, 238],
  palevioletred: [219, 112, 147],
  papayawhip: [255, 239, 213],
  peachpuff: [255, 218, 185],
  peru: [205, 133, 63],
  pink: [255, 192, 203],
  plum: [221, 160, 221],
  powderblue: [176, 224, 230],
  purple: [128, 0, 128],
  rebeccapurple: [102, 51, 153],
  red: [255, 0, 0],
  rosybrown: [188, 143, 143],
  royalblue: [65, 105, 225],
  saddlebrown: [139, 69, 19],
  salmon: [250, 128, 114],
  sandybrown: [244, 164, 96],
  seagreen: [46, 139, 87],
  seashell: [255, 245, 238],
  sienna: [160, 82, 45],
  silver: [192, 192, 192],
  skyblue: [135, 206, 235],
  slateblue: [106, 90, 205],
  slategray: [112, 128, 144],
  slategrey: [112, 128, 144],
  snow: [255, 250, 250],
  springgreen: [0, 255, 127],
  steelblue: [70, 130, 180],
  tan: [210, 180, 140],
  teal: [0, 128, 128],
  thistle: [216, 191, 216],
  tomato: [255, 99, 71],
  turquoise: [64, 224, 208],
  violet: [238, 130, 238],
  wheat: [245, 222, 179],
  white: [255, 255, 255],
  whitesmoke: [245, 245, 245],
  yellow: [255, 255, 0],
  yellowgreen: [154, 205, 50]
};
for (const e in ys) Object.freeze(ys[e]);
var Xe = Object.freeze(ys), jp = /* @__PURE__ */ Object.create(null);
for (const e in Xe)
  Object.hasOwn(Xe, e) && (jp[Xe[e]] = e);
var je = {
  to: {},
  get: {}
};
je.get = function(e) {
  const t = e.slice(0, 3).toLowerCase();
  let n, r;
  switch (t) {
    case "hsl": {
      n = je.get.hsl(e), r = "hsl";
      break;
    }
    case "hwb": {
      n = je.get.hwb(e), r = "hwb";
      break;
    }
    default: {
      n = je.get.rgb(e), r = "rgb";
      break;
    }
  }
  return n ? { model: r, value: n } : null;
};
je.get.rgb = function(e) {
  if (!e)
    return null;
  const t = /^#([a-f\d]{3,4})$/i, n = /^#([a-f\d]{6})([a-f\d]{2})?$/i, r = /^rgba?\(\s*([+-]?(?:\d*\.)?\d+(?:e\d+)?)(?=[\s,])\s*(?:,\s*)?([+-]?(?:\d*\.)?\d+(?:e\d+)?)(?=[\s,])\s*(?:,\s*)?([+-]?(?:\d*\.)?\d+(?:e\d+)?)\s*(?:[\s,|/]\s*([+-]?(?:\d*\.)?\d+(?:e\d+)?)(%?)\s*)?\)$/i, i = /^rgba?\(\s*([+-]?[\d.]+)%\s*,?\s*([+-]?[\d.]+)%\s*,?\s*([+-]?[\d.]+)%\s*(?:[\s,|/]\s*([+-]?[\d.]+)(%?)\s*)?\)$/i, s = /^(\w+)$/;
  let a = [0, 0, 0, 1], c, l, p;
  if (c = e.match(n)) {
    for (p = c[2], c = c[1], l = 0; l < 3; l++) {
      const u = l * 2;
      a[l] = Number.parseInt(c.slice(u, u + 2), 16);
    }
    p && (a[3] = Number.parseInt(p, 16) / 255);
  } else if (c = e.match(t)) {
    for (c = c[1], p = c[3], l = 0; l < 3; l++)
      a[l] = Number.parseInt(c[l] + c[l], 16);
    p && (a[3] = Number.parseInt(p + p, 16) / 255);
  } else if (c = e.match(r)) {
    for (l = 0; l < 3; l++)
      a[l] = Number.parseFloat(c[l + 1]);
    c[4] && (a[3] = c[5] ? Number.parseFloat(c[4]) * 0.01 : Number.parseFloat(c[4]));
  } else if (c = e.match(i)) {
    for (l = 0; l < 3; l++)
      a[l] = Math.round(Number.parseFloat(c[l + 1]) * 2.55);
    c[4] && (a[3] = c[5] ? Number.parseFloat(c[4]) * 0.01 : Number.parseFloat(c[4]));
  } else return (c = e.toLowerCase().match(s)) ? c[1] === "transparent" ? [0, 0, 0, 0] : Object.hasOwn(Xe, c[1]) ? (a = Xe[c[1]].slice(), a[3] = 1, a) : null : null;
  for (l = 0; l < 3; l++)
    a[l] = ft(a[l], 0, 255);
  return a[3] = ft(a[3], 0, 1), a;
};
je.get.hsl = function(e) {
  if (!e)
    return null;
  const t = /^hsla?\(\s*([+-]?(?:\d{0,3}\.)?\d+)(?:deg)?\s*,?\s*([+-]?[\d.]+)%\s*,?\s*([+-]?[\d.]+)%\s*(?:[,|/]\s*([+-]?(?=\.\d|\d)(?:0|[1-9]\d*)?(?:\.\d*)?(?:e[+-]?\d+)?)\s*)?\)$/i, n = e.match(t);
  if (n) {
    const r = Number.parseFloat(n[4]), i = (Number.parseFloat(n[1]) % 360 + 360) % 360, s = ft(Number.parseFloat(n[2]), 0, 100), a = ft(Number.parseFloat(n[3]), 0, 100), c = ft(Number.isNaN(r) ? 1 : r, 0, 1);
    return [i, s, a, c];
  }
  return null;
};
je.get.hwb = function(e) {
  if (!e)
    return null;
  const t = /^hwb\(\s*([+-]?\d{0,3}(?:\.\d+)?)(?:deg)?\s*[\s,]\s*([+-]?[\d.]+)%\s*[\s,]\s*([+-]?[\d.]+)%\s*(?:[\s,]\s*([+-]?(?=\.\d|\d)(?:0|[1-9]\d*)?(?:\.\d*)?(?:e[+-]?\d+)?)\s*)?\)$/i, n = e.match(t);
  if (n) {
    const r = Number.parseFloat(n[4]), i = (Number.parseFloat(n[1]) % 360 + 360) % 360, s = ft(Number.parseFloat(n[2]), 0, 100), a = ft(Number.parseFloat(n[3]), 0, 100), c = ft(Number.isNaN(r) ? 1 : r, 0, 1);
    return [i, s, a, c];
  }
  return null;
};
je.to.hex = function(...e) {
  return "#" + br(e[0]) + br(e[1]) + br(e[2]) + (e[3] < 1 ? br(Math.round(e[3] * 255)) : "");
};
je.to.rgb = function(...e) {
  return e.length < 4 || e[3] === 1 ? "rgb(" + Math.round(e[0]) + ", " + Math.round(e[1]) + ", " + Math.round(e[2]) + ")" : "rgba(" + Math.round(e[0]) + ", " + Math.round(e[1]) + ", " + Math.round(e[2]) + ", " + e[3] + ")";
};
je.to.rgb.percent = function(...e) {
  const t = Math.round(e[0] / 255 * 100), n = Math.round(e[1] / 255 * 100), r = Math.round(e[2] / 255 * 100);
  return e.length < 4 || e[3] === 1 ? "rgb(" + t + "%, " + n + "%, " + r + "%)" : "rgba(" + t + "%, " + n + "%, " + r + "%, " + e[3] + ")";
};
je.to.hsl = function(...e) {
  return e.length < 4 || e[3] === 1 ? "hsl(" + e[0] + ", " + e[1] + "%, " + e[2] + "%)" : "hsla(" + e[0] + ", " + e[1] + "%, " + e[2] + "%, " + e[3] + ")";
};
je.to.hwb = function(...e) {
  let t = "";
  return e.length >= 4 && e[3] !== 1 && (t = ", " + e[3]), "hwb(" + e[0] + ", " + e[1] + "%, " + e[2] + "%" + t + ")";
};
je.to.keyword = function(...e) {
  return jp[e.slice(0, 3)];
};
function ft(e, t, n) {
  return Math.min(Math.max(t, e), n);
}
function br(e) {
  const t = Math.round(e).toString(16).toUpperCase();
  return t.length < 2 ? "0" + t : t;
}
var Zt = je, Ip = {};
for (const e of Object.keys(Xe))
  Ip[Xe[e]] = e;
var T = {
  rgb: { channels: 3, labels: "rgb" },
  hsl: { channels: 3, labels: "hsl" },
  hsv: { channels: 3, labels: "hsv" },
  hwb: { channels: 3, labels: "hwb" },
  cmyk: { channels: 4, labels: "cmyk" },
  xyz: { channels: 3, labels: "xyz" },
  lab: { channels: 3, labels: "lab" },
  oklab: { channels: 3, labels: ["okl", "oka", "okb"] },
  lch: { channels: 3, labels: "lch" },
  oklch: { channels: 3, labels: ["okl", "okc", "okh"] },
  hex: { channels: 1, labels: ["hex"] },
  keyword: { channels: 1, labels: ["keyword"] },
  ansi16: { channels: 1, labels: ["ansi16"] },
  ansi256: { channels: 1, labels: ["ansi256"] },
  hcg: { channels: 3, labels: ["h", "c", "g"] },
  apple: { channels: 3, labels: ["r16", "g16", "b16"] },
  gray: { channels: 1, labels: ["gray"] }
}, $t = T, et = (6 / 29) ** 3;
function nn(e) {
  const t = e > 31308e-7 ? 1.055 * e ** 0.4166666666666667 - 0.055 : e * 12.92;
  return Math.min(Math.max(0, t), 1);
}
function rn(e) {
  return e > 0.04045 ? ((e + 0.055) / 1.055) ** 2.4 : e / 12.92;
}
for (const e of Object.keys(T)) {
  if (!("channels" in T[e]))
    throw new Error("missing channels property: " + e);
  if (!("labels" in T[e]))
    throw new Error("missing channel labels property: " + e);
  if (T[e].labels.length !== T[e].channels)
    throw new Error("channel and label counts mismatch: " + e);
  const { channels: t, labels: n } = T[e];
  delete T[e].channels, delete T[e].labels, Object.defineProperty(T[e], "channels", { value: t }), Object.defineProperty(T[e], "labels", { value: n });
}
T.rgb.hsl = function(e) {
  const t = e[0] / 255, n = e[1] / 255, r = e[2] / 255, i = Math.min(t, n, r), s = Math.max(t, n, r), a = s - i;
  let c, l;
  switch (s) {
    case i: {
      c = 0;
      break;
    }
    case t: {
      c = (n - r) / a;
      break;
    }
    case n: {
      c = 2 + (r - t) / a;
      break;
    }
    case r: {
      c = 4 + (t - n) / a;
      break;
    }
  }
  c = Math.min(c * 60, 360), c < 0 && (c += 360);
  const p = (i + s) / 2;
  return s === i ? l = 0 : p <= 0.5 ? l = a / (s + i) : l = a / (2 - s - i), [c, l * 100, p * 100];
};
T.rgb.hsv = function(e) {
  let t, n, r, i, s;
  const a = e[0] / 255, c = e[1] / 255, l = e[2] / 255, p = Math.max(a, c, l), u = p - Math.min(a, c, l), d = function(f) {
    return (p - f) / 6 / u + 1 / 2;
  };
  if (u === 0)
    i = 0, s = 0;
  else {
    switch (s = u / p, t = d(a), n = d(c), r = d(l), p) {
      case a: {
        i = r - n;
        break;
      }
      case c: {
        i = 1 / 3 + t - r;
        break;
      }
      case l: {
        i = 2 / 3 + n - t;
        break;
      }
    }
    i < 0 ? i += 1 : i > 1 && (i -= 1);
  }
  return [
    i * 360,
    s * 100,
    p * 100
  ];
};
T.rgb.hwb = function(e) {
  const t = e[0], n = e[1];
  let r = e[2];
  const i = T.rgb.hsl(e)[0], s = 1 / 255 * Math.min(t, Math.min(n, r));
  return r = 1 - 1 / 255 * Math.max(t, Math.max(n, r)), [i, s * 100, r * 100];
};
T.rgb.oklab = function(e) {
  const t = rn(e[0] / 255), n = rn(e[1] / 255), r = rn(e[2] / 255), i = Math.cbrt(0.4122214708 * t + 0.5363325363 * n + 0.0514459929 * r), s = Math.cbrt(0.2119034982 * t + 0.6806995451 * n + 0.1073969566 * r), a = Math.cbrt(0.0883024619 * t + 0.2817188376 * n + 0.6299787005 * r), c = 0.2104542553 * i + 0.793617785 * s - 0.0040720468 * a, l = 1.9779984951 * i - 2.428592205 * s + 0.4505937099 * a, p = 0.0259040371 * i + 0.7827717662 * s - 0.808675766 * a;
  return [c * 100, l * 100, p * 100];
};
T.rgb.cmyk = function(e) {
  const t = e[0] / 255, n = e[1] / 255, r = e[2] / 255, i = Math.min(1 - t, 1 - n, 1 - r), s = (1 - t - i) / (1 - i) || 0, a = (1 - n - i) / (1 - i) || 0, c = (1 - r - i) / (1 - i) || 0;
  return [s * 100, a * 100, c * 100, i * 100];
};
function eT(e, t) {
  return (e[0] - t[0]) ** 2 + (e[1] - t[1]) ** 2 + (e[2] - t[2]) ** 2;
}
T.rgb.keyword = function(e) {
  const t = Ip[e];
  if (t)
    return t;
  let n = Number.POSITIVE_INFINITY, r;
  for (const i of Object.keys(Xe)) {
    const s = Xe[i], a = eT(e, s);
    a < n && (n = a, r = i);
  }
  return r;
};
T.keyword.rgb = function(e) {
  return [...Xe[e]];
};
T.rgb.xyz = function(e) {
  const t = rn(e[0] / 255), n = rn(e[1] / 255), r = rn(e[2] / 255), i = t * 0.4124564 + n * 0.3575761 + r * 0.1804375, s = t * 0.2126729 + n * 0.7151522 + r * 0.072175, a = t * 0.0193339 + n * 0.119192 + r * 0.9503041;
  return [i * 100, s * 100, a * 100];
};
T.rgb.lab = function(e) {
  const t = T.rgb.xyz(e);
  let n = t[0], r = t[1], i = t[2];
  n /= 95.047, r /= 100, i /= 108.883, n = n > et ? n ** (1 / 3) : 7.787 * n + 16 / 116, r = r > et ? r ** (1 / 3) : 7.787 * r + 16 / 116, i = i > et ? i ** (1 / 3) : 7.787 * i + 16 / 116;
  const s = 116 * r - 16, a = 500 * (n - r), c = 200 * (r - i);
  return [s, a, c];
};
T.hsl.rgb = function(e) {
  const t = e[0] / 360, n = e[1] / 100, r = e[2] / 100;
  let i, s;
  if (n === 0)
    return s = r * 255, [s, s, s];
  const a = r < 0.5 ? r * (1 + n) : r + n - r * n, c = 2 * r - a, l = [0, 0, 0];
  for (let p = 0; p < 3; p++)
    i = t + 1 / 3 * -(p - 1), i < 0 && i++, i > 1 && i--, 6 * i < 1 ? s = c + (a - c) * 6 * i : 2 * i < 1 ? s = a : 3 * i < 2 ? s = c + (a - c) * (2 / 3 - i) * 6 : s = c, l[p] = s * 255;
  return l;
};
T.hsl.hsv = function(e) {
  const t = e[0];
  let n = e[1] / 100, r = e[2] / 100, i = n;
  const s = Math.max(r, 0.01);
  r *= 2, n *= r <= 1 ? r : 2 - r, i *= s <= 1 ? s : 2 - s;
  const a = (r + n) / 2, c = r === 0 ? 2 * i / (s + i) : 2 * n / (r + n);
  return [t, c * 100, a * 100];
};
T.hsv.rgb = function(e) {
  const t = e[0] / 60, n = e[1] / 100;
  let r = e[2] / 100;
  const i = Math.floor(t) % 6, s = t - Math.floor(t), a = 255 * r * (1 - n), c = 255 * r * (1 - n * s), l = 255 * r * (1 - n * (1 - s));
  switch (r *= 255, i) {
    case 0:
      return [r, l, a];
    case 1:
      return [c, r, a];
    case 2:
      return [a, r, l];
    case 3:
      return [a, c, r];
    case 4:
      return [l, a, r];
    case 5:
      return [r, a, c];
  }
};
T.hsv.hsl = function(e) {
  const t = e[0], n = e[1] / 100, r = e[2] / 100, i = Math.max(r, 0.01);
  let s, a;
  a = (2 - n) * r;
  const c = (2 - n) * i;
  return s = n * i, s /= c <= 1 ? c : 2 - c, s = s || 0, a /= 2, [t, s * 100, a * 100];
};
T.hwb.rgb = function(e) {
  const t = e[0] / 360;
  let n = e[1] / 100, r = e[2] / 100;
  const i = n + r;
  let s;
  i > 1 && (n /= i, r /= i);
  const a = Math.floor(6 * t), c = 1 - r;
  s = 6 * t - a, a & 1 && (s = 1 - s);
  const l = n + s * (c - n);
  let p, u, d;
  switch (a) {
    default:
    case 6:
    case 0: {
      p = c, u = l, d = n;
      break;
    }
    case 1: {
      p = l, u = c, d = n;
      break;
    }
    case 2: {
      p = n, u = c, d = l;
      break;
    }
    case 3: {
      p = n, u = l, d = c;
      break;
    }
    case 4: {
      p = l, u = n, d = c;
      break;
    }
    case 5: {
      p = c, u = n, d = l;
      break;
    }
  }
  return [p * 255, u * 255, d * 255];
};
T.cmyk.rgb = function(e) {
  const t = e[0] / 100, n = e[1] / 100, r = e[2] / 100, i = e[3] / 100, s = 1 - Math.min(1, t * (1 - i) + i), a = 1 - Math.min(1, n * (1 - i) + i), c = 1 - Math.min(1, r * (1 - i) + i);
  return [s * 255, a * 255, c * 255];
};
T.xyz.rgb = function(e) {
  const t = e[0] / 100, n = e[1] / 100, r = e[2] / 100;
  let i, s, a;
  return i = t * 3.2404542 + n * -1.5371385 + r * -0.4985314, s = t * -0.969266 + n * 1.8760108 + r * 0.041556, a = t * 0.0556434 + n * -0.2040259 + r * 1.0572252, i = nn(i), s = nn(s), a = nn(a), [i * 255, s * 255, a * 255];
};
T.xyz.lab = function(e) {
  let t = e[0], n = e[1], r = e[2];
  t /= 95.047, n /= 100, r /= 108.883, t = t > et ? t ** (1 / 3) : 7.787 * t + 16 / 116, n = n > et ? n ** (1 / 3) : 7.787 * n + 16 / 116, r = r > et ? r ** (1 / 3) : 7.787 * r + 16 / 116;
  const i = 116 * n - 16, s = 500 * (t - n), a = 200 * (n - r);
  return [i, s, a];
};
T.xyz.oklab = function(e) {
  const t = e[0] / 100, n = e[1] / 100, r = e[2] / 100, i = Math.cbrt(0.8189330101 * t + 0.3618667424 * n - 0.1288597137 * r), s = Math.cbrt(0.0329845436 * t + 0.9293118715 * n + 0.0361456387 * r), a = Math.cbrt(0.0482003018 * t + 0.2643662691 * n + 0.633851707 * r), c = 0.2104542553 * i + 0.793617785 * s - 0.0040720468 * a, l = 1.9779984951 * i - 2.428592205 * s + 0.4505937099 * a, p = 0.0259040371 * i + 0.7827717662 * s - 0.808675766 * a;
  return [c * 100, l * 100, p * 100];
};
T.oklab.oklch = function(e) {
  return T.lab.lch(e);
};
T.oklab.xyz = function(e) {
  const t = e[0] / 100, n = e[1] / 100, r = e[2] / 100, i = (0.999999998 * t + 0.396337792 * n + 0.215803758 * r) ** 3, s = (1.000000008 * t - 0.105561342 * n - 0.063854175 * r) ** 3, a = (1.000000055 * t - 0.089484182 * n - 1.291485538 * r) ** 3, c = 1.227013851 * i - 0.55779998 * s + 0.281256149 * a, l = -0.040580178 * i + 1.11225687 * s - 0.071676679 * a, p = -0.076381285 * i - 0.421481978 * s + 1.58616322 * a;
  return [c * 100, l * 100, p * 100];
};
T.oklab.rgb = function(e) {
  const t = e[0] / 100, n = e[1] / 100, r = e[2] / 100, i = (t + 0.3963377774 * n + 0.2158037573 * r) ** 3, s = (t - 0.1055613458 * n - 0.0638541728 * r) ** 3, a = (t - 0.0894841775 * n - 1.291485548 * r) ** 3, c = nn(4.0767416621 * i - 3.3077115913 * s + 0.2309699292 * a), l = nn(-1.2684380046 * i + 2.6097574011 * s - 0.3413193965 * a), p = nn(-0.0041960863 * i - 0.7034186147 * s + 1.707614701 * a);
  return [c * 255, l * 255, p * 255];
};
T.oklch.oklab = function(e) {
  return T.lch.lab(e);
};
T.lab.xyz = function(e) {
  const t = e[0], n = e[1], r = e[2];
  let i, s, a;
  s = (t + 16) / 116, i = n / 500 + s, a = s - r / 200;
  const c = s ** 3, l = i ** 3, p = a ** 3;
  return s = c > et ? c : (s - 16 / 116) / 7.787, i = l > et ? l : (i - 16 / 116) / 7.787, a = p > et ? p : (a - 16 / 116) / 7.787, i *= 95.047, s *= 100, a *= 108.883, [i, s, a];
};
T.lab.lch = function(e) {
  const t = e[0], n = e[1], r = e[2];
  let i;
  i = Math.atan2(r, n) * 360 / 2 / Math.PI, i < 0 && (i += 360);
  const a = Math.sqrt(n * n + r * r);
  return [t, a, i];
};
T.lch.lab = function(e) {
  const t = e[0], n = e[1], i = e[2] / 360 * 2 * Math.PI, s = n * Math.cos(i), a = n * Math.sin(i);
  return [t, s, a];
};
T.rgb.ansi16 = function(e, t = null) {
  const [n, r, i] = e;
  let s = t === null ? T.rgb.hsv(e)[2] : t;
  if (s = Math.round(s / 50), s === 0)
    return 30;
  let a = 30 + (Math.round(i / 255) << 2 | Math.round(r / 255) << 1 | Math.round(n / 255));
  return s === 2 && (a += 60), a;
};
T.hsv.ansi16 = function(e) {
  return T.rgb.ansi16(T.hsv.rgb(e), e[2]);
};
T.rgb.ansi256 = function(e) {
  const t = e[0], n = e[1], r = e[2];
  return t >> 4 === n >> 4 && n >> 4 === r >> 4 ? t < 8 ? 16 : t > 248 ? 231 : Math.round((t - 8) / 247 * 24) + 232 : 16 + 36 * Math.round(t / 255 * 5) + 6 * Math.round(n / 255 * 5) + Math.round(r / 255 * 5);
};
T.ansi16.rgb = function(e) {
  e = e[0];
  let t = e % 10;
  if (t === 0 || t === 7)
    return e > 50 && (t += 3.5), t = t / 10.5 * 255, [t, t, t];
  const n = (Math.trunc(e > 50) + 1) * 0.5, r = (t & 1) * n * 255, i = (t >> 1 & 1) * n * 255, s = (t >> 2 & 1) * n * 255;
  return [r, i, s];
};
T.ansi256.rgb = function(e) {
  if (e = e[0], e >= 232) {
    const s = (e - 232) * 10 + 8;
    return [s, s, s];
  }
  e -= 16;
  let t;
  const n = Math.floor(e / 36) / 5 * 255, r = Math.floor((t = e % 36) / 6) / 5 * 255, i = t % 6 / 5 * 255;
  return [n, r, i];
};
T.rgb.hex = function(e) {
  const n = (((Math.round(e[0]) & 255) << 16) + ((Math.round(e[1]) & 255) << 8) + (Math.round(e[2]) & 255)).toString(16).toUpperCase();
  return "000000".slice(n.length) + n;
};
T.hex.rgb = function(e) {
  const t = e.toString(16).match(/[a-f\d]{6}|[a-f\d]{3}/i);
  if (!t)
    return [0, 0, 0];
  let n = t[0];
  t[0].length === 3 && (n = [...n].map((c) => c + c).join(""));
  const r = Number.parseInt(n, 16), i = r >> 16 & 255, s = r >> 8 & 255, a = r & 255;
  return [i, s, a];
};
T.rgb.hcg = function(e) {
  const t = e[0] / 255, n = e[1] / 255, r = e[2] / 255, i = Math.max(Math.max(t, n), r), s = Math.min(Math.min(t, n), r), a = i - s;
  let c;
  const l = a < 1 ? s / (1 - a) : 0;
  return a <= 0 ? c = 0 : i === t ? c = (n - r) / a % 6 : i === n ? c = 2 + (r - t) / a : c = 4 + (t - n) / a, c /= 6, c %= 1, [c * 360, a * 100, l * 100];
};
T.hsl.hcg = function(e) {
  const t = e[1] / 100, n = e[2] / 100, r = n < 0.5 ? 2 * t * n : 2 * t * (1 - n);
  let i = 0;
  return r < 1 && (i = (n - 0.5 * r) / (1 - r)), [e[0], r * 100, i * 100];
};
T.hsv.hcg = function(e) {
  const t = e[1] / 100, n = e[2] / 100, r = t * n;
  let i = 0;
  return r < 1 && (i = (n - r) / (1 - r)), [e[0], r * 100, i * 100];
};
T.hcg.rgb = function(e) {
  const t = e[0] / 360, n = e[1] / 100, r = e[2] / 100;
  if (n === 0)
    return [r * 255, r * 255, r * 255];
  const i = [0, 0, 0], s = t % 1 * 6, a = s % 1, c = 1 - a;
  let l = 0;
  switch (Math.floor(s)) {
    case 0: {
      i[0] = 1, i[1] = a, i[2] = 0;
      break;
    }
    case 1: {
      i[0] = c, i[1] = 1, i[2] = 0;
      break;
    }
    case 2: {
      i[0] = 0, i[1] = 1, i[2] = a;
      break;
    }
    case 3: {
      i[0] = 0, i[1] = c, i[2] = 1;
      break;
    }
    case 4: {
      i[0] = a, i[1] = 0, i[2] = 1;
      break;
    }
    default:
      i[0] = 1, i[1] = 0, i[2] = c;
  }
  return l = (1 - n) * r, [
    (n * i[0] + l) * 255,
    (n * i[1] + l) * 255,
    (n * i[2] + l) * 255
  ];
};
T.hcg.hsv = function(e) {
  const t = e[1] / 100, n = e[2] / 100, r = t + n * (1 - t);
  let i = 0;
  return r > 0 && (i = t / r), [e[0], i * 100, r * 100];
};
T.hcg.hsl = function(e) {
  const t = e[1] / 100, r = e[2] / 100 * (1 - t) + 0.5 * t;
  let i = 0;
  return r > 0 && r < 0.5 ? i = t / (2 * r) : r >= 0.5 && r < 1 && (i = t / (2 * (1 - r))), [e[0], i * 100, r * 100];
};
T.hcg.hwb = function(e) {
  const t = e[1] / 100, n = e[2] / 100, r = t + n * (1 - t);
  return [e[0], (r - t) * 100, (1 - r) * 100];
};
T.hwb.hcg = function(e) {
  const t = e[1] / 100, r = 1 - e[2] / 100, i = r - t;
  let s = 0;
  return i < 1 && (s = (r - i) / (1 - i)), [e[0], i * 100, s * 100];
};
T.apple.rgb = function(e) {
  return [e[0] / 65535 * 255, e[1] / 65535 * 255, e[2] / 65535 * 255];
};
T.rgb.apple = function(e) {
  return [e[0] / 255 * 65535, e[1] / 255 * 65535, e[2] / 255 * 65535];
};
T.gray.rgb = function(e) {
  return [e[0] / 100 * 255, e[0] / 100 * 255, e[0] / 100 * 255];
};
T.gray.hsl = function(e) {
  return [0, 0, e[0]];
};
T.gray.hsv = T.gray.hsl;
T.gray.hwb = function(e) {
  return [0, 100, e[0]];
};
T.gray.cmyk = function(e) {
  return [0, 0, 0, e[0]];
};
T.gray.lab = function(e) {
  return [e[0], 0, 0];
};
T.gray.hex = function(e) {
  const t = Math.round(e[0] / 100 * 255) & 255, r = ((t << 16) + (t << 8) + t).toString(16).toUpperCase();
  return "000000".slice(r.length) + r;
};
T.rgb.gray = function(e) {
  return [(e[0] + e[1] + e[2]) / 3 / 255 * 100];
};
function tT() {
  const e = {}, t = Object.keys($t);
  for (let { length: n } = t, r = 0; r < n; r++)
    e[t[r]] = {
      // http://jsperf.com/1-vs-infinity
      // micro-opt, but this is simple.
      distance: -1,
      parent: null
    };
  return e;
}
function nT(e) {
  const t = tT(), n = [e];
  for (t[e].distance = 0; n.length > 0; ) {
    const r = n.pop(), i = Object.keys($t[r]);
    for (let { length: s } = i, a = 0; a < s; a++) {
      const c = i[a], l = t[c];
      l.distance === -1 && (l.distance = t[r].distance + 1, l.parent = r, n.unshift(c));
    }
  }
  return t;
}
function rT(e, t) {
  return function(n) {
    return t(e(n));
  };
}
function iT(e, t) {
  const n = [t[e].parent, e];
  let r = $t[t[e].parent][e], i = t[e].parent;
  for (; t[i].parent; )
    n.unshift(t[i].parent), r = rT($t[t[i].parent][i], r), i = t[i].parent;
  return r.conversion = n, r;
}
function sT(e) {
  const t = nT(e), n = {}, r = Object.keys(t);
  for (let { length: i } = r, s = 0; s < i; s++) {
    const a = r[s];
    t[a].parent !== null && (n[a] = iT(a, t));
  }
  return n;
}
var aT = sT, Wt = {}, oT = Object.keys($t);
function cT(e) {
  const t = function(...n) {
    const r = n[0];
    return r == null ? r : (r.length > 1 && (n = r), e(n));
  };
  return "conversion" in e && (t.conversion = e.conversion), t;
}
function lT(e) {
  const t = function(...n) {
    const r = n[0];
    if (r == null)
      return r;
    r.length > 1 && (n = r);
    const i = e(n);
    if (typeof i == "object")
      for (let { length: s } = i, a = 0; a < s; a++)
        i[a] = Math.round(i[a]);
    return i;
  };
  return "conversion" in e && (t.conversion = e.conversion), t;
}
for (const e of oT) {
  Wt[e] = {}, Object.defineProperty(Wt[e], "channels", { value: $t[e].channels }), Object.defineProperty(Wt[e], "labels", { value: $t[e].labels });
  const t = aT(e), n = Object.keys(t);
  for (const r of n) {
    const i = t[r];
    Wt[e][r] = lT(i), Wt[e][r].raw = cT(i);
  }
}
var Ne = Wt, Op = [
  // To be honest, I don't really feel like keyword belongs in color convert, but eh.
  "keyword",
  // Gray conflicts with some method names, and has its own method defined.
  "gray",
  // Shouldn't really be in color-convert either...
  "hex"
], ws = {};
for (const e of Object.keys(Ne))
  ws[[...Ne[e].labels].sort().join("")] = e;
var Rn = {};
function be(e, t) {
  if (!(this instanceof be))
    return new be(e, t);
  if (t && t in Op && (t = null), t && !(t in Ne))
    throw new Error("Unknown model: " + t);
  let n, r;
  if (e == null)
    this.model = "rgb", this.color = [0, 0, 0], this.valpha = 1;
  else if (e instanceof be)
    this.model = e.model, this.color = [...e.color], this.valpha = e.valpha;
  else if (typeof e == "string") {
    const i = Zt.get(e);
    if (i === null)
      throw new Error("Unable to parse color from string: " + e);
    this.model = i.model, r = Ne[this.model].channels, this.color = i.value.slice(0, r), this.valpha = typeof i.value[r] == "number" ? i.value[r] : 1;
  } else if (e.length > 0) {
    this.model = t || "rgb", r = Ne[this.model].channels;
    const i = Array.prototype.slice.call(e, 0, r);
    this.color = Es(i, r), this.valpha = typeof e[r] == "number" ? e[r] : 1;
  } else if (typeof e == "number")
    this.model = "rgb", this.color = [
      e >> 16 & 255,
      e >> 8 & 255,
      e & 255
    ], this.valpha = 1;
  else {
    this.valpha = 1;
    const i = Object.keys(e);
    "alpha" in e && (i.splice(i.indexOf("alpha"), 1), this.valpha = typeof e.alpha == "number" ? e.alpha : 0);
    const s = i.sort().join("");
    if (!(s in ws))
      throw new Error("Unable to parse color from object: " + JSON.stringify(e));
    this.model = ws[s];
    const { labels: a } = Ne[this.model], c = [];
    for (n = 0; n < a.length; n++)
      c.push(e[a[n]]);
    this.color = Es(c);
  }
  if (Rn[this.model])
    for (r = Ne[this.model].channels, n = 0; n < r; n++) {
      const i = Rn[this.model][n];
      i && (this.color[n] = i(this.color[n]));
    }
  this.valpha = Math.max(0, Math.min(1, this.valpha)), Object.freeze && Object.freeze(this);
}
be.prototype = {
  toString() {
    return this.string();
  },
  toJSON() {
    return this[this.model]();
  },
  string(e) {
    let t = this.model in Zt.to ? this : this.rgb();
    t = t.round(typeof e == "number" ? e : 1);
    const n = t.valpha === 1 ? t.color : [...t.color, this.valpha];
    return Zt.to[t.model](...n);
  },
  percentString(e) {
    const t = this.rgb().round(typeof e == "number" ? e : 1), n = t.valpha === 1 ? t.color : [...t.color, this.valpha];
    return Zt.to.rgb.percent(...n);
  },
  array() {
    return this.valpha === 1 ? [...this.color] : [...this.color, this.valpha];
  },
  object() {
    const e = {}, { channels: t } = Ne[this.model], { labels: n } = Ne[this.model];
    for (let r = 0; r < t; r++)
      e[n[r]] = this.color[r];
    return this.valpha !== 1 && (e.alpha = this.valpha), e;
  },
  unitArray() {
    const e = this.rgb().color;
    return e[0] /= 255, e[1] /= 255, e[2] /= 255, this.valpha !== 1 && e.push(this.valpha), e;
  },
  unitObject() {
    const e = this.rgb().object();
    return e.r /= 255, e.g /= 255, e.b /= 255, this.valpha !== 1 && (e.alpha = this.valpha), e;
  },
  round(e) {
    return e = Math.max(e || 0, 0), new be([...this.color.map(pT(e)), this.valpha], this.model);
  },
  alpha(e) {
    return e !== void 0 ? new be([...this.color, Math.max(0, Math.min(1, e))], this.model) : this.valpha;
  },
  // Rgb
  red: ae("rgb", 0, fe(255)),
  green: ae("rgb", 1, fe(255)),
  blue: ae("rgb", 2, fe(255)),
  hue: ae(["hsl", "hsv", "hsl", "hwb", "hcg"], 0, (e) => (e % 360 + 360) % 360),
  saturationl: ae("hsl", 1, fe(100)),
  lightness: ae("hsl", 2, fe(100)),
  saturationv: ae("hsv", 1, fe(100)),
  value: ae("hsv", 2, fe(100)),
  chroma: ae("hcg", 1, fe(100)),
  gray: ae("hcg", 2, fe(100)),
  white: ae("hwb", 1, fe(100)),
  wblack: ae("hwb", 2, fe(100)),
  cyan: ae("cmyk", 0, fe(100)),
  magenta: ae("cmyk", 1, fe(100)),
  yellow: ae("cmyk", 2, fe(100)),
  black: ae("cmyk", 3, fe(100)),
  x: ae("xyz", 0, fe(95.047)),
  y: ae("xyz", 1, fe(100)),
  z: ae("xyz", 2, fe(108.833)),
  l: ae("lab", 0, fe(100)),
  a: ae("lab", 1),
  b: ae("lab", 2),
  keyword(e) {
    return e !== void 0 ? new be(e) : Ne[this.model].keyword(this.color);
  },
  hex(e) {
    return e !== void 0 ? new be(e) : Zt.to.hex(...this.rgb().round().color);
  },
  hexa(e) {
    if (e !== void 0)
      return new be(e);
    const t = this.rgb().round().color;
    let n = Math.round(this.valpha * 255).toString(16).toUpperCase();
    return n.length === 1 && (n = "0" + n), Zt.to.hex(...t) + n;
  },
  rgbNumber() {
    const e = this.rgb().color;
    return (e[0] & 255) << 16 | (e[1] & 255) << 8 | e[2] & 255;
  },
  luminosity() {
    const e = this.rgb().color, t = [];
    for (const [n, r] of e.entries()) {
      const i = r / 255;
      t[n] = i <= 0.04045 ? i / 12.92 : ((i + 0.055) / 1.055) ** 2.4;
    }
    return 0.2126 * t[0] + 0.7152 * t[1] + 0.0722 * t[2];
  },
  contrast(e) {
    const t = this.luminosity(), n = e.luminosity();
    return t > n ? (t + 0.05) / (n + 0.05) : (n + 0.05) / (t + 0.05);
  },
  level(e) {
    const t = this.contrast(e);
    return t >= 7 ? "AAA" : t >= 4.5 ? "AA" : "";
  },
  isDark() {
    const e = this.rgb().color;
    return (e[0] * 2126 + e[1] * 7152 + e[2] * 722) / 1e4 < 128;
  },
  isLight() {
    return !this.isDark();
  },
  negate() {
    const e = this.rgb();
    for (let t = 0; t < 3; t++)
      e.color[t] = 255 - e.color[t];
    return e;
  },
  lighten(e) {
    const t = this.hsl();
    return t.color[2] += t.color[2] * e, t;
  },
  darken(e) {
    const t = this.hsl();
    return t.color[2] -= t.color[2] * e, t;
  },
  saturate(e) {
    const t = this.hsl();
    return t.color[1] += t.color[1] * e, t;
  },
  desaturate(e) {
    const t = this.hsl();
    return t.color[1] -= t.color[1] * e, t;
  },
  whiten(e) {
    const t = this.hwb();
    return t.color[1] += t.color[1] * e, t;
  },
  blacken(e) {
    const t = this.hwb();
    return t.color[2] += t.color[2] * e, t;
  },
  grayscale() {
    const e = this.rgb().color, t = e[0] * 0.3 + e[1] * 0.59 + e[2] * 0.11;
    return be.rgb(t, t, t);
  },
  fade(e) {
    return this.alpha(this.valpha - this.valpha * e);
  },
  opaquer(e) {
    return this.alpha(this.valpha + this.valpha * e);
  },
  rotate(e) {
    const t = this.hsl();
    let n = t.color[0];
    return n = (n + e) % 360, n = n < 0 ? 360 + n : n, t.color[0] = n, t;
  },
  mix(e, t) {
    if (!e || !e.rgb)
      throw new Error('Argument to "mix" was not a Color instance, but rather an instance of ' + typeof e);
    const n = e.rgb(), r = this.rgb(), i = t === void 0 ? 0.5 : t, s = 2 * i - 1, a = n.alpha() - r.alpha(), c = ((s * a === -1 ? s : (s + a) / (1 + s * a)) + 1) / 2, l = 1 - c;
    return be.rgb(
      c * n.red() + l * r.red(),
      c * n.green() + l * r.green(),
      c * n.blue() + l * r.blue(),
      n.alpha() * i + r.alpha() * (1 - i)
    );
  }
};
for (const e of Object.keys(Ne)) {
  if (Op.includes(e))
    continue;
  const { channels: t } = Ne[e];
  be.prototype[e] = function(...n) {
    return this.model === e ? new be(this) : n.length > 0 ? new be(n, e) : new be([...dT(Ne[this.model][e].raw(this.color)), this.valpha], e);
  }, be[e] = function(...n) {
    let r = n[0];
    return typeof r == "number" && (r = Es(n, t)), new be(r, e);
  };
}
function uT(e, t) {
  return Number(e.toFixed(t));
}
function pT(e) {
  return function(t) {
    return uT(t, e);
  };
}
function ae(e, t, n) {
  e = Array.isArray(e) ? e : [e];
  for (const r of e)
    (Rn[r] || (Rn[r] = []))[t] = n;
  return e = e[0], function(r) {
    let i;
    return r !== void 0 ? (n && (r = n(r)), i = this[e](), i.color[t] = r, i) : (i = this[e]().color[t], n && (i = n(i)), i);
  };
}
function fe(e) {
  return function(t) {
    return Math.max(0, Math.min(e, t));
  };
}
function dT(e) {
  return Array.isArray(e) ? e : [e];
}
function Es(e, t) {
  for (let n = 0; n < t; n++)
    typeof e[n] != "number" && (e[n] = 0);
  return e;
}
var fT = be, mT = Q2.default;
const hT = /* @__PURE__ */ Nt(mT);
/*!
  Copyright 2013 Lovell Fuller and others.
  SPDX-License-Identifier: Apache-2.0
*/
const Fc = {
  multiband: "multiband",
  "b-w": "b-w",
  bw: "b-w",
  cmyk: "cmyk",
  srgb: "srgb"
};
function gT(e) {
  return this._setBackgroundColourOption("tint", e), this;
}
function vT(e) {
  return this.options.greyscale = o.bool(e) ? e : !0, this;
}
function bT(e) {
  return this.greyscale(e);
}
function xT(e) {
  if (!o.string(e))
    throw o.invalidParameterError("colourspace", "string", e);
  return this.options.colourspacePipeline = e, this;
}
function yT(e) {
  return this.pipelineColourspace(e);
}
function wT(e) {
  if (!o.string(e))
    throw o.invalidParameterError("colourspace", "string", e);
  return this.options.colourspace = e, this;
}
function ET(e) {
  return this.toColourspace(e);
}
function $p(e) {
  if (o.object(e) || o.string(e) && e.length >= 3 && e.length <= 200) {
    const t = hT(e);
    return [
      t.red(),
      t.green(),
      t.blue(),
      Math.round(t.alpha() * 255)
    ];
  } else
    throw o.invalidParameterError("background", "object or string", e);
}
function _T(e, t) {
  o.defined(t) && (this.options[e] = $p(t));
}
const ST = (e) => {
  Object.assign(e.prototype, {
    // Public
    tint: gT,
    greyscale: vT,
    grayscale: bT,
    pipelineColourspace: xT,
    pipelineColorspace: yT,
    toColourspace: wT,
    toColorspace: ET,
    // Private
    _getBackgroundColourOption: $p,
    _setBackgroundColourOption: _T
  }), e.colourspace = Fc, e.colorspace = Fc;
};
/*!
  Copyright 2013 Lovell Fuller and others.
  SPDX-License-Identifier: Apache-2.0
*/
const AT = {
  and: "and",
  or: "or",
  eor: "eor"
};
function kT() {
  return this.options.removeAlpha = !0, this;
}
function TT(e) {
  if (o.defined(e))
    if (o.number(e) && o.inRange(e, 0, 1))
      this.options.ensureAlpha = e;
    else
      throw o.invalidParameterError("alpha", "number between 0 and 1", e);
  else
    this.options.ensureAlpha = 1;
  return this;
}
function PT(e) {
  const t = { red: 0, green: 1, blue: 2, alpha: 3 };
  if (Object.keys(t).includes(e) && (e = t[e]), o.integer(e) && o.inRange(e, 0, 4))
    this.options.extractChannel = e;
  else
    throw o.invalidParameterError("channel", "integer or one of: red, green, blue, alpha", e);
  return this;
}
function RT(e, t) {
  return Array.isArray(e) ? e.forEach(function(n) {
    this.options.joinChannelIn.push(this._createInputDescriptor(n, t));
  }, this) : this.options.joinChannelIn.push(this._createInputDescriptor(e, t)), this;
}
function jT(e) {
  if (o.string(e) && o.inArray(e, ["and", "or", "eor"]))
    this.options.bandBoolOp = e;
  else
    throw o.invalidParameterError("boolOp", "one of: and, or, eor", e);
  return this;
}
const IT = (e) => {
  Object.assign(e.prototype, {
    // Public instance functions
    removeAlpha: kT,
    ensureAlpha: TT,
    extractChannel: PT,
    joinChannel: RT,
    bandbool: jT
  }), e.bool = AT;
};
/*!
  Copyright 2013 Lovell Fuller and others.
  SPDX-License-Identifier: Apache-2.0
*/
const Uc = /* @__PURE__ */ new Map([
  ["heic", "heif"],
  ["heif", "heif"],
  ["avif", "avif"],
  ["jpeg", "jpeg"],
  ["jpg", "jpeg"],
  ["jpe", "jpeg"],
  ["tile", "tile"],
  ["dz", "tile"],
  ["png", "png"],
  ["raw", "raw"],
  ["tiff", "tiff"],
  ["tif", "tiff"],
  ["webp", "webp"],
  ["gif", "gif"],
  ["jp2", "jp2"],
  ["jpx", "jp2"],
  ["j2k", "jp2"],
  ["j2c", "jp2"],
  ["jxl", "jxl"]
]), OT = /\.(jp[2x]|j2[kc])$/i, Np = () => new Error("JP2 output requires libvips with support for OpenJPEG"), Cp = (e) => 1 << 31 - Math.clz32(Math.ceil(Math.log2(e)));
function $T(e, t) {
  let n;
  if (o.string(e) ? o.string(this.options.input.file) && Y.resolve(this.options.input.file) === Y.resolve(e) ? n = new Error("Cannot use same file for input and output") : OT.test(Y.extname(e)) && !this.constructor.format.jp2.output.file && (n = Np()) : n = new Error("Missing output file path"), n)
    if (o.fn(t))
      t(n);
    else
      return Promise.reject(n);
  else {
    this.options.fileOut = e;
    const r = Error();
    return this._pipeline(t, r);
  }
  return this;
}
function NT(e, t) {
  o.object(e) ? this._setBooleanOption("resolveWithObject", e.resolveWithObject) : this.options.resolveWithObject && (this.options.resolveWithObject = !1), this.options.fileOut = "";
  const n = Error();
  return this._pipeline(o.fn(e) ? e : t, n);
}
function CT() {
  this.options.resolveWithObject = !0, this.options.typedArrayOut = !0;
  const e = Error();
  return this._pipeline(null, e);
}
function LT(e) {
  if (o.number(e) && e > 0)
    this.options.withMetadataDensity = e;
  else
    throw o.invalidParameterError("density", "positive number", e);
  return this.keepExif();
}
function DT() {
  return this.options.keepMetadata |= 1, this;
}
function zT(e) {
  if (o.object(e))
    for (const [t, n] of Object.entries(e))
      if (o.object(n))
        for (const [r, i] of Object.entries(n))
          if (o.string(i))
            this.options.withExif[`exif-${t.toLowerCase()}-${r}`] = i;
          else
            throw o.invalidParameterError(`${t}.${r}`, "string", i);
      else
        throw o.invalidParameterError(t, "object", n);
  else
    throw o.invalidParameterError("exif", "object", e);
  return this.options.withExifMerge = !1, this.keepExif();
}
function FT(e) {
  return this.withExif(e), this.options.withExifMerge = !0, this;
}
function UT() {
  return this.options.keepMetadata |= 8, this;
}
function BT(e, t) {
  if (o.string(e))
    this.options.withIccProfile = e;
  else
    throw o.invalidParameterError("icc", "string", e);
  if (this.keepIccProfile(), o.object(t) && o.defined(t.attach))
    if (o.bool(t.attach))
      t.attach || (this.options.keepMetadata &= -9);
    else
      throw o.invalidParameterError("attach", "boolean", t.attach);
  return this;
}
function MT() {
  return this.options.keepGainMap = !0, this.options.withGainMap = !1, this.options.keepMetadata |= 32, this;
}
function qT() {
  return this.options.withGainMap = !0, this.options.keepGainMap = !1, this.options.colourspace = "scrgb", this;
}
function HT() {
  return this.options.keepMetadata |= 2, this;
}
function VT(e) {
  if (o.string(e) && e.length > 0)
    this.options.withXmp = e, this.options.keepMetadata |= 2;
  else
    throw o.invalidParameterError("xmp", "non-empty string", e);
  return this;
}
function ZT() {
  return this.options.keepMetadata |= 31, this;
}
function WT(e) {
  if (this.keepMetadata(), this.withIccProfile("srgb"), o.object(e)) {
    if (o.defined(e.orientation))
      if (o.integer(e.orientation) && o.inRange(e.orientation, 1, 8))
        this.options.withMetadataOrientation = e.orientation;
      else
        throw o.invalidParameterError("orientation", "integer between 1 and 8", e.orientation);
    if (o.defined(e.density))
      if (o.number(e.density) && e.density > 0)
        this.options.withMetadataDensity = e.density;
      else
        throw o.invalidParameterError("density", "positive number", e.density);
    o.defined(e.icc) && this.withIccProfile(e.icc), o.defined(e.exif) && this.withExifMerge(e.exif);
  }
  return this;
}
function GT(e, t) {
  const n = Uc.get((o.object(e) && o.string(e.id) ? e.id : e).toLowerCase());
  if (!n)
    throw o.invalidParameterError("format", `one of: ${[...Uc.keys()].join(", ")}`, e);
  return this[n](t);
}
function JT(e) {
  if (o.object(e)) {
    if (o.defined(e.quality))
      if (o.integer(e.quality) && o.inRange(e.quality, 1, 100))
        this.options.jpegQuality = e.quality;
      else
        throw o.invalidParameterError("quality", "integer between 1 and 100", e.quality);
    if (o.defined(e.progressive) && this._setBooleanOption("jpegProgressive", e.progressive), o.defined(e.chromaSubsampling))
      if (o.string(e.chromaSubsampling) && o.inArray(e.chromaSubsampling, ["4:2:0", "4:4:4"]))
        this.options.jpegChromaSubsampling = e.chromaSubsampling;
      else
        throw o.invalidParameterError("chromaSubsampling", "one of: 4:2:0, 4:4:4", e.chromaSubsampling);
    const t = o.bool(e.optimizeCoding) ? e.optimizeCoding : e.optimiseCoding;
    if (o.defined(t) && this._setBooleanOption("jpegOptimiseCoding", t), o.defined(e.mozjpeg))
      if (o.bool(e.mozjpeg))
        e.mozjpeg && (this.options.jpegTrellisQuantisation = !0, this.options.jpegOvershootDeringing = !0, this.options.jpegOptimiseScans = !0, this.options.jpegProgressive = !0, this.options.jpegQuantisationTable = 3);
      else
        throw o.invalidParameterError("mozjpeg", "boolean", e.mozjpeg);
    const n = o.bool(e.trellisQuantization) ? e.trellisQuantization : e.trellisQuantisation;
    o.defined(n) && this._setBooleanOption("jpegTrellisQuantisation", n), o.defined(e.overshootDeringing) && this._setBooleanOption("jpegOvershootDeringing", e.overshootDeringing);
    const r = o.bool(e.optimizeScans) ? e.optimizeScans : e.optimiseScans;
    o.defined(r) && (this._setBooleanOption("jpegOptimiseScans", r), r && (this.options.jpegProgressive = !0));
    const i = o.number(e.quantizationTable) ? e.quantizationTable : e.quantisationTable;
    if (o.defined(i))
      if (o.integer(i) && o.inRange(i, 0, 8))
        this.options.jpegQuantisationTable = i;
      else
        throw o.invalidParameterError("quantisationTable", "integer between 0 and 8", i);
  }
  return this._updateFormatOut("jpeg", e);
}
function KT(e) {
  if (o.object(e)) {
    if (o.defined(e.progressive) && this._setBooleanOption("pngProgressive", e.progressive), o.defined(e.compressionLevel))
      if (o.integer(e.compressionLevel) && o.inRange(e.compressionLevel, 0, 9))
        this.options.pngCompressionLevel = e.compressionLevel;
      else
        throw o.invalidParameterError("compressionLevel", "integer between 0 and 9", e.compressionLevel);
    o.defined(e.adaptiveFiltering) && this._setBooleanOption("pngAdaptiveFiltering", e.adaptiveFiltering);
    const t = e.colours || e.colors;
    if (o.defined(t))
      if (o.integer(t) && o.inRange(t, 2, 256))
        this.options.pngBitdepth = Cp(t);
      else
        throw o.invalidParameterError("colours", "integer between 2 and 256", t);
    if (o.defined(e.palette) ? this._setBooleanOption("pngPalette", e.palette) : [e.quality, e.effort, e.colours, e.colors, e.dither].some(o.defined) && this._setBooleanOption("pngPalette", !0), this.options.pngPalette) {
      if (o.defined(e.quality))
        if (o.integer(e.quality) && o.inRange(e.quality, 0, 100))
          this.options.pngQuality = e.quality;
        else
          throw o.invalidParameterError("quality", "integer between 0 and 100", e.quality);
      if (o.defined(e.effort))
        if (o.integer(e.effort) && o.inRange(e.effort, 1, 10))
          this.options.pngEffort = e.effort;
        else
          throw o.invalidParameterError("effort", "integer between 1 and 10", e.effort);
      if (o.defined(e.dither))
        if (o.number(e.dither) && o.inRange(e.dither, 0, 1))
          this.options.pngDither = e.dither;
        else
          throw o.invalidParameterError("dither", "number between 0.0 and 1.0", e.dither);
    }
  }
  return this._updateFormatOut("png", e);
}
function XT(e) {
  if (o.object(e)) {
    if (o.defined(e.quality))
      if (o.integer(e.quality) && o.inRange(e.quality, 1, 100))
        this.options.webpQuality = e.quality;
      else
        throw o.invalidParameterError("quality", "integer between 1 and 100", e.quality);
    if (o.defined(e.alphaQuality))
      if (o.integer(e.alphaQuality) && o.inRange(e.alphaQuality, 0, 100))
        this.options.webpAlphaQuality = e.alphaQuality;
      else
        throw o.invalidParameterError("alphaQuality", "integer between 0 and 100", e.alphaQuality);
    if (o.defined(e.lossless) && this._setBooleanOption("webpLossless", e.lossless), o.defined(e.nearLossless) && this._setBooleanOption("webpNearLossless", e.nearLossless), o.defined(e.smartSubsample) && this._setBooleanOption("webpSmartSubsample", e.smartSubsample), o.defined(e.smartDeblock) && this._setBooleanOption("webpSmartDeblock", e.smartDeblock), o.defined(e.preset))
      if (o.string(e.preset) && o.inArray(e.preset, ["default", "photo", "picture", "drawing", "icon", "text"]))
        this.options.webpPreset = e.preset;
      else
        throw o.invalidParameterError("preset", "one of: default, photo, picture, drawing, icon, text", e.preset);
    if (o.defined(e.effort))
      if (o.integer(e.effort) && o.inRange(e.effort, 0, 6))
        this.options.webpEffort = e.effort;
      else
        throw o.invalidParameterError("effort", "integer between 0 and 6", e.effort);
    o.defined(e.minSize) && this._setBooleanOption("webpMinSize", e.minSize), o.defined(e.mixed) && this._setBooleanOption("webpMixed", e.mixed), o.defined(e.exact) && this._setBooleanOption("webpExact", e.exact);
  }
  return ya(e, this.options), this._updateFormatOut("webp", e);
}
function YT(e) {
  if (o.object(e)) {
    o.defined(e.reuse) && this._setBooleanOption("gifReuse", e.reuse), o.defined(e.progressive) && this._setBooleanOption("gifProgressive", e.progressive);
    const t = e.colours || e.colors;
    if (o.defined(t))
      if (o.integer(t) && o.inRange(t, 2, 256))
        this.options.gifBitdepth = Cp(t);
      else
        throw o.invalidParameterError("colours", "integer between 2 and 256", t);
    if (o.defined(e.effort))
      if (o.number(e.effort) && o.inRange(e.effort, 1, 10))
        this.options.gifEffort = e.effort;
      else
        throw o.invalidParameterError("effort", "integer between 1 and 10", e.effort);
    if (o.defined(e.dither))
      if (o.number(e.dither) && o.inRange(e.dither, 0, 1))
        this.options.gifDither = e.dither;
      else
        throw o.invalidParameterError("dither", "number between 0.0 and 1.0", e.dither);
    if (o.defined(e.interFrameMaxError))
      if (o.number(e.interFrameMaxError) && o.inRange(e.interFrameMaxError, 0, 32))
        this.options.gifInterFrameMaxError = e.interFrameMaxError;
      else
        throw o.invalidParameterError("interFrameMaxError", "number between 0.0 and 32.0", e.interFrameMaxError);
    if (o.defined(e.interPaletteMaxError))
      if (o.number(e.interPaletteMaxError) && o.inRange(e.interPaletteMaxError, 0, 256))
        this.options.gifInterPaletteMaxError = e.interPaletteMaxError;
      else
        throw o.invalidParameterError("interPaletteMaxError", "number between 0.0 and 256.0", e.interPaletteMaxError);
    if (o.defined(e.keepDuplicateFrames))
      if (o.bool(e.keepDuplicateFrames))
        this._setBooleanOption("gifKeepDuplicateFrames", e.keepDuplicateFrames);
      else
        throw o.invalidParameterError("keepDuplicateFrames", "boolean", e.keepDuplicateFrames);
  }
  return ya(e, this.options), this._updateFormatOut("gif", e);
}
function QT(e) {
  if (!this.constructor.format.jp2.output.buffer)
    throw Np();
  if (o.object(e)) {
    if (o.defined(e.quality))
      if (o.integer(e.quality) && o.inRange(e.quality, 1, 100))
        this.options.jp2Quality = e.quality;
      else
        throw o.invalidParameterError("quality", "integer between 1 and 100", e.quality);
    if (o.defined(e.lossless))
      if (o.bool(e.lossless))
        this.options.jp2Lossless = e.lossless;
      else
        throw o.invalidParameterError("lossless", "boolean", e.lossless);
    if (o.defined(e.tileWidth))
      if (o.integer(e.tileWidth) && o.inRange(e.tileWidth, 1, 32768))
        this.options.jp2TileWidth = e.tileWidth;
      else
        throw o.invalidParameterError("tileWidth", "integer between 1 and 32768", e.tileWidth);
    if (o.defined(e.tileHeight))
      if (o.integer(e.tileHeight) && o.inRange(e.tileHeight, 1, 32768))
        this.options.jp2TileHeight = e.tileHeight;
      else
        throw o.invalidParameterError("tileHeight", "integer between 1 and 32768", e.tileHeight);
    if (o.defined(e.chromaSubsampling))
      if (o.string(e.chromaSubsampling) && o.inArray(e.chromaSubsampling, ["4:2:0", "4:4:4"]))
        this.options.jp2ChromaSubsampling = e.chromaSubsampling;
      else
        throw o.invalidParameterError("chromaSubsampling", "one of: 4:2:0, 4:4:4", e.chromaSubsampling);
  }
  return this._updateFormatOut("jp2", e);
}
function ya(e, t) {
  if (o.object(e) && o.defined(e.loop))
    if (o.integer(e.loop) && o.inRange(e.loop, 0, 65535))
      t.loop = e.loop;
    else
      throw o.invalidParameterError("loop", "integer between 0 and 65535", e.loop);
  if (o.object(e) && o.defined(e.delay))
    if (o.integer(e.delay) && o.inRange(e.delay, 0, 65535))
      t.delay = [e.delay];
    else if (Array.isArray(e.delay) && e.delay.every(o.integer) && e.delay.every((n) => o.inRange(n, 0, 65535)))
      t.delay = e.delay;
    else
      throw o.invalidParameterError("delay", "integer or an array of integers between 0 and 65535", e.delay);
}
function eP(e) {
  if (o.object(e)) {
    if (o.defined(e.quality))
      if (o.integer(e.quality) && o.inRange(e.quality, 1, 100))
        this.options.tiffQuality = e.quality;
      else
        throw o.invalidParameterError("quality", "integer between 1 and 100", e.quality);
    if (o.defined(e.bitdepth))
      if (o.integer(e.bitdepth) && o.inArray(e.bitdepth, [1, 2, 4]))
        this.options.tiffBitdepth = e.bitdepth;
      else
        throw o.invalidParameterError("bitdepth", "1, 2 or 4", e.bitdepth);
    if (o.defined(e.tile) && this._setBooleanOption("tiffTile", e.tile), o.defined(e.tileWidth))
      if (o.integer(e.tileWidth) && e.tileWidth > 0)
        this.options.tiffTileWidth = e.tileWidth;
      else
        throw o.invalidParameterError("tileWidth", "integer greater than zero", e.tileWidth);
    if (o.defined(e.tileHeight))
      if (o.integer(e.tileHeight) && e.tileHeight > 0)
        this.options.tiffTileHeight = e.tileHeight;
      else
        throw o.invalidParameterError("tileHeight", "integer greater than zero", e.tileHeight);
    if (o.defined(e.miniswhite) && this._setBooleanOption("tiffMiniswhite", e.miniswhite), o.defined(e.pyramid) && this._setBooleanOption("tiffPyramid", e.pyramid), o.defined(e.xres))
      if (o.number(e.xres) && e.xres > 0)
        this.options.tiffXres = e.xres;
      else
        throw o.invalidParameterError("xres", "number greater than zero", e.xres);
    if (o.defined(e.yres))
      if (o.number(e.yres) && e.yres > 0)
        this.options.tiffYres = e.yres;
      else
        throw o.invalidParameterError("yres", "number greater than zero", e.yres);
    if (o.defined(e.compression))
      if (o.string(e.compression) && o.inArray(e.compression, ["none", "jpeg", "deflate", "packbits", "ccittfax4", "lzw", "webp", "zstd", "jp2k"]))
        this.options.tiffCompression = e.compression;
      else
        throw o.invalidParameterError("compression", "one of: none, jpeg, deflate, packbits, ccittfax4, lzw, webp, zstd, jp2k", e.compression);
    if (o.defined(e.bigtiff) && this._setBooleanOption("tiffBigtiff", e.bigtiff), o.defined(e.predictor))
      if (o.string(e.predictor) && o.inArray(e.predictor, ["none", "horizontal", "float"]))
        this.options.tiffPredictor = e.predictor;
      else
        throw o.invalidParameterError("predictor", "one of: none, horizontal, float", e.predictor);
    if (o.defined(e.resolutionUnit))
      if (o.string(e.resolutionUnit) && o.inArray(e.resolutionUnit, ["inch", "cm"]))
        this.options.tiffResolutionUnit = e.resolutionUnit;
      else
        throw o.invalidParameterError("resolutionUnit", "one of: inch, cm", e.resolutionUnit);
  }
  return this._updateFormatOut("tiff", e);
}
function tP(e) {
  return this.heif({ ...e, compression: "av1" });
}
function nP(e) {
  if (o.object(e)) {
    if (o.string(e.compression) && o.inArray(e.compression, ["av1", "hevc"]))
      this.options.heifCompression = e.compression;
    else
      throw o.invalidParameterError("compression", "one of: av1, hevc", e.compression);
    if (o.defined(e.quality))
      if (o.integer(e.quality) && o.inRange(e.quality, 1, 100))
        this.options.heifQuality = e.quality;
      else
        throw o.invalidParameterError("quality", "integer between 1 and 100", e.quality);
    if (o.defined(e.lossless))
      if (o.bool(e.lossless))
        this.options.heifLossless = e.lossless;
      else
        throw o.invalidParameterError("lossless", "boolean", e.lossless);
    if (o.defined(e.effort))
      if (o.integer(e.effort) && o.inRange(e.effort, 0, 9))
        this.options.heifEffort = e.effort;
      else
        throw o.invalidParameterError("effort", "integer between 0 and 9", e.effort);
    if (o.defined(e.chromaSubsampling))
      if (o.string(e.chromaSubsampling) && o.inArray(e.chromaSubsampling, ["4:2:0", "4:4:4"]))
        this.options.heifChromaSubsampling = e.chromaSubsampling;
      else
        throw o.invalidParameterError("chromaSubsampling", "one of: 4:2:0, 4:4:4", e.chromaSubsampling);
    if (o.defined(e.bitdepth))
      if (o.integer(e.bitdepth) && o.inArray(e.bitdepth, [8, 10, 12]))
        this.options.heifBitdepth = e.bitdepth;
      else
        throw o.invalidParameterError("bitdepth", "8, 10 or 12", e.bitdepth);
    if (o.defined(e.tune))
      if (o.string(e.tune) && o.inArray(e.tune, ["auto", "iq", "psnr", "ssim"]))
        this.options.heifLossless && e.tune === "iq" ? this.options.heifTune = "ssim" : this.options.heifTune = e.tune;
      else
        throw o.invalidParameterError("tune", "one of: auto, iq, psnr, ssim", e.tune);
  } else
    throw o.invalidParameterError("options", "Object", e);
  return this._updateFormatOut("heif", e);
}
function rP(e) {
  if (o.object(e)) {
    if (o.defined(e.quality))
      if (o.integer(e.quality) && o.inRange(e.quality, 1, 100))
        this.options.jxlDistance = e.quality >= 30 ? 0.1 + (100 - e.quality) * 0.09 : 53 / 3e3 * e.quality * e.quality - 23 / 20 * e.quality + 25;
      else
        throw o.invalidParameterError("quality", "integer between 1 and 100", e.quality);
    else if (o.defined(e.distance))
      if (o.number(e.distance) && o.inRange(e.distance, 0, 15))
        this.options.jxlDistance = e.distance;
      else
        throw o.invalidParameterError("distance", "number between 0.0 and 15.0", e.distance);
    if (o.defined(e.decodingTier))
      if (o.integer(e.decodingTier) && o.inRange(e.decodingTier, 0, 4))
        this.options.jxlDecodingTier = e.decodingTier;
      else
        throw o.invalidParameterError("decodingTier", "integer between 0 and 4", e.decodingTier);
    if (o.defined(e.lossless))
      if (o.bool(e.lossless))
        this.options.jxlLossless = e.lossless;
      else
        throw o.invalidParameterError("lossless", "boolean", e.lossless);
    if (o.defined(e.effort))
      if (o.integer(e.effort) && o.inRange(e.effort, 1, 9))
        this.options.jxlEffort = e.effort;
      else
        throw o.invalidParameterError("effort", "integer between 1 and 9", e.effort);
  }
  return ya(e, this.options), this._updateFormatOut("jxl", e);
}
function iP(e) {
  if (o.object(e) && o.defined(e.depth))
    if (o.string(e.depth) && o.inArray(
      e.depth,
      ["char", "uchar", "short", "ushort", "int", "uint", "float", "complex", "double", "dpcomplex"]
    ))
      this.options.rawDepth = e.depth;
    else
      throw o.invalidParameterError("depth", "one of: char, uchar, short, ushort, int, uint, float, complex, double, dpcomplex", e.depth);
  return this._updateFormatOut("raw");
}
function sP(e) {
  if (o.object(e)) {
    if (o.defined(e.size))
      if (o.integer(e.size) && o.inRange(e.size, 1, 8192))
        this.options.tileSize = e.size;
      else
        throw o.invalidParameterError("size", "integer between 1 and 8192", e.size);
    if (o.defined(e.overlap))
      if (o.integer(e.overlap) && o.inRange(e.overlap, 0, 8192)) {
        if (e.overlap > this.options.tileSize)
          throw o.invalidParameterError("overlap", `<= size (${this.options.tileSize})`, e.overlap);
        this.options.tileOverlap = e.overlap;
      } else
        throw o.invalidParameterError("overlap", "integer between 0 and 8192", e.overlap);
    if (o.defined(e.container))
      if (o.string(e.container) && o.inArray(e.container, ["fs", "zip"]))
        this.options.tileContainer = e.container;
      else
        throw o.invalidParameterError("container", "one of: fs, zip", e.container);
    if (o.defined(e.layout))
      if (o.string(e.layout) && o.inArray(e.layout, ["dz", "google", "iiif", "iiif3", "zoomify"]))
        this.options.tileLayout = e.layout;
      else
        throw o.invalidParameterError("layout", "one of: dz, google, iiif, iiif3, zoomify", e.layout);
    if (o.defined(e.angle))
      if (o.integer(e.angle) && !(e.angle % 90))
        this.options.tileAngle = e.angle;
      else
        throw o.invalidParameterError("angle", "positive/negative multiple of 90", e.angle);
    if (this._setBackgroundColourOption("tileBackground", e.background), o.defined(e.depth))
      if (o.string(e.depth) && o.inArray(e.depth, ["onepixel", "onetile", "one"]))
        this.options.tileDepth = e.depth;
      else
        throw o.invalidParameterError("depth", "one of: onepixel, onetile, one", e.depth);
    if (o.defined(e.skipBlanks))
      if (o.integer(e.skipBlanks) && o.inRange(e.skipBlanks, -1, 65535))
        this.options.tileSkipBlanks = e.skipBlanks;
      else
        throw o.invalidParameterError("skipBlanks", "integer between -1 and 255/65535", e.skipBlanks);
    else o.defined(e.layout) && e.layout === "google" && (this.options.tileSkipBlanks = 5);
    const t = o.bool(e.center) ? e.center : e.centre;
    if (o.defined(t) && this._setBooleanOption("tileCentre", t), o.defined(e.id))
      if (o.string(e.id))
        this.options.tileId = e.id;
      else
        throw o.invalidParameterError("id", "string", e.id);
    if (o.defined(e.basename))
      if (o.string(e.basename))
        this.options.tileBasename = e.basename;
      else
        throw o.invalidParameterError("basename", "string", e.basename);
  }
  if (o.inArray(this.options.formatOut, ["jpeg", "png", "webp"]))
    this.options.tileFormat = this.options.formatOut;
  else if (this.options.formatOut !== "input")
    throw o.invalidParameterError("format", "one of: jpeg, png, webp", this.options.formatOut);
  return this._updateFormatOut("dz");
}
function aP(e) {
  if (!o.plainObject(e))
    throw o.invalidParameterError("options", "object", e);
  if (o.integer(e.seconds) && o.inRange(e.seconds, 0, 3600))
    this.options.timeoutSeconds = e.seconds;
  else
    throw o.invalidParameterError("seconds", "integer between 0 and 3600", e.seconds);
  return this;
}
function oP(e, t) {
  return o.object(t) && t.force === !1 || (this.options.formatOut = e), this;
}
function cP(e, t) {
  if (o.bool(t))
    this.options[e] = t;
  else
    throw o.invalidParameterError(e, "boolean", t);
}
function lP() {
  if (!this.options.streamOut) {
    this.options.streamOut = !0;
    const e = Error();
    this._pipeline(void 0, e);
  }
}
function uP(e, t) {
  return typeof e == "function" ? (this._isStreamInput() ? this.on("finish", () => {
    this._flattenBufferIn(), Z.pipeline(this.options, (n, r, i) => {
      n ? e(o.nativeError(n, t)) : e(null, r, i);
    });
  }) : Z.pipeline(this.options, (n, r, i) => {
    n ? e(o.nativeError(n, t)) : e(null, r, i);
  }), this) : this.options.streamOut ? (this._isStreamInput() ? (this.once("finish", () => {
    this._flattenBufferIn(), Z.pipeline(this.options, (n, r, i) => {
      n ? this.emit("error", o.nativeError(n, t)) : (this.emit("info", i), this.push(r)), this.push(null), this.on("end", () => this.emit("close"));
    });
  }), this.streamInFinished && this.emit("finish")) : Z.pipeline(this.options, (n, r, i) => {
    n ? this.emit("error", o.nativeError(n, t)) : (this.emit("info", i), this.push(r)), this.push(null), this.on("end", () => this.emit("close"));
  }), this) : this._isStreamInput() ? new Promise((n, r) => {
    this.once("finish", () => {
      this._flattenBufferIn(), Z.pipeline(this.options, (i, s, a) => {
        i ? r(o.nativeError(i, t)) : this.options.resolveWithObject ? n({ data: s, info: a }) : n(s);
      });
    });
  }) : new Promise((n, r) => {
    Z.pipeline(this.options, (i, s, a) => {
      i ? r(o.nativeError(i, t)) : this.options.resolveWithObject ? n({ data: s, info: a }) : n(s);
    });
  });
}
const pP = (e) => {
  Object.assign(e.prototype, {
    // Public
    toFile: $T,
    toBuffer: NT,
    toUint8Array: CT,
    withDensity: LT,
    keepExif: DT,
    withExif: zT,
    withExifMerge: FT,
    keepIccProfile: UT,
    withIccProfile: BT,
    keepGainMap: MT,
    withGainMap: qT,
    keepXmp: HT,
    withXmp: VT,
    keepMetadata: ZT,
    withMetadata: WT,
    toFormat: GT,
    jpeg: JT,
    jp2: QT,
    png: KT,
    webp: XT,
    tiff: eP,
    avif: tP,
    heif: nP,
    jxl: rP,
    gif: YT,
    raw: iP,
    tile: sP,
    timeout: aP,
    // Private
    _updateFormatOut: oP,
    _setBooleanOption: cP,
    _read: lP,
    _pipeline: uP
  });
};
/*!
  Copyright 2013 Lovell Fuller and others.
  SPDX-License-Identifier: Apache-2.0
*/
const Xi = Jc(import.meta.url), Bc = wp.runtimePlatformArch(), _s = Z.libvipsVersion(), mt = Z.format();
mt.heif.output.alias = ["avif", "heic"];
mt.jpeg.output.alias = ["jpe", "jpg"];
mt.tiff.output.alias = ["tif"];
mt.jp2.output.alias = ["j2c", "j2k", "jp2", "jpx"];
const dP = {
  /** [Nearest neighbour interpolation](http://en.wikipedia.org/wiki/Nearest-neighbor_interpolation). Suitable for image enlargement only. */
  nearest: "nearest",
  /** [Bilinear interpolation](http://en.wikipedia.org/wiki/Bilinear_interpolation). Faster than bicubic but with less smooth results. */
  bilinear: "bilinear",
  /** [Bicubic interpolation](http://en.wikipedia.org/wiki/Bicubic_interpolation) (the default). */
  bicubic: "bicubic",
  /** [LBB interpolation](https://github.com/libvips/libvips/blob/master/libvips/resample/lbb.cpp#L100). Prevents some "[acutance](http://en.wikipedia.org/wiki/Acutance)" but typically reduces performance by a factor of 2. */
  locallyBoundedBicubic: "lbb",
  /** [Nohalo interpolation](http://eprints.soton.ac.uk/268086/). Prevents acutance but typically reduces performance by a factor of 3. */
  nohalo: "nohalo",
  /** [VSQBS interpolation](https://github.com/libvips/libvips/blob/master/libvips/resample/vsqbs.cpp#L48). Prevents "staircasing" when enlarging. */
  vertexSplitQuadraticBasisSpline: "vsqbs"
};
let sn = {
  vips: _s.semver
};
if (!_s.isGlobal)
  if (_s.isWasm)
    try {
      sn = Xi("@img/sharp-wasm32/versions");
    } catch {
    }
  else
    try {
      sn = Xi(`@img/sharp-${Bc}/versions`);
    } catch {
      try {
        sn = Xi(`@img/sharp-libvips-${Bc}/versions`);
      } catch {
      }
    }
sn.sharp = pn.version;
sn.heif && mt.heif && (mt.heif.input.fileSuffix = [".avif"], mt.heif.output.alias = ["avif"]);
function Lp(e) {
  return o.bool(e) ? e ? Z.cache(50, 20, 100) : Z.cache(0, 0, 0) : o.object(e) ? Z.cache(e.memory, e.files, e.items) : Z.cache();
}
Lp(!0);
function fP(e) {
  return Z.concurrency(o.integer(e) ? e : null);
}
Yt.familySync() === Yt.GLIBC && !Z._isUsingJemalloc() ? Z.concurrency(1) : Yt.familySync() === Yt.MUSL && Z.concurrency() === 1024 && Z.concurrency(rd());
const mP = new nd.EventEmitter();
function hP() {
  return Z.counters();
}
function gP(e) {
  return Z.simd(o.bool(e) ? e : null);
}
function vP(e) {
  if (o.object(e))
    if (Array.isArray(e.operation) && e.operation.every(o.string))
      Z.block(e.operation, !0);
    else
      throw o.invalidParameterError("operation", "Array<string>", e.operation);
  else
    throw o.invalidParameterError("options", "object", e);
}
function bP(e) {
  if (o.object(e))
    if (Array.isArray(e.operation) && e.operation.every(o.string))
      Z.block(e.operation, !1);
    else
      throw o.invalidParameterError("operation", "Array<string>", e.operation);
  else
    throw o.invalidParameterError("options", "object", e);
}
const xP = (e) => {
  e.cache = Lp, e.concurrency = fP, e.counters = hP, e.simd = gP, e.format = mt, e.interpolators = dP, e.versions = sn, e.queue = mP, e.block = vP, e.unblock = bP;
};
/*!
  Copyright 2013 Lovell Fuller and others.
  SPDX-License-Identifier: Apache-2.0
*/
h2(Se);
E2(Se);
S2(Se);
Z2(Se);
ST(Se);
IT(Se);
pP(Se);
xP(Se);
async function yP(e = 1280, t = 18e4) {
  try {
    const n = Hp.getPrimaryDisplay(), r = n.scaleFactor || 1, i = Math.max(1, Math.round(n.bounds.width * r)), s = Math.max(1, Math.round(n.bounds.height * r)), a = await Vp.getSources({
      types: ["screen"],
      thumbnailSize: { width: i, height: s }
    }), c = a.find((d) => d.display_id === String(n.id)) ?? a.find((d) => d.id.toLowerCase().includes("screen")) ?? a[0];
    if (!c || c.thumbnail.isEmpty())
      return U.warn("screenshot-capture-empty"), null;
    const l = c.thumbnail.toPNG();
    let p = 70, u = await Se(l).resize({ width: e, withoutEnlargement: !0 }).jpeg({ quality: p, mozjpeg: !0 }).toBuffer({ resolveWithObject: !0 });
    for (; u.data.length > t && p > 40; )
      p -= 10, u = await Se(l).resize({ width: e, withoutEnlargement: !0 }).jpeg({ quality: p, mozjpeg: !0 }).toBuffer({ resolveWithObject: !0 });
    return {
      buffer: u.data,
      width: u.info.width,
      height: u.info.height,
      mimeType: "image/jpeg"
    };
  } catch (n) {
    return U.warn("screenshot-capture-failed", {
      error: n instanceof Error ? n.message : "unknown"
    }), null;
  }
}
const _n = 6e4, Yi = 20 * 6e4;
class wP {
  constructor() {
    N(this, "timer", null);
    N(this, "startedAtMs", 0);
    N(this, "bootstrapDone", !1);
    N(this, "context", { projectId: null, sessionId: null });
    N(this, "running", !1);
    N(this, "inFlight", !1);
  }
  start(t, n) {
    this.stop(), this.running = !0, this.context = t, this.startedAtMs = (n == null ? void 0 : n.sessionStartedAtMs) ?? Date.now();
    const r = Math.max(0, Date.now() - this.startedAtMs);
    this.bootstrapDone = r >= _n, this.scheduleNext(), U.info("screenshot-scheduler-started", {
      firstAfterMs: _n,
      everyMs: Yi,
      resumed: !!(n != null && n.sessionStartedAtMs),
      bootstrapDone: this.bootstrapDone
    });
  }
  updateContext(t) {
    this.context = { ...this.context, ...t };
  }
  stop() {
    this.running = !1, this.timer && (clearTimeout(this.timer), this.timer = null);
  }
  scheduleNext() {
    if (!this.running) return;
    this.timer && clearTimeout(this.timer);
    const t = Math.max(0, Date.now() - this.startedAtMs);
    let n;
    if (!this.bootstrapDone)
      n = Math.max(0, _n - t);
    else {
      const r = t - _n, i = Math.floor(r / Yi) + 1, s = _n + i * Yi;
      n = Math.max(0, s - t);
    }
    this.timer = setTimeout(() => {
      this.tick();
    }, n);
  }
  async tick() {
    if (this.running)
      try {
        await this.captureAndUpload(), this.bootstrapDone || (this.bootstrapDone = !0);
      } catch (t) {
        U.warn("screenshot-scheduler-tick-failed", {
          error: t instanceof Error ? t.message : "unknown"
        });
      } finally {
        this.running && this.scheduleNext();
      }
  }
  authOptions() {
    return {
      ...dt(),
      onAuthRefresh: sa
    };
  }
  async captureAndUpload() {
    if (!this.inFlight) {
      this.inFlight = !0;
      try {
        if (!this.context.sessionId)
          try {
            const a = await Pn(this.authOptions());
            a && (this.context.sessionId = a);
          } catch {
          }
        const t = await yP();
        if (!t) return;
        const n = Dn(), r = (/* @__PURE__ */ new Date()).toISOString(), i = {
          uploadUuid: n,
          width: t.width,
          height: t.height,
          source: "landev-tracker-v2",
          sessionBootstrap: !this.bootstrapDone
        }, s = {
          capturedAt: r,
          imageBytes: t.buffer,
          mimeType: t.mimeType,
          projectId: this.context.projectId,
          sessionId: this.context.sessionId ?? void 0,
          metadata: i
        };
        try {
          await mc(s, this.authOptions()), U.info("screenshot-uploaded", { uploadUuid: n, bytes: t.buffer.length });
        } catch (a) {
          const c = Y.join(o1(), `${n}.jpg`);
          ce.writeFileSync(c, t.buffer), i1({
            uploadUuid: n,
            capturedAt: r,
            filePath: c,
            mimeType: t.mimeType,
            projectId: this.context.projectId,
            sessionId: this.context.sessionId,
            metadataJson: JSON.stringify(i)
          }), U.warn("screenshot-queued-offline", {
            uploadUuid: n,
            error: a instanceof Error ? a.message : "unknown"
          });
        }
      } finally {
        this.inFlight = !1;
      }
    }
  }
  async flushQueue() {
    const t = s1(10);
    for (const n of t)
      try {
        if (!ce.existsSync(n.filePath)) {
          oc(n.id);
          continue;
        }
        const r = ce.readFileSync(n.filePath), i = JSON.parse(n.metadataJson);
        let s = n.sessionId;
        s || (s = await Pn(this.authOptions())), await mc(
          {
            capturedAt: n.capturedAt,
            imageBytes: r,
            mimeType: "image/jpeg",
            projectId: n.projectId,
            sessionId: s ?? void 0,
            metadata: { ...i, uploadUuid: n.uploadUuid }
          },
          this.authOptions()
        ), oc(n.id);
        try {
          ce.unlinkSync(n.filePath);
        } catch {
        }
      } catch (r) {
        a1(n.id, n.attempts + 1), U.warn("screenshot-queue-retry", {
          id: n.id,
          attempts: n.attempts + 1,
          error: r instanceof Error ? r.message : "unknown"
        });
      }
  }
}
function Sn() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
function st() {
  return {
    ...dt(),
    onAuthRefresh: sa
  };
}
class EP {
  constructor(t) {
    N(this, "window");
    N(this, "screenshots", new wP());
    N(this, "apps", new A1());
    N(this, "statusPhase", "idle");
    N(this, "stoppedAt", null);
    N(this, "syncTimer", null);
    N(this, "appsPublishTimer", null);
    this.window = t;
  }
  startBackgroundSync() {
    this.syncTimer || (this.syncTimer = setInterval(() => {
      this.screenshots.flushQueue(), this.apps.flushEvents(st());
    }, 3e4), this.appsPublishTimer || (this.appsPublishTimer = setInterval(() => {
      Qe().active === 1 && this.publishStatus();
    }, 5e3)));
  }
  stopBackgroundSync() {
    this.syncTimer && (clearInterval(this.syncTimer), this.syncTimer = null), this.appsPublishTimer && (clearInterval(this.appsPublishTimer), this.appsPublishTimer = null);
  }
  getStatus() {
    const t = Qe();
    return {
      active: t.active === 1,
      sessionId: t.sessionId,
      projectId: t.projectId,
      projectName: t.projectName,
      description: t.description,
      draftDescription: t.draftDescription,
      startedAt: t.startedAt,
      stoppedAt: this.stoppedAt,
      todayCompletedMs: u1(),
      appsUsed: this.apps.getTodayApps(),
      status: t.active === 1 ? this.statusPhase === "starting" ? "starting" : "tracking" : this.statusPhase
    };
  }
  publishStatus() {
    this.window.isDestroyed() || this.window.webContents.send("tracking:status", this.getStatus());
  }
  saveDraftDescription(t) {
    const n = Qe();
    Ar({
      active: n.active,
      draftDescription: t,
      description: n.active === 1 ? t : n.description
    });
  }
  async resumeIfNeeded() {
    const t = Qe();
    if (t.active !== 1 || !t.startedAt)
      return;
    this.statusPhase = "tracking", this.stoppedAt = null;
    const n = Date.parse(t.startedAt);
    this.screenshots.start(
      {
        projectId: t.projectId,
        sessionId: t.sessionId
      },
      {
        sessionStartedAtMs: Number.isFinite(n) ? n : void 0
      }
    ), this.apps.start({
      sessionId: t.sessionId,
      projectId: t.projectId,
      startedAt: t.startedAt,
      clientTimeZone: Sn()
    }), this.publishStatus(), U.info("tracking-session-resumed", {
      sessionId: t.sessionId,
      startedAt: t.startedAt
    });
  }
  async start(t) {
    if (Qe().active === 1)
      throw new Error("A tracking session is already active.");
    const r = t.description.trim();
    if (!t.projectId.trim())
      throw new Error("Select a project before starting.");
    if (r.length < 3)
      throw new Error("Enter a short work description (min 3 characters).");
    this.statusPhase = "starting", this.stoppedAt = null;
    const i = (/* @__PURE__ */ new Date()).toISOString();
    Ar({
      active: 1,
      sessionId: null,
      projectId: t.projectId,
      projectName: t.projectName,
      description: r,
      draftDescription: r,
      startedAt: i
    }), cc(t.projectId, t.projectName, i), this.screenshots.start({
      projectId: t.projectId,
      sessionId: null
    }), this.apps.start({
      sessionId: null,
      projectId: t.projectId,
      startedAt: i,
      clientTimeZone: Sn()
    }), this.publishStatus();
    try {
      let a = (await ac(
        {
          projectId: t.projectId,
          projectName: t.projectName,
          description: r,
          clientTimeZone: Sn(),
          startTimeUtc: i
        },
        st()
      )).sessionId;
      return a || (a = await Pn(st())), Ar({
        active: 1,
        sessionId: a,
        projectId: t.projectId,
        projectName: t.projectName,
        description: r,
        draftDescription: r,
        startedAt: i
      }), this.screenshots.updateContext({ sessionId: a }), this.apps.updateContext({ sessionId: a }), this.statusPhase = "tracking", this.publishStatus(), this.getStatus();
    } catch (s) {
      return U.warn("tracking-start-remote-deferred", {
        error: s instanceof Error ? s.message : "unknown"
      }), this.statusPhase = "tracking", this.publishStatus(), this.getStatus();
    }
  }
  async stop() {
    const t = Qe();
    if (t.active !== 1 || !t.startedAt)
      throw new Error("No active tracking session.");
    this.statusPhase = "stopping", this.publishStatus();
    const n = (/* @__PURE__ */ new Date()).toISOString();
    this.stoppedAt = n;
    const r = Date.parse(t.startedAt), i = Date.parse(n), s = Number.isFinite(r) && Number.isFinite(i) && i > r ? i - r : void 0;
    this.apps.stop(!0), this.screenshots.stop(), await this.screenshots.flushQueue(), await this.apps.flushEvents(st());
    try {
      let a = t.sessionId;
      if (!a)
        try {
          a = (await ac(
            {
              projectId: t.projectId ?? "",
              projectName: t.projectName ?? void 0,
              description: t.description,
              clientTimeZone: Sn(),
              startTimeUtc: t.startedAt
            },
            st()
          )).sessionId ?? await Pn(st());
        } catch {
          a = await Pn(st());
        }
      await WE(
        {
          sessionId: a,
          projectId: t.projectId,
          projectName: t.projectName,
          startedAt: t.startedAt,
          stoppedAt: n,
          durationMs: s,
          clientTimeZone: Sn(),
          description: t.description
        },
        st()
      );
    } catch (a) {
      U.warn("tracking-stop-remote-failed", {
        error: a instanceof Error ? a.message : "unknown"
      });
    }
    return t.projectId && cc(t.projectId, t.projectName ?? t.projectId, n), typeof s == "number" && s > 0 && t.projectId && l1({
      projectId: t.projectId,
      projectName: t.projectName ?? t.projectId,
      startedAt: t.startedAt,
      stoppedAt: n,
      durationMs: s
    }), r1(), this.statusPhase = "idle", this.publishStatus(), this.getStatus();
  }
  listRecentProjects() {
    return c1();
  }
  dispose() {
    this.apps.stop(!1), this.screenshots.stop(), this.stopBackgroundSync();
  }
}
const _P = Fn({
  username: de().min(3),
  password: de().min(6)
}), SP = Fn({
  projectId: de().min(1),
  projectName: de().min(1),
  description: de().trim().min(3).max(2e3)
});
function xr(e) {
  var t;
  return e instanceof Pe ? new Error(e.message) : e instanceof wl ? new Error(((t = e.issues[0]) == null ? void 0 : t.message) ?? "Invalid request.") : e instanceof Error ? e : new Error("Unexpected failure.");
}
function Qi() {
  return {
    ...dt(),
    onAuthRefresh: sa
  };
}
function AP(e) {
  const t = new EP(e);
  t.startBackgroundSync();
  const n = () => {
    t.dispose();
  };
  e.on("closed", n), ie.removeHandler(se.AUTH_LOGIN), ie.removeHandler(se.AUTH_LOGOUT), ie.removeHandler(se.AUTH_STATUS), ie.removeHandler(se.CONNECTION_TEST), ie.removeHandler(se.APP_INFO), ie.removeHandler(se.PROJECTS_LIST), ie.removeHandler(se.TRACKING_STATUS), ie.removeHandler(se.TRACKING_START), ie.removeHandler(se.TRACKING_STOP), ie.removeHandler(se.TRACKING_SAVE_DESCRIPTION), ie.removeHandler(se.RECENT_PROJECTS), ie.handle(se.CONNECTION_TEST, async () => LE()), ie.handle(se.APP_INFO, () => {
    const r = un();
    return {
      appName: J.getName(),
      appVersion: J.getVersion(),
      env: r.VITE_APP_ENV,
      apiBaseUrl: r.VITE_API_BASE_URL
    };
  }), ie.handle(se.AUTH_STATUS, async () => {
    if (!t1())
      return { authenticated: !1, profile: null, tracking: t.getStatus() };
    try {
      if (!(await NE(dt())).authenticated)
        return { authenticated: !1, profile: null, tracking: t.getStatus() };
      const i = await sc(Qi());
      return await t.resumeIfNeeded(), { authenticated: !0, profile: i, tracking: t.getStatus() };
    } catch (r) {
      return U.warn("auth-status-failed", { error: r }), { authenticated: !1, profile: null, tracking: t.getStatus() };
    }
  }), ie.handle(se.AUTH_LOGIN, async (r, i) => {
    try {
      const s = _P.parse(i), a = await Iu(
        { username: s.username, password: s.password },
        dt()
      );
      a.token && Du(a.token), a.sessionCookie && ra(a.sessionCookie), KE(s.username, s.password);
      const c = await sc(Qi());
      return await t.resumeIfNeeded(), { ok: !0, profile: c, tracking: t.getStatus() };
    } catch (s) {
      throw xr(s);
    }
  }), ie.handle(se.AUTH_LOGOUT, async () => {
    try {
      Qe().active === 1 && await t.stop();
    } catch (r) {
      U.warn("logout-stop-failed", { error: r });
    }
    try {
      await CE(dt());
    } catch {
    }
    return zu(), Fu(), YE(), await e1(), { ok: !0 };
  }), ie.handle(se.PROJECTS_LIST, async () => {
    try {
      return { projects: await ZE(Qi()) };
    } catch (r) {
      throw xr(r);
    }
  }), ie.handle(se.TRACKING_STATUS, () => t.getStatus()), ie.handle(se.TRACKING_START, async (r, i) => {
    try {
      const s = SP.parse(i);
      return await t.start(s);
    } catch (s) {
      throw xr(s);
    }
  }), ie.handle(se.TRACKING_STOP, async () => {
    try {
      return await t.stop();
    } catch (r) {
      throw xr(r);
    }
  }), ie.handle(se.TRACKING_SAVE_DESCRIPTION, async (r, i) => {
    const s = de().max(2e3).parse((i == null ? void 0 : i.description) ?? "");
    return t.saveDraftDescription(s), { ok: !0 };
  }), ie.handle(se.RECENT_PROJECTS, () => ({
    projects: t.listRecentProjects()
  })), (na() || ia()) && t.resumeIfNeeded(), U.info("ipc-registered-tracker-v2");
}
var Mc = { VITE_API_BASE_URL: "https://landev.vercel.app", VITE_APP_ENV: "prod", AUTO_UPDATE_ENABLED: "true", UPDATE_FEED_URL: "https://github.com/SamiAbdullatif20/landev-track-app/releases/latest/download" };
function kP() {
  var t, n, r, i;
  if (typeof Mc > "u")
    return;
  const e = Mc;
  (t = process.env.VITE_API_BASE_URL) != null && t.trim() || (process.env.VITE_API_BASE_URL = e.VITE_API_BASE_URL), (n = process.env.VITE_APP_ENV) != null && n.trim() || (process.env.VITE_APP_ENV = e.VITE_APP_ENV), (r = process.env.AUTO_UPDATE_ENABLED) != null && r.trim() || (process.env.AUTO_UPDATE_ENABLED = e.AUTO_UPDATE_ENABLED), (i = process.env.UPDATE_FEED_URL) != null && i.trim() || (process.env.UPDATE_FEED_URL = e.UPDATE_FEED_URL);
}
function TP() {
  U.info("startup-diagnostics", {
    appVersion: J.getVersion(),
    appName: J.getName(),
    platform: process.platform,
    arch: process.arch,
    node: process.versions.node,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    env: process.env.VITE_APP_ENV
  }), process.on("uncaughtException", (e) => {
    U.error("uncaught-exception", { error: e });
  }), process.on("unhandledRejection", (e) => {
    U.error("unhandled-rejection", { reason: e });
  }), J.on("render-process-gone", (e, t, n) => {
    U.error("render-process-gone", { id: t.id, reason: n.reason, exitCode: n.exitCode });
  }), J.on("child-process-gone", (e, t) => {
    U.error("child-process-gone", t);
  });
}
function PP() {
  const t = `.env.${process.env.VITE_APP_ENV ?? (J.isPackaged ? "prod" : "development")}`, n = [
    Y.join(process.cwd(), ".env"),
    Y.join(process.resourcesPath, ".env"),
    Y.join(J.getAppPath(), ".env"),
    Y.join(process.cwd(), t),
    Y.join(process.resourcesPath, t),
    Y.join(J.getAppPath(), t)
  ];
  for (const r of n)
    ce.existsSync(r) && yd.config({ path: r, override: !0 });
  kP();
}
PP();
process.platform === "win32" && J.setAppUserModelId(J.isPackaged ? "com.landev.track" : "com.landev.track.dev");
const Dp = Y.dirname(Wp(import.meta.url));
process.env.APP_ROOT = Y.join(Dp, "..");
const Ss = process.env.VITE_DEV_SERVER_URL, zp = Y.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = Ss ? Y.join(process.env.APP_ROOT, "public") : zp;
let Fe;
function RP() {
  !Fe || Fe.isDestroyed() || (Fe.isMinimized() && Fe.restore(), Fe.isVisible() || Fe.show(), Fe.focus());
}
const Fp = J.requestSingleInstanceLock();
Fp ? J.on("second-instance", () => RP()) : J.quit();
function jP() {
  const e = [
    Y.join(process.env.APP_ROOT ?? "", "build", "icons", "icon.ico"),
    Y.join(process.env.VITE_PUBLIC ?? "", "app-icon.png")
  ];
  for (const t of e)
    if (ce.existsSync(t)) {
      const n = Zp.createFromPath(t);
      if (!n.isEmpty()) return n;
    }
}
function Up() {
  const e = jP();
  Fe = new Hc({
    width: 420,
    height: 720,
    minWidth: 380,
    minHeight: 600,
    title: "LANDEV Tracker",
    ...e ? { icon: e } : {},
    webPreferences: {
      preload: Y.join(Dp, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !0,
      backgroundThrottling: !0,
      devTools: !J.isPackaged,
      spellcheck: !1,
      enableWebSQL: !1
    }
  }), AP(Fe), Ss ? Fe.loadURL(Ss) : Fe.loadFile(Y.join(zp, "index.html"));
}
J.on("window-all-closed", () => {
  process.platform !== "darwin" && (J.quit(), Fe = null);
});
J.on("activate", () => {
  Hc.getAllWindows().length === 0 && Up();
});
J.whenReady().then(() => {
  Fp && (un(), TP(), Up(), U.info("app-ready-tracker-v2", { apiBaseUrl: un().VITE_API_BASE_URL }));
});
export {
  zp as RENDERER_DIST,
  Ss as VITE_DEV_SERVER_URL
};
