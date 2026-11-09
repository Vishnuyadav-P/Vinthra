(function(){
  'use strict';

  var root = document.documentElement;
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* =====================================================================
     Screen profile
     The <head> script reads the screen before first paint and sets
     data-screen / data-input / data-orientation on <html>. Here we keep
     that profile current (resize, rotation, plugging in a mouse) and let
     the interactive parts re-render for the new screen.
     ===================================================================== */
  var readScreen = window.vinthraScreen || function(){};
  var screenListeners = [];
  function onScreenChange(fn){ screenListeners.push(fn); }
  function isDesktopNav(){ return window.innerWidth >= 1024; }

  var lastProfile = profileKey();
  function profileKey(){
    return root.getAttribute('data-screen') + '|' + root.getAttribute('data-input') + '|' + root.getAttribute('data-orientation');
  }
  var resizeQueued = false;
  function handleResize(){
    resizeQueued = false;
    readScreen();
    var key = profileKey();
    var changed = key !== lastProfile;
    lastProfile = key;
    screenListeners.forEach(function(fn){ fn(changed); });
  }
  function queueResize(){
    if(resizeQueued) return;
    resizeQueued = true;
    window.requestAnimationFrame(handleResize);
  }
  window.addEventListener('resize', queueResize, { passive: true });
  window.addEventListener('orientationchange', queueResize);
  if(window.matchMedia){
    var mouseQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    if(mouseQuery.addEventListener) mouseQuery.addEventListener('change', queueResize);
    else if(mouseQuery.addListener) mouseQuery.addListener(queueResize);
  }

  /* =====================================================================
     Theme (light / dark)
     ===================================================================== */
  var THEME_KEY = 'vinthra-theme';
  var themeBtn = document.getElementById('theme-toggle');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var userChoseTheme = false;
  try{ userChoseTheme = !!localStorage.getItem(THEME_KEY); }catch(e){}

  function applyTheme(theme, save){
    theme = theme === 'light' ? 'light' : 'dark';
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-palette', theme === 'dark' ? 'builder' : 'career');
    if(themeBtn){
      themeBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      themeBtn.setAttribute('title', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
    if(themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#0A0F1C' : '#F8FAFC');
    if(save){
      userChoseTheme = true;
      try{
        localStorage.setItem(THEME_KEY, theme);
        localStorage.setItem('vinthra-palette', theme === 'dark' ? 'builder' : 'career');
      }catch(e){}
    }
  }
  applyTheme(root.getAttribute('data-theme') || (root.getAttribute('data-palette') === 'career' ? 'light' : 'dark'), false);
  if(themeBtn){
    themeBtn.addEventListener('click', function(){
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  }
  // follow the device's light/dark setting until the visitor picks one themselves
  if(window.matchMedia){
    var schemeQuery = window.matchMedia('(prefers-color-scheme: light)');
    var onScheme = function(e){ if(!userChoseTheme) applyTheme(e.matches ? 'light' : 'dark', false); };
    if(schemeQuery.addEventListener) schemeQuery.addEventListener('change', onScheme);
    else if(schemeQuery.addListener) schemeQuery.addListener(onScheme);
  }

  /* =====================================================================
     Navigation
     ===================================================================== */
  var nav = document.getElementById('top-nav');
  var navToggle = document.getElementById('nav-toggle');
  var navLinks = document.getElementById('nav-links');

  // Active section tracking (scrollspy)
  var navLinksUl = navLinks ? navLinks.querySelector('ul') : null;
  var spyItems = [];
  if(navLinksUl){
    navLinksUl.querySelectorAll('a[href^="#"]').forEach(function(a){
      var id = a.getAttribute('href').slice(1);
      var sec = document.getElementById(id);
      if(sec) spyItems.push({ id: id, link: a, sec: sec });
    });
  }

  function updateSpy(){
    if(!spyItems.length) return;
    var scrollY = window.scrollY || window.pageYOffset || 0;
    var vh = window.innerHeight || 800;
    var docHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    var navH = (nav && nav.offsetHeight) || 68;
    var readingLine = navH + 80;

    var currentId = '';

    // If user has scrolled near the bottom of the page, activate the last section
    if(vh + scrollY >= docHeight - 80){
      currentId = spyItems[spyItems.length - 1].id;
    } else {
      for(var i = 0; i < spyItems.length; i++){
        var rect = spyItems[i].sec.getBoundingClientRect();
        if(rect.top <= readingLine && rect.bottom > readingLine){
          currentId = spyItems[i].id;
          break;
        }
      }
    }

    spyItems.forEach(function(item){
      var active = item.id === currentId;
      item.link.classList.toggle('is-active', active);
      if(active) item.link.setAttribute('aria-current', 'location');
      else item.link.removeAttribute('aria-current');
    });
  }

  if(nav){
    var navTicking = false;
    var updateNav = function(){
      var isScrolled = window.scrollY > 20;
      nav.classList.toggle('pill', isScrolled); // vinthra.vercel.app style floating pill
      nav.classList.toggle('scrolled', isScrolled);
      updateSpy();
      navTicking = false;
    };
    updateNav();
    window.addEventListener('scroll', function(){
      if(!navTicking){ navTicking = true; window.requestAnimationFrame(updateNav); }
    }, { passive: true });
    window.addEventListener('resize', updateSpy, { passive: true });
    window.addEventListener('hashchange', function(){ setTimeout(updateSpy, 50); });
  }

  function isMenuOpen(){ return !!navLinks && navLinks.classList.contains('open'); }
  function setMenu(open, focusFirst){
    if(!navLinks || !navToggle) return;
    navLinks.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if(open && focusFirst){
      var firstLink = navLinks.querySelector('a');
      if(firstLink) firstLink.focus();
    }
  }
  if(navToggle && navLinks){
    navToggle.addEventListener('click', function(e){
      e.stopPropagation();
      setMenu(!isMenuOpen(), true);
    });
    navLinks.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        setMenu(false, false);
        if(a.hash){
          var targetId = a.hash.slice(1);
          spyItems.forEach(function(item){
            var active = item.id === targetId;
            item.link.classList.toggle('is-active', active);
            if(active) item.link.setAttribute('aria-current', 'location');
            else item.link.removeAttribute('aria-current');
          });
        }
      });
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && isMenuOpen()){ setMenu(false, false); navToggle.focus(); }
    });
    document.addEventListener('click', function(e){
      if(isMenuOpen() && nav && !nav.contains(e.target)) setMenu(false, false);
    });
    onScreenChange(function(){ if(isDesktopNav() && isMenuOpen()) setMenu(false, false); });
  }

  /* =====================================================================
     Scroll reveal — content is visible by default; JS opts it into a fade-up
     ===================================================================== */
  if(!reduced && 'IntersectionObserver' in window){
    var revealEls = document.querySelectorAll('.reveal');
    revealEls.forEach(function(el){
      var siblings = Array.prototype.filter.call(el.parentElement.children, function(c){ return c.classList.contains('reveal'); });
      el.style.setProperty('--i', Math.min(siblings.indexOf(el), 5));
      el.classList.add('pre-reveal');
    });
    var revealIO = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.remove('pre-reveal');
          revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function(el){ revealIO.observe(el); });
  }

  /* =====================================================================
     Sessions marquee — scroll speed adapted to the screen size
     ===================================================================== */
  var marqueeTrack = document.querySelector('.marquee-track');
  function tuneMarquee(){
    if(!marqueeTrack || !marqueeTrack.firstElementChild) return;
    var s = root.getAttribute('data-screen');
    var pxPerSecond = (s === 'xs' || s === 'sm') ? 36 : s === 'md' ? 46 : 58;
    var seconds = Math.max(14, Math.round((marqueeTrack.firstElementChild.offsetWidth + 12) / pxPerSecond));
    marqueeTrack.style.setProperty('--marquee-dur', seconds + 's');
  }
  tuneMarquee();
  onScreenChange(function(changed){ if(changed) tuneMarquee(); });
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(tuneMarquee);

  /* =====================================================================
     Hero card deck
     Optimised so the browser only ever moves already-painted layers:
     - the idle float is a CSS animation of the `translate` property, which is
       independent of the card's `transform`, so shuffling/dragging never has to
       stop it (no jump) and it never triggers layout or paint
     - shuffling just writes each card's new position; a CSS transition glides it there
     - drag and tilt writes are batched to one per animation frame
     - the float pauses while the deck is off screen
     ===================================================================== */
  var deck = document.getElementById('deck');
  var hero = document.querySelector('.hero');

  if(deck){
    var cardEls = Array.prototype.slice.call(deck.querySelectorAll('.deck-card'));
    // relative fan: rotation, share of the horizontal spread, vertical offset, depth
    var FAN = [
      { rot: -10, x: -1.00, y: 14, z: 72 },
      { rot: -3,  x: -0.32, y: 4,  z: 48 },
      { rot: 4,   x: 0.36,  y: -2, z: 24 },
      { rot: 11,  x: 1.04,  y: 10, z: 0  }
    ];
    var SLOTS = [];
    var limitX = 160, limitY = 70;
    var cards = cardEls.map(function(el, i){ return { el: el, slot: i, moved: false, x: 0, y: 0 }; });

    // fan width follows the real card size and the space this screen gives the deck
    function buildSlots(){
      var cardW = cardEls[0].offsetWidth || 212;
      var cardH = cardEls[0].offsetHeight || 276;
      var avail = deck.clientWidth || cardW * 1.6;
      var a = 11 * Math.PI / 180;
      var rotExtra = (cardW * Math.cos(a) + cardH * Math.sin(a) - cardW) / 2;
      var spread = Math.max(14, Math.min(avail / 2 - cardW / 2 - rotExtra - 6, cardW * 0.27));

      // The tilted outer cards swing down and to the sides, which leaves the fan as a whole
      // off-centre. Find the box around all four cards as drawn (nearer cards appear slightly
      // larger), then shift the fan so that box sits in the exact centre of the deck.
      var perspective = parseFloat(getComputedStyle(deck.parentNode).perspective) || 1400;
      var left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
      FAN.forEach(function(f){
        var rad = f.rot * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
        var scale = perspective / (perspective - f.z);
        var cx = (f.x * spread * cos - f.y * sin) * scale;
        var cy = (f.x * spread * sin + f.y * cos) * scale;
        var halfW = (cardW * Math.abs(cos) + cardH * Math.abs(sin)) / 2 * scale;
        var halfH = (cardW * Math.abs(sin) + cardH * Math.abs(cos)) / 2 * scale;
        left = Math.min(left, cx - halfW); right = Math.max(right, cx + halfW);
        top = Math.min(top, cy - halfH); bottom = Math.max(bottom, cy + halfH);
      });
      var centre = 'translate(' + Math.round(-(left + right) / 2) + 'px, ' + Math.round(-(top + bottom) / 2) + 'px) ';

      SLOTS = FAN.map(function(f, i){
        return {
          fan: centre + 'rotate(' + f.rot + 'deg) translate(' + Math.round(f.x * spread) + 'px, ' + f.y + 'px) translateZ(' + f.z + 'px)',
          z: FAN.length - i
        };
      });
      limitX = Math.max(60, Math.round(avail / 2 - cardW / 4));
      limitY = Math.max(40, Math.round((deck.clientHeight || cardH) * 0.22));
    }
    function clampX(v){ return Math.max(-limitX, Math.min(limitX, v)); }
    function clampY(v){ return Math.max(-limitY, Math.min(limitY, v)); }

    // one place that writes a card's styles. The position goes straight into `transform`
    // (not a CSS variable), so only that one element is restyled; CSS transitions the glide.
    function render(c, liftedTransform){
      var s = SLOTS[c.slot];
      c.el.style.zIndex = c.moved ? 50 : s.z;
      c.el.style.transform = liftedTransform ||
        (c.moved ? 'translate3d(' + c.x + 'px, ' + c.y + 'px, 30px) ' + s.fan : s.fan);
    }
    function layoutDeck(){
      buildSlots();
      cards.forEach(function(c){
        if(c.moved){ c.x = clampX(c.x); c.y = clampY(c.y); }
        render(c);
      });
    }
    // first layout: place the cards instantly (no glide from the CSS fallback positions)
    deck.classList.add('is-settling');
    layoutDeck();
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ deck.classList.remove('is-settling'); }); });
    onScreenChange(layoutDeck); // later screen changes glide the cards to their new fan
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(layoutDeck);

    // tap: lift the card, then every card glides to its new slot (CSS transition on transform)
    var shuffling = false;
    function shuffle(tapped){
      if(shuffling) return;
      shuffling = true;
      var from = tapped.slot, last = SLOTS.length - 1;
      render(tapped, 'translate3d(36px, -26px, 96px) ' + SLOTS[from].fan);
      setTimeout(function(){
        cards.forEach(function(c){
          if(from < last){
            if(c === tapped) c.slot = last;          // tapped card goes to the back
            else if(c.slot > from) c.slot -= 1;
          } else {
            if(c === tapped) c.slot = 0;             // back card comes to the front
            else c.slot += 1;
          }
        });
        cards.forEach(function(c){ if(!c.moved) render(c); });
        setTimeout(function(){ shuffling = false; }, reduced ? 0 : 320);
      }, reduced ? 0 : 150);
    }

    // drag: pointer writes are batched to one per frame
    var active = null, pointerId = null, dragging = false;
    var startX = 0, startY = 0, baseX = 0, baseY = 0, lastX = 0, lastY = 0, frame = 0;
    function paintDrag(){
      frame = 0;
      if(!active || !dragging) return;
      active.el.style.transform = 'translate3d(' + clampX(baseX + lastX - startX) + 'px, ' +
        clampY(baseY + lastY - startY) + 'px, 30px) ' + SLOTS[active.slot].fan;
    }
    function endDrag(){
      if(frame){ cancelAnimationFrame(frame); frame = 0; }
      try{ active.el.releasePointerCapture(pointerId); }catch(err){}
      active.el.classList.remove('is-dragging');
      deck.dataset.dragging = 'false';
    }

    cards.forEach(function(c){
      var el = c.el;

      // Keyboard alternative for the tap/drag interaction: Enter or Space shuffles,
      // and pressing it again returns a card that was moved by pointer input.
      el.addEventListener('keydown', function(e){
        if(e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        if(shuffling) return;
        if(c.moved){
          c.moved = false; c.x = 0; c.y = 0;
          el.classList.remove('is-moved');
          render(c);
        }else{
          shuffle(c);
        }
      });

      el.addEventListener('pointerdown', function(e){
        if(e.pointerType === 'mouse' && e.button !== 0) return;
        active = c; pointerId = e.pointerId; dragging = false;
        startX = lastX = e.clientX; startY = lastY = e.clientY;
        baseX = c.x; baseY = c.y;
        try{ el.setPointerCapture(pointerId); }catch(err){}
      });

      el.addEventListener('pointermove', function(e){
        if(active !== c) return;
        lastX = e.clientX; lastY = e.clientY;
        if(!dragging && Math.hypot(lastX - startX, lastY - startY) > 6){
          // lift only once it is really a drag (not a tap, not a page-scroll swipe)
          dragging = true;
          deck.dataset.dragging = 'true';
          el.classList.add('is-dragging');
          el.style.zIndex = 100;
        }
        if(dragging && !frame) frame = requestAnimationFrame(paintDrag);
      });

      el.addEventListener('pointerup', function(e){
        if(active !== c) return;
        var wasDragging = dragging;
        endDrag();
        if(wasDragging){
          var fx = clampX(baseX + e.clientX - startX), fy = clampY(baseY + e.clientY - startY);
          c.moved = Math.hypot(fx, fy) >= 15;
          c.x = c.moved ? fx : 0; c.y = c.moved ? fy : 0;
          el.classList.toggle('is-moved', c.moved);
          render(c);                                   // glides into place
        } else if(c.moved){
          c.moved = false; c.x = 0; c.y = 0;           // tap a moved card: back to the deck
          el.classList.remove('is-moved');
          render(c);
        } else {
          shuffle(c);
        }
        active = null; pointerId = null; dragging = false;
      });

      // the browser took over the gesture (e.g. the visitor began scrolling): undo, not a tap
      el.addEventListener('pointercancel', function(){
        if(active !== c) return;
        var wasDragging = dragging;
        endDrag();
        if(wasDragging) render(c);
        active = null; pointerId = null; dragging = false;
      });
    });

    // pause the idle float while the deck is off screen
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(entries){
        deck.classList.toggle('is-idle', !entries[0].isIntersecting);
      }).observe(deck);
    }

    // gentle 3D tilt that follows the mouse (large screens, mouse only).
    // Eased in a single animation-frame loop (one write per frame, stops as soon as it settles)
    // rather than restarting a CSS transition on every mouse move — measured ~1/3 less style work.
    if(hero && !reduced){
      var tiltX = 0, tiltY = 0, aimX = 0, aimY = 0, tiltFrame = 0;
      var stepTilt = function(){
        tiltX += (aimX - tiltX) * 0.18;
        tiltY += (aimY - tiltY) * 0.18;
        if(Math.abs(aimX - tiltX) < 0.05 && Math.abs(aimY - tiltY) < 0.05){ tiltX = aimX; tiltY = aimY; }
        deck.style.transform = (tiltX || tiltY) ? 'rotateY(' + tiltX.toFixed(2) + 'deg) rotateX(' + tiltY.toFixed(2) + 'deg)' : '';
        var settled = tiltX === aimX && tiltY === aimY;
        tiltFrame = settled ? 0 : requestAnimationFrame(stepTilt);
        if(settled) deck.classList.remove('is-tilting'); // float resumes once the tilt settles
      };
      var aimTilt = function(x, y){
        aimX = x; aimY = y;
        if(!tiltFrame){
          deck.classList.add('is-tilting');
          tiltFrame = requestAnimationFrame(stepTilt);
        }
      };
      hero.addEventListener('pointermove', function(e){
        if(e.pointerType !== 'mouse' || dragging || !isDesktopNav()) return;
        var r = hero.getBoundingClientRect();
        aimTilt(((e.clientX - r.left) / r.width - 0.5) * 14, ((e.clientY - r.top) / r.height - 0.5) * -12);
      });
      hero.addEventListener('pointerleave', function(e){
        if(e.pointerType === 'mouse') aimTilt(0, 0);
      });
    }
  }
})();
