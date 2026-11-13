import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../config.dart';
import '../data/models.dart';
import '../data/providers.dart';
import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';
import '../widgets/async_view.dart';
import '../widgets/book_banner.dart';
import '../widgets/genre_label.dart';
import '../widgets/two_pane.dart';

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
      appBar: M3EAppBar.top(
        leading: M3EIconButton(
          key: const Key('why-back'),
          variant: M3EIconButtonVariant.standard,
          tooltip: l10n.back,
          onPressed: () => context.canPop() ? context.pop() : context.go('/'),
          icon: const Icon(Symbols.arrow_back_rounded),
        ),
      ),
      body: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: contentMaxWidth),
          child: TwoPane(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            leftFlex: 1,
            rightFlex: 1,
            left: [
              AsyncView<BookSummary?>(
                value: book,
                onRetry: () => ref.invalidate(bookProvider(bookId)),
                builder: (data) {
                  if (data == null) {
                    return Text(l10n.notFound);
                  }
                  return BookBanner(book: data);
                },
              ),
            ],
            right: [
              AsyncView<Explanation>(
                value: explanation,
                onRetry: () => ref.invalidate(explanationProvider(bookId)),
                builder: (data) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (data.isPopularity)
                      Text(
                        l10n.popularBadge,
                        key: const Key('overall-percent'),
                        style: textTheme.headlineMedium?.copyWith(color: scheme.primary),
                      )
                    else
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Flexible(
                            flex: 0,
                            child: Text('${data.percent}%', key: const Key('overall-percent'), style: heroStyle(scheme.primary, size: 64)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Text(l10n.matchLabel, style: textTheme.titleMedium?.copyWith(color: scheme.primary)),
                            ),
                          ),
                        ],
                      ),
                    const SizedBox(height: 8),
                    Text(data.isPopularity ? l10n.whyListTitle : l10n.whyTitle, style: textTheme.titleLarge),
                    if (rating != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          rating == 1 ? l10n.alreadyLiked : l10n.alreadyDisliked,
                          key: const Key('already-rated'),
                          style: textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
                        ),
                      ),
                    const SizedBox(height: 16),
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
      bottomNavigationBar: SafeArea(
        child: SizedBox(
          height: 88,
          child: Center(
            child: M3EToolbar(
              fabExpandsToolbar: false,
              variant: M3EToolbarVariant.tonal,
              actions: [
                M3EToolbarAction(
                  icon: Symbols.thumb_up_rounded,
                  active: rating == 1,
                  tooltip: l10n.like,
                  onPressed: () => ref.read(ratingsProvider.notifier).rate(bookId, 1),
                ),
                M3EToolbarAction(
                  icon: Symbols.thumb_down_rounded,
                  active: rating == -1,
                  tooltip: l10n.dislike,
                  onPressed: () => ref.read(ratingsProvider.notifier).rate(bookId, -1),
                ),
              ],
              fabIcon: Icon(Symbols.bookmark_rounded, fill: inWishlist ? 1 : 0),
              onFabPressed: () => ref.read(wishlistProvider.notifier).toggle(bookId),
            ),
          ),
        ),
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
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(label, style: textTheme.bodyMedium)),
              Text('${reason.percent}%', style: textTheme.titleMedium),
            ],
          ),
          const SizedBox(height: 4),
          M3EProgressIndicator.linearWavy(value: reason.percent / 100),
        ],
      ),
    );
  }
}
