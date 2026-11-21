(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* Theme */
  var saved = store.get('sk-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', saved);
  $('theme').onclick = function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    store.set('sk-theme', next);
  };

  /* Tabs with sliding pill */
  var tabBtns = document.querySelectorAll('#tabs button');
  function movePill(b) {
    $('pill').style.left = b.offsetLeft + 'px';
    $('pill').style.width = b.offsetWidth + 'px';
  }
  tabBtns.forEach(function (b) {
    b.onclick = function () {
      tabBtns.forEach(function (x) { x.classList.remove('on'); });
      document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('on'); });
      b.classList.add('on');
      $(b.dataset.t).classList.add('on');
      movePill(b);
    };
  });
  window.addEventListener('load', function () { movePill(document.querySelector('#tabs .on')); });
  window.addEventListener('resize', function () { movePill(document.querySelector('#tabs .on')); });

  /* Count-up animation */
  function countUp(el, to, decimals) {
    var start = performance.now(), dur = 900;
    (function step(now) {
      var t = Math.min((now - start) / dur, 1), e = 1 - Math.pow(1 - t, 3);
      el.textContent = (to * e).toFixed(decimals);
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }

  /* CGPA */
  var list = $('subjects');
  function addRow(n, c, g) {
    var d = document.createElement('div');
    d.className = 'row';
    d.innerHTML = '<input placeholder="Subject" aria-label="Subject name">' +
      '<input type="number" min="0" placeholder="Credits" aria-label="Credits">' +
      '<input type="number" min="0" max="10" step="0.1" placeholder="Grade pt" aria-label="Grade points">' +
      '<button class="x" aria-label="Remove subject">&times;</button>';
    var i = d.querySelectorAll('input');
    i[0].value = n || ''; i[1].value = c || ''; i[2].value = g || '';
    d.querySelector('.x').onclick = function () { d.remove(); persist(); };
    d.addEventListener('input', persist);
    list.appendChild(d);
  }
  function persist() {
    var data = [];
    list.querySelectorAll('.row').forEach(function (r) {
      var i = r.querySelectorAll('input');
      data.push([i[0].value, i[1].value, i[2].value]);
    });
    store.set('sk-subjects', JSON.stringify(data));
  }
  var prev = [];
  try { prev = JSON.parse(store.get('sk-subjects')) || []; } catch (e) {}
  if (prev.length) prev.forEach(function (r) { addRow(r[0], r[1], r[2]); });
  else { addRow(); addRow(); addRow(); }
  $('addSub').onclick = function () { addRow(); };
  $('calcCgpa').onclick = function () {
    var tc = 0, tp = 0;
    list.querySelectorAll('.row').forEach(function (r) {
      var i = r.querySelectorAll('input'), c = parseFloat(i[1].value), g = parseFloat(i[2].value);
      if (!isNaN(c) && !isNaN(g) && g <= 10) { tc += c; tp += c * g; }
    });
    if (!tc) { $('cgpaNum').textContent = '--'; $('cgpaTxt').textContent = 'Add credits and grade points (0 to 10) for at least one subject.'; return; }
    var cgpa = tp / tc;
    countUp($('cgpaNum'), cgpa, 2);
    var band = cgpa >= 9 ? 'Outstanding' : cgpa >= 8 ? 'Excellent' : cgpa >= 7 ? 'Very good' : cgpa >= 6 ? 'Good' : 'Keep pushing';
    $('cgpaTxt').textContent = band + ' · about ' + (cgpa * 9.5).toFixed(1) + '% (CGPA × 9.5)';
  };

  /* Attendance */
  $('calcAtt').onclick = function () {
    var h = parseInt($('held').value, 10), a = parseInt($('attended').value, 10);
    var r = parseFloat($('req').value) / 100, box = $('attOut');
    if (isNaN(h) || isNaN(a) || isNaN(r) || h <= 0 || a < 0 || a > h) {
      box.classList.add('bad'); $('attBar').style.width = '0';
      $('attTxt').textContent = 'Enter valid numbers. Attended cannot be more than held.'; return;
    }
    var pct = a / h * 100;
    $('attBar').style.width = pct + '%';
    if (a / h >= r) {
      box.classList.remove('bad');
      var skip = Math.floor(a / r - h);
      $('attTxt').textContent = pct.toFixed(1) + '% attendance. You can still miss ' + skip + ' class' + (skip === 1 ? '' : 'es') + ' and stay above ' + (r * 100) + '%.';
    } else {
      box.classList.add('bad');
      var need = r >= 1 ? Infinity : Math.ceil((r * h - a) / (1 - r));
      $('attTxt').textContent = pct.toFixed(1) + '% attendance. Attend the next ' + need + ' class' + (need === 1 ? '' : 'es') + ' in a row to reach ' + (r * 100) + '%.';
    }
  };

  /* Focus timer */
  var C = 565.5, total = 25 * 60, left = total, tick = null, done = 0;
  function show() {
    var m = Math.floor(left / 60), s = left % 60;
    $('clock').textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    $('prog').style.strokeDashoffset = C * (1 - left / total);
    if (tick) document.title = $('clock').textContent + ' · Student Toolkit';
  }
  function stop() { clearInterval(tick); tick = null; $('start').textContent = 'Start'; document.querySelector('.ringwrap').classList.remove('run'); }
  function setMin(m) { stop(); total = left = m * 60; show(); document.title = 'Student Toolkit'; }
  $('chips').querySelectorAll('button').forEach(function (b) {
    b.onclick = function () {
      $('chips').querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on'); setMin(parseInt(b.dataset.m, 10));
    };
  });
  $('reset').onclick = function () { setMin(total / 60); };
  $('start').onclick = function () {
    if (tick) { stop(); return; }
    $('start').textContent = 'Pause';
    document.querySelector('.ringwrap').classList.add('run');
    tick = setInterval(function () {
      left--; show();
      if (left <= 0) {
        done++; $('timerOut').textContent = 'Sessions completed today: ' + done + '. Take a short break!';
        setMin(total / 60);
      }
    }, 1000);
  };
  show();
})();

