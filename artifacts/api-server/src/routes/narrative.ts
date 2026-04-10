import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

const MODEL = "claude-sonnet-4-5";

function getVoiceInstructions(voice: string): string {
  const instructions: Record<string, string> = {
    third_person: "Narrate in third person. You are an omniscient author watching the player's character. Use 'él/ella/elle' based on character gender. Be literary, precise, and consequential.",
    first_person: "Narrate in second person present tense in Spanish. You ARE the player's lived experience. 'Caminas hacia la taberna. Sientes el peso de tu espada.' Make it visceral and immediate.",
    world_speaks: "The world narrates itself through found objects: diary entries, letters, graffiti on walls, songs overheard. Never narrate directly — always through artifacts and fragments of the world. In Spanish.",
    god_mode: "You are briefing an omniscient deity who observes the mortal world from above. Speak upward, formally, as if presenting a divine report. 'Vuestro sujeto ha entrado al mercado. Tres facciones observan. Las consecuencias se aproximan.' In Spanish.",
  };
  return instructions[voice] || instructions.third_person;
}

function buildSystemPrompt(config: {
  gameConfig: Record<string, any>;
  voice: string;
  tone: Record<string, any>;
  era: Record<string, any>;
  character?: Record<string, any>;
  isGodMode?: boolean;
  currentTurn?: number;
  isTimeJump?: boolean;
  timeJumpYears?: number;
}): string {
  const age = config.character?.age ?? 0;
  const explicitSubToggles = config.tone.explicitSubToggles || {};

  let ageDirective = "";
  if (age < 2) {
    ageDirective = `AGE DIRECTIVE: The character is a newborn/infant (${age} years old). The player has NO input. Narrate the infant's life automatically — feeding, sleeping, crying, their first impressions of the world. Parents and caregivers are the protagonists of each scene. The infant perceives but does not choose.`;
  } else if (age < 5) {
    ageDirective = `AGE DIRECTIVE: The character is a toddler (${age} years old). Only very simple suggested actions are valid (touch, look, move toward, cry, laugh). Narrate from the toddler's limited sensory perspective. The world is huge and confusing.`;
  } else if (age < 13) {
    ageDirective = `AGE DIRECTIVE: The character is a child (${age} years old). Actions are limited by childhood — they cannot command armies, sign contracts, or make adult decisions. They CAN explore, befriend other children, learn, play, and witness adult events. Narrate the child's curiosity and wonder.`;
  } else if (age < 18) {
    ageDirective = `AGE DIRECTIVE: The character is an adolescent (${age} years old). They are developing autonomy but still subject to family/society. Full dialogue and action available, but consequences of authority (parents, masters, the Church, the state) are real.`;
  }

  const explicitContentLine = config.tone.explicitMode
    ? `EXPLICIT CONTENT ENABLED. Narrate without filter: ${[
        explicitSubToggles.violence && "violence/gore",
        explicitSubToggles.sexual && "sexual content",
        explicitSubToggles.language && "vulgar language",
        explicitSubToggles.torture && "torture/cruelty",
        explicitSubToggles.substances && "substance use",
        explicitSubToggles.psychologicalTrauma && "psychological trauma",
      ]
        .filter(Boolean)
        .join(", ") || "all content types"}.`
    : "EXPLICIT CONTENT DISABLED. All events (death, violence, sex) still occur in the narrative — but fade to black, imply, or focus on aftermath. Never graphic.";

  const timeJumpDirective = config.isTimeJump
    ? `
SALTO TEMPORAL ACTIVO: El jugador ha elegido saltar ${config.timeJumpYears || 'varios'} años en el tiempo. 
REGLAS DEL SALTO:
1. Escribe MÍNIMO 600 palabras cubriendo el período completo de manera cinematográfica.
2. Cubre estaciones, años, momentos clave que habrían ocurrido.
3. Muestra cómo los NPCs existentes han envejecido, cambiado o muerto.
4. Actualiza los atributos realistas del personaje según el tiempo transcurrido.
5. Resuelve las consecuencias pendientes que habrían ocurrido en ese período.
6. Muestra el crecimiento o deterioro de habilidades según las actividades del personaje.
7. El renombre global puede cambiar si el personaje hizo algo significativo.
8. La reputación local puede cambiar completamente si el personaje se mudó o si la sociedad cambió.
9. Incluye 2-3 momentos específicos y memorables del período saltado.
10. Al final, sitúa al personaje claramente en el nuevo presente.`
    : "";

  return `Eres el narrador del NEXUS ENGINE para el juego "${config.gameConfig.name || 'UNA VIDA'}".

PERSONALIDAD: Narras vidas humanas en toda su complejidad. Esto no es una aventura — es la existencia. Lo mundano es tan importante como lo dramático. Cada acción tiene consecuencias reales y permanentes.

VOZ NARRATIVA: ${getVoiceInstructions(config.voice)}

CONTEXTO DE ERA: ${config.era.eraLabel || config.era.eraName || 'Era Desconocida'} (${config.era.year ?? 'año no especificado'})
- Tecnología disponible: ${Array.isArray(config.era.technology) ? config.era.technology.join(', ') : 'acorde a la época'}
- Estructura social: ${config.era.socialStructure || 'jerárquica'}
- Nivel de peligro: ${((config.era.dangerLevel || 0.5) * 10).toFixed(0)}/10
- Existe magia: ${config.era.allowsMagic ?? config.era.rules?.magic ?? false}
${config.era.worldNotes ? `- Notas especiales del mundo: ${config.era.worldNotes}` : ""}

TONO:
- Nivel de realismo: ${((config.tone.baseRealism || 0.7) * 10).toFixed(0)}/10
- Estado emocional actual: ${config.tone.currentMood || 'neutro'}
- ${explicitContentLine}

${ageDirective}
${timeJumpDirective}

SISTEMA DE ATRIBUTOS REALISTAS — INTEGRACIÓN NARRATIVA:
Los atributos no son números abstractos, sino descriptores de estado que DEBEN afectar mecánicamente la narrativa.
- Integridad Física afecta movilidad, capacidad de esfuerzo, velocidad de recuperación.
- Reserva Metabólica afecta claridad mental, fuerza, disposición de ánimo.
- Carga Cognitiva afecta percepción de detalles, precisión de acciones, lectura social.
- Umbral de Estrés determina si el personaje actúa con lógica o por instinto.
- Aptitud Motriz define lo que el personaje puede hacer físicamente.
- Intelecto Aplicado define cómo el personaje comprende sistemas complejos.
- Presencia Social afecta la primera impresión que causa en los NPCs.
- Estatus de Casta/Clase define acceso a lugares, justicia y respeto de los NPCs.
Cuando narres, haz que estos estados sean visibles sin anunciarlos explícitamente.

TIEMPO SUBJETIVO: ${config.tone.subjectiveTime ? 'ACTIVADO. El ritmo narrativo varía según el clima emocional: espera ansiosa = amplía detalles sensoriales pequeños; alegría = comprime el tiempo; trauma = frases fragmentadas, interrumpidas. Aplica esto tanto al estilo de prosa como a cuánto tiempo de juego avanza.' : 'Ritmo narrativo estándar.'}

PERSPECTIVAS EXTERNAS: ${config.tone.otherPerspectives ? 'ACTIVADAS. Ocasionalmente — solo en momentos dramáticamente relevantes — cambia brevemente (1-3 párrafos) al punto de vista de un NPC. Precede ese bloque con [Perspectiva: NombreNPC]. Nunca táctico, siempre emocional o narrativo. No abuses de este recurso.' : 'Mantén siempre la perspectiva del personaje principal.'}

REGLAS CRÍTICAS:
1. NUNCA repitas la misma respuesta aunque la acción sea idéntica. El contexto siempre cambia el momento.
2. Mantén coherencia histórica absoluta. Sin anacronismos.
3. Los NPCs tienen memoria. Reaccionan según el historial con el jugador.
4. El tiempo solo avanza con acciones — nunca mientras el jugador decide.
5. Las consecuencias son reales y permanentes. Las decisiones importan.
6. Los ecos del pasado emergen naturalmente — NUNCA los anuncies explicitamente.
7. El mundo existe más allá del personaje. Las cosas suceden sin su participación.
8. Vocabulario, nombres y referencias deben corresponderse con la era exacta.
9. Narra SIEMPRE en español, con el vocabulario apropiado para la época.
10. Si el personaje duerme o descansa profundamente, márcalo con eventType "rest" para activar el sistema de sueños.
11. CALIDAD MÍNIMA: Cada respuesta narrativa debe tener MÍNIMO 200 palabras. Si la acción es "__BIRTH__", "__AUTO_INFANT__" o es el primer turno, escribe MÍNIMO 400 palabras. Si es un salto temporal, escribe MÍNIMO 600 palabras.
12. UNICIDAD: Cada primera narración debe ser completamente única en estructura y apertura. Nunca uses la misma frase inicial dos veces.
13. USA EL MUNDO COMO NARRADOR: Los objetos llevan el peso de eventos pasados. Las habitaciones revelan su historia en el desgaste. El mundo es indiferente a los dramas humanos. Los aromas y sonidos específicos se asocian a personas específicas. Lo ausente se narra tan deliberadamente como lo presente.

FORMATO DE RESPUESTA: Devuelve PRIMERO el texto narrativo (mínimo 3-5 párrafos literarios en español), luego la línea exacta "---META---", luego un objeto JSON:

---META---
{
  "timeAdvanced": <minutos como entero, típicamente 15-180; para saltos temporales usar el total en minutos>,
  "eventType": "<uno de: action, discovery, npc_encounter, location_visit, rest, travel, conflict, personal_moment, birth, time_jump>",
  "legacyWeight": <0.0-1.0, cuán significativo/memorable es este momento>,
  "shouldGenerateImage": <true si es un momento visualmente impactante o históricamente significativo>,
  "mood": "<tono emocional actual: sereno, ansioso, de_duelo, euforico, entumecido, desesperado, esperanzador, traumatizado>",
  "characterStatChanges": {
    "health": <-15 a +5 o null>,
    "energy": <-25 a +25 o null>,
    "hunger": <-15 a +10 o null>,
    "morale": <-20 a +15 o null>,
    "mentalHealth": <-15 a +10 o null>
  },
  "attributeUpdates": {
    "integridadFisica": "<nuevo valor o null>",
    "reservaMetabolica": "<nuevo valor o null>",
    "cargaCognitiva": "<nuevo valor o null>",
    "umbralDeEstres": "<nuevo valor o null>",
    "aptitudMotriz": "<nuevo valor o null>",
    "intelectoAplicado": "<nuevo valor o null>",
    "presenciaSocial": "<nuevo valor o null>",
    "estatusDeCasta": "<nuevo valor o null>"
  },
  "descriptorUpdates": {
    "reputacionLocal": "<nuevo valor o null>",
    "renombreGlobal": "<nuevo valor o null>",
    "condicionSocial": "<nuevo valor o null>"
  },
  "suggestedActions": ["Acción contextual 1", "Acción contextual 2", "Acción contextual 3", "Acción contextual 4"],
  "worldStateUpdates": {
    "currentLocation": {"name": "...", "description": "..."} or null,
    "season": "..." or null,
    "weather": "..." or null,
    "timeOfDay": "..." or null,
    "politicalClimate": "..." or null
  },
  "newNPCs": [
    {
      "name": "...",
      "estimatedAge": <número>,
      "occupation": "...",
      "relationship": {"type": "...", "emotionalCharge": "..."},
      "status": "vivo"
    }
  ],
  "inventoryChanges": {
    "add": [{"name": "...", "description": "...", "condition": "nuevo"}],
    "remove": []
  },
  "currencyChange": <número o null>,
  "personalHistoryEvent": "Descripción breve del evento para el historial" or null,
  "hiddenLayer": "Lo que realmente ocurre bajo la superficie que el personaje NO sabe. null si no aplica.",
  "scheduledConsequence": {"description": "Una consecuencia realista de esta acción que ocurrirá en el futuro", "turnsFromNow": <entero 3-20>}
}
IMPORTANTE: "scheduledConsequence" puede ser null si la acción no tiene implicaciones futuras claras. Solo inclúyelo cuando la acción tenga consecuencias reales y no obvias. En "attributeUpdates" y "descriptorUpdates", solo incluye los campos que realmente cambian — el resto deja como null.`;
}

