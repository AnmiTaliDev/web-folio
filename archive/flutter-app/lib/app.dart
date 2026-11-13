import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_ui/material_ui.dart';

import 'l10n/app_localizations.dart';
import 'router.dart';
import 'theme/app_theme.dart';

class FolioApp extends ConsumerWidget {
  const FolioApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'Folio',
      theme: buildFolioTheme(),
      routerConfig: ref.watch(routerProvider),
      builder: (context, child) => M3ETheme(data: M3EThemeData.fromMaterial(Theme.of(context)), child: child ?? const SizedBox.shrink()),
      locale: const Locale('ru'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: [AppLocalizations.delegate, ...GlobalMaterialLocalizations.delegates],
    );
  }
}
