import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../config.dart';
import '../data/models.dart';
import '../data/providers.dart';
import '../l10n/app_localizations.dart';
import '../widgets/async_view.dart';
import '../widgets/book_banner.dart';

class GuestBookScreen extends ConsumerWidget {
  const GuestBookScreen({super.key, required this.bookId});

  final String bookId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: M3EAppBar.top(
        leading: M3EIconButton(
          key: const Key('guest-book-back'),
          variant: M3EIconButtonVariant.standard,
          tooltip: l10n.back,
          onPressed: () => context.canPop() ? context.pop() : context.go('/'),
          icon: const Icon(Symbols.arrow_back_rounded),
        ),
      ),
      body: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: singleColumnMaxWidth),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            children: [
              AsyncView<BookSummary?>(
                value: ref.watch(bookProvider(bookId)),
                onRetry: () => ref.invalidate(bookProvider(bookId)),
                builder: (book) {
                  if (book == null) {
                    return Text(l10n.notFound);
                  }
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      BookBanner(book: book),
                      const SizedBox(height: 16),
                      Text(book.description ?? l10n.noDescription, key: const Key('guest-book-description'), style: textTheme.bodyLarge),
                    ],
                  );
                },
              ),
              const SizedBox(height: 24),
              M3ECard(
                key: const Key('guest-book-prompt'),
                variant: M3ECardVariant.filled,
                color: scheme.secondaryContainer,
                borderRadius: BorderRadius.circular(24),
                padding: const EdgeInsets.all(16),
                width: double.infinity,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l10n.guestBookHint, style: textTheme.bodyMedium?.copyWith(color: scheme.onSecondaryContainer)),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      children: [
                        M3EButton.filled(onPressed: () => context.push('/auth?mode=register'), child: Text(l10n.createAccount)),
                        M3EButton.text(onPressed: () => context.push('/auth?mode=login'), child: Text(l10n.signIn)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
