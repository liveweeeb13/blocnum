function readQuotedValue(source, start) {
  const quote = source[start];
  if (quote !== '"' && quote !== "'") return null;
  let value = '';
  for (let i = start + 1; i < source.length; i++) {
    if (source[i] === '\\' && i + 1 < source.length) {
      value += source[i + 1];
      i++;
    } else if (source[i] === quote && source[i + 1] === ']') {
      return { value, end: i + 1 };
    } else {
      value += source[i];
    }
  }
  return null;
}

function readCondition(source, start) {
  const match = /^\$\[if\[\s*\$\[([a-zA-Z][a-zA-Z0-9_]*)\]\s*(==|!=)\s*/.exec(source.slice(start));
  if (!match) return null;
  const expected = readQuotedValue(source, start + match[0].length);
  if (!expected || source.slice(expected.end, expected.end + 1) !== ']') return null;
  const thenStart = expected.end + 1;
  if (!source.startsWith('return[', thenStart)) return null;
  const thenValue = readQuotedValue(source, thenStart + 'return['.length);
  if (!thenValue || source.slice(thenValue.end, thenValue.end + 1) !== ']') return null;
  const elseStart = thenValue.end + 1;
  if (!source.startsWith('else[', elseStart)) return null;
  const elseValue = readQuotedValue(source, elseStart + 'else['.length);
  if (!elseValue || source.slice(elseValue.end, elseValue.end + 2) !== ']]') return null;
  return {
    end: elseValue.end + 2,
    variable: match[1],
    operator: match[2],
    expected: expected.value,
    thenText: thenValue.value,
    elseText: elseValue.value,
  };
}

function resolveConditions(text, variables) {
  let result = '';
  let cursor = 0;
  while (cursor < text.length) {
    const start = text.indexOf('$[if[', cursor);
    if (start === -1) return result + text.slice(cursor);
    result += text.slice(cursor, start);
    const condition = readCondition(text, start);
    if (!condition) {
      result += '$[if[';
      cursor = start + 5;
      continue;
    }
    const matches = String(variables[condition.variable] ?? '') === condition.expected;
    result += (condition.operator === '==' ? matches : !matches) ? condition.thenText : condition.elseText;
    cursor = condition.end;
  }
  return result;
}

/** Resolve the small, deliberately non-executable template syntax used in page text. */
export function resolveTemplate(value, user) {
  if (typeof value !== 'string') return value;

  const variables = {
    username: user?.username || 'visiteur',
    role: user?.role || 'visiteur',
  };

  return resolveConditions(value, variables)
    .replace(/\$\[([a-zA-Z][a-zA-Z0-9_]*)\]/g, (match, variable) => (
      Object.hasOwn(variables, variable) ? String(variables[variable]) : match
    ));
}

export function resolveTemplateObject(value, user) {
  if (typeof value === 'string') return resolveTemplate(value, user);
  if (Array.isArray(value)) return value.map(item => resolveTemplateObject(item, user));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveTemplateObject(item, user)]));
  }
  return value;
}
