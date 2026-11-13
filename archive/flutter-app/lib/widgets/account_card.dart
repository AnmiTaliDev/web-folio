import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../data/providers.dart';
import '../l10n/app_localizations.dart';

class AccountCard extends ConsumerWidget {
  const AccountCard({super.key, required this.username});

  final String username;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;

    return M3ECard(
      key: const Key('account-card'),
      variant: M3ECardVariant.filled,
      color: scheme.surfaceContainer,
      borderRadius: BorderRadius.circular(28),
      padding: const EdgeInsets.all(20),
      width: double.infinity,
      child: Row(
        children: [
          Icon(Symbols.account_circle_rounded, color: scheme.primary, size: 32),
          const SizedBox(width: 12),
          Expanded(
            child: Text(l10n.accountSignedIn(username), key: const Key('account-user'), style: textTheme.bodyLarge),
          ),
          const SizedBox(width: 8),
          M3EButton.outlined(
            key: const Key('account-sign-out'),
            onPressed: () => ref.read(authActionsProvider.notifier).logout(),
            child: Text(l10n.signOut),
          ),
        ],
      ),
    );
  }
}
