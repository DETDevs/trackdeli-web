import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

export const formatRelative = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return format(date, "d MMM yyyy, h:mm a", { locale: es });
  } catch {
    return dateString;
  }
};

export const formatTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return format(date, 'h:mm a', { locale: es });
  } catch {
    return dateString;
  }
};