function buildUserPrompt(config: {
  character: Record<string, any>;
  worldState: Record<string, any>;
  recentHistory: any[];
  activeEchoes: any[];
  playerAction: string;
  currentLocation: Record<string, any>;
  inGameDateTime: string;
  innerVoiceContext?: string;
  consequenceQueue?: any[];
  existingNPCs?: any[];
  realisticAttributes?: Record<string, any>;
  descriptors?: Record<string, any>;
  isTimeJump?: boolean;
  timeJumpYears?: number;
  memoriaNarrador?: { notasLibres?: string; reglasDeLaPartida?: string; hechosCanonicos?: string[] };
}): string {
  const nearbyNPCs = (config.worldState.nearbyNPCs || [])
    .map((n: any) => `${n.name} (${n.disposition})`).join(', ');

  const recentHistoryText = config.recentHistory.slice(-12)
    .map((e: any) => `- [${e.timestampIngame || e.timestamp_ingame || '?'}] ${e.narrativeSnapshot || e.narrative_snapshot || e.text || ''}`)
    .join('\n');

  const echoText = config.activeEchoes
    .filter((e: any) => (e.discoveryDifficulty ?? 1) < 0.7)
    .map((e: any) => `- ${e.echoType}: ${(e.echoData as any)?.currentManifestations?.[0]?.description || ''}`)
    .join('\n') || 'ninguno disponible ahora';

  const existingNPCNames = (config.existingNPCs || []).map((n: any) => n.name).join(', ');

  const consequenceText = (config.consequenceQueue || [])
    .map((c: any) => `⚡ CONSECUENCIA QUE SE MANIFIESTA AHORA: ${c.description}`)
    .join('\n');

  const attrs = config.realisticAttributes || {};
  const desc = config.descriptors || {};

  const attributesBlock = Object.keys(attrs).length > 0 ? `
ATRIBUTOS REALISTAS DEL PERSONAJE (afectan mecánicamente la narrativa):
DIMENSIONES VITALES:
- Integridad Física: ${attrs.integridadFisica || 'Impecable'}
- Reserva Metabólica: ${attrs.reservaMetabolica || 'Saciado'}
- Carga Cognitiva: ${attrs.cargaCognitiva || 'Alerta'}
- Umbral de Estrés: ${attrs.umbralDeEstres || 'Imperturbable'}
PERFIL DE COMPETENCIA:
- Aptitud Motriz: ${attrs.aptitudMotriz || 'Funcional'}
- Intelecto Aplicado: ${attrs.intelectoAplicado || 'Promedio'}
- Presencia Social: ${attrs.presenciaSocial || 'Común'}
- Estatus de Casta: ${attrs.estatusDeCasta || 'Plebeyo'}` : '';

  const descriptorsBlock = `
POSICIONAMIENTO Y REPUTACIÓN:
- Condición Social: ${desc.condicionSocial || config.character?.socialClass || 'Desconocida'}
- Reputación Local: ${desc.reputacionLocal || 'Desconocido'}
- Renombre Global: ${desc.renombreGlobal || 'Anónimo'}
- Relaciones Activas: ${(desc.relacionesActivas || []).join(', ') || 'ninguna registrada'}`;

  const timeJumpBlock = config.isTimeJump ? `
INSTRUCCIÓN DE SALTO TEMPORAL: El personaje ha decidido avanzar ${config.timeJumpYears} años en el tiempo.
Narra TODO lo que ocurre en esos ${config.timeJumpYears} años de manera cinematográfica y detallada.
Mínimo 600 palabras. Cubre momentos clave, cambios de vida, envejecimiento de NPCs, cambios de atributos.` : '';

  const mem = config.memoriaNarrador;
  const memoriaBlock = (mem && (mem.notasLibres || mem.reglasDeLaPartida || (mem.hechosCanonicos || []).length > 0)) ? `

═══════════════════════════════════════════
MEMORIA DEL NARRADOR (instrucciones del jugador — de máxima prioridad):
${mem.reglasDeLaPartida ? `REGLAS DE ESTA PARTIDA (nunca violar):\n${mem.reglasDeLaPartida}` : ''}
${mem.notasLibres ? `NOTAS ADICIONALES:\n${mem.notasLibres}` : ''}
${(mem.hechosCanonicos || []).length > 0 ? `HECHOS CANÓNICOS (verdades inmutables):\n${mem.hechosCanonicos!.map((h) => `• ${h}`).join('\n')}` : ''}
═══════════════════════════════════════════` : '';

  return `FECHA/HORA ACTUAL EN EL JUEGO: ${config.inGameDateTime || 'Desconocida'}
UBICACIÓN: ${config.currentLocation?.name || 'Desconocida'} — ${config.currentLocation?.description || ''}

ESTADO DEL PERSONAJE:
- Nombre: ${config.character?.name || 'Desconocido'}, Edad: ${config.character?.age ?? 0} años
- Salud: ${config.character?.stats?.health ?? 100}/100
- Energía: ${config.character?.stats?.energy ?? 100}/100
- Hambre: ${config.character?.stats?.hunger ?? 50}/100
- Moral: ${config.character?.stats?.morale ?? 70}/100
- Salud mental: ${config.character?.stats?.mentalHealth ?? 80}/100
${attributesBlock}
${descriptorsBlock}

ESTADO DEL MUNDO:
- Estación: ${config.worldState?.season || 'primavera'}
- Clima: ${config.worldState?.weather || 'despejado'}
- Clima político: ${config.worldState?.politicalClimate || 'estable'}
- Conflictos activos: ${(config.worldState?.activeConflicts || []).join(', ') || 'ninguno'}
- NPCs cercanos: ${nearbyNPCs || 'ninguno'}
- NPCs conocidos: ${existingNPCNames || 'ninguno aún'}

${config.innerVoiceContext ? `VOZ INTERIOR DEL PERSONAJE (pensamientos recientes): "${config.innerVoiceContext}"` : ''}

HISTORIAL RECIENTE:
${recentHistoryText || 'Sin historial — esto es el comienzo.'}

${consequenceText ? `\n${consequenceText}` : ''}

ECOS DE VIDAS PASADAS (integrar naturalmente si aplica, nunca mencionar explícitamente):
${echoText}
${memoriaBlock}
${timeJumpBlock}
ACCIÓN DEL JUGADOR: "${config.playerAction}"

Narra el resultado de esta acción. Sé específico. Sé consecuente. Avanza el tiempo solo lo que la acción justifica.`;
}

