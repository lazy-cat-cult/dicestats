import type { PresetConfig } from '@/types';

export const PRESETS: PresetConfig[] = [
  {
    id: 'dnd-d20',
    name: 'D&D 5e — d20',
    pool: {
      terms: [{ id: 'd20-1', count: 1, sides: 20, tag: '' }],
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
        source: 'total',
        conditions: [{ op: '>=', value: 15 }],
        connector: 'and',
        comment: '',
        isDefault: false,
      },
    ],
    parameters: [
      {
        id: 'dc',
        label: 'DC',
        values: [5, 10, 15, 20],
        target: 'outcome.value',
        targetOutcomeId: 'o1',
      },
    ],
  },
  {
    id: 'dnd-advantage',
    name: 'D&D 5e — Advantage 2d20 best',
    pool: {
      terms: [{ id: 'd20-1', count: 2, sides: 20, tag: '' }],
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
        source: 'best',
        conditions: [{ op: '>=', value: 15 }],
        connector: 'and',
        comment: '',
        isDefault: false,
      },
    ],
    parameters: [
      {
        id: 'dc',
        label: 'DC',
        values: [5, 10, 15, 20],
        target: 'outcome.value',
        targetOutcomeId: 'o1',
      },
    ],
  },
  {
    id: 'pbta-2d6',
    name: 'PbtA — 2d6',
    pool: {
      terms: [{ id: 'd6-1', count: 2, sides: 6, tag: '' }],
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
        name: 'Miss',
        source: 'total',
        conditions: [{ op: '<=', value: 6 }],
        connector: 'and',
        comment: '',
        isDefault: false,
      },
      {
        id: 'o2',
        name: 'Partial',
        source: 'total',
        conditions: [{ op: '>=', value: 7 }, { op: '<=', value: 9 }],
        connector: 'and',
        comment: '',
        isDefault: false,
      },
      {
        id: 'o3',
        name: 'Full Success',
        source: 'total',
        conditions: [{ op: '>=', value: 10 }],
        connector: 'and',
        comment: '',
        isDefault: false,
      },
    ],
  },
  {
    id: 'shadowrun-xd6',
    name: 'Shadowrun — Xd6',
    pool: {
      terms: [{ id: 'd6-1', count: 5, sides: 6, tag: '' }],
    },
    rerollConditions: [],
    pipeline: [],
    outcomes: [
      {
        id: 'o1',
        name: '1+ hits',
        source: 'rolled',
        conditions: [{ op: 'any', subCondition: '>=', value: 5 }],
        connector: 'and',
        comment: '',
        isDefault: false,
      },
      {
        id: 'o2',
        name: 'No hits',
        source: 'rolled',
        conditions: [{ op: 'none', subCondition: '>=', value: 5 }],
        connector: 'and',
        comment: '',
        isDefault: true,
      },
    ],
    parameters: [
      {
        id: 'cnt',
        label: 'Dice count',
        values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        target: 'pool.count',
        targetTermId: 'd6-1',
      },
    ],
  },
  {
    id: 'vampire-v5',
    name: 'Vampire V5',
    pool: {
      terms: [
        { id: 'normal', count: 3, sides: 10, tag: 'normal' },
        { id: 'hunger', count: 2, sides: 10, tag: 'hunger' },
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
        op: { fn: 'divide', operand: 'literal', value: 2 },
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
        op: { fn: 'multiply', operand: 'literal', value: 2 },
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
        source: 'total_successes',
        conditions: [{ op: '>=', value: 1 }],
        connector: 'and',
        comment: '',
        isDefault: false,
      },
      {
        id: 'o2',
        name: 'Failure',
        source: 'total_successes',
        conditions: [{ op: '=', value: 0 }],
        connector: 'and',
        comment: '',
        isDefault: true,
      },
    ],
  },
  {
    id: 'wod-explode',
    name: 'World of Darkness — Xd10 explode',
    pool: {
      terms: [{ id: 'd10-1', count: 5, sides: 10, tag: '' }],
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
        source: 'rolled',
        conditions: [{ op: 'any', subCondition: '>=', value: 8 }],
        connector: 'and',
        comment: '',
        isDefault: false,
      },
      {
        id: 'o2',
        name: 'Failure',
        source: 'rolled',
        conditions: [{ op: 'none', subCondition: '>=', value: 8 }],
        connector: 'and',
        comment: '',
        isDefault: true,
      },
    ],
    parameters: [
      {
        id: 'cnt',
        label: 'Dice count',
        values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        target: 'pool.count',
        targetTermId: 'd10-1',
      },
    ],
  },
];

export function getPreset(id: string): PresetConfig | undefined {
  return PRESETS.find((p) => p.id === id);
}