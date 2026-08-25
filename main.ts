import {
  Computed,
  handleInput,
  handleKeyboardControls,
  handleMouseControls,
  Signal,
  Tui,
} from "tui";
import { Button, Text } from "tui/components";
import { crayon } from "crayon";

const tui = new Tui({
  style: crayon.bgBlack,
  refreshRate: 1000 / 60,
});

tui.dispatch();

handleInput(tui);
handleKeyboardControls(tui);
handleMouseControls(tui);

const title = new Text({
  parent: tui,
  zIndex: 0,
  text: "Hello, deno_tui!",
  theme: {
    base: crayon.white,
  },
  rectangle: {
    column: 1,
    row: 1,
    width: 20,
  },
});

const count = new Signal(0);

const button = new Button({
  parent: tui,
  zIndex: 0,
  label: {
    text: new Computed(() => `Count: ${count.value}`),
  },
  theme: {
    base: crayon.bgBlue,
    focused: crayon.bgLightBlue,
    active: crayon.bgCyan,
  },
  rectangle: {
    column: 1,
    row: 3,
    width: 14,
    height: 3,
  },
});

button.state.when("active", () => {
  count.value++;
});

tui.run();
