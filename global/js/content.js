

function delegate(event, selector, fn) {
  var match,
      target = event.target,
      root = event.currentTarget;
  while (!match && target && target != root) {
    if (target.tagName && target.matches(selector)) match = target;
    target = target.parentNode;
  }
  if (!match && root.tagName && root.matches(selector)) match = root;
  if (match) fn.call(match);
}

window.addEventListener('click', function(e){
  delegate(e, 'a[href^="hub:"]', function(){
    e.preventDefault();
    browser.runtime.sendMessage({
      type: 'hub_protocol_handler',
      url: this.href
    }).catch(e => { console.log(e) });
  })
}, true);

var shiftPressed = false;

window.addEventListener('keydown', function(e){
  if (e.keyCode == 16) shiftPressed = true;
});

window.addEventListener('keyup', function(e){
  if (e.keyCode == 16) shiftPressed = false;
});

window.addEventListener('beforeunload', function(e){
  if (shiftPressed) browser.runtime.sendMessage({ type: 'reload' }).catch(e => { console.log(e) });
});