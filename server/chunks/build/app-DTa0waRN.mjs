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

function je() {
  let e = /* @__PURE__ */ new Set();
  function t(a) {
    return e.add(a), () => e.delete(a);
  }
  let o = false;
  function n(a, r) {
    if (o) return !(o = false);
    const s = { to: a, options: r, defaultPrevented: false, preventDefault: () => s.defaultPrevented = true };
    for (const i of e) i.listener({ ...s, from: i.location, retry: (c) => {
      c && (o = true), i.navigate(a, { ...r, resolve: false });
    } });
    return !s.defaultPrevented;
  }
  return { subscribe: t, confirm: n };
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
  let o = false;
  return () => {
    const n = ie;
    me();
    const a = n == null ? null : ie - n;
    if (o) {
      o = false;
      return;
    }
    a && t(a) ? (o = true, window.history.go(-a)) : e();
  };
}
const vt = /^(?:[a-z0-9]+:)?\/\//i, bt = /^\/+|(\/)\/+$/g, Ue = "http://sr";
function N(e, t = false) {
  const o = e.replace(bt, "$1");
  return o ? t || /^[?#]/.test(o) ? o : "/" + o : "";
}
function Y(e, t, o) {
  if (vt.test(t)) return;
  const n = N(e), a = o && N(o);
  let r = "";
  return !a || t.startsWith("/") ? r = n : a.toLowerCase().indexOf(n.toLowerCase()) !== 0 ? r = n + a : r = a, (r || "/") + N(t, !r);
}
function At(e, t) {
  if (e == null) throw new Error(t);
  return e;
}
function wt(e, t) {
  return N(e).replace(/\/*(\*.*)?$/g, "") + N(t);
}
function Ve(e) {
  const t = {};
  return e.searchParams.forEach((o, n) => {
    n in t ? Array.isArray(t[n]) ? t[n].push(o) : t[n] = [t[n], o] : t[n] = o;
  }), t;
}
function St(e, t, o) {
  const [n, a] = e.split("/*", 2), r = n.split("/").filter(Boolean), s = r.length;
  return (i) => {
    const c = i.split("/").filter(Boolean), l = c.length - s;
    if (l < 0 || l > 0 && a === void 0 && !t) return null;
    const h = { path: s ? "" : "/", params: {} }, b = (f) => o === void 0 ? void 0 : o[f];
    for (let f = 0; f < s; f++) {
      const g = r[f], w = g[0] === ":", d = w ? c[f] : c[f].toLowerCase(), m = w ? g.slice(1) : g.toLowerCase();
      if (w && oe(d, b(m))) h.params[m] = d;
      else if (w || !oe(d, m)) return null;
      h.path += `/${d}`;
    }
    if (a) {
      const f = l ? c.slice(-l).join("/") : "";
      if (oe(f, b(a))) h.params[a] = f;
      else return null;
    }
    return h;
  };
}
function oe(e, t) {
  const o = (n) => n === e;
  return t === void 0 ? true : typeof t == "string" ? o(t) : typeof t == "function" ? t(e) : Array.isArray(t) ? t.some(o) : t instanceof RegExp ? t.test(e) : false;
}
function kt(e) {
  const [t, o] = e.pattern.split("/*", 2), n = t.split("/").filter(Boolean);
  return n.reduce((a, r) => a + (r.startsWith(":") ? 2 : 3), n.length - (o === void 0 ? 0 : 1));
}
function Fe(e) {
  const t = /* @__PURE__ */ new Map(), o = getOwner();
  return new Proxy({}, { get(n, a) {
    return t.has(a) || runWithOwner(o, () => t.set(a, createMemo(() => e()[a]))), t.get(a)();
  }, getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  }, ownKeys() {
    return Reflect.ownKeys(e());
  }, has(n, a) {
    return a in e();
  } });
}
function ze(e) {
  let t = /(\/?\:[^\/]+)\?/.exec(e);
  if (!t) return [e];
  let o = e.slice(0, t.index), n = e.slice(t.index + t[0].length);
  const a = [o, o += t[1]];
  for (; t = /^(\/\:[^\/]+)\?/.exec(n); ) a.push(o += t[1]), n = n.slice(t[0].length);
  return ze(n).reduce((r, s) => [...r, ...a.map((i) => i + s)], []);
}
const Ct = 100, $e = createContext(), pe = createContext(), ne = () => At(useContext($e), "<A> and 'use' router primitives can be only used inside a Route."), Pt = () => useContext(pe) || ne().base, Et = (e) => {
  const t = Pt();
  return createMemo(() => t.resolvePath(e()));
}, Rt = (e) => {
  const t = ne();
  return createMemo(() => {
    const o = e();
    return o !== void 0 ? t.renderPath(o) : o;
  });
}, xt = () => ne().navigatorFactory(), he = () => ne().location;
function Tt(e, t = "") {
  const { component: o, preload: n, load: a, children: r, info: s } = e, i = !r || Array.isArray(r) && !r.length, c = { key: e, component: o, preload: n || a, info: s };
  return He(e.path).reduce((l, h) => {
    for (const b of ze(h)) {
      const f = wt(t, b);
      let g = i ? f : f.split("/*", 1)[0];
      g = g.split("/").map((w) => w.startsWith(":") || w.startsWith("*") ? w : encodeURIComponent(w)).join("/"), l.push({ ...c, originalPath: h, pattern: g, matcher: St(g, !i, e.matchFilters) });
    }
    return l;
  }, []);
}
function Lt(e, t = 0) {
  return { routes: e, score: kt(e[e.length - 1]) * 1e4 - t, matcher(o) {
    const n = [];
    for (let a = e.length - 1; a >= 0; a--) {
      const r = e[a], s = r.matcher(o);
      if (!s) return null;
      n.unshift({ ...s, route: r });
    }
    return n;
  } };
}
function He(e) {
  return Array.isArray(e) ? e : [e];
}
function We(e, t = "", o = [], n = []) {
  const a = He(e);
  for (let r = 0, s = a.length; r < s; r++) {
    const i = a[r];
    if (i && typeof i == "object") {
      i.hasOwnProperty("path") || (i.path = "");
      const c = Tt(i, t);
      for (const l of c) {
        o.push(l);
        const h = Array.isArray(i.children) && i.children.length === 0;
        if (i.children && !h) We(i.children, l.pattern, o, n);
        else {
          const b = Lt([...o], n.length);
          n.push(b);
        }
        o.pop();
      }
    }
  }
  return o.length ? n : n.sort((r, s) => s.score - r.score);
}
function $(e, t) {
  for (let o = 0, n = e.length; o < n; o++) {
    const a = e[o].matcher(t);
    if (a) return a;
  }
  return [];
}
function It(e, t, o) {
  const n = new URL(Ue), a = createMemo((h) => {
    const b = e();
    try {
      return new URL(b, n);
    } catch {
      return console.error(`Invalid path ${b}`), h;
    }
  }, n, { equals: (h, b) => h.href === b.href }), r = createMemo(() => a().pathname), s = createMemo(() => a().search, true), i = createMemo(() => a().hash), c = () => "", l = on$1(s, () => Ve(a()));
  return { get pathname() {
    return r();
  }, get search() {
    return s();
  }, get hash() {
    return i();
  }, get state() {
    return t();
  }, get key() {
    return c();
  }, query: o ? o(l) : Fe(l) };
}
let I;
function Nt() {
  return I;
}
function Dt(e, t, o, n = {}) {
  const { signal: [a, r], utils: s = {} } = e, i = s.parsePath || ((p) => p), c = s.renderPath || ((p) => p), l = s.beforeLeave || je(), h = Y("", n.base || "");
  if (h === void 0) throw new Error(`${h} is not a valid base path`);
  h && !a().value && r({ value: h, replace: true, scroll: false });
  const [b, f] = createSignal(false);
  let g;
  const w = (p, y) => {
    y.value === d() && y.state === A() || (g === void 0 && f(true), I = p, g = y, startTransition(() => {
      g === y && (m(g.value), v(g.state), resetErrorBoundaries(), isServer || L[1]((k) => k.filter((D) => D.pending)));
    }).finally(() => {
      g === y && batch(() => {
        I = void 0, p === "navigate" && et(g), f(false), g = void 0;
      });
    }));
  }, [d, m] = createSignal(a().value), [A, v] = createSignal(a().state), T = It(d, A, s.queryWrapper), R = [], L = createSignal(isServer ? nt() : []), F = createMemo(() => typeof n.transformUrl == "function" ? $(t(), n.transformUrl(T.pathname)) : $(t(), T.pathname)), we = () => {
    const p = F(), y = {};
    for (let k = 0; k < p.length; k++) Object.assign(y, p[k].params);
    return y;
  }, Qe = s.paramsWrapper ? s.paramsWrapper(we, t) : Fe(we), Se = { pattern: h, path: () => h, outlet: () => null, resolvePath(p) {
    return Y(h, p);
  } };
  return createRenderEffect(on$1(a, (p) => w("native", p), { defer: true })), { base: Se, location: T, params: Qe, isRouting: b, renderPath: c, parsePath: i, navigatorFactory: Xe, matches: F, beforeLeave: l, preloadRoute: tt, singleFlight: n.singleFlight === void 0 ? true : n.singleFlight, submissions: L };
  function Ze(p, y, k) {
    untrack(() => {
      if (typeof y == "number") {
        y && (s.go ? s.go(y) : console.warn("Router integration does not support relative routing"));
        return;
      }
      const D = !y || y[0] === "?", { replace: G, resolve: M, scroll: J, state: B } = { replace: false, resolve: !D, scroll: true, ...k }, _ = M ? p.resolvePath(y) : Y(D && T.pathname || "", y);
      if (_ === void 0) throw new Error(`Path '${y}' is not a routable path`);
      if (R.length >= Ct) throw new Error("Too many redirects");
      const ke = d();
      if (_ !== ke || B !== A()) if (isServer) {
        const Ce = getRequestEvent();
        Ce && (Ce.response = { status: 302, headers: new Headers({ Location: _ }) }), r({ value: _, replace: G, scroll: J, state: B });
      } else l.confirm(_, k) && (R.push({ value: ke, replace: G, scroll: J, state: A() }), w("navigate", { value: _, state: B }));
    });
  }
  function Xe(p) {
    return p = p || useContext(pe) || Se, (y, k) => Ze(p, y, k);
  }
  function et(p) {
    const y = R[0];
    y && (r({ ...p, replace: y.replace, scroll: y.scroll }), R.length = 0);
  }
  function tt(p, y) {
    const k = $(t(), p.pathname), D = I;
    I = "preload";
    for (let G in k) {
      const { route: M, params: J } = k[G];
      M.component && M.component.preload && M.component.preload();
      const { preload: B } = M;
      y && B && runWithOwner(o(), () => B({ params: J, location: { pathname: p.pathname, search: p.search, hash: p.hash, query: Ve(p), state: null, key: "" }, intent: "preload" }));
    }
    I = D;
  }
  function nt() {
    const p = getRequestEvent();
    return p && p.router && p.router.submission ? [p.router.submission] : [];
  }
}
function Mt(e, t, o, n) {
  const { base: a, location: r, params: s } = e, { pattern: i, component: c, preload: l } = n().route, h = createMemo(() => n().path);
  c && c.preload && c.preload();
  const b = l ? l({ params: s, location: r, intent: I || "initial" }) : void 0;
  return { parent: t, pattern: i, path: h, outlet: () => c ? createComponent$1(c, { params: s, location: r, data: b, get children() {
    return o();
  } }) : o(), resolvePath(g) {
    return Y(a.path(), g, h());
  } };
}
const Ge = (e) => (t) => {
  const { base: o } = t, n = children(() => t.children), a = createMemo(() => We(n(), t.base || ""));
  let r;
  const s = Dt(e, a, () => r, { base: o, singleFlight: t.singleFlight, transformUrl: t.transformUrl });
  return e.create && e.create(s), createComponent($e.Provider, { value: s, get children() {
    return createComponent(Bt, { routerState: s, get root() {
      return t.root;
    }, get preload() {
      return t.rootPreload || t.rootLoad;
    }, get children() {
      return [(r = getOwner()) && null, createComponent(_t, { routerState: s, get branches() {
        return a();
      } })];
    } });
  } });
};
function Bt(e) {
  const t = e.routerState.location, o = e.routerState.params, n = createMemo(() => e.preload && untrack(() => {
    e.preload({ params: o, location: t, intent: Nt() || "initial" });
  }));
  return createComponent(Show, { get when() {
    return e.root;
  }, keyed: true, get fallback() {
    return e.children;
  }, children: (a) => createComponent(a, { params: o, location: t, get data() {
    return n();
  }, get children() {
    return e.children;
  } }) });
}
function _t(e) {
  if (isServer) {
    const a = getRequestEvent();
    if (a && a.router && a.router.dataOnly) {
      qt(a, e.routerState, e.branches);
      return;
    }
    a && ((a.router || (a.router = {})).matches || (a.router.matches = e.routerState.matches().map(({ route: r, path: s, params: i }) => ({ path: r.originalPath, pattern: r.pattern, match: s, params: i, info: r.info }))));
  }
  const t = [];
  let o;
  const n = createMemo(on$1(e.routerState.matches, (a, r, s) => {
    let i = r && a.length === r.length;
    const c = [];
    for (let l = 0, h = a.length; l < h; l++) {
      const b = r && r[l], f = a[l];
      s && b && f.route.key === b.route.key ? c[l] = s[l] : (i = false, t[l] && t[l](), createRoot((g) => {
        t[l] = g, c[l] = Mt(e.routerState, c[l - 1] || e.routerState.base, Ee(() => n()[l + 1]), () => {
          var _a;
          const w = e.routerState.matches();
          return (_a = w[l]) != null ? _a : w[0];
        });
      }));
    }
    return t.splice(a.length).forEach((l) => l()), s && i ? s : (o = c[0], c);
  }));
  return Ee(() => n() && o)();
}
const Ee = (e) => () => createComponent(Show, { get when() {
  return e();
}, keyed: true, children: (t) => createComponent(pe.Provider, { value: t, get children() {
  return t.outlet();
} }) });
function qt(e, t, o) {
  const n = new URL(e.request.url), a = $(o, new URL(e.router.previousUrl || e.request.url).pathname), r = $(o, n.pathname);
  for (let s = 0; s < r.length; s++) {
    (!a[s] || r[s].route !== a[s].route) && (e.router.dataOnly = true);
    const { route: i, params: c } = r[s];
    i.preload && i.preload({ params: c, location: t.location, intent: "preload" });
  }
}
function Ot([e, t], o, n) {
  return [e, n ? (a) => t(n(a)) : t];
}
function jt(e) {
  let t = false;
  const o = (a) => typeof a == "string" ? { value: a } : a, n = Ot(createSignal(o(e.get()), { equals: (a, r) => a.value === r.value && a.state === r.state }), void 0, (a) => (!t && e.set(a), sharedConfig.registry && !sharedConfig.done && (sharedConfig.done = true), a));
  return e.init && onCleanup(e.init((a = e.get()) => {
    t = true, n[1](o(a)), t = false;
  })), Ge({ signal: n, create: e.create, utils: e.utils });
}
function Ut(e, t, o) {
  return e.addEventListener(t, o), () => e.removeEventListener(t, o);
}
function Vt(e, t) {
  const o = e && document.getElementById(e);
  o ? o.scrollIntoView() : t && window.scrollTo(0, 0);
}
function Ft(e) {
  const t = new URL(e);
  return t.pathname + t.search;
}
function zt(e) {
  let t;
  const o = { value: e.url || (t = getRequestEvent()) && Ft(t.request.url) || "" };
  return Ge({ signal: [() => o, (n) => Object.assign(o, n)] })(e);
}
const $t = /* @__PURE__ */ new Map();
function Ht(e = true, t = false, o = "/_server", n) {
  return (a) => {
    const r = a.base.path(), s = a.navigatorFactory(a.base);
    let i, c;
    function l(d) {
      return d.namespaceURI === "http://www.w3.org/2000/svg";
    }
    function h(d) {
      if (d.defaultPrevented || d.button !== 0 || d.metaKey || d.altKey || d.ctrlKey || d.shiftKey) return;
      const m = d.composedPath().find((F) => F instanceof Node && F.nodeName.toUpperCase() === "A");
      if (!m || t && !m.hasAttribute("link")) return;
      const A = l(m), v = A ? m.href.baseVal : m.href;
      if ((A ? m.target.baseVal : m.target) || !v && !m.hasAttribute("state")) return;
      const R = (m.getAttribute("rel") || "").split(/\s+/);
      if (m.hasAttribute("download") || R && R.includes("external")) return;
      const L = A ? new URL(v, document.baseURI) : new URL(v);
      if (!(L.origin !== window.location.origin || r && L.pathname && !L.pathname.toLowerCase().startsWith(r.toLowerCase()))) return [m, L];
    }
    function b(d) {
      const m = h(d);
      if (!m) return;
      const [A, v] = m, T = a.parsePath(v.pathname + v.search + v.hash), R = A.getAttribute("state");
      d.preventDefault(), s(T, { resolve: false, replace: A.hasAttribute("replace"), scroll: !A.hasAttribute("noscroll"), state: R ? JSON.parse(R) : void 0 });
    }
    function f(d) {
      const m = h(d);
      if (!m) return;
      const [A, v] = m;
      n && (v.pathname = n(v.pathname)), a.preloadRoute(v, A.getAttribute("preload") !== "false");
    }
    function g(d) {
      clearTimeout(i);
      const m = h(d);
      if (!m) return c = null;
      const [A, v] = m;
      c !== A && (n && (v.pathname = n(v.pathname)), i = setTimeout(() => {
        a.preloadRoute(v, A.getAttribute("preload") !== "false"), c = A;
      }, 20));
    }
    function w(d) {
      if (d.defaultPrevented) return;
      let m = d.submitter && d.submitter.hasAttribute("formaction") ? d.submitter.getAttribute("formaction") : d.target.getAttribute("action");
      if (!m) return;
      if (!m.startsWith("https://action/")) {
        const v = new URL(m, Ue);
        if (m = a.parsePath(v.pathname + v.search), !m.startsWith(o)) return;
      }
      if (d.target.method.toUpperCase() !== "POST") throw new Error("Only POST forms are supported for Actions");
      const A = $t.get(m);
      if (A) {
        d.preventDefault();
        const v = new FormData(d.target, d.submitter);
        A.call({ r: a, f: d.target }, d.target.enctype === "multipart/form-data" ? v : new URLSearchParams(v));
      }
    }
    delegateEvents(["click", "submit"]), document.addEventListener("click", b), e && (document.addEventListener("mousemove", g, { passive: true }), document.addEventListener("focusin", f, { passive: true }), document.addEventListener("touchstart", f, { passive: true })), document.addEventListener("submit", w), onCleanup(() => {
      document.removeEventListener("click", b), e && (document.removeEventListener("mousemove", g), document.removeEventListener("focusin", f), document.removeEventListener("touchstart", f)), document.removeEventListener("submit", w);
    });
  };
}
function Wt(e) {
  if (isServer) return zt(e);
  const t = () => {
    const n = window.location.pathname.replace(/^\/+/, "/") + window.location.search, a = window.history.state && window.history.state._depth && Object.keys(window.history.state).length === 1 ? void 0 : window.history.state;
    return { value: n + window.location.hash, state: a };
  }, o = je();
  return jt({ get: t, set({ value: n, replace: a, scroll: r, state: s }) {
    a ? window.history.replaceState(yt(s), "", n) : window.history.pushState(s, "", n), Vt(decodeURIComponent(window.location.hash.slice(1)), r), me();
  }, init: (n) => Ut(window, "popstate", gt(n, (a) => {
    if (a) return !o.confirm(a);
    {
      const r = t();
      return !o.confirm(r.value, { state: r.state });
    }
  })), create: Ht(e.preload, e.explicitLinks, e.actionBase, e.transformUrl), utils: { go: (n) => window.history.go(n), beforeLeave: o } })(e);
}
function Re(e) {
  e = mergeProps$1({ inactiveClass: "inactive", activeClass: "active" }, e);
  const [, t] = splitProps(e, ["href", "state", "class", "activeClass", "inactiveClass", "end"]), o = Et(() => e.href), n = Rt(o), a = he(), r = createMemo(() => {
    const s = o();
    if (s === void 0) return [false, false];
    const i = N(s.split(/[?#]/, 1)[0]).toLowerCase(), c = decodeURI(N(a.pathname).toLowerCase());
    return [e.end ? i === c : c.startsWith(i + "/") || c === i, i === c];
  });
  return ssrElement("a", mergeProps(t, { get href() {
    return n() || e.href;
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
var Gt = { xmlns: "http://www.w3.org/2000/svg", width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, q = Gt, Jt = createContext({ size: 24, color: "currentColor", strokeWidth: 2, absoluteStrokeWidth: false, class: "" }), Kt = (e) => {
  for (const t in e) if (t.startsWith("aria-") || t === "role" || t === "title") return true;
  return false;
}, Yt = (...e) => e.filter((t, o, n) => !!t && t.trim() !== "" && n.indexOf(t) === o).join(" ").trim(), Qt = (e) => e.replace(/^([A-Z])|[\s-_]+(\w)/g, (t, o, n) => n ? n.toUpperCase() : o.toLowerCase()), xe = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), Zt = (e) => {
  const t = Qt(e);
  return t.charAt(0).toUpperCase() + t.slice(1);
}, Xt = (e) => {
  const [t, o] = splitProps(e, ["color", "size", "strokeWidth", "children", "class", "name", "iconNode", "absoluteStrokeWidth"]), n = useContext(Jt);
  return ssrElement("svg", mergeProps(q, { get width() {
    var _a, _b;
    return (_b = (_a = t.size) != null ? _a : n.size) != null ? _b : q.width;
  }, get height() {
    var _a, _b;
    return (_b = (_a = t.size) != null ? _a : n.size) != null ? _b : q.height;
  }, get stroke() {
    var _a, _b;
    return (_b = (_a = t.color) != null ? _a : n.color) != null ? _b : q.stroke;
  }, get "stroke-width"() {
    var _a, _b, _c, _d, _e2, _f;
    return ((_a = t.absoluteStrokeWidth) != null ? _a : n.absoluteStrokeWidth) === true ? Number((_c = (_b = t.strokeWidth) != null ? _b : n.strokeWidth) != null ? _c : q["stroke-width"]) * 24 / Number((_d = t.size) != null ? _d : n.size) : Number((_f = (_e2 = t.strokeWidth) != null ? _e2 : n.strokeWidth) != null ? _f : q["stroke-width"]);
  }, get class() {
    return Yt("lucide", "lucide-icon", n.class, ...t.name != null ? [`lucide-${xe(Zt(t.name))}`, `lucide-${xe(t.name)}`] : [], t.class);
  }, get "aria-hidden"() {
    return !t.children && !Kt(o) ? "true" : void 0;
  } }, o), () => escape(createComponent(For, { get each() {
    return t.iconNode;
  }, children: ([a, r]) => createComponent(Dynamic, mergeProps({ component: a }, r)) })), true);
}, x = Xt, en = [["path", { d: "M12 7v14", key: "1akyts" }], ["path", { d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z", key: "ruj8y" }]], tn = (e) => createComponent(x, mergeProps(e, { iconNode: en, name: "book-open" })), nn = tn, an = [["path", { d: "M10 18v-7", key: "wt116b" }], ["path", { d: "M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z", key: "yxxwt6" }], ["path", { d: "M14 18v-7", key: "vav6t3" }], ["path", { d: "M18 18v-7", key: "aexdmj" }], ["path", { d: "M3 22h18", key: "8prr45" }], ["path", { d: "M6 18v-7", key: "1ivflk" }]], on = (e) => createComponent(x, mergeProps(e, { iconNode: an, name: "landmark" })), rn = on, sn = [["rect", { width: "7", height: "9", x: "3", y: "3", rx: "1", key: "10lvy0" }], ["rect", { width: "7", height: "5", x: "14", y: "3", rx: "1", key: "16une8" }], ["rect", { width: "7", height: "9", x: "14", y: "12", rx: "1", key: "1hutg5" }], ["rect", { width: "7", height: "5", x: "3", y: "16", rx: "1", key: "ldoo1y" }]], cn = (e) => createComponent(x, mergeProps(e, { iconNode: sn, name: "layout-dashboard" })), ln = cn, dn = [["path", { d: "M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4", key: "re6nr2" }], ["path", { d: "M2 6h4", key: "aawbzj" }], ["path", { d: "M2 10h4", key: "l0bgd4" }], ["path", { d: "M2 14h4", key: "1gsvsf" }], ["path", { d: "M2 18h4", key: "1bu2t1" }], ["path", { d: "M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z", key: "pqwjuv" }]], un = (e) => createComponent(x, mergeProps(e, { iconNode: dn, name: "notebook-pen" })), mn = un, pn = [["path", { d: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z", key: "1a0edw" }], ["path", { d: "M12 22V12", key: "d0xqtd" }], ["polyline", { points: "3.29 7 12 12 20.71 7", key: "ousv84" }], ["path", { d: "m7.5 4.27 9 5.15", key: "1c824w" }]], hn = (e) => createComponent(x, mergeProps(e, { iconNode: pn, name: "package" })), fn = hn, yn = [["path", { d: "M12 3v18", key: "108xh3" }], ["path", { d: "m19 8 3 8a5 5 0 0 1-6 0zV7", key: "zcdpyk" }], ["path", { d: "M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1", key: "1yorad" }], ["path", { d: "m5 8 3 8a5 5 0 0 1-6 0zV7", key: "eua70x" }], ["path", { d: "M7 21h10", key: "1b0cd5" }]], gn = (e) => createComponent(x, mergeProps(e, { iconNode: yn, name: "scale" })), vn = gn, bn = [["circle", { cx: "8", cy: "21", r: "1", key: "jimo8o" }], ["circle", { cx: "19", cy: "21", r: "1", key: "13723u" }], ["path", { d: "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12", key: "9zh506" }]], An = (e) => createComponent(x, mergeProps(e, { iconNode: bn, name: "shopping-cart" })), wn = An, Sn = [["path", { d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z", key: "1s2grr" }], ["path", { d: "M20 2v4", key: "1rf3ol" }], ["path", { d: "M22 4h-4", key: "gwowj6" }], ["circle", { cx: "4", cy: "20", r: "2", key: "6kqj1y" }]], kn = (e) => createComponent(x, mergeProps(e, { iconNode: Sn, name: "sparkles" })), Cn = kn, Pn = [["circle", { cx: "12", cy: "8", r: "5", key: "1hypcn" }], ["path", { d: "M20 21a8 8 0 0 0-16 0", key: "rfgkzh" }]], En = (e) => createComponent(x, mergeProps(e, { iconNode: Pn, name: "user-round" })), Rn = En, xn = [["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }], ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744", key: "16gr8j" }], ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }], ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]], Tn = (e) => createComponent(x, mergeProps(e, { iconNode: xn, name: "users" })), Ln = Tn;
const In = { VITE_APP_ID: "hrm", VITE_AUTH_BASE: "https://ssgloghr.com", VITE_IDSVC_URL: "https://ssgloghr.com/idsvc", VITE_SSO_CLIENT_ID: "subpay" }, K = In || {};
let ce = { authBase: K.VITE_AUTH_BASE || "", idsvcUrl: K.VITE_IDSVC_URL || "", appId: K.VITE_APP_ID || "", clientId: K.VITE_SSO_CLIENT_ID || "", perms: {}, callbackPath: "/callback" };
function Nn(e) {
  ce = { ...ce, ...e };
}
function W() {
  return ce;
}
const Dn = () => W().idsvcUrl, fe = () => W().appId, ye = () => `idsvc_refresh_${fe()}`;
let U = null;
const Je = () => localStorage.getItem(ye()), Mn = (e) => {
  U = e.access, localStorage.setItem(ye(), e.refresh);
}, Bn = () => {
  U = null, localStorage.removeItem(ye());
}, _n = () => !!Je();
async function qn(e, t) {
  const o = await fetch(`${Dn()}${e}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(t) }), n = await o.json().catch(() => ({}));
  if (!o.ok) throw Object.assign(new Error(n.error || `HTTP ${o.status}`), { status: o.status });
  return n && typeof n == "object" && n.data !== void 0 ? n.data : n;
}
let z = null;
async function On() {
  return z || (z = (async () => {
    const e = Je();
    if (!e) return false;
    try {
      const t = await qn("/auth/refresh", { refresh: e, app: fe() });
      return Mn(t), true;
    } catch (t) {
      return ((t == null ? void 0 : t.status) === 401 || (t == null ? void 0 : t.status) === 400) && Bn(), false;
    } finally {
      z = null;
    }
  })(), z);
}
function ge() {
  if (!U) return null;
  try {
    return JSON.parse(atob(U.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}
function jn() {
  var _a, _b;
  const e = ge();
  return e ? e.superadmin ? ["superadmin"] : ((_b = (_a = e.apps) == null ? void 0 : _a[fe()]) == null ? void 0 : _b.roles) || [] : [];
}
function Un() {
  const e = ge();
  return !e || e.exp * 1e3 - Date.now() < 6e4;
}
async function Vn() {
  return (!U || Un()) && await On(), U;
}
function Q(e) {
  if (typeof e == "boolean") return e;
  if (typeof e == "number") return e === 1;
  if (typeof e == "string") {
    const t = e.trim().toLowerCase();
    return t === "true" || t === "1" || t === "yes";
  }
  return false;
}
function Fn(e, t) {
  var _a;
  if (e.some((n) => n === "admin" || n === "superadmin")) return /* @__PURE__ */ new Set(["*"]);
  const o = /* @__PURE__ */ new Set();
  for (const n of e) for (const a of (_a = t[n]) != null ? _a : []) o.add(a);
  return o;
}
const ve = "ops_user", le = /* @__PURE__ */ new Set();
function Ke() {
  for (const e of le) e();
}
function zn(e) {
  return le.add(e), () => le.delete(e);
}
const $n = () => {
  try {
    return JSON.parse(localStorage.getItem(ve) || "null");
  } catch {
    return null;
  }
};
let V = $n(), Hn = false, Wn = null;
const Gn = () => V, Ye = () => ({ user: V, loading: Hn, error: Wn });
function Jn(e) {
  e && localStorage.setItem(ve, JSON.stringify(e)), V = e, Ke();
}
function Kn() {
  var _a;
  const e = ge();
  if (!e) return false;
  const t = W().appId, n = (((_a = e.apps) == null ? void 0 : _a[t]) || Object.values(e.apps || {})[0] || {}).scope || {}, a = n.flags || {}, r = { id: e.sub, uid: e.uid, originalUserId: e.sub, googleUid: e.sub, name: e.name || "", email: e.email || (V == null ? void 0 : V.email) || "", businessId: n.businessId || "", permissions: { ...a, isAdmin: !!e.superadmin || Q(a.isAdmin) }, superadmin: !!e.superadmin, apps: e.apps };
  return Jn(r), true;
}
async function Yn() {
  return _n() ? navigator.onLine ? await Vn() ? (Kn(), true) : (localStorage.removeItem(ve), V = null, Ke(), false) : !!V : false;
}
function Qn(e) {
  var _a, _b, _c;
  if (!e) {
    const n = jn();
    if (n.length) return n;
  }
  const t = e != null ? e : Gn();
  if (!t) return [];
  if (Q(t.superadmin) || Q((_a = t.permissions) == null ? void 0 : _a.isAdmin) || Q(t.isAdmin)) return ["admin"];
  const o = (_c = (_b = t.apps) == null ? void 0 : _b[W().appId]) == null ? void 0 : _c.roles;
  return Array.isArray(o) ? o : [];
}
function Zn(e) {
  return Fn(Qn(e), W().perms);
}
const Xn = (e) => Zn(e).has("*"), be = Ye(), [Ae, ea] = createSignal(be.user), [Ta, ta] = createSignal(be.loading), [La, na] = createSignal(be.error);
zn(() => {
  const e = Ye();
  ea(e.user), ta(e.loading), na(e.error);
});
Nn({ authBase: "https://ssgloghr.com", idsvcUrl: "https://ssgloghr.com/idsvc", appId: "hrm", clientId: "subpay", perms: { admin: ["*"] } });
const [Te, aa] = createSignal(true), Le = () => !!Ae(), oa = () => Xn(Ae());
async function ra() {
  try {
    await Yn();
  } finally {
    aa(false);
  }
}
const sa = "hrmfinance-year";
function ia() {
  if (typeof localStorage < "u") {
    const e = Number(localStorage.getItem(sa));
    if (e >= 2e3 && e <= 2100) return e;
  }
  return (/* @__PURE__ */ new Date()).getFullYear();
}
const [ca, Ia] = createSignal(ia());
function la(e = 6) {
  const t = (/* @__PURE__ */ new Date()).getFullYear();
  return Array.from({ length: e }, (o, n) => t - n);
}
const da = { common: { appName: "HRMfinance", loading: "Loading\u2026", save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit", add: "Add", search: "Search", actions: "Actions", error: "Something went wrong", confirmDelete: "Are you sure you want to delete this?", noResults: "No results", total: "Total", year: "Year", export: "Export CSV", signOut: "Sign out", close: "Close" }, nav: { dashboard: "Dashboard", accounts: "Chart of Accounts", reports: "Reports", trialBalance: "Trial Balance", balanceSheet: "Balance Sheet", incomeStatement: "Income Statement" }, login: { title: "HRMfinance", subtitle: "Sign in to continue", signingIn: "Signing in\u2026", failed: "Login failed", sso: "Sign in with SSO", backToLogin: "Back to login", invalidSession: "Authentication succeeded but session is invalid." }, accounts: { title: "Chart of Accounts", addAccount: "Add account", addSubAccount: "Add sub-account", editAccount: "Edit account", accountNumber: "Account number", name: "Name", type: "Type", category: "Category", description: "Description", parentAccount: "Parent account", balance: "Balance", active: "Active", inactive: "Inactive", bankAccount: "Bank account", bankName: "Bank name", bankAccountNumber: "Bank account number", bankAccountType: "Bank account type", piggybank: "Cash collection account", piggybankLabel: "Cash account label", chequesEnTransito: "Outstanding checks account", flatView: "Flat", treeView: "Tree", allTypes: "All types", cannotDelete: "This account has sub-accounts or transactions and cannot be deleted.", types: { Asset: "Asset", Liability: "Liability", Equity: "Equity", Revenue: "Revenue", Expense: "Expense" }, ledger: "Ledger", date: "Date", reference: "Reference", debit: "Debit", credit: "Credit", noTransactions: "No transactions for this year", noMatches: "No transactions match the filters", allAccounts: "All accounts", backToAccounts: "Back to chart of accounts" }, reports: { trialBalance: "Trial Balance", balanceSheet: "Balance Sheet", account: "Account", totals: "Totals", balanced: "Balanced", outOfBalance: "Out of balance", assets: "Assets", liabilities: "Liabilities", equity: "Equity", netIncome: "Net income (Revenue \u2212 Expenses)", totalAssets: "Total assets", totalLiabilitiesEquity: "Total liabilities + equity", incomeStatement: "Income Statement", revenue: "Revenue", expenses: "Expenses", netIncomeTotal: "Net income", margin: "Margin", audit: { run: "Audit difference", title: "Discrepancy audit", empty: "No suspicious entries found", score: "Risk", hints: { transposition: "The discrepancy is divisible by 9 \u2014 possible transposed digits (e.g. 54 entered as 45)", wrongSide: "An entry for half the discrepancy exists \u2014 an amount may be posted to the wrong side" }, reasons: { title: "Signals", imbalance: "Entry is internally out of balance", exactMatch: "Its internal imbalance equals the discrepancy", amountMatch: "Its total equals the discrepancy", lineMatch: "A line equals the discrepancy", halfMatch: "Its total is half the discrepancy (wrong side)", rounding: "Amounts carry rounding residue", duplicate: "Possible duplicate (same date and amount)", draft: "Draft entry \u2014 post it or exclude it" } } }, journal: { title: "Journal", newEntry: "New entry", entryNumber: "Entry #", date: "Date", description: "Description", reference: "Reference", debits: "Debits", credits: "Credits", status: "Status", lines: "Lines", line: "Line", account: "Account", debit: "Debit", credit: "Credit", addLine: "Add line", removeLine: "Remove line", balanced: "Balanced", difference: "Difference", post: "Post", void: "Void", viewEntry: "View entry", referenceId: "Entity (referenceId)", postedAt: "Posted at", createdBy: "Created by", allStatuses: "All statuses", noEntries: "No journal entries for this year", confirmPost: "Post this entry? Posted entries cannot be edited.", confirmVoid: "Void this entry?", statuses: { draft: "Draft", posted: "Posted", void: "Void" }, errors: { dateRequired: "Date is required", descriptionRequired: "Description is required", linesRequired: "At least one line is required", lineAccount: "Line {n}: account is required", lineAmount: "Line {n}: a debit or credit amount is required", lineBothSides: "Line {n}: cannot have both debit and credit", notBalanced: "Entry is not balanced \u2014 debits must equal credits", deletePosted: "Posted entries cannot be deleted. Void them instead.", notFound: "Journal entry not found" } }, templates: { title: "Templates", launch: "Use template", manage: "Manage templates", newTemplate: "New template", editTemplate: "Edit template", noTemplates: "No templates yet", category: "Category", fields: "Fields", lineRules: "Line rules", settings: "Settings", preview: "Preview", generate: "Create entry", usageCount: "Used {n} times", dynamicAccount: "Dynamic account (expression)", connectors: "Connectors", connector: { provider: "Provider", customer: "Customer", employee: "Employee" }, connectorInfoTitle: "Connectors: providers, customers and employees", connectorInfoBody: "When running the template you can pick a provider, customer and/or employee. Their real fields become variables usable anywhere in this template \u2014 default description, reference format, amount expressions, dynamic account, referenceId \u2014 and text fields whose name mentions the entity are auto-filled.", connectorRateHint: "rate = effective hourly rate", connectorInfoExample: `Example: a line rule with dynamic account "{provider.relatedAccountId}", referenceId "{provider.id}" and amount "{monto}" debits the picked provider's AP account; a payroll amount can be "{horas} * {employee.rate}".`, connectorVars: "Variables: {provider.name}, {provider.relatedAccountId}, {customer.name}, {customer.relatedAccountId}, {employee.name}, {employee.rate}\u2026", connectorHint: "Connectors expose the entity's real fields: {provider.name}, {provider.id}, {provider.relatedAccountId}, {customer.taxId}, {employee.rate}\u2026", active: "Active", inactive: "Inactive", errors: { fieldRequired: "{0} is required", accountNotFound: "Account not found: {0}", badAmount: "Invalid amount on line: {0}", minLines: "Template must produce at least 2 lines", notBalanced: "Generated entry is not balanced" } }, providers: { title: "Providers & Customers", newEntity: "New entity", editEntity: "Edit entity", name: "Name", type: "Type", email: "Email", phone: "Phone", address: "Address", taxId: "Tax ID", contactPerson: "Contact person", notes: "Notes", balance: "Balance", relatedAccount: "Related account (AP/AR)", active: "Active", inactive: "Inactive", allTypes: "All", noEntities: "No providers or customers yet", recordPayment: "Record payment", recordCollection: "Record collection", amount: "Amount", paymentMethod: "Payment method", date: "Date", reference: "Reference", description: "Description", weOwe: "We owe", theyOwe: "They owe", settled: "Settled", types: { customer: "Customer", provider: "Provider", both: "Both" }, methods: { cash: "Cash", check: "Check", transfer: "Transfer", zelle: "Zelle", credit_card: "Credit card", other: "Other" }, document: "Document", viewDocuments: "Documents", noDocuments: "No documents this year", pendingDocs: "Pending documents", cashAccount: "Cash/bank account", tabs: { all: "All", pending: "Pending", settled: "Settled" }, advance: "Advance", openEntry: "Open journal entry", advanceAccount: "Advance account (anticipos)", applyAdvance: "Apply advance", accountsPayable: "Accounts payable", accountsReceivable: "Accounts receivable", multiPayment: "Batch payment", multiCollection: "Batch collection", cashMovement: "Cash movement", addAdvanceFor: "Add advance (anticipo) for\u2026", newAdvance: "NEW ADVANCE", applyToAR: "Apply to receivable (no cash)", applyToAP: "Apply to payable (no cash)", errors: { notFound: "Entity not found", noRelatedAccount: "This entity has no AP/AR account linked \u2014 edit it and pick a related account first", noAdvanceAccount: "This entity has no advance account \u2014 edit it and pick one", cashAccountRequired: "Select the cash/bank account", amountRequired: "Enter an amount or select pending documents" } }, inventory: { title: "Inventory", products: "Products", movements: "Movements", stock: "Stock", newProduct: "New product", editProduct: "Edit product", name: "Name", sku: "SKU", upc: "UPC", code: "Code", category: "Category", description: "Description", unitOfMeasure: "Unit", unitCost: "Unit cost", sellingPrice: "Selling price", minStock: "Min stock", maxStock: "Max stock", active: "Active", inactive: "Inactive", noProducts: "No products yet", location: "Location", fromLocation: "From location", toLocation: "To location", quantity: "Quantity", reference: "Reference", notes: "Notes", newMovement: "New movement", movementType: "Movement type", product: "Product", noMovements: "No movements", lowStock: "Low stock", date: "Date", type: "Type", allLocations: "All locations", types: { in: "Stock in", out: "Stock out", adjustment: "Adjustment", transfer: "Transfer" } }, transactions: { title: "Operations", compras: "Purchases", facturacion: "Sales", mermas: "Shrinkage", date: "Date", description: "Description", reference: "Reference", provider: "Provider", customer: "Customer", product: "Product", qty: "Qty", unitCost: "Unit cost", unitPrice: "Unit price", subtotal: "Subtotal", addLine: "Add line", serviceLines: "Services", serviceName: "Service", expenseAccount: "Expense account", paymentMode: "Payment mode", cash: "Cash", bank: "Bank", credit: "Credit", inventoryAccount: "Inventory account", paymentAccount: "Cash/Bank account", apAccount: "Payable account (AP)", arAccount: "Receivable account (AR)", revenueAccount: "Revenue account", cogsAccount: "COGS account", lossAccount: "Loss account", location: "Location", receiveStock: "Receive into stock", postCogs: "Post cost of goods sold", reason: "Reason", total: "Total", post: "Post transaction", posted: "Transaction posted", selectAccount: "Select account", reasons: { breakage: "Breakage", loss: "Loss", expired: "Expired", damaged: "Damaged", theft: "Theft", other: "Other" }, errors: { needLine: "Add at least one line", needAccounts: "Select all required accounts", needLocation: "Location is required to move stock", badTotal: "Total must be greater than zero" } }, banking: { exactMatch: "Exact", goodMatch: "Good", possibleMatch: "Possible", showLowScore: "Show weak matches", title: "Bank Reconciliation", account: "Bank account", selectAccount: "Select a bank account", noBankAccounts: "No accounts flagged as bank accounts. Mark an account as a bank account in the chart of accounts.", importCsv: "Import CSV", statements: "Bank statements", entryRecords: "Ledger records", date: "Date", description: "Description", reference: "Reference", debit: "Debit", credit: "Credit", balance: "Balance", status: "Status", reconciled: "Reconciled", unreconciled: "Unreconciled", suggested: "Suggested match", match: "Match", unmatch: "Unmatch", score: "Score", noStatements: "No bank statements. Import a CSV to begin.", noRecords: "No ledger records for this account this year", csvHelp: "Columns: date, description, reference, debit, credit, balance", csvPaste: "Paste CSV rows", importBtn: "Import", imported: "{n} statements imported" }, employees: { title: "Employees", newEmployee: "New employee", editEmployee: "Edit employee", name: "Name", position: "Position", department: "Department", email: "Email", phone: "Phone", startDate: "Start date", status: "Status", employeeNumber: "Employee #", clockingNumber: "Clocking #", employmentType: "Employment type", ssn: "SSN", payType: "Pay type", hourlyRate: "Hourly rate", annualSalary: "Annual salary", overtimeRate: "Overtime rate", standardHours: "Standard hours/week", lunchMinutes: "Lunch (minutes)", taxRate: "Tax rate (%)", insuranceDeduction: "Insurance deduction", allStatuses: "All statuses", allDepartments: "All departments", noEmployees: "No employees yet", hourlyRateLabel: "Rate", statuses: { active: "Active", inactive: "Inactive", terminated: "Terminated", on_leave: "On leave" }, payTypes: { hourly: "Hourly", salary: "Salary" } }, timesheets: { title: "Timesheets", newCard: "New week card", editCard: "Edit week card", employee: "Employee", week: "Week", weekOf: "Week of", status: "Status", totalHours: "Total hours", overtime: "Overtime", regular: "Regular", day: "Day", mode: "Mode", start: "Start", end: "End", hours: "Hours", lunch: "Lunch (min)", netHours: "Net", selectEmployee: "Select employee", noTimesheets: "No timesheets yet", allStatuses: "All statuses", submit: "Submit", approve: "Approve", reject: "Reject", payroll: "Payroll", rate: "Rate", regularPay: "Regular pay", overtimePay: "Overtime pay", gross: "Gross", taxes: "Taxes", insurance: "Insurance", net: "Net pay", rejectReason: "Reason for rejection", statuses: { draft: "Draft", submitted: "Submitted", approved: "Approved", paid: "Paid" }, modes: { clock: "Clock", hours: "Hours" }, days: { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" } }, dashboard: { financialPosition: "Financial position", assets: "Assets", liabilities: "Liabilities", equity: "Equity", netIncome: "Net income", journalActivity: "Journal activity", draftEntries: "Draft entries", postedEntries: "Posted entries", receivables: "Receivables (customers owe)", payables: "Payables (we owe)", lowStock: "Products at/below min stock", pendingTimesheets: "Timesheets awaiting approval", quickActions: "Quick actions", newPurchase: "New purchase", newSale: "New sale", newEntry: "New journal entry" }, admin: { title: "Admin", geminiUsage: "Gemini Usage", since: "Since", refresh: "Refresh", rawJson: "Raw response" } }, ua = { common: { appName: "HRMfinance", loading: "Cargando\u2026", save: "Guardar", cancel: "Cancelar", delete: "Eliminar", edit: "Editar", add: "Agregar", search: "Buscar", actions: "Acciones", error: "Algo sali\xF3 mal", confirmDelete: "\xBFSeguro que desea eliminar esto?", noResults: "Sin resultados", total: "Total", year: "A\xF1o", export: "Exportar CSV", signOut: "Cerrar sesi\xF3n", close: "Cerrar" }, nav: { dashboard: "Panel", accounts: "Plan de Cuentas", reports: "Reportes", trialBalance: "Balance de Comprobaci\xF3n", balanceSheet: "Balance General", incomeStatement: "Estado de Resultados" }, login: { title: "HRMfinance", subtitle: "Inicie sesi\xF3n para continuar", signingIn: "Iniciando sesi\xF3n\u2026", failed: "Error al iniciar sesi\xF3n", invalidSession: "La autenticaci\xF3n fue exitosa pero la sesi\xF3n es inv\xE1lida.", sso: "Iniciar sesi\xF3n con SSO", backToLogin: "Volver al inicio de sesi\xF3n" }, accounts: { title: "Plan de Cuentas", addAccount: "Agregar cuenta", addSubAccount: "Agregar subcuenta", editAccount: "Editar cuenta", accountNumber: "N\xFAmero de cuenta", name: "Nombre", type: "Tipo", category: "Categor\xEDa", description: "Descripci\xF3n", parentAccount: "Cuenta padre", balance: "Saldo", active: "Activa", inactive: "Inactiva", bankAccount: "Cuenta bancaria", bankName: "Banco", bankAccountNumber: "N\xFAmero de cuenta bancaria", bankAccountType: "Tipo de cuenta bancaria", piggybank: "Cuenta de caja", piggybankLabel: "Etiqueta de caja", chequesEnTransito: "Cuenta de cheques en tr\xE1nsito", flatView: "Lista", treeView: "\xC1rbol", allTypes: "Todos los tipos", cannotDelete: "Esta cuenta tiene subcuentas o transacciones y no puede eliminarse.", types: { Asset: "Activo", Liability: "Pasivo", Equity: "Patrimonio", Revenue: "Ingreso", Expense: "Gasto" }, ledger: "Submayor", date: "Fecha", reference: "Referencia", debit: "D\xE9bito", credit: "Cr\xE9dito", noTransactions: "Sin transacciones este a\xF1o", noMatches: "Sin transacciones que coincidan con los filtros", allAccounts: "Todas las cuentas", backToAccounts: "Volver al plan de cuentas" }, reports: { trialBalance: "Balance de Comprobaci\xF3n", balanceSheet: "Balance General", account: "Cuenta", totals: "Totales", balanced: "Cuadrado", outOfBalance: "Descuadre", assets: "Activos", liabilities: "Pasivos", equity: "Patrimonio", netIncome: "Resultado (Ingresos \u2212 Gastos)", totalAssets: "Total activos", totalLiabilitiesEquity: "Total pasivos + patrimonio", incomeStatement: "Estado de Resultados", revenue: "Ingresos", expenses: "Gastos", netIncomeTotal: "Resultado neto", margin: "Margen", audit: { run: "Auditar diferencia", title: "Auditor\xEDa del descuadre", empty: "No se encontraron asientos sospechosos", score: "Riesgo", hints: { transposition: "El descuadre es divisible entre 9 \u2014 posible transposici\xF3n de d\xEDgitos (ej. 54 escrito como 45)", wrongSide: "Un asiento por la mitad del descuadre existe \u2014 posible monto asentado al lado contrario" }, reasons: { title: "Se\xF1ales", imbalance: "Asiento descuadrado internamente", exactMatch: "Su descuadre interno coincide con la diferencia", amountMatch: "Su total coincide con la diferencia", lineMatch: "Una l\xEDnea coincide con la diferencia", halfMatch: "Su total es la mitad de la diferencia (lado contrario)", rounding: "Montos con residuo de redondeo", duplicate: "Posible duplicado (misma fecha y monto)", draft: "Es borrador \u2014 contabil\xEDcelo o excl\xFAyalo" } } }, journal: { title: "Diario", newEntry: "Nuevo asiento", entryNumber: "Asiento #", date: "Fecha", description: "Descripci\xF3n", reference: "Referencia", debits: "D\xE9bitos", credits: "Cr\xE9ditos", status: "Estado", lines: "L\xEDneas", line: "L\xEDnea", account: "Cuenta", debit: "D\xE9bito", credit: "Cr\xE9dito", addLine: "Agregar l\xEDnea", removeLine: "Quitar l\xEDnea", balanced: "Cuadrado", difference: "Diferencia", post: "Contabilizar", void: "Anular", viewEntry: "Ver asiento", referenceId: "Entidad (referenceId)", postedAt: "Contabilizado", createdBy: "Creado por", allStatuses: "Todos los estados", noEntries: "Sin asientos este a\xF1o", confirmPost: "\xBFContabilizar este asiento? Los asientos contabilizados no se pueden editar.", confirmVoid: "\xBFAnular este asiento?", statuses: { draft: "Borrador", posted: "Contabilizado", void: "Anulado" }, errors: { dateRequired: "La fecha es obligatoria", descriptionRequired: "La descripci\xF3n es obligatoria", linesRequired: "Se requiere al menos una l\xEDnea", lineAccount: "L\xEDnea {n}: la cuenta es obligatoria", lineAmount: "L\xEDnea {n}: se requiere un monto d\xE9bito o cr\xE9dito", lineBothSides: "L\xEDnea {n}: no puede tener d\xE9bito y cr\xE9dito a la vez", notBalanced: "El asiento no est\xE1 cuadrado \u2014 d\xE9bitos deben igualar cr\xE9ditos", deletePosted: "Los asientos contabilizados no se pueden eliminar. An\xFAlelos.", notFound: "Asiento no encontrado" } }, templates: { title: "Plantillas", launch: "Usar plantilla", manage: "Gestionar plantillas", newTemplate: "Nueva plantilla", editTemplate: "Editar plantilla", noTemplates: "A\xFAn no hay plantillas", category: "Categor\xEDa", fields: "Campos", lineRules: "Reglas de l\xEDneas", settings: "Configuraci\xF3n", preview: "Vista previa", generate: "Crear asiento", usageCount: "Usada {n} veces", dynamicAccount: "Cuenta din\xE1mica (expresi\xF3n)", connectors: "Conectores", connector: { provider: "Proveedor", customer: "Cliente", employee: "Empleado" }, connectorInfoTitle: "Conectores: proveedores, clientes y empleados", connectorInfoBody: "Al ejecutar la plantilla puedes escoger un proveedor, cliente y/o empleado. Sus campos reales se vuelven variables usables en cualquier parte de esta plantilla \u2014 descripci\xF3n por defecto, formato de referencia, expresiones de monto, cuenta din\xE1mica, referenceId \u2014 y los campos de texto cuyo nombre mencione la entidad se auto-rellenan.", connectorRateHint: "rate = tarifa horaria efectiva", connectorInfoExample: 'Ejemplo: una regla de l\xEDnea con cuenta din\xE1mica "{provider.relatedAccountId}", referenceId "{provider.id}" y monto "{monto}" debita la CxP del proveedor escogido; un monto de n\xF3mina puede ser "{horas} * {employee.rate}".', connectorVars: "Variables: {provider.name}, {provider.relatedAccountId}, {customer.name}, {customer.relatedAccountId}, {employee.name}, {employee.rate}\u2026", connectorHint: "Los conectores exponen los campos reales de la entidad: {provider.name}, {provider.id}, {provider.relatedAccountId}, {customer.taxId}, {employee.rate}\u2026", active: "Activa", inactive: "Inactiva", errors: { fieldRequired: "{0} es obligatorio", accountNotFound: "Cuenta no encontrada: {0}", badAmount: "Monto inv\xE1lido en l\xEDnea: {0}", minLines: "La plantilla debe generar al menos 2 l\xEDneas", notBalanced: "El asiento generado no est\xE1 cuadrado" } }, providers: { title: "Proveedores y Clientes", newEntity: "Nueva entidad", editEntity: "Editar entidad", name: "Nombre", type: "Tipo", email: "Correo", phone: "Tel\xE9fono", address: "Direcci\xF3n", taxId: "ID fiscal", contactPerson: "Persona de contacto", notes: "Notas", balance: "Saldo", relatedAccount: "Cuenta relacionada (CxP/CxC)", active: "Activo", inactive: "Inactivo", allTypes: "Todos", noEntities: "A\xFAn no hay proveedores ni clientes", recordPayment: "Registrar pago", recordCollection: "Registrar cobro", amount: "Monto", paymentMethod: "M\xE9todo de pago", date: "Fecha", reference: "Referencia", description: "Descripci\xF3n", weOwe: "Le debemos", theyOwe: "Nos deben", settled: "Saldado", types: { customer: "Cliente", provider: "Proveedor", both: "Ambos" }, methods: { cash: "Efectivo", check: "Cheque", transfer: "Transferencia", zelle: "Zelle", credit_card: "Tarjeta", other: "Otro" }, document: "Documento", viewDocuments: "Documentos", noDocuments: "Sin documentos este a\xF1o", pendingDocs: "Documentos pendientes", cashAccount: "Cuenta de efectivo/banco", tabs: { all: "Todos", pending: "Pendientes", settled: "Saldados" }, advance: "Anticipo", openEntry: "Ver asiento contable", advanceAccount: "Cuenta de anticipos", applyAdvance: "Aplicar anticipo", accountsPayable: "Cuentas por Pagar", accountsReceivable: "Cuentas por Cobrar", multiPayment: "Pago m\xFAltiple", multiCollection: "Cobro m\xFAltiple", cashMovement: "Movimiento de efectivo", addAdvanceFor: "Agregar anticipo para\u2026", newAdvance: "NUEVO ANTICIPO", applyToAR: "Aplicar a CxC (sin efectivo)", applyToAP: "Aplicar a CxP (sin efectivo)", errors: { notFound: "Entidad no encontrada", noRelatedAccount: "Esta entidad no tiene cuenta CxP/CxC vinculada \u2014 ed\xEDtela y seleccione una cuenta relacionada", noAdvanceAccount: "Esta entidad no tiene cuenta de anticipos \u2014 ed\xEDtela y seleccione una", cashAccountRequired: "Seleccione la cuenta de efectivo/banco", amountRequired: "Ingrese un monto o seleccione documentos pendientes" } }, inventory: { title: "Inventario", products: "Productos", movements: "Movimientos", stock: "Existencias", newProduct: "Nuevo producto", editProduct: "Editar producto", name: "Nombre", sku: "SKU", upc: "UPC", code: "C\xF3digo", category: "Categor\xEDa", description: "Descripci\xF3n", unitOfMeasure: "Unidad", unitCost: "Costo unitario", sellingPrice: "Precio de venta", minStock: "Stock m\xEDn.", maxStock: "Stock m\xE1x.", active: "Activo", inactive: "Inactivo", noProducts: "A\xFAn no hay productos", location: "Ubicaci\xF3n", fromLocation: "Desde ubicaci\xF3n", toLocation: "Hacia ubicaci\xF3n", quantity: "Cantidad", reference: "Referencia", notes: "Notas", newMovement: "Nuevo movimiento", movementType: "Tipo de movimiento", product: "Producto", noMovements: "Sin movimientos", lowStock: "Stock bajo", date: "Fecha", type: "Tipo", allLocations: "Todas las ubicaciones", types: { in: "Entrada", out: "Salida", adjustment: "Ajuste", transfer: "Transferencia" } }, transactions: { title: "Operaciones", compras: "Compras", facturacion: "Facturaci\xF3n", mermas: "Mermas", date: "Fecha", description: "Descripci\xF3n", reference: "Referencia", provider: "Proveedor", customer: "Cliente", product: "Producto", qty: "Cant.", unitCost: "Costo unitario", unitPrice: "Precio unitario", subtotal: "Subtotal", addLine: "Agregar l\xEDnea", serviceLines: "Servicios", serviceName: "Servicio", expenseAccount: "Cuenta de gasto", paymentMode: "Forma de pago", cash: "Efectivo", bank: "Banco", credit: "Cr\xE9dito", inventoryAccount: "Cuenta de inventario", paymentAccount: "Cuenta de efectivo/banco", apAccount: "Cuenta por pagar (CxP)", arAccount: "Cuenta por cobrar (CxC)", revenueAccount: "Cuenta de ingreso", cogsAccount: "Cuenta de costo (COGS)", lossAccount: "Cuenta de p\xE9rdida", location: "Ubicaci\xF3n", receiveStock: "Ingresar a inventario", postCogs: "Registrar costo de venta", reason: "Motivo", total: "Total", post: "Registrar transacci\xF3n", posted: "Transacci\xF3n registrada", selectAccount: "Seleccionar cuenta", reasons: { breakage: "Rotura", loss: "P\xE9rdida", expired: "Vencido", damaged: "Da\xF1ado", theft: "Robo", other: "Otro" }, errors: { needLine: "Agregue al menos una l\xEDnea", needAccounts: "Seleccione todas las cuentas requeridas", needLocation: "La ubicaci\xF3n es obligatoria para mover inventario", badTotal: "El total debe ser mayor a cero" } }, banking: { title: "Conciliaci\xF3n Bancaria", exactMatch: "Exacta", goodMatch: "Buena", possibleMatch: "Posible", showLowScore: "Mostrar coincidencias d\xE9biles", account: "Cuenta bancaria", selectAccount: "Seleccione una cuenta bancaria", noBankAccounts: "No hay cuentas marcadas como bancarias. Marque una cuenta como bancaria en el plan de cuentas.", importCsv: "Importar CSV", statements: "Extractos bancarios", entryRecords: "Registros del libro mayor", date: "Fecha", description: "Descripci\xF3n", reference: "Referencia", debit: "D\xE9bito", credit: "Cr\xE9dito", balance: "Saldo", status: "Estado", reconciled: "Conciliado", unreconciled: "Sin conciliar", suggested: "Coincidencia sugerida", match: "Conciliar", unmatch: "Desconciliar", score: "Puntaje", noStatements: "Sin extractos. Importe un CSV para comenzar.", noRecords: "Sin registros del mayor para esta cuenta este a\xF1o", csvHelp: "Columnas: fecha, descripci\xF3n, referencia, d\xE9bito, cr\xE9dito, saldo", csvPaste: "Pegue las filas CSV", importBtn: "Importar", imported: "{n} extractos importados" }, employees: { title: "Empleados", newEmployee: "Nuevo empleado", editEmployee: "Editar empleado", name: "Nombre", position: "Cargo", department: "Departamento", email: "Correo", phone: "Tel\xE9fono", startDate: "Fecha de ingreso", status: "Estado", employeeNumber: "N\xB0 empleado", clockingNumber: "N\xB0 reloj", employmentType: "Tipo de empleo", ssn: "SSN", payType: "Tipo de pago", hourlyRate: "Tarifa por hora", annualSalary: "Salario anual", overtimeRate: "Tarifa extra", standardHours: "Horas est\xE1ndar/semana", lunchMinutes: "Almuerzo (minutos)", taxRate: "Tasa de impuesto (%)", insuranceDeduction: "Deducci\xF3n de seguro", allStatuses: "Todos los estados", allDepartments: "Todos los departamentos", noEmployees: "A\xFAn no hay empleados", hourlyRateLabel: "Tarifa", statuses: { active: "Activo", inactive: "Inactivo", terminated: "Terminado", on_leave: "En licencia" }, payTypes: { hourly: "Por hora", salary: "Salario" } }, timesheets: { title: "Tarjetas de Tiempo", newCard: "Nueva tarjeta semanal", editCard: "Editar tarjeta semanal", employee: "Empleado", week: "Semana", weekOf: "Semana del", status: "Estado", totalHours: "Horas totales", overtime: "Horas extra", regular: "Regulares", day: "D\xEDa", mode: "Modo", start: "Entrada", end: "Salida", hours: "Horas", lunch: "Almuerzo (min)", netHours: "Neto", selectEmployee: "Seleccione empleado", noTimesheets: "A\xFAn no hay tarjetas", allStatuses: "Todos los estados", submit: "Enviar", approve: "Aprobar", reject: "Rechazar", payroll: "N\xF3mina", rate: "Tarifa", regularPay: "Pago regular", overtimePay: "Pago extra", gross: "Bruto", taxes: "Impuestos", insurance: "Seguro", net: "Pago neto", rejectReason: "Motivo del rechazo", statuses: { draft: "Borrador", submitted: "Enviada", approved: "Aprobada", paid: "Pagada" }, modes: { clock: "Reloj", hours: "Horas" }, days: { monday: "Lunes", tuesday: "Martes", wednesday: "Mi\xE9rcoles", thursday: "Jueves", friday: "Viernes", saturday: "S\xE1bado", sunday: "Domingo" } }, dashboard: { financialPosition: "Posici\xF3n financiera", assets: "Activos", liabilities: "Pasivos", equity: "Patrimonio", netIncome: "Resultado", journalActivity: "Actividad del diario", draftEntries: "Asientos borrador", postedEntries: "Asientos contabilizados", receivables: "Por cobrar (clientes deben)", payables: "Por pagar (debemos)", lowStock: "Productos en/bajo stock m\xEDnimo", pendingTimesheets: "Tarjetas por aprobar", quickActions: "Acciones r\xE1pidas", newPurchase: "Nueva compra", newSale: "Nueva venta", newEntry: "Nuevo asiento" }, admin: { title: "Admin", geminiUsage: "Uso de Gemini", since: "Desde", refresh: "Actualizar", rawJson: "Respuesta cruda" } }, ma = () => {
  return "es";
}, [Ie, pa] = createSignal(ma()), [Ne, ha] = createSignal({ en: {}, es: {} }), O = { get language() {
  return Ie();
}, get translations() {
  return Ne();
}, setLanguage(e) {
  pa(e);
}, setTranslations(e) {
  ha(e);
}, translate(e, t) {
  const o = Ie(), n = Ne()[o];
  if (!n) return t || e;
  const a = e.split(".");
  let r = n;
  for (const s of a) if (r && typeof r == "object" && s in r) r = r[s];
  else return t || e;
  return typeof r == "string" ? r : t || e;
}, t(e, t) {
  return this.translate(e, t);
} }, fa = () => ({ t: O.translate.bind(O), language: O.language, setLanguage: O.setLanguage });
O.setTranslations({ en: da, es: ua });
var ya = ["<div", ' class="min-h-screen flex"><aside class="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col"><div class="px-4 py-5 flex items-center gap-2 border-b border-gray-100"><div class="w-8 h-8 rounded-lg bg-brand-600 text-white grid place-items-center font-semibold">H</div><span class="font-semibold text-gray-900">', '</span></div><nav class="flex-1 px-2 py-3 space-y-1"><!--$-->', "<!--/--><!--$-->", '<!--/--></nav><div class="px-4 py-3 border-t border-gray-100 space-y-2"><label class="flex items-center justify-between text-xs text-gray-500"><!--$-->', '<!--/--><select class="ml-2 border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-700 bg-white"', ">", '</select></label><button class="text-xs text-gray-500 hover:text-gray-700">', '</button><div class="flex items-center justify-between"><span class="text-xs text-gray-500 truncate">', '</span><button class="text-xs text-red-500 hover:text-red-700">', '</button></div></div></aside><main class="flex-1 min-w-0 p-6">', "</main></div>"], ga = ["<option", ">", "</option>"];
function va(e) {
  var _a;
  const { t } = fa(), o = he(), n = () => o.pathname.startsWith("/timesheets"), a = [{ href: "/", key: "nav.dashboard", fallback: "Dashboard", icon: ln }, { href: "/accounts", key: "nav.accounts", fallback: "Chart of Accounts", icon: nn }, { href: "/journal", key: "journal.title", fallback: "Journal", icon: mn }, { href: "/providers", key: "providers.title", fallback: "Providers & Customers", icon: Ln }, { href: "/inventory", key: "inventory.title", fallback: "Inventory", icon: fn }, { href: "/transactions", key: "transactions.title", fallback: "Operations", icon: wn }, { href: "/banking", key: "banking.title", fallback: "Bank Reconciliation", icon: rn }, { href: "/employees", key: "employees.title", fallback: "Employees", icon: Rn }, { href: "/reports", key: "nav.reports", fallback: "Reports", icon: vn }];
  return ssr(ya, ssrHydrationKey(), escape(t("common.appName", "HRMfinance")), escape(createComponent(For, { each: a, children: (r) => createComponent(Re, { get href() {
    return r.href;
  }, get end() {
    return r.href === "/";
  }, get class() {
    return `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 ${r.href === "/employees" && n() ? "bg-brand-50 text-brand-700 font-medium" : ""}`;
  }, activeClass: "bg-brand-50 text-brand-700 font-medium", get children() {
    return [createComponent(r.icon, { size: 17 }), t(r.key, r.fallback)];
  } }) })), escape(createComponent(Show, { get when() {
    return oa();
  }, get children() {
    return createComponent(Re, { href: "/admin/gemini", end: true, class: "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50", activeClass: "bg-brand-50 text-brand-700 font-medium", get children() {
      return [createComponent(Cn, { size: 17 }), t("admin.geminiUsage", "Gemini Usage")];
    } });
  } })), escape(t("common.year", "Year")), ssrAttribute("value", escape(ca(), true), false), escape(createComponent(For, { get each() {
    return la();
  }, children: (r) => ssr(ga, ssrHydrationKey() + ssrAttribute("value", escape(r, true), false), escape(r)) })), O.language === "es" ? "EN" : "ES", escape((_a = Ae()) == null ? void 0 : _a.email), escape(t("common.signOut", "Sign out")), escape(e.children));
}
var ba = ["<svg", ' viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>'];
function Aa(e) {
  var _a;
  return ssr(ba, ssrHydrationKey() + ssrAttribute("class", escape(["animate-spin text-gray-400", (_a = e.class) != null ? _a : "w-5 h-5"].join(" "), true), false));
}
var wa = ["<div", ' class="min-h-screen grid place-items-center">', "</div>"];
function Sa(e) {
  const t = he(), o = xt();
  onMount(() => {
    ra();
  });
  const n = () => t.pathname === "/login" || t.pathname === "/callback";
  return createEffect(() => {
    Te() || (!Le() && !n() ? o("/login", { replace: true }) : Le() && t.pathname === "/login" && o("/", { replace: true }));
  }), createComponent(Show, { get when() {
    return !Te();
  }, get fallback() {
    return ssr(wa, ssrHydrationKey(), escape(createComponent(Aa, { class: "w-8 h-8" })));
  }, get children() {
    return createComponent(Show, { get when() {
      return !n();
    }, get fallback() {
      return createComponent(Suspense, { get children() {
        return e.children;
      } });
    }, get children() {
      return createComponent(va, { get children() {
        return createComponent(Suspense, { get children() {
          return e.children;
        } });
      } });
    } });
  } });
}
function Na() {
  return createComponent(Wt, { root: Sa, get children() {
    return createComponent(au, {});
  } });
}

export { Na as default };
//# sourceMappingURL=app-DTa0waRN.mjs.map
