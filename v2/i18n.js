/* =====================================================================
   Languages for the v2 CV: English (default), Español, Русский.
   - window.LANG : current language code
   - window.T(s) : translate an English UI string (falls back to English)
   - Content (profile.js) is overridden per language below; paper titles,
     names and organisations stay in their original language.
   Choose with ?lang=es / ?lang=ru or the switch in the top bar (remembered).
   NOTE: if you edit the English text in profile.js, update the matching
   entry here too, or that item will stay in its previous translation.
   ===================================================================== */
(function () {
    const SUPPORTED = ['en', 'es', 'ru'];
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
            'More on YouTube': 'Más en YouTube', 'In print.': 'Publicado.', 'Talks': 'Charlas', 'On stage.': 'En el escenario.',
            'What I offer': 'Qué ofrezco', 'How I can help.': 'Cómo puedo ayudar.', 'Skills': 'Habilidades', 'Instrument rack.': 'Mi caja de herramientas.',
            'Codes, tools and hardware I work with.': 'Códigos, herramientas y equipos con los que trabajo.', 'Off-beam': 'Mis intereses',
            'Beyond the lab.': 'Más allá del laboratorio.', "Let's talk beams.": 'Hablemos de física de aceleradores.', 'Classic site': 'Sitio clásico', 'All themes': 'Todos los temas',
            'Download CV': 'Descargar CV', 'See my work': 'Ver mi trabajo', 'Experience': 'Experiencia', 'Education': 'Formación', 'Now': 'Actual',
            'More': 'Más', 'Less': 'Menos', 'View code': 'Ver código', 'Open project': 'Abrir proyecto', 'Simulation': 'Simulación', 'Tap any video to watch.': 'Toca un vídeo para verlo.',
            'Hello, visitor from': 'Hola, visitante de', 'Lecture': 'Clase', 'Simulation': 'Simulación', 'Journal cover': 'Portada de revista', 'Featured': 'Destacado',
            'All rights reserved.': 'Todos los derechos reservados.',
            'pubsub': span => `Artículos en revistas, actas de congresos y mi tesis doctoral${span ? `, ${span}` : ''}.`,
            // extras.js
            'Add to contacts': 'Añadir a contactos', 'localtime': (t, city) => `Son las ${t} en ${city} · Suelo responder en un día.`,
            'How it connects.': 'Cómo se conecta.', 'Hover or tap a skill to see where I’ve used it.': 'Pasa el cursor o toca una habilidad para ver dónde la he usado.',
            'Beam on target.': 'Haz en el blanco.', 'Language': 'Idioma',
            'Basilisk · LIA & e-injector': 'Basilisk · LIA e inyector', 'AEgIS digital twin': 'Gemelo digital de AEgIS', 'Ring-cusp ion source': 'Fuente de cúspide anular',
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
            'More on YouTube': 'Больше на YouTube', 'In print.': 'Опубликованные материалы.', 'Talks': 'Доклады', 'On stage.': 'Выступления.',
            'What I offer': 'Чем могу помочь', 'How I can help.': 'Как я могу помочь.', 'Skills': 'Навыки', 'Instrument rack.': 'Мой инструментарий.',
            'Codes, tools and hardware I work with.': 'Программы, инструменты и оборудование, с которыми я работаю.', 'Off-beam': 'Мои интересы',
            'Beyond the lab.': 'Увлечения вне работы.', "Let's talk beams.": 'Обсудим пучки частиц.', 'Classic site': 'Классический сайт', 'All themes': 'Все темы',
            'Download CV': 'Скачать резюме', 'See my work': 'Мои работы', 'Experience': 'Опыт работы', 'Education': 'Образование', 'Now': 'Сейчас',
            'More': 'Ещё', 'Less': 'Свернуть', 'View code': 'Код', 'Open project': 'Открыть проект', 'Simulation': 'Симуляция', 'Tap any video to watch.': 'Нажмите на видео, чтобы посмотреть.',
            'Hello, visitor from': 'Здравствуйте! Ваша страна:', 'Lecture': 'Лекция', 'Simulation': 'Симуляция', 'Journal cover': 'Обложка журнала', 'Featured': 'Избранное',
            'All rights reserved.': 'Все права защищены.',
            'pubsub': span => `Статьи в журналах, труды конференций и моя диссертация${span ? `, ${span}` : ''}.`,
            'Add to contacts': 'Добавить в контакты', 'localtime': (t, city) => `В городе ${city} сейчас ${t} · Обычно отвечаю в течение дня.`,
            'How it connects.': 'Как всё связано.', 'Hover or tap a skill to see where I’ve used it.': 'Наведите курсор или нажмите на навык, чтобы увидеть, где я его применял.',
            'Beam on target.': 'Пучок на мишени.', 'Language': 'Язык',
            'Basilisk · LIA & e-injector': 'Basilisk · ЛИУ и инжектор', 'AEgIS digital twin': 'Цифровой двойник AEgIS', 'Ring-cusp ion source': 'Источник с кольцевым каспом',
            '10 kW Faraday cup': 'Цилиндр Фарадея 10 кВт', 'HV & vacuum': 'Высокое напряжение и вакуум', 'Machine learning': 'Машинное обучение', 'Monte Carlo / PIC': 'Монте-Карло / PIC'
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
                    'Diseño de un <b>acelerador de inducción lineal</b> para aplicaciones de corte de roca.',
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
                    'Desarrollé una hoja de cálculo automatizada de seguimiento de dosis para vigilar tendencias e identificar al personal cercano a los umbrales, lo que permitió intervenciones de seguridad preventivas.'] }
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
                { title: 'Charlas y divulgación', text: 'Seminarios, conferencias especializadas y charlas en colegios sobre fuentes de iones, propulsión eléctrica y aceleradores de partículas.' }
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
                    'Проектирование <b>линейного индукционного ускорителя</b> для разрушения горных пород.',
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
                    'Создал автоматизированную таблицу учёта доз для отслеживания тенденций и выявления сотрудников, приближающихся к пороговым значениям, что позволило заранее принимать меры безопасности.'] }
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
                { title: 'Лекции и популяризация', text: 'Семинары, экспертные лекции и выступления в школах об ионных источниках, электрических двигателях и ускорителях частиц.' }
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
        [['en', 'EN'], ['es', 'ES'], ['ru', 'RU']].forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; sel.appendChild(o); });
        sel.value = LANG;
        sel.addEventListener('change', () => {
            try { localStorage.setItem('cv-lang', sel.value); } catch (e) {}
            const u = new URL(location.href); u.searchParams.set('lang', sel.value); location.href = u.toString();
        });
        cta.parentNode.insertBefore(sel, cta);
    }
})();
