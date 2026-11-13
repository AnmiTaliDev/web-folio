import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../config.dart';
import '../data/providers.dart';
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

class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.path, required this.child});

  final String path;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final index = _indexFor(path);
    final registered = ref.watch(authStatusProvider).value?.registered ?? false;
    void select(int next) => context.go(_destinations[next].$1);

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= wideLayoutBreakpoint;
        final extended = constraints.maxWidth >= extendedRailBreakpoint;
        final title = switch (index) {
          0 => registered ? l10n.navPicks : l10n.guestCatalogTitle,
          1 => l10n.chatTitle,
          2 => l10n.profileTitle,
          _ => l10n.settingsTitle,
        };
        final subtitle = switch (index) {
          0 when registered => MaterialLocalizations.of(context).formatFullDate(DateTime.now()),
          1 => l10n.chatSubtitle,
          _ => null,
        };
        final body = Column(
          children: [
            M3EAppBar.top(titleText: title, subtitleText: subtitle, variant: M3EAppBarVariant.medium, safeArea: !wide),
            Expanded(
              child: Align(
                alignment: Alignment.topCenter,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: contentMaxWidth),
                  child: child,
                ),
              ),
            ),
          ],
        );
        if (wide) {
          return Scaffold(
            body: Row(
              children: [
                M3ENavigationRail(
                  type: extended ? M3ENavigationRailType.alwaysExpand : M3ENavigationRailType.alwaysCollapse,
                  selectedIndex: index,
                  onDestinationSelected: select,
                  fab: registered && index == 0
                      ? M3ENavigationRailFabSlot(
                          icon: const Icon(Symbols.chat_rounded),
                          label: l10n.askLibrarian,
                          color: M3EFabColor.tertiary,
                          onPressed: () => context.go('/chat'),
                        )
                      : null,
                  leading: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                    child: Text(l10n.appName, style: Theme.of(context).textTheme.titleLarge),
                  ),
                  sections: [
                    M3ENavigationRailSection(
                      destinations: [
                        for (var i = 0; i < _destinations.length; i++)
                          M3ENavigationRailDestination(
                            icon: Icon(_destinations[i].$2),
                            selectedIcon: Icon(_destinations[i].$2, fill: 1),
                            label: _label(l10n, i),
                          ),
                      ],
                    ),
                  ],
                ),
                Expanded(child: body),
              ],
            ),
          );
        }
        return Scaffold(
          floatingActionButton: registered && index == 0
              ? M3EExtendedFab(
                  label: l10n.askLibrarian,
                  icon: const Icon(Symbols.chat_rounded),
                  color: M3EFabColor.tertiary,
                  onPressed: () => context.go('/chat'),
                )
              : null,
          body: body,
          bottomNavigationBar: M3ENavigationBar(
            selectedIndex: index,
            onDestinationSelected: select,
            shapeFamily: M3ENavBarShapeFamily.round,
            destinations: [
              for (var i = 0; i < _destinations.length; i++)
                M3ENavigationBarDestination(
                  icon: Icon(_destinations[i].$2),
                  selectedIcon: Icon(_destinations[i].$2, fill: 1),
                  label: _label(l10n, i),
                ),
            ],
          ),
        );
      },
    );
  }
}
