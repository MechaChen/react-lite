# react-lite

## React Life Cycle Process

### Initial render

Render phase

1. `createRoot().render()` assigns the WorkInProgress Root (`wipRoot`) and sets `nextUnitOfWork = wipRoot`
2. `workLoop` processes fibers in idle time using `requestIdleCallback` (typo fix: was `requestIdelCallback`)
3. Each **fiber** is processed by `performUnitOfWork`, which:
   1. If it's a Function Component:
      1. Set `wipFiber = fiber`, initialize `wipFiber.hooks = []` and `hookIndex = 0`
      2. Execute the function component (`fiber.type(fiber.props)`) to get children
      3. All `useState` calls inside the component are executed, storing hooks to `wipFiber.hooks`
   2. If it's a DOM element:
      1. Create the DOM node if not exists
   3. Call `reconcileChildren(wipFiber, elements)` to:
      1. Get the original fiber from `wipFiber.alternate.child`
      2. Compare new elements with old fibers
      3. Mark fibers with `effectTag`: `UPDATE`, `PLACEMENT`, or `DELETION`
         1. `UPDATE`: same type, reuse old fiber's DOM, update props
         2. `PLACEMENT`: new element, create new DOM
         3. `DELETION`: old fiber no longer needed, push to `deletions` queue
      4. Link parent-child and sibling relationships (parent → first child, children as siblings)

Commit phase

1. When all unit works are done (`nextUnitOfWork === null`), `commitRoot()` is called:
   1. First, `commitWork()` for all deletions (removes old DOMs)
   2. Then, `commitWork(wipRoot.child)` recursively processes all fibers:
      1. `DELETION`: remove the fiber's DOM from parent
      2. `PLACEMENT`: append the fiber's DOM to parent
      3. `UPDATE`: use the original fiber's DOM, update props and event listeners via `updateDom()`
   3. Set `currentRoot = wipRoot` (save the committed root)
   4. Reset `wipRoot = null`

### `setState` re-render

1. `setState` re-assigns the current root as WorkInProgress Root (`wipRoot`) and sets `nextUnitOfWork = wipRoot` again

...following are the same as Initial render phase

<br />
<br />

## Implementation by phase

### Phase 1: Simple recursive render

- Render the entire component tree recursively at once
- Directly create and append DOM nodes
- No diff mechanism, no optimization

### Phase 2: Split render into units + Reconcile + Commit

- Split each DOM's render process **unit by unit** (element by element):
  - **Reconcile phase**: According to changes, mark each fiber's next action (`effectTag`)
    - Compare new elements with old fibers
    - Mark as `UPDATE`, `PLACEMENT`, or `DELETION`
  - **Commit phase**: Execute the action by each fiber (`commitWork`)
    - Apply changes to the real DOM based on `effectTag`

### Phase 3: Work Loop with idle time scheduling

- Create the **Work Loop** (`workLoop` function) and only `performUnitOfWork` in idle time using `requestIdleCallback`

### Phase 4: Add `useState` and hooks

- Add `useState` hook implementation
  - Store hooks in each Functional component's fiber (`wipFiber.hooks`)
  - Execute all pending actions from the previous render (from `oldHook.queue`) to update the state
  - Provide the `setState` function to queue updates and trigger the next render loop

<br />
<br />

## Reference:

- [🎦 BEGINNERS GUIDE to Building React in 30 minutes](https://www.youtube.com/watch?v=fKlt5GFQnVc)
- [🎦 I built my own React in 10 minutes](https://www.youtube.com/watch?v=GBe5VwmgA4Q)
- [📄 Build your own React](https://pomb.us/build-your-own-react/)
