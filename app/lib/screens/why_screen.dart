import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../config.dart';
import '../data/models.dart';
import '../data/providers.dart';
import '../l10n/app_localizations.dart';
import '../widgets/async_view.dart';
import '../widgets/cover_tile.dart';
import '../widgets/genre_label.dart';
import '../widgets/like_buttons.dart';

String reasonText(AppLocalizations l10n, Reason reason) => switch (reason.type) {
      'liked_book' => l10n.reasonLikedBook(reason.title ?? ''),
      'genre' => l10n.reasonGenre(reason.genres.map((genre) => genreLabel(l10n, genre)).join(', ')),
      'similar_readers' => l10n.reasonSimilarReaders,
      _ => l10n.reasonPopular,
    };

class WhyScreen extends ConsumerWidget {
  const WhyScreen({super.key, required this.bookId});

  final String bookId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final book = ref.watch(bookProvider(bookId));
    final explanation = ref.watch(explanationProvider(bookId));
    final rating = ref.watch(ratingsProvider).value?[bookId];
    final inWishlist = ref.watch(wishlistProvider).value?.contains(bookId) ?? false;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: scheme.surface,
        leading: IconButton(
          key: const Key('why-back'),
          tooltip: l10n.back,
          onPressed: () => context.canPop() ? context.pop() : context.go('/'),
          icon: const Icon(Symbols.arrow_back_rounded),
        ),
      ),
      body: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: contentMaxWidth),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            children: [
              AsyncView<BookSummary?>(
                value: book,
                onRetry: () => ref.invalidate(bookProvider(bookId)),
                builder: (data) {
                  if (data == null) {
                    return Text(l10n.notFound);
                  }
                  return _Banner(book: data);
                },
              ),
              const SizedBox(height: 24),
              AsyncView<Explanation>(
                value: explanation,
                onRetry: () => ref.invalidate(explanationProvider(bookId)),
                builder: (data) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(l10n.whyTitle, style: textTheme.titleLarge)),
                        Text(
                          data.isPopularity ? l10n.popularBadge : l10n.matchPercent(data.percent),
                          key: const Key('overall-percent'),
                          style: textTheme.titleMedium?.copyWith(color: scheme.primary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    for (final reason in data.reasons) _ReasonBar(reason: reason, label: reasonText(l10n, reason)),
                    const SizedBox(height: 16),
                    if (data.description.text != null) Text(data.description.text!, style: textTheme.bodyLarge),
                    if (data.description.aiGenerated)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          l10n.aiCaptionWarning,
                          key: const Key('ai-caption'),
                          style: textTheme.labelMedium?.copyWith(color: scheme.onSurfaceVariant),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: Material(
        color: scheme.surfaceContainer,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    key: const Key('wishlist-button'),
                    onPressed: () => ref.read(wishlistProvider.notifier).toggle(bookId),
                    icon: Icon(Symbols.bookmark_rounded, fill: inWishlist ? 1 : 0),
                    label: Text(inWishlist ? l10n.inWishlist : l10n.wantToRead),
                  ),
                ),
                const SizedBox(width: 12),
                LikeButtons(
                  value: rating,
                  onLike: () => ref.read(ratingsProvider.notifier).rate(bookId, 1),
                  onDislike: () => ref.read(ratingsProvider.notifier).rate(bookId, -1),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.book});

  final BookSummary book;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: scheme.primaryContainer, borderRadius: BorderRadius.circular(28)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CoverTile(bookId: book.id, title: book.title, size: 96, radius: 20),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(book.title, style: textTheme.titleLarge?.copyWith(color: scheme.onPrimaryContainer)),
                Text(book.authorLine, style: textTheme.bodyMedium?.copyWith(color: scheme.onPrimaryContainer)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final genre in book.genres)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: scheme.secondaryContainer, borderRadius: BorderRadius.circular(8)),
                        child: Text(genreLabel(l10n, genre), style: textTheme.labelMedium?.copyWith(color: scheme.onSecondaryContainer)),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ReasonBar extends StatelessWidget {
  const _ReasonBar({required this.reason, required this.label});

  final Reason reason;
  final String label;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(label, style: textTheme.bodyMedium)),
              Text('${reason.percent}%', style: textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: reason.percent / 100,
              minHeight: 8,
              backgroundColor: scheme.surfaceContainerHighest,
              color: scheme.primary,
            ),
          ),
        ],
      ),
    );
  }
}
