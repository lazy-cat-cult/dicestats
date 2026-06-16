import type {
  PresetConfig,
  DicePool,
  DiceTerm,
  RerollCondition,
  ConditionChain,
  ConditionClause,
  ConditionOperator,
  FaceValueSpecial,
  NamedValue,
  Outcome,
  OutcomeCondition,
  ScalarFunction,
  ScalarBinaryOp,
  VectorFunction,
  Parameter,
  ParameterTarget,
  DiceConditionType,
} from '@/types';

export class YamlError extends Error {
  line: number;
  col: number;
  constructor(message: string, line: number, col: number) {
    super(`YAML error at ${line}:${col}: ${message}`);
    this.name = 'YamlError';
    this.line = line;
    this.col = col;
  }
}

export class PresetError extends Error {
  constructor(message: string) {
    super(`Preset error: ${message}`);
    this.name = 'PresetError';
  }
}

type YamlNode = string | number | boolean | null | YamlNode[] | { [k: string]: YamlNode };

interface Token {
  line: number;
  col: number;
  kind: 'key' | 'value' | 'list-dash' | 'indent' | 'dedent' | 'newline' | 'comment';
  indent: number;
  text: string;
  comment?: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'dice-pool';
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const lines = text.split(/\r?\n/);
  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li] ?? '';
    const lineNo = li + 1;
    let i = 0;
    while (i < raw.length && (raw[i] === ' ' || raw[i] === '\t')) i++;
    const indent = i;
    const rest = raw.slice(i);

    if (rest === '') {
      continue;
    }

    const hashIdx = rest.indexOf('#');
    if (hashIdx >= 0) {
      const prefix = rest.slice(0, hashIdx);
      if (prefix.trim() === '') {
        continue;
      }
      const trailingComment = rest.slice(hashIdx + 1).trim();
      let j = 0;
      while (j < prefix.length && (prefix[j] === ' ' || prefix[j] === '\t')) j++;
      const trimmedPrefix = prefix.slice(j);
      let effectiveRest: string;
      let k: number;
      if (trimmedPrefix.startsWith('- ')) {
        tokens.push({ line: lineNo, col: indent + 1, kind: 'list-dash', indent, text: '' });
        k = 2;
        const afterDash = trimmedPrefix.slice(k);
        effectiveRest = afterDash;
        const colonIdx = afterDash.indexOf(':');
        const eqIdx = afterDash.indexOf('=');
        const delimIdx = colonIdx >= 0 && (eqIdx < 0 || colonIdx < eqIdx) ? colonIdx : eqIdx;
        const spaceIdx = afterDash.search(/\s/);
        if (delimIdx > 0 && (spaceIdx < 0 || delimIdx < spaceIdx)) {
          const delim = afterDash[delimIdx];
          const key = afterDash.slice(0, delimIdx).trim();
          if (/^[A-Za-z_][A-Za-z0-9_.\- ]*$/.test(key) && delim === ':') {
            tokens.push({ line: lineNo, col: indent + k + 1, kind: 'key', indent, text: key });
            k += delimIdx + 1;
            while (k < trimmedPrefix.length && trimmedPrefix[k] === ' ') k++;
            effectiveRest = trimmedPrefix.slice(k);
          }
        }
      } else {
        const colonIdx = trimmedPrefix.indexOf(':');
        if (colonIdx < 0) {
          throw new YamlError(`Expected ':' in mapping line`, lineNo, indent + 1);
        }
        const key = trimmedPrefix.slice(0, colonIdx).trim();
        if (!/^[A-Za-z_][A-Za-z0-9_.\- ]*$/.test(key)) {
          throw new YamlError(`Invalid key "${key}"`, lineNo, indent + 1);
        }
        tokens.push({ line: lineNo, col: indent + 1, kind: 'key', indent, text: key });
        k = colonIdx + 1;
        while (k < trimmedPrefix.length && trimmedPrefix[k] === ' ') k++;
        effectiveRest = trimmedPrefix.slice(k);
      }
      const valueText = effectiveRest.trim();
      if (valueText !== '') {
        tokens.push({ line: lineNo, col: indent + k + 1, kind: 'value', indent, text: valueText });
      }
      tokens.push({ line: lineNo, col: hashIdx + 1, kind: 'comment', indent, text: trailingComment });
    } else {
      let j: number;
      if (rest.startsWith('- ')) {
        tokens.push({ line: lineNo, col: indent + 1, kind: 'list-dash', indent, text: '' });
        j = 2;
        const afterDash = rest.slice(j);
        const colonIdx = afterDash.indexOf(':');
        const eqIdx = afterDash.indexOf('=');
        const delimIdx = colonIdx >= 0 && (eqIdx < 0 || colonIdx < eqIdx) ? colonIdx : eqIdx;
        const spaceIdx = afterDash.search(/\s/);
        if (delimIdx > 0 && (spaceIdx < 0 || delimIdx < spaceIdx)) {
          const delim = afterDash[delimIdx];
          const key = afterDash.slice(0, delimIdx).trim();
          if (/^[A-Za-z_][A-Za-z0-9_.\- ]*$/.test(key) && delim === ':') {
            tokens.push({ line: lineNo, col: indent + j + 1, kind: 'key', indent, text: key });
            j += delimIdx + 1;
            while (j < rest.length && rest[j] === ' ') j++;
          }
        }
        const valueText = rest.slice(j).trim();
        if (valueText !== '') {
          tokens.push({ line: lineNo, col: indent + j + 1, kind: 'value', indent, text: valueText });
        }
      } else {
        const colonIdx = rest.indexOf(':');
        if (colonIdx < 0) {
          throw new YamlError(`Expected ':' in mapping line`, lineNo, indent + 1);
        }
        const key = rest.slice(0, colonIdx).trim();
        if (!/^[A-Za-z_][A-Za-z0-9_.\- ]*$/.test(key)) {
          throw new YamlError(`Invalid key "${key}"`, lineNo, indent + 1);
        }
        tokens.push({ line: lineNo, col: indent + 1, kind: 'key', indent, text: key });
        j = colonIdx + 1;
        while (j < rest.length && rest[j] === ' ') j++;
        const valueText = rest.slice(j).trim();
        if (valueText !== '') {
          tokens.push({ line: lineNo, col: indent + j + 1, kind: 'value', indent, text: valueText });
        }
      }
    }

    tokens.push({ line: lineNo, col: raw.length + 1, kind: 'newline', indent, text: '' });
  }
  tokens.push({ line: lines.length + 1, col: 1, kind: 'newline', indent: 0, text: '' });
  return tokens;
}

