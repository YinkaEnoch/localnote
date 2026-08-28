import type { ReactNode } from 'react';
import { IconPlus } from './Icons';
import './FAB.css';

interface FABProps {
  onClick?: () => void;
  icon?: ReactNode;
  'aria-label'?: string;
}

export function FAB({ onClick, icon, 'aria-label': ariaLabel = 'Create new item' }: FABProps) {
  return (
    <button className="fab" onClick={onClick} aria-label={ariaLabel}>
      {icon || <IconPlus size={24} />}
    </button>
  );
}
