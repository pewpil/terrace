import {
  handleInput,
  handleKeyboardControls,
  handleMouseControls,
  Tui,
} from 'tui';
import { runLanding } from './src/screens/landing.ts';

const tui = new Tui({
  refreshRate: 1000 / 60,
});

tui.dispatch();

handleInput(tui);
handleKeyboardControls(tui);
handleMouseControls(tui);

runLanding(tui, {
  onStart: () => {
    // TODO: launch the typing game once it is built.
  },
});

tui.run();
