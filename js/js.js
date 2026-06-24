// Preloader — оверлей на весь экран с "PODVAL" и процентом загрузки.
// Инжектится сразу, как только в DOM появится body, ждёт загрузки всех <img>/<video>
// и события window.load, потом плавно уходит.
(function initPreloader(){
    if (!document.body) { requestAnimationFrame(initPreloader); return; }
    // на странице 404 прелоадер не нужен
    if (document.querySelector('.s_error')) return;

    const pre = document.createElement('div');
    pre.id = 'preloader';
    pre.innerHTML = '<div class="pre_text">PODVAL</div><div class="pre_pct">0%</div>';
    document.body.insertBefore(pre, document.body.firstChild);

    const pctEl = pre.querySelector('.pre_pct');
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    let displayPct = 0;
    let windowLoaded = false;
    let resources = [];
    let loadedCount = 0;

    const isLoaded = (r) => r.tagName === 'IMG'
        ? (r.complete && r.naturalWidth !== 0) || r.complete
        : r.readyState >= 3;

    const trackResources = () => {
        resources = [...document.images, ...document.querySelectorAll('video')];
        resources.forEach(r => {
            if (isLoaded(r)) {
                loadedCount++;
            } else {
                const done = () => { loadedCount++; };
                if (r.tagName === 'IMG') {
                    r.addEventListener('load',  done, { once: true });
                    r.addEventListener('error', done, { once: true });
                } else {
                    r.addEventListener('loadeddata', done, { once: true });
                    r.addEventListener('error',      done, { once: true });
                }
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', trackResources, { once: true });
    } else {
        trackResources();
    }
    // если window.load уже отработал до подписки — выставляем флаг сразу
    if (document.readyState === 'complete') {
        windowLoaded = true;
    } else {
        window.addEventListener('load', () => { windowLoaded = true; });
    }
    // safety: если что-то зависло (медиа не дослалось, ошибка в кэше и т.п.) — снимаем потолок через 6с
    setTimeout(() => { windowLoaded = true; }, 6000);

    const tick = () => {
        const total = resources.length;
        // пересчитываем загруженные ресурсы (на случай пропущенных load-событий)
        if (total > 0) {
            let cnt = 0;
            for (const r of resources) if (isLoaded(r)) cnt++;
            if (cnt > loadedCount) loadedCount = cnt;
        }
        // целевой процент: реальная загрузка ресурсов, но потолок 95% пока не пришёл window.load
        let target;
        if (windowLoaded) {
            target = 100;
        } else if (total > 0) {
            target = Math.min(95, Math.round((loadedCount / total) * 100));
        } else {
            target = 60; // ещё ничего не знаем о ресурсах — плавно тянем до 60%
        }

        if (displayPct < target) displayPct = Math.min(target, displayPct + 1);
        pctEl.textContent = Math.round(displayPct) + '%';

        if (displayPct >= 100 && windowLoaded) {
            pre.style.opacity = '0';
            setTimeout(() => {
                pre.remove();
                document.documentElement.style.overflow = prevOverflow;
            }, 500);
            return;
        }
        requestAnimationFrame(tick);
    };
    tick();
})();


document.addEventListener('DOMContentLoaded', function(){


// Подсветка активной страницы в меню
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('nav a').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
        link.classList.add('active');
    }
});


// мобильный меню-бар: динамически создаём бургер и side-menu только на мобилке,
// клонируем ссылки из <nav> — работает на всех страницах без правки HTML.
// На десктопе элементы вообще не попадают в DOM, чтобы не светиться под футером.
const navEl = document.querySelector('nav');
if (navEl && window.matchMedia('(max-width: 450px)').matches) {
    const burger = document.createElement('div');
    burger.className = 'burger';
    burger.innerHTML = '<span class="span1"></span><span class="span2"></span>';
    document.body.appendChild(burger);

    const sideMenu = document.createElement('div');
    sideMenu.className = 'side-menu';

    // крестик в правом верхнем углу меню
    const closeBtn = document.createElement('div');
    closeBtn.className = 'menu-close';
    closeBtn.setAttribute('aria-label', 'закрыть меню');
    sideMenu.appendChild(closeBtn);

    navEl.querySelectorAll('a').forEach(a => {
        sideMenu.appendChild(a.cloneNode(true));
    });
    document.body.appendChild(sideMenu);

    const setMenu = (open) => {
        burger.classList.toggle('active', open);
        sideMenu.classList.toggle('active', open);
    };

    closeBtn.addEventListener('click', () => setMenu(false));

    burger.addEventListener('click', () => {
        setMenu(!sideMenu.classList.contains('active'));
    });

    sideMenu.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => setMenu(false));
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setMenu(false);
    });
}


