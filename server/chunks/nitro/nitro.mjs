import process from 'node:process';globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};import http, { Server as Server$1 } from 'node:http';
import https, { Server } from 'node:https';
import { EventEmitter } from 'node:events';
import { Buffer as Buffer$1 } from 'node:buffer';
import { promises, existsSync } from 'node:fs';
import { resolve as resolve$1, dirname as dirname$1, join } from 'node:path';
import { createHash } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import invariant from 'vinxi/lib/invariant';
import { virtualId, handlerModule, join as join$1 } from 'vinxi/lib/path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { sharedConfig, lazy, createComponent, catchError, onCleanup } from 'solid-js';
import { renderToString, isServer, getRequestEvent, ssrElement, escape, mergeProps, ssr, createComponent as createComponent$1, ssrHydrationKey, NoHydration, ssrAttribute } from 'solid-js/web';
import { provideRequestEvent } from 'solid-js/web/storage';

const suspectProtoRx = /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/;
const suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
const JsonSigRx = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;
function jsonParseTransform(key, value) {
  if (key === "__proto__" || key === "constructor" && value && typeof value === "object" && "prototype" in value) {
    warnKeyDropped(key);
    return;
  }
  return value;
}
function warnKeyDropped(key) {
  console.warn(`[destr] Dropping "${key}" key to prevent prototype pollution.`);
}
function destr(value, options = {}) {
  if (typeof value !== "string") {
    return value;
  }
  if (value[0] === '"' && value[value.length - 1] === '"' && value.indexOf("\\") === -1) {
    return value.slice(1, -1);
  }
  const _value = value.trim();
  if (_value.length <= 9) {
    switch (_value.toLowerCase()) {
      case "true": {
        return true;
      }
      case "false": {
        return false;
      }
      case "undefined": {
        return void 0;
      }
      case "null": {
        return null;
      }
      case "nan": {
        return Number.NaN;
      }
      case "infinity": {
        return Number.POSITIVE_INFINITY;
      }
      case "-infinity": {
        return Number.NEGATIVE_INFINITY;
      }
    }
  }
  if (!JsonSigRx.test(value)) {
    if (options.strict) {
      throw new SyntaxError("[destr] Invalid JSON");
    }
    return value;
  }
  try {
    if (suspectProtoRx.test(value) || suspectConstructorRx.test(value)) {
      if (options.strict) {
        throw new Error("[destr] Possible prototype pollution");
      }
      return JSON.parse(value, jsonParseTransform);
    }
    return JSON.parse(value);
  } catch (error) {
    if (options.strict) {
      throw error;
    }
    return value;
  }
}

const HASH_RE = /#/g;
const AMPERSAND_RE = /&/g;
const SLASH_RE = /\//g;
const EQUAL_RE = /=/g;
const PLUS_RE = /\+/g;
const ENC_CARET_RE = /%5e/gi;
const ENC_BACKTICK_RE = /%60/gi;
const ENC_PIPE_RE = /%7c/gi;
const ENC_SPACE_RE = /%20/gi;
const ENC_SLASH_RE = /%2f/gi;
function encode(text) {
  return encodeURI("" + text).replace(ENC_PIPE_RE, "|");
}
function encodeQueryValue(input) {
  return encode(typeof input === "string" ? input : JSON.stringify(input)).replace(PLUS_RE, "%2B").replace(ENC_SPACE_RE, "+").replace(HASH_RE, "%23").replace(AMPERSAND_RE, "%26").replace(ENC_BACKTICK_RE, "`").replace(ENC_CARET_RE, "^").replace(SLASH_RE, "%2F");
}
function encodeQueryKey(text) {
  return encodeQueryValue(text).replace(EQUAL_RE, "%3D");
}
function decode$1(text = "") {
  try {
    return decodeURIComponent("" + text);
  } catch {
    return "" + text;
  }
}
function decodePath(text) {
  return decode$1(text.replace(ENC_SLASH_RE, "%252F"));
}
function decodeQueryKey(text) {
  return decode$1(text.replace(PLUS_RE, " "));
}
function decodeQueryValue(text) {
  return decode$1(text.replace(PLUS_RE, " "));
}

function parseQuery(parametersString = "") {
  const object = /* @__PURE__ */ Object.create(null);
  if (parametersString[0] === "?") {
    parametersString = parametersString.slice(1);
  }
  for (const parameter of parametersString.split("&")) {
    const s = parameter.match(/([^=]+)=?(.*)/) || [];
    if (s.length < 2) {
      continue;
    }
    const key = decodeQueryKey(s[1]);
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = decodeQueryValue(s[2] || "");
    if (object[key] === void 0) {
      object[key] = value;
    } else if (Array.isArray(object[key])) {
      object[key].push(value);
    } else {
      object[key] = [object[key], value];
    }
  }
  return object;
}
function encodeQueryItem(key, value) {
  if (typeof value === "number" || typeof value === "boolean") {
    value = String(value);
  }
  if (!value) {
    return encodeQueryKey(key);
  }
  if (Array.isArray(value)) {
    return value.map(
      (_value) => `${encodeQueryKey(key)}=${encodeQueryValue(_value)}`
    ).join("&");
  }
  return `${encodeQueryKey(key)}=${encodeQueryValue(value)}`;
}
function stringifyQuery(query) {
  return Object.keys(query).filter((k) => query[k] !== void 0).map((k) => encodeQueryItem(k, query[k])).filter(Boolean).join("&");
}

const PROTOCOL_STRICT_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{1,2})/;
const PROTOCOL_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{2})?/;
const PROTOCOL_RELATIVE_REGEX = /^([/\\]\s*){2,}[^/\\]/;
const JOIN_LEADING_SLASH_RE = /^\.?\//;
function hasProtocol(inputString, opts = {}) {
  if (typeof opts === "boolean") {
    opts = { acceptRelative: opts };
  }
  if (opts.strict) {
    return PROTOCOL_STRICT_REGEX.test(inputString);
  }
  return PROTOCOL_REGEX.test(inputString) || (opts.acceptRelative ? PROTOCOL_RELATIVE_REGEX.test(inputString) : false);
}
function hasTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return input.endsWith("/");
  }
}
function withoutTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return (hasTrailingSlash(input) ? input.slice(0, -1) : input) || "/";
  }
}
function withTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return input.endsWith("/") ? input : input + "/";
  }
}
function hasLeadingSlash(input = "") {
  return input.startsWith("/");
}
function withLeadingSlash(input = "") {
  return hasLeadingSlash(input) ? input : "/" + input;
}
function withBase(input, base) {
  if (isEmptyURL(base) || hasProtocol(input)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (input.startsWith(_base)) {
    const nextChar = input[_base.length];
    if (!nextChar || nextChar === "/" || nextChar === "?") {
      return input;
    }
  }
  return joinURL(_base, input);
}
function withoutBase(input, base) {
  if (isEmptyURL(base)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (!input.startsWith(_base)) {
    return input;
  }
  const nextChar = input[_base.length];
  if (nextChar && nextChar !== "/" && nextChar !== "?") {
    return input;
  }
  const trimmed = input.slice(_base.length).replace(/^\/+/, "");
  return "/" + trimmed;
}
function withQuery(input, query) {
  const parsed = parseURL(input);
  const mergedQuery = { ...parseQuery(parsed.search), ...query };
  parsed.search = stringifyQuery(mergedQuery);
  return stringifyParsedURL(parsed);
}
function getQuery(input) {
  return parseQuery(parseURL(input).search);
}
function isEmptyURL(url) {
  return !url || url === "/";
}
function isNonEmptyURL(url) {
  return url && url !== "/";
}
function joinURL(base, ...input) {
  let url = base || "";
  for (const segment of input.filter((url2) => isNonEmptyURL(url2))) {
    if (url) {
      const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
      url = withTrailingSlash(url) + _segment;
    } else {
      url = segment;
    }
  }
  return url;
}

const protocolRelative = Symbol.for("ufo:protocolRelative");
function parseURL(input = "", defaultProto) {
  const _specialProtoMatch = input.match(
    /^[\s\0]*(blob:|data:|javascript:|vbscript:)(.*)/i
  );
  if (_specialProtoMatch) {
    const [, _proto, _pathname = ""] = _specialProtoMatch;
    return {
      protocol: _proto.toLowerCase(),
      pathname: _pathname,
      href: _proto + _pathname,
      auth: "",
      host: "",
      search: "",
      hash: ""
    };
  }
  if (!hasProtocol(input, { acceptRelative: true })) {
    return parsePath(input);
  }
  const [, protocol = "", auth, hostAndPath = ""] = input.replace(/\\/g, "/").match(/^[\s\0]*([\w+.-]{2,}:)?\/\/([^/@]+@)?(.*)/) || [];
  let [, host = "", path = ""] = hostAndPath.match(/([^#/?]*)(.*)?/) || [];
  if (protocol === "file:") {
    path = path.replace(/\/(?=[A-Za-z]:)/, "");
  }
  const { pathname, search, hash } = parsePath(path);
  return {
    protocol: protocol.toLowerCase(),
    auth: auth ? auth.slice(0, Math.max(0, auth.length - 1)) : "",
    host,
    pathname,
    search,
    hash,
    [protocolRelative]: !protocol
  };
}
function parsePath(input = "") {
  const [pathname = "", search = "", hash = ""] = (input.match(/([^#?]*)(\?[^#]*)?(#.*)?/) || []).splice(1);
  return {
    pathname,
    search,
    hash
  };
}
function stringifyParsedURL(parsed) {
  const pathname = parsed.pathname || "";
  const search = parsed.search ? (parsed.search.startsWith("?") ? "" : "?") + parsed.search : "";
  const hash = parsed.hash || "";
  const auth = parsed.auth ? parsed.auth + "@" : "";
  const host = parsed.host || "";
  const proto = parsed.protocol || parsed[protocolRelative] ? (parsed.protocol || "") + "//" : "";
  return proto + auth + host + pathname + search + hash;
}

const NullObject = /* @__PURE__ */ (() => {
  const C = function() {
  };
  C.prototype = /* @__PURE__ */ Object.create(null);
  return C;
})();
function parse(str, options) {
  if (typeof str !== "string") {
    throw new TypeError("argument str must be a string");
  }
  const obj = new NullObject();
  const opt = {};
  const dec = opt.decode || decode;
  let index = 0;
  while (index < str.length) {
    const eqIdx = str.indexOf("=", index);
    if (eqIdx === -1) {
      break;
    }
    let endIdx = str.indexOf(";", index);
    if (endIdx === -1) {
      endIdx = str.length;
    } else if (endIdx < eqIdx) {
      index = str.lastIndexOf(";", eqIdx - 1) + 1;
      continue;
    }
    const key = str.slice(index, eqIdx).trim();
    if (opt?.filter && !opt?.filter(key)) {
      index = endIdx + 1;
      continue;
    }
    if (void 0 === obj[key]) {
      let val = str.slice(eqIdx + 1, endIdx).trim();
      if (val.codePointAt(0) === 34) {
        val = val.slice(1, -1);
      }
      obj[key] = tryDecode(val, dec);
    }
    index = endIdx + 1;
  }
  return obj;
}
function decode(str) {
  return str.includes("%") ? decodeURIComponent(str) : str;
}
function tryDecode(str, decode2) {
  try {
    return decode2(str);
  } catch {
    return str;
  }
}

const fieldContentRegExp = /^[\u0009\u0020-\u007E\u0080-\u00FF]+$/;
function serialize$1(name, value, options) {
  const opt = options || {};
  const enc = opt.encode || encodeURIComponent;
  if (typeof enc !== "function") {
    throw new TypeError("option encode is invalid");
  }
  if (!fieldContentRegExp.test(name)) {
    throw new TypeError("argument name is invalid");
  }
  const encodedValue = enc(value);
  if (encodedValue && !fieldContentRegExp.test(encodedValue)) {
    throw new TypeError("argument val is invalid");
  }
  let str = name + "=" + encodedValue;
  if (void 0 !== opt.maxAge && opt.maxAge !== null) {
    const maxAge = opt.maxAge - 0;
    if (Number.isNaN(maxAge) || !Number.isFinite(maxAge)) {
      throw new TypeError("option maxAge is invalid");
    }
    str += "; Max-Age=" + Math.floor(maxAge);
  }
  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError("option domain is invalid");
    }
    str += "; Domain=" + opt.domain;
  }
  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError("option path is invalid");
    }
    str += "; Path=" + opt.path;
  }
  if (opt.expires) {
    if (!isDate(opt.expires) || Number.isNaN(opt.expires.valueOf())) {
      throw new TypeError("option expires is invalid");
    }
    str += "; Expires=" + opt.expires.toUTCString();
  }
  if (opt.httpOnly) {
    str += "; HttpOnly";
  }
  if (opt.secure) {
    str += "; Secure";
  }
  if (opt.priority) {
    const priority = typeof opt.priority === "string" ? opt.priority.toLowerCase() : opt.priority;
    switch (priority) {
      case "low": {
        str += "; Priority=Low";
        break;
      }
      case "medium": {
        str += "; Priority=Medium";
        break;
      }
      case "high": {
        str += "; Priority=High";
        break;
      }
      default: {
        throw new TypeError("option priority is invalid");
      }
    }
  }
  if (opt.sameSite) {
    const sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
    switch (sameSite) {
      case true: {
        str += "; SameSite=Strict";
        break;
      }
      case "lax": {
        str += "; SameSite=Lax";
        break;
      }
      case "strict": {
        str += "; SameSite=Strict";
        break;
      }
      case "none": {
        str += "; SameSite=None";
        break;
      }
      default: {
        throw new TypeError("option sameSite is invalid");
      }
    }
  }
  if (opt.partitioned) {
    str += "; Partitioned";
  }
  return str;
}
function isDate(val) {
  return Object.prototype.toString.call(val) === "[object Date]" || val instanceof Date;
}

function parseSetCookie(setCookieValue, options) {
  const parts = (setCookieValue || "").split(";").filter((str) => typeof str === "string" && !!str.trim());
  const nameValuePairStr = parts.shift() || "";
  const parsed = _parseNameValuePair(nameValuePairStr);
  const name = parsed.name;
  let value = parsed.value;
  try {
    value = options?.decode === false ? value : (options?.decode || decodeURIComponent)(value);
  } catch {
  }
  const cookie = {
    name,
    value
  };
  for (const part of parts) {
    const sides = part.split("=");
    const partKey = (sides.shift() || "").trimStart().toLowerCase();
    const partValue = sides.join("=");
    switch (partKey) {
      case "expires": {
        cookie.expires = new Date(partValue);
        break;
      }
      case "max-age": {
        cookie.maxAge = Number.parseInt(partValue, 10);
        break;
      }
      case "secure": {
        cookie.secure = true;
        break;
      }
      case "httponly": {
        cookie.httpOnly = true;
        break;
      }
      case "samesite": {
        cookie.sameSite = partValue;
        break;
      }
      default: {
        cookie[partKey] = partValue;
      }
    }
  }
  return cookie;
}
function _parseNameValuePair(nameValuePairStr) {
  let name = "";
  let value = "";
  const nameValueArr = nameValuePairStr.split("=");
  if (nameValueArr.length > 1) {
    name = nameValueArr.shift();
    value = nameValueArr.join("=");
  } else {
    value = nameValuePairStr;
  }
  return { name, value };
}

const NODE_TYPES = {
  NORMAL: 0,
  WILDCARD: 1,
  PLACEHOLDER: 2
};

function createRouter$1(options = {}) {
  const ctx = {
    options,
    rootNode: createRadixNode(),
    staticRoutesMap: {}
  };
  const normalizeTrailingSlash = (p) => options.strictTrailingSlash ? p : p.replace(/\/$/, "") || "/";
  if (options.routes) {
    for (const path in options.routes) {
      insert(ctx, normalizeTrailingSlash(path), options.routes[path]);
    }
  }
  return {
    ctx,
    lookup: (path) => lookup(ctx, normalizeTrailingSlash(path)),
    insert: (path, data) => insert(ctx, normalizeTrailingSlash(path), data),
    remove: (path) => remove(ctx, normalizeTrailingSlash(path))
  };
}
function lookup(ctx, path) {
  const staticPathNode = ctx.staticRoutesMap[path];
  if (staticPathNode) {
    return staticPathNode.data;
  }
  const sections = path.split("/");
  const params = {};
  let paramsFound = false;
  let wildcardNode = null;
  let node = ctx.rootNode;
  let wildCardParam = null;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (node.wildcardChildNode !== null) {
      wildcardNode = node.wildcardChildNode;
      wildCardParam = sections.slice(i).join("/");
    }
    const nextNode = node.children.get(section);
    if (nextNode === void 0) {
      if (node && node.placeholderChildren.length > 1) {
        const remaining = sections.length - i;
        node = node.placeholderChildren.find((c) => c.maxDepth === remaining) || null;
      } else {
        node = node.placeholderChildren[0] || null;
      }
      if (!node) {
        break;
      }
      if (node.paramName) {
        params[node.paramName] = section;
      }
      paramsFound = true;
    } else {
      node = nextNode;
    }
  }
  if ((node === null || node.data === null) && wildcardNode !== null) {
    node = wildcardNode;
    params[node.paramName || "_"] = wildCardParam;
    paramsFound = true;
  }
  if (!node) {
    return null;
  }
  if (paramsFound) {
    return {
      ...node.data,
      params: paramsFound ? params : void 0
    };
  }
  return node.data;
}
function insert(ctx, path, data) {
  let isStaticRoute = true;
  const sections = path.split("/");
  let node = ctx.rootNode;
  let _unnamedPlaceholderCtr = 0;
  const matchedNodes = [node];
  for (const section of sections) {
    let childNode;
    if (childNode = node.children.get(section)) {
      node = childNode;
    } else {
      const type = getNodeType(section);
      childNode = createRadixNode({ type, parent: node });
      node.children.set(section, childNode);
      if (type === NODE_TYPES.PLACEHOLDER) {
        childNode.paramName = section === "*" ? `_${_unnamedPlaceholderCtr++}` : section.slice(1);
        node.placeholderChildren.push(childNode);
        isStaticRoute = false;
      } else if (type === NODE_TYPES.WILDCARD) {
        node.wildcardChildNode = childNode;
        childNode.paramName = section.slice(
          3
          /* "**:" */
        ) || "_";
        isStaticRoute = false;
      }
      matchedNodes.push(childNode);
      node = childNode;
    }
  }
  for (const [depth, node2] of matchedNodes.entries()) {
    node2.maxDepth = Math.max(matchedNodes.length - depth, node2.maxDepth || 0);
  }
  node.data = data;
  if (isStaticRoute === true) {
    ctx.staticRoutesMap[path] = node;
  }
  return node;
}
function remove(ctx, path) {
  let success = false;
  const sections = path.split("/");
  let node = ctx.rootNode;
  for (const section of sections) {
    node = node.children.get(section);
    if (!node) {
      return success;
    }
  }
  if (node.data) {
    const lastSection = sections.at(-1) || "";
    node.data = null;
    if (Object.keys(node.children).length === 0 && node.parent) {
      node.parent.children.delete(lastSection);
      node.parent.wildcardChildNode = null;
      node.parent.placeholderChildren = [];
    }
    success = true;
  }
  return success;
}
function createRadixNode(options = {}) {
  return {
    type: options.type || NODE_TYPES.NORMAL,
    maxDepth: 0,
    parent: options.parent || null,
    children: /* @__PURE__ */ new Map(),
    data: options.data || null,
    paramName: options.paramName || null,
    wildcardChildNode: null,
    placeholderChildren: []
  };
}
function getNodeType(str) {
  if (str.startsWith("**")) {
    return NODE_TYPES.WILDCARD;
  }
  if (str[0] === ":" || str === "*") {
    return NODE_TYPES.PLACEHOLDER;
  }
  return NODE_TYPES.NORMAL;
}

function toRouteMatcher(router) {
  const table = _routerNodeToTable("", router.ctx.rootNode);
  return _createMatcher(table, router.ctx.options.strictTrailingSlash);
}
function _createMatcher(table, strictTrailingSlash) {
  return {
    ctx: { table },
    matchAll: (path) => _matchRoutes(path, table, strictTrailingSlash)
  };
}
function _createRouteTable() {
  return {
    static: /* @__PURE__ */ new Map(),
    wildcard: /* @__PURE__ */ new Map(),
    dynamic: /* @__PURE__ */ new Map()
  };
}
function _matchRoutes(path, table, strictTrailingSlash) {
  if (strictTrailingSlash !== true && path.endsWith("/")) {
    path = path.slice(0, -1) || "/";
  }
  const matches = [];
  for (const [key, value] of _sortRoutesMap(table.wildcard)) {
    if (path === key || path.startsWith(key + "/")) {
      matches.push(value);
    }
  }
  for (const [key, value] of _sortRoutesMap(table.dynamic)) {
    if (path.startsWith(key + "/")) {
      const subPath = "/" + path.slice(key.length).split("/").splice(2).join("/");
      matches.push(..._matchRoutes(subPath, value));
    }
  }
  const staticMatch = table.static.get(path);
  if (staticMatch) {
    matches.push(staticMatch);
  }
  return matches.filter(Boolean);
}
function _sortRoutesMap(m) {
  return [...m.entries()].sort((a, b) => a[0].length - b[0].length);
}
function _routerNodeToTable(initialPath, initialNode) {
  const table = _createRouteTable();
  function _addNode(path, node) {
    if (path) {
      if (node.type === NODE_TYPES.NORMAL && !(path.includes("*") || path.includes(":"))) {
        if (node.data) {
          table.static.set(path, node.data);
        }
      } else if (node.type === NODE_TYPES.WILDCARD) {
        table.wildcard.set(path.replace("/**", ""), node.data);
      } else if (node.type === NODE_TYPES.PLACEHOLDER) {
        const subTable = _routerNodeToTable("", node);
        if (node.data) {
          subTable.static.set("/", node.data);
        }
        table.dynamic.set(path.replace(/\/\*|\/:\w+/, ""), subTable);
        return;
      }
    }
    for (const [childPath, child] of node.children.entries()) {
      _addNode(`${path}/${childPath}`.replace("//", "/"), child);
    }
  }
  _addNode(initialPath, initialNode);
  return table;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}

function _defu(baseObject, defaults, namespace = ".", merger) {
  if (!isPlainObject(defaults)) {
    return _defu(baseObject, {}, namespace, merger);
  }
  const object = { ...defaults };
  for (const key of Object.keys(baseObject)) {
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = baseObject[key];
    if (value === null || value === void 0) {
      continue;
    }
    if (merger && merger(object, key, value, namespace)) {
      continue;
    }
    if (Array.isArray(value) && Array.isArray(object[key])) {
      object[key] = [...value, ...object[key]];
    } else if (isPlainObject(value) && isPlainObject(object[key])) {
      object[key] = _defu(
        value,
        object[key],
        (namespace ? `${namespace}.` : "") + key.toString(),
        merger
      );
    } else {
      object[key] = value;
    }
  }
  return object;
}
function createDefu(merger) {
  return (...arguments_) => (
    // eslint-disable-next-line unicorn/no-array-reduce
    arguments_.reduce((p, c) => _defu(p, c, "", merger), {})
  );
}
const defu = createDefu();
const defuFn = createDefu((object, key, currentValue) => {
  if (object[key] !== void 0 && typeof currentValue === "function") {
    object[key] = currentValue(object[key]);
    return true;
  }
});

function o(n){throw new Error(`${n} is not implemented yet!`)}let i$1 = class i extends EventEmitter{__unenv__={};readableEncoding=null;readableEnded=true;readableFlowing=false;readableHighWaterMark=0;readableLength=0;readableObjectMode=false;readableAborted=false;readableDidRead=false;closed=false;errored=null;readable=false;destroyed=false;static from(e,t){return new i(t)}constructor(e){super();}_read(e){}read(e){}setEncoding(e){return this}pause(){return this}resume(){return this}isPaused(){return  true}unpipe(e){return this}unshift(e,t){}wrap(e){return this}push(e,t){return  false}_destroy(e,t){this.removeAllListeners();}destroy(e){return this.destroyed=true,this._destroy(e),this}pipe(e,t){return {}}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return this.destroy(),Promise.resolve()}async*[Symbol.asyncIterator](){throw o("Readable.asyncIterator")}iterator(e){throw o("Readable.iterator")}map(e,t){throw o("Readable.map")}filter(e,t){throw o("Readable.filter")}forEach(e,t){throw o("Readable.forEach")}reduce(e,t,r){throw o("Readable.reduce")}find(e,t){throw o("Readable.find")}findIndex(e,t){throw o("Readable.findIndex")}some(e,t){throw o("Readable.some")}toArray(e){throw o("Readable.toArray")}every(e,t){throw o("Readable.every")}flatMap(e,t){throw o("Readable.flatMap")}drop(e,t){throw o("Readable.drop")}take(e,t){throw o("Readable.take")}asIndexedPairs(e){throw o("Readable.asIndexedPairs")}};let l$2 = class l extends EventEmitter{__unenv__={};writable=true;writableEnded=false;writableFinished=false;writableHighWaterMark=0;writableLength=0;writableObjectMode=false;writableCorked=0;closed=false;errored=null;writableNeedDrain=false;writableAborted=false;destroyed=false;_data;_encoding="utf8";constructor(e){super();}pipe(e,t){return {}}_write(e,t,r){if(this.writableEnded){r&&r();return}if(this._data===void 0)this._data=e;else {const s=typeof this._data=="string"?Buffer$1.from(this._data,this._encoding||t||"utf8"):this._data,a=typeof e=="string"?Buffer$1.from(e,t||this._encoding||"utf8"):e;this._data=Buffer$1.concat([s,a]);}this._encoding=t,r&&r();}_writev(e,t){}_destroy(e,t){}_final(e){}write(e,t,r){const s=typeof t=="string"?this._encoding:"utf8",a=typeof t=="function"?t:typeof r=="function"?r:void 0;return this._write(e,s,a),true}setDefaultEncoding(e){return this}end(e,t,r){const s=typeof e=="function"?e:typeof t=="function"?t:typeof r=="function"?r:void 0;if(this.writableEnded)return s&&s(),this;const a=e===s?void 0:e;if(a){const u=t===s?void 0:t;this.write(a,u,s);}return this.writableEnded=true,this.writableFinished=true,this.emit("close"),this.emit("finish"),this}cork(){}uncork(){}destroy(e){return this.destroyed=true,delete this._data,this.removeAllListeners(),this}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return Promise.resolve()}};const c=class{allowHalfOpen=true;_destroy;constructor(e=new i$1,t=new l$2){Object.assign(this,e),Object.assign(this,t),this._destroy=m$1(e._destroy,t._destroy);}};function _$2(){return Object.assign(c.prototype,i$1.prototype),Object.assign(c.prototype,l$2.prototype),c}function m$1(...n){return function(...e){for(const t of n)t(...e);}}const g$2=_$2();class A extends g$2{__unenv__={};bufferSize=0;bytesRead=0;bytesWritten=0;connecting=false;destroyed=false;pending=false;localAddress="";localPort=0;remoteAddress="";remoteFamily="";remotePort=0;autoSelectFamilyAttemptedAddresses=[];readyState="readOnly";constructor(e){super();}write(e,t,r){return  false}connect(e,t,r){return this}end(e,t,r){return this}setEncoding(e){return this}pause(){return this}resume(){return this}setTimeout(e,t){return this}setNoDelay(e){return this}setKeepAlive(e,t){return this}address(){return {}}unref(){return this}ref(){return this}destroySoon(){this.destroy();}resetAndDestroy(){const e=new Error("ERR_SOCKET_CLOSED");return e.code="ERR_SOCKET_CLOSED",this.destroy(e),this}}let y$2 = class y extends i$1{aborted=false;httpVersion="1.1";httpVersionMajor=1;httpVersionMinor=1;complete=true;connection;socket;headers={};trailers={};method="GET";url="/";statusCode=200;statusMessage="";closed=false;errored=null;readable=false;constructor(e){super(),this.socket=this.connection=e||new A;}get rawHeaders(){const e=this.headers,t=[];for(const r in e)if(Array.isArray(e[r]))for(const s of e[r])t.push(r,s);else t.push(r,e[r]);return t}get rawTrailers(){return []}setTimeout(e,t){return this}get headersDistinct(){return p(this.headers)}get trailersDistinct(){return p(this.trailers)}};function p(n){const e={};for(const[t,r]of Object.entries(n))t&&(e[t]=(Array.isArray(r)?r:[r]).filter(Boolean));return e}let w$1 = class w extends l$2{statusCode=200;statusMessage="";upgrading=false;chunkedEncoding=false;shouldKeepAlive=false;useChunkedEncodingByDefault=false;sendDate=false;finished=false;headersSent=false;strictContentLength=false;connection=null;socket=null;req;_headers={};constructor(e){super(),this.req=e;}assignSocket(e){e._httpMessage=this,this.socket=e,this.connection=e,this.emit("socket",e),this._flush();}_flush(){this.flushHeaders();}detachSocket(e){}writeContinue(e){}writeHead(e,t,r){e&&(this.statusCode=e),typeof t=="string"&&(this.statusMessage=t,t=void 0);const s=r||t;if(s&&!Array.isArray(s))for(const a in s)this.setHeader(a,s[a]);return this.headersSent=true,this}writeProcessing(){}setTimeout(e,t){return this}appendHeader(e,t){e=e.toLowerCase();const r=this._headers[e],s=[...Array.isArray(r)?r:[r],...Array.isArray(t)?t:[t]].filter(Boolean);return this._headers[e]=s.length>1?s:s[0],this}setHeader(e,t){return this._headers[e.toLowerCase()]=t,this}setHeaders(e){for(const[t,r]of Object.entries(e))this.setHeader(t,r);return this}getHeader(e){return this._headers[e.toLowerCase()]}getHeaders(){return this._headers}getHeaderNames(){return Object.keys(this._headers)}hasHeader(e){return e.toLowerCase()in this._headers}removeHeader(e){delete this._headers[e.toLowerCase()];}addTrailers(e){}flushHeaders(){}writeEarlyHints(e,t){typeof t=="function"&&t();}};const E$2=(()=>{const n=function(){};return n.prototype=Object.create(null),n})();function R$1(n={}){const e=new E$2,t=Array.isArray(n)||H$2(n)?n:Object.entries(n);for(const[r,s]of t)if(s){if(e[r]===void 0){e[r]=s;continue}e[r]=[...Array.isArray(e[r])?e[r]:[e[r]],...Array.isArray(s)?s:[s]];}return e}function H$2(n){return typeof n?.entries=="function"}function v$1(n={}){if(n instanceof Headers)return n;const e=new Headers;for(const[t,r]of Object.entries(n))if(r!==void 0){if(Array.isArray(r)){for(const s of r)e.append(t,String(s));continue}e.set(t,String(r));}return e}const S$2=new Set([101,204,205,304]);async function b$1(n,e){const t=new y$2,r=new w$1(t);t.url=e.url?.toString()||"/";let s;if(!t.url.startsWith("/")){const d=new URL(t.url);s=d.host,t.url=d.pathname+d.search+d.hash;}t.method=e.method||"GET",t.headers=R$1(e.headers||{}),t.headers.host||(t.headers.host=e.host||s||"localhost"),t.connection.encrypted=t.connection.encrypted||e.protocol==="https",t.body=e.body||null,t.__unenv__=e.context,await n(t,r);let a=r._data;(S$2.has(r.statusCode)||t.method.toUpperCase()==="HEAD")&&(a=null,delete r._headers["content-length"]);const u={status:r.statusCode,statusText:r.statusMessage,headers:r._headers,body:a};return t.destroy(),r.destroy(),u}async function C$1(n,e,t={}){try{const r=await b$1(n,{url:e,...t});return new Response(r.body,{status:r.status,statusText:r.statusText,headers:v$1(r.headers)})}catch(r){return new Response(r.toString(),{status:Number.parseInt(r.statusCode||r.code)||500,statusText:r.statusText})}}

function hasProp(obj, prop) {
  try {
    return prop in obj;
  } catch {
    return false;
  }
}

class H3Error extends Error {
  static __h3_error__ = true;
  statusCode = 500;
  fatal = false;
  unhandled = false;
  statusMessage;
  data;
  cause;
  constructor(message, opts = {}) {
    super(message, opts);
    if (opts.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
  toJSON() {
    const obj = {
      message: this.message,
      statusCode: sanitizeStatusCode(this.statusCode, 500)
    };
    if (this.statusMessage) {
      obj.statusMessage = sanitizeStatusMessage(this.statusMessage);
    }
    if (this.data !== void 0) {
      obj.data = this.data;
    }
    return obj;
  }
}
function createError$1(input) {
  if (typeof input === "string") {
    return new H3Error(input);
  }
  if (isError(input)) {
    return input;
  }
  const err = new H3Error(input.message ?? input.statusMessage ?? "", {
    cause: input.cause || input
  });
  if (hasProp(input, "stack")) {
    try {
      Object.defineProperty(err, "stack", {
        get() {
          return input.stack;
        }
      });
    } catch {
      try {
        err.stack = input.stack;
      } catch {
      }
    }
  }
  if (input.data) {
    err.data = input.data;
  }
  if (input.statusCode) {
    err.statusCode = sanitizeStatusCode(input.statusCode, err.statusCode);
  } else if (input.status) {
    err.statusCode = sanitizeStatusCode(input.status, err.statusCode);
  }
  if (input.statusMessage) {
    err.statusMessage = input.statusMessage;
  } else if (input.statusText) {
    err.statusMessage = input.statusText;
  }
  if (err.statusMessage) {
    const originalMessage = err.statusMessage;
    const sanitizedMessage = sanitizeStatusMessage(err.statusMessage);
    if (sanitizedMessage !== originalMessage) {
      console.warn(
        "[h3] Please prefer using `message` for longer error messages instead of `statusMessage`. In the future, `statusMessage` will be sanitized by default."
      );
    }
  }
  if (input.fatal !== void 0) {
    err.fatal = input.fatal;
  }
  if (input.unhandled !== void 0) {
    err.unhandled = input.unhandled;
  }
  return err;
}
function sendError(event, error, debug) {
  if (event.handled) {
    return;
  }
  const h3Error = isError(error) ? error : createError$1(error);
  const responseBody = {
    statusCode: h3Error.statusCode,
    statusMessage: h3Error.statusMessage,
    stack: [],
    data: h3Error.data
  };
  if (debug) {
    responseBody.stack = (h3Error.stack || "").split("\n").map((l) => l.trim());
  }
  if (event.handled) {
    return;
  }
  const _code = Number.parseInt(h3Error.statusCode);
  setResponseStatus(event, _code, h3Error.statusMessage);
  event.node.res.setHeader("content-type", MIMES.json);
  event.node.res.end(JSON.stringify(responseBody, void 0, 2));
}
function isError(input) {
  return input?.constructor?.__h3_error__ === true;
}
function isMethod(event, expected, allowHead) {
  if (typeof expected === "string") {
    if (event.method === expected) {
      return true;
    }
  } else if (expected.includes(event.method)) {
    return true;
  }
  return false;
}
function assertMethod(event, expected, allowHead) {
  if (!isMethod(event, expected)) {
    throw createError$1({
      statusCode: 405,
      statusMessage: "HTTP method is not allowed."
    });
  }
}
function getRequestHeaders(event) {
  const _headers = {};
  for (const key in event.node.req.headers) {
    const val = event.node.req.headers[key];
    _headers[key] = Array.isArray(val) ? val.filter(Boolean).join(", ") : val;
  }
  return _headers;
}
function getRequestHeader(event, name) {
  const headers = getRequestHeaders(event);
  const value = headers[name.toLowerCase()];
  return value;
}
function getRequestHost(event, opts = {}) {
  if (opts.xForwardedHost) {
    const _header = event.node.req.headers["x-forwarded-host"];
    const xForwardedHost = (_header || "").split(",").shift()?.trim();
    if (xForwardedHost) {
      return xForwardedHost;
    }
  }
  return event.node.req.headers.host || "localhost";
}
function getRequestProtocol(event, opts = {}) {
  if (opts.xForwardedProto !== false && event.node.req.headers["x-forwarded-proto"] === "https") {
    return "https";
  }
  return event.node.req.connection?.encrypted ? "https" : "http";
}
function getRequestURL(event, opts = {}) {
  const host = getRequestHost(event, opts);
  const protocol = getRequestProtocol(event, opts);
  const path = (event.node.req.originalUrl || event.path).replace(
    /^[/\\]+/g,
    "/"
  );
  return new URL(path, `${protocol}://${host}`);
}
function getRequestIP(event, opts = {}) {
  if (event.context.clientAddress) {
    return event.context.clientAddress;
  }
  if (opts.xForwardedFor) {
    const xForwardedFor = getRequestHeader(event, "x-forwarded-for")?.split(",").shift()?.trim();
    if (xForwardedFor) {
      return xForwardedFor;
    }
  }
  if (event.node.req.socket.remoteAddress) {
    return event.node.req.socket.remoteAddress;
  }
}

const RawBodySymbol = Symbol.for("h3RawBody");
const PayloadMethods$1 = ["PATCH", "POST", "PUT", "DELETE"];
function readRawBody(event, encoding = "utf8") {
  assertMethod(event, PayloadMethods$1);
  const _rawBody = event._requestBody || event.web?.request?.body || event.node.req[RawBodySymbol] || event.node.req.rawBody || event.node.req.body;
  if (_rawBody) {
    const promise2 = Promise.resolve(_rawBody).then((_resolved) => {
      if (Buffer.isBuffer(_resolved)) {
        return _resolved;
      }
      if (typeof _resolved.pipeTo === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.pipeTo(
            new WritableStream({
              write(chunk) {
                chunks.push(chunk);
              },
              close() {
                resolve(Buffer.concat(chunks));
              },
              abort(reason) {
                reject(reason);
              }
            })
          ).catch(reject);
        });
      } else if (typeof _resolved.pipe === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.on("data", (chunk) => {
            chunks.push(chunk);
          }).on("end", () => {
            resolve(Buffer.concat(chunks));
          }).on("error", reject);
        });
      }
      if (_resolved.constructor === Object) {
        return Buffer.from(JSON.stringify(_resolved));
      }
      if (_resolved instanceof URLSearchParams) {
        return Buffer.from(_resolved.toString());
      }
      if (_resolved instanceof FormData) {
        return new Response(_resolved).bytes().then((uint8arr) => Buffer.from(uint8arr));
      }
      return Buffer.from(_resolved);
    });
    return encoding ? promise2.then((buff) => buff.toString(encoding)) : promise2;
  }
  if (!Number.parseInt(event.node.req.headers["content-length"] || "") && !/\bchunked\b/i.test(
    String(event.node.req.headers["transfer-encoding"] ?? "")
  )) {
    return Promise.resolve(void 0);
  }
  const promise = event.node.req[RawBodySymbol] = new Promise(
    (resolve, reject) => {
      const bodyData = [];
      event.node.req.on("error", (err) => {
        reject(err);
      }).on("data", (chunk) => {
        bodyData.push(chunk);
      }).on("end", () => {
        resolve(Buffer.concat(bodyData));
      });
    }
  );
  const result = encoding ? promise.then((buff) => buff.toString(encoding)) : promise;
  return result;
}
function getRequestWebStream(event) {
  if (!PayloadMethods$1.includes(event.method)) {
    return;
  }
  const bodyStream = event.web?.request?.body || event._requestBody;
  if (bodyStream) {
    return bodyStream;
  }
  const _hasRawBody = RawBodySymbol in event.node.req || "rawBody" in event.node.req || "body" in event.node.req || "__unenv__" in event.node.req;
  if (_hasRawBody) {
    return new ReadableStream({
      async start(controller) {
        const _rawBody = await readRawBody(event, false);
        if (_rawBody) {
          controller.enqueue(_rawBody);
        }
        controller.close();
      }
    });
  }
  return new ReadableStream({
    start: (controller) => {
      event.node.req.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      event.node.req.on("end", () => {
        controller.close();
      });
      event.node.req.on("error", (err) => {
        controller.error(err);
      });
    }
  });
}

function handleCacheHeaders(event, opts) {
  const cacheControls = ["public", ...opts.cacheControls || []];
  let cacheMatched = false;
  if (opts.maxAge !== void 0) {
    cacheControls.push(`max-age=${+opts.maxAge}`, `s-maxage=${+opts.maxAge}`);
  }
  if (opts.modifiedTime) {
    const modifiedTime = new Date(opts.modifiedTime);
    const ifModifiedSince = event.node.req.headers["if-modified-since"];
    event.node.res.setHeader("last-modified", modifiedTime.toUTCString());
    if (ifModifiedSince && new Date(ifModifiedSince) >= modifiedTime) {
      cacheMatched = true;
    }
  }
  if (opts.etag) {
    event.node.res.setHeader("etag", opts.etag);
    const ifNonMatch = event.node.req.headers["if-none-match"];
    if (ifNonMatch === opts.etag) {
      cacheMatched = true;
    }
  }
  event.node.res.setHeader("cache-control", cacheControls.join(", "));
  if (cacheMatched) {
    event.node.res.statusCode = 304;
    if (!event.handled) {
      event.node.res.end();
    }
    return true;
  }
  return false;
}

const MIMES = {
  html: "text/html",
  json: "application/json"
};

const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
  if (!statusCode) {
    return defaultStatusCode;
  }
  if (typeof statusCode === "string") {
    statusCode = Number.parseInt(statusCode, 10);
  }
  if (statusCode < 100 || statusCode > 999) {
    return defaultStatusCode;
  }
  return statusCode;
}

function getDistinctCookieKey(name, opts) {
  return [name, opts.domain || "", opts.path || "/"].join(";");
}

function parseCookies(event) {
  return parse(event.node.req.headers.cookie || "");
}
function getCookie(event, name) {
  return parseCookies(event)[name];
}
function setCookie(event, name, value, serializeOptions = {}) {
  if (!serializeOptions.path) {
    serializeOptions = { path: "/", ...serializeOptions };
  }
  const newCookie = serialize$1(name, value, serializeOptions);
  const currentCookies = splitCookiesString(
    event.node.res.getHeader("set-cookie")
  );
  if (currentCookies.length === 0) {
    event.node.res.setHeader("set-cookie", newCookie);
    return;
  }
  const newCookieKey = getDistinctCookieKey(name, serializeOptions);
  event.node.res.removeHeader("set-cookie");
  for (const cookie of currentCookies) {
    const parsed = parseSetCookie(cookie);
    const key = getDistinctCookieKey(parsed.name, parsed);
    if (key === newCookieKey) {
      continue;
    }
    event.node.res.appendHeader("set-cookie", cookie);
  }
  event.node.res.appendHeader("set-cookie", newCookie);
}
function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString.flatMap((c) => splitCookiesString(c));
  }
  if (typeof cookiesString !== "string") {
    return [];
  }
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.slice(start));
    }
  }
  return cookiesStrings;
}

const defer = typeof setImmediate === "undefined" ? (fn) => fn() : setImmediate;
function send(event, data, type) {
  if (type) {
    defaultContentType(event, type);
  }
  return new Promise((resolve) => {
    defer(() => {
      if (!event.handled) {
        event.node.res.end(data);
      }
      resolve();
    });
  });
}
function sendNoContent(event, code) {
  if (event.handled) {
    return;
  }
  if (!code && event.node.res.statusCode !== 200) {
    code = event.node.res.statusCode;
  }
  const _code = sanitizeStatusCode(code, 204);
  if (_code === 204) {
    event.node.res.removeHeader("content-length");
  }
  event.node.res.writeHead(_code);
  event.node.res.end();
}
function setResponseStatus(event, code, text) {
  if (code) {
    event.node.res.statusCode = sanitizeStatusCode(
      code,
      event.node.res.statusCode
    );
  }
  if (text) {
    event.node.res.statusMessage = sanitizeStatusMessage(text);
  }
}
function getResponseStatus(event) {
  return event.node.res.statusCode;
}
function getResponseStatusText(event) {
  return event.node.res.statusMessage;
}
function defaultContentType(event, type) {
  if (type && event.node.res.statusCode !== 304 && !event.node.res.getHeader("content-type")) {
    event.node.res.setHeader("content-type", type);
  }
}
function sendRedirect(event, location, code = 302) {
  event.node.res.statusCode = sanitizeStatusCode(
    code,
    event.node.res.statusCode
  );
  event.node.res.setHeader("location", location);
  const encodedLoc = location.replace(/"/g, "%22");
  const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`;
  return send(event, html, MIMES.html);
}
function getResponseHeaders(event) {
  return event.node.res.getHeaders();
}
function getResponseHeader(event, name) {
  return event.node.res.getHeader(name);
}
function setResponseHeaders(event, headers) {
  for (const [name, value] of Object.entries(headers)) {
    event.node.res.setHeader(
      name,
      value
    );
  }
}
const setHeaders = setResponseHeaders;
function setResponseHeader(event, name, value) {
  event.node.res.setHeader(name, value);
}
const setHeader = setResponseHeader;
function appendResponseHeader(event, name, value) {
  let current = event.node.res.getHeader(name);
  if (!current) {
    event.node.res.setHeader(name, value);
    return;
  }
  if (!Array.isArray(current)) {
    current = [current.toString()];
  }
  event.node.res.setHeader(name, [...current, value]);
}
function removeResponseHeader(event, name) {
  return event.node.res.removeHeader(name);
}
function isStream(data) {
  if (!data || typeof data !== "object") {
    return false;
  }
  if (typeof data.pipe === "function") {
    if (typeof data._read === "function") {
      return true;
    }
    if (typeof data.abort === "function") {
      return true;
    }
  }
  if (typeof data.pipeTo === "function") {
    return true;
  }
  return false;
}
function isWebResponse(data) {
  return typeof Response !== "undefined" && data instanceof Response;
}
function sendStream(event, stream) {
  if (!stream || typeof stream !== "object") {
    throw new Error("[h3] Invalid stream provided.");
  }
  event.node.res._data = stream;
  if (!event.node.res.socket) {
    event._handled = true;
    return Promise.resolve();
  }
  if (hasProp(stream, "pipeTo") && typeof stream.pipeTo === "function") {
    return stream.pipeTo(
      new WritableStream({
        write(chunk) {
          event.node.res.write(chunk);
        }
      })
    ).then(() => {
      event.node.res.end();
    });
  }
  if (hasProp(stream, "pipe") && typeof stream.pipe === "function") {
    return new Promise((resolve, reject) => {
      stream.pipe(event.node.res);
      if (stream.on) {
        stream.on("end", () => {
          event.node.res.end();
          resolve();
        });
        stream.on("error", (error) => {
          reject(error);
        });
      }
      event.node.res.on("close", () => {
        if (stream.abort) {
          stream.abort();
        }
      });
    });
  }
  throw new Error("[h3] Invalid or incompatible stream provided.");
}
function sendWebResponse(event, response) {
  for (const [key, value] of response.headers) {
    if (key === "set-cookie") {
      event.node.res.appendHeader(key, splitCookiesString(value));
    } else {
      event.node.res.setHeader(key, value);
    }
  }
  if (response.status) {
    event.node.res.statusCode = sanitizeStatusCode(
      response.status,
      event.node.res.statusCode
    );
  }
  if (response.statusText) {
    event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  }
  if (response.redirected) {
    event.node.res.setHeader("location", response.url);
  }
  if (!response.body) {
    event.node.res.end();
    return;
  }
  return sendStream(event, response.body);
}

const PayloadMethods = /* @__PURE__ */ new Set(["PATCH", "POST", "PUT", "DELETE"]);
const ignoredHeaders = /* @__PURE__ */ new Set([
  "transfer-encoding",
  "accept-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  "expect",
  "host",
  "accept"
]);
async function proxyRequest(event, target, opts = {}) {
  let body;
  let duplex;
  if (PayloadMethods.has(event.method)) {
    if (opts.streamRequest) {
      body = getRequestWebStream(event);
      duplex = "half";
    } else {
      body = await readRawBody(event, false).catch(() => void 0);
    }
  }
  const method = opts.fetchOptions?.method || event.method;
  const fetchHeaders = mergeHeaders$1(
    getProxyRequestHeaders(event, { host: target.startsWith("/") }),
    opts.fetchOptions?.headers,
    opts.headers
  );
  return sendProxy(event, target, {
    ...opts,
    fetchOptions: {
      method,
      body,
      duplex,
      ...opts.fetchOptions,
      headers: fetchHeaders
    }
  });
}
async function sendProxy(event, target, opts = {}) {
  let response;
  try {
    response = await _getFetch(opts.fetch)(target, {
      headers: opts.headers,
      ignoreResponseError: true,
      // make $ofetch.raw transparent
      ...opts.fetchOptions
    });
  } catch (error) {
    throw createError$1({
      status: 502,
      statusMessage: "Bad Gateway",
      cause: error
    });
  }
  event.node.res.statusCode = sanitizeStatusCode(
    response.status,
    event.node.res.statusCode
  );
  event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  const cookies = [];
  for (const [key, value] of response.headers.entries()) {
    if (key === "content-encoding") {
      continue;
    }
    if (key === "content-length") {
      continue;
    }
    if (key === "set-cookie") {
      cookies.push(...splitCookiesString(value));
      continue;
    }
    event.node.res.setHeader(key, value);
  }
  if (cookies.length > 0) {
    event.node.res.setHeader(
      "set-cookie",
      cookies.map((cookie) => {
        if (opts.cookieDomainRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookieDomainRewrite,
            "domain"
          );
        }
        if (opts.cookiePathRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookiePathRewrite,
            "path"
          );
        }
        return cookie;
      })
    );
  }
  if (opts.onResponse) {
    await opts.onResponse(event, response);
  }
  if (response._data !== void 0) {
    return response._data;
  }
  if (event.handled) {
    return;
  }
  if (opts.sendStream === false) {
    const data = new Uint8Array(await response.arrayBuffer());
    return event.node.res.end(data);
  }
  if (response.body) {
    for await (const chunk of response.body) {
      event.node.res.write(chunk);
    }
  }
  return event.node.res.end();
}
function getProxyRequestHeaders(event, opts) {
  const headers = /* @__PURE__ */ Object.create(null);
  const reqHeaders = getRequestHeaders(event);
  for (const name in reqHeaders) {
    if (!ignoredHeaders.has(name) || name === "host" && opts?.host) {
      headers[name] = reqHeaders[name];
    }
  }
  return headers;
}
function fetchWithEvent(event, req, init, options) {
  return _getFetch(options?.fetch)(req, {
    ...init,
    context: init?.context || event.context,
    headers: {
      ...getProxyRequestHeaders(event, {
        host: typeof req === "string" && req.startsWith("/")
      }),
      ...init?.headers
    }
  });
}
function _getFetch(_fetch) {
  if (_fetch) {
    return _fetch;
  }
  if (globalThis.fetch) {
    return globalThis.fetch;
  }
  throw new Error(
    "fetch is not available. Try importing `node-fetch-native/polyfill` for Node.js."
  );
}
function rewriteCookieProperty(header, map, property) {
  const _map = typeof map === "string" ? { "*": map } : map;
  return header.replace(
    new RegExp(`(;\\s*${property}=)([^;]+)`, "gi"),
    (match, prefix, previousValue) => {
      let newValue;
      if (previousValue in _map) {
        newValue = _map[previousValue];
      } else if ("*" in _map) {
        newValue = _map["*"];
      } else {
        return match;
      }
      return newValue ? prefix + newValue : "";
    }
  );
}
function mergeHeaders$1(defaults, ...inputs) {
  const _inputs = inputs.filter(Boolean);
  if (_inputs.length === 0) {
    return defaults;
  }
  const merged = new Headers(defaults);
  for (const input of _inputs) {
    const entries = Array.isArray(input) ? input : typeof input.entries === "function" ? input.entries() : Object.entries(input);
    for (const [key, value] of entries) {
      if (value !== void 0) {
        merged.set(key, value);
      }
    }
  }
  return merged;
}

class H3Event {
  "__is_event__" = true;
  // Context
  node;
  // Node
  web;
  // Web
  context = {};
  // Shared
  // Request
  _method;
  _path;
  _headers;
  _requestBody;
  // Response
  _handled = false;
  // Hooks
  _onBeforeResponseCalled;
  _onAfterResponseCalled;
  constructor(req, res) {
    this.node = { req, res };
  }
  // --- Request ---
  get method() {
    if (!this._method) {
      this._method = (this.node.req.method || "GET").toUpperCase();
    }
    return this._method;
  }
  get path() {
    return this._path || this.node.req.url || "/";
  }
  get headers() {
    if (!this._headers) {
      this._headers = _normalizeNodeHeaders(this.node.req.headers);
    }
    return this._headers;
  }
  // --- Respoonse ---
  get handled() {
    return this._handled || this.node.res.writableEnded || this.node.res.headersSent;
  }
  respondWith(response) {
    return Promise.resolve(response).then(
      (_response) => sendWebResponse(this, _response)
    );
  }
  // --- Utils ---
  toString() {
    return `[${this.method}] ${this.path}`;
  }
  toJSON() {
    return this.toString();
  }
  // --- Deprecated ---
  /** @deprecated Please use `event.node.req` instead. */
  get req() {
    return this.node.req;
  }
  /** @deprecated Please use `event.node.res` instead. */
  get res() {
    return this.node.res;
  }
}
function isEvent(input) {
  return hasProp(input, "__is_event__");
}
function createEvent(req, res) {
  return new H3Event(req, res);
}
function _normalizeNodeHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value) {
      headers.set(name, value);
    }
  }
  return headers;
}

function defineEventHandler(handler) {
  if (typeof handler === "function") {
    handler.__is_handler__ = true;
    return handler;
  }
  const _hooks = {
    onRequest: _normalizeArray(handler.onRequest),
    onBeforeResponse: _normalizeArray(handler.onBeforeResponse)
  };
  const _handler = (event) => {
    return _callHandler(event, handler.handler, _hooks);
  };
  _handler.__is_handler__ = true;
  _handler.__resolve__ = handler.handler.__resolve__;
  _handler.__websocket__ = handler.websocket;
  return _handler;
}
function _normalizeArray(input) {
  return input ? Array.isArray(input) ? input : [input] : void 0;
}
async function _callHandler(event, handler, hooks) {
  if (hooks.onRequest) {
    for (const hook of hooks.onRequest) {
      await hook(event);
      if (event.handled) {
        return;
      }
    }
  }
  const body = await handler(event);
  const response = { body };
  if (hooks.onBeforeResponse) {
    for (const hook of hooks.onBeforeResponse) {
      await hook(event, response);
    }
  }
  return response.body;
}
const eventHandler = defineEventHandler;
function isEventHandler(input) {
  return hasProp(input, "__is_handler__");
}
function toEventHandler(input, _, _route) {
  return input;
}
function defineLazyEventHandler(factory) {
  let _promise;
  let _resolved;
  const resolveHandler = () => {
    if (_resolved) {
      return Promise.resolve(_resolved);
    }
    if (!_promise) {
      _promise = Promise.resolve(factory()).then((r) => {
        const handler2 = r.default || r;
        if (typeof handler2 !== "function") {
          throw new TypeError(
            "Invalid lazy handler result. It should be a function:",
            handler2
          );
        }
        _resolved = { handler: toEventHandler(r.default || r) };
        return _resolved;
      });
    }
    return _promise;
  };
  const handler = eventHandler((event) => {
    if (_resolved) {
      return _resolved.handler(event);
    }
    return resolveHandler().then((r) => r.handler(event));
  });
  handler.__resolve__ = resolveHandler;
  return handler;
}
const lazyEventHandler = defineLazyEventHandler;

function createApp(options = {}) {
  const stack = [];
  const handler = createAppEventHandler(stack, options);
  const resolve = createResolver(stack);
  handler.__resolve__ = resolve;
  const getWebsocket = cachedFn(() => websocketOptions(resolve, options));
  const app = {
    // @ts-expect-error
    use: (arg1, arg2, arg3) => use(app, arg1, arg2, arg3),
    resolve,
    handler,
    stack,
    options,
    get websocket() {
      return getWebsocket();
    }
  };
  return app;
}
function use(app, arg1, arg2, arg3) {
  if (Array.isArray(arg1)) {
    for (const i of arg1) {
      use(app, i, arg2, arg3);
    }
  } else if (Array.isArray(arg2)) {
    for (const i of arg2) {
      use(app, arg1, i, arg3);
    }
  } else if (typeof arg1 === "string") {
    app.stack.push(
      normalizeLayer({ ...arg3, route: arg1, handler: arg2 })
    );
  } else if (typeof arg1 === "function") {
    app.stack.push(normalizeLayer({ ...arg2, handler: arg1 }));
  } else {
    app.stack.push(normalizeLayer({ ...arg1 }));
  }
  return app;
}
function createAppEventHandler(stack, options) {
  const spacing = options.debug ? 2 : void 0;
  return eventHandler(async (event) => {
    event.node.req.originalUrl = event.node.req.originalUrl || event.node.req.url || "/";
    const _rawReqUrl = event.node.req.url || "/";
    const _reqPath = _decodePath(event._path || _rawReqUrl);
    event._path = _reqPath;
    const _needsRawUrl = _reqPath !== _rawReqUrl;
    let _layerPath;
    if (options.onRequest) {
      await options.onRequest(event);
    }
    for (const layer of stack) {
      if (layer.route.length > 1) {
        if (!_reqPath.startsWith(layer.route)) {
          continue;
        }
        _layerPath = _reqPath.slice(layer.route.length) || "/";
      } else {
        _layerPath = _reqPath;
      }
      if (layer.match && !layer.match(_layerPath, event)) {
        continue;
      }
      event._path = _layerPath;
      event.node.req.url = _needsRawUrl ? layer.route.length > 1 ? _rawReqUrl.slice(layer.route.length) || "/" : _rawReqUrl : _layerPath;
      const val = await layer.handler(event);
      const _body = val === void 0 ? void 0 : await val;
      if (_body !== void 0) {
        const _response = { body: _body };
        if (options.onBeforeResponse) {
          event._onBeforeResponseCalled = true;
          await options.onBeforeResponse(event, _response);
        }
        await handleHandlerResponse(event, _response.body, spacing);
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, _response);
        }
        return;
      }
      if (event.handled) {
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, void 0);
        }
        return;
      }
    }
    if (!event.handled) {
      throw createError$1({
        statusCode: 404,
        statusMessage: `Cannot find any path matching ${event.path || "/"}.`
      });
    }
    if (options.onAfterResponse) {
      event._onAfterResponseCalled = true;
      await options.onAfterResponse(event, void 0);
    }
  });
}
function createResolver(stack) {
  return async (path) => {
    let _layerPath;
    for (const layer of stack) {
      if (layer.route === "/" && !layer.handler.__resolve__) {
        continue;
      }
      if (!path.startsWith(layer.route)) {
        continue;
      }
      _layerPath = path.slice(layer.route.length) || "/";
      if (layer.match && !layer.match(_layerPath, void 0)) {
        continue;
      }
      let res = { route: layer.route, handler: layer.handler };
      if (res.handler.__resolve__) {
        const _res = await res.handler.__resolve__(_layerPath);
        if (!_res) {
          continue;
        }
        res = {
          ...res,
          ..._res,
          route: joinURL(res.route || "/", _res.route || "/")
        };
      }
      return res;
    }
  };
}
function normalizeLayer(input) {
  let handler = input.handler;
  if (handler.handler) {
    handler = handler.handler;
  }
  if (input.lazy) {
    handler = lazyEventHandler(handler);
  } else if (!isEventHandler(handler)) {
    handler = toEventHandler(handler, void 0, input.route);
  }
  return {
    route: withoutTrailingSlash(input.route),
    match: input.match,
    handler
  };
}
function handleHandlerResponse(event, val, jsonSpace) {
  if (val === null) {
    return sendNoContent(event);
  }
  if (val) {
    if (isWebResponse(val)) {
      return sendWebResponse(event, val);
    }
    if (isStream(val)) {
      return sendStream(event, val);
    }
    if (val.buffer) {
      return send(event, val);
    }
    if (val.arrayBuffer && typeof val.arrayBuffer === "function") {
      return val.arrayBuffer().then((arrayBuffer) => {
        return send(event, Buffer.from(arrayBuffer), val.type);
      });
    }
    if (val instanceof Error) {
      throw createError$1(val);
    }
    if (typeof val.end === "function") {
      return true;
    }
  }
  const valType = typeof val;
  if (valType === "string") {
    return send(event, val, MIMES.html);
  }
  if (valType === "object" || valType === "boolean" || valType === "number") {
    return send(event, JSON.stringify(val, void 0, jsonSpace), MIMES.json);
  }
  if (valType === "bigint") {
    return send(event, val.toString(), MIMES.json);
  }
  throw createError$1({
    statusCode: 500,
    statusMessage: `[h3] Cannot send ${valType} as response.`
  });
}
function cachedFn(fn) {
  let cache;
  return () => {
    if (!cache) {
      cache = fn();
    }
    return cache;
  };
}
function _decodePath(url) {
  const qIndex = url.indexOf("?");
  const path = qIndex === -1 ? url : url.slice(0, qIndex);
  const query = qIndex === -1 ? "" : url.slice(qIndex);
  const decodedPath = path.includes("%25") ? decodePath(path.replace(/%25/g, "%2525")) : decodePath(path);
  return decodedPath + query;
}
function websocketOptions(evResolver, appOptions) {
  return {
    ...appOptions.websocket,
    async resolve(info) {
      const url = info.request?.url || info.url || "/";
      const { pathname } = typeof url === "string" ? parseURL(url) : url;
      const resolved = await evResolver(pathname);
      return resolved?.handler?.__websocket__ || {};
    }
  };
}

const RouterMethods = [
  "connect",
  "delete",
  "get",
  "head",
  "options",
  "post",
  "put",
  "trace",
  "patch"
];
function createRouter(opts = {}) {
  const _router = createRouter$1({});
  const routes = {};
  let _matcher;
  const router = {};
  const addRoute = (path, handler, method) => {
    let route = routes[path];
    if (!route) {
      routes[path] = route = { path, handlers: {} };
      _router.insert(path, route);
    }
    if (Array.isArray(method)) {
      for (const m of method) {
        addRoute(path, handler, m);
      }
    } else {
      route.handlers[method] = toEventHandler(handler);
    }
    return router;
  };
  router.use = router.add = (path, handler, method) => addRoute(path, handler, method || "all");
  for (const method of RouterMethods) {
    router[method] = (path, handle) => router.add(path, handle, method);
  }
  const matchHandler = (path = "/", method = "get") => {
    const qIndex = path.indexOf("?");
    if (qIndex !== -1) {
      path = path.slice(0, Math.max(0, qIndex));
    }
    const matched = _router.lookup(path);
    if (!matched || !matched.handlers) {
      return {
        error: createError$1({
          statusCode: 404,
          name: "Not Found",
          statusMessage: `Cannot find any route matching ${path || "/"}.`
        })
      };
    }
    let handler = matched.handlers[method] || matched.handlers.all;
    if (!handler) {
      if (!_matcher) {
        _matcher = toRouteMatcher(_router);
      }
      const _matches = _matcher.matchAll(path).reverse();
      for (const _match of _matches) {
        if (_match.handlers[method]) {
          handler = _match.handlers[method];
          matched.handlers[method] = matched.handlers[method] || handler;
          break;
        }
        if (_match.handlers.all) {
          handler = _match.handlers.all;
          matched.handlers.all = matched.handlers.all || handler;
          break;
        }
      }
    }
    if (!handler) {
      return {
        error: createError$1({
          statusCode: 405,
          name: "Method Not Allowed",
          statusMessage: `Method ${method} is not allowed on this route.`
        })
      };
    }
    return { matched, handler };
  };
  const isPreemptive = opts.preemptive || opts.preemtive;
  router.handler = eventHandler((event) => {
    const match = matchHandler(
      event.path,
      event.method.toLowerCase()
    );
    if ("error" in match) {
      if (isPreemptive) {
        throw match.error;
      } else {
        return;
      }
    }
    event.context.matchedRoute = match.matched;
    const params = match.matched.params || {};
    event.context.params = params;
    return Promise.resolve(match.handler(event)).then((res) => {
      if (res === void 0 && isPreemptive) {
        return null;
      }
      return res;
    });
  });
  router.handler.__resolve__ = async (path) => {
    path = withLeadingSlash(path);
    const match = matchHandler(path);
    if ("error" in match) {
      return;
    }
    let res = {
      route: match.matched.path,
      handler: match.handler
    };
    if (match.handler.__resolve__) {
      const _res = await match.handler.__resolve__(path);
      if (!_res) {
        return;
      }
      res = { ...res, ..._res };
    }
    return res;
  };
  return router;
}
function toNodeListener(app) {
  const toNodeHandle = async function(req, res) {
    const event = createEvent(req, res);
    try {
      await app.handler(event);
    } catch (_error) {
      const error = createError$1(_error);
      if (!isError(_error)) {
        error.unhandled = true;
      }
      setResponseStatus(event, error.statusCode, error.statusMessage);
      if (app.options.onError) {
        await app.options.onError(error, event);
      }
      if (event.handled) {
        return;
      }
      if (error.unhandled || error.fatal) {
        console.error("[h3]", error.fatal ? "[fatal]" : "[unhandled]", error);
      }
      if (app.options.onBeforeResponse && !event._onBeforeResponseCalled) {
        await app.options.onBeforeResponse(event, { body: error });
      }
      await sendError(event, error, !!app.options.debug);
      if (app.options.onAfterResponse && !event._onAfterResponseCalled) {
        await app.options.onAfterResponse(event, { body: error });
      }
    }
  };
  return toNodeHandle;
}

function flatHooks(configHooks, hooks = {}, parentName) {
  for (const key in configHooks) {
    const subHook = configHooks[key];
    const name = parentName ? `${parentName}:${key}` : key;
    if (typeof subHook === "object" && subHook !== null) {
      flatHooks(subHook, hooks, name);
    } else if (typeof subHook === "function") {
      hooks[name] = subHook;
    }
  }
  return hooks;
}
const defaultTask = { run: (function_) => function_() };
const _createTask = () => defaultTask;
const createTask = typeof console.createTask !== "undefined" ? console.createTask : _createTask;
function serialTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return hooks.reduce(
    (promise, hookFunction) => promise.then(() => task.run(() => hookFunction(...args))),
    Promise.resolve()
  );
}
function parallelTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
}
function callEachWith(callbacks, arg0) {
  for (const callback of [...callbacks]) {
    callback(arg0);
  }
}

class Hookable {
  constructor() {
    this._hooks = {};
    this._before = void 0;
    this._after = void 0;
    this._deprecatedMessages = void 0;
    this._deprecatedHooks = {};
    this.hook = this.hook.bind(this);
    this.callHook = this.callHook.bind(this);
    this.callHookWith = this.callHookWith.bind(this);
  }
  hook(name, function_, options = {}) {
    if (!name || typeof function_ !== "function") {
      return () => {
      };
    }
    const originalName = name;
    let dep;
    while (this._deprecatedHooks[name]) {
      dep = this._deprecatedHooks[name];
      name = dep.to;
    }
    if (dep && !options.allowDeprecated) {
      let message = dep.message;
      if (!message) {
        message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
      }
      if (!this._deprecatedMessages) {
        this._deprecatedMessages = /* @__PURE__ */ new Set();
      }
      if (!this._deprecatedMessages.has(message)) {
        console.warn(message);
        this._deprecatedMessages.add(message);
      }
    }
    if (!function_.name) {
      try {
        Object.defineProperty(function_, "name", {
          get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
          configurable: true
        });
      } catch {
      }
    }
    this._hooks[name] = this._hooks[name] || [];
    this._hooks[name].push(function_);
    return () => {
      if (function_) {
        this.removeHook(name, function_);
        function_ = void 0;
      }
    };
  }
  hookOnce(name, function_) {
    let _unreg;
    let _function = (...arguments_) => {
      if (typeof _unreg === "function") {
        _unreg();
      }
      _unreg = void 0;
      _function = void 0;
      return function_(...arguments_);
    };
    _unreg = this.hook(name, _function);
    return _unreg;
  }
  removeHook(name, function_) {
    if (this._hooks[name]) {
      const index = this._hooks[name].indexOf(function_);
      if (index !== -1) {
        this._hooks[name].splice(index, 1);
      }
      if (this._hooks[name].length === 0) {
        delete this._hooks[name];
      }
    }
  }
  deprecateHook(name, deprecated) {
    this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
    const _hooks = this._hooks[name] || [];
    delete this._hooks[name];
    for (const hook of _hooks) {
      this.hook(name, hook);
    }
  }
  deprecateHooks(deprecatedHooks) {
    Object.assign(this._deprecatedHooks, deprecatedHooks);
    for (const name in deprecatedHooks) {
      this.deprecateHook(name, deprecatedHooks[name]);
    }
  }
  addHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    const removeFns = Object.keys(hooks).map(
      (key) => this.hook(key, hooks[key])
    );
    return () => {
      for (const unreg of removeFns.splice(0, removeFns.length)) {
        unreg();
      }
    };
  }
  removeHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    for (const key in hooks) {
      this.removeHook(key, hooks[key]);
    }
  }
  removeAllHooks() {
    for (const key in this._hooks) {
      delete this._hooks[key];
    }
  }
  callHook(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(serialTaskCaller, name, ...arguments_);
  }
  callHookParallel(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(parallelTaskCaller, name, ...arguments_);
  }
  callHookWith(caller, name, ...arguments_) {
    const event = this._before || this._after ? { name, args: arguments_, context: {} } : void 0;
    if (this._before) {
      callEachWith(this._before, event);
    }
    const result = caller(
      name in this._hooks ? [...this._hooks[name]] : [],
      arguments_
    );
    if (result instanceof Promise) {
      return result.finally(() => {
        if (this._after && event) {
          callEachWith(this._after, event);
        }
      });
    }
    if (this._after && event) {
      callEachWith(this._after, event);
    }
    return result;
  }
  beforeEach(function_) {
    this._before = this._before || [];
    this._before.push(function_);
    return () => {
      if (this._before !== void 0) {
        const index = this._before.indexOf(function_);
        if (index !== -1) {
          this._before.splice(index, 1);
        }
      }
    };
  }
  afterEach(function_) {
    this._after = this._after || [];
    this._after.push(function_);
    return () => {
      if (this._after !== void 0) {
        const index = this._after.indexOf(function_);
        if (index !== -1) {
          this._after.splice(index, 1);
        }
      }
    };
  }
}
function createHooks() {
  return new Hookable();
}

const s$2=globalThis.Headers,i=globalThis.AbortController,l$1=globalThis.fetch||(()=>{throw new Error("[node-fetch-native] Failed to fetch: `globalThis.fetch` is not available!")});

class FetchError extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "FetchError";
    if (opts?.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
}
function createFetchError(ctx) {
  const errorMessage = ctx.error?.message || ctx.error?.toString() || "";
  const method = ctx.request?.method || ctx.options?.method || "GET";
  const url = ctx.request?.url || String(ctx.request) || "/";
  const requestStr = `[${method}] ${JSON.stringify(url)}`;
  const statusStr = ctx.response ? `${ctx.response.status} ${ctx.response.statusText}` : "<no response>";
  const message = `${requestStr}: ${statusStr}${errorMessage ? ` ${errorMessage}` : ""}`;
  const fetchError = new FetchError(
    message,
    ctx.error ? { cause: ctx.error } : void 0
  );
  for (const key of ["request", "options", "response"]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx[key];
      }
    });
  }
  for (const [key, refKey] of [
    ["data", "_data"],
    ["status", "status"],
    ["statusCode", "status"],
    ["statusText", "statusText"],
    ["statusMessage", "statusText"]
  ]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx.response && ctx.response[refKey];
      }
    });
  }
  return fetchError;
}

const payloadMethods = new Set(
  Object.freeze(["PATCH", "POST", "PUT", "DELETE"])
);
function isPayloadMethod(method = "GET") {
  return payloadMethods.has(method.toUpperCase());
}
function isJSONSerializable(value) {
  if (value === void 0) {
    return false;
  }
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === null) {
    return true;
  }
  if (t !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  if (value.buffer) {
    return false;
  }
  if (value instanceof FormData || value instanceof URLSearchParams) {
    return false;
  }
  return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
}
const textTypes = /* @__PURE__ */ new Set([
  "image/svg",
  "application/xml",
  "application/xhtml",
  "application/html"
]);
const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
function detectResponseType(_contentType = "") {
  if (!_contentType) {
    return "json";
  }
  const contentType = _contentType.split(";").shift() || "";
  if (JSON_RE.test(contentType)) {
    return "json";
  }
  if (contentType === "text/event-stream") {
    return "stream";
  }
  if (textTypes.has(contentType) || contentType.startsWith("text/")) {
    return "text";
  }
  return "blob";
}
function resolveFetchOptions(request, input, defaults, Headers) {
  const headers = mergeHeaders(
    input?.headers ?? request?.headers,
    defaults?.headers,
    Headers
  );
  let query;
  if (defaults?.query || defaults?.params || input?.params || input?.query) {
    query = {
      ...defaults?.params,
      ...defaults?.query,
      ...input?.params,
      ...input?.query
    };
  }
  return {
    ...defaults,
    ...input,
    query,
    params: query,
    headers
  };
}
function mergeHeaders(input, defaults, Headers) {
  if (!defaults) {
    return new Headers(input);
  }
  const headers = new Headers(defaults);
  if (input) {
    for (const [key, value] of Symbol.iterator in input || Array.isArray(input) ? input : new Headers(input)) {
      headers.set(key, value);
    }
  }
  return headers;
}
async function callHooks(context, hooks) {
  if (hooks) {
    if (Array.isArray(hooks)) {
      for (const hook of hooks) {
        await hook(context);
      }
    } else {
      await hooks(context);
    }
  }
}

const retryStatusCodes = /* @__PURE__ */ new Set([
  408,
  // Request Timeout
  409,
  // Conflict
  425,
  // Too Early (Experimental)
  429,
  // Too Many Requests
  500,
  // Internal Server Error
  502,
  // Bad Gateway
  503,
  // Service Unavailable
  504
  // Gateway Timeout
]);
const nullBodyResponses = /* @__PURE__ */ new Set([101, 204, 205, 304]);
function createFetch(globalOptions = {}) {
  const {
    fetch = globalThis.fetch,
    Headers = globalThis.Headers,
    AbortController = globalThis.AbortController
  } = globalOptions;
  async function onError(context) {
    const isAbort = context.error && context.error.name === "AbortError" && !context.options.timeout || false;
    if (context.options.retry !== false && !isAbort) {
      let retries;
      if (typeof context.options.retry === "number") {
        retries = context.options.retry;
      } else {
        retries = isPayloadMethod(context.options.method) ? 0 : 1;
      }
      const responseCode = context.response && context.response.status || 500;
      if (retries > 0 && (Array.isArray(context.options.retryStatusCodes) ? context.options.retryStatusCodes.includes(responseCode) : retryStatusCodes.has(responseCode))) {
        const retryDelay = typeof context.options.retryDelay === "function" ? context.options.retryDelay(context) : context.options.retryDelay || 0;
        if (retryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
        return $fetchRaw(context.request, {
          ...context.options,
          retry: retries - 1
        });
      }
    }
    const error = createFetchError(context);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(error, $fetchRaw);
    }
    throw error;
  }
  const $fetchRaw = async function $fetchRaw2(_request, _options = {}) {
    const context = {
      request: _request,
      options: resolveFetchOptions(
        _request,
        _options,
        globalOptions.defaults,
        Headers
      ),
      response: void 0,
      error: void 0
    };
    if (context.options.method) {
      context.options.method = context.options.method.toUpperCase();
    }
    if (context.options.onRequest) {
      await callHooks(context, context.options.onRequest);
      if (!(context.options.headers instanceof Headers)) {
        context.options.headers = new Headers(
          context.options.headers || {}
          /* compat */
        );
      }
    }
    if (typeof context.request === "string") {
      if (context.options.baseURL) {
        context.request = withBase(context.request, context.options.baseURL);
      }
      if (context.options.query) {
        context.request = withQuery(context.request, context.options.query);
        delete context.options.query;
      }
      if ("query" in context.options) {
        delete context.options.query;
      }
      if ("params" in context.options) {
        delete context.options.params;
      }
    }
    if (context.options.body && isPayloadMethod(context.options.method)) {
      if (isJSONSerializable(context.options.body)) {
        const contentType = context.options.headers.get("content-type");
        if (typeof context.options.body !== "string") {
          context.options.body = contentType === "application/x-www-form-urlencoded" ? new URLSearchParams(
            context.options.body
          ).toString() : JSON.stringify(context.options.body);
        }
        if (!contentType) {
          context.options.headers.set("content-type", "application/json");
        }
        if (!context.options.headers.has("accept")) {
          context.options.headers.set("accept", "application/json");
        }
      } else if (
        // ReadableStream Body
        "pipeTo" in context.options.body && typeof context.options.body.pipeTo === "function" || // Node.js Stream Body
        typeof context.options.body.pipe === "function"
      ) {
        if (!("duplex" in context.options)) {
          context.options.duplex = "half";
        }
      }
    }
    let abortTimeout;
    if (!context.options.signal && context.options.timeout) {
      const controller = new AbortController();
      abortTimeout = setTimeout(() => {
        const error = new Error(
          "[TimeoutError]: The operation was aborted due to timeout"
        );
        error.name = "TimeoutError";
        error.code = 23;
        controller.abort(error);
      }, context.options.timeout);
      context.options.signal = controller.signal;
    }
    try {
      context.response = await fetch(
        context.request,
        context.options
      );
    } catch (error) {
      context.error = error;
      if (context.options.onRequestError) {
        await callHooks(
          context,
          context.options.onRequestError
        );
      }
      return await onError(context);
    } finally {
      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }
    }
    const hasBody = (context.response.body || // https://github.com/unjs/ofetch/issues/324
    // https://github.com/unjs/ofetch/issues/294
    // https://github.com/JakeChampion/fetch/issues/1454
    context.response._bodyInit) && !nullBodyResponses.has(context.response.status) && context.options.method !== "HEAD";
    if (hasBody) {
      const responseType = (context.options.parseResponse ? "json" : context.options.responseType) || detectResponseType(context.response.headers.get("content-type") || "");
      switch (responseType) {
        case "json": {
          const data = await context.response.text();
          const parseFunction = context.options.parseResponse || destr;
          context.response._data = parseFunction(data);
          break;
        }
        case "stream": {
          context.response._data = context.response.body || context.response._bodyInit;
          break;
        }
        default: {
          context.response._data = await context.response[responseType]();
        }
      }
    }
    if (context.options.onResponse) {
      await callHooks(
        context,
        context.options.onResponse
      );
    }
    if (!context.options.ignoreResponseError && context.response.status >= 400 && context.response.status < 600) {
      if (context.options.onResponseError) {
        await callHooks(
          context,
          context.options.onResponseError
        );
      }
      return await onError(context);
    }
    return context.response;
  };
  const $fetch = async function $fetch2(request, options) {
    const r = await $fetchRaw(request, options);
    return r._data;
  };
  $fetch.raw = $fetchRaw;
  $fetch.native = (...args) => fetch(...args);
  $fetch.create = (defaultOptions = {}, customGlobalOptions = {}) => createFetch({
    ...globalOptions,
    ...customGlobalOptions,
    defaults: {
      ...globalOptions.defaults,
      ...customGlobalOptions.defaults,
      ...defaultOptions
    }
  });
  return $fetch;
}

function createNodeFetch() {
  const useKeepAlive = JSON.parse(process.env.FETCH_KEEP_ALIVE || "false");
  if (!useKeepAlive) {
    return l$1;
  }
  const agentOptions = { keepAlive: true };
  const httpAgent = new http.Agent(agentOptions);
  const httpsAgent = new https.Agent(agentOptions);
  const nodeFetchOptions = {
    agent(parsedURL) {
      return parsedURL.protocol === "http:" ? httpAgent : httpsAgent;
    }
  };
  return function nodeFetchWithKeepAlive(input, init) {
    return l$1(input, { ...nodeFetchOptions, ...init });
  };
}
const fetch = globalThis.fetch ? (...args) => globalThis.fetch(...args) : createNodeFetch();
const Headers$1 = globalThis.Headers || s$2;
const AbortController$1 = globalThis.AbortController || i;
createFetch({ fetch, Headers: Headers$1, AbortController: AbortController$1 });

function wrapToPromise(value) {
  if (!value || typeof value.then !== "function") {
    return Promise.resolve(value);
  }
  return value;
}
function asyncCall(function_, ...arguments_) {
  try {
    return wrapToPromise(function_(...arguments_));
  } catch (error) {
    return Promise.reject(error);
  }
}
function isPrimitive(value) {
  const type = typeof value;
  return value === null || type !== "object" && type !== "function";
}
function isPureObject(value) {
  const proto = Object.getPrototypeOf(value);
  return !proto || proto.isPrototypeOf(Object);
}
function stringify(value) {
  if (isPrimitive(value)) {
    return String(value);
  }
  if (isPureObject(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value.toJSON === "function") {
    return stringify(value.toJSON());
  }
  throw new Error("[unstorage] Cannot stringify value!");
}
const BASE64_PREFIX = "base64:";
function serializeRaw(value) {
  if (typeof value === "string") {
    return value;
  }
  return BASE64_PREFIX + base64Encode(value);
}
function deserializeRaw(value) {
  if (typeof value !== "string") {
    return value;
  }
  if (!value.startsWith(BASE64_PREFIX)) {
    return value;
  }
  return base64Decode(value.slice(BASE64_PREFIX.length));
}
function base64Decode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input, "base64");
  }
  return Uint8Array.from(
    globalThis.atob(input),
    (c) => c.codePointAt(0)
  );
}
function base64Encode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input).toString("base64");
  }
  return globalThis.btoa(String.fromCodePoint(...input));
}

const storageKeyProperties = [
  "has",
  "hasItem",
  "get",
  "getItem",
  "getItemRaw",
  "set",
  "setItem",
  "setItemRaw",
  "del",
  "remove",
  "removeItem",
  "getMeta",
  "setMeta",
  "removeMeta",
  "getKeys",
  "clear",
  "mount",
  "unmount"
];
function prefixStorage(storage, base) {
  base = normalizeBaseKey(base);
  if (!base) {
    return storage;
  }
  const nsStorage = { ...storage };
  for (const property of storageKeyProperties) {
    nsStorage[property] = (key = "", ...args) => (
      // @ts-ignore
      storage[property](base + key, ...args)
    );
  }
  nsStorage.getKeys = (key = "", ...arguments_) => storage.getKeys(base + key, ...arguments_).then((keys) => keys.map((key2) => key2.slice(base.length)));
  nsStorage.keys = nsStorage.getKeys;
  nsStorage.getItems = async (items, commonOptions) => {
    const prefixedItems = items.map(
      (item) => typeof item === "string" ? base + item : { ...item, key: base + item.key }
    );
    const results = await storage.getItems(prefixedItems, commonOptions);
    return results.map((entry) => ({
      key: entry.key.slice(base.length),
      value: entry.value
    }));
  };
  nsStorage.setItems = async (items, commonOptions) => {
    const prefixedItems = items.map((item) => ({
      key: base + item.key,
      value: item.value,
      options: item.options
    }));
    return storage.setItems(prefixedItems, commonOptions);
  };
  return nsStorage;
}
function normalizeKey$1(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
}
function joinKeys(...keys) {
  return normalizeKey$1(keys.join(":"));
}
function normalizeBaseKey(base) {
  base = normalizeKey$1(base);
  return base ? base + ":" : "";
}
function filterKeyByDepth(key, depth) {
  if (depth === void 0) {
    return true;
  }
  let substrCount = 0;
  let index = key.indexOf(":");
  while (index > -1) {
    substrCount++;
    index = key.indexOf(":", index + 1);
  }
  return substrCount <= depth;
}
function filterKeyByBase(key, base) {
  if (base) {
    return key.startsWith(base) && key[key.length - 1] !== "$";
  }
  return key[key.length - 1] !== "$";
}

function defineDriver$1(factory) {
  return factory;
}

const DRIVER_NAME$1 = "memory";
const memory = defineDriver$1(() => {
  const data = /* @__PURE__ */ new Map();
  return {
    name: DRIVER_NAME$1,
    getInstance: () => data,
    hasItem(key) {
      return data.has(key);
    },
    getItem(key) {
      return data.get(key) ?? null;
    },
    getItemRaw(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    setItemRaw(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
    getKeys() {
      return [...data.keys()];
    },
    clear() {
      data.clear();
    },
    dispose() {
      data.clear();
    }
  };
});

function createStorage(options = {}) {
  const context = {
    mounts: { "": options.driver || memory() },
    mountpoints: [""],
    watching: false,
    watchListeners: [],
    unwatch: {}
  };
  const getMount = (key) => {
    for (const base of context.mountpoints) {
      if (key.startsWith(base)) {
        return {
          base,
          relativeKey: key.slice(base.length),
          driver: context.mounts[base]
        };
      }
    }
    return {
      base: "",
      relativeKey: key,
      driver: context.mounts[""]
    };
  };
  const getMounts = (base, includeParent) => {
    return context.mountpoints.filter(
      (mountpoint) => mountpoint.startsWith(base) || includeParent && base.startsWith(mountpoint)
    ).map((mountpoint) => ({
      relativeBase: base.length > mountpoint.length ? base.slice(mountpoint.length) : void 0,
      mountpoint,
      driver: context.mounts[mountpoint]
    }));
  };
  const onChange = (event, key) => {
    if (!context.watching) {
      return;
    }
    key = normalizeKey$1(key);
    for (const listener of context.watchListeners) {
      listener(event, key);
    }
  };
  const startWatch = async () => {
    if (context.watching) {
      return;
    }
    context.watching = true;
    for (const mountpoint in context.mounts) {
      context.unwatch[mountpoint] = await watch(
        context.mounts[mountpoint],
        onChange,
        mountpoint
      );
    }
  };
  const stopWatch = async () => {
    if (!context.watching) {
      return;
    }
    for (const mountpoint in context.unwatch) {
      await context.unwatch[mountpoint]();
    }
    context.unwatch = {};
    context.watching = false;
  };
  const runBatch = (items, commonOptions, cb) => {
    const batches = /* @__PURE__ */ new Map();
    const getBatch = (mount) => {
      let batch = batches.get(mount.base);
      if (!batch) {
        batch = {
          driver: mount.driver,
          base: mount.base,
          items: []
        };
        batches.set(mount.base, batch);
      }
      return batch;
    };
    for (const item of items) {
      const isStringItem = typeof item === "string";
      const key = normalizeKey$1(isStringItem ? item : item.key);
      const value = isStringItem ? void 0 : item.value;
      const options2 = isStringItem || !item.options ? commonOptions : { ...commonOptions, ...item.options };
      const mount = getMount(key);
      getBatch(mount).items.push({
        key,
        value,
        relativeKey: mount.relativeKey,
        options: options2
      });
    }
    return Promise.all([...batches.values()].map((batch) => cb(batch))).then(
      (r) => r.flat()
    );
  };
  const storage = {
    // Item
    hasItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.hasItem, relativeKey, opts);
    },
    getItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => destr(value)
      );
    },
    getItems(items, commonOptions = {}) {
      return runBatch(items, commonOptions, (batch) => {
        if (batch.driver.getItems) {
          return asyncCall(
            batch.driver.getItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              options: item.options
            })),
            commonOptions
          ).then(
            (r) => r.map((item) => ({
              key: joinKeys(batch.base, item.key),
              value: destr(item.value)
            }))
          );
        }
        return Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.getItem,
              item.relativeKey,
              item.options
            ).then((value) => ({
              key: item.key,
              value: destr(value)
            }));
          })
        );
      });
    },
    getItemRaw(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.getItemRaw) {
        return asyncCall(driver.getItemRaw, relativeKey, opts);
      }
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => deserializeRaw(value)
      );
    },
    async setItem(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.setItem) {
        return;
      }
      await asyncCall(driver.setItem, relativeKey, stringify(value), opts);
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async setItems(items, commonOptions) {
      await runBatch(items, commonOptions, async (batch) => {
        if (batch.driver.setItems) {
          return asyncCall(
            batch.driver.setItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              value: stringify(item.value),
              options: item.options
            })),
            commonOptions
          );
        }
        if (!batch.driver.setItem) {
          return;
        }
        await Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.setItem,
              item.relativeKey,
              stringify(item.value),
              item.options
            );
          })
        );
      });
    },
    async setItemRaw(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key, opts);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.setItemRaw) {
        await asyncCall(driver.setItemRaw, relativeKey, value, opts);
      } else if (driver.setItem) {
        await asyncCall(driver.setItem, relativeKey, serializeRaw(value), opts);
      } else {
        return;
      }
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async removeItem(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { removeMeta: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.removeItem) {
        return;
      }
      await asyncCall(driver.removeItem, relativeKey, opts);
      if (opts.removeMeta || opts.removeMata) {
        await asyncCall(driver.removeItem, relativeKey + "$", opts);
      }
      if (!driver.watch) {
        onChange("remove", key);
      }
    },
    // Meta
    async getMeta(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { nativeOnly: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      const meta = /* @__PURE__ */ Object.create(null);
      if (driver.getMeta) {
        Object.assign(meta, await asyncCall(driver.getMeta, relativeKey, opts));
      }
      if (!opts.nativeOnly) {
        const value = await asyncCall(
          driver.getItem,
          relativeKey + "$",
          opts
        ).then((value_) => destr(value_));
        if (value && typeof value === "object") {
          if (typeof value.atime === "string") {
            value.atime = new Date(value.atime);
          }
          if (typeof value.mtime === "string") {
            value.mtime = new Date(value.mtime);
          }
          Object.assign(meta, value);
        }
      }
      return meta;
    },
    setMeta(key, value, opts = {}) {
      return this.setItem(key + "$", value, opts);
    },
    removeMeta(key, opts = {}) {
      return this.removeItem(key + "$", opts);
    },
    // Keys
    async getKeys(base, opts = {}) {
      base = normalizeBaseKey(base);
      const mounts = getMounts(base, true);
      let maskedMounts = [];
      const allKeys = [];
      let allMountsSupportMaxDepth = true;
      for (const mount of mounts) {
        if (!mount.driver.flags?.maxDepth) {
          allMountsSupportMaxDepth = false;
        }
        const rawKeys = await asyncCall(
          mount.driver.getKeys,
          mount.relativeBase,
          opts
        );
        for (const key of rawKeys) {
          const fullKey = mount.mountpoint + normalizeKey$1(key);
          if (!maskedMounts.some((p) => fullKey.startsWith(p))) {
            allKeys.push(fullKey);
          }
        }
        maskedMounts = [
          mount.mountpoint,
          ...maskedMounts.filter((p) => !p.startsWith(mount.mountpoint))
        ];
      }
      const shouldFilterByDepth = opts.maxDepth !== void 0 && !allMountsSupportMaxDepth;
      return allKeys.filter(
        (key) => (!shouldFilterByDepth || filterKeyByDepth(key, opts.maxDepth)) && filterKeyByBase(key, base)
      );
    },
    // Utils
    async clear(base, opts = {}) {
      base = normalizeBaseKey(base);
      await Promise.all(
        getMounts(base, false).map(async (m) => {
          if (m.driver.clear) {
            return asyncCall(m.driver.clear, m.relativeBase, opts);
          }
          if (m.driver.removeItem) {
            const keys = await m.driver.getKeys(m.relativeBase || "", opts);
            return Promise.all(
              keys.map((key) => m.driver.removeItem(key, opts))
            );
          }
        })
      );
    },
    async dispose() {
      await Promise.all(
        Object.values(context.mounts).map((driver) => dispose(driver))
      );
    },
    async watch(callback) {
      await startWatch();
      context.watchListeners.push(callback);
      return async () => {
        context.watchListeners = context.watchListeners.filter(
          (listener) => listener !== callback
        );
        if (context.watchListeners.length === 0) {
          await stopWatch();
        }
      };
    },
    async unwatch() {
      context.watchListeners = [];
      await stopWatch();
    },
    // Mount
    mount(base, driver) {
      base = normalizeBaseKey(base);
      if (base && context.mounts[base]) {
        throw new Error(`already mounted at ${base}`);
      }
      if (base) {
        context.mountpoints.push(base);
        context.mountpoints.sort((a, b) => b.length - a.length);
      }
      context.mounts[base] = driver;
      if (context.watching) {
        Promise.resolve(watch(driver, onChange, base)).then((unwatcher) => {
          context.unwatch[base] = unwatcher;
        }).catch(console.error);
      }
      return storage;
    },
    async unmount(base, _dispose = true) {
      base = normalizeBaseKey(base);
      if (!base || !context.mounts[base]) {
        return;
      }
      if (context.watching && base in context.unwatch) {
        context.unwatch[base]?.();
        delete context.unwatch[base];
      }
      if (_dispose) {
        await dispose(context.mounts[base]);
      }
      context.mountpoints = context.mountpoints.filter((key) => key !== base);
      delete context.mounts[base];
    },
    getMount(key = "") {
      key = normalizeKey$1(key) + ":";
      const m = getMount(key);
      return {
        driver: m.driver,
        base: m.base
      };
    },
    getMounts(base = "", opts = {}) {
      base = normalizeKey$1(base);
      const mounts = getMounts(base, opts.parents);
      return mounts.map((m) => ({
        driver: m.driver,
        base: m.mountpoint
      }));
    },
    // Aliases
    keys: (base, opts = {}) => storage.getKeys(base, opts),
    get: (key, opts = {}) => storage.getItem(key, opts),
    set: (key, value, opts = {}) => storage.setItem(key, value, opts),
    has: (key, opts = {}) => storage.hasItem(key, opts),
    del: (key, opts = {}) => storage.removeItem(key, opts),
    remove: (key, opts = {}) => storage.removeItem(key, opts)
  };
  return storage;
}
function watch(driver, onChange, base) {
  return driver.watch ? driver.watch((event, key) => onChange(event, base + key)) : () => {
  };
}
async function dispose(driver) {
  if (typeof driver.dispose === "function") {
    await asyncCall(driver.dispose);
  }
}

const _assets = {

};

const normalizeKey = function normalizeKey(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
};

const assets$1 = {
  getKeys() {
    return Promise.resolve(Object.keys(_assets))
  },
  hasItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(id in _assets)
  },
  getItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].import() : null)
  },
  getMeta (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].meta : {})
  }
};

function defineDriver(factory) {
  return factory;
}
function createError(driver, message, opts) {
  const err = new Error(`[unstorage] [${driver}] ${message}`, opts);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(err, createError);
  }
  return err;
}
function createRequiredError(driver, name) {
  if (Array.isArray(name)) {
    return createError(
      driver,
      `Missing some of the required options ${name.map((n) => "`" + n + "`").join(", ")}`
    );
  }
  return createError(driver, `Missing required option \`${name}\`.`);
}

function ignoreNotfound(err) {
  return err.code === "ENOENT" || err.code === "EISDIR" ? null : err;
}
function ignoreExists(err) {
  return err.code === "EEXIST" ? null : err;
}
async function writeFile(path, data, encoding) {
  await ensuredir(dirname$1(path));
  return promises.writeFile(path, data, encoding);
}
function readFile(path, encoding) {
  return promises.readFile(path, encoding).catch(ignoreNotfound);
}
function unlink(path) {
  return promises.unlink(path).catch(ignoreNotfound);
}
function readdir(dir) {
  return promises.readdir(dir, { withFileTypes: true }).catch(ignoreNotfound).then((r) => r || []);
}
async function ensuredir(dir) {
  if (existsSync(dir)) {
    return;
  }
  await ensuredir(dirname$1(dir)).catch(ignoreExists);
  await promises.mkdir(dir).catch(ignoreExists);
}
async function readdirRecursive(dir, ignore, maxDepth) {
  if (ignore && ignore(dir)) {
    return [];
  }
  const entries = await readdir(dir);
  const files = [];
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        if (maxDepth === void 0 || maxDepth > 0) {
          const dirFiles = await readdirRecursive(
            entryPath,
            ignore,
            maxDepth === void 0 ? void 0 : maxDepth - 1
          );
          files.push(...dirFiles.map((f) => entry.name + "/" + f));
        }
      } else {
        if (!(ignore && ignore(entry.name))) {
          files.push(entry.name);
        }
      }
    })
  );
  return files;
}
async function rmRecursive(dir) {
  const entries = await readdir(dir);
  await Promise.all(
    entries.map((entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        return rmRecursive(entryPath).then(() => promises.rmdir(entryPath));
      } else {
        return promises.unlink(entryPath);
      }
    })
  );
}

const PATH_TRAVERSE_RE = /\.\.:|\.\.$/;
const DRIVER_NAME = "fs-lite";
const unstorage_47drivers_47fs_45lite = defineDriver((opts = {}) => {
  if (!opts.base) {
    throw createRequiredError(DRIVER_NAME, "base");
  }
  opts.base = resolve$1(opts.base);
  const r = (key) => {
    if (PATH_TRAVERSE_RE.test(key)) {
      throw createError(
        DRIVER_NAME,
        `Invalid key: ${JSON.stringify(key)}. It should not contain .. segments`
      );
    }
    const resolved = join(opts.base, key.replace(/:/g, "/"));
    return resolved;
  };
  return {
    name: DRIVER_NAME,
    options: opts,
    flags: {
      maxDepth: true
    },
    hasItem(key) {
      return existsSync(r(key));
    },
    getItem(key) {
      return readFile(r(key), "utf8");
    },
    getItemRaw(key) {
      return readFile(r(key));
    },
    async getMeta(key) {
      const { atime, mtime, size, birthtime, ctime } = await promises.stat(r(key)).catch(() => ({}));
      return { atime, mtime, size, birthtime, ctime };
    },
    setItem(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value, "utf8");
    },
    setItemRaw(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value);
    },
    removeItem(key) {
      if (opts.readOnly) {
        return;
      }
      return unlink(r(key));
    },
    getKeys(_base, topts) {
      return readdirRecursive(r("."), opts.ignore, topts?.maxDepth);
    },
    async clear() {
      if (opts.readOnly || opts.noClear) {
        return;
      }
      await rmRecursive(r("."));
    }
  };
});

const storage = createStorage({});

storage.mount('/assets', assets$1);

storage.mount('data', unstorage_47drivers_47fs_45lite({"driver":"fsLite","base":"./.data/kv"}));

function useStorage(base = "") {
  return base ? prefixStorage(storage, base) : storage;
}

const e=globalThis.process?.getBuiltinModule?.("crypto")?.hash,r="sha256",s$1="base64url";function digest(t){if(e)return e(r,t,s$1);const o=createHash(r).update(t);return globalThis.process?.versions?.webcontainer?o.digest().toString(s$1):o.digest(s$1)}

const Hasher = /* @__PURE__ */ (() => {
  class Hasher2 {
    buff = "";
    #context = /* @__PURE__ */ new Map();
    write(str) {
      this.buff += str;
    }
    dispatch(value) {
      const type = value === null ? "null" : typeof value;
      return this[type](value);
    }
    object(object) {
      if (object && typeof object.toJSON === "function") {
        return this.object(object.toJSON());
      }
      const objString = Object.prototype.toString.call(object);
      let objType = "";
      const objectLength = objString.length;
      objType = objectLength < 10 ? "unknown:[" + objString + "]" : objString.slice(8, objectLength - 1);
      objType = objType.toLowerCase();
      let objectNumber = null;
      if ((objectNumber = this.#context.get(object)) === void 0) {
        this.#context.set(object, this.#context.size);
      } else {
        return this.dispatch("[CIRCULAR:" + objectNumber + "]");
      }
      if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(object)) {
        this.write("buffer:");
        return this.write(object.toString("utf8"));
      }
      if (objType !== "object" && objType !== "function" && objType !== "asyncfunction") {
        if (this[objType]) {
          this[objType](object);
        } else {
          this.unknown(object, objType);
        }
      } else {
        const keys = Object.keys(object).sort();
        const extraKeys = [];
        this.write("object:" + (keys.length + extraKeys.length) + ":");
        const dispatchForKey = (key) => {
          this.dispatch(key);
          this.write(":");
          this.dispatch(object[key]);
          this.write(",");
        };
        for (const key of keys) {
          dispatchForKey(key);
        }
        for (const key of extraKeys) {
          dispatchForKey(key);
        }
      }
    }
    array(arr, unordered) {
      unordered = unordered === void 0 ? false : unordered;
      this.write("array:" + arr.length + ":");
      if (!unordered || arr.length <= 1) {
        for (const entry of arr) {
          this.dispatch(entry);
        }
        return;
      }
      const contextAdditions = /* @__PURE__ */ new Map();
      const entries = arr.map((entry) => {
        const hasher = new Hasher2();
        hasher.dispatch(entry);
        for (const [key, value] of hasher.#context) {
          contextAdditions.set(key, value);
        }
        return hasher.toString();
      });
      this.#context = contextAdditions;
      entries.sort();
      return this.array(entries, false);
    }
    date(date) {
      return this.write("date:" + date.toJSON());
    }
    symbol(sym) {
      return this.write("symbol:" + sym.toString());
    }
    unknown(value, type) {
      this.write(type);
      if (!value) {
        return;
      }
      this.write(":");
      if (value && typeof value.entries === "function") {
        return this.array(
          [...value.entries()],
          true
          /* ordered */
        );
      }
    }
    error(err) {
      return this.write("error:" + err.toString());
    }
    boolean(bool) {
      return this.write("bool:" + bool);
    }
    string(string) {
      this.write("string:" + string.length + ":");
      this.write(string);
    }
    function(fn) {
      this.write("fn:");
      if (isNativeFunction(fn)) {
        this.dispatch("[native]");
      } else {
        this.dispatch(fn.toString());
      }
    }
    number(number) {
      return this.write("number:" + number);
    }
    null() {
      return this.write("Null");
    }
    undefined() {
      return this.write("Undefined");
    }
    regexp(regex) {
      return this.write("regex:" + regex.toString());
    }
    arraybuffer(arr) {
      this.write("arraybuffer:");
      return this.dispatch(new Uint8Array(arr));
    }
    url(url) {
      return this.write("url:" + url.toString());
    }
    map(map) {
      this.write("map:");
      const arr = [...map];
      return this.array(arr, false);
    }
    set(set) {
      this.write("set:");
      const arr = [...set];
      return this.array(arr, false);
    }
    bigint(number) {
      return this.write("bigint:" + number.toString());
    }
  }
  for (const type of [
    "uint8array",
    "uint8clampedarray",
    "unt8array",
    "uint16array",
    "unt16array",
    "uint32array",
    "unt32array",
    "float32array",
    "float64array"
  ]) {
    Hasher2.prototype[type] = function(arr) {
      this.write(type + ":");
      return this.array([...arr], false);
    };
  }
  function isNativeFunction(f) {
    if (typeof f !== "function") {
      return false;
    }
    return Function.prototype.toString.call(f).slice(
      -15
      /* "[native code] }".length */
    ) === "[native code] }";
  }
  return Hasher2;
})();
function serialize(object) {
  const hasher = new Hasher();
  hasher.dispatch(object);
  return hasher.buff;
}
function hash(value) {
  return digest(typeof value === "string" ? value : serialize(value)).replace(/[-_]/g, "").slice(0, 10);
}

function defaultCacheOptions() {
  return {
    name: "_",
    base: "/cache",
    swr: true,
    maxAge: 1
  };
}
function defineCachedFunction(fn, opts = {}) {
  opts = { ...defaultCacheOptions(), ...opts };
  const pending = {};
  const group = opts.group || "nitro/functions";
  const name = opts.name || fn.name || "_";
  const integrity = opts.integrity || hash([fn, opts]);
  const validate = opts.validate || ((entry) => entry.value !== void 0);
  async function get(key, resolver, shouldInvalidateCache, event) {
    const cacheKey = [opts.base, group, name, key + ".json"].filter(Boolean).join(":").replace(/:\/$/, ":index");
    let entry = await useStorage().getItem(cacheKey).catch((error) => {
      console.error(`[cache] Cache read error.`, error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }) || {};
    if (typeof entry !== "object") {
      entry = {};
      const error = new Error("Malformed data read from cache.");
      console.error("[cache]", error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }
    const ttl = (opts.maxAge ?? 0) * 1e3;
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    const expired = shouldInvalidateCache || entry.integrity !== integrity || ttl && Date.now() - (entry.mtime || 0) > ttl || validate(entry) === false;
    const _resolve = async () => {
      const isPending = pending[key];
      if (!isPending) {
        if (entry.value !== void 0 && (opts.staleMaxAge || 0) >= 0 && opts.swr === false) {
          entry.value = void 0;
          entry.integrity = void 0;
          entry.mtime = void 0;
          entry.expires = void 0;
        }
        pending[key] = Promise.resolve(resolver());
      }
      try {
        entry.value = await pending[key];
      } catch (error) {
        if (!isPending) {
          delete pending[key];
        }
        throw error;
      }
      if (!isPending) {
        entry.mtime = Date.now();
        entry.integrity = integrity;
        delete pending[key];
        if (validate(entry) !== false) {
          let setOpts;
          if (opts.maxAge && !opts.swr) {
            setOpts = { ttl: opts.maxAge };
          }
          const promise = useStorage().setItem(cacheKey, entry, setOpts).catch((error) => {
            console.error(`[cache] Cache write error.`, error);
            useNitroApp().captureError(error, { event, tags: ["cache"] });
          });
          if (event?.waitUntil) {
            event.waitUntil(promise);
          }
        }
      }
    };
    const _resolvePromise = expired ? _resolve() : Promise.resolve();
    if (entry.value === void 0) {
      await _resolvePromise;
    } else if (expired && event && event.waitUntil) {
      event.waitUntil(_resolvePromise);
    }
    if (opts.swr && validate(entry) !== false) {
      _resolvePromise.catch((error) => {
        console.error(`[cache] SWR handler error.`, error);
        useNitroApp().captureError(error, { event, tags: ["cache"] });
      });
      return entry;
    }
    return _resolvePromise.then(() => entry);
  }
  return async (...args) => {
    const shouldBypassCache = await opts.shouldBypassCache?.(...args);
    if (shouldBypassCache) {
      return fn(...args);
    }
    const key = await (opts.getKey || getKey)(...args);
    const shouldInvalidateCache = await opts.shouldInvalidateCache?.(...args);
    const entry = await get(
      key,
      () => fn(...args),
      shouldInvalidateCache,
      args[0] && isEvent(args[0]) ? args[0] : void 0
    );
    let value = entry.value;
    if (opts.transform) {
      value = await opts.transform(entry, ...args) || value;
    }
    return value;
  };
}
function cachedFunction(fn, opts = {}) {
  return defineCachedFunction(fn, opts);
}
function getKey(...args) {
  return args.length > 0 ? hash(args) : "";
}
function escapeKey(key) {
  return String(key).replace(/\W/g, "");
}
function defineCachedEventHandler(handler, opts = defaultCacheOptions()) {
  const variableHeaderNames = (opts.varies || []).filter(Boolean).map((h) => h.toLowerCase()).sort();
  const _opts = {
    ...opts,
    getKey: async (event) => {
      const customKey = await opts.getKey?.(event);
      if (customKey) {
        return escapeKey(customKey);
      }
      const _path = event.node.req.originalUrl || event.node.req.url || event.path;
      let _pathname;
      try {
        _pathname = escapeKey(decodeURI(parseURL(_path).pathname)).slice(0, 16) || "index";
      } catch {
        _pathname = "-";
      }
      const _hashedPath = `${_pathname}.${hash(_path)}`;
      const _headers = variableHeaderNames.map((header) => [header, event.node.req.headers[header]]).map(([name, value]) => `${escapeKey(name)}.${hash(value)}`);
      return [_hashedPath, ..._headers].join(":");
    },
    validate: (entry) => {
      if (!entry.value) {
        return false;
      }
      if (entry.value.code >= 400) {
        return false;
      }
      if (entry.value.body === void 0) {
        return false;
      }
      if (entry.value.headers.etag === "undefined" || entry.value.headers["last-modified"] === "undefined") {
        return false;
      }
      return true;
    },
    group: opts.group || "nitro/handlers",
    integrity: opts.integrity || hash([handler, opts])
  };
  const _cachedHandler = cachedFunction(
    async (incomingEvent) => {
      const variableHeaders = {};
      for (const header of variableHeaderNames) {
        const value = incomingEvent.node.req.headers[header];
        if (value !== void 0) {
          variableHeaders[header] = value;
        }
      }
      const reqProxy = cloneWithProxy(incomingEvent.node.req, {
        headers: variableHeaders
      });
      const resHeaders = {};
      let _resSendBody;
      const resProxy = cloneWithProxy(incomingEvent.node.res, {
        statusCode: 200,
        writableEnded: false,
        writableFinished: false,
        headersSent: false,
        closed: false,
        getHeader(name) {
          return resHeaders[name];
        },
        setHeader(name, value) {
          resHeaders[name] = value;
          return this;
        },
        getHeaderNames() {
          return Object.keys(resHeaders);
        },
        hasHeader(name) {
          return name in resHeaders;
        },
        removeHeader(name) {
          delete resHeaders[name];
        },
        getHeaders() {
          return resHeaders;
        },
        end(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        write(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2(void 0);
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return true;
        },
        writeHead(statusCode, headers2) {
          this.statusCode = statusCode;
          if (headers2) {
            if (Array.isArray(headers2) || typeof headers2 === "string") {
              throw new TypeError("Raw headers  is not supported.");
            }
            for (const header in headers2) {
              const value = headers2[header];
              if (value !== void 0) {
                this.setHeader(
                  header,
                  value
                );
              }
            }
          }
          return this;
        }
      });
      const event = createEvent(reqProxy, resProxy);
      event.fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: useNitroApp().localFetch
      });
      event.$fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: globalThis.$fetch
      });
      event.waitUntil = incomingEvent.waitUntil;
      event.context = incomingEvent.context;
      event.context.cache = {
        options: _opts
      };
      const body = await handler(event) || _resSendBody;
      const headers = event.node.res.getHeaders();
      headers.etag = String(
        headers.Etag || headers.etag || `W/"${hash(body)}"`
      );
      headers["last-modified"] = String(
        headers["Last-Modified"] || headers["last-modified"] || (/* @__PURE__ */ new Date()).toUTCString()
      );
      const cacheControl = [];
      if (opts.swr) {
        if (opts.maxAge) {
          cacheControl.push(`s-maxage=${opts.maxAge}`);
        }
        if (opts.staleMaxAge) {
          cacheControl.push(`stale-while-revalidate=${opts.staleMaxAge}`);
        } else {
          cacheControl.push("stale-while-revalidate");
        }
      } else if (opts.maxAge) {
        cacheControl.push(`max-age=${opts.maxAge}`);
      }
      if (cacheControl.length > 0) {
        headers["cache-control"] = cacheControl.join(", ");
      }
      const cacheEntry = {
        code: event.node.res.statusCode,
        headers,
        body
      };
      return cacheEntry;
    },
    _opts
  );
  return defineEventHandler(async (event) => {
    if (opts.headersOnly) {
      if (handleCacheHeaders(event, { maxAge: opts.maxAge })) {
        return;
      }
      return handler(event);
    }
    const response = await _cachedHandler(
      event
    );
    if (event.node.res.headersSent || event.node.res.writableEnded) {
      return response.body;
    }
    if (handleCacheHeaders(event, {
      modifiedTime: new Date(response.headers["last-modified"]),
      etag: response.headers.etag,
      maxAge: opts.maxAge
    })) {
      return;
    }
    event.node.res.statusCode = response.code;
    for (const name in response.headers) {
      const value = response.headers[name];
      if (name === "set-cookie") {
        event.node.res.appendHeader(
          name,
          splitCookiesString(value)
        );
      } else {
        if (value !== void 0) {
          event.node.res.setHeader(name, value);
        }
      }
    }
    return response.body;
  });
}
function cloneWithProxy(obj, overrides) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      if (property in overrides) {
        return overrides[property];
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      if (property in overrides) {
        overrides[property] = value;
        return true;
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}
const cachedEventHandler = defineCachedEventHandler;

function klona(x) {
	if (typeof x !== 'object') return x;

	var k, tmp, str=Object.prototype.toString.call(x);

	if (str === '[object Object]') {
		if (x.constructor !== Object && typeof x.constructor === 'function') {
			tmp = new x.constructor();
			for (k in x) {
				if (x.hasOwnProperty(k) && tmp[k] !== x[k]) {
					tmp[k] = klona(x[k]);
				}
			}
		} else {
			tmp = {}; // null
			for (k in x) {
				if (k === '__proto__') {
					Object.defineProperty(tmp, k, {
						value: klona(x[k]),
						configurable: true,
						enumerable: true,
						writable: true,
					});
				} else {
					tmp[k] = klona(x[k]);
				}
			}
		}
		return tmp;
	}

	if (str === '[object Array]') {
		k = x.length;
		for (tmp=Array(k); k--;) {
			tmp[k] = klona(x[k]);
		}
		return tmp;
	}

	if (str === '[object Set]') {
		tmp = new Set;
		x.forEach(function (val) {
			tmp.add(klona(val));
		});
		return tmp;
	}

	if (str === '[object Map]') {
		tmp = new Map;
		x.forEach(function (val, key) {
			tmp.set(klona(key), klona(val));
		});
		return tmp;
	}

	if (str === '[object Date]') {
		return new Date(+x);
	}

	if (str === '[object RegExp]') {
		tmp = new RegExp(x.source, x.flags);
		tmp.lastIndex = x.lastIndex;
		return tmp;
	}

	if (str === '[object DataView]') {
		return new x.constructor( klona(x.buffer) );
	}

	if (str === '[object ArrayBuffer]') {
		return x.slice(0);
	}

	// ArrayBuffer.isView(x)
	// ~> `new` bcuz `Buffer.slice` => ref
	if (str.slice(-6) === 'Array]') {
		return new x.constructor(x);
	}

	return x;
}

const inlineAppConfig = {};



const appConfig$1 = defuFn(inlineAppConfig);

const NUMBER_CHAR_RE = /\d/;
const STR_SPLITTERS = ["-", "_", "/", "."];
function isUppercase(char = "") {
  if (NUMBER_CHAR_RE.test(char)) {
    return void 0;
  }
  return char !== char.toLowerCase();
}
function splitByCase(str, separators) {
  const splitters = STR_SPLITTERS;
  const parts = [];
  if (!str || typeof str !== "string") {
    return parts;
  }
  let buff = "";
  let previousUpper;
  let previousSplitter;
  for (const char of str) {
    const isSplitter = splitters.includes(char);
    if (isSplitter === true) {
      parts.push(buff);
      buff = "";
      previousUpper = void 0;
      continue;
    }
    const isUpper = isUppercase(char);
    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        parts.push(buff);
        buff = char;
        previousUpper = isUpper;
        continue;
      }
      if (previousUpper === true && isUpper === false && buff.length > 1) {
        const lastChar = buff.at(-1);
        parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
        buff = lastChar + char;
        previousUpper = isUpper;
        continue;
      }
    }
    buff += char;
    previousUpper = isUpper;
    previousSplitter = isSplitter;
  }
  parts.push(buff);
  return parts;
}
function kebabCase(str, joiner) {
  return str ? (Array.isArray(str) ? str : splitByCase(str)).map((p) => p.toLowerCase()).join(joiner) : "";
}
function snakeCase(str) {
  return kebabCase(str || "", "_");
}

function getEnv(key, opts) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    process.env[opts.prefix + envKey] ?? process.env[opts.altPrefix + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function applyEnv(obj, opts, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = getEnv(subKey, opts);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
        applyEnv(obj[key], opts, subKey);
      } else if (envValue === void 0) {
        applyEnv(obj[key], opts, subKey);
      } else {
        obj[key] = envValue ?? obj[key];
      }
    } else {
      obj[key] = envValue ?? obj[key];
    }
    if (opts.envExpansion && typeof obj[key] === "string") {
      obj[key] = _expandFromEnv(obj[key]);
    }
  }
  return obj;
}
const envExpandRx = /\{\{([^{}]*)\}\}/g;
function _expandFromEnv(value) {
  return value.replace(envExpandRx, (match, key) => {
    return process.env[key] || match;
  });
}

const _inlineRuntimeConfig = {
  "app": {
    "baseURL": "/"
  },
  "nitro": {
    "routeRules": {
      "/_build/assets/**": {
        "headers": {
          "cache-control": "public, immutable, max-age=31536000"
        }
      }
    }
  }
};
const envOptions = {
  prefix: "NITRO_",
  altPrefix: _inlineRuntimeConfig.nitro.envPrefix ?? process.env.NITRO_ENV_PREFIX ?? "_",
  envExpansion: _inlineRuntimeConfig.nitro.envExpansion ?? process.env.NITRO_ENV_EXPANSION ?? false
};
const _sharedRuntimeConfig = _deepFreeze(
  applyEnv(klona(_inlineRuntimeConfig), envOptions)
);
function useRuntimeConfig(event) {
  {
    return _sharedRuntimeConfig;
  }
}
_deepFreeze(klona(appConfig$1));
function _deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      _deepFreeze(value);
    }
  }
  return Object.freeze(object);
}
new Proxy(/* @__PURE__ */ Object.create(null), {
  get: (_, prop) => {
    console.warn(
      "Please use `useRuntimeConfig()` instead of accessing config directly."
    );
    const runtimeConfig = useRuntimeConfig();
    if (prop in runtimeConfig) {
      return runtimeConfig[prop];
    }
    return void 0;
  }
});

function createContext(opts = {}) {
  let currentInstance;
  let isSingleton = false;
  const checkConflict = (instance) => {
    if (currentInstance && currentInstance !== instance) {
      throw new Error("Context conflict");
    }
  };
  let als;
  if (opts.asyncContext) {
    const _AsyncLocalStorage = opts.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    if (_AsyncLocalStorage) {
      als = new _AsyncLocalStorage();
    } else {
      console.warn("[unctx] `AsyncLocalStorage` is not provided.");
    }
  }
  const _getCurrentInstance = () => {
    if (als) {
      const instance = als.getStore();
      if (instance !== void 0) {
        return instance;
      }
    }
    return currentInstance;
  };
  return {
    use: () => {
      const _instance = _getCurrentInstance();
      if (_instance === void 0) {
        throw new Error("Context is not available");
      }
      return _instance;
    },
    tryUse: () => {
      return _getCurrentInstance();
    },
    set: (instance, replace) => {
      if (!replace) {
        checkConflict(instance);
      }
      currentInstance = instance;
      isSingleton = true;
    },
    unset: () => {
      currentInstance = void 0;
      isSingleton = false;
    },
    call: (instance, callback) => {
      checkConflict(instance);
      currentInstance = instance;
      try {
        return als ? als.run(instance, callback) : callback();
      } finally {
        if (!isSingleton) {
          currentInstance = void 0;
        }
      }
    },
    async callAsync(instance, callback) {
      currentInstance = instance;
      const onRestore = () => {
        currentInstance = instance;
      };
      const onLeave = () => currentInstance === instance ? onRestore : void 0;
      asyncHandlers.add(onLeave);
      try {
        const r = als ? als.run(instance, callback) : callback();
        if (!isSingleton) {
          currentInstance = void 0;
        }
        return await r;
      } finally {
        asyncHandlers.delete(onLeave);
      }
    }
  };
}
function createNamespace(defaultOpts = {}) {
  const contexts = {};
  return {
    get(key, opts = {}) {
      if (!contexts[key]) {
        contexts[key] = createContext({ ...defaultOpts, ...opts });
      }
      return contexts[key];
    }
  };
}
const _globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : {};
const globalKey = "__unctx__";
const defaultNamespace = _globalThis[globalKey] || (_globalThis[globalKey] = createNamespace());
const getContext = (key, opts = {}) => defaultNamespace.get(key, opts);
const asyncHandlersKey = "__unctx_async_handlers__";
const asyncHandlers = _globalThis[asyncHandlersKey] || (_globalThis[asyncHandlersKey] = /* @__PURE__ */ new Set());

const nitroAsyncContext = getContext("nitro-app", {
  asyncContext: true,
  AsyncLocalStorage: AsyncLocalStorage 
});

function isPathInScope(pathname, base) {
  let canonical;
  try {
    const pre = pathname.replace(/%2f/gi, "/").replace(/%5c/gi, "\\");
    canonical = new URL(pre, "http://_").pathname;
  } catch {
    return false;
  }
  return !base || canonical === base || canonical.startsWith(base + "/");
}

const config = useRuntimeConfig();
const _routeRulesMatcher = toRouteMatcher(
  createRouter$1({ routes: config.nitro.routeRules })
);
function createRouteRulesHandler(ctx) {
  return eventHandler((event) => {
    const routeRules = getRouteRules(event);
    if (routeRules.headers) {
      setHeaders(event, routeRules.headers);
    }
    if (routeRules.redirect) {
      let target = routeRules.redirect.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.redirect._redirectStripBase;
        if (strpBase) {
          if (!isPathInScope(event.path.split("?")[0], strpBase)) {
            throw createError$1({ statusCode: 400 });
          }
          targetPath = withoutBase(targetPath, strpBase);
        } else if (targetPath.startsWith("//")) {
          targetPath = targetPath.replace(/^\/+/, "/");
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery(event.path);
        target = withQuery(target, query);
      }
      return sendRedirect(event, target, routeRules.redirect.statusCode);
    }
    if (routeRules.proxy) {
      let target = routeRules.proxy.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.proxy._proxyStripBase;
        if (strpBase) {
          if (!isPathInScope(event.path.split("?")[0], strpBase)) {
            throw createError$1({ statusCode: 400 });
          }
          targetPath = withoutBase(targetPath, strpBase);
        } else if (targetPath.startsWith("//")) {
          targetPath = targetPath.replace(/^\/+/, "/");
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery(event.path);
        target = withQuery(target, query);
      }
      return proxyRequest(event, target, {
        fetch: ctx.localFetch,
        ...routeRules.proxy
      });
    }
  });
}
function getRouteRules(event) {
  event.context._nitro = event.context._nitro || {};
  if (!event.context._nitro.routeRules) {
    event.context._nitro.routeRules = getRouteRulesForPath(
      withoutBase(event.path.split("?")[0], useRuntimeConfig().app.baseURL)
    );
  }
  return event.context._nitro.routeRules;
}
function getRouteRulesForPath(path) {
  return defu({}, ..._routeRulesMatcher.matchAll(path).reverse());
}

function _captureError(error, type) {
  console.error(`[${type}]`, error);
  useNitroApp().captureError(error, { tags: [type] });
}
function trapUnhandledNodeErrors() {
  process.on(
    "unhandledRejection",
    (error) => _captureError(error, "unhandledRejection")
  );
  process.on(
    "uncaughtException",
    (error) => _captureError(error, "uncaughtException")
  );
}
function joinHeaders(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
function normalizeFetchResponse(response) {
  if (!response.headers.has("set-cookie")) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: normalizeCookieHeaders(response.headers)
  });
}
function normalizeCookieHeader(header = "") {
  return splitCookiesString(joinHeaders(header));
}
function normalizeCookieHeaders(headers) {
  const outgoingHeaders = new Headers();
  for (const [name, header] of headers) {
    if (name === "set-cookie") {
      for (const cookie of normalizeCookieHeader(header)) {
        outgoingHeaders.append("set-cookie", cookie);
      }
    } else {
      outgoingHeaders.set(name, joinHeaders(header));
    }
  }
  return outgoingHeaders;
}

function defineNitroErrorHandler(handler) {
  return handler;
}

const errorHandler$0 = defineNitroErrorHandler(
  function defaultNitroErrorHandler(error, event) {
    const res = defaultHandler(error, event);
    setResponseHeaders(event, res.headers);
    setResponseStatus(event, res.status, res.statusText);
    return send(event, JSON.stringify(res.body, null, 2));
  }
);
function defaultHandler(error, event, opts) {
  const isSensitive = error.unhandled || error.fatal;
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage || "Server Error";
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  if (statusCode === 404) {
    const baseURL = "/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) {
      const redirectTo = `${baseURL}${url.pathname.slice(1)}${url.search}`;
      return {
        status: 302,
        statusText: "Found",
        headers: { location: redirectTo },
        body: `Redirecting...`
      };
    }
  }
  if (isSensitive && !opts?.silent) {
    const tags = [error.unhandled && "[unhandled]", error.fatal && "[fatal]"].filter(Boolean).join(" ");
    console.error(`[request error] ${tags} [${event.method}] ${url}
`, error);
  }
  const headers = {
    "content-type": "application/json",
    // Prevent browser from guessing the MIME types of resources.
    "x-content-type-options": "nosniff",
    // Prevent error page from being embedded in an iframe
    "x-frame-options": "DENY",
    // Prevent browsers from sending the Referer header
    "referrer-policy": "no-referrer",
    // Disable the execution of any js
    "content-security-policy": "script-src 'none'; frame-ancestors 'none';"
  };
  setResponseStatus(event, statusCode, statusMessage);
  if (statusCode === 404 || !getResponseHeader(event, "cache-control")) {
    headers["cache-control"] = "no-cache";
  }
  const body = {
    error: true,
    url: url.href,
    statusCode,
    statusMessage,
    message: isSensitive ? "Server Error" : error.message,
    data: isSensitive ? void 0 : error.data
  };
  return {
    status: statusCode,
    statusText: statusMessage,
    headers,
    body
  };
}

const errorHandlers = [errorHandler$0];

async function errorHandler(error, event) {
  for (const handler of errorHandlers) {
    try {
      await handler(error, event, { defaultHandler });
      if (event.handled) {
        return; // Response handled
      }
    } catch(error) {
      // Handler itself thrown, log and continue
      console.error(error);
    }
  }
  // H3 will handle fallback
}

const appConfig = {"name":"vinxi","routers":[{"name":"public","type":"static","base":"/","dir":"./public","root":"/Users/hector/Documents/AIProjects/HRMfinance","order":0,"outDir":"/Users/hector/Documents/AIProjects/HRMfinance/.vinxi/build/public"},{"name":"ssr","type":"http","link":{"client":"client"},"handler":"src/entry-server.tsx","extensions":["js","jsx","ts","tsx"],"target":"server","root":"/Users/hector/Documents/AIProjects/HRMfinance","base":"/","outDir":"/Users/hector/Documents/AIProjects/HRMfinance/.vinxi/build/ssr","order":1},{"name":"client","type":"client","base":"/_build","handler":"src/entry-client.tsx","extensions":["js","jsx","ts","tsx"],"target":"browser","root":"/Users/hector/Documents/AIProjects/HRMfinance","outDir":"/Users/hector/Documents/AIProjects/HRMfinance/.vinxi/build/client","order":2},{"name":"server-fns","type":"http","base":"/_server","handler":"node_modules/.pnpm/@solidjs+start@1.3.2_solid-js@1.9.13_vinxi@0.5.11_db0@0.3.4_ioredis@5.11.1_jiti@2.7.0_l_04989c4ef4112cb983e1cfd0d3e23e6c/node_modules/@solidjs/start/dist/runtime/server-handler.js","target":"server","root":"/Users/hector/Documents/AIProjects/HRMfinance","outDir":"/Users/hector/Documents/AIProjects/HRMfinance/.vinxi/build/server-fns","order":3}],"server":{"compressPublicAssets":{"brotli":true},"routeRules":{"/_build/assets/**":{"headers":{"cache-control":"public, immutable, max-age=31536000"}}},"experimental":{"asyncContext":true},"prerender":{}},"root":"/Users/hector/Documents/AIProjects/HRMfinance"};
					const buildManifest = {"ssr":{"virtual:$vinxi/handler/ssr":{"file":"ssr.js","name":"ssr","src":"virtual:$vinxi/handler/ssr","isEntry":true}},"client":{"_EntityDetailModal-0P0uSLyL.js":{"file":"assets/EntityDetailModal-0P0uSLyL.js","name":"EntityDetailModal","imports":["_web-B50drEWG.js","_csv-D2ikwZU9.js","_dates-B_ebQcaW.js","_yearStore-08JEXQTR.js","_index-BigjWbV-.js","_store-BB8JaDZn.js","_Icon-ET8315Ce.js"]},"_Icon-ET8315Ce.js":{"file":"assets/Icon-ET8315Ce.js","name":"Icon","imports":["_web-B50drEWG.js"]},"_LocationSelect-B11A4peJ.js":{"file":"assets/LocationSelect-B11A4peJ.js","name":"LocationSelect","imports":["_SearchSelect-BFmV4tA9.js","_index-BigjWbV-.js","_store-CS7DEtHt.js","_web-B50drEWG.js"]},"_PrintButton-UpwaWxOx.js":{"file":"assets/PrintButton-UpwaWxOx.js","name":"PrintButton","imports":["_web-B50drEWG.js","_index-BigjWbV-.js","_printer-D_Jwaduc.js"]},"_ProductLineEditor-DXqy-c7L.js":{"file":"assets/ProductLineEditor-DXqy-c7L.js","name":"ProductLineEditor","imports":["_web-B50drEWG.js","_SearchSelect-BFmV4tA9.js","_StableInput-Tu2gFj_C.js","_store-CS7DEtHt.js","_index-BigjWbV-.js","_trash-2-HfmI9UQ-.js","_plus-Dx1U-C1n.js"]},"_RouteTabs-DHMRL8EJ.js":{"file":"assets/RouteTabs-DHMRL8EJ.js","name":"RouteTabs","imports":["_web-B50drEWG.js","_index-BigjWbV-.js","_components-DyM2LSwN.js"]},"_SearchSelect-BFmV4tA9.js":{"file":"assets/SearchSelect-BFmV4tA9.js","name":"SearchSelect","imports":["_web-B50drEWG.js","_index-BigjWbV-.js"]},"_Spinner-BRQ7WrJe.js":{"file":"assets/Spinner-BRQ7WrJe.js","name":"Spinner","imports":["_web-B50drEWG.js"]},"_StableInput-Tu2gFj_C.js":{"file":"assets/StableInput-Tu2gFj_C.js","name":"StableInput","imports":["_web-B50drEWG.js"]},"_aiFlows-pJzXHo0K.js":{"file":"assets/aiFlows-pJzXHo0K.js","name":"aiFlows","imports":["_api-Dky6_J7J.js"]},"_api-6IlEo8y9.js":{"file":"assets/api-6IlEo8y9.js","name":"api","imports":["_api-Dky6_J7J.js","_auth-DFI69Cb9.js"]},"_api-Dky6_J7J.js":{"file":"assets/api-Dky6_J7J.js","name":"api","imports":["_auth-DFI69Cb9.js"]},"_arrow-left-wVosysgR.js":{"file":"assets/arrow-left-wVosysgR.js","name":"arrow-left","imports":["_Icon-ET8315Ce.js","_web-B50drEWG.js"]},"_auth-DFI69Cb9.js":{"file":"assets/auth-DFI69Cb9.js","name":"auth","imports":["_web-B50drEWG.js"]},"_components-DyM2LSwN.js":{"file":"assets/components-DyM2LSwN.js","name":"components","imports":["_web-B50drEWG.js","_routing-BEPNZw43.js"]},"_csv-D2ikwZU9.js":{"file":"assets/csv-D2ikwZU9.js","name":"csv","imports":["_Icon-ET8315Ce.js","_web-B50drEWG.js"]},"_dates-B_ebQcaW.js":{"file":"assets/dates-B_ebQcaW.js","name":"dates"},"_defaults-ugUdWWU5.js":{"file":"assets/defaults-ugUdWWU5.js","name":"defaults","imports":["_store-CbiN3OHO.js"]},"_index-BigjWbV-.js":{"file":"assets/index-BigjWbV-.js","name":"index","imports":["_web-B50drEWG.js"]},"_journalBuilder-CuA0sOvc.js":{"file":"assets/journalBuilder-CuA0sOvc.js","name":"journalBuilder","imports":["_SearchSelect-BFmV4tA9.js","_store-CbiN3OHO.js","_index-BigjWbV-.js","_web-B50drEWG.js","_auth-DFI69Cb9.js","_api-6IlEo8y9.js"]},"_pencil-DbCIcQ_5.js":{"file":"assets/pencil-DbCIcQ_5.js","name":"pencil","imports":["_Icon-ET8315Ce.js","_web-B50drEWG.js"]},"_plus-Dx1U-C1n.js":{"file":"assets/plus-Dx1U-C1n.js","name":"plus","imports":["_Icon-ET8315Ce.js","_web-B50drEWG.js"]},"_printer-D_Jwaduc.js":{"file":"assets/printer-D_Jwaduc.js","name":"printer","imports":["_Icon-ET8315Ce.js","_web-B50drEWG.js"]},"_recurring-CA2S8Vts.js":{"file":"assets/recurring-CA2S8Vts.js","name":"recurring","imports":["_web-B50drEWG.js","_store-CbiN3OHO.js","_yearStore-08JEXQTR.js","_store-C0eiPwcf.js","_store-BitOu3zS.js"]},"_routing-BEPNZw43.js":{"file":"assets/routing-BEPNZw43.js","name":"routing","imports":["_web-B50drEWG.js"]},"_scroll-text-DvYD_UQE.js":{"file":"assets/scroll-text-DvYD_UQE.js","name":"scroll-text","imports":["_Icon-ET8315Ce.js","_web-B50drEWG.js"]},"_search-B90-czUY.js":{"file":"assets/search-B90-czUY.js","name":"search","imports":["_Icon-ET8315Ce.js","_web-B50drEWG.js"]},"_sparkles-DPh9NnqK.js":{"file":"assets/sparkles-DPh9NnqK.js","name":"sparkles","imports":["_Icon-ET8315Ce.js","_web-B50drEWG.js"]},"_sso-X8m-jW9J.js":{"file":"assets/sso-X8m-jW9J.js","name":"sso","imports":["_auth-DFI69Cb9.js"]},"_store-BB8JaDZn.js":{"file":"assets/store-BB8JaDZn.js","name":"store","imports":["_web-B50drEWG.js","_store-CbiN3OHO.js","_store-C0eiPwcf.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js"]},"_store-BbhHI1QO.js":{"file":"assets/store-BbhHI1QO.js","name":"store","imports":["_web-B50drEWG.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js","_types-CGrVZs_Y.js"]},"_store-BitOu3zS.js":{"file":"assets/store-BitOu3zS.js","name":"store","imports":["_types-CGrVZs_Y.js","_store-BB8JaDZn.js","_web-B50drEWG.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js","_store-C0eiPwcf.js"]},"_store-C0eiPwcf.js":{"file":"assets/store-C0eiPwcf.js","name":"store","imports":["_web-B50drEWG.js","_auth-DFI69Cb9.js","_api-Dky6_J7J.js"]},"_store-CS7DEtHt.js":{"file":"assets/store-CS7DEtHt.js","name":"store","imports":["_web-B50drEWG.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js"]},"_store-CbiN3OHO.js":{"file":"assets/store-CbiN3OHO.js","name":"store","imports":["_web-B50drEWG.js","_api-Dky6_J7J.js","_dates-B_ebQcaW.js","_auth-DFI69Cb9.js"]},"_trash-2-HfmI9UQ-.js":{"file":"assets/trash-2-HfmI9UQ-.js","name":"trash-2","imports":["_Icon-ET8315Ce.js","_web-B50drEWG.js"]},"_types-CGrVZs_Y.js":{"file":"assets/types-CGrVZs_Y.js","name":"types","imports":["_web-B50drEWG.js","_api-Dky6_J7J.js"]},"_types-DG_tf0Jf.js":{"file":"assets/types-DG_tf0Jf.js","name":"types","imports":["_web-B50drEWG.js","_index-BigjWbV-.js"]},"_types-aFJCvwH0.js":{"file":"assets/types-aFJCvwH0.js","name":"types"},"_types-pExQo7zb.js":{"file":"assets/types-pExQo7zb.js","name":"types"},"_web-B50drEWG.js":{"file":"assets/web-B50drEWG.js","name":"web"},"_yearStore-08JEXQTR.js":{"file":"assets/yearStore-08JEXQTR.js","name":"yearStore","imports":["_web-B50drEWG.js"]},"src/routes/accounts/[id].tsx?pick=default&pick=$css":{"file":"assets/_id_-zL6y3xp4.js","name":"_id_","src":"src/routes/accounts/[id].tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_Spinner-BRQ7WrJe.js","_yearStore-08JEXQTR.js","_SearchSelect-BFmV4tA9.js","_csv-D2ikwZU9.js","_index-BigjWbV-.js","_store-CbiN3OHO.js","_StableInput-Tu2gFj_C.js","_routing-BEPNZw43.js","_components-DyM2LSwN.js","_arrow-left-wVosysgR.js","_Icon-ET8315Ce.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js","_dates-B_ebQcaW.js"]},"src/routes/accounts/index.tsx?pick=default&pick=$css":{"file":"assets/index-CPbo4n5j.js","name":"index","src":"src/routes/accounts/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_yearStore-08JEXQTR.js","_auth-DFI69Cb9.js","_index-BigjWbV-.js","_Spinner-BRQ7WrJe.js","_store-CbiN3OHO.js","_SearchSelect-BFmV4tA9.js","_StableInput-Tu2gFj_C.js","_defaults-ugUdWWU5.js","_Icon-ET8315Ce.js","_plus-Dx1U-C1n.js","_pencil-DbCIcQ_5.js","_scroll-text-DvYD_UQE.js","_trash-2-HfmI9UQ-.js","_components-DyM2LSwN.js","_api-Dky6_J7J.js","_dates-B_ebQcaW.js","_routing-BEPNZw43.js"]},"src/routes/admin/gemini.tsx?pick=default&pick=$css":{"file":"assets/gemini-DcnDWG48.js","name":"gemini","src":"src/routes/admin/gemini.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_Spinner-BRQ7WrJe.js","_api-Dky6_J7J.js","_index-BigjWbV-.js","_StableInput-Tu2gFj_C.js","_auth-DFI69Cb9.js"]},"src/routes/banking/index.tsx?pick=default&pick=$css":{"file":"assets/index-CVhoIfqG.js","name":"index","src":"src/routes/banking/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_Spinner-BRQ7WrJe.js","_aiFlows-pJzXHo0K.js","_store-C0eiPwcf.js","_store-CbiN3OHO.js","_yearStore-08JEXQTR.js","_SearchSelect-BFmV4tA9.js","_index-BigjWbV-.js","_api-Dky6_J7J.js","_Icon-ET8315Ce.js","_sparkles-DPh9NnqK.js","_auth-DFI69Cb9.js","_dates-B_ebQcaW.js"]},"src/routes/callback.tsx?pick=default&pick=$css":{"file":"assets/callback-CAsCR86o.js","name":"callback","src":"src/routes/callback.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_Spinner-BRQ7WrJe.js","_auth-DFI69Cb9.js","_index-BigjWbV-.js","_routing-BEPNZw43.js","_sso-X8m-jW9J.js"]},"src/routes/employees.tsx?pick=default&pick=$css":{"file":"assets/employees-DWU8Rzpp.js","name":"employees","src":"src/routes/employees.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_RouteTabs-DHMRL8EJ.js","_index-BigjWbV-.js","_components-DyM2LSwN.js","_routing-BEPNZw43.js"]},"src/routes/employees/index.tsx?pick=default&pick=$css":{"file":"assets/index-29kvO1rC.js","name":"index","src":"src/routes/employees/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_Spinner-BRQ7WrJe.js","_index-BigjWbV-.js","_StableInput-Tu2gFj_C.js","_types-CGrVZs_Y.js","_plus-Dx1U-C1n.js","_pencil-DbCIcQ_5.js","_trash-2-HfmI9UQ-.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js","_Icon-ET8315Ce.js"]},"src/routes/index.tsx?pick=default&pick=$css":{"file":"assets/index-dlW0AZ1t.js","name":"index","src":"src/routes/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_index-BigjWbV-.js","_aiFlows-pJzXHo0K.js","_yearStore-08JEXQTR.js","_store-CbiN3OHO.js","_store-C0eiPwcf.js","_store-BB8JaDZn.js","_store-CS7DEtHt.js","_store-BbhHI1QO.js","_store-BitOu3zS.js","_recurring-CA2S8Vts.js","_components-DyM2LSwN.js","_sparkles-DPh9NnqK.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js","_dates-B_ebQcaW.js","_types-CGrVZs_Y.js","_routing-BEPNZw43.js","_Icon-ET8315Ce.js"]},"src/routes/inventory.tsx?pick=default&pick=$css":{"file":"assets/inventory-CTlUWN2v.js","name":"inventory","src":"src/routes/inventory.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_RouteTabs-DHMRL8EJ.js","_index-BigjWbV-.js","_components-DyM2LSwN.js","_routing-BEPNZw43.js"]},"src/routes/inventory/count.tsx?pick=default&pick=$css":{"file":"assets/count-DyWmPEuo.js","name":"count","src":"src/routes/inventory/count.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_StableInput-Tu2gFj_C.js","_Spinner-BRQ7WrJe.js","_index-BigjWbV-.js","_LocationSelect-B11A4peJ.js","_store-CS7DEtHt.js","_SearchSelect-BFmV4tA9.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js"]},"src/routes/inventory/index.tsx?pick=default&pick=$css":{"file":"assets/index-BdUZQ4tz.js","name":"index","src":"src/routes/inventory/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_Spinner-BRQ7WrJe.js","_index-BigjWbV-.js","_StableInput-Tu2gFj_C.js","_dates-B_ebQcaW.js","_store-CS7DEtHt.js","_types-DG_tf0Jf.js","_plus-Dx1U-C1n.js","_Icon-ET8315Ce.js","_pencil-DbCIcQ_5.js","_trash-2-HfmI9UQ-.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js"]},"src/routes/inventory/movements.tsx?pick=default&pick=$css":{"file":"assets/movements-CToiAnov.js","name":"movements","src":"src/routes/inventory/movements.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_StableInput-Tu2gFj_C.js","_Spinner-BRQ7WrJe.js","_dates-B_ebQcaW.js","_index-BigjWbV-.js","_auth-DFI69Cb9.js","_store-CS7DEtHt.js","_pencil-DbCIcQ_5.js","_trash-2-HfmI9UQ-.js","_types-DG_tf0Jf.js","_SearchSelect-BFmV4tA9.js","_LocationSelect-B11A4peJ.js","_plus-Dx1U-C1n.js","_search-B90-czUY.js","_api-Dky6_J7J.js","_Icon-ET8315Ce.js"]},"src/routes/journal/index.tsx?pick=default&pick=$css":{"file":"assets/index-HZeqe-LA.js","name":"index","src":"src/routes/journal/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_dates-B_ebQcaW.js","_StableInput-Tu2gFj_C.js","_Spinner-BRQ7WrJe.js","_yearStore-08JEXQTR.js","_index-BigjWbV-.js","_store-CbiN3OHO.js","_SearchSelect-BFmV4tA9.js","_aiFlows-pJzXHo0K.js","_store-BB8JaDZn.js","_store-C0eiPwcf.js","_sparkles-DPh9NnqK.js","_plus-Dx1U-C1n.js","_trash-2-HfmI9UQ-.js","_auth-DFI69Cb9.js","_printer-D_Jwaduc.js","_routing-BEPNZw43.js","_components-DyM2LSwN.js","_search-B90-czUY.js","_api-Dky6_J7J.js","_Icon-ET8315Ce.js"]},"src/routes/journal/print.tsx?pick=default&pick=$css":{"file":"assets/print-D8KbxtXD.js","name":"print","src":"src/routes/journal/print.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_PrintButton-UpwaWxOx.js","_Spinner-BRQ7WrJe.js","_dates-B_ebQcaW.js","_store-CbiN3OHO.js","_store-BB8JaDZn.js","_yearStore-08JEXQTR.js","_index-BigjWbV-.js","_store-C0eiPwcf.js","_routing-BEPNZw43.js","_components-DyM2LSwN.js","_arrow-left-wVosysgR.js","_printer-D_Jwaduc.js","_Icon-ET8315Ce.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js"]},"src/routes/journal/templates.tsx?pick=default&pick=$css":{"file":"assets/templates-BKS3lFgL.js","name":"templates","src":"src/routes/journal/templates.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_Spinner-BRQ7WrJe.js","_store-CbiN3OHO.js","_yearStore-08JEXQTR.js","_index-BigjWbV-.js","_SearchSelect-BFmV4tA9.js","_StableInput-Tu2gFj_C.js","_aiFlows-pJzXHo0K.js","_store-C0eiPwcf.js","_store-BitOu3zS.js","_sparkles-DPh9NnqK.js","_plus-Dx1U-C1n.js","_trash-2-HfmI9UQ-.js","_pencil-DbCIcQ_5.js","_Icon-ET8315Ce.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js","_dates-B_ebQcaW.js","_types-CGrVZs_Y.js","_store-BB8JaDZn.js"]},"src/routes/login.tsx?pick=default&pick=$css":{"file":"assets/login-B3oCLAiZ.js","name":"login","src":"src/routes/login.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_Spinner-BRQ7WrJe.js","_auth-DFI69Cb9.js","_index-BigjWbV-.js","_routing-BEPNZw43.js","_Icon-ET8315Ce.js","_sso-X8m-jW9J.js"]},"src/routes/providers.tsx?pick=default&pick=$css":{"file":"assets/providers-BKV6tiXb.js","name":"providers","src":"src/routes/providers.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_RouteTabs-DHMRL8EJ.js","_index-BigjWbV-.js","_components-DyM2LSwN.js","_routing-BEPNZw43.js"]},"src/routes/providers/aging.tsx?pick=default&pick=$css":{"file":"assets/aging-1mbhDKuQ.js","name":"aging","src":"src/routes/providers/aging.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_PrintButton-UpwaWxOx.js","_Spinner-BRQ7WrJe.js","_csv-D2ikwZU9.js","_dates-B_ebQcaW.js","_yearStore-08JEXQTR.js","_index-BigjWbV-.js","_EntityDetailModal-0P0uSLyL.js","_store-BB8JaDZn.js","_Icon-ET8315Ce.js","_printer-D_Jwaduc.js","_store-CbiN3OHO.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js","_store-C0eiPwcf.js"]},"src/routes/providers/index.tsx?pick=default&pick=$css":{"file":"assets/index-B25tf-nU.js","name":"index","src":"src/routes/providers/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_Spinner-BRQ7WrJe.js","_auth-DFI69Cb9.js","_store-CbiN3OHO.js","_yearStore-08JEXQTR.js","_index-BigjWbV-.js","_SearchSelect-BFmV4tA9.js","_store-BB8JaDZn.js","_types-aFJCvwH0.js","_StableInput-Tu2gFj_C.js","_EntityDetailModal-0P0uSLyL.js","_plus-Dx1U-C1n.js","_pencil-DbCIcQ_5.js","_scroll-text-DvYD_UQE.js","_trash-2-HfmI9UQ-.js","_Icon-ET8315Ce.js","_api-Dky6_J7J.js","_dates-B_ebQcaW.js","_store-C0eiPwcf.js","_csv-D2ikwZU9.js"]},"src/routes/reports.tsx?pick=default&pick=$css":{"file":"assets/reports-Bgd-GFEU.js","name":"reports","src":"src/routes/reports.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_RouteTabs-DHMRL8EJ.js","_index-BigjWbV-.js","_components-DyM2LSwN.js","_routing-BEPNZw43.js"]},"src/routes/reports/audit.tsx?pick=default&pick=$css":{"file":"assets/audit-DB3tQL3Z.js","name":"audit","src":"src/routes/reports/audit.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_SearchSelect-BFmV4tA9.js","_Spinner-BRQ7WrJe.js","_StableInput-Tu2gFj_C.js","_index-BigjWbV-.js","_yearStore-08JEXQTR.js","_store-C0eiPwcf.js","_auth-DFI69Cb9.js","_api-Dky6_J7J.js"]},"src/routes/reports/balance-sheet.tsx?pick=default&pick=$css":{"file":"assets/balance-sheet-W3s69okz.js","name":"balance-sheet","src":"src/routes/reports/balance-sheet.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_PrintButton-UpwaWxOx.js","_Spinner-BRQ7WrJe.js","_csv-D2ikwZU9.js","_yearStore-08JEXQTR.js","_index-BigjWbV-.js","_store-CbiN3OHO.js","_printer-D_Jwaduc.js","_Icon-ET8315Ce.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js","_dates-B_ebQcaW.js"]},"src/routes/reports/cash-flow.tsx?pick=default&pick=$css":{"file":"assets/cash-flow-BxYru15j.js","name":"cash-flow","src":"src/routes/reports/cash-flow.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_PrintButton-UpwaWxOx.js","_Spinner-BRQ7WrJe.js","_yearStore-08JEXQTR.js","_index-BigjWbV-.js","_store-CbiN3OHO.js","_printer-D_Jwaduc.js","_Icon-ET8315Ce.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js","_dates-B_ebQcaW.js"]},"src/routes/reports/income-statement.tsx?pick=default&pick=$css":{"file":"assets/income-statement-B3SxdEbK.js","name":"income-statement","src":"src/routes/reports/income-statement.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_PrintButton-UpwaWxOx.js","_Spinner-BRQ7WrJe.js","_csv-D2ikwZU9.js","_yearStore-08JEXQTR.js","_index-BigjWbV-.js","_store-CbiN3OHO.js","_printer-D_Jwaduc.js","_Icon-ET8315Ce.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js","_dates-B_ebQcaW.js"]},"src/routes/reports/index.tsx?pick=default&pick=$css":{"file":"assets/index-Cyzascnw.js","name":"index","src":"src/routes/reports/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_components-DyM2LSwN.js","_routing-BEPNZw43.js"]},"src/routes/reports/monthly-pnl.tsx?pick=default&pick=$css":{"file":"assets/monthly-pnl-D2j-zKJD.js","name":"monthly-pnl","src":"src/routes/reports/monthly-pnl.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_PrintButton-UpwaWxOx.js","_Spinner-BRQ7WrJe.js","_csv-D2ikwZU9.js","_store-C0eiPwcf.js","_yearStore-08JEXQTR.js","_index-BigjWbV-.js","_store-CbiN3OHO.js","_printer-D_Jwaduc.js","_Icon-ET8315Ce.js","_auth-DFI69Cb9.js","_api-Dky6_J7J.js","_dates-B_ebQcaW.js"]},"src/routes/reports/trial-balance.tsx?pick=default&pick=$css":{"file":"assets/trial-balance-ByKcTQvp.js","name":"trial-balance","src":"src/routes/reports/trial-balance.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_PrintButton-UpwaWxOx.js","_Spinner-BRQ7WrJe.js","_csv-D2ikwZU9.js","_store-C0eiPwcf.js","_yearStore-08JEXQTR.js","_index-BigjWbV-.js","_store-CbiN3OHO.js","_Icon-ET8315Ce.js","_printer-D_Jwaduc.js","_auth-DFI69Cb9.js","_api-Dky6_J7J.js","_dates-B_ebQcaW.js"]},"src/routes/reports/year-close.tsx?pick=default&pick=$css":{"file":"assets/year-close-KhDz2yL_.js","name":"year-close","src":"src/routes/reports/year-close.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_SearchSelect-BFmV4tA9.js","_Spinner-BRQ7WrJe.js","_store-C0eiPwcf.js","_yearStore-08JEXQTR.js","_index-BigjWbV-.js","_store-CbiN3OHO.js","_auth-DFI69Cb9.js","_api-Dky6_J7J.js","_dates-B_ebQcaW.js"]},"src/routes/timesheets.tsx?pick=default&pick=$css":{"file":"assets/timesheets-DeGukl3D.js","name":"timesheets","src":"src/routes/timesheets.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_RouteTabs-DHMRL8EJ.js","_index-BigjWbV-.js","_components-DyM2LSwN.js","_routing-BEPNZw43.js"]},"src/routes/timesheets/index.tsx?pick=default&pick=$css":{"file":"assets/index-CzWuzl0X.js","name":"index","src":"src/routes/timesheets/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_Spinner-BRQ7WrJe.js","_types-CGrVZs_Y.js","_auth-DFI69Cb9.js","_SearchSelect-BFmV4tA9.js","_store-CbiN3OHO.js","_store-C0eiPwcf.js","_store-BB8JaDZn.js","_index-BigjWbV-.js","_store-BbhHI1QO.js","_StableInput-Tu2gFj_C.js","_plus-Dx1U-C1n.js","_pencil-DbCIcQ_5.js","_trash-2-HfmI9UQ-.js","_components-DyM2LSwN.js","_api-Dky6_J7J.js","_dates-B_ebQcaW.js","_Icon-ET8315Ce.js","_routing-BEPNZw43.js"]},"src/routes/timesheets/stub/[id].tsx?pick=default&pick=$css":{"file":"assets/_id_-qWeFqjrt.js","name":"_id_","src":"src/routes/timesheets/stub/[id].tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_PrintButton-UpwaWxOx.js","_Spinner-BRQ7WrJe.js","_types-CGrVZs_Y.js","_index-BigjWbV-.js","_store-BbhHI1QO.js","_routing-BEPNZw43.js","_components-DyM2LSwN.js","_arrow-left-wVosysgR.js","_printer-D_Jwaduc.js","_Icon-ET8315Ce.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js"]},"src/routes/timesheets/w2.tsx?pick=default&pick=$css":{"file":"assets/w2-BZO_evnp.js","name":"w2","src":"src/routes/timesheets/w2.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_PrintButton-UpwaWxOx.js","_Spinner-BRQ7WrJe.js","_index-BigjWbV-.js","_yearStore-08JEXQTR.js","_types-CGrVZs_Y.js","_store-BbhHI1QO.js","_printer-D_Jwaduc.js","_Icon-ET8315Ce.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js"]},"src/routes/transactions.tsx?pick=default&pick=$css":{"file":"assets/transactions-DhVvwvmU.js","name":"transactions","src":"src/routes/transactions.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_RouteTabs-DHMRL8EJ.js","_index-BigjWbV-.js","_components-DyM2LSwN.js","_routing-BEPNZw43.js"]},"src/routes/transactions/compras.tsx?pick=default&pick=$css":{"file":"assets/compras-Ba7-G8Hy.js","name":"compras","src":"src/routes/transactions/compras.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_store-CbiN3OHO.js","_store-C0eiPwcf.js","_store-CS7DEtHt.js","_store-BB8JaDZn.js","_yearStore-08JEXQTR.js","_index-BigjWbV-.js","_SearchSelect-BFmV4tA9.js","_aiFlows-pJzXHo0K.js","_LocationSelect-B11A4peJ.js","_journalBuilder-CuA0sOvc.js","_ProductLineEditor-DXqy-c7L.js","_api-6IlEo8y9.js","_StableInput-Tu2gFj_C.js","_sparkles-DPh9NnqK.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js","_dates-B_ebQcaW.js","_trash-2-HfmI9UQ-.js","_Icon-ET8315Ce.js","_plus-Dx1U-C1n.js"]},"src/routes/transactions/facturacion.tsx?pick=default&pick=$css":{"file":"assets/facturacion-DFOvg0HH.js","name":"facturacion","src":"src/routes/transactions/facturacion.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_store-CbiN3OHO.js","_store-C0eiPwcf.js","_store-CS7DEtHt.js","_store-BB8JaDZn.js","_yearStore-08JEXQTR.js","_index-BigjWbV-.js","_SearchSelect-BFmV4tA9.js","_LocationSelect-B11A4peJ.js","_journalBuilder-CuA0sOvc.js","_ProductLineEditor-DXqy-c7L.js","_api-6IlEo8y9.js","_defaults-ugUdWWU5.js","_StableInput-Tu2gFj_C.js","_routing-BEPNZw43.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js","_dates-B_ebQcaW.js","_trash-2-HfmI9UQ-.js","_Icon-ET8315Ce.js","_plus-Dx1U-C1n.js"]},"src/routes/transactions/historial.tsx?pick=default&pick=$css":{"file":"assets/historial-CTnP2Ct9.js","name":"historial","src":"src/routes/transactions/historial.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_Spinner-BRQ7WrJe.js","_StableInput-Tu2gFj_C.js","_dates-B_ebQcaW.js","_index-BigjWbV-.js","_SearchSelect-BFmV4tA9.js","_auth-DFI69Cb9.js","_api-6IlEo8y9.js","_journalBuilder-CuA0sOvc.js","_types-pExQo7zb.js","_yearStore-08JEXQTR.js","_store-CbiN3OHO.js","_store-CS7DEtHt.js","_store-BB8JaDZn.js","_types-aFJCvwH0.js","_defaults-ugUdWWU5.js","_store-C0eiPwcf.js","_Icon-ET8315Ce.js","_components-DyM2LSwN.js","_printer-D_Jwaduc.js","_pencil-DbCIcQ_5.js","_trash-2-HfmI9UQ-.js","_search-B90-czUY.js","_api-Dky6_J7J.js","_routing-BEPNZw43.js"]},"src/routes/transactions/index.tsx?pick=default&pick=$css":{"file":"assets/index-D00D_coe.js","name":"index","src":"src/routes/transactions/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_components-DyM2LSwN.js","_routing-BEPNZw43.js"]},"src/routes/transactions/invoice/[number].tsx?pick=default&pick=$css":{"file":"assets/_number_-B-fj13rq.js","name":"_number_","src":"src/routes/transactions/invoice/[number].tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_PrintButton-UpwaWxOx.js","_Spinner-BRQ7WrJe.js","_dates-B_ebQcaW.js","_index-BigjWbV-.js","_api-6IlEo8y9.js","_routing-BEPNZw43.js","_components-DyM2LSwN.js","_arrow-left-wVosysgR.js","_printer-D_Jwaduc.js","_Icon-ET8315Ce.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js"]},"src/routes/transactions/mermas.tsx?pick=default&pick=$css":{"file":"assets/mermas-GPz37xX2.js","name":"mermas","src":"src/routes/transactions/mermas.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_web-B50drEWG.js","_store-CbiN3OHO.js","_store-C0eiPwcf.js","_store-CS7DEtHt.js","_yearStore-08JEXQTR.js","_index-BigjWbV-.js","_LocationSelect-B11A4peJ.js","_journalBuilder-CuA0sOvc.js","_ProductLineEditor-DXqy-c7L.js","_api-6IlEo8y9.js","_types-pExQo7zb.js","_StableInput-Tu2gFj_C.js","_api-Dky6_J7J.js","_auth-DFI69Cb9.js","_dates-B_ebQcaW.js","_SearchSelect-BFmV4tA9.js","_trash-2-HfmI9UQ-.js","_Icon-ET8315Ce.js","_plus-Dx1U-C1n.js"]},"virtual:$vinxi/handler/client":{"file":"assets/client-CJEt9ZyU.js","name":"client","src":"virtual:$vinxi/handler/client","isEntry":true,"imports":["_web-B50drEWG.js","_auth-DFI69Cb9.js","_recurring-CA2S8Vts.js","_yearStore-08JEXQTR.js","_index-BigjWbV-.js","_routing-BEPNZw43.js","_Icon-ET8315Ce.js","_sparkles-DPh9NnqK.js","_components-DyM2LSwN.js","_Spinner-BRQ7WrJe.js","_store-CbiN3OHO.js","_api-Dky6_J7J.js","_dates-B_ebQcaW.js","_store-C0eiPwcf.js","_store-BitOu3zS.js","_types-CGrVZs_Y.js","_store-BB8JaDZn.js"],"dynamicImports":["src/routes/accounts/[id].tsx?pick=default&pick=$css","src/routes/accounts/index.tsx?pick=default&pick=$css","src/routes/admin/gemini.tsx?pick=default&pick=$css","src/routes/banking/index.tsx?pick=default&pick=$css","src/routes/callback.tsx?pick=default&pick=$css","src/routes/employees/index.tsx?pick=default&pick=$css","src/routes/employees.tsx?pick=default&pick=$css","src/routes/index.tsx?pick=default&pick=$css","src/routes/inventory/count.tsx?pick=default&pick=$css","src/routes/inventory/index.tsx?pick=default&pick=$css","src/routes/inventory/movements.tsx?pick=default&pick=$css","src/routes/inventory.tsx?pick=default&pick=$css","src/routes/journal/index.tsx?pick=default&pick=$css","src/routes/journal/print.tsx?pick=default&pick=$css","src/routes/journal/templates.tsx?pick=default&pick=$css","src/routes/login.tsx?pick=default&pick=$css","src/routes/providers/aging.tsx?pick=default&pick=$css","src/routes/providers/index.tsx?pick=default&pick=$css","src/routes/providers.tsx?pick=default&pick=$css","src/routes/reports/audit.tsx?pick=default&pick=$css","src/routes/reports/balance-sheet.tsx?pick=default&pick=$css","src/routes/reports/cash-flow.tsx?pick=default&pick=$css","src/routes/reports/income-statement.tsx?pick=default&pick=$css","src/routes/reports/index.tsx?pick=default&pick=$css","src/routes/reports/monthly-pnl.tsx?pick=default&pick=$css","src/routes/reports/trial-balance.tsx?pick=default&pick=$css","src/routes/reports/year-close.tsx?pick=default&pick=$css","src/routes/reports.tsx?pick=default&pick=$css","src/routes/timesheets/index.tsx?pick=default&pick=$css","src/routes/timesheets/stub/[id].tsx?pick=default&pick=$css","src/routes/timesheets/w2.tsx?pick=default&pick=$css","src/routes/timesheets.tsx?pick=default&pick=$css","src/routes/transactions/compras.tsx?pick=default&pick=$css","src/routes/transactions/facturacion.tsx?pick=default&pick=$css","src/routes/transactions/historial.tsx?pick=default&pick=$css","src/routes/transactions/index.tsx?pick=default&pick=$css","src/routes/transactions/invoice/[number].tsx?pick=default&pick=$css","src/routes/transactions/mermas.tsx?pick=default&pick=$css","src/routes/transactions.tsx?pick=default&pick=$css"],"css":["assets/client-CdvevsAi.css"]}},"server-fns":{"_server-fns-BIfoNgbV.js":{"file":"assets/server-fns-BIfoNgbV.js","name":"server-fns","dynamicImports":["src/app.tsx"]},"src/app.tsx":{"file":"assets/app-BjtImgdv.js","name":"app","src":"src/app.tsx","isDynamicEntry":true,"imports":["_server-fns-BIfoNgbV.js"],"css":["assets/app-CdvevsAi.css"]},"virtual:$vinxi/handler/server-fns":{"file":"server-fns.js","name":"server-fns","src":"virtual:$vinxi/handler/server-fns","isEntry":true,"imports":["_server-fns-BIfoNgbV.js"]}}};

					const routeManifest = {"ssr":{},"client":{},"server-fns":{}};

        function createProdApp(appConfig) {
          return {
            config: { ...appConfig, buildManifest, routeManifest },
            getRouter(name) {
              return appConfig.routers.find(router => router.name === name)
            }
          }
        }

        function plugin$2(app) {
          const prodApp = createProdApp(appConfig);
          globalThis.app = prodApp;
        }

function plugin$1(app) {
	globalThis.$handle = (event) => app.h3App.handler(event);
}

/**
 * Traverses the module graph and collects assets for a given chunk
 *
 * @param {any} manifest Client manifest
 * @param {string} id Chunk id
 * @param {Map<string, string[]>} assetMap Cache of assets
 * @param {string[]} stack Stack of chunk ids to prevent circular dependencies
 * @returns Array of asset URLs
 */
function findAssetsInViteManifest(manifest, id, assetMap = new Map(), stack = []) {
	if (stack.includes(id)) {
		return [];
	}

	const cached = assetMap.get(id);
	if (cached) {
		return cached;
	}
	const chunk = manifest[id];
	if (!chunk) {
		return [];
	}

	const assets = [
		...(chunk.assets?.filter(Boolean) || []),
		...(chunk.css?.filter(Boolean) || [])
	];
	if (chunk.imports) {
		stack.push(id);
		for (let i = 0, l = chunk.imports.length; i < l; i++) {
			assets.push(...findAssetsInViteManifest(manifest, chunk.imports[i], assetMap, stack));
		}
		stack.pop();
	}
	assets.push(chunk.file);
	const all = Array.from(new Set(assets));
	assetMap.set(id, all);

	return all;
}

/** @typedef {import("../app.js").App & { config: { buildManifest: { [key:string]: any } }}} ProdApp */

function createHtmlTagsForAssets(router, app, assets) {
	return assets
		.filter(
			(asset) =>
				asset.endsWith(".css") ||
				asset.endsWith(".js") ||
				asset.endsWith(".mjs"),
		)
		.map((asset) => ({
			tag: "link",
			attrs: {
				href: joinURL(app.config.server.baseURL ?? "/", router.base, asset),
				key: join$1(app.config.server.baseURL ?? "", router.base, asset),
				...(asset.endsWith(".css")
					? { rel: "stylesheet", fetchPriority: "high" }
					: { rel: "modulepreload" }),
			},
		}));
}

/**
 *
 * @param {ProdApp} app
 * @returns
 */
function createProdManifest(app) {
	const manifest = new Proxy(
		{},
		{
			get(target, routerName) {
				invariant(typeof routerName === "string", "Bundler name expected");
				const router = app.getRouter(routerName);
				const bundlerManifest = app.config.buildManifest[routerName];

				invariant(
					router.type !== "static",
					"manifest not available for static router",
				);
				return {
					handler: router.handler,
					async assets() {
						/** @type {{ [key: string]: string[] }} */
						let assets = {};
						assets[router.handler] = await this.inputs[router.handler].assets();
						for (const route of (await router.internals.routes?.getRoutes()) ??
							[]) {
							assets[route.filePath] = await this.inputs[
								route.filePath
							].assets();
						}
						return assets;
					},
					async routes() {
						return (await router.internals.routes?.getRoutes()) ?? [];
					},
					async json() {
						/** @type {{ [key: string]: { output: string; assets: string[]} }} */
						let json = {};
						for (const input of Object.keys(this.inputs)) {
							json[input] = {
								output: this.inputs[input].output.path,
								assets: await this.inputs[input].assets(),
							};
						}
						return json;
					},
					chunks: new Proxy(
						{},
						{
							get(target, chunk) {
								invariant(typeof chunk === "string", "Chunk expected");
								const chunkPath = join$1(
									router.outDir,
									router.base,
									chunk + ".mjs",
								);
								return {
									import() {
										if (globalThis.$$chunks[chunk + ".mjs"]) {
											return globalThis.$$chunks[chunk + ".mjs"];
										}
										return import(
											/* @vite-ignore */ pathToFileURL(chunkPath).href
										);
									},
									output: {
										path: chunkPath,
									},
								};
							},
						},
					),
					inputs: new Proxy(
						{},
						{
							ownKeys(target) {
								const keys = Object.keys(bundlerManifest)
									.filter((id) => bundlerManifest[id].isEntry)
									.map((id) => id);
								return keys;
							},
							getOwnPropertyDescriptor(k) {
								return {
									enumerable: true,
									configurable: true,
								};
							},
							get(target, input) {
								invariant(typeof input === "string", "Input expected");
								if (router.target === "server") {
									const id =
										input === router.handler
											? virtualId(handlerModule(router))
											: input;
									return {
										assets() {
											return createHtmlTagsForAssets(
												router,
												app,
												findAssetsInViteManifest(bundlerManifest, id),
											);
										},
										output: {
											path: join$1(
												router.outDir,
												router.base,
												bundlerManifest[id].file,
											),
										},
									};
								} else if (router.target === "browser") {
									const id =
										input === router.handler && !input.endsWith(".html")
											? virtualId(handlerModule(router))
											: input;
									return {
										import() {
											return import(
												/* @vite-ignore */ joinURL(
													app.config.server.baseURL ?? "",
													router.base,
													bundlerManifest[id].file,
												)
											);
										},
										assets() {
											return createHtmlTagsForAssets(
												router,
												app,
												findAssetsInViteManifest(bundlerManifest, id),
											);
										},
										output: {
											path: joinURL(
												app.config.server.baseURL ?? "",
												router.base,
												bundlerManifest[id].file,
											),
										},
									};
								}
							},
						},
					),
				};
			},
		},
	);

	return manifest;
}

function plugin() {
	globalThis.MANIFEST =
		createProdManifest(globalThis.app)
			;
}

const chunks = {};
			 



			 function app() {
				 globalThis.$$chunks = chunks;
			 }

const plugins = [
  plugin$2,
plugin$1,
plugin,
app
];

const assets = {
  "/index.html": {
    "type": "text/html; charset=utf-8",
    "encoding": null,
    "etag": "\"132dc-x1IyXfB+8VSyOjgO/zUeF6FC/tI\"",
    "mtime": "2026-07-13T17:12:08.819Z",
    "size": 78556,
    "path": "../public/index.html"
  },
  "/index.html.br": {
    "type": "text/html; charset=utf-8",
    "encoding": "br",
    "etag": "\"baa-AuAyUODtiMNo6r3xs2ND13xZvhE\"",
    "mtime": "2026-07-13T17:12:08.862Z",
    "size": 2986,
    "path": "../public/index.html.br"
  },
  "/index.html.gz": {
    "type": "text/html; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"e57-MaGLF7MQkx8hbTRC16D/XXWnYCg\"",
    "mtime": "2026-07-13T17:12:08.822Z",
    "size": 3671,
    "path": "../public/index.html.gz"
  },
  "/robots.txt": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"e3-xhQcOegH3AxOY4ot6A+zdGdjTNU\"",
    "mtime": "2026-07-13T17:12:08.006Z",
    "size": 227,
    "path": "../public/robots.txt"
  },
  "/_build/.vite/manifest.json.br": {
    "type": "application/json",
    "encoding": "br",
    "etag": "\"b61-xZe/NB9Zq0+tZ5uRZOYYoBz6xCE\"",
    "mtime": "2026-07-13T17:12:08.051Z",
    "size": 2913,
    "path": "../public/_build/.vite/manifest.json.br"
  },
  "/_build/.vite/manifest.json": {
    "type": "application/json",
    "encoding": null,
    "etag": "\"8b0a-DZYqClntwPzSb/riB/VCgZ8kfWI\"",
    "mtime": "2026-07-13T17:12:08.010Z",
    "size": 35594,
    "path": "../public/_build/.vite/manifest.json"
  },
  "/_build/.vite/manifest.json.gz": {
    "type": "application/json",
    "encoding": "gzip",
    "etag": "\"cec-VJ52bMvliBwsU8pIiDy6edMtFCo\"",
    "mtime": "2026-07-13T17:12:08.050Z",
    "size": 3308,
    "path": "../public/_build/.vite/manifest.json.gz"
  },
  "/_server/assets/app-CdvevsAi.css.br": {
    "type": "text/css; charset=utf-8",
    "encoding": "br",
    "etag": "\"15a7-Qgi0FhpBAtfEsQioH7tE+IQZXQU\"",
    "mtime": "2026-07-13T17:12:08.050Z",
    "size": 5543,
    "path": "../public/_server/assets/app-CdvevsAi.css.br"
  },
  "/_server/assets/app-CdvevsAi.css": {
    "type": "text/css; charset=utf-8",
    "encoding": null,
    "etag": "\"78a0-IMZCpfNsV7zfcnhx9CSfv9P6atY\"",
    "mtime": "2026-07-13T17:12:08.016Z",
    "size": 30880,
    "path": "../public/_server/assets/app-CdvevsAi.css"
  },
  "/_server/assets/app-CdvevsAi.css.gz": {
    "type": "text/css; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"1936-q30HEmsaLH2hhbHthfbxwlCxQcg\"",
    "mtime": "2026-07-13T17:12:08.050Z",
    "size": 6454,
    "path": "../public/_server/assets/app-CdvevsAi.css.gz"
  },
  "/_build/assets/EntityDetailModal-0P0uSLyL.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"b9b-NxdnSiVxDstrEZm+80wFIrYNcng\"",
    "mtime": "2026-07-13T17:12:08.051Z",
    "size": 2971,
    "path": "../public/_build/assets/EntityDetailModal-0P0uSLyL.js.br"
  },
  "/_build/assets/EntityDetailModal-0P0uSLyL.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"2481-S2WXWsWaTnlVi9CEJYyalPVpu1M\"",
    "mtime": "2026-07-13T17:12:08.011Z",
    "size": 9345,
    "path": "../public/_build/assets/EntityDetailModal-0P0uSLyL.js"
  },
  "/_build/assets/EntityDetailModal-0P0uSLyL.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"d08-Et6nzQMxLC9QdB06TLRFqM42xJE\"",
    "mtime": "2026-07-13T17:12:08.051Z",
    "size": 3336,
    "path": "../public/_build/assets/EntityDetailModal-0P0uSLyL.js.gz"
  },
  "/_build/assets/Icon-ET8315Ce.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"33a-uCgW0yKld+x4s++USmuupImH0JY\"",
    "mtime": "2026-07-13T17:12:08.051Z",
    "size": 826,
    "path": "../public/_build/assets/Icon-ET8315Ce.js.br"
  },
  "/_build/assets/Icon-ET8315Ce.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"6eb-64ZsqL9FSVQKaJgb9eu3qq4ohyU\"",
    "mtime": "2026-07-13T17:12:08.011Z",
    "size": 1771,
    "path": "../public/_build/assets/Icon-ET8315Ce.js"
  },
  "/_build/assets/Icon-ET8315Ce.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"3b1-qTMSa6wM61/nhbyjPcki3xyR48Y\"",
    "mtime": "2026-07-13T17:12:08.051Z",
    "size": 945,
    "path": "../public/_build/assets/Icon-ET8315Ce.js.gz"
  },
  "/_build/assets/LocationSelect-B11A4peJ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1b8-PL6zxagmNDiFuvcSMFq5YGbXhaI\"",
    "mtime": "2026-07-13T17:12:08.011Z",
    "size": 440,
    "path": "../public/_build/assets/LocationSelect-B11A4peJ.js"
  },
  "/_build/assets/PrintButton-UpwaWxOx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1de-qYQgv3BHoBEajlVp55dKyntDMQA\"",
    "mtime": "2026-07-13T17:12:08.011Z",
    "size": 478,
    "path": "../public/_build/assets/PrintButton-UpwaWxOx.js"
  },
  "/_build/assets/ProductLineEditor-DXqy-c7L.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"d31-P6ghGTzY0uhKLEGT54XUmSpLzQs\"",
    "mtime": "2026-07-13T17:12:08.011Z",
    "size": 3377,
    "path": "../public/_build/assets/ProductLineEditor-DXqy-c7L.js"
  },
  "/_build/assets/ProductLineEditor-DXqy-c7L.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"523-gp7VoTfeD4LIk2JYJIFrzY0VxHU\"",
    "mtime": "2026-07-13T17:12:08.052Z",
    "size": 1315,
    "path": "../public/_build/assets/ProductLineEditor-DXqy-c7L.js.br"
  },
  "/_build/assets/ProductLineEditor-DXqy-c7L.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"5ae-6f3C+13Sp0iNDTVkRsMknpcL9S4\"",
    "mtime": "2026-07-13T17:12:08.051Z",
    "size": 1454,
    "path": "../public/_build/assets/ProductLineEditor-DXqy-c7L.js.gz"
  },
  "/_build/assets/RouteTabs-DHMRL8EJ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"246-bgqYpl+GtopV7My4yAWMrxEkP30\"",
    "mtime": "2026-07-13T17:12:08.011Z",
    "size": 582,
    "path": "../public/_build/assets/RouteTabs-DHMRL8EJ.js"
  },
  "/_build/assets/SearchSelect-BFmV4tA9.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"d4b-CzNXnc3tTzrQGA4wD9ZJuKhuxQ0\"",
    "mtime": "2026-07-13T17:12:08.011Z",
    "size": 3403,
    "path": "../public/_build/assets/SearchSelect-BFmV4tA9.js"
  },
  "/_build/assets/SearchSelect-BFmV4tA9.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"592-uXOx/k2+Ms8gtmmmfc8KJU5rnnY\"",
    "mtime": "2026-07-13T17:12:08.063Z",
    "size": 1426,
    "path": "../public/_build/assets/SearchSelect-BFmV4tA9.js.br"
  },
  "/_build/assets/SearchSelect-BFmV4tA9.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"670-jiOOo47Pd+ZGm5W8enJjO3bIkMc\"",
    "mtime": "2026-07-13T17:12:08.052Z",
    "size": 1648,
    "path": "../public/_build/assets/SearchSelect-BFmV4tA9.js.gz"
  },
  "/_build/assets/Spinner-BRQ7WrJe.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"19a-7tACB4mnl/9wkN050CR95vIOVd0\"",
    "mtime": "2026-07-13T17:12:08.011Z",
    "size": 410,
    "path": "../public/_build/assets/Spinner-BRQ7WrJe.js"
  },
  "/_build/assets/StableInput-Tu2gFj_C.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1ee-g9+HMQ5Sp+OMY8c9V+XebzcqKao\"",
    "mtime": "2026-07-13T17:12:08.011Z",
    "size": 494,
    "path": "../public/_build/assets/StableInput-Tu2gFj_C.js"
  },
  "/_build/assets/_id_-qWeFqjrt.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"1153-89AeVZum2a3Q975wSCF9BjA1Y9E\"",
    "mtime": "2026-07-13T17:12:08.011Z",
    "size": 4435,
    "path": "../public/_build/assets/_id_-qWeFqjrt.js"
  },
  "/_build/assets/_id_-qWeFqjrt.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"5a8-l3cCuT4zkXR8HrxYvwL5TlMvXhI\"",
    "mtime": "2026-07-13T17:12:08.063Z",
    "size": 1448,
    "path": "../public/_build/assets/_id_-qWeFqjrt.js.br"
  },
  "/_build/assets/_id_-qWeFqjrt.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"64c-ms3c4aN0jeWlNbyU9Z1MF1sNZ7I\"",
    "mtime": "2026-07-13T17:12:08.063Z",
    "size": 1612,
    "path": "../public/_build/assets/_id_-qWeFqjrt.js.gz"
  },
  "/_build/assets/_id_-zL6y3xp4.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"1ff4-12Hp5GiLyFLwhnIztNF/jaUZYA0\"",
    "mtime": "2026-07-13T17:12:08.011Z",
    "size": 8180,
    "path": "../public/_build/assets/_id_-zL6y3xp4.js"
  },
  "/_build/assets/_id_-zL6y3xp4.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"b4b-66gVpoAAD4N0CGLNQq691jFZumg\"",
    "mtime": "2026-07-13T17:12:08.063Z",
    "size": 2891,
    "path": "../public/_build/assets/_id_-zL6y3xp4.js.gz"
  },
  "/_build/assets/_id_-zL6y3xp4.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"a0f-WsTE+ccRuitKP4x776tCGMdlVgk\"",
    "mtime": "2026-07-13T17:12:08.063Z",
    "size": 2575,
    "path": "../public/_build/assets/_id_-zL6y3xp4.js.br"
  },
  "/_build/assets/_number_-B-fj13rq.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"1483-djPpDit6GB76F9bqeAqSfqdrBwU\"",
    "mtime": "2026-07-13T17:12:08.011Z",
    "size": 5251,
    "path": "../public/_build/assets/_number_-B-fj13rq.js"
  },
  "/_build/assets/_number_-B-fj13rq.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"760-dBKXbnz+LUcTOJu8c6t0Ci1/+Ok\"",
    "mtime": "2026-07-13T17:12:08.063Z",
    "size": 1888,
    "path": "../public/_build/assets/_number_-B-fj13rq.js.gz"
  },
  "/_build/assets/_number_-B-fj13rq.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"696-/TAS/slAD9OpQjSm5RYDIq9wmJE\"",
    "mtime": "2026-07-13T17:12:08.064Z",
    "size": 1686,
    "path": "../public/_build/assets/_number_-B-fj13rq.js.br"
  },
  "/_build/assets/aging-1mbhDKuQ.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"1c6c-SBiw9EmGf9d7003QjtpbGd9OG+M\"",
    "mtime": "2026-07-13T17:12:08.011Z",
    "size": 7276,
    "path": "../public/_build/assets/aging-1mbhDKuQ.js"
  },
  "/_build/assets/aging-1mbhDKuQ.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"a35-WK3IoAvMDv8TO8K+qyfYr+KDzg8\"",
    "mtime": "2026-07-13T17:12:08.064Z",
    "size": 2613,
    "path": "../public/_build/assets/aging-1mbhDKuQ.js.br"
  },
  "/_build/assets/aging-1mbhDKuQ.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"b80-o42p+nvwXl3pLckpRWqMmgC2leU\"",
    "mtime": "2026-07-13T17:12:08.064Z",
    "size": 2944,
    "path": "../public/_build/assets/aging-1mbhDKuQ.js.gz"
  },
  "/_build/assets/aiFlows-pJzXHo0K.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"1256-zXPgZ7LiqFGqbeUxspo/QLnAL+E\"",
    "mtime": "2026-07-13T17:12:08.011Z",
    "size": 4694,
    "path": "../public/_build/assets/aiFlows-pJzXHo0K.js"
  },
  "/_build/assets/aiFlows-pJzXHo0K.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"788-GzTPx1j16hjdAq6ko3qLAr2HzMc\"",
    "mtime": "2026-07-13T17:12:08.064Z",
    "size": 1928,
    "path": "../public/_build/assets/aiFlows-pJzXHo0K.js.br"
  },
  "/_build/assets/aiFlows-pJzXHo0K.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"8a7-GA5G8OBEy2Z0lBGc+TUE4wuHnWU\"",
    "mtime": "2026-07-13T17:12:08.064Z",
    "size": 2215,
    "path": "../public/_build/assets/aiFlows-pJzXHo0K.js.gz"
  },
  "/_build/assets/api-6IlEo8y9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3a2-E5Dw/zHF6jbKvmq9+eIynp1Wj8Y\"",
    "mtime": "2026-07-13T17:12:08.011Z",
    "size": 930,
    "path": "../public/_build/assets/api-6IlEo8y9.js"
  },
  "/_build/assets/api-Dky6_J7J.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"5c4-ODI4WhZzP3nLkpD/Fnwwe2KOYks\"",
    "mtime": "2026-07-13T17:12:08.011Z",
    "size": 1476,
    "path": "../public/_build/assets/api-Dky6_J7J.js"
  },
  "/_build/assets/api-Dky6_J7J.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"2be-CZFtx4FrRQkNSNx0Jcq04NMN4dQ\"",
    "mtime": "2026-07-13T17:12:08.069Z",
    "size": 702,
    "path": "../public/_build/assets/api-Dky6_J7J.js.br"
  },
  "/_build/assets/api-Dky6_J7J.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"339-BzclhtQtadlgjewB6aBEMH5j7wE\"",
    "mtime": "2026-07-13T17:12:08.064Z",
    "size": 825,
    "path": "../public/_build/assets/api-Dky6_J7J.js.gz"
  },
  "/_build/assets/arrow-left-wVosysgR.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ee-4cKTU9XuSzF0SzKVzVML6fbKdGg\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 238,
    "path": "../public/_build/assets/arrow-left-wVosysgR.js"
  },
  "/_build/assets/audit-DB3tQL3Z.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"17e2-i/V1/ZzcuBRXUUpNSMmv6xShh1c\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 6114,
    "path": "../public/_build/assets/audit-DB3tQL3Z.js"
  },
  "/_build/assets/audit-DB3tQL3Z.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"80b-pWC3p0q/9xW4Th/1b0Bxw18Aw+k\"",
    "mtime": "2026-07-13T17:12:08.070Z",
    "size": 2059,
    "path": "../public/_build/assets/audit-DB3tQL3Z.js.br"
  },
  "/_build/assets/audit-DB3tQL3Z.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"915-oW75zUdbWFnDllWkDV9TM702Aro\"",
    "mtime": "2026-07-13T17:12:08.069Z",
    "size": 2325,
    "path": "../public/_build/assets/audit-DB3tQL3Z.js.gz"
  },
  "/_build/assets/auth-DFI69Cb9.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"1006-a4rVNL/eVWrrHDdxXRqkc0YgkzI\"",
    "mtime": "2026-07-13T17:12:08.011Z",
    "size": 4102,
    "path": "../public/_build/assets/auth-DFI69Cb9.js"
  },
  "/_build/assets/auth-DFI69Cb9.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"6b1-ujUEz7Le9O8YPD9vGGri8MuSMsQ\"",
    "mtime": "2026-07-13T17:12:08.069Z",
    "size": 1713,
    "path": "../public/_build/assets/auth-DFI69Cb9.js.br"
  },
  "/_build/assets/auth-DFI69Cb9.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"766-xFBzjyMRj5wus7QuS6yL/vl0jao\"",
    "mtime": "2026-07-13T17:12:08.069Z",
    "size": 1894,
    "path": "../public/_build/assets/auth-DFI69Cb9.js.gz"
  },
  "/_build/assets/balance-sheet-W3s69okz.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"726-DPW+nhPlaZMUE3CBmq4jP35GPI4\"",
    "mtime": "2026-07-13T17:12:08.069Z",
    "size": 1830,
    "path": "../public/_build/assets/balance-sheet-W3s69okz.js.gz"
  },
  "/_build/assets/callback-CAsCR86o.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3d4-t+kXjzY/leNrDK6YVMOWXtzMVsg\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 980,
    "path": "../public/_build/assets/callback-CAsCR86o.js"
  },
  "/_build/assets/cash-flow-BxYru15j.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"ef0-lMY8uxBtITehMoiqgUGY/UPAnSU\"",
    "mtime": "2026-07-13T17:12:08.011Z",
    "size": 3824,
    "path": "../public/_build/assets/cash-flow-BxYru15j.js"
  },
  "/_build/assets/cash-flow-BxYru15j.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"5dd-iYUKbIfh03cMpr1vblpRslZebWM\"",
    "mtime": "2026-07-13T17:12:08.078Z",
    "size": 1501,
    "path": "../public/_build/assets/cash-flow-BxYru15j.js.br"
  },
  "/_build/assets/balance-sheet-W3s69okz.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"66a-gudORSApMeMBnkRIq94FI/wnDyU\"",
    "mtime": "2026-07-13T17:12:08.069Z",
    "size": 1642,
    "path": "../public/_build/assets/balance-sheet-W3s69okz.js.br"
  },
  "/_build/assets/cash-flow-BxYru15j.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"699-ZNq/yyABc1bnsPDC4ncRxuxTJXA\"",
    "mtime": "2026-07-13T17:12:08.069Z",
    "size": 1689,
    "path": "../public/_build/assets/cash-flow-BxYru15j.js.gz"
  },
  "/_build/assets/client-CJEt9ZyU.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"a51b-1qEMSyXI8N9GKRwVloGQ4/uKsh0\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 42267,
    "path": "../public/_build/assets/client-CJEt9ZyU.js"
  },
  "/_build/assets/client-CJEt9ZyU.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"296a-z+3xyYBd5IhwWcYj1x+2Fh/F5Lg\"",
    "mtime": "2026-07-13T17:12:08.117Z",
    "size": 10602,
    "path": "../public/_build/assets/client-CJEt9ZyU.js.br"
  },
  "/_build/assets/client-CdvevsAi.css": {
    "type": "text/css; charset=utf-8",
    "encoding": null,
    "etag": "\"78a0-IMZCpfNsV7zfcnhx9CSfv9P6atY\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 30880,
    "path": "../public/_build/assets/client-CdvevsAi.css"
  },
  "/_build/assets/balance-sheet-W3s69okz.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"131b-MJAzn5F6lna42b8uKCEx2pMC6m4\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 4891,
    "path": "../public/_build/assets/balance-sheet-W3s69okz.js"
  },
  "/_build/assets/components-DyM2LSwN.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3d5-z3d4KUaqM/kqqG69d0Q0XHkbRNs\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 981,
    "path": "../public/_build/assets/components-DyM2LSwN.js"
  },
  "/_build/assets/client-CJEt9ZyU.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"2f4f-177a5knMUrE2niQS10+b5RrGLtk\"",
    "mtime": "2026-07-13T17:12:08.070Z",
    "size": 12111,
    "path": "../public/_build/assets/client-CJEt9ZyU.js.gz"
  },
  "/_build/assets/compras-Ba7-G8Hy.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"2252-oY7g/6RZKar7O0MvUNAzKR9n4yI\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 8786,
    "path": "../public/_build/assets/compras-Ba7-G8Hy.js"
  },
  "/_build/assets/client-CdvevsAi.css.gz": {
    "type": "text/css; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"1936-q30HEmsaLH2hhbHthfbxwlCxQcg\"",
    "mtime": "2026-07-13T17:12:08.078Z",
    "size": 6454,
    "path": "../public/_build/assets/client-CdvevsAi.css.gz"
  },
  "/_build/assets/client-CdvevsAi.css.br": {
    "type": "text/css; charset=utf-8",
    "encoding": "br",
    "etag": "\"15a7-Qgi0FhpBAtfEsQioH7tE+IQZXQU\"",
    "mtime": "2026-07-13T17:12:08.098Z",
    "size": 5543,
    "path": "../public/_build/assets/client-CdvevsAi.css.br"
  },
  "/_build/assets/compras-Ba7-G8Hy.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"b6a-59+7VioLqZQr+iC6G8FDiEENz84\"",
    "mtime": "2026-07-13T17:12:08.078Z",
    "size": 2922,
    "path": "../public/_build/assets/compras-Ba7-G8Hy.js.br"
  },
  "/_build/assets/compras-Ba7-G8Hy.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"d27-MxfoPAw/ovNE8jIJTs6GSFlWzWY\"",
    "mtime": "2026-07-13T17:12:08.078Z",
    "size": 3367,
    "path": "../public/_build/assets/compras-Ba7-G8Hy.js.gz"
  },
  "/_build/assets/count-DyWmPEuo.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"834-Ue8eunybdBN2gA7Vr7oV8G7dEE4\"",
    "mtime": "2026-07-13T17:12:08.085Z",
    "size": 2100,
    "path": "../public/_build/assets/count-DyWmPEuo.js.gz"
  },
  "/_build/assets/count-DyWmPEuo.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"13a7-HfSGMvo2eiX/Zm72m1rRH3K4Xag\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 5031,
    "path": "../public/_build/assets/count-DyWmPEuo.js"
  },
  "/_build/assets/count-DyWmPEuo.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"734-7QSOic87xgCfWHNmbIcTLUQUx5s\"",
    "mtime": "2026-07-13T17:12:08.085Z",
    "size": 1844,
    "path": "../public/_build/assets/count-DyWmPEuo.js.br"
  },
  "/_build/assets/dates-B_ebQcaW.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b6-rdU8eaEGKt6wddq5AGWok+aYKVo\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 182,
    "path": "../public/_build/assets/dates-B_ebQcaW.js"
  },
  "/_build/assets/csv-D2ikwZU9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2c8-Mjk/4OGOxOMmKimt51lk52vJf9k\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 712,
    "path": "../public/_build/assets/csv-D2ikwZU9.js"
  },
  "/_build/assets/defaults-ugUdWWU5.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"5ba-BK9ImSRTIiSo4KiI9admYO6Wcog\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 1466,
    "path": "../public/_build/assets/defaults-ugUdWWU5.js"
  },
  "/_build/assets/defaults-ugUdWWU5.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"2aa-IByIIhM2beUSx80v747KCiUE/JQ\"",
    "mtime": "2026-07-13T17:12:08.085Z",
    "size": 682,
    "path": "../public/_build/assets/defaults-ugUdWWU5.js.br"
  },
  "/_build/assets/defaults-ugUdWWU5.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"30a-oyD9vLv57LzynT8eUvxkJOvGXvs\"",
    "mtime": "2026-07-13T17:12:08.085Z",
    "size": 778,
    "path": "../public/_build/assets/defaults-ugUdWWU5.js.gz"
  },
  "/_build/assets/facturacion-DFOvg0HH.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"297a-2Zl4QmlJNVfpI/TB40LFflT9/7s\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 10618,
    "path": "../public/_build/assets/facturacion-DFOvg0HH.js"
  },
  "/_build/assets/employees-DWU8Rzpp.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"211-rXhCCIBikOFQiks/RVZPWZXv5EU\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 529,
    "path": "../public/_build/assets/employees-DWU8Rzpp.js"
  },
  "/_build/assets/facturacion-DFOvg0HH.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"c79-1DpKHAqsAAOy4+MHsDdLceDg68g\"",
    "mtime": "2026-07-13T17:12:08.098Z",
    "size": 3193,
    "path": "../public/_build/assets/facturacion-DFOvg0HH.js.br"
  },
  "/_build/assets/gemini-DcnDWG48.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"685-1w/4NLPKrXHxnFoIDiLY69J1/Iw\"",
    "mtime": "2026-07-13T17:12:08.099Z",
    "size": 1669,
    "path": "../public/_build/assets/gemini-DcnDWG48.js.br"
  },
  "/_build/assets/facturacion-DFOvg0HH.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"e37-tUXGFR4tku6WWmvS5fk09yi7dzM\"",
    "mtime": "2026-07-13T17:12:08.098Z",
    "size": 3639,
    "path": "../public/_build/assets/facturacion-DFOvg0HH.js.gz"
  },
  "/_build/assets/gemini-DcnDWG48.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"12ac-7/UHfuyThrwe7xpfUN9KexRRo1k\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 4780,
    "path": "../public/_build/assets/gemini-DcnDWG48.js"
  },
  "/_build/assets/gemini-DcnDWG48.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"775-UxP6qSSGgechZolCUBQyytcmN5E\"",
    "mtime": "2026-07-13T17:12:08.098Z",
    "size": 1909,
    "path": "../public/_build/assets/gemini-DcnDWG48.js.gz"
  },
  "/_build/assets/historial-CTnP2Ct9.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"209c-bqvwdWe/oivJ+SQQA0tYVCaQkXY\"",
    "mtime": "2026-07-13T17:12:08.179Z",
    "size": 8348,
    "path": "../public/_build/assets/historial-CTnP2Ct9.js.br"
  },
  "/_build/assets/historial-CTnP2Ct9.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"81d0-Rz4+82g/l+DWA+a00squxQNDNMo\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 33232,
    "path": "../public/_build/assets/historial-CTnP2Ct9.js"
  },
  "/_build/assets/income-statement-B3SxdEbK.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"109b-HiuSdGqers812hj1R5Lgn5xyV2E\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 4251,
    "path": "../public/_build/assets/income-statement-B3SxdEbK.js"
  },
  "/_build/assets/historial-CTnP2Ct9.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"24d8-HAhBt3YYURCbBSIr/ZST4lY9ipA\"",
    "mtime": "2026-07-13T17:12:08.098Z",
    "size": 9432,
    "path": "../public/_build/assets/historial-CTnP2Ct9.js.gz"
  },
  "/_build/assets/income-statement-B3SxdEbK.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"600-6+XFiac+MjKRY0VE14JY1jlL6M8\"",
    "mtime": "2026-07-13T17:12:08.100Z",
    "size": 1536,
    "path": "../public/_build/assets/income-statement-B3SxdEbK.js.br"
  },
  "/_build/assets/income-statement-B3SxdEbK.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"6b2-R7Gm8IX0yi5VUKgM1TpZ4N+fTQc\"",
    "mtime": "2026-07-13T17:12:08.099Z",
    "size": 1714,
    "path": "../public/_build/assets/income-statement-B3SxdEbK.js.gz"
  },
  "/_build/assets/index-29kvO1rC.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"341a-ipky144UogXA3iOxKea37SxJYlA\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 13338,
    "path": "../public/_build/assets/index-29kvO1rC.js"
  },
  "/_build/assets/index-29kvO1rC.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"d29-kSyRYfoElgq14bCmCwgP60ZaTLQ\"",
    "mtime": "2026-07-13T17:12:08.132Z",
    "size": 3369,
    "path": "../public/_build/assets/index-29kvO1rC.js.br"
  },
  "/_build/assets/index-29kvO1rC.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"f23-z3a9u3vQT2ZRqOEWI2IahpocZas\"",
    "mtime": "2026-07-13T17:12:08.100Z",
    "size": 3875,
    "path": "../public/_build/assets/index-29kvO1rC.js.gz"
  },
  "/_build/assets/index-B25tf-nU.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"21bc-kKC/v4Uu2qCMUycsAyKQJYHJ78Y\"",
    "mtime": "2026-07-13T17:12:08.117Z",
    "size": 8636,
    "path": "../public/_build/assets/index-B25tf-nU.js.gz"
  },
  "/_build/assets/index-B25tf-nU.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"7b39-ICCEjRounvAC+Y27UG5YEJcXeaI\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 31545,
    "path": "../public/_build/assets/index-B25tf-nU.js"
  },
  "/_build/assets/index-BdUZQ4tz.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"3c41-wJUDoKK941pYyybjY3RFgrt8I04\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 15425,
    "path": "../public/_build/assets/index-BdUZQ4tz.js"
  },
  "/_build/assets/index-B25tf-nU.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"1da0-WqAWa/KMny/Dzk3hZUJwFi+lUH4\"",
    "mtime": "2026-07-13T17:12:08.179Z",
    "size": 7584,
    "path": "../public/_build/assets/index-B25tf-nU.js.br"
  },
  "/_build/assets/index-BdUZQ4tz.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"fe1-wiB+2PUTHlBO6G3cT7203KhJq7A\"",
    "mtime": "2026-07-13T17:12:08.179Z",
    "size": 4065,
    "path": "../public/_build/assets/index-BdUZQ4tz.js.br"
  },
  "/_build/assets/index-BdUZQ4tz.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"124d-4OSw0UEbIFC3rOMKNH3Y6FHujpk\"",
    "mtime": "2026-07-13T17:12:08.132Z",
    "size": 4685,
    "path": "../public/_build/assets/index-BdUZQ4tz.js.gz"
  },
  "/_build/assets/index-BigjWbV-.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"2b91-5VYl68oz6ID5pNnOd6P+HWJd77A\"",
    "mtime": "2026-07-13T17:12:08.195Z",
    "size": 11153,
    "path": "../public/_build/assets/index-BigjWbV-.js.br"
  },
  "/_build/assets/index-BigjWbV-.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"32bc-XiYcwvvKcyMmQnuZw6ZIZl+VwJU\"",
    "mtime": "2026-07-13T17:12:08.179Z",
    "size": 12988,
    "path": "../public/_build/assets/index-BigjWbV-.js.gz"
  },
  "/_build/assets/index-CPbo4n5j.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"1175-DH/RV5Xl4yROOLlYit14dcnJJIA\"",
    "mtime": "2026-07-13T17:12:08.179Z",
    "size": 4469,
    "path": "../public/_build/assets/index-CPbo4n5j.js.br"
  },
  "/_build/assets/index-CPbo4n5j.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"3d07-aNvSOs3BUu8uk3Y5N6SMfjiBO2w\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 15623,
    "path": "../public/_build/assets/index-CPbo4n5j.js"
  },
  "/_build/assets/index-CPbo4n5j.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"13d4-V1R6m142MmGxyIYG7NGx/a7eNE4\"",
    "mtime": "2026-07-13T17:12:08.179Z",
    "size": 5076,
    "path": "../public/_build/assets/index-CPbo4n5j.js.gz"
  },
  "/_build/assets/index-CVhoIfqG.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"411b-oxpZrOc58u/PRo1Uaho3brnSiUU\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 16667,
    "path": "../public/_build/assets/index-CVhoIfqG.js"
  },
  "/_build/assets/index-Cyzascnw.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c0-gdXuBYpwQgVAoEUrp/r9YZo92EA\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 192,
    "path": "../public/_build/assets/index-Cyzascnw.js"
  },
  "/_build/assets/index-CVhoIfqG.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"17dd-pTAXtPJJWbn/IUqzbYQkZ3nshJc\"",
    "mtime": "2026-07-13T17:12:08.179Z",
    "size": 6109,
    "path": "../public/_build/assets/index-CVhoIfqG.js.gz"
  },
  "/_build/assets/index-CzWuzl0X.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"13be-h2PrFgI9cUIhKgyTUGLi4kET75M\"",
    "mtime": "2026-07-13T17:12:08.192Z",
    "size": 5054,
    "path": "../public/_build/assets/index-CzWuzl0X.js.br"
  },
  "/_build/assets/index-CzWuzl0X.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"1664-+uxb2O660YWlcrrqm+DvDoN90fk\"",
    "mtime": "2026-07-13T17:12:08.179Z",
    "size": 5732,
    "path": "../public/_build/assets/index-CzWuzl0X.js.gz"
  },
  "/_build/assets/index-CzWuzl0X.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"4e00-aQ4ixJAXr6XcqvtTQEf5gh82idY\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 19968,
    "path": "../public/_build/assets/index-CzWuzl0X.js"
  },
  "/_build/assets/index-D00D_coe.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c1-5x36stfj31Ke9cjwfyB3s0N88Ro\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 193,
    "path": "../public/_build/assets/index-D00D_coe.js"
  },
  "/_build/assets/index-HZeqe-LA.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"591b-rWXBiF52kJ9l+ElGP/WvyXUKGKo\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 22811,
    "path": "../public/_build/assets/index-HZeqe-LA.js"
  },
  "/_build/assets/index-HZeqe-LA.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"1726-+EMzSb0m7eanRthHr7EwTpDOjRg\"",
    "mtime": "2026-07-13T17:12:08.198Z",
    "size": 5926,
    "path": "../public/_build/assets/index-HZeqe-LA.js.br"
  },
  "/_build/assets/index-dlW0AZ1t.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"a4a-y5y2V3KfF3B35/oBmJYDoDbKN0E\"",
    "mtime": "2026-07-13T17:12:08.196Z",
    "size": 2634,
    "path": "../public/_build/assets/index-dlW0AZ1t.js.br"
  },
  "/_build/assets/index-dlW0AZ1t.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"2031-zymCYfFDUyZdlsnlSUePtyIEN6I\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 8241,
    "path": "../public/_build/assets/index-dlW0AZ1t.js"
  },
  "/_build/assets/index-HZeqe-LA.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"1a1b-2rBsCFZ+IHwKkE87qEHgRdE9uaQ\"",
    "mtime": "2026-07-13T17:12:08.192Z",
    "size": 6683,
    "path": "../public/_build/assets/index-HZeqe-LA.js.gz"
  },
  "/_build/assets/index-dlW0AZ1t.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"ba8-E+Q4ZCBoLyuW+VJw2b9UBdKRNNU\"",
    "mtime": "2026-07-13T17:12:08.192Z",
    "size": 2984,
    "path": "../public/_build/assets/index-dlW0AZ1t.js.gz"
  },
  "/_build/assets/inventory-CTlUWN2v.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"235-8X1wH52u5C2i8ak3qXm08Am6Vaw\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 565,
    "path": "../public/_build/assets/inventory-CTlUWN2v.js"
  },
  "/_build/assets/index-BigjWbV-.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"9b7d-C4v1HdueNQ0fMhvc1uPZfWc45cE\"",
    "mtime": "2026-07-13T17:12:08.012Z",
    "size": 39805,
    "path": "../public/_build/assets/index-BigjWbV-.js"
  },
  "/_build/assets/index-CVhoIfqG.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"1563-aE1tCHrSAYF6+1CesWggOtTffY8\"",
    "mtime": "2026-07-13T17:12:08.192Z",
    "size": 5475,
    "path": "../public/_build/assets/index-CVhoIfqG.js.br"
  },
  "/_build/assets/journalBuilder-CuA0sOvc.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"505-fseW1t8mlkuDzDhL44xTT2Hqdpc\"",
    "mtime": "2026-07-13T17:12:08.197Z",
    "size": 1285,
    "path": "../public/_build/assets/journalBuilder-CuA0sOvc.js.br"
  },
  "/_build/assets/journalBuilder-CuA0sOvc.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"e14-Nuz8vwoyDRXqJhh2RdFb2bwRxqk\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 3604,
    "path": "../public/_build/assets/journalBuilder-CuA0sOvc.js"
  },
  "/_build/assets/journalBuilder-CuA0sOvc.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"5b1-/f/OOCwB6JSpwo/I0UfOVuiB57I\"",
    "mtime": "2026-07-13T17:12:08.195Z",
    "size": 1457,
    "path": "../public/_build/assets/journalBuilder-CuA0sOvc.js.gz"
  },
  "/_build/assets/login-B3oCLAiZ.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"83e-fahR5f21NIBQnLmhk+YA7hQn9dI\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 2110,
    "path": "../public/_build/assets/login-B3oCLAiZ.js"
  },
  "/_build/assets/login-B3oCLAiZ.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"3dc-IN8FrU067TLvnrEgb/4YX/WRw28\"",
    "mtime": "2026-07-13T17:12:08.196Z",
    "size": 988,
    "path": "../public/_build/assets/login-B3oCLAiZ.js.br"
  },
  "/_build/assets/login-B3oCLAiZ.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"452-Rw0ROASLMkE9WiujSSISLrk3Aus\"",
    "mtime": "2026-07-13T17:12:08.196Z",
    "size": 1106,
    "path": "../public/_build/assets/login-B3oCLAiZ.js.gz"
  },
  "/_build/assets/mermas-GPz37xX2.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"76f-D4JEYbV4NREqbbfU0iImOHwwJuo\"",
    "mtime": "2026-07-13T17:12:08.199Z",
    "size": 1903,
    "path": "../public/_build/assets/mermas-GPz37xX2.js.br"
  },
  "/_build/assets/mermas-GPz37xX2.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"1407-3FlC6JYb+uj0sDK8MXG77XPyTZg\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 5127,
    "path": "../public/_build/assets/mermas-GPz37xX2.js"
  },
  "/_build/assets/mermas-GPz37xX2.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"88c-A5iwib7ugaAz+hAJfP//OMCG3uI\"",
    "mtime": "2026-07-13T17:12:08.196Z",
    "size": 2188,
    "path": "../public/_build/assets/mermas-GPz37xX2.js.gz"
  },
  "/_build/assets/monthly-pnl-D2j-zKJD.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"1663-oEGWi1deOowD7gNq1OnuvgQ291Q\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 5731,
    "path": "../public/_build/assets/monthly-pnl-D2j-zKJD.js"
  },
  "/_build/assets/movements-CToiAnov.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"3dba-RuX1SBAT8tQJ9zO52GGYV6/zUx4\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 15802,
    "path": "../public/_build/assets/movements-CToiAnov.js"
  },
  "/_build/assets/monthly-pnl-D2j-zKJD.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"952-0ysnKUuW+kfq2gbyuXY8GtqaCu8\"",
    "mtime": "2026-07-13T17:12:08.197Z",
    "size": 2386,
    "path": "../public/_build/assets/monthly-pnl-D2j-zKJD.js.gz"
  },
  "/_build/assets/monthly-pnl-D2j-zKJD.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"874-YEsWl4CiCKxztpewfzcKmrYBT3w\"",
    "mtime": "2026-07-13T17:12:08.202Z",
    "size": 2164,
    "path": "../public/_build/assets/monthly-pnl-D2j-zKJD.js.br"
  },
  "/_build/assets/movements-CToiAnov.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"1027-fNl6Yx4gqIGlarn9rhZtwhcBfzo\"",
    "mtime": "2026-07-13T17:12:08.213Z",
    "size": 4135,
    "path": "../public/_build/assets/movements-CToiAnov.js.br"
  },
  "/_build/assets/pencil-DbCIcQ_5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"15d-btmE4q9+fJ0W94h9e81zr0HJqk4\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 349,
    "path": "../public/_build/assets/pencil-DbCIcQ_5.js"
  },
  "/_build/assets/movements-CToiAnov.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"127f-bO1sfRhjB0p/+aXmVK1ExcHbZr8\"",
    "mtime": "2026-07-13T17:12:08.198Z",
    "size": 4735,
    "path": "../public/_build/assets/movements-CToiAnov.js.gz"
  },
  "/_build/assets/plus-Dx1U-C1n.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e2-Iltc9JzxzrqjMcWatEvvMCNSv28\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 226,
    "path": "../public/_build/assets/plus-Dx1U-C1n.js"
  },
  "/_build/assets/print-D8KbxtXD.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"1b2d-SL9rTLORfvqh+kL8KKL4MbjGR7Y\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 6957,
    "path": "../public/_build/assets/print-D8KbxtXD.js"
  },
  "/_build/assets/print-D8KbxtXD.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"845-Sy4N8uMQZBzaGIgTd9VEGYCSBvo\"",
    "mtime": "2026-07-13T17:12:08.211Z",
    "size": 2117,
    "path": "../public/_build/assets/print-D8KbxtXD.js.br"
  },
  "/_build/assets/print-D8KbxtXD.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"941-i0w4CpkQdZojJapZ8WWQmxHsHE0\"",
    "mtime": "2026-07-13T17:12:08.201Z",
    "size": 2369,
    "path": "../public/_build/assets/print-D8KbxtXD.js.gz"
  },
  "/_build/assets/providers-BKV6tiXb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1df-IwkAck1CvogOpuC/MVUILpRRgjg\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 479,
    "path": "../public/_build/assets/providers-BKV6tiXb.js"
  },
  "/_build/assets/printer-D_Jwaduc.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"188-PPmQCpMm6ba9t7D2n4stZR4nXOs\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 392,
    "path": "../public/_build/assets/printer-D_Jwaduc.js"
  },
  "/_build/assets/recurring-CA2S8Vts.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"57c-5e5G/hm1N958SJcJNr633apLN3Y\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 1404,
    "path": "../public/_build/assets/recurring-CA2S8Vts.js"
  },
  "/_build/assets/recurring-CA2S8Vts.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"2dd-u533rzrPtYE0dz0EvP/l22waQ8c\"",
    "mtime": "2026-07-13T17:12:08.202Z",
    "size": 733,
    "path": "../public/_build/assets/recurring-CA2S8Vts.js.gz"
  },
  "/_build/assets/recurring-CA2S8Vts.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"28d-UCJz0a2UuXnfocGjFEJ7un7XXwA\"",
    "mtime": "2026-07-13T17:12:08.202Z",
    "size": 653,
    "path": "../public/_build/assets/recurring-CA2S8Vts.js.br"
  },
  "/_build/assets/reports-Bgd-GFEU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"367-meIK5yQrlGF/w8guimTx93BM5uY\"",
    "mtime": "2026-07-13T17:12:08.013Z",
    "size": 871,
    "path": "../public/_build/assets/reports-Bgd-GFEU.js"
  },
  "/_build/assets/routing-BEPNZw43.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"1ed2-A0H+movt9VpcLARS9873XqMVFh4\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 7890,
    "path": "../public/_build/assets/routing-BEPNZw43.js"
  },
  "/_build/assets/routing-BEPNZw43.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"d26-6kOAZZ5U8+1LG9RItTj7d674iao\"",
    "mtime": "2026-07-13T17:12:08.211Z",
    "size": 3366,
    "path": "../public/_build/assets/routing-BEPNZw43.js.br"
  },
  "/_build/assets/routing-BEPNZw43.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"e53-4uIlCrphxQzntPC594FSqMK3vAc\"",
    "mtime": "2026-07-13T17:12:08.202Z",
    "size": 3667,
    "path": "../public/_build/assets/routing-BEPNZw43.js.gz"
  },
  "/_build/assets/scroll-text-DvYD_UQE.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a6-ALlK01NztNN/utoJNH4diYm8JLw\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 422,
    "path": "../public/_build/assets/scroll-text-DvYD_UQE.js"
  },
  "/_build/assets/search-B90-czUY.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f7-46DIso2UKChFGNlIe9VPgw6p3I8\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 247,
    "path": "../public/_build/assets/search-B90-czUY.js"
  },
  "/_build/assets/sparkles-DPh9NnqK.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"237-r6CiGFJtB5JuqImEbywgFdukjyU\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 567,
    "path": "../public/_build/assets/sparkles-DPh9NnqK.js"
  },
  "/_build/assets/sso-X8m-jW9J.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"773-4B7J2BFEz2bzxR7BMi8BmMElQMg\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 1907,
    "path": "../public/_build/assets/sso-X8m-jW9J.js"
  },
  "/_build/assets/sso-X8m-jW9J.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"372-sMP+ExH0E8aO/mwz+9qSzQ7POh0\"",
    "mtime": "2026-07-13T17:12:08.204Z",
    "size": 882,
    "path": "../public/_build/assets/sso-X8m-jW9J.js.br"
  },
  "/_build/assets/store-BB8JaDZn.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"1a81-QvpbvB1rJBL5TKjzWQwBxDrZlUk\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 6785,
    "path": "../public/_build/assets/store-BB8JaDZn.js"
  },
  "/_build/assets/store-BB8JaDZn.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"8a3-jOJfhx3qClTF6s+sWW5E0JSy0o4\"",
    "mtime": "2026-07-13T17:12:08.211Z",
    "size": 2211,
    "path": "../public/_build/assets/store-BB8JaDZn.js.br"
  },
  "/_build/assets/store-BB8JaDZn.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"97b-lIMMWv/SwRAl5LQgGAkxS4/K8/U\"",
    "mtime": "2026-07-13T17:12:08.211Z",
    "size": 2427,
    "path": "../public/_build/assets/store-BB8JaDZn.js.gz"
  },
  "/_build/assets/store-BbhHI1QO.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"1162-kf3bCZ3ArEcK8alEG4qQD/IBbwA\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 4450,
    "path": "../public/_build/assets/store-BbhHI1QO.js"
  },
  "/_build/assets/sso-X8m-jW9J.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"3e8-H98witxJ8oFLb0F91lFB5sxTWR4\"",
    "mtime": "2026-07-13T17:12:08.204Z",
    "size": 1000,
    "path": "../public/_build/assets/sso-X8m-jW9J.js.gz"
  },
  "/_build/assets/store-BbhHI1QO.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"6a1-txrICIVuolRyF8o/9R4Ukd1Rk2c\"",
    "mtime": "2026-07-13T17:12:08.211Z",
    "size": 1697,
    "path": "../public/_build/assets/store-BbhHI1QO.js.br"
  },
  "/_build/assets/store-BbhHI1QO.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"755-8SUuG47vynoXrCvLhp8joHj4Jyk\"",
    "mtime": "2026-07-13T17:12:08.211Z",
    "size": 1877,
    "path": "../public/_build/assets/store-BbhHI1QO.js.gz"
  },
  "/_build/assets/store-BitOu3zS.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"ace-izj0YcH2P2ppYqgJAExKrIZgfIk\"",
    "mtime": "2026-07-13T17:12:08.211Z",
    "size": 2766,
    "path": "../public/_build/assets/store-BitOu3zS.js.gz"
  },
  "/_build/assets/store-C0eiPwcf.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"1196-m7CpeSdqAfAsZqX+xQuN73i/Llg\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 4502,
    "path": "../public/_build/assets/store-C0eiPwcf.js"
  },
  "/_build/assets/store-C0eiPwcf.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"744-xJPEVlOmfotgZgkHWPPCPRs2eSU\"",
    "mtime": "2026-07-13T17:12:08.211Z",
    "size": 1860,
    "path": "../public/_build/assets/store-C0eiPwcf.js.gz"
  },
  "/_build/assets/store-CS7DEtHt.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"7a5-wX+MMLaj8QbTj1nnIMe+lStMsJA\"",
    "mtime": "2026-07-13T17:12:08.213Z",
    "size": 1957,
    "path": "../public/_build/assets/store-CS7DEtHt.js.gz"
  },
  "/_build/assets/store-CS7DEtHt.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"1413-xOa8EMccymTRF0Acit812T+JIGM\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 5139,
    "path": "../public/_build/assets/store-CS7DEtHt.js"
  },
  "/_build/assets/store-CbiN3OHO.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"139f-2NhOn1zdbS++YDvhbDs+uZAjAIc\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 5023,
    "path": "../public/_build/assets/store-CbiN3OHO.js"
  },
  "/_build/assets/store-BitOu3zS.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"9d5-JetCI8/q9eaUSZF1uaB9niY3Ao0\"",
    "mtime": "2026-07-13T17:12:08.214Z",
    "size": 2517,
    "path": "../public/_build/assets/store-BitOu3zS.js.br"
  },
  "/_build/assets/store-CS7DEtHt.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"6cf-RoaqVkeznhONjCDwJnWDT9gHnxc\"",
    "mtime": "2026-07-13T17:12:08.216Z",
    "size": 1743,
    "path": "../public/_build/assets/store-CS7DEtHt.js.br"
  },
  "/_build/assets/store-CbiN3OHO.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"710-v5fCzZwGq+yZChsiBW8s7A1TvE4\"",
    "mtime": "2026-07-13T17:12:08.216Z",
    "size": 1808,
    "path": "../public/_build/assets/store-CbiN3OHO.js.br"
  },
  "/_build/assets/store-BitOu3zS.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"1b04-E6M83F0Li3xNtSseEjxHGt8UYOg\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 6916,
    "path": "../public/_build/assets/store-BitOu3zS.js"
  },
  "/_build/assets/store-C0eiPwcf.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"682-eFKVEWKAfsZmODaLdxPV6Ku7a0w\"",
    "mtime": "2026-07-13T17:12:08.213Z",
    "size": 1666,
    "path": "../public/_build/assets/store-C0eiPwcf.js.br"
  },
  "/_build/assets/store-CbiN3OHO.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"7e5-0ZNkXrR4foVEZ3chI60IZhQI+8k\"",
    "mtime": "2026-07-13T17:12:08.213Z",
    "size": 2021,
    "path": "../public/_build/assets/store-CbiN3OHO.js.gz"
  },
  "/_build/assets/templates-BKS3lFgL.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"6ba7-+d2EOVPmSziM2x/phSK8zRoiBtA\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 27559,
    "path": "../public/_build/assets/templates-BKS3lFgL.js"
  },
  "/_build/assets/templates-BKS3lFgL.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"1bd3-UXIwce4c8NZ3MWSEl4NQTU713fw\"",
    "mtime": "2026-07-13T17:12:08.243Z",
    "size": 7123,
    "path": "../public/_build/assets/templates-BKS3lFgL.js.br"
  },
  "/_build/assets/templates-BKS3lFgL.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"1f76-fkBn3Q7uvIWm0jY23PeprFjKcPk\"",
    "mtime": "2026-07-13T17:12:08.214Z",
    "size": 8054,
    "path": "../public/_build/assets/templates-BKS3lFgL.js.gz"
  },
  "/_build/assets/timesheets-DeGukl3D.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"211-s1oBXYdnUdx+s89qoQ70fEk6EkY\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 529,
    "path": "../public/_build/assets/timesheets-DeGukl3D.js"
  },
  "/_build/assets/transactions-DhVvwvmU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"292-SqkBdQq/HE6s680PB/mYchXJZh4\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 658,
    "path": "../public/_build/assets/transactions-DhVvwvmU.js"
  },
  "/_build/assets/trash-2-HfmI9UQ-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"191-gkpGonIL+sUl9DHnXWHHvBLeYv4\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 401,
    "path": "../public/_build/assets/trash-2-HfmI9UQ-.js"
  },
  "/_build/assets/trial-balance-ByKcTQvp.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"241e-2azEAMOyJ0oPte6znfwJZrt+tjE\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 9246,
    "path": "../public/_build/assets/trial-balance-ByKcTQvp.js"
  },
  "/_build/assets/trial-balance-ByKcTQvp.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"b3e-TXwt8DYoY2V1ArvsSvyvLunswms\"",
    "mtime": "2026-07-13T17:12:08.227Z",
    "size": 2878,
    "path": "../public/_build/assets/trial-balance-ByKcTQvp.js.br"
  },
  "/_build/assets/trial-balance-ByKcTQvp.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"c8c-iiM7DgkCp4pe7i44GGXtNcOUQVw\"",
    "mtime": "2026-07-13T17:12:08.216Z",
    "size": 3212,
    "path": "../public/_build/assets/trial-balance-ByKcTQvp.js.gz"
  },
  "/_build/assets/types-CGrVZs_Y.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"ada-M/oL0p6IXayWLE9ti5PiQGclgoE\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 2778,
    "path": "../public/_build/assets/types-CGrVZs_Y.js"
  },
  "/_build/assets/types-CGrVZs_Y.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"40b-XALhkKpolVOqnlm7GQtdlYMbAuw\"",
    "mtime": "2026-07-13T17:12:08.219Z",
    "size": 1035,
    "path": "../public/_build/assets/types-CGrVZs_Y.js.br"
  },
  "/_build/assets/types-CGrVZs_Y.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"49e-Gh64meMGlTfMXC7qvNmAJ/gO104\"",
    "mtime": "2026-07-13T17:12:08.216Z",
    "size": 1182,
    "path": "../public/_build/assets/types-CGrVZs_Y.js.gz"
  },
  "/_build/assets/types-DG_tf0Jf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"33e-UxHEZcv1FbVsD0o1fC3q6+GETG0\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 830,
    "path": "../public/_build/assets/types-DG_tf0Jf.js"
  },
  "/_build/assets/types-aFJCvwH0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7a-VXkuMHlpZ94Qhp/0v8zzsZsT7TA\"",
    "mtime": "2026-07-13T17:12:08.015Z",
    "size": 122,
    "path": "../public/_build/assets/types-aFJCvwH0.js"
  },
  "/_build/assets/types-pExQo7zb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"72-y1pJ884mGyzNwJULd0jwrepa81o\"",
    "mtime": "2026-07-13T17:12:08.015Z",
    "size": 114,
    "path": "../public/_build/assets/types-pExQo7zb.js"
  },
  "/_build/assets/w2-BZO_evnp.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"6b5-YjI70vUMDR3g1xEliDjeod5CMyU\"",
    "mtime": "2026-07-13T17:12:08.227Z",
    "size": 1717,
    "path": "../public/_build/assets/w2-BZO_evnp.js.br"
  },
  "/_build/assets/w2-BZO_evnp.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"7c6-en71DHLEet+zoRfOqU+1pB8Kgfk\"",
    "mtime": "2026-07-13T17:12:08.219Z",
    "size": 1990,
    "path": "../public/_build/assets/w2-BZO_evnp.js.gz"
  },
  "/_build/assets/w2-BZO_evnp.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"176c-8RiD1XDKv5DcvnCOqTPZeWQ0aag\"",
    "mtime": "2026-07-13T17:12:08.015Z",
    "size": 5996,
    "path": "../public/_build/assets/w2-BZO_evnp.js"
  },
  "/_build/assets/web-B50drEWG.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"2595-ft+MYMKlBVOLwYVeAQ4kXu58EY0\"",
    "mtime": "2026-07-13T17:12:08.248Z",
    "size": 9621,
    "path": "../public/_build/assets/web-B50drEWG.js.br"
  },
  "/_build/assets/web-B50drEWG.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"298d-bm1/TvrTZQVhUoJYM581ju0KRLo\"",
    "mtime": "2026-07-13T17:12:08.226Z",
    "size": 10637,
    "path": "../public/_build/assets/web-B50drEWG.js.gz"
  },
  "/_build/assets/year-close-KhDz2yL_.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"1bf8-NVSo8JEFJP7raRNKUSqt28TW5U8\"",
    "mtime": "2026-07-13T17:12:08.015Z",
    "size": 7160,
    "path": "../public/_build/assets/year-close-KhDz2yL_.js"
  },
  "/_build/assets/year-close-KhDz2yL_.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"afe-vT+CwDu4UMP1UfpA6xm8lvkYDhc\"",
    "mtime": "2026-07-13T17:12:08.227Z",
    "size": 2814,
    "path": "../public/_build/assets/year-close-KhDz2yL_.js.gz"
  },
  "/_build/assets/web-B50drEWG.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"6b98-JGIHkHtlQznieBhvB+vrWzSSv+Y\"",
    "mtime": "2026-07-13T17:12:08.014Z",
    "size": 27544,
    "path": "../public/_build/assets/web-B50drEWG.js"
  },
  "/_build/assets/yearStore-08JEXQTR.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a5-P+KJ65/GjSfKUWnw5kOjT+eJ8ww\"",
    "mtime": "2026-07-13T17:12:08.015Z",
    "size": 421,
    "path": "../public/_build/assets/yearStore-08JEXQTR.js"
  },
  "/_build/assets/year-close-KhDz2yL_.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"9da-JIm1b5BAVK/YjrDZOiQ9FL7lsnE\"",
    "mtime": "2026-07-13T17:12:08.236Z",
    "size": 2522,
    "path": "../public/_build/assets/year-close-KhDz2yL_.js.br"
  }
};

const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
function cwd() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1) ; else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
const dirname = function(p) {
  const segments = normalizeWindowsPath(p).replace(/\/$/, "").split("/").slice(0, -1);
  if (segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0])) {
    segments[0] += "/";
  }
  return segments.join("/") || (isAbsolute(p) ? "/" : ".");
};

function readAsset (id) {
  const serverDir = dirname(fileURLToPath(globalThis._importMeta_.url));
  return promises.readFile(resolve(serverDir, assets[id].path))
}

const publicAssetBases = {};

function isPublicAssetURL(id = '') {
  if (assets[id]) {
    return true
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) { return true }
  }
  return false
}

function getAsset (id) {
  return assets[id]
}

const METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
const EncodingMap = { gzip: ".gz", br: ".br" };
const _CAqWBl = eventHandler((event) => {
  if (event.method && !METHODS.has(event.method)) {
    return;
  }
  let id = decodePath(
    withLeadingSlash(withoutTrailingSlash(parseURL(event.path).pathname))
  );
  let asset;
  const encodingHeader = String(
    getRequestHeader(event, "accept-encoding") || ""
  );
  const encodings = [
    ...encodingHeader.split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(),
    ""
  ];
  for (const encoding of encodings) {
    for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
      const _asset = getAsset(_id);
      if (_asset) {
        asset = _asset;
        id = _id;
        break;
      }
    }
  }
  if (!asset) {
    if (isPublicAssetURL(id)) {
      removeResponseHeader(event, "Cache-Control");
      throw createError$1({ statusCode: 404 });
    }
    return;
  }
  if (asset.encoding !== void 0) {
    appendResponseHeader(event, "Vary", "Accept-Encoding");
  }
  const ifNotMatch = getRequestHeader(event, "if-none-match") === asset.etag;
  if (ifNotMatch) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  const ifModifiedSinceH = getRequestHeader(event, "if-modified-since");
  const mtimeDate = new Date(asset.mtime);
  if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  if (asset.type && !getResponseHeader(event, "Content-Type")) {
    setResponseHeader(event, "Content-Type", asset.type);
  }
  if (asset.etag && !getResponseHeader(event, "ETag")) {
    setResponseHeader(event, "ETag", asset.etag);
  }
  if (asset.mtime && !getResponseHeader(event, "Last-Modified")) {
    setResponseHeader(event, "Last-Modified", mtimeDate.toUTCString());
  }
  if (asset.encoding && !getResponseHeader(event, "Content-Encoding")) {
    setResponseHeader(event, "Content-Encoding", asset.encoding);
  }
  if (asset.size > 0 && !getResponseHeader(event, "Content-Length")) {
    setResponseHeader(event, "Content-Length", asset.size);
  }
  return readAsset(id);
});

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
function Wr(e, t) {
  const r = (e || "").split(";").filter((c) => typeof c == "string" && !!c.trim()), n = r.shift() || "", a = Xr(n), o = a.name;
  let i = a.value;
  try {
    i = (t == null ? void 0 : t.decode) === false ? i : ((t == null ? void 0 : t.decode) || decodeURIComponent)(i);
  } catch {
  }
  const u = { name: o, value: i };
  for (const c of r) {
    const l = c.split("="), p = (l.shift() || "").trimStart().toLowerCase(), d = l.join("=");
    switch (p) {
      case "expires": {
        u.expires = new Date(d);
        break;
      }
      case "max-age": {
        u.maxAge = Number.parseInt(d, 10);
        break;
      }
      case "secure": {
        u.secure = true;
        break;
      }
      case "httponly": {
        u.httpOnly = true;
        break;
      }
      case "samesite": {
        u.sameSite = d;
        break;
      }
      default:
        u[p] = d;
    }
  }
  return u;
}
function Xr(e) {
  let t = "", r = "";
  const n = e.split("=");
  return n.length > 1 ? (t = n.shift(), r = n.join("=")) : r = e, { name: t, value: r };
}
function Gr(e = {}) {
  let t, r = false;
  const n = (i) => {
    if (t && t !== i) throw new Error("Context conflict");
  };
  let a;
  if (e.asyncContext) {
    const i = e.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    i ? a = new i() : console.warn("[unctx] `AsyncLocalStorage` is not provided.");
  }
  const o = () => {
    if (a) {
      const i = a.getStore();
      if (i !== void 0) return i;
    }
    return t;
  };
  return { use: () => {
    const i = o();
    if (i === void 0) throw new Error("Context is not available");
    return i;
  }, tryUse: () => o(), set: (i, u) => {
    u || n(i), t = i, r = true;
  }, unset: () => {
    t = void 0, r = false;
  }, call: (i, u) => {
    n(i), t = i;
    try {
      return a ? a.run(i, u) : u();
    } finally {
      r || (t = void 0);
    }
  }, async callAsync(i, u) {
    t = i;
    const c = () => {
      t = i;
    }, l = () => t === i ? c : void 0;
    qe$1.add(l);
    try {
      const p = a ? a.run(i, u) : u();
      return r || (t = void 0), await p;
    } finally {
      qe$1.delete(l);
    }
  } };
}
function Jr(e = {}) {
  const t = {};
  return { get(r, n = {}) {
    return t[r] || (t[r] = Gr({ ...e, ...n })), t[r];
  } };
}
const oe = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof global < "u" ? global : {}, Ne$1 = "__unctx__", Yr = oe[Ne$1] || (oe[Ne$1] = Jr()), Kr = (e, t = {}) => Yr.get(e, t), Fe$1 = "__unctx_async_handlers__", qe$1 = oe[Fe$1] || (oe[Fe$1] = /* @__PURE__ */ new Set());
function Qr(e) {
  let t;
  const r = yt(e), n = { duplex: "half", method: e.method, headers: e.headers };
  return e.node.req.body instanceof ArrayBuffer ? new Request(r, { ...n, body: e.node.req.body }) : new Request(r, { ...n, get body() {
    return t || (t = cn(e), t);
  } });
}
function Zr(e) {
  var _a2;
  return (_a2 = e.web) != null ? _a2 : e.web = { request: Qr(e), url: yt(e) }, e.web.request;
}
function en() {
  return dn();
}
const mt = /* @__PURE__ */ Symbol("$HTTPEvent");
function tn(e) {
  return typeof e == "object" && (e instanceof H3Event || (e == null ? void 0 : e[mt]) instanceof H3Event || (e == null ? void 0 : e.__is_event__) === true);
}
function R(e) {
  return function(...t) {
    var _a2;
    let r = t[0];
    if (tn(r)) t[0] = r instanceof H3Event || r.__is_event__ ? r : r[mt];
    else {
      if (!((_a2 = globalThis.app.config.server.experimental) == null ? void 0 : _a2.asyncContext)) throw new Error("AsyncLocalStorage was not enabled. Use the `server.experimental.asyncContext: true` option in your app configuration to enable it. Or, pass the instance of HTTPEvent that you have as the first argument to the function.");
      if (r = en(), !r) throw new Error("No HTTPEvent found in AsyncLocalStorage. Make sure you are using the function within the server runtime.");
      t.unshift(r);
    }
    return e(...t);
  };
}
const yt = R(getRequestURL), rn = R(getRequestIP), ie$1 = R(setResponseStatus), Be$1 = R(getResponseStatus), nn = R(getResponseStatusText), se = R(getResponseHeaders), Ve$1 = R(getResponseHeader), sn = R(setResponseHeader), bt = R(appendResponseHeader), an = R(parseCookies), on = R(getCookie), un = R(setCookie), M$1 = R(setHeader), cn = R(getRequestWebStream), ln = R(removeResponseHeader), fn = R(Zr);
function pn() {
  var _a2;
  return Kr("nitro-app", { asyncContext: !!((_a2 = globalThis.app.config.server.experimental) == null ? void 0 : _a2.asyncContext), AsyncLocalStorage: AsyncLocalStorage });
}
function dn() {
  return pn().use().event;
}
const de$1 = "Invariant Violation", { setPrototypeOf: hn = function(e, t) {
  return e.__proto__ = t, e;
} } = Object;
let Pe$1 = class Pe extends Error {
  constructor(t = de$1) {
    super(typeof t == "number" ? `${de$1}: ${t} (see https://github.com/apollographql/invariant-packages)` : t);
    __publicField$1(this, "framesToPop", 1);
    __publicField$1(this, "name", de$1);
    hn(this, Pe.prototype);
  }
};
function gn(e, t) {
  if (!e) throw new Pe$1(t);
}
const he$1 = "solidFetchEvent";
function mn(e) {
  return { request: fn(e), response: vn(e), clientAddress: rn(e), locals: {}, nativeEvent: e };
}
function yn(e) {
  return { ...e };
}
function bn(e) {
  if (!e.context[he$1]) {
    const t = mn(e);
    e.context[he$1] = t;
  }
  return e.context[he$1];
}
function We$1(e, t) {
  for (const [r, n] of t.entries()) bt(e, r, n);
}
class wn {
  constructor(t) {
    __publicField$1(this, "event");
    this.event = t;
  }
  get(t) {
    const r = Ve$1(this.event, t);
    return Array.isArray(r) ? r.join(", ") : r || null;
  }
  has(t) {
    return this.get(t) !== null;
  }
  set(t, r) {
    return sn(this.event, t, r);
  }
  delete(t) {
    return ln(this.event, t);
  }
  append(t, r) {
    bt(this.event, t, r);
  }
  getSetCookie() {
    const t = Ve$1(this.event, "Set-Cookie");
    return Array.isArray(t) ? t : [t];
  }
  forEach(t) {
    return Object.entries(se(this.event)).forEach(([r, n]) => t(Array.isArray(n) ? n.join(", ") : n, r, this));
  }
  entries() {
    return Object.entries(se(this.event)).map(([t, r]) => [t, Array.isArray(r) ? r.join(", ") : r])[Symbol.iterator]();
  }
  keys() {
    return Object.keys(se(this.event))[Symbol.iterator]();
  }
  values() {
    return Object.values(se(this.event)).map((t) => Array.isArray(t) ? t.join(", ") : t)[Symbol.iterator]();
  }
  [Symbol.iterator]() {
    return this.entries()[Symbol.iterator]();
  }
}
function vn(e) {
  return { get status() {
    return Be$1(e);
  }, set status(t) {
    ie$1(e, t);
  }, get statusText() {
    return nn(e);
  }, set statusText(t) {
    ie$1(e, Be$1(e), t);
  }, headers: new wn(e) };
}
const F = { NORMAL: 0, WILDCARD: 1, PLACEHOLDER: 2 };
function Rn(e = {}) {
  const t = { options: e, rootNode: wt(), staticRoutesMap: {} }, r = (n) => e.strictTrailingSlash ? n : n.replace(/\/$/, "") || "/";
  if (e.routes) for (const n in e.routes) Xe$1(t, r(n), e.routes[n]);
  return { ctx: t, lookup: (n) => Sn(t, r(n)), insert: (n, a) => Xe$1(t, r(n), a), remove: (n) => An(t, r(n)) };
}
function Sn(e, t) {
  const r = e.staticRoutesMap[t];
  if (r) return r.data;
  const n = t.split("/"), a = {};
  let o = false, i = null, u = e.rootNode, c = null;
  for (let l = 0; l < n.length; l++) {
    const p = n[l];
    u.wildcardChildNode !== null && (i = u.wildcardChildNode, c = n.slice(l).join("/"));
    const d = u.children.get(p);
    if (d === void 0) {
      if (u && u.placeholderChildren.length > 1) {
        const w = n.length - l;
        u = u.placeholderChildren.find((f) => f.maxDepth === w) || null;
      } else u = u.placeholderChildren[0] || null;
      if (!u) break;
      u.paramName && (a[u.paramName] = p), o = true;
    } else u = d;
  }
  return (u === null || u.data === null) && i !== null && (u = i, a[u.paramName || "_"] = c, o = true), u ? o ? { ...u.data, params: o ? a : void 0 } : u.data : null;
}
function Xe$1(e, t, r) {
  let n = true;
  const a = t.split("/");
  let o = e.rootNode, i = 0;
  const u = [o];
  for (const c of a) {
    let l;
    if (l = o.children.get(c)) o = l;
    else {
      const p = En(c);
      l = wt({ type: p, parent: o }), o.children.set(c, l), p === F.PLACEHOLDER ? (l.paramName = c === "*" ? `_${i++}` : c.slice(1), o.placeholderChildren.push(l), n = false) : p === F.WILDCARD && (o.wildcardChildNode = l, l.paramName = c.slice(3) || "_", n = false), u.push(l), o = l;
    }
  }
  for (const [c, l] of u.entries()) l.maxDepth = Math.max(u.length - c, l.maxDepth || 0);
  return o.data = r, n === true && (e.staticRoutesMap[t] = o), o;
}
function An(e, t) {
  let r = false;
  const n = t.split("/");
  let a = e.rootNode;
  for (const o of n) if (a = a.children.get(o), !a) return r;
  if (a.data) {
    const o = n.at(-1) || "";
    a.data = null, Object.keys(a.children).length === 0 && a.parent && (a.parent.children.delete(o), a.parent.wildcardChildNode = null, a.parent.placeholderChildren = []), r = true;
  }
  return r;
}
function wt(e = {}) {
  return { type: e.type || F.NORMAL, maxDepth: 0, parent: e.parent || null, children: /* @__PURE__ */ new Map(), data: e.data || null, paramName: e.paramName || null, wildcardChildNode: null, placeholderChildren: [] };
}
function En(e) {
  return e.startsWith("**") ? F.WILDCARD : e[0] === ":" || e === "*" ? F.PLACEHOLDER : F.NORMAL;
}
const vt = [{ page: true, path: "/accounts/:id", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/accounts/[id].tsx" }, { page: true, path: "/accounts/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/accounts/index.tsx" }, { page: true, path: "/admin/gemini", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/admin/gemini.tsx" }, { page: true, path: "/banking/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/banking/index.tsx" }, { page: true, path: "/callback", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/callback.tsx" }, { page: true, path: "/employees/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/employees/index.tsx" }, { page: true, path: "/employees", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/employees.tsx" }, { page: true, path: "/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/index.tsx" }, { page: true, path: "/inventory/count", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/inventory/count.tsx" }, { page: true, path: "/inventory/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/inventory/index.tsx" }, { page: true, path: "/inventory/movements", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/inventory/movements.tsx" }, { page: true, path: "/inventory", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/inventory.tsx" }, { page: true, path: "/journal/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/journal/index.tsx" }, { page: true, path: "/journal/print", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/journal/print.tsx" }, { page: true, path: "/journal/templates", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/journal/templates.tsx" }, { page: true, path: "/login", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/login.tsx" }, { page: true, path: "/providers/aging", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/providers/aging.tsx" }, { page: true, path: "/providers/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/providers/index.tsx" }, { page: true, path: "/providers", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/providers.tsx" }, { page: true, path: "/reports/audit", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/reports/audit.tsx" }, { page: true, path: "/reports/balance-sheet", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/reports/balance-sheet.tsx" }, { page: true, path: "/reports/cash-flow", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/reports/cash-flow.tsx" }, { page: true, path: "/reports/income-statement", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/reports/income-statement.tsx" }, { page: true, path: "/reports/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/reports/index.tsx" }, { page: true, path: "/reports/monthly-pnl", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/reports/monthly-pnl.tsx" }, { page: true, path: "/reports/trial-balance", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/reports/trial-balance.tsx" }, { page: true, path: "/reports/year-close", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/reports/year-close.tsx" }, { page: true, path: "/reports", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/reports.tsx" }, { page: true, path: "/timesheets/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/timesheets/index.tsx" }, { page: true, path: "/timesheets/stub/:id", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/timesheets/stub/[id].tsx" }, { page: true, path: "/timesheets/w2", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/timesheets/w2.tsx" }, { page: true, path: "/timesheets", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/timesheets.tsx" }, { page: true, path: "/transactions/compras", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/transactions/compras.tsx" }, { page: true, path: "/transactions/facturacion", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/transactions/facturacion.tsx" }, { page: true, path: "/transactions/historial", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/transactions/historial.tsx" }, { page: true, path: "/transactions/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/transactions/index.tsx" }, { page: true, path: "/transactions/invoice/:number", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/transactions/invoice/[number].tsx" }, { page: true, path: "/transactions/mermas", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/transactions/mermas.tsx" }, { page: true, path: "/transactions", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/transactions.tsx" }], xn = Pn(vt.filter((e) => e.page));
function Pn(e) {
  function t(r, n, a, o) {
    const i = Object.values(r).find((u) => a.startsWith(u.id + "/"));
    return i ? (t(i.children || (i.children = []), n, a.slice(i.id.length)), r) : (r.push({ ...n, id: a, path: a.replace(/\([^)/]+\)/g, "").replace(/\/+/g, "/") }), r);
  }
  return e.sort((r, n) => r.path.length - n.path.length).reduce((r, n) => t(r, n, n.path, n.path), []);
}
function In(e) {
  return e.$HEAD || e.$GET || e.$POST || e.$PUT || e.$PATCH || e.$DELETE;
}
Rn({ routes: vt.reduce((e, t) => {
  if (!In(t)) return e;
  let r = t.path.replace(/\([^)/]+\)/g, "").replace(/\/+/g, "/").replace(/\*([^/]*)/g, (n, a) => `**:${a}`).split("/").map((n) => n.startsWith(":") || n.startsWith("*") ? n : encodeURIComponent(n)).join("/");
  if (/:[^/]*\?/g.test(r)) throw new Error(`Optional parameters are not supported in API routes: ${r}`);
  if (e[r]) throw new Error(`Duplicate API routes for "${r}" found at "${e[r].route.path}" and "${t.path}"`);
  return e[r] = { route: t }, e;
}, {}) });
var kn = " ";
const jn = { style: (e) => ssrElement("style", e.attrs, () => e.children, true), link: (e) => ssrElement("link", e.attrs, void 0, true), script: (e) => e.attrs.src ? ssrElement("script", mergeProps(() => e.attrs, { get id() {
  return e.key;
} }), () => ssr(kn), true) : null, noscript: (e) => ssrElement("noscript", e.attrs, () => escape(e.children), true) };
function Un(e, t) {
  let { tag: r, attrs: { key: n, ...a } = { key: void 0 }, children: o } = e;
  return jn[r]({ attrs: { ...a, nonce: t }, key: n, children: o });
}
function $n(e, t, r, n = "default") {
  return lazy(async () => {
    var _a2;
    {
      const o = (await e.import())[n], u = (await ((_a2 = t.inputs) == null ? void 0 : _a2[e.src].assets())).filter((l) => l.tag === "style" || l.attrs.rel === "stylesheet");
      return { default: (l) => [...u.map((p) => Un(p)), createComponent(o, l)] };
    }
  });
}
function Rt() {
  function e(r) {
    return { ...r, ...r.$$route ? r.$$route.require().route : void 0, info: { ...r.$$route ? r.$$route.require().route.info : {}, filesystem: true }, component: r.$component && $n(r.$component, globalThis.MANIFEST.client, globalThis.MANIFEST.ssr), children: r.children ? r.children.map(e) : void 0 };
  }
  return xn.map(e);
}
let Ge$1;
const au = isServer ? () => getRequestEvent().routes : () => Ge$1 || (Ge$1 = Rt());
function zn(e) {
  const t = on(e.nativeEvent, "flash");
  if (t) try {
    let r = JSON.parse(t);
    if (!r || !r.result) return;
    const n = [...r.input.slice(0, -1), new Map(r.input[r.input.length - 1])], a = r.error ? new Error(r.result) : r.result;
    return { input: n, url: r.url, pending: false, result: r.thrown ? void 0 : a, error: r.thrown ? a : void 0 };
  } catch (r) {
    console.error(r);
  } finally {
    un(e.nativeEvent, "flash", "", { maxAge: 0 });
  }
}
async function Cn(e) {
  const t = globalThis.MANIFEST.client;
  return globalThis.MANIFEST.ssr, e.response.headers.set("Content-Type", "text/html"), Object.assign(e, { manifest: await t.json(), assets: [...await t.inputs[t.handler].assets()], router: { submission: zn(e) }, routes: Rt(), complete: false, $islands: /* @__PURE__ */ new Set() });
}
const Dn = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
function Hn(e) {
  return e.status && Dn.has(e.status) ? e.status : 302;
}
const On = {};
var St = ((e) => (e[e.AggregateError = 1] = "AggregateError", e[e.ArrowFunction = 2] = "ArrowFunction", e[e.ErrorPrototypeStack = 4] = "ErrorPrototypeStack", e[e.ObjectAssign = 8] = "ObjectAssign", e[e.BigIntTypedArray = 16] = "BigIntTypedArray", e[e.RegExp = 32] = "RegExp", e))(St || {}), P = Symbol.asyncIterator, At = Symbol.hasInstance, q$1 = Symbol.isConcatSpreadable, I$1 = Symbol.iterator, Et = Symbol.match, xt = Symbol.matchAll, Pt = Symbol.replace, It = Symbol.search, _t = Symbol.species, kt = Symbol.split, jt = Symbol.toPrimitive, B = Symbol.toStringTag, Ut = Symbol.unscopables, Ln = { 0: "Symbol.asyncIterator", 1: "Symbol.hasInstance", 2: "Symbol.isConcatSpreadable", 3: "Symbol.iterator", 4: "Symbol.match", 5: "Symbol.matchAll", 6: "Symbol.replace", 7: "Symbol.search", 8: "Symbol.species", 9: "Symbol.split", 10: "Symbol.toPrimitive", 11: "Symbol.toStringTag", 12: "Symbol.unscopables" }, $t = { [P]: 0, [At]: 1, [q$1]: 2, [I$1]: 3, [Et]: 4, [xt]: 5, [Pt]: 6, [It]: 7, [_t]: 8, [kt]: 9, [jt]: 10, [B]: 11, [Ut]: 12 }, Mn = { 0: P, 1: At, 2: q$1, 3: I$1, 4: Et, 5: xt, 6: Pt, 7: It, 8: _t, 9: kt, 10: jt, 11: B, 12: Ut }, Tn = { 2: "!0", 3: "!1", 1: "void 0", 0: "null", 4: "-0", 5: "1/0", 6: "-1/0", 7: "0/0" }, s = void 0, Nn = { 2: true, 3: false, 1: s, 0: null, 4: -0, 5: Number.POSITIVE_INFINITY, 6: Number.NEGATIVE_INFINITY, 7: Number.NaN }, zt = { 0: "Error", 1: "EvalError", 2: "RangeError", 3: "ReferenceError", 4: "SyntaxError", 5: "TypeError", 6: "URIError" }, Fn = { 0: Error, 1: EvalError, 2: RangeError, 3: ReferenceError, 4: SyntaxError, 5: TypeError, 6: URIError };
function g$1(e, t, r, n, a, o, i, u, c, l, p, d) {
  return { t: e, i: t, s: r, c: n, m: a, p: o, e: i, a: u, f: c, b: l, o: p, l: d };
}
function $(e) {
  return g$1(2, s, e, s, s, s, s, s, s, s, s, s);
}
var Ct = $(2), Dt = $(3), qn = $(1), Bn = $(0), Vn = $(4), Wn = $(5), Xn = $(6), Gn = $(7);
function Jn(e) {
  switch (e) {
    case '"':
      return '\\"';
    case "\\":
      return "\\\\";
    case `
`:
      return "\\n";
    case "\r":
      return "\\r";
    case "\b":
      return "\\b";
    case "	":
      return "\\t";
    case "\f":
      return "\\f";
    case "<":
      return "\\x3C";
    case "\u2028":
      return "\\u2028";
    case "\u2029":
      return "\\u2029";
    default:
      return s;
  }
}
function E$1(e) {
  let t = "", r = 0, n;
  for (let a = 0, o = e.length; a < o; a++) n = Jn(e[a]), n && (t += e.slice(r, a) + n, r = a + 1);
  return r === 0 ? t = e : t += e.slice(r), t;
}
function Yn(e) {
  switch (e) {
    case "\\\\":
      return "\\";
    case '\\"':
      return '"';
    case "\\n":
      return `
`;
    case "\\r":
      return "\r";
    case "\\b":
      return "\b";
    case "\\t":
      return "	";
    case "\\f":
      return "\f";
    case "\\x3C":
      return "<";
    case "\\u2028":
      return "\u2028";
    case "\\u2029":
      return "\u2029";
    default:
      return e;
  }
}
function z(e) {
  return e.replace(/(\\\\|\\"|\\n|\\r|\\b|\\t|\\f|\\u2028|\\u2029|\\x3C)/g, Yn);
}
var G = "__SEROVAL_REFS__", ue$1 = "$R", ae = `self.${ue$1}`;
function Kn(e) {
  return e == null ? `${ae}=${ae}||[]` : `(${ae}=${ae}||{})["${E$1(e)}"]=[]`;
}
var Ht = /* @__PURE__ */ new Map(), N$1 = /* @__PURE__ */ new Map();
function Ot(e) {
  return Ht.has(e);
}
function Qn(e) {
  return N$1.has(e);
}
function Zn(e) {
  if (Ot(e)) return Ht.get(e);
  throw new _s(e);
}
function es(e) {
  if (Qn(e)) return N$1.get(e);
  throw new ks(e);
}
typeof globalThis < "u" ? Object.defineProperty(globalThis, G, { value: N$1, configurable: true, writable: false, enumerable: false }) : typeof self < "u" ? Object.defineProperty(self, G, { value: N$1, configurable: true, writable: false, enumerable: false }) : typeof global < "u" && Object.defineProperty(global, G, { value: N$1, configurable: true, writable: false, enumerable: false });
function Ie$1(e) {
  return e instanceof EvalError ? 1 : e instanceof RangeError ? 2 : e instanceof ReferenceError ? 3 : e instanceof SyntaxError ? 4 : e instanceof TypeError ? 5 : e instanceof URIError ? 6 : 0;
}
function ts(e) {
  let t = zt[Ie$1(e)];
  return e.name !== t ? { name: e.name } : e.constructor.name !== t ? { name: e.constructor.name } : {};
}
function Lt(e, t) {
  let r = ts(e), n = Object.getOwnPropertyNames(e);
  for (let a = 0, o = n.length, i; a < o; a++) i = n[a], i !== "name" && i !== "message" && (i === "stack" ? t & 4 && (r = r || {}, r[i] = e[i]) : (r = r || {}, r[i] = e[i]));
  return r;
}
function Mt(e) {
  return Object.isFrozen(e) ? 3 : Object.isSealed(e) ? 2 : Object.isExtensible(e) ? 0 : 1;
}
function rs(e) {
  switch (e) {
    case Number.POSITIVE_INFINITY:
      return Wn;
    case Number.NEGATIVE_INFINITY:
      return Xn;
  }
  return e !== e ? Gn : Object.is(e, -0) ? Vn : g$1(0, s, e, s, s, s, s, s, s, s, s, s);
}
function Tt(e) {
  return g$1(1, s, E$1(e), s, s, s, s, s, s, s, s, s);
}
function ns(e) {
  return g$1(3, s, "" + e, s, s, s, s, s, s, s, s, s);
}
function ss(e) {
  return g$1(4, e, s, s, s, s, s, s, s, s, s, s);
}
function as(e, t) {
  let r = t.valueOf();
  return g$1(5, e, r !== r ? "" : t.toISOString(), s, s, s, s, s, s, s, s, s);
}
function os(e, t) {
  return g$1(6, e, s, E$1(t.source), t.flags, s, s, s, s, s, s, s);
}
function is(e, t) {
  return g$1(17, e, $t[t], s, s, s, s, s, s, s, s, s);
}
function us(e, t) {
  return g$1(18, e, E$1(Zn(t)), s, s, s, s, s, s, s, s, s);
}
function Nt(e, t, r) {
  return g$1(25, e, r, E$1(t), s, s, s, s, s, s, s, s);
}
function cs(e, t, r) {
  return g$1(9, e, s, s, s, s, s, r, s, s, Mt(t), s);
}
function ls(e, t) {
  return g$1(21, e, s, s, s, s, s, s, t, s, s, s);
}
function fs(e, t, r) {
  return g$1(15, e, s, t.constructor.name, s, s, s, s, r, t.byteOffset, s, t.length);
}
function ps(e, t, r) {
  return g$1(16, e, s, t.constructor.name, s, s, s, s, r, t.byteOffset, s, t.byteLength);
}
function ds(e, t, r) {
  return g$1(20, e, s, s, s, s, s, s, r, t.byteOffset, s, t.byteLength);
}
function hs(e, t, r) {
  return g$1(13, e, Ie$1(t), s, E$1(t.message), r, s, s, s, s, s, s);
}
function gs(e, t, r) {
  return g$1(14, e, Ie$1(t), s, E$1(t.message), r, s, s, s, s, s, s);
}
function ms(e, t) {
  return g$1(7, e, s, s, s, s, s, t, s, s, s, s);
}
function ys(e, t) {
  return g$1(28, s, s, s, s, s, s, [e, t], s, s, s, s);
}
function bs(e, t) {
  return g$1(30, s, s, s, s, s, s, [e, t], s, s, s, s);
}
function ws(e, t, r) {
  return g$1(31, e, s, s, s, s, s, r, t, s, s, s);
}
function vs(e, t) {
  return g$1(32, e, s, s, s, s, s, s, t, s, s, s);
}
function Rs(e, t) {
  return g$1(33, e, s, s, s, s, s, s, t, s, s, s);
}
function Ss(e, t) {
  return g$1(34, e, s, s, s, s, s, s, t, s, s, s);
}
function As(e, t, r, n) {
  return g$1(35, e, r, s, s, s, s, t, s, s, s, n);
}
var Es = { parsing: 1, serialization: 2, deserialization: 3 };
function xs(e) {
  return `Seroval Error (step: ${Es[e]})`;
}
var Ps = (e, t) => xs(e), Ft = class extends Error {
  constructor(t, r) {
    super(Ps(t)), this.cause = r;
  }
}, Je$1 = class Je extends Ft {
  constructor(e) {
    super("parsing", e);
  }
}, Is = class extends Ft {
  constructor(e) {
    super("deserialization", e);
  }
};
function _$1(e) {
  return `Seroval Error (specific: ${e})`;
}
var ce = class extends Error {
  constructor(t) {
    super(_$1(1)), this.value = t;
  }
}, H$1 = class H extends Error {
  constructor(t) {
    super(_$1(2));
  }
}, qt = class extends Error {
  constructor(e) {
    super(_$1(3));
  }
}, Z = class extends Error {
  constructor(t) {
    super(_$1(4));
  }
}, _s = class extends Error {
  constructor(e) {
    super(_$1(5)), this.value = e;
  }
}, ks = class extends Error {
  constructor(e) {
    super(_$1(6));
  }
}, js = class extends Error {
  constructor(e) {
    super(_$1(7));
  }
}, k = class extends Error {
  constructor(t) {
    super(_$1(8));
  }
}, Bt = class extends Error {
  constructor(e) {
    super(_$1(9));
  }
}, Us = class {
  constructor(e, t) {
    this.value = e, this.replacement = t;
  }
}, le$1 = () => {
  let e = { p: 0, s: 0, f: 0 };
  return e.p = new Promise((t, r) => {
    e.s = t, e.f = r;
  }), e;
}, $s = (e, t) => {
  e.s(t), e.p.s = 1, e.p.v = t;
}, zs = (e, t) => {
  e.f(t), e.p.s = 2, e.p.v = t;
}, Cs = le$1.toString(), Ds = $s.toString(), Hs = zs.toString(), Vt = () => {
  let e = [], t = [], r = true, n = false, a = 0, o = (c, l, p) => {
    for (p = 0; p < a; p++) t[p] && t[p][l](c);
  }, i = (c, l, p, d) => {
    for (l = 0, p = e.length; l < p; l++) d = e[l], !r && l === p - 1 ? c[n ? "return" : "throw"](d) : c.next(d);
  }, u = (c, l) => (r && (l = a++, t[l] = c), i(c), () => {
    r && (t[l] = t[a], t[a--] = void 0);
  });
  return { __SEROVAL_STREAM__: true, on: (c) => u(c), next: (c) => {
    r && (e.push(c), o(c, "next"));
  }, throw: (c) => {
    r && (e.push(c), o(c, "throw"), r = false, n = false, t.length = 0);
  }, return: (c) => {
    r && (e.push(c), o(c, "return"), r = false, n = true, t.length = 0);
  } };
}, Os = Vt.toString(), Wt = (e) => (t) => () => {
  let r = 0, n = { [e]: () => n, next: () => {
    if (r > t.d) return { done: true, value: void 0 };
    let a = r++, o = t.v[a];
    if (a === t.t) throw o;
    return { done: a === t.d, value: o };
  } };
  return n;
}, Ls = Wt.toString(), Xt = (e, t) => (r) => () => {
  let n = 0, a = -1, o = false, i = [], u = [], c = (p = 0, d = u.length) => {
    for (; p < d; p++) u[p].s({ done: true, value: void 0 });
  };
  r.on({ next: (p) => {
    let d = u.shift();
    d && d.s({ done: false, value: p }), i.push(p);
  }, throw: (p) => {
    let d = u.shift();
    d && d.f(p), c(), a = i.length, o = true, i.push(p);
  }, return: (p) => {
    let d = u.shift();
    d && d.s({ done: true, value: p }), c(), a = i.length, i.push(p);
  } });
  let l = { [e]: () => l, next: () => {
    if (a === -1) {
      let w = n++;
      if (w >= i.length) {
        let f = t();
        return u.push(f), f.p;
      }
      return { done: false, value: i[w] };
    }
    if (n > a) return { done: true, value: void 0 };
    let p = n++, d = i[p];
    if (p !== a) return { done: false, value: d };
    if (o) throw d;
    return { done: true, value: d };
  } };
  return l;
}, Ms = Xt.toString(), Gt = (e) => {
  let t = atob(e), r = t.length, n = new Uint8Array(r);
  for (let a = 0; a < r; a++) n[a] = t.charCodeAt(a);
  return n.buffer;
}, Ts = Gt.toString();
function Ns(e) {
  return "__SEROVAL_SEQUENCE__" in e;
}
function Jt(e, t, r) {
  return { __SEROVAL_SEQUENCE__: true, v: e, t, d: r };
}
function Fs(e) {
  let t = [], r = -1, n = -1, a = e[I$1]();
  for (; ; ) try {
    let o = a.next();
    if (t.push(o.value), o.done) {
      n = t.length - 1;
      break;
    }
  } catch (o) {
    r = t.length, t.push(o);
  }
  return Jt(t, r, n);
}
var qs = Wt(I$1);
function Bs(e) {
  return qs(e);
}
var Vs = {}, Ws = {}, Xs = { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {} }, Gs = { 0: "[]", 1: Cs, 2: Ds, 3: Hs, 4: Os, 5: Ts };
function Js(e) {
  return "__SEROVAL_STREAM__" in e;
}
function ee() {
  return Vt();
}
function Ys(e) {
  let t = ee(), r = e[P]();
  async function n() {
    try {
      let a = await r.next();
      a.done ? t.return(a.value) : (t.next(a.value), await n());
    } catch (a) {
      t.throw(a);
    }
  }
  return n().catch(() => {
  }), t;
}
var Ks = Xt(P, le$1);
function Qs(e) {
  return Ks(e);
}
function Zs(e, t) {
  return { plugins: t.plugins, mode: e, marked: /* @__PURE__ */ new Set(), features: 63 ^ (t.disabledFeatures || 0), refs: t.refs || /* @__PURE__ */ new Map(), depthLimit: t.depthLimit || 1e3 };
}
function ea(e, t) {
  e.marked.add(t);
}
function Yt(e, t) {
  let r = e.refs.size;
  return e.refs.set(t, r), r;
}
function fe$1(e, t) {
  let r = e.refs.get(t);
  return r != null ? (ea(e, r), { type: 1, value: ss(r) }) : { type: 0, value: Yt(e, t) };
}
function _e$1(e, t) {
  let r = fe$1(e, t);
  return r.type === 1 ? r : Ot(t) ? { type: 2, value: us(r.value, t) } : r;
}
function C(e, t) {
  let r = _e$1(e, t);
  if (r.type !== 0) return r.value;
  if (t in $t) return is(r.value, t);
  throw new ce(t);
}
function O(e, t) {
  let r = fe$1(e, Xs[t]);
  return r.type === 1 ? r.value : g$1(26, r.value, t, s, s, s, s, s, s, s, s, s);
}
function ta(e) {
  let t = fe$1(e, Vs);
  return t.type === 1 ? t.value : g$1(27, t.value, s, s, s, s, s, s, C(e, I$1), s, s, s);
}
function ra(e) {
  let t = fe$1(e, Ws);
  return t.type === 1 ? t.value : g$1(29, t.value, s, s, s, s, s, [O(e, 1), C(e, P)], s, s, s, s);
}
function na(e, t, r, n) {
  return g$1(r ? 11 : 10, e, s, s, s, n, s, s, s, s, Mt(t), s);
}
function sa(e, t, r, n) {
  return g$1(8, t, s, s, s, s, { k: r, v: n }, s, O(e, 0), s, s, s);
}
function aa(e, t, r) {
  return g$1(22, t, r, s, s, s, s, s, O(e, 1), s, s, s);
}
function oa(e, t, r) {
  let n = new Uint8Array(r), a = "";
  for (let o = 0, i = n.length; o < i; o++) a += String.fromCharCode(n[o]);
  return g$1(19, t, E$1(btoa(a)), s, s, s, s, s, O(e, 5), s, s, s);
}
var ia = ((e) => (e[e.Vanilla = 1] = "Vanilla", e[e.Cross = 2] = "Cross", e))(ia || {});
function Kt(e, t) {
  for (let r = 0, n = t.length; r < n; r++) {
    let a = t[r];
    e.has(a) || (e.add(a), a.extends && Kt(e, a.extends));
  }
}
function ke$1(e) {
  if (e) {
    let t = /* @__PURE__ */ new Set();
    return Kt(t, e), [...t];
  }
}
function ua(e) {
  switch (e) {
    case "Int8Array":
      return Int8Array;
    case "Int16Array":
      return Int16Array;
    case "Int32Array":
      return Int32Array;
    case "Uint8Array":
      return Uint8Array;
    case "Uint16Array":
      return Uint16Array;
    case "Uint32Array":
      return Uint32Array;
    case "Uint8ClampedArray":
      return Uint8ClampedArray;
    case "Float32Array":
      return Float32Array;
    case "Float64Array":
      return Float64Array;
    case "BigInt64Array":
      return BigInt64Array;
    case "BigUint64Array":
      return BigUint64Array;
    default:
      throw new js(e);
  }
}
var ca = 1e6, la = 1e4, fa = 2e4;
function Qt(e, t) {
  switch (t) {
    case 3:
      return Object.freeze(e);
    case 1:
      return Object.preventExtensions(e);
    case 2:
      return Object.seal(e);
    default:
      return e;
  }
}
var pa = 1e3;
function da(e, t) {
  var r;
  let n = t.refs || /* @__PURE__ */ new Map();
  return "types" in n || Object.assign(n, { types: /* @__PURE__ */ new Map() }), { mode: e, plugins: t.plugins, refs: n, features: (r = t.features) != null ? r : 63 ^ (t.disabledFeatures || 0), depthLimit: t.depthLimit || pa };
}
function ha(e) {
  return { mode: 1, base: da(1, e), child: s, state: { marked: new Set(e.markedRefs) } };
}
var ga = class {
  constructor(e, t) {
    this._p = e, this.depth = t;
  }
  deserialize(e) {
    return y$1(this._p, this.depth, e);
  }
};
function Zt(e, t) {
  if (t < 0 || !Number.isFinite(t) || !Number.isInteger(t)) throw new k({ t: 4, i: t });
  if (e.refs.has(t)) throw new Error("Conflicted ref id: " + t);
}
function ma(e, t, r) {
  return Zt(e.base, t), e.state.marked.has(t) && e.base.refs.set(t, r), r;
}
function ya(e, t, r) {
  return Zt(e.base, t), e.base.refs.set(t, r), r;
}
function b(e, t, r) {
  return e.mode === 1 ? ma(e, t, r) : ya(e, t, r);
}
function Se$1(e, t, r) {
  if (Object.hasOwn(t, r)) return t[r];
  throw new k(e);
}
function ba(e, t) {
  return b(e, t.i, es(z(t.s)));
}
function wa(e, t, r) {
  let n = r.a, a = n.length, o = b(e, r.i, new Array(a));
  for (let i = 0, u; i < a; i++) u = n[i], u && (o[i] = y$1(e, t, u));
  return Qt(o, r.o), o;
}
function va(e) {
  switch (e) {
    case "constructor":
    case "__proto__":
    case "prototype":
    case "__defineGetter__":
    case "__defineSetter__":
    case "__lookupGetter__":
    case "__lookupSetter__":
      return false;
    default:
      return true;
  }
}
function Ra(e) {
  switch (e) {
    case P:
    case q$1:
    case B:
    case I$1:
      return true;
    default:
      return false;
  }
}
function Ye$1(e, t, r) {
  va(t) ? e[t] = r : Object.defineProperty(e, t, { value: r, configurable: true, enumerable: true, writable: true });
}
function Sa(e, t, r, n, a) {
  if (typeof n == "string") Ye$1(r, z(n), y$1(e, t, a));
  else {
    let o = y$1(e, t, n);
    switch (typeof o) {
      case "string":
        Ye$1(r, o, y$1(e, t, a));
        break;
      case "symbol":
        Ra(o) && (r[o] = y$1(e, t, a));
        break;
      default:
        throw new k(n);
    }
  }
}
function er(e, t, r) {
  e.base.refs.types.set(t, r);
}
function te(e, t, r, n) {
  if (e.base.refs.types.get(r) !== n) throw new k(t);
}
function tr(e, t, r, n) {
  let a = r.k;
  if (a.length > 0) for (let o = 0, i = r.v, u = a.length; o < u; o++) Sa(e, t, n, a[o], i[o]);
  return n;
}
function Aa(e, t, r) {
  let n = b(e, r.i, r.t === 10 ? {} : /* @__PURE__ */ Object.create(null));
  return tr(e, t, r.p, n), Qt(n, r.o), n;
}
function Ea(e, t) {
  return b(e, t.i, new Date(t.s));
}
function xa(e, t) {
  if (e.base.features & 32) {
    let r = z(t.c);
    if (r.length > fa) throw new k(t);
    return b(e, t.i, new RegExp(r, t.m));
  }
  throw new H$1(t);
}
function Pa(e, t, r) {
  let n = b(e, r.i, /* @__PURE__ */ new Set());
  for (let a = 0, o = r.a, i = o.length; a < i; a++) n.add(y$1(e, t, o[a]));
  return n;
}
function Ia(e, t, r) {
  let n = b(e, r.i, /* @__PURE__ */ new Map());
  for (let a = 0, o = r.e.k, i = r.e.v, u = o.length; a < u; a++) n.set(y$1(e, t, o[a]), y$1(e, t, i[a]));
  return n;
}
function _a(e, t) {
  if (t.s.length > ca) throw new k(t);
  return b(e, t.i, Gt(z(t.s)));
}
function ka(e, t, r) {
  var n;
  let a = ua(r.c), o = y$1(e, t, r.f), i = (n = r.b) != null ? n : 0;
  if (i < 0 || i > o.byteLength) throw new k(r);
  return b(e, r.i, new a(o, i, r.l));
}
function ja(e, t, r) {
  var n;
  let a = y$1(e, t, r.f), o = (n = r.b) != null ? n : 0;
  if (o < 0 || o > a.byteLength) throw new k(r);
  return b(e, r.i, new DataView(a, o, r.l));
}
function rr(e, t, r, n) {
  if (r.p) {
    let a = tr(e, t, r.p, {});
    Object.defineProperties(n, Object.getOwnPropertyDescriptors(a));
  }
  return n;
}
function Ua(e, t, r) {
  let n = b(e, r.i, new AggregateError([], z(r.m)));
  return rr(e, t, r, n);
}
function $a(e, t, r) {
  let n = Se$1(r, Fn, r.s), a = b(e, r.i, new n(z(r.m)));
  return rr(e, t, r, a);
}
function za(e, t, r) {
  let n = le$1(), a = b(e, r.i, n.p), o = y$1(e, t, r.f);
  return r.s ? n.s(o) : n.f(o), a;
}
function Ca(e, t, r) {
  return b(e, r.i, Object(y$1(e, t, r.f)));
}
function Da(e, t, r) {
  let n = e.base.plugins;
  if (n) {
    let a = z(r.c);
    for (let o = 0, i = n.length; o < i; o++) {
      let u = n[o];
      if (u.tag === a) return b(e, r.i, u.deserialize(r.s, new ga(e, t), { id: r.i }));
    }
  }
  throw new qt(r.c);
}
function Ha(e, t) {
  let r = b(e, t.i, b(e, t.s, le$1()).p);
  return er(e, t.s, 22), r;
}
function Oa(e, t, r) {
  let n = e.base.refs.get(r.i);
  if (n) return te(e, r, r.i, 22), n.s(y$1(e, t, r.a[1])), s;
  throw new Z("Promise");
}
function La(e, t, r) {
  let n = e.base.refs.get(r.i);
  if (n) return te(e, r, r.i, 22), n.f(y$1(e, t, r.a[1])), s;
  throw new Z("Promise");
}
function Ma(e, t, r) {
  y$1(e, t, r.a[0]);
  let n = y$1(e, t, r.a[1]);
  return Bs(n);
}
function Ta(e, t, r) {
  y$1(e, t, r.a[0]);
  let n = y$1(e, t, r.a[1]);
  return Qs(n);
}
function Na(e, t, r) {
  let n = b(e, r.i, ee());
  er(e, r.i, 31);
  let a = r.a, o = a.length;
  if (o) for (let i = 0; i < o; i++) y$1(e, t, a[i]);
  return n;
}
function Fa(e, t, r) {
  let n = e.base.refs.get(r.i);
  if (n) return te(e, r, r.i, 31), n.next(y$1(e, t, r.f)), s;
  throw new Z("Stream");
}
function qa(e, t, r) {
  let n = e.base.refs.get(r.i);
  if (n) return te(e, r, r.i, 31), n.throw(y$1(e, t, r.f)), s;
  throw new Z("Stream");
}
function Ba(e, t, r) {
  let n = e.base.refs.get(r.i);
  if (n) return te(e, r, r.i, 31), n.return(y$1(e, t, r.f)), s;
  throw new Z("Stream");
}
function Va(e, t, r) {
  return y$1(e, t, r.f), s;
}
function Wa(e, t, r) {
  return y$1(e, t, r.a[1]), s;
}
function Xa(e, t, r) {
  let n = b(e, r.i, Jt([], r.s, r.l));
  for (let a = 0, o = r.a.length; a < o; a++) n.v[a] = y$1(e, t, r.a[a]);
  return n;
}
function y$1(e, t, r) {
  if (t > e.base.depthLimit) throw new Bt(e.base.depthLimit);
  switch (t += 1, r.t) {
    case 2:
      return Se$1(r, Nn, r.s);
    case 0:
      return Number(r.s);
    case 1:
      return z(String(r.s));
    case 3:
      if (String(r.s).length > la) throw new k(r);
      return BigInt(r.s);
    case 4:
      return e.base.refs.get(r.i);
    case 18:
      return ba(e, r);
    case 9:
      return wa(e, t, r);
    case 10:
    case 11:
      return Aa(e, t, r);
    case 5:
      return Ea(e, r);
    case 6:
      return xa(e, r);
    case 7:
      return Pa(e, t, r);
    case 8:
      return Ia(e, t, r);
    case 19:
      return _a(e, r);
    case 16:
    case 15:
      return ka(e, t, r);
    case 20:
      return ja(e, t, r);
    case 14:
      return Ua(e, t, r);
    case 13:
      return $a(e, t, r);
    case 12:
      return za(e, t, r);
    case 17:
      return Se$1(r, Mn, r.s);
    case 21:
      return Ca(e, t, r);
    case 25:
      return Da(e, t, r);
    case 22:
      return Ha(e, r);
    case 23:
      return Oa(e, t, r);
    case 24:
      return La(e, t, r);
    case 28:
      return Ma(e, t, r);
    case 30:
      return Ta(e, t, r);
    case 31:
      return Na(e, t, r);
    case 32:
      return Fa(e, t, r);
    case 33:
      return qa(e, t, r);
    case 34:
      return Ba(e, t, r);
    case 27:
      return Va(e, t, r);
    case 29:
      return Wa(e, t, r);
    case 35:
      return Xa(e, t, r);
    default:
      throw new H$1(r);
  }
}
function Ga(e, t) {
  try {
    return y$1(e, 0, t);
  } catch (r) {
    throw new Is(r);
  }
}
var Ja = () => T, Ya = Ja.toString(), nr = /=>/.test(Ya);
function sr(e, t) {
  return nr ? (e.length === 1 ? e[0] : "(" + e.join(",") + ")") + "=>" + (t.startsWith("{") ? "(" + t + ")" : t) : "function(" + e.join(",") + "){return " + t + "}";
}
function Ka(e, t) {
  return nr ? (e.length === 1 ? e[0] : "(" + e.join(",") + ")") + "=>{" + t + "}" : "function(" + e.join(",") + "){" + t + "}";
}
var ar = "hjkmoquxzABCDEFGHIJKLNPQRTUVWXYZ$_", Ke$1 = ar.length, or = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$_", Qe$1 = or.length;
function Qa(e) {
  let t = e % Ke$1, r = ar[t];
  for (e = (e - t) / Ke$1; e > 0; ) t = e % Qe$1, r += or[t], e = (e - t) / Qe$1;
  return r;
}
var Za = /^[$A-Z_][0-9A-Z_$]*$/i;
function ir(e) {
  let t = e[0];
  return (t === "$" || t === "_" || t >= "A" && t <= "Z" || t >= "a" && t <= "z") && Za.test(e);
}
function J(e) {
  switch (e.t) {
    case 0:
      return e.s + "=" + e.v;
    case 2:
      return e.s + ".set(" + e.k + "," + e.v + ")";
    case 1:
      return e.s + ".add(" + e.v + ")";
    case 3:
      return e.s + ".delete(" + e.k + ")";
  }
}
function eo(e) {
  let t = [], r = e[0];
  for (let n = 1, a = e.length, o, i = r; n < a; n++) o = e[n], o.t === 0 && o.v === i.v ? r = { t: 0, s: o.s, k: s, v: J(r) } : o.t === 2 && o.s === i.s ? r = { t: 2, s: J(r), k: o.k, v: o.v } : o.t === 1 && o.s === i.s ? r = { t: 1, s: J(r), k: s, v: o.v } : o.t === 3 && o.s === i.s ? r = { t: 3, s: J(r), k: o.k, v: s } : (t.push(r), r = o), i = o;
  return t.push(r), t;
}
function ur(e) {
  if (e.length) {
    let t = "", r = eo(e);
    for (let n = 0, a = r.length; n < a; n++) t += J(r[n]) + ",";
    return t;
  }
  return s;
}
var to = "Object.create(null)", ro = "new Set", no = "new Map", so = "Promise.resolve", ao = "Promise.reject", oo = { 3: "Object.freeze", 2: "Object.seal", 1: "Object.preventExtensions", 0: s };
function io(e, t) {
  return { mode: e, plugins: t.plugins, features: t.features, marked: new Set(t.markedRefs), stack: [], flags: [], assignments: [] };
}
function uo(e) {
  return { mode: 2, base: io(2, e), state: e, child: s };
}
var co = class {
  constructor(e) {
    this._p = e;
  }
  serialize(e) {
    return h(this._p, e);
  }
};
function lo(e, t) {
  let r = e.valid.get(t);
  r == null && (r = e.valid.size, e.valid.set(t, r));
  let n = e.vars[r];
  return n == null && (n = Qa(r), e.vars[r] = n), n;
}
function fo(e) {
  return ue$1 + "[" + e + "]";
}
function m(e, t) {
  return e.mode === 1 ? lo(e.state, t) : fo(t);
}
function S$1(e, t) {
  e.marked.add(t);
}
function Ae$1(e, t) {
  return e.marked.has(t);
}
function je$1(e, t, r) {
  t !== 0 && (S$1(e.base, r), e.base.flags.push({ type: t, value: m(e, r) }));
}
function po(e) {
  let t = "";
  for (let r = 0, n = e.flags, a = n.length; r < a; r++) {
    let o = n[r];
    t += oo[o.type] + "(" + o.value + "),";
  }
  return t;
}
function ho(e) {
  let t = ur(e.assignments), r = po(e);
  return t ? r ? t + r : t : r;
}
function Ue$1(e, t, r) {
  e.assignments.push({ t: 0, s: t, k: s, v: r });
}
function go(e, t, r) {
  e.base.assignments.push({ t: 1, s: m(e, t), k: s, v: r });
}
function X(e, t, r, n) {
  e.base.assignments.push({ t: 2, s: m(e, t), k: r, v: n });
}
function Ze(e, t, r) {
  e.base.assignments.push({ t: 3, s: m(e, t), k: r, v: s });
}
function K(e, t, r, n) {
  Ue$1(e.base, m(e, t) + "[" + r + "]", n);
}
function Ee$1(e, t, r, n) {
  Ue$1(e.base, m(e, t) + "." + r, n);
}
function mo(e, t, r, n) {
  Ue$1(e.base, m(e, t) + ".v[" + r + "]", n);
}
function x$1(e, t) {
  return t.t === 4 && e.stack.includes(t.i);
}
function W(e, t, r) {
  return e.mode === 1 && !Ae$1(e.base, t) ? r : m(e, t) + "=" + r;
}
function yo(e) {
  return G + '.get("' + e.s + '")';
}
function et(e, t, r, n) {
  return r ? x$1(e.base, r) ? (S$1(e.base, t), K(e, t, n, m(e, r.i)), "") : h(e, r) : "";
}
function bo(e, t) {
  let r = t.i, n = t.a, a = n.length;
  if (a > 0) {
    e.base.stack.push(r);
    let o = et(e, r, n[0], 0), i = o === "";
    for (let u = 1, c; u < a; u++) c = et(e, r, n[u], u), o += "," + c, i = c === "";
    return e.base.stack.pop(), je$1(e, t.o, t.i), "[" + o + (i ? ",]" : "]");
  }
  return "[]";
}
function tt(e, t, r, n) {
  if (typeof r == "string") {
    let a = Number(r), o = a >= 0 && a.toString() === r || ir(r);
    if (x$1(e.base, n)) {
      let i = m(e, n.i);
      return S$1(e.base, t.i), o && a !== a ? Ee$1(e, t.i, r, i) : K(e, t.i, o ? r : '"' + r + '"', i), "";
    }
    return (o ? r : '"' + r + '"') + ":" + h(e, n);
  }
  return "[" + h(e, r) + "]:" + h(e, n);
}
function cr(e, t, r) {
  let n = r.k, a = n.length;
  if (a > 0) {
    let o = r.v;
    e.base.stack.push(t.i);
    let i = tt(e, t, n[0], o[0]);
    for (let u = 1, c = i; u < a; u++) c = tt(e, t, n[u], o[u]), i += (c && i && ",") + c;
    return e.base.stack.pop(), "{" + i + "}";
  }
  return "{}";
}
function wo(e, t) {
  return je$1(e, t.o, t.i), cr(e, t, t.p);
}
function vo(e, t, r, n) {
  let a = cr(e, t, r);
  return a !== "{}" ? "Object.assign(" + n + "," + a + ")" : n;
}
function Ro(e, t, r, n, a) {
  let o = e.base, i = h(e, a), u = Number(n), c = u >= 0 && u.toString() === n || ir(n);
  if (x$1(o, a)) c && u !== u ? Ee$1(e, t.i, n, i) : K(e, t.i, c ? n : '"' + n + '"', i);
  else {
    let l = o.assignments;
    o.assignments = r, c && u !== u ? Ee$1(e, t.i, n, i) : K(e, t.i, c ? n : '"' + n + '"', i), o.assignments = l;
  }
}
function So(e, t, r, n, a) {
  if (typeof n == "string") Ro(e, t, r, n, a);
  else {
    let o = e.base, i = o.stack;
    o.stack = [];
    let u = h(e, a);
    o.stack = i;
    let c = o.assignments;
    o.assignments = r, K(e, t.i, h(e, n), u), o.assignments = c;
  }
}
function Ao(e, t, r) {
  let n = r.k, a = n.length;
  if (a > 0) {
    let o = [], i = r.v;
    e.base.stack.push(t.i);
    for (let u = 0; u < a; u++) So(e, t, o, n[u], i[u]);
    return e.base.stack.pop(), ur(o);
  }
  return s;
}
function $e$1(e, t, r) {
  if (t.p) {
    let n = e.base;
    if (n.features & 8) r = vo(e, t, t.p, r);
    else {
      S$1(n, t.i);
      let a = Ao(e, t, t.p);
      if (a) return "(" + W(e, t.i, r) + "," + a + m(e, t.i) + ")";
    }
  }
  return r;
}
function Eo(e, t) {
  return je$1(e, t.o, t.i), $e$1(e, t, to);
}
function xo(e) {
  return 'new Date("' + e.s + '")';
}
function Po(e, t) {
  if (e.base.features & 32) return "/" + t.c + "/" + t.m;
  throw new H$1(t);
}
function rt(e, t, r) {
  let n = e.base;
  return x$1(n, r) ? (S$1(n, t), go(e, t, m(e, r.i)), "") : h(e, r);
}
function Io(e, t) {
  let r = ro, n = t.a, a = n.length, o = t.i;
  if (a > 0) {
    e.base.stack.push(o);
    let i = rt(e, o, n[0]);
    for (let u = 1, c = i; u < a; u++) c = rt(e, o, n[u]), i += (c && i && ",") + c;
    e.base.stack.pop(), i && (r += "([" + i + "])");
  }
  return r;
}
function nt$1(e, t, r, n, a) {
  let o = e.base;
  if (x$1(o, r)) {
    let i = m(e, r.i);
    if (S$1(o, t), x$1(o, n)) {
      let c = m(e, n.i);
      return X(e, t, i, c), "";
    }
    if (n.t !== 4 && n.i != null && Ae$1(o, n.i)) {
      let c = "(" + h(e, n) + ",[" + a + "," + a + "])";
      return X(e, t, i, m(e, n.i)), Ze(e, t, a), c;
    }
    let u = o.stack;
    return o.stack = [], X(e, t, i, h(e, n)), o.stack = u, "";
  }
  if (x$1(o, n)) {
    let i = m(e, n.i);
    if (S$1(o, t), r.t !== 4 && r.i != null && Ae$1(o, r.i)) {
      let c = "(" + h(e, r) + ",[" + a + "," + a + "])";
      return X(e, t, m(e, r.i), i), Ze(e, t, a), c;
    }
    let u = o.stack;
    return o.stack = [], X(e, t, h(e, r), i), o.stack = u, "";
  }
  return "[" + h(e, r) + "," + h(e, n) + "]";
}
function _o(e, t) {
  let r = no, n = t.e.k, a = n.length, o = t.i, i = t.f, u = m(e, i.i), c = e.base;
  if (a > 0) {
    let l = t.e.v;
    c.stack.push(o);
    let p = nt$1(e, o, n[0], l[0], u);
    for (let d = 1, w = p; d < a; d++) w = nt$1(e, o, n[d], l[d], u), p += (w && p && ",") + w;
    c.stack.pop(), p && (r += "([" + p + "])");
  }
  return i.t === 26 && (S$1(c, i.i), r = "(" + h(e, i) + "," + r + ")"), r;
}
function ko(e, t) {
  return L$1(e, t.f) + '("' + t.s + '")';
}
function jo(e, t) {
  return "new " + t.c + "(" + h(e, t.f) + "," + t.b + "," + t.l + ")";
}
function Uo(e, t) {
  return "new DataView(" + h(e, t.f) + "," + t.b + "," + t.l + ")";
}
function $o(e, t) {
  let r = t.i;
  e.base.stack.push(r);
  let n = $e$1(e, t, 'new AggregateError([],"' + t.m + '")');
  return e.base.stack.pop(), n;
}
function zo(e, t) {
  return $e$1(e, t, "new " + zt[t.s] + '("' + t.m + '")');
}
function Co(e, t) {
  let r, n = t.f, a = t.i, o = t.s ? so : ao, i = e.base;
  if (x$1(i, n)) {
    let u = m(e, n.i);
    r = o + (t.s ? "().then(" + sr([], u) + ")" : "().catch(" + Ka([], "throw " + u) + ")");
  } else {
    i.stack.push(a);
    let u = h(e, n);
    i.stack.pop(), r = o + "(" + u + ")";
  }
  return r;
}
function Do(e, t) {
  return "Object(" + h(e, t.f) + ")";
}
function L$1(e, t) {
  let r = h(e, t);
  return t.t === 4 ? r : "(" + r + ")";
}
function Ho(e, t) {
  if (e.mode === 1) throw new H$1(t);
  return "(" + W(e, t.s, L$1(e, t.f) + "()") + ").p";
}
function Oo(e, t) {
  if (e.mode === 1) throw new H$1(t);
  return L$1(e, t.a[0]) + "(" + m(e, t.i) + "," + h(e, t.a[1]) + ")";
}
function Lo(e, t) {
  if (e.mode === 1) throw new H$1(t);
  return L$1(e, t.a[0]) + "(" + m(e, t.i) + "," + h(e, t.a[1]) + ")";
}
function Mo(e, t) {
  let r = e.base.plugins;
  if (r) for (let n = 0, a = r.length; n < a; n++) {
    let o = r[n];
    if (o.tag === t.c) return e.child == null && (e.child = new co(e)), o.serialize(t.s, e.child, { id: t.i });
  }
  throw new qt(t.c);
}
function To(e, t) {
  let r = "", n = false;
  return t.f.t !== 4 && (S$1(e.base, t.f.i), r = "(" + h(e, t.f) + ",", n = true), r += W(e, t.i, "(" + Ls + ")(" + m(e, t.f.i) + ")"), n && (r += ")"), r;
}
function No(e, t) {
  return L$1(e, t.a[0]) + "(" + h(e, t.a[1]) + ")";
}
function Fo(e, t) {
  let r = t.a[0], n = t.a[1], a = e.base, o = "";
  r.t !== 4 && (S$1(a, r.i), o += "(" + h(e, r)), n.t !== 4 && (S$1(a, n.i), o += (o ? "," : "(") + h(e, n)), o && (o += ",");
  let i = W(e, t.i, "(" + Ms + ")(" + m(e, n.i) + "," + m(e, r.i) + ")");
  return o ? o + i + ")" : i;
}
function qo(e, t) {
  return L$1(e, t.a[0]) + "(" + h(e, t.a[1]) + ")";
}
function Bo(e, t) {
  let r = W(e, t.i, L$1(e, t.f) + "()"), n = t.a.length;
  if (n) {
    let a = h(e, t.a[0]);
    for (let o = 1; o < n; o++) a += "," + h(e, t.a[o]);
    return "(" + r + "," + a + "," + m(e, t.i) + ")";
  }
  return r;
}
function Vo(e, t) {
  return m(e, t.i) + ".next(" + h(e, t.f) + ")";
}
function Wo(e, t) {
  return m(e, t.i) + ".throw(" + h(e, t.f) + ")";
}
function Xo(e, t) {
  return m(e, t.i) + ".return(" + h(e, t.f) + ")";
}
function st(e, t, r, n) {
  let a = e.base;
  return x$1(a, n) ? (S$1(a, t), mo(e, t, r, m(e, n.i)), "") : h(e, n);
}
function Go(e, t) {
  let r = t.a, n = r.length, a = t.i;
  if (n > 0) {
    e.base.stack.push(a);
    let o = st(e, a, 0, r[0]);
    for (let i = 1, u = o; i < n; i++) u = st(e, a, i, r[i]), o += (u && o && ",") + u;
    if (e.base.stack.pop(), o) return "{__SEROVAL_SEQUENCE__:!0,v:[" + o + "],t:" + t.s + ",d:" + t.l + "}";
  }
  return "{__SEROVAL_SEQUENCE__:!0,v:[],t:-1,d:0}";
}
function Jo(e, t) {
  switch (t.t) {
    case 17:
      return Ln[t.s];
    case 18:
      return yo(t);
    case 9:
      return bo(e, t);
    case 10:
      return wo(e, t);
    case 11:
      return Eo(e, t);
    case 5:
      return xo(t);
    case 6:
      return Po(e, t);
    case 7:
      return Io(e, t);
    case 8:
      return _o(e, t);
    case 19:
      return ko(e, t);
    case 16:
    case 15:
      return jo(e, t);
    case 20:
      return Uo(e, t);
    case 14:
      return $o(e, t);
    case 13:
      return zo(e, t);
    case 12:
      return Co(e, t);
    case 21:
      return Do(e, t);
    case 22:
      return Ho(e, t);
    case 25:
      return Mo(e, t);
    case 26:
      return Gs[t.s];
    case 35:
      return Go(e, t);
    default:
      throw new H$1(t);
  }
}
function h(e, t) {
  switch (t.t) {
    case 2:
      return Tn[t.s];
    case 0:
      return "" + t.s;
    case 1:
      return '"' + t.s + '"';
    case 3:
      return t.s + "n";
    case 4:
      return m(e, t.i);
    case 23:
      return Oo(e, t);
    case 24:
      return Lo(e, t);
    case 27:
      return To(e, t);
    case 28:
      return No(e, t);
    case 29:
      return Fo(e, t);
    case 30:
      return qo(e, t);
    case 31:
      return Bo(e, t);
    case 32:
      return Vo(e, t);
    case 33:
      return Wo(e, t);
    case 34:
      return Xo(e, t);
    default:
      return W(e, t.i, Jo(e, t));
  }
}
function Yo(e, t) {
  let r = h(e, t), n = t.i;
  if (n == null) return r;
  let a = ho(e.base), o = m(e, n), i = e.state.scopeId, u = i == null ? "" : ue$1, c = a ? "(" + r + "," + a + o + ")" : r;
  if (u === "") return t.t === 10 && !a ? "(" + c + ")" : c;
  let l = i == null ? "()" : "(" + ue$1 + '["' + E$1(i) + '"])';
  return "(" + sr([u], c) + ")" + l;
}
var Ko = class {
  constructor(e, t) {
    this._p = e, this.depth = t;
  }
  parse(e) {
    return v(this._p, this.depth, e);
  }
}, Qo = class {
  constructor(e, t) {
    this._p = e, this.depth = t;
  }
  parse(e) {
    return v(this._p, this.depth, e);
  }
  parseWithError(e) {
    return D$1(this._p, this.depth, e);
  }
  isAlive() {
    return this._p.state.alive;
  }
  pushPendingState() {
    He$1(this._p);
  }
  popPendingState() {
    Q(this._p);
  }
  onParse(e) {
    V(this._p, e);
  }
  onError(e) {
    Ce$1(this._p, e);
  }
};
function Zo(e) {
  return { alive: true, pending: 0, initial: true, buffer: [], onParse: e.onParse, onError: e.onError, onDone: e.onDone };
}
function lr(e) {
  return { type: 2, base: Zs(2, e), state: Zo(e) };
}
function ei(e, t, r) {
  let n = [];
  for (let a = 0, o = r.length; a < o; a++) a in r ? n[a] = v(e, t, r[a]) : n[a] = 0;
  return n;
}
function ti(e, t, r, n) {
  return cs(r, n, ei(e, t, n));
}
function ze$1(e, t, r) {
  let n = Object.entries(r), a = [], o = [];
  for (let i = 0, u = n.length; i < u; i++) a.push(E$1(n[i][0])), o.push(v(e, t, n[i][1]));
  return I$1 in r && (a.push(C(e.base, I$1)), o.push(ys(ta(e.base), v(e, t, Fs(r))))), P in r && (a.push(C(e.base, P)), o.push(bs(ra(e.base), v(e, t, e.type === 1 ? ee() : Ys(r))))), B in r && (a.push(C(e.base, B)), o.push(Tt(r[B]))), q$1 in r && (a.push(C(e.base, q$1)), o.push(r[q$1] ? Ct : Dt)), { k: a, v: o };
}
function ge$1(e, t, r, n, a) {
  return na(r, n, a, ze$1(e, t, n));
}
function ri(e, t, r, n) {
  return ls(r, v(e, t, n.valueOf()));
}
function ni(e, t, r, n) {
  return fs(r, n, v(e, t, n.buffer));
}
function si(e, t, r, n) {
  return ps(r, n, v(e, t, n.buffer));
}
function ai(e, t, r, n) {
  return ds(r, n, v(e, t, n.buffer));
}
function at(e, t, r, n) {
  let a = Lt(n, e.base.features);
  return hs(r, n, a ? ze$1(e, t, a) : s);
}
function oi(e, t, r, n) {
  let a = Lt(n, e.base.features);
  return gs(r, n, a ? ze$1(e, t, a) : s);
}
function ii(e, t, r, n) {
  let a = [], o = [];
  for (let [i, u] of n.entries()) a.push(v(e, t, i)), o.push(v(e, t, u));
  return sa(e.base, r, a, o);
}
function ui(e, t, r, n) {
  let a = [];
  for (let o of n.keys()) a.push(v(e, t, o));
  return ms(r, a);
}
function ci(e, t, r, n) {
  let a = ws(r, O(e.base, 4), []);
  return e.type === 1 || (He$1(e), n.on({ next: (o) => {
    if (e.state.alive) {
      let i = D$1(e, t, o);
      i && V(e, vs(r, i));
    }
  }, throw: (o) => {
    if (e.state.alive) {
      let i = D$1(e, t, o);
      i && V(e, Rs(r, i));
    }
    Q(e);
  }, return: (o) => {
    if (e.state.alive) {
      let i = D$1(e, t, o);
      i && V(e, Ss(r, i));
    }
    Q(e);
  } })), a;
}
function li(e, t, r) {
  if (this.state.alive) {
    let n = D$1(this, t, r);
    n && V(this, g$1(23, e, s, s, s, s, s, [O(this.base, 2), n], s, s, s, s)), Q(this);
  }
}
function fi(e, t, r) {
  if (this.state.alive) {
    let n = D$1(this, t, r);
    n && V(this, g$1(24, e, s, s, s, s, s, [O(this.base, 3), n], s, s, s, s));
  }
  Q(this);
}
function pi(e, t, r, n) {
  let a = Yt(e.base, {});
  return e.type === 2 && (He$1(e), n.then(li.bind(e, a, t), fi.bind(e, a, t))), aa(e.base, r, a);
}
function di(e, t, r, n, a) {
  for (let o = 0, i = a.length; o < i; o++) {
    let u = a[o];
    if (u.parse.sync && u.test(n)) return Nt(r, u.tag, u.parse.sync(n, new Ko(e, t), { id: r }));
  }
  return s;
}
function hi(e, t, r, n, a) {
  for (let o = 0, i = a.length; o < i; o++) {
    let u = a[o];
    if (u.parse.stream && u.test(n)) return Nt(r, u.tag, u.parse.stream(n, new Qo(e, t), { id: r }));
  }
  return s;
}
function fr(e, t, r, n) {
  let a = e.base.plugins;
  return a ? e.type === 1 ? di(e, t, r, n, a) : hi(e, t, r, n, a) : s;
}
function gi(e, t, r, n) {
  let a = [];
  for (let o = 0, i = n.v.length; o < i; o++) a[o] = v(e, t, n.v[o]);
  return As(r, a, n.t, n.d);
}
function mi(e, t, r, n, a) {
  switch (a) {
    case Object:
      return ge$1(e, t, r, n, false);
    case s:
      return ge$1(e, t, r, n, true);
    case Date:
      return as(r, n);
    case Error:
    case EvalError:
    case RangeError:
    case ReferenceError:
    case SyntaxError:
    case TypeError:
    case URIError:
      return at(e, t, r, n);
    case Number:
    case Boolean:
    case String:
    case BigInt:
      return ri(e, t, r, n);
    case ArrayBuffer:
      return oa(e.base, r, n);
    case Int8Array:
    case Int16Array:
    case Int32Array:
    case Uint8Array:
    case Uint16Array:
    case Uint32Array:
    case Uint8ClampedArray:
    case Float32Array:
    case Float64Array:
      return ni(e, t, r, n);
    case DataView:
      return ai(e, t, r, n);
    case Map:
      return ii(e, t, r, n);
    case Set:
      return ui(e, t, r, n);
  }
  if (a === Promise || n instanceof Promise) return pi(e, t, r, n);
  let o = e.base.features;
  if (o & 32 && a === RegExp) return os(r, n);
  if (o & 16) switch (a) {
    case BigInt64Array:
    case BigUint64Array:
      return si(e, t, r, n);
  }
  if (o & 1 && typeof AggregateError < "u" && (a === AggregateError || n instanceof AggregateError)) return oi(e, t, r, n);
  if (n instanceof Error) return at(e, t, r, n);
  if (I$1 in n || P in n) return ge$1(e, t, r, n, !!a);
  throw new ce(n);
}
function yi(e, t, r, n) {
  if (Array.isArray(n)) return ti(e, t, r, n);
  if (Js(n)) return ci(e, t, r, n);
  if (Ns(n)) return gi(e, t, r, n);
  let a = n.constructor;
  return a === Us ? v(e, t, n.replacement) : fr(e, t, r, n) || mi(e, t, r, n, a);
}
function bi(e, t, r) {
  let n = _e$1(e.base, r);
  if (n.type !== 0) return n.value;
  let a = fr(e, t, n.value, r);
  if (a) return a;
  throw new ce(r);
}
function v(e, t, r) {
  if (t >= e.base.depthLimit) throw new Bt(e.base.depthLimit);
  switch (typeof r) {
    case "boolean":
      return r ? Ct : Dt;
    case "undefined":
      return qn;
    case "string":
      return Tt(r);
    case "number":
      return rs(r);
    case "bigint":
      return ns(r);
    case "object": {
      if (r) {
        let n = _e$1(e.base, r);
        return n.type === 0 ? yi(e, t + 1, n.value, r) : n.value;
      }
      return Bn;
    }
    case "symbol":
      return C(e.base, r);
    case "function":
      return bi(e, t, r);
    default:
      throw new ce(r);
  }
}
function V(e, t) {
  e.state.initial ? e.state.buffer.push(t) : De$1(e, t, false);
}
function Ce$1(e, t) {
  if (e.state.onError) e.state.onError(t);
  else throw t instanceof Je$1 ? t : new Je$1(t);
}
function pr(e) {
  e.state.onDone && e.state.onDone();
}
function De$1(e, t, r) {
  try {
    e.state.onParse(t, r);
  } catch (n) {
    Ce$1(e, n);
  }
}
function He$1(e) {
  e.state.pending++;
}
function Q(e) {
  --e.state.pending <= 0 && pr(e);
}
function D$1(e, t, r) {
  try {
    return v(e, t, r);
  } catch (n) {
    return Ce$1(e, n), s;
  }
}
function dr(e, t) {
  let r = D$1(e, 0, t);
  r && (De$1(e, r, true), e.state.initial = false, wi(e, e.state), e.state.pending <= 0 && Oe$1(e));
}
function wi(e, t) {
  for (let r = 0, n = t.buffer.length; r < n; r++) De$1(e, t.buffer[r], false);
}
function Oe$1(e) {
  e.state.alive && (pr(e), e.state.alive = false);
}
function vi(e, t) {
  let r = ke$1(t.plugins), n = lr({ plugins: r, refs: t.refs, disabledFeatures: t.disabledFeatures, onParse(a, o) {
    let i = uo({ plugins: r, features: n.base.features, scopeId: t.scopeId, markedRefs: n.base.marked }), u;
    try {
      u = Yo(i, a);
    } catch (c) {
      t.onError && t.onError(c);
      return;
    }
    t.onSerialize(u, o);
  }, onError: t.onError, onDone: t.onDone });
  return dr(n, e), Oe$1.bind(null, n);
}
function Ri(e, t) {
  let r = ke$1(t.plugins), n = lr({ plugins: r, refs: t.refs, disabledFeatures: t.disabledFeatures, depthLimit: t.depthLimit, onParse: t.onParse, onError: t.onError, onDone: t.onDone });
  return dr(n, e), Oe$1.bind(null, n);
}
function Si(e, t = {}) {
  var r;
  let n = ke$1(t.plugins), a = t.disabledFeatures || 0, o = (r = e.f) != null ? r : 63, i = ha({ plugins: n, markedRefs: e.m, features: o & ~a, disabledFeatures: a });
  return Ga(i, e.t);
}
var xe$1 = (e) => {
  let t = new AbortController(), r = t.abort.bind(t);
  return e.then(r, r), t;
};
function Ai(e) {
  e(this.reason);
}
function Ei(e) {
  this.addEventListener("abort", Ai.bind(this, e), { once: true });
}
function ot(e) {
  return new Promise(Ei.bind(e));
}
var Y = {}, xi = { tag: "seroval-plugins/web/AbortControllerFactoryPlugin", test(e) {
  return e === Y;
}, parse: { sync() {
  return Y;
}, async async() {
  return await Promise.resolve(Y);
}, stream() {
  return Y;
} }, serialize() {
  return xe$1.toString();
}, deserialize() {
  return xe$1;
} }, Pi = { tag: "seroval-plugins/web/AbortSignal", extends: [xi], test(e) {
  return typeof AbortSignal > "u" ? false : e instanceof AbortSignal;
}, parse: { sync(e, t) {
  return e.aborted ? { reason: t.parse(e.reason) } : {};
}, async async(e, t) {
  if (e.aborted) return { reason: await t.parse(e.reason) };
  let r = await ot(e);
  return { reason: await t.parse(r) };
}, stream(e, t) {
  if (e.aborted) return { reason: t.parse(e.reason) };
  let r = ot(e);
  return { factory: t.parse(Y), controller: t.parse(r) };
} }, serialize(e, t) {
  return e.reason ? "AbortSignal.abort(" + t.serialize(e.reason) + ")" : e.controller && e.factory ? "(" + t.serialize(e.factory) + ")(" + t.serialize(e.controller) + ").signal" : "(new AbortController).signal";
}, deserialize(e, t) {
  return e.reason ? AbortSignal.abort(t.deserialize(e.reason)) : e.controller ? xe$1(t.deserialize(e.controller)).signal : new AbortController().signal;
} }, Ii = Pi;
function me$1(e) {
  return { detail: e.detail, bubbles: e.bubbles, cancelable: e.cancelable, composed: e.composed };
}
var _i = { tag: "seroval-plugins/web/CustomEvent", test(e) {
  return typeof CustomEvent > "u" ? false : e instanceof CustomEvent;
}, parse: { sync(e, t) {
  return { type: t.parse(e.type), options: t.parse(me$1(e)) };
}, async async(e, t) {
  return { type: await t.parse(e.type), options: await t.parse(me$1(e)) };
}, stream(e, t) {
  return { type: t.parse(e.type), options: t.parse(me$1(e)) };
} }, serialize(e, t) {
  return "new CustomEvent(" + t.serialize(e.type) + "," + t.serialize(e.options) + ")";
}, deserialize(e, t) {
  return new CustomEvent(t.deserialize(e.type), t.deserialize(e.options));
} }, ki = _i, ji = { tag: "seroval-plugins/web/DOMException", test(e) {
  return typeof DOMException > "u" ? false : e instanceof DOMException;
}, parse: { sync(e, t) {
  return { name: t.parse(e.name), message: t.parse(e.message) };
}, async async(e, t) {
  return { name: await t.parse(e.name), message: await t.parse(e.message) };
}, stream(e, t) {
  return { name: t.parse(e.name), message: t.parse(e.message) };
} }, serialize(e, t) {
  return "new DOMException(" + t.serialize(e.message) + "," + t.serialize(e.name) + ")";
}, deserialize(e, t) {
  return new DOMException(t.deserialize(e.message), t.deserialize(e.name));
} }, Ui = ji;
function ye$1(e) {
  return { bubbles: e.bubbles, cancelable: e.cancelable, composed: e.composed };
}
var $i = { tag: "seroval-plugins/web/Event", test(e) {
  return typeof Event > "u" ? false : e instanceof Event;
}, parse: { sync(e, t) {
  return { type: t.parse(e.type), options: t.parse(ye$1(e)) };
}, async async(e, t) {
  return { type: await t.parse(e.type), options: await t.parse(ye$1(e)) };
}, stream(e, t) {
  return { type: t.parse(e.type), options: t.parse(ye$1(e)) };
} }, serialize(e, t) {
  return "new Event(" + t.serialize(e.type) + "," + t.serialize(e.options) + ")";
}, deserialize(e, t) {
  return new Event(t.deserialize(e.type), t.deserialize(e.options));
} }, zi = $i, Ci = { tag: "seroval-plugins/web/File", test(e) {
  return typeof File > "u" ? false : e instanceof File;
}, parse: { async async(e, t) {
  return { name: await t.parse(e.name), options: await t.parse({ type: e.type, lastModified: e.lastModified }), buffer: await t.parse(await e.arrayBuffer()) };
} }, serialize(e, t) {
  return "new File([" + t.serialize(e.buffer) + "]," + t.serialize(e.name) + "," + t.serialize(e.options) + ")";
}, deserialize(e, t) {
  return new File([t.deserialize(e.buffer)], t.deserialize(e.name), t.deserialize(e.options));
} }, Di = Ci;
function be$1(e) {
  let t = [];
  return e.forEach((r, n) => {
    t.push([n, r]);
  }), t;
}
var j$1 = {}, hr = (e, t = new FormData(), r = 0, n = e.length, a) => {
  for (; r < n; r++) a = e[r], t.append(a[0], a[1]);
  return t;
}, Hi = { tag: "seroval-plugins/web/FormDataFactory", test(e) {
  return e === j$1;
}, parse: { sync() {
  return j$1;
}, async async() {
  return await Promise.resolve(j$1);
}, stream() {
  return j$1;
} }, serialize() {
  return hr.toString();
}, deserialize() {
  return j$1;
} }, Oi = { tag: "seroval-plugins/web/FormData", extends: [Di, Hi], test(e) {
  return typeof FormData > "u" ? false : e instanceof FormData;
}, parse: { sync(e, t) {
  return { factory: t.parse(j$1), entries: t.parse(be$1(e)) };
}, async async(e, t) {
  return { factory: await t.parse(j$1), entries: await t.parse(be$1(e)) };
}, stream(e, t) {
  return { factory: t.parse(j$1), entries: t.parse(be$1(e)) };
} }, serialize(e, t) {
  return "(" + t.serialize(e.factory) + ")(" + t.serialize(e.entries) + ")";
}, deserialize(e, t) {
  return hr(t.deserialize(e.entries));
} }, Li = Oi;
function we$1(e) {
  let t = [];
  return e.forEach((r, n) => {
    t.push([n, r]);
  }), t;
}
var Mi = { tag: "seroval-plugins/web/Headers", test(e) {
  return typeof Headers > "u" ? false : e instanceof Headers;
}, parse: { sync(e, t) {
  return { value: t.parse(we$1(e)) };
}, async async(e, t) {
  return { value: await t.parse(we$1(e)) };
}, stream(e, t) {
  return { value: t.parse(we$1(e)) };
} }, serialize(e, t) {
  return "new Headers(" + t.serialize(e.value) + ")";
}, deserialize(e, t) {
  return new Headers(t.deserialize(e.value));
} }, Le$1 = Mi, U$1 = {}, gr = (e) => new ReadableStream({ start: (t) => {
  e.on({ next: (r) => {
    try {
      t.enqueue(r);
    } catch {
    }
  }, throw: (r) => {
    t.error(r);
  }, return: () => {
    try {
      t.close();
    } catch {
    }
  } });
} }), Ti = { tag: "seroval-plugins/web/ReadableStreamFactory", test(e) {
  return e === U$1;
}, parse: { sync() {
  return U$1;
}, async async() {
  return await Promise.resolve(U$1);
}, stream() {
  return U$1;
} }, serialize() {
  return gr.toString();
}, deserialize() {
  return U$1;
} };
function it(e) {
  let t = ee(), r = e.getReader();
  async function n() {
    try {
      let a = await r.read();
      a.done ? t.return(a.value) : (t.next(a.value), await n());
    } catch (a) {
      t.throw(a);
    }
  }
  return n().catch(() => {
  }), t;
}
var Ni = { tag: "seroval/plugins/web/ReadableStream", extends: [Ti], test(e) {
  return typeof ReadableStream > "u" ? false : e instanceof ReadableStream;
}, parse: { sync(e, t) {
  return { factory: t.parse(U$1), stream: t.parse(ee()) };
}, async async(e, t) {
  return { factory: await t.parse(U$1), stream: await t.parse(it(e)) };
}, stream(e, t) {
  return { factory: t.parse(U$1), stream: t.parse(it(e)) };
} }, serialize(e, t) {
  return "(" + t.serialize(e.factory) + ")(" + t.serialize(e.stream) + ")";
}, deserialize(e, t) {
  let r = t.deserialize(e.stream);
  return gr(r);
} }, Me$1 = Ni;
function ut(e, t) {
  return { body: t, cache: e.cache, credentials: e.credentials, headers: e.headers, integrity: e.integrity, keepalive: e.keepalive, method: e.method, mode: e.mode, redirect: e.redirect, referrer: e.referrer, referrerPolicy: e.referrerPolicy };
}
var Fi = { tag: "seroval-plugins/web/Request", extends: [Me$1, Le$1], test(e) {
  return typeof Request > "u" ? false : e instanceof Request;
}, parse: { async async(e, t) {
  return { url: await t.parse(e.url), options: await t.parse(ut(e, e.body && !e.bodyUsed ? await e.clone().arrayBuffer() : null)) };
}, stream(e, t) {
  return { url: t.parse(e.url), options: t.parse(ut(e, e.body && !e.bodyUsed ? e.clone().body : null)) };
} }, serialize(e, t) {
  return "new Request(" + t.serialize(e.url) + "," + t.serialize(e.options) + ")";
}, deserialize(e, t) {
  return new Request(t.deserialize(e.url), t.deserialize(e.options));
} }, qi = Fi;
function ct(e) {
  return { headers: e.headers, status: e.status, statusText: e.statusText };
}
var Bi = { tag: "seroval-plugins/web/Response", extends: [Me$1, Le$1], test(e) {
  return typeof Response > "u" ? false : e instanceof Response;
}, parse: { async async(e, t) {
  return { body: await t.parse(e.body && !e.bodyUsed ? await e.clone().arrayBuffer() : null), options: await t.parse(ct(e)) };
}, stream(e, t) {
  return { body: t.parse(e.body && !e.bodyUsed ? e.clone().body : null), options: t.parse(ct(e)) };
} }, serialize(e, t) {
  return "new Response(" + t.serialize(e.body) + "," + t.serialize(e.options) + ")";
}, deserialize(e, t) {
  return new Response(t.deserialize(e.body), t.deserialize(e.options));
} }, Vi = Bi, Wi = { tag: "seroval-plugins/web/URL", test(e) {
  return typeof URL > "u" ? false : e instanceof URL;
}, parse: { sync(e, t) {
  return { value: t.parse(e.href) };
}, async async(e, t) {
  return { value: await t.parse(e.href) };
}, stream(e, t) {
  return { value: t.parse(e.href) };
} }, serialize(e, t) {
  return "new URL(" + t.serialize(e.value) + ")";
}, deserialize(e, t) {
  return new URL(t.deserialize(e.value));
} }, Xi = Wi, Gi = { tag: "seroval-plugins/web/URLSearchParams", test(e) {
  return typeof URLSearchParams > "u" ? false : e instanceof URLSearchParams;
}, parse: { sync(e, t) {
  return { value: t.parse(e.toString()) };
}, async async(e, t) {
  return { value: await t.parse(e.toString()) };
}, stream(e, t) {
  return { value: t.parse(e.toString()) };
} }, serialize(e, t) {
  return "new URLSearchParams(" + t.serialize(e.value) + ")";
}, deserialize(e, t) {
  return new URLSearchParams(t.deserialize(e.value));
} }, Ji = Gi;
const Te$1 = [Ii, ki, Ui, zi, Li, Le$1, Me$1, qi, Vi, Ji, Xi], Yi = 64, mr = St.RegExp;
function yr(e) {
  const t = new TextEncoder().encode(e), r = t.length, n = r.toString(16), a = "00000000".substring(0, 8 - n.length) + n, o = new TextEncoder().encode(`;0x${a};`), i = new Uint8Array(12 + r);
  return i.set(o), i.set(t, 12), i;
}
function lt(e, t) {
  return new ReadableStream({ start(r) {
    vi(t, { scopeId: e, plugins: Te$1, onSerialize(n, a) {
      r.enqueue(yr(a ? `(${Kn(e)},${n})` : n));
    }, onDone() {
      r.close();
    }, onError(n) {
      r.error(n);
    } });
  } });
}
function Ki(e) {
  return new ReadableStream({ start(t) {
    Ri(e, { disabledFeatures: mr, depthLimit: Yi, plugins: Te$1, onParse(r) {
      t.enqueue(yr(JSON.stringify(r)));
    }, onDone() {
      t.close();
    }, onError(r) {
      t.error(r);
    } });
  } });
}
async function ft(e) {
  return Si(JSON.parse(e), { plugins: Te$1, disabledFeatures: mr });
}
async function Qi(e) {
  const t = bn(e), r = t.request, n = r.headers.get("X-Server-Id"), a = r.headers.get("X-Server-Instance"), o = r.headers.has("X-Single-Flight"), i = new URL(r.url);
  let u, c;
  if (n) gn(typeof n == "string", "Invalid server function"), [u, c] = decodeURIComponent(n).split("#");
  else if (u = i.searchParams.get("id"), c = i.searchParams.get("name"), !u || !c) return new Response(null, { status: 404 });
  const l = On[u];
  let p;
  if (!l) return new Response(null, { status: 404 });
  p = await l.importer();
  const d = p[l.functionName];
  let w = [];
  if (!a || e.method === "GET") {
    const f = i.searchParams.get("args");
    if (f) {
      const A = await ft(f);
      for (const re of A) w.push(re);
    }
  }
  if (e.method === "POST") {
    const f = r.headers.get("content-type"), A = e.node.req, re = A instanceof ReadableStream, br = A.body instanceof ReadableStream, wr = re && A.locked || br && A.body.locked, vr = re ? A : A.body, pe = wr ? r : new Request(r, { ...r, body: vr });
    r.headers.get("x-serialized") ? w = await ft(await pe.text()) : (f == null ? void 0 : f.startsWith("multipart/form-data")) || (f == null ? void 0 : f.startsWith("application/x-www-form-urlencoded")) ? w.push(await pe.formData()) : (f == null ? void 0 : f.startsWith("application/json")) && (w = await pe.json());
  }
  try {
    let f = await provideRequestEvent(t, async () => (sharedConfig.context = { event: t }, t.locals.serverFunctionMeta = { id: u + "#" + c }, d(...w)));
    if (o && a && (f = await dt(t, f)), f instanceof Response) {
      if (f.headers && f.headers.has("X-Content-Raw")) return f;
      a && (f.headers && We$1(e, f.headers), f.status && (f.status < 300 || f.status >= 400) && ie$1(e, f.status), f.customBody ? f = await f.customBody() : f.body == null && (f = null));
    }
    if (!a) return pt(f, r, w);
    return M$1(e, "x-serialized", "true"), M$1(e, "content-type", "text/javascript"), lt(a, f);
    return Ki(f);
  } catch (f) {
    if (f instanceof Response) o && a && (f = await dt(t, f)), f.headers && We$1(e, f.headers), f.status && (!a || f.status < 300 || f.status >= 400) && ie$1(e, f.status), f.customBody ? f = f.customBody() : f.body == null && (f = null), M$1(e, "X-Error", "true");
    else if (a) {
      const A = f instanceof Error ? f.message : typeof f == "string" ? f : "true";
      M$1(e, "X-Error", A.replace(/[\r\n]+/g, ""));
    } else f = pt(f, r, w, true);
    return a ? (M$1(e, "x-serialized", "true"), M$1(e, "content-type", "text/javascript"), lt(a, f)) : f;
  }
}
function pt(e, t, r, n) {
  const a = new URL(t.url), o = e instanceof Error;
  let i = 302, u;
  return e instanceof Response ? (u = new Headers(e.headers), e.headers.has("Location") && (u.set("Location", new URL(e.headers.get("Location"), a.origin + "").toString()), i = Hn(e))) : u = new Headers({ Location: new URL(t.headers.get("referer")).toString() }), e && u.append("Set-Cookie", `flash=${encodeURIComponent(JSON.stringify({ url: a.pathname + a.search, result: o ? e.message : e, thrown: n, error: o, input: [...r.slice(0, -1), [...r[r.length - 1].entries()]] }))}; Secure; HttpOnly;`), new Response(null, { status: i, headers: u });
}
let ve$1;
function Zi(e) {
  var _a2;
  const t = new Headers(e.request.headers), r = an(e.nativeEvent), n = e.response.headers.getSetCookie();
  t.delete("cookie");
  let a = false;
  return ((_a2 = e.nativeEvent.node) == null ? void 0 : _a2.req) && (a = true, e.nativeEvent.node.req.headers.cookie = ""), n.forEach((o) => {
    if (!o) return;
    const { maxAge: i, expires: u, name: c, value: l } = Wr(o);
    if (i != null && i <= 0) {
      delete r[c];
      return;
    }
    if (u != null && u.getTime() <= Date.now()) {
      delete r[c];
      return;
    }
    r[c] = l;
  }), Object.entries(r).forEach(([o, i]) => {
    t.append("cookie", `${o}=${i}`), a && (e.nativeEvent.node.req.headers.cookie += `${o}=${i};`);
  }), t;
}
async function dt(e, t) {
  let r, n = new URL(e.request.headers.get("referer")).toString();
  t instanceof Response && (t.headers.has("X-Revalidate") && (r = t.headers.get("X-Revalidate").split(",")), t.headers.has("Location") && (n = new URL(t.headers.get("Location"), new URL(e.request.url).origin + "").toString()));
  const a = yn(e);
  return a.request = new Request(n, { headers: Zi(e) }), await provideRequestEvent(a, async () => {
    await Cn(a), ve$1 || (ve$1 = (await import('../build/app-BjtImgdv.mjs')).default), a.router.dataOnly = r || true, a.router.previousUrl = e.request.headers.get("referer");
    try {
      renderToString(() => {
        sharedConfig.context.event = a, ve$1();
      });
    } catch (u) {
      console.log(u);
    }
    const o = a.router.data;
    if (!o) return t;
    let i = false;
    for (const u in o) o[u] === void 0 ? delete o[u] : i = true;
    return i && (t instanceof Response ? t.customBody && (o._$value = t.customBody()) : (o._$value = t, t = new Response(null, { status: 200 })), t.customBody = () => o, t.headers.set("X-Single-Flight", "true")), t;
  });
}
const fu = eventHandler(Qi);

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, key + "" , value);
const ie = isServer ? (e) => {
  const t = getRequestEvent();
  return t.response.status = e.code, t.response.statusText = e.text, onCleanup(() => !t.nativeEvent.handled && !t.complete && (t.response.status = 200)), null;
} : (e) => null;
var ue = ["<span", ' style="font-size:1.5em;text-align:center;position:fixed;left:0px;bottom:55%;width:100%;">500 | Internal Server Error</span>'];
const le = (e) => {
  let t = false;
  const r = catchError(() => e.children, (s) => {
    console.error(s), t = !!s;
  });
  return t ? [ssr(ue, ssrHydrationKey()), createComponent$1(ie, { code: 500 })] : r;
};
var pe = " ";
const he = { style: (e) => ssrElement("style", e.attrs, () => e.children, true), link: (e) => ssrElement("link", e.attrs, void 0, true), script: (e) => e.attrs.src ? ssrElement("script", mergeProps(() => e.attrs, { get id() {
  return e.key;
} }), () => ssr(pe), true) : null, noscript: (e) => ssrElement("noscript", e.attrs, () => escape(e.children), true) };
function de(e, t) {
  let { tag: r, attrs: { key: s, ...o } = { key: void 0 }, children: a } = e;
  return he[r]({ attrs: { ...o, nonce: t }, key: s, children: a });
}
var D = ["<script", ">", "<\/script>"], w = ["<script", ' type="module"', "><\/script>"];
const fe = ssr("<!DOCTYPE html>");
function me(e) {
  const t = getRequestEvent(), r = t.nonce;
  return createComponent$1(NoHydration, { get children() {
    return [fe, createComponent$1(le, { get children() {
      return createComponent$1(e.document, { get assets() {
        return t.assets.map((s) => de(s));
      }, get scripts() {
        return r ? [ssr(D, ssrHydrationKey() + ssrAttribute("nonce", escape(r, true), false), `window.manifest = ${JSON.stringify(t.manifest)}`), ssr(w, ssrHydrationKey(), ssrAttribute("src", escape(globalThis.MANIFEST.client.inputs[globalThis.MANIFEST.client.handler].output.path, true), false))] : [ssr(D, ssrHydrationKey(), `window.manifest = ${JSON.stringify(t.manifest)}`), ssr(w, ssrHydrationKey(), ssrAttribute("src", escape(globalThis.MANIFEST.client.inputs[globalThis.MANIFEST.client.handler].output.path, true), false))];
      } });
    } })];
  } });
}
function ge(e = {}) {
  let t, r = false;
  const s = (c) => {
    if (t && t !== c) throw new Error("Context conflict");
  };
  let o;
  if (e.asyncContext) {
    const c = e.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    c ? o = new c() : console.warn("[unctx] `AsyncLocalStorage` is not provided.");
  }
  const a = () => {
    if (o) {
      const c = o.getStore();
      if (c !== void 0) return c;
    }
    return t;
  };
  return { use: () => {
    const c = a();
    if (c === void 0) throw new Error("Context is not available");
    return c;
  }, tryUse: () => a(), set: (c, n) => {
    n || s(c), t = c, r = true;
  }, unset: () => {
    t = void 0, r = false;
  }, call: (c, n) => {
    s(c), t = c;
    try {
      return o ? o.run(c, n) : n();
    } finally {
      r || (t = void 0);
    }
  }, async callAsync(c, n) {
    t = c;
    const u = () => {
      t = c;
    }, i = () => t === c ? u : void 0;
    j.add(i);
    try {
      const p = o ? o.run(c, n) : n();
      return r || (t = void 0), await p;
    } finally {
      j.delete(i);
    }
  } };
}
function Re(e = {}) {
  const t = {};
  return { get(r, s = {}) {
    return t[r] || (t[r] = ge({ ...e, ...s })), t[r];
  } };
}
const x = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof global < "u" ? global : {}, I = "__unctx__", Pe = x[I] || (x[I] = Re()), ye = (e, t = {}) => Pe.get(e, t), E = "__unctx_async_handlers__", j = x[E] || (x[E] = /* @__PURE__ */ new Set());
function xe(e) {
  let t;
  const r = _(e), s = { duplex: "half", method: e.method, headers: e.headers };
  return e.node.req.body instanceof ArrayBuffer ? new Request(r, { ...s, body: e.node.req.body }) : new Request(r, { ...s, get body() {
    return t || (t = je(e), t);
  } });
}
function Ae(e) {
  var _a;
  return (_a = e.web) != null ? _a : e.web = { request: xe(e), url: _(e) }, e.web.request;
}
function He() {
  return Ue();
}
const N = /* @__PURE__ */ Symbol("$HTTPEvent");
function ve(e) {
  return typeof e == "object" && (e instanceof H3Event || (e == null ? void 0 : e[N]) instanceof H3Event || (e == null ? void 0 : e.__is_event__) === true);
}
function l(e) {
  return function(...t) {
    var _a;
    let r = t[0];
    if (ve(r)) t[0] = r instanceof H3Event || r.__is_event__ ? r : r[N];
    else {
      if (!((_a = globalThis.app.config.server.experimental) == null ? void 0 : _a.asyncContext)) throw new Error("AsyncLocalStorage was not enabled. Use the `server.experimental.asyncContext: true` option in your app configuration to enable it. Or, pass the instance of HTTPEvent that you have as the first argument to the function.");
      if (r = He(), !r) throw new Error("No HTTPEvent found in AsyncLocalStorage. Make sure you are using the function within the server runtime.");
      t.unshift(r);
    }
    return e(...t);
  };
}
const _ = l(getRequestURL), be = l(getRequestIP), M = l(setResponseStatus), S = l(getResponseStatus), De = l(getResponseStatusText), y = l(getResponseHeaders), T$1 = l(getResponseHeader), we = l(setResponseHeader), Ie = l(appendResponseHeader), Ee = l(sendRedirect), je = l(getRequestWebStream), Me = l(removeResponseHeader), Se = l(Ae);
function Te() {
  var _a;
  return ye("nitro-app", { asyncContext: !!((_a = globalThis.app.config.server.experimental) == null ? void 0 : _a.asyncContext), AsyncLocalStorage: AsyncLocalStorage });
}
function Ue() {
  return Te().use().event;
}
const g = { NORMAL: 0, WILDCARD: 1, PLACEHOLDER: 2 };
function $e(e = {}) {
  const t = { options: e, rootNode: L(), staticRoutesMap: {} }, r = (s) => e.strictTrailingSlash ? s : s.replace(/\/$/, "") || "/";
  if (e.routes) for (const s in e.routes) U(t, r(s), e.routes[s]);
  return { ctx: t, lookup: (s) => Ce(t, r(s)), insert: (s, o) => U(t, r(s), o), remove: (s) => Ne(t, r(s)) };
}
function Ce(e, t) {
  const r = e.staticRoutesMap[t];
  if (r) return r.data;
  const s = t.split("/"), o = {};
  let a = false, c = null, n = e.rootNode, u = null;
  for (let i = 0; i < s.length; i++) {
    const p = s[i];
    n.wildcardChildNode !== null && (c = n.wildcardChildNode, u = s.slice(i).join("/"));
    const R = n.children.get(p);
    if (R === void 0) {
      if (n && n.placeholderChildren.length > 1) {
        const k = s.length - i;
        n = n.placeholderChildren.find((O) => O.maxDepth === k) || null;
      } else n = n.placeholderChildren[0] || null;
      if (!n) break;
      n.paramName && (o[n.paramName] = p), a = true;
    } else n = R;
  }
  return (n === null || n.data === null) && c !== null && (n = c, o[n.paramName || "_"] = u, a = true), n ? a ? { ...n.data, params: a ? o : void 0 } : n.data : null;
}
function U(e, t, r) {
  let s = true;
  const o = t.split("/");
  let a = e.rootNode, c = 0;
  const n = [a];
  for (const u of o) {
    let i;
    if (i = a.children.get(u)) a = i;
    else {
      const p = _e(u);
      i = L({ type: p, parent: a }), a.children.set(u, i), p === g.PLACEHOLDER ? (i.paramName = u === "*" ? `_${c++}` : u.slice(1), a.placeholderChildren.push(i), s = false) : p === g.WILDCARD && (a.wildcardChildNode = i, i.paramName = u.slice(3) || "_", s = false), n.push(i), a = i;
    }
  }
  for (const [u, i] of n.entries()) i.maxDepth = Math.max(n.length - u, i.maxDepth || 0);
  return a.data = r, s === true && (e.staticRoutesMap[t] = a), a;
}
function Ne(e, t) {
  let r = false;
  const s = t.split("/");
  let o = e.rootNode;
  for (const a of s) if (o = o.children.get(a), !o) return r;
  if (o.data) {
    const a = s.at(-1) || "";
    o.data = null, Object.keys(o.children).length === 0 && o.parent && (o.parent.children.delete(a), o.parent.wildcardChildNode = null, o.parent.placeholderChildren = []), r = true;
  }
  return r;
}
function L(e = {}) {
  return { type: e.type || g.NORMAL, maxDepth: 0, parent: e.parent || null, children: /* @__PURE__ */ new Map(), data: e.data || null, paramName: e.paramName || null, wildcardChildNode: null, placeholderChildren: [] };
}
function _e(e) {
  return e.startsWith("**") ? g.WILDCARD : e[0] === ":" || e === "*" ? g.PLACEHOLDER : g.NORMAL;
}
const q = [{ page: true, path: "/accounts/:id", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/accounts/[id].tsx" }, { page: true, path: "/accounts/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/accounts/index.tsx" }, { page: true, path: "/admin/gemini", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/admin/gemini.tsx" }, { page: true, path: "/banking/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/banking/index.tsx" }, { page: true, path: "/callback", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/callback.tsx" }, { page: true, path: "/employees/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/employees/index.tsx" }, { page: true, path: "/employees", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/employees.tsx" }, { page: true, path: "/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/index.tsx" }, { page: true, path: "/inventory/count", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/inventory/count.tsx" }, { page: true, path: "/inventory/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/inventory/index.tsx" }, { page: true, path: "/inventory/movements", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/inventory/movements.tsx" }, { page: true, path: "/inventory", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/inventory.tsx" }, { page: true, path: "/journal/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/journal/index.tsx" }, { page: true, path: "/journal/print", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/journal/print.tsx" }, { page: true, path: "/journal/templates", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/journal/templates.tsx" }, { page: true, path: "/login", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/login.tsx" }, { page: true, path: "/providers/aging", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/providers/aging.tsx" }, { page: true, path: "/providers/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/providers/index.tsx" }, { page: true, path: "/providers", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/providers.tsx" }, { page: true, path: "/reports/audit", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/reports/audit.tsx" }, { page: true, path: "/reports/balance-sheet", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/reports/balance-sheet.tsx" }, { page: true, path: "/reports/cash-flow", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/reports/cash-flow.tsx" }, { page: true, path: "/reports/income-statement", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/reports/income-statement.tsx" }, { page: true, path: "/reports/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/reports/index.tsx" }, { page: true, path: "/reports/monthly-pnl", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/reports/monthly-pnl.tsx" }, { page: true, path: "/reports/trial-balance", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/reports/trial-balance.tsx" }, { page: true, path: "/reports/year-close", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/reports/year-close.tsx" }, { page: true, path: "/reports", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/reports.tsx" }, { page: true, path: "/timesheets/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/timesheets/index.tsx" }, { page: true, path: "/timesheets/stub/:id", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/timesheets/stub/[id].tsx" }, { page: true, path: "/timesheets/w2", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/timesheets/w2.tsx" }, { page: true, path: "/timesheets", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/timesheets.tsx" }, { page: true, path: "/transactions/compras", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/transactions/compras.tsx" }, { page: true, path: "/transactions/facturacion", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/transactions/facturacion.tsx" }, { page: true, path: "/transactions/historial", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/transactions/historial.tsx" }, { page: true, path: "/transactions/", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/transactions/index.tsx" }, { page: true, path: "/transactions/invoice/:number", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/transactions/invoice/[number].tsx" }, { page: true, path: "/transactions/mermas", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/transactions/mermas.tsx" }, { page: true, path: "/transactions", filePath: "/Users/hector/Documents/AIProjects/HRMfinance/src/routes/transactions.tsx" }];
Le(q.filter((e) => e.page));
function Le(e) {
  function t(r, s, o, a) {
    const c = Object.values(r).find((n) => o.startsWith(n.id + "/"));
    return c ? (t(c.children || (c.children = []), s, o.slice(c.id.length)), r) : (r.push({ ...s, id: o, path: o.replace(/\([^)/]+\)/g, "").replace(/\/+/g, "/") }), r);
  }
  return e.sort((r, s) => r.path.length - s.path.length).reduce((r, s) => t(r, s, s.path, s.path), []);
}
function qe(e, t) {
  const r = Oe.lookup(e);
  if (r && r.route) {
    const s = r.route, o = t === "HEAD" ? s.$HEAD || s.$GET : s[`$${t}`];
    if (o === void 0) return;
    const a = s.page === true && s.$component !== void 0;
    return { handler: o, params: r.params, isPage: a };
  }
}
function ke(e) {
  return e.$HEAD || e.$GET || e.$POST || e.$PUT || e.$PATCH || e.$DELETE;
}
const Oe = $e({ routes: q.reduce((e, t) => {
  if (!ke(t)) return e;
  let r = t.path.replace(/\([^)/]+\)/g, "").replace(/\/+/g, "/").replace(/\*([^/]*)/g, (s, o) => `**:${o}`).split("/").map((s) => s.startsWith(":") || s.startsWith("*") ? s : encodeURIComponent(s)).join("/");
  if (/:[^/]*\?/g.test(r)) throw new Error(`Optional parameters are not supported in API routes: ${r}`);
  if (e[r]) throw new Error(`Duplicate API routes for "${r}" found at "${e[r].route.path}" and "${t.path}"`);
  return e[r] = { route: t }, e;
}, {}) }), H = "solidFetchEvent";
function We(e) {
  return { request: Se(e), response: Be(e), clientAddress: be(e), locals: {}, nativeEvent: e };
}
function Fe(e) {
  if (!e.context[H]) {
    const t = We(e);
    e.context[H] = t;
  }
  return e.context[H];
}
class Ge {
  constructor(t) {
    __publicField(this, "event");
    this.event = t;
  }
  get(t) {
    const r = T$1(this.event, t);
    return Array.isArray(r) ? r.join(", ") : r || null;
  }
  has(t) {
    return this.get(t) !== null;
  }
  set(t, r) {
    return we(this.event, t, r);
  }
  delete(t) {
    return Me(this.event, t);
  }
  append(t, r) {
    Ie(this.event, t, r);
  }
  getSetCookie() {
    const t = T$1(this.event, "Set-Cookie");
    return Array.isArray(t) ? t : [t];
  }
  forEach(t) {
    return Object.entries(y(this.event)).forEach(([r, s]) => t(Array.isArray(s) ? s.join(", ") : s, r, this));
  }
  entries() {
    return Object.entries(y(this.event)).map(([t, r]) => [t, Array.isArray(r) ? r.join(", ") : r])[Symbol.iterator]();
  }
  keys() {
    return Object.keys(y(this.event))[Symbol.iterator]();
  }
  values() {
    return Object.values(y(this.event)).map((t) => Array.isArray(t) ? t.join(", ") : t)[Symbol.iterator]();
  }
  [Symbol.iterator]() {
    return this.entries()[Symbol.iterator]();
  }
}
function Be(e) {
  return { get status() {
    return S(e);
  }, set status(t) {
    M(e, t);
  }, get statusText() {
    return De(e);
  }, set statusText(t) {
    M(e, S(e), t);
  }, headers: new Ge(e) };
}
const Ke = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
function ze(e) {
  return e.status && Ke.has(e.status) ? e.status : 302;
}
function Je(e, t, r = {}, s) {
  return eventHandler({ handler: (o) => {
    const a = Fe(o);
    return provideRequestEvent(a, async () => {
      const c = qe(new URL(a.request.url).pathname, a.request.method);
      if (c) {
        const i = await c.handler.import(), p = a.request.method === "HEAD" ? i.HEAD || i.GET : i[a.request.method];
        a.params = c.params || {}, sharedConfig.context = { event: a };
        const R = await p(a);
        if (R !== void 0) return R;
        if (a.request.method !== "GET") throw new Error(`API handler for ${a.request.method} "${a.request.url}" did not return a response.`);
        if (!c.isPage) return;
      }
      const n = await t(a), u = typeof r == "function" ? await r(n) : { ...r };
      u.mode, u.nonce && (n.nonce = u.nonce);
      {
        const i = renderToString(() => (sharedConfig.context.event = n, e(n)), u);
        if (n.complete = true, n.response && n.response.headers.get("Location")) {
          const p = ze(n.response);
          return Ee(o, n.response.headers.get("Location"), p);
        }
        return i;
      }
    });
  } });
}
function Ye(e, t, r) {
  return Je(e, Qe, t);
}
async function Qe(e) {
  const t = globalThis.MANIFEST.client;
  return Object.assign(e, { manifest: await t.json(), assets: [...await t.inputs[t.handler].assets()], routes: [], complete: false, $islands: /* @__PURE__ */ new Set() });
}
var Ve = ['<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="HRMfinance \u2014 contabilidad integral: plan de cuentas, diario, proveedores y clientes, inventario, n\xF3mina y conciliaci\xF3n bancaria."><meta name="theme-color" content="#0d9466"><link rel="icon" href="/favicon.ico"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet"><title>HRMfinance</title><script src="https://accounts.google.com/gsi/client" async defer><\/script>', "</head>"], Xe = ["<html", ' lang="es">', '<body><div id="app">', "</div><!--$-->", "<!--/--></body></html>"];
const nt = Ye(() => createComponent$1(me, { document: ({ assets: e, children: t, scripts: r }) => ssr(Xe, ssrHydrationKey(), createComponent$1(NoHydration, { get children() {
  return ssr(Ve, escape(e));
} }), escape(t), escape(r)) }));

const handlers = [
  { route: '', handler: _CAqWBl, lazy: false, middleware: true, method: undefined },
  { route: '/_server', handler: fu, lazy: false, middleware: true, method: undefined },
  { route: '/', handler: nt, lazy: false, middleware: true, method: undefined }
];

function createNitroApp() {
  const config = useRuntimeConfig();
  const hooks = createHooks();
  const captureError = (error, context = {}) => {
    const promise = hooks.callHookParallel("error", error, context).catch((error_) => {
      console.error("Error while capturing another error", error_);
    });
    if (context.event && isEvent(context.event)) {
      const errors = context.event.context.nitro?.errors;
      if (errors) {
        errors.push({ error, context });
      }
      if (context.event.waitUntil) {
        context.event.waitUntil(promise);
      }
    }
  };
  const h3App = createApp({
    debug: destr(false),
    onError: (error, event) => {
      captureError(error, { event, tags: ["request"] });
      return errorHandler(error, event);
    },
    onRequest: async (event) => {
      event.context.nitro = event.context.nitro || { errors: [] };
      const fetchContext = event.node.req?.__unenv__;
      if (fetchContext?._platform) {
        event.context = {
          _platform: fetchContext?._platform,
          // #3335
          ...fetchContext._platform,
          ...event.context
        };
      }
      if (!event.context.waitUntil && fetchContext?.waitUntil) {
        event.context.waitUntil = fetchContext.waitUntil;
      }
      event.fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: localFetch });
      event.$fetch = (req, init) => fetchWithEvent(event, req, init, {
        fetch: $fetch
      });
      event.waitUntil = (promise) => {
        if (!event.context.nitro._waitUntilPromises) {
          event.context.nitro._waitUntilPromises = [];
        }
        event.context.nitro._waitUntilPromises.push(promise);
        if (event.context.waitUntil) {
          event.context.waitUntil(promise);
        }
      };
      event.captureError = (error, context) => {
        captureError(error, { event, ...context });
      };
      await nitroApp$1.hooks.callHook("request", event).catch((error) => {
        captureError(error, { event, tags: ["request"] });
      });
    },
    onBeforeResponse: async (event, response) => {
      await nitroApp$1.hooks.callHook("beforeResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    },
    onAfterResponse: async (event, response) => {
      await nitroApp$1.hooks.callHook("afterResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    }
  });
  const router = createRouter({
    preemptive: true
  });
  const nodeHandler = toNodeListener(h3App);
  const localCall = (aRequest) => b$1(
    nodeHandler,
    aRequest
  );
  const localFetch = (input, init) => {
    if (!input.toString().startsWith("/")) {
      return globalThis.fetch(input, init);
    }
    return C$1(
      nodeHandler,
      input,
      init
    ).then((response) => normalizeFetchResponse(response));
  };
  const $fetch = createFetch({
    fetch: localFetch,
    Headers: Headers$1,
    defaults: { baseURL: config.app.baseURL }
  });
  globalThis.$fetch = $fetch;
  h3App.use(createRouteRulesHandler({ localFetch }));
  for (const h of handlers) {
    let handler = h.lazy ? lazyEventHandler(h.handler) : h.handler;
    if (h.middleware || !h.route) {
      const middlewareBase = (config.app.baseURL + (h.route || "/")).replace(
        /\/+/g,
        "/"
      );
      h3App.use(middlewareBase, handler);
    } else {
      const routeRules = getRouteRulesForPath(
        h.route.replace(/:\w+|\*\*/g, "_")
      );
      if (routeRules.cache) {
        handler = cachedEventHandler(handler, {
          group: "nitro/routes",
          ...routeRules.cache
        });
      }
      router.use(h.route, handler, h.method);
    }
  }
  h3App.use(config.app.baseURL, router.handler);
  {
    const _handler = h3App.handler;
    h3App.handler = (event) => {
      const ctx = { event };
      return nitroAsyncContext.callAsync(ctx, () => _handler(event));
    };
  }
  const app = {
    hooks,
    h3App,
    router,
    localCall,
    localFetch,
    captureError
  };
  return app;
}
function runNitroPlugins(nitroApp2) {
  for (const plugin of plugins) {
    try {
      plugin(nitroApp2);
    } catch (error) {
      nitroApp2.captureError(error, { tags: ["plugin"] });
      throw error;
    }
  }
}
const nitroApp$1 = createNitroApp();
function useNitroApp() {
  return nitroApp$1;
}
runNitroPlugins(nitroApp$1);

const debug = (...args) => {
};
function GracefulShutdown(server, opts) {
  opts = opts || {};
  const options = Object.assign(
    {
      signals: "SIGINT SIGTERM",
      timeout: 3e4,
      development: false,
      forceExit: true,
      onShutdown: (signal) => Promise.resolve(signal),
      preShutdown: (signal) => Promise.resolve(signal)
    },
    opts
  );
  let isShuttingDown = false;
  const connections = {};
  let connectionCounter = 0;
  const secureConnections = {};
  let secureConnectionCounter = 0;
  let failed = false;
  let finalRun = false;
  function onceFactory() {
    let called = false;
    return (emitter, events, callback) => {
      function call() {
        if (!called) {
          called = true;
          return Reflect.apply(callback, this, arguments);
        }
      }
      for (const e of events) {
        emitter.on(e, call);
      }
    };
  }
  const signals = options.signals.split(" ").map((s) => s.trim()).filter((s) => s.length > 0);
  const once = onceFactory();
  once(process, signals, (signal) => {
    debug("received shut down signal", signal);
    shutdown(signal).then(() => {
      if (options.forceExit) {
        process.exit(failed ? 1 : 0);
      }
    }).catch((error) => {
      debug("server shut down error occurred", error);
      process.exit(1);
    });
  });
  function isFunction(functionToCheck) {
    const getType = Object.prototype.toString.call(functionToCheck);
    return /^\[object\s([A-Za-z]+)?Function]$/.test(getType);
  }
  function destroy(socket, force = false) {
    if (socket._isIdle && isShuttingDown || force) {
      socket.destroy();
      if (socket.server instanceof http.Server) {
        delete connections[socket._connectionId];
      } else {
        delete secureConnections[socket._connectionId];
      }
    }
  }
  function destroyAllConnections(force = false) {
    debug("Destroy Connections : " + (force ? "forced close" : "close"));
    let counter = 0;
    let secureCounter = 0;
    for (const key of Object.keys(connections)) {
      const socket = connections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        counter++;
        destroy(socket);
      }
    }
    debug("Connections destroyed : " + counter);
    debug("Connection Counter    : " + connectionCounter);
    for (const key of Object.keys(secureConnections)) {
      const socket = secureConnections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        secureCounter++;
        destroy(socket);
      }
    }
    debug("Secure Connections destroyed : " + secureCounter);
    debug("Secure Connection Counter    : " + secureConnectionCounter);
  }
  server.on("request", (req, res) => {
    req.socket._isIdle = false;
    if (isShuttingDown && !res.headersSent) {
      res.setHeader("connection", "close");
    }
    res.on("finish", () => {
      req.socket._isIdle = true;
      destroy(req.socket);
    });
  });
  server.on("connection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = connectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      connections[id] = socket;
      socket.once("close", () => {
        delete connections[socket._connectionId];
      });
    }
  });
  server.on("secureConnection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = secureConnectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      secureConnections[id] = socket;
      socket.once("close", () => {
        delete secureConnections[socket._connectionId];
      });
    }
  });
  process.on("close", () => {
    debug("closed");
  });
  function shutdown(sig) {
    function cleanupHttp() {
      destroyAllConnections();
      debug("Close http server");
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            return reject(err);
          }
          return resolve(true);
        });
      });
    }
    debug("shutdown signal - " + sig);
    if (options.development) {
      debug("DEV-Mode - immediate forceful shutdown");
      return process.exit(0);
    }
    function finalHandler() {
      if (!finalRun) {
        finalRun = true;
        if (options.finally && isFunction(options.finally)) {
          debug("executing finally()");
          options.finally();
        }
      }
      return Promise.resolve();
    }
    function waitForReadyToShutDown(totalNumInterval) {
      debug(`waitForReadyToShutDown... ${totalNumInterval}`);
      if (totalNumInterval === 0) {
        debug(
          `Could not close connections in time (${options.timeout}ms), will forcefully shut down`
        );
        return Promise.resolve(true);
      }
      const allConnectionsClosed = Object.keys(connections).length === 0 && Object.keys(secureConnections).length === 0;
      if (allConnectionsClosed) {
        debug("All connections closed. Continue to shutting down");
        return Promise.resolve(false);
      }
      debug("Schedule the next waitForReadyToShutdown");
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(waitForReadyToShutDown(totalNumInterval - 1));
        }, 250);
      });
    }
    if (isShuttingDown) {
      return Promise.resolve();
    }
    debug("shutting down");
    return options.preShutdown(sig).then(() => {
      isShuttingDown = true;
      cleanupHttp();
    }).then(() => {
      const pollIterations = options.timeout ? Math.round(options.timeout / 250) : 0;
      return waitForReadyToShutDown(pollIterations);
    }).then((force) => {
      debug("Do onShutdown now");
      if (force) {
        destroyAllConnections(force);
      }
      return options.onShutdown(sig);
    }).then(finalHandler).catch((error) => {
      const errString = typeof error === "string" ? error : JSON.stringify(error);
      debug(errString);
      failed = true;
      throw errString;
    });
  }
  function shutdownManual() {
    return shutdown("manual");
  }
  return shutdownManual;
}

function getGracefulShutdownConfig() {
  return {
    disabled: !!process.env.NITRO_SHUTDOWN_DISABLED,
    signals: (process.env.NITRO_SHUTDOWN_SIGNALS || "SIGTERM SIGINT").split(" ").map((s) => s.trim()),
    timeout: Number.parseInt(process.env.NITRO_SHUTDOWN_TIMEOUT || "", 10) || 3e4,
    forceExit: !process.env.NITRO_SHUTDOWN_NO_FORCE_EXIT
  };
}
function setupGracefulShutdown(listener, nitroApp) {
  const shutdownConfig = getGracefulShutdownConfig();
  if (shutdownConfig.disabled) {
    return;
  }
  GracefulShutdown(listener, {
    signals: shutdownConfig.signals.join(" "),
    timeout: shutdownConfig.timeout,
    forceExit: shutdownConfig.forceExit,
    onShutdown: async () => {
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("Graceful shutdown timeout, force exiting...");
          resolve();
        }, shutdownConfig.timeout);
        nitroApp.hooks.callHook("close").catch((error) => {
          console.error(error);
        }).finally(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  });
}

const cert = process.env.NITRO_SSL_CERT;
const key = process.env.NITRO_SSL_KEY;
const nitroApp = useNitroApp();
const server = cert && key ? new Server({ key, cert }, toNodeListener(nitroApp.h3App)) : new Server$1(toNodeListener(nitroApp.h3App));
const port = destr(process.env.NITRO_PORT || process.env.PORT) || 3e3;
const host = process.env.NITRO_HOST || process.env.HOST;
const path = process.env.NITRO_UNIX_SOCKET;
const listener = server.listen(path ? { path } : { port, host }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  const protocol = cert && key ? "https" : "http";
  const addressInfo = listener.address();
  if (typeof addressInfo === "string") {
    console.log(`Listening on unix socket ${addressInfo}`);
    return;
  }
  const baseURL = (useRuntimeConfig().app.baseURL || "").replace(/\/$/, "");
  const url = `${protocol}://${addressInfo.family === "IPv6" ? `[${addressInfo.address}]` : addressInfo.address}:${addressInfo.port}${baseURL}`;
  console.log(`Listening on ${url}`);
});
trapUnhandledNodeErrors();
setupGracefulShutdown(listener, nitroApp);
const nodeServer = {};

export { au as a, nodeServer as n };
//# sourceMappingURL=nitro.mjs.map
