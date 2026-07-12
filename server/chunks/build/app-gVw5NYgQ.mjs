import { createComponent, isServer, ssr, ssrHydrationKey, escape, getRequestEvent, delegateEvents, ssrAttribute, mergeProps, ssrElement, Dynamic } from 'solid-js/web';
import { a as au } from '../nitro/nitro.mjs';
import { onMount, createEffect, Show, Suspense, createSignal, onCleanup, For, children, createMemo, getOwner, sharedConfig, useContext, mergeProps as mergeProps$1, splitProps, createRenderEffect, on as on$1, runWithOwner, createContext, untrack, createRoot, startTransition, resetErrorBoundaries, batch, createComponent as createComponent$1 } from 'solid-js';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:async_hooks';
import 'vinxi/lib/invariant';
import 'vinxi/lib/path';
import 'node:url';
import 'solid-js/web/storage';

function Ue() {
  let e = /* @__PURE__ */ new Set();
  function t(o) {
    return e.add(o), () => e.delete(o);
  }
  let n = false;
  function a(o, r) {
    if (n) return !(n = false);
    const s = { to: o, options: r, defaultPrevented: false, preventDefault: () => s.defaultPrevented = true };
    for (const c of e) c.listener({ ...s, from: c.location, retry: (d) => {
      d && (n = true), c.navigate(o, { ...r, resolve: false });
    } });
    return !s.defaultPrevented;
  }
  return { subscribe: t, confirm: a };
}
let ie;
function me() {
  (!window.history.state || window.history.state._depth == null) && window.history.replaceState({ ...window.history.state, _depth: window.history.length - 1 }, ""), ie = window.history.state._depth;
}
isServer || me();
function yt(e) {
  return { ...e, _depth: window.history.state && window.history.state._depth };
}
function gt(e, t) {
  let n = false;
  return () => {
    const a = ie;
    me();
    const o = a == null ? null : ie - a;
    if (n) {
      n = false;
      return;
    }
    o && t(o) ? (n = true, window.history.go(-o)) : e();
  };
}
const vt = /^(?:[a-z0-9]+:)?\/\//i, bt = /^\/+|(\/)\/+$/g, ze = "http://sr";
function B(e, t = false) {
  const n = e.replace(bt, "$1");
  return n ? t || /^[?#]/.test(n) ? n : "/" + n : "";
}
function ee(e, t, n) {
  if (vt.test(t)) return;
  const a = B(e), o = n && B(n);
  let r = "";
  return !o || t.startsWith("/") ? r = a : o.toLowerCase().indexOf(a.toLowerCase()) !== 0 ? r = a + o : r = o, (r || "/") + B(t, !r);
}
function At(e, t) {
  if (e == null) throw new Error(t);
  return e;
}
function kt(e, t) {
  return B(e).replace(/\/*(\*.*)?$/g, "") + B(t);
}
function Fe(e) {
  const t = {};
  return e.searchParams.forEach((n, a) => {
    a in t ? Array.isArray(t[a]) ? t[a].push(n) : t[a] = [t[a], n] : t[a] = n;
  }), t;
}
function wt(e, t, n) {
  const [a, o] = e.split("/*", 2), r = a.split("/").filter(Boolean), s = r.length;
  return (c) => {
    const d = c.split("/").filter(Boolean), i = d.length - s;
    if (i < 0 || i > 0 && o === void 0 && !t) return null;
    const m = { path: s ? "" : "/", params: {} }, f = (g) => n === void 0 ? void 0 : n[g];
    for (let g = 0; g < s; g++) {
      const b = r[g], w = b[0] === ":", u = w ? d[g] : d[g].toLowerCase(), p = w ? b.slice(1) : b.toLowerCase();
      if (w && se(u, f(p))) m.params[p] = u;
      else if (w || !se(u, p)) return null;
      m.path += `/${u}`;
    }
    if (o) {
      const g = i ? d.slice(-i).join("/") : "";
      if (se(g, f(o))) m.params[o] = g;
      else return null;
    }
    return m;
  };
}
function se(e, t) {
  const n = (a) => a === e;
  return t === void 0 ? true : typeof t == "string" ? n(t) : typeof t == "function" ? t(e) : Array.isArray(t) ? t.some(n) : t instanceof RegExp ? t.test(e) : false;
}
function St(e) {
  const [t, n] = e.pattern.split("/*", 2), a = t.split("/").filter(Boolean);
  return a.reduce((o, r) => o + (r.startsWith(":") ? 2 : 3), a.length - (n === void 0 ? 0 : 1));
}
function Ve(e) {
  const t = /* @__PURE__ */ new Map(), n = getOwner();
  return new Proxy({}, { get(a, o) {
    return t.has(o) || runWithOwner(n, () => t.set(o, createMemo(() => e()[o]))), t.get(o)();
  }, getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  }, ownKeys() {
    return Reflect.ownKeys(e());
  }, has(a, o) {
    return o in e();
  } });
}
function He(e) {
  let t = /(\/?\:[^\/]+)\?/.exec(e);
  if (!t) return [e];
  let n = e.slice(0, t.index), a = e.slice(t.index + t[0].length);
  const o = [n, n += t[1]];
  for (; t = /^(\/\:[^\/]+)\?/.exec(a); ) o.push(n += t[1]), a = a.slice(t[0].length);
  return He(a).reduce((r, s) => [...r, ...o.map((c) => c + s)], []);
}
const Ct = 100, $e = createContext(), pe = createContext(), oe = () => At(useContext($e), "<A> and 'use' router primitives can be only used inside a Route."), Pt = () => useContext(pe) || oe().base, Et = (e) => {
  const t = Pt();
  return createMemo(() => t.resolvePath(e()));
}, xt = (e) => {
  const t = oe();
  return createMemo(() => {
    const n = e();
    return n !== void 0 ? t.renderPath(n) : n;
  });
}, Rt = () => oe().navigatorFactory(), he = () => oe().location;
function Tt(e, t = "") {
  const { component: n, preload: a, load: o, children: r, info: s } = e, c = !r || Array.isArray(r) && !r.length, d = { key: e, component: n, preload: a || o, info: s };
  return We(e.path).reduce((i, m) => {
    for (const f of He(m)) {
      const g = kt(t, f);
      let b = c ? g : g.split("/*", 1)[0];
      b = b.split("/").map((w) => w.startsWith(":") || w.startsWith("*") ? w : encodeURIComponent(w)).join("/"), i.push({ ...d, originalPath: m, pattern: b, matcher: wt(b, !c, e.matchFilters) });
    }
    return i;
  }, []);
}
function It(e, t = 0) {
  return { routes: e, score: St(e[e.length - 1]) * 1e4 - t, matcher(n) {
    const a = [];
    for (let o = e.length - 1; o >= 0; o--) {
      const r = e[o], s = r.matcher(n);
      if (!s) return null;
      a.unshift({ ...s, route: r });
    }
    return a;
  } };
}
function We(e) {
  return Array.isArray(e) ? e : [e];
}
function Ge(e, t = "", n = [], a = []) {
  const o = We(e);
  for (let r = 0, s = o.length; r < s; r++) {
    const c = o[r];
    if (c && typeof c == "object") {
      c.hasOwnProperty("path") || (c.path = "");
      const d = Tt(c, t);
      for (const i of d) {
        n.push(i);
        const m = Array.isArray(c.children) && c.children.length === 0;
        if (c.children && !m) Ge(c.children, i.pattern, n, a);
        else {
          const f = It([...n], a.length);
          a.push(f);
        }
        n.pop();
      }
    }
  }
  return n.length ? a : a.sort((r, s) => s.score - r.score);
}
function Q(e, t) {
  for (let n = 0, a = e.length; n < a; n++) {
    const o = e[n].matcher(t);
    if (o) return o;
  }
  return [];
}
function Lt(e, t, n) {
  const a = new URL(ze), o = createMemo((m) => {
    const f = e();
    try {
      return new URL(f, a);
    } catch {
      return console.error(`Invalid path ${f}`), m;
    }
  }, a, { equals: (m, f) => m.href === f.href }), r = createMemo(() => o().pathname), s = createMemo(() => o().search, true), c = createMemo(() => o().hash), d = () => "", i = on$1(s, () => Fe(o()));
  return { get pathname() {
    return r();
  }, get search() {
    return s();
  }, get hash() {
    return c();
  }, get state() {
    return t();
  }, get key() {
    return d();
  }, query: n ? n(i) : Ve(i) };
}
let D;
function Nt() {
  return D;
}
function Dt(e, t, n, a = {}) {
  const { signal: [o, r], utils: s = {} } = e, c = s.parsePath || ((h) => h), d = s.renderPath || ((h) => h), i = s.beforeLeave || Ue(), m = ee("", a.base || "");
  if (m === void 0) throw new Error(`${m} is not a valid base path`);
  m && !o().value && r({ value: m, replace: true, scroll: false });
  const [f, g] = createSignal(false);
  let b;
  const w = (h, v) => {
    v.value === u() && v.state === k() || (b === void 0 && g(true), D = h, b = v, startTransition(() => {
      b === v && (p(b.value), A(b.state), resetErrorBoundaries(), isServer || N[1]((C) => C.filter((j) => j.pending)));
    }).finally(() => {
      b === v && batch(() => {
        D = void 0, h === "navigate" && tt(b), g(false), b = void 0;
      });
    }));
  }, [u, p] = createSignal(o().value), [k, A] = createSignal(o().state), L = Lt(u, k, s.queryWrapper), R = [], N = createSignal(isServer ? nt() : []), W = createMemo(() => typeof a.transformUrl == "function" ? Q(t(), a.transformUrl(L.pathname)) : Q(t(), L.pathname)), ke = () => {
    const h = W(), v = {};
    for (let C = 0; C < h.length; C++) Object.assign(v, h[C].params);
    return v;
  }, Ze = s.paramsWrapper ? s.paramsWrapper(ke, t) : Ve(ke), we = { pattern: m, path: () => m, outlet: () => null, resolvePath(h) {
    return ee(m, h);
  } };
  return createRenderEffect(on$1(o, (h) => w("native", h), { defer: true })), { base: we, location: L, params: Ze, isRouting: f, renderPath: d, parsePath: c, navigatorFactory: et, matches: W, beforeLeave: i, preloadRoute: at, singleFlight: a.singleFlight === void 0 ? true : a.singleFlight, submissions: N };
  function Xe(h, v, C) {
    untrack(() => {
      if (typeof v == "number") {
        v && (s.go ? s.go(v) : console.warn("Router integration does not support relative routing"));
        return;
      }
      const j = !v || v[0] === "?", { replace: K, resolve: q, scroll: Y, state: O } = { replace: false, resolve: !j, scroll: true, ...C }, _ = q ? h.resolvePath(v) : ee(j && L.pathname || "", v);
      if (_ === void 0) throw new Error(`Path '${v}' is not a routable path`);
      if (R.length >= Ct) throw new Error("Too many redirects");
      const Se = u();
      if (_ !== Se || O !== k()) if (isServer) {
        const Ce = getRequestEvent();
        Ce && (Ce.response = { status: 302, headers: new Headers({ Location: _ }) }), r({ value: _, replace: K, scroll: Y, state: O });
      } else i.confirm(_, C) && (R.push({ value: Se, replace: K, scroll: Y, state: k() }), w("navigate", { value: _, state: O }));
    });
  }
  function et(h) {
    return h = h || useContext(pe) || we, (v, C) => Xe(h, v, C);
  }
  function tt(h) {
    const v = R[0];
    v && (r({ ...h, replace: v.replace, scroll: v.scroll }), R.length = 0);
  }
  function at(h, v) {
    const C = Q(t(), h.pathname), j = D;
    D = "preload";
    for (let K in C) {
      const { route: q, params: Y } = C[K];
      q.component && q.component.preload && q.component.preload();
      const { preload: O } = q;
      v && O && runWithOwner(n(), () => O({ params: Y, location: { pathname: h.pathname, search: h.search, hash: h.hash, query: Fe(h), state: null, key: "" }, intent: "preload" }));
    }
    D = j;
  }
  function nt() {
    const h = getRequestEvent();
    return h && h.router && h.router.submission ? [h.router.submission] : [];
  }
}
function Mt(e, t, n, a) {
  const { base: o, location: r, params: s } = e, { pattern: c, component: d, preload: i } = a().route, m = createMemo(() => a().path);
  d && d.preload && d.preload();
  const f = i ? i({ params: s, location: r, intent: D || "initial" }) : void 0;
  return { parent: t, pattern: c, path: m, outlet: () => d ? createComponent$1(d, { params: s, location: r, data: f, get children() {
    return n();
  } }) : n(), resolvePath(b) {
    return ee(o.path(), b, m());
  } };
}
const Qe = (e) => (t) => {
  const { base: n } = t, a = children(() => t.children), o = createMemo(() => Ge(a(), t.base || ""));
  let r;
  const s = Dt(e, o, () => r, { base: n, singleFlight: t.singleFlight, transformUrl: t.transformUrl });
  return e.create && e.create(s), createComponent($e.Provider, { value: s, get children() {
    return createComponent(Bt, { routerState: s, get root() {
      return t.root;
    }, get preload() {
      return t.rootPreload || t.rootLoad;
    }, get children() {
      return [(r = getOwner()) && null, createComponent(jt, { routerState: s, get branches() {
        return o();
      } })];
    } });
  } });
};
function Bt(e) {
  const t = e.routerState.location, n = e.routerState.params, a = createMemo(() => e.preload && untrack(() => {
    e.preload({ params: n, location: t, intent: Nt() || "initial" });
  }));
  return createComponent(Show, { get when() {
    return e.root;
  }, keyed: true, get fallback() {
    return e.children;
  }, children: (o) => createComponent(o, { params: n, location: t, get data() {
    return a();
  }, get children() {
    return e.children;
  } }) });
}
function jt(e) {
  if (isServer) {
    const o = getRequestEvent();
    if (o && o.router && o.router.dataOnly) {
      qt(o, e.routerState, e.branches);
      return;
    }
    o && ((o.router || (o.router = {})).matches || (o.router.matches = e.routerState.matches().map(({ route: r, path: s, params: c }) => ({ path: r.originalPath, pattern: r.pattern, match: s, params: c, info: r.info }))));
  }
  const t = [];
  let n;
  const a = createMemo(on$1(e.routerState.matches, (o, r, s) => {
    let c = r && o.length === r.length;
    const d = [];
    for (let i = 0, m = o.length; i < m; i++) {
      const f = r && r[i], g = o[i];
      s && f && g.route.key === f.route.key ? d[i] = s[i] : (c = false, t[i] && t[i](), createRoot((b) => {
        t[i] = b, d[i] = Mt(e.routerState, d[i - 1] || e.routerState.base, Ee(() => a()[i + 1]), () => {
          var _a2;
          const w = e.routerState.matches();
          return (_a2 = w[i]) != null ? _a2 : w[0];
        });
      }));
    }
    return t.splice(o.length).forEach((i) => i()), s && c ? s : (n = d[0], d);
  }));
  return Ee(() => a() && n)();
}
const Ee = (e) => () => createComponent(Show, { get when() {
  return e();
}, keyed: true, children: (t) => createComponent(pe.Provider, { value: t, get children() {
  return t.outlet();
} }) });
function qt(e, t, n) {
  const a = new URL(e.request.url), o = Q(n, new URL(e.router.previousUrl || e.request.url).pathname), r = Q(n, a.pathname);
  for (let s = 0; s < r.length; s++) {
    (!o[s] || r[s].route !== o[s].route) && (e.router.dataOnly = true);
    const { route: c, params: d } = r[s];
    c.preload && c.preload({ params: d, location: t.location, intent: "preload" });
  }
}
function Ot([e, t], n, a) {
  return [e, a ? (o) => t(a(o)) : t];
}
function _t(e) {
  let t = false;
  const n = (o) => typeof o == "string" ? { value: o } : o, a = Ot(createSignal(n(e.get()), { equals: (o, r) => o.value === r.value && o.state === r.state }), void 0, (o) => (!t && e.set(o), sharedConfig.registry && !sharedConfig.done && (sharedConfig.done = true), o));
  return e.init && onCleanup(e.init((o = e.get()) => {
    t = true, a[1](n(o)), t = false;
  })), Qe({ signal: a, create: e.create, utils: e.utils });
}
function Ut(e, t, n) {
  return e.addEventListener(t, n), () => e.removeEventListener(t, n);
}
function zt(e, t) {
  const n = e && document.getElementById(e);
  n ? n.scrollIntoView() : t && window.scrollTo(0, 0);
}
function Ft(e) {
  const t = new URL(e);
  return t.pathname + t.search;
}
function Vt(e) {
  let t;
  const n = { value: e.url || (t = getRequestEvent()) && Ft(t.request.url) || "" };
  return Qe({ signal: [() => n, (a) => Object.assign(n, a)] })(e);
}
const Ht = /* @__PURE__ */ new Map();
function $t(e = true, t = false, n = "/_server", a) {
  return (o) => {
    const r = o.base.path(), s = o.navigatorFactory(o.base);
    let c, d;
    function i(u) {
      return u.namespaceURI === "http://www.w3.org/2000/svg";
    }
    function m(u) {
      if (u.defaultPrevented || u.button !== 0 || u.metaKey || u.altKey || u.ctrlKey || u.shiftKey) return;
      const p = u.composedPath().find((W) => W instanceof Node && W.nodeName.toUpperCase() === "A");
      if (!p || t && !p.hasAttribute("link")) return;
      const k = i(p), A = k ? p.href.baseVal : p.href;
      if ((k ? p.target.baseVal : p.target) || !A && !p.hasAttribute("state")) return;
      const R = (p.getAttribute("rel") || "").split(/\s+/);
      if (p.hasAttribute("download") || R && R.includes("external")) return;
      const N = k ? new URL(A, document.baseURI) : new URL(A);
      if (!(N.origin !== window.location.origin || r && N.pathname && !N.pathname.toLowerCase().startsWith(r.toLowerCase()))) return [p, N];
    }
    function f(u) {
      const p = m(u);
      if (!p) return;
      const [k, A] = p, L = o.parsePath(A.pathname + A.search + A.hash), R = k.getAttribute("state");
      u.preventDefault(), s(L, { resolve: false, replace: k.hasAttribute("replace"), scroll: !k.hasAttribute("noscroll"), state: R ? JSON.parse(R) : void 0 });
    }
    function g(u) {
      const p = m(u);
      if (!p) return;
      const [k, A] = p;
      a && (A.pathname = a(A.pathname)), o.preloadRoute(A, k.getAttribute("preload") !== "false");
    }
    function b(u) {
      clearTimeout(c);
      const p = m(u);
      if (!p) return d = null;
      const [k, A] = p;
      d !== k && (a && (A.pathname = a(A.pathname)), c = setTimeout(() => {
        o.preloadRoute(A, k.getAttribute("preload") !== "false"), d = k;
      }, 20));
    }
    function w(u) {
      if (u.defaultPrevented) return;
      let p = u.submitter && u.submitter.hasAttribute("formaction") ? u.submitter.getAttribute("formaction") : u.target.getAttribute("action");
      if (!p) return;
      if (!p.startsWith("https://action/")) {
        const A = new URL(p, ze);
        if (p = o.parsePath(A.pathname + A.search), !p.startsWith(n)) return;
      }
      if (u.target.method.toUpperCase() !== "POST") throw new Error("Only POST forms are supported for Actions");
      const k = Ht.get(p);
      if (k) {
        u.preventDefault();
        const A = new FormData(u.target, u.submitter);
        k.call({ r: o, f: u.target }, u.target.enctype === "multipart/form-data" ? A : new URLSearchParams(A));
      }
    }
    delegateEvents(["click", "submit"]), document.addEventListener("click", f), e && (document.addEventListener("mousemove", b, { passive: true }), document.addEventListener("focusin", g, { passive: true }), document.addEventListener("touchstart", g, { passive: true })), document.addEventListener("submit", w), onCleanup(() => {
      document.removeEventListener("click", f), e && (document.removeEventListener("mousemove", b), document.removeEventListener("focusin", g), document.removeEventListener("touchstart", g)), document.removeEventListener("submit", w);
    });
  };
}
function Wt(e) {
  if (isServer) return Vt(e);
  const t = () => {
    const a = window.location.pathname.replace(/^\/+/, "/") + window.location.search, o = window.history.state && window.history.state._depth && Object.keys(window.history.state).length === 1 ? void 0 : window.history.state;
    return { value: a + window.location.hash, state: o };
  }, n = Ue();
  return _t({ get: t, set({ value: a, replace: o, scroll: r, state: s }) {
    o ? window.history.replaceState(yt(s), "", a) : window.history.pushState(s, "", a), zt(decodeURIComponent(window.location.hash.slice(1)), r), me();
  }, init: (a) => Ut(window, "popstate", gt(a, (o) => {
    if (o) return !n.confirm(o);
    {
      const r = t();
      return !n.confirm(r.value, { state: r.state });
    }
  })), create: $t(e.preload, e.explicitLinks, e.actionBase, e.transformUrl), utils: { go: (a) => window.history.go(a), beforeLeave: n } })(e);
}
function xe(e) {
  e = mergeProps$1({ inactiveClass: "inactive", activeClass: "active" }, e);
  const [, t] = splitProps(e, ["href", "state", "class", "activeClass", "inactiveClass", "end"]), n = Et(() => e.href), a = xt(n), o = he(), r = createMemo(() => {
    const s = n();
    if (s === void 0) return [false, false];
    const c = B(s.split(/[?#]/, 1)[0]).toLowerCase(), d = decodeURI(B(o.pathname).toLowerCase());
    return [e.end ? c === d : d.startsWith(c + "/") || d === c, c === d];
  });
  return ssrElement("a", mergeProps(t, { get href() {
    return a() || e.href;
  }, get state() {
    return JSON.stringify(e.state);
  }, get classList() {
    return { ...e.class && { [e.class]: true }, [e.inactiveClass]: !r()[0], [e.activeClass]: r()[0], ...t.classList };
  }, link: true, get "aria-current"() {
    return r()[1] ? "page" : void 0;
  } }), void 0, true);
}
/**
* @license lucide-solid v1.17.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Gt = { xmlns: "http://www.w3.org/2000/svg", width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, U = Gt, Qt = createContext({ size: 24, color: "currentColor", strokeWidth: 2, absoluteStrokeWidth: false, class: "" }), Jt = (e) => {
  for (const t in e) if (t.startsWith("aria-") || t === "role" || t === "title") return true;
  return false;
}, Kt = (...e) => e.filter((t, n, a) => !!t && t.trim() !== "" && a.indexOf(t) === n).join(" ").trim(), Yt = (e) => e.replace(/^([A-Z])|[\s-_]+(\w)/g, (t, n, a) => a ? a.toUpperCase() : n.toLowerCase()), Re = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), Zt = (e) => {
  const t = Yt(e);
  return t.charAt(0).toUpperCase() + t.slice(1);
}, Xt = (e) => {
  const [t, n] = splitProps(e, ["color", "size", "strokeWidth", "children", "class", "name", "iconNode", "absoluteStrokeWidth"]), a = useContext(Qt);
  return ssrElement("svg", mergeProps(U, { get width() {
    var _a2, _b;
    return (_b = (_a2 = t.size) != null ? _a2 : a.size) != null ? _b : U.width;
  }, get height() {
    var _a2, _b;
    return (_b = (_a2 = t.size) != null ? _a2 : a.size) != null ? _b : U.height;
  }, get stroke() {
    var _a2, _b;
    return (_b = (_a2 = t.color) != null ? _a2 : a.color) != null ? _b : U.stroke;
  }, get "stroke-width"() {
    var _a2, _b, _c, _d, _e2, _f;
    return ((_a2 = t.absoluteStrokeWidth) != null ? _a2 : a.absoluteStrokeWidth) === true ? Number((_c = (_b = t.strokeWidth) != null ? _b : a.strokeWidth) != null ? _c : U["stroke-width"]) * 24 / Number((_d = t.size) != null ? _d : a.size) : Number((_f = (_e2 = t.strokeWidth) != null ? _e2 : a.strokeWidth) != null ? _f : U["stroke-width"]);
  }, get class() {
    return Kt("lucide", "lucide-icon", a.class, ...t.name != null ? [`lucide-${Re(Zt(t.name))}`, `lucide-${Re(t.name)}`] : [], t.class);
  }, get "aria-hidden"() {
    return !t.children && !Jt(n) ? "true" : void 0;
  } }, n), () => escape(createComponent(For, { get each() {
    return t.iconNode;
  }, children: ([o, r]) => createComponent(Dynamic, mergeProps({ component: o }, r)) })), true);
}, x = Xt, ea = [["path", { d: "M12 7v14", key: "1akyts" }], ["path", { d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z", key: "ruj8y" }]], ta = (e) => createComponent(x, mergeProps(e, { iconNode: ea, name: "book-open" })), aa = ta, na = [["path", { d: "M10 18v-7", key: "wt116b" }], ["path", { d: "M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z", key: "yxxwt6" }], ["path", { d: "M14 18v-7", key: "vav6t3" }], ["path", { d: "M18 18v-7", key: "aexdmj" }], ["path", { d: "M3 22h18", key: "8prr45" }], ["path", { d: "M6 18v-7", key: "1ivflk" }]], oa = (e) => createComponent(x, mergeProps(e, { iconNode: na, name: "landmark" })), ra = oa, sa = [["rect", { width: "7", height: "9", x: "3", y: "3", rx: "1", key: "10lvy0" }], ["rect", { width: "7", height: "5", x: "14", y: "3", rx: "1", key: "16une8" }], ["rect", { width: "7", height: "9", x: "14", y: "12", rx: "1", key: "1hutg5" }], ["rect", { width: "7", height: "5", x: "3", y: "16", rx: "1", key: "ldoo1y" }]], ia = (e) => createComponent(x, mergeProps(e, { iconNode: sa, name: "layout-dashboard" })), ca = ia, la = [["path", { d: "M4 5h16", key: "1tepv9" }], ["path", { d: "M4 12h16", key: "1lakjw" }], ["path", { d: "M4 19h16", key: "1djgab" }]], da = (e) => createComponent(x, mergeProps(e, { iconNode: la, name: "menu" })), ua = da, ma = [["path", { d: "M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4", key: "re6nr2" }], ["path", { d: "M2 6h4", key: "aawbzj" }], ["path", { d: "M2 10h4", key: "l0bgd4" }], ["path", { d: "M2 14h4", key: "1gsvsf" }], ["path", { d: "M2 18h4", key: "1bu2t1" }], ["path", { d: "M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z", key: "pqwjuv" }]], pa = (e) => createComponent(x, mergeProps(e, { iconNode: ma, name: "notebook-pen" })), ha = pa, fa = [["path", { d: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z", key: "1a0edw" }], ["path", { d: "M12 22V12", key: "d0xqtd" }], ["polyline", { points: "3.29 7 12 12 20.71 7", key: "ousv84" }], ["path", { d: "m7.5 4.27 9 5.15", key: "1c824w" }]], ya = (e) => createComponent(x, mergeProps(e, { iconNode: fa, name: "package" })), ga = ya, va = [["path", { d: "M12 3v18", key: "108xh3" }], ["path", { d: "m19 8 3 8a5 5 0 0 1-6 0zV7", key: "zcdpyk" }], ["path", { d: "M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1", key: "1yorad" }], ["path", { d: "m5 8 3 8a5 5 0 0 1-6 0zV7", key: "eua70x" }], ["path", { d: "M7 21h10", key: "1b0cd5" }]], ba = (e) => createComponent(x, mergeProps(e, { iconNode: va, name: "scale" })), Aa = ba, ka = [["circle", { cx: "8", cy: "21", r: "1", key: "jimo8o" }], ["circle", { cx: "19", cy: "21", r: "1", key: "13723u" }], ["path", { d: "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12", key: "9zh506" }]], wa = (e) => createComponent(x, mergeProps(e, { iconNode: ka, name: "shopping-cart" })), Sa = wa, Ca = [["path", { d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z", key: "1s2grr" }], ["path", { d: "M20 2v4", key: "1rf3ol" }], ["path", { d: "M22 4h-4", key: "gwowj6" }], ["circle", { cx: "4", cy: "20", r: "2", key: "6kqj1y" }]], Pa = (e) => createComponent(x, mergeProps(e, { iconNode: Ca, name: "sparkles" })), Ea = Pa, xa = [["circle", { cx: "12", cy: "8", r: "5", key: "1hypcn" }], ["path", { d: "M20 21a8 8 0 0 0-16 0", key: "rfgkzh" }]], Ra = (e) => createComponent(x, mergeProps(e, { iconNode: xa, name: "user-round" })), Ta = Ra, Ia = [["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }], ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744", key: "16gr8j" }], ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }], ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]], La = (e) => createComponent(x, mergeProps(e, { iconNode: Ia, name: "users" })), Na = La, Da = [["path", { d: "M18 6 6 18", key: "1bl5f8" }], ["path", { d: "m6 6 12 12", key: "d8bk6v" }]], Ma = (e) => createComponent(x, mergeProps(e, { iconNode: Da, name: "x" })), Ba = Ma;
const ja = { VITE_APP_ID: "hrm", VITE_AUTH_BASE: "https://ssgloghr.com", VITE_IDSVC_URL: "https://ssgloghr.com/idsvc", VITE_SSO_CLIENT_ID: "subpay" }, Z = ja || {};
let ce = { authBase: Z.VITE_AUTH_BASE || "", idsvcUrl: Z.VITE_IDSVC_URL || "", appId: Z.VITE_APP_ID || "", clientId: Z.VITE_SSO_CLIENT_ID || "", perms: {}, callbackPath: "/callback" };
function qa(e) {
  ce = { ...ce, ...e };
}
function J() {
  return ce;
}
const Oa = () => J().idsvcUrl, fe = () => J().appId, ye = () => `idsvc_refresh_${fe()}`;
let H = null;
const Je = () => localStorage.getItem(ye()), _a = (e) => {
  H = e.access, localStorage.setItem(ye(), e.refresh);
}, Ua = () => {
  H = null, localStorage.removeItem(ye());
}, za = () => !!Je();
async function Fa(e, t) {
  const n = await fetch(`${Oa()}${e}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(t) }), a = await n.json().catch(() => ({}));
  if (!n.ok) throw Object.assign(new Error(a.error || `HTTP ${n.status}`), { status: n.status });
  return a && typeof a == "object" && a.data !== void 0 ? a.data : a;
}
let G = null;
async function Va() {
  return G || (G = (async () => {
    const e = Je();
    if (!e) return false;
    try {
      const t = await Fa("/auth/refresh", { refresh: e, app: fe() });
      return _a(t), true;
    } catch (t) {
      return ((t == null ? void 0 : t.status) === 401 || (t == null ? void 0 : t.status) === 400) && Ua(), false;
    } finally {
      G = null;
    }
  })(), G);
}
function ge() {
  if (!H) return null;
  try {
    return JSON.parse(atob(H.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}
function Ha() {
  var _a2, _b;
  const e = ge();
  return e ? e.superadmin ? ["superadmin"] : ((_b = (_a2 = e.apps) == null ? void 0 : _a2[fe()]) == null ? void 0 : _b.roles) || [] : [];
}
function $a() {
  const e = ge();
  return !e || e.exp * 1e3 - Date.now() < 6e4;
}
async function Wa() {
  return (!H || $a()) && await Va(), H;
}
function te(e) {
  if (typeof e == "boolean") return e;
  if (typeof e == "number") return e === 1;
  if (typeof e == "string") {
    const t = e.trim().toLowerCase();
    return t === "true" || t === "1" || t === "yes";
  }
  return false;
}
function Ga(e, t) {
  var _a2;
  if (e.some((a) => a === "admin" || a === "superadmin")) return /* @__PURE__ */ new Set(["*"]);
  const n = /* @__PURE__ */ new Set();
  for (const a of e) for (const o of (_a2 = t[a]) != null ? _a2 : []) n.add(o);
  return n;
}
const ve = "ops_user", le = /* @__PURE__ */ new Set();
function Ke() {
  for (const e of le) e();
}
function Qa(e) {
  return le.add(e), () => le.delete(e);
}
const Ja = () => {
  try {
    return JSON.parse(localStorage.getItem(ve) || "null");
  } catch {
    return null;
  }
};
let $ = Ja(), Ka = false, Ya = null;
const Za = () => $, Ye = () => ({ user: $, loading: Ka, error: Ya });
function Xa(e) {
  e && localStorage.setItem(ve, JSON.stringify(e)), $ = e, Ke();
}
function en() {
  var _a2;
  const e = ge();
  if (!e) return false;
  const t = J().appId, a = (((_a2 = e.apps) == null ? void 0 : _a2[t]) || Object.values(e.apps || {})[0] || {}).scope || {}, o = a.flags || {}, r = { id: e.sub, uid: e.uid, originalUserId: e.sub, googleUid: e.sub, name: e.name || "", email: e.email || ($ == null ? void 0 : $.email) || "", businessId: a.businessId || "", permissions: { ...o, isAdmin: !!e.superadmin || te(o.isAdmin) }, superadmin: !!e.superadmin, apps: e.apps };
  return Xa(r), true;
}
async function tn() {
  return za() ? navigator.onLine ? await Wa() ? (en(), true) : (localStorage.removeItem(ve), $ = null, Ke(), false) : !!$ : false;
}
function an(e) {
  var _a2, _b, _c;
  if (!e) {
    const a = Ha();
    if (a.length) return a;
  }
  const t = e != null ? e : Za();
  if (!t) return [];
  if (te(t.superadmin) || te((_a2 = t.permissions) == null ? void 0 : _a2.isAdmin) || te(t.isAdmin)) return ["admin"];
  const n = (_c = (_b = t.apps) == null ? void 0 : _b[J().appId]) == null ? void 0 : _c.roles;
  return Array.isArray(n) ? n : [];
}
function nn(e) {
  return Ga(an(e), J().perms);
}
const on = (e) => nn(e).has("*"), be = Ye(), [Ae, rn] = createSignal(be.user), [_n, sn] = createSignal(be.loading), [Un, cn] = createSignal(be.error);
Qa(() => {
  const e = Ye();
  rn(e.user), sn(e.loading), cn(e.error);
});
qa({ authBase: "https://ssgloghr.com", idsvcUrl: "https://ssgloghr.com/idsvc", appId: "hrm", clientId: "subpay", perms: { admin: ["*"], accountant: ["journal.post", "journal.void", "payments.record", "payroll.approve", "payroll.post", "accounts.delete", "providers.delete", "inventory.edit", "inventory.delete", "transactions.edit", "transactions.delete"], operator: ["inventory.edit", "payments.record"], viewer: [] } });
const [Te, ln] = createSignal(true), Ie = () => !!Ae(), dn = () => on(Ae());
async function un() {
  try {
    await tn();
  } finally {
    ln(false);
  }
}
const mn = "hrmfinance-year";
function pn() {
  if (typeof localStorage < "u") {
    const e = Number(localStorage.getItem(mn));
    if (e >= 2e3 && e <= 2100) return e;
  }
  return (/* @__PURE__ */ new Date()).getFullYear();
}
const [hn, zn] = createSignal(pn());
function fn(e = 6) {
  const t = (/* @__PURE__ */ new Date()).getFullYear();
  return Array.from({ length: e }, (n, a) => t - a);
}
const yn = { common: { appName: "HRMfinance", loading: "Loading\u2026", save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit", add: "Add", search: "Search", actions: "Actions", error: "Something went wrong", confirmDelete: "Are you sure you want to delete this?", noResults: "No results", total: "Total", year: "Year", print: "Print / PDF", export: "Export CSV", signOut: "Sign out", close: "Close", menu: "Menu" }, ai: { entryTitle: "Describe the operation and AI drafts the entry", entryPlaceholder: 'e.g. "paid 245.00 for Spectrum internet with a Fifth Third check"', templateTitle: "Describe the template and AI builds fields + line rules", templatePlaceholder: 'e.g. "weekly payroll for one employee: hours \xD7 their rate, against cash"', generate: "Generate", thinking: "Thinking\u2026", scanReceipt: "Scan invoice (AI)", bankSuggest: "AI entry", bankSuggestHint: "AI classifies this movement and drafts the journal entry", analysisTitle: "AI financial analysis", analyze: "Analyze", analysisHint: "Sends the year's key figures to AI and returns a plain-language read: state, red flags and recommended actions.", errors: { unavailable: "AI is not available yet \u2014 the askGemini server op is missing", empty: "AI returned no response", badJson: "AI returned an invalid response \u2014 try again" } }, yearClose: { title: "Year close", checks: "Pre-close checks", noDrafts: "No draft entries", draftsPending: "draft entries pending \u2014 post or void them first", resultAccount: "Retained earnings / result account (Equity)", preview: "Closing entry preview", closingEntry: "Year close", openingEntry: "Opening balances", generateClose: "Generate closing entry (draft)", generateOpening: "Generate opening entry", created: "Draft entry created", hint: "Both entries are created as drafts \u2014 review them in the Journal and post when ready." }, nav: { groups: { accounting: "Accounting", operations: "Operations", people: "People", admin: "Admin" }, dashboard: "Dashboard", accounts: "Chart of Accounts", reports: "Reports", trialBalance: "Trial Balance", balanceSheet: "Balance Sheet", cashFlow: "Cash Flow", cashAdjustments: "Adjustments (non-cash balance movements)", netCashFlow: "Net cash flow", cashPosition: "Cash & bank movement", cashDelta: "Total cash movement", cashReconciles: "Net cash flow matches the cash movement", cashGap: "Difference vs cash movement", monthlyPnl: "Monthly P&L", incomeStatement: "Income Statement" }, login: { title: "HRMfinance", subtitle: "Sign in to continue", signingIn: "Signing in\u2026", failed: "Login failed", sso: "Sign in with SSO", backToLogin: "Back to login", invalidSession: "Authentication succeeded but session is invalid." }, accounts: { title: "Chart of Accounts", addAccount: "Add account", addSubAccount: "Add sub-account", editAccount: "Edit account", accountNumber: "Account number", name: "Name", type: "Type", category: "Category", description: "Description", parentAccount: "Parent account", balance: "Balance", active: "Active", inactive: "Inactive", bankAccount: "Bank account", bankName: "Bank name", bankAccountNumber: "Bank account number", bankAccountType: "Bank account type", piggybank: "Cash collection account", piggybankLabel: "Cash account label", chequesEnTransito: "Outstanding checks account", flatView: "Flat", treeView: "Tree", allTypes: "All types", cannotDelete: "This account has sub-accounts or transactions and cannot be deleted.", types: { Asset: "Asset", Liability: "Liability", Equity: "Equity", Revenue: "Revenue", Expense: "Expense" }, ledger: "Ledger", date: "Date", reference: "Reference", debit: "Debit", credit: "Credit", noTransactions: "No transactions for this year", noMatches: "No transactions match the filters", allAccounts: "All accounts", backToAccounts: "Back to chart of accounts" }, reports: { trialBalance: "Trial Balance", balanceSheet: "Balance Sheet", account: "Account", totals: "Totals", balanced: "Balanced", outOfBalance: "Out of balance", assets: "Assets", liabilities: "Liabilities", equity: "Equity", netIncome: "Net income (Revenue \u2212 Expenses)", totalAssets: "Total assets", totalLiabilitiesEquity: "Total liabilities + equity", incomeStatement: "Income Statement", revenue: "Revenue", expenses: "Expenses", netIncomeTotal: "Net income", margin: "Margin", audit: { run: "Audit difference", title: "Discrepancy audit", empty: "No suspicious entries found", score: "Risk", hints: { transposition: "The discrepancy is divisible by 9 \u2014 possible transposed digits (e.g. 54 entered as 45)", wrongSide: "An entry for half the discrepancy exists \u2014 an amount may be posted to the wrong side" }, reasons: { title: "Signals", imbalance: "Entry is internally out of balance", exactMatch: "Its internal imbalance equals the discrepancy", amountMatch: "Its total equals the discrepancy", lineMatch: "A line equals the discrepancy", halfMatch: "Its total is half the discrepancy (wrong side)", rounding: "Amounts carry rounding residue", duplicate: "Possible duplicate (same date and amount)", draft: "Draft entry \u2014 post it or exclude it" } } }, journal: { serverSearch: "Search server", serverSearchHint: "Search the whole year on the server (Enter)", serverResults: "Server results", title: "Journal", newEntry: "New entry", entryNumber: "Entry #", date: "Date", description: "Description", reference: "Reference", debits: "Debits", credits: "Credits", status: "Status", lines: "Lines", line: "Line", account: "Account", debit: "Debit", credit: "Credit", addLine: "Add line", removeLine: "Remove line", balanced: "Balanced", difference: "Difference", post: "Post", void: "Void", viewEntry: "View entry", referenceId: "Entity (referenceId)", postedAt: "Posted at", postedBy: "Posted by", voidedBy: "Voided by", updatedBy: "Updated by", createdBy: "Created by", allStatuses: "All statuses", noEntries: "No journal entries for this year", confirmPost: "Post this entry? Posted entries cannot be edited.", confirmVoid: "Void this entry?", statuses: { draft: "Draft", posted: "Posted", void: "Void" }, errors: { dateRequired: "Date is required", descriptionRequired: "Description is required", linesRequired: "At least one line is required", lineAccount: "Line {n}: account is required", lineAmount: "Line {n}: a debit or credit amount is required", lineBothSides: "Line {n}: cannot have both debit and credit", notBalanced: "Entry is not balanced \u2014 debits must equal credits", deletePosted: "Posted entries cannot be deleted. Void them instead.", notFound: "Journal entry not found" } }, templates: { title: "Templates", launch: "Use template", manage: "Manage templates", newTemplate: "New template", editTemplate: "Edit template", noTemplates: "No templates yet", category: "Category", fields: "Fields", lineRules: "Line rules", settings: "Settings", preview: "Preview", generate: "Create entry", usageCount: "Used {n} times", recurrenceDay: "Recurring \u2014 day of month (empty = off)", dynamicAccount: "Dynamic account (expression)", connectors: "Connectors", connector: { provider: "Provider", customer: "Customer", employee: "Employee" }, connectorInfoTitle: "Connectors: providers, customers and employees", connectorInfoBody: "When running the template you can pick a provider, customer and/or employee. Their real fields become variables usable anywhere in this template \u2014 default description, reference format, amount expressions, dynamic account, referenceId \u2014 and text fields whose name mentions the entity are auto-filled.", connectorRateHint: "rate = effective hourly rate", connectorInfoExample: `Example: a line rule with dynamic account "{provider.relatedAccountId}", referenceId "{provider.id}" and amount "{monto}" debits the picked provider's AP account; a payroll amount can be "{horas} * {employee.rate}".`, connectorVars: "Variables: {provider.name}, {provider.relatedAccountId}, {customer.name}, {customer.relatedAccountId}, {employee.name}, {employee.rate}\u2026", connectorHint: "Connectors expose the entity's real fields: {provider.name}, {provider.id}, {provider.relatedAccountId}, {customer.taxId}, {employee.rate}\u2026", active: "Active", inactive: "Inactive", errors: { fieldRequired: "{0} is required", accountNotFound: "Account not found: {0}", badAmount: "Invalid amount on line: {0}", minLines: "Template must produce at least 2 lines", notBalanced: "Generated entry is not balanced" } }, providers: { title: "Providers & Customers", newEntity: "New entity", editEntity: "Edit entity", name: "Name", type: "Type", email: "Email", phone: "Phone", address: "Address", taxId: "Tax ID", contactPerson: "Contact person", notes: "Notes", balance: "Balance", relatedAccount: "Related account (AP/AR)", active: "Active", inactive: "Inactive", allTypes: "All", noEntities: "No providers or customers yet", recordPayment: "Record payment", recordCollection: "Record collection", amount: "Amount", paymentMethod: "Payment method", date: "Date", reference: "Reference", description: "Description", weOwe: "We owe", theyOwe: "They owe", settled: "Settled", types: { customer: "Customer", provider: "Provider", both: "Both" }, methods: { cash: "Cash", check: "Check", transfer: "Transfer", zelle: "Zelle", credit_card: "Credit card", other: "Other" }, document: "Document", viewDocuments: "Documents", noDocuments: "No documents this year", pendingDocs: "Pending documents", cashAccount: "Cash/bank account", tabs: { all: "All", pending: "Pending", settled: "Settled" }, advance: "Advance", openEntry: "Open journal entry", advanceAccount: "Advance account (anticipos)", applyAdvance: "Apply advance", accountsPayable: "Accounts payable", accountsReceivable: "Accounts receivable", multiPayment: "Batch payment", multiCollection: "Batch collection", sendReminder: "Send payment reminder", reminderSubject: "Payment reminder", reminderBody: "Dear", reminderIntro: "Our records show the following pending documents:", directory: "Directory", aging: "Aging", agingDays: "days", agingBuckets: { b30: "1\u201330", b60: "31\u201360", b90: "61\u201390", b90p: "+90" }, cashMovement: "Cash movement", extraLines: "Additional lines", addLine: "Add line", debit: "Debit", credit: "Credit", addAdvanceFor: "Add advance (anticipo) for\u2026", newAdvance: "NEW ADVANCE", applyToAR: "Apply to receivable (no cash)", applyToAP: "Apply to payable (no cash)", errors: { notFound: "Entity not found", noRelatedAccount: "This entity has no AP/AR account linked \u2014 edit it and pick a related account first", noAdvanceAccount: "This entity has no advance account \u2014 edit it and pick one", cashAccountRequired: "Select the cash/bank account", amountRequired: "Enter an amount or select pending documents" } }, inventory: { title: "Inventory", products: "Products", movements: "Movements", realCost: "Actual cost", realCostHint: "Quantity-weighted average cost of the stock on hand (backend avg_cost)", productLedger: "Movement ledger", price: "Price", netMovement: "Net", stockCount: "Stock count", systemQty: "System", countedQty: "Counted", difference: "Difference", applyCount: "Apply differences", countApplied: "Adjustments applied", confirmCount: "Apply the count differences as inventory movements?", searchMovements: "Search movements\u2026", movementDetail: "Movement detail", confirmDeleteMovement: "Delete this movement? Stock impact is NOT reverted automatically.", stock: "Stock", newProduct: "New product", editProduct: "Edit product", name: "Name", sku: "SKU", upc: "UPC", code: "Code", category: "Category", description: "Description", unitOfMeasure: "Unit", unitCost: "Unit cost", sellingPrice: "Selling price", minStock: "Min stock", maxStock: "Max stock", active: "Active", inactive: "Inactive", noProducts: "No products yet", location: "Location", fromLocation: "From location", toLocation: "To location", quantity: "Quantity", reference: "Reference", notes: "Notes", newMovement: "New movement", movementType: "Movement type", product: "Product", noMovements: "No movements", lowStock: "Low stock", date: "Date", type: "Type", allLocations: "All locations", types: { in: "Stock in", out: "Stock out", adjustment: "Adjustment", transfer: "Transfer" } }, transactions: { title: "Operations", confirmDeleteInvoice: "Delete this record? Only the document trail is removed \u2014 the journal entry is NOT voided (do that in the Journal).", editQuote: "Edit / convert quote", quoteUpdated: "Quote updated", saveQuote: "Save quote", quoteSaved: "Quote saved", convertQuote: "Convert to invoice", quote: "Quote", quotes: "Quotes", invoice: "Invoice", purchaseReceipt: "Purchase record", services: "Services", productsSubtotal: "Products subtotal", servicesSubtotal: "Services subtotal", history: "History", number: "Number", entity: "Provider/Customer", allTypes: "All", noTransactions: "No transactions", compras: "Purchases", facturacion: "Sales", mermas: "Shrinkage", date: "Date", description: "Description", reference: "Reference", provider: "Provider", customer: "Customer", product: "Product", qty: "Qty", unitCost: "Unit cost", unitPrice: "Unit price", subtotal: "Subtotal", addLine: "Add line", serviceLines: "Services", serviceName: "Service", expenseAccount: "Expense account", paymentMode: "Payment mode", cash: "Cash", bank: "Bank", credit: "Credit", inventoryAccount: "Inventory account", paymentAccount: "Cash/Bank account", apAccount: "Payable account (AP)", arAccount: "Receivable account (AR)", revenueAccount: "Revenue account", cogsAccount: "COGS account", lossAccount: "Loss account", location: "Location", receiveStock: "Receive into stock", postCogs: "Post cost of goods sold", reason: "Reason", total: "Total", post: "Post transaction", posted: "Transaction posted", selectAccount: "Select account", reasons: { breakage: "Breakage", loss: "Loss", expired: "Expired", damaged: "Damaged", theft: "Theft", other: "Other" }, errors: { needLine: "Add at least one line", needAccounts: "Select all required accounts", needLocation: "Location is required to move stock", badTotal: "Total must be greater than zero" } }, banking: { exactMatch: "Exact", goodMatch: "Good", possibleMatch: "Possible", showLowScore: "Show weak matches", title: "Bank Reconciliation", account: "Bank account", selectAccount: "Select a bank account", noBankAccounts: "No accounts flagged as bank accounts. Mark an account as a bank account in the chart of accounts.", importCsv: "Import CSV", statements: "Bank statements", entryRecords: "Ledger records", date: "Date", description: "Description", reference: "Reference", debit: "Debit", credit: "Credit", balance: "Balance", status: "Status", reconciled: "Reconciled", unreconciled: "Unreconciled", suggested: "Suggested match", match: "Match", unmatch: "Unmatch", score: "Score", noStatements: "No bank statements. Import a CSV to begin.", noRecords: "No ledger records for this account this year", csvHelp: "Columns: date, description, reference, debit, credit, balance", csvPaste: "Paste CSV rows", importBtn: "Import", imported: "{n} statements imported" }, employees: { title: "Employees", newEmployee: "New employee", editEmployee: "Edit employee", name: "Name", position: "Position", department: "Department", email: "Email", phone: "Phone", startDate: "Start date", status: "Status", employeeNumber: "Employee #", clockingNumber: "Clocking #", employmentType: "Employment type", ssn: "SSN", payType: "Pay type", hourlyRate: "Hourly rate", annualSalary: "Annual salary", overtimeRate: "Overtime rate", standardHours: "Standard hours/week", lunchMinutes: "Lunch (minutes)", taxRate: "Tax rate (%)", insuranceDeduction: "Insurance deduction", allStatuses: "All statuses", allDepartments: "All departments", noEmployees: "No employees yet", hourlyRateLabel: "Rate", statuses: { active: "Active", inactive: "Inactive", terminated: "Terminated", on_leave: "On leave" }, payTypes: { hourly: "Hourly", salary: "Salary" } }, timesheets: { title: "Timesheets", newCard: "New week card", editCard: "Edit week card", employee: "Employee", week: "Week", weekOf: "Week of", status: "Status", totalHours: "Total hours", overtime: "Overtime", regular: "Regular", day: "Day", mode: "Mode", start: "Start", end: "End", hours: "Hours", lunch: "Lunch (min)", netHours: "Net", selectEmployee: "Select employee", noTimesheets: "No timesheets yet", allStatuses: "All statuses", submit: "Submit", approve: "Approve", reject: "Reject", payroll: "Payroll", rate: "Rate", regularPay: "Regular pay", overtimePay: "Overtime pay", payStub: "Pay stub", postPayroll: "Post payroll", payrollFor: "Payroll", salaryAccount: "Salary expense account", withholdingAccount: "Withholdings account (liability)", gross: "Gross", taxes: "Taxes", insurance: "Insurance", net: "Net pay", rejectReason: "Reason for rejection", statuses: { draft: "Draft", submitted: "Submitted", approved: "Approved", paid: "Paid" }, modes: { clock: "Clock", hours: "Hours" }, days: { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" } }, dashboard: { recurringDue: "recurring template(s) pending this month", financialPosition: "Financial position", assets: "Assets", liabilities: "Liabilities", equity: "Equity", netIncome: "Net income", journalActivity: "Journal activity", draftEntries: "Draft entries", postedEntries: "Posted entries", receivables: "Receivables (customers owe)", payables: "Payables (we owe)", lowStock: "Products at/below min stock", pendingTimesheets: "Timesheets awaiting approval", quickActions: "Quick actions", newPurchase: "New purchase", newSale: "New sale", newEntry: "New journal entry" }, admin: { title: "Admin", geminiUsage: "Gemini Usage", since: "Since", refresh: "Refresh", rawJson: "Raw response" } }, gn = { common: { appName: "HRMfinance", loading: "Cargando\u2026", save: "Guardar", cancel: "Cancelar", delete: "Eliminar", edit: "Editar", add: "Agregar", search: "Buscar", actions: "Acciones", error: "Algo sali\xF3 mal", confirmDelete: "\xBFSeguro que desea eliminar esto?", noResults: "Sin resultados", total: "Total", year: "A\xF1o", print: "Imprimir / PDF", export: "Exportar CSV", signOut: "Cerrar sesi\xF3n", close: "Cerrar", menu: "Men\xFA" }, ai: { entryTitle: "Describe la operaci\xF3n y la IA arma el asiento", entryPlaceholder: 'p.ej. "pagu\xE9 245.00 de internet Spectrum con cheque del banco Fifth Third"', templateTitle: "Describe la plantilla y la IA arma campos + reglas de l\xEDneas", templatePlaceholder: 'p.ej. "pago de n\xF3mina semanal de un empleado: horas \xD7 su tarifa, contra caja"', generate: "Generar", thinking: "Pensando\u2026", scanReceipt: "Escanear factura (IA)", bankSuggest: "Asiento IA", bankSuggestHint: "La IA clasifica este movimiento y arma el asiento borrador", analysisTitle: "An\xE1lisis financiero con IA", analyze: "Analizar", analysisHint: "Env\xEDa las cifras clave del a\xF1o a la IA y devuelve una lectura en lenguaje claro: estado, alertas y acciones recomendadas.", errors: { unavailable: "La IA no est\xE1 disponible a\xFAn \u2014 falta la operaci\xF3n askGemini en el servidor", empty: "La IA no devolvi\xF3 respuesta", badJson: "La IA devolvi\xF3 una respuesta inv\xE1lida \u2014 intenta de nuevo" } }, yearClose: { title: "Cierre de a\xF1o", checks: "Verificaciones previas", noDrafts: "Sin asientos en borrador", draftsPending: "asientos en borrador \u2014 contabil\xEDcelos o an\xFAlelos primero", resultAccount: "Cuenta de resultado del ejercicio (Patrimonio)", preview: "Vista previa del asiento de cierre", closingEntry: "Cierre del ejercicio", openingEntry: "Saldos de apertura", generateClose: "Generar asiento de cierre (borrador)", generateOpening: "Generar asiento de apertura", created: "Asiento borrador creado", hint: "Ambos asientos se crean como borradores \u2014 rev\xEDselos en el Diario y contabil\xEDcelos cuando est\xE9n listos." }, nav: { groups: { accounting: "Contabilidad", operations: "Operaciones", people: "Personal", admin: "Administraci\xF3n" }, dashboard: "Panel", accounts: "Plan de Cuentas", reports: "Reportes", trialBalance: "Balance de Comprobaci\xF3n", balanceSheet: "Balance General", cashFlow: "Flujo de Efectivo", cashAdjustments: "Ajustes (variaciones no-efectivo)", netCashFlow: "Flujo neto de efectivo", cashPosition: "Movimiento de efectivo y bancos", cashDelta: "Variaci\xF3n total de efectivo", cashReconciles: "El flujo neto coincide con la variaci\xF3n de efectivo", cashGap: "Diferencia vs variaci\xF3n de efectivo", monthlyPnl: "P&L Mensual", incomeStatement: "Estado de Resultados" }, login: { title: "HRMfinance", subtitle: "Inicie sesi\xF3n para continuar", signingIn: "Iniciando sesi\xF3n\u2026", failed: "Error al iniciar sesi\xF3n", invalidSession: "La autenticaci\xF3n fue exitosa pero la sesi\xF3n es inv\xE1lida.", sso: "Iniciar sesi\xF3n con SSO", backToLogin: "Volver al inicio de sesi\xF3n" }, accounts: { title: "Plan de Cuentas", addAccount: "Agregar cuenta", addSubAccount: "Agregar subcuenta", editAccount: "Editar cuenta", accountNumber: "N\xFAmero de cuenta", name: "Nombre", type: "Tipo", category: "Categor\xEDa", description: "Descripci\xF3n", parentAccount: "Cuenta padre", balance: "Saldo", active: "Activa", inactive: "Inactiva", bankAccount: "Cuenta bancaria", bankName: "Banco", bankAccountNumber: "N\xFAmero de cuenta bancaria", bankAccountType: "Tipo de cuenta bancaria", piggybank: "Cuenta de caja", piggybankLabel: "Etiqueta de caja", chequesEnTransito: "Cuenta de cheques en tr\xE1nsito", flatView: "Lista", treeView: "\xC1rbol", allTypes: "Todos los tipos", cannotDelete: "Esta cuenta tiene subcuentas o transacciones y no puede eliminarse.", types: { Asset: "Activo", Liability: "Pasivo", Equity: "Patrimonio", Revenue: "Ingreso", Expense: "Gasto" }, ledger: "Submayor", date: "Fecha", reference: "Referencia", debit: "D\xE9bito", credit: "Cr\xE9dito", noTransactions: "Sin transacciones este a\xF1o", noMatches: "Sin transacciones que coincidan con los filtros", allAccounts: "Todas las cuentas", backToAccounts: "Volver al plan de cuentas" }, reports: { trialBalance: "Balance de Comprobaci\xF3n", balanceSheet: "Balance General", account: "Cuenta", totals: "Totales", balanced: "Cuadrado", outOfBalance: "Descuadre", assets: "Activos", liabilities: "Pasivos", equity: "Patrimonio", netIncome: "Resultado (Ingresos \u2212 Gastos)", totalAssets: "Total activos", totalLiabilitiesEquity: "Total pasivos + patrimonio", incomeStatement: "Estado de Resultados", revenue: "Ingresos", expenses: "Gastos", netIncomeTotal: "Resultado neto", margin: "Margen", audit: { run: "Auditar diferencia", title: "Auditor\xEDa del descuadre", empty: "No se encontraron asientos sospechosos", score: "Riesgo", hints: { transposition: "El descuadre es divisible entre 9 \u2014 posible transposici\xF3n de d\xEDgitos (ej. 54 escrito como 45)", wrongSide: "Un asiento por la mitad del descuadre existe \u2014 posible monto asentado al lado contrario" }, reasons: { title: "Se\xF1ales", imbalance: "Asiento descuadrado internamente", exactMatch: "Su descuadre interno coincide con la diferencia", amountMatch: "Su total coincide con la diferencia", lineMatch: "Una l\xEDnea coincide con la diferencia", halfMatch: "Su total es la mitad de la diferencia (lado contrario)", rounding: "Montos con residuo de redondeo", duplicate: "Posible duplicado (misma fecha y monto)", draft: "Es borrador \u2014 contabil\xEDcelo o excl\xFAyalo" } } }, journal: { serverSearch: "Buscar en servidor", serverSearchHint: "Buscar todo el a\xF1o en el servidor (Enter)", serverResults: "Resultados del servidor", title: "Diario", newEntry: "Nuevo asiento", entryNumber: "Asiento #", date: "Fecha", description: "Descripci\xF3n", reference: "Referencia", debits: "D\xE9bitos", credits: "Cr\xE9ditos", status: "Estado", lines: "L\xEDneas", line: "L\xEDnea", account: "Cuenta", debit: "D\xE9bito", credit: "Cr\xE9dito", addLine: "Agregar l\xEDnea", removeLine: "Quitar l\xEDnea", balanced: "Cuadrado", difference: "Diferencia", post: "Contabilizar", void: "Anular", viewEntry: "Ver asiento", referenceId: "Entidad (referenceId)", postedAt: "Contabilizado", postedBy: "Contabilizado por", voidedBy: "Anulado por", updatedBy: "Editado por", createdBy: "Creado por", allStatuses: "Todos los estados", noEntries: "Sin asientos este a\xF1o", confirmPost: "\xBFContabilizar este asiento? Los asientos contabilizados no se pueden editar.", confirmVoid: "\xBFAnular este asiento?", statuses: { draft: "Borrador", posted: "Contabilizado", void: "Anulado" }, errors: { dateRequired: "La fecha es obligatoria", descriptionRequired: "La descripci\xF3n es obligatoria", linesRequired: "Se requiere al menos una l\xEDnea", lineAccount: "L\xEDnea {n}: la cuenta es obligatoria", lineAmount: "L\xEDnea {n}: se requiere un monto d\xE9bito o cr\xE9dito", lineBothSides: "L\xEDnea {n}: no puede tener d\xE9bito y cr\xE9dito a la vez", notBalanced: "El asiento no est\xE1 cuadrado \u2014 d\xE9bitos deben igualar cr\xE9ditos", deletePosted: "Los asientos contabilizados no se pueden eliminar. An\xFAlelos.", notFound: "Asiento no encontrado" } }, templates: { title: "Plantillas", launch: "Usar plantilla", manage: "Gestionar plantillas", newTemplate: "Nueva plantilla", editTemplate: "Editar plantilla", noTemplates: "A\xFAn no hay plantillas", category: "Categor\xEDa", fields: "Campos", lineRules: "Reglas de l\xEDneas", settings: "Configuraci\xF3n", preview: "Vista previa", generate: "Crear asiento", usageCount: "Usada {n} veces", recurrenceDay: "Recurrente \u2014 d\xEDa del mes (vac\xEDo = no)", dynamicAccount: "Cuenta din\xE1mica (expresi\xF3n)", connectors: "Conectores", connector: { provider: "Proveedor", customer: "Cliente", employee: "Empleado" }, connectorInfoTitle: "Conectores: proveedores, clientes y empleados", connectorInfoBody: "Al ejecutar la plantilla puedes escoger un proveedor, cliente y/o empleado. Sus campos reales se vuelven variables usables en cualquier parte de esta plantilla \u2014 descripci\xF3n por defecto, formato de referencia, expresiones de monto, cuenta din\xE1mica, referenceId \u2014 y los campos de texto cuyo nombre mencione la entidad se auto-rellenan.", connectorRateHint: "rate = tarifa horaria efectiva", connectorInfoExample: 'Ejemplo: una regla de l\xEDnea con cuenta din\xE1mica "{provider.relatedAccountId}", referenceId "{provider.id}" y monto "{monto}" debita la CxP del proveedor escogido; un monto de n\xF3mina puede ser "{horas} * {employee.rate}".', connectorVars: "Variables: {provider.name}, {provider.relatedAccountId}, {customer.name}, {customer.relatedAccountId}, {employee.name}, {employee.rate}\u2026", connectorHint: "Los conectores exponen los campos reales de la entidad: {provider.name}, {provider.id}, {provider.relatedAccountId}, {customer.taxId}, {employee.rate}\u2026", active: "Activa", inactive: "Inactiva", errors: { fieldRequired: "{0} es obligatorio", accountNotFound: "Cuenta no encontrada: {0}", badAmount: "Monto inv\xE1lido en l\xEDnea: {0}", minLines: "La plantilla debe generar al menos 2 l\xEDneas", notBalanced: "El asiento generado no est\xE1 cuadrado" } }, providers: { title: "Proveedores y Clientes", newEntity: "Nueva entidad", editEntity: "Editar entidad", name: "Nombre", type: "Tipo", email: "Correo", phone: "Tel\xE9fono", address: "Direcci\xF3n", taxId: "ID fiscal", contactPerson: "Persona de contacto", notes: "Notas", balance: "Saldo", relatedAccount: "Cuenta relacionada (CxP/CxC)", active: "Activo", inactive: "Inactivo", allTypes: "Todos", noEntities: "A\xFAn no hay proveedores ni clientes", recordPayment: "Registrar pago", recordCollection: "Registrar cobro", amount: "Monto", paymentMethod: "M\xE9todo de pago", date: "Fecha", reference: "Referencia", description: "Descripci\xF3n", weOwe: "Le debemos", theyOwe: "Nos deben", settled: "Saldado", types: { customer: "Cliente", provider: "Proveedor", both: "Ambos" }, methods: { cash: "Efectivo", check: "Cheque", transfer: "Transferencia", zelle: "Zelle", credit_card: "Tarjeta", other: "Otro" }, document: "Documento", viewDocuments: "Documentos", noDocuments: "Sin documentos este a\xF1o", pendingDocs: "Documentos pendientes", cashAccount: "Cuenta de efectivo/banco", tabs: { all: "Todos", pending: "Pendientes", settled: "Saldados" }, advance: "Anticipo", openEntry: "Ver asiento contable", advanceAccount: "Cuenta de anticipos", applyAdvance: "Aplicar anticipo", accountsPayable: "Cuentas por Pagar", accountsReceivable: "Cuentas por Cobrar", multiPayment: "Pago m\xFAltiple", multiCollection: "Cobro m\xFAltiple", sendReminder: "Enviar recordatorio de pago", reminderSubject: "Recordatorio de pago", reminderBody: "Estimado", reminderIntro: "Seg\xFAn nuestros registros, tiene los siguientes documentos pendientes:", directory: "Directorio", aging: "Antig\xFCedad de saldos", agingDays: "d\xEDas", agingBuckets: { b30: "1\u201330", b60: "31\u201360", b90: "61\u201390", b90p: "+90" }, cashMovement: "Movimiento de efectivo", extraLines: "L\xEDneas adicionales", addLine: "Agregar l\xEDnea", debit: "D\xE9bito", credit: "Cr\xE9dito", addAdvanceFor: "Agregar anticipo para\u2026", newAdvance: "NUEVO ANTICIPO", applyToAR: "Aplicar a CxC (sin efectivo)", applyToAP: "Aplicar a CxP (sin efectivo)", errors: { notFound: "Entidad no encontrada", noRelatedAccount: "Esta entidad no tiene cuenta CxP/CxC vinculada \u2014 ed\xEDtela y seleccione una cuenta relacionada", noAdvanceAccount: "Esta entidad no tiene cuenta de anticipos \u2014 ed\xEDtela y seleccione una", cashAccountRequired: "Seleccione la cuenta de efectivo/banco", amountRequired: "Ingrese un monto o seleccione documentos pendientes" } }, inventory: { title: "Inventario", products: "Productos", movements: "Movimientos", realCost: "Costo real", realCostHint: "Costo promedio ponderado del stock en mano (avg_cost del backend)", productLedger: "Submayor del producto", price: "Precio", netMovement: "Neto", stockCount: "Conteo f\xEDsico", systemQty: "Sistema", countedQty: "Contado", difference: "Diferencia", applyCount: "Aplicar diferencias", countApplied: "Ajustes aplicados", confirmCount: "\xBFAplicar las diferencias del conteo como movimientos de inventario?", searchMovements: "Buscar movimientos\u2026", movementDetail: "Detalle del movimiento", confirmDeleteMovement: "\xBFEliminar este movimiento? El impacto en existencias NO se revierte autom\xE1ticamente.", stock: "Existencias", newProduct: "Nuevo producto", editProduct: "Editar producto", name: "Nombre", sku: "SKU", upc: "UPC", code: "C\xF3digo", category: "Categor\xEDa", description: "Descripci\xF3n", unitOfMeasure: "Unidad", unitCost: "Costo unitario", sellingPrice: "Precio de venta", minStock: "Stock m\xEDn.", maxStock: "Stock m\xE1x.", active: "Activo", inactive: "Inactivo", noProducts: "A\xFAn no hay productos", location: "Ubicaci\xF3n", fromLocation: "Desde ubicaci\xF3n", toLocation: "Hacia ubicaci\xF3n", quantity: "Cantidad", reference: "Referencia", notes: "Notas", newMovement: "Nuevo movimiento", movementType: "Tipo de movimiento", product: "Producto", noMovements: "Sin movimientos", lowStock: "Stock bajo", date: "Fecha", type: "Tipo", allLocations: "Todas las ubicaciones", types: { in: "Entrada", out: "Salida", adjustment: "Ajuste", transfer: "Transferencia", entry: "Entrada", sales: "Venta", sale: "Venta", purchase: "Compra" } }, transactions: { title: "Operaciones", confirmDeleteInvoice: "\xBFEliminar este registro? Solo se borra el documento del historial \u2014 el asiento contable NO se anula (hazlo en el Diario).", editQuote: "Editar / convertir cotizaci\xF3n", quoteUpdated: "Cotizaci\xF3n actualizada", saveQuote: "Guardar cotizaci\xF3n", quoteSaved: "Cotizaci\xF3n guardada", convertQuote: "Convertir a factura", quote: "Cotizaci\xF3n", quotes: "Cotizaciones", invoice: "Factura", purchaseReceipt: "Registro de compra", services: "Servicios", productsSubtotal: "Subtotal productos", servicesSubtotal: "Subtotal servicios", history: "Historial", number: "N\xFAmero", entity: "Proveedor/Cliente", allTypes: "Todos", noTransactions: "Sin transacciones", compras: "Compras", facturacion: "Facturaci\xF3n", mermas: "Mermas", date: "Fecha", description: "Descripci\xF3n", reference: "Referencia", provider: "Proveedor", customer: "Cliente", product: "Producto", qty: "Cant.", unitCost: "Costo unitario", unitPrice: "Precio unitario", subtotal: "Subtotal", addLine: "Agregar l\xEDnea", serviceLines: "Servicios", serviceName: "Servicio", expenseAccount: "Cuenta de gasto", paymentMode: "Forma de pago", cash: "Efectivo", bank: "Banco", credit: "Cr\xE9dito", inventoryAccount: "Cuenta de inventario", paymentAccount: "Cuenta de efectivo/banco", apAccount: "Cuenta por pagar (CxP)", arAccount: "Cuenta por cobrar (CxC)", revenueAccount: "Cuenta de ingreso", cogsAccount: "Cuenta de costo (COGS)", lossAccount: "Cuenta de p\xE9rdida", location: "Ubicaci\xF3n", receiveStock: "Ingresar a inventario", postCogs: "Registrar costo de venta", reason: "Motivo", total: "Total", post: "Registrar transacci\xF3n", posted: "Transacci\xF3n registrada", selectAccount: "Seleccionar cuenta", reasons: { breakage: "Rotura", loss: "P\xE9rdida", expired: "Vencido", damaged: "Da\xF1ado", theft: "Robo", other: "Otro" }, errors: { needLine: "Agregue al menos una l\xEDnea", needAccounts: "Seleccione todas las cuentas requeridas", needLocation: "La ubicaci\xF3n es obligatoria para mover inventario", badTotal: "El total debe ser mayor a cero" } }, banking: { title: "Conciliaci\xF3n Bancaria", exactMatch: "Exacta", goodMatch: "Buena", possibleMatch: "Posible", showLowScore: "Mostrar coincidencias d\xE9biles", account: "Cuenta bancaria", selectAccount: "Seleccione una cuenta bancaria", noBankAccounts: "No hay cuentas marcadas como bancarias. Marque una cuenta como bancaria en el plan de cuentas.", importCsv: "Importar CSV", statements: "Extractos bancarios", entryRecords: "Registros del libro mayor", date: "Fecha", description: "Descripci\xF3n", reference: "Referencia", debit: "D\xE9bito", credit: "Cr\xE9dito", balance: "Saldo", status: "Estado", reconciled: "Conciliado", unreconciled: "Sin conciliar", suggested: "Coincidencia sugerida", match: "Conciliar", unmatch: "Desconciliar", score: "Puntaje", noStatements: "Sin extractos. Importe un CSV para comenzar.", noRecords: "Sin registros del mayor para esta cuenta este a\xF1o", csvHelp: "Columnas: fecha, descripci\xF3n, referencia, d\xE9bito, cr\xE9dito, saldo", csvPaste: "Pegue las filas CSV", importBtn: "Importar", imported: "{n} extractos importados" }, employees: { title: "Empleados", newEmployee: "Nuevo empleado", editEmployee: "Editar empleado", name: "Nombre", position: "Cargo", department: "Departamento", email: "Correo", phone: "Tel\xE9fono", startDate: "Fecha de ingreso", status: "Estado", employeeNumber: "N\xB0 empleado", clockingNumber: "N\xB0 reloj", employmentType: "Tipo de empleo", ssn: "SSN", payType: "Tipo de pago", hourlyRate: "Tarifa por hora", annualSalary: "Salario anual", overtimeRate: "Tarifa extra", standardHours: "Horas est\xE1ndar/semana", lunchMinutes: "Almuerzo (minutos)", taxRate: "Tasa de impuesto (%)", insuranceDeduction: "Deducci\xF3n de seguro", allStatuses: "Todos los estados", allDepartments: "Todos los departamentos", noEmployees: "A\xFAn no hay empleados", hourlyRateLabel: "Tarifa", statuses: { active: "Activo", inactive: "Inactivo", terminated: "Terminado", on_leave: "En licencia" }, payTypes: { hourly: "Por hora", salary: "Salario" } }, timesheets: { title: "Tarjetas de Tiempo", newCard: "Nueva tarjeta semanal", editCard: "Editar tarjeta semanal", employee: "Empleado", week: "Semana", weekOf: "Semana del", status: "Estado", totalHours: "Horas totales", overtime: "Horas extra", regular: "Regulares", day: "D\xEDa", mode: "Modo", start: "Entrada", end: "Salida", hours: "Horas", lunch: "Almuerzo (min)", netHours: "Neto", selectEmployee: "Seleccione empleado", noTimesheets: "A\xFAn no hay tarjetas", allStatuses: "Todos los estados", submit: "Enviar", approve: "Aprobar", reject: "Rechazar", payroll: "N\xF3mina", rate: "Tarifa", regularPay: "Pago regular", overtimePay: "Pago extra", payStub: "Tal\xF3n de pago", postPayroll: "Contabilizar n\xF3mina", payrollFor: "N\xF3mina", salaryAccount: "Cuenta de gasto de salario", withholdingAccount: "Cuenta de retenciones (pasivo)", gross: "Bruto", taxes: "Impuestos", insurance: "Seguro", net: "Pago neto", rejectReason: "Motivo del rechazo", statuses: { draft: "Borrador", submitted: "Enviada", approved: "Aprobada", paid: "Pagada" }, modes: { clock: "Reloj", hours: "Horas" }, days: { monday: "Lunes", tuesday: "Martes", wednesday: "Mi\xE9rcoles", thursday: "Jueves", friday: "Viernes", saturday: "S\xE1bado", sunday: "Domingo" } }, dashboard: { recurringDue: "plantilla(s) recurrente(s) pendiente(s) este mes", financialPosition: "Posici\xF3n financiera", assets: "Activos", liabilities: "Pasivos", equity: "Patrimonio", netIncome: "Resultado", journalActivity: "Actividad del diario", draftEntries: "Asientos borrador", postedEntries: "Asientos contabilizados", receivables: "Por cobrar (clientes deben)", payables: "Por pagar (debemos)", lowStock: "Productos en/bajo stock m\xEDnimo", pendingTimesheets: "Tarjetas por aprobar", quickActions: "Acciones r\xE1pidas", newPurchase: "Nueva compra", newSale: "Nueva venta", newEntry: "Nuevo asiento" }, admin: { title: "Admin", geminiUsage: "Uso de Gemini", since: "Desde", refresh: "Actualizar", rawJson: "Respuesta cruda" } }, vn = () => {
  return "es";
}, [Le, bn] = createSignal(vn()), [Ne, An] = createSignal({ en: {}, es: {} }), F = { get language() {
  return Le();
}, get translations() {
  return Ne();
}, setLanguage(e) {
  bn(e);
}, setTranslations(e) {
  An(e);
}, translate(e, t) {
  const n = Le(), a = Ne()[n];
  if (!a) return t || e;
  const o = e.split(".");
  let r = a;
  for (const s of o) if (r && typeof r == "object" && s in r) r = r[s];
  else return t || e;
  return typeof r == "string" ? r : t || e;
}, t(e, t) {
  return this.translate(e, t);
} }, kn = () => ({ t: F.translate.bind(F), language: F.language, setLanguage: F.setLanguage });
F.setTranslations({ en: yn, es: gn });
var wn = ["<div", ' class="md:hidden fixed inset-0 z-30 bg-black/30"></div>'], Sn = ["<div", ' class="space-y-0.5"><p class="px-3 pb-1 text-[11px] font-medium text-gray-500">', "</p><!--$-->", "<!--/--></div>"], Cn = ["<div", ' class="min-h-screen md:flex"><header class="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3"><button class="p-1.5 -ml-1.5 rounded-lg text-gray-600 hover:bg-gray-50"', ">", '</button><div class="w-7 h-7 rounded-lg bg-brand-600 text-white grid place-items-center font-semibold text-sm">H</div><span class="font-semibold text-gray-900">', "</span></header><!--$-->", '<!--/--><aside class="', '"><div class="px-4 py-5 flex items-center gap-2 border-b border-gray-100"><div class="w-8 h-8 rounded-lg bg-brand-600 text-white grid place-items-center font-semibold">H</div><span class="font-semibold text-gray-900">', '</span><button class="md:hidden ml-auto p-1.5 rounded-lg text-gray-500 hover:bg-gray-50"', ">", '</button></div><nav class="flex-1 px-2 py-3 space-y-4 overflow-y-auto"><!--$-->', "<!--/--><!--$-->", '<!--/--></nav><div class="px-4 py-3 border-t border-gray-100 space-y-2"><label class="flex items-center justify-between text-xs text-gray-500"><!--$-->', '<!--/--><select class="ml-2 border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-700 bg-white"', ">", '</select></label><button class="text-xs text-gray-500 hover:text-gray-700">', '</button><div class="flex items-center justify-between"><span class="text-xs text-gray-500 truncate">', '</span><button class="text-xs text-red-500 hover:text-red-700">', '</button></div></div></aside><main class="flex-1 min-w-0 p-4 md:p-6">', "</main></div>"], Pn = ["<p", ' class="px-3 pb-1 text-[11px] font-medium text-gray-500">', "</p>"], En = ["<div", ' class="space-y-0.5"><!--$-->', "<!--/--><!--$-->", "<!--/--></div>"], xn = ["<option", ">", "</option>"];
function Rn(e) {
  var _a2;
  const { t } = kn(), n = he(), [a, o] = createSignal(false), r = () => n.pathname.startsWith("/timesheets"), s = [{ items: [{ href: "/", key: "nav.dashboard", fallback: "Dashboard", icon: ca }] }, { key: "nav.groups.accounting", fallback: "Accounting", items: [{ href: "/accounts", key: "nav.accounts", fallback: "Chart of Accounts", icon: aa }, { href: "/journal", key: "journal.title", fallback: "Journal", icon: ha }, { href: "/reports", key: "nav.reports", fallback: "Reports", icon: Aa }] }, { key: "nav.groups.operations", fallback: "Operations", items: [{ href: "/providers", key: "providers.title", fallback: "Providers & Customers", icon: Na }, { href: "/inventory", key: "inventory.title", fallback: "Inventory", icon: ga }, { href: "/transactions", key: "transactions.title", fallback: "Operations", icon: Sa }, { href: "/banking", key: "banking.title", fallback: "Bank Reconciliation", icon: ra }] }, { key: "nav.groups.people", fallback: "People", items: [{ href: "/employees", key: "employees.title", fallback: "Employees", icon: Ta }] }], c = s.flatMap((i) => i.items);
  createEffect(() => {
    var _a3;
    const i = n.pathname;
    o(false);
    const m = (_a3 = c.find((f) => f.href === "/" ? i === "/" : i.startsWith(f.href))) != null ? _a3 : r() ? c.find((f) => f.href === "/employees") : void 0;
    document.title = m ? `${t(m.key, m.fallback)} \xB7 HRMfinance` : "HRMfinance";
  });
  const d = (i) => createComponent(xe, { get href() {
    return i.item.href;
  }, get end() {
    return i.item.href === "/";
  }, get class() {
    return `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 ${i.item.href === "/employees" && r() ? "bg-brand-50 text-brand-700 font-medium" : ""}`;
  }, activeClass: "bg-brand-50 text-brand-700 font-medium", get children() {
    return [createComponent(i.item.icon, { size: 17, class: "shrink-0" }), t(i.item.key, i.item.fallback)];
  } });
  return ssr(Cn, ssrHydrationKey(), ssrAttribute("aria-label", escape(t("common.menu", "Menu"), true), false) + ssrAttribute("aria-expanded", escape(a(), true), false), escape(createComponent(ua, { size: 20 })), escape(t("common.appName", "HRMfinance")), escape(createComponent(Show, { get when() {
    return a();
  }, get children() {
    return ssr(wn, ssrHydrationKey());
  } })), `fixed md:static inset-y-0 left-0 z-40 w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col
          transform transition-transform md:translate-x-0 ${a() ? "translate-x-0" : "-translate-x-full"}`, escape(t("common.appName", "HRMfinance")), ssrAttribute("aria-label", escape(t("common.close", "Close"), true), false), escape(createComponent(Ba, { size: 18 })), escape(createComponent(For, { each: s, children: (i) => ssr(En, ssrHydrationKey(), escape(createComponent(Show, { get when() {
    return i.key;
  }, get children() {
    return ssr(Pn, ssrHydrationKey(), escape(t(i.key, i.fallback)));
  } })), escape(createComponent(For, { get each() {
    return i.items;
  }, children: (m) => createComponent(d, { item: m }) }))) })), escape(createComponent(Show, { get when() {
    return dn();
  }, get children() {
    return ssr(Sn, ssrHydrationKey(), escape(t("nav.groups.admin", "Admin")), escape(createComponent(xe, { href: "/admin/gemini", end: true, class: "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900", activeClass: "bg-brand-50 text-brand-700 font-medium", get children() {
      return [createComponent(Ea, { size: 17, class: "shrink-0" }), t("admin.geminiUsage", "Gemini Usage")];
    } })));
  } })), escape(t("common.year", "Year")), ssrAttribute("value", escape(hn(), true), false), escape(createComponent(For, { get each() {
    return fn();
  }, children: (i) => ssr(xn, ssrHydrationKey() + ssrAttribute("value", escape(i, true), false), escape(i)) })), F.language === "es" ? "EN" : "ES", escape((_a2 = Ae()) == null ? void 0 : _a2.email), escape(t("common.signOut", "Sign out")), escape(e.children));
}
var Tn = ["<svg", ' viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>'];
function In(e) {
  var _a2;
  return ssr(Tn, ssrHydrationKey() + ssrAttribute("class", escape(["animate-spin text-gray-400", (_a2 = e.class) != null ? _a2 : "w-5 h-5"].join(" "), true), false));
}
var Ln = ["<div", ' class="min-h-screen grid place-items-center">', "</div>"];
function Nn(e) {
  const t = he(), n = Rt();
  onMount(() => {
    un();
  });
  const a = () => t.pathname === "/login" || t.pathname === "/callback";
  return createEffect(() => {
    Te() || (!Ie() && !a() ? n("/login", { replace: true }) : Ie() && t.pathname === "/login" && n("/", { replace: true }));
  }), createComponent(Show, { get when() {
    return !Te();
  }, get fallback() {
    return ssr(Ln, ssrHydrationKey(), escape(createComponent(In, { class: "w-8 h-8" })));
  }, get children() {
    return createComponent(Show, { get when() {
      return !a();
    }, get fallback() {
      return createComponent(Suspense, { get children() {
        return e.children;
      } });
    }, get children() {
      return createComponent(Rn, { get children() {
        return createComponent(Suspense, { get children() {
          return e.children;
        } });
      } });
    } });
  } });
}
function Fn() {
  return createComponent(Wt, { root: Nn, get children() {
    return createComponent(au, {});
  } });
}

export { Fn as default };
//# sourceMappingURL=app-gVw5NYgQ.mjs.map
