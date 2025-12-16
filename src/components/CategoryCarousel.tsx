import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { Category } from '@/types/reminder';

interface CategoryCarouselProps {
  categories: Category[];
  reminders: { categoryId: string; isCompleted: boolean }[];
}

// Colori bordo per category cards
const categoryBorderColors: Record<string, string> = {
  work: 'border-amber-500/60',
  personal: 'border-sky-500/60',
  friends: 'border-pink-500/60',
  health: 'border-emerald-500/60',
  finance: 'border-violet-500/60',
  default: 'border-primary/60',
};

// Colori icona per category cards
const categoryIconBg: Record<string, string> = {
  work: 'bg-amber-500/20',
  personal: 'bg-sky-500/20',
  friends: 'bg-pink-500/20',
  health: 'bg-emerald-500/20',
  finance: 'bg-violet-500/20',
  default: 'bg-primary/20',
};

// Colori badge counter
const categoryBadgeColors: Record<string, string> = {
  work: 'bg-amber-500 text-white',
  personal: 'bg-sky-500 text-white',
  friends: 'bg-pink-500 text-white',
  health: 'bg-emerald-500 text-white',
  finance: 'bg-violet-500 text-white',
  default: 'bg-primary text-white',
};

const CARD_SIZE = 75;
const CARD_GAP = 20;

// Feedback tattile leggero
const hapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(8);
  }
};

