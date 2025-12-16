import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Trash2, Edit, Share } from 'lucide-react';
import { Category } from '@/types/reminder';
import { useReminders } from '@/contexts/ReminderContext';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditCategoryDialog } from './EditCategoryDialog';
import { ShareCategoryDialog } from './ShareCategoryDialog';
import { toast } from 'sonner';

interface CategoryCardProps {
  category: Category;
}

const colorClasses: Record<string, string> = {
  work: 'from-amber-500/20 via-orange-500/15 to-orange-600/10',
  personal: 'from-sky-400/20 via-blue-500/15 to-blue-600/10',
  friends: 'from-pink-500/20 via-rose-500/15 to-rose-600/10',
  health: 'from-emerald-400/20 via-green-500/15 to-green-600/10',
  finance: 'from-violet-500/20 via-purple-500/15 to-purple-600/10',
  default: 'from-primary/20 via-purple-500/15 to-accent/10',
};

const borderColors: Record<string, string> = {
  work: 'border-amber-500/30',
  personal: 'border-sky-500/30',
  friends: 'border-pink-500/30',
  health: 'border-emerald-500/30',
  finance: 'border-violet-500/30',
  default: 'border-primary/30',
};

const dotColors: Record<string, string> = {
  work: 'bg-amber-500',
  personal: 'bg-sky-500',
  friends: 'bg-pink-500',
  health: 'bg-emerald-500',
  finance: 'bg-violet-500',
  default: 'bg-primary',
};

const glowColors: Record<string, string> = {
  work: 'bg-amber-500/40',
  personal: 'bg-sky-500/40',
  friends: 'bg-pink-500/40',
  health: 'bg-emerald-500/40',
  finance: 'bg-violet-500/40',
  default: 'bg-primary/40',
};

export function CategoryCard({ category }: CategoryCardProps) {
  const navigate = useNavigate();
  const { getRemindersByCategory, deleteCategory } = useReminders();
  const [showEdit, setShowEdit] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const reminders = getRemindersByCategory(category.id);
  const pendingCount = reminders.filter(r => !r.isCompleted).length;
  const completedCount = reminders.filter(r => r.isCompleted).length;
  
  const today = new Date().toDateString();
  const todayCount = reminders.filter(r => new Date(r.date).toDateString() === today && !r.isCompleted).length;

  const handleDelete = () => {
    deleteCategory(category.id);
    toast.success('Categoria eliminata');
  };

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02, y: -6, rotateX: 2 }}
        whileTap={{ scale: 0.98 }}
        className={`card-3d relative overflow-hidden rounded-2xl p-5 cursor-pointer bg-gradient-to-br ${colorClasses[category.color]} border ${borderColors[category.color]} backdrop-blur-sm`}
        onClick={() => navigate(`/category/${category.id}`)}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Glow effect - enhanced */}
        <div className={`absolute -top-8 -right-8 w-40 h-40 ${glowColors[category.color]} rounded-full blur-3xl opacity-60`} />
        
        {/* Glass highlight on top */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/5 pointer-events-none rounded-2xl" />
        
        {/* Shine animation on hover */}
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
        </div>

        {/* Menu */}
        <div className="absolute top-3 right-3 z-10" onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-background/40 transition-colors backdrop-blur-sm">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-strong border-border/50">
              <DropdownMenuItem onClick={() => setShowEdit(true)} className="gap-2">
                <Edit className="w-4 h-4" /> Modifica
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowShare(true)} className="gap-2">
                <Share className="w-4 h-4" /> Condividi
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="gap-2 text-destructive">
                <Trash2 className="w-4 h-4" /> Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Icon - 3D with shadow */}
        <motion.div 
          whileHover={{ scale: 1.15, rotate: 5 }}
          className="text-5xl mb-4 drop-shadow-lg relative z-10"
          style={{ textShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
        >
          {category.icon}
        </motion.div>

        {/* Title */}
        <h3 className="font-display text-lg font-bold mb-2 relative z-10">{category.name}</h3>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm relative z-10">
          <div className="flex items-center gap-2">
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`w-2.5 h-2.5 rounded-full ${dotColors[category.color]} shadow-sm`} 
            />
            <span className="text-muted-foreground font-medium">{pendingCount} da fare</span>
          </div>
          {completedCount > 0 && (
            <span className="text-muted-foreground/60">{completedCount} ✓</span>
          )}
        </div>

        {/* Today badge - premium style */}
        {todayCount > 0 && (
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            whileHover={{ scale: 1.1 }}
            className={`absolute bottom-4 right-4 px-3.5 py-1.5 rounded-full ${dotColors[category.color]} text-xs font-bold text-white shadow-lg z-10`}
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3)' }}
          >
            {todayCount} oggi
          </motion.div>
        )}
      </motion.div>

      <EditCategoryDialog category={category} open={showEdit} onOpenChange={setShowEdit} />
      <ShareCategoryDialog category={category} open={showShare} onOpenChange={setShowShare} />
    </>
  );
}
