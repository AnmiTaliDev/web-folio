import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['node_modules', 'archive', 'web', '.flutter-sdk'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { 'no-restricted-syntax': ['error', { selector: 'TSEnumDeclaration', message: 'Enums are not erasable syntax.' }] } },
)
