// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Russian (`ru`).
class AppLocalizationsRu extends AppLocalizations {
  AppLocalizationsRu([String locale = 'ru']) : super(locale);

  @override
  String get appName => 'Folio';

  @override
  String get onboardingSubtitle =>
      'Подберём книги по вашим интересам и оценкам. Данные можно изменить или удалить в любой момент.';

  @override
  String get consentNote =>
      'Хранятся только интересы, оценки, список «Хочу прочитать», история чата и настройки. Имя и почта не собираются.';

  @override
  String get searchHint => 'Название, автор или ISBN';

  @override
  String get interestsTitle => 'Интересы';

  @override
  String get alreadyReadTitle => 'Что вы уже читали';

  @override
  String get accuracyTitle => 'Точность подборки';

  @override
  String get showPicks => 'Показать подборку';

  @override
  String get skip => 'Пропустить';

  @override
  String get notFound => 'Не найдено';

  @override
  String get loadError => 'Не удалось загрузить данные';

  @override
  String get retry => 'Повторить';

  @override
  String get navPicks => 'Подборка';

  @override
  String get navChat => 'Чат';

  @override
  String get navProfile => 'Профиль';

  @override
  String get bookOfDay => 'Книга дня';

  @override
  String matchPercent(int percent) {
    return '$percent% совпадение';
  }

  @override
  String get whyForMe => 'Почему это для меня';

  @override
  String get save => 'Сохранить';

  @override
  String get saved => 'Сохранено';

  @override
  String get topForYou => 'Топ-15 для вас';

  @override
  String get aiCaption => 'Описание сгенерировано ИИ';

  @override
  String get aiCaptionWarning =>
      'Описание сгенерировано ИИ и может содержать неточности';

  @override
  String get noPicks => 'Пока нечего рекомендовать';

  @override
  String get whyTitle => 'Почему это для вас';

  @override
  String get wantToRead => 'Хочу прочитать';

  @override
  String get inWishlist => 'В списке «Хочу прочитать»';

  @override
  String get like => 'Понравилось';

  @override
  String get dislike => 'Не понравилось';

  @override
  String reasonLikedBook(String title) {
    return 'Вам понравилось «$title»';
  }

  @override
  String reasonGenre(String genres) {
    return 'Совпадает с интересами: $genres';
  }

  @override
  String get reasonSimilarReaders => 'Нравится читателям с похожими вкусами';

  @override
  String get reasonPopular => 'Популярно среди читателей';

  @override
  String get chatTitle => 'ИИ-библиотекарь';

  @override
  String get chatSubtitle => 'Подскажет, что почитать из каталога Folio';

  @override
  String get chatDisclaimer =>
      'ИИ может ошибаться. Проверяйте книги в каталоге.';

  @override
  String get chatHint => 'Спросите о книге';

  @override
  String get chatSend => 'Отправить';

  @override
  String chatTakenFromProfile(String items) {
    return 'Учтено из профиля: $items';
  }

  @override
  String chatLikedCount(int count) {
    return 'понравилось книг: $count';
  }

  @override
  String chatDislikedCount(int count) {
    return 'не понравилось книг: $count';
  }

  @override
  String get chatErrorUnavailable => 'ИИ-библиотекарь не настроен на сервере.';

  @override
  String get chatSuggestEasier => 'Что-то полегче';

  @override
  String get chatSuggestOtherAuthors => 'Другие авторы';

  @override
  String get chatSuggestShorter => 'Покороче';

  @override
  String get chatErrorGeneric =>
      'Не удалось получить ответ. Попробуйте ещё раз.';

  @override
  String get chatErrorLimit =>
      'Достигнут лимит: 20 сообщений в час. Попробуйте позже.';

  @override
  String get chatAddToWishlist => 'Добавить в «Хочу прочитать»';

  @override
  String get profileTitle => 'Профиль';

  @override
  String get algoThinks => 'Алгоритм считает, что вам нравится';

  @override
  String get mainGenre => 'Главный жанр';

  @override
  String get extraGenres => 'Дополнительно';

  @override
  String get noTasteYet => 'Оцените несколько книг, и здесь появятся жанры.';

  @override
  String readStats(int read, int liked) {
    return 'Прочитано: $read · Понравилось: $liked';
  }

  @override
  String get howItWorks => 'Как работает подборка';

  @override
  String get howRatings => 'Оценки и лайки';

  @override
  String get howRatingsBody => 'Каждая оценка меняет вектор ваших вкусов.';

  @override
  String get howNeural => 'Нейросеть';

  @override
  String get howNeuralBody =>
      'Небольшая нейросеть учится на ваших оценках и считает вероятность, что книга понравится.';

  @override
  String get howLibrarian => 'ИИ-библиотекарь';

  @override
  String get howLibrarianBody =>
      'Отвечает на вопросы и называет только книги из каталога.';

  @override
  String get privacy => 'Конфиденциальность';

  @override
  String get useLikes => 'Учитывать мои лайки';

  @override
  String get aiDescriptions => 'Описания книг от ИИ';

  @override
  String get deleteMyData => 'Удалить мои данные';

  @override
  String get deleteConfirmTitle => 'Удалить все данные?';

  @override
  String get deleteConfirmBody =>
      'Будут удалены интересы, оценки, список «Хочу прочитать», история чата и аккаунт. Действие нельзя отменить.';

  @override
  String get cancel => 'Отмена';

  @override
  String get delete => 'Удалить';

  @override
  String get genreDystopia => 'Антиутопия';

  @override
  String get genreScienceFiction => 'Фантастика';

  @override
  String get genreFantasy => 'Фэнтези';

  @override
  String get genreMystery => 'Детектив';

  @override
  String get genreClassics => 'Классика';

  @override
  String get genrePsychology => 'Психология';

  @override
  String get genrePopularScience => 'Научпоп';

  @override
  String get genreHistory => 'История';
}
