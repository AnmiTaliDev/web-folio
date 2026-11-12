import 'package:flutter/services.dart';
import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_ui/material_ui.dart';

import '../l10n/app_localizations.dart';

Future<void> showExportDialog(BuildContext context, String text) {
  final l10n = AppLocalizations.of(context);
  return M3EDialog.show<void>(
    context,
    dialog: Builder(
      builder: (dialogContext) => M3EDialog(
        title: l10n.exportTitle,
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l10n.exportHint),
            const SizedBox(height: 12),
            Flexible(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(dialogContext).colorScheme.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: SingleChildScrollView(
                  child: SelectableText(
                    text,
                    key: const Key('export-text'),
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                  ),
                ),
              ),
            ),
          ],
        ),
        actions: [
          M3EButton.text(
            key: const Key('export-copy'),
            onPressed: () => Clipboard.setData(ClipboardData(text: text)),
            child: Text(l10n.copy),
          ),
          M3EButton.filled(key: const Key('export-close'), onPressed: () => Navigator.of(dialogContext).pop(), child: Text(l10n.close)),
        ],
      ),
    ),
  );
}
