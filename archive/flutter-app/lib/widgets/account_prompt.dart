import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../data/providers.dart';
import '../l10n/app_localizations.dart';

class AccountPrompt extends ConsumerWidget {
  const AccountPrompt({super.key, required this.onCreate, required this.onSignIn});

  final VoidCallback onCreate;
  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (ref.watch(promptDismissedProvider)) {
      return const SizedBox.shrink();
    }
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: M3ECard(
        key: const Key('account-prompt'),
        variant: M3ECardVariant.filled,
        color: scheme.secondaryContainer,
        borderRadius: BorderRadius.circular(24),
        padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
        width: double.infinity,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Icon(Symbols.account_circle_rounded, color: scheme.onSecondaryContainer),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l10n.promptText, style: textTheme.bodyMedium?.copyWith(color: scheme.onSecondaryContainer)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: [
                      M3EButton.tonal(
                        key: const Key('prompt-create'),
                        size: M3EButtonSize.xs,
                        onPressed: onCreate,
                        child: Text(l10n.createAccount),
                      ),
                      M3EButton.text(
                        key: const Key('prompt-sign-in'),
                        size: M3EButtonSize.xs,
                        onPressed: onSignIn,
                        child: Text(l10n.signIn),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            M3EIconButton(
              key: const Key('prompt-dismiss'),
              variant: M3EIconButtonVariant.standard,
              tooltip: l10n.promptDismiss,
              onPressed: () => ref.read(promptDismissedProvider.notifier).dismiss(),
              icon: Icon(Symbols.close_rounded, color: scheme.onSecondaryContainer),
            ),
          ],
        ),
      ),
    );
  }
}
