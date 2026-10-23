/**
 * Resolves the available options for a select column given the current form values.
 * @param {Object} column - The column metadata definition
 * @param {Object} formData - The current form values { [fieldName]: value }
 * @returns {Array<string>} Array of string options
 */
export function getSelectOptions(column, formData = {}) {
  if (!column || !column.options) return [];

  // Case 1: Simple array of options (['A', 'B', 'C'])
  if (Array.isArray(column.options)) {
    return column.options;
  }

  // Case 2: Dependent / conditional select
  if (typeof column.options === 'object' && column.options.dependsOn && column.options.mapping) {
    const parentField = column.options.dependsOn;
    const parentVal = formData[parentField];

    // If parent field is empty or not chosen yet
    if (parentVal === undefined || parentVal === null || parentVal === '') {
      return [];
    }

    const mapped = column.options.mapping[parentVal] || column.options.mapping[String(parentVal)];
    if (Array.isArray(mapped)) {
      return mapped;
    }
    if (typeof mapped === 'string') {
      return mapped.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  }

  return [];
}

/**
 * Returns the name of the parent column that this column depends on, or null.
 */
export function getColumnDependency(column) {
  if (column && typeof column.options === 'object' && !Array.isArray(column.options)) {
    return column.options.dependsOn || null;
  }
  return null;
}

/**
 * Checks if a column is a conditional / cascading select.
 */
export function isConditionalSelect(column) {
  return !!(
    column &&
    column.type === 'select' &&
    column.options &&
    !Array.isArray(column.options) &&
    column.options.dependsOn
  );
}


export function parseMappingInput(raw) {
  if (!raw || typeof raw !== 'string') return {};
  const trimmed = raw.trim();
  if (!trimmed) return {};

  let input = trimmed;
  // Extract object content if wrapped in `const x = { ... };` or similar JS variable declaration
  const firstBrace = input.indexOf('{');
  const lastBrace = input.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    input = input.slice(firstBrace, lastBrace + 1).trim();
  }

  // 1. Try standard JSON
  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const clean = {};
      for (const [k, v] of Object.entries(parsed)) {
        clean[k] = Array.isArray(v) ? v.map(String) : String(v).split(',').map(s => s.trim()).filter(Boolean);
      }
      return clean;
    }
  } catch (_) {
    // Continue to other formats
  }

  // 2. Try JSON with single quotes converted to double quotes and relaxed commas/keys
  try {
    const jsonRelaxed = input
      .replace(/'/g, '"')
      .replace(/,\s*([}\]])/g, '$1') // remove trailing commas
      .replace(/([{,]\s*)([a-zA-Z0-9_\-\u00C0-\u017F]+)\s*:/g, '$1"$2":'); // quote unquoted keys
    const parsed = JSON.parse(jsonRelaxed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const clean = {};
      for (const [k, v] of Object.entries(parsed)) {
        clean[k] = Array.isArray(v) ? v.map(String) : String(v).split(',').map(s => s.trim()).filter(Boolean);
      }
      return clean;
    }
  } catch (_) {
    // Continue
  }

  // 3. Fallback: line-by-line key: val1, val2 format
  const result = {};
  const lines = trimmed.split('\n');
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim().replace(/^['"]|['"]$/g, '');
      const valStr = line.slice(colonIdx + 1).trim();
      // Handle array syntax [a, b] or comma-separated
      const cleanVal = valStr.replace(/^\[|\]$/g, '');
      const items = cleanVal.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
      if (key) {
        result[key] = items;
      }
    }
  }

  return result;
}

/**
 * Formats a mapping object back to readable text (Line-by-line or JSON).
 */
export function formatMappingToText(mapping) {
  if (!mapping || typeof mapping !== 'object') return '';
  return Object.entries(mapping)
    .map(([key, list]) => `${key}: ${(Array.isArray(list) ? list : []).join(', ')}`)
    .join('\n');
}
