import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/providers.dart';
import '../l10n/app_localizations.dart';
import '../widgets/async_view.dart';
import '../widgets/cover_tile.dart';
import '../widgets/genre_label.dart';
import '../widgets/grouped_list.dart';

class PicksScreen extends ConsumerWidget {
  const PicksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final today = MaterialLocalizations.of(context).formatFullDate(DateTime.now());
    final recommendations = ref.watch(recommendationsProvider);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        Text(today, style: textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant)),
        Text(l10n.navPicks, style: textTheme.headlineMedium),
        const SizedBox(height: 16),
        AsyncView<BookOfDay?>(
          value: ref.watch(bookOfDayProvider),
          onRetry: () => ref.invalidate(bookOfDayProvider),
          builder: (day) => day == null ? const SizedBox.shrink() : _BookOfDayCard(day: day),
        ),
        const SizedBox(height: 24),
        Text(l10n.topForYou, style: textTheme.titleLarge),
        const SizedBox(height: 8),
        AsyncView<List<Recommendation>>(
          value: recommendations,
          onRetry: () => ref.invalidate(recommendationsProvider),
          builder: (items) {
            if (items.isEmpty) {
              return Padding(padding: const EdgeInsets.all(16), child: Text(l10n.noPicks));
            }
            return Column(
              children: [
                for (var i = 0; i < items.length; i++)
                  _RecommendationRow(item: items[i], index: i, length: items.length),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _BookOfDayCard extends ConsumerWidget {
  const _BookOfDayCard({required this.day});

  final BookOfDay day;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final inWishlist = ref.watch(wishlistProvider).value?.contains(day.book.id) ?? false;
    final onPrimary = scheme.onPrimary;
    final genre = day.book.genres.isEmpty ? null : genreLabel(l10n, day.book.genres.first);

    return Container(
      key: const Key('book-of-day'),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: scheme.primary, borderRadius: BorderRadius.circular(32)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(l10n.bookOfDay, style: textTheme.titleMedium?.copyWith(color: onPrimary))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(color: scheme.primaryContainer, borderRadius: BorderRadius.circular(16)),
                child: Text(
                  l10n.matchPercent(day.percent),
                  style: textTheme.labelMedium?.copyWith(color: scheme.onPrimaryContainer, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CoverTile(bookId: day.book.id, title: day.book.title, size: 88, radius: 20),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(day.book.title, style: textTheme.titleLarge?.copyWith(color: onPrimary)),
                    Text(day.book.authorLine, style: textTheme.bodyMedium?.copyWith(color: onPrimary)),
                    if (genre != null) Text(genre, style: textTheme.labelMedium?.copyWith(color: onPrimary)),
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
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: () => context.push('/book/${day.book.id}'),
                  style: FilledButton.styleFrom(backgroundColor: scheme.primaryContainer, foregroundColor: scheme.onPrimaryContainer),
                  child: Text(l10n.whyForMe),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                onPressed: () => ref.read(wishlistProvider.notifier).toggle(day.book.id),
                style: OutlinedButton.styleFrom(
                  foregroundColor: onPrimary,
                  side: BorderSide(color: onPrimary.withValues(alpha: 0.6)),
                  shape: const StadiumBorder(),
                  minimumSize: const Size(0, 48),
                ),
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

class _RecommendationRow extends ConsumerWidget {
  const _RecommendationRow({required this.item, required this.index, required this.length});

  final Recommendation item;
  final int index;
  final int length;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final liked = ref.watch(ratingsProvider).value?[item.book.id] == 1;

    return GroupedItem(
      index: index,
      length: length,
      onTap: () => context.push('/book/${item.book.id}'),
      child: Row(
        children: [
          SizedBox(width: 28, child: Text('${item.rank}', style: textTheme.titleMedium)),
          CoverTile(bookId: item.book.id, title: item.book.title),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.book.title, style: textTheme.bodyLarge, maxLines: 2, overflow: TextOverflow.ellipsis),
                Text(
                  item.book.authorLine,
                  style: textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Text('${item.percent}%', style: textTheme.titleMedium?.copyWith(color: scheme.primary)),
          IconButton(
            key: Key('like-${item.book.id}'),
            tooltip: AppLocalizations.of(context).like,
            onPressed: () => ref.read(ratingsProvider.notifier).rate(item.book.id, 1),
            icon: Icon(Symbols.thumb_up_rounded, fill: liked ? 1 : 0, color: liked ? scheme.primary : scheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}
