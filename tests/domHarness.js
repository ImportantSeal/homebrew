let freshImportCounter = 0;

function toCamelCase(value) {
  return String(value || '').replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

class FakeEvent {
  constructor(type, init = {}) {
    this.type = String(type || '');
    this.bubbles = init.bubbles !== false;
    this.cancelable = init.cancelable !== false;
    this.defaultPrevented = false;
    this.target = init.target ?? null;
    this.currentTarget = null;
    this.key = init.key;
    this.detail = init.detail;
    this.changedTouches = init.changedTouches;
    this._stopped = false;
  }

  preventDefault() {
    if (this.cancelable) this.defaultPrevented = true;
  }

  stopPropagation() {
    this._stopped = true;
  }
}

class FakeCustomEvent extends FakeEvent {
  constructor(type, init = {}) {
    super(type, init);
    this.detail = init.detail;
  }
}

class FakeEventTarget {
  constructor() {
    this._listeners = new Map();
  }

  addEventListener(type, listener, options = false) {
    if (typeof listener !== 'function') return;
    const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
    const listeners = this._listeners.get(type) || [];
    listeners.push({ listener, capture });
    this._listeners.set(type, listeners);
  }

  removeEventListener(type, listener, options = false) {
    const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
    const listeners = this._listeners.get(type) || [];
    this._listeners.set(
      type,
      listeners.filter((entry) => entry.listener !== listener || entry.capture !== capture)
    );
  }

  dispatchEvent(event) {
    const activeEvent = event instanceof FakeEvent
      ? event
      : new FakeEvent(event?.type || '', event || {});

    if (!activeEvent.target) activeEvent.target = this;
    const path = [];
    let cursor = this;

    while (cursor) {
      path.push(cursor);
      cursor = cursor.parentNode || null;
    }

    for (const currentTarget of path) {
      activeEvent.currentTarget = currentTarget;
      const listeners = currentTarget._listeners?.get(activeEvent.type) || [];
      for (const entry of [...listeners]) {
        entry.listener.call(currentTarget, activeEvent);
        if (activeEvent._stopped) break;
      }
      if (activeEvent._stopped || activeEvent.bubbles === false) break;
    }

    return !activeEvent.defaultPrevented;
  }
}

class FakeStyle {
  constructor() {
    this._props = new Map();
  }

  setProperty(name, value) {
    const safeName = String(name || '');
    const safeValue = String(value ?? '');
    this._props.set(safeName, safeValue);
    this[safeName] = safeValue;
  }

  removeProperty(name) {
    const safeName = String(name || '');
    this._props.delete(safeName);
    delete this[safeName];
  }

  getPropertyValue(name) {
    return this._props.get(String(name || '')) || '';
  }
}

class FakeClassList {
  constructor(element) {
    this.element = element;
    this._tokens = new Set();
  }

  _load(value) {
    this._tokens = new Set(String(value || '').split(/\s+/).filter(Boolean));
    this._sync();
  }

  _sync() {
    this.element._className = [...this._tokens].join(' ');
  }

  add(...tokens) {
    tokens.filter(Boolean).forEach((token) => this._tokens.add(String(token)));
    this._sync();
  }

  remove(...tokens) {
    tokens.filter(Boolean).forEach((token) => this._tokens.delete(String(token)));
    this._sync();
  }

  contains(token) {
    return this._tokens.has(String(token || ''));
  }

  toggle(token, force) {
    const safeToken = String(token || '');
    if (!safeToken) return false;

    if (force === true) {
      this._tokens.add(safeToken);
      this._sync();
      return true;
    }

    if (force === false) {
      this._tokens.delete(safeToken);
      this._sync();
      return false;
    }

    if (this._tokens.has(safeToken)) {
      this._tokens.delete(safeToken);
      this._sync();
      return false;
    }

    this._tokens.add(safeToken);
    this._sync();
    return true;
  }

  toString() {
    return [...this._tokens].join(' ');
  }
}

class FakeNode extends FakeEventTarget {
  constructor(ownerDocument = null) {
    super();
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.childNodes = [];
  }

  appendChild(node) {
    if (!node) return null;

    if (node.nodeType === 11) {
      for (const child of [...node.childNodes]) {
        this.appendChild(child);
      }
      node.childNodes = [];
      return node;
    }

    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }

    node.parentNode = this;
    if (this.ownerDocument && !node.ownerDocument) {
      node.ownerDocument = this.ownerDocument;
    }
    this.childNodes.push(node);
    return node;
  }

  removeChild(node) {
    const index = this.childNodes.indexOf(node);
    if (index >= 0) {
      this.childNodes.splice(index, 1);
      node.parentNode = null;
    }
    return node;
  }

  remove() {
    this.parentNode?.removeChild(this);
  }

  get textContent() {
    return this.childNodes.map((child) => child.textContent).join('');
  }

  set textContent(value) {
    this.childNodes = [];
    const text = String(value ?? '');
    if (!text) return;
    const textNode = this.ownerDocument?.createTextNode(text) || new FakeTextNode(text, this.ownerDocument);
    textNode.parentNode = this;
    this.childNodes.push(textNode);
  }
}

