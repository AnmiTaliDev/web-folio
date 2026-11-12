import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:folio/data/models.dart';
import 'package:folio/screens/picks_screen.dart';

import 'helpers.dart';

void main() {
  final api = FakeApiClient(
    bookOfDayValue: const BookOfDay(book: dune, score: 0.87, description: 'A desert planet story.', aiGenerated: true),
    recommendationList: const [
      Recommendation(book: dune, score: 0.87, rank: 1),
      Recommendation(book: emma, score: 0.42, rank: 2),
    ],
  );

  testWidgets('shows the book of the day and the top list from API data', (tester) async {
    await pumpScreen(tester, const PicksScreen(), repository: FakeBookRepository(), api: api);
    expect(find.byKey(const Key('book-of-day')), findsOneWidget);
    expect(find.text('87% совпадение'), findsOneWidget);
    expect(find.text('A desert planet story.'), findsOneWidget);
    expect(find.text('Описание сгенерировано ИИ'), findsOneWidget);
    expect(find.text('Emma'), findsOneWidget);
    expect(find.text('1 · 42%'), findsOneWidget);
    expect(find.text('Рекомендации для вас'), findsOneWidget);
    expect(find.byKey(const Key('popular-hint')), findsNothing);
  });

  testWidgets('hides the AI caption when the description is not AI generated', (tester) async {
    final catalogApi = FakeApiClient(
      bookOfDayValue: const BookOfDay(book: dune, score: 0.5, description: 'Catalog text.', aiGenerated: false),
    );
    await pumpScreen(tester, const PicksScreen(), repository: FakeBookRepository(), api: catalogApi);
    expect(find.text('Catalog text.'), findsOneWidget);
    expect(find.text('Описание сгенерировано ИИ'), findsNothing);
  });

  testWidgets('save button adds the book of the day to the wishlist and the like button rates a row', (tester) async {
    final repository = FakeBookRepository();
    await pumpScreen(tester, const PicksScreen(), repository: repository, api: api);
    await tester.tap(find.text('Сохранить'));
    await settle(tester);
    expect(repository.wishlistStore, contains('b1'));
    expect(find.text('Сохранено'), findsOneWidget);

    await tester.ensureVisible(find.byKey(const Key('like-b2')));
    await tester.tap(find.byKey(const Key('like-b2')));
    await settle(tester);
    expect(repository.ratingStore['b2'], 1);
  });

  testWidgets('does not repeat the book of the day in the list and renumbers the rest', (tester) async {
    await pumpScreen(tester, const PicksScreen(), repository: FakeBookRepository(), api: api);
    expect(find.byKey(const Key('like-b1')), findsNothing);
    expect(find.byKey(const Key('like-b2')), findsOneWidget);
    expect(find.text('1 · 42%'), findsOneWidget);
  });

  testWidgets('hides percentages and explains why in popularity mode', (tester) async {
    final popularApi = FakeApiClient(
      bookOfDayValue: const BookOfDay(book: dune, score: 1, description: null, aiGenerated: false),
      recommendationList: const [Recommendation(book: emma, score: 1, rank: 1, mode: 'popular')],
    );
    await pumpScreen(tester, const PicksScreen(), repository: FakeBookRepository(), api: popularApi);
    expect(find.byKey(const Key('popular-hint')), findsOneWidget);
    expect(find.text('Популярное'), findsOneWidget);
    expect(find.text('100%'), findsNothing);
    expect(find.textContaining('совпадение'), findsNothing);
  });

  testWidgets('a rated book leaves the list and dislike is available', (tester) async {
    final repository = FakeBookRepository();
    await pumpScreen(tester, const PicksScreen(), repository: repository, api: api);
    await tester.ensureVisible(find.byKey(const Key('dislike-b2')));
    await tester.tap(find.byKey(const Key('dislike-b2')));
    await settle(tester);
    expect(repository.ratingStore['b2'], -1);
    expect(find.byKey(const Key('like-b2')), findsNothing);
  });

  testWidgets('shows an empty message when there are no recommendations', (tester) async {
    await pumpScreen(tester, const PicksScreen(), repository: FakeBookRepository(), api: FakeApiClient());
    expect(find.text('Пока нечего рекомендовать'), findsOneWidget);
  });
}
