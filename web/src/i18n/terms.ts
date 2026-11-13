export const TERMS_VERSION = '2026-11-13'

export type TermsSection = { id: string; title: string; paragraphs?: string[]; items?: string[]; closing?: string[] }
export type TermsText = { title: string; intro: string; sections: TermsSection[] }

const ru: TermsText = {
  title: 'Условия использования',
  intro:
    'Folio это сервис подбора книг. Его делает небольшая команда как школьный проект, и он может развиваться дальше. Эти условия объясняют, что мы делаем с вашими данными, чего ждём от вас и на что вы можете рассчитывать. Мы старались написать их так, чтобы их можно было прочитать за пять минут.',
  sections: [
    {
      id: 'who',
      title: 'Кто мы',
      paragraphs: [
        'Сервис ведёт команда проекта Folio (далее «мы»). Мы не юридическое лицо: это группа участников школьного конкурса. Если проект станет развиваться, мы обновим условия и укажем, кто его ведёт.',
      ],
    },
    {
      id: 'service',
      title: 'Что это за сервис',
      paragraphs: [
        'Folio подбирает книги по вашим интересам и оценкам, объясняет рекомендации, показывает книгу дня и, если на сервере подключена языковая модель, отвечает в чате ИИ-библиотекаря. Сервис бесплатный.',
        'Каталог ограничен и содержит ошибки. Рекомендации это предположения алгоритма, а не совет и не оценка качества книги.',
      ],
    },
    {
      id: 'account',
      title: 'Приватный режим и аккаунт',
      paragraphs: [
        'Без аккаунта Folio ничего о вас не хранит: поиск и просмотр каталога работают без регистрации, без cookie и без записи в базу. Аккаунт нужен для оценок, личной подборки, чата и списка «Хочу прочитать».',
        'При создании аккаунта нужно принять эти условия. Мы сохраняем версию условий и время, когда вы их приняли.',
      ],
    },
    {
      id: 'credentials',
      title: 'Ваш аккаунт',
      items: [
        'Для аккаунта нужны логин и пароль. Почта не нужна.',
        'Пароль хранится только в виде хеша. Мы не можем его прочитать или напомнить.',
        'При регистрации вы получаете код восстановления. Это единственный способ вернуть доступ, если вы забыли пароль. Если потеряны и пароль, и код, мы не сможем восстановить аккаунт.',
        'Вы отвечаете за действия из своего аккаунта. Если подозреваете чужой вход, завершите сеансы и смените пароль в настройках.',
      ],
    },
    {
      id: 'data',
      title: 'Какие данные мы храним',
      paragraphs: [
        'Интересы, оценки книг, список «Хочу прочитать», историю чата, настройки, логин, хеши пароля и кода восстановления, дату создания аккаунта и версию принятых условий. Для каждого сеанса входа ещё описание браузера, время входа и время последней активности.',
        'Мы не собираем имя, почту, телефон, возраст, адрес и местоположение. Мы не показываем рекламу, не продаём данные, не передаём их для рекламы и не используем трекеры.',
        'Сервер не сохраняет IP-адреса в базе данных. Хостинг-провайдер может видеть технические данные запросов, и это вне нашего контроля.',
      ],
    },
    {
      id: 'rights',
      title: 'Ваши права на данные',
      paragraphs: [
        'В настройках можно посмотреть все данные о вас, получить новый код восстановления, завершить любой сеанс и удалить аккаунт со всеми данными. Удаление необратимо.',
        'Если нужно удалить данные, а доступа к аккаунту нет, напишите нам. Мы удалим их, только если сможем убедиться, что аккаунт ваш.',
      ],
    },
    {
      id: 'ai',
      title: 'ИИ-библиотекарь',
      paragraphs: [
        'Если ИИ включён, ваши сообщения в чате и краткие сведения из профиля (интересы и названия книг, которые вам понравились или нет) отправляются поставщику языковой модели, подключённому на сервере. Не пишите в чат то, что не хотите передавать третьей стороне.',
        'ИИ может ошибаться и выдумывать. Проверяйте книги в каталоге. В чате действует лимит: 20 сообщений в час.',
      ],
    },
    {
      id: 'rules',
      title: 'Правила',
      paragraphs: ['Не используйте Folio для того, чтобы:'],
      items: [
        'получать доступ к чужим аккаунтам и данным;',
        'перегружать сервис, массово выгружать данные автоматически или обходить ограничения;',
        'использовать уязвимости. Если вы нашли уязвимость, сообщите нам;',
        'писать в чат незаконное или то, что направлено на вред другим людям.',
      ],
      closing: ['Мы можем приостановить или удалить аккаунт, который нарушает эти правила.'],
    },
    {
      id: 'content',
      title: 'Ваши оценки и лицензии',
      paragraphs: [
        'Ваши оценки и сообщения остаются вашими. Вы разрешаете нам хранить и обрабатывать их, чтобы сервис работал. Оценки также учитываются без вашего логина, чтобы улучшать рекомендации другим читателям со схожими вкусами. Другим пользователям ваши оценки не показываются.',
        'Код Folio распространяется по GNU AGPL 3.0, каталог по CC BY-SA 4.0. Тексты лицензий и список сторонних компонентов есть в разделе «Юридическая информация». Эти условия лицензии не меняют.',
      ],
    },
    {
      id: 'availability',
      title: 'Доступность',
      paragraphs: [
        'Folio школьный проект и работает «как есть». Мы не обещаем бесперебойную работу и сохранность данных и не обещаем, что сервис не изменится или не закроется. Мы постараемся предупредить заранее и дать возможность забрать свои данные.',
      ],
    },
    {
      id: 'liability',
      title: 'Ответственность',
      paragraphs: [
        'В той мере, в какой это разрешает законодательство Республики Казахстан, мы не отвечаем за косвенные убытки, потерю данных, неточности каталога и ответы ИИ. Это не исключает ответственность, которую по закону исключить нельзя.',
      ],
    },
    {
      id: 'termination',
      title: 'Прекращение',
      paragraphs: [
        'Вы можете перестать пользоваться Folio и удалить аккаунт в любой момент. Мы можем приостановить доступ за нарушение правил или закрыть сервис.',
      ],
    },
    {
      id: 'changes',
      title: 'Изменения условий',
      paragraphs: [
        'Мы можем менять условия. Новую редакцию мы публикуем на этой странице с её версией и объявляем об изменении на сайте. Если вы продолжаете пользоваться сервисом после изменения, вы принимаете новую редакцию.',
      ],
    },
    {
      id: 'children',
      title: 'О детях и возрасте',
      paragraphs: [
        'У Folio нет минимального возраста. Мы не спрашиваем возраст, имя и почту и не просим документы. Мы не считаем, что для выбора книги нужно что-то доказывать.',
        'Дальше идёт наша позиция, а не юридическое условие. Мы школьники, то есть те, о ком пишутся такие законы, и нас о них никто не спрашивал.',
        'COPPA, американский закон о данных детей младше 13 лет, требует согласия родителей и на практике заставляет сервисы проверять возраст. Американский Kids Online Safety Act (KOSA) возлагает на платформы «обязанность проявлять заботу», то есть предотвращать вред несовершеннолетним. По нашему мнению, оба подхода защищают детей слабее, чем обещают:',
      ],
      items: [
        'Проверка возраста означает больше данных о детях, а не меньше: документы, фотографии лиц, номера телефонов. Безопаснее всего данные, которых не собрали.',
        'Дети обходят проверки, называя чужой возраст. Такой закон учит врать, а не безопасно пользоваться сервисами.',
        'Расплывчатая «обязанность предотвращать вред» подталкивает платформы к фильтрам и блокировкам. Под них легко попадают книги и темы о здоровье, взрослении и самоопределении, то есть то, что подросткам нужно найти.',
        'Требование назвать себя, чтобы читать, отнимает анонимность. Для ребёнка в небезопасной обстановке она часто единственная защита.',
      ],
      closing: [
        'Поэтому Folio защищает детей иначе: не собирает лишнего, не показывает рекламу, не требует почту и позволяет удалить всё одной кнопкой. Если вы родитель и хотите удалить данные своего ребёнка, сделайте это в настройках аккаунта или напишите нам.',
        'Это наше мнение, оно не юридическая консультация и не меняет остальных условий.',
      ],
    },
    {
      id: 'law',
      title: 'Применимое право и споры',
      paragraphs: [
        'Условия регулируются законодательством Республики Казахстан. Если что-то пошло не так, сначала напишите нам, мы постараемся решить вопрос без суда. Если не получится, спор рассматривается в порядке, который установлен законодательством Республики Казахстан.',
      ],
    },
    {
      id: 'contact',
      title: 'Связь',
      paragraphs: ['Пишите через раздел обращений (Issues) репозитория проекта.'],
    },
  ],
}