function parseScalar(text: string): YamlNode {
  if (text === '~' || text === 'null') return null;
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?\d+$/.test(text)) return parseInt(text, 10);
  if (/^-?\d+\.\d+$/.test(text)) return parseFloat(text);
  if (text.startsWith('"') && text.endsWith('"')) {
    return text.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n');
  }
  if (text.startsWith('[') && text.endsWith(']')) {
    const inner = text.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((s) => parseScalar(s.trim()));
  }
  return text;
}

function parseBlocks(tokens: Token[]): YamlNode {
  let pos = 0;

  function peek(): Token | undefined { return tokens[pos]; }
  function next(): Token { return tokens[pos++] ?? { line: 0, col: 0, kind: 'newline', indent: 0, text: '' }; }

  function skipNewlines(): void {
    while (peek() && (peek()!.kind === 'newline' || peek()!.kind === 'comment')) next();
  }

  function consumeInlineComment(): string {
    const t = peek();
    if (t && t.kind === 'comment') {
      next();
      return t.text;
    }
    return '';
  }

  function parseList(indent: number): YamlNode[] {
    const arr: YamlNode[] = [];
    while (true) {
      const t = peek();
      if (!t) break;
      if (t.kind === 'newline' || t.kind === 'comment') { next(); continue; }
      if (t.indent < indent) break;
      if (t.indent === indent && t.kind === 'list-dash') {
        const dashTok = next();
        const inline = peek();
        if (!inline) {
          arr.push(null);
          continue;
        }
        if (inline.kind === 'value') {
          next();
          const c = consumeInlineComment();
          const v = parseScalar(inline.text);
          arr.push(c ? { _value: v, _comment: c } : v);
          continue;
        }
        if (inline.kind === 'key') {
          const keyTok = next();
          const obj: { [k: string]: YamlNode } = {};
          parseInlineKeyValue(obj, keyTok, dashTok.indent + 2);
          arr.push(obj);
          continue;
        }
        if (inline.kind === 'list-dash') {
          arr.push(null);
          continue;
        }
        if (inline.kind === 'newline') { next(); continue; }
        break;
      }
      if (t.indent > indent) { next(); continue; }
      break;
    }
    return arr;
  }

  function parseInlineKeyValue(obj: { [k: string]: YamlNode }, keyTok: Token, minIndent: number): void {
    const afterKey = peek();
    if (afterKey && afterKey.kind === 'value') {
      next();
      const v = afterKey.text;
      if (v === '[]') { obj[keyTok.text] = []; return; }
      if (v === '{}') { obj[keyTok.text] = {}; return; }
      const c = consumeInlineComment();
      obj[keyTok.text] = c ? { _value: parseScalar(v), _comment: c } : parseScalar(v);
      parseMappingContinuation(obj, minIndent);
      return;
    }
    if (afterKey && afterKey.kind === 'list-dash') {
      obj[keyTok.text] = parseList(keyTok.indent + 2);
      parseMappingContinuation(obj, minIndent);
      return;
    }
    if (afterKey && (afterKey.kind === 'newline' || afterKey.kind === 'comment')) {
      next();
      const peekNext = peek();
      if (peekNext && peekNext.indent > keyTok.indent) {
        obj[keyTok.text] = parseBlocksAtIndent(peekNext.indent);
        parseMappingContinuation(obj, peekNext.indent);
        return;
      }
      obj[keyTok.text] = null;
      return;
    }
    obj[keyTok.text] = null;
  }

  function parseMappingContinuation(obj: { [k: string]: YamlNode }, minIndent: number): void {
    while (true) {
      skipNewlines();
      const t = peek();
      if (!t) break;
      if (t.kind === 'comment') { next(); continue; }
      if (t.indent < minIndent) break;
      if (t.indent === minIndent && t.kind === 'key') {
        const keyTok = next();
        parseInlineKeyValue(obj, keyTok, minIndent);
        continue;
      }
      break;
    }
  }

  function parseBlocksAtIndent(indent: number): YamlNode {
    skipNewlines();
    const first = peek();
    if (first && first.kind === 'list-dash' && first.indent === indent) {
      return parseList(indent);
    }
    const obj: { [k: string]: YamlNode } = {};
    parseMappingContinuation(obj, indent);
    return obj;
  }

  const result = parseBlocksAtIndent(0);
  for (let i = pos; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind === 'newline' || t.kind === 'comment') continue;
    throw new YamlError(`Unexpected content after end of document`, t.line, t.col);
  }
  return result;
}

