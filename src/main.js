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
