/* =====================================================================
   Hardware in 3D: languages (same choice as the CV: ?lang= or the remembered 'cv-lang').
   - window.CT(s, ...args) : UI string (falls back to English)
   - window.CAD_I18N       : per-model names / blurbs, subsystems, story beats (by index), Penning stages
   Part names and per-part notes stay in English (technical labels).
   ===================================================================== */
(function () {
    const SUPPORTED = ['en', 'es', 'ru', 'fr', 'gu'];
    const qs = new URLSearchParams(location.search).get('lang');
    let saved = null; try { saved = localStorage.getItem('cv-lang'); } catch (e) { /* private mode */ }
    const LANG = SUPPORTED.includes(qs) ? qs : (SUPPORTED.includes(saved) ? saved : 'en');
    if (qs && SUPPORTED.includes(qs)) { try { localStorage.setItem('cv-lang', qs); } catch (e) {} }
    document.documentElement.lang = LANG;
    const NAME = { en: 'Bharat Singh Rawat', es: 'Bharat Singh Rawat', fr: 'Bharat Singh Rawat', ru: 'Бхарат Сингх Рават', gu: 'ભારત સિંહ રાવત' };

    const EN = {
        labPhoto: n => `Lab photo of the ${n}`,
        loadingPct: p => `Loading model · ${p}%`,
        pageTitle: n => `Hardware in 3D — ${n}`
    };

    const UI = {
        es: {
            pageTitle: n => `Equipos en 3D — ${n}`, labPhoto: n => `Foto del laboratorio: ${n}`, loadingPct: p => `Cargando el modelo · ${p}%`,
            'All rights reserved.': 'Todos los derechos reservados.',
            'Heat': 'Calor', 'Heat map': 'Mapa de calor', 'Cool': 'Frío', 'Hot': 'Caliente', 'Switch the water off and watch the copper warm up': 'Apaga el agua y verás cómo se calienta el cobre',
            'Hardware in 3D': 'Equipos en 3D', 'Contact': 'Contacto', 'Hardware': 'Equipos', 'Take it apart.': 'Desmóntalo.',
            'Instruments I designed, straight from the CAD. Scroll, and each one comes apart piece by piece. Drag to turn it, tap any part to see what it does.':
                'Instrumentos que diseñé, directamente del CAD. Desplázate y cada uno se desmonta pieza a pieza. Arrastra para girarlo y toca cualquier pieza para ver qué hace.',
            'Scroll': 'Desplázate', 'Exploded view': 'Vista despiezada', 'Tap a label to look closer.': 'Toca una etiqueta para verla de cerca.',
            'Tap a system to look closer.': 'Toca un sistema para verlo de cerca.', 'Tap any part to look closer.': 'Toca cualquier pieza para verla de cerca.',
            'Loading model': 'Cargando el modelo', 'Could not load the model.': 'No se pudo cargar el modelo.', '‹ All systems': '‹ Todos los sistemas',
            '3D model': 'Modelo 3D', 'Lab photo': 'Foto del laboratorio',
            'Magnets 2500 G at the surface · dashes flow N → S': 'Imanes de 2500 G en la superficie · los trazos van de N a S',
            'Water': 'Agua', 'Cold in': 'Entra fría', 'Warm out': 'Sale caliente', 'Beam heat on the cup floor, carried off by the water': 'El calor del haz en el fondo de la copa, que se lleva el agua',
            'See it on your desk.': 'Míralo en tu mesa.',
            "Scan with your phone's camera to open the model in AR at real size. It takes itself apart and goes back together.": 'Escanéalo con la cámara del móvil para abrir el modelo en RA a tamaño real. Se desmonta solo y se vuelve a montar.',
            'Quantity': 'Cantidad', 'Envelope': 'Dimensiones', 'Show only this': 'Mostrar solo esto', 'Subsystem': 'Subsistema', 'Parts': 'Piezas', 'Part types': 'Tipos de pieza',
            'Scroll to explore · drag to turn': 'Desliza para explorar · arrastra para girar',
            'Beam': 'Haz', 'Drive': 'Mover', 'Field': 'Campo', 'Photo': 'Foto', 'AR': 'RA', 'Cut': 'Corte', 'Reset': 'Restablecer',
            'Beam on': 'Encender el haz', 'Park the cup / push it into the beam': 'Retirar la copa / meterla en el haz', 'Cooling water': 'Agua de refrigeración',
            'Magnetic field lines': 'Líneas de campo magnético', 'Compare with the lab photo': 'Comparar con la foto del laboratorio', 'View in AR': 'Ver en RA',
            'Cut-away': 'Vista en corte', 'Reset view': 'Restablecer la vista', 'In the box.': 'En la caja.',
            'Models are exported from the original CAD assemblies.': 'Los modelos se exportan de los ensamblajes CAD originales.', 'Ask me about the designs': 'Pregúntame por los diseños',
            'Parked: the beam goes past': 'Retirada: el haz pasa de largo', 'In the beam: measuring': 'En el haz: midiendo',
            'Close': 'Cerrar', 'Jump to a model': 'Ir a un modelo', 'Parts list for': 'Lista de piezas de', '3D models': 'Modelos 3D',
            'Compare the 3D model with the lab photo': 'Comparar el modelo 3D con la foto del laboratorio',
            'Interactive 3D model. Scroll to take it apart, drag or use the arrow keys to turn it, click a part for details.': 'Modelo 3D interactivo. Desplázate para desmontarlo, arrástralo o usa las flechas para girarlo y haz clic en una pieza para ver detalles.',
            'Steel': 'Acero', 'Brass': 'Latón', 'Copper': 'Cobre', 'Aluminium': 'Aluminio', 'Ceramic': 'Cerámica', 'PTFE (Teflon)': 'PTFE (teflón)', 'Permanent magnet': 'Imán permanente',
            'Alumina ceramic': 'Cerámica de alúmina', 'Stainless steel': 'Acero inoxidable', 'ETP copper': 'Cobre ETP', 'Copper tube, brazed': 'Tubo de cobre soldado',
            'Alumina (Al₂O₃)': 'Alúmina (Al₂O₃)', 'Stainless steel, edge-welded': 'Acero inoxidable, soldado por los bordes', 'Anodised aluminium': 'Aluminio anodizado',
            'Push-in fittings': 'Racores rápidos', 'Gold': 'Oro', 'Magnet': 'Imán'
        },
        fr: {
            pageTitle: n => `Matériel en 3D — ${n}`, labPhoto: n => `Photo du labo : ${n}`, loadingPct: p => `Chargement du modèle · ${p} %`,
            'All rights reserved.': 'Tous droits réservés.',
            'Heat': 'Chaleur', 'Heat map': 'Carte thermique', 'Cool': 'Froid', 'Hot': 'Chaud', 'Switch the water off and watch the copper warm up': 'Coupez l’eau et regardez le cuivre chauffer',
            'Hardware in 3D': 'Matériel en 3D', 'Contact': 'Contact', 'Hardware': 'Matériel', 'Take it apart.': 'Démontez-le.',
            'Instruments I designed, straight from the CAD. Scroll, and each one comes apart piece by piece. Drag to turn it, tap any part to see what it does.':
                'Des instruments que j’ai conçus, tout droit sortis de la CAO. Faites défiler : chacun se démonte pièce par pièce. Faites-le tourner en le glissant, touchez une pièce pour voir à quoi elle sert.',
            'Scroll': 'Défiler', 'Exploded view': 'Vue éclatée', 'Tap a label to look closer.': 'Touchez une étiquette pour regarder de plus près.',
            'Tap a system to look closer.': 'Touchez un système pour regarder de plus près.', 'Tap any part to look closer.': 'Touchez une pièce pour regarder de plus près.',
            'Loading model': 'Chargement du modèle', 'Could not load the model.': 'Impossible de charger le modèle.', '‹ All systems': '‹ Tous les systèmes',
            '3D model': 'Modèle 3D', 'Lab photo': 'Photo du labo',
            'Magnets 2500 G at the surface · dashes flow N → S': 'Aimants à 2500 G en surface · les tirets vont du N au S',
            'Water': 'Eau', 'Cold in': 'Entrée froide', 'Warm out': 'Sortie chaude', 'Beam heat on the cup floor, carried off by the water': 'La chaleur du faisceau au fond de la cage, emportée par l’eau',
            'See it on your desk.': 'Posez-le sur votre bureau.',
            "Scan with your phone's camera to open the model in AR at real size. It takes itself apart and goes back together.": 'Scannez avec l’appareil photo de votre téléphone pour ouvrir le modèle en RA, en taille réelle. Il se démonte tout seul, puis se remonte.',
            'Quantity': 'Quantité', 'Envelope': 'Encombrement', 'Show only this': 'Afficher seulement', 'Subsystem': 'Sous-système', 'Parts': 'Pièces', 'Part types': 'Types de pièces',
            'Scroll to explore · drag to turn': 'Faites défiler pour explorer · glissez pour tourner',
            'Beam': 'Faisceau', 'Drive': 'Vérin', 'Field': 'Champ', 'Photo': 'Photo', 'AR': 'RA', 'Cut': 'Coupe', 'Reset': 'Réinitialiser',
            'Beam on': 'Allumer le faisceau', 'Park the cup / push it into the beam': 'Garer la cage / la pousser dans le faisceau', 'Cooling water': 'Eau de refroidissement',
            'Magnetic field lines': 'Lignes de champ magnétique', 'Compare with the lab photo': 'Comparer avec la photo du labo', 'View in AR': 'Voir en RA',
            'Cut-away': 'Vue en coupe', 'Reset view': 'Réinitialiser la vue', 'In the box.': 'Dans la boîte.',
            'Models are exported from the original CAD assemblies.': 'Les modèles sont exportés des assemblages CAO d’origine.', 'Ask me about the designs': 'Posez-moi vos questions sur les conceptions',
            'Parked: the beam goes past': 'Garée : le faisceau passe', 'In the beam: measuring': 'Dans le faisceau : mesure',
            'Close': 'Fermer', 'Jump to a model': 'Aller à un modèle', 'Parts list for': 'Liste des pièces de', '3D models': 'Modèles 3D',
            'Compare the 3D model with the lab photo': 'Comparer le modèle 3D avec la photo du labo',
            'Interactive 3D model. Scroll to take it apart, drag or use the arrow keys to turn it, click a part for details.': 'Modèle 3D interactif. Faites défiler pour le démonter, glissez ou utilisez les flèches pour le tourner, cliquez sur une pièce pour les détails.',
            'Steel': 'Acier', 'Brass': 'Laiton', 'Copper': 'Cuivre', 'Aluminium': 'Aluminium', 'Ceramic': 'Céramique', 'PTFE (Teflon)': 'PTFE (téflon)', 'Permanent magnet': 'Aimant permanent',
            'Alumina ceramic': 'Céramique d’alumine', 'Stainless steel': 'Acier inoxydable', 'ETP copper': 'Cuivre ETP', 'Copper tube, brazed': 'Tube de cuivre brasé',
            'Alumina (Al₂O₃)': 'Alumine (Al₂O₃)', 'Stainless steel, edge-welded': 'Acier inoxydable, soudé', 'Anodised aluminium': 'Aluminium anodisé',
            'Push-in fittings': 'Raccords instantanés', 'Gold': 'Or', 'Magnet': 'Aimant'
        },
        ru: {
            pageTitle: n => `Оборудование в 3D — ${n}`, labPhoto: n => `Фото из лаборатории: ${n}`, loadingPct: p => `Загрузка модели · ${p}%`,
            'All rights reserved.': 'Все права защищены.',
            'Heat': 'Нагрев', 'Heat map': 'Тепловая карта', 'Cool': 'Холодно', 'Hot': 'Горячо', 'Switch the water off and watch the copper warm up': 'Выключите воду — и медь начнёт нагреваться',
            'Hardware in 3D': 'Оборудование в 3D', 'Contact': 'Контакты', 'Hardware': 'Оборудование', 'Take it apart.': 'Разберите его.',
            'Instruments I designed, straight from the CAD. Scroll, and each one comes apart piece by piece. Drag to turn it, tap any part to see what it does.':
                'Приборы, которые я спроектировал, прямо из CAD. Прокрутите — и каждый разберётся по деталям. Потяните, чтобы повернуть, нажмите на деталь, чтобы узнать, что она делает.',
            'Scroll': 'Прокрутите', 'Exploded view': 'Вид в разборе', 'Tap a label to look closer.': 'Нажмите на подпись, чтобы рассмотреть ближе.',
            'Tap a system to look closer.': 'Нажмите на систему, чтобы рассмотреть ближе.', 'Tap any part to look closer.': 'Нажмите на любую деталь, чтобы рассмотреть ближе.',
            'Loading model': 'Загрузка модели', 'Could not load the model.': 'Не удалось загрузить модель.', '‹ All systems': '‹ Все системы',
            '3D model': '3D-модель', 'Lab photo': 'Фото из лаборатории',
            'Magnets 2500 G at the surface · dashes flow N → S': 'Магниты 2500 Гс на поверхности · штрихи идут от N к S',
            'Water': 'Вода', 'Cold in': 'Холодная на входе', 'Warm out': 'Тёплая на выходе', 'Beam heat on the cup floor, carried off by the water': 'Тепло пучка на дне цилиндра уносит вода',
            'See it on your desk.': 'Поставьте её на стол.',
            "Scan with your phone's camera to open the model in AR at real size. It takes itself apart and goes back together.": 'Отсканируйте камерой телефона, чтобы открыть модель в AR в натуральную величину. Она сама разбирается и собирается обратно.',
            'Quantity': 'Количество', 'Envelope': 'Габариты', 'Show only this': 'Показать только это', 'Subsystem': 'Подсистема', 'Parts': 'Детали', 'Part types': 'Типы деталей',
            'Scroll to explore · drag to turn': 'Прокрутите, чтобы исследовать · потяните, чтобы повернуть',
            'Beam': 'Пучок', 'Drive': 'Привод', 'Field': 'Поле', 'Photo': 'Фото', 'AR': 'AR', 'Cut': 'Разрез', 'Reset': 'Сброс',
            'Beam on': 'Включить пучок', 'Park the cup / push it into the beam': 'Отвести цилиндр / ввести его в пучок', 'Cooling water': 'Охлаждающая вода',
            'Magnetic field lines': 'Линии магнитного поля', 'Compare with the lab photo': 'Сравнить с фото из лаборатории', 'View in AR': 'Смотреть в AR',
            'Cut-away': 'Разрез', 'Reset view': 'Сбросить вид', 'In the box.': 'В коробке.',
            'Models are exported from the original CAD assemblies.': 'Модели экспортированы из исходных CAD-сборок.', 'Ask me about the designs': 'Спросите меня о конструкциях',
            'Parked: the beam goes past': 'Отведён: пучок проходит мимо', 'In the beam: measuring': 'В пучке: измерение',
            'Close': 'Закрыть', 'Jump to a model': 'Перейти к модели', 'Parts list for': 'Список деталей для', '3D models': '3D-модели',
            'Compare the 3D model with the lab photo': 'Сравнить 3D-модель с фото из лаборатории',
            'Interactive 3D model. Scroll to take it apart, drag or use the arrow keys to turn it, click a part for details.': 'Интерактивная 3D-модель. Прокрутите, чтобы разобрать её, потяните или используйте стрелки, чтобы повернуть, нажмите на деталь, чтобы узнать подробности.',
            'Steel': 'Сталь', 'Brass': 'Латунь', 'Copper': 'Медь', 'Aluminium': 'Алюминий', 'Ceramic': 'Керамика', 'PTFE (Teflon)': 'ПТФЭ (тефлон)', 'Permanent magnet': 'Постоянный магнит',
            'Alumina ceramic': 'Алюмооксидная керамика', 'Stainless steel': 'Нержавеющая сталь', 'ETP copper': 'Медь ETP', 'Copper tube, brazed': 'Медная трубка, пайка',
            'Alumina (Al₂O₃)': 'Оксид алюминия (Al₂O₃)', 'Stainless steel, edge-welded': 'Нержавеющая сталь, сварной', 'Anodised aluminium': 'Анодированный алюминий',
            'Push-in fittings': 'Быстроразъёмные фитинги', 'Gold': 'Золото', 'Magnet': 'Магнит'
        },
        gu: {
            pageTitle: n => `3Dમાં હાર્ડવેર — ${n}`, labPhoto: n => `લેબનો ફોટો: ${n}`, loadingPct: p => `મોડેલ લોડ થઈ રહ્યું છે · ${p}%`,
            'All rights reserved.': 'સર્વહક્ક સ્વાધીન.',
            'Heat': 'ગરમી', 'Heat map': 'હીટ મૅપ', 'Cool': 'ઠંડું', 'Hot': 'ગરમ', 'Switch the water off and watch the copper warm up': 'પાણી બંધ કરો અને તાંબું ગરમ થતું જુઓ',
            'Hardware in 3D': '3Dમાં હાર્ડવેર', 'Contact': 'સંપર્ક', 'Hardware': 'હાર્ડવેર', 'Take it apart.': 'તેને ખોલીને જુઓ.',
            'Instruments I designed, straight from the CAD. Scroll, and each one comes apart piece by piece. Drag to turn it, tap any part to see what it does.':
                'મેં ડિઝાઇન કરેલાં સાધનો, સીધાં CADમાંથી. સ્ક્રોલ કરો, અને દરેક સાધન એક-એક ભાગમાં ખૂલે છે. ફેરવવા માટે ખેંચો, કોઈ પણ ભાગ શું કરે છે તે જોવા તેના પર ટૅપ કરો.',
            'Scroll': 'સ્ક્રોલ કરો', 'Exploded view': 'ખૂલેલું દૃશ્ય', 'Tap a label to look closer.': 'નજીકથી જોવા માટે લેબલ પર ટૅપ કરો.',
            'Tap a system to look closer.': 'નજીકથી જોવા માટે સિસ્ટમ પર ટૅપ કરો.', 'Tap any part to look closer.': 'નજીકથી જોવા માટે કોઈ પણ ભાગ પર ટૅપ કરો.',
            'Loading model': 'મોડેલ લોડ થઈ રહ્યું છે', 'Could not load the model.': 'મોડેલ લોડ થઈ શક્યું નહીં.', '‹ All systems': '‹ બધી સિસ્ટમ',
            '3D model': '3D મોડેલ', 'Lab photo': 'લેબનો ફોટો',
            'Magnets 2500 G at the surface · dashes flow N → S': 'સપાટી પર 2500 G ચુંબકો · રેખાઓ N થી S તરફ વહે છે',
            'Water': 'પાણી', 'Cold in': 'ઠંડું અંદર', 'Warm out': 'ગરમ બહાર', 'Beam heat on the cup floor, carried off by the water': 'કપના તળિયે બીમની ગરમી, જે પાણી લઈ જાય છે',
            'See it on your desk.': 'તમારા ટેબલ પર જુઓ.',
            "Scan with your phone's camera to open the model in AR at real size. It takes itself apart and goes back together.": 'મોડેલને સાચા કદમાં AR માં ખોલવા ફોનના કૅમેરાથી સ્કૅન કરો. તે જાતે ખૂલે છે અને ફરી જોડાઈ જાય છે.',
            'Quantity': 'સંખ્યા', 'Envelope': 'માપ', 'Show only this': 'ફક્ત આ બતાવો', 'Subsystem': 'પેટા-સિસ્ટમ', 'Parts': 'ભાગો', 'Part types': 'ભાગના પ્રકાર',
            'Scroll to explore · drag to turn': 'જોવા સ્ક્રોલ કરો · ફેરવવા ખેંચો',
            'Beam': 'બીમ', 'Drive': 'ડ્રાઇવ', 'Field': 'ક્ષેત્ર', 'Photo': 'ફોટો', 'AR': 'AR', 'Cut': 'કટ', 'Reset': 'રીસેટ',
            'Beam on': 'બીમ ચાલુ', 'Park the cup / push it into the beam': 'કપ બહાર રાખો / બીમમાં ધકેલો', 'Cooling water': 'ઠંડક માટે પાણી',
            'Magnetic field lines': 'ચુંબકીય ક્ષેત્ર રેખાઓ', 'Compare with the lab photo': 'લેબના ફોટા સાથે સરખાવો', 'View in AR': 'AR માં જુઓ',
            'Cut-away': 'કટ-અવે', 'Reset view': 'દૃશ્ય રીસેટ કરો', 'In the box.': 'બૉક્સમાં શું છે.',
            'Models are exported from the original CAD assemblies.': 'મોડેલ મૂળ CAD એસેમ્બલીમાંથી એક્સપોર્ટ કરેલાં છે.', 'Ask me about the designs': 'ડિઝાઇન વિશે મને પૂછો',
            'Parked: the beam goes past': 'બહાર: બીમ પસાર થાય છે', 'In the beam: measuring': 'બીમમાં: માપન ચાલુ',
            'Close': 'બંધ કરો', 'Jump to a model': 'મોડેલ પર જાઓ', 'Parts list for': 'ભાગોની યાદી', '3D models': '3D મોડેલ',
            'Compare the 3D model with the lab photo': '3D મોડેલને લેબના ફોટા સાથે સરખાવો',
            'Interactive 3D model. Scroll to take it apart, drag or use the arrow keys to turn it, click a part for details.': 'ઇન્ટરેક્ટિવ 3D મોડેલ. તેને ખોલવા સ્ક્રોલ કરો, ફેરવવા ખેંચો અથવા એરો કી વાપરો, વિગતો માટે કોઈ ભાગ પર ક્લિક કરો.',
            'Steel': 'સ્ટીલ', 'Brass': 'પિત્તળ', 'Copper': 'તાંબું', 'Aluminium': 'ઍલ્યુમિનિયમ', 'Ceramic': 'સિરામિક', 'PTFE (Teflon)': 'PTFE (ટેફલોન)', 'Permanent magnet': 'કાયમી ચુંબક',
            'Alumina ceramic': 'એલ્યુમિના સિરામિક', 'Stainless steel': 'સ્ટેનલેસ સ્ટીલ', 'ETP copper': 'ETP તાંબું', 'Copper tube, brazed': 'બ્રેઝ કરેલી તાંબાની ટ્યુબ',
            'Alumina (Al₂O₃)': 'એલ્યુમિના (Al₂O₃)', 'Stainless steel, edge-welded': 'સ્ટેનલેસ સ્ટીલ, એજ-વેલ્ડેડ', 'Anodised aluminium': 'ઍનોડાઇઝ્ડ ઍલ્યુમિનિયમ',
            'Push-in fittings': 'પુશ-ઇન ફિટિંગ', 'Gold': 'સોનું', 'Magnet': 'ચુંબક'
        }
    };

    // per model: short tab name, name, blurb; subsystems by English label; story beats [title, text] in the order of STORY in cad.js
    const DATA = {
        es: {
            models: {
                'oris': ['Fuente de iones', 'Fuente de iones octogonal de cúspide anular', 'ORIS, la fuente de iones de mi doctorado: una descarga de filamento en una cámara octogonal, imanes de cúspide anular y un sistema de extracción de dos rejillas.'],
                'fc-array': ['Copas de Faraday', 'Matriz de copas de Faraday', 'Una fila de copas de Faraday tras electrodos supresor y de tierra, para perfiles del haz de iones en tiempo real.'],
                'hp-cup': ['Copa de 10 kW', 'Copa de Faraday de 10 kW', 'Una copa de Faraday de cobre refrigerada por agua para haces de iones de 20–30 mA, sobre un accionamiento neumático con fuelles que la introduce en el haz. En su boca hay un anillo supresor sobre un aislante cerámico.'],
                'magnetic-rpa': ['RPA magnético', 'RPA magnético', 'Analizador de potencial de frenado con filtro magnético, para iones de intercambio de carga de baja energía.'],
                'penning': ['Trampa de Penning', 'Trampa de Penning de AEgIS', 'Mi modelo en Geant4 / G4beamline de la trampa de antiprotones de AEgIS. Los antiprotones se aniquilan en la pared de la trampa y los centelleadores detectan lo que sale despedido.']
            },
            systems: {
                'Plasma chamber': ['Cámara de plasma', 'Donde se ioniza el gas: la cámara de descarga octogonal entre sus bridas delantera y trasera.'],
                'Ring-cusp magnets': ['Imanes de cúspide anular', 'Imanes permanentes en las paredes y el fondo, sujetos por bridas y tapas. Su campo de cúspide confina los electrones del plasma.'],
                'Filament & feedthroughs': ['Filamento y pasamuros', 'El cátodo de filamento caliente y los pasamuros de vacío que llevan su corriente.'],
                'Extraction grids': ['Rejillas de extracción', 'Las rejillas de pantalla y de aceleración, separadas por un pequeño hueco, que extraen los iones en forma de haz.'],
                'Insulators & hardware': ['Aislantes y tornillería', 'Casquillos de alúmina y metálicos que aíslan las rejillas, y los tornillos que aprietan el conjunto.']
            },
            story: {
                'oris': [
                    ['Primero, los electrones', 'Un filamento caliente emite electrones. Los pasamuros de vacío llevan su corriente a través de la brida trasera.'],
                    ['Encender el plasma', 'Los electrones chocan con el gas de la cámara octogonal y lo ionizan.'],
                    ['Mantenerlo denso', 'Anillos de imanes recubren las paredes. Los electrones giran en espiral a lo largo del campo de cúspide y rebotan, así permanecen más tiempo en el plasma.'],
                    ['Extraer los iones', 'Dos rejillas separadas por un pequeño hueco extraen los iones a través de miles de orificios, en forma de haz.'],
                    ['Aguantar la tensión', 'Unos casquillos de alúmina mantienen cada electrodo a su propio potencial.']
                ],
                'fc-array': [
                    ['Recoger la corriente', 'Once copas de cobre recogen cada una la corriente que les llega. Juntas, leen el perfil del haz.'],
                    ['Ningún electrón escapa', 'Polarizado en negativo, el supresor devuelve los electrones secundarios a las copas, para que cada lectura sea fiel.'],
                    ['Una vista definida', 'El electrodo frontal a tierra protege las copas y fija la zona del haz que ve cada una.'],
                    ['Cada copa por su cuenta', 'Casquillos cerámicos aíslan las copas, así cada corriente se mide por separado.']
                ],
                'hp-cup': [
                    ['Diez kilovatios sobre cobre', 'El haz de iones se detiene en el fondo de una copa de cobre macizo. A plena corriente son unos 10 kW de calor, en un bloque que cabe en una mano.'],
                    ['Los electrones, dentro', 'Los iones que golpean el cobre arrancan electrones secundarios. Un anillo supresor en la boca, polarizado en negativo y aislado de la copa por cerámica, los devuelve, para que la corriente medida sea fiel.'],
                    ['El agua se lleva el calor', 'Un tubo de cobre va soldado alrededor de la copa en cinco vueltas. El agua fría entra por el brazo, rodea la copa y sale caliente.'],
                    ['Colgada de cerámica', 'La copa cuelga de un brazo de acero sobre separadores cerámicos, así su carga solo puede salir por el cable de señal.'],
                    ['Dentro y fuera', 'Un cilindro neumático empuja el brazo a través de dos fuelles soldados por los bordes, que mantienen el vacío. La copa entra en el haz para medir y vuelve a salir para dejarlo pasar.']
                ],
                'magnetic-rpa': [
                    ['Entran los iones', 'Los iones entran por la abertura de la tapa frontal.'],
                    ['Fuera los electrones', 'Imanes a ambos lados crean un campo transversal que desvía los electrones, así solo siguen los iones.'],
                    ['Contar lo que pasa', 'El colector de cobre mide los iones que superan el potencial de frenado.']
                ],
                'penning': [
                    ['Frenar los antiprotones', 'Los antiprotones del decelerador del CERN atraviesan una lámina fina que los frena lo suficiente para atraparlos.'],
                    ['Atrapados en 5 teslas', 'La alta tensión en los electrodos de oro y un campo de 5 teslas retienen los antiprotones en una trampa de Penning–Malmberg.'],
                    ['La trampa de 1 tesla', 'Más adelante, una segunda trampa está en el imán de 1 tesla, con un electrodo de pared giratoria para comprimir la nube.'],
                    ['Llegan los positrones', 'Una fuente de sodio-22 da positrones. Una trampa de gas tampón y un acumulador los reúnen, y una línea los lleva al imán, donde se convierten en positronio.'],
                    ['A 4 kelvin', 'Los imanes superconductores y las trampas están en helio líquido a 4,2 K, dentro de un escudo de nitrógeno líquido a 77 K y de una cámara de vacío aislante.'],
                    ['Aniquilación', 'Cuando un antiprotón se encuentra con la materia, se aniquila en piones, fotones y fragmentos nucleares. Los centelleadores detectan los cargados.'],
                    ['¿Cae la antimateria?', 'El positronio se une a los antiprotones y forma antihidrógeno. Más adelante, un deflectómetro de moiré mide cuánto cae en su camino.']
                ]
            },
            stages: ['Llegando del decelerador', 'Atrapados en la trampa de 5 T', 'Enfriados y comprimidos', 'Llevados a la trampa de 1 T, junto a A0', 'Positrones lanzados contra el blanco', 'Dos láseres excitan el positronio', 'Se forma antihidrógeno', 'El antihidrógeno llega al detector', 'Se liberan los antiprotones restantes']
        },
        fr: {
            models: {
                'oris': ['Source d’ions', 'Source d’ions octogonale à cusps annulaires', 'ORIS, la source d’ions de ma thèse : une décharge à filament dans une chambre octogonale, des aimants à cusps annulaires et une extraction à deux grilles.'],
                'fc-array': ['Cages de Faraday', 'Réseau de cages de Faraday', 'Une rangée de cages de Faraday derrière des électrodes de suppression et de masse, pour des profils de faisceau d’ions en temps réel.'],
                'hp-cup': ['Cage 10 kW', 'Cage de Faraday de 10 kW', 'Une cage de Faraday en cuivre refroidie à l’eau pour des faisceaux d’ions de 20–30 mA, sur un entraînement pneumatique à soufflets qui la pousse dans le faisceau. Un anneau suppresseur sur un isolateur en céramique se trouve à son entrée.'],
                'magnetic-rpa': ['RPA magnétique', 'RPA magnétique', 'Analyseur à potentiel retardateur avec filtre magnétique, pour les ions d’échange de charge de basse énergie.'],
                'penning': ['Piège de Penning', 'Piège de Penning d’AEgIS', 'Mon modèle Geant4 / G4beamline du piège à antiprotons d’AEgIS. Les antiprotons s’annihilent sur la paroi du piège et les scintillateurs captent ce qui en jaillit.']
            },
            systems: {
                'Plasma chamber': ['Chambre à plasma', 'Là où le gaz est ionisé : la chambre de décharge octogonale entre ses brides avant et arrière.'],
                'Ring-cusp magnets': ['Aimants à cusps annulaires', 'Des aimants permanents sur les parois et le fond, tenus par des brides et des capots. Leur champ de cusp confine les électrons du plasma.'],
                'Filament & feedthroughs': ['Filament et passages', 'La cathode à filament chaud et les passages étanches qui amènent son courant.'],
                'Extraction grids': ['Grilles d’extraction', 'Les grilles écran et d’accélération, séparées d’un petit écart, qui extraient les ions en faisceau.'],
                'Insulators & hardware': ['Isolants et visserie', 'Les bagues en alumine et en métal qui isolent les grilles, et les vis qui serrent l’empilement.']
            },
            story: {
                'oris': [
                    ['D’abord, les électrons', 'Un filament chaud émet des électrons. Des passages étanches au vide amènent son courant par la bride arrière.'],
                    ['Allumer le plasma', 'Les électrons heurtent le gaz de la chambre octogonale et l’ionisent.'],
                    ['Le garder dense', 'Des anneaux d’aimants tapissent les parois. Les électrons spiralent le long du champ de cusp et rebondissent : ils restent plus longtemps dans le plasma.'],
                    ['Le faisceau sort', 'Deux grilles, séparées d’un petit écart, extraient les ions par des milliers d’ouvertures, sous forme de faisceau.'],
                    ['Tenir la tension', 'Des bagues en alumine maintiennent chaque électrode à son propre potentiel.']
                ],
                'fc-array': [
                    ['Capter le faisceau', 'Onze cages en cuivre recueillent chacune le courant qui les atteint. Côte à côte, elles lisent le profil du faisceau.'],
                    ['Aucun électron ne s’échappe', 'Polarisé négativement, le suppresseur renvoie les électrons secondaires dans les cages : chaque mesure reste juste.'],
                    ['Un champ de vue défini', 'L’électrode avant, à la masse, protège les cages et fixe la portion du faisceau que voit chacune.'],
                    ['Chaque cage pour soi', 'Des bagues en céramique isolent les cages : chaque courant est mesuré séparément.']
                ],
                'hp-cup': [
                    ['Dix kilowatts sur du cuivre', 'Le faisceau d’ions s’arrête au fond d’une cage en cuivre massif. À plein courant, cela fait environ 10 kW de chaleur, dans un bloc qui tient dans une main.'],
                    ['Garder les électrons', 'Les ions qui frappent le cuivre arrachent des électrons secondaires. Un anneau suppresseur à l’entrée, polarisé négativement et isolé de la cage par une céramique, les renvoie : le courant mesuré reste juste.'],
                    ['L’eau emporte la chaleur', 'Un tube de cuivre est brasé autour de la cage en cinq spires. L’eau froide arrive le long du bras, fait le tour de la cage et repart chaude.'],
                    ['Suspendue sur céramique', 'La cage est suspendue à un bras en acier par des entretoises en céramique : sa charge ne peut partir que par le câble de signal.'],
                    ['Dans le faisceau', 'Un vérin pneumatique pousse le bras à travers deux soufflets soudés, qui gardent le vide étanche. La cage entre dans le faisceau pour mesurer, puis ressort pour le laisser passer.']
                ],
                'magnetic-rpa': [
                    ['Les ions entrent', 'Les ions entrent par l’ouverture du capot avant.'],
                    ['Les électrons dehors', 'Des aimants de chaque côté créent un champ en travers du trajet qui écarte les électrons : seuls les ions continuent.'],
                    ['Compter ce qui passe', 'Le collecteur en cuivre mesure les ions qui franchissent le potentiel retardateur.']
                ],
                'penning': [
                    ['Ralentir les antiprotons', 'Les antiprotons du décélérateur du CERN traversent une fine feuille qui les ralentit assez pour être piégés.'],
                    ['Piégés dans 5 teslas', 'La haute tension sur les électrodes en or et un champ de 5 teslas retiennent les antiprotons dans un piège de Penning–Malmberg.'],
                    ['Le piège à 1 tesla', 'Plus loin, un second piège se trouve dans l’aimant de 1 tesla, avec une électrode à paroi tournante pour comprimer le nuage.'],
                    ['Les positons arrivent', 'Une source de sodium 22 fournit des positons. Un piège à gaz tampon et un accumulateur les rassemblent, puis une ligne les amène dans l’aimant, où ils deviennent du positronium.'],
                    ['À 4 kelvins', 'Les aimants supraconducteurs et les pièges baignent dans l’hélium liquide à 4,2 K, dans un écran d’azote liquide à 77 K et une enceinte à vide isolante.'],
                    ['Annihilation', 'Quand un antiproton rencontre la matière, il s’annihile en pions, photons et fragments nucléaires. Les scintillateurs détectent les particules chargées.'],
                    ['L’antimatière tombe-t-elle ?', 'Le positronium rencontre les antiprotons et forme de l’antihydrogène. Plus loin, un déflectomètre de moiré mesure de combien il tombe en chemin.']
                ]
            },
            stages: ['Arrivée depuis le décélérateur', 'Piégés à 5 T', 'Refroidis et comprimés', 'Transférés dans le piège à 1 T, près de A0', 'Positons envoyés sur la cible', 'Deux lasers excitent le positronium', 'L’antihydrogène se forme', 'L’antihydrogène atteint le détecteur', 'Les antiprotons restants sont libérés']
        },
        ru: {
            models: {
                'oris': ['Ионный источник', 'Восьмиугольный ионный источник с кольцевым каспом', 'ORIS — ионный источник из моей диссертации: разряд с нитью накала в восьмиугольной камере, магниты кольцевого каспа и двухсеточная система извлечения.'],
                'fc-array': ['Цилиндры Фарадея', 'Линейка цилиндров Фарадея', 'Ряд цилиндров Фарадея за супрессорным и заземлённым электродами — для профилей ионного пучка в реальном времени.'],
                'hp-cup': ['Цилиндр 10 кВт', 'Цилиндр Фарадея на 10 кВт', 'Медный цилиндр Фарадея с водяным охлаждением для ионных пучков 20–30 мА на пневмоприводе с сильфонами, который вводит его в пучок. На входе — кольцо-супрессор на керамическом изоляторе.'],
                'magnetic-rpa': ['Магнитный RPA', 'Магнитный RPA', 'Анализатор с тормозящим потенциалом и магнитным фильтром для низкоэнергетических ионов перезарядки.'],
                'penning': ['Ловушка Пеннинга', 'Ловушка Пеннинга AEgIS', 'Моя модель ловушки антипротонов AEgIS в Geant4 / G4beamline. Антипротоны аннигилируют на стенке ловушки, а сцинтилляторы регистрируют разлетающиеся частицы.']
            },
            systems: {
                'Plasma chamber': ['Плазменная камера', 'Здесь ионизируется газ: восьмиугольная разрядная камера между передним и задним фланцами.'],
                'Ring-cusp magnets': ['Магниты кольцевого каспа', 'Постоянные магниты на стенках и задней части, закреплённые фланцами и крышками. Их касповое поле удерживает электроны плазмы.'],
                'Filament & feedthroughs': ['Нить накала и вводы', 'Горячий катод-нить и вакуумные вводы, по которым к ней подводится ток.'],
                'Extraction grids': ['Сетки извлечения', 'Экранная и ускоряющая сетки с небольшим зазором, вытягивающие ионы в виде пучка.'],
                'Insulators & hardware': ['Изоляторы и крепёж', 'Втулки из оксида алюминия и металлические втулки, изолирующие сетки, и винты, стягивающие сборку.']
            },
            story: {
                'oris': [
                    ['Сначала электроны', 'Горячая нить накала испускает электроны. Вакуумные вводы подают на неё ток через задний фланец.'],
                    ['Зажигаем плазму', 'Электроны сталкиваются с газом в восьмиугольной камере и ионизируют его.'],
                    ['Держим плотность', 'Стенки выложены кольцами магнитов. Электроны движутся по спирали вдоль каспового поля и отражаются обратно, поэтому дольше остаются в плазме.'],
                    ['Выходит пучок', 'Две сетки с небольшим зазором вытягивают ионы через тысячи отверстий в виде пучка.'],
                    ['Держим напряжение', 'Втулки из оксида алюминия удерживают каждый электрод под своим потенциалом.']
                ],
                'fc-array': [
                    ['Ловим пучок', 'Одиннадцать медных цилиндров собирают каждый свой ток. Вместе они показывают профиль пучка.'],
                    ['Электроны не уходят', 'Супрессор под отрицательным потенциалом возвращает вторичные электроны в цилиндры, и каждое показание остаётся честным.'],
                    ['Чёткое поле зрения', 'Заземлённый передний электрод экранирует цилиндры и задаёт участок пучка, который видит каждый из них.'],
                    ['Каждый цилиндр сам по себе', 'Керамические втулки изолируют цилиндры, поэтому каждый ток измеряется отдельно.']
                ],
                'hp-cup': [
                    ['Десять киловатт на меди', 'Ионный пучок останавливается на дне цельного медного цилиндра. При полном токе это около 10 кВт тепла — в блоке, который помещается в руке.'],
                    ['Удерживаем электроны', 'Ионы, ударяясь о медь, выбивают вторичные электроны. Кольцо-супрессор на входе, под отрицательным потенциалом и изолированное от цилиндра керамикой, возвращает их обратно, и измеренный ток остаётся честным.'],
                    ['Вода забирает тепло', 'Медная трубка припаяна вокруг цилиндра в пять витков. Холодная вода идёт вдоль штанги, обвивает цилиндр и выходит тёплой.'],
                    ['На керамике', 'Цилиндр подвешен к стальной штанге на керамических стойках, поэтому его заряд может уйти только по сигнальному проводу.'],
                    ['В пучок', 'Пневмоцилиндр толкает штангу через два сварных сильфона, которые сохраняют вакуум. Цилиндр Фарадея входит в пучок для измерения и выходит, чтобы пропустить его.']
                ],
                'magnetic-rpa': [
                    ['Ионы входят', 'Ионы входят через отверстие в передней крышке.'],
                    ['Электроны — прочь', 'Магниты по обе стороны создают поперечное поле, которое отклоняет электроны, и дальше идут только ионы.'],
                    ['Считаем, что прошло', 'Медный коллектор измеряет ионы, преодолевшие тормозящий потенциал.']
                ],
                'penning': [
                    ['Замедляем антипротоны', 'Антипротоны из замедлителя ЦЕРН проходят через тонкую фольгу, которая тормозит их настолько, чтобы их можно было поймать.'],
                    ['Пойманы в 5 теслах', 'Высокое напряжение на золотых электродах и поле 5 Тл удерживают антипротоны в ловушке Пеннинга–Мальмберга.'],
                    ['Ловушка на 1 Тл', 'Дальше, в магните на 1 Тл, стоит вторая ловушка с электродом вращающейся стенки для сжатия облака.'],
                    ['Добавляем позитроны', 'Источник натрия-22 даёт позитроны. Ловушка с буферным газом и накопитель собирают их, а линия доставляет в магнит, где они превращаются в позитроний.'],
                    ['При 4 кельвинах', 'Сверхпроводящие магниты и ловушки находятся в жидком гелии при 4,2 К, внутри экрана из жидкого азота при 77 К и изолирующего вакуумного сосуда.'],
                    ['Аннигиляция', 'Встречая вещество, антипротон аннигилирует в пионы, фотоны и ядерные фрагменты. Сцинтилляторы регистрируют заряженные частицы.'],
                    ['Падает ли антивещество?', 'Позитроний встречается с антипротонами и образует антиводород. Дальше муаровый дефлектометр измеряет, насколько он падает по пути.']
                ]
            },
            stages: ['Прибывают из замедлителя', 'Пойманы в ловушке 5 Тл', 'Охлаждены и сжаты', 'Перенесены в ловушку 1 Тл, к электроду A0', 'Позитроны направлены на мишень', 'Два лазера возбуждают позитроний', 'Образуется антиводород', 'Антиводород достигает детектора', 'Оставшиеся антипротоны выпускаются']
        },
        gu: {
            models: {
                'oris': ['આયન સ્રોત', 'અષ્ટકોણ રિંગ-કસ્પ આયન સ્રોત', 'ORIS, મારા Ph.D.નો આયન સ્રોત: અષ્ટકોણ ચેમ્બરમાં ફિલામેન્ટથી ચાલતો ડિસ્ચાર્જ, રિંગ-કસ્પ ચુંબકો અને બે-ગ્રિડ એક્સટ્રેક્શન સિસ્ટમ.'],
                'fc-array': ['ફેરાડે કપ', 'ફેરાડે કપ એરે', 'સપ્રેસર અને અર્થ ઇલેક્ટ્રોડ પાછળ ગોઠવેલા ફેરાડે કપની હરોળ, આયન બીમની રિયલ-ટાઇમ પ્રોફાઇલ માટે.'],
                'hp-cup': ['10 kW કપ', '10 kW ફેરાડે કપ', '20–30 mA આયન બીમ માટે પાણીથી ઠંડો થતો તાંબાનો ફેરાડે કપ, જેને ન્યુમેટિક બેલોઝ ડ્રાઇવ બીમમાં ધકેલે છે. તેના મુખ પર સિરામિક આઇસોલેટર પર સપ્રેસર રિંગ છે.'],
                'magnetic-rpa': ['મેગ્નેટિક RPA', 'મેગ્નેટિક RPA', 'ઓછી ઊર્જાવાળા ચાર્જ-એક્સચેન્જ આયનો માટે મેગ્નેટિક ફિલ્ટરવાળું રિટાર્ડિંગ પોટેન્શિયલ એનાલાઇઝર.'],
                'penning': ['પેનિંગ ટ્રેપ', 'AEgIS પેનિંગ ટ્રેપ', 'AEgISના એન્ટિપ્રોટોન ટ્રેપનું મારું Geant4 / G4beamline મોડેલ. એન્ટિપ્રોટોન ટ્રેપની દીવાલ પર નષ્ટ થાય છે અને સિન્ટિલેટર બહાર ઊડતા કણોને પકડે છે.']
            },
            systems: {
                'Plasma chamber': ['પ્લાઝ્મા ચેમ્બર', 'જ્યાં વાયુનું આયનીકરણ થાય છે: આગળ અને પાછળના ફ્લેન્જ વચ્ચેની અષ્ટકોણ ડિસ્ચાર્જ ચેમ્બર.'],
                'Ring-cusp magnets': ['રિંગ-કસ્પ ચુંબકો', 'દીવાલો અને પાછળના ભાગ પરના કાયમી ચુંબકો, જે ફ્લેન્જ અને કવરથી પકડેલા છે. તેમનું કસ્પ ક્ષેત્ર પ્લાઝ્માના ઇલેક્ટ્રોનને અંદર બાંધી રાખે છે.'],
                'Filament & feedthroughs': ['ફિલામેન્ટ અને ફીડથ્રૂ', 'ગરમ ફિલામેન્ટ કેથોડ અને તેનો કરંટ લઈ જતા વેક્યુમ ફીડથ્રૂ.'],
                'Extraction grids': ['એક્સટ્રેક્શન ગ્રિડ', 'થોડા અંતરે રાખેલી સ્ક્રીન અને એક્સિલરેશન ગ્રિડ, જે આયનોને બીમ રૂપે બહાર ખેંચે છે.'],
                'Insulators & hardware': ['ઇન્સ્યુલેટર અને હાર્ડવેર', 'ગ્રિડને અલગ રાખતા એલ્યુમિના અને ધાતુના બુશ, અને આખા સ્ટેકને કસતા સ્ક્રૂ.']
            },
            story: {
                'oris': [
                    ['પહેલાં ઇલેક્ટ્રોન', 'ગરમ ફિલામેન્ટમાંથી ઇલેક્ટ્રોન છૂટા પડે છે. વેક્યુમ ફીડથ્રૂ પાછળના ફ્લેન્જમાંથી તેનો કરંટ અંદર લાવે છે.'],
                    ['પ્લાઝ્મા પ્રગટે છે', 'ઇલેક્ટ્રોન અષ્ટકોણ ચેમ્બરમાંના વાયુ સાથે અથડાય છે અને તેનું આયનીકરણ કરે છે.'],
                    ['ઘનતા જાળવવી', 'દીવાલો પર ચુંબકોની રિંગ્સ છે. ઇલેક્ટ્રોન કસ્પ ક્ષેત્ર સાથે સર્પાકારે ફરે છે અને પાછા ઊછળે છે, તેથી તેઓ પ્લાઝ્મામાં વધુ સમય રહે છે.'],
                    ['બીમ બહાર આવે છે', 'થોડા અંતરે રાખેલી બે ગ્રિડ હજારો છિદ્રોમાંથી આયનોને બીમ રૂપે બહાર ખેંચે છે.'],
                    ['વોલ્ટેજ જાળવવું', 'એલ્યુમિના બુશ દરેક ઇલેક્ટ્રોડને તેના પોતાના પોટેન્શિયલ પર રાખે છે.']
                ],
                'fc-array': [
                    ['બીમ પકડવો', 'અગિયાર તાંબાના કપ દરેક પોતાના પર પડતો કરંટ એકઠો કરે છે. બાજુ-બાજુમાં રહીને તેઓ બીમની પ્રોફાઇલ વાંચે છે.'],
                    ['ઇલેક્ટ્રોન છટકી ન શકે', 'નેગેટિવ બાયસ પર રાખેલો સપ્રેસર સેકન્ડરી ઇલેક્ટ્રોનને પાછા કપમાં વાળે છે, જેથી દરેક માપ સાચું રહે.'],
                    ['નિશ્ચિત દૃશ્ય', 'અર્થ કરેલો આગળનો ઇલેક્ટ્રોડ કપને રક્ષણ આપે છે અને દરેક કપ બીમનો કયો ભાગ જુએ તે નક્કી કરે છે.'],
                    ['દરેક કપ અલગ', 'સિરામિક બુશ કપને એકબીજાથી અલગ રાખે છે, જેથી દરેક કરંટ અલગથી મપાય.']
                ],
                'hp-cup': [
                    ['તાંબા પર દસ કિલોવોટ', 'આયન બીમ નક્કર તાંબાના કપના તળિયે અટકે છે. પૂરા કરંટે આશરે 10 kW ગરમી થાય છે, એક હાથમાં પકડી શકાય તેવા ટુકડામાં.'],
                    ['ઇલેક્ટ્રોનને અંદર રાખવા', 'તાંબા સાથે અથડાતા આયનો સેકન્ડરી ઇલેક્ટ્રોન બહાર કાઢે છે. આગળની બાજુએ નેગેટિવ બાયસવાળી અને સિરામિકથી કપથી અલગ રાખેલી સપ્રેસર રિંગ તેમને પાછા વાળે છે, જેથી માપેલો કરંટ સાચો રહે.'],
                    ['પાણી ગરમી લઈ જાય છે', 'તાંબાની ટ્યુબ કપની આસપાસ પાંચ આંટામાં બ્રેઝ કરેલી છે. ઠંડું પાણી હાથ સાથે અંદર આવે છે, કપની ફરતે ફરે છે અને ગરમ થઈને બહાર નીકળે છે.'],
                    ['સિરામિક પર લટકતો', 'કપ સિરામિક સ્ટેન્ડઑફ વડે સ્ટીલના હાથ પર લટકે છે, તેથી તેનો ચાર્જ માત્ર સિગ્નલ વાયર દ્વારા જ બહાર જઈ શકે.'],
                    ['બીમની અંદર', 'ન્યુમેટિક સિલિન્ડર હાથને બે એજ-વેલ્ડેડ બેલોઝમાંથી આગળ ધકેલે છે, જે વેક્યુમને સીલ રાખે છે. માપવા માટે કપ બીમમાં જાય છે અને બીમને પસાર થવા દેવા પાછો બહાર આવે છે.']
                ],
                'magnetic-rpa': [
                    ['આયન અંદર', 'આયનો આગળના કવરના છિદ્રમાંથી અંદર આવે છે.'],
                    ['ઇલેક્ટ્રોન બહાર', 'બંને બાજુના ચુંબકો માર્ગની આડે એવું ક્ષેત્ર બનાવે છે જે ઇલેક્ટ્રોનને દૂર વાળે છે, તેથી માત્ર આયનો જ આગળ જાય છે.'],
                    ['જે પસાર થાય તેની ગણતરી', 'તાંબાનો કલેક્ટર રિટાર્ડિંગ પોટેન્શિયલ પાર કરનારા આયનોને માપે છે.']
                ],
                'penning': [
                    ['એન્ટિપ્રોટોનને ધીમા પાડવા', 'CERNના ડિસેલરેટરમાંથી આવતા એન્ટિપ્રોટોન પાતળી ફોઇલમાંથી પસાર થાય છે, જે તેમને પકડી શકાય તેટલા ધીમા પાડે છે.'],
                    ['5 ટેસ્લામાં કેદ', 'સોનાના ઇલેક્ટ્રોડ પરનું ઊંચું વોલ્ટેજ અને 5 ટેસ્લાનું ક્ષેત્ર એન્ટિપ્રોટોનને પેનિંગ–માલ્મબર્ગ ટ્રેપમાં પકડી રાખે છે.'],
                    ['1 ટેસ્લાનો ટ્રેપ', 'થોડે આગળ 1 ટેસ્લાના ચુંબકમાં બીજો ટ્રેપ છે, જેમાં વાદળને સંકોચવા માટે રોટેટિંગ-વૉલ ઇલેક્ટ્રોડ છે.'],
                    ['પોઝિટ્રોન જોડાય છે', 'સોડિયમ-22નો સ્રોત પોઝિટ્રોન આપે છે. બફર-ગેસ ટ્રેપ અને એક્યુમ્યુલેટર તેમને એકઠા કરે છે, પછી એક લાઇન તેમને ચુંબકમાં લાવે છે, જ્યાં તેઓ પોઝિટ્રોનિયમ બને છે.'],
                    ['4 કેલ્વિન પર', 'સુપરકન્ડક્ટિંગ ચુંબકો અને ટ્રેપ 4.2 K પરના પ્રવાહી હિલિયમમાં છે, 77 K પરના પ્રવાહી નાઇટ્રોજનના કવચ અને ઇન્સ્યુલેટિંગ વેક્યુમ પાત્રની અંદર.'],
                    ['એનિહિલેશન', 'એન્ટિપ્રોટોન દ્રવ્યને મળે ત્યારે તે પાયોન, ફોટોન અને ન્યુક્લિયર ટુકડાઓમાં નષ્ટ થાય છે. સિન્ટિલેટર ચાર્જવાળા કણોને પકડે છે.'],
                    ['શું પ્રતિદ્રવ્ય નીચે પડે છે?', 'પોઝિટ્રોનિયમ એન્ટિપ્રોટોનને મળીને એન્ટિહાઇડ્રોજન બનાવે છે. આગળ, મોઆરે ડિફ્લેક્ટોમીટર માપે છે કે તે રસ્તામાં કેટલું નીચે પડે છે.']
                ]
            },
            stages: ['ડિસેલરેટરમાંથી આવી રહ્યા છે', '5 T ટ્રેપમાં કેદ', 'ઠંડા કરીને સંકોચાયેલા', '1 T ટ્રેપમાં, A0 પાસે ખસેડાયા', 'પોઝિટ્રોન ટાર્ગેટ પર છોડાયા', 'બે લેસર પોઝિટ્રોનિયમને ઉત્તેજિત કરે છે', 'એન્ટિહાઇડ્રોજન બને છે', 'એન્ટિહાઇડ્રોજન ડિટેક્ટર સુધી પહોંચે છે', 'બાકીના એન્ટિપ્રોટોન છોડાય છે']
        }
    };

    const CT = (s, ...args) => {
        const d = UI[LANG] || {};
        const v = d[s] !== undefined ? d[s] : (EN[s] !== undefined ? EN[s] : s);
        return typeof v === 'function' ? v(...args) : v;
    };
    window.CT = CT;
    window.CAD_I18N = { lang: LANG, ...(DATA[LANG] || {}) };

    // static page text, once the body is parsed (this script is loaded at the end of <body>)
    document.title = CT('pageTitle', NAME[LANG]);
    if (LANG === 'en') return;
    const d = UI[LANG];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
        const raw = n.nodeValue, key = raw.trim();
        if (key && typeof d[key] === 'string') n.nodeValue = raw.replace(key, d[key]);
        else if (key.includes('Bharat Singh Rawat')) n.nodeValue = raw.replace('Bharat Singh Rawat', NAME[LANG]);
    });
    document.querySelectorAll('[aria-label],[title],[alt]').forEach(el => ['aria-label', 'title', 'alt'].forEach(a => {
        const v = el.getAttribute(a); if (v && typeof d[v] === 'string') el.setAttribute(a, d[v]);
    }));
})();
