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

function render(element, container) {
  const dom =
    element.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type);

  // append all properties, except children, to the current new HTML DOM node
  const isProperty = (key) => key !== "children";
  Object.keys(element.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = element.props[name];
    });

  // append all children to the current new created dom node
  element.props.children.forEach((child) => render(child, dom));

  container.appendChild(dom);
}

const React = {
  createElement,
  render,
};

const element = (
  <div id="foo">
    <a>Hello World!</a>
    <b />
  </div>
);

const container = document.getElementById("root");
React.render(element, container);

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;

  // according to the type is Function component or real DOM
  if (isFunctionComponent) {
    wipFiber = fiber;
    const children = [fiber.type(fiber.props)];
    reconcileChildren(fiber, children.flat());
  } else {
    if (!fiber.dom) fiber.dom = createDom(fiber);
    reconcileChildren(fiber, fiber.props.children.flat());
  }

  // recursively handle the children from bottom, and to the left
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
      nextFiber = nextFiber.parent;
    }
  }
}

function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;

  while (index < element.length || oldFiber != null) {
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
  }
}

// create the dom by JavaScript recursively in the work in progress root
let wipRoot = null;
let nextUnitOfWork = null;

wipRoot = {
  dom: container,
  props: {
    children: [<App />],
  },
};

nextUnitOfWork = wipRoot;
while (nextUnitOfWork) {
  nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
}
// commit the the real DOM
commitWork(wipRoot.child);