function isMapping(n: YamlNode): n is { [k: string]: YamlNode } {
  return typeof n === 'object' && n !== null && !Array.isArray(n);
}

function isList(n: YamlNode): n is YamlNode[] {
  return Array.isArray(n);
}

function unwrapListItem(node: YamlNode): { value: string; comment: string } {
  if (typeof node === 'string') return { value: node, comment: '' };
  if (isMapping(node) && typeof node['_value'] === 'string') {
    return { value: node['_value'] as string, comment: typeof node['_comment'] === 'string' ? (node['_comment'] as string) : '' };
  }
  throw new PresetError(`Expected list item to be a string, got ${typeof node === 'object' && node !== null ? 'object' : typeof node}`);
}

function escapeYamlString(s: string): string {
  if (/[:#\n"]/.test(s) || s === '' || s === 'true' || s === 'false' || s === 'null') {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return s;
}

function serializeNode(node: YamlNode, indent: number): string {
  if (node === null) return '~';
  if (typeof node === 'string') return escapeYamlString(node);
  if (typeof node === 'number' || typeof node === 'boolean') return String(node);
  if (isList(node)) {
    if (node.length === 0) return '[]';
    const pad = ' '.repeat(indent);
    return '\n' + node.map((item) => {
      if (isMapping(item) && typeof item['_value'] === 'string') {
        const v = escapeYamlString(item['_value'] as string);
        const c = typeof item['_comment'] === 'string' ? (item['_comment'] as string) : '';
        return c ? `${pad}- ${v}  # ${c}` : `${pad}- ${v}`;
      }
      if (isMapping(item) && Object.keys(item).length > 0) {
        const keys = Object.keys(item);
        const first = keys[0]!;
        const rest = keys.slice(1);
        const childPad = ' '.repeat(indent + 2);
        const firstValue = serializeNode(item[first]!, indent + 2);
        if (firstValue.startsWith('\n')) {
          return `${pad}- ${first}: ${firstValue}\n` + rest.map((k) => {
            const v = serializeNode(item[k]!, indent + 4);
            return v.startsWith('\n') ? `${childPad}${k}:${v}` : `${childPad}${k}: ${v}`;
          }).join('\n');
        }
        const tail = rest.map((k) => {
          const v = serializeNode(item[k]!, indent + 4);
          return v.startsWith('\n') ? `${childPad}${k}:${v}` : `${childPad}${k}: ${v}`;
        }).join('\n');
        return tail ? `${pad}- ${first}: ${firstValue}\n${tail}` : `${pad}- ${first}: ${firstValue}`;
      }
      const v = serializeNode(item, indent + 2);
      return v.startsWith('\n') ? `${pad}-${v}` : `${pad}- ${v}`;
    }).join('\n');
  }
  if (isMapping(node)) {
    const keys = Object.keys(node);
    if (keys.length === 0) return '{}';
    const pad = ' '.repeat(indent);
    return keys.map((k) => {
      const v = node[k]!;
      const serialized = serializeNode(v, indent + 2);
      if (serialized.startsWith('\n')) {
        return `${pad}${k}:${serialized}`;
      }
      return `${pad}${k}: ${serialized}`;
    }).join('\n');
  }
  return String(node);
}

const OPERATORS: ConditionOperator[] = ['>=', '>', '<=', '<', '=', '!='];

function operatorFromToken(tok: string): ConditionOperator {
  if (!OPERATORS.includes(tok as ConditionOperator)) {
    throw new PresetError(`Unknown operator "${tok}"`);
  }
  return tok as ConditionOperator;
}

function faceValueFromToken(tok: string): number | FaceValueSpecial {
  if (tok === 'max' || tok === 'max_value') return 'max_value';
  if (tok === 'min' || tok === 'min_value') return 'min_value';
  if (/^-?\d+$/.test(tok)) return parseInt(tok, 10);
  throw new PresetError(`Invalid face value "${tok}"`);
}

function parseClause(parts: string[]): ConditionClause {
  if (parts.length < 3) {
    throw new PresetError(`Clause too short: "${parts.join(' ')}"`);
  }
  const field = parts[0]!;
  const op = parts[1]!;
  const value = parts[2]!;
  if (field === 'face') {
    return { field: 'face', operator: operatorFromToken(op), value: faceValueFromToken(value) };
  }
  if (field === 'tag') {
    if (op !== '=' && op !== '!=') {
      throw new PresetError(`Tag field supports only = and !=, got "${op}"`);
    }
    return { field: 'tag', operator: op, value };
  }
  throw new PresetError(`Unknown clause field "${field}"`);
}

function parseConditionChain(text: string): { chain: ConditionChain; connector: 'and' | 'or' } {
  const tokens = text.split(/\s+/);
  if (tokens.length === 0) {
    throw new PresetError('Empty condition chain');
  }
  const topConnector = tokens.includes('or') ? 'or' : 'and';
  const cleaned = tokens.filter((t) => t !== 'where' && t !== 'when');
  const clauseTokens: string[][] = [];
  let current: string[] = [];
  for (const tok of cleaned) {
    if (tok === 'and' || tok === 'or') {
      if (current.length > 0) clauseTokens.push(current);
      current = [];
    } else {
      current.push(tok);
    }
  }
  if (current.length > 0) clauseTokens.push(current);
  const clauses = clauseTokens.map(parseClause);
  return { chain: { clauses, connector: topConnector }, connector: topConnector };
}

function parsePool(poolNode: YamlNode): DicePool {
  const items: { value: string; comment: string }[] = [];
  if (typeof poolNode === 'string') {
    const terms = poolNode.split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean);
    for (const t of terms) {
      items.push({ value: t, comment: '' });
    }
  } else if (isList(poolNode)) {
    for (const item of poolNode) {
      if (typeof item === 'string') {
        items.push({ value: item, comment: '' });
      } else if (isMapping(item) && typeof item['_value'] === 'string') {
        items.push({ value: item['_value'] as string, comment: typeof item['_comment'] === 'string' ? (item['_comment'] as string) : '' });
      } else {
        throw new PresetError('Each pool entry must be a die term string');
      }
    }
  } else {
    throw new PresetError('"pool:" must be a die term string or a list of die terms');
  }

  const result: DiceTerm[] = [];
  for (const { value, comment } of items) {
    const m = /^(\d+)d(\d+)(?:<([A-Za-z][A-Za-z0-9_]*)>)?$/.exec(value);
    if (!m) {
      throw new PresetError(`Invalid die notation "${value}"`);
    }
    result.push({
      id: crypto.randomUUID(),
      count: parseInt(m[1]!, 10),
      sides: parseInt(m[2]!, 10),
      tag: m[3] ?? '',
      comment,
    });
  }
  if (result.length === 0) {
    throw new PresetError('Pool must have at least one term');
  }
  return { terms: result };
}

function serializePool(pool: DicePool): YamlNode {
  return pool.terms.map((t) => {
    const v = `${t.count}d${t.sides}${t.tag ? `<${t.tag}>` : ''}`;
    return t.comment ? { _value: v, _comment: t.comment } : v;
  });
}

function parseRerollEntry(text: string, comment: string): RerollCondition {
  const m = /^(reroll|explode)\s+when\s+(.+?)(?:\s+up to\s+(\d+)\s+times?)?$/i.exec(text);
  if (!m) {
    throw new PresetError(`Invalid reroll entry: "${text}"`);
  }
  const action = m[1]!.toLowerCase() as 'reroll' | 'explode';
  const clauseText = m[2]!;
  const repeat = m[3] ? parseInt(m[3], 10) : 1;
  const { chain } = parseConditionChain(clauseText);
  return {
    id: crypto.randomUUID(),
    action,
    conditions: chain,
    repeat,
    comment,
  };
}

function serializeClauseValue(c: ConditionClause): string {
  if (c.field === 'face') {
    if (typeof c.value === 'number') return String(c.value);
    if (c.value === 'max_value') return 'max';
    if (c.value === 'min_value') return 'min';
    return String(c.value);
  }
  return String(c.value);
}

function serializeRerollEntry(rc: RerollCondition): YamlNode {
  const clauses = rc.conditions.clauses.map((c) => `${c.field} ${c.operator} ${serializeClauseValue(c)}`).join(rc.conditions.connector === 'or' ? ' or ' : ' and ');
  const tail = rc.repeat > 1 ? ` up to ${rc.repeat} times` : '';
  const v = `${rc.action} when ${clauses}${tail}`;
  return rc.comment ? { _value: v, _comment: rc.comment } : v;
}

function parsePipelineEntry(text: string, comment: string): { name: string; op: ScalarFunction | VectorFunction; source: string; comment: string } {
  const m = new RegExp('^([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*(.+)$').exec(text);
  if (!m) {
    throw new PresetError(`Invalid pipeline entry: "${text}"`);
  }
  const name = m[1]!;
  const expr = m[2]!.trim();

  const filterM = /^(filter|remove)\s+([A-Za-z_][A-Za-z0-9_]*)\s+where\s+(.+)$/i.exec(expr);
  if (filterM) {
    const fn = filterM[1]!.toLowerCase() as 'filter' | 'remove';
    const source = filterM[2]!;
    const { chain } = parseConditionChain(filterM[3]!);
    return { name, source, op: { fn, conditions: chain } as VectorFunction, comment };
  }

  const binaryM = /^([A-Za-z_][A-Za-z0-9_]*)\s*([+\-*/])\s*([A-Za-z_][A-Za-z0-9_]*|-?\d+(?:\.\d+)?)$/.exec(expr);
  if (binaryM) {
    const left = binaryM[1]!;
    const opChar = binaryM[2]!;
    const right = binaryM[3]!;
    const opMap: Record<string, ScalarBinaryOp> = { '+': 'add', '-': 'subtract', '*': 'multiply', '/': 'divide' };
    if (/^-?\d/.test(right)) {
      return {
        name,
        source: left,
        op: { fn: opMap[opChar]!, operand: 'literal', value: parseFloat(right) },
        comment,
      };
    }
    return {
      name,
      source: left,
      op: { fn: opMap[opChar]!, operand: 'named', source2: right },
      comment,
    };
  }

  const twoArgM = /^(max|min)\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)$/i.exec(expr);
  if (twoArgM) {
    const fn = twoArgM[1]!.toLowerCase() as 'max' | 'min';
    return {
      name,
      source: twoArgM[2]!,
      op: { fn, operand: 'named', source2: twoArgM[3]! },
      comment,
    };
  }

  const unaryM = /^(sum|min|max|count|ceil|floor)\s+([A-Za-z_][A-Za-z0-9_]*)$/i.exec(expr);
  if (unaryM) {
    const fn = unaryM[1]!.toLowerCase();
    const source = unaryM[2]!;
    if (fn === 'ceil' || fn === 'floor') {
      return { name, source, op: { fn } as { fn: 'ceil' | 'floor' }, comment };
    }
    return { name, source, op: fn as ScalarFunction, comment };
  }

  throw new PresetError(`Could not parse pipeline expression: "${expr}"`);
}

