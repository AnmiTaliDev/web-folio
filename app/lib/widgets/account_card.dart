import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/providers.dart';
import '../l10n/app_localizations.dart';
import 'change_password_dialog.dart';

class AccountCard extends ConsumerWidget {
  const AccountCard({super.key, required this.status, required this.onCreate, required this.onSignIn});

  final AuthStatus status;
  final VoidCallback onCreate;
  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;

    return Container(
      key: const Key('account-card'),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: scheme.surfaceContainer, borderRadius: BorderRadius.circular(28)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Symbols.account_circle_rounded, color: scheme.primary),
              const SizedBox(width: 8),
              Text(l10n.accountTitle, style: textTheme.titleMedium),
            ],
          ),
          const SizedBox(height: 8),
          if (!status.registered) ...[
            Text(l10n.accountGuest, key: const Key('account-guest'), style: textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton(key: const Key('account-create'), onPressed: onCreate, child: Text(l10n.createAccount)),
                OutlinedButton(
                  key: const Key('account-sign-in'),
                  onPressed: onSignIn,
                  style: OutlinedButton.styleFrom(shape: const StadiumBorder(), minimumSize: const Size(0, 48)),
                  child: Text(l10n.signIn),
                ),
              ],
            ),
          ] else ...[
            Text(l10n.accountSignedIn(status.username ?? ''), key: const Key('account-user'), style: textTheme.bodyLarge),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton(
                  key: const Key('account-change-password'),
                  onPressed: () async {
                    final changed = await showChangePasswordDialog(context);
                    if (changed && context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.passwordChanged)));
                    }
                  },
                  style: OutlinedButton.styleFrom(shape: const StadiumBorder(), minimumSize: const Size(0, 48)),
                  child: Text(l10n.changePassword),
                ),
                FilledButton(
                  key: const Key('account-sign-out'),
                  onPressed: () => ref.read(authActionsProvider.notifier).logout(),
                  child: Text(l10n.signOut),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
