import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../config.dart';
import '../l10n/app_localizations.dart';

class AccountRequired extends StatelessWidget {
  const AccountRequired({super.key, required this.message, required this.onCreate, required this.onSignIn});

  final String message;
  final VoidCallback onCreate;
  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: authMaxWidth),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Symbols.lock_rounded, size: 40, color: scheme.primary),
              const SizedBox(height: 12),
              Text(message, key: const Key('account-required'), textAlign: TextAlign.center, style: textTheme.bodyLarge),
              const SizedBox(height: 16),
              M3EButton.filled(
                key: const Key('required-create'),
                size: M3EButtonSize.md,
                onPressed: onCreate,
                child: Text(l10n.createAccount),
              ),
              const SizedBox(height: 8),
              M3EButton.text(key: const Key('required-sign-in'), onPressed: onSignIn, child: Text(l10n.signIn)),
            ],
          ),
        ),
      ),
    );
  }
}
