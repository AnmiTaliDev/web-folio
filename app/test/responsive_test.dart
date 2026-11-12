import 'package:flutter_test/flutter_test.dart';
import 'package:folio/data/models.dart';
import 'package:folio/screens/guest_home_screen.dart';
import 'package:folio/screens/onboarding_screen.dart';
import 'package:folio/screens/picks_screen.dart';
import 'package:folio/screens/profile_screen.dart';
import 'package:folio/screens/settings_screen.dart';
import 'package:folio/screens/why_screen.dart';
import 'package:folio/widgets/app_shell.dart';
import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_ui/material_ui.dart';

import 'helpers.dart';

const _compact = Size(390, 2400);
const _medium = Size(768, 2400);
const _expanded = Size(1440, 1600);

final _picksApi = FakeApiClient(
  bookOfDayValue: const BookOfDay(book: dune, score: 0.87, description: 'Text.', aiGenerated: false),
  recommendationList: const [Recommendation(book: emma, score: 0.42, rank: 1)],
);

Future<void> pumpShell(WidgetTester tester, Size size) {
  return pumpScreen(tester, const AppShell(path: '/', child: SizedBox.expand()), repository: FakeBookRepository(), size: size);
}

void main() {
  group('navigation', () {
    testWidgets('compact width uses the bottom bar and no rail', (tester) async {
      await pumpShell(tester, _compact);
      expect(find.byType(M3ENavigationBar), findsOneWidget);
      expect(find.byType(M3ENavigationRail), findsNothing);
    });

    testWidgets('medium width uses a collapsed rail', (tester) async {
      await pumpShell(tester, _medium);
      expect(find.byType(M3ENavigationBar), findsNothing);
      expect(tester.widget<M3ENavigationRail>(find.byType(M3ENavigationRail)).type, M3ENavigationRailType.alwaysCollapse);
    });

    testWidgets('expanded width uses an extended rail with the app name', (tester) async {
      await pumpShell(tester, _expanded);
      expect(tester.widget<M3ENavigationRail>(find.byType(M3ENavigationRail)).type, M3ENavigationRailType.alwaysExpand);
      expect(find.text('Folio'), findsOneWidget);
    });
  });

  group('picks', () {
    testWidgets('stacks the book of the day above the list on compact and medium widths', (tester) async {
      for (final size in [_compact, _medium]) {
        await pumpScreen(tester, const PicksScreen(), repository: FakeBookRepository(), api: _picksApi, size: size);
        final card = tester.getTopLeft(find.byKey(const Key('book-of-day')));
        final row = tester.getTopLeft(find.byKey(const Key('like-b2')));
        expect(row.dy, greaterThan(card.dy), reason: '$size');
      }
    });

    testWidgets('puts the book of the day beside the list on expanded width', (tester) async {
      await pumpScreen(tester, const PicksScreen(), repository: FakeBookRepository(), api: _picksApi, size: _expanded);
      final card = tester.getRect(find.byKey(const Key('book-of-day')));
      final row = tester.getTopLeft(find.byKey(const Key('like-b2')));
      expect(row.dx, greaterThan(card.right));
      expect(row.dy, lessThan(card.bottom));
    });

    testWidgets('does not overflow at a narrow phone width', (tester) async {
      await pumpScreen(tester, const PicksScreen(), repository: FakeBookRepository(), api: _picksApi, size: const Size(320, 800));
      expect(tester.takeException(), isNull);
    });
  });

  group('profile and onboarding', () {
    testWidgets('profile uses two columns on expanded width', (tester) async {
      await pumpScreen(tester, const ProfileScreen(), repository: FakeBookRepository(), size: _expanded);
      final account = tester.getRect(find.byKey(const Key('account-card')));
      final wishlist = tester.getTopLeft(find.byKey(const Key('wishlist-empty')));
      expect(wishlist.dx, greaterThan(account.right));
    });

    testWidgets('profile stays a single column on compact width', (tester) async {
      await pumpScreen(tester, const ProfileScreen(), repository: FakeBookRepository(), size: _compact);
      final account = tester.getRect(find.byKey(const Key('account-card')));
      final wishlist = tester.getTopLeft(find.byKey(const Key('wishlist-empty')));
      expect(wishlist.dy, greaterThan(account.bottom));
    });

    testWidgets('onboarding puts the interests beside the books on expanded width', (tester) async {
      await pumpScreen(tester, const OnboardingScreen(), repository: FakeBookRepository(), size: _expanded);
      final chip = tester.getRect(find.byKey(const Key('chip-fantasy')));
      final like = tester.getTopLeft(find.byKey(const Key('like-button')).first);
      expect(like.dx, greaterThan(chip.right));
      expect(find.byKey(const Key('show-picks')), findsOneWidget);
    });

    testWidgets('onboarding bottom bar stays reachable on a small phone', (tester) async {
      await pumpScreen(tester, const OnboardingScreen(), repository: FakeBookRepository(), size: const Size(320, 640));
      expect(tester.takeException(), isNull);
      expect(tester.getBottomLeft(find.byKey(const Key('show-picks'))).dy, lessThanOrEqualTo(640));
    });
  });

  group('settings and guest home', () {
    testWidgets('settings uses two columns on expanded width', (tester) async {
      await pumpScreen(tester, const SettingsScreen(), repository: FakeBookRepository(), size: _expanded);
      final password = tester.getRect(find.byKey(const Key('settings-password')));
      final export = tester.getTopLeft(find.byKey(const Key('settings-export')));
      expect(export.dx, greaterThan(password.right));
    });

    testWidgets('guest home stays a single readable column on expanded width', (tester) async {
      await pumpScreen(
        tester,
        const GuestHomeScreen(),
        repository: FakeBookRepository(),
        auth: FakeAuthRepository(statusValue: const AuthStatus(registered: false)),
        size: _expanded,
      );
      final row = tester.getRect(find.byKey(const Key('popular-b1')));
      expect(row.width, lessThanOrEqualTo(720));
    });

    testWidgets('four navigation items fit a small phone', (tester) async {
      await pumpScreen(tester, const AppShell(path: '/', child: SizedBox.expand()), repository: FakeBookRepository(), size: const Size(320, 640));
      expect(tester.takeException(), isNull);
      expect(find.text('Настройки'), findsWidgets);
    });
  });

  group('explanation', () {
    final api = FakeApiClient(
      explanation: const Explanation(
        score: 0.7,
        reasons: [Reason(type: 'genre', percent: 100, genres: ['fantasy'])],
        description: BookDescription(text: 'Blurb.', aiGenerated: false),
      ),
    );

    testWidgets('puts the reasons beside the banner on expanded width and below it on compact', (tester) async {
      await pumpScreen(tester, const WhyScreen(bookId: 'b1'), repository: FakeBookRepository(), api: api, size: _expanded);
      final wideBanner = tester.getRect(find.text('Dune'));
      expect(tester.getTopLeft(find.byKey(const Key('overall-percent'))).dx, greaterThan(wideBanner.right));

      await pumpScreen(tester, const WhyScreen(bookId: 'b1'), repository: FakeBookRepository(), api: api, size: _compact);
      expect(tester.getTopLeft(find.byKey(const Key('overall-percent'))).dy, greaterThan(tester.getBottomLeft(find.text('Dune')).dy));
    });
  });
}
