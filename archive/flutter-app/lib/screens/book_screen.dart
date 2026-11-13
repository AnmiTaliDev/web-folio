import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import '../data/providers.dart';
import 'guest_book_screen.dart';
import 'why_screen.dart';

class BookScreen extends ConsumerWidget {
  const BookScreen({super.key, required this.bookId});

  final String bookId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final registered = ref.watch(authStatusProvider).value?.registered ?? false;
    return registered ? WhyScreen(bookId: bookId) : GuestBookScreen(bookId: bookId);
  }
}
