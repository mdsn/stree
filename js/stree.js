App = {
    debug: true,
    init: function() {
        this.bind();
    },
    bind: function() {
        $('#parse').click(function(e) {
            var s = $('#stage').val()
            if (s == '')
                return;
            $('#log').empty();
            var tree = parse(s);
            this.log(tree);
        });
    },
    log: function(msg) {
        $('#log').append(msg + '<br/>');
    },
};

function Node() {
    this.parent = null;
    this.children = new Array();
    this.value = null;
};

function parse(s) {
    App.log('Parsing <i>' + s + '</i>');
    var n = new Node();

    if (s[0] != '[') {
        n.value = s;
        return n;
    }

    var i = 1;
    while ((s[i] != ' ') && (s[i] != '[') && (s[i] != ']')) i++;
    n.value = s.substring(1, i+1);
    App.log('Parsed first token: ' + n.value);

    while (s[i] == ' ') i++;
    var level = 1,
        start = i;
    for (; i < s.length; i++) {
        var outer_level = level;
        if (s[i] == '[') level++;
        if (s[i] == ']') level--;

        if (((outer_level == 1) && (level == 2)) || ((outer_level == 1) && (level == 0))) {
            /* Handle word token */
            if (s.substring(start, i).search(/\w+/) > -1)
               n.children.push(parse(s.substring(start, i)));
            start = i;
        }
        /* Parse an inside bracket group */
        if ((outer_level == 2) && (level == 1)) {
            n.children.push(parse(s.substring(start, i+1)));
            /* Otherwise we get the closing ] again and an extra level-- */
            start = i+1;
        }
    }
    return n;
};


$(function() {
    App.init();
});
