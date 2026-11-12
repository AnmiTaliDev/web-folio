import 'package:material_ui/material_ui.dart';

String initialsOf(String title) {
  final words = title.split(RegExp(r'\s+')).where((word) => word.isNotEmpty).take(2);
  return words.map((word) => word.substring(0, 1).toUpperCase()).join();
}

class CoverTile extends StatelessWidget {
  const CoverTile({super.key, required this.bookId, required this.title, this.size = 48, this.radius = 12});

  final String bookId;
  final String title;
  final double size;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final palettes = [
      (scheme.tertiaryContainer, scheme.onTertiaryContainer),
      (scheme.inverseSurface, scheme.onInverseSurface),
      (scheme.secondaryContainer, scheme.onSecondaryContainer),
    ];
    final (background, foreground) = palettes[bookId.hashCode.abs() % palettes.length];
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(radius)),
      child: Text(
        initialsOf(title),
        style: TextStyle(color: foreground, fontSize: size * 0.34, fontWeight: FontWeight.w700),
      ),
    );
  }
}
