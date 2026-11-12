import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ru.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('ru')];

  /// No description provided for @appName.
  ///
  /// In ru, this message translates to:
  /// **'Folio'**
  String get appName;

  /// No description provided for @onboardingSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Подберём книги по вашим интересам и оценкам. Данные можно изменить или удалить в любой момент.'**
  String get onboardingSubtitle;

  /// No description provided for @consentNote.
  ///
  /// In ru, this message translates to:
  /// **'Хранятся только интересы, оценки, список «Хочу прочитать», история чата и настройки. Имя и почта не собираются.'**
  String get consentNote;

  /// No description provided for @searchHint.
  ///
  /// In ru, this message translates to:
  /// **'Название, автор или ISBN'**
  String get searchHint;

  /// No description provided for @interestsTitle.
  ///
  /// In ru, this message translates to:
  /// **'Интересы'**
  String get interestsTitle;

  /// No description provided for @alreadyReadTitle.
  ///
  /// In ru, this message translates to:
  /// **'Что вы уже читали'**
  String get alreadyReadTitle;

  /// No description provided for @accuracyTitle.
  ///
  /// In ru, this message translates to:
  /// **'Точность подборки'**
  String get accuracyTitle;

  /// No description provided for @showPicks.
  ///
  /// In ru, this message translates to:
  /// **'Показать подборку'**
  String get showPicks;

  /// No description provided for @skip.
  ///
  /// In ru, this message translates to:
  /// **'Пропустить'**
  String get skip;

  /// No description provided for @notFound.
  ///
  /// In ru, this message translates to:
  /// **'Не найдено'**
  String get notFound;

  /// No description provided for @loadError.
  ///
  /// In ru, this message translates to:
  /// **'Не удалось загрузить данные'**
  String get loadError;

  /// No description provided for @retry.
  ///
  /// In ru, this message translates to:
  /// **'Повторить'**
  String get retry;

  /// No description provided for @navPicks.
  ///
  /// In ru, this message translates to:
  /// **'Подборка'**
  String get navPicks;

  /// No description provided for @navChat.
  ///
  /// In ru, this message translates to:
  /// **'Чат'**
  String get navChat;

  /// No description provided for @navProfile.
  ///
  /// In ru, this message translates to:
  /// **'Профиль'**
  String get navProfile;

  /// No description provided for @bookOfDay.
  ///
  /// In ru, this message translates to:
  /// **'Книга дня'**
  String get bookOfDay;

  /// No description provided for @matchPercent.
  ///
  /// In ru, this message translates to:
  /// **'{percent}% совпадение'**
  String matchPercent(int percent);

  /// No description provided for @whyForMe.
  ///
  /// In ru, this message translates to:
  /// **'Почему это для меня'**
  String get whyForMe;

  /// No description provided for @save.
  ///
  /// In ru, this message translates to:
  /// **'Сохранить'**
  String get save;

  /// No description provided for @saved.
  ///
  /// In ru, this message translates to:
  /// **'Сохранено'**
  String get saved;

  /// No description provided for @topForYou.
  ///
  /// In ru, this message translates to:
  /// **'Топ-15 для вас'**
  String get topForYou;

  /// No description provided for @aiCaption.
  ///
  /// In ru, this message translates to:
  /// **'Описание сгенерировано ИИ'**
  String get aiCaption;

  /// No description provided for @aiCaptionWarning.
  ///
  /// In ru, this message translates to:
  /// **'Описание сгенерировано ИИ и может содержать неточности'**
  String get aiCaptionWarning;

  /// No description provided for @noPicks.
  ///
  /// In ru, this message translates to:
  /// **'Пока нечего рекомендовать'**
  String get noPicks;

  /// No description provided for @whyTitle.
  ///
  /// In ru, this message translates to:
  /// **'Почему это для вас'**
  String get whyTitle;

  /// No description provided for @wantToRead.
  ///
  /// In ru, this message translates to:
  /// **'Хочу прочитать'**
  String get wantToRead;

  /// No description provided for @inWishlist.
  ///
  /// In ru, this message translates to:
  /// **'В списке «Хочу прочитать»'**
  String get inWishlist;

  /// No description provided for @like.
  ///
  /// In ru, this message translates to:
  /// **'Понравилось'**
  String get like;

  /// No description provided for @dislike.
  ///
  /// In ru, this message translates to:
  /// **'Не понравилось'**
  String get dislike;

  /// No description provided for @reasonLikedBook.
  ///
  /// In ru, this message translates to:
  /// **'Вам понравилось «{title}»'**
  String reasonLikedBook(String title);

  /// No description provided for @reasonGenre.
  ///
  /// In ru, this message translates to:
  /// **'Совпадает с интересами: {genres}'**
  String reasonGenre(String genres);

  /// No description provided for @reasonSimilarReaders.
  ///
  /// In ru, this message translates to:
  /// **'Нравится читателям с похожими вкусами'**
  String get reasonSimilarReaders;

  /// No description provided for @reasonPopular.
  ///
  /// In ru, this message translates to:
  /// **'Популярно среди читателей'**
  String get reasonPopular;

  /// No description provided for @chatTitle.
  ///
  /// In ru, this message translates to:
  /// **'ИИ-библиотекарь'**
  String get chatTitle;

  /// No description provided for @chatSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Подскажет, что почитать из каталога Folio'**
  String get chatSubtitle;

  /// No description provided for @chatDisclaimer.
  ///
  /// In ru, this message translates to:
  /// **'ИИ может ошибаться. Проверяйте книги в каталоге.'**
  String get chatDisclaimer;

  /// No description provided for @chatHint.
  ///
  /// In ru, this message translates to:
  /// **'Спросите о книге'**
  String get chatHint;

  /// No description provided for @chatSend.
  ///
  /// In ru, this message translates to:
  /// **'Отправить'**
  String get chatSend;

  /// No description provided for @chatTakenFromProfile.
  ///
  /// In ru, this message translates to:
  /// **'Учтено из профиля: {items}'**
  String chatTakenFromProfile(String items);

  /// No description provided for @chatLikedCount.
  ///
  /// In ru, this message translates to:
  /// **'понравилось книг: {count}'**
  String chatLikedCount(int count);

  /// No description provided for @chatDislikedCount.
  ///
  /// In ru, this message translates to:
  /// **'не понравилось книг: {count}'**
  String chatDislikedCount(int count);

  /// No description provided for @chatErrorUnavailable.
  ///
  /// In ru, this message translates to:
  /// **'ИИ-библиотекарь не настроен на сервере.'**
  String get chatErrorUnavailable;

  /// No description provided for @chatSuggestEasier.
  ///
  /// In ru, this message translates to:
  /// **'Что-то полегче'**
  String get chatSuggestEasier;

  /// No description provided for @chatSuggestOtherAuthors.
  ///
  /// In ru, this message translates to:
  /// **'Другие авторы'**
  String get chatSuggestOtherAuthors;

  /// No description provided for @chatSuggestShorter.
  ///
  /// In ru, this message translates to:
  /// **'Покороче'**
  String get chatSuggestShorter;

  /// No description provided for @chatErrorGeneric.
  ///
  /// In ru, this message translates to:
  /// **'Не удалось получить ответ. Попробуйте ещё раз.'**
  String get chatErrorGeneric;

  /// No description provided for @chatErrorLimit.
  ///
  /// In ru, this message translates to:
  /// **'Достигнут лимит: 20 сообщений в час. Попробуйте позже.'**
  String get chatErrorLimit;

  /// No description provided for @chatAddToWishlist.
  ///
  /// In ru, this message translates to:
  /// **'Добавить в «Хочу прочитать»'**
  String get chatAddToWishlist;

  /// No description provided for @profileTitle.
  ///
  /// In ru, this message translates to:
  /// **'Профиль'**
  String get profileTitle;

  /// No description provided for @algoThinks.
  ///
  /// In ru, this message translates to:
  /// **'Алгоритм считает, что вам нравится'**
  String get algoThinks;

  /// No description provided for @mainGenre.
  ///
  /// In ru, this message translates to:
  /// **'Главный жанр'**
  String get mainGenre;

  /// No description provided for @extraGenres.
  ///
  /// In ru, this message translates to:
  /// **'Дополнительно'**
  String get extraGenres;

  /// No description provided for @noTasteYet.
  ///
  /// In ru, this message translates to:
  /// **'Оцените несколько книг, и здесь появятся жанры.'**
  String get noTasteYet;

  /// No description provided for @readStats.
  ///
  /// In ru, this message translates to:
  /// **'Прочитано: {read} · Понравилось: {liked}'**
  String readStats(int read, int liked);

  /// No description provided for @howItWorks.
  ///
  /// In ru, this message translates to:
  /// **'Как работает подборка'**
  String get howItWorks;

  /// No description provided for @howRatings.
  ///
  /// In ru, this message translates to:
  /// **'Оценки и лайки'**
  String get howRatings;

  /// No description provided for @howRatingsBody.
  ///
  /// In ru, this message translates to:
  /// **'Каждая оценка меняет вектор ваших вкусов.'**
  String get howRatingsBody;

  /// No description provided for @howNeural.
  ///
  /// In ru, this message translates to:
  /// **'Нейросеть'**
  String get howNeural;

  /// No description provided for @howNeuralBody.
  ///
  /// In ru, this message translates to:
  /// **'Небольшая нейросеть учится на ваших оценках и считает вероятность, что книга понравится.'**
  String get howNeuralBody;

  /// No description provided for @howLibrarian.
  ///
  /// In ru, this message translates to:
  /// **'ИИ-библиотекарь'**
  String get howLibrarian;

  /// No description provided for @howLibrarianBody.
  ///
  /// In ru, this message translates to:
  /// **'Отвечает на вопросы и называет только книги из каталога.'**
  String get howLibrarianBody;

  /// No description provided for @privacy.
  ///
  /// In ru, this message translates to:
  /// **'Конфиденциальность'**
  String get privacy;

  /// No description provided for @useLikes.
  ///
  /// In ru, this message translates to:
  /// **'Учитывать мои лайки'**
  String get useLikes;

  /// No description provided for @aiDescriptions.
  ///
  /// In ru, this message translates to:
  /// **'Описания книг от ИИ'**
  String get aiDescriptions;

  /// No description provided for @deleteMyData.
  ///
  /// In ru, this message translates to:
  /// **'Удалить мои данные'**
  String get deleteMyData;

  /// No description provided for @deleteConfirmTitle.
  ///
  /// In ru, this message translates to:
  /// **'Удалить все данные?'**
  String get deleteConfirmTitle;

  /// No description provided for @deleteConfirmBody.
  ///
  /// In ru, this message translates to:
  /// **'Будут удалены интересы, оценки, список «Хочу прочитать», история чата и аккаунт. Действие нельзя отменить.'**
  String get deleteConfirmBody;

  /// No description provided for @cancel.
  ///
  /// In ru, this message translates to:
  /// **'Отмена'**
  String get cancel;

  /// No description provided for @delete.
  ///
  /// In ru, this message translates to:
  /// **'Удалить'**
  String get delete;

  /// No description provided for @genreDystopia.
  ///
  /// In ru, this message translates to:
  /// **'Антиутопия'**
  String get genreDystopia;

  /// No description provided for @genreScienceFiction.
  ///
  /// In ru, this message translates to:
  /// **'Фантастика'**
  String get genreScienceFiction;

  /// No description provided for @genreFantasy.
  ///
  /// In ru, this message translates to:
  /// **'Фэнтези'**
  String get genreFantasy;

  /// No description provided for @genreMystery.
  ///
  /// In ru, this message translates to:
  /// **'Детектив'**
  String get genreMystery;

  /// No description provided for @genreClassics.
  ///
  /// In ru, this message translates to:
  /// **'Классика'**
  String get genreClassics;

  /// No description provided for @genrePsychology.
  ///
  /// In ru, this message translates to:
  /// **'Психология'**
  String get genrePsychology;

  /// No description provided for @genrePopularScience.
  ///
  /// In ru, this message translates to:
  /// **'Научпоп'**
  String get genrePopularScience;

  /// No description provided for @genreHistory.
  ///
  /// In ru, this message translates to:
  /// **'История'**
  String get genreHistory;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ru'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ru':
      return AppLocalizationsRu();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
