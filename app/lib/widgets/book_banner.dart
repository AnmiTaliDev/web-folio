import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../l10n/app_localizations.dart';
import 'cover_tile.dart';
import 'genre_label.dart';
import 'tag_pill.dart';

class BookBanner extends StatelessWidget {
  const BookBanner({super.key, required this.book});

  final BookSummary book;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    return M3ECard(
      variant: M3ECardVariant.filled,
      color: scheme.primaryContainer,
      borderRadius: BorderRadius.circular(32),
      padding: const EdgeInsets.all(20),
      width: double.infinity,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CoverTile(bookId: book.id, title: book.title, size: 96, radius: 24),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(book.title, style: textTheme.titleLarge?.copyWith(color: scheme.onPrimaryContainer)),
                Text(book.authorLine, style: textTheme.bodyMedium?.copyWith(color: scheme.onPrimaryContainer)),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final genre in book.genres)
                      TagPill(
                        label: genreLabel(l10n, genre),
                        background: scheme.secondaryContainer,
                        foreground: scheme.onSecondaryContainer,
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
