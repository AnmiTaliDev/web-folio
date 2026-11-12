import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/providers.dart';
import '../l10n/app_localizations.dart';
import '../widgets/account_card.dart';
import '../widgets/async_view.dart';
import '../widgets/cover_tile.dart';
import '../widgets/genre_label.dart';
import '../widgets/grouped_list.dart';
import '../widgets/private_mode_card.dart';
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
        left: [
          Text(l10n.profileTitle, style: textTheme.headlineMedium),
          const SizedBox(height: 16),
          PrivateModeCard(onCreate: () => context.push('/auth?mode=register'), onSignIn: () => context.push('/auth?mode=login')),
        ],
        right: const [],
      );
    }

    return TwoPane(
      leftFlex: 1,
      rightFlex: 1,
      left: [
        Text(l10n.profileTitle, style: textTheme.headlineMedium),
        const SizedBox(height: 16),
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
              return Text(l10n.wishlistEmpty, key: const Key('wishlist-empty'), style: textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant));
            }
            return Column(
              children: [
                for (var i = 0; i < books.length; i++)
                  GroupedItem(
                    index: i,
                    length: books.length,
                    onTap: () => context.push('/book/${books[i].id}'),
                    child: Row(
                      key: Key('wishlist-${books[i].id}'),
                      children: [
                        CoverTile(bookId: books[i].id, title: books[i].title),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(books[i].title, style: textTheme.bodyLarge, maxLines: 2, overflow: TextOverflow.ellipsis),
                              Text(books[i].authorLine, style: textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant)),
                            ],
                          ),
                        ),
                        IconButton(
                          key: Key('wishlist-remove-${books[i].id}'),
                          tooltip: l10n.wishlistRemove,
                          onPressed: () => ref.read(wishlistProvider.notifier).toggle(books[i].id),
                          icon: Icon(Symbols.bookmark_rounded, fill: 1, color: scheme.primary),
                        ),
                      ],
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
    return Container(
      key: const Key('taste-card'),
      width: double.infinity,
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