// payment.html — показ выбранного тарифа из ?tariff=, переключение способов оплаты,
// «Подписаться» переводит на 404.html (никакой реальной оплаты/сбора данных)
const paySection = document.querySelector('.pay_section');
if (paySection) {
    const params = new URLSearchParams(window.location.search);
    const wantedTariff = params.get('tariff') || 't1';
    const payCards = paySection.querySelectorAll('.pay_t');
    let shown = false;
    payCards.forEach(card => {
        if (card.dataset.tariff === wantedTariff) {
            card.classList.add('show');
            shown = true;
        }
    });
    // fallback: если по какой-то причине не нашли, показываем первый
    if (!shown && payCards[0]) payCards[0].classList.add('show');

    // переключение «Карта» / «iDEAL» — чисто визуально
    const methodBtns = paySection.querySelectorAll('.pay_method');
    methodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            methodBtns.forEach(b => b.classList.remove('pay_method_active'));
            btn.classList.add('pay_method_active');
        });
    });

    // «Подписаться» и «Pay» — переводят на 404.html
    paySection.querySelectorAll('.pay_submit, .pay_apple_btn').forEach(btn => {
        btn.addEventListener('click', () => {
            window.location.href = './404.html';
        });
    });

    // номер карты — делим по 4, максимум 12 цифр (формат XXXX XXXX XXXX)
    const cardInput = paySection.querySelector('input[placeholder="Номер карты"]');
    if (cardInput) {
        cardInput.setAttribute('type', 'text');
        cardInput.setAttribute('inputmode', 'numeric');
        cardInput.setAttribute('maxlength', '19'); // 12 цифр + 2 пробела
        cardInput.addEventListener('input', (e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
            const groups = digits.match(/.{1,4}/g);
            e.target.value = groups ? groups.join(' ') : '';
        });
    }

    // код безопасности — максимум 3 цифры
    const cvvInput = paySection.querySelector('input[placeholder="Код безопасности"]');
    if (cvvInput) {
        cvvInput.setAttribute('type', 'text');
        cvvInput.setAttribute('inputmode', 'numeric');
        cvvInput.setAttribute('maxlength', '3');
        cvvInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
        });
    }
}


// popup_community — закрывается крестиком, открывается кликом по «присоединиться» (.pc_)
const popupCommunity = document.querySelector('.popup_community');

if (popupCommunity) {
    // изначально скрыт (попап есть на events.html и community.html)
    popupCommunity.style.opacity = '0';
    popupCommunity.style.pointerEvents = 'none';

    const openPopup = () => {
        popupCommunity.style.opacity = '1';
        popupCommunity.style.pointerEvents = 'auto';
    };
    const closePopup = () => {
        popupCommunity.style.opacity = '0';
        popupCommunity.style.pointerEvents = 'none';
    };

    const popupCancel = popupCommunity.querySelector('.cancel');
    if (popupCancel) {
        popupCancel.addEventListener('click', closePopup);
    }

    // кнопка "готово" — закрывает попап, если все поля заполнены, иначе алерт
    const popupDone = popupCommunity.querySelector('.done');
    if (popupDone) {
        popupDone.style.cursor = 'pointer';
        popupDone.addEventListener('click', () => {
            const fields = popupCommunity.querySelectorAll('input, select');
            const allFilled = Array.from(fields).every(f => f.value.trim() !== '');
            if (allFilled) {
                closePopup();
            } else {
                alert('Необходимо заполнить все поля');
            }
        });
    }

    // «присоединиться» (.pc_) на community.html и афиши мероприятий (.ev_card) на events.html — открывают попап
    document.querySelectorAll('.pc_, .ev_card').forEach(trigger => {
        trigger.style.cursor = 'url(../img/curs3.svg) 0 0, auto';
        trigger.addEventListener('click', openPopup);
    });

}


