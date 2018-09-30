

(function(){

  const regexDIDFromURL = /^(hub:\/\/|hub:)?([^/]+)/;

  function extractThemeColors(img){
    return Vibrant.from(img.src || img).useQuantizer(Vibrant.Quantizer.WebWorker).getPalette().then(colors => {
      var darkMuted = colors.DarkMuted._rgb.join(',');
      var lightVibrant = colors.LightVibrant._rgb.join(',')
      var sheet = document.createElement('style');
      sheet.innerHTML = `
        body {
          --active-ui: rgb(${lightVibrant});
          --sidebar-bk: rgb(${darkMuted});
        }
      `;
      document.body.appendChild(sheet);
      return colors;
    });
  }

  var attestationTemplates = {
    'ExtendedTranscript': function(obj){
      return `<div>
                <img src="${obj.issuer.logo}" />
                <dl>
                  ${
                    obj.transcriptEntities.degrees.map(degree => {
                      return '<dt>'+ degree.name +'<dt><dd>'+ degree.level +'</dd>'
                    }).join('')
                  }
                </dl>
              </div>`;
    }
  };

  
  function pageLoaded(){
    var listener = view_spinner.addEventListener('modalhide', function(e){
      this.removeEventListener('modalhide', listener);
      document.body.setAttribute('loaded', '');
    })
    view_spinner.hide();
  }

  function renderAttestations(atts){
    var html = '';
    atts.forEach(a => {
      html += attestationTemplates[a.type](a);
    });
    return html;
  }

  EXT.ready.then(() => {
    
    var hubURL = (new URL(document.location)).searchParams.get('url');
    var DID = hubURL && hubURL.match(regexDIDFromURL)[2];

    if (DID) {
      navigator.did.lookup(DID).then(result => {
        console.log(result)
        manager = new IdentityHubManager(result);
        manager.getProfile().then(obj => {

          var profile = obj.payload && obj.payload[0];
          if (profile) {

            if (profile.image) {
              
              var profileImage;
              var heroImage;
              var profileImageElements = Array.from(document.querySelectorAll('.profile-image'));

              profile.image.forEach(obj => {
                if (obj.name == 'profile') profileImage = obj.url;
                else if (obj.name == 'hero') heroImage = obj.url;
              });

              if (heroImage) {
                hero_image.src = heroImage;
                extractThemeColors(heroImage);
              }
              
              if (profileImage) profileImageElements.forEach(img => img.src = profileImage);
              else {
              // profileImageElements.forEach(img => img.src = profileImage);
              // jdenticon.update('.profile-image', DID);
              }
              
            }

            document.title = profile_name.textContent = profile.name || 'Anon';

            pageLoaded();
          }

          main_views.addEventListener('viewchange', function(e){
            if (e.detail == 'attestations' && !attestation_blocks.firstElementChild) {
              hubRequest(DID).then(json => {
                console.log(json);
                if (json.payload) {
                  attestation_blocks.innerHTML = renderAttestations(json.payload.map(obj => obj.data.object.claim.data));
                }
                else notifier.show('Attestations are unavailable');
              });
            }
          });
        });
      });
    }
    
  });

})();