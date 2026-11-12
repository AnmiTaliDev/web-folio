import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_ui/material_ui.dart';

import '../data/providers.dart';
import '../l10n/app_localizations.dart';
import 'auth_errors.dart';

Future<bool> showChangePasswordDialog(BuildContext context) async {
  final changed = await M3EDialog.show<bool>(context, dialog: const _ChangePasswordDialog());
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
    return M3EDialog(
      title: l10n.changePassword,
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          M3ETextField(
            key: const Key('password-current'),
            controller: _current,
            label: l10n.authCurrentPassword,
            obscureText: true,
            showPasswordToggle: true,
          ),
          const SizedBox(height: 12),
          M3ETextField(
            key: const Key('password-new'),
            controller: _next,
            label: l10n.authNewPassword,
            obscureText: true,
            showPasswordToggle: true,
            errorText: _error,
          ),
        ],
      ),
      actions: [
        M3EButton.text(onPressed: () => Navigator.of(context).pop(false), child: Text(l10n.cancel)),
        M3EButton.filled(key: const Key('password-submit'), onPressed: _busy ? null : _submit, child: Text(l10n.changePassword)),
      ],
    );
  }
}
