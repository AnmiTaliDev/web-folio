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
    return Container(
      key: const Key('private-mode-card'),
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: scheme.surfaceContainer, borderRadius: BorderRadius.circular(28)),
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
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton(key: const Key('private-create'), onPressed: onCreate, child: Text(l10n.createAccount)),
              OutlinedButton(
                key: const Key('private-sign-in'),
                onPressed: onSignIn,
                style: OutlinedButton.styleFrom(shape: const StadiumBorder(), minimumSize: const Size(0, 48)),
                child: Text(l10n.signIn),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