function serializePipelineEntry(nv: NamedValue): YamlNode {
  const op = nv.op;
  let v: string;
  if (typeof op === 'string') {
    v = `${nv.name} = ${op} ${nv.source}`;
  } else if (op.fn === 'filter' || op.fn === 'remove') {
    const clauses = op.conditions.clauses.map((c) => `${c.field} ${c.operator} ${serializeClauseValue(c)}`).join(op.conditions.connector === 'or' ? ' or ' : ' and ');
    v = `${nv.name} = ${op.fn} ${nv.source} where ${clauses}`;
  } else if (op.fn === 'ceil' || op.fn === 'floor') {
    v = `${nv.name} = ${op.fn} ${nv.source}`;
  } else if (op.fn === 'add' || op.fn === 'subtract' || op.fn === 'multiply' || op.fn === 'divide') {
    const sym: Record<ScalarBinaryOp, string> = { add: '+', subtract: '-', multiply: '*', divide: '/' };
    if (op.operand === 'named' && op.source2) {
      v = `${nv.name} = ${nv.source} ${sym[op.fn]} ${op.source2}`;
    } else if (op.operand === 'literal' && typeof op.value === 'number') {
      v = `${nv.name} = ${nv.source} ${sym[op.fn]} ${op.value}`;
    } else {
      v = `${nv.name} = ${JSON.stringify(op)}`;
    }
  } else if ((op.fn === 'max' || op.fn === 'min') && op.operand === 'named' && op.source2) {
    v = `${nv.name} = ${op.fn}(${nv.source}, ${op.source2})`;
  } else {
    v = `${nv.name} = ${JSON.stringify(op)}`;
  }
  return nv.comment ? { _value: v, _comment: nv.comment } : v;
}

