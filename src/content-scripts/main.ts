import { StoredData } from '../types/storage';
import { createDefaultData, readStoredData, STORAGE_KEY } from '../utils/storage';

type ContentEditableElement = HTMLElement & { isContentEditable: true };
type ActiveField = HTMLTextAreaElement | ContentEditableElement;

let currentData: StoredData | null = null;
let activeField: ActiveField | null = null;
let ghostOverlay: HTMLDivElement | null = null;
let isComposing = false;
let currentGhostText = '';
let toastTimeout: number | null = null;
let activeFieldContentVersion = 0;

interface SelectionCache {
  field: ActiveField | null;
  endContainer: Node | null;
  endOffset: number;
  contentVersion: number;
  textBefore: string | null;
  textAfter: string | null;
}

const selectionCache: SelectionCache = {
  field: null,
  endContainer: null,
  endOffset: -1,
  contentVersion: -1,
  textBefore: null,
  textAfter: null,
};

interface SelectionContext {
  range: Range;
  cacheKeyMatches: boolean;
}

init().catch((error) => {
  console.error('[ChatGPT Complement] Initialization failed:', error);
});

async function init(): Promise<void> {
  await loadData();
  setupFieldDetection();
  console.debug('[ChatGPT Complement] Content script initialized');
}

async function loadData(): Promise<void> {
  try {
    currentData = await readStoredData();
  } catch (error) {
    console.error('[ChatGPT Complement] Failed to load data:', error);
    currentData = createDefaultData();
  }
}

function setupFieldDetection(): void {
  document.addEventListener('focusin', handleFocusIn, true);
  document.addEventListener('focusout', handleFocusOut, true);

  if (document.activeElement) {
    handleFocusIn({ target: document.activeElement } as unknown as FocusEvent);
  }
}

function handleFocusIn(event: FocusEvent): void {
  const element = event.target;

  if (isValidField(element) && isSiteEnabled()) {
    attachToField(element);
  }
}

function handleFocusOut(event: FocusEvent): void {
  if (activeField === event.target) {
    detachFromField();
  }
}

function isValidField(element: EventTarget | null): element is ActiveField {
  if (!(element instanceof HTMLElement)) return false;

  if (isTextarea(element)) {
    return !element.readOnly && !element.disabled;
  }

  return isContentEditableElement(element) && !isReadOnly(element);
}

function isTextarea(element: HTMLElement): element is HTMLTextAreaElement {
  return element.tagName === 'TEXTAREA';
}

function isContentEditableElement(element: HTMLElement): element is ContentEditableElement {
  return element.isContentEditable;
}

function isReadOnly(element: HTMLElement): boolean {
  return 'readOnly' in element && Boolean((element as HTMLTextAreaElement).readOnly);
}

function isSiteEnabled(): boolean {
  if (!currentData) return true;

  const hostname = window.location.hostname;

  if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) {
    return currentData.enabledSites.chatgpt;
  }
  if (hostname.includes('gemini.google.com')) {
    return currentData.enabledSites.gemini;
  }
  if (hostname.includes('claude.ai')) {
    return currentData.enabledSites.claude;
  }

  return true;
}

function attachToField(field: ActiveField): void {
  if (activeField && activeField !== field) {
    detachFromField();
  }

  if (activeField === field) return;

  activeField = field;
  activeFieldContentVersion = 0;
  resetSelectionCache();

  field.addEventListener('input', handleInput);
  field.addEventListener('keydown', handleKeyDown as EventListener, true);
  field.addEventListener('keyup', handleKeyUp as EventListener, true);
  field.addEventListener('mouseup', handleMouseUp);
  field.addEventListener('compositionstart', handleCompositionStart);
  field.addEventListener('compositionend', handleCompositionEnd);

  if (isTextarea(field)) {
    field.addEventListener('scroll', handleScroll);
  }

  if (isTextarea(field)) {
    createTextareaOverlay(field);
  } else {
    ghostOverlay = null;
  }

  console.debug('[ChatGPT Complement] Attached to field:', field.tagName);
}

