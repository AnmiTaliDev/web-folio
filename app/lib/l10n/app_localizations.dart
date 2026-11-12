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

  /// No description provided for @recommendationsTitle.
  ///
  /// In ru, this message translates to:
  /// **'Рекомендации для вас'**
  String get recommendationsTitle;

  /// No description provided for @ratedProgress.
  ///
  /// In ru, this message translates to:
  /// **'Оценено книг: {count} из {total}'**
  String ratedProgress(int count, int total);

  /// No description provided for @chatUnavailableBanner.
  ///
  /// In ru, this message translates to:
  /// **'ИИ-библиотекарь недоступен: на сервере не подключена языковая модель.'**
  String get chatUnavailableBanner;

  /// No description provided for @aiOffNote.
  ///
  /// In ru, this message translates to:
  /// **'ИИ не подключён на сервере'**
  String get aiOffNote;

  /// No description provided for @whyListTitle.
  ///
  /// In ru, this message translates to:
  /// **'Почему эта книга в списке'**
  String get whyListTitle;

  /// No description provided for @alreadyLiked.
  ///
  /// In ru, this message translates to:
  /// **'Вы уже оценили эту книгу: понравилась'**
  String get alreadyLiked;

  /// No description provided for @alreadyDisliked.
  ///
  /// In ru, this message translates to:
  /// **'Вы уже оценили эту книгу: не понравилась'**
  String get alreadyDisliked;

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

  /// No description provided for @popularBadge.
  ///
  /// In ru, this message translates to:
  /// **'Популярное'**
  String get popularBadge;

  /// No description provided for @popularHint.
  ///
  /// In ru, this message translates to:
  /// **'Пока мало данных о ваших вкусах, показываем популярное. Оцените книги, и подборка станет точнее.'**
  String get popularHint;

  /// No description provided for @alreadyReadHint.
  ///
  /// In ru, this message translates to:
  /// **'Отметьте 👍 или 👎 у книг, которые знаете. Чем больше оценок, тем точнее подборка.'**
  String get alreadyReadHint;

  /// No description provided for @wishlistTitle.
  ///
  /// In ru, this message translates to:
  /// **'Хочу прочитать'**
  String get wishlistTitle;

  /// No description provided for @wishlistEmpty.
  ///
  /// In ru, this message translates to:
  /// **'Пока пусто. Нажмите «Сохранить» или «Хочу прочитать» у книги.'**
  String get wishlistEmpty;

  /// No description provided for @wishlistRemove.
  ///
  /// In ru, this message translates to:
  /// **'Убрать из списка'**
  String get wishlistRemove;

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

  /// No description provided for @chatEmpty.
  ///
  /// In ru, this message translates to:
  /// **'Расскажите, что хотите почитать: настроение, жанр, автора. Или выберите подсказку ниже.'**
  String get chatEmpty;

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

  /// No description provided for @accountTitle.
  ///
  /// In ru, this message translates to:
  /// **'Аккаунт'**
  String get accountTitle;

  /// No description provided for @accountGuest.
  ///
  /// In ru, this message translates to:
  /// **'Вы гость. Создайте аккаунт, чтобы сохранить оценки и войти с другого устройства.'**
  String get accountGuest;

  /// No description provided for @accountSignedIn.
  ///
  /// In ru, this message translates to:
  /// **'Вы вошли как {username}'**
  String accountSignedIn(String username);

  /// No description provided for @createAccount.
  ///
  /// In ru, this message translates to:
  /// **'Создать аккаунт'**
  String get createAccount;

  /// No description provided for @signIn.
  ///
  /// In ru, this message translates to:
  /// **'Войти'**
  String get signIn;

  /// No description provided for @signOut.
  ///
  /// In ru, this message translates to:
  /// **'Выйти'**
  String get signOut;

  /// No description provided for @changePassword.
  ///
  /// In ru, this message translates to:
  /// **'Сменить пароль'**
  String get changePassword;

  /// No description provided for @passwordChanged.
  ///
  /// In ru, this message translates to:
  /// **'Пароль изменён'**
  String get passwordChanged;

  /// No description provided for @signInHaveAccount.
  ///
  /// In ru, this message translates to:
  /// **'Уже есть аккаунт? Войти'**
  String get signInHaveAccount;

  /// No description provided for @back.
  ///
  /// In ru, this message translates to:
  /// **'Назад'**
  String get back;

  /// No description provided for @authModeRegister.
  ///
  /// In ru, this message translates to:
  /// **'Регистрация'**
  String get authModeRegister;

  /// No description provided for @authModeLogin.
  ///
  /// In ru, this message translates to:
  /// **'Вход'**
  String get authModeLogin;

  /// No description provided for @authModeRecover.
  ///
  /// In ru, this message translates to:
  /// **'Восстановление доступа'**
  String get authModeRecover;

  /// No description provided for @authUsername.
  ///
  /// In ru, this message translates to:
  /// **'Логин'**
  String get authUsername;

  /// No description provided for @authPassword.
  ///
  /// In ru, this message translates to:
  /// **'Пароль'**
  String get authPassword;

  /// No description provided for @authNewPassword.
  ///
  /// In ru, this message translates to:
  /// **'Новый пароль'**
  String get authNewPassword;

  /// No description provided for @authCurrentPassword.
  ///
  /// In ru, this message translates to:
  /// **'Текущий пароль'**
  String get authCurrentPassword;

  /// No description provided for @authRecoveryCode.
  ///
  /// In ru, this message translates to:
  /// **'Код восстановления'**
  String get authRecoveryCode;

  /// No description provided for @authForgot.
  ///
  /// In ru, this message translates to:
  /// **'Забыли пароль?'**
  String get authForgot;

  /// No description provided for @authRegisterHint.
  ///
  /// In ru, this message translates to:
  /// **'Логин: 3-32 символа, буквы, цифры, точка, дефис, подчёркивание. Пароль: от 8 символов. Почта не нужна.'**
  String get authRegisterHint;

  /// No description provided for @authLoginWarning.
  ///
  /// In ru, this message translates to:
  /// **'Данные текущего гостя будут удалены, если вы войдёте в другой аккаунт.'**
  String get authLoginWarning;

  /// No description provided for @authSubmitRegister.
  ///
  /// In ru, this message translates to:
  /// **'Создать аккаунт'**
  String get authSubmitRegister;

  /// No description provided for @authSubmitLogin.
  ///
  /// In ru, this message translates to:
  /// **'Войти'**
  String get authSubmitLogin;

  /// No description provided for @authSubmitRecover.
  ///
  /// In ru, this message translates to:
  /// **'Задать новый пароль'**
  String get authSubmitRecover;

  /// No description provided for @authErrorBadUsername.
  ///
  /// In ru, this message translates to:
  /// **'Логин: 3-32 символа, буквы, цифры, точка, дефис, подчёркивание.'**
  String get authErrorBadUsername;

  /// No description provided for @authErrorShortPassword.
  ///
  /// In ru, this message translates to:
  /// **'Пароль должен быть не короче 8 символов.'**
  String get authErrorShortPassword;

  /// No description provided for @authErrorEmptyField.
  ///
  /// In ru, this message translates to:
  /// **'Заполните поле.'**
  String get authErrorEmptyField;

  /// No description provided for @authErrorInvalid.
  ///
  /// In ru, this message translates to:
  /// **'Неверный логин или пароль.'**
  String get authErrorInvalid;

  /// No description provided for @authErrorTaken.
  ///
  /// In ru, this message translates to:
  /// **'Этот логин занят.'**
  String get authErrorTaken;

  /// No description provided for @authErrorThrottled.
  ///
  /// In ru, this message translates to:
  /// **'Слишком много попыток. Попробуйте через 15 минут.'**
  String get authErrorThrottled;

  /// No description provided for @authErrorInvalidRecovery.
  ///
  /// In ru, this message translates to:
  /// **'Неверный логин или код восстановления.'**
  String get authErrorInvalidRecovery;

  /// No description provided for @authErrorGeneric.
  ///
  /// In ru, this message translates to:
  /// **'Не удалось выполнить действие. Попробуйте ещё раз.'**
  String get authErrorGeneric;

  /// No description provided for @recoveryCodeTitle.
  ///
  /// In ru, this message translates to:
  /// **'Код восстановления'**
  String get recoveryCodeTitle;

  /// No description provided for @recoveryCodeBody.
  ///
  /// In ru, this message translates to:
  /// **'Сохраните этот код. Почты нет, поэтому это единственный способ вернуть доступ, если вы забудете пароль. Код показывается один раз.'**
  String get recoveryCodeBody;

  /// No description provided for @recoveryCodeSaved.
  ///
  /// In ru, this message translates to:
  /// **'Я сохранил код'**
  String get recoveryCodeSaved;

  /// No description provided for @copy.
  ///
  /// In ru, this message translates to:
  /// **'Копировать'**
  String get copy;

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
  /// **'После 8 оценок, среди которых есть и 👍, и 👎, небольшая нейросеть учится на ваших оценках и считает, насколько книга вам подойдёт. До этого подборка строится по сходству с понравившимися книгами и по популярности.'**
  String get howNeuralBody;

  /// No description provided for @howLibrarian.
  ///
  /// In ru, this message translates to:
  /// **'ИИ-библиотекарь'**
  String get howLibrarian;

  /// No description provided for @howLibrarianBody.
  ///
  /// In ru, this message translates to:
  /// **'Отвечает на вопросы и называет только книги из каталога. Работает, если на сервере подключена языковая модель.'**
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
