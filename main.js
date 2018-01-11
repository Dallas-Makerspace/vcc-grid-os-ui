/* global requestAnimFrame */
/* global elation */
/* global Mousetrap */
/* global firebase */
/**
 * AnderShell - Just a small CSS demo
 *
 * Copyright (c) 2011-2013, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met: 
 * 
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer. 
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution. 
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
(function() {

  var $output;
  var _inited = false;
  var _locked = false;
  var _buffer = [];
  var _obuffer = [];
  var _ibuffer = [];
  var _cwd = "/";
  var _prompt = function() { return _cwd + " $ "; };
  var _history = [];
  var _hindex = -1;
  var _lhindex = -1;

  var _filetree = {
    'documents': {type: 'dir', files: {
      'README' : {type: 'file', mime: 'text/plain', content: 'All you see here is CSS. No images were used or harmed in creation of this demo'},
      'LICENSE': {type: 'file', mime: 'text/plain', content: "Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the \"Software\"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE."},
      'allfiles.txt': {type: 'symlink', mime:'inode/simlink', destination: "http://www.textfiles.com/bbs/FILELISTS/allfile1.txt"},
    }},
    'releases':   {type: 'dir', files: {
      'Amiga-Hardware.webm': {type: 'symlink', mime: 'inode/simplink', destination: 'https://archive.org/download/youtube-BbVAvDbzXFk/The_Ultimate_Amiga_500_Talk_32c3-BbVAvDbzXFk.webm'},
    }},
    'MOTD': {type: 'file', mime: 'text/plain', content: "Vintage Computer Committee presents the Interactive Computer Museum, a live interactive experience of the meaningful             milestones in the evolution of computers, internet, and how people use them. The collection was assembled as a way to            offer interactive learning pieces members of the space to play with and exprence the growth of the internet as a whole           that harkens back to the days of Community Memory."},
    'GPGKEY': {type: 'symlink', mime: 'inode/simplink', destination: 'https://keybase.io/denzuko/pgp_keys.asc?fingerprint=e9bf4915a4ceacb4f72ae65ae704b37bc7fbf426'},
  };
  
  var _finger = [
    { 'key': 'username', 'value': "vintagecomputercommitee@dms" },
    { 'key': 'Name', 'value': 'Vintage Computer Committee Dallas Makerspace' },
    { 'key': 'Email', 'value': 'denzuko@dallasmakerspace.org', 'proto': 'mailto:' },
    { 'key': 'Articles', 'value': 'hackaday.io/DMSVintageComputers', 'proto': 'https://' },
    { 'key': 'Github',   'value': 'github.com/Dallas-Makerspace/', 'proto': 'https://' },
    { 'key': 'YouTube',  'value': 'youtube.com/channel/UCp3dIM6FyevEUYbF1EFnzmA', 'proto': 'https://' },
    { 'key': 'Google+',  'value': 'plus.google.com/100248581855785476356?rel=author', 'proto': 'https://'}
  ];
  
  var contextClass = (window.AudioContext || 
    window.webkitAudioContext || 
    window.mozAudioContext || 
    window.oAudioContext || 
    window.msAudioContext);
  
  var _commands = {

    sound: function(volume, duration, freq) {
      if (!contextClass)
        return ['Your browser does not support this feature :('];

      volume = ((volume || '').replace(/[^0-9]/g, '') << 0) || 100;
      duration = ((duration || '').replace(/[^0-9]/g, '') << 0) || 1;
      freq = ((freq || '').replace(/[^0-9]/g, '') << 0) || 1000;

      var context = new contextClass();
      var osc = context.createOscillator();
      var vol = context.createGainNode();

      vol.gain.value = volume/100;
      osc.frequency.value = freq;
      osc.connect(vol);
      vol.connect(context.destination);
      osc.start(context.currentTime);

      setTimeout(function() {
        osc.stop();
        osc = null;
        context = null;
        vol = null;
      }, duration*1000);

      return ([
        'Volume:    ' + volume,
        'Duration:  ' + duration,
        'Frequenzy: ' + freq
      ]).join("\n");
    },
    
    readlink: function(file) {
     if (!file)  return(["You need to supply argument: filename"]).join("\n");
     
     var filename = parsepath(file);
     var iter     = getiter(filename);
     
     if (!iter) return(["File not found: " + filename]).join("\n");
     
     if (iter.type !== "symlink") return(["Invalid symlink: " + filename]).join("\n");
     
     return _openAjax(iter.destination, "GET");
     
    },

    ls: function(dir) {
      dir = parsepath((dir || _cwd));

      var out = [];
      var iter = getiter(dir);

      var p;
      var tree = (iter && iter.type == 'dir') ? iter.files : _filetree;
      var count = 0;
      var total = 0;

      for ( var i in tree ) {
        if ( tree.hasOwnProperty(i) ) {
          p = tree[i];
          if ( p.type === 'dir' ) {
            out.push(format('{0} {1} {2}', padRight('<'+i+'>', 20), padRight(p.type, 20), '4096'));
          } else if ( p.type === 'symlink' ) {
            out.push(format('{0} {1} {2}', padRight(i, 20), padRight(p.type, 20), '9'));
          } else {
            out.push(format('{0} {1} {2}', padRight(i, 20), padRight(p.mime, 20), p.content.length));
            total += p.content.length;
          }
          count++;
        }
      }

      out.push(format("\n{0} file(s) in total, {1} byte(s)", count, total));

      return out.join("\n");
    },

    cd: function(dir) {
     // if ( !dir ) {
     //   return (["You need to supply argument: dir"]).join("\n");
     // }

      var dirname = parsepath(dir || '/');
      var iter = getiter(dirname);
      if ( dirname == '/' || (iter && iter.type == 'dir')) {
        _cwd = dirname;
        return (['Entered: ' + dirname]).join("\n");
      }

      return (["Path not found: " + dirname]).join("\n");
    },

    cat: function(file) {
      if ( !file ) {
        return (["You need to supply argument: filename"]).join("\n");
      }

      var filename = parsepath(file);
      var iter =getiter(filename);
      if ( !iter ) {
        return (["File not found: " + filename]).join("\n");
      }

      if (iter.type === "symlink") return _commands.readlink(iter.destination);

      return iter.content.match(/.{1,129}/g).join('\n');
    },

    pwd: function() {
      return (['Current directory: ' + _cwd]).join("\n");
    },

    clear: function() {
      return false;
    },

    contact: function(lookup = '') {
      var contact;
     
      if (lookup === '') { // default behavor : print to screen (todo: turn this into finger function)
        var out = [
          "Finger "+ _finger.find(function(el){return el.key === "username";}).value + ":\n"
        ];
        
        _finger.forEach(function(el) {
          if (el.key === "username") return;
          out.push(el.key+":        "+el.value);
        });
        
        return out.join("\n");
        
      }
     
      // reduce to lookup 
      contact = _finger.find(function(el){
        return lookup.toLowerCase() === el.key.toLowerCase();
      });
      
      if (contact === undefined) {
        return ['Invalid key: ' + lookup].join("\n");
      } else if (!contact.hasOwnProperty("proto")) {
        return [contact.value].join("\n");
      }
      
      var link     = document.createElement('a');
      document.body.appendChild(link);
     
      link.href = contact.proto + contact.value;
      link.target="_blank";
      link.click();
      link.remove();
    },
    
    xmodem: function(file) {
     if (!file)  return(["You need to supply argument: filename"]).join("\n");
     
     var filename = parsepath(file);
     var iter     = getiter(filename);
     var link     = document.createElement('a');
     
     if (!iter) return(["File not found: " + filename]).join("\n");
     
     if (iter.type !== "symlink") return(["Permission denied, access level invalid: " + filename]).join("\n");
     
     document.body.appendChild(link);
     
     link.href=iter.destination;
     link.target="_blank";
     link.click();
     link.remove();
    },
    
    login: function() {
      if (window.elation) {
        elation.janusweb.init({
          url: document.location.href,
           showchat: false,
           shownavigation: false 
        }).then(function(client) {
          document.getElementById("outer").setAttribute("hidden", true);
          elation.events.add(client.janusweb.currentroom, 'room_load_complete', function() {
            //client.hideMenu();
          });
        });
      }
    },

    help: function() {
      var out = [
        'help                                         This command',
        'contact                                      How to contact author',
        'contact <key>                                Open page (example: `email` or `google+`)',
        'clear                                        Clears the screen',
        'ls                                           List current (or given) directory contents',
        'cd <dir>                                     Enter directory',
        'cat <filename>                               Show file contents',
        'sound [<volume 0-100>, <duration>, <freq>]   Generate a sound (WebKit only)',
        'xmodem <filename>                            File transfer tool',
        'login                                        Jack into the matrix',
        ''
      ];

      return out.join("\n");
    }

  };

  /////////////////////////////////////////////////////////////////
  // UTILS
  /////////////////////////////////////////////////////////////////

  function _openAjax(url, method = "GET") {
    var myRequest = new XMLHttpRequest(),
        myResponse = "";
    
    myRequest.open(method, url);

    myRequest.onreadystatechange = function () {
      if (myRequest.readyState === 4) myResponse = myRequest.responseText;
    };
    
    return myResponse;
  }

  function setSelectionRange(input, selectionStart, selectionEnd) {
    if (input.setSelectionRange) {
      input.focus();
      input.setSelectionRange(selectionStart, selectionEnd);
    }
    else if (input.createTextRange) {
      var range = input.createTextRange();
      range.collapse(true);
      range.moveEnd('character', selectionEnd);
      range.moveStart('character', selectionStart);
      range.select();
    }
  }

  function format(format) {
    var args = Array.prototype.slice.call(arguments, 1);
    var sprintfRegex = /\{(\d+)\}/g;

    var sprintf = function (match, number) {
      return number in args ? args[number] : match;
    };

    return format.replace(sprintfRegex, sprintf);
  }


  function padRight(str, l, c) {
    return str+Array(l-str.length+1).join(c||" ");
  }

  function padCenter(str, width, padding) {
    var _repeat = function(s, num) {
      for( var i = 0, buf = ""; i < num; i++ ) buf += s;
      return buf;
    };

    padding = (padding || ' ').substr( 0, 1 );
    if ( str.length < width ) {
      var len     = width - str.length;
      var remain  = ( len % 2 == 0 ) ? "" : padding;
      var pads    = _repeat(padding, parseInt(len / 2, 10));
      return pads + str + pads + remain;
    }

    return str;
  }

  //FIXME: do not parse iter.destination
  function parsepath(p) {
    var dir = (p.match(/^\//) ? p : (_cwd  + '/' + p)).replace(/\/+/g, '/');
    return realpath(dir) || '/';
  }

  function getiter(path) {
    var parts = (path.replace(/^\//, '') || '/').split("/");
    var iter = null;

    var last = _filetree;
    while ( parts.length ) {
      var i = parts.shift();
      if ( !last[i] ) break;

      if ( !parts.length ) {
        iter = last[i];
      } else {
        last = last[i].type == 'dir' ? last[i].files : {};
      }
    }

    return iter;
  }

  function realpath(fs_path) {
    var parts = fs_path.split(/\//);
    var path = [];
    for ( var i in parts ) {
      if ( parts.hasOwnProperty(i) ) {
        if ( parts[i] == '.' ) {
          continue;
        }

        if ( parts[i] == '..' ) {
          if ( path.length ) {
            path.pop();
          }
        } else {
          path.push(parts[i]);
        }
      }
    }

    return path.join('/');
  }

  window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame    ||
    function( callback ){
      window.setTimeout(callback, 1000 / 60);
    };
  })();

  /////////////////////////////////////////////////////////////////
  // SHELL
  /////////////////////////////////////////////////////////////////

  (function animloop(){
    requestAnimFrame(animloop);

    if ( _obuffer.length ) {
      $output.value += _obuffer.shift();
      _locked = true;

      update();
    } else {
      if ( _ibuffer.length ) {
        $output.value += _ibuffer.shift();

        update();
      }

      _locked = false;
      _inited = true;
    }
  })();

  function print(input, lp) {
    update();
    _obuffer = _obuffer.concat(lp ? [input] : input.split(''));
  }

  function update() {
    $output.focus();
    var l = $output.value.length;
    setSelectionRange($output, l, l);
    $output.scrollTop = $output.scrollHeight;
  }

  function clear() {
    $output.value = '';
    _ibuffer = [];
    _obuffer = [];
    print("");
  }

  function command(cmd) {
    print("\n");
    if ( cmd.length ) {
      var a = cmd.split(' ');
      var c = a.shift();
      if ( c in _commands ) {
        var result = _commands[c].apply(_commands, a);
        if ( result === false ) {
          clear();
        } else {
          print(result || "\n", true);
        }
      } else {
        print("Unknown command: " + c);
      }

      _history.push(cmd);
    }
    print("\n\n" + _prompt());

    _hindex = -1;
  }

  function nextHistory() {
    if ( !_history.length ) return;

    var insert;
    if ( _hindex == -1 ) {
      _hindex  = _history.length - 1;
      _lhindex = -1;
      insert   = _history[_hindex];
    } else {
      if ( _hindex > 1 ) {
        _lhindex = _hindex;
        _hindex--;
        insert = _history[_hindex];
      }
    }

    if ( insert ) {
      if ( _lhindex != -1 ) {
        var txt = _history[_lhindex];
        $output.value = $output.value.substr(0, $output.value.length - txt.length);
        update();
      }
      _buffer = insert.split('');
      _ibuffer = insert.split('');
    }
  }

  window.onload = function() {
    $output = document.getElementById("output");
    $output.contentEditable = true;
    $output.spellcheck = false;
    $output.value = '';
    
          
    firebase.initializeApp({
       apiKey: "AIzaSyAc-t0GSqYdfjg_o8eiMvOLkGLOTmzwHyA",
       authDomain: "mobile-app-ddf3b.firebaseapp.com",
       databaseURL: "https://mobile-app-ddf3b.firebaseio.com",
       projectId: "mobile-app-ddf3b",
       storageBucket: "mobile-app-ddf3b.appspot.com",
       messagingSenderId: "287041396526"
    });

    $output.onkeydown = function(ev) {
      var k = ev.which || ev.keyCode;
      var cancel = false;

      if ( !_inited ) {
        cancel = true;
      } else {
        if ( k == 9 ) {
          cancel = true;
        } else if ( k == 38 ) {
          nextHistory();
          cancel = true;
        } else if ( k == 40 ) {
          cancel = true;
        } else if ( k == 37 || k == 39 ) {
          cancel = true;
        }
      }

      if ( cancel ) {
        ev.preventDefault();
        ev.stopPropagation();
        return false;
      }

      if ( k == 8 ) {
        if ( _buffer.length ) {
          _buffer.pop();
        } else {
          ev.preventDefault();
          return false;
        }
      }

      return true;
    };

    $output.onkeypress = function(ev) {
      ev.preventDefault();
      if ( !_inited ) {
        return false;
      }

      var k = ev.which || ev.keyCode;
      if ( k == 13 ) {
        var cmd = _buffer.join('').replace(/\s+/, ' ');
        _buffer = [];
        command(cmd);
      } else {
        if ( !_locked ) {
          var kc = String.fromCharCode(k);
          _buffer.push(kc);
          _ibuffer.push(kc);
        }
      }
      
      return true;
    };

    $output.onfocus = function() {
      update();
    };

    $output.onblur = function() {
      update();
    };

    window.onfocus = function() {
      update();
    };
    
    window.database = firebase.database();

    print("Initializing VCC Grid OS 1.0 ....................................................\n");
    print("Copyright (c) 2017 Vintage Computer Committee, Some Rights Reserved.\n\n", true);
    
    var lines = [
      "                  @@@  @@@  @@@  @@@@@@@@  @@@        @@@@@@@   @@@@@@   @@@@@@@@@@   @@@@@@@@                  ",
      "                  @@@  @@@  @@@  @@@@@@@@  @@@       @@@@@@@@  @@@@@@@@  @@@@@@@@@@@  @@@@@@@@                  ",
      "                  @@!  @@!  @@!  @@!       @@!       !@@       @@!  @@@  @@! @@! @@!  @@!                       ",
      "                  !@!  !@!  !@!  !@!       !@!       !@!       !@!  @!@  !@! !@! !@!  !@!                       ",
      "                  @!!  !!@  @!@  @!!!:!    @!!       !@!       @!@  !@!  @!! !!@ @!@  @!!!:!                    ",
      "                  !@!  !!!  !@!  !!!!!:    !!!       !!!       !@!  !!!  !@!   ! !@!  !!!!!:                    ",
      "                  !!:  !!:  !!:  !!:       !!:       :!!       !!:  !!!  !!:     !!:  !!:                       ",
      "                  :!:  :!:  :!:  :!:        :!:      :!:       :!:  !:!  :!:     :!:  :!:                       ",
      "                   :::: :: :::    :: ::::   :: ::::   ::: :::  ::::: ::  :::     ::    :: ::::                  ",
      "                    :: :  : :    : :: ::   : :: : :   :: :: :   : :  :    :      :    : :: ::                   ",
    ];
    
    lines.forEach(function(line) {print(line+"\n", true);});
    print("\n\n\n", true);

    print(padCenter(_filetree.MOTD.content.match(/.{1,129}/g).join('\n'), 130), true);

    print("\n\n\n\n\n", true);
    print("Type 'help' for a list of available commands.\n", true);
    print("\n\n" + _prompt());

  };

})();
