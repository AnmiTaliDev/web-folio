import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../config.dart';
import '../data/models.dart';
import '../data/providers.dart';
import '../l10n/app_localizations.dart';
import '../widgets/async_view.dart';
import '../widgets/book_row.dart';
import '../widgets/catalog_search.dart';
import '../widgets/cover_tile.dart';
import '../widgets/genre_label.dart';
import '../widgets/grouped_list.dart';
import '../widgets/tag_pill.dart';
import '../widgets/two_pane.dart';

class PicksScreen extends ConsumerWidget {
  const PicksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final recommendations = ref.watch(recommendationsProvider);
    final ratings = ref.watch(ratingsProvider).value ?? const <String, int>{};
    final dayBookId = ref.watch(bookOfDayProvider).value?.book.id;
    final firstRecommendation = recommendations.value?.firstOrNull;
    final showPercent = firstRecommendation != null && !firstRecommendation.isPopularity;
    final searching = ref.watch(catalogQueryProvider).trim().isNotEmpty;

    if (searching) {
      return Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: singleColumnMaxWidth),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              const CatalogSearchField(),
              const SizedBox(height: 16),
              CatalogSearchResults(onOpen: (book) => context.push('/book/${book.id}')),
            ],
          ),
        ),
      );
    }

    return TwoPane(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      header: const [CatalogSearchField(), SizedBox(height: 16)],
      left: [
        AsyncView<BookOfDay?>(
          value: ref.watch(bookOfDayProvider),
          onRetry: () => ref.invalidate(bookOfDayProvider),
          builder: (day) => day == null ? const SizedBox.shrink() : _BookOfDayCard(day: day, showPercent: showPercent),
        ),
      ],
      right: [
        Text((recommendations.value?.length ?? 15) >= 15 ? l10n.topForYou : l10n.recommendationsTitle, style: textTheme.titleLarge),
        if (firstRecommendation != null && firstRecommendation.isPopularity)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              l10n.popularHint,
              key: const Key('popular-hint'),
              style: textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
            ),
          ),
        const SizedBox(height: 8),
        AsyncView<List<Recommendation>>(
          value: recommendations,
          onRetry: () => ref.invalidate(recommendationsProvider),
          builder: (all) {
            final items = all.where((item) => !ratings.containsKey(item.book.id) && item.book.id != dayBookId).toList();
            if (items.isEmpty) {
              return Padding(padding: const EdgeInsets.all(16), child: Text(l10n.noPicks));
            }
            return GroupedList(
              items: [
                for (var i = 0; i < items.length; i++)
                  bookListItem(
                    key: Key('pick-${items[i].book.id}'),
                    book: items[i].book,
                    overline: showPercent ? '${i + 1} · ${items[i].percent}%' : '${i + 1}',
                    onTap: () => context.push('/book/${items[i].book.id}'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        M3EIconButton(
                          key: Key('like-${items[i].book.id}'),
                          variant: M3EIconButtonVariant.standard,
                          tooltip: l10n.like,
                          onPressed: () => ref.read(ratingsProvider.notifier).rate(items[i].book.id, 1),
                          icon: const Icon(Symbols.thumb_up_rounded),
                        ),
                        M3EIconButton(
                          key: Key('dislike-${items[i].book.id}'),
                          variant: M3EIconButtonVariant.standard,
                          tooltip: l10n.dislike,
                          onPressed: () => ref.read(ratingsProvider.notifier).rate(items[i].book.id, -1),
                          icon: const Icon(Symbols.thumb_down_rounded),
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

class _BookOfDayCard extends ConsumerWidget {
  const _BookOfDayCard({required this.day, required this.showPercent});

  final BookOfDay day;
  final bool showPercent;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final inWishlist = ref.watch(wishlistProvider).value?.contains(day.book.id) ?? false;
    final onPrimary = scheme.onPrimary;
    final genre = day.book.genres.isEmpty ? null : genreLabel(l10n, day.book.genres.first);

    return M3ECard(
      key: const Key('book-of-day'),
      variant: M3ECardVariant.filled,
      color: scheme.primary,
      borderRadius: BorderRadius.circular(32),
      padding: const EdgeInsets.all(20),
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(l10n.bookOfDay, style: textTheme.titleMedium?.copyWith(color: onPrimary)),
              ),
              TagPill(
                key: const Key('day-badge'),
                label: showPercent ? l10n.matchPercent(day.percent) : l10n.popularBadge,
                background: scheme.primaryContainer,
                foreground: scheme.onPrimaryContainer,
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CoverTile(bookId: day.book.id, title: day.book.title, size: 88, radius: 24),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(day.book.title, style: textTheme.titleLarge?.copyWith(color: onPrimary)),
                    Text(day.book.authorLine, style: textTheme.bodyMedium?.copyWith(color: onPrimary)),
                    if (genre != null) Text(genre, style: textTheme.bodyMedium?.copyWith(color: onPrimary)),
                  ],
                ),
              ),
            ],
          ),
          if (day.description != null) ...[
            const SizedBox(height: 16),
            Text(day.description!, style: textTheme.bodyMedium?.copyWith(color: onPrimary)),
            if (day.aiGenerated)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(l10n.aiCaption, style: textTheme.labelMedium?.copyWith(color: onPrimary.withValues(alpha: 0.8))),
              ),
          ],
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              M3EButton.tonal(onPressed: () => context.push('/book/${day.book.id}'), child: Text(l10n.whyForMe)),
              M3EButton.icon(
                style: M3EButtonStyle.outlined,
                decoration: M3EButtonDecoration(
                  foregroundColor: WidgetStatePropertyAll(onPrimary),
                  side: WidgetStatePropertyAll(BorderSide(color: onPrimary.withValues(alpha: 0.6))),
                ),
                onPressed: () => ref.read(wishlistProvider.notifier).toggle(day.book.id),
                icon: Icon(Symbols.bookmark_rounded, fill: inWishlist ? 1 : 0),
                label: Text(inWishlist ? l10n.saved : l10n.save),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
