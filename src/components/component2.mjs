import Debug from "debug";

import "./component2.scss";

const debug = Debug("component2");

debug("hello");

export default function Component2({ text }) {
  return <div class="component2">{text}</div>;
}
