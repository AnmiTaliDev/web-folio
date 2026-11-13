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
  String get recommendationsTitle => 'Рекомендации для вас';

  @override
  String ratedProgress(int count, int total) {
    return 'Оценено книг: $count из $total';
  }

  @override
  String get chatUnavailableBanner =>
      'ИИ-библиотекарь недоступен: на сервере не подключена языковая модель.';

  @override
  String get aiOffNote => 'ИИ не подключён на сервере';

  @override
  String get whyListTitle => 'Почему эта книга в списке';

  @override
  String get alreadyLiked => 'Вы уже оценили эту книгу: понравилась';

  @override
  String get alreadyDisliked => 'Вы уже оценили эту книгу: не понравилась';

  @override
  String get aiCaption => 'Описание сгенерировано ИИ';

  @override
  String get aiCaptionWarning =>
      'Описание сгенерировано ИИ и может содержать неточности';

  @override
  String get popularBadge => 'Популярное';

  @override
  String get popularHint =>
      'Пока мало данных о ваших вкусах, показываем популярное. Оцените книги, и подборка станет точнее.';

  @override
  String get alreadyReadHint =>
      'Отметьте 👍 или 👎 у книг, которые знаете. Чем больше оценок, тем точнее подборка.';

  @override
  String get wishlistTitle => 'Хочу прочитать';

  @override
  String get wishlistEmpty =>
      'Пока пусто. Нажмите «Сохранить» или «Хочу прочитать» у книги.';

  @override
  String get wishlistRemove => 'Убрать из списка';

  @override
  String get noPicks => 'Пока нечего рекомендовать';

  @override
  String get whyTitle => 'Почему это для вас';

  @override
  String get wantToRead => 'Хочу прочитать';

  @override
  String get inWishlist => 'В списке';

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
  String get chatEmpty =>
      'Расскажите, что хотите почитать: настроение, жанр, автора. Или выберите подсказку ниже.';

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
  String get accountTitle => 'Аккаунт';

  @override
  String get accountGuest =>
      'Вы гость. Создайте аккаунт, чтобы сохранить оценки и войти с другого устройства.';

  @override
  String accountSignedIn(String username) {
    return 'Вы вошли как $username';
  }

  @override
  String get createAccount => 'Создать аккаунт';

  @override
  String get signIn => 'Войти';

  @override
  String get signOut => 'Выйти';

  @override
  String get changePassword => 'Сменить пароль';

  @override
  String get passwordChanged => 'Пароль изменён';

  @override
  String get back => 'Назад';

  @override
  String get authModeRegister => 'Регистрация';

  @override
  String get authModeLogin => 'Вход';

  @override
  String get authModeRecover => 'Восстановление доступа';

  @override
  String get authUsername => 'Логин';

  @override
  String get authPassword => 'Пароль';

  @override
  String get authNewPassword => 'Новый пароль';

  @override
  String get authCurrentPassword => 'Текущий пароль';

  @override
  String get authRecoveryCode => 'Код восстановления';

  @override
  String get authForgot => 'Забыли пароль?';

  @override
  String get authRegisterHint =>
      'Логин: 3-32 символа, буквы, цифры, точка, дефис, подчёркивание. Пароль: от 8 символов. Почта не нужна.';

  @override
  String get authSubmitRegister => 'Создать аккаунт';

  @override
  String get authSubmitLogin => 'Войти';

  @override
  String get authSubmitRecover => 'Задать новый пароль';

  @override
  String get authErrorBadUsername =>
      'Логин: 3-32 символа, буквы, цифры, точка, дефис, подчёркивание.';

  @override
  String get authErrorShortPassword =>
      'Пароль должен быть не короче 8 символов.';

  @override
  String get authErrorEmptyField => 'Заполните поле.';

  @override
  String get authErrorInvalid => 'Неверный логин или пароль.';

  @override
  String get authErrorTaken => 'Этот логин занят.';

  @override
  String get authErrorThrottled =>
      'Слишком много попыток. Попробуйте через 15 минут.';

  @override
  String get authErrorInvalidRecovery =>
      'Неверный логин или код восстановления.';

  @override
  String get authErrorGeneric =>
      'Не удалось выполнить действие. Попробуйте ещё раз.';

  @override
  String get recoveryCodeTitle => 'Код восстановления';

  @override
  String get recoveryCodeBody =>
      'Сохраните этот код. Почты нет, поэтому это единственный способ вернуть доступ, если вы забудете пароль. Код показывается один раз.';

  @override
  String get recoveryCodeSaved => 'Я сохранил код';

  @override
  String get copy => 'Копировать';

  @override
  String get privateModeTitle => 'Приватный режим';

  @override
  String get privateModeBody =>
      'Без аккаунта мы ничего о вас не сохраняем. Поиск и просмотр книг работают, а оценки, личная подборка и чат доступны с аккаунтом.';

  @override
  String get promptText =>
      'Хотите подборку по своим вкусам? Аккаунт нужен только для этого, почта не требуется.';

  @override
  String get promptDismiss => 'Скрыть';

  @override
  String get guestPopularTitle => 'Популярное';

  @override
  String get guestCatalogTitle => 'Каталог';

  @override
  String get chatNeedsAccount => 'Чат с ИИ-библиотекарём доступен с аккаунтом.';

  @override
  String get guestBookHint =>
      'Войдите, чтобы узнать, почему эта книга подходит именно вам, и сохранить её в список.';

  @override
  String get noDescription => 'Описания этой книги в каталоге нет.';

  @override
  String get navSettings => 'Настройки';

  @override
  String get settingsTitle => 'Настройки';

  @override
  String get settingsAccount => 'Аккаунт';

  @override
  String get settingsPersonalization => 'Персонализация';

  @override
  String get settingsData => 'Мои данные';

  @override
  String get settingsAbout => 'О подборке';

  @override
  String get signOutEverywhere => 'Выйти на всех устройствах';

  @override
  String get newRecoveryCode => 'Новый код восстановления';

  @override
  String get newRecoveryCodeBody =>
      'Старый код перестанет работать. Для подтверждения введите пароль.';

  @override
  String get showMyData => 'Показать мои данные';

  @override
  String get exportTitle => 'Мои данные';

  @override
  String get exportHint =>
      'Всё, что хранится о вас на сервере. Пароль и код восстановления хранятся только в виде хешей и сюда не входят.';

  @override
  String get deleteAccountTitle => 'Удалить аккаунт?';

  @override
  String get deleteAccountBody =>
      'Будут удалены аккаунт, интересы, оценки, список «Хочу прочитать» и история чата. Для подтверждения введите пароль.';

  @override
  String get deleteAccount => 'Удалить аккаунт и данные';

  @override
  String get personalizationHint =>
      'Выключите, и подборка будет без ваших оценок.';

  @override
  String get aiDescriptionsHint =>
      'Тексты помечаются подписью «Описание сгенерировано ИИ».';

  @override
  String get confirm => 'Подтвердить';

  @override
  String get close => 'Закрыть';

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
  String get statsRead => 'прочитано';

  @override
  String get statsLiked => 'понравилось';

  @override
  String get matchLabel => 'совпадение';

  @override
  String get askLibrarian => 'Спросить ИИ';

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
      'После 8 оценок, среди которых есть и 👍, и 👎, небольшая нейросеть учится на ваших оценках и считает, насколько книга вам подойдёт. До этого подборка строится по сходству с понравившимися книгами и по популярности.';

  @override
  String get howLibrarian => 'ИИ-библиотекарь';

  @override
  String get howLibrarianBody =>
      'Отвечает на вопросы и называет только книги из каталога. Работает, если на сервере подключена языковая модель.';

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
