import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../l10n/app_localizations.dart';

class LikeButtons extends StatelessWidget {
  const LikeButtons({super.key, required this.value, required this.onLike, required this.onDislike});

  final int? value;
  final VoidCallback onLike;
  final VoidCallback onDislike;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return SizedBox(
      height: 48,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          M3EIconButton(
            key: const Key('like-button'),
            icon: const Icon(Symbols.thumb_up_rounded),
            selectedIcon: const Icon(Symbols.thumb_up_rounded, fill: 1),
            tooltip: l10n.like,
            variant: M3EIconButtonVariant.tonal,
            isSelected: value == 1,
            isGroupConnected: true,
            isFirstInGroup: true,
            isLastInGroup: false,
            onPressed: onLike,
          ),
          const SizedBox(width: 2),
          M3EIconButton(
            key: const Key('dislike-button'),
            icon: const Icon(Symbols.thumb_down_rounded),
            selectedIcon: const Icon(Symbols.thumb_down_rounded, fill: 1),
            tooltip: l10n.dislike,
            variant: M3EIconButtonVariant.tonal,
            isSelected: value == -1,
            isGroupConnected: true,
            isFirstInGroup: false,
            isLastInGroup: true,
            onPressed: onDislike,
          ),
        ],
      ),
    );
  }
}
