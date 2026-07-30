# Backend Implementation Handoff: Complete Recipe Instruction Quantity Scaling

You are working in:

`/Users/mac/Desktop/cookease/cookease-backend`

Complete the backend rollout for scalable ingredient quantities inside recipe instructions. Read
the existing implementation, generated Sustena catalog, migration chain, import scripts, tests,
and uncommitted changes before editing. Preserve unrelated work.

This is not a request to redesign the response contract. The structured-segment approach already
implemented in the backend is the correct foundation. The remaining work is to make it complete,
repeatable, tested, committed, and deployable for the full recipe catalog.

## Product Requirement

When a recipe's serving size changes, every ingredient quantity mentioned in its cooking
instructions must scale by the same serving ratio.

For example, if a recipe has four base servings:

- `500ml water` becomes `125ml water` at one serving.
- `2 seasoning cubes` becomes `0.5 seasoning cube` at one serving.
- Cooking times such as `cook for 20 minutes` must not change.
- Temperatures such as `180°C` must not change.
- Step numbers, batch counts, pan sizes, appliance settings, dates, and other non-ingredient
  numbers must not change.

The backend returns quantities for the recipe's base serving size. Scaling and compatible unit
conversion remain frontend responsibilities.

## Current Backend State

The backend already contains the following local implementation:

- `RecipeInstruction.segments_json`.
- Structured text and quantity response schemas.
- Instruction-segment validation and decimal normalization.
- Ingredient-position validation during recipe import.
- Resolution from stored `ingredientPosition` to the API's `recipeIngredientId`.
- A Sustena extraction path that accepts explicit instruction annotations.
- An unresolved-candidate audit script.
- Focused import, extraction, validation, and serialization tests.

The local backend test suite currently passes, but catalog coverage is incomplete.

Audited seed coverage on 30 July 2026:

| Metric | Current value |
|---|---:|
| Recipes | 114 |
| Instructions | 469 |
| Recipes with structured segments | 1 |
| Instructions with structured segments | 2 |
| Quantity segments | 3 |
| Unresolved candidates detected by the current audit | 438 |
| Recipes containing those unresolved candidates | 78 |

Only `Nigerian Fried Rice with Chicken` is currently annotated. The three annotations are `half`
onion, `one` seasoning cube, and `500ml` water.

The current migration only adds `segments_json` with an empty-array default. It does not backfill
existing recipe instructions. The current `Procfile` starts the API and does not run Alembic or
re-import the catalog.

The instruction-segment service, migration, annotations, extractor, audit script, handoff, and
tests are also currently untracked or otherwise absent from the committed Git history. Confirm
the working tree before making changes and ensure the completed feature is committed.

## Definition Of Done

The work is complete only when:

1. Every scalable ingredient quantity in every published recipe instruction is represented by a
   valid quantity segment.
2. Every number that is not an ingredient quantity remains ordinary text.
3. Every quantity segment links to the correct recipe ingredient.
4. Segment fallback text reconstructs the original instruction exactly.
5. Every `baseQuantity` represents the amount stated by the instruction at `baseServings`.
6. Every segment unit is valid and compatible with its linked ingredient.
7. Any candidate that cannot safely be modeled is placed in an explicit reviewed-exception file
   with a reason. Silent omissions are not acceptable.
8. The catalog audit reports zero unreviewed candidates.
9. Existing production recipe rows are populated through a documented, idempotent deployment or
   backfill procedure.
10. The implementation, migrations, generated data, documentation, and tests are committed and
    pushed to the deployment branch.

## Preserve The API Contract

Recipe detail endpoints must continue returning:

```json
{
  "stepNumber": 2,
  "text": "Add 500ml of the measured water and cook for 20–25 minutes.",
  "type": "general",
  "segments": [
    {
      "type": "text",
      "text": "Add "
    },
    {
      "type": "quantity",
      "text": "500ml",
      "recipeIngredientId": "ingredient-row-uuid",
      "ingredientPosition": 16,
      "baseQuantity": "500",
      "unit": "mL",
      "scalesWithServings": true
    },
    {
      "type": "text",
      "text": " of the measured water and cook for 20–25 minutes."
    }
  ]
}
```

Requirements:

- Continue returning `segments: []` when an instruction genuinely has no scalable quantity.
- Continue using camelCase in API responses.
- Continue representing `baseQuantity` as a normalized decimal string.
- Keep `recipeIngredientId` resolved from the persisted ingredient position.
- Do not make recipe list responses carry instruction segments.
- Do not perform serving-size scaling on the backend.
- Do not send pre-scaled instruction strings for a requested serving count.
- Do not replace numbers in arbitrary instruction text at request time.

If full-catalog review identifies a real ingredient quantity that cannot be represented by the
current contract, extend the contract deliberately and coordinate the change with the frontend.
Do not silently force an inaccurate value into the existing shape.

## Catalog Annotation Work

### 1. Build A Complete Candidate Inventory

Expand `find_instruction_quantity_candidates` so the audit recognizes the quantity formats that
actually occur in the Sustena catalog, including where present:

