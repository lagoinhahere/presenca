import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { fallbackSettings } from '../lib/settings'
import type { AppSettings } from '../lib/types'

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
    if (!error && data) setSettings({ ...fallbackSettings, ...data })
  }

  useEffect(() => {
    reloadSettings().finally(() => setLoading(false))
  }, [])

  const value = useMemo(() => ({ settings, loading, reloadSettings }), [settings, loading])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const value = useContext(SettingsContext)
  if (!value) throw new Error('useSettings must be used inside SettingsProvider')
  return value
}
