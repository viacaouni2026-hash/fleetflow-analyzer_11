import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { 
  ArrowRight, 
  Sparkles, 
  Layers, 
  Activity, 
  ShieldCheck, 
  Zap, 
  Cpu, 
  Database, 
  BarChart3, 
  Radio, 
  Compass, 
  CheckCircle2, 
  Eye, 
  Flame,
  Clock,
  Calendar,
  HardDrive
} from 'lucide-react';
import { LastValidSaveInfo } from '../types';

export type Glass3DPreset = 'cinematic-skew' | 'diagonal-iso' | 'diagonal-deep' | 'floating-tilt' | 'isometric-flat';

export interface Landing3DConfig {
  preset: Glass3DPreset;
  neonColor: 'cyan' | 'emerald' | 'purple' | 'gold';
  glassThickness: 'ultra' | 'pro' | 'crystal';
  enableFloating: boolean;
  enableAurora: boolean;
  enableLightBeams: boolean;
}

interface LandingPageProps {
  onStart: () => void;
  lastValidSave?: LastValidSaveInfo | null;
}

export const PRESETS: {
  id: Glass3DPreset;
  label: string;
  badge: string;
  desc: string;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  scale: number;
  textDepth: number;
}[] = [
  {
    id: 'cinematic-skew',
    label: 'Parede de Vidro Apple (Padrão)',
    badge: 'PADRÃO 3D',
    desc: 'Perspectiva diagonal estilo keynote com parede de vidro e luz especular nas arestas',
    rotateX: 10,
    rotateY: 20,
    rotateZ: -2,
    scale: 1.02,
    textDepth: 50
  },
  {
    id: 'diagonal-iso',
    label: 'Diagonal Isométrica',
    badge: 'ISOMÉTRICO',
    desc: 'Visão em diagonal clássica com parede de vidro e letreiros em camadas 3D',
    rotateX: 14,
    rotateY: -22,
    rotateZ: 2,
    scale: 1.02,
    textDepth: 45
  },
  {
    id: 'diagonal-deep',
    label: 'Diagonal Profunda VIP',
    badge: 'ÂNGULO FORTE',
    desc: 'Ângulo de alta projeção com relevo acentuado e reflexos de vidro espelhado',
    rotateX: 20,
    rotateY: -32,
    rotateZ: 4,
    scale: 1.05,
    textDepth: 65
  },
  {
    id: 'floating-tilt',
    label: 'Giroscópio Dinâmico (Mouse)',
    badge: 'INTERATIVO',
    desc: 'Vidro reativo com inclinação viva e física de amortecimento em tempo real',
    rotateX: 8,
    rotateY: -10,
    rotateZ: 0,
    scale: 1.03,
    textDepth: 40
  },
  {
    id: 'isometric-flat',
    label: 'Frontal Suave 3D',
    badge: 'FRONTAL',
    desc: 'Alinhamento com profundidade de campo sutil e glow envolvente',
    rotateX: 4,
    rotateY: -4,
    rotateZ: 0,
    scale: 1.0,
    textDepth: 25
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, lastValidSave }) => {
  const [saveInfo, setSaveInfo] = useState<LastValidSaveInfo | null>(() => {
    if (lastValidSave) return lastValidSave;
    try {
      const saved = localStorage.getItem('fleet_last_valid_save');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (lastValidSave) {
      setSaveInfo(lastValidSave);
    } else {
      try {
        const saved = localStorage.getItem('fleet_last_valid_save');
        if (saved) setSaveInfo(JSON.parse(saved));
      } catch {
        // no-op
      }
    }
  }, [lastValidSave]);

  // Read configured options from localStorage (configured in Aba Configurações)
  // Default is 'cinematic-skew' (Parede de Vidro Apple 3D)
  const [currentPreset] = useState<Glass3DPreset>(() => {
    const saved = localStorage.getItem('fleet_landing_preset');
    return (saved as Glass3DPreset) || 'cinematic-skew';
  });

  const [neonColor] = useState<'cyan' | 'emerald' | 'purple' | 'gold'>(() => {
    const saved = localStorage.getItem('fleet_landing_neon');
    return (saved as 'cyan' | 'emerald' | 'purple' | 'gold') || 'cyan';
  });

  const [glassThickness] = useState<'ultra' | 'pro' | 'crystal'>(() => {
    const saved = localStorage.getItem('fleet_landing_glass');
    return (saved as 'ultra' | 'pro' | 'crystal') || 'pro';
  });

  const [enableFloatingAnimation] = useState<boolean>(() => {
    const saved = localStorage.getItem('fleet_landing_floating');
    return saved !== 'false';
  });

  const [enableAurora] = useState<boolean>(() => {
    const saved = localStorage.getItem('fleet_landing_aurora');
    return saved !== 'false';
  });

  const [enableLightBeams] = useState<boolean>(() => {
    const saved = localStorage.getItem('fleet_landing_beams');
    return saved !== 'false';
  });

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase());
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interactive mouse spring motion
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springCfg = { damping: 28, stiffness: 180 };
  const smoothX = useSpring(mouseX, springCfg);
  const smoothY = useSpring(mouseY, springCfg);

  const activePresetConfig = PRESETS.find(p => p.id === currentPreset) || PRESETS[0];

  // Dynamic transforms based on preset and mouse movements
  const dynamicRotateX = useTransform(smoothY, [-0.5, 0.5], [
    activePresetConfig.rotateX + 10, 
    activePresetConfig.rotateX - 10
  ]);
  
  const dynamicRotateY = useTransform(smoothX, [-0.5, 0.5], [
    activePresetConfig.rotateY - 12, 
    activePresetConfig.rotateY + 12
  ]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Color mappings
  const neonPalettes = {
    cyan: {
      primary: '#06B6D4',
      accent: '#38BDF8',
      secondary: '#14B8A6',
      glow: 'rgba(6, 182, 212, 0.55)',
      underglow: 'rgba(6, 182, 212, 0.7)',
      textGradient: 'from-cyan-300 via-teal-200 to-emerald-400',
      btnGradient: 'from-cyan-500 via-teal-400 to-emerald-500',
      auroraGradient: 'from-cyan-500/25 via-emerald-500/20 to-indigo-600/25',
      badgeBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
    },
    emerald: {
      primary: '#10B981',
      accent: '#34D399',
      secondary: '#059669',
      glow: 'rgba(16, 185, 129, 0.55)',
      underglow: 'rgba(16, 185, 129, 0.7)',
      textGradient: 'from-emerald-300 via-teal-200 to-cyan-400',
      btnGradient: 'from-emerald-500 via-teal-400 to-emerald-600',
      auroraGradient: 'from-emerald-500/25 via-teal-400/20 to-cyan-600/25',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
    },
    purple: {
      primary: '#A855F7',
      accent: '#C084FC',
      secondary: '#7C3AED',
      glow: 'rgba(168, 85, 247, 0.55)',
      underglow: 'rgba(168, 85, 247, 0.7)',
      textGradient: 'from-purple-300 via-pink-200 to-indigo-300',
      btnGradient: 'from-purple-500 via-pink-500 to-indigo-600',
      auroraGradient: 'from-purple-500/25 via-pink-500/20 to-indigo-600/25',
      badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-300'
    },
    gold: {
      primary: '#F59E0B',
      accent: '#FCD34D',
      secondary: '#D97706',
      glow: 'rgba(245, 158, 11, 0.55)',
      underglow: 'rgba(245, 158, 11, 0.7)',
      textGradient: 'from-amber-300 via-yellow-200 to-orange-400',
      btnGradient: 'from-amber-500 via-orange-400 to-amber-600',
      auroraGradient: 'from-amber-500/20 via-yellow-400/15 to-orange-600/25',
      badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-300'
    }
  };

  const currentTheme = neonPalettes[neonColor];

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-screen w-full bg-[#020617] text-slate-100 flex flex-col justify-between items-center overflow-x-hidden font-sans select-none"
    >
      {/* ========================================================================= */}
      {/* 1. NUVENS MODERNAS QUE OSCILAM O NEON (AURORA BOREAL DEEP NIGHT ENGINE)  */}
      {/* ========================================================================= */}
      {enableAurora && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Aurora Ribbon Layer 1 - Undulating Emerald/Cyan Ribbon */}
          <motion.div 
            animate={{
              x: ['-10%', '15%', '-5%', '-10%'],
              y: ['-5%', '10%', '-8%', '-5%'],
              scaleX: [1, 1.25, 0.9, 1],
              scaleY: [1, 1.35, 1.1, 1],
              opacity: [0.35, 0.6, 0.4, 0.35]
            }}
            transition={{
              duration: 16,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -top-32 left-[-15%] w-[130%] h-[550px] rounded-[100%] blur-[120px] mix-blend-screen"
            style={{
              background: `radial-gradient(ellipse at 50% 50%, ${currentTheme.primary} 0%, rgba(20, 184, 166, 0.4) 40%, transparent 75%)`
            }}
          />

          {/* Aurora Ribbon Layer 2 - Shifting Violet/Indigo Cosmic Cloud */}
          <motion.div 
            animate={{
              x: ['12%', '-15%', '8%', '12%'],
              y: ['10%', '-8%', '12%', '10%'],
              scaleX: [1.1, 0.85, 1.3, 1.1],
              scaleY: [1.2, 1.4, 0.95, 1.2],
              opacity: [0.25, 0.55, 0.3, 0.25]
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-1/4 -right-1/4 w-[110%] h-[600px] rounded-[100%] blur-[140px] mix-blend-screen"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, rgba(168, 85, 247, 0.4) 0%, rgba(99, 102, 241, 0.35) 45%, transparent 75%)'
            }}
          />

          {/* Aurora Ribbon Layer 3 - Floating Center Neon Shimmer */}
          <motion.div 
            animate={{
              x: ['-5%', '8%', '-12%', '-5%'],
              y: ['-8%', '5%', '-3%', '-8%'],
              scale: [0.9, 1.2, 1.05, 0.9],
              opacity: [0.3, 0.5, 0.25, 0.3]
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute bottom-1/4 left-1/4 w-[800px] h-[500px] rounded-full blur-[130px] mix-blend-screen"
            style={{
              background: `radial-gradient(ellipse at center, ${currentTheme.secondary} 0%, rgba(6, 182, 212, 0.35) 50%, transparent 75%)`
            }}
          />

          {/* Shimmering Aurora Wave Curtains */}
          <div 
            className="absolute inset-0 opacity-25 mix-blend-color-dodge pointer-events-none"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 35%, ${currentTheme.primary} 0%, transparent 40%),
                radial-gradient(circle at 75% 45%, #6366F1 0%, transparent 45%),
                radial-gradient(circle at 50% 80%, #10B981 0%, transparent 50%)
              `
            }}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BACKGROUND GRID, SCANNING BEAMS & PARTICLES                            */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Subtle Cyber Grid */}
        <div 
          className="absolute inset-0 bg-[#020617] opacity-85"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '44px 44px'
          }}
        />

        {/* Diagonal Light Beams & Volumetric Sweeping Rays */}
        {enableLightBeams && (
          <>
            {/* Top Spotlight */}
            <div className="absolute top-0 inset-x-0 h-[400px] bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.18),transparent_70%)]" />
            
            {/* Sweeping Diagonal Laser Ray */}
            <motion.div 
              animate={{
                x: ['-100%', '200%'],
                opacity: [0, 0.6, 0]
              }}
              transition={{
                repeat: Infinity,
                duration: 9,
                ease: 'linear'
              }}
              className="absolute -top-40 left-0 w-[500px] h-[150vh] bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -rotate-45 pointer-events-none blur-md"
            />

            {/* Secondary Laser Ray */}
            <motion.div 
              animate={{
                x: ['200%', '-100%'],
                opacity: [0, 0.4, 0]
              }}
              transition={{
                repeat: Infinity,
                duration: 13,
                ease: 'linear',
                delay: 4
              }}
              className="absolute -top-40 right-0 w-[400px] h-[150vh] bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent rotate-45 pointer-events-none blur-md"
            />
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. TOP HEADER STATUS                                                      */}
      {/* ========================================================================= */}
      <header className="relative z-20 w-full px-6 py-4 md:px-12 flex justify-between items-center border-b border-white/10 bg-slate-950/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping absolute opacity-75" />
            <div className="h-2.5 w-2.5 rounded-full bg-cyan-500 shadow-[0_0_12px_#06B6D4]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono tracking-widest text-white font-black">
              VIAÇÃO UNI
            </span>
            <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
              3D GLASS WALL
            </span>
          </div>
        </div>

        {/* Live Clock, Calendar & Last Valid Save Status */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300">
          {/* Status do Último Salvamento Válido */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/40 text-emerald-300 font-bold shadow-[0_0_15px_rgba(16,185,129,0.12)]">
            <div className="relative flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping absolute opacity-75" />
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Último Salvamento</span>
              <span className="text-[10px] sm:text-[11px] font-mono text-white font-bold truncate max-w-[150px] sm:max-w-none">
                {saveInfo?.displayString || '08/09/2026 às 13:28:45'}
              </span>
            </div>
            <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              VÁLIDO
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/60 border border-white/5">
            <Calendar size={13} className="text-cyan-400" />
            <span>{currentDate || '2026'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/80 border border-cyan-500/30 text-cyan-300 font-bold shadow-xs">
            <Clock size={13} className="text-cyan-400" />
            <span>{currentTime || '00:00:00'}</span>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 4. MAIN 3D ISOMETRIC STAGE WITH LATERAL TELEMETRY PANELS                  */}
      {/* ========================================================================= */}
      <main 
        className="relative z-10 flex-1 w-full max-w-7xl px-4 py-8 md:py-12 flex items-center justify-center gap-6 lg:gap-10"
        style={{ perspective: 1600 }}
      >
        {/* ========================================================= */}
        {/* LEFT LATERAL PANEL: TELEMETRIA 3D & EFICIÊNCIA GLOBAL     */}
        {/* ========================================================= */}
        <div className="hidden xl:flex flex-col gap-4 w-72 pointer-events-auto shrink-0">
          {/* Card Especial: Status do Último Salvamento Válido */}
          <div className="bg-slate-950/75 border border-emerald-500/40 rounded-2xl p-4.5 backdrop-blur-xl shadow-xl transition-all duration-300 hover:border-emerald-500/60 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck size={15} />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                  Salvamento Válido
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                CONCILIADO
              </span>
            </div>

            <div className="space-y-2 text-[11px] font-mono">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Data/Hora:</span>
                <span className="text-emerald-300 font-bold truncate max-w-[145px]">
                  {saveInfo?.displayString || '08/09/2026 às 13:28:45'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Momento Salvo:</span>
                <span className="text-cyan-300 font-bold truncate max-w-[125px]">
                  {saveInfo?.tabName || 'Resumo Gerencial'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Integridade:</span>
                <span className="text-emerald-400 font-bold">100% Válido & Íntegro</span>
              </div>
            </div>
          </div>

          {/* Card 1: Telemetria em Tempo Real */}
          <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4.5 backdrop-blur-xl shadow-xl transition-all duration-300 hover:border-cyan-500/40">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Activity size={14} />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Telemetria 3D
                </span>
              </div>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
                ONLINE
              </span>
            </div>

            <div className="space-y-2.5 text-[11px] font-mono">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Latência Real:</span>
                <span className="text-cyan-300 font-bold">12ms Ultra-Fast</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Banco de Dados:</span>
                <span className="text-emerald-300 font-bold">100% Conciliado</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Frota Ativa:</span>
                <span className="text-white font-bold">284 Veículos</span>
              </div>
            </div>
          </div>

          {/* Card 2: Eficiência Global */}
          <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4.5 backdrop-blur-xl shadow-xl transition-all duration-300 hover:border-emerald-500/40">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <BarChart3 size={14} />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Eficiência Global
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                +4.12 KM/L
              </span>
            </div>

            <div className="space-y-2.5 text-[11px] font-mono">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Auditoria Ordens:</span>
                <span className="text-cyan-300 font-bold">Certificado ISO</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Volume Monitorado:</span>
                <span className="text-emerald-300 font-bold">4.2M Litros</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Conformidade:</span>
                <span className="text-white font-bold">98.6% Nominal</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CENTER: 3D FLOATING GLASS MONOLITH (PAREDE DE VIDRO APPLE)*/}
        {/* ========================================================= */}
        <motion.div
          animate={
            enableFloatingAnimation
              ? {
                  y: [-8, 8, -8],
                  transition: {
                    repeat: Infinity,
                    duration: 5.5,
                    ease: 'easeInOut'
                  }
                }
              : {}
          }
          style={{
            transformStyle: 'preserve-3d',
            rotateX: dynamicRotateX,
            rotateY: dynamicRotateY,
            rotateZ: activePresetConfig.rotateZ,
            scale: activePresetConfig.scale
          }}
          className="relative w-full max-w-[430px] sm:max-w-[470px] md:max-w-[490px] shrink-0"
        >
          {/* A. 3D PROJECTED CAST SHADOW ON VIRTUAL BACK-WALL */}
          <div 
            className="absolute inset-0 rounded-[38px] pointer-events-none transition-all duration-700"
            style={{
              transform: 'translateZ(-80px) translateY(30px) scale(0.95)',
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, transparent 80%)',
              filter: 'blur(35px)',
              boxShadow: `0 40px 100px 20px ${currentTheme.glow}`
            }}
          />

          {/* B. IPHONE GLASS SLAB (PAREDE DE VIDRO COM BISÉIS E REFRAÇÃO) */}
          <div 
            className={`
              relative w-full rounded-[38px] p-7 sm:p-9 md:p-10 text-center
              border border-white/20 transition-all duration-500
              shadow-[0_40px_120px_-20px_rgba(0,0,0,0.95),inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.6)]
              ${
                glassThickness === 'ultra' 
                  ? 'bg-slate-950/80 backdrop-blur-3xl border-white/30' 
                  : glassThickness === 'crystal'
                  ? 'bg-slate-950/40 backdrop-blur-xl border-cyan-400/30'
                  : 'bg-slate-950/65 backdrop-blur-2xl border-white/20'
              }
            `}
            style={{
              transformStyle: 'preserve-3d',
              boxShadow: `
                0 30px 90px -10px rgba(0,0,0,0.95),
                0 0 60px -10px ${currentTheme.glow},
                inset 0 1.5px 2px rgba(255,255,255,0.5),
                inset 0 0 20px rgba(255,255,255,0.03)
              `
            }}
          >
            {/* Glass Edge Specular Light Flare (Reflexo de Vidro iPhone) */}
            <div 
              className="absolute inset-x-8 top-0 h-[2px] pointer-events-none rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 50%, transparent 100%)',
                boxShadow: '0 0 10px rgba(255,255,255,0.85)'
              }}
            />
            
            {/* Neon Border Rim Flare */}
            <div 
              className="absolute inset-0 rounded-[38px] pointer-events-none transition-all duration-500"
              style={{
                border: `1.5px solid ${currentTheme.primary}`,
                opacity: 0.45,
                filter: 'drop-shadow(0 0 8px currentColor)'
              }}
            />

            {/* C. 3D FLOATING LAYER: CIRCULAR BADGE / LOGO */}
            <div 
              className="mb-5 flex flex-col items-center justify-center"
              style={{
                transform: `translateZ(${activePresetConfig.textDepth + 20}px)`,
                transformStyle: 'preserve-3d'
              }}
            >
              <div className="relative group cursor-pointer">
                {/* Neon Glow Aura */}
                <div 
                  className="absolute inset-0 rounded-full blur-2xl opacity-60 animate-pulse transition-colors duration-500 scale-125"
                  style={{ backgroundColor: currentTheme.primary }}
                />

                {/* Outer Cyber Rings */}
                <div 
                  className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-[2px] flex items-center justify-center shadow-2xl"
                  style={{
                    background: `conic-gradient(from 0deg, ${currentTheme.primary}, #ffffff, ${currentTheme.accent}, #020617, ${currentTheme.primary})`
                  }}
                >
                  <div className="w-full h-full bg-[#080d1a] rounded-full flex items-center justify-center p-3 border border-white/10 relative overflow-hidden">
                    {/* Animated Hologram Swirl */}
                    <div 
                      className="absolute inset-0 opacity-40 animate-[spin_8s_linear_infinite]"
                      style={{
                        background: `conic-gradient(from 180deg, transparent, ${currentTheme.primary}, transparent)`
                      }}
                    />
                    
                    {/* Logo Image with 3D Pop */}
                    <motion.img
                      src="https://raw.githubusercontent.com/Buenotec/Logo_UNI/refs/heads/main/logo_uni.png"
                      alt="UNI Logo"
                      className="w-20 h-20 sm:w-22 sm:h-22 object-contain relative z-10 filter drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* D. 3D FLOATING LETREIRO: MAIN GIGANTIC "UNI" TITLE WITH MULTI-LAYER 3D EXTRUSION */}
            <div 
              className="relative my-2"
              style={{
                transform: `translateZ(${activePresetConfig.textDepth + 35}px)`,
                transformStyle: 'preserve-3d'
              }}
            >
              {/* 3D Extrusion Shadow Behind Text */}
              <h1 
                className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight absolute inset-0 select-none pointer-events-none opacity-40 blur-[1px]"
                style={{
                  transform: 'translateZ(-15px) translateY(8px) translateX(-4px)',
                  color: currentTheme.primary,
                  textShadow: `0 0 30px ${currentTheme.primary}`
                }}
              >
                UNI
              </h1>

              {/* Main Glowing 3D Glass Lettering */}
              <h1 
                className={`
                  relative text-6xl sm:text-7xl md:text-8xl font-black tracking-tight 
                  bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}
                  drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)]
                `}
                style={{
                  filter: `drop-shadow(0 0 25px ${currentTheme.glow})`
                }}
              >
                UNI
              </h1>
            </div>

            {/* E. 3D FLOATING LETREIRO: "VIAÇÃO UNI" + SUB-HEADER */}
            <div 
              className="mt-3 mb-4 space-y-1.5"
              style={{
                transform: `translateZ(${activePresetConfig.textDepth + 25}px)`,
                transformStyle: 'preserve-3d'
              }}
            >
              <h2 className="text-xl sm:text-2xl font-black tracking-[0.28em] text-white uppercase font-sans drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                VIAÇÃO <span style={{ color: currentTheme.accent }}>UNI</span>
              </h2>

              <p className="text-[11px] sm:text-xs font-mono font-bold tracking-[0.22em] text-slate-300 uppercase opacity-90">
                SISTEMA OPERACIONAL E MONITORAMENTO DE FROTA
              </p>
            </div>

            {/* F. 3D FLOATING LETREIRO: DESCRIPTION TEXT */}
            <div 
              className="my-4 max-w-sm mx-auto"
              style={{
                transform: `translateZ(${activePresetConfig.textDepth + 15}px)`,
                transformStyle: 'preserve-3d'
              }}
            >
              <p className="text-xs sm:text-sm text-slate-200 font-normal leading-relaxed tracking-wide opacity-95">
                Plataforma corporativa de análise de rendimento de combustível, controle de manutenção e desempenho quantitativo de quilometragem.
              </p>
            </div>

            {/* Status do Último Salvamento Válido no Monólito 3D */}
            <div 
              className="my-2 px-4 py-2 rounded-xl bg-slate-950/80 border border-emerald-500/40 backdrop-blur-md inline-flex items-center gap-2.5 shadow-[0_0_20px_rgba(16,185,129,0.18)] max-w-md mx-auto"
              style={{
                transform: `translateZ(${activePresetConfig.textDepth + 25}px)`,
                transformStyle: 'preserve-3d'
              }}
            >
              <div className="relative flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute opacity-75" />
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-black flex items-center gap-1">
                  Status do Último Salvamento Válido
                  <span className="text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1 rounded text-[8px]">100% OK</span>
                </span>
                <span className="text-[11px] sm:text-xs font-mono text-emerald-300 font-bold">
                  {saveInfo?.displayString || '08/09/2026 às 13:28:45'}
                  {saveInfo?.tabName ? ` · ${saveInfo.tabName}` : ' · Snapshot Geral'}
                </span>
              </div>
            </div>

            {/* G. 3D FLOATING BUTTON: "INICIAR SISTEMA" */}
            <div 
              className="mt-7 mb-2 flex flex-col items-center justify-center gap-3"
              style={{
                transform: `translateZ(${activePresetConfig.textDepth + 40}px)`,
                transformStyle: 'preserve-3d'
              }}
            >
              <motion.button
                type="button"
                onClick={onStart}
                whileHover={{ scale: 1.07, translateZ: 15 }}
                whileTap={{ scale: 0.96 }}
                className={`
                  relative group px-10 sm:px-14 py-4 sm:py-4.5 rounded-2xl
                  text-sm sm:text-base font-black tracking-widest text-slate-950 uppercase
                  bg-gradient-to-r ${currentTheme.btnGradient}
                  cursor-pointer transition-all duration-300 select-none
                  shadow-[0_15px_40px_-5px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.6)]
                `}
                style={{
                  boxShadow: `
                    0 15px 35px -5px ${currentTheme.underglow},
                    inset 0 2px 3px rgba(255,255,255,0.6)
                  `
                }}
              >
                {/* Outer pulsing neon aura */}
                <div 
                  className="absolute -inset-1 rounded-2xl opacity-60 blur-md group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: currentTheme.primary }}
                />
                
                <span className="relative z-10 flex items-center justify-center gap-3 text-slate-950 font-black">
                  INICIAR SISTEMA
                  <ArrowRight className="w-5 h-5 stroke-[3] group-hover:translate-x-1.5 transition-transform duration-300" />
                </span>
              </motion.button>

              {/* Status indicator */}
              <div 
                className="flex items-center gap-2 text-[10px] font-mono font-semibold tracking-wider text-slate-400 mt-2"
                style={{
                  transform: 'translateZ(10px)'
                }}
              >
                <span 
                  className="w-2 h-2 rounded-full animate-ping"
                  style={{ backgroundColor: currentTheme.primary }}
                />
                <span>TEMPO REAL · DESEMPENHO ATUALIZADO</span>
              </div>
            </div>

          </div>
        </motion.div>

        {/* ========================================================= */}
        {/* RIGHT LATERAL PANEL: MOTOR HOLOGRÁFICO & SEGURANÇA        */}
        {/* ========================================================= */}
        <div className="hidden xl:flex flex-col gap-4 w-72 pointer-events-auto shrink-0">
          {/* Card 3: Motor Holográfico 3D */}
          <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4.5 backdrop-blur-xl shadow-xl transition-all duration-300 hover:border-purple-500/40">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Cpu size={14} />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Motor Holográfico
                </span>
              </div>
              <span className="text-[10px] font-mono text-purple-300 font-bold">
                VISION OS
              </span>
            </div>

            <div className="space-y-2.5 text-[11px] font-mono">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Renderizador:</span>
                <span className="text-purple-300 font-bold">Parede 3D Apple</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Camada de Vidro:</span>
                <span className="text-cyan-300 font-bold">iPhone Liquid</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Efeito Aurora:</span>
                <span className="text-emerald-300 font-bold">Boreal 60 FPS</span>
              </div>
            </div>
          </div>

          {/* Card 4: Segurança & BI */}
          <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4.5 backdrop-blur-xl shadow-xl transition-all duration-300 hover:border-cyan-500/40">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <ShieldCheck size={14} />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Segurança Viação
                </span>
              </div>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                AUDITADO
              </span>
            </div>

            <div className="space-y-2.5 text-[11px] font-mono">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Auditoria Abastec.:</span>
                <span className="text-emerald-300 font-bold">Detecção IA</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Conciliação Fiscal:</span>
                <span className="text-cyan-300 font-bold">NF / Estoque</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Relatórios Exec.:</span>
                <span className="text-white font-bold">PowerBI / PDF</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 5. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="relative z-20 w-full px-6 py-4 md:px-12 flex flex-col sm:flex-row justify-between items-center gap-2 bg-slate-950/60 border-t border-white/10 text-[10px] font-mono text-slate-400">
        <div className="flex flex-wrap items-center gap-2">
          <span>© 2026 Viação UNI - Sistema Operacional e Monitoramento de Frota</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300">Desenvolvido por <span className="text-cyan-400 font-bold">rbtecX</span></span>
        </div>
        <div className="text-cyan-400 font-bold hidden sm:block">APPLE 3D GLASS WALL TECHNOLOGY</div>
      </footer>
    </div>
  );
};

export default LandingPage;
