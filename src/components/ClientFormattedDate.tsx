'use client';

import { useEffect, useState } from 'react';

interface ClientFormattedDateProps {
  date: Date;
  format?: 'full' | 'short' | 'time';
}

export function ClientFormattedDate({ date, format = 'full' }: ClientFormattedDateProps) {
  const [formattedDate, setFormattedDate] = useState<string>('');

  useEffect(() => {
    if (!date) {
      setFormattedDate('N/A');
      return;
    }

    const dateObj = date instanceof Date ? date : new Date(date);

    try {
      switch (format) {
        case 'full':
          setFormattedDate(dateObj.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }));
          break;
        case 'short':
          setFormattedDate(dateObj.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }));
          break;
        case 'time':
          setFormattedDate(dateObj.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit'
          }));
          break;
        default:
          setFormattedDate(dateObj.toLocaleString('zh-TW'));
      }
    } catch (error) {
      setFormattedDate('Invalid Date');
    }
  }, [date, format]);

  return <span>{formattedDate}</span>;
}
