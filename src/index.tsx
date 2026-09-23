import { render } from '@opentui/solid'
import { App } from './app'

const main = async (): Promise<void> => {
  await render(App)
}

main()
