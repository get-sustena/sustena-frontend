# Backend Prompt: Configurable Budget Meal Plans

You are working in:

`/Users/mac/Desktop/cookease/cookease-backend`

Implement backend support for Sustena's redesigned budget meal-plan flow. Read the existing code
and tests before editing, and preserve unrelated uncommitted work.

## Existing Backend

- `POST /api/v1/planner/budget` currently generates only day 1.
- It always attempts breakfast, lunch, and dinner in a fixed order.
- `BudgetPlannerRequest` already supports `budget`, `servingSize`,
  `maxTotalTimeMinutes`, dietary preferences, health conditions, and unknown-cost handling.
- `PlannerMealResponse` already contains `day`, `mealSlot`, `servings`, `recipe`, and
  `estimatedCost`.
- Cost scaling, exact meal-slot matching, dietary filtering, allergen filtering, time filtering,
  partial-plan messages, and randomized affordable selection already have tests in
  `tests/test_frontend_contract.py`.

Do not replace these working behaviors. Generalize them for the new configuration.

## Design Flow

The user opens Plan Setup and completes these steps:

1. Select 1-7 days.
2. Select 1, 2, or 3 meals per day.
3. If one meal is selected, choose exactly one of breakfast, lunch, or dinner.
4. If two meals are selected, choose breakfast + lunch, breakfast + dinner, or lunch + dinner.
5. Three meals automatically means breakfast + lunch + dinner.
6. Show a summary containing days, selected meal slots, and total requested meals.
7. Save the setup.
8. The user enters a daily budget and generates the plan.

The existing quick setup still supplies `servingSize` and `maxTotalTimeMinutes`.

## Budget Request Contract

Extend `BudgetPlannerRequest`:

```json
{
  "budget": 5000,
  "days": 7,
  "mealSlots": ["breakfast", "lunch", "dinner"],
  "mealsPerDay": 3,
  "servingSize": 2,
  "maxTotalTimeMinutes": 45,
  "dietaryPreference": "no_restrictions",
  "healthConditions": ["none"],
  "allowUnknownCost": false,
  "avoidRecipeIds": []
}
```

Rules:

- `budget` is a daily budget, not the entire multi-day budget.
- `days` must be between 1 and 7.
- `mealSlots` must contain 1-3 unique values from breakfast, lunch, and dinner.
- Preserve the supplied slot order in the response.
- `mealsPerDay`, if supplied, must equal `mealSlots.length`.
- Default omitted `days` to 1 and omitted `mealSlots` to all three slots so old clients continue
  working.
- Keep `servingSize` validation between 1 and 25.
- Validate `avoidRecipeIds` as a unique list and exclude those recipes.

Use camelCase externally and snake_case internally, following the existing `CamelModel`.

## Generation Behavior

- Generate the requested slots independently for every requested day.
- Every day's estimated cost must be less than or equal to the daily budget.
- Scale recipe costs using the requested serving size and the existing cost estimator.
- Apply the existing dietary, allergen, maximum-time, publication-status, and unknown-cost filters.
- Match recipes to exact meal-slot tags using the current normalization rules.
- Do not use the same recipe twice on the same day.
- Avoid repeating recipes across the plan while enough candidates exist.
- If all unique candidates have been exhausted, controlled cross-day reuse is allowed.
- Keep randomized selection testable by continuing to use an injectable/patchable random source.
- Do not return recipes whose known scaled cost exceeds the remaining budget for that day.

Generalize the existing backtracking selection rather than using a greedy selection that can miss
a valid combination.

## Partial Plans

The endpoint may return a partial plan when a day cannot afford or match every requested slot.

- Return every meal that can be selected safely.
- Never relabel one slot as another.
- Include a useful message only when `generatedMealCount < requestedMealCount`.
- The message should identify missing days/slots and likely constraints such as budget or maximum
  cooking time without claiming certainty the backend cannot establish.
- For a complete plan, `message` should be `null`.

## Response Contract

Extend the planner response for budget plans:

```json
{
  "meals": [],
  "matches": [],
  "days": 7,
  "mealSlots": ["breakfast", "lunch", "dinner"],
  "requestedMealCount": 21,
  "generatedMealCount": 21,
  "dailyBudget": 5000,
  "totalBudget": 35000,
  "totalEstimatedCost": 28750,
  "message": null
}
```

`totalEstimatedCost` is the sum across the complete multi-day plan. `totalBudget` is
`dailyBudget * days`. Keep each meal's existing `day`, `mealSlot`, `servings`, and
`estimatedCost`.

## Saved Plan Setup

Persist the user's setup server-side so it survives reinstall and multiple devices.

Add authenticated endpoints:

```http
GET /api/v1/me/planner-settings
PUT /api/v1/me/planner-settings
```

Contract:

```json
{
  "days": 1,
  "mealSlots": ["breakfast", "lunch", "dinner"],
  "mealsPerDay": 3
}
```

Use a dedicated user planner-settings model/table or another isolated approach that does not make
existing `PUT /me/preferences` calls reset planner settings. Add an Alembic migration after the
current migration head. Enforce one settings record per user and create defaults lazily.

## Compatibility

- Do not change `/planner/kitchen`.
- Do not silently redirect this flow to `/planner/meal-plan`; the budget endpoint owns budget-aware
  generation.
- Keep existing one-day requests working.
- Keep planner endpoints' current authentication policy unless product requirements explicitly
  change it; only saved user settings require authentication.
- Do not remove existing request or response fields.

## Documentation and Types

Update:

- `docs/api-contract.md`
- `docs/frontend-types.md`
- `docs/frontend-types.ts`

Document daily-budget semantics, exact meal-slot selection, partial plans, saved planner settings,
defaults, and validation errors.

## Tests

Add or update tests proving:

- Legacy `{ "budget": 3000 }` requests still work.
- One selected slot returns only that slot.
- Every valid two-slot combination is respected.
- Seven days and three slots request 21 meals.
- Each day's spend stays within the daily budget.
- Total budget and total estimated cost are calculated correctly.
- Serving-size scaling still works.
- Time, dietary, allergen, unknown-cost, and avoid-list filters still work.
- Recipes do not repeat within a day.
- Cross-day repetition happens only when the candidate pool is exhausted.
- Partial plans report accurate generated/requested counts and a non-null message.
- Complete plans return `message: null`.
- Invalid days, duplicate/unsupported slots, and inconsistent `mealsPerDay` return 422.
- Planner settings are user-scoped, persist updates, and do not get reset by preference updates.

Run:

```bash
pytest
ruff check .
ruff format --check .
```

Do not modify unrelated authentication, shopping-list, recipe-import, or unit-conversion behavior.
