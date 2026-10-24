function parseBracketClause(source, start) {
  if (source[start] !== '[') return null;
  let depth = 0;
  let inQuote = null;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inQuote) {
      if (ch === '\\' && i + 1 < source.length) {
        i++;
        continue;
      }
      if (ch === inQuote) inQuote = null;
    } else {
      if (ch === '"' || ch === "'") {
        inQuote = ch;
      } else if (ch === '[') {
        depth++;
      } else if (ch === ']') {
        depth--;
        if (depth === 0) {
          return { content: source.slice(start + 1, i), end: i + 1 };
        }
      }
    }
  }
  return null;
}

function unquote(str) {
  const trimmed = (str || '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function evaluateExpr(expr, variables, countMap, contextTable) {
  if (!expr || typeof expr !== 'string') return false;
  const trimmed = expr.trim();
  if (!trimmed) return true;

  const resolveVal = (val) => {
    let unq = unquote(val);
    // Variable with bracket $[...]
    if (unq.startsWith('$[') && unq.endsWith(']')) {
      const inner = unq.slice(2, -1).trim();
      if (inner.startsWith('count[')) {
        const tblMatch = /^count\[\s*([^\]]+?)\s*\]$/.exec(inner);
        return String(getCountForTable(tblMatch ? tblMatch[1] : '', countMap, contextTable));
      }
      if (variables[inner] !== undefined) return String(variables[inner]);
      return String(getCountForTable(inner, countMap, contextTable));
    }
    // Direct count[table]
    if (unq.startsWith('count[')) {
      const tblMatch = /^count\[\s*([^\]]+?)\s*\]$/.exec(unq);
      return String(getCountForTable(tblMatch ? tblMatch[1] : '', countMap, contextTable));
    }
    // Direct variable name without $[...]
    if (variables[unq] !== undefined) return String(variables[unq]);
    if (variables[unq.toLowerCase()] !== undefined) return String(variables[unq.toLowerCase()]);
    if (hasTable(unq, countMap)) return String(getCountForTable(unq, countMap, contextTable));
    return unq;
  };

  const opMatch = /(==|!=|>=|<=|>|<)/.exec(trimmed);
  if (!opMatch) {
    if (trimmed.startsWith('!')) {
      const val = resolveVal(trimmed.slice(1).trim());
      return !val || val === '0' || val === 'false' || val === 'null' || val === 'undefined';
    }
    const val = resolveVal(trimmed);
    return Boolean(val && val !== '0' && val !== 'false' && val !== 'null' && val !== 'undefined');
  }

  const op = opMatch[1];
  const rawLhs = trimmed.slice(0, opMatch.index).trim();
  const rawRhs = trimmed.slice(opMatch.index + op.length).trim();

  const lhs = resolveVal(rawLhs);
  const rhs = resolveVal(rawRhs);

  const numL = Number(lhs);
  const numR = Number(rhs);
  const isNumeric = !isNaN(numL) && !isNaN(numR) && lhs !== '' && rhs !== '';

  switch (op) {
    case '==':
      return isNumeric ? numL === numR : lhs.toLowerCase() === rhs.toLowerCase();
    case '!=':
      return isNumeric ? numL !== numR : lhs.toLowerCase() !== rhs.toLowerCase();
    case '>':
      return isNumeric ? numL > numR : lhs > rhs;
    case '<':
      return isNumeric ? numL < numR : lhs < rhs;
    case '>=':
      return isNumeric ? numL >= numR : lhs >= rhs;
    case '<=':
      return isNumeric ? numL <= numR : lhs <= rhs;
    default:
      return false;
  }
}

function parseCondition(source, start, variables, countMap, contextTable) {
  let cursor = start;

  if (source.startsWith('$[if[', cursor)) {
    cursor += 4;
  } else if (source.startsWith('$if[', cursor)) {
    cursor += 3;
  } else {
    return null;
  }

  // 1. Condition expression clause: [3==3]
  const condClause = parseBracketClause(source, cursor);
  if (!condClause) return null;
  cursor = condClause.end;

  // Skip whitespace
  while (cursor < source.length && /\s/.test(source[cursor])) cursor++;

  // 2. Return / then clause: return[...] or then[...]
  let thenText = '';
  if (source.startsWith('return[', cursor)) {
    cursor += 6;
  } else if (source.startsWith('then[', cursor)) {
    cursor += 4;
  } else {
    return null;
  }

  const thenClause = parseBracketClause(source, cursor);
  if (!thenClause) return null;
  thenText = unquote(thenClause.content);
  cursor = thenClause.end;

  // Skip whitespace
  while (cursor < source.length && /\s/.test(source[cursor])) cursor++;

  // 3. Optional else clause: else[...]
  let elseText = '';
  if (source.startsWith('else[', cursor)) {
    cursor += 4;
    const elseClause = parseBracketClause(source, cursor);
    if (!elseClause) return null;
    elseText = unquote(elseClause.content);
    cursor = elseClause.end;
  }

  // 4. Optional trailing closing ']'
  if (cursor < source.length && source[cursor] === ']') {
    cursor++;
  }

  const isTrue = evaluateExpr(condClause.content, variables, countMap, contextTable);

  return {
    end: cursor,
    replacement: isTrue ? thenText : elseText
  };
}

