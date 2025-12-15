import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Category, CategoryColor } from '@/types/reminder';
import { useReminders } from '@/contexts/ReminderContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface EditCategoryDialogProps {
  category: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const icons = ['💼', '🏠', '👥', '💪', '💰', '🎯', '📚', '🎮', '🛒', '✈️', '🎨', '🍽️', '🎵', '🏥', '📱'];

const colors: { value: CategoryColor; label: string; class: string }[] = [
  { value: 'work', label: 'Lavoro', class: 'bg-category-work' },
  { value: 'personal', label: 'Personale', class: 'bg-category-personal' },
  { value: 'friends', label: 'Amici', class: 'bg-category-friends' },
  { value: 'health', label: 'Salute', class: 'bg-category-health' },
  { value: 'finance', label: 'Finanza', class: 'bg-category-finance' },
  { value: 'default', label: 'Default', class: 'bg-category-default' },
];

export function EditCategoryDialog({ category, open, onOpenChange }: EditCategoryDialogProps) {
  const { updateCategory } = useReminders();
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon);
  const [color, setColor] = useState<CategoryColor>(category.color);

  useEffect(() => {
    if (open) {
      setName(category.name);
      setIcon(category.icon);
      setColor(category.color);
    }
  }, [open, category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Inserisci un nome');
      return;
    }
    updateCategory(category.id, { name: name.trim(), icon, color });
    toast.success('Categoria aggiornata!');
    onOpenChange(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="glass-strong w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold">Modifica Categoria</h2>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="glass border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label>Icona</Label>
                <div className="grid grid-cols-5 gap-2">
                  {icons.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIcon(i)}
                      className={`p-3 text-2xl rounded-xl transition-all ${
                        icon === i
                          ? 'glass-strong ring-2 ring-primary scale-110'
                          : 'glass-subtle hover:bg-muted'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Colore</Label>
                <div className="grid grid-cols-3 gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`p-3 rounded-xl flex items-center gap-2 transition-all ${
                        color === c.value
                          ? 'glass-strong ring-2 ring-primary'
                          : 'glass-subtle hover:bg-muted'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${c.class}`} />
                      <span className="text-sm">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full">
                Salva Modifiche
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
