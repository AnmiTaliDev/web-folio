import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_ui/material_ui.dart';

class GroupedList extends StatelessWidget {
  const GroupedList({super.key, required this.items});

  final List<M3EListItem> items;

  @override
  Widget build(BuildContext context) {
    return M3EList(
      itemCount: items.length,
      itemBuilder: (context, index) => items[index],
      onTap: (index) => items[index].onTap?.call(),
      outerRadius: 24,
      innerRadius: 6,
      gap: 2,
    );
  }
}