// third_screen_adaptive — аккордеон артистов (мобилка index.html)
const adaptiveSection = document.querySelector('.third_screen_adaptive');
if (adaptiveSection) {
    const artNamesAdaptive = adaptiveSection.querySelectorAll('.h_art');
    artNamesAdaptive.forEach(name => {
        name.addEventListener('click', () => {
            const block = name.parentElement;
            if (!block) return;
            const wasOpen = block.classList.contains('open');
            // закрываем всё
            artNamesAdaptive.forEach(n => n.parentElement && n.parentElement.classList.remove('open'));
            // открываем кликнутый, если он был закрыт
            if (!wasOpen) block.classList.add('open');
        });
    });
}


// плавное увеличение картинки в a_blok1 (about.html) по скроллу
const aBlok1 = document.querySelector('.a_blok1');
const aBlok1Sticky = document.querySelector('.a_blok1_sticky');
// const aBlok1Img = aBlok1Sticky ? aBlok1Sticky.querySelector('img') : null;
const aBlok1Img = aBlok1Sticky ? aBlok1Sticky.querySelector('video') : null;

if (aBlok1 && aBlok1Sticky && aBlok1Img) {
    // целевые размеры начального состояния
    // const INIT_W_VW = 67.15;
    // const INIT_H_VW = 39.58;
    const INIT_W_VW = 120;
    const INIT_H_VW = 60;

    let initScaleX = 1, initScaleY = 1, initTranslateY = 0;

    // пересчитываем стартовый transform: масштаб до 67.15×39.58vw и сдвиг к центру блока
    const computeInitTransform = () => {
        const imgW = aBlok1Img.offsetWidth;
        const imgH = aBlok1Img.offsetHeight;
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        const targetW = winW * INIT_W_VW / 100;
        const targetH = winW * INIT_H_VW / 100;

        initScaleX = targetW / imgW;
        initScaleY = targetH / imgH;

        // центр картинки во flex-потоке относительно sticky (которая при активной анимации = viewport top)
        const imgFlexCenterY = aBlok1Img.offsetTop + imgH / 2;
        initTranslateY = winH / 2 - imgFlexCenterY;
    };

    const updateABlok1 = () => {
        const rect = aBlok1.getBoundingClientRect();
        const sectionHeight = aBlok1.offsetHeight;
        const windowHeight = window.innerHeight;
        const scrolled = -rect.top;
        const total = sectionHeight - windowHeight;
        const progress = Math.min(1, Math.max(0, scrolled / total));
        // прогресс 0 — картинка 67.15×39.58vw по центру; 1 — родной размер 22×9vw на flex-месте
        const sX = initScaleX + progress * (1 - initScaleX);
        const sY = initScaleY + progress * (1 - initScaleY);
        const tY = initTranslateY * (1 - progress);
        aBlok1Img.style.transform = `translate(0, ${tY}px) scale(${sX}, ${sY})`;
    };

    let tickingA1 = false;
    const onABlok1Scroll = () => {
        if (tickingA1) return;
        tickingA1 = true;
        requestAnimationFrame(() => {
            updateABlok1();
            tickingA1 = false;
        });
    };

    [window, document, document.body, document.documentElement].forEach(t => {
        t.addEventListener('scroll', onABlok1Scroll, { passive: true });
    });
    window.addEventListener('resize', () => {
        computeInitTransform();
        onABlok1Scroll();
    });
    window.addEventListener('load', () => {
        computeInitTransform();
        updateABlok1();
    });
    computeInitTransform();
    updateABlok1();
}


