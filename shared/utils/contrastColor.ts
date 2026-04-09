/**
 * Determine whether to use dark or light text based on the background color.
 */
export function contrastColor(hexColor: string): string {
  // Validate hex color format (6 hex characters)
  if (!/^[0-9a-fA-F]{6}$/.test(hexColor)) {
    return '#ffffff'; // fallback to white text for invalid colors
  }
  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);
  // Perceived luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
