const BASE = '/api';

export async function aiAssist(type: string, context: Record<string, any> = {}): Promise<any> {
  const res = await fetch(`${BASE}/assist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, context }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'AI assist failed');
  }
  return res.json();
}

export async function generateNarrative(payload: Record<string, any>): Promise<any> {
  const res = await fetch(`${BASE}/narrative/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Narrative generation failed');
  return res.json();
}

export interface NarrativeStreamResult {
  narrative: string;
  timeAdvanced: number;
  eventType: string;
  legacyWeight: number;
  shouldGenerateImage: boolean;
  mood: string | null;
  characterStatChanges: any;
  attributeUpdates: Record<string, string | null> | null;
  descriptorUpdates: Record<string, string | null> | null;
  suggestedActions: string[];
  worldStateUpdates: any;
  newNPCs: any[];
  inventoryChanges: any;
  currencyChange: number | null;
  personalHistoryEvent: string | null;
  hiddenLayer: string | null;
  scheduledConsequence: { description: string; turnsFromNow: number } | null;
}

export async function generateNarrativeStream(
  payload: Record<string, any>,
  onChunk: (text: string, fullSoFar: string) => void,
): Promise<NarrativeStreamResult> {
  const res = await fetch(`${BASE}/narrative/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Narrative stream failed');
  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;

    const sepIdx = fullText.indexOf('---META---');
    const displayText = sepIdx !== -1
      ? fullText.slice(0, sepIdx).trim()
      : fullText;

    onChunk(chunk, displayText);
  }

  const sepIdx = fullText.indexOf('---META---');
  let narrative = fullText.trim();
  let meta: any = {};

  if (sepIdx !== -1) {
    narrative = fullText.slice(0, sepIdx).trim();
    const metaPart = fullText.slice(sepIdx + 10).trim();
    try {
      const jsonMatch = metaPart.match(/\{[\s\S]*\}/);
      if (jsonMatch) meta = JSON.parse(jsonMatch[0]);
    } catch { meta = {}; }
  } else {
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.narrative) {
          narrative = parsed.narrative;
          meta = parsed;
        }
      } catch { }
    }
  }

  return {
    narrative,
    timeAdvanced: meta.timeAdvanced ?? 30,
    eventType: meta.eventType ?? 'action',
    legacyWeight: meta.legacyWeight ?? 0.3,
    shouldGenerateImage: meta.shouldGenerateImage ?? false,
    mood: meta.mood ?? null,
    characterStatChanges: meta.characterStatChanges ?? null,
    attributeUpdates: meta.attributeUpdates ?? null,
    descriptorUpdates: meta.descriptorUpdates ?? null,
    suggestedActions: meta.suggestedActions ?? [],
    worldStateUpdates: meta.worldStateUpdates ?? null,
    newNPCs: meta.newNPCs ?? [],
    inventoryChanges: meta.inventoryChanges ?? null,
    currencyChange: meta.currencyChange ?? null,
    personalHistoryEvent: meta.personalHistoryEvent ?? null,
    hiddenLayer: meta.hiddenLayer ?? null,
    scheduledConsequence: meta.scheduledConsequence ?? null,
  };
}

export async function generateDream(payload: {
  character: any;
  emotionalClimate: string;
  innerVoiceLog: string[];
  recentEvents: string[];
  era: any;
}): Promise<{ dream: string }> {
  const res = await fetch(`${BASE}/narrative/dream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return { dream: 'Un sueño que se disuelve al despertar...' };
  return res.json();
}