function parseOutcomeEntry(text: string, comment: string): Outcome {
  const isDefault = /\(default\)\s*$/i.test(text);
  const stripped = text.replace(/\(default\)\s*$/i, '').trim();
  const m = /^(.+?)\s+when\s+(.+)$/i.exec(stripped);
  if (!m) {
    if (/^#\s*default\s*$/i.test(stripped)) {
      return {
        id: crypto.randomUUID(),
        name: 'default',
        conditions: [],
        connector: 'and',
        comment,
        isDefault: true,
      };
    }
    if (isDefault) {
      return {
        id: crypto.randomUUID(),
        name: stripped || 'default',
        conditions: [],
        connector: 'and',
        comment,
        isDefault: true,
      };
    }
    throw new PresetError(`Invalid outcome entry: "${text}"`);
  }
  const name = m[1]!.trim();
  const clauseText = m[2]!.trim();

  const conditions = parseOutcomeConditions(clauseText);
  return {
    id: crypto.randomUUID(),
    name,
    conditions,
    connector: 'and',
    comment,
    isDefault,
  };
}

function parseOutcomeConditions(text: string): OutcomeCondition[] {
  const conditions: OutcomeCondition[] = [];
  const tokens = text.split(/\s+/);
  let i = 0;
  let buffer: string[] = [];
  const flushBuffer = (): void => {
    if (buffer.length === 0) return;
    conditions.push(parseSingleOutcomeCondition(buffer));
    buffer = [];
  };
  while (i < tokens.length) {
    if (tokens[i] === 'and' || tokens[i] === 'or') {
      flushBuffer();
      i++;
      continue;
    }
    buffer.push(tokens[i]!);
    i++;
  }
  flushBuffer();
  return conditions;
}

