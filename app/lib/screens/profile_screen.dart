import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/providers.dart';
import '../l10n/app_localizations.dart';
import '../widgets/async_view.dart';
import '../widgets/genre_label.dart';
import '../widgets/grouped_list.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.deleteConfirmTitle),
        content: Text(l10n.deleteConfirmBody),
        actions: [
          TextButton(key: const Key('delete-cancel'), onPressed: () => Navigator.of(dialogContext).pop(false), child: Text(l10n.cancel)),
          TextButton(
            key: const Key('delete-confirm'),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: TextButton.styleFrom(foregroundColor: Theme.of(dialogContext).colorScheme.error),
            child: Text(l10n.delete),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(profileProvider.notifier).deleteEverything();
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final profile = ref.watch(profileProvider).value;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        Text(l10n.profileTitle, style: textTheme.headlineMedium),
        const SizedBox(height: 16),
        AsyncView<TasteStats>(
          value: ref.watch(tasteStatsProvider),
          onRetry: () => ref.invalidate(tasteStatsProvider),
          builder: (stats) => _TasteCard(stats: stats),
        ),
        const SizedBox(height: 24),
        Text(l10n.howItWorks, style: textTheme.titleLarge),
        const SizedBox(height: 8),
        _HowItWorks(l10n: l10n),
        const SizedBox(height: 24),
        Text(l10n.privacy, style: textTheme.titleLarge),
        const SizedBox(height: 8),
        if (profile != null) ...[
          GroupedItem(
            index: 0,
            length: 3,
            child: SwitchListTile(
              key: const Key('switch-likes'),
              contentPadding: EdgeInsets.zero,
              title: Text(l10n.useLikes),
              value: profile.personalizationEnabled,
              onChanged: (value) => ref.read(profileProvider.notifier).setPersonalization(value),
            ),
          ),
          GroupedItem(
            index: 1,
            length: 3,
            child: SwitchListTile(
              key: const Key('switch-ai'),
              contentPadding: EdgeInsets.zero,
              title: Text(l10n.aiDescriptions),
              value: profile.aiDescriptionsEnabled,
              onChanged: (value) => ref.read(profileProvider.notifier).setAiDescriptions(value),
            ),
          ),
        ],
        GroupedItem(
          index: 2,
          length: 3,
          onTap: () => _confirmDelete(context, ref),
          child: Row(
            key: const Key('delete-data'),
            children: [
              Icon(Symbols.delete_rounded, color: scheme.error),
              const SizedBox(width: 12),
              Expanded(child: Text(l10n.deleteMyData, style: textTheme.bodyLarge?.copyWith(color: scheme.error))),
            ],
          ),
        ),
      ],
    );
  }
}

class _TasteCard extends StatelessWidget {
  const _TasteCard({required this.stats});

  final TasteStats stats;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final main = stats.topGenres.isEmpty ? null : stats.topGenres.first;
    final extra = stats.topGenres.skip(1).toList();
    return Container(
      key: const Key('taste-card'),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: scheme.primaryContainer, borderRadius: BorderRadius.circular(28)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.algoThinks, style: textTheme.titleMedium?.copyWith(color: scheme.onPrimaryContainer)),
          const SizedBox(height: 12),
          if (main == null)
            Text(l10n.noTasteYet, style: textTheme.bodyMedium?.copyWith(color: scheme.onPrimaryContainer))
          else ...[
            Text(l10n.mainGenre, style: textTheme.labelMedium?.copyWith(color: scheme.onPrimaryContainer)),
            Text(genreLabel(l10n, main), style: textTheme.headlineMedium?.copyWith(color: scheme.onPrimaryContainer)),
            if (extra.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(l10n.extraGenres, style: textTheme.labelMedium?.copyWith(color: scheme.onPrimaryContainer)),
              const SizedBox(height: 4),
              Wrap(
                spacing: 6,
                children: [
                  for (final genre in extra)
                    Chip(label: Text(genreLabel(l10n, genre)), backgroundColor: scheme.secondaryContainer),
                ],
              ),
            ],
          ],
          const SizedBox(height: 12),
          Text(
            l10n.readStats(stats.readCount, stats.likedCount),
            key: const Key('read-stats'),
            style: textTheme.bodyMedium?.copyWith(color: scheme.onPrimaryContainer),
          ),
        ],
      ),
    );
  }
}

class _HowItWorks extends StatelessWidget {
  const _HowItWorks({required this.l10n});

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
