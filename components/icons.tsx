import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { large?: boolean }
const cls = (c?: string, l?: boolean) =>
  `icon${l ? ' icon-lg' : ''}${c ? ' ' + c : ''}`

export const BarChartIcon = ({ className, large, ...p }: P) => (
  <svg className={cls(className, large)} viewBox="0 0 24 24" {...p}>
    <path d="M3 21h18"/><rect x="5" y="12" width="3" height="7"/>
    <rect x="11" y="8" width="3" height="11"/><rect x="17" y="4" width="3" height="15"/>
  </svg>
)
export const UploadIcon = ({ className, large, ...p }: P) => (
  <svg className={cls(className, large)} viewBox="0 0 24 24" {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)
export const DownloadIcon = ({ className, large, ...p }: P) => (
  <svg className={cls(className, large)} viewBox="0 0 24 24" {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
export const SlidersIcon = ({ className, large, ...p }: P) => (
  <svg className={cls(className, large)} viewBox="0 0 24 24" {...p}>
    <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
    <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
    <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
    <line x1="17" y1="16" x2="23" y2="16"/>
  </svg>
)
export const SaveIcon = ({ className, large, ...p }: P) => (
  <svg className={cls(className, large)} viewBox="0 0 24 24" {...p}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
)
export const SunIcon = ({ className, large, ...p }: P) => (
  <svg className={cls(className, large)} viewBox="0 0 24 24" {...p}>
    <circle cx="12" cy="12" r="4"/>
    <line x1="12" y1="2" x2="12" y2="5"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="4.93" y1="4.93" x2="7.05" y2="7.05"/>
    <line x1="16.95" y1="16.95" x2="19.07" y2="19.07"/>
    <line x1="2" y1="12" x2="5" y2="12"/>
    <line x1="19" y1="12" x2="22" y2="12"/>
    <line x1="4.93" y1="19.07" x2="7.05" y2="16.95"/>
    <line x1="16.95" y1="7.05" x2="19.07" y2="4.93"/>
  </svg>
)
export const MoonIcon = ({ className, large, ...p }: P) => (
  <svg className={cls(className, large)} viewBox="0 0 24 24" {...p}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)
export const LockIcon = ({ className, large, ...p }: P) => (
  <svg className={cls(className, large)} viewBox="0 0 24 24" {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2"/>
    <path d="M8 11V8a4 4 0 0 1 8 0v3"/>
  </svg>
)
