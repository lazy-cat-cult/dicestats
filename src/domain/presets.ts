import type { PresetConfig } from '@/types';
import { literalExpr } from '@/utils/expression';

export const PRESETS: PresetConfig[] = [
  {
    id: 'dnd-d20',
    name: 'D&D 5e — d20',
    pool: {
      terms: [{ id: 'd20-1', count: literalExpr(1), sides: literalExpr(20), tag: '', comment: '' }],
    },
    rerollConditions: [],
    pipeline: [
      {
        id: 'p1',
        name: 'total',
        source: 'rolled',
        op: 'sum',
        comment: '',
      },
    ],
    outcomes: [
      {
        id: 'o1',
        name: 'Hit',
        conditions: [{ source: 'total', op: '>=', value: { kind: 'ref', name: 'X' } }],
        connector: 'and',
        comment: '',
      },
    ],
    sweep: { x: [5, 10, 15, 20], y: null },
  },
  {
    id: 'dnd-advantage',
    name: 'D&D 5e — Advantage 2d20 best',
    pool: {
      terms: [{ id: 'd20-1', count: literalExpr(2), sides: literalExpr(20), tag: '', comment: '' }],
    },
    rerollConditions: [],
    pipeline: [
      {
        id: 'p1',
        name: 'best',
        source: 'rolled',
        op: 'max',
        comment: '',
      },
    ],
    outcomes: [
      {
        id: 'o1',
        name: 'Hit',
        conditions: [{ source: 'best', op: '>=', value: { kind: 'ref', name: 'X' } }],
        connector: 'and',
        comment: '',
      },
    ],
    sweep: { x: [5, 10, 15, 20], y: null },
  },
  {
    id: 'pbta-2d6',
    name: 'PbtA — 2d6',
    pool: {
      terms: [{ id: 'd6-1', count: literalExpr(2), sides: literalExpr(6), tag: '', comment: '' }],
    },
    rerollConditions: [],
    pipeline: [
      {
        id: 'p1',
        name: 'total',
        source: 'rolled',
        op: 'sum',
        comment: '',
      },
      {
        id: 'p2',
        name: 'total_mod',
        source: 'total',
        op: { fn: 'add', operand: 'literal', value: { kind: 'ref', name: 'X' } },
        comment: '',
      },
    ],
    outcomes: [
      {
        id: 'o1',
        name: 'Success',
        conditions: [{ source: 'total_mod', op: '>=', value: { kind: 'ref', name: 'Y' } }],
        connector: 'and',
        comment: '',
      },
      {
        id: 'o2',
        name: 'Partial',
        conditions: [{ source: 'total_mod', op: '>=', value: literalExpr(7) }, { source: 'total_mod', op: '<=', value: literalExpr(9) }],
        connector: 'and',
        comment: '',
      },
      {
        id: 'o3',
        name: 'Failure',
        conditions: [{ source: 'total_mod', op: '<=', value: literalExpr(6) }],
        connector: 'and',
        comment: '',
      },
    ],
    sweep: { x: [-2, -1, 0, 1, 2], y: [10, 15] },
  },
  {
    id: 'shadowrun-xd6',
    name: 'Shadowrun — Xd6',
    pool: {
      terms: [{ id: 'd6-1', count: { kind: 'ref', name: 'X' }, sides: literalExpr(6), tag: '', comment: '' }],
    },
    rerollConditions: [],
    pipeline: [],
    outcomes: [
      {
        id: 'o1',
        name: '1+ hits',
        conditions: [{ source: 'rolled', op: 'any', subCondition: '>=', value: literalExpr(5) }],
        connector: 'and',
        comment: '',
      },
      {
        id: 'o2',
        name: 'No hits',
        conditions: [{ source: 'rolled', op: 'none', subCondition: '>=', value: literalExpr(5) }],
        connector: 'and',
        comment: '',
      },
    ],
    sweep: { x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], y: null },
  },
  {
    id: 'vampire-v5',
    name: 'Vampire V5',
    pool: {
      terms: [
        { id: 'normal', count: literalExpr(3), sides: literalExpr(10), tag: 'normal', comment: '' },
        { id: 'hunger', count: literalExpr(2), sides: literalExpr(10), tag: 'hunger', comment: '' },
      ],
    },
    rerollConditions: [],
    pipeline: [
      {
        id: 'p1',
        name: 'successes',
        source: 'rolled',
        op: {
          fn: 'filter',
          conditions: {
            clauses: [{ field: 'face', operator: '>=', value: 6 }],
            connector: 'and',
          },
        },
        comment: '',
      },
      {
        id: 'p2',
        name: 'success_count',
        source: 'successes',
        op: 'count',
        comment: '',
      },
      {
        id: 'p3',
        name: 'crit_faces',
        source: 'rolled',
        op: {
          fn: 'filter',
          conditions: {
            clauses: [{ field: 'face', operator: '=', value: 10 }],
            connector: 'and',
          },
        },
        comment: '',
      },
      {
        id: 'p4',
        name: 'crit_count',
        source: 'crit_faces',
        op: 'count',
        comment: '',
      },
      {
        id: 'p5',
        name: 'half_crits',
        source: 'crit_count',
        op: { fn: 'divide', operand: 'literal', value: literalExpr(2) },
        comment: '',
      },
      {
        id: 'p6',
        name: 'rounded_crits',
        source: 'half_crits',
        op: { fn: 'floor' },
        comment: '',
      },
      {
        id: 'p7',
        name: 'double_crits',
        source: 'rounded_crits',
        op: { fn: 'multiply', operand: 'literal', value: literalExpr(2) },
        comment: '',
      },
      {
        id: 'p8',
        name: 'total_successes',
        source: 'success_count',
        op: { fn: 'add', operand: 'named', source2: 'double_crits' },
        comment: '',
      },
    ],
    outcomes: [
      {
        id: 'o1',
        name: 'Success',
        conditions: [{ source: 'total_successes', op: '>=', value: literalExpr(1) }],
        connector: 'and',
        comment: '',
      },
      {
        id: 'o2',
        name: 'Failure',
        conditions: [{ source: 'total_successes', op: '=', value: literalExpr(0) }],
        connector: 'and',
        comment: '',
      },
    ],
    sweep: { x: [], y: null },
  },
  {
    id: 'daggerheart-duality',
    name: 'Daggerheart — Duality (2d12)',
    pool: {
      terms: [
        { id: 'd12-hope', count: literalExpr(1), sides: literalExpr(12), tag: 'hope', comment: '' },
        { id: 'd12-fear', count: literalExpr(1), sides: literalExpr(12), tag: 'fear', comment: '' },
      ],
    },
    rerollConditions: [],
    pipeline: [
      {
        id: 'p1',
        name: 'hope_face',
        source: 'rolled',
        op: {
          fn: 'filter',
          conditions: {
            clauses: [{ field: 'tag', operator: '=', value: 'hope' }],
            connector: 'and',
          },
        },
        comment: '',
      },
      {
        id: 'p2',
        name: 'fear_face',
        source: 'rolled',
        op: {
          fn: 'filter',
          conditions: {
            clauses: [{ field: 'tag', operator: '=', value: 'fear' }],
            connector: 'and',
          },
        },
        comment: '',
      },
      {
        id: 'p3',
        name: 'hope_value',
        source: 'hope_face',
        op: 'max',
        comment: '',
      },
      {
        id: 'p4',
        name: 'fear_value',
        source: 'fear_face',
        op: 'max',
        comment: '',
      },
      {
        id: 'p5',
        name: 'delta',
        source: 'hope_value',
        op: { fn: 'subtract', operand: 'named', source2: 'fear_value' },
        comment: '',
      },
      {
        id: 'p6',
        name: 'total',
        source: 'rolled',
        op: 'sum',
        comment: '',
      },
      {
        id: 'p7',
        name: 'total_mod',
        source: 'total',
        op: { fn: 'add', operand: 'literal', value: { kind: 'ref', name: 'X' } },
        comment: '',
      },
    ],
    outcomes: [
      {
        id: 'o1',
        name: 'Critical Success',
        conditions: [{ source: 'delta', op: '=', value: literalExpr(0) }],
        connector: 'and',
        comment: '',
      },
      {
        id: 'o2',
        name: 'Success with Hope',
        conditions: [{ source: 'delta', op: '>', value: literalExpr(0) }, { source: 'total_mod', op: '>=', value: literalExpr(15) }],
        connector: 'and',
        comment: '',
      },
      {
        id: 'o3',
        name: 'Success with Fear',
        conditions: [{ source: 'delta', op: '<', value: literalExpr(0) }, { source: 'total_mod', op: '>=', value: literalExpr(15) }],
        connector: 'and',
        comment: '',
      },
      {
        id: 'o4',
        name: 'Failure with Hope',
        conditions: [{ source: 'delta', op: '>', value: literalExpr(0) }, { source: 'total_mod', op: '<', value: literalExpr(15) }],
        connector: 'and',
        comment: '',
      },
      {
        id: 'o5',
        name: 'Failure with Fear',
        conditions: [{ source: 'delta', op: '<', value: literalExpr(0) }, { source: 'total_mod', op: '<', value: literalExpr(15) }],
        connector: 'and',
        comment: '',
      },
    ],
    sweep: { x: [-2, -1, 0, 1, 2, 3, 4, 5], y: null },
  },
  {
    id: 'daggerheart-compound',
    name: 'Daggerheart — Compound Outcomes (2d12)',
    pool: {
      terms: [
        { id: 'd12-hope', count: literalExpr(1), sides: literalExpr(12), tag: 'hope', comment: '' },
        { id: 'd12-fear', count: literalExpr(1), sides: literalExpr(12), tag: 'fear', comment: '' },
      ],
    },
    rerollConditions: [],
    pipeline: [
      {
        id: 'p1',
        name: 'hope_face',
        source: 'rolled',
        op: {
          fn: 'filter',
          conditions: {
            clauses: [{ field: 'tag', operator: '=', value: 'hope' }],
            connector: 'and',
          },
        },
        comment: '',
      },
      {
        id: 'p2',
        name: 'fear_face',
        source: 'rolled',
        op: {
          fn: 'filter',
          conditions: {
            clauses: [{ field: 'tag', operator: '=', value: 'fear' }],
            connector: 'and',
          },
        },
        comment: '',
      },
      {
        id: 'p3',
        name: 'total',
        source: 'rolled',
        op: 'sum',
        comment: '',
      },
      {
        id: 'p4',
        name: 'hope_value',
        source: 'hope_face',
        op: 'max',
        comment: '',
      },
      {
        id: 'p5',
        name: 'fear_value',
        source: 'fear_face',
        op: 'max',
        comment: '',
      },
      {
        id: 'p6',
        name: 'delta',
        source: 'hope_value',
        op: { fn: 'subtract', operand: 'named', source2: 'fear_value' },
        comment: '',
      },
    ],
    outcomes: [
      {
        id: 'o1',
        name: 'Critical Hit',
        conditions: [
          { source: 'total', op: '>=', value: literalExpr(15) },
          { source: 'delta', op: '>=', value: literalExpr(0) },
        ],
        connector: 'and',
        comment: '',
      },
      {
        id: 'o2',
        name: 'Critical Miss',
        conditions: [
          { source: 'total', op: '<=', value: literalExpr(5) },
          { source: 'delta', op: '<', value: literalExpr(0) },
        ],
        connector: 'and',
        comment: '',
      },
      {
        id: 'o3',
        name: 'Hope',
        conditions: [{ source: 'delta', op: '>', value: literalExpr(0) }],
        connector: 'and',
        comment: '',
      },
    ],
    sweep: { x: [], y: null },
  },
  {
    id: 'cyberpunk-red-check',
    name: 'Cyberpunk RED — d10 + Skill (2d10)',
    pool: {
      terms: [{ id: 'd10-1', count: literalExpr(2), sides: literalExpr(10), tag: '', comment: '' }],
    },
    rerollConditions: [],
    pipeline: [
      {
        id: 'p1',
        name: 'total',
        source: 'rolled',
        op: 'sum',
        comment: '',
      },
    ],
    outcomes: [
      {
        id: 'o1',
        name: 'Success',
        conditions: [{ source: 'total', op: '>=', value: { kind: 'ref', name: 'X' } }],
        connector: 'and',
        comment: '',
      },
    ],
    sweep: { x: [10, 13, 15, 17, 20, 22, 25, 28, 30], y: null },
  },
  {
    id: 'blades-in-the-dark',
    name: 'Blades in the Dark — Xd6 action',
    pool: {
      terms: [{ id: 'd6-1', count: { kind: 'ref', name: 'X' }, sides: literalExpr(6), tag: '', comment: '' }],
    },
    rerollConditions: [],
    pipeline: [
      {
        id: 'p1',
        name: 'best',
        source: 'rolled',
        op: 'max',
        comment: '',
      },
      {
        id: 'p2',
        name: 'sixes',
        source: 'rolled',
        op: {
          fn: 'filter',
          conditions: {
            clauses: [{ field: 'face', operator: '=', value: 'max_value' }],
            connector: 'and',
          },
        },
        comment: '',
      },
      {
        id: 'p3',
        name: 'six_count',
        source: 'sixes',
        op: 'count',
        comment: '',
      },
    ],
    outcomes: [
      {
        id: 'o1',
        name: 'Critical',
        conditions: [{ source: 'six_count', op: '>=', value: literalExpr(2) }],
        connector: 'and',
        comment: '',
      },
      {
        id: 'o2',
        name: 'Success',
        conditions: [{ source: 'best', op: '=', value: literalExpr(6) }],
        connector: 'and',
        comment: '',
      },
      {
        id: 'o3',
        name: 'Partial',
        conditions: [{ source: 'best', op: '>=', value: literalExpr(4) }, { source: 'best', op: '<=', value: literalExpr(5) }],
        connector: 'and',
        comment: '',
      },
      {
        id: 'o4',
        name: 'Failure',
        conditions: [{ source: 'best', op: '<=', value: literalExpr(3) }],
        connector: 'and',
        comment: '',
      },
    ],
    sweep: { x: [1, 2, 3, 4, 5, 6, 7, 8], y: null },
  },
  {
    id: 'savage-worlds',
    name: 'Savage Worlds — Trait (d8) + Wild (d6)',
    pool: {
      terms: [
        { id: 'trait-d8', count: literalExpr(1), sides: { kind: 'ref', name: 'X' }, tag: 'trait', comment: '' },
        { id: 'wild-d6', count: literalExpr(1), sides: literalExpr(6), tag: 'wild', comment: '' },
      ],
    },
    rerollConditions: [
      {
        id: 'rc-explode',
        action: 'explode',
        conditions: { clauses: [{ field: 'face', operator: '=', value: 'max_value' as const }], connector: 'and' },
        repeat: 5,
        comment: '',
      },
    ],
    pipeline: [
      {
        id: 'p1',
        name: 'trait_only',
        source: 'rolled',
        op: {
          fn: 'filter',
          conditions: {
            clauses: [{ field: 'tag', operator: '=', value: 'trait' }],
            connector: 'and',
          },
        },
        comment: '',
      },
      {
        id: 'p2',
        name: 'wild_only',
        source: 'rolled',
        op: {
          fn: 'filter',
          conditions: {
            clauses: [{ field: 'tag', operator: '=', value: 'wild' }],
            connector: 'and',
          },
        },
        comment: '',
      },
      {
        id: 'p3',
        name: 'trait_best',
        source: 'trait_only',
        op: 'max',
        comment: '',
      },
      {
        id: 'p4',
        name: 'wild_best',
        source: 'wild_only',
        op: 'max',
        comment: '',
      },
      {
        id: 'p5',
        name: 'effective',
        source: 'trait_best',
        op: { fn: 'max', operand: 'named', source2: 'wild_best' },
        comment: '',
      },
    ],
    outcomes: [
      {
        id: 'o1',
        name: 'Raise',
        conditions: [{ source: 'effective', op: '>=', value: literalExpr(8) }],
        connector: 'and',
        comment: '',
      },
      {
        id: 'o2',
        name: 'Success',
        conditions: [{ source: 'effective', op: '>=', value: literalExpr(4) }, { source: 'effective', op: '<=', value: literalExpr(7) }],
        connector: 'and',
        comment: '',
      },
      {
        id: 'o3',
        name: 'Failure',
        conditions: [{ source: 'effective', op: '<', value: literalExpr(4) }],
        connector: 'and',
        comment: '',
      },
    ],
    sweep: { x: [4, 6, 8, 10, 12], y: null },
  },
  {
    id: 'wod-explode',
    name: 'World of Darkness — Xd10 explode',
    pool: {
      terms: [{ id: 'd10-1', count: { kind: 'ref', name: 'X' }, sides: literalExpr(10), tag: '', comment: '' }],
    },
    rerollConditions: [
      {
        id: 'rc-wod',
        action: 'explode',
        conditions: { clauses: [{ field: 'face', operator: '=', value: 'max_value' as const }], connector: 'and' },
        repeat: 3,
        comment: '',
      },
    ],
    pipeline: [],
    outcomes: [
      {
        id: 'o1',
        name: 'Success',
        conditions: [{ source: 'rolled', op: 'any', subCondition: '>=', value: literalExpr(8) }],
        connector: 'and',
        comment: '',
      },
      {
        id: 'o2',
        name: 'Failure',
        conditions: [{ source: 'rolled', op: 'none', subCondition: '>=', value: literalExpr(8) }],
        connector: 'and',
        comment: '',
      },
    ],
    sweep: { x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], y: null },
  },
];

export const FEATURED_PRESET_IDS: readonly string[] = [
  'dnd-d20',
  'pbta-2d6',
  'blades-in-the-dark',
  'daggerheart-duality',
];

export function getPreset(id: string): PresetConfig | undefined {
  return PRESETS.find((p) => p.id === id);
}
