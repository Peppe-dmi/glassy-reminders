import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
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

// Dimensioni
const CARD_SIZE = 70;
const CARD_GAP = 16;
const CARD_TOTAL = CARD_SIZE + CARD_GAP;

export function CategoryCarousel({ categories, reminders }: CategoryCarouselProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  
  // Ombre diverse per tema chiaro/scuro
  const isDark = theme === 'dark';
  const shadowLarge = isDark 
    ? '0 8px 32px rgba(255,255,255,0.1), 0 0 0 1px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.1)'
    : '0 16px 48px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)';
  const shadowSmall = isDark 
    ? '0 4px 12px rgba(255,255,255,0.05)'
    : '0 4px 12px rgba(0,0,0,0.15)';

  // Calcola quante card sono visibili
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

  // Naviga a un indice specifico
  const goToIndex = useCallback((index: number) => {
    const len = categories.length;
    if (len === 0) return;
    
    // Wrap around
    let newIndex = index;
    if (newIndex < 0) newIndex = len - 1;
    if (newIndex >= len) newIndex = 0;
    
    setCurrentIndex(newIndex);
  }, [categories.length]);

  // Touch/mouse handlers per swipe
  const handleDragStart = (clientX: number) => {
    isDragging.current = true;
    startX.current = clientX;
    scrollLeft.current = currentIndex;
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging.current) return;
    const diff = startX.current - clientX;
    // Accumula solo, non fare niente durante il drag
  };

  const handleDragEnd = (clientX: number) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    const diff = startX.current - clientX;
    const threshold = 50; // Minimo px per cambiare card
    
    if (diff > threshold) {
      // Swipe sinistra -> prossima
      goToIndex(currentIndex + 1);
    } else if (diff < -threshold) {
      // Swipe destra -> precedente
      goToIndex(currentIndex - 1);
    }
  };

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => handleDragStart(e.clientX);
  const onMouseMove = (e: React.MouseEvent) => handleDragMove(e.clientX);
  const onMouseUp = (e: React.MouseEvent) => handleDragEnd(e.clientX);
  const onMouseLeave = (e: React.MouseEvent) => {
    if (isDragging.current) handleDragEnd(e.clientX);
  };

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => handleDragStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => handleDragMove(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => handleDragEnd(e.changedTouches[0].clientX);

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nessuna categoria</p>
      </div>
    );
  }

  // Calcola offset per centrare la card corrente
  const centerOffset = containerWidth / 2 - CARD_SIZE / 2;

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden pb-8 pt-6 select-none"
      style={{ 
        minHeight: '200px',
        touchAction: 'pan-y', // Permetti scroll verticale pagina
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <motion.div
        className="flex items-center"
        style={{ gap: `${CARD_GAP}px` }}
        animate={{
          x: centerOffset - (currentIndex * CARD_TOTAL),
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
      >
        {categories.map((category, i) => {
          const count = reminders.filter(r => r.categoryId === category.id && !r.isCompleted).length;
          const borderColor = categoryBorderColors[category.color] || categoryBorderColors.default;
          const iconBg = categoryIconBg[category.color] || categoryIconBg.default;
          const badgeColor = categoryBadgeColors[category.color] || categoryBadgeColors.default;
          
          // Distanza dal centro (in indici)
          const distance = Math.abs(i - currentIndex);
          const isCenter = distance === 0;
          
          // Scala: 1.5 al centro, 0.6 ai lati
          const scale = isCenter ? 1.5 : Math.max(0.55, 1 - distance * 0.35);
          const opacity = isCenter ? 1 : Math.max(0.4, 1 - distance * 0.3);
          
          const size = CARD_SIZE * scale;
          const iconSize = 40 * scale;
          const fontSize = 1.5 * scale;
          
          return (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: opacity,
                scale: 1,
                y: 0,
              }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                if (isCenter) {
                  navigate(`/category/${category.id}`);
                } else {
                  goToIndex(i);
                }
              }}
              className="flex-shrink-0 flex flex-col items-center"
              style={{ width: `${CARD_SIZE}px` }}
            >
              <motion.div 
                className={`rounded-2xl bg-card border-2 ${borderColor} flex flex-col items-center justify-center relative`}
                animate={{
                  width: size,
                  height: size,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ 
                  boxShadow: isCenter ? shadowLarge : shadowSmall,
                }}
              >
                {/* Icon background */}
                <motion.div 
                  className={`rounded-xl ${iconBg} flex items-center justify-center`}
                  animate={{
                    width: iconSize,
                    height: iconSize,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <motion.span 
                    animate={{ fontSize: `${fontSize}rem` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    {category.icon}
                  </motion.span>
                </motion.div>
                
                {/* Counter badge */}
                {count > 0 && (
                  <span 
                    className={`absolute -top-1.5 -right-1.5 rounded-full ${badgeColor} text-xs font-bold flex items-center justify-center shadow-lg`}
                    style={{
                      width: '20px',
                      height: '20px',
                      fontSize: '0.65rem',
                    }}
                  >
                    {count}
                  </span>
                )}
              </motion.div>
              
              <motion.p 
                className="mt-2 text-center font-semibold truncate"
                animate={{ 
                  opacity: isCenter ? 1 : 0.5,
                }}
                style={{ 
                  fontSize: `${Math.max(0.7, 0.75 * scale)}rem`,
                  width: `${Math.max(70, size)}px`,
                }}
              >
                {category.name}
              </motion.p>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Indicatori sotto */}
      <div className="flex justify-center gap-1.5 mt-4">
        {categories.map((_, i) => (
          <button
            key={i}
            onClick={() => goToIndex(i)}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              i === currentIndex 
                ? 'bg-primary w-6' 
                : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
