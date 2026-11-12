import 'package:flutter_riverpod/flutter_riverpod.dart';
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

    return Container(
      key: const Key('account-card'),
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: scheme.surfaceContainer, borderRadius: BorderRadius.circular(28)),
      child: Row(
        children: [
          Icon(Symbols.account_circle_rounded, color: scheme.primary, size: 32),
          const SizedBox(width: 12),
          Expanded(child: Text(l10n.accountSignedIn(username), key: const Key('account-user'), style: textTheme.bodyLarge)),
          const SizedBox(width: 8),
          OutlinedButton(
            key: const Key('account-sign-out'),
            onPressed: () => ref.read(authActionsProvider.notifier).logout(),
            style: OutlinedButton.styleFrom(shape: const StadiumBorder(), minimumSize: const Size(0, 44)),
            child: Text(l10n.signOut),
          ),
        ],
      ),
    );
  }
}
