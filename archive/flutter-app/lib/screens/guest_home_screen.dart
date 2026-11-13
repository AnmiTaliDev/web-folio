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
import '../widgets/grouped_list.dart';

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
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            AccountPrompt(onCreate: () => context.push('/auth?mode=register'), onSignIn: () => context.push('/auth?mode=login')),
            const CatalogSearchField(),
            const SizedBox(height: 16),
            if (searching)
              CatalogSearchResults(onOpen: open)
            else ...[
              Row(
                children: [
                  Icon(Symbols.shield_rounded, size: 16, color: scheme.primary),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      l10n.privateModeTitle,
                      key: const Key('private-badge'),
                      style: textTheme.labelLarge?.copyWith(color: scheme.onSurfaceVariant),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(l10n.guestPopularTitle, style: textTheme.titleLarge),
              const SizedBox(height: 8),
              AsyncView<List<BookSummary>>(
                value: ref.watch(popularBooksProvider),
                onRetry: () => ref.invalidate(popularBooksProvider),
                builder: (books) => GroupedList(
                  items: [for (final book in books) bookListItem(key: Key('popular-${book.id}'), book: book, onTap: () => open(book))],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
