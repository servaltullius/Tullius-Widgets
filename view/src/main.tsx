import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { markFontsReadyWhenLoaded } from './utils/fontsReady'
import { AppRoot } from './selftest/AppRoot'
import { installSelfTestBridge } from './selftest/runSelfTest'

markFontsReadyWhenLoaded()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>,
)

installSelfTestBridge()