- Integers and decimals.
- Joined and spaced units: `500ml`, `500 ml`.
- Unicode and ASCII fractions: `½`, `1/2`, `1 1/2`.
- Written fractions and counts: `half`, `one-third`, `one`, `two`.
- Metric units and common aliases.
- Imperial units and common aliases.
- Nigerian units present in the unit catalog.
- Ingredient counts such as onions, eggs, cubes, cloves, bunches, and pieces.
- Ingredient quantity ranges, where the range genuinely describes an ingredient amount.

Detection must continue excluding:

- Minutes and hours.
- Temperatures.
- Step numbers.
- Pan dimensions.
- Appliance settings.
- Batch counts.
- Repetition counts that do not represent an ingredient amount.
- Numeric descriptors that are not serving-scalable ingredients.

Candidate detection is an audit and authoring tool, not the runtime renderer. Prefer false
positives that receive human review over silent false negatives, but never automatically publish
an uncertain annotation.

### 2. Resolve Candidates To Recipe Ingredients

For every candidate:

- Identify the exact recipe ingredient position it refers to.
- Confirm the instruction meaning agrees with the ingredient row.
- Store the amount represented in the instruction at the recipe's base serving count.
- Use a unit ID from the backend unit catalog.
- Confirm the unit is compatible with the ingredient's conversion context.
- Preserve the exact source substring in the segment's `text`.

Do not infer solely by nearest-word distance. Ingredient aliases, canonical names, local names,
plural forms, preparation names, and references such as `the remaining onion` should be
considered. Ambiguous matches require human review.

Examples:

- `500ml water` should link to the water ingredient used in that step, not merely the first water
  row if the recipe contains multiple water entries.
- `one seasoning cube` should link to the seasoning-cube ingredient and use a count-compatible
  unit.
- `half of the onion` must model the quantity actually represented by “half” at base servings.
  Confirm whether the recipe ingredient is count-based or mass-based before choosing `item` or
  `g`.
- `add the remaining oil` should only become a quantity segment if the remaining amount can be
  determined reliably from structured recipe data. Otherwise record a reviewed exception.

### 3. Use Deterministic Generation Plus Reviewed Overrides

Do not manually edit `recipes_seed_ready.json` as the source of truth.

Use a repeatable pipeline:

1. Read the recipe workbook/source data.
2. Detect candidate quantities.
3. Apply deterministic high-confidence mappings where safe.
4. Apply an explicit reviewed annotation/override file for ambiguous cases.
5. Produce the seed-ready catalog.
6. Validate every generated segment.
7. Produce a coverage and exception report.

The generated seed should remain reproducible from committed inputs. Running the extractor twice
with the same inputs must produce equivalent instruction segments.

The existing `instruction_quantity_annotations.json` can remain the reviewed source of truth, or
it can be replaced with a clearer versioned format. If its format changes, update the extractor,
tests, and documentation together.

### 4. Track Reviewed Exceptions

Add a committed exception file, for example:

`data/imports/sustena/instruction_quantity_exceptions.json`

Each entry should include:

```json
{
  "recipeId": "sustena_example",
  "stepNumber": 3,
  "text": "the remaining stock",
  "reasonCode": "AMOUNT_NOT_DETERMINABLE",
  "reason": "The source does not state how much stock remains after the earlier step.",
  "reviewed": true
}
```

Use stable reason codes such as:

- `NOT_AN_INGREDIENT_QUANTITY`
- `AMOUNT_NOT_DETERMINABLE`
- `AMBIGUOUS_INGREDIENT_REFERENCE`
- `UNSUPPORTED_RANGE`
- `SOURCE_DATA_ERROR`
- `NON_SCALING_QUANTITY`

Exceptions must be specific to recipe, step, and source span. A broad recipe-level suppression is
not sufficient.

## Validation Requirements

Keep the existing validation and add catalog-wide checks:

- Every non-empty segment list reconstructs `instruction.text` exactly.
- Quantity segments do not overlap.
- `ingredientPosition` exists in the same recipe.
- Resolved `recipeIngredientId` is non-null for published annotations.
- `baseQuantity` is finite and greater than zero.
- `baseServings` exists and is greater than zero for recipes with scalable segments.
- `unit` exists in the unit catalog.
- Unit context is compatible with the linked ingredient.
- Quantity segments set `scalesWithServings: true`.
- Text segments are non-empty.
- There are no unreviewed audit candidates.
- Exception entries still point to an existing recipe, instruction, and exact source text.
- Stale annotations and stale exceptions fail the extraction or CI check.
- Generated segments never classify time or temperature values as ingredient quantities.

Make the catalog coverage audit exit non-zero when:

- An unreviewed candidate remains.
- An annotation is invalid or stale.
- An exception is invalid or stale.
- A published recipe loses previously reviewed segment coverage unexpectedly.

The audit should print a concise summary suitable for CI:

```text
Recipes: 114
Instructions: 469
Quantity segments: <count>
Reviewed exceptions: <count>
Unreviewed candidates: 0
```

