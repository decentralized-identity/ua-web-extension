
(function(){
    var fontFactor = {
      'ms-browser-extension:': -0.25
    }[location.protocol] || 0;

    var style = document.createElement('style');
    style.innerHTML = `
      :root {
        --font-factor: ${fontFactor}em;
      }
      @media (min-resolution: 200dpi) {
        :root {
          --font-factor: ${fontFactor + 0.75}em;
        }
      }
      
    `;
    document.head.appendChild(style);
})();