import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../l10n/app_localizations.dart';
import 'cover_tile.dart';
import 'genre_label.dart';

class BookBanner extends StatelessWidget {
  const BookBanner({super.key, required this.book});

  final BookSummary book;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
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
