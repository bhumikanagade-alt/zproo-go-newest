import { HI_DICTIONARY } from './hi.dictionary';
import { HI_GLOSSARY } from './hi.glossary';
import { HI_PATTERNS } from './hi.patterns';

/**
 * Runtime English → Hindi translation of everything rendered on the page.
 *
 *  - Text nodes, placeholders, titles, aria-labels, alt text, button values, <title> and the
 *    meta description are translated.
 *  - Text typed by the user (input / textarea values) is never touched.
 *  - Switching back to English restores every original string.
 *  - A MutationObserver keeps newly rendered content (route changes, API results, dialogs,
 *    validation messages, toasts…) translated as well.
 *
 * To translate a new sentence, add it to hi.dictionary.ts.
 */

const ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'aria-description', 'aria-placeholder'] as const;
const SKIP_TAGS = new Set(['TITLE', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'KBD', 'SAMP', 'IFRAME', 'CANVAS']);
const HAS_LATIN = /[A-Za-z]/;
const HAS_DEVANAGARI = /[\u0900-\u097F]/;

const cache = new Map<string, string>();
const textOriginals = new Map<Text, { original: string; translated: string }>();
const attrOriginals = new Map<Element, Map<string, { original: string; translated: string }>>();
let observer: MutationObserver | null = null;
let enabled = false;
let originalTitle: string | null = null;
let originalDescription: string | null = null;

/* ------------------------------------------------------------------ string translation ---- */

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

function tokenFallback(text: string): string | null {
  const parts = text.split(/(\s+|[,()/&–—-]+)/);
  let words = 0;
  let hits = 0;
  const out = parts.map((p) => {
    if (!/[A-Za-z]/.test(p)) return p;
    words++;
    const hi = HI_GLOSSARY[p.toLowerCase().replace(/^[^a-z]+|[^a-z-]+$/g, '')];
    if (hi) {
      hits++;
      return hi;
    }
    return p;
  });
  // Only accept when nearly all words are known; avoids half-English half-Hindi fragments.
  return words > 0 && hits / words >= 0.6 ? out.join('') : null;
}

function translateCore(text: string, depth = 0): string | null {
  const direct = HI_DICTIONARY[text];
  if (direct) return direct;

  for (const [re, tpl] of HI_PATTERNS) {
    const m = re.exec(text);
    if (m) {
      return tpl.replace(/\$(\d)/g, (_, i: string) => {
        const g = m[Number(i)] ?? '';
        // Captured fragments (names, codes) may themselves be translatable.
        return depth < 2 ? (translateCore(g, depth + 1) ?? g) : g;
      });
    }
  }

  // Trailing punctuation variants: "Name *", "Email:", "Loading…", "Book a bus."
  const tail = /^(.*?)(\s*[:*…]+|\.{3}|[.!])$/.exec(text);
  if (tail?.[1]) {
    const body = translateCore(tail[1], depth + 1);
    if (body) return body + (tail[2] === '.' ? '।' : tail[2]);
  }

  if (depth < 3) {
    // "A → B", "A · B", "A — B", "A | B"
    const seg = text.split(/(\s+[→·—|•]\s+|\s+-\s+)/);
    if (seg.length > 1) {
      let any = false;
      const joined = seg
        .map((s, i) => {
          if (i % 2 === 1) return s;
          const t = translateCore(s, depth + 1);
          if (t) any = true;
          return t ?? s;
        })
        .join('');
      if (any) return joined;
    }
    // Several sentences in one node.
    const sentences = text.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
      let any = false;
      const joined = sentences
        .map((s) => {
          const t = translateCore(s, depth + 1);
          if (t) any = true;
          return t ?? s;
        })
        .join(' ');
      if (any) return joined;
    }
    // "Pune, Maharashtra"
    if (text.includes(', ')) {
      const bits = text.split(', ');
      const tr = bits.map((b) => translateCore(b, depth + 1));
      if (tr.some(Boolean)) return bits.map((b, i) => tr[i] ?? b).join(', ');
    }
  }

  return tokenFallback(text);
}

/** Translate a (possibly whitespace-padded) English string. Returns the input if unknown. */
export function translateToHindi(input: string): string {
  if (!HAS_LATIN.test(input) || HAS_DEVANAGARI.test(input)) return input;
  const lead = /^\s*/.exec(input)?.[0] ?? '';
  const trail = /\s*$/.exec(input)?.[0] ?? '';
  const core = norm(input.replace(/&amp;/g, '&'));
  if (!core) return input;
  let hit = cache.get(core);
  if (hit === undefined) {
    hit = translateCore(core) ?? core;
    if (cache.size > 5000) cache.clear();
    cache.set(core, hit);
  }
  return hit === core ? input : lead + hit + trail;
}

/* ------------------------------------------------------------------------- DOM walking ---- */

