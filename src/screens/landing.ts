import { Tui } from "tui";
import { Text } from "tui/components";
import { crayon } from "crayon";

interface KeyPressEvent {
  key: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
}

interface LandingOptions {
  onStart: () => void;
}

export interface LandingHandle {
  destroy(): void;
}

const ART = await Deno.readTextFile(
  new URL("../assets/art.txt", import.meta.url),
);
const ART_ROWS = ART.replace(/\n+$/, "").split("\n");

function isPlain(key: string, event: KeyPressEvent): boolean {
  return (
    event.key.toLowerCase() === key &&
    !event.ctrl &&
    !event.meta &&
    !event.shift
  );
}

export function runLanding(tui: Tui, options: LandingOptions): LandingHandle {
  const size = tui.rectangle.value;
  const width = size.width;
  const height = size.height;

  const artWidth = Math.max(...ART_ROWS.map((row) => row.length));
  const totalLines = ART_ROWS.length + 2 + 1;
  const startCol = Math.max(0, Math.floor((width - artWidth) / 2));
  const startRow = Math.max(0, Math.floor((height - totalLines) / 2));

  const components: Text[] = [];

  ART_ROWS.forEach((line, i) => {
    components.push(
      new Text({
        parent: tui,
        zIndex: 0,
        text: line,
        theme: { base: crayon.cyan.bold },
        rectangle: {
          column: startCol,
          row: startRow + i,
          width: artWidth,
        },
      }),
    );
  });

  const hint = "[q] quit    [s] start";
  const hintCol = Math.max(0, Math.floor((width - hint.length) / 2));
  const hintRow = startRow + ART_ROWS.length + 1;

  const hintText = new Text({
    parent: tui,
    zIndex: 0,
    text: hint,
    theme: { base: crayon.white },
    rectangle: {
      column: hintCol,
      row: hintRow,
      width: hint.length,
    },
  });
  components.push(hintText);

  const statusRow = hintRow + 1;
  const statusText = new Text({
    parent: tui,
    zIndex: 0,
    text: "",
    theme: { base: crayon.yellow },
    rectangle: {
      column: startCol,
      row: statusRow,
      width: artWidth,
    },
  });
  components.push(statusText);

  const handleKey = (event: KeyPressEvent) => {
    if (isPlain("q", event)) {
      tui.emit("destroy");
      return;
    }
    if (isPlain("s", event)) {
      statusText.text.value = "Starting... (game coming soon)";
      options.onStart();
    }
  };

  const offKey = tui.on("keyPress", handleKey);

  return {
    destroy() {
      offKey();
      components.forEach((component) => component.destroy());
    },
  };
}
