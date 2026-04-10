import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap, ZapOff } from 'lucide-react';
import { useEngineStore } from '@/store/engine-store';

export default function Settings() {
  const [, setLocation] = useLocation();
  const { settings, updateSettings, narrativeVoice, setNarrativeVoice } = useEngineStore();
  const [apiStatus] = useState({ claude: true, image: false });

  const toggleSub = (key: keyof typeof settings.explicitSubToggles) => {
    updateSettings({
      explicitSubToggles: { ...settings.explicitSubToggles, [key]: !settings.explicitSubToggles[key] },
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0c0f] text-[#eef2f8]">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => setLocation('/')}
            className="flex items-center gap-2 text-[#5a6478] hover:text-[#eef2f8] font-mono text-sm mb-8 transition-colors"
          >
            <ArrowLeft size={16} /> Volver
          </button>

          <h1 className="font-display font-bold text-4xl mb-2">Configuración</h1>
          <p className="font-mono text-xs text-[#5a6478] mb-12 tracking-widest">SISTEMA NEXUS ENGINE</p>

          <div className="space-y-8">
            <Section title="Modo Explícito">
              <p className="font-serif italic text-[#5a6478] text-sm mb-4">
                Controla qué contenido se narra sin filtros. Todos los eventos ocurren igualmente; esta opción cambia cómo se describen.
              </p>
              <Toggle
                label="Modo Explícito (Master)"
                description="Activa el control granular del contenido"
                checked={settings.explicitMode}
                onChange={(v) => updateSettings({ explicitMode: v })}
                accent="#f5a623"
              />
              {settings.explicitMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 ml-4 space-y-3 border-l-2 border-[#f5a623]/20 pl-4"
                >
                  <SubToggle label="Violencia y gore" checked={settings.explicitSubToggles.violence} onChange={() => toggleSub('violence')} />
                  <SubToggle label="Lenguaje vulgar y groserías" checked={settings.explicitSubToggles.language} onChange={() => toggleSub('language')} />
                  <SubToggle label="Contenido sexual" checked={settings.explicitSubToggles.sexual} onChange={() => toggleSub('sexual')} />
                  <SubToggle label="Tortura y crueldad extrema" checked={settings.explicitSubToggles.torture} onChange={() => toggleSub('torture')} />
                  <SubToggle label="Consumo de sustancias detallado" checked={settings.explicitSubToggles.substances} onChange={() => toggleSub('substances')} />
                  <SubToggle label="Trauma psicológico explícito" checked={settings.explicitSubToggles.psychologicalTrauma} onChange={() => toggleSub('psychologicalTrauma')} />
                </motion.div>
              )}
            </Section>

            <Section title="Narración">
              <Toggle
                label="Mostrar descriptores ocultos de NPCs"
                description="Revela todos los descriptores independientemente de la familiaridad"
                checked={settings.showNpcDescriptors}
                onChange={(v) => updateSettings({ showNpcDescriptors: v })}
              />
              <div className="mt-4">
                <Toggle
                  label="Perspectivas externas"
                  description="El narrador cambia brevemente al punto de vista de un NPC en momentos dramáticos"
                  checked={settings.otherPerspectives}
                  onChange={(v) => updateSettings({ otherPerspectives: v })}
                />
              </div>
              <div className="mt-4">
                <Toggle
                  label="Tiempo subjetivo"
                  description="Narración con dilatación temporal según el estado emocional"
                  checked={settings.subjectiveTime}
                  onChange={(v) => updateSettings({ subjectiveTime: v })}
                />
              </div>
              <div className="mt-6">
                <label className="block font-mono text-xs text-[#5a6478] tracking-widest mb-3">VOZ NARRATIVA POR DEFECTO</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'third_person', label: 'Narrador externo', desc: 'Tercera persona. El narrador observa al personaje como autor.' },
                    { id: 'first_person', label: 'Primera persona', desc: 'Segunda persona presente. "Entras a la taberna. Sientes el peso..."' },
                    { id: 'world_speaks', label: 'El mundo habla', desc: 'El narrador usa diarios, cartas, voces ambientales en vez de narración directa.' },
                  ].map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setNarrativeVoice(v.id as any)}
                      className={`text-left p-4 rounded-lg border transition-all ${
                        narrativeVoice === v.id
                          ? 'border-[#3d8eff] bg-[#3d8eff]/10 text-[#eef2f8]'
                          : 'border-[#1e2530] bg-[#0f1218] text-[#5a6478] hover:border-[#3d8eff]/30 hover:text-[#c8d0dc]'
                      }`}
                    >
                      <div className="font-mono text-sm font-bold mb-1">{v.label}</div>
                      <div className="font-serif text-xs italic">{v.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Generación de Imágenes">
              <div className="mb-4 p-4 rounded-xl border border-[#f5a623]/20 bg-[#f5a62305]">
                <div className="font-mono text-[10px] text-[#f5a623] tracking-widest mb-2">⚠ SE NECESITA CLAVE DE API</div>
                <p className="font-serif text-xs italic text-[#5a6478] mb-3">
                  La generación de imágenes cinematográficas requiere una clave de API de Replicate. Sin ella, esta función estará desactivada aunque el interruptor esté encendido.
                </p>
                <div className="space-y-1.5">
                  {[
                    '1. Crea una cuenta en replicate.com',
                    '2. Copia tu token de API desde la configuración de cuenta',
                    '3. Añade REPLICATE_API_TOKEN a los secretos del proyecto',
                    '4. El motor generará imágenes realistas y cinematográficas en momentos narrativamente significativos',
                  ].map((s) => (
                    <div key={s} className="font-mono text-[10px] text-[#5a6478]">{s}</div>
                  ))}
                </div>
              </div>
              <Toggle
                label="Generación de imágenes"
                description="Genera imágenes cinematográficas en momentos significativos (requiere clave Replicate)"
                checked={settings.imageGenEnabled}
                onChange={(v) => updateSettings({ imageGenEnabled: v })}
              />
              <div className="mt-6">
                <label className="block font-mono text-xs text-[#5a6478] tracking-widest mb-3">TAMAÑO DE TEXTO</label>
                <div className="flex gap-2">
                  {[
                    { id: 'sm', label: 'S' },
                    { id: 'md', label: 'M' },
                    { id: 'lg', label: 'L' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => updateSettings({ textSize: t.id as any })}
                      className={`w-12 h-12 rounded-lg font-mono text-sm font-bold border transition-all active:scale-95 ${
                        settings.textSize === t.id
                          ? 'border-[#3d8eff] bg-[#3d8eff]/20 text-[#3d8eff]'
                          : 'border-[#1e2530] bg-[#0f1218] text-[#5a6478] hover:border-[#3d8eff]/40'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Estado de APIs">
              <div className="space-y-3">
                <ApiStatus name="Claude (Anthropic)" active={apiStatus.claude} />
                <ApiStatus name="Generación de Imágenes" active={apiStatus.image} />
              </div>
            </Section>

            <Section title="Idioma">
              <div className="flex items-center gap-3 p-4 rounded-lg border border-[#1e2530] bg-[#0f1218]">
                <div className="font-mono text-sm text-[#eef2f8]">Español</div>
                <div className="font-serif italic text-xs text-[#5a6478] ml-auto">Idioma fijo</div>
              </div>
            </Section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display font-bold text-lg mb-4 text-[#eef2f8] border-b border-[#1e2530] pb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Toggle({ label, description, checked, onChange, accent = '#3d8eff' }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void; accent?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between p-4 rounded-lg border border-[#1e2530] bg-[#0f1218] hover:bg-[#141820] transition-all group text-left"
    >
      <div className="flex-1">
        <div className="font-mono text-sm text-[#eef2f8] group-hover:text-white transition-colors">{label}</div>
        {description && <div className="font-serif text-xs italic text-[#5a6478] mt-1">{description}</div>}
      </div>
      <div
        className="ml-4 w-12 h-6 rounded-full flex items-center transition-all flex-shrink-0"
        style={{ background: checked ? accent + '40' : '#1e2530', border: `1px solid ${checked ? accent : '#1e2530'}` }}
      >
        <div
          className="w-4 h-4 rounded-full mx-1 transition-all"
          style={{ background: checked ? accent : '#5a6478', transform: checked ? 'translateX(24px)' : 'translateX(0)' }}
        />
      </div>
    </button>
  );
}

function SubToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="flex items-center gap-3 w-full text-left"
    >
      <div
        className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all"
        style={{ background: checked ? '#f5a623' : 'transparent', borderColor: checked ? '#f5a623' : '#5a6478' }}
      >
        {checked && <div className="w-2 h-2 bg-black rounded-sm" />}
      </div>
      <span className="font-mono text-xs text-[#c8d0dc]">{label}</span>
    </button>
  );
}

function ApiStatus({ name, active }: { name: string; active: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-[#1e2530] bg-[#0f1218]">
      {active ? <Zap size={14} className="text-[#00d4a8]" /> : <ZapOff size={14} className="text-[#ff4444]" />}
      <span className="font-mono text-xs text-[#c8d0dc]">{name}</span>
      <span className="ml-auto font-mono text-[10px]" style={{ color: active ? '#00d4a8' : '#ff4444' }}>
        {active ? '● ACTIVO' : '● INACTIVO'}
      </span>
    </div>
  );
}
