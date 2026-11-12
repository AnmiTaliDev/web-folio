import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:folio/data/api_client.dart';
import 'package:folio/screens/chat_screen.dart';

import 'helpers.dart';

void main() {
  final api = FakeApiClient(
    chatEvents: const [
      ChatStreamEvent('books', {
        'books': [
          {
            'bookId': 'b1',
            'title': 'Dune',
            'authors': ['Frank Herbert'],
            'genres': ['science_fiction'],
          },
        ],
        'context': {
          'interests': ['fantasy', 'mystery'],
          'likedCount': 3,
          'dislikedCount': 0,
        },
      }),
      ChatStreamEvent('token', {'text': 'Try '}),
      ChatStreamEvent('token', {'text': 'Dune.'}),
      ChatStreamEvent('done', {}),
    ],
  );

  testWidgets('shows the permanent disclaimer and the quick suggestions', (tester) async {
    await pumpScreen(tester, const ChatScreen(), repository: FakeBookRepository(), api: api);
    expect(find.byKey(const Key('chat-empty')), findsOneWidget);
    expect(find.byKey(const Key('chat-disclaimer')), findsOneWidget);
    expect(find.text('ИИ может ошибаться. Проверяйте книги в каталоге.'), findsOneWidget);
    expect(find.text('Что-то полегче'), findsOneWidget);
    expect(find.text('Другие авторы'), findsOneWidget);
    expect(find.text('Покороче'), findsOneWidget);
  });

  testWidgets('sends a message, streams the answer, shows verified books and the profile line', (tester) async {
    await pumpScreen(tester, const ChatScreen(), repository: FakeBookRepository(), api: api);
    await tester.enterText(find.byKey(const Key('chat-input')), 'something light');
    await tester.tap(find.byKey(const Key('chat-send')));
    await settle(tester);
    expect(api.sentMessages, ['something light']);
    expect(find.byKey(const Key('chat-empty')), findsNothing);
    expect(find.text('something light'), findsOneWidget);
    expect(find.text('Try Dune.'), findsOneWidget);
    expect(find.text('Dune'), findsOneWidget);
    expect(find.text('Учтено из профиля: Фэнтези, Детектив, понравилось книг: 3'), findsOneWidget);
  });

  testWidgets('a quick suggestion sends its text and the book card adds to the wishlist', (tester) async {
    final repository = FakeBookRepository();
    await pumpScreen(tester, const ChatScreen(), repository: repository, api: api);
    await tester.tap(find.text('Покороче'));
    await settle(tester);
    expect(api.sentMessages.last, 'Покороче');
    await tester.tap(find.byKey(const Key('chat-wishlist-b1')));
    await settle(tester);
    expect(repository.wishlistStore, contains('b1'));
  });
}
