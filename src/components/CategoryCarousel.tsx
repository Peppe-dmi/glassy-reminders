import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Category } from '@/types/reminder';

interface CategoryCarouselProps {
  categories: Category[];
  reminders: { categoryId: string; isCompleted: boolean }[];
}

// Colori bordo per category cards
const categoryBorderColors: Record<string, string> = {
  work: 'border-amber-500/50',
  personal: 'border-sky-500/50',
  friends: 'border-pink-500/50',
  health: 'border-emerald-500/50',
  finance: 'border-violet-500/50',
  default: 'border-primary/50',
};

// Colori icona per category cards
const categoryIconBg: Record<string, string> = {
  work: 'bg-amber-500/15',
  personal: 'bg-sky-500/15',
  friends: 'bg-pink-500/15',
  health: 'bg-emerald-500/15',
  finance: 'bg-violet-500/15',
  default: 'bg-primary/15',
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scales, setScales] = useState<number[]>([]);
  const [opacities, setOpacities] = useState<number[]>([]);

  const calculateScales = useCallback(() => {
    if (!scrollRef.current) return;
    
    const container = scrollRef.current;
    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;
    
    const cards = container.querySelectorAll('.carousel-card');
    const newScales: number[] = [];
    const newOpacities: number[] = [];
    
    cards.forEach((card) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenterX = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(centerX - cardCenterX);
      
      // Distanza massima = larghezza di una card + gap
      const maxDistance = 120;
      const normalizedDistance = Math.min(distance / maxDistance, 1);
      
      // Scale: 1.15 al centro, 0.8 ai bordi (differenza più evidente)
      const scale = 1.15 - normalizedDistance * 0.35;
      // Opacity: 1.0 al centro, 0.5 ai bordi
      const opacity = 1 - normalizedDistance * 0.5;
      
      newScales.push(scale);
      newOpacities.push(opacity);
    });
    
    setScales(newScales);
    setOpacities(newOpacities);
  }, []);

  useEffect(() => {
    calculateScales();
    
    const container = scrollRef.current;
    if (container) {
      container.addEventListener('scroll', calculateScales);
      window.addEventListener('resize', calculateScales);
      
      // Initial calculation after render
      setTimeout(calculateScales, 100);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', calculateScales);
      }
      window.removeEventListener('resize', calculateScales);
    };
  }, [calculateScales, categories.length]);


  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nessuna categoria</p>
      </div>
    );
  }

  return (
    <div 
      ref={scrollRef}
      className="flex gap-5 overflow-x-auto pb-6 pt-4 scrollbar-hide snap-x snap-mandatory items-center"
      style={{ 
        scrollPaddingLeft: 'calc(50% - 50px)',
        scrollPaddingRight: 'calc(50% - 50px)',
        paddingLeft: 'calc(50% - 50px)',
        paddingRight: 'calc(50% - 50px)',
        minHeight: '140px',
      }}
    >
      {categories.map((category, i) => {
        const count = reminders.filter(r => r.categoryId === category.id && !r.isCompleted).length;
        const borderColor = categoryBorderColors[category.color] || categoryBorderColors.default;
        const iconBg = categoryIconBg[category.color] || categoryIconBg.default;
        const badgeColor = categoryBadgeColors[category.color] || categoryBadgeColors.default;
        
        const scale = scales[i] ?? 0.85;
        const opacity = opacities[i] ?? 0.7;
        
        // Determina se è la card centrale (scala > 1.1)
        const isCentered = scale > 1.1;
        
        return (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: scale * 0.92 }}
            onClick={() => navigate(`/category/${category.id}`)}
            className="carousel-card flex-shrink-0 snap-center"
            style={{
              transform: `scale(${scale})`,
              opacity: opacity,
              transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
            }}
          >
            <div 
              className={`category-card w-[80px] h-[80px] rounded-2xl bg-card border-2 ${borderColor} flex flex-col items-center justify-center relative`}
              style={{ 
                boxShadow: isCentered 
                  ? '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)' 
                  : '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              {/* Icon background */}
              <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center`}>
                <span className="text-2xl">{category.icon}</span>
              </div>
              
              {/* Counter badge */}
              {count > 0 && (
                <span 
                  className={`absolute -top-2 -right-2 w-6 h-6 rounded-full ${badgeColor} text-xs font-bold flex items-center justify-center shadow-lg`}
                >
                  {count}
                </span>
              )}
            </div>
            <p 
              className="text-xs mt-2 text-center font-semibold truncate w-[80px]"
              style={{ opacity: isCentered ? 1 : 0.7 }}
            >
              {category.name}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
}

