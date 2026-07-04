import type {
  PresetConfig,
  DicePool,
  DiceTerm,
  RerollCondition,
  ConditionChain,
  ConditionClause,
  ConditionOperator,
  NamedValue,
  Outcome,
  OutcomeCondition,
  ScalarFunction,
  ScalarBinaryOp,
  VectorFunction,
  SweepParameters,
  DiceConditionType,
  Expr,
  ScalarBinaryTerm,
  SwitchBranch,
  SwitchCondition,
} from '@/types';
import { parseExpr, exprToString, literalExpr } from '@/utils/expression';

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
        const delimIdx = colonIdx >= 0 ? colonIdx : eqIdx;
        const spaceIdx = afterDash.search(/\s/);
        if (delimIdx > 0 && (spaceIdx < 0 || delimIdx < spaceIdx)) {
          const delim = afterDash[delimIdx];
          const key = afterDash.slice(0, delimIdx).trim();
          if (/^[A-Za-z_][A-Za-z0-9_.\- =]*$/.test(key) && delim === ':') {
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
        if (!/^[A-Za-z_][A-Za-z0-9_.\- =]*$/.test(key)) {
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
        const delimIdx = colonIdx >= 0 ? colonIdx : eqIdx;
        const spaceIdx = afterDash.search(/\s/);
        if (delimIdx > 0 && (spaceIdx < 0 || delimIdx < spaceIdx)) {
          const delim = afterDash[delimIdx];
          const key = afterDash.slice(0, delimIdx).trim();
          if (/^[A-Za-z_][A-Za-z0-9_.\- =]*$/.test(key) && delim === ':') {
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
        if (!/^[A-Za-z_][A-Za-z0-9_.\- =]*$/.test(key)) {
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
    return '\n' + keys.map((k) => {
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

const OPERATORS: ConditionOperator[] = ['>=', '>', '<=', '<', '=', '!=', 'is_min', 'is_max', 'is_even', 'is_odd'];

function operatorFromToken(tok: string): ConditionOperator {
  if (!OPERATORS.includes(tok as ConditionOperator)) {
    throw new PresetError(`Unknown operator "${tok}"`);
  }
  return tok as ConditionOperator;
}



function parseClause(parts: string[]): ConditionClause {
  if (parts.length < 2) {
    throw new PresetError(`Clause too short: "${parts.join(' ')}"`);
  }
  const field = parts[0]!;
  const op = parts[1]!;
  if (field === 'face') {
    if (op === 'is_min' || op === 'is_max' || op === 'is_even' || op === 'is_odd') {
      return { field: 'face', operator: op as ConditionOperator };
    }
    if (parts.length < 3) {
      throw new PresetError(`Face condition requires a value: "${parts.join(' ')}"`);
    }
    const valueText = parts.slice(2).join(' ');
    const isOldMax = op === '=' && (valueText === 'max' || valueText === 'max_value');
    const isOldMin = op === '=' && (valueText === 'min' || valueText === 'min_value');
    if (isOldMax) return { field: 'face', operator: 'is_max' };
    if (isOldMin) return { field: 'face', operator: 'is_min' };
    return { field: 'face', operator: operatorFromToken(op), value: parseExprFromText(valueText, 'clause value') };
  }
  if (field === 'tag') {
    if (op !== '=' && op !== '!=') {
      throw new PresetError(`Tag field supports only = and !=, got "${op}"`);
    }
    const value = parts.slice(2).join(' ') || '';
    return { field: 'tag', operator: op, value };
  }
  throw new PresetError(`Unknown clause field "${field}"`);
}

function parseConditionChain(text: string): ConditionChain {
  const tokens = text.split(/\s+/);
  if (tokens.length === 0) {
    throw new PresetError('Empty condition chain');
  }
  const cleaned = tokens.filter((t) => t !== 'where' && t !== 'when');
  const clauseTokens: string[][] = [];
  const connectorTokens: string[] = [];
  let current: string[] = [];
  for (const tok of cleaned) {
    if (tok === 'and' || tok === 'or') {
      if (current.length > 0) {
        clauseTokens.push(current);
        connectorTokens.push(tok);
      }
      current = [];
    } else {
      current.push(tok);
    }
  }
  if (current.length > 0) clauseTokens.push(current);
  const clauses = clauseTokens.map(parseClause);
  const connectors: ('and' | 'or')[] = connectorTokens.slice(0, clauses.length - 1) as ('and' | 'or')[];
  return { clauses, connectors };
}

function parseExprFromText(text: string, label: string): Expr {
  const trimmed = text.trim();
  if (trimmed === '') {
    throw new PresetError(`${label}: empty expression`);
  }
  const processed = trimmed.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, '$1');
  const result = parseExpr(processed);
  if ('error' in result) {
    throw new PresetError(`${label}: ${result.error}`);
  }
  return result.expr;
}

function parseSwitchBranch(text: string): SwitchBranch {
  const ifIdx = text.indexOf(' if ');
  if (ifIdx < 0) {
    throw new PresetError(`Invalid switch branch: "${text}" (expected "value if condition")`);
  }

  const valueText = text.slice(0, ifIdx).trim();
  const conditionText = text.slice(ifIdx + 4).trim();

  let value: ScalarBinaryTerm;
  if (/^-?\d/.test(valueText)) {
    value = { operand: 'val', value: parseExprFromText(valueText, 'Switch branch value') };
  } else {
    value = { operand: 'ref', source2: valueText };
  }

  const parts = conditionText.split(/\s+/);
  if (parts.length < 2) {
    throw new PresetError(`Invalid switch condition: "${conditionText}"`);
  }

  const source = parts[0]!;
  const op = parts[1]!;

  if (op === 'is_even' || op === 'is_odd') {
    return { value, condition: { source, op } as SwitchCondition };
  }

  if (parts.length < 3) {
    throw new PresetError(`Condition "${conditionText}" requires a value for operator "${op}"`);
  }

  const valueExpr = parts.slice(2).join(' ');
  return {
    value,
    condition: {
      source,
      op: operatorFromToken(op) as '>' | '>=' | '<' | '<=' | '=' | '!=' | 'is_even' | 'is_odd',
      value: parseExprFromText(valueExpr, 'Switch condition value'),
    },
  };
}

function serializeSwitchBranch(branch: SwitchBranch): string {
  let valueStr: string;
  if (branch.value.operand === 'val') {
    valueStr = exprToString(branch.value.value, 'yaml');
  } else {
    valueStr = branch.value.source2;
  }

  const cond = branch.condition;
  let condStr: string;
  if (cond.op === 'is_even' || cond.op === 'is_odd') {
    condStr = `${cond.source} ${cond.op}`;
  } else if (cond.value) {
    condStr = `${cond.source} ${cond.op} ${exprToString(cond.value, 'yaml')}`;
  } else {
    condStr = `${cond.source} ${cond.op}`;
  }

  return `${valueStr} if ${condStr}`;
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
    const m = /^(\S+?)d([^\s<]+)(?:<([A-Za-z][A-Za-z0-9_]*)>)?$/.exec(value);
    if (!m) {
      throw new PresetError(`Invalid die notation "${value}"`);
    }
    const countText = m[1]!;
    const sidesText = m[2]!;
    result.push({
      id: crypto.randomUUID(),
      count: parseExprFromText(countText, `Pool count "${value}"`),
      sides: parseExprFromText(sidesText, `Pool sides "${value}"`),
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
    const v = `${exprToString(t.count, 'yaml')}d${exprToString(t.sides, 'yaml')}${t.tag ? `<${t.tag}>` : ''}`;
    return t.comment ? { _value: v, _comment: t.comment } : v;
  });
}

function parseRerollEntry(text: string, comment: string): RerollCondition {
  const m = /^(reroll|explode)\s+when\s+(.+?)(?:\s+up to\s+(\d+)\s+times?)?(?:\s+tag as\s+(\S+))?$/i.exec(text);
  if (!m) {
    throw new PresetError(`Invalid reroll entry: "${text}"`);
  }
  const action = m[1]!.toLowerCase() as 'reroll' | 'explode';
  const clauseText = m[2]!;
  const repeat = m[3] ? parseInt(m[3], 10) : 1;
  const tagAs = m[4] ?? '';
  const chain = parseConditionChain(clauseText);
  return {
    id: crypto.randomUUID(),
    action,
    conditions: chain,
    repeat,
    comment,
    tagAs,
  };
}

function serializeClauseValue(c: ConditionClause): string {
  if (c.field === 'face') {
    if (c.value === undefined) return '';
    return exprToString(c.value, 'yaml');
  }
  return String(c.value);
}

function serializeRerollEntry(rc: RerollCondition): YamlNode {
  const clauses = rc.conditions.clauses.map((c) => {
    const sv = serializeClauseValue(c);
    return sv ? `${c.field} ${c.operator} ${sv}` : `${c.field} ${c.operator}`;
  });
  let clauseStr = clauses[0] || '';
  for (let i = 0; i < rc.conditions.connectors.length; i++) {
    clauseStr += ` ${rc.conditions.connectors[i]} ${clauses[i + 1] || ''}`;
  }
  const tail = rc.repeat > 1 ? ` up to ${rc.repeat} times` : '';
  const tagAs = rc.tagAs ? ` tag as ${rc.tagAs}` : '';
  const v = `${rc.action} when ${clauseStr}${tail}${tagAs}`;
  return rc.comment ? { _value: v, _comment: rc.comment } : v;
}

function parsePipelineEntry(text: string, comment: string, branches?: string[]): { name: string; op: ScalarFunction | VectorFunction; source: string; comment: string } {
  const m = new RegExp('^([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*(.+)$').exec(text);
  if (!m) {
    throw new PresetError(`Invalid pipeline entry: "${text}"`);
  }
  const name = m[1]!;
  const expr = m[2]!.trim();

  if (branches && branches.length > 0) {
    const switchM = /^([A-Za-z_][A-Za-z0-9_]*)\s+switch$/i.exec(expr);
    if (switchM) {
      const source = switchM[1]!;
      const parsedBranches = branches.map(parseSwitchBranch);
      return { name, source, op: { fn: 'switch', branches: parsedBranches }, comment };
    }
    throw new PresetError(`Switch branches provided but expression is not switch: "${expr}"`);
  }

  const inlineSwitchM = /^switch\s+([A-Za-z_][A-Za-z0-9_]*)\s*->\s*(.+)$/i.exec(expr);
  if (inlineSwitchM) {
    const source = inlineSwitchM[1]!;
    const branchStrs = inlineSwitchM[2]!.split(/\s*\|\s*/).map((b) => b.trim()).filter(Boolean);
    if (branchStrs.length === 0) {
      throw new PresetError(`Switch requires at least one branch, got: "${expr}"`);
    }
    const parsedBranches = branchStrs.map(parseSwitchBranch);
    return { name, source, op: { fn: 'switch', branches: parsedBranches }, comment };
  }

  const filterM = /^(filter|remove)\s+([A-Za-z_][A-Za-z0-9_]*)\s+where\s+(.+)$/i.exec(expr);
  if (filterM) {
    const fn = filterM[1]!.toLowerCase() as 'filter' | 'remove';
    const source = filterM[2]!;
    const chain = parseConditionChain(filterM[3]!);
    return { name, source, op: { fn, conditions: chain } as VectorFunction, comment };
  }

  const binaryM = /^([A-Za-z_][A-Za-z0-9_]*)\s*([+\-*/])\s*([A-Za-z_][A-Za-z0-9_]*|-?\d+(?:\.\d+)?|\S+)$/.exec(expr);
  if (binaryM) {
    const left = binaryM[1]!;
    const opChar = binaryM[2]!;
    const right = binaryM[3]!;
    const opMap: Record<string, ScalarBinaryOp> = { '+': 'add', '-': 'subtract', '*': 'multiply', '/': 'divide' };
    if (/^-?[\d.]/.test(right) || /^\{[a-zA-Z_][a-zA-Z0-9_]*\}$/.test(right) || right === 'X' || right === 'Y' || /[+\-*/]/.test(right)) {
      return {
        name,
        source: left,
        op: { fn: opMap[opChar]!, terms: [{ operand: 'val', value: parseExprFromText(right, `Pipeline "${name}" literal`) }] },
        comment,
      };
    }
    return {
      name,
      source: left,
      op: { fn: opMap[opChar]!, terms: [{ operand: 'ref', source2: right }] },
      comment,
    };
  }

  const twoArgM = /^(max|min)\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)$/i.exec(expr);
  if (twoArgM) {
    const fn = twoArgM[1]!.toLowerCase() as 'max' | 'min';
    return {
      name,
      source: twoArgM[2]!,
      op: { fn, operand: 'ref', source2: twoArgM[3]! },
      comment,
    };
  }

  const unaryM = /^(sum|min|max|count|ceil|floor|sub)\s+([A-Za-z_][A-Za-z0-9_]*)$/i.exec(expr);
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
  } else if (op.fn === 'switch') {
    const branchStrings = op.branches.map(serializeSwitchBranch);
    return `${nv.name} = switch ${nv.source} -> ${branchStrings.join(' | ')}`;
  } else if (op.fn === 'filter' || op.fn === 'remove') {
    const clauses = op.conditions.clauses.map((c) => {
      const sv = serializeClauseValue(c);
      return sv ? `${c.field} ${c.operator} ${sv}` : `${c.field} ${c.operator}`;
    });
    let clauseStr = clauses[0] || '';
    for (let i = 0; i < op.conditions.connectors.length; i++) {
      clauseStr += ` ${op.conditions.connectors[i]} ${clauses[i + 1] || ''}`;
    }
    v = `${nv.name} = ${op.fn} ${nv.source} where ${clauseStr}`;
  } else if (op.fn === 'ceil' || op.fn === 'floor') {
    v = `${nv.name} = ${op.fn} ${nv.source}`;
  } else if (op.fn === 'add' || op.fn === 'subtract' || op.fn === 'multiply' || op.fn === 'divide') {
    const sym: Record<ScalarBinaryOp, string> = { add: '+', subtract: '-', multiply: '*', divide: '/' };
    if ('terms' in op && Array.isArray(op.terms) && op.terms.length > 0) {
      const first = op.terms[0]!;
      if (first.operand === 'ref' && first.source2) {
        v = `${nv.name} = ${nv.source} ${sym[op.fn]} ${first.source2}`;
      } else if (first.operand === 'val') {
        v = `${nv.name} = ${nv.source} ${sym[op.fn]} ${exprToString(first.value, 'yaml')}`;
      } else {
        v = `${nv.name} = ${JSON.stringify(op)}`;
      }
      for (let i = 1; i < op.terms.length; i++) {
        const t = op.terms[i]!;
        if (t.operand === 'ref' && t.source2) {
          v += ` ${sym[op.fn]} ${t.source2}`;
        } else if (t.operand === 'val') {
          v += ` ${sym[op.fn]} ${exprToString(t.value, 'yaml')}`;
        }
      }
    } else {
      v = `${nv.name} = ${JSON.stringify(op)}`;
    }
  } else if ((op.fn === 'max' || op.fn === 'min') && op.operand === 'ref' && op.source2) {
    v = `${nv.name} = ${op.fn}(${nv.source}, ${op.source2})`;
  } else {
    v = `${nv.name} = ${JSON.stringify(op)}`;
  }
  return nv.comment ? { _value: v, _comment: nv.comment } : v;
}

function parseOutcomeEntry(text: string, comment: string): Outcome {
  const m = /^(.+?)\s+when\s+(.+)$/i.exec(text);
  if (!m) {
    throw new PresetError(`Invalid outcome entry: "${text}"`);
  }
  const name = m[1]!.trim();
  const clauseText = m[2]!.trim();

  const { conditions, connectors } = parseOutcomeConditions(clauseText);
  return {
    id: crypto.randomUUID(),
    name,
    conditions,
    connectors,
    comment,
  };
}

function parseOutcomeConditions(text: string): { conditions: OutcomeCondition[]; connectors: ('and' | 'or')[] } {
  const conditions: OutcomeCondition[] = [];
  const connectors: ('and' | 'or')[] = [];
  const tokens = text.split(/\s+/);
  let i = 0;
  let buffer: string[] = [];
  let pendingConnector: 'and' | 'or' | null = null;
  const flushBuffer = (): void => {
    if (buffer.length === 0) return;
    conditions.push(parseSingleOutcomeCondition(buffer));
    buffer = [];
    if (pendingConnector !== null) {
      connectors.push(pendingConnector);
      pendingConnector = null;
    }
  };
  while (i < tokens.length) {
    if (tokens[i] === 'and' || tokens[i] === 'or') {
      pendingConnector = tokens[i] === 'or' ? 'or' : 'and';
      flushBuffer();
      i++;
      continue;
    }
    buffer.push(tokens[i]!);
    i++;
  }
  flushBuffer();
  return { conditions, connectors };
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
      value: parseExprFromText(tokens[3]!, `Outcome dice value`),
    };
  }
  const source = tokens[0]!;
  const op = operatorFromToken(tokens[1]!);
  const valueText = tokens[2]!;
  if (valueText === 'max' || valueText === 'min') {
    const fallback = valueText === 'max' ? 9999 : -9999;
    return { source, op, value: literalExpr(fallback) };
  }
  return { source, op, value: parseExprFromText(valueText, `Outcome "${source}" value`) };
}

function serializeOutcomeEntry(o: Outcome): YamlNode {
  const conds = o.conditions.map((c) => {
    if (c.op === 'any' || c.op === 'all' || c.op === 'none') {
      return `${c.op} ${c.source} ${c.subCondition} ${exprToString(c.value, 'yaml')}`;
    }
    return `${c.source} ${c.op} ${exprToString(c.value, 'yaml')}`;
  });
  let condStr = conds[0] || '';
  for (let i = 0; i < o.connectors.length; i++) {
    condStr += ` ${o.connectors[i]} ${conds[i + 1] || ''}`;
  }
  const v = `${o.name} when ${condStr}`;
  return o.comment ? { _value: v, _comment: o.comment } : v;
}

function parseSweep(node: YamlNode | undefined): SweepParameters {
  if (node === undefined || node === null) {
    return { x: [], y: null, xName: '', yName: '' };
  }
  if (!isMapping(node)) {
    throw new PresetError('"sweep:" must be a mapping with optional x and y lists');
  }
  const xNode = node['x'];
  const yNode = node['y'];
  const x = parseSweepList(xNode, 'sweep.x');
  let y: number[] | null = null;
  if (yNode !== undefined && yNode !== null) {
    y = parseSweepList(yNode, 'sweep.y');
    if (y.length === 0) y = null;
  }
  const xName = typeof node['xName'] === 'string' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(node['xName'])
    ? String(node['xName'])
    : (x.length > 0 ? 'X' : '');
  const yName = typeof node['yName'] === 'string' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(node['yName'])
    ? String(node['yName'])
    : (y && y.length > 0 ? 'Y' : '');
  return { x, y, xName, yName };
}

function parseSweepList(node: YamlNode, label: string): number[] {
  if (!isList(node)) {
    throw new PresetError(`"${label}:" must be a list of numbers`);
  }
  const result: number[] = [];
  for (const item of node) {
    if (typeof item === 'number' && Number.isFinite(item)) {
      result.push(item);
    } else if (typeof item === 'string') {
      const n = Number(item);
      if (!Number.isFinite(n)) {
        throw new PresetError(`"${label}:" contains non-numeric value "${item}"`);
      }
      result.push(n);
    } else {
      throw new PresetError(`"${label}:" contains invalid value`);
    }
  }
  return result;
}

function serializeSweep(sweep: SweepParameters): YamlNode {
  const obj: { [k: string]: YamlNode } = {
    x: sweep.x,
    xName: sweep.xName,
    yName: sweep.yName,
  };
  if (sweep.y && sweep.y.length > 0) {
    obj['y'] = sweep.y;
  }
  return obj;
}

function astToPreset(ast: YamlNode): PresetConfig {
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
  const presetId = typeof ast['id'] === 'string' && ast['id'] !== '' ? String(ast['id']) : crypto.randomUUID();
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
      let value: string;
      let comment: string;
      let branches: string[] | undefined;

      if (typeof item === 'string') {
        value = item;
        comment = '';
        branches = undefined;
      } else if (isMapping(item)) {
        if ('_value' in item) {
          const uw = unwrapListItem(item);
          value = uw.value;
          comment = uw.comment;
          branches = undefined;
        } else {
          const keys = Object.keys(item);
          if (keys.length === 1) {
            const key = keys[0]!;
            value = key;
            comment = '';
            const val = item[key]!;
            if (isList(val)) {
              branches = val.map((b) => {
                const { value: bv } = unwrapListItem(b);
                return bv;
              });
            } else {
              throw new PresetError('Switch branches must be a list');
            }
          } else {
            throw new PresetError(`Unexpected pipeline entry structure`);
          }
        }
      } else {
        throw new PresetError(`Invalid pipeline entry`);
      }

      const entry = parsePipelineEntry(value, comment, branches);
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

  if (ast['parameters'] !== undefined && ast['parameters'] !== null) {
    throw new PresetError('Legacy "parameters:" block is not supported. Use "sweep:" with x/y lists and reference X/Y in value cells.');
  }

  const sweep = parseSweep(ast['sweep']);

  return {
    id: presetId,
    name,
    pool,
    rerollConditions: reroll,
    pipeline,
    outcomes,
    sweep,
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
      const op = nv.op as { fn: string; operand?: string; source2?: string; terms?: ScalarBinaryTerm[]; branches?: SwitchBranch[] };
      if (op.fn === 'switch' && op.branches) {
        for (const branch of op.branches) {
          if (branch.condition.source !== 'rolled' && !pipelineByName.has(branch.condition.source)) {
            throw new PresetError(`Pipeline "${nv.name}" switch branch references unknown condition source "${branch.condition.source}"`);
          }
          if (branch.value.operand === 'ref' && branch.value.source2) {
            if (!pipelineByName.has(branch.value.source2)) {
              throw new PresetError(`Pipeline "${nv.name}" switch branch references unknown value source "${branch.value.source2}"`);
            }
          }
        }
      } else if (op.operand === 'ref' && op.source2) {
        if (!pipelineByName.has(op.source2)) {
          throw new PresetError(`Pipeline "${nv.name}" references unknown source "${op.source2}"`);
        }
      }
      if (op.terms) {
        for (const term of op.terms) {
          if (term.operand === 'ref' && term.source2) {
            if (!pipelineByName.has(term.source2)) {
              throw new PresetError(`Pipeline "${nv.name}" references unknown source "${term.source2}"`);
            }
          }
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
    ...(config.sweep.x.length > 0 || (config.sweep.y && config.sweep.y.length > 0)
      ? { sweep: serializeSweep(config.sweep) }
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
