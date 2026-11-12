import 'package:material_ui/material_ui.dart';

import '../config.dart';

class TwoPane extends StatelessWidget {
  const TwoPane({
    super.key,
    this.header = const [],
    required this.left,
    required this.right,
    this.padding = const EdgeInsets.fromLTRB(16, 16, 16, 24),
    this.leftFlex = 5,
    this.rightFlex = 6,
    this.narrowGap = 24,
  });

  final List<Widget> header;
  final List<Widget> left;
  final List<Widget> right;
  final EdgeInsets padding;
  final int leftFlex;
  final int rightFlex;
  final double narrowGap;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= twoPaneBreakpoint) {
          return SingleChildScrollView(
            padding: padding.copyWith(left: padding.left + 8, right: padding.right + 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ...header,
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(flex: leftFlex, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: left)),
                    const SizedBox(width: 32),
                    Expanded(flex: rightFlex, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: right)),
                  ],
                ),
              ],
            ),
          );
        }
        return Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: singleColumnMaxWidth),
            child: ListView(padding: padding, children: [...header, ...left, SizedBox(height: narrowGap), ...right]),
          ),
        );
      },
    );
  }
}