router.post("/generate", async (req, res) => {
  try {
    const {
      playerAction, voice, tone, character, worldState,
      recentHistory = [], activeEchoes = [], currentLocation,
      inGameDateTime, era, gameConfig, innerVoiceContext,
      consequenceQueue, existingNPCs, currentTurn,
      realisticAttributes, descriptors,
      isTimeJump, timeJumpYears, memoriaNarrador,
    } = req.body;

    if (!playerAction) return res.status(400).json({ error: "playerAction required" });

    const systemPrompt = buildSystemPrompt({
      gameConfig: gameConfig || {}, voice, tone, era: era || {}, character, currentTurn,
      isTimeJump, timeJumpYears,
    });
    const userPrompt = buildUserPrompt({
      character, worldState, recentHistory, activeEchoes,
      playerAction, currentLocation: currentLocation || {}, inGameDateTime,
      innerVoiceContext, consequenceQueue, existingNPCs,
      realisticAttributes, descriptors, isTimeJump, timeJumpYears, memoriaNarrador,
    });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    const rawText = content.text;
    const sepIdx = rawText.indexOf('---META---');

    let narrative: string;
    let meta: any = {};

    if (sepIdx !== -1) {
      narrative = rawText.slice(0, sepIdx).trim();
      const metaPart = rawText.slice(sepIdx + 10).trim();
      try {
        const jsonMatch = metaPart.match(/\{[\s\S]*\}/);
        if (jsonMatch) meta = JSON.parse(jsonMatch[0]);
      } catch {
        meta = {};
      }
    } else {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          meta = JSON.parse(jsonMatch[0]);
          narrative = meta.narrative || rawText;
        } catch {
          narrative = rawText;
        }
      } else {
        narrative = rawText;
      }
    }

    res.json({
      narrative,
      timeAdvanced: meta.timeAdvanced ?? 30,
      eventType: meta.eventType ?? "action",
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
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate narrative" });
  }
});