export function simplifyTableName(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents (détes -> detes)
    .replace(/^app_/, '')             // remove app_ prefix (app_detes -> detes)
    .replace(/[^a-z0-9]/g, '')       // keep only alphanumeric
    .replace(/(.)\1+/g, '$1')        // collapse double letters (dettes -> detes)
    .replace(/s$/, '');              // strip trailing s for plural/singular match (detes <-> dete)
}

export function hasTable(tableName, counts) {
  if (!counts) return false;
  const raw = String(tableName || '').trim();
  if (!raw) return false;
  if (counts[raw] !== undefined || counts[raw.toLowerCase()] !== undefined) return true;
  const targetSimple = simplifyTableName(raw);
  for (const key of Object.keys(counts)) {
    if (simplifyTableName(key) === targetSimple) return true;
  }
  return false;
}

export function getCountForTable(tableName, counts, contextTable) {
  if (!counts) return 0;
  const raw = String(tableName || '').trim();
  if (!raw) return 0;

  // Context fallback if requested as 'table'
  if (raw.toLowerCase() === 'table' && contextTable && counts['table'] === undefined) {
    return getCountForTable(contextTable, counts);
  }

  // 1. Direct exact match
  if (counts[raw] !== undefined) return counts[raw];

  const clean = raw.toLowerCase();
  if (counts[clean] !== undefined) return counts[clean];

  // 2. Strip 'app_' prefix (ex: app_detes -> detes)
  const noApp = clean.startsWith('app_') ? clean.slice(4) : clean;
  if (counts[noApp] !== undefined) return counts[noApp];

  // 3. Add 'app_' prefix (ex: detes -> app_detes)
  const withApp = `app_${noApp}`;
  if (counts[withApp] !== undefined) return counts[withApp];

  // 4. Case-insensitive lookup over all keys
  for (const [key, val] of Object.entries(counts)) {
    const k = key.toLowerCase();
    if (k === clean || k === noApp || k === withApp) {
      return val;
    }
  }

  // 5. Fuzzy match (handles detes <-> dettes <-> dete, accents, hyphens)
  const targetSimple = simplifyTableName(raw);
  for (const [key, val] of Object.entries(counts)) {
    if (simplifyTableName(key) === targetSimple) {
      return val;
    }
  }

  return 0;
}

export function normalizeCounts(counts) {
  if (!counts) return {};
  const map = {};

  const addEntry = (name, val, label) => {
    if (!name) return;
    const countVal = Number(val ?? 0) || 0;
    map[name] = countVal;
    map[name.toLowerCase()] = countVal;

    // Both with and without app_ prefix
    if (name.toLowerCase().startsWith('app_')) {
      const stripped = name.slice(4);
      map[stripped] = countVal;
      map[stripped.toLowerCase()] = countVal;
    } else {
      map[`app_${name}`] = countVal;
      map[`app_${name.toLowerCase()}`] = countVal;
    }

    if (label) {
      map[label] = countVal;
      map[label.toLowerCase()] = countVal;
    }
  };

  if (Array.isArray(counts)) {
    for (const t of counts) {
      if (t && t.name) {
        addEntry(t.name, t.rowCount ?? t.count ?? 0, t.label);
      }
    }
    return map;
  }

  if (typeof counts === 'object') {
    for (const [key, val] of Object.entries(counts)) {
      if (val && typeof val === 'object' && (val.rowCount !== undefined || val.count !== undefined)) {
        addEntry(key, val.rowCount ?? val.count ?? 0, val.label);
      } else {
        addEntry(key, val);
      }
    }
    return map;
  }

  return {};
}

function resolveConditions(text, variables, countMap, contextTable) {
  let result = '';
  let cursor = 0;
  while (cursor < text.length) {
    const idxDollar = text.indexOf('$', cursor);
    if (idxDollar === -1) {
      return result + text.slice(cursor);
    }
    result += text.slice(cursor, idxDollar);

    const condition = parseCondition(text, idxDollar, variables, countMap, contextTable);
    if (condition) {
      result += condition.replacement;
      cursor = condition.end;
    } else {
      result += '$';
      cursor = idxDollar + 1;
    }
  }
  return result;
}