function detachFromField(): void {
  if (!activeField) return;

  activeField.removeEventListener('input', handleInput);
  activeField.removeEventListener('keydown', handleKeyDown as EventListener, true);
  activeField.removeEventListener('keyup', handleKeyUp as EventListener, true);
  activeField.removeEventListener('mouseup', handleMouseUp);
  activeField.removeEventListener('compositionstart', handleCompositionStart);
  activeField.removeEventListener('compositionend', handleCompositionEnd);

  if (isTextarea(activeField)) {
    activeField.removeEventListener('scroll', handleScroll);
  }

  hideGhost();

  if (ghostOverlay && ghostOverlay.parentNode) {
    ghostOverlay.remove();
  }
  ghostOverlay = null;

  activeFieldContentVersion = 0;
  resetSelectionCache();
  activeField = null;
  isComposing = false;

  console.debug('[ChatGPT Complement] Detached from field');
}

function createTextareaOverlay(textarea: HTMLTextAreaElement): void {
  const overlay = document.createElement('div');
  overlay.className = 'chatgpt-complement-ghost-overlay';

  const parent = textarea.parentElement;
  if (!parent) return;

  const parentStyle = getComputedStyle(parent);

  if (parentStyle.position === 'static') {
    parent.style.position = 'relative';
  }

  const textareaStyle = getComputedStyle(textarea);
  const stylesToCopy = [
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'line-height',
    'letter-spacing',
    'text-transform',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-style',
    'white-space',
    'word-break',
    'word-wrap',
  ];

  stylesToCopy.forEach((prop) => {
    overlay.style.setProperty(prop, textareaStyle.getPropertyValue(prop));
  });

  const rect = textarea.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();

  overlay.style.position = 'absolute';
  overlay.style.top = `${rect.top - parentRect.top}px`;
  overlay.style.left = `${rect.left - parentRect.left}px`;
  overlay.style.width = `${textarea.offsetWidth}px`;
  overlay.style.height = `${textarea.offsetHeight}px`;
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '1000';
  overlay.style.overflow = 'hidden';
  overlay.style.whiteSpace = 'pre-wrap';

  parent.appendChild(overlay);
  ghostOverlay = overlay;
  syncScroll();
}

function handleInput(): void {
  if (isComposing) return;
  bumpFieldContentVersion();
  requestAnimationFrame(updateGhost);
}

function handleKeyUp(event: KeyboardEvent): void {
  if (isComposing) return;
  if (
    [
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ].includes(event.key)
  ) {
    requestAnimationFrame(updateGhost);
  }
}

function handleMouseUp(): void {
  if (isComposing) return;
  requestAnimationFrame(updateGhost);
}

function handleKeyDown(event: KeyboardEvent): void {
  if (isComposing) return;

  if (event.key === 'Tab') {
    if (currentGhostText) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      acceptCompletion();
      return;
    }
  }

  if (event.key === 'Enter' && currentGhostText) {
    hideGhost();
    return;
  }

  if (event.key === 'Escape' && currentGhostText) {
    event.preventDefault();
    event.stopPropagation();
    hideGhost();
  }
}

function handleCompositionStart(): void {
  isComposing = true;
  hideGhost();
}

function handleCompositionEnd(): void {
  isComposing = false;
  bumpFieldContentVersion();
}

function handleScroll(): void {
  if (activeField && isTextarea(activeField)) {
    syncScroll();
  } else {
    hideGhost();
  }
}

function syncScroll(): void {
  if (!ghostOverlay || !activeField || !isTextarea(activeField)) return;
  ghostOverlay.scrollTop = activeField.scrollTop;
  ghostOverlay.scrollLeft = activeField.scrollLeft;
}

function updateGhost(): void {
  if (!activeField || !currentData || isComposing) {
    hideGhost();
    return;
  }

  if (document.activeElement !== activeField) {
    hideGhost();
    return;
  }

  const { ghostText, error } = findMatchingCompletion();

  if (error) {
    showErrorToast(error);
    hideGhost();
    return;
  }

  if (ghostText) {
    showGhost(ghostText);
  } else {
    hideGhost();
  }
}

function extractTextWithNewlines(node: Node): string {
  const parts: string[] = [];
  const isBlock =
    node.nodeType === Node.ELEMENT_NODE &&
    ['DIV', 'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE'].includes(
      (node as HTMLElement).tagName
    );

  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if ((node as HTMLElement).tagName === 'BR') {
    return '\n';
  }

  const childNodes = node.childNodes;
  for (let i = 0; i < childNodes.length; i += 1) {
    parts.push(extractTextWithNewlines(childNodes[i]));
  }

  if (isBlock) {
    parts.push('\n');
  }

  return parts.join('');
}

