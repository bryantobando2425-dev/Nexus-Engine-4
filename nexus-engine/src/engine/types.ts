export type PlayMode = 'HUMANO' | 'DIOS';

export type EmotionalClimate =
  | 'sereno'
  | 'ansioso'
  | 'de_duelo'
  | 'euforico'
  | 'entumecido'
  | 'desesperado'
  | 'esperanzador'
  | 'traumatizado';

export interface Descriptor {
  value: string;
  tooltip?: string;
}

// ─── SISTEMA DE ATRIBUTOS REALISTAS (SAD v4.2) ───────────────────────────────

// 1. Dimensiones Vitales (Estado Dinámico)
export type IntegridadFisica = 'Impecable' | 'Magullado' | 'Lesionado' | 'Lisiado' | 'Agonizante';
export type ReservaMetabolica = 'Saciado' | 'Nutrido' | 'Débil' | 'Famélico' | 'Desfallecido';
export type CargaCognitiva = 'Alerta' | 'Nublado' | 'Somnoliento' | 'Agotado' | 'Delirante';
export type UmbralDeEstres = 'Imperturbable' | 'Tenso' | 'Ansioso' | 'En Pánico' | 'Colapsado';

// 2. Perfil de Competencia
export type AptitudMotriz = 'Torpe' | 'Funcional' | 'Atlético' | 'Excepcional';
export type IntelectoAplicado = 'Limitado' | 'Promedio' | 'Sagaz' | 'Genio';
export type PresenciaSocial = 'Invisible' | 'Común' | 'Carismático' | 'Imponente';
export type EstatusDeCasta = 'Paria' | 'Plebeyo' | 'Influyente' | 'Noble/Elite';

// 3. Sistema de Especialización por Era
export type GradoDeAutonomia = 'Nulo' | 'Aprendiz' | 'Competente' | 'Maestro';

export interface EraSkill {
  name: string;
  grade: GradoDeAutonomia;
  category: 'Supervivencia' | 'Oficios' | 'Artes Bélicas' | 'Erudición';
}

export interface RealisticAttributes {
  // Dimensiones Vitales
  integridadFisica: IntegridadFisica;
  reservaMetabolica: ReservaMetabolica;
  cargaCognitiva: CargaCognitiva;
  umbralDeEstres: UmbralDeEstres;
  // Perfil de Competencia
  aptitudMotriz: AptitudMotriz;
  intelectoAplicado: IntelectoAplicado;
  presenciaSocial: PresenciaSocial;
  estatusDeCasta: EstatusDeCasta;
  // Habilidades de era
  eraSkills: EraSkill[];
}

