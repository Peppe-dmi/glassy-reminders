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

// Bordi colorati sottili
const borderColors: Record<string, string> = {
  work: 'border-amber-500/40',
  personal: 'border-sky-500/40',
  friends: 'border-pink-500/40',
  health: 'border-emerald-500/40',
  finance: 'border-violet-500/40',
  default: 'border-primary/40',
};

// Background icona
const iconBgColors: Record<string, string> = {
  work: 'bg-amber-500/15',
  personal: 'bg-sky-500/15',
  friends: 'bg-pink-500/15',
  health: 'bg-emerald-500/15',
  finance: 'bg-violet-500/15',
  default: 'bg-primary/15',
};

// Dot indicatore
const dotColors: Record<string, string> = {
  work: 'bg-amber-500',
  personal: 'bg-sky-500',
  friends: 'bg-pink-500',
  health: 'bg-emerald-500',
  finance: 'bg-violet-500',
  default: 'bg-primary',
};

// Badge oggi
const badgeColors: Record<string, string> = {
  work: 'bg-amber-500 text-white',
  personal: 'bg-sky-500 text-white',
  friends: 'bg-pink-500 text-white',
  health: 'bg-emerald-500 text-white',
  finance: 'bg-violet-500 text-white',
  default: 'bg-primary text-white',
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
        whileTap={{ scale: 0.98 }}
        className={`card-elegant relative overflow-hidden rounded-2xl p-5 cursor-pointer bg-card border-2 ${borderColors[category.color]}`}
        onClick={() => navigate(`/category/${category.id}`)}
      >
        {/* Menu */}
        <div className="absolute top-3 right-3 z-10" onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg transition-colors">
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

        {/* Icon con sfondo colorato */}
        <div className={`w-14 h-14 rounded-xl ${iconBgColors[category.color]} flex items-center justify-center mb-4`}>
          <span className="text-3xl">{category.icon}</span>
        </div>

        {/* Title */}
        <h3 className="font-display text-lg font-bold mb-2">{category.name}</h3>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${dotColors[category.color]}`} />
            <span className="text-muted-foreground">{pendingCount} da fare</span>
          </div>
          {completedCount > 0 && (
            <span className="text-muted-foreground/60">{completedCount} ✓</span>
          )}
        </div>

        {/* Today badge */}
        {todayCount > 0 && (
          <div
            className={`absolute bottom-4 right-4 px-3 py-1 rounded-full ${badgeColors[category.color]} text-xs font-bold shadow-md`}
          >
            {todayCount} oggi
          </div>
        )}
      </motion.div>

      <EditCategoryDialog category={category} open={showEdit} onOpenChange={setShowEdit} />
      <ShareCategoryDialog category={category} open={showShare} onOpenChange={setShowShare} />
    </>
  );
}
