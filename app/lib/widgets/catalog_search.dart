import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/providers.dart';
import '../l10n/app_localizations.dart';
import 'async_view.dart';
import 'book_row.dart';

class CatalogSearchField extends ConsumerWidget {
  const CatalogSearchField({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return TextField(
      key: const Key('catalog-search'),
      onChanged: ref.read(catalogQueryProvider.notifier).update,
      decoration: InputDecoration(hintText: l10n.searchHint, prefixIcon: const Icon(Symbols.search_rounded)),
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
          return Padding(padding: const EdgeInsets.all(16), child: Text(l10n.notFound, key: const Key('search-empty')));
        }
        return Column(
          children: [
            for (var i = 0; i < books.length; i++)
              BookListRow(key: Key('result-${books[i].id}'), book: books[i], index: i, length: books.length, onTap: () => onOpen(books[i])),
          ],
        );
      },
    );
  }
}
