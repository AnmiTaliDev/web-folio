import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/providers.dart';
import '../l10n/app_localizations.dart';
import '../widgets/account_card.dart';
import '../widgets/async_view.dart';
import '../widgets/book_row.dart';
import '../widgets/genre_label.dart';
import '../widgets/grouped_list.dart';
import '../widgets/private_mode_card.dart';
import '../widgets/tag_pill.dart';
import '../widgets/two_pane.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final status = ref.watch(authStatusProvider).value;

    if (status == null || !status.registered) {
      return TwoPane(
        leftFlex: 1,
        rightFlex: 1,
        left: [PrivateModeCard(onCreate: () => context.push('/auth?mode=register'), onSignIn: () => context.push('/auth?mode=login'))],
        right: const [],
      );
    }

    return TwoPane(
      leftFlex: 1,
      rightFlex: 1,
      left: [
        AccountCard(username: status.username ?? ''),
        const SizedBox(height: 16),
        AsyncView<TasteStats>(
          value: ref.watch(tasteStatsProvider),
          onRetry: () => ref.invalidate(tasteStatsProvider),
          builder: (stats) => _TasteCard(stats: stats),
        ),
      ],
      right: [
        Text(l10n.wishlistTitle, style: textTheme.titleLarge),
        const SizedBox(height: 8),
        AsyncView<List<BookSummary>>(
          value: ref.watch(wishlistBooksProvider),
          onRetry: () => ref.invalidate(wishlistBooksProvider),
          builder: (books) {
            if (books.isEmpty) {
              return Text(
                l10n.wishlistEmpty,
                key: const Key('wishlist-empty'),
                style: textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
              );
            }
            return GroupedList(
              items: [
                for (final book in books)
                  bookListItem(
                    key: Key('wishlist-${book.id}'),
                    book: book,
                    onTap: () => context.push('/book/${book.id}'),
                    trailing: M3EIconButton(
                      key: Key('wishlist-remove-${book.id}'),
                      variant: M3EIconButtonVariant.standard,
                      tooltip: l10n.wishlistRemove,
                      onPressed: () => ref.read(wishlistProvider.notifier).toggle(book.id),
                      icon: Icon(Symbols.bookmark_rounded, fill: 1, color: scheme.primary),
                    ),
                  ),
              ],
            );
          },
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
    return M3ECard(
      key: const Key('taste-card'),
      variant: M3ECardVariant.filled,
      color: scheme.primaryContainer,
      borderRadius: BorderRadius.circular(32),
      padding: const EdgeInsets.all(20),
      width: double.infinity,
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
                spacing: 8,
                children: [
                  for (final genre in extra)
                    TagPill(label: genreLabel(l10n, genre), background: scheme.secondaryContainer, foreground: scheme.onSecondaryContainer),
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
