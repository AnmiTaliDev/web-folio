import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import 'cover_tile.dart';

M3EListItem bookListItem({Key? key, required BookSummary book, required VoidCallback onTap, Widget? trailing, String? overline}) {
  return M3EListItem(
    key: key,
    headline: book.title,
    supportingText: book.authorLine,
    overline: overline,
    leading: CoverTile(bookId: book.id, title: book.title),
    trailing: trailing ?? const Icon(Symbols.chevron_right_rounded),
    onTap: onTap,
  );
}
