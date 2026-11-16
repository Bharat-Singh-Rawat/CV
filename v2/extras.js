/* =====================================================================
   Extras for the v2 CV (runs after v2.js has rendered the page):
   1. "Add to contacts" vCard          2. local time next to Contact
   5. physics term tooltips             6. skills ↔ work network graph
   7. easter egg: type "beam" (or tap the name 5×) to fire a beam
   ===================================================================== */
(function () {
    const P = window.PROFILE; if (!P) return;
    const T = window.T || (s => s), LANG = window.LANG || 'en';
    const $ = id => document.getElementById(id);
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const links = P.links || [], mail = links.find(l => /^mailto:/.test(l.url));
    const city = (P.location || 'Vancouver').split(',')[0].trim();
    const CITY = { ru: { Vancouver: 'Ванкувер' }, gu: { Vancouver: 'વાનકુવર' } };
    const cityL = (CITY[LANG] && CITY[LANG][city]) || city;

    // ------------------------------------------------------------- 1. vCard
    function vcard() {
        const bare = P.name.replace(/,.*$/, '').trim(), parts = bare.split(/\s+/).map(w => w[0] + w.slice(1).toLowerCase());
        const v = s => String(s).replace(/([,;\\])/g, '\\$1');
        const now = (P.experience || [])[0] || {};
        const li = links.find(l => /linkedin/i.test(l.url));
        const gh = links.find(l => /^github$/i.test(l.label || ''));
        const loc = (P.location || '').split(',').map(x => x.trim());
        const lines = [
            'BEGIN:VCARD', 'VERSION:3.0',
            `N:${v(parts[parts.length - 1])};${v(parts[0])};${v(parts.slice(1, -1).join(' '))};Dr.;Ph.D.`,
            `FN:${v(parts.join(' '))}`,
            now.role ? `TITLE:${v(now.role.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&'))}` : '',
            now.org ? `ORG:${v(now.org.split(',')[0])}` : '',
            mail ? `EMAIL;TYPE=INTERNET:${mail.url.replace(/^mailto:/, '')}` : '',
            `URL:${location.origin}/CV/`,
            li ? `URL;TYPE=LinkedIn:${li.url}` : '',
            li ? `X-SOCIALPROFILE;TYPE=linkedin:${li.url}` : '',
            gh ? `X-SOCIALPROFILE;TYPE=github:${gh.url}` : '',
            loc.length ? `ADR;TYPE=WORK:;;;${v(loc[0])};;;${v(loc[loc.length - 1])}` : '',
            `NOTE:${v(P.title)}`,
            'END:VCARD'
        ].filter(Boolean).join('\r\n');
        const blob = new Blob([lines], { type: 'text/vcard;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = parts.join('-') + '.vcf';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    const row = document.querySelector('#contact-links .link-row');
    if (row) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'link link-btn'; b.textContent = T('Add to contacts');
        b.addEventListener('click', vcard);
        row.insertBefore(b, row.firstChild);
    }

    // ------------------------------------------------------------- 2. local time
    const contactLinks = $('contact-links');
    if (contactLinks) {
        const p = document.createElement('p'); p.className = 'localtime';
        contactLinks.appendChild(p);
        let fmt; try { fmt = new Intl.DateTimeFormat(LANG, { hour: 'numeric', minute: '2-digit', timeZone: P.timezone || 'America/Vancouver' }); } catch (e) { fmt = null; }
        const tick = () => { if (fmt) p.textContent = T('localtime', fmt.format(new Date()), cityL); };
        tick(); setInterval(tick, 20000);
    }

    // ------------------------------------------------------------- 5. physics term tooltips
    const TERMS = [
        { k: 'cl', re: { en: /ion-beam extraction/i, es: /extracción de haces de iones/i, ru: /извлечени[еяю] ионных пучков/i, fr: /extraction de faisceaux d’ions/i, gu: /આયન-બીમ એક્સટ્રેક્શન/ },
          name: { en: 'Child–Langmuir law', es: 'Ley de Child–Langmuir', ru: 'Закон Чайлда–Ленгмюра', fr: 'Loi de Child–Langmuir', gu: 'ચાઇલ્ડ–લેંગમ્યુર નિયમ' },
          eq: 'J = (4ε₀/9) · √(2q/m) · V<sup>3/2</sup> / d²',
          def: { en: 'The maximum space-charge-limited current density that can be extracted across a gap d at voltage V.',
                 es: 'La máxima densidad de corriente, limitada por carga espacial, que puede extraerse a través de un hueco d con tensión V.',
                 ru: 'Максимальная плотность тока, ограниченного пространственным зарядом, извлекаемого через зазор d при напряжении V.',
                 fr: 'Densité de courant maximale, limitée par la charge d’espace, extractible à travers un intervalle d sous une tension V.',
                 gu: 'વોલ્ટેજ V પર અંતર d પાર ખેંચી શકાતી, સ્પેસ-ચાર્જથી મર્યાદિત મહત્તમ કરંટ ઘનતા.' } },
        { k: 'bohm', re: { en: /Bohm-criterion/i, es: /criterio de Bohm/i, ru: /критери[яйюе] Бома/i, fr: /critère de Bohm/i, gu: /બોહ્મ માપદંડ/ },
          name: { en: 'Bohm criterion', es: 'Criterio de Bohm', ru: 'Критерий Бома', fr: 'Critère de Bohm', gu: 'બોહ્મ માપદંડ' },
          eq: 'v<sub>i</sub> ≥ c<sub>s</sub> = √(kT<sub>e</sub> / m<sub>i</sub>)',
          def: { en: 'Ions must enter the sheath at least at the ion sound speed for a stable plasma boundary.',
                 es: 'Los iones deben entrar en la vaina al menos a la velocidad del sonido iónico para que el borde del plasma sea estable.',
                 ru: 'Ионы должны входить в слой не медленнее ионно-звуковой скорости, чтобы граница плазмы была устойчивой.',
                 fr: 'Les ions doivent entrer dans la gaine au moins à la vitesse acoustique ionique pour que la frontière du plasma soit stable.',
                 gu: 'પ્લાઝ્માની સીમા સ્થિર રહે તે માટે આયનોએ ઓછામાં ઓછા આયન-ધ્વનિ વેગથી શીથમાં પ્રવેશવું જોઈએ.' } },
        { k: 'poisson', re: { en: /Poisson solver/i, es: /solucionador de Poisson/i, ru: /уравнения Пуассона/i, fr: /solveur de Poisson/i, gu: /પોઇસન સોલ્વર/ },
          name: { en: 'Poisson’s equation', es: 'Ecuación de Poisson', ru: 'Уравнение Пуассона', fr: 'Équation de Poisson', gu: 'પોઇસન સમીકરણ' },
          eq: '∇²φ = −ρ / ε₀',
          def: { en: 'Links the electric potential φ to the space charge ρ of the beam and plasma.',
                 es: 'Relaciona el potencial eléctrico φ con la carga espacial ρ del haz y del plasma.',
                 ru: 'Связывает электрический потенциал φ с пространственным зарядом ρ пучка и плазмы.',
                 fr: 'Relie le potentiel électrique φ à la charge d’espace ρ du faisceau et du plasma.',
                 gu: 'વિદ્યુત પોટેન્શિયલ φને બીમ અને પ્લાઝ્માના સ્પેસ ચાર્જ ρ સાથે જોડે છે.' } },
        { k: 'mcc', re: { en: /Monte Carlo Collision/i, es: /colisiones Monte Carlo/i, ru: /столкновений (методом )?Монте-Карло/i, fr: /collisions Monte-Carlo/i, gu: /મોન્ટે કાર્લો કોલિઝન/ },
          name: { en: 'Monte Carlo collisions', es: 'Colisiones Monte Carlo', ru: 'Столкновения Монте-Карло', fr: 'Collisions Monte-Carlo', gu: 'મોન્ટે કાર્લો કોલિઝન' },
          eq: 'P = 1 − exp(−n σ(v) v Δt)',
          def: { en: 'At each step a particle collides with probability P, set by the gas density n and cross-section σ.',
                 es: 'En cada paso, una partícula colisiona con probabilidad P, fijada por la densidad del gas n y la sección eficaz σ.',
                 ru: 'На каждом шаге частица сталкивается с вероятностью P, зависящей от плотности газа n и сечения σ.',
                 fr: 'À chaque pas, une particule entre en collision avec une probabilité P fixée par la densité du gaz n et la section efficace σ.',
                 gu: 'દરેક પગલે કણ P સંભાવનાથી અથડાય છે, જે વાયુ ઘનતા n અને ક્રોસ-સેક્શન σ પર આધાર રાખે છે.' } },
        { k: 'cex', re: { en: /Charge-Exchange/i, es: /intercambio de carga/i, ru: /перезарядн[а-яё]+/i, fr: /échange de charge/i, gu: /ચાર્જ-એક્સચેન્જ/ },
          name: { en: 'Charge exchange', es: 'Intercambio de carga', ru: 'Перезарядка', fr: 'Échange de charge', gu: 'ચાર્જ એક્સચેન્જ' },
          eq: 'A⁺<sub>fast</sub> + A<sub>slow</sub> → A<sub>fast</sub> + A⁺<sub>slow</sub>',
          def: { en: 'A fast ion grabs an electron from a slow atom, leaving a slow ion that can erode the grids.',
                 es: 'Un ion rápido captura un electrón de un átomo lento y deja un ion lento que puede erosionar las rejillas.',
                 ru: 'Быстрый ион забирает электрон у медленного атома; образовавшийся медленный ион разрушает сетки.',
                 fr: 'Un ion rapide capte un électron d’un atome lent et laisse un ion lent qui peut éroder les grilles.',
                 gu: 'ઝડપી આયન ધીમા પરમાણુ પાસેથી ઇલેક્ટ્રોન લઈ લે છે, અને બચેલો ધીમો આયન ગ્રિડને ઘસી શકે છે.' } },
        { k: 'penning', re: { en: /Penning(–Malmberg)? [Tt]rap/, es: /trampa de Penning(–Malmberg)?/i, ru: /ловушк[а-яё]* Пеннинга(–Мальмберга)?/i, fr: /pièges? de Penning(–Malmberg)?/i, gu: /પેનિંગ(–માલ્મબર્ગ)? ટ્રેપ/ },
          name: { en: 'Penning trap', es: 'Trampa de Penning', ru: 'Ловушка Пеннинга', fr: 'Piège de Penning', gu: 'પેનિંગ ટ્રેપ' },
          eq: 'ω<sub>c</sub> = qB / m',
          def: { en: 'Charged particles are held radially by a strong magnetic field B and axially by electrostatic potentials.',
                 es: 'Las partículas cargadas se confinan radialmente con un campo magnético intenso B y axialmente con potenciales electrostáticos.',
                 ru: 'Заряженные частицы удерживаются радиально сильным магнитным полем B, а вдоль оси — электростатическими потенциалами.',
                 fr: 'Les particules chargées sont confinées radialement par un champ magnétique intense B et axialement par des potentiels électrostatiques.',
                 gu: 'ચાર્જ્ડ કણોને ત્રિજ્યાદિશામાં પ્રબળ ચુંબકીય ક્ષેત્ર B વડે અને અક્ષ પર ઇલેક્ટ્રોસ્ટેટિક પોટેન્શિયલ વડે બાંધી રાખવામાં આવે છે.' } },
        { k: 'faraday', re: { en: /Faraday [Cc]ups?/, es: /copas? de Faraday/i, ru: /цилиндр[а-яё]* Фарадея/i, fr: /cages? de Faraday/i, gu: /ફેરાડે કપ/ },
          name: { en: 'Faraday cup', es: 'Copa de Faraday', ru: 'Цилиндр Фарадея', fr: 'Cage de Faraday', gu: 'ફેરાડે કપ' },
          eq: 'I = dQ / dt',
          def: { en: 'Collects the beam’s charge Q and reads it as a current: the most direct measure of beam intensity.',
                 es: 'Recoge la carga Q del haz y la mide como corriente: la medida más directa de la intensidad del haz.',
                 ru: 'Собирает заряд пучка Q и измеряет его как ток — самый прямой способ измерить интенсивность пучка.',
                 fr: 'Recueille la charge Q du faisceau et la mesure comme un courant : la mesure la plus directe de l’intensité du faisceau.',
                 gu: 'બીમનો ચાર્જ Q એકત્ર કરી તેને કરંટ તરીકે માપે છે — બીમની તીવ્રતા માપવાની સૌથી સીધી રીત.' } },
        { k: 'langmuir', re: { en: /Langmuir probes?/i, es: /sondas? de Langmuir/i, ru: /зонд[а-яё]* Ленгмюра/i, fr: /sondes? de Langmuir/i, gu: /લેંગમ્યુર પ્રોબ/ },
          name: { en: 'Langmuir probe', es: 'Sonda de Langmuir', ru: 'Зонд Ленгмюра', fr: 'Sonde de Langmuir', gu: 'લેંગમ્યુર પ્રોબ' },
          eq: 'I<sub>i,sat</sub> ≈ 0.61 e n A √(kT<sub>e</sub> / m<sub>i</sub>)',
          def: { en: 'A biased wire in the plasma; its current–voltage curve gives the density n and electron temperature T<sub>e</sub>.',
                 es: 'Un hilo polarizado en el plasma; su curva corriente–tensión da la densidad n y la temperatura electrónica T<sub>e</sub>.',
                 ru: 'Электрод в плазме; его вольт-амперная характеристика даёт плотность n и электронную температуру T<sub>e</sub>.',
                 fr: 'Un fil polarisé dans le plasma ; sa caractéristique courant–tension donne la densité n et la température électronique T<sub>e</sub>.',
                 gu: 'પ્લાઝ્મામાં મૂકેલો બાયસ્ડ વાયર; તેનો કરંટ–વોલ્ટેજ વક્ર ઘનતા n અને ઇલેક્ટ્રોન તાપમાન T<sub>e</sub> આપે છે.' } },
        { k: 'div', re: { en: /beam divergence/i, es: /divergencia del haz/i, ru: /расходимость пучка/i, fr: /divergence du faisceau/i, gu: /બીમ ડાયવર્જન્સ/ },
          name: { en: 'Beam divergence', es: 'Divergencia del haz', ru: 'Расходимость пучка', fr: 'Divergence du faisceau', gu: 'બીમ ડાયવર્જન્સ' },
          eq: 'θ<sub>rms</sub> = √⟨x′²⟩',
          def: { en: 'The angular spread of a beam: lower means a tighter, better-focused beam.',
                 es: 'La dispersión angular del haz: cuanto menor, más estrecho y mejor enfocado.',
                 ru: 'Угловой разброс пучка: чем меньше, тем уже и лучше сфокусирован пучок.',
                 fr: 'L’étalement angulaire du faisceau : plus il est faible, plus le faisceau est fin et bien focalisé.',
                 gu: 'બીમનો કોણીય ફેલાવો: જેટલો ઓછો, તેટલો બીમ સાંકડો અને સારી રીતે કેન્દ્રિત.' } },
        { k: 'scn', re: { en: /space-charge neutralisation/i, es: /neutralización de la carga espacial/i, ru: /нейтрализаци[а-яё]+ пространственного заряда/i, fr: /neutralisation de la charge d’espace/i, gu: /સ્પેસ-ચાર્જ ન્યુટ્રલાઇઝેશન/ },
          name: { en: 'Space-charge neutralisation', es: 'Neutralización de la carga espacial', ru: 'Нейтрализация пространственного заряда', fr: 'Neutralisation de la charge d’espace', gu: 'સ્પેસ-ચાર્જ ન્યુટ્રલાઇઝેશન' },
          eq: 'f = 1 − φ / φ₀',
          def: { en: 'Electrons trapped in the beam cancel part of its positive potential φ, so the beam blows up less.',
                 es: 'Los electrones atrapados en el haz anulan parte de su potencial positivo φ, y el haz se expande menos.',
                 ru: 'Электроны, захваченные пучком, компенсируют часть его положительного потенциала φ, и пучок меньше расплывается.',
                 fr: 'Les électrons piégés dans le faisceau compensent une partie de son potentiel positif φ, et le faisceau s’élargit moins.',
                 gu: 'બીમમાં ફસાયેલા ઇલેક્ટ્રોન તેના ધન પોટેન્શિયલ φનો અમુક ભાગ રદ કરે છે, તેથી બીમ ઓછો ફેલાય છે.' } },
        { k: 'sey', re: { en: /secondary electron yield/i, es: /electrones secundarios/i, ru: /вторичной электронной эмиссии/i, fr: /électrons secondaires/i, gu: /સેકન્ડરી ઇલેક્ટ્રોન યીલ્ડ/ },
          name: { en: 'Secondary electron yield', es: 'Rendimiento de electrones secundarios', ru: 'Коэффициент вторичной эмиссии', fr: 'Rendement en électrons secondaires', gu: 'સેકન્ડરી ઇલેક્ટ્રોન યીલ્ડ' },
          eq: 'δ = N<sub>out</sub> / N<sub>in</sub>',
          def: { en: 'Electrons knocked out per incoming particle; a suppressor turns them back so the cup reads the true current.',
                 es: 'Electrones arrancados por cada partícula incidente; un supresor los devuelve para que la copa mida la corriente real.',
                 ru: 'Число выбитых электронов на налетающую частицу; подавляющий электрод возвращает их, чтобы цилиндр измерял истинный ток.',
                 fr: 'Électrons arrachés par particule incidente ; un suppresseur les renvoie pour que la cage mesure le vrai courant.',
                 gu: 'દરેક આવતા કણ દીઠ છૂટા પડતા ઇલેક્ટ્રોન; સપ્રેસર તેમને પાછા વાળે છે જેથી કપ સાચો કરંટ માપે.' } },
    ];
    const L = o => o[LANG] || o.en;
    const done = new Set();
    ['about-body', 'expertise', 'beamline', 'projects'].forEach(id => {
        const root = $(id); if (!root) return;
        for (const term of TERMS) {
            if (done.has(term.k)) continue;
            const re = L(term.re);
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
                acceptNode: n => n.parentElement.closest('a:not(.project), .term, button') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
            });
            let n;
            while ((n = walker.nextNode())) {
                const m = n.nodeValue.match(re);
                if (!m) continue;
                const before = n.nodeValue.slice(0, m.index), after = n.nodeValue.slice(m.index + m[0].length);
                const span = document.createElement('span');
                span.className = 'term'; span.tabIndex = 0; span.setAttribute('role', 'button');
                span.dataset.k = term.k; span.textContent = m[0];
                const frag = document.createDocumentFragment();
                if (before) frag.appendChild(document.createTextNode(before));
                frag.appendChild(span);
                if (after) frag.appendChild(document.createTextNode(after));
                n.parentNode.replaceChild(frag, n);
                done.add(term.k); break;
            }
        }
    });
    const tip = document.createElement('div');
    tip.id = 'term-tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
    document.body.appendChild(tip);
    let tipFor = null;
    const showTip = el => {
        const term = TERMS.find(t => t.k === el.dataset.k); if (!term) return;
        tip.innerHTML = `<strong>${esc(L(term.name))}</strong><span class="eq">${term.eq}</span><span class="def">${L(term.def)}</span>`;
        tip.hidden = false; tipFor = el;
        const r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
        let x = r.left + r.width / 2 - tw / 2; x = Math.max(12, Math.min(window.innerWidth - tw - 12, x));
        let y = r.top - th - 10; if (y < 60) y = r.bottom + 10;
        tip.style.left = x + 'px'; tip.style.top = y + 'px';
        requestAnimationFrame(() => tip.classList.add('show'));
    };
    const hideTip = () => { tip.classList.remove('show'); tip.hidden = true; tipFor = null; };
    document.addEventListener('mouseover', e => { const t = e.target.closest('.term'); if (t && t !== tipFor) showTip(t); });
    document.addEventListener('mouseout', e => { const t = e.target.closest('.term'); if (t && !t.contains(e.relatedTarget)) hideTip(); });
    document.addEventListener('focusin', e => { const t = e.target.closest('.term'); if (t) showTip(t); });
    document.addEventListener('focusout', e => { if (e.target.closest('.term')) hideTip(); });
    document.addEventListener('click', e => {
        const t = e.target.closest('.term');
        if (t) { e.preventDefault(); e.stopPropagation(); tipFor === t ? hideTip() : showTip(t); }
        else if (tipFor) hideTip();
    }, true);
    window.addEventListener('scroll', () => { if (tipFor) hideTip(); }, { passive: true });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && tipFor) hideTip(); });

    // ------------------------------------------------------------- 6. skills network graph
    const G = P.graph, rack = $('rack');
    if (G && rack) {
        const box = document.createElement('div');
        box.className = 'sg reveal in';
        box.innerHTML = `
            <h3 class="sg-title">${esc(T('How it connects.'))}</h3>
            <p class="sg-sub">${esc(T('Hover or tap a skill to see where I’ve used it.'))}</p>
            <div class="sg-body">
                <svg class="sg-links" aria-hidden="true"></svg>
                <ul class="sg-col sg-skills">${G.skills.map(s => `<li><button type="button" class="sg-node" data-id="${s.id}">${esc(T(s.label))}</button></li>`).join('')}</ul>
                <ul class="sg-col sg-work">${G.work.map(w => `<li><button type="button" class="sg-node work" data-id="${w.id}">${esc(T(w.label))}</button></li>`).join('')}</ul>
            </div>`;
        rack.parentNode.insertBefore(box, rack);
        const svg = box.querySelector('.sg-links'), body = box.querySelector('.sg-body');
        const pairs = [];
        Object.entries(G.links).forEach(([sk, ws]) => ws.forEach(w => pairs.push([sk, w])));
        const node = id => box.querySelector(`.sg-node[data-id="${id}"]`);
        function draw() {
            const br = body.getBoundingClientRect();
            svg.setAttribute('viewBox', `0 0 ${br.width} ${br.height}`);
            svg.innerHTML = pairs.map(([a, b]) => {
                const ra = node(a).getBoundingClientRect(), rb = node(b).getBoundingClientRect();
                const x1 = ra.right - br.left + 4, y1 = ra.top + ra.height / 2 - br.top;
                const x2 = rb.left - br.left - 4, y2 = rb.top + rb.height / 2 - br.top, mx = (x1 + x2) / 2;
                return `<path data-a="${a}" data-b="${b}" d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}"/>`;
            }).join('');
        }
        let active = null;
        function focus(id) {
            active = id;
            const linked = new Set([id]);
            pairs.forEach(([a, b]) => { if (a === id) linked.add(b); if (b === id) linked.add(a); });
            box.classList.toggle('focusing', !!id);
            box.querySelectorAll('.sg-node').forEach(n => n.classList.toggle('on', !!id && linked.has(n.dataset.id)));
            svg.querySelectorAll('path').forEach(p => p.classList.toggle('on', !!id && (p.dataset.a === id || p.dataset.b === id)));
        }
        box.addEventListener('mouseover', e => { const n = e.target.closest('.sg-node'); if (n) focus(n.dataset.id); });
        box.addEventListener('mouseleave', () => focus(null));
        box.addEventListener('click', e => { const n = e.target.closest('.sg-node'); if (n) focus(active === n.dataset.id ? null : n.dataset.id); });
        box.addEventListener('focusin', e => { const n = e.target.closest('.sg-node'); if (n) focus(n.dataset.id); });
        draw();
        if ('ResizeObserver' in window) new ResizeObserver(() => { draw(); focus(active); }).observe(body);
        window.addEventListener('load', () => { draw(); focus(active); });
    }

    // ------------------------------------------------------------- 7. easter egg: "beam"
    let buf = '', taps = [], firing = false;
    document.addEventListener('keydown', e => {
        if (e.ctrlKey || e.metaKey || e.altKey || /input|select|textarea/i.test(e.target.tagName)) return;
        if (e.key.length !== 1) return;
        buf = (buf + e.key.toLowerCase()).slice(-4);
        if (buf === 'beam') { buf = ''; fire(); }
    });
    const lnTitle = $('ln-title');
    if (lnTitle) lnTitle.addEventListener('click', e => {
        const now = Date.now(); taps = taps.filter(t => now - t < 2000); taps.push(now);
        if (taps.length >= 5) { e.preventDefault(); taps = []; fire(); }
    });
    function toast(msg) {
        const t = document.createElement('div'); t.className = 'beam-toast'; t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(() => t.classList.add('show'));
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, 2200);
    }
    function fire() {
        if (firing) return; firing = true;
        window.cvSfx && window.cvSfx.toggle();
        if (reduce) { toast('⚡ ' + T('Beam on target.')); firing = false; return; }
        const W = window.innerWidth, H = window.innerHeight;
        const c = document.createElement('canvas'); c.className = 'beam-fx';
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        c.width = W * dpr; c.height = H * dpr; document.body.appendChild(c);
        const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // aim at the Faraday cup if the Research section is on screen, otherwise across the middle of the view
        const res = $('research'), rr = res && res.getBoundingClientRect();
        const cupVisible = rr && rr.top < H * 0.8 && rr.top > -200;
        const ty = cupVisible ? rr.top + (W < 760 ? 96 : 170) : H * 0.46;
        const tx = cupVisible ? (W < 760 ? W - 94 : Math.min(W - 180, (W + Math.min(W, 1280) - 44) / 2 - 150)) + 10 : W + 40;
        const t0 = performance.now(), dur = 900, sparks = [];
        let hit = false;
        (function frame(now) {
            const t = (now - t0) / dur;
            ctx.clearRect(0, 0, W, H);
            const head = Math.min(1, t) * (tx + 40) - 40;
            const g = ctx.createLinearGradient(head - 260, 0, head, 0);
            g.addColorStop(0, 'rgba(29,29,31,0)'); g.addColorStop(1, 'rgba(29,29,31,0.55)');
            ctx.strokeStyle = g; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
            if (t < 1.35) { ctx.beginPath(); ctx.moveTo(Math.max(-40, head - 260), ty); ctx.lineTo(Math.min(head, tx), ty); ctx.stroke(); }
            ctx.fillStyle = 'rgba(29,29,31,0.6)';
            for (let i = 0; i < 6; i++) { const px = head - Math.random() * 120; if (px < tx) { ctx.beginPath(); ctx.arc(px, ty + (Math.random() - 0.5) * 8, 1.2, 0, 7); ctx.fill(); } }
            if (t >= 1 && !hit) {
                hit = true;
                for (let i = 0; i < 26; i++) { const a = Math.PI * (0.6 + Math.random() * 0.8); sparks.push({ x: tx, y: ty, vx: Math.cos(a) * (60 + Math.random() * 160), vy: Math.sin(a) * (60 + Math.random() * 160) - 40, l: 1 }); }
                toast('⚡ ' + T('Beam on target.'));
            }
            if (hit) {
                const ring = Math.min(1, (t - 1) / 0.5);
                ctx.strokeStyle = `rgba(29,29,31,${0.35 * (1 - ring)})`; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(tx, ty, 6 + ring * 40, 0, 7); ctx.stroke();
                for (const s of sparks) {
                    s.vy += 300 / 60; s.x += s.vx / 60; s.y += s.vy / 60; s.l -= 0.02;
                    if (s.l > 0) { ctx.fillStyle = `rgba(29,29,31,${0.5 * s.l})`; ctx.beginPath(); ctx.arc(s.x, s.y, 1.4, 0, 7); ctx.fill(); }
                }
            }
            if (t < 2.3) requestAnimationFrame(frame); else { c.remove(); firing = false; }
        })(t0);
    }
})();
