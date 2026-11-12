import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'auth_repository.dart';
import 'book_repository.dart';
import 'models.dart';

final dioProvider = Provider<Dio>((ref) => Dio(BaseOptions(baseUrl: Uri.base.origin)));

final bookRepositoryProvider = Provider<BookRepository>((ref) => BookRepository(ref.watch(dioProvider)));

final authRepositoryProvider = Provider<AuthRepository>((ref) => AuthRepository(ref.watch(dioProvider)));

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(dio: ref.watch(dioProvider)));

class ProfileNotifier extends AsyncNotifier<UserProfile?> {
  @override
  Future<UserProfile?> build() async {
    final repository = ref.read(bookRepositoryProvider);
    await repository.ensureSession();
    return repository.profile();
  }

  Future<void> saveOnboarding(List<String> interests, {required bool consent}) async {
    await ref.read(bookRepositoryProvider).saveProfile(interests, consent: consent);
    state = AsyncData(await ref.read(bookRepositoryProvider).profile());
  }

  Future<void> setPersonalization(bool enabled) async {
    final current = state.value;
    if (current == null) {
      return;
    }
    state = AsyncData(current.copyWith(personalizationEnabled: enabled));
    await ref.read(bookRepositoryProvider).setPersonalization(enabled);
    ref.invalidate(recommendationsProvider);
    ref.invalidate(bookOfDayProvider);
  }

  Future<void> setAiDescriptions(bool enabled) async {
    final current = state.value;
    if (current == null) {
      return;
    }
    state = AsyncData(current.copyWith(aiDescriptionsEnabled: enabled));
    await ref.read(bookRepositoryProvider).setAiDescriptions(enabled);
  }

  Future<void> deleteEverything() async {
    await ref.read(apiClientProvider).deleteAccount();
    await ref.read(bookRepositoryProvider).ensureSession();
    ref.invalidate(ratingsProvider);
    ref.invalidate(wishlistProvider);
    ref.invalidate(wishlistBooksProvider);
    ref.invalidate(recommendationsProvider);
    ref.invalidate(bookOfDayProvider);
    ref.invalidate(tasteStatsProvider);
    ref.invalidate(authStatusProvider);
    ref.read(chatProvider.notifier).clear();
    state = const AsyncData(null);
  }
}

final profileProvider = AsyncNotifierProvider<ProfileNotifier, UserProfile?>(ProfileNotifier.new);

class RatingsNotifier extends AsyncNotifier<Map<String, int>> {
  @override
  Future<Map<String, int>> build() => ref.read(bookRepositoryProvider).ratings();

  Future<void> rate(String bookId, int value, {bool isRead = false}) async {
    final current = Map<String, int>.from(await future);
    final repository = ref.read(bookRepositoryProvider);
    if (current[bookId] == value) {
      current.remove(bookId);
      state = AsyncData(current);
      await repository.removeRating(bookId);
    } else {
      current[bookId] = value;
      state = AsyncData(current);
      await repository.setRating(bookId, value, isRead: isRead);
    }
    ref.invalidate(recommendationsProvider);
    ref.invalidate(tasteStatsProvider);
  }
}

final ratingsProvider = AsyncNotifierProvider<RatingsNotifier, Map<String, int>>(RatingsNotifier.new);

class WishlistNotifier extends AsyncNotifier<Set<String>> {
  @override
  Future<Set<String>> build() => ref.read(bookRepositoryProvider).wishlist();

  Future<void> toggle(String bookId) async {
    final current = Set<String>.from(await future);
    final repository = ref.read(bookRepositoryProvider);
    if (current.contains(bookId)) {
      current.remove(bookId);
      state = AsyncData(current);
      await repository.removeFromWishlist(bookId);
    } else {
      current.add(bookId);
      state = AsyncData(current);
      await repository.addToWishlist(bookId);
    }
    ref.invalidate(wishlistBooksProvider);
  }
}

final wishlistProvider = AsyncNotifierProvider<WishlistNotifier, Set<String>>(WishlistNotifier.new);

final wishlistBooksProvider = FutureProvider<List<BookSummary>>((ref) => ref.read(bookRepositoryProvider).wishlistBooks());

final recommendationsProvider = FutureProvider<List<Recommendation>>((ref) => ref.read(apiClientProvider).recommendations());

String formatDay(DateTime date) =>
    '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

final bookOfDayProvider = FutureProvider<BookOfDay?>((ref) => ref.read(apiClientProvider).bookOfDay(formatDay(DateTime.now())));

