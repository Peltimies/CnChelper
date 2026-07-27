import { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import type { Spell } from '../types';
import { Check, X } from 'lucide-react';
import SpellDescription from './SpellDescription';

interface SwipeCardProps {
  spell: Spell;
  onSwipe: (direction: 'left' | 'right') => void;
  isLast: boolean;
  actionLabel?: string;
}

export default function SwipeCard({ spell, onSwipe, isLast, actionLabel = 'Learn' }: SwipeCardProps) {
  const [exitX, setExitX] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = () => {
    if (x.get() > 100) {
      setExitX(200);
      onSwipe('right');
    } else if (x.get() < -100) {
      setExitX(-200);
      onSwipe('left');
    }
  };

  return (
    <motion.div
      className="absolute inset-0 card flex flex-col cursor-grab active:cursor-grabbing border-2 border-parchment-300/80"
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      exit={{ x: exitX, opacity: 0, transition: { duration: 0.2 } }}
      initial={{ scale: isLast ? 1 : 0.95, opacity: isLast ? 1 : 0.5 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-xl font-serif font-bold text-arcane-800">{spell.name}</h3>
          <p className="text-sm text-arcane-600 font-body">Level {spell.level} — {spell.classes.join(', ')}</p>
        </div>
        {spell.reversible && <span className="badge bg-parchment-200 text-parchment-700">Reversible</span>}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-parchment-700 mb-3 bg-parchment-100/60 rounded-lg p-2">
        <div><span className="font-serif font-semibold text-parchment-800">CT:</span> {spell.castingTime}</div>
        <div><span className="font-serif font-semibold text-parchment-800">Range:</span> {spell.range}</div>
        <div><span className="font-serif font-semibold text-parchment-800">Duration:</span> {spell.duration}</div>
        <div><span className="font-serif font-semibold text-parchment-800">Save:</span> {spell.savingThrow}</div>
        <div><span className="font-serif font-semibold text-parchment-800">SR:</span> {spell.spellResistance}</div>
        <div><span className="font-serif font-semibold text-parchment-800">Comp:</span> {spell.components}</div>
      </div>

      <div className="flex-1 overflow-auto">
        <SpellDescription text={spell.description} />
      </div>

      <div className="flex justify-center gap-8 pt-3 mt-3 border-t border-parchment-300/60">
        <div className="flex items-center gap-1 text-red-600 font-serif text-sm font-semibold">
          <X size={20} /> Skip
        </div>
        <div className="flex items-center gap-1 text-arcane-600 font-serif text-sm font-semibold">
          <Check size={20} /> {actionLabel}
        </div>
      </div>
    </motion.div>
  );
}
