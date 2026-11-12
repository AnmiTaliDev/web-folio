import 'package:material_ui/material_ui.dart';

BorderRadius groupedRadius(int index, int length, {double outer = 24, double inner = 6}) {
  final top = index == 0 ? outer : inner;
  final bottom = index == length - 1 ? outer : inner;
  return BorderRadius.vertical(top: Radius.circular(top), bottom: Radius.circular(bottom));
}

class GroupedItem extends StatelessWidget {
  const GroupedItem({super.key, required this.index, required this.length, required this.child, this.onTap});

  final int index;
  final int length;
  final Widget child;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final radius = groupedRadius(index, length);
    return Padding(
      padding: EdgeInsets.only(bottom: index == length - 1 ? 0 : 2),
      child: Material(
        color: Theme.of(context).colorScheme.surfaceContainer,
        borderRadius: radius,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12), child: child),
        ),
      ),
    );
  }
}
