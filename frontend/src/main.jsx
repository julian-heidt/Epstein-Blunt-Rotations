import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
// Self-hosted fonts (SIL OFL 1.1), bundled by Vite into /assets/.
// latin-ext covers the accented letters in some names.
import '@fontsource/syne/latin-400.css'
import '@fontsource/syne/latin-600.css'
import '@fontsource/syne/latin-700.css'
import '@fontsource/syne/latin-800.css'
import '@fontsource/syne/latin-ext-400.css'
import '@fontsource/syne/latin-ext-600.css'
import '@fontsource/syne/latin-ext-700.css'
import '@fontsource/syne/latin-ext-800.css'
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-500.css'
import '@fontsource/dm-sans/latin-400-italic.css'
import '@fontsource/dm-sans/latin-ext-400.css'
import '@fontsource/dm-sans/latin-ext-500.css'
import '@fontsource/dm-sans/latin-ext-400-italic.css'
import './styles/global.css'
import './styles/nav.css'
import './styles/table.css'
import './styles/picker.css'
import './styles/modal.css'
import './styles/leaderboard.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
