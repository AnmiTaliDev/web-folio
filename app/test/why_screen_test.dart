import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:folio/data/models.dart';
import 'package:folio/screens/why_screen.dart';
import 'package:folio/widgets/like_buttons.dart';

import 'helpers.dart';

void main() {
  final api = FakeApiClient(
    explanation: const Explanation(
      score: 0.74,
      reasons: [
        Reason(type: 'liked_book', percent: 60, title: 'Hyperion'),
        Reason(type: 'genre', percent: 40, genres: ['science_fiction']),
      ],
      description: BookDescription(text: 'Generated blurb.', aiGenerated: true),
    ),
  );

  testWidgets('shows reasons with real titles, overall percent and the AI caption', (tester) async {
    await pumpScreen(tester, const WhyScreen(bookId: 'b1'), repository: FakeBookRepository(), api: api);
    expect(find.text('74% совпадение'), findsOneWidget);
    expect(find.text('Вам понравилось «Hyperion»'), findsOneWidget);
    expect(find.text('Совпадает с интересами: Фантастика'), findsOneWidget);
    expect(find.text('60%'), findsOneWidget);
    expect(find.text('40%'), findsOneWidget);
    expect(find.text('Generated blurb.'), findsOneWidget);
    expect(find.byKey(const Key('ai-caption')), findsOneWidget);
  });

  testWidgets('hides the caption for catalog descriptions', (tester) async {
    final catalogApi = FakeApiClient(
      explanation: const Explanation(
        score: 0.5,
        reasons: [Reason(type: 'popular', percent: 100)],
        description: BookDescription(text: 'Catalog text.', aiGenerated: false),
      ),
    );
    await pumpScreen(tester, const WhyScreen(bookId: 'b1'), repository: FakeBookRepository(), api: catalogApi);
    expect(find.byKey(const Key('ai-caption')), findsNothing);
    expect(find.text('Популярно среди читателей'), findsOneWidget);
  });

  testWidgets('popularity mode shows a popular badge instead of a match percent', (tester) async {
    final popularApi = FakeApiClient(
      explanation: const Explanation(
        score: 0.71,
        mode: 'popular',
        reasons: [Reason(type: 'popular', percent: 100)],
        description: BookDescription(text: null, aiGenerated: false),
      ),
    );
    await pumpScreen(tester, const WhyScreen(bookId: 'b1'), repository: FakeBookRepository(), api: popularApi);
    expect(find.text('Популярное'), findsOneWidget);
    expect(find.textContaining('совпадение'), findsNothing);
  });

  testWidgets('wishlist, like and dislike buttons update their state', (tester) async {
    final repository = FakeBookRepository();
    await pumpScreen(tester, const WhyScreen(bookId: 'b1'), repository: repository, api: api);

    await tester.tap(find.byKey(const Key('wishlist-button')));
    await settle(tester);
    expect(repository.wishlistStore, contains('b1'));
    expect(find.text('В списке «Хочу прочитать»'), findsOneWidget);

    await tester.tap(find.byKey(const Key('like-button')));
    await settle(tester);
    expect(tester.widget<LikeButtons>(find.byType(LikeButtons)).value, 1);

    await tester.tap(find.byKey(const Key('dislike-button')));
    await settle(tester);
    expect(tester.widget<LikeButtons>(find.byType(LikeButtons)).value, -1);
    expect(repository.ratingStore['b1'], -1);
  });
}
