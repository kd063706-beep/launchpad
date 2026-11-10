/* ============================================================
   LaunchPad — интерактив (vanilla JS, без библиотек)
   ============================================================ */
(function () {
  'use strict';

  var HEADER_OFFSET = 72;
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function safeTop() {
    // Вырез/notch сверху: учитываем в отступе для якорей, если браузер поддерживает env()
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;top:0;height:env(safe-area-inset-top);';
    document.body.appendChild(probe);
    var value = probe.getBoundingClientRect().height || 0;
    probe.remove();
    return value;
  }

  var TOP_INSET = safeTop();

  /* ---------------- 1. Шапка при скролле ---------------- */

  var header = document.getElementById('site-header');

  function syncHeader() {
    if (!header) return;
    header.classList.toggle('is-stuck', window.scrollY > 12);
  }

  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  /* ---------------- 2. Мобильное меню ---------------- */

  var burger = document.getElementById('burger');
  var mobileMenu = document.getElementById('mobile-menu');

  function setMenu(open) {
    if (!burger || !mobileMenu) return;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    mobileMenu.classList.toggle('is-open', open);
    document.body.classList.toggle('is-locked', open);
  }

  function isMenuOpen() {
    return burger && burger.getAttribute('aria-expanded') === 'true';
  }

  if (burger && mobileMenu) {
    burger.addEventListener('click', function () {
      setMenu(!isMenuOpen());
    });

    mobileMenu.addEventListener('click', function (event) {
      if (event.target.closest('a')) setMenu(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isMenuOpen()) {
        setMenu(false);
        burger.focus();
      }
    });

    document.addEventListener('click', function (event) {
      if (!isMenuOpen()) return;
      if (event.target.closest('#mobile-menu, #burger')) return;
      setMenu(false);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1040) setMenu(false);
    });
  }

  /* ---------------- 3. Плавный скролл + активный пункт ---------------- */

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
  var sections = navLinks
    .map(function (link) {
      var id = link.getAttribute('href');
      return id && id.charAt(0) === '#' ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  function smoothScrollTo(targetY, duration) {
    var startY = window.scrollY;
    var distance = targetY - startY;
    var startTime = null;

    if (prefersReduced) {
      window.scrollTo(0, targetY);
      return;
    }

    function animation(currentTime) {
      if (startTime === null) startTime = currentTime;
      var timeElapsed = currentTime - startTime;
      var progress = Math.min(timeElapsed / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 3);

      window.scrollTo(0, startY + distance * ease);

      if (progress < 1) {
        window.requestAnimationFrame(animation);
      }
    }

    window.requestAnimationFrame(animation);
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;

    var hash = link.getAttribute('href');
    if (!hash || hash === '#') return;

    var target = document.querySelector(hash);
    if (!target) return;

    event.preventDefault();
    setMenu(false);

    var top = target.getBoundingClientRect().top + window.scrollY;
    var offset = hash === '#hero' ? 0 : HEADER_OFFSET + TOP_INSET + 16;
    var targetTop = Math.max(top - offset, 0);

    smoothScrollTo(targetTop, 750);

    if (history.replaceState) history.replaceState(null, '', hash);
  });

  if ('IntersectionObserver' in window && sections.length) {
    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (link) {
            link.classList.toggle(
              'is-active',
              link.getAttribute('href') === '#' + entry.target.id
            );
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );

    sections.forEach(function (section) {
      navObserver.observe(section);
    });
  }


  /* ---------------- 4. Появление блоков при скролле ---------------- */

  var revealItems = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if (!prefersReduced && 'IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    revealItems.forEach(function (item, index) {
      // Задержку задаём только там, где её не проставили в разметке
      if (!item.style.getPropertyValue('--reveal-delay')) {
        item.style.setProperty('--reveal-delay', (index % 4) * 90 + 'ms');
      }
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add('is-in');
    });
  }

  /* ---------------- 4b. Прогресс чтения + кнопка «наверх» ---------------- */

  var progressBar = document.getElementById('scroll-progress');
  var toTop = document.getElementById('to-top');
  var docHeight = 0;
  var ticking = false;

  function measure() {
    docHeight = document.documentElement.scrollHeight - window.innerHeight;
  }

  function applyScrollEffects() {
    var y = window.scrollY || window.pageYOffset;

    if (progressBar) {
      var ratio = docHeight > 0 ? Math.min(y / docHeight, 1) : 0;
      progressBar.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
    }

    if (toTop) {
      toTop.classList.toggle('is-visible', y > window.innerHeight * 0.6);
    }

    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(applyScrollEffects);
  }

  measure();
  applyScrollEffects();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    measure();
    onScroll();
  });

  if (toTop) {
    toTop.addEventListener('click', function () {
      smoothScrollTo(0, 600);
      if (history.replaceState) history.replaceState(null, '', '#hero');
    });
  }

  /* ---------------- 5. Аккордеон «Что делаем» ---------------- */

  var services = Array.prototype.slice.call(document.querySelectorAll('.service'));

  services.forEach(function (service) {
    var head = service.querySelector('.service__head');
    if (!head) return;

    head.addEventListener('click', function () {
      var willOpen = service.getAttribute('data-open') !== 'true';

      services.forEach(function (other) {
        var otherHead = other.querySelector('.service__head');
        var opening = other === service && willOpen;
        other.setAttribute('data-open', String(opening));
        if (otherHead) otherHead.setAttribute('aria-expanded', String(opening));
      });
    });
  });

  /* ---------------- 6. Движение карточек работ под курсором ---------------- */

  var workCards = Array.prototype.slice.call(document.querySelectorAll('.work'));

  if (workCards.length && finePointer && !prefersReduced) {
    workCards.forEach(function (card) {
      var targetX = 0;
      var targetY = 0;
      var currentX = 0;
      var currentY = 0;
      var running = false;

      var loop = function () {
        currentX += (targetX - currentX) * 0.09;
        currentY += (targetY - currentY) * 0.09;

        card.style.transform =
          'translate3d(' + currentX.toFixed(2) + 'px,' + currentY.toFixed(2) + 'px,0)';

        if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
          window.requestAnimationFrame(loop);
        } else {
          running = false;
        }
      };

      var start = function () {
        if (running) return;
        running = true;
        window.requestAnimationFrame(loop);
      };

      card.addEventListener('mousemove', function (event) {
        var rect = card.getBoundingClientRect();
        targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 14;
        targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
        start();
      });

      card.addEventListener('mouseleave', function () {
        targetX = 0;
        targetY = 0;
        start();
      });
    });
  }



  /* ---------------- 6b. Spotlight под курсором на карточках ---------------- */

  var spotCards = Array.prototype.slice.call(
    document.querySelectorAll('.glass-card, .step, .factor, .stack-category, .pricing__foot')
  );

  if (spotCards.length && finePointer && !prefersReduced) {
    spotCards.forEach(function (card) {
      var frame = 0;

      card.addEventListener('mousemove', function (event) {
        if (frame) return;
        frame = window.requestAnimationFrame(function () {
          var rect = card.getBoundingClientRect();
          card.style.setProperty('--spot-x', (event.clientX - rect.left) + 'px');
          card.style.setProperty('--spot-y', (event.clientY - rect.top) + 'px');
          frame = 0;
        });
      });

      card.addEventListener('mouseleave', function () {
        if (frame) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        }
        card.style.removeProperty('--spot-x');
        card.style.removeProperty('--spot-y');
      });
    });
  }

  /* ---------------- 7. Год в подвале ---------------- */

  var yearNode = document.getElementById('year');
  if (yearNode) yearNode.textContent = String(new Date().getFullYear());
})();
