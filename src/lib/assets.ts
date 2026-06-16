export function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}

export function resolveAssetUrl(path: string | null | undefined) {
  if (!path) return null
  if (/^(https?:|data:|blob:)/.test(path)) return path
  return assetUrl(path)
}

export const brandLogoUrl = assetUrl('brand-logo.png')
export const brandCoverUrl = assetUrl('brand-cover.png')
export const defaultHeroUrl = assetUrl('default-hero.png')
