import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../config.dart';
import '../l10n/app_localizations.dart';

const _destinations = [
  ('/', Symbols.auto_stories_rounded),
  ('/chat', Symbols.chat_rounded),
  ('/profile', Symbols.person_rounded),
  ('/settings', Symbols.settings_rounded),
];

String _label(AppLocalizations l10n, int index) => [l10n.navPicks, l10n.navChat, l10n.navProfile, l10n.navSettings][index];

int _indexFor(String path) {
  final found = _destinations.indexWhere((entry) => entry.$1 == path);
  return found < 0 ? 0 : found;
}

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.path, required this.child});

  final String path;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final index = _indexFor(path);
    void select(int next) => context.go(_destinations[next].$1);

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= wideLayoutBreakpoint;
        final extended = constraints.maxWidth >= extendedRailBreakpoint;
        final body = Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: contentMaxWidth), child: child),
        );
        if (wide) {
          return Scaffold(
            body: Row(
              children: [
                NavigationRail(
                  selectedIndex: index,
                  onDestinationSelected: select,
                  extended: extended,
                  minExtendedWidth: 200,
                  labelType: extended ? NavigationRailLabelType.none : NavigationRailLabelType.all,
                  leading: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Text(l10n.appName, style: Theme.of(context).textTheme.titleLarge),
                  ),
                  indicatorColor: Theme.of(context).colorScheme.secondaryContainer,
                  destinations: [
                    for (var i = 0; i < _destinations.length; i++)
                      NavigationRailDestination(
                        icon: Icon(_destinations[i].$2),
                        selectedIcon: Icon(_destinations[i].$2, fill: 1),
                        label: Text(_label(l10n, i)),
                      ),
                  ],
                ),
                Expanded(child: body),
              ],
            ),
          );
        }
        return Scaffold(
          body: SafeArea(bottom: false, child: body),
          bottomNavigationBar: _BottomNav(index: index, onSelected: select, labels: [for (var i = 0; i < _destinations.length; i++) _label(l10n, i)]),
        );
      },
    );
  }
}

class _BottomNav extends StatelessWidget {
  const _BottomNav({required this.index, required this.onSelected, required this.labels});

  final int index;
  final ValueChanged<int> onSelected;
  final List<String> labels;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.surfaceContainer,
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 80,
          child: Row(
            children: [
              for (var i = 0; i < _destinations.length; i++)
                Expanded(
                  child: InkWell(
                    key: Key('nav-$i'),
                    onTap: () => onSelected(i),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          curve: Curves.easeOutBack,
                          width: 56,
                          height: 32,
                          decoration: BoxDecoration(
                            color: i == index ? scheme.secondaryContainer : Colors.transparent,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Icon(_destinations[i].$2, fill: i == index ? 1 : 0, color: scheme.onSurface),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          labels[i],
                          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                fontWeight: i == index ? FontWeight.w700 : FontWeight.w500,
                              ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
