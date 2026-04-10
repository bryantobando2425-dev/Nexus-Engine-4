import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Map as MapIcon, User, Globe, Users, Settings as SettingsIcon,
  Save, X, ArrowLeft,
  ChevronDown, ChevronUp, Moon,
  Crown, Sword, Wind, Flame, Skull, Sparkles,
  Info, FastForward, Clock, Shield, Brain, Plus, Trash2,
  BookOpen, MapPin, Heart, AlertTriangle, CheckCircle, Eye
} from 'lucide-react';
import { useEngineStore } from '@/store/engine-store';
import { generateNarrativeStream, generateDream, aiAssist } from '@/lib/api';
import type { NarrativeTurn, NPCCard, RealisticAttributes, Faccion } from '@/engine/types';
import { ATTRIBUTE_TUTORIALS } from '@/engine/types';

const MINUTES_PER_YEAR = 525960;

type PanelId = 'character' | 'world' | 'map' | 'npcs' | 'facciones' | 'editor' | 'save' | 'memoria' | null;
type InputType = 'action' | 'speak' | 'observe' | 'think' | 'free';

const EMOTIONAL_COLORS: Record<string, string> = {
  sereno: '#3d8eff',
  ansioso: '#f5a623',
  de_duelo: '#5a6478',
  euforico: '#00d4a8',
  entumecido: '#2a3040',
  desesperado: '#ff4444',
  esperanzador: '#00d4a8',
  traumatizado: '#8b0000',
};

