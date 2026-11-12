import 'dart:convert';

import 'package:dio/dio.dart';

import 'api_client.dart';
import 'models.dart';

class AuthRepository {
  AuthRepository(this._dio);

  final Dio _dio;

  Future<AuthStatus> status() => guardApi(() async {
        final response = await _dio.get<Map<String, dynamic>>('/api/auth/me');
        return AuthStatus.fromJson(response.data!);
      });

  Future<String> register(String username, String password) => guardApi(() async {
        final response = await _dio.post<Map<String, dynamic>>(
          '/api/auth/register',
          data: {'username': username, 'password': password},
        );
        return response.data!['recoveryCode'] as String;
      });

  Future<void> logoutAll() => guardApi(() async {
        await _dio.post<void>('/api/auth/logout-all');
      });

  Future<String> recoveryCode(String password) => guardApi(() async {
        final response = await _dio.post<Map<String, dynamic>>('/api/auth/recovery-code', data: {'password': password});
        return response.data!['recoveryCode'] as String;
      });

  Future<String> exportData() => guardApi(() async {
        final response = await _dio.get<Map<String, dynamic>>('/api/me/export');
        return const JsonEncoder.withIndent('  ').convert(response.data);
      });

  Future<void> deleteAccount(String password) => guardApi(() async {
        await _dio.delete<void>('/api/me', data: {'password': password});
      });

  Future<void> login(String username, String password) => guardApi(() async {
        await _dio.post<void>('/api/auth/login', data: {'username': username, 'password': password});
      });

  Future<void> logout() => guardApi(() async {
        await _dio.post<void>('/api/auth/logout');
      });

  Future<void> changePassword(String currentPassword, String newPassword) => guardApi(() async {
        await _dio.post<void>(
          '/api/auth/password',
          data: {'currentPassword': currentPassword, 'newPassword': newPassword},
        );
      });

  Future<String> recover(String username, String recoveryCode, String newPassword) => guardApi(() async {
        final response = await _dio.post<Map<String, dynamic>>(
          '/api/auth/recover',
          data: {'username': username, 'recoveryCode': recoveryCode, 'newPassword': newPassword},
        );
        return response.data!['recoveryCode'] as String;
      });
}
