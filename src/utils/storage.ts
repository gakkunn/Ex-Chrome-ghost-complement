import { EnabledSites, StoredData, StoredDataInput } from '../types/storage';

export const STORAGE_KEY = 'chatgpt_complement_data';
export const CURRENT_VERSION = 2;

const DEFAULT_ENABLED_SITES: EnabledSites = {
  chatgpt: true,
  gemini: true,
  claude: true,
};

export function createDefaultData(): StoredData {
  return {
    phrases: [],
    enabledSites: { ...DEFAULT_ENABLED_SITES },
    updatedAt: Date.now(),
    version: CURRENT_VERSION,
  };
}

export function normalizeStoredData(data?: StoredDataInput): StoredData {
  const phrases = data?.phrases ?? data?.entries ?? [];
  const enabledSites: EnabledSites = { ...DEFAULT_ENABLED_SITES, ...(data?.enabledSites ?? {}) };

  return {
    phrases,
    enabledSites,
    updatedAt: data?.updatedAt ?? Date.now(),
    version: data?.version ?? CURRENT_VERSION,
  };
}

export async function readStoredData(): Promise<StoredData> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as StoredDataInput | undefined;
  return normalizeStoredData(stored);
}

export async function writeStoredData(data: StoredData): Promise<void> {
  const normalized = normalizeStoredData(data);
  normalized.updatedAt = Date.now();
  normalized.version = CURRENT_VERSION;

  await chrome.storage.local.set({ [STORAGE_KEY]: normalized });
}
