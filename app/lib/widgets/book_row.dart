import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import 'cover_tile.dart';
import 'grouped_list.dart';

class BookListRow extends StatelessWidget {
  const BookListRow({super.key, required this.book, required this.index, required this.length, required this.onTap});

  final BookSummary book;
  final int index;
  final int length;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    return GroupedItem(
      index: index,
      length: length,
      onTap: onTap,
      child: Row(
        children: [
          CoverTile(bookId: book.id, title: book.title),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(book.title, style: textTheme.bodyLarge, maxLines: 2, overflow: TextOverflow.ellipsis),
                Text(
                  book.authorLine,
                  style: textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Icon(Symbols.chevron_right_rounded, color: scheme.onSurfaceVariant),
        ],
      ),
    );
  }
}
