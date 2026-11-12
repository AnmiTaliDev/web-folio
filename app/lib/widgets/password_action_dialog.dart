import 'package:material_ui/material_ui.dart';

import '../l10n/app_localizations.dart';
import 'auth_errors.dart';

Future<bool> showPasswordActionDialog(
  BuildContext context, {
  required String title,
  required String body,
  required String actionLabel,
  required Future<void> Function(String password) onSubmit,
  bool destructive = false,
}) async {
  final done = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => _PasswordActionDialog(title: title, body: body, actionLabel: actionLabel, onSubmit: onSubmit, destructive: destructive),
  );
  return done ?? false;
}

class _PasswordActionDialog extends StatefulWidget {
  const _PasswordActionDialog({
    required this.title,
    required this.body,
    required this.actionLabel,
    required this.onSubmit,
    required this.destructive,
  });

  final String title;
  final String body;
  final String actionLabel;
  final Future<void> Function(String password) onSubmit;
  final bool destructive;

  @override
  State<_PasswordActionDialog> createState() => _PasswordActionDialogState();
}

class _PasswordActionDialogState extends State<_PasswordActionDialog> {
  final _password = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    if (_password.text.isEmpty) {
      setState(() => _error = l10n.authErrorEmptyField);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.onSubmit(_password.text);
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() {
          _error = authErrorText(l10n, error);
          _busy = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final scheme = Theme.of(context).colorScheme;
    return AlertDialog(
      title: Text(widget.title),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(widget.body),
          const SizedBox(height: 16),
          TextField(
            key: const Key('confirm-password'),
            controller: _password,
            obscureText: true,
            onSubmitted: (_) => _busy ? null : _submit(),
            decoration: InputDecoration(hintText: l10n.authPassword),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(_error!, key: const Key('confirm-error'), style: TextStyle(color: scheme.error)),
            ),
        ],
      ),
      actions: [
        TextButton(key: const Key('confirm-cancel'), onPressed: () => Navigator.of(context).pop(false), child: Text(l10n.cancel)),
        TextButton(
          key: const Key('confirm-submit'),
          onPressed: _busy ? null : _submit,
          style: widget.destructive ? TextButton.styleFrom(foregroundColor: scheme.error) : null,
          child: Text(widget.actionLabel),
        ),
      ],
    );
  }
}
