import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:folio/data/models.dart';
import 'package:folio/data/providers.dart';
import 'package:folio/screens/profile_screen.dart';
import 'package:material_ui/material_ui.dart';

import 'helpers.dart';

void main() {
  final repositoryStats = const TasteStats(readCount: 5, likedCount: 3, topGenres: ['fantasy', 'mystery', 'history']);

  testWidgets('shows taste from real stats', (tester) async {
    await pumpScreen(tester, const ProfileScreen(), repository: FakeBookRepository(stats: repositoryStats));
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

  testWidgets('privacy switches write to the profile', (tester) async {
    final repository = FakeBookRepository();
    await pumpScreen(tester, const ProfileScreen(), repository: repository);
    Switch likes() => tester.widget<Switch>(find.descendant(of: find.byKey(const Key('switch-likes')), matching: find.byType(Switch)));
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

  testWidgets('delete asks for confirmation and only then deletes', (tester) async {
    final repository = FakeBookRepository();
    final api = FakeApiClient();
    await pumpScreen(tester, const ProfileScreen(), repository: repository, api: api);
    final container = ProviderScope.containerOf(tester.element(find.byType(ProfileScreen)));

    await tester.ensureVisible(find.byKey(const Key('delete-data')));
    await tester.tap(find.byKey(const Key('delete-data')));
    await settle(tester);
    expect(find.text('Удалить все данные?'), findsOneWidget);
    await tester.tap(find.byKey(const Key('delete-cancel')));
    await settle(tester);
    expect(api.deleted, isFalse);

    await tester.tap(find.byKey(const Key('delete-data')));
    await settle(tester);
    await tester.tap(find.byKey(const Key('delete-confirm')));
    await settle(tester);
    expect(api.deleted, isTrue);
    expect(repository.calls, contains('session'));
    expect(container.read(profileProvider).value, isNull);
  });
}