router.post("/stream", async (req, res) => {
  try {
    const {
      playerAction, voice, tone, character, worldState,
      recentHistory = [], activeEchoes = [], currentLocation,
      inGameDateTime, era, gameConfig, innerVoiceContext,
      consequenceQueue, existingNPCs, currentTurn,
      realisticAttributes, descriptors,
      isTimeJump, timeJumpYears, memoriaNarrador,
    } = req.body;

    if (!playerAction) return res.status(400).json({ error: "playerAction required" });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    const systemPrompt = buildSystemPrompt({
      gameConfig: gameConfig || {}, voice, tone, era: era || {}, character, currentTurn,
      isTimeJump, timeJumpYears,
    });
    const userPrompt = buildUserPrompt({
      character, worldState, recentHistory, activeEchoes,
      playerAction, currentLocation: currentLocation || {}, inGameDateTime,
      innerVoiceContext, consequenceQueue, existingNPCs,
      realisticAttributes, descriptors, isTimeJump, timeJumpYears, memoriaNarrador,
    });

    const stream = await anthropic.messages.stream({
      model: MODEL,
      max_tokens: 8192,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        res.write(chunk.delta.text);
      }
    }

    res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to stream narrative" });
    } else {
      res.end();
    }
  }
});

router.post("/dream", async (req, res) => {
  try {
    const { character, emotionalClimate, innerVoiceLog = [], recentEvents = [], era } = req.body;

    const prompt = `El personaje ${character?.name || 'el personaje'} (${character?.age ?? 0} años) acaba de dormirse en ${era?.eraLabel || 'su época'}.
Estado emocional actual: ${emotionalClimate || 'sereno'}
Pensamientos recientes: ${innerVoiceLog.slice(-3).join(' | ') || 'ninguno'}
Eventos recientes: ${recentEvents.slice(-3).join(' | ') || 'ninguno'}

Genera un sueño breve (2-3 párrafos en español) que refleje su estado psicológico. El sueño puede ser:
- Simbólico (metáforas de sus miedos/deseos)
- Un recuerdo distorsionado
- Una visión premonitoria vaga
- Puro absurdo onírico

Empieza directamente con el sueño, sin introducción. Usa lenguaje poético y evocador.`;

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    res.json({ dream: content.type === "text" ? content.text : "Un sueño que se disuelve al despertar..." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate dream" });
  }
});

router.post("/summarize-run", async (req, res) => {
  try {
    const { runId, events, character, era, endCause } = req.body;
    if (!runId || !events || !character || !era || !endCause) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const significantEvents = events
      .filter((e: any) => (e.legacyWeight || 0) > 0.4)
      .slice(0, 20)
      .map((e: any) => `- [${e.timestampIngame}] ${e.narrativeSnapshot}`)
      .join('\n');

    const prompt = `Escribe un resumen literario de 2-3 párrafos de esta vida completada. En español.
Personaje: ${character.name}, ${character.age} años, en ${era.eraLabel || era.eraName}.
Causa del fin: ${endCause}

Momentos más significativos:
${significantEvents || 'Una vida tranquila con pocos momentos registrados.'}

Escribe en tercera persona, tiempo pasado. Hazlo sentir como un epitafio o registro histórico. Sé específico sobre quién fue esta persona.`;

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    res.json({ summary: content.type === "text" ? content.text : "Una vida que pasó en silencio." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to summarize run" });
  }
});

export default router;
