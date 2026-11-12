import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:folio/data/models.dart';
import 'package:folio/router.dart';

void main() {
  const profile = UserProfile(interests: [], personalizationEnabled: true, aiDescriptionsEnabled: true);
  const loading = AsyncLoading<AuthStatus>();
  const profileLoading = AsyncLoading<UserProfile?>();
  const guest = AsyncData<AuthStatus>(AuthStatus(registered: false));
  const member = AsyncData<AuthStatus>(AuthStatus(registered: true, username: 'reader'));
  const noProfile = AsyncData<UserProfile?>(null);
  const hasProfile = AsyncData<UserProfile?>(profile);

  String? go(AsyncValue<AuthStatus> auth, AsyncValue<UserProfile?> profile, String location) => redirectFor(auth, profile, Uri.parse(location));

  test('keeps the requested page while the session is being checked', () {
    expect(go(loading, noProfile, '/profile'), '/loading?from=%2Fprofile');
    expect(go(loading, noProfile, '/book/abc?x=1'), '/loading?from=%2Fbook%2Fabc%3Fx%3D1');
    expect(go(loading, noProfile, '/loading?from=%2Fprofile'), isNull);
  });

  group('without an account', () {
    test('may use every page except onboarding and is never sent to onboarding', () {
      for (final path in ['/', '/chat', '/profile', '/settings', '/book/abc', '/auth']) {
        expect(go(guest, noProfile, path), isNull, reason: path);
      }
      expect(go(guest, noProfile, '/onboarding'), '/');
    });

    test('returns to the requested page after loading', () {
      expect(go(guest, noProfile, '/loading?from=%2Fprofile'), '/profile');
      expect(go(guest, noProfile, '/loading'), '/');
      expect(go(guest, noProfile, '/loading?from=%2F%2Fevil.example'), '/');
    });

    test('does not wait for a profile', () {
      expect(go(guest, profileLoading, '/'), isNull);
    });
  });

  group('with an account', () {
    test('waits for the profile', () {
      expect(go(member, profileLoading, '/profile'), '/loading?from=%2Fprofile');
    });

    test('goes to onboarding until a profile exists, but keeps the auth page', () {
      expect(go(member, noProfile, '/'), '/onboarding');
      expect(go(member, noProfile, '/chat'), '/onboarding');
      expect(go(member, noProfile, '/onboarding'), isNull);
      expect(go(member, noProfile, '/auth'), isNull);
      expect(go(member, noProfile, '/loading?from=%2Fprofile'), '/onboarding');
    });

    test('returns to the requested page once the profile is known and leaves onboarding', () {
      expect(go(member, hasProfile, '/loading?from=%2Fprofile'), '/profile');
      expect(go(member, hasProfile, '/loading?from=%2Fbook%2Fabc'), '/book/abc');
      expect(go(member, hasProfile, '/loading'), '/');
      expect(go(member, hasProfile, '/onboarding'), '/');
      expect(go(member, hasProfile, '/chat'), isNull);
      expect(go(member, hasProfile, '/settings'), isNull);
    });

    test('ignores unsafe or looping targets', () {
      expect(go(member, hasProfile, '/loading?from=https%3A%2F%2Fevil.example'), '/');
      expect(go(member, hasProfile, '/loading?from=%2Floading'), '/');
      expect(go(member, hasProfile, '/loading?from=%2Fonboarding'), '/');
    });
  });
}
