export type ExprOp = '+' | '-' | '*' | '/';

export type Expr =
  | { kind: 'literal'; value: number }
  | { kind: 'ref'; name: string }
  | { kind: 'binop'; op: ExprOp; left: Expr; right: Expr };

export interface ExprParseError {
  error: string;
  pos: number;
}

export type ExprParseResult =
  | { expr: Expr; end: number }
  | ExprParseError;

export function literalExpr(n: number): Expr {
  return { kind: 'literal', value: n };
}

export function refX(name = 'X'): Expr {
  return { kind: 'ref', name };
}

export function refY(name = 'Y'): Expr {
  return { kind: 'ref', name };
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function skipWs(text: string, i: number): number {
  while (i < text.length && (text[i] === ' ' || text[i] === '\t')) i++;
  return i;
}
function parseNumber(text: string, i: number): ExprParseResult {
  const start = i;
  if (text[i] === '+' || text[i] === '-') i++;
  if (i >= text.length || !isDigit(text[i] ?? '')) {
    return { error: 'Expected number', pos: start };
  }
  while (i < text.length && isDigit(text[i] ?? '')) i++;
  if (text[i] === '.') {
    i++;
    if (i >= text.length || !isDigit(text[i] ?? '')) {
      return { error: 'Expected digit after decimal point', pos: start };
    }
    while (i < text.length && isDigit(text[i] ?? '')) i++;
  }
  const text2 = text.slice(start, i);
  const value = Number(text2);
  if (!Number.isFinite(value)) {
    return { error: `Invalid number "${text2}"`, pos: start };
  }
  return { expr: { kind: 'literal', value }, end: i };
}

function parseFactor(text: string, i: number): ExprParseResult {
  i = skipWs(text, i);
  if (i >= text.length) {
    return { error: 'Unexpected end of expression', pos: i };
  }
  if (text[i] === '(') {
    const inner = parseAddExpr(text, i + 1);
    if ('error' in inner) return inner;
    const afterInner = skipWs(text, inner.end);
    if (text[afterInner] !== ')') {
      return { error: 'Missing ")"', pos: afterInner };
    }
    return { expr: inner.expr, end: afterInner + 1 };
  }
  if (text[i] === '+' || text[i] === '-') {
    const sign = text[i];
    const operand = parseFactor(text, i + 1);
    if ('error' in operand) return operand;
    if (sign === '-') {
      return { expr: { kind: 'binop', op: '-', left: { kind: 'literal', value: 0 }, right: operand.expr }, end: operand.end };
    }
    return operand;
  }
  if (text[i] === '{') {
    const endBrace = text.indexOf('}', i);
    if (endBrace === -1) return { error: 'Missing "}"', pos: i };
    const name = text.slice(i + 1, endBrace);
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return { error: `Invalid variable name "${name}"`, pos: i };
    }
    return { expr: { kind: 'ref', name }, end: endBrace + 1 };
  }
  if (/^[a-zA-Z_]/.test(text[i] ?? '')) {
    const match = text.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
    if (match) {
      return { expr: { kind: 'ref', name: match[0] }, end: i + match[0].length };
    }
  }
  if (isDigit(text[i] ?? '')) {
    return parseNumber(text, i);
  }
  return { error: `Unexpected token "${text[i] ?? ''}"`, pos: i };
}

function parseTermInner(text: string, i: number): ExprParseResult {
  let left = parseFactor(text, i);
  if ('error' in left) return left;
  while (true) {
    const j = skipWs(text, left.end);
    const op = text[j];
    if (op !== '*' && op !== '/') break;
    const right = parseFactor(text, j + 1);
    if ('error' in right) return right;
    left = { expr: { kind: 'binop', op, left: left.expr, right: right.expr }, end: right.end };
  }
  return left;
}

function parseAddExpr(text: string, i: number): ExprParseResult {
  let left = parseTermInner(text, i);
  if ('error' in left) return left;
  while (true) {
    const j = skipWs(text, left.end);
    const op = text[j];
    if (op !== '+' && op !== '-') break;
    const right = parseTermInner(text, j + 1);
    if ('error' in right) return right;
    left = { expr: { kind: 'binop', op, left: left.expr, right: right.expr }, end: right.end };
  }
  return left;
}

export function parseExpr(text: string): ExprParseResult {
  const i = skipWs(text, 0);
  if (i >= text.length) {
    return { error: 'Empty expression', pos: 0 };
  }
  const result = parseAddExpr(text, i);
  if ('error' in result) return result;
  const tail = skipWs(text, result.end);
  if (tail < text.length) {
    return { error: `Unexpected token "${text[tail]}"`, pos: tail };
  }
  return result;
}

export function evalExpr(expr: Expr, vars: Record<string, number>): number {
  switch (expr.kind) {
    case 'literal': return expr.value;
    case 'ref': return vars[expr.name] ?? 0;
    case 'binop': {
      const l = evalExpr(expr.left, vars);
      const r = evalExpr(expr.right, vars);
      switch (expr.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return r === 0 ? 0 : l / r;
      }
    }
  }
}

export function exprToInteger(
  expr: Expr,
  vars: Record<string, number>,
  range: { min: number; max: number }
): number {
  const value = evalExpr(expr, vars);
  const rounded = Math.round(value);
  if (Number.isNaN(rounded)) return range.min;
  return Math.max(range.min, Math.min(range.max, rounded));
}

function opPrecedence(op: ExprOp): number {
  return op === '+' || op === '-' ? 1 : 2;
}

function exprToStringInner(expr: Expr, parentPrec: number, format: 'display' | 'yaml'): string {
  if (expr.kind === 'literal') {
    return Number.isInteger(expr.value) ? String(expr.value) : String(expr.value);
  }
  if (expr.kind === 'ref') {
    return format === 'yaml' ? `{${expr.name}}` : expr.name;
  }
  const myPrec = opPrecedence(expr.op);
  const leftStr = exprToStringInner(expr.left, myPrec, format);
  const rightStr = exprToStringInner(expr.right, myPrec, format);
  let s = `${leftStr}${expr.op}${rightStr}`;
  if (myPrec < parentPrec) {
    s = `(${s})`;
  }
  return s;
}

export function exprToString(expr: Expr, format: 'display' | 'yaml' = 'display'): string {
  return exprToStringInner(expr, 0, format);
}

export function parseValues(text: string): number[] {
  const results: number[] = [];
  for (const part of text.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const rangeMatch = /^(-?\d+)\.\.(-?\d+)$/.exec(trimmed);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start <= end) {
        for (let i = start; i <= end; i++) results.push(i);
      } else {
        for (let i = end; i <= start; i++) results.push(i);
      }
    } else {
      const num = Number(trimmed);
      if (!isNaN(num) && Number.isFinite(num)) results.push(num);
    }
  }
  return results;
}

export function normalizeSweepValues(values: number[]): { values: number[]; capped: boolean } {
  const sorted = Array.from(new Set(values)).sort((a, b) => a - b);
  if (sorted.length > 10) {
    return { values: sorted.slice(0, 10), capped: true };
  }
  return { values: sorted, capped: false };
}
