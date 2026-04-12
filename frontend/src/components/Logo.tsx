import { useId } from 'react'

interface LogoProps {
  /** 'dark' for dark backgrounds (white text), 'light' for light backgrounds (dark text) */
  variant?: 'dark' | 'light'
  /** 'sm' for compact navbars, 'md' (default) for sidebars and auth panels */
  size?: 'sm' | 'md'
  className?: string
}

export function Logo({ variant = 'light', size = 'md', className = '' }: LogoProps) {
  const uid = useId()
  const gradId = `bz-grad-${uid.replace(/:/g, '')}`

  const iconSize = size === 'sm' ? 26 : 32
  const textPrimary = variant === 'dark' ? 'text-white' : 'text-gray-900'
  const textSecondary = variant === 'dark' ? 'text-white/40' : 'text-gray-400'
  const titleSize = size === 'sm' ? 'text-[11px]' : 'text-[13px]'
  const subSize = size === 'sm' ? 'text-[7.5px]' : 'text-[8.5px]'

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* ── Logo mark: white "B" on violet→indigo gradient square ── */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7c3aed" />
            <stop offset="1" stopColor="#4338ca" />
          </linearGradient>
        </defs>
        <rect width="36" height="36" rx="9" fill={`url(#${gradId})`} />

        {/*
          "B" letterform built with evenodd fill-rule:
            • Outer path = full B silhouette (spine + two arched bumps)
            • Two inner rectangles = the counters (holes inside each arch)
        */}
        <path
          fillRule="evenodd"
          fill="white"
          d={[
            // Outer B silhouette
            'M10 9 L10 27',        // spine left edge down
            'L18.5 27',            // bottom edge right
            'C21.5 27 24 25 24 22',   // bottom arch outer curve
            'C24 19 21.5 18 18.5 18', // bottom arch back to junction
            'C21.5 18 23.5 16 23.5 13', // top arch outer curve start
            'C23.5 10 21 9 18 9',    // top arch back to top
            'Z',
            // Top counter (hole inside top arch)
            'M13.5 11.5 L17.5 11.5',
            'Q20.5 11.5 20.5 14',
            'Q20.5 16.5 17.5 16.5',
            'L13.5 16.5 Z',
            // Bottom counter (hole inside bottom arch, slightly wider)
            'M13.5 19.5 L18 19.5',
            'Q21.5 19.5 21.5 22.5',
            'Q21.5 25.5 18 25.5',
            'L13.5 25.5 Z',
          ].join(' ')}
        />
      </svg>

      {/* ── Wordmark ── */}
      <div className="flex flex-col leading-none">
        <span className={`font-bold tracking-[0.1em] ${titleSize} ${textPrimary}`}>
          BAIZE
        </span>
        <span className={`tracking-[0.22em] mt-0.5 font-medium ${subSize} ${textSecondary}`}>
          RESUME
        </span>
      </div>
    </div>
  )
}
