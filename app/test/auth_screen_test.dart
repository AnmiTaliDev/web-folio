import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:folio/data/models.dart';
import 'package:folio/screens/auth_screen.dart';

import 'helpers.dart';

Future<void> pumpAuth(
  WidgetTester tester, {
  required AuthMode mode,
  required FakeAuthRepository auth,
  List<String>? events,
}) {
  return pumpScreen(
    tester,
    AuthScreen(
      initialMode: mode,
      onDone: () => events?.add('done'),
      onBack: () => events?.add('back'),
    ),
    repository: FakeBookRepository(),
    auth: auth,
  );
}

Future<void> fill(WidgetTester tester, {String? username, String? password, String? recovery}) async {
  if (username != null) {
    await tester.enterText(find.byKey(const Key('auth-username')), username);
  }
  if (recovery != null) {
    await tester.enterText(find.byKey(const Key('auth-recovery')), recovery);
  }
  if (password != null) {
    await tester.enterText(find.byKey(const Key('auth-password')), password);
  }
}

Future<void> submit(WidgetTester tester) async {
  await tester.ensureVisible(find.byKey(const Key('auth-submit')));
  await tester.tap(find.byKey(const Key('auth-submit')));
  await settle(tester);
}

void main() {
  testWidgets('registration validates the username and the password before calling the server', (tester) async {
    final auth = FakeAuthRepository();
    await pumpAuth(tester, mode: AuthMode.register, auth: auth);

    await fill(tester, username: 'a', password: 'long enough password');
    await submit(tester);
    expect(find.text('Логин: 3-32 символа, буквы, цифры, точка, дефис, подчёркивание.'), findsOneWidget);
    expect(find.byKey(const Key('auth-error')), findsOneWidget);

    await fill(tester, username: 'reader', password: 'short');
    await submit(tester);
    expect(find.text('Пароль должен быть не короче 8 символов.'), findsOneWidget);
    expect(auth.calls, isEmpty);
  });

  testWidgets('registration shows the recovery code once and then finishes', (tester) async {
    final auth = FakeAuthRepository();
    final events = <String>[];
    await pumpAuth(tester, mode: AuthMode.register, auth: auth, events: events);

    await fill(tester, username: ' Reader ', password: 'secret password');
    await submit(tester);
    expect(auth.calls, ['register:reader:secret password']);
    expect(find.byKey(const Key('recovery-code')), findsOneWidget);
    expect(find.text('AAAA-BBBB-CCCC-DDDD-EEEE'), findsOneWidget);
    expect(events, isEmpty);

    await tester.tap(find.byKey(const Key('recovery-saved')));
    await settle(tester);
    expect(events, ['done']);
  });

  testWidgets('login sends the normalized username and finishes', (tester) async {
    final auth = FakeAuthRepository();
    final events = <String>[];
    await pumpAuth(tester, mode: AuthMode.login, auth: auth, events: events);
    expect(find.text('Данные текущего гостя будут удалены, если вы войдёте в другой аккаунт.'), findsOneWidget);

    await fill(tester, username: 'READER', password: 'secret password');
    await submit(tester);
    expect(auth.calls, ['login:reader:secret password']);
    expect(events, ['done']);
  });

  testWidgets('server errors map to readable messages and keep the form', (tester) async {
    final cases = {
      'invalid_credentials': 'Неверный логин или пароль.',
      'throttled': 'Слишком много попыток. Попробуйте через 15 минут.',
      'username_taken': 'Этот логин занят.',
      'network_error': 'Не удалось выполнить действие. Попробуйте ещё раз.',
    };
    for (final entry in cases.entries) {
      final events = <String>[];
      await pumpAuth(tester, mode: AuthMode.login, auth: FakeAuthRepository(failWith: ApiFailure(401, entry.key)), events: events);
      await fill(tester, username: 'reader', password: 'secret password');
      await submit(tester);
      expect(find.text(entry.value), findsOneWidget, reason: entry.key);
      expect(events, isEmpty);
    }
  });

  testWidgets('modes switch between login, registration and recovery', (tester) async {
    final auth = FakeAuthRepository();
    await pumpAuth(tester, mode: AuthMode.login, auth: auth);
    expect(find.text('Вход'), findsOneWidget);
    expect(find.byKey(const Key('auth-recovery')), findsNothing);

    await tester.ensureVisible(find.byKey(const Key('auth-to-recover')));
    await tester.tap(find.byKey(const Key('auth-to-recover')));
    await settle(tester);
    expect(find.text('Восстановление доступа'), findsOneWidget);
    expect(find.byKey(const Key('auth-recovery')), findsOneWidget);

    await fill(tester, username: 'reader', recovery: '', password: 'fresh password 1');
    await submit(tester);
    expect(find.text('Заполните поле.'), findsOneWidget);
    expect(auth.calls, isEmpty);

    await fill(tester, recovery: 'AAAA-BBBB-CCCC-DDDD-EEEE');
    await submit(tester);
    expect(auth.calls, ['recover:reader:AAAA-BBBB-CCCC-DDDD-EEEE:fresh password 1']);
    expect(find.text('FFFF-0000-1111-2222-3333'), findsOneWidget);
  });

  testWidgets('back button calls the back callback', (tester) async {
    final events = <String>[];
    await pumpAuth(tester, mode: AuthMode.login, auth: FakeAuthRepository(), events: events);
    await tester.tap(find.byKey(const Key('auth-back')));
    await settle(tester);
    expect(events, ['back']);
  });
}
