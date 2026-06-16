import { MapPinCheck } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'

export function LogoMark({ compact = false }: { compact?: boolean }) {
  const { settings } = useSettings()

  return (
    <div className="flex items-center gap-3">
      {settings.logo_url ? (
        <img className="h-11 w-11 rounded-lg bg-[#050505] object-contain p-1.5" src={settings.logo_url} alt={settings.platform_name} />
      ) : (
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#050505] text-[#ffc400] shadow-lg shadow-black/20">
          <MapPinCheck size={24} />
        </div>
      )}
      {!compact && (
        <div className="min-w-0">
          <p className="truncate text-base font-black text-[#fff8df]">{settings.platform_name}</p>
          <p className="truncate text-xs font-bold uppercase tracking-[0.18em] text-[#ffc400]">{settings.church_name}</p>
        </div>
      )}
    </div>
  )
}
