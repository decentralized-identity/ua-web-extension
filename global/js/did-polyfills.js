
(function(){

  /* Helper Functions */
  
    function uuid() { // IETF RFC 4122, version 4
      var d = new Date().getTime();
      if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
          d += performance.now(); //use high-precision timer if available
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = (d + Math.random() * 16) % 16 | 0;
          d = Math.floor(d / 16);
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
    }
  
    async function hashTransaction(message) {
      const msgBuffer = new TextEncoder('utf-8').encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join(''); // convert to hex
    }

    function storageOperation(name, fn) {
      var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      var init = indexedDB.open(name, 1);
      return new Promise((resolve, reject) => {
        init.onerror = e => reject(e);
        init.onupgradeneeded = () => init.result.createObjectStore('entries', {keyPath: 'id'});
        init.onsuccess = async () => {
          var db = init.result;
          var tx = db.transaction('entries', "readwrite");
          var store = tx.objectStore('entries');
          tx.oncomplete = () => db.close();
          try {
            await fn(store);
            resolve();
          }
          catch (e) { reject(e) }
        }
      })
    }

  /* DID Registry & Operations */

    const parseDIDMethod = did => did.match(/^did:(\w+):/)[1].trim().toLowerCase();
    
    class DIDOperation {
      constructor (props){
        this.id = props.id || uuid();
        this.op = props.op;
        this.did = props.did;
        this.data = props.data;
        this.sent = props.sent;
        this.method = (props.method || parseDIDMethod(this.did));
        var spec = navigator.did.methods[this.method];
        if (!spec) throw `There is no matching entry for the '${this.method}' DID Method prefix`;
        DIDOperationManager.store(this);
      }
      async send (retry) {
        if (!this.sent || retry) {
          var fn = navigator.did.methods[this.method][this.op];
          if (!fn) throw `The DID Method '${this.method}' does not support the '${this.op}' operation`;
          this.sent = true;
          DIDOperationManager.store(this);
          return fn(this.data).then(res => {
            this.response = res;
            DIDOperationManager.store(this);
            return res;
          }).catch(e => {
            this.error = e;
            DIDOperationManager.store(this);
            return e;
          });
        }
      }
    };

    const DIDOperationManager = window.DIDOperationManager = {
      generate(props = { op: '', method: '', data: {} }){
        var instance = new DIDOperation(props);
        this.store(instance);
        return instance;
      },
      async load (instance){
        return await storageOperation('DIDOperations', store => store.get(instance.id || instance));
      },
      async loadAll (){
        return new Promise(resolve => {
          var ops = [];
          storageOperation('DIDOperations', store => store.openCursor().onsuccess = event => {
            var cursor = event.target.result;
            if (cursor) {
              ops.push(cursor.value);
              cursor.continue();
            }
            else resolve(ops);
          });
        });
      },
      store (instance){
        storageOperation('DIDOperations', store => store.put(instance));
      },
      delete (instance){
        storageOperation('DIDOperations', store => store.delete(instance.id || instance));
      }
    };

  window.DID = class DID {
    constructor(props){
      this.id = props.id;
      this.doc = props.doc;
      this.keys = props.keys;
      this.meta = props.meta || {};
      if (!props.existent) {
        this.existent = true;
        this.save();
      }
    }
    async save (){
      DIDManager.set(this);
      await storageOperation('DID', store => store.put(this));
    }
  }

  class DIDManager {
    constructor(){
      this.dids = {};
      this.ready = new Promise(resolve => {
        storageOperation('DID', store => store.openCursor().onsuccess = event => {
          var cursor = event.target.result;
          if (cursor) {
            this.dids[cursor.value.id] = new DID(cursor.value);
            cursor.continue();
          }
          else resolve();
        })
      });
    }
    set (did){
      this.dids[did.id] = did instanceof DID ? did : new DID(did);
    }
    async get (id){
      var did = this.dids[id];
      if (did) did instanceof DID ? did : this.dids[id] = new DID(did);
      try {
        did = await storageOperation('DID', store => store.get(id));
        return this.dids[id] = new DID(did);
      }
      catch (e) { return e }
    }
    forEach (fn){
      return this.ready.then(() => {
        for (let id in this.dids) fn(this.dids[id]);
      });
    }
    async count (){
      var count = 0;
      await this.ready.then(() => count = Object.keys(this.dids).length);
      return count;
    }
  };

  DIDManager = window.DIDManager = new DIDManager();
  
  /* Navigator.prototype.did */
  
    if (!navigator.did) {

      const RESOLVER_ENDPOINT = 'http://localhost:3000/1.0/identifiers/';

      class DIDResult {
        constructor (did, src){
          this.did = did;
          this.resolverData = src;
          this.document = src.didDocument;
          this.services = {};
          if (this.document.service) {
            // Spec technically allows for an object, which this normalizes
            (Array.isArray(this.document.service) ? this.document.service : [this.document.service]).forEach(s => {
              (this.services[s.type] || (this.services[s.type] = [])).push(s);
            });
          }
        }
      };
  
      Navigator.prototype.did = {
        methods: {
          'test': {
            resolve (did) {
              return fetch('https://beta.discover.did.microsoft.com/1.0/identifiers/' + did, {
                mode: 'cors',
                method: 'GET',
                credentials: 'include',
                headers: {
                  "Content-Type": "application/json"
                }
              }).then(res => res.json())
            },
            create (doc){
              return fetch('https://beta.register.did.microsoft.com/api/v1.0', {
                mode: 'cors',
                method: 'POST',
                credentials: 'include',
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(doc || {
                  "didMethod": "test",
                  "publicKey": {
                      "id": "testKey",
                      "type": "RsaVerificationKey2018",
                      "publicKeyPem": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAaEFAAOCAQ8AMIIBCgKCAQEA1TYycomln2c8dh8XkcWs\ncSlo0DvwoGerrYeBMibWO+0XSjyQ/8bSJYKKWVIFvFud353hLJujzCnauwOfD74l\nK4xIBf58F/m7L2r5LhNU/MM+6xAlpcPSmbZlQ6CS3MMXwSm1ZcuRMeBGrGV5NooX\nNa/YzRBGoxPJtC4rWf0mlIAgk868yNoeJoN6fLSu678AkThCvZx7AdHi/5bkAquU\nBOgjGUid7hmfyR595RpJuOgv1dLfN2BEYWnMswZJ3KJ6OXn6MASG2voUavwn7Xmw\ncDtTy8e2lmkilTZuEiuFyQfvvPEHK1/3aCHETkezd1gkINpFumRozg6bN3UnBHju\n9wIDAQAB\n-----END PUBLIC KEY-----"
                  },
                  "hubUri": "https://beta.hub.microsoft.com/"
                })
              }).then(res => res.json())
            }
          }
        },
        async lookup (did){
          var spec = navigator.did.methods[parseDIDMethod(did)];
          if (spec) {
            if (spec.resolve) return spec.resolve(did);
            else return fetch(RESOLVER_ENDPOINT + did)
              .then(response => response.json())
              .then(json => result = new DIDResult(did, json))
              .catch(e => console.log(e));
          }
        },
        async requestDID (){
          var did = (prompt('Please enter a DID') || '').trim()
          if (did.match('did:')) return did;
          throw 'No DID provided';
        }
      };

    }
  
  /* IdentityHub Classes */
  
  if (!('IdentityHubManager' in window)) {
  
      window.IdentityHubManager = class IdentityHubManager {
        constructor (DIDResult, options = {}){
          this.result = DIDResult;
          this.did = DIDResult.did;
          this.sender = options.sender;
          this.sign = options.sign;
          this.encrypt = options.encrypt;
          this.decrypt = options.decrypt;
          resolveInstances(this, DIDResult);
        }
        ready(){
          return this._ready;
        }
        refresh (){
          return navigator.did.lookup(this.did)
            .then(result => resolveInstances(this, result))
            .catch(e => console.error('Refresh of DIDResult cache failed'))
        }
        transact (op, props){
          if (props) {
            props.did = this.did;
            props.sender = this.sender;
          }
          var txn = op instanceof IdentityHubTransaction ? op : new IdentityHubTransaction(op, props);
          console.log(txn);
          // if (!this.keys) {
          //   return reject('There are no Identity Hub encryption key specified for ' + this.did);
          // }
  
          this.ready().then(async () => {
            //var last = this.instances[this.instances.length - 1];
            for (let instance of this.instances) {
              var exit = await fetch(instance.endpoint, {
                  method: 'POST',
                  mode: 'cors',
                  body: JSON.stringify(await txn.message())
                }).then(response => {
                  if (response.ok) { // This should be based on a Hub payload error msg, not reliant on HTTP-specific errors
                    console.log(response);
                    txn.response = response;
                  }
                  return response.ok;
                }).catch(e => {
                  if (e) console.log(e);
                  return false;
                });
              console.log(exit);
              if (exit) break;
            }
  
          }).catch(e => {
            console.log(e);
          });
  
          return txn;
        }
        getProfile(){
          return new Promise(resolve => {
            setTimeout(function(){
              resolve({
                '@type': 'Profile/Response',
                'payload': [{
                  "@context": "http://schema.org",
                  "@type": "Person",
                  "name": "Alice Smith",
                  "description": "New grad looking for a software engineering gig.",
                  "image": [
                    {
                      "@type": "ImageObject",
                      "name": "profile",
                      "url": "https://i.imgur.com/NJ0nl20.jpg"
                    },
                    {
                      "@type": "ImageObject",
                      "name": "hero",
                      "url": "https://i.imgur.com/Ve2NdVY.jpg"
                    }
                  ],
                  "website": [
                    {
                      "@type": "WebSite",
                      "url": "https://github.com/alice-bobbins"
                    }
                  ]
                }]
              })
            }, ~~(Math.random() * (2000 - 1000 + 1) + 1000));
          })
        }
      }

      function resolveInstances(target, result){
        var hub = (result.services.IdentityHub || [])[0];
        var instances = hub && hub.serviceEndpoint && hub.serviceEndpoint.instances;
        target._ready = new Promise((resolve, reject) => {
          var count = instances && instances.length;
          if (!count) {
            return reject('There are no Identity Hub instances specified for ' + target.did);
          }
          target.keys = {};
          var keyIDs = Array.from(hub.publicKey);
          Array.from(result.document.publicKey).forEach(desc => {
            if (keyIDs.includes(desc.id)) target.keys[desc.id] = desc;
          });
          target.instances = instances.map(did => {
            var instance = new IdentityHubInstance(did);
            instance.ready().then(() => resolve()).catch(e => {
              --count;
              if (!count) reject('No Identity Hub instances can be resolved.')
            });
            return instance;
          });
        });
      }
  
      window.IdentityHubInstance = class IdentityHubInstance {
        constructor (did){
          if (!did.match(/^did:/)) throw new Error('Invalid DID')
          this.did = did;
          this.endpoint = null;
          this.resolve();
        }
        resolve(){
          this.status = 'resolving';
          return this._ready = new Promise((resolve, reject) => {
            navigator.did.lookup(this.did).then(result => {
              let host = Array.from(result.services.IdentityHubHost)[0];
              if (host) {
                this.keys = {};
                var keyIDs = Array.from(host.publicKey);
                Array.from(result.document.publicKey).forEach(desc => {
                  if (keyIDs.includes(desc.id)) this.keys[desc.id] = desc;
                });
                this.endpoint = host.serviceEndpoint;
                this.status = 'resolved';
                return resolve();
              }
              else {
                this.status = 'unresolved';
                reject(new Error('No IdentityHubHost descriptor found'));
              }
            }).catch(e => {
              this.status = 'unresolved';
              reject(e);
            })
          });
        }
        ready (){
          return this._ready;
        }
      }
  
      function encryptHubMessage(msg, key){
        
      }
  
      window.IdentityHubTransaction = class IdentityHubTransaction {
        constructor (op, props){
          this.op = op.toLowerCase();
          var activity = this.op.split('/')[1];
          var payload = props.body.payload;
          switch (activity) {
            case 'create':
              if (props.isolate !== false) {
                if (!payload) throw new Error('No payload found. Create operations require a payload.');
                // This inferes that once cast, the UUID must remain an immutable value, else the hash ID won't match
                (payload.meta = payload.meta || {}).uuid = uuid();
              }
              break;
            case 'update':
              // Updates must have IDs
              if (!payload.meta.id) {
                throw new Error('Update operations require specification of an ID.');
              }
              break;
          }
          this._message = Object.assign({
            iss: props.sender,
            aud: props.did,
            '@type': this.op,
          }, props.body);
        }
        async message (){
          await this.id();
          return this._message;
        }
        async id (){
          var meta = this._message.payload.meta;
          return meta.id || (meta.id = await hashTransaction(this._message.payload));
        }
      }
  }
  
  })()