class FakeTextNode extends FakeNode {
  constructor(text = '', ownerDocument = null) {
    super(ownerDocument);
    this.nodeType = 3;
    this.data = String(text ?? '');
  }

  get textContent() {
    return this.data;
  }

  set textContent(value) {
    this.data = String(value ?? '');
  }
}

class FakeDocumentFragment extends FakeNode {
  constructor(ownerDocument = null) {
    super(ownerDocument);
    this.nodeType = 11;
  }
}

function matchesSelector(element, selector) {
  const safeSelector = String(selector || '').trim();
  if (!safeSelector) return false;

  if (safeSelector.startsWith('#')) {
    return element.id === safeSelector.slice(1);
  }

  if (safeSelector.startsWith('.')) {
    const classes = safeSelector.split('.').filter(Boolean);
    return classes.every((token) => element.classList.contains(token));
  }

  if (safeSelector.startsWith('[') && safeSelector.endsWith(']')) {
    const attrName = safeSelector.slice(1, -1);
    if (element.hasAttribute(attrName)) return true;
    if (attrName.startsWith('data-')) {
      return Object.hasOwn(element.dataset, toCamelCase(attrName.slice(5)));
    }
    return false;
  }

  return element.tagName.toLowerCase() === safeSelector.toLowerCase();
}

class FakeElement extends FakeNode {
  constructor(tagName = 'div', ownerDocument = null) {
    super(ownerDocument);
    this.nodeType = 1;
    this.tagName = String(tagName || 'div').toUpperCase();
    this.dataset = {};
    this.style = new FakeStyle();
    this.classList = new FakeClassList(this);
    this.attributes = new Map();
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.checked = false;
    this.scrollTop = 0;
    this.scrollHeight = 0;
    this._className = '';
    this._id = '';
    this._rect = {
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    };
  }

  get id() {
    return this._id;
  }

  set id(value) {
    this._id = String(value ?? '');
    if (this._id) this.attributes.set('id', this._id);
    else this.attributes.delete('id');
  }

  get className() {
    return this.classList.toString();
  }

  set className(value) {
    this.classList._load(value);
    if (this.classList.toString()) this.attributes.set('class', this.classList.toString());
    else this.attributes.delete('class');
  }

  get innerHTML() {
    return this.textContent;
  }

  set innerHTML(value) {
    this.childNodes = [];
    if (value) this.textContent = value;
  }

  setAttribute(name, value) {
    const safeName = String(name || '');
    const safeValue = String(value ?? '');

    if (safeName === 'id') {
      this.id = safeValue;
      return;
    }

    if (safeName === 'class') {
      this.className = safeValue;
      return;
    }

    this.attributes.set(safeName, safeValue);
    if (safeName.startsWith('data-')) {
      this.dataset[toCamelCase(safeName.slice(5))] = safeValue;
    }
  }

  getAttribute(name) {
    if (name === 'id') return this.id || null;
    if (name === 'class') return this.className || null;
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    if (name === 'id') return Boolean(this.id);
    if (name === 'class') return Boolean(this.className);
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    if (name === 'id') {
      this.id = '';
      return;
    }

    if (name === 'class') {
      this.className = '';
      return;
    }

    this.attributes.delete(name);
    if (name.startsWith('data-')) {
      delete this.dataset[toCamelCase(name.slice(5))];
    }
  }

  append(...nodes) {
    nodes.forEach((node) => {
      if (typeof node === 'string') {
        this.appendChild(this.ownerDocument.createTextNode(node));
      } else {
        this.appendChild(node);
      }
    });
  }

  get children() {
    return this.childNodes.filter((child) => child.nodeType === 1);
  }

  get childElementCount() {
    return this.children.length;
  }

  get firstElementChild() {
    return this.children[0] || null;
  }

