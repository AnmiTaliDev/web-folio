import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../l10n/app_localizations.dart';

class PrivateModeCard extends StatelessWidget {
  const PrivateModeCard({super.key, required this.onCreate, required this.onSignIn});

  final VoidCallback onCreate;
  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    return M3ECard(
      key: const Key('private-mode-card'),
      variant: M3ECardVariant.filled,
      color: scheme.surfaceContainer,
      borderRadius: BorderRadius.circular(28),
      padding: const EdgeInsets.all(20),
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Symbols.shield_rounded, color: scheme.primary),
              const SizedBox(width: 8),
              Text(l10n.privateModeTitle, style: textTheme.titleMedium),
            ],
          ),
          const SizedBox(height: 8),
          Text(l10n.privateModeBody, style: textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant)),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              M3EButton.filled(key: const Key('private-create'), onPressed: onCreate, child: Text(l10n.createAccount)),
              M3EButton.outlined(key: const Key('private-sign-in'), onPressed: onSignIn, child: Text(l10n.signIn)),
            ],
          ),
        ],
      ),
    );
  }
}
