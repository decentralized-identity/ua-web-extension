
if (typeof EXT === 'undefined') (function(){

browser = typeof browser === 'undefined' ? chrome : browser;
var storage = browser.storage.local;
var runtimeEvents = {};

browser.runtime.onMessage.addListener((obj, sender) => {
  var events = runtimeEvents[sender.tab.id];
  if (events[obj.event]) {
    events[obj.event] = events[obj.event].filter(fn => {
      fn(obj.value);
      return false;
    })
  }
});

EXT = {
  ready: [],
  storage: {
    get (...keys){
      return storage.get(keys);
    },
    set (key, value){
      var item = key;
      if (arguments.length > 1){
        item = {};
        item[key] = value;
      }
      return storage.set(key);
    },
    remove (...keys){
      return storage.remove(keys);
    },
    clear() {
      return storage.clear();
    }
  },
  protocols: {
    'did-auth': {
      trigger: resolve => {
        const parseProtocol = did => did.match(/^([^:]+)/)[0];
        window.addEventListener('submit', e => {
          
          var uri = e.target.action;
          console.log(uri);
          if (parseProtocol(uri || '') == 'did-auth') {
            e.preventDefault();
            e.cancelBubble = true;
            resolve({ uri: uri,  origin: location.hostname || location.origin });
          }
        }, true);
      },
      handler: async (response, port) => {
        if (await DIDManager.count() > 0) EXT.storage.get('DIDRequestPermissions').then(async permissions => {
          var permission = permissions[response.origin] || {};
          if (permission == 'denied') return;
          EXT.popup({
            view: 'picker',
            activity: 'pick-did',
            callback: function(did) {
              console.log(response.uri, did);
            }
          })
        })
      }
    }
  },
  attachProtocols () {
    if (browser.extension.getBackgroundPage && window == browser.extension.getBackgroundPage()) {
      browser.runtime.onConnect.addListener(port => {
        var protocol = EXT.protocols[port.name];
        if (protocol) port.onMessage.addListener(protocol.handler);
      });
    }
    else {
      for (let z in EXT.protocols) {
        let port = browser.runtime.connect({ name: z });
        EXT.protocols[z].trigger(msg => {
          port.postMessage(msg);
        });
      }
    }
  },
  addEvent(id, type, fn){
    var events = (runtimeEvents[id] || (runtimeEvents[id] = {}));
    (events[type] || (events[type] = [])).push(fn);
  },
  fireEvent(type, value){
    browser.runtime.sendMessage({
      event: type,
      value: value
    });
  },
  async popup(props = {}){
    var width = props.width || 400;
    var height = props.height || 500;
    var win = await browser.windows.getCurrent();
    var popup = await browser.windows.create({
      type: 'popup',
      width: width,
      height: height,
      left: Math.round(((win.width / 2) + win.left) - width / 2),
      top: Math.round(((win.height / 2) + win.top) - height / 2),
      url: browser.extension.getURL(`views/popup/popup.html?view=${props.view || 'default_view'}&activity=${props.activity}`)
    });
    if (props.callback && props.activity) {
      EXT.addEvent(popup.tabs[0].id, props.activity, props.callback);
    }
    return popup;
  }
};

// EXT.registerProtocol('did', e => {
//   browser.tabs.update(sender.tab.id, {
//     url: browser.extension.getURL('views/profile/profile.html?url=') + msg.url
//   }).then(val => {
//     console.log(val);
//   }).catch(e => console.log(e));
// });

// EXT.registerProtocol('hub', e => {
//   browser.tabs.update(sender.tab.id, {
//     url: browser.extension.getURL('views/profile/profile.html?url=') + msg.url
//   }).then(val => {
//     console.log(val);
//   }).catch(e => console.log(e));
// });

EXT.ready.push(DIDManager.ready);

EXT.ready = Promise.all(EXT.ready);

})();