function parseSingleOutcomeCondition(tokens: string[]): OutcomeCondition {
  if (tokens.length < 3) {
    throw new PresetError(`Outcome condition too short: "${tokens.join(' ')}"`);
  }
  if (tokens[0] === 'any' || tokens[0] === 'all' || tokens[0] === 'none') {
    if (tokens.length < 4) {
      throw new PresetError(`Dice condition requires 4 tokens: "${tokens.join(' ')}"`);
    }
    return {
      source: tokens[1]!,
      op: tokens[0] as DiceConditionType,
      subCondition: operatorFromToken(tokens[2]!),
      value: parseInt(tokens[3]!, 10),
    };
  }
  const source = tokens[0]!;
  const op = operatorFromToken(tokens[1]!);
  const valueText = tokens[2]!;
  if (valueText === 'max' || valueText === 'min') {
    return { source, op, value: valueText === 'max' ? 9999 : -9999 };
  }
  const value = parseInt(valueText, 10);
  if (Number.isNaN(value)) {
    throw new PresetError(`Invalid outcome value: "${valueText}"`);
  }
  return { source, op, value };
}

function serializeOutcomeEntry(o: Outcome): YamlNode {
  const conds = o.conditions.map((c) => {
    if (c.op === 'any' || c.op === 'all' || c.op === 'none') {
      return `${c.op} ${c.source} ${c.subCondition} ${c.value}`;
    }
    return `${c.source} ${c.op} ${c.value}`;
  }).join(' and ');
  const suffix = o.isDefault ? ' (default)' : '';
  let v: string;
  if (conds === '' && o.isDefault) {
    v = `${o.name} when (always) (default)`;
  } else {
    v = `${o.name} when ${conds}${suffix}`;
  }
  return o.comment ? { _value: v, _comment: o.comment } : v;
}

function parseParameterEntry(text: string): Parameter {
  let stripped = text.trim();
  if ((stripped.startsWith('"') && stripped.endsWith('"')) || (stripped.startsWith("'") && stripped.endsWith("'"))) {
    stripped = stripped.slice(1, -1);
  }
  const m = new RegExp('^([A-Za-z_][A-Za-z0-9_.\\- ]*?)\\s*=\\s*\\[([^\\]]*)\\]\\s+over\\s+([A-Za-z_][A-Za-z0-9_.]*)(?:\\s+on\\s+([A-Za-z0-9_.\\-]+))?$', 'i').exec(stripped);
  if (!m) {
    throw new PresetError(`Invalid parameter entry: "${text}"`);
  }
  const label = m[1]!.trim();
  const valuesText = m[2]!.trim();
  const targetStr = m[3]!;
  const onName = m[4] ?? null;

  const values = valuesText === '' ? [] : valuesText.split(',').map((s) => parseInt(s.trim(), 10));
  if (values.some((v) => Number.isNaN(v))) {
    throw new PresetError(`Invalid parameter values: "${valuesText}"`);
  }

  const validTargets: ParameterTarget[] = ['pool.count', 'pool.sides', 'outcome.value', 'pipeline.literal'];
  if (!validTargets.includes(targetStr as ParameterTarget)) {
    throw new PresetError(`Invalid parameter target: "${targetStr}"`);
  }
  const target = targetStr as ParameterTarget;

  return {
    id: crypto.randomUUID(),
    label,
    values,
    target,
    targetTermId: undefined,
    targetOutcomeId: undefined,
    targetPipelineId: undefined,
    onName,
  } as Parameter & { onName?: string | null };
}

function serializeParameterEntry(p: Parameter & { _resolvedName?: string }): string {
  const on = (p as unknown as { _resolvedName?: string })._resolvedName;
  const onStr = on ? ` on ${on}` : '';
  return `${p.label} = [${p.values.join(', ')}] over ${p.target}${onStr}`;
}

