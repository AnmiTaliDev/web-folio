import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../l10n/app_localizations.dart';

Future<void> showRecoveryCodeDialog(BuildContext context, String code) {
  final l10n = AppLocalizations.of(context);
  return showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (dialogContext) => AlertDialog(
      title: Text(l10n.recoveryCodeTitle),
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
              borderRadius: BorderRadius.circular(16),
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
        TextButton(
          key: const Key('recovery-copy'),
          onPressed: () => Clipboard.setData(ClipboardData(text: code)),
          child: Text(l10n.copy),
        ),
        FilledButton(
          key: const Key('recovery-saved'),
          onPressed: () => Navigator.of(dialogContext).pop(),
          child: Text(l10n.recoveryCodeSaved),
        ),
      ],
    ),
  );
}
