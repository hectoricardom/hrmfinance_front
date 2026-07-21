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

function dt() {
  let t = /* @__PURE__ */ new Set();
  function e(r) {
    return t.add(r), () => t.delete(r);
  }
  let a = false;
  function n(r, o) {
    if (a) return !(a = false);
    const s = { to: r, options: o, defaultPrevented: false, preventDefault: () => s.defaultPrevented = true };
    for (const i of t) i.listener({ ...s, from: i.location, retry: (d) => {
      d && (a = true), i.navigate(r, { ...o, resolve: false });
    } });
    return !s.defaultPrevented;
  }
  return { subscribe: e, confirm: n };
}
let fe;
function Se() {
  (!window.history.state || window.history.state._depth == null) && window.history.replaceState({ ...window.history.state, _depth: window.history.length - 1 }, ""), fe = window.history.state._depth;
}
isServer || Se();
function Wt(t) {
  return { ...t, _depth: window.history.state && window.history.state._depth };
}
function Gt(t, e) {
  let a = false;
  return () => {
    const n = fe;
    Se();
    const r = n == null ? null : fe - n;
    if (a) {
      a = false;
      return;
    }
    r && e(r) ? (a = true, window.history.go(-r)) : t();
  };
}
const Yt = /^(?:[a-z0-9]+:)?\/\//i, Qt = /^\/+|(\/)\/+$/g, ut = "http://sr";
function q(t, e = false) {
  const a = t.replace(Qt, "$1");
  return a ? e || /^[?#]/.test(a) ? a : "/" + a : "";
}
function oe(t, e, a) {
  if (Yt.test(e)) return;
  const n = q(t), r = a && q(a);
  let o = "";
  return !r || e.startsWith("/") ? o = n : r.toLowerCase().indexOf(n.toLowerCase()) !== 0 ? o = n + r : o = r, (o || "/") + q(e, !o);
}
function Jt(t, e) {
  if (t == null) throw new Error(e);
  return t;
}
function Kt(t, e) {
  return q(t).replace(/\/*(\*.*)?$/g, "") + q(e);
}
function mt(t) {
  const e = {};
  return t.searchParams.forEach((a, n) => {
    n in e ? Array.isArray(e[n]) ? e[n].push(a) : e[n] = [e[n], a] : e[n] = a;
  }), e;
}
function Zt(t, e, a) {
  const [n, r] = t.split("/*", 2), o = n.split("/").filter(Boolean), s = o.length;
  return (i) => {
    const d = i.split("/").filter(Boolean), c = d.length - s;
    if (c < 0 || c > 0 && r === void 0 && !e) return null;
    const l = { path: s ? "" : "/", params: {} }, u = (g) => a === void 0 ? void 0 : a[g];
    for (let g = 0; g < s; g++) {
      const v = o[g], C = v[0] === ":", p = C ? d[g] : d[g].toLowerCase(), h = C ? v.slice(1) : v.toLowerCase();
      if (C && me(p, u(h))) l.params[h] = p;
      else if (C || !me(p, h)) return null;
      l.path += `/${p}`;
    }
    if (r) {
      const g = c ? d.slice(-c).join("/") : "";
      if (me(g, u(r))) l.params[r] = g;
      else return null;
    }
    return l;
  };
}
function me(t, e) {
  const a = (n) => n === t;
  return e === void 0 ? true : typeof e == "string" ? a(e) : typeof e == "function" ? e(t) : Array.isArray(e) ? e.some(a) : e instanceof RegExp ? e.test(t) : false;
}
function Xt(t) {
  const [e, a] = t.pattern.split("/*", 2), n = e.split("/").filter(Boolean);
  return n.reduce((r, o) => r + (o.startsWith(":") ? 2 : 3), n.length - (a === void 0 ? 0 : 1));
}
function pt(t) {
  const e = /* @__PURE__ */ new Map(), a = getOwner();
  return new Proxy({}, { get(n, r) {
    return e.has(r) || runWithOwner(a, () => e.set(r, createMemo(() => t()[r]))), e.get(r)();
  }, getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  }, ownKeys() {
    return Reflect.ownKeys(t());
  }, has(n, r) {
    return r in t();
  } });
}
function ft(t) {
  let e = /(\/?\:[^\/]+)\?/.exec(t);
  if (!e) return [t];
  let a = t.slice(0, e.index), n = t.slice(e.index + e[0].length);
  const r = [a, a += e[1]];
  for (; e = /^(\/\:[^\/]+)\?/.exec(n); ) r.push(a += e[1]), n = n.slice(e[0].length);
  return ft(n).reduce((o, s) => [...o, ...r.map((i) => i + s)], []);
}
const ea = 100, ht = createContext(), we = createContext(), le = () => Jt(useContext(ht), "<A> and 'use' router primitives can be only used inside a Route."), ta = () => useContext(we) || le().base, aa = (t) => {
  const e = ta();
  return createMemo(() => e.resolvePath(t()));
}, na = (t) => {
  const e = le();
  return createMemo(() => {
    const a = t();
    return a !== void 0 ? e.renderPath(a) : a;
  });
}, ra = () => le().navigatorFactory(), ke = () => le().location;
function oa(t, e = "") {
  const { component: a, preload: n, load: r, children: o, info: s } = t, i = !o || Array.isArray(o) && !o.length, d = { key: t, component: a, preload: n || r, info: s };
  return yt(t.path).reduce((c, l) => {
    for (const u of ft(l)) {
      const g = Kt(e, u);
      let v = i ? g : g.split("/*", 1)[0];
      v = v.split("/").map((C) => C.startsWith(":") || C.startsWith("*") ? C : encodeURIComponent(C)).join("/"), c.push({ ...d, originalPath: l, pattern: v, matcher: Zt(v, !i, t.matchFilters) });
    }
    return c;
  }, []);
}
function sa(t, e = 0) {
  return { routes: t, score: Xt(t[t.length - 1]) * 1e4 - e, matcher(a) {
    const n = [];
    for (let r = t.length - 1; r >= 0; r--) {
      const o = t[r], s = o.matcher(a);
      if (!s) return null;
      n.unshift({ ...s, route: o });
    }
    return n;
  } };
}
function yt(t) {
  return Array.isArray(t) ? t : [t];
}
function gt(t, e = "", a = [], n = []) {
  const r = yt(t);
  for (let o = 0, s = r.length; o < s; o++) {
    const i = r[o];
    if (i && typeof i == "object") {
      i.hasOwnProperty("path") || (i.path = "");
      const d = oa(i, e);
      for (const c of d) {
        a.push(c);
        const l = Array.isArray(i.children) && i.children.length === 0;
        if (i.children && !l) gt(i.children, c.pattern, a, n);
        else {
          const u = sa([...a], n.length);
          n.push(u);
        }
        a.pop();
      }
    }
  }
  return a.length ? n : n.sort((o, s) => s.score - o.score);
}
function ee(t, e) {
  for (let a = 0, n = t.length; a < n; a++) {
    const r = t[a].matcher(e);
    if (r) return r;
  }
  return [];
}
function ia(t, e, a) {
  const n = new URL(ut), r = createMemo((l) => {
    const u = t();
    try {
      return new URL(u, n);
    } catch {
      return console.error(`Invalid path ${u}`), l;
    }
  }, n, { equals: (l, u) => l.href === u.href }), o = createMemo(() => r().pathname), s = createMemo(() => r().search, true), i = createMemo(() => r().hash), d = () => "", c = on$1(s, () => mt(r()));
  return { get pathname() {
    return o();
  }, get search() {
    return s();
  }, get hash() {
    return i();
  }, get state() {
    return e();
  }, get key() {
    return d();
  }, query: a ? a(c) : pt(c) };
}
let O;
function ca() {
  return O;
}
function la(t, e, a, n = {}) {
  const { signal: [r, o], utils: s = {} } = t, i = s.parsePath || ((y) => y), d = s.renderPath || ((y) => y), c = s.beforeLeave || dt(), l = oe("", n.base || "");
  if (l === void 0) throw new Error(`${l} is not a valid base path`);
  l && !r().value && o({ value: l, replace: true, scroll: false });
  const [u, g] = createSignal(false);
  let v;
  const C = (y, A) => {
    A.value === p() && A.state === k() || (v === void 0 && g(true), O = y, v = A, startTransition(() => {
      v === A && (h(v.value), w(v.state), resetErrorBoundaries(), isServer || B[1]((P) => P.filter(($) => $.pending)));
    }).finally(() => {
      v === A && batch(() => {
        O = void 0, y === "navigate" && xt(v), g(false), v = void 0;
      });
    }));
  }, [p, h] = createSignal(r().value), [k, w] = createSignal(r().state), M = ia(p, k, s.queryWrapper), T = [], B = createSignal(isServer ? Lt() : []), Z = createMemo(() => typeof n.transformUrl == "function" ? ee(e(), n.transformUrl(M.pathname)) : ee(e(), M.pathname)), Le = () => {
    const y = Z(), A = {};
    for (let P = 0; P < y.length; P++) Object.assign(A, y[P].params);
    return A;
  }, Rt = s.paramsWrapper ? s.paramsWrapper(Le, e) : pt(Le), Me = { pattern: l, path: () => l, outlet: () => null, resolvePath(y) {
    return oe(l, y);
  } };
  return createRenderEffect(on$1(r, (y) => C("native", y), { defer: true })), { base: Me, location: M, params: Rt, isRouting: u, renderPath: d, parsePath: i, navigatorFactory: It, matches: Z, beforeLeave: c, preloadRoute: Dt, singleFlight: n.singleFlight === void 0 ? true : n.singleFlight, submissions: B };
  function Tt(y, A, P) {
    untrack(() => {
      if (typeof A == "number") {
        A && (s.go ? s.go(A) : console.warn("Router integration does not support relative routing"));
        return;
      }
      const $ = !A || A[0] === "?", { replace: te, resolve: U, scroll: ae, state: F } = { replace: false, resolve: !$, scroll: true, ...P }, z = U ? y.resolvePath(A) : oe($ && M.pathname || "", A);
      if (z === void 0) throw new Error(`Path '${A}' is not a routable path`);
      if (T.length >= ea) throw new Error("Too many redirects");
      const Be = p();
      if (z !== Be || F !== k()) if (isServer) {
        const Oe = getRequestEvent();
        Oe && (Oe.response = { status: 302, headers: new Headers({ Location: z }) }), o({ value: z, replace: te, scroll: ae, state: F });
      } else c.confirm(z, P) && (T.push({ value: Be, replace: te, scroll: ae, state: k() }), C("navigate", { value: z, state: F }));
    });
  }
  function It(y) {
    return y = y || useContext(we) || Me, (A, P) => Tt(y, A, P);
  }
  function xt(y) {
    const A = T[0];
    A && (o({ ...y, replace: A.replace, scroll: A.scroll }), T.length = 0);
  }
  function Dt(y, A) {
    const P = ee(e(), y.pathname), $ = O;
    O = "preload";
    for (let te in P) {
      const { route: U, params: ae } = P[te];
      U.component && U.component.preload && U.component.preload();
      const { preload: F } = U;
      A && F && runWithOwner(a(), () => F({ params: ae, location: { pathname: y.pathname, search: y.search, hash: y.hash, query: mt(y), state: null, key: "" }, intent: "preload" }));
    }
    O = $;
  }
  function Lt() {
    const y = getRequestEvent();
    return y && y.router && y.router.submission ? [y.router.submission] : [];
  }
}
function da(t, e, a, n) {
  const { base: r, location: o, params: s } = t, { pattern: i, component: d, preload: c } = n().route, l = createMemo(() => n().path);
  d && d.preload && d.preload();
  const u = c ? c({ params: s, location: o, intent: O || "initial" }) : void 0;
  return { parent: e, pattern: i, path: l, outlet: () => d ? createComponent$1(d, { params: s, location: o, data: u, get children() {
    return a();
  } }) : a(), resolvePath(v) {
    return oe(r.path(), v, l());
  } };
}
const vt = (t) => (e) => {
  const { base: a } = e, n = children(() => e.children), r = createMemo(() => gt(n(), e.base || ""));
  let o;
  const s = la(t, r, () => o, { base: a, singleFlight: e.singleFlight, transformUrl: e.transformUrl });
  return t.create && t.create(s), createComponent(ht.Provider, { value: s, get children() {
    return createComponent(ua, { routerState: s, get root() {
      return e.root;
    }, get preload() {
      return e.rootPreload || e.rootLoad;
    }, get children() {
      return [(o = getOwner()) && null, createComponent(ma, { routerState: s, get branches() {
        return r();
      } })];
    } });
  } });
};
function ua(t) {
  const e = t.routerState.location, a = t.routerState.params, n = createMemo(() => t.preload && untrack(() => {
    t.preload({ params: a, location: e, intent: ca() || "initial" });
  }));
  return createComponent(Show, { get when() {
    return t.root;
  }, keyed: true, get fallback() {
    return t.children;
  }, children: (r) => createComponent(r, { params: a, location: e, get data() {
    return n();
  }, get children() {
    return t.children;
  } }) });
}
function ma(t) {
  if (isServer) {
    const r = getRequestEvent();
    if (r && r.router && r.router.dataOnly) {
      pa(r, t.routerState, t.branches);
      return;
    }
    r && ((r.router || (r.router = {})).matches || (r.router.matches = t.routerState.matches().map(({ route: o, path: s, params: i }) => ({ path: o.originalPath, pattern: o.pattern, match: s, params: i, info: o.info }))));
  }
  const e = [];
  let a;
  const n = createMemo(on$1(t.routerState.matches, (r, o, s) => {
    let i = o && r.length === o.length;
    const d = [];
    for (let c = 0, l = r.length; c < l; c++) {
      const u = o && o[c], g = r[c];
      s && u && g.route.key === u.route.key ? d[c] = s[c] : (i = false, e[c] && e[c](), createRoot((v) => {
        e[c] = v, d[c] = da(t.routerState, d[c - 1] || t.routerState.base, qe(() => n()[c + 1]), () => {
          var _a2;
          const C = t.routerState.matches();
          return (_a2 = C[c]) != null ? _a2 : C[0];
        });
      }));
    }
    return e.splice(r.length).forEach((c) => c()), s && i ? s : (a = d[0], d);
  }));
  return qe(() => n() && a)();
}
const qe = (t) => () => createComponent(Show, { get when() {
  return t();
}, keyed: true, children: (e) => createComponent(we.Provider, { value: e, get children() {
  return e.outlet();
} }) });
function pa(t, e, a) {
  const n = new URL(t.request.url), r = ee(a, new URL(t.router.previousUrl || t.request.url).pathname), o = ee(a, n.pathname);
  for (let s = 0; s < o.length; s++) {
    (!r[s] || o[s].route !== r[s].route) && (t.router.dataOnly = true);
    const { route: i, params: d } = o[s];
    i.preload && i.preload({ params: d, location: e.location, intent: "preload" });
  }
}
function fa([t, e], a, n) {
  return [t, n ? (r) => e(n(r)) : e];
}
function ha(t) {
  let e = false;
  const a = (r) => typeof r == "string" ? { value: r } : r, n = fa(createSignal(a(t.get()), { equals: (r, o) => r.value === o.value && r.state === o.state }), void 0, (r) => (!e && t.set(r), sharedConfig.registry && !sharedConfig.done && (sharedConfig.done = true), r));
  return t.init && onCleanup(t.init((r = t.get()) => {
    e = true, n[1](a(r)), e = false;
  })), vt({ signal: n, create: t.create, utils: t.utils });
}
function ya(t, e, a) {
  return t.addEventListener(e, a), () => t.removeEventListener(e, a);
}
function ga(t, e) {
  const a = t && document.getElementById(t);
  a ? a.scrollIntoView() : e && window.scrollTo(0, 0);
}
function va(t) {
  const e = new URL(t);
  return e.pathname + e.search;
}
function ba(t) {
  let e;
  const a = { value: t.url || (e = getRequestEvent()) && va(e.request.url) || "" };
  return vt({ signal: [() => a, (n) => Object.assign(a, n)] })(t);
}
const Aa = /* @__PURE__ */ new Map();
function Sa(t = true, e = false, a = "/_server", n) {
  return (r) => {
    const o = r.base.path(), s = r.navigatorFactory(r.base);
    let i, d;
    function c(p) {
      return p.namespaceURI === "http://www.w3.org/2000/svg";
    }
    function l(p) {
      if (p.defaultPrevented || p.button !== 0 || p.metaKey || p.altKey || p.ctrlKey || p.shiftKey) return;
      const h = p.composedPath().find((Z) => Z instanceof Node && Z.nodeName.toUpperCase() === "A");
      if (!h || e && !h.hasAttribute("link")) return;
      const k = c(h), w = k ? h.href.baseVal : h.href;
      if ((k ? h.target.baseVal : h.target) || !w && !h.hasAttribute("state")) return;
      const T = (h.getAttribute("rel") || "").split(/\s+/);
      if (h.hasAttribute("download") || T && T.includes("external")) return;
      const B = k ? new URL(w, document.baseURI) : new URL(w);
      if (!(B.origin !== window.location.origin || o && B.pathname && !B.pathname.toLowerCase().startsWith(o.toLowerCase()))) return [h, B];
    }
    function u(p) {
      const h = l(p);
      if (!h) return;
      const [k, w] = h, M = r.parsePath(w.pathname + w.search + w.hash), T = k.getAttribute("state");
      p.preventDefault(), s(M, { resolve: false, replace: k.hasAttribute("replace"), scroll: !k.hasAttribute("noscroll"), state: T ? JSON.parse(T) : void 0 });
    }
    function g(p) {
      const h = l(p);
      if (!h) return;
      const [k, w] = h;
      n && (w.pathname = n(w.pathname)), r.preloadRoute(w, k.getAttribute("preload") !== "false");
    }
    function v(p) {
      clearTimeout(i);
      const h = l(p);
      if (!h) return d = null;
      const [k, w] = h;
      d !== k && (n && (w.pathname = n(w.pathname)), i = setTimeout(() => {
        r.preloadRoute(w, k.getAttribute("preload") !== "false"), d = k;
      }, 20));
    }
    function C(p) {
      if (p.defaultPrevented) return;
      let h = p.submitter && p.submitter.hasAttribute("formaction") ? p.submitter.getAttribute("formaction") : p.target.getAttribute("action");
      if (!h) return;
      if (!h.startsWith("https://action/")) {
        const w = new URL(h, ut);
        if (h = r.parsePath(w.pathname + w.search), !h.startsWith(a)) return;
      }
      if (p.target.method.toUpperCase() !== "POST") throw new Error("Only POST forms are supported for Actions");
      const k = Aa.get(h);
      if (k) {
        p.preventDefault();
        const w = new FormData(p.target, p.submitter);
        k.call({ r, f: p.target }, p.target.enctype === "multipart/form-data" ? w : new URLSearchParams(w));
      }
    }
    delegateEvents(["click", "submit"]), document.addEventListener("click", u), t && (document.addEventListener("mousemove", v, { passive: true }), document.addEventListener("focusin", g, { passive: true }), document.addEventListener("touchstart", g, { passive: true })), document.addEventListener("submit", C), onCleanup(() => {
      document.removeEventListener("click", u), t && (document.removeEventListener("mousemove", v), document.removeEventListener("focusin", g), document.removeEventListener("touchstart", g)), document.removeEventListener("submit", C);
    });
  };
}
function wa(t) {
  if (isServer) return ba(t);
  const e = () => {
    const n = window.location.pathname.replace(/^\/+/, "/") + window.location.search, r = window.history.state && window.history.state._depth && Object.keys(window.history.state).length === 1 ? void 0 : window.history.state;
    return { value: n + window.location.hash, state: r };
  }, a = dt();
  return ha({ get: e, set({ value: n, replace: r, scroll: o, state: s }) {
    r ? window.history.replaceState(Wt(s), "", n) : window.history.pushState(s, "", n), ga(decodeURIComponent(window.location.hash.slice(1)), o), Se();
  }, init: (n) => ya(window, "popstate", Gt(n, (r) => {
    if (r) return !a.confirm(r);
    {
      const o = e();
      return !a.confirm(o.value, { state: o.state });
    }
  })), create: Sa(t.preload, t.explicitLinks, t.actionBase, t.transformUrl), utils: { go: (n) => window.history.go(n), beforeLeave: a } })(t);
}
function _e(t) {
  t = mergeProps$1({ inactiveClass: "inactive", activeClass: "active" }, t);
  const [, e] = splitProps(t, ["href", "state", "class", "activeClass", "inactiveClass", "end"]), a = aa(() => t.href), n = na(a), r = ke(), o = createMemo(() => {
    const s = a();
    if (s === void 0) return [false, false];
    const i = q(s.split(/[?#]/, 1)[0]).toLowerCase(), d = decodeURI(q(r.pathname).toLowerCase());
    return [t.end ? i === d : d.startsWith(i + "/") || d === i, i === d];
  });
  return ssrElement("a", mergeProps(e, { get href() {
    return n() || t.href;
  }, get state() {
    return JSON.stringify(t.state);
  }, get classList() {
    return { ...t.class && { [t.class]: true }, [t.inactiveClass]: !o()[0], [t.activeClass]: o()[0], ...e.classList };
  }, link: true, get "aria-current"() {
    return o()[1] ? "page" : void 0;
  } }), void 0, true);
}
/**
* @license lucide-solid v1.17.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var ka = { xmlns: "http://www.w3.org/2000/svg", width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, H = ka, Ca = createContext({ size: 24, color: "currentColor", strokeWidth: 2, absoluteStrokeWidth: false, class: "" }), Ea = (t) => {
  for (const e in t) if (e.startsWith("aria-") || e === "role" || e === "title") return true;
  return false;
}, Na = (...t) => t.filter((e, a, n) => !!e && e.trim() !== "" && n.indexOf(e) === a).join(" ").trim(), Pa = (t) => t.replace(/^([A-Z])|[\s-_]+(\w)/g, (e, a, n) => n ? n.toUpperCase() : a.toLowerCase()), $e = (t) => t.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), Ra = (t) => {
  const e = Pa(t);
  return e.charAt(0).toUpperCase() + e.slice(1);
}, Ta = (t) => {
  const [e, a] = splitProps(t, ["color", "size", "strokeWidth", "children", "class", "name", "iconNode", "absoluteStrokeWidth"]), n = useContext(Ca);
  return ssrElement("svg", mergeProps(H, { get width() {
    var _a2, _b;
    return (_b = (_a2 = e.size) != null ? _a2 : n.size) != null ? _b : H.width;
  }, get height() {
    var _a2, _b;
    return (_b = (_a2 = e.size) != null ? _a2 : n.size) != null ? _b : H.height;
  }, get stroke() {
    var _a2, _b;
    return (_b = (_a2 = e.color) != null ? _a2 : n.color) != null ? _b : H.stroke;
  }, get "stroke-width"() {
    var _a2, _b, _c, _d, _e2, _f;
    return ((_a2 = e.absoluteStrokeWidth) != null ? _a2 : n.absoluteStrokeWidth) === true ? Number((_c = (_b = e.strokeWidth) != null ? _b : n.strokeWidth) != null ? _c : H["stroke-width"]) * 24 / Number((_d = e.size) != null ? _d : n.size) : Number((_f = (_e2 = e.strokeWidth) != null ? _e2 : n.strokeWidth) != null ? _f : H["stroke-width"]);
  }, get class() {
    return Na("lucide", "lucide-icon", n.class, ...e.name != null ? [`lucide-${$e(Ra(e.name))}`, `lucide-${$e(e.name)}`] : [], e.class);
  }, get "aria-hidden"() {
    return !e.children && !Ea(a) ? "true" : void 0;
  } }, a), () => escape(createComponent(For, { get each() {
    return e.iconNode;
  }, children: ([r, o]) => createComponent(Dynamic, mergeProps({ component: r }, o)) })), true);
}, R = Ta, Ia = [["path", { d: "M12 7v14", key: "1akyts" }], ["path", { d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z", key: "ruj8y" }]], xa = (t) => createComponent(R, mergeProps(t, { iconNode: Ia, name: "book-open" })), Da = xa, La = [["path", { d: "M10 18v-7", key: "wt116b" }], ["path", { d: "M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z", key: "yxxwt6" }], ["path", { d: "M14 18v-7", key: "vav6t3" }], ["path", { d: "M18 18v-7", key: "aexdmj" }], ["path", { d: "M3 22h18", key: "8prr45" }], ["path", { d: "M6 18v-7", key: "1ivflk" }]], Ma = (t) => createComponent(R, mergeProps(t, { iconNode: La, name: "landmark" })), Ba = Ma, Oa = [["rect", { width: "7", height: "9", x: "3", y: "3", rx: "1", key: "10lvy0" }], ["rect", { width: "7", height: "5", x: "14", y: "3", rx: "1", key: "16une8" }], ["rect", { width: "7", height: "9", x: "14", y: "12", rx: "1", key: "1hutg5" }], ["rect", { width: "7", height: "5", x: "3", y: "16", rx: "1", key: "ldoo1y" }]], ja = (t) => createComponent(R, mergeProps(t, { iconNode: Oa, name: "layout-dashboard" })), qa = ja, _a = [["path", { d: "M4 5h16", key: "1tepv9" }], ["path", { d: "M4 12h16", key: "1lakjw" }], ["path", { d: "M4 19h16", key: "1djgab" }]], $a = (t) => createComponent(R, mergeProps(t, { iconNode: _a, name: "menu" })), Ua = $a, Fa = [["path", { d: "M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4", key: "re6nr2" }], ["path", { d: "M2 6h4", key: "aawbzj" }], ["path", { d: "M2 10h4", key: "l0bgd4" }], ["path", { d: "M2 14h4", key: "1gsvsf" }], ["path", { d: "M2 18h4", key: "1bu2t1" }], ["path", { d: "M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z", key: "pqwjuv" }]], za = (t) => createComponent(R, mergeProps(t, { iconNode: Fa, name: "notebook-pen" })), Ha = za, Va = [["path", { d: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z", key: "1a0edw" }], ["path", { d: "M12 22V12", key: "d0xqtd" }], ["polyline", { points: "3.29 7 12 12 20.71 7", key: "ousv84" }], ["path", { d: "m7.5 4.27 9 5.15", key: "1c824w" }]], Wa = (t) => createComponent(R, mergeProps(t, { iconNode: Va, name: "package" })), Ga = Wa, Ya = [["path", { d: "M12 3v18", key: "108xh3" }], ["path", { d: "m19 8 3 8a5 5 0 0 1-6 0zV7", key: "zcdpyk" }], ["path", { d: "M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1", key: "1yorad" }], ["path", { d: "m5 8 3 8a5 5 0 0 1-6 0zV7", key: "eua70x" }], ["path", { d: "M7 21h10", key: "1b0cd5" }]], Qa = (t) => createComponent(R, mergeProps(t, { iconNode: Ya, name: "scale" })), Ja = Qa, Ka = [["circle", { cx: "8", cy: "21", r: "1", key: "jimo8o" }], ["circle", { cx: "19", cy: "21", r: "1", key: "13723u" }], ["path", { d: "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12", key: "9zh506" }]], Za = (t) => createComponent(R, mergeProps(t, { iconNode: Ka, name: "shopping-cart" })), Xa = Za, en = [["path", { d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z", key: "1s2grr" }], ["path", { d: "M20 2v4", key: "1rf3ol" }], ["path", { d: "M22 4h-4", key: "gwowj6" }], ["circle", { cx: "4", cy: "20", r: "2", key: "6kqj1y" }]], tn = (t) => createComponent(R, mergeProps(t, { iconNode: en, name: "sparkles" })), an = tn, nn = [["circle", { cx: "12", cy: "8", r: "5", key: "1hypcn" }], ["path", { d: "M20 21a8 8 0 0 0-16 0", key: "rfgkzh" }]], rn = (t) => createComponent(R, mergeProps(t, { iconNode: nn, name: "user-round" })), on = rn, sn = [["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }], ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744", key: "16gr8j" }], ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }], ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]], cn = (t) => createComponent(R, mergeProps(t, { iconNode: sn, name: "users" })), ln = cn, dn = [["path", { d: "M18 6 6 18", key: "1bl5f8" }], ["path", { d: "m6 6 12 12", key: "d8bk6v" }]], un = (t) => createComponent(R, mergeProps(t, { iconNode: dn, name: "x" })), mn = un;
const pn = { VITE_APP_ID: "hrm", VITE_AUTH_BASE: "https://ssgloghr.com", VITE_IDSVC_URL: "https://ssgloghr.com/idsvc", VITE_SSO_CLIENT_ID: "subpay" }, ne = pn || {};
let he = { authBase: ne.VITE_AUTH_BASE || "", idsvcUrl: ne.VITE_IDSVC_URL || "", appId: ne.VITE_APP_ID || "", clientId: ne.VITE_SSO_CLIENT_ID || "", perms: {}, callbackPath: "/callback" };
function fn(t) {
  he = { ...he, ...t };
}
function K() {
  return he;
}
const hn = () => K().idsvcUrl, Ce = () => K().appId, Ee = () => `idsvc_refresh_${Ce()}`;
let Y = null;
const Ne = () => localStorage.getItem(Ee()), yn = (t) => {
  Y = t.access, localStorage.setItem(Ee(), t.refresh);
}, bt = () => {
  Y = null, localStorage.removeItem(Ee());
}, gn = () => !!Ne();
async function At(t, e) {
  const a = await fetch(`${hn()}${t}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(e) }), n = await a.json().catch(() => ({}));
  if (!a.ok) throw Object.assign(new Error(n.error || `HTTP ${a.status}`), { status: a.status });
  return n && typeof n == "object" && n.data !== void 0 ? n.data : n;
}
async function vn() {
  const t = Ne();
  bt(), t && await At("/auth/logout", { refresh: t }).catch(() => {
  });
}
let X = null;
async function bn() {
  return X || (X = (async () => {
    const t = Ne();
    if (!t) return false;
    try {
      const e = await At("/auth/refresh", { refresh: t, app: Ce() });
      return yn(e), true;
    } catch (e) {
      return ((e == null ? void 0 : e.status) === 401 || (e == null ? void 0 : e.status) === 400) && bt(), false;
    } finally {
      X = null;
    }
  })(), X);
}
function Pe() {
  if (!Y) return null;
  try {
    return JSON.parse(atob(Y.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}
function An() {
  var _a2, _b;
  const t = Pe();
  return t ? t.superadmin ? ["superadmin"] : ((_b = (_a2 = t.apps) == null ? void 0 : _a2[Ce()]) == null ? void 0 : _b.roles) || [] : [];
}
function Sn() {
  const t = Pe();
  return !t || t.exp * 1e3 - Date.now() < 6e4;
}
async function St() {
  return (!Y || Sn()) && await bn(), Y;
}
function se(t) {
  if (typeof t == "boolean") return t;
  if (typeof t == "number") return t === 1;
  if (typeof t == "string") {
    const e = t.trim().toLowerCase();
    return e === "true" || e === "1" || e === "yes";
  }
  return false;
}
function wn(t, e) {
  var _a2;
  if (t.some((n) => n === "admin" || n === "superadmin")) return /* @__PURE__ */ new Set(["*"]);
  const a = /* @__PURE__ */ new Set();
  for (const n of t) for (const r of (_a2 = e[n]) != null ? _a2 : []) a.add(r);
  return a;
}
const de = "ops_user", ye = /* @__PURE__ */ new Set();
function Re() {
  for (const t of ye) t();
}
function kn(t) {
  return ye.add(t), () => ye.delete(t);
}
const Cn = () => {
  try {
    return JSON.parse(localStorage.getItem(de) || "null");
  } catch {
    return null;
  }
};
let _ = Cn(), En = false, wt = null;
const Nn = () => _, kt = () => ({ user: _, loading: En, error: wt });
function Pn(t) {
  t && localStorage.setItem(de, JSON.stringify(t)), _ = t, Re();
}
function Rn() {
  var _a2;
  const t = Pe();
  if (!t) return false;
  const e = K().appId, n = (((_a2 = t.apps) == null ? void 0 : _a2[e]) || Object.values(t.apps || {})[0] || {}).scope || {}, r = n.flags || {}, o = { id: t.sub, uid: t.uid, originalUserId: t.sub, googleUid: t.sub, name: t.name || "", email: t.email || (_ == null ? void 0 : _.email) || "", businessId: n.businessId || "", permissions: { ...r, isAdmin: !!t.superadmin || se(r.isAdmin) }, superadmin: !!t.superadmin, apps: t.apps };
  return Pn(o), true;
}
async function Tn() {
  return gn() ? navigator.onLine ? await St() ? (Rn(), true) : (localStorage.removeItem(de), _ = null, Re(), false) : !!_ : false;
}
async function In() {
  var _a2, _b;
  localStorage.removeItem(de), _ = null, wt = null, vn().catch(() => {
  }), Re();
  try {
    await ((_b = (_a2 = K()).onLogout) == null ? void 0 : _b.call(_a2));
  } catch {
  }
}
function xn(t) {
  var _a2, _b, _c;
  if (!t) {
    const n = An();
    if (n.length) return n;
  }
  const e = t != null ? t : Nn();
  if (!e) return [];
  if (se(e.superadmin) || se((_a2 = e.permissions) == null ? void 0 : _a2.isAdmin) || se(e.isAdmin)) return ["admin"];
  const a = (_c = (_b = e.apps) == null ? void 0 : _b[K().appId]) == null ? void 0 : _c.roles;
  return Array.isArray(a) ? a : [];
}
function Dn(t) {
  return wn(xn(t), K().perms);
}
const Ln = (t) => Dn(t).has("*"), Te = kt(), [L, Mn] = createSignal(Te.user), [Co, Bn] = createSignal(Te.loading), [Eo, On] = createSignal(Te.error);
kn(() => {
  const t = kt();
  Mn(t.user), Bn(t.loading), On(t.error);
});
fn({ authBase: "https://ssgloghr.com", idsvcUrl: "https://ssgloghr.com/idsvc", appId: "hrm", clientId: "subpay", perms: { admin: ["*"], accountant: ["journal.post", "journal.void", "payments.record", "payroll.approve", "payroll.post", "accounts.delete", "providers.delete", "inventory.edit", "inventory.delete", "transactions.edit", "transactions.delete"], operator: ["inventory.edit", "payments.record"], viewer: [] } });
const [Ue, jn] = createSignal(true), Fe = () => !!L(), qn = () => St(), _n = () => Ln(L());
function Q() {
  var _a2;
  return ((_a2 = L()) == null ? void 0 : _a2.businessId) || "";
}
function $n() {
  In();
}
async function Un() {
  try {
    await Tn();
  } finally {
    jn(false);
  }
}
const Fn = "https://ssgloghr.com/api/query";
class pe extends Error {
  constructor(e, a, n) {
    super(a), this.status = e, this.code = n, this.name = "ApiError";
  }
}
async function zn(t) {
  var _a2, _b, _c, _d;
  const e = await qn(), a = await fetch(Fn, { method: "POST", headers: { "Content-Type": "application/json", ...e ? { Authorization: e } : {} }, body: JSON.stringify(t) });
  if (a.status === 401) throw $n(), new pe(401, "Unauthorized");
  if (!a.ok) {
    const o = await a.json().catch(() => null);
    throw new pe(a.status, ((_b = (_a2 = o == null ? void 0 : o.errors) == null ? void 0 : _a2[0]) == null ? void 0 : _b.message) || (o == null ? void 0 : o.message) || `Request failed (${a.status})`);
  }
  const n = await a.json().catch(() => ({}));
  if ((_c = n == null ? void 0 : n.errors) == null ? void 0 : _c.length) throw new pe(400, ((_d = n.errors[0]) == null ? void 0 : _d.message) || "Request failed");
  let r = n;
  for (let o = 0; o < 4 && Vn(r); o++) {
    const s = r;
    if ("success" in s) {
      if ("data" in s) {
        r = s.data;
        continue;
      }
      break;
    }
    if ("data" in s && Object.keys(s).every((c) => Hn.has(c))) {
      r = s.data;
      continue;
    }
    break;
  }
  return r;
}
const Hn = /* @__PURE__ */ new Set(["data", "duration", "meta", "ms", "took"]);
function Vn(t) {
  return t !== null && typeof t == "object" && !Array.isArray(t);
}
function S(t, e = {}) {
  var _a2;
  return zn({ query: t, ...e.queryString ? { queryString: e.queryString } : {}, params: { businessId: Q(), ...(_a2 = e.params) != null ? _a2 : {} }, ...e.form ? { form: e.form } : {}, ...e.data2update ? { data2update: e.data2update } : {}, ...e.limit ? { limit: e.limit } : {} });
}
async function Wn(t) {
  const e = await t;
  return Array.isArray(e) ? e : [];
}
function Ct(t) {
  const e = {};
  return t.trim().split(/\s+/).slice(0, 5).forEach((a, n) => {
    a && (e[`:search${n}`] = a);
  }), e;
}
function Gn(t) {
  if (t == null || t === "") return "";
  const e = Number(t);
  return Number.isFinite(e) && e > 1e9 ? new Date(e > 1e12 ? e : e * 1e3).toISOString().slice(0, 10) : String(t).slice(0, 10);
}
const Yn = ["Asset", "Liability", "Equity", "Revenue", "Expense"], Qn = "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND guia = guia";
function ze(t) {
  var _a2, _b, _c, _d, _e2, _f, _g, _h, _i, _j, _k, _l, _m, _n2, _o2, _p, _q, _r2, _s, _t2, _u;
  const e = t;
  return { id: String((_b = (_a2 = e.id) != null ? _a2 : e.accountId) != null ? _b : ""), accountNumber: String((_d = (_c = e.accountNumber) != null ? _c : e.code) != null ? _d : ""), name: String((_e2 = e.name) != null ? _e2 : ""), type: (_h = (_g = (_f = e.accountType) != null ? _f : e.classification) != null ? _g : e.type) != null ? _h : "Asset", category: (_i = e.category) != null ? _i : void 0, description: (_j = e.description) != null ? _j : void 0, parentAccountId: e.parentAccountId || void 0, isActive: e.isActive !== false, isBankAccount: (_k = e.isBankAccount) != null ? _k : void 0, bankName: (_l = e.bankName) != null ? _l : void 0, bankAccountNumber: (_m = e.bankAccountNumber) != null ? _m : void 0, bankAccountType: (_n2 = e.bankAccountType) != null ? _n2 : void 0, currency: (_o2 = e.currency) != null ? _o2 : void 0, isPiggybank: (_p = e.isPiggybank) != null ? _p : void 0, piggybankLabel: (_q = e.piggybankLabel) != null ? _q : void 0, isChequesEnTransito: (_r2 = e.isChequesEnTransito) != null ? _r2 : void 0, salesDefault: (_s = e.salesDefault) != null ? _s : void 0, createdDate: (_t2 = e.createdDate) != null ? _t2 : void 0, lastModified: (_u = e.lastModified) != null ? _u : void 0 };
}
function Jn(t) {
  var _a2, _b, _c, _d;
  const e = {}, a = t, n = (_b = (_a2 = a == null ? void 0 : a.flatList) != null ? _a2 : a == null ? void 0 : a.hierarchyMap) != null ? _b : t, r = (o, s) => {
    var _a3, _b2;
    o && (e[o] = { balance: Number((_b2 = (_a3 = s == null ? void 0 : s.ownBalance) != null ? _a3 : s == null ? void 0 : s.balance) != null ? _b2 : s) || 0, transactionCount: (s == null ? void 0 : s.transactionCount) != null ? Number(s.transactionCount) : void 0 });
  };
  if (Array.isArray(n)) for (const o of n) r(String((_d = (_c = o.accountId) != null ? _c : o.id) != null ? _d : ""), o);
  else if (n && typeof n == "object") for (const [o, s] of Object.entries(n)) r(o, s);
  return e;
}
const ge = { async list(t = "") {
  const a = (await Wn(S("getAccounts", { queryString: Qn, params: Ct(t), limit: 2e3 }))).map(ze).filter((s) => s.id), n = new Set(Yn), r = new Map(a.map((s) => [s.id, s])), o = (s, i) => {
    if (n.has(s.type)) return s.type;
    const d = s.parentAccountId ? r.get(s.parentAccountId) : void 0;
    return d && !i.has(d.id) ? (i.add(s.id), o(d, i)) : s.type === "credit" ? "Liability" : "Asset";
  };
  for (const s of a) s.type = o(s, /* @__PURE__ */ new Set([s.id]));
  return a;
}, async balances(t) {
  const e = await S("getBalancesByAccounts", { params: { year: t }, limit: 25e3 });
  return Jn(e);
}, async balancesByProviders(t) {
  var _a2, _b, _c, _d;
  const e = await S("getBalancesByProviders", { params: { year: t }, limit: 2e3 }), a = {}, n = (s) => !s || typeof s != "object" ? [] : Object.entries(s).map(([i, d]) => {
    const c = Number(d == null ? void 0 : d.debitTotal) || 0, l = Number(d == null ? void 0 : d.creditTotal) || 0;
    return { document: i, debitTotal: c, creditTotal: l, balance: c - l, transactions: (Array.isArray(d == null ? void 0 : d.transactions) ? d.transactions : []).map((u) => ({ ...u, debitAmount: Number(u == null ? void 0 : u.debitAmount) || 0, creditAmount: Number(u == null ? void 0 : u.creditAmount) || 0 })) };
  }), r = (s, i) => {
    if (!s) return;
    const d = Number(i == null ? void 0 : i.debitTotal) || 0, c = Number(i == null ? void 0 : i.creditTotal) || 0, l = n(i == null ? void 0 : i.documents);
    a[s] = { debitTotal: d, creditTotal: c, balance: (i == null ? void 0 : i.balance) != null ? Number(i.balance) || 0 : d - c, documents: l };
  }, o = (_a2 = e == null ? void 0 : e.refMap) != null ? _a2 : e;
  if (Array.isArray(o)) for (const s of o) r(String((_d = (_c = (_b = s.providerId) != null ? _b : s.id) != null ? _c : s.entityId) != null ? _d : ""), s);
  else if (o && typeof o == "object") for (const [s, i] of Object.entries(o)) r(s, i);
  return a;
}, async ledger(t, e) {
  const a = await S("getSubmayor", { params: { accountId: t, year: e }, limit: 2e3 });
  return (Array.isArray(a == null ? void 0 : a.transactions) ? a.transactions : Array.isArray(a) ? a : []).map((r) => {
    var _a2, _b, _c, _d, _e2, _f, _g, _h, _i, _j, _k;
    return { entryId: String((_b = (_a2 = r.entryId) != null ? _a2 : r.id) != null ? _b : ""), entryNumber: String((_c = r.entryNumber) != null ? _c : ""), date: Gn(r.date), description: String((_d = r.description) != null ? _d : ""), reference: String((_e2 = r.reference) != null ? _e2 : ""), document: String((_f = r.document) != null ? _f : ""), accountId: String((_g = r.accountId) != null ? _g : ""), accountNumber: String((_h = r.accountNumber) != null ? _h : ""), accountName: String((_i = r.accountName) != null ? _i : ""), isSubaccount: r.isSubaccount === true, debit: Number((_j = r.debit) != null ? _j : r.debitAmount) || 0, credit: Number((_k = r.credit) != null ? _k : r.creditAmount) || 0, balance: Number(r.balance) || 0 };
  });
}, async create(t) {
  const e = await S("addAccount", { form: t });
  return ze(e != null ? e : t);
}, async update(t, e) {
  await S("updateAccount", { params: { id: t }, data2update: e });
}, async remove(t) {
  await S("deleteAccount", { params: { id: t } });
} }, [Et, Kn] = createSignal([]), [No, Zn] = createSignal({}), [Xn, He] = createSignal(false), [Po, Ve] = createSignal(null), [er, tr] = createSignal(null);
async function ar(t, e = {}) {
  if (!untrack(() => Xn() || !e.force && er() === t)) {
    He(true), Ve(null);
    try {
      const [n, r] = await Promise.all([ge.list(Q()), ge.balances(t)]);
      Kn([...n].sort((o, s) => o.accountNumber.localeCompare(s.accountNumber, void 0, { numeric: true }))), Zn(r), tr(t);
    } catch (n) {
      Ve(n instanceof Error ? n.message : "Failed to load accounts");
    } finally {
      He(false);
    }
  }
}
createMemo(() => Et().filter((t) => !t.parentAccountId));
function nr(t) {
  return Et().find((e) => e.id === t);
}
const rr = "hrmfinance-year";
function or() {
  if (typeof localStorage < "u") {
    const t = Number(localStorage.getItem(rr));
    if (t >= 2e3 && t <= 2100) return t;
  }
  return (/* @__PURE__ */ new Date()).getFullYear();
}
const [ve, Ro] = createSignal(or());
function sr(t = 6) {
  const e = (/* @__PURE__ */ new Date()).getFullYear();
  return Array.from({ length: t }, (a, n) => e - n);
}
const ir = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", cr = "0123456789BCDFGKSY";
function Nt(t, e) {
  let a = "";
  for (let n = 0; n < e; n++) a += t.charAt(Math.floor(Math.random() * t.length));
  return a;
}
function Pt(t = 16) {
  return Nt(ir, t);
}
function lr(t = 4) {
  return Nt(cr, t);
}
const dr = "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND createdTimeStamp > :date1 AND createdTimeStamp < :date2 AND account contain :account AND subAccount contain :subAccount AND status = :status";
function ur(t) {
  var _a2, _b, _c, _d, _e2, _f, _g, _h, _i, _j, _k;
  const e = t, a = Array.isArray(e.lines) ? e.lines : [];
  return { id: String((_a2 = e.id) != null ? _a2 : ""), entryNumber: String((_b = e.entryNumber) != null ? _b : ""), date: String((_c = e.date) != null ? _c : ""), description: String((_d = e.description) != null ? _d : ""), reference: (_e2 = e.reference) != null ? _e2 : void 0, status: (_f = e.status) != null ? _f : "draft", createdBy: (_g = e.createdBy) != null ? _g : void 0, createdAt: String((_h = e.createdAt) != null ? _h : ""), createdTimeStamp: e.createdTimeStamp != null ? Number(e.createdTimeStamp) : void 0, postedAt: (_i = e.postedAt) != null ? _i : void 0, comprobanteId: (_j = e.comprobanteId) != null ? _j : void 0, document: (_k = e.document) != null ? _k : void 0, totalDebits: Number(e.totalDebits) || 0, totalCredits: Number(e.totalCredits) || 0, lines: a.map((n) => {
    var _a3;
    return { ...n, accountId: String((_a3 = n.accountId) != null ? _a3 : ""), debitAmount: Number(n.debitAmount) || 0, creditAmount: Number(n.creditAmount) || 0 };
  }) };
}
const mr = { async list(t, e = {}) {
  var _a2;
  const a = { year: t }, n = ((_a2 = e.search) != null ? _a2 : "").trim().split(/\s+/).filter(Boolean);
  n.length === 0 && n.push(Q()), n.slice(0, 5).forEach((s, i) => {
    a[`:search${i}`] = s;
  }), e.status && (a[":status"] = e.status), e.dateFrom != null && (a[":date1"] = e.dateFrom), e.dateTo != null && (a[":date2"] = e.dateTo);
  const r = await S("getEntryBooks", { queryString: dr, params: a, limit: 1e4 });
  return (Array.isArray(r) ? r : []).map(ur).filter((s) => s.id);
}, async create(t) {
  const e = { ...t, businessId: Q(), id: Pt(), createdTimeStamp: new Date(t.createdAt).getTime() };
  return await S("addEntryBook", { form: e }), e;
}, async update(t, e) {
  await S("updateEntryBook", { params: { id: t }, form: e });
}, async remove(t) {
  await S("deleteEntryBook", { params: { id: t } });
} };
function pr(t) {
  return t.reduce((e, a) => e + (Number(a.debitAmount) || 0), 0);
}
function fr(t) {
  return t.reduce((e, a) => e + (Number(a.creditAmount) || 0), 0);
}
const [hr, yr] = createSignal([]), [To, Io] = createSignal(false), [xo, Do] = createSignal(null), [Lo, Mo] = createSignal(null), [Bo, Oo] = createSignal("");
function gr() {
  const t = /* @__PURE__ */ new Date(), e = t.getMonth();
  return `${t.getFullYear()}${e}-${"ABCDEFGHIJKLMN"[e]}${lr(5)}`;
}
async function vr(t) {
  var _a2, _b, _c, _d, _e2;
  const e = { ...t, status: (_a2 = t.status) != null ? _a2 : "draft", entryNumber: gr(), createdAt: (/* @__PURE__ */ new Date()).toISOString(), createdBy: (_e2 = (_d = (_b = L()) == null ? void 0 : _b.email) != null ? _d : (_c = L()) == null ? void 0 : _c.name) != null ? _e2 : "", totalDebits: pr(t.lines), totalCredits: fr(t.lines) }, a = await mr.create(e);
  return yr([a, ...hr()]), a;
}
const br = "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4";
function We(t) {
  var _a2, _b, _c, _d, _e2, _f, _g, _h, _i, _j, _k, _l, _m, _n2, _o2, _p, _q, _r2, _s, _t2, _u;
  const e = t;
  return { id: String((_a2 = e.id) != null ? _a2 : ""), name: String((_b = e.name) != null ? _b : ""), position: String((_c = e.position) != null ? _c : ""), salary: Number(e.salary) || 0, email: String((_d = e.email) != null ? _d : ""), phone: String((_e2 = e.phone) != null ? _e2 : ""), department: String((_f = e.department) != null ? _f : ""), startDate: String((_g = e.startDate) != null ? _g : ""), status: (_h = e.status) != null ? _h : "active", employeeNumber: (_i = e.employeeNumber) != null ? _i : void 0, clockingEmployeeNumber: (_j = e.clockingEmployeeNumber) != null ? _j : void 0, employmentType: (_k = e.employmentType) != null ? _k : void 0, ssn: (_l = e.ssn) != null ? _l : void 0, address: (_m = e.address) != null ? _m : void 0, city: (_n2 = e.city) != null ? _n2 : void 0, state: (_o2 = e.state) != null ? _o2 : void 0, zipCode: (_p = e.zipCode) != null ? _p : void 0, dateOfBirth: (_q = e.dateOfBirth) != null ? _q : void 0, payType: (_r2 = e.payType) != null ? _r2 : void 0, hourlyRate: e.hourlyRate != null ? Number(e.hourlyRate) : void 0, annualSalary: e.annualSalary != null ? Number(e.annualSalary) : void 0, overtimeRate: e.overtimeRate != null ? Number(e.overtimeRate) : void 0, standardHoursPerWeek: e.standardHoursPerWeek != null ? Number(e.standardHoursPerWeek) : void 0, lunchMinutes: e.lunchMinutes != null ? Number(e.lunchMinutes) : void 0, taxRate: e.taxRate != null ? Number(e.taxRate) : void 0, insuranceDeduction: e.insuranceDeduction != null ? Number(e.insuranceDeduction) : void 0, userUid: (_s = e.userUid) != null ? _s : void 0, userEmail: (_t2 = e.userEmail) != null ? _t2 : void 0, userDisplayName: (_u = e.userDisplayName) != null ? _u : void 0, businessId: e.businessId != null ? String(e.businessId) : void 0 };
}
const Ar = { async list(t = "") {
  const e = await S("getEmployees", { queryString: br, params: Ct(t) });
  return (Array.isArray(e) ? e : []).map(We).filter((n) => n.id);
}, async create(t) {
  const e = await S("addEmployee", { form: t });
  return We(e != null ? e : t);
}, async update(t, e) {
  await S("updateEmployee", { params: { id: t }, form: e });
}, async remove(t) {
  await S("deleteEmployee", { params: { id: t } });
} }, [jo, Sr] = createSignal([]), [wr, Ge] = createSignal(false), [qo, Ye] = createSignal(null), [kr, Cr] = createSignal(false);
async function Er(t = {}) {
  if (!untrack(() => wr() || !t.force && kr())) {
    Ge(true), Ye(null);
    try {
      Sr(await Ar.list()), Cr(true);
    } catch (a) {
      Ye(a instanceof Error ? a.message : "Failed to load employees");
    } finally {
      Ge(false);
    }
  }
}
const Nr = "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4";
function Qe(t) {
  var _a2, _b, _c, _d, _e2, _f, _g, _h, _i, _j, _k, _l, _m, _n2;
  const e = t;
  return { id: String((_a2 = e.id) != null ? _a2 : ""), name: String((_b = e.name) != null ? _b : ""), type: (_c = e.type) != null ? _c : "both", email: (_d = e.email) != null ? _d : void 0, phone: (_e2 = e.phone) != null ? _e2 : void 0, address: (_f = e.address) != null ? _f : void 0, taxId: (_g = e.taxId) != null ? _g : void 0, contactPerson: (_h = e.contactPerson) != null ? _h : void 0, notes: (_i = e.notes) != null ? _i : void 0, isActive: e.isActive !== false, balance: Number(e.balance) || 0, relatedAccountId: (_j = e.relatedAccountId) != null ? _j : void 0, advanceAccountId: (_k = e.advanceAccountId) != null ? _k : void 0, isChequesEnTransito: (_l = e.isChequesEnTransito) != null ? _l : void 0, createdAt: (_m = e.createdAt) != null ? _m : void 0, updatedAt: (_n2 = e.updatedAt) != null ? _n2 : void 0 };
}
const Pr = { async list(t = "") {
  const e = await S("getCustomerProviders", { queryString: Nr, params: { ":search0": t, ":search1": Q() } });
  return (Array.isArray(e) ? e : []).map(Qe).filter((n) => n.id);
}, async create(t) {
  const e = await S("addCustomerProvider", { form: t });
  return Qe(e != null ? e : t);
}, async update(t, e) {
  await S("updateCustomerProvider", { params: { id: t }, form: e });
}, async remove(t) {
  await S("deleteCustomerProvider", { params: { id: t } });
} }, [Rr, Tr] = createSignal([]), [_o, Ir] = createSignal({}), [xr, Je] = createSignal(false), [$o, Ke] = createSignal(null), [Dr, Lr] = createSignal(null);
async function Mr(t, e = {}) {
  if (!untrack(() => xr() || !e.force && Dr() === t)) {
    Je(true), Ke(null);
    try {
      const [n, r] = await Promise.all([Pr.list(), ge.balancesByProviders(t)]);
      Tr(n), Ir(r), Lr(t);
    } catch (n) {
      Ke(n instanceof Error ? n.message : "Failed to load providers/customers");
    } finally {
      Je(false);
    }
  }
}
function Br(t) {
  return Rr().find((e) => e.id === t);
}
const Ze = { provider: "provider", customer: "customer" };
function Or(t) {
  Mr(t), Er();
}
function jr(t, e) {
  var _a2, _b, _c;
  const a = {}, n = (r) => {
    const o = Br(r);
    o && (o.relatedAccountId && (a[o.relatedAccountId] = o.id), o.advanceAccountId && (a[o.advanceAccountId] = o.id));
  };
  for (const r of t) (r.type === "provider" || r.type === "customer") && n(String((_a2 = e[`${r.name}.id`]) != null ? _a2 : ""));
  return n(String((_b = e[`${Ze.provider}.id`]) != null ? _b : "")), n(String((_c = e[`${Ze.customer}.id`]) != null ? _c : "")), a;
}
function qr(t) {
  const e = t;
  let a = 0;
  const n = () => {
    for (; a < e.length && /\s/.test(e[a]); ) a++;
  };
  function r() {
    let i = o();
    for (n(); a < e.length && (e[a] === "+" || e[a] === "-"); ) {
      const d = e[a++], c = o();
      i = d === "+" ? i + c : i - c, n();
    }
    return i;
  }
  function o() {
    let i = s();
    for (n(); a < e.length && (e[a] === "*" || e[a] === "/"); ) {
      const d = e[a++], c = s();
      i = d === "*" ? i * c : i / c, n();
    }
    return i;
  }
  function s() {
    if (n(), a >= e.length) return NaN;
    if (e[a] === "+") return a++, s();
    if (e[a] === "-") return a++, -s();
    if (e[a] === "(") {
      a++;
      const c = r();
      return n(), e[a] !== ")" ? NaN : (a++, c);
    }
    const i = a;
    for (; a < e.length && /[0-9.]/.test(e[a]); ) a++;
    if (a === i) return NaN;
    const d = Number(e.slice(i, a));
    return Number.isFinite(d) ? d : NaN;
  }
  try {
    const i = r();
    return n(), a !== e.length ? NaN : i;
  } catch {
    return NaN;
  }
}
function I(t, e) {
  return t.replace(/\{([^}]+)\}/g, (a, n) => {
    const r = e[n.trim()];
    return r == null ? "" : String(r);
  });
}
function _r(t, e) {
  let a = I(t, e);
  return a = a.replace(/sum\(([^)]*)\)/g, (n, r) => {
    const o = r.split(",").map((s) => Number(s.trim())).filter((s) => Number.isFinite(s)).reduce((s, i) => s + i, 0);
    return String(o);
  }), a = a.replace(/percentage\(([^,]+),([^)]+)\)/g, (n, r, o) => {
    const s = Number(r.trim()), i = Number(o.trim());
    return String(s * i / 100);
  }), qr(a);
}
function $r(t, e) {
  const a = e[t.field];
  switch (t.operator) {
    case "=":
      return a == t.value;
    case "!=":
      return a != t.value;
    case ">":
      return Number(a) > Number(t.value);
    case "<":
      return Number(a) < Number(t.value);
    case ">=":
      return Number(a) >= Number(t.value);
    case "<=":
      return Number(a) <= Number(t.value);
    case "contains":
      return String(a).toLowerCase().includes(String(t.value).toLowerCase());
    case "not_empty":
      return a != null && a !== "";
    default:
      return false;
  }
}
function Ur(t, e) {
  return !t.conditions || t.conditions.length === 0 ? true : t.conditions.every((a) => $r(a, e));
}
function Fr(t, e, a) {
  const n = [], r = [];
  for (const l of t.fields) if (l.required) {
    const u = e[l.name];
    (u == null || u === "") && n.push(`template.errors.fieldRequired|${l.label}`);
  }
  const o = I(t.settings.defaultDescription || t.name, e), s = I(t.settings.referenceFormat || "", e), i = [];
  for (const l of t.lineRules) {
    if (!Ur(l, e)) continue;
    const u = l.accountExpression ? I(l.accountExpression, e) : l.accountId, g = a(u);
    if (!g) {
      n.push(`template.errors.accountNotFound|${u}`);
      continue;
    }
    const v = _r(l.amountExpression, e);
    if (!Number.isFinite(v) || v < 0) {
      n.push(`template.errors.badAmount|${l.description}`);
      continue;
    }
    i.push({ accountId: u, accountName: g.name, accountNumber: g.accountNumber, description: I(l.descriptionExpression || l.description, e), document: I(l.documentExpression || l.document || "{document}", e) || void 0, reference: l.referenceExpression || l.reference ? I(l.referenceExpression || l.reference || "", e) : void 0, referenceId: l.referenceIdExpression && I(l.referenceIdExpression, e) || void 0, debitAmount: l.type === "debit" ? v : 0, creditAmount: l.type === "credit" ? v : 0 });
  }
  const d = i.reduce((l, u) => l + u.debitAmount, 0), c = i.reduce((l, u) => l + u.creditAmount, 0);
  return i.length < 2 && n.push("template.errors.minLines"), i.length > 0 && Math.abs(d - c) > 0.01 && n.push("template.errors.notBalanced"), { description: o, reference: s, lines: i, validation: { isValid: n.length === 0, errors: n, warnings: r } };
}
const zr = "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND category = category AND isActive = isActive";
function Hr(t) {
  var _a2, _b, _c, _d, _e2, _f, _g, _h, _i;
  const e = t;
  return { id: String((_a2 = e.id) != null ? _a2 : ""), name: String((_b = e.name) != null ? _b : ""), description: String((_c = e.description) != null ? _c : ""), category: String((_d = e.category) != null ? _d : ""), isActive: e.isActive !== false, fields: Array.isArray(e.fields) ? e.fields : [], lineRules: Array.isArray(e.lineRules) ? e.lineRules : [], settings: (_e2 = e.settings) != null ? _e2 : {}, createdBy: (_f = e.createdBy) != null ? _f : "", createdAt: (_g = e.createdAt) != null ? _g : "", updatedAt: (_h = e.updatedAt) != null ? _h : "", lastUsed: (_i = e.lastUsed) != null ? _i : void 0, usageCount: Number(e.usageCount) || 0 };
}
const Ie = { async list(t = "") {
  const e = {};
  t.trim().split(/\s+/).filter(Boolean).slice(0, 3).forEach((r, o) => {
    e[`:search${o}`] = r;
  });
  const a = await S("getDynamicTemplates", { queryString: zr, params: e });
  return (Array.isArray(a) ? a : []).map(Hr).filter((r) => r.id);
}, async create(t) {
  var _a2, _b, _c, _d;
  const e = (/* @__PURE__ */ new Date()).toISOString(), a = { ...t, id: Pt(), createdBy: (_d = (_c = (_a2 = L()) == null ? void 0 : _a2.uid) != null ? _c : (_b = L()) == null ? void 0 : _b.email) != null ? _d : "user", createdAt: e, updatedAt: e, usageCount: 0 };
  return await S("addDynamicTemplate", { form: { ...a, businessId: Q() } }), a;
}, async update(t, e) {
  await S("updateDynamicTemplate", { params: { id: t }, form: { ...e, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } });
}, async remove(t) {
  await S("deleteDynamicTemplate", { params: { id: t } });
}, async incrementUsage(t) {
  await S("incrementDynamicTemplateUsage", { params: { templateId: t }, form: { lastUsed: (/* @__PURE__ */ new Date()).toISOString() } });
} }, [xe, De] = createSignal([]), [Vr, Xe] = createSignal(false), [Uo, et] = createSignal(null), [Wr, Gr] = createSignal(false);
async function Yr(t = {}) {
  if (!untrack(() => Vr() || !t.force && Wr())) {
    Xe(true), et(null);
    try {
      De(await Ie.list()), Gr(true);
    } catch (a) {
      et(a instanceof Error ? a.message : "Failed to load templates");
    } finally {
      Xe(false);
    }
  }
}
async function Qr(t, e) {
  await Ie.update(t, e), De(xe().map((a) => a.id === t ? { ...a, ...e } : a));
}
async function Jr(t) {
  try {
    await Ie.incrementUsage(t);
  } catch {
  }
  De(xe().map((e) => e.id === t ? { ...e, usageCount: e.usageCount + 1, lastUsed: (/* @__PURE__ */ new Date()).toISOString() } : e));
}
const [Fo, Kr] = createSignal([]);
let tt = false;
function Zr(t, e = /* @__PURE__ */ new Date()) {
  var _a2, _b, _c;
  const a = (_b = (_a2 = t.settings) == null ? void 0 : _a2.recurrenceDay) != null ? _b : 0;
  return t.isActive && a > 0 && e.getDate() >= a && ((_c = t.settings) == null ? void 0 : _c.lastRunMonth) !== e.toISOString().slice(0, 7);
}
async function Xr() {
  if (tt) return;
  tt = true;
  try {
    await Promise.all([Yr(), ar(ve())]), Or(ve());
  } catch {
    return;
  }
  const t = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7), e = xe().filter((n) => {
    var _a2, _b;
    return Zr(n) && ((_a2 = n.settings) == null ? void 0 : _a2.autoLaunch) && ((_b = n.settings) == null ? void 0 : _b.recurringValues);
  }), a = [];
  for (const n of e) try {
    const r = { ...n.settings.recurringValues }, o = Fr(n, r, (i) => {
      const d = nr(i);
      return d ? { name: d.name, accountNumber: d.accountNumber } : void 0;
    });
    if (!o.validation.isValid) continue;
    const s = jr(n.fields, r);
    await vr({ date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), description: o.description, reference: o.reference || void 0, lines: o.lines.map((i) => {
      var _a2;
      return { accountId: i.accountId, accountNumber: i.accountNumber, accountName: i.accountName, description: i.description, document: i.document, referenceId: (_a2 = i.referenceId) != null ? _a2 : s[i.accountId], debitAmount: i.debitAmount, creditAmount: i.creditAmount };
    }) }), await Jr(n.id), await Qr(n.id, { settings: { ...n.settings, lastRunMonth: t } }), a.push(n.name);
  } catch (r) {
    console.warn("[recurring] auto-launch failed:", n.name, r);
  }
  a.length && Kr(a);
}
const eo = { common: { appName: "HRMfinance", loading: "Loading\u2026", save: "Save", cancel: "Cancel", retry: "Retry", asOf: "As of", asOfViewing: "Viewing state as of", backToPresent: "Back to present", delete: "Delete", edit: "Edit", add: "Add", search: "Search", actions: "Actions", error: "Something went wrong", confirmDelete: "Are you sure you want to delete this?", noResults: "No results", total: "Total", year: "Year", print: "Print / PDF", export: "Export CSV", signOut: "Sign out", close: "Close", menu: "Menu" }, ai: { entryTitle: "Describe the operation and AI drafts the entry", entryPlaceholder: 'e.g. "paid 245.00 for Spectrum internet with a Fifth Third check"', templateTitle: "Describe the template and AI builds fields + line rules", templatePlaceholder: 'e.g. "weekly payroll for one employee: hours \xD7 their rate, against cash"', generate: "Generate", thinking: "Thinking\u2026", scanReceipt: "Scan invoice (AI)", bankSuggest: "AI entry", bankSuggestHint: "AI classifies this movement and drafts the journal entry", analysisTitle: "AI financial analysis", analyze: "Analyze", analysisHint: "Sends the year's key figures to AI and returns a plain-language read: state, red flags and recommended actions.", errors: { unavailable: "AI is not available yet \u2014 the askTefi server op is missing", empty: "AI returned no response", badJson: "AI returned an invalid response \u2014 try again" } }, yearClose: { title: "Year close", checks: "Pre-close checks", noDrafts: "No draft entries", draftsPending: "draft entries pending \u2014 post or void them first", resultAccount: "Retained earnings / result account (Equity)", preview: "Closing entry preview", closingEntry: "Year close", openingEntry: "Opening balances", generateClose: "Generate closing entry (draft)", generateOpening: "Generate opening entry", created: "Draft entry created", hint: "Both entries are created as drafts \u2014 review them in the Journal and post when ready." }, nav: { groups: { accounting: "Accounting", operations: "Operations", people: "People", admin: "Admin" }, dashboard: "Dashboard", accounts: "Chart of Accounts", reports: "Reports", trialBalance: "Trial Balance", balanceSheet: "Balance Sheet", cashFlow: "Cash Flow", cashAdjustments: "Adjustments (non-cash balance movements)", netCashFlow: "Net cash flow", cashPosition: "Cash & bank movement", cashDelta: "Total cash movement", cashReconciles: "Net cash flow matches the cash movement", cashGap: "Difference vs cash movement", monthlyPnl: "Monthly P&L", incomeStatement: "Income Statement" }, login: { title: "HRMfinance", subtitle: "Sign in to continue", signingIn: "Signing in\u2026", failed: "Login failed", sso: "Sign in with SSO", backToLogin: "Back to login", invalidSession: "Authentication succeeded but session is invalid." }, accounts: { title: "Chart of Accounts", addAccount: "Add account", createDefaults: "Default sales accounts", createDefaultsHint: "Create/flag the default sales accounts (revenue, AR, cash, COGS, inventory, customer advances)", defaultsReady: "Default sales accounts ready", defaultsAlready: "Default sales accounts were already set", addSubAccount: "Add sub-account", editAccount: "Edit account", accountNumber: "Account number", name: "Name", type: "Type", category: "Category", description: "Description", parentAccount: "Parent account", balance: "Balance", active: "Active", inactive: "Inactive", bankAccount: "Bank account", bankName: "Bank name", bankAccountNumber: "Bank account number", bankAccountType: "Bank account type", piggybank: "Cash collection account", piggybankLabel: "Cash account label", chequesEnTransito: "Outstanding checks account", flatView: "Flat", treeView: "Tree", allTypes: "All types", cannotDelete: "This account has sub-accounts or transactions and cannot be deleted.", types: { Asset: "Asset", Liability: "Liability", Equity: "Equity", Revenue: "Revenue", Expense: "Expense" }, ledger: "Ledger", date: "Date", reference: "Reference", debit: "Debit", credit: "Credit", noTransactions: "No transactions for this year", noMatches: "No transactions match the filters", allAccounts: "All accounts", backToAccounts: "Back to chart of accounts" }, reports: { trialBalance: "Trial Balance", balanceSheet: "Balance Sheet", account: "Account", totals: "Totals", balanced: "Balanced", outOfBalance: "Out of balance", assets: "Assets", liabilities: "Liabilities", equity: "Equity", netIncome: "Net income (Revenue \u2212 Expenses)", totalAssets: "Total assets", totalLiabilitiesEquity: "Total liabilities + equity", incomeStatement: "Income Statement", revenue: "Revenue", expenses: "Expenses", netIncomeTotal: "Net income", margin: "Margin", w2: { title: "W2 register", hint: "Yearly totals per employee from paid timesheets", weeks: "Weeks", wages: "Wages (Box 1)", federal: "Fed. tax (Box 2)", socialSecurity: "SS tax (Box 4)", medicare: "Medicare (Box 6)", state: "State tax (Box 17)", empty: "No paid timesheets this year", disclaimer: "Informational register \u2014 not an official W2 filing. Verify against payroll journal entries before filing." }, lifecycle: { title: "Lifecycle", estimate: "Estimate", advancePay: "Advance", confirmed: "Confirmed", partialPayment: "Partial payment", collected: "Collected", closed: "Closed", to: { estimate: "Mark estimate", advancePay: "Record advance", confirmed: "Confirm", partialPayment: "Record partial payment", collected: "Mark collected", closed: "Close" }, accountingSettings: "Accounting settings", fromCustomer: "from customer", needAr: "Customer has no linked AR account \u2014 pick one", locked: "Locked", materializeHint: "Posts the sale journal entry and the inventory out movement.", advanceHint: "Records the advance against the customer-advances account; the sale posts when confirmed.", advancesAccount: "Customer-advances account", needAdvancesAccount: "Pick a customer-advances account", needAdvance: "Advance needs amount and cash account", needPayment: "Payment needs amount, cash and AR accounts", amount: "Amount", note: "Note", apply: "Apply", paid: "Paid", remaining: "Remaining" }, audit: { run: "Audit difference", title: "Discrepancy audit", empty: "No suspicious entries found", score: "Risk", hints: { transposition: "The discrepancy is divisible by 9 \u2014 possible transposed digits (e.g. 54 entered as 45)", wrongSide: "An entry for half the discrepancy exists \u2014 an amount may be posted to the wrong side" }, reasons: { title: "Signals", imbalance: "Entry is internally out of balance", exactMatch: "Its internal imbalance equals the discrepancy", amountMatch: "Its total equals the discrepancy", lineMatch: "A line equals the discrepancy", halfMatch: "Its total is half the discrepancy (wrong side)", rounding: "Amounts carry rounding residue", duplicate: "Possible duplicate (same date and amount)", draft: "Draft entry \u2014 post it or exclude it" } } }, journal: { serverSearch: "Search server", serverSearchHint: "Search the whole year on the server (Enter)", serverResults: "Server results", title: "Journal", newEntry: "New entry", entryNumber: "Entry #", date: "Date", description: "Description", reference: "Reference", debits: "Debits", credits: "Credits", status: "Status", lines: "Lines", line: "Line", account: "Account", debit: "Debit", credit: "Credit", addLine: "Add line", removeLine: "Remove line", balanced: "Balanced", difference: "Difference", post: "Post", void: "Void", viewEntry: "View entry", referenceId: "Entity (referenceId)", entity: "Entity", printTitle: "Journal entries report", printGenerated: "Generated", printEntries: "entries", postedAt: "Posted at", postedBy: "Posted by", voidedBy: "Voided by", updatedBy: "Updated by", createdBy: "Created by", allStatuses: "All statuses", noEntries: "No journal entries for this year", confirmPost: "Post this entry? Posted entries cannot be edited.", confirmVoid: "Void this entry?", reverse: "Reverse", reversed: "Reversed", reversedByEntry: "This entry was reversed by", reversesEntry: "This entry reverses", reversePreview: "A posted mirror entry (debits \u2194 credits) will be created, linked to", statuses: { draft: "Draft", posted: "Posted", void: "Void" }, errors: { dateRequired: "Date is required", descriptionRequired: "Description is required", linesRequired: "At least one line is required", lineAccount: "Line {n}: account is required", lineAmount: "Line {n}: a debit or credit amount is required", lineBothSides: "Line {n}: cannot have both debit and credit", notBalanced: "Entry is not balanced \u2014 debits must equal credits", deletePosted: "Posted entries cannot be deleted. Void them instead.", notFound: "Journal entry not found", reverseOnlyPosted: "Only posted entries can be reversed", alreadyReversed: "This entry was already reversed", reverseForbidden: "You don't have permission to reverse entries" } }, chain: { timeline: "History", created: "Created", edited: "Edited", noEvents: "No further activity", reason: "Reason", reasonRequired: "Reason is required", confirm: "Confirm" }, templates: { title: "Templates", launch: "Use template", manage: "Manage templates", newTemplate: "New template", editTemplate: "Edit template", noTemplates: "No templates yet", category: "Category", fields: "Fields", lineRules: "Line rules", settings: "Settings", preview: "Preview", generate: "Create entry", usageCount: "Used {n} times", recurrenceDay: "Recurring \u2014 day of month (empty = off)", saveForAuto: "Save these values and auto-create the draft each month", hideHelp: "Hide help", showHelp: "Show help", dynamicAccount: "Dynamic account (expression)", connectors: "Connectors", connector: { provider: "Provider", customer: "Customer", employee: "Employee" }, connectorInfoTitle: "Connectors: providers, customers and employees", connectorInfoBody: "When running the template you can pick a provider, customer and/or employee. Their real fields become variables usable anywhere in this template \u2014 default description, reference format, amount expressions, dynamic account, referenceId \u2014 and text fields whose name mentions the entity are auto-filled.", connectorRateHint: "rate = effective hourly rate", connectorInfoExample: `Example: a line rule with dynamic account "{provider.relatedAccountId}", referenceId "{provider.id}" and amount "{monto}" debits the picked provider's AP account; a payroll amount can be "{horas} * {employee.rate}".`, connectorVars: "Variables: {provider.name}, {provider.relatedAccountId}, {customer.name}, {customer.relatedAccountId}, {employee.name}, {employee.rate}\u2026", connectorHint: "Connectors expose the entity's real fields: {provider.name}, {provider.id}, {provider.relatedAccountId}, {customer.taxId}, {employee.rate}\u2026", active: "Active", inactive: "Inactive", errors: { fieldRequired: "{0} is required", accountNotFound: "Account not found: {0}", badAmount: "Invalid amount on line: {0}", minLines: "Template must produce at least 2 lines", notBalanced: "Generated entry is not balanced" } }, providers: { title: "Providers & Customers", newEntity: "New entity", editEntity: "Edit entity", name: "Name", type: "Type", email: "Email", phone: "Phone", address: "Address", taxId: "Tax ID", contactPerson: "Contact person", notes: "Notes", balance: "Balance", relatedAccount: "Related account (AP/AR)", active: "Active", inactive: "Inactive", allTypes: "All", noEntities: "No providers or customers yet", recordPayment: "Record payment", recordCollection: "Record collection", amount: "Amount", paymentMethod: "Payment method", date: "Date", reference: "Reference", description: "Description", weOwe: "We owe", theyOwe: "They owe", settled: "Settled", types: { customer: "Customer", provider: "Provider", both: "Both" }, method: "Method", methods: { cash: "Cash", check: "Check", transfer: "Transfer", zelle: "Zelle", credit_card: "Credit card", other: "Other" }, document: "Document", viewDocuments: "Documents", noDocuments: "No documents this year", pendingDocs: "Pending documents", cashAccount: "Cash/bank account", tabs: { all: "All", pending: "Pending", settled: "Settled" }, advance: "Advance", openEntry: "Open journal entry", advanceAccount: "Advance account (anticipos)", applyAdvance: "Apply advance", accountsPayable: "Accounts payable", accountsReceivable: "Accounts receivable", multiPayment: "Batch payment", multiCollection: "Batch collection", sendReminder: "Send payment reminder", reminderSubject: "Payment reminder", reminderBody: "Dear", reminderIntro: "Our records show the following pending documents:", directory: "Directory", aging: "Aging", agingDays: "days", agingBuckets: { b30: "1\u201330", b60: "31\u201360", b90: "61\u201390", b90p: "+90" }, cashMovement: "Cash movement", extraLines: "Additional lines", addLine: "Add line", debit: "Debit", credit: "Credit", addAdvanceFor: "Add advance (anticipo) for\u2026", newAdvance: "NEW ADVANCE", applyToAR: "Apply to receivable (no cash)", applyToAP: "Apply to payable (no cash)", errors: { notFound: "Entity not found", noRelatedAccount: "This entity has no AP/AR account linked \u2014 edit it and pick a related account first", noAdvanceAccount: "This entity has no advance account \u2014 edit it and pick one", cashAccountRequired: "Select the cash/bank account", amountRequired: "Enter an amount or select pending documents" } }, audit: { title: "Audit trail", events: "events", user: "User", action: "Action", when: "When", from: "From", to: "To", actions: { created: "Created", posted: "Posted", updated: "Updated", voided: "Voided" } }, inventory: { title: "Inventory", products: "Products", movements: "Movements", realCost: "Actual cost", realCostHint: "Quantity-weighted average cost of the stock on hand (backend avg_cost)", productLedger: "Movement ledger", price: "Price", netMovement: "Net", stockCount: "Stock count", systemQty: "System", countedQty: "Counted", difference: "Difference", applyCount: "Apply differences", countApplied: "Adjustments applied", confirmCount: "Apply the count differences as inventory movements?", searchMovements: "Search movements\u2026", movementDetail: "Movement detail", confirmDeleteMovement: "Delete this movement? Stock impact is NOT reverted automatically.", stock: "Stock", newProduct: "New product", editProduct: "Edit product", name: "Name", sku: "SKU", upc: "UPC", code: "Code", category: "Category", description: "Description", unitOfMeasure: "Unit", unitCost: "Unit cost", sellingPrice: "Selling price", minStock: "Min stock", maxStock: "Max stock", active: "Active", inactive: "Inactive", noProducts: "No products yet", location: "Location", fromLocation: "From location", toLocation: "To location", quantity: "Quantity", reference: "Reference", notes: "Notes", newMovement: "New movement", movementType: "Movement type", product: "Product", noMovements: "No movements", lowStock: "Low stock", date: "Date", type: "Type", allLocations: "All locations", types: { in: "Stock in", out: "Stock out", adjustment: "Adjustment", transfer: "Transfer" } }, transactions: { title: "Operations", confirmDeleteInvoice: "Delete this record? Only the document trail is removed \u2014 the journal entry is NOT voided (do that in the Journal).", editQuote: "Edit / convert quote", quoteUpdated: "Quote updated", saveQuote: "Save quote", quoteSaved: "Quote saved", convertQuote: "Convert to invoice", quote: "Quote", quotes: "Quotes", invoice: "Invoice", purchaseReceipt: "Purchase record", services: "Services", productsSubtotal: "Products subtotal", servicesSubtotal: "Services subtotal", history: "History", number: "Number", entity: "Provider/Customer", allTypes: "All", noTransactions: "No transactions", compras: "Purchases", facturacion: "Sales", mermas: "Shrinkage", date: "Date", description: "Description", reference: "Reference", provider: "Provider", customer: "Customer", product: "Product", qty: "Qty", unitCost: "Unit cost", unitPrice: "Unit price", subtotal: "Subtotal", addLine: "Add line", serviceLines: "Services", serviceName: "Service", expenseAccount: "Expense account", paymentMode: "Payment mode", cash: "Cash", bank: "Bank", credit: "Credit", inventoryAccount: "Inventory account", paymentAccount: "Cash/Bank account", apAccount: "Payable account (AP)", arAccount: "Receivable account (AR)", revenueAccount: "Revenue account", cogsAccount: "COGS account", lossAccount: "Loss account", location: "Location", receiveStock: "Receive into stock", postCogs: "Post cost of goods sold", reason: "Reason", total: "Total", post: "Post transaction", posted: "Transaction posted", selectAccount: "Select account", reasons: { breakage: "Breakage", loss: "Loss", expired: "Expired", damaged: "Damaged", theft: "Theft", other: "Other" }, errors: { needLine: "Add at least one line", needAccounts: "Select all required accounts", needLocation: "Location is required to move stock", badTotal: "Total must be greater than zero" } }, banking: { exactMatch: "Exact", goodMatch: "Good", possibleMatch: "Possible", showLowScore: "Show weak matches", title: "Bank Reconciliation", account: "Bank account", selectAccount: "Select a bank account", noBankAccounts: "No accounts flagged as bank accounts. Mark an account as a bank account in the chart of accounts.", importCsv: "Import CSV", statements: "Bank statements", entryRecords: "Ledger records", date: "Date", description: "Description", reference: "Reference", debit: "Debit", credit: "Credit", balance: "Balance", status: "Status", reconciled: "Reconciled", unreconciled: "Unreconciled", suggested: "Suggested match", match: "Match", unmatch: "Unmatch", score: "Score", noStatements: "No bank statements. Import a CSV to begin.", noRecords: "No ledger records for this account this year", csvHelp: "Columns: date, description, reference, debit, credit, balance", csvPaste: "Paste CSV rows", importBtn: "Import", imported: "{n} statements imported" }, employees: { federalRate: "Federal withholding (%)", stateRate: "State withholding (%)", title: "Employees", newEmployee: "New employee", editEmployee: "Edit employee", name: "Name", position: "Position", department: "Department", email: "Email", phone: "Phone", startDate: "Start date", status: "Status", employeeNumber: "Employee #", clockingNumber: "Clocking #", business: "Business (businessId)", businessHint: "Admin only \u2014 moving the employee to another business changes where it shows up.", employmentType: "Employment type", ssn: "SSN", payType: "Pay type", hourlyRate: "Hourly rate", annualSalary: "Annual salary", overtimeRate: "Overtime rate", standardHours: "Standard hours/week", lunchMinutes: "Lunch (minutes)", taxRate: "Tax rate (%)", insuranceDeduction: "Insurance deduction", allStatuses: "All statuses", allDepartments: "All departments", noEmployees: "No employees yet", hourlyRateLabel: "Rate", statuses: { active: "Active", inactive: "Inactive", terminated: "Terminated", on_leave: "On leave" }, payTypes: { hourly: "Hourly", salary: "Salary" } }, timesheets: { title: "Timesheets", newCard: "New week card", editCard: "Edit week card", employee: "Employee", week: "Week", weekOf: "Week of", status: "Status", totalHours: "Total hours", overtime: "Overtime", regular: "Regular", day: "Day", mode: "Mode", start: "Start", end: "End", hours: "Hours", lunch: "Lunch (min)", netHours: "Net", selectEmployee: "Select employee", noTimesheets: "No timesheets yet", allStatuses: "All statuses", submit: "Submit", approve: "Approve", reject: "Reject", payroll: "Payroll", rate: "Rate", regularPay: "Regular pay", overtimePay: "Overtime pay", payStub: "Pay stub", postPayroll: "Post payroll", payrollFor: "Payroll", salaryAccount: "Salary expense account", withholdingAccount: "Withholdings account (liability)", gross: "Gross", taxes: "Taxes", insurance: "Insurance", federal: "Federal tax", socialSecurity: "Social Security", medicare: "Medicare", stateTax: "State tax", net: "Net pay", rejectReason: "Reason for rejection", statuses: { draft: "Draft", submitted: "Submitted", approved: "Approved", paid: "Paid" }, modes: { clock: "Clock", hours: "Hours" }, days: { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" } }, dashboard: { recurringDue: "recurring template(s) pending this month", recurringLaunched: "recurring draft(s) created automatically", financialPosition: "Financial position", assets: "Assets", liabilities: "Liabilities", equity: "Equity", netIncome: "Net income", journalActivity: "Journal activity", draftEntries: "Draft entries", postedEntries: "Posted entries", receivables: "Receivables (customers owe)", payables: "Payables (we owe)", lowStock: "Products at/below min stock", pendingTimesheets: "Timesheets awaiting approval", quickActions: "Quick actions", newPurchase: "New purchase", newSale: "New sale", newEntry: "New journal entry" }, admin: { title: "Admin", geminiUsage: "Gemini Usage", since: "Since", refresh: "Refresh", rawJson: "Raw response" } }, to = { common: { appName: "HRMfinance", loading: "Cargando\u2026", save: "Guardar", cancel: "Cancelar", retry: "Reintentar", asOf: "Al", asOfViewing: "Viendo estado al", backToPresent: "Volver al presente", delete: "Eliminar", edit: "Editar", add: "Agregar", search: "Buscar", actions: "Acciones", error: "Algo sali\xF3 mal", confirmDelete: "\xBFSeguro que desea eliminar esto?", noResults: "Sin resultados", total: "Total", year: "A\xF1o", print: "Imprimir / PDF", export: "Exportar CSV", signOut: "Cerrar sesi\xF3n", close: "Cerrar", menu: "Men\xFA" }, ai: { entryTitle: "Describe la operaci\xF3n y la IA arma el asiento", entryPlaceholder: 'p.ej. "pagu\xE9 245.00 de internet Spectrum con cheque del banco Fifth Third"', templateTitle: "Describe la plantilla y la IA arma campos + reglas de l\xEDneas", templatePlaceholder: 'p.ej. "pago de n\xF3mina semanal de un empleado: horas \xD7 su tarifa, contra caja"', generate: "Generar", thinking: "Pensando\u2026", scanReceipt: "Escanear factura (IA)", bankSuggest: "Asiento IA", bankSuggestHint: "La IA clasifica este movimiento y arma el asiento borrador", analysisTitle: "An\xE1lisis financiero con IA", analyze: "Analizar", analysisHint: "Env\xEDa las cifras clave del a\xF1o a la IA y devuelve una lectura en lenguaje claro: estado, alertas y acciones recomendadas.", errors: { unavailable: "La IA no est\xE1 disponible a\xFAn \u2014 falta la operaci\xF3n askTefi en el servidor", empty: "La IA no devolvi\xF3 respuesta", badJson: "La IA devolvi\xF3 una respuesta inv\xE1lida \u2014 intenta de nuevo" } }, yearClose: { title: "Cierre de a\xF1o", checks: "Verificaciones previas", noDrafts: "Sin asientos en borrador", draftsPending: "asientos en borrador \u2014 contabil\xEDcelos o an\xFAlelos primero", resultAccount: "Cuenta de resultado del ejercicio (Patrimonio)", preview: "Vista previa del asiento de cierre", closingEntry: "Cierre del ejercicio", openingEntry: "Saldos de apertura", generateClose: "Generar asiento de cierre (borrador)", generateOpening: "Generar asiento de apertura", created: "Asiento borrador creado", hint: "Ambos asientos se crean como borradores \u2014 rev\xEDselos en el Diario y contabil\xEDcelos cuando est\xE9n listos." }, nav: { groups: { accounting: "Contabilidad", operations: "Operaciones", people: "Personal", admin: "Administraci\xF3n" }, dashboard: "Panel", accounts: "Plan de Cuentas", reports: "Reportes", trialBalance: "Balance de Comprobaci\xF3n", balanceSheet: "Balance General", cashFlow: "Flujo de Efectivo", cashAdjustments: "Ajustes (variaciones no-efectivo)", netCashFlow: "Flujo neto de efectivo", cashPosition: "Movimiento de efectivo y bancos", cashDelta: "Variaci\xF3n total de efectivo", cashReconciles: "El flujo neto coincide con la variaci\xF3n de efectivo", cashGap: "Diferencia vs variaci\xF3n de efectivo", monthlyPnl: "P&L Mensual", incomeStatement: "Estado de Resultados" }, login: { title: "HRMfinance", subtitle: "Inicie sesi\xF3n para continuar", signingIn: "Iniciando sesi\xF3n\u2026", failed: "Error al iniciar sesi\xF3n", invalidSession: "La autenticaci\xF3n fue exitosa pero la sesi\xF3n es inv\xE1lida.", sso: "Iniciar sesi\xF3n con SSO", backToLogin: "Volver al inicio de sesi\xF3n" }, accounts: { title: "Plan de Cuentas", addAccount: "Agregar cuenta", createDefaults: "Cuentas de ventas por defecto", createDefaultsHint: "Crea/marca las cuentas por defecto de ventas (ingresos, CxC, caja, costo de ventas, inventario, anticipos de clientes)", defaultsReady: "Cuentas de ventas por defecto listas", defaultsAlready: "Las cuentas de ventas por defecto ya estaban configuradas", addSubAccount: "Agregar subcuenta", editAccount: "Editar cuenta", accountNumber: "N\xFAmero de cuenta", name: "Nombre", type: "Tipo", category: "Categor\xEDa", description: "Descripci\xF3n", parentAccount: "Cuenta padre", balance: "Saldo", active: "Activa", inactive: "Inactiva", bankAccount: "Cuenta bancaria", bankName: "Banco", bankAccountNumber: "N\xFAmero de cuenta bancaria", bankAccountType: "Tipo de cuenta bancaria", piggybank: "Cuenta de caja", piggybankLabel: "Etiqueta de caja", chequesEnTransito: "Cuenta de cheques en tr\xE1nsito", flatView: "Lista", treeView: "\xC1rbol", allTypes: "Todos los tipos", cannotDelete: "Esta cuenta tiene subcuentas o transacciones y no puede eliminarse.", types: { Asset: "Activo", Liability: "Pasivo", Equity: "Patrimonio", Revenue: "Ingreso", Expense: "Gasto" }, ledger: "Submayor", date: "Fecha", reference: "Referencia", debit: "D\xE9bito", credit: "Cr\xE9dito", noTransactions: "Sin transacciones este a\xF1o", noMatches: "Sin transacciones que coincidan con los filtros", allAccounts: "Todas las cuentas", backToAccounts: "Volver al plan de cuentas" }, reports: { trialBalance: "Balance de Comprobaci\xF3n", balanceSheet: "Balance General", account: "Cuenta", totals: "Totales", balanced: "Cuadrado", outOfBalance: "Descuadre", assets: "Activos", liabilities: "Pasivos", equity: "Patrimonio", netIncome: "Resultado (Ingresos \u2212 Gastos)", totalAssets: "Total activos", totalLiabilitiesEquity: "Total pasivos + patrimonio", incomeStatement: "Estado de Resultados", revenue: "Ingresos", expenses: "Gastos", netIncomeTotal: "Resultado neto", margin: "Margen", w2: { title: "Registro W2", hint: "Totales anuales por empleado de tarjetas pagadas", weeks: "Semanas", wages: "Salario (Box 1)", federal: "Imp. federal (Box 2)", socialSecurity: "Seg. Social (Box 4)", medicare: "Medicare (Box 6)", state: "Imp. estatal (Box 17)", empty: "Sin tarjetas pagadas este a\xF1o", disclaimer: "Registro informativo \u2014 no es una presentaci\xF3n W2 oficial. Verifica contra los asientos de n\xF3mina antes de reportar." }, lifecycle: { title: "Ciclo", estimate: "Estimado", advancePay: "Anticipo", confirmed: "Confirmada", partialPayment: "Pago parcial", collected: "Cobrada", closed: "Cerrada", to: { estimate: "Marcar estimado", advancePay: "Registrar anticipo", confirmed: "Confirmar", partialPayment: "Registrar pago parcial", collected: "Marcar cobrada", closed: "Cerrar" }, accountingSettings: "Ajustes contables", fromCustomer: "del cliente", needAr: "El cliente no tiene cuenta CxC vinculada \u2014 elige una", locked: "Bloqueada", materializeHint: "Contabiliza el asiento de venta y el movimiento de salida de inventario.", advanceHint: "Registra el anticipo contra la cuenta de anticipos del cliente; la venta se contabiliza al confirmar.", advancesAccount: "Cuenta de anticipos de clientes", needAdvancesAccount: "Elige una cuenta de anticipos de clientes", needAdvance: "El anticipo necesita monto y cuenta de efectivo", needPayment: "El cobro necesita monto, cuenta de efectivo y cuenta por cobrar", amount: "Monto", note: "Nota", apply: "Aplicar", paid: "Pagado", remaining: "Pendiente" }, audit: { run: "Auditar diferencia", title: "Auditor\xEDa del descuadre", empty: "No se encontraron asientos sospechosos", score: "Riesgo", hints: { transposition: "El descuadre es divisible entre 9 \u2014 posible transposici\xF3n de d\xEDgitos (ej. 54 escrito como 45)", wrongSide: "Un asiento por la mitad del descuadre existe \u2014 posible monto asentado al lado contrario" }, reasons: { title: "Se\xF1ales", imbalance: "Asiento descuadrado internamente", exactMatch: "Su descuadre interno coincide con la diferencia", amountMatch: "Su total coincide con la diferencia", lineMatch: "Una l\xEDnea coincide con la diferencia", halfMatch: "Su total es la mitad de la diferencia (lado contrario)", rounding: "Montos con residuo de redondeo", duplicate: "Posible duplicado (misma fecha y monto)", draft: "Es borrador \u2014 contabil\xEDcelo o excl\xFAyalo" } } }, journal: { serverSearch: "Buscar en servidor", serverSearchHint: "Buscar todo el a\xF1o en el servidor (Enter)", serverResults: "Resultados del servidor", title: "Diario", newEntry: "Nuevo asiento", entryNumber: "Asiento #", date: "Fecha", description: "Descripci\xF3n", reference: "Referencia", debits: "D\xE9bitos", credits: "Cr\xE9ditos", status: "Estado", lines: "L\xEDneas", line: "L\xEDnea", account: "Cuenta", debit: "D\xE9bito", credit: "Cr\xE9dito", addLine: "Agregar l\xEDnea", removeLine: "Quitar l\xEDnea", balanced: "Cuadrado", difference: "Diferencia", post: "Contabilizar", void: "Anular", viewEntry: "Ver asiento", referenceId: "Entidad (referenceId)", entity: "Entidad", printTitle: "Reporte de asientos contables", printGenerated: "Generado", printEntries: "asientos", postedAt: "Contabilizado", postedBy: "Contabilizado por", voidedBy: "Anulado por", updatedBy: "Editado por", createdBy: "Creado por", allStatuses: "Todos los estados", noEntries: "Sin asientos este a\xF1o", confirmPost: "\xBFContabilizar este asiento? Los asientos contabilizados no se pueden editar.", confirmVoid: "\xBFAnular este asiento?", reverse: "Revertir", reversed: "Revertido", reversedByEntry: "Este asiento fue revertido por", reversesEntry: "Este asiento revierte a", reversePreview: "Se crear\xE1 y contabilizar\xE1 un asiento espejo (d\xE9bitos \u2194 cr\xE9ditos) vinculado a", statuses: { draft: "Borrador", posted: "Contabilizado", void: "Anulado" }, errors: { dateRequired: "La fecha es obligatoria", descriptionRequired: "La descripci\xF3n es obligatoria", linesRequired: "Se requiere al menos una l\xEDnea", lineAccount: "L\xEDnea {n}: la cuenta es obligatoria", lineAmount: "L\xEDnea {n}: se requiere un monto d\xE9bito o cr\xE9dito", lineBothSides: "L\xEDnea {n}: no puede tener d\xE9bito y cr\xE9dito a la vez", notBalanced: "El asiento no est\xE1 cuadrado \u2014 d\xE9bitos deben igualar cr\xE9ditos", deletePosted: "Los asientos contabilizados no se pueden eliminar. An\xFAlelos.", notFound: "Asiento no encontrado", reverseOnlyPosted: "Solo se pueden revertir asientos contabilizados", alreadyReversed: "Este asiento ya fue revertido", reverseForbidden: "No tienes permiso para revertir asientos" } }, chain: { timeline: "Historial", created: "Creado", edited: "Editado", noEvents: "Sin movimientos posteriores", reason: "Motivo", reasonRequired: "El motivo es obligatorio", confirm: "Confirmar" }, templates: { title: "Plantillas", launch: "Usar plantilla", manage: "Gestionar plantillas", newTemplate: "Nueva plantilla", editTemplate: "Editar plantilla", noTemplates: "A\xFAn no hay plantillas", category: "Categor\xEDa", fields: "Campos", lineRules: "Reglas de l\xEDneas", settings: "Configuraci\xF3n", preview: "Vista previa", generate: "Crear asiento", usageCount: "Usada {n} veces", recurrenceDay: "Recurrente \u2014 d\xEDa del mes (vac\xEDo = no)", saveForAuto: "Guardar estos valores y crear el borrador autom\xE1ticamente cada mes", hideHelp: "Ocultar ayuda", showHelp: "Mostrar ayuda", dynamicAccount: "Cuenta din\xE1mica (expresi\xF3n)", connectors: "Conectores", connector: { provider: "Proveedor", customer: "Cliente", employee: "Empleado" }, connectorInfoTitle: "Conectores: proveedores, clientes y empleados", connectorInfoBody: "Al ejecutar la plantilla puedes escoger un proveedor, cliente y/o empleado. Sus campos reales se vuelven variables usables en cualquier parte de esta plantilla \u2014 descripci\xF3n por defecto, formato de referencia, expresiones de monto, cuenta din\xE1mica, referenceId \u2014 y los campos de texto cuyo nombre mencione la entidad se auto-rellenan.", connectorRateHint: "rate = tarifa horaria efectiva", connectorInfoExample: 'Ejemplo: una regla de l\xEDnea con cuenta din\xE1mica "{provider.relatedAccountId}", referenceId "{provider.id}" y monto "{monto}" debita la CxP del proveedor escogido; un monto de n\xF3mina puede ser "{horas} * {employee.rate}".', connectorVars: "Variables: {provider.name}, {provider.relatedAccountId}, {customer.name}, {customer.relatedAccountId}, {employee.name}, {employee.rate}\u2026", connectorHint: "Los conectores exponen los campos reales de la entidad: {provider.name}, {provider.id}, {provider.relatedAccountId}, {customer.taxId}, {employee.rate}\u2026", active: "Activa", inactive: "Inactiva", errors: { fieldRequired: "{0} es obligatorio", accountNotFound: "Cuenta no encontrada: {0}", badAmount: "Monto inv\xE1lido en l\xEDnea: {0}", minLines: "La plantilla debe generar al menos 2 l\xEDneas", notBalanced: "El asiento generado no est\xE1 cuadrado" } }, providers: { title: "Proveedores y Clientes", newEntity: "Nueva entidad", editEntity: "Editar entidad", name: "Nombre", type: "Tipo", email: "Correo", phone: "Tel\xE9fono", address: "Direcci\xF3n", taxId: "ID fiscal", contactPerson: "Persona de contacto", notes: "Notas", balance: "Saldo", relatedAccount: "Cuenta relacionada (CxP/CxC)", active: "Activo", inactive: "Inactivo", allTypes: "Todos", noEntities: "A\xFAn no hay proveedores ni clientes", recordPayment: "Registrar pago", recordCollection: "Registrar cobro", amount: "Monto", paymentMethod: "M\xE9todo de pago", date: "Fecha", reference: "Referencia", description: "Descripci\xF3n", weOwe: "Le debemos", theyOwe: "Nos deben", settled: "Saldado", types: { customer: "Cliente", provider: "Proveedor", both: "Ambos" }, method: "M\xE9todo", methods: { cash: "Efectivo", check: "Cheque", transfer: "Transferencia", zelle: "Zelle", credit_card: "Tarjeta", other: "Otro" }, document: "Documento", viewDocuments: "Documentos", noDocuments: "Sin documentos este a\xF1o", pendingDocs: "Documentos pendientes", cashAccount: "Cuenta de efectivo/banco", tabs: { all: "Todos", pending: "Pendientes", settled: "Saldados" }, advance: "Anticipo", openEntry: "Ver asiento contable", advanceAccount: "Cuenta de anticipos", applyAdvance: "Aplicar anticipo", accountsPayable: "Cuentas por Pagar", accountsReceivable: "Cuentas por Cobrar", multiPayment: "Pago m\xFAltiple", multiCollection: "Cobro m\xFAltiple", sendReminder: "Enviar recordatorio de pago", reminderSubject: "Recordatorio de pago", reminderBody: "Estimado", reminderIntro: "Seg\xFAn nuestros registros, tiene los siguientes documentos pendientes:", directory: "Directorio", aging: "Antig\xFCedad de saldos", agingDays: "d\xEDas", agingBuckets: { b30: "1\u201330", b60: "31\u201360", b90: "61\u201390", b90p: "+90" }, cashMovement: "Movimiento de efectivo", extraLines: "L\xEDneas adicionales", addLine: "Agregar l\xEDnea", debit: "D\xE9bito", credit: "Cr\xE9dito", addAdvanceFor: "Agregar anticipo para\u2026", newAdvance: "NUEVO ANTICIPO", applyToAR: "Aplicar a CxC (sin efectivo)", applyToAP: "Aplicar a CxP (sin efectivo)", errors: { notFound: "Entidad no encontrada", noRelatedAccount: "Esta entidad no tiene cuenta CxP/CxC vinculada \u2014 ed\xEDtela y seleccione una cuenta relacionada", noAdvanceAccount: "Esta entidad no tiene cuenta de anticipos \u2014 ed\xEDtela y seleccione una", cashAccountRequired: "Seleccione la cuenta de efectivo/banco", amountRequired: "Ingrese un monto o seleccione documentos pendientes" } }, audit: { title: "Auditor\xEDa", events: "eventos", user: "Usuario", action: "Acci\xF3n", when: "Fecha/Hora", from: "Desde", to: "Hasta", actions: { created: "Creado", posted: "Contabilizado", updated: "Modificado", voided: "Anulado" } }, inventory: { title: "Inventario", products: "Productos", movements: "Movimientos", realCost: "Costo real", realCostHint: "Costo promedio ponderado del stock en mano (avg_cost del backend)", productLedger: "Submayor del producto", price: "Precio", netMovement: "Neto", stockCount: "Conteo f\xEDsico", systemQty: "Sistema", countedQty: "Contado", difference: "Diferencia", applyCount: "Aplicar diferencias", countApplied: "Ajustes aplicados", confirmCount: "\xBFAplicar las diferencias del conteo como movimientos de inventario?", searchMovements: "Buscar movimientos\u2026", movementDetail: "Detalle del movimiento", confirmDeleteMovement: "\xBFEliminar este movimiento? El impacto en existencias NO se revierte autom\xE1ticamente.", stock: "Existencias", newProduct: "Nuevo producto", editProduct: "Editar producto", name: "Nombre", sku: "SKU", upc: "UPC", code: "C\xF3digo", category: "Categor\xEDa", description: "Descripci\xF3n", unitOfMeasure: "Unidad", unitCost: "Costo unitario", sellingPrice: "Precio de venta", minStock: "Stock m\xEDn.", maxStock: "Stock m\xE1x.", active: "Activo", inactive: "Inactivo", noProducts: "A\xFAn no hay productos", location: "Ubicaci\xF3n", fromLocation: "Desde ubicaci\xF3n", toLocation: "Hacia ubicaci\xF3n", quantity: "Cantidad", reference: "Referencia", notes: "Notas", newMovement: "Nuevo movimiento", movementType: "Tipo de movimiento", product: "Producto", noMovements: "Sin movimientos", lowStock: "Stock bajo", date: "Fecha", type: "Tipo", allLocations: "Todas las ubicaciones", types: { in: "Entrada", out: "Salida", adjustment: "Ajuste", transfer: "Transferencia", entry: "Entrada", sales: "Venta", sale: "Venta", purchase: "Compra" } }, transactions: { title: "Operaciones", confirmDeleteInvoice: "\xBFEliminar este registro? Solo se borra el documento del historial \u2014 el asiento contable NO se anula (hazlo en el Diario).", editQuote: "Editar / convertir cotizaci\xF3n", quoteUpdated: "Cotizaci\xF3n actualizada", saveQuote: "Guardar cotizaci\xF3n", quoteSaved: "Cotizaci\xF3n guardada", convertQuote: "Convertir a factura", quote: "Cotizaci\xF3n", quotes: "Cotizaciones", invoice: "Factura", purchaseReceipt: "Registro de compra", services: "Servicios", productsSubtotal: "Subtotal productos", servicesSubtotal: "Subtotal servicios", history: "Historial", number: "N\xFAmero", entity: "Proveedor/Cliente", allTypes: "Todos", noTransactions: "Sin transacciones", compras: "Compras", facturacion: "Facturaci\xF3n", mermas: "Mermas", date: "Fecha", description: "Descripci\xF3n", reference: "Referencia", provider: "Proveedor", customer: "Cliente", product: "Producto", qty: "Cant.", unitCost: "Costo unitario", unitPrice: "Precio unitario", subtotal: "Subtotal", addLine: "Agregar l\xEDnea", serviceLines: "Servicios", serviceName: "Servicio", expenseAccount: "Cuenta de gasto", paymentMode: "Forma de pago", cash: "Efectivo", bank: "Banco", credit: "Cr\xE9dito", inventoryAccount: "Cuenta de inventario", paymentAccount: "Cuenta de efectivo/banco", apAccount: "Cuenta por pagar (CxP)", arAccount: "Cuenta por cobrar (CxC)", revenueAccount: "Cuenta de ingreso", cogsAccount: "Cuenta de costo (COGS)", lossAccount: "Cuenta de p\xE9rdida", location: "Ubicaci\xF3n", receiveStock: "Ingresar a inventario", postCogs: "Registrar costo de venta", reason: "Motivo", total: "Total", post: "Registrar transacci\xF3n", posted: "Transacci\xF3n registrada", selectAccount: "Seleccionar cuenta", reasons: { breakage: "Rotura", loss: "P\xE9rdida", expired: "Vencido", damaged: "Da\xF1ado", theft: "Robo", other: "Otro" }, errors: { needLine: "Agregue al menos una l\xEDnea", needAccounts: "Seleccione todas las cuentas requeridas", needLocation: "La ubicaci\xF3n es obligatoria para mover inventario", badTotal: "El total debe ser mayor a cero" } }, banking: { title: "Conciliaci\xF3n Bancaria", exactMatch: "Exacta", goodMatch: "Buena", possibleMatch: "Posible", showLowScore: "Mostrar coincidencias d\xE9biles", account: "Cuenta bancaria", selectAccount: "Seleccione una cuenta bancaria", noBankAccounts: "No hay cuentas marcadas como bancarias. Marque una cuenta como bancaria en el plan de cuentas.", importCsv: "Importar CSV", statements: "Extractos bancarios", entryRecords: "Registros del libro mayor", date: "Fecha", description: "Descripci\xF3n", reference: "Referencia", debit: "D\xE9bito", credit: "Cr\xE9dito", balance: "Saldo", status: "Estado", reconciled: "Conciliado", unreconciled: "Sin conciliar", suggested: "Coincidencia sugerida", match: "Conciliar", unmatch: "Desconciliar", score: "Puntaje", noStatements: "Sin extractos. Importe un CSV para comenzar.", noRecords: "Sin registros del mayor para esta cuenta este a\xF1o", csvHelp: "Columnas: fecha, descripci\xF3n, referencia, d\xE9bito, cr\xE9dito, saldo", csvPaste: "Pegue las filas CSV", importBtn: "Importar", imported: "{n} extractos importados" }, employees: { federalRate: "Retenci\xF3n federal (%)", stateRate: "Retenci\xF3n estatal (%)", title: "Empleados", newEmployee: "Nuevo empleado", editEmployee: "Editar empleado", name: "Nombre", position: "Cargo", department: "Departamento", email: "Correo", phone: "Tel\xE9fono", startDate: "Fecha de ingreso", status: "Estado", employeeNumber: "N\xB0 empleado", clockingNumber: "N\xB0 reloj", business: "Negocio (businessId)", businessHint: "Solo admin \u2014 mover el empleado a otro negocio cambia d\xF3nde aparece.", employmentType: "Tipo de empleo", ssn: "SSN", payType: "Tipo de pago", hourlyRate: "Tarifa por hora", annualSalary: "Salario anual", overtimeRate: "Tarifa extra", standardHours: "Horas est\xE1ndar/semana", lunchMinutes: "Almuerzo (minutos)", taxRate: "Tasa de impuesto (%)", insuranceDeduction: "Deducci\xF3n de seguro", allStatuses: "Todos los estados", allDepartments: "Todos los departamentos", noEmployees: "A\xFAn no hay empleados", hourlyRateLabel: "Tarifa", statuses: { active: "Activo", inactive: "Inactivo", terminated: "Terminado", on_leave: "En licencia" }, payTypes: { hourly: "Por hora", salary: "Salario" } }, timesheets: { title: "Tarjetas de Tiempo", newCard: "Nueva tarjeta semanal", editCard: "Editar tarjeta semanal", employee: "Empleado", week: "Semana", weekOf: "Semana del", status: "Estado", totalHours: "Horas totales", overtime: "Horas extra", regular: "Regulares", day: "D\xEDa", mode: "Modo", start: "Entrada", end: "Salida", hours: "Horas", lunch: "Almuerzo (min)", netHours: "Neto", selectEmployee: "Seleccione empleado", noTimesheets: "A\xFAn no hay tarjetas", allStatuses: "Todos los estados", submit: "Enviar", approve: "Aprobar", reject: "Rechazar", payroll: "N\xF3mina", rate: "Tarifa", regularPay: "Pago regular", overtimePay: "Pago extra", payStub: "Tal\xF3n de pago", postPayroll: "Contabilizar n\xF3mina", payrollFor: "N\xF3mina", salaryAccount: "Cuenta de gasto de salario", withholdingAccount: "Cuenta de retenciones (pasivo)", gross: "Bruto", taxes: "Impuestos", insurance: "Seguro", federal: "Impuesto federal", socialSecurity: "Seguro Social", medicare: "Medicare", stateTax: "Impuesto estatal", net: "Pago neto", rejectReason: "Motivo del rechazo", statuses: { draft: "Borrador", submitted: "Enviada", approved: "Aprobada", paid: "Pagada" }, modes: { clock: "Reloj", hours: "Horas" }, days: { monday: "Lunes", tuesday: "Martes", wednesday: "Mi\xE9rcoles", thursday: "Jueves", friday: "Viernes", saturday: "S\xE1bado", sunday: "Domingo" } }, dashboard: { recurringDue: "plantilla(s) recurrente(s) pendiente(s) este mes", recurringLaunched: "borrador(es) recurrente(s) creado(s) autom\xE1ticamente", financialPosition: "Posici\xF3n financiera", assets: "Activos", liabilities: "Pasivos", equity: "Patrimonio", netIncome: "Resultado", journalActivity: "Actividad del diario", draftEntries: "Asientos borrador", postedEntries: "Asientos contabilizados", receivables: "Por cobrar (clientes deben)", payables: "Por pagar (debemos)", lowStock: "Productos en/bajo stock m\xEDnimo", pendingTimesheets: "Tarjetas por aprobar", quickActions: "Acciones r\xE1pidas", newPurchase: "Nueva compra", newSale: "Nueva venta", newEntry: "Nuevo asiento" }, admin: { title: "Admin", geminiUsage: "Uso de Gemini", since: "Desde", refresh: "Actualizar", rawJson: "Respuesta cruda" } }, ao = () => {
  return "es";
}, [at, no] = createSignal(ao()), [nt, ro] = createSignal({ en: {}, es: {} }), W = { get language() {
  return at();
}, get translations() {
  return nt();
}, setLanguage(t) {
  no(t);
}, setTranslations(t) {
  ro(t);
}, translate(t, e) {
  const a = at(), n = nt()[a];
  if (!n) return e || t;
  const r = t.split(".");
  let o = n;
  for (const s of r) if (o && typeof o == "object" && s in o) o = o[s];
  else return e || t;
  return typeof o == "string" ? o : e || t;
}, t(t, e) {
  return this.translate(t, e);
} }, oo = () => ({ t: W.translate.bind(W), language: W.language, setLanguage: W.setLanguage });
W.setTranslations({ en: eo, es: to });
var so = ["<div", ' class="md:hidden fixed inset-0 z-30 bg-black/30"></div>'], io = ["<div", ' class="space-y-0.5"><p class="px-3 pb-1 text-[11px] font-medium text-gray-500">', "</p><!--$-->", "<!--/--></div>"], co = ["<div", ' class="min-h-screen md:flex"><header class="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3"><button class="p-1.5 -ml-1.5 rounded-lg text-gray-600 hover:bg-gray-50"', ">", '</button><div class="w-7 h-7 rounded-lg bg-brand-600 text-white grid place-items-center font-semibold text-sm">H</div><span class="font-semibold text-gray-900">', "</span></header><!--$-->", '<!--/--><aside class="', '"><div class="px-4 py-5 flex items-center gap-2 border-b border-gray-100"><div class="w-8 h-8 rounded-lg bg-brand-600 text-white grid place-items-center font-semibold">H</div><span class="font-semibold text-gray-900">', '</span><button class="md:hidden ml-auto p-1.5 rounded-lg text-gray-500 hover:bg-gray-50"', ">", '</button></div><nav class="flex-1 px-2 py-3 space-y-4 overflow-y-auto"><!--$-->', "<!--/--><!--$-->", '<!--/--></nav><div class="px-4 py-3 border-t border-gray-100 space-y-2"><label class="flex items-center justify-between text-xs text-gray-500"><!--$-->', '<!--/--><select class="ml-2 border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-700 bg-white"', ">", '</select></label><button class="text-xs text-gray-500 hover:text-gray-700">', '</button><div class="flex items-center justify-between"><span class="text-xs text-gray-500 truncate">', '</span><button class="text-xs text-red-500 hover:text-red-700">', '</button></div></div></aside><main class="flex-1 min-w-0 p-4 md:p-6">', "</main></div>"], lo = ["<p", ' class="px-3 pb-1 text-[11px] font-medium text-gray-500">', "</p>"], uo = ["<div", ' class="space-y-0.5"><!--$-->', "<!--/--><!--$-->", "<!--/--></div>"], mo = ["<option", ">", "</option>"];
function po(t) {
  var _a2;
  const { t: e } = oo(), a = ke(), [n, r] = createSignal(false), o = () => a.pathname.startsWith("/timesheets"), s = [{ items: [{ href: "/", key: "nav.dashboard", fallback: "Dashboard", icon: qa }] }, { key: "nav.groups.accounting", fallback: "Accounting", items: [{ href: "/accounts", key: "nav.accounts", fallback: "Chart of Accounts", icon: Da }, { href: "/journal", key: "journal.title", fallback: "Journal", icon: Ha }, { href: "/reports", key: "nav.reports", fallback: "Reports", icon: Ja }] }, { key: "nav.groups.operations", fallback: "Operations", items: [{ href: "/providers", key: "providers.title", fallback: "Providers & Customers", icon: ln }, { href: "/inventory", key: "inventory.title", fallback: "Inventory", icon: Ga }, { href: "/transactions", key: "transactions.title", fallback: "Operations", icon: Xa }, { href: "/banking", key: "banking.title", fallback: "Bank Reconciliation", icon: Ba }] }, { key: "nav.groups.people", fallback: "People", items: [{ href: "/employees", key: "employees.title", fallback: "Employees", icon: on }] }], i = s.flatMap((c) => c.items);
  Xr(), createEffect(() => {
    var _a3;
    const c = a.pathname;
    r(false);
    const l = (_a3 = i.find((u) => u.href === "/" ? c === "/" : c.startsWith(u.href))) != null ? _a3 : o() ? i.find((u) => u.href === "/employees") : void 0;
    document.title = l ? `${e(l.key, l.fallback)} \xB7 HRMfinance` : "HRMfinance";
  });
  const d = (c) => createComponent(_e, { get href() {
    return c.item.href;
  }, get end() {
    return c.item.href === "/";
  }, get class() {
    return `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 ${c.item.href === "/employees" && o() ? "bg-brand-50 text-brand-700 font-medium" : ""}`;
  }, activeClass: "bg-brand-50 text-brand-700 font-medium", get children() {
    return [createComponent(c.item.icon, { size: 17, class: "shrink-0" }), e(c.item.key, c.item.fallback)];
  } });
  return ssr(co, ssrHydrationKey(), ssrAttribute("aria-label", escape(e("common.menu", "Menu"), true), false) + ssrAttribute("aria-expanded", escape(n(), true), false), escape(createComponent(Ua, { size: 20 })), escape(e("common.appName", "HRMfinance")), escape(createComponent(Show, { get when() {
    return n();
  }, get children() {
    return ssr(so, ssrHydrationKey());
  } })), `fixed md:static inset-y-0 left-0 z-40 w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col
          transform transition-transform md:translate-x-0 ${n() ? "translate-x-0" : "-translate-x-full"}`, escape(e("common.appName", "HRMfinance")), ssrAttribute("aria-label", escape(e("common.close", "Close"), true), false), escape(createComponent(mn, { size: 18 })), escape(createComponent(For, { each: s, children: (c) => ssr(uo, ssrHydrationKey(), escape(createComponent(Show, { get when() {
    return c.key;
  }, get children() {
    return ssr(lo, ssrHydrationKey(), escape(e(c.key, c.fallback)));
  } })), escape(createComponent(For, { get each() {
    return c.items;
  }, children: (l) => createComponent(d, { item: l }) }))) })), escape(createComponent(Show, { get when() {
    return _n();
  }, get children() {
    return ssr(io, ssrHydrationKey(), escape(e("nav.groups.admin", "Admin")), escape(createComponent(_e, { href: "/admin/gemini", end: true, class: "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900", activeClass: "bg-brand-50 text-brand-700 font-medium", get children() {
      return [createComponent(an, { size: 17, class: "shrink-0" }), e("admin.geminiUsage", "Gemini Usage")];
    } })));
  } })), escape(e("common.year", "Year")), ssrAttribute("value", escape(ve(), true), false), escape(createComponent(For, { get each() {
    return sr();
  }, children: (c) => ssr(mo, ssrHydrationKey() + ssrAttribute("value", escape(c, true), false), escape(c)) })), W.language === "es" ? "EN" : "ES", escape((_a2 = L()) == null ? void 0 : _a2.email), escape(e("common.signOut", "Sign out")), escape(t.children));
}
var fo = ["<svg", ' viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>'];
function ho(t) {
  var _a2;
  return ssr(fo, ssrHydrationKey() + ssrAttribute("class", escape(["animate-spin text-gray-400", (_a2 = t.class) != null ? _a2 : "w-5 h-5"].join(" "), true), false));
}
var yo = ["<div", ' class="min-h-screen grid place-items-center">', "</div>"];
function go(t) {
  const e = ke(), a = ra();
  onMount(() => {
    Un();
  });
  const n = () => e.pathname === "/login" || e.pathname === "/callback";
  return createEffect(() => {
    Ue() || (!Fe() && !n() ? a("/login", { replace: true }) : Fe() && e.pathname === "/login" && a("/", { replace: true }));
  }), createComponent(Show, { get when() {
    return !Ue();
  }, get fallback() {
    return ssr(yo, ssrHydrationKey(), escape(createComponent(ho, { class: "w-8 h-8" })));
  }, get children() {
    return createComponent(Show, { get when() {
      return !n();
    }, get fallback() {
      return createComponent(Suspense, { get children() {
        return t.children;
      } });
    }, get children() {
      return createComponent(po, { get children() {
        return createComponent(Suspense, { get children() {
          return t.children;
        } });
      } });
    } });
  } });
}
function zo() {
  return createComponent(wa, { root: go, get children() {
    return createComponent(au, {});
  } });
}

export { zo as default };
//# sourceMappingURL=app-CVwRZmoh.mjs.map