  get lastElementChild() {
    const elements = this.children;
    return elements[elements.length - 1] || null;
  }

  contains(node) {
    if (!node) return false;
    if (node === this) return true;
    return this.childNodes.some((child) => child === node || child.contains?.(node));
  }

  closest(selector) {
    let cursor = this;
    while (cursor && cursor.nodeType === 1) {
      if (matchesSelector(cursor, selector)) return cursor;
      cursor = cursor.parentNode;
    }
    return null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType !== 1) continue;
        if (matchesSelector(child, selector)) matches.push(child);
        visit(child);
      }
    };

    visit(this);
    return matches;
  }

  focus() {
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }

  click() {
    this.dispatchEvent(new FakeEvent('click', { bubbles: true, cancelable: true }));
  }

  getBoundingClientRect() {
    return { ...this._rect };
  }

  setBoundingClientRect(rect = {}) {
    const width = Number(rect.width || 0);
    const height = Number(rect.height || 0);
    this._rect = {
      width,
      height,
      top: Number(rect.top || 0),
      left: Number(rect.left || 0),
      right: Number(rect.right ?? width),
      bottom: Number(rect.bottom ?? height)
    };
  }
}

class FakeDocument extends FakeEventTarget {
  constructor() {
    super();
    this.nodeType = 9;
    this.parentNode = null;
    this.defaultView = null;
    this.body = new FakeElement('body', this);
    this.body.parentNode = this;
    this.activeElement = this.body;
    this.title = '';
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  createTextNode(text) {
    return new FakeTextNode(text, this);
  }

  createDocumentFragment() {
    return new FakeDocumentFragment(this);
  }

  getElementById(id) {
    return this.querySelector(`#${id}`);
  }

  querySelector(selector) {
    if (matchesSelector(this.body, selector)) return this.body;
    return this.body.querySelector(selector);
  }

  querySelectorAll(selector) {
    const matches = [];
    if (matchesSelector(this.body, selector)) matches.push(this.body);
    return matches.concat(this.body.querySelectorAll(selector));
  }
}

class FakeWindow extends FakeEventTarget {
  constructor(document) {
    super();
    this.document = document;
    this.navigator = { userAgent: 'fake-dom-harness' };
    this.matchMedia = (query) => ({
      matches: false,
      media: String(query || ''),
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    });
  }
}

function setGlobal(name, value) {
  globalThis[name] = value;
}

function restoreGlobal(name, previousValue) {
  if (previousValue === undefined) {
    delete globalThis[name];
  } else {
    globalThis[name] = previousValue;
  }
}

export function installDom() {
  const previous = {
    document: globalThis.document,
    window: globalThis.window,
    HTMLElement: globalThis.HTMLElement,
    CustomEvent: globalThis.CustomEvent,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame
  };

  const document = new FakeDocument();
  const window = new FakeWindow(document);
  document.defaultView = window;

  const requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0);
  const cancelAnimationFrame = (id) => clearTimeout(id);

  window.requestAnimationFrame = requestAnimationFrame;
  window.cancelAnimationFrame = cancelAnimationFrame;

  setGlobal('document', document);
  setGlobal('window', window);
  setGlobal('HTMLElement', FakeElement);
  setGlobal('CustomEvent', FakeCustomEvent);
  setGlobal('requestAnimationFrame', requestAnimationFrame);
  setGlobal('cancelAnimationFrame', cancelAnimationFrame);

  return {
    document,
    window,
    cleanup() {
      restoreGlobal('document', previous.document);
      restoreGlobal('window', previous.window);
      restoreGlobal('HTMLElement', previous.HTMLElement);
      restoreGlobal('CustomEvent', previous.CustomEvent);
      restoreGlobal('requestAnimationFrame', previous.requestAnimationFrame);
      restoreGlobal('cancelAnimationFrame', previous.cancelAnimationFrame);
    },
    click(target) {
      target.dispatchEvent(new FakeEvent('click', { bubbles: true, cancelable: true }));
    },
    keydown(target, key) {
      target.dispatchEvent(new FakeEvent('keydown', { bubbles: true, cancelable: true, key }));
    },
    async flush(times = 4) {
      for (let index = 0; index < times; index += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  };
}

export async function importFresh(relativePath, metaUrl) {
  freshImportCounter += 1;
  const fileUrl = new URL(relativePath, metaUrl);
  fileUrl.searchParams.set('case', String(freshImportCounter));
  return import(fileUrl.href);
}
