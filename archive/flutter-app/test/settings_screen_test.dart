import 'package:flutter_test/flutter_test.dart';
import 'package:folio/data/models.dart';
import 'package:folio/screens/settings_screen.dart';
import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_ui/material_ui.dart';

import 'helpers.dart';

Future<void> tapRow(WidgetTester tester, String key) async {
  await tester.ensureVisible(find.byKey(Key(key)));
  await tester.tap(find.byKey(Key(key)));
  await settle(tester);
}

void main() {
  testWidgets('privacy switches write to the profile', (tester) async {
    final repository = FakeBookRepository();
    await pumpScreen(tester, const SettingsScreen(), repository: repository);
    M3ESwitch likes() => tester.widget<M3ESwitch>(find.descendant(of: find.byKey(const Key('switch-likes')), matching: find.byType(M3ESwitch)));
    expect(likes().value, isTrue);

    await tester.ensureVisible(find.byKey(const Key('switch-likes')));
    await tester.tap(find.byKey(const Key('switch-likes')));
    await settle(tester);
    expect(likes().value, isFalse);
    expect(repository.calls, contains('personalization:false'));

    await tester.tap(find.byKey(const Key('switch-ai')));
    await settle(tester);
    expect(repository.calls, contains('ai:false'));
  });

  testWidgets('the AI descriptions switch is disabled with a note when AI is not available', (tester) async {
    await pumpScreen(tester, const SettingsScreen(), repository: FakeBookRepository(), api: FakeApiClient(aiValue: false));
    expect(find.text('ИИ не подключён на сервере'), findsOneWidget);
    final toggle = tester.widget<M3ESwitch>(find.descendant(of: find.byKey(const Key('switch-ai')), matching: find.byType(M3ESwitch)));
    expect(toggle.onChanged, isNull);
    expect(toggle.value, isFalse);
  });

  testWidgets('change password validates and sends both passwords', (tester) async {
    final auth = FakeAuthRepository();
    await pumpScreen(tester, const SettingsScreen(), repository: FakeBookRepository(), auth: auth);
    await tapRow(tester, 'settings-password');
    await tester.enterText(find.byKey(const Key('password-current')), 'old password');
    await tester.enterText(find.byKey(const Key('password-new')), 'short');
    await tester.tap(find.byKey(const Key('password-submit')));
    await settle(tester);
    expect(find.text('Пароль должен быть не короче 8 символов.'), findsOneWidget);
    expect(auth.calls, isEmpty);

    await tester.enterText(find.byKey(const Key('password-new')), 'brand new password');
    await tester.tap(find.byKey(const Key('password-submit')));
    await settle(tester);
    expect(auth.calls, ['change:old password:brand new password']);
    expect(find.text('Пароль изменён'), findsOneWidget);
  });

  testWidgets('a new recovery code needs the password and is shown once', (tester) async {
    final auth = FakeAuthRepository();
    await pumpScreen(tester, const SettingsScreen(), repository: FakeBookRepository(), auth: auth);
    await tapRow(tester, 'settings-recovery');
    await tester.tap(find.byKey(const Key('confirm-submit')));
    await settle(tester);
    expect(find.text('Заполните поле.'), findsOneWidget);
    expect(auth.calls, isEmpty);

    await tester.enterText(find.byKey(const Key('confirm-password')), 'secret password');
    await tester.tap(find.byKey(const Key('confirm-submit')));
    await settle(tester);
    expect(auth.calls, ['recovery-code:secret password']);
    expect(find.text('NEW1-NEW2-NEW3-NEW4-NEW5'), findsOneWidget);
  });

  testWidgets('a wrong password shows an error and keeps the dialog open', (tester) async {
    final auth = FakeAuthRepository(failWith: const ApiFailure(401, 'invalid_credentials'));
    await pumpScreen(tester, const SettingsScreen(), repository: FakeBookRepository(), auth: auth);
    await tapRow(tester, 'settings-recovery');
    await tester.enterText(find.byKey(const Key('confirm-password')), 'wrong password');
    await tester.tap(find.byKey(const Key('confirm-submit')));
    await settle(tester);
    expect(find.text('Неверный логин или пароль.'), findsOneWidget);
    expect(find.byKey(const Key('confirm-password')), findsOneWidget);
  });

  testWidgets('shows the stored data and does not offer to hide the hashes as data', (tester) async {
    final auth = FakeAuthRepository(exportText: '{\n  "account": {"username": "reader"}\n}');
    await pumpScreen(tester, const SettingsScreen(), repository: FakeBookRepository(), auth: auth);
    await tapRow(tester, 'settings-export');
    expect(auth.calls, ['export']);
    expect(find.byKey(const Key('export-text')), findsOneWidget);
    expect(find.textContaining('"username": "reader"'), findsOneWidget);
    await tester.tap(find.byKey(const Key('export-close')));
    await settle(tester);
    expect(find.byKey(const Key('export-text')), findsNothing);
  });

  testWidgets('sign out everywhere and sign out call the server', (tester) async {
    final auth = FakeAuthRepository();
    await pumpScreen(tester, const SettingsScreen(), repository: FakeBookRepository(), auth: auth);
    await tapRow(tester, 'settings-logout-all');
    expect(auth.calls, ['logout-all']);
  });

  testWidgets('deleting the account asks for the password and cancels cleanly', (tester) async {
    final auth = FakeAuthRepository();
    await pumpScreen(tester, const SettingsScreen(), repository: FakeBookRepository(), auth: auth);
    await tapRow(tester, 'settings-delete');
    expect(find.text('Удалить аккаунт?'), findsOneWidget);
    await tester.tap(find.byKey(const Key('confirm-cancel')));
    await settle(tester);
    expect(auth.calls, isEmpty);

    await tapRow(tester, 'settings-delete');
    await tester.enterText(find.byKey(const Key('confirm-password')), 'secret password');
    await tester.tap(find.byKey(const Key('confirm-submit')));
    await settle(tester);
    expect(auth.calls, ['delete:secret password']);
    expect(find.byKey(const Key('private-mode-card')), findsOneWidget);
  });

  testWidgets('without an account settings explain the private mode and still describe how it works', (tester) async {
    await pumpScreen(
      tester,
      const SettingsScreen(),
      repository: FakeBookRepository(),
      auth: FakeAuthRepository(statusValue: const AuthStatus(registered: false)),
    );
    expect(find.byKey(const Key('private-mode-card')), findsOneWidget);
    expect(find.byKey(const Key('switch-likes')), findsNothing);
    expect(find.byKey(const Key('settings-delete')), findsNothing);
    expect(find.text('Нейросеть'), findsOneWidget);
  });
}
