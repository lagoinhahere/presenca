import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { fallbackSettings } from '../lib/settings'
import type { AppSettings } from '../lib/types'
import { resolveAssetUrl } from '../lib/assets'

type SettingsContextValue = {
  settings: AppSettings
  loading: boolean
  reloadSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(fallbackSettings)
  const [loading, setLoading] = useState(true)

  async function reloadSettings() {
    const { data, error } = await supabase.from('app_settings').select('*').limit(1).maybeSingle()
    if (!error && data) {
      setSettings({
        ...fallbackSettings,
        ...data,
        logo_url: resolveAssetUrl(data.logo_url),
        default_banner_url: resolveAssetUrl(data.default_banner_url),
      })
    }
  }

  useEffect(() => {
    reloadSettings().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--brand-primary', settings.primary_color)
    root.style.setProperty('--brand-accent', settings.accent_color)
    root.style.setProperty('--brand-primary-rgb', hexToRgb(settings.primary_color))
    root.style.setProperty('--brand-accent-rgb', hexToRgb(settings.accent_color))
  }, [settings.primary_color, settings.accent_color])

  const value = useMemo(() => ({ settings, loading, reloadSettings }), [settings, loading])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const value = useContext(SettingsContext)
  if (!value) throw new Error('useSettings must be used inside SettingsProvider')
  return value
}

function hexToRgb(value: string) {
  const hex = value.replace('#', '').trim()
  const normalized = hex.length === 3
    ? hex.split('').map((char) => `${char}${char}`).join('')
    : hex
  const parsed = Number.parseInt(normalized, 16)
  if (Number.isNaN(parsed)) return '255 196 0'
  return `${(parsed >> 16) & 255} ${(parsed >> 8) & 255} ${parsed & 255}`
}
