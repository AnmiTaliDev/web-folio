import 'package:flutter_test/flutter_test.dart';
import 'package:folio/data/models.dart';
import 'package:folio/screens/profile_screen.dart';
import 'package:material_ui/material_ui.dart';

import 'helpers.dart';

void main() {
  const stats = TasteStats(readCount: 5, likedCount: 3, topGenres: ['fantasy', 'mystery', 'history']);

  testWidgets('shows taste from real stats', (tester) async {
    await pumpScreen(tester, const ProfileScreen(), repository: FakeBookRepository(stats: stats));
    expect(find.text('Алгоритм считает, что вам нравится'), findsOneWidget);
    expect(find.text('Фэнтези'), findsOneWidget);
    expect(find.text('Детектив'), findsOneWidget);
    expect(find.text('История'), findsOneWidget);
    expect(find.text('Прочитано: 5 · Понравилось: 3'), findsOneWidget);
  });

  testWidgets('shows an empty state without ratings', (tester) async {
    await pumpScreen(tester, const ProfileScreen(), repository: FakeBookRepository());
    expect(find.text('Оцените несколько книг, и здесь появятся жанры.'), findsOneWidget);
  });

  testWidgets('lists saved books and removes one from the wishlist', (tester) async {
    final repository = FakeBookRepository();
    repository.wishlistStore.add('b2');
    await pumpScreen(tester, const ProfileScreen(), repository: repository);
    expect(find.text('Хочу прочитать'), findsOneWidget);
    expect(find.byKey(const Key('wishlist-b2')), findsOneWidget);
    expect(find.byKey(const Key('wishlist-empty')), findsNothing);

    await tester.ensureVisible(find.byKey(const Key('wishlist-remove-b2')));
    await tester.tap(find.byKey(const Key('wishlist-remove-b2')));
    await settle(tester);
    expect(repository.wishlistStore, isEmpty);
    expect(find.byKey(const Key('wishlist-empty')), findsOneWidget);
  });

  testWidgets('a signed in user sees the account card with the name and can sign out', (tester) async {
    final auth = FakeAuthRepository();
    await pumpScreen(tester, const ProfileScreen(), repository: FakeBookRepository(), auth: auth);
    expect(find.text('Вы вошли как reader'), findsOneWidget);
    expect(find.byKey(const Key('private-mode-card')), findsNothing);

    await tester.tap(find.byKey(const Key('account-sign-out')));
    await settle(tester);
    expect(auth.calls, ['logout']);
    expect(find.byKey(const Key('private-mode-card')), findsOneWidget);
    expect(find.byKey(const Key('account-card')), findsNothing);
  });

  testWidgets('without an account the profile explains the private mode and offers an account', (tester) async {
    await pumpScreen(
      tester,
      const ProfileScreen(),
      repository: FakeBookRepository(),
      auth: FakeAuthRepository(statusValue: const AuthStatus(registered: false)),
    );
    expect(find.byKey(const Key('private-mode-card')), findsOneWidget);
    expect(find.text('Приватный режим'), findsOneWidget);
    expect(find.byKey(const Key('private-create')), findsOneWidget);
    expect(find.byKey(const Key('private-sign-in')), findsOneWidget);
    expect(find.byKey(const Key('taste-card')), findsNothing);
    expect(find.text('Хочу прочитать'), findsNothing);
  });
}
