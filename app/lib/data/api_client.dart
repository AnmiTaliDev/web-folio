import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';

import 'models.dart';

class ChatStreamEvent {
  const ChatStreamEvent(this.name, this.data);

  final String name;
  final Map<String, dynamic> data;
}

Stream<ChatStreamEvent> parseSse(Stream<String> lines) async* {
  String? name;
  String? data;
  await for (final line in lines) {
    if (line.startsWith('event: ')) {
      name = line.substring(7);
    } else if (line.startsWith('data: ')) {
      data = line.substring(6);
    } else if (line.isEmpty && name != null && data != null) {
      yield ChatStreamEvent(name, jsonDecode(data) as Map<String, dynamic>);
      name = null;
      data = null;
    }
  }
}

Future<T> guardApi<T>(Future<T> Function() request) async {
  try {
    return await request();
  } on DioException catch (error) {
    final data = error.response?.data;
    final code = data is Map && data['error'] is Map ? data['error']['code'] as String? : null;
    throw ApiFailure(error.response?.statusCode ?? 0, code ?? 'network_error');
  }
}

class ApiClient {
  ApiClient({required this.dio});

  final Dio dio;

  Future<List<Recommendation>> recommendations() => guardApi(() async {
        final response = await dio.get<List<dynamic>>('/api/recommendations');
        return response.data!.map((item) => Recommendation.fromJson(item as Map<String, dynamic>)).toList();
      });

  Future<Explanation> explain(String bookId) => guardApi(() async {
        final response = await dio.get<Map<String, dynamic>>('/api/books/$bookId/explain');
        return Explanation.fromJson(response.data!);
      });

  Future<BookOfDay?> bookOfDay(String day) => guardApi(() async {
        try {
          final response = await dio.get<Map<String, dynamic>>(
            '/api/book-of-day',
            queryParameters: {'day': day},
          );
          return BookOfDay.fromJson(response.data!);
        } on DioException catch (error) {
          if (error.response?.statusCode == 404) {
            return null;
          }
          rethrow;
        }
      });

  Future<void> deleteAccount() => guardApi(() async {
        await dio.delete<void>('/api/me');
      });

  Stream<ChatStreamEvent> chat(String message) async* {
    final Response<ResponseBody> response;
    try {
      response = await dio.post<ResponseBody>(
        '/api/chat',
        data: {'message': message},
        options: Options(responseType: ResponseType.stream),
      );
    } on DioException catch (error) {
      final status = error.response?.statusCode ?? 0;
      throw ApiFailure(
        status,
        switch (status) {
          429 => 'rate_limited',
          503 => 'ai_unavailable',
          _ => 'network_error',
        },
      );
    }
    final lines = response.data!.stream
        .cast<List<int>>()
        .transform(utf8.decoder)
        .transform(const LineSplitter());
    yield* parseSse(lines);
  }
}
