(function(global){


// Some of the code below was informed by a Gist published by Saul Shanabrook (GH: @saulshanabrook)

// async function encryptDataSaveKey() {
// 	var data = await makeData();
// 	console.log("generated data", data);
// 	var keys = await makeKeys()
// 	var encrypted = await encrypt(data, keys);
// 	callOnStore(function (store) {
// 		store.put({id: 1, keys: keys, encrypted: encrypted});
// 	})
// }

// function loadKeyDecryptData() {
// 	await callOnStore(async function (store) {
//     var getData = store.get(1);
//     getData.onsuccess = async function() {
//     	var keys = getData.result.keys;
//       var encrypted = getData.result.encrypted;
// 			var data = await decrypt(encrypted, keys);
// 			console.log("decrypted data", data);
// 	   };
// 	})
// }

// TextEncoder Polyfill from @samthor (on GitHub) licenced as Apache 2
(function(l){function m(b){b=void 0===b?"utf-8":b;if("utf-8"!==b)throw new RangeError("Failed to construct 'TextEncoder': The encoding label provided ('"+b+"') is invalid.");}function k(b,a){b=void 0===b?"utf-8":b;a=void 0===a?{fatal:!1}:a;if("utf-8"!==b)throw new RangeError("Failed to construct 'TextDecoder': The encoding label provided ('"+b+"') is invalid.");if(a.fatal)throw Error("Failed to construct 'TextDecoder': the 'fatal' option is unsupported.");}if(l.TextEncoder&&l.TextDecoder)return!1;
Object.defineProperty(m.prototype,"encoding",{value:"utf-8"});m.prototype.encode=function(b,a){a=void 0===a?{stream:!1}:a;if(a.stream)throw Error("Failed to encode: the 'stream' option is unsupported.");a=0;for(var h=b.length,f=0,c=Math.max(32,h+(h>>1)+7),e=new Uint8Array(c>>3<<3);a<h;){var d=b.charCodeAt(a++);if(55296<=d&&56319>=d){if(a<h){var g=b.charCodeAt(a);56320===(g&64512)&&(++a,d=((d&1023)<<10)+(g&1023)+65536)}if(55296<=d&&56319>=d)continue}f+4>e.length&&(c+=8,c*=1+a/b.length*2,c=c>>3<<3,
g=new Uint8Array(c),g.set(e),e=g);if(0===(d&4294967168))e[f++]=d;else{if(0===(d&4294965248))e[f++]=d>>6&31|192;else if(0===(d&4294901760))e[f++]=d>>12&15|224,e[f++]=d>>6&63|128;else if(0===(d&4292870144))e[f++]=d>>18&7|240,e[f++]=d>>12&63|128,e[f++]=d>>6&63|128;else continue;e[f++]=d&63|128}}return e.slice(0,f)};Object.defineProperty(k.prototype,"encoding",{value:"utf-8"});Object.defineProperty(k.prototype,"fatal",{value:!1});Object.defineProperty(k.prototype,"ignoreBOM",{value:!1});k.prototype.decode=
function(b,a){a=void 0===a?{stream:!1}:a;if(a.stream)throw Error("Failed to decode: the 'stream' option is unsupported.");b=new Uint8Array(b);a=0;for(var h=b.length,f=[];a<h;){var c=b[a++];if(0===c)break;if(0===(c&128))f.push(c);else if(192===(c&224)){var e=b[a++]&63;f.push((c&31)<<6|e)}else if(224===(c&240)){e=b[a++]&63;var d=b[a++]&63;f.push((c&31)<<12|e<<6|d)}else if(240===(c&248)){e=b[a++]&63;d=b[a++]&63;var g=b[a++]&63;c=(c&7)<<18|e<<12|d<<6|g;65535<c&&(c-=65536,f.push(c>>>10&1023|55296),c=56320|
c&1023);f.push(c)}}return String.fromCharCode.apply(null,f)};l.TextEncoder=m;l.TextDecoder=k})("undefined"!==typeof window?window:"undefined"!==typeof global?global:this);

function sha256(str) {
  var buffer = new TextEncoder('utf-8').encode(str);
  return crypto.subtle.digest('SHA-256', buffer).then(function (hash) {
    return hex(hash);
  });
}

function hex(buffer) {
  var hexCodes = [];
  var view = new DataView(buffer);
  for (var i = 0; i < view.byteLength; i += 4) {
    var value = view.getUint32(i)
    var stringValue = value.toString(16);
    var padding = '00000000';
    var paddedValue = (padding + stringValue).slice(-padding.length);
    hexCodes.push(paddedValue);
  }
  return hexCodes.join('');
}

function storageOperation(fn) {
	var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  return new Promise((resolve, reject) => {
    var init = indexedDB.open('keyStore', 1);
    init.onerror = e => reject(e);
    init.onupgradeneeded = () => {
      var store = init.result.createObjectStore('entries', {keyPath: 'hash'});
      store.createIndex('entries', 'entries', { unique: false });
    }
    init.onsuccess = async () => {
      var db = init.result;
      var tx = db.transaction('entries', 'readwrite');
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

function save(entry) { return storageOperation(async store => await store.put(entry)) }
function _delete(hash) { return storageOperation(async store => await store.delete(hash)) }
function clear() { return storageOperation(async store => await store.clear()) }

function encrypt(data, keys) {
  return window.crypto.subtle.encrypt(
    {
      name: keys.publicKey.algorithm.name,
        //label: Uint8Array([...]) // optional
    },
    keys.publicKey, // from generateKey or importKey above
    data // ArrayBuffer of data you want to encrypt
  )
}
async function decrypt(data, keys) {
  return new Uint8Array(await window.crypto.subtle.decrypt(
      {
        name: keys.publicKey.algorithm.name,
        //label: Uint8Array([...]) // optional
      },
      keys.privateKey, // from generateKey or importKey above
      data // ArrayBuffer of the data
  ));
}

async function generate(desc = {
        name: "RSA-OAEP",
        modulusLength: 2048, // can be 1024, 2048, or 4096
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: {name: 'SHA-256'}, // can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
      }) {
  var keys = await window.crypto.subtle.generateKey(
    desc,
    false, // whether the key is extractable (i.e. can be used in exportKey)
    ['encrypt', 'decrypt'] // must be ["encrypt", "decrypt"] or ["wrapKey", "unwrapKey"]
  );
  var jwk;
  var hash = await crypto.subtle.exportKey('jwk', keys.publicKey).then(async exp => {
    jwk = exp;
    return await sha256(JSON.stringify(exp));
  });
  var entry = {
    jwk: jwk,
    hash: hash,
    publicKey: keys.publicKey,
    privateKey: keys.privateKey
  };
  try { await save(entry) }
  catch (e) { throw e }
  return entry;
}

global.keyStore = {
  generate: generate,
  save: save,
  delete: _delete,
  clear: clear,
  encrypt: encrypt,
  decrypt: decrypt,
  load: jwkHash => {
    return new Promise((resolve, reject) => {
      storageOperation(store => {
        var txn = store.get(jwkHash);
        txn.onerror = (e) => reject(e);
        txn.onsuccess = () => resolve(txn.result);
      })
    })
  },
  forEach: async fn => {
    return new Promise((resolve, reject) => {
      storageOperation(store => {
        var returned = [];
        var cursor = store.openCursor()
        cursor.onsuccess = event => {
          var cursor = event.target.result;
          if (cursor) {
            var output = fn(cursor.value);
            if (typeof output != 'undefined') returned.push(output);
            cursor.continue();
          }
          else resolve(returned);
        }
        cursor.onerror = e => reject(e);
      }); 
    }); 
  }
}

})(window === undefined ? this : window);