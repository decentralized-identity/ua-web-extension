
// function delegate(event, selector, fn) {
//   var match,
//       target = event.target,
//       root = event.currentTarget;
//   while (!match && target && target != root) {
//     if (target.tagName && target.matches(selector)) match = target;
//     target = target.parentNode;
//   }
//   if (!match && root.tagName && root.matches(selector)) match = root;
//   if (match) fn.call(match);
// }

// window.addEventListener('click', function(e){
//   delegate(e, 'a[href^="hub:"]', function(){
//     //e.preventDefault();
//     // browser.runtime.sendMessage({
//     //   name: 'hub_protocol_handler',
//     //   url: this.href
//     // }).catch(e => { console.log(e) });
//   })
// }, true);

// this = incoming port
EXT.attachProtocols();
