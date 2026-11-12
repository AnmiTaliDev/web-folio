import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:folio/data/models.dart';
import 'package:folio/router.dart';

void main() {
  const profile = UserProfile(interests: [], personalizationEnabled: true, aiDescriptionsEnabled: true);
  const loading = AsyncLoading<UserProfile?>();
  const guest = AsyncData<UserProfile?>(null);
  const onboarded = AsyncData<UserProfile?>(profile);

  test('keeps the requested page while the profile loads', () {
    expect(redirectFor(loading, Uri.parse('/profile')), '/loading?from=%2Fprofile');
    expect(redirectFor(loading, Uri.parse('/book/abc?x=1')), '/loading?from=%2Fbook%2Fabc%3Fx%3D1');
    expect(redirectFor(loading, Uri.parse('/loading?from=%2Fprofile')), isNull);
  });

  test('returns to the requested page once the profile is known', () {
    expect(redirectFor(onboarded, Uri.parse('/loading?from=%2Fprofile')), '/profile');
    expect(redirectFor(onboarded, Uri.parse('/loading?from=%2Fbook%2Fabc')), '/book/abc');
    expect(redirectFor(onboarded, Uri.parse('/loading')), '/');
    expect(redirectFor(onboarded, Uri.parse('/onboarding')), '/');
  });

  test('ignores unsafe or looping targets', () {
    expect(redirectFor(onboarded, Uri.parse('/loading?from=%2F%2Fevil.example')), '/');
    expect(redirectFor(onboarded, Uri.parse('/loading?from=https%3A%2F%2Fevil.example')), '/');
    expect(redirectFor(onboarded, Uri.parse('/loading?from=%2Floading')), '/');
    expect(redirectFor(onboarded, Uri.parse('/loading?from=%2Fonboarding')), '/');
  });

  test('sends users without a profile to onboarding but keeps the auth page', () {
    expect(redirectFor(guest, Uri.parse('/')), '/onboarding');
    expect(redirectFor(guest, Uri.parse('/profile')), '/onboarding');
    expect(redirectFor(guest, Uri.parse('/onboarding')), isNull);
    expect(redirectFor(guest, Uri.parse('/auth')), isNull);
    expect(redirectFor(guest, Uri.parse('/loading?from=%2Fauth%3Fmode%3Dregister')), '/auth?mode=register');
    expect(redirectFor(guest, Uri.parse('/loading?from=%2Fprofile')), '/onboarding');
  });

  test('leaves other pages alone for onboarded users', () {
    expect(redirectFor(onboarded, Uri.parse('/chat')), isNull);
    expect(redirectFor(onboarded, Uri.parse('/auth')), isNull);
  });
}
