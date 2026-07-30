/** 主题循环：dark → light → system → dark */
export function cycleTheme(current) {
  if (current === 'dark') return 'light'
  if (current === 'light') return 'system'
  return 'dark'
}
