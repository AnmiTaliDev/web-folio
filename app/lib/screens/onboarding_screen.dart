import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../config.dart';
import '../data/models.dart';
import '../data/providers.dart';
import '../l10n/app_localizations.dart';
import '../widgets/async_view.dart';
import '../widgets/book_row.dart';
import '../widgets/genre_label.dart';
import '../widgets/grouped_list.dart';
import '../widgets/like_buttons.dart';
import '../widgets/two_pane.dart';

class OnboardingScreen extends ConsumerWidget {
  const OnboardingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final selected = ref.watch(selectedInterestsProvider);
    final ratings = ref.watch(ratingsProvider).value ?? const <String, int>{};
    final books = ref.watch(onboardingBooksProvider);
    final accuracy = (ratings.length / minRatingsForAccuracy).clamp(0.0, 1.0);

    Future<void> finish({required bool consent}) =>
        ref.read(profileProvider.notifier).saveOnboarding(ref.read(selectedInterestsProvider).toList(), consent: consent);

    return Scaffold(
      bottomNavigationBar: Material(
        color: scheme.surfaceContainer,
        child: SafeArea(
          child: Center(
            heightFactor: 1,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: contentMaxWidth),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            l10n.ratedProgress(ratings.length, minRatingsForAccuracy),
                            key: const Key('accuracy-percent'),
                            style: textTheme.bodyMedium,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    M3EProgressIndicator.linearWavy(value: accuracy),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        M3EButton.text(key: const Key('skip'), onPressed: () => finish(consent: false), child: Text(l10n.skip)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: M3EButton.filled(
                            key: const Key('show-picks'),
                            size: M3EButtonSize.md,
                            onPressed: () => finish(consent: true),
                            child: Text(l10n.showPicks),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: contentMaxWidth),
            child: TwoPane(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
              leftFlex: 1,
              rightFlex: 1,
              left: [
                Text(l10n.appName, style: textTheme.headlineLarge),
                const SizedBox(height: 8),
                Text(l10n.onboardingSubtitle, style: textTheme.bodyLarge?.copyWith(color: scheme.onSurfaceVariant)),
                const SizedBox(height: 4),
                Text(l10n.consentNote, style: textTheme.labelMedium?.copyWith(color: scheme.onSurfaceVariant)),
                const SizedBox(height: 20),
                M3ESearchBar(
                  key: const Key('search-field'),
                  hintText: l10n.searchHint,
                  leading: const Icon(Symbols.search_rounded),
                  showClearButton: true,
                  expandOnFocus: false,
                  onChanged: ref.read(searchQueryProvider.notifier).update,
                ),
                const SizedBox(height: 20),
                Text(l10n.interestsTitle, style: textTheme.titleLarge),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final genre in interestGenres)
                      M3EChip(
                        key: Key('chip-$genre'),
                        type: M3EChipType.filter,
                        label: genreLabel(l10n, genre),
                        selected: selected.contains(genre),
                        onPressed: () => ref.read(selectedInterestsProvider.notifier).toggle(genre),
                      ),
                  ],
                ),
              ],
              right: [
                Text(l10n.alreadyReadTitle, style: textTheme.titleLarge),
                Text(l10n.alreadyReadHint, style: textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant)),
                const SizedBox(height: 8),
                AsyncView<List<BookSummary>>(
                  value: books,
                  onRetry: () => ref.invalidate(onboardingBooksProvider),
                  builder: (items) {
                    if (items.isEmpty) {
                      return Padding(padding: const EdgeInsets.all(16), child: Text(l10n.notFound));
                    }
                    return GroupedList(
                      items: [
                        for (final book in items)
                          bookListItem(
                            key: Key('onboarding-${book.id}'),
                            book: book,
                            onTap: () {},
                            trailing: LikeButtons(
                              value: ratings[book.id],
                              onLike: () => ref.read(ratingsProvider.notifier).rate(book.id, 1, isRead: true),
                              onDislike: () => ref.read(ratingsProvider.notifier).rate(book.id, -1, isRead: true),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