function isNodeWithinElement(node: Node, element: ActiveField): boolean {
  return node === element || element.contains(node);
}

function getActiveRange(element: ActiveField): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!isNodeWithinElement(range.endContainer, element)) {
    return null;
  }

  return range;
}

function getSelectionContext(element: ActiveField): SelectionContext | null {
  const range = getActiveRange(element);
  if (!range) {
    invalidateSelectionCache();
    return null;
  }

  const cacheKeyMatches =
    selectionCache.field === element &&
    selectionCache.endContainer === range.endContainer &&
    selectionCache.endOffset === range.endOffset &&
    selectionCache.contentVersion === activeFieldContentVersion;

  if (!cacheKeyMatches) {
    updateSelectionCacheKey(element, range.endContainer, range.endOffset);
  }

  return { range, cacheKeyMatches };
}

function getTextBeforeCursor(element: ActiveField): string {
  if (isTextarea(element)) {
    return element.value.substring(0, element.selectionStart);
  }

  const selectionContext = getSelectionContext(element);
  if (!selectionContext) return '';
  const { range, cacheKeyMatches } = selectionContext;

  if (cacheKeyMatches && selectionCache.textBefore !== null) {
    return selectionCache.textBefore;
  }

  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);

  const fragment = preCaretRange.cloneContents();
  let text = extractTextWithNewlines(fragment);

  let shouldStrip = false;
  const endContainer = range.endContainer;
  if (endContainer.nodeType === Node.TEXT_NODE) {
    shouldStrip = true;
  } else if (endContainer.nodeType === Node.ELEMENT_NODE) {
    if (range.endOffset > 0) {
      const prevNode = endContainer.childNodes[range.endOffset - 1];
      const isPrevBlock =
        prevNode.nodeType === Node.ELEMENT_NODE &&
        (['DIV', 'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE'].includes(
          (prevNode as HTMLElement).tagName
        ) ||
          (prevNode as HTMLElement).tagName === 'BR');

      if (!isPrevBlock) {
        shouldStrip = true;
      }
    } else {
      shouldStrip = false;
    }
  }

  if (shouldStrip) {
    text = text.replace(/\n+$/, '');
  }

  selectionCache.textBefore = text;
  return text;
}

function getTextAfterCursor(element: ActiveField): string {
  if (isTextarea(element)) {
    return element.value.substring(element.selectionStart);
  }

  const selectionContext = getSelectionContext(element);
  if (!selectionContext) return '';
  const { range, cacheKeyMatches } = selectionContext;

  if (cacheKeyMatches && selectionCache.textAfter !== null) {
    return selectionCache.textAfter;
  }

  const postCaretRange = range.cloneRange();
  postCaretRange.selectNodeContents(element);
  postCaretRange.setStart(range.endContainer, range.endOffset);

  const fragment = postCaretRange.cloneContents();
  const textAfter = extractTextWithNewlines(fragment);
  selectionCache.textAfter = textAfter;
  return textAfter;
}

