

/*

  LOCAL STORAGE SCHEMA
  
  dids: {}
  

  user: {
      dids: {}
    }
  }

*/

(function(){

browser = typeof browser === 'undefined' ? chrome : browser;
User = { dids: {} };
EXT = {
  User: User,
  ready: [],
  dids: {},
  storage: browser.storage.local,
  setDID (did, obj = {}){
    var lastState = EXT.dids[did];
    EXT.dids[did] = obj;
    var promises = [EXT.storage.set({ dids: EXT.dids })];
    if (obj.user) {
      User.dids[did] = obj;
      promises.push(EXT.storage.set({ user: User }))
    }
    return Promise.all(promises).then(() => {
      if (obj.user) fireDIDChange();
    }).catch(error => {
      EXT.dids[did] = lastState;
      if (obj.user) User.dids[did] = lastState;
      console.log('Setting DID entry failed', error);
    })
  },
  deleteDID (did){
    if (EXT.dids[did]) {
      var lastState = EXT.dids[did];
      delete EXT.dids[did];
      var promises = [EXT.storage.set({ dids: EXT.dids })];
      if (lastState.user) {
        delete User.dids[did];
        promises.push(EXT.storage.set({ user: User }))
      }
      return Promise.all(promises).then(() => {
        if (lastState.user) fireDIDChange();
      }).catch(error => {
        EXT.dids[did] = lastState;
        if (lastState.user) User.dids[did] = lastState;
        console.log('Removal of DID failed', error);
      })
    }
  }
};

function fireDIDChange(){
  var win = window ? window : null;
  if (win) xtag.fireEvent(window, 'userdidchange');
}

EXT.ready.push(EXT.storage.get('dids').then(obj => {
  EXT.dids = obj ? obj.dids : {};
}));

EXT.ready.push(EXT.storage.get('user').then(obj => {
  User = obj && obj.user ? obj.user : { dids: {} };
}));

EXT.ready = Promise.all(EXT.ready);

})();