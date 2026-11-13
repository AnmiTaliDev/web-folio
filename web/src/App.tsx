import { Route, Router } from '@solidjs/router'
import type { JSX } from 'solid-js'
import { Shell } from './components/Shell.tsx'
import { Auth } from './screens/Auth.tsx'
import { BookScreen } from './screens/Book.tsx'
import { Catalog } from './screens/Catalog.tsx'
import { Chat } from './screens/Chat.tsx'
import { Home } from './screens/Home.tsx'
import { Onboarding } from './screens/Onboarding.tsx'
import { Profile } from './screens/Profile.tsx'
import { Settings } from './screens/Settings.tsx'
import { Terms } from './screens/Terms.tsx'

export function App(): JSX.Element {
  return (
    <Router root={Shell}>
      <Route path="/" component={Home} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/book/:id" component={BookScreen} />
      <Route path="/catalog/:genre?" component={Catalog} />
      <Route path="/chat" component={Chat} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings/:section?" component={Settings} />
      <Route path="/auth" component={Auth} />
      <Route path="/terms" component={Terms} />
      <Route path="*" component={Home} />
    </Router>
  )
}
