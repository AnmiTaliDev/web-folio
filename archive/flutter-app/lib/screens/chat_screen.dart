import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_3_expressive/material_3_expressive.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:material_ui/material_ui.dart';

import '../config.dart';
import '../data/models.dart';
import '../data/providers.dart';
import '../l10n/app_localizations.dart';
import '../widgets/account_required.dart';
import '../widgets/genre_label.dart';

import 'package:go_router/go_router.dart';

String contextLine(AppLocalizations l10n, ChatContext context) {
  final items = [
    ...context.interests.map((genre) => genreLabel(l10n, genre)),
    if (context.likedCount > 0) l10n.chatLikedCount(context.likedCount),
    if (context.dislikedCount > 0) l10n.chatDislikedCount(context.dislikedCount),
  ];
  return items.isEmpty ? '' : l10n.chatTakenFromProfile(items.join(', '));
}

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();

  @override
  void dispose() {
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _send(String text) {
    ref.read(chatProvider.notifier).send(text);
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final registered = ref.watch(authStatusProvider).value?.registered ?? false;
    if (!registered) {
      return AccountRequired(
        message: l10n.chatNeedsAccount,
        onCreate: () => context.push('/auth?mode=register'),
        onSignIn: () => context.push('/auth?mode=login'),
      );
    }
    final messages = ref.watch(chatProvider);
    final aiAvailable = ref.watch(aiAvailableProvider).value ?? true;
    final busy = messages.any((message) => message.pending) || !aiAvailable;

    ref.listen(chatProvider, (previous, next) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) {
          _scroll.jumpTo(_scroll.position.maxScrollExtent);
        }
      });
    });

    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: chatMaxWidth),
        child: Column(
          children: [
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: M3ECard(
                key: const Key('chat-disclaimer'),
                variant: M3ECardVariant.filled,
                color: scheme.secondaryContainer,
                borderRadius: BorderRadius.circular(20),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                width: double.infinity,
                child: Row(
                  children: [
                    Icon(Symbols.info_rounded, size: 20, color: scheme.onSecondaryContainer),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        aiAvailable ? l10n.chatDisclaimer : l10n.chatUnavailableBanner,
                        style: textTheme.bodyMedium?.copyWith(color: scheme.onSecondaryContainer),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: messages.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Text(
                          l10n.chatEmpty,
                          key: const Key('chat-empty'),
                          textAlign: TextAlign.center,
                          style: textTheme.bodyLarge?.copyWith(color: scheme.onSurfaceVariant),
                        ),
                      ),
                    )
                  : ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.all(16),
                      itemCount: messages.length,
                      itemBuilder: (context, index) => _MessageBubble(message: messages[index]),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Wrap(
                  spacing: 8,
                  children: [
                    for (final suggestion in [l10n.chatSuggestEasier, l10n.chatSuggestOtherAuthors, l10n.chatSuggestShorter])
                      M3EChip(type: M3EChipType.suggestion, label: suggestion, onPressed: busy ? null : () => _send(suggestion)),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
              child: Row(
                children: [
                  Expanded(
                    child: M3ESearchBar(
                      key: const Key('chat-input'),
                      controller: _controller,
                      hintText: l10n.chatHint,
                      enabled: aiAvailable,
                      expandOnFocus: false,
                      textInputAction: TextInputAction.send,
                      onSubmitted: busy ? null : _send,
                    ),
                  ),
                  const SizedBox(width: 8),
                  M3EIconButton(
                    key: const Key('chat-send'),
                    tooltip: l10n.chatSend,
                    size: M3EIconButtonSize.md,
                    onPressed: busy ? null : () => _send(_controller.text),
                    icon: const Icon(Symbols.send_rounded),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});

  final ChatMessageView message;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final fromUser = message.fromUser;
    final profileLine = message.context == null ? '' : contextLine(l10n, message.context!);
    final errorText = switch (message.error) {
      null => null,
      'rate_limited' => l10n.chatErrorLimit,
      'ai_unavailable' => l10n.chatErrorUnavailable,
      _ => l10n.chatErrorGeneric,
    };

    return Align(
      alignment: fromUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        constraints: const BoxConstraints(maxWidth: 520),
        decoration: BoxDecoration(color: fromUser ? scheme.primary : scheme.surfaceContainerHigh, borderRadius: BorderRadius.circular(20)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (message.pending && message.text.isEmpty)
              const SizedBox(width: 48, height: 48, child: M3EExpressiveLoadingIndicator(key: Key('chat-loading')))
            else if (message.text.isNotEmpty)
              Text(message.text, style: textTheme.bodyLarge?.copyWith(color: fromUser ? scheme.onPrimary : scheme.onSurface)),
            for (final book in message.books) _BookCard(book: book),
            if (profileLine.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(profileLine, style: textTheme.labelMedium?.copyWith(color: scheme.onSurfaceVariant)),
              ),
            if (errorText != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(errorText, style: textTheme.bodyMedium?.copyWith(color: scheme.error)),
              ),
          ],
        ),
      ),
    );
  }
}

class _BookCard extends ConsumerWidget {
  const _BookCard({required this.book});

  final BookSummary book;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final inWishlist = ref.watch(wishlistProvider).value?.contains(book.id) ?? false;
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: M3ECard(
        variant: M3ECardVariant.filled,
        color: scheme.surface,
        borderRadius: BorderRadius.circular(20),
        padding: const EdgeInsets.fromLTRB(14, 8, 4, 8),
        width: double.infinity,
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(book.title, style: textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600)),
                  Text(book.authorLine, style: textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant)),
                ],
              ),
            ),
            M3EIconButton(
              key: Key('chat-wishlist-${book.id}'),
              variant: M3EIconButtonVariant.standard,
              tooltip: l10n.chatAddToWishlist,
              onPressed: () => ref.read(wishlistProvider.notifier).toggle(book.id),
              icon: Icon(Symbols.bookmark_rounded, fill: inWishlist ? 1 : 0, color: scheme.primary),
            ),
          ],
        ),
      ),
    );
  }
}
