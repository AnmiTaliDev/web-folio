import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:folio/data/models.dart';
import 'package:folio/router.dart';

void main() {
  const profile = UserProfile(interests: [], personalizationEnabled: true, aiDescriptionsEnabled: true);

  test('stays on the loading route until the profile is known', () {
    expect(redirectFor(const AsyncLoading<UserProfile?>(), '/'), '/loading');
    expect(redirectFor(const AsyncLoading<UserProfile?>(), '/loading'), isNull);
  });

  test('sends users without a profile to onboarding', () {
    expect(redirectFor(const AsyncData<UserProfile?>(null), '/'), '/onboarding');
    expect(redirectFor(const AsyncData<UserProfile?>(null), '/onboarding'), isNull);
    expect(redirectFor(const AsyncData<UserProfile?>(null), '/auth'), isNull);
  });

  test('sends onboarded users away from onboarding and loading', () {
    expect(redirectFor(const AsyncData<UserProfile?>(profile), '/onboarding'), '/');
    expect(redirectFor(const AsyncData<UserProfile?>(profile), '/loading'), '/');
    expect(redirectFor(const AsyncData<UserProfile?>(profile), '/chat'), isNull);
    expect(redirectFor(const AsyncData<UserProfile?>(profile), '/auth'), isNull);
  });
}
