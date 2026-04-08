import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import HtmlPage from './pages/html'
import '@fontsource/public-sans'
import { CssVarsProvider } from '@mui/joy'

const RootComponent = window.location.pathname === '/html' ? HtmlPage : App

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CssVarsProvider>
      <RootComponent />
    </CssVarsProvider>
  </React.StrictMode>,
)
