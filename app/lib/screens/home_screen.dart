import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import '../data/providers.dart';
import 'guest_home_screen.dart';
import 'picks_screen.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final registered = ref.watch(authStatusProvider).value?.registered ?? false;
    return registered ? const PicksScreen() : const GuestHomeScreen();
  }
}
