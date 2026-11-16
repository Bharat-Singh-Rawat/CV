/* =====================================================================
   Languages for the v2 CV: English (default), Español, Русский, Français, ગુજરાતી.
   - window.LANG : current language code
   - window.T(s) : translate an English UI string (falls back to English)
   - Content (profile.js) is overridden per language below; paper titles,
     names and organisations stay in their original language.
   Choose with ?lang=es / ru / fr / gu or the switch in the top bar (remembered).
   NOTE: if you edit the English text in profile.js, update the matching
   entry here too, or that item will stay in its previous translation.
   ===================================================================== */
(function () {
    const SUPPORTED = ['en', 'es', 'ru', 'fr', 'gu'];
    const qs = new URLSearchParams(location.search).get('lang');
    let saved = null; try { saved = localStorage.getItem('cv-lang'); } catch (e) { /* private mode */ }
    const LANG = SUPPORTED.includes(qs) ? qs : (SUPPORTED.includes(saved) ? saved : 'en');
    if (qs && SUPPORTED.includes(qs)) { try { localStorage.setItem('cv-lang', qs); } catch (e) {} }
    window.LANG = LANG;
    document.documentElement.lang = LANG;

    const PHD = 'https://www.researchgate.net/publication/380433338_Studies_on_Extraction_of_an_Ion_beam_and_its_Transport_from_a_Multi-Cusp_Gridded_Ion_Source';
    const MT = 'https://www.researchgate.net/publication/356191414_Design_and_Development_of_10_kW_Faraday_Cup_for_Ion_beam_intensity_measurement';
    const A = (url, txt) => `<a href="${url}" target="_blank" rel="noopener">${txt}</a>`;

    // ---------------------------------------------------------------- UI strings
    const UI = {
        es: {
            'Skip to content': 'Saltar al contenido', 'About': 'Sobre mí', 'Career': 'Trayectoria', 'Research': 'Investigación',
            'Lab': 'Laboratorio', 'Videos': 'Vídeos', 'Publications': 'Publicaciones', 'Offer': 'Servicios', 'Plain CV': 'CV sencillo',
            'Contact': 'Contacto', 'Download CV (PDF)': 'Descargar CV (PDF)', 'Get in touch': 'Contactar', "Hi, I'm": 'Hola, soy',
            'The beamline so far.': 'Mi trayectoria.', 'Highlights.': 'Lo más destacado.', 'In the lab': 'En el laboratorio',
            "Instruments I've built.": 'Instrumentos que he construido.',
            'Ion sources, grids and the diagnostics that measure their beams.': 'Fuentes de iones, rejillas y los diagnósticos que miden sus haces.',
            'Watch': 'Ver', 'Lectures & simulations.': 'Clases y simulaciones.',
            'Hover to preview. Click to watch with sound.': 'Pasa el cursor para previsualizar. Haz clic para verlo con sonido.',
            'More on YouTube': 'Más en YouTube', 'In print.': 'Publicado.', 'Talks': 'Charlas', 'Work': 'Trabajo', 'poster': 'póster', 'ICPP 2020 poster': 'póster en ICPP 2020', 'talk & poster': 'charla y póster', 'Travel': 'Viajes', 'Travels': 'Mis viajes', 'Drag to spin · hover a pin': 'Arrastra para girar · toca un punto', 'On stage.': 'En el escenario.',
            'What I offer': 'Qué ofrezco', 'How I can help.': 'Cómo puedo ayudar.', 'Skills': 'Habilidades', 'Instrument rack.': 'Mi caja de herramientas.',
            'Codes, tools and hardware I work with.': 'Códigos, herramientas y equipos con los que trabajo.', 'Off-beam': 'Mis intereses',
            'Beyond the lab.': 'Más allá del laboratorio.', "Let's talk beams.": 'Hablemos de física de aceleradores.', 'Classic site': 'Sitio clásico', 'All themes': 'Todos los temas',
            'Download CV': 'Descargar CV', 'See my work': 'Ver mi trabajo', 'Experience': 'Experiencia', 'Education': 'Formación', 'Now': 'Actual',
            'More': 'Más', 'Less': 'Menos', 'View code': 'Ver código', 'Open project': 'Abrir proyecto', "Appearance": "Apariencia", "Auto": "Auto", "Light": "Claro", "Dark": "Oscuro", "Dark mode": "Modo oscuro", "Light mode": "Modo claro", "Automatic appearance": "Apariencia automática", "Now playing": "Reproduciendo", "Open player": "Abrir reproductor", "Photo viewer": "Visor de fotos", "Previous photo": "Foto anterior", "Next photo": "Foto siguiente", "Open photo": "Abrir foto", "Search": "Buscar", "Search sections, papers, videos, songs…": "Busca secciones, artículos, vídeos, canciones…", "to move": "para moverte", "to open": "para abrir", "to close": "para cerrar", "No results": "Sin resultados", "Sections": "Secciones", "Songs": "Canciones", "Actions": "Acciones", "Email me": "Escríbeme", "Explore": "Explorar", "Connect": "Contacto", "Projects": "Proyectos", "Resume": "Currículum", "Site map": "Mapa del sitio", "Built from scratch with HTML, CSS and JavaScript. Simulations and photos are from my own work.": "Hecho desde cero con HTML, CSS y JavaScript. Las simulaciones y fotos son de mi propio trabajo.", "Top 5": "Top 5", "High score": "Récord", "New high score!": "¡Nuevo récord!", "Your name": "Tu nombre", "Save": "Guardar", "Shield": "Escudo", "Ion blaster": "Cañón de iones", "Plasma mode": "Modo plasma", "← → or A D to move · Space or ↑ to jump · X or Shift to shoot · Esc to close": "← → o A D para moverte · Espacio o ↑ para saltar · X o Shift para disparar · Esc para cerrar", "Take a break.": "Tómate un respiro.", "Guide a pixel me down the beamline: collect ions, dodge sparks and land the beam in the Faraday cup.": "Guía a mi versión pixelada por la línea de haz: recoge iones, esquiva chispas y lleva el haz a la copa de Faraday.", "Play": "Jugar", "Best": "Récord", "ions": "iones", "Close": "Cerrar", "Level": "Nivel", "Ion source lab": "Laboratorio de fuentes de iones", "Antimatter lab · CERN": "Laboratorio de antimateria · CERN", "Accelerator hall · Basilisk": "Sala del acelerador · Basilisk", "Game over": "Fin del juego", "Beam on target!": "¡Haz en el blanco!", "Next": "Siguiente", "Press Space or tap to start": "Pulsa Espacio o toca para empezar", "Press Space or tap to try again": "Pulsa Espacio o toca para reintentar", "Press Space or tap to play again": "Pulsa Espacio o toca para jugar otra vez", "Collect ions, dodge sparks, hit the Faraday cup.": "Recoge iones, esquiva chispas y acierta en la copa de Faraday.", "← → or A D to move · Space or ↑ to jump · Esc to close": "← → o A D para moverte · Espacio o ↑ para saltar · Esc para cerrar", 'My cover · click for sound': 'Mi versión · haz clic para oírla', 'Simulation': 'Simulación', 'Tap any video to watch.': 'Toca un vídeo para verlo.',
            'Hello, visitor from': 'Hola, visitante de', 'Lecture': 'Clase', 'Simulation': 'Simulación', 'Journal cover': 'Portada de revista', 'Featured': 'Destacado',
            'All rights reserved.': 'Todos los derechos reservados.',
            'pubsub': span => `Artículos en revistas, actas de congresos y mi tesis doctoral${span ? `, ${span}` : ''}.`,
            // extras.js
            'Add to contacts': 'Añadir a contactos', 'localtime': (t, city) => `Son las ${t} en ${city} · Suelo responder en un día.`,
            'How it connects.': 'Cómo se conecta.', 'Hover or tap a skill to see where I’ve used it.': 'Pasa el cursor o toca una habilidad para ver dónde la he usado.',
            'Beam on target.': 'Haz en el blanco.', 'Language': 'Idioma',
            'Basilisk · electron injector': 'Basilisk · inyector de electrones', 'AEgIS digital twin': 'Gemelo digital de AEgIS', 'Ring-cusp ion source': 'Fuente de cúspide anular',
            '10 kW Faraday cup': 'Copa de Faraday de 10 kW', 'HV & vacuum': 'Alta tensión y vacío', 'Machine learning': 'Aprendizaje automático', 'Monte Carlo / PIC': 'Monte Carlo / PIC'
        },
        ru: {
            'Skip to content': 'Перейти к содержанию', 'About': 'Обо мне', 'Career': 'Карьера', 'Research': 'Исследования',
            'Lab': 'Лаборатория', 'Videos': 'Видео', 'Publications': 'Публикации', 'Offer': 'Услуги', 'Plain CV': 'Резюме',
            'Contact': 'Контакты', 'Download CV (PDF)': 'Скачать резюме (PDF)', 'Get in touch': 'Связаться', "Hi, I'm": 'Привет, я',
            'The beamline so far.': 'Мой путь.', 'Highlights.': 'Главное.', 'In the lab': 'В лаборатории',
            "Instruments I've built.": 'Приборы, которые я создал.',
            'Ion sources, grids and the diagnostics that measure their beams.': 'Ионные источники, сетки и диагностика их пучков.',
            'Watch': 'Смотреть', 'Lectures & simulations.': 'Лекции и симуляции.',
            'Hover to preview. Click to watch with sound.': 'Наведите курсор для предпросмотра. Нажмите, чтобы смотреть со звуком.',
            'More on YouTube': 'Больше на YouTube', 'In print.': 'Опубликованные материалы.', 'Talks': 'Доклады', 'Work': 'Работа', 'poster': 'постер', 'ICPP 2020 poster': 'постер на ICPP 2020', 'talk & poster': 'доклад и постер', 'Travel': 'Путешествия', 'Travels': 'Мои путешествия', 'Drag to spin · hover a pin': 'Потяните, чтобы вращать · наведите на точку', 'On stage.': 'Выступления.',
            'What I offer': 'Чем могу помочь', 'How I can help.': 'Как я могу помочь.', 'Skills': 'Навыки', 'Instrument rack.': 'Мой инструментарий.',
            'Codes, tools and hardware I work with.': 'Программы, инструменты и оборудование, с которыми я работаю.', 'Off-beam': 'Мои интересы',
            'Beyond the lab.': 'Увлечения вне работы.', "Let's talk beams.": 'Обсудим пучки частиц.', 'Classic site': 'Классический сайт', 'All themes': 'Все темы',
            'Download CV': 'Скачать резюме', 'See my work': 'Мои работы', 'Experience': 'Опыт работы', 'Education': 'Образование', 'Now': 'Сейчас',
            'More': 'Ещё', 'Less': 'Свернуть', 'View code': 'Код', 'Open project': 'Открыть проект', "Appearance": "Оформление", "Auto": "Авто", "Light": "Светлая", "Dark": "Тёмная", "Dark mode": "Тёмная тема", "Light mode": "Светлая тема", "Automatic appearance": "Автоматическая тема", "Now playing": "Сейчас играет", "Open player": "Открыть плеер", "Photo viewer": "Просмотр фото", "Previous photo": "Предыдущее фото", "Next photo": "Следующее фото", "Open photo": "Открыть фото", "Search": "Поиск", "Search sections, papers, videos, songs…": "Ищите разделы, статьи, видео, песни…", "to move": "— выбор", "to open": "— открыть", "to close": "— закрыть", "No results": "Ничего не найдено", "Sections": "Разделы", "Songs": "Песни", "Actions": "Действия", "Email me": "Написать мне", "Explore": "Разделы", "Connect": "Связь", "Projects": "Проекты", "Resume": "Резюме", "Site map": "Карта сайта", "Built from scratch with HTML, CSS and JavaScript. Simulations and photos are from my own work.": "Сделано с нуля на HTML, CSS и JavaScript. Симуляции и фотографии — из моей собственной работы.", "Top 5": "Топ-5", "High score": "Рекорд", "New high score!": "Новый рекорд!", "Your name": "Ваше имя", "Save": "Сохранить", "Shield": "Щит", "Ion blaster": "Ионный бластер", "Plasma mode": "Режим плазмы", "← → or A D to move · Space or ↑ to jump · X or Shift to shoot · Esc to close": "← → или A D — движение · пробел или ↑ — прыжок · X или Shift — выстрел · Esc — закрыть", "Take a break.": "Сделайте перерыв.", "Guide a pixel me down the beamline: collect ions, dodge sparks and land the beam in the Faraday cup.": "Проведите пиксельного меня по пучковому тракту: собирайте ионы, уворачивайтесь от искр и доставьте пучок в цилиндр Фарадея.", "Play": "Играть", "Best": "Рекорд", "ions": "ионов", "Close": "Закрыть", "Level": "Уровень", "Ion source lab": "Лаборатория ионных источников", "Antimatter lab · CERN": "Лаборатория антиматерии · ЦЕРН", "Accelerator hall · Basilisk": "Зал ускорителя · Basilisk", "Game over": "Игра окончена", "Beam on target!": "Пучок на мишени!", "Next": "Далее", "Press Space or tap to start": "Нажмите пробел или коснитесь, чтобы начать", "Press Space or tap to try again": "Нажмите пробел или коснитесь, чтобы попробовать снова", "Press Space or tap to play again": "Нажмите пробел или коснитесь, чтобы сыграть ещё", "Collect ions, dodge sparks, hit the Faraday cup.": "Собирайте ионы, уворачивайтесь от искр, попадите в цилиндр Фарадея.", "← → or A D to move · Space or ↑ to jump · Esc to close": "← → или A D — движение · пробел или ↑ — прыжок · Esc — закрыть", 'My cover · click for sound': 'Мой кавер · нажмите, чтобы включить звук', 'Simulation': 'Симуляция', 'Tap any video to watch.': 'Нажмите на видео, чтобы посмотреть.',
            'Hello, visitor from': 'Здравствуйте! Ваша страна:', 'Lecture': 'Лекция', 'Simulation': 'Симуляция', 'Journal cover': 'Обложка журнала', 'Featured': 'Избранное',
            'All rights reserved.': 'Все права защищены.',
            'pubsub': span => `Статьи в журналах, труды конференций и моя диссертация${span ? `, ${span}` : ''}.`,
            'Add to contacts': 'Добавить в контакты', 'localtime': (t, city) => `В городе ${city} сейчас ${t} · Обычно отвечаю в течение дня.`,
            'How it connects.': 'Как всё связано.', 'Hover or tap a skill to see where I’ve used it.': 'Наведите курсор или нажмите на навык, чтобы увидеть, где я его применял.',
            'Beam on target.': 'Пучок на мишени.', 'Language': 'Язык',
            'Basilisk · electron injector': 'Basilisk · электронный инжектор', 'AEgIS digital twin': 'Цифровой двойник AEgIS', 'Ring-cusp ion source': 'Источник с кольцевым каспом',
            '10 kW Faraday cup': 'Цилиндр Фарадея 10 кВт', 'HV & vacuum': 'Высокое напряжение и вакуум', 'Machine learning': 'Машинное обучение', 'Monte Carlo / PIC': 'Монте-Карло / PIC'
        },
        fr: {
            'Skip to content': 'Aller au contenu', 'About': 'À propos', 'Career': 'Parcours', 'Research': 'Recherche',
            'Lab': 'Laboratoire', 'Videos': 'Vidéos', 'Publications': 'Publications', 'Offer': 'Services', 'Plain CV': 'CV simple',
            'Contact': 'Contact', 'Download CV (PDF)': 'Télécharger le CV (PDF)', 'Get in touch': 'Me contacter', "Hi, I'm": 'Bonjour, je suis',
            'The beamline so far.': 'Mon parcours.', 'Highlights.': 'Temps forts.', 'In the lab': 'Au laboratoire',
            "Instruments I've built.": "Les instruments que j'ai construits.",
            'Ion sources, grids and the diagnostics that measure their beams.': 'Sources d’ions, grilles et diagnostics qui mesurent leurs faisceaux.',
            'Watch': 'Regarder', 'Lectures & simulations.': 'Cours et simulations.',
            'Hover to preview. Click to watch with sound.': 'Survolez pour un aperçu. Cliquez pour regarder avec le son.',
            'More on YouTube': 'Plus sur YouTube', 'In print.': 'Publié.', 'Talks': 'Conférences', 'Work': 'Travail', 'poster': 'poster', 'ICPP 2020 poster': 'poster à l’ICPP 2020', 'talk & poster': 'exposé et poster', 'Travel': 'Voyages', 'Travels': 'Mes voyages', 'Drag to spin · hover a pin': 'Faites glisser pour tourner · survolez un point', 'On stage.': 'Sur scène.',
            'What I offer': 'Ce que je propose', 'How I can help.': 'Comment je peux aider.', 'Skills': 'Compétences', 'Instrument rack.': 'Ma boîte à outils.',
            'Codes, tools and hardware I work with.': 'Codes, outils et matériel avec lesquels je travaille.', 'Off-beam': 'Hors faisceau',
            'Beyond the lab.': 'Au-delà du labo.', "Let's talk beams.": 'Parlons faisceaux.', 'Classic site': 'Site classique', 'All themes': 'Tous les thèmes',
            'Download CV': 'Télécharger le CV', 'See my work': 'Voir mon travail', 'Experience': 'Expérience', 'Education': 'Formation', 'Now': 'Actuel',
            'More': 'Plus', 'Less': 'Moins', 'View code': 'Voir le code', 'Open project': 'Ouvrir le projet', 'Appearance': 'Apparence', 'Auto': 'Auto', 'Light': 'Clair', 'Dark': 'Sombre', 'Dark mode': 'Mode sombre', 'Light mode': 'Mode clair', 'Automatic appearance': 'Apparence automatique', 'Now playing': 'En lecture', 'Open player': 'Ouvrir le lecteur', 'Photo viewer': 'Visionneuse de photos', 'Previous photo': 'Photo précédente', 'Next photo': 'Photo suivante', 'Open photo': 'Ouvrir la photo', 'Search': 'Rechercher', 'Search sections, papers, videos, songs…': 'Rechercher des sections, articles, vidéos, chansons…', 'to move': 'pour naviguer', 'to open': 'pour ouvrir', 'to close': 'pour fermer', 'No results': 'Aucun résultat', 'Sections': 'Sections', 'Songs': 'Chansons', 'Actions': 'Actions', 'Email me': 'M’écrire', 'Explore': 'Explorer', 'Connect': 'Contact', 'Projects': 'Projets', 'Resume': 'CV', 'Site map': 'Plan du site', 'Built from scratch with HTML, CSS and JavaScript. Simulations and photos are from my own work.': 'Conçu de A à Z en HTML, CSS et JavaScript. Les simulations et les photos sont issues de mon propre travail.', 'Top 5': 'Top 5', 'High score': 'Record', 'New high score!': 'Nouveau record !', 'Your name': 'Votre nom', 'Save': 'Enregistrer', 'Shield': 'Bouclier', 'Ion blaster': 'Canon à ions', 'Plasma mode': 'Mode plasma', '← → or A D to move · Space or ↑ to jump · X or Shift to shoot · Esc to close': '← → ou A D pour bouger · Espace ou ↑ pour sauter · X ou Maj pour tirer · Échap pour fermer', 'Take a break.': 'Faites une pause.', 'Guide a pixel me down the beamline: collect ions, dodge sparks and land the beam in the Faraday cup.': 'Guidez mon avatar pixelisé le long de la ligne de faisceau : récoltez des ions, évitez les étincelles et envoyez le faisceau dans la cage de Faraday.', 'Play': 'Jouer', 'Best': 'Record', 'ions': 'ions', 'Close': 'Fermer', 'Level': 'Niveau', 'Ion source lab': 'Labo des sources d’ions', 'Antimatter lab · CERN': 'Labo d’antimatière · CERN', 'Accelerator hall · Basilisk': 'Hall de l’accélérateur · Basilisk', 'Game over': 'Partie terminée', 'Beam on target!': 'Faisceau sur cible !', 'Next': 'Suivant', 'Press Space or tap to start': 'Appuyez sur Espace ou touchez pour commencer', 'Press Space or tap to try again': 'Appuyez sur Espace ou touchez pour réessayer', 'Press Space or tap to play again': 'Appuyez sur Espace ou touchez pour rejouer', 'Collect ions, dodge sparks, hit the Faraday cup.': 'Récoltez des ions, évitez les étincelles, visez la cage de Faraday.', '← → or A D to move · Space or ↑ to jump · Esc to close': '← → ou A D pour bouger · Espace ou ↑ pour sauter · Échap pour fermer', 'My cover · click for sound': 'Ma reprise · cliquez pour le son', 'Simulation': 'Simulation', 'Tap any video to watch.': 'Touchez une vidéo pour la regarder.',
            'Hello, visitor from': 'Bonjour, visiteur de', 'Lecture': 'Cours', 'Journal cover': 'Couverture de revue', 'Featured': 'À la une',
            'All rights reserved.': 'Tous droits réservés.',
            'pubsub': span => `Articles de revues, actes de conférences et ma thèse de doctorat${span ? `, ${span}` : ''}.`,
            'Add to contacts': 'Ajouter aux contacts', 'localtime': (t, city) => `Il est ${t} à ${city} · Je réponds généralement sous 24 h.`,
            'How it connects.': 'Comment tout se relie.', 'Hover or tap a skill to see where I’ve used it.': 'Survolez ou touchez une compétence pour voir où je l’ai utilisée.',
            'Beam on target.': 'Faisceau sur cible.', 'Language': 'Langue',
            'Basilisk · electron injector': 'Basilisk · injecteur d’électrons', 'AEgIS digital twin': 'Jumeau numérique d’AEgIS', 'Ring-cusp ion source': 'Source d’ions à cuspide annulaire',
            '10 kW Faraday cup': 'Cage de Faraday de 10 kW', 'HV & vacuum': 'Haute tension et vide', 'Machine learning': 'Apprentissage automatique', 'Monte Carlo / PIC': 'Monte-Carlo / PIC'
        },
        gu: {
            'Skip to content': 'મુખ્ય સામગ્રી પર જાઓ', 'About': 'મારા વિશે', 'Career': 'કારકિર્દી', 'Research': 'સંશોધન',
            'Lab': 'પ્રયોગશાળા', 'Videos': 'વીડિયો', 'Publications': 'પ્રકાશનો', 'Offer': 'સેવાઓ', 'Plain CV': 'સાદો CV',
            'Contact': 'સંપર્ક', 'Download CV (PDF)': 'CV ડાઉનલોડ કરો (PDF)', 'Get in touch': 'સંપર્ક કરો', "Hi, I'm": 'નમસ્તે, હું',
            'The beamline so far.': 'મારી સફર.', 'Highlights.': 'મુખ્ય કાર્યો.', 'In the lab': 'પ્રયોગશાળામાં',
            "Instruments I've built.": 'મેં બનાવેલાં ઉપકરણો.',
            'Ion sources, grids and the diagnostics that measure their beams.': 'આયન સ્રોતો, ગ્રિડ અને તેમના બીમ માપતાં ડાયગ્નોસ્ટિક્સ.',
            'Watch': 'જુઓ', 'Lectures & simulations.': 'વ્યાખ્યાનો અને સિમ્યુલેશન.',
            'Hover to preview. Click to watch with sound.': 'પૂર્વાવલોકન માટે કર્સર લાવો. અવાજ સાથે જોવા ક્લિક કરો.',
            'More on YouTube': 'YouTube પર વધુ', 'In print.': 'પ્રકાશિત કાર્ય.', 'Talks': 'વક્તવ્યો', 'Work': 'કાર્ય', 'poster': 'પોસ્ટર', 'ICPP 2020 poster': 'ICPP 2020 પોસ્ટર', 'talk & poster': 'વક્તવ્ય અને પોસ્ટર', 'Travel': 'પ્રવાસ', 'Travels': 'મારા પ્રવાસો', 'Drag to spin · hover a pin': 'ફેરવવા માટે ખેંચો · પિન પર કર્સર લાવો', 'On stage.': 'મંચ પર.',
            'What I offer': 'હું શું આપું છું', 'How I can help.': 'હું કેવી રીતે મદદ કરી શકું.', 'Skills': 'કૌશલ્યો', 'Instrument rack.': 'મારાં સાધનો.',
            'Codes, tools and hardware I work with.': 'કોડ, સાધનો અને હાર્ડવેર જેની સાથે હું કામ કરું છું.', 'Off-beam': 'બીમની બહાર',
            'Beyond the lab.': 'પ્રયોગશાળાની બહાર.', "Let's talk beams.": 'ચાલો, બીમની વાત કરીએ.', 'Classic site': 'ક્લાસિક સાઇટ', 'All themes': 'બધી થીમ',
            'Download CV': 'CV ડાઉનલોડ કરો', 'See my work': 'મારું કામ જુઓ', 'Experience': 'અનુભવ', 'Education': 'શિક્ષણ', 'Now': 'હાલમાં',
            'More': 'વધુ', 'Less': 'ઓછું', 'View code': 'કોડ જુઓ', 'Open project': 'પ્રોજેક્ટ ખોલો', 'Appearance': 'દેખાવ', 'Auto': 'ઓટો', 'Light': 'લાઇટ', 'Dark': 'ડાર્ક', 'Dark mode': 'ડાર્ક મોડ', 'Light mode': 'લાઇટ મોડ', 'Automatic appearance': 'આપમેળે દેખાવ', 'Now playing': 'હાલમાં વાગી રહ્યું છે', 'Open player': 'પ્લેયર ખોલો', 'Photo viewer': 'ફોટો વ્યૂઅર', 'Previous photo': 'પાછલો ફોટો', 'Next photo': 'આગલો ફોટો', 'Open photo': 'ફોટો ખોલો', 'Search': 'શોધો', 'Search sections, papers, videos, songs…': 'વિભાગો, લેખો, વીડિયો, ગીતો શોધો…', 'to move': 'ખસવા માટે', 'to open': 'ખોલવા માટે', 'to close': 'બંધ કરવા માટે', 'No results': 'કોઈ પરિણામ નથી', 'Sections': 'વિભાગો', 'Songs': 'ગીતો', 'Actions': 'ક્રિયાઓ', 'Email me': 'મને ઇમેઇલ કરો', 'Explore': 'શોધખોળ', 'Connect': 'સંપર્ક', 'Projects': 'પ્રોજેક્ટ્સ', 'Resume': 'બાયોડેટા', 'Site map': 'સાઇટ મેપ', 'Built from scratch with HTML, CSS and JavaScript. Simulations and photos are from my own work.': 'HTML, CSS અને JavaScript વડે શરૂઆતથી બનાવેલ. સિમ્યુલેશન અને ફોટા મારા પોતાના કાર્યમાંથી છે.', 'Top 5': 'ટોપ 5', 'High score': 'સર્વોચ્ચ સ્કોર', 'New high score!': 'નવો સર્વોચ્ચ સ્કોર!', 'Your name': 'તમારું નામ', 'Save': 'સાચવો', 'Shield': 'કવચ', 'Ion blaster': 'આયન બ્લાસ્ટર', 'Plasma mode': 'પ્લાઝ્મા મોડ', '← → or A D to move · Space or ↑ to jump · X or Shift to shoot · Esc to close': '← → અથવા A D થી ખસો · Space અથવા ↑ થી કૂદો · X અથવા Shift થી ફાયર કરો · Esc થી બંધ કરો', 'Take a break.': 'થોડો વિરામ લો.', 'Guide a pixel me down the beamline: collect ions, dodge sparks and land the beam in the Faraday cup.': 'પિક્સેલ રૂપે મને બીમલાઇન પર દોરી જાઓ: આયન એકત્ર કરો, તણખાથી બચો અને બીમને ફેરાડે કપમાં પહોંચાડો.', 'Play': 'રમો', 'Best': 'શ્રેષ્ઠ', 'ions': 'આયન', 'Close': 'બંધ કરો', 'Level': 'સ્તર', 'Ion source lab': 'આયન સ્રોત પ્રયોગશાળા', 'Antimatter lab · CERN': 'પ્રતિદ્રવ્ય પ્રયોગશાળા · CERN', 'Accelerator hall · Basilisk': 'એક્સિલરેટર હૉલ · Basilisk', 'Game over': 'રમત પૂરી', 'Beam on target!': 'બીમ લક્ષ્ય પર!', 'Next': 'આગળ', 'Press Space or tap to start': 'શરૂ કરવા Space દબાવો અથવા ટૅપ કરો', 'Press Space or tap to try again': 'ફરી પ્રયાસ કરવા Space દબાવો અથવા ટૅપ કરો', 'Press Space or tap to play again': 'ફરી રમવા Space દબાવો અથવા ટૅપ કરો', 'Collect ions, dodge sparks, hit the Faraday cup.': 'આયન એકત્ર કરો, તણખાથી બચો, ફેરાડે કપ સુધી પહોંચો.', '← → or A D to move · Space or ↑ to jump · Esc to close': '← → અથવા A D થી ખસો · Space અથવા ↑ થી કૂદો · Esc થી બંધ કરો', 'My cover · click for sound': 'મારું કવર · અવાજ માટે ક્લિક કરો', 'Simulation': 'સિમ્યુલેશન', 'Tap any video to watch.': 'જોવા માટે કોઈપણ વીડિયો પર ટૅપ કરો.',
            'Hello, visitor from': 'નમસ્તે, મુલાકાતી —', 'Lecture': 'વ્યાખ્યાન', 'Journal cover': 'જર્નલ કવર', 'Featured': 'વિશેષ',
            'All rights reserved.': 'સર્વહક્ક સ્વાધીન.',
            'pubsub': span => `જર્નલ લેખો, કોન્ફરન્સ પ્રોસિડિંગ્સ અને મારો Ph.D. શોધનિબંધ${span ? `, ${span}` : ''}.`,
            'Add to contacts': 'સંપર્કોમાં ઉમેરો', 'localtime': (t, city) => `${city}માં અત્યારે ${t} વાગ્યા છે · હું સામાન્ય રીતે એક દિવસમાં જવાબ આપું છું.`,
            'How it connects.': 'બધું કેવી રીતે જોડાય છે.', 'Hover or tap a skill to see where I’ve used it.': 'કોઈ કૌશલ્ય પર કર્સર લાવો કે ટૅપ કરો અને જુઓ કે મેં તેનો ક્યાં ઉપયોગ કર્યો છે.',
            'Beam on target.': 'બીમ લક્ષ્ય પર.', 'Language': 'ભાષા',
            'Basilisk · electron injector': 'Basilisk · ઇલેક્ટ્રોન ઇન્જેક્ટર', 'AEgIS digital twin': 'AEgIS ડિજિટલ ટ્વિન', 'Ring-cusp ion source': 'રિંગ-કસ્પ આયન સ્રોત',
            '10 kW Faraday cup': '10 kW ફેરાડે કપ', 'HV & vacuum': 'હાઇ વોલ્ટેજ અને વેક્યુમ', 'Machine learning': 'મશીન લર્નિંગ', 'Monte Carlo / PIC': 'મોન્ટે કાર્લો / PIC'
        }
    };
    const EN = {
        'pubsub': span => `Journal papers, conference proceedings and my Ph.D. dissertation${span ? `, ${span}` : ''}.`,
        'localtime': (t, city) => `It's ${t} in ${city} · I usually reply within a day.`
    };
    const T = (s, ...args) => {
        const v = (UI[LANG] && UI[LANG][s] !== undefined) ? UI[LANG][s] : (EN[s] !== undefined ? EN[s] : s);
        return typeof v === 'function' ? v(...args) : v;
    };
    window.T = T;

    // ---------------------------------------------------------------- content overrides
    const C = {
        es: {
            title: 'Experto en fuentes de iones y diagnóstico de haces',
            summary: 'Experto en haces de partículas cargadas con más de 7 años de experiencia en el diseño de fuentes de iones, diagnóstico de haces y sistemas de transporte.',
            expertise: 'Diseño de fuentes de iones, optimización de la extracción y el transporte de haces, neutralización de la carga espacial, diagnóstico avanzado de haces y gemelos digitales para trampas de partículas cargadas.',
            about: 'Trabajo con fuentes de electrones e iones y con los diagnósticos que miden sus haces. Desde copas de Faraday y sondas de Langmuir hasta gemelos digitales de trampas de antimateria, construyo las herramientas que crean, dirigen y miden haces de partículas cargadas.',
            experience: [
                { role: 'Físico de aceleradores', bullets: [
                    'Responsable del <b>diseño del inyector de electrones</b> y del análisis y la optimización de la óptica electrónica.',
                    'Desarrollo de diagnósticos de plasma y de haces, como <b>sondas B-dot</b>, <b>copas de Faraday</b>, <b>sondas de Langmuir</b> y monitores de corriente.'] },
                { role: 'I+D independiente y consultoría científica', org: 'PY-BEMCS · consultoría para start-ups y laboratorios', bullets: [
                    'Desarrollé <b>PY-BEMCS</b>, un paquete multifísico en Python para simular la extracción de haces de iones y la física de colisiones Monte Carlo (MCC) en fuentes de iones / propulsores y en inyectores de haces neutros (NBI) para fusión.',
                    'Desarrollé un <b>solucionador de Poisson</b> autoconsistente que integra la extracción basada en el criterio de Bohm.',
                    'Implementé una lógica dinámica de <b>erosión por pulverización y fallo estructural</b> mediante modelos probabilísticos de dispersión por intercambio de carga (CEX) y erosión de malla in situ para predecir el <b>fin de vida útil (EOL)</b> de las rejillas.',
                    'Asesoría científica a start-ups y laboratorios en <b>propulsión eléctrica</b>, <b>fuentes de iones</b>, sistemas basados en plasma y otras áreas interdisciplinarias: modelado, diseño y optimización.'] },
                { role: 'Investigador asociado', bullets: [
                    'Dirigí estudios de optimización del <b>transporte balístico de antiprotones</b> durante la parada anual, con un modelo 3D de trampa de Penning en CST, para validar el nuevo diseño del blanco de positronio y fijar los parámetros de operación para velocidades de antiprotones <b>inferiores a 2000 m/s</b>.',
                    'Desarrollé <b>modelos de orden reducido (ROM)</b> para un gemelo digital del aparato de trampa de Penning–Malmberg, combinando física de primeros principios con aprendizaje automático para predecir el comportamiento de la trampa y optimizar el confinamiento de partículas.',
                    'Turnos de operación durante el tiempo de haz, incluida la adquisición de datos en tiempo real y la gestión de los sistemas criogénicos de los imanes superconductores.'] },
                { role: 'Ingeniero de protección radiológica', bullets: [
                    'Gestioné la exposición ocupacional a la radiación del personal de la central nuclear de Kakrapar, garantizando el estricto cumplimiento de los límites reglamentarios de dosis semanales, mensuales y anuales.',
                    'Desarrollé una hoja de cálculo automatizada de seguimiento de dosis para vigilar tendencias e identificar al personal cercano a los umbrales, lo que permitió intervenciones de seguridad preventivas.'] },
                { role: 'Investigador en prácticas', org: 'Laboratorio de Sistemas de Haces y Plasma, Instituto de Física y Tecnología de Moscú (MIPT), Rusia', bullets: [
                    'Realicé estudios de <b>diagnóstico por espectroscopía visible</b> de la <b>fuente de haz de electrones</b> en el Laboratorio de Sistemas de Haces y Plasma.'] }
            ],
            education: [
                { role: 'Doctorado (Ph.D.)', bullets: [
                    `Diseñé, desarrollé y caractericé una <b>${A(PHD, 'fuente de iones de cúspide anular')}</b> para propulsión espacial e investigación en fusión, con haces de Ar⁺ de <b>1–2 keV / hasta 100 mA</b> y una media de <b>0,23 mA por apertura</b>.`,
                    'Diseñé una <b>matriz de hilos paralelos (PWA)</b> de nueve canales y una <b>matriz de copas de Faraday (FCA)</b> para monitorizar en tiempo real e in situ el perfil del haz de iones.',
                    'Investigué la neutralización de la carga espacial mediante un cátodo de filamento caliente, alcanzando hasta un <b>100 % de grado de neutralización</b>.',
                    'Utilicé <b>CST Studio</b> para optimizar la cúspide magnética y <b>OPERA-3D</b> para el diseño de la óptica iónica, logrando una baja divergencia del haz de <b>6,5°</b>; un análisis termoestructural transitorio en ANSYS limitó la deformación térmica de las rejillas a <b>&lt;0,1 mm</b>.'] },
                { role: 'Máster (M.Tech.) en Ingeniería Nuclear', bullets: [
                    `Desarrollé una <b>${A(MT, 'copa de Faraday de 10 kW')}</b> para corrientes de haz de 20–30 mA, una gran mejora respecto al sistema anterior de 1 kW / 500 µA.`,
                    'Diseñé un sistema de refrigeración por agua que mantiene la temperatura máxima en <b>350,6 °C</b>, muy por debajo del punto de fusión del cobre (1085 °C).',
                    'Determiné la tensión de supresión óptima de <b>−450 a −500 V</b> mediante SIMION 8.0 y trazado de partículas con LORENTZ.',
                    'Optimicé una geometría de cono de 30°, que reduce el rendimiento total de electrones secundarios en un factor de <b>1,15</b> frente a ángulos mayores.'] },
                { role: 'Ingeniería Mecánica (B.E.)', bullets: [
                    '<b>Tesis — sistema de frenado de un urdidor (Long Chain Beamer):</b> demostré que sustituir el acero dulce templado por hierro fundido reduce el aumento de temperatura por frenada en 1,39 °C, mejorando la seguridad del algodón sensible al calor.',
                    '<b>Proyecto — máquina envasadora de vasos de helado:</b> diagnostiqué desalineaciones mecánicas y recuperé la producción de <b>9600 → 11 200 vasos/h</b>, cerca de la capacidad de diseño.'] }
            ],
            projects: [
                { tag: 'Software de código abierto', text: 'Extracción de haces de iones y física de colisiones Monte Carlo para fuentes de iones, propulsores y NBI de fusión, con erosión por pulverización, predicción de la vida útil de las rejillas y una interfaz gráfica en tiempo real.' },
                { name: 'Gemelo digital de AEgIS', tag: 'CERN · antimateria', text: 'Modelos de orden reducido que combinan física de primeros principios con aprendizaje automático para predecir el comportamiento de la trampa de Penning–Malmberg y optimizar el confinamiento de antiprotones.' },
                { name: 'Fuente de iones de cúspide anular', tag: 'Doctorado · propulsión espacial y fusión', text: 'Diseñé, construí y caractericé una fuente multicúspide con haces de Ar⁺ de 1–2 keV / hasta 100 mA y hasta un 100 % de neutralización de la carga espacial.' },
                { name: 'Copa de Faraday de 10 kW', tag: 'Máster · diagnóstico de haces', text: 'Copa de Faraday refrigerada por agua para haces de 20–30 mA, 20 veces más potente que el sistema anterior de 1 kW, con supresión optimizada mediante SIMION y LORENTZ.' }
            ],
            gallery: [
                ['Fuente de iones octagonal de cúspide anular', 'La fuente ORIS de mi doctorado, con sus rejillas de extracción multiapertura.'],
                ['Haz encendido', 'Brillo del plasma dentro de la cámara de la fuente en funcionamiento.'],
                ['Rejillas de pantalla y aceleración', 'Óptica iónica de la fuente de cúspide lineal, aislada con bolas cerámicas.'],
                ['Fuente de iones de cúspide lineal', 'Interior de la cámara de descarga de la fuente de cúspide lineal con confinamiento axial.'],
                ['Matriz de copas de Faraday', 'Monitorización in situ y en tiempo real del perfil del haz de iones.'],
                ['Copa de Faraday de alta potencia', 'Copa de cobre refrigerada por agua para haces de 10 kW y 20–30 mA.'],
                ['Matriz de hilos paralelos', 'Matriz de hilos para medir perfiles de haces de iones.'],
                ['RPA magnético', 'Analizador de potencial retardador con filtro magnético para iones de intercambio de carga de baja energía.'],
                ['Sonda de Langmuir', 'Sonda de densidad de plasma: punta de 5,5 mm de largo y 0,5 mm de diámetro.'],
                ['Sonda de intercambio de carga', 'Sonda para iones de intercambio de carga en la región del haz.'],
                ['Sensor de empuje', 'Medición del empuje en ensayos de propulsión eléctrica.']
            ],
            offer: [
                { title: 'Consultoría', text: 'Diseño de fuentes de iones y trampas de partículas, diagnóstico de haces y estudios basados en simulación con CST Studio, MAD-X y más.' },
                { title: 'Mentoría', text: 'Orientación para candidatos a máster y doctorado: estrategia de solicitud, cartas de presentación y CV.' },
                { title: 'Charlas y divulgación', text: 'Seminarios, conferencias especializadas y charlas en colegios sobre fuentes de iones, propulsión eléctrica y aceleradores de partículas.' },
                { title: 'Apoyo en reclutamiento', text: 'Ayudo a empresas y grupos de investigación a encontrar talento cualificado en física de plasmas, fuentes de iones y física aplicada a través de mi red profesional.' }
            ],
            skills: [
                { label: 'Idiomas', text: 'Inglés (fluido), hindi y guyaratí (nativo), español (B2), ruso (A1).' },
                { label: 'Programación' },
                { label: 'Aprendizaje automático' },
                { label: 'Desarrollo y computación' },
                { label: 'Simuladores de partículas y campos', text: 'CST Studio (seguimiento de partículas, ES/EM-PIC), OPERA-3D, SIMION, IBISIMU, COMSOL, RF Track, ASTRA, MAD-X, Geant4, G4Beamline, TRAK, BDSIM, <b>PY-BEMCS (desarrollador)</b>.' },
                { label: 'CAD / multifísica', text: 'SolidWorks, ANSYS (térmico / estructural / CFD).' },
                { label: 'Laboratorio', text: 'Sistemas de alta tensión (HV), sistemas de vacío, hardware de adquisición de datos (DAQ), sistemas de control.' },
                { label: 'Divulgación', text: 'Diseñé juegos web interactivos para divulgar la física de la antimateria; realicé demostraciones en directo de superconductividad y levitación magnética.' },
                { label: 'Docencia y otros', text: 'Co-instructor de <i>Introducción al diagnóstico de haces</i>; tutoriales de computación HPC; supervisión de doctorandos.' }
            ],
            hobbies: [['AJEDREZ', 'Jugador de ajedrez: ELO 1725, 1900 en chess.com'], ['INSTRUMENTOS', 'Teclados, armonio, melódica, keytar y guitarra'], ['VIAJES', 'He viajado a más de 12 países, y sigo sumando...']],
            talkTypes: { 'Invited talk': 'Charla invitada', 'Contributed talk': 'Ponencia' },
            videos: ['Modelado de óptica iónica y PY-BEMCS', 'Clase de diagnóstico de haces, Universidad de Liverpool', 'Simulador interactivo de colisiones Monte Carlo para propulsores iónicos',
                'Erosión de las rejillas de un propulsor iónico', 'Simulación PIC 3D de un propulsor iónico', 'Simulación PIC de un analizador de potencial retardador',
                'Análisis de campo en tiempo real de imanes superconductores', 'PIC 3D de iones y electrones en una trampa de Penning', 'Transferencia balística de antiprotones', 'Aniquilaciones de antiprotones en G4beamline']
        },
        ru: {
            title: 'Эксперт по ионным источникам и диагностике пучков',
            summary: 'Эксперт в области пучков заряженных частиц с более чем 7-летним опытом проектирования ионных источников, систем диагностики и транспортировки пучков.',
            expertise: 'Проектирование ионных источников, оптимизация извлечения и транспортировки пучков, нейтрализация пространственного заряда, современная диагностика пучков, цифровые двойники ловушек заряженных частиц.',
            about: 'Я работаю с электронными и ионными источниками и с диагностикой их пучков. От цилиндров Фарадея и зондов Ленгмюра до цифровых двойников ловушек антиматерии — я создаю инструменты, которые формируют, направляют и измеряют пучки заряженных частиц.',
            experience: [
                { role: 'Физик-ускорительщик', bullets: [
                    'Отвечаю за <b>проектирование электронного инжектора</b>, анализ и оптимизацию электронной оптики.',
                    'Разработка диагностики плазмы и пучков: <b>B-dot зонды</b>, <b>цилиндры Фарадея</b>, <b>зонды Ленгмюра</b> и мониторы тока.'] },
                { role: 'Независимые исследования и научный консалтинг', org: 'PY-BEMCS · консалтинг для стартапов и лабораторий', bullets: [
                    'Разработал <b>PY-BEMCS</b> — мультифизический пакет на Python для моделирования извлечения ионных пучков и физики столкновений методом Монте-Карло (MCC) в ионных источниках / двигателях и инжекторах нейтральных пучков (NBI) для термоядерного синтеза.',
                    'Разработал метод <b>самосогласованного решения уравнения Пуассона</b> с учётом извлечения частиц на основе критерия Бома.',
                    'Реализовал динамическую модель <b>распыления и структурного разрушения</b> на основе вероятностного перезарядного рассеяния (CEX) и эрозии сетки in situ для прогнозирования <b>ресурса (EOL)</b> сеток.',
                    'Научный консалтинг для стартапов и лабораторий в области <b>электрических ракетных двигателей</b>, <b>ионных источников</b>, плазменных систем и смежных направлений: моделирование, проектирование и оптимизация.'] },
                { role: 'Научный сотрудник', bullets: [
                    'Руководил оптимизацией <b>баллистического транспорта антипротонов</b> во время ежегодной остановки, используя 3D-модель ловушки Пеннинга в CST, чтобы проверить новую конструкцию позитронной мишени и подобрать режимы для скоростей антипротонов <b>ниже 2000 м/с</b>.',
                    'Разработал <b>модели пониженного порядка (ROM)</b> для цифрового двойника ловушки Пеннинга–Мальмберга, объединив физику из первых принципов с машинным обучением для прогнозирования поведения ловушки и оптимизации удержания частиц.',
                    'Выполнял обязанности во время смены на ускорителе, включая сбор данных в режиме реального времени и управление криогенными системами сверхпроводящих магнитов.'] },
                { role: 'Инженер по радиационной защите', bullets: [
                    'Контролировал профессиональное облучение персонала АЭС Какрапар, обеспечивая строгое соблюдение недельных, месячных и годовых нормативных пределов доз.',
                    'Создал автоматизированную таблицу учёта доз для отслеживания тенденций и выявления сотрудников, приближающихся к пороговым значениям, что позволило заранее принимать меры безопасности.'] },
                { role: 'Стажёр-исследователь', org: 'Лаборатория пучково-плазменных систем, Московский физико-технический институт (МФТИ), Россия', bullets: [
                    'Проводил исследования <b>диагностики методом спектроскопии в видимом диапазоне</b> для <b>источника электронного пучка</b> в лаборатории пучково-плазменных систем.'] }
            ],
            education: [
                { role: 'Ph.D. (кандидат наук)', bullets: [
                    `Спроектировал, создал и исследовал <b>${A(PHD, 'ионный источник с кольцевым каспом')}</b> для космических двигателей и термоядерных исследований: пучки Ar⁺ <b>1–2 кэВ / до 100 мА</b>, в среднем <b>0,23 мА на апертуру</b>.`,
                    'Разработал девятиканальную <b>решётку параллельных проволок (PWA)</b> и <b>матрицу цилиндров Фарадея (FCA)</b> для контроля профиля ионного пучка в реальном времени.',
                    'Исследовал нейтрализацию пространственного заряда с помощью катода с накалённой нитью, достигнув <b>100% степени нейтрализации</b>.',
                    'Использовал <b>CST Studio</b> для оптимизации магнитного каспа и <b>OPERA-3D</b> для расчёта ионной оптики — получил малую расходимость пучка <b>6,5°</b>; нестационарный термопрочностной анализ в ANSYS ограничил тепловую деформацию сеток до <b>&lt;0,1 мм</b>.'] },
                { role: 'Магистратура (M.Tech.), ядерная инженерия', bullets: [
                    `Разработал <b>${A(MT, 'цилиндр Фарадея на 10 кВт')}</b> для токов пучка 20–30 мА — значительное улучшение по сравнению с прежней системой 1 кВт / 500 мкА.`,
                    'Спроектировал систему водяного охлаждения, удерживающую максимальную температуру на уровне <b>350,6 °C</b> — значительно ниже температуры плавления меди (1085 °C).',
                    'Определил оптимальное напряжение подавления <b>от −450 до −500 В</b> с помощью SIMION 8.0 и трассировки частиц в LORENTZ.',
                    'Оптимизировал геометрию конуса 30°, снизив суммарный коэффициент вторичной электронной эмиссии в <b>1,15</b> раза по сравнению с большими углами.'] },
                { role: 'Бакалавриат (B.E.), машиностроение', bullets: [
                    '<b>Диплом — тормозная система сновальной машины (Long Chain Beamer):</b> показал, что замена закалённой мягкой стали на чугун снижает нагрев за одно торможение на 1,39 °C, повышая безопасность для термочувствительного хлопка.',
                    '<b>Проект — машина для упаковки стаканчиков мороженого:</b> выявил и устранил нарушения механической регулировки, увеличив производительность с <b>9 600 до 11 200 стаканчиков в час</b> и почти восстановив проектную мощность.'] }
            ],
            projects: [
                { tag: 'Открытое ПО', text: 'Извлечение ионных пучков и физика столкновений Монте-Карло для ионных источников, двигателей и термоядерных NBI: распыление, прогноз ресурса сеток и графический интерфейс реального времени.' },
                { name: 'Цифровой двойник AEgIS', tag: 'ЦЕРН · антиматерия', text: 'Модели пониженного порядка, объединяющие физику из первых принципов и машинное обучение, для прогнозирования поведения ловушки Пеннинга–Мальмберга и оптимизации удержания антипротонов.' },
                { name: 'Ионный источник с кольцевым каспом', tag: 'PhD · космические двигатели и термоядерный синтез', text: 'Спроектировал, построил и исследовал многокаспный источник с пучками Ar⁺ 1–2 кэВ / до 100 мА и нейтрализацией пространственного заряда до 100%.' },
                { name: 'Цилиндр Фарадея на 10 кВт', tag: 'Магистратура · диагностика пучков', text: 'Цилиндр Фарадея с водяным охлаждением для пучков 20–30 мА — в 20 раз мощнее прежней системы на 1 кВт, с подавлением, оптимизированным в SIMION и LORENTZ.' }
            ],
            gallery: [
                ['Октагональный ионный источник с кольцевым каспом', 'Источник ORIS из моей диссертации с многоапертурными извлекающими сетками.'],
                ['Пучок включён', 'Свечение плазмы в камере источника во время работы.'],
                ['Экранирующая и ускоряющая сетки', 'Ионная оптика источника с линейным каспом, изолированная керамическими шариками.'],
                ['Ионный источник с линейным каспом', 'Внутри разрядной камеры источника с линейным каспом и аксиальным удержанием.'],
                ['Матрица цилиндров Фарадея', 'Контроль профиля ионного пучка в реальном времени.'],
                ['Мощный цилиндр Фарадея', 'Медный цилиндр с водяным охлаждением для пучков 10 кВт, 20–30 мА.'],
                ['Решётка параллельных проволок', 'Проволочная решётка для измерения профилей ионных пучков.'],
                ['Магнитный RPA', 'Анализатор задерживающего потенциала с магнитным фильтром для низкоэнергетичных ионов перезарядки.'],
                ['Зонд Ленгмюра', 'Зонд для измерения плотности плазмы: наконечник длиной 5,5 мм и диаметром 0,5 мм.'],
                ['Зонд перезарядки', 'Зонд для ионов перезарядки в области пучка.'],
                ['Датчик тяги', 'Измерение тяги при испытаниях электрических двигателей.']
            ],
            offer: [
                { title: 'Консалтинг', text: 'Проектирование ионных источников и ловушек частиц, диагностика пучков и расчётные исследования в CST Studio, MAD-X и других программах.' },
                { title: 'Наставничество', text: 'Помощь абитуриентам магистратуры и аспирантуры: стратегия поступления, мотивационные письма и резюме.' },
                { title: 'Лекции и популяризация', text: 'Семинары, экспертные лекции и выступления в школах об ионных источниках, электрических двигателях и ускорителях частиц.' },
                { title: 'Помощь в подборе кадров', text: 'Помогаю компаниям и исследовательским группам находить квалифицированных специалистов в физике плазмы, ионных источниках и прикладной физике через свою профессиональную сеть.' }
            ],
            skills: [
                { label: 'Языки', text: 'Английский (свободно), хинди и гуджарати (родные), испанский (B2), русский (A1).' },
                { label: 'Программирование' },
                { label: 'Машинное обучение' },
                { label: 'Разработка и вычисления' },
                { label: 'Расчёт частиц и полей', text: 'CST Studio (трассировка частиц, ES/EM-PIC), OPERA-3D, SIMION, IBISIMU, COMSOL, RF Track, ASTRA, MAD-X, Geant4, G4Beamline, TRAK, BDSIM, <b>PY-BEMCS (разработчик)</b>.' },
                { label: 'САПР / мультифизика', text: 'SolidWorks, ANSYS (тепловой / прочностной / CFD).' },
                { label: 'Лабораторный опыт', text: 'Высоковольтные системы, вакуумные системы, аппаратура сбора данных (DAQ), системы управления.' },
                { label: 'Популяризация', text: 'Создал интерактивные веб-игры о физике антиматерии; проводил живые демонстрации сверхпроводимости и магнитной левитации.' },
                { label: 'Преподавание и др.', text: 'Соинструктор курса <i>«Введение в диагностику пучков»</i>; занятия по HPC-вычислениям; руководство аспирантами.' }
            ],
            hobbies: [['ШАХМАТЫ', 'Шахматист: рейтинг Эло 1725, 1900 на chess.com'], ['МУЗЫКА', 'Клавишные, фисгармония, мелодика, кейтар и гитара'], ['ПУТЕШЕСТВИЯ', 'Побывал более чем в 12 странах — и это не предел...']],
            talkTypes: { 'Invited talk': 'Приглашённый доклад', 'Contributed talk': 'Доклад' },
            videos: ['Моделирование ионной оптики и PY-BEMCS', 'Лекция по диагностике пучков, Ливерпульский университет', 'Интерактивный симулятор столкновений Монте-Карло для ионных двигателей',
                'Эрозия сеток ионного двигателя', '3D PIC-моделирование ионного двигателя', 'PIC-моделирование анализатора задерживающего потенциала',
                'Анализ поля сверхпроводящих магнитов в реальном времени', '3D PIC ионов и электронов в ловушке Пеннинга', 'Баллистический перенос антипротонов', 'Аннигиляция антипротонов в G4beamline']
        },
        fr: {
            title: 'Expert en sources d’ions et diagnostic de faisceaux',
            summary: 'Expert en faisceaux de particules chargées, avec plus de 7 ans d’expérience dans la conception de sources d’ions, le diagnostic de faisceaux et les systèmes de transport.',
            expertise: 'Conception de sources d’ions, optimisation de l’extraction et du transport des faisceaux, neutralisation de la charge d’espace, diagnostic avancé des faisceaux et jumeaux numériques pour les pièges à particules chargées.',
            about: 'Je travaille avec des sources d’électrons et d’ions et avec les diagnostics qui mesurent leurs faisceaux. Des cages de Faraday et sondes de Langmuir aux jumeaux numériques de pièges à antimatière, je construis les outils qui créent, guident et mesurent les faisceaux de particules chargées.',
            experience: [
                { role: 'Physicien des accélérateurs', bullets: [
                    'Responsable de la <b>conception de l’injecteur d’électrons</b>, ainsi que de l’analyse et de l’optimisation de l’optique électronique.',
                    'Développement de diagnostics de plasma et de faisceaux tels que des <b>sondes B-dot</b>, des <b>cages de Faraday</b>, des <b>sondes de Langmuir</b> et des moniteurs de courant.'] },
                { role: 'R&D indépendante et conseil scientifique', org: 'PY-BEMCS · conseil pour start-ups et laboratoires', bullets: [
                    'Développement de <b>PY-BEMCS</b>, une suite multiphysique en Python pour simuler l’extraction de faisceaux d’ions et la physique des collisions Monte-Carlo (MCC) dans les sources d’ions / propulseurs et les injecteurs de neutres (NBI) pour la fusion.',
                    'Développement d’un <b>solveur de Poisson</b> autocohérent intégrant une extraction fondée sur le critère de Bohm.',
                    'Mise en œuvre d’une logique dynamique d’<b>érosion par pulvérisation et de rupture structurelle</b>, à l’aide de modèles probabilistes de diffusion par échange de charge (CEX) et d’une érosion du maillage in situ, pour prédire la <b>fin de vie (EOL)</b> des grilles.',
                    'Conseil scientifique auprès de start-ups et de laboratoires en <b>propulsion électrique</b>, <b>sources d’ions</b>, systèmes à plasma et autres domaines pluridisciplinaires : modélisation, conception et optimisation.'] },
                { role: 'Chercheur associé', bullets: [
                    'Direction d’études d’optimisation du <b>transport balistique d’antiprotons</b> pendant l’arrêt annuel, à l’aide d’un modèle 3D de piège de Penning sous CST, pour valider la nouvelle cible de positronium et déterminer les réglages de fonctionnement pour des vitesses d’antiprotons <b>inférieures à 2000 m/s</b>.',
                    'Développement de <b>modèles d’ordre réduit (ROM)</b> pour un jumeau numérique du dispositif à piège de Penning–Malmberg, combinant physique des premiers principes et apprentissage automatique pour prédire le comportement du piège et optimiser le confinement des particules.',
                    'Quarts d’exploitation pendant les périodes de faisceau : acquisition de données en temps réel et gestion des systèmes cryogéniques des aimants supraconducteurs.'] },
                { role: 'Ingénieur en radioprotection', bullets: [
                    'Gestion de l’exposition professionnelle aux rayonnements du personnel de la centrale nucléaire de Kakrapar, dans le strict respect des limites réglementaires de dose hebdomadaires, mensuelles et annuelles.',
                    'Création d’un tableur automatisé de suivi des doses pour surveiller les tendances et repérer le personnel proche des seuils, permettant des interventions de sécurité préventives.'] },
                { role: 'Stagiaire de recherche', org: 'Laboratoire des systèmes faisceau-plasma, Institut de physique et de technologie de Moscou (MIPT), Russie', bullets: [
                    'Études du <b>diagnostic par spectroscopie visible</b> de la <b>source de faisceau d’électrons</b> au Laboratoire des systèmes faisceau-plasma.'] }
            ],
            education: [
                { role: 'Doctorat (Ph.D.)', bullets: [
                    `Conception, développement et caractérisation d’une <b>${A(PHD, 'source d’ions à cuspide annulaire')}</b> pour la propulsion spatiale et la recherche sur la fusion, produisant des faisceaux d’Ar⁺ de <b>1–2 keV / jusqu’à 100 mA</b>, avec en moyenne <b>0,23 mA par ouverture</b>.`,
                    'Conception d’une <b>matrice de fils parallèles (PWA)</b> à neuf canaux et d’une <b>matrice de cages de Faraday (FCA)</b> pour la surveillance in situ et en temps réel du profil du faisceau d’ions.',
                    'Étude de la neutralisation de la charge d’espace à l’aide d’une cathode à filament chaud, atteignant jusqu’à <b>100 % de neutralisation</b>.',
                    'Utilisation de <b>CST Studio</b> pour optimiser la cuspide magnétique et d’<b>OPERA-3D</b> pour l’optique ionique, avec une faible divergence du faisceau de <b>6,5°</b> ; une analyse thermostructurale transitoire sous ANSYS a limité la déformation thermique des grilles à <b>&lt;0,1 mm</b>.'] },
                { role: 'Master (M.Tech.) en génie nucléaire', bullets: [
                    `Développement d’une <b>${A(MT, 'cage de Faraday de 10 kW')}</b> pour des courants de faisceau de 20–30 mA, une nette amélioration par rapport à l’ancien système de 1 kW / 500 µA.`,
                    'Conception d’un système de refroidissement par eau maintenant la température maximale à <b>350,6 °C</b>, bien en dessous du point de fusion du cuivre (1085 °C).',
                    'Détermination de la tension de suppression optimale de <b>−450 à −500 V</b> avec SIMION 8.0 et le suivi de particules LORENTZ.',
                    'Optimisation d’une géométrie de cône à 30°, réduisant le rendement total en électrons secondaires d’un facteur <b>1,15</b> par rapport à des angles plus grands.'] },
                { role: 'Diplôme d’ingénieur en génie mécanique (B.E.)', bullets: [
                    '<b>Mémoire — système de freinage d’un ourdissoir (Long Chain Beamer) :</b> j’ai montré que remplacer l’acier doux trempé par de la fonte réduit l’échauffement par freinage de 1,39 °C, ce qui améliore la sécurité du coton sensible à la chaleur.',
                    '<b>Projet — machine d’emballage de pots de glace :</b> diagnostic des désalignements mécaniques et production rétablie de <b>9 600 → 11 200 pots/h</b>, proche de la capacité nominale.'] }
            ],
            projects: [
                { tag: 'Logiciel libre', text: 'Extraction de faisceaux d’ions et physique des collisions Monte-Carlo pour les sources d’ions, les propulseurs et les NBI de fusion, avec érosion par pulvérisation, prédiction de la fin de vie des grilles et interface graphique en temps réel.' },
                { name: 'Jumeau numérique d’AEgIS', tag: 'CERN · antimatière', text: 'Modèles d’ordre réduit combinant physique des premiers principes et apprentissage automatique pour prédire le comportement du piège de Penning–Malmberg et optimiser le confinement des antiprotons.' },
                { name: 'Source d’ions à cuspide annulaire', tag: 'Doctorat · propulsion spatiale et fusion', text: 'Conception, construction et caractérisation d’une source multicuspide produisant des faisceaux d’Ar⁺ de 1–2 keV / jusqu’à 100 mA, avec jusqu’à 100 % de neutralisation de la charge d’espace.' },
                { name: 'Cage de Faraday de 10 kW', tag: 'Master · diagnostic de faisceaux', text: 'Cage de Faraday refroidie par eau pour des faisceaux de 20–30 mA, 20 fois plus puissante que l’ancien système de 1 kW, avec une suppression optimisée via SIMION et LORENTZ.' }
            ],
            gallery: [
                ['Source d’ions octogonale à cuspide annulaire', 'La source ORIS de mon doctorat, avec ses grilles d’extraction multi-ouvertures.'],
                ['Faisceau allumé', 'Lueur du plasma dans la chambre de la source en fonctionnement.'],
                ['Grilles écran et d’accélération', 'Optique ionique de la source à cuspides linéaires, isolée par des billes en céramique.'],
                ['Source d’ions à cuspides linéaires', 'Intérieur de la chambre de décharge de la source à cuspides linéaires avec confinement axial.'],
                ['Matrice de cages de Faraday', 'Surveillance in situ et en temps réel du profil du faisceau d’ions.'],
                ['Cage de Faraday haute puissance', 'Cage en cuivre refroidie par eau pour des faisceaux de 10 kW et 20–30 mA.'],
                ['Matrice de fils parallèles', 'Matrice de fils pour mesurer les profils de faisceaux d’ions.'],
                ['RPA magnétique', 'Analyseur à potentiel retardateur avec filtre magnétique pour les ions d’échange de charge de basse énergie.'],
                ['Sonde de Langmuir', 'Sonde de densité de plasma : pointe de 5,5 mm de long et 0,5 mm de diamètre.'],
                ['Sonde d’échange de charge', 'Sonde pour les ions d’échange de charge dans la région du faisceau.'],
                ['Capteur de poussée', 'Mesure de la poussée lors d’essais de propulsion électrique.']
            ],
            offer: [
                { title: 'Conseil', text: 'Conception de sources d’ions et de pièges à particules, diagnostic de faisceaux et études par simulation avec CST Studio, MAD-X et d’autres outils.' },
                { title: 'Mentorat', text: 'Accompagnement des candidats au master et au doctorat : stratégie de candidature, lettres de motivation et CV.' },
                { title: 'Conférences et vulgarisation', text: 'Séminaires, conférences d’expert et interventions en milieu scolaire sur les sources d’ions, la propulsion électrique et les accélérateurs de particules.' },
                { title: 'Aide au recrutement', text: 'J’aide les entreprises et les groupes de recherche à trouver des talents qualifiés en physique des plasmas, sources d’ions et physique appliquée grâce à mon réseau professionnel.' }
            ],
            skills: [
                { label: 'Langues', text: 'Anglais (courant), hindi et gujarati (langues maternelles), espagnol (B2), russe (A1).' },
                { label: 'Programmation' },
                { label: 'Apprentissage automatique' },
                { label: 'Développement et calcul' },
                { label: 'Solveurs de particules et de champs', text: 'CST Studio (suivi de particules, ES/EM-PIC), OPERA-3D, SIMION, IBISIMU, COMSOL, RF Track, ASTRA, MAD-X, Geant4, G4Beamline, TRAK, BDSIM, <b>PY-BEMCS (développeur)</b>.' },
                { label: 'CAO / multiphysique', text: 'SolidWorks, ANSYS (thermique / structurel / CFD).' },
                { label: 'Pratique / laboratoire', text: 'Systèmes haute tension (HT), systèmes à vide, matériel d’acquisition de données (DAQ), systèmes de contrôle-commande.' },
                { label: 'Vulgarisation', text: 'Conception de jeux web interactifs pour vulgariser la physique de l’antimatière ; démonstrations en direct de supraconductivité et de lévitation magnétique.' },
                { label: 'Enseignement et divers', text: 'Co-enseignant — <i>Introduction au diagnostic de faisceaux</i> ; tutoriels de calcul HPC ; encadrement de doctorants.' }
            ],
            hobbies: [['ÉCHECS', 'Joueur d’échecs : ELO 1725, 1900 sur chess.com'], ['INSTRUMENTS', 'Claviers, harmonium, mélodica, keytar et guitare'], ['VOYAGES', 'Plus de 12 pays visités, et ce n’est pas fini...']],
            talkTypes: { 'Invited talk': 'Conférence invitée', 'Contributed talk': 'Communication orale' },
            videos: ['Modélisation de l’optique ionique et PY-BEMCS', 'Cours de diagnostic de faisceaux, Université de Liverpool', 'Simulateur interactif de collisions Monte-Carlo pour propulseurs ioniques',
                'Érosion des grilles d’un propulseur ionique', 'Simulation PIC 3D d’un propulseur ionique', 'Simulation PIC d’un analyseur à potentiel retardateur',
                'Analyse de champ en temps réel d’aimants supraconducteurs', 'PIC 3D d’ions et d’électrons dans un piège de Penning', 'Transfert balistique d’antiprotons', 'Annihilations d’antiprotons dans G4beamline']
        },
        gu: {
            title: 'આયન સ્રોત અને બીમ ડાયગ્નોસ્ટિક્સ નિષ્ણાત',
            summary: 'આયન સ્રોતોની ડિઝાઇન, બીમ ડાયગ્નોસ્ટિક્સ અને ટ્રાન્સપોર્ટ સિસ્ટમ્સમાં 7 વર્ષથી વધુ અનુભવ ધરાવતા ચાર્જ્ડ-પાર્ટિકલ બીમના નિષ્ણાત.',
            expertise: 'આયન સ્રોત ડિઝાઇન, બીમ એક્સટ્રેક્શન અને ટ્રાન્સપોર્ટનું ઑપ્ટિમાઇઝેશન, સ્પેસ-ચાર્જ ન્યુટ્રલાઇઝેશન, અદ્યતન બીમ ડાયગ્નોસ્ટિક્સ અને ચાર્જ્ડ-પાર્ટિકલ ટ્રેપ માટે ડિજિટલ ટ્વિન.',
            about: 'હું ઇલેક્ટ્રોન અને આયન સ્રોતો તથા તેમના બીમ માપતાં ડાયગ્નોસ્ટિક્સ સાથે કામ કરું છું. ફેરાડે કપ અને લેંગમ્યુર પ્રોબથી લઈને પ્રતિદ્રવ્ય (એન્ટિમેટર) ટ્રેપના ડિજિટલ ટ્વિન સુધી, હું એવાં સાધનો બનાવું છું જે ચાર્જ્ડ-પાર્ટિકલ બીમ ઉત્પન્ન કરે છે, દિશા આપે છે અને માપે છે.',
            experience: [
                { role: 'એક્સિલરેટર ભૌતિકશાસ્ત્રી', bullets: [
                    '<b>ઇલેક્ટ્રોન ઇન્જેક્ટર ડિઝાઇન</b>, ઇલેક્ટ્રોન ઑપ્ટિક્સ વિશ્લેષણ અને ઑપ્ટિમાઇઝેશન માટે જવાબદાર.',
                    '<b>B-dot પ્રોબ</b>, <b>ફેરાડે કપ</b>, <b>લેંગમ્યુર પ્રોબ</b> અને કરંટ મોનિટર જેવાં પ્લાઝ્મા અને બીમ ડાયગ્નોસ્ટિક્સ વિકસાવી રહ્યો છું.'] },
                { role: 'સ્વતંત્ર સંશોધન-વિકાસ અને વૈજ્ઞાનિક કન્સલ્ટિંગ', org: 'PY-BEMCS · સ્ટાર્ટ-અપ્સ અને પ્રયોગશાળાઓ માટે કન્સલ્ટિંગ', bullets: [
                    '<b>PY-BEMCS</b> વિકસાવ્યું — આયન સ્રોતો / થ્રસ્ટર્સ અને ફ્યુઝન ન્યુટ્રલ બીમ ઇન્જેક્ટર (NBI)માં આયન-બીમ એક્સટ્રેક્શન અને મોન્ટે કાર્લો કોલિઝન (MCC) ભૌતિકશાસ્ત્રનું સિમ્યુલેશન કરતો Python આધારિત મલ્ટિફિઝિક્સ સ્યુટ.',
                    'બોહ્મ માપદંડ આધારિત એક્સટ્રેક્શન સાથે સ્વ-સુસંગત <b>પોઇસન સોલ્વર</b> વિકસાવ્યો.',
                    'ગ્રિડનું <b>અંતિમ આયુષ્ય (EOL)</b> અનુમાનિત કરવા માટે સંભાવનાત્મક ચાર્જ-એક્સચેન્જ (CEX) સ્કેટરિંગ મોડેલ અને ઇન-સિટુ મેશ ઇરોઝન વડે ગતિશીલ <b>સ્પટર ઇરોઝન અને માળખાકીય નિષ્ફળતા</b>નું તર્ક અમલમાં મૂક્યું.',
                    '<b>ઇલેક્ટ્રિક પ્રોપલ્શન</b>, <b>આયન સ્રોતો</b>, પ્લાઝ્મા આધારિત સિસ્ટમ્સ અને અન્ય આંતરશાખાકીય ક્ષેત્રોમાં સ્ટાર્ટ-અપ્સ અને પ્રયોગશાળાઓને મોડેલિંગ, ડિઝાઇન અને ઑપ્ટિમાઇઝેશન અંગે વૈજ્ઞાનિક સલાહ આપી.'] },
                { role: 'સંશોધન સહયોગી (Research Associate)', bullets: [
                    'વાર્ષિક શટડાઉન દરમિયાન <b>બેલિસ્ટિક એન્ટિપ્રોટોન ટ્રાન્સપોર્ટ</b>ના ઑપ્ટિમાઇઝેશન અભ્યાસોનું નેતૃત્વ કર્યું; નવી પોઝિટ્રોનિયમ ટાર્ગેટ ડિઝાઇનને માન્ય કરવા અને <b>2000 m/sથી ઓછા</b> વેગવાળા એન્ટિપ્રોટોન માટે ઑપરેટિંગ સેટિંગ્સ નક્કી કરવા 3D CST પેનિંગ ટ્રેપ મોડેલનો ઉપયોગ કર્યો.',
                    'પેનિંગ–માલ્મબર્ગ ટ્રેપ ઉપકરણના ડિજિટલ ટ્વિન માટે <b>રિડ્યુસ્ડ ઑર્ડર મોડેલ (ROM)</b> વિકસાવ્યાં, જેમાં ટ્રેપના વર્તનની આગાહી અને કણોના બંધનના ઑપ્ટિમાઇઝેશન માટે મૂળભૂત ભૌતિકશાસ્ત્રને મશીન લર્નિંગ સાથે જોડ્યું.',
                    'બીમ ટાઇમ દરમિયાન શિફ્ટની જવાબદારીઓ નિભાવી, જેમાં રિયલ-ટાઇમ ડેટા એક્વિઝિશન અને સુપરકન્ડક્ટિંગ મેગ્નેટની ક્રાયોજેનિક સિસ્ટમ્સનું સંચાલન સામેલ હતું.'] },
                { role: 'રેડિયેશન પ્રોટેક્શન એન્જિનિયર', bullets: [
                    'કાકરાપાર અણુ વિદ્યુત મથકના કર્મચારીઓના વ્યાવસાયિક વિકિરણ સંપર્કનું સંચાલન કર્યું અને સાપ્તાહિક, માસિક તથા વાર્ષિક નિયમનકારી ડોઝ મર્યાદાઓનું ચુસ્ત પાલન સુનિશ્ચિત કર્યું.',
                    'ડોઝના વલણો પર નજર રાખવા અને મર્યાદાની નજીક પહોંચતા કર્મચારીઓને ઓળખવા સ્વચાલિત ડોઝ-ટ્રેકિંગ સ્પ્રેડશીટ બનાવી, જેથી સમયસર સુરક્ષા પગલાં લઈ શકાયાં.'] },
                { role: 'સંશોધન ઇન્ટર્ન', org: 'બીમ પ્લાઝ્મા સિસ્ટમ્સ લેબોરેટરી, મોસ્કો ઇન્સ્ટિટ્યૂટ ઑફ ફિઝિક્સ ઍન્ડ ટેક્નોલોજી (MIPT), રશિયા', bullets: [
                    'બીમ પ્લાઝ્મા સિસ્ટમ્સ લેબોરેટરીમાં <b>ઇલેક્ટ્રોન બીમ સ્રોત</b>ના <b>દૃશ્ય સ્પેક્ટ્રોસ્કોપી ડાયગ્નોસ્ટિક્સ</b> પર અભ્યાસ કર્યો.'] }
            ],
            education: [
                { role: 'પીએચ.ડી. (Ph.D.)', bullets: [
                    `અવકાશ પ્રોપલ્શન અને ફ્યુઝન સંશોધન માટે <b>${A(PHD, 'રિંગ-કસ્પ આયન સ્રોત')}</b> ડિઝાઇન, વિકસિત અને લાક્ષણિકૃત કર્યો, જે <b>1–2 keV / 100 mA સુધી</b>ના Ar⁺ બીમ અને સરેરાશ <b>પ્રતિ છિદ્ર 0.23 mA</b> ઉત્પન્ન કરે છે.`,
                    'રિયલ-ટાઇમ, ઇન-સિટુ આયન-બીમ પ્રોફાઇલ મોનિટરિંગ માટે નવ-ચેનલ <b>પેરેલલ વાયર એરે (PWA)</b> અને <b>ફેરાડે કપ એરે (FCA)</b> તૈયાર કર્યાં.',
                    'ગરમ ફિલામેન્ટ કેથોડ વડે સ્પેસ-ચાર્જ ન્યુટ્રલાઇઝેશનનો અભ્યાસ કર્યો અને <b>100% સુધી ન્યુટ્રલાઇઝેશન</b> હાંસલ કર્યું.',
                    'મેગ્નેટિક કસ્પ ઑપ્ટિમાઇઝેશન માટે <b>CST Studio</b> અને આયન-ઑપ્ટિક્સ ડિઝાઇન માટે <b>OPERA-3D</b>નો ઉપયોગ કર્યો — માત્ર <b>6.5°</b>ની ઓછી બીમ ડાયવર્જન્સ મેળવી; ANSYS ટ્રાન્ઝિયન્ટ થર્મો-સ્ટ્રક્ચરલ વિશ્લેષણથી ગ્રિડની થર્મલ વિકૃતિ <b>&lt;0.1 mm</b> સુધી મર્યાદિત રાખી.'] },
                { role: 'એમ.ટેક. ન્યુક્લિયર એન્જિનિયરિંગ', bullets: [
                    `20–30 mA બીમ કરંટ માટે <b>${A(MT, '10 kW ફેરાડે કપ')}</b> વિકસાવ્યો — જૂની 1 kW / 500 µA સિસ્ટમ કરતાં મોટો સુધારો.`,
                    'પાણી આધારિત ઠંડક પ્રણાલી બનાવી, જેણે મહત્તમ તાપમાન <b>350.6 °C</b> સુધી રાખ્યું — તાંબાના 1085 °C ગલનબિંદુથી ઘણું ઓછું.',
                    'SIMION 8.0 અને LORENTZ પાર્ટિકલ ટ્રેકિંગ વડે <b>−450 થી −500 V</b>નો શ્રેષ્ઠ સપ્રેશન વોલ્ટેજ નક્કી કર્યો.',
                    '30° શંકુ ભૂમિતિ ઑપ્ટિમાઇઝ કરી, જેનાથી મોટા ખૂણાની તુલનામાં કુલ સેકન્ડરી ઇલેક્ટ્રોન યીલ્ડ <b>1.15</b> ગણી ઘટી.'] },
                { role: 'બી.ઈ. મિકેનિકલ એન્જિનિયરિંગ', bullets: [
                    '<b>થીસિસ — લોંગ ચેઇન બીમર બ્રેકિંગ સિસ્ટમ:</b> સખત માઇલ્ડ સ્ટીલને બદલે કાસ્ટ આયર્ન વાપરવાથી દરેક બ્રેકિંગે તાપમાનનો વધારો 1.39 °C ઘટે છે તે દર્શાવ્યું, જેથી ગરમી-સંવેદનશીલ કપાસની સુરક્ષા વધી.',
                    '<b>પ્રોજેક્ટ — આઇસક્રીમ કપ પેકેજિંગ મશીન:</b> યાંત્રિક ખોટી ગોઠવણીઓ શોધીને ઉત્પાદન <b>9,600 → 11,200 કપ/કલાક</b> સુધી પાછું લાવ્યો, લગભગ ડિઝાઇન ક્ષમતા સુધી.'] }
            ],
            projects: [
                { tag: 'ઓપન-સોર્સ સૉફ્ટવેર', text: 'આયન સ્રોતો, થ્રસ્ટર્સ અને ફ્યુઝન NBI માટે આયન-બીમ એક્સટ્રેક્શન અને મોન્ટે કાર્લો કોલિઝન ભૌતિકશાસ્ત્ર — સ્પટર ઇરોઝન, ગ્રિડ આયુષ્યની આગાહી અને રિયલ-ટાઇમ GUI સાથે.' },
                { name: 'AEgIS ડિજિટલ ટ્વિન', tag: 'CERN · પ્રતિદ્રવ્ય', text: 'પેનિંગ–માલ્મબર્ગ ટ્રેપના વર્તનની આગાહી અને એન્ટિપ્રોટોન બંધનના ઑપ્ટિમાઇઝેશન માટે મૂળભૂત ભૌતિકશાસ્ત્ર અને મશીન લર્નિંગને જોડતાં રિડ્યુસ્ડ-ઑર્ડર મોડેલ.' },
                { name: 'રિંગ-કસ્પ આયન સ્રોત', tag: 'Ph.D. · અવકાશ પ્રોપલ્શન અને ફ્યુઝન', text: '1–2 keV / 100 mA સુધીના Ar⁺ બીમ અને 100% સુધી સ્પેસ-ચાર્જ ન્યુટ્રલાઇઝેશન ધરાવતો મલ્ટિકસ્પ સ્રોત ડિઝાઇન કર્યો, બનાવ્યો અને લાક્ષણિકૃત કર્યો.' },
                { name: '10 kW ફેરાડે કપ', tag: 'M.Tech · બીમ ડાયગ્નોસ્ટિક્સ', text: '20–30 mA બીમ માટે પાણીથી ઠંડો થતો ફેરાડે કપ — જૂની 1 kW સિસ્ટમ કરતાં 20 ગણો સક્ષમ, SIMION અને LORENTZ વડે ઑપ્ટિમાઇઝ કરેલા સપ્રેશન સાથે.' }
            ],
            gallery: [
                ['અષ્ટકોણીય રિંગ-કસ્પ આયન સ્રોત', 'મારા Ph.D.નો ORIS સ્રોત, તેની મલ્ટિ-એપર્ચર એક્સટ્રેક્શન ગ્રિડ સાથે.'],
                ['બીમ ચાલુ', 'કાર્યરત સ્રોત ચેમ્બરની અંદર પ્લાઝ્માની ચમક.'],
                ['સ્ક્રીન અને એક્સિલરેશન ગ્રિડ', 'લાઇન-કસ્પ સ્રોતની આયન ઑપ્ટિક્સ, સિરામિક બૉલ વડે અલગ કરેલી.'],
                ['લાઇન-કસ્પ આયન સ્રોત', 'અક્ષીય બંધન ધરાવતા લાઇન-કસ્પ સ્રોતની ડિસ્ચાર્જ ચેમ્બરનો અંદરનો દેખાવ.'],
                ['ફેરાડે કપ એરે', 'રિયલ-ટાઇમ, ઇન-સિટુ આયન-બીમ પ્રોફાઇલ મોનિટરિંગ.'],
                ['હાઇ-પાવર ફેરાડે કપ', '10 kW, 20–30 mA બીમ માટે પાણીથી ઠંડો થતો તાંબાનો કપ.'],
                ['પેરેલલ વાયર એરે', 'આયન-બીમ પ્રોફાઇલ માપવા માટેનો વાયર એરે.'],
                ['મેગ્નેટિક RPA', 'ઓછી ઊર્જાવાળા ચાર્જ-એક્સચેન્જ આયનો માટે મેગ્નેટિક ફિલ્ટર સાથેનું રિટાર્ડિંગ પોટેન્શિયલ એનાલાઇઝર.'],
                ['લેંગમ્યુર પ્રોબ', 'પ્લાઝ્મા ઘનતા માપતો પ્રોબ: 5.5 mm લાંબી, 0.5 mm વ્યાસની ટોચ.'],
                ['ચાર્જ-એક્સચેન્જ પ્રોબ', 'બીમ વિસ્તારમાં ચાર્જ-એક્સચેન્જ આયનો માટેનો પ્રોબ.'],
                ['થ્રસ્ટ સેન્સર', 'ઇલેક્ટ્રિક પ્રોપલ્શન પરીક્ષણોમાં થ્રસ્ટનું માપન.']
            ],
            offer: [
                { title: 'કન્સલ્ટિંગ', text: 'CST Studio, MAD-X અને અન્ય સાધનો વડે આયન સ્રોત અને પાર્ટિકલ ટ્રેપ ડિઝાઇન, બીમ ડાયગ્નોસ્ટિક્સ અને સિમ્યુલેશન આધારિત અભ્યાસ.' },
                { title: 'માર્ગદર્શન', text: 'MS અને Ph.D. ઉમેદવારો માટે માર્ગદર્શન: અરજીની વ્યૂહરચના, કવર લેટર અને CV.' },
                { title: 'વક્તવ્યો અને જનજાગૃતિ', text: 'આયન સ્રોતો, ઇલેક્ટ્રિક પ્રોપલ્શન અને પાર્ટિકલ એક્સિલરેટર પર સેમિનાર, નિષ્ણાત વ્યાખ્યાનો અને શાળાઓમાં વક્તવ્યો.' },
                { title: 'ભરતીમાં સહાય', text: 'મારા વ્યાવસાયિક નેટવર્ક દ્વારા કંપનીઓ અને સંશોધન જૂથોને પ્લાઝ્મા ભૌતિકશાસ્ત્ર, આયન સ્રોતો અને પ્રયોજિત ભૌતિકશાસ્ત્રમાં લાયક પ્રતિભા શોધવામાં મદદ કરું છું.' }
            ],
            skills: [
                { label: 'ભાષાઓ', text: 'અંગ્રેજી (અસ્ખલિત), હિન્દી અને ગુજરાતી (માતૃભાષા), સ્પેનિશ (B2), રશિયન (A1).' },
                { label: 'પ્રોગ્રામિંગ' },
                { label: 'મશીન લર્નિંગ' },
                { label: 'ડેવલપમેન્ટ અને કમ્પ્યુટિંગ' },
                { label: 'પાર્ટિકલ અને ફિલ્ડ સોલ્વર્સ', text: 'CST Studio (Particle Tracking, ES/EM-PIC), OPERA-3D, SIMION, IBISIMU, COMSOL, RF Track, ASTRA, MAD-X, Geant4, G4Beamline, TRAK, BDSIM, <b>PY-BEMCS (ડેવલપર)</b>.' },
                { label: 'CAD / મલ્ટિફિઝિક્સ', text: 'SolidWorks, ANSYS (થર્મલ / સ્ટ્રક્ચરલ / CFD).' },
                { label: 'પ્રાયોગિક / પ્રયોગશાળા', text: 'હાઇ-વોલ્ટેજ (HV) સિસ્ટમ્સ, વેક્યુમ સિસ્ટમ્સ, DAQ હાર્ડવેર, કંટ્રોલ સિસ્ટમ્સ.' },
                { label: 'જનજાગૃતિ', text: 'પ્રતિદ્રવ્ય ભૌતિકશાસ્ત્રની જનજાગૃતિ માટે ઇન્ટરેક્ટિવ વેબ ગેમ્સ બનાવી; સુપરકન્ડક્ટિવિટી / મેગ્નેટિક લેવિટેશનનાં જીવંત પ્રદર્શનો કર્યાં.' },
                { label: 'અધ્યાપન અને અન્ય', text: 'સહ-પ્રશિક્ષક — <i>Introduction to Beam Diagnostics</i>; HPC કમ્પ્યુટિંગ ટ્યુટોરિયલ્સ; ડૉક્ટરલ વિદ્યાર્થીઓનું માર્ગદર્શન.' }
            ],
            hobbies: [['શતરંજ', 'શતરંજ ખેલાડી: ELO 1725, chess.com પર 1900'], ['વાદ્યો', 'કીબોર્ડ, હાર્મોનિયમ, મેલોડિકા, કીટાર અને ગિટાર'], ['પ્રવાસ', '12થી વધુ દેશોનો પ્રવાસ કર્યો છે, અને સફર ચાલુ છે...']],
            talkTypes: { 'Invited talk': 'આમંત્રિત વક્તવ્ય', 'Contributed talk': 'પ્રસ્તુત વક્તવ્ય' },
            videos: ['આયન ઑપ્ટિક્સ મોડેલિંગ અને PY-BEMCS', 'બીમ ડાયગ્નોસ્ટિક્સ વ્યાખ્યાન, યુનિવર્સિટી ઑફ લિવરપૂલ', 'આયન થ્રસ્ટર્સ માટે ઇન્ટરેક્ટિવ મોન્ટે કાર્લો કોલિઝન સિમ્યુલેટર',
                'આયન થ્રસ્ટર ગ્રિડનો ઘસારો (ઇરોઝન)', 'આયન થ્રસ્ટરનું 3D PIC સિમ્યુલેશન', 'રિટાર્ડિંગ પોટેન્શિયલ એનર્જી એનાલાઇઝરનું PIC સિમ્યુલેશન',
                'સુપરકન્ડક્ટિંગ મેગ્નેટનું રિયલ-ટાઇમ ફિલ્ડ વિશ્લેષણ', 'પેનિંગ ટ્રેપમાં આયન અને ઇલેક્ટ્રોનનું 3D PIC', 'એન્ટિપ્રોટોનનું બેલિસ્ટિક ટ્રાન્સફર', 'G4beamlineમાં એન્ટિપ્રોટોન વિનાશ (annihilation)']
        }
    };

    const P = window.PROFILE;
    const L = C[LANG];
    if (P && L) {
        const set = (obj, src, keys) => keys.forEach(k => { if (src && src[k] !== undefined) obj[k] = src[k]; });
        set(P, L, ['title', 'summary', 'expertise']);
        if (P.about && L.about) P.about.text = L.about;
        (P.experience || []).forEach((e, i) => set(e, L.experience[i], ['role', 'org', 'bullets']));
        (P.education || []).forEach((e, i) => set(e, L.education[i], ['role', 'org', 'bullets']));
        (P.projects || []).forEach((p, i) => set(p, L.projects[i], ['name', 'tag', 'text']));
        (P.gallery || []).forEach((g, i) => { if (L.gallery[i]) { g.title = L.gallery[i][0]; g.text = L.gallery[i][1]; } });
        (P.offer || []).forEach((o, i) => { o.key = o.key || o.title; set(o, L.offer[i], ['title', 'text']); });
        (P.skills || []).forEach((s, i) => set(s, L.skills[i], ['label', 'text']));
        (P.hobbies || []).forEach((h, i) => { if (L.hobbies[i]) { h.name = L.hobbies[i][0]; h.detail = L.hobbies[i][1]; } });
        (P.talks || []).forEach(t => { t.typeLabel = L.talkTypes[t.type] || t.type; });
        (P.videos || []).forEach((v, i) => { if (L.videos[i]) v.title = L.videos[i]; });
    }

    // ---------------------------------------------------------------- static page text
    const dict = UI[LANG];
    if (dict) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(n => {
            const raw = n.nodeValue, key = raw.trim();
            if (key && typeof dict[key] === 'string') n.nodeValue = raw.replace(key, dict[key]);
        });
    }

    // ---------------------------------------------------------------- language switch (top bar)
    const cta = document.getElementById('ln-cta');
    if (cta) {
        const sel = document.createElement('select');
        sel.id = 'lang-pick'; sel.setAttribute('aria-label', T('Language'));
        [['en', 'EN'], ['es', 'ES'], ['ru', 'RU'], ['fr', 'FR'], ['gu', 'GU']].forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; sel.appendChild(o); });
        sel.value = LANG;
        sel.addEventListener('change', () => {
            try { localStorage.setItem('cv-lang', sel.value); } catch (e) {}
            const u = new URL(location.href); u.searchParams.set('lang', sel.value); location.href = u.toString();
        });
        cta.parentNode.insertBefore(sel, cta);
    }
})();
