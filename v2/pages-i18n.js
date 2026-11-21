/* =====================================================================
   Languages for the CV's side pages (/CV/library/, /CV/news/).
   Same choice as the CV (?lang= or the remembered 'cv-lang').
   - window.LANG, window.LT(s, ...args) : translate a UI string (falls back to English)
   - window.LNAME : my name in the page's script
   - Book titles, article titles, author names and sources stay in English.
   Translates static text in the page itself: text nodes, and placeholder / aria-label / title
   attributes whose English text is a key below.
   ===================================================================== */
(function () {
    const SUPPORTED = ['en', 'es', 'ru', 'fr', 'gu'];
    const qs = new URLSearchParams(location.search).get('lang');
    let saved = null; try { saved = localStorage.getItem('cv-lang'); } catch (e) { /* private mode */ }
    const LANG = SUPPORTED.includes(qs) ? qs : (SUPPORTED.includes(saved) ? saved : 'en');
    if (qs && SUPPORTED.includes(qs)) { try { localStorage.setItem('cv-lang', qs); } catch (e) {} }
    window.LANG = LANG;
    document.documentElement.lang = LANG;

    const NAME = { en: 'Bharat Singh Rawat', es: 'Bharat Singh Rawat', fr: 'Bharat Singh Rawat', ru: 'Бхарат Сингх Рават', gu: 'ભારત સિંહ રાવત' };
    window.LNAME = NAME[LANG];

    // English templates (the keys that are not plain text)
    const EN = {
        bookBy: (t, a) => `${t} by ${a}`,
        lampOver: s => `Switch the lamp over ${s}`,
        noteP: 'The librarian is still collecting. Take any book off the shelves, or <a href="/CV/">go back to the CV</a>.',
        freeAt: x => `Free at ${x}`,
        pdfAt: x => `PDF at ${x}`,
        downloadAt: x => `Download at ${x}`,
        firstPub: y => `First published ${y}`,
        libTitle: n => `The Library — ${n}`,
        newsTitle: n => `In the News — ${n}`
    };

    const UI = {
        es: {
            'All rights reserved.': 'Todos los derechos reservados.',
            // library
            'The Library': 'La biblioteca', 'The Library.': 'La biblioteca.', 'New': 'Nuevo',
            'Books on plasmas, ion sources and beams.': 'Libros sobre plasmas, fuentes de iones y haces.',
            'Step inside': 'Entrar', 'Ask the librarian…': 'Pregunta al bibliotecario…', 'Find a book': 'Buscar un libro',
            'Switch the lights': 'Cambiar la luz', 'Day / night': 'Día / noche',
            'Scroll to walk the aisle · hover a book · click to take it to the desk': 'Desplázate por el pasillo · señala un libro · haz clic para llevarlo a la mesa',
            'Swipe to walk the aisle · tap a book to take it to the desk': 'Desliza para recorrer el pasillo · toca un libro para llevarlo al escritorio',
            'Sections': 'Secciones', 'Book': 'Libro', 'Put the book back': 'Devolver el libro', 'Previous book': 'Libro anterior', 'Next book': 'Libro siguiente',
            bookBy: (t, a) => `${t}, de ${a}`, lampOver: s => `Encender o apagar la lámpara de «${s}»`,
            'A book that says: do not pull': 'Un libro que dice: no sacar', 'DO NOT PULL': 'NO SACAR',
            'Secret passage': 'Pasadizo secreto', 'Play Bio Menace ▸': 'Jugar a Bio Menace ▸', 'Reading nook': 'Rincón de lectura',
            'More books are coming.': 'Pronto habrá más libros.',
            noteP: 'El bibliotecario sigue reuniendo libros. Saca cualquiera de las estanterías o <a href="/CV/">vuelve al CV</a>.',
            'Your reading pile': 'Tu montón de lectura', 'Clear the pile': 'Vaciar el montón', 'Clear': 'Vaciar', 'Books you open land here': 'Aquí aparecen los libros que abres',
            'Free PDF ↓': 'PDF gratis ↓', freeAt: x => `Gratis en ${x}`, 'Free online': 'Gratis en línea', 'Find it online ↗': 'Buscarlo en línea ↗', pdfAt: x => `PDF en ${x}`,
            'Accelerator physicist': 'Físico de aceleradores', 'Download PDF ↓': 'Descargar PDF ↓', 'Read online': 'Leer en línea', 'Find it online': 'Buscarlo en línea',
            downloadAt: x => `Descargar en ${x}`, firstPub: y => `Primera edición: ${y}`, libTitle: n => `La biblioteca — ${n}`,
            'Good choice!': '¡Buena elección!', 'Oh, that one is a classic.': 'Ah, ese es un clásico.', 'Take it, it’s free to read.': 'Llévatelo, se puede leer gratis.', 'One of my favourites.': 'Uno de mis favoritos.',
            'Enjoy the read.': 'Disfruta la lectura.', 'Come back for more.': 'Vuelve cuando quieras.', 'Good book, that.': 'Buen libro, ese.',
            'Just cataloguing…': 'Catalogando…', 'Updating the index.': 'Actualizando el índice.', 'One more simulation run…': 'Una simulación más…',
            'There. Back where it belongs.': 'Listo. En su sitio.', 'Alphabetical. Mostly.': 'Por orden alfabético. Casi.',
            'Hmm, who moved this?': 'Mmm, ¿quién ha movido esto?', 'Shh… people are reading.': 'Shh… aquí se lee.', 'Space-charge limited… shelf space, that is.': 'Limitado por carga espacial… espacio en la estantería, quiero decir.',
            'Someone left this on the table…': 'Alguien dejó esto en la mesa…', 'Back to the shelf you go.': 'De vuelta a la estantería.', 'Tidy desk, tidy mind.': 'Mesa ordenada, mente ordenada.',
            'Plasma physics': 'Física de plasmas', 'Ion sources & traps': 'Fuentes de iones y trampas', 'Beams & accelerators': 'Haces y aceleradores',
            'Foundations': 'Fundamentos', 'The classics': 'Los clásicos', 'For the weekend': 'Para el fin de semana',
            // news
            'In the News': 'En los medios', 'In the news.': 'En los medios.', 'Contact': 'Contacto', 'Newsroom': 'Sala de prensa',
            'Articles, interviews and stories about my work and the experiments I am part of, from antimatter at CERN to Faraday cups.': 'Artículos, entrevistas y noticias sobre mi trabajo y los experimentos en los que participo, desde la antimateria en el CERN hasta las copas de Faraday.',
            'Know of a story that is missing?': '¿Falta alguna noticia?', 'Let me know': 'Avísame', 'Mentions my work': 'Menciona mi trabajo',
            'Outreach': 'Divulgación', 'Talk': 'Charla', 'Interview': 'Entrevista', newsTitle: n => `En los medios — ${n}`
        },
        ru: {
            'All rights reserved.': 'Все права защищены.',
            'The Library': 'Библиотека', 'The Library.': 'Библиотека.', 'New': 'Новое',
            'Books on plasmas, ion sources and beams.': 'Книги о плазме, ионных источниках и пучках.',
            'Step inside': 'Войти', 'Ask the librarian…': 'Спросите библиотекаря…', 'Find a book': 'Найти книгу',
            'Switch the lights': 'Переключить свет', 'Day / night': 'День / ночь',
            'Scroll to walk the aisle · hover a book · click to take it to the desk': 'Листайте вдоль полок · наведите на книгу · нажмите, чтобы взять её на стол',
            'Swipe to walk the aisle · tap a book to take it to the desk': 'Листайте, чтобы идти вдоль полок · коснитесь книги, чтобы отнести её на стол',
            'Sections': 'Разделы', 'Book': 'Книга', 'Put the book back': 'Вернуть книгу на полку', 'Previous book': 'Предыдущая книга', 'Next book': 'Следующая книга',
            bookBy: (t, a) => `${t} — ${a}`, lampOver: s => `Включить или выключить лампу над разделом «${s}»`,
            'A book that says: do not pull': 'Книга с надписью «не трогать»', 'DO NOT PULL': 'НЕ ТРОГАТЬ',
            'Secret passage': 'Тайный ход', 'Play Bio Menace ▸': 'Играть в Bio Menace ▸', 'Reading nook': 'Уголок для чтения',
            'More books are coming.': 'Скоро будут новые книги.',
            noteP: 'Библиотекарь всё ещё собирает коллекцию. Возьмите любую книгу с полки или <a href="/CV/">вернитесь к резюме</a>.',
            'Your reading pile': 'Ваша стопка книг', 'Clear the pile': 'Убрать стопку', 'Clear': 'Очистить', 'Books you open land here': 'Сюда попадают открытые вами книги',
            'Free PDF ↓': 'Бесплатный PDF ↓', freeAt: x => `Бесплатно: ${x}`, 'Free online': 'Бесплатно онлайн', 'Find it online ↗': 'Найти в интернете ↗', pdfAt: x => `PDF: ${x}`,
            'Accelerator physicist': 'Физик-ускорительщик', 'Download PDF ↓': 'Скачать PDF ↓', 'Read online': 'Читать онлайн', 'Find it online': 'Найти в интернете',
            downloadAt: x => `Скачать: ${x}`, firstPub: y => `Впервые издана в ${y} г.`, libTitle: n => `Библиотека — ${n}`,
            'Good choice!': 'Отличный выбор!', 'Oh, that one is a classic.': 'О, это классика.', 'Take it, it’s free to read.': 'Берите, её можно читать бесплатно.', 'One of my favourites.': 'Одна из моих любимых.',
            'Enjoy the read.': 'Приятного чтения.', 'Come back for more.': 'Заходите ещё.', 'Good book, that.': 'Хорошая книга.',
            'Just cataloguing…': 'Каталогизирую…', 'Updating the index.': 'Обновляю картотеку.', 'One more simulation run…': 'Ещё один прогон симуляции…',
            'There. Back where it belongs.': 'Вот так. На своё место.', 'Alphabetical. Mostly.': 'По алфавиту. Почти.',
            'Hmm, who moved this?': 'Хм, кто это переставил?', 'Shh… people are reading.': 'Тсс… здесь читают.', 'Space-charge limited… shelf space, that is.': 'Ограничено пространственным зарядом… то есть местом на полке.',
            'Someone left this on the table…': 'Кто-то оставил это на столе…', 'Back to the shelf you go.': 'Пора обратно на полку.', 'Tidy desk, tidy mind.': 'Чистый стол — ясная голова.',
            'Plasma physics': 'Физика плазмы', 'Ion sources & traps': 'Ионные источники и ловушки', 'Beams & accelerators': 'Пучки и ускорители',
            'Foundations': 'Основы', 'The classics': 'Классика', 'For the weekend': 'На выходные',
            'In the News': 'В новостях', 'In the news.': 'В новостях.', 'Contact': 'Контакты', 'Newsroom': 'Пресса',
            'Articles, interviews and stories about my work and the experiments I am part of, from antimatter at CERN to Faraday cups.': 'Статьи, интервью и репортажи о моей работе и экспериментах, в которых я участвую, — от антиматерии в ЦЕРН до цилиндров Фарадея.',
            'Know of a story that is missing?': 'Знаете о статье, которой здесь нет?', 'Let me know': 'Напишите мне', 'Mentions my work': 'Упоминается моя работа',
            'Outreach': 'Популяризация', 'Talk': 'Доклад', 'Interview': 'Интервью', newsTitle: n => `В новостях — ${n}`
        },
        fr: {
            'All rights reserved.': 'Tous droits réservés.',
            'The Library': 'La bibliothèque', 'The Library.': 'La bibliothèque.', 'New': 'Nouveau',
            'Books on plasmas, ion sources and beams.': 'Des livres sur les plasmas, les sources d’ions et les faisceaux.',
            'Step inside': 'Entrer', 'Ask the librarian…': 'Demandez au bibliothécaire…', 'Find a book': 'Chercher un livre',
            'Switch the lights': 'Changer l’éclairage', 'Day / night': 'Jour / nuit',
            'Scroll to walk the aisle · hover a book · click to take it to the desk': 'Faites défiler pour avancer · survolez un livre · cliquez pour le poser sur le bureau',
            'Swipe to walk the aisle · tap a book to take it to the desk': 'Balayez pour parcourir l’allée · touchez un livre pour le poser sur le bureau',
            'Sections': 'Rayons', 'Book': 'Livre', 'Put the book back': 'Remettre le livre en place', 'Previous book': 'Livre précédent', 'Next book': 'Livre suivant',
            bookBy: (t, a) => `${t}, de ${a}`, lampOver: s => `Allumer ou éteindre la lampe du rayon « ${s} »`,
            'A book that says: do not pull': 'Un livre marqué : ne pas tirer', 'DO NOT PULL': 'NE PAS TIRER',
            'Secret passage': 'Passage secret', 'Play Bio Menace ▸': 'Jouer à Bio Menace ▸', 'Reading nook': 'Coin lecture',
            'More books are coming.': 'D’autres livres arrivent.',
            noteP: 'Le bibliothécaire complète encore la collection. Prenez un livre sur les rayons, ou <a href="/CV/">revenez au CV</a>.',
            'Your reading pile': 'Votre pile de lecture', 'Clear the pile': 'Vider la pile', 'Clear': 'Vider', 'Books you open land here': 'Les livres que vous ouvrez arrivent ici',
            'Free PDF ↓': 'PDF gratuit ↓', freeAt: x => `Gratuit sur ${x}`, 'Free online': 'Gratuit en ligne', 'Find it online ↗': 'Le trouver en ligne ↗', pdfAt: x => `PDF sur ${x}`,
            'Accelerator physicist': 'Physicien des accélérateurs', 'Download PDF ↓': 'Télécharger le PDF ↓', 'Read online': 'Lire en ligne', 'Find it online': 'Le trouver en ligne',
            downloadAt: x => `Télécharger sur ${x}`, firstPub: y => `Première parution : ${y}`, libTitle: n => `La bibliothèque — ${n}`,
            'Good choice!': 'Bon choix !', 'Oh, that one is a classic.': 'Ah, celui-là est un classique.', 'Take it, it’s free to read.': 'Prenez-le, il est en lecture libre.', 'One of my favourites.': 'Un de mes préférés.',
            'Enjoy the read.': 'Bonne lecture.', 'Come back for more.': 'Revenez quand vous voulez.', 'Good book, that.': 'Un bon livre, celui-là.',
            'Just cataloguing…': 'Je catalogue…', 'Updating the index.': 'Mise à jour de l’index.', 'One more simulation run…': 'Encore une simulation…',
            'There. Back where it belongs.': 'Voilà. À sa place.', 'Alphabetical. Mostly.': 'Par ordre alphabétique. En gros.',
            'Hmm, who moved this?': 'Tiens, qui a déplacé ça ?', 'Shh… people are reading.': 'Chut… on lit ici.', 'Space-charge limited… shelf space, that is.': 'Limité par la charge d’espace… enfin, par la place sur l’étagère.',
            'Someone left this on the table…': 'Quelqu’un a laissé ça sur la table…', 'Back to the shelf you go.': 'Retour sur l’étagère.', 'Tidy desk, tidy mind.': 'Bureau rangé, esprit clair.',
            'Plasma physics': 'Physique des plasmas', 'Ion sources & traps': 'Sources d’ions et pièges', 'Beams & accelerators': 'Faisceaux et accélérateurs',
            'Foundations': 'Fondamentaux', 'The classics': 'Les classiques', 'For the weekend': 'Pour le week-end',
            'In the News': 'Dans la presse', 'In the news.': 'Dans la presse.', 'Contact': 'Contact', 'Newsroom': 'Salle de presse',
            'Articles, interviews and stories about my work and the experiments I am part of, from antimatter at CERN to Faraday cups.': 'Articles, interviews et reportages sur mon travail et les expériences auxquelles je participe, de l’antimatière au CERN aux cages de Faraday.',
            'Know of a story that is missing?': 'Il manque un article ?', 'Let me know': 'Dites-le-moi', 'Mentions my work': 'Mentionne mon travail',
            'Outreach': 'Vulgarisation', 'Talk': 'Exposé', 'Interview': 'Interview', newsTitle: n => `Dans la presse — ${n}`
        },
        gu: {
            'All rights reserved.': 'સર્વહક્ક સ્વાધીન.',
            'The Library': 'પુસ્તકાલય', 'The Library.': 'પુસ્તકાલય.', 'New': 'નવું',
            'Books on plasmas, ion sources and beams.': 'પ્લાઝ્મા, આયન સ્રોતો અને બીમ વિશેનાં પુસ્તકો.',
            'Step inside': 'અંદર આવો', 'Ask the librarian…': 'ગ્રંથપાલને પૂછો…', 'Find a book': 'પુસ્તક શોધો',
            'Switch the lights': 'લાઇટ બદલો', 'Day / night': 'દિવસ / રાત',
            'Scroll to walk the aisle · hover a book · click to take it to the desk': 'છાજલીઓ વચ્ચે ચાલવા સ્ક્રોલ કરો · પુસ્તક પર કર્સર લાવો · તેને ટેબલ પર લઈ જવા ક્લિક કરો',
            'Swipe to walk the aisle · tap a book to take it to the desk': 'છાજલીઓ વચ્ચે ચાલવા સ્વાઇપ કરો · પુસ્તકને ટેબલ પર લઈ જવા ટૅપ કરો',
            'Sections': 'વિભાગો', 'Book': 'પુસ્તક', 'Put the book back': 'પુસ્તક પાછું મૂકો', 'Previous book': 'પાછલું પુસ્તક', 'Next book': 'આગલું પુસ્તક',
            bookBy: (t, a) => `${t}, ${a}`, lampOver: s => `«${s}» ઉપરનો દીવો ચાલુ/બંધ કરો`,
            'A book that says: do not pull': 'એક પુસ્તક જેના પર લખ્યું છે: ખેંચશો નહીં', 'DO NOT PULL': 'ખેંચશો નહીં',
            'Secret passage': 'ગુપ્ત માર્ગ', 'Play Bio Menace ▸': 'Bio Menace રમો ▸', 'Reading nook': 'વાંચનનો ખૂણો',
            'More books are coming.': 'વધુ પુસ્તકો આવી રહ્યાં છે.',
            noteP: 'ગ્રંથપાલ હજી પુસ્તકો એકઠાં કરી રહ્યા છે. છાજલીમાંથી કોઈ પણ પુસ્તક લો, અથવા <a href="/CV/">CV પર પાછા જાઓ</a>.',
            'Your reading pile': 'તમારો વાંચનનો ઢગલો', 'Clear the pile': 'ઢગલો ખાલી કરો', 'Clear': 'ખાલી કરો', 'Books you open land here': 'તમે ખોલેલાં પુસ્તકો અહીં આવે છે',
            'Free PDF ↓': 'મફત PDF ↓', freeAt: x => `${x} પર મફત`, 'Free online': 'ઑનલાઇન મફત', 'Find it online ↗': 'ઑનલાઇન શોધો ↗', pdfAt: x => `${x} પર PDF`,
            'Accelerator physicist': 'એક્સિલરેટર ભૌતિકશાસ્ત્રી', 'Download PDF ↓': 'PDF ડાઉનલોડ કરો ↓', 'Read online': 'ઑનલાઇન વાંચો', 'Find it online': 'ઑનલાઇન શોધો',
            downloadAt: x => `${x} પરથી ડાઉનલોડ કરો`, firstPub: y => `પ્રથમ પ્રકાશન: ${y}`, libTitle: n => `પુસ્તકાલય — ${n}`,
            'Good choice!': 'સરસ પસંદગી!', 'Oh, that one is a classic.': 'અરે, એ તો ક્લાસિક છે.', 'Take it, it’s free to read.': 'લઈ જાઓ, એ મફત વાંચી શકાય છે.', 'One of my favourites.': 'મારાં મનપસંદમાંનું એક.',
            'Enjoy the read.': 'વાંચનનો આનંદ લો.', 'Come back for more.': 'ફરી આવજો.', 'Good book, that.': 'સારું પુસ્તક છે.',
            'Just cataloguing…': 'સૂચિ બનાવું છું…', 'Updating the index.': 'અનુક્રમણિકા અપડેટ કરું છું.', 'One more simulation run…': 'વધુ એક સિમ્યુલેશન…',
            'There. Back where it belongs.': 'લો. પોતાની જગ્યાએ પાછું.', 'Alphabetical. Mostly.': 'કક્કાવાર. મોટે ભાગે.',
            'Hmm, who moved this?': 'હમ્મ, આ કોણે ખસેડ્યું?', 'Shh… people are reading.': 'શ્શ… લોકો વાંચે છે.', 'Space-charge limited… shelf space, that is.': 'સ્પેસ-ચાર્જ મર્યાદિત… એટલે કે છાજલીની જગ્યા.',
            'Someone left this on the table…': 'કોઈ આ ટેબલ પર ભૂલી ગયું…', 'Back to the shelf you go.': 'ચાલ, પાછું છાજલી પર.', 'Tidy desk, tidy mind.': 'સ્વચ્છ ટેબલ, સ્વચ્છ મન.',
            'Plasma physics': 'પ્લાઝ્મા ભૌતિકશાસ્ત્ર', 'Ion sources & traps': 'આયન સ્રોતો અને ટ્રેપ', 'Beams & accelerators': 'બીમ અને એક્સિલરેટર',
            'Foundations': 'પાયાનાં પુસ્તકો', 'The classics': 'ક્લાસિક્સ', 'For the weekend': 'વીકએન્ડ માટે',
            'In the News': 'સમાચારમાં', 'In the news.': 'સમાચારમાં.', 'Contact': 'સંપર્ક', 'Newsroom': 'મીડિયા',
            'Articles, interviews and stories about my work and the experiments I am part of, from antimatter at CERN to Faraday cups.': 'મારા કામ અને હું જેમાં ભાગ લઉં છું તે પ્રયોગો વિશેના લેખો, મુલાકાતો અને અહેવાલો — CERN ખાતે પ્રતિદ્રવ્યથી લઈને ફેરાડે કપ સુધી.',
            'Know of a story that is missing?': 'કોઈ લેખ ખૂટે છે?', 'Let me know': 'મને જણાવો', 'Mentions my work': 'મારા કામનો ઉલ્લેખ',
            'Outreach': 'જનજાગૃતિ', 'Talk': 'વક્તવ્ય', 'Interview': 'મુલાકાત', newsTitle: n => `સમાચારમાં — ${n}`
        }
    };

    // one-line notes under each news story, by URL (the article titles stay in English)
    const NEWS_ABOUT = {
        es: [
            'Nuestro artículo de AEgIS en Physical Review Research sobre los iones altamente cargados que quedan tras las aniquilaciones de antiprotones.',
            'El evento de divulgación sobre antimateria que organicé en la Victoria Gallery & Museum de Liverpool, con juegos interactivos de AEgIS para el público joven.',
            'Nuestra modelización del transporte de antiprotones, presentada con Sruthy Chandran en la reunión de la colaboración AEgIS.',
            'Reportaje sobre mi revisión de las copas de Faraday, publicada como artículo de portada de Instruments.',
            'Mi charla sobre la simulación de experimentos de antimateria para AEgIS con CST Studio.',
            'Mi charla invitada sobre la modelización de trampas de Penning–Malmberg para AEgIS en el CERN.',
            'La cámara de antimateria de AEgIS construida con sensores de teléfonos móviles, publicada en Science Advances.',
            'La noticia del CERN sobre el detector de AEgIS que localiza las aniquilaciones de antiprotones en tiempo real.',
            'Nuestro resultado de enfriamiento láser del positronio en AEgIS, entre los diez mejores del año.',
            'El enfriamiento láser del positronio de AEgIS, elegido uno de los diez mayores avances de 2024.',
            'Entrevista sobre mi camino de la ingeniería mecánica a la física de aceleradores y la creación de gemelos digitales para AEgIS en el CERN.'
        ],
        ru: [
            'Наша статья AEgIS в Physical Review Research о многозарядных ионах, остающихся после аннигиляции антипротонов.',
            'Мероприятие по популяризации физики антиматерии, которое я провёл в Victoria Gallery & Museum в Ливерпуле, с интерактивными играми AEgIS для юных посетителей.',
            'Наше моделирование транспортировки антипротонов, представленное вместе с Сратхи Чандран на совещании коллаборации AEgIS.',
            'Материал о моём обзоре цилиндров Фарадея, опубликованном на обложке журнала Instruments.',
            'Мой доклад о моделировании экспериментов с антиматерией для AEgIS в CST Studio.',
            'Мой приглашённый доклад о моделировании ловушек Пеннинга–Мальмберга для AEgIS в ЦЕРН.',
            'Камера антиматерии AEgIS, собранная из сенсоров смартфонов, — статья в Science Advances.',
            'Новость ЦЕРН о детекторе AEgIS, который в реальном времени определяет точки аннигиляции антипротонов.',
            'Наш результат по лазерному охлаждению позитрония в AEgIS — среди десяти главных прорывов года.',
            'Лазерное охлаждение позитрония в AEgIS названо одним из десяти главных прорывов 2024 года.',
            'Интервью о моём пути от машиностроения к физике ускорителей и о создании цифровых двойников для AEgIS в ЦЕРН.'
        ],
        fr: [
            'Notre article AEgIS dans Physical Review Research sur les ions multichargés laissés par les annihilations d’antiprotons.',
            'L’événement de vulgarisation sur l’antimatière que j’ai organisé à la Victoria Gallery & Museum de Liverpool, avec des jeux interactifs AEgIS pour les jeunes visiteurs.',
            'Notre modélisation du transport des antiprotons, présentée avec Sruthy Chandran à la réunion de la collaboration AEgIS.',
            'Article sur ma revue consacrée aux cages de Faraday, publiée en couverture de la revue Instruments.',
            'Mon exposé sur la simulation d’expériences d’antimatière pour AEgIS avec CST Studio.',
            'Mon exposé invité sur la modélisation des pièges de Penning–Malmberg pour AEgIS au CERN.',
            'La caméra à antimatière d’AEgIS conçue à partir de capteurs de smartphones, publiée dans Science Advances.',
            'L’article du CERN sur le détecteur d’AEgIS qui localise en temps réel les annihilations d’antiprotons.',
            'Notre résultat de refroidissement laser du positronium à AEgIS parmi les dix percées de l’année.',
            'Le refroidissement laser du positronium par AEgIS classé parmi les dix plus grandes percées de 2024.',
            'Entretien sur mon parcours, du génie mécanique à la physique des accélérateurs, et sur la création de jumeaux numériques pour AEgIS au CERN.'
        ],
        gu: [
            'એન્ટિપ્રોટોન વિનાશ પછી બચતા ઉચ્ચ-ચાર્જવાળા આયનો પર Physical Review Researchમાં પ્રકાશિત અમારો AEgIS લેખ.',
            'લિવરપૂલના Victoria Gallery & Museumમાં મેં યોજેલો પ્રતિદ્રવ્ય જનજાગૃતિ કાર્યક્રમ, યુવા મુલાકાતીઓ માટે ઇન્ટરેક્ટિવ AEgIS ગેમ્સ સાથે.',
            'એન્ટિપ્રોટોન ટ્રાન્સપોર્ટનું અમારું મોડેલિંગ, જે Sruthy Chandran સાથે AEgIS કોલૅબરેશન મીટિંગમાં રજૂ કર્યું.',
            'ફેરાડે કપ પરના મારા સમીક્ષા લેખ વિશેનો અહેવાલ, જે Instruments જર્નલની કવર સ્ટોરી તરીકે પ્રકાશિત થયો.',
            'CST Studio વડે AEgIS માટે પ્રતિદ્રવ્ય પ્રયોગોના સિમ્યુલેશન પર મારું વક્તવ્ય.',
            'CERN ખાતે AEgIS માટે પેનિંગ–માલ્મબર્ગ ટ્રેપના મોડેલિંગ પર મારું આમંત્રિત વક્તવ્ય.',
            'સ્માર્ટફોન સેન્સરમાંથી બનેલો AEgISનો પ્રતિદ્રવ્ય કૅમેરા, Science Advancesમાં પ્રકાશિત.',
            'એન્ટિપ્રોટોન વિનાશને રિયલ-ટાઇમમાં શોધતા AEgIS ડિટેક્ટર વિશે CERNનો અહેવાલ.',
            'AEgIS ખાતે પોઝિટ્રોનિયમના લેસર કૂલિંગનું અમારું પરિણામ વર્ષની ટોચની દસ સિદ્ધિઓમાં.',
            'AEgIS દ્વારા પોઝિટ્રોનિયમનું લેસર કૂલિંગ 2024ની દસ સૌથી મોટી સિદ્ધિઓમાંની એક જાહેર.',
            'મિકેનિકલ એન્જિનિયરિંગથી એક્સિલરેટર ભૌતિકશાસ્ત્ર સુધીની મારી સફર અને CERN ખાતે AEgIS માટે ડિજિટલ ટ્વિન બનાવવા વિશેની મુલાકાત.'
        ]
    };
    // matched to the English text so a reordered or new story simply stays in English
    const NEWS_EN = [
        'Our AEgIS paper in Physical Review Research on the highly charged ions left after antiproton annihilations.',
        'The antimatter outreach event I ran at Liverpool’s Victoria Gallery & Museum, with interactive AEgIS games for young visitors.',
        'Our modelling of antiproton transport, presented with Sruthy Chandran at the AEgIS collaboration meeting.',
        'Feature on my Faraday cup review, published as the cover story of Instruments.',
        'My talk on simulating antimatter experiments for AEgIS with CST Studio.',
        'My invited talk on modelling Penning–Malmberg traps for AEgIS at CERN.',
        'The AEgIS antimatter camera built from smartphone sensors, published in Science Advances.',
        'CERN’s story on the AEgIS detector that pinpoints antiproton annihilations in real time.',
        'Our positronium laser cooling result at AEgIS among the year’s top ten.',
        'Laser cooling of positronium by AEgIS named one of the ten biggest breakthroughs of 2024.',
        'Interview about my path from mechanical engineering to accelerator physics, and building digital twins for AEgIS at CERN.'
    ];
    window.LNEWS = s => { const i = NEWS_EN.indexOf(s); return i >= 0 && NEWS_ABOUT[LANG] ? NEWS_ABOUT[LANG][i] : s; };

    const LT = (s, ...args) => {
        const d = UI[LANG] || {};
        const v = d[s] !== undefined ? d[s] : (EN[s] !== undefined ? EN[s] : s);
        return typeof v === 'function' ? v(...args) : v;
    };
    window.LT = LT;
    window.LDATE = (d, opts) => { const t = new Date(d + 'T12:00:00'); return isNaN(t) ? d : t.toLocaleDateString(LANG === 'en' ? 'en-GB' : LANG, opts); };

    // static page text: run once the body is parsed
    function translatePage() {
        if (LANG === 'en') return;
        const d = UI[LANG];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(n => {
            const raw = n.nodeValue, key = raw.trim();
            if (key && typeof d[key] === 'string') n.nodeValue = raw.replace(key, d[key]);
            else if (key.includes('Bharat Singh Rawat')) n.nodeValue = raw.replace('Bharat Singh Rawat', NAME[LANG]);
        });
        document.querySelectorAll('[placeholder],[aria-label],[title]').forEach(el => ['placeholder', 'aria-label', 'title'].forEach(a => {
            const v = el.getAttribute(a); if (v && typeof d[v] === 'string') el.setAttribute(a, d[v]);
        }));
    }
    window.LTPAGE = translatePage;
})();
