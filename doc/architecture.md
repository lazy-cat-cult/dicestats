# Dice Probability Calculator — Архитектура

## 1. Обзор

Одностраничное веб-приложение для расчёта вероятностей исходов бросков костей в НРИ методом Монте-Карло (1 000 000 итераций). Пользователь задаёт пул костей, условия отбора и параметры перебора, получает вероятности в виде таблиц и графиков.

## 2. Стек технологий

| Слой | Технология | Версия | Назначение |
|---|---|---|---|
| Сборка | Vite | 8.x | Dev-server, bundler, HMR |
| UI | Preact | 10.x | Компонентный рендеринг (~3 КБ) |
| Реактивность | Preact Signals | 2.x | Состояние без провайдеров |
| Стили | Tailwind CSS | 4.x | Utility-first CSS |
| Графики | Chart.js | 4.x | Гистограммы, линейные графики |
| Симуляция | Web Worker | — | Фоновый расчёт без блокировки UI |
| Тесты | Vitest | 4.x |Unit- и интеграционные тесты |
| Язык | TypeScript | 6.x | Статическая типизация |

## 3. Архитектурная диаграмма

```
┌─────────────────────────────────────────────────────┐
│                    UI (Preact)                      │
│                                                      │
│  App ─── StepWizard                                 │
│         ├── DicePoolEditor                          │
│         ├── OutcomeEditor                           │
│         ├── ParameterEditor                          │
│         └── ResultView ─── DistributionChart         │
│                              ParameterChart          │
│         PresetSelector                              │
├─────────────────────────────────────────────────────┤
│              Слой состояния (Signals)                │
│                                                      │
│  dicePool ──────────── DicePool                     │
│  outcomes ──────────── Outcome[]                    │
│  parameters ────────── Parameter[]                  │
│  simResults ────────── SimResult[]                  │
│  isSimulating ──────── boolean                      │
│  simProgress ───────── { completed, total }        │
│  dicePoolNotation ──── computed string              │
├─────────────────────────────────────────────────────┤
│               Доменный слой                          │
│                                                      │
│  types/index.ts ── все типы + compare()             │
│  domain/roller.ts ─ rollPool(), rollPoolForSimulation│
│  domain/classify.ts ─ evaluateOutcome()              │
│  domain/presets.ts ─ PRESETS, getPreset(), apply*   │
├─────────────────────────────────────────────────────┤
│             Engine (Web Worker)                      │
│                                                      │
│  worker/sim.worker.ts                                │
│  ├── rollDie(), rollTermForSim()                    │
│  ├── keepHighest/keepLowest()                       │
│  ├── simulateOnce() → RollResult                    │
│  ├── runSimulation() → SimResult                    │
│  └── onmessage: run | progress | result             │
├─────────────────────────────────────────────────────┤
│              Persistence                             │
│  state/persistence.ts ─ localStorage                │
│  saveConfig() / loadConfig() / clearConfig()        │
└─────────────────────────────────────────────────────┘
```

## 4. Доменная модель

### 4.1. Пул костей

```
DiceTerm {
  count: number       // количество костей (1–100)
  sides: number       // граней (4, 6, 8, 10, 12, 20, 100 или произвольное)
  modifier?: number    // статичный бонус/штраф
}

KeepRule {
  kind: 'highest' | 'lowest'
  count: number        // сколько оставить
}

ExplodeMode = 'none' | 'once' | 'recursive'

DicePool {
  terms: DiceTerm[]    // один или несколько типов костей
  keep?: KeepRule      // преимущество/недостаток/произвольное
  explode?: ExplodeMode // взрыв костей
}
```

### 4.2. Исходы

```
Comparison = '>=' | '>' | '<=' | '<' | '==' | '!='

ThresholdOutcome {
  kind: 'threshold'
  label: string
  expression: 'sum' | 'max' | 'min' | 'count_successes' | 'individual'
  comparison: Comparison
  value: number
  dieSuccessCondition?: Comparison   // для count_successes / individual
  dieSuccessValue?: number           // для count_successes / individual
}

PoolSuccessOutcome {
  kind: 'pool_success'
  label: string
  dieSuccess: Comparison     // условие успеха одной кости
  dieValue: number           // значение для сравнения
  threshold: number           // мин. кол-во успешных костей
  partialThreshold?: number   // мин. для «частичного успеха»
  partialLabel?: string
}

Outcome = ThresholdOutcome | PoolSuccessOutcome
```

