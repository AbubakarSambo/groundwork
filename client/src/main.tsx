import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
/* The design system's two typefaces, served from this app rather than from Google, so opening a page
   does not tell a third party who is reading it. Only the weights the type scale uses. */
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/400-italic.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import '@fontsource/atkinson-hyperlegible/700-italic.css'
import '@fontsource/literata/400.css'
import '@fontsource/literata/500.css'
import './index.css'
import './styles/prototype.css'
import './styles/product.css'
import './styles/design-rules.css'
import './lib/posthog'
import { registerServiceWorker } from './lib/service-worker'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// The offline shell (B-113). Production builds only - see service-worker.ts.
registerServiceWorker()
