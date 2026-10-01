/**
 * Dynamic Contrast & Luminance Utility
 * Evaluates whether a background color is light or dark according to WCAG contrast standards.
 */

/**
 * Checks whether a given CSS color string represents a light/bright background.
 * Returns true if the background is light (requiring dark foreground text and icons).
 * Returns false if the background is dark (requiring light foreground text and icons).
 */
export function isLightColor(color: string | null | undefined): boolean {
  if (!color || typeof color !== 'string') return false;
  
  const trimmed = color.trim().toLowerCase();
  if (!trimmed || trimmed === 'transparent' || trimmed === 'rgba(0, 0, 0, 0)') {
    return false;
  }

  // Common named light colors
  const lightNamedColors = new Set([
    'white', 'snow', 'ghostwhite', 'whitesmoke', 'aliceblue',
    'seashell', 'ivory', 'floralwhite', 'linen', 'oldlace',
    'azure', 'mintcream', 'honeydew', 'lightgray', 'lightgrey'
  ]);
  if (lightNamedColors.has(trimmed)) return true;

  // Hex colors: #fff, #ffffff, #ffffff80
  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        // WCAG relative luminance weighting
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance >= 0.55;
      }
    }
  }

  // RGB and RGBA formats: rgb(255, 255, 255) / rgba(255, 255, 255, 0.9)
  const rgbMatch = trimmed.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;

    // If practically fully transparent, cannot determine light from RGBA alone
    if (a < 0.2) return false;

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance >= 0.55;
  }

  // HSL format: hsl(0, 0%, 100%)
  const hslMatch = trimmed.match(/hsla?\((\d+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\)/);
  if (hslMatch) {
    const lightness = parseFloat(hslMatch[3]);
    return lightness >= 55;
  }

  return false;
}
