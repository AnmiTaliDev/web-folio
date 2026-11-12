import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../data/providers.dart';
import '../l10n/app_localizations.dart';
import '../widgets/change_password_dialog.dart';
import '../widgets/export_dialog.dart';
import '../widgets/grouped_list.dart';
import '../widgets/password_action_dialog.dart';
import '../widgets/private_mode_card.dart';
import '../widgets/recovery_code_dialog.dart';
import '../widgets/two_pane.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  Future<void> _newRecoveryCode(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    String? code;
    final done = await showPasswordActionDialog(
      context,
      title: l10n.newRecoveryCode,
      body: l10n.newRecoveryCodeBody,
      actionLabel: l10n.confirm,
      onSubmit: (password) async => code = await ref.read(authActionsProvider.notifier).newRecoveryCode(password),
    );
    if (done && code != null && context.mounted) {
      await showRecoveryCodeDialog(context, code!);
    }
  }

  Future<void> _deleteAccount(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return showPasswordActionDialog(
      context,
      title: l10n.deleteAccountTitle,
      body: l10n.deleteAccountBody,
      actionLabel: l10n.delete,
      destructive: true,
      onSubmit: (password) => ref.read(authActionsProvider.notifier).deleteAccount(password),
    );
  }

  Future<void> _showData(BuildContext context, WidgetRef ref) async {
    final text = await ref.read(authActionsProvider.notifier).exportData();
    if (context.mounted) {
      await showExportDialog(context, text);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final status = ref.watch(authStatusProvider).value;
    final registered = status?.registered ?? false;
    final profile = ref.watch(profileProvider).value;
    final aiAvailable = ref.watch(aiAvailableProvider).value ?? true;

    final about = [Text(l10n.settingsAbout, style: textTheme.titleLarge), const SizedBox(height: 8), _About(l10n: l10n)];

    if (!registered) {
      return TwoPane(
        leftFlex: 1,
        rightFlex: 1,
        left: [PrivateModeCard(onCreate: () => context.push('/auth?mode=register'), onSignIn: () => context.push('/auth?mode=login'))],
        right: about,
      );
    }

    return TwoPane(
      leftFlex: 1,
      rightFlex: 1,
      left: [
        Text(l10n.settingsAccount, style: textTheme.titleLarge),
        const SizedBox(height: 8),
        GroupedList(
          items: [
            _action('settings-password', Symbols.key_rounded, l10n.changePassword, () async {
              final changed = await showChangePasswordDialog(context);
              if (changed && context.mounted) {
                M3ESnackbar.show(context, message: l10n.passwordChanged);
              }
            }),
            _action('settings-recovery', Symbols.shield_lock_rounded, l10n.newRecoveryCode, () => _newRecoveryCode(context, ref)),
            _action(
              'settings-logout-all',
              Symbols.devices_rounded,
              l10n.signOutEverywhere,
              () => ref.read(authActionsProvider.notifier).logoutEverywhere(),
            ),
            _action('settings-logout', Symbols.logout_rounded, l10n.signOut, () => ref.read(authActionsProvider.notifier).logout()),
          ],
        ),
        const SizedBox(height: 24),
        Text(l10n.settingsPersonalization, style: textTheme.titleLarge),
        const SizedBox(height: 8),
        if (profile != null)
          GroupedList(
            items: [
              M3EListItem(
                key: const Key('switch-likes'),
                headline: l10n.useLikes,
                supportingText: l10n.personalizationHint,
                trailing: M3ESwitch(
                  value: profile.personalizationEnabled,
                  onChanged: (value) => ref.read(profileProvider.notifier).setPersonalization(value),
                ),
                onTap: () => ref.read(profileProvider.notifier).setPersonalization(!profile.personalizationEnabled),
              ),
              M3EListItem(
                key: const Key('switch-ai'),
                headline: l10n.aiDescriptions,
                supportingText: aiAvailable ? l10n.aiDescriptionsHint : l10n.aiOffNote,
                enabled: aiAvailable,
                trailing: M3ESwitch(
                  value: profile.aiDescriptionsEnabled && aiAvailable,
                  onChanged: aiAvailable ? (value) => ref.read(profileProvider.notifier).setAiDescriptions(value) : null,
                ),
                onTap: aiAvailable ? () => ref.read(profileProvider.notifier).setAiDescriptions(!profile.aiDescriptionsEnabled) : null,
              ),
            ],
          ),
      ],
      right: [
        Text(l10n.settingsData, style: textTheme.titleLarge),
        const SizedBox(height: 8),
        GroupedList(items: [_action('settings-export', Symbols.download_rounded, l10n.showMyData, () => _showData(context, ref))]),
        const SizedBox(height: 12),
        M3EButton.icon(
          key: const Key('settings-delete'),
          style: M3EButtonStyle.outlined,
          size: M3EButtonSize.md,
          decoration: M3EButtonDecoration(
            foregroundColor: WidgetStatePropertyAll(scheme.error),
            side: WidgetStatePropertyAll(BorderSide(color: scheme.error)),
          ),
          onPressed: () => _deleteAccount(context, ref),
          icon: const Icon(Symbols.delete_rounded),
          label: Text(l10n.deleteAccount),
        ),
        const SizedBox(height: 24),
        ...about,
      ],
    );
  }
}

M3EListItem _action(String key, IconData icon, String label, VoidCallback onTap) {
  return M3EListItem(key: Key(key), leading: Icon(icon), headline: label, onTap: onTap);
}

class _About extends StatelessWidget {
  const _About({required this.l10n});

  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final items = [
      (Symbols.thumb_up_rounded, l10n.howRatings, l10n.howRatingsBody),
      (Symbols.neurology_rounded, l10n.howNeural, l10n.howNeuralBody),
      (Symbols.chat_rounded, l10n.howLibrarian, l10n.howLibrarianBody),
    ];
    return M3ECard(
      key: const Key('about-card'),
      variant: M3ECardVariant.filled,
      color: scheme.surfaceContainer,
      borderRadius: BorderRadius.circular(28),
      padding: const EdgeInsets.all(20),
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < items.length; i++) ...[
            if (i > 0) const SizedBox(height: 16),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(items[i].$1, color: scheme.primary),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(items[i].$2, style: textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600)),
                      Text(items[i].$3, style: textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant)),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
