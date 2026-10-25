import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatManaguaDateTime, formatManaguaTime } from './dateManagua';

export const formatRelative = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  } catch {
    return dateString;
  }
};

export const formatRelativeCompact = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `hace ${diffInSeconds}s`;
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `hace ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `hace ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `hace ${diffInDays}d`;
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString: string): string => {
  return formatManaguaDateTime(dateString);
};

export const formatTime = (dateString: string): string => {
  return formatManaguaTime(dateString);
};
