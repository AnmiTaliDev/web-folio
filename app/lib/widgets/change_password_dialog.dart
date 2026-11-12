import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import '../data/providers.dart';
import '../l10n/app_localizations.dart';
import 'auth_errors.dart';

Future<bool> showChangePasswordDialog(BuildContext context) async {
  final changed = await showDialog<bool>(context: context, builder: (dialogContext) => const _ChangePasswordDialog());
  return changed ?? false;
}

class _ChangePasswordDialog extends ConsumerStatefulWidget {
  const _ChangePasswordDialog();

  @override
  ConsumerState<_ChangePasswordDialog> createState() => _ChangePasswordDialogState();
}

class _ChangePasswordDialogState extends ConsumerState<_ChangePasswordDialog> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    if (_current.text.isEmpty) {
      setState(() => _error = l10n.authErrorEmptyField);
      return;
    }
    if (!isValidPassword(_next.text)) {
      setState(() => _error = l10n.authErrorShortPassword);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authActionsProvider.notifier).changePassword(_current.text, _next.text);
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
    return AlertDialog(
      title: Text(l10n.changePassword),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            key: const Key('password-current'),
            controller: _current,
            obscureText: true,
            decoration: InputDecoration(hintText: l10n.authCurrentPassword),
          ),
          const SizedBox(height: 12),
          TextField(
            key: const Key('password-new'),
            controller: _next,
            obscureText: true,
            decoration: InputDecoration(hintText: l10n.authNewPassword),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(_error!, key: const Key('password-error'), style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(false), child: Text(l10n.cancel)),
        FilledButton(key: const Key('password-submit'), onPressed: _busy ? null : _submit, child: Text(l10n.changePassword)),
      ],
    );
  }
}