function findMatchingCompletion(): { ghostText: string; error: string | null } {
  if (!activeField) return { ghostText: '', error: null };
  const textToCursor = getTextBeforeCursor(activeField);

  if (!textToCursor) return { ghostText: '', error: null };

  let sameLineHasContent = false;

  if (isTextarea(activeField)) {
    const value = activeField.value;
    const start = activeField.selectionStart;
    const nextNewlineIndex = value.indexOf('\n', start);
    const sameLineRest =
      nextNewlineIndex === -1 ? value.slice(start) : value.slice(start, nextNewlineIndex);

    if (sameLineRest.length > 0) {
      sameLineHasContent = true;
    }
  } else {
    const afterText = getTextAfterCursor(activeField);
    if (afterText) {
      const newlineIndex = afterText.indexOf('\n');
      const sameLineRest = newlineIndex === -1 ? afterText : afterText.slice(0, newlineIndex);

      if (sameLineRest.length > 0) {
        sameLineHasContent = true;
      }
    }
  }

  if (sameLineHasContent) {
    return { ghostText: '', error: null };
  }

  const delimiters = ['\n', '.', ',', '?', ':', ';', '‘', '“', '!', '(', ')', '[', ']', '|'];
  let maxIndex = -1;

  for (const delimiter of delimiters) {
    const idx = textToCursor.lastIndexOf(delimiter);
    if (idx > maxIndex) maxIndex = idx;
  }

  const rawContext = textToCursor.substring(maxIndex + 1);
  const trimmedContext = rawContext.trimStart();

  if (!trimmedContext) {
    return { ghostText: '', error: null };
  }

  const hasNonAscii = Array.from(trimmedContext).some((char) => char.charCodeAt(0) > 0x7f);
  if (hasNonAscii) {
    return { ghostText: '', error: null };
  }

  if (trimmedContext.length < 5) {
    return { ghostText: '', error: null };
  }

  const phrases = currentData?.phrases ?? [];
  let bestMatch = '';

  for (const phrase of phrases) {
    if (phrase.startsWith(trimmedContext) && phrase.length > bestMatch.length) {
      bestMatch = phrase;
    }
  }

  if (bestMatch) {
    const ghostText = bestMatch.slice(trimmedContext.length);
    if (ghostText) {
      return { ghostText, error: null };
    }
  }

  return { ghostText: '', error: null };
}

function showGhost(ghostText: string): void {
  currentGhostText = ghostText;

  if (!activeField) return;
  if (isTextarea(activeField)) {
    showTextareaGhost(ghostText);
  } else {
    showContentEditableGhost(ghostText);
  }
}

function showTextareaGhost(ghostText: string): void {
  if (!ghostOverlay || !activeField || !isTextarea(activeField)) return;

  const text = activeField.value;
  const cursorPos = activeField.selectionStart;
  const beforeCursor = text.substring(0, cursorPos);

  ghostOverlay.innerHTML = '';

  const beforeSpan = document.createElement('span');
  beforeSpan.style.visibility = 'hidden';
  beforeSpan.textContent = beforeCursor;

  const ghostSpan = document.createElement('span');
  ghostSpan.className = 'chatgpt-complement-ghost-text';
  ghostSpan.textContent = ghostText;

  ghostOverlay.appendChild(beforeSpan);
  ghostOverlay.appendChild(ghostSpan);

  ghostOverlay.style.display = 'block';
}

function ensureContentEditableOverlay(): HTMLDivElement | null {
  if (!activeField) return null;

  if (ghostOverlay && ghostOverlay.parentNode === document.body) {
    return ghostOverlay;
  }

  if (ghostOverlay && ghostOverlay.parentNode && ghostOverlay.parentNode !== document.body) {
    ghostOverlay.remove();
  }

  const overlay = document.createElement('div');
  overlay.className = 'chatgpt-complement-ghost-overlay-absolute';

  const ghostSpan = document.createElement('span');
  ghostSpan.className = 'chatgpt-complement-ghost-text';
  overlay.appendChild(ghostSpan);

  document.body.appendChild(overlay);
  ghostOverlay = overlay;
  return overlay;
}

