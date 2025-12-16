import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { Category } from '@/types/reminder';
import { useReminders } from '@/contexts/ReminderContext';
import { Trash2, Edit } from 'lucide-react';
import { EditCategoryDialog } from './EditCategoryDialog';
import { toast } from 'sonner';

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
const CARD_GAP = 16;
const LONG_PRESS_DURATION = 500; // ms

// Feedback tattile leggero
const hapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(8);
  }
};

// Feedback tattile più forte per long press
const hapticLongPress = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(30);
  }
};

export function CategoryCarousel({ categories, reminders }: CategoryCarouselProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { deleteCategory } = useReminders();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Dialog modifica
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Context menu per long press
  const [contextMenu, setContextMenu] = useState<{ category: Category; x: number; y: number } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  
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
  const hasMoved = useRef(false);
  
  // Per il feedback tattile
  const lastSnappedIndex = useRef(-1);
  
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

  // Inizializza vibrazione dopo mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const len = categories.length;
      if (len > 0) {
        lastSnappedIndex.current = 0;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [categories.length]);

  // Aggiorna displayIndex e gestisce vibrazione
  useEffect(() => {
    const unsubscribe = currentIndex.on('change', (v) => {
      setDisplayIndex(v);
      
      const len = categories.length;
      if (len === 0) return;
      
      let snapped = Math.round(v);
      snapped = ((snapped % len) + len) % len;
      
      if (lastSnappedIndex.current >= 0 && snapped !== lastSnappedIndex.current) {
        hapticFeedback();
        lastSnappedIndex.current = snapped;
      }
    });
    return () => unsubscribe();
  }, [currentIndex, categories.length]);

  // Chiudi context menu quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  // Snap all'indice più vicino con inerzia
  const snapWithInertia = useCallback((current: number, vel: number) => {
    const len = categories.length;
    if (len === 0) return;
    
    const friction = 0.85;
    const minVelocity = 0.05;
    
    let projected = current;
    let currentVel = vel;
    
    while (Math.abs(currentVel) > minVelocity) {
      projected += currentVel * 0.016;
      currentVel *= friction;
    }
    
    const snapped = Math.round(projected);
    
    animate(currentIndex, snapped, {
      type: 'spring',
      stiffness: 120,
      damping: 20,
      velocity: vel * 0.3,
    });
  }, [categories.length, currentIndex]);

  // Cancella long press timer
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Gestione drag
  const handleDragStart = (clientX: number) => {
    isDragging.current = true;
    hasMoved.current = false;
    startX.current = clientX;
    startIndex.current = currentIndex.get();
    lastX.current = clientX;
    lastTime.current = Date.now();
    velocity.current = 0;
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging.current) return;
    
    const diff = clientX - startX.current;
    
    // Se si è mosso abbastanza, cancella long press
    if (Math.abs(diff) > 10) {
      hasMoved.current = true;
      cancelLongPress();
      isLongPress.current = false;
    }
    
    const pxPerIndex = 120;
    const newIndex = startIndex.current - diff / pxPerIndex;
    currentIndex.set(newIndex);
    
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
    cancelLongPress();
    if (!isDragging.current) return;
    isDragging.current = false;
    
    if (!isLongPress.current) {
      snapWithInertia(currentIndex.get(), velocity.current);
    }
    isLongPress.current = false;
  };

  // Long press su una card
  const startLongPress = (category: Category, clientX: number, clientY: number) => {
    cancelLongPress();
    isLongPress.current = false;
    
    longPressTimer.current = setTimeout(() => {
      if (!hasMoved.current) {
        isLongPress.current = true;
        hapticLongPress();
        setContextMenu({ category, x: clientX, y: clientY });
      }
    }, LONG_PRESS_DURATION);
  };

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };
  const onMouseMove = (e: React.MouseEvent) => handleDragMove(e.clientX);
  const onMouseUp = () => handleDragEnd();
  const onMouseLeave = () => {
    cancelLongPress();
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
    
    let diff = index - (((current % len) + len) % len);
    if (diff > len / 2) diff -= len;
    if (diff < -len / 2) diff += len;
    
    animate(currentIndex, current + diff, {
      type: 'spring',
      stiffness: 100,
      damping: 18,
    });
  };

  const handleDelete = (categoryId: string) => {
    deleteCategory(categoryId);
    toast.success('Categoria eliminata');
    setContextMenu(null);
  };

  const handleEdit = (category: Category) => {
    setContextMenu(null);
    // Piccolo delay per far chiudere il context menu prima di aprire il dialog
    setTimeout(() => {
      setEditingCategory(category);
    }, 50);
  };

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nessuna categoria</p>
      </div>
    );
  }

  const len = categories.length;
  const currentCenterIndex = ((Math.round(displayIndex) % len) + len) % len;

  return (
    <>
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
        <div className="relative h-36 flex items-center justify-center">
          {categories.map((category, i) => {
            const count = reminders.filter(r => r.categoryId === category.id && !r.isCompleted).length;
            const borderColor = categoryBorderColors[category.color] || categoryBorderColors.default;
            const iconBg = categoryIconBg[category.color] || categoryIconBg.default;
            const badgeColor = categoryBadgeColors[category.color] || categoryBadgeColors.default;
            
            let offset = i - displayIndex;
            while (offset > len / 2) offset -= len;
            while (offset < -len / 2) offset += len;
            
            const xPos = offset * (CARD_SIZE + CARD_GAP);
            const distanceFromCenter = Math.abs(offset);
            const scale = Math.max(0.7, 1.3 - distanceFromCenter * 0.3);
            const opacity = Math.max(0.4, 1 - distanceFromCenter * 0.3);
            const isCenter = distanceFromCenter < 0.5;
            
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
            
            if (distanceFromCenter > 3) return null;
            
            return (
              <motion.div
                key={category.id}
                className="absolute flex flex-col items-center"
                style={{
                  x: xPos,
                  scale: scale,
                  opacity: opacity,
                  zIndex: 100 - Math.round(distanceFromCenter * 10),
                }}
              >
                <button
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    startLongPress(category, touch.clientX, touch.clientY);
                  }}
                  onMouseDown={(e) => {
                    startLongPress(category, e.clientX, e.clientY);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isLongPress.current || hasMoved.current) return;
                    
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
                    }}
                  >
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

        {/* Indicatori */}
        <div className="flex justify-center gap-1.5 mt-8">
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

      {/* Context Menu - Long Press */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[200] glass-strong rounded-xl shadow-2xl border border-border/50 overflow-hidden"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 160),
              top: Math.min(contextMenu.y, window.innerHeight - 120),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleEdit(contextMenu.category)}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
            >
              <Edit className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Modifica</span>
            </button>
            <button
              onClick={() => handleDelete(contextMenu.category.id)}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">Elimina</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialog modifica categoria */}
      {editingCategory && (
        <EditCategoryDialog 
          category={editingCategory} 
          open={!!editingCategory} 
          onOpenChange={(open) => !open && setEditingCategory(null)} 
        />
      )}
    </>
  );
}
