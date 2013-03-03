App = {
    debug: true,
    init: function() {
        this.bind();
    },
    bind: function() {
        var that = this;
        $('#parse').click(function(e) {
            var s = $('#stage').val()
            if (s == '')
                return;
            $('#log').empty();
            var tree = syntax_tree(s);
            1+1==2;
        });
    },
    log: function(msg) {
        $('#log').append(msg + '<br/>');
    },
};

function Node() {
    this.parent = null;

    this.has_children = null;
    this.children = new Array();
    this.first = null;
    this.last = null;
    /* Siblings */
    this.previous = null;
    this.next = null;

    this.value = null;
    this.parameters = null;
};

function syntax_tree(s) {
    var t = parse(s);
    t.relate(null);

    var R = new Raphael('canvas-container', 500, 500);
    var set = R.set();

    set.push(R.path('M-250,0L0,0'));

    set.translate(250, 250);
    return t;
};

/* Sets parent and sibling nodes for a given (sub)tree */
Node.prototype.relate = function(parent) {
    this.parent = parent;
    this.has_children = (this.children.length > 0);

    if (this.has_children) {
        this.first = this.children[0];
        this.last = this.children[this.children.length - 1];
    }

    for (var i = 0; i < this.children.length; i++)
        this.children[i].relate(this);

    for (var i = 0; i < this.children.length - 1; i++)
        this.children[i].next = this.children[i+1];

    for (var i = 1; i < this.children.length; i++)
        this.children[i].previous = this.children[i-1];
};

function parse(s) {
    App.log('Parsing <i>' + s + '</i>');
    var n = new Node();

    if (s[0] != '[') {
        s = s.replace(/^\s+|\s+$/g, '');
        /* Search for parameters on this text node */
        var i = 0;
        while ((i < s.length) && (s[i] != '(')) i++;
        n.value = s.substring(0, i); /* Save the text node */

        if (s[i] == '(') {
            var start = i+1;
            while ((s[i] != ')')) i++;
            n.parameters = s.substring(start, i);
        }
        return n;
    }

    /* Parse the category label */
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
