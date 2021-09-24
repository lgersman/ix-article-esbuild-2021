import element from "@wordpress/element";
import domReady from "@wordpress/dom-ready";
import components from "@wordpress/components";
import { Icon, download } from "@wordpress/icons";

import Debug from "debug";

import "./example.scss";

import Component1 from "./components/component1.mjs";
import Component2 from "./components/component2.mjs";

// enable debug messages in js console
Debug.enable("*");
const mydebug = Debug("mydebug");

function MyButton({ label }) {
  mydebug("environment : %s", process.env.NODE_ENV);

  return (
    <components.Button isPrimary>
      <Icon icon={download}></Icon>
      {label}
    </components.Button>
  );
}

domReady(() => {
  element.render(
    <div>
      <MyButton label="hello world" />
      <Component1 text="c1" />
      <Component1 text="c2" />
    </div>,
    document.getElementById("editor"),
  );
});
