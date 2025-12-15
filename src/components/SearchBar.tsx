import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useReminders } from '@/contexts/ReminderContext';
import { useNavigate } from 'react-router-dom';
import { Reminder } from '@/types/reminder';

export function SearchBar() {
  const { searchReminders, categories } = useReminders();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Reminder[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length >= 2) {
      const found = searchReminders(query);
      setResults(found);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query, searchReminders]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (reminder: Reminder) => {
    navigate(`/category/${reminder.categoryId}`);
    setQuery('');
    setIsOpen(false);
  };

  const getCategoryInfo = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return { name: cat?.name || '', icon: cat?.icon || '📋', color: cat?.color || 'default' };
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca promemoria..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl glass border border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full mt-2 w-full glass-strong rounded-2xl p-2 shadow-lg z-50 max-h-[60vh] overflow-y-auto"
          >
            {results.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Nessun risultato per "{query}"
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground px-3 py-1">
                  {results.length} risultat{results.length === 1 ? 'o' : 'i'}
                </p>
                {results.map((reminder) => {
                  const { name, icon } = getCategoryInfo(reminder.categoryId);
                  const isPast = new Date(reminder.date) < new Date() && !reminder.isCompleted;

                  return (
                    <motion.button
                      key={reminder.id}
                      whileHover={{ backgroundColor: 'hsl(var(--muted) / 0.5)' }}
                      onClick={() => handleResultClick(reminder)}
                      className={`w-full text-left p-3 rounded-xl transition-colors ${
                        reminder.isCompleted ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm ${reminder.isCompleted ? 'line-through' : ''}`}>
                            {reminder.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{name}</span>
                            <span>•</span>
                            <span className={`flex items-center gap-1 ${isPast ? 'text-destructive' : ''}`}>
                              <Clock className="w-3 h-3" />
                              {format(new Date(reminder.date), "d MMM", { locale: it })}
                              {reminder.time && ` ${reminder.time}`}
                            </span>
                          </div>
                        </div>
                        {reminder.isCompleted && (
                          <span className="text-xs text-green-500">✓</span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

