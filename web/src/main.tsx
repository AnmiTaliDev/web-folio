import { render } from 'solid-js/web'
import { App } from './App.tsx'
import './material.ts'
import './styles.css'
import { installScheme } from './theme/scheme.ts'

installScheme(document.documentElement, window.matchMedia('(prefers-color-scheme: dark)'))

const root = document.getElementById('root')
if (root) {
  render(() => <App />, root)
}
