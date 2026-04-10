import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PlayMode,
  ActiveRun,
  EmotionalClimate,
  NarrativeTurn,
  AppSettings,
  WorldBuilderConfig,
  NPCCard,
  InventoryItem,
  CharacterDescriptors,
  RealisticAttributes,
  Faccion,
  MemoriaNarrador,
} from '../engine/types';

interface EngineState {
  playerId: string | null;
  setPlayerId: (id: string) => void;

  currentGame: string | null;
  setCurrentGame: (gameId: string | null) => void;

  playMode: PlayMode;
  setPlayMode: (mode: PlayMode) => void;

  activeRun: ActiveRun | null;
  setActiveRun: (run: ActiveRun | null) => void;
  updateActiveRun: (partial: Partial<ActiveRun>) => void;

  addNarrativeTurn: (turn: NarrativeTurn) => void;
  updateLastNarrativeTurn: (partial: Partial<NarrativeTurn>) => void;
  addInnerVoice: (thought: string) => void;
  setSuggestedActions: (actions: string[]) => void;
  setEmotionalClimate: (climate: EmotionalClimate) => void;
  addNPC: (npc: NPCCard) => void;
  updateNPC: (id: string, partial: Partial<NPCCard>) => void;
  addInventoryItem: (item: InventoryItem) => void;
  removeInventoryItem: (id: string) => void;
  addPersonalHistoryEvent: (event: { date: string; description: string; emotionalWeight: number }) => void;
  updateDescriptors: (partial: Partial<CharacterDescriptors>) => void;
  updateRealisticAttributes: (partial: Partial<RealisticAttributes>) => void;
  addFaccion: (faccion: Faccion) => void;
  updateFaccion: (id: string, partial: Partial<Faccion>) => void;
  updateMemoriaNarrador: (partial: Partial<MemoriaNarrador>) => void;
  addExploredLocation: (loc: { name: string; description: string; visitedAt: string }) => void;

  pastRuns: Array<{
    runId: string;
    gameId: string;
    summary?: string;
    character?: any;
    eraConfig?: any;
    endCause?: string;
    endedAt?: string;
    turnCount?: number;
    moments?: Array<{ imageUrl: string; date: string; context: string }>;
  }>;
  addPastRun: (run: EngineState['pastRuns'][number]) => void;

  savedWorlds: WorldBuilderConfig[];
  saveWorld: (world: WorldBuilderConfig) => void;
  deleteWorld: (id: string) => void;

  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;

  narrativeVoice: 'third_person' | 'first_person' | 'world_speaks';
  setNarrativeVoice: (v: 'third_person' | 'first_person' | 'world_speaks') => void;

  achievements: Array<{ id: string; name: string; description: string; unlockedAt: string; runId: string }>;
  unlockAchievement: (a: EngineState['achievements'][number]) => void;
}