function isSkipped(el: Element | null): boolean {
  for (let n = el; n; n = n.parentElement) {
    if (SKIP_TAGS.has(n.tagName)) return true;
    if (n.getAttribute('translate') === 'no' || n.classList.contains('notranslate')) return true;
    if (n.hasAttribute('data-no-translate')) return true;
    if ((n as HTMLElement).isContentEditable) return true;
  }
  return false;
}

function applyText(node: Text) {
  const data = node.data;
  const known = textOriginals.get(node);
  if (known && known.translated === data) return; // already ours
  if (!HAS_LATIN.test(data)) return;
  if (isSkipped(node.parentElement)) return;
  const translated = translateToHindi(data);
  if (translated === data) {
    if (known) textOriginals.delete(node);
    return;
  }
  textOriginals.set(node, { original: data, translated });
  node.data = translated;
}

function applyAttrs(el: Element) {
  if (isSkipped(el)) return;
  for (const name of ATTRS) {
    const value = el.getAttribute(name);
    if (!value) continue;
    const known = attrOriginals.get(el)?.get(name);
    if (known && known.translated === value) continue;
    const translated = translateToHindi(value);
    if (translated === value) continue;
    let map = attrOriginals.get(el);
    if (!map) attrOriginals.set(el, (map = new Map()));
    map.set(name, { original: value, translated });
    el.setAttribute(name, translated);
  }
  if (el instanceof HTMLInputElement && ['button', 'submit', 'reset'].includes(el.type) && el.value) {
    const translated = translateToHindi(el.value);
    if (translated !== el.value) el.value = translated;
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    applyText(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  if (root instanceof Element) {
    if (SKIP_TAGS.has(root.tagName)) return;
    applyAttrs(root);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) applyText(n as Text);
    else if (!SKIP_TAGS.has((n as Element).tagName)) applyAttrs(n as Element);
  }
}

let lastTitleOut: string | null = null;
let lastDescriptionOut: string | null = null;

/** <title> and meta description are managed separately because React re-writes them on every route. */
function translateHead() {
  if (document.title !== lastTitleOut) originalTitle = document.title; // new page title from the app
  if (originalTitle !== null) {
    const t = translateToHindi(originalTitle);
    lastTitleOut = t;
    if (document.title !== t) document.title = t;
  }
  const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (meta) {
    if (meta.content !== lastDescriptionOut) originalDescription = meta.content;
    if (originalDescription !== null) {
      const d = translateToHindi(originalDescription);
      lastDescriptionOut = d;
      if (meta.content !== d) meta.content = d;
    }
  }
}

function restoreAll() {
  for (const [node, v] of textOriginals) {
    if (node.isConnected && node.data === v.translated) node.data = v.original;
  }
  textOriginals.clear();
  for (const [el, map] of attrOriginals) {
    if (!el.isConnected) continue;
    for (const [name, v] of map) if (el.getAttribute(name) === v.translated) el.setAttribute(name, v.original);
  }
  attrOriginals.clear();
  if (originalTitle !== null) document.title = originalTitle;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (meta && originalDescription !== null) meta.content = originalDescription;
  originalTitle = null;
  originalDescription = null;
  lastTitleOut = null;
  lastDescriptionOut = null;
}

function prune() {
  for (const node of textOriginals.keys()) if (!node.isConnected) textOriginals.delete(node);
  for (const el of attrOriginals.keys()) if (!el.isConnected) attrOriginals.delete(el);
}

function onMutations(records: MutationRecord[]) {
  if (!enabled) return;
  // Our own writes come back as mutations; applyText/applyAttrs ignore values they produced.
  for (const r of records) {
    if (r.type === 'characterData') applyText(r.target as Text);
    else if (r.type === 'attributes') {
      if (r.attributeName !== 'content') applyAttrs(r.target as Element);
    } else r.addedNodes.forEach((n) => walk(n));
  }
  const headChanged = records.some(
    (r) =>
      r.target === document.head ||
      r.target.nodeName === 'TITLE' ||
      r.target.nodeName === 'META' ||
      r.target.parentNode?.nodeName === 'TITLE',
  );
  if (headChanged) translateHead();
  if (textOriginals.size > 4000) prune();
}

/* ---------------------------------------------------------------------------- public API -- */

export function enableHindi() {
  if (typeof document === 'undefined') return;
  enabled = true;
  document.documentElement.lang = 'hi-IN';
  walk(document.body);
  translateHead();
  if (!observer) {
    observer = new MutationObserver(onMutations);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRS, 'content'],
    });
  }
}

export function disableHindi(htmlLang = 'en-IN') {
  if (typeof document === 'undefined') return;
  enabled = false;
  observer?.disconnect();
  observer = null;
  restoreAll();
  document.documentElement.lang = htmlLang;
}
