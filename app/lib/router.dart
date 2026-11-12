import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import 'data/providers.dart';
import 'data/models.dart';
import 'screens/auth_screen.dart';
import 'screens/book_screen.dart';
import 'screens/chat_screen.dart';
import 'screens/home_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/settings_screen.dart';
import 'widgets/app_shell.dart';
import 'widgets/async_view.dart';

class LoadingScreen extends ConsumerWidget {
  const LoadingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStatusProvider);
    final profile = ref.watch(profileProvider);
    return Scaffold(
      body: Center(
        child: auth.hasError || profile.hasError
            ? ErrorRetry(
                onRetry: () {
                  ref.invalidate(authStatusProvider);
                  ref.invalidate(profileProvider);
                },
              )
            : const CircularProgressIndicator(),
      ),
    );
  }
}

String? _safeTarget(Uri location) {
  final from = location.queryParameters['from'];
  if (from == null || !from.startsWith('/') || from.startsWith('//')) {
    return null;
  }
  final path = Uri.parse(from).path;
  return path == '/loading' || path == '/onboarding' ? null : from;
}

String _loadingLocation(Uri location) => '/loading?from=${Uri.encodeQueryComponent(location.toString())}';

String? redirectFor(AsyncValue<AuthStatus> auth, AsyncValue<Object?> profile, Uri location) {
  final path = location.path;
  if (!auth.hasValue) {
    return path == '/loading' ? null : _loadingLocation(location);
  }
  if (path == '/auth') {
    return null;
  }
  if (!auth.requireValue.registered) {
    if (path == '/loading') {
      return _safeTarget(location) ?? '/';
    }
    return path == '/onboarding' ? '/' : null;
  }
  if (!profile.hasValue) {
    return path == '/loading' ? null : _loadingLocation(location);
  }
  if (profile.value == null) {
    return path == '/onboarding' ? null : '/onboarding';
  }
  if (path == '/onboarding' || path == '/loading') {
    return _safeTarget(location) ?? '/';
  }
  return null;
}

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen(profileProvider, (previous, next) => refresh.value++);
  ref.listen(authStatusProvider, (previous, next) => refresh.value++);
  ref.onDispose(refresh.dispose);
  return GoRouter(
    refreshListenable: refresh,
    redirect: (context, state) => redirectFor(ref.read(authStatusProvider), ref.read(profileProvider), state.uri),
    routes: [
      GoRoute(path: '/loading', builder: (context, state) => const LoadingScreen()),
      GoRoute(path: '/onboarding', builder: (context, state) => const OnboardingScreen()),
      GoRoute(
        path: '/auth',
        builder: (context, state) => AuthScreen(
          initialMode: switch (state.uri.queryParameters['mode']) {
            'register' => AuthMode.register,
            'recover' => AuthMode.recover,
            _ => AuthMode.login,
          },
          onDone: () => context.go('/'),
          onBack: () => context.canPop() ? context.pop() : context.go('/'),
        ),
      ),
      GoRoute(path: '/book/:id', builder: (context, state) => BookScreen(bookId: state.pathParameters['id']!)),
      ShellRoute(
        builder: (context, state, child) => AppShell(path: state.uri.path, child: child),
        routes: [
          GoRoute(path: '/', pageBuilder: (context, state) => const NoTransitionPage(child: HomeScreen())),
          GoRoute(path: '/chat', pageBuilder: (context, state) => const NoTransitionPage(child: ChatScreen())),
          GoRoute(path: '/profile', pageBuilder: (context, state) => const NoTransitionPage(child: ProfileScreen())),
          GoRoute(path: '/settings', pageBuilder: (context, state) => const NoTransitionPage(child: SettingsScreen())),
        ],
      ),
    ],
  );
});
