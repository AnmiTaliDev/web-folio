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
import '../widgets/cover_tile.dart';
import '../widgets/genre_label.dart';
import '../widgets/grouped_list.dart';
import '../widgets/like_buttons.dart';

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
                        TextButton(key: const Key('skip'), onPressed: () => finish(consent: false), child: Text(l10n.skip)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: FilledButton(
                            key: const Key('show-picks'),
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
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
              children: [
                Text(l10n.appName, style: textTheme.headlineLarge),
                const SizedBox(height: 8),
                Text(l10n.onboardingSubtitle, style: textTheme.bodyLarge?.copyWith(color: scheme.onSurfaceVariant)),
                const SizedBox(height: 4),
                Text(l10n.consentNote, style: textTheme.labelMedium?.copyWith(color: scheme.onSurfaceVariant)),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(key: const Key('have-account'), onPressed: () => context.push('/auth?mode=login'), child: Text(l10n.signInHaveAccount)),
                ),
                const SizedBox(height: 20),
                TextField(
                  key: const Key('search-field'),
                  onChanged: ref.read(searchQueryProvider.notifier).update,
                  decoration: InputDecoration(hintText: l10n.searchHint, prefixIcon: const Icon(Symbols.search_rounded)),
                ),
                const SizedBox(height: 20),
                Text(l10n.interestsTitle, style: textTheme.titleLarge),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final genre in interestGenres)
                      FilterChip(
                        key: Key('chip-$genre'),
                        label: Text(genreLabel(l10n, genre)),
                        selected: selected.contains(genre),
                        onSelected: (_) => ref.read(selectedInterestsProvider.notifier).toggle(genre),
                      ),
                  ],
                ),
                const SizedBox(height: 24),
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
                    return Column(
                      children: [
                        for (var i = 0; i < items.length; i++)
                          GroupedItem(
                            index: i,
                            length: items.length,
                            child: Row(
                              children: [
                                CoverTile(bookId: items[i].id, title: items[i].title),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(items[i].title, style: textTheme.bodyLarge, maxLines: 2, overflow: TextOverflow.ellipsis),
                                      Text(
                                        items[i].authorLine,
                                        style: textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                                LikeButtons(
                                  value: ratings[items[i].id],
                                  onLike: () => ref.read(ratingsProvider.notifier).rate(items[i].id, 1, isRead: true),
                                  onDislike: () => ref.read(ratingsProvider.notifier).rate(items[i].id, -1, isRead: true),
                                ),
                              ],
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
