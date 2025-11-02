function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === "object" ? child : createTextElement(child)
      ),
    },
  };
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

let wipRoot = null;
let nextUnitOfWork = null;
let currentRoot = null;
let wipFiber = null;
let hookIndex = null;
let deletions = [];

// =============================== Render Phase ===============================

// only handle the same level of the current fiber
// <div>          // wipFiber
//   <a />        // index 0 → 成為 child
//   <b />        // index 1 → 成為 a 的 sibling
//   <c />        // index 2 → 成為 b 的 sibling
// </div>

// What reconcileChildren function does:
// 1. Mark operations needed for each child (UPDATE/PLACEMENT/DELETION)
// 2. Link children as siblings, and link parent to the first child (index 0)
function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;

  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;
    const sameType = oldFiber && element && element.type === oldFiber.type;

    // according to the condition of the current element and the old fiber, create the new fiber
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      };
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      wipFiber.child = newFiber;
    } else if (element) {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
}

function createDom(fiber) {
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type);

  updateDom(dom, {}, fiber.props);

  return dom;
}

// What performUnitOfWork function does:
// 1. reconcile the children by different fiber types
// 1-1. the not function fiber will create the dom automatically
// 2. Return the next unit of work from child to sibling, finally to parent
function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;

  // according to the type is Function component or real DOM
  if (isFunctionComponent) {
    wipFiber = fiber;
    wipFiber.hooks = [];
    hookIndex = 0;
    // fiber.type is the function component, like function App({ name }) { return <div>Hello {name}!</div>; }
    // and fiber.props is the props of the function component, like { name: "John" };
    // so we can call the function component with the props, which is App({ name: 'John' })
    const children = [fiber.type(fiber.props)];
    reconcileChildren(fiber, children.flat());
  } else {
    if (!fiber.dom) fiber.dom = createDom(fiber);
    reconcileChildren(fiber, fiber.props.children);
  }

  // recursively handle the children from child, and to the sibling
  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
  return null;
}

// =============================== Commit Phase ===============================

const isEvent = (key) => key.startsWith("on");
const isProperty = (key) => key !== "children" && !isEvent(key);
const isKeyChangedFactory = (prev, next) => (key) => prev[key] !== next[key];
const isKeyGoneFactory = (prev, next) => (key) => !(key in next);

function updateDom(dom, prevProps, nextProps) {
  // Remove old or changed event listeners, have to remove the callback as well.
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((prevEventProp) => {
      const isPrevEventKeyGone = isKeyGoneFactory(
        prevProps,
        nextProps
      )(prevEventProp);
      const isPrevEventKeyChanged = isKeyChangedFactory(
        prevProps,
        nextProps
      )(prevEventProp);
      return isPrevEventKeyGone || isPrevEventKeyChanged;
    })
    .forEach((prevEventProp) => {
      const prevEventName = prevEventProp.toLowerCase().substring(2);
      const prevCventCallback = prevProps[prevEventProp];
      dom.removeEventListener(prevEventName, prevCventCallback);
    });

  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isKeyGoneFactory(prevProps, nextProps))
    .forEach((prevProp) => {
      dom[prevProp] = "";
    });

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isKeyChangedFactory(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = nextProps[name];
    });

  // Add new event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isKeyChangedFactory(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
}

function commitDeletion(fiber, domParent) {
  // if the fiber has a real dom, remove it from the parent
  // otherwise, which might be a function component or fragment,
  // recursively find the real dom and remove it
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, domParent);
  }
}

function commitWork(fiber) {
  if (!fiber) return;

  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;

  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

// create the dom by JavaScript recursively in the work in progress root
function commitRoot() {
  // remove the fibers first, then create/update the fiber dom
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

function createRoot(container) {
  return {
    render(element) {
      deletions = [];

      wipRoot = {
        dom: container,
        props: {
          children: [element],
        },
        alternate: null,
      };

      nextUnitOfWork = wipRoot;
    },
  };
}

function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function useState(initial) {
  const oldHook = wipFiber.alternate?.hooks?.[hookIndex];
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  };

  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action) => {
    hook.state = typeof action === "function" ? action(hook.state) : action;
  });

  const setState = (action) => {
    hook.queue.push(action);
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };

  wipFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState];
}

const React = {
  createElement,
  useState,
};

// Example usage:
function App() {
  return (
    <div>
      <Counter />
      <ul>
        <li>item 1</li>
        <li>item 2</li>
        <li>item 3</li>
      </ul>
    </div>
  );
}

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <h2>
      <p>Count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>+ 1</button>
    </h2>
  );
}
const rootContainer = document.getElementById("root");
createRoot(rootContainer).render(<App />);
