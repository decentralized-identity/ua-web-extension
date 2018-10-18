


(function(){


/* ACTIONS */

document.addEventListener('action', e => {
  switch (e.detail) {
    case 'new_did':
      create_did.show();
      break;
  }
});

/* VIEW: My DIDs */




/* MODAL: Import DID (QR Code, etc.) */

var imageTrack;
var imageCapture;
// const canvas = document.createElement('canvas');
// const canvas2D = canvas.getContext('2d');

function activateCam(videoElement) {
  return navigator.mediaDevices.getUserMedia({ video: true }).then(mediaStream => {
    videoElement.srcObject = mediaStream;
    imageTrack = mediaStream.getVideoTracks()[0];
    imageCapture = new ImageCapture(imageTrack);
  })
  .catch(error => {});
}

function getCamImage(fn) {
  imageCapture.takePhoto().then(blob => {
    var dataURL = URL.createObjectURL(blob);
    fn(dataURL);
    URL.revokeObjectURL(blob); 
  })
  .catch(error => {});
}

// function getCamFrame(video, fn) {
//   canvas2D.drawImage(video, 0, 0);
//   canvas.toBlob(blob => {
//     var dataURL = URL.createObjectURL(blob);
//     fn(dataURL);
//     URL.revokeObjectURL(blob); 
//   });
// }


  var timer;
  var notifier = document.getElementById('notifier');

  qrcode.callback = async function(data){
    if (data.includes('error')) {

    }
    else {
      var did = data.trim();
      if (did.startsWith('did:') && await DIDManager.get(did)) {
        new DID({ id: did });
        notifier.show('New DID added', { body: did });
      }
    }
  }
  
  import_dids.addEventListener('modalshow', () => {
    activateCam(qr_video).then(() => {
      timer = setInterval(() => {
        getCamImage(dataURL => {
          qrcode.decode(dataURL);
        });

        // getCamFrame(qr_video, dataURL => {
        //   qrcode.decode(dataURL);
        // });
      }, 300);
    })

  });

  import_dids.addEventListener('modalhide', () => {
    imageTrack.stop();
    clearInterval(timer);
  });

  xtag.addEvent(document, 'click:delegate(.import-dids)', function(event){
    import_dids.show();
  })

/* MODAL: Create DID */

create_did.addEventListener('submit', async e => {
  e.preventDefault();
  var keys = await keyStore.generate();
  var op = DIDOperationManager.generate({
    op: 'create',
    method: e.target.elements.did_method.value,
    data: {
      "didMethod": "test",
      "publicKey": {
          "id": "testKey",
          "type": "RsaVerificationKey2018",
          "publicKeyJwk": keys.jwk
        },
      "hubUri": "https://beta.hub.microsoft.com/"
    }
  });
  op.send().then(res => {
    var did = new DID({
      id: res.did,
      keys: [keys],
      meta: { display_name: e.target.elements.display_name.value  }
    });
    renderDIDChange('add', did.id);
    notifier.show('DID Created!', { body: res.did });
    create_did.hide();
  }).catch(e => {
    notifier.show('DID creation failed', { type: 'error', body: e.toString() })
  });
});

/* Data-Reactive Elements */

var DIDCountAttr = 'did-count';
updateDIDCount = async function(){
  var count = await DIDManager.count();
  var nodes = document.querySelectorAll('[' + DIDCountAttr + ']');
  for (let node of nodes) node.setAttribute(DIDCountAttr, count);
}

async function renderDIDChange(op, id){
  /* Dashboard */

  updateDIDCount();

  /* DID List */

  if (op == 'add') {
    var did = await DIDManager.get(id);
    var li = document.createElement('li');
    li.setAttribute('did', id);
    li.innerHTML = `<div><svg data-jdenticon-value="${id}"><svg/></div><span>${did.meta.display_name || id}</span><div delete-did="${id}">⨯</div>`;
    did_list.appendChild(li);
    jdenticon.update(`[did="${id}"] [data-jdenticon-value]`);
  }
  else if (op == 'delete') {
    Array.from(document.querySelectorAll(`[did="${id}"]`)).forEach(node => {
      node.parentNode.removeChild(node);
    });
  }
  else {  
    var content = '';
    await DIDManager.forEach(did => {
      content += `<li did="${did.id}"><div><svg data-jdenticon-value="${did.id}"><svg/></div><span>${did.meta.display_name || did.id}</span><div delete-did="${did.id}">⨯</div></li>`;
    });
    did_list.innerHTML = content;
    jdenticon.update('#did_list [data-jdenticon-value]');
  }
}


window.addEventListener('didchanged', renderDIDChange);

xtag.addEvent(document, 'click:delegate([delete-did])', function(e){
  var id = this.getAttribute('delete-did');
  DIDManager.delete(id).then(() => {
    renderDIDChange('remove', id);
    notifier.show('DID removed', { body: this.getAttribute('delete-did') });
  });
});

EXT.ready.then(renderDIDChange);

})();

