export const TERMS_VERSION = '2026-11-13'

export type TermsSection = { id: string; title: string; paragraphs?: string[]; items?: string[]; closing?: string[] }
export type TermsText = { title: string; intro: string; sections: TermsSection[] }

const ru: TermsText = {
  title: 'Условия использования',
  intro:
    'Настоящие Условия использования (далее «Условия») определяют порядок использования веб-сервиса Folio (далее «Сервис»). Использование Сервиса означает принятие Условий. Создание Аккаунта допускается только после явного принятия Условий.',
  sections: [
    {
      id: 'who',
      title: 'Общие положения',
      paragraphs: [
        'Сервис эксплуатируется командой проекта Folio (далее «Оператор»). Оператор не является юридическим лицом и действует как группа участников школьного конкурса. В случае дальнейшего развития проекта Условия будут дополнены сведениями об операторе Сервиса.',
        'Пользователем признаётся любое лицо, использующее Сервис. Аккаунтом признаётся учётная запись Пользователя в Сервисе. Каталогом признаётся совокупность сведений о книгах, доступных в Сервисе.',
        'Сервис предоставляется на безвозмездной основе.',
      ],
    },
    {
      id: 'service',
      title: 'Описание Сервиса',
      paragraphs: [
        'Сервис обеспечивает подбор книг на основании интересов и оценок Пользователя, пояснение причин рекомендации, отображение книги дня, а также, при подключении языковой модели на стороне сервера, работу чата ИИ-библиотекаря.',
        'Каталог является ограниченным и может содержать неточности. Рекомендации формируются автоматически, носят вероятностный характер и не являются профессиональной консультацией или оценкой качества произведения.',
      ],
    },
    {
      id: 'account',
      title: 'Приватный режим и Аккаунт',
      paragraphs: [
        'Поиск и просмотр Каталога доступны без регистрации. В этом случае Сервис не создаёт запись о Пользователе, не устанавливает cookie и не сохраняет сведения о Пользователе в базе данных.',
        'Оценки, персональные рекомендации, чат и список «Хочу прочитать» доступны при наличии Аккаунта.',
        'Создание Аккаунта требует принятия Условий. Оператор сохраняет версию принятых Условий и время их принятия.',
      ],
    },
    {
      id: 'credentials',
      title: 'Учётные данные',
      paragraphs: [
        'Для создания Аккаунта необходимы логин и пароль. Адрес электронной почты не требуется.',
        'Пароль хранится исключительно в виде хеша и не может быть прочитан или восстановлен Оператором.',
        'При регистрации Пользователю выдаётся код восстановления, являющийся единственным способом восстановления доступа при утрате пароля. При утрате пароля и кода восстановления доступ к Аккаунту не может быть восстановлен.',
        'Пользователь несёт ответственность за действия, совершённые с использованием его Аккаунта. При подозрении на несанкционированный доступ Пользователю следует завершить сеансы и изменить пароль в настройках Аккаунта.',
      ],
    },
    {
      id: 'data',
      title: 'Обрабатываемые данные',
      paragraphs: [
        'Оператор обрабатывает следующие данные: интересы, оценки книг, список «Хочу прочитать», историю чата, настройки (включая возрастной фильтр), логин, хеши пароля и кода восстановления, дату создания Аккаунта и версию принятых Условий. Для каждого сеанса дополнительно обрабатываются описание браузера, время входа и время последней активности.',
        'Оператор не собирает имя, адрес электронной почты, номер телефона, возраст, адрес и сведения о местоположении.',
        'Оператор не размещает рекламу, не осуществляет продажу данных, не передаёт их в рекламных целях и не использует средства отслеживания.',
        'Сервис не сохраняет IP-адреса в своей базе данных. Хостинг-провайдер может получать технические сведения о запросах, Оператор не контролирует такую обработку.',
      ],
    },
    {
      id: 'rights',
      title: 'Права Пользователя в отношении данных',
      paragraphs: [
        'В настройках Аккаунта Пользователь вправе просмотреть все данные о себе, получить новый код восстановления, завершить любой сеанс и удалить Аккаунт вместе со всеми данными. Удаление необратимо.',
        'При невозможности доступа к Аккаунту Пользователь вправе обратиться к Оператору с запросом об удалении данных. Запрос выполняется при условии подтверждения принадлежности Аккаунта заявителю.',
      ],
    },
    {
      id: 'ai',
      title: 'ИИ-библиотекарь',
      paragraphs: [
        'При включённом ИИ сообщения Пользователя в чате и краткие сведения из его профиля (интересы, названия книг, получивших положительную или отрицательную оценку) передаются поставщику языковой модели, подключённому на стороне сервера. Пользователю не рекомендуется передавать в чат сведения, которые он не намерен раскрывать третьим лицам.',
        'Ответы ИИ могут содержать неточности и недостоверные сведения. Пользователю следует проверять информацию о книгах по Каталогу.',
        'В чате установлено ограничение: 20 сообщений в час.',
      ],
    },
    {
      id: 'rules',
      title: 'Правила использования',
      paragraphs: ['При использовании Сервиса запрещается:'],
      items: [
        'получать доступ к чужим Аккаунтам и данным;',
        'создавать чрезмерную нагрузку на Сервис, осуществлять автоматизированную массовую выгрузку данных, обходить установленные ограничения;',
        'использовать уязвимости Сервиса (об обнаруженных уязвимостях следует сообщать Оператору);',
        'размещать в чате сведения, нарушающие законодательство или направленные на причинение вреда третьим лицам.',
      ],
      closing: ['Оператор вправе приостановить доступ к Аккаунту или удалить Аккаунт при нарушении настоящих правил.'],
    },
    {
      id: 'content',
      title: 'Интеллектуальная собственность и лицензии',
      paragraphs: [
        'Оценки и сообщения Пользователя остаются его собственностью. Пользователь предоставляет Оператору право хранить и обрабатывать их в объёме, необходимом для функционирования Сервиса. Оценки учитываются в обезличенном виде при формировании рекомендаций другим Пользователям, другим Пользователям оценки не раскрываются.',
        'Программный код Сервиса распространяется на условиях GNU AGPL 3.0, Каталог на условиях CC BY-SA 4.0. Тексты лицензий и перечень сторонних компонентов приведены в разделе «Юридическая информация». Настоящие Условия не изменяют условий указанных лицензий.',
      ],
    },
    {
      id: 'works',
      title: 'Произведения и авторские права',
      paragraphs: [
        'Сервис содержит библиографические сведения и краткие описания произведений. Тексты произведений Сервис не содержит и не распространяет.',
        'Сервис не имеет отношения к нелицензионному распространению контента, не поддерживает и не пропагандирует его. Оператор рекомендует приобретать произведения исключительно у официальных и достоверных дистрибьюторов.',
        'Правообладатели, считающие, что Каталог нарушает их права, вправе обратиться к Оператору способом, указанным в разделе «Контактная информация».',
      ],
    },
    {
      id: 'children',
      title: 'Возраст Пользователей и позиция Оператора',
      paragraphs: [
        'Минимального возраста для использования Сервиса не установлено. Оператор не запрашивает возраст, имя и адрес электронной почты, не запрашивает документы и не осуществляет проверку возраста.',
        'Настоящий раздел отражает позицию Оператора и не является юридическим условием. Участники команды Оператора являются учащимися, то есть относятся к категории лиц, в интересах которых принимаются соответствующие законы, и не участвовали в их обсуждении.',
        'COPPA, закон США о данных детей младше 13 лет, требует согласия родителей и на практике приводит к проверке возраста пользователей сервисами. Американский Kids Online Safety Act (KOSA) возлагает на платформы «обязанность проявлять заботу», то есть предотвращать вред несовершеннолетним. Оператор считает, что любые нормативные акты, принимаемые в целях защиты детей, являются защитой, о которой дети не просили, и приносят, как правило, ограниченную пользу, при этом влекут следующие последствия:',
      ],
      items: [
        'принуждение детей к указанию недостоверного возраста и формирование привычки обходить правила;',
        'расширение объёма собираемых данных о несовершеннолетних (документы, изображения лиц, номера телефонов);',
        'наделение сервисов полномочиями цензуры: неопределённая «обязанность предотвращать вред» способствует установлению фильтров и блокировок, под действие которых попадают книги и темы о здоровье, взрослении и самоопределении;',
        'формирование стерильной информационной среды, которая, по имеющимся у Оператора сведениям, не повышает безопасность;',
        'утрата анонимности, которая для ребёнка в небезопасной обстановке может быть единственной защитой.',
      ],
      closing: [
        'Проверка возраста в Сервисе не осуществляется. Пользователь вправе по собственному желанию включить в настройках возрастной фильтр и выбрать уровень (6+, 12+, 16+, 18+). Фильтр скрывает книги с возрастной пометкой выше выбранной. Решение принимается исключительно Пользователем и может быть отменено в любое время. Возрастные пометки установлены Оператором субъективно и не являются официальной классификацией.',
        'Для защиты несовершеннолетних Оператор применяет иные меры: не собирает избыточные данные, не размещает рекламу, не требует адрес электронной почты и обеспечивает удаление данных одним действием. Родитель или законный представитель вправе удалить данные ребёнка в настройках Аккаунта либо обратиться к Оператору.',
        'Изложенное является мнением Оператора, не является юридической консультацией и не изменяет остальные положения Условий.',
      ],
    },
    {
      id: 'availability',
      title: 'Доступность Сервиса',
      paragraphs: [
        'Сервис предоставляется «как есть». Оператор не гарантирует непрерывность работы, сохранность данных, а также неизменность и продолжение работы Сервиса. Оператор предпримет разумные усилия для заблаговременного уведомления об изменениях и предоставления возможности получить данные.',
      ],
    },
    {
      id: 'liability',
      title: 'Ограничение ответственности',
      paragraphs: [
        'В пределах, допускаемых законодательством Республики Казахстан, Оператор не несёт ответственности за косвенные убытки, утрату данных, неточности Каталога и ответы ИИ. Настоящее положение не исключает ответственность, которая не может быть исключена в силу закона.',
      ],
    },
    {
      id: 'termination',
      title: 'Прекращение использования',
      paragraphs: [
        'Пользователь вправе прекратить использование Сервиса и удалить Аккаунт в любое время. Оператор вправе приостановить доступ при нарушении правил использования либо прекратить работу Сервиса.',
      ],
    },
    {
      id: 'changes',
      title: 'Изменение Условий',
      paragraphs: [
        'Оператор вправе изменять Условия. Новая редакция публикуется на настоящей странице с указанием версии, об изменении сообщается на сайте. Продолжение использования Сервиса после публикации новой редакции означает её принятие.',
      ],
    },
    {
      id: 'law',
      title: 'Применимое право и разрешение споров',
      paragraphs: [
        'Условия регулируются законодательством Республики Казахстан. Споры подлежат урегулированию путём обращения к Оператору и переговоров. При недостижении согласия спор разрешается в порядке, установленном законодательством Республики Казахстан.',
      ],
    },
    {
      id: 'contact',
      title: 'Контактная информация',
      paragraphs: ['Обращения направляются через раздел обращений (Issues) репозитория проекта.'],
    },
  ],
}