export function CategoryCarousel({ categories, reminders }: CategoryCarouselProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Indice corrente (può essere frazionario durante lo scroll)
  const currentIndex = useMotionValue(0);
  const [displayIndex, setDisplayIndex] = useState(0);
  
  // Tracking drag
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startIndex = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);
  
  // Per il feedback tattile - inizializza a 0 subito
  const lastSnappedIndex = useRef(0);
  const isInitialized = useRef(false);
  
  const isDark = theme === 'dark';

  // Calcola larghezza container
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Aggiorna displayIndex e gestisce vibrazione
  useEffect(() => {
    const unsubscribe = currentIndex.on('change', (v) => {
      setDisplayIndex(v);
      
      // Calcola l'indice snappato corrente
      const len = categories.length;
      if (len === 0) return;
      
      let snapped = Math.round(v);
      // Wrap around
      snapped = ((snapped % len) + len) % len;
      
      // Vibra solo se cambia E siamo già inizializzati
      if (isInitialized.current && snapped !== lastSnappedIndex.current) {
        hapticFeedback();
      }
      lastSnappedIndex.current = snapped;
      
      // Marca come inizializzato dopo il primo render
      if (!isInitialized.current) {
        isInitialized.current = true;
      }
    });
    return () => unsubscribe();
  }, [currentIndex, categories.length]);

  // Snap all'indice più vicino con inerzia
  const snapWithInertia = useCallback((current: number, vel: number) => {
    const len = categories.length;
    if (len === 0) return;
    
    // Simula inerzia
    const friction = 0.85;
    const minVelocity = 0.05;
    
    let projected = current;
    let currentVel = vel;
    
    while (Math.abs(currentVel) > minVelocity) {
      projected += currentVel * 0.016;
      currentVel *= friction;
    }
    
    // Snap all'indice più vicino
    const snapped = Math.round(projected);
    
    animate(currentIndex, snapped, {
      type: 'spring',
      stiffness: 120,
      damping: 20,
      velocity: vel * 0.3,
    });
  }, [categories.length, currentIndex]);

  // Gestione drag - sensibilità ridotta
  const handleDragStart = (clientX: number) => {
    isDragging.current = true;
    startX.current = clientX;
    startIndex.current = currentIndex.get();
    lastX.current = clientX;
    lastTime.current = Date.now();
    velocity.current = 0;
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging.current) return;
    
    const diff = clientX - startX.current;
    // Sensibilità: quanto px per cambiare 1 indice (più alto = meno sensibile)
    const pxPerIndex = 120;
    const newIndex = startIndex.current - diff / pxPerIndex;
    currentIndex.set(newIndex);
    
    // Calcola velocità
    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      const instantVel = ((lastX.current - clientX) / pxPerIndex) / dt * 1000;
      velocity.current = velocity.current * 0.5 + instantVel * 0.5;
    }
    lastX.current = clientX;
    lastTime.current = now;
  };

  const handleDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    snapWithInertia(currentIndex.get(), velocity.current);
  };

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };
  const onMouseMove = (e: React.MouseEvent) => handleDragMove(e.clientX);
  const onMouseUp = () => handleDragEnd();
  const onMouseLeave = () => {
    if (isDragging.current) handleDragEnd();
  };

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => handleDragStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => handleDragMove(e.touches[0].clientX);
  const onTouchEnd = () => handleDragEnd();

  // Vai a un indice specifico
  const goToIndex = (index: number) => {
    const current = currentIndex.get();
    const len = categories.length;
    
    // Trova il percorso più breve
    let diff = index - (current % len);
    if (diff > len / 2) diff -= len;
    if (diff < -len / 2) diff += len;
    
    animate(currentIndex, current + diff, {
      type: 'spring',
      stiffness: 100,
      damping: 18,
    });
  };

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nessuna categoria</p>
      </div>
    );
  }

  const len = categories.length;
  const centerX = containerWidth / 2;
  
  // Indice centrale corrente (wrapped)
  const currentCenterIndex = ((Math.round(displayIndex) % len) + len) % len;

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden pb-4 pt-6 select-none cursor-grab active:cursor-grabbing"
      style={{ minHeight: '200px' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Container delle card */}
      <div className="relative h-32 flex items-center justify-center">
        {categories.map((category, i) => {
          const count = reminders.filter(r => r.categoryId === category.id && !r.isCompleted).length;
          const borderColor = categoryBorderColors[category.color] || categoryBorderColors.default;
          const iconBg = categoryIconBg[category.color] || categoryIconBg.default;
          const badgeColor = categoryBadgeColors[category.color] || categoryBadgeColors.default;
          
          // Calcola distanza dall'indice centrale (considerando loop)
          let offset = i - displayIndex;
          // Wrap per loop infinito
          while (offset > len / 2) offset -= len;
          while (offset < -len / 2) offset += len;
          
          // Posizione X basata sull'offset
          const xPos = offset * (CARD_SIZE + CARD_GAP);
          
          // Effetto ellittico: leggera curva verso il basso ai lati
          const distanceFromCenter = Math.abs(offset);
          const yOffset = distanceFromCenter * distanceFromCenter * 3; // Curva parabolica leggera
          const zOffset = -distanceFromCenter * 15; // Leggera profondità
          
          // Scala: grande al centro, piccola ai lati
          const scale = Math.max(0.6, 1.3 - distanceFromCenter * 0.35);
          const opacity = Math.max(0.3, 1 - distanceFromCenter * 0.35);
          
          const isCenter = distanceFromCenter < 0.5;
          
          // Shadow
          const shadow = isCenter
            ? isDark 
              ? '0 8px 32px rgba(255,255,255,0.12), 0 0 0 1px rgba(255,255,255,0.15)'
              : '0 12px 40px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)'
            : isDark
              ? '0 4px 12px rgba(255,255,255,0.05)'
              : '0 4px 12px rgba(0,0,0,0.12)';
          
          const size = CARD_SIZE * scale;
          const iconSize = 38 * scale;
          const fontSize = 1.5 * scale;
          
          // Nascondi card troppo lontane
          if (distanceFromCenter > 3) return null;
          
          return (
            <motion.div
              key={category.id}
              className="absolute flex flex-col items-center"
              style={{
                x: xPos,
                y: yOffset,
                scale: scale,
                opacity: opacity,
                zIndex: 100 - Math.round(distanceFromCenter * 10),
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isCenter) {
                    navigate(`/category/${category.id}`);
                  } else {
                    goToIndex(i);
                  }
                }}
                className="flex flex-col items-center transition-transform active:scale-95"
              >
                <div 
                  className={`rounded-2xl bg-card border-2 ${borderColor} flex flex-col items-center justify-center relative`}
                  style={{ 
                    width: `${size}px`, 
                    height: `${size}px`,
                    boxShadow: shadow,
                    transform: `translateZ(${zOffset}px)`,
                  }}
                >
                  {/* Icon background */}
                  <div 
                    className={`rounded-xl ${iconBg} flex items-center justify-center`}
                    style={{
                      width: `${iconSize}px`,
                      height: `${iconSize}px`,
                    }}
                  >
                    <span style={{ fontSize: `${fontSize}rem` }}>
                      {category.icon}
                    </span>
                  </div>
                  
                  {/* Counter badge */}
                  {count > 0 && (
                    <span 
                      className={`absolute -top-1 -right-1 rounded-full ${badgeColor} text-xs font-bold flex items-center justify-center shadow-lg`}
                      style={{
                        width: '18px',
                        height: '18px',
                        fontSize: '0.6rem',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </div>
                
                <p 
                  className="mt-2 text-center font-semibold truncate"
                  style={{ 
                    opacity: isCenter ? 1 : 0.5,
                    fontSize: `${Math.max(0.65, 0.7 * scale)}rem`,
                    width: `${Math.max(70, size + 10)}px`,
                  }}
                >
                  {category.name}
                </p>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Indicatori sotto */}
      <div className="flex justify-center gap-1.5 mt-4">
        {categories.map((_, i) => (
          <button
            key={i}
            onClick={() => goToIndex(i)}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              i === currentCenterIndex 
                ? 'bg-primary w-6' 
                : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
