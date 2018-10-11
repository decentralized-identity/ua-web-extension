


(function(){


/* ACTIONS */

document.addEventListener('action', e => {
  switch (e.detail) {
    case 'new_did':
      console.log(e);
      create_did.show();
      break;
  }
});

/* VIEW: My DIDs */




/* DID Import (QR Code, etc.) */

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

  qrcode.callback = function(data){
    if (data.includes('error')) {

    }
    else {
      var did = data.trim();
      if (did.startsWith('did:') && !User.dids[did]) {
        EXT.setDID(did, { user: true }).then(() => {
          console.log('DID saved! --> ' + did);
          notifier.show('New DID added', { body: did });
        });
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

/* MODALS */

create_did.addEventListener('submit', e => {
  e.preventDefault();
  console.log(e);
  var op = DIDOperationManager.generate({ op: 'create', method: e.target.elements.did_method.value });
  op.send().then(res => {
    notifier.show('DID Created!', { body: res.did });
  }).catch(e => {
    notifier.show('DID creation failed', { type: 'error', body: e.toString() })
  });
});

/* Data-Reactive Elements */

var DIDCountAttr = 'did-count';
updateDIDCount = function(){
  var count = User.didCount = Object.keys(User.dids).length;
  var nodes = document.querySelectorAll('[' + DIDCountAttr + ']');
  for (let node of nodes) node.setAttribute(DIDCountAttr, count);
}

function renderDIDChange(){
  /* Dashboard */

  updateDIDCount();
  /* DID List */

  var content = '';
  for (let did in User.dids) {
    content += `<li><svg data-jdenticon-value="${did}"><svg/><span>${did}</span><div delete-did="${did}">⨯</div></li>`;
  }
  did_list.innerHTML = content;
  jdenticon.update('#did_list [data-jdenticon-value]');
}


window.addEventListener('userdidchange', renderDIDChange);

xtag.addEvent(document, 'click:delegate([delete-did])', function(e){
  EXT.deleteDID(this.getAttribute('delete-did')).then(() => {
    notifier.show('DID removed', { body: this.getAttribute('delete-did') });
  });
});

EXT.ready.then(renderDIDChange);

})();

