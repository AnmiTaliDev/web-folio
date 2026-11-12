import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/providers.dart';
import '../l10n/app_localizations.dart';
import 'async_view.dart';
import 'book_row.dart';
import 'grouped_list.dart';

class CatalogSearchField extends ConsumerWidget {
  const CatalogSearchField({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return M3ETextField(
      key: const Key('catalog-search'),
      placeholder: l10n.searchHint,
      leading: const Icon(Symbols.search_rounded),
      showClearButton: true,
      onChanged: ref.read(catalogQueryProvider.notifier).update,
    );
  }
}

class CatalogSearchResults extends ConsumerWidget {
  const CatalogSearchResults({super.key, required this.onOpen});

  final ValueChanged<BookSummary> onOpen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return AsyncView<List<BookSummary>>(
      value: ref.watch(catalogSearchProvider),
      onRetry: () => ref.invalidate(catalogSearchProvider),
      builder: (books) {
        if (books.isEmpty) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Text(l10n.notFound, key: const Key('search-empty')),
          );
        }
        return GroupedList(
          items: [for (final book in books) bookListItem(key: Key('result-${book.id}'), book: book, onTap: () => onOpen(book))],
        );
      },
    );
  }
}
