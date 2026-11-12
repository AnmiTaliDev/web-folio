import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../config.dart';
import '../data/models.dart';
import '../data/providers.dart';
import '../l10n/app_localizations.dart';
import '../widgets/account_prompt.dart';
import '../widgets/async_view.dart';
import '../widgets/book_row.dart';
import '../widgets/catalog_search.dart';

class GuestHomeScreen extends ConsumerWidget {
  const GuestHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final searching = ref.watch(catalogQueryProvider).trim().isNotEmpty;
    void open(BookSummary book) => context.push('/book/${book.id}');

    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: singleColumnMaxWidth),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            Text(l10n.guestCatalogTitle, style: textTheme.headlineMedium),
            Row(
              children: [
                Icon(Symbols.shield_rounded, size: 16, color: scheme.primary),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    l10n.privateModeTitle,
                    key: const Key('private-badge'),
                    style: textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            AccountPrompt(onCreate: () => context.push('/auth?mode=register'), onSignIn: () => context.push('/auth?mode=login')),
            const CatalogSearchField(),
            const SizedBox(height: 16),
            if (searching)
              CatalogSearchResults(onOpen: open)
            else ...[
              Text(l10n.guestPopularTitle, style: textTheme.titleLarge),
              const SizedBox(height: 8),
              AsyncView<List<BookSummary>>(
                value: ref.watch(popularBooksProvider),
                onRetry: () => ref.invalidate(popularBooksProvider),
                builder: (books) => Column(
                  children: [
                    for (var i = 0; i < books.length; i++)
                      BookListRow(key: Key('popular-${books[i].id}'), book: books[i], index: i, length: books.length, onTap: () => open(books[i])),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