export const useEngineStore = create<EngineState>()(
  persist(
    (set, get) => ({
      playerId: null,
      setPlayerId: (id) => set({ playerId: id }),

      currentGame: null,
      setCurrentGame: (gameId) => set({ currentGame: gameId }),

      playMode: 'HUMANO',
      setPlayMode: (mode) => set({ playMode: mode }),

      activeRun: null,
      setActiveRun: (run) => set({ activeRun: run }),
      updateActiveRun: (partial) =>
        set((state) => ({
          activeRun: state.activeRun ? { ...state.activeRun, ...partial } : null,
        })),

      addNarrativeTurn: (turn) =>
        set((state) => ({
          activeRun: state.activeRun
            ? {
                ...state.activeRun,
                narrativeHistory: [...state.activeRun.narrativeHistory, turn],
                turnCount: (state.activeRun.turnCount || 0) + 1,
              }
            : null,
        })),

      updateLastNarrativeTurn: (partial) =>
        set((state) => {
          if (!state.activeRun) return {};
          const history = [...state.activeRun.narrativeHistory];
          if (history.length === 0) return {};
          history[history.length - 1] = { ...history[history.length - 1], ...partial };
          return { activeRun: { ...state.activeRun, narrativeHistory: history } };
        }),

      addInnerVoice: (thought) =>
        set((state) => ({
          activeRun: state.activeRun
            ? {
                ...state.activeRun,
                innerVoiceLog: [...state.activeRun.innerVoiceLog.slice(-9), thought],
              }
            : null,
        })),

      setSuggestedActions: (actions) =>
        set((state) => ({
          activeRun: state.activeRun ? { ...state.activeRun, suggestedActions: actions } : null,
        })),

      setEmotionalClimate: (climate) =>
        set((state) => ({
          activeRun: state.activeRun ? { ...state.activeRun, emotionalClimate: climate } : null,
        })),

      addNPC: (npc) =>
        set((state) => ({
          activeRun: state.activeRun
            ? { ...state.activeRun, npcs: [...(state.activeRun.npcs || []), npc] }
            : null,
        })),

      updateNPC: (id, partial) =>
        set((state) => ({
          activeRun: state.activeRun
            ? {
                ...state.activeRun,
                npcs: (state.activeRun.npcs || []).map((n) =>
                  n.id === id ? { ...n, ...partial } : n
                ),
              }
            : null,
        })),

      addInventoryItem: (item) =>
        set((state) => ({
          activeRun: state.activeRun
            ? { ...state.activeRun, inventory: [...(state.activeRun.inventory || []), item] }
            : null,
        })),

      removeInventoryItem: (id) =>
        set((state) => ({
          activeRun: state.activeRun
            ? {
                ...state.activeRun,
                inventory: (state.activeRun.inventory || []).filter((i) => i.id !== id),
              }
            : null,
        })),

      addPersonalHistoryEvent: (event) =>
        set((state) => ({
          activeRun: state.activeRun
            ? {
                ...state.activeRun,
                personalHistory: [...(state.activeRun.personalHistory || []), event],
              }
            : null,
        })),

      updateDescriptors: (partial) =>
        set((state) => ({
          activeRun: state.activeRun
            ? {
                ...state.activeRun,
                descriptors: { ...state.activeRun.descriptors, ...partial },
              }
            : null,
        })),

      updateRealisticAttributes: (partial) =>
        set((state) => ({
          activeRun: state.activeRun
            ? {
                ...state.activeRun,
                realisticAttributes: { ...state.activeRun.realisticAttributes, ...partial },
              }
            : null,
        })),

      addFaccion: (faccion) =>
        set((state) => ({
          activeRun: state.activeRun
            ? { ...state.activeRun, facciones: [...(state.activeRun.facciones || []), faccion] }
            : null,
        })),

      updateFaccion: (id, partial) =>
        set((state) => ({
          activeRun: state.activeRun
            ? {
                ...state.activeRun,
                facciones: (state.activeRun.facciones || []).map((f) =>
                  f.id === id ? { ...f, ...partial } : f
                ),
              }
            : null,
        })),

      updateMemoriaNarrador: (partial) =>
        set((state) => ({
          activeRun: state.activeRun
            ? {
                ...state.activeRun,
                memoriaNarrador: { ...(state.activeRun.memoriaNarrador || { notasLibres: '', reglasDeLaPartida: '', hechosCanonicos: [] }), ...partial },
              }
            : null,
        })),

      addExploredLocation: (loc) =>
        set((state) => {
          if (!state.activeRun) return {};
          const existing = (state.activeRun.exploredLocations || []);
          if (existing.some((l) => l.name === loc.name)) return {};
          return {
            activeRun: { ...state.activeRun, exploredLocations: [...existing, loc] },
          };
        }),

      pastRuns: [],
      addPastRun: (run) =>
        set((state) => ({ pastRuns: [run, ...state.pastRuns].slice(0, 50) })),

      savedWorlds: [],
      saveWorld: (world) =>
        set((state) => ({
          savedWorlds: [world, ...state.savedWorlds.filter((w) => w.id !== world.id)],
        })),
      deleteWorld: (id) =>
        set((state) => ({ savedWorlds: state.savedWorlds.filter((w) => w.id !== id) })),

      settings: {
        explicitMode: false,
        explicitSubToggles: {
          violence: false,
          language: false,
          sexual: false,
          torture: false,
          substances: false,
          psychologicalTrauma: false,
        },
        showNpcDescriptors: false,
        otherPerspectives: false,
        defaultVoice: 'third_person',
        textSize: 'md',
        imageGenEnabled: true,
        subjectiveTime: true,
      },
      updateSettings: (partial) =>
        set((state) => ({ settings: { ...state.settings, ...partial } })),

      narrativeVoice: 'third_person',
      setNarrativeVoice: (v) => set({ narrativeVoice: v }),

      achievements: [],
      unlockAchievement: (a) =>
        set((state) => ({
          achievements: state.achievements.find((x) => x.id === a.id)
            ? state.achievements
            : [...state.achievements, a],
        })),
    }),
    {
      name: 'nexus-engine-v4',
      partialize: (state) => ({
        playerId: state.playerId,
        currentGame: state.currentGame,
        playMode: state.playMode,
        activeRun: state.activeRun,
        pastRuns: state.pastRuns,
        savedWorlds: state.savedWorlds,
        settings: state.settings,
        narrativeVoice: state.narrativeVoice,
        achievements: state.achievements,
      }),
    }
  )
);
