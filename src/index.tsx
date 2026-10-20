// Must stay the first import: inside a SEA executable it extracts the
// embedded OpenTUI assets and sets OTUI_ASSET_ROOT before core evaluates.
import './sea-extract'
import { render } from '@opentui/solid'
import { App } from './app'

const main = async (): Promise<void> => {
  await render(App)
}

main()
