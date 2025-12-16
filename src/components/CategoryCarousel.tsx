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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Calcola l'indice della card più vicina al centro
  const calculateActiveIndex = useCallback(() => {
    if (!scrollRef.current || categories.length === 0) return;
    
    const container = scrollRef.current;
    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    
    const cards = container.querySelectorAll('.carousel-card');
    let closestIndex = 0;
    let closestDistance = Infinity;
    
    cards.forEach((card, index) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenterX = cardRect.left - containerRect.left + cardRect.width / 2;
      const distance = Math.abs(centerX - cardCenterX);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    
    setActiveIndex(closestIndex);
  }, [categories.length]);

  useEffect(() => {
    calculateActiveIndex();
    
    const container = scrollRef.current;
    if (container) {
      container.addEventListener('scroll', calculateActiveIndex);
      window.addEventListener('resize', calculateActiveIndex);
      
      // Initial calculation
      setTimeout(calculateActiveIndex, 50);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', calculateActiveIndex);
      }
      window.removeEventListener('resize', calculateActiveIndex);
    };
  }, [calculateActiveIndex, categories.length]);


  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nessuna categoria</p>
      </div>
    );
  }

  // Card dimensions
  const CARD_SIZE_ACTIVE = 100; // Card centrale grande
  const CARD_SIZE_INACTIVE = 70; // Card laterali piccole

  return (
    <div 
      ref={scrollRef}
      className="flex gap-6 overflow-x-auto pb-8 pt-6 scrollbar-hide snap-x snap-mandatory items-center"
      style={{ 
        scrollPaddingLeft: `calc(50% - ${CARD_SIZE_ACTIVE / 2}px)`,
        scrollPaddingRight: `calc(50% - ${CARD_SIZE_ACTIVE / 2}px)`,
        paddingLeft: `calc(50% - ${CARD_SIZE_ACTIVE / 2}px)`,
        paddingRight: `calc(50% - ${CARD_SIZE_ACTIVE / 2}px)`,
        minHeight: '160px',
      }}
    >
      {categories.map((category, i) => {
        const count = reminders.filter(r => r.categoryId === category.id && !r.isCompleted).length;
        const borderColor = categoryBorderColors[category.color] || categoryBorderColors.default;
        const iconBg = categoryIconBg[category.color] || categoryIconBg.default;
        const badgeColor = categoryBadgeColors[category.color] || categoryBadgeColors.default;
        
        // Card attiva = quella al centro
        const isActive = i === activeIndex;
        const distance = Math.abs(i - activeIndex);
        
        // Scala: 1.0 per attiva, 0.7 per le altre (grande differenza!)
        const scale = isActive ? 1 : Math.max(0.65, 0.85 - distance * 0.15);
        // Opacità: 1.0 per attiva, 0.4 per le altre
        const opacity = isActive ? 1 : Math.max(0.35, 0.6 - distance * 0.15);
        // Dimensione card
        const size = isActive ? CARD_SIZE_ACTIVE : CARD_SIZE_INACTIVE;
        
        return (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
            }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(`/category/${category.id}`)}
            className="carousel-card flex-shrink-0 snap-center flex flex-col items-center"
            style={{
              transform: `scale(${scale})`,
              opacity: opacity,
              transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease-out',
            }}
          >
            <div 
              className={`category-card rounded-2xl bg-card border-2 ${borderColor} flex flex-col items-center justify-center relative`}
              style={{ 
                width: `${size}px`, 
                height: `${size}px`,
                boxShadow: isActive 
                  ? '0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.1)' 
                  : '0 4px 12px rgba(0,0,0,0.2)',
                transition: 'width 0.25s, height 0.25s, box-shadow 0.25s',
              }}
            >
              {/* Icon background */}
              <div 
                className={`rounded-xl ${iconBg} flex items-center justify-center`}
                style={{
                  width: isActive ? '52px' : '36px',
                  height: isActive ? '52px' : '36px',
                  transition: 'width 0.25s, height 0.25s',
                }}
              >
                <span style={{ 
                  fontSize: isActive ? '2rem' : '1.5rem',
                  transition: 'font-size 0.25s',
                }}>
                  {category.icon}
                </span>
              </div>
              
              {/* Counter badge */}
              {count > 0 && (
                <span 
                  className={`absolute -top-2 -right-2 rounded-full ${badgeColor} text-xs font-bold flex items-center justify-center shadow-lg`}
                  style={{
                    width: isActive ? '26px' : '20px',
                    height: isActive ? '26px' : '20px',
                    fontSize: isActive ? '0.75rem' : '0.625rem',
                    transition: 'all 0.25s',
                  }}
                >
                  {count}
                </span>
              )}
            </div>
            <p 
              className="mt-2 text-center font-semibold truncate"
              style={{ 
                opacity: isActive ? 1 : 0.5,
                fontSize: isActive ? '0.875rem' : '0.75rem',
                width: `${size}px`,
                transition: 'all 0.25s',
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

