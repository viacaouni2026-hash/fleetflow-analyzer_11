import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Scan, Zap, Activity } from 'lucide-react';

interface ModernCrazyBusAnimationProps {
  cardCount?: number;
}

export const ModernCrazyBusAnimation: React.FC<ModernCrazyBusAnimationProps> = ({
  cardCount = 10
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [scanStep, setScanStep] = useState(0);

  const statusPhrases = [
    '• AUDITORIA EM TRÂNSITO •',
    '⚡ TELEMETRIA TOP 10 ⚡',
    '🔍 SCANNER DE FROTAS ATIVO',
    '🛡️ MANUTENÇÃO CONCILIADA',
    '📡 SENSOR DE CUSTO OK',
    '✨ CRUISE LOGÍSTICO VIP ✨'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setScanStep(prev => (prev + 1) % statusPhrases.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {/* 
        Holographic Semi-Transparent Bus Cruiser
        Moves smoothly across Row 1 (#1 -> #5), curves down, then Row 2 (#10 -> #6), and returns.
        Rendered with glassmorphic transparency so cards behind remain visible and interactive!
      */}
      <motion.div
        className="absolute w-52 h-26 pointer-events-auto cursor-pointer select-none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{
          left: [
            "-4%",   "10%",  "30%",  "50%",  "70%",  "88%",  "96%",
            "96%",
            "96%",   "88%",  "70%",  "50%",  "30%",  "10%",  "-4%",
            "-4%"
          ],
          top: [
            "20%",   "20%",  "20%",  "20%",  "20%",  "20%",  "24%",
            "70%",
            "70%",   "70%",  "70%",  "70%",  "70%",  "70%",  "66%",
            "20%"
          ],
          scaleX: [
            1,       1,      1,      1,      1,      1,      1,
            -1,
            -1,      -1,     -1,     -1,     -1,     -1,     -1,
            1
          ],
          rotate: [
            0,       0,      0,      0,      0,      0,      2,
            0,
            0,       0,      0,      0,      0,      0,      -2,
            0
          ]
        }}
        transition={{
          repeat: Infinity,
          duration: 26,
          ease: "easeInOut",
          times: [
            0,       0.07,   0.14,   0.21,   0.28,   0.35,   0.45,
            0.50,
            0.55,    0.62,   0.69,   0.76,   0.83,   0.90,   0.96,
            1
          ]
        }}
        style={{ 
          originX: '50%', 
          originY: '50%',
          transformOrigin: 'center center'
        }}
      >
        {/* INTERACTION WITH CARDS: Futuristic Holographic Scanner Beam projecting onto the cards below */}
        <div className="absolute top-[80%] left-1/2 -translate-x-1/2 w-64 h-32 pointer-events-none origin-top">
          {/* Radar / Scanner Light Cone */}
          <div 
            className="w-full h-full opacity-45 mix-blend-color-dodge animate-pulse"
            style={{
              background: 'radial-gradient(ellipse at top, rgba(6, 182, 212, 0.7) 0%, rgba(99, 102, 241, 0.3) 40%, transparent 75%)',
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)'
            }}
          />
          {/* Luminous Floor Scanner Grid Line */}
          <motion.div 
            animate={{ scaleX: [0.8, 1.15, 0.8], opacity: [0.5, 0.9, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="absolute bottom-2 left-6 right-6 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-[1px] shadow-[0_0_12px_#06b6d4]"
          />
        </div>

        {/* Ambient Neon Ground Glow */}
        <motion.div 
          animate={{
            opacity: [0.4, 0.75, 0.4],
            scale: [0.95, 1.08, 0.95]
          }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute -bottom-3 left-4 right-4 h-6 bg-gradient-to-r from-indigo-500/50 via-cyan-400/60 to-purple-500/50 rounded-full blur-md pointer-events-none"
        />

        {/* Soft Headlight Light Cone (Front LED Projector) */}
        <div className="absolute top-1/2 -translate-y-1/2 left-[88%] w-48 h-28 pointer-events-none origin-left">
          <div 
            className="w-full h-full opacity-40"
            style={{
              background: 'radial-gradient(ellipse at left, rgba(56, 189, 248, 0.7) 0%, rgba(99, 102, 241, 0.2) 45%, transparent 75%)',
              clipPath: 'polygon(0% 42%, 100% 0%, 100% 100%, 0% 58%)'
            }}
          />
        </div>

        {/* Trailing Particle Dust (Subtle & Elegant) */}
        <motion.div 
          animate={{
            opacity: [0.3, 0.7, 0.3],
            scaleX: [1, 1.3, 1]
          }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
          className="absolute top-[68%] -left-8 -translate-y-1/2 w-12 h-4 bg-gradient-to-l from-cyan-400/40 via-indigo-500/20 to-transparent rounded-l-full blur-xs pointer-events-none"
        />

        {/* Hover Status Tag */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.85 }}
              animate={{ opacity: 1, y: -28, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.85 }}
              className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/90 backdrop-blur-md text-cyan-300 border border-cyan-500/50 px-3 py-1 rounded-full text-[10px] font-black tracking-wider flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
            >
              <Activity size={12} className="text-cyan-400 animate-spin" />
              SISTEMA DE TELEMETRIA EM TEMPO REAL
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODERN SEMI-TRANSPARENT LUXURY COACH BUS SVG */}
        <div className="w-full h-full transition-all duration-300 opacity-80 hover:opacity-95">
          <svg
            viewBox="0 0 200 95"
            className="w-full h-full drop-shadow-2xl overflow-visible"
          >
            <defs>
              {/* Ultra-Modern Translucent Body with Cyber Glass Look */}
              <linearGradient id="transBusBodyGlass" x1="0" y1="0" x2="1" y2="0.3">
                <stop offset="0%" stopColor="#0f172a" stopOpacity="0.82" />
                <stop offset="30%" stopColor="#1e1b4b" stopOpacity="0.75" />
                <stop offset="70%" stopColor="#312e81" stopOpacity="0.72" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.78" />
              </linearGradient>

              {/* Dynamic Neon Stripe */}
              <linearGradient id="transNeonCyanStripe" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.95" />
              </linearGradient>

              {/* Panoramic Glass Panes */}
              <linearGradient id="panoramicGlass" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.85" />
                <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.6" />
              </linearGradient>

              {/* Alloy Wheel Rim */}
              <radialGradient id="transAlloyRim" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#06b6d4" />
                <stop offset="75%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </radialGradient>
            </defs>

            {/* Aerodinâmica / Spoilers Superiores */}
            <path
              d="M 18 20 L 34 20 L 28 25 L 12 25 Z"
              fill="#06b6d4"
              opacity="0.9"
            />
            <path
              d="M 172 23 L 186 26 C 190 28, 192 32, 190 35 L 180 35 Z"
              fill="#38bdf8"
              opacity="0.8"
            />

            {/* Lataria Principal Translúcida (Perfil Duplo Moderno) */}
            <path
              d="M 22 22 
                 C 45 18, 145 18, 170 22 
                 C 184 24, 194 30, 196 46 
                 C 197 58, 192 68, 182 70 
                 L 22 70 
                 C 14 70, 10 64, 10 52 
                 L 10 30 
                 C 10 24, 15 22, 22 22 Z"
              fill="url(#transBusBodyGlass)"
              stroke="#38bdf8"
              strokeWidth="1.8"
              strokeOpacity="0.9"
            />

            {/* Linha de Destaque Neon Superior */}
            <path
              d="M 24 24 C 60 21, 140 21, 168 24"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.8"
              fill="none"
            />

            {/* Faixa Neon Central Vibrante */}
            <path
              d="M 10 53 L 192 53 L 188 58 L 10 58 Z"
              fill="url(#transNeonCyanStripe)"
            />

            {/* Pára-brisa Panorâmico Dianteiro de Alta Visibilidade */}
            <path
              d="M 158 26 L 182 29 C 190 34, 192 42, 192 50 L 158 50 Z"
              fill="url(#panoramicGlass)"
              stroke="#bae6fd"
              strokeWidth="1"
              strokeOpacity="0.85"
            />

            {/* Janelas Panorâmicas Laterais com Poltronas Interiores Visíveis */}
            <g>
              {/* Janela 1 */}
              <rect x="25" y="27" width="28" height="21" rx="3" fill="url(#panoramicGlass)" stroke="#bae6fd" strokeWidth="0.8" strokeOpacity="0.75" />
              {/* Janela 2 */}
              <rect x="57" y="27" width="28" height="21" rx="3" fill="url(#panoramicGlass)" stroke="#bae6fd" strokeWidth="0.8" strokeOpacity="0.75" />
              {/* Janela 3 */}
              <rect x="89" y="27" width="28" height="21" rx="3" fill="url(#panoramicGlass)" stroke="#bae6fd" strokeWidth="0.8" strokeOpacity="0.75" />
              {/* Janela 4 */}
              <rect x="121" y="27" width="30" height="21" rx="3" fill="url(#panoramicGlass)" stroke="#bae6fd" strokeWidth="0.8" strokeOpacity="0.75" />

              {/* Poltronas Translúcidas Interiores Visíveis */}
              <g opacity="0.5">
                <rect x="30" y="37" width="8" height="9" rx="1.5" fill="#6366f1" />
                <rect x="42" y="37" width="8" height="9" rx="1.5" fill="#6366f1" />
                <rect x="62" y="37" width="8" height="9" rx="1.5" fill="#6366f1" />
                <rect x="74" y="37" width="8" height="9" rx="1.5" fill="#6366f1" />
                <rect x="94" y="37" width="8" height="9" rx="1.5" fill="#6366f1" />
                <rect x="106" y="37" width="8" height="9" rx="1.5" fill="#6366f1" />
                <rect x="126" y="37" width="8" height="9" rx="1.5" fill="#6366f1" />
                <rect x="138" y="37" width="8" height="9" rx="1.5" fill="#6366f1" />
              </g>

              {/* Letreiro Digital LED Dinâmico no Topo do Ônibus */}
              <rect x="56" y="20.5" width="88" height="4.8" rx="1.5" fill="#020617" fillOpacity="0.95" stroke="#06b6d4" strokeWidth="0.6" />
              <text 
                x="100" 
                y="24" 
                fill="#38bdf8" 
                fontSize="3.2" 
                fontWeight="900" 
                textAnchor="middle" 
                fontFamily="monospace"
                letterSpacing="0.4"
              >
                {statusPhrases[scanStep]}
              </text>
            </g>

            {/* Farol Dianteiro Triplo LED Laser */}
            <polygon points="191,55 196,56 193,61 187,60" fill="#e0f2fe" opacity="0.95" />
            <circle cx="191" cy="58" r="2.8" fill="#38bdf8" />
            <circle cx="192" cy="58" r="1.4" fill="#ffffff" />

            {/* Lanterna Traseira LED Vermelha Neon */}
            <rect x="9" y="54" width="3.5" height="7" rx="1" fill="#ef4444" opacity="0.95" />
            <rect x="9" y="47" width="2.5" height="4" rx="0.8" fill="#f59e0b" opacity="0.9" />

            {/* RODA TRASEIRA ALUMÍNIO GIRATÓRIA */}
            <g transform="translate(45, 70)">
              <circle cx="0" cy="0" r="12" fill="#090d16" stroke="#334155" strokeWidth="1.5" />
              <motion.g
                animate={{ rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
              >
                <circle cx="0" cy="0" r="8.2" fill="url(#transAlloyRim)" />
                <line x1="-6.5" y1="0" x2="6.5" y2="0" stroke="#ffffff" strokeWidth="1.4" />
                <line x1="0" y1="-6.5" x2="0" y2="6.5" stroke="#ffffff" strokeWidth="1.4" />
                <line x1="-4.5" y1="-4.5" x2="4.5" y2="4.5" stroke="#ffffff" strokeWidth="1.2" />
                <line x1="-4.5" y1="4.5" x2="4.5" y2="-4.5" stroke="#ffffff" strokeWidth="1.2" />
                <circle cx="0" cy="0" r="2.8" fill="#06b6d4" />
              </motion.g>
            </g>

            {/* RODA DIANTEIRA ALUMÍNIO GIRATÓRIA */}
            <g transform="translate(152, 70)">
              <circle cx="0" cy="0" r="12" fill="#090d16" stroke="#334155" strokeWidth="1.5" />
              <motion.g
                animate={{ rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
              >
                <circle cx="0" cy="0" r="8.2" fill="url(#transAlloyRim)" />
                <line x1="-6.5" y1="0" x2="6.5" y2="0" stroke="#ffffff" strokeWidth="1.4" />
                <line x1="0" y1="-6.5" x2="0" y2="6.5" stroke="#ffffff" strokeWidth="1.4" />
                <line x1="-4.5" y1="-4.5" x2="4.5" y2="4.5" stroke="#ffffff" strokeWidth="1.2" />
                <line x1="-4.5" y1="4.5" x2="4.5" y2="-4.5" stroke="#ffffff" strokeWidth="1.2" />
                <circle cx="0" cy="0" r="2.8" fill="#06b6d4" />
              </motion.g>
            </g>
          </svg>
        </div>
      </motion.div>
    </div>
  );
};

export default ModernCrazyBusAnimation;
