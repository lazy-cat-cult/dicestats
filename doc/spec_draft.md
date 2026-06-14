# Specification for dice probabilty calculator

## Concept

- One page webapp without server requests
- Programming language is TypeScript
- Interface language is English (no need for localization)
- Framework stack: Vite, Preact, Tailwind, Chart.js
- Desktop and Mobile


A single-page web application for calculating dice roll outcome probabilities in tabletop RPG using the Monte Carlo method (1,000,000 iterations). The user specifies a dice pool, filtering conditions, and iteration parameters, and receives probabilities in the form of tables and charts.

Several steps:
- Gather dice pool
- Setup reroll condition
- Define resolution parameters
- Define outcomes
- Run simulation
- Display outcome probabilities on charts and tables

## Gather dice pool
Form of rows
- <dice_type> <dice_number> <dice_tag>
- min 1, max 99
- add, delete die row
where
- <dice_type> - type of dice to roll
  - values are d4, d6, d8, d10, d12, d20, d100, dX
  - dX - user specified number of dice size
  - default d20
- <dice_number> - number of dice to roll
  - value is integer between 1 and 99
  - default 1
- <dice_tag> - tag of dice
  - default - none

## Setup reroll conditions
Form of rows
- <reroll_action> <<condion> <value>> <repeat> <comment>
- up to 10 <<condion> <value>> pairs connected by AND, OR operators
- example: = 1 AND tag Red
- rows can be moved up and down - order is important
- add, delete or move up-down reroll condition row
where
- <reroll_action> - reroll, explode
  - reroll - is a reroll of matching dice
  - explode - add to roll another dice of same types if condition is right
- <condition> - compare condition
  - values are >, >=, <, <=, =, !=, tag
- <value> - plain number between 0 and 99 or dice_tag selection if "tag" condition is selected
- <repeat> - number for rerolls from 1 to 99
  - default 1
- <comment> - text comment for row

## **Resolve** values
Form of rows (inspired by `let` block in clojure)
- rows can be moved up and down - order is important
- <named_value> = <function> <named_value> <arguments> <comment>
- <named_value> - result of applying function to another named value from rows before
  - default named_value is `rolled dice` - vector of rolled dice values
  - Example (calculate successes (dice over 5) and specifically calculate extra successes (dice equal 6)):
    - A = `filter` `rolled dice` > 5
    - B = `count` A
    - C = `filter` A = 6
    - D = `count` C
- named value is selected from previous named values or default named value
- if previous named values is deleted or moved below row which use this value - that row become invalid and should be highlighted
- Can't run simulation with any invalid rows
- type of named_value is vector or scalar determined by function
  - filter returns vector
  - count return scalar
  - add gets vector or scalar and return scalar

Vector functions
- filter <condition> <value>
  - filter >= 6
  - filter = 1
  - filter tags hunger
- remove
  - remove >= 6
  - remove = 1
  - remove tags hunger
- count <condition> <value>
  - count
  - count >= 6
  - count = 1
  - count tags hunger

Scalar functions
- ceil
- floor
- add
- subtract
- multiply
- divide

## Outcome
Form of rows 
- <named_outcome> when <condition> <and-or> ...
where
- <condition> is a test clause on <named_values>
  - none?
  - any?
  - all?
  - =, <, <=, >, >=, != <value>




# Working materials
DON'T INCLUDE IN FINAL VERSION BUT CAN BE USED AS CLARIFICATION

## 
Roll setup

1. Gather dice pool
   1. die type
      1. common d4, d6, d8, d10, d12, d20, d100
      2. uncommon d2, d3, d5, d14, d16
      3. custom die - enter the side number
      4. variable dX - enter dice array
   2. dice number of each type
      1. fixed - enter number
      2. variable - enter range
   3. dice tag (color) 
      1. use dice tag to differentiate this dice rolls from another
2. Setup variables
3. Set process stages
   1. Discard
      1. X lowest
      2. X highest
      3. Compare to value (>, <, =, !=, <=, >=)
4. Setup outcomes (set name)
   1. Default outcome
   2. Set name
   3. count dice
   4. sum dice
5. Display result for each outcome



**Gather** dice pool of various dice
**Setup** variables
**Reroll** rules for various reroll mechanics
Expanding table of
- <reroll_action> <repeat> <condion> <values> <comment>
- rows can be moved up and down
**Resolve** values - interpret dice values
Expanding table of
- <named_value> = <function> <value> <condition> <comment> 
- rows can be moved up and down
**Outcome** - determine outcomes of dice values
- <outcome_name> = <condition> <named_value>
**Run**

Check resolution params 
- vector / scalar
- reroll / explode once / explode infinite

Resolve functions


Process:

Pre resolution
- reroll
- explode

Pre resulution postfix - once, indefinite

Resolution
const = 


Conditioned outcomes
Exclusive vs non exclusive outcomes
Default outcome
Simultaneous outcomes


**Vampire the Masquerade 5**
- Gather dice pool
  - Xd10 colorless, where X=1..7
  - Yd10 hunger, where Y=0..5
- Process
  - set target number (TN)
  - Roll dice
  - 
- Resolution 
    - A = remove dice < 6  ; count successes
    - B = remove dice < 10 ; count crits
    - C = count B 
    - D = B / 2
    - E = ceil D
    - F = E * 2
    - G = F + A > TN
    - H = filter B tag:hunger
    - I = H count > 1
- Outcomes
  - Bestial success
  - Failure
  - Critical failure
  - Bestial failure