function showContentEditableGhost(ghostText: string): void {
  if (!activeField) return;
  const range = getActiveRange(activeField);
  if (!range) return;

  const fieldRect = activeField.getBoundingClientRect();

  const rects = range.getClientRects();
  let rect: DOMRect | null = null;

  if (rects.length > 0) {
    rect = rects[rects.length - 1];
  } else {
    try {
      const span = document.createElement('span');
      span.textContent = '\u200b';
      range.insertNode(span);
      rect = span.getBoundingClientRect();
      span.remove();
    } catch (error) {
      console.error('[ChatGPT Complement] Failed to place ghost text:', error);
      return;
    }
  }

  if (!rect) return;

  const overlay = ensureContentEditableOverlay();
  if (!overlay) return;

  const ghostSpan =
    overlay.querySelector<HTMLSpanElement>('.chatgpt-complement-ghost-text') ??
    (() => {
      const span = document.createElement('span');
      span.className = 'chatgpt-complement-ghost-text';
      overlay.appendChild(span);
      return span;
    })();

  ghostSpan.textContent = ghostText;

  const computedStyle = window.getComputedStyle(activeField as Element);
  const fontSize = parseFloat(computedStyle.fontSize);

  const availableWidth = fieldRect.right - rect.right;
  const availableHeight = fieldRect.bottom - rect.top;

  overlay.style.left = `${rect.right}px`;
  const baselineOffset = fontSize * 0.2;
  overlay.style.top = `${rect.top + baselineOffset}px`;

  overlay.style.fontFamily = computedStyle.fontFamily;
  overlay.style.fontSize = computedStyle.fontSize;
  overlay.style.fontWeight = computedStyle.fontWeight;
  overlay.style.letterSpacing = computedStyle.letterSpacing;
  overlay.style.color = computedStyle.color;
  overlay.style.lineHeight = '1';
  overlay.style.whiteSpace = 'pre-wrap';
  overlay.style.wordBreak = 'break-word';
  overlay.style.maxWidth = availableWidth > 0 ? `${availableWidth}px` : '';
  overlay.style.maxHeight = availableHeight > 0 ? `${availableHeight}px` : '';
  overlay.style.overflow = 'hidden';
  overlay.style.display = 'inline-block';
  overlay.style.zIndex = '2147483647';
}

function hideGhost(): void {
  currentGhostText = '';

  if (activeField && isTextarea(activeField) && ghostOverlay) {
    ghostOverlay.style.display = 'none';
    ghostOverlay.innerHTML = '';
  } else if (ghostOverlay && ghostOverlay.parentNode === document.body) {
    ghostOverlay.style.display = 'none';
    const ghostSpan = ghostOverlay.querySelector<HTMLSpanElement>('.chatgpt-complement-ghost-text');
    if (ghostSpan) {
      ghostSpan.textContent = '';
    }
  }
}

function acceptCompletion(): void {
  if (!currentGhostText || !activeField) return;

  const textToInsert = currentGhostText;

  if (isTextarea(activeField)) {
    const startPos = activeField.selectionStart;
    const endPos = activeField.selectionEnd;
    activeField.setRangeText(textToInsert, startPos, endPos, 'end');
    activeField.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    try {
      document.execCommand('insertText', false, textToInsert);
    } catch (error) {
      console.error('[ChatGPT Complement] execCommand failed:', error);
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(textToInsert));
        range.collapse(false);
      }
    }
  }

  hideGhost();
  console.debug('[ChatGPT Complement] Completion accepted');
}

function showErrorToast(message: string): void {
  const existing = document.querySelector<HTMLDivElement>('.chatgpt-complement-toast');
  if (existing) {
    if (existing.textContent === message) {
      if (toastTimeout) {
        clearTimeout(toastTimeout);
      }
      toastTimeout = window.setTimeout(() => {
        existing.classList.remove('visible');
        window.setTimeout(() => existing.remove(), 300);
      }, 3000);
      return;
    }
    existing.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'chatgpt-complement-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  void toast.offsetHeight;
  toast.classList.add('visible');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toast.classList.remove('visible');
    window.setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function bumpFieldContentVersion(): void {
  if (activeField) {
    activeFieldContentVersion += 1;
  }
  invalidateSelectionCache();
}

function resetSelectionCache(): void {
  selectionCache.field = null;
  selectionCache.endContainer = null;
  selectionCache.endOffset = -1;
  selectionCache.contentVersion = -1;
  invalidateSelectionCache();
}

function updateSelectionCacheKey(field: ActiveField, endContainer: Node, endOffset: number): void {
  selectionCache.field = field;
  selectionCache.endContainer = endContainer;
  selectionCache.endOffset = endOffset;
  selectionCache.contentVersion = activeFieldContentVersion;
  invalidateSelectionCache();
}

function invalidateSelectionCache(): void {
  selectionCache.textBefore = null;
  selectionCache.textAfter = null;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEY]) {
    loadData().catch((error) =>
      console.error('[ChatGPT Complement] Failed to refresh storage data:', error)
    );
  }
});

window.addEventListener('resize', () => {
  if (activeField && isTextarea(activeField)) {
    detachFromField();
    if (document.activeElement === activeField) {
      setTimeout(() => attachToField(activeField as ActiveField), 100);
    }
  } else {
    hideGhost();
  }
});
