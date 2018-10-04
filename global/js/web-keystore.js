(function(){

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

async function storageOperation(fn, pubKey) {

	var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

	// Open/create the database
	var open = indexedDB.open("keyStore", 1);

	// Setup Object Store
	open.onupgradeneeded = () => {
    var store = open.result.createObjectStore("keyStoreOjects", {autoIncrement: true});
    store.createIndex("publicKey", "publicKey", { unique: true });
  }

	open.onsuccess = async function() {
	    var db = open.result;
	    var tx = db.transaction("keyStoreOjects", "readwrite");
      var store = tx.objectStore("keyStoreOjects");
      tx.oncomplete = () => db.close();
      await fn(store);
	}
}

keyStore = {
  generate: async function makeKeys(desc = {
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

    await storageOperation(async function (store) {
      //console.log()
      store.add(keys);
    });
    
    return keys;
  },
  load: async function loadKeys(pubKey) {
    await storageOperation(async (store) => {
      var keys;
      var txn = store.get(pubKey);
      txn.onsuccess = async () => await Promise.result(keys = txn.result.keys);
      return keys;
    });
  },
  forEach: async function forEach(fn) {
    await storageOperation(async (store) => {
      store.openCursor().onsuccess = async function(event) {
        var cursor = event.target.result;
        if (cursor) {
          fn(cursor.value);
          cursor.continue();
        }
        else await Promise.result(event);
      };
    });  
  },
  store: function storeKeys(keys) { return storageOperation(async (store) => store.put(keys)) },
  delete: function deleteKeys(keys) { return storageOperation(async (store) => store.delete(keys)) },
  encrypt: function encrypt(data, keys) {
    return window.crypto.subtle.encrypt(
      {
          name: "RSA-OAEP",
          //label: Uint8Array([...]) //optional
      },
      keys.publicKey, //from generateKey or importKey above
      data //ArrayBuffer of data you want to encrypt
    )
  },
  decrypt: async function decrypt(data, keys) {
    return new Uint8Array(await window.crypto.subtle.decrypt(
        {
          name: "RSA-OAEP",
          //label: Uint8Array([...]) //optional
        },
        keys.privateKey, //from generateKey or importKey above
        data //ArrayBuffer of the data
    ));
  }
}

})();

