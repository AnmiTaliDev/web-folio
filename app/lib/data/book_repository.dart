import 'package:dio/dio.dart';

import 'models.dart';

class BookRepository {
  BookRepository(this._dio);

  final Dio _dio;

  Future<void> ensureSession() async {
    await _dio.post<void>('/api/session');
  }

  Future<List<BookSummary>> _books(String path, Map<String, dynamic> query) async {
    final response = await _dio.get<List<dynamic>>(path, queryParameters: query);
    return response.data!.map((item) => BookSummary.fromApi(item as Map<String, dynamic>)).toList();
  }

  Future<List<BookSummary>> search(String query) => _books('/api/books/search', {'q': query});

  Future<List<BookSummary>> popular(List<String> interests, {int limit = 8}) =>
      _books('/api/books/popular', {'interests': interests.join(','), 'limit': limit});

  Future<BookSummary?> book(String id) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/api/books/$id');
      return BookSummary.fromApi(response.data!);
    } on DioException catch (error) {
      if (error.response?.statusCode == 404) {
        return null;
      }
      rethrow;
    }
  }

  Future<Map<String, int>> ratings() async {
    final response = await _dio.get<Map<String, dynamic>>('/api/ratings');
    return Map<String, int>.from(response.data!['ratings'] as Map);
  }

  Future<void> setRating(String bookId, int value, {bool isRead = false}) async {
    await _dio.put<void>('/api/ratings/$bookId', data: {'value': value, 'isRead': isRead});
  }

  Future<void> removeRating(String bookId) async {
    await _dio.delete<void>('/api/ratings/$bookId');
  }

  Future<Set<String>> wishlist() async {
    final response = await _dio.get<Map<String, dynamic>>('/api/wishlist');
    return Set<String>.from(response.data!['bookIds'] as List);
  }

  Future<void> addToWishlist(String bookId) async {
    await _dio.put<void>('/api/wishlist/$bookId');
  }

  Future<void> removeFromWishlist(String bookId) async {
    await _dio.delete<void>('/api/wishlist/$bookId');
  }

  Future<UserProfile?> profile() async {
    final response = await _dio.get<Map<String, dynamic>>('/api/profile');
    final profile = response.data!['profile'];
    return profile == null ? null : UserProfile.fromJson(profile as Map<String, dynamic>);
  }

  Future<void> saveProfile(List<String> interests, {required bool consent}) async {
    await _dio.put<void>('/api/profile', data: {'interests': interests, 'consent': consent});
  }

  Future<void> setPersonalization(bool enabled) async {
    await _dio.patch<void>('/api/profile', data: {'personalizationEnabled': enabled});
  }

  Future<void> setAiDescriptions(bool enabled) async {
    await _dio.patch<void>('/api/profile', data: {'aiDescriptionsEnabled': enabled});
  }

  Future<TasteStats> tasteStats() async {
    final response = await _dio.get<Map<String, dynamic>>('/api/taste');
    return TasteStats.fromJson(response.data!);
  }
}
