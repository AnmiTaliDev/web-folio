import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:folio/data/models.dart';
import 'package:folio/screens/profile_screen.dart';
import 'package:folio/widgets/account_card.dart';

import 'helpers.dart';

void main() {
  testWidgets('a guest sees the invitation to create an account or sign in', (tester) async {
    await pumpScreen(tester, const ProfileScreen(), repository: FakeBookRepository(), auth: FakeAuthRepository());
    expect(find.byKey(const Key('account-guest')), findsOneWidget);
    expect(find.byKey(const Key('account-create')), findsOneWidget);
    expect(find.byKey(const Key('account-sign-in')), findsOneWidget);
    expect(find.byKey(const Key('account-sign-out')), findsNothing);
  });

  testWidgets('a registered user sees the name and can sign out', (tester) async {
    final auth = FakeAuthRepository(statusValue: const AuthStatus(registered: true, username: 'reader'));
    await pumpScreen(tester, const ProfileScreen(), repository: FakeBookRepository(), auth: auth);
    expect(find.text('Вы вошли как reader'), findsOneWidget);
    expect(find.byKey(const Key('account-create')), findsNothing);

    await tester.tap(find.byKey(const Key('account-sign-out')));
    await settle(tester);
    expect(auth.calls, ['logout']);
  });

  testWidgets('sign out starts a new guest session', (tester) async {
    final repository = FakeBookRepository();
    final auth = FakeAuthRepository(statusValue: const AuthStatus(registered: true, username: 'reader'));
    await pumpScreen(tester, const ProfileScreen(), repository: repository, auth: auth);
    await tester.tap(find.byKey(const Key('account-sign-out')));
    await settle(tester);
    expect(repository.calls, contains('session'));
    expect(find.byKey(const Key('account-guest')), findsOneWidget);
  });

  testWidgets('change password validates, sends the passwords and confirms', (tester) async {
    final auth = FakeAuthRepository(statusValue: const AuthStatus(registered: true, username: 'reader'));
    await pumpScreen(tester, const ProfileScreen(), repository: FakeBookRepository(), auth: auth);

    await tester.tap(find.byKey(const Key('account-change-password')));
    await settle(tester);
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

  testWidgets('change password shows the server error and keeps the dialog open', (tester) async {
    final auth = FakeAuthRepository(
      statusValue: const AuthStatus(registered: true, username: 'reader'),
      failWith: const ApiFailure(401, 'invalid_credentials'),
    );
    await pumpScreen(tester, const ProfileScreen(), repository: FakeBookRepository(), auth: auth);
    await tester.tap(find.byKey(const Key('account-change-password')));
    await settle(tester);
    await tester.enterText(find.byKey(const Key('password-current')), 'wrong password');
    await tester.enterText(find.byKey(const Key('password-new')), 'brand new password');
    await tester.tap(find.byKey(const Key('password-submit')));
    await settle(tester);
    expect(find.text('Неверный логин или пароль.'), findsOneWidget);
    expect(find.byType(AccountCard), findsOneWidget);
  });
}
