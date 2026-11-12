import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import 'app.dart';

void main() {
  runApp(ProviderScope(retry: (retryCount, error) => null, child: const FolioApp()));
}
