import { BrowserRouter } from 'react-router-dom'
import { CipherScreen } from '../components/common/CipherScreen.jsx'
import { ErrorBoundary } from '../components/common/ErrorBoundary.jsx'
import AppProviders from './providers.jsx'
import AppRouter from './router.jsx'
import { SharpProvider } from '../features/companion/components/SharpProvider.jsx'
import { SharpDock } from '../features/companion/components/SharpDock.jsx'
import '../styles/Refinement.css'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProviders>
        <ErrorBoundary>
          <CipherScreen>
            <SharpProvider>
              <AppRouter />
              <SharpDock />
            </SharpProvider>
          </CipherScreen>
        </ErrorBoundary>
      </AppProviders>
    </BrowserRouter>
  )
}
