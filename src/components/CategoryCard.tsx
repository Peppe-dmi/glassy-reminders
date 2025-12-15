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
  work: 'from-category-work/30 to-category-work/10 border-category-work/30',
  personal: 'from-category-personal/30 to-category-personal/10 border-category-personal/30',
  friends: 'from-category-friends/30 to-category-friends/10 border-category-friends/30',
  health: 'from-category-health/30 to-category-health/10 border-category-health/30',
  finance: 'from-category-finance/30 to-category-finance/10 border-category-finance/30',
  default: 'from-category-default/30 to-category-default/10 border-category-default/30',
};

const dotColors: Record<string, string> = {
  work: 'bg-category-work',
  personal: 'bg-category-personal',
  friends: 'bg-category-friends',
  health: 'bg-category-health',
  finance: 'bg-category-finance',
  default: 'bg-category-default',
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
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        className={`glass relative overflow-hidden rounded-2xl p-5 cursor-pointer bg-gradient-to-br ${colorClasses[category.color]} border`}
        onClick={() => navigate(`/category/${category.id}`)}
      >
        {/* Glow effect */}
        <div className={`absolute top-0 right-0 w-32 h-32 ${dotColors[category.color]} opacity-20 rounded-full blur-3xl`} />

        {/* Menu */}
        <div className="absolute top-3 right-3 z-10" onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-background/30 transition-colors">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass border-border/50">
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

        {/* Icon */}
        <div className="text-4xl mb-4">{category.icon}</div>

        {/* Title */}
        <h3 className="font-display text-lg font-semibold mb-2">{category.name}</h3>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${dotColors[category.color]}`} />
            <span className="text-muted-foreground">{pendingCount} da fare</span>
          </div>
          {completedCount > 0 && (
            <span className="text-muted-foreground/60">{completedCount} completati</span>
          )}
        </div>

        {/* Today badge */}
        {todayCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute bottom-4 right-4 px-3 py-1 rounded-full ${dotColors[category.color]} text-xs font-semibold text-background`}
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
