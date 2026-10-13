import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { markFontsReadyWhenLoaded } from './utils/fontsReady'

markFontsReadyWhenLoaded()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
