import { useId } from 'react';
import { Sliders } from 'lucide-react';
import { PlatformId } from '../types';

interface PlatformLogoProps {
  platform: PlatformId;
  className?: string;
}

export function PlatformLogo({ platform, className = 'h-4 w-4' }: PlatformLogoProps) {
  const igGradId = useId();
  switch (platform) {
    case 'line':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <path
            d="M12 3C6.48 3 2 6.58 2 11c0 3.04 2.13 5.69 5.29 7.03.23.1.54.3.62.69.07.35.05.9.02 1.25-.03.33-.17 1.3.99.71 1.16-.59 6.26-3.69 8.54-6.31C19.72 13.06 22 10.67 22 11c0-4.42-4.48-8-10-8Z"
            fill="#06C755"
          />
          <path
            d="M7.4 9.5v3.4h1.75M10.5 9.5v3.4M12.2 12.9V9.5l2.2 3.4V9.5M17.4 9.5h-1.65v3.4h1.65M15.75 11.2h1.25"
            stroke="#FFFFFF"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'facebook':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <circle cx="12" cy="12" r="10" fill="#1877F2" />
          <path
            d="M14.7 12.8l.45-2.85h-2.75V8.1c0-.78.38-1.54 1.6-1.54h1.24V4.14S14.12 3.95 13.04 3.95c-2.24 0-3.7 1.36-3.7 3.82v2.18H6.85v2.85h2.49v6.9a9.85 9.85 0 0 0 3.06 0v-6.9h2.3Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'instagram':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <defs>
            <linearGradient id={igGradId} x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F58529" />
              <stop offset="50%" stopColor="#DD2A7B" />
              <stop offset="100%" stopColor="#515BD4" />
            </linearGradient>
          </defs>
          <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill={`url(#${igGradId})`} />
          <rect x="6" y="6" width="12" height="12" rx="3.8" stroke="#FFFFFF" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="2.8" stroke="#FFFFFF" strokeWidth="1.6" />
          <circle cx="16.2" cy="7.8" r="1" fill="#FFFFFF" />
        </svg>
      );

    case 'youtube':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <path
            d="M21.58 7.19a2.51 2.51 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.82.42A2.51 2.51 0 0 0 2.42 7.19C2 8.77 2 12 2 12s0 3.23.42 4.81a2.51 2.51 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.82-.42a2.51 2.51 0 0 0 1.76-1.77C22 15.23 22 12 22 12s0-3.23-.42-4.81Z"
            fill="#FF0000"
          />
          <path d="M10 15.05V8.95L15.27 12 10 15.05Z" fill="#FFFFFF" />
        </svg>
      );

    case 'tiktok':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#0F172A" />
          <path
            d="M14.2 6.5c.45 1.56 1.67 2.7 3.25 2.9v2.1a5.4 5.4 0 0 1-3.25-1.08v4.36a3.9 3.9 0 1 1-3.4-3.87v2.15a1.78 1.78 0 1 0 1.28 1.72V6.5h2.12Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'x':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#0F172A" />
          <path
            d="M16.95 6.5h2.07l-4.52 5.17 5.32 7.03h-4.17l-3.26-4.27-3.74 4.27H6.58l4.84-5.53L6.3 6.5h4.27l2.95 3.9 3.43-3.9Zm-.73 10.97h1.15L9.95 7.67H8.72l7.5 9.8Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'custom':
    default:
      return <Sliders className={className} aria-hidden="true" />;
  }
}