const en: TermsText = {
  title: 'Terms of Service',
  intro:
    'These Terms of Service (the "Terms") govern the use of the Folio web service (the "Service"). Use of the Service constitutes acceptance of the Terms. An Account may be created only after the Terms are expressly accepted.',
  sections: [
    {
      id: 'who',
      title: 'General provisions',
      paragraphs: [
        'The Service is operated by the Folio project team (the "Operator"). The Operator is not a legal entity and acts as a group of participants in a school competition. If the project develops further, the Terms will be supplemented with information on the operator of the Service.',
        'A User is any person using the Service. An Account is the User\'s account in the Service. The Catalog is the set of information on books available in the Service.',
        'The Service is provided free of charge.',
      ],
    },
    {
      id: 'service',
      title: 'Description of the Service',
      paragraphs: [
        'The Service provides book recommendations based on the User\'s interests and ratings, explanations of the reasons for a recommendation, a book of the day and, where a language model is connected on the server side, an AI librarian chat.',
        'The Catalog is limited and may contain inaccuracies. Recommendations are generated automatically, are probabilistic in nature and do not constitute professional advice or an assessment of the quality of a work.',
      ],
    },
    {
      id: 'account',
      title: 'Private mode and Accounts',
      paragraphs: [
        'Searching and browsing the Catalog are available without registration. In that case the Service does not create a record of the User, does not set cookies and does not store information about the User in its database.',
        'Ratings, personal recommendations, the chat and the "Want to read" list are available with an Account.',
        'Creating an Account requires acceptance of the Terms. The Operator stores the version of the accepted Terms and the time of acceptance.',
      ],
    },
    {
      id: 'credentials',
      title: 'Credentials',
      paragraphs: [
        'Creating an Account requires a username and a password. An email address is not required.',
        'The password is stored solely as a hash and cannot be read or recovered by the Operator.',
        'On registration the User is issued a recovery code, which is the only means of regaining access if the password is lost. If both the password and the recovery code are lost, access to the Account cannot be restored.',
        'The User is responsible for actions performed using the User\'s Account. If unauthorized access is suspected, the User should end the sessions and change the password in the Account settings.',
      ],
    },
    {
      id: 'data',
      title: 'Data processed',
      paragraphs: [
        'The Operator processes the following data: interests, book ratings, the "Want to read" list, chat history, settings (including the age filter), the username, hashes of the password and the recovery code, the date the Account was created and the version of the accepted Terms. For each session the description of the browser, the time of sign-in and the time of last activity are also processed.',
        'The Operator does not collect a name, email address, telephone number, age, address or location data.',
        'The Operator does not display advertising, sell data, transfer it for advertising purposes or use tracking tools.',
        'The Service does not save IP addresses in its database. The hosting provider may receive technical information about requests, and the Operator does not control such processing.',
      ],
    },
    {
      id: 'rights',
      title: 'User rights in respect of data',
      paragraphs: [
        'In the Account settings the User may view all data about the User, obtain a new recovery code, end any session and delete the Account together with all data. Deletion is irreversible.',
        'If the User cannot access the Account, the User may ask the Operator to delete the data. The request is fulfilled provided that the applicant\'s ownership of the Account is confirmed.',
      ],
    },
    {
      id: 'ai',
      title: 'AI librarian',
      paragraphs: [
        'When AI is enabled, the User\'s chat messages and brief information from the User\'s profile (interests and the titles of books rated positively or negatively) are transferred to the language model provider connected on the server side. The User is advised not to submit to the chat information that the User does not intend to disclose to third parties.',
        'AI answers may contain inaccuracies and unreliable information. The User should verify information about books against the Catalog.',
        'The chat is limited to 20 messages per hour.',
      ],
    },
    {
      id: 'rules',
      title: 'Rules of use',
      paragraphs: ['When using the Service, it is prohibited to:'],
      items: [
        'obtain access to other persons\' Accounts and data;',
        'place excessive load on the Service, carry out automated bulk extraction of data or circumvent the established limits;',
        'exploit vulnerabilities of the Service (discovered vulnerabilities should be reported to the Operator);',
        'submit to the chat information that violates the law or is intended to cause harm to third parties.',
      ],
      closing: ['The Operator may suspend access to an Account or delete an Account in the event of a breach of these rules.'],
    },
    {
      id: 'content',
      title: 'Intellectual property and licenses',
      paragraphs: [
        'The User\'s ratings and messages remain the User\'s property. The User grants the Operator the right to store and process them to the extent necessary for the functioning of the Service. Ratings are taken into account in anonymized form when generating recommendations for other Users, and are not disclosed to other Users.',
        'The source code of the Service is distributed under the terms of GNU AGPL 3.0 and the Catalog under the terms of CC BY-SA 4.0. The license texts and the list of third-party components are given in the Legal section. These Terms do not alter the terms of those licenses.',
      ],
    },
    {
      id: 'works',
      title: 'Works and copyright',
      paragraphs: [
        'The Service contains bibliographic information and brief descriptions of works. The Service does not contain or distribute the texts of works.',
        'The Service has no connection with the unlicensed distribution of content and does not support or promote it. The Operator recommends acquiring works exclusively from official and reliable distributors.',
        'Rightsholders who believe that the Catalog infringes their rights may contact the Operator in the manner stated in the Contact section.',
      ],
    },
    {
      id: 'children',
      title: 'Age of Users and the Operator\'s position',
      paragraphs: [
        'There is no minimum age for using the Service. The Operator does not request age, name or email address, does not request documents and does not verify age.',
        'This section reflects the position of the Operator and is not a legal condition. The members of the Operator\'s team are students, that is, they belong to the category of persons in whose interests the relevant laws are adopted, and did not take part in discussing them.',
        'COPPA, the US law on data about children under 13, requires parental consent and in practice leads services to verify the age of users. The American Kids Online Safety Act (KOSA) places a "duty of care" on platforms, that is, a duty to prevent harm to minors. The Operator considers that any legislation adopted for the purpose of protecting children is protection that children did not ask for and, as a rule, brings limited benefit, while entailing the following consequences:',
      ],
      items: [
        'compelling children to state a false age and forming a habit of circumventing rules;',
        'expanding the volume of data collected about minors (documents, facial images, telephone numbers);',
        'giving services the powers of censorship: a vague "duty to prevent harm" encourages filters and blocks that catch books and topics about health, growing up and self-determination;',
        'creating a sterile information environment which, according to the information available to the Operator, does not improve safety;',
        'loss of anonymity, which for a child in an unsafe environment may be the only protection.',
      ],
      closing: [
        'Age is not verified in the Service. The User may, at the User\'s own wish, turn on the age filter in the settings and choose a level (6+, 12+, 16+, 18+). The filter hides books whose age mark is above the chosen level. The decision is made solely by the User and may be reversed at any time. The age marks are assigned by the Operator subjectively and are not an official classification.',
        'To protect minors the Operator applies other measures: it does not collect excessive data, does not display advertising, does not require an email address and provides for deletion of data in a single action. A parent or legal representative may delete a child\'s data in the Account settings or contact the Operator.',
        'The foregoing is the opinion of the Operator, is not legal advice and does not alter the other provisions of the Terms.',
      ],
    },
    {
      id: 'availability',
      title: 'Availability of the Service',
      paragraphs: [
        'The Service is provided "as is". The Operator does not guarantee uninterrupted operation, preservation of data, or that the Service will remain unchanged or continue to operate. The Operator will make reasonable efforts to give advance notice of changes and an opportunity to obtain data.',
      ],
    },
    {
      id: 'liability',
      title: 'Limitation of liability',
      paragraphs: [
        'To the extent permitted by the legislation of the Republic of Kazakhstan, the Operator is not liable for indirect losses, loss of data, inaccuracies in the Catalog or AI answers. This provision does not exclude liability that cannot be excluded by law.',
      ],
    },
    {
      id: 'termination',
      title: 'Termination of use',
      paragraphs: [
        'The User may stop using the Service and delete the Account at any time. The Operator may suspend access in the event of a breach of the rules of use or discontinue the Service.',
      ],
    },
    {
      id: 'changes',
      title: 'Amendment of the Terms',
      paragraphs: [
        'The Operator may amend the Terms. The new version is published on this page with its version number and the change is announced on the site. Continued use of the Service after publication of the new version constitutes acceptance of it.',
      ],
    },
    {
      id: 'law',
      title: 'Governing law and dispute resolution',
      paragraphs: [
        'The Terms are governed by the legislation of the Republic of Kazakhstan. Disputes are to be settled by contacting the Operator and negotiation. If no agreement is reached, the dispute is resolved in the manner established by the legislation of the Republic of Kazakhstan.',
      ],
    },
    {
      id: 'contact',
      title: 'Contact',
      paragraphs: ['Requests are to be sent through the Issues section of the project repository.'],
    },
  ],
}

export const TERMS: Record<'ru' | 'en', TermsText> = { ru, en }