/** Resolve the small, deliberately non-executable template syntax used in page text. */
export function resolveTemplate(value, userOrContext, tableCounts = {}) {
  if (typeof value !== 'string') return value;

  let user = userOrContext;
  let counts = tableCounts;
  let contextTable = '';

  if (userOrContext && typeof userOrContext === 'object') {
    if ('user' in userOrContext || 'tableCounts' in userOrContext || 'tables' in userOrContext || 'tableName' in userOrContext) {
      user = userOrContext.user;
      counts = userOrContext.tableCounts || userOrContext.tables || tableCounts;
      contextTable = userOrContext.tableName || '';
    }
  }

  const countMap = normalizeCounts(counts);

  const variables = {
    username: user?.username || user?.pseudo || 'visiteur',
    pseudo: user?.username || user?.pseudo || 'visiteur',
    nom: user?.username || user?.pseudo || 'visiteur',
    role: user?.role || 'visiteur',
    email: user?.email || '',
    id: String(user?.id || ''),
  };

  if (user && typeof user === 'object') {
    for (const [k, v] of Object.entries(user)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        variables[k.toLowerCase()] = String(v);
        variables[k] = String(v);
      }
    }
  }

  // Also expose table names directly as variables: $[detes], $[app_detes], $[clients]
  for (const [tblName, cnt] of Object.entries(countMap)) {
    if (!variables[tblName]) {
      variables[tblName] = String(cnt);
    }
  }

  // 1. Resolve conditions ($if[...] and $[if[...]])
  let text = resolveConditions(value, variables, countMap, contextTable);

  // 2. Resolve $[count[table]] (with any table name syntax, accents, app_ prefix, etc.)
  text = text.replace(/\$\[count\[\s*([^\]]+?)\s*\]\]/gi, (match, tableName) => {
    return String(getCountForTable(tableName, countMap, contextTable));
  });

  if (contextTable) {
    text = text.replace(/\$\[count\]/gi, () => {
      return String(getCountForTable(contextTable, countMap, contextTable));
    });
  }

  // 3. Resolve standard variables $[username], $[role], and direct $[detes], $[dete], $[app_detes]
  text = text.replace(/\$\[([a-zA-Z][a-zA-Z0-9_]*)\]/g, (match, variable) => {
    if (Object.hasOwn(variables, variable)) {
      return String(variables[variable]);
    }
    if (hasTable(variable, countMap)) {
      return String(getCountForTable(variable, countMap, contextTable));
    }
    return match;
  });

  // 4. Preserve line breaks for paragraphs: convert literal \n or <br> to real newline
  text = text.replace(/\\n/g, '\n').replace(/<br\s*\/?>/gi, '\n');

  return text;
}

export function resolveTemplateObject(value, userOrContext, tableCounts) {
  if (typeof value === 'string') return resolveTemplate(value, userOrContext, tableCounts);
  if (Array.isArray(value)) return value.map(item => resolveTemplateObject(item, userOrContext, tableCounts));
  if (value && typeof value === 'object') {
    let ctx = userOrContext;
    if (value.tableName && typeof userOrContext === 'object' && !('tableName' in (userOrContext || {}))) {
      ctx = {
        user: userOrContext?.user || userOrContext,
        tableCounts: userOrContext?.tableCounts || tableCounts,
        tableName: value.tableName,
      };
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveTemplateObject(item, ctx, tableCounts)]));
  }
  return value;
}

/**
 * Evaluates whether a block should be visible based on its visibilityRule.
 * Examples:
 *  - "pseudo == admin"
 *  - "role == admin"
 *  - "role != visiteur"
 *  - "count[app_detes] > 0"
 *  - "$if[pseudo == admin]"
 *  - empty or undefined => true (always visible)
 */
export function evaluateVisibilityCondition(condition, userOrContext, tableCounts) {
  if (!condition || typeof condition !== 'string' || !condition.trim()) {
    return true; // No rule defined => always visible
  }

  let expr = condition.trim();

  // Strip wrapping $if[...] or $[if[...]] if entered
  if (expr.startsWith('$[if[') || expr.startsWith('$if[')) {
    const startIdx = expr.startsWith('$[if[') ? 4 : 3;
    const clause = parseBracketClause(expr, startIdx);
    if (clause) {
      expr = clause.content;
    }
  }

  let user = userOrContext;
  let counts = tableCounts;
  let contextTable = '';

  if (userOrContext && typeof userOrContext === 'object') {
    if ('user' in userOrContext || 'tableCounts' in userOrContext || 'tables' in userOrContext || 'tableName' in userOrContext) {
      user = userOrContext.user;
      counts = userOrContext.tableCounts || userOrContext.tables || tableCounts;
      contextTable = userOrContext.tableName || '';
    }
  }

  const countMap = normalizeCounts(counts);

  const variables = {
    username: user?.username || user?.pseudo || 'visiteur',
    pseudo: user?.username || user?.pseudo || 'visiteur',
    nom: user?.username || user?.pseudo || 'visiteur',
    role: user?.role || 'visiteur',
    email: user?.email || '',
    id: String(user?.id || ''),
  };

  if (user && typeof user === 'object') {
    for (const [k, v] of Object.entries(user)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        variables[k.toLowerCase()] = String(v);
        variables[k] = String(v);
      }
    }
  }

  for (const [tblName, cnt] of Object.entries(countMap)) {
    if (!variables[tblName]) {
      variables[tblName] = String(cnt);
    }
  }

  return evaluateExpr(expr, variables, countMap, contextTable);
}
