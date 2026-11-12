import '../l10n/app_localizations.dart';

const interestGenres = [
  'dystopia',
  'science_fiction',
  'fantasy',
  'mystery',
  'classics',
  'psychology',
  'popular_science',
  'history',
];

String genreLabel(AppLocalizations l10n, String key) => switch (key) {
      'dystopia' => l10n.genreDystopia,
      'science_fiction' => l10n.genreScienceFiction,
      'fantasy' => l10n.genreFantasy,
      'mystery' => l10n.genreMystery,
      'classics' => l10n.genreClassics,
      'psychology' => l10n.genrePsychology,
      'popular_science' => l10n.genrePopularScience,
      'history' => l10n.genreHistory,
      _ => key,
    };
