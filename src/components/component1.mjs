import Debug from "debug";

import "./component1.scss";

const debug = Debug("component11");

debug("hello");

export default function Component1({ text }) {
  return <div class="component1">{text}</div>;
}
