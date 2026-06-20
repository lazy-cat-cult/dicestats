# UI Specification (delta)

## MODIFIED Requirements

### Requirement: PipelineEditor (clarified — type color scheme)
The PipelineEditor SHALL display an expandable table of named values. Each row: `[name] = [function]([source], [args]) // comment`. Name SHALL be alphanumeric + underscore, unique, max 30 chars. Source dropdown SHALL offer `rolled` or any previously defined named value. Function dropdown SHALL adapt to source type: vector source offers filter, remove, count, sum, max, min; scalar source offers add, subtract, multiply, divide, ceil, floor. For filter/remove, a condition editor SHALL be shown. For binary math, a toggle between "literal" (number input) and "named value" (dropdown of prior scalars) SHALL be provided. Invalid references SHALL be highlighted in red with a tooltip. Type mismatch errors SHALL be highlighted in red. "Add named value" button (max 20 rows). Empty state: "No pipeline steps. Outcomes will reference rolled values directly."

The row container background SHALL be neutral (`bg-gray-50` for valid rows, `border-red-300 bg-red-50` for invalid rows). The full-row SHALL NOT change color based on whether the output type is scalar or vector. The `num` / `vec` badge next to the name SHALL use a single neutral color (`bg-slate-200 text-slate-800`) for both types, so neither type is visually rewarded. The name input border SHALL be neutral for valid rows.

#### Scenario: Scalar row is not visually preferred
- GIVEN a pipeline with one scalar row and one vector row
- WHEN the PipelineEditor renders
- THEN both row containers share the same neutral background
- AND both `num` and `vec` badges use the same slate color