// Tutorial texts for each attribute (ℹ️ icon content)
export const ATTRIBUTE_TUTORIALS: Record<keyof Omit<RealisticAttributes, 'eraSkills'>, { label: string; tutorial: string }> = {
  integridadFisica: {
    label: 'Integridad Física',
    tutorial: 'Tu cuerpo es el primer instrumento de supervivencia. En esta era, una lesión no tratada puede convertirse en gangrena. Un hueso roto mal curado deja cojo de por vida. Tu estado físico determina si puedes trabajar, huir, luchar o simplemente cargar agua. Los sanadores son escasos y caros; el descanso, un lujo que pocos se permiten. Cuando tu integridad cae a "Lisiado" o "Agonizante", el mundo entero se vuelve más lento, más doloroso y más impredecible.',
  },
  reservaMetabolica: {
    label: 'Reserva Metabólica',
    tutorial: 'El hambre no es solo malestar — es un enemigo que embota la mente, debilita los músculos y corroe la voluntad. En épocas de escasez, pasar de "Nutrido" a "Famélico" puede ocurrir en días. Un personaje "Desfallecido" pierde capacidad de razonar con claridad, comete errores que en otro estado nunca cometería, y está dispuesto a hacer cosas que contradicen sus valores más profundos. El hambre reescribe la moral.',
  },
  cargaCognitiva: {
    label: 'Carga Cognitiva',
    tutorial: 'La mente tiene un límite. Demasiado estrés, demasiadas decisiones, demasiado poco sueño... y el pensamiento se vuelve lento, neblinoso. En estado "Agotado" o "Delirante", percibes mal las intenciones de los demás, tomas decisiones que en calma nunca tomarías, y los detalles cruciales se te escapan. El sueño es la única cura real. Sin él, la mente colapsa igual que el cuerpo — solo más lentamente, y de maneras menos evidentes.',
  },
  umbralDeEstres: {
    label: 'Umbral de Estrés',
    tutorial: 'Cada era tiene sus propias formas de romper a las personas. La guerra, la pérdida, la injusticia, el terror. Tu umbral de estrés determina si actúas con lógica fría o por puro instinto animal. Un personaje "En Pánico" toma decisiones que arruinan relaciones, traiciona aliados o huye cuando debería quedarse. "Colapsado" significa que el cuerpo mismo se niega a obedecer. La recuperación es lenta, y las cicatrices psicológicas duran más que las físicas.',
  },
  aptitudMotriz: {
    label: 'Aptitud Motriz',
    tutorial: 'La fuerza bruta, la gracia en el movimiento, la coordinación entre mano y ojo. En esta época, el cuerpo es tu herramienta principal. Un campesino "Torpe" lucha más para arar el campo. Un soldado "Excepcional" sobrevive combates que matan a los demás. La aptitud motriz no se improvisa — se forja con años de trabajo físico, entrenamiento o simplemente con la crudeza de una vida dura. Define lo que puedes hacer antes de que intervenga el ingenio.',
  },
  intelectoAplicado: {
    label: 'Intelecto Aplicado',
    tutorial: 'No es solo la capacidad de leer o calcular — es la habilidad de entender sistemas: cómo funcionan las leyes, los mercados, las máquinas, los cuerpos humanos. En una era sin educación universal, un intelecto "Sagaz" puede abrir puertas que el dinero no puede comprar. Un "Genio" en la época equivocada puede ser quemado en la hoguera o coronado rey. El conocimiento es poder, pero también es peligro.',
  },
  presenciaSocial: {
    label: 'Presencia Social',
    tutorial: 'Hay personas que entran a una sala y el aire cambia. Y hay personas que pasan toda su vida sin que nadie las note. Tu presencia social no es solo carisma — es la forma en que los demás te perciben en los primeros segundos, si te dan crédito antes de que hables, si sienten que pueden seguirte o si te ignoran. En una sociedad donde la primera impresión puede decidir tu destino, esto vale tanto como la espada.',
  },
  estatusDeCasta: {
    label: 'Estatus de Casta/Clase',
    tutorial: 'Naciste en algún lugar de la jerarquía, y ese lugar define qué puertas están abiertas para ti. Un "Paria" no puede entrar a ciertos edificios, no puede presentar quejas ante la ley, no puede casarse con ciertas personas. Un "Noble/Elite" tiene crédito antes de abrir la boca. Este atributo no es fijo — puede cambiar con acciones heroicas o caídas en desgracia. Pero cambiarlo es una de las empresas más difíciles que existe en cualquier sociedad humana.',
  },
};

// ─── DESCRIPTORES Y ESTADO ────────────────────────────────────────────────────

export interface CharacterDescriptors {
  estadoFisico: string;
  condicionMental: string;
  combate: string;
  habilidadesSociales: string;
  conocimiento: string;
  condicionSocial: string;
  reputacionLocal: string;
  renombreGlobal: string;
  relacionesActivas: string[];
}

export interface NarrativeTurn {
  id: string;
  role: 'user' | 'narrator' | 'dream' | 'perspective';
  text: string;
  imageUrl?: string;
  imagePrompt?: string;
  ingameDate?: string;
  mood?: string;
  eventType?: string;
  legacyWeight?: number;
  timestamp: number;
  inputType?: 'action' | 'speak' | 'observe' | 'think' | 'free';
  hiddenLayer?: string;
  tags?: { people?: string[]; location?: string; emotionalWeight?: number; themes?: string[] };
}

export interface WorldState {
  currentLocation: { name: string; description: string };
  season: string;
  weather: string;
  timeOfDay: string;
  ingameYear: number;
  ingameDate: string;
  ingameAge: number;
  politicalClimate?: string;
  activeConflicts?: string[];
}

export interface NPCCard {
  id: string;
  name: string;
  estimatedAge?: number;
  gender?: string;
  socialClass?: string;
  occupation?: string;
  lastKnownLocation?: string;
  descriptors?: Partial<CharacterDescriptors>;
  relationship?: {
    type: string;
    emotionalCharge: string;
    keyMoments: string[];
    lastAttitude?: string;
  };
  knownInventory?: string[];
  knownMotivations?: string;
  knownHistory?: string;
  status: 'vivo' | 'muerto' | 'desaparecido';
  deathDetails?: string;
  portraitUrl?: string;
  isAnimal?: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  condition: 'nuevo' | 'usado' | 'deteriorado' | 'roto';
  isSpecial?: boolean;
  eraOrigin?: string;
}

export interface Faccion {
  id: string;
  name: string;
  type: 'política' | 'religiosa' | 'militar' | 'criminal' | 'comercial' | 'social' | 'otra';
  description: string;
  relationToPlayer: 'aliado' | 'neutral' | 'hostil' | 'desconocido';
  influenceLevel: 'local' | 'regional' | 'nacional' | 'global';
  knownMembers: string[];
  knownGoals?: string;
  playerReputation: number;
  discoveredAt?: string;
}

