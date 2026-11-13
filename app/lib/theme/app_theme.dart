import 'package:material_ui/material_ui.dart';

const _seed = Color(0xFF0061A4);

final folioColorScheme = ColorScheme.fromSeed(seedColor: _seed, dynamicSchemeVariant: DynamicSchemeVariant.vibrant).copyWith(
  tertiary: const Color(0xFF9A4258),
  onTertiary: const Color(0xFFFFFFFF),
  tertiaryContainer: const Color(0xFFFFB3B9),
  onTertiaryContainer: const Color(0xFF5C0D26),
);

TextTheme _folioTextTheme(TextTheme base) {
  final sized = base.copyWith(
    headlineLarge: const TextStyle(fontSize: 36, height: 44 / 36, fontWeight: FontWeight.w800),
    headlineMedium: const TextStyle(fontSize: 30, height: 38 / 30, fontWeight: FontWeight.w800),
    headlineSmall: const TextStyle(fontSize: 26, height: 32 / 26, fontWeight: FontWeight.w700),
    titleLarge: const TextStyle(fontSize: 22, height: 28 / 22, fontWeight: FontWeight.w700),
    titleMedium: const TextStyle(fontSize: 17, height: 24 / 17, fontWeight: FontWeight.w700),
    bodyLarge: const TextStyle(fontSize: 16, height: 24 / 16),
    bodyMedium: const TextStyle(fontSize: 14, height: 20 / 14),
    labelMedium: const TextStyle(fontSize: 12, height: 16 / 12),
  );
  return sized.apply(bodyColor: folioColorScheme.onSurface, displayColor: folioColorScheme.onSurface, fontFamily: 'RobotoFlex');
}

TextStyle heroStyle(Color color, {double size = 56}) => TextStyle(
  fontFamily: 'RobotoFlex',
  fontSize: size,
  height: 1,
  letterSpacing: -size / 40,
  color: color,
  fontWeight: FontWeight.w800,
  fontVariations: const [FontVariation('wght', 850), FontVariation('opsz', 144)],
);

ThemeData buildFolioTheme() {
  final base = ThemeData(useMaterial3: true, colorScheme: folioColorScheme, brightness: Brightness.light, fontFamily: 'RobotoFlex');
  return base.copyWith(
    scaffoldBackgroundColor: folioColorScheme.surface,
    textTheme: _folioTextTheme(base.textTheme),
    dialogTheme: DialogThemeData(
      backgroundColor: folioColorScheme.surfaceContainerHigh,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(36)),
    ),
  );
}
