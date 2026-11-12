import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:folio/screens/onboarding_screen.dart';
import 'package:folio/widgets/grouped_list.dart';

import 'helpers.dart';

void main() {
  testWidgets('interest chip toggles its selected state', (tester) async {
    await pumpScreen(tester, const OnboardingScreen(), repository: FakeBookRepository());
    FilterChip chip() => tester.widget<FilterChip>(find.byKey(const Key('chip-fantasy')));
    expect(chip().selected, isFalse);
    await tester.tap(find.byKey(const Key('chip-fantasy')));
    await settle(tester);
    expect(chip().selected, isTrue);
    await tester.tap(find.byKey(const Key('chip-fantasy')));
    await settle(tester);
    expect(chip().selected, isFalse);
  });

  testWidgets('like and dislike buttons change state, repeat press clears the rating, accuracy follows ratings', (tester) async {
    final repository = FakeBookRepository();
    await pumpScreen(tester, const OnboardingScreen(), repository: repository);
    expect(find.text('Оценено книг: 0 из 8'), findsOneWidget);

    await tester.tap(find.byKey(const Key('like-button')).first);
    await settle(tester);
    expect(repository.ratingStore['b1'], 1);
    expect(find.text('Оценено книг: 1 из 8'), findsOneWidget);

    await tester.tap(find.byKey(const Key('dislike-button')).first);
    await settle(tester);
    expect(repository.ratingStore['b1'], -1);

    await tester.tap(find.byKey(const Key('dislike-button')).first);
    await settle(tester);
    expect(repository.ratingStore.containsKey('b1'), isFalse);
    expect(find.text('Оценено книг: 0 из 8'), findsOneWidget);
  });

  testWidgets('search shows results from the catalog and a not found message', (tester) async {
    await pumpScreen(tester, const OnboardingScreen(), repository: FakeBookRepository());
    await tester.enterText(find.byKey(const Key('search-field')), 'Emma');
    await settle(tester);
    expect(find.descendant(of: find.byType(GroupedItem), matching: find.text('Emma')), findsOneWidget);
    expect(find.text('Dune'), findsNothing);

    await tester.enterText(find.byKey(const Key('search-field')), 'nothing like this');
    await settle(tester);
    expect(find.text('Не найдено'), findsOneWidget);
  });

  testWidgets('show picks saves interests with consent, skip saves without consent', (tester) async {
    final repository = FakeBookRepository(profileValue: null);
    await pumpScreen(tester, const OnboardingScreen(), repository: repository);
    await tester.tap(find.byKey(const Key('chip-mystery')));
    await tester.ensureVisible(find.byKey(const Key('show-picks')));
    await tester.tap(find.byKey(const Key('show-picks')));
    await settle(tester);
    expect(repository.calls, contains('save-profile:mystery:true'));

    await tester.ensureVisible(find.byKey(const Key('skip')));
    await tester.tap(find.byKey(const Key('skip')));
    await settle(tester);
    expect(repository.calls, contains('save-profile:mystery:false'));
  });
}
