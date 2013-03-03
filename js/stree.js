App = {
    debug: true,
    init: function() {
        this.log('App initialized');
        this.bind();
    },
    bind: function() {
        $('#parse').click(function(e) {
            var s = $('#stage').val()
            if (s == '')
                return;
            parse(s);
        });
    },
    log: function(msg) {
        $('#log').append(msg + '<br/>');
    },
};

function Node() {
    this.value = null;
};

function parse(s) {
    App.log('Parsing <i>' + s + '</i>');
    var i = 1;

    while ((s[i] != ' ') && (s[i] != '[') && (s[i] != ']')) i++;
    App.log('Parsed first token: ' + s.substring(1, i+1));

    while (s[i] == ' ') i++;
    var level = 1,
        start = 1;
    for (; i < s.length; i++) {
        var outer_level = level;
        if (s[i] == '[') level++;
        if (s[i] == ']') level--;

        if ((outer_level == 1) && (level == 2))
            start = i;
        if ((outer_level == 2) && (level == 1))
            parse(s.substring(start, i+1));
    }
};


$(function() {
    App.init();
});
