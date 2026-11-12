import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../l10n/app_localizations.dart';

class LikeButtons extends StatelessWidget {
  const LikeButtons({super.key, required this.value, required this.onLike, required this.onDislike, this.size = 44});

  final int? value;
  final VoidCallback onLike;
  final VoidCallback onDislike;
  final double size;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _RatingButton(
          key: const Key('like-button'),
          icon: Symbols.thumb_up_rounded,
          tooltip: l10n.like,
          selected: value == 1,
          size: size,
          idleRadius: const BorderRadius.horizontal(left: Radius.circular(22), right: Radius.circular(6)),
          onPressed: onLike,
        ),
        const SizedBox(width: 2),
        _RatingButton(
          key: const Key('dislike-button'),
          icon: Symbols.thumb_down_rounded,
          tooltip: l10n.dislike,
          selected: value == -1,
          size: size,
          idleRadius: const BorderRadius.horizontal(left: Radius.circular(6), right: Radius.circular(22)),
          onPressed: onDislike,
        ),
      ],
    );
  }
}

class _RatingButton extends StatelessWidget {
  const _RatingButton({
    super.key,
    required this.icon,
    required this.tooltip,
    required this.selected,
    required this.size,
    required this.idleRadius,
    required this.onPressed,
  });

  final IconData icon;
  final String tooltip;
  final bool selected;
  final double size;
  final BorderRadius idleRadius;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final background = selected ? scheme.primary : scheme.surfaceContainerHighest;
    final foreground = selected ? scheme.onPrimary : scheme.onSurfaceVariant;
    return Semantics(
      button: true,
      selected: selected,
      label: tooltip,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 350),
        curve: Curves.elasticOut,
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: background,
          borderRadius: selected ? BorderRadius.circular(size / 2) : idleRadius,
        ),
        child: Material(
          type: MaterialType.transparency,
          child: InkWell(
            onTap: onPressed,
            customBorder: RoundedRectangleBorder(borderRadius: idleRadius),
            child: Icon(icon, size: 22, fill: selected ? 1 : 0, color: foreground),
          ),
        ),
      ),
    );
  }
}
