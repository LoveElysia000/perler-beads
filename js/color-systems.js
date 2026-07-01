export const COLOR_SYSTEMS = ['MARD', 'COCO', '漫漫', '盼盼', '咪小窝'];
export const DEFAULT_COLOR_SYSTEM = 'MARD';

const HEX_PATTERN = /^#[0-9A-F]{6}$/;

export function normalizeHex(hex) {
  if (typeof hex !== 'string') {
    throw new Error(`Invalid hex: expected string, got ${typeof hex}`);
  }
  const normalized = hex.trim().toUpperCase();
  if (!HEX_PATTERN.test(normalized)) {
    throw new Error(`Invalid hex "${hex}": expected #RRGGBB`);
  }
  return normalized;
}

export function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  return [
    parseInt(normalized.slice(1, 3), 16),
    parseInt(normalized.slice(3, 5), 16),
    parseInt(normalized.slice(5, 7), 16),
  ];
}

export function validateColorSystemMapping(mapping, options = {}) {
  const errors = [];
  const warnings = [];
  const seenCodes = new Map(COLOR_SYSTEMS.map((system) => [system, new Map()]));

  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
    errors.push('Mapping must be an object keyed by #RRGGBB hex values');
  } else {
    for (const [rawHex, rawEntry] of Object.entries(mapping)) {
      let hex = rawHex;
      try {
        hex = normalizeHex(rawHex);
      } catch (error) {
        errors.push(error.message);
        continue;
      }

      if (hex !== rawHex) {
        errors.push(`Invalid hex "${rawHex}": hex keys must be uppercase #RRGGBB`);
        continue;
      }

      if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) {
        errors.push(`Entry for ${hex} must be an object`);
        continue;
      }

      for (const system of COLOR_SYSTEMS) {
        if (!(system in rawEntry)) {
          errors.push(`Missing color system ${system} for ${hex}`);
          continue;
        }
        const value = rawEntry[system];
        if (typeof value !== 'string' || value.trim() === '') {
          errors.push(`Empty code for ${hex} in ${system}`);
          continue;
        }
        if (value !== value.trim()) {
          errors.push(`Code for ${hex} in ${system} must not contain leading or trailing whitespace`);
          continue;
        }

        const codeMap = seenCodes.get(system);
        const existingHex = codeMap.get(value);
        if (existingHex && existingHex !== hex) {
          warnings.push(`duplicate code ${value} in ${system}: ${existingHex} and ${hex}`);
        } else {
          codeMap.set(value, hex);
        }
      }
    }
  }

  if (options.throwOnError && errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function buildPaletteFromMapping(mapping) {
  validateColorSystemMapping(mapping, { throwOnError: true });
  return Object.keys(mapping)
    .map((hex) => ({ hex, rgb: hexToRgb(hex) }));
}

export function getColorEntry(hex, mapping) {
  try {
    return mapping?.[normalizeHex(hex)] || null;
  } catch {
    return null;
  }
}

export function getColorCode(hex, system = DEFAULT_COLOR_SYSTEM, mapping = {}) {
  if (!COLOR_SYSTEMS.includes(system)) return '?';
  const entry = getColorEntry(hex, mapping);
  return entry?.[system] || '?';
}
