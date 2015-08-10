


/////////////// Part 1: COMPARISON THING //////////////////////////


var CompareWidget = function(canvas) {
  this.canvas = canvas;
  this.left = [];
  this.right = [];
  this.draw();
};

CompareWidget.prototype.setLeft = function(left) {
  this.left = left;
  this.draw();
};

CompareWidget.prototype.setRight = function(right) {
  this.right = right;
  this.draw();
};

CompareWidget.prototype.draw = function() {
  // Create merged, weighted list of left and right.

  // Start by recording left and right weights, defined simply
  // in terms of the rank in the list.
  var merged = {};
  var add = function(items, which) {
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!merged[item]) {
        merged[item] = {
          item: item, left: 0, right: 0
        }
      }
      merged[item][which] = 5 + items.length - i;

    }
  }

  add(this.left, 'left');
  add(this.right, 'right');


  // Now create a list of these items, sorted by ratio of left to right.
  var list = [];
  for (var item in merged) {
    list.push(merged[item]);
  }
  function order(x, y) {
    return x > y ? 1 : x < y ? -1 : 0;
  }
  list.sort(function(a, b) {
    return order(a.right / a.left, b.right / b.left) ||
           order(a.right, b.right) || order(b.left, a.left);
  });

  // Figure out total weight.
  var totalWeight = 0;
  list.forEach(function(a) {
    totalWeight += a.left + a.right;
  });

  // Draw the result.
  var g = this.canvas.getContext('2d');
  var width = this.canvas.width;
  var height = this.canvas.height;
  g.clearRect(0, 0, width, height);

  g.textAlign = 'center';

  // Helper function for making colors.
  var leftColors = [130,50,0];
  var rightColors  = [0,50,130];
  var makeColor = function(left, right) {
    var u = left / (left + right);
    var red = u * leftColors[0] + (1 - u) * rightColors[0];
    var green = u * leftColors[1] + (1 - u) * rightColors[1];
    var blue = u * leftColors[2] + (1 - u) * rightColors[2];
    return 'rgb(' + red + ',' + green + ',' + blue + ')';
  }

  var ty = 0;
  var tx = width / 2;
  var leftX = 0;
  var leftY = height / 2 - 5;
  var rightX = width;
  var rightY = leftY;
  var scaleThickness = function(t) {
    return t * t / 9;
  }
  for (var i = 0; i < list.length; i++) {
    var entry = list[i];
    var text = entry.item;
    var weight = (entry.left + entry.right) / totalWeight;
    var theoreticalFontSize = ~~(weight * height);
    var actualFontSize = Math.min(theoreticalFontSize, 144);
    var textY = ty + (theoreticalFontSize + actualFontSize) / 2;
    ty += theoreticalFontSize;
    g.font = ~~(.7 * actualFontSize) + 'px Helvetica';
    var size = g.measureText(text);
    g.fillStyle = makeColor(entry.left, entry.right);
    g.fillText(text, tx, textY - ~~(.3 * actualFontSize));
    var ay = textY - actualFontSize / 2;
    g.fillStyle = makeColor(1, 0);
    g.strokeStyle = makeColor(1, 0);
    var thick = scaleThickness(entry.left);
    arrowArc(g, thick, leftX, leftY, tx - 25 - size.width / 2, ay);
    g.fillStyle = makeColor(0, 1);
    g.strokeStyle = makeColor(0, 1);
    thick = scaleThickness(entry.right);
    arrowArc(g, thick, rightX, rightY, tx + 25 + size.width / 2, ay);
    leftY += 3;
    rightY += 3;
  }
};

function arrowArc(g, strokeSize, x1, y1, x2, y2) {
  if (strokeSize <= 0) {
    return;
  }

  g.beginPath();
  g.lineWidth = strokeSize;

  var midX = (x1 + x2) / 2;
  var sign = (x2 > x1 ? 1 : -1);
  var a = ~~(sign * Math.max(5, 2 * strokeSize));

  var b = ~~(.6 * a);
  x2 -= a;

  var s1 = sign * 5;
  var s2 = sign * 30;
  g.moveTo(x1, y1);
  g.lineTo(x1 + s1, y1);
  g.bezierCurveTo(midX - s2, y1, midX - s2, y2, x2 - s2, y2);
  g.lineTo(x2, y2);
  g.stroke();

  g.beginPath();
  g.moveTo(x2, y2);
  g.lineTo(x2, y2 - b);
  g.lineTo(x2 + a, y2);
  g.lineTo(x2, y2 + b);
  g.fill();
}


/////////////// MAIN INTERACTIVITY //////////////////////////

function clean(s) {
  return s.toLowerCase().replace(/[^a-z'0-9çàãáâéâóõôíîúû ]/gi, '');
}

var display = new CompareWidget(document.getElementById('output'));
var prefixes = {left: '', right: ''};
var api = 'http://suggestqueries.google.com/complete/search?client=Chrome';

function init(apiSuffix) {
//  document.getElementById('email').innerHTML='fm@'+'hint.fm';
  if (apiSuffix) {
    api += apiSuffix;
  }
  var hash = window.location.hash.substring(1);
  hash.split('&').forEach(function(p) {
    tokens = p.split('=');
    if (tokens.length == 2) {
      prefixes[tokens[0]] = clean(decodeURIComponent(tokens[1]));
    }
  });

  document.getElementById('left').value = prefixes['left'];
  askFor(prefixes['left'], 'left');
  document.getElementById('right').value = prefixes['right'];
  askFor(prefixes['right'], 'right');
}

function updateHash() {
  window.location.hash = 'left='  + encodeURIComponent(prefixes['left']) +
      '&right=' + encodeURIComponent(prefixes['right']);
}

function sendQuery(field) {
  var value = clean(document.getElementById(field).value);
  askFor(value, field);
  prefixes[field] = value;
  updateHash();
}


function handleData(data, side) {
  var prefix = data[0];
  var candidates = data[1];
  var types = data[4]['google:suggesttype'];
  var completions = [];
  var trimmed = prefix.trim();
  var initialLength = trimmed.length;
  for (var i = 0; i < candidates.length; i++) {
    if (types[i] == 'QUERY' &&  candidates[i].indexOf(trimmed) == 0) {
      var suffix = candidates[i].substring(initialLength);
      completions.push(suffix);
    }
  }

  if (side == 'left') {
    display.setLeft(completions);
  } else {
    display.setRight(completions);
  }
}

function askFor(query, side) {
  var q = escape(query + ' ');
  $.getJSON(api + '&q='+q+'&callback=?')
    .done(function(data) {handleData(data, side);});
}

