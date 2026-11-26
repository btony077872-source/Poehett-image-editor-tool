import { forwardRef, useEffect, useState } from 'react';

interface CowboyRoachLogoProps {
  shotSeq: number;
  className?: string;
}

export const CowboyRoachLogo = forwardRef<HTMLSpanElement, CowboyRoachLogoProps>(
  function CowboyRoachLogo({ shotSeq, className = 'h-9 w-11' }, muzzleRef) {
    const [firing, setFiring] = useState(false);

    useEffect(() => {
      if (shotSeq <= 0) return;
      setFiring(true);
      const timer = window.setTimeout(() => setFiring(false), 190);
      return () => window.clearTimeout(timer);
    }, [shotSeq]);

    return (
      <span className={`relative inline-flex items-center justify-center ${className}`}>
        <svg
          viewBox="0 0 84 68"
          fill="none"
          aria-hidden="true"
          className={`h-full w-full overflow-visible transition-transform duration-150 ${
            firing ? 'roach-recoil' : 'roach-idle'
          }`}
        >
          {/* Subtle desert shadow underneath boots */}
          <ellipse cx="36" cy="61" rx="18" ry="3.5" fill="#2B1E16" fillOpacity="0.14" />

          {/* Back legs & cowboy boots */}
          <path
            d="M27 48 L21 55 L21 59"
            stroke="#5A2C12"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17 59.5 H24.5 V56.5 H20.5 Z"
            fill="#3E2111"
            stroke="#2B1E16"
            strokeWidth="1.2"
          />
          <path
            d="M42 49 L46 55 L46 59"
            stroke="#5A2C12"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M43 59.5 H51 V56.5 H46.5 Z"
            fill="#3E2111"
            stroke="#2B1E16"
            strokeWidth="1.2"
          />
          {/* Tiny brass boot spurs */}
          <circle cx="17" cy="58" r="1.4" fill="#F59E0B" />
          <circle cx="42.5" cy="58" r="1.4" fill="#F59E0B" />

          {/* Side legs */}
          <path
            d="M24 39 L14 42 L11 47"
            stroke="#6B3416"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M23 44 L15 49 L14 54"
            stroke="#6B3416"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Cockroach carapace / body */}
          <ellipse
            cx="34"
            cy="39"
            rx="13.5"
            ry="15.5"
            fill="#85431E"
            stroke="#3E2111"
            strokeWidth="2"
          />
          {/* Wing shell split & warm highlight */}
          <path
            d="M26 30 C24 38 25 48 31 53"
            stroke="#5A2C12"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M37 29 C41 37 40 47 35 53"
            stroke="#5A2C12"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <ellipse
            cx="30.5"
            cy="37"
            rx="3.2"
            ry="7.5"
            transform="rotate(-12 30.5 37)"
            fill="#A65A2E"
            fillOpacity="0.65"
          />

          {/* Crimson Western Bandana */}
          <path
            d="M22.5 29.5 Q34 35.5 45.5 29.5 L42.5 37 Q34 40 25.5 37 Z"
            fill="#DC2626"
            stroke="#7F1D1D"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M23 31.5 L16.5 35.5 L21 37.5 Z"
            fill="#B91C1C"
            stroke="#7F1D1D"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />

          {/* Cockroach Head */}
          <ellipse
            cx="34"
            cy="24.5"
            rx="10"
            ry="8"
            fill="#9A5128"
            stroke="#3E2111"
            strokeWidth="1.9"
          />

          {/* Expressive Outlaw Eyes */}
          <ellipse cx="30.8" cy="24.5" rx="2.7" ry="3.2" fill="#FFFDF8" />
          <ellipse cx="38.2" cy="24.5" rx="2.7" ry="3.2" fill="#FFFDF8" />
          <circle cx="31.7" cy="24.8" r="1.45" fill="#1E130D" />
          <circle cx="39.1" cy="24.8" r="1.45" fill="#1E130D" />
          <circle cx="32.2" cy="23.9" r="0.55" fill="#FFFFFF" />
          <circle cx="39.6" cy="23.9" r="0.55" fill="#FFFFFF" />
          {/* Confident squinting brows */}
          <path
            d="M27.5 21.3 L33 22.7 M41.5 21.3 L36 22.7"
            stroke="#2B1E16"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          {/* Smirk */}
          <path
            d="M32.5 28.6 Q36 30.2 38.8 28.1"
            stroke="#2B1E16"
            strokeWidth="1.4"
            strokeLinecap="round"
          />

          {/* Long Antennae sweeping out from under the hat */}
          <path
            d="M27 18 C20 10 11 9 6 13"
            stroke="#4A2511"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="roach-antenna-left"
          />
          <path
            d="M41 18 C48 10 56 8 61 12"
            stroke="#4A2511"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="roach-antenna-right"
          />

          {/* Cowboy Stetson Hat */}
          <g className={firing ? 'roach-hat-kick' : ''}>
            {/* Hat crown */}
            <path
              d="M21 19 C22 8.5 28 5.5 34 8 C40 5.5 46 8.5 47 19 Z"
              fill="#D99B4E"
              stroke="#5A2C12"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* Hat band */}
            <path
              d="M21.8 17.3 Q34 19.3 46.2 17.3 L46.6 19.6 Q34 21.4 21.4 19.6 Z"
              fill="#991B1B"
            />
            {/* Gold hat buckle */}
            <rect
              x="31.5"
              y="17.2"
              width="5"
              height="3.2"
              rx="0.8"
              fill="#FBBF24"
              stroke="#78350F"
              strokeWidth="0.9"
            />
            {/* Hat brim */}
            <path
              d="M12.5 19.2 Q34 23.8 55.5 18.8 Q50.5 21.2 34 21.8 Q17.5 21.2 12.5 19.2 Z"
              fill="#C78338"
              stroke="#5A2C12"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </g>

          {/* Gun-slinging Arm & Six-Shooter Revolver */}
          <g className={firing ? 'roach-gun-recoil' : ''}>
            {/* Forearm */}
            <path
              d="M44 36 L55 37.5"
              stroke="#6B3416"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            {/* Revolver grip */}
            <path
              d="M52.5 37 L55 44.5 L59 43.5 L57 36.5 Z"
              fill="#78350F"
              stroke="#2B1E16"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            {/* Cylinder & frame */}
            <rect
              x="54.5"
              y="32.5"
              width="8.5"
              height="5.5"
              rx="1.5"
              fill="#64748B"
              stroke="#1E293B"
              strokeWidth="1.3"
            />
            <circle cx="58.7" cy="35.2" r="1.4" fill="#CBD5E1" />
            {/* Trigger guard */}
            <path
              d="M56.5 38 Q57.5 41 59.5 38"
              stroke="#1E293B"
              strokeWidth="1.2"
              fill="none"
            />
            {/* Long Steel Barrel */}
            <rect
              x="62.5"
              y="32.2"
              width="12.5"
              height="3.6"
              rx="1"
              fill="#94A3B8"
              stroke="#1E293B"
              strokeWidth="1.3"
            />
            <rect x="72" y="30.8" width="2.2" height="1.8" fill="#1E293B" />

            {/* Starburst Muzzle Flash on Fire */}
            {firing && (
              <g transform="translate(75.5, 34)">
                <path
                  d="M0 0 L7 -6 L4.5 -1 L11 0 L4.5 1.5 L7 6 L0 0 Z"
                  fill="#F59E0B"
                />
                <circle cx="2" cy="0" r="2.8" fill="#FEF3C7" />
              </g>
            )}
          </g>
        </svg>

        {/* Exact DOM anchor at revolver barrel tip for bullet origin */}
        <span
          ref={muzzleRef}
          aria-hidden="true"
          className="pointer-events-none absolute right-[6%] top-[49%] h-1 w-1"
        />
      </span>
    );
  }
);
