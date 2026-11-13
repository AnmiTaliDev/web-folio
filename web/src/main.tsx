import { render } from 'solid-js/web'
import { App } from './App.tsx'
import './material.ts'
import './styles.css'
import { applyAppearance } from './state/appearance.ts'

applyAppearance(document.documentElement)

const root = document.getElementById('root')
if (root) {
  render(() => <App />, root)
}
