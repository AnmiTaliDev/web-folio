import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:folio/data/api_client.dart';

void main() {
  test('parses SSE frames into named events', () async {
    final lines = Stream.fromIterable([
      'event: books',
      'data: ${jsonEncode({'books': []})}',
      '',
      'event: token',
      'data: {"text":"Hi"}',
      '',
      'event: done',
      'data: {}',
      '',
    ]);
    final events = await parseSse(lines).toList();
    expect(events.map((event) => event.name), ['books', 'token', 'done']);
    expect(events[1].data['text'], 'Hi');
  });

  test('ignores an incomplete trailing frame', () async {
    final events = await parseSse(Stream.fromIterable(['event: token', 'data: {"text":"x"}'])).toList();
    expect(events, isEmpty);
  });
}
