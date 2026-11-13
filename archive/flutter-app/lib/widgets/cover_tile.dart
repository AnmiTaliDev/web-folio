import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_ui/material_ui.dart';

const _shapes = [
  M3EShapeKind.cookie9Sided,
  M3EShapeKind.clover4Leaf,
  M3EShapeKind.flower,
  M3EShapeKind.cookie12Sided,
  M3EShapeKind.softBurst,
  M3EShapeKind.puffy,
  M3EShapeKind.cookie6Sided,
  M3EShapeKind.sunny,
];

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
      (scheme.primary, scheme.onPrimary),
      (scheme.tertiaryContainer, scheme.onTertiaryContainer),
      (scheme.secondary, scheme.onSecondary),
    ];
    final hash = bookId.hashCode.abs();
    final (background, foreground) = palettes[hash % palettes.length];
    return M3EShapeContainer(
      kind: _shapes[(hash ~/ 3) % _shapes.length],
      width: size,
      height: size,
      color: background,
      child: Center(
        child: Text(
          initialsOf(title),
          style: TextStyle(
            color: foreground,
            fontSize: size * 0.32,
            fontWeight: FontWeight.w800,
            fontVariations: const [FontVariation('wght', 800)],
          ),
        ),
      ),
    );
  }
}
