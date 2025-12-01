import { StoredData } from '../types/storage';
import { readStoredData, writeStoredData } from '../utils/storage';

interface PopupElements {
  errorMessage: HTMLDivElement;
  successMessage: HTMLDivElement;
  addEntryForm: HTMLFormElement;
  phraseInput: HTMLTextAreaElement;
  entriesList: HTMLDivElement;
  emptyState: HTMLDivElement;
  chatgptToggle: HTMLButtonElement;
  geminiToggle: HTMLButtonElement;
  claudeToggle: HTMLButtonElement;
}

let elements: PopupElements | null = null;

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => console.error('Failed to initialize popup:', error));
});

async function init(): Promise<void> {
  elements = getElements();
  setupEventListeners(elements);
  await loadData(elements);
}

function getElements(): PopupElements {
  const get = <T extends HTMLElement>(id: string): T => {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Element #${id} not found`);
    }
    return el as T;
  };

  return {
    errorMessage: get<HTMLDivElement>('errorMessage'),
    successMessage: get<HTMLDivElement>('successMessage'),
    addEntryForm: get<HTMLFormElement>('addEntryForm'),
    phraseInput: get<HTMLTextAreaElement>('phrase'),
    entriesList: get<HTMLDivElement>('entriesList'),
    emptyState: get<HTMLDivElement>('emptyState'),
    chatgptToggle: get<HTMLButtonElement>('chatgptToggle'),
    geminiToggle: get<HTMLButtonElement>('geminiToggle'),
    claudeToggle: get<HTMLButtonElement>('claudeToggle'),
  };
}

function setupEventListeners(dom: PopupElements): void {
  dom.addEntryForm.addEventListener('submit', handleAddEntry);

  dom.phraseInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      dom.addEntryForm.dispatchEvent(new Event('submit'));
    }
  });

  dom.chatgptToggle.addEventListener('click', () => toggleSite('chatgpt'));
  dom.geminiToggle.addEventListener('click', () => toggleSite('gemini'));
  dom.claudeToggle.addEventListener('click', () => toggleSite('claude'));
}

async function handleAddEntry(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (!elements) return;

  const phrase = elements.phraseInput.value.trim();
  const validationError = validateEntry(phrase);
  if (validationError) {
    showError(validationError);
    return;
  }

  try {
    const data = await loadStoredData();

    if (data.phrases.length >= 300) {
      showError('You can add up to 300 phrases');
      return;
    }

    if (data.phrases.includes(phrase)) {
      showError('This phrase already exists');
      return;
    }

    const updated: StoredData = {
      ...data,
      phrases: [...data.phrases, phrase],
    };

    await writeStoredData(updated);

    elements.phraseInput.value = '';
    await loadData(elements);
    showSuccess('Phrase added');
  } catch (error) {
    console.error('Error adding entry:', error);
    showError('Failed to add phrase');
  }
}

function validateEntry(phrase: string): string | null {
  if (!phrase) {
    return 'Please enter a phrase';
  }

  if (phrase.length < 5) {
    return 'Phrase must be at least 5 characters';
  }

  if (phrase.includes('\n') || phrase.includes('\r')) {
    return 'Phrase must be a single line';
  }

  if (/[^\x20-\x7E]/.test(phrase)) {
    return 'Phrase must contain English characters only';
  }

  return null;
}

async function loadData(dom: PopupElements): Promise<void> {
  try {
    const data = await loadStoredData();

    const sortedPhrases = [...data.phrases].sort((a, b) => {
      const pa = a.toLowerCase();
      const pb = b.toLowerCase();
      if (pa < pb) return -1;
      if (pa > pb) return 1;
      return 0;
    });

    updateSiteToggle(dom, 'chatgpt', data.enabledSites.chatgpt);
    updateSiteToggle(dom, 'gemini', data.enabledSites.gemini);
    updateSiteToggle(dom, 'claude', data.enabledSites.claude);

    renderEntries(dom, sortedPhrases);
  } catch (error) {
    console.error('Error loading data:', error);
    showError('Failed to load data');
  }
}

async function loadStoredData(): Promise<StoredData> {
  return readStoredData();
}

function updateSiteToggle(
  dom: PopupElements,
  site: keyof StoredData['enabledSites'],
  enabled: boolean
): void {
  const toggle = dom[`${site}Toggle` as keyof PopupElements] as HTMLButtonElement;
  if (enabled) {
    toggle.classList.add('active');
  } else {
    toggle.classList.remove('active');
  }
}

async function toggleSite(site: keyof StoredData['enabledSites']): Promise<void> {
  try {
    const data = await loadStoredData();
    const updated: StoredData = {
      ...data,
      enabledSites: { ...data.enabledSites, [site]: !data.enabledSites[site] },
    };

    await writeStoredData(updated);

    if (elements) {
      updateSiteToggle(elements, site, updated.enabledSites[site]);
    }

    const siteNames: Record<keyof StoredData['enabledSites'], string> = {
      chatgpt: 'ChatGPT',
      gemini: 'Gemini',
      claude: 'Claude',
    };
    const status = updated.enabledSites[site] ? 'enabled' : 'disabled';
    showSuccess(`Set ${siteNames[site]} to ${status}`);
  } catch (error) {
    console.error('Error toggling site:', error);
    showError('Failed to update settings');
  }
}

function renderEntries(dom: PopupElements, phrases: string[]): void {
  const entriesList = dom.entriesList;
  const emptyState = dom.emptyState;

  if (!phrases || phrases.length === 0) {
    emptyState.classList.remove('hidden');
    entriesList.innerHTML = '';
    entriesList.appendChild(emptyState);
    return;
  }

  emptyState.classList.add('hidden');
  entriesList.innerHTML = '';
  entriesList.appendChild(emptyState);

  phrases.forEach((phrase) => {
    const entryElement = createEntryElement(phrase);
    entriesList.appendChild(entryElement);
  });
}

function createEntryElement(phrase: string): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'entry-item';

  div.innerHTML = `
    <div class="entry-content">
      <div class="phrase-text">${escapeHtml(phrase)}</div>
    </div>
    <div class="entry-actions"></div>
  `;

  const actionsContainer = div.querySelector<HTMLDivElement>('.entry-actions');
  if (!actionsContainer) return div;

  const deleteButton = document.createElement('button');
  deleteButton.className = 'btn btn-danger';
  deleteButton.textContent = 'Delete';
  deleteButton.addEventListener('click', () => deleteEntry(phrase));
  actionsContainer.appendChild(deleteButton);

  return div;
}

async function deleteEntry(phraseToDelete: string): Promise<void> {
  try {
    const data = await loadStoredData();
    const updated: StoredData = {
      ...data,
      phrases: data.phrases.filter((phrase) => phrase !== phraseToDelete),
    };

    await writeStoredData(updated);

    if (elements) {
      await loadData(elements);
    }
    showSuccess('Phrase deleted');
  } catch (error) {
    console.error('Error deleting entry:', error);
    showError('Failed to delete phrase');
  }
}

function showError(message: string): void {
  if (!elements) return;
  elements.errorMessage.textContent = message;
  elements.errorMessage.classList.remove('hidden');
  elements.successMessage.classList.add('hidden');

  window.setTimeout(() => {
    elements?.errorMessage.classList.add('hidden');
  }, 3000);
}

function showSuccess(message: string): void {
  if (!elements) return;
  elements.successMessage.textContent = message;
  elements.successMessage.classList.remove('hidden');
  elements.errorMessage.classList.add('hidden');

  window.setTimeout(() => {
    elements?.successMessage.classList.add('hidden');
  }, 2500);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
