// Cloudinary image URL helpers.
// Returns the correct size URL for each display context.
// Falls back gracefully to obs.image in local dev (non-Cloudinary URLs pass through unchanged).

export function thumbnailUrl(obs) {
  return obs?.thumbnail_url || obs?.image || null;
}

export function detailMobileUrl(obs) {
  return obs?.detail_mobile_url || obs?.image || null;
}

export function detailDesktopUrl(obs) {
  return obs?.detail_desktop_url || obs?.image || null;
}

export function previewUrl(obs) {
  return obs?.preview_url || obs?.image || null;
}

export function lightboxUrl(obs) {
  const w = window.innerWidth;
  if (w < 768) return obs?.detail_mobile_url || obs?.image || null;
  if (w < 1200) return obs?.detail_desktop_url || obs?.image || null;
  return obs?.preview_url || obs?.image || null;
}