// анимация секции a_blok3 (about.html): у каждого слова свой блок,
// при переходе к следующему слову предыдущий блок уходит
const aBlok3 = document.querySelector('.a_blok3');
const aBlok3Sticky = document.querySelector('.a_blok3_sticky');
const valueImages = aBlok3 ? aBlok3.querySelectorAll('.value_image') : [];
const valueWords = aBlok3 ? aBlok3.querySelectorAll('.scroll_about > p') : [];

if (aBlok3 && aBlok3Sticky && valueImages.length && valueWords.length) {
    // ставим каждый блок так, чтобы его вертикальный центр совпадал с центром своего слова
    const positionImages = () => {
        const stickyRect = aBlok3Sticky.getBoundingClientRect();
        valueImages.forEach((img, i) => {
            const word = valueWords[i];
            if (!word) return;
            const wordRect = word.getBoundingClientRect();
            const wordCenterY = wordRect.top + wordRect.height / 2 - stickyRect.top;
            img.style.top = (wordCenterY - img.offsetHeight / 2) + 'px';
        });
    };

    const updateABlok3 = () => {
        const rect = aBlok3.getBoundingClientRect();
        const sectionHeight = aBlok3.offsetHeight;
        const windowHeight = window.innerHeight;
        const scrolled = -rect.top;
        const total = sectionHeight - windowHeight;
        const progress = Math.min(1, Math.max(0, scrolled / total));

        const n = valueWords.length;
        let activeIdx = Math.floor(progress * n);
        if (activeIdx >= n) activeIdx = n - 1;
        if (activeIdx < 0) activeIdx = 0;

        valueWords.forEach((w, i) => w.classList.toggle('active', i === activeIdx));

        // виден только блок активного слова — остальные уходят
        const inView = rect.bottom > 0 && rect.top < windowHeight;
        valueImages.forEach((img, i) => {
            img.style.opacity = (inView && i === activeIdx) ? '1' : '0';
        });
    };

    let tickingA = false;
    const onABlok3Scroll = () => {
        if (tickingA) return;
        tickingA = true;
        requestAnimationFrame(() => {
            updateABlok3();
            tickingA = false;
        });
    };

    const onABlok3Resize = () => {
        positionImages();
        onABlok3Scroll();
    };

    [window, document, document.body, document.documentElement].forEach(t => {
        t.addEventListener('scroll', onABlok3Scroll, { passive: true });
    });
    window.addEventListener('resize', onABlok3Resize);
    window.addEventListener('load', () => { positionImages(); updateABlok3(); });
    positionImages();
    updateABlok3();
}


// artists.html — sticky-список артистов: подсветка активного и показ его панели
const sArtists1 = document.querySelector('.s_artists1');
const artistsSticky = document.querySelector('.artists_sticky');
const artNames = sArtists1 ? sArtists1.querySelectorAll('.art') : [];
const artistPanels = sArtists1 ? sArtists1.querySelectorAll('.artist_panel') : [];

