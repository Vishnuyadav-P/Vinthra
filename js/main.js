(function(){
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // brand palette switcher: Builder (Dark) vs Career (Light)
  var PALETTE_KEY = 'vinthra-palette';
  var root = document.documentElement;
  var themeToggle = document.getElementById('theme-toggle');
  var currentPalette = 'builder';

  function applyPalette(name){
    if(name !== 'career') name = 'builder';
    currentPalette = name;
    root.setAttribute('data-palette', name);
    if(themeToggle){
      themeToggle.setAttribute('aria-checked', name === 'career' ? 'true' : 'false');
    }
    try{ localStorage.setItem(PALETTE_KEY, name); }catch(e){}
  }

  try{ currentPalette = localStorage.getItem(PALETTE_KEY) || 'builder'; }catch(e){}
  if(currentPalette !== 'career') currentPalette = 'builder';
  applyPalette(currentPalette);

  if(themeToggle){
    themeToggle.addEventListener('click', function(){
      var next = currentPalette === 'builder' ? 'career' : 'builder';
      applyPalette(next);
    });
  }

  // fixed-on-load, floating-pill-on-scroll header
  var topNav = document.getElementById('top-nav');
  if(topNav){
    var navTicking = false;
    var updateNavState = function(){
      topNav.classList.toggle('pill', window.scrollY > 12);
      navTicking = false;
    };
    updateNavState();
    window.addEventListener('scroll', function(){
      if(!navTicking){
        window.requestAnimationFrame(updateNavState);
        navTicking = true;
      }
    }, { passive: true });
  }

  // mobile nav toggle
  var navToggle = document.getElementById('nav-toggle');
  var navLinks = document.getElementById('nav-links');
  if(navToggle && navLinks){
    navToggle.addEventListener('click', function(){
      var open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.querySelectorAll('a').forEach(function(link){
      link.addEventListener('click', function(){
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // scroll reveal — safe default (visible); JS opts elements into pre-reveal then animates in
  if(!reduced && 'IntersectionObserver' in window){
    var revealEls = document.querySelectorAll('.reveal');
    revealEls.forEach(function(el){ el.classList.add('pre-reveal'); });
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.remove('pre-reveal');
          io.unobserve(entry.target);
        }
      });
    }, {threshold:0.15, rootMargin:'0px 0px -60px 0px'});
    revealEls.forEach(function(el){ io.observe(el); });
  }

  // hero deck parallax tilt
  var deck = document.getElementById('deck');
  var hero = document.querySelector('.hero');
  if(deck && hero && !reduced){
    hero.addEventListener('mousemove', function(e){
      if(deck.dataset.dragging === 'true') return;
      var r = hero.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      deck.style.transform = 'rotateY(' + (px*16) + 'deg) rotateX(' + (py*-14) + 'deg)';
    });
    hero.addEventListener('mouseleave', function(){
      deck.style.transform = 'rotateY(0deg) rotateX(0deg)';
    });
  }

  // interactive hero cards: draggable + tap to move back
  if(deck){
    var cardEls = Array.prototype.slice.call(deck.querySelectorAll('.deck-card'));

    var SLOTS = [
      { fan: 'rotate(-11deg) translate(-52px, 14px) translateZ(72px)', delay: '0s', zIndex: 4 },
      { fan: 'rotate(-3.5deg) translate(-16px, 4px) translateZ(48px)', delay: '1.4s', zIndex: 3 },
      { fan: 'rotate(4deg) translate(18px, -2px) translateZ(24px)', delay: '0.7s', zIndex: 2 },
      { fan: 'rotate(11.5deg) translate(54px, 10px) translateZ(0px)', delay: '2.1s', zIndex: 1 }
    ];

    var cardStates = cardEls.map(function(el, i){
      return {
        el: el,
        slot: i,
        isMoved: false,
        dragX: 0,
        dragY: 0
      };
    });

    function moveCardBack(state){
      var slotData = SLOTS[state.slot];
      state.el.classList.add('is-returning');
      state.el.style.transform = slotData.fan;
      state.el.title = 'Drag to move · Tap to move back';
      setTimeout(function(){
        state.isMoved = false;
        state.dragX = 0;
        state.dragY = 0;
        state.el.classList.remove('is-moved');
        state.el.classList.remove('is-returning');
        state.el.style.transform = '';
        state.el.style.zIndex = slotData.zIndex;
      }, reduced ? 20 : 420);
    }

    function cycleCardToBack(tappedState){
      var tappedSlot = tappedState.slot;
      tappedState.el.classList.add('is-cycling');
      tappedState.el.style.transform = 'translate3d(45px, -24px, 90px) ' + SLOTS[tappedSlot].fan;

      setTimeout(function(){
        cardStates.forEach(function(s){
          if(tappedSlot < 3){
            // Card moves to back slot 3, cards behind it shift forward
            if(s === tappedState){
              s.slot = 3;
            } else if(s.slot > tappedSlot){
              s.slot = s.slot - 1;
            }
          } else {
            // Tapped back card moves to front slot 0
            if(s === tappedState){
              s.slot = 0;
            } else {
              s.slot = s.slot + 1;
            }
          }
        });

        cardStates.forEach(function(s){
          if(!s.isMoved){
            var sd = SLOTS[s.slot];
            s.el.style.setProperty('--fan', sd.fan);
            s.el.style.setProperty('--delay', sd.delay);
            s.el.style.zIndex = sd.zIndex;
            s.el.classList.add('is-cycling');
            s.el.style.transform = sd.fan;
            setTimeout(function(){
              s.el.classList.remove('is-cycling');
              s.el.style.transform = '';
            }, reduced ? 20 : 380);
          }
        });
      }, reduced ? 20 : 160);
    }

    var activeState = null;
    var pointerId = null;
    var startX = 0, startY = 0;
    var initialDragX = 0, initialDragY = 0;
    var hasMoved = false;

    cardStates.forEach(function(state){
      var el = state.el;
      el.title = 'Drag to move · Tap to move back';

      el.addEventListener('pointerdown', function(e){
        if(e.button !== 0 && e.pointerType === 'mouse') return;
        activeState = state;
        pointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        initialDragX = state.dragX;
        initialDragY = state.dragY;
        hasMoved = false;

        try{ el.setPointerCapture(pointerId); }catch(err){}
        deck.dataset.dragging = 'true';
        el.classList.add('is-dragging');
        el.classList.remove('is-returning');
        el.classList.remove('is-cycling');
        el.style.zIndex = '100';
      });

      el.addEventListener('pointermove', function(e){
        if(!activeState || activeState !== state) return;
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        if(!hasMoved && Math.hypot(dx, dy) > 5){
          hasMoved = true;
        }
        if(hasMoved){
          var curX = Math.max(-180, Math.min(180, initialDragX + dx));
          var curY = Math.max(-80, Math.min(80, initialDragY + dy));
          var slotData = SLOTS[state.slot];
          el.style.transform = 'translate3d(' + curX + 'px, ' + curY + 'px, 30px) ' + slotData.fan;
        }
      });

      function handlePointerEnd(e){
        if(!activeState || activeState !== state) return;
        try{ el.releasePointerCapture(pointerId); }catch(err){}
        deck.dataset.dragging = 'false';
        el.classList.remove('is-dragging');

        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        var dist = Math.hypot(dx, dy);

        if(hasMoved && dist > 5){
          var finalX = Math.max(-180, Math.min(180, initialDragX + dx));
          var finalY = Math.max(-80, Math.min(80, initialDragY + dy));
          if(Math.hypot(finalX, finalY) < 15){
            moveCardBack(state);
          } else {
            state.dragX = finalX;
            state.dragY = finalY;
            state.isMoved = true;
            el.classList.add('is-moved');
            el.style.zIndex = '50';
            el.title = 'Tap to move back to deck';
          }
        } else {
          if(state.isMoved){
            moveCardBack(state);
          } else {
            cycleCardToBack(state);
          }
        }

        activeState = null;
        pointerId = null;
      }

      el.addEventListener('pointerup', handlePointerEnd);
      el.addEventListener('pointercancel', handlePointerEnd);
    });
  }

  // domain card tilt + glare
  if(!reduced){
    document.querySelectorAll('.domain-card.tilt').forEach(function(card){
      card.addEventListener('mousemove', function(e){
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        var rx = (py - 0.5) * -12;
        var ry = (px - 0.5) * 12;
        card.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-4px)';
        card.style.setProperty('--mx', (px*100) + '%');
        card.style.setProperty('--my', (py*100) + '%');
      });
      card.addEventListener('mouseleave', function(){
        card.style.transform = 'rotateX(0deg) rotateY(0deg) translateY(0)';
      });
    });
  }
})();
