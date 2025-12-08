import mascotImg from '../assets/mascot.png';

interface MascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-20 h-20',
  xl: 'w-32 h-32',
};

export default function Mascot({ size = 'md', animate = false, className = '' }: MascotProps) {
  return (
    <img 
      src={mascotImg} 
      alt="ChoreChomper Mascot" 
      className={`${sizeClasses[size]} object-contain ${animate ? 'animate-bounce-slow' : ''} ${className}`}
    />
  );
}