if (sArtists1 && artistsSticky && artNames.length && artistPanels.length) {
    // На мобилке переставляем каждую панель сразу после её имени —
    // тогда при раскрытии она появится прямо под именем, а не после всего списка.
    if (window.matchMedia('(max-width: 450px)').matches) {
        const aDiv = sArtists1.querySelector('.a_div');
        if (aDiv) {
            artNames.forEach((name, i) => {
                const panel = artistPanels[i];
                if (panel) aDiv.insertBefore(panel, name.nextSibling);
            });
        }
    }

    // Scroll-based активация — для десктопа и для мобилки одинаково
    const updateArtists = () => {
        const rect = sArtists1.getBoundingClientRect();
        const sectionHeight = sArtists1.offsetHeight;
        const windowHeight = window.innerHeight;
        const scrolled = -rect.top;
        const total = sectionHeight - windowHeight;
        const progress = Math.min(1, Math.max(0, scrolled / total));

        const n = artNames.length;
        let activeIdx = Math.floor(progress * n);
        if (activeIdx >= n) activeIdx = n - 1;
        if (activeIdx < 0) activeIdx = 0;

        artNames.forEach((name, i) => name.classList.toggle('active', i === activeIdx));
        artistPanels.forEach((panel, i) => panel.classList.toggle('active', i === activeIdx));
    };

    let tickingAr = false;
    const onArtistsScroll = () => {
        if (tickingAr) return;
        tickingAr = true;
        requestAnimationFrame(() => {
            updateArtists();
            tickingAr = false;
        });
    };

    [window, document, document.body, document.documentElement].forEach(t => {
        t.addEventListener('scroll', onArtistsScroll, { passive: true });
    });
    window.addEventListener('resize', onArtistsScroll);
    window.addEventListener('load', updateArtists);
    updateArtists();
}


// artists.html — клик по видео артиста (и по перекрывающей картинке .linear) переводит на 404.html
document.querySelectorAll('.artist_video, .linear').forEach(el => {
    el.style.cursor = 'url(../img/curs.svg) 0 0, auto';
    el.addEventListener('click', () => {
        window.location.href = './404.html';
    });
});


// events.html — интерактивная доска: курсор сдвигает слои с разной скоростью (параллакс)
const eventsBoard = document.querySelector('.events_board');
const evCards = eventsBoard ? eventsBoard.querySelectorAll('.ev_card') : [];

if (eventsBoard && evCards.length) {
    let targetX = 0, targetY = 0;
    let curX = 0, curY = 0;
    let rafId = null;

    eventsBoard.addEventListener('mousemove', (e) => {
        const rect = eventsBoard.getBoundingClientRect();
        targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;   // -1..1
        targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    });

    eventsBoard.addEventListener('mouseleave', () => {
        targetX = 0;
        targetY = 0;
    });

    const tick = () => {
        curX += (targetX - curX) * 0.07;
        curY += (targetY - curY) * 0.07;

        evCards.forEach(card => {
            const layer = parseFloat(card.dataset.layer) || 1;
            const factor = layer * 6;  // дальние слои двигаются меньше, ближние больше
            card.style.transform = `translate(${-curX * factor}vw, ${-curY * factor}vh)`;
        });

        rafId = requestAnimationFrame(tick);
    };
    tick();
}


// водим мышкой - картинки
    let arr = [
        "img/img_c1.png", // 0
        "img/img_c2.png", // 1
        "img/img_c3.png", // 2
        "img/img_c4.png", // 3
        "img/img_c5.png", // 4
    ];

        let block = document.querySelector(".seventh_screen");
        let rand, canvasPosition, canvasTop, canvasLeft;


        block.addEventListener("mousemove", function(e) {
    const rand = Math.floor(Math.random() * arr.length);
    const element = arr[rand];

    const canvasPosition = block.getBoundingClientRect();
    const canvasTop = canvasPosition.top;
    const canvasLeft = canvasPosition.left;

    const img = document.createElement("img");
    img.src = element;
    img.style.position = "absolute";
    img.style.left = `${e.clientX - canvasLeft}px`;
    img.style.top = `${e.clientY - canvasTop}px`;
    img.style.width = "10vw";
    img.style.height = "10vw";

    block.appendChild(img);

setTimeout(() => {
    img.style.opacity = "0";
}, 1000);

setTimeout(() => {
    img.remove();
}, 2000);
});

