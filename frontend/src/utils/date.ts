import { format, parseISO, isValid } from 'date-fns';

export const formatDate = (dateString: string): string => {
    const date = parseISO(dateString);
    return isValid(date) ? format(date, 'MMMM dd, yyyy') : 'Invalid date';
};

export const calculateEndDate = (startDate: string, duration: number): string => {
    const date = parseISO(startDate);
    if (!isValid(date)) {
        throw new Error('Invalid start date');
    }
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + duration);
    return endDate.toISOString();
};

export const isDateInFuture = (dateString: string): boolean => {
    const date = parseISO(dateString);
    return isValid(date) && date > new Date();
};