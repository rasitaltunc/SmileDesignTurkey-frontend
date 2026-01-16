import { useContext } from 'react';
import { NavigationContext } from '../lib/navigationContext';

interface LinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Link({ to, children, className, onClick }: LinkProps) {
  const { navigate } = useContext(NavigationContext);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(to);
    if (onClick) onClick();
  };

  return (
    <a href={to} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

export function useNavigate() {
  const { navigate } = useContext(NavigationContext);
  return navigate;
}

export function useParams() {
  const { params } = useContext(NavigationContext);
  return params;
}
