import 'package:flutter/services.dart';
import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../l10n/app_localizations.dart';

Future<void> showRecoveryCodeDialog(BuildContext context, String code) {
  final l10n = AppLocalizations.of(context);
  return M3EDialog.show<void>(
    context,
    barrierDismissible: false,
    dialog: Builder(
      builder: (dialogContext) => M3EDialog(
        title: l10n.recoveryCodeTitle,
        icon: const Icon(Symbols.shield_lock_rounded),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l10n.recoveryCodeBody),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(dialogContext).colorScheme.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(20),
              ),
              child: SelectableText(
                code,
                key: const Key('recovery-code'),
                style: Theme.of(dialogContext).textTheme.titleMedium?.copyWith(letterSpacing: 1.5),
              ),
            ),
          ],
        ),
        actions: [
          M3EButton.text(
            key: const Key('recovery-copy'),
            onPressed: () => Clipboard.setData(ClipboardData(text: code)),
            child: Text(l10n.copy),
          ),
          M3EButton.filled(
            key: const Key('recovery-saved'),
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: Text(l10n.recoveryCodeSaved),
          ),
        ],
      ),
    ),
  );
}