### 4.3. Параметры перебора

```
Parameter {
  id: string
  label: string                          // «X» — отображаемая метка
  values: number[]                       // [1, 2, 3, 4, 5]
  applyTo: 'modifier' | 'count' | 'threshold_value'
  targetTermIndex?: number               // к какому DiceTerm
  targetOutcomeIndex?: number            // к какому Outcome (для threshold_value)
}
```

Для каждого значения из `values` Worker запускает полную симуляцию (1 млн бросков), подставляя значение в целевой термин или исход.

### 4.4. Результаты

```
OutcomeResult {
  label: string
  probability: number
  count: number
}

SimResult {
  label: string               // «X=3» при переборе параметра
  outcomes: OutcomeResult[]
  totalRolls: number
  distribution: Record<number, number>  // сумма → частота
}
```

### 4.5. Сообщение Worker

```
WorkerMessage = { type: 'run', job: SimJob } | { type: 'cancel' }
WorkerResponse = { type: 'progress', completed, total }
               | { type: 'result', results: SimResult[] }

SimJob {
  pool: DicePool
  outcomes: Outcome[]
  parameters?: Parameter[]
  iterations: number          // фиксировано: 1 000 000
}
```

## 5. Ключевые алгоритмы

### 5.1. Бросок кости с взрывом

```
function rollDie(sides):
  return floor(random() * sides) + 1

function rollTerm(term, explode):
  results = []
  for i in 0..term.count:
    roll = rollDie(term.sides)
    results.push(roll)
    if explode != None:
      safety = 100
      while roll == term.sides AND safety-- > 0:
        roll = rollDie(term.sides)
        results.push(roll)
        if explode == Once: break
  return results
```

### 5.2. KeepRule (преимущество/недостаток)

```
function applyKeep(rolls, keep):
  if keep.count >= rolls.length: return all rolls
  sort rolls by value (desc for highest, asc for lowest)
  return first keep.count elements, preserving original order stable
```

Вычисление `total`: `sum(kept_rolls) + sum(all modifiers)`.

### 5.3. Классификация исходов

| Выражение | Вычисление |
|---|---|
| `sum` | `total` (сумма оставленных + модификаторы) |
| `max` | `max(kept_rolls) + модификаторы` |
| `min` | `min(kept_rolls) + модификаторы` |
| `count_successes` | кол-во костей, удовлетворяющих `dieSuccessCondition dieSuccessValue` |
| `individual` | 1 если хоть одна кость удовлетворяет условию, иначе 0 |

Результат сравнивается с `value` через `comparison` (>=, >, <=, <, ==, !=).

Для `pool_success`: подсчитывается кол-во костей, удовлетворяющих `dieSuccess dieValue`, если >= `threshold` — успех.

### 5.4. Симуляция (Web Worker)

1. Получить `SimJob`
2. Если `parameters` нет — одна серия из 1 000 000 итераций
3. Если `parameters` есть — для каждого значения параметра создать модифицированный пул/исходы, запустить отдельную серию
4. На каждой итерации:
   - Бросить все кости пула (с взрывом)
   - Применить KeepRule
   - Вычислить выражение для каждого исхода
   - Классифицировать результат
   - Увеличить счётчики исходов и распределения
5. Вернуть массив `SimResult[]`

## 6. Компоненты UI

| Компонент | Назначение |
|---|---|
| `App` | Корневой компонент, создание Worker, связывание состояния |
| `StepWizard` | Пошаговая навигация (4 шага) |
| `DicePoolEditor` | Редактирование пула (количество, грани, модификатор, Keep, Explode) |
| `OutcomeEditor` | Добавление/редактирование исходов (Threshold, PoolSuccess) |
| `ParameterEditor` | Параметры перебора значений |
| `ResultView` | Таблица вероятностей, простая гистограмма |
| `PresetSelector` | Шорткаты для пресетов D&D, PbtA, Shadowrun |
| `DistributionChart` | Chart.js bar chart распределения сумм |
| `ParameterChart` | Chart.js line chart зависимости вероятности от параметра |

## 7. Поток данных

