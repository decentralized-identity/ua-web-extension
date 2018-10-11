(function(){


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

function sha256(str) {
  // We transform the string into an arraybuffer.
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
	var init = indexedDB.open("keyStore", 1);
  return new Promise((resolve, reject) => {
    init.onerror = e => reject(e);
    init.onupgradeneeded = () => {
      var store = init.result.createObjectStore("keyStoreOjects", {keyPath: 'hash'});
      store.createIndex("did", "did", { unique: false });
    }
    init.onsuccess = async () => {
      var db = init.result;
      var tx = db.transaction("keyStoreOjects", "readwrite");
      var store = tx.objectStore("keyStoreOjects");
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
function _delete(entry) { return storageOperation(async store => await store.delete(entry)) }

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

async function generate(did = null, desc = {
        name: "RSA-OAEP",
        modulusLength: 2048, //can be 1024, 2048, or 4096
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
      }) {

  var keys = await window.crypto.subtle.generateKey(
    desc,
    false, //whether the key is extractable (i.e. can be used in exportKey)
    ["encrypt", "decrypt"] //must be ["encrypt", "decrypt"] or ["wrapKey", "unwrapKey"]
  )
  var hash = await crypto.subtle.exportKey('jwk', keys.publicKey).then(async jwk => await sha256(JSON.stringify(jwk)));
  var entry = {
    did: did,
    hash: hash,
    keys: keys
  };
  try { await save(entry) }
  catch (e) { throw e }
  return entry;
}

keyStore = {
  generate: generate,
  save: save,
  delete: _delete,
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
  },
  didKeys: did => keyStore.forEach(obj => {
    if (obj.did === did) return obj;
  })
}

})();