type SearchIndexSettings = {
  embeddingsEnabled: boolean;
  embeddingIndex?: string;
  fullTextIndex: string;
};

export function antflySearchIndexes(settings: SearchIndexSettings): string[] {
  if (settings.embeddingsEnabled && settings.embeddingIndex) {
    return [settings.embeddingIndex];
  }
  return [settings.fullTextIndex];
}
