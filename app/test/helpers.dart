import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:folio/data/api_client.dart';
import 'package:folio/data/auth_repository.dart';
import 'package:folio/data/book_repository.dart';
import 'package:folio/data/models.dart';
import 'package:folio/data/providers.dart';
import 'package:folio/l10n/app_localizations.dart';
import 'package:folio/theme/app_theme.dart';
import 'package:material_ui/material_ui.dart';

const dune = BookSummary(id: 'b1', title: 'Dune', authors: ['Frank Herbert'], genres: ['science_fiction']);
const emma = BookSummary(id: 'b2', title: 'Emma', authors: ['Jane Austen'], genres: ['classics']);

class FakeBookRepository implements BookRepository {
  FakeBookRepository({
    this.books = const [dune, emma],
    this.profileValue = const UserProfile(interests: [], personalizationEnabled: true, aiDescriptionsEnabled: true),
    this.stats = const TasteStats(readCount: 0, likedCount: 0, topGenres: []),
  });

  final List<BookSummary> books;
  UserProfile? profileValue;
  TasteStats stats;
  final Map<String, int> ratingStore = {};
  final Set<String> wishlistStore = {};
  final List<String> calls = [];

  @override
  Future<List<BookSummary>> search(String query) async => books.where((book) => book.title.toLowerCase().contains(query.toLowerCase())).toList();

  @override
  Future<List<BookSummary>> popular(List<String> interests, {int limit = 8}) async => books;

  @override
  Future<BookSummary?> book(String id) async => books.where((book) => book.id == id).firstOrNull;

  @override
  Future<Map<String, int>> ratings() async => Map.of(ratingStore);

  @override
  Future<void> setRating(String bookId, int value, {bool isRead = false}) async {
    calls.add('rate:$bookId:$value');
    ratingStore[bookId] = value;
  }

  @override
  Future<void> removeRating(String bookId) async {
    calls.add('unrate:$bookId');
    ratingStore.remove(bookId);
  }

  @override
  Future<Set<String>> wishlist() async => Set.of(wishlistStore);

  @override
  Future<List<BookSummary>> wishlistBooks() async => books.where((book) => wishlistStore.contains(book.id)).toList();

  @override
  Future<void> addToWishlist(String bookId) async {
    calls.add('wish:$bookId');
    wishlistStore.add(bookId);
  }

  @override
  Future<void> removeFromWishlist(String bookId) async {
    calls.add('unwish:$bookId');
    wishlistStore.remove(bookId);
  }

  @override
  Future<UserProfile?> profile() async => profileValue;

  @override
  Future<void> saveProfile(List<String> interests, {required bool consent}) async {
    calls.add('save-profile:${interests.join(',')}:$consent');
    profileValue = UserProfile(interests: interests, personalizationEnabled: true, aiDescriptionsEnabled: true);
  }

  @override
  Future<void> setPersonalization(bool enabled) async {
    calls.add('personalization:$enabled');
  }

  @override
  Future<void> setAiDescriptions(bool enabled) async {
    calls.add('ai:$enabled');
  }

  @override
  Future<TasteStats> tasteStats() async => stats;

  @override
  Future<void> ensureSession() async {
    calls.add('session');
  }
}

class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({this.statusValue = const AuthStatus(registered: false), this.failWith});

  AuthStatus statusValue;
  ApiFailure? failWith;
  final List<String> calls = [];

  void _maybeFail() {
    if (failWith != null) {
      throw failWith!;
    }
  }

  @override
  Future<AuthStatus> status() async => statusValue;

  @override
  Future<String> register(String username, String password) async {
    _maybeFail();
    calls.add('register:$username:$password');
    statusValue = AuthStatus(registered: true, username: username);
    return 'AAAA-BBBB-CCCC-DDDD-EEEE';
  }

  @override
  Future<void> login(String username, String password) async {
    _maybeFail();
    calls.add('login:$username:$password');
    statusValue = AuthStatus(registered: true, username: username);
  }

  @override
  Future<void> logout() async {
    calls.add('logout');
    statusValue = const AuthStatus(registered: false);
  }

  @override
  Future<void> changePassword(String currentPassword, String newPassword) async {
    _maybeFail();
    calls.add('change:$currentPassword:$newPassword');
  }

  @override
  Future<String> recover(String username, String recoveryCode, String newPassword) async {
    _maybeFail();
    calls.add('recover:$username:$recoveryCode:$newPassword');
    statusValue = AuthStatus(registered: true, username: username);
    return 'FFFF-0000-1111-2222-3333';
  }
}

class FakeApiClient extends ApiClient {
  FakeApiClient({
    this.recommendationList = const [],
    this.bookOfDayValue,
    this.explanation,
    this.chatEvents = const [],
    this.aiValue = true,
  }) : super(dio: Dio());

  final List<Recommendation> recommendationList;
  final BookOfDay? bookOfDayValue;
  final Explanation? explanation;
  final List<ChatStreamEvent> chatEvents;
  final bool aiValue;
  final List<String> sentMessages = [];
  bool deleted = false;

  @override
  Future<bool> aiAvailable() async => aiValue;

  @override
  Future<List<Recommendation>> recommendations() async => recommendationList;

  @override
  Future<BookOfDay?> bookOfDay(String day) async => bookOfDayValue;

  @override
  Future<Explanation> explain(String bookId) async => explanation!;

  @override
  Future<void> deleteAccount() async {
    deleted = true;
  }

  @override
  Stream<ChatStreamEvent> chat(String message) async* {
    sentMessages.add(message);
    for (final event in chatEvents) {
      yield event;
    }
  }
}

Future<void> pumpScreen(
  WidgetTester tester,
  Widget screen, {
  required FakeBookRepository repository,
  FakeApiClient? api,
  FakeAuthRepository? auth,
}) async {
  tester.view.physicalSize = const Size(780, 4800);
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      retry: (retryCount, error) => null,
      overrides: [
        bookRepositoryProvider.overrideWithValue(repository),
        apiClientProvider.overrideWithValue(api ?? FakeApiClient()),
        authRepositoryProvider.overrideWithValue(auth ?? FakeAuthRepository()),
      ],
      child: MaterialApp(
        theme: buildFolioTheme(),
        locale: const Locale('ru'),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: [AppLocalizations.delegate, ...GlobalMaterialLocalizations.delegates],
        home: Scaffold(body: screen),
      ),
    ),
  );
  await settle(tester);
}

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 6; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}
