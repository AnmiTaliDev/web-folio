class BookSummary {
  const BookSummary({required this.id, required this.title, required this.authors, required this.genres});

  factory BookSummary.fromApi(Map<String, dynamic> json) => BookSummary(
        id: json['bookId'] as String,
        title: json['title'] as String,
        authors: List<String>.from(json['authors'] as List),
        genres: List<String>.from(json['genres'] as List),
      );

  final String id;
  final String title;
  final List<String> authors;
  final List<String> genres;

  String get authorLine => authors.join(', ');
}

class Recommendation {
  const Recommendation({required this.book, required this.score, required this.rank, this.mode = 'profile'});

  factory Recommendation.fromJson(Map<String, dynamic> json) => Recommendation(
        book: BookSummary.fromApi(json),
        score: (json['score'] as num).toDouble(),
        rank: json['rank'] as int,
        mode: json['mode'] as String? ?? 'profile',
      );

  final BookSummary book;
  final double score;
  final int rank;
  final String mode;

  bool get isPopularity => mode == 'popular';

  int get percent => (score * 100).round();
}

class Reason {
  const Reason({required this.type, required this.percent, this.title, this.genres = const []});

  factory Reason.fromJson(Map<String, dynamic> json) => Reason(
        type: json['type'] as String,
        percent: json['percent'] as int,
        title: json['title'] as String?,
        genres: List<String>.from((json['genres'] as List?) ?? const []),
      );

  final String type;
  final int percent;
  final String? title;
  final List<String> genres;
}

class BookDescription {
  const BookDescription({required this.text, required this.aiGenerated});

  factory BookDescription.fromJson(Map<String, dynamic> json) =>
      BookDescription(text: json['text'] as String?, aiGenerated: json['aiGenerated'] as bool);

  final String? text;
  final bool aiGenerated;
}

class Explanation {
  const Explanation({required this.score, required this.reasons, required this.description, this.mode = 'profile'});

  factory Explanation.fromJson(Map<String, dynamic> json) => Explanation(
        score: (json['score'] as num).toDouble(),
        mode: json['mode'] as String? ?? 'profile',
        reasons: (json['reasons'] as List).map((item) => Reason.fromJson(item as Map<String, dynamic>)).toList(),
        description: BookDescription.fromJson(json['description'] as Map<String, dynamic>),
      );

  final double score;
  final String mode;
  final List<Reason> reasons;
  final BookDescription description;

  bool get isPopularity => mode == 'popular';

  int get percent => (score * 100).round();
}

class BookOfDay {
  const BookOfDay({required this.book, required this.score, required this.description, required this.aiGenerated});

  factory BookOfDay.fromJson(Map<String, dynamic> json) => BookOfDay(
        book: BookSummary.fromApi(json['book'] as Map<String, dynamic>),
        score: (json['score'] as num).toDouble(),
        description: json['description'] as String?,
        aiGenerated: json['aiGenerated'] as bool,
      );

  final BookSummary book;
  final double score;
  final String? description;
  final bool aiGenerated;

  int get percent => (score * 100).round();
}

class UserProfile {
  const UserProfile({
    required this.interests,
    required this.personalizationEnabled,
    required this.aiDescriptionsEnabled,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
        interests: List<String>.from(json['interests'] as List),
        personalizationEnabled: json['personalizationEnabled'] as bool,
        aiDescriptionsEnabled: json['aiDescriptionsEnabled'] as bool,
      );

  final List<String> interests;
  final bool personalizationEnabled;
  final bool aiDescriptionsEnabled;

  UserProfile copyWith({bool? personalizationEnabled, bool? aiDescriptionsEnabled}) => UserProfile(
        interests: interests,
        personalizationEnabled: personalizationEnabled ?? this.personalizationEnabled,
        aiDescriptionsEnabled: aiDescriptionsEnabled ?? this.aiDescriptionsEnabled,
      );
}

class TasteStats {
  const TasteStats({required this.readCount, required this.likedCount, required this.topGenres});

  factory TasteStats.fromJson(Map<String, dynamic> json) => TasteStats(
        readCount: json['readCount'] as int,
        likedCount: json['likedCount'] as int,
        topGenres: List<String>.from(json['topGenres'] as List),
      );

  final int readCount;
  final int likedCount;
  final List<String> topGenres;
}

class ChatContext {
  const ChatContext({required this.interests, required this.likedCount, required this.dislikedCount});

  factory ChatContext.fromJson(Map<String, dynamic> json) => ChatContext(
        interests: List<String>.from(json['interests'] as List),
        likedCount: json['likedCount'] as int,
        dislikedCount: json['dislikedCount'] as int,
      );

  final List<String> interests;
  final int likedCount;
  final int dislikedCount;
}

class ChatMessageView {
  const ChatMessageView({
    required this.fromUser,
    required this.text,
    this.books = const [],
    this.context,
    this.pending = false,
    this.error,
  });

  final bool fromUser;
  final String text;
  final List<BookSummary> books;
  final ChatContext? context;
  final bool pending;
  final String? error;

  ChatMessageView copyWith({String? text, List<BookSummary>? books, ChatContext? context, bool? pending, String? error}) =>
      ChatMessageView(
        fromUser: fromUser,
        text: text ?? this.text,
        books: books ?? this.books,
        context: context ?? this.context,
        pending: pending ?? this.pending,
        error: error ?? this.error,
      );
}

class ApiFailure implements Exception {
  const ApiFailure(this.status, this.code);

  final int status;
  final String code;
}

class AuthStatus {
  const AuthStatus({required this.registered, this.username});

  factory AuthStatus.fromJson(Map<String, dynamic> json) =>
      AuthStatus(registered: json['registered'] as bool, username: json['username'] as String?);

  final bool registered;
  final String? username;
}
