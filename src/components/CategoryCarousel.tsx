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

export function CategoryCarousel({ categories, reminders }: CategoryCarouselProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [cardStates, setCardStates] = useState<{ scale: number; opacity: number }[]>([]);
  
  // Ombre diverse per tema chiaro/scuro
  const isDark = theme === 'dark';
  const shadowLarge = isDark 
    ? '0 8px 32px rgba(255,255,255,0.1), 0 0 0 1px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.1)'
    : '0 16px 48px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)';
  const shadowSmall = (scale: number) => isDark 
    ? `0 ${4 * scale}px ${12 * scale}px rgba(255,255,255,0.05)`
    : `0 ${4 * scale}px ${12 * scale}px rgba(0,0,0,0.15)`;
  
  // Crea array infinito: duplica le card per l'effetto loop
  const infiniteCategories = categories.length > 0 
    ? [...categories, ...categories, ...categories] // Triplica per scroll infinito
    : [];
  const realLength = categories.length;

  // Calcola scala e opacità per ogni card basandosi sulla distanza dal centro
  const calculateCardStates = useCallback(() => {
    if (!scrollRef.current || infiniteCategories.length === 0) return;
    
    const container = scrollRef.current;
    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    
    const cards = container.querySelectorAll('.carousel-card');
    const newStates: { scale: number; opacity: number }[] = [];
    
    cards.forEach((card) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenterX = cardRect.left - containerRect.left + cardRect.width / 2;
      const distanceFromCenter = Math.abs(centerX - cardCenterX);
      
      // Distanza più stretta per effetto più evidente (100px = fuori focus)
      const focusDistance = 100;
      const normalizedDistance = Math.min(distanceFromCenter / focusDistance, 1);
      
      // Scala: 1.5 al centro → 0.55 ai bordi (MOLTO evidente!)
      const scale = 1.5 - normalizedDistance * 0.95;
      // Opacità: 1.0 al centro → 0.35 ai bordi
      const opacity = 1 - normalizedDistance * 0.65;
      
      newStates.push({ scale: Math.max(0.55, scale), opacity: Math.max(0.35, opacity) });
    });
    
    setCardStates(newStates);
  }, [infiniteCategories.length]);

  // Gestisce il loop infinito
  const handleInfiniteScroll = useCallback(() => {
    if (!scrollRef.current || realLength === 0) return;
    
    const container = scrollRef.current;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;
    const sectionWidth = scrollWidth / 3; // Diviso per 3 sezioni (triplicate)
    
    // Se siamo nella prima sezione, salta alla seconda (centro)
    if (scrollLeft < sectionWidth * 0.3) {
      container.scrollLeft = scrollLeft + sectionWidth;
    }
    // Se siamo nella terza sezione, salta alla seconda (centro)
    else if (scrollLeft > sectionWidth * 1.7) {
      container.scrollLeft = scrollLeft - sectionWidth;
    }
  }, [realLength]);

  useEffect(() => {
    calculateCardStates();
    
    const container = scrollRef.current;
    if (container) {
      // Posiziona inizialmente al centro (seconda sezione)
      if (realLength > 0) {
        const sectionWidth = container.scrollWidth / 3;
        container.scrollLeft = sectionWidth;
      }
      
      // Usa requestAnimationFrame per scroll più fluido
      let ticking = false;
      const handleScroll = () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            calculateCardStates();
            handleInfiniteScroll();
            ticking = false;
          });
          ticking = true;
        }
      };
      
      container.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', calculateCardStates);
      
      // Initial calculation
      setTimeout(calculateCardStates, 50);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', calculateCardStates);
      }
      window.removeEventListener('resize', calculateCardStates);
    };
  }, [calculateCardStates, handleInfiniteScroll, realLength]);


  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nessuna categoria</p>
      </div>
    );
  }

  // Dimensioni base della card (quando scala=1)
  const BASE_SIZE = 70;

  return (
    <div 
      ref={scrollRef}
      className="flex items-center justify-center overflow-x-auto pb-8 pt-6 scrollbar-hide px-4"
      style={{ 
        minHeight: '180px',
        gap: '6px', // Gap stretto per effetto rullino compatto
      }}
    >
      {infiniteCategories.map((category, i) => {
        const count = reminders.filter(r => r.categoryId === category.id && !r.isCompleted).length;
        const borderColor = categoryBorderColors[category.color] || categoryBorderColors.default;
        const iconBg = categoryIconBg[category.color] || categoryIconBg.default;
        const badgeColor = categoryBadgeColors[category.color] || categoryBadgeColors.default;
        
        // Usa lo stato calcolato dalla posizione reale
        const { scale, opacity } = cardStates[i] || { scale: 0.7, opacity: 0.5 };
        
        // Dimensioni dinamiche basate sulla scala
        const size = BASE_SIZE * scale;
        const iconSize = 40 * scale;
        const fontSize = 1.5 * scale;
        const isLarge = scale > 1.1;
        
        return (
          <motion.button
            key={`${category.id}-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (i % realLength) * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/category/${category.id}`)}
            className="carousel-card flex-shrink-0 flex flex-col items-center"
            style={{
              opacity: opacity,
              transition: 'opacity 0.15s ease-out',
            }}
          >
            <div 
              className={`category-card rounded-2xl bg-card border-2 ${borderColor} flex flex-col items-center justify-center relative`}
              style={{ 
                width: `${size}px`, 
                height: `${size}px`,
                boxShadow: isLarge ? shadowLarge : shadowSmall(scale),
                transition: 'width 0.15s ease-out, height 0.15s ease-out, box-shadow 0.15s ease-out',
              }}
            >
              {/* Icon background */}
              <div 
                className={`rounded-xl ${iconBg} flex items-center justify-center`}
                style={{
                  width: `${iconSize}px`,
                  height: `${iconSize}px`,
                  transition: 'width 0.15s ease-out, height 0.15s ease-out',
                }}
              >
                <span style={{ 
                  fontSize: `${fontSize}rem`,
                  transition: 'font-size 0.15s ease-out',
                }}>
                  {category.icon}
                </span>
              </div>
              
              {/* Counter badge */}
              {count > 0 && (
                <span 
                  className={`absolute -top-1.5 -right-1.5 rounded-full ${badgeColor} text-xs font-bold flex items-center justify-center shadow-lg`}
                  style={{
                    width: `${20 * Math.min(scale, 1.1)}px`,
                    height: `${20 * Math.min(scale, 1.1)}px`,
                    fontSize: `${0.65 * Math.min(scale, 1.1)}rem`,
                    transition: 'all 0.15s ease-out',
                  }}
                >
                  {count}
                </span>
              )}
            </div>
            <p 
              className="mt-2 text-center font-semibold truncate"
              style={{ 
                opacity: isLarge ? 1 : 0.6,
                fontSize: `${Math.max(0.7, 0.75 * scale)}rem`,
                width: `${Math.max(70, size)}px`,
                transition: 'all 0.15s ease-out',
              }}
            >
              {category.name}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
}