function astToPreset(ast: YamlNode, _existingNames?: Set<string>): PresetConfig {
  if (!isMapping(ast)) {
    throw new PresetError('Top-level must be a mapping');
  }
  if (ast['presets'] !== undefined) {
    if (!isList(ast['presets']) || ast['presets'].length === 0) {
      throw new PresetError('"presets:" must be a non-empty list');
    }
    return astToPreset(ast['presets'][0]!);
  }

  const name = typeof ast['name'] === 'string' ? ast['name'] : 'Untitled';
  if (ast['pool'] === undefined) {
    throw new PresetError('"pool:" is required');
  }
  const pool = parsePool(ast['pool']);

  const reroll: RerollCondition[] = [];
  if (ast['reroll'] !== undefined && ast['reroll'] !== null) {
    if (!isList(ast['reroll'])) {
      throw new PresetError('"reroll:" must be a list');
    }
    for (const item of ast['reroll']) {
      const { value, comment } = unwrapListItem(item);
      reroll.push(parseRerollEntry(value, comment));
    }
  }

  const pipeline: NamedValue[] = [];
  const pipelineNames = new Set<string>();
  if (ast['pipeline'] !== undefined && ast['pipeline'] !== null) {
    if (!isList(ast['pipeline'])) {
      throw new PresetError('"pipeline:" must be a list');
    }
    for (const item of ast['pipeline']) {
      const { value, comment } = unwrapListItem(item);
      const entry = parsePipelineEntry(value, comment);
      if (pipelineNames.has(entry.name)) {
        throw new PresetError(`Duplicate pipeline name "${entry.name}"`);
      }
      pipelineNames.add(entry.name);
      pipeline.push({
        id: crypto.randomUUID(),
        name: entry.name,
        source: entry.source,
        op: entry.op as VectorFunction | ScalarFunction,
        comment: entry.comment,
      } as NamedValue);
    }
  }

  const outcomes: Outcome[] = [];
  if (ast['outcomes'] !== undefined && ast['outcomes'] !== null) {
    if (!isList(ast['outcomes'])) {
      throw new PresetError('"outcomes:" must be a list');
    }
    for (const item of ast['outcomes']) {
      const { value, comment } = unwrapListItem(item);
      outcomes.push(parseOutcomeEntry(value, comment));
    }
  }

  let parameters: Parameter[] | undefined;
  if (ast['parameters'] !== undefined && ast['parameters'] !== null) {
    if (!isList(ast['parameters'])) {
      throw new PresetError('"parameters:" must be a list');
    }
    parameters = [];
    for (const item of ast['parameters']) {
      const { value } = unwrapListItem(item);
      parameters.push(parseParameterEntry(value));
    }
  }

  const defaultCount = outcomes.filter((o) => o.isDefault).length;
  if (defaultCount > 1) {
    const names = outcomes.filter((o) => o.isDefault).map((o) => `"${o.name}"`).join(', ');
    throw new PresetError(`Multiple outcomes marked as default: ${names}. Only one outcome can be default.`);
  }

  return {
    id: crypto.randomUUID(),
    name,
    pool,
    rerollConditions: reroll,
    pipeline,
    outcomes,
    parameters,
  };
}

function resolveReferences(config: PresetConfig): PresetConfig {
  const pipelineByName = new Map<string, NamedValue>();
  for (const nv of config.pipeline) {
    pipelineByName.set(nv.name, nv);
  }

  for (const nv of config.pipeline) {
    if (nv.source !== 'rolled' && !pipelineByName.has(nv.source)) {
      throw new PresetError(`Pipeline "${nv.name}" references unknown source "${nv.source}"`);
    }
    if (typeof nv.op === 'object' && nv.op !== null && 'fn' in nv.op) {
      const op = nv.op as { fn: string; operand?: string; source2?: string };
      if (op.operand === 'named' && op.source2) {
        if (!pipelineByName.has(op.source2)) {
          throw new PresetError(`Pipeline "${nv.name}" references unknown source "${op.source2}"`);
        }
      }
    }
  }

  for (const o of config.outcomes) {
    for (const c of o.conditions) {
      if (c.source !== 'rolled' && !pipelineByName.has(c.source)) {
        throw new PresetError(`Outcome "${o.name}" references unknown source "${c.source}"`);
      }
    }
  }

  for (const p of config.parameters ?? []) {
    const onName = (p as unknown as { onName?: string | null }).onName;
    if (p.target === 'pool.count' || p.target === 'pool.sides') {
      if (onName) {
        const term = config.pool.terms.find((t) => t.id === onName || t.tag === onName);
        if (!term) {
          throw new PresetError(`Parameter "${p.label}" references unknown term "${onName}"`);
        }
        p.targetTermId = term.id;
      } else {
        const candidates = config.pool.terms;
        if (candidates.length === 0) {
          throw new PresetError(`Parameter "${p.label}" targets a term but pool is empty`);
        }
        if (candidates.length > 1) {
          throw new PresetError(`Parameter "${p.label}" requires "on <name>" (multiple terms in pool)`);
        }
        p.targetTermId = candidates[0]!.id;
      }
    } else if (p.target === 'outcome.value') {
      if (onName) {
        const outcome = config.outcomes.find((o) => o.id === onName || o.name === onName);
        if (!outcome) {
          throw new PresetError(`Parameter "${p.label}" references unknown outcome "${onName}"`);
        }
        p.targetOutcomeId = outcome.id;
      } else {
        if (config.outcomes.length === 0) {
          throw new PresetError(`Parameter "${p.label}" targets an outcome but none are defined`);
        }
        if (config.outcomes.length > 1) {
          throw new PresetError(`Parameter "${p.label}" requires "on <name>" (multiple outcomes)`);
        }
        p.targetOutcomeId = config.outcomes[0]!.id;
      }
    } else if (p.target === 'pipeline.literal') {
      if (onName) {
        const nv = pipelineByName.get(onName);
        if (!nv) {
          throw new PresetError(`Parameter "${p.label}" references unknown pipeline step "${onName}"`);
        }
        p.targetPipelineId = nv.id;
      } else {
        const lit = config.pipeline.find((nv) => {
          const op = nv.op;
          return typeof op === 'object' && op !== null && 'fn' in op && (op as { operand?: string }).operand === 'literal';
        });
        if (!lit) {
          throw new PresetError(`Parameter "${p.label}" requires a pipeline step with a literal operand`);
        }
        p.targetPipelineId = lit.id;
      }
    }
    delete (p as unknown as { onName?: string | null }).onName;
  }

  return config;
}

