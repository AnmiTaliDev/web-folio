import 'package:flutter_riverpod/flutter_riverpod.dart';
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

    final about = [
      Text(l10n.settingsAbout, style: textTheme.titleLarge),
      const SizedBox(height: 8),
      _About(l10n: l10n),
    ];

    if (!registered) {
      return TwoPane(
        leftFlex: 1,
        rightFlex: 1,
        left: [
          Text(l10n.settingsTitle, style: textTheme.headlineMedium),
          const SizedBox(height: 16),
          PrivateModeCard(onCreate: () => context.push('/auth?mode=register'), onSignIn: () => context.push('/auth?mode=login')),
        ],
        right: about,
      );
    }

    return TwoPane(
      leftFlex: 1,
      rightFlex: 1,
      left: [
        Text(l10n.settingsTitle, style: textTheme.headlineMedium),
        const SizedBox(height: 16),
        Text(l10n.settingsAccount, style: textTheme.titleLarge),
        const SizedBox(height: 8),
        _ActionRow(
          index: 0,
          length: 4,
          rowKey: 'settings-password',
          icon: Symbols.key_rounded,
          label: l10n.changePassword,
          onTap: () async {
            final changed = await showChangePasswordDialog(context);
            if (changed && context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.passwordChanged)));
            }
          },
        ),
        _ActionRow(index: 1, length: 4, rowKey: 'settings-recovery', icon: Symbols.shield_lock_rounded, label: l10n.newRecoveryCode, onTap: () => _newRecoveryCode(context, ref)),
        _ActionRow(
          index: 2,
          length: 4,
          rowKey: 'settings-logout-all',
          icon: Symbols.devices_rounded,
          label: l10n.signOutEverywhere,
          onTap: () => ref.read(authActionsProvider.notifier).logoutEverywhere(),
        ),
        _ActionRow(index: 3, length: 4, rowKey: 'settings-logout', icon: Symbols.logout_rounded, label: l10n.signOut, onTap: () => ref.read(authActionsProvider.notifier).logout()),
        const SizedBox(height: 24),
        Text(l10n.settingsPersonalization, style: textTheme.titleLarge),
        const SizedBox(height: 8),
        if (profile != null) ...[
          GroupedItem(
            index: 0,
            length: 2,
            child: SwitchListTile(
              key: const Key('switch-likes'),
              contentPadding: EdgeInsets.zero,
              title: Text(l10n.useLikes),
              subtitle: Text(l10n.personalizationHint),
              value: profile.personalizationEnabled,
              onChanged: (value) => ref.read(profileProvider.notifier).setPersonalization(value),
            ),
          ),
          GroupedItem(
            index: 1,
            length: 2,
            child: SwitchListTile(
              key: const Key('switch-ai'),
              contentPadding: EdgeInsets.zero,
              title: Text(l10n.aiDescriptions),
              subtitle: aiAvailable ? Text(l10n.aiDescriptionsHint) : Text(l10n.aiOffNote, key: const Key('ai-off-note')),
              value: profile.aiDescriptionsEnabled && aiAvailable,
              onChanged: aiAvailable ? (value) => ref.read(profileProvider.notifier).setAiDescriptions(value) : null,
            ),
          ),
        ],
      ],
      right: [
        Text(l10n.settingsData, style: textTheme.titleLarge),
        const SizedBox(height: 8),
        _ActionRow(index: 0, length: 2, rowKey: 'settings-export', icon: Symbols.download_rounded, label: l10n.showMyData, onTap: () => _showData(context, ref)),
        _ActionRow(
          index: 1,
          length: 2,
          rowKey: 'settings-delete',
          icon: Symbols.delete_rounded,
          label: l10n.deleteAccount,
          color: scheme.error,
          onTap: () => _deleteAccount(context, ref),
        ),
        const SizedBox(height: 24),
        ...about,
      ],
    );
  }
}

class _ActionRow extends StatelessWidget {
  const _ActionRow({
    required this.index,
    required this.length,
    required this.rowKey,
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  final int index;
  final int length;
  final String rowKey;
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final tint = color ?? Theme.of(context).colorScheme.onSurface;
    return GroupedItem(
      index: index,
      length: length,
      onTap: onTap,
      child: Row(
        key: Key(rowKey),
        children: [
          Icon(icon, color: color ?? Theme.of(context).colorScheme.primary),
          const SizedBox(width: 16),
          Expanded(child: Text(label, style: textTheme.bodyLarge?.copyWith(color: tint))),
        ],
      ),
    );
  }
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
    return Column(
      children: [
        for (var i = 0; i < items.length; i++)
          GroupedItem(
            index: i,
            length: items.length,
            child: Row(
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
          ),
      ],
    );
  }
}
