import { BrowserRouter } from 'react-router-dom'
import { CipherScreen } from '../components/common/CipherScreen.jsx'
import { ErrorBoundary } from '../components/common/ErrorBoundary.jsx'
import AppProviders from './providers.jsx'
import AppRouter from './router.jsx'

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary>
          <CipherScreen>
            <AppRouter />
          </CipherScreen>
        </ErrorBoundary>
      </BrowserRouter>
    </AppProviders>
  )
}
