import components from "@wordpress/components";
import domReady from "@wordpress/dom-ready";
import element from "@wordpress/element";
import Debug from "debug";

import "./example.scss";

// enable debug messages in js console
Debug.enable("*");
const mydebug = Debug("mydebug");

function MyButton({ label }) {
  mydebug("environment : %s", process.env.NODE_ENV);

  return <components.Button>{label}</components.Button>;
}

domReady(() => {
  element.render(
    <MyButton label="hello world" />,
    document.getElementById("myapp"),
  );
});
