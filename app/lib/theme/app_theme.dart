import 'package:material_ui/material_ui.dart';

const _primary = Color(0xFF0061A4);
const _surface = Color(0xFFFDFCFF);
const _text = Color(0xFF1A1C1E);
const _textVariant = Color(0xFF43474E);
const _listContainer = Color(0xFFEDEEF3);
const _fieldContainer = Color(0xFFE7E8EE);
const _inactiveContainer = Color(0xFFE2E2E8);
const _primaryContainer = Color(0xFFD1E4FF);
const _secondaryContainer = Color(0xFFD7E3F8);
const _error = Color(0xFFBA1A1A);

const folioColorScheme = ColorScheme(
  brightness: Brightness.light,
  primary: _primary,
  onPrimary: Color(0xFFFFFFFF),
  primaryContainer: _primaryContainer,
  onPrimaryContainer: Color(0xFF001D36),
  secondary: Color(0xFF535F70),
  onSecondary: Color(0xFFFFFFFF),
  secondaryContainer: _secondaryContainer,
  onSecondaryContainer: Color(0xFF101C2B),
  tertiary: Color(0xFF6B5778),
  onTertiary: Color(0xFFFFFFFF),
  tertiaryContainer: Color(0xFFF2DAFF),
  onTertiaryContainer: Color(0xFF251432),
  error: _error,
  onError: Color(0xFFFFFFFF),
  surface: _surface,
  onSurface: _text,
  onSurfaceVariant: _textVariant,
  outline: Color(0xFF73777F),
  outlineVariant: Color(0xFFC3C7CF),
  surfaceContainerLowest: Color(0xFFFFFFFF),
  surfaceContainerLow: Color(0xFFF3F3F9),
  surfaceContainer: _listContainer,
  surfaceContainerHigh: _fieldContainer,
  surfaceContainerHighest: _inactiveContainer,
  inverseSurface: Color(0xFF2F3033),
  onInverseSurface: Color(0xFFF1F0F4),
  inversePrimary: Color(0xFF9ECAFF),
);

TextTheme _folioTextTheme(TextTheme base) {
  final sized = base.copyWith(
    headlineLarge: const TextStyle(fontSize: 32, height: 40 / 32, fontWeight: FontWeight.w700),
    headlineMedium: const TextStyle(fontSize: 28, height: 36 / 28, fontWeight: FontWeight.w600),
    titleLarge: const TextStyle(fontSize: 22, height: 28 / 22, fontWeight: FontWeight.w600),
    bodyLarge: const TextStyle(fontSize: 16, height: 24 / 16),
    bodyMedium: const TextStyle(fontSize: 14, height: 20 / 14),
    labelMedium: const TextStyle(fontSize: 12, height: 16 / 12),
  );
  return sized.apply(bodyColor: _text, displayColor: _text, fontFamily: 'RobotoFlex');
}

ThemeData buildFolioTheme() {
  final base = ThemeData(useMaterial3: true, colorScheme: folioColorScheme, brightness: Brightness.light, fontFamily: 'RobotoFlex');
  return base.copyWith(
    scaffoldBackgroundColor: _surface,
    textTheme: _folioTextTheme(base.textTheme),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: _fieldContainer,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(28), borderSide: BorderSide.none),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(0, 48),
        shape: const StadiumBorder(),
        disabledBackgroundColor: _inactiveContainer,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(minimumSize: const Size(0, 48), shape: const StadiumBorder()),
    ),
    chipTheme: ChipThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      selectedColor: _secondaryContainer,
      checkmarkColor: const Color(0xFF101C2B),
      side: const BorderSide(color: Color(0xFF73777F)),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: _surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
    ),
  );
}
