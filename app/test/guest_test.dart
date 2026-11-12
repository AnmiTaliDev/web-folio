import 'package:flutter_test/flutter_test.dart';
import 'package:folio/data/models.dart';
import 'package:folio/screens/book_screen.dart';
import 'package:folio/screens/chat_screen.dart';
import 'package:folio/screens/home_screen.dart';
import 'package:material_ui/material_ui.dart';

import 'helpers.dart';

FakeAuthRepository guestAuth() => FakeAuthRepository(statusValue: const AuthStatus(registered: false));

const _described = BookSummary(id: 'b1', title: 'Dune', authors: ['Frank Herbert'], genres: ['science_fiction'], description: 'Desert planet.');

void main() {
  testWidgets('home without an account shows the private badge, popular books and a gentle prompt', (tester) async {
    await pumpScreen(tester, const HomeScreen(), repository: FakeBookRepository(), auth: guestAuth());
    expect(find.byKey(const Key('private-badge')), findsOneWidget);
    expect(find.text('Популярное'), findsOneWidget);
    expect(find.byKey(const Key('popular-b1')), findsOneWidget);
    expect(find.byKey(const Key('popular-b2')), findsOneWidget);
    expect(find.byKey(const Key('account-prompt')), findsOneWidget);
    expect(find.byKey(const Key('like-b1')), findsNothing);
    expect(find.byKey(const Key('book-of-day')), findsNothing);
  });

  testWidgets('the prompt can be dismissed and stays dismissed', (tester) async {
    await pumpScreen(tester, const HomeScreen(), repository: FakeBookRepository(), auth: guestAuth());
    await tester.tap(find.byKey(const Key('prompt-dismiss')));
    await settle(tester);
    expect(find.byKey(const Key('account-prompt')), findsNothing);
    expect(find.byKey(const Key('popular-b1')), findsOneWidget);
  });

  testWidgets('search works without an account and says when nothing is found', (tester) async {
    await pumpScreen(tester, const HomeScreen(), repository: FakeBookRepository(), auth: guestAuth());
    await tester.enterText(find.byKey(const Key('catalog-search')), 'Emma');
    await tester.pump(const Duration(milliseconds: 400));
    await settle(tester);
    expect(find.byKey(const Key('result-b2')), findsOneWidget);
    expect(find.byKey(const Key('result-b1')), findsNothing);
    expect(find.text('Популярное'), findsNothing);

    await tester.enterText(find.byKey(const Key('catalog-search')), 'zzz');
    await tester.pump(const Duration(milliseconds: 400));
    await settle(tester);
    expect(find.byKey(const Key('search-empty')), findsOneWidget);
    expect(find.text('Не найдено'), findsOneWidget);
  });

  testWidgets('home with an account is the personal picks screen with a search field', (tester) async {
    await pumpScreen(tester, const HomeScreen(), repository: FakeBookRepository(), api: FakeApiClient(), auth: FakeAuthRepository());
    expect(find.byKey(const Key('catalog-search')), findsOneWidget);
    expect(find.byKey(const Key('private-badge')), findsNothing);
    expect(find.byKey(const Key('account-prompt')), findsNothing);
  });

  testWidgets('searching on the signed in home replaces the picks with results', (tester) async {
    await pumpScreen(tester, const HomeScreen(), repository: FakeBookRepository(), api: FakeApiClient(), auth: FakeAuthRepository());
    await tester.enterText(find.byKey(const Key('catalog-search')), 'dune');
    await tester.pump(const Duration(milliseconds: 400));
    await settle(tester);
    expect(find.byKey(const Key('result-b1')), findsOneWidget);
    expect(find.text('Рекомендации для вас'), findsNothing);
  });

  testWidgets('the chat is locked without an account and offers an account', (tester) async {
    await pumpScreen(tester, const ChatScreen(), repository: FakeBookRepository(), auth: guestAuth());
    expect(find.byKey(const Key('account-required')), findsOneWidget);
    expect(find.text('Чат с ИИ-библиотекарём доступен с аккаунтом.'), findsOneWidget);
    expect(find.byKey(const Key('chat-input')), findsNothing);
    expect(find.byKey(const Key('required-create')), findsOneWidget);
    expect(find.byKey(const Key('required-sign-in')), findsOneWidget);
  });

  testWidgets('a book page without an account shows the catalog description and an invitation, no personal actions', (tester) async {
    await pumpScreen(tester, const BookScreen(bookId: 'b1'), repository: FakeBookRepository(books: const [_described]), auth: guestAuth());
    expect(find.text('Dune'), findsOneWidget);
    expect(find.byKey(const Key('guest-book-description')), findsOneWidget);
    expect(find.text('Desert planet.'), findsOneWidget);
    expect(find.byKey(const Key('guest-book-prompt')), findsOneWidget);
    expect(find.byKey(const Key('wishlist-button')), findsNothing);
    expect(find.byKey(const Key('like-button')), findsNothing);
  });

  testWidgets('a book page without a description says so', (tester) async {
    await pumpScreen(tester, const BookScreen(bookId: 'b2'), repository: FakeBookRepository(), auth: guestAuth());
    expect(find.text('Описания этой книги в каталоге нет.'), findsOneWidget);
  });
}