## Migration And Backfill

The schema migration and data backfill are separate concerns.

1. Keep or correct the Alembic migration that adds `recipe_instructions.segments_json`.
2. Confirm the migration has the correct previous revision and that `alembic heads` returns one
   expected head.
3. Apply the migration before importing annotated recipes.
4. Import units before recipes so every segment unit can be validated.
5. Re-import/upsert the complete generated recipe catalog after migration.
6. Ensure re-importing is idempotent.
7. Do not leave existing production instructions at the migration's default empty array.
8. Back up the production database before replacing recipe child rows.
9. Document whether recipe ingredient/instruction UUIDs change during re-import and confirm that
   this does not break saved shopping data, favorites, caches, or other references.

Do not rely on application startup to perform a long, destructive catalog import. Prefer an
explicit release/deployment command or documented one-off job with clear success and rollback
steps.

Suggested production order:

```bash
alembic upgrade head
python -m app.scripts.import_units --path data/imports/sustena/units_seed.json
python -m app.scripts.import_recipes --path data/imports/sustena/recipes_seed_ready.json --dry-run
python -m app.scripts.import_recipes --path data/imports/sustena/recipes_seed_ready.json
python -m app.scripts.audit_instruction_quantities
```

Adjust command flags to the final CLI contracts. The final handoff must provide the exact commands
that were actually tested.

## Tests

Keep the existing focused tests and add:

### Unit tests

- Decimal normalization and invalid decimal rejection.
- Segment reconstruction.
- Ingredient-position validation.
- Unit existence and compatibility validation.
- Candidate detection for every quantity format found in the catalog.
- Explicit rejection or exclusion of time, temperature, pan size, and batch-count examples.
- Written fractions and count quantities.
- Unicode and ASCII fractions.
- Joined and spaced units.
- Stale annotation and stale exception detection.

### Catalog tests

- Every published recipe is audited.
- Every detected candidate is either annotated or a reviewed exception.
- The number of unreviewed candidates is exactly zero.
- Every annotated recipe can be imported.
- Every quantity segment resolves to a real recipe ingredient ID.
- Every generated segment list reconstructs its instruction text.
- The known `Nigerian Fried Rice with Chicken` cases remain covered.
- At least one representative recipe from each detected unit/quantity family is covered.

Do not assert only a hard-coded total without validating content. A count can remain unchanged
while the wrong instructions are annotated.

### API integration tests

For both:

- `GET /api/v1/recipes/{recipeId}`
- `GET /api/v1/recipes/slug/{slug}`

Verify:

- Annotated instructions return camelCase structured segments.
- `recipeIngredientId` belongs to the same response's ingredients.
- Unannotated instructions return `segments: []`.
- Base quantities have no unnecessary trailing zeroes.
- Cooking time and temperature text remains in text segments.
- A recipe refresh exposes newly imported annotations.

### Import and migration tests

- Migration from the previous schema succeeds.
- Import after migration populates segments.
- Re-running the import is idempotent.
- Dry-run validates without committing.
- Invalid annotations roll back cleanly.
- Existing recipe rows with empty arrays become annotated after the catalog import.

Run:

```bash
pytest -q
ruff check .
ruff format --check .
alembic heads
alembic upgrade head
python -m app.scripts.audit_instruction_quantities
```

## Documentation And Generated Types

Update and commit:

- `docs/api-contract.md`
- `docs/frontend-types.md`
- `docs/frontend-types.ts`
- `docs/instruction-quantity-frontend-handoff.md`

The frontend handoff must no longer say that only one recipe is annotated or that most
instructions return empty segments once the full catalog rollout is complete.

Document:

- The final response contract.
- Base-serving semantics.
- How annotations are generated and reviewed.
- Exception handling.
- Audit and CI commands.
- Migration and production import commands.
- Final catalog coverage statistics.

## Production Smoke Test

After deployment:

1. Call recipe detail by ID for at least five recipes with different quantity/unit forms.
2. Call the same recipes by slug.
3. Confirm non-empty segments are present in the live responses.
4. Confirm every returned `recipeIngredientId` appears in the recipe's ingredient list.
5. Confirm the original segment text reconstructs the original instruction.
6. Confirm time and temperature values remain text.
7. Confirm a recipe without instruction quantities legitimately returns empty segments.
8. Run a database coverage query and compare it with the committed generated-catalog report.

Do not declare the rollout complete based only on local seed JSON or passing unit tests. Verify the
deployed API and production database.

## Required Completion Report

Return a concise handoff containing:

- Commit SHA containing the implementation and generated data.
- Deployed migration revision.
- Exact production import commands run.
- Total recipes and instructions audited.
- Total quantity segments created.
- Total reviewed exceptions grouped by reason.
- Unreviewed candidate count, which must be zero.
- Test, lint, migration, and audit results.
- Production recipe IDs/slugs smoke-tested.
- Any known limitations requiring a future frontend contract change.

Do not modify unrelated auth, planner, shopping-list, favorites, or unit-system behavior while
completing this work.