final explanationProvider = FutureProvider.family<Explanation, String>((ref, bookId) => ref.read(apiClientProvider).explain(bookId));

final bookProvider = FutureProvider.family<BookSummary?, String>((ref, bookId) => ref.read(bookRepositoryProvider).book(bookId));

final tasteStatsProvider = FutureProvider<TasteStats>((ref) => ref.read(bookRepositoryProvider).tasteStats());

class SearchQuery extends Notifier<String> {
  @override
  String build() => '';

  void update(String value) => state = value;
}

final searchQueryProvider = NotifierProvider<SearchQuery, String>(SearchQuery.new);

class SelectedInterests extends Notifier<Set<String>> {
  @override
  Set<String> build() => <String>{};

  void toggle(String genre) {
    final next = Set<String>.from(state);
    if (!next.remove(genre)) {
      next.add(genre);
    }
    state = next;
  }
}

final selectedInterestsProvider = NotifierProvider<SelectedInterests, Set<String>>(SelectedInterests.new);

final onboardingBooksProvider = FutureProvider<List<BookSummary>>((ref) {
  final query = ref.watch(searchQueryProvider).trim();
  final repository = ref.read(bookRepositoryProvider);
  if (query.isNotEmpty) {
    return repository.search(query);
  }
  return repository.popular(ref.watch(selectedInterestsProvider).toList());
});

class ChatNotifier extends Notifier<List<ChatMessageView>> {
  @override
  List<ChatMessageView> build() => const [];

  Future<void> send(String text) async {
    final message = text.trim();
    if (message.isEmpty || state.any((item) => item.pending)) {
      return;
    }
    state = [...state, ChatMessageView(fromUser: true, text: message), const ChatMessageView(fromUser: false, text: '', pending: true)];
    try {
      await for (final event in ref.read(apiClientProvider).chat(message)) {
        _apply(event);
      }
      _replaceLast((last) => last.copyWith(pending: false));
    } on ApiFailure catch (failure) {
      _replaceLast((last) => last.copyWith(pending: false, error: failure.code));
    } on Object {
      _replaceLast((last) => last.copyWith(pending: false, error: 'network_error'));
    }
  }

  void _apply(ChatStreamEvent event) {
    switch (event.name) {
      case 'books':
        final books = (event.data['books'] as List).map((item) => BookSummary.fromApi(item as Map<String, dynamic>)).toList();
        final context = ChatContext.fromJson(event.data['context'] as Map<String, dynamic>);
        _replaceLast((last) => last.copyWith(books: books, context: context));
      case 'token':
        _replaceLast((last) => last.copyWith(text: last.text + (event.data['text'] as String)));
      case 'error':
        _replaceLast((last) => last.copyWith(error: 'generic'));
    }
  }

  void clear() => state = const [];

  void _replaceLast(ChatMessageView Function(ChatMessageView last) change) {
    final next = [...state];
    next[next.length - 1] = change(next.last);
    state = next;
  }
}

final chatProvider = NotifierProvider<ChatNotifier, List<ChatMessageView>>(ChatNotifier.new);

final authStatusProvider = FutureProvider<AuthStatus>((ref) => ref.read(authRepositoryProvider).status());

class AuthActions extends Notifier<void> {
  @override
  void build() {}

  void _resetUserState() {
    ref.invalidate(profileProvider);
    ref.invalidate(ratingsProvider);
    ref.invalidate(wishlistProvider);
    ref.invalidate(wishlistBooksProvider);
    ref.invalidate(recommendationsProvider);
    ref.invalidate(bookOfDayProvider);
    ref.invalidate(tasteStatsProvider);
    ref.invalidate(authStatusProvider);
    ref.read(chatProvider.notifier).clear();
  }

  Future<String> register(String username, String password) async {
    final code = await ref.read(authRepositoryProvider).register(username, password);
    ref.invalidate(authStatusProvider);
    return code;
  }

  Future<void> login(String username, String password) async {
    await ref.read(authRepositoryProvider).login(username, password);
    _resetUserState();
  }

  Future<String> recover(String username, String recoveryCode, String newPassword) async {
    final code = await ref.read(authRepositoryProvider).recover(username, recoveryCode, newPassword);
    _resetUserState();
    return code;
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    await ref.read(bookRepositoryProvider).ensureSession();
    _resetUserState();
  }

  Future<void> changePassword(String currentPassword, String newPassword) =>
      ref.read(authRepositoryProvider).changePassword(currentPassword, newPassword);
}

final authActionsProvider = NotifierProvider<AuthActions, void>(AuthActions.new);
