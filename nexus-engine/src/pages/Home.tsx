import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, User, Globe, Settings, Lock, ChevronRight, X } from 'lucide-react';
import { useEngineStore } from '@/store/engine-store';

export default function Home() {
  const [, setLocation] = useLocation();
  const { activeRun, currentGame } = useEngineStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showExodusInfo, setShowExodusInfo] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; alpha: number; size: number }[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.5 + 0.1,
        size: Math.random() * 2 + 0.5,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(61, 142, 255, ${p.alpha})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col bg-background overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/80 z-0 pointer-events-none" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="font-mono text-xs tracking-[0.4em] text-[#3d8eff]/60 mb-3 uppercase">Sistema de Simulación de Vidas</div>
            <h1 className="font-display font-extrabold text-6xl md:text-8xl tracking-tighter text-[#eef2f8] drop-shadow-[0_0_40px_rgba(61,142,255,0.15)]">
              NEXUS
            </h1>
            <h2 className="font-display font-bold text-4xl md:text-5xl tracking-tight text-[#3d8eff]/80 -mt-2">
              ENGINE
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-12"
          >
            <GameCard
              id="una-vida"
              name="UNA VIDA"
              tagline="Vive cualquier vida, en cualquier época, en la Tierra. Sin objetivos. Simplemente existe."
              status="DISPONIBLE"
              gradient="from-[#0a2040] via-[#0a1a30] to-[#051020]"
              accentColor="#3d8eff"
              accentTeal="#00d4a8"
              hasActiveRun={activeRun?.gameId === 'una-vida'}
              activeRunId={activeRun?.runId}
              onPlay={() => setLocation('/new-run')}
              onContinue={() => activeRun && setLocation(`/game/${activeRun.runId}`)}
            />
            <GameCard
              id="exodus"
              name="EXODUS"
              tagline="La Tierra ya no existe. Encuentra un nuevo hogar."
              status="PRÓXIMAMENTE"
              gradient="from-[#080a14] via-[#060810] to-[#030508]"
              accentColor="#5a6478"
              accentTeal="#5a6478"
              locked
              onPlay={() => setShowExodusInfo(true)}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex items-center gap-4"
          >
            <NavButton icon={<User size={14} />} label="Perfil" onClick={() => setLocation('/profile')} />
            <NavButton icon={<Globe size={14} />} label="Mundos" onClick={() => setLocation('/world-builder')} />
            <NavButton icon={<Settings size={14} />} label="Configuración" onClick={() => setLocation('/settings')} />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showExodusInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowExodusInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0f1218] border border-[#1e2530] rounded-2xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="font-mono text-xs text-[#5a6478] tracking-widest mb-1">PRÓXIMAMENTE</div>
                  <h2 className="font-display font-bold text-3xl text-[#eef2f8]">EXODUS</h2>
                </div>
                <button onClick={() => setShowExodusInfo(false)} className="text-[#5a6478] hover:text-[#eef2f8] transition-colors">
                  <X size={20} />
                </button>
              </div>
              <p className="font-serif italic text-[#c8d0dc] text-lg mb-6 leading-relaxed">
                "La Tierra ya no existe. Encuentra un nuevo hogar."
              </p>
              <p className="text-[#5a6478] font-serif leading-relaxed">
                EXODUS lleva la simulación al espacio. Sin la Tierra como ancla, la humanidad dispersa construye nuevas civilizaciones en mundos desconocidos. Cada decisión es un acto de fundación. Cada error, una extinción posible.
              </p>
              <div className="mt-8 pt-6 border-t border-[#1e2530] flex justify-end">
                <button onClick={() => setShowExodusInfo(false)} className="font-mono text-sm text-[#5a6478] hover:text-[#eef2f8] transition-colors">
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GameCard({
  id, name, tagline, status, gradient, accentColor, accentTeal,
  locked, hasActiveRun, activeRunId, onPlay, onContinue,
}: {
  id: string; name: string; tagline: string; status: string; gradient: string;
  accentColor: string; accentTeal?: string; locked?: boolean;
  hasActiveRun?: boolean; activeRunId?: string;
  onPlay: () => void; onContinue?: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: locked ? 1 : 1.01, y: locked ? 0 : -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative rounded-2xl border overflow-hidden flex flex-col`}
      style={{ borderColor: locked ? '#1e2530' : `${accentColor}30`, background: `linear-gradient(135deg, ${gradient.replace('from-', '').replace('via-', '').replace('to-', '').split(' ').join(', ')})` }}
    >
      <div className={`bg-gradient-to-br ${gradient} p-6 flex flex-col flex-1 min-h-[280px]`}>
        {hasActiveRun && (
          <div className="mb-4 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-widest text-center"
            style={{ background: `${accentTeal}20`, color: accentTeal, border: `1px solid ${accentTeal}40` }}>
            ▶ PARTIDA ACTIVA — CONTINUAR
          </div>
        )}

        <div className="flex justify-between items-start mb-4">
          <div className="font-mono text-[10px] tracking-widest px-2 py-1 rounded"
            style={{ color: locked ? '#5a6478' : accentColor, background: locked ? '#1e253010' : `${accentColor}15`, border: `1px solid ${locked ? '#1e2530' : accentColor + '30'}` }}>
            {status}
          </div>
          {locked && <Lock size={14} className="text-[#5a6478]" />}
        </div>

        <div className="flex-1">
          <h3 className="font-display font-extrabold text-3xl mb-3 tracking-tight"
            style={{ color: locked ? '#5a6478' : '#eef2f8' }}>
            {name}
          </h3>
          <p className="font-serif italic text-sm leading-relaxed"
            style={{ color: locked ? '#5a6478' : '#c8d0dc' }}>
            {tagline}
          </p>
        </div>

        <div className="mt-6 flex gap-2">
          {hasActiveRun && onContinue ? (
            <>
              <button
                onClick={onContinue}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-mono text-sm font-bold transition-all active:scale-95"
                style={{ background: `${accentTeal}20`, color: accentTeal, border: `1px solid ${accentTeal}50` }}
              >
                <Play size={14} /> Continuar
              </button>
              <button
                onClick={onPlay}
                className="px-4 py-3 rounded-lg font-mono text-xs transition-all active:scale-95"
                style={{ background: '#1e253050', color: '#5a6478', border: '1px solid #1e2530' }}
              >
                Nueva
              </button>
            </>
          ) : (
            <button
              onClick={onPlay}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-mono text-sm font-bold transition-all active:scale-95"
              style={{
                background: locked ? '#1e253030' : `${accentColor}20`,
                color: locked ? '#5a6478' : accentColor,
                border: `1px solid ${locked ? '#1e2530' : accentColor + '50'}`,
              }}
            >
              {locked ? (
                <><Lock size={14} /> Próximamente</>
              ) : (
                <><ChevronRight size={14} /> Jugar</>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function NavButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs text-[#c8d0dc] hover:text-[#eef2f8] border border-[#1e2530] hover:border-[#3d8eff]/30 bg-[#0f1218]/80 hover:bg-[#141820] transition-all active:scale-95 backdrop-blur-sm"
    >
      {icon}
      {label}
    </button>
  );
}
