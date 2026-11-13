import 'package:material_ui/material_ui.dart';

import '../config.dart';

const _panelPadding = EdgeInsets.all(20);

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
            padding: padding,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ...header,
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      flex: leftFlex,
                      child: _Panel(children: left),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      flex: rightFlex,
                      child: _Panel(children: right),
                    ),
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
            child: ListView(
              padding: padding,
              children: [
                ...header,
                ...left,
                SizedBox(height: narrowGap),
                ...right,
              ],
            ),
          ),
        );
      },
    );
  }
}

class _Panel extends StatelessWidget {
  const _Panel({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    if (children.isEmpty) {
      return const SizedBox.shrink();
    }
    return Container(
      width: double.infinity,
      padding: _panelPadding,
      decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerLow, borderRadius: BorderRadius.circular(36)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
    );
  }
}