const en: TermsText = {
  title: 'Terms of Service',
  intro:
    'Folio is a book recommendation service. A small team makes it as a school project, and it may keep developing. These terms explain what we do with your data, what we expect from you and what you can expect from us. We tried to write them so that they can be read in five minutes.',
  sections: [
    {
      id: 'who',
      title: 'Who we are',
      paragraphs: [
        'The service is run by the Folio project team ("we"). We are not a legal entity: we are a group of school competition participants. If the project keeps developing, we will update these terms and say who runs it.',
      ],
    },
    {
      id: 'service',
      title: 'What the service is',
      paragraphs: [
        'Folio recommends books from your interests and ratings, explains the recommendations, shows a book of the day and, if a language model is connected on the server, answers in the AI librarian chat. The service is free.',
        'The catalog is limited and contains mistakes. Recommendations are guesses made by an algorithm, not advice and not a judgment of the quality of a book.',
      ],
    },
    {
      id: 'account',
      title: 'Private mode and accounts',
      paragraphs: [
        'Without an account Folio stores nothing about you: searching and browsing the catalog work without registration, without cookies and without writing to the database. An account is needed for ratings, personal picks, chat and the "Want to read" list.',
        'You must accept these terms to create an account. We store the version of the terms and the time you accepted them.',
      ],
    },
    {
      id: 'credentials',
      title: 'Your account',
      items: [
        'An account needs a username and a password. No email is needed.',
        'The password is stored only as a hash. We cannot read it or remind it to you.',
        'When you register you get a recovery code. It is the only way to regain access if you forget your password. If you lose both the password and the code, we cannot recover the account.',
        'You are responsible for actions taken from your account. If you suspect someone else signed in, end the sessions and change the password in the settings.',
      ],
    },
    {
      id: 'data',
      title: 'What data we store',
      paragraphs: [
        'Interests, book ratings, the "Want to read" list, chat history, settings, the username, hashes of the password and the recovery code, the date the account was created and the version of the terms you accepted. For each sign-in session we also store a description of the browser, the time of sign-in and the time of last activity.',
        'We do not collect a name, email, phone number, age, address or location. We do not show ads, sell data, pass it on for advertising or use trackers.',
        'The server does not save IP addresses in its database. The hosting provider may see technical details of requests, which is outside our control.',
      ],
    },
    {
      id: 'rights',
      title: 'Your rights over your data',
      paragraphs: [
        'In the settings you can view all the data about you, get a new recovery code, end any session and delete the account with all its data. Deletion cannot be undone.',
        'If you need your data deleted and cannot reach the account, write to us. We will delete it only if we can make sure the account is yours.',
      ],
    },
    {
      id: 'ai',
      title: 'AI librarian',
      paragraphs: [
        'When AI is on, your chat messages and a short summary of your profile (your interests and the titles of books you liked or disliked) are sent to the language model provider connected on the server. Do not write in the chat what you do not want to pass to a third party.',
        'AI can be wrong and can make things up. Check books in the catalog. The chat has a limit of 20 messages per hour.',
      ],
    },
    {
      id: 'rules',
      title: 'Rules',
      paragraphs: ['Do not use Folio to:'],
      items: [
        'get access to other people\'s accounts or data;',
        'overload the service, bulk-download data automatically or get around its limits;',
        'exploit vulnerabilities. If you find one, tell us;',
        'write in the chat anything illegal or anything meant to harm other people.',
      ],
      closing: ['We may suspend or delete an account that breaks these rules.'],
    },
    {
      id: 'content',
      title: 'Your ratings and the licenses',
      paragraphs: [
        'Your ratings and messages remain yours. You allow us to store and process them so the service works. Ratings are also used, without your username, to improve recommendations for other readers with similar taste. Other users are not shown your ratings.',
        'The Folio code is distributed under GNU AGPL 3.0 and the catalog under CC BY-SA 4.0. The license texts and the list of third-party components are in the Legal section. These terms do not change those licenses.',
      ],
    },
    {
      id: 'availability',
      title: 'Availability',
      paragraphs: [
        'Folio is a school project and works "as is". We do not promise uninterrupted operation or that your data will be kept, nor that the service will not change or close. We will try to warn you in advance and let you take your data.',
      ],
    },
    {
      id: 'liability',
      title: 'Liability',
      paragraphs: [
        'To the extent allowed by the law of the Republic of Kazakhstan, we are not liable for indirect losses, loss of data, inaccuracies in the catalog or AI answers. This does not exclude liability that cannot be excluded by law.',
      ],
    },
    {
      id: 'termination',
      title: 'Ending use',
      paragraphs: [
        'You may stop using Folio and delete your account at any time. We may suspend access for breaking the rules or close the service.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes to the terms',
      paragraphs: [
        'We may change these terms. We publish the new version on this page with its version number and announce the change on the site. If you keep using the service after a change, you accept the new version.',
      ],
    },
    {
      id: 'children',
      title: 'Children and age',
      paragraphs: [
        'Folio has no minimum age. We do not ask for age, name or email and we do not ask for documents. We do not think anyone should have to prove anything to choose a book.',
        'What follows is our position, not a legal term. We are school students, that is, the people such laws are written about, and nobody asked us about them.',
        'COPPA, the US law on data about children under 13, requires parental consent and in practice makes services verify age. The US Kids Online Safety Act (KOSA) puts a "duty of care" on platforms, that is, a duty to prevent harm to minors. In our opinion both approaches protect children less than they promise:',
      ],
      items: [
        'Age verification means more data about children, not less: documents, face photos, phone numbers. The safest data is the data that was never collected.',
        'Children get around checks by giving someone else\'s age. A law like that teaches lying, not safe use of services.',
        'A vague "duty to prevent harm" pushes platforms toward filters and blocks. Books and topics about health, growing up and identity are easily caught by them, and those are what teenagers need to find.',
        'Having to identify yourself in order to read takes anonymity away. For a child in an unsafe home it is often the only protection.',
      ],
      closing: [
        'So Folio protects children differently: it collects nothing extra, shows no ads, does not ask for an email and lets you delete everything with one button. If you are a parent and want to delete your child\'s data, do it in the account settings or write to us.',
        'This is our opinion. It is not legal advice and it does not change the rest of the terms.',
      ],
    },
    {
      id: 'law',
      title: 'Governing law and disputes',
      paragraphs: [
        'These terms are governed by the law of the Republic of Kazakhstan. If something goes wrong, write to us first and we will try to settle it without a court. If that fails, the dispute is considered in the manner set by the law of the Republic of Kazakhstan.',
      ],
    },
    {
      id: 'contact',
      title: 'Contact',
      paragraphs: ['Write through the Issues section of the project repository.'],
    },
  ],
}

export const TERMS: Record<'ru' | 'en', TermsText> = { ru, en }
