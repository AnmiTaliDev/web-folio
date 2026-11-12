import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../config.dart';
import '../data/providers.dart';
import '../l10n/app_localizations.dart';
import '../widgets/auth_errors.dart';
import '../widgets/recovery_code_dialog.dart';

enum AuthMode { register, login, recover }

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key, required this.initialMode, required this.onDone, required this.onBack});

  final AuthMode initialMode;
  final VoidCallback onDone;
  final VoidCallback onBack;

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _username = TextEditingController();
  final _password = TextEditingController();
  final _recoveryCode = TextEditingController();
  late AuthMode _mode = widget.initialMode;
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    _recoveryCode.dispose();
    super.dispose();
  }

  void _switchTo(AuthMode mode) {
    setState(() {
      _mode = mode;
      _error = null;
    });
  }

  String? _validate(AppLocalizations l10n) {
    if (!isValidUsername(_username.text)) {
      return l10n.authErrorBadUsername;
    }
    if (_mode == AuthMode.recover && _recoveryCode.text.trim().isEmpty) {
      return l10n.authErrorEmptyField;
    }
    if (_mode == AuthMode.login) {
      return _password.text.isEmpty ? l10n.authErrorEmptyField : null;
    }
    return isValidPassword(_password.text) ? null : l10n.authErrorShortPassword;
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    final problem = _validate(l10n);
    if (problem != null) {
      setState(() => _error = problem);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final actions = ref.read(authActionsProvider.notifier);
    final username = normalizeUsername(_username.text);
    try {
      switch (_mode) {
        case AuthMode.register:
          final code = await actions.register(username, _password.text);
          if (mounted) {
            await showRecoveryCodeDialog(context, code);
          }
        case AuthMode.login:
          await actions.login(username, _password.text);
        case AuthMode.recover:
          final code = await actions.recover(username, _recoveryCode.text.trim(), _password.text);
          if (mounted) {
            await showRecoveryCodeDialog(context, code);
          }
      }
      if (mounted) {
        widget.onDone();
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _error = authErrorText(l10n, error));
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final title = switch (_mode) {
      AuthMode.register => l10n.authModeRegister,
      AuthMode.login => l10n.authModeLogin,
      AuthMode.recover => l10n.authModeRecover,
    };
    final submitLabel = switch (_mode) {
      AuthMode.register => l10n.authSubmitRegister,
      AuthMode.login => l10n.authSubmitLogin,
      AuthMode.recover => l10n.authSubmitRecover,
    };

    return Scaffold(
      appBar: M3EAppBar.top(
        titleText: title,
        leading: M3EIconButton(
          key: const Key('auth-back'),
          variant: M3EIconButtonVariant.standard,
          tooltip: l10n.back,
          onPressed: widget.onBack,
          icon: const Icon(Symbols.arrow_back_rounded),
        ),
      ),
      body: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: authMaxWidth),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              if (_mode == AuthMode.register)
                Text(l10n.authRegisterHint, style: textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant)),
              const SizedBox(height: 16),
              M3ETextField(
                key: const Key('auth-username'),
                controller: _username,
                label: l10n.authUsername,
                leading: const Icon(Symbols.person_rounded),
              ),
              if (_mode == AuthMode.recover) ...[
                const SizedBox(height: 12),
                M3ETextField(
                  key: const Key('auth-recovery'),
                  controller: _recoveryCode,
                  label: l10n.authRecoveryCode,
                  leading: const Icon(Symbols.shield_lock_rounded),
                ),
              ],
              const SizedBox(height: 12),
              M3ETextField(
                key: const Key('auth-password'),
                controller: _password,
                label: _mode == AuthMode.recover ? l10n.authNewPassword : l10n.authPassword,
                leading: const Icon(Symbols.key_rounded),
                obscureText: true,
                showPasswordToggle: true,
                onSubmitted: (_) => _busy ? null : _submit(),
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    _error!,
                    key: const Key('auth-error'),
                    style: textTheme.bodyMedium?.copyWith(color: scheme.error),
                  ),
                ),
              const SizedBox(height: 20),
              M3EButton.filled(
                key: const Key('auth-submit'),
                size: M3EButtonSize.md,
                onPressed: _busy ? null : _submit,
                child: Text(submitLabel),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  if (_mode != AuthMode.register)
                    M3EButton.text(
                      key: const Key('auth-to-register'),
                      onPressed: () => _switchTo(AuthMode.register),
                      child: Text(l10n.createAccount),
                    ),
                  if (_mode != AuthMode.login)
                    M3EButton.text(key: const Key('auth-to-login'), onPressed: () => _switchTo(AuthMode.login), child: Text(l10n.signIn)),
                  if (_mode == AuthMode.login)
                    M3EButton.text(
                      key: const Key('auth-to-recover'),
                      onPressed: () => _switchTo(AuthMode.recover),
                      child: Text(l10n.authForgot),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