```
┌─────────────────────────────────────────────┐
│ User → DicePoolEditor → dicePool (signal)   │
│ User → OutcomeEditor → outcomes (signal)    │
│ User → ParameterEditor → parameters (signal)│
│ User → PresetSelector → resetToPreset()    │
│                                              │
│ User → «Запустить» → App.runSimulation()    │
│   ├ construct SimJob from signals           │
│   ├ new Worker(sim.worker.ts)               │
│   ├ worker.postMessage({type:'run', job})   │
│   ├ on progress → simProgress signal        │
│   └ on result → simResults signal           │
│                                              │
│ simResults → ResultView (table)             │
│ simResults → DistributionChart (bar)        │
│ simResults → ParameterChart (line)          │
│                                              │
│ User → «Сохранить» → persistence.saveConfig()│
│ App mount → persistence.loadConfig()        │
└─────────────────────────────────────────────┘
```

## 8. Структура файлов

```
dev/dice/
├── index.html                    # Точка входа HTML
├── package.json                  # Зависимости и скрипты
├── tsconfig.json                 # Настройки TypeScript
├── vite.config.ts                # Vite + Preact + Tailwind
├── vitest.config.ts              # Vitest (jsdom, aliases)
├── src/
│   ├── main.tsx                  # Рендер App в #app
│   ├── app.tsx                   # Корневой компонент + Worker
│   ├── style.css                 # @import "tailwindcss"
│   ├── vite-env.d.ts             # CSS module declarations
│   ├── types/
│   │   └── index.ts              # Все доменные типы + compare()
│   ├── domain/
│   │   ├── roller.ts             # rollPool(), rollPoolForSim()
│   │   ├── classify.ts           # evaluateOutcome(), evaluateOutcomeSimple()
│   │   └── presets.ts            # PRESETS[], getPreset(), applyParameter()
│   ├── worker/
│   │   └── sim.worker.ts         # Web Worker: simulateOnce, runSimulation, onmessage
│   ├── state/
│   │   ├── app-state.ts          # Preact Signals (dicePool, outcomes, etc.)
│   │   └── persistence.ts       # localStorage save/load/clear
│   ├── components/
│   │   ├── StepWizard.tsx         # Пошаговый мастер навигации
│   │   ├── DicePoolEditor.tsx    # Редактор пула костей
│   │   ├── OutcomeEditor.tsx     # Редактор исходов
│   │   ├── ParameterEditor.tsx   # Редактор параметров
│   │   ├── ResultView.tsx        # Таблица вероятностей + бар-чарт
│   │   ├── PresetSelector.tsx    # Кнопки пресетов
│   │   └── DistributionChart.tsx  # Chart.js bar + line charts
│   └── utils/
│       └── format.ts             # formatPercent, formatNumber, formatRatio
├── tests/
│   ├── roller.test.ts            # Тесты бросков
│   ├── classify.test.ts          # Тесты классификации
│   ├── presets.test.ts           # Тесты пресетов
│   └── integration.test.ts       # Интеграционные сценарии (D&D, PbtA, Shadowrun)
└── public/
    └── favicon.svg               # Иконка
```

## 9. Известные ограничения и технический долг

1. **Дублирование логики бросков**: `roller.ts` и `sim.worker.ts` содержат независимые реализации броска костей. Worker не может импортировать доменный модуль без бандлинга — это ограничение Web Worker. В будущем можно вынести общую логику в shared-модуль или использовать Vite worker import.

2. **`rollPoolForSimulation` не используется**: в `roller.ts` есть функция для симуляции, но Worker использует свою реализацию. Удалить или унифицировать.

3. **`evaluateOutcomeSimple` не используется**: в `classify.ts` есть неиспользуемая функция. Удалить или задействовать в Worker.

4. **`rollResult.kept` vs `rollResult.sums`**: в `RollResult` поля `kept` и `sums` дублируют данные с разной структурой. Нужна чистка.

5. **Визуальная гистограмма в ResultView**: дублирует функционал `DistributionChart`. Оставить только Chart.js.

6. **Нет отмены Worker при навигации**: при переключении шагов назад Worker продолжает работать. Нужна очистка.

7. **`configLoaded` в App**: флаг инициализации через замыкание вместо `useEffect` — работает, но не идиоматично для Preact.

8. **Нет обработки краевых случаев в UI**: пустой пул, нулевые кости и т. д.