export interface EnabledSites {
  chatgpt: boolean;
  gemini: boolean;
  claude: boolean;
}

export interface StoredData {
  phrases: string[];
  enabledSites: EnabledSites;
  updatedAt: number;
  version: number;
}

export type StoredDataInput = Partial<Omit<StoredData, 'enabledSites'>> & {
  enabledSites?: Partial<EnabledSites>;
  entries?: string[];
  phrases?: string[];
};