// вращение колеса слов в third_screen
const thirdScreen = document.querySelector('.third_screen');
const wordsWheel = document.querySelector('.words_wheel');
const wordDescription = document.querySelector('.word_description');
const artistPhotos = thirdScreen ? thirdScreen.querySelectorAll('.artist_photo') : [];

if (thirdScreen && wordsWheel && wordDescription) {
    const words = Array.from(wordsWheel.querySelectorAll('.word'));
    const ANGLE_STEP = 18;
    const Y_STEP = 9;

    const updateThirdScroll = () => {
        const rect = thirdScreen.getBoundingClientRect();
        const sectionHeight = thirdScreen.offsetHeight;
        const windowHeight = window.innerHeight;
        const scrolled = -rect.top;
        const total = sectionHeight - windowHeight;
        const progress = Math.min(1, Math.max(0, scrolled / total));
        const currentIndex = progress * (words.length - 1);

        words.forEach((word, i) => {
            const offset = i - currentIndex;
            const rotation = offset * ANGLE_STEP;
            const y = offset * Y_STEP;
            const dist = Math.abs(offset);
            const opacity = Math.max(0.15, 1 - dist * 0.3);
            const scale = Math.max(0.55, 1 - dist * 0.12);
            word.style.transform = `translateY(${y}vw) rotate(${rotation}deg) scale(${scale})`;
            word.style.opacity = opacity;
        });

        const centerIdx = Math.max(0, Math.min(words.length - 1, Math.round(currentIndex)));
        wordDescription.textContent = words[centerIdx].dataset.desc || '';
        const distFromCenter = Math.abs(currentIndex - centerIdx);
        const centerOpacity = Math.max(0, 1 - distFromCenter * 3);
        wordDescription.style.opacity = centerOpacity;

        // фото активного артиста появляется/исчезает вместе с описанием
        artistPhotos.forEach((photo, i) => {
            photo.style.opacity = (i === centerIdx) ? centerOpacity : 0;
        });
    };

    let ticking3 = false;
    const onThirdScroll = () => {
        if (ticking3) return;
        ticking3 = true;
        requestAnimationFrame(() => {
            updateThirdScroll();
            ticking3 = false;
        });
    };

    [window, document, document.body, document.documentElement].forEach(t => {
        t.addEventListener('scroll', onThirdScroll, { passive: true });
    });
    window.addEventListener('resize', onThirdScroll);
    window.addEventListener('load', updateThirdScroll);
    updateThirdScroll();
}


// горизонтальный скролл секции "мероприятия"
const fifthScreen = document.querySelector('.fifth_screen');
const eventsTrack = document.querySelector('.events_track');

if (fifthScreen && eventsTrack) {
    const updateEventsScroll = () => {
        const rect = fifthScreen.getBoundingClientRect();
        const sectionHeight = fifthScreen.offsetHeight;
        const windowHeight = window.innerHeight;
        const scrolled = -rect.top;
        const total = sectionHeight - windowHeight;
        const progress = Math.min(1, Math.max(0, scrolled / total));
        const trackWidth = eventsTrack.scrollWidth;
        const maxTranslate = Math.max(0, trackWidth - window.innerWidth);
        eventsTrack.style.transform = `translate(${-progress * maxTranslate}px, -50%)`;
    };

    let ticking = false;
    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            updateEventsScroll();
            ticking = false;
        });
    };

    // body может быть scroll-контейнером (из-за overflow-x: hidden + height: 100%),
    // поэтому слушаем на нескольких целях
    [window, document, document.body, document.documentElement].forEach(t => {
        t.addEventListener('scroll', onScroll, { passive: true });
    });
    window.addEventListener('resize', onScroll);
    window.addEventListener('load', updateEventsScroll);
    updateEventsScroll();
}

const burger = document.querySelector('.burger');
const menu = document.querySelector('.side-menu');

burger.addEventListener('click', () => {
    burger.classList.toggle('active');
    menu.classList.toggle('active');
});

});