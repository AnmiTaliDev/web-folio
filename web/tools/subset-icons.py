import re
import sys
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

SOURCE = 'node_modules/material-symbols/material-symbols-rounded.woff2'
TARGET = 'src/assets/fonts/MaterialSymbolsRounded.woff2'
ICONS = 'src/components/icons.ts'

names = re.findall(r"^  ([a-z0-9_]+):", open(ICONS, encoding='utf-8').read(), re.M)
extra = sys.argv[1:]
names = sorted(set(names + extra))

font = TTFont(SOURCE)
by_glyph = {}
for code, glyph in font.getBestCmap().items():
    by_glyph.setdefault(glyph, []).append(code)

missing = [name for name in names if name not in by_glyph]
if missing:
    raise SystemExit('Unknown icons: ' + ', '.join(missing))

codes = {name: min(by_glyph[name]) for name in names}
instance = instancer.instantiateVariableFont(font, {'GRAD': 0, 'wght': 400, 'opsz': (20, 48)}, inplace=False)
options = subset.Options()
options.layout_features = []
options.glyph_names = False
options.notdef_outline = False
options.name_IDs = [1, 2, 3, 4, 6]
options.flavor = 'woff2'
subsetter = subset.Subsetter(options)
subsetter.populate(unicodes=list(codes.values()))
subsetter.subset(instance)
instance.flavor = 'woff2'
instance.save(TARGET)

lines = ['export const icons = {']
lines += [f"  {name}: '\\u{codes[name]:04x}'," for name in names]
lines += ['} as const', '', 'export type IconName = keyof typeof icons', '']
open(ICONS, 'w', encoding='utf-8').write('\n'.join(lines))
print(f'{len(names)} icons written to {TARGET}')
