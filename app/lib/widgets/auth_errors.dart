import '../data/models.dart';
import '../l10n/app_localizations.dart';

String authErrorText(AppLocalizations l10n, Object error) {
  if (error is! ApiFailure) {
    return l10n.authErrorGeneric;
  }
  return switch (error.code) {
    'invalid_credentials' => l10n.authErrorInvalid,
    'username_taken' => l10n.authErrorTaken,
    'throttled' => l10n.authErrorThrottled,
    'invalid_recovery' => l10n.authErrorInvalidRecovery,
    _ => l10n.authErrorGeneric,
  };
}

final _usernamePattern = RegExp(r'^[a-z0-9_.-]{3,32}$');

String normalizeUsername(String value) => value.trim().toLowerCase();

bool isValidUsername(String value) => _usernamePattern.hasMatch(normalizeUsername(value));

bool isValidPassword(String value) => value.length >= 8 && value.length <= 128;