function generateId(): string {
  return 'turn-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

export default function Game() {
  const { runId } = useParams<{ runId: string }>();
  const [, setLocation] = useLocation();
  const {
    activeRun, addNarrativeTurn, updateLastNarrativeTurn,
    addInnerVoice, setSuggestedActions, setEmotionalClimate,
    updateActiveRun, updateRealisticAttributes, updateDescriptors,
    updateMemoriaNarrador, addExploredLocation,
    settings, narrativeVoice
  } = useEngineStore();

  const [inputText, setInputText] = useState('');
  const [inputType, setInputType] = useState<InputType>('free');
  const [isGenerating, setIsGenerating] = useState(false);
  const [innerVoiceInput, setInnerVoiceInput] = useState('');
  const [showInnerVoice, setShowInnerVoice] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelId>(null);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [statusBarCollapsed, setStatusBarCollapsed] = useState(false);
  const [streamedNarrative, setStreamedNarrative] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showDreamSkip, setShowDreamSkip] = useState(false);
  const skipDreamRef = useRef(false);
  const [showTimeAdvance, setShowTimeAdvance] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);

  const run = activeRun;
  const history = run?.narrativeHistory || [];
  const emotionalClimate = run?.emotionalClimate || 'sereno';
  const emotionColor = EMOTIONAL_COLORS[emotionalClimate] || '#3d8eff';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history.length, streamedNarrative]);

  useEffect(() => {
    if (run && history.length === 0) {
      handleFirstNarration();
    }
  }, [run?.runId]);

  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = 300, H = 300;
    canvas.width = W;
    canvas.height = H;

    const seedNum = run?.runId
      ? run.runId.split('').reduce((a: number, c: string) => (a * 31 + c.charCodeAt(0)) & 0xFFFF, 7) / 65536
      : 0.42;
    const s1 = seedNum * 13.7, s2 = seedNum * 7.3, s3 = seedNum * 23.1, s4 = seedNum * 41.9;

    function elevation(x: number, y: number): number {
      const nx = x / W - 0.5, ny = y / H - 0.5;
      const dist = Math.sqrt(nx * nx + ny * ny);
      const island = Math.max(0, 1 - dist * 2.2);
      const n1 = (Math.sin(nx * 6 + s1) * Math.cos(ny * 6 + s2)) * 0.5;
      const n2 = (Math.sin(nx * 13 + s3) * Math.cos(ny * 11 + s4)) * 0.25;
      const n3 = (Math.sin(nx * 27 + s1 * 2) * Math.cos(ny * 23 + s2 * 2)) * 0.125;
      return (n1 + n2 + n3) * island + island * 0.3 - 0.05;
    }

    const img = ctx.createImageData(W, H);
    const TERRAIN: Array<[number, number[]]> = [
      [-0.35, [8, 18, 55]],
      [-0.15, [20, 55, 130]],
      [0.00, [38, 90, 175]],
      [0.03, [200, 185, 140]],
      [0.12, [75, 120, 55]],
      [0.28, [45, 88, 35]],
      [0.45, [100, 85, 65]],
      [0.62, [130, 118, 108]],
      [1.00, [210, 210, 220]],
    ];
    function terrainColor(e: number): number[] {
      for (let i = 0; i < TERRAIN.length; i++) {
        if (e <= TERRAIN[i][0]) return TERRAIN[i][1];
      }
      return TERRAIN[TERRAIN.length - 1][1];
    }

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const e = elevation(x, y);
        const [r, g, b] = terrainColor(e);
        const shade = 0.85 + Math.random() * 0.15;
        const idx = (y * W + x) * 4;
        img.data[idx] = Math.min(255, r * shade);
        img.data[idx + 1] = Math.min(255, g * shade);
        img.data[idx + 2] = Math.min(255, b * shade);
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#f5a623';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#f5a623';
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(245,166,35,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 12, 0, Math.PI * 2);
    ctx.stroke();

    const LEGEND = [
      { color: '#0a1237', label: 'Océano profundo' },
      { color: '#264d82', label: 'Aguas costeras' },
      { color: '#c8b98c', label: 'Costa' },
      { color: '#4b7837', label: 'Llanuras' },
      { color: '#2d5823', label: 'Bosque' },
      { color: '#645541', label: 'Colinas' },
      { color: '#828276', label: 'Montañas' },
      { color: '#d2d2dc', label: 'Nieve' },
    ];
    ctx.font = '9px monospace';
    LEGEND.forEach((l, i) => {
      ctx.fillStyle = l.color;
      ctx.fillRect(6, 6 + i * 13, 10, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(l.label, 20, 15 + i * 13);
    });
  }, [run?.runId]);

  const handleFirstNarration = async () => {
    if (!run) return;
    setIsGenerating(true);
    setIsStreaming(true);
    setStreamedNarrative('');

    const placeholderId = generateId();
    const placeholder: NarrativeTurn = { id: placeholderId, role: 'narrator', text: '', timestamp: Date.now() };
    addNarrativeTurn(placeholder);

    try {
      const result = await generateNarrativeStream(
        {
          playerAction: '__BIRTH__',
          voice: narrativeVoice,
          tone: {
            baseRealism: (run.eraConfig?.realismoLevel || 5) / 10,
            explicitMode: settings.explicitMode,
            explicitSubToggles: settings.explicitSubToggles,
            subjectiveTime: settings.subjectiveTime,
            otherPerspectives: settings.otherPerspectives,
          },
          character: run.character,
          worldState: run.worldState,
          recentHistory: [],
          activeEchoes: [],
          currentLocation: run.worldState?.currentLocation || { name: 'Mundo', description: '' },
          inGameDateTime: run.worldState?.ingameDate || `Año ${run.eraConfig?.year || 0}`,
          era: run.eraConfig,
          gameConfig: {
            name: 'UNA VIDA',
            narrativePersonality: 'Narra una vida humana en toda su complejidad. El primer turno es el nacimiento — 3-5 párrafos atmosféricos y cinematográficos. Describe el mundo en el que nace este personaje, su familia, el entorno.',
          },
          currentTurn: 0,
        },
        (_chunk, fullSoFar) => setStreamedNarrative(fullSoFar),
      );

      updateLastNarrativeTurn({
        text: result.narrative,
        mood: result.mood || undefined,
        eventType: result.eventType,
        legacyWeight: result.legacyWeight,
      });

      if (result.suggestedActions?.length) setSuggestedActions(result.suggestedActions);
      if (result.mood) setEmotionalClimate(result.mood as any);

    } catch {
      updateLastNarrativeTurn({
        text: `El mundo se materializa. Es el año ${run.eraConfig?.year || 'desconocido'}. ${run.character?.name || 'Un ser'} llega a la existencia.`,
      });
    } finally {
      setIsGenerating(false);
      setIsStreaming(false);
      setStreamedNarrative('');
    }
  };

  const applyNarrativeResult = useCallback((result: Awaited<ReturnType<typeof generateNarrativeStream>>, currentRun: typeof run) => {
    if (!currentRun) return;

    const timeAdvanced = result.timeAdvanced ?? 30;
    const newTotal = (currentRun.totalMinutesElapsed || 0) + timeAdvanced;
    const yearsElapsed = Math.floor(newTotal / MINUTES_PER_YEAR);
    const startYear = currentRun.eraConfig?.year || 0;
    const newIngameYear = startYear + yearsElapsed;
    const birthYear = currentRun.character?.birthYear || startYear;
    const newAge = Math.max(0, newIngameYear - birthYear);

    const newWorldState = {
      ...(currentRun.worldState || {}),
      ingameYear: newIngameYear,
      ingameAge: newAge,
      ingameDate: `Año ${newIngameYear}`,
      ...(result.worldStateUpdates ? {
        ...(result.worldStateUpdates.currentLocation ? { currentLocation: result.worldStateUpdates.currentLocation } : {}),
        ...(result.worldStateUpdates.season ? { season: result.worldStateUpdates.season } : {}),
        ...(result.worldStateUpdates.weather ? { weather: result.worldStateUpdates.weather } : {}),
        ...(result.worldStateUpdates.timeOfDay ? { timeOfDay: result.worldStateUpdates.timeOfDay } : {}),
        ...(result.worldStateUpdates.politicalClimate ? { politicalClimate: result.worldStateUpdates.politicalClimate } : {}),
      } : {}),
    };

    let newStats = { ...(currentRun.character?.stats || { health: 100, energy: 100, hunger: 50, morale: 70, mentalHealth: 80 }) };
    if (result.characterStatChanges) {
      const c = result.characterStatChanges;
      if (c.health != null) newStats.health = Math.max(0, Math.min(100, (newStats.health || 100) + c.health));
      if (c.energy != null) newStats.energy = Math.max(0, Math.min(100, (newStats.energy || 100) + c.energy));
      if (c.hunger != null) newStats.hunger = Math.max(0, Math.min(100, (newStats.hunger || 50) + c.hunger));
      if (c.morale != null) newStats.morale = Math.max(0, Math.min(100, (newStats.morale || 70) + c.morale));
      if (c.mentalHealth != null) newStats.mentalHealth = Math.max(0, Math.min(100, (newStats.mentalHealth || 80) + c.mentalHealth));
    }

    let newInventory = [...(currentRun.inventory || [])];
    if (result.inventoryChanges?.add) {
      result.inventoryChanges.add.forEach((item: any) => {
        newInventory.push({ id: 'item-' + Date.now() + Math.random(), name: item.name, description: item.description || '', condition: item.condition || 'nuevo', isSpecial: item.isSpecial });
      });
    }
    if (result.inventoryChanges?.remove) {
      result.inventoryChanges.remove.forEach((name: string) => {
        newInventory = newInventory.filter((i) => i.name !== name);
      });
    }

    const newCurrency = result.currencyChange
      ? { ...currentRun.currency, amount: (currentRun.currency?.amount || 0) + result.currencyChange }
      : currentRun.currency;

    let newNPCs = [...(currentRun.npcs || [])];
    if (result.newNPCs?.length) {
      result.newNPCs.forEach((npcData: any) => {
        const exists = newNPCs.some((n) => n.name?.toLowerCase() === npcData.name?.toLowerCase());
        if (!exists && npcData.name) {
          newNPCs.push({
            id: 'npc-' + Date.now() + Math.random(),
            name: npcData.name,
            estimatedAge: npcData.estimatedAge,
            occupation: npcData.occupation,
            relationship: npcData.relationship,
            status: npcData.status || 'vivo',
          } as NPCCard);
        }
      });
    }

    let newPersonalHistory = [...(currentRun.personalHistory || [])];
    if (result.personalHistoryEvent) {
      newPersonalHistory.push({ date: `Año ${newIngameYear}`, description: result.personalHistoryEvent, emotionalWeight: result.legacyWeight });
    }

    let newConsequenceQueue = (currentRun.consequenceQueue || [])
      .map((c) => ({ ...c, scheduledTurn: c.scheduledTurn - 1 }))
      .filter((c) => c.scheduledTurn > -3);
    if ((result as any).scheduledConsequence?.description) {
      newConsequenceQueue.push({
        description: (result as any).scheduledConsequence.description,
        scheduledTurn: (result as any).scheduledConsequence.turnsFromNow || 7,
        sourceAction: 'narrative',
      });
    }

    updateActiveRun({
      totalMinutesElapsed: newTotal,
      character: { ...currentRun.character, age: newAge, stats: newStats },
      worldState: newWorldState as any,
      inventory: newInventory,
      currency: newCurrency,
      npcs: newNPCs,
      personalHistory: newPersonalHistory,
      consequenceQueue: newConsequenceQueue,
    });

    if (result.attributeUpdates) {
      const au = result.attributeUpdates;
      const filtered: Partial<RealisticAttributes> = {};
      Object.entries(au).forEach(([k, v]) => {
        if (v != null) (filtered as any)[k] = v;
      });
      if (Object.keys(filtered).length > 0) updateRealisticAttributes(filtered);
    }

    if (result.worldStateUpdates?.currentLocation?.name) {
      addExploredLocation({
        name: result.worldStateUpdates.currentLocation.name,
        description: result.worldStateUpdates.currentLocation.description || '',
        visitedAt: `Año ${newIngameYear}`,
      });
    }

    if (result.descriptorUpdates) {
      const du = result.descriptorUpdates;
      const filtered: Record<string, string> = {};
      Object.entries(du).forEach(([k, v]) => {
        if (v != null) filtered[k] = v as string;
      });
      if (Object.keys(filtered).length > 0) updateDescriptors(filtered as any);
    }
  }, [updateActiveRun, updateRealisticAttributes, updateDescriptors, addExploredLocation]);

  const handleSendAction = async (overrideText?: string) => {
    const text = (overrideText || inputText).trim();
    if (!text || isGenerating || !run) return;
    if (!overrideText) setInputText('');
    setIsGenerating(true);
    setIsStreaming(true);
    setStreamedNarrative('');

    const charAge = run.character?.age ?? 0;

    if (inputType === 'think' && !overrideText) {
      addInnerVoice(text);
      setIsGenerating(false);
      setIsStreaming(false);
      const thoughtTurn: NarrativeTurn = { id: generateId(), role: 'narrator', text: `[Pensamiento íntimo: "${text}"]`, timestamp: Date.now() };
      addNarrativeTurn(thoughtTurn);
      return;
    }

    let actionText = text;
    if (inputType === 'speak') actionText = `[DIÁLOGO] "${text}"`;
    else if (inputType === 'observe') actionText = `[OBSERVO] ${text}`;

    const userTurn: NarrativeTurn = { id: generateId(), role: 'user', text, inputType, timestamp: Date.now() };
    addNarrativeTurn(userTurn);
    addNarrativeTurn({ id: generateId(), role: 'narrator', text: '', timestamp: Date.now() });

    try {
      const dueConsequences = (run.consequenceQueue || []).filter((c) => c.scheduledTurn <= 0);
      const result = await generateNarrativeStream(
        {
          playerAction: actionText,
          voice: narrativeVoice,
          tone: {
            baseRealism: (run.eraConfig?.realismoLevel || 5) / 10,
            explicitMode: settings.explicitMode,
            explicitSubToggles: settings.explicitSubToggles,
            currentMood: emotionalClimate,
            subjectiveTime: settings.subjectiveTime,
            otherPerspectives: settings.otherPerspectives,
          },
          character: run.character,
          worldState: run.worldState,
          recentHistory: history.slice(-15).map((h) => ({ narrativeSnapshot: h.text, timestampIngame: h.ingameDate })),
          activeEchoes: [],
          currentLocation: run.worldState?.currentLocation || {},
          inGameDateTime: run.worldState?.ingameDate || `Año ${run.eraConfig?.year || 0}`,
          era: run.eraConfig,
          gameConfig: { name: 'UNA VIDA' },
          innerVoiceContext: run.innerVoiceLog?.slice(-3).join(' | '),
          consequenceQueue: dueConsequences,
          existingNPCs: run.npcs,
          currentTurn: run.turnCount || 0,
          realisticAttributes: run.realisticAttributes,
          descriptors: run.descriptors,
          memoriaNarrador: run.memoriaNarrador,
        },
        (_chunk, fullSoFar) => setStreamedNarrative(fullSoFar),
      );

      updateLastNarrativeTurn({
        text: result.narrative,
        mood: result.mood || undefined,
        eventType: result.eventType,
        legacyWeight: result.legacyWeight,
      });

      if (result.mood) setEmotionalClimate(result.mood as any);
      if (result.suggestedActions?.length) setSuggestedActions(result.suggestedActions);

      applyNarrativeResult(result, run);

      if (result.eventType === 'rest') {
        setIsStreaming(false);
        setStreamedNarrative('');
        await triggerDream(run, result.narrative);
      }

    } catch {
      updateLastNarrativeTurn({ text: 'El universo no respondió. Inténtalo de nuevo.' });
    } finally {
      setIsGenerating(false);
      setIsStreaming(false);
      setStreamedNarrative('');
    }
  };

  const triggerDream = async (currentRun: typeof run, recentNarrative: string) => {
    if (!currentRun) return;
    skipDreamRef.current = false;
    setShowDreamSkip(true);
    try {
      const dreamResult = await generateDream({
        character: currentRun.character,
        emotionalClimate: currentRun.emotionalClimate,
        innerVoiceLog: currentRun.innerVoiceLog || [],
        recentEvents: history.slice(-5).map((h) => h.text).filter(Boolean),
        era: currentRun.eraConfig,
      });
      if (!skipDreamRef.current) {
        const dreamTurn: NarrativeTurn = {
          id: generateId(),
          role: 'dream',
          text: dreamResult.dream,
          timestamp: Date.now(),
        };
        addNarrativeTurn(dreamTurn);
      }
    } catch {
    } finally {
      setShowDreamSkip(false);
      skipDreamRef.current = false;
    }
  };

  const handleAutoAdvance = () => {
    const autoAction = '__AUTO_INFANT__';
    handleSendAction(autoAction);
  };

  const handleInnerVoice = () => {
    if (!innerVoiceInput.trim()) return;
    addInnerVoice(innerVoiceInput.trim());
    setInnerVoiceInput('');
    setShowInnerVoice(false);
  };

  const handleSuggestedAction = (action: string) => {
    const charAge = run?.character?.age ?? 0;
    if (charAge < 5) {
      handleSendAction(action);
    } else {
      setInputText(action);
      inputRef.current?.focus();
    }
  };

  const handleTimeAdvance = async (years: number) => {
    if (isGenerating || !run) return;
    setShowTimeAdvance(false);
    setIsGenerating(true);
    setIsStreaming(true);
    setStreamedNarrative('');

    const userTurn: NarrativeTurn = { id: generateId(), role: 'user', text: `⏩ Avanzar ${years} año${years !== 1 ? 's' : ''}`, timestamp: Date.now() };
    addNarrativeTurn(userTurn);
    addNarrativeTurn({ id: generateId(), role: 'narrator', text: '', timestamp: Date.now() });

    try {
      const result = await generateNarrativeStream(
        {
          playerAction: `__TIME_JUMP_${years}_YEARS__`,
          voice: narrativeVoice,
          tone: {
            baseRealism: (run.eraConfig?.realismoLevel || 5) / 10,
            explicitMode: settings.explicitMode,
            explicitSubToggles: settings.explicitSubToggles,
            currentMood: emotionalClimate,
            subjectiveTime: settings.subjectiveTime,
            otherPerspectives: settings.otherPerspectives,
          },
          character: run.character,
          worldState: run.worldState,
          recentHistory: history.slice(-10).map((h) => ({ narrativeSnapshot: h.text, timestampIngame: h.ingameDate })),
          activeEchoes: [],
          currentLocation: run.worldState?.currentLocation || {},
          inGameDateTime: run.worldState?.ingameDate || `Año ${run.eraConfig?.year || 0}`,
          era: run.eraConfig,
          gameConfig: { name: 'UNA VIDA' },
          innerVoiceContext: run.innerVoiceLog?.slice(-3).join(' | '),
          consequenceQueue: [],
          existingNPCs: run.npcs,
          currentTurn: run.turnCount || 0,
          realisticAttributes: run.realisticAttributes,
          descriptors: run.descriptors,
          memoriaNarrador: run.memoriaNarrador,
          isTimeJump: true,
          timeJumpYears: years,
        },
        (_chunk, fullSoFar) => setStreamedNarrative(fullSoFar),
      );

      updateLastNarrativeTurn({
        text: result.narrative,
        mood: result.mood || undefined,
        eventType: 'time_jump',
        legacyWeight: result.legacyWeight,
      });

      if (result.mood) setEmotionalClimate(result.mood as any);
      if (result.suggestedActions?.length) setSuggestedActions(result.suggestedActions);
      applyNarrativeResult(result, run);

    } catch {
      updateLastNarrativeTurn({ text: 'El tiempo resistió el salto. Intenta de nuevo.' });
    } finally {
      setIsGenerating(false);
      setIsStreaming(false);
      setStreamedNarrative('');
    }
  };

  const charAge = run?.character?.age ?? 0;
  const isInfant = charAge < 2;
  const isToddler = charAge >= 2 && charAge < 5;
  const isChild = charAge >= 5 && charAge < 13;

  const textSizeClass = settings.textSize === 'sm' ? 'text-sm' : settings.textSize === 'lg' ? 'text-xl' : 'text-base md:text-lg';
  const character = run?.character;
  const stats = character?.stats || { health: 100, energy: 100, hunger: 50, morale: 70, mentalHealth: 80 };

  if (!run) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a0c0f] text-[#5a6478]">
        <div className="font-mono text-sm mb-4">Sin partida activa</div>
        <button onClick={() => setLocation('/')} className="font-mono text-xs text-[#3d8eff] hover:underline">← Volver al inicio</button>
      </div>
    );
  }

  if (run.playMode === 'DIOS') {
    return (
      <GodModeGame
        run={run}
        isGenerating={isGenerating}
        streamedNarrative={streamedNarrative}
        history={history}
        textSizeClass={textSizeClass}
        onSendAction={handleSendAction}
        onExit={() => setShowConfirmExit(true)}
        onConfirmExit={() => setLocation('/')}
        onCancelExit={() => setShowConfirmExit(false)}
        showConfirmExit={showConfirmExit}
        isStreaming={isStreaming}
      />
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#0a0c0f] overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: `inset 0 0 0 1px ${emotionColor}10` }} />

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col relative max-w-3xl mx-auto w-full">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2530]/50 bg-[#0a0c0f]/90 backdrop-blur-sm">
            <button onClick={() => setShowConfirmExit(true)} className="flex items-center gap-2 text-[#5a6478] hover:text-[#eef2f8] transition-colors">
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="font-mono text-xs text-[#5a6478]">{run.worldState?.ingameDate || `Año ${run.eraConfig?.year}`}</div>
                <div className="font-mono text-[10px] text-[#3d8eff]/70">{run.eraConfig?.eraLabel || ''}</div>
              </div>
              <button
                onClick={() => setShowTimeAdvance(true)}
                disabled={isGenerating}
                title="Avanzar el tiempo"
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[#f5a623]/30 text-[#f5a623] hover:bg-[#f5a62310] transition-all disabled:opacity-30"
              >
                <FastForward size={11} />
                <span className="font-mono text-[9px]">AVANZAR</span>
              </button>
            </div>
            <div className="text-right">
              <div className="font-serif text-sm text-[#eef2f8]">{character?.name || 'Desconocido'}</div>
              <div className="font-mono text-[10px] text-[#5a6478]">{character?.age ? `${character.age} años` : ''}</div>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto pb-48"
            style={{ borderLeft: `2px solid ${emotionColor}15`, borderRight: `2px solid ${emotionColor}15` }}
          >
            <div className="px-4 md:px-8 py-8 space-y-10 max-w-2xl mx-auto">
              <AnimatePresence initial={false}>
                {history.map((turn, i) => (
                  <motion.div
                    key={turn.id}
                    initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  >
                    {turn.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="max-w-xs px-4 py-2.5 bg-[#0f1218] border border-[#1e2530] rounded-xl font-mono text-sm text-[#5a6478]">
                          <span className="text-[#3d8eff]/50 mr-1">›</span>
                          {turn.text}
                        </div>
                      </div>
                    ) : turn.role === 'narrator' ? (
                      <div className="space-y-6">
                        {turn.role === 'narrator' && settings.otherPerspectives && turn.text.startsWith('[PERSPECTIVA:') ? (
                          <div className="border-l-2 border-[#f5a623]/40 pl-4 py-1">
                            <div className="font-mono text-[10px] text-[#f5a623]/60 mb-2 tracking-widest">PERSPECTIVA EXTERNA</div>
                            <p className={`font-serif ${textSizeClass} leading-relaxed text-[#c8d0dc]/80 italic`}>{turn.text.replace(/^\[PERSPECTIVA:[^\]]+\]/, '')}</p>
                          </div>
                        ) : (
                          <p className={`font-serif ${textSizeClass} leading-relaxed text-[#c8d0dc]`} style={{ textShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
                            {i === history.length - 1 && isStreaming ? (
                              streamedNarrative ? (
                                <>
                                  {streamedNarrative}
                                  <span className="inline-block w-0.5 h-4 bg-[#3d8eff] ml-0.5 animate-pulse" />
                                </>
                              ) : (
                                <span className="inline-flex gap-1 mt-2">
                                  <span className="w-1.5 h-1.5 bg-[#3d8eff] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <span className="w-1.5 h-1.5 bg-[#3d8eff] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <span className="w-1.5 h-1.5 bg-[#3d8eff] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </span>
                              )
                            ) : turn.text}
                          </p>
                        )}
                        {turn.imageUrl && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5, duration: 1 }}
                            className="w-full rounded-xl overflow-hidden border border-[#1e2530]"
                          >
                            <img src={turn.imageUrl} alt="Momento" className="w-full h-auto object-cover" />
                          </motion.div>
                        )}
                        {!turn.imageUrl && isGenerating && i === history.length - 1 && (
                          <div className="w-full h-1 bg-[#141820] rounded overflow-hidden">
                            <motion.div
                              animate={{ x: ['-100%', '100%'] }}
                              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                              className="h-full w-1/3 bg-gradient-to-r from-transparent via-[#3d8eff]/20 to-transparent"
                            />
                          </div>
                        )}
                      </div>
                    ) : turn.role === 'dream' ? (
                      <div className="border border-[#5a6478]/20 rounded-xl p-6 bg-[#0f1218]/50">
                        <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-3">✦ SUEÑO</div>
                        <p className={`font-serif ${textSizeClass} leading-relaxed text-[#5a6478] italic`}>{turn.text}</p>
                      </div>
                    ) : null}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0c0f] via-[#0a0c0f]/95 to-transparent pt-16 pb-4 px-4">

            {showDreamSkip && (
              <div className="flex items-center justify-center mb-3 max-w-2xl mx-auto">
                <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0f1218]/95 border border-[#5a6478]/20 rounded-full backdrop-blur-sm">
                  <Moon size={12} className="text-[#8b5cf6] animate-pulse" />
                  <span className="font-mono text-[10px] text-[#5a6478]">Entrando en el sueño...</span>
                  <span className="w-px h-3 bg-[#1e2530]" />
                  <button
                    onClick={() => { skipDreamRef.current = true; setShowDreamSkip(false); }}
                    className="font-mono text-[10px] text-[#5a6478] hover:text-[#eef2f8] transition-colors tracking-widest"
                  >
                    SALTAR SUEÑO ›
                  </button>
                </div>
              </div>
            )}

            {run.suggestedActions && run.suggestedActions.length > 0 && !isGenerating && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 max-w-2xl mx-auto no-scrollbar">
                {run.suggestedActions.slice(0, isInfant || isToddler ? 6 : 4).map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestedAction(action)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg font-mono text-xs border border-[#1e2530] text-[#5a6478] hover:text-[#eef2f8] hover:border-[#3d8eff]/30 bg-[#0f1218]/80 backdrop-blur-sm transition-all whitespace-nowrap"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}

            {isInfant && (
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-3">
                  <span className="font-mono text-[10px] text-[#5a6478]/60 tracking-widest">NARRACIÓN AUTOMÁTICA · {charAge === 0 ? 'RECIÉN NACIDO' : `${charAge} AÑO`}</span>
                </div>
                <button
                  onClick={handleAutoAdvance}
                  disabled={isGenerating}
                  className="w-full h-14 rounded-xl font-mono text-sm border transition-all active:scale-95 disabled:opacity-50"
                  style={{ borderColor: emotionColor + '30', color: emotionColor, background: emotionColor + '08' }}
                >
                  {isGenerating ? 'El mundo avanza...' : 'Continuar narración'}
                </button>
              </div>
            )}

            {isToddler && (
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-2">
                  <span className="font-mono text-[10px] text-[#5a6478]/60 tracking-widest">{charAge} AÑOS · ELIGE UNA ACCIÓN</span>
                </div>
                <button
                  onClick={handleAutoAdvance}
                  disabled={isGenerating}
                  className="w-full h-11 rounded-xl font-mono text-xs border transition-all active:scale-95 disabled:opacity-50 mb-2"
                  style={{ borderColor: '#1e2530', color: '#5a6478' }}
                >
                  {isGenerating ? '...' : 'El tiempo pasa...'}
                </button>
              </div>
            )}

            {!isInfant && !isToddler && (
              <>
                <AnimatePresence>
                  {showInnerVoice && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mb-3 max-w-2xl mx-auto"
                    >
                      <div className="flex gap-2 p-3 bg-[#0f1218] border border-[#5a6478]/30 rounded-xl">
                        <input
                          className="flex-1 bg-transparent font-serif text-sm text-[#5a6478] focus:outline-none placeholder:text-[#2a3040]"
                          value={innerVoiceInput}
                          onChange={(e) => setInnerVoiceInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleInnerVoice(); }}
                          placeholder="Voz interior..."
                          autoFocus
                        />
                        <button onClick={handleInnerVoice} className="font-mono text-xs text-[#5a6478] hover:text-[#eef2f8] transition-colors">↵</button>
                        <button onClick={() => setShowInnerVoice(false)} className="text-[#5a6478] hover:text-[#eef2f8]"><X size={12} /></button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isChild && (
                  <div className="flex gap-2 mb-3 max-w-2xl mx-auto">
                    {([
                      { id: 'free', label: 'Libre' },
                      { id: 'speak', label: 'Hablar' },
                      { id: 'action', label: 'Acción' },
                      { id: 'observe', label: 'Observar' },
                    ] as { id: InputType; label: string }[]).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setInputType(t.id)}
                        className="px-3 py-1.5 rounded-lg font-mono text-[10px] border transition-all"
                        style={{
                          borderColor: inputType === t.id ? emotionColor + '50' : '#1e2530',
                          color: inputType === t.id ? emotionColor : '#5a6478',
                          background: inputType === t.id ? emotionColor + '10' : 'transparent',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowInnerVoice(!showInnerVoice)}
                      className="px-3 py-1.5 rounded-lg font-mono text-[10px] border transition-all ml-auto"
                      style={{ borderColor: showInnerVoice ? '#5a647850' : '#1e2530', color: '#5a6478' }}
                    >
                      Pensar
                    </button>
                  </div>
                )}

                {isChild && (
                  <div className="flex items-center justify-between mb-2 max-w-2xl mx-auto">
                    <span className="font-mono text-[10px] text-[#5a6478]/60 tracking-widest">{charAge} AÑOS</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowTimeAdvance(true)}
                        disabled={isGenerating}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-[9px] border border-[#f5a623]/30 text-[#f5a623] hover:bg-[#f5a623]/10 transition-all disabled:opacity-30"
                      >
                        <FastForward size={9} /> Etapa
                      </button>
                      <button
                        onClick={() => setShowInnerVoice(!showInnerVoice)}
                        className="px-3 py-1.5 rounded-lg font-mono text-[10px] border border-[#1e2530] text-[#5a6478]"
                      >
                        Pensar
                      </button>
                    </div>
                  </div>
                )}

                <div className="max-w-2xl mx-auto relative">
                  <input
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendAction(); } }}
                    placeholder={
                      isChild ? '¿Qué haces?' :
                      inputType === 'speak' ? '"¿Qué dices?"' :
                      inputType === 'observe' ? '¿Qué examinas?' :
                      '¿Qué haces?'
                    }
                    disabled={isGenerating}
                    className="w-full h-14 pl-5 pr-14 bg-[#0f1218]/90 backdrop-blur border border-[#1e2530] rounded-xl font-serif text-base text-[#eef2f8] placeholder:text-[#2a3040] focus:outline-none transition-all disabled:opacity-50"
                    style={{ borderColor: isGenerating ? emotionColor + '30' : '#1e2530' }}
                  />
                  <button
                    onClick={() => handleSendAction()}
                    disabled={isGenerating || !inputText.trim()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
                    style={{ background: isGenerating ? 'transparent' : emotionColor + '20', color: emotionColor }}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="w-14 flex flex-col border-l border-[#1e2530]/50 bg-[#0a0c0f] py-4">
          {([
            { id: 'character', icon: User, label: 'PERSONAJE' },
            { id: 'world', icon: Globe, label: 'MUNDO' },
            { id: 'map', icon: MapIcon, label: 'MAPA' },
            { id: 'npcs', icon: Users, label: 'NPCs' },
            { id: 'facciones', icon: Shield, label: 'FACCIONES' },
            { id: 'editor', icon: SettingsIcon, label: 'EDITOR' },
            { id: 'save', icon: Save, label: 'GUARDADO' },
            { id: 'memoria', icon: Brain, label: 'MEMORIA IA' },
          ] as { id: PanelId; icon: any; label: string }[]).map((p) => (
            <button
              key={p.id as string}
              onClick={() => setActivePanel(activePanel === p.id ? null : p.id)}
              title={p.label}
              className="flex flex-col items-center gap-0.5 justify-center py-2.5 transition-all relative"
              style={{ color: activePanel === p.id ? emotionColor : '#5a6478' }}
            >
              <p.icon size={15} />
              {activePanel === p.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full" style={{ background: emotionColor }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {!statusBarCollapsed && (
        <motion.div
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          className="border-t border-[#1e2530]/50 bg-[#0a0c0f]/90 backdrop-blur-sm px-4 py-2"
        >
          <div className="flex items-center gap-6 max-w-3xl mx-auto">
            <div className="flex gap-4 flex-1">
              <MiniBar label="SALUD" value={stats.health} color="#00d4a8" />
              <MiniBar label="ENERGÍA" value={stats.energy} color="#3d8eff" />
              <MiniBar label="HAMBRE" value={stats.hunger} color="#f5a623" />
              <MiniBar label="MORAL" value={stats.morale} color="#eef2f8" />
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-[#5a6478]">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: emotionColor }} />
              {emotionalClimate.replace('_', ' ').toUpperCase()}
            </div>
            <button onClick={() => setStatusBarCollapsed(true)} className="text-[#5a6478] hover:text-[#eef2f8]">
              <ChevronDown size={12} />
            </button>
          </div>
        </motion.div>
      )}
      {statusBarCollapsed && (
        <button
          onClick={() => setStatusBarCollapsed(false)}
          className="border-t border-[#1e2530]/50 w-full py-1 flex justify-center text-[#5a6478] hover:text-[#eef2f8] transition-colors"
        >
          <ChevronUp size={12} />
        </button>
      )}

      <AnimatePresence>
        {activePanel && (
          <motion.div
            key={activePanel}
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 left-0 right-0 md:left-auto md:right-14 md:w-96 z-40 bg-[#0a0c0f]/97 backdrop-blur-xl border-l border-[#1e2530] flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2530]">
              <span className="font-mono text-xs text-[#5a6478] tracking-widest uppercase">
                {({ character: 'PERSONAJE', world: 'MUNDO', map: 'MAPA', npcs: 'PERSONAS', facciones: 'FACCIONES', editor: 'EDITOR', save: 'GUARDADO', memoria: 'MEMORIA IA' } as Record<string,string>)[activePanel] || activePanel}
              </span>
              <button onClick={() => setActivePanel(null)} className="text-[#5a6478] hover:text-[#eef2f8] transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {activePanel === 'character' && <CharacterPanel run={run} />}
              {activePanel === 'world' && <WorldPanel run={run} />}
              {activePanel === 'map' && <MapPanel canvasRef={mapCanvasRef} run={run} />}
              {activePanel === 'npcs' && <NPCsPanel run={run} />}
              {activePanel === 'facciones' && <FactionsPanel run={run} />}
              {activePanel === 'editor' && <EditorPanel run={run} />}
              {activePanel === 'save' && <SavePanel run={run} onClose={() => setActivePanel(null)} />}
              {activePanel === 'memoria' && <MemoriaPanel run={run} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTimeAdvance && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowTimeAdvance(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0f1218] border border-[#1e2530] rounded-2xl p-8 max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-[#f5a623]" />
                <h3 className="font-display font-bold text-xl">Avanzar en el tiempo</h3>
              </div>
              <p className="font-serif italic text-[#5a6478] mb-1 text-sm">
                El narrador comprimirá el tiempo saltado en una narrativa cinematográfica.
              </p>
              <p className="font-mono text-[10px] text-[#f5a623]/70 mb-6">
                MÍNIMO 600 PALABRAS · ACTUALIZA ATRIBUTOS Y REPUTACIÓN
              </p>
              <div className="space-y-2 mb-6">
                {([
                  { label: '1 año', years: 1, desc: 'Un año de vida ordinaria' },
                  { label: '3 años', years: 3, desc: 'Un ciclo de vida significativo' },
                  { label: '5 años', years: 5, desc: 'Media década de cambios' },
                  { label: '10 años', years: 10, desc: 'Una década completa' },
                  { label: '15 años', years: 15, desc: 'Una generación menor' },
                  { label: '20 años', years: 20, desc: 'Dos décadas de existencia' },
                  charAge < 18 ? { label: `Hasta adulto (${18 - charAge} años)`, years: Math.max(1, 18 - charAge), desc: 'Llegar a la mayoría de edad' } : null,
                  charAge < 30 ? { label: `Hasta los 30 (${30 - charAge} años)`, years: Math.max(1, 30 - charAge), desc: 'Plena madurez adulta' } : null,
                ] as any[]).filter(Boolean).slice(0, 6).map((opt: any) => (
                  <button
                    key={opt.years}
                    onClick={() => handleTimeAdvance(opt.years)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#1e2530] hover:border-[#f5a623]/30 hover:bg-[#f5a623]/5 transition-all group"
                  >
                    <div className="text-left">
                      <div className="font-mono text-sm text-[#eef2f8] group-hover:text-[#f5a623] transition-colors">{opt.label}</div>
                      <div className="font-serif text-xs text-[#5a6478] italic">{opt.desc}</div>
                    </div>
                    <FastForward size={14} className="text-[#5a6478] group-hover:text-[#f5a623] transition-colors" />
                  </button>
                ))}
              </div>
              <button onClick={() => setShowTimeAdvance(false)} className="w-full py-2 rounded-xl font-mono text-sm border border-[#1e2530] text-[#5a6478] hover:text-[#eef2f8] transition-all">
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirmExit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#0f1218] border border-[#1e2530] rounded-2xl p-8 max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display font-bold text-xl mb-2">¿Pausar y salir?</h3>
              <p className="font-serif italic text-[#5a6478] mb-6 text-sm">Tu progreso se guardará localmente. Puedes continuar desde el inicio.</p>
              <div className="flex gap-3">
                <button onClick={() => setLocation('/')} className="flex-1 py-3 rounded-xl font-mono text-sm border border-[#1e2530] text-[#5a6478] hover:text-[#eef2f8] transition-all">
                  Salir
                </button>
                <button onClick={() => setShowConfirmExit(false)} className="flex-1 py-3 rounded-xl font-mono text-sm border border-[#3d8eff]/30 text-[#3d8eff] hover:bg-[#3d8eff]/10 transition-all">
                  Continuar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="font-mono text-[9px] text-[#5a6478] flex-shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-[#141820] rounded-full overflow-hidden min-w-[40px]">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
      </div>
    </div>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-3 border-b border-[#1e2530] pb-1">{title}</div>
      {children}
    </div>
  );
}

function AttributeRow({ label, value, tutorialKey }: { label: string; value: string; tutorialKey: keyof typeof ATTRIBUTE_TUTORIALS }) {
  const [open, setOpen] = useState(false);
  const info = ATTRIBUTE_TUTORIALS[tutorialKey];
  return (
    <div className="p-2 rounded-lg bg-[#141820] border border-[#1e2530]">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[10px] text-[#5a6478]">{label}</span>
        <button onClick={() => setOpen(!open)} className="text-[#5a6478] hover:text-[#3d8eff] transition-colors">
          <Info size={10} />
        </button>
      </div>
      <div className="font-serif text-sm text-[#eef2f8]">{value || '—'}</div>
      {open && (
        <div className="mt-2 p-2 rounded bg-[#0f1218] border border-[#3d8eff]/20">
          <p className="font-serif text-[10px] italic text-[#5a6478] leading-relaxed">{info?.tutorial}</p>
        </div>
      )}
    </div>
  );
}

function CharacterPanel({ run }: { run: any }) {
  const char = run?.character || {};
  const desc = char.appearance || {};
  const attrs: any = run?.realisticAttributes || {};
  const descriptors: any = run?.descriptors || {};
  const tabs = ['Identidad', 'Atributos', 'Descriptores', 'Inventario', 'Habilidades', 'Relaciones', 'Historia', 'Salud', 'Psicología', 'Legado'];
  const [tab, setTab] = useState(0);

  return (
    <div>
      <div className="flex gap-1 flex-wrap mb-4">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className="px-2 py-1 rounded font-mono text-[9px] transition-all"
            style={{ background: tab === i ? '#3d8eff20' : '#14182050', color: tab === i ? '#3d8eff' : '#5a6478', border: `1px solid ${tab === i ? '#3d8eff30' : '#1e2530'}` }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="space-y-3">
          <InfoRow label="Nombre" value={char.name} />
          <InfoRow label="Género" value={char.gender} />
          <InfoRow label="Clase social" value={char.socialClass} />
          <InfoRow label="Año nacimiento" value={char.birthYear} />
          <InfoRow label="Edad actual" value={char.age !== undefined ? `${char.age} años` : '—'} />
          <InfoRow label="Tez" value={desc.skin} />
          <InfoRow label="Cabello" value={desc.hair} />
          <InfoRow label="Ojos" value={desc.eyes} />
          <InfoRow label="Complexión" value={desc.build} />
          {desc.features && desc.features.length > 0 && (
            <div>
              <div className="font-mono text-[10px] text-[#5a6478] mb-1">RASGOS DISTINTIVOS</div>
              <div className="flex flex-wrap gap-1">{desc.features.map((f: string) => <span key={f} className="px-2 py-0.5 rounded-full bg-[#141820] border border-[#1e2530] font-mono text-[9px] text-[#c8d0dc]">{f}</span>)}</div>
            </div>
          )}
          {desc.freeDescription && <InfoRow label="Descripción" value={desc.freeDescription} />}
        </div>
      )}

      {tab === 1 && (
        <div className="space-y-4">
          <div>
            <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-2 border-b border-[#1e2530] pb-1">DIMENSIONES VITALES <span className="text-[#f5a623]">— Estado dinámico</span></div>
            <div className="space-y-2">
              <AttributeRow tutorialKey="integridadFisica" label="Integridad Física" value={attrs.integridadFisica} />
              <AttributeRow tutorialKey="reservaMetabolica" label="Reserva Metabólica" value={attrs.reservaMetabolica} />
              <AttributeRow tutorialKey="cargaCognitiva" label="Carga Cognitiva" value={attrs.cargaCognitiva} />
              <AttributeRow tutorialKey="umbralDeEstres" label="Umbral de Estrés" value={attrs.umbralDeEstres} />
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-2 border-b border-[#1e2530] pb-1">PERFIL DE COMPETENCIA <span className="text-[#3d8eff]">— Capacidades base</span></div>
            <div className="space-y-2">
              <AttributeRow tutorialKey="aptitudMotriz" label="Aptitud Motriz" value={attrs.aptitudMotriz} />
              <AttributeRow tutorialKey="intelectoAplicado" label="Intelecto Aplicado" value={attrs.intelectoAplicado} />
              <AttributeRow tutorialKey="presenciaSocial" label="Presencia Social" value={attrs.presenciaSocial} />
              <AttributeRow tutorialKey="estatusDeCasta" label="Estatus de Casta/Clase" value={attrs.estatusDeCasta} />
            </div>
          </div>
          {(attrs.eraSkills || []).length > 0 && (
            <div>
              <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-2 border-b border-[#1e2530] pb-1">HABILIDADES DE ERA <span className="text-[#00d4a8]">— Especialización</span></div>
              <div className="space-y-1">
                {(attrs.eraSkills as any[]).map((s: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded bg-[#141820] border border-[#1e2530]">
                    <div>
                      <span className="font-mono text-xs text-[#c8d0dc]">{s.name}</span>
                      <span className="font-mono text-[9px] text-[#5a6478] ml-2">{s.category}</span>
                    </div>
                    <span className="font-mono text-[10px]" style={{ color: s.grade === 'Maestro' ? '#f5a623' : s.grade === 'Competente' ? '#00d4a8' : s.grade === 'Aprendiz' ? '#3d8eff' : '#5a6478' }}>{s.grade}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 2 && (
        <div className="space-y-3">
          <div>
            <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-2 border-b border-[#1e2530] pb-1">REPUTACIÓN Y POSICIONAMIENTO</div>
            <div className="space-y-2">
              <div className="p-2 rounded-lg bg-[#141820] border border-[#1e2530]">
                <div className="font-mono text-[10px] text-[#5a6478] mb-1">CONDICIÓN SOCIAL</div>
                <div className="font-serif text-sm text-[#c8d0dc]">{descriptors.condicionSocial || char.socialClass || '—'}</div>
              </div>
              <div className="p-2 rounded-lg bg-[#141820] border border-[#1e2530]">
                <div className="font-mono text-[10px] text-[#5a6478] mb-1">REPUTACIÓN LOCAL</div>
                <div className="font-serif text-sm text-[#c8d0dc]">{descriptors.reputacionLocal || '—'}</div>
                <div className="font-mono text-[9px] text-[#5a6478]/60 mt-1">Percepción en el entorno inmediato</div>
              </div>
              <div className="p-2 rounded-lg bg-[#141820] border border-[#f5a623]/20">
                <div className="font-mono text-[10px] text-[#f5a623]/70 mb-1">RENOMBRE GLOBAL</div>
                <div className="font-serif text-sm text-[#c8d0dc]">{descriptors.renombreGlobal || '—'}</div>
                <div className="font-mono text-[9px] text-[#5a6478]/60 mt-1">Fama más allá del entorno local</div>
              </div>
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-2 border-b border-[#1e2530] pb-1">ESTADO GENERAL</div>
            <div className="space-y-2">
              <InfoRow label="Estado Físico" value={descriptors.estadoFisico} />
              <InfoRow label="Condición Mental" value={descriptors.condicionMental} />
              <InfoRow label="Combate" value={descriptors.combate} />
              <InfoRow label="Habilidades Sociales" value={descriptors.habilidadesSociales} />
              <InfoRow label="Conocimiento" value={descriptors.conocimiento} />
            </div>
          </div>
          {(descriptors.relacionesActivas || []).length > 0 && (
            <div>
              <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-2 border-b border-[#1e2530] pb-1">RELACIONES ACTIVAS</div>
              <div className="flex flex-wrap gap-1">
                {(descriptors.relacionesActivas as string[]).map((r: string, i: number) => (
                  <span key={i} className="px-2 py-1 rounded-full bg-[#141820] border border-[#1e2530] font-serif text-xs text-[#c8d0dc]">{r}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 3 && (
        <div className="space-y-2">
          {(run?.inventory || []).length === 0 ? (
            <p className="font-serif italic text-[#5a6478] text-sm">Sin objetos.</p>
          ) : (
            (run.inventory as any[]).map((item: any) => (
              <div key={item.id} className="p-3 rounded-lg border border-[#1e2530] bg-[#141820]">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-sm text-[#eef2f8]">{item.name}</span>
                  <span className="font-mono text-[10px] text-[#5a6478]">{item.condition}</span>
                </div>
                {item.description && <p className="font-serif text-xs text-[#5a6478] mt-1">{item.description}</p>}
              </div>
            ))
          )}
          <div className="mt-4 p-3 rounded-lg border border-[#1e2530] bg-[#141820]">
            <div className="font-mono text-[10px] text-[#5a6478] mb-1">MONEDAS</div>
            <div className="font-mono text-sm text-[#f5a623]">{run?.currency?.amount ?? 0} {run?.currency?.name || 'monedas'}</div>
            {run?.currency?.context && <div className="font-serif text-xs text-[#5a6478] mt-1 italic">{run.currency.context}</div>}
          </div>
        </div>
      )}

      {tab === 4 && (
        <div className="space-y-2">
          {(char.skills || []).length === 0 ? <p className="font-serif italic text-[#5a6478] text-sm">Sin habilidades definidas.</p> : (
            (char.skills as string[]).map((s: string) => <div key={s} className="px-3 py-2 rounded-lg bg-[#141820] border border-[#1e2530] font-mono text-xs text-[#c8d0dc]">{s}</div>)
          )}
          {(attrs.eraSkills || []).length > 0 && (
            <>
              <div className="font-mono text-[10px] text-[#3d8eff] tracking-widest mt-4 mb-2">GRADO DE AUTONOMÍA</div>
              {(attrs.eraSkills as any[]).map((s: any, i: number) => (
                <div key={i} className="flex justify-between items-center px-3 py-2 rounded-lg bg-[#141820] border border-[#1e2530]">
                  <span className="font-mono text-xs text-[#c8d0dc]">{s.name}</span>
                  <span className="font-mono text-[10px]" style={{ color: s.grade === 'Maestro' ? '#f5a623' : s.grade === 'Competente' ? '#00d4a8' : '#3d8eff' }}>{s.grade}</span>
                </div>
              ))}
            </>
          )}
          {(char.limitations || []).length > 0 && (
            <>
              <div className="font-mono text-[10px] text-[#ff4444] tracking-widest mt-4 mb-2">LIMITACIONES</div>
              {(char.limitations as string[]).map((l: string) => <div key={l} className="px-3 py-2 rounded-lg bg-[#ff444410] border border-[#ff4444]/20 font-mono text-xs text-[#ff4444]">{l}</div>)}
            </>
          )}
        </div>
      )}

      {tab === 5 && (
        <div className="space-y-2">
          {(char.initialRelationships || []).length === 0 ? (
            <p className="font-serif italic text-[#5a6478] text-sm">Sin relaciones registradas.</p>
          ) : (
            (char.initialRelationships as any[]).map((r: any, i: number) => (
              <div key={i} className="p-3 rounded-lg border border-[#1e2530] bg-[#141820]">
                <div className="flex justify-between items-start">
                  <span className="font-serif text-sm text-[#eef2f8]">{r.name}</span>
                  <span className="font-mono text-[10px] text-[#3d8eff]">{r.type}</span>
                </div>
                {r.description && <p className="font-serif text-xs text-[#5a6478] mt-1">{r.description}</p>}
              </div>
            ))
          )}
          {(run?.npcs || []).length > 0 && (
            <>
              <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mt-4 mb-2">NPCS CONOCIDOS</div>
              {(run.npcs as any[]).map((npc: any) => (
                <div key={npc.id} className="p-3 rounded-lg border border-[#1e2530] bg-[#141820]">
                  <div className="flex justify-between items-start">
                    <span className="font-serif text-sm text-[#eef2f8]">{npc.name || 'Desconocido'}</span>
                    <span className="font-mono text-[10px]" style={{ color: npc.status === 'muerto' ? '#ff4444' : '#00d4a8' }}>{npc.status}</span>
                  </div>
                  {npc.relationship && <p className="font-mono text-[10px] text-[#3d8eff] mt-1">{npc.relationship.type}</p>}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 6 && (
        <div className="space-y-2">
          {(run?.personalHistory || []).length === 0 ? (
            <p className="font-serif italic text-[#5a6478] text-sm">El historial se construye con cada acción.</p>
          ) : (
            (run.personalHistory as any[]).map((e: any, i: number) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg border border-[#1e2530] bg-[#141820]">
                <div className="font-mono text-[10px] text-[#3d8eff] flex-shrink-0">{e.date}</div>
                <p className="font-serif text-xs text-[#c8d0dc]">{e.description}</p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 7 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(run?.character?.stats || {}).map(([k, v]) => (
              <div key={k} className="p-3 rounded-lg border border-[#1e2530] bg-[#141820]">
                <div className="font-mono text-[10px] text-[#5a6478] mb-1">{k.toUpperCase()}</div>
                <div className="h-1.5 bg-[#0a0c0f] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00d4a8] rounded-full transition-all" style={{ width: `${v as number}%` }} />
                </div>
                <div className="font-mono text-xs text-[#eef2f8] mt-1">{v as number}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 8 && (
        <div className="space-y-3">
          <PanelSection title="CLIMA EMOCIONAL">
            <div className="font-serif text-base text-[#c8d0dc] capitalize">{run?.emotionalClimate?.replace('_', ' ') || 'Sereno'}</div>
          </PanelSection>
          <PanelSection title="VOZ INTERIOR">
            {(run?.innerVoiceLog || []).length === 0 ? (
              <p className="font-serif italic text-[#5a6478] text-xs">Usa "Pensar" para registrar pensamientos.</p>
            ) : (
              <div className="space-y-2">
                {(run.innerVoiceLog as string[]).map((t: string, i: number) => (
                  <div key={i} className="font-serif text-xs italic text-[#5a6478] border-l border-[#5a6478]/20 pl-3">"{t}"</div>
                ))}
              </div>
            )}
          </PanelSection>
          {char.personality && (
            <PanelSection title="RASGOS DE PERSONALIDAD">
              <div className="flex flex-wrap gap-1 mb-2">
                {(char.personality.positive || []).map((t: string) => (
                  <span key={t} className="px-2 py-0.5 rounded-full bg-[#00d4a8]/10 border border-[#00d4a8]/20 font-mono text-[9px] text-[#00d4a8]">{t}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {(char.personality.negative || []).map((t: string) => (
                  <span key={t} className="px-2 py-0.5 rounded-full bg-[#ff4444]/10 border border-[#ff4444]/20 font-mono text-[9px] text-[#ff4444]">{t}</span>
                ))}
              </div>
            </PanelSection>
          )}
        </div>
      )}

      {tab === 9 && (
        <div className="space-y-3">
          <PanelSection title="CONSECUENCIAS PENDIENTES">
            {(run?.consequenceQueue || []).length === 0 ? (
              <p className="font-serif italic text-[#5a6478] text-xs">Sin consecuencias pendientes. Cada decisión deja su huella.</p>
            ) : (
              (run.consequenceQueue as any[]).map((c: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border border-[#f5a623]/20 bg-[#f5a623]/5">
                  <p className="font-serif text-xs text-[#c8d0dc]">{c.description}</p>
                  <div className="font-mono text-[10px] text-[#f5a623]/70 mt-1">Se manifiesta en {c.scheduledTurn > 0 ? `${c.scheduledTurn} turno${c.scheduledTurn !== 1 ? 's' : ''}` : 'este turno'}</div>
                </div>
              ))
            )}
          </PanelSection>
          <PanelSection title="MOMENTOS SIGNIFICATIVOS">
            {(run?.moments || []).length === 0 ? (
              <p className="font-serif italic text-[#5a6478] text-xs">Los momentos de alto impacto quedarán registrados aquí.</p>
            ) : (
              (run.moments as any[]).map((m: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border border-[#1e2530] bg-[#141820]">
                  {m.imageUrl && <img src={m.imageUrl} alt="Momento" className="w-full h-auto rounded mb-2" />}
                  <div className="font-mono text-[10px] text-[#3d8eff]">{m.date}</div>
                  <p className="font-serif text-xs text-[#c8d0dc] mt-1">{m.context}</p>
                </div>
              ))
            )}
          </PanelSection>
        </div>
      )}
    </div>
  );
}

function WorldPanel({ run }: { run: any }) {
  const era = run?.eraConfig || {};
  const world = run?.worldState || {};
  const loc = world.currentLocation || {};
  const explored = run?.exploredLocations || [];
  const ERA_RULES: Record<string, string> = {
    magic: 'Magia', technology: 'Tecnología', feudalism: 'Feudalismo',
    colonialism: 'Colonialismo', industrialism: 'Industrialismo', modernism: 'Modernismo',
    postApocalyptic: 'Pos-apocalíptico',
  };
  const SEASON_ICONS: Record<string, string> = { primavera: '🌸', verano: '☀️', otoño: '🍂', invierno: '❄️' };
  const WEATHER_ICONS: Record<string, string> = { soleado: '☀️', nublado: '☁️', lluvioso: '🌧️', tormentoso: '⛈️', nevado: '❄️', brumoso: '🌫️' };
  const TIME_ICONS: Record<string, string> = { mañana: '🌅', mediodía: '🌞', tarde: '🌆', noche: '🌙', madrugada: '⭐' };

  const seasonKey = (world.season || '').toLowerCase();
  const weatherKey = (world.weather || '').toLowerCase();
  const timeKey = (world.timeOfDay || '').toLowerCase();

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-[#0f1218] border border-[#1e2530] space-y-2">
        <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-2">TIEMPO Y LUGAR</div>
        <InfoRow label="Año" value={world.ingameYear ? `Año ${world.ingameYear}` : undefined} />
        <InfoRow label="Era" value={era.eraLabel} />
        <div className="flex justify-between items-start gap-4">
          <span className="font-mono text-[10px] text-[#5a6478] flex-shrink-0">ESTACIÓN</span>
          <span className="font-serif text-xs text-[#c8d0dc]">{SEASON_ICONS[seasonKey] || ''} {world.season || '—'}</span>
        </div>
        <div className="flex justify-between items-start gap-4">
          <span className="font-mono text-[10px] text-[#5a6478] flex-shrink-0">CLIMA</span>
          <span className="font-serif text-xs text-[#c8d0dc]">{WEATHER_ICONS[weatherKey] || ''} {world.weather || '—'}</span>
        </div>
        <div className="flex justify-between items-start gap-4">
          <span className="font-mono text-[10px] text-[#5a6478] flex-shrink-0">HORA</span>
          <span className="font-serif text-xs text-[#c8d0dc]">{TIME_ICONS[timeKey] || ''} {world.timeOfDay || '—'}</span>
        </div>
      </div>

      {loc.name && (
        <div className="p-3 rounded-xl bg-[#3d8eff08] border border-[#3d8eff]/20">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={10} className="text-[#3d8eff]" />
            <div className="font-mono text-[10px] text-[#3d8eff] tracking-widest">LOCALIZACIÓN ACTUAL</div>
          </div>
          <div className="font-serif text-sm text-[#eef2f8] mb-1">{loc.name}</div>
          {loc.description && <p className="font-serif text-xs italic text-[#5a6478] leading-relaxed">{loc.description}</p>}
          {loc.type && <div className="mt-2 inline-block px-2 py-0.5 rounded-full bg-[#3d8eff10] border border-[#3d8eff]/20 font-mono text-[9px] text-[#3d8eff]/70">{loc.type.toUpperCase()}</div>}
        </div>
      )}

      {world.politicalClimate && (
        <div className="p-3 rounded-xl bg-[#0f1218] border border-[#1e2530]">
          <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-1">CLIMA POLÍTICO</div>
          <p className="font-serif text-xs text-[#c8d0dc] leading-relaxed">{world.politicalClimate}</p>
        </div>
      )}

      {(world.activeConflicts || []).length > 0 && (
        <div className="p-3 rounded-xl bg-[#ff444410] border border-[#ff4444]/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={10} className="text-[#ff4444]" />
            <div className="font-mono text-[10px] text-[#ff4444] tracking-widest">CONFLICTOS ACTIVOS</div>
          </div>
          {(world.activeConflicts as string[]).map((c: string, i: number) => (
            <div key={i} className="font-serif text-xs text-[#ff4444]/80 mb-1 pl-1 border-l border-[#ff4444]/30">• {c}</div>
          ))}
        </div>
      )}

      {explored.length > 0 && (
        <div>
          <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-2">LUGARES EXPLORADOS ({explored.length})</div>
          <div className="space-y-1">
            {explored.map((l: any, i: number) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-[#0f1218] border border-[#1e2530]/50">
                <CheckCircle size={9} className="text-[#00d4a8] flex-shrink-0" />
                <span className="font-serif text-xs text-[#c8d0dc]">{l.name}</span>
                {l.visitedAt && <span className="ml-auto font-mono text-[8px] text-[#5a6478]">{l.visitedAt}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.entries(era.rules || {}).some(([_, v]) => v) && (
        <div className="p-3 rounded-xl bg-[#0f1218] border border-[#1e2530]">
          <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-2">REGLAS DE ERA</div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(era.rules || {}).filter(([_, v]) => v).map(([k]) => (
              <span key={k} className="px-2 py-0.5 rounded-full bg-[#f5a62310] border border-[#f5a623]/20 font-mono text-[9px] text-[#f5a623]">
                {ERA_RULES[k] || k}
              </span>
            ))}
          </div>
        </div>
      )}

      {era.worldNotes && (
        <div className="p-3 rounded-xl bg-[#0f1218] border border-[#1e2530]">
          <div className="font-mono text-[10px] text-[#5a6478] mb-1 tracking-widest">NOTAS DEL MUNDO</div>
          <p className="font-serif text-xs italic text-[#5a6478] leading-relaxed">{era.worldNotes}</p>
        </div>
      )}
    </div>
  );
}

function MapPanel({ canvasRef, run }: { canvasRef: React.RefObject<HTMLCanvasElement | null>; run: any }) {
  const explored = run?.exploredLocations || [];
  const world = run?.worldState || {};
  const loc = world.currentLocation || {};

  const TERRAIN_LEGEND = [
    { color: '#1a3a6b', label: 'Océano profundo' },
    { color: '#2a5298', label: 'Mar/Lago' },
    { color: '#3d7a3d', label: 'Bosque' },
    { color: '#5a8f5a', label: 'Llanura' },
    { color: '#8b7355', label: 'Montaña' },
    { color: '#c4a882', label: 'Desierto' },
    { color: '#f5a623', label: 'Tu posición' },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden border border-[#1e2530]">
        <canvas ref={canvasRef} className="w-full" style={{ imageRendering: 'pixelated', display: 'block' }} />
      </div>
      <p className="font-serif italic text-[10px] text-[#5a6478] text-center">
        Terreno generado proceduralmente · Posición actual marcada en ámbar
      </p>

      <div className="p-3 rounded-xl bg-[#0f1218] border border-[#1e2530]">
        <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-2">LEYENDA</div>
        <div className="grid grid-cols-2 gap-1">
          {TERRAIN_LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: item.color }} />
              <span className="font-mono text-[9px] text-[#5a6478]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {loc.name && (
        <div className="p-3 rounded-xl bg-[#3d8eff08] border border-[#3d8eff]/20">
          <div className="font-mono text-[10px] text-[#3d8eff] tracking-widest mb-1">POSICIÓN ACTUAL</div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#f5a623] flex-shrink-0" style={{ boxShadow: '0 0 6px #f5a62380' }} />
            <span className="font-serif text-sm text-[#eef2f8]">{loc.name}</span>
          </div>
          {loc.type && <div className="mt-1 font-mono text-[9px] text-[#5a6478]/60">{loc.type.toUpperCase()}</div>}
        </div>
      )}

      {explored.length > 0 && (
        <div>
          <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-2">LUGARES VISITADOS ({explored.length})</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {explored.map((l: any, i: number) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#0f1218] border border-[#1e2530]/50">
                <Eye size={9} className="text-[#00d4a8] flex-shrink-0" />
                <span className="font-serif text-xs text-[#c8d0dc] flex-1">{l.name}</span>
                {l.visitedAt && <span className="font-mono text-[8px] text-[#5a6478]">{l.visitedAt}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NPCsPanel({ run }: { run: any }) {
  const npcs = run?.npcs || [];
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'todos' | 'vivo' | 'muerto' | 'desaparecido'>('todos');

  const filtered = filter === 'todos' ? npcs : npcs.filter((n: any) => n.status === filter);
  const alive = npcs.filter((n: any) => n.status !== 'muerto' && n.status !== 'desaparecido').length;

  return (
    <div className="space-y-3">
      {npcs.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {(['todos', 'vivo', 'muerto', 'desaparecido'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-2 py-0.5 rounded-full font-mono text-[9px] border transition-all"
                style={{ borderColor: filter === f ? '#3d8eff' : '#1e2530', color: filter === f ? '#3d8eff' : '#5a6478', background: filter === f ? '#3d8eff10' : 'transparent' }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <span className="font-mono text-[9px] text-[#5a6478]">{alive}/{npcs.length} vivos</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="font-serif italic text-[#5a6478] text-sm py-4 text-center">
          {npcs.length === 0 ? 'Aún no has encontrado a nadie.' : 'Sin resultados.'}
        </p>
      ) : (
        filtered.map((npc: any) => {
          const isExpanded = expanded === npc.id;
          const statusColors: Record<string, string> = { vivo: '#00d4a8', muerto: '#ff4444', desaparecido: '#f5a623' };
          const statusColor = statusColors[npc.status || ''] || '#5a6478';
          const relTrust = npc.relationship?.trustLevel ?? 50;
          const trustColor = relTrust > 66 ? '#00d4a8' : relTrust > 33 ? '#f5a623' : '#ff4444';

          return (
            <div key={npc.id} className="rounded-xl border border-[#1e2530] bg-[#0f1218] overflow-hidden transition-all">
              <button
                onClick={() => setExpanded(isExpanded ? null : npc.id)}
                className="w-full flex justify-between items-center p-3 hover:bg-[#ffffff04] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}80` }} />
                  <div className="text-left min-w-0">
                    <div className="font-serif text-sm text-[#eef2f8] truncate">{npc.name || 'Desconocido'}</div>
                    <div className="flex items-center gap-2">
                      {npc.occupation && <span className="font-mono text-[9px] text-[#5a6478] truncate">{npc.occupation}</span>}
                      {npc.age && <span className="font-mono text-[8px] text-[#5a6478]/60">· {npc.age}a</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {npc.relationship?.type && (
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full bg-[#3d8eff10] text-[#3d8eff]/70 hidden sm:block">{npc.relationship.type}</span>
                  )}
                  <ChevronDown size={12} className="text-[#5a6478] transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }} />
                </div>
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 border-t border-[#1e2530] space-y-3">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <InfoRow label="Estado" value={npc.status} />
                        <InfoRow label="Última ubicación" value={npc.lastKnownLocation} />
                      </div>

                      {npc.relationship && (
                        <div className="p-2 rounded-lg bg-[#0a0c0f] border border-[#3d8eff]/10">
                          <div className="font-mono text-[9px] text-[#3d8eff] tracking-widest mb-1.5">RELACIÓN</div>
                          <div className="font-serif text-xs text-[#c8d0dc] mb-1">{npc.relationship.type}</div>
                          {npc.relationship.emotionalCharge && (
                            <div className="font-mono text-[9px] text-[#5a6478] italic mb-2">{npc.relationship.emotionalCharge}</div>
                          )}
                          {npc.relationship.trustLevel !== undefined && (
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="font-mono text-[8px] text-[#5a6478]">CONFIANZA</span>
                                <span className="font-mono text-[8px]" style={{ color: trustColor }}>{relTrust}%</span>
                              </div>
                              <div className="h-1 rounded-full bg-[#1e2530]">
                                <div className="h-1 rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, relTrust))}%`, background: trustColor }} />
                              </div>
                            </div>
                          )}
                          {(npc.relationship.keyMoments || []).length > 0 && (
                            <div className="mt-2 space-y-0.5">
                              <div className="font-mono text-[8px] text-[#5a6478] tracking-widest">MOMENTOS CLAVE</div>
                              {(npc.relationship.keyMoments as string[]).map((m: string, i: number) => (
                                <div key={i} className="font-serif text-[10px] text-[#5a6478]">• {m}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {npc.knownMotivations && (
                        <div>
                          <div className="font-mono text-[9px] text-[#5a6478] tracking-widest mb-1">MOTIVACIONES CONOCIDAS</div>
                          <p className="font-serif text-xs text-[#c8d0dc]/70 leading-relaxed">{npc.knownMotivations}</p>
                        </div>
                      )}

                      {npc.backstory && (
                        <div>
                          <div className="font-mono text-[9px] text-[#5a6478] tracking-widest mb-1">TRASFONDO</div>
                          <p className="font-serif text-xs italic text-[#5a6478] leading-relaxed">{npc.backstory}</p>
                        </div>
                      )}

                      {(npc.knownInventory || []).length > 0 && (
                        <div>
                          <div className="font-mono text-[9px] text-[#5a6478] tracking-widest mb-1">POSESIONES CONOCIDAS</div>
                          <div className="flex flex-wrap gap-1">
                            {(npc.knownInventory as string[]).map((item: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded-full bg-[#1e2530] font-mono text-[9px] text-[#5a6478]">{item}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(npc.secrets || []).length > 0 && (
                        <div className="p-2 rounded-lg bg-[#f5a62308] border border-[#f5a623]/15">
                          <div className="font-mono text-[9px] text-[#f5a623] tracking-widest mb-1">SECRETOS CONOCIDOS</div>
                          {(npc.secrets as string[]).map((s: string, i: number) => (
                            <div key={i} className="font-serif text-xs text-[#f5a623]/70 mb-0.5">• {s}</div>
                          ))}
                        </div>
                      )}

                      {npc.deathDetails && (
                        <div className="p-2 rounded-lg bg-[#ff444410] border border-[#ff4444]/20">
                          <div className="font-mono text-[9px] text-[#ff4444] tracking-widest mb-1">CAUSA DE MUERTE</div>
                          <p className="font-serif text-xs text-[#ff4444]/70">{npc.deathDetails}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })
      )}
    </div>
  );
}

function FactionsPanel({ run }: { run: any }) {
  const { addFaccion, updateFaccion } = useEngineStore();
  const facciones: Faccion[] = run?.facciones || [];
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newFac, setNewFac] = useState({ name: '', type: 'política', description: '', relationToPlayer: 'neutral', influenceLevel: 'local', knownGoals: '' });

  const TYPE_COLORS: Record<string, string> = {
    política: '#3d8eff', religiosa: '#f5a623', militar: '#ff4444',
    criminal: '#8b5cf6', comercial: '#00d4a8', social: '#5a6478', otra: '#5a6478',
  };
  const RELATION_COLORS: Record<string, string> = {
    aliado: '#00d4a8', neutral: '#5a6478', hostil: '#ff4444', desconocido: '#5a6478',
  };

  const handleAdd = () => {
    if (!newFac.name.trim()) return;
    addFaccion({
      id: 'fac-' + Date.now(),
      name: newFac.name,
      type: newFac.type as Faccion['type'],
      description: newFac.description,
      relationToPlayer: newFac.relationToPlayer as Faccion['relationToPlayer'],
      influenceLevel: newFac.influenceLevel as Faccion['influenceLevel'],
      knownMembers: [],
      knownGoals: newFac.knownGoals || undefined,
      playerReputation: 50,
      discoveredAt: run?.worldState?.ingameDate || `Año ${run?.eraConfig?.year}`,
    });
    setNewFac({ name: '', type: 'política', description: '', relationToPlayer: 'neutral', influenceLevel: 'local', knownGoals: '' });
    setShowAdd(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] text-[#5a6478]">{facciones.length} faccion{facciones.length !== 1 ? 'es' : ''} conocida{facciones.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[#1e2530] font-mono text-[9px] text-[#5a6478] hover:text-[#3d8eff] hover:border-[#3d8eff]/30 transition-all">
          <Plus size={10} />
          Añadir
        </button>
      </div>

      {showAdd && (
        <div className="p-3 rounded-xl bg-[#0f1218] border border-[#3d8eff]/20 space-y-2">
          <div className="font-mono text-[10px] text-[#3d8eff] tracking-widest mb-1">NUEVA FACCIÓN</div>
          <input value={newFac.name} onChange={(e) => setNewFac((p) => ({ ...p, name: e.target.value }))}
            placeholder="Nombre de la facción"
            className="w-full bg-[#0a0c0f] border border-[#1e2530] rounded-lg px-3 py-1.5 font-serif text-xs text-[#eef2f8] placeholder-[#5a6478] outline-none focus:border-[#3d8eff]/40" />
          <div className="grid grid-cols-2 gap-2">
            <select value={newFac.type} onChange={(e) => setNewFac((p) => ({ ...p, type: e.target.value }))}
              className="bg-[#0a0c0f] border border-[#1e2530] rounded-lg px-2 py-1.5 font-mono text-[9px] text-[#5a6478] outline-none">
              {['política','religiosa','militar','criminal','comercial','social','otra'].map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            <select value={newFac.relationToPlayer} onChange={(e) => setNewFac((p) => ({ ...p, relationToPlayer: e.target.value }))}
              className="bg-[#0a0c0f] border border-[#1e2530] rounded-lg px-2 py-1.5 font-mono text-[9px] text-[#5a6478] outline-none">
              {['aliado','neutral','hostil','desconocido'].map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <select value={newFac.influenceLevel} onChange={(e) => setNewFac((p) => ({ ...p, influenceLevel: e.target.value }))}
            className="w-full bg-[#0a0c0f] border border-[#1e2530] rounded-lg px-2 py-1.5 font-mono text-[9px] text-[#5a6478] outline-none">
            {['local','regional','nacional','global'].map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <textarea value={newFac.description} onChange={(e) => setNewFac((p) => ({ ...p, description: e.target.value }))}
            placeholder="Descripción breve..."
            rows={2}
            className="w-full bg-[#0a0c0f] border border-[#1e2530] rounded-lg px-3 py-1.5 font-serif text-xs text-[#eef2f8] placeholder-[#5a6478] outline-none focus:border-[#3d8eff]/40 resize-none" />
          <textarea value={newFac.knownGoals} onChange={(e) => setNewFac((p) => ({ ...p, knownGoals: e.target.value }))}
            placeholder="Objetivos conocidos (opcional)..."
            rows={1}
            className="w-full bg-[#0a0c0f] border border-[#1e2530] rounded-lg px-3 py-1.5 font-serif text-xs text-[#eef2f8] placeholder-[#5a6478] outline-none focus:border-[#3d8eff]/40 resize-none" />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 py-1.5 rounded-lg bg-[#3d8eff20] border border-[#3d8eff]/30 font-mono text-[9px] text-[#3d8eff] hover:bg-[#3d8eff30] transition-all">Guardar</button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg border border-[#1e2530] font-mono text-[9px] text-[#5a6478] hover:text-[#eef2f8] transition-all">Cancelar</button>
          </div>
        </div>
      )}

      {facciones.length === 0 && !showAdd && (
        <div className="py-8 text-center">
          <Shield size={24} className="text-[#1e2530] mx-auto mb-3" />
          <p className="font-serif italic text-[#5a6478] text-sm">No has encontrado ninguna facción aún.</p>
          <p className="font-mono text-[9px] text-[#5a6478]/60 mt-1">El narrador añadirá facciones conforme avance la historia.</p>
        </div>
      )}

      {facciones.map((fac) => {
        const isExp = expanded === fac.id;
        const typeColor = TYPE_COLORS[fac.type] || '#5a6478';
        const relColor = RELATION_COLORS[fac.relationToPlayer] || '#5a6478';
        const repColor = fac.playerReputation > 66 ? '#00d4a8' : fac.playerReputation > 33 ? '#f5a623' : '#ff4444';

        return (
          <div key={fac.id} className="rounded-xl border bg-[#0f1218] overflow-hidden" style={{ borderColor: `${typeColor}30` }}>
            <button onClick={() => setExpanded(isExp ? null : fac.id)}
              className="w-full flex justify-between items-center p-3 hover:bg-[#ffffff04] transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: typeColor, boxShadow: `0 0 6px ${typeColor}60` }} />
                <div className="text-left min-w-0">
                  <div className="font-serif text-sm text-[#eef2f8] truncate">{fac.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px]" style={{ color: typeColor }}>{fac.type.toUpperCase()}</span>
                    <span className="font-mono text-[8px] text-[#5a6478]/60">{fac.influenceLevel}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full border" style={{ color: relColor, borderColor: `${relColor}40`, background: `${relColor}10` }}>
                  {fac.relationToPlayer}
                </span>
                <ChevronDown size={12} className="text-[#5a6478]" style={{ transform: isExp ? 'rotate(180deg)' : 'rotate(0)' }} />
              </div>
            </button>
            <AnimatePresence>
              {isExp && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="px-4 pb-4 pt-2 border-t space-y-3" style={{ borderColor: `${typeColor}20` }}>
                    {fac.description && <p className="font-serif text-xs text-[#c8d0dc]/80 leading-relaxed">{fac.description}</p>}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-mono text-[8px] text-[#5a6478]">REPUTACIÓN DEL PJ</span>
                        <span className="font-mono text-[8px]" style={{ color: repColor }}>{fac.playerReputation}/100</span>
                      </div>
                      <div className="h-1 rounded-full bg-[#1e2530]">
                        <div className="h-1 rounded-full transition-all" style={{ width: `${fac.playerReputation}%`, background: repColor }} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateFaccion(fac.id, { playerReputation: Math.min(100, fac.playerReputation + 10) })}
                        className="flex-1 py-1 rounded-lg border border-[#00d4a8]/20 font-mono text-[9px] text-[#00d4a8] hover:bg-[#00d4a810] transition-all">+10 Rep</button>
                      <button onClick={() => updateFaccion(fac.id, { playerReputation: Math.max(0, fac.playerReputation - 10) })}
                        className="flex-1 py-1 rounded-lg border border-[#ff4444]/20 font-mono text-[9px] text-[#ff4444] hover:bg-[#ff444410] transition-all">-10 Rep</button>
                    </div>
                    {fac.knownGoals && (
                      <div>
                        <div className="font-mono text-[9px] text-[#5a6478] tracking-widest mb-1">OBJETIVOS CONOCIDOS</div>
                        <p className="font-serif text-xs italic text-[#5a6478]">{fac.knownGoals}</p>
                      </div>
                    )}
                    {(fac.knownMembers || []).length > 0 && (
                      <div>
                        <div className="font-mono text-[9px] text-[#5a6478] tracking-widest mb-1">MIEMBROS CONOCIDOS</div>
                        <div className="flex flex-wrap gap-1">
                          {(fac.knownMembers as string[]).map((m: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-[#1e2530] font-mono text-[9px] text-[#5a6478]">{m}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {fac.discoveredAt && <InfoRow label="Descubierta" value={fac.discoveredAt} />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function EditorPanel({ run }: { run: any }) {
  const { settings, updateSettings, narrativeVoice, setNarrativeVoice } = useEngineStore();
  const toggleSub = (key: keyof typeof settings.explicitSubToggles) => {
    updateSettings({ explicitSubToggles: { ...settings.explicitSubToggles, [key]: !settings.explicitSubToggles[key] } });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-3">VOZ NARRATIVA</div>
        <div className="space-y-2">
          {[
            { id: 'third_person', label: 'Narrador externo' },
            { id: 'first_person', label: 'Primera persona' },
            { id: 'world_speaks', label: 'El mundo habla' },
          ].map((v) => (
            <button key={v.id} onClick={() => setNarrativeVoice(v.id as any)} className="w-full text-left px-3 py-2 rounded-lg font-mono text-xs border transition-all"
              style={{ borderColor: narrativeVoice === v.id ? '#3d8eff' : '#1e2530', color: narrativeVoice === v.id ? '#3d8eff' : '#5a6478', background: narrativeVoice === v.id ? '#3d8eff10' : '#0f1218' }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="font-mono text-[10px] text-[#5a6478] tracking-widest">MODO EXPLÍCITO</div>
          <button onClick={() => updateSettings({ explicitMode: !settings.explicitMode })} className="w-10 h-5 rounded-full flex items-center transition-all"
            style={{ background: settings.explicitMode ? '#f5a62340' : '#1e2530', border: `1px solid ${settings.explicitMode ? '#f5a623' : '#1e2530'}` }}>
            <div className="w-3 h-3 rounded-full mx-0.5 transition-all" style={{ background: settings.explicitMode ? '#f5a623' : '#5a6478', transform: settings.explicitMode ? 'translateX(20px)' : 'translateX(0)' }} />
          </button>
        </div>
        {settings.explicitMode && (
          <div className="space-y-2 ml-2 border-l border-[#f5a623]/20 pl-3">
            {Object.entries(settings.explicitSubToggles).map(([k, v]) => {
              const LABELS: Record<string, string> = {
                violence: 'Violencia',
                sexuality: 'Sexualidad',
                substanceUse: 'Consumo de sustancias',
                psychologicalHorror: 'Horror psicológico',
                politicalExtremism: 'Extremismo político',
              };
              return (
                <button key={k} onClick={() => toggleSub(k as any)} className="flex items-center gap-2 w-full">
                  <div className="w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center transition-all"
                    style={{ background: v ? '#f5a623' : 'transparent', borderColor: v ? '#f5a623' : '#5a6478' }}>
                    {v && <div className="w-1.5 h-1.5 bg-black rounded-sm" />}
                  </div>
                  <span className="font-mono text-[10px] text-[#5a6478]">{LABELS[k] || k.replace(/([A-Z])/g, ' $1').trim()}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-2">PERSPECTIVAS EXTERNAS</div>
        <button onClick={() => updateSettings({ otherPerspectives: !settings.otherPerspectives })} className="w-full flex justify-between items-center px-3 py-2 rounded-lg border border-[#1e2530] bg-[#0f1218]">
          <span className="font-mono text-xs text-[#5a6478]">Activar perspectivas de NPCs</span>
          <div className="w-8 h-4 rounded-full flex items-center transition-all"
            style={{ background: settings.otherPerspectives ? '#3d8eff40' : '#1e2530', border: `1px solid ${settings.otherPerspectives ? '#3d8eff' : '#1e2530'}` }}>
            <div className="w-2.5 h-2.5 rounded-full mx-0.5 transition-all"
              style={{ background: settings.otherPerspectives ? '#3d8eff' : '#5a6478', transform: settings.otherPerspectives ? 'translateX(16px)' : 'translateX(0)' }} />
          </div>
        </button>
      </div>
    </div>
  );
}

function SavePanel({ run, onClose }: { run: any; onClose: () => void }) {
  const { updateActiveRun, pastRuns } = useEngineStore();
  const [saved, setSaved] = useState(false);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);

  const handleSave = () => {
    updateActiveRun({ savedAt: Date.now() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const turnCount = run?.turnCount || 0;
  const npcCount = (run?.npcs || []).length;
  const inventoryCount = (run?.inventory || []).length;
  const savedAt = run?.savedAt ? new Date(run.savedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : null;

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-[#0f1218] border border-[#1e2530] space-y-2">
        <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-2">PARTIDA ACTUAL</div>
        <InfoRow label="Personaje" value={run?.character?.name} />
        <InfoRow label="Edad" value={run?.character?.age ? `${run.character.age} años` : undefined} />
        <InfoRow label="Turnos jugados" value={turnCount} />
        <InfoRow label="NPCs encontrados" value={npcCount} />
        <InfoRow label="Objetos en inventario" value={inventoryCount} />
        {savedAt && <InfoRow label="Último guardado" value={savedAt} />}
      </div>

      <button onClick={handleSave} className="w-full py-3 rounded-xl font-mono text-sm border transition-all active:scale-95"
        style={{ borderColor: saved ? '#00d4a850' : '#1e2530', color: saved ? '#00d4a8' : '#5a6478', background: saved ? '#00d4a810' : '#0f1218' }}>
        {saved ? '✓ Partida guardada en el navegador' : '💾 Guardar partida'}
      </button>

      <p className="font-mono text-[9px] text-[#5a6478] text-center">
        El guardado se mantiene en este dispositivo. Exportar próximamente.
      </p>

      {!showConfirmEnd ? (
        <button onClick={() => setShowConfirmEnd(true)}
          className="w-full py-2 rounded-xl font-mono text-xs border border-[#ff4444]/20 text-[#ff4444]/60 hover:text-[#ff4444] hover:border-[#ff4444]/40 transition-all">
          Terminar y archivar partida
        </button>
      ) : (
        <div className="p-3 rounded-xl bg-[#ff444410] border border-[#ff4444]/30">
          <p className="font-serif text-xs text-[#ff4444] mb-3">¿Terminar la partida de <strong>{run?.character?.name}</strong>? Esta acción archivará el run.</p>
          <div className="flex gap-2">
            <button onClick={() => { updateActiveRun({ endedAt: Date.now(), endCause: 'Partida terminada por el jugador' }); onClose(); }}
              className="flex-1 py-1.5 rounded-lg bg-[#ff444420] border border-[#ff4444]/30 font-mono text-[9px] text-[#ff4444]">
              Confirmar
            </button>
            <button onClick={() => setShowConfirmEnd(false)}
              className="flex-1 py-1.5 rounded-lg border border-[#1e2530] font-mono text-[9px] text-[#5a6478]">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mt-2">PARTIDAS ARCHIVADAS</div>
      {pastRuns.length === 0 ? (
        <p className="font-serif italic text-[#5a6478] text-xs py-2">Sin partidas archivadas.</p>
      ) : (
        <div className="space-y-2">
          {pastRuns.slice(0, 8).map((r) => (
            <div key={r.runId} className="p-3 rounded-lg border border-[#1e2530] bg-[#0f1218]">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-serif text-sm text-[#eef2f8]">{r.character?.name || '?'}</div>
                  <div className="font-mono text-[9px] text-[#5a6478]">{r.eraConfig?.eraLabel || ''} · {r.eraConfig?.year}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[9px] text-[#5a6478]">
                    {r.endedAt ? new Date(r.endedAt).toLocaleDateString('es-ES') : 'En curso'}
                  </div>
                  {r.character?.age && <div className="font-mono text-[8px] text-[#5a6478]/60">{r.character.age} años</div>}
                </div>
              </div>
              {r.endCause && <p className="font-serif text-[10px] italic text-[#5a6478] mt-1">{r.endCause}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MemoriaPanel({ run }: { run: any }) {
  const { updateMemoriaNarrador } = useEngineStore();
  const memoria = run?.memoriaNarrador || { notasLibres: '', reglasDeLaPartida: '', hechosCanonicos: [] };
  const [newHecho, setNewHecho] = useState('');
  const [editingNotas, setEditingNotas] = useState(false);
  const [notasDraft, setNotasDraft] = useState(memoria.notasLibres || '');
  const [editingReglas, setEditingReglas] = useState(false);
  const [reglasDraft, setReglasDraft] = useState(memoria.reglasDeLaPartida || '');
  const hechosCanonicos: string[] = memoria.hechosCanonicos || [];

  const addHecho = () => {
    if (!newHecho.trim()) return;
    updateMemoriaNarrador({ hechosCanonicos: [...hechosCanonicos, newHecho.trim()] });
    setNewHecho('');
  };

  const removeHecho = (i: number) => {
    updateMemoriaNarrador({ hechosCanonicos: hechosCanonicos.filter((_: string, idx: number) => idx !== i) });
  };

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-[#8b5cf608] border border-[#8b5cf6]/20">
        <div className="flex items-center gap-2 mb-1">
          <Brain size={12} className="text-[#8b5cf6]" />
          <div className="font-mono text-[10px] text-[#8b5cf6] tracking-widest">QUÉ ES ESTO</div>
        </div>
        <p className="font-serif text-xs text-[#5a6478] leading-relaxed">
          Esta memoria se pasa al narrador IA en cada turno. Úsala para anclar hechos, reglas del mundo y notas que el narrador debe recordar siempre.
        </p>
      </div>

      <div className="p-3 rounded-xl bg-[#0f1218] border border-[#1e2530]">
        <div className="flex items-center justify-between mb-2">
          <div className="font-mono text-[10px] text-[#5a6478] tracking-widest">NOTAS LIBRES AL NARRADOR</div>
          <button onClick={() => { setEditingNotas(!editingNotas); setNotasDraft(memoria.notasLibres || ''); }}
            className="font-mono text-[9px] text-[#3d8eff] hover:underline">{editingNotas ? 'Cancelar' : 'Editar'}</button>
        </div>
        {editingNotas ? (
          <div className="space-y-2">
            <textarea
              value={notasDraft}
              onChange={(e) => setNotasDraft(e.target.value)}
              rows={5}
              placeholder="Notas adicionales que el narrador debe tener en cuenta..."
              className="w-full bg-[#0a0c0f] border border-[#1e2530] rounded-lg px-3 py-2 font-serif text-xs text-[#eef2f8] placeholder-[#5a6478] outline-none focus:border-[#8b5cf6]/40 resize-none leading-relaxed"
            />
            <button onClick={() => { updateMemoriaNarrador({ notasLibres: notasDraft }); setEditingNotas(false); }}
              className="w-full py-1.5 rounded-lg bg-[#8b5cf620] border border-[#8b5cf6]/30 font-mono text-[9px] text-[#8b5cf6] hover:bg-[#8b5cf630] transition-all">
              Guardar notas
            </button>
          </div>
        ) : (
          memoria.notasLibres ? (
            <p className="font-serif text-xs text-[#c8d0dc] leading-relaxed whitespace-pre-wrap">{memoria.notasLibres}</p>
          ) : (
            <p className="font-serif italic text-xs text-[#5a6478]">Sin notas. Haz clic en Editar para añadir instrucciones al narrador.</p>
          )
        )}
      </div>

      <div className="p-3 rounded-xl bg-[#0f1218] border border-[#1e2530]">
        <div className="flex items-center justify-between mb-2">
          <div className="font-mono text-[10px] text-[#5a6478] tracking-widest">REGLAS DE LA PARTIDA</div>
          <button onClick={() => { setEditingReglas(!editingReglas); setReglasDraft(memoria.reglasDeLaPartida || ''); }}
            className="font-mono text-[9px] text-[#3d8eff] hover:underline">{editingReglas ? 'Cancelar' : 'Editar'}</button>
        </div>
        {editingReglas ? (
          <div className="space-y-2">
            <textarea
              value={reglasDraft}
              onChange={(e) => setReglasDraft(e.target.value)}
              rows={4}
              placeholder="Ej: 'La magia no existe en este mundo', 'El personaje nunca miente', 'Tono oscuro y realista'..."
              className="w-full bg-[#0a0c0f] border border-[#1e2530] rounded-lg px-3 py-2 font-serif text-xs text-[#eef2f8] placeholder-[#5a6478] outline-none focus:border-[#8b5cf6]/40 resize-none leading-relaxed"
            />
            <button onClick={() => { updateMemoriaNarrador({ reglasDeLaPartida: reglasDraft }); setEditingReglas(false); }}
              className="w-full py-1.5 rounded-lg bg-[#8b5cf620] border border-[#8b5cf6]/30 font-mono text-[9px] text-[#8b5cf6] hover:bg-[#8b5cf630] transition-all">
              Guardar reglas
            </button>
          </div>
        ) : (
          memoria.reglasDeLaPartida ? (
            <p className="font-serif text-xs text-[#c8d0dc] leading-relaxed whitespace-pre-wrap">{memoria.reglasDeLaPartida}</p>
          ) : (
            <p className="font-serif italic text-xs text-[#5a6478]">Sin reglas definidas. Define aquí las normas permanentes del mundo.</p>
          )
        )}
      </div>

      <div className="p-3 rounded-xl bg-[#0f1218] border border-[#1e2530]">
        <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-2">
          HECHOS CANÓNICOS ({hechosCanonicos.length})
        </div>
        <p className="font-mono text-[8px] text-[#5a6478]/60 mb-3">Eventos o verdades inmutables que el narrador nunca puede contradecir.</p>
        <div className="flex gap-2 mb-3">
          <input
            value={newHecho}
            onChange={(e) => setNewHecho(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addHecho()}
            placeholder="Nuevo hecho canónico..."
            className="flex-1 bg-[#0a0c0f] border border-[#1e2530] rounded-lg px-3 py-1.5 font-serif text-xs text-[#eef2f8] placeholder-[#5a6478] outline-none focus:border-[#8b5cf6]/40"
          />
          <button onClick={addHecho}
            className="px-3 py-1.5 rounded-lg bg-[#8b5cf620] border border-[#8b5cf6]/30 font-mono text-[9px] text-[#8b5cf6] hover:bg-[#8b5cf630] transition-all">
            <Plus size={12} />
          </button>
        </div>
        {hechosCanonicos.length === 0 ? (
          <p className="font-serif italic text-xs text-[#5a6478] text-center py-2">Sin hechos canónicos registrados.</p>
        ) : (
          <div className="space-y-1.5">
            {hechosCanonicos.map((hecho: string, i: number) => (
              <div key={i} className="flex items-start gap-2 group">
                <div className="w-1 h-1 rounded-full bg-[#8b5cf6] mt-2 flex-shrink-0" />
                <span className="font-serif text-xs text-[#c8d0dc] flex-1 leading-relaxed">{hecho}</span>
                <button onClick={() => removeHecho(i)}
                  className="opacity-0 group-hover:opacity-100 text-[#ff4444]/50 hover:text-[#ff4444] transition-all flex-shrink-0 mt-0.5">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 rounded-xl bg-[#0f1218] border border-[#1e2530]">
        <div className="font-mono text-[10px] text-[#5a6478] tracking-widest mb-2">RESUMEN AUTOMÁTICO</div>
        <div className="space-y-1">
          <InfoRow label="Turnos" value={run?.turnCount || 0} />
          <InfoRow label="NPCs conocidos" value={(run?.npcs || []).length} />
          <InfoRow label="Facciones" value={(run?.facciones || []).length} />
          <InfoRow label="Lugares explorados" value={(run?.exploredLocations || []).length} />
          <InfoRow label="Eventos en historia" value={(run?.personalHistory || []).length} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="font-mono text-[10px] text-[#5a6478] flex-shrink-0">{label.toUpperCase()}</span>
      <span className="font-serif text-xs text-[#c8d0dc] text-right">{String(value)}</span>
    </div>
  );
}

const GOD_INTERVENTIONS = [
  { id: 'plague', icon: Skull, label: 'Plaga', color: '#ff4444', action: '[INTERVENCIÓN DIVINA: PLAGA] El dios decreta una plaga sobre la región.' },
  { id: 'war', icon: Sword, label: 'Guerra', color: '#f5a623', action: '[INTERVENCIÓN DIVINA: GUERRA] El dios enciende el fuego de la guerra.' },
  { id: 'fortune', icon: Sparkles, label: 'Fortuna', color: '#00d4a8', action: '[INTERVENCIÓN DIVINA: FORTUNA] El dios derrama su gracia sobre un mortal.' },
  { id: 'famine', icon: Wind, label: 'Hambruna', color: '#5a6478', action: '[INTERVENCIÓN DIVINA: HAMBRUNA] El dios retira su favor de las cosechas.' },
  { id: 'storm', icon: Flame, label: 'Tormenta', color: '#8b5cf6', action: '[INTERVENCIÓN DIVINA: TORMENTA] El dios desata los elementos.' },
  { id: 'vision', icon: Moon, label: 'Visión', color: '#3d8eff', action: '[INTERVENCIÓN DIVINA: VISIÓN] El dios susurra una profecía al oído de un mortal.' },
];

function GodModeGame({
  run, isGenerating, streamedNarrative, history, textSizeClass,
  onSendAction, onExit, onConfirmExit, onCancelExit, showConfirmExit, isStreaming,
}: {
  run: any; isGenerating: boolean; streamedNarrative: string;
  history: NarrativeTurn[]; textSizeClass: string;
  onSendAction: (text?: string) => void;
  onExit: () => void; onConfirmExit: () => void; onCancelExit: () => void;
  showConfirmExit: boolean; isStreaming: boolean;
}) {
  const [godInput, setGodInput] = useState('');
  const [selectedIntervention, setSelectedIntervention] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history.length, streamedNarrative]);

  const handleDecree = () => {
    const base = selectedIntervention
      ? GOD_INTERVENTIONS.find((i) => i.id === selectedIntervention)?.action || ''
      : '';
    const text = godInput.trim()
      ? `${base}${base ? ' ' : ''}El dios observa y decreta: "${godInput.trim()}"`
      : base || 'El dios observa en silencio.';
    onSendAction(text);
    setGodInput('');
    setSelectedIntervention(null);
  };

  const npcs = run.npcs || [];
  const year = run.worldState?.ingameYear || run.eraConfig?.year;

  return (
    <div className="h-screen w-full flex flex-col bg-[#0a0c0f] overflow-hidden" style={{ borderTop: '1px solid #8b5cf620' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, #8b5cf608 0%, transparent 60%)' }} />

      <div className="flex items-center justify-between px-6 py-3 border-b border-[#8b5cf6]/20 bg-[#0a0c0f]/95 backdrop-blur-sm relative z-10">
        <button onClick={onExit} className="text-[#5a6478] hover:text-[#eef2f8] transition-colors"><ArrowLeft size={16} /></button>
        <div className="text-center">
          <div className="flex items-center gap-2 justify-center">
            <Crown size={12} className="text-[#8b5cf6]" />
            <span className="font-mono text-xs text-[#8b5cf6] tracking-widest">MODO DIOS</span>
          </div>
          <div className="font-mono text-[10px] text-[#5a6478]">Año {year} · {run.eraConfig?.eraLabel || ''}</div>
        </div>
        <div className="font-mono text-[10px] text-[#5a6478]">{npcs.length} mortales</div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col relative">
          <div ref={scrollRef} className="flex-1 overflow-y-auto pb-48">
            <div className="px-6 py-8 space-y-8 max-w-2xl mx-auto">
              {history.length === 0 && (
                <div className="text-center py-12 border border-dashed border-[#8b5cf6]/20 rounded-xl">
                  <Crown size={24} className="text-[#8b5cf6]/40 mx-auto mb-3" />
                  <p className="font-serif italic text-[#5a6478]">El mundo aguarda la primera intervención divina.</p>
                  <p className="font-mono text-[10px] text-[#5a6478]/50 mt-2">Elige una intervención o dicta tu decreto.</p>
                </div>
              )}
              <AnimatePresence initial={false}>
                {history.map((turn, i) => (
                  <motion.div key={turn.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    {turn.role === 'user' ? (
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Crown size={10} className="text-[#8b5cf6]" />
                        </div>
                        <div className="font-mono text-xs text-[#8b5cf6]/80 pt-1">{turn.text}</div>
                      </div>
                    ) : turn.role === 'narrator' ? (
                      <div className="border-l-2 border-[#8b5cf6]/20 pl-4">
                        <div className="font-mono text-[9px] text-[#8b5cf6]/40 mb-2 tracking-widest">CRÓNICA MORTAL</div>
                        <p className={`font-serif ${textSizeClass} leading-relaxed text-[#c8d0dc]/90`}>
                          {i === history.length - 1 && isStreaming ? (
                            streamedNarrative ? (
                              <>{streamedNarrative}<span className="inline-block w-0.5 h-4 bg-[#8b5cf6] ml-0.5 animate-pulse" /></>
                            ) : (
                              <span className="inline-flex gap-1">
                                <span className="w-1.5 h-1.5 bg-[#8b5cf6] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-[#8b5cf6] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-[#8b5cf6] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </span>
                            )
                          ) : turn.text}
                        </p>
                      </div>
                    ) : null}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0c0f] via-[#0a0c0f]/95 to-transparent pt-12 pb-4 px-4">
            <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar max-w-2xl mx-auto">
              {GOD_INTERVENTIONS.map((intervention) => (
                <button
                  key={intervention.id}
                  onClick={() => setSelectedIntervention(selectedIntervention === intervention.id ? null : intervention.id)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs border transition-all"
                  style={{
                    borderColor: selectedIntervention === intervention.id ? intervention.color + '60' : '#1e2530',
                    color: selectedIntervention === intervention.id ? intervention.color : '#5a6478',
                    background: selectedIntervention === intervention.id ? intervention.color + '12' : 'transparent',
                  }}
                >
                  <intervention.icon size={10} />
                  {intervention.label}
                </button>
              ))}
            </div>
            <div className="max-w-2xl mx-auto relative">
              <input
                value={godInput}
                onChange={(e) => setGodInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDecree(); } }}
                placeholder={selectedIntervention ? `Refinar ${GOD_INTERVENTIONS.find(i => i.id === selectedIntervention)?.label.toLowerCase()}...` : '¿Qué decreta el dios?'}
                disabled={isGenerating}
                className="w-full h-14 pl-5 pr-14 bg-[#0f1218]/90 backdrop-blur border rounded-xl font-serif text-base text-[#eef2f8] placeholder:text-[#2a3040] focus:outline-none transition-all disabled:opacity-50"
                style={{ borderColor: selectedIntervention ? (GOD_INTERVENTIONS.find(i => i.id === selectedIntervention)?.color || '#8b5cf6') + '40' : '#8b5cf620' }}
              />
              <button
                onClick={handleDecree}
                disabled={isGenerating && !godInput.trim() && !selectedIntervention}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
                style={{ background: '#8b5cf620', color: '#8b5cf6' }}
              >
                <Crown size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="w-48 border-l border-[#8b5cf6]/10 bg-[#0a0c0f] flex flex-col overflow-hidden">
          <div className="px-3 py-3 border-b border-[#8b5cf6]/10">
            <div className="font-mono text-[9px] text-[#8b5cf6]/60 tracking-widest">MORTALES ACTIVOS</div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {npcs.length === 0 ? (
              <p className="font-serif text-[10px] italic text-[#5a6478] p-2">Sin mortales registrados aún.</p>
            ) : (
              npcs.map((npc: any) => (
                <div key={npc.id} className="px-2 py-1.5 rounded bg-[#0f1218] border border-[#8b5cf6]/10">
                  <div className="font-serif text-[11px] text-[#c8d0dc]">{npc.name}</div>
                  <div className="font-mono text-[9px]" style={{ color: npc.status === 'muerto' ? '#ff4444' : '#5a6478' }}>{npc.occupation || npc.status}</div>
                </div>
              ))
            )}
          </div>
          <div className="px-3 py-2 border-t border-[#8b5cf6]/10">
            <div className="font-mono text-[9px] text-[#5a6478] tracking-widest mb-1">ERACONFIG</div>
            <div className="font-mono text-[9px] text-[#8b5cf6]/60">{run.eraConfig?.eraLabel || 'Era desconocida'}</div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showConfirmExit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-[#0f1218] border border-[#8b5cf6]/30 rounded-2xl p-8 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-bold text-xl mb-2">¿Abandonar el trono?</h3>
              <p className="font-serif italic text-[#5a6478] mb-6 text-sm">El mundo mortal seguirá sin ti. Tu legado permanece.</p>
              <div className="flex gap-3">
                <button onClick={onConfirmExit} className="flex-1 py-3 rounded-xl font-mono text-sm border border-[#1e2530] text-[#5a6478] hover:text-[#eef2f8] transition-all">Salir</button>
                <button onClick={onCancelExit} className="flex-1 py-3 rounded-xl font-mono text-sm border border-[#8b5cf6]/30 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 transition-all">Continuar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
