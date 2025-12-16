import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useAnimation, useMotionValue, animate } from 'framer-motion';
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

const CARD_SIZE = 80;

// Feedback tattile leggero (come time picker Samsung)
const hapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(8); // Vibrazione brevissima 8ms
  }
};

export function CategoryCarousel({ categories, reminders }: CategoryCarouselProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Rotazione in gradi (continua, senza limiti)
  const rotation = useMotionValue(0);
  const [displayRotation, setDisplayRotation] = useState(0);
  
  // Tracking drag
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startRotation = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);
  
  // Per il feedback tattile
  const lastFrontIndex = useRef(-1);
  
  const isDark = theme === 'dark';
  
  // Angolo per card (360° / numero categorie)
  const anglePerCard = categories.length > 0 ? 360 / categories.length : 60;
  
  // Raggio del cilindro (più grande = card più distanti)
  const radius = Math.max(120, categories.length * 25);

  // Aggiorna displayRotation quando rotation cambia
  useEffect(() => {
    const unsubscribe = rotation.on('change', (v) => {
      setDisplayRotation(v);
      
      // Calcola il frontIndex corrente
      const normalizedRot = ((v % 360) + 360) % 360;
      const currentFrontIndex = Math.round(normalizedRot / anglePerCard) % categories.length;
      
      // Se è cambiato, vibra!
      if (currentFrontIndex !== lastFrontIndex.current && lastFrontIndex.current !== -1) {
        hapticFeedback();
      }
      lastFrontIndex.current = currentFrontIndex;
    });
    return () => unsubscribe();
  }, [rotation, anglePerCard, categories.length]);

  // Snap alla card più vicina CON INERZIA
  const snapWithInertia = useCallback((currentRotation: number, vel: number) => {
    // Simula dove arriverà con l'inerzia (decelerazione naturale)
    const friction = 0.88; // Attrito più alto = si ferma prima, più controllo
    const minVelocity = 8; // Velocità minima per fermarsi
    
    let projectedRotation = currentRotation;
    let currentVel = vel;
    
    // Simula l'inerzia per calcolare dove si fermerà
    while (Math.abs(currentVel) > minVelocity) {
      projectedRotation += currentVel * 0.016; // ~60fps
      currentVel *= friction;
    }
    
    // Snap alla card più vicina dalla posizione proiettata
    const snappedRotation = Math.round(projectedRotation / anglePerCard) * anglePerCard;
    
    // Animazione morbida ma controllata
    animate(rotation, snappedRotation, {
      type: 'spring',
      stiffness: 80,  // Un po' più rigido per controllo
      damping: 18,    // Smorzamento bilanciato
      velocity: vel * 0.5,  // Riduci velocità iniziale dell'animazione
    });
  }, [anglePerCard, rotation]);

  // Gestione drag
  const handleDragStart = (clientX: number) => {
    isDragging.current = true;
    startX.current = clientX;
    startRotation.current = rotation.get();
    lastX.current = clientX;
    lastTime.current = Date.now();
    velocity.current = 0;
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging.current) return;
    
    const diff = clientX - startX.current;
    // Sensibilità bilanciata: controllo + fluidità
    const sensitivity = 0.7;
    const newRotation = startRotation.current - diff * sensitivity;
    rotation.set(newRotation);
    
    // Calcola velocità (gradi/secondo)
    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      const instantVel = ((lastX.current - clientX) * sensitivity) / dt * 1000;
      // Smooth della velocità per evitare spike
      velocity.current = velocity.current * 0.6 + instantVel * 0.4;
    }
    lastX.current = clientX;
    lastTime.current = now;
  };

  const handleDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    // Lancia con inerzia!
    snapWithInertia(rotation.get(), velocity.current);
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

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nessuna categoria</p>
      </div>
    );
  }

  // Trova quale card è più vicina al fronte (rotazione 0)
  const normalizedRotation = ((displayRotation % 360) + 360) % 360;
  const frontIndex = Math.round(normalizedRotation / anglePerCard) % categories.length;

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden pb-4 pt-6 select-none cursor-grab active:cursor-grabbing"
      style={{ 
        minHeight: '220px',
        perspective: '800px',
        perspectiveOrigin: 'center center',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Contenitore 3D rotante */}
      <div
        className="relative mx-auto"
        style={{
          width: `${CARD_SIZE}px`,
          height: `${CARD_SIZE + 40}px`,
          transformStyle: 'preserve-3d',
          transform: `rotateY(${-displayRotation}deg)`,
          transition: isDragging.current ? 'none' : undefined,
        }}
      >
        {categories.map((category, i) => {
          const count = reminders.filter(r => r.categoryId === category.id && !r.isCompleted).length;
          const borderColor = categoryBorderColors[category.color] || categoryBorderColors.default;
          const iconBg = categoryIconBg[category.color] || categoryIconBg.default;
          const badgeColor = categoryBadgeColors[category.color] || categoryBadgeColors.default;
          
          // Posizione angolare di questa card
          const cardAngle = i * anglePerCard;
          
          // Calcola se questa card è quella frontale
          const isFront = i === frontIndex;
          
          // Calcola quanto è "di fronte" questa card (0 = dietro, 1 = davanti)
          const cardRotationInView = ((cardAngle - normalizedRotation + 180 + 360) % 360) - 180;
          const frontness = Math.cos((cardRotationInView * Math.PI) / 180);
          
          // Scala e opacità basate su quanto è di fronte
          const scale = 0.6 + frontness * 0.5; // 0.6 dietro -> 1.1 davanti
          const opacity = 0.3 + frontness * 0.7; // 0.3 dietro -> 1.0 davanti
          
          // Shadow per profondità
          const shadow = isFront
            ? isDark 
              ? '0 8px 32px rgba(255,255,255,0.15), 0 0 0 1px rgba(255,255,255,0.2)'
              : '0 16px 48px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.1)'
            : isDark
              ? '0 4px 12px rgba(255,255,255,0.05)'
              : '0 4px 12px rgba(0,0,0,0.1)';
          
          const size = CARD_SIZE * scale;
          const iconSize = 40 * scale;
          const fontSize = 1.6 * scale;
          
          return (
            <div
              key={category.id}
              className="absolute left-1/2 top-0 flex flex-col items-center"
              style={{
                transform: `
                  translateX(-50%)
                  rotateY(${cardAngle}deg)
                  translateZ(${radius}px)
                `,
                transformStyle: 'preserve-3d',
                opacity: opacity,
                zIndex: Math.round(frontness * 100),
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isFront) {
                    navigate(`/category/${category.id}`);
                  } else {
                    // Ruota per portare questa card al fronte
                    const targetRotation = i * anglePerCard;
                    const currentNorm = rotation.get() % 360;
                    let diff = targetRotation - (currentNorm % 360);
                    if (diff > 180) diff -= 360;
                    if (diff < -180) diff += 360;
                    animate(rotation, rotation.get() + diff, {
                      type: 'spring',
                      stiffness: 50,
                      damping: 12,
                    });
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
                    transition: 'box-shadow 0.2s',
                    backfaceVisibility: 'hidden',
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
                    opacity: isFront ? 1 : 0.6,
                    fontSize: `${Math.max(0.65, 0.7 * scale)}rem`,
                    width: `${Math.max(70, size + 20)}px`,
                    backfaceVisibility: 'hidden',
                  }}
                >
                  {category.name}
                </p>
              </button>
            </div>
          );
        })}
      </div>

      {/* Indicatori sotto */}
      <div className="flex justify-center gap-1.5 mt-6">
        {categories.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              const targetRotation = i * anglePerCard;
              const currentNorm = rotation.get() % 360;
              let diff = targetRotation - (currentNorm % 360);
              if (diff > 180) diff -= 360;
              if (diff < -180) diff += 360;
              animate(rotation, rotation.get() + diff, {
                type: 'spring',
                stiffness: 50,
                damping: 12,
              });
            }}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              i === frontIndex 
                ? 'bg-primary w-6' 
                : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