export function parsePresetFile(text: string): PresetConfig[] {
  const tokens = tokenize(text);
  const ast = parseBlocks(tokens);
  if (isMapping(ast) && ast['presets'] !== undefined) {
    if (!isList(ast['presets'])) {
      throw new YamlError('"presets" must be a list', 1, 1);
    }
    return ast['presets'].map((p) => resolveReferences(astToPreset(p)));
  }
  return [resolveReferences(astToPreset(ast))];
}

export function parsePreset(text: string): PresetConfig {
  const list = parsePresetFile(text);
  if (list.length === 0) {
    throw new PresetError('No presets found in file');
  }
  return list[0]!;
}

export function presetToAst(config: PresetConfig): YamlNode {
  return {
    name: config.name,
    pool: serializePool(config.pool),
    ...(config.rerollConditions.length > 0
      ? { reroll: config.rerollConditions.map(serializeRerollEntry) }
      : {}),
    ...(config.pipeline.length > 0
      ? { pipeline: config.pipeline.map(serializePipelineEntry) }
      : {}),
    outcomes: config.outcomes.map(serializeOutcomeEntry),
    ...(config.parameters && config.parameters.length > 0
      ? { parameters: config.parameters.map((p) => {
          const tagged = p as Parameter & { _resolvedName?: string };
          if (p.targetTermId) {
            const term = config.pool.terms.find((t) => t.id === p.targetTermId);
            if (term) {
              const sameTargetCount = config.parameters!.filter(
                (pp) => pp.target === p.target && pp.targetTermId === p.targetTermId
              ).length;
              const needsOn = config.pool.terms.length > 1 || sameTargetCount > 1;
              if (needsOn) {
                if (term.tag) {
                  tagged._resolvedName = term.tag;
                } else {
                  const idx = config.pool.terms.indexOf(term);
                  tagged._resolvedName = String(idx + 1);
                }
              }
            }
          } else if (p.targetOutcomeId) {
            const o = config.outcomes.find((x) => x.id === p.targetOutcomeId);
            if (o) {
              const sameTargetCount = config.parameters!.filter(
                (pp) => pp.target === p.target && pp.targetOutcomeId === p.targetOutcomeId
              ).length;
              const needsOn = config.outcomes.length > 1 || sameTargetCount > 1;
              if (needsOn) {
                tagged._resolvedName = o.name;
              }
            }
          } else if (p.targetPipelineId) {
            const nv = config.pipeline.find((x) => x.id === p.targetPipelineId);
            if (nv) {
              const sameTargetCount = config.parameters!.filter(
                (pp) => pp.target === p.target && pp.targetPipelineId === p.targetPipelineId
              ).length;
              const litCount = config.pipeline.filter((pp) => {
                const op = pp.op;
                return typeof op === 'object' && op !== null && 'fn' in op && (op as { operand?: string }).operand === 'literal';
              }).length;
              const needsOn = litCount > 1 || sameTargetCount > 1;
              if (needsOn) {
                tagged._resolvedName = nv.name;
              }
            }
          }
          return serializeParameterEntry(tagged);
        }) }
      : {}),
  };
}

export function serializePreset(config: PresetConfig): string {
  const ast = presetToAst(config);
  return serializeNode(ast, 0) + '\n';
}

export function exportConfigAsYaml(name: string, config: PresetConfig): string {
  const named: PresetConfig = { ...config, name: name || config.name || 'Untitled' };
  return serializePreset(named);
}

export function filenameForName(name: string): string {
  return `${slugify(name)}.yaml`;
}
