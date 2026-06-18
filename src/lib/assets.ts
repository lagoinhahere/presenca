export function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${stripBasePath(path)}`
}

export function resolveAssetUrl(path: string | null | undefined) {
  if (!path) return null
  if (/^(https?:|data:|blob:)/.test(path)) return path
  return assetUrl(stripBasePath(path))
}

export function storageAssetPath(path: string | null | undefined) {
  if (!path) return null
  if (/^(https?:|data:|blob:)/.test(path)) return path
  return `/${stripBasePath(path)}`
}

function stripBasePath(path: string) {
  const base = import.meta.env.BASE_URL.replace(/^\/+|\/+$/g, '')
  let normalized = path.trim().replace(/^\/+/, '')

  if (!base) return normalized

  while (normalized === base || normalized.startsWith(`${base}/`)) {
    normalized = normalized.slice(base.length).replace(/^\/+/, '')
  }

  return normalized
}

export const brandLogoUrl = assetUrl('brand-logo.png')
export const brandCoverUrl = assetUrl('brand-cover.png')
export const defaultHeroUrl = assetUrl('default-hero.png')
