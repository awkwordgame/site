function $(id) {
  return document.getElementById(id);
}

Storage.prototype.setObj = function (key, obj) {
  return this.setItem(key, JSON.stringify(obj));
}

Storage.prototype.getObjWithoutDefault = function (key) {
  return JSON.parse(this.getItem(key));
}

Storage.prototype.getObj = function (key) {
  return JSON.parse(this.getItem(key)) || {};
}

function shade(node, color) {
  node.style.backgroundColor = color;
  node.style.outline = "";
  node.style.outlineOffset = "";
}

function shadeWithBorder(node, color) {
  shade(node, color);
  node.style.outline = "3px solid " + adjust(color, -20);
  node.style.outlineOffset = "-3px";
  node.style.borderRadius = "10px";
}

function adjust(color, amount) {
  return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

function set(id, html) {
  $(id).innerHTML = html;
}

function show(id) {
  $(id).classList.remove("hidden");
}

function hide(id) {
  $(id).classList.add("hidden");
}

function range(count) {
  return Array(count).fill(0).map((_, i) => i);
}

function getRandomInt(min, max, rng) {
  rng = rng || Math.random;
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(rng() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

function loadScript(url) {
  return new Promise(function (resolve, reject) {
    const head = document.getElementsByTagName('head')[0]
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.addEventListener('load', function () {
      this.removeEventListener('load', arguments.callee)
      resolve(script)
    })
    script.src = url
    head.appendChild(script)
  })
}

const Colors = {
  CHOSEN: "#E8E8E8",
  NOT_CHOSEN: "#FAF9F6",
  CORRECT: "#CCFFEF",
}

Base64 = {
  _Rixits:
//   0       8       16      24      32      40      48      56     63
//   v       v       v       v       v       v       v       v      v
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!-",
  // You have the freedom, here, to choose the glyphs you want for
  // representing your base-64 numbers. The ASCII encoding guys usually
  // choose a set of glyphs beginning with ABCD..., but, looking at
  // your update #2, I deduce that you want glyphs beginning with
  // 0123..., which is a fine choice and aligns the first ten numbers
  // in base 64 with the first ten numbers in decimal.

  // This cannot handle negative numbers and only works on the
  //     integer part, discarding the fractional part.
  // Doing better means deciding on whether you're just representing
  // the subset of javascript numbers of twos-complement 32-bit integers
  // or going with base-64 representations for the bit pattern of the
  // underlying IEEE floating-point number, or representing the mantissae
  // and exponents separately, or some other possibility. For now, bail
  fromNumber: function (number, minLength) {
    if (isNaN(Number(number)) || number === null ||
      number === Number.POSITIVE_INFINITY)
      throw "The input is not valid";
    if (number < 0)
      throw "Can't represent negative numbers now";

    let _minLength = minLength || 0;
    let rixit; // like 'digit', only in some non-decimal radix
    let residual = Math.floor(number);
    let result = '';
    while (true) {
      rixit = residual % 64
      // console.log("rixit : " + rixit);
      // console.log("result before : " + result);
      result = this._Rixits.charAt(rixit) + result;
      // console.log("result after : " + result);
      // console.log("residual before : " + residual);
      residual = Math.floor(residual / 64);
      // console.log("residual after : " + residual);

      if (residual === 0)
        break;
    }
    return result.padStart(minLength || 0, '0');
  },

  toNumber: function (rixits) {
    let result = 0;
    // console.log("rixits : " + rixits);
    // console.log("rixits.split('') : " + rixits.split(''));
    rixits = rixits.split('');
    for (let e = 0; e < rixits.length; e++) {
      // console.log("_Rixits.indexOf(" + rixits[e] + ") : " +
      // this._Rixits.indexOf(rixits[e]));
      // console.log("result before : " + result);
      result = (result * 64) + this._Rixits.indexOf(rixits[e]);
      // console.log("result after : " + result);
    }
    return result;
  }
}

function generateRandomBase64String(length) {
  let string = "";
  for (let c = 0; c < length; c++) {
    string += Base64.fromNumber(getRandomInt(0, 64));
  }
  return string;
}

function generateUniqueRandomNumbers(count, limit, rng) {
  const numbers = [];
  for (let c = 0; c < count; c++) {
    let number = getRandomInt(0, limit, rng);
    while (numbers.includes(number)) {
      number = getRandomInt(0, limit, rng);
    }
    numbers.push(number);
  }
  return numbers;
}

function timeAgo(input) {
  const date = (input instanceof Date) ? input : new Date(input);
  const formatter = new Intl.RelativeTimeFormat('en');
  const ranges = {
    years: 3600 * 24 * 365,
    months: 3600 * 24 * 30,
    weeks: 3600 * 24 * 7,
    days: 3600 * 24,
    hours: 3600,
    minutes: 60,
    seconds: 1
  };
  const secondsElapsed = (date.getTime() - Date.now()) / 1000;
  for (let key in ranges) {
    if (ranges[key] < Math.abs(secondsElapsed)) {
      const delta = secondsElapsed / ranges[key];
      return formatter.format(Math.round(delta), key);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function repeat(times, fn) {
  for (let i = 0; i < times; i++) {
    await fn();
  }
}

function rot13(s) {
  return s.replace(/[A-Z0-9]/gi, c =>
    "NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm9876543210"[
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".indexOf(c)])
}

function timer(id, prefix, expiredHtml, callback) {
  // Update the count down every 1 second
  const fn = function () {
    let countDownDate = tomorrow().getTime();
    // Get today's date and time
    let now = new Date().getTime();

    // Find the distance between now and the count down date
    let distance = countDownDate - now;

    // Time calculations for days, hours, minutes and seconds
    let hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Display the result in the element with id="demo"
    $(id).innerHTML = prefix + " <b>" + hours.toString().padStart(2, "0")
      + ":" + minutes.toString().padStart(2, "0")
      + ":" + seconds.toString().padStart(2, "0")
      + "</b>";

    // If the count down is finished, write some text
    if (distance < 0) {
      clearInterval(x);
      $(id).innerHTML = expiredHtml;
      callback();
    }
  };
  let x = setInterval(fn, 1000);
  fn();
}

function goTo(url) {
  window.location.href = url;
}

function tomorrow() {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

function updateUrlHash(hash, page, data) {
  history.pushState({page, ...data}, "", hash);
}