export interface MemoriaNarrador {
  notasLibres: string;
  reglasDeLaPartida: string;
  hechosCanonicos: string[];
}

export interface ActiveRun {
  runId: string;
  gameId: string;
  playMode: PlayMode;
  character: Record<string, any>;
  eraConfig: Record<string, any>;
  worldState: WorldState;
  descriptors: CharacterDescriptors;
  realisticAttributes: RealisticAttributes;
  narrativeHistory: NarrativeTurn[];
  innerVoiceLog: string[];
  emotionalClimate: EmotionalClimate;
  suggestedActions: string[];
  secretsQueue: string[];
  consequenceQueue: Array<{ description: string; scheduledTurn: number; sourceAction: string }>;
  turnCount: number;
  totalMinutesElapsed: number;
  npcs: NPCCard[];
  inventory: InventoryItem[];
  currency: { amount: number; name: string; context?: string };
  personalHistory: Array<{ date: string; description: string; emotionalWeight: number }>;
  moments: Array<{ imageUrl?: string; date: string; context: string }>;
  facciones: Faccion[];
  memoriaNarrador: MemoriaNarrador;
  exploredLocations: Array<{ name: string; description: string; visitedAt: string }>;
  savedAt?: number;
  endCause?: string;
  endedAt?: number;
}

export interface GameConfig {
  id: string;
  name: string;
  tagline: string;
  description: string;
  status: 'playable' | 'locked';
  backgroundGradient: string;
  accentColor: string;
  narrativePersonality: string;
  defaultVoice: string;
  allowsGodMode: boolean;
}

export interface WorldBuilderConfig {
  id: string;
  name: string;
  eraLabel: string;
  yearRange: [number, number];
  geography: string;
  techLevel: string;
  politicalSystem: string;
  religion: string;
  economy: string;
  languages: string;
  fauna: string;
  specialRules: {
    magic: boolean;
    magicType?: string;
    uniqueDiseases?: Array<{ name: string; description: string; transmission: string }>;
    customRules?: string[];
  };
  dangerLevel: number;
  predefinedEvents: Array<{ year: number; description: string }>;
  freeNotes: string;
  currency?: { name: string; type: string };
  moneyInequalityLevel?: number;
  createdAt: number;
}

export interface AppSettings {
  explicitMode: boolean;
  explicitSubToggles: {
    violence: boolean;
    language: boolean;
    sexual: boolean;
    torture: boolean;
    substances: boolean;
    psychologicalTrauma: boolean;
  };
  showNpcDescriptors: boolean;
  otherPerspectives: boolean;
  defaultVoice: 'third_person' | 'first_person' | 'world_speaks';
  textSize: 'sm' | 'md' | 'lg';
  imageGenEnabled: boolean;
  subjectiveTime: boolean;
}

// Helper: derive initial RealisticAttributes from social class
export function deriveInitialAttributes(socialClass: string): RealisticAttributes {
  const eliteClasses = ['Noble', 'Rey', 'Aristócrata', 'Patricio', 'Gobernante', 'Noble/Elite', 'Élite'];
  const midClasses = ['Mercader', 'Burgués', 'Clérigo', 'Intelectual', 'Profesional', 'Empresario'];
  const highPhysicalClasses = ['Soldado', 'Caballero', 'Militar'];

  let estatusDeCasta: EstatusDeCasta = 'Plebeyo';
  let aptitudMotriz: AptitudMotriz = 'Funcional';
  let intelectoAplicado: IntelectoAplicado = 'Promedio';
  let presenciaSocial: PresenciaSocial = 'Común';

  if (eliteClasses.some(c => socialClass.includes(c))) {
    estatusDeCasta = 'Noble/Elite';
    presenciaSocial = 'Imponente';
    intelectoAplicado = 'Sagaz';
  } else if (midClasses.some(c => socialClass.includes(c))) {
    estatusDeCasta = 'Influyente';
    intelectoAplicado = 'Sagaz';
    presenciaSocial = 'Carismático';
  } else if (socialClass.includes('Esclavo') || socialClass.includes('Paria') || socialClass.includes('Marginado')) {
    estatusDeCasta = 'Paria';
    presenciaSocial = 'Invisible';
  } else if (highPhysicalClasses.some(c => socialClass.includes(c))) {
    aptitudMotriz = 'Atlético';
  }

  return {
    integridadFisica: 'Impecable',
    reservaMetabolica: 'Saciado',
    cargaCognitiva: 'Alerta',
    umbralDeEstres: 'Imperturbable',
    aptitudMotriz,
    intelectoAplicado,
    presenciaSocial,
    estatusDeCasta,
    eraSkills: [],
  };
